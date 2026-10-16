"""Structural checks for generated posts; lxml is the existing local QA dependency."""
from pathlib import Path
from urllib.parse import urlsplit, unquote, parse_qs
from collections import Counter
import json
import sys
import unittest
import tempfile
import shutil
import copy
import build_posts as builder
from lxml import html
from build_posts import ROOT, ORIGIN, CATEGORIES, ordered, batches, pagination, post_path


class PostChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.posts = json.loads((ROOT / 'content/posts.json').read_text(encoding='utf-8'))
        cls.files = list(ROOT.glob('*.html')) + [p for category in CATEGORIES for p in (ROOT / category).glob('*.html')]
        cls.docs = {p.relative_to(ROOT).as_posix(): html.fromstring(p.read_text(encoding='utf-8')) for p in cls.files}

    def test_all_local_links_images_and_fragments(self):
        for name, doc in self.docs.items():
            ids = doc.xpath('//@id')
            self.assertFalse([key for key, count in Counter(ids).items() if count > 1], name)
            self.assertEqual(len(doc.xpath('//h1')), 1, name)
            for ref in doc.xpath('//@href|//@src|//@poster'):
                url = urlsplit(ref)
                if url.scheme or url.netloc:
                    continue
                target = ((ROOT / url.path.lstrip('/')) if url.path.startswith('/') else (ROOT / name).parent / url.path) if url.path else ROOT / name
                self.assertTrue(target.exists(), (name, ref))
                if url.fragment and target.suffix == '.html':
                    key = target.relative_to(ROOT).as_posix()
                    self.assertTrue(self.docs[key].xpath('//*[@id=$ident]', ident=unquote(url.fragment)), (name, ref))
            self.assertFalse(doc.xpath('//a[contains(@href,"news-insights")]'), name)

    def test_each_post_has_metadata_sharing_content_and_legacy_ids(self):
        canonicals = []
        for post in self.posts:
            doc = self.docs[post_path(post).lstrip('/')]
            canonical = doc.xpath('//link[@rel="canonical"]/@href')[0]
            canonicals.append(canonical)
            self.assertEqual(canonical, ORIGIN + post_path(post))
            self.assertEqual(doc.xpath('//meta[@property="og:url"]/@content'), [canonical])
            self.assertEqual(doc.xpath('//meta[@name="description"]/@content'), [post['excerpt']])
            self.assertEqual(doc.xpath('//meta[@property="og:image"]/@content'), [ORIGIN + '/' + (post['image'] or 'assets/northumbria-construct-logo.png')])
            self.assertEqual(doc.xpath('//meta[@property="og:type"]/@content'), ['article'])
            self.assertIn(post['title'], doc.xpath('//title/text()')[0])
            for ident in post['legacy_ids']:
                self.assertTrue(doc.xpath('//*[@id=$ident]', ident=ident))
            source = html.fragment_fromstring(post['body_html'], create_parent='div')
            rendered = ' '.join(doc.xpath('//div[@class="post-body"]')[0].text_content().split())
            for block in source.xpath('.//p|.//li|.//figcaption|.//dt|.//dd'):
                self.assertIn(' '.join(block.text_content().split()), rendered)
            for src in source.xpath('.//img/@src'):
                self.assertIn('/' + src.lstrip('/'), doc.xpath('//img/@src'))
            linkedin = doc.xpath('//a[contains(@href,"linkedin.com/sharing")]/@href')[0]
            self.assertEqual(parse_qs(urlsplit(linkedin).query)['url'], [canonical])
            whatsapp = doc.xpath('//a[contains(@href,"wa.me")]/@href')[0]
            self.assertIn(canonical, parse_qs(urlsplit(whatsapp).query)['text'][0])
            self.assertEqual(doc.xpath('//input[@class="share-url"]/@value'), [canonical])
            self.assertEqual(len(doc.xpath('//*[@data-copy-link]|//*[@data-native-share]')), 2)
        self.assertEqual(len(canonicals), len(set(canonicals)))

    def test_compact_cards_and_read_more(self):
        for category, (_, filename, *_rest) in CATEGORIES.items():
            doc = self.docs[filename]
            cards = doc.xpath('//article[@class="post-card"]')
            self.assertEqual(len(cards), min(8, len([p for p in self.posts if p['category'] == category])))
            for card in cards:
                self.assertEqual(len(card.xpath('.//img')), 1)
                link = card.xpath('.//a[contains(@class,"post-read-more")]')[0]
                self.assertTrue(link.get('aria-label').startswith('Read more: '))
                self.assertIsNone(link.get('target'))
                excerpt = card.xpath('.//div[@class="post-card-copy"]/p[not(@class)]')[0].text_content()
                self.assertTrue(30 <= len(excerpt.split()) <= 50)
            self.assertFalse(doc.xpath('//*[@data-content-type]'))

    def test_pagination_and_ordering_when_ninth_post_is_added(self):
        examples = [dict(category='activities', date=f'2026-10-{i:02}', slug=f'post-{i}') for i in range(1, 10)]
        groups = batches(ordered(examples, 'activities'))
        self.assertEqual([len(group) for group in groups], [8, 1])
        self.assertEqual(groups[0][0]['date'], '2026-10-09')
        self.assertIn('/activities-page-2.html', pagination('activities', 1, 2))
        self.assertIn('rel="prev"', pagination('activities', 2, 2))
        self.assertIn('aria-current="page"', pagination('activities', 2, 2))
        future = [dict(p, category='opportunities') for p in examples]
        self.assertEqual(ordered(future, 'opportunities')[0]['date'], '2026-10-01')

    def test_ninth_post_generates_and_cleans_real_pagination_output(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            shutil.copytree(ROOT / 'templates', temporary / 'templates')
            shutil.copytree(ROOT / 'content', temporary / 'content')
            shutil.copy(ROOT / 'sitemap.xml', temporary / 'sitemap.xml')
            records = copy.deepcopy(self.posts)
            example = next(p for p in records if p['category'] == 'activities')
            for i in range(2):
                extra = dict(example, slug=f'pagination-fixture-{i}', legacy_ids=[], date='2020-01-01')
                records.append(extra)
            (temporary / 'content/posts.json').write_text(json.dumps(records), encoding='utf-8')
            original_root = builder.ROOT
            try:
                builder.ROOT = temporary
                builder.build()
                second = temporary / 'activities-page-2.html'
                self.assertTrue(second.exists())
                doc = html.fromstring(second.read_text(encoding='utf-8'))
                self.assertEqual(len(doc.xpath('//article[@class="post-card"]')), 1)
                self.assertEqual(doc.xpath('//a[@rel="prev"]/@href'), ['/activities.html'])
                self.assertIn('activities-page-2.html', (temporary / 'sitemap.xml').read_text())
                (temporary / 'content/posts.json').write_text(json.dumps(self.posts), encoding='utf-8')
                builder.build()
                self.assertFalse(second.exists())
                self.assertNotIn('activities-page-2.html', (temporary / 'sitemap.xml').read_text())
            finally:
                builder.ROOT = original_root

    def test_retired_news_stays_offline_and_sources_excluded(self):
        self.assertFalse((ROOT / 'news-insights.html').exists())
        self.assertNotIn('news-insights', (ROOT / 'sitemap.xml').read_text())
        routes = json.loads((ROOT / 'vercel.json').read_text())['routes']
        retired = [r for r in routes if 'news-insights' in r['src']][0]
        self.assertEqual(retired['status'], 308)
        for folder in ['content/', 'scripts/', 'templates/']:
            self.assertIn(folder, (ROOT / '.vercelignore').read_text())


if __name__ == '__main__':
    unittest.main(verbosity=2)
