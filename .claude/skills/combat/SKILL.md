---
name: combat
description: Use when touching attacks in Le Saillant — eligible attackers, targets, odds and column shifts, the CRT, the die roll, step losses, retreats, advance after combat, the combat UI or the AI's attack choices.
auto_invoke: true
---

# Combat

## Concepts → implémentation

| Concept | Où | Détail |
| --- | --- | --- |
| Attaquants éligibles | `eligibleAttackers(state,k,side)` — `src/rules/combat.js` | Unités du camp sur la carte, adjacentes à `k`, `!u.attacked` |
| Cible attaquable | `canTarget(state,k,side)` — `src/rules/combat.js` | `k` pas dans `state.attacked`, au moins un ennemi, au moins un attaquant |
| Force d'attaque | `atkOf(u)` — `src/rules/units.js` | `vals(u)[0]`, divisée par `OOS_ATK_DIVISOR` (min 1) si `oos >= OOS_CUT` |
| Défense | `vals(u)[1]` | Pas de malus de ravitaillement en défense |
| Rapport brut | `odds(...)`.col | Plus haut `i` tel que `A >= TH[i]*D` (arrondi en faveur du défenseur) ; `-1` sous 1:2 |
| Libellés de colonne | `COLL` — `config.js` | `'1:2'` … `'6:1'` (8 colonnes) |
| Décalages | `odds(...)`.shifts | `SHIFT_FOREST`, `SHIFT_TOWN`, `SHIFT_CITY`, `SHIFT_RIVER` (toutes les unités attaquent à travers une rivière), `SHIFT_ARMOR_CLEAR` (blindés `arm` contre défenseurs sans `arm`/`td`, en dégagé) |
| Colonne finale | `odds(...)`.fin | `col + Σ décalages`, bornée à `[0, CRT.length-1]`, ou `-1` |
| Table des résultats | `CRT[col][die-1]`, `RES[code]` — `config.js` | Codes `A1`, `NE`, `EX`, `D1`, `D2`, `DL`, `DL2`, `DE` |
| Jet de dé | `1+Math.floor(rng()*DIE_SIDES)` dans `resolveCombat` | `rng` injecté (`diceRng` de `loop/orders.js`, réglé par `useDice` dans `main.js`) |
| Perte d'un pas | `stepLoss(list)` (interne) | Frappe l'unité la plus forte (pas restants, puis attaque + défense) ; `steps<=0` → `dead`, `pos=null` |
| Repli | `retreatUnit(s,u,n,enemy,fromHexes,captures)` (interne) | Case par case : interdit ennemi, liaison ennemie, pile pleine ; score `RETREAT_ZOC_PENALTY` / `RETREAT_DIST_WEIGHT` / sens du camp / `RETREAT_COVER_BONUS` ; chaque case impossible ou ZOC ennemie non tenue coûte 1 pas |
| Prise de ville en repli | `enterHex` — `src/rules/occupation.js` | Remplit `captures` et le journal |
| Résolution | `resolveCombat(state,k,atkIds,rng)` → `{state,captures,result}` | `result = {k,die,code,o,notes,adv,side,killed}` ; marque `attacked`, journalise |
| Avance après combat | `result.adv` (ids) ; `advance(uid)` — `src/loop/orders.js` | Possible si la case est vidée ; limite `STACK_LIMIT` |
| Orchestration | `resolve(k,atk,rng)` — `src/loop/orders.js` | `store.state = r.state`, `captureEffects`, `AUDIO.dice/combat`, `impact` après `IMPACT_DELAY` |
| Interface | `combatBlock`, `resultBlock` — `src/render/panel.js` ; `renderAct` — `src/render/hud.js` ; `hl-target`/`hl-tsel`/`hl-atk`/`hl-adv` dans `renderMap` | Boutons `data-act` : `toggle`, `attack`, `advance`, `cancel` |
| Fin des combats | `confirmEndCombat(side)` — `src/input/actions.js` | Liste au plus `END_COMBAT_LIST_MAX` attaques encore possibles |
| IA | `aiCombat(side)` — `src/loop/ai.js` | Élague les attaquants de `AI_PRUNE_FROM_COL` jusqu'à `AI_PRUNE_KEEP_COL` ; colonne minimale `AI_MIN_COL_*` ; score `fin*AI_COMBAT_COL_WEIGHT + PV + bonus défenseur réduit` ; au plus `AI_COMBAT_GUARD` attaques |
| Effets | `impact(k,code,killed)` — `src/render/map.js` ; `AUDIO.combat(code,killed)` | Cosmétique |

## Ajouter un décalage de colonne

1. Déclarer `SHIFT_<NOM>` dans `src/config.js`, section Combat.
2. Dans `odds()` (`src/rules/combat.js`), pousser `['Libellé affiché', SHIFT_<NOM>]` dans
   `shifts` sous la bonne condition (lire `state.map.hex[k]`, `atk`, `defs`).
3. Ajouter un test dans `tests/combat.test.js` qui construit l'attaque et vérifie
   `COLL[odds(...).fin]`.
4. Mettre à jour le texte « Le rapport attaque/défense est arrondi… » de `rulesScreen`
   (`src/render/sheets.js`).
5. `npm test`.

## Ajouter ou modifier un résultat de la CRT

1. Modifier `CRT` et/ou `RES` dans `src/config.js` (la table et la légende des règles sont
   générées automatiquement).
2. Nouveau code : ajouter son `case` dans le `switch(code)` de `resolveCombat`, son effet
   sonore dans `AUDIO.combat` (`src/render/audio.js`), sa couleur `.r.<CODE>` dans `styles.css`,
   et l'ajouter à la liste de la légende dans `rulesScreen`.
3. Vérifier `goodFor` (`src/render/labels.js`) et la teinte `tone` de `confirmEndCombat`.
4. Test avec un dé pipé dans `tests/combat.test.js`.
5. `npm test`.
