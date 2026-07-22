# Editable guest profiles

Guest players can update their display name, allowlisted avatar, and plain-text bio without registering. Guest code, database ID, points, account type, conversion state, and timestamps remain server-controlled.

The welcome screen does not read a stored guest code automatically. Continue as Guest first asks the player to restore a code or create a new guest. Codes are normalized with `trim()` and `toUpperCase()`, and `localStorage` is written only after the selected operation succeeds. Invalid restores remain on the form with Try Again and Create New Guest choices.

## Files

Modified: `backend/server.js`, guest model/controller/routes, Socket.IO multiplayer module, `backend/schema.sql`, `frontend/index.html`, `frontend/main.js`, and `frontend/multiplayer.js`.

Added: `backend/config/guestProfile.js` and `backend/migrations/003_guest_editable_profiles.sql`.

## Migration

```bash
cd backend
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/003_guest_editable_profiles.sql
```

The migration is idempotent and limits guest bios to 160 characters. Existing data was checked before applying it.

## Endpoint

`PATCH /api/guests/profile` requires the active HTTP-only guest session. It does not accept a guest ID or guest code for ownership.

Request fields:

```json
{
  "playerName": "CampusExplorer",
  "avatarKey": "student_red",
  "bio": "Exploring the AU campus"
}
```

The model updates only `player_name`, `avatar_key`, `bio`, and `updated_at` with PostgreSQL placeholders. Points and identity fields are never part of the update query.

Validation:

- Name: trimmed, 3–24 characters, Unicode letters/numbers plus spaces, underscores, and hyphens.
- Bio: trimmed plain text, no angle-bracket HTML, maximum 160 characters.
- Avatar: one of `default_avatar`, `student_blue`, `student_red`, or `student_green`.

## Multiplayer behavior

After PostgreSQL succeeds, the client updates its in-memory session and emits `player:profileUpdate`. The socket server ignores client identity fields, verifies the guest session attached to the socket, reloads the authoritative profile by the session-owned guest ID, updates the existing `players` map entry, and broadcasts `player:profileUpdated`. It does not create a mesh, change position, or disconnect the player.

Every connected player has a Babylon.js GUI name tag linked to a small invisible anchor above the character. One shared `AdvancedDynamicTexture` renders the per-player `Rectangle` and `TextBlock` controls, so the labels follow the interpolated meshes and remain camera-facing without changing the player models. The label contains only `playerName`; public multiplayer payloads do not include guest codes or database IDs.

The tag anchor is maintained in world space instead of being parented beneath the avatar's scaled model hierarchy. This prevents the character's `1.8` model scale from pushing the projected label far above the head at close camera distances.

On join, the server keeps the requested campus spawn when it is free. If another connected player already occupies the same horizontal area, it selects the nearest open point around that spawn and sends the authoritative position back with `player:spawned`. This prevents a remote character from spawning inside the local camera while keeping every player in the same shared world.

When `player:profileUpdated` arrives, clients change the existing tag's `TextBlock.text` value. The mesh, skeleton, and animation groups are preserved. A remote player's GUI controls and anchor are disposed together when `player:left` is received, and all remaining controls are disposed when the multiplayer client shuts down.

Google conversion transfers the latest guest display name, avatar, bio, and points inside the existing transaction for both new and existing Google accounts.

Password signup is also available directly from the collapsed Profile card. `POST /api/auth/signup-guest` requires the active guest session, hashes the submitted password, and atomically creates the registered user while transferring the guest's name, points, avatar, and bio. The guest is marked converted only after user creation succeeds. The client then clears the saved guest code and updates the existing multiplayer identity without recreating the scene.
