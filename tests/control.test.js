import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zocOf, bondsOf, stackCount } from '../src/rules/control.js';

const unit = (id, side, pos) => ({ id, side, pos, dead: false });

test('la zone de contrôle d\'une unité couvre les six hexagones qui l\'entourent', () => {
  const state = { units: [unit('a', 'us', '5,5')] };
  const zoc = zocOf(state, 'us');
  assert.equal(zoc.size, 6);
  assert.ok(zoc.has('6,5'));
  assert.equal(zocOf(state, 'de').size, 0);
});

test('deux unités amies à deux cases d\'écart interdisent la case entre elles à l\'ennemi', () => {
  const state = { units: [unit('a', 'us', '5,5'), unit('b', 'us', '7,5')] };
  assert.deepEqual([...bondsOf(state, 'us').keys()], ['6,5']);
});

test('une unité ennemie placée entre elles rompt la liaison', () => {
  const state = { units: [unit('a', 'us', '5,5'), unit('b', 'us', '7,5'), unit('x', 'de', '6,5')] };
  assert.equal(bondsOf(state, 'us').size, 0);
});

test('les unités détruites ne comptent pas dans l\'empilement', () => {
  const state = { units: [unit('a', 'us', '5,5'), { ...unit('b', 'us', '5,5'), dead: true }] };
  assert.equal(stackCount(state, '5,5', 'us'), 1);
});
