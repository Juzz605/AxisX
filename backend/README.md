# AxisX Core Intelligence Engine

## Run API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Run Example Simulation

```bash
cd backend
PYTHONPATH=. python3 scripts/example_run.py
```

## Endpoints

- `GET /api/v1/health`
- `POST /api/v1/simulate`
- `POST /api/v1/simulate/timeline`
- `POST /api/v1/simulate/live/start`
- `POST /api/v1/simulate/live/stop/{session_id}`
- `WS /api/v1/ws/simulate/live/{session_id}`
- `POST /api/v1/reset`
- `GET /api/v1/results`
- `GET /api/v1/history`
- `GET /api/v1/memory`

## Example API Call

```bash
curl -X POST http://localhost:8000/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "archetype": "VisionaryInnovator",
    "financial_state": {
      "revenue": 14000000,
      "cash": 6800000,
      "burn_rate": 920000,
      "liquidity_months": 16.5
    },
    "seed": 42,
    "outcome_success": false,
    "liquidity_delta": -0.8
  }'
```

## PostgreSQL Memory Persistence

- If `DATABASE_URL` is set, backend auto-uses PostgreSQL for memory + timeline.
- If `DATABASE_URL` is not set, backend falls back to local SQLite (`AXISX_DB_PATH`) for timeline and in-memory store for memory.

## Timeline Simulation

- Multi-quarter timeline runs are persisted in `simulation_timeline`.
- SQLite path defaults to `./axisx.db` and can be overridden with:
```bash
export AXISX_DB_PATH=/absolute/path/axisx.db
```

## Render Deployment

- Root-level `render.yaml` provisions:
1. `axisx-backend` (Python web service)
2. `axisx-frontend` (static site)
3. `axisx-postgres` (managed Postgres)

- Ensure these values are updated after first deploy:
1. Backend CORS origins to include your actual frontend URL.
2. Frontend `VITE_API_BASE_URL` to your actual backend URL.
