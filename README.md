# Northumbria Construct

A simple, dependency-free static website for Northumbria Construct.

## Pages

- `index.html` — Home
- `about.html` — About, journey and operating model
- `our-work.html` — Overview of Projects, Activities and Innovation
- `get-involved.html` — Overview of opportunities, resources, volunteering and joining
- `volunteer-collaborate.html` — Volunteering and collaboration through the existing contact pathway
- `projects.html` — Projects and impact
- `activities.html` — Newcastle and Ibom Hub activities, visits and engagement records
- `innovation-lab.html` — BRIC and NorCon Projects
- `membership-hub.html` — Membership & Resources gateway to official NSU, CIOB, APM, CITB and CSCS guidance
- Public pages include Innovation Lab, membership pathways, Founder&#8217;s Desk, Contact and Privacy.
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

The retired News & Insights URL permanently redirects to the homepage (HTTP 308) through Vercel routing. Its source is archived privately outside the repository and is absent from deployment output.
