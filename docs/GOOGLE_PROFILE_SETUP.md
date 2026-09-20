# Google profiles and guest upgrades

## Changed and added files

Modified: `backend/server.js`, `backend/schema.sql`, backend package files, guest/auth controllers and models, auth routes, error middleware, multiplayer socket module, frontend environment example, `frontend/index.html`, `frontend/main.js`, and `frontend/multiplayer.js`.

Added: `backend/config/googleAuth.js`, `backend/controllers/googleAuthController.js`, `backend/controllers/profileController.js`, `backend/middleware/sessionAuth.js`, `backend/models/googleAccountModel.js`, `backend/routes/profileRoutes.js`, `backend/migrations/002_google_profiles.sql`, and `frontend/googleIdentity.js`.

## Environment

Backend `.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/au_gameforge
DATABASE_SSL=false
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=use_a_long_random_value_for_existing_password_login_tokens
SESSION_SECRET=use_a_different_long_random_value
GOOGLE_CLIENT_ID=000000000000-example.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
NODE_ENV=development
```

Frontend `.env`:

```env
VITE_SERVER_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=000000000000-example.apps.googleusercontent.com
```

The Google client ID is public and must match on both sides. The client secret and session secret stay backend-only. Google Identity Services ID-token verification uses the client ID/audience and does not require sending the client secret to the browser.

## Google Cloud setup

1. Open Google Cloud Console and select or create a project.
2. Configure the OAuth consent screen and add test users while the app is in testing mode.
3. Create an OAuth 2.0 Client ID with application type **Web application**.
4. Add `http://localhost:5173` under **Authorized JavaScript origins**.
5. Add the production HTTPS frontend origin separately when deploying.
6. Copy the web client ID into both environment files and the client secret into the backend only.
7. Restart Vite and the backend after changing environment variables.

The frontend loads the official `https://accounts.google.com/gsi/client` script and receives only the Google ID-token credential. The backend verifies its signature, issuer, expiration, and audience with `google-auth-library` before reading `sub`, verified email, name, or picture.

## Database migration

Apply the complete idempotent migration:

```bash
cd backend
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/002_google_profiles.sql
```

The migration keeps password accounts, adds nullable Google identity fields, adds guest conversion markers, and creates uniqueness/conversion indexes. The conversion transaction locks the guest and matched user rows, adds guest points exactly once, transfers the modeled avatar/bio data for new accounts, and marks the guest converted only after the user write succeeds. Add equivalent statements inside `upgradeGuestToGoogle` when achievements, inventory, or progress tables are introduced.

## Endpoints

- `POST /api/auth/google`: verifies a Google credential, creates or finds the user, and establishes the application session.
- `POST /api/auth/google/upgrade-guest`: requires the active HTTP-only guest session, verifies Google, and transfers guest progress transactionally.
- `GET /api/profile`: returns the active guest or registered profile.
- `POST /api/auth/logout`: destroys the server-side session and clears the cookie.

Guest create/restore now establishes an HTTP-only session cookie. The upgrade endpoint never accepts a guest code or guest ID from the request. For an existing Google account it returns `409` with the registered, guest, and combined point totals until the player confirms the merge.

The application session is stored server-side and referenced by an HTTP-only, SameSite cookie. A separate eight-hour JWT is returned for the existing Socket.IO registered-user handshake and user-points route; the frontend keeps it only in the in-memory player session and never writes it to `localStorage`.

## Local testing

1. Run PostgreSQL and apply the migration.
2. Run `npm install && npm run dev` in `backend`.
3. Run `npm install && npm run dev -- --host` in `frontend`.
4. Create or restore a guest and confirm the profile shows Guest Account, guest code, points, and the Google upgrade prompt.
5. Complete Google sign-in with an OAuth test user. Confirm the profile changes in place without a new mesh or position reset.
6. Repeat with an existing Google account and verify the points confirmation displays `registered + guest = final`.
7. Reload and use Google login; confirm the registered profile and picture return.
8. Log out and confirm `/api/profile` returns `401` afterward.

## Production

- Use HTTPS for both frontend and backend.
- Set `NODE_ENV=production` so the session cookie is `Secure`.
- Set `CLIENT_ORIGIN` to exact comma-separated HTTPS frontend origins; never use `*` with credentialed requests.
- Use long independent secrets and rotate them through the hosting provider's secret manager.
- Configure `DATABASE_SSL=true` when required by the PostgreSQL provider.
- Add production origins to the Google OAuth web client configuration.
- Keep the backend behind a trusted TLS proxy; Express proxy trust is enabled only in production.
- Use a durable PostgreSQL session store, already configured through `connect-pg-simple`.

## Common problems

- **Google Sign-In is not configured:** set both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`, then restart both processes.
- **The given origin is not allowed:** add the exact scheme, host, and port to Google Authorized JavaScript origins and `CLIENT_ORIGIN`.
- **Google credential verification failed:** confirm frontend and backend use the same Web client ID and the credential has not expired.
- **No active guest session:** allow cookies, use `credentials: include`, and create/restore the guest again.
- **Secure cookie missing in production:** ensure the public URL is HTTPS and the reverse proxy forwards the original protocol.
- **Merge already transferred:** the guest conversion markers intentionally prevent adding the same points twice.
- **CORS failure:** use exact frontend origins and keep `credentials: true` on the backend.
