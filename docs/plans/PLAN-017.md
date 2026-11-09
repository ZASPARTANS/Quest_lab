# PLAN-017: A "What this is and how to use it" guide on the site, with "Don't show again" (steps 17.0 to 17.3)

- Drafted: 2026-11-09 about 13:05 UTC in plan mode (the exact time is read with `date -u` when this is written into `docs/plans/PLAN-017.md`). Session `3e56a452-e5f8-4bb9-b353-63bad43748f4`. First prompt 2026-11-06T18:19:13Z, deadline 2026-11-09T18:19:13Z. About 66.8 h used and about 5.2 h left.
- Approval: approved by the user through ExitPlanMode on 2026-11-09 13:14 UTC (66.92 h used). The scope itself (option 3, past hour 64, with a "don't show again" choice on the site) was the user's answer of the same hour. The plan below is the approved text, unchanged.
- **Replaces:** nothing. This is a new, small plan after PLAN-016 (complete) and step 12 (complete).
- **Past hour 64:** this is a new feature after the "no new features after hour 64" line. **The user decided it** (answer of 2026-11-09 about 13:00 UTC: option 3, "add an option that says DON'T SHOW AGAIN. THIS NEEDS TO BE IN THE SITE"). It will be recorded as D48.
- **Missed warnings:** I missed the 60 h warning (due 06:19 UTC) and the 64 h warning (due 10:19 UTC) while the session was idle. This is recorded in PROGRESS.

## Context
- **What the user reports:** "mostly everything works; the only thing is that people are confused about what this is used for, what it does and how to use it."
- **What the page does today:** it opens with `Rain plan` and a single lead line ("Choose a place and what you want to do. You get the best times in the next days, and how sure two forecast models are."). Nothing says in plain words what the page is for, and nothing names the first steps. The jargon "two forecast models" is never explained.
- **Outcome wanted:** a first-time visitor sees a short guide with three parts:
  - what the page is for;
  - the three steps, which match the page's own headings "1. Where", "2. What do you want to do?" and "3. Best times";
  - where the forecast comes from.

  The guide has two buttons. **Close** hides it for this visit only, so it comes back on the next visit. **Don't show again** keeps it hidden in this browser. A **How to use** button in the header opens it again at any time. Shared links and the other parts of the page do not change.

## Approach
Use the native `<dialog>` element with `showModal()`. The browser itself then handles focus, the Escape key and the dimmed background. It works in the browsers we test: Chromium, Firefox, WebKit 27 and Edge. No library is needed.

- **The ladder:** I stopped at rung 3 (the platform `<dialog>` and the page's existing `storage` wrapper). Only about 40 lines of new JavaScript are needed.
- **The buttons are plain `type="button"` buttons** with click handlers that call `dialog.close()`. I do not use `<form method="dialog">`, so the CSP's `form-action 'none'` is never involved.
- **The text is static HTML** in `index.html`, so no `innerHTML` is used. The guide's storage key is in config, following the config-file rule.

### Draft words (plain; the page's own names in quotes)
- **Heading:** "What this page does"
- **Purpose:** "Rain plan shows when rain is expected at a place over the next 10 days, and picks the times that are dry enough for what you want to do."
- **How to use it** (a real sequence, so a numbered list):
  1. **Where:** press "Use my location", search for a town, or click the map.
  2. **What:** choose what you want to do, for example "Drying laundry" or "Commute". Each activity has its own rain limit; with "Custom" you set it yourself.
  3. **Best times:** the 6-hour blocks that stay under that limit. "Day by day" shows every block. The map shows the rain, and the time bar under the map moves it through the days.
- **Where the forecast comes from:** "Two free forecasts from ECMWF, the European weather centre: IFS, its main model, and AIFS, its AI model. Where the two disagree, the page says 'models differ'. New forecasts arrive about every 12 hours."
- **Buttons:** "Close" (the main button) and "Don't show again".
- **The header lead** gets a matching plain line: "When will it rain where you are in the next 10 days, and when is it dry enough for your plans?" There is also a small "How to use" button next to the title.

Facts I checked for these words:
- "10 days": both models run to 240 h (`config/pipeline.toml`).
- The activity names: `config/activities.json`.
- "about every 12 hours": DOMAIN.md and the `freshness` comment in `config/frontend.json`.
- Before I write "tap a block to see it on the map", I will check that clicking a block really moves the map (`block-hit` in `render.js`). If it does not, those words are left out.

## Steps (one at a time; tests, line counts and the root check before each commit)

**17.0 Records.**
- Write `docs/plans/PLAN-017.md` (this text plus the approval).
- Add PROGRESS rows 17.0 to 17.3.
- Add DECISIONS D48: the user's choice of option 3 past hour 64, the modal `<dialog>`, "Close" versus "Don't show again", and the bet "first-time visitors understand the page", to be checked by the user asking people.

DONE-CHECK: the files exist, and `git status` shows only `docs/`.

**17.1 The guide on the page.**
- **New `frontend/src/guide.js`:**
  - `guideHidden(storage, key)` returns true only when the stored value is `"1"`; blocked or damaged storage counts as not hidden.
  - `hideGuide(storage, key)` returns false when the browser cannot store.
  - `startGuide(doc, storage, key)` wires the header button, both buttons and Escape, and opens the dialog when it is not hidden.
- **`frontend/index.html`:** the `<dialog id="guide">` with the words above, the "How to use" button in the header, and the new lead line.
- **`frontend/src/style.css`:** the dialog uses the existing variables (`--panel`, `--line`, `--accent`, `--text`, `--muted`, `button.primary`).
  - It fits a 390 px phone: `max-height: 90dvh` and scrolls inside.
  - It has a `::backdrop`.
  - Buttons are at least 44 px tall.
- **`config/frontend.json`:** `"guide": { "storage_key": "rain-plan.guide-hidden.v1" }`.
- **`frontend/src/app.js`:** two lines, the import and `startGuide(document, storage, cfg.guide.storage_key)` at the start of `main()`. That makes 299 lines, still at most 300. It reuses app.js's blocked-storage-safe `storage`.
- **New `tests/frontend/guide.test.mjs`:**
  - hidden / not hidden;
  - blocked storage (getItem throws, setItem throws): the guide shows and `hideGuide` returns false;
  - a damaged value;
  - the key comes from config.

DONE-CHECK:
- Node tests pass, including the size test (every function at most 50 lines).
- Python tests pass.
- `frontend-check` builds the page and both `vite build`s work.

Security note:
- No new host, input or dependency.
- The stored value is a fixed `"1"`, and it is only compared, never shown.
- No `innerHTML`; the CSP is unchanged.

**17.2 Checks in real browsers.**
- **New `frontend/tools/guide_skip.mjs`:** `skipGuide(context)` adds an init script that sets the key. This is what a returning visitor who pressed "Don't show again" looks like.
- **Used in:**
  - `browser_checks.mjs` `open()`, so the 33 existing scenarios run as before;
  - `phone_checks.mjs` (both contexts);
  - `design_shots.mjs`, `screenshots.mjs`, `live_look.mjs`, `record_visit.mjs` and `concurrent_visitors.mjs`.
  - `load_timing.mjs` is left as it is, because a first visit with the guide is the real case there.
- **New `frontend/tools/guide_scenarios.mjs`** (4 scenarios, each in its own fresh context without the skip):
  1. A first visit shows the guide with its heading, focus is inside it, "Close" hides it, and a reload shows it again.
  2. "Don't show again" and a reload: no guide. The "How to use" button opens it again.
  3. Escape closes the guide.
  4. With storage blocked (an init script makes `localStorage` throw), the guide shows, "Don't show again" still closes it, and there is no console error.

  The page behind the guide still loads the plan while the guide is open (shared address).
- **Design shots** of the open guide at 390 px and 1280 px, which I look at myself.

DONE-CHECK:
- 37 of 37 scenarios pass in Chromium, Firefox, WebKit and Edge.
- The phone checks are unchanged (overflow 0 px, no small tap targets).
- The screenshots are looked at and described honestly.

Security note: test code only, and only localhost.

**17.3 README, records, push, live check.**
- **README:** a short "What it is and how to use it" section at the top, with the same words as the guide, and the scenario count 37.
- **Records:** SUBMISSION (the counts), PROGRESS, D48 result so far, and ERRORS if anything went wrong.
- Then: full tests, line counts and the root check, and a commit.
- **Push only after the user's go.** It goes to `ZASPARTANS/Quest_lab` only and includes the local `dfa71d2`.
- After the push: wait for the workflow, run the live smoke test, and check the live page in a fresh browser (the guide shows; "Don't show again" works after a reload).

DONE-CHECK: the above, shown. The Mac (Safari) check stays the user's.

## Critical files
- **Modify:** `frontend/index.html`, `frontend/src/style.css`, `frontend/src/app.js` (2 lines), `config/frontend.json`, `frontend/tools/browser_checks.mjs` (plus the scenario list), `phone_checks.mjs`, `design_shots.mjs`, `screenshots.mjs`, `live_look.mjs`, `record_visit.mjs`, `concurrent_visitors.mjs`, `README.md`, `docs/`.
- **New:** `frontend/src/guide.js`, `tests/frontend/guide.test.mjs`, `frontend/tools/guide_skip.mjs`, `frontend/tools/guide_scenarios.mjs`, `docs/plans/PLAN-017.md`.
- **Reused:** `storage` in `app.js` (the blocked-storage fallback), `byId` in `dom.js`, the browser-check helpers `open`, `shot` and `waitPlan`, and the style variables and `button.primary`.

## Time (estimates, not measurements)
| Step | Estimate |
|---|---|
| 17.0 | 0.1 h |
| 17.1 | 0.6 h |
| 17.2 | 0.7 h |
| 17.3 | 0.6 h including the build of about 6 minutes |

That is about 2 h, so done around 15:15 UTC. It leaves about 3 h before the 18:19 UTC deadline for the final records. If 17.2 runs late, the cut is the design shots, not the scenarios.

## Security note (this plan)
- No new dependency, host or permission.
- One new browser storage key holding a fixed value.
- Static text only; the CSP is unchanged (no inline script or style, no `form-action` use).
- The push goes to the user's own repository and only after the user's go.

## Verification (end to end)
- Docker `frontend-tests` (Node, including `guide.test.mjs` and the size test) and `tests` (Python).
- `frontend-check`.
- `browser-checks`: 37 scenarios in four engines.
- `phone_checks`.
- Design shots of the guide, looked at.
- After the push: the workflow is green, `scripts/smoke_site.py` passes, and a fresh browser visit to the live site shows the guide, and "Don't show again" holds after a reload.

## Not doing
- A step-by-step tour that points at elements.
- Animation.
- Translations.
- Changing the plan, map or data code.
