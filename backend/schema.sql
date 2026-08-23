CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password_hash TEXT,
    google_sub VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    player_name VARCHAR(50) NOT NULL,
    profile_picture_url TEXT,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    avatar_key VARCHAR(100) NOT NULL DEFAULT 'default_avatar',
    bio VARCHAR(160) NOT NULL DEFAULT '',
    active_session_id UUID,
    active_session_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_auth_method_check CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS guest_users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    guest_code VARCHAR(20) UNIQUE NOT NULL,
    player_name VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    avatar_key VARCHAR(100) NOT NULL DEFAULT 'default_avatar',
    bio VARCHAR(160) NOT NULL DEFAULT '',
    converted_to_user_id INTEGER REFERENCES users(id),
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT guest_conversion_pair_check CHECK (
        (converted_to_user_id IS NULL AND converted_at IS NULL)
        OR (converted_to_user_id IS NOT NULL AND converted_at IS NOT NULL)
    )
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS active_session_id UUID;
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS active_session_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
    ON users (google_sub) WHERE google_sub IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
    ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS guest_users_converted_user_idx
    ON guest_users (converted_to_user_id) WHERE converted_to_user_id IS NOT NULL;


-- Campus exploration prerequisite.
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
CREATE INDEX IF NOT EXISTS campus_exploration_visits_account_idx ON campus_exploration_visits (account_type, account_id);


-- Campus Quiz competitive leaderboard.
CREATE TABLE IF NOT EXISTS campus_quiz_scores (
    account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('user', 'guest')),
    account_id INTEGER NOT NULL,
    player_name VARCHAR(50) NOT NULL,
    best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
    best_correct INTEGER NOT NULL DEFAULT 0 CHECK (best_correct >= 0),
    best_duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (best_duration_ms >= 0),
    games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
    total_correct INTEGER NOT NULL DEFAULT 0 CHECK (total_correct >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_type, account_id)
);
CREATE INDEX IF NOT EXISTS campus_quiz_best_score_idx
    ON campus_quiz_scores (best_score DESC, best_correct DESC, best_duration_ms ASC);
