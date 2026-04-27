# 6thSense backend

FastAPI service for `/health` and the lead-capture endpoint backing the hero-finale form.

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r ../requirements-backend-dev.txt
```

Bring up Postgres (any local instance works):

```bash
docker run --rm -d --name 6th-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres alembic upgrade head
```

Run the API:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres \
SENSEPROBE_CORS_ORIGINS=http://localhost:5173 \
uvicorn app.main:app --reload --port 8000
```

- `GET /health` → `{"status":"ok"}`
- `POST /api/leads` → see `app/schemas/lead.py`

## Tests

```bash
cd backend && pytest -v
```

Tests use [testcontainers-python](https://testcontainers-python.readthedocs.io/) which boots an ephemeral Postgres in Docker. The Docker daemon must be running.

## Environment

| name | required | purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. SQLAlchemy async (`postgresql+asyncpg://`) is preferred but plain `postgresql://` and `postgres://` are normalised. |
| `SENSEPROBE_CORS_ORIGINS` | no | Comma-separated allowed origins. Default covers local Vite (5173/4173). |
| `SENSEPROBE_RATE_LIMIT` | no | slowapi limit applied to `POST /api/leads`. Default `5/minute`. |
| `PORT` | no | Auto-injected by Railway in production. |

## Deploy (Railway)

This service is deployed as a new service in the same Railway project that already hosts the frontend and Postgres.

1. Add a new service from this repo. **Leave the Root Directory at the repository root** (do NOT set it to `backend/`). Railway reads `backend/railway.toml` automatically and that file points at `backend/Dockerfile` with the repo root as build context.
2. Set service variables:
   - `DATABASE_URL` → reference variable `${{Postgres.DATABASE_URL}}`
   - `SENSEPROBE_CORS_ORIGINS` → `https://<frontend-domain>,http://localhost:5173,http://127.0.0.1:5173`
   - `SENSEPROBE_RATE_LIMIT` → `5/minute` (optional)
3. Deploy. The container runs `alembic upgrade head` before starting uvicorn, so the schema migrates on first deploy.
4. Note the public Railway domain assigned to the backend.
5. On the **frontend** service, set `VITE_API_URL` to that public domain and redeploy.

The backend reaches Postgres over Railway's private network (`postgres.railway.internal`); Postgres has no public IP.
