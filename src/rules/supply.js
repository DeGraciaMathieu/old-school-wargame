import { COLS, ROWS } from '../config.js';
import { key, unkey, neighbors, ek } from './hex.js';
import { riverEdge, roadEdges } from './map.js';
import { other } from './units.js';
import { occ, zocOf } from './control.js';

/* Ravitaillement : chemin jusqu'à son bord de carte, hors cases ennemies et hors ZOC ennemie (sauf case tenue par un ami) */
export function supplyOf(state,side){
  const own=occ(state,side),enemy=occ(state,other(side)),ez=zocOf(state,other(side));
  const ok=h=>!enemy.has(h)&&(!ez.has(h)||own.has(h));
  const col=side==='us'?0:COLS-1,seen=new Set(),q=[];
  for(let r=0;r<ROWS;r++){const h=key(col,r);if(ok(h)){seen.add(h);q.push(h);}}
  while(q.length){const h=q.pop();for(const n of neighbors(h))if(!seen.has(n)&&ok(n)&&supCross(h,n)){seen.add(n);q.push(n);}}
  return seen;
}
const supCross=(a,b)=>!riverEdge.has(ek(a,b))||roadEdges.has(ek(a,b));
export function supplyPath(state,side,from){
  const own=occ(state,side),enemy=occ(state,other(side)),ez=zocOf(state,other(side)),col=side==='us'?0:COLS-1;
  const ok=h=>!enemy.has(h)&&(!ez.has(h)||own.has(h));
  const par=new Map([[from,null]]),q=[from];
  for(let i=0;i<q.length;i++){const h=q[i];
    if(unkey(h)[0]===col){const p=[];let x=h;while(x){p.unshift(x);x=par.get(x);}return p;}
    for(const n of neighbors(h))if(!par.has(n)&&ok(n)&&supCross(h,n)){par.set(n,h);q.push(n);}}
  return null;
}
