---
name: scenario
description: Use when touching the game setup of Terra Incognita — the generated map (terrain, rivers, roads, towns), the order of battle and reinforcements, sides, turns and phases (alternating initiative), victory points and outcome, game modes, new game, save and resume.
auto_invoke: true
---

# Mise en place : carte, forces, tours, victoire

## Concepts → implémentation

| Concept | Où | Détail |
| --- | --- | --- |
| Grille | `COLS`×`ROWS` (16×12), hexagones pointe en haut, lignes impaires décalées — `src/rules/hex.js` | Clé `'c,r'` |
| Camps | `'blue'` (Bleus) et `'red'` (Rouges) ; `SIDE`, `ARMY`, `HOME` — `config.js` | `HOME` : bord de chaque camp (`west` / `east`) ; `homeCol(side)` et `other(side)` — `src/rules/units.js` |
| Carte générée | `generateMap(rng)` — `src/rules/mapgen.js` | Pure ; graine `state.seed` (1 à `SEED_MAX`) passée par `createRng`. Renvoie `{hex, rivers, roads, roadChains, towns, riverLines, exits}`, portée par `state.map` |
| Bandes | `BANDS` — `src/rules/mapgen.js` ; `ZONE_WEST_MAX_COL`, `ZONE_EAST_MIN_COL` | Ouest, centre, est ; les villes ne sont jamais sur une colonne de bord |
| Terrain | `terrain` (interne) | Forêts `FOREST_PROB` lissées (`TERRAIN_SMOOTH_PASSES`, `FOREST_GROW_MIN`, `FOREST_CLEAR_MAX`), teinte `alt` (`CLEAR_ALT_SHADE_PROB`) ; types de la table `TERRAINS` (aspect dans `LOOK` de `render/map.js`) |
| Rivières | `riversOf` (interne) | Nombre tiré entre `RIVER_MIN` et `RIVER_MAX`, sens `ns` ou `ew` tiré, marche aléatoire d'un bord à l'autre dans `RIVER_NS_COLS` / `RIVER_EW_ROWS` ; noms de `RIVER_NAMES` ; tracé dans `map.riverLines`, arêtes dans `map.rivers` |
| Villes | `placeTowns` (interne) ; `TOWN_LAYOUT` | `side` (mêmes villes dans les deux bandes latérales) et `center` (neutres au départ) ; écart `TOWN_MIN_DIST`, `TOWN_TRIES` tirages ; noms de `TOWN_NAMES` ; `map.towns[id] = {c,r,name,t,vp,band}`, `townKey(map,id)` — `src/rules/map.js` |
| Routes | `roadsOf` (interne) | Arbre couvrant le plus court entre les villes, plus `EXITS_PER_SIDE` routes vers chaque bord ; `map.roads`, `map.roadChains`, sorties de bord `map.exits.west` / `.east` ; ponts là où une route coupe une rivière |
| Ordre de bataille | `armyOf(map,side)` — `src/rules/deploy.js` ; `OOB_TEMPLATE`, `UNIT_TYPES`, `DEFAULT_STEPS` | Même modèle pour les deux camps, noms numérotés par type (`UNIT_TYPES[t].abbr`), `div` = `ARMY[side]` ; ids `b0…` / `r0…` |
| Déploiement | `armyOf` | Garnisons (`GARRISON_TYPES` d'abord) dans les villes à PV de la bande du camp, puis une unité par case libre de sa zone, au plus près de ses villes, route en priorité |
| Renforts | `turn` + `entry` (= `map.exits` du bord du camp) ; `arrivalsOf(side)` → `state.arrivals` | Annonces générées (« 1 blindé et 1 mécanisé, bord ouest ») ; journal, piste et panneau « Renforts à venir » |
| Entrée des renforts | `arrive` (interne) / `freeHexNear` — `src/rules/turn.js` | Au début du mouvement de leur camp, à leur tour ; première entrée libre, sinon case libre la plus proche |
| Phases | `phaseOf(state)` — `src/rules/turn.js` ; `curPhase()` — `src/state/store.js` | `PHASE_COUNT` (4), `INITIATIVE` : `INITIATIVE[0]` ouvre les tours impairs ; libellés `PHASE_LABELS` ; `nextPhase`, `TURNS` |
| Début de phase | `beginPhase` | Remise à zéro des attaques ; au mouvement : ravitaillement, renforts, PM |
| Dates | `turnLabel(t)`, `dayOf(t)` — `src/render/labels.js` | « jour 1, matin » ; `TURNS_PER_DAY` |
| Contrôle des villes | `state.control` ; initial : `sideOfBand(band)` — `src/rules/deploy.js` | Bandes latérales au camp de ce bord, centre neutre (`null`, classe CSS `neutral`) ; le dernier camp entré dans une ville libre la contrôle (`townTakenBy`) |
| PV et verdict | `vpOf`, `outcome(blue,red)` — `src/rules/victory.js` | Ville neutre : aucun PV ; écart d'au moins `VP_WIN_MARGIN` pour gagner, sinon nul |
| Modes | `state.mode` : `'ai-red'` (joueur bleu), `'ai-blue'` (joueur rouge), `'hotseat'` ; `isAI(side)` — `src/state/store.js` | Boutons de `modeButtons` (`src/render/sheets.js`) |
| Nouvelle partie | `newGame(mode)` — `src/loop/turn.js` → `createGame(mode,seed)` — `src/state/store.js` | Graine tirée au dé injecté (`diceRng`) ; `drawStatic(map)` ; `fieldCache` vidé dans `input/controls.js` |
| Fin de partie | `endGame()` — `src/loop/turn.js` | Après la dernière phase du tour `TURNS` |
| Sauvegarde | `save()` / `loadSaved()` — `src/state/store.js`, clé `SAVE_KEY` | État brut en JSON, carte comprise ; refusée sans `seed` ou si terminée ; reprise : `drawStatic` et `fieldCache` vidé |
| Journal | `state.log` (au plus `LOG_MAX`), `pushLog` — `src/rules/journal.js` | `{t,text,side}`, entrées en tête |
| Affichage | `drawStatic(map)` (au chargement sur une carte quelconque, puis à chaque partie) et `renderMap` — `src/render/map.js` ; `renderTrack`, `renderScore` (badge Bleus–Rouges dépliable : barre, écart de victoire, villes à PV ; ouvert si `store.scoreOpen`) — `src/render/hud.js` ; `renderPanel` (numéro de carte) | — |

## Modifier l'ordre de bataille ou les renforts

1. Modifier `OOB_TEMPLATE` (`src/config.js`) : `type` connu de `UNIT_TYPES` et de `symbol()`
   (`src/render/map.js`), `v` et `rv`, `steps` facultatif, `turn` pour un renfort. Le modèle
   vaut pour les deux camps.
2. Les annonces se régénèrent (`arrivalsOf`) ; vérifier `tests/deploy.test.js` (texte des annonces)
   et `tests/turn.test.js` (nombre d'unités, renforts).
3. Mettre à jour `rulesScreen` si une règle racontée change.
4. `npm test`, puis vérifier en jeu (`npm run dev`).

## Modifier la génération de carte

1. Constantes de la section « Carte générée » de `src/config.js` ; logique dans
   `src/rules/mapgen.js` (rester pur : seul `rand` donne le hasard).
2. `tests/mapgen.test.js` vérifie les invariants sur 1000 graines (routes reliant les deux bords,
   même total de PV par bande, espacement des villes, rivières de bord à bord).
3. Si le déploiement en dépend (bandes, sorties), `tests/deploy.test.js`.
4. `npm test`, puis vérification visuelle sur plusieurs parties.

## Modifier les conditions de victoire

1. `VP_WIN_MARGIN` ou `TOWN_LAYOUT` dans `src/config.js`, logique dans `outcome` (`src/rules/victory.js`).
2. `tests/victory.test.js`.
3. Textes à aligner : `rulesScreen` et `startScreen` (`src/render/sheets.js`), `endGame`
   (`src/loop/turn.js`), légende `vplegend` de `renderScore` (`src/render/hud.js`).
4. `npm test`.
