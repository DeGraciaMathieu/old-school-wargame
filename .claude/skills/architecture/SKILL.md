---
name: architecture
description: Use when you need to know where a module lives, what it depends on, or where new code must go in Le Saillant — before any change that touches more than one file or adds a file.
auto_invoke: true
---

# Architecture de Le Saillant

Modules ES natifs servis tels quels (pas de build). Point d'entrée : `index.html` →
`<script type="module" src="src/main.js">`. Styles : `styles.css`.

## Carte des modules

| Module | Rôle | Dépendances clés |
| --- | --- | --- |
| `src/config.js` | Toutes les constantes : géométrie (`R`, `COLS`, `ROWS`), carte (`TOWNS`, `RIVERS`, `ROADS`, `MAP_SEED`), coûts (`ROAD_COST`…), `STACK_LIMIT`, `BOND_RANGE`, `OOB`, `ARRIVALS`, `PHASES`, `TURNS`, `COLL`/`TH`/`CRT`/`RES`, `SHIFT_*`, `OOS_*`, `VP_*`, `RETREAT_*`, `AI_*`, délais, zoom, clés de stockage | aucune |
| `src/rules/hex.js` | Grille : `key`, `unkey`, `inMap`, `neighbors`, `dist`, `hexLine`, `ek` | config |
| `src/rules/map.js` | `buildMap(seed)` → `{HEX, riverEdge, roadEdges, roadChains}`, exportés calculés une fois ; `townKey`, `eastOfOur` | hex |
| `src/rules/units.js` | `other`, `onMap`, `isMech`, `vals`, `atkOf`, `mpOf` | config |
| `src/rules/control.js` | `unitsAt`, `occ`, `stackCount`, `zocOf`, `bondsOf` | hex, units |
| `src/rules/movement.js` | `stepCost`, `reach` | map, units, control |
| `src/rules/supply.js` | `supplyOf`, `supplyPath` | map, control |
| `src/rules/victory.js` | `vpOf`, `townTakenBy`, `outcome` | map, control |
| `src/rules/journal.js` | `pushLog`, `captureText` (aides internes) | victory |
| `src/rules/occupation.js` | `enterHex` : entrée sur une case avec prise de ville (aide interne) | victory, journal |
| `src/rules/combat.js` | `eligibleAttackers`, `canTarget`, `odds`, `resolveCombat` | control, occupation, journal |
| `src/rules/turn.js` | `beginPhase`, `nextPhase`, `freeHexNear` | supply, control, occupation |
| `src/rules/rng.js` | `createRng(seed)` (tests) | — |
| `src/state/store.js` | `store` `{state, busy, undo, sel, zoom, scoreOpen}`, `isAI`, `U`, enveloppes de requêtes, `log`, `save`, `loadSaved`, `createGame` | rules |
| `src/render/geometry.js` | `SVGW`, `SVGH`, `center`, `ck`, `corners`, `POLY` | hex, map |
| `src/render/labels.js` | `turnLabel`, `goodFor`, `esc` | config |
| `src/render/map.js` | `drawStatic`, `renderMap`, `counter`, `counterIcon`, `fx`, `impact`, `animatePath`, `applyZoom`, `LIVE_CUT`, `pocketsSvg` | geometry, store |
| `src/render/panel.js` | `renderPanel`, `hexBlock`, `combatBlock`, `resultBlock`, `unitMeta` | map, store |
| `src/render/hud.js` | `renderTrack`, `renderScore` (badge de PV dépliable), `renderAct`, `pulseScore`, `scoreEl` | store |
| `src/render/sheets.js` | `openModal`, `closeModal`, `modeButtons`, `startScreen`, `rulesScreen` | store |
| `src/render/index.js` | `render()` : piste, carte, score, barre d'action, panneau | render/* |
| `src/render/audio.js` | `AUDIO` (Web Audio synthétisé, préférences dans `localStorage`) | store (lecture de la phase) |
| `src/input/map.js` | `onHex` + écouteur de clic sur le SVG | loop/orders, store |
| `src/input/actions.js` | `onAction` (`data-act` : end, undo, unit, toggle, attack, advance, cancel), `confirmEndCombat` | loop, render/sheets |
| `src/input/controls.js` | Dépliage du badge de PV (`store.scoreOpen`), fenêtres (`data-mode`, `data-resume`, `data-rules`, `data-end-confirm`, `data-close`), Échap, zoom, son, `syncSound` | loop, render |
| `src/loop/turn.js` | `newGame`, `startPhase`, `endPhase`, `endGame` | rules/turn, render, store |
| `src/loop/orders.js` | `useDice`, `doMove`, `undoMove`, `selectUnit`, `placeUnit`, `resolve`, `advance`, `captureEffects` | rules/combat, render, store |
| `src/loop/ai.js` | `runAI`, `aiMove`, `aiCombat`, `field` (Dijkstra mis en cache dans `fieldCache`) | orders, turn, store |
| `src/main.js` | `useDice(Math.random)`, `drawStatic`, zoom initial, `startScreen`, import des modules `input/` | tout |

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
| Nouvelle donnée de scénario (unité, ville, route) | `OOB`, `ARRIVALS`, `TOWNS`, `ROADS`, `RIVERS` dans `config.js` | Vérifier `tests/map.test.js` (empreinte) et les textes de règles |
| Nouvel affichage | `src/render/` (panneau → `panel.js`, carte → `map.js`, fenêtre → `sheets.js`) | Appel depuis `render()` ou `loop/` |
| Nouveau bouton ou interaction | Balise `data-act="…"` dans le HTML généré par `render/`, traitement dans `onAction` (`input/actions.js`) | Logique dans `loop/` |
| Nouveau son | Méthode de `AUDIO` dans `render/audio.js` | Appel depuis `loop/` |
| Comportement de l'IA | `src/loop/ai.js`, poids et seuils dans `config.js` (`AI_*`) | — |
| Texte de règle affiché | `rulesScreen` / `startScreen` (`render/sheets.js`), `hexBlock` (`render/panel.js`), `endGame` (`loop/turn.js`) | Garder en phase avec `config.js` |

## Écarts assumés

Voir `docs/decisions.md` : `render/` et `state/` importent `rules/` pour des requêtes pures,
`input/` décide encore du coup (`onHex`, `onAction`), le déplacement n'est pas encore une
transition pure.
