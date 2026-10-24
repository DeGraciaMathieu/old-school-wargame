---
description: Vérification légère des conventions du projet, de la cohérence tests/documentation, et lancement des tests
---

# Vérifier les conventions

## 1. Préparer

1. Lire `CLAUDE.md`.
2. Délimiter le périmètre : `git status`, `git diff`, `git diff --cached`, `git log --oneline -5`.
3. Si rien n'a changé, répondre « Rien à vérifier » et s'arrêter.

## 2. Vérifier

- V1 — Pureté de `src/rules/` : rechercher `document`, `window`, `localStorage`,
  `Math.random`, `Date.now`, `performance` et les imports `../render`, `../input`, `../loop`
  dans les fichiers modifiés de `src/rules/`.
- V2 — Valeurs de règle : aucun nouveau littéral numérique porteur de règle hors de
  `src/config.js`.
- V3 — Immuabilité : aucune règle ne mute un argument (hors `pushLog` / `enterHex` sur une copie).
- V4 — Langue et style : français, style compact du fichier.
- V5 — Tests : chaque règle modifiée dans `src/rules/` a un test touché ou ajouté dans `tests/`.
- V6 — Documentation : si une valeur ou une règle affichée a changé, les textes de
  `rulesScreen` / `startScreen` (`src/render/sheets.js`), `hexBlock` (`src/render/panel.js`),
  la légende des PV de `renderScore` (`src/render/hud.js`), `endGame` (`src/loop/turn.js`) sont à jour.

## 3. Lancer les tests

`npm test`.

## 4. Rapport

| Point | Statut | Détail |
| --- | --- | --- |
| V1 … V6 | OK / VIOLATION / N/A | |

Résultat de `npm test`.

**Verdict global** : `OK` ou `À CORRIGER`.
