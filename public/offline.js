/* Compatibility endpoint for retired quiz/offline routes.
 * No questions are fetched, cached, rendered, played or awarded from here.
 * Existing device preferences/cache/history are deliberately not deleted.
 */
import {retiredGameHTML} from './game-availability.js?v=games-royal-1';
const KEY='qa_offline_v1';
export const CHARS=Object.freeze([]);
export const SYMBOLS=Object.freeze([]);
export const KINDS=Object.freeze([]);
export const ACTION_NAMES=Object.freeze([]);
export function loadCfg(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};}catch{return {};}}
export const O={cfg:loadCfg(),screen:'retired',game:null,error:'هالألعاب انحذفت من المنصة.',loading:false,timer:0,daily:null,challenge:null};
export function leave(){if(O.timer)clearInterval(O.timer);O.timer=0;O.game=null;O.loading=false;O.daily=null;O.challenge=null;O.screen='retired';}
function unavailable(rerender){leave();O.error='هالألعاب انحذفت من المنصة.';if(typeof rerender==='function')rerender();return false;}
export function buildPlayers(){return [];}
export function offlineHTML(){return retiredGameHTML();}
export async function start(rerender){return unavailable(rerender);}
export async function startDaily(name,rerender){return unavailable(rerender);}
export async function startChallenge(seed,from,fromOk,name,rerender){return unavailable(rerender);}
export async function quickPlay(name,rerender){return unavailable(rerender);}
export const newSeed=()=>globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,8)||'';
export function handle(name,el,rerender){return unavailable(rerender);}
export function onInput(){return false;}
export function challengeLink(){return '';}
export async function shareImage(){return false;}
export async function sendChallenge(){return false;}
export async function shareResult(){return false;}
