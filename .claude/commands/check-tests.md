---
description: Analyser la couverture des changements par les tests macro, proposer les tests manquants, les écrire après accord
---

# Vérifier les tests

## 1. Préparer

1. Lire `CLAUDE.md` et invoquer le skill `testing`.
2. Délimiter le périmètre : `git status`, `git diff`, `git diff --cached`, `git log --oneline -5`.
3. Si rien n'a changé, répondre « Rien à analyser » et s'arrêter.

## 2. Analyser la couverture

Pour chaque fonction ajoutée ou modifiée dans `src/rules/` (et chaque constante de
`src/config.js` qui change une règle) :

- quel fichier de `tests/` la couvre, et par quel test ;
- le cas nominal est-il testé ? le cas limite qui justifie la règle ?
- pour une transition, l'immuabilité de l'état reçu est-elle testée ?

Signaler aussi les changements dans `loop/`, `render/` ou `input/` qui ne sont pas testables
par `npm test` et doivent être vérifiés en jeu.

## 3. Proposer

Lister les tests macro manquants : fichier cible, titre (une règle du jeu en français), état
de départ en une ligne, assertion attendue.

**S'arrêter et attendre l'accord de l'utilisateur avant d'écrire le moindre test.**

## 4. Écrire et relancer (après accord)

1. Écrire les tests acceptés, dans le style des fichiers existants (`node:test`,
   `node:assert/strict`, état littéral, `createRng` ou dé pipé).
2. `npm test`.

## 5. Rapport

| Élément modifié | Couverture | Statut |
| --- | --- | --- |
| fonction / constante | fichier : titre du test | OK / VIOLATION (non couvert) / N/A |

Résultat de `npm test`, tests ajoutés, points à vérifier en jeu.

**Verdict global** : `OK` ou `À COMPLÉTER`.
