---
name: prd
description: Use when the user wants a product specification (PRD) for a new feature or rule of Le Saillant before any implementation. Produces a document only, never code.
---

# Rédiger un PRD

Sujet : $ARGUMENTS

**Ce skill n'implémente rien.** Il produit un document de spécification.

## 1. Explorer l'existant

1. Invoquer `architecture` et les skills de domaine concernés.
2. Lire le code réellement touché (`src/config.js`, modules de `src/rules/`, `src/loop/`,
   `src/render/`) pour établir le socle technique : constantes, fonctions, champs d'état,
   textes de règles affichés, tests existants.
3. Relever dans `docs/decisions.md` les questions ouvertes liées au sujet.

## 2. Poser uniquement les décisions produit

Ne demander que ce que le code ne peut pas trancher : intention de jeu, valeurs, priorités
entre règles, comportement attendu de l'IA, effet sur l'équilibre (PV, rythme des renforts).
Ne pas poser de question dont la réponse est dans le code.

## 3. Écrire le PRD

Format fixe, en français, dans `docs/prd/<sujet-en-kebab-case>.md` (créer le dossier si besoin) :

```markdown
# PRD — <titre>

## Objectif
Ce que la fonctionnalité apporte au joueur, en une ou deux phrases.

## Socle technique
État actuel : fichiers, fonctions, constantes et champs d'état concernés (avec chemins).

## Comportement
Règles précises, dans le vocabulaire du jeu, avec les valeurs chiffrées et leur nom dans `config.js`.

## Hors périmètre
Ce qui ne sera pas fait.

## Impact par couche
- `config.js` :
- `rules/` :
- `state/` :
- `render/` (y compris textes de règles affichés) :
- `input/` :
- `loop/` (y compris IA) :
- Sauvegarde (`le-saillant-v1`) :

## Critères d'acceptation
Liste vérifiable, une ligne par critère.

## Tests
Tests macro à écrire : fichier `tests/…` et titre de chaque test.

## Risques et questions ouvertes
```

## 4. Conclure

Donner le chemin du PRD et la liste des questions ouvertes restantes. Ne rien implémenter.
