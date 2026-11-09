import { COLS, HOME, OOS_CUT, OOS_ISOLATED, OOS_ATK_DIVISOR, OOS_MP_DIVISOR } from '../config.js';

export const other=s=>s==='blue'?'red':'blue';
// Colonne du bord d'un camp (ravitaillement, renforts, repli)
export const homeCol=s=>HOME[s]==='west'?0:COLS-1;
export const onMap=u=>!u.dead&&!!u.pos;
export const isMechType=t=>t==='arm'||t==='mech'||t==='td';
export const isMech=u=>isMechType(u.type);
// [attaque, défense, mouvement] : valeurs pleines ou réduites selon les pas restants
export const vals=u=>u.steps>=u.max?u.v:u.rv;
export const atkOf=u=>(u.oos||0)>=OOS_CUT?Math.max(1,Math.floor(vals(u)[0]/OOS_ATK_DIVISOR)):vals(u)[0];
export const mpOf=u=>(u.oos||0)>=OOS_ISOLATED?Math.ceil(vals(u)[2]/OOS_MP_DIVISOR):vals(u)[2];
