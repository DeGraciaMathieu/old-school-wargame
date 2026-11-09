# Terra Incognita

> ⚠️ **Ouvrir `index.html` par double-clic ne fonctionne plus.** Le jeu est découpé en
> modules ES natifs, que les navigateurs ne chargent pas depuis `file://`.
> Lancez `npm run dev` et ouvrez l'adresse affichée.

Wargame à hexagones au tour par tour : les Bleus contre les Rouges, deux armées de même force,
sur une carte tirée au hasard à chaque partie (forêts, rivières, routes, villes). Huit tours,
contre une IA ou à deux sur le même écran. Construit sur le moteur du Saillant (branche `main`).

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
| `src/config.js` | Constantes : terrains, génération de carte, ordre de bataille, table des résultats, seuils, IA, délais |
| `src/rules/` | Règles pures : grille, génération de carte, déploiement, mouvement, contrôle, ravitaillement, combat, victoire, tours |
| `src/state/` | État partagé (`store`), requêtes liées à la partie en cours, sauvegarde |
| `src/render/` | Tout ce qui écrit à l'écran : carte SVG, panneau, piste, fenêtres, son |
| `src/input/` | Écouteurs d'événements : carte, boutons, fenêtres, zoom, son |
| `src/loop/` | Orchestration : phases, ordres des joueurs, IA |
| `src/main.js` | Point d'entrée : câblage, dés, premier affichage |
| `styles.css` | Feuille de style |
| `docs/decisions.md` | Décisions du refactor et questions ouvertes |
| `docs/prd/` | Spécifications : extraction du cœur, Terra Incognita |
