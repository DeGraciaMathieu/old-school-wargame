import { COLS, ROWS } from '../config.js';

/* Grille d'hexagones pointe en haut, lignes impaires décalées */
export const key=(c,r)=>c+','+r, unkey=k=>k.split(',').map(Number);
export const inMap=(c,r)=>c>=0&&c<COLS&&r>=0&&r<ROWS;
export const DE=[[1,0],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1]], DO=[[1,0],[1,-1],[0,-1],[-1,0],[0,1],[1,1]];
const NB={};
export function neighbors(k){ if(NB[k])return NB[k]; const [c,r]=unkey(k); const out=[]; for(const [dc,dr] of (r&1?DO:DE)){ if(inMap(c+dc,r+dr)) out.push(key(c+dc,r+dr)); } return NB[k]=out; }
const toCube=(c,r)=>{const x=c-(r-(r&1))/2;return [x,-x-r,r];};
const fromCube=(x,y,z)=>[x+(z-(z&1))/2,z];
export function dist(a,b){const A=toCube(...unkey(a)),B=toCube(...unkey(b));return Math.max(Math.abs(A[0]-B[0]),Math.abs(A[1]-B[1]),Math.abs(A[2]-B[2]));}
function cubeRound(x,y,z){let rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);const dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;return [rx,ry,rz];}
export function hexLine(a,b){const n=dist(a,b),A=toCube(...unkey(a)),B=toCube(...unkey(b)),out=[];for(let i=0;i<=n;i++){const t=n?i/n:0;const p=cubeRound(A[0]+(B[0]-A[0])*t+1e-6,A[1]+(B[1]-A[1])*t+1e-6,A[2]+(B[2]-A[2])*t-2e-6);out.push(key(...fromCube(...p)));}return out;}
export const ek=(a,b)=>a<b?a+'|'+b:b+'|'+a;
