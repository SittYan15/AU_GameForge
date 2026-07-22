BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
    ADD COLUMN IF NOT EXISTS avatar_key VARCHAR(100) NOT NULL DEFAULT 'default_avatar',
    ADD COLUMN IF NOT EXISTS bio VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE guest_users
    ADD COLUMN IF NOT EXISTS avatar_key VARCHAR(100) NOT NULL DEFAULT 'default_avatar',
    ADD COLUMN IF NOT EXISTS bio VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS converted_to_user_id INTEGER,
    ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_method_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_auth_method_check
            CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guest_users_converted_to_user_id_fkey') THEN
        ALTER TABLE guest_users ADD CONSTRAINT guest_users_converted_to_user_id_fkey
            FOREIGN KEY (converted_to_user_id) REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guest_conversion_pair_check') THEN
        ALTER TABLE guest_users ADD CONSTRAINT guest_conversion_pair_check CHECK (
            (converted_to_user_id IS NULL AND converted_at IS NULL)
            OR (converted_to_user_id IS NOT NULL AND converted_at IS NOT NULL)
        );
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
    ON users (google_sub) WHERE google_sub IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
    ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS guest_users_converted_user_idx
    ON guest_users (converted_to_user_id) WHERE converted_to_user_id IS NOT NULL;

COMMIT;
