# AU GameForge multiplayer and guest accounts

This repository keeps the existing Babylon.js movement, cameras, NPCs, cars, mobile controls, and loading screen. Multiplayer uses Socket.IO, while permanent guest identity and points use PostgreSQL.

All players share one AU Campus world. The backend intentionally uses one in-memory `players` map and does not use Socket.IO rooms. Positions, rotations, and animation state remain in memory only while a socket is connected; PostgreSQL stores persistent guest data and points only.

Player profiles, Google Identity Services setup, secure sessions, and transactional guest upgrades are documented in [`docs/GOOGLE_PROFILE_SETUP.md`](docs/GOOGLE_PROFILE_SETUP.md).

Guest profile editing, validation, migration, and multiplayer synchronization are documented in [`docs/GUEST_PROFILE_EDITING.md`](docs/GUEST_PROFILE_EDITING.md).

## Files

Modified: `backend/server.js`, both `package.json` and lock files, `frontend/main.js`, `frontend/player.js`, `frontend/index.html`, `docker-compose.yml`, and `.gitignore`.

Added: backend database config, guest model/controller/routes, error middleware, multiplayer socket module, SQL schema, frontend multiplayer module, and environment examples.

## Install and configure

```bash
cd backend
npm install
cp .env.example .env
psql -d au_gameforge -f schema.sql

cd ../frontend
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `backend/.env`. Never commit the real `.env`. Set `DATABASE_SSL=true` only when the database provider requires TLS. `CLIENT_ORIGIN` accepts comma-separated origins. Set `VITE_SERVER_URL` to the backend's HTTP(S) URL (not `ws://`).

Run each command in a separate terminal:

```bash
cd backend && npm run dev
cd frontend && npm run dev -- --host
```

Open `http://localhost:5173`. The welcome screen requires the player to choose Login, Sign Up, or Continue as Guest before the Babylon scene or Socket.IO connection starts. Continue as Guest always asks whether the player wants to enter a code or create a new guest; stored codes are never restored automatically.

Registered accounts live in the `users` table and use bcrypt hashes in `password_hash`. Sign Up validates unique usernames and matching passwords, automatically signs in the new user, and returns a short-lived JWT. Registered Socket.IO connections and user point updates are verified with that token rather than trusting a frontend user ID. Guests and registered users enter the same shared world.

## Test checklist

1. Load the site and confirm no guest row is inserted until Continue as Guest is clicked.
2. Try an invalid registered-user login and confirm the game scene does not start. Then use a valid bcrypt-backed account and confirm its player name and points appear.
3. Open two tabs. Choose Login or Continue as Guest in each and confirm both characters share the same world, move smoothly, rotate and switch idle/walk/run, while each camera follows only its own character.
4. Close one tab and confirm its remote character disappears in the other.
5. Reload, choose Continue as Guest, and confirm the guest code and point total return from `localStorage`.
6. Test guest points without replacing the total:

   ```bash
   curl -X PATCH http://localhost:3000/api/guests/AU-XXXXXX/points \
     -H 'Content-Type: application/json' \
     -d '{"pointsToAdd":10}'
   ```

7. Test registered-user points with `PATCH /api/users/USER_ID/points` and the same `{ "pointsToAdd": 10 }` body.
8. For two computers on one LAN, run Vite with `--host`, set `VITE_SERVER_URL=http://HOST_LAN_IP:3000`, set backend `CLIENT_ORIGIN=http://HOST_LAN_IP:5173`, restart both services, allow ports 3000 and 5173 through the firewall, then browse to `http://HOST_LAN_IP:5173` on both devices.

## API responses

- `POST /api/guests` creates a guest (`201`).
- `POST /api/guests/restore` restores a normalized code (`200`).
- `GET /api/guests/:guestCode` gets a guest (`200`).
- `PATCH /api/guests/:guestCode/points` atomically adds a positive integer (`200`).
- `PATCH /api/users/:userId/points` atomically adds registered-user points (`200`).
- Invalid input returns `400`, missing guests `404`, exhausted code collisions `409`, and unexpected errors `500` without SQL or stack traces.

## Common errors

- `relation guest_users does not exist`: run `psql -d au_gameforge -f backend/schema.sql` against the same database in `DATABASE_URL`.
- PostgreSQL authentication/connection refused: verify username, password, host, port, database name, and that PostgreSQL is running.
- CORS error: add the browser's exact origin (including protocol and port) to `CLIENT_ORIGIN`, then restart the backend.
- Socket connection fails in production: use an `https://` backend URL in `VITE_SERVER_URL`; the client negotiates Socket.IO transport itself.
- Other computers cannot connect: use the host's LAN IP rather than `localhost`, bind Vite with `--host`, and check the firewall.
- Remote model or animations missing: confirm `frontend/public/BoyAnimV2.4.glb` exists and contains animation group names including `idle`, `walk`, and `run`.
- `POST /api/auth/login` verifies a registered user's bcrypt hash (`200`) or rejects invalid credentials (`401`).
- `POST /api/auth/signup` creates a bcrypt-backed unique user and returns an access token (`201`).
