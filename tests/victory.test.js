import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vpOf, townTakenBy, outcome } from '../src/rules/victory.js';
import { buildMap } from '../src/rules/map.js';
import { MAP_SEED } from '../src/config.js';

const map = buildMap(MAP_SEED);

test('les Allemands marquent les PV des villes qu\'ils contrôlent', () => {
  const state = { map, control: { bastogne: 'de', wiltz: 'de', clervaux: 'us', noville: 'de' } };
  assert.equal(vpOf(state, 'de'), 7);
});

test('5 PV allemands donnent la victoire allemande, 3 ou 4 un nul, 2 ou moins la victoire américaine', () => {
  assert.equal(outcome(5), 'de');
  assert.equal(outcome(4), 'draw');
  assert.equal(outcome(3), 'draw');
  assert.equal(outcome(2), 'us');
});

test('entrer dans une ville libre la fait changer de camp', () => {
  assert.equal(townTakenBy({ map, units: [] }, 'de', '2,7'), 'bastogne');
});

test('une ville encore occupée par l\'ennemi ne change pas de camp', () => {
  const state = { map, units: [{ id: 'd', side: 'us', pos: '2,7', dead: false }] };
  assert.equal(townTakenBy(state, 'de', '2,7'), null);
});
