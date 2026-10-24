import { test } from 'node:test';
import assert from 'node:assert/strict';
import { odds, canTarget, resolveCombat } from '../src/rules/combat.js';
import { dist } from '../src/rules/hex.js';
import { COLL } from '../src/config.js';

const unit = (id, side, pos, type, atk, def) =>
  ({ id, side, pos, type, v: [atk, def, 4], rv: [1, 1, 4], max: 2, steps: 2, oos: 0, dead: false, attacked: false });

test('un 3:1 contre Bastogne est décalé de deux colonnes (ville)', () => {
  const atk = [unit('a', 'de', '3,7', 'inf', 6, 4)];
  const state = { units: [...atk, unit('d', 'us', '2,7', 'inf', 1, 2)], attacked: [] };
  const o = odds(state, '2,7', atk);
  assert.equal(COLL[o.col], '3:1');
  assert.equal(COLL[o.fin], '3:2');
});

test('le rapport est arrondi en faveur du défenseur', () => {
  const atk = [unit('a', 'de', '4,5', 'inf', 5, 4)];
  const state = { units: [...atk, unit('d', 'us', '5,5', 'inf', 1, 2)], attacked: [] };
  assert.equal(COLL[odds(state, '5,5', atk).fin], '2:1');
});

test('des blindés contre un défenseur sans blindés en terrain dégagé gagnent une colonne', () => {
  const atk = [unit('a', 'de', '4,5', 'arm', 4, 4)];
  const state = { units: [...atk, unit('d', 'us', '5,5', 'inf', 1, 2)], attacked: [] };
  assert.equal(COLL[odds(state, '5,5', atk).fin], '3:1');
});

test('sous 1:2, l\'attaque est impossible', () => {
  const atk = [unit('a', 'de', '4,5', 'inf', 1, 4)];
  const state = { units: [...atk, unit('d', 'us', '5,5', 'inf', 1, 5)], attacked: [] };
  assert.equal(odds(state, '5,5', atk).fin, -1);
});

test('un hexagone ne peut être attaqué qu\'une fois par phase', () => {
  const units = [unit('a', 'de', '4,5', 'inf', 5, 4), unit('d', 'us', '5,5', 'inf', 1, 2)];
  assert.equal(canTarget({ units, attacked: [] }, '5,5', 'de'), true);
  assert.equal(canTarget({ units, attacked: ['5,5'] }, '5,5', 'de'), false);
});

// Dé pipé : le rng renvoie la valeur qui produit exactement ce résultat de d6
const die = n => () => (n - 1) / 6 + 0.01;
const battle = (atkValue, defValue) => ({
  turn: 1, log: [], attacked: [], control: {},
  units: [unit('a', 'de', '4,5', 'inf', atkValue, 4), unit('d', 'us', '5,5', 'inf', 1, defValue)],
});

test('à 6:1, un 4 au dé élimine le défenseur et ouvre la case à l\'attaquant', () => {
  const state = battle(12, 2);
  const { state: next, result } = resolveCombat(state, '5,5', ['a'], die(4));
  assert.equal(result.code, 'DE');
  assert.equal(next.units.find(u => u.id === 'd').dead, true);
  assert.deepEqual(result.adv, ['a']);
  assert.match(next.log[0].text, /dé 4/);
});

test('la résolution ne modifie pas l\'état reçu', () => {
  const state = battle(12, 2);
  const before = structuredClone(state);
  resolveCombat(state, '5,5', ['a'], die(4));
  assert.deepEqual(state, before);
});

test('un D2 fait reculer le défenseur de deux hexagones en s\'éloignant des attaquants', () => {
  const { state: next, result } = resolveCombat(battle(12, 2), '5,5', ['a'], die(1));
  assert.equal(result.code, 'D2');
  const d = next.units.find(u => u.id === 'd');
  assert.equal(d.steps, 2);
  assert.equal(dist(d.pos, '4,5'), 3);
});

test('à 1:2, un 1 au dé coûte un pas à l\'attaquant', () => {
  const { state: next, result } = resolveCombat(battle(1, 2), '5,5', ['a'], die(1));
  assert.equal(result.code, 'A1');
  assert.equal(next.units.find(u => u.id === 'a').steps, 1);
});
