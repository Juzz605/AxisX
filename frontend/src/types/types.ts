export type Archetype = 'VisionaryInnovator' | 'ConservativeStabilizer';

export interface CrisisReport {
  disruption_event:
    | 'supply_chain_disruption'
    | 'sudden_demand_drop'
    | 'competitor_launching_cheaper_product'
    | 'economic_recession'
    | 'manufacturing_cost_spike';
  supply_chain_disruption: number;
  demand_drop_intensity: number;
  competitor_price_pressure: number;
  recession_pressure: number;
  manufacturing_cost_spike: number;
  severity_index: number;
}

export interface CEOProfile {
  name: string;
  risk_tolerance: number;
  innovation_bias: number;
  liquidity_priority: number;
  cost_sensitivity: number;
  long_term_focus: number;
}

export interface CompanyState {
  product_demand: number;
  production_cost: number;
  supply_chain_risk: number;
  competitor_pressure: number;
  marketing_effectiveness: number;
  customer_sentiment: number;
  cash_reserves: number;
}

export type FinancialState = CompanyState;

export interface Explainability {
  dominant_factors: string[];
  severity_context: number;
}

export interface MarketSentimentSignal {
  sentiment_score: number;
  momentum_signal: number;
  volatility_pressure: number;
  adjustment: number;
}

export interface OperationsSignal {
  efficiency_score: number;
  opex_pressure: number;
  execution_risk: number;
  adjustment: number;
}

export interface TreasurySignal {
  liquidity_health: number;
  runway_pressure: number;
  refinancing_risk: number;
  adjustment: number;
}

export interface SupportAgentSignals {
  market_sentiment: MarketSentimentSignal;
  operations: OperationsSignal;
  treasury: TreasurySignal;
  aggregate_adjustment: number;
  dominant_driver: string;
}

export interface CEODecision {
  strategy:
    | 'increase_marketing'
    | 'cut_production'
    | 'invest_in_r_and_d'
    | 'adjust_price'
    | 'hire_or_layoff_staff'
    | 'enter_new_market';
  risk_level: number;
  growth_score: number;
  stability_score: number;
  strategy_index: number;
  quarter_metrics: {
    revenue: number;
    profit_margin: number;
    market_share: number;
    customer_growth: number;
    brand_strength: number;
    company_cash_balance: number;
  };
  updated_traits: CEOProfile;
  explainability: Explainability;
  support_signals?: SupportAgentSignals;
}

export interface SimulationResponse {
  crisis_report: CrisisReport;
  ceo_decision: CEODecision;
}

export interface SimulationRequest {
  archetype: Archetype;
  company_state: CompanyState;
  seed?: number;
  outcome_success?: boolean;
  liquidity_delta?: number;
}

export interface SimulationHistory {
  timestamp: string;
  profile_name: string;
  strategy: string;
  strategy_index: number;
  outcome_success: boolean;
  liquidity_delta: number;
  pre_traits: CEOProfile;
  post_traits: CEOProfile;
}

export interface ResultPoint {
  timestamp: string;
  archetype: Archetype;
  strategy_index: number;
  cash_reserves: number;
  production_cost: number;
  product_demand: number;
  market_share: number;
  traits: CEOProfile;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface LiveSimulationStartRequest {
  archetype: Archetype;
  company_state: CompanyState;
  tick_seconds?: number;
  max_quarters?: number;
  seed?: number;
}

export interface LiveSimulationStartResponse {
  session_id: string;
  archetype: Archetype;
  tick_seconds: number;
  max_quarters: number;
}

export interface LiveTickEvent {
  event: 'tick' | 'complete' | 'error';
  session_id: string;
  archetype: Archetype;
  quarter: number;
  crisis?: CrisisReport;
  decision?: CEODecision;
  company_state?: CompanyState;
  financial_state?: FinancialState;
  agent_logs?: string[];
  timestamp: string;
  message?: string;
}

export type MarketRegime = 'Expansion' | 'Stable' | 'Stress' | 'Crisis';

export interface MarketCandle {
  timestamp: string;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  regime: MarketRegime;
}

export interface MarketInstrumentSnapshot {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  currency: 'INR' | 'USD';
}

export interface MarketLearningSignal {
  trend: 'Bullish' | 'Bearish' | 'Sideways';
  predicted_price: number;
  confidence: number;
  volatility: number;
  fast_ema: number;
  slow_ema: number;
}

export interface CompanyRevenuePoint {
  quarter: number;
  label: string;
  revenue: number;
  growth_rate: number;
  market_share: number;
}

export interface ProductPerformance {
  product: 'iPhone' | 'AirPods' | 'iPad' | 'iMac' | 'MacBook Air' | 'Apple Watch';
  monthly_units_sold: number;
  yearly_units_sold: number;
  inventory_utilization: number;
  production_focus: 'increase' | 'hold' | 'reduce';
  primary_color: string;
  color_mix: Record<string, number>;
  why_customers_buy: string;
  buying_window: string;
}

export interface CustomerDemandInsight {
  top_reason: string;
  top_segment: string;
  top_region: string;
  top_color_preference: string;
  seasonal_driver: string;
}

export interface CEOProductPlan {
  archetype: Archetype;
  product_to_market: ProductPerformance['product'];
  product_to_scale: ProductPerformance['product'];
  product_to_reduce: ProductPerformance['product'];
  rationale: string;
}
