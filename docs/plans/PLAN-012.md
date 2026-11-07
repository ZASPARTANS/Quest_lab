# PLAN-012 — One colour for the map's "Both models" view, and a clear colour key (steps 12.1 and 12.2); amends PLAN-011

- Drafted: 2026-11-07 17:42 UTC (`date -u` read while exploring)
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z; about 23.4 h used, about 48.6 h left
- Approval: **approved by the user through plan mode, 2026-11-07 17:42 UTC** (clock read with `date -u` right after the approval; the plan above is written here unchanged except this line). The user's choice of "One colour + a clear key" was given through the question in plan mode just before.
- **Replaces:** **decision 3 of PLAN-011** ("map: only reword the legend, no export change", approved 17:37 UTC) and the map-legend part of its step 11.2. **The rest of PLAN-011 stands unchanged** (steps 11.0 to 11.4: rain levels, wording, the day view, browser checks). New order: finish 11.0 → **12.1 → 12.2** → 11.1 → 11.2 (without the map legend) → 11.3 → 11.4.
- **Why decision 3 was wrong:** I took "reword the legend" as enough. The user's screenshot (2026-11-07 ~17:40 UTC) shows the real problem: orange ("models disagree") reads as heat and blue as rain, and the small key at the bottom is not noticed.

## Context
- **User, 2026-11-07 ~17:40 UTC (screenshot of the "Both models (agreement)" view over Tamil Nadu):** "it looks like the orange looks like heat and blue is raining. so we have to show just 1 or a colour code information of what that colour says". Their choice in plan mode: **"One colour + a clear key"**.
- **Intended outcome:** in the agreement view everything that is rain is blue (nothing looks like heat); the strength of the blue says how many models say rain; and a titled, readable key explains every colour on the map, in both map views.

## Assumptions
- **A33:** the agreement view's two coloured classes are already "both models say rain" (`both_wet`) and "only one model says rain" (`disagree`: one at or above the 0.5 mm threshold, one below); changing only the colours (not the rule) keeps the data, the tiles and the plan untouched. The colour of each class lives in `config/backend.toml` `[frames.agreement_colours]`, goes into every pre-made agreement PNG (palette) and into `manifest.json` (`frames.agreement_colours`), and the live drawing (`live.js agreementPicture`) and the key read it from the manifest: so a colour change needs **a re-export of the frames (a few minutes) and a restart of the preview (E029)**, but **no change in the drawing code**.
- **A34:** one blue hue with two lightness steps stays readable for common colour-blindness and over the dark base map: solid blue (now `#2a6fd6`) = both models, a paler blue of the same hue (candidate `#9cc3f5`, to be fixed by measurement in step 12.1) = only one model. The step between them is checked by a test (same hue, clearly different lightness).
- **A35:** the single-model views (IFS, AIFS) keep the rain-radar ramp (blue, green, yellow, orange, red, magenta, with a numbers bar); its colours are the usual rain-map code and are explained by the new key in words ("blue little rain ... red a lot"). Changing that ramp is not part of this plan.

## Steps (one at a time; Docker tests, line counts and root check before every commit; every step has a security note)

**12.1 One blue for the agreement view.** `config/backend.toml`: `disagree` becomes the pale blue (value chosen by measuring the contrast of both blues against the dark land colour of the base map and against each other, printed in the step's results); a Python test in `tests/backend` (or hygiene): both coloured classes have the same hue within 10 degrees and differ in lightness by a set amount, and neither is in the orange/red range. Re-export with the `export` Docker service (no network), then `scripts.validate_site`, restart the preview. The test fixture in `tests/frontend/mapstate.test.mjs` is a sample only (no change needed, kept in step with the config by a look).
DONE-CHECK: `docker compose ... run --rm tests` and `frontend-tests` pass; `export` and `validate_site` pass (tiles equal the processed data and the raw files, frames written); `curl` of the preview's `manifest.json` shows the new colour; Chromium screenshots of the agreement view zoomed out (pre-made picture) and at zoom 7 (live drawing) show blue and pale blue only, no orange.
Security note: colours come from our own config, validated as `#rrggbb` by the manifest checks; the export runs in the hardened container (non-root, read-only, no network).

**12.2 A clear colour key.** `frontend/src/mapcontrols.js` (+ `style.css`, `config/frontend.json` for the key texts): replace the small legend line by a **titled key, "What the colours mean"**, with larger swatches and plain words, for both views. Agreement view: "Solid blue: both models say rain (0.5 mm or more in 6 hours)", "Pale blue: only one model says rain", "No colour: neither model says rain". IFS/AIFS views: the numbers bar as now plus one sentence ("Blue: a little rain, green and yellow: more, red and purple: a lot. Colours show rain only, not temperature.") and the model name. Words built from the config and the manifest, shown with `textContent`. Pure string builders get Node tests (all three agreement lines, the single-model sentence, no word "wet", "dry" or "heat" except in the "not temperature" sentence).
DONE-CHECK: Node tests pass; browser scenario: in the agreement view the key shows the three lines and the swatch colours equal the manifest's colours; in IFS view the sentence shows; screenshots in Edge at 1280 and 390 px; the user looks (one round of feedback, up to two).
Security note: texts from config, `textContent` only; no new host or dependency.

## Critical files
Modify: `config/backend.toml`, `config/frontend.json` (key texts), `frontend/src/mapcontrols.js`, `frontend/src/style.css`, `tests/` (a colour test and key-string tests), `frontend/tools/map_scenarios.mjs` (key scenario). Rebuilt (generated, git-ignored): `data/site/frames/agreement_*.png`, `data/site/manifest.json`. Reuse: `backend/frames.py` `agreement_palette` (colours from config, unchanged), `backend/export.py`, `scripts/validate_site.py`, `frontend/src/live.js` `agreementPicture` (takes the colours from the manifest, unchanged), the manifest colour check in `frontend/src/manifest.js`.

## Time (estimates, not measurements)
12.1 about 0.7 h (the re-export takes several minutes), 12.2 about 0.6 h: about 1.3 h, on top of the 5 h of PLAN-011. The **24 h warning (2026-11-07 18:19 UTC)** falls during this work. The last 8 hours stay reserved; no new features after hour 64.

## Security note (this plan)
Config-driven colours and texts only; colours validated as `#rrggbb` before use; text set with `textContent`; the export runs in the hardened, network-less container; the forecast numbers and the plan rules are not touched.

## Verification (end to end)
Docker `tests`, `frontend-tests`; `export` + `validate_site`; preview restarted; `browser-checks` in Chromium, WebKit, Firefox (Docker) and Edge (real GPU); screenshots of the agreement view (zoomed out and zoom 7) and of the key at 1280 / 390 px; the user's own look at http://localhost:8080 (Ctrl+F5).

## Not doing
Changing the agreement rule (0.5 mm) or the plan levels; colouring the map by the four rain levels (the user chose one colour + a key); changing the IFS/AIFS colour ramp; a new library.
