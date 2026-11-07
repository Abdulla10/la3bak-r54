import type { SocialModeId, SocialModeModule, SocialCard } from '../social-mode-contract.js';
import { SOCIAL_GAME_IDS, type SocialModeContext } from '../social-mode-contract.js';
import { tableMode, tableCards } from './table.js';
import { anonymousMode, anonymousCards } from './anonymous.js';
import { topicsMode, topicsCards } from './topics.js';
import { understandMode, understandCards } from './understand.js';
import { quietMode, quietCards } from './quiet.js';
import { hotseatMode, hotseatCards } from './hotseat.js';
import { drawStoryMode, drawStoryCards, validDrawStoryStateR47, advanceDrawStoryR47 } from './game-draw-r47.js';
import { wordGuessMode, validWordGuessStateR47, advanceWordGuessR47 } from './game-word-r47.js';
import { memoryChallengeMode, validMemoryChallengeStateR47, advanceMemoryChallengeR47 } from './game-memory-r47.js';
export const SOCIAL_MODES: Record<SocialModeId, SocialModeModule> = {
 table:tableMode,anonymous:anonymousMode,topics:topicsMode,understand:understandMode,quiet:quietMode,hotseat:hotseatMode,
 'draw-story':drawStoryMode,'word-guess':wordGuessMode,'memory-challenge':memoryChallengeMode,
};
export const SOCIAL_DEFAULT_CARDS:SocialCard[]=[...tableCards,...anonymousCards,...topicsCards,...understandCards,...quietCards,...hotseatCards,...drawStoryCards];
export {tableMode,anonymousMode,topicsMode,understandMode,quietMode,hotseatMode,drawStoryMode,wordGuessMode,memoryChallengeMode};
const obj=(x:unknown):x is Record<string,any>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const only=(x:Record<string,any>,names:string[])=>Object.keys(x).every(k=>names.includes(k));
const id=(x:unknown)=>typeof x==='string'&&x.length>0&&x.length<=200&&!/[\s\u0000-\u001f\u007f]/.test(x);
const string=(x:unknown,max=1000)=>typeof x==='string'&&x.length<=max;
const integer=(x:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=min&&x<=max;
const nullableId=(x:unknown)=>x===null||id(x);
const time=(x:unknown)=>integer(x);
const arr=(x:unknown,max:number,check:(x:any)=>boolean):x is any[]=>Array.isArray(x)&&x.length<=max&&x.every(check);
const ids=(x:unknown,max=200)=>arr(x,max,id)&&new Set(x).size===x.length;
const card=(x:unknown)=>obj(x)&&only(x,['id','mode','category','text','options','enabled'])&&id(x.id)&&string(x.category,100)&&string(x.text,1000)&&typeof x.enabled==='boolean'&&['table','anonymous','topics','understand','quiet','hotseat'].includes(x.mode)&&(x.options===undefined||arr(x.options,8,o=>string(o,160)));
const guess=(x:unknown)=>obj(x)&&only(x,['memberId','option'])&&id(x.memberId)&&integer(x.option,0,7);
const topic=(x:unknown,current=false)=>obj(x)&&only(x,['id','text','category','source','cardId','suggestedBy',...(current?['startedAt','deadline']:[])])&&id(x.id)&&string(x.text,240)&&string(x.category,100)&&['manual','card'].includes(x.source)&&(x.cardId===undefined||id(x.cardId))&&(x.suggestedBy===undefined||id(x.suggestedBy))&&(!current||time(x.startedAt)&&time(x.deadline));
export function validSocialModeState(mode:SocialModeId,state:unknown):boolean {
 if(!obj(state))return false;
 switch(mode){
  case 'draw-story':return validDrawStoryStateR47(state);
  case 'word-guess':return validWordGuessStateR47(state);
  case 'memory-challenge':return validMemoryChallengeStateR47(state);
  case 'table':return only(state,['enabled','card','drawId','drawCount','answers','turnQueue','queue'])&&typeof state.enabled==='boolean'&&(state.card===null||card(state.card))&&nullableId(state.drawId)&&integer(state.drawCount)&&ids(state.turnQueue,100)&&ids(state.queue,100)&&arr(state.answers,50,a=>obj(a)&&only(a,['id','drawId','cardId','actorId','at','passed','text'])&&id(a.id)&&id(a.drawId)&&id(a.cardId)&&id(a.actorId)&&time(a.at)&&typeof a.passed==='boolean'&&(a.text===undefined||string(a.text,500)));
  case 'anonymous':return only(state,['messages','reports','rateLimits'])&&arr(state.messages,100,m=>obj(m)&&only(m,['id','text','senderId','createdAt','revealed','hidden','reactions'])&&id(m.id)&&id(m.senderId)&&string(m.text,500)&&time(m.createdAt)&&typeof m.revealed==='boolean'&&typeof m.hidden==='boolean'&&arr(m.reactions,100,r=>obj(r)&&only(r,['actorId','reaction'])&&id(r.actorId)&&['like','heart','laugh','agree','support'].includes(r.reaction)))&&arr(state.reports,200,r=>obj(r)&&only(r,['id','messageId','actorId','reason','createdAt','message'])&&id(r.id)&&id(r.messageId)&&id(r.actorId)&&string(r.reason,200)&&time(r.createdAt)&&obj(r.message)&&only(r.message,['senderId','text','createdAt'])&&id(r.message.senderId)&&string(r.message.text,500)&&time(r.message.createdAt))&&arr(state.rateLimits,1000,r=>obj(r)&&only(r,['actorId','sentAt'])&&id(r.actorId)&&time(r.sentAt));
  case 'topics':return only(state,['current','suggestions','votes','round','config'])&&(state.current===null||topic(state.current,true))&&arr(state.suggestions,12,t=>topic(t))&&arr(state.votes,500,v=>obj(v)&&only(v,['memberId','topicId'])&&id(v.memberId)&&id(v.topicId))&&integer(state.round)&&obj(state.config)&&only(state.config,['autoSuggestions','durationMs'])&&typeof state.config.autoSuggestions==='boolean'&&(state.config.durationMs===null||integer(state.config.durationMs,10000,3600000));
  case 'understand':{
   const r=state.round;
   return only(state,['participants','cardCursor','round','_private','funCount'])&&ids(state.participants,200)&&integer(state.cardCursor)&&integer(state.funCount,0,200)&&obj(state._private)&&only(state._private,['answer','guesses'])&&(state._private.answer===null||integer(state._private.answer,0,7))&&arr(state._private.guesses,200,guess)&&(r===null||obj(r)&&only(r,['id','memberId','card','status','startedAt','endsAt','revealedAt','results'])&&id(r.id)&&id(r.memberId)&&card(r.card)&&Array.isArray(r.card.options)&&r.card.options.length>=2&&['open','revealed','skipped'].includes(r.status)&&time(r.startedAt)&&time(r.endsAt)&&(r.revealedAt===undefined||time(r.revealedAt))&&(r.results===undefined||obj(r.results)&&only(r.results,['answer','guesses','matchedCount'])&&integer(r.results.answer,0,7)&&integer(r.results.matchedCount,0,200)&&arr(r.results.guesses,200,g=>obj(g)&&only(g,['memberId','option','matched'])&&id(g.memberId)&&integer(g.option,0,7)&&typeof g.matched==='boolean')));
  }
  case 'quiet':return only(state,['prompts','intervalMs','promptClockAt','lastPromptAt','cardId','promptCursor','preferences'])&&typeof state.prompts==='boolean'&&integer(state.intervalMs,15000,3600000)&&(state.promptClockAt===null||time(state.promptClockAt))&&(state.lastPromptAt===null||time(state.lastPromptAt))&&nullableId(state.cardId)&&integer(state.promptCursor)&&obj(state.preferences)&&Object.keys(state.preferences).length<=128&&Object.entries(state.preferences).every(([uid,p])=>id(uid)&&obj(p)&&only(p,['relax','music'])&&typeof p.relax==='boolean'&&obj(p.music)&&only(p.music,['enabled','volume'])&&typeof p.music.enabled==='boolean'&&typeof p.music.volume==='number'&&Number.isFinite(p.music.volume)&&p.music.volume>=0&&p.music.volume<=1);
  case 'hotseat':return only(state,['queue','seatedId','question','questionsAsked'])&&ids(state.queue,100)&&nullableId(state.seatedId)&&integer(state.questionsAsked,0,20)&&(state.question===null||obj(state.question)&&only(state.question,['cardId','category'])&&id(state.question.cardId)&&string(state.question.category,80));
 }
}
/** Fill only absent R47 keys. Never replace malformed present data or mutate a caller's snapshot. */
export function hydrateCouncilGamesR47<T>(value:T):T {
 const out=structuredClone(value);
 if(!obj(out))return out;
 if(obj(out.modeEnabled))for(const mode of SOCIAL_GAME_IDS)if(!Object.hasOwn(out.modeEnabled,mode))out.modeEnabled[mode]=true;
 if(obj(out.modes))for(const mode of SOCIAL_GAME_IDS)if(!Object.hasOwn(out.modes,mode))out.modes[mode]=SOCIAL_MODES[mode].initial();
 return out;
}
/** Invoke inside the existing tx after eligible membership pruning, including council departure paths. */
export function advanceSocialGamesR47(modes:Record<string,any>,ctx:SocialModeContext):boolean {
 let changed=false;
 const advance={'draw-story':advanceDrawStoryR47,'word-guess':advanceWordGuessR47,'memory-challenge':advanceMemoryChallengeR47};
 for(const mode of SOCIAL_GAME_IDS){
  const s=modes[mode];if(!s||!validSocialModeState(mode,s))continue;
  const draft=structuredClone(s);(advance[mode] as (s:any,c:SocialModeContext)=>void)(draft,ctx);
  if(JSON.stringify(draft)!==JSON.stringify(s)){
   if(!Number.isSafeInteger(s.version+1))throw new Error('social_game_version_capacity');
   draft.version=s.version+1;
   if(!validSocialModeState(mode,draft))throw new Error('social_game_state_invalid');
   modes[mode]=draft;changed=true;
  }
 }
 return changed;
}
