---
name: testing
description: Use when writing, running or reviewing tests in Terra Incognita, or when deciding whether a change needs a new test and where it goes.
auto_invoke: true
---

# Tests de Terra Incognita

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
  contre une ville est décalé de deux colonnes ». Pas de test d'implémentation
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
- **Carte posée à la main** : `testMap({ forest, towns, rivers, roads })` (`tests/fixtures.js`)
  construit une carte entièrement dégagée avec seulement ce que le test déclare, passée dans
  `state.map` des fabriques d'état (avec `arrivals` pour les débuts de phase). Les tests de
  règles ne dépendent donc pas du générateur.
- **Carte générée** : `generateMap(createRng(seed))` sert aux tests d'invariants
  (`tests/mapgen.test.js`, `tests/deploy.test.js`, sur 200 à 1000 graines) et à
  `createGame('hotseat', seed)` dans `tests/turn.test.js`.
- Camps `'blue'` (bord ouest) et `'red'` (bord est).

## Fichier de test → périmètre couvert

| Fichier | Couvre |
| --- | --- |
| `tests/hex.test.js` | Voisins (centre, coin), distance, continuité de `hexLine` |
| `tests/fixtures.js` | Aide `testMap` (pas un fichier de test) |
| `tests/mapgen.test.js` | Même graine même carte, forme et JSON, routes reliant les deux bords, même total de PV par bande, espacement des villes, rivières de bord à bord, les deux sens présents |
| `tests/deploy.test.js` | Déploiement dans la bande du camp sans empilement, garnisons des villes à PV, même ordre de bataille des deux côtés, entrées et annonces des renforts |
| `tests/units.test.js` | Valeurs réduites, attaque ÷2 si coupée, mouvement ÷2 si isolée |
| `tests/movement.test.js` | `stepCost` (route, forêt, rivière, table `TERRAINS`), `reach` (arrêt en ZOC, PM restants, toujours une case, pile pleine) |
| `tests/control.test.js` | ZOC, liaison, rupture de liaison, empilement hors unités détruites |
| `tests/supply.test.js` | Bord ouest pour les Bleus, est pour les Rouges, encerclement, case en ZOC tenue par un ami |
| `tests/victory.test.js` | Somme des PV, ville neutre sans PV, verdict à l'écart (`VP_WIN_MARGIN`), prise de ville libre ou neutre, ville encore occupée |
| `tests/combat.test.js` | `odds` (ville, arrondi, blindés en dégagé, table `TERRAINS`, sous 1:2), `canTarget` une fois par phase, `resolveCombat` (DE, D2, A1, sens du repli par camp, immuabilité) |
| `tests/turn.test.js` | `nextPhase`, initiative alternée (`phaseOf`), PM en début de mouvement, coupée → isolée → perte d'un pas, entrée des renforts, reprise de ville par renforts, partie neuve (`createGame`), renforts rouges par le bord est, immuabilité |
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
5. Besoin d'un terrain particulier : le déclarer dans `testMap(...)` plutôt que chercher une case
   sur une carte générée.
