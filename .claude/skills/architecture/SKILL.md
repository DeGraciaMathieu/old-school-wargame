---
name: architecture
description: Use when you need to know where a module lives, what it depends on, or where new code must go in Terra Incognita — before any change that touches more than one file or adds a file.
auto_invoke: true
---

# Architecture de Terra Incognita

Modules ES natifs servis tels quels (pas de build). Point d'entrée : `index.html` →
`<script type="module" src="src/main.js">`. Styles : `styles.css`.

## Carte des modules

| Module | Rôle | Dépendances clés |
| --- | --- | --- |
| `src/config.js` | Toutes les constantes : géométrie (`R`, `COLS`, `ROWS`), terrain (`FOREST_PROB`…), `TERRAINS`, carte générée (`ZONE_*`, `RIVER_*`, `TOWN_LAYOUT`, `TOWN_*`, `EXITS_PER_SIDE`), coûts d'arête (`ROAD_COST`, `RIVER_CROSSING_COST`), `STACK_LIMIT`, `BOND_RANGE`, `OOB_TEMPLATE`, `UNIT_TYPES`, `GARRISON_TYPES`, camps (`SIDE`, `HOME`, `ARMY`), phases (`PHASE_COUNT`, `INITIATIVE`, `PHASE_LABELS`), `TURNS`, `SEED_MAX`, `COLL`/`TH`/`CRT`/`RES`, `SHIFT_RIVER`, `OOS_*`, `VP_WIN_MARGIN`, `RETREAT_*`, `AI_*`, délais, zoom, clés de stockage | aucune |
| `src/rules/hex.js` | Grille : `key`, `unkey`, `inMap`, `neighbors`, `dist`, `hexLine`, `ek` | config |
| `src/rules/mapgen.js` | `generateMap(rng)` → carte JSON `{hex, rivers, roads, roadChains, towns, riverLines, exits}`, portée par `state.map` ; `BANDS` | hex |
| `src/rules/map.js` | `townKey(map,id)` | hex |
| `src/rules/deploy.js` | `armyOf(map,side)` (ordre de bataille déployé), `arrivalsOf(side)` (annonces de renforts), `sideOfBand(band)` | config, hex |
| `src/rules/units.js` | `other`, `homeCol`, `onMap`, `isMech`, `vals`, `atkOf`, `mpOf` | config |
| `src/rules/control.js` | `unitsAt`, `occ`, `stackCount`, `zocOf`, `bondsOf` | hex, units |
| `src/rules/movement.js` | `stepCost`, `reach` | map, units, control |
| `src/rules/supply.js` | `supplyOf`, `supplyPath` | map, control |
| `src/rules/victory.js` | `vpOf`, `townTakenBy`, `outcome` | map, control |
| `src/rules/journal.js` | `pushLog`, `captureText` (aides internes) | victory |
| `src/rules/occupation.js` | `enterHex` : entrée sur une case avec prise de ville (aide interne) | victory, journal |
| `src/rules/combat.js` | `eligibleAttackers`, `canTarget`, `odds`, `resolveCombat` | control, occupation, journal |
| `src/rules/turn.js` | `phaseOf`, `beginPhase`, `nextPhase`, `freeHexNear` | supply, control, occupation |
| `src/rules/rng.js` | `createRng(seed)` (carte d'une partie, tests) | — |
| `src/state/store.js` | `store` `{state, busy, undo, sel, zoom, scoreOpen}`, `isAI`, `curPhase`, `U`, enveloppes de requêtes, `log`, `save`, `loadSaved`, `createGame(mode,seed)` | rules |
| `src/render/geometry.js` | `M` (marge avec cadre), `MAPW`, `MAPH` (carte), `SVGW`, `SVGH` (carte + cartouche), `center`, `ck`, `corners`, `POLY` (toute la grille) | hex |
| `src/render/labels.js` | `dayOf`, `turnLabel`, `goodFor`, `esc` | config |
| `src/render/map.js` | `drawStatic(map,seed)` (terrain en masses, cadre gradué, rivières et routes lissées, cartouche, lumière), `miniMap(map)` (vignette de la salle des cartes), `regionName`, `renderMap`, `counter`, `counterIcon`, `fx`, `impact`, `animatePath`, `applyZoom`, `LIVE_CUT`, `pocketsSvg` | geometry, store |
| `src/render/panel.js` | `renderPanel`, `hexBlock`, `combatBlock`, `resultBlock`, `unitMeta` | map, store |
| `src/render/hud.js` | `renderTrack`, `renderScore` (badge de PV Bleus–Rouges dépliable), `renderAct`, `pulseScore`, `scoreEl` | store |
| `src/render/sheets.js` | `openModal`, `closeModal`, `modeButtons`, `startScreen` (salle des cartes, écran plein `#hall`), `closeHall`, `rulesScreen` (règles, écran plein `#rules` avec sommaire), `closeRules` | rules/mapgen, map, scenes, store |
| `src/render/scenes.js` | Scènes SVG des règles jouées en boucle (SMIL, état final seul si mouvement réduit) : `sceneTerrain`, `sceneRoad`, `sceneRiver`, `sceneZoc`, `sceneBond`, `sceneSupply`, `sceneCombat` (rapport calculé par `rules/combat.odds`), `sceneRetreat`, `sceneCounter`, `typeCards` | config, rules/combat, map |
| `src/render/index.js` | `render()` : piste, carte, score, barre d'action, panneau | render/* |
| `src/render/audio.js` | `AUDIO` (Web Audio synthétisé, préférences dans `localStorage`) | store (lecture de la phase) |
| `src/input/map.js` | `onHex` + écouteur de clic sur le SVG | loop/orders, store |
| `src/input/actions.js` | `onAction` (`data-act` : end, undo, unit, toggle, attack, advance, cancel), `confirmEndCombat` | loop, render/sheets |
| `src/input/controls.js` | Dépliage du badge de PV (`store.scoreOpen`), fenêtres (`data-mode`, `data-resume`, `data-rules`, `data-end-confirm`, `data-close`), fermeture de l'écran des règles, Échap, zoom, son, `syncSound` | loop, render |
| `src/loop/turn.js` | `openHall(reroll)` (tire les trois graines), `newGame(mode,seed)`, `startPhase`, `endPhase`, `endGame` | rules/turn, render, store |
| `src/loop/orders.js` | `useDice`, `doMove`, `undoMove`, `selectUnit`, `placeUnit`, `resolve`, `advance`, `captureEffects` | rules/combat, render, store |
| `src/loop/ai.js` | `runAI`, `aiMove`, `aiCombat` (même logique pour les deux camps), `field` (Dijkstra mis en cache dans `fieldCache`, vidé à chaque partie et reprise) | orders, turn, store |
| `src/main.js` | `useDice(Math.random)`, zoom initial, `openHall`, import des modules `input/` | tout |

## Flux d'une action

1. `input/` reçoit l'événement (`onHex`, `onAction`).
2. `loop/` orchestre : appelle une règle (`resolveCombat`, `beginPhase`) ou mute l'état en
   place pour le déplacement (`doMove` → `placeUnit`).
3. `loop/` réaffecte `store.state` si c'est une transition, joue les effets (`AUDIO.*`, `fx`,
   `impact`, `animatePath`), puis `render()` et `save()`.

L'IA suit le même chemin : `startPhase` → `setTimeout(runAI, AI_START_DELAY)` → `aiMove` /
`aiCombat` → `doMove` / `resolve` → `endPhase`.

## Où va le nouveau code

| Type de changement | Où | Puis |
| --- | --- | --- |
| Nouvelle valeur (coût, seuil, délai, poids d'IA) | `src/config.js`, section correspondante | Importer là où elle sert |
| Nouvelle règle de jeu (calcul, légalité) | Fonction pure dans le module `src/rules/` du sous-système, `state` en paramètre | Test dans `tests/<module>.test.js` ; enveloppe dans `state/store.js` si `render/` ou `loop/` en a besoin |
| Nouvelle transition d'état | `src/rules/`, sur `structuredClone`, renvoyant `{state, …événements}` | Appel depuis `loop/`, puis `store.state = r.state` et effets |
| Ordre de bataille, renforts, génération de carte | `OOB_TEMPLATE`, `UNIT_TYPES`, section « Carte générée » de `config.js` ; logique dans `rules/deploy.js` et `rules/mapgen.js` | Vérifier `tests/deploy.test.js`, `tests/mapgen.test.js` et les textes de règles |
| Nouvel affichage | `src/render/` (panneau → `panel.js`, carte → `map.js`, fenêtre → `sheets.js`) | Appel depuis `render()` ou `loop/` |
| Nouveau bouton ou interaction | Balise `data-act="…"` dans le HTML généré par `render/`, traitement dans `onAction` (`input/actions.js`) | Logique dans `loop/` |
| Nouveau son | Méthode de `AUDIO` dans `render/audio.js` | Appel depuis `loop/` |
| Comportement de l'IA | `src/loop/ai.js`, poids et seuils dans `config.js` (`AI_*`) | — |
| Texte de règle affiché | `rulesScreen` / `startScreen` (`render/sheets.js`), scènes animées et leurs légendes (`render/scenes.js`), `hexBlock` et `TERRAIN_NOTE` (`render/panel.js`), `renderScore` (`render/hud.js`), `endGame` (`loop/turn.js`) | Garder en phase avec `config.js` |

## Écarts assumés

Voir `docs/decisions.md` : `render/` et `state/` importent `rules/` pour des requêtes pures,
`input/` décide encore du coup (`onHex`, `onAction`), le déplacement n'est pas encore une
transition pure.
