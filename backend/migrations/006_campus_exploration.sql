BEGIN;

CREATE TABLE IF NOT EXISTS campus_exploration_visits (
    account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('user', 'guest')),
    account_id INTEGER NOT NULL,
    location_id VARCHAR(100) NOT NULL,
    visited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_type, account_id, location_id)
);

CREATE TABLE IF NOT EXISTS campus_exploration_completions (
    account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('user', 'guest')),
    account_id INTEGER NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reward_points INTEGER NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
    PRIMARY KEY (account_type, account_id)
);

CREATE INDEX IF NOT EXISTS campus_exploration_visits_account_idx
ON campus_exploration_visits (account_type, account_id);

COMMIT;
