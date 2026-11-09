import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armyOf, arrivalsOf } from '../src/rules/deploy.js';
import { generateMap } from '../src/rules/mapgen.js';
import { createRng } from '../src/rules/rng.js';
import { unkey } from '../src/rules/hex.js';
import { ZONE_WEST_MAX_COL, ZONE_EAST_MIN_COL } from '../src/config.js';

const maps = Array.from({ length: 200 }, (_, i) => generateMap(createRng(i + 1)));

test('les unités de départ sont dans la bande de leur camp, une par case', () => {
  for (const map of maps) for (const side of ['blue', 'red']) {
    const pos = armyOf(map, side).filter(u => u.pos).map(u => u.pos);
    assert.equal(new Set(pos).size, pos.length);
    for (const k of pos) {
      const c = unkey(k)[0];
      assert.ok(side === 'blue' ? c <= ZONE_WEST_MAX_COL : c >= ZONE_EAST_MIN_COL, k);
    }
  }
});

test('chaque ville à PV d\'un camp reçoit une garnison au départ', () => {
  for (const map of maps) for (const [side, band] of [['blue', 'west'], ['red', 'east']]) {
    const pos = new Set(armyOf(map, side).map(u => u.pos));
    for (const t of Object.values(map.towns)) if (t.band === band && t.vp > 0) assert.ok(pos.has(`${t.c},${t.r}`));
  }
});

test('les deux camps reçoivent le même ordre de bataille', () => {
  const shape = u => [u.type, u.v, u.rv, u.max, u.turn, u.name];
  assert.deepEqual(armyOf(maps[0], 'blue').map(shape), armyOf(maps[0], 'red').map(shape));
});

test('les renforts entrent par les sorties de route de leur bord', () => {
  const map = maps[0];
  for (const u of armyOf(map, 'red').filter(u => u.turn > 1)) assert.deepEqual(u.entry, map.exits.east);
  assert.deepEqual(arrivalsOf('blue').map(a => a.text), ['1 blindé et 1 mécanisé, bord ouest', '1 chasseur de chars, bord ouest']);
});
