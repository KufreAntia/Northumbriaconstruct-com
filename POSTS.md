# Maintaining post cards and article pages

The public website remains static HTML, CSS and JavaScript. Generated HTML is checked into the repository, so hosting needs no framework, runtime dependency or remote build step.

## Edit or add a post

1. Edit `content/posts.json`. Each record is the single source for its title, category, excerpt, date/status, representative image, original anchors and full article HTML.
2. Use `activities`, `opportunities`, `projects` or `innovation` as the category. Choose a descriptive, permanent `slug`; avoid changing it after publication. The URL is `/<category>/<slug>.html`.
3. Write a 30–50 word excerpt. Use a factual date in ISO format, or `null` when unknown, and a readable `date_label`. For innovations this can describe a documented pilot rather than imply a publication date.
4. Set `image` to an existing asset path without a leading slash, and provide `image_alt`. If no relevant photograph is supplied, use `null` for both; the template displays Northumbria Construct branding. Do not use a past-event photograph to imply that a future event has taken place.
5. Put the full account, galleries, headings and official external links in `body_html`. Relative asset and page links are converted to root-relative URLs. Internal fragment links within the article must refer to IDs in that article.
6. Preserve `legacy_ids` and their IDs in the article HTML. These retain incoming links from the former category articles. For a new post with no old URL, use an empty array.
7. Run `python scripts/build_posts.py`, then `python scripts/verify_posts.py`, `node --check script.js` and `git diff --check`. The generator uses Python's standard library; verification uses the project's existing local `lxml` installation.
8. Review the local website through an HTTP server, including cards, detail pages, mobile layout and sharing. Include the regenerated HTML and sitemap changes when publishing.

## Shared presentation

`templates/page.html`, `header.html` and `footer.html` provide the shared page shell. The card, breadcrumb, pagination and sharing renderers live in `scripts/build_posts.py`. Optional browser checks use `node scripts/verify_posts_browser.cjs` with a locally available Playwright installation (`PLAYWRIGHT_MODULE` can point to it) and `PREVIEW_URL` set to the local server URL. Category introduction material lives in `content/category-context.json`. Post CSS and browser interactions remain in `styles.css` and `script.js`.

Listings show at most eight cards. Activities/projects/innovations use the latest documented date first; opportunities use the next event or deadline first. Records without dates follow dated entries. When needed, older pages are generated as `activities-page-2.html` and equivalent category URLs, with previous/next navigation and sitemap entries. Existing fragment links continue to work from every listing page, including without JavaScript.

`content/generated-pages.json` tracks generated outputs so only stale generated pages are removed on rebuild. If a published article URL must change or be retired, add an explicit Vercel redirect; do not simply remove a published record.

## Sharing and missing material

Each article delivers its title, description, canonical URL and social image in HTML. LinkedIn, WhatsApp and email use the public canonical URL. Copy link and Share use that same URL during local previews. Unsupported or failed native sharing falls back to copying; denied clipboard access falls back to selecting the visible URL. Instagram uses Copy link, without an unsupported platform share button.

No post-specific photographs were supplied for the Bath PhD, the three upcoming CIOB visits or NorCon Projects. Branded thumbnails are used. No public NorCon screenshots or release date are implied. Exact dates remain unspecified for the first Bridge the Gap seminar, Monty Suites visit, founding project and debate; only the year was supplied for the Eastern Green Link visit.

Authoring directories are excluded from deployment uploads through `.vercelignore`. The retired News & Insights source remains absent; its existing redirect to the homepage is unchanged.
