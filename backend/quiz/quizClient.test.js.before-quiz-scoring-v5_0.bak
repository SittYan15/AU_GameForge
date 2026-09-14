import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function clientHarness() {
    const elements = [];
    function element() {
        const el = { style: {}, children: [], classList: { toggle() {}, remove() {} },
            append(...nodes) { this.children.push(...nodes); },
            appendChild(node) { this.children.push(node); }, setAttribute() {}, addEventListener(event, fn) { this[event] = fn; },
            remove() { this.removed = true; } };
        elements.push(el); return el;
    }
    const document = { createElement: element, head: element(), body: element(), exitPointerLock() {} };
    const window = { dispatchEvent() {}, setTimeout: () => 1, clearTimeout() {} };
    const listeners = new Map();
    const sent = [];
    const socket = { connected: true, on(event, fn) { const list = listeners.get(event) || []; list.push(fn); listeners.set(event, list); },
        off(event, fn) { listeners.set(event, listeners.get(event).filter(f => f !== fn)); }, emit(event, data) { sent.push({ event, data }); } };
    const questionCalls = [];
    const scene = { metadata: { campusQuizArena: { setQuestion: q => questionCalls.push(q) } } };
    const player = {};
    const context = vm.createContext({ document, window, console, CustomEvent: class {} });
    const source = readFileSync(new URL('../../frontend/quiz/quizClient.js', import.meta.url), 'utf8').replace('export function', 'function');
    vm.runInContext(source + '\nglobalThis.create = createCampusQuizClient;', context);
    const client = context.create(scene, player, socket);
    return { client, elements, questionCalls, listeners, sent,
        recreate: () => context.create(scene, player, socket),
        receive(event, data) { for (const fn of listeners.get(`campusQuiz:${event}`) || []) fn(data); },
        message: () => elements.find(e => e.id === 'campusQuizResult'),
        summary: () => elements.find(e => e.id === 'campusQuizResult').children[0],
        replay: () => elements.find(e => e.id === 'campusQuizPlayAgain'),
        status: () => elements.find(e => e.id === 'campusQuizSurvivalHud').children[2] };
}

test('client renders progress and final totals; duplicate and stale events do not reset scores', () => {
    const h = clientHarness();
    assert.equal(h.recreate(), h.client);
    assert.equal(h.listeners.get('campusQuiz:lifeResult').length, 1);
    h.receive('started', { roundId: 0, questionsPerRound: 15 });
    h.receive('roundStarted', { roundId: 1, totalQuestions: 15 });
    for (let i = 1; i <= 15; i++) {
        const question = { roundId: 1, id: `q${i}`, questionNumber: i, totalQuestions: 15 };
        h.receive('question', question); h.receive('question', question);
        assert.match(h.status().innerHTML, new RegExp(`${i} / 15`));
        const result = { roundId: 1, questionId: `q${i}`, questionNumber: i, correct: i <= 12,
            selectedFloorId: 'A', score: 0, pointsEarned: 0, livesRemaining: Math.max(0, 3 - Math.max(0, i - 12)), eliminated: i === 15, correctCount: Math.min(i, 12), wrongCount: Math.max(0, i - 12) };
        h.receive('lifeResult', result); h.receive('lifeResult', result);
        h.receive('roundStarted', { roundId: 1, totalQuestions: 15 });
        assert.match(h.status().innerHTML, new RegExp(result.score.toLocaleString()));
    }
    assert.equal(h.questionCalls.length, 15);
    const hearts = h.elements.find(e => e.id === 'campusQuizSurvivalHud').children[1];
    assert.equal(hearts.textContent, '♡♡♡');
    assert.notEqual(hearts.style.display, 'none');
    assert.match(h.elements.find(e => e.id === 'campusQuizSurvivalMessage').textContent, /GAME OVER/);
    h.receive('lifeResult', { roundId: 0, questionId: 'q15', questionNumber: 15, score: 9999 });
    h.receive('finished', { roundId: 1, participated: true, correctCount: 12, wrongCount: 3, score: 0,
        totalQuestions: 15, rank: 2, playerCount: 3 });
    assert.equal(h.summary().textContent, 'Correct: 12 / 15\nFinal Score: 0 / 100\nRank: 2 of 3');
    h.receive('finished', { roundId: 1, participated: true, score: 9999 });
    assert.match(h.summary().textContent, /0 \/ 100/);
    h.replay().click(); h.replay().click();
    assert.equal(h.sent.filter(e => e.event === 'campusQuiz:playAgain').length, 1);
    h.receive('phase', 'LOBBY');
    assert.equal(h.message().style.display, 'none');
    h.receive('roundStarted', { roundId: 2, totalQuestions: 15 });
    h.receive('question', { roundId: 2, id: 'q15', questionNumber: 1, totalQuestions: 15 });
    assert.equal(h.questionCalls.length, 16);
    assert.match(h.status().innerHTML, /1 \/ 15/);
    h.receive('left');
    assert.equal(h.message().style.display, 'none');
    h.client.dispose();
    for (const list of h.listeners.values()) assert.equal(list.length, 0);
});
