import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vpOf, townTakenBy, outcome } from '../src/rules/victory.js';

test('les Allemands marquent les PV des villes qu\'ils contrôlent', () => {
  const state = { control: { bastogne: 'de', wiltz: 'de', clervaux: 'us', noville: 'de' } };
  assert.equal(vpOf(state, 'de'), 7);
});

test('5 PV allemands donnent la victoire allemande, 3 ou 4 un nul, 2 ou moins la victoire américaine', () => {
  assert.equal(outcome(5), 'de');
  assert.equal(outcome(4), 'draw');
  assert.equal(outcome(3), 'draw');
  assert.equal(outcome(2), 'us');
});

test('entrer dans une ville libre la fait changer de camp', () => {
  assert.equal(townTakenBy({ units: [] }, 'de', '2,7'), 'bastogne');
});

test('une ville encore occupée par l\'ennemi ne change pas de camp', () => {
  const state = { units: [{ id: 'd', side: 'us', pos: '2,7', dead: false }] };
  assert.equal(townTakenBy(state, 'de', '2,7'), null);
});
