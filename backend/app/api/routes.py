"""FastAPI routes for AxisX core intelligence engine."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect

from app.core.config import CONFIG
from app.intelligence.memory_engine import ExecutiveMemoryEngine
from app.intelligence.orchestrator import AxisXIntelligenceOrchestrator
from app.intelligence.schemas import (
    LiveSimulationStartRequest,
    LiveSimulationStartResponse,
    MemoryRecord,
    ProductTelemetryIngestRequest,
    ProductTelemetryRecord,
    SimulationResponse,
    SimulationRequest,
    TimelineSimulationRequest,
    TimelineSimulationResponse,
)
from app.intelligence.timeline_store import TimelineStoreProtocol
from app.intelligence.product_telemetry_store import ProductTelemetryStoreProtocol
from app.services.dependencies import (
    get_live_simulation_manager,
    get_memory_engine,
    get_orchestrator,
    get_product_telemetry_store,
    get_timeline_store,
)
from app.services.live_simulation import LiveSimulationManager

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Service health probe."""

    storage = "mongodb" if CONFIG.mongodb_uri else ("postgresql" if CONFIG.database_url else "sqlite-memory")
    return {"status": "ok", "service": "axisx-intelligence-core", "storage": storage}


@router.post("/simulate", response_model=SimulationResponse)
def simulate(
    payload: SimulationRequest,
    orchestrator: AxisXIntelligenceOrchestrator = Depends(get_orchestrator),
) -> SimulationResponse:
    """Run a full single-quarter simulation cycle."""

    try:
        return orchestrator.simulate(
            archetype=payload.archetype,
            company_state=payload.company_state,
            seed=payload.seed,
            outcome_success=bool(payload.outcome_success) if payload.outcome_success is not None else False,
            liquidity_delta=payload.liquidity_delta if payload.liquidity_delta is not None else 0.0,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {exc}") from exc


@router.post("/simulate/timeline", response_model=TimelineSimulationResponse)
def simulate_timeline(
    payload: TimelineSimulationRequest,
    orchestrator: AxisXIntelligenceOrchestrator = Depends(get_orchestrator),
) -> TimelineSimulationResponse:
    """Run a configurable multi-quarter simulation timeline."""

    try:
        return orchestrator.simulate_timeline(
            archetype=payload.archetype,
            company_state=payload.company_state,
            quarters=payload.quarters,
            seed=payload.seed,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Timeline simulation failed: {exc}") from exc


@router.post("/simulate/live/start", response_model=LiveSimulationStartResponse)
async def start_live_simulation(
    payload: LiveSimulationStartRequest,
    manager: LiveSimulationManager = Depends(get_live_simulation_manager),
) -> LiveSimulationStartResponse:
    """Start a continuous industrial manufacturing simulation session."""

    session_id = await manager.start_session(
        archetype=payload.archetype,
        company_state=payload.company_state,
        tick_seconds=payload.tick_seconds,
        max_quarters=payload.max_quarters,
        seed=payload.seed,
    )
    return LiveSimulationStartResponse(
        session_id=session_id,
        archetype=payload.archetype,
        tick_seconds=payload.tick_seconds,
        max_quarters=payload.max_quarters,
    )


@router.post("/simulate/live/stop/{session_id}")
async def stop_live_simulation(
    session_id: str,
    manager: LiveSimulationManager = Depends(get_live_simulation_manager),
) -> dict[str, str]:
    """Stop a live simulation session."""

    stopped = await manager.stop_session(session_id)
    if not stopped:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "stopped", "session_id": session_id}


@router.websocket("/ws/simulate/live/{session_id}")
async def stream_live_simulation(
    websocket: WebSocket,
    session_id: str,
    manager: LiveSimulationManager = Depends(get_live_simulation_manager),
) -> None:
    """Stream live simulation ticks and agent logs via websocket."""

    await websocket.accept()
    queue = await manager.subscribe(session_id)
    if queue is None:
        await websocket.send_json({"event": "error", "message": "Session not found", "session_id": session_id})
        await websocket.close(code=1008)
        return

    try:
        while True:
            payload = await queue.get()
            await websocket.send_json(payload)
            if payload.get("event") == "complete":
                break
    except WebSocketDisconnect:
        pass
    finally:
        await manager.unsubscribe(session_id, queue)


@router.get("/results", response_model=list[SimulationResponse])
def results(timeline_store: TimelineStoreProtocol = Depends(get_timeline_store)) -> list[SimulationResponse]:
    """Return latest simulated quarter results grouped as simple response records."""

    rows = timeline_store.list_recent(limit=100)

    output: list[SimulationResponse] = []
    for row in rows:
        output.append(
            SimulationResponse.model_validate(
                {
                    "crisis_report": row.crisis.model_dump(),
                    "ceo_decision": row.decision.model_dump(),
                }
            )
        )
    return output


@router.get("/history", response_model=list[MemoryRecord])
def history(memory_engine: ExecutiveMemoryEngine = Depends(get_memory_engine)) -> list[MemoryRecord]:
    """Return accumulated adaptive memory records."""

    return memory_engine.records


@router.post("/products/telemetry")
def ingest_product_telemetry(
    payload: ProductTelemetryIngestRequest,
    telemetry_store: ProductTelemetryStoreProtocol = Depends(get_product_telemetry_store),
) -> dict[str, int]:
    """Persist per-product sales and revenue records for pattern learning."""

    timestamp = payload.timestamp or datetime.utcnow()
    records = [
        ProductTelemetryRecord(
            timestamp=timestamp,
            quarter=payload.quarter,
            archetype=payload.archetype,
            product=point.product,
            monthly_units_sold=point.monthly_units_sold,
            yearly_units_sold=point.yearly_units_sold,
            inventory_utilization=point.inventory_utilization,
            revenue=point.revenue,
            unit_price=point.unit_price,
            top_color=point.top_color,
            reason=point.reason,
        )
        for point in payload.points
    ]
    telemetry_store.save_many(records)
    return {"saved": len(records)}


@router.get("/products/telemetry", response_model=list[ProductTelemetryRecord])
def get_product_telemetry(
    limit: int = 240,
    telemetry_store: ProductTelemetryStoreProtocol = Depends(get_product_telemetry_store),
) -> list[ProductTelemetryRecord]:
    """Return latest product telemetry records."""

    return telemetry_store.list_recent(limit=limit)


@router.post("/reset")
def reset(
    memory_engine: ExecutiveMemoryEngine = Depends(get_memory_engine),
    timeline_store: TimelineStoreProtocol = Depends(get_timeline_store),
    telemetry_store: ProductTelemetryStoreProtocol = Depends(get_product_telemetry_store),
) -> dict[str, str]:
    """Reset all simulation memory and timeline records."""

    memory_engine.clear()
    timeline_store.clear()
    telemetry_store.clear()
    return {"status": "reset_complete"}
