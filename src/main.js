import { MOBILE_MAX_WIDTH, SAILLANT, ZOOM_INIT_MAX, ZOOM_INIT_MIN } from './config.js';
import { buildMap } from './rules/map.js';
import { syncSound } from './input/controls.js';
import { SVGW } from './render/geometry.js';
import { applyZoom, drawStatic, scroller } from './render/map.js';
import { startScreen } from './render/sheets.js';
import { store } from './state/store.js';
import { useDice } from './loop/orders.js';
import './input/map.js';
import './input/actions.js';

// Dés de combat : Math.random conservé pour garder la séquence de tirages d'origine
useDice(Math.random);
syncSound();
// Carte du scénario affichée derrière l'écran de départ ; chaque partie redessine la sienne
drawStatic(buildMap(SAILLANT));
store.zoom=Math.max(ZOOM_INIT_MIN,Math.min(ZOOM_INIT_MAX,(scroller.clientWidth-2)/SVGW));applyZoom();
if(innerWidth<MOBILE_MAX_WIDTH)scroller.scrollLeft=scroller.scrollWidth;
startScreen();
