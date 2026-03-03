export type Archetype = 'VisionaryInnovator' | 'ConservativeStabilizer';

export interface CrisisReport {
  demand_drop: number;
  interest_rate_spike: number;
  liquidity_risk: number;
  consumer_confidence: number;
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

export interface FinancialState {
  revenue: number;
  cash: number;
  burn_rate: number;
  liquidity_months: number;
}

export interface Explainability {
  dominant_factors: string[];
  severity_context: number;
}

export interface CEODecision {
  strategy: 'Aggressive Expansion' | 'Balanced Adjustment' | 'Defensive Cost Control';
  risk_level: number;
  growth_score: number;
  stability_score: number;
  strategy_index: number;
  updated_traits: CEOProfile;
  explainability: Explainability;
}

export interface SimulationResponse {
  crisis_report: CrisisReport;
  ceo_decision: CEODecision;
}

export interface SimulationRequest {
  archetype: Archetype;
  financial_state: FinancialState;
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
  liquidity_months: number;
  burn_rate: number;
  traits: CEOProfile;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface LiveSimulationStartRequest {
  archetype: Archetype;
  financial_state: FinancialState;
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
