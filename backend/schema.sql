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

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
    ON users (google_sub) WHERE google_sub IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
    ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS guest_users_converted_user_idx
    ON guest_users (converted_to_user_id) WHERE converted_to_user_id IS NOT NULL;
