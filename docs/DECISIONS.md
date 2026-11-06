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
