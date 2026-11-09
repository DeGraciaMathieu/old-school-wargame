# PRD — Terra Incognita

Branche `jeu/terra-incognita`. Phase 2 du plan. Prérequis : `docs/prd/extraction-du-coeur.md` terminé (carte dans
`state.map`, table `TERRAINS`, scénario passé à `createGame`).

## Objectif
Un wargame à hexagones qui garde les mécaniques et le visuel du Saillant, mais oppose deux camps fictifs et
symétriques, les **Bleus** et les **Rouges**. Chaque partie se joue sur une carte tirée au hasard. Le joueur ne peut
plus apprendre la carte par cœur : il doit lire le terrain à chaque partie.

## Socle technique
Après l'extraction, le moteur ne dépend plus d'une carte ni d'un scénario fixes. Ce qui reste propre au Saillant :

- **Camps asymétriques.** Les identifiants `'de'` et `'us'` sont partout : `other` (`rules/units.js`), bords de
  ravitaillement (`rules/supply.js`, `us` → colonne 0, `de` → `COLS-1`), sens du repli (`retreatUnit`, `rules/combat.js`),
  `isAI` et les modes `ai-us`/`ai-de` (`state/store.js`), `SIDE`, classes CSS `.de`/`.us` et variables `--de`/`--us`
  (`styles.css`), tonalité radio (`render/audio.js`).
- **Ordre des phases fixe.** `PHASES` (`config.js`) enchaîne toujours Allemands puis Américains. `PHASES[state.phase]`
  est lu par `rules/turn.js`, `loop/turn.js`, `loop/ai.js`, `render/panel.js`, `render/hud.js`, `render/map.js`,
  `render/audio.js`, `input/map.js` et `input/actions.js`. `panel.js` code en dur l'indice de la phase américaine
  (`a.side==='de'?0:2`).
- **Victoire asymétrique.** `outcome(vp)` (`rules/victory.js`) juge sur les seuls PV allemands (`VP_GERMAN_WIN`,
  `VP_DRAW`, `VP_TOTAL`). `renderScore`, `endGame` et `captureText` affichent des « PV allemands ».
- **IA à deux personnalités.** `aiMove` défend des villes nommées côté `us` (`AI_US_SLOTS`) et attaque côté `de`
  (`AI_DE_CAP_*`, `AI_DE_VP_WEIGHT`). `aiCombat` a des seuils par camp (`AI_MIN_COL_DE*`, `AI_MIN_COL_US*`).
- **Textes historiques.** `startScreen`, `rulesScreen`, `modeButtons` (`render/sheets.js`), `turnLabel`
  (`render/labels.js`, `FIRST_DAY`, `TURNS_PER_DAY`), `endGame` (`loop/turn.js`), légende des PV (`render/hud.js`),
  `introLog` du scénario.
- **Hasard disponible** : `createRng(seed)` (`rules/rng.js`) et le dé injecté par `useDice` (`loop/orders.js`).
  Le POC `poc/carte-aleatoire` sert de référence pour les rivières en marche aléatoire (`randomLayout`).

## Comportement

### Camps
- Identifiants `'blue'` et `'red'`. `SIDE={blue:'Bleus',red:'Rouges'}`.
- Les Bleus tiennent le bord ouest (colonne 0), les Rouges le bord est (colonne `COLS-1`). Ce bord sert au
  ravitaillement, à l'entrée des renforts et à l'orientation du repli : un Bleu recule vers l'ouest, un Rouge vers l'est.
- Modes : `ai-red` (joueur bleu contre l'IA), `ai-blue` (joueur rouge contre l'IA), `hotseat`.
- Couleurs `--blue` et `--red` dans `styles.css`, dans la palette sourde actuelle (« carte d'état-major papier »).

### Tour de jeu
- 8 tours (`TURNS` inchangé), 4 phases : mouvement puis combats d'un camp, puis mouvement et combats de l'autre.
- **Initiative alternée** : les Bleus ouvrent les tours impairs, les Rouges les tours pairs. Une requête pure
  `phaseOf(state)` (`rules/turn.js`) remplace `PHASES[state.phase]` partout.
- Libellé de tour sans date historique : « Jour 1, matin », « Jour 1, après-midi »… (`TURNS_PER_DAY` conservé,
  `FIRST_DAY` supprimé).
- Ravitaillement, renforts et PM restent vérifiés au début du mouvement de chaque camp (`beginPhase` inchangé).

### Carte générée
- À chaque nouvelle partie, une graine est tirée avec le dé injecté et stockée dans `state.seed`.
  `generateMap(rng)` (nouveau module `rules/mapgen.js`, pur) reçoit `createRng(seed)` et renvoie une carte de même
  forme que `state.map`. Une même graine donne toujours la même carte.
- Taille fixe : 16 × 12 (`COLS`, `ROWS`).
- **Bandes** : ouest (colonnes 0 à `ZONE_WEST_MAX_COL`), centre, est (colonnes `ZONE_EAST_MIN_COL` à 15).
- **Terrains** : les mêmes qu'aujourd'hui (dégagé, forêt, village, ville, rivière, route).
  - Forêts : même automate cellulaire que le Saillant (`FOREST_PROB`, `TERRAIN_SMOOTH_PASSES`, `FOREST_GROW_MIN`,
    `FOREST_CLEAR_MAX`), sans les bandes historiques (`FOREST_PROB_WEST`, `FOREST_PROB_OUR`…).
  - Rivières : leur nombre est tiré entre `RIVER_MIN` et `RIVER_MAX`. Chaque rivière tire son sens, nord-sud ou
    est-ouest, puis traverse la carte d'un bord au bord opposé en marche aléatoire, comme `randomLayout` dans le POC.
    Ses noms sont tirés dans `RIVER_NAMES`.
  - Villes : `TOWN_LAYOUT` décrit les villes de chaque bande latérale (`side`, identiques à l'ouest et à l'est :
    villages de 2, 1 et 0 PV) et de la bande centrale (`center` : une ville de 3 PV, deux villages de 1 PV). Elles sont
    espacées d'au moins `TOWN_MIN_DIST`, jamais sur une colonne de bord, et tirées de nouveau jusqu'à `TOWN_TRIES` fois
    si la place manque. Leurs noms sont tirés sans remise dans `TOWN_NAMES` (noms fictifs).
  - Routes : l'arbre couvrant le plus court entre les villes, plus une route de chacune des `EXITS_PER_SIDE` villes
    les plus proches de chaque bord jusqu'à ce bord, tracées avec `hexLine`. Une route qui croise une rivière y forme
    un pont (règle actuelle).
- **Invariants garantis** par construction : le réseau de routes est connexe et touche les deux bords (`map.exits`) ;
  les deux bandes latérales ont le même total de PV.

### Ordre de bataille et déploiement
- **Fixe et identique pour les deux camps.** Un seul modèle `OOB_TEMPLATE` dans `config.js` (types, valeurs, pas, tour
  d'arrivée) est instancié pour chaque camp. Seuls les noms changent, tirés de `UNIT_NAMES`.
- Unités de départ : placées par une règle pure `deploy(map, side, rng)` dans la bande de leur camp, d'abord une par
  ville à PV de leur bande, puis sur les cases libres les plus proches des routes. L'empilement est respecté
  (`STACK_LIMIT`).
- **Renforts** : mécanique actuelle (`arrive` dans `rules/turn.js`). Ils entrent au début du mouvement de leur camp, au
  tour prévu par le modèle. Leurs entrées sont les cases du bord de leur camp où sort une route, puis les cases de bord
  voisines. Le texte des arrivées (`state.arrivals`) est généré à partir du modèle.

### Villes et victoire
- **Contrôle initial** : les villes de la bande ouest sont aux Bleus, celles de la bande est aux Rouges, celles du
  centre sont **neutres** (`control[id]=null`).
- Prise de ville : règle actuelle (`townTakenBy`). Une ville neutre ou ennemie passe au camp qui y entre, si aucune
  unité ennemie ne l'occupe.
- PV d'un camp : somme des PV des villes qu'il contrôle. Une ville neutre ne rapporte rien.
- **Fin de partie** (fin du tour 8) : si l'écart de PV entre les deux camps est d'au moins `VP_WIN_MARGIN`, le camp en
  tête gagne ; sinon, match nul. `outcome(vpBlue, vpRed)` remplace `outcome(vp)`. `VP_GERMAN_WIN`, `VP_DRAW` et
  `VP_TOTAL` disparaissent.

### IA
- **Une seule logique pour les deux camps**, paramétrée par `side`. Aucune règle du jeu n'est modifiée pour l'IA.
- Mouvement : une garnison par ville à PV contrôlée (`AI_GARRISON_PER_TOWN`), en priorité dans les villes qui valent
  le plus. Les autres unités visent les villes à PV non contrôlées, pondérées par leurs PV (`AI_VP_WEIGHT`) et plafonnées
  par ville (`AI_CAP_PER_TOWN`). Une garnison préfère le couvert (`AI_COVER_BONUS`). Les poids de ZOC fusionnent en
  `AI_ZOC_WEIGHT`.
- Combat : on attaque à partir de `AI_MIN_COL_VP` contre une ville à PV et de `AI_MIN_COL` ailleurs ; l'élagage des
  attaquants reste celui d'aujourd'hui (`AI_PRUNE_*`). L'avance après combat se fait sur une ville, ou si l'attaquant
  n'est pas en garnison.
- Les objectifs sont lus dans `state.map.towns`. Aucun identifiant de ville n'apparaît dans le code.

### Écrans et textes
- Titre « Terra Incognita » (`index.html`, `startScreen`).
- Écran de départ : présentation générique, boutons « Jouer les Bleus », « Jouer les Rouges », « Deux joueurs ».
- **Graine visible** : le numéro de carte (`state.seed`) s'affiche dans le panneau, sous le tour.
- Règles (`rulesScreen`) réécrites : initiative alternée, bord de chaque camp, villes neutres, victoire à l'écart.
  La liste des villes à PV n'est plus écrite à la main : elle renvoie au badge de score.
- Badge de score (`renderScore`) : « Bleus x · Rouges y », tendance (« avantage bleu », « nul », « avantage rouge »),
  détail des villes à PV avec leur contrôleur, neutre compris.
- Journal : `captureText` annonce les PV du camp qui prend la ville (« +2 PV bleus »). L'`introLog` est générique.
- `endGame` : verdict à l'écart de PV, avec la liste des villes.
- Renforts à venir (`panel.js`) et piste des tours (`hud.js`) : calculés avec `phaseOf`, sans indice de phase en dur.

## Hors périmètre
- Équité du terrain (carte en miroir, équilibre des forêts, des rivières et des routes entre les camps) : c'est un sujet à
  part. Ici, la carte est simplement aléatoire. Seul le total de PV par bande est égalisé, parce qu'il fait partie de
  la mise en place symétrique.
- Nouveaux terrains (marais, collines…).
- Taille de carte variable, autre que 16 × 12.
- Saisie d'une graine pour rejouer une carte donnée.
- Ordre de bataille tiré au hasard, ou différent selon le camp.
- Fin de partie anticipée, brouillard de guerre, campagne, jeu en ligne.
- Retouches du Saillant sur `main`.

## Impact par couche
- `config.js` : `SIDE`, `PHASES` (camp « premier »/« second »), `TURNS_PER_DAY` ; nouvelles constantes de génération
  (`ZONE_WEST_MAX_COL`, `ZONE_EAST_MIN_COL`, `RIVER_MIN`, `RIVER_MAX`, `RIVER_NS_COLS`, `RIVER_EW_ROWS`, `TOWN_LAYOUT`,
  `TOWN_MIN_DIST`, `TOWN_TRIES`, `EXITS_PER_SIDE`, `TOWN_NAMES`, `RIVER_NAMES`), `OOB_TEMPLATE`, `UNIT_NAMES`,
  `VP_WIN_MARGIN`, constantes d'IA unifiées ; suppression du scénario `SAILLANT`, de `FIRST_DAY`, de `VP_GERMAN_WIN`,
  `VP_DRAW`, `VP_TOTAL` et des constantes d'IA par camp.
- `rules/` : nouveau `mapgen.js` (`generateMap`) et `deploy.js` (`deploy`) ; `units.js` (`other`) ; `supply.js`
  (bord par camp) ; `combat.js` (sens du repli) ; `turn.js` (`phaseOf`) ; `victory.js` (`outcome` à deux camps,
  villes neutres) ; `journal.js` (`captureText`). Le scénario historique et `mulberry(MAP_SEED)` sont retirés.
- `state/` : `createGame(mode, seed)` génère la carte, déploie, initialise le contrôle ; l'état porte `seed` ; `isAI`
  sur les nouveaux modes.
- `render/` : `sheets.js` (départ, règles, boutons), `labels.js` (`turnLabel`), `hud.js` (score, piste), `panel.js`
  (graine, renforts à venir, consignes), `map.js` (classes de camp, ville neutre), `audio.js` (tonalité par camp),
  `styles.css` (`--blue`, `--red`, classes `.blue`, `.red`, `.neutral`), `index.html` (titre).
- `input/` : `controls.js` (nouveaux modes, graine tirée au lancement) ; `map.js` et `actions.js` (`phaseOf`).
- `loop/` : `turn.js` (`phaseOf`, `endGame`) ; `ai.js` réécrit en une logique paramétrée par camp ; `orders.js`
  (effet de capture, signe des PV).
- Sauvegarde : clé `terra-incognita-v1`. L'état porte `seed` et `map`. Une sauvegarde faite pendant l'extraction (camps
  `de`/`us`) doit être refusée au chargement : `loadSaved` vérifie la présence de `seed`.
- Documentation : `CLAUDE.md`, skills de domaine et `docs/decisions.md` mis à jour pour le nouveau jeu.

## Critères d'acceptation
- Une nouvelle partie affiche une carte différente à chaque lancement, et la même graine redonne la même carte.
- Sur 1000 graines, chaque carte générée respecte tous les invariants.
- Les deux camps ont le même ordre de bataille, aux noms près, et le même total de PV dans leur bande.
- Les villes du centre sont neutres au début et ne rapportent de PV à personne.
- Au tour 1, les Bleus jouent en premier ; au tour 2, les Rouges.
- Chaque camp se ravitaille par son bord, et ses renforts entrent par ce bord au tour prévu.
- En fin de partie, un écart d'au moins `VP_WIN_MARGIN` donne la victoire, sinon le match est nul.
- L'IA joue l'un ou l'autre camp jusqu'au tour 8 sans erreur dans la console, en prenant et en tenant des villes.
- Aucun texte affiché ne mentionne Bastogne, les Allemands, les Américains ou décembre 1944.
- Les règles affichées, le badge de score et la fenêtre de fin décrivent les règles réellement appliquées.
- `npm test` passe.

## Tests
- `tests/mapgen.test.js` :
  - « une même graine donne toujours la même carte » ;
  - « deux graines différentes donnent deux cartes différentes » ;
  - « sur 1000 graines, le réseau de routes relie les deux bords » ;
  - « sur 1000 graines, les deux bandes latérales ont le même total de PV » ;
  - « aucune ville n'est sur une colonne de bord ni à moins de TOWN_MIN_DIST d'une autre » ;
  - « sur 1000 graines, le nombre de rivières reste entre RIVER_MIN et RIVER_MAX, et chaque rivière va d'un bord au
    bord opposé » ;
  - « sur 1000 graines, on trouve des rivières nord-sud et des rivières est-ouest » ;
  - « la carte générée a la même forme que celle attendue par les règles ».
- `tests/deploy.test.js` :
  - « les unités de départ sont dans la bande de leur camp, sans dépasser l'empilement » ;
  - « chaque ville à PV d'un camp reçoit une garnison au départ » ;
  - « les deux camps reçoivent le même ordre de bataille ».
- `tests/turn.test.js` :
  - « les Bleus ouvrent les tours impairs, les Rouges les tours pairs » ;
  - « les renforts rouges entrent par le bord est au tour prévu ».
- `tests/supply.test.js` : « les Bleus se ravitaillent par le bord ouest, les Rouges par le bord est ».
- `tests/combat.test.js` : « un défenseur bleu recule vers l'ouest, un rouge vers l'est ».
- `tests/victory.test.js` :
  - « une ville neutre ne rapporte de PV à personne » ;
  - « entrer dans une ville neutre la prend » ;
  - « un écart de VP_WIN_MARGIN PV donne la victoire, un écart moindre un nul ».

## Risques et questions ouvertes
- **Valeurs initiales** à fixer puis à calibrer par des parties d'essai : bornes `RIVER_MIN` et `RIVER_MAX` (une
  partie sans rivière est-elle permise ?), composition et valeurs d'`OOB_TEMPLATE`,
  calendrier des renforts, nombre de villes par bande, PV par ville, `VP_WIN_MARGIN`, largeur des bandes.
- **Initiative alternée** : le camp qui ferme un tour rouvre le suivant, donc joue deux fois de suite. C'est voulu
  par l'alternance, mais l'effet sur l'équilibre est à observer.
- **IA** : la logique unifiée garnison / attaque n'a jamais été mesurée. Le réglage d'`AI_GARRISON_PER_TOWN` et
  d'`AI_CAP_PER_TOWN` décide si l'IA est passive ou imprudente.
- **Noms** : listes de noms de villes, de rivières et d'unités fictifs à écrire, et leur ton reste à choisir
  (consonance européenne générique ou inventée).
- **Son** : l'ambiance (barrage d'aube, convoi) reste celle de 1944. Faut-il la garder telle quelle ?
