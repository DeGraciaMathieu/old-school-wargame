import { SIDE, LOG_MAX } from '../config.js';
import { vpOf } from './victory.js';

// Ajoute une entrée en tête du journal. Mute l'état reçu : les règles ne l'appellent que sur leur propre copie
export function pushLog(state,text,side){state.log.unshift({t:state.turn,text,side:side||''});if(state.log.length>LOG_MAX)state.log.length=LOG_MAX;}

export const captureText=(state,id,side)=>{const t=state.map.towns[id];return `<b>${t.name}</b> passe aux mains des ${SIDE[side].toLowerCase()}${t.vp?` : +${t.vp} PV ${SIDE[side].toLowerCase()}, total ${vpOf(state,side)}`:''}.`;};
