import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginPhase, nextPhase } from '../src/rules/turn.js';

const unit = (id, side, pos, extra = {}) => ({
  id, side, pos, name: id, type: 'inf', v: [2, 3, 4], rv: [1, 2, 4], max: 2, steps: 2,
  oos: 0, mp: 0, attacked: false, dead: false, arrived: true, ...extra,
});
const game = (phase, turn, units, control = {}) => ({ mode: 'hotseat', turn, phase, control, attacked: [], log: [], over: false, units });

test('les phases s\'enchaînent, et la partie s\'arrête après les combats américains du tour 8', () => {
  assert.deepEqual(nextPhase({ turn: 2, phase: 1 }), { turn: 2, phase: 2 });
  assert.deepEqual(nextPhase({ turn: 2, phase: 3 }), { turn: 3, phase: 0 });
  assert.equal(nextPhase({ turn: 8, phase: 3 }), null);
});

test('au début de son mouvement, un camp reçoit ses PM', () => {
  const { state } = beginPhase(game(2, 1, [unit('a', 'us', '2,7')]));
  assert.equal(state.units[0].mp, 4);
});

test('une unité encerclée est coupée, puis isolée, puis perd un pas', () => {
  let state = game(2, 1, [unit('a', 'us', '5,5'), unit('x', 'de', '4,5'), unit('y', 'de', '6,5')]);
  const statuses = [];
  for (let i = 0; i < 3; i++) {
    const r = beginPhase(state);
    state = r.state;
    statuses.push(r.news[0][1]);
  }
  assert.deepEqual(statuses, ['Coupée', 'Isolée', '−1 pas']);
  assert.equal(state.units[0].steps, 1);
  assert.equal(state.units[0].mp, 2);
});

test('les renforts entrent par la première case d\'entrée libre', () => {
  const lehr = unit('pl130', 'de', null, { arrived: false, turn: 2, entry: ['15,7', '15,8', '15,6'] });
  const { state, arrived } = beginPhase(game(0, 2, [lehr, unit('i', 'us', '15,7')]));
  assert.equal(arrived, 1);
  assert.equal(state.units[0].pos, '15,8');
  assert.match(state.log[0].text, /^Renforts : Panzer-Lehr/);
});

test('des renforts qui entrent dans une ville libre tenue par l\'ennemi la reprennent', () => {
  const desobry = unit('desobry', 'us', null, { arrived: false, turn: 5, entry: ['2,7'] });
  const { state, captures } = beginPhase(game(2, 5, [desobry], { bastogne: 'de' }));
  assert.equal(state.control.bastogne, 'us');
  assert.deepEqual(captures, [{ id: 'bastogne', side: 'us' }]);
});

test('le début de phase ne modifie pas l\'état reçu', () => {
  const state = game(2, 1, [unit('a', 'us', '5,5'), unit('x', 'de', '4,5'), unit('y', 'de', '6,5')]);
  const before = structuredClone(state);
  beginPhase(state);
  assert.deepEqual(state, before);
});
