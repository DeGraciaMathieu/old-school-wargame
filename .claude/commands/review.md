---
description: Revue complète des changements en cours — conventions, tests, maintenabilité, cohérence avec le système
---

# Revue complète

## 1. Préparer

1. Lire `CLAUDE.md`.
2. Délimiter le périmètre :
   - `git status`
   - `git diff`
   - `git diff --cached`
   - `git log --oneline -5`
3. S'il n'y a aucun changement (ni indexé, ni non indexé, ni fichier non suivi pertinent),
   répondre « Rien à revoir » et s'arrêter.
4. Invoquer `architecture` et les skills de domaine des fichiers touchés.

## 2. Vérifier point par point

### Conventions (`CLAUDE.md`)
- C1 — Aucun `document`, `window`, `localStorage`, `Math.random`, `Date.now`, `performance`
  dans `src/rules/`, et aucun import de `render/`, `input/`, `loop/` depuis `rules/`.
- C2 — Aucune valeur de règle en dur hors de `src/config.js` (hors exceptions de
  `docs/decisions.md`).
- C3 — Les règles ne mutent pas l'état reçu ; les transitions passent par `structuredClone` et
  renvoient `{state, …}` ; `loop/` réaffecte `store.state`.
- C4 — Le hasard est injecté (`rng`), jamais appelé dans `rules/`.
- C5 — Les unités sont référencées par `id` d'une transition à l'autre (`U(id)`).
- C6 — Code, commentaires et textes en français ; style compact du fichier modifié.
- C7 — Placement conforme au tableau « Où va le nouveau code » du skill `architecture`.

### Tests
- T1 — Chaque règle nouvelle ou modifiée de `src/rules/` a un test macro dans `tests/`.
- T2 — Les titres de test énoncent une règle du jeu, pas un détail d'implémentation.
- T3 — Les transitions ont un test d'immuabilité de l'état reçu.

### Maintenabilité
- M1 — Couplage : pas de nouvelle dépendance vers une couche supérieure.
- M2 — Responsabilité unique : une fonction, une intention.
- M3 — Duplication : pas de règle recopiée (ex. le prédicat `ok` de `supply.js`).
- M4 — Longueur et complexité des fonctions raisonnables pour le style du fichier.
- M5 — Nommage : vocabulaire du domaine, constantes en `MAJUSCULES_SNAKE`.
- M6 — Valeurs magiques (même critère que C2, côté `render/` et `loop/` aussi).

### Cohérence du système
- S1 — Intégration : les nouveaux appels passent par les enveloppes de `state/store.js` et
  l'orchestration de `loop/`.
- S2 — Forme de l'état : champs d'unité et de partie conformes à `CLAUDE.md` ; tout nouveau
  champ est traité dans `createGame` et reste compatible avec `SAVE_KEY`.
- S3 — Les modèles établis sont respectés (`beginPhase` / `resolveCombat` pour les
  transitions, `data-act` + `onAction` pour les boutons, `AUDIO.*` pour le son).
- S4 — Documentation vivante : `rulesScreen`, `startScreen`, `hexBlock`, légende des PV et
  `endGame` reflètent toujours le code.
- S5 — IA : si une règle change, `loop/ai.js` en tient-il compte ?

## 3. Lancer les tests

`npm test`, et noter le nombre de tests passés et échoués.

## 4. Rapport

| Point | Statut | Détail (fichier:ligne, correction attendue) |
| --- | --- | --- |
| C1 … S5 | OK / VIOLATION / N/A | |

Résultat de `npm test`.

**Verdict global** : `OK` si aucune violation et tests verts, sinon `À CORRIGER` avec la liste
priorisée des corrections. Ne rien corriger sans demande.
