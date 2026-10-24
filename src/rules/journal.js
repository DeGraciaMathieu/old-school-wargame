import { TOWNS, SIDE, LOG_MAX } from '../config.js';
import { vpOf } from './victory.js';

// Ajoute une entrée en tête du journal. Mute l'état reçu : les règles ne l'appellent que sur leur propre copie
export function pushLog(state,text,side){state.log.unshift({t:state.turn,text,side:side||''});if(state.log.length>LOG_MAX)state.log.length=LOG_MAX;}

export const captureText=(state,id,side)=>{const t=TOWNS[id];return `<b>${t.name}</b> passe aux mains des ${SIDE[side].toLowerCase()}${t.vp?` : ${side==='de'?'+':'−'}${t.vp} PV allemands, total ${vpOf(state,'de')}`:''}.`;};
