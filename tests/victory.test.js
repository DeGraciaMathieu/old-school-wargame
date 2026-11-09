import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vpOf, townTakenBy, outcome } from '../src/rules/victory.js';
import { testMap } from './fixtures.js';

const map = testMap({ towns: { a: { at: '2,7', t: 'city', vp: 5 }, b: { at: '7,9', vp: 2 }, c: { at: '10,4', vp: 1 }, d: { at: '3,5' } } });

test('un camp marque les PV des villes qu\'il contrôle', () => {
  const state = { map, control: { a: 'blue', b: 'blue', c: 'red', d: 'blue' } };
  assert.equal(vpOf(state, 'blue'), 7);
  assert.equal(vpOf(state, 'red'), 1);
});

test('une ville neutre ne rapporte de PV à personne', () => {
  const state = { map, control: { a: null, b: null, c: null, d: null } };
  assert.equal(vpOf(state, 'blue'), 0);
  assert.equal(vpOf(state, 'red'), 0);
});

test('un écart de VP_WIN_MARGIN PV donne la victoire, un écart moindre un nul', () => {
  assert.equal(outcome(5, 3), 'blue');
  assert.equal(outcome(3, 5), 'red');
  assert.equal(outcome(4, 3), 'draw');
  assert.equal(outcome(3, 3), 'draw');
});

test('entrer dans une ville libre la fait changer de camp', () => {
  assert.equal(townTakenBy({ map, units: [] }, 'red', '2,7'), 'a');
});

test('entrer dans une ville neutre la prend', () => {
  const state = { map, units: [], control: { a: null } };
  assert.equal(townTakenBy(state, 'blue', '2,7'), 'a');
});

test('une ville encore occupée par l\'ennemi ne change pas de camp', () => {
  const state = { map, units: [{ id: 'd', side: 'blue', pos: '2,7', dead: false }] };
  assert.equal(townTakenBy(state, 'red', '2,7'), null);
});
