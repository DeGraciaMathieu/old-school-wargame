import { BLAST_LIFETIME, FX_LIFETIME, MOVE_ANIM_FALLBACK, MOVE_MS_PER_HEX, PAD, PHASES, R, SHOW_POCKETS, OOS_CUT, OOS_ISOLATED } from '../config.js';
import { DE, DO, key, neighbors, unkey } from '../rules/hex.js';
import { isMech, onMap, other, vals } from '../rules/units.js';
import { AUDIO } from './audio.js';
import { HW, POLY, SVGH, SVGW, center, ck, corners } from './geometry.js';
import { esc, goodFor } from './labels.js';
import { U, bondsOf, canTarget, isAI, occ, store, supplyOf, supplyPath, unitsAt, zocOf } from '../state/store.js';

/* ---------- Rendu de la carte ---------- */
export const svg=document.getElementById('map');
const NS='http://www.w3.org/2000/svg';
// Fond de carte : terrain, routes, rivières et ponts, bâtiments des villes
export function drawStatic(map){
  svg.setAttribute('viewBox',`0 0 ${SVGW} ${SVGH}`);
  let s=`<defs><pattern id="trees" width="11" height="9.5" patternUnits="userSpaceOnUse"><rect width="11" height="9.5" fill="#bdc79c"/><circle cx="3" cy="3" r="1.8" fill="#7f9562"/><circle cx="8.5" cy="7.2" r="1.6" fill="#889b6b"/><circle cx="8.6" cy="2" r=".9" fill="#97a878"/></pattern><pattern id="ihatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="4" stroke="rgba(150,30,10,.55)" stroke-width="1.3"/></pattern></defs>`;
  s+=`<rect width="${SVGW}" height="${SVGH}" fill="#d9cfb2"/>`;
  s+='<g id="terrain">';
  for(const k in map.hex){const h=map.hex[k];s+=`<polygon class="hx ${h.t}${h.alt&&h.t==='clear'?' alt':''}" points="${POLY[k]}" data-k="${k}"${h.t==='forest'?' fill="url(#trees)"':''}/>`;}
  s+='</g><g id="feat" pointer-events="none">';
  for(const ch of map.roadChains){const d='M'+ch.map(k=>ck(k).map(v=>v.toFixed(1)).join(',')).join('L');s+=`<path class="road-c" d="${d}"/>`;}
  for(const ch of map.roadChains){const d='M'+ch.map(k=>ck(k).map(v=>v.toFixed(1)).join(',')).join('L');s+=`<path class="road" d="${d}"/>`;}
  for(const e in map.rivers){const [a,b]=e.split('|');const [bx,by]=ck(b);const cs=corners(a).map(p=>[p,Math.hypot(p[0]-bx,p[1]-by)]).sort((x,y)=>x[1]-y[1]).slice(0,2).map(x=>x[0]);s+=`<line class="river" x1="${cs[0][0].toFixed(1)}" y1="${cs[0][1].toFixed(1)}" x2="${cs[1][0].toFixed(1)}" y2="${cs[1][1].toFixed(1)}"/>`;
    if(map.roads[e]){const mx=(cs[0][0]+cs[1][0])/2,my=(cs[0][1]+cs[1][1])/2;const [ax,ay]=ck(a);const ang=Math.atan2(by-ay,bx-ax)*180/Math.PI;s+=`<rect class="bridge" x="-5" y="-2.6" width="10" height="5.2" transform="translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${ang.toFixed(1)})"/>`;}}
  for(const id in map.towns){const t=map.towns[id];const [x,y]=center(t.c,t.r);
    const b=t.t==='city'?[[-13,-6,6,5],[-6,-9,7,6],[3,-7,8,5],[-11,1,7,5],[-2,0,6,6],[6,1,7,5],[-4,8,9,4]]:[[-10,-5,5,4],[6,-3,5,5],[-7,6,6,4],[5,6,4,4]];
    for(const r of b)s+=`<rect class="bld" x="${(x+r[0]).toFixed(1)}" y="${(y+r[1]).toFixed(1)}" width="${r[2]}" height="${r[3]}"/>`;}
  const [ox,oy]=center(13,10);s+=`<text class="rlabel" transform="translate(${(ox+HW*0.48).toFixed(0)},${(oy+R*0.9).toFixed(0)}) rotate(-72)">Our</text>`;
  const [cx2,cy2]=center(8,6);s+=`<text class="rlabel" transform="translate(${(cx2+HW*0.5).toFixed(0)},${(cy2+R*1.3).toFixed(0)}) rotate(-75)">Clerve</text>`;
  s+=`<text class="mlabel" x="${PAD+4}" y="${SVGH-PAD-2}">← Vers la Meuse</text><text class="mlabel" x="${SVGW-PAD-4}" y="${PAD+10}" text-anchor="end">Allemagne →</text>`;
  s+='</g><g id="hl" pointer-events="none"></g><g id="bonds" pointer-events="none"></g><g id="pockets" pointer-events="none"></g><g id="supline" pointer-events="none"></g><g id="labels" pointer-events="none"></g><g id="units"></g><g id="pklabels" pointer-events="none"></g><g id="fx" pointer-events="none"></g>';
  svg.innerHTML=s;
}
export let LIVE_CUT=new Set();
const rawNb=k=>{const [c,r]=unkey(k);return (r&1?DO:DE).map(([dc,dr])=>[c+dc,r+dr]);};
function pocketsSvg(){
  let out='',lab='';
  for(const sd of ['de','us']){
    const live=supplyOf(sd),foe=occ(other(sd));
    const cut=store.state.units.filter(u=>onMap(u)&&u.side===sd&&!live.has(u.pos));if(!cut.length)continue;
    const set=new Set();for(const u of cut){set.add(u.pos);for(const n of neighbors(u.pos))if(!foe.has(n))set.add(n);}
    const left=new Set(set);
    while(left.size){
      const s0=[...left][0],comp=new Set([s0]),q=[s0];left.delete(s0);
      while(q.length){const h=q.pop();for(const n of neighbors(h))if(left.has(n)){left.delete(n);comp.add(n);q.push(n);}}
      const inC=cut.filter(u=>comp.has(u.pos)),solid=inC.some(u=>(u.oos||0)>=OOS_CUT);
      let d='',fill='';
      for(const h of comp){fill+='M'+POLY[h].split(' ').join('L')+'Z';
        for(const nc of rawNb(h)){if(comp.has(key(...nc)))continue;const [nx,ny]=center(...nc);const e=corners(h).map(p=>[p,Math.hypot(p[0]-nx,p[1]-ny)]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(x=>x[0]);d+=`M${e[0][0].toFixed(1)},${e[0][1].toFixed(1)}L${e[1][0].toFixed(1)},${e[1][1].toFixed(1)}`;}}
      const free=[...comp].filter(h=>!unitsAt(h).length).sort((a,b)=>ck(b)[1]-ck(a)[1]||ck(a)[0]-ck(b)[0]);
      const [ax,ay]=ck(free[0]||[...comp][0]),n=inC.length;
      const txt=solid?'POCHE':(n>1?'SERONT COUPÉES':'SERA COUPÉE'),w=txt.length*6.2+14,cx=Math.min(SVGW-w/2-4,Math.max(w/2+4,ax));
      out+=`<g class="pk ${solid?'solid':'next'}"><path class="pkfill" d="${fill}"/><path class="pkline" d="${d}"/></g>`;
      lab+=`<g class="pk ${solid?'solid':'next'}"><g class="pkl"><rect x="${(cx-w/2).toFixed(1)}" y="${(ay-7).toFixed(1)}" width="${w.toFixed(1)}" height="13" rx="2"/><text x="${cx.toFixed(1)}" y="${(ay+2.4).toFixed(1)}">${txt}</text></g></g>`;
    }
  }
  return [out,lab];
}
function symbol(type){
  const ink='#151a12',box='<rect x="-8" y="-7" width="16" height="10" fill="none" stroke="'+ink+'" stroke-width="1.1"/>';
  const X='<path d="M-8,-7L8,3M8,-7L-8,3" stroke="'+ink+'" stroke-width=".9"/>';
  const E='<ellipse cx="0" cy="-2" rx="5" ry="2.7" fill="none" stroke="'+ink+'" stroke-width="1"/>';
  switch(type){
    case 'inf':return box+X;
    case 'arm':return box+E;
    case 'mech':return box+X+E;
    case 'ab':return box+X+'<path d="M-4,2.3q2,-2.4 4,0q2,-2.4 4,0" fill="none" stroke="'+ink+'" stroke-width=".9"/>';
    case 'eng':return box+'<path d="M-5,1V-4.5H5V1M0,-4.5V1" fill="none" stroke="'+ink+'" stroke-width="1"/>';
    case 'td':return box+'<path d="M-6,2.5L0,-6L6,2.5" fill="none" stroke="'+ink+'" stroke-width="1"/>';
  }
  return box;
}
function counter(u){
  const [a,d,m]=vals(u);
  return `<rect class="cbg ${u.side}" x="-17" y="-17" width="34" height="34" rx="3"/>`+
    (u.steps<u.max?'<path d="M6,-16.5H13.5Q16.5,-16.5 16.5,-13.5V-6Z" fill="#b8402c"/>':'')+
    `<text class="cn" x="0" y="-10">${esc(u.name)}</text>`+symbol(u.type)+`<text class="cv" x="0" y="13.8">${a}-${d}-${m}</text>`+
    ((u.oos||0)>=OOS_ISOLATED?'<rect class="ihatch" x="-17" y="-17" width="34" height="34" rx="3"/>':'')+
    ((u.oos||0)>=OOS_CUT?`<g class="mk ${u.oos>=OOS_ISOLATED?'iso':'cut'}${LIVE_CUT.has(u.id)?'':' back'}"><circle cx="-15" cy="-15" r="6.5"/><text x="-15" y="-11.6">${u.oos>=OOS_ISOLATED?'×':'!'}</text></g>`
      :LIVE_CUT.has(u.id)?'<g class="mk pre"><circle cx="-15" cy="-15" r="6.5"/><text x="-15" y="-11.6">!</text></g>':'');
}
export const counterIcon=u=>`<svg viewBox="-18 -18 36 36" width="40" height="40" aria-hidden="true">${counter(u)}</svg>`;
export function renderMap(){
  const ph=PHASES[store.state.phase];const human=!isAI(ph.side)&&!store.state.over;
  let h='';
  // Mouvement d'un joueur humain : ZOC ennemie légèrement teintée, hors cases occupées par l'ennemi
  if(human&&ph.kind==='move'){const eo=occ(other(ph.side));for(const k of zocOf(other(ph.side)))if(!eo.has(k))h+=`<polygon class="hl-zoc" points="${POLY[k]}"/>`;}
  if(store.sel.reach)for(const [k,r] of store.sel.reach)h+=`<polygon class="${r.zoc?'hl-reachz':'hl-reach'}" points="${POLY[k]}"/>`;
  if(human&&ph.kind==='combat'&&!store.busy){for(const k of new Set(store.state.units.filter(u=>onMap(u)&&u.side!==ph.side).map(u=>u.pos)))if(canTarget(k,ph.side)&&k!==store.sel.target)h+=`<polygon class="hl-target" points="${POLY[k]}"/>`;}
  if(store.sel.target){h+=`<polygon class="hl-tsel" points="${POLY[store.sel.target]}"/>`;const hexes=new Set([...(store.sel.attackers||[])].map(id=>U(id).pos));for(const k of hexes)h+=`<polygon class="hl-atk" points="${POLY[k]}"/>`;}
  if(store.sel.result&&store.sel.result.adv.length&&human&&!store.busy)h+=`<polygon class="hl-adv" points="${POLY[store.sel.result.k]}"/>`;
  else if(store.sel.hex&&!store.sel.target)h+=`<polygon class="hl-sel" points="${POLY[store.sel.hex]}"/>`;
  svg.querySelector('#hl').innerHTML=h;
  let bl='';
  if(ph.kind==='move'&&!store.state.over){
    for(const sd of [ph.side,other(ph.side)]){
      const seen=new Set();
      for(const pairs of bondsOf(sd).values())for(const [a,b] of pairs){
        const id=a<b?a+b:b+a;if(seen.has(id))continue;seen.add(id);
        const [ax,ay]=ck(a),[bx,by]=ck(b),p=t=>[(ax+(bx-ax)*t).toFixed(1),(ay+(by-ay)*t).toFixed(1)],[x1,y1]=p(.22),[x2,y2]=p(.78);
        bl+=`<g class="bond ${sd} ${sd===ph.side?'own':'foe'}"><line class="halo" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="base" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="tk" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/></g>`;
      }
    }
  }
  svg.querySelector('#bonds').innerHTML=bl;
  const [pkS,pkL]=SHOW_POCKETS&&!store.state.over?pocketsSvg():['',''];
  svg.querySelector('#pockets').innerHTML=pkS;
  let sl='';const su=store.sel.unit?U(store.sel.unit):(store.sel.hex&&!store.sel.target&&!store.sel.result?unitsAt(store.sel.hex)[0]:null);
  if(su&&onMap(su)&&!store.state.over){const p=supplyPath(su.side,su.pos);if(p){const pts=p.map(ck);pts.push([su.side==='us'?2:SVGW-2,pts[pts.length-1][1]]);const d='M'+pts.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join('L');sl=`<g class="supl ${su.side}"><path class="h" d="${d}"/><path class="b" d="${d}"/><path class="f" d="${d}"/></g>`;}}
  svg.querySelector('#supline').innerHTML=sl;svg.querySelector('#pklabels').innerHTML=pkL;
  let l='';
  const towns=store.state.map.towns;
  for(const id in towns){const t=towns[id];const [x,y]=center(t.c,t.r);l+=`<text class="tlabel" x="${x.toFixed(1)}" y="${(y+24).toFixed(1)}">${t.name}</text>`;
    if(t.vp)l+=`<g class="vp"><circle class="${store.state.control[id]}" cx="${x.toFixed(1)}" cy="${(y-20).toFixed(1)}" r="6"/><text x="${x.toFixed(1)}" y="${(y-17.2).toFixed(1)}">${t.vp}</text></g>`;}
  svg.querySelector('#labels').innerHTML=l;
  LIVE_CUT=new Set();
  if(!store.state.over)for(const sd of ['de','us']){const live=supplyOf(sd);for(const u of store.state.units)if(onMap(u)&&u.side===sd&&!live.has(u.pos))LIVE_CUT.add(u.id);}
  const by={};for(const u of store.state.units)if(onMap(u))(by[u.pos]=by[u.pos]||[]).push(u);
  let s='';
  for(const k in by){const [x,y]=ck(k);by[k].forEach((u,i)=>{
    const spent=(ph.kind==='move'&&u.side===ph.side&&u.mp<=0)||(ph.kind==='combat'&&u.side===ph.side&&u.attacked);
    s+=`<g class="ctr${spent?' spent':''}${store.sel.unit===u.id?' on':''}" id="u-${u.id}" data-k="${k}" transform="translate(${(x+i*4).toFixed(1)},${(y-i*4).toFixed(1)})">${counter(u)}</g>`;});}
  svg.querySelector('#units').innerHTML=s;
}
export function fx(k,text,cls){const [x,y]=ck(k);const t=document.createElementNS(NS,'text');t.setAttribute('class','fx '+(cls==='bad'?'bad':''));t.setAttribute('x',x);t.setAttribute('y',y-4);t.textContent=text;svg.querySelector('#fx').appendChild(t);setTimeout(()=>t.remove(),FX_LIFETIME);}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
export function impact(k,code,killed){
  fx(k,code,goodFor(code));
  const big=killed>0||code==='DE'||code==='DL2'||code==='DL';
  if(code!=='NE'&&code!=='A1'){const [x,y]=ck(k);const c=document.createElementNS(NS,'circle');c.setAttribute('class','blast'+(big?' big':''));c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',big?26:18);svg.querySelector('#fx').appendChild(c);setTimeout(()=>c.remove(),BLAST_LIFETIME);}
  if(big&&!reduced){const w=document.querySelector('.mapwrap');w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake');}
  if(big&&AUDIO.pref.on)try{navigator.vibrate&&navigator.vibrate([40,30,70]);}catch(e){}
}
export function animatePath(u,path){
  return new Promise(res0=>{
    let fin=false;const res=()=>{if(fin)return;fin=true;if(path.length>1)AUDIO.place();res0();};
    const pts=path.map(ck),per=MOVE_MS_PER_HEX,total=per*(pts.length-1),t0=performance.now();
    if(path.length>1)AUDIO.move(isMech(u),total/1000);
    const g=document.getElementById('u-'+u.id);
    if(!g||reduced||path.length<2){setTimeout(res,path.length>1?total:0);return;}
    g.parentNode.appendChild(g);
    function step(now){const t=Math.max(0,Math.min(1,(now-t0)/total)),f=t*(pts.length-1),i=Math.min(pts.length-2,Math.floor(f)),lt=f-i,e=lt<.5?2*lt*lt:1-Math.pow(-2*lt+2,2)/2;
      g.setAttribute('transform',`translate(${(pts[i][0]+(pts[i+1][0]-pts[i][0])*e).toFixed(1)},${(pts[i][1]+(pts[i+1][1]-pts[i][1])*e).toFixed(1)})`);
      if(t<1)requestAnimationFrame(step);else res();}
    requestAnimationFrame(step);
    setTimeout(res,total+MOVE_ANIM_FALLBACK);
  });
}
export const scroller=document.getElementById('mapscroll');
export function applyZoom(){svg.style.width=Math.round(SVGW*store.zoom)+'px';svg.style.height=Math.round(SVGH*store.zoom)+'px';}
