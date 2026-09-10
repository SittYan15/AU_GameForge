-- One committed award per round and original participant identity.
-- The original identity remains stable if a guest upgrades during a round.
CREATE TABLE IF NOT EXISTS campus_quiz_awards (
    round_key UUID NOT NULL,
    account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('user', 'guest')),
    account_id INTEGER NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    correct_count INTEGER NOT NULL CHECK (correct_count BETWEEN 0 AND 15),
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (round_key, account_type, account_id)
);
