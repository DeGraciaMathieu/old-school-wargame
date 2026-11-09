import { SAVE_KEY } from '../config.js';
import { generateMap } from '../rules/mapgen.js';
import { armyOf, arrivalsOf, sideOfBand } from '../rules/deploy.js';
import { createRng } from '../rules/rng.js';
import * as combat from '../rules/combat.js';
import * as control from '../rules/control.js';
import * as journal from '../rules/journal.js';
import * as movement from '../rules/movement.js';
import * as supply from '../rules/supply.js';
import * as victory from '../rules/victory.js';

// État de la partie et état d'interface partagés entre les couches
export const store={state:null,busy:false,undo:[],sel:{},zoom:1,scoreOpen:false};
export const isAI=s=>!!store.state&&store.state.mode==='ai-'+s;
export const U=id=>store.state.units.find(u=>u.id===id);
export const unitsAt=k=>control.unitsAt(store.state,k);
export const occ=side=>control.occ(store.state,side);
export const stackCount=(k,side,except)=>control.stackCount(store.state,k,side,except);
export const zocOf=side=>control.zocOf(store.state,side);
export const bondsOf=side=>control.bondsOf(store.state,side);
export const supplyOf=side=>supply.supplyOf(store.state,side);
export const supplyPath=(side,from)=>supply.supplyPath(store.state,side,from);
export const vpOf=side=>victory.vpOf(store.state,side);
export const log=(text,side)=>journal.pushLog(store.state,text,side);
export function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(store.state));}catch(e){}}
export function loadSaved(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return s&&s.units&&s.seed&&!s.over?s:null;}catch(e){return null;}}
export const reach=u=>movement.reach(store.state,u);
export const eligibleAttackers=(k,side)=>combat.eligibleAttackers(store.state,k,side);
export const canTarget=(k,side)=>combat.canTarget(store.state,k,side);
export const odds=(k,atk)=>combat.odds(store.state,k,atk);

// Partie neuve sur la carte de graine seed : armées des deux camps, renforts annoncés, villes des bandes latérales
// à leur camp et villes du centre neutres, premier message du journal
export function createGame(mode,seed){
  const map=generateMap(createRng(seed));
  const s={mode,seed,turn:1,phase:0,control:{},attacked:[],log:[],over:false,
    units:[...armyOf(map,'blue'),...armyOf(map,'red')],map,
    arrivals:[...arrivalsOf('blue'),...arrivalsOf('red')].sort((a,b)=>a.turn-b.turn)};
  for(const id in map.towns)s.control[id]=sideOfBand(map.towns[id].band);
  journal.pushLog(s,'Jour 1, à l\'aube : les deux armées marchent sur les villes du centre.');
  return s;
}
