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
  CompanyState,
  CrisisReport,
  MarketCandle,
  MarketInstrumentSnapshot,
  MarketLearningSignal,
  MarketRegime,
  LiveTickEvent,
  ResultPoint,
  SimulationHistory,
  SimulationRequest,
  SimulationResponse
} from './types/types';

const INITIAL_COMPANY_STATE: CompanyState = {
  product_demand: 0.63,
  production_cost: 0.44,
  supply_chain_risk: 0.36,
  competitor_pressure: 0.52,
  marketing_effectiveness: 0.58,
  customer_sentiment: 0.61,
  cash_reserves: 0.57
};

const INITIAL_MARKET_INSTRUMENTS: MarketInstrumentSnapshot[] = [
  { symbol: 'NIFTY 50', name: 'NSE Benchmark Index', price: 24765.9, change: 0, change_percent: 0, currency: 'INR' },
  { symbol: 'NIFTY BANK', name: 'Banking Sector Index', price: 59055.85, change: 0, change_percent: 0, currency: 'INR' },
  { symbol: 'SENSEX', name: 'BSE Benchmark Index', price: 80015.9, change: 0, change_percent: 0, currency: 'INR' },
  { symbol: 'NASDAQ', name: 'US Tech Composite', price: 18120.4, change: 0, change_percent: 0, currency: 'USD' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 195.22, change: 0, change_percent: 0, currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 418.3, change: 0, change_percent: 0, currency: 'USD' }
];

const INITIAL_CEO_CAPITAL = 50_000_000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeEma(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i += 1) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

function learnMarketPattern(candles: MarketCandle[]): MarketLearningSignal | null {
  if (candles.length < 8) return null;
  const closes = candles.map((c) => c.close);
  const fast = computeEma(closes.slice(-20), 6);
  const slow = computeEma(closes.slice(-40), 18);
  const momentum = closes[closes.length - 1] / closes[Math.max(0, closes.length - 6)] - 1;
  const volatility =
    candles
      .slice(-24)
      .reduce((acc, candle) => acc + Math.abs((candle.high - candle.low) / Math.max(candle.open, 1)), 0) /
    Math.min(24, candles.length);

  const trendScore = (fast - slow) / Math.max(slow, 1);
  const expectedMove = clamp(momentum * 0.58 + trendScore * 0.34 - volatility * 0.22, -0.04, 0.04);
  const predicted = closes[closes.length - 1] * (1 + expectedMove);
  const confidence = clamp(Math.abs(trendScore) * 22 + Math.abs(momentum) * 10 - volatility * 4, 0.12, 0.93);

  let trend: MarketLearningSignal['trend'] = 'Sideways';
  if (trendScore > 0.002) trend = 'Bullish';
  if (trendScore < -0.002) trend = 'Bearish';

  return {
    trend,
    predicted_price: Number(predicted.toFixed(2)),
    confidence: Number(confidence.toFixed(4)),
    volatility: Number(volatility.toFixed(4)),
    fast_ema: Number(fast.toFixed(2)),
    slow_ema: Number(slow.toFixed(2))
  };
}

function inferOutcome(decision: CEODecision): { outcome_success: boolean; liquidity_delta: number } {
  if (decision.strategy === 'enter_new_market' || decision.strategy === 'invest_in_r_and_d') {
    return { outcome_success: decision.strategy_index > 0.18, liquidity_delta: -0.09 };
  }
  if (decision.strategy === 'cut_production' || decision.strategy === 'hire_or_layoff_staff') {
    return { outcome_success: decision.strategy_index > -0.34, liquidity_delta: 0.06 };
  }
  return { outcome_success: decision.strategy_index > -0.12, liquidity_delta: 0.02 };
}

function updateCompanyState(current: CompanyState, decision: CEODecision): CompanyState {
  const m = decision.quarter_metrics;
  return {
    product_demand: Number(clamp(current.product_demand + m.customer_growth * 0.25, 0, 1).toFixed(4)),
    production_cost: Number(clamp(current.production_cost + (0.28 - m.profit_margin) * 0.2, 0, 1).toFixed(4)),
    supply_chain_risk: Number(clamp(current.supply_chain_risk - m.brand_strength * 0.05 + decision.risk_level * 0.03, 0, 1).toFixed(4)),
    competitor_pressure: Number(clamp(current.competitor_pressure - m.market_share * 0.07 + 0.015, 0, 1).toFixed(4)),
    marketing_effectiveness: Number(clamp(current.marketing_effectiveness + m.brand_strength * 0.04, 0, 1).toFixed(4)),
    customer_sentiment: Number(clamp(current.customer_sentiment + m.customer_growth * 0.16, 0, 1).toFixed(4)),
    cash_reserves: Number(clamp(m.company_cash_balance / 12_000_000, 0, 1).toFixed(4))
  };
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedArchetype, setSelectedArchetype] = useState<Archetype>('VisionaryInnovator');
  const [loading, setLoading] = useState(false);
  const [liveRunning, setLiveRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyState, setCompanyState] = useState<CompanyState>(INITIAL_COMPANY_STATE);
  const [visionaryDecision, setVisionaryDecision] = useState<CEODecision | null>(null);
  const [conservativeDecision, setConservativeDecision] = useState<CEODecision | null>(null);
  const [visionaryCrisis, setVisionaryCrisis] = useState<CrisisReport | null>(null);
  const [conservativeCrisis, setConservativeCrisis] = useState<CrisisReport | null>(null);
  const [timeline, setTimeline] = useState<ResultPoint[]>([]);
  const [history, setHistory] = useState<SimulationHistory[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [marketCandles, setMarketCandles] = useState<MarketCandle[]>([]);
  const [marketInstruments, setMarketInstruments] = useState<MarketInstrumentSnapshot[]>(INITIAL_MARKET_INSTRUMENTS);
  const [marketLearning, setMarketLearning] = useState<MarketLearningSignal | null>(null);
  const [visionaryCapital, setVisionaryCapital] = useState<number>(INITIAL_CEO_CAPITAL);
  const [conservativeCapital, setConservativeCapital] = useState<number>(INITIAL_CEO_CAPITAL);
  const [visionaryPnlPercent, setVisionaryPnlPercent] = useState<number>(0);
  const [conservativePnlPercent, setConservativePnlPercent] = useState<number>(0);

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
      let nextCandles: MarketCandle[] = [];

      setMarketCandles((current) => {
        const previousClose = current.length > 0 ? current[current.length - 1].close : 24765.9;
        const shockPressure =
          crisis.demand_drop_intensity * 0.78 +
          crisis.competitor_price_pressure * 0.68 +
          crisis.recession_pressure * 0.82 -
          (1 - crisis.supply_chain_disruption) * 0.42;
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

        nextCandles = [...current, candle].slice(-140);
        return nextCandles;
      });

      if (nextCandles.length > 0) {
        const learning = learnMarketPattern(nextCandles);
        setMarketLearning(learning);

        const movePercent = (nextCandles[nextCandles.length - 1].close - nextCandles[nextCandles.length - 1].open) /
          Math.max(nextCandles[nextCandles.length - 1].open, 1);

        setMarketInstruments((current) =>
          current.map((instrument, index) => {
            const beta = [1.0, 1.18, 0.95, 1.05, 1.45, 1.34][index] ?? 1.0;
            const noise = Math.sin(nextCandles.length + index * 13.2) * 0.0018;
            const stepReturn = movePercent * beta + noise;
            const nextPrice = instrument.price * (1 + stepReturn);
            const delta = nextPrice - instrument.price;
            return {
              ...instrument,
              price: Number(nextPrice.toFixed(2)),
              change: Number(delta.toFixed(2)),
              change_percent: Number((stepReturn * 100).toFixed(3))
            };
          })
        );
      }
    },
    [deriveRegime]
  );

  const hydrateBackendData = useCallback(async () => {
    try {
      const [resultRows, historyRows] = await Promise.all([fetchResults(), fetchHistory()]);

      const normalizedPoints: ResultPoint[] = resultRows.map((result, index) => ({
        timestamp: new Date(Date.now() + index * 60000).toISOString(),
        archetype:
          result.ceo_decision.updated_traits.name === 'VisionaryInnovator' ? 'VisionaryInnovator' : 'ConservativeStabilizer',
        strategy_index: result.ceo_decision.strategy_index,
        cash_reserves: result.ceo_decision.quarter_metrics.company_cash_balance / 12_000_000,
        production_cost: companyState.production_cost,
        product_demand: companyState.product_demand,
        market_share: result.ceo_decision.quarter_metrics.market_share,
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
  }, [companyState.product_demand, companyState.production_cost]);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const baseSeed = Date.now() % 100000;

      const visionaryReq: SimulationRequest = {
        archetype: 'VisionaryInnovator',
        company_state: companyState,
        seed: baseSeed
      };

      const conservativeReq: SimulationRequest = {
        archetype: 'ConservativeStabilizer',
        company_state: companyState,
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
      setVisionaryCapital((current) => {
        const realized = visionaryRes.ceo_decision.strategy_index * 0.015 - visionaryRes.ceo_decision.risk_level * 0.004;
        const next = current * (1 + realized);
        setVisionaryPnlPercent(((next - INITIAL_CEO_CAPITAL) / INITIAL_CEO_CAPITAL) * 100);
        return next;
      });
      setConservativeCapital((current) => {
        const realized = conservativeRes.ceo_decision.strategy_index * 0.012 - conservativeRes.ceo_decision.risk_level * 0.0025;
        const next = current * (1 + realized);
        setConservativePnlPercent(((next - INITIAL_CEO_CAPITAL) / INITIAL_CEO_CAPITAL) * 100);
        return next;
      });
      appendLogs([
        `[Crisis Monitoring Agent] shock synthesized: severity=${visionaryRes.crisis_report.severity_index.toFixed(3)}.`,
        `[CEO Archetype Agent] visionary strategy=${visionaryRes.ceo_decision.strategy}, index=${visionaryRes.ceo_decision.strategy_index.toFixed(3)}.`,
        `[CEO Archetype Agent] conservative strategy=${conservativeRes.ceo_decision.strategy}, index=${conservativeRes.ceo_decision.strategy_index.toFixed(3)}.`,
        `[Market Intelligence Agent] adjustment=${visionaryRes.ceo_decision.support_signals?.market_sentiment.adjustment?.toFixed(3) ?? 'n/a'}.`,
        `[Innovation Strategy Agent] adjustment=${visionaryRes.ceo_decision.support_signals?.operations.adjustment?.toFixed(3) ?? 'n/a'}.`,
        `[Finance & Treasury Agent] adjustment=${visionaryRes.ceo_decision.support_signals?.treasury.adjustment?.toFixed(3) ?? 'n/a'}.`
      ]);

      const referenceDecision = selectedArchetype === 'VisionaryInnovator' ? visionaryRes.ceo_decision : conservativeRes.ceo_decision;
      setCompanyState((current) => updateCompanyState(current, referenceDecision));

      setTimeline((current) => [
        ...current,
        {
          timestamp: new Date().toISOString(),
          archetype: 'VisionaryInnovator',
          strategy_index: visionaryRes.ceo_decision.strategy_index,
          cash_reserves: companyState.cash_reserves,
          production_cost: companyState.production_cost,
          product_demand: companyState.product_demand,
          market_share: visionaryRes.ceo_decision.quarter_metrics.market_share,
          traits: visionaryRes.ceo_decision.updated_traits
        },
        {
          timestamp: new Date().toISOString(),
          archetype: 'ConservativeStabilizer',
          strategy_index: conservativeRes.ceo_decision.strategy_index,
          cash_reserves: companyState.cash_reserves,
          production_cost: companyState.production_cost,
          product_demand: companyState.product_demand,
          market_share: conservativeRes.ceo_decision.quarter_metrics.market_share,
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
  }, [appendLogs, companyState, hydrateBackendData, navigate, selectedArchetype]);

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

        const nextState = payload.company_state ?? payload.financial_state;
        if (payload.event === 'tick' && payload.decision && nextState) {
          updateMarketCandle(payload);
          const decision = payload.decision;
          const crisis = payload.crisis;
          const marketMove = payload.crisis
            ? ((1 - payload.crisis.competitor_price_pressure) - payload.crisis.recession_pressure) * 0.008
            : 0;

          if (archetype === 'VisionaryInnovator') {
            setVisionaryDecision(decision);
            if (crisis) setVisionaryCrisis(crisis);
            setVisionaryCapital((current) => {
              const realized = decision.strategy_index * 0.01 + marketMove - decision.risk_level * 0.003;
              const next = current * (1 + realized);
              setVisionaryPnlPercent(((next - INITIAL_CEO_CAPITAL) / INITIAL_CEO_CAPITAL) * 100);
              return next;
            });
          } else {
            setConservativeDecision(decision);
            if (crisis) setConservativeCrisis(crisis);
            setConservativeCapital((current) => {
              const realized = decision.strategy_index * 0.008 + marketMove * 0.75 - decision.risk_level * 0.0018;
              const next = current * (1 + realized);
              setConservativePnlPercent(((next - INITIAL_CEO_CAPITAL) / INITIAL_CEO_CAPITAL) * 100);
              return next;
            });
          }

          setTimeline((current) => [
            ...current,
            {
              timestamp: payload.timestamp,
              archetype,
              strategy_index: decision.strategy_index,
              cash_reserves: nextState.cash_reserves,
              production_cost: nextState.production_cost,
              product_demand: nextState.product_demand,
              market_share: decision.quarter_metrics.market_share,
              traits: decision.updated_traits
            }
          ]);

          if (archetype === selectedArchetype) {
            setCompanyState(nextState);
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
          company_state: companyState,
          tick_seconds: 1.25,
          max_quarters: 40,
          seed: baseSeed
        }),
        startLiveSimulation({
          archetype: 'ConservativeStabilizer',
          company_state: companyState,
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
  }, [appendLogs, companyState, navigate, stopLive, wireLiveSocket]);

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
      setMarketInstruments(INITIAL_MARKET_INSTRUMENTS);
      setMarketLearning(null);
      setVisionaryCapital(INITIAL_CEO_CAPITAL);
      setConservativeCapital(INITIAL_CEO_CAPITAL);
      setVisionaryPnlPercent(0);
      setConservativePnlPercent(0);
      setCompanyState(INITIAL_COMPANY_STATE);
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
      cash_reserves: Math.max(0.05, companyState.cash_reserves + record.liquidity_delta),
      production_cost: companyState.production_cost,
      product_demand: companyState.product_demand,
      market_share: 0.22 + Math.max(-0.12, Math.min(0.12, record.strategy_index * 0.18)),
      traits: record.post_traits
    }));
  }, [companyState.cash_reserves, companyState.product_demand, companyState.production_cost, history, timeline]);

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
                  companyState={companyState}
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
                  marketInstruments={marketInstruments}
                  marketLearning={marketLearning}
                  visionaryCapital={visionaryCapital}
                  conservativeCapital={conservativeCapital}
                  visionaryPnlPercent={visionaryPnlPercent}
                  conservativePnlPercent={conservativePnlPercent}
                  visionaryCashReserve={companyState.cash_reserves * 12_000_000 * 0.53}
                  conservativeCashReserve={companyState.cash_reserves * 12_000_000 * 0.47}
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
