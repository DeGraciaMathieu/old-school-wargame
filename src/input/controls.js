import { AI_START_DELAY, SEED_MAX, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../config.js';
import { fieldCache, runAI } from '../loop/ai.js';
import { endPhase, newGame, openHall } from '../loop/turn.js';
import { AUDIO } from '../render/audio.js';
import { render } from '../render/index.js';
import { renderScore, scoreEl } from '../render/hud.js';
import { applyZoom, drawStatic } from '../render/map.js';
import { closeHall, closeModal, hall, modal, rulesScreen, sheet, startScreen } from '../render/sheets.js';
import { curPhase, isAI, loadSaved, store } from '../state/store.js';

/* ---------- Interactions : fenêtres, zoom, son ---------- */
function resume(){fieldCache.clear();store.state=loadSaved();drawStatic(store.state.map,store.state.seed);closeModal();closeHall();store.undo=[];store.sel={};render();const ph=curPhase();if(isAI(ph.side))setTimeout(runAI,AI_START_DELAY);}
sheet.addEventListener('click',e=>{
  const m=e.target.closest('[data-mode]');if(m){fieldCache.clear();newGame(m.getAttribute('data-mode'));return;}
  if(e.target.closest('[data-resume]')){resume();return;}
  if(e.target.closest('[data-end-confirm]')){closeModal();store.sel={};endPhase();return;}
  if(e.target.closest('[data-close]'))closeModal();
});
// Salle des cartes : choisir une carte, en tirer trois autres, puis lancer la partie avec un camp
hall.addEventListener('click',e=>{
  const p=e.target.closest('[data-pick]');if(p){store.hall.pick=+p.getAttribute('data-pick');startScreen();return;}
  if(e.target.closest('[data-reroll]')){openHall(true);return;}
  const m=e.target.closest('[data-mode]');if(m){fieldCache.clear();newGame(m.getAttribute('data-mode'),store.hall.seeds[store.hall.pick]);return;}
  if(e.target.closest('[data-resume]')){resume();return;}
  if(e.target.closest('[data-rules]'))rulesScreen();
});
// Un numéro saisi remplace la carte sélectionnée
hall.addEventListener('submit',e=>{
  e.preventDefault();const n=+e.target.elements.seed.value;
  if(!Number.isInteger(n)||n<1||n>SEED_MAX)return;
  store.hall.seeds[store.hall.pick]=n;startScreen();
});
document.getElementById('btnRules').addEventListener('click',rulesScreen);
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||modal.hidden)return;const c=sheet.querySelector('[data-close]');if(c){e.preventDefault();c.click();}});
document.getElementById('btnNew').addEventListener('click',()=>{if(!store.busy)openHall();});
scoreEl.addEventListener('click',e=>{if(!e.target.closest('.vpsum'))return;store.scoreOpen=!store.scoreOpen;renderScore();});
document.getElementById('zin').addEventListener('click',()=>{store.zoom=Math.min(ZOOM_MAX,store.zoom*ZOOM_STEP);applyZoom();});
document.getElementById('zout').addEventListener('click',()=>{store.zoom=Math.max(ZOOM_MIN,store.zoom/ZOOM_STEP);applyZoom();});
['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,()=>AUDIO.init(),{capture:true,passive:true}));
const btnSound=document.getElementById('btnSound'),btnAmb=document.getElementById('btnAmb');
export function syncSound(){btnSound.setAttribute('aria-pressed',String(AUDIO.pref.on));btnAmb.setAttribute('aria-pressed',String(AUDIO.pref.on&&AUDIO.pref.amb));btnAmb.disabled=!AUDIO.pref.on;}
btnSound.addEventListener('click',()=>{AUDIO.init();AUDIO.setOn(!AUDIO.pref.on);syncSound();AUDIO.tick();});
btnAmb.addEventListener('click',()=>{AUDIO.init();AUDIO.setAmb(!AUDIO.pref.amb);syncSound();AUDIO.tick();});
