import { STACK_LIMIT, OOS_CUT, OOS_ISOLATED, ARRIVALS, PHASES, TURNS } from '../config.js';
import { neighbors } from './hex.js';
import { other, onMap, mpOf } from './units.js';
import { occ, stackCount } from './control.js';
import { supplyOf } from './supply.js';
import { pushLog } from './journal.js';
import { enterHex } from './occupation.js';

/* Ravitaillement vérifié au début du mouvement d'un camp : coupée, isolée, puis perte d'un pas */
function checkSupply(s,side,news){
  const ok=supplyOf(s,side);
  for(const u of s.units){
    if(u.side!==side||!onMap(u))continue;
    if(ok.has(u.pos)){if(u.oos)news.push([u.pos,'Ravitaillée','']);u.oos=0;continue;}
    u.oos=(u.oos||0)+1;
    if(u.oos===OOS_CUT){news.push([u.pos,'Coupée','bad']);pushLog(s,`${u.name} est coupée de ses lignes.`,side);}
    else if(u.oos===OOS_ISOLATED){news.push([u.pos,'Isolée','bad']);pushLog(s,`${u.name} est isolée.`,side);}
    else{const at=u.pos;u.steps--;if(u.steps<=0){u.dead=true;u.pos=null;}news.push([at,u.dead?'Détruite':'−1 pas','bad']);pushLog(s,`${u.name} ${u.dead?'est détruite faute de ravitaillement':'perd un pas faute de ravitaillement'}.`,side);}
  }
}

/* Case libre la plus proche d'une entrée de renforts (parcours en largeur) */
export function freeHexNear(state,start,side){
  const eo=occ(state,other(side));const seen=new Set([start]);const q=[start];
  while(q.length){const k=q.shift();if(!eo.has(k)&&stackCount(state,k,side)<STACK_LIMIT)return k;for(const n of neighbors(k))if(!seen.has(n)){seen.add(n);q.push(n);}}
  return null;
}

/* Renforts du tour : première entrée libre, sinon la case libre la plus proche */
function arrive(s,side,captures){
  const eo=occ(s,other(side));let n=0;
  for(const u of s.units){
    if(u.side!==side||u.arrived||(u.turn||1)!==s.turn)continue;
    let k=(u.entry||[]).find(e=>!eo.has(e)&&stackCount(s,e,side)<STACK_LIMIT)||freeHexNear(s,u.entry[0],side);
    u.arrived=true;if(k){enterHex(s,u,k,captures);n++;}
  }
  const a=ARRIVALS.filter(a=>a.turn===s.turn&&a.side===side);
  for(const x of a)pushLog(s,'Renforts : '+x.text+'.',side);
  return n;
}

/* Début de phase : remise à zéro des attaques ; en mouvement, ravitaillement, renforts et PM du camp actif */
export function beginPhase(state){
  const s=structuredClone(state),news=[],captures=[];let arrived=0;
  const ph=PHASES[s.phase];
  s.attacked=[];
  for(const u of s.units){u.attacked=false;if(ph.kind==='move'&&u.side===ph.side)u.mp=0;}
  if(ph.kind==='move'){checkSupply(s,ph.side,news);arrived=arrive(s,ph.side,captures);for(const u of s.units)if(u.side===ph.side&&onMap(u))u.mp=mpOf(u);}
  return {state:s,news,captures,arrived};
}

// Phase suivante, ou null quand la dernière phase du dernier tour est terminée
export function nextPhase({turn,phase}){
  if(phase===PHASES.length-1)return turn>=TURNS?null:{turn:turn+1,phase:0};
  return {turn,phase:phase+1};
}
