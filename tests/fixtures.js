import { COLS, ROWS } from '../src/config.js';
import { key, ek } from '../src/rules/hex.js';

// Carte de test entièrement dégagée, avec forêts, villes, rivières et routes posées à la main
export function testMap({ forest = [], towns = {}, rivers = [], roads = [] } = {}) {
  const hex = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = key(c, r);
    hex[k] = { c, r, k, t: forest.includes(k) ? 'forest' : 'clear', alt: false };
  }
  const tw = {};
  for (const [id, t] of Object.entries(towns)) {
    const [c, r] = t.at.split(',').map(Number);
    tw[id] = { c, r, name: t.name || id, t: t.t || 'town', vp: t.vp || 0, band: t.band || 'center' };
    hex[t.at].t = tw[id].t;
    hex[t.at].town = id;
  }
  return {
    hex, towns: tw, roadChains: roads, riverLines: [], exits: { west: [], east: [] },
    rivers: Object.fromEntries(rivers.map(([a, b]) => [ek(a, b), 'Sarne'])),
    roads: Object.fromEntries(roads.map(([a, b]) => [ek(a, b), true])),
  };
}
