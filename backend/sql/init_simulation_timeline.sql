CREATE TABLE IF NOT EXISTS simulation_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    simulation_id TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    archetype TEXT NOT NULL,
    crisis_json TEXT NOT NULL,
    decision_json TEXT NOT NULL,
    financial_state_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_simulation_timeline_sim_qtr
ON simulation_timeline (simulation_id, quarter);
