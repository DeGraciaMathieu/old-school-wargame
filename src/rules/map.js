import {
  COLS,ROWS,FOREST_PROB,FOREST_PROB_WEST,FOREST_PROB_OUR,FOREST_WEST_MAX_COL,FOREST_OUR_MIN_COL,FOREST_OUR_MAX_COL,
  CLEAR_ALT_SHADE_PROB,TERRAIN_SMOOTH_PASSES,FOREST_GROW_MIN,FOREST_CLEAR_MAX,TOWNS,RIVERS,ROADS
} from '../config.js';
import { key, neighbors, hexLine, ek } from './hex.js';

// mulberry32 : conservé tel quel, la carte du jeu dépend de sa séquence exacte
function mulberry(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export const townKey=(map,id)=>key(map.towns[id].c,map.towns[id].r);

/* Carte : forêts procédurales lissées, villes, arêtes de rivière, chaînes de routes.
   Objet JSON simple, porté par l'état de la partie (state.map) */
export function buildMap(seed){
  const rand=mulberry(seed);
  const HEX={};
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){let p=FOREST_PROB;if(c<=FOREST_WEST_MAX_COL)p=FOREST_PROB_WEST;if(c>=FOREST_OUR_MIN_COL&&c<=FOREST_OUR_MAX_COL)p=FOREST_PROB_OUR;HEX[key(c,r)]={c,r,k:key(c,r),t:rand()<p?'forest':'clear',alt:rand()<CLEAR_ALT_SHADE_PROB};}
  for(let pass=0;pass<TERRAIN_SMOOTH_PASSES;pass++){const nx={};for(const k in HEX){const n=neighbors(k).filter(x=>HEX[x].t==='forest').length;nx[k]=n>=FOREST_GROW_MIN?'forest':n<=FOREST_CLEAR_MAX?'clear':HEX[k].t;}for(const k in HEX)HEX[k].t=nx[k];}
  for(const id in TOWNS){const t=TOWNS[id];const h=HEX[key(t.c,t.r)];h.t=t.t;h.town=id;}

  const rivers={};
  for(const k in HEX){const h=HEX[k];for(const n of neighbors(k)){const m=HEX[n];for(const rv of RIVERS){const ba=rv.b[h.r],bb=rv.b[m.r];if(ba==null||bb==null)continue;if((h.c>=ba)!==(m.c>=bb))rivers[ek(k,n)]=rv.name;}}}

  const roads={}, roadChains=[];
  for(const wps of ROADS){const pts=wps.map(w=>TOWNS[w]?key(TOWNS[w].c,TOWNS[w].r):w);const chain=[];for(let i=0;i<pts.length-1;i++){const seg=hexLine(pts[i],pts[i+1]);if(chain.length)seg.shift();chain.push(...seg);}for(let i=0;i<chain.length-1;i++)roads[ek(chain[i],chain[i+1])]=true;roadChains.push(chain);}
  return {hex:HEX,rivers,roads,roadChains,towns:structuredClone(TOWNS)};
}

export const eastOfOur=(map,k)=>{const h=map.hex[k];return h.c>=RIVERS[0].b[h.r];};
