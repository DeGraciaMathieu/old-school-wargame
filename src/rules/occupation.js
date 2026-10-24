import { townTakenBy } from './victory.js';
import { pushLog, captureText } from './journal.js';

// Entrée d'une unité sur une case : prise de ville éventuelle, consignée au journal et dans captures.
// Mute l'état reçu : réservé aux transitions qui travaillent sur leur propre copie
export function enterHex(s,u,k,captures){u.pos=k;const id=townTakenBy(s,u.side,k);if(id){const prev=s.control[id];s.control[id]=u.side;if(prev!==u.side){captures.push({id,side:u.side});pushLog(s,captureText(s,id,u.side),u.side);}}}
