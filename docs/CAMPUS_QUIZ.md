# Campus Quiz: 15 questions, 100 points

The existing floor-selection game stays server-controlled. Every round shuffles a copy of all 45 question IDs and selects 15 without replacement. Consecutive rounds cannot select an identical set. The question bank is never modified. Answer options are shuffled once on the server and mapped back to their canonical correct option; every player in the room receives the same question, floor mapping, and deadline.

Questions 1–10 award 7 points each, and questions 11–15 award 6 points each. Wrong answers and missing floor selections award zero. Players are no longer eliminated after three mistakes. The server locks each floor selection at the existing deadline, immediately emits the score and correctness result, then uses the existing reveal transition. A player's score is independent of every other player's score and is capped at 100.

After question 15, the result panel shows the correct count and score out of 100. Play Again starts the shared room lobby and resets every player's quiz counters before drawing another set. Repeated or stale replay requests cannot restart an active round. Late arrivals spectate until the next round.

## Persistent awards

A fresh server-generated UUID identifies each round. At round start, the server snapshots each participant's original account identity. On completion, `awardCampusQuizResult` performs one PostgreSQL transaction:

1. Claim `(round_key, account_type, account_id)` in `campus_quiz_awards`.
2. Add the final quiz score to existing account points.
3. Save the quiz leaderboard statistics.
4. Commit all three operations together.

A conflict skips both the point increment and statistics update. Failed transactions roll back together; a retry uses the same UUID and identity. Guest conversion is resolved under a guest-row lock, so points reach the converted user when applicable. Clients never submit scores or call a points-award API for quiz completion. Reconnection or refreshing cannot resubmit an award. Interrupted/abandoned games are not credited as completed games.

The existing `player:pointsUpdated` event carries the authoritative total to the multiplayer session and `profile:points-updated` profile listener. A zero quiz score leaves the account total unchanged. The previous survival bonus is disabled. Historic account points and leaderboard records are retained.

## Database setup

`schema.sql` includes the new award ledger for new databases. On backend startup, `initializeCampusQuizAwards` applies the idempotent `008_campus_quiz_awards.sql` migration for existing databases. Restart the backend after updating these files. The application's database role needs permission to create this table; alternatively apply the migration using the database administrator before startup.

## Verification

Run `npm test` from `backend` for bank, randomized rounds, scoring, replay, synchronization and frontend event tests. The PostgreSQL test is opt-in with `QUIZ_TEST_DATABASE_URL` pointing to a local test database. It creates a uniquely named temporary schema, checks concurrent duplicate awards, independent user/guest totals, conversion, and transaction rollback, and removes the schema afterward. It does not change existing accounts.

Run `npm run build` from `frontend` for production compilation.
