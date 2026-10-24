import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepCost, reach } from '../src/rules/movement.js';

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

const inf = (id, side, pos, mp, ma = 4) => ({ id, side, pos, mp, type: 'inf', v: [2, 3, ma], rv: [1, 2, ma], max: 2, steps: 2, oos: 0, dead: false });

test('entrer dans une zone de contrôle ennemie arrête le mouvement', () => {
  const me = inf('a', 'us', '5,5', 4);
  const state = { units: [me, inf('x', 'de', '7,5', 4)] };
  const r = reach(state, me);
  assert.equal(r.get('6,5').zoc, true);
  assert.equal(r.has('7,5'), false);
  for (const [, step] of r) for (const h of step.path.slice(1, -1)) assert.notEqual(h, '6,5');
});

test('une unité ne peut pas dépenser plus que ses PM restants', () => {
  const me = inf('a', 'us', '8,0', 1);
  assert.equal(reach({ units: [me] }, me).has('9,0'), false);
});

test('une unité qui n\'a pas encore bougé peut toujours avancer d\'un hexagone', () => {
  const me = inf('a', 'us', '8,0', 1, 1);
  assert.equal(reach({ units: [me] }, me).get('9,0').cost, 1);
});

test('on ne peut pas finir son mouvement sur une pile déjà pleine', () => {
  const me = inf('a', 'us', '5,5', 4);
  const state = { units: [me, inf('b', 'us', '6,5', 0), inf('c', 'us', '6,5', 0)] };
  assert.equal(reach(state, me).has('6,5'), false);
});
