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
  CEOProductPlan,
  CompanyRevenuePoint,
  CompanyState,
  CrisisReport,
  CustomerDemandInsight,
  LiveTickEvent,
  ProductPerformance,
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

const INITIAL_CEO_CAPITAL = 50_000_000;
const PRODUCT_NAMES: ProductPerformance['product'][] = ['iPhone', 'AirPods', 'iPad', 'iMac', 'MacBook Air', 'Apple Watch'];

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeArchetype(value: string): Archetype {
  return value === 'VisionaryInnovator' ? 'VisionaryInnovator' : 'ConservativeStabilizer';
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
    product_demand: Number(clamp(current.product_demand + m.customer_growth * 0.25).toFixed(4)),
    production_cost: Number(clamp(current.production_cost + (0.28 - m.profit_margin) * 0.2).toFixed(4)),
    supply_chain_risk: Number(clamp(current.supply_chain_risk - m.brand_strength * 0.05 + decision.risk_level * 0.03).toFixed(4)),
    competitor_pressure: Number(clamp(current.competitor_pressure - m.market_share * 0.07 + 0.015).toFixed(4)),
    marketing_effectiveness: Number(clamp(current.marketing_effectiveness + m.brand_strength * 0.04).toFixed(4)),
    customer_sentiment: Number(clamp(current.customer_sentiment + m.customer_growth * 0.16).toFixed(4)),
    cash_reserves: Number(clamp(m.company_cash_balance / 12_000_000).toFixed(4))
  };
}

function initialProducts(): ProductPerformance[] {
  return [
    {
      product: 'iPhone',
      monthly_units_sold: 5_200_000,
      yearly_units_sold: 62_000_000,
      inventory_utilization: 0.78,
      production_focus: 'increase',
      primary_color: 'Midnight',
      color_mix: { Midnight: 34, Starlight: 22, Blue: 17, Red: 12, Pink: 15 },
      why_customers_buy: 'Camera upgrade + premium ecosystem lock-in',
      buying_window: 'Launch season and festive quarter'
    },
    {
      product: 'AirPods',
      monthly_units_sold: 3_100_000,
      yearly_units_sold: 36_000_000,
      inventory_utilization: 0.72,
      production_focus: 'hold',
      primary_color: 'White',
      color_mix: { White: 84, Black: 8, Green: 4, Purple: 4 },
      why_customers_buy: 'Convenience + bundled ecosystem',
      buying_window: 'Holiday gifting spikes'
    },
    {
      product: 'iPad',
      monthly_units_sold: 1_900_000,
      yearly_units_sold: 22_000_000,
      inventory_utilization: 0.66,
      production_focus: 'hold',
      primary_color: 'Silver',
      color_mix: { Silver: 35, SpaceGray: 40, Blue: 15, Purple: 10 },
      why_customers_buy: 'Education + content consumption',
      buying_window: 'Back-to-school and semester starts'
    },
    {
      product: 'iMac',
      monthly_units_sold: 420_000,
      yearly_units_sold: 5_000_000,
      inventory_utilization: 0.58,
      production_focus: 'reduce',
      primary_color: 'Blue',
      color_mix: { Blue: 31, Green: 18, Pink: 15, Silver: 24, Yellow: 12 },
      why_customers_buy: 'Design-heavy workspace preference',
      buying_window: 'Q4 enterprise refresh cycles'
    },
    {
      product: 'MacBook Air',
      monthly_units_sold: 1_700_000,
      yearly_units_sold: 20_000_000,
      inventory_utilization: 0.71,
      production_focus: 'increase',
      primary_color: 'Space Gray',
      color_mix: { SpaceGray: 38, Silver: 29, Midnight: 23, Starlight: 10 },
      why_customers_buy: 'Student demand + portability',
      buying_window: 'Back-to-school and exam prep months'
    },
    {
      product: 'Apple Watch',
      monthly_units_sold: 1_350_000,
      yearly_units_sold: 16_000_000,
      inventory_utilization: 0.64,
      production_focus: 'hold',
      primary_color: 'Black',
      color_mix: { Black: 44, Silver: 24, Blue: 14, Red: 8, Pink: 10 },
      why_customers_buy: 'Health monitoring and fitness trends',
      buying_window: 'New Year fitness cycle'
    }
  ];
}

function initialInsight(): CustomerDemandInsight {
  return {
    top_reason: 'Camera + ecosystem continuity',
    top_segment: 'Students and young professionals',
    top_region: 'India Urban + US Coastal',
    top_color_preference: 'Midnight',
    seasonal_driver: 'Back-to-school season and flagship launch quarter'
  };
}

function derivePlan(archetype: Archetype, decision: CEODecision, products: ProductPerformance[]): CEOProductPlan {
  const sortedByDemand = [...products].sort((a, b) => b.monthly_units_sold - a.monthly_units_sold);
  const sortedByInventory = [...products].sort((a, b) => a.inventory_utilization - b.inventory_utilization);

  const product_to_market = decision.strategy === 'increase_marketing' ? sortedByDemand[0].product : sortedByDemand[1].product;
  const product_to_scale = decision.strategy === 'enter_new_market' || decision.strategy === 'invest_in_r_and_d'
    ? sortedByDemand[0].product
    : sortedByDemand[2].product;
  const product_to_reduce = sortedByInventory[0].product;

  return {
    archetype,
    product_to_market,
    product_to_scale,
    product_to_reduce,
    rationale:
      archetype === 'VisionaryInnovator'
        ? 'Prioritize growth SKUs, attach premium features, and accelerate launch cadence where demand momentum is highest.'
        : 'Protect cash by trimming weak inventory lines and scaling only proven products with stable conversion.'
  };
}

function evolveProducts(
  current: ProductPerformance[],
  decision: CEODecision,
  crisis: CrisisReport,
  companyState: CompanyState
): ProductPerformance[] {
  return current.map((product, idx) => {
    const demandPulse = companyState.product_demand * 0.9 + companyState.customer_sentiment * 0.5 - crisis.demand_drop_intensity * 0.4;
    const strategicLift = decision.strategy_index * (0.08 + idx * 0.006);
    const seasonal = Math.sin((Date.now() / 1000 / 60 / 60 / 24 + idx * 11) * 0.2) * 0.06;
    const growthFactor = 1 + demandPulse * 0.05 + strategicLift + seasonal;

    const monthly = Math.max(50_000, Math.round(product.monthly_units_sold * growthFactor));
    const yearly = Math.max(monthly * 8, Math.round(product.yearly_units_sold * (1 + growthFactor * 0.08)));
    const utilization = clamp(product.inventory_utilization + growthFactor * 0.03 - companyState.production_cost * 0.02, 0.35, 0.95);

    const production_focus: ProductPerformance['production_focus'] =
      growthFactor > 1.05 ? 'increase' : growthFactor < 0.96 ? 'reduce' : 'hold';

    return {
      ...product,
      monthly_units_sold: monthly,
      yearly_units_sold: yearly,
      inventory_utilization: Number(utilization.toFixed(4)),
      production_focus
    };
  });
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

  const [products, setProducts] = useState<ProductPerformance[]>(initialProducts());
  const [customerInsight, setCustomerInsight] = useState<CustomerDemandInsight>(initialInsight());
  const [revenueTimeline, setRevenueTimeline] = useState<CompanyRevenuePoint[]>([]);
  const [visionaryPlan, setVisionaryPlan] = useState<CEOProductPlan>({
    archetype: 'VisionaryInnovator',
    product_to_market: 'iPhone',
    product_to_scale: 'MacBook Air',
    product_to_reduce: 'iMac',
    rationale: 'Launch-focused growth plan.'
  });
  const [conservativePlan, setConservativePlan] = useState<CEOProductPlan>({
    archetype: 'ConservativeStabilizer',
    product_to_market: 'AirPods',
    product_to_scale: 'iPhone',
    product_to_reduce: 'iMac',
    rationale: 'Efficiency-focused allocation plan.'
  });

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

  const applyQuarterUpdate = useCallback(
    (archetype: Archetype, decision: CEODecision, crisis: CrisisReport, nextState: CompanyState, timestamp: string, quarter: number) => {
      if (archetype === 'VisionaryInnovator') {
        setVisionaryDecision(decision);
        setVisionaryCrisis(crisis);
        setVisionaryCapital((current) => {
          const next = current * (1 + decision.strategy_index * 0.009 - decision.risk_level * 0.002);
          setVisionaryPnlPercent(((next - INITIAL_CEO_CAPITAL) / INITIAL_CEO_CAPITAL) * 100);
          return next;
        });
      } else {
        setConservativeDecision(decision);
        setConservativeCrisis(crisis);
        setConservativeCapital((current) => {
          const next = current * (1 + decision.strategy_index * 0.007 - decision.risk_level * 0.0014);
          setConservativePnlPercent(((next - INITIAL_CEO_CAPITAL) / INITIAL_CEO_CAPITAL) * 100);
          return next;
        });
      }

      setTimeline((current) => [
        ...current,
        {
          timestamp,
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

      setProducts((current) => {
        const updated = evolveProducts(current, decision, crisis, nextState);
        setVisionaryPlan((plan) =>
          archetype === 'VisionaryInnovator' ? derivePlan('VisionaryInnovator', decision, updated) : plan
        );
        setConservativePlan((plan) =>
          archetype === 'ConservativeStabilizer' ? derivePlan('ConservativeStabilizer', decision, updated) : plan
        );
        return updated;
      });

      setRevenueTimeline((current) => {
        const prev = current[current.length - 1];
        const growth = prev ? (decision.quarter_metrics.revenue - prev.revenue) / Math.max(prev.revenue, 1) : 0;
        return [
          ...current,
          {
            quarter,
            label: `Q${quarter}`,
            revenue: decision.quarter_metrics.revenue,
            growth_rate: Number(growth.toFixed(4)),
            market_share: decision.quarter_metrics.market_share
          }
        ].slice(-24);
      });

      setCustomerInsight({
        top_reason: nextState.customer_sentiment > 0.62 ? 'Perceived premium value and ecosystem trust' : 'Price-performance balance',
        top_segment: nextState.product_demand > 0.62 ? 'Students + creators' : 'Mainstream family buyers',
        top_region: nextState.marketing_effectiveness > 0.6 ? 'India metros + US urban hubs' : 'Mixed global urban cluster',
        top_color_preference: products[0]?.primary_color ?? 'Midnight',
        seasonal_driver:
          nextState.product_demand > 0.64
            ? 'Back-to-school demand and flagship cycle'
            : 'Holiday gifting and replacement purchases'
      });
    },
    [products, selectedArchetype]
  );

  const hydrateBackendData = useCallback(async () => {
    try {
      const [resultRows, historyRows] = await Promise.all([fetchResults(), fetchHistory()]);
      setHistory(historyRows);

      if (resultRows.length > 0 && timeline.length === 0) {
        const points = resultRows.map((result, index) => ({
          timestamp: new Date(Date.now() + index * 60000).toISOString(),
          archetype: normalizeArchetype(result.ceo_decision.updated_traits.name),
          strategy_index: result.ceo_decision.strategy_index,
          cash_reserves: result.ceo_decision.quarter_metrics.company_cash_balance / 12_000_000,
          production_cost: companyState.production_cost,
          product_demand: companyState.product_demand,
          market_share: result.ceo_decision.quarter_metrics.market_share,
          traits: result.ceo_decision.updated_traits
        }));
        setTimeline(points);
      }
    } catch (apiError) {
      const err = apiError as ApiError;
      if (err.status !== 404) setError(err.message || 'Failed to load backend history');
    }
  }, [companyState.product_demand, companyState.production_cost, timeline.length]);

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

      const now = new Date().toISOString();
      const nextStateFromVisionary = updateCompanyState(companyState, visionaryRes.ceo_decision);
      applyQuarterUpdate('VisionaryInnovator', visionaryRes.ceo_decision, visionaryRes.crisis_report, nextStateFromVisionary, now, timeline.length + 1);
      applyQuarterUpdate('ConservativeStabilizer', conservativeRes.ceo_decision, conservativeRes.crisis_report, updateCompanyState(companyState, conservativeRes.ceo_decision), now, timeline.length + 1);

      appendLogs([
        `[Crisis Monitoring Agent] event=${visionaryRes.crisis_report.disruption_event}, severity=${visionaryRes.crisis_report.severity_index.toFixed(3)}.`,
        `[CEO Archetype Agent] visionary strategy=${visionaryRes.ceo_decision.strategy}.`,
        `[CEO Archetype Agent] conservative strategy=${conservativeRes.ceo_decision.strategy}.`,
        `[Market Intelligence Agent] customer_signal=${visionaryRes.ceo_decision.support_signals?.market_sentiment.momentum_signal.toFixed(3) ?? 'n/a'}.`,
        `[Innovation Strategy Agent] execution_risk=${visionaryRes.ceo_decision.support_signals?.operations.execution_risk.toFixed(3) ?? 'n/a'}.`,
        `[Finance & Treasury Agent] liquidity_health=${visionaryRes.ceo_decision.support_signals?.treasury.liquidity_health.toFixed(3) ?? 'n/a'}.`
      ]);

      await hydrateBackendData();
      navigate('/simulation');
    } catch (apiError) {
      const err = apiError as ApiError;
      setError(err.message || 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  }, [appendLogs, applyQuarterUpdate, companyState, hydrateBackendData, navigate, timeline.length]);

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
    if (stops.length > 0) await Promise.allSettled(stops);
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

        if (payload.agent_logs) appendLogs(payload.agent_logs);

        const state = payload.company_state ?? payload.financial_state;
        if (payload.event === 'tick' && payload.decision && payload.crisis && state) {
          applyQuarterUpdate(archetype, payload.decision, payload.crisis, state, payload.timestamp, payload.quarter);
        }

        if (payload.event === 'complete') {
          appendLogs([`[Live Engine] ${archetype} session completed at quarter ${payload.quarter}.`]);
        }
      };

      socket.onopen = () => appendLogs([`[Live Engine] ${archetype} websocket connected.`]);
      socket.onerror = () => setError(`Live websocket error for ${archetype}.`);
      liveSocketsRef.current.push(socket);
    },
    [appendLogs, applyQuarterUpdate]
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
          tick_seconds: 1.2,
          max_quarters: 36,
          seed: baseSeed
        }),
        startLiveSimulation({
          archetype: 'ConservativeStabilizer',
          company_state: companyState,
          tick_seconds: 1.2,
          max_quarters: 36,
          seed: baseSeed + 7
        })
      ]);

      liveSessionIdsRef.current = { visionary: visionary.session_id, conservative: conservative.session_id };
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
      setCompanyState(INITIAL_COMPANY_STATE);
      setProducts(initialProducts());
      setCustomerInsight(initialInsight());
      setRevenueTimeline([]);
      setVisionaryCapital(INITIAL_CEO_CAPITAL);
      setConservativeCapital(INITIAL_CEO_CAPITAL);
      setVisionaryPnlPercent(0);
      setConservativePnlPercent(0);
      navigate('/');
    } catch (apiError) {
      const err = apiError as ApiError;
      setError(err.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  }, [navigate, stopLive]);

  const analyticsPoints = useMemo(() => {
    if (timeline.length > 0) return timeline;
    return history.map((record) => ({
      timestamp: record.timestamp,
      archetype: normalizeArchetype(record.profile_name),
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

  useEffect(() => () => closeLiveSockets(), [closeLiveSockets]);

  return (
    <div className="min-h-screen bg-bg text-textMain">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-4 flex min-h-8 items-center justify-between">
          {loading ? <LoadingSpinner /> : <span className="text-xs uppercase tracking-[0.14em] text-textSub">Ready</span>}
          <span className="text-xs uppercase tracking-[0.14em] text-textSub">{location.pathname}</span>
        </div>

        {error ? <div className="mb-5 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

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
                  revenueTimeline={revenueTimeline}
                  products={products}
                  customerInsight={customerInsight}
                  visionaryPlan={visionaryPlan}
                  conservativePlan={conservativePlan}
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
