# 6thSense backend

Minimal **FastAPI** service for health checks and future APIs (e.g. waitlist). ML training lives in `ml/`, not here.

## Run locally

From repo root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r ../requirements-backend.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **GET** `http://127.0.0.1:8000/health` → `{"status":"ok"}`

## CORS

Comma-separated origins via **`SENSEPROBE_CORS_ORIGINS`** (defaults include Vite dev ports `5173` and `4173`).
