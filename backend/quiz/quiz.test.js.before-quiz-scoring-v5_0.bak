import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import * as definitions from './quizDefinitions.js';
const questions = definitions.CAMPUS_QUIZ_QUESTIONS;

test('question bank has all six categories and unique, valid four-choice questions', () => {
    assert.ok(questions.length >= 45);
    assert.equal(new Set(questions.map(q => q.id)).size, questions.length);
    assert.equal(new Set(questions.map(q => q.question)).size, questions.length);
    assert.deepEqual([...new Set(questions.map(q => q.category))].sort(),
        ['Assumption University', 'General Knowledge', 'Computer Science', 'Mathematics', 'Science', 'Thailand'].sort());
    for (const q of questions) {
        assert.ok(q.question && q.explanation);
        assert.equal(q.options.length, 4);
        assert.equal(new Set(q.options.map(o => o.id)).size, 4);
        assert.equal(new Set(q.options.map(o => o.text)).size, 4);
        assert.equal(q.options.filter(o => o.id === q.correctOptionId).length, 1);
    }
});

// Run the actual server manager with in-memory sockets, persistence, and timers.
// No database or running server is needed, and production exports stay unchanged.
function harness() {
    const source = readFileSync(new URL('./quizManager.js', import.meta.url), 'utf8')
        .replace(/^import[\s\S]*?;\n/gm, '').replace(/^export /gm, '');
    const saved = [], rewards = [], timers = [];
    let seed = 123456;
    const math = Object.create(Math);
    math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
    const context = vm.createContext({ ...definitions, console, Date, randomUUID, Math: math,
        setTimeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; },
        clearTimeout: timer => { if (timer) timer.cancelled = true; },
        setInterval: () => 1, clearInterval: () => {},
        getCampusQuizLeaderboard: async () => [], getTopPlayers: async () => [],
        awardCampusQuizResult: async (player, result) => {
            saved.push({ player, result });
            rewards.push({ id: player.userId, points: result.score });
            return { awarded: true, totalPoints: 250 + result.score };
        }

    });
    vm.runInContext(source + '\n globalThis.api = { startLobby, startRound, evaluateQuestion, buildPublicQuestion, finishRound, registerCampusQuizSocket, quizState, socketHandlers };', context);
    const sockets = new Map();
    const io = { sockets: { sockets, adapter: { rooms: new Map([[definitions.CAMPUS_QUIZ_ROOM, new Set()]]) } },
        emit() {}, to: () => ({ emit: (event, data) => { for (const s of sockets.values()) s.emit(event, data); } }) };
    function add(id) {
        const player = { position: {}, playerName: id, accountType: 'user', userId: id };
        const s = { id, data: {}, events: [], handlers: new Map(), on(event, fn) { this.handlers.set(event, fn); }, emit(event, data) { this.events.push({ event, data }); } };
        sockets.set(id, s); io.sockets.adapter.rooms.get(definitions.CAMPUS_QUIZ_ROOM).add(id);
        context.api.registerCampusQuizSocket(io, s, () => player);
        return { s, player };
    }
    return { ...context.api, io, add, saved, rewards, timers, setRandom: fn => { math.random = fn; } };
}

function next(h) {
    h.timers.filter(t => t.ms === definitions.CAMPUS_QUIZ_REVEAL_TIME_MS && !t.cancelled).at(-1).fn();
}
function answer(player, correct = true) {
    const state = player.s.data.campusQuizQuestions;
    const floor = definitions.CAMPUS_QUIZ_FLOORS.find(f => (f.id === state.correctFloorId) === correct);
    player.player.position = { x: floor.x, y: 0, z: floor.z };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('each player draws 15 unique questions with private answer maps and fresh replay sets', () => {
    const h = harness(), a = h.add('a'), b = h.add('b');
    const original = JSON.stringify(questions);
    let previous = [];
    for (let i = 0; i < 40; i++) {
        h.startLobby(h.io); h.startRound(h.io);
        for (const [index, p] of [a, b].entries()) {
            const state = p.s.data.campusQuizQuestions;
            assert.equal(state.questionIds.length, 15);
            assert.equal(new Set(state.questionIds).size, 15);
            const set = [...state.questionIds].sort().join(',');
            assert.notEqual(set, previous[index]); previous[index] = set;
            const payload = p.s.events.filter(e => e.event === 'campusQuiz:question').at(-1).data;
            assert.equal(payload.id, state.questionIds[0]);
            assert.equal(payload.correctOptionId, undefined);
            assert.equal(payload.explanation, undefined);
            assert.equal(payload.points, 0);
            const correctText = state.currentQuestion.options.find(o => o.id === state.currentQuestion.correctOptionId).text;
            assert.equal(payload.options.find(o => o.floorId === state.correctFloorId).text, correctText);
        }
        assert.notDeepEqual(a.s.data.campusQuizQuestions.questionIds, b.s.data.campusQuizQuestions.questionIds);
    }
    assert.equal(JSON.stringify(questions), original);
    h.setRandom(() => 0);
    h.startLobby(h.io); h.startRound(h.io);
    const previousSet = [...a.s.data.campusQuizQuestions.questionIds].sort().join(',');
    h.startLobby(h.io); h.startRound(h.io);
    assert.notEqual([...a.s.data.campusQuizQuestions.questionIds].sort().join(','), previousSet);
});

test('only 15 correct earns 100 once; life loss preserves lists and other players progress', async () => {
    const h = harness(), good = h.add('good'), mixed = h.add('mixed'), bad = h.add('bad');
    h.startLobby(h.io); h.startRound(h.io);
    const spectator = h.add('spectator');
    const lists = [good, mixed, bad].map(p => [...p.s.data.campusQuizQuestions.questionIds]);
    for (let i = 0; i < 15; i++) {
        for (const [index, p] of [good, mixed, bad].entries()) {
            assert.deepEqual([...p.s.data.campusQuizQuestions.questionIds], lists[index]);
            if (p.s.data.campusQuizEliminated) continue;
            const q = p.s.data.campusQuizQuestions.currentPublicQuestion;
            assert.equal(q.questionNumber, i + 1); assert.equal(q.totalQuestions, 15);
            answer(p, p === good || (p === mixed && i !== 0));
        }
        const q = h.quizState.currentQuestion;
        h.evaluateQuestion(h.io, h.quizState.roundId - 1, q.id);
        assert.equal(h.quizState.phase, 'QUESTION');
        h.evaluateQuestion(h.io); h.evaluateQuestion(h.io);
        assert.equal(good.s.data.campusQuizScore, 0);
        assert.equal(mixed.s.data.campusQuizScore, 0);
        assert.equal(good.s.data.campusQuizLives, 3);
        assert.equal(mixed.s.data.campusQuizLives, 2);
        assert.equal(bad.s.data.campusQuizLives, Math.max(0, 2 - i));
        assert.equal(bad.s.data.campusQuizAnsweredQuestions.size, Math.min(i + 1, 3));
        assert.equal(bad.s.data.campusQuizEliminated, i >= 2);
        next(h);
        if (i < 14) {
            assert.equal(h.quizState.phase, 'QUESTION');
            h.evaluateQuestion(h.io, h.quizState.roundId, q.id);
            assert.equal(h.quizState.phase, 'QUESTION');
        }
    }
    await h.finishRound(h.io); await settle(); await h.finishRound(h.io);
    assert.equal(h.quizState.phase, 'FINISHED');
    assert.deepEqual(h.rewards, [{ id: 'good', points: 100 }]);
    assert.equal(good.s.events.filter(e => e.event === 'campusQuiz:lifeResult').length, 15);
    assert.equal(bad.s.events.filter(e => e.event === 'campusQuiz:question').length, 3);
    assert.equal(spectator.s.events.filter(e => e.event === 'campusQuiz:lifeResult').length, 0);
    assert.ok(bad.s.events.some(e => e.event === 'campusQuiz:teleport' && e.data.reason === 'eliminated'));
    for (const p of [good, mixed, bad]) {
        const results = p.s.events.filter(e => e.event === 'campusQuiz:finished');
        assert.equal(results.length, 1);
        assert.equal(results[0].data.pointsEarned, p === good ? 100 : 0);
        assert.equal(results[0].data.completed, p === good);
    }
    good.s.data.inCampusQuiz = true;
    const replay = good.s.handlers.get('campusQuiz:playAgain');
    replay({ roundId: h.quizState.roundId - 1 }); assert.equal(h.quizState.phase, 'FINISHED');
    replay({ roundId: h.quizState.roundId }); replay({ roundId: h.quizState.roundId });
    assert.equal(h.quizState.phase, 'LOBBY');
    h.startRound(h.io);
    assert.equal(good.s.data.campusQuizScore, 0);
    assert.equal(bad.s.data.campusQuizLives, 3);
    assert.equal(bad.s.data.campusQuizAnsweredQuestions.size, 0);
    assert.notDeepEqual([...good.s.data.campusQuizQuestions.questionIds], lists[0]);
});

test('three wrong or missing answers end the round early with zero reward', async () => {
    const h = harness(), a = h.add('a');
    h.startLobby(h.io); h.startRound(h.io);
    const list = a.s.data.campusQuizQuestions.questionIds;
    for (let i = 0; i < 3; i++) {
        a.player.position = { x: 0, y: 0, z: 0 };
        h.evaluateQuestion(h.io); next(h);
        assert.equal(a.s.data.campusQuizQuestions.questionIds, list);
    }
    await settle();
    assert.equal(h.quizState.phase, 'FINISHED');
    assert.equal(h.rewards.length, 0);
    const result = a.s.events.find(e => e.event === 'campusQuiz:finished').data;
    assert.equal(result.pointsEarned, 0); assert.equal(result.livesRemaining, 0);
    assert.equal(result.completed, false);
});

test('an interrupted round cannot earn points and registration is idempotent', async () => {
    const h = harness(), a = h.add('a');
    h.registerCampusQuizSocket(h.io, a.s, () => a.player);
    assert.equal(a.s.handlers.size, 5);
    h.startLobby(h.io); h.startRound(h.io);
    answer(a); h.evaluateQuestion(h.io);
    await h.finishRound(h.io);
    assert.equal(h.rewards.length, 0);
});
