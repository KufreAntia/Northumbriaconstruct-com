"""Generate static listings and articles. Run: python scripts/build_posts.py.

Edit content/posts.json, category-context.json or templates; never generated pages.
Python's standard library is sufficient. No browser-side rendering or build service.
"""
from pathlib import Path
from html import escape
from string import Template
from urllib.parse import quote
import json
import re

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://www.northumbriaconstruct.com"
PER_PAGE = 8
CATEGORIES = {
    "activities": ("Activities", "activities.html", "Our Work", "our-work.html", "Completed site visits, seminars, careers fairs and volunteering from our Newcastle and Ibom hubs."),
    "opportunities": ("Opportunities", "opportunities.html", "Get Involved", "get-involved.html", "Upcoming events and current participation, research and professional development opportunities."),
    "projects": ("Projects", "projects.html", "Our Work", "our-work.html", "Defined initiatives: their purpose, delivery, outputs, outcomes and learning."),
    "innovation": ("Innovation", "innovation-lab.html", "Our Work", "our-work.html", "Tools, methods and solutions developed through research and practice, including BRIC and NorCon Projects."),
}
LOGO = "assets/northumbria-construct-logo.png"


def post_path(post):
    return f'/{post["category"]}/{post["slug"]}.html'


def listing_path(category, number=1):
    filename = CATEGORIES[category][1]
    return "/" + (filename if number == 1 else filename.replace(".html", f"-page-{number}.html"))


def ordered(posts, category):
    records = [p for p in posts if p["category"] == category]
    dated = [p for p in records if p["date"]]
    # Opportunities: next event/deadline first. Other categories: latest known date first.
    dated.sort(key=lambda p: p["date"], reverse=category != "opportunities")
    return dated + [p for p in records if not p["date"]]


def batches(records):
    return [records[i:i + PER_PAGE] for i in range(0, len(records), PER_PAGE)] or [[]]


def legacy_map(posts):
    mapping = {}
    for p in posts:
        filename = CATEGORIES[p["category"]][1]
        for ident in p["legacy_ids"]:
            mapping[filename + "#" + ident] = post_path(p) + "#" + ident
    for ident in ["heritage-walk", "regent-farm-visit", "castle-leazes-visit", "amberley-visit"]:
        mapping["activities.html#" + ident] = mapping["opportunities.html#" + ident]
    mapping["projects.html#ciob-site-visit"] = mapping["activities.html#ciob-site-visit"]
    for ident in ["awaiting-confirmation", "built-environment-careers-fair"]:
        mapping["opportunities.html#" + ident] = mapping["activities.html#careers-fair-2026"]
    return mapping


def links(markup, mapping):
    def replace(match):
        attr, value = match.groups()
        if value.startswith(("https:", "http:", "mailto:", "tel:", "data:")):
            return match.group()
        target = mapping.get(value.lstrip("/"))
        if not target:
            target = value if value.startswith(("/", "#")) else "/" + value
        return f'{attr}="{escape(target, quote=True)}"'
    return re.sub(r'(href|src|poster)="([^"]+)"', replace, markup)


def image(post, lazy=True):
    supplied = bool(post["image"])
    source = "/" + (post["image"] or LOGO)
    alt = post["image_alt"] or "Northumbria Construct branding"
    return (f'<img src="{escape(source)}" alt="{escape(alt)}" '
            f'class="{"post-photo" if supplied else "post-placeholder"}" '
            f'loading="{"lazy" if lazy else "eager"}" decoding="async">')


def metadata(post):
    label = escape(post["date_label"])
    date = post["date"]
    if date:
        label = f'<time datetime="{escape(date)}">{label}</time>'
    return f'{escape(CATEGORIES[post["category"]][0])} · {label} · {escape(post["status"])}'


def card(post):
    title = escape(post["title"])
    path = post_path(post)
    return (f'<article class="post-card"><div class="post-card-media">{image(post)}</div>'
            f'<div class="post-card-copy"><p class="post-meta">{metadata(post)}</p>'
            f'<h2><a href="{path}">{title}</a></h2><p>{escape(post["excerpt"])}</p>'
            f'<a class="text-link post-read-more" href="{path}" aria-label="Read more: {title}">Read more <span aria-hidden="true">→</span></a>'
            '</div></article>')


def pagination(category, number, total):
    if total <= 1:
        return ""
    items = []
    if number > 1:
        items.append(f'<a href="{listing_path(category, number - 1)}" rel="prev">← Previous</a>')
    for i in range(1, total + 1):
        items.append(f'<a href="{listing_path(category, i)}" aria-label="Page {i}"' +
                     (' aria-current="page"' if i == number else '') + f'>{i}</a>')
    if number < total:
        items.append(f'<a href="{listing_path(category, number + 1)}" rel="next">Next →</a>')
    return '<nav class="post-pagination" aria-label="Post pages">' + ''.join(items) + '</nav>'


def breadcrumbs(category, title=None):
    label, filename, parent, parent_file, _ = CATEGORIES[category]
    last = (f'<a href="/{filename}">{label}</a> / <span aria-current="page">{escape(title)}</span>'
            if title else f'<span aria-current="page">{label}</span>')
    return f'<nav class="container breadcrumbs" aria-label="Breadcrumb"><a href="/index.html">Home</a> / <a href="/{parent_file}">{parent}</a> / {last}</nav>'


def share(post):
    url = ORIGIN + post_path(post)
    encoded = quote(url, safe="")
    title = post["title"]
    return (f'<aside class="post-sharing" aria-label="Share this post"><h2>Share this post</h2><div class="share-actions">'
            f'<a href="https://www.linkedin.com/sharing/share-offsite/?url={encoded}" target="_blank" rel="noopener noreferrer" aria-label="Share {escape(title)} on LinkedIn (opens in a new tab)">LinkedIn</a>'
            f'<a href="https://wa.me/?text={quote(title + " " + url, safe="")}" target="_blank" rel="noopener noreferrer" aria-label="Share {escape(title)} on WhatsApp (opens in a new tab)">WhatsApp</a>'
            f'<a href="mailto:?subject={quote(title, safe="")}&amp;body={encoded}" aria-label="Share {escape(title)} by email">Email</a>'
            f'<button type="button" data-copy-link data-url="{url}" hidden>Copy link</button>'
            f'<button type="button" data-native-share data-url="{url}" data-title="{escape(title)}" hidden>Share…</button></div>'
            '<p>For Instagram, copy the link to use in your bio, a message or a Story link.</p>'
            f'<label class="share-url-label">Post URL <input class="share-url" type="url" readonly value="{url}" aria-label="Post URL to copy"></label>'
            '<p class="share-feedback" role="status" aria-live="polite"></p></aside>')


def build():
    posts = json.loads((ROOT / "content/posts.json").read_text(encoding="utf-8"))
    context = json.loads((ROOT / "content/category-context.json").read_text(encoding="utf-8"))
    paths = [post_path(p) for p in posts]
    assert len(paths) == len(set(paths)), "Post URLs must be unique"
    for post in posts:
        assert 30 <= len(post["excerpt"].split()) <= 50, post["slug"]
        assert post["category"] in CATEGORIES
        assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", post["slug"])
    mapping = legacy_map(posts)
    template = Template((ROOT / "templates/page.html").read_text(encoding="utf-8"))
    header_source = (ROOT / "templates/header.html").read_text(encoding="utf-8")
    footer = (ROOT / "templates/footer.html").read_text(encoding="utf-8")
    generated = []

    def render(path, category, title, description, body, representative=None, detail=False):
        label, filename, _, parent_file, _ = CATEGORIES[category]
        header = header_source.replace(f'<a href="/{parent_file}">', f'<a class="is-section-active" href="/{parent_file}">')
        header = header.replace(f'<a href="/{filename}">', f'<a aria-current="{"location" if detail else "page"}" href="/{filename}">')
        supplied = representative or {}
        data = dict(title=escape(title), description=escape(description), canonical=ORIGIN + path,
                    image=ORIGIN + "/" + (supplied.get("image") or LOGO),
                    image_alt=escape(supplied.get("image_alt") or "Northumbria Construct"),
                    og_type="article" if detail else "website", body_class="post-page" if detail else "post-listing-page",
                    header=header, footer=footer, body=body)
        output = ROOT / path.lstrip("/")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(template.substitute(data), encoding="utf-8", newline="\n")
        generated.append(path)

    for category, (label, filename, parent, parent_file, lead) in CATEGORIES.items():
        pages = batches(ordered(posts, category))
        aliases = {key.split("#", 1)[1]: target for key, target in mapping.items() if key.startswith(filename + "#")}
        # Old fragment links still work without JavaScript; JS takes them to the full article.
        compatibility = '<details class="legacy-links"><summary>Earlier post links</summary>' + ''.join(
            f'<p id="{escape(ident)}" data-legacy-post="{escape(target)}"><a href="{escape(target)}">Continue to {escape(ident.replace("-", " "))} →</a></p>'
            for ident, target in aliases.items()) + '</details>'
        hub_links = ''
        if category == "activities":
            for hub, hub_label in [("newcastle", "Newcastle Hub"), ("ibom", "Ibom Hub")]:
                hub_links += f'<section id="{hub}-hub" class="post-hub-links"><h2>{hub_label}</h2><ul>' + ''.join(
                    f'<li><a href="{post_path(p)}">{escape(p["title"])}</a></li>' for p in ordered(posts, category) if p["hub"] == hub) + '</ul></section>'
            hub_links += '<p id="upcoming-activities"><a href="/opportunities.html">Explore upcoming opportunities →</a></p>'
        elif category == "projects":
            hub_links = '<p id="international-activities"><a href="/activities.html#ibom-hub">Explore Ibom Hub activities →</a></p>'
        elif category == "opportunities":
            hub_links = '<section id="built-heritage"><h2 id="built-heritage-heading">Built heritage opportunities</h2>' + context[category] + '</section><p id="ciob-opportunities">CIOB visits: book through the official listings on each post.</p>'
        for number, records in enumerate(pages, 1):
            body = breadcrumbs(category) + f'<section class="page-hero content-hero"><div class="container"><p class="eyebrow">{parent} · {label}</p><h1>{label}</h1><p class="lead">{lead}</p></div></section>'
            body += '<section class="section post-list-section"><div class="container"><div class="post-list">' + ''.join(card(p) for p in records) + '</div>'
            body += pagination(category, number, len(pages)) + compatibility + hub_links + '</div></section>'
            if category != "opportunities":
                body += links(context[category], mapping)
            render(listing_path(category, number), category, label + (f" — Page {number}" if number > 1 else ""), lead, body, records[0] if records else None)

    for post in posts:
        label, filename, _, _, _ = CATEGORIES[post["category"]]
        body = breadcrumbs(post["category"], post["title"])
        body += '<article class="container post-article"><header class="post-heading">'
        body += f'<p class="post-meta">{metadata(post)}</p><h1>{escape(post["title"])}</h1><p class="lead">{escape(post["excerpt"])}</p></header>'
        body += '<figure class="post-main-image">'
        if post['image']:
            body += f'<a href="/{escape(post["image"])}" target="_blank" rel="noopener noreferrer" aria-label="View full image: {escape(post["title"])} (opens in a new tab)">' + image(post, lazy=False) + '</a>'
        else:
            body += image(post, lazy=False)
        if post.get("image_caption_html"):
            body += links(post['image_caption_html'], mapping)
        elif post.get("image_caption"):
            body += '<figcaption>' + escape(post["image_caption"]) + '</figcaption>'
        elif not post["image"]:
            body += '<figcaption>Northumbria Construct · ' + escape(label) + '</figcaption>'
        body += '</figure><div class="post-body">' + links(post["body_html"], mapping) + '</div>'
        body += f'<p class="post-back"><a class="text-link" href="/{filename}">← Back to {label}</a></p>' + share(post) + '</article>'
        render(post_path(post), post["category"], post["title"], post["excerpt"], body, post, detail=True)

    # All other references go to canonical details, never duplicate articles.
    for page in ROOT.glob("*.html"):
        if "/" + page.name in generated:
            continue
        text = page.read_text(encoding="utf-8")
        text = re.sub(r'href="([^"]+)"', lambda m: f'href="{mapping[m.group(1).lstrip("/")]}"' if m.group(1).lstrip("/") in mapping else m.group(), text)
        page.write_text(text, encoding="utf-8", newline="\n")

    # Drop only stale generated pages, never user-authored source.
    manifest_path = ROOT / "content/generated-pages.json"
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else []
    for old in set(previous) - set(generated):
        path = ROOT / old.lstrip("/")
        if path.parent == ROOT or path.parent.name in CATEGORIES:
            path.unlink(missing_ok=True)
    manifest_path.write_text(json.dumps(sorted(generated), indent=2) + "\n", encoding="utf-8", newline="\n")
    sitemap = ROOT / "sitemap.xml"
    text = sitemap.read_text(encoding="utf-8")
    # Keep the existing sitemap and add generated URLs, replacing only prior generated entries.
    for old in set(previous) | set(generated):
        text = re.sub(r'\s*<url>\s*<loc>' + re.escape(ORIGIN + old) + r'</loc>.*?</url>', '', text, flags=re.S)
    text = text.replace('</urlset>', ''.join(f'  <url><loc>{ORIGIN}{p}</loc></url>\n' for p in sorted(generated)) + '</urlset>')
    sitemap.write_text(text, encoding="utf-8", newline="\n")
    print(f"Generated {len(posts)} post pages and {len(generated) - len(posts)} listing pages.")


if __name__ == "__main__":
    build()
