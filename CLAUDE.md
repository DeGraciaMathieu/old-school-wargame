# Terra Incognita

Wargame à hexagones au tour par tour : deux camps fictifs et symétriques, les Bleus (bord ouest) et
les Rouges (bord est), sur une carte tirée au hasard à chaque partie. JavaScript vanilla servi en
modules ES natifs, contre une IA ou à deux sur le même écran. Construit sur le moteur du Saillant
(branche `main`), voir `docs/prd/`.

## Stack

- JavaScript ES2020+ en modules ES natifs, HTML, CSS (`styles.css`). Aucune dépendance npm,
  aucun bundler, aucun transpileur (branche « zéro-build », voir `docs/decisions.md`).
- Node 22 ou plus (`"engines": { "node": ">=22" }`).
- Rendu en SVG inline construit par chaînes (`innerHTML`), son synthétisé en Web Audio,
  sauvegarde dans `localStorage` (`SAVE_KEY = 'terra-incognita-v1'`).

| Commande | Effet |
| --- | --- |
| `npm run dev` | Sert le dossier avec `npx serve .`. Ouvrir `index.html` par double-clic **ne marche pas** (ESM refusé sur `file://`). |
| `npm test` | `node --test` : tests `node:test` + `node:assert/strict` dans `tests/*.test.js` |
| `npm run test:watch` | Mêmes tests en mode surveillance |

Il n'y a ni linter ni formateur. N'en ajoutez pas sans qu'on le demande.

## Conventions de code

### Couches (une flèche ne remonte jamais vers `rules/`)

| Couche | Contient | Peut importer |
| --- | --- | --- |
| `src/config.js` | Toutes les constantes nommées | rien |
| `src/rules/` | Règles pures : requêtes et transitions | `config.js`, autres `rules/` |
| `src/state/store.js` | `store` mutable partagé, requêtes liées à la partie en cours, `createGame`, sauvegarde | `config`, `rules` |
| `src/render/` | Tout ce qui écrit à l'écran (SVG, panneau, fenêtres, son) | `config`, `rules` (requêtes), `state` en lecture |
| `src/input/` | Écouteurs DOM, enregistrés à l'évaluation du module | tout sauf `main` |
| `src/loop/` | Orchestration : phases, ordres, IA, effets | tout sauf `input`, `main` |
| `src/main.js` | Câblage : injection des dés, premier affichage, import des modules `input/` | tout |

### À ne jamais faire

- **Aucun accès au DOM, à `window`, `document`, `localStorage`, `Math.random`, `Date.now`
  ou `performance` dans `src/rules/`.** Aucun import de `render/`, `input/` ou `loop/`
  depuis `rules/`.
- **Aucune valeur de règle en dur hors de `src/config.js`** : coût, seuil, décalage,
  probabilité, délai, poids de l'IA. Les seules exceptions admises sont listées dans
  `docs/decisions.md` (cotes en pixels du SVG, synthèse sonore, constantes d'algorithme).
- **Une règle ne mute jamais l'état reçu.** Une requête lit `state` passé en paramètre. Une
  transition fait `structuredClone(state)`, travaille sur la copie et renvoie
  `{state, …événements}` (modèles : `resolveCombat`, `beginPhase`). Seules les aides
  internes `pushLog` et `enterHex` mutent l'objet qu'on leur passe, et uniquement sur la
  copie d'une transition.
- **Le hasard est injecté.** Une règle aléatoire reçoit `rng` en paramètre. En jeu,
  `main.js` appelle `useDice(Math.random)`. Les tests passent `createRng(seed)` ou un dé pipé.
- La carte d'une partie se déduit de sa graine seule : `generateMap(createRng(seed))`. Changer
  le générateur ou ses constantes change toutes les cartes d'une graine donnée.
- Ne pas changer la forme de l'état sauvegardé sans traiter la migration de `terra-incognita-v1`
  (question ouverte, voir `docs/decisions.md`).

### État

- La partie vit dans `store.state` : `{mode, seed, turn, phase, control, attacked, log, over, units, map, arrivals}`.
  Elle est créée par `createGame(mode, seed)` : carte générée (`rules/mapgen.js`), armées déployées
  (`rules/deploy.js`), renforts annoncés (`arrivals`), villes des bandes latérales à leur camp et
  villes du centre neutres (`control[id] = null`).
  `map` est la carte de la partie, en JSON simple : `{hex, rivers, roads, roadChains, towns, riverLines, exits}`
  (`rivers` et `roads` indexés par clé d'arête). Les règles la lisent dans `state.map`, jamais dans un module.
- La phase en cours se lit avec `phaseOf(state)` (`rules/turn.js`, enveloppe `curPhase()`) :
  l'initiative alterne, les Bleus ouvrent les tours impairs, les Rouges les tours pairs.
  Une unité porte `id, side, name, div, type, v, rv, max, steps, pos, arrived, mp, attacked,
  dead, oos` (+ `turn`, `entry` pour les renforts).
- L'état d'interface vit à côté : `store.busy`, `store.undo`, `store.sel`, `store.zoom`,
  `store.scoreOpen` (badge de PV déplié).
- Côté `loop/`, après une transition : `store.state = r.state`, puis effets (son, FX,
  `render()`, `save()`). Les objets unité changent d'identité à chaque transition : référencer
  les unités par `id` (`U(id)`), jamais par un objet gardé d'une phase à l'autre.
- Les requêtes de `state/store.js` (`unitsAt`, `occ`, `zocOf`, `reach`, `odds`…) sont de
  simples enveloppes `rules.x(store.state, …)`.

### Style et nommage

- Style compact du prototype : fonctions fléchées, lignes denses, peu d'espaces. Suivez le
  style du fichier que vous modifiez.
- Code, commentaires, documentation et textes du jeu sont **en français**. Identifiants en
  anglais court (`reach`, `odds`, `supplyOf`) ; constantes de `config.js` en `MAJUSCULES_SNAKE`.
- Vocabulaire du domaine : hexagone, case, tour, phase, PM (points de mouvement), pas
  (step), PV (points de victoire), ZOC (zone de contrôle), liaison, ravitaillement, coupée,
  isolée, repli, avance après combat, renforts, CRT, ville neutre, bande, initiative. Camps :
  `'blue'` (Bleus, bord ouest) et `'red'` (Rouges, bord est). Types d'unité : `arm`, `mech`, `inf`,
  `td`.
- Clé d'hexagone : chaîne `'c,r'` (`key(c,r)`, `unkey(k)`). Clé d'arête : `ek(a,b)`.

## Conventions visuelles et de domaine

- Le jeu n'a qu'un thème sombre (« table de jeu sombre, carte d'état-major papier ») défini
  dans `styles.css`. Pas de thème clair. Couleurs des camps : `--bleu` et `--rouge` (`--red` sert
  aux alertes) ; classes `.blue`, `.red` et `.neutral`.
- Les textes de règles affichés au joueur sont écrits à la main dans `render/sheets.js`
  (`rulesScreen`, `startScreen`), `render/panel.js` (`hexBlock`, `TERRAIN_NOTE`), `render/hud.js` (légende des PV
  du badge de score, `renderScore`) et
  `loop/turn.js` (`endGame`). **Toute modification d'une règle doit mettre à jour ces
  textes.** La table CRT et la légende des résultats sont générées depuis `COLL`, `CRT` et
  `RES`.
- `prefers-reduced-motion` est respecté (`reduced` dans `render/map.js`).

## Comportement attendu

- Ne jamais déclarer une tâche terminée sans avoir lancé `npm test` et constaté que tout passe.
  Le hook Stop le vérifie aussi.
- Si une approche échoue deux fois, s'arrêter et revoir le plan avec l'utilisateur avant de
  continuer.
- N'implémenter que ce qui est demandé. Un changement de comportement non demandé, même une
  « correction évidente », se consigne dans `docs/decisions.md` au lieu d'être appliqué.
- Un point que le code ne tranche pas va dans les questions ouvertes de `docs/decisions.md`,
  sans être deviné.
- Toute nouvelle règle est une fonction pure de `src/rules/`, avec un test de comportement
  dans `tests/`.

## Skills disponibles

| Skill | Périmètre |
| --- | --- |
| `architecture` | Carte des modules, dépendances, où placer un nouveau code selon le type de changement |
| `testing` | Commande, philosophie des tests macro, couverture par fichier, où ajouter un test |
| `combat` | Rapport de force, CRT, décalages, résolution, repli, avance, combat de l'IA |
| `mouvement` | Coût d'un pas, cases atteignables, ZOC, liaisons, empilement, déplacement, annulation, mouvement de l'IA |
| `ravitaillement` | Zone et ligne de ravitaillement, statuts coupée / isolée, pertes, affichage |
| `scenario` | Carte, ordre de bataille, renforts, tours et phases, villes et victoire, sauvegarde |
| `feature` | Procédure pour implémenter une fonctionnalité de bout en bout (`/feature`) |
| `prd` | Rédiger une spécification produit sans rien implémenter |

Commandes : `/review`, `/check-conventions`, `/check-tests`.
