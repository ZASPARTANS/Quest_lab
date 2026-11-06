# Test environment (decision D10). Linux image with the pinned Python packages only.
# Project code is NOT copied in: compose.yaml mounts it read-only at run time, so a rebuild is
# needed only when requirements.txt changes.
# Base image pinned by digest (python:3.11-slim as pulled on 2026-11-06, see docs/SOURCES.md).
FROM python:3.11-slim@sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /work
COPY requirements.txt /tmp/requirements.txt
RUN pip install --require-hashes -r /tmp/requirements.txt && pip check

# Run as a normal user, not root (finding S03): downloaded GRIB files are parsed by a C library.
# compose.yaml may override the numbers (APP_UID / APP_GID) so that files written to data/ belong to the host user.
RUN useradd --uid 10001 --user-group --no-create-home --shell /usr/sbin/nologin app
USER app
