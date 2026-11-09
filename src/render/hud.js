import { COLL, SIDE, TURNS, TURNS_PER_DAY, VP_WIN_MARGIN } from '../config.js';
import * as victory from '../rules/victory.js';
import { dayOf, esc, turnLabel } from './labels.js';
import { U, curPhase, eligibleAttackers, isAI, odds, store, vpOf } from '../state/store.js';

/* ---------- Piste des tours, score, barre d'action mobile ---------- */
export function renderTrack(){
  let s='';for(let t=1;t<=TURNS;t++){const a=store.state.arrivals.filter(x=>x.turn===t);s+=`<div class="tcell${t<store.state.turn?' past':''}${t===store.state.turn?' now':''}" title="${turnLabel(t)}${a.map(x=>' · Renforts '+SIDE[x.side].toLowerCase()+' : '+x.text).join('')}"><b>J${dayOf(t)}</b>${t%TURNS_PER_DAY?'matin':'a.-midi'}${a.length?`<span class="rfs">${a.map(x=>`<span class="rf ${x.side}">${SIDE[x.side][0]}</span>`).join('')}</span>`:''}</div>`;}
  document.getElementById('track').innerHTML=s;
}
export const scoreEl=document.getElementById('mapscore');
export function renderScore(){
  const vb=vpOf('blue'),vr=vpOf('red'),towns=store.state.map.towns,total=Object.values(towns).reduce((n,t)=>n+t.vp,0);
  const res=victory.outcome(vb,vr),cls=res==='draw'?'mid':res;
  const txt=(store.state.over?{blue:'victoire bleue',draw:'match nul',red:'victoire rouge'}:{blue:'avantage bleu',draw:'match nul',red:'avantage rouge'})[res];
  let s=`<button type="button" class="vpsum" aria-expanded="${store.scoreOpen}"><b><span class="blue">${vb}</span>–<span class="red">${vr}</span></b><span class="lbl">PV bleus – rouges<em class="${cls}">${store.state.over?'Résultat':'Tendance'} : ${txt}</em></span><span class="chev" aria-hidden="true">${store.scoreOpen?'▴':'▾'}</span></button>`;
  // Détail dépliable : PV de chaque camp sur le total, seuil de victoire, puis villes à PV avec leur contrôleur
  if(store.scoreOpen){s+=`<div class="vpdetail"><div class="vpbar"><i style="width:${vb/total*100}%"></i><i class="red" style="width:${vr/total*100}%"></i></div><div class="vplegend"><span>Bleus ${vb}</span><span>Victoire à ${VP_WIN_MARGIN} PV d'écart</span><span>Rouges ${vr}</span></div><ul class="towns">`;for(const id in towns)if(towns[id].vp)s+=`<li><span class="dot ${store.state.control[id]||'neutral'}"></span>${towns[id].name}<em>${towns[id].vp} PV</em></li>`;s+='</ul></div>';}
  scoreEl.innerHTML=s;
}
export const actEl=document.getElementById('mapact');
export function renderAct(){
  const ph=curPhase();let h='';
  if(!store.state.over&&!isAI(ph.side)&&!store.busy){
    if(store.sel.result&&store.sel.result.adv.length){
      const r=store.sel.result,map=store.state.map,where=map.hex[r.k].town?map.towns[map.hex[r.k].town].name:'la case';
      h=`<span>${r.code} : ${esc(where)} est libre. Avancer avec :</span>`+r.adv.map(id=>`<button class="btn" type="button" data-act="advance" data-id="${id}">${esc(U(id).name)}</button>`).join('')+'<button class="btn ghost" type="button" data-act="cancel">Rester</button>';
    }else if(store.sel.target){
      const atk=eligibleAttackers(store.sel.target,ph.side).filter(u=>store.sel.attackers.has(u.id));
      if(atk.length){const o=odds(store.sel.target,atk);if(o.fin>=0)h=`<span>Attaque à ${COLL[o.fin]} avec ${atk.length} unité${atk.length>1?'s':''}</span><button class="btn red" type="button" data-act="attack">Lancer le dé</button><button class="btn ghost" type="button" data-act="cancel">Annuler</button>`;}
    }
  }
  actEl.innerHTML=h;actEl.hidden=!h;
}
export function pulseScore(){scoreEl.classList.remove('pulse');void scoreEl.offsetWidth;scoreEl.classList.add('pulse');}
