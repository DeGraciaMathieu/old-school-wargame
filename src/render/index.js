import { renderAct, renderScore, renderTrack } from './hud.js';
import { renderMap } from './map.js';
import { renderPanel } from './panel.js';
import { store } from '../state/store.js';

export function render(){if(!store.state)return;renderTrack();renderMap();renderScore();renderAct();renderPanel();}
