import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vals, atkOf, mpOf } from '../src/rules/units.js';

const panzer = { type: 'arm', v: [8, 5, 6], rv: [4, 3, 6], max: 2, steps: 2, oos: 0 };

test('une unité qui a perdu un pas combat avec ses valeurs réduites', () => {
  assert.deepEqual(vals({ ...panzer, steps: 1 }), [4, 3, 6]);
});

test('une unité coupée attaque à moitié (au moins 1) mais bouge normalement', () => {
  const cut = { ...panzer, oos: 1 };
  assert.equal(atkOf(cut), 4);
  assert.equal(mpOf(cut), 6);
  assert.equal(atkOf({ ...cut, v: [1, 2, 4] }), 1);
});

test('une unité isolée voit aussi son mouvement divisé par 2, arrondi au supérieur', () => {
  assert.equal(mpOf({ ...panzer, oos: 2, v: [8, 5, 7] }), 4);
});
