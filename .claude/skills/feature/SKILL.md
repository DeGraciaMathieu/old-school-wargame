---
name: feature
description: Use when the user asks to implement a feature or a rule change in Le Saillant, end to end — from understanding the request to tested code and updated documentation.
user_invocable: true
---

# Implémenter une fonctionnalité

Demande : $ARGUMENTS

## 1. Comprendre

1. Reformuler la demande en une ou deux phrases, dans le vocabulaire du jeu.
2. Invoquer le skill `architecture`, puis le ou les skills de domaine concernés (`combat`,
   `mouvement`, `ravitaillement`, `scenario`).
3. Poser les questions que le code ne tranche pas, **avant de coder** :
   - valeurs numériques (coût, seuil, nombre de pas, délai) et leur nom dans `config.js` ;
   - interactions avec l'existant : ZOC, liaisons, ravitaillement, empilement, IA, sauvegarde ;
   - cas limites : unité réduite ou coupée, bord de carte, rivière, ville, dernier tour,
     partie reprise depuis une sauvegarde ;
   - l'IA doit-elle utiliser la nouveauté ?
4. Implémenter uniquement ce qui est demandé.

## 2. Implémenter dans l'architecture

1. Constantes → `src/config.js`.
2. Règle → fonction pure dans `src/rules/` (`state` et `rng` en paramètres ; transition sur
   `structuredClone`, renvoyant `{state, …événements}`).
3. Enveloppe dans `src/state/store.js` si `render/` ou `loop/` l'appelle.
4. Orchestration → `src/loop/` (`store.state = r.state`, effets, `render()`, `save()`).
5. Affichage → `src/render/` ; interaction → `data-act` + `onAction` (`src/input/actions.js`).
6. Respecter `CLAUDE.md` : aucun DOM ni hasard dans `rules/`, aucune valeur de règle en dur,
   style compact du fichier modifié, textes en français.

## 3. Tester

1. Écrire le ou les tests macro dans `tests/<module>.test.js` (voir le skill `testing`).
2. `npm test`, corriger jusqu'au vert. Ne jamais s'arrêter sur un rouge.
3. Si une approche échoue deux fois, s'arrêter et revoir le plan avec l'utilisateur.
4. Demander à l'utilisateur de vérifier en jeu (`npm run dev`) ce que les tests ne couvrent
   pas : rendu, IA, déplacement, animation.

## 4. Mettre à jour la documentation

- Textes de règles affichés : `rulesScreen` / `startScreen` (`src/render/sheets.js`),
  `hexBlock` et la légende des PV (`src/render/panel.js`), `endGame` (`src/loop/turn.js`).
- `CLAUDE.md` et les skills si une convention, un module ou un concept a bougé.
- `docs/decisions.md` : nouvelle question ouverte, ou comportement volontairement conservé.
- `README.md` si les commandes ou l'organisation changent.

## 5. Résumer

- Fichiers modifiés, avec une ligne chacun.
- Tests ajoutés (fichier + titre).
- Résultat de `npm test` (nombre de tests passés).
- Ce qui reste à vérifier en jeu et les questions ouvertes.
