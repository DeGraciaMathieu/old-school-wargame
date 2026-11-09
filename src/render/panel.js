import { COLL, CRT, HOME, RES, SIDE, TERRAINS, TURNS, OOS_ISOLATED } from '../config.js';
import { ek, neighbors } from '../rules/hex.js';
import { phaseOf } from '../rules/turn.js';
import { atkOf, other, vals } from '../rules/units.js';
import { esc, turnLabel } from './labels.js';
import { LIVE_CUT, counterIcon } from './map.js';
import { U, bondsOf, curPhase, eligibleAttackers, isAI, odds, store, supplyPath, unitsAt } from '../state/store.js';

/* ---------- Rendu du panneau ---------- */
export const panel=document.getElementById('panel');
function unitMeta(u,ph){
  const st=[];if(u.steps<u.max)st.push('réduite');if(u.oos)st.push((u.oos>=OOS_ISOLATED?'isolée : attaque et mouvement ÷2':'coupée : attaque ÷2')+(LIVE_CUT.has(u.id)?'':' (ligne rétablie, ravitaillée à la prochaine vérification)'));else if(LIVE_CUT.has(u.id))st.push('sera coupée à sa prochaine vérification');
  if(ph.kind==='move'&&u.side===ph.side)st.push(u.mp>0?`${u.mp} PM restants`:'mouvement terminé');
  if(ph.kind==='combat'&&u.side===ph.side&&u.attacked)st.push('a déjà attaqué');
  return `<b>${esc(u.name)}</b><span>${esc(u.div)}${st.length?' · '+st.join(' · '):''}</span>`;
}
// Effet du terrain tel qu'il est expliqué au joueur, case par case
const TERRAIN_NOTE={clear:'1 PM',forest:'2 PM (3 blindés, mécanisés et chasseurs de chars), −1 en défense',mountain:'3 PM (4 blindés, mécanisés et chasseurs de chars), −2 en défense',town:'−1 en défense',city:'−2 en défense'};
function hexBlock(k,ph){
  const map=store.state.map,h=map.hex[k],t=h.town?map.towns[h.town]:null,us=unitsAt(k);
  const rivers=neighbors(k).filter(n=>map.rivers[ek(k,n)]).length;
  let s=`<div class="box"><span class="eyebrow">Hexagone ${k}</span><h3>${t?t.name:TERRAINS[h.t].label}</h3><dl class="kv"><dt>Terrain</dt><dd>${TERRAINS[h.t].label} · ${TERRAIN_NOTE[h.t]}</dd>`;
  if(rivers)s+=`<dt>Rivière</dt><dd>+2 PM pour la traverser hors pont</dd>`;
  const bd=['blue','red'].find(sd=>bondsOf(sd).has(k));
  if(us.length){const su=(store.sel.unit&&U(store.sel.unit).pos===k)?U(store.sel.unit):us[0],p=supplyPath(su.side,su.pos);s+=`<dt>Ravitaillement</dt><dd>${p?`ligne de ${p.length-1} case${p.length>2?'s':''} jusqu'au bord ${HOME[su.side]==='west'?'ouest':'est'}`:'aucune ligne, unité encerclée'}</dd>`;}
  if(bd)s+=`<dt>Liaison</dt><dd>Tenue par les ${SIDE[bd].toLowerCase()}, interdite aux ${SIDE[other(bd)].toLowerCase()}</dd>`;
  const ctl=store.state.control[h.town];
  if(t)s+=`<dt>Contrôle</dt><dd><span class="dot ${ctl||'neutral'}" style="display:inline-block;vertical-align:-1px"></span> ${ctl?SIDE[ctl]:'Neutre'}${t.vp?` · ${t.vp} PV`:''}</dd>`;
  s+='</dl>';
  if(us.length){s+='<div class="units">';for(const u of us){s+=`<button type="button" class="ucard${store.sel.unit===u.id?' on':''}" data-act="unit" data-id="${u.id}">${counterIcon(u)}<span class="meta">${unitMeta(u,ph)}</span></button>`;}s+='</div>';}
  return s+'</div>';
}
function combatBlock(ph){
  const k=store.sel.target,cands=eligibleAttackers(k,ph.side),atk=cands.filter(u=>store.sel.attackers.has(u.id));
  const defs=unitsAt(k).filter(u=>u.side!==ph.side),map=store.state.map,h=map.hex[k];
  let s=`<div class="box"><span class="eyebrow">Attaque</span><h3>${h.town?map.towns[h.town].name:TERRAINS[h.t].label}</h3><div class="units">`;
  for(const d of defs)s+=`<div class="ucard" style="cursor:default">${counterIcon(d)}<span class="meta"><b>${esc(d.name)}</b><span>Défense ${vals(d)[1]}</span></span></div>`;
  s+='</div><p class="hint" style="margin:10px 0 6px">Unités qui participent :</p><div class="units">';
  for(const a of cands)s+=`<label class="chk"><input type="checkbox" data-act="toggle" data-id="${a.id}"${store.sel.attackers.has(a.id)?' checked':''}>${counterIcon(a)}<span class="meta" style="font-size:13px"><b style="font-family:var(--f-cond);font-size:16px;display:block">${esc(a.name)}</b><span style="color:var(--muted)">Attaque ${atkOf(a)}${a.oos?' (coupée)':''}${map.rivers[ek(a.pos,k)]?' · à travers la rivière':''}</span></span></label>`;
  s+='</div>';
  if(!atk.length)return s+'<p class="hint" style="margin-top:10px">Cochez au moins une unité.</p><div class="btns"><button class="btn ghost" type="button" data-act="cancel">Annuler</button></div></div>';
  const o=odds(k,atk);
  s+=`<div class="odds"><span class="big">${o.fin<0?'—':COLL[o.fin]}</span><span class="hint" style="margin:0">${o.A} contre ${o.D}${o.col>=0&&o.fin!==o.col?` · rapport brut ${COLL[o.col]}`:''}</span></div>`;
  if(o.shifts.length)s+='<ul class="shifts">'+o.shifts.map(x=>`<li><span>${x[0]}</span><span>${x[1]>0?'+':'−'}${Math.abs(x[1])}</span></li>`).join('')+'</ul>';
  if(o.fin<0)return s+'<p class="hint">Rapport inférieur à 1:2 : attaque impossible.</p><div class="btns"><button class="btn ghost" type="button" data-act="cancel">Annuler</button></div></div>';
  s+='<div class="crtrow">'+CRT[o.fin].map((c,i)=>`<div class="r ${c}"><small>${i+1}</small>${c}</div>`).join('')+'</div>';
  return s+`<div class="btns"><button class="btn red" type="button" data-act="attack">Lancer le dé</button><button class="btn ghost" type="button" data-act="cancel">Annuler</button></div></div>`;
}
function resultBlock(ph){
  const r=store.sel.result;
  let s=`<div class="box"><span class="eyebrow">Résultat · colonne ${COLL[r.o.fin]}</span><div class="resline"><div class="die${r.fresh?' roll':''}">${r.die}</div><div><div class="code">${r.code}</div><div>${RES[r.code]}</div></div></div>`;
  r.fresh=false;
  if(r.notes.length)s+=`<p class="hint">${r.notes.join(' ; ')}.</p>`;
  if(r.adv.length&&!isAI(ph.side)){
    s+='<p class="hint" style="margin-bottom:6px">L\'hexagone est libre. Avancer avec :</p><div class="units">';
    for(const id of r.adv){const u=U(id);s+=`<button type="button" class="ucard" data-act="advance" data-id="${id}">${counterIcon(u)}<span class="meta"><b>${esc(u.name)}</b><span>Avancer après combat</span></span></button>`;}
    s+='</div><div class="btns" style="margin-top:8px"><button class="btn ghost" type="button" data-act="cancel">Rester sur place</button></div>';
  }else if(!isAI(ph.side))s+='<div class="btns"><button class="btn ghost" type="button" data-act="cancel">Continuer</button></div>';
  return s+'</div>';
}
export function renderPanel(){
  const ph=curPhase(),ai=isAI(ph.side);
  const hint=store.state.over?'Partie terminée.':ai?`L'IA joue les ${SIDE[ph.side].toLowerCase()}…`:ph.kind==='move'?'Touchez une de vos unités, puis un hexagone en surbrillance. La zone de contrôle ennemie est teintée de rouge ; un hexagone atteignable qui s\'y trouve est cerclé de rouge : l\'unité s\'y arrête.':'Touchez un ennemi cerclé de rouge pour préparer une attaque. Chaque unité attaque une fois.';
  let s=`<div class="box phase ${ph.side}"><span class="eyebrow">Tour ${store.state.turn}/${TURNS} · ${turnLabel(store.state.turn)} · carte n° ${store.state.seed}</span><h2>${ph.label}</h2><p class="hint">${hint}</p><div class="btns"><button class="btn" type="button" data-act="end"${store.busy||ai||store.state.over?' disabled':''}>${ph.kind==='move'?'Terminer le mouvement':'Terminer les combats'}</button>${ph.kind==='move'&&!ai&&store.undo.length&&!store.busy?'<button class="btn ghost" type="button" data-act="undo">Annuler le déplacement</button>':''}</div></div>`;
  if(store.sel.result)s+=resultBlock(ph);
  else if(store.sel.target&&!ai)s+=combatBlock(ph);
  else if(store.sel.hex)s+=hexBlock(store.sel.hex,ph);
  // Renforts pas encore entrés : ils arrivent au début du mouvement de leur camp (phase 0 ou 2 selon l'initiative)
  const moveAt=a=>phaseOf({turn:a.turn,phase:0}).side===a.side?0:2;
  const next=store.state.arrivals.filter(a=>a.turn>store.state.turn||(a.turn===store.state.turn&&store.state.phase<moveAt(a)));
  if(next.length)s+=`<div class="box"><span class="eyebrow">Renforts à venir</span><ul class="reinf">${next.map(a=>`<li>Tour ${a.turn} (${turnLabel(a.turn)}) · ${SIDE[a.side]} : ${a.text}</li>`).join('')}</ul></div>`;
  panel.innerHTML=s;
}
