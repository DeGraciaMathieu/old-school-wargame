import { ROAD_COST, FOREST_COST_MECH, FOREST_COST_INF, CLEAR_COST, RIVER_CROSSING_COST } from '../config.js';
import { ek } from './hex.js';
import { HEX, riverEdge, roadEdges } from './map.js';

// Coût en PM pour passer de a à b : route ½, forêt 2 (3 mécanisés), rivière hors pont +2
export function stepCost(a,b,mech){if(roadEdges.has(ek(a,b)))return ROAD_COST;let c=HEX[b].t==='forest'?(mech?FOREST_COST_MECH:FOREST_COST_INF):CLEAR_COST;if(riverEdge.has(ek(a,b)))c+=RIVER_CROSSING_COST;return c;}
