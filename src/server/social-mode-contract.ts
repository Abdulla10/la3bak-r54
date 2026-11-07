export const SOCIAL_MODE_IDS = ['table','anonymous','topics','understand','quiet','hotseat','draw-story','word-guess','memory-challenge'] as const;
export type SocialModeId = typeof SOCIAL_MODE_IDS[number];
export type SocialCard = {id:string;mode:SocialModeId;category:string;text:string;options?:string[];enabled:boolean};
export type SocialModeSettings = {enabled:boolean;durationMs:number;allowParticipation:boolean;categories:string[]};
export type SocialContent = {cards:SocialCard[];settings:Record<SocialModeId,SocialModeSettings>};
export type SocialModeContext = {actorId:string;members:string[];moderator:boolean;now:number;content:SocialContent;newId:()=>string;canWrite:boolean};
export type SocialModeAction = {type:string;[key:string]:unknown};
export type SocialModeResult = {ok:true;event:string}|{ok:false;error:string};
export interface SocialModeModule {
 id:SocialModeId;
 initial():Record<string,any>;
 apply(state:Record<string,any>,action:SocialModeAction,ctx:SocialModeContext):SocialModeResult;
 view(state:Record<string,any>,ctx:SocialModeContext):Record<string,unknown>;
}
export function socialText(value:unknown,max=500):string|null {
 if(typeof value!=='string')return null;const s=value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim();
 if(!s||s.length>max)return null;
 // Conservative guard against obvious contact/credential disclosure. User reports and moderation remain essential.
 if(/(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){8,}|\b(?:password|passwd|api[_ -]?key)\s*[:=])/i.test(s))return null;
 return s;
}
export function socialAllowed(ctx:SocialModeContext,id:SocialModeId):SocialModeResult|null {
 const s=ctx.content.settings[id];
 if(!s?.enabled)return {ok:false,error:'هالنمط مقفل من الإدارة.'};
 if(!ctx.members.includes(ctx.actorId))return {ok:false,error:'لازم تكون داخل المجلس.'};
 if(!s.allowParticipation&&!ctx.moderator)return {ok:false,error:'المشاركة مقفلة في هالنمط.'};
 if(!ctx.canWrite)return {ok:false,error:'المشاركة موقوفة مؤقتًا.'};
 return null;
}
export function socialCards(ctx:SocialModeContext,id:SocialModeId,category?:unknown):SocialCard[]{
 const settings=ctx.content.settings[id];
 return ctx.content.cards.filter(c=>c.enabled&&c.mode===id&&settings.categories.includes(c.category)&&(typeof category!=='string'||c.category===category));
}
export function socialPublicCard(card:SocialCard|undefined):Record<string,unknown>|null {return card?{id:card.id,category:card.category,text:card.text,...(card.options?{options:[...card.options]}:{})}:null;}

// R47 games reuse council transactions/receipts. No economic fields or secondary store.
export const SOCIAL_GAME_IDS = ['draw-story','word-guess','memory-challenge'] as const;
export type SocialGameId = typeof SOCIAL_GAME_IDS[number];
export type GameBaseR47 = {participants:string[];version:number;sessionId:string|null;phase:string;deadline:number|null;round:number};
export const gameFailR47 = (error:string):SocialModeResult => ({ok:false,error});
export const gameIdR47 = (x:unknown):x is string => typeof x==='string'&&x.length>0&&x.length<=128&&!/[\s\u0000-\u001f\u007f-\u009f]/u.test(x);
export const gameTimeR47 = (x:unknown):x is number => Number.isSafeInteger(x)&&Number(x)>=0;
export const gameActiveR47 = (s:GameBaseR47) => !['lobby','finished','cancelled'].includes(s.phase);
export const gameInitialR47 = ():GameBaseR47 => ({participants:[],version:0,sessionId:null,phase:'lobby',deadline:null,round:0});
export function gameNewSessionR47(ctx:SocialModeContext):string|null {try{const id=ctx.newId();return gameIdR47(id)?id:null;}catch{return null;}}
export function gameVisibleR47(id:SocialGameId,ctx:SocialModeContext):boolean {return !!ctx.content.settings[id]?.enabled&&ctx.members.includes(ctx.actorId);}
export function gamePermissionsR47(s:GameBaseR47,ctx:SocialModeContext,id:SocialGameId) {
 const allowed=!socialAllowed(ctx,id), active=gameActiveR47(s), joined=s.participants.includes(ctx.actorId);
 return {participate:allowed&&!active&&!joined&&s.participants.length<6,withdraw:joined,
 start:allowed&&ctx.moderator&&!active&&s.participants.filter(p=>ctx.members.includes(p)).length>=2,
 cancel:allowed&&ctx.moderator&&active,tick:allowed&&active,
 act:allowed&&joined&&active&&s.deadline!==null&&ctx.now<s.deadline};
}
/** Rejected commands leave nested state untouched; request replay belongs to existing durable receipts. */
export function gameApplyR47<S extends GameBaseR47>(state:Record<string,any>,action:SocialModeAction,ctx:SocialModeContext,id:SocialGameId,fields:Record<string,string[]>,run:(s:S)=>SocialModeResult):SocialModeResult {
 if(!action||typeof action.type!=='string'||!Object.hasOwn(fields,action.type)||Object.keys(action).some(k=>!['type','version',...fields[action.type]].includes(k)))return gameFailR47('إجراء اللعبة أو حقوله غير صالحة.');
 const withdrawing=action.type==='participate'&&action.enabled===false;
 const denied=socialAllowed(ctx,id);
 if(denied&&!(withdrawing&&ctx.members.includes(ctx.actorId)))return denied;
 if(!gameIdR47(ctx.actorId)||!gameTimeR47(ctx.now)||ctx.now>Number.MAX_SAFE_INTEGER-3_600_000)return gameFailR47('ساعة المجلس غير صالحة.');
 const s=state as S;
 if(!gameTimeR47(action.version)||action.version!==s.version||!Number.isSafeInteger(s.version+1))return gameFailR47('تغيرت حالة اللعبة؛ حدّث العرض وأعد المحاولة.');
 const draft=structuredClone(s),result=run(draft);
 if(result.ok){draft.version++;Object.assign(state,draft);}
 return result;
}
export function gameParticipateR47(s:GameBaseR47,enabled:unknown,ctx:SocialModeContext):SocialModeResult {
 if(typeof enabled!=='boolean')return gameFailR47('حدد المشاركة أو الانسحاب.');
 if(enabled){
  if(gameActiveR47(s))return gameFailR47('انتظر الجلسة التالية للمشاركة.');
  s.participants=s.participants.filter(p=>ctx.members.includes(p));
  if(s.participants.includes(ctx.actorId))return gameFailR47('أنت مشارك بالفعل.');
  if(s.participants.length>=6)return gameFailR47('اللعبة من عضوين إلى ستة.');
  s.participants.push(ctx.actorId);
 }else s.participants=s.participants.filter(p=>p!==ctx.actorId);
 return {ok:true,event:'participation'};
}
/** Supply current eligible council members, never client-supplied identities. */
export function gamePruneR47(s:GameBaseR47,ctx:SocialModeContext):boolean {
 s.participants=s.participants.filter(p=>ctx.members.includes(p));
 if(gameActiveR47(s)&&s.participants.length<2){s.phase='cancelled';s.deadline=null;return true;}
 return false;
}
export const gameTextR47=(x:unknown,max:number)=>socialText(x,max)?.replace(/\s+/gu,' ')??null;
export function gameBaseValidR47(x:any,phases:string[]):boolean {
 return !!x&&typeof x==='object'&&!Array.isArray(x)&&Array.isArray(x.participants)&&x.participants.length<=6&&x.participants.every(gameIdR47)&&new Set(x.participants).size===x.participants.length&&gameTimeR47(x.version)&&(x.sessionId===null||gameIdR47(x.sessionId))&&phases.includes(x.phase)&&(x.deadline===null||gameTimeR47(x.deadline))&&Number.isInteger(x.round)&&x.round>=0&&x.round<=6;
}
export const gameOnlyR47=(x:any,keys:string[]):boolean=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k));
export const GAME_BASE_KEYS_R47=['participants','version','sessionId','phase','deadline','round'];
