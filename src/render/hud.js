import { ARRIVALS, COLL, FIRST_DAY, PHASES, TOWNS, TURNS, VP_TOTAL, TURNS_PER_DAY } from '../config.js';
import { HEX } from '../rules/map.js';
import * as victory from '../rules/victory.js';
import { esc, turnLabel } from './labels.js';
import { U, eligibleAttackers, isAI, odds, store, vpOf } from '../state/store.js';

/* ---------- Piste des tours, score, barre d'action mobile ---------- */
export function renderTrack(){
  let s='';for(let t=1;t<=TURNS;t++){const a=ARRIVALS.filter(x=>x.turn===t);s+=`<div class="tcell${t<store.state.turn?' past':''}${t===store.state.turn?' now':''}" title="${turnLabel(t)}${a.map(x=>' · Renforts '+(x.side==='de'?'allemands':'américains')+' : '+x.text).join('')}"><b>${FIRST_DAY+Math.floor((t-1)/TURNS_PER_DAY)}</b>${t%TURNS_PER_DAY?'matin':'a.-midi'}${a.length?`<span class="rfs">${a.map(x=>`<span class="rf ${x.side}">${x.side==='de'?'DE':'US'}</span>`).join('')}</span>`:''}</div>`;}
  document.getElementById('track').innerHTML=s;
}
const scoreEl=document.getElementById('mapscore');
export function renderScore(){
  const vp=vpOf('de'),st={de:['victoire allemande','de'],draw:['match nul','mid'],us:['victoire américaine','us']}[victory.outcome(vp)];
  scoreEl.innerHTML=`<b>${vp}</b><span class="lbl">PV allemands sur ${VP_TOTAL}<em class="${st[1]}">${store.state.over?'Résultat':'Tendance'} : ${st[0]}</em></span>`;
}
export const actEl=document.getElementById('mapact');
export function renderAct(){
  const ph=PHASES[store.state.phase];let h='';
  if(!store.state.over&&!isAI(ph.side)&&!store.busy){
    if(store.sel.result&&store.sel.result.adv.length){
      const r=store.sel.result,where=HEX[r.k].town?TOWNS[HEX[r.k].town].name:'la case';
      h=`<span>${r.code} : ${esc(where)} est libre. Avancer avec :</span>`+r.adv.map(id=>`<button class="btn" type="button" data-act="advance" data-id="${id}">${esc(U(id).name)}</button>`).join('')+'<button class="btn ghost" type="button" data-act="cancel">Rester</button>';
    }else if(store.sel.target){
      const atk=eligibleAttackers(store.sel.target,ph.side).filter(u=>store.sel.attackers.has(u.id));
      if(atk.length){const o=odds(store.sel.target,atk);if(o.fin>=0)h=`<span>Attaque à ${COLL[o.fin]} avec ${atk.length} unité${atk.length>1?'s':''}</span><button class="btn red" type="button" data-act="attack">Lancer le dé</button><button class="btn ghost" type="button" data-act="cancel">Annuler</button>`;}
    }
  }
  actEl.innerHTML=h;actEl.hidden=!h;
}
export function pulseScore(){scoreEl.classList.remove('pulse');void scoreEl.offsetWidth;scoreEl.classList.add('pulse');}
