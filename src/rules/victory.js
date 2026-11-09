import { VP_WIN_MARGIN } from '../config.js';
import { unitsAt } from './control.js';

// Points de victoire d'un camp : somme des PV des villes qu'il contrôle (une ville neutre ne rapporte rien)
export const vpOf=(state,side)=>Object.keys(state.map.towns).reduce((s,id)=>s+(state.control[id]===side?state.map.towns[id].vp:0),0);

// Une ville, neutre ou ennemie, passe au camp qui y entre, sauf si l'ennemi l'occupe encore
export function townTakenBy(state,side,k){const id=state.map.hex[k].town;return id&&!unitsAt(state,k).some(x=>x.side!==side)?id:null;}

// Verdict : le camp en tête d'au moins VP_WIN_MARGIN PV gagne, sinon match nul
export const outcome=(blue,red)=>blue-red>=VP_WIN_MARGIN?'blue':red-blue>=VP_WIN_MARGIN?'red':'draw';
