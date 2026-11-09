import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/rules/mapgen.js';
import { createRng } from '../src/rules/rng.js';
import { unkey, dist } from '../src/rules/hex.js';
import { COLS, ROWS, RIVER_MIN, RIVER_MAX, TOWN_MIN_DIST, TERRAINS } from '../src/config.js';

const gen = seed => generateMap(createRng(seed));
const maps = Array.from({ length: 1000 }, (_, i) => gen(i + 1));

test('une même graine donne toujours la même carte', () => {
  assert.deepEqual(gen(42), gen(42));
});

test('deux graines différentes donnent deux cartes différentes', () => {
  assert.notDeepEqual(gen(1), gen(2));
});

test('la carte générée a la forme attendue par les règles et se sérialise en JSON', () => {
  const map = gen(7);
  assert.equal(Object.keys(map.hex).length, COLS * ROWS);
  for (const h of Object.values(map.hex)) assert.ok(TERRAINS[h.t], h.k);
  for (const [id, t] of Object.entries(map.towns)) assert.equal(map.hex[`${t.c},${t.r}`].town, id);
  assert.deepEqual(JSON.parse(JSON.stringify(map)), map);
});

test('sur 1000 graines, le réseau de routes relie le bord ouest au bord est', () => {
  for (const map of maps) {
    const adj = {};
    for (const e in map.roads) { const [a, b] = e.split('|'); (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); }
    const seen = new Set(map.exits.west), q = [...map.exits.west];
    while (q.length) for (const n of adj[q.pop()] || []) if (!seen.has(n)) { seen.add(n); q.push(n); }
    assert.ok(map.exits.west.length && map.exits.east.length);
    assert.ok(map.exits.east.every(e => seen.has(e)));
  }
});

test('sur 1000 graines, les deux bandes latérales ont le même total de PV', () => {
  for (const map of maps) {
    const vp = band => Object.values(map.towns).filter(t => t.band === band).reduce((s, t) => s + t.vp, 0);
    assert.equal(vp('west'), vp('east'));
    assert.ok(vp('west') > 0);
  }
});

test('aucune ville n\'est sur une colonne de bord ni à moins de TOWN_MIN_DIST d\'une autre', () => {
  for (const map of maps) {
    const ks = Object.values(map.towns).map(t => `${t.c},${t.r}`);
    for (const k of ks) assert.ok(unkey(k)[0] > 0 && unkey(k)[0] < COLS - 1, k);
    for (const a of ks) for (const b of ks) if (a !== b) assert.ok(dist(a, b) >= TOWN_MIN_DIST);
  }
});

test('sur 1000 graines, le nombre de rivières reste entre RIVER_MIN et RIVER_MAX, et chaque rivière va d\'un bord au bord opposé', () => {
  for (const map of maps) {
    assert.ok(map.riverLines.length >= RIVER_MIN && map.riverLines.length <= RIVER_MAX);
    const names = new Set(Object.values(map.rivers));
    for (const l of map.riverLines) {
      assert.equal(l.b.length, l.dir === 'ns' ? ROWS : COLS);
      assert.ok(names.has(l.name));
    }
  }
});

test('sur 1000 graines, on trouve des rivières nord-sud et des rivières est-ouest', () => {
  const dirs = new Set(maps.flatMap(m => m.riverLines.map(l => l.dir)));
  assert.deepEqual([...dirs].sort(), ['ew', 'ns']);
});
