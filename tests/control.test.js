import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zocOf, bondsOf, stackCount } from '../src/rules/control.js';

const unit = (id, side, pos) => ({ id, side, pos, dead: false });

test('la zone de contrôle d\'une unité couvre les six hexagones qui l\'entourent', () => {
  const state = { units: [unit('a', 'blue', '5,5')] };
  const zoc = zocOf(state, 'blue');
  assert.equal(zoc.size, 6);
  assert.ok(zoc.has('6,5'));
  assert.equal(zocOf(state, 'red').size, 0);
});

test('deux unités amies à deux cases d\'écart interdisent la case entre elles à l\'ennemi', () => {
  const state = { units: [unit('a', 'blue', '5,5'), unit('b', 'blue', '7,5')] };
  assert.deepEqual([...bondsOf(state, 'blue').keys()], ['6,5']);
});

test('une unité ennemie placée entre elles rompt la liaison', () => {
  const state = { units: [unit('a', 'blue', '5,5'), unit('b', 'blue', '7,5'), unit('x', 'red', '6,5')] };
  assert.equal(bondsOf(state, 'blue').size, 0);
});

test('les unités détruites ne comptent pas dans l\'empilement', () => {
  const state = { units: [unit('a', 'blue', '5,5'), { ...unit('b', 'blue', '5,5'), dead: true }] };
  assert.equal(stackCount(state, '5,5', 'blue'), 1);
});
