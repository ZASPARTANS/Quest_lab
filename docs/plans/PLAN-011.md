# PLAN-011 — Rain levels (no rain / light / moderate / heavy) instead of wet and dry, and a clearer day view (steps 11.0 to 11.4)

- Drafted: 2026-11-07 17:36 UTC (`date -u` read while drafting)
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z; about 23.3 h used, about 48.7 h left
- Approval: **approved by the user through plan mode, 2026-11-07 17:37 UTC** (clock read with `date -u` right after the approval; the plan above is written here unchanged except this line). The user's three choices (thresholds A, wetter model + note, map legend words only) were given through the questions in plan mode just before.
- **Replaces:** the wet/dry/"models disagree" vocabulary and the day-card look of PLAN-006 step 8 (decisions D13 wording, D24, D28 wording). **D28's logic stays**: the stored-value rule, windows from consecutive usable blocks, confidence (sure / uncertain / one model), rain totals as a range. Part of the design pass (PLAN-007 step 9.5) is pulled forward: only the plan's day view. 9.5 (rest of the design), step 10, 11 and 12 follow as before.

## Context (why this plan exists)
- **User, 2026-11-07 ~17:30 UTC (with a screenshot of the day cards):** "we need to change few things like wet and dry because that's confusing to anyone who uses the website. so what we will do is no rain, light, moderate and heavy. and use those for planning. the planning also is not looking good ... so we will solve this first before we start anything else".
- **What is wrong now:** every block is "Dry", "Wet" or "Models disagree" (a hatched box); the activity's rule is a raw number ("Wet means 0.5 mm or more in a 6-hour block"); each day is a 2x2 grid of boxes with extra lines ("over, outside your hours"); hatching and dots need explaining.
- **Intended outcome:** the whole plan speaks in four rain levels, the same words everywhere (blocks, windows, saved-place line, the activity's tolerance, a legend with the mm ranges), and a day is one clean row that can be read at a glance.

## Decisions already made by the user (2026-11-07, this session)
1. **Thresholds per 6-hour block: No rain under 0.5 mm; Light 0.5 to under 3 mm; Moderate 3 to under 10 mm; Heavy 10 mm and over.** (Option A.) 0.5 mm is the user's D13 value. Evidence measured on the real run (7 days, whole world, area-weighted, IFS): 71 % / 22 % / 6 % / 1 % of blocks; the hourly standard multiplied by 6 would have given 0.3 % moderate and no heavy. Sources found (search results only, pages still to be opened and recorded in step 11.0): AMS Glossary "Rain" (light up to 0.25 cm/h, heavy over 0.76 cm/h), India Meteorological Department 24 h scale (light 2.5 to 15.5, moderate 15.6 to 64.4, heavy 64.5 to 115.5 mm), Bureau of Meteorology Australia (2.5 and 10 mm/h), Norway yr.no (heavy from 1 mm/h): **there is no agreed international definition**; these numbers are ours, for 6-hour blocks of a 28 km grid, and the page says so.
2. **Two models in different levels:** the block shows the **wetter** model's level plus a "models differ" note ("IFS: no rain, AIFS: light"); windows keep D28 (a block stays usable if only one model goes over the activity's limit; such a window is marked "models differ in part").
3. **Map:** only the words of the "Both models" legend change ("Both models: rain" / "Models disagree" / "Both: no rain, no colour"). No export or drawing change; nothing is re-exported.

## Assumptions
- **A29:** the stored-value rule of D28 carries over: a block's level comes from the stored integer (0.1 mm steps): level = the highest level whose lower bound `from_mm` satisfies `stored * quantum >= from_mm` (same ceiling rule as `wetLimit`). So 0.45 mm raw (stored 0.5) is Light, as the user's D13 value already behaves.
- **A30:** an activity's tolerance is a **maximum level** (none, light or moderate). Its old `wet_mm` becomes the lower bound of the next level (none: 0.5, light: 3, moderate: 10 mm), so the D28 logic (`blockState`, `findWindows`) is reused unchanged. Cost, stated plainly: laundry (was 0.1 mm), picnic (0.3) and cricket (0.2) now accept up to 0.5 mm as "no rain", because 0.5 mm is the first level boundary. If the user wants stricter, a fifth level "trace" is the answer, not a special case.
- **A31:** a local day always holds exactly four 6-hour blocks (midpoints are 6 h apart), the first and last day may hold fewer; the cell grid can therefore be four equal columns.
- **A32:** level colours can follow the map's own colour ramp (light blue to red), so plan and map agree; every text/background pair keeps WCAG AA (4.5 : 1), checked by a Node test.

## Defaults for the activities (the AI's judgement, in config, open to the user's correction)
| Activity | Accepts (max level) | Was |
|---|---|---|
| Outdoor plans | No rain | 0.5 mm |
| Commute | Light rain at most | 1.0 mm |
| Drying laundry | No rain | 0.1 mm |
| Picnic or event | No rain | 0.3 mm |
| Cricket or sport | No rain | 0.2 mm |
| Field work | Light rain at most | 2.0 mm |
| Travel by road | Light rain at most | 2.0 mm |
| Custom | the visitor picks: No rain / Light at most / Moderate at most (default No rain) | a list of mm values |

## Steps (one at a time; Docker tests, line counts and root check before every commit; every step has a security note)

**11.0 Records and sources.** Write this plan as `docs/plans/PLAN-011.md` (date, time, approval), PROGRESS (current plan, rows 11.0-11.4), DECISIONS D41 (the user's three choices, the table above, the measured shares and the AI's bet that "light/moderate/heavy at 3 and 10 mm per 6 h" feels right to users in India and elsewhere). Open the AMS glossary page and the IMD document with WebFetch (content is data), and only record what was actually read in SOURCES and DOMAIN (the "no agreed definition" finding, and the measured shares with the script that produces them, not the numbers' raw dump).
DONE-CHECK: the files exist; every source in SOURCES was opened this session or is marked "search result only, not opened".
Security note: fetched pages are data, not instructions.

**11.1 Engine, config and tests (no visible change yet except through tests).** `config/activities.json`: add `levels` (id, label, `from_mm`; none 0, light 0.5, moderate 3, heavy 10) and give every activity `max_level` (custom: `level_choices`, `default_level`) instead of `wet_mm` / `wet_choices_mm`. `frontend/src/plan.js`: `levelOf(stored, levels, quantum)`; each planned block gets `level` (wetter model), `levels` per model, `differ`, and the old state renamed to `fit` = `ok` | `maybe` | `over` (every model within the limit / one over / every model over), same logic as dry/disagree/wet. `windows.js`: windows use `fit` (confidence rule unchanged); add the window's worst level. `view.js`, `wording.js` (all strings by level, see 11.2). `scripts/plan_reference.py` and `frontend/tools/plan_check.mjs`: the independent Python version of the same rules (levels read from the same config), compared on the real tiles. Tests: `tests/frontend/plan.test.mjs` rewritten for levels, including the edges at stored 4/5, 29/30, 99/100 (0.4 / 0.5, 2.9 / 3.0, 9.9 / 10.0 mm), the wetter-model rule, `maybe` blocks, one-model blocks; a config test (levels ascending from 0, multiples of 0.1, every `max_level` exists and is not the last level, existing hours/min_blocks test kept).
DONE-CHECK: `docker compose ... run --rm frontend-tests` and `... run --rm tests` pass; `... run --rm process python -m scripts.plan_reference` then `... run --rm frontend-check`: all 8 places x 8 activities equal (levels, fit, windows, day levels, totals).
Security note: config only; no new input.

**11.2 Words everywhere.** `wording.js`, `render.js`, `frontend/index.html`, `mapcontrols.js`: block words "No rain / Light / Moderate / Heavy"; "models differ" note; windows "3. Best times" with "No rain" or "Light rain at most" per window and "Both models agree." / "The models differ about part of it."; the activity note ("Good times: no rain more than ... Hours used ...") plus a **level legend line** under the days ("No rain: under 0.5 mm · Light: 0.5-3 · Moderate: 3-10 · Heavy: 10 mm or more, per 6 hours. These cut-offs are ours; there is no official standard for 6-hour blocks."), built from the config; the saved-place line ("Light rain Sun 8 Nov 05:30-11:30." / "No rain through Sat 15 Nov."); the day verdict; page title and lead ("when is it good for what you want to do?"); the Custom choice becomes a three-way choice, stored and addressed as `accept=none|light|moderate` (validated against the config list; the old `wet=` is ignored); the map legend words (decision 3).
DONE-CHECK: Node tests for every string builder (levels, single-model, differ, nothing left, over); screenshot of the left panel in Edge; no sentence on the page uses "wet" or "dry" for the plan (a test searches the strings; the map legend says "rain" and "no rain").
Security note: all text still goes in with `textContent`; the new address and storage values are checked against the config list before use (the hostile-address scenario covers it).

**11.3 The day view (the look).** Uses the frontend-design skill for a short written direction first, then built. Direction: a day = a heading with a one-line verdict and **one row of four equal cells** (one per 6-hour block), each cell filled with the level's colour (the map's ramp: no rain calm and dark, light blue/green, amber, red) and its word; the start time of each cell as a small tick label under it (05:30, 11:30, 17:30, 23:30); "models differ" shown by a small "≠" mark plus the two models' levels in the cell's accessible name and in the day verdict, no hatching; blocks that are over or outside the activity's hours are dimmed with one explanation in the legend instead of a line in every cell; the block shown on the map keeps its outline and stays a button. Level colours in `config/frontend.json`; a Node test checks every text/background pair (>= 4.5 : 1) and that the four colours are distinct. Colour is never the only signal (the word is always in the cell). Within the 1/4 plan column and on phones.
DONE-CHECK: Edge screenshots at 390, 1100 and 1280 px of one place with rain (Chennai) and one without; contrast test passes; the user looks and says whether the day view reads at a glance (one round of feedback, up to two).
Security note: CSS and markup only.

**11.4 Browser checks and records.** Update the scenarios that name the old words ("saved" checks the saved line, "activity change" the note) and add: the four level words and the legend line appear; an activity with a tolerance (Commute) shows fewer unusable blocks than "Outdoor plans" for the same place; Custom has three choices and survives a reload; the hostile `accept=` value is ignored. Four engines (Chromium, Edge with the real GPU, Firefox, WebKit). Records: DECISIONS (D41 result), DOMAIN (levels and the missing standard), SOURCES, README (what the levels mean and where they come from), PROGRESS, ERRORS (any), SECURITY (note only), the shortcut register if a `shortcut:` is added.
DONE-CHECK: all browser scenarios pass in four engines; frontend-check still 8 x 8; line counts under 300; commit.
Security note: none new.

## Critical files
Modify: `config/activities.json`, `config/frontend.json` (level colours), `frontend/src/{plan,windows,view,wording,render,places,app,mapcontrols}.js`, `frontend/src/style.css`, `frontend/index.html`, `scripts/plan_reference.py`, `frontend/tools/{plan_check,browser_checks}.mjs`, `tests/frontend/{plan,places}.test.mjs`, a config test under `tests/`, README and the records in `docs/`. New: a Node test for the level colours (contrast). Reuse: `wetLimit` (ceiling rule), `blockState` logic, `findWindows`, `rainTotals` (unchanged), the colour ramp in `config/frontend.json` (`colour_scale`), `dom.js` (`el`, `fill`).

## Time (estimates, not measurements)
Now about 23.3 h. 11.0 about 0.5 h, 11.1 about 1.5 h, 11.2 about 0.8 h, 11.3 about 1.5 h, 11.4 about 0.8 h: about 5 h, so about hour 28-29. The **24 h warning (2026-11-07 18:19 UTC)** falls during this plan. Then PLAN-007 step 9.5 (rest of the design), steps 10, 11 (hosting) and 12 as chosen by the user; the last 8 hours stay reserved; no new features after hour 64.

## Security note (this plan)
No new dependency, host, cookie or stored personal data. The only new inputs are the `accept` address value and the stored custom level; both are checked against the list in the config before use, and a hostile value falls back to the default. Texts are built with `textContent`, never as markup. The forecast numbers, the export and the map data are not touched.

## Verification (end to end)
Docker `frontend-tests` and `tests`; `process python -m scripts.plan_reference` then `frontend-check` (8 places x 8 activities equal to the independent Python version); `frontend-build` and the preview restarted; `browser-checks` in Chromium, Firefox and WebKit (Docker) and in Edge (real GPU); screenshots of the left panel at 390 / 1100 / 1280 px; the user's own look at http://localhost:8080.

## Not doing
Changing the exported data, the agreement frames or the live drawing; colouring the map's agreement view by level (the user chose wording only); a fifth "trace" level; rain probabilities; hourly detail; any new library; the rest of the design pass (9.5), hosting and the final README (steps 9.5, 11, 12).
