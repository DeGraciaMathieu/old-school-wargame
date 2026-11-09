---
name: mouvement
description: Use when touching movement in Le Saillant — movement point costs, reachable hexes, zones of control, bonds (liaisons), stacking, moving or undoing a move, unit selection on the map, or the AI's movement.
auto_invoke: true
---

# Mouvement

## Concepts → implémentation

| Concept | Où | Détail |
| --- | --- | --- |
| Coût d'un pas `a → b` | `stepCost(map,a,b,mech)` — `src/rules/movement.js` | Route : `ROAD_COST` (ponts compris) ; sinon `TERRAINS[t].cost.mech` ou `.inf` selon l'unité ; `+RIVER_CROSSING_COST` sur arête de rivière sans route |
| Mécanisé | `isMech(u)` — `src/rules/units.js` | `arm`, `mech`, `td` |
| PM disponibles | `u.mp`, rechargé par `beginPhase` à `mpOf(u)` | `mpOf` ÷`OOS_MP_DIVISOR` si isolée |
| Cases atteignables | `reach(state,u)` → `Map(k → {cost,path,zoc})` — `src/rules/movement.js` | Dijkstra ; on s'arrête en entrant en ZOC ennemie ; pas de ZOC à ZOC ; cases ennemies et liaisons ennemies interdites ; une unité à PM pleins peut toujours avancer d'une case ; arrivée interdite sur une pile pleine |
| ZOC | `zocOf(state,side)` — `src/rules/control.js` | Les 6 voisins de chaque unité du camp |
| Liaison | `bondsOf(state,side)` → `Map(case → [[a,b]])` | Deux amis à `BOND_RANGE` cases, cases communes vides interdites à l'ennemi, rompue si un ennemi s'y trouve déjà |
| Empilement | `stackCount(state,k,side,except)`, `STACK_LIMIT` | Unités détruites exclues |
| Sélection | `selectUnit(u)` — `src/loop/orders.js` ; `onHex(k)` — `src/input/map.js` | Toucher une pile plusieurs fois fait passer d'une unité à l'autre |
| Déplacement | `doMove(u,k,r)` — `src/loop/orders.js` | **Mute l'état en place** : empile un instantané dans `store.undo`, `animatePath`, `placeUnit` sur chaque case du chemin, `mp = 0` si `r.zoc`, sinon `mp - cost` |
| Prise de ville en marchant | `placeUnit(u,k)` — `src/loop/orders.js` | `townTakenBy` (`src/rules/victory.js`) puis `captured` |
| Annulation | `undoMove()` — `src/loop/orders.js` | Restaure `pos`, `mp`, `control` (pas le journal) ; pile vidée à chaque phase |
| Affichage | `renderMap` — `src/render/map.js` | `hl-zoc` (ZOC ennemie teintée pendant le mouvement d'un joueur humain, hors cases ennemies), `hl-reach` / `hl-reachz` (case atteignable en ZOC), liaisons tracées pendant le mouvement (`bond own`/`foe`) |
| Animation | `animatePath(u,path)` | `MOVE_MS_PER_HEX` par case, désactivée si `prefers-reduced-motion` |
| IA | `aiMove(side)` — `src/loop/ai.js` | Objectifs : `AI_US_SLOTS` (Américains), villes à PV avec `AI_DE_CAP_*` et `AI_DE_VP_WEIGHT` (Allemands) ; distances `field(goal,mech)` ; score de case avec `AI_US_COVER_BONUS`, `AI_ZOC_WEIGHT_*` ; ne bouge que si gain > `AI_MOVE_MIN_GAIN` |

## Modifier un coût de mouvement

1. Changer le coût du terrain dans `TERRAINS` ou les constantes d'arête (`ROAD_COST`,
   `RIVER_CROSSING_COST`) dans `src/config.js` (section Carte et Mouvement).
2. Mettre à jour `tests/movement.test.js`.
3. Mettre à jour les textes : section « Mouvement » de `rulesScreen` (`src/render/sheets.js`)
   et `TERRAIN_NOTE` de `hexBlock` (`src/render/panel.js`).
4. Le champ de l'IA est mis en cache par carte (`fieldCache`, vidé à chaque nouvelle partie) :
   rien à faire si le coût ne dépend que du terrain.
5. `npm test`.

## Ajouter une restriction de mouvement

1. Si c'est une propriété de case dérivée de l'état (comme ZOC ou liaison), écrire la requête
   dans `src/rules/control.js` avec `state` en paramètre.
2. L'appliquer dans `reach()` (`src/rules/movement.js`), en conservant la règle « toujours
   une case ».
3. Si le repli doit la respecter aussi, l'ajouter dans `retreatUnit` (`src/rules/combat.js`).
4. Exposer une enveloppe dans `src/state/store.js` si `render/` doit l'afficher.
5. Tests dans `tests/movement.test.js` ou `tests/control.test.js`, puis texte de règle.
6. `npm test`.

Question ouverte : `doMove`/`placeUnit`/`advance` ne sont pas encore des transitions pures
(voir `docs/decisions.md`). Ne pas les transformer sans accord explicite.
