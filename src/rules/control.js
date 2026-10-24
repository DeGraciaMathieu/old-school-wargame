import { BOND_RANGE } from '../config.js';
import { neighbors, dist } from './hex.js';
import { other, onMap } from './units.js';

export const unitsAt=(state,k)=>state.units.filter(u=>onMap(u)&&u.pos===k);
export const occ=(state,side)=>new Set(state.units.filter(u=>onMap(u)&&u.side===side).map(u=>u.pos));
export const stackCount=(state,k,side,except)=>state.units.filter(u=>onMap(u)&&u.pos===k&&u.side===side&&u!==except).length;
export function zocOf(state,side){const s=new Set();for(const u of state.units){if(u.side!==side||!onMap(u))continue;for(const n of neighbors(u.pos))s.add(n);}return s;}
export function bondsOf(state,side){
  // Deux unités amies à 2 cases d'écart : les 1 ou 2 cases qui les séparent sont interdites à l'ennemi
  const mine=occ(state,side),foe=occ(state,other(side)),out=new Map(),done=new Set();
  for(const a of mine){const na=neighbors(a);
    for(const m of na)for(const b of neighbors(m)){
      if(!mine.has(b)||dist(a,b)!==BOND_RANGE)continue;
      const id=a<b?a+'|'+b:b+'|'+a;if(done.has(id))continue;done.add(id);
      const nb=neighbors(b),common=na.filter(h=>nb.includes(h));
      if(common.some(h=>foe.has(h)))continue;
      for(const h of common)if(!mine.has(h))(out.get(h)||out.set(h,[]).get(h)).push([a,b]);
    }}
  return out;
}
