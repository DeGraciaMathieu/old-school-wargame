import { AI_START_DELAY, PHASES, SAILLANT, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../config.js';
import { fieldCache, runAI } from '../loop/ai.js';
import { endPhase, newGame } from '../loop/turn.js';
import { AUDIO } from '../render/audio.js';
import { render } from '../render/index.js';
import { renderScore, scoreEl } from '../render/hud.js';
import { applyZoom, drawStatic } from '../render/map.js';
import { closeModal, modal, rulesScreen, sheet, startScreen } from '../render/sheets.js';
import { isAI, loadSaved, store } from '../state/store.js';

/* ---------- Interactions : fenêtres, zoom, son ---------- */
sheet.addEventListener('click',e=>{
  const m=e.target.closest('[data-mode]');if(m){fieldCache.clear();newGame(m.getAttribute('data-mode'),SAILLANT);return;}
  if(e.target.closest('[data-resume]')){store.state=loadSaved();drawStatic(store.state.map);closeModal();store.undo=[];store.sel={};render();const ph=PHASES[store.state.phase];if(isAI(ph.side))setTimeout(runAI,AI_START_DELAY);return;}
  if(e.target.closest('[data-rules]')){rulesScreen();return;}
  if(e.target.closest('[data-end-confirm]')){closeModal();store.sel={};endPhase();return;}
  if(e.target.closest('[data-close]')){if(store.state)closeModal();else startScreen();}
});
document.getElementById('btnRules').addEventListener('click',rulesScreen);
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||modal.hidden)return;const c=sheet.querySelector('[data-close]');if(c){e.preventDefault();c.click();}});
document.getElementById('btnNew').addEventListener('click',()=>{if(!store.busy)startScreen();});
scoreEl.addEventListener('click',e=>{if(!e.target.closest('.vpsum'))return;store.scoreOpen=!store.scoreOpen;renderScore();});
document.getElementById('zin').addEventListener('click',()=>{store.zoom=Math.min(ZOOM_MAX,store.zoom*ZOOM_STEP);applyZoom();});
document.getElementById('zout').addEventListener('click',()=>{store.zoom=Math.max(ZOOM_MIN,store.zoom/ZOOM_STEP);applyZoom();});
['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,()=>AUDIO.init(),{capture:true,passive:true}));
const btnSound=document.getElementById('btnSound'),btnAmb=document.getElementById('btnAmb');
export function syncSound(){btnSound.setAttribute('aria-pressed',String(AUDIO.pref.on));btnAmb.setAttribute('aria-pressed',String(AUDIO.pref.on&&AUDIO.pref.amb));btnAmb.disabled=!AUDIO.pref.on;}
btnSound.addEventListener('click',()=>{AUDIO.init();AUDIO.setOn(!AUDIO.pref.on);syncSound();AUDIO.tick();});
btnAmb.addEventListener('click',()=>{AUDIO.init();AUDIO.setAmb(!AUDIO.pref.amb);syncSound();AUDIO.tick();});
