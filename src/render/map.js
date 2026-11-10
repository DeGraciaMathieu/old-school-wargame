import { BLAST_LIFETIME, CARTOUCHE_H, COLS, FRAME, FX_LIFETIME, MOVE_ANIM_FALLBACK, MOVE_MS_PER_HEX, PAD, R, REGION_PATTERNS, ROWS, SHOW_POCKETS, OOS_CUT, OOS_ISOLATED } from '../config.js';
import { DE, DO, key, neighbors, unkey } from '../rules/hex.js';
import { homeCol, isMech, onMap, other, vals } from '../rules/units.js';
import { AUDIO } from './audio.js';
import { HW, M, MAPH, MAPW, POLY, SVGH, SVGW, center, ck, corners } from './geometry.js';
import { esc, goodFor } from './labels.js';
import { U, bondsOf, canTarget, curPhase, isAI, occ, store, supplyOf, supplyPath, unitsAt, zocOf } from '../state/store.js';

/* ---------- Rendu de la carte ---------- */
export const svg=document.getElementById('map');
const NS='http://www.w3.org/2000/svg';
// Aspect de chaque terrain : variante de teinte, motif de remplissage, bâtiments (x, y, largeur, hauteur)
const LOOK={clear:{alt:true},forest:{fill:'url(#trees)'},mountain:{},
  town:{bld:[[-10,-5,5,4],[6,-3,5,5],[-7,6,6,4],[5,6,4,4]]},
  city:{bld:[[-13,-6,6,5],[-6,-9,7,6],[3,-7,8,5],[-11,1,7,5],[-2,0,6,6],[6,1,7,5],[-4,8,9,4]]}};
// Profondeurs des courbes de niveau sous le bord d'un massif, ombre portée des montagnes (lumière au nord-ouest)
const CONTOURS=[16,8], RELIEF_SHADOW=4;
const rawNb=k=>{const [c,r]=unkey(k);return (r&1?DO:DE).map(([dc,dr])=>[c+dc,r+dr]);};
const pt=p=>p[0].toFixed(1)+','+p[1].toFixed(1);
const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
// Arête de la case k qui fait face au point n (centre d'un voisin, même hors carte)
const edgeTo=(k,n)=>corners(k).map(p=>[p,Math.hypot(p[0]-n[0],p[1]-n[1])]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(x=>x[0]);
// Bord extérieur d'un ensemble de cases, en segments
function outline(set){let d='';for(const k of set)for(const [c,r] of rawNb(k))if(!set.has(key(c,r))){const [a,b]=edgeTo(k,center(c,r));d+=`M${pt(a)}L${pt(b)}`;}return d;}
// Tracé lissé d'une suite de points : passe par les milieux des segments, les points servent de points de contrôle
function smooth(p){if(p.length<3)return 'M'+p.map(pt).join('L');let d=`M${pt(p[0])}L${pt(mid(p[0],p[1]))}`;for(let i=1;i<p.length-1;i++)d+=`Q${pt(p[i])} ${pt(mid(p[i],p[i+1]))}`;return d+`L${pt(p.at(-1))}`;}
// Rivières : toutes les arêtes de rivière enchaînées de coin en coin en tracés continus (deux rivières peuvent partager
// une arête) ; à un carrefour, on continue sur l'arête la plus droite
function riverPaths(map){
  const pts={},adj={},id=p=>Math.round(p[0])+','+Math.round(p[1]);
  for(const e in map.rivers){const [a,b]=e.split('|'),[p,q]=edgeTo(a,ck(b));pts[id(p)]=p;pts[id(q)]=q;(adj[id(p)]||(adj[id(p)]=[])).push(id(q));(adj[id(q)]||(adj[id(q)]=[])).push(id(p));}
  const used=new Set(),free=(a,b)=>!used.has(a+'|'+b),out=[];
  const turn=(a,b,c)=>{const [p,q,r]=[pts[a],pts[b],pts[c]],u=Math.atan2(q[1]-p[1],q[0]-p[0]),v=Math.atan2(r[1]-q[1],r[0]-q[0]);return Math.abs(Math.atan2(Math.sin(v-u),Math.cos(v-u)));};
  const starts=Object.keys(adj).sort((a,b)=>(adj[a].length%2?0:1)-(adj[b].length%2?0:1));
  for(const s0 of starts)for(const n0 of adj[s0]){if(!free(s0,n0))continue;const line=[s0];let prev=null,cur=s0,nx=n0;
    while(nx){used.add(cur+'|'+nx);used.add(nx+'|'+cur);line.push(nx);prev=cur;cur=nx;
      nx=adj[cur].filter(n=>free(cur,n)).sort((a,b)=>turn(prev,cur,a)-turn(prev,cur,b))[0];}
    out.push(line.map(k=>pts[k]));}
  return out;
}
// Nom de la contrée : modèle tiré par la graine, avec la première rivière et la grande ville du centre
export function regionName(map,seed){
  const town=Object.values(map.towns).find(t=>t.band==='center'&&t.t==='city')||Object.values(map.towns)[0],river=map.riverLines[0]?.name||town.name;
  return REGION_PATTERNS[seed%REGION_PATTERNS.length].replace('{r}',river).replace('{t}',town.name).replace(/\bde ([AEIOUYÉÈÂÎÔ])/g,"d'$1");
}
function frame(){
  let s=`<rect class="frame" x="${PAD}" y="${PAD}" width="${MAPW-2*PAD}" height="${MAPH-2*PAD}"/><path class="frame-in" d="M${M-3},${M-3}H${MAPW-M+3}V${MAPH-M+3}H${M-3}Z"/>`;
  const top=PAD+FRAME/2+3,bot=MAPH-PAD-FRAME/2+3,lft=PAD+FRAME/2,rgt=MAPW-PAD-FRAME/2;
  for(let c=0;c<COLS;c++){const x=center(c,0)[0].toFixed(1);s+=`<text class="coord" x="${x}" y="${top}">${c}</text><text class="coord" x="${x}" y="${bot}">${c}</text>`;}
  for(let r=0;r<ROWS;r++){const y=(center(0,r)[1]+3).toFixed(1);s+=`<text class="coord" x="${lft}" y="${y}">${r}</text><text class="coord" x="${rgt}" y="${y}">${r}</text>`;}
  return s;
}
function cartouche(map,seed){
  const y0=MAPH,cy=y0+CARTOUCHE_H/2,w=230,x0=SVGW/2-w/2;
  return `<rect class="cart-bg" x="0" y="${y0}" width="${SVGW}" height="${CARTOUCHE_H}"/>`+
    `<text class="mlabel" x="${PAD+4}" y="${cy+4}">← Arrières bleus</text><text class="mlabel" x="${SVGW-PAD-4}" y="${cy+4}" text-anchor="end">Arrières rouges →</text>`+
    `<g class="cart"><rect x="${x0}" y="${y0+5}" width="${w}" height="${CARTOUCHE_H-10}"/><rect class="in" x="${x0+3}" y="${y0+8}" width="${w-6}" height="${CARTOUCHE_H-16}"/>`+
    `<text class="cname" x="${SVGW/2+10}" y="${cy+1}">${esc(regionName(map,seed))}</text><text class="cnum" x="${SVGW/2+10}" y="${cy+12}">CARTE N° ${seed}</text>`+
    `<g transform="translate(${x0+22},${cy+4})"><path class="rose-n" d="M0,-9L2.2,0L0,9L-2.2,0Z"/><path class="rose-e" d="M-9,0L0,2.2L9,0L0,-2.2Z"/><text class="rose-t" x="0" y="-10.5">N</text></g></g>`;
}
// Fond de carte : terrain, cadre gradué, routes, rivières et ponts, bâtiments des villes, cartouche, lumière
export function drawStatic(map,seed){
  svg.setAttribute('viewBox',`0 0 ${SVGW} ${SVGH}`);
  let s=`<defs><pattern id="trees" width="11" height="9.5" patternUnits="userSpaceOnUse"><rect width="11" height="9.5" fill="#bdc79c"/><circle cx="3" cy="3" r="1.8" fill="#7f9562"/><circle cx="8.5" cy="7.2" r="1.6" fill="#889b6b"/><circle cx="8.6" cy="2" r=".9" fill="#97a878"/></pattern><pattern id="ihatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="4" stroke="rgba(150,30,10,.55)" stroke-width="1.3"/></pattern>`;
  const mts=new Set(Object.keys(map.hex).filter(k=>map.hex[k].t==='mountain')),forest=new Set(Object.keys(map.hex).filter(k=>map.hex[k].t==='forest'));
  s+=`<clipPath id="mclip">${[...mts].map(k=>`<polygon points="${POLY[k]}"/>`).join('')}</clipPath>`;
  s+=`<radialGradient id="vignette" cx="42%" cy="40%" r="75%"><stop offset="60%" stop-color="#1b1505" stop-opacity="0"/><stop offset="100%" stop-color="#1b1505" stop-opacity=".32"/></radialGradient><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="1" seed="7"/><feColorMatrix values="0 0 0 0 .3 0 0 0 0 .24 0 0 0 0 .14 0 0 0 .16 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>`;
  s+=`<rect width="${SVGW}" height="${SVGH}" fill="#d9cfb2"/>`;
  const hx=k=>{const h=map.hex[k],lk=LOOK[h.t];return `<polygon class="hx ${h.t}${h.alt&&lk.alt?' alt':''}" points="${POLY[k]}" data-k="${k}"${lk.fill?` fill="${lk.fill}" stroke="${lk.fill}"`:''}/>`;};
  s+='<g id="terrain">';
  for(const k in map.hex)if(!mts.has(k))s+=hx(k);
  // Ombre portée des massifs vers le sud-est, puis les massifs eux-mêmes
  s+=`<g class="relief-shadow" pointer-events="none" transform="translate(${RELIEF_SHADOW},${RELIEF_SHADOW})">${[...mts].map(k=>`<polygon points="${POLY[k]}"/>`).join('')}</g>`;
  for(const k of mts)s+=hx(k);
  s+='</g><g id="feat" pointer-events="none">';
  // Courbes de niveau : bord du massif repris en traits de plus en plus étroits, découpés à l'intérieur du massif
  const mo=outline(mts);
  if(mo){s+='<g clip-path="url(#mclip)">';for(const d of CONTOURS)s+=`<path class="contour" d="${mo}" stroke-width="${2*d}"/><path class="contour-fill" d="${mo}" stroke-width="${2*d-1.3}"/>`;s+=`<path class="contour edge" d="${mo}"/></g>`;}
  const fo=outline(forest);if(fo)s+=`<path class="forest-edge" d="${fo}"/>`;
  s+=`<path class="grid" d="${Object.values(POLY).map(p=>'M'+p.split(' ').join('L')+'Z').join('')}"/>`;
  s+=frame();
  for(const ch of map.roadChains)s+=`<path class="road-c" d="${smooth(ch.map(ck))}"/>`;
  for(const ch of map.roadChains)s+=`<path class="road" d="${smooth(ch.map(ck))}"/>`;
  for(const line of riverPaths(map)){const d=smooth(line);s+=`<path class="river-b" d="${d}"/><path class="river" d="${d}"/>`;}
  for(const e in map.rivers)if(map.roads[e]){const [a,b]=e.split('|'),[p,q]=edgeTo(a,ck(b)),[mx,my]=mid(p,q),[ax,ay]=ck(a),[bx,by]=ck(b),ang=Math.atan2(by-ay,bx-ax)*180/Math.PI;
    s+=`<g class="bridge" transform="translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${ang.toFixed(1)})"><rect x="-6" y="-3.2" width="12" height="6.4"/><line x1="-6" y1="-3.2" x2="6" y2="-3.2"/><line x1="-6" y1="3.2" x2="6" y2="3.2"/></g>`;}
  for(const id in map.towns){const t=map.towns[id];const [x,y]=center(t.c,t.r);
    for(const r of LOOK[t.t].bld)s+=`<rect class="bld" x="${(x+r[0]).toFixed(1)}" y="${(y+r[1]).toFixed(1)}" width="${r[2]}" height="${r[3]}"/>`;}
  // Nom de chaque rivière à mi-parcours, le long de sa rive
  for(const l of map.riverLines){const m=Math.floor(l.b.length/2),[x,y]=l.dir==='ns'?center(l.b[m],m):center(m,l.b[m]);
    s+=l.dir==='ns'?`<text class="rlabel" transform="translate(${(x-HW*0.5).toFixed(0)},${(y+R*0.3).toFixed(0)}) rotate(-80)">${esc(l.name)}</text>`:`<text class="rlabel" x="${x.toFixed(0)}" y="${(y-R*0.95).toFixed(0)}" text-anchor="middle">${esc(l.name)}</text>`;}
  s+=`<rect class="grain" width="${SVGW}" height="${MAPH}" filter="url(#grain)"/><rect width="${SVGW}" height="${MAPH}" fill="url(#vignette)"/>`;
  s+=cartouche(map,seed);
  s+='</g><g id="hl" pointer-events="none"></g><g id="bonds" pointer-events="none"></g><g id="pockets" pointer-events="none"></g><g id="supline" pointer-events="none"></g><g id="labels" pointer-events="none"></g><g id="units"></g><g id="pklabels" pointer-events="none"></g><g id="fx" pointer-events="none"></g>';
  svg.innerHTML=s;
}
// Vignette d'une carte pour la salle des cartes : terrain à plat, routes, rivières et villes, sans cadre ni motif
export function miniMap(map){
  let s=`<svg class="mini" viewBox="${M} ${M} ${MAPW-2*M} ${MAPH-2*M}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${MAPW}" height="${MAPH}" fill="#d9cfb2"/>`;
  for(const k in map.hex)s+=`<polygon class="hx ${map.hex[k].t}" points="${POLY[k]}"/>`;
  for(const ch of map.roadChains)s+=`<path class="road" d="${smooth(ch.map(ck))}"/>`;
  for(const line of riverPaths(map))s+=`<path class="river" d="${smooth(line)}"/>`;
  for(const id in map.towns){const t=map.towns[id];const [x,y]=center(t.c,t.r);
    for(const r of LOOK[t.t].bld)s+=`<rect class="bld" x="${(x+r[0]).toFixed(1)}" y="${(y+r[1]).toFixed(1)}" width="${r[2]}" height="${r[3]}"/>`;}
  return s+'</svg>';
}
export let LIVE_CUT=new Set();
function pocketsSvg(){
  let out='',lab='';
  for(const sd of ['blue','red']){
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
    case 'td':return box+'<path d="M-6,2.5L0,-6L6,2.5" fill="none" stroke="'+ink+'" stroke-width="1"/>';
  }
  return box;
}
function counter(u){
  const [a,d,m]=vals(u);
  // Pion cartonné : ombre, fond au liseré clair, bande du camp portant le nom, symbole, valeurs
  return `<rect class="csh" x="-16" y="-16" width="34" height="34" rx="3"/><rect class="cbg ${u.side}" x="-17" y="-17" width="34" height="34" rx="3"/>`+
    `<path class="cband ${u.side}" d="M-17,-9V-14Q-17,-17 -14,-17H14Q17,-17 17,-14V-9Z"/>`+
    (u.steps<u.max?'<path d="M6,-16.5H13.5Q16.5,-16.5 16.5,-13.5V-6Z" fill="#b8402c"/>':'')+
    `<text class="cn" x="0" y="-10.8">${esc(u.name)}</text><g transform="translate(0,1.5)">${symbol(u.type)}</g><text class="cv" x="0" y="14.6">${a}-${d}-${m}</text>`+
    ((u.oos||0)>=OOS_ISOLATED?'<rect class="ihatch" x="-17" y="-17" width="34" height="34" rx="3"/>':'')+
    ((u.oos||0)>=OOS_CUT?`<g class="mk ${u.oos>=OOS_ISOLATED?'iso':'cut'}${LIVE_CUT.has(u.id)?'':' back'}"><circle cx="-15" cy="-15" r="6.5"/><text x="-15" y="-11.6">${u.oos>=OOS_ISOLATED?'×':'!'}</text></g>`
      :LIVE_CUT.has(u.id)?'<g class="mk pre"><circle cx="-15" cy="-15" r="6.5"/><text x="-15" y="-11.6">!</text></g>':'');
}
export const counterIcon=u=>`<svg viewBox="-18 -18 36 36" width="40" height="40" aria-hidden="true">${counter(u)}</svg>`;
export function renderMap(){
  const ph=curPhase();const human=!isAI(ph.side)&&!store.state.over;
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
  if(su&&onMap(su)&&!store.state.over){const p=supplyPath(su.side,su.pos);if(p){const pts=p.map(ck);pts.push([homeCol(su.side)===0?M-3:SVGW-M+3,pts[pts.length-1][1]]);const d='M'+pts.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join('L');sl=`<g class="supl ${su.side}"><path class="h" d="${d}"/><path class="b" d="${d}"/><path class="f" d="${d}"/></g>`;}}
  svg.querySelector('#supline').innerHTML=sl;svg.querySelector('#pklabels').innerHTML=pkL;
  let l='';
  const towns=store.state.map.towns;
  for(const id in towns){const t=towns[id];const [x,y]=center(t.c,t.r);l+=`<text class="tlabel" x="${x.toFixed(1)}" y="${(y+24).toFixed(1)}">${t.name}</text>`;
    if(t.vp)l+=`<g class="vp"><circle class="${store.state.control[id]||'neutral'}" cx="${x.toFixed(1)}" cy="${(y-20).toFixed(1)}" r="6"/><text x="${x.toFixed(1)}" y="${(y-17.2).toFixed(1)}">${t.vp}</text></g>`;}
  svg.querySelector('#labels').innerHTML=l;
  LIVE_CUT=new Set();
  if(!store.state.over)for(const sd of ['blue','red']){const live=supplyOf(sd);for(const u of store.state.units)if(onMap(u)&&u.side===sd&&!live.has(u.pos))LIVE_CUT.add(u.id);}
  const by={};for(const u of store.state.units)if(onMap(u))(by[u.pos]=by[u.pos]||[]).push(u);
  let s='';
  for(const k in by){const [x,y]=ck(k);by[k].forEach((u,i)=>{
    const spent=(ph.kind==='move'&&u.side===ph.side&&u.mp<=0)||(ph.kind==='combat'&&u.side===ph.side&&u.attacked);
    const stack=i===by[k].length-1&&i>0?`<g class="stk"><rect x="12" y="10" width="13" height="9" rx="2"/><text x="18.5" y="17">×${by[k].length}</text></g>`:'';
    s+=`<g class="ctr${spent?' spent':''}${store.sel.unit===u.id?' on':''}" id="u-${u.id}" data-k="${k}" transform="translate(${(x+i*4).toFixed(1)},${(y-i*4).toFixed(1)})">${counter(u)}${stack}</g>`;});}
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
