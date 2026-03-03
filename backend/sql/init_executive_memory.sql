CREATE TABLE IF NOT EXISTS executive_memory (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    profile_name VARCHAR(64) NOT NULL,
    strategy VARCHAR(64) NOT NULL,
    pre_traits JSONB NOT NULL,
    post_traits JSONB NOT NULL,
    strategy_index DOUBLE PRECISION NOT NULL,
    outcome_success BOOLEAN NOT NULL,
    liquidity_delta DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_executive_memory_timestamp ON executive_memory (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_executive_memory_profile_name ON executive_memory (profile_name);
