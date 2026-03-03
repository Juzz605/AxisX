# AxisX

Autonomous Multi-Archetype Executive Intelligence Engine.

## Quick Deploy (Render + Postgres)

1. Push this repo to GitHub.
2. In Render, create a new **Blueprint** and select this repo.
3. Render will read `render.yaml` and create:
   - `axisx-backend` (web)
   - `axisx-frontend` (static)
   - `axisx-postgres` (database)
4. After first deploy, update env vars:
   - Backend `CORS_ORIGINS`: include frontend domain
   - Frontend `VITE_API_BASE_URL`: backend domain + `/api/v1`
5. Open frontend URL and start live simulation.

## Local Run

Backend:
```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
# AxisX
# AxisX
