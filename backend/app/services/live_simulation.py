"""Live synthetic market simulation session manager with websocket broadcasting."""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

import numpy as np

from app.intelligence.orchestrator import AxisXIntelligenceOrchestrator
from app.intelligence.schemas import CEOProfile, CompanyState, QuarterTimelinePoint

logger = logging.getLogger(__name__)


@dataclass
class LiveSession:
    """Runtime state for a live simulation session."""

    session_id: str
    archetype: str
    simulation_id: str
    profile: CEOProfile
    company_state: CompanyState
    tick_seconds: float
    max_quarters: int
    seed: int | None
    running: bool = True
    quarter: int = 0
    subscriber_queues: list[asyncio.Queue[dict]] = field(default_factory=list)
    task: asyncio.Task | None = None


class LiveSimulationManager:
    """Manages async synthetic market sessions and broadcast events."""

    def __init__(self, orchestrator: AxisXIntelligenceOrchestrator) -> None:
        self._orchestrator = orchestrator
        self._sessions: dict[str, LiveSession] = {}
        self._lock = asyncio.Lock()

    async def start_session(
        self,
        archetype: str,
        company_state: CompanyState,
        tick_seconds: float = 1.5,
        max_quarters: int = 30,
        seed: int | None = None,
    ) -> str:
        """Create and start a live simulation session."""

        session_id = str(uuid4())
        simulation_id = str(uuid4())
        profile = self._orchestrator.get_profile(archetype)

        session = LiveSession(
            session_id=session_id,
            archetype=archetype,
            simulation_id=simulation_id,
            profile=profile,
            company_state=company_state,
            tick_seconds=max(0.4, tick_seconds),
            max_quarters=max(1, max_quarters),
            seed=seed,
        )

        async with self._lock:
            self._sessions[session_id] = session
            session.task = asyncio.create_task(self._run_session(session), name=f"live-session-{session_id}")

        logger.info("[Live Engine] Started session=%s archetype=%s", session_id, archetype)
        return session_id

    async def stop_session(self, session_id: str) -> bool:
        """Stop an active session by id."""

        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return False
            session.running = False
            task = session.task

        if task is not None:
            await task
        logger.info("[Live Engine] Stopped session=%s", session_id)
        return True

    async def subscribe(self, session_id: str) -> asyncio.Queue[dict] | None:
        """Register subscriber queue for websocket pushes."""

        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=100)
            session.subscriber_queues.append(queue)
            return queue

    async def unsubscribe(self, session_id: str, queue: asyncio.Queue[dict]) -> None:
        """Remove websocket subscriber queue."""

        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return
            if queue in session.subscriber_queues:
                session.subscriber_queues.remove(queue)

    async def _broadcast(self, session: LiveSession, payload: dict) -> None:
        """Broadcast payload to all session subscribers."""

        for queue in list(session.subscriber_queues):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                logger.warning("[Live Engine] Dropping event for slow subscriber in session=%s", session.session_id)

    async def _run_session(self, session: LiveSession) -> None:
        """Background run loop producing live ticks."""

        rng = np.random.default_rng(session.seed)

        while session.running and session.quarter < session.max_quarters:
            session.quarter += 1
            step_seed = int(rng.integers(0, 2_147_483_647))

            point, updated_profile, updated_financial, agent_logs = self._orchestrator.simulate_live_step(
                archetype=session.archetype,
                simulation_id=session.simulation_id,
                quarter=session.quarter,
                profile=session.profile,
                company_state=session.company_state,
                seed=step_seed,
            )

            session.profile = updated_profile
            session.company_state = updated_financial

            payload = {
                "event": "tick",
                "session_id": session.session_id,
                "archetype": session.archetype,
                "quarter": point.quarter,
                "crisis": point.crisis.model_dump(),
                "decision": point.decision.model_dump(),
                "company_state": point.company_state.model_dump(),
                "financial_state": point.company_state.model_dump(),
                "agent_logs": agent_logs,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await self._broadcast(session, payload)

            await asyncio.sleep(session.tick_seconds)

        payload = {
            "event": "complete",
            "session_id": session.session_id,
            "archetype": session.archetype,
            "quarter": session.quarter,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._broadcast(session, payload)

        async with self._lock:
            self._sessions.pop(session.session_id, None)

        logger.info("[Live Engine] Session complete session=%s quarters=%d", session.session_id, session.quarter)
