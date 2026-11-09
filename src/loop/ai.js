import { TERRAINS, AI_ADVANCE_PAUSE, AI_COMBAT_GUARD, AI_CAP_PER_TOWN, AI_VP_WEIGHT, AI_GARRISON_PER_TOWN, AI_END_PHASE_DELAY, AI_MOVE_PAUSE, AI_RESULT_PAUSE, AI_TARGET_PAUSE, AI_COVER_BONUS, AI_ZOC_WEIGHT_ATTACK, AI_ZOC_WEIGHT_HOLD, AI_MOVE_MIN_GAIN, AI_PRUNE_FROM_COL, AI_PRUNE_KEEP_COL, AI_MIN_COL_VP, AI_MIN_COL, AI_COMBAT_COL_WEIGHT } from '../config.js';
import { neighbors } from '../rules/hex.js';
import { townKey } from '../rules/map.js';
import { isMech, onMap, other, vals } from '../rules/units.js';
import * as movement from '../rules/movement.js';
import { diceRng, doMove, placeUnit, resolve } from './orders.js';
import { endPhase } from './turn.js';
import { AUDIO } from '../render/audio.js';
import { render } from '../render/index.js';
import { animatePath } from '../render/map.js';
import { U, canTarget, curPhase, eligibleAttackers, log, odds, reach, store, zocOf } from '../state/store.js';

/* ---------- IA ---------- */
export const fieldCache=new Map();
function field(goal,mech){
  const c=goal+(mech?'m':'i');if(fieldCache.has(c))return fieldCache.get(c);
  const d=new Map([[goal,0]]),pq=[[0,goal]];
  while(pq.length){let bi=0;for(let i=1;i<pq.length;i++)if(pq[i][0]<pq[bi][0])bi=i;const [dk,k]=pq.splice(bi,1)[0];if(dk>d.get(k))continue;for(const n of neighbors(k)){const nd=dk+movement.stepCost(store.state.map,n,k,mech);if(!d.has(n)||nd<d.get(n)){d.set(n,nd);pq.push([nd,n]);}}}
  fieldCache.set(c,d);return d;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function runAI(){
  if(store.state.over)return;
  store.busy=true;render();
  const ph=curPhase();
  try{ if(ph.kind==='move')await aiMove(ph.side);else await aiCombat(ph.side); }catch(e){console.error(e);}
  store.busy=false;await sleep(AI_END_PHASE_DELAY);endPhase();
}
// Unité en garnison : posée sur une ville à PV que son camp tient
const garrisoned=(u,map)=>{const id=map.hex[u.pos].town;return !!id&&map.towns[id].vp>0&&store.state.control[id]===u.side;};

/* Mouvement, même logique pour les deux camps : AI_GARRISON_PER_TOWN unités tiennent chaque ville à PV du camp
   (les plus fortes en PV d'abord), les autres marchent sur les villes à PV qu'il ne tient pas */
async function aiMove(side){
  const enemy=other(side),map=store.state.map,{hex,towns}=map,tk=id=>townKey(map,id),ez=zocOf(enemy);
  const mine=store.state.units.filter(u=>onMap(u)&&u.side===side);
  const goals=new Map(),hold=new Set();
  const need=new Map(Object.keys(towns).filter(id=>towns[id].vp>0&&store.state.control[id]===side).sort((a,b)=>towns[b].vp-towns[a].vp).map(id=>[id,AI_GARRISON_PER_TOWN]));
  for(const u of mine){const id=hex[u.pos].town;if(id&&need.get(id)>0){need.set(id,need.get(id)-1);goals.set(u.id,null);hold.add(u.id);}}
  for(const u of mine){if(goals.has(u.id))continue;if(ez.has(u.pos)){goals.set(u.id,null);continue;}
    let best=null,bd=1e9;for(const [id,n] of need){if(n<=0)continue;const d=field(tk(id),isMech(u)).get(u.pos);if(d<bd){bd=d;best=id;}}
    if(best){need.set(best,need.get(best)-1);goals.set(u.id,tk(best));hold.add(u.id);}}
  const targets=Object.keys(towns).filter(id=>towns[id].vp>0&&store.state.control[id]!==side);
  const cap=new Map(targets.map(id=>[id,AI_CAP_PER_TOWN]));
  for(const u of mine){if(goals.has(u.id))continue;
    let best=null,bd=1e9;for(const id of targets){if(cap.get(id)<=0)continue;const d=field(tk(id),isMech(u)).get(u.pos)-towns[id].vp*AI_VP_WEIGHT;if(d<bd){bd=d;best=id;}}
    if(best){cap.set(best,cap.get(best)-1);goals.set(u.id,tk(best));}}
  const order=mine.filter(u=>goals.get(u.id)).sort((a,b)=>field(goals.get(a.id),isMech(a)).get(a.pos)-field(goals.get(b.id),isMech(b)).get(b.pos));
  for(const u of order){
    if(!onMap(u)||u.mp<=0)continue;
    const g=goals.get(u.id),f=field(g,isMech(u)),rch=reach(u),held=hold.has(u.id);
    const score=(k,zoc)=>f.get(k)+(held&&TERRAINS[hex[k].t].cover?AI_COVER_BONUS:0)+(zoc?(held?AI_ZOC_WEIGHT_HOLD:AI_ZOC_WEIGHT_ATTACK):0);
    let bestK=null,bs=score(u.pos,false)-AI_MOVE_MIN_GAIN;
    for(const [k,r] of rch){const s=score(k,r.zoc);if(s<bs){bs=s;bestK=k;}}
    if(bestK){await doMove(u,bestK,rch.get(bestK));await sleep(AI_MOVE_PAUSE);}
  }
}
async function aiCombat(side){
  const {hex,towns}=store.state.map;
  for(let guard=0;guard<AI_COMBAT_GUARD;guard++){
    const enemy=other(side);
    const targets=[...new Set(store.state.units.filter(u=>onMap(u)&&u.side===enemy).map(u=>u.pos))].filter(k=>canTarget(k,side));
    let best=null;
    for(const k of targets){
      let atk=eligibleAttackers(k,side);let o=odds(k,atk);if(o.fin<0)continue;
      if(o.fin>=AI_PRUNE_FROM_COL){atk.sort((a,b)=>vals(a)[0]-vals(b)[0]);let i=0;while(atk.length>1&&i<atk.length){const t=atk.filter((_,j)=>j!==i);const ot=odds(k,t);if(ot.fin>=AI_PRUNE_KEEP_COL){atk=t;o=ot;}else i++;}}
      const vp=hex[k].town?towns[hex[k].town].vp:0;
      const need=vp>0&&store.state.control[hex[k].town]!==side?AI_MIN_COL_VP:AI_MIN_COL;
      if(o.fin<need)continue;
      const sc=o.fin*AI_COMBAT_COL_WEIGHT+vp+(o.defs.some(d=>d.steps<d.max)?1:0);
      if(!best||sc>best.sc)best={k,atk,sc};
    }
    if(!best)break;
    store.sel={hex:best.k,target:best.k,attackers:new Set(best.atk.map(a=>a.id))};AUDIO.pick();render();await sleep(AI_TARGET_PAUSE);
    const res=resolve(best.k,best.atk,diceRng);
    store.sel={hex:best.k,result:res};render();await sleep(AI_RESULT_PAUSE);
    // Avance après combat avec la plus forte unité qui n'est pas en garnison
    const adv=res.adv.map(U).filter(u=>!garrisoned(u,store.state.map));
    if(adv.length){
      const a=adv.sort((x,y)=>vals(y)[0]-vals(x)[0])[0];
      const from=a.pos;await animatePath(a,[from,best.k]);placeUnit(a,best.k);log(`${a.name} avance.`,side);store.sel={hex:best.k};render();await sleep(AI_ADVANCE_PAUSE);
    }
  }
  store.sel={};
}
