import { OOS_CUT, OOS_ISOLATED } from '../config.js';

export const other=s=>s==='de'?'us':'de';
export const onMap=u=>!u.dead&&!!u.pos;
export const isMechType=t=>t==='arm'||t==='mech'||t==='td';
export const isMech=u=>isMechType(u.type);
// [attaque, défense, mouvement] : valeurs pleines ou réduites selon les pas restants
export const vals=u=>u.steps>=u.max?u.v:u.rv;
export const atkOf=u=>(u.oos||0)>=OOS_CUT?Math.max(1,Math.floor(vals(u)[0]/2)):vals(u)[0];
export const mpOf=u=>(u.oos||0)>=OOS_ISOLATED?Math.ceil(vals(u)[2]/2):vals(u)[2];
