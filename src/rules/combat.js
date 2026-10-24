import { TH, CRT, SHIFT_FOREST, SHIFT_TOWN, SHIFT_CITY, SHIFT_RIVER, SHIFT_ARMOR_CLEAR } from '../config.js';
import { neighbors, ek } from './hex.js';
import { HEX, riverEdge } from './map.js';
import { onMap, vals, atkOf } from './units.js';
import { unitsAt } from './control.js';

export function eligibleAttackers(state,k,side){const nb=neighbors(k);return state.units.filter(u=>onMap(u)&&u.side===side&&!u.attacked&&nb.includes(u.pos));}
export function canTarget(state,k,side){return !state.attacked.includes(k)&&unitsAt(state,k).some(u=>u.side!==side)&&eligibleAttackers(state,k,side).length>0;}
export function odds(state,k,atk){
  const defs=unitsAt(state,k).filter(u=>u.side!==atk[0].side);
  const A=atk.reduce((s,u)=>s+atkOf(u),0),D=defs.reduce((s,u)=>s+vals(u)[1],0);
  let col=-1;for(let i=0;i<TH.length;i++)if(A>=TH[i]*D-1e-9)col=i;
  const shifts=[];const t=HEX[k].t;
  if(t==='forest')shifts.push(['Défenseur en forêt',SHIFT_FOREST]);
  if(t==='town')shifts.push(['Défenseur dans un village',SHIFT_TOWN]);
  if(t==='city')shifts.push(['Défenseur dans la ville',SHIFT_CITY]);
  if(atk.every(a=>riverEdge.has(ek(a.pos,k))))shifts.push(['Attaque à travers une rivière',SHIFT_RIVER]);
  if(t==='clear'&&atk.some(a=>a.type==='arm')&&!defs.some(d=>d.type==='arm'||d.type==='td'))shifts.push(['Blindés en terrain dégagé',SHIFT_ARMOR_CLEAR]);
  const sh=shifts.reduce((s,x)=>s+x[1],0);
  const fin=col<0?-1:Math.max(0,Math.min(CRT.length-1,col+sh));
  return {A,D,col,shifts,fin,defs};
}
