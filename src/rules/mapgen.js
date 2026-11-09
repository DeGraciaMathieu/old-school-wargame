import {
  COLS,ROWS,FOREST_PROB,CLEAR_ALT_SHADE_PROB,TERRAIN_SMOOTH_PASSES,FOREST_GROW_MIN,FOREST_CLEAR_MAX,
  ZONE_WEST_MAX_COL,ZONE_EAST_MIN_COL,RIVER_MIN,RIVER_MAX,RIVER_NS_COLS,RIVER_EW_ROWS,RIVER_NAMES,
  TOWN_LAYOUT,TOWN_MIN_DIST,TOWN_TRIES,EXITS_PER_SIDE,TOWN_NAMES
} from '../config.js';
import { key, neighbors, hexLine, ek, dist } from './hex.js';

const between=(rand,[lo,hi])=>lo+Math.floor(rand()*(hi-lo+1));
const walk=(rand,v,[lo,hi])=>Math.max(lo,Math.min(hi,v+Math.floor(rand()*3)-1));
function shuffle(rand,a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// Bandes de colonnes où l'on place les villes (jamais sur une colonne de bord)
export const BANDS={west:[1,ZONE_WEST_MAX_COL],center:[ZONE_WEST_MAX_COL+1,ZONE_EAST_MIN_COL-1],east:[ZONE_EAST_MIN_COL,COLS-2]};

/* Forêts : tirage par case, puis lissage par automate cellulaire */
function terrain(rand){
  const hex={};
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)hex[key(c,r)]={c,r,k:key(c,r),t:rand()<FOREST_PROB?'forest':'clear',alt:rand()<CLEAR_ALT_SHADE_PROB};
  for(let pass=0;pass<TERRAIN_SMOOTH_PASSES;pass++){const nx={};for(const k in hex){const n=neighbors(k).filter(x=>hex[x].t==='forest').length;nx[k]=n>=FOREST_GROW_MIN?'forest':n<=FOREST_CLEAR_MAX?'clear':hex[k].t;}for(const k in hex)hex[k].t=nx[k];}
  return hex;
}

/* Rivières : nombre et sens tirés, chacune d'un bord au bord opposé en marche aléatoire.
   ns : b[r] = première colonne de la rive est sur la ligne r ; ew : b[c] = première ligne de la rive sud sur la colonne c */
function riversOf(rand,hex){
  const n=between(rand,[RIVER_MIN,RIVER_MAX]),names=shuffle(rand,RIVER_NAMES),lines=[],edges={};
  for(let i=0;i<n;i++){
    const dir=rand()<0.5?'ns':'ew',range=dir==='ns'?RIVER_NS_COLS:RIVER_EW_ROWS,b=[];
    let v=between(rand,range);for(let j=0;j<(dir==='ns'?ROWS:COLS);j++){b.push(v);v=walk(rand,v,range);}
    lines.push({name:names[i],dir,b});
  }
  const bank=(l,h)=>l.dir==='ns'?h.c>=l.b[h.r]:h.r>=l.b[h.c];
  for(const k in hex)for(const m of neighbors(k))for(const l of lines)if(bank(l,hex[k])!==bank(l,hex[m]))edges[ek(k,m)]=l.name;
  return {lines,edges};
}

/* Villes : mêmes villes dans les deux bandes latérales, villes neutres au centre, toutes espacées de TOWN_MIN_DIST */
function placeTowns(rand){
  for(let i=0;i<TOWN_TRIES;i++){
    const placed=[];
    const fill=(band,list)=>{const [c0,c1]=BANDS[band],cand=[];for(let c=c0;c<=c1;c++)for(let r=1;r<ROWS-1;r++)cand.push(key(c,r));
      const free=shuffle(rand,cand);
      for(const spec of list){const k=free.find(x=>placed.every(p=>dist(p.k,x)>=TOWN_MIN_DIST));if(!k)return false;placed.push({...spec,k,band});}
      return true;};
    if(fill('west',TOWN_LAYOUT.side)&&fill('center',TOWN_LAYOUT.center)&&fill('east',TOWN_LAYOUT.side))return placed;
  }
  throw new Error('Impossible de placer les villes');
}

/* Routes : arbre couvrant le plus court entre les villes, puis les villes les plus proches de chaque bord
   reliées à ce bord (EXITS_PER_SIDE par camp) */
function roadsOf(towns){
  const ks=towns.map(t=>t.k),inTree=[ks[0]],segs=[];
  while(inTree.length<ks.length){
    let best=null;
    for(const a of inTree)for(const b of ks)if(!inTree.includes(b)&&(!best||dist(a,b)<dist(best[0],best[1])))best=[a,b];
    inTree.push(best[1]);segs.push(best);
  }
  const exits={west:[],east:[]};
  for(const [band,col] of [['west',0],['east',COLS-1]]){
    const near=towns.filter(t=>t.band===band).sort((a,b)=>Math.abs(a.c-col)-Math.abs(b.c-col)).slice(0,EXITS_PER_SIDE);
    for(const t of near){const e=key(col,t.r);segs.push([t.k,e]);if(!exits[band].includes(e))exits[band].push(e);}
  }
  const roads={},roadChains=[];
  for(const [a,b] of segs){const chain=hexLine(a,b);for(let i=0;i<chain.length-1;i++)roads[ek(chain[i],chain[i+1])]=true;roadChains.push(chain);}
  return {roads,roadChains,exits};
}

/* Carte tirée au hasard, de même forme que celle d'un scénario (state.map), plus le tracé des rivières
   (riverLines) et les cases de bord où sortent les routes (exits) */
export function generateMap(rand){
  const hex=terrain(rand);
  const {lines,edges}=riversOf(rand,hex);
  const names=shuffle(rand,TOWN_NAMES),placed=placeTowns(rand).map(t=>({...t,c:hex[t.k].c,r:hex[t.k].r}));
  const towns={};
  placed.forEach((t,i)=>{const id='t'+i;towns[id]={c:t.c,r:t.r,name:names[i],t:t.t,vp:t.vp,band:t.band};hex[t.k].t=t.t;hex[t.k].town=id;});
  const {roads,roadChains,exits}=roadsOf(placed);
  return {hex,rivers:edges,roads,roadChains,towns,riverLines:lines,exits};
}
