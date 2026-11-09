import { ROWS } from '../config.js';
import { key, unkey, neighbors, ek } from './hex.js';
import { other, homeCol } from './units.js';
import { occ, zocOf } from './control.js';

/* Ravitaillement : chemin jusqu'à son bord de carte, hors cases ennemies et hors ZOC ennemie (sauf case tenue par un ami),
   sans jamais faire un pas vers le bord adverse (même colonne permise) */
export function supplyOf(state,side){
  const own=occ(state,side),enemy=occ(state,other(side)),ez=zocOf(state,other(side));
  const ok=h=>!enemy.has(h)&&(!ez.has(h)||own.has(h));
  const col=homeCol(side),seen=new Set(),q=[];
  for(let r=0;r<ROWS;r++){const h=key(col,r);if(ok(h)){seen.add(h);q.push(h);}}
  while(q.length){const h=q.pop();for(const n of neighbors(h))if(!seen.has(n)&&ok(n)&&supCross(state.map,h,n)&&homeward(col,n,h)){seen.add(n);q.push(n);}}
  return seen;
}
const supCross=(map,a,b)=>!map.rivers[ek(a,b)]||map.roads[ek(a,b)];
// Le pas de a vers b ne s'éloigne pas du bord col
const homeward=(col,a,b)=>Math.abs(unkey(b)[0]-col)<=Math.abs(unkey(a)[0]-col);
export function supplyPath(state,side,from){
  const own=occ(state,side),enemy=occ(state,other(side)),ez=zocOf(state,other(side)),col=homeCol(side);
  const ok=h=>!enemy.has(h)&&(!ez.has(h)||own.has(h));
  const par=new Map([[from,null]]),q=[from];
  for(let i=0;i<q.length;i++){const h=q[i];
    if(unkey(h)[0]===col){const p=[];let x=h;while(x){p.unshift(x);x=par.get(x);}return p;}
    for(const n of neighbors(h))if(!par.has(n)&&ok(n)&&supCross(state.map,h,n)&&homeward(col,h,n)){par.set(n,h);q.push(n);}}
  return null;
}
