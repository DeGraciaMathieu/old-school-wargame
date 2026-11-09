import { ROAD_COST, TERRAINS, RIVER_CROSSING_COST, STACK_LIMIT } from '../config.js';
import { neighbors, ek } from './hex.js';
import { other, isMech, mpOf } from './units.js';
import { occ, stackCount, zocOf, bondsOf } from './control.js';

// Coût en PM pour passer de a à b : route 1 (forêt et pont compris), forêt 2 (3 mécanisés), rivière hors pont +2
export function stepCost(map,a,b,mech){if(map.roads[ek(a,b)])return ROAD_COST;const tc=TERRAINS[map.hex[b].t].cost;let c=mech?tc.mech:tc.inf;if(map.rivers[ek(a,b)])c+=RIVER_CROSSING_COST;return c;}

/* Cases atteignables : Dijkstra sur les PM restants, arrêt en ZOC ennemie, pas de ZOC à ZOC,
   cases ennemies et liaisons ennemies interdites ; une unité qui n'a pas bougé avance toujours d'une case */
export function reach(state,u){
  const enemy=other(u.side),ez=zocOf(state,enemy),eo=occ(state,enemy),eb=bondsOf(state,enemy),mech=isMech(u),start=u.pos,full=u.mp>=mpOf(u);
  const best=new Map([[start,0]]),prev=new Map(),pq=[[0,start]];
  while(pq.length){
    let bi=0;for(let i=1;i<pq.length;i++)if(pq[i][0]<pq[bi][0])bi=i;
    const [d,k]=pq.splice(bi,1)[0];
    if(d>best.get(k)+1e-9)continue;
    if(k!==start&&ez.has(k))continue;
    for(const n of neighbors(k)){
      if(eo.has(n)||eb.has(n))continue;
      if(ez.has(k)&&ez.has(n))continue;
      let nd=d+stepCost(state.map,k,n,mech);
      if(nd>u.mp+1e-9){if(k===start&&full&&u.mp>0)nd=u.mp;else continue;}
      if(!best.has(n)||nd<best.get(n)-1e-9){best.set(n,nd);prev.set(n,k);pq.push([nd,n]);}
    }
  }
  const out=new Map();
  for(const [k,c] of best){if(k===start||stackCount(state,k,u.side,u)>=STACK_LIMIT)continue;const path=[k];let p=k;while(p!==start){p=prev.get(p);path.unshift(p);}out.set(k,{cost:c,path,zoc:ez.has(k)});}
  return out;
}
