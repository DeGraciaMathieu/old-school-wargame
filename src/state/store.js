import { DEFAULT_STEPS, SAVE_KEY } from '../config.js';
import { buildMap, eastOf, townKey } from '../rules/map.js';
import * as combat from '../rules/combat.js';
import * as control from '../rules/control.js';
import * as journal from '../rules/journal.js';
import * as movement from '../rules/movement.js';
import * as supply from '../rules/supply.js';
import * as victory from '../rules/victory.js';

// État de la partie et état d'interface partagés entre les couches
export const store={state:null,busy:false,undo:[],sel:{},zoom:1,scoreOpen:false};
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

// Partie neuve sur un scénario : carte, renforts annoncés et objectifs de l'IA portés par l'état, OOB déployé,
// villes contrôlées selon leur rive de la première rivière, premier message du journal
export function createGame(mode,sc){
  const map=buildMap(sc);
  const s={mode,turn:1,phase:0,control:{},attacked:[],log:[],over:false,
    units:sc.oob.map(o=>({...o,max:o.steps||DEFAULT_STEPS,steps:o.steps||DEFAULT_STEPS,pos:(o.turn||1)>1?null:o.at,arrived:(o.turn||1)===1,mp:0,attacked:false,dead:false,oos:0})),
    map,arrivals:structuredClone(sc.arrivals),aiHints:structuredClone(sc.ai)};
  for(const id in map.towns)s.control[id]=eastOf(sc.rivers[0],map,townKey(map,id))?'de':'us';
  journal.pushLog(s,sc.intro,'de');
  return s;
}
