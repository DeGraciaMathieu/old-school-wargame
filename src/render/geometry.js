import { CARTOUCHE_H, COLS, FRAME, PAD, R, ROWS } from '../config.js';
import { key, unkey } from '../rules/hex.js';

/* ---------- Géométrie à l'écran : hexagones pointe en haut, lignes impaires décalées ---------- */
export const SQ3=Math.sqrt(3), HW=SQ3*R;
// Marge de la carte : PAD, plus le cadre gradué ; le cartouche s'ajoute sous la carte
export const M=PAD+FRAME;
export const MAPW=Math.round(M*2+HW*(COLS+0.5)), MAPH=Math.round(M*2+2*R+1.5*R*(ROWS-1));
export const SVGW=MAPW, SVGH=MAPH+CARTOUCHE_H;
export const center=(c,r)=>[M+HW/2+HW*(c+0.5*(r&1)), M+R+1.5*R*r];
export const ck=k=>center(...unkey(k));
export function corners(k){const [x,y]=ck(k);const out=[];for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);out.push([x+R*Math.cos(a),y+R*Math.sin(a)]);}return out;}
const poly=k=>corners(k).map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
export const POLY={};for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)POLY[key(c,r)]=poly(key(c,r));
