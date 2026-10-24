import { TOWNS, TERRAIN, STACK_LIMIT, COLL, TH, CRT, RES, DIE_SIDES, SHIFT_FOREST, SHIFT_TOWN, SHIFT_CITY, SHIFT_RIVER, SHIFT_ARMOR_CLEAR } from '../config.js';
import { neighbors, dist, ek } from './hex.js';
import { HEX, riverEdge } from './map.js';
import { other, onMap, vals, atkOf } from './units.js';
import { unitsAt, occ, stackCount, zocOf, bondsOf } from './control.js';
import { pushLog } from './journal.js';
import { enterHex } from './occupation.js';

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

/* ---------- Résolution : transition pure, travaille sur une copie de l'état ---------- */
function stepLoss(list){
  const alive=list.filter(u=>!u.dead);if(!alive.length)return null;
  alive.sort((a,b)=>(b.steps-a.steps)||(vals(b)[0]+vals(b)[1]-vals(a)[0]-vals(a)[1]));
  const u=alive[0];u.steps--;
  if(u.steps<=0){u.dead=true;u.pos=null;return u.name+' est détruit';}
  return u.name+' est réduit';
}
function retreatUnit(s,u,n,enemy,fromHexes,captures){
  let cur=u.pos,lost=0;const seen=new Set([cur]);
  for(let i=0;i<n;i++){
    const eo=occ(s,enemy),ez=zocOf(s,enemy),eb=bondsOf(s,enemy);
    const c=neighbors(cur).filter(h=>!seen.has(h)&&!eo.has(h)&&!eb.has(h)&&stackCount(s,h,u.side,u)<STACK_LIMIT);
    if(!c.length){lost+=n-i;break;}
    const score=h=>{const z=ez.has(h)&&stackCount(s,h,u.side,u)===0;const d=Math.min(...fromHexes.map(f=>dist(f,h)));const dir=u.side==='us'?-HEX[h].c:HEX[h].c;return (z?-100:0)+d*10+dir+(HEX[h].t!=='clear'?0.5:0);};
    c.sort((a,b)=>score(b)-score(a));
    const h=c[0];if(ez.has(h)&&stackCount(s,h,u.side,u)===0)lost++;
    seen.add(h);cur=h;
  }
  enterHex(s,u,cur,captures);
  const notes=[];
  for(let i=0;i<lost&&!u.dead;i++){u.steps--;if(u.steps<=0){u.dead=true;u.pos=null;}}
  if(lost)notes.push(u.dead?u.name+' est détruit pendant le repli':u.name+' perd 1 pas pendant le repli');
  return notes;
}
export function resolveCombat(state,k,atkIds,rng){
  const next=structuredClone(state),captures=[];
  const atk=atkIds.map(id=>next.units.find(u=>u.id===id));
  const side=atk[0].side,enemy=other(side),o=odds(next,k,atk),alive0=next.units.filter(u=>!u.dead).length;
  const die=1+Math.floor(rng()*DIE_SIDES),code=CRT[o.fin][die-1];
  const defs=o.defs,fromHexes=[...new Set(atk.map(a=>a.pos))];
  atk.forEach(a=>a.attacked=true);next.attacked.push(k);
  const notes=[];
  const retreatAll=n=>{for(const d of defs)if(!d.dead)notes.push(...retreatUnit(next,d,n,side,fromHexes,captures));};
  switch(code){
    case 'A1':notes.push(stepLoss(atk));break;
    case 'EX':notes.push(stepLoss(defs));notes.push(stepLoss(atk));break;
    case 'D1':retreatAll(1);break;
    case 'D2':retreatAll(2);break;
    case 'DL':notes.push(stepLoss(defs));retreatAll(1);break;
    case 'DL2':notes.push(stepLoss(defs));retreatAll(2);break;
    case 'DE':for(const d of defs){d.dead=true;d.pos=null;}notes.push(defs.map(d=>d.name).join(', ')+' éliminé'+(defs.length>1?'s':''));break;
  }
  const where=HEX[k].town?TOWNS[HEX[k].town].name:'en '+TERRAIN[HEX[k].t].toLowerCase();
  pushLog(next,`<b>${COLL[o.fin]}</b>, dé ${die} : ${RES[code]} (${where}).${notes.filter(Boolean).length?' '+notes.filter(Boolean).join(' ; ')+'.':''}`,side);
  const vacated=!unitsAt(next,k).some(u=>u.side===enemy);
  const adv=vacated?atk.filter(a=>!a.dead&&neighbors(k).includes(a.pos)).map(a=>a.id):[];
  const killed=alive0-next.units.filter(u=>!u.dead).length;
  return {state:next,captures,result:{k,die,code,o,notes:notes.filter(Boolean),adv,side,killed}};
}
