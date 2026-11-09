# Décisions du refactor

Rédigé par `/refactor-game`. Consigne ce que le code ne peut pas dire : pourquoi cette
organisation, pourquoi cette chaîne d'outils, ce qui n'a volontairement pas été touché, ce
qui reste à décider.

Lu par `/scaffold-claude`, qui n'a donc pas à tout redéduire.

Point de départ : un fichier unique `index.html` (1132 lignes : CSS l. 7–227, JS l. 255–1130),
commit `d77e203`.

## Archétype

Retenu : **plateau au tour par tour** (n°2).
Pourquoi : grille d'hexagones, alternance de camps et de 4 phases par tour, une action à la
fois, rendu déclenché par les événements, aucune boucle `requestAnimationFrame` permanente.
Ce qui ne colle pas :
- **L'IA est une coroutine asynchrone** rythmée par des `sleep` (90, 250, 300, 650, 1500 ms).
  C'est de l'orchestration : elle vit entièrement dans `src/loop/ai.js`.
- **La carte est procédurale mais déterministe** (mulberry32 avec la graine 1944, puis
  2 passes d'automate cellulaire). Elle est générée une fois au chargement, dans `rules/map.js`.
- **Le ravitaillement** (BFS jusqu'au bord de carte, statut `oos` qui s'aggrave sur
  plusieurs vérifications) relève plutôt de la simulation de grille. Il est traité comme
  une règle de requête plus une transition de début de phase.
- **Le son** est entièrement synthétisé (Web Audio) et utilise son propre aléa cosmétique.

## Chaîne d'outils

Branche : **zéro-build**.
Signal déterminant : aucun signal Vite. Pas de paquet npm, pas de TypeScript, pas d'asset à
bundler (seules les Google Fonts viennent d'un CDN, sans transformation), et environ 875
lignes de JS, sous le seuil de 2000.
Node : 22
Test runner : `node:test` + `node:assert/strict`, sans aucune dépendance.

## Organisation

| Module | Responsabilité | Provenance (lignes de l'`index.html` d'origine) |
| --- | --- | --- |
| `index.html` | Squelette HTML, polices, `<script type="module">` | l. 1–6, 228–254 |
| `styles.css` | Feuille de style principale (déplacée telle quelle) | l. 8–226 |
| `src/config.js` | Constantes nommées : géométrie, terrain, coûts, OOB, renforts, phases, CRT, décalages, seuils, IA, délais, clés de stockage, zoom | l. 259, 278–375, valeurs magiques éparses |
| `src/rules/hex.js` | Grille : clés, voisins, distance, lignes | l. 261–274 |
| `src/rules/map.js` | `buildMap(seed)` : forêts, villes, rivières, routes ; `eastOfOur`, `townKey` | l. 277–313 |
| `src/rules/units.js` | Camp adverse, valeurs pleines ou réduites, attaque et mouvement effectifs | l. 315, 380–384, 422–423 |
| `src/rules/movement.js` | Coût d'un pas, cases atteignables (`reach`) | l. 316, 497–516 |
| `src/rules/control.js` | Occupation, empilement, ZOC, liaisons | l. 386–402 |
| `src/rules/supply.js` | Zone et ligne de ravitaillement | l. 403–421 |
| `src/rules/victory.js` | PV, prise de ville, verdict | l. 436, 450, 491 |
| `src/rules/combat.js` | Attaquants éligibles, cibles, rapport de force, résolution pure | l. 538–600 |
| `src/rules/turn.js` | Début de phase (ravitaillement, renforts, PM), enchaînement des phases | l. 424–435, 456–487 |
| `src/rules/journal.js`, `occupation.js` | Aides internes aux transitions : journal, entrée sur une case avec prise de ville | l. 438, 450–454 |
| `src/rules/rng.js` | `createRng(seed)`, pour les tests | nouveau |
| `src/state/store.js` | `store` (état de partie + état d'interface), requêtes liées à la partie en cours, `createGame`, sauvegarde | l. 378–388, 439–448 |
| `src/render/geometry.js`, `labels.js` | Géométrie écran, libellés, échappement HTML | l. 259–273, 363, 375, 863 |
| `src/render/map.js` | SVG statique et dynamique, pions, effets, animation, zoom | l. 798–937, 1113–1114 |
| `src/render/panel.js`, `hud.js`, `sheets.js`, `index.js` | Panneau, piste, score, barre mobile, fenêtres, `render()` | l. 939–1027, 1078–1100 |
| `src/render/audio.js` | Son synthétisé | l. 685–796 |
| `src/input/` | Écouteurs : carte, boutons du panneau, fenêtres, zoom, son | l. 1029–1076, 1101–1122 |
| `src/loop/turn.js`, `orders.js`, `ai.js` | Phases et fin de partie ; déplacement, annulation, combat, avance ; IA | l. 442–535, 597–683 |
| `src/main.js` | Câblage : dés, premier affichage | l. 1123–1128 |

Écarts assumés au tableau des couches du skill `rules-extraction` :
- `render/` et `state/` importent `rules/`, pour des requêtes pures (`odds`, `canTarget`,
  `supplyPath`…). Les règles n'importent jamais de couche supérieure : vérifié, `src/rules/`
  ne contient ni `document`, ni `window`, ni `Math.random`, ni `Date.now`, ni
  `performance`, ni import de `render/`, `input/` ou `loop/`.
- `input/` importe `loop/`, `render/` et `state/`. `onHex` et `onAction` mélangent encore la
  lecture de l'événement et la décision, comme dans le prototype.
- Les modules `input/` enregistrent leurs écouteurs à l'évaluation : `main.js` les importe
  pour cet effet de bord.
- `state/` est un objet mutable partagé (`store.state`, `store.busy`, `store.undo`,
  `store.sel`, `store.zoom`), qui remplace les `let` globaux de l'IIFE.

## Règles extraites

| Règle | Module | Test | Notes |
| --- | --- | --- | --- |
| Voisins, distance, lignes d'hexagones | `rules/hex.js` | `tests/hex.test.js` | |
| Carte du scénario | `rules/map.js` | `tests/map.test.js` | Empreinte figée sur l'origine : 73 forêts, 44 arêtes de rivière, 63 de route |
| Valeurs effectives d'une unité | `rules/units.js` | `tests/units.test.js` | |
| Coût de mouvement | `rules/movement.js` | `tests/movement.test.js` | |
| Cases atteignables | `rules/movement.js` | `tests/movement.test.js` | |
| ZOC, liaisons, empilement | `rules/control.js` | `tests/control.test.js` | |
| Ravitaillement | `rules/supply.js` | `tests/supply.test.js` | |
| PV, prise de ville, verdict | `rules/victory.js` | `tests/victory.test.js` | Extrait avant le combat : un repli peut prendre une ville |
| Rapport de force, cibles | `rules/combat.js` | `tests/combat.test.js` | |
| Résolution du combat | `rules/combat.js` | `tests/combat.test.js` | `resolveCombat(state,k,ids,rng)` → `{state,captures,result}` |
| Début de phase, renforts, enchaînement | `rules/turn.js` | `tests/turn.test.js` | `beginPhase(state)` → `{state,news,captures,arrived}` |
| Générateur seedé | `rules/rng.js` | `tests/rng.test.js` | |

Les transitions (`resolveCombat`, `beginPhase`) travaillent sur un `structuredClone` de
l'état reçu et le renvoient ; l'appelant de `loop/` réaffecte `store.state` et joue les
effets (son, FX, rendu). `pushLog` et `enterHex` mutent l'état qu'on leur passe : elles ne
sont appelées que sur la copie de la transition (et `pushLog` par `store.log` sur l'état
courant).

**Non extrait (orchestration) :** le déplacement (`doMove`, `placeUnit`, `advance`,
`undoMove` dans `loop/orders.js`) mute toujours l'état en place, entrelacé avec
l'animation ; les décisions de l'IA restent dans `loop/ai.js`.

**Vérification d'équivalence :** à chaque commit, 4 parties complètes de 8 tours ont été
jouées en Chrome headless (IA contre un humain scripté qui déplace, attaque et avance), avec
`Math.random` et les timers rendus déterministes. L'état final, le journal, la carte et
67 empreintes du DOM rendu sont identiques à l'octet près au prototype d'origine, et les
captures d'écran de fin (bureau 1400×900, mobile 390×844) sont identiques au pixel près.
Ce banc d'essai est resté hors du dépôt.

## Aléa et temps

| Point d'appel | Classification | Traitement |
| --- | --- | --- |
| Jet de d6 dans `resolve` (l. 580) | porte une règle | `rng` injecté dans `resolveCombat` ; `main.js` appelle `useDice(Math.random)` |
| `mulberry(1944)` pour le terrain (l. 277) | porte une règle, déjà seedé | conservé tel quel dans `rules/map.js` |
| `Math.random` du module son (l. 698–787) | cosmétique | laissé dans `render/audio.js` |
| `performance.now()` + `requestAnimationFrame` (l. 926–934) | cosmétique | laissé dans `render/map.js` (`animatePath`) |
| `setTimeout` (FX, rythme de l'IA, ambiance) | cosmétique / orchestration | laissés dans `render/` et `loop/`, délais nommés dans `config.js` |

Graine : **aucune pour les dés**, `Math.random` est conservé. C'est le seul moyen de garder
la séquence de tirages d'origine. Le son puise dans le même `Math.random`, donc en jeu réel
la suite des dés dépend aussi des sons joués, exactement comme avant. Les tests utilisent
`createRng(seed)` ou un dé pipé.

## Laissé en l'état volontairement

Comportements qui semblent anormaux mais qui sont conservés, parce que le refactor ne doit
pas changer le jeu.

- **Code mort des poches** : `SHOW_POCKETS=false` (`config.js`), alors que `pocketsSvg()`
  (`render/map.js`) est complet mais jamais affiché.
- **Renfort perdu** : dans `rules/turn.js` (`arrive`), si aucune case libre n'est trouvée,
  l'unité est marquée `arrived` sans être placée et n'entrera jamais en jeu.
- **Annulation partielle** : `undoMove` restaure positions, PM et contrôle des villes, mais
  pas le journal. Le message « X passe aux mains des… » reste affiché après l'annulation
  d'un déplacement qui avait pris une ville.
- **Textes de seuils en dur** : « victoire allemande à partir de 5, nul à 3 ou 4 », les
  règles affichées et la légende de la barre de PV sont écrits en toutes lettres et ne
  suivent pas `VP_GERMAN_WIN` / `VP_DRAW`. Même chose pour `VP_TOTAL = 11`, qui n'est pas
  calculé depuis `TOWNS`.
- **Epsilons de `hexLine`** (`1e-6`, `-2e-6`) : rôle non documenté (lever les ambiguïtés
  d'arrondi sur les arêtes, a priori). Ils sont conservés car ils déterminent le tracé
  exact des routes.
- **Garde anti-boucle de l'IA** : `AI_COMBAT_GUARD = 30` attaques au maximum par phase.
- **Littéraux laissés en place** : les cotes en pixels du dessin SVG (`render/`), les
  paramètres de synthèse sonore (`render/audio.js`), la teinte des rapports dans la fenêtre
  « Terminer les combats ? » (`input/actions.js`), l'indice de la phase américaine dans
  « Renforts à venir » (`render/panel.js`), les distances de repli portées par les codes
  CRT eux-mêmes (`D2`, `DL2` → 2 hexagones), ainsi que les constantes d'algorithme (PRNG,
  sentinelles et epsilons de Dijkstra). Toutes les autres valeurs de règle sont dans
  `config.js`.
- **Reprise de partie** : une sauvegarde de partie terminée (`over`) n'est pas proposée
  à la reprise.

## Questions ouvertes

Décisions que le code ne tranche pas et qui n'ont pas été prises. Jamais résolues en
devinant.

- **Dés rejouables ?** Faut-il passer à `createRng(seed)` (parties rejouables, graine
  enregistrée dans la sauvegarde) au prix d'une séquence de tirages différente de l'origine ?
- **Déplacement pur ?** `doMove` / `placeUnit` / `advance` doivent-ils devenir des
  transitions pures comme le combat, avec l'animation pilotée par `loop/` ?
- **IA dans `rules/` ?** Le score des objectifs, le choix des attaquants et le champ de
  distances `field` sont extractibles en fonctions pures. C'était la tranche 12, non faite
  à la demande.
- **`input/` plus fin ?** `onHex` et `onAction` décident encore du coup à jouer. Faut-il les
  réduire à « événement → intention » et déplacer la décision dans `loop/` ?
- **Poches** : l'affichage `pocketsSvg` doit-il être activé, supprimé ou gardé en réserve ?
- **Format de sauvegarde** : la clé `le-saillant-v1` stocke l'état brut. Aucune migration
  n'est prévue si sa forme change.
- **Lint et formatage** : aucun linter ni formateur n'est configuré. Le style compact hérité
  du prototype est la seule convention. Faut-il en outiller une, et laquelle ?

## Branche `jeu/terra-incognita`

Base du nouveau jeu, à partir de `main`. Spécifications : `docs/prd/extraction-du-coeur.md`, puis
`docs/prd/terra-incognita.md`.

- Clés de stockage propres (`SAVE_KEY='terra-incognita-v1'`, `AUDIO_PREF_KEY='terra-incognita-audio'`) : les deux jeux
  servis sur `localhost` ne partagent ni sauvegarde ni préférence de son. Aucune migration depuis `le-saillant-v1`.
- `mulberry(MAP_SEED)` reste intouchable tant que le scénario du Saillant sert de référence à l'extraction ; la consigne
  tombera avec ce scénario.
- Extraction du cœur (étapes 1a à 1c) : la carte vit dans `state.map` (JSON), les terrains dans `TERRAINS`, le
  scénario dans `SAILLANT`. Écarts au PRD, faits pour garder le comportement à l'identique :
  - le contrôle initial reste calculé dans `createGame` avec `eastOf(sc.rivers[0],…)`, plutôt qu'une fonction
    `initialControl` du scénario (`config.js` ne peut pas importer `rules/`) ;
  - les objectifs de l'IA sont copiés dans l'état (`state.aiHints`), comme les renforts annoncés (`state.arrivals`),
    pour que l'IA les retrouve après une reprise de partie ;
  - l'aspect des terrains (`LOOK`, `render/map.js`) et leur effet expliqué au joueur (`TERRAIN_NOTE`, `hexBlock`)
    restent dans `render/`, indexés par terrain : ce sont du dessin et du texte, pas des règles.
- Phase 2 (Terra Incognita) : le scénario du Saillant, `buildMap` et `mulberry(MAP_SEED)` sont retirés. Les tests
  de règles tournent sur une carte posée à la main (`tests/fixtures.js`), indépendante du générateur.
- Écarts au PRD de Terra Incognita :
  - pas de nouveau tirage de la carte entière (`MAPGEN_TRIES`) : les invariants (routes reliant les deux bords,
    même total de PV par bande) sont garantis par construction ; seul le placement des villes est retenté
    (`TOWN_TRIES`) ;
  - `TOWN_LAYOUT` remplace `TOWNS_PER_SIDE`, `NEUTRAL_TOWNS`, `VP_PER_SIDE` et `VP_CENTER` ; `EXITS_PER_SIDE`
    remplace `ENTRY_MIN` ;
  - couleurs des camps nommées `--bleu` et `--rouge`, parce que `--red` sert déjà aux alertes ;
  - l'IA n'avance après combat qu'avec une unité qui n'est pas en garnison sur une ville à PV de son camp.

## Questions ouvertes de Terra Incognita

- **Équité de la carte** : la carte est aléatoire, sans miroir ni équilibrage du terrain. Sujet à part.
- **Teinte de la ZOC ennemie** : elle est rouge pendant le mouvement, quel que soit le camp. Quand on joue les
  Bleus, elle se confond avec la couleur des Rouges. À garder ou à changer ?
- **Équilibre** : valeurs de départ (ordre de bataille, PV, `VP_WIN_MARGIN`, nombre de rivières, poids de l'IA) à
  régler par des parties d'essai.
- **Son** : l'ambiance (barrage d'aube, convoi) reste celle du Saillant.
