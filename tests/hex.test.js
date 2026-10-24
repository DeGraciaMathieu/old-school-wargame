import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neighbors, dist, hexLine } from '../src/rules/hex.js';

test('un hexagone intérieur a six voisins, tous à distance 1', () => {
  const around = neighbors('5,5');
  assert.equal(around.length, 6);
  for (const n of around) assert.equal(dist('5,5', n), 1);
});

test('un hexagone en coin de carte n\'a que les voisins présents sur la carte', () => {
  assert.deepEqual(neighbors('0,0').sort(), ['0,1', '1,0']);
});

test('une ligne entre deux hexagones est continue et relie les deux extrémités', () => {
  const line = hexLine('15,3', '2,7');
  assert.equal(line[0], '15,3');
  assert.equal(line.at(-1), '2,7');
  assert.equal(line.length, dist('15,3', '2,7') + 1);
  for (let i = 1; i < line.length; i++) assert.equal(dist(line[i - 1], line[i]), 1);
});
