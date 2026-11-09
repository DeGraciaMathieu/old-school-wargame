# PRD — Extraction du cœur du jeu

Branche `jeu/terra-incognita`. Phases 0 et 1 du plan « Terra Incognita ». Suite : `docs/prd/terra-incognita.md`.

## Objectif
Rendre le moteur du Saillant indépendant de sa carte et de son scénario, **sans aucun changement visible pour le
joueur**, pour qu'une carte générée à chaque partie puisse ensuite le remplacer. Au terme de cette étape, le jeu reste
exactement « Le Saillant », règles, IA, rendu et textes compris.

## Socle technique

- **La carte est un singleton de module.** `src/rules/map.js` exporte `HEX`, `riverEdge` (`Map`), `roadEdges` (`Set`)
  et `roadChains`, calculés une fois au chargement par `buildMap(MAP_SEED)`, ainsi que `townKey` et `eastOfOur`.
  Ils sont importés directement par :
  - les règles : `rules/movement.js` (`stepCost`), `rules/combat.js` (`odds`, `retreatUnit`, texte du résultat),
    `rules/supply.js` (`supCross`), `rules/victory.js` (`townTakenBy`) ;
  - l'état : `state/store.js` (`createGame`, contrôle initial des villes par `eastOfOur`) ;
  - le rendu : `render/geometry.js` (`POLY`), `render/map.js` (fond SVG, rivières, ponts, villes), `render/panel.js`
    (`hexBlock`, `combatBlock`), `render/hud.js` (`renderAct`) ;
  - les entrées et la boucle : `input/actions.js`, `loop/ai.js` (`field`, objectifs, couvert), `loop/orders.js`.
- **Les données du scénario sont dans `src/config.js`** et sont lues directement par les modules : `TOWNS` (règles,
  rendu, IA, journal), `RIVERS`, `ROADS`, `OOB` (`createGame`), `ARRIVALS` (`rules/turn.js`, `render/hud.js`,
  `render/panel.js`), `AI_US_SLOTS` et la cible de repli `'bastogne'` (`loop/ai.js`).
- **Les terrains sont testés par leur nom.** `stepCost` teste `'forest'`. `odds` empile `SHIFT_FOREST`, `SHIFT_TOWN`,
  `SHIFT_CITY` et `SHIFT_ARMOR_CLEAR` selon `t`. `retreatUnit` (`RETREAT_COVER_BONUS`) et `aiMove`
  (`AI_US_COVER_BONUS`) testent `t!=='clear'`. Les libellés viennent de `TERRAIN`.
- **La taille de la grille reste fixe** (`COLS=16`, `ROWS=12`) : `rules/hex.js` (`inMap`, cache `NB`), `rules/supply.js`
  (bords) et `render/geometry.js` (`SVGW`, `SVGH`) peuvent continuer à lire `config.js`.
- **Sauvegarde** : `SAVE_KEY='le-saillant-v1'` et `AUDIO_PREF_KEY='le-saillant-audio'`, état brut sérialisé par
  `save()`. Les deux jeux sont servis sur la même origine `localhost` par `npm run dev`.
- **Tests concernés** : `tests/map.test.js` (empreinte : 73 forêts, 44 arêtes de rivière, 63 de route),
  `movement`, `combat`, `supply`, `victory`, `turn`. Leurs fabriques d'état ne portent pas de carte.
- **Le POC `poc/carte-aleatoire`** (`7b7d5a0`) a gardé le singleton, en le rendant réassignable par `useMap(seed)`.
  Ce choix n'est pas repris : une règle doit lire la carte dans l'état reçu, pas dans une variable de module.

## Comportement

Aucune règle ne change. Les étapes sont livrées dans l'ordre, une par commit, chacune avec `npm test` au vert.

### Phase 0 — Branche et clés de stockage
- `SAVE_KEY='terra-incognita-v1'`, `AUDIO_PREF_KEY='terra-incognita-audio'`. Une sauvegarde du Saillant n'est donc
  jamais relue par ce jeu, et inversement. Aucune migration n'est nécessaire.
- Le titre, l'écran de départ et les textes restent ceux du Saillant jusqu'à la phase 2.

### 1a — La carte devient une donnée de la partie
- `buildMap(seed, layout)` renvoie un objet JSON simple, sérialisable tel quel :
  `{hex:{'c,r':{c,r,k,t,alt,town?}}, rivers:{'a|b':nom}, roads:{'a|b':true}, roadChains:[[k…]], towns:{id:{c,r,name,t,vp}}}`.
  `riverEdge` et `roadEdges` cessent d'être une `Map` et un `Set`.
- `createGame` place cette carte dans `state.map`. L'état devient
  `{mode, turn, phase, control, attacked, log, over, units, map}`.
- Toute règle qui consultait la carte la lit dans `state.map`. Les fonctions sans `state` le reçoivent :
  `stepCost(map,a,b,mech)` et `townTakenBy(state,side,k)` lit `state.map`. Les modules `render/`, `input/` et `loop/`
  lisent `store.state.map`.
- `townKey(map,id)` et `eastOfOur(map,k)` deviennent des requêtes sur une carte donnée.
- Le cache `fieldCache` de l'IA est vidé à chaque nouvelle partie, comme aujourd'hui (`input/controls.js`).
- `rules/map.js` n'exporte plus de carte calculée au chargement. `mulberry(MAP_SEED)` est conservé tel quel : la carte
  du Saillant reste identique à la case près.

### 1b — Table des terrains
- `TERRAIN`, `CLEAR_COST`, `FOREST_COST_MECH`, `FOREST_COST_INF`, `SHIFT_FOREST`, `SHIFT_TOWN`, `SHIFT_CITY` et
  `SHIFT_ARMOR_CLEAR` sont remplacés par une table `TERRAINS` dans `config.js` :

  | Clé | `label` | `cost.mech` | `cost.inf` | `shift` | `armorShift` | `cover` |
  | --- | --- | --- | --- | --- | --- | --- |
  | `clear` | Dégagé | 1 | 1 | 0 | +1 | non |
  | `forest` | Forêt | 3 | 2 | −1 | 0 | oui |
  | `town` | Village | 1 | 1 | −1 | 0 | oui |
  | `city` | Ville | 1 | 1 | −2 | 0 | oui |

  Le libellé du décalage (« Défenseur en forêt »…) est aussi porté par la table (`shiftLabel`).
- `ROAD_COST`, `RIVER_CROSSING_COST` et `SHIFT_RIVER` restent des constantes à part : la route et la rivière sont
  des propriétés d'arête, pas de case.
- `stepCost`, `odds`, `retreatUnit`, `aiMove` et les libellés (`panel.js`, `actions.js`, `combat.js`) lisent la table.
  Plus aucun module ne teste un nom de terrain en dur.
- `armorShift` garde exactement la condition actuelle : au moins une unité `arm` en attaque, aucun `arm` ni `td` en
  défense.

### 1c — Le scénario devient un objet
- Les données propres au Saillant sont regroupées dans un objet `SAILLANT` de `config.js` :
  `{towns, rivers, roads, oob, arrivals, initialControl, introLog}`. `initialControl(map)` reprend la règle actuelle :
  à l'est de l'Our → `'de'`, sinon `'us'`.
- `createGame(mode, scenario)` construit la carte, l'ordre de bataille, le contrôle initial et le premier message du
  journal à partir du scénario reçu.
- `ARRIVALS` est lu depuis le scénario par `beginPhase` (via l'état) et par le rendu. Pour que `rules/turn.js`
  reste pur, l'état garde le texte des arrivées : `state.arrivals`.
- Les constantes d'IA propres à la carte (`AI_US_SLOTS`, `AI_DE_CAP_BASTOGNE`, la cible `'bastogne'`) sont rangées
  dans le scénario (`scenario.ai`).
- Restent dans `config.js` hors scénario : géométrie, CRT et décalages, empilement, liaisons, ravitaillement, seuils
  de victoire, poids génériques de l'IA, délais, interface.

## Hors périmètre
- Tout changement de règle, de texte affiché, de rendu ou d'équilibre.
- Le générateur de cartes, les camps fictifs et la victoire symétrique (`docs/prd/terra-incognita.md`).
- Le passage des camps `'de'`/`'us'` à d'autres identifiants.
- Les questions ouvertes déjà listées dans `docs/decisions.md` (dés rejouables, déplacement pur, IA dans `rules/`…).

## Impact par couche
- `config.js` : nouvelles `SAVE_KEY` et `AUDIO_PREF_KEY` ; `TERRAINS` remplace 8 constantes ; `TOWNS`, `RIVERS`,
  `ROADS`, `OOB`, `ARRIVALS`, `AI_US_SLOTS`, `AI_DE_CAP_BASTOGNE` passent dans `SAILLANT`.
- `rules/` : `map.js` (plus de carte au chargement, carte JSON, `townKey`/`eastOfOur` paramétrés) ; `movement.js`,
  `combat.js`, `supply.js` et `victory.js` lisent `state.map` et `TERRAINS` ; `turn.js` lit `state.arrivals` ;
  `journal.js` lit les villes dans `state.map`.
- `state/` : `createGame(mode, scenario)` ; l'état porte `map` et `arrivals`.
- `render/` : `geometry.js` calcule `POLY` sur la grille `COLS×ROWS` au lieu de `HEX` ; `map.js`, `panel.js`,
  `hud.js` lisent `store.state.map` ; aucun texte de règle ne change.
- `input/` : `actions.js` lit le nom des cases dans `store.state.map` ; `controls.js` passe le scénario à `newGame`.
- `loop/` : `ai.js` lit la carte et `scenario.ai` ; `orders.js` lit les villes dans la carte ; `turn.js` transmet le
  scénario.
- Sauvegarde : nouvelle clé `terra-incognita-v1`, l'état sauvegardé contient la carte (environ 200 cases). Pas de
  migration : aucune sauvegarde de cette clé n'existe encore.

## Critères d'acceptation
- `npm test` passe à chaque commit.
- Les assertions des tests existants sont inchangées : seules les fabriques d'état reçoivent `map` (et `arrivals`).
- L'empreinte de la carte du Saillant est identique : 73 forêts, 44 arêtes de rivière, 63 de route.
- `grep` ne trouve plus d'import de `HEX`, `riverEdge`, `roadEdges` ou `roadChains` hors de `rules/map.js`.
- `grep` ne trouve plus de `'forest'`, `'clear'`, `'town'` ni `'city'` comparés en dur hors de `TERRAINS` et du
  générateur de carte.
- `grep` ne trouve plus `TOWNS`, `OOB`, `ARRIVALS` ni `AI_US_SLOTS` importés hors de `config.js` et `state/store.js`.
- `JSON.parse(JSON.stringify(state))` redonne un état équivalent, carte comprise.
- Une partie jouée à la main contre l'IA allemande puis contre l'IA américaine se déroule comme sur `main` : même
  carte, mêmes textes, mêmes renforts.
- Une sauvegarde `le-saillant-v1` présente dans le navigateur n'est pas proposée à la reprise.

## Tests
- `tests/map.test.js` :
  - « la carte du scénario est toujours la même (graine 1944) » (adapté à la carte JSON) ;
  - « la carte se sérialise en JSON sans perte ».
- `tests/movement.test.js` : « le coût d'un pas se lit dans la table des terrains ».
- `tests/combat.test.js` : « les décalages de terrain se lisent dans la table des terrains ».
- `tests/turn.test.js` : « une partie neuve porte sa carte et ses renforts dans l'état ».
- Les autres tests existants, avec des fabriques d'état complétées par la carte du Saillant.

## Risques et questions ouvertes
- **Coût du `structuredClone`** : la carte est copiée à chaque transition. C'est négligeable a priori (environ
  200 cases), à vérifier sur mobile.
- **Ordre d'itération** : le rendu et l'IA parcourent `HEX` et `TOWNS` avec `for…in`. La carte JSON doit garder le
  même ordre de clés, sinon l'IA peut départager différemment à score égal.
- **Écart avec `docs/decisions.md`** : la note « ne pas remplacer `mulberry(MAP_SEED)` » ne vaut plus que pour le
  scénario du Saillant sur cette branche. À consigner dans `docs/decisions.md` au premier commit.
