# Le Saillant

> ⚠️ **Ouvrir `index.html` par double-clic ne fonctionne plus.** Le jeu est découpé en
> modules ES natifs, que les navigateurs ne chargent pas depuis `file://`.
> Lancez `npm run dev` et ouvrez l'adresse affichée.

Wargame à hexagones au tour par tour : bataille des Ardennes, la route de Bastogne,
16–19 décembre 1944. Huit tours, contre une IA ou à deux sur le même écran.

## Prérequis

Node 22 ou plus. Aucune dépendance à installer : pas de bundler, pas de transpileur.

## Lancer le jeu

```sh
npm run dev
```

Sert le dossier en local avec `npx serve .` (téléchargé au premier lancement).
N'importe quel serveur statique fait l'affaire, par exemple `python3 -m http.server`.

## Tester

```sh
npm test          # node --test : tests de règles dans tests/*.test.js
npm run test:watch
```

Les tests couvrent la couche `src/rules/` (règles pures, sans DOM ni horloge) avec des
tests de comportement formulés dans le vocabulaire du jeu.

## Organisation

| Dossier | Rôle |
| --- | --- |
| `src/config.js` | Constantes du scénario : carte, ordre de bataille, table des résultats, seuils, délais |
| `src/rules/` | Règles pures : grille, carte, mouvement, contrôle, ravitaillement, combat, victoire, tours |
| `src/state/` | État partagé (`store`), requêtes liées à la partie en cours, sauvegarde |
| `src/render/` | Tout ce qui écrit à l'écran : carte SVG, panneau, piste, fenêtres, son |
| `src/input/` | Écouteurs d'événements : carte, boutons, fenêtres, zoom, son |
| `src/loop/` | Orchestration : phases, ordres des joueurs, IA |
| `src/main.js` | Point d'entrée : câblage, dés, premier affichage |
| `styles.css` | Feuille de style |
| `docs/decisions.md` | Décisions du refactor et questions ouvertes |
