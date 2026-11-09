import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepCost, reach } from '../src/rules/movement.js';
import { TERRAINS, ROWS } from '../src/config.js';
import { key, unkey, neighbors } from '../src/rules/hex.js';
import { testMap } from './fixtures.js';

const map = testMap({ forest: ['9,0', '5,5'], mountain: ['9,8'], rivers: [['13,4', '12,4'], ['13,0', '14,0']], roads: [['13,4', '12,4'], ['4,5', '5,5'], ['9,9', '9,8']] });

test('suivre une route coûte 1 PM, même sur un pont', () => {
  assert.equal(stepCost(map, '13,4', '12,4', true), 1);
});

test('une route en forêt coûte 1 PM, blindés compris', () => {
  assert.equal(stepCost(map, '4,5', '5,5', true), 1);
  assert.equal(stepCost(map, '4,5', '5,5', false), 1);
});

test('entrer en montagne coûte 3 PM à l\'infanterie et 4 aux blindés', () => {
  assert.equal(stepCost(map, '8,8', '9,8', false), 3);
  assert.equal(stepCost(map, '8,8', '9,8', true), 4);
});

test('une route en montagne (col) coûte 1 PM', () => {
  assert.equal(stepCost(map, '9,9', '9,8', true), 1);
});

test('entrer en forêt coûte 2 PM à l\'infanterie et 3 aux blindés', () => {
  assert.equal(stepCost(map, '8,0', '9,0', false), 2);
  assert.equal(stepCost(map, '8,0', '9,0', true), 3);
});

test('traverser une rivière hors pont ajoute 2 PM', () => {
  assert.equal(stepCost(map, '13,0', '14,0', false), 3);
});

test('le coût d\'un pas se lit dans la table des terrains', () => {
  const before = TERRAINS.forest.cost.inf;
  TERRAINS.forest.cost.inf = 5;
  try { assert.equal(stepCost(map, '8,0', '9,0', false), 5); }
  finally { TERRAINS.forest.cost.inf = before; }
});

const inf = (id, side, pos, mp, ma = 4) => ({ id, side, pos, mp, type: 'inf', v: [2, 3, ma], rv: [1, 2, ma], max: 2, steps: 2, oos: 0, dead: false });

test('entrer dans une zone de contrôle ennemie arrête le mouvement', () => {
  const me = inf('a', 'blue', '5,5', 4);
  const state = { map, units: [me, inf('x', 'red', '7,5', 4)] };
  const r = reach(state, me);
  assert.equal(r.get('6,5').zoc, true);
  assert.equal(r.has('7,5'), false);
  for (const [, step] of r) for (const h of step.path.slice(1, -1)) assert.notEqual(h, '6,5');
});

test('une unité ne peut pas dépenser plus que ses PM restants', () => {
  const me = inf('a', 'blue', '8,0', 1);
  assert.equal(reach({ map, units: [me] }, me).has('9,0'), false);
});

test('une unité qui n\'a pas encore bougé peut toujours avancer d\'un hexagone', () => {
  const me = inf('a', 'blue', '8,0', 1, 1);
  assert.equal(reach({ map, units: [me] }, me).get('9,0').cost, 1);
});

// Rivière entre les colonnes 5 et 6 sur toute la hauteur, pont en 5,0 - 6,0
const riverMap = testMap({
  rivers: Array.from({ length: ROWS }, (_, r) => key(5, r)).flatMap(k => neighbors(k).filter(n => unkey(n)[0] === 6).map(n => [k, n])),
  roads: [['5,0', '6,0']],
});

test('traverser une rivière hors pont arrête le mouvement', () => {
  const me = inf('a', 'blue', '5,5', 8);
  const r = reach({ map: riverMap, units: [me] }, me);
  assert.equal(r.get('6,5').stop, true);
  assert.equal(r.get('6,5').zoc, false);
  assert.equal(r.has('7,5'), false);
});

test('franchir une rivière par un pont n\'arrête pas le mouvement', () => {
  const me = inf('a', 'blue', '5,0', 4);
  const r = reach({ map: riverMap, units: [me] }, me);
  assert.equal(r.get('6,0').stop, false);
  assert.deepEqual(r.get('7,0').path, ['5,0', '6,0', '7,0']);
});

test('on ne peut pas finir son mouvement sur une pile déjà pleine', () => {
  const me = inf('a', 'blue', '5,5', 4);
  const state = { map, units: [me, inf('b', 'blue', '6,5', 0), inf('c', 'blue', '6,5', 0)] };
  assert.equal(reach(state, me).has('6,5'), false);
});
