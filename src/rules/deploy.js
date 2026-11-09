import { COLS, DEFAULT_STEPS, OOB_TEMPLATE, UNIT_TYPES, GARRISON_TYPES, ARMY, HOME, ZONE_WEST_MAX_COL, ZONE_EAST_MIN_COL } from '../config.js';
import { key, dist } from './hex.js';

// Camp qui tient une bande au départ (null pour la bande centrale, neutre)
export const sideOfBand=band=>Object.keys(HOME).find(s=>HOME[s]===band)||null;

/* Ordre de bataille d'un camp, instancié depuis le modèle commun (noms numérotés par type).
   Unités de départ : d'abord en garnison dans les villes à PV de leur bande (les plus fortes en PV d'abord),
   puis une par case libre de leur zone, au plus près de leurs villes, route en priorité.
   Renforts : entrée par les sorties de route de leur bord */
export function armyOf(map,side){
  const band=HOME[side],count={};
  const units=OOB_TEMPLATE.map((o,i)=>{const n=count[o.type]=(count[o.type]||0)+1,steps=o.steps||DEFAULT_STEPS,turn=o.turn||1;
    return {id:side[0]+i,side,name:`${UNIT_TYPES[o.type].abbr} ${n}`,div:ARMY[side],type:o.type,v:o.v,rv:o.rv,max:steps,steps,turn,
      ...(turn>1?{entry:map.exits[band]}:{}),pos:null,arrived:turn===1,mp:0,attacked:false,dead:false,oos:0};});
  const own=Object.values(map.towns).filter(t=>t.band===band),start=units.filter(u=>u.arrived);
  const order=[...start.filter(u=>GARRISON_TYPES.includes(u.type)),...start.filter(u=>!GARRISON_TYPES.includes(u.type))];
  const posts=own.filter(t=>t.vp>0).sort((a,b)=>b.vp-a.vp).map(t=>key(t.c,t.r)).slice(0,order.length);
  posts.forEach((k,i)=>{order[i].pos=k;});
  const [c0,c1]=band==='west'?[0,ZONE_WEST_MAX_COL]:[ZONE_EAST_MIN_COL,COLS-1];
  const onRoad=new Set(Object.keys(map.roads).flatMap(e=>e.split('|')));
  const score=k=>Math.min(...own.map(t=>dist(k,key(t.c,t.r))))-(onRoad.has(k)?0.5:0);
  const free=Object.keys(map.hex).filter(k=>map.hex[k].c>=c0&&map.hex[k].c<=c1&&!posts.includes(k)).sort((a,b)=>score(a)-score(b));
  let i=0;for(const u of order)if(!u.pos)u.pos=free[i++];
  return units;
}

/* Annonces de renforts d'un camp, tirées du modèle : « 1 blindé et 1 mécanisé, bord ouest » */
export function arrivalsOf(side){
  const out=[];
  for(const turn of new Set(OOB_TEMPLATE.filter(o=>(o.turn||1)>1).map(o=>o.turn))){
    const n={};for(const o of OOB_TEMPLATE)if(o.turn===turn)n[o.type]=(n[o.type]||0)+1;
    const list=Object.entries(n).map(([t,k])=>`${k} ${k>1?UNIT_TYPES[t].many:UNIT_TYPES[t].one}`);
    out.push({turn,side,text:(list.length>1?list.slice(0,-1).join(', ')+' et '+list.at(-1):list[0])+', bord '+(HOME[side]==='west'?'ouest':'est')});
  }
  return out;
}
