/* ---------- Géométrie : hexagones pointe en haut, lignes impaires décalées ---------- */
export const R=28, COLS=16, ROWS=12, PAD=10;

/* ---------- Carte ---------- */
// 1944 : année de la bataille, graine du terrain procédural
export const MAP_SEED=1944;
export const FOREST_PROB=0.4, FOREST_PROB_WEST=0.2, FOREST_PROB_OUR=0.52;
export const FOREST_WEST_MAX_COL=4, FOREST_OUR_MIN_COL=8, FOREST_OUR_MAX_COL=13;
// Variante de teinte des cases dégagées (tirée dans la même séquence que les forêts)
export const CLEAR_ALT_SHADE_PROB=0.5;
export const TERRAIN_SMOOTH_PASSES=2, FOREST_GROW_MIN=4, FOREST_CLEAR_MAX=1;
export const TOWNS={
  bastogne:{c:2,r:7,name:'Bastogne',t:'city',vp:5},
  noville:{c:3,r:5,name:'Noville',t:'town',vp:0},
  houffalize:{c:3,r:1,name:'Houffalize',t:'town',vp:2},
  longvilly:{c:6,r:6,name:'Longvilly',t:'town',vp:0},
  wiltz:{c:7,r:9,name:'Wiltz',t:'town',vp:2},
  clervaux:{c:10,r:4,name:'Clervaux',t:'town',vp:1},
  marnach:{c:12,r:4,name:'Marnach',t:'town',vp:0},
  hosingen:{c:12,r:6,name:'Hosingen',t:'town',vp:1},
  dasburg:{c:14,r:3,name:'Dasburg',t:'town',vp:0},
  gemund:{c:14,r:7,name:'Gemünd',t:'town',vp:0}
};
export const RIVERS=[{name:'Our',b:[14,14,13,13,13,13,13,14,14,14,14,14]},{name:'Clerve',b:[null,null,null,10,10,9,9,9,9,9,9,9]}];
export const ROADS=[
  ['dasburg','marnach','clervaux','8,5','longvilly','bastogne','0,7'],
  ['15,3','dasburg'],
  ['15,7','gemund','hosingen','marnach'],
  ['hosingen','10,8','wiltz','4,8','bastogne'],
  ['bastogne','noville','houffalize','0,1'],
  ['clervaux','6,2','houffalize'],
  ['15,10','12,10','wiltz','7,11'],
  ['bastogne','2,11']
];
// Terrains de case : libellé, coût d'entrée en PM (mécanisés / autres), décalage du défenseur et son libellé,
// décalage des blindés attaquants (si le défenseur n'a ni blindé ni chasseur de chars), couvert (repli, IA)
export const TERRAINS={
  clear:{label:'Dégagé',cost:{mech:1,inf:1},shift:0,armorShift:+1,cover:false},
  forest:{label:'Forêt',cost:{mech:3,inf:2},shift:-1,shiftLabel:'Défenseur en forêt',armorShift:0,cover:true},
  town:{label:'Village',cost:{mech:1,inf:1},shift:-1,shiftLabel:'Défenseur dans un village',armorShift:0,cover:true},
  city:{label:'Ville',cost:{mech:1,inf:1},shift:-2,shiftLabel:'Défenseur dans la ville',armorShift:0,cover:true}
};

/* ---------- Mouvement ---------- */
export const ROAD_COST=0.5, RIVER_CROSSING_COST=2;
export const STACK_LIMIT=2;
// Liaison : deux unités amies à cette distance tiennent les cases qui les séparent
export const BOND_RANGE=2;

/* ---------- Ordre de bataille ---------- */
export const DEFAULT_STEPS=2;
export const OOB=[
  {id:'pz3',side:'de',name:'Pz.Rgt 3',div:'2. Panzer-Division',type:'arm',v:[8,5,6],rv:[4,3,6],at:'14,3'},
  {id:'pg2',side:'de',name:'PzGr 2',div:'2. Panzer-Division',type:'mech',v:[6,5,5],rv:[3,3,5],at:'15,3'},
  {id:'pg304',side:'de',name:'PzGr 304',div:'2. Panzer-Division',type:'mech',v:[6,5,5],rv:[3,3,5],at:'15,2'},
  {id:'gr77',side:'de',name:'GR 77',div:'26. Volksgrenadier-Division',type:'inf',v:[5,4,4],rv:[3,2,4],at:'14,6'},
  {id:'gr78',side:'de',name:'GR 78',div:'26. Volksgrenadier-Division',type:'inf',v:[5,4,4],rv:[3,2,4],at:'14,7'},
  {id:'gr39',side:'de',name:'GR 39',div:'26. Volksgrenadier-Division',type:'inf',v:[5,4,4],rv:[3,2,4],at:'15,6'},
  {id:'fj13',side:'de',name:'FJR 13',div:'5. Fallschirmjäger-Division',type:'ab',v:[4,4,4],rv:[2,2,4],at:'14,9'},
  {id:'fj14',side:'de',name:'FJR 14',div:'5. Fallschirmjäger-Division',type:'ab',v:[4,4,4],rv:[2,2,4],at:'14,11'},
  {id:'fj15',side:'de',name:'FJR 15',div:'5. Fallschirmjäger-Division',type:'ab',v:[4,4,4],rv:[2,2,4],at:'15,10'},
  {id:'pl130',side:'de',name:'Pz.Lehr 130',div:'Panzer-Lehr-Division',type:'arm',v:[8,5,6],rv:[4,3,6],turn:2,entry:['15,7','15,8','15,6']},
  {id:'pl901',side:'de',name:'PzGr 901',div:'Panzer-Lehr-Division',type:'mech',v:[6,5,5],rv:[3,3,5],turn:2,entry:['15,8','15,7','15,9']},
  {id:'pl902',side:'de',name:'PzGr 902',div:'Panzer-Lehr-Division',type:'mech',v:[6,5,5],rv:[3,3,5],turn:2,entry:['15,9','15,8','15,7']},

  {id:'i1',side:'us',name:'1/110',div:'28th Infantry Division',type:'inf',v:[2,3,4],rv:[1,2,4],at:'10,4'},
  {id:'i2',side:'us',name:'2/110',div:'28th Infantry Division',type:'inf',v:[2,3,4],rv:[1,2,4],at:'11,8'},
  {id:'i3',side:'us',name:'3/110',div:'28th Infantry Division',type:'inf',v:[2,3,4],rv:[1,2,4],at:'12,6'},
  {id:'i112',side:'us',name:'112 Inf',div:'28th Infantry Division',type:'inf',v:[3,3,4],rv:[2,2,4],at:'12,1'},
  {id:'i109',side:'us',name:'109 Inf',div:'28th Infantry Division',type:'inf',v:[3,3,4],rv:[2,2,4],at:'12,11'},
  {id:'tk707',side:'us',name:'707 Tk',div:'707th Tank Battalion',type:'arm',v:[3,2,6],rv:[2,1,6],at:'7,9'},
  {id:'en44',side:'us',name:'44 Eng',div:'44th Engineer Combat Bn',type:'eng',v:[1,2,4],rv:[1,2,4],steps:1,at:'7,9'},
  {id:'rose',side:'us',name:'TF Rose',div:'CCR, 9th Armored Division',type:'arm',v:[3,3,7],rv:[2,2,7],turn:2,entry:['4,7','5,6','3,7']},
  {id:'harper',side:'us',name:'TF Harper',div:'CCR, 9th Armored Division',type:'arm',v:[3,3,7],rv:[2,2,7],turn:2,entry:['4,7','5,6','3,7']},
  {id:'desobry',side:'us',name:'Tm Desobry',div:'CCB, 10th Armored Division',type:'arm',v:[3,3,7],rv:[2,2,7],turn:5,entry:['2,7','1,7','2,8','1,6']},
  {id:'ohara',side:'us',name:"Tm O'Hara",div:'CCB, 10th Armored Division',type:'arm',v:[3,3,7],rv:[2,2,7],turn:5,entry:['2,7','1,7','2,8','1,6']},
  {id:'cherry',side:'us',name:'Tm Cherry',div:'CCB, 10th Armored Division',type:'arm',v:[3,3,7],rv:[2,2,7],turn:5,entry:['2,7','1,7','2,8','1,6']},
  {id:'p501',side:'us',name:'501 PIR',div:'101st Airborne Division',type:'ab',v:[3,5,4],rv:[2,3,4],turn:7,entry:['0,7','0,6','0,8','1,8','1,6']},
  {id:'p506',side:'us',name:'506 PIR',div:'101st Airborne Division',type:'ab',v:[3,5,4],rv:[2,3,4],turn:7,entry:['0,7','0,6','0,8','1,8','1,6']},
  {id:'p502',side:'us',name:'502 PIR',div:'101st Airborne Division',type:'ab',v:[3,5,4],rv:[2,3,4],turn:7,entry:['0,7','0,6','0,8','1,8','1,6']},
  {id:'g327',side:'us',name:'327 GIR',div:'101st Airborne Division',type:'ab',v:[3,5,4],rv:[2,3,4],turn:7,entry:['0,7','0,6','0,8','1,8','1,6']},
  {id:'td705',side:'us',name:'705 TD',div:'705th Tank Destroyer Bn',type:'td',v:[3,2,6],rv:[2,1,6],turn:7,entry:['0,7','0,6','0,8','1,8','1,6']}
];
export const ARRIVALS=[
  {turn:2,side:'de',text:'Panzer-Lehr (3 unités), bord est'},
  {turn:2,side:'us',text:'CCR / 9th Armored (2 unités), à l\'est de Bastogne'},
  {turn:5,side:'us',text:'CCB / 10th Armored (3 unités), Bastogne'},
  {turn:7,side:'us',text:'101st Airborne et 705 TD (5 unités), bord ouest'}
];

/* ---------- Tours ---------- */
export const PHASES=[{side:'de',kind:'move',label:'Mouvement allemand'},{side:'de',kind:'combat',label:'Combats allemands'},{side:'us',kind:'move',label:'Mouvement américain'},{side:'us',kind:'combat',label:'Combats américains'}];
export const SIDE={de:'Allemands',us:'Américains'};
export const TURNS=8;
export const FIRST_DAY=16, TURNS_PER_DAY=2;

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
export const VP_GERMAN_WIN=5, VP_DRAW=3, VP_TOTAL=11;

/* ---------- IA ---------- */
export const AI_US_SLOTS=[['bastogne',2],['wiltz',1],['houffalize',1],['noville',1],['longvilly',1],['clervaux',1],['hosingen',1]];
export const AI_DE_CAP_BASTOGNE=6, AI_DE_CAP_OTHER=3, AI_DE_VP_WEIGHT=1.2;
export const AI_COMBAT_GUARD=30;
// Déplacement : malus de terrain couvert pour les Américains, poids de la ZOC ennemie, gain minimal pour bouger
export const AI_US_COVER_BONUS=-0.4, AI_ZOC_WEIGHT_DE=-0.2, AI_ZOC_WEIGHT_US=0.6, AI_MOVE_MIN_GAIN=0.01;
// Combat (indices de colonne de la CRT) : à partir de 5:1 on retire des attaquants tant que le rapport reste à 4:1
export const AI_PRUNE_FROM_COL=6, AI_PRUNE_KEEP_COL=5;
// Colonne minimale pour attaquer : Allemands contre une ville à PV / ailleurs ; Américains pour reprendre une ville / ailleurs
export const AI_MIN_COL_DE_VP=2, AI_MIN_COL_DE=3, AI_MIN_COL_US_RETAKE=3, AI_MIN_COL_US=4;
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

/* ---------- Scénario ---------- */
// Le Saillant : carte (graine, villes, rivières, routes), ordre de bataille, renforts, premier message du journal,
// objectifs de l'IA (garnisons américaines, ville principale et plafond d'attaquants allemands sur elle)
export const SAILLANT={seed:MAP_SEED,towns:TOWNS,rivers:RIVERS,roads:ROADS,oob:OOB,arrivals:ARRIVALS,
  intro:'16 décembre, 5 h 30 : l\'artillerie allemande ouvre le feu sur la ligne de la 28th Division.',
  ai:{slots:AI_US_SLOTS,main:'bastogne',mainCap:AI_DE_CAP_BASTOGNE}};
