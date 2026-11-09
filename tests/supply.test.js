import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supplyOf, supplyPath } from '../src/rules/supply.js';
import { buildMap } from '../src/rules/map.js';
import { MAP_SEED } from '../src/config.js';

const map = buildMap(MAP_SEED);

const unit = (id, side, pos) => ({ id, side, pos, dead: false });

test('une unité américaine libre trace sa ligne jusqu\'au bord ouest', () => {
  const state = { map, units: [unit('a', 'us', '2,7')] };
  assert.ok(supplyOf(state, 'us').has('2,7'));
  const path = supplyPath(state, 'us', '2,7');
  assert.equal(path[0], '2,7');
  assert.equal(path.at(-1).split(',')[0], '0');
});

test('une unité encerclée par les zones de contrôle ennemies est coupée', () => {
  const state = { map, units: [unit('a', 'us', '5,5'), unit('x', 'de', '4,5'), unit('y', 'de', '6,5')] };
  assert.equal(supplyOf(state, 'us').has('5,5'), false);
  assert.equal(supplyPath(state, 'us', '5,5'), null);
});

test('une case en ZOC ennemie reste praticable si une unité amie l\'occupe', () => {
  const state = { map, units: [unit('a', 'us', '5,5'), unit('b', 'us', '5,4'), unit('x', 'de', '4,5'), unit('y', 'de', '6,5')] };
  assert.ok(supplyOf(state, 'us').has('5,5'));
});
