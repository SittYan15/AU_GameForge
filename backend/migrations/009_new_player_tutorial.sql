BEGIN;

-- Existing accounts are intentionally marked complete so this new tutorial
-- never appears for players who already existed before the feature shipped.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN;

UPDATE users
SET tutorial_completed = TRUE
WHERE tutorial_completed IS NULL;

ALTER TABLE users
    ALTER COLUMN tutorial_completed SET DEFAULT FALSE;

ALTER TABLE users
    ALTER COLUMN tutorial_completed SET NOT NULL;


ALTER TABLE guest_users
    ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN;

UPDATE guest_users
SET tutorial_completed = TRUE
WHERE tutorial_completed IS NULL;

ALTER TABLE guest_users
    ALTER COLUMN tutorial_completed SET DEFAULT FALSE;

ALTER TABLE guest_users
    ALTER COLUMN tutorial_completed SET NOT NULL;

COMMIT;
