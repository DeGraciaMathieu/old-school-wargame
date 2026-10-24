import { PHASES } from '../config.js';
import { vals } from '../rules/units.js';
import { advance, doMove, selectUnit } from '../loop/orders.js';
import { AUDIO } from '../render/audio.js';
import { render } from '../render/index.js';
import { svg } from '../render/map.js';
import { U, canTarget, eligibleAttackers, isAI, store, unitsAt } from '../state/store.js';

/* ---------- Interactions : clic sur la carte ---------- */
function onHex(k){
  if(store.busy||!store.state||store.state.over)return;
  const ph=PHASES[store.state.phase];
  if(isAI(ph.side)){store.sel={hex:k};render();return;}
  if(store.sel.result){
    const r=store.sel.result;
    if(k===r.k&&r.adv.length){advance(r.adv.map(U).sort((a,b)=>vals(b)[0]-vals(a)[0])[0].id);return;}
    store.sel={};
  }
  if(ph.kind==='move'){
    if(store.sel.reach&&store.sel.reach.has(k)){doMove(U(store.sel.unit),k,store.sel.reach.get(k));return;}
    const own=unitsAt(k).filter(u=>u.side===ph.side);
    if(own.length){AUDIO.pick();let n;if(store.sel.hex===k&&store.sel.unit){const i=own.findIndex(u=>u.id===store.sel.unit);n=own[(i+1)%own.length];}else n=own.find(u=>u.mp>0)||own[0];selectUnit(n);return;}
    if(store.sel.unit&&store.sel.hex!==k)AUDIO.nope();
    store.sel={hex:k};render();return;
  }
  if(canTarget(k,ph.side)){AUDIO.pick();store.sel={hex:k,target:k,attackers:new Set(eligibleAttackers(k,ph.side).map(u=>u.id))};render();return;}
  store.sel={hex:k};render();
}
svg.addEventListener('click',e=>{const el=e.target.closest('[data-k]');if(el)onHex(el.getAttribute('data-k'));});
