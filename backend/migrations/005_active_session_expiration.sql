ALTER TABLE users
    ADD COLUMN IF NOT EXISTS active_session_expires_at TIMESTAMPTZ;

-- Preserve currently active sessions during deployment and let them expire
-- according to the same eight-hour lifetime as the application JWT/cookie.
UPDATE users
SET active_session_expires_at = CURRENT_TIMESTAMP + INTERVAL '8 hours'
WHERE active_session_id IS NOT NULL
  AND active_session_expires_at IS NULL;
