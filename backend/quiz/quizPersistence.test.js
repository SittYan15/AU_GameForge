import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import pg from 'pg';

// Explicit opt-in; uses a temporary schema and never changes existing accounts.
const databaseUrl = process.env.QUIZ_TEST_DATABASE_URL;
test('PostgreSQL awards are atomic, isolated, and idempotent for users and guests', { skip: !databaseUrl }, async () => {
    const schema = `quiz_test_${randomUUID().replaceAll('-', '')}`;
    const admin = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis:3000 });
    let pool;
    try {
        await admin.query(`CREATE SCHEMA ${schema}`);
        pool = new pg.Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}`, connectionTimeoutMillis:3000 });
        await pool.query(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
        await pool.query("INSERT INTO users (player_name, password_hash, points) VALUES ('User', 'test-only', 250), ('Converted', 'test-only', 250)");
        await pool.query("INSERT INTO guest_users (guest_code, player_name, points) VALUES ('TEST-GUEST', 'Guest', 250), ('TEST-CONVERTED', 'Converted guest', 250)");
        const source = readFileSync(new URL('../models/quizModel.js', import.meta.url), 'utf8')
            .replace(/^import .*;$/gm, '').replaceAll('export async function', 'async function')
            .replace('import.meta.url', '"file:///unused"');
        function model(db) {
            const context = vm.createContext({ pool: db });
            vm.runInContext(source + '\nglobalThis.award = awardCampusQuizResult;', context);
            return context.award;
        }
        const award = model(pool);
        const user = { accountType: 'user', userId: 1, playerName: 'User' };
        const result = { roundKey: randomUUID(), score: 80, correctCount: 12, durationMs: 180000 };
        const concurrent = await Promise.all(Array.from({ length: 8 }, () => award(user, result)));
        assert.equal(concurrent.filter(r => r.awarded).length, 1);
        assert.equal((await pool.query('SELECT points FROM users WHERE id=1')).rows[0].points, 330);
        assert.equal((await pool.query('SELECT games_played FROM campus_quiz_scores WHERE account_type=\'user\' AND account_id=1')).rows[0].games_played, 1);
        // Fresh model context simulates process/reconnection retries; no in-memory guard is needed.
        assert.equal((await model(pool)(user, result)).awarded, false);
        await award(user, { ...result, roundKey: randomUUID(), score: 100, correctCount: 15 });
        assert.equal((await pool.query('SELECT points FROM users WHERE id=1')).rows[0].points, 430);
        const guest = { accountType: 'guest', guestId: 1, playerName: 'Guest' };
        await award(guest, { ...result, roundKey: randomUUID() });
        assert.equal((await pool.query('SELECT points FROM guest_users WHERE id=1')).rows[0].points, 330);
        // Conversion completed before the award: credit the destination user.
        await pool.query('UPDATE guest_users SET converted_to_user_id=2, converted_at=NOW() WHERE id=2');
        const convertedResult = { ...result, roundKey: randomUUID() };
        await award({ ...guest, guestId: 2 }, convertedResult);
        await award({ ...guest, guestId: 2 }, convertedResult);
        assert.equal((await pool.query('SELECT points FROM users WHERE id=2')).rows[0].points, 330);
        assert.equal((await pool.query('SELECT points FROM guest_users WHERE id=2')).rows[0].points, 250);
        // If saving leaderboard stats fails, both the award claim and point increment roll back.
        let failOnce = true;
        const failingAward = model({ connect: async () => {
            const client = await pool.connect();
            return { release: () => client.release(), query: (sql, params) => {
                if (failOnce && sql.includes('INSERT INTO campus_quiz_scores')) {
                    failOnce = false; throw new Error('Simulated stats failure');
                }
                return client.query(sql, params);
            } };
        } });
        const retryResult = { ...result, roundKey: randomUUID() };
        await assert.rejects(failingAward(user, retryResult), /Simulated stats failure/);
        assert.equal((await pool.query('SELECT points FROM users WHERE id=1')).rows[0].points, 430);
        assert.equal((await pool.query('SELECT * FROM campus_quiz_awards WHERE round_key=$1', [retryResult.roundKey])).rowCount, 0);
        await award(user, retryResult);
        assert.equal((await pool.query('SELECT points FROM users WHERE id=1')).rows[0].points, 510);
        await assert.rejects(award(user, { ...result, score: 101 }), /Invalid/);
    } finally {
        await pool?.end();
        await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
        await admin.end();
    }
});
