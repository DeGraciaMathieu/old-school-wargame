import { VP_GERMAN_WIN, VP_DRAW } from '../config.js';
import { unitsAt } from './control.js';

// Points de victoire d'un camp : somme des PV des villes qu'il contrôle
export const vpOf=(state,side)=>Object.keys(state.map.towns).reduce((s,id)=>s+(state.control[id]===side?state.map.towns[id].vp:0),0);

// Une ville passe au camp qui y entre, sauf si l'ennemi l'occupe encore
export function townTakenBy(state,side,k){const id=state.map.hex[k].town;return id&&!unitsAt(state,k).some(x=>x.side!==side)?id:null;}

// Verdict selon les PV allemands : 'de' (≥ 5), 'draw' (3–4), 'us' (≤ 2)
export const outcome=vp=>vp>=VP_GERMAN_WIN?'de':vp>=VP_DRAW?'draw':'us';
