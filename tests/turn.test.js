import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginPhase, nextPhase, phaseOf } from '../src/rules/turn.js';
import { createGame } from '../src/state/store.js';
import { testMap } from './fixtures.js';

const map = testMap({ towns: { cap: { at: '2,7', t: 'city', vp: 3 } } });
const unit = (id, side, pos, extra = {}) => ({
  id, side, pos, name: id, type: 'inf', v: [2, 3, 4], rv: [1, 2, 4], max: 2, steps: 2,
  oos: 0, mp: 0, attacked: false, dead: false, arrived: true, ...extra,
});
const arrivals = [{ turn: 2, side: 'red', text: '1 blindé, bord est' }, { turn: 5, side: 'blue', text: '1 blindé, bord ouest' }];
const game = (phase, turn, units, control = {}) => ({ mode: 'hotseat', turn, phase, control, attacked: [], log: [], over: false, units, map, arrivals });

test('les phases s\'enchaînent, et la partie s\'arrête après la dernière phase du tour 8', () => {
  assert.deepEqual(nextPhase({ turn: 2, phase: 1 }), { turn: 2, phase: 2 });
  assert.deepEqual(nextPhase({ turn: 2, phase: 3 }), { turn: 3, phase: 0 });
  assert.equal(nextPhase({ turn: 8, phase: 3 }), null);
});

test('les Bleus ouvrent les tours impairs, les Rouges les tours pairs', () => {
  const order = t => [0, 1, 2, 3].map(phase => phaseOf({ turn: t, phase })).map(p => p.side + ':' + p.kind);
  assert.deepEqual(order(1), ['blue:move', 'blue:combat', 'red:move', 'red:combat']);
  assert.deepEqual(order(2), ['red:move', 'red:combat', 'blue:move', 'blue:combat']);
  assert.equal(phaseOf({ turn: 2, phase: 0 }).label, 'Mouvement rouge');
});

test('au début de son mouvement, un camp reçoit ses PM', () => {
  const { state } = beginPhase(game(2, 1, [unit('a', 'red', '12,7')]));
  assert.equal(state.units[0].mp, 4);
});

test('une unité encerclée est coupée, puis isolée, puis perd un pas', () => {
  let state = game(2, 1, [unit('a', 'red', '5,5'), unit('x', 'blue', '4,5'), unit('y', 'blue', '6,5')]);
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
  const tank = unit('r8', 'red', null, { arrived: false, turn: 2, entry: ['15,7', '15,8', '15,6'] });
  const { state, arrived } = beginPhase(game(0, 2, [tank, unit('i', 'blue', '15,7')]));
  assert.equal(arrived, 1);
  assert.equal(state.units[0].pos, '15,8');
  assert.match(state.log[0].text, /^Renforts : 1 blindé, bord est/);
});

test('des renforts qui entrent dans une ville libre tenue par l\'ennemi la reprennent', () => {
  const tank = unit('b8', 'blue', null, { arrived: false, turn: 5, entry: ['2,7'] });
  const { state, captures } = beginPhase(game(0, 5, [tank], { cap: 'red' }));
  assert.equal(state.control.cap, 'blue');
  assert.deepEqual(captures, [{ id: 'cap', side: 'blue' }]);
});

test('une partie neuve porte sa graine, sa carte, ses renforts et le contrôle initial des villes', () => {
  const state = createGame('hotseat', 42);
  assert.equal(state.seed, 42);
  assert.deepEqual(createGame('hotseat', 42).map, state.map);
  assert.equal(state.units.filter(u => u.pos).length, 14);
  assert.equal(state.arrivals.length, 4);
  for (const [id, t] of Object.entries(state.map.towns))
    assert.equal(state.control[id], { west: 'blue', east: 'red', center: null }[t.band]);
});

test('les renforts rouges entrent par le bord est au tour prévu', () => {
  const s = createGame('hotseat', 42);
  const { state, arrived } = beginPhase({ ...s, turn: 3, phase: 2 });
  assert.equal(arrived, 2);
  for (const u of state.units.filter(u => u.side === 'red' && u.turn === 3)) assert.ok(s.map.exits.east.includes(u.pos), u.pos);
});

test('le début de phase ne modifie pas l\'état reçu', () => {
  const state = game(2, 1, [unit('a', 'red', '5,5'), unit('x', 'blue', '4,5'), unit('y', 'blue', '6,5')]);
  const before = structuredClone(state);
  beginPhase(state);
  assert.deepEqual(state, before);
});
