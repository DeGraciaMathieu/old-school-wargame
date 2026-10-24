import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepCost } from '../src/rules/movement.js';

test('suivre une route coûte ½ PM, même sur un pont', () => {
  assert.equal(stepCost('13,4', '12,4', true), 0.5);
});

test('entrer en forêt coûte 2 PM à l\'infanterie et 3 aux blindés', () => {
  assert.equal(stepCost('8,0', '9,0', false), 2);
  assert.equal(stepCost('8,0', '9,0', true), 3);
});

test('traverser une rivière hors pont ajoute 2 PM', () => {
  assert.equal(stepCost('13,0', '14,0', false), 3);
});
