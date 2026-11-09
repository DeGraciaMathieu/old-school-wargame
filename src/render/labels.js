import { TURNS_PER_DAY } from '../config.js';

/* ---------- Libellés et échappement HTML ---------- */
export const dayOf=t=>1+Math.floor((t-1)/TURNS_PER_DAY);
export const turnLabel=t=>'jour '+dayOf(t)+', '+(t%TURNS_PER_DAY?'matin':'après-midi');
export const goodFor=c=>c==='A1'?'bad':c==='NE'?'':'good';
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
