# DECISIONS

Append only. Each entry: date/time, what was chosen, alternatives, why, who decided, and a bet that can be checked later.

## D1 — Models: IFS (oper) + AIFS Single
- 2026-11-06 ~18:35 UTC. Decided by: **user** (AI recommended the same).
- Chosen: ECMWF IFS HRES (`ifs/0p25/oper`) and AIFS Single (`aifs-single/0p25/oper`), both total precipitation `tp`.
- Alternatives: IFS only; AIFS only. Both would drop the always-visible IFS-vs-AIFS agreement panel the user asked for.
- Why: IFS gives 3-hourly detail to 144 h then 6-hourly to 240 h; AIFS gives 6-hourly to 360 h. Where they overlap they can be compared. Agreement is shown as agreement, never as a probability.
- Checkable bet: both models publish the full step range on 00z/12z runs (checked on the 00z run of 2026-11-06 only; to be checked again in plan step 3).
- Result: pending.

## D2 — Architecture: static site + scheduled pipeline
- 2026-11-06 ~18:38 UTC. Decided by: **user** (AI recommended).
- Chosen: a Python pipeline run on a schedule writes processed static files; a static front end loads only what it needs. No live server. The exact free static host is chosen later (plan step 11) after the AI checks current free-tier terms on official pages.
- Alternatives: FastAPI on a free PaaS (cold starts, small RAM, ephemeral disk, coordinates sent to a server); local run with one fixed snapshot (goes stale).
- Why: no server to sleep or crash, no RAM cap for the global grid, location stays in the browser, app can be public.
- Checkable bet (assumption A6): the processed output fits free static-host limits. Measured in plan step 7, verified in step 11.
- Result: pending.

## D3 — Front end: 2D map + 3D globe toggle + always-present location panel
- 2026-11-06 ~18:36 UTC. Decided by: **user** (user's own combination of the offered options).
- Chosen: animated precipitation map with time scrubber, and a 3D globe view, switchable between pure 2D and pure 3D. A location panel with a local-time rain timeline and the IFS-vs-AIFS agreement is present in both views. Browser geolocation is used to start at the user's place, with search/click as fallback when permission is denied.
- Alternatives offered: map only; place-first planner only; globe only.
- Why (user): a location result without searching is faster and more comfortable; model agreement must always be visible.
- Checkable bet: one library can serve both 2D and 3D (e.g. a map library with globe projection). Decided at plan step 6 with the user.
- Result: pending.

## D4 — Coverage: global
- 2026-11-06 ~18:38 UTC. Decided by: **user** (AI recommended).
- Chosen: the whole 0.25-degree grid, delivered as chunked tiles so the browser loads only the area it needs.
- Alternatives: Europe; India / South Asia.
- Fallback if output is too large for the host: coarser quantisation, bigger chunks, or AIFS only beyond 240 h.
- Result: pending (size measured in plan step 7).

## D5 — Folder structure (clean, separated by responsibility)
- 2026-11-06 18:49 UTC. Decided by: **user** (requested the principles; AI proposed the exact layout in PLAN-002; user approved it).
- Chosen layout (root entries allowed: `README.md`, `.gitignore`, `pyproject.toml`, `requirements.txt`, `.env.example` only if a secret is ever needed, and these folders):
  - `config/` — ALL settings, no code: `pipeline.toml`, `backend.toml`, `frontend.json`, `validation_points.toml`.
  - `pipeline/` — data fetching and processing (Python): `fetch.py`, `process.py`, `grid.py`.
  - `backend/` — builds the static data API the frontend reads (`export.py`: frames, point tiles, `manifest.json`).
  - `frontend/` — Vite web app (`index.html`, `src/`, `package.json`, `vite.config.js`).
  - `tests/` — `pipeline/` and `backend/` (pytest), `frontend/` (`node --test`).
  - `scripts/` — thin command-line entry points only (`run_pipeline.py`, `validate_points.py`).
  - `docs/` — project records, `plans/`, `evidence/` (screenshots).
  - `.github/workflows/` — scheduled build and deploy (GitHub requires this path).
  - `data/` — IGNORED: `raw/`, `processed/`, `site/` (everything downloaded or generated).
- Why: each responsibility can be read, tested and replaced on its own; the root stays tidy; nothing generated can reach git; settings can be changed without touching code (Python reads TOML with the standard-library `tomllib`).
- "Backend" meaning: because of D2 there is no live server. `backend/` is the part that publishes the static data API (tiles + manifest). A literal running server would reverse D2 and needs a new decision.
- Folders are created with their first real file (git cannot hold empty folders; placeholder files would be stray files).
- Alternatives considered: one `src/` package with sub-packages (less visible separation); export inside `pipeline/` (mixes processing with publishing, which was PLAN-001's shape).
- Honest limit: the first commit `ccb24df` predates this decision; it holds only `.gitignore` and `docs/`, which already match the layout. History is not rewritten.
- Any later change to this structure is raised with the user first and recorded here.
- Checkable bet: the root check (`git ls-files | cut -d/ -f1 | sort -u`) shows only allowed entries at every commit. Result: pending.

## D6 — Python version: 3.11 (not 3.10)
- 2026-11-06 ~18:52 UTC. Decided by: **user** (message: "use the Python 3.11 as the 3.10 has broken files"; matches the AI's workaround for E001).
- Chosen: all Python work uses Python 3.11.9 (`py -3.11`) in a virtual environment `.venv/`. `pyproject.toml` will state `requires-python = ">=3.11"` (plan step 2). Python 3.11 also provides `tomllib` for the config files (D5).
- Alternative: repair the Python 3.10 install. Rejected by the user; the broken `pip` there is not touched (see E001).
- Checkable bet: step 2 installs all pinned packages into the 3.11 venv without errors. Result: pending.

## D7 — Dependency pinning: exact versions, no hashes (shortcut)
- 2026-11-06 ~19:00 UTC. Decided by: **AI** (follows the CLAUDE.md rule "pin versions"; the user asked for a proper history of the libraries in `requirements.txt`).
- Chosen: `requirements.txt` pins every installed package (4 direct + 19 transitive = 23) with `==`, with the direct ones listed first and a reason after each. The history of changes is kept by git (`git log -p requirements.txt`) and by `docs/SOURCES.md`.
- Shortcut: no `--hash` lines (`--require-hashes`). Reason: time budget; versions are pinned and checked by a fresh-venv rebuild, but a tampered package at the same version would not be caught. Noted in the header of `requirements.txt`; to be listed in the README known limitations.
- Alternatives: a separate `requirements.in` + lock file (needs another tool and another root file); `pyproject.toml` dependencies (would duplicate the pins).
- Note: `numpy` 2.5.4 is the newest release but needs Python >= 3.12, so pip chose 2.4.6 on Python 3.11 (D6).
- Checkable bet: a fresh venv built from `requirements.txt` equals the working one. Result: **held** on 2026-11-06 ~19:00 UTC (both lists identical, 23 packages).
