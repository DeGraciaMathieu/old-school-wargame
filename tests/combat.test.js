import { test } from 'node:test';
import assert from 'node:assert/strict';
import { odds, canTarget, resolveCombat } from '../src/rules/combat.js';
import { dist, unkey } from '../src/rules/hex.js';
import { COLL, TERRAINS } from '../src/config.js';
import { testMap } from './fixtures.js';

const map = testMap({ towns: { cap: { at: '2,7', t: 'city', vp: 3 } } });
const unit = (id, side, pos, type, atk, def) =>
  ({ id, side, pos, type, v: [atk, def, 4], rv: [1, 1, 4], max: 2, steps: 2, oos: 0, dead: false, attacked: false });

test('un 3:1 contre une ville est décalé de deux colonnes', () => {
  const atk = [unit('a', 'red', '3,7', 'inf', 6, 4)];
  const state = { units: [...atk, unit('d', 'blue', '2,7', 'inf', 1, 2)], attacked: [], map };
  const o = odds(state, '2,7', atk);
  assert.equal(COLL[o.col], '3:1');
  assert.equal(COLL[o.fin], '3:2');
});

test('un défenseur en montagne décale le rapport de deux colonnes, sans bonus des blindés', () => {
  const m = testMap({ mountain: ['5,5'] });
  const atk = [unit('a', 'red', '4,5', 'arm', 6, 4)];
  const state = { units: [...atk, unit('d', 'blue', '5,5', 'inf', 1, 2)], attacked: [], map: m };
  assert.deepEqual(odds(state, '5,5', atk).shifts, [['Défenseur en montagne', -2]]);
  assert.equal(COLL[odds(state, '5,5', atk).fin], '3:2');
});

test('le rapport est arrondi en faveur du défenseur', () => {
  const atk = [unit('a', 'red', '4,5', 'inf', 5, 4)];
  const state = { units: [...atk, unit('d', 'blue', '5,5', 'inf', 1, 2)], attacked: [], map };
  assert.equal(COLL[odds(state, '5,5', atk).fin], '2:1');
});

test('des blindés contre un défenseur sans blindés en terrain dégagé gagnent une colonne', () => {
  const atk = [unit('a', 'red', '4,5', 'arm', 4, 4)];
  const state = { units: [...atk, unit('d', 'blue', '5,5', 'inf', 1, 2)], attacked: [], map };
  assert.equal(COLL[odds(state, '5,5', atk).fin], '3:1');
});

test('les décalages de terrain se lisent dans la table des terrains', () => {
  const atk = [unit('a', 'red', '3,7', 'inf', 6, 4)];
  const state = { units: [...atk, unit('d', 'blue', '2,7', 'inf', 1, 2)], attacked: [], map };
  const before = TERRAINS.city.shift;
  TERRAINS.city.shift = -3;
  try { assert.deepEqual(odds(state, '2,7', atk).shifts, [['Défenseur dans la ville', -3]]); }
  finally { TERRAINS.city.shift = before; }
});

test('sous 1:2, l\'attaque est impossible', () => {
  const atk = [unit('a', 'red', '4,5', 'inf', 1, 4)];
  const state = { units: [...atk, unit('d', 'blue', '5,5', 'inf', 1, 5)], attacked: [], map };
  assert.equal(odds(state, '5,5', atk).fin, -1);
});

test('un hexagone ne peut être attaqué qu\'une fois par phase', () => {
  const units = [unit('a', 'red', '4,5', 'inf', 5, 4), unit('d', 'blue', '5,5', 'inf', 1, 2)];
  assert.equal(canTarget({ units, attacked: [], map }, '5,5', 'red'), true);
  assert.equal(canTarget({ units, attacked: ['5,5'], map }, '5,5', 'red'), false);
});

// Dé pipé : le rng renvoie la valeur qui produit exactement ce résultat de d6
const die = n => () => (n - 1) / 6 + 0.01;
const battle = (atkValue, defValue, atkSide = 'red', defSide = 'blue', atkPos = '4,5') => ({
  turn: 1, log: [], attacked: [], control: {}, map,
  units: [unit('a', atkSide, atkPos, 'inf', atkValue, 4), unit('d', defSide, '5,5', 'inf', 1, defValue)],
});

test('à 6:1, un 4 au dé élimine le défenseur et ouvre la case à l\'attaquant', () => {
  const { state: next, result } = resolveCombat(battle(12, 2), '5,5', ['a'], die(4));
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

test('un défenseur bleu recule vers l\'ouest, un rouge vers l\'est', () => {
  // Attaque venue du nord : à 4:1, un 1 au dé donne D1, et le repli suit le bord du camp
  const blue = resolveCombat(battle(8, 2, 'red', 'blue', '5,4'), '5,5', ['a'], die(1));
  const red = resolveCombat(battle(8, 2, 'blue', 'red', '5,4'), '5,5', ['a'], die(1));
  assert.equal(blue.result.code, 'D1');
  const col = r => unkey(r.state.units.find(u => u.id === 'd').pos)[0];
  assert.ok(col(blue) < col(red));
});

test('à 1:2, un 1 au dé coûte un pas à l\'attaquant', () => {
  const { state: next, result } = resolveCombat(battle(1, 2), '5,5', ['a'], die(1));
  assert.equal(result.code, 'A1');
  assert.equal(next.units.find(u => u.id === 'a').steps, 1);
});
