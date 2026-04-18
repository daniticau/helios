# Helios backend — App Runner-ready container.
#
# Strategy:
#   - python:3.11-slim base (small, has a modern glibc for pandas/numpy wheels).
#   - `uv` for fast, reproducible dependency installs from the locked uv.lock.
#   - Dependencies copied + installed BEFORE the rest of the source so edits to
#     Python files don't bust the deps cache.
#   - Run as the non-root `helios` user.
#   - Listen on port 8080 — App Runner's default and what apprunner.yaml expects.
#
# Local build/run:
#   docker build -t helios-backend ./backend
#   docker run --rm -p 8080:8080 \
#     -e ORTHOGONAL_API_KEY=... -e ANTHROPIC_API_KEY=... \
#     helios-backend

FROM python:3.11-slim AS runtime

# Keep Python lean and predictable inside the container.
# uv installs the project's venv at /app/.venv — put it on PATH up front so
# `uvicorn` resolves without `uv run` at container start.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_COMPILE_BYTECODE=1 \
    PATH="/app/.venv/bin:${PATH}"

# Install uv (static binary, ~30MB). No apt packages needed: fastapi, pandas,
# numpy, scipy all ship wheels for linux/amd64 on Python 3.11.
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

# Non-root user for runtime. Create early so we can chown as we go.
RUN useradd --create-home --shell /bin/bash --uid 1000 helios

WORKDIR /app

# Install deps first (the big, slow layer). Copy only the files uv needs to
# resolve so we keep this layer cached across code changes.
COPY --chown=helios:helios pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy the rest of the backend source. Dockerignore filters out __pycache__,
# .venv, tests, and other dev cruft so the image stays slim.
COPY --chown=helios:helios . .

# Bake the ZenPower CSV (~12MB) into the image so the container is fully
# self-contained and boots instantly. Sanity-check it's present at build time.
RUN test -f /app/data/zenpower_permits.csv \
    && echo "ZenPower CSV size:" \
    && ls -lh /app/data/zenpower_permits.csv

USER helios

EXPOSE 8080

# App Runner hits this endpoint on /api/health per apprunner.yaml.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; \
sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/api/health', timeout=3).status==200 else 1)"

# Single worker: orchestrator.py uses asyncio.gather, one uvicorn worker
# handles concurrent requests fine and avoids duplicating the in-memory CSV.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
