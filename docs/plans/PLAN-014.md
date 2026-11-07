# PLAN-014 — Concurrent-visitor testing: a full test on this computer, and ONE tiny, capped test of the live site (steps 14.0 to 14.4)

- Drafted: 2026-11-07 23:00 UTC (`date -u` read while drafting)
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z; about 28.7 h used, about 43.3 h left
- Approval: **approved by the user through plan mode, 2026-11-07 23:01 UTC** (clock read with `date -u` right after the approval; the plan above is written here unchanged except this line). The user's choice of "A gentle test on the live public site" was given through the question in plan mode just before.
- **Replaces:** nothing. PLAN-013 (hosting) is complete. Step 9.5 (design pass) and step 12 (final README and submission) follow as before.

## Context
- **User, 2026-11-07 ~22:58 UTC:** "need to do concurrent testing". Asked what it means, they chose **"A gentle test on the live public site"** (not the local test, not the refresh-while-browsing case, not parallel test runs).
- **Intended outcome:** evidence of how the page and the public host behave when several visitors load the site at the same moment: every request answered correctly, how long it takes, and no errors, without placing an undue load on GitHub.

## Facts read today (official GitHub pages, SOURCES after step 14.0)
- GitHub Acceptable Use Policies (read 2026-11-07): do not use GitHub's servers "for any form of excessive automated bulk activity" or "to place undue burden on our servers through automated means"; "If we determine your bandwidth usage to be significantly excessive in relation to other users of similar features, we reserve the right to suspend your Account, throttle your file hosting, or otherwise limit your activity". **Load testing is not mentioned** (neither allowed nor forbidden); the Pages limits page (read earlier) gives a soft bandwidth limit of 100 GB per month and rate limits answered with HTTP 429.
- **The real risk of a public test is to the user's account** (throttling or suspension if it looks excessive), not only a 429. Therefore the public part is tiny and stops at the first sign of trouble.

## Assumptions
- **A40:** one normal first visit costs about 4.3 MB and about 79 requests (measured in step 9.3d-2: the page, the map code, the manifest, tiles, pictures, a few ranged reads of the base map, fonts and sprites). A test visitor replays exactly the requests of a real visit.
- **A41:** a test from one computer on one network mostly measures my own connection and the CDN's answer to a handful of simultaneous visitors. It cannot show behaviour at thousands of visitors; the plan says so in the results. GitHub's own capacity (a CDN in front of Pages) is documented, not tested.
- **A42:** 60 MB in total is about 14 ordinary first visits, which is 0.06 % of the soft monthly bandwidth limit (100 GB): no reasonable reading of "excessive".

## Steps (one at a time; Docker tests, line counts and root check before every commit; every step has a security note)

**14.0 Records.** `docs/plans/PLAN-014.md` (this text with the approval), PROGRESS rows, DECISIONS D43 (what was chosen, why the public test is capped, the correction of my earlier unverified claim about GitHub's terms), SOURCES (the acceptable-use page read today).
DONE-CHECK: files exist.

**14.1 The visitor script and the tool.** Record one real visit with Playwright on the LOCAL test site (never the public one) for three kinds of visitor (Chennai at the close fly-in zoom; London; a visitor who clicks the map): the exact list of requests with their `Range` headers. `scripts/load_test.py` (standard library only: threads and `urllib`) replays N such visitors at the same moment against a base address. It measures per request class (page, assets, manifest, tiles, pictures, base-map ranges, fonts and sprites): status codes, bytes, latency (median, 95th percentile, maximum), and checks every answer (status as recorded, byte count, `Content-Range` for the ranged reads). Safety built in and tested offline against a local fake server: **hard cap on total bytes** (default 60 MB, the run stops the moment it would exceed it), a request-rate cap, a time cap, **stop at once on any 429, 403 or 5xx or on more than 5 % failed requests**, no automatic retries, an identifying User-Agent, a printed plan (visitors, requests, bytes, time) BEFORE sending anything, and a `--dry-run`.
DONE-CHECK: Python tests pass, including the cap, the stop on 429 and on 5xx, the rate cap and the correctness checks (a fake server that gives a wrong `Content-Range`, a short body or a wrong status must be reported).
Security note: GET requests only, to addresses the page itself uses; no credentials; the caps are enforced in code and proven by tests, not by good intentions.

**14.2 The full test on this computer (no outside traffic).** Against the Pages-like test site on 127.0.0.1:8081: 1, 10, 25, 50 and 100 simultaneous visitors with the tool, and 5, 10 and 20 simultaneous REAL Chromium visitors (Playwright contexts) measuring the time until the map is drawn, errors and memory. Results show whether the page's own request pattern is sound and whether anything breaks when many visitors start together. Numbers are for my machine's nginx and do not transfer to GitHub.
DONE-CHECK: a results table in PROGRESS; every request correct at every level; the browsers draw the map at every level without console errors; any limit reached is stated plainly.

**14.3 ONE tiny test of the live site (needs the user's explicit go at that moment, with the printed plan).** Stepped once: 1, then 3, then 5, then 10 simultaneous visitors, 30 seconds apart; **60 MB in total at most, 3 minutes at most, at most 40 requests per second**; stop at the first 429, 403, 5xx or when more than 5 % of requests fail; no repeat within the hour; and a second part with 3 real Chromium visitors at once (about 13 MB) to see the page itself. Run once, from this computer.
DONE-CHECK: the tool's report is saved in PROGRESS; zero errors, or the first error and the stop are recorded and the test is not repeated; the repository's Actions page and the site still work afterwards (smoke test).
Security note: this is the only step that sends traffic to a third party; the caps and the stop rules above are the safeguard, and the user has the last word before it starts.

**14.4 Records.** README (one honest line on what was tested and what was not), SECURITY, DECISIONS D43 results, PROGRESS, ERRORS if any, an estimate (labelled as an estimate) of how many first visits per month fit the soft 100 GB limit.
DONE-CHECK: records match what ran; commit and push.

## Critical files
New: `scripts/load_test.py`, `tests/tooling/test_load_test.py`, a recorded visit file under `docs/evidence/` (JSON, URLs relative to the site, no personal data), `frontend/tools/concurrent_visitors.mjs` (real browsers in parallel). Reuse: `scripts/smoke_site.py` (`get`, settings from config), `frontend/tools/load_timing.mjs` (what one visit costs), the Pages-like test site `preview-subpath`, `frontend/tools/phone_checks.mjs` (the Playwright pattern), `docs/evidence`.

## Time (estimates, not measurements)
14.0 about 0.2 h, 14.1 about 1 h, 14.2 about 0.6 h, 14.3 about 0.3 h, 14.4 about 0.3 h: about 2.4 h, so about hour 31. Then step 9.5 and step 12; the last 8 hours stay reserved; no new features after hour 64.

## Security note (this plan)
Traffic is sent only to the user's own public site (and to a local test site), with GET requests for the same files a visitor's browser reads. The public run is capped (60 MB, 3 minutes, 40 requests/second, 10 visitors) and stops at the first error status; it starts only after the printed plan and the user's explicit go; it is run once. The risk named plainly: GitHub may throttle or suspend an account whose bandwidth use it judges significantly excessive; this run is about 0.06 % of the soft monthly limit. No secrets, no authentication, no personal data; the recorded visit contains only public URLs.

## Verification (end to end)
Docker `tests` (tool, caps, stop rules, correctness checks); the local runs at five levels; the real-browser runs; for the public run: the tool's report, no 429 or 5xx, a smoke test of the site afterwards, and the Actions page still green.

## Not doing
Load testing beyond the caps; any repeated or scheduled load test; testing GitHub's CDN at scale; denial-of-service style traffic; testing other people's sites (ECMWF, Open-Meteo, BigDataCloud); the refresh-while-browsing consistency case (offered, not chosen: can be a later step).
