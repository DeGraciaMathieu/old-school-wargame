import { COLS, PAD, R, ROWS } from '../config.js';
import { key, unkey } from '../rules/hex.js';

/* ---------- Géométrie à l'écran : hexagones pointe en haut, lignes impaires décalées ---------- */
export const SQ3=Math.sqrt(3), HW=SQ3*R;
export const SVGW=Math.round(PAD*2+HW*(COLS+0.5)), SVGH=Math.round(PAD*2+2*R+1.5*R*(ROWS-1));
export const center=(c,r)=>[PAD+HW/2+HW*(c+0.5*(r&1)), PAD+R+1.5*R*r];
export const ck=k=>center(...unkey(k));
export function corners(k){const [x,y]=ck(k);const out=[];for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);out.push([x+R*Math.cos(a),y+R*Math.sin(a)]);}return out;}
const poly=k=>corners(k).map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
export const POLY={};for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)POLY[key(c,r)]=poly(key(c,r));
