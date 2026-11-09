import { AI_START_DELAY, AUDIO_BARRAGE_DELAY, AUDIO_CONVOY_DELAY, AUDIO_CONVOY_DELAY_DAWN, PHASES, SIDE, SUPPLY_FX_DELAY, SUPPLY_FX_STAGGER } from '../config.js';
import * as turn from '../rules/turn.js';
import * as victory from '../rules/victory.js';
import { runAI } from './ai.js';
import { captureEffects } from './orders.js';
import { AUDIO } from '../render/audio.js';
import { render } from '../render/index.js';
import { drawStatic, fx } from '../render/map.js';
import { closeModal, modeButtons, openModal } from '../render/sheets.js';
import { createGame, isAI, save, store, vpOf } from '../state/store.js';

/* ---------- Déroulement : partie, phases, fin de partie ---------- */
export function newGame(mode,sc){
  store.state=createGame(mode,sc);drawStatic(store.state.map);
  store.undo=[];store.sel={};closeModal();startPhase();
}
function startPhase(){
  const ph=PHASES[store.state.phase];
  AUDIO.radio(ph.side);
  if(store.state.phase===0)AUDIO.barrage(AUDIO_BARRAGE_DELAY,store.state.turn===1);
  const r=turn.beginPhase(store.state);
  store.state=r.state;
  if(r.news.length)setTimeout(()=>r.news.forEach(([k,t,c],i)=>setTimeout(()=>fx(k,t,c),i*SUPPLY_FX_STAGGER)),SUPPLY_FX_DELAY);
  for(const c of r.captures)captureEffects(c.id,c.side);
  if(r.arrived)AUDIO.convoy(store.state.phase===0?AUDIO_CONVOY_DELAY_DAWN:AUDIO_CONVOY_DELAY);
  store.undo=[];store.sel={};render();save();
  if(isAI(ph.side))setTimeout(runAI,AI_START_DELAY);
}
export function endPhase(){
  if(store.state.over)return;
  const next=turn.nextPhase(store.state);
  if(!next){endGame();return;}
  store.state.turn=next.turn;store.state.phase=next.phase;
  startPhase();
}
function endGame(){
  store.state.over=true;save();render();AUDIO.end();
  const vp=vpOf('de');
  const verdict={de:['Victoire allemande','La route de la Meuse est ouverte.'],draw:['Match nul','Le front tient, mais il a cédé du terrain précieux.'],us:['Victoire américaine','Le saillant est contenu, Bastogne et les carrefours tiennent.']}[victory.outcome(vp)];
  const towns=store.state.map.towns;
  const lines=Object.keys(towns).filter(id=>towns[id].vp).map(id=>`<li><span class="dot ${store.state.control[id]}"></span>${towns[id].name}<em>${towns[id].vp} PV · ${SIDE[store.state.control[id]]}</em></li>`).join('');
  openModal(`<h2>${verdict[0]}</h2><p>${verdict[1]}</p><p>Points de victoire allemands : <b>${vp}</b> (victoire allemande à partir de 5, nul à 3 ou 4).</p><ul class="towns">${lines}</ul><div class="choices">${modeButtons()}</div>`);
}
