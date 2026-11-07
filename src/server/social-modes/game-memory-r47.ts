import {createHmac,randomBytes} from 'node:crypto';
import {
 gameActiveR47,gameApplyR47,gameBaseValidR47,gameFailR47,gameIdR47,gameInitialR47,gameNewSessionR47,
 gameOnlyR47,gameParticipateR47,gamePermissionsR47,gamePruneR47,gameVisibleR47,
 GAME_BASE_KEYS_R47,type GameBaseR47,type SocialModeContext,type SocialModeModule,
} from '../social-mode-contract.js';
export const MEMORY_SYMBOLS_R47=['شمس','قمر','نجمة','ورقة','مفتاح','بيت','موجة','زهرة'] as const;
const ROUNDS=3;
type Submission={actorId:string;sequence:string[]};
type Result={sequence:string[];players:{actorId:string;correct:number;perfect:boolean}[]};
export type MemoryStateR47=GameBaseR47&{
 scores:{actorId:string;score:number}[];
 _private:{seed:string|null;sequence:string[];submissions:Submission[]};result:Result|null;
};
const initial=():MemoryStateR47=>({...gameInitialR47(),scores:[],_private:{seed:null,sequence:[],submissions:[]},result:null});
const ok=(event:string)=>({ok:true as const,event:`memory-challenge.${event}`});
function begin(s:MemoryStateR47,at:number){
 // Private server entropy makes future sequences unguessable from public session IDs; views never reroll.
 const ordered=[...MEMORY_SYMBOLS_R47].sort((a,b)=>createHmac('sha256',s._private.seed!).update(`${s.round}:${a}`).digest('hex').localeCompare(createHmac('sha256',s._private.seed!).update(`${s.round}:${b}`).digest('hex')));
 s._private={seed:s._private.seed,sequence:ordered.slice(0,3+s.round),submissions:[]};s.result=null;s.phase='showing';s.deadline=at+5000;
}
function reveal(s:MemoryStateR47,at:number){
 const sequence=[...s._private.sequence];
 const players=s.participants.map(actorId=>{
  const own=s._private.submissions.find(p=>p.actorId===actorId);
  const correct=own?sequence.filter((symbol,i)=>own.sequence[i]===symbol).length:0;
  const score=s.scores.find(p=>p.actorId===actorId);if(score)score.score+=correct;
  return {actorId,correct,perfect:correct===sequence.length};
 });
 s.result={sequence,players};s._private={seed:s._private.seed,sequence:[],submissions:[]};s.phase='result';s.deadline=at+5000;
}
export function advanceMemoryChallengeR47(s:MemoryStateR47,ctx:SocialModeContext):void {
 s.scores=s.scores.filter(p=>s.participants.includes(p.actorId));
 if(gamePruneR47(s,ctx)){s.scores=s.scores.filter(p=>s.participants.includes(p.actorId));s._private={seed:s._private.seed,sequence:[],submissions:[]};s.result=null;return;}
 s._private.submissions=s._private.submissions.filter(p=>s.participants.includes(p.actorId));
 for(let i=0;i<12&&gameActiveR47(s)&&s.deadline!==null&&ctx.now>=s.deadline;i++){
  const at=s.deadline;
  if(s.phase==='showing'){s.phase='recalling';s.deadline=at+15_000;}
  else if(s.phase==='recalling')reveal(s,at);
  else if(s.phase==='result'){
   s.round++;if(s.round>=ROUNDS){s.phase='finished';s.deadline=null;}else begin(s,at);
  }else break;
 }
}
export const memoryChallengeMode:SocialModeModule={
 id:'memory-challenge',initial,
 apply(state,action,ctx){return gameApplyR47<MemoryStateR47>(state,action,ctx,'memory-challenge',{
  participate:['enabled'],start:[],submit:['sequence','round'],tick:[],cancel:[],
 },s=>{
  if(action.type==='participate'){
   const r=gameParticipateR47(s,action.enabled,ctx);if(!r.ok)return r;advanceMemoryChallengeR47(s,ctx);return ok('participation');
  }
  if(action.type==='start'){
   if(!ctx.moderator||gameActiveR47(s))return gameFailR47('بدء الجلسة للمشرف بعد انتهاء السابقة.');
   const participants=s.participants.filter(p=>ctx.members.includes(p));if(participants.length<2||participants.length>6)return gameFailR47('اختر من عضوين إلى ستة مشاركين.');
   const sessionId=gameNewSessionR47(ctx);if(!sessionId)return gameFailR47('تعذر إنشاء الجلسة.');
   Object.assign(s,initial(),{version:s.version,participants,sessionId,scores:participants.map(actorId=>({actorId,score:0}))});s._private.seed=randomBytes(32).toString('hex');begin(s,ctx.now);return ok('started');
  }
  if(action.type==='cancel'){
   if(!ctx.moderator||!gameActiveR47(s))return gameFailR47('الإلغاء للمشرف في جلسة نشطة.');
   s.phase='cancelled';s.deadline=null;s._private={seed:s._private.seed,sequence:[],submissions:[]};s.result=null;return ok('cancelled');
  }
  if(action.type==='tick'){advanceMemoryChallengeR47(s,ctx);return ok('tick');}
  advanceMemoryChallengeR47(s,ctx);
  if(action.type!=='submit'||s.phase!=='recalling'||action.round!==s.round||!s.participants.includes(ctx.actorId))return gameFailR47('الإجابة للمشارك في جولة الاسترجاع الحالية فقط.');
  if(s._private.submissions.some(p=>p.actorId===ctx.actorId))return gameFailR47('إجابة واحدة نهائية للجولة.');
  if(!Array.isArray(action.sequence)||action.sequence.length!==s._private.sequence.length||!action.sequence.every(symbol=>MEMORY_SYMBOLS_R47.includes(symbol as any))||new Set(action.sequence).size!==action.sequence.length)return gameFailR47('أدخل العدد المحدد من الرموز بترتيبك دون تكرار.');
  s._private.submissions.push({actorId:ctx.actorId,sequence:[...action.sequence] as string[]});
  // Never reveal early: all participants keep the same fixed recall window.
  return ok('submitted');
 });},
 view(state,ctx){
  if(!gameVisibleR47('memory-challenge',ctx))return {id:'memory-challenge',unavailable:true};
  const raw=state as MemoryStateR47,s=structuredClone(raw);advanceMemoryChallengeR47(s,ctx);
  const p=gamePermissionsR47(s,ctx,'memory-challenge'),own=s._private.submissions.some(p=>p.actorId===ctx.actorId),max=Math.max(0,...s.scores.map(p=>p.score));
  return {id:'memory-challenge',version:raw.version,sessionId:s.sessionId,serverNow:ctx.now,phase:s.phase,deadline:s.deadline,round:s.round,totalRounds:ROUNDS,
   participants:[...s.participants],participating:s.participants.includes(ctx.actorId),
   symbols:s.phase==='showing'?[...s._private.sequence]:[],symbolCount:['showing','recalling'].includes(s.phase)?s._private.sequence.length:0,
   palette:[...MEMORY_SYMBOLS_R47],hasSubmitted:own,scores:s.scores.map(p=>({...p})),
   result:['result','finished'].includes(s.phase)?structuredClone(s.result):null,
   winners:s.phase==='finished'&&max>0?s.scores.filter(p=>p.score===max).map(p=>({...p})):[],
   permissions:{...p,tick:p.tick||(gamePermissionsR47(raw,ctx,'memory-challenge').tick),submit:p.act&&s.phase==='recalling'&&!own},
  };
 },
};
export function validMemoryChallengeStateR47(s:any):boolean {
 const seq=(x:any,n:number)=>Array.isArray(x)&&x.length<=n&&x.every((p:any)=>MEMORY_SYMBOLS_R47.includes(p))&&new Set(x).size===x.length;
 const score=(p:any)=>gameOnlyR47(p,['actorId','score'])&&gameIdR47(p.actorId)&&Number.isInteger(p.score)&&p.score>=0&&p.score<=12;
 if(!gameBaseValidR47(s,['lobby','showing','recalling','result','finished','cancelled'])||s.round>3||!gameOnlyR47(s,[...GAME_BASE_KEYS_R47,'scores','_private','result'])||!Array.isArray(s.scores)||s.scores.length>6||!s.scores.every(score)||new Set(s.scores.map((p:any)=>p.actorId)).size!==s.scores.length)return false;
 const p=s._private;
 if(!gameOnlyR47(p,['seed','sequence','submissions'])||(p.seed!==null&&(typeof p.seed!=='string'||!/^[a-f0-9]{64}$/.test(p.seed)))||!seq(p.sequence,5)||!Array.isArray(p.submissions)||p.submissions.length>6||!p.submissions.every((v:any)=>gameOnlyR47(v,['actorId','sequence'])&&gameIdR47(v.actorId)&&seq(v.sequence,5)&&v.sequence.length===p.sequence.length)||new Set(p.submissions.map((v:any)=>v.actorId)).size!==p.submissions.length)return false;
 if(gameActiveR47(s)&&(p.seed===null||s.deadline===null||s.sessionId===null||s.participants.length<2||s.round>=3))return false;
 if(['showing','recalling'].includes(s.phase)&&p.sequence.length!==3+s.round)return false;
 if(s.result===null)return !['result','finished'].includes(s.phase);
 return ['result','finished'].includes(s.phase)&&gameOnlyR47(s.result,['sequence','players'])&&seq(s.result.sequence,5)&&s.result.sequence.length>=3&&Array.isArray(s.result.players)&&s.result.players.length<=6&&s.result.players.every((v:any)=>gameOnlyR47(v,['actorId','correct','perfect'])&&gameIdR47(v.actorId)&&Number.isInteger(v.correct)&&v.correct>=0&&v.correct<=s.result.sequence.length&&typeof v.perfect==='boolean'&&v.perfect===(v.correct===s.result.sequence.length));
}
export default memoryChallengeMode;
