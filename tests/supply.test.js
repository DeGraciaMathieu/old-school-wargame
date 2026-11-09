import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supplyOf, supplyPath } from '../src/rules/supply.js';
import { COLS } from '../src/config.js';
import { neighbors } from '../src/rules/hex.js';
import { testMap } from './fixtures.js';

const map = testMap();
const unit = (id, side, pos) => ({ id, side, pos, dead: false });

test('les Bleus se ravitaillent par le bord ouest, les Rouges par le bord est', () => {
  const state = { map, units: [unit('a', 'blue', '2,7'), unit('b', 'red', '13,5')] };
  assert.ok(supplyOf(state, 'blue').has('2,7'));
  const blue = supplyPath(state, 'blue', '2,7'), red = supplyPath(state, 'red', '13,5');
  assert.equal(blue[0], '2,7');
  assert.equal(blue.at(-1).split(',')[0], '0');
  assert.equal(red.at(-1).split(',')[0], String(COLS - 1));
});

test('une unité encerclée par les zones de contrôle ennemies est coupée', () => {
  const state = { map, units: [unit('a', 'blue', '5,5'), unit('x', 'red', '4,5'), unit('y', 'red', '6,5')] };
  assert.equal(supplyOf(state, 'blue').has('5,5'), false);
  assert.equal(supplyPath(state, 'blue', '5,5'), null);
});

test('une case en ZOC ennemie reste praticable si une unité amie l\'occupe', () => {
  const state = { map, units: [unit('a', 'blue', '5,5'), unit('b', 'blue', '5,4'), unit('x', 'red', '4,5'), unit('y', 'red', '6,5')] };
  assert.ok(supplyOf(state, 'blue').has('5,5'));
});

// Rivières sans pont autour de 5,5, sauf vers la case laissée ouverte
const pocket = open => testMap({ rivers: neighbors('5,5').filter(n => n !== open).map(n => ['5,5', n]) });

test('la ligne de ravitaillement ne fait jamais un pas vers le bord adverse', () => {
  const state = { map: pocket('6,5'), units: [unit('a', 'blue', '5,5')] };
  assert.equal(supplyOf(state, 'blue').has('5,5'), false);
  assert.equal(supplyPath(state, 'blue', '5,5'), null);
});

test('la ligne de ravitaillement peut passer par une case de la même colonne', () => {
  const state = { map: pocket('5,6'), units: [unit('a', 'blue', '5,5')] };
  assert.ok(supplyOf(state, 'blue').has('5,5'));
  assert.equal(supplyPath(state, 'blue', '5,5')[1], '5,6');
});
