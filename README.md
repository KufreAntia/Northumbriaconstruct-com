# Northumbria Construct

A simple, dependency-free static website for Northumbria Construct.

## Pages

- `index.html` — Home
- `about.html` — About, journey and operating model
- `projects.html` — Projects and impact
- `activities.html` — Newcastle and Ibom Hub activities, visits and engagement records
- `innovation-lab.html` — BRIC and NorCon Projects
- `membership-hub.html` — Membership & Resources gateway to official NSU, CIOB, APM, CITB and CSCS guidance
- All pages are public, including News & Insights, Innovation Lab, membership pathways, Founder&#8217;s Desk, Contact and Privacy.
- `privacy.html` — Website privacy notice
- `404.html` — Custom not-found page

## Preview locally

Open `index.html` directly in a browser, or serve the folder with any static file server.

## Deployment

The site can be deployed directly from this repository using GitHub Pages, Netlify or Vercel. No build command, database, CMS or admin panel is required.

## Before launch

1. Create and add the official `contactus@northumbriaconstruct.com` mailbox.
2. Connect the Northumbria Construct community form to its private response spreadsheet.
3. Confirm the privacy-notice retention periods and replace the contact-page placeholder once the domain mailbox is active.

The Summer Congregation video includes an English caption track and visible transcript. Roca One remains optional; the current heading fallback can continue to be used unless a licensed webfont file is supplied.

## Local verification and handoff

Run `python docs/verify-phase1.py`, `python docs/verify-phase2.py`, `node --check script.js` and `git diff --check`. The Python structural checker uses locally installed lxml; the website has no runtime dependencies or build step. Browser checks are documented in `docs/phase2/REPORT.md`.

The approved content update uses owner-supplied records and photographs. See `docs/phase2/APPROVED-BUILD.md` for the current handoff. PIIE is excluded and NorCon interface screenshots are not displayed. Original assets remain intact. No Google Drive folder has been connected. Do not deploy or push without explicit owner approval.
# Optional website analytics

See [ANALYTICS.md](ANALYTICS.md) for the cookie-free analytics implementation, secure administrator dashboard, environment setup, privacy choices, preview release gate and retrieval instructions. Collection defaults off until storage is configured and each visitor allows statistics. Existing page routes and the protected congregation video are retained.
