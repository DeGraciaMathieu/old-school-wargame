/* ---------- Géométrie : hexagones pointe en haut, lignes impaires décalées ---------- */
export const R=28, COLS=16, ROWS=12, PAD=10;

/* ---------- Carte ---------- */
export const FOREST_PROB=0.4;
// Variante de teinte des cases dégagées (tirée dans la même séquence que les forêts)
export const CLEAR_ALT_SHADE_PROB=0.5;
export const TERRAIN_SMOOTH_PASSES=2, FOREST_GROW_MIN=4, FOREST_CLEAR_MAX=1;

// Terrains de case : libellé, coût d'entrée en PM (mécanisés / autres), décalage du défenseur et son libellé,
// décalage des blindés attaquants (si le défenseur n'a ni blindé ni chasseur de chars), couvert (repli, IA)
export const TERRAINS={
  clear:{label:'Dégagé',cost:{mech:1,inf:1},shift:0,armorShift:+1,cover:false},
  forest:{label:'Forêt',cost:{mech:3,inf:2},shift:-1,shiftLabel:'Défenseur en forêt',armorShift:0,cover:true},
  mountain:{label:'Montagne',cost:{mech:4,inf:3},shift:-2,shiftLabel:'Défenseur en montagne',armorShift:0,cover:true},
  town:{label:'Village',cost:{mech:1,inf:1},shift:-1,shiftLabel:'Défenseur dans un village',armorShift:0,cover:true},
  city:{label:'Ville',cost:{mech:1,inf:1},shift:-2,shiftLabel:'Défenseur dans la ville',armorShift:0,cover:true}
};

/* ---------- Carte générée ---------- */
// Bandes de colonnes : ouest 0 à ZONE_WEST_MAX_COL, centre, est ZONE_EAST_MIN_COL à COLS-1
export const ZONE_WEST_MAX_COL=4, ZONE_EAST_MIN_COL=11;
// Rivières : nombre tiré entre RIVER_MIN et RIVER_MAX ; colonnes (nord-sud) ou lignes (est-ouest) où passe la rive
export const RIVER_MIN=1, RIVER_MAX=2, RIVER_NS_COLS=[3,13], RIVER_EW_ROWS=[2,10];
// Montagnes : nombre de massifs tiré entre MOUNTAIN_MIN et MOUNTAIN_MAX, chacun de MOUNTAIN_SIZE cases contiguës,
// dans la bande centrale et jamais sur une ville
export const MOUNTAIN_MIN=2, MOUNTAIN_MAX=3, MOUNTAIN_SIZE=[3,5];
export const RIVER_NAMES=['Sarne','Lisance','Orvane','Mézère','Ardoise','Vaudre'];
// Villes de chaque bande latérale (identiques à l'ouest et à l'est) et de la bande centrale, neutre au départ
export const TOWN_LAYOUT={side:[{t:'town',vp:2},{t:'town',vp:1},{t:'town',vp:0}],center:[{t:'city',vp:3},{t:'town',vp:1},{t:'town',vp:1}]};
// Écart minimal entre deux villes, tirages avant d'abandonner, villes reliées à leur bord par une route
export const TOWN_MIN_DIST=3, TOWN_TRIES=50, EXITS_PER_SIDE=2;
export const TOWN_NAMES=['Valbrune','Hautrive','Morlanne','Brévannes','Ostrand','Kellmarch','Lorvic','Sarnac','Vescourt','Altheim','Dornay','Roquelin','Faverge','Grisbach','Montaval','Tiercelin'];

/* ---------- Mouvement ---------- */
export const ROAD_COST=1, RIVER_CROSSING_COST=2;
export const STACK_LIMIT=2;
// Liaison : deux unités amies à cette distance tiennent les cases qui les séparent
export const BOND_RANGE=2;

/* ---------- Ordre de bataille ---------- */
export const DEFAULT_STEPS=2;
// Modèle commun aux deux camps : [attaque, défense, mouvement] pleines (v) et réduites (rv), tour d'arrivée des renforts
export const OOB_TEMPLATE=[
  {type:'arm',v:[6,4,6],rv:[3,2,6]},{type:'arm',v:[6,4,6],rv:[3,2,6]},
  {type:'mech',v:[5,4,5],rv:[3,2,5]},{type:'mech',v:[5,4,5],rv:[3,2,5]},
  {type:'inf',v:[4,4,4],rv:[2,2,4]},{type:'inf',v:[4,4,4],rv:[2,2,4]},{type:'inf',v:[4,4,4],rv:[2,2,4]},
  {type:'arm',v:[6,4,6],rv:[3,2,6],turn:3},{type:'mech',v:[5,4,5],rv:[3,2,5],turn:3},
  {type:'td',v:[3,2,6],rv:[2,1,6],turn:6}
];
// Types d'unité : abréviation sur le pion, nom au singulier et au pluriel (annonces de renforts)
export const UNIT_TYPES={arm:{abbr:'Bld',one:'blindé',many:'blindés'},mech:{abbr:'Méca',one:'mécanisé',many:'mécanisés'},
  inf:{abbr:'Inf',one:'bataillon d\'infanterie',many:'bataillons d\'infanterie'},
  td:{abbr:'CC',one:'chasseur de chars',many:'chasseurs de chars'}};
// Garnisons de départ : types placés d'abord dans les villes à PV de leur camp
export const GARRISON_TYPES=['inf'];

/* ---------- Tours ---------- */
// Chaque tour : mouvement puis combats d'un camp, puis de l'autre ; INITIATIVE[0] ouvre les tours impairs
export const PHASE_COUNT=4, INITIATIVE=['blue','red'];
export const SIDE={blue:'Bleus',red:'Rouges'};
export const PHASE_LABELS={blue:{move:'Mouvement bleu',combat:'Combats bleus'},red:{move:'Mouvement rouge',combat:'Combats rouges'}};
// Bord de chaque camp : ravitaillement, renforts, sens du repli
export const HOME={blue:'west',red:'east'};
export const ARMY={blue:'Armée bleue',red:'Armée rouge'};
export const TURNS=8, TURNS_PER_DAY=2;
// Graine de carte tirée entre 1 et SEED_MAX
export const SEED_MAX=999999;

/* ---------- Combat ---------- */
export const COLL=['1:2','1:1','3:2','2:1','3:1','4:1','5:1','6:1'], TH=[0.5,1,1.5,2,3,4,5,6];
export const CRT=[
  ['A1','A1','A1','NE','NE','D1'],
  ['A1','A1','NE','NE','D1','EX'],
  ['A1','NE','NE','D1','EX','D2'],
  ['A1','NE','D1','EX','D2','DL'],
  ['NE','D1','EX','D2','DL','DL2'],
  ['D1','EX','D2','DL','DL2','DE'],
  ['EX','D2','DL','DL2','DE','DE'],
  ['D2','DL','DL2','DE','DE','DE']];
export const RES={A1:'L\'attaquant perd 1 pas',NE:'Sans effet',D1:'Le défenseur recule d\'1 hexagone',D2:'Le défenseur recule de 2 hexagones',EX:'Échange : chaque camp perd 1 pas',DL:'Le défenseur perd 1 pas et recule d\'1 hexagone',DL2:'Le défenseur perd 1 pas et recule de 2 hexagones',DE:'Le défenseur est éliminé'};
export const DIE_SIDES=6;
// Choix de la case de repli : éviter une ZOC ennemie non tenue, s'éloigner des attaquants, préférer le couvert
export const RETREAT_ZOC_PENALTY=-100, RETREAT_DIST_WEIGHT=10, RETREAT_COVER_BONUS=0.5;
export const SHIFT_RIVER=-1;

/* ---------- Ravitaillement ---------- */
export const OOS_CUT=1, OOS_ISOLATED=2;
// Coupée : attaque divisée ; isolée : mouvement divisé aussi
export const OOS_ATK_DIVISOR=2, OOS_MP_DIVISOR=2;

/* ---------- Victoire ---------- */
// Écart de PV minimal pour gagner ; en deçà, match nul
export const VP_WIN_MARGIN=2;

/* ---------- IA ---------- */
// Mouvement : garnisons par ville à PV tenue, plafond d'attaquants par ville visée, poids des PV dans le choix d'objectif
export const AI_GARRISON_PER_TOWN=1, AI_CAP_PER_TOWN=3, AI_VP_WEIGHT=1.2;
export const AI_COMBAT_GUARD=30;
// Score de case : bonus de couvert pour une garnison, poids de la ZOC ennemie (attaquant / garnison), gain minimal pour bouger
export const AI_COVER_BONUS=-0.4, AI_ZOC_WEIGHT_ATTACK=-0.2, AI_ZOC_WEIGHT_HOLD=0.6, AI_MOVE_MIN_GAIN=0.01;
// Combat (indices de colonne de la CRT) : à partir de 5:1 on retire des attaquants tant que le rapport reste à 4:1
export const AI_PRUNE_FROM_COL=6, AI_PRUNE_KEEP_COL=5;
// Colonne minimale pour attaquer : contre une ville à PV qu'on ne tient pas / ailleurs
export const AI_MIN_COL_VP=2, AI_MIN_COL=3;
export const AI_COMBAT_COL_WEIGHT=2;

/* ---------- Rythme (ms) ---------- */
export const AI_START_DELAY=450, AI_END_PHASE_DELAY=300, AI_MOVE_PAUSE=90, AI_TARGET_PAUSE=650, AI_RESULT_PAUSE=1500, AI_ADVANCE_PAUSE=250;
export const SUPPLY_FX_DELAY=350, SUPPLY_FX_STAGGER=180, CAPTURE_FX_DELAY=120, IMPACT_DELAY=550;
// Son (secondes) : décalage du barrage d'aube, du convoi de renforts au premier mouvement et aux suivants
export const AUDIO_BARRAGE_DELAY=0.7, AUDIO_CONVOY_DELAY_DAWN=2.6, AUDIO_CONVOY_DELAY=0.9;
export const FX_LIFETIME=1800, BLAST_LIFETIME=900, MOVE_MS_PER_HEX=140, MOVE_ANIM_FALLBACK=400;

/* ---------- Interface ---------- */
export const SAVE_KEY='terra-incognita-v1', AUDIO_PREF_KEY='terra-incognita-audio';
export const LOG_MAX=80;
export const END_COMBAT_LIST_MAX=6;
export const ZOOM_MIN=0.6, ZOOM_MAX=2.2, ZOOM_STEP=1.18, ZOOM_INIT_MIN=0.85, ZOOM_INIT_MAX=1.5;
export const MOBILE_MAX_WIDTH=900;
export const SHOW_POCKETS=false; // contours de poche désactivés pour l'instant
