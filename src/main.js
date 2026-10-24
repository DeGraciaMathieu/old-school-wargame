import {
  R,COLS,ROWS,PAD,MAP_SEED,FOREST_PROB,FOREST_PROB_WEST,FOREST_PROB_OUR,FOREST_WEST_MAX_COL,FOREST_OUR_MIN_COL,FOREST_OUR_MAX_COL,
  TERRAIN_SMOOTH_PASSES,FOREST_GROW_MIN,FOREST_CLEAR_MAX,TOWNS,RIVERS,ROADS,TERRAIN,
  ROAD_COST,FOREST_COST_MECH,FOREST_COST_INF,CLEAR_COST,RIVER_CROSSING_COST,STACK_LIMIT,DEFAULT_STEPS,OOB,ARRIVALS,
  PHASES,SIDE,TURNS,FIRST_DAY,COLL,TH,CRT,RES,DIE_SIDES,SHIFT_FOREST,SHIFT_TOWN,SHIFT_CITY,SHIFT_RIVER,SHIFT_ARMOR_CLEAR,
  OOS_CUT,OOS_ISOLATED,VP_GERMAN_WIN,VP_DRAW,VP_TOTAL,AI_US_SLOTS,AI_DE_CAP_BASTOGNE,AI_DE_CAP_OTHER,AI_DE_VP_WEIGHT,AI_COMBAT_GUARD,
  AI_START_DELAY,AI_END_PHASE_DELAY,AI_MOVE_PAUSE,AI_TARGET_PAUSE,AI_RESULT_PAUSE,AI_ADVANCE_PAUSE,
  SUPPLY_FX_DELAY,SUPPLY_FX_STAGGER,CAPTURE_FX_DELAY,IMPACT_DELAY,FX_LIFETIME,BLAST_LIFETIME,MOVE_MS_PER_HEX,MOVE_ANIM_FALLBACK,
  SAVE_KEY,AUDIO_PREF_KEY,LOG_MAX,END_COMBAT_LIST_MAX,ZOOM_MIN,ZOOM_MAX,ZOOM_STEP,ZOOM_INIT_MIN,ZOOM_INIT_MAX,MOBILE_MAX_WIDTH,SHOW_POCKETS
} from './config.js';
import { key, unkey, DE, DO, neighbors, dist, hexLine, ek } from './rules/hex.js';

/* ---------- Géométrie : hexagones pointe en haut, lignes impaires décalées ---------- */
const SQ3=Math.sqrt(3), HW=SQ3*R;
const SVGW=Math.round(PAD*2+HW*(COLS+0.5)), SVGH=Math.round(PAD*2+2*R+1.5*R*(ROWS-1));
const center=(c,r)=>[PAD+HW/2+HW*(c+0.5*(r&1)), PAD+R+1.5*R*r];
const ck=k=>center(...unkey(k));
function corners(k){const [x,y]=ck(k);const out=[];for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);out.push([x+R*Math.cos(a),y+R*Math.sin(a)]);}return out;}

/* ---------- Carte ---------- */
function mulberry(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rand=mulberry(MAP_SEED);
const HEX={};
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){let p=FOREST_PROB;if(c<=FOREST_WEST_MAX_COL)p=FOREST_PROB_WEST;if(c>=FOREST_OUR_MIN_COL&&c<=FOREST_OUR_MAX_COL)p=FOREST_PROB_OUR;HEX[key(c,r)]={c,r,k:key(c,r),t:rand()<p?'forest':'clear',alt:rand()<0.5};}
for(let pass=0;pass<TERRAIN_SMOOTH_PASSES;pass++){const nx={};for(const k in HEX){const n=neighbors(k).filter(x=>HEX[x].t==='forest').length;nx[k]=n>=FOREST_GROW_MIN?'forest':n<=FOREST_CLEAR_MAX?'clear':HEX[k].t;}for(const k in HEX)HEX[k].t=nx[k];}
for(const id in TOWNS){const t=TOWNS[id];const h=HEX[key(t.c,t.r)];h.t=t.t;h.town=id;}
const townKey=id=>key(TOWNS[id].c,TOWNS[id].r);

const riverEdge=new Map();
for(const k in HEX){const h=HEX[k];for(const n of neighbors(k)){const m=HEX[n];for(const rv of RIVERS){const ba=rv.b[h.r],bb=rv.b[m.r];if(ba==null||bb==null)continue;if((h.c>=ba)!==(m.c>=bb))riverEdge.set(ek(k,n),rv.name);}}}
const eastOfOur=k=>{const h=HEX[k];return h.c>=RIVERS[0].b[h.r];};

const roadEdges=new Set(), roadChains=[];
for(const wps of ROADS){const pts=wps.map(w=>TOWNS[w]?townKey(w):w);const chain=[];for(let i=0;i<pts.length-1;i++){const seg=hexLine(pts[i],pts[i+1]);if(chain.length)seg.shift();chain.push(...seg);}for(let i=0;i<chain.length-1;i++)roadEdges.add(ek(chain[i],chain[i+1]));roadChains.push(chain);}

const isMechType=t=>t==='arm'||t==='mech'||t==='td';
function stepCost(a,b,mech){if(roadEdges.has(ek(a,b)))return ROAD_COST;let c=HEX[b].t==='forest'?(mech?FOREST_COST_MECH:FOREST_COST_INF):CLEAR_COST;if(riverEdge.has(ek(a,b)))c+=RIVER_CROSSING_COST;return c;}

/* ---------- Règles ---------- */
const turnLabel=t=>(FIRST_DAY+Math.floor((t-1)/2))+' déc. '+(t%2?'matin':'après-midi');
const goodFor=c=>c==='A1'?'bad':c==='NE'?'':'good';

/* ---------- État ---------- */
let state=null, busy=false, undo=[], sel={}, zoom=1;
// Dés de combat : Math.random conservé pour garder la séquence de tirages d'origine
const diceRng=Math.random;
const other=s=>s==='de'?'us':'de';
const isAI=s=>state&&((state.mode==='ai-us'&&s==='us')||(state.mode==='ai-de'&&s==='de'));
const onMap=u=>!u.dead&&!!u.pos;
const vals=u=>u.steps>=u.max?u.v:u.rv;
const isMech=u=>isMechType(u.type);
const U=id=>state.units.find(u=>u.id===id);
const unitsAt=k=>state.units.filter(u=>onMap(u)&&u.pos===k);
const occ=side=>new Set(state.units.filter(u=>onMap(u)&&u.side===side).map(u=>u.pos));
const stackCount=(k,side,except)=>state.units.filter(u=>onMap(u)&&u.pos===k&&u.side===side&&u!==except).length;
function zocOf(side){const s=new Set();for(const u of state.units){if(u.side!==side||!onMap(u))continue;for(const n of neighbors(u.pos))s.add(n);}return s;}
function bondsOf(side){
  // Deux unités amies à 2 cases d'écart : les 1 ou 2 cases qui les séparent sont interdites à l'ennemi
  const mine=occ(side),foe=occ(other(side)),out=new Map(),done=new Set();
  for(const a of mine){const na=neighbors(a);
    for(const m of na)for(const b of neighbors(m)){
      if(!mine.has(b)||dist(a,b)!==2)continue;
      const id=a<b?a+'|'+b:b+'|'+a;if(done.has(id))continue;done.add(id);
      const nb=neighbors(b),common=na.filter(h=>nb.includes(h));
      if(common.some(h=>foe.has(h)))continue;
      for(const h of common)if(!mine.has(h))(out.get(h)||out.set(h,[]).get(h)).push([a,b]);
    }}
  return out;
}
/* Ravitaillement : chemin jusqu'à son bord de carte, hors cases ennemies et hors ZOC ennemie (sauf case tenue par un ami) */
function supplyOf(side){
  const own=occ(side),enemy=occ(other(side)),ez=zocOf(other(side));
  const ok=h=>!enemy.has(h)&&(!ez.has(h)||own.has(h));
  const col=side==='us'?0:COLS-1,seen=new Set(),q=[];
  for(let r=0;r<ROWS;r++){const h=key(col,r);if(ok(h)){seen.add(h);q.push(h);}}
  while(q.length){const h=q.pop();for(const n of neighbors(h))if(!seen.has(n)&&ok(n)&&supCross(h,n)){seen.add(n);q.push(n);}}
  return seen;
}
const supCross=(a,b)=>!riverEdge.has(ek(a,b))||roadEdges.has(ek(a,b));
function supplyPath(side,from){
  const own=occ(side),enemy=occ(other(side)),ez=zocOf(other(side)),col=side==='us'?0:COLS-1;
  const ok=h=>!enemy.has(h)&&(!ez.has(h)||own.has(h));
  const par=new Map([[from,null]]),q=[from];
  for(let i=0;i<q.length;i++){const h=q[i];
    if(unkey(h)[0]===col){const p=[];let x=h;while(x){p.unshift(x);x=par.get(x);}return p;}
    for(const n of neighbors(h))if(!par.has(n)&&ok(n)&&supCross(h,n)){par.set(n,h);q.push(n);}}
  return null;
}
const atkOf=u=>(u.oos||0)>=OOS_CUT?Math.max(1,Math.floor(vals(u)[0]/2)):vals(u)[0];
const mpOf=u=>(u.oos||0)>=OOS_ISOLATED?Math.ceil(vals(u)[2]/2):vals(u)[2];
function checkSupply(side){
  const ok=supplyOf(side),news=[];
  for(const u of state.units){
    if(u.side!==side||!onMap(u))continue;
    if(ok.has(u.pos)){if(u.oos)news.push([u.pos,'Ravitaillée','']);u.oos=0;continue;}
    u.oos=(u.oos||0)+1;
    if(u.oos===OOS_CUT){news.push([u.pos,'Coupée','bad']);log(`${u.name} est coupée de ses lignes.`,side);}
    else if(u.oos===OOS_ISOLATED){news.push([u.pos,'Isolée','bad']);log(`${u.name} est isolée.`,side);}
    else{const at=u.pos;u.steps--;if(u.steps<=0){u.dead=true;u.pos=null;}news.push([at,u.dead?'Détruite':'−1 pas','bad']);log(`${u.name} ${u.dead?'est détruite faute de ravitaillement':'perd un pas faute de ravitaillement'}.`,side);}
  }
  if(news.length)setTimeout(()=>news.forEach(([k,t,c],i)=>setTimeout(()=>fx(k,t,c),i*SUPPLY_FX_STAGGER)),SUPPLY_FX_DELAY);
}
const vpOf=side=>Object.keys(TOWNS).reduce((s,id)=>s+(state.control[id]===side?TOWNS[id].vp:0),0);

function log(text,side){state.log.unshift({t:state.turn,text,side:side||''});if(state.log.length>LOG_MAX)state.log.length=LOG_MAX;}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){}}
function loadSaved(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return s&&s.units&&!s.over?s:null;}catch(e){return null;}}

function newGame(mode){
  state={mode,turn:1,phase:0,control:{},attacked:[],log:[],over:false,
    units:OOB.map(o=>({...o,max:o.steps||DEFAULT_STEPS,steps:o.steps||DEFAULT_STEPS,pos:(o.turn||1)>1?null:o.at,arrived:(o.turn||1)===1,mp:0,attacked:false,dead:false,oos:0}))};
  for(const id in TOWNS)state.control[id]=eastOfOur(townKey(id))?'de':'us';
  log('16 décembre, 5 h 30 : l\'artillerie allemande ouvre le feu sur la ligne de la 28th Division.','de');
  undo=[];sel={};closeModal();startPhase();
}

function placeUnit(u,k){u.pos=k;const id=HEX[k].town;if(id&&!unitsAt(k).some(x=>x.side!==u.side)){const prev=state.control[id];state.control[id]=u.side;if(prev!==u.side)captured(id,u.side);}}
function captured(id,side){
  const t=TOWNS[id];AUDIO.stamp();
  log(`<b>${t.name}</b> passe aux mains des ${SIDE[side].toLowerCase()}${t.vp?` : ${side==='de'?'+':'−'}${t.vp} PV allemands, total ${vpOf('de')}`:''}.`,side);
  if(t.vp)setTimeout(()=>{fx(townKey(id),(side==='de'?'+':'−')+t.vp+' PV',side==='de'?'':'bad');pulseScore();},CAPTURE_FX_DELAY);
}
function freeHexNear(start,side){
  const eo=occ(other(side));const seen=new Set([start]);const q=[start];
  while(q.length){const k=q.shift();if(!eo.has(k)&&stackCount(k,side)<STACK_LIMIT)return k;for(const n of neighbors(k))if(!seen.has(n)){seen.add(n);q.push(n);}}
  return null;
}
function arrive(side){
  const eo=occ(other(side));let n=0;
  for(const u of state.units){
    if(u.side!==side||u.arrived||(u.turn||1)!==state.turn)continue;
    let k=(u.entry||[]).find(e=>!eo.has(e)&&stackCount(e,side)<STACK_LIMIT)||freeHexNear(u.entry[0],side);
    u.arrived=true;if(k){placeUnit(u,k);n++;}
  }
  if(n)AUDIO.convoy(state.phase===0?2.6:0.9);
  const a=ARRIVALS.filter(a=>a.turn===state.turn&&a.side===side);
  for(const x of a)log('Renforts : '+x.text+'.',side);
}

function startPhase(){
  const ph=PHASES[state.phase];
  state.attacked=[];
  for(const u of state.units){u.attacked=false;if(ph.kind==='move'&&u.side===ph.side)u.mp=0;}
  AUDIO.radio(ph.side);
  if(state.phase===0)AUDIO.barrage(0.7,state.turn===1);
  if(ph.kind==='move'){checkSupply(ph.side);arrive(ph.side);for(const u of state.units)if(u.side===ph.side&&onMap(u))u.mp=mpOf(u);}
  undo=[];sel={};render();save();
  if(isAI(ph.side))setTimeout(runAI,AI_START_DELAY);
}
function endPhase(){
  if(state.over)return;
  if(state.phase===3){if(state.turn>=TURNS){endGame();return;}state.turn++;state.phase=0;}else state.phase++;
  startPhase();
}
function endGame(){
  state.over=true;save();render();AUDIO.end();
  const vp=vpOf('de');
  const verdict=vp>=VP_GERMAN_WIN?['Victoire allemande','La route de la Meuse est ouverte.']:vp>=VP_DRAW?['Match nul','Le front tient, mais il a cédé du terrain précieux.']:['Victoire américaine','Le saillant est contenu, Bastogne et les carrefours tiennent.'];
  const lines=Object.keys(TOWNS).filter(id=>TOWNS[id].vp).map(id=>`<li><span class="dot ${state.control[id]}"></span>${TOWNS[id].name}<em>${TOWNS[id].vp} PV · ${SIDE[state.control[id]]}</em></li>`).join('');
  openModal(`<h2>${verdict[0]}</h2><p>${verdict[1]}</p><p>Points de victoire allemands : <b>${vp}</b> (victoire allemande à partir de 5, nul à 3 ou 4).</p><ul class="towns">${lines}</ul><div class="choices">${modeButtons()}</div>`);
}

/* ---------- Mouvement ---------- */
function reach(u){
  const enemy=other(u.side),ez=zocOf(enemy),eo=occ(enemy),eb=bondsOf(enemy),mech=isMech(u),start=u.pos,full=u.mp>=mpOf(u);
  const best=new Map([[start,0]]),prev=new Map(),pq=[[0,start]];
  while(pq.length){
    let bi=0;for(let i=1;i<pq.length;i++)if(pq[i][0]<pq[bi][0])bi=i;
    const [d,k]=pq.splice(bi,1)[0];
    if(d>best.get(k)+1e-9)continue;
    if(k!==start&&ez.has(k))continue;
    for(const n of neighbors(k)){
      if(eo.has(n)||eb.has(n))continue;
      if(ez.has(k)&&ez.has(n))continue;
      let nd=d+stepCost(k,n,mech);
      if(nd>u.mp+1e-9){if(k===start&&full&&u.mp>0)nd=u.mp;else continue;}
      if(!best.has(n)||nd<best.get(n)-1e-9){best.set(n,nd);prev.set(n,k);pq.push([nd,n]);}
    }
  }
  const out=new Map();
  for(const [k,c] of best){if(k===start||stackCount(k,u.side,u)>=STACK_LIMIT)continue;const path=[k];let p=k;while(p!==start){p=prev.get(p);path.unshift(p);}out.set(k,{cost:c,path,zoc:ez.has(k)});}
  return out;
}
async function doMove(u,k,r){
  busy=true;
  undo.push(JSON.stringify({units:state.units.map(x=>({id:x.id,pos:x.pos,mp:x.mp})),control:{...state.control}}));
  sel={hex:k};render();
  await animatePath(u,r.path);
  for(const p of r.path.slice(1))placeUnit(u,p);
  u.mp=r.zoc?0:Math.max(0,u.mp-r.cost);
  busy=false;
  sel={hex:k};render();
  save();
}
function undoMove(){
  if(!undo.length||busy)return;
  AUDIO.pick();
  const s=JSON.parse(undo.pop());
  for(const x of s.units){const u=U(x.id);u.pos=x.pos;u.mp=x.mp;}
  state.control=s.control;sel={};render();save();
}
function selectUnit(u){sel={hex:u.pos,unit:u.id,reach:u.mp>0?reach(u):new Map()};render();}

/* ---------- Combat ---------- */
function eligibleAttackers(k,side){const nb=neighbors(k);return state.units.filter(u=>onMap(u)&&u.side===side&&!u.attacked&&nb.includes(u.pos));}
function canTarget(k,side){return !state.attacked.includes(k)&&unitsAt(k).some(u=>u.side!==side)&&eligibleAttackers(k,side).length>0;}
function odds(k,atk){
  const defs=unitsAt(k).filter(u=>u.side!==atk[0].side);
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
function stepLoss(list){
  const alive=list.filter(u=>!u.dead);if(!alive.length)return null;
  alive.sort((a,b)=>(b.steps-a.steps)||(vals(b)[0]+vals(b)[1]-vals(a)[0]-vals(a)[1]));
  const u=alive[0];u.steps--;
  if(u.steps<=0){u.dead=true;u.pos=null;return u.name+' est détruit';}
  return u.name+' est réduit';
}
function retreatUnit(u,n,enemy,fromHexes){
  let cur=u.pos,lost=0;const seen=new Set([cur]);
  for(let i=0;i<n;i++){
    const eo=occ(enemy),ez=zocOf(enemy),eb=bondsOf(enemy);
    const c=neighbors(cur).filter(h=>!seen.has(h)&&!eo.has(h)&&!eb.has(h)&&stackCount(h,u.side,u)<STACK_LIMIT);
    if(!c.length){lost+=n-i;break;}
    const score=h=>{const z=ez.has(h)&&stackCount(h,u.side,u)===0;const d=Math.min(...fromHexes.map(f=>dist(f,h)));const dir=u.side==='us'?-HEX[h].c:HEX[h].c;return (z?-100:0)+d*10+dir+(HEX[h].t!=='clear'?0.5:0);};
    c.sort((a,b)=>score(b)-score(a));
    const h=c[0];if(ez.has(h)&&stackCount(h,u.side,u)===0)lost++;
    seen.add(h);cur=h;
  }
  placeUnit(u,cur);
  const notes=[];
  for(let i=0;i<lost&&!u.dead;i++){u.steps--;if(u.steps<=0){u.dead=true;u.pos=null;}}
  if(lost)notes.push(u.dead?u.name+' est détruit pendant le repli':u.name+' perd 1 pas pendant le repli');
  return notes;
}
function resolve(k,atk,rng){
  const side=atk[0].side,enemy=other(side),o=odds(k,atk),alive0=state.units.filter(u=>!u.dead).length;
  const die=1+Math.floor(rng()*DIE_SIDES),code=CRT[o.fin][die-1];
  const defs=o.defs,fromHexes=[...new Set(atk.map(a=>a.pos))];
  atk.forEach(a=>a.attacked=true);state.attacked.push(k);
  const notes=[];
  const retreatAll=n=>{for(const d of defs)if(!d.dead)notes.push(...retreatUnit(d,n,side,fromHexes));};
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
  log(`<b>${COLL[o.fin]}</b>, dé ${die} : ${RES[code]} (${where}).${notes.filter(Boolean).length?' '+notes.filter(Boolean).join(' ; ')+'.':''}`,side);
  const vacated=!unitsAt(k).some(u=>u.side===enemy);
  const adv=vacated?atk.filter(a=>!a.dead&&neighbors(k).includes(a.pos)).map(a=>a.id):[];
  const killed=alive0-state.units.filter(u=>!u.dead).length;
  AUDIO.dice();AUDIO.combat(code,killed);setTimeout(()=>impact(k,code,killed),IMPACT_DELAY);
  return {k,die,code,o,notes:notes.filter(Boolean),adv,side,killed};
}
async function advance(uid){
  const r=sel.result;if(!r||busy)return;const u=U(uid);
  if(!u||stackCount(r.k,u.side)>=STACK_LIMIT)return;
  busy=true;await animatePath(u,[u.pos,r.k]);busy=false;
  placeUnit(u,r.k);r.adv=r.adv.filter(x=>x!==uid);
  if(stackCount(r.k,u.side)>=STACK_LIMIT)r.adv=[];
  log(`${u.name} avance.`,u.side);render();save();
}

/* ---------- IA ---------- */
const fieldCache=new Map();
function field(goal,mech){
  const c=goal+(mech?'m':'i');if(fieldCache.has(c))return fieldCache.get(c);
  const d=new Map([[goal,0]]),pq=[[0,goal]];
  while(pq.length){let bi=0;for(let i=1;i<pq.length;i++)if(pq[i][0]<pq[bi][0])bi=i;const [dk,k]=pq.splice(bi,1)[0];if(dk>d.get(k))continue;for(const n of neighbors(k)){const nd=dk+stepCost(n,k,mech);if(!d.has(n)||nd<d.get(n)){d.set(n,nd);pq.push([nd,n]);}}}
  fieldCache.set(c,d);return d;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function runAI(){
  if(state.over)return;
  busy=true;render();
  const ph=PHASES[state.phase];
  try{ if(ph.kind==='move')await aiMove(ph.side);else await aiCombat(ph.side); }catch(e){console.error(e);}
  busy=false;await sleep(AI_END_PHASE_DELAY);endPhase();
}
async function aiMove(side){
  const enemy=other(side);
  const mine=state.units.filter(u=>onMap(u)&&u.side===side);
  const goals=new Map();
  if(side==='us'){
    const slots=AI_US_SLOTS.filter(([id])=>state.control[id]==='us');
    const need=new Map(slots);
    const ez=zocOf(enemy);
    for(const u of mine){const id=HEX[u.pos].town;if(id&&need.get(id)>0){need.set(id,need.get(id)-1);goals.set(u.id,null);}}
    for(const u of mine){if(goals.has(u.id))continue;if(ez.has(u.pos)){goals.set(u.id,null);continue;}
      let best=null,bd=1e9;for(const [id,n] of need){if(n<=0)continue;const d=field(townKey(id),isMech(u)).get(u.pos);if(d<bd){bd=d;best=id;}}
      if(best)need.set(best,need.get(best)-1);
      goals.set(u.id,townKey(best||'bastogne'));}
  }else{
    const ez=zocOf(enemy);
    const targets=Object.keys(TOWNS).filter(id=>TOWNS[id].vp>0&&state.control[id]!=='de');
    if(!targets.length)targets.push('bastogne');
    const cap=new Map(targets.map(id=>[id,id==='bastogne'?AI_DE_CAP_BASTOGNE:AI_DE_CAP_OTHER]));
    for(const u of mine){if(ez.has(u.pos)){goals.set(u.id,null);continue;}
      let best=null,bd=1e9;for(const id of targets){if(cap.get(id)<=0)continue;const d=field(townKey(id),isMech(u)).get(u.pos)-TOWNS[id].vp*AI_DE_VP_WEIGHT;if(d<bd){bd=d;best=id;}}
      if(!best)best=targets[0];cap.set(best,cap.get(best)-1);goals.set(u.id,townKey(best));}
  }
  const order=mine.filter(u=>goals.get(u.id)).sort((a,b)=>field(goals.get(a.id),isMech(a)).get(a.pos)-field(goals.get(b.id),isMech(b)).get(b.pos));
  for(const u of order){
    if(!onMap(u)||u.mp<=0)continue;
    const g=goals.get(u.id),f=field(g,isMech(u)),rch=reach(u);
    const score=(k,zoc)=>f.get(k)+(side==='us'&&HEX[k].t!=='clear'?-0.4:0)+(zoc?(side==='de'?-0.2:0.6):0);
    let bestK=null,bs=score(u.pos,false)-0.01;
    for(const [k,r] of rch){const s=score(k,r.zoc);if(s<bs){bs=s;bestK=k;}}
    if(bestK){await doMove(u,bestK,rch.get(bestK));await sleep(AI_MOVE_PAUSE);}
  }
}
async function aiCombat(side){
  for(let guard=0;guard<AI_COMBAT_GUARD;guard++){
    const enemy=other(side);
    const targets=[...new Set(state.units.filter(u=>onMap(u)&&u.side===enemy).map(u=>u.pos))].filter(k=>canTarget(k,side));
    let best=null;
    for(const k of targets){
      let atk=eligibleAttackers(k,side);let o=odds(k,atk);if(o.fin<0)continue;
      if(o.fin>=6){atk.sort((a,b)=>vals(a)[0]-vals(b)[0]);let i=0;while(atk.length>1&&i<atk.length){const t=atk.filter((_,j)=>j!==i);const ot=odds(k,t);if(ot.fin>=5){atk=t;o=ot;}else i++;}}
      const vp=HEX[k].town?TOWNS[HEX[k].town].vp:0;
      const need=side==='de'?(vp>0?2:3):(vp>0&&state.control[HEX[k].town]==='de'?3:4);
      if(o.fin<need)continue;
      const sc=o.fin*2+vp+(o.defs.some(d=>d.steps<d.max)?1:0);
      if(!best||sc>best.sc)best={k,atk,sc};
    }
    if(!best)break;
    sel={hex:best.k,target:best.k,attackers:new Set(best.atk.map(a=>a.id))};AUDIO.pick();render();await sleep(AI_TARGET_PAUSE);
    const res=resolve(best.k,best.atk,diceRng);
    sel={hex:best.k,result:res};render();await sleep(AI_RESULT_PAUSE);
    if(res.adv.length&&(side==='de'||HEX[best.k].town)){
      const a=res.adv.map(U).sort((x,y)=>vals(y)[0]-vals(x)[0])[0];
      const from=a.pos;await animatePath(a,[from,best.k]);placeUnit(a,best.k);log(`${a.name} avance.`,side);sel={hex:best.k};render();await sleep(AI_ADVANCE_PAUSE);
    }
  }
  sel={};
}

/* ---------- Son : tout est synthétisé avec Web Audio ---------- */
const AUDIO=(()=>{
  let ctx=null,master,sfx,amb,noiseBuf,brownBuf,ambNodes=null,ambTimer=null;
  const pref={on:true,amb:true};
  try{const p=JSON.parse(localStorage.getItem(AUDIO_PREF_KEY)||'null');if(p)Object.assign(pref,p);}catch(e){}
  const savePref=()=>{try{localStorage.setItem(AUDIO_PREF_KEY,JSON.stringify(pref));}catch(e){}};
  const ok=()=>!!ctx&&pref.on;
  const now=()=>ctx.currentTime;
  function env(g,t,a,pk,dec){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec);}
  function noise(o){
    const t=o.t??now(),a=o.a||0.002;const src=ctx.createBufferSource();src.buffer=o.brown?brownBuf:noiseBuf;src.loop=true;
    const f=ctx.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+a+o.dur);f.Q.value=o.q??1;
    const g=ctx.createGain();env(g,t,a,o.gain??0.3,o.dur);
    src.connect(f);f.connect(g);g.connect(o.dest||sfx);src.start(t,Math.random()*1.5);src.stop(t+a+o.dur+0.05);
  }
  function tone(o){
    const t=o.t??now(),a=o.a||0.002,pk=o.gain??0.2;const os=ctx.createOscillator();os.type=o.type||'sine';os.frequency.setValueAtTime(o.f,t);if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2,t+a+o.dur);
    const g=ctx.createGain();
    if(o.sus){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.setValueAtTime(pk,t+o.dur);g.gain.linearRampToValueAtTime(0,t+o.dur+0.012);}else env(g,t,a,pk,o.dur);
    os.connect(g);g.connect(o.dest||sfx);os.start(t);os.stop(t+a+o.dur+0.06);
  }
  function engine(t,dur,vol,f0,f1){
    const os=ctx.createOscillator();os.type='sawtooth';os.frequency.setValueAtTime(f0,t);os.frequency.linearRampToValueAtTime(f1,t+dur*0.5);os.frequency.linearRampToValueAtTime(f0,t+dur+0.3);
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=240;lp.Q.value=2;
    const tr=ctx.createGain();tr.gain.value=0.7;const lfo=ctx.createOscillator();lfo.frequency.value=8+Math.random()*3;const lg=ctx.createGain();lg.gain.value=0.3;lfo.connect(lg);lg.connect(tr.gain);
    const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+0.15);g.gain.setValueAtTime(vol,t+dur);g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.5);
    os.connect(lp);lp.connect(tr);tr.connect(g);g.connect(sfx);os.start(t);lfo.start(t);os.stop(t+dur+0.6);lfo.stop(t+dur+0.6);
  }
  const S={
    pick(){if(!ok())return;const t=now();noise({t,f:2600+Math.random()*700,q:2.5,dur:0.03,gain:0.25});tone({t,f:1100,dur:0.025,type:'triangle',gain:0.05});},
    place(){if(!ok())return;const t=now();noise({t,f:850+Math.random()*200,q:1.2,dur:0.05,gain:0.35});tone({t,f:150,f2:80,dur:0.08,gain:0.32});},
    tick(){if(!ok())return;noise({f:3800,q:3,dur:0.015,gain:0.15});},
    nope(){if(!ok())return;tone({f:190,f2:120,dur:0.09,type:'triangle',gain:0.1});},
    move(mech,dur){if(!ok())return;const t=now();
      if(mech){engine(t,dur,0.15,38,52);noise({t,brown:true,type:'lowpass',f:300,dur:dur+0.3,a:0.15,gain:0.22});
        for(let x=0.04;x<dur;x+=0.07+Math.random()*0.04)noise({t:t+x,f:2800+Math.random()*1500,q:6,dur:0.02,gain:0.07});}
      else for(let x=0;x<Math.max(dur,0.1);x+=0.16+Math.random()*0.05){noise({t:t+x,type:'lowpass',f:1300+Math.random()*500,q:0.7,dur:0.07,a:0.01,gain:0.2});noise({t:t+x+0.02,f:4200,q:1,dur:0.04,gain:0.04});}
    },
    dice(){if(!ok())return;const t=now();let x=0;
      for(let i=0;i<7;i++){noise({t:t+x,f:2500+Math.random()*2500,q:4,dur:0.018,gain:0.24-i*0.015});tone({t:t+x,f:600+Math.random()*500,dur:0.015,type:'triangle',gain:0.03});x+=0.035+i*0.012;}
      noise({t:t+x,f:700,q:1,dur:0.06,gain:0.3});tone({t:t+x,f:130,f2:70,dur:0.1,gain:0.3});},
    boom(t,size=1,far=0,dest){
      noise({t,type:'lowpass',f:far?500:2600*size,f2:far?110:190,q:0.8,dur:0.5+size*0.9,a:0.005,gain:(far?0.16:0.55)*Math.min(1.2,size),dest});
      noise({t,brown:true,type:'lowpass',f:220,q:0.5,dur:1+size*1.4,a:0.02,gain:(far?0.28:0.6)*size,dest});
      tone({t,f:far?55:75,f2:28,dur:0.35+size*0.4,gain:(far?0.22:0.6)*Math.min(1,size),dest});
      if(!far&&size>0.9)for(let i=0;i<6;i++)noise({t:t+0.25+Math.random()*0.8,f:3000+Math.random()*3000,q:5,dur:0.02,gain:0.05,dest});
    },
    mg(t,n=9){for(let i=0;i<n;i++){const tt=t+i*0.075;noise({t:tt,f:1300,q:0.9,dur:0.06,a:0.001,gain:0.3});tone({t:tt,f:180,f2:90,dur:0.04,gain:0.14});}},
    combat(code,killed){if(!ok())return;const t=now()+0.55;
      switch(code){
        case 'NE':S.boom(t,0.6,1);S.boom(t+0.5,0.5,1);break;
        case 'A1':S.mg(t,10);S.mg(t+1,6);break;
        case 'D1':S.boom(t,0.8);S.boom(t+0.35,0.6);break;
        case 'D2':S.boom(t,0.9);S.boom(t+0.3,0.7);S.boom(t+0.6,0.8);break;
        case 'EX':S.boom(t,0.9);S.mg(t+0.25,8);break;
        case 'DL':S.boom(t,1);S.boom(t+0.4,0.8);S.mg(t+0.6,5);break;
        case 'DL2':S.boom(t,1.1);S.boom(t+0.3,0.9);S.boom(t+0.6,1);break;
        case 'DE':S.boom(t,1.4);S.boom(t+0.25,1.1);S.boom(t+0.55,1.2);break;
      }
      if(killed)S.boom(t+1.1,1.5);
    },
    radio(side,d=0){if(!ok())return;const t=now()+d;
      noise({t,f:1800,q:1.4,dur:0.14,a:0.004,gain:0.12});
      const f=side==='de'?640:760;let x=0.2;
      for(const ch of side==='de'?'-..':'..-'){const l=ch==='-'?0.17:0.06;tone({t:t+x,f,dur:l,a:0.006,sus:true,gain:0.08});x+=l+0.06;}
      noise({t:t+x+0.05,f:2100,q:1.6,dur:0.07,gain:0.09});},
    barrage(d=0,heavy=false){if(!ok())return;const t=now()+d,n=heavy?12:5;
      for(let i=0;i<n;i++)S.boom(t+i*(heavy?0.22:0.4)+Math.random()*0.25,(heavy?0.8:0.6)+Math.random()*0.4,heavy&&i%3===0?0:1);},
    convoy(d=0){if(!ok())return;const t=now()+d;engine(t,2.2,0.13,32,46);
      noise({t,brown:true,type:'lowpass',f:260,dur:2.2,a:1,gain:0.32});
      for(let x=0.4;x<2.5;x+=0.06+Math.random()*0.05)noise({t:t+x,f:3000+Math.random()*1500,q:6,dur:0.02,gain:0.02+0.05*Math.sin(Math.PI*x/2.6)});},
    stamp(d=0.12){if(!ok())return;const t=now()+d;tone({t,f:110,f2:60,dur:0.12,gain:0.45});noise({t,f:600,q:0.8,dur:0.08,gain:0.4});noise({t:t+0.01,f:5000,q:0.7,dur:0.05,gain:0.06});},
    end(){if(!ok())return;S.radio('us');S.barrage(0.9);}
  };
  function startAmb(){
    if(!ctx||ambNodes)return;const t=now();
    const src=ctx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
    const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=500;bp.Q.value=0.6;
    const l1=ctx.createOscillator();l1.frequency.value=0.08;const g1=ctx.createGain();g1.gain.value=300;l1.connect(g1);g1.connect(bp.frequency);
    const wg=ctx.createGain();wg.gain.value=0.05;const l2=ctx.createOscillator();l2.frequency.value=0.13;const g2=ctx.createGain();g2.gain.value=0.025;l2.connect(g2);g2.connect(wg.gain);
    src.connect(bp);bp.connect(wg);wg.connect(amb);src.start();l1.start();l2.start();
    amb.gain.cancelScheduledValues(t);amb.gain.setValueAtTime(amb.gain.value,t);amb.gain.linearRampToValueAtTime(0.7,t+2);
    ambNodes=[src,l1,l2];
    const loop=()=>{if(!ambNodes)return;
      if(pref.on&&!document.hidden){const n=1+Math.floor(Math.random()*3),t0=now();for(let i=0;i<n;i++)S.boom(t0+i*(0.3+Math.random()*0.5),0.4+Math.random()*0.5,1,amb);}
      const fight=state&&!state.over&&PHASES[state.phase].kind==='combat';
      ambTimer=setTimeout(loop,(fight?3500:8000)+Math.random()*9000);};
    ambTimer=setTimeout(loop,2500);
  }
  function stopAmb(){
    if(!ambNodes)return;const t=now();amb.gain.cancelScheduledValues(t);amb.gain.setValueAtTime(amb.gain.value,t);amb.gain.linearRampToValueAtTime(0,t+0.6);
    const n=ambNodes;ambNodes=null;clearTimeout(ambTimer);setTimeout(()=>n.forEach(x=>{try{x.stop();}catch(e){}}),800);
  }
  function init(){
    if(ctx){if(ctx.state==='suspended'&&!document.hidden)ctx.resume().catch(()=>{});return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{ctx=new AC();}catch(e){ctx=null;return;}
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=10;comp.ratio.value=4;comp.attack.value=0.003;comp.release.value=0.25;
    master=ctx.createGain();master.gain.value=pref.on?0.9:0;master.connect(comp);comp.connect(ctx.destination);
    sfx=ctx.createGain();sfx.connect(master);amb=ctx.createGain();amb.gain.value=0;amb.connect(master);
    const len=ctx.sampleRate*2;
    noiseBuf=ctx.createBuffer(1,len,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    brownBuf=ctx.createBuffer(1,len,ctx.sampleRate);const b=brownBuf.getChannelData(0);let last=0;for(let i=0;i<len;i++){last=(last+0.02*(Math.random()*2-1))/1.02;b[i]=last*3.5;}
    try{const u=ctx.createBufferSource();u.buffer=ctx.createBuffer(1,1,22050);u.connect(ctx.destination);u.start(0);}catch(e){}
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    if(pref.on&&pref.amb)startAmb();
  }
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend().catch(()=>{});else ctx.resume().catch(()=>{});});
  return {...S,init,pref,
    setOn(v){pref.on=v;savePref();if(ctx){master.gain.setTargetAtTime(v?0.9:0,now(),0.05);if(v&&pref.amb)startAmb();else stopAmb();}},
    setAmb(v){pref.amb=v;savePref();if(ctx){if(v&&pref.on)startAmb();else stopAmb();}}};
})();

/* ---------- Rendu de la carte ---------- */
const svg=document.getElementById('map');
const NS='http://www.w3.org/2000/svg';
const poly=k=>corners(k).map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
const POLY={};for(const k in HEX)POLY[k]=poly(k);
function drawStatic(){
  svg.setAttribute('viewBox',`0 0 ${SVGW} ${SVGH}`);
  let s=`<defs><pattern id="trees" width="11" height="9.5" patternUnits="userSpaceOnUse"><rect width="11" height="9.5" fill="#bdc79c"/><circle cx="3" cy="3" r="1.8" fill="#7f9562"/><circle cx="8.5" cy="7.2" r="1.6" fill="#889b6b"/><circle cx="8.6" cy="2" r=".9" fill="#97a878"/></pattern><pattern id="ihatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="4" stroke="rgba(150,30,10,.55)" stroke-width="1.3"/></pattern></defs>`;
  s+=`<rect width="${SVGW}" height="${SVGH}" fill="#d9cfb2"/>`;
  s+='<g id="terrain">';
  for(const k in HEX){const h=HEX[k];s+=`<polygon class="hx ${h.t}${h.alt&&h.t==='clear'?' alt':''}" points="${POLY[k]}" data-k="${k}"${h.t==='forest'?' fill="url(#trees)"':''}/>`;}
  s+='</g><g id="feat" pointer-events="none">';
  for(const ch of roadChains){const d='M'+ch.map(k=>ck(k).map(v=>v.toFixed(1)).join(',')).join('L');s+=`<path class="road-c" d="${d}"/>`;}
  for(const ch of roadChains){const d='M'+ch.map(k=>ck(k).map(v=>v.toFixed(1)).join(',')).join('L');s+=`<path class="road" d="${d}"/>`;}
  for(const [e] of riverEdge){const [a,b]=e.split('|');const [bx,by]=ck(b);const cs=corners(a).map(p=>[p,Math.hypot(p[0]-bx,p[1]-by)]).sort((x,y)=>x[1]-y[1]).slice(0,2).map(x=>x[0]);s+=`<line class="river" x1="${cs[0][0].toFixed(1)}" y1="${cs[0][1].toFixed(1)}" x2="${cs[1][0].toFixed(1)}" y2="${cs[1][1].toFixed(1)}"/>`;
    if(roadEdges.has(e)){const mx=(cs[0][0]+cs[1][0])/2,my=(cs[0][1]+cs[1][1])/2;const [ax,ay]=ck(a);const ang=Math.atan2(by-ay,bx-ax)*180/Math.PI;s+=`<rect class="bridge" x="-5" y="-2.6" width="10" height="5.2" transform="translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${ang.toFixed(1)})"/>`;}}
  for(const id in TOWNS){const t=TOWNS[id];const [x,y]=center(t.c,t.r);
    const b=t.t==='city'?[[-13,-6,6,5],[-6,-9,7,6],[3,-7,8,5],[-11,1,7,5],[-2,0,6,6],[6,1,7,5],[-4,8,9,4]]:[[-10,-5,5,4],[6,-3,5,5],[-7,6,6,4],[5,6,4,4]];
    for(const r of b)s+=`<rect class="bld" x="${(x+r[0]).toFixed(1)}" y="${(y+r[1]).toFixed(1)}" width="${r[2]}" height="${r[3]}"/>`;}
  const [ox,oy]=center(13,10);s+=`<text class="rlabel" transform="translate(${(ox+HW*0.48).toFixed(0)},${(oy+R*0.9).toFixed(0)}) rotate(-72)">Our</text>`;
  const [cx2,cy2]=center(8,6);s+=`<text class="rlabel" transform="translate(${(cx2+HW*0.5).toFixed(0)},${(cy2+R*1.3).toFixed(0)}) rotate(-75)">Clerve</text>`;
  s+=`<text class="mlabel" x="${PAD+4}" y="${SVGH-PAD-2}">← Vers la Meuse</text><text class="mlabel" x="${SVGW-PAD-4}" y="${PAD+10}" text-anchor="end">Allemagne →</text>`;
  s+='</g><g id="hl" pointer-events="none"></g><g id="bonds" pointer-events="none"></g><g id="pockets" pointer-events="none"></g><g id="supline" pointer-events="none"></g><g id="labels" pointer-events="none"></g><g id="units"></g><g id="pklabels" pointer-events="none"></g><g id="fx" pointer-events="none"></g>';
  svg.innerHTML=s;
}
let LIVE_CUT=new Set();
const rawNb=k=>{const [c,r]=unkey(k);return (r&1?DO:DE).map(([dc,dr])=>[c+dc,r+dr]);};
function pocketsSvg(){
  let out='',lab='';
  for(const sd of ['de','us']){
    const live=supplyOf(sd),foe=occ(other(sd));
    const cut=state.units.filter(u=>onMap(u)&&u.side===sd&&!live.has(u.pos));if(!cut.length)continue;
    const set=new Set();for(const u of cut){set.add(u.pos);for(const n of neighbors(u.pos))if(!foe.has(n))set.add(n);}
    const left=new Set(set);
    while(left.size){
      const s0=[...left][0],comp=new Set([s0]),q=[s0];left.delete(s0);
      while(q.length){const h=q.pop();for(const n of neighbors(h))if(left.has(n)){left.delete(n);comp.add(n);q.push(n);}}
      const inC=cut.filter(u=>comp.has(u.pos)),solid=inC.some(u=>(u.oos||0)>=1);
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
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function counter(u){
  const [a,d,m]=vals(u);
  return `<rect class="cbg ${u.side}" x="-17" y="-17" width="34" height="34" rx="3"/>`+
    (u.steps<u.max?'<path d="M6,-16.5H13.5Q16.5,-16.5 16.5,-13.5V-6Z" fill="#b8402c"/>':'')+
    `<text class="cn" x="0" y="-10">${esc(u.name)}</text>`+symbol(u.type)+`<text class="cv" x="0" y="13.8">${a}-${d}-${m}</text>`+
    ((u.oos||0)>=2?'<rect class="ihatch" x="-17" y="-17" width="34" height="34" rx="3"/>':'')+
    ((u.oos||0)>=1?`<g class="mk ${u.oos>=2?'iso':'cut'}${LIVE_CUT.has(u.id)?'':' back'}"><circle cx="-15" cy="-15" r="6.5"/><text x="-15" y="-11.6">${u.oos>=2?'×':'!'}</text></g>`
      :LIVE_CUT.has(u.id)?'<g class="mk pre"><circle cx="-15" cy="-15" r="6.5"/><text x="-15" y="-11.6">!</text></g>':'');
}
const counterIcon=u=>`<svg viewBox="-18 -18 36 36" width="40" height="40" aria-hidden="true">${counter(u)}</svg>`;

function renderMap(){
  const ph=PHASES[state.phase];const human=!isAI(ph.side)&&!state.over;
  let h='';
  if(sel.reach)for(const [k,r] of sel.reach)h+=`<polygon class="${r.zoc?'hl-reachz':'hl-reach'}" points="${POLY[k]}"/>`;
  if(human&&ph.kind==='combat'&&!busy){for(const k of new Set(state.units.filter(u=>onMap(u)&&u.side!==ph.side).map(u=>u.pos)))if(canTarget(k,ph.side)&&k!==sel.target)h+=`<polygon class="hl-target" points="${POLY[k]}"/>`;}
  if(sel.target){h+=`<polygon class="hl-tsel" points="${POLY[sel.target]}"/>`;const hexes=new Set([...(sel.attackers||[])].map(id=>U(id).pos));for(const k of hexes)h+=`<polygon class="hl-atk" points="${POLY[k]}"/>`;}
  if(sel.result&&sel.result.adv.length&&human&&!busy)h+=`<polygon class="hl-adv" points="${POLY[sel.result.k]}"/>`;
  else if(sel.hex&&!sel.target)h+=`<polygon class="hl-sel" points="${POLY[sel.hex]}"/>`;
  svg.querySelector('#hl').innerHTML=h;
  let bl='';
  if(ph.kind==='move'&&!state.over){
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
  const [pkS,pkL]=SHOW_POCKETS&&!state.over?pocketsSvg():['',''];
  svg.querySelector('#pockets').innerHTML=pkS;
  let sl='';const su=sel.unit?U(sel.unit):(sel.hex&&!sel.target&&!sel.result?unitsAt(sel.hex)[0]:null);
  if(su&&onMap(su)&&!state.over){const p=supplyPath(su.side,su.pos);if(p){const pts=p.map(ck);pts.push([su.side==='us'?2:SVGW-2,pts[pts.length-1][1]]);const d='M'+pts.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join('L');sl=`<g class="supl ${su.side}"><path class="h" d="${d}"/><path class="b" d="${d}"/><path class="f" d="${d}"/></g>`;}}
  svg.querySelector('#supline').innerHTML=sl;svg.querySelector('#pklabels').innerHTML=pkL;
  let l='';
  for(const id in TOWNS){const t=TOWNS[id];const [x,y]=center(t.c,t.r);l+=`<text class="tlabel" x="${x.toFixed(1)}" y="${(y+24).toFixed(1)}">${t.name}</text>`;
    if(t.vp)l+=`<g class="vp"><circle class="${state.control[id]}" cx="${x.toFixed(1)}" cy="${(y-20).toFixed(1)}" r="6"/><text x="${x.toFixed(1)}" y="${(y-17.2).toFixed(1)}">${t.vp}</text></g>`;}
  svg.querySelector('#labels').innerHTML=l;
  LIVE_CUT=new Set();
  if(!state.over)for(const sd of ['de','us']){const live=supplyOf(sd);for(const u of state.units)if(onMap(u)&&u.side===sd&&!live.has(u.pos))LIVE_CUT.add(u.id);}
  const by={};for(const u of state.units)if(onMap(u))(by[u.pos]=by[u.pos]||[]).push(u);
  let s='';
  for(const k in by){const [x,y]=ck(k);by[k].forEach((u,i)=>{
    const spent=(ph.kind==='move'&&u.side===ph.side&&u.mp<=0)||(ph.kind==='combat'&&u.side===ph.side&&u.attacked);
    s+=`<g class="ctr${spent?' spent':''}${sel.unit===u.id?' on':''}" id="u-${u.id}" data-k="${k}" transform="translate(${(x+i*4).toFixed(1)},${(y-i*4).toFixed(1)})">${counter(u)}</g>`;});}
  svg.querySelector('#units').innerHTML=s;
}
function fx(k,text,cls){const [x,y]=ck(k);const t=document.createElementNS(NS,'text');t.setAttribute('class','fx '+(cls==='bad'?'bad':''));t.setAttribute('x',x);t.setAttribute('y',y-4);t.textContent=text;svg.querySelector('#fx').appendChild(t);setTimeout(()=>t.remove(),FX_LIFETIME);}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function impact(k,code,killed){
  fx(k,code,goodFor(code));
  const big=killed>0||code==='DE'||code==='DL2'||code==='DL';
  if(code!=='NE'&&code!=='A1'){const [x,y]=ck(k);const c=document.createElementNS(NS,'circle');c.setAttribute('class','blast'+(big?' big':''));c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',big?26:18);svg.querySelector('#fx').appendChild(c);setTimeout(()=>c.remove(),BLAST_LIFETIME);}
  if(big&&!reduced){const w=document.querySelector('.mapwrap');w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake');}
  if(big&&AUDIO.pref.on)try{navigator.vibrate&&navigator.vibrate([40,30,70]);}catch(e){}
}
function animatePath(u,path){
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

/* ---------- Rendu du panneau ---------- */
const panel=document.getElementById('panel');
function unitMeta(u,ph){
  const st=[];if(u.steps<u.max)st.push('réduite');if(u.oos)st.push((u.oos>=2?'isolée : attaque et mouvement ÷2':'coupée : attaque ÷2')+(LIVE_CUT.has(u.id)?'':' (ligne rétablie, ravitaillée à la prochaine vérification)'));else if(LIVE_CUT.has(u.id))st.push('sera coupée à sa prochaine vérification');
  if(ph.kind==='move'&&u.side===ph.side)st.push(u.mp>0?`${u.mp} PM restants`:'mouvement terminé');
  if(ph.kind==='combat'&&u.side===ph.side&&u.attacked)st.push('a déjà attaqué');
  return `<b>${esc(u.name)}</b><span>${esc(u.div)}${st.length?' · '+st.join(' · '):''}</span>`;
}
function hexBlock(k,ph){
  const h=HEX[k],t=h.town?TOWNS[h.town]:null,us=unitsAt(k);
  const rivers=neighbors(k).filter(n=>riverEdge.has(ek(k,n))).length;
  let s=`<div class="box"><span class="eyebrow">Hexagone ${k}</span><h3>${t?t.name:TERRAIN[h.t]}</h3><dl class="kv"><dt>Terrain</dt><dd>${TERRAIN[h.t]}${h.t==='forest'?' · 2 PM (3 blindés), −1 en défense':h.t==='town'?' · −1 en défense':h.t==='city'?' · −2 en défense':' · 1 PM'}</dd>`;
  if(rivers)s+=`<dt>Rivière</dt><dd>+2 PM pour la traverser hors pont</dd>`;
  const bd=['de','us'].find(sd=>bondsOf(sd).has(k));
  if(us.length){const su=(sel.unit&&U(sel.unit).pos===k)?U(sel.unit):us[0],p=supplyPath(su.side,su.pos);s+=`<dt>Ravitaillement</dt><dd>${p?`ligne de ${p.length-1} case${p.length>2?'s':''} jusqu'au bord ${su.side==='us'?'ouest':'est'}`:'aucune ligne, unité encerclée'}</dd>`;}
  if(bd)s+=`<dt>Liaison</dt><dd>Tenue par les ${SIDE[bd].toLowerCase()}, interdite aux ${SIDE[other(bd)].toLowerCase()}</dd>`;
  if(t)s+=`<dt>Contrôle</dt><dd><span class="dot ${state.control[h.town]}" style="display:inline-block;vertical-align:-1px"></span> ${SIDE[state.control[h.town]]}${t.vp?` · ${t.vp} PV`:''}</dd>`;
  s+='</dl>';
  if(us.length){s+='<div class="units">';for(const u of us){s+=`<button type="button" class="ucard${sel.unit===u.id?' on':''}" data-act="unit" data-id="${u.id}">${counterIcon(u)}<span class="meta">${unitMeta(u,ph)}</span></button>`;}s+='</div>';}
  return s+'</div>';
}
function combatBlock(ph){
  const k=sel.target,cands=eligibleAttackers(k,ph.side),atk=cands.filter(u=>sel.attackers.has(u.id));
  const defs=unitsAt(k).filter(u=>u.side!==ph.side);
  let s=`<div class="box"><span class="eyebrow">Attaque</span><h3>${HEX[k].town?TOWNS[HEX[k].town].name:TERRAIN[HEX[k].t]}</h3><div class="units">`;
  for(const d of defs)s+=`<div class="ucard" style="cursor:default">${counterIcon(d)}<span class="meta"><b>${esc(d.name)}</b><span>Défense ${vals(d)[1]}</span></span></div>`;
  s+='</div><p class="hint" style="margin:10px 0 6px">Unités qui participent :</p><div class="units">';
  for(const a of cands)s+=`<label class="chk"><input type="checkbox" data-act="toggle" data-id="${a.id}"${sel.attackers.has(a.id)?' checked':''}>${counterIcon(a)}<span class="meta" style="font-size:13px"><b style="font-family:var(--f-cond);font-size:16px;display:block">${esc(a.name)}</b><span style="color:var(--muted)">Attaque ${atkOf(a)}${a.oos?' (coupée)':''}${riverEdge.has(ek(a.pos,k))?' · à travers la rivière':''}</span></span></label>`;
  s+='</div>';
  if(!atk.length)return s+'<p class="hint" style="margin-top:10px">Cochez au moins une unité.</p><div class="btns"><button class="btn ghost" type="button" data-act="cancel">Annuler</button></div></div>';
  const o=odds(k,atk);
  s+=`<div class="odds"><span class="big">${o.fin<0?'—':COLL[o.fin]}</span><span class="hint" style="margin:0">${o.A} contre ${o.D}${o.col>=0&&o.fin!==o.col?` · rapport brut ${COLL[o.col]}`:''}</span></div>`;
  if(o.shifts.length)s+='<ul class="shifts">'+o.shifts.map(x=>`<li><span>${x[0]}</span><span>${x[1]>0?'+':'−'}${Math.abs(x[1])}</span></li>`).join('')+'</ul>';
  if(o.fin<0)return s+'<p class="hint">Rapport inférieur à 1:2 : attaque impossible.</p><div class="btns"><button class="btn ghost" type="button" data-act="cancel">Annuler</button></div></div>';
  s+='<div class="crtrow">'+CRT[o.fin].map((c,i)=>`<div class="r ${c}"><small>${i+1}</small>${c}</div>`).join('')+'</div>';
  return s+`<div class="btns"><button class="btn red" type="button" data-act="attack">Lancer le dé</button><button class="btn ghost" type="button" data-act="cancel">Annuler</button></div></div>`;
}
function resultBlock(ph){
  const r=sel.result;
  let s=`<div class="box"><span class="eyebrow">Résultat · colonne ${COLL[r.o.fin]}</span><div class="resline"><div class="die${r.fresh?' roll':''}">${r.die}</div><div><div class="code">${r.code}</div><div>${RES[r.code]}</div></div></div>`;
  r.fresh=false;
  if(r.notes.length)s+=`<p class="hint">${r.notes.join(' ; ')}.</p>`;
  if(r.adv.length&&!isAI(ph.side)){
    s+='<p class="hint" style="margin-bottom:6px">L\'hexagone est libre. Avancer avec :</p><div class="units">';
    for(const id of r.adv){const u=U(id);s+=`<button type="button" class="ucard" data-act="advance" data-id="${id}">${counterIcon(u)}<span class="meta"><b>${esc(u.name)}</b><span>Avancer après combat</span></span></button>`;}
    s+='</div><div class="btns" style="margin-top:8px"><button class="btn ghost" type="button" data-act="cancel">Rester sur place</button></div>';
  }else if(!isAI(ph.side))s+='<div class="btns"><button class="btn ghost" type="button" data-act="cancel">Continuer</button></div>';
  return s+'</div>';
}
function renderPanel(){
  const ph=PHASES[state.phase],ai=isAI(ph.side);
  const hint=state.over?'Partie terminée.':ai?`L'IA joue les ${SIDE[ph.side].toLowerCase()}…`:ph.kind==='move'?'Touchez une de vos unités, puis un hexagone en surbrillance. Les hexagones cerclés de rouge sont en zone de contrôle ennemie : l\'unité s\'y arrête.':'Touchez un ennemi cerclé de rouge pour préparer une attaque. Chaque unité attaque une fois.';
  let s=`<div class="box phase ${ph.side}"><span class="eyebrow">Tour ${state.turn}/${TURNS} · ${turnLabel(state.turn)}</span><h2>${ph.label}</h2><p class="hint">${hint}</p><div class="btns"><button class="btn" type="button" data-act="end"${busy||ai||state.over?' disabled':''}>${ph.kind==='move'?'Terminer le mouvement':'Terminer les combats'}</button>${ph.kind==='move'&&!ai&&undo.length&&!busy?'<button class="btn ghost" type="button" data-act="undo">Annuler le déplacement</button>':''}</div></div>`;
  if(sel.result)s+=resultBlock(ph);
  else if(sel.target&&!ai)s+=combatBlock(ph);
  else if(sel.hex)s+=hexBlock(sel.hex,ph);
  const vp=vpOf('de');
  s+=`<div class="box"><span class="eyebrow">Points de victoire allemands</span><h3 style="margin-bottom:0">${vp} / ${VP_TOTAL}</h3><div class="vpbar"><i style="width:${vp/VP_TOTAL*100}%"></i><u style="left:${VP_DRAW/VP_TOTAL*100}%"></u><u style="left:${VP_GERMAN_WIN/VP_TOTAL*100}%"></u></div><div class="vplegend"><span>Victoire US ≤ 2</span><span>Nul 3–4</span><span>Victoire allemande ≥ 5</span></div><ul class="towns">`;
  for(const id in TOWNS)if(TOWNS[id].vp)s+=`<li><span class="dot ${state.control[id]}"></span>${TOWNS[id].name}<em>${TOWNS[id].vp} PV</em></li>`;
  s+='</ul></div>';
  const next=ARRIVALS.filter(a=>a.turn>state.turn||(a.turn===state.turn&&state.phase<(a.side==='de'?0:2)));
  if(next.length)s+=`<div class="box"><span class="eyebrow">Renforts à venir</span><ul class="reinf">${next.map(a=>`<li>Tour ${a.turn} (${turnLabel(a.turn)}) : ${a.text}</li>`).join('')}</ul></div>`;
  panel.innerHTML=s;
}
function renderTrack(){
  let s='';for(let t=1;t<=TURNS;t++){const a=ARRIVALS.filter(x=>x.turn===t);s+=`<div class="tcell${t<state.turn?' past':''}${t===state.turn?' now':''}" title="${turnLabel(t)}${a.map(x=>' · Renforts '+(x.side==='de'?'allemands':'américains')+' : '+x.text).join('')}"><b>${FIRST_DAY+Math.floor((t-1)/2)}</b>${t%2?'matin':'a.-midi'}${a.length?`<span class="rfs">${a.map(x=>`<span class="rf ${x.side}">${x.side==='de'?'DE':'US'}</span>`).join('')}</span>`:''}</div>`;}
  document.getElementById('track').innerHTML=s;
}
const scoreEl=document.getElementById('mapscore');
function renderScore(){
  const vp=vpOf('de'),st=vp>=VP_GERMAN_WIN?['victoire allemande','de']:vp>=VP_DRAW?['match nul','mid']:['victoire américaine','us'];
  scoreEl.innerHTML=`<b>${vp}</b><span class="lbl">PV allemands sur ${VP_TOTAL}<em class="${st[1]}">${state.over?'Résultat':'Tendance'} : ${st[0]}</em></span>`;
}
const actEl=document.getElementById('mapact');
function renderAct(){
  const ph=PHASES[state.phase];let h='';
  if(!state.over&&!isAI(ph.side)&&!busy){
    if(sel.result&&sel.result.adv.length){
      const r=sel.result,where=HEX[r.k].town?TOWNS[HEX[r.k].town].name:'la case';
      h=`<span>${r.code} : ${esc(where)} est libre. Avancer avec :</span>`+r.adv.map(id=>`<button class="btn" type="button" data-act="advance" data-id="${id}">${esc(U(id).name)}</button>`).join('')+'<button class="btn ghost" type="button" data-act="cancel">Rester</button>';
    }else if(sel.target){
      const atk=eligibleAttackers(sel.target,ph.side).filter(u=>sel.attackers.has(u.id));
      if(atk.length){const o=odds(sel.target,atk);if(o.fin>=0)h=`<span>Attaque à ${COLL[o.fin]} avec ${atk.length} unité${atk.length>1?'s':''}</span><button class="btn red" type="button" data-act="attack">Lancer le dé</button><button class="btn ghost" type="button" data-act="cancel">Annuler</button>`;}
    }
  }
  actEl.innerHTML=h;actEl.hidden=!h;
}
function pulseScore(){scoreEl.classList.remove('pulse');void scoreEl.offsetWidth;scoreEl.classList.add('pulse');}
function render(){if(!state)return;renderTrack();renderMap();renderScore();renderAct();renderPanel();}

/* ---------- Interactions ---------- */
function onHex(k){
  if(busy||!state||state.over)return;
  const ph=PHASES[state.phase];
  if(isAI(ph.side)){sel={hex:k};render();return;}
  if(sel.result){
    const r=sel.result;
    if(k===r.k&&r.adv.length){advance(r.adv.map(U).sort((a,b)=>vals(b)[0]-vals(a)[0])[0].id);return;}
    sel={};
  }
  if(ph.kind==='move'){
    if(sel.reach&&sel.reach.has(k)){doMove(U(sel.unit),k,sel.reach.get(k));return;}
    const own=unitsAt(k).filter(u=>u.side===ph.side);
    if(own.length){AUDIO.pick();let n;if(sel.hex===k&&sel.unit){const i=own.findIndex(u=>u.id===sel.unit);n=own[(i+1)%own.length];}else n=own.find(u=>u.mp>0)||own[0];selectUnit(n);return;}
    if(sel.unit&&sel.hex!==k)AUDIO.nope();
    sel={hex:k};render();return;
  }
  if(canTarget(k,ph.side)){AUDIO.pick();sel={hex:k,target:k,attackers:new Set(eligibleAttackers(k,ph.side).map(u=>u.id))};render();return;}
  sel={hex:k};render();
}
svg.addEventListener('click',e=>{const el=e.target.closest('[data-k]');if(el)onHex(el.getAttribute('data-k'));});
function confirmEndCombat(side){
  const enemy=other(side);
  const opts=[...new Set(state.units.filter(u=>onMap(u)&&u.side===enemy).map(u=>u.pos))]
    .filter(k=>canTarget(k,side)).map(k=>({k,o:odds(k,eligibleAttackers(k,side))}))
    .filter(x=>x.o.fin>=0).sort((a,b)=>b.o.fin-a.o.fin);
  if(!opts.length)return false;
  const name=k=>HEX[k].town?TOWNS[HEX[k].town].name:TERRAIN[HEX[k].t]+' ('+k+')';
  const tone=fin=>{const g=CRT[fin].filter(c=>c!=='A1'&&c!=='NE').length;return g<=2?'A1':g===3?'EX':g===4?'D2':g===5?'DL':'DE';};
  const n=opts.length,s=n>1?'s':'';
  AUDIO.tick();
  openModal(`<span class="eyebrow">${PHASES[state.phase].label}</span><h2>Terminer les combats ?</h2><p>Il reste ${n} attaque${s} possible${s}. Le rapport indiqué suppose que toutes les unités adjacentes participent.</p><ul class="legend">${opts.slice(0,END_COMBAT_LIST_MAX).map(x=>`<li><b class="r ${tone(x.o.fin)}">${COLL[x.o.fin]}</b><span>${esc(name(x.k))}</span></li>`).join('')}</ul>${n>END_COMBAT_LIST_MAX?`<p style="margin-top:8px">Et ${n-END_COMBAT_LIST_MAX} autre${n-END_COMBAT_LIST_MAX>1?'s':''}.</p>`:''}<div class="btns" style="margin-top:16px"><button class="btn" type="button" data-close="1">Continuer les combats</button><button class="btn ghost" type="button" data-end-confirm="1">Terminer quand même</button></div>`);
  const f=sheet.querySelector('[data-close]');if(f)f.focus();
  return true;
}
function onAction(e){
  const b=e.target.closest('[data-act]');if(!b||busy)return;
  const act=b.getAttribute('data-act'),id=b.getAttribute('data-id'),ph=PHASES[state.phase];
  if(act==='end'){if(ph.kind==='combat'&&confirmEndCombat(ph.side))return;sel={};endPhase();}
  else if(act==='undo')undoMove();
  else if(act==='unit'){const u=U(id);if(ph.kind==='move'&&u.side===ph.side&&!isAI(ph.side)){AUDIO.pick();selectUnit(u);}}
  else if(act==='toggle'){AUDIO.tick();if(b.checked)sel.attackers.add(id);else sel.attackers.delete(id);render();}
  else if(act==='attack'){const atk=[...sel.attackers].map(U).filter(u=>!u.attacked);if(!atk.length)return;const r=resolve(sel.target,atk,diceRng);r.fresh=true;sel={hex:r.k,result:r};render();save();}
  else if(act==='advance')advance(id);
  else if(act==='cancel'){AUDIO.tick();sel={};render();}
}
panel.addEventListener('click',onAction);
actEl.addEventListener('click',onAction);

/* ---------- Fenêtres ---------- */
const modal=document.getElementById('modal'),sheet=document.getElementById('sheet');
function openModal(html){sheet.innerHTML=html;modal.hidden=false;sheet.scrollTop=0;}
function closeModal(){modal.hidden=true;}
function modeButtons(){return `<button class="btn" type="button" data-mode="ai-us">Jouer les Allemands<small>Percer vers Bastogne contre une IA américaine</small></button><button class="btn ghost" type="button" data-mode="ai-de">Jouer les Américains<small>Tenir la ligne face à une IA allemande</small></button><button class="btn ghost" type="button" data-mode="hotseat">Deux joueurs<small>Sur le même écran, chacun son tour</small></button>`;}
function startScreen(){
  const saved=loadSaved();
  openModal(`<span class="eyebrow">Scénario · 16–19 décembre 1944</span><h2>La route de Bastogne</h2><p>Le 47e Panzerkorps franchit l'Our pour foncer vers les carrefours de Clervaux, Wiltz et Bastogne. En face, trois bataillons étirés de la 28th Infantry Division doivent gagner du temps jusqu'à l'arrivée des blindés de réserve et de la 101st Airborne.</p><p>Huit tours de jeu, un demi-jour chacun. Les Allemands l'emportent avec 5 points de victoire à la fin du 19.</p><div class="choices">${saved?`<button class="btn" type="button" data-resume="1">Reprendre la partie<small>Tour ${saved.turn}, ${turnLabel(saved.turn)} · ${PHASES[saved.phase].label}</small></button>`:''}${modeButtons()}</div><p style="margin-top:14px"><button class="btn ghost" type="button" data-rules="1">Lire les règles</button></p>`);
}
function rulesScreen(){
  openModal(`<h2>Règles</h2><div class="rules">
  <h3>Tour de jeu</h3><ul><li>Chaque tour : mouvement allemand, combats allemands, mouvement américain, combats américains.</li><li>8 tours, du 16 décembre matin au 19 décembre après-midi. Les renforts arrivent au début du mouvement de leur camp.</li></ul>
  <h3>Les pions</h3><ul><li>Valeurs : attaque, défense, mouvement. Un coin rouge signale une unité réduite (elle a perdu un pas). La plupart des unités ont 2 pas.</li><li>Symboles : croix pour l'infanterie, ovale pour les blindés, les deux pour l'infanterie mécanisée, aile pour les parachutistes.</li><li>Empilement : 2 unités au maximum par hexagone. Touchez une pile plusieurs fois pour passer d'une unité à l'autre.</li></ul>
  <h3>Mouvement</h3><ul><li>Dégagé 1 PM, forêt 2 PM (3 pour les blindés et mécanisés), village ou ville 1 PM.</li><li>En suivant une route : ½ PM par hexagone, ponts compris.</li><li>Traverser une rivière hors pont : +2 PM.</li><li>Une unité qui n'a pas encore bougé peut toujours avancer d'un hexagone.</li><li>Zone de contrôle (ZOC) : les 6 hexagones autour d'une unité. Entrer en ZOC ennemie arrête le mouvement, et on ne peut pas passer directement d'une ZOC ennemie à une autre.</li><li>Liaison : deux unités d'un même camp à deux cases d'écart se tiennent la main. L'ennemi ne peut ni entrer ni reculer dans les cases vides qui les séparent (une ou deux selon leur position). Une unité ennemie déjà placée entre elles rompt la liaison. Pendant le mouvement, les liaisons apparaissent en pointillés entre les pions, plus marquées pour celles de l'adversaire.</li></ul>
  <h3>Ravitaillement</h3><ul><li>Une unité est ravitaillée si elle peut tracer un chemin jusqu'à son bord de carte : bord est pour les Allemands, bord ouest pour les Américains. Le chemin ne passe ni par une case ennemie, ni par une case en zone de contrôle ennemie, sauf si une unité amie l'occupe. Il ne franchit une rivière que par un pont, là où une route la traverse.</li><li>Le ravitaillement est vérifié au début du mouvement de chaque camp, puis figé jusqu'au tour suivant. Les renforts arrivent ravitaillés.</li><li>Coupée (pastille ambre) : attaque divisée par 2. Isolée, coupée deux tours de suite (pastille rouge, pion hachuré) : attaque et mouvement divisés par 2. À partir du troisième tour, perte d'un pas à chaque vérification.</li><li>Une pastille en pointillés signale une unité qui sera coupée à sa prochaine vérification si rien ne change. À l'inverse, une unité coupée qui retrouve une ligne garde son statut jusqu'à sa prochaine vérification, et sa pastille pâlit. Sélectionner un pion affiche sa ligne de ravitaillement jusqu'à son bord de carte.</li></ul>
  <h3>Combat</h3><ul><li>Facultatif. On attaque un hexagone ennemi adjacent ; plusieurs unités peuvent s'associer. Chaque unité attaque une fois, chaque hexagone n'est attaqué qu'une fois par phase.</li><li>Le rapport attaque/défense est arrondi en faveur du défenseur, puis décalé : forêt −1, village −1, ville −2, toutes les unités attaquent à travers une rivière −1, blindés contre un défenseur sans blindés en terrain dégagé +1.</li><li>Repli : chaque hexagone impossible à parcourir (ennemi, liaison ennemie, empilement plein, bord de carte) coûte 1 pas, de même qu'un hexagone en ZOC ennemie qui n'est pas occupé par une unité amie.</li><li>Si l'hexagone attaqué se vide, les attaquants peuvent y avancer.</li></ul>
  <p style="margin:8px 0">Croisez la colonne du rapport de force avec la ligne du dé. Les couleurs vont du rouge au vert, du pire au meilleur pour l'attaquant.</p>
  <div class="scrollx"><table class="crt"><thead><tr><th>Dé</th>${COLL.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${[0,1,2,3,4,5].map(d=>`<tr><th>${d+1}</th>${CRT.map(col=>`<td class="r ${col[d]}">${col[d]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <ul class="legend">${['A1','NE','EX','D1','D2','DL','DL2','DE'].map(c=>`<li><b class="r ${c}">${c}</b><span>${RES[c]}</span></li>`).join('')}</ul>
  <h3>Son</h3><ul><li>Les boutons Son et Ambiance, en haut, coupent tout le son ou seulement le vent et l'artillerie lointaine. Sur iPhone, le mode silencieux coupe aussi le son du jeu.</li></ul>
  <h3>Victoire</h3><ul><li>Une ville est contrôlée par le dernier camp à y être entré. Points allemands : Bastogne 5, Wiltz 2, Houffalize 2, Clervaux 1, Hosingen 1.</li><li>Fin du 19 décembre : 5 points ou plus, victoire allemande ; 3 ou 4, nul ; 2 ou moins, victoire américaine.</li></ul></div>
  <div class="btns" style="margin-top:16px"><button class="btn" type="button" data-close="1">${state?'Retour à la partie':'Retour'}</button></div>`);
}
sheet.addEventListener('click',e=>{
  const m=e.target.closest('[data-mode]');if(m){fieldCache.clear();newGame(m.getAttribute('data-mode'));return;}
  if(e.target.closest('[data-resume]')){state=loadSaved();closeModal();undo=[];sel={};render();const ph=PHASES[state.phase];if(isAI(ph.side))setTimeout(runAI,AI_START_DELAY);return;}
  if(e.target.closest('[data-rules]')){rulesScreen();return;}
  if(e.target.closest('[data-end-confirm]')){closeModal();sel={};endPhase();return;}
  if(e.target.closest('[data-close]')){if(state)closeModal();else startScreen();}
});
document.getElementById('btnRules').addEventListener('click',rulesScreen);
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||modal.hidden)return;const c=sheet.querySelector('[data-close]');if(c){e.preventDefault();c.click();}});
document.getElementById('btnNew').addEventListener('click',()=>{if(!busy)startScreen();});

/* ---------- Zoom ---------- */
const scroller=document.getElementById('mapscroll');
function applyZoom(){svg.style.width=Math.round(SVGW*zoom)+'px';svg.style.height=Math.round(SVGH*zoom)+'px';}
document.getElementById('zin').addEventListener('click',()=>{zoom=Math.min(ZOOM_MAX,zoom*ZOOM_STEP);applyZoom();});
document.getElementById('zout').addEventListener('click',()=>{zoom=Math.max(ZOOM_MIN,zoom/ZOOM_STEP);applyZoom();});

['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,()=>AUDIO.init(),{capture:true,passive:true}));
const btnSound=document.getElementById('btnSound'),btnAmb=document.getElementById('btnAmb');
function syncSound(){btnSound.setAttribute('aria-pressed',String(AUDIO.pref.on));btnAmb.setAttribute('aria-pressed',String(AUDIO.pref.on&&AUDIO.pref.amb));btnAmb.disabled=!AUDIO.pref.on;}
btnSound.addEventListener('click',()=>{AUDIO.init();AUDIO.setOn(!AUDIO.pref.on);syncSound();AUDIO.tick();});
btnAmb.addEventListener('click',()=>{AUDIO.init();AUDIO.setAmb(!AUDIO.pref.amb);syncSound();AUDIO.tick();});
syncSound();

drawStatic();
zoom=Math.max(ZOOM_INIT_MIN,Math.min(ZOOM_INIT_MAX,(scroller.clientWidth-2)/SVGW));applyZoom();
if(innerWidth<MOBILE_MAX_WIDTH)scroller.scrollLeft=scroller.scrollWidth;
startScreen();
