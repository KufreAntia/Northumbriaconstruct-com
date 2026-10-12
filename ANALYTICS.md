# Northumbria Construct analytics

Implementation prepared 12 October 2026 for Vercel project **northumbriaconstruct-com-lxqd**. Branch: `feature/privacy-analytics`.

## Current release status

The website is plain static HTML, CSS and browser JavaScript. The audit found no analytics SDK, analytics cookies, administrator authentication, database, build process or local Vercel project link. Existing Git deployments are connected to two similarly named projects; do not assume the project without `-lxqd` is the intended target.

Local security/privacy tests and existing asset/route checks pass. **Account plan, Web Analytics activation, provisioned storage, live provider API responses and the full preview workflow still require authenticated Vercel access. Production promotion is gated on those checks.** Missing configuration disables collection and blocks the administrator page. No historical analytics have been inferred or backfilled.

## Components and routes

| File / route | Purpose |
| --- | --- |
| `analytics.js`, `analytics.css` | Optional collection, accessible allow/refuse notice and persistent privacy choices |
| Existing 14 public HTML pages | Load the shared analytics files; current layout, metadata, video and route URLs retained |
| `privacy.html#website-statistics` | Transparency, consent withdrawal, retention and browser privacy signals |
| `api/analytics-config.js` | Public non-secret activation flag and approved destination catalog |
| `api/analytics-collect.js` | Same-origin POST; strict fixed schema; atomic aggregate counters |
| `api/analytics-report.js` | Authenticated date-filtered aggregate JSON for the dashboard and authorised retrieval |
| `api/admin-analytics.js` | Server-authenticated dashboard HTML; no public static dashboard with hidden data |
| `/admin/analytics` | Rewrite to the protected dashboard function |
| `admin-analytics.js` | Render date-filtered counts with textContent; never receives provider tokens |
| `server/analytics-store.js` | Upstash REST adapter, administrator protection, retention and range validation |
| `server/vercel-traffic.js` | Server-only query of Vercel aggregate visitor estimates and daily trends |
| `server/analytics-catalog.json` | Allowlist of public page paths and actual existing link destinations |
| `tools/analytics-catalog.py` | Regenerate catalog after approved links change (requires Python/lxml locally) |
| `tests/analytics.test.js` | Node built-in tests; no installed testing framework |
| `.env.example`, `.gitignore`, `.vercelignore` | Document required configuration and exclude secrets / local tooling |

No framework or runtime dependency was installed. Node 24 functions use built-in fetch and crypto. The current catalog includes CIOB and APM membership destinations, CIOB bookings and project/innovation links. ICE and other supported bodies are detected when functional links exist; no ICE link or resource download was found in the current HTML, so none was invented. Add real download/registration URLs before regenerating the catalog. Same-page project section links count as project clicks; generic skip links are excluded. Clicks measure interest, not successful registrations or downloads.

## Configure and activate in the correct project

1. Sign in to Vercel and verify the owning team, project **northumbriaconstruct-com-lxqd**, attached Git repository and www.northumbriaconstruct.com domain. Record the actual plan and project/team IDs. Keep the other project disabled for analytics.
2. Enable **Web Analytics** in the project’s Analytics area. Activation adds `/_vercel/insights/*` routes on the next deployment. This implementation conditionally loads `/_vercel/insights/script.js` only after permission. Do not enable an additional automatic injection that would bypass these choices.
3. Connect an account-owned **Upstash Redis** database using Vercel Marketplace / Storage. Prefer a suitable nearby region, enable durable persistence, disable eviction, and assess provider terms, DPA and international transfer safeguards. A disposable 72-hour trial database is not production analytics storage. Check quotas and backup availability; use encrypted exports where a separate backup is needed.
4. Set the following environment variables through Vercel’s secure environment settings. Use separate Preview and Production database credentials and different administrator passwords. Do not paste passwords/tokens into chat, commit them, put them in URLs, or prefix them as client-visible variables.

| Variable | Required value |
| --- | --- |
| `ANALYTICS_ENABLED` | `true` after provisioning; defaults off |
| `UPSTASH_REDIS_REST_URL` | HTTPS REST endpoint of the permanent database |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only database token |
| `ANALYTICS_ADMIN_USER` | Non-personal administrator username (default `admin`) |
| `ANALYTICS_ADMIN_PASSWORD` | At least 32 random characters, saved in the owner’s password manager |
| `VERCEL_ANALYTICS_READ_TOKEN` | Server-only Vercel access token with the narrowest available scope that can read this team/project’s analytics |
| `ANALYTICS_VERCEL_PROJECT_ID` | Verified project ID for `northumbriaconstruct-com-lxqd` |
| `ANALYTICS_VERCEL_TEAM_ID` | Verified owning team ID, if team-owned |

5. Deploy the feature branch as **Preview**, verify the target project and use its exact deployment URL (the collector checks `VERCEL_URL`; unrelated aliases are rejected). Keep Vercel Deployment Protection enabled. Use authenticated browser access or `vercel curl` for protected previews.
6. Complete the workflow checks below. Only then release the tested implementation using a staged production deployment and promotion, or the verified Git production workflow. Never merge/push master simply to test: it automatically deploys production.

## Administrator security

The dashboard HTML and report API each enforce server-side HTTP Basic authentication. Vercel serves them over HTTPS. Secrets never enter HTML, JavaScript or report output. Missing or short passwords, missing storage or provider outages fail closed. Every administrator request is subject to a shared durable 120-requests/minute counter; it uses no IP address or username key. Authentication responses are private/no-store and noindex; dashboard CSP disallows third-party scripts and framing.

This is a single administrator credential, **not MFA or individual administrator accounts**. It fits the existing site without adding a major authentication framework. Restrict password sharing, rotate it when access changes, use a private browser session, and close that session to clear cached Basic credentials. Browser Basic authentication has no reliable application logout button. For multiple administrators, migrate to managed SSO/MFA with an explicit allowlist before expanding access. Password rotation requires redeployment to apply changed environment values. Never use deployment-protection bypass tokens as dashboard authentication.

## Data minimisation and retention

The client does not collect until the visitor chooses **Allow statistics**. Refusing or withdrawing leaves website functionality available. Local storage stores only `on` or `off`, not a visitor ID or timestamp. Storage failures keep collection off. DNT and GPC override an earlier allow choice. The privacy page provides reversible choices; another tab’s withdrawal also updates collection. No advertising cookies, analytics cookies, fingerprinting code, session recordings or cross-site profiling were added.

Custom requests use no credentials and a no-referrer policy. Payloads contain only `kind`, an approved `page`, and optionally an approved `target` ID. Extra fields, arbitrary URLs, unknown paths, unsupported methods and cross-origin submissions are rejected. The server never reads/stores IP addresses or User-Agent for analytics. Provider tokens are transmitted only server-to-server.

Upstash stores one hash per UTC date, with page/click counters and a total; **no event log**. Atomic Lua increments avoid lost updates under concurrent requests. Daily hashes expire 365 days after the start of their UTC day. Separate `production` / `preview` namespaces prevent mixing their counters. A permanent aggregate start-date marker does not contain visitor information. Administrator rate buckets expire after 120 seconds. Counters have fixed cardinality and a 10,000-event/day collection cap.

Vercel uses its own 24-hour visitor hash and aggregated reports. It necessarily processes incoming network information; “cookie-free” does not mean no processing. Page addresses sent to Vercel contain only approved canonical paths (no query/fragment). Because its beforeSend hook does not expose the raw referrer for rewriting, collection is suppressed for query-bearing referrers, external referrers or unknown internal paths. This minimises accidental sensitive referrer collection but causes additional undercounting. Our aggregate counters do not collect referrers at all.

The privacy notice explains providers, purpose, choices and retention. The explicit opt-in avoids assuming that all cookie-free analytics are exempt from UK PECR. The ICO’s statistical-purpose exception has specific transparency, objection, aggregation and purpose limitations. The owner should keep provider contracts/transfer safeguards and the website’s privacy contact arrangements current; this implementation is not a legal certification.

## Dashboard metrics and limitations

Page views, top pages, daily traffic and click totals come from durable custom counters. Visitor estimates come from Vercel’s **ungrouped selected-range aggregate**; daily unique estimates are never added together as unique people. Missing credentials, reporting-window limits or provider failures show **Unavailable**, never zero or an invented estimate. Vercel daily trends are included in the protected JSON response; the website dashboard displays the custom daily traffic table.

Vercel and custom totals can differ due to redaction, provider activation, blockers, quotas, opt-outs and network failures. Approximate visitors are not verified people. Reloads count as views. Counts are not fraud-proof: Origin validation blocks ordinary cross-site browser submissions, but a bot can forge headers. Global collection caps limit accepted counts; they do not prevent all invocation/storage charges from abuse. Apply Vercel WAF rules if abuse is observed without adding visitor IPs to the analytics database.

No data exists before collection begins unless independently verified prior collection is present in Vercel. Report start-date markers and zero entries are not historical evidence. Retention-expired days are inaccessible. Dashboard dates are UTC rather than UK local days.

## Plan-dependent features and costs

Checked official public pricing on 12 October 2026; **the actual account plan is still unverified**:

- [Vercel Web Analytics pricing](https://vercel.com/docs/analytics/limits-and-pricing): Hobby includes 50,000 monthly events and a one-month reporting window; custom events are not included. Pro supports custom events and a 12-month reporting window; the current listed event rate is $0.03/1,000, subject to account usage credits. Web Analytics Plus adds $10/team/month and a longer window. Confirm the owner’s current dashboard contract before any paid change.
- Clicks use our durable counters on every plan; no paid Vercel custom-event calls or duplicate mirrored events are sent. Pro availability can be verified without changing the storage design or adding cost.
- [Upstash Redis pricing](https://upstash.com/pricing/redis): the advertised free tier includes 250 MB and 500K monthly commands. Pay-as-you-go lists $0.20/100K commands; replicas/storage/other plans affect totals. Lua operations and report pipelines also consume command allowance—do not equate one visitor event with one billable command without checking provider metering. Confirm Marketplace pricing, permanent database ownership and backup policy. Do not auto-upgrade.
- Vercel Functions, requests and transfer also use plan quotas. Each allowed view sends one aggregate collection request plus Vercel’s own event; each approved click sends one aggregate collection request. Every public page makes a small activation-config request even when analytics is off. Dashboard reports fetch up to 365 daily hashes. Client statistics code is small and no new framework/media asset was added.

## Verification

Local commands:

```powershell
npm test
npm run check
python tools/analytics-catalog.py
python docs/verify-phase1.py
python docs/verify-phase2.py
git diff --check
```

Node tests use **mocked provider responses**, not a permanent database. They cover validation, origin/activation, atomic command shape, bounded retention, cap handling, administrator auth/rate limiting, outages, date filters, aggregate reports and refusal/DNT/GPC/redaction. Existing verification confirms all 33 original assets, the complete protected video figure, and page references remain intact.

Required real Preview checks before promotion:

1. Confirm Ready deployment, correct project/commit, static routes and four API functions.
2. With fresh site storage, load desktop/mobile: notice appears, no Vercel script/event or collector call before Allow. Refuse: no collection; navigation/video continue.
3. Allow; verify one canonical page view and one durable daily counter. Visit another page; approved membership and booking clicks increment the correct IDs and destination links still work. Test keyboard activation and withdrawal; confirm neither collector nor Vercel events are sent after withdrawal/reload. Test DNT/GPC separately.
4. Observe no cookie/visitor identifier, no personal payload fields, no queries/referrers in custom requests. Compare actual Vercel requests to documented sanitisation.
5. Access `/admin/analytics` and `/api/analytics-report` without/wrong auth: no data. Sign in with owner credential: date filters, top pages/clicks and Vercel visitor estimate render correctly. Test invalid dates and no-data range.
6. Submit concurrent approved events; confirm exact aggregate delta. Redeploy/restart functions and confirm counts persist. Verify TTL and environment isolation using the provisioned database.
7. Test storage outage/missing credentials: collection/report failures are visible operationally, no fabricated data, no website navigation break. Check function errors without logging payloads/headers.
8. Verify desktop/mobile/tablet layout, contrast, keyboard controls and original video playback/transcript. Record actual provider API response shape and adjust if needed before release.

## Later retrieval by ChatGPT

The Vercel integration exposes [Web Analytics tools](https://vercel.com/docs/agent-resources/vercel-mcp/tools/web-analytics), including querying aggregated visits once enabled and authenticated. Confirm actual connected tools at retrieval time; no Vercel connector is currently callable in this session. Select the correct project/team and bound the date range/reporting window. An authenticated Vercel CLI can query the same REST API when integration tools are unavailable.

Click counters are **not** Vercel runtime logs or Vercel custom events. Retrieve them through the authenticated `/api/analytics-report?start=YYYY-MM-DD&end=YYYY-MM-DD` endpoint or the authorised Upstash integration. Use secret injection/password-manager access, not credentials pasted into chat or URL query parameters. This JSON includes provider visitor estimates where available, pages, destination IDs/labels, daily counts, environment and collection start date. An authorised export can be saved privately for later comparison; never invent earlier traffic from deploy logs.

References: [Vercel HTML setup](https://vercel.com/docs/analytics/quickstart), [redaction and opt-out](https://vercel.com/docs/analytics/redacting-sensitive-data), [Vercel privacy](https://vercel.com/docs/analytics/privacy-policy), [aggregate API](https://vercel.com/docs/analytics/web-analytics-api), [Upstash REST](https://upstash.com/docs/redis/features/restapi), [ICO exceptions](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/).
