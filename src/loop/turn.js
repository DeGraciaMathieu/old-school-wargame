import { AI_START_DELAY, AUDIO_BARRAGE_DELAY, AUDIO_CONVOY_DELAY, AUDIO_CONVOY_DELAY_DAWN, SEED_MAX, SIDE, SUPPLY_FX_DELAY, SUPPLY_FX_STAGGER, VP_WIN_MARGIN } from '../config.js';
import * as turn from '../rules/turn.js';
import * as victory from '../rules/victory.js';
import { runAI } from './ai.js';
import { captureEffects, diceRng } from './orders.js';
import { AUDIO } from '../render/audio.js';
import { render } from '../render/index.js';
import { drawStatic, fx } from '../render/map.js';
import { closeHall, closeModal, modeButtons, openModal, startScreen } from '../render/sheets.js';
import { createGame, curPhase, isAI, save, store, vpOf } from '../state/store.js';

/* ---------- Déroulement : partie, phases, fin de partie ---------- */
// Graine de carte tirée au dé injecté
const drawSeed=()=>1+Math.floor(diceRng()*SEED_MAX);
// Salle des cartes : trois graines neuves si on le demande ou s'il n'y en a pas encore
export function openHall(reroll){
  if(reroll||!store.hall.seeds.length)store.hall={seeds:[drawSeed(),drawSeed(),drawSeed()],pick:0};
  startScreen();
}
// Partie neuve sur la carte choisie, ou sur une carte tirée au dé
export function newGame(mode,seed=drawSeed()){
  store.state=createGame(mode,seed);drawStatic(store.state.map,store.state.seed);
  store.hall.seeds=[];store.undo=[];store.sel={};closeModal();closeHall();startPhase();
}
function startPhase(){
  const ph=curPhase();
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
  const vb=vpOf('blue'),vr=vpOf('red');
  const verdict={blue:['Victoire bleue','Les Bleus tiennent la contrée.'],draw:['Match nul','Aucun camp n\'a pris l\'ascendant.'],red:['Victoire rouge','Les Rouges tiennent la contrée.']}[victory.outcome(vb,vr)];
  const towns=store.state.map.towns;
  const lines=Object.keys(towns).filter(id=>towns[id].vp).map(id=>{const c=store.state.control[id];return `<li><span class="dot ${c||'neutral'}"></span>${towns[id].name}<em>${towns[id].vp} PV · ${c?SIDE[c]:'Neutre'}</em></li>`;}).join('');
  openModal(`<h2>${verdict[0]}</h2><p>${verdict[1]}</p><p>Points de victoire : Bleus <b>${vb}</b>, Rouges <b>${vr}</b> (victoire à partir de ${VP_WIN_MARGIN} points d'écart, sinon nul).</p><ul class="towns">${lines}</ul><div class="choices">${modeButtons()}</div>`);
}
