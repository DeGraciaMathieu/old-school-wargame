import { COLL, CRT, DEFAULT_STEPS, OOB_TEMPLATE, OOS_ATK_DIVISOR, OOS_CUT, OOS_ISOLATED, OOS_MP_DIVISOR, R, RES, RIVER_CROSSING_COST, ROAD_COST, TERRAINS, UNIT_TYPES } from '../config.js';
import { odds } from '../rules/combat.js';
import { key, neighbors, unkey } from '../rules/hex.js';
import { vals } from '../rules/units.js';
import { HW } from './geometry.js';
import { counter } from './map.js';

/* ---------- Scènes animées de l'écran des règles : petits bouts de carte joués en boucle (SMIL), état final seul si mouvement réduit ---------- */
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
// Marge autour des cases, hauteur du bandeau de légende, en pixels du SVG
const P=6,CAP=30;
const f=p=>p[0].toFixed(1)+' '+p[1].toFixed(1),fc=p=>p[0].toFixed(1)+','+p[1].toFixed(1);
const hc=k=>{const [c,r]=unkey(k);return [P+HW/2+HW*(c+0.5*(r&1)),P+R+1.5*R*r];};
const pts=k=>{const [x,y]=hc(k);return Array.from({length:6},(_,i)=>{const a=Math.PI/180*(60*i-30);return [x+R*Math.cos(a),y+R*Math.sin(a)];});};
const poly=(k,cls)=>`<polygon class="${cls}" points="${pts(k).map(fc).join(' ')}"/>`;
// Arête commune de deux cases voisines : les deux coins de a les plus proches du centre de b
const edge=(a,b)=>{const q=hc(b),d=p=>Math.hypot(p[0]-q[0],p[1]-q[1]);return pts(a).sort((p,s)=>d(p)-d(s)).slice(0,2);};
const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const T=t=>OOB_TEMPLATE.find(o=>o.type===t);
const unit=(id,side,type,n,pos,more)=>({id,side,type,name:`${UNIT_TYPES[type].abbr} ${n}`,v:T(type).v,rv:T(type).rv,max:DEFAULT_STEPS,steps:DEFAULT_STEPS,pos,oos:0,...more});
// Pion d'une scène : son marqueur de ravitaillement est toujours à jour
const ctr=u=>counter(u,(u.oos||0)>=OOS_CUT);
const fr=n=>n.toLocaleString('fr-FR',{maximumFractionDigits:2});
const zocOf=ks=>new Set(ks.flatMap(k=>neighbors(k)).filter(k=>!ks.includes(k)));

// Ligne du temps d'une scène de D secondes ; les instants sont des fractions de la boucle (0 à 1)
function timeline(D){
  const rep=`dur="${D}s" repeatCount="indefinite"`,t3=t=>+t.toFixed(3);
  // Visible de t0 à t1 ; figé, seul ce qui reste visible à la fin est dessiné
  const win=(body,t0,t1=1)=>{
    if(reduced)return t1<1?'':body;if(t0<=0&&t1>=1)return body;
    const v=[],k=[];if(t0>0){v.push(0);k.push(0);}v.push(1);k.push(t3(Math.max(0,t0)));if(t1<1){v.push(0);k.push(t3(t1));}
    return `<g opacity="${t0>0?0:1}"><animate attributeName="opacity" calcMode="discrete" values="${v.join(';')}" keyTimes="${k.join(';')}" ${rep}/>${body}</g>`;
  };
  // Pion qui glisse de case en case : frames [[t,case],…] ; tenu sur place avant la première et après la dernière
  const move=(frames,body)=>{
    if(reduced)return `<g transform="translate(${fc(hc(frames.at(-1)[1]))})">${body}</g>`;
    const q=[...frames];if(q[0][0]>0)q.unshift([0,q[0][1]]);if(q.at(-1)[0]<1)q.push([1,q.at(-1)[1]]);
    return `<g transform="translate(${fc(hc(q[0][1]))})"><animateTransform attributeName="transform" type="translate" values="${q.map(x=>f(hc(x[1]))).join(';')}" keyTimes="${q.map(x=>t3(x[0])).join(';')}" calcMode="spline" keySplines="${Array(q.length-1).fill('.45 0 .55 1').join(';')}" ${rep}/>${body}</g>`;
  };
  // Marche case par case à partir de t0 : glissé de step, pause de hold après chaque case
  const walk=(path,t0,step,hold=0)=>{const q=[[t0,path[0]]];let t=t0;for(const k of path.slice(1)){t+=step;q.push([t,k]);if(hold){t+=hold;q.push([t,k]);}}return {frames:q,end:t};};
  // Onde de choc d'un résultat de combat
  const blast=(k,t)=>reduced?'':`<circle class="sc-blast" cx="${hc(k)[0].toFixed(1)}" cy="${hc(k)[1].toFixed(1)}" r="0" opacity="0"><animate attributeName="r" values="4;4;30;30" keyTimes="0;${t3(t)};${t3(t+.06)};1" ${rep}/><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;${t3(t)};${t3(t+.06)};1" ${rep}/></circle>`;
  return {win,move,walk,blast};
}

// Fond : terrain, routes, rivières et ponts ; terrain {case:type}, cases dégagées par défaut
function ground(cols,rows,{terrain={},roads=[],river=[],bridges=[]}={}){
  let s='';
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const k=key(c,r),t=terrain[k]||'clear';s+=`<polygon class="hx ${t}${t==='clear'&&(c+r)%3===1?' alt':''}" points="${pts(k).map(fc).join(' ')}"${t==='forest'?' fill="url(#trees)" stroke="url(#trees)"':''}/>`;}
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)s+=poly(key(c,r),'sc-grid');
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const k=key(c,r),t=terrain[k];if(t&&t!=='clear')s+=`<text class="sc-ter" x="${hc(k)[0].toFixed(1)}" y="${(hc(k)[1]-20).toFixed(1)}">${TERRAINS[t].label}</text>`;}
  for(const ch of roads){const d='M'+ch.map(k=>fc(hc(k))).join('L');s+=`<path class="road-c" d="${d}"/><path class="road" d="${d}"/>`;}
  for(const [a,b] of river){const [p,q]=edge(a,b),d=`M${fc(p)}L${fc(q)}`;s+=`<path class="river-b" d="${d}"/><path class="river" d="${d}"/>`;}
  for(const [a,b] of bridges){const [p,q]=edge(a,b),m=mid(p,q),[ax,ay]=hc(a),[bx,by]=hc(b);
    s+=`<g class="bridge" transform="translate(${fc(m)}) rotate(${(Math.atan2(by-ay,bx-ax)*180/Math.PI).toFixed(1)})"><rect x="-6" y="-3.2" width="12" height="6.4"/><line x1="-6" y1="-3.2" x2="6" y2="-3.2"/><line x1="-6" y1="3.2" x2="6" y2="3.2"/></g>`;}
  return s;
}
const size=(cols,rows,extra=0)=>{const w=2*P+HW*(cols+(rows>1?0.5:0)),h=2*P+2*R+1.5*R*(rows-1);return {w,h,H:h+extra+CAP};};
// Cadre d'une scène : fond papier, contenu, bandeau de légende dont les phrases se succèdent
function frame({w,H},label,body,caps,win){
  const y=H-CAP;
  return `<svg class="scene-svg" viewBox="0 0 ${w.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="${label}"><rect width="${w.toFixed(0)}" height="${H.toFixed(0)}" fill="#d9cfb2"/>${body}`+
    `<rect class="sc-capbg" y="${y.toFixed(1)}" width="${w.toFixed(0)}" height="${CAP}"/>`+
    caps.map(([t0,t1,txt])=>win(`<text class="sc-cap" x="${(w/2).toFixed(1)}" y="${(y+CAP/2+4).toFixed(1)}">${txt}</text>`,t0,t1)).join('')+'</svg>';
}
// Étiquette sur une case (dy : décalage vertical depuis le centre), croix d'interdiction, flèche d'une case vers une autre
const tag=(k,txt,cls='',dy=24)=>`<text class="sc-tag ${cls}" x="${hc(k)[0].toFixed(1)}" y="${(hc(k)[1]+dy).toFixed(1)}">${txt}</text>`;
const cross=k=>{const [x,y]=hc(k),d=9;return `<path class="sc-x" d="M${x-d},${y-d}L${x+d},${y+d}M${x+d},${y-d}L${x-d},${y+d}"/>`;};
function arrow(a,b,cls=''){
  const [ax,ay]=hc(a),[bx,by]=hc(b),u=[bx-ax,by-ay],n=Math.hypot(...u),e=[u[0]/n,u[1]/n],p=t=>[ax+u[0]*t,ay+u[1]*t],s=p(.38),t=p(.72),h=7;
  return `<g class="sc-arrow ${cls}"><path d="M${fc(s)}L${fc(t)}"/><path class="hd" d="M${fc([t[0]+e[0]*h,t[1]+e[1]*h])}L${fc([t[0]-e[1]*h*.6,t[1]+e[0]*h*.6])}L${fc([t[0]+e[1]*h*.6,t[1]-e[0]*h*.6])}Z"/></g>`;
}

/* ---------- Mouvement ---------- */
// L'infanterie dépense ses PM case après case jusqu'à ne plus pouvoir payer la suivante
export function sceneTerrain(){
  const D=8,{win,move,walk}=timeline(D),row=['clear','forest','clear','mountain','clear'],sz=size(row.length,1);
  const terrain=Object.fromEntries(row.map((t,c)=>[key(c,0),t])),u=unit('a','blue','inf',1,'0,0');
  let mp=vals(u)[2];const path=['0,0'],spent=[];
  for(let c=1;c<row.length;c++){const cost=TERRAINS[row[c]].cost.inf;if(cost>mp)break;mp-=cost;path.push(key(c,0));spent.push([cost,mp]);}
  const stop=path.length<row.length?key(path.length,0):null,{frames,end}=walk(path,.14,.1,.12);
  let s=ground(row.length,1,{terrain}),caps=[[0,.14,`${UNIT_TYPES.inf.one[0].toUpperCase()+UNIT_TYPES.inf.one.slice(1)} : ${vals(u)[2]} PM`]];
  spent.forEach(([cost,left],i)=>{const t=frames[1+2*i][0];s+=win(tag(path[i+1],`−${cost} PM`),t);caps.push([t,frames[3+2*i]?.[0]??(stop?end:1),`${TERRAINS[row[i+1]].label} : ${cost} PM, il en reste ${left}`]);});
  if(stop){const need=TERRAINS[terrain[stop]].cost.inf;s+=win(cross(stop)+tag(stop,`${need} PM`,'bad'),end);caps.push([end,1,`${TERRAINS[terrain[stop]].label} : ${need} PM, trop cher. L'unité s'arrête.`]);}
  return frame(sz,'Coût du terrain',s+move(frames,ctr(u)),caps,win);
}
// Sur la route, chaque case coûte ROAD_COST, quel que soit le terrain traversé
export function sceneRoad(){
  const D=8,{win,move,walk}=timeline(D),row=['clear','forest','mountain','forest','forest','clear'],sz=size(row.length,1);
  const terrain=Object.fromEntries(row.map((t,c)=>[key(c,0),t])),u=unit('a','blue','mech',1,'0,0'),all=row.map((_,c)=>key(c,0));
  let mp=vals(u)[2];const path=[all[0]];for(const k of all.slice(1)){if(ROAD_COST>mp)break;mp-=ROAD_COST;path.push(k);}
  const {frames,end}=walk(path,.12,.08,.06);
  let s=ground(row.length,1,{terrain,roads:[all]}),caps=[[0,.12,`Mécanisé : ${vals(u)[2]} PM, sur la route`]];
  path.slice(1).forEach((k,i)=>{const t=frames[1+2*i][0];s+=win(tag(k,`−${ROAD_COST} PM`),t);});
  caps.push([.12,end,`Route : ${ROAD_COST} PM par case, quel que soit le terrain`]);
  caps.push([end,1,`Hors route : forêt ${TERRAINS.forest.cost.mech} PM, montagne ${TERRAINS.mountain.cost.mech} PM`]);
  return frame(sz,'La route',s+move(frames,ctr(u)),caps,win);
}
// Deux mécanisés : l'un franchit la rivière au pont, l'autre à gué, qui lui coûte un supplément et l'arrête
export function sceneRiver(){
  const D=8,{win,move,walk}=timeline(D),cols=5,rows=3,sz=size(cols,rows);
  const west=new Set(['0,0','1,0','0,1','0,2','1,2']),river=[];
  for(const a of west)for(const b of neighbors(a))if(!west.has(b)&&unkey(b)[0]<cols&&unkey(b)[1]<rows)river.push([a,b]);
  const road=[0,1,2,3,4].map(c=>key(c,0)),a=unit('a','blue','mech',1,'0,0'),b=unit('b','blue','mech',2,'0,2');
  const mpA=vals(a)[2],pathA=road.slice(0,1+Math.min(road.length-1,Math.floor(mpA/ROAD_COST)));
  const ford=TERRAINS.clear.cost.mech+RIVER_CROSSING_COST,pathB=['0,2','1,2','2,2'],left=vals(b)[2]-TERRAINS.clear.cost.mech-ford;
  const A=walk(pathA,.12,.1,.05),B=walk(pathB,.12,.1,.05),tFord=B.frames[2][0];
  const [p,q]=edge('1,2','2,2'),m=mid(p,q);
  let s=ground(cols,rows,{roads:[road],river,bridges:[['1,0','2,0']]});
  s+=win(`<text class="sc-tag bad" x="${m[0].toFixed(1)}" y="${(m[1]+R+4).toFixed(1)}">+${RIVER_CROSSING_COST} PM</text>`,tFord);
  s+=win(tag('2,2','Arrêt','bad',-22),B.end);
  const caps=[[0,.12,`Deux mécanisés, ${vals(a)[2]} PM chacun`],[.12,tFord,`Par le pont, la route continue : ${ROAD_COST} PM la case`],[tFord,B.end,`Hors pont : +${RIVER_CROSSING_COST} PM pour traverser`],[B.end,1,`Sur l'autre rive, il s'arrête, même avec ${left} PM en poche`]];
  return frame(sz,'Traverser une rivière',s+move(A.frames,ctr(a))+move(B.frames,ctr(b)),caps,win);
}

/* ---------- ZOC et liaisons ---------- */
// Le blindé entre en ZOC ennemie et s'arrête ; il ne peut pas glisser directement vers une autre case de cette ZOC
export function sceneZoc(){
  const D=8,{win,move,walk}=timeline(D),cols=6,rows=3,sz=size(cols,rows),foe=unit('r','red','inf',1,'4,1'),u=unit('a','blue','arm',1,'0,1');
  const zoc=zocOf([foe.pos]),{frames,end}=walk(['0,1','1,1','2,1','3,1'],.2,.1,.04);
  let s=ground(cols,rows,{terrain:{'1,0':'forest','0,2':'forest','5,0':'forest'}});
  s+=win([...zoc].map(k=>poly(k,'sc-zoc red')).join(''),.06);
  s+=win(tag('3,1','Arrêt','bad',-22),end,end+.2)+win(arrow('3,1','4,0','bad')+cross('4,0'),end+.2);
  const caps=[[0,.2,'Les 6 cases autour d\'une unité : sa zone de contrôle'],[.2,end,'Le blindé avance vers l\'ennemi'],[end,end+.2,'Entrer en ZOC ennemie arrête le mouvement'],[end+.2,1,'D\'une case de ZOC ennemie à une autre : interdit']];
  return frame(sz,'Zone de contrôle',s+move([[0,foe.pos]],ctr(foe))+move(frames,ctr(u)),caps,win);
}
// Deux unités rouges à deux cases se tiennent : les cases entre elles sont fermées aux Bleus
export function sceneBond(){
  const D=9,{win,move,walk}=timeline(D),cols=6,rows=3,sz=size(cols,rows),r1=unit('r1','red','inf',1,'4,0'),r2=unit('r2','red','inf',2,'4,2'),u=unit('a','blue','arm',1,'0,1');
  const between=neighbors(r1.pos).filter(k=>neighbors(r2.pos).includes(k)),zoc=[...zocOf([r1.pos,r2.pos])].filter(k=>!between.includes(k));
  const A=walk(['0,1','1,1','2,1'],.22,.1,.04),t1=A.end+.16,t2=t1+.12,frames=[...A.frames,[t1,'2,1'],[t2,'3,0']];
  const [ax,ay]=hc(r1.pos),[bx,by]=hc(r2.pos),pt=t=>[ax+(bx-ax)*t,ay+(by-ay)*t],[x1,y1]=pt(.22),[x2,y2]=pt(.78),ln=c=>`<line class="${c}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  let s=ground(cols,rows,{terrain:{'0,0':'forest','1,2':'forest'}});
  s+=zoc.map(k=>poly(k,'sc-zoc red')).join('')+between.map(k=>poly(k,'sc-no')).join('');
  s+=`<g class="bond red foe">${ln('halo')}${ln('base')}${ln('tk')}</g>`;
  s+=win(arrow('2,1',between[0],'bad')+cross(between[0]),A.end,t1+.04)+win(tag('3,0','Arrêt','bad',-22),t2);
  const caps=[[0,.22,'Deux unités rouges à deux cases : une liaison'],[.22,A.end,`Les ${between.length} cases qui les séparent sont fermées aux Bleus`],[A.end,t1,'Le blindé ne peut pas s\'y glisser'],[t1,1,'Il contourne, et la ZOC l\'arrête']];
  return frame(sz,'Liaison',s+move([[0,r1.pos]],ctr(r1))+move([[0,r2.pos]],ctr(r2))+move(frames,ctr(u)),caps,win);
}

/* ---------- Ravitaillement ---------- */
// La ligne contourne une première ZOC rouge, puis une seconde la coupe : l'unité est coupée, puis isolée
export function sceneSupply(){
  const D=11,{win,move}=timeline(D),cols=6,rows=3,sz=size(cols,rows),u=unit('a','blue','inf',1,'4,1');
  const r1=unit('r1','red','inf',1,'5,0'),r2=unit('r2','red','arm',2,'5,2');
  const line=path=>{const p=path.map(hc);p.push([0,p.at(-1)[1]]);const d='M'+p.map(fc).join('L');return `<g class="supl blue"><path class="h" d="${d}"/><path class="b" d="${d}"/><path class="f" d="${d}"/></g>`;};
  const zocA=[...zocOf(['2,0'])].filter(k=>k!==u.pos),zocB=[...zocOf(['2,2'])].filter(k=>k!==u.pos);
  let s=ground(cols,rows,{terrain:{'0,0':'forest','1,2':'forest','5,1':'forest'}});
  s+=win(zocA.map(k=>poly(k,'sc-zoc red')).join(''),.32)+win(zocB.map(k=>poly(k,'sc-zoc red')).join(''),.6);
  s+=win(line(['4,1','3,1','2,1','1,1','0,1']),0,.3)+win(line(['4,1','3,1','3,2','2,2','1,2','0,2']),.36,.58);
  const cut={...u,oos:OOS_CUT},iso={...u,oos:OOS_ISOLATED};
  const body=win(ctr(u),0,.64)+win(ctr(cut),.64,.84)+win(ctr(iso),.84);
  const caps=[[0,.24,'Une ligne libre jusqu\'au bord ouest : ravitaillée'],[.24,.36,'Une unité rouge s\'avance'],[.36,.52,'Sa ZOC barre la ligne, qui contourne'],[.52,.64,'Une seconde unité rouge ferme le passage'],
    [.64,.84,`Plus de chemin : coupée, attaque ÷${OOS_ATK_DIVISOR}`],[.84,1,`Coupée deux tours de suite : isolée, PM ÷${OOS_MP_DIVISOR} aussi`]];
  return frame(sz,'Ligne de ravitaillement',s+move([[.24,'5,0'],[.32,'2,0']],ctr(r1))+move([[.52,'5,2'],[.6,'2,2']],ctr(r2))+move([[0,u.pos]],body),caps,win);
}

/* ---------- Combat ---------- */
// Rapport de force, décalage, dé, résultat, repli et avance après combat, calculés par les vraies règles
export function sceneCombat(){
  const D=12,{win,move,blast}=timeline(D),cols=5,rows=3,STRIP=30,sz=size(cols,rows,STRIP);
  const arm=unit('a','blue','arm',1,'2,1'),inf=unit('b','blue','inf',1,'3,0'),foe=unit('r','red','inf',2,'3,1'),k=foe.pos;
  const map={hex:{},rivers:{}};for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)map.hex[key(c,r)]={c,r,t:'clear'};
  const o=odds({map,units:[arm,inf,foe]},k,[arm,inf]),die=CRT[o.fin].indexOf('DL')+1,code=CRT[o.fin][die-1],hurt={...foe,steps:foe.steps-1};
  const tR=.24,tS=.36,tD=.48,tH=.6,tB=.7,tA=.8;
  let s=ground(cols,rows,{terrain:{'0,0':'forest','1,2':'forest','4,2':'forest'}});
  s+=win(poly(k,'hl-tsel'),0,tA)+win(poly(arm.pos,'hl-atk')+poly(inf.pos,'hl-atk'),0,tA);
  s+=win(tag(arm.pos,vals(arm)[0],'big',-21)+tag(inf.pos,vals(inf)[0],'big',-21)+tag(k,vals(foe)[1],'big def',-21),0,tR);
  // Réglette des colonnes de la CRT sous la carte : colonne brute cerclée, colonne finale pleine
  const y=sz.h,cw=(sz.w-2*P)/COLL.length,cell=(i,cls)=>`<rect class="sc-col ${cls}" x="${(P+i*cw+1).toFixed(1)}" y="${(y+4).toFixed(1)}" width="${(cw-2).toFixed(1)}" height="${STRIP-8}"/>`;
  s+=`<rect class="sc-strip" y="${y.toFixed(1)}" width="${sz.w.toFixed(0)}" height="${STRIP}"/>`+COLL.map((c,i)=>cell(i,'')).join('');
  s+=win(cell(o.col,'raw'),tR)+win(cell(o.fin,'fin'),tS)+COLL.map((c,i)=>`<text class="sc-colt" x="${(P+i*cw+cw/2).toFixed(1)}" y="${(y+STRIP/2+4).toFixed(1)}">${c}</text>`).join('');
  // Dé : les faces défilent, puis la valeur tirée reste
  const [dx,dy]=hc('0,2'),face=n=>`<g transform="translate(${dx.toFixed(1)},${dy.toFixed(1)})"><rect class="sc-die" x="-13" y="-13" width="26" height="26" rx="5"/><text class="sc-diet" y="6">${n}</text></g>`;
  for(let i=0;i<6;i++)s+=win(face(1+(i+die)%6),tD+i*.015,tD+(i+1)*.015);
  s+=win(face(die),tD+.09);
  s+=win(`<g class="sc-res"><rect x="${(hc(k)[0]-15).toFixed(1)}" y="${(hc(k)[1]-36).toFixed(1)}" width="30" height="14" rx="2"/>${tag(k,code,'res',-25.5)}</g>`,tH,tB)+blast(k,tH);
  const ratio=o.A/o.D,sh=o.shifts.map(([l,v])=>`${l} : ${v>0?'+':''}${v}`).join(', ');
  const caps=[[0,tR,`Attaque ${vals(arm)[0]} + ${vals(inf)[0]} = ${o.A} contre défense ${o.D}`],[tR,tS,`${o.A} ÷ ${o.D} = ${fr(ratio)} : colonne ${COLL[o.col]}, en faveur du défenseur`],[tS,tD,sh?`${sh} → ${COLL[o.fin]}`:`Aucun décalage : ${COLL[o.fin]}`],
    [tD,tH,`Dé : ${die} dans la colonne ${COLL[o.fin]} → ${code}`],[tH,tA,RES[code]],[tA,1,'La case est libre : le blindé avance']];
  const units=move([[0,inf.pos]],ctr(inf))+move([[tB,k],[tB+.06,'4,1']],win(ctr(foe),0,tH+.03)+win(ctr(hurt),tH+.03))+move([[tA,arm.pos],[tA+.06,k]],ctr(arm));
  return frame(sz,'Résolution d\'un combat',s+units,caps,win);
}
// Repli dans une ZOC ennemie : le défenseur recule quand même et perd un pas
export function sceneRetreat(){
  const D=9,{win,move,blast}=timeline(D),cols=5,rows=3,sz=size(cols,rows),foe=unit('r','red','inf',1,'2,1');
  const blues=[unit('a','blue','inf',1,'1,1'),unit('b','blue','arm',1,'3,0'),unit('c','blue','mech',1,'3,2')],to='3,1';
  const free=neighbors(foe.pos).filter(k=>!blues.some(b=>b.pos===k)),hurt={...foe,steps:foe.steps-1};
  let s=ground(cols,rows,{terrain:{'0,0':'forest','4,1':'forest','0,2':'forest'}});
  s+=win(free.map(k=>poly(k,'sc-zoc blue')).join(''),.24)+win(poly(foe.pos,'hl-tsel'),0,.5);
  s+=win(tag(foe.pos,'D1','bad',-22),.06,.5)+win(tag(to,'−1 pas','bad',26),.62)+blast(to,.6);
  const caps=[[0,.24,`D1 : ${RES.D1.toLowerCase()}`],[.24,.48,'Chaque case libre autour de lui est en ZOC bleue'],[.48,.6,'Il recule quand même dans l\'une d\'elles'],[.6,1,'Une case en ZOC ennemie non tenue : 1 pas perdu']];
  return frame(sz,'Repli en ZOC ennemie',s+blues.map(b=>move([[0,b.pos]],ctr(b))).join('')+move([[.48,foe.pos],[.56,to]],win(ctr(foe),0,.6)+win(ctr(hurt),.6)),caps,win);
}

/* ---------- Pions ---------- */
// Pion agrandi, ses trois zones nommées
export function sceneCounter(){
  const u=unit('a','blue','arm',1,null),sc=2.6,cx=62,cy=66,W=340,H=132,line=(y0,y1,txt)=>`<path class="sc-lead" d="M${cx+46},${(cy+y0*sc).toFixed(1)}H140L150,${y1}H${W-8}"/><text class="sc-call" x="154" y="${y1-4}">${txt}</text>`;
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Anatomie d'un pion"><rect width="${W}" height="${H}" fill="#d9cfb2"/><g transform="translate(${cx},${cy}) scale(${sc})">${ctr(u)}</g>`+
    line(-13,26,'Nom de l\'unité')+line(-1,68,'Symbole du type (ici blindé)')+line(12,110,'Attaque – défense – mouvement')+'</svg>';
}
export const typeCards=()=>['arm','mech','inf','td'].map(t=>[unit(t,'blue',t,1,null),UNIT_TYPES[t].one]).concat([[unit('x','red','inf',2,null,{steps:DEFAULT_STEPS-1}),'unité réduite (coin rouge)']]);
