import { key } from './hex.js';

// Case d'une ville de la carte
export const townKey=(map,id)=>key(map.towns[id].c,map.towns[id].r);
