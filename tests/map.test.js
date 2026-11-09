import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMap, eastOf } from '../src/rules/map.js';
import { SAILLANT } from '../src/config.js';

const map = buildMap(SAILLANT);

test('la carte du scénario est toujours la même (graine 1944)', () => {
  assert.deepEqual(buildMap(SAILLANT), map);
  // Empreinte relevée sur le prototype d'origine
  assert.equal(Object.values(map.hex).filter(h => h.t === 'forest').length, 73);
  assert.equal(Object.keys(map.rivers).length, 44);
  assert.equal(Object.keys(map.roads).length, 63);
});

test('la carte se sérialise en JSON sans perte', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(map)), map);
});

test('Bastogne est une ville, Clervaux un village', () => {
  assert.equal(map.hex['2,7'].t, 'city');
  assert.equal(map.hex['10,4'].t, 'town');
});

test('la route Dasburg–Marnach franchit l\'Our par un pont', () => {
  assert.equal(map.rivers['12,4|13,4'], 'Our');
  assert.ok(map.roads['12,4|13,4']);
});

test('Dasburg est à l\'est de l\'Our, Marnach à l\'ouest', () => {
  const our = SAILLANT.rivers[0];
  assert.equal(eastOf(our, map, '14,3'), true);
  assert.equal(eastOf(our, map, '12,4'), false);
});
