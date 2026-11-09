---
name: ravitaillement
description: Use when touching supply in Terra Incognita — supply zone or supply line, cut/isolated status (oos), step loss from lack of supply, supply markers and the supply line drawn on the map.
auto_invoke: true
---

# Ravitaillement

## Concepts → implémentation

| Concept | Où | Détail |
| --- | --- | --- |
| Bord de ravitaillement | `supplyOf` / `supplyPath` — `src/rules/supply.js` | `homeCol(side)` (`src/rules/units.js`, d'après `HOME`) : colonne `0` (ouest) pour `'blue'`, `COLS-1` (est) pour `'red'` |
| Case praticable | `ok(h)` local | Pas une case ennemie ; pas en ZOC ennemie, sauf si une unité amie l'occupe |
| Franchissement de rivière | `supCross(a,b)` (interne) | Arête de rivière seulement si une route la traverse (pont) |
| Zone ravitaillée | `supplyOf(state,side)` → `Set` de cases | BFS depuis le bord |
| Ligne de ravitaillement | `supplyPath(state,side,from)` → chemin de cases ou `null` | BFS depuis l'unité ; affichée à la sélection |
| Statut | `u.oos` : `0`, `OOS_CUT` (1, coupée), `OOS_ISOLATED` (2, isolée), puis `>2` | Champ de l'unité, sauvegardé |
| Effets du statut | `atkOf` / `mpOf` — `src/rules/units.js` | Coupée : attaque ÷`OOS_ATK_DIVISOR` (min 1) ; isolée : mouvement ÷`OOS_MP_DIVISOR` aussi |
| Vérification | `checkSupply(s,side,news)` (interne) — `src/rules/turn.js` | Appelée par `beginPhase` au début du **mouvement** du camp, avant les renforts ; ravitaillée → `oos=0` ; sinon `oos+1` ; au-delà d'isolée, perte d'un pas (destruction possible) ; journalise |
| Annonces | `beginPhase(...).news` → `[case, texte, classe]` | Jouées par `startPhase` (`src/loop/turn.js`) en `fx` décalés de `SUPPLY_FX_DELAY` / `SUPPLY_FX_STAGGER` |
| Coupure à venir | `LIVE_CUT` — `src/render/map.js` | Recalculé à chaque `renderMap` : unités hors zone **maintenant**, alors que `oos` reste figé jusqu'à la prochaine vérification |
| Marqueurs de pion | `counter(u)` — `src/render/map.js` | `mk cut` / `mk iso` (pâli `back` si la ligne est rétablie), `mk pre` (sera coupée), hachures `ihatch` si isolée |
| Texte du panneau | `unitMeta`, ligne « Ravitaillement » de `hexBlock` — `src/render/panel.js` | — |
| Ligne tracée | `#supline` dans `renderMap` | Pour l'unité sélectionnée |
| Poches | `pocketsSvg()` — `src/render/map.js` | Désactivé (`SHOW_POCKETS=false`), question ouverte |

## Modifier une règle de ravitaillement

1. Praticabilité ou franchissement → `src/rules/supply.js` (`ok` est dupliqué dans
   `supplyOf` et `supplyPath` : modifier les deux).
2. Progression du statut ou pertes → `checkSupply` dans `src/rules/turn.js` ; seuils
   `OOS_*` dans `src/config.js`.
3. Effets sur les valeurs → `atkOf` / `mpOf` dans `src/rules/units.js`.
4. Tests : `tests/supply.test.js` (zone, ligne), `tests/turn.test.js` (progression),
   `tests/units.test.js` (effets).
5. Affichage : `counter`, `unitMeta`, `hexBlock`, et la section « Ravitaillement » de
   `rulesScreen` (`src/render/sheets.js`).
6. `npm test`.
