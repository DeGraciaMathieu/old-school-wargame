import { CAPTURE_FX_DELAY, IMPACT_DELAY, STACK_LIMIT } from '../config.js';
import { townKey } from '../rules/map.js';
import * as combat from '../rules/combat.js';
import * as journal from '../rules/journal.js';
import * as victory from '../rules/victory.js';
import { AUDIO } from '../render/audio.js';
import { pulseScore } from '../render/hud.js';
import { render } from '../render/index.js';
import { animatePath, fx, impact } from '../render/map.js';
import { U, log, reach, save, stackCount, store } from '../state/store.js';

/* ---------- Ordres : déplacement, annulation, combat, avance ---------- */
export let diceRng;
export function useDice(rng){diceRng=rng;}
export function placeUnit(u,k){u.pos=k;const id=victory.townTakenBy(store.state,u.side,k);if(id){const prev=store.state.control[id];store.state.control[id]=u.side;if(prev!==u.side)captured(id,u.side);}}
function captured(id,side){
  log(journal.captureText(store.state,id,side),side);
  captureEffects(id,side);
}
export function captureEffects(id,side){
  const t=store.state.map.towns[id];AUDIO.stamp();
  if(t.vp)setTimeout(()=>{fx(townKey(store.state.map,id),(side==='de'?'+':'−')+t.vp+' PV',side==='de'?'':'bad');pulseScore();},CAPTURE_FX_DELAY);
}
export async function doMove(u,k,r){
  store.busy=true;
  store.undo.push(JSON.stringify({units:store.state.units.map(x=>({id:x.id,pos:x.pos,mp:x.mp})),control:{...store.state.control}}));
  store.sel={hex:k};render();
  await animatePath(u,r.path);
  for(const p of r.path.slice(1))placeUnit(u,p);
  u.mp=r.zoc?0:Math.max(0,u.mp-r.cost);
  store.busy=false;
  store.sel={hex:k};render();
  save();
}
export function undoMove(){
  if(!store.undo.length||store.busy)return;
  AUDIO.pick();
  const s=JSON.parse(store.undo.pop());
  for(const x of s.units){const u=U(x.id);u.pos=x.pos;u.mp=x.mp;}
  store.state.control=s.control;store.sel={};render();save();
}
export function selectUnit(u){store.sel={hex:u.pos,unit:u.id,reach:u.mp>0?reach(u):new Map()};render();}
export function resolve(k,atk,rng){
  const r=combat.resolveCombat(store.state,k,atk.map(a=>a.id),rng);
  store.state=r.state;
  for(const c of r.captures)captureEffects(c.id,c.side);
  const {code,killed}=r.result;
  AUDIO.dice();AUDIO.combat(code,killed);setTimeout(()=>impact(k,code,killed),IMPACT_DELAY);
  return r.result;
}
export async function advance(uid){
  const r=store.sel.result;if(!r||store.busy)return;const u=U(uid);
  if(!u||stackCount(r.k,u.side)>=STACK_LIMIT)return;
  store.busy=true;await animatePath(u,[u.pos,r.k]);store.busy=false;
  placeUnit(u,r.k);r.adv=r.adv.filter(x=>x!==uid);
  if(stackCount(r.k,u.side)>=STACK_LIMIT)r.adv=[];
  log(`${u.name} avance.`,u.side);render();save();
}
