# PLAN-005 — Security fixes first, then the rest of PLAN-004

- Drafted: 2026-11-06 ~20:43 UTC, after the audit in `docs/SECURITY.md` (written 20:41 UTC)
- Session: `3e56a452-e5f8-4bb9-b353-63bad43748f4`; first prompt 2026-11-06T18:19:13Z; deadline 2026-11-09T18:19:13Z
- Approval: **approved by the user (the owner) in chat, 2026-11-06 ~20:51 UTC** ("yes for plan 5, so the S4 and S5, the S5 is fine it can have my email"). It was written as a draft first, at the user's request, and the plan text below is unchanged; only this line was filled in. The AI reads the message as: plan approved, the S4 dependency scan approved, S5 = keep the e-mail as is. The S4 hash choice was not answered and is asked again at S4.
- **Replaces: PLAN-004** (approved 2026-11-06 ~20:13 UTC). Steps 1, 1b, 2, 3, 3b and 4 are done and carried over as done.

## Why PLAN-004 is replaced
- **What was wrong:** PLAN-001 to PLAN-004 contained no security review, no security steps and no security note (`docs/ERRORS.md` E013). The audit also found a vetting gap for `requests` (E014).
- **Evidence:** `docs/SECURITY.md`: nine findings (S01-S09), no Critical or High. The ones that change code or setup: no network timeouts (S01), unvetted/unscanned dependencies and no hashes (S02), untrusted files parsed in a root container with network and write access (S03), a public status record that could leak internals (S04), missing secret patterns and no secret scan (S05), personal data that becomes public on push (S06).
- **What changes:** five security steps (S1-S5) are inserted before step 5. Steps 5-12 of PLAN-004 stay as written there (goal, layout, Docker design, localhost design, decisions D1-D14, assumptions, time targets), with the security notes listed below added to each. From now on every plan carries a "Security note" (decision D15).

## Goal, layout, Docker design, localhost design (unchanged from PLAN-004)
See `docs/plans/PLAN-004.md`. One layout change is proposed here and needs the same approval: none (S3 edits `docker/compose.yaml` and `docker/Dockerfile`, which already exist; S1 adds a test folder `tests/hygiene/`, inside the existing `tests/`).

## Security note (this plan)
Everything here reduces risk and sends nothing outside the machine, except **S4's vulnerability scan, which sends the list of package names and versions to a public service and therefore asks for approval first.** Secrets: none are used; the three token-like variables in the user's shell must never be printed or passed to containers (S07).

## Steps (one at a time; commit after each; Docker tests, line counts and root check before every commit)

S1. **Repo hygiene (S05).** Add `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `credentials*`, `*.token` to `.gitignore`. New `tests/hygiene/test_no_secrets.py`: scans the project's text files (excluding `.venv`, `.git`, `data`, `node_modules`, `dist`) for key formats (AWS, GitHub, Hugging Face `hf_`, OpenAI-style `sk-`, Slack, Google, private-key blocks, JWT) and fails on a match; the key formats live in `config/security.toml`, not in the code. A second test proves the scanner works by finding a fake key planted in a temp folder.
   DONE-CHECK: `git check-ignore -v site.pem id_rsa credentials.json` match; the Docker test command passes and includes the new tests; the planted-key test fails when the scanner is disabled (checked once by hand).

S2. **Network timeouts (S01).** A `requests.Session` subclass in `pipeline/fetch.py` adds a connect and a read timeout to every call; the client's `session` is replaced by it for both searches and downloads. Values in `config/pipeline.toml` (`connect_timeout_seconds`, `read_timeout_seconds`).
   DONE-CHECK: a test with a local server that accepts a connection and never answers raises a timeout error within the configured time (seconds measured and printed); the Docker tests pass; one real `python -m pipeline.fetch` run still succeeds (files reused), so normal downloads are not cut off.

S3. **Docker hardening (S03, S08).** `Dockerfile`: create a non-root user. `compose.yaml`: run both services as that user, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, `read_only: true` with a tmpfs for `/tmp`. Split the `run` service into `fetch` (network on, writes `data/raw`) and `process` (**network off**, writes `data/processed`). README commands updated; base-image digest note added to the README.
   DONE-CHECK: `id` inside each container is not 0; writing outside `data/` fails; `process` on the real 12z run gives the same three sha256 values as before; `fetch` finds the existing run; inside `process` a connection attempt fails; the Docker tests pass.

S4. **Dependency vetting and scan (S02, E014).** (a) Vet `requests` on the PyPI JSON API and its GitHub source and record it in `docs/SOURCES.md`. (b) **Ask first:** install `pip-audit` (PyPA tool; vetted before install) in a throwaway container and scan `requirements.txt`; this sends package names and versions to a public vulnerability service. Record the result in `docs/SECURITY.md`. (c) Decision for the user, options with a recommendation: hashes for the Linux/Docker package set only (recommended: that is where the scheduled job runs), hashes for both platforms, or keep D7 as a documented shortcut.
   DONE-CHECK: SOURCES.md has the `requests` entry; the scan output is pasted into SECURITY.md (or "not approved" is recorded); if hashes are chosen, a fresh Docker build with `--require-hashes` succeeds and `pip check` is clean.

S5. **Identity and privacy decision (S06).** No code unless the user chooses. Options with a recommendation: keep as is; GitHub "noreply" e-mail for new commits (recommended minimum); noreply plus rewriting the 14 local commits before the first push (every commit hash quoted in the docs then has to be updated, so the docs say "see `git log`" instead). Also decide whether the machine name and local paths stay in `docs/ENVIRONMENT.md` and `docs/PROGRESS.md`.
   DONE-CHECK: the decision is recorded in `docs/DECISIONS.md`; if a change is chosen, `git log --format=%ae | sort -u` shows only the chosen address and the docs search for the old address and machine name is empty or intentionally kept.

Steps 5-12 as in PLAN-004, each with a security note added:
5. **Independent validation.** Reads only the raw GRIB; runs in the `process` container (no network). Points are in config.
6. **Front-end spike + decision gate + localhost.** Library and basemap are vetted before use (registry page, maintainers, version, licence); prefer a self-hosted basemap and a bundled city list so visitors' IP, viewport and typed places are not sent to third parties; npm: exact versions, lockfile, `npm ci`, install scripts off where possible, `npm audit` only with approval; Vite dev server stays on localhost; the nginx image is pinned by digest, runs non-root, read-only.
7. **Static data export.** Manifest and tiles are validated in tests (schema, sizes, bounds); no pickle; the status record publishes only an error category and time, never raw error text (S04, needs the user's confirmation).
8. **Location panel.** Validate and clamp latitude/longitude from geolocation, search and the URL; bounds-check every tile index; place names written with `textContent`; the page states that the location stays in the browser.
9. **Map / globe views.** No third-party scripts; if any CDN file is ever used it is pinned with a subresource-integrity hash.
10. **Provenance + honesty UI.** A Content-Security-Policy is defined and tested (no inline scripts); privacy note; the age warning stays plain-language (D9).
11. **Hosting gate + deploy.** The hosting comparison adds: HTTPS only, ability to set security headers (or a CSP `<meta>` fallback), repo secret scanning/push protection availability. The workflow: least-privilege `permissions:`, third-party actions pinned to a commit and vetted, no `pull_request_target`, `timeout-minutes` on every job, no secrets, no environment dumps; the Docker test command (which includes the secret scan) runs before deploy.
12. **README + submission.** `docs/SUBMISSION.md` and the checklist in `docs/PROGRESS.md` include the security check: re-run the secret scan over the repo, history and session log; the dependency scan; `curl -I` of the live URL for HTTPS and headers; the S06 decision applied; no token in any log.

## Time targets (elapsed hours)
Now ~h2.5. S1-S5 by ~h5 (S4 and S5 wait for your answers) · steps 5 by ~h6 · steps 6-10 by ~h50 · step 11 by ~h58 · h64-72 reserved (no new features after h64). Warnings at 24/48/60 h.

## Verification (end to end)
All of PLAN-004's verification, plus: the Docker test command includes the secret scan and passes; `docs/SECURITY.md` has every finding marked fixed, accepted (with the reason) or still open; the live URL answers over HTTPS with the agreed headers.
