import { FIRST_DAY } from '../config.js';

/* ---------- Libellés et échappement HTML ---------- */
export const turnLabel=t=>(FIRST_DAY+Math.floor((t-1)/2))+' déc. '+(t%2?'matin':'après-midi');
export const goodFor=c=>c==='A1'?'bad':c==='NE'?'':'good';
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
