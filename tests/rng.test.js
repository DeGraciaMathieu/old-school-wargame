import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/rules/rng.js';

test('une même graine rejoue la même séquence de dés', () => {
  const roll = rng => Array.from({ length: 10 }, () => 1 + Math.floor(rng() * 6));
  assert.deepEqual(roll(createRng(1944)), roll(createRng(1944)));
});

test('les tirages restent dans [0, 1[', () => {
  const rng = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const x = rng();
    assert.ok(x >= 0 && x < 1);
  }
});
