---
name: testing
description: Use when writing, running or reviewing tests in Le Saillant, or when deciding whether a change needs a new test and where it goes.
auto_invoke: true
---

# Tests de Le Saillant

## Commande

```sh
npm test            # node --test → tests/*.test.js
npm run test:watch  # mode surveillance
```

`node:test` + `node:assert/strict`, sans aucune dépendance. Ne pas ajouter de bibliothèque de
test : si un test semble en réclamer une, c'est que la règle n'est pas assez pure.

## Philosophie

- **Tests macro, dans le vocabulaire du jeu.** Le titre du test énonce une règle qu'un joueur
  remarquerait : « entrer dans une zone de contrôle ennemie arrête le mouvement », « un 3:1
  contre Bastogne est décalé de deux colonnes (ville) ». Pas de test d'implémentation
  (« la Map interne contient 3 entrées »).
- **On ne teste que `src/rules/`** (et `config.js` en lecture). `render/`, `input/` et `loop/`
  touchent le DOM et ne sont pas couverts par `npm test`.
- **État construit à la main** avec un petit littéral explicite (`unit(...)`, `game(...)`,
  `battle(...)` en tête de fichier), lisible sans aide cachée.
- **Hasard maîtrisé** : `createRng(seed)` (`src/rules/rng.js`) ou un dé pipé
  `const die = n => () => (n - 1) / 6 + 0.01;` passé comme `rng`.
- **Transitions** : vérifier aussi que l'état reçu n'est pas modifié
  (`structuredClone` avant, `assert.deepEqual` après).
- Un ou deux tests par règle : le cas nominal et le cas limite qui justifie la règle.
- Les coordonnées viennent de la vraie carte (`HEX` généré avec `MAP_SEED`). Vérifier le
  terrain d'une case avant de s'en servir (ex. `5,5` dégagé, `2,7` Bastogne, `8,0` → `9,0` forêt).

## Fichier de test → périmètre couvert

| Fichier | Couvre |
| --- | --- |
| `tests/hex.test.js` | Voisins (centre, coin), distance, continuité de `hexLine` |
| `tests/map.test.js` | Carte déterministe et empreinte figée (73 forêts, 44 arêtes de rivière, 63 de route), Bastogne ville, pont de l'Our, `eastOfOur` |
| `tests/units.test.js` | Valeurs réduites, attaque ÷2 si coupée, mouvement ÷2 si isolée |
| `tests/movement.test.js` | `stepCost` (route, forêt, rivière), `reach` (arrêt en ZOC, PM restants, toujours une case, pile pleine) |
| `tests/control.test.js` | ZOC, liaison, rupture de liaison, empilement hors unités détruites |
| `tests/supply.test.js` | Ligne jusqu'au bord ouest, encerclement, case en ZOC tenue par un ami |
| `tests/victory.test.js` | Somme des PV, verdict, prise de ville libre, ville encore occupée |
| `tests/combat.test.js` | `odds` (ville, arrondi, blindés en dégagé, sous 1:2), `canTarget` une fois par phase, `resolveCombat` (DE, D2, A1, immuabilité) |
| `tests/turn.test.js` | `nextPhase`, PM en début de mouvement, coupée → isolée → perte d'un pas, entrée des renforts, reprise de ville par renforts, immuabilité |
| `tests/rng.test.js` | Rejouabilité de `createRng` |

Non couvert : l'IA (`loop/ai.js`), le déplacement en place (`doMove`, `placeUnit`, `advance`,
`undoMove`), le rendu et les entrées. Les vérifier en jouant (`npm run dev`).

## Où mettre un nouveau test

1. Règle d'un module existant → `tests/<module>.test.js` (même nom que `src/rules/<module>.js`).
2. Nouveau module `src/rules/x.js` → nouveau fichier `tests/x.test.js`.
3. Imports en tête : `import { test } from 'node:test'; import assert from 'node:assert/strict';`
   puis la règle depuis `../src/rules/…`.
4. Lancer `npm test` et voir le test passer, puis le voir échouer si on casse la règle (pour
   s'assurer qu'il teste quelque chose).
5. Si la règle touche à la carte (`TOWNS`, `ROADS`, `RIVERS`, `MAP_SEED`), mettre à jour
   l'empreinte de `tests/map.test.js` **seulement** si le changement de carte est voulu.
