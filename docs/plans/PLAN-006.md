# PLAN-006 — "Plan-my-day" as the signature of the app; steps 7-12 reshaped

- Drafted and approved: 2026-11-06 ~23:24 UTC (plan-mode draft written ~23:15 UTC; time of this file taken with `date -u`)
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z; about 5 h used
- Approval: **approved by the user (Nishaanth Senthilkumar) through the plan-mode approval prompt, 2026-11-06 ~23:24 UTC.** Plan text below is unchanged from the approved draft; only the Drafted and Approval lines were filled in.
- **Replaces: PLAN-005 for steps 7-12** (PLAN-005's security steps S1-S5 and steps 1-6 are done and carried over unchanged; PLAN-004's step text for 7-12 is superseded by this plan).

## Why this plan (Context)
- **User request (2026-11-06 ~23:00 UTC):** "i dont see anything innovative here ... give me ideas to make the front end genuinely innovative." Nine ideas were offered (recorded in `docs/PROGRESS.md`). **The user chose "Plan-my-day" as the signature** and said extras must be **helpful features, not decoration**: "this extras might look good but well not help an user, the extra should be an helpful feature as well".
- **User choices (AskUserQuestion, ~23:12 UTC):** signature = Plan-my-day; extras = **Saved places** and **Rain totals with a range**; resolution = **6-hour blocks everywhere**.
- **Dropped on purpose (not planned):** hear-the-forecast sound, compare lens, rain spiral, smooth motion, agreement-aware hatched map as a signature, storm tour. **Not chosen (possible later only if the user asks):** share + calendar file, offline/installable app, other languages.
- **What it changes:** the front end becomes **text-first and place-first**: the plan for the visitor's place comes first, the map and globe become supporting views loaded afterwards. This also fixes the blank page without WebGL2 (D23) because the plan works without the map.
- Kept: D1-D23, the two local sites (D19), MapLibre + Natural Earth (D22), online geocoder (D20; service chosen at step 8 with the user), no GPU (D23), automatic deploy after tests (D19), all security rules (D15, PLAN-005).

## What the visitor gets (the product)
1. **Open the page:** it asks for the browser's location (or the visitor types a place, or clicks the map). Location stays in the browser (D2/D3); typed place names go to the online geocoder the user chose.
2. **Pick an activity** from presets in `config/activities.json`: commute, laundry, picnic/outdoor event, cricket/sports, farming/field work, travel; plus a custom "what counts as wet" setting. A preset = wet threshold (mm per 6 h block, default family around the D13 0.5 mm), minimum window length (blocks), allowed local hours (for example 06:00-22:00), and plain wording.
3. **10-day plan as day cards:** one card per local day with a one-line verdict ("Mostly dry. Best window 11:30-17:30"), four coloured blocks, and for each block an agreement word: **both models dry / both wet / models disagree**. Beyond 240 h only AIFS exists, shown as "one model only".
4. **Best windows:** the top 3 dry windows for the chosen activity, ranked by confidence (all blocks both-dry first, then one-model-dry marked "uncertain"), then length, then soonness. Plain-language confidence; never a probability (D3).
5. **Rain totals with a range:** expected rain over the next 3, 7 and 10 days at the place, shown as a range between the two models plus each model's own number.
6. **Saved places:** up to 5 places stored only in this browser, with a one-line verdict each for the chosen activity ("Home: dry until Saturday. Work: rain Friday afternoon").
7. **Map and globe (supporting):** loaded after the plan text appears; flat and globe switch keeps place and time; model switch **pure IFS / pure AIFS / both (agreement always visible)**; click the map to set the place. If the browser cannot draw WebGL2, the map area shows a plain message and everything above keeps working.
8. **Honesty strip:** model run time and retrieval time (UTC and local), age warning in plain words (D9), "agreement is not a probability", "6-hour blocks starting at 05:30, 11:30, ... local time", attribution (ECMWF, CC BY 4.0, wording verified at step 10), "not an official weather warning".

## Design facts and assumptions (stated before building on them)
- **Blocks:** the processed axis is UTC-aligned 6-hour intervals; a block's valid time is its END (`pipeline/process.py`, `valid_times`). Local blocks therefore start at odd times in many zones (India +05:30: 05:30, 11:30, 17:30, 23:30). Shown plainly, not hidden.
- **Time zones (assumption A14, partly verified):** the Open-Meteo geocoding response contains an IANA `timezone` field (seen in the real Chennai request: `Asia/Kolkata`); geolocation and URL places use the device's time zone, labelled as such (decision A8 shortcut, to record in DECISIONS). Browser `Intl.DateTimeFormat` with `timeZone` handles DST; **checked in Node tests in Docker (full ICU) at step 8**, then in the user's real browsers.
- **Size (assumption A6, unverified):** a naive global point store is about 1,038,240 cells x 100 six-hour values x 2 bytes x 2 models, about 200 MB raw before compression. Step 7 **measures** the real size and has a decision gate if it exceeds the chosen free host's limits (fallbacks already in D4: coarser quantisation, delta + gzip, bigger chunks, a 0.5 degree storage grid, AIFS-only beyond 240 h). Map frames are optional and lower resolution; also measured.
- **Resolution (D14 stays):** 6-hour blocks for both models; IFS 3-hourly detail stays dropped. A future 3-hour option would reopen D14 (not planned).
- **Risky logic that needs tests (CLAUDE.md rule):** time zones and DST, blocks crossing local midnight, the partly elapsed current block, thresholds at the edge (>= threshold = wet), window ranking, totals ranges, saved-places storage parsing.

## Steps (one at a time; commit after each; Docker tests, line counts and root check before every commit; every step has a security note)

7. **Static data export** (`backend/export.py`, settings in `config/backend.toml`, tests in `tests/backend/`). Reads `data/processed/<run>/`; writes into `data/site/`: point tiles (chunked grid, uint16 tenths of mm, both models, all 6 h blocks), optional lower-resolution map frames (both models + agreement), and `manifest.json` (run time, retrieval time UTC, steps, valid times, units mm per 6 h, tile index, frame list, licence and source URLs). Replaces `scripts/spike_frame.py`.
   DONE-CHECK: Docker pytest passes (tile index maths incl. longitude start 180, manifest schema, quantise round trip); a city read back from a tile equals the step 5 raw value within 0.05 mm for both models; total size printed and compared with the free-host limits; **if over a limit, stop and propose the fallback to the user**.
   Security note: no pickle; manifest and tiles are treated as untrusted by the browser; the public status record carries only an error category and time (S04, **user confirms here**).

8. **Plan engine + place panel** (`frontend/src/plan.js`, `config/activities.json`, tests in `tests/frontend/`). Pure functions: block local times, per-model wet classification, agreement classes, `findWindows`, `rainTotals`, verdict wording; place selection (geolocation, search with the geocoder chosen with the user at this step, validated URL parameter, later map click); saved places; day cards, windows list, totals; text-first page that works without WebGL.
   DONE-CHECK: `docker compose ... run --rm frontend-tests` passes, including time zone cases (India +05:30, a DST zone, a zone where the local date differs from UTC), windows across local midnight, the threshold edge, the current partly elapsed block, 11-day totals; for a known city the verdict and totals computed from a real tile equal values computed independently in Python from the step 5 raw reads; geolocation granted and denied exercised in a real browser (Playwright, origin treated as secure; real HTTPS later); screenshots on both local sites.
   Security note: lat/lon from URL or geocoder are validated and clamped; activity ids come from a whitelist; saved places are schema-checked JSON with a size limit; all visitor-visible text is written with `textContent`; no analytics, no cookies; the geocoder's one host is added to `connect-src` in `config/headers.conf` and nowhere else, with a plain privacy line on the page.

9. **Map and globe as supporting views** (`frontend/src/`; replaces the spike pages). Lazy-loaded MapLibre map with the frame for the chosen block, model switch (IFS / AIFS / agreement), flat and globe switch that keeps place and block, click to set the place, plain message without WebGL2.
   DONE-CHECK: build ok in Docker; screenshots of both modes and of the no-WebGL2 message on both local sites; the switch keeps place and block (browser test like the step 6 toggle test); the user confirms in their Firefox.
   Security note: no third-party tiles or scripts; worker and `.mjs` rules unchanged (S14).

10. **Provenance + honesty** (the strip above): age warning with threshold in `config/frontend.json` (wording shown to the user first), attribution text verified on the official ECMWF terms page and passed through the manifest, "agreement is not a probability", block explanation, privacy line, "not an official warning". Final Content-Security-Policy.
    DONE-CHECK: build ok; the attribution string is found in the built page or manifest; the warning appears when the manifest is made older than the threshold and contains no technical text (D9); policy checked in a real browser with no console error.

11. **Hosting gate + deploy** as in PLAN-004 step 11 (compare current free-tier terms of GitHub Pages, Cloudflare Pages and Netlify on official pages; user chooses; `gh auth login`; repo only with approval and the user's link; scheduled workflow fetch -> Docker tests -> process -> export -> build -> deploy; previous deployment stays live on failure; post-deploy smoke test and a one-command redeploy of the previous commit, D19). The host must serve `.mjs` as JavaScript, send the headers of `config/headers.conf` (or use a CSP meta tag), allow `worker-src blob:`, and fit the measured size (step 7).
    Security note: least-privilege workflow permissions, pinned and vetted actions, `timeout-minutes`, no secrets, no environment dumps, the Docker test command (with the secret scan) runs before deploy.

12. **README + submission** (`docs/SUBMISSION.md`): what works, what does not, how to run, what was verified and how, every `shortcut:` (the register in DECISIONS), browser status (Chromium, Edge, Firefox confirmed by the user; Safari and phones as agreed in D23, tested if time allows). Security checks of the submission checklist in `docs/PROGRESS.md`.

## Time (elapsed hours; estimates, not measurements)
Now about 5.0 h. Step 7 about 5 h, step 8 about 9 h, step 9 about 5 h, step 10 about 3 h, step 11 about 6 h, step 12 about 3 h: about 31 h, so the work finishes around hour 36-40, leaving time for Safari and phone testing, E007 and fixes. The last 8 hours (from hour 64) stay reserved: no new features then. Warnings at 24, 48 and 60 h.

## Records to write after approval (before step 7)
`docs/plans/PLAN-006.md` (this text, with date, time and approval), `docs/DECISIONS.md` D24 (signature, extras, dropped ideas, 6 h blocks, A8 time-zone shortcut), `docs/PROGRESS.md` (current plan, step table 7-12 renamed, open items), `docs/ERRORS.md` only if a planning gap is found.

## Security note (this plan)
Everything personal stays in the browser: place, saved places and activity choices are stored locally and never sent; only the text a visitor types into place search goes to the online geocoder (the user's choice, D20), with a visible privacy line. No new server, no accounts, no analytics. Untrusted inputs (URL, geocoder results, localStorage, manifest, tiles) are validated and bounds-checked; text is written with `textContent`. The public site stays static HTTPS with the headers in `config/headers.conf`.

## Verification (end to end)
Docker: `tests` (pytest incl. export) and `frontend-tests` (node --test incl. plan logic and time zones) pass; the step 5 validation still passes on the new tiles; both local sites (5173 testing with DEV badge, 8080 public-like) show the same plan for a known city; real-browser screenshots; the user confirms the plan, windows and totals in their own Firefox for a place they know; after deploy a fresh `curl` of the public URL returns the page and a manifest with the latest run time.

## Not doing
Sound, lens, spiral, smooth motion, storm tour, share/calendar export, offline app, other languages, push notifications (a static site has no server to send them), any claim of an official warning, any hosted staging site.
