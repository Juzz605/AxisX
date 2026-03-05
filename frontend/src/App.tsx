import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Simulation from './pages/Simulation';
import Analytics from './pages/Analytics';
import {
  fetchHistory,
  fetchResults,
  getLiveWebsocketUrl,
  resetSimulation,
  simulate,
  startLiveSimulation,
  stopLiveSimulation
} from './services/api';
import type {
  ApiError,
  Archetype,
  CEODecision,
  CrisisReport,
  FinancialState,
  MarketCandle,
  MarketRegime,
  LiveTickEvent,
  ResultPoint,
  SimulationHistory,
  SimulationRequest,
  SimulationResponse
} from './types/types';

const INITIAL_FINANCIAL_STATE: FinancialState = {
  revenue: 14_000_000,
  cash: 6_800_000,
  burn_rate: 920_000,
  liquidity_months: 16.5
};

function inferOutcome(decision: CEODecision): { outcome_success: boolean; liquidity_delta: number } {
  if (decision.strategy === 'Aggressive Expansion') {
    return { outcome_success: decision.strategy_index > 0.28, liquidity_delta: -0.4 };
  }
  if (decision.strategy === 'Defensive Cost Control') {
    return { outcome_success: decision.strategy_index > -0.35, liquidity_delta: 0.6 };
  }
  return { outcome_success: decision.strategy_index > -0.1, liquidity_delta: 0.15 };
}

function updateFinancialState(current: FinancialState, decision: CEODecision): FinancialState {
  const strategyShift = Math.max(-0.2, Math.min(0.2, decision.strategy_index));
  const revenue = Math.max(1, current.revenue * (1 + strategyShift * 0.08));
  const burnRate = Math.max(1000, current.burn_rate * (1 + decision.risk_level * 0.06 - strategyShift * 0.04));
  const cash = Math.max(0, current.cash - burnRate * 0.2 + revenue * 0.06);
  const monthlyBurn = Math.max(1, burnRate / 3);
  const liquidityMonths = cash / monthlyBurn;

  return {
    revenue: Math.round(revenue),
    burn_rate: Math.round(burnRate),
    cash: Math.round(cash),
    liquidity_months: Number(liquidityMonths.toFixed(2))
  };
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedArchetype, setSelectedArchetype] = useState<Archetype>('VisionaryInnovator');
  const [loading, setLoading] = useState(false);
  const [liveRunning, setLiveRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [financialState, setFinancialState] = useState<FinancialState>(INITIAL_FINANCIAL_STATE);
  const [visionaryDecision, setVisionaryDecision] = useState<CEODecision | null>(null);
  const [conservativeDecision, setConservativeDecision] = useState<CEODecision | null>(null);
  const [visionaryCrisis, setVisionaryCrisis] = useState<CrisisReport | null>(null);
  const [conservativeCrisis, setConservativeCrisis] = useState<CrisisReport | null>(null);
  const [timeline, setTimeline] = useState<ResultPoint[]>([]);
  const [history, setHistory] = useState<SimulationHistory[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [marketCandles, setMarketCandles] = useState<MarketCandle[]>([]);

  const liveSessionIdsRef = useRef<{ visionary?: string; conservative?: string }>({});
  const liveSocketsRef = useRef<WebSocket[]>([]);

  const appendLogs = useCallback((entries: string[]) => {
    if (entries.length === 0) return;
    setAgentLogs((current) => [...current, ...entries].slice(-220));
  }, []);

  const deriveRegime = useCallback((severity: number): MarketRegime => {
    if (severity < 0.25) return 'Expansion';
    if (severity < 0.45) return 'Stable';
    if (severity < 0.7) return 'Stress';
    return 'Crisis';
  }, []);

  const updateMarketCandle = useCallback(
    (tick: LiveTickEvent) => {
      if (!tick.crisis || !tick.decision) {
        return;
      }
      const crisis = tick.crisis;
      const decision = tick.decision;

      setMarketCandles((current) => {
        const previousClose = current.length > 0 ? current[current.length - 1].close : 1000;
        const shockPressure =
          crisis.demand_drop * 0.8 +
          crisis.interest_rate_spike * 1.35 +
          crisis.liquidity_risk * 0.65 -
          crisis.consumer_confidence * 0.55;
        const strategicDrift = decision.strategy_index * 0.045;
        const delta = Math.max(-0.09, Math.min(0.09, strategicDrift - shockPressure * 0.02));

        const open = previousClose;
        const close = Math.max(50, open * (1 + delta));
        const volatility = Math.max(0.0025, crisis.severity_index * 0.018);
        const high = Math.max(open, close) * (1 + volatility);
        const low = Math.min(open, close) * (1 - volatility);
        const volume = Math.round(400_000 + crisis.severity_index * 700_000 + Math.abs(delta) * 1_200_000);

        const candle: MarketCandle = {
          timestamp: tick.timestamp,
          label: `Q${tick.quarter}`,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume,
          regime: deriveRegime(crisis.severity_index)
        };

        return [...current, candle].slice(-140);
      });
    },
    [deriveRegime]
  );

  const hydrateBackendData = useCallback(async () => {
    try {
      const [resultRows, historyRows] = await Promise.all([fetchResults(), fetchHistory()]);

      const normalizedPoints: ResultPoint[] = resultRows.map((result, index) => ({
        timestamp: new Date(Date.now() + index * 60000).toISOString(),
        archetype: result.ceo_decision.updated_traits.name as Archetype,
        strategy_index: result.ceo_decision.strategy_index,
        liquidity_months: financialState.liquidity_months,
        burn_rate: financialState.burn_rate,
        traits: result.ceo_decision.updated_traits
      }));

      setTimeline((current) => (current.length > 0 ? current : normalizedPoints));
      setHistory(historyRows);
    } catch (apiError) {
      const err = apiError as ApiError;
      if (err.status === 404) {
        return;
      }
      setError(err.message || 'Failed to load historical backend data');
    }
  }, [financialState.burn_rate, financialState.liquidity_months]);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const baseSeed = Date.now() % 100000;

      const visionaryReq: SimulationRequest = {
        archetype: 'VisionaryInnovator',
        financial_state: financialState,
        seed: baseSeed
      };

      const conservativeReq: SimulationRequest = {
        archetype: 'ConservativeStabilizer',
        financial_state: financialState,
        seed: baseSeed + 1
      };

      const [visionaryRes, conservativeRes]: [SimulationResponse, SimulationResponse] = await Promise.all([
        simulate(visionaryReq),
        simulate(conservativeReq)
      ]);

      const visionaryOutcome = inferOutcome(visionaryRes.ceo_decision);
      const conservativeOutcome = inferOutcome(conservativeRes.ceo_decision);

      await Promise.all([
        simulate({ ...visionaryReq, ...visionaryOutcome }),
        simulate({ ...conservativeReq, ...conservativeOutcome })
      ]);

      setVisionaryDecision(visionaryRes.ceo_decision);
      setConservativeDecision(conservativeRes.ceo_decision);
      setVisionaryCrisis(visionaryRes.crisis_report);
      setConservativeCrisis(conservativeRes.crisis_report);
      appendLogs([
        `[Crisis Intelligence Agent] shock synthesized: severity=${visionaryRes.crisis_report.severity_index.toFixed(3)}.`,
        `[CEO Archetype Agent] visionary strategy=${visionaryRes.ceo_decision.strategy}, index=${visionaryRes.ceo_decision.strategy_index.toFixed(3)}.`,
        `[CEO Archetype Agent] conservative strategy=${conservativeRes.ceo_decision.strategy}, index=${conservativeRes.ceo_decision.strategy_index.toFixed(3)}.`,
        `[Market Sentiment Agent] adjustment=${visionaryRes.ceo_decision.support_signals?.market_sentiment.adjustment?.toFixed(3) ?? 'n/a'}.`,
        `[Operations Efficiency Agent] adjustment=${visionaryRes.ceo_decision.support_signals?.operations.adjustment?.toFixed(3) ?? 'n/a'}.`,
        `[Treasury Liquidity Agent] adjustment=${visionaryRes.ceo_decision.support_signals?.treasury.adjustment?.toFixed(3) ?? 'n/a'}.`
      ]);

      const referenceDecision = selectedArchetype === 'VisionaryInnovator' ? visionaryRes.ceo_decision : conservativeRes.ceo_decision;
      setFinancialState((current) => updateFinancialState(current, referenceDecision));

      setTimeline((current) => [
        ...current,
        {
          timestamp: new Date().toISOString(),
          archetype: 'VisionaryInnovator',
          strategy_index: visionaryRes.ceo_decision.strategy_index,
          liquidity_months: financialState.liquidity_months,
          burn_rate: financialState.burn_rate,
          traits: visionaryRes.ceo_decision.updated_traits
        },
        {
          timestamp: new Date().toISOString(),
          archetype: 'ConservativeStabilizer',
          strategy_index: conservativeRes.ceo_decision.strategy_index,
          liquidity_months: financialState.liquidity_months,
          burn_rate: financialState.burn_rate,
          traits: conservativeRes.ceo_decision.updated_traits
        }
      ]);

      await hydrateBackendData();
      navigate('/simulation');
    } catch (apiError) {
      const err = apiError as ApiError;
      setError(err.message || 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  }, [appendLogs, financialState, hydrateBackendData, navigate, selectedArchetype]);

  const closeLiveSockets = useCallback(() => {
    for (const socket of liveSocketsRef.current) {
      try {
        socket.close();
      } catch {
        // no-op
      }
    }
    liveSocketsRef.current = [];
  }, []);

  const stopLive = useCallback(async () => {
    setLiveRunning(false);
    closeLiveSockets();

    const { visionary, conservative } = liveSessionIdsRef.current;
    liveSessionIdsRef.current = {};

    const stops: Promise<void>[] = [];
    if (visionary) stops.push(stopLiveSimulation(visionary));
    if (conservative) stops.push(stopLiveSimulation(conservative));

    if (stops.length > 0) {
      await Promise.allSettled(stops);
    }
  }, [closeLiveSockets]);

  const wireLiveSocket = useCallback(
    (sessionId: string, archetype: Archetype) => {
      const socket = new WebSocket(getLiveWebsocketUrl(sessionId));

      socket.onmessage = (event: MessageEvent<string>) => {
        const payload = JSON.parse(event.data) as LiveTickEvent;
        if (payload.event === 'error') {
          setError(payload.message ?? 'Live simulation stream error.');
          return;
        }

        if (payload.agent_logs) {
          appendLogs(payload.agent_logs);
        }

        if (payload.event === 'tick' && payload.decision && payload.financial_state) {
          updateMarketCandle(payload);
          const decision = payload.decision;
          const nextFinancial = payload.financial_state;
          const crisis = payload.crisis;

          if (archetype === 'VisionaryInnovator') {
            setVisionaryDecision(decision);
            if (crisis) setVisionaryCrisis(crisis);
          } else {
            setConservativeDecision(decision);
            if (crisis) setConservativeCrisis(crisis);
          }

          setTimeline((current) => [
            ...current,
            {
              timestamp: payload.timestamp,
              archetype,
              strategy_index: decision.strategy_index,
              liquidity_months: nextFinancial.liquidity_months,
              burn_rate: nextFinancial.burn_rate,
              traits: decision.updated_traits
            }
          ]);

          if (archetype === selectedArchetype) {
            setFinancialState(nextFinancial);
          }
        }

        if (payload.event === 'complete') {
          appendLogs([`[Live Engine] ${archetype} session completed at quarter ${payload.quarter}.`]);
        }
      };

      socket.onopen = () => {
        appendLogs([`[Live Engine] ${archetype} websocket connected.`]);
      };

      socket.onerror = () => {
        setError(`Live websocket error for ${archetype}.`);
      };

      liveSocketsRef.current.push(socket);
    },
    [appendLogs, selectedArchetype, updateMarketCandle]
  );

  const startLive = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      await stopLive();

      const baseSeed = Date.now() % 1_000_000;
      const [visionary, conservative] = await Promise.all([
        startLiveSimulation({
          archetype: 'VisionaryInnovator',
          financial_state: financialState,
          tick_seconds: 1.25,
          max_quarters: 40,
          seed: baseSeed
        }),
        startLiveSimulation({
          archetype: 'ConservativeStabilizer',
          financial_state: financialState,
          tick_seconds: 1.25,
          max_quarters: 40,
          seed: baseSeed + 7
        })
      ]);

      liveSessionIdsRef.current = {
        visionary: visionary.session_id,
        conservative: conservative.session_id
      };

      setLiveRunning(true);
      appendLogs([
        `[Live Engine] Started Visionary session=${visionary.session_id}`,
        `[Live Engine] Started Conservative session=${conservative.session_id}`
      ]);

      wireLiveSocket(visionary.session_id, 'VisionaryInnovator');
      wireLiveSocket(conservative.session_id, 'ConservativeStabilizer');
      navigate('/simulation');
    } catch (apiError) {
      const err = apiError as ApiError;
      setError(err.message || 'Failed to start live simulation.');
      setLiveRunning(false);
    } finally {
      setLoading(false);
    }
  }, [appendLogs, financialState, navigate, stopLive, wireLiveSocket]);

  const handleReset = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await stopLive();
      await resetSimulation();
      setVisionaryDecision(null);
      setConservativeDecision(null);
      setVisionaryCrisis(null);
      setConservativeCrisis(null);
      setTimeline([]);
      setHistory([]);
      setAgentLogs([]);
      setMarketCandles([]);
      setFinancialState(INITIAL_FINANCIAL_STATE);
      navigate('/');
    } catch (apiError) {
      const err = apiError as ApiError;
      setError(err.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  }, [navigate, stopLive]);

  const analyticsPoints = useMemo(() => {
    if (timeline.length > 0) {
      return timeline;
    }

    return history.map((record) => ({
      timestamp: record.timestamp,
      archetype: record.profile_name as Archetype,
      strategy_index: record.strategy_index,
      liquidity_months: Math.max(0.1, financialState.liquidity_months + record.liquidity_delta),
      burn_rate: financialState.burn_rate,
      traits: record.post_traits
    }));
  }, [financialState.burn_rate, financialState.liquidity_months, history, timeline]);

  useEffect(() => {
    void hydrateBackendData();
  }, [hydrateBackendData]);

  useEffect(() => {
    return () => {
      closeLiveSockets();
    };
  }, [closeLiveSockets]);

  return (
    <div className="min-h-screen bg-bg text-textMain">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-4 flex min-h-8 items-center justify-between">
          {loading ? <LoadingSpinner /> : <span className="text-xs uppercase tracking-[0.14em] text-textSub">Ready</span>}
          <span className="text-xs uppercase tracking-[0.14em] text-textSub">{location.pathname}</span>
        </div>

        {error ? (
          <div className="mb-5 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        ) : null}

        <div className="animate-[fadeIn_180ms_ease-out] transition-opacity duration-200 ease-executive">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  selectedArchetype={selectedArchetype}
                  financialState={financialState}
                  loading={loading}
                  onArchetypeChange={setSelectedArchetype}
                  onSimulate={runSimulation}
                  onReset={handleReset}
                />
              }
            />
            <Route
              path="/simulation"
              element={
                <Simulation
                  visionaryDecision={visionaryDecision}
                  conservativeDecision={conservativeDecision}
                  visionaryCrisis={visionaryCrisis}
                  conservativeCrisis={conservativeCrisis}
                  liveRunning={liveRunning}
                  agentLogs={agentLogs}
                  onStartLive={startLive}
                  onStopLive={stopLive}
                  marketCandles={marketCandles}
                />
              }
            />
            <Route path="/analytics" element={<Analytics points={analyticsPoints} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
