---
name: scenario
description: Use when touching the scenario of Le Saillant — the generated map (terrain, rivers, roads, towns), the order of battle and reinforcements, turns and phases, victory points and outcome, game modes, new game, save and resume.
auto_invoke: true
---

# Scénario : carte, forces, tours, victoire

## Concepts → implémentation

| Concept | Où | Détail |
| --- | --- | --- |
| Grille | `COLS`×`ROWS` (16×12), hexagones pointe en haut, lignes impaires décalées — `src/rules/hex.js` | Clé `'c,r'` |
| Terrain | `buildMap(seed)` — `src/rules/map.js` | `mulberry(MAP_SEED)` : forêts par bande de colonnes (`FOREST_PROB*`, `FOREST_*_COL`), lissage `TERRAIN_SMOOTH_PASSES`, teinte `alt` (`CLEAR_ALT_SHADE_PROB`) ; types `clear`, `forest`, `town`, `city` (libellés `TERRAIN`) |
| Villes | `TOWNS` — `config.js` | `{c,r,name,t,vp}` ; `HEX[k].town` ; `townKey(id)` |
| Rivières | `RIVERS` (`b[r]` = première colonne de la rive est) → `riverEdge` | `eastOfOur(k)` |
| Routes | `ROADS` (points de passage : villes ou `'c,r'`) → `roadEdges`, `roadChains` via `hexLine` | Ponts dessinés là où une route coupe une rivière |
| Ordre de bataille | `OOB` — `config.js` | `{id,side,name,div,type,v,rv,at}` (`steps` facultatif, `DEFAULT_STEPS` sinon) ; renforts : `turn` + `entry[]` |
| Annonces de renforts | `ARRIVALS` — `config.js` | Texte du journal, de la piste et du panneau « Renforts à venir » |
| Entrée des renforts | `arrive` (interne) / `freeHexNear` — `src/rules/turn.js` | Au début du mouvement de leur camp, à leur tour ; première entrée libre, sinon case libre la plus proche |
| Phases | `PHASES` (4 : mouvement et combats allemands, puis américains), `TURNS`, `nextPhase` | `beginPhase` : remise à zéro des attaques, ravitaillement, renforts, PM |
| Dates | `turnLabel(t)` — `src/render/labels.js` | `FIRST_DAY`, `TURNS_PER_DAY` (matin / après-midi) |
| Contrôle des villes | `state.control` ; initial dans `createGame` selon `eastOfOur` | Le dernier camp entré dans une ville libre la contrôle (`townTakenBy`) |
| PV et verdict | `vpOf`, `outcome` — `src/rules/victory.js` | `VP_GERMAN_WIN`, `VP_DRAW`, `VP_TOTAL` |
| Modes | `state.mode` : `'ai-us'`, `'ai-de'`, `'hotseat'` ; `isAI(side)` — `src/state/store.js` | Boutons de `modeButtons` (`src/render/sheets.js`) |
| Nouvelle partie | `newGame(mode)` — `src/loop/turn.js` → `createGame(mode)` — `src/state/store.js` | Vider `fieldCache` avant (fait dans `input/controls.js`) |
| Fin de partie | `endGame()` — `src/loop/turn.js` | Après la dernière phase du tour `TURNS` |
| Sauvegarde | `save()` / `loadSaved()` — `src/state/store.js`, clé `SAVE_KEY` | État brut en JSON ; une partie terminée n'est pas proposée à la reprise |
| Journal | `state.log` (au plus `LOG_MAX`), `pushLog` — `src/rules/journal.js` | `{t,text,side}`, entrées en tête |
| Affichage | `drawStatic` (une seule fois) et `renderMap` — `src/render/map.js` ; `renderTrack`, `renderScore` — `src/render/hud.js` ; `renderPanel` | — |

## Ajouter une unité ou un renfort

1. Ajouter l'entrée dans `OOB` (`src/config.js`) : `id` unique, `side`, `type` connu
   (`symbol()` de `src/render/map.js` doit savoir le dessiner), `v` et `rv`, et `at` ou
   `turn` + `entry`.
2. Renfort : ajouter ou ajuster l'annonce dans `ARRIVALS` pour le même `turn` et `side`.
3. Si l'IA américaine doit tenir une nouvelle ville, ajuster `AI_US_SLOTS`.
4. Ajouter un test dans `tests/turn.test.js` si l'entrée a une particularité.
5. Mettre à jour le texte de `startScreen` et de `rulesScreen` si le scénario raconté change.
6. `npm test`, puis vérifier en jeu (`npm run dev`).

## Ajouter ou modifier une ville, une route, une rivière

1. Modifier `TOWNS`, `ROADS` ou `RIVERS` dans `src/config.js`.
2. La carte change : mettre à jour l'empreinte de `tests/map.test.js` **seulement** si c'est
   voulu, et vérifier les autres tests qui s'appuient sur des cases précises.
3. Ville à PV : ajuster `VP_TOTAL` (non calculé) et les textes en dur de `rulesScreen`,
   `endGame` et la légende de la barre de PV (`renderPanel`).
4. `npm test`, puis vérification visuelle.

## Modifier les conditions de victoire

1. `VP_GERMAN_WIN` / `VP_DRAW` dans `src/config.js`, logique dans `outcome` (`src/rules/victory.js`).
2. `tests/victory.test.js`.
3. Textes en dur à aligner : `rulesScreen` et `startScreen` (`src/render/sheets.js`),
   `endGame` (`src/loop/turn.js`), légende `vplegend` (`src/render/panel.js`).
4. `npm test`.
