import { DEFAULT_STEPS, OOB, SAVE_KEY, TOWNS } from '../config.js';
import { eastOfOur, townKey } from '../rules/map.js';
import * as combat from '../rules/combat.js';
import * as control from '../rules/control.js';
import * as journal from '../rules/journal.js';
import * as movement from '../rules/movement.js';
import * as supply from '../rules/supply.js';
import * as victory from '../rules/victory.js';

// État de la partie et état d'interface partagés entre les couches
export const store={state:null,busy:false,undo:[],sel:{},zoom:1};
export const isAI=s=>store.state&&((store.state.mode==='ai-us'&&s==='us')||(store.state.mode==='ai-de'&&s==='de'));
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
export function loadSaved(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return s&&s.units&&!s.over?s:null;}catch(e){return null;}}
export const reach=u=>movement.reach(store.state,u);
export const eligibleAttackers=(k,side)=>combat.eligibleAttackers(store.state,k,side);
export const canTarget=(k,side)=>combat.canTarget(store.state,k,side);
export const odds=(k,atk)=>combat.odds(store.state,k,atk);

// Partie neuve : OOB déployé, villes contrôlées selon leur rive de l'Our, premier message du journal
export function createGame(mode){
  const s={mode,turn:1,phase:0,control:{},attacked:[],log:[],over:false,
    units:OOB.map(o=>({...o,max:o.steps||DEFAULT_STEPS,steps:o.steps||DEFAULT_STEPS,pos:(o.turn||1)>1?null:o.at,arrived:(o.turn||1)===1,mp:0,attacked:false,dead:false,oos:0}))};
  for(const id in TOWNS)s.control[id]=eastOfOur(townKey(id))?'de':'us';
  journal.pushLog(s,'16 décembre, 5 h 30 : l\'artillerie allemande ouvre le feu sur la ligne de la 28th Division.','de');
  return s;
}
