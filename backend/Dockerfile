# syntax=docker/dockerfile:1.6

FROM python:3.12-slim AS base
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements-backend.txt /tmp/requirements-backend.txt
RUN pip install -r /tmp/requirements-backend.txt

COPY backend/app /app/app
COPY backend/alembic.ini /app/alembic.ini
COPY backend/migrations /app/migrations

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
