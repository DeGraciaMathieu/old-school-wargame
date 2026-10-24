import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMap, HEX, riverEdge, roadEdges, eastOfOur } from '../src/rules/map.js';
import { MAP_SEED } from '../src/config.js';

test('la carte du scénario est toujours la même (graine 1944)', () => {
  const again = buildMap(MAP_SEED);
  assert.deepEqual(again.HEX, HEX);
  // Empreinte relevée sur le prototype d'origine
  assert.equal(Object.values(HEX).filter(h => h.t === 'forest').length, 73);
  assert.equal(riverEdge.size, 44);
  assert.equal(roadEdges.size, 63);
});

test('Bastogne est une ville, Clervaux un village', () => {
  assert.equal(HEX['2,7'].t, 'city');
  assert.equal(HEX['10,4'].t, 'town');
});

test('la route Dasburg–Marnach franchit l\'Our par un pont', () => {
  assert.equal(riverEdge.get('12,4|13,4'), 'Our');
  assert.ok(roadEdges.has('12,4|13,4'));
});

test('Dasburg est à l\'est de l\'Our, Marnach à l\'ouest', () => {
  assert.equal(eastOfOur('14,3'), true);
  assert.equal(eastOfOur('12,4'), false);
});
