# syntax=docker/dockerfile:1

# FastAPI service for the AI Mathematics Tutor.
# Build context: backend/

FROM python:3.12-slim

# The uv binary for fast, reproducible installs.
COPY --from=ghcr.io/astral-sh/uv:0.11.32 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Install locked dependencies without the project first (better layer caching).
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy the source and install the project itself.
COPY . .
RUN uv sync --frozen --no-dev --no-editable

ENV PATH="/app/.venv/bin:$PATH"

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 app
USER app

EXPOSE 8000

# Railway and similar hosts inject PORT; default to 8000 locally.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
