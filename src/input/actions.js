import { COLL, CRT, END_COMBAT_LIST_MAX, PHASES, TERRAIN, TOWNS } from '../config.js';
import { HEX } from '../rules/map.js';
import { onMap, other } from '../rules/units.js';
import { advance, diceRng, resolve, selectUnit, undoMove } from '../loop/orders.js';
import { endPhase } from '../loop/turn.js';
import { AUDIO } from '../render/audio.js';
import { actEl } from '../render/hud.js';
import { render } from '../render/index.js';
import { esc } from '../render/labels.js';
import { panel } from '../render/panel.js';
import { openModal, sheet } from '../render/sheets.js';
import { U, canTarget, eligibleAttackers, isAI, odds, save, store } from '../state/store.js';

/* ---------- Interactions : boutons du panneau et de la barre d'action ---------- */
function confirmEndCombat(side){
  const enemy=other(side);
  const opts=[...new Set(store.state.units.filter(u=>onMap(u)&&u.side===enemy).map(u=>u.pos))]
    .filter(k=>canTarget(k,side)).map(k=>({k,o:odds(k,eligibleAttackers(k,side))}))
    .filter(x=>x.o.fin>=0).sort((a,b)=>b.o.fin-a.o.fin);
  if(!opts.length)return false;
  const name=k=>HEX[k].town?TOWNS[HEX[k].town].name:TERRAIN[HEX[k].t]+' ('+k+')';
  const tone=fin=>{const g=CRT[fin].filter(c=>c!=='A1'&&c!=='NE').length;return g<=2?'A1':g===3?'EX':g===4?'D2':g===5?'DL':'DE';};
  const n=opts.length,s=n>1?'s':'';
  AUDIO.tick();
  openModal(`<span class="eyebrow">${PHASES[store.state.phase].label}</span><h2>Terminer les combats ?</h2><p>Il reste ${n} attaque${s} possible${s}. Le rapport indiqué suppose que toutes les unités adjacentes participent.</p><ul class="legend">${opts.slice(0,END_COMBAT_LIST_MAX).map(x=>`<li><b class="r ${tone(x.o.fin)}">${COLL[x.o.fin]}</b><span>${esc(name(x.k))}</span></li>`).join('')}</ul>${n>END_COMBAT_LIST_MAX?`<p style="margin-top:8px">Et ${n-END_COMBAT_LIST_MAX} autre${n-END_COMBAT_LIST_MAX>1?'s':''}.</p>`:''}<div class="btns" style="margin-top:16px"><button class="btn" type="button" data-close="1">Continuer les combats</button><button class="btn ghost" type="button" data-end-confirm="1">Terminer quand même</button></div>`);
  const f=sheet.querySelector('[data-close]');if(f)f.focus();
  return true;
}
function onAction(e){
  const b=e.target.closest('[data-act]');if(!b||store.busy)return;
  const act=b.getAttribute('data-act'),id=b.getAttribute('data-id'),ph=PHASES[store.state.phase];
  if(act==='end'){if(ph.kind==='combat'&&confirmEndCombat(ph.side))return;store.sel={};endPhase();}
  else if(act==='undo')undoMove();
  else if(act==='unit'){const u=U(id);if(ph.kind==='move'&&u.side===ph.side&&!isAI(ph.side)){AUDIO.pick();selectUnit(u);}}
  else if(act==='toggle'){AUDIO.tick();if(b.checked)store.sel.attackers.add(id);else store.sel.attackers.delete(id);render();}
  else if(act==='attack'){const atk=[...store.sel.attackers].map(U).filter(u=>!u.attacked);if(!atk.length)return;const r=resolve(store.sel.target,atk,diceRng);r.fresh=true;store.sel={hex:r.k,result:r};render();save();}
  else if(act==='advance')advance(id);
  else if(act==='cancel'){AUDIO.tick();store.sel={};render();}
}
panel.addEventListener('click',onAction);
actEl.addEventListener('click',onAction);
