BEGIN;

CREATE TABLE IF NOT EXISTS campus_quiz_scores (
    account_type VARCHAR(10) NOT NULL
        CHECK (account_type IN ('user', 'guest')),

    account_id INTEGER NOT NULL,
    player_name VARCHAR(50) NOT NULL,

    best_score INTEGER NOT NULL DEFAULT 0
        CHECK (best_score >= 0),

    best_correct INTEGER NOT NULL DEFAULT 0
        CHECK (best_correct >= 0),

    best_duration_ms INTEGER NOT NULL DEFAULT 0
        CHECK (best_duration_ms >= 0),

    games_played INTEGER NOT NULL DEFAULT 0
        CHECK (games_played >= 0),

    total_correct INTEGER NOT NULL DEFAULT 0
        CHECK (total_correct >= 0),

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (account_type, account_id)
);

CREATE INDEX IF NOT EXISTS campus_quiz_best_score_idx
ON campus_quiz_scores (
    best_score DESC,
    best_correct DESC,
    best_duration_ms ASC
);

COMMIT;
