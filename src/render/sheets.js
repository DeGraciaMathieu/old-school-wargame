import { COLL, CRT, RES, SEED_MAX, TURNS, TURNS_PER_DAY, VP_WIN_MARGIN } from '../config.js';
import { neighbors } from '../rules/hex.js';
import { generateMap } from '../rules/mapgen.js';
import { createRng } from '../rules/rng.js';
import { phaseOf } from '../rules/turn.js';
import { esc, turnLabel } from './labels.js';
import { counterIcon, miniMap, regionName } from './map.js';
import { sceneBond, sceneCombat, sceneCounter, sceneRetreat, sceneRiver, sceneRoad, sceneSupply, sceneTerrain, sceneZoc, typeCards } from './scenes.js';
import { loadSaved, store } from '../state/store.js';

/* ---------- Fenêtres ---------- */
export const modal=document.getElementById('modal'),sheet=document.getElementById('sheet');
export function openModal(html){sheet.innerHTML=html;modal.hidden=false;sheet.scrollTop=0;}
export function closeModal(){modal.hidden=true;}
export function modeButtons(){return `<button class="btn" type="button" data-mode="ai-red">Jouer les Bleus<small>Depuis le bord ouest, contre une IA rouge</small></button><button class="btn ghost" type="button" data-mode="ai-blue">Jouer les Rouges<small>Depuis le bord est, contre une IA bleue</small></button><button class="btn ghost" type="button" data-mode="hotseat">Deux joueurs<small>Sur le même écran, chacun son tour</small></button>`;}
/* ---------- Salle des cartes (écran d'accueil) ---------- */
export const hall=document.getElementById('hall');
// Massifs : groupes de cases de montagne contiguës
function massifs(map){
  const left=new Set(Object.keys(map.hex).filter(k=>map.hex[k].t==='mountain'));let n=0;
  while(left.size){n++;const todo=[left.values().next().value];while(todo.length){const k=todo.pop();if(left.delete(k))todo.push(...neighbors(k).filter(x=>left.has(x)));}}
  return n;
}
const pl=(n,w)=>`${n} ${w}${n>1?'s':''}`;
// Vignette et légende d'une graine, générées une seule fois
const cards=new Map();
function mapCard(seed){
  if(!cards.has(seed)){const map=generateMap(createRng(seed));
    cards.set(seed,`${miniMap(map)}<span class="cap"><b>${esc(regionName(map,seed))}</b><span>Carte n° ${seed} · ${pl(massifs(map),'massif')} · ${pl(map.riverLines.length,'rivière')} · ${pl(Object.keys(map.towns).length,'ville')}</span></span>`);}
  return cards.get(seed);
}
export function startScreen(){
  const saved=loadSaved(),{seeds,pick}=store.hall;
  hall.innerHTML=`<div class="hall-in"><header class="hall-hd"><span class="eyebrow">Une carte nouvelle à chaque partie</span><h1>Terra Incognita</h1><p>Deux armées de même force, les Bleus à l'ouest et les Rouges à l'est, se disputent une contrée que personne n'a encore cartographiée. Forêts, montagnes, rivières, routes et villes changent à chaque partie : lisez le terrain avant d'avancer.</p><p>${TURNS} tours de jeu, un demi-jour chacun. Les villes du centre sont neutres au départ. À la fin, le camp qui mène d'au moins ${VP_WIN_MARGIN} points de victoire l'emporte.</p>${saved?`<button class="btn resume" type="button" data-resume="1">Reprendre la partie<small>Carte n° ${saved.seed} · tour ${saved.turn}, ${turnLabel(saved.turn)} · ${phaseOf(saved).label}</small></button>`:''}</header>
  <section class="hall-maps" aria-labelledby="hall-maps"><div class="hall-bar"><h2 id="hall-maps">Choisissez votre terrain</h2><div class="hall-tools"><button class="btn ghost" type="button" data-reroll="1">Trois autres cartes</button><form class="seedf" id="seedf"><label for="seed-in">N° de carte</label><input id="seed-in" name="seed" type="number" inputmode="numeric" min="1" max="${SEED_MAX}" step="1" required><button class="btn ghost" type="submit">Afficher</button></form></div></div>
  <div class="mcards">${seeds.map((s,i)=>`<button class="mcard${i===pick?' sel':''}" type="button" data-pick="${i}" aria-pressed="${i===pick}">${mapCard(s)}</button>`).join('')}</div></section>
  <section class="hall-modes" aria-labelledby="hall-modes"><h2 id="hall-modes">Puis votre camp</h2><div class="choices">${modeButtons()}</div></section>
  <p><button class="btn ghost" type="button" data-rules="1">Lire les règles</button></p></div>`;
  hall.hidden=false;hall.scrollTop=0;
}
export function closeHall(){hall.hidden=true;}
/* ---------- Écran des règles : page pleine, sommaire, scènes animées ---------- */
export const rulesPage=document.getElementById('rules');
const fig=(svg,title)=>`<figure class="scene">${svg}<figcaption>${title}</figcaption></figure>`;
const sec=(id,title,text,figs='')=>`<section class="rp-sec${figs?'':' solo'}" id="${id}" aria-labelledby="${id}-h"><div class="rp-txt"><h2 id="${id}-h">${title}</h2>${text}</div>${figs?`<div class="rp-figs">${figs}</div>`:''}</section>`;
const SECTIONS=[['r-tour','Tour de jeu'],['r-pions','Les pions'],['r-move','Mouvement'],['r-zoc','ZOC et liaisons'],['r-sup','Ravitaillement'],['r-combat','Combat'],['r-vic','Victoire'],['r-son','Son']];
export function rulesScreen(){
  const back=hall.hidden&&store.state?'Retour à la partie':'Retour';
  rulesPage.innerHTML=`<div class="rp-in"><header class="rp-hd"><div><span class="eyebrow">Terra Incognita</span><h1>Règles</h1></div><button class="btn" type="button" data-close="1">${back}</button></header>
  <nav class="rp-nav" aria-label="Sommaire">${SECTIONS.map(([id,t])=>`<a href="#${id}">${t}</a>`).join('')}</nav>
  ${sec('r-tour','Tour de jeu',`<ul><li>Chaque tour : mouvement puis combats d'un camp, puis mouvement et combats de l'autre. Les Bleus ouvrent les tours impairs, les Rouges les tours pairs : le camp qui ferme un tour ouvre le suivant.</li><li>${TURNS} tours, du jour 1 au matin au jour ${Math.ceil(TURNS/TURNS_PER_DAY)} l'après-midi. Les renforts arrivent par le bord de leur camp, au début de son mouvement.</li><li>Avant la partie, la salle des cartes tire trois cartes au hasard : choisissez-en une, tirez-en trois autres, ou saisissez le numéro d'une carte pour la rejouer. Le numéro de la carte s'affiche dans le panneau.</li></ul>`)}
  ${sec('r-pions','Les pions',`<ul><li>Valeurs : attaque, défense, mouvement. Un coin rouge signale une unité réduite (elle a perdu un pas). Toutes les unités ont 2 pas.</li><li>Symboles : croix pour l'infanterie, ovale pour les blindés, les deux pour l'infanterie mécanisée.</li><li>Empilement : 2 unités au maximum par hexagone. Touchez une pile plusieurs fois pour passer d'une unité à l'autre.</li></ul>`,
    fig(sceneCounter(),'Lire un pion')+`<ul class="rp-types">${typeCards().map(([u,t])=>`<li>${counterIcon(u)}<span>${t}</span></li>`).join('')}</ul>`)}
  ${sec('r-move','Mouvement',`<ul><li>Dégagé 1 PM, forêt 2 PM (3 pour les blindés, les mécanisés et les chasseurs de chars), montagne 3 PM (4 pour les blindés, les mécanisés et les chasseurs de chars), village ou ville 1 PM.</li><li>En suivant une route : 1 PM par hexagone, quel que soit le terrain, ponts compris. La route ne fait pas aller plus vite, elle évite la forêt, la montagne (col) et la rivière.</li><li>Traverser une rivière hors pont : +2 PM, et l'unité s'arrête sur l'autre rive.</li><li>Une unité qui n'a pas encore bougé peut toujours avancer d'un hexagone.</li></ul>`,
    fig(sceneTerrain(),'Chaque case se paie')+fig(sceneRoad(),'La route')+fig(sceneRiver(),'Pont ou gué'))}
  ${sec('r-zoc','ZOC et liaisons',`<ul><li>Zone de contrôle (ZOC) : les 6 hexagones autour d'une unité. Entrer en ZOC ennemie arrête le mouvement, et on ne peut pas passer directement d'une ZOC ennemie à une autre.</li><li>Liaison : deux unités d'un même camp à deux cases d'écart se tiennent la main. L'ennemi ne peut ni entrer ni reculer dans les cases vides qui les séparent (une ou deux selon leur position). Une unité ennemie déjà placée entre elles rompt la liaison. Pendant le mouvement, les liaisons apparaissent en pointillés entre les pions, plus marquées pour celles de l'adversaire.</li></ul>`,
    fig(sceneZoc(),'Zone de contrôle')+fig(sceneBond(),'Liaison'))}
  ${sec('r-sup','Ravitaillement',`<ul><li>Une unité est ravitaillée si elle peut tracer un chemin jusqu'à son bord de carte : bord ouest pour les Bleus, bord est pour les Rouges. Le chemin ne passe ni par une case ennemie, ni par une case en zone de contrôle ennemie, sauf si une unité amie l'occupe. Il ne franchit une rivière que par un pont, là où une route la traverse. Il ne fait jamais un pas vers le camp adverse : chaque case est dans la même colonne que la précédente ou plus près de son bord.</li><li>Le ravitaillement est vérifié au début du mouvement de chaque camp, puis figé jusqu'au tour suivant. Les renforts arrivent ravitaillés.</li><li>Coupée (pastille ambre) : attaque divisée par 2. Isolée, coupée deux tours de suite (pastille rouge, pion hachuré) : attaque et mouvement divisés par 2. À partir du troisième tour, perte d'un pas à chaque vérification.</li><li>Une pastille en pointillés signale une unité qui sera coupée à sa prochaine vérification si rien ne change. À l'inverse, une unité coupée qui retrouve une ligne garde son statut jusqu'à sa prochaine vérification, et sa pastille pâlit. Sélectionner un pion affiche sa ligne de ravitaillement jusqu'à son bord de carte.</li></ul>`,
    fig(sceneSupply(),'Coupée, puis isolée'))}
  ${sec('r-combat','Combat',`<ul><li>Facultatif. On attaque un hexagone ennemi adjacent ; plusieurs unités peuvent s'associer. Chaque unité attaque une fois, chaque hexagone n'est attaqué qu'une fois par phase.</li><li>Le rapport attaque/défense est arrondi en faveur du défenseur, puis décalé : forêt −1, village −1, montagne −2, ville −2, toutes les unités attaquent à travers une rivière −1, blindés contre un défenseur sans blindés ni chasseurs de chars en terrain dégagé +1.</li><li>Repli : chaque hexagone impossible à parcourir (ennemi, liaison ennemie, empilement plein, bord de carte) coûte 1 pas, de même qu'un hexagone en ZOC ennemie qui n'est pas occupé par une unité amie.</li><li>Si l'hexagone attaqué se vide, les attaquants peuvent y avancer.</li></ul>`,
    fig(sceneCombat(),'Du rapport de force au résultat')+fig(sceneRetreat(),'Repli en ZOC ennemie'))}
  <section class="rp-crt" aria-labelledby="r-crt-h"><h2 id="r-crt-h">Table des combats</h2><p>Croisez la colonne du rapport de force avec la ligne du dé. Les couleurs vont du rouge au vert, du pire au meilleur pour l'attaquant.</p>
  <div class="scrollx"><table class="crt"><thead><tr><th>Dé</th>${COLL.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${[0,1,2,3,4,5].map(d=>`<tr><th>${d+1}</th>${CRT.map(col=>`<td class="r ${col[d]}">${col[d]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <ul class="legend">${['A1','NE','EX','D1','D2','DL','DL2','DE'].map(c=>`<li><b class="r ${c}">${c}</b><span>${RES[c]}</span></li>`).join('')}</ul></section>
  ${sec('r-vic','Victoire',`<ul><li>Au départ, chaque camp tient les villes de sa moitié de carte ; celles du centre sont neutres. Une ville est contrôlée par le dernier camp à y être entré.</li><li>Les deux camps ont autant de points de victoire à prendre chez eux. Le détail des villes et de leurs points est dans le badge de score, sur la carte.</li><li>Fin du tour ${TURNS} : le camp qui mène d'au moins ${VP_WIN_MARGIN} points gagne ; sinon, match nul.</li></ul>`)}
  ${sec('r-son','Son',`<ul><li>Les boutons Son et Ambiance, en haut, coupent tout le son ou seulement le vent et l'artillerie lointaine. Sur iPhone, le mode silencieux coupe aussi le son du jeu.</li></ul>`)}
  <p><button class="btn" type="button" data-close="1">${back}</button></p></div>`;
  rulesPage.hidden=false;rulesPage.scrollTop=0;
}
export function closeRules(){rulesPage.hidden=true;}
