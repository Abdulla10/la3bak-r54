import {createHmac,randomBytes} from 'node:crypto';
import {
 gameActiveR47,gameApplyR47,gameBaseValidR47,gameFailR47,gameIdR47,gameInitialR47,gameNewSessionR47,
 gameOnlyR47,gameParticipateR47,gamePermissionsR47,gamePruneR47,gameTextR47,gameTimeR47,gameVisibleR47,
 GAME_BASE_KEYS_R47,type GameBaseR47,type SocialModeContext,type SocialModeModule,
} from '../social-mode-contract.js';
// Small original seed dictionary. Hints are curated: no user-provided secret/contact disclosure.
export const WORD_DICTIONARY_R47=[
 {id:'lantern',word:'فانوس',hints:['يضيء مكانًا صغيرًا','قد نحمله في أمسية هادئة']},
 {id:'bridge',word:'جسر',hints:['يصل بين جهتين','يساعدنا على عبور الماء']},
 {id:'cloud',word:'غيمة',hints:['تسافر في السماء','قد تحمل المطر']},
 {id:'shell',word:'صدفة',hints:['توجد قرب البحر','قد تجدها على الرمل']},
 {id:'kite',word:'طائرة ورقية',hints:['تلعب معها الرياح','تمسكها بخيط من الأرض']},
 {id:'key',word:'مفتاح',hints:['شيء صغير نحتفظ به','يفتح ما أغلقناه']},
 {id:'basket',word:'سلة',hints:['تحمل أشياء خفيفة','قد نضع فيها فاكهة']},
 {id:'mirror',word:'مرآة',hints:['تعكس ما أمامها','تساعدك عند ترتيب مظهرك']},
 {id:'boat',word:'قارب',hints:['يسير فوق الماء','قد يحتاج إلى مجداف']},
 {id:'ladder',word:'سلم',hints:['يساعدك على بلوغ مكان عال','له درجات متتابعة']},
 {id:'clock',word:'ساعة',hints:['ترافق يومك','تدلنا على الوقت']},
 {id:'feather',word:'ريشة',hints:['خفيفة جدًا','تغطي جسم الطائر']},
] as const;
const entry=(id:string|null)=>WORD_DICTIONARY_R47.find(w=>w.id===id);
export const normalizeWordR47=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670\u0640\s]/gu,'').replace(/[أإآ]/gu,'ا');
type Guess={actorId:string;text:string;at:number;attempts:number;matched:boolean};
export type WordStateR47=GameBaseR47&{
 order:string[];scores:{actorId:string;score:number}[];hint:string|null;
 _private:{seed:string|null;choices:string[];secretId:string|null;guesses:Guess[]};
 result:null|{answer:string|null;matchedBy:string|null;reason:'matched'|'timeout'|'passed'};
};
const initial=():WordStateR47=>({...gameInitialR47(),order:[],scores:[],hint:null,_private:{seed:null,choices:[],secretId:null,guesses:[]},result:null});
const ok=(event:string)=>({ok:true as const,event:`word-guess.${event}`});
function beginRound(s:WordStateR47,at:number){
 if(s.round>=s.order.length){s.phase='finished';s.deadline=null;s._private={seed:s._private.seed,choices:[],secretId:null,guesses:[]};return;}
 if(!s.participants.includes(s.order[s.round])){s.round++;beginRound(s,at);return;}
 const choices=WORD_DICTIONARY_R47.map(w=>w.id as string).sort((a,b)=>createHmac('sha256',s._private.seed!).update(`${s.round}:${a}`).digest('hex').localeCompare(createHmac('sha256',s._private.seed!).update(`${s.round}:${b}`).digest('hex')));
 s.phase='choosing';s.deadline=at+15_000;s.hint=null;s.result=null;s._private={seed:s._private.seed,choices:choices.slice(0,3),secretId:null,guesses:[]};
}
function endRound(s:WordStateR47,at:number,reason:'matched'|'timeout'|'passed',matchedBy:string|null=null){
 s.result={answer:entry(s._private.secretId)?.word??null,matchedBy,reason};
 if(matchedBy){for(const id of [matchedBy,s.order[s.round]]){const score=s.scores.find(p=>p.actorId===id);if(score)score.score++;}}
 s.phase='revealed';s.deadline=at+5_000;s._private={seed:s._private.seed,choices:[],secretId:null,guesses:[]};
}
/** Deadline/pruning hook for the existing transaction/sweep; no new ticker. */
export function advanceWordGuessR47(s:WordStateR47,ctx:SocialModeContext):void {
 s.scores=s.scores.filter(p=>s.participants.includes(p.actorId));
 if(gamePruneR47(s,ctx)){s.scores=s.scores.filter(p=>s.participants.includes(p.actorId));s._private={seed:s._private.seed,choices:[],secretId:null,guesses:[]};s.result=null;s.hint=null;return;}
 if(['choosing','hinting','guessing'].includes(s.phase)&&!s.participants.includes(s.order[s.round]))endRound(s,ctx.now,'passed');
 for(let i=0;i<20&&gameActiveR47(s)&&s.deadline!==null&&ctx.now>=s.deadline;i++){
  const at=s.deadline;
  if(['choosing','hinting','guessing'].includes(s.phase))endRound(s,at,'timeout');
  else if(s.phase==='revealed'){s.round++;beginRound(s,at);}else break;
 }
}
export const wordGuessMode:SocialModeModule={
 id:'word-guess',initial,
 apply(state,action,ctx){return gameApplyR47<WordStateR47>(state,action,ctx,'word-guess',{
  participate:['enabled'],start:[],choose:['choiceId'],hint:['hintIndex'],guess:['text'],pass:[],tick:[],cancel:[],
 },s=>{
  if(action.type==='participate'){
   const r=gameParticipateR47(s,action.enabled,ctx);if(!r.ok)return r;
   advanceWordGuessR47(s,ctx);return ok('participation');
  }
  if(action.type==='start'){
   if(!ctx.moderator||gameActiveR47(s))return gameFailR47('بدء الجلسة للمشرف بعد نهاية السابقة.');
   const participants=s.participants.filter(p=>ctx.members.includes(p));if(participants.length<2||participants.length>6)return gameFailR47('اللعبة من عضوين إلى ستة.');
   const sessionId=gameNewSessionR47(ctx);if(!sessionId)return gameFailR47('تعذر إنشاء الجلسة.');
   Object.assign(s,initial(),{version:s.version,participants,order:[...participants],sessionId,scores:participants.map(actorId=>({actorId,score:0}))});
   s._private.seed=randomBytes(32).toString('hex');beginRound(s,ctx.now);return ok('started');
  }
  if(action.type==='cancel'){
   if(!ctx.moderator||!gameActiveR47(s))return gameFailR47('الإلغاء للمشرف في جلسة نشطة.');
   s.phase='cancelled';s.deadline=null;s._private={seed:s._private.seed,choices:[],secretId:null,guesses:[]};s.result=null;s.hint=null;return ok('cancelled');
  }
  if(action.type==='tick'){advanceWordGuessR47(s,ctx);return ok('tick');}
  advanceWordGuessR47(s,ctx);
  if(!s.participants.includes(ctx.actorId)||s.deadline===null||ctx.now>=s.deadline)return gameFailR47('لا توجد مشاركة أو مهلة متاحة.');
  const speaker=s.order[s.round]===ctx.actorId;
  if(action.type==='choose'){
   if(s.phase!=='choosing'||!speaker||typeof action.choiceId!=='string'||!s._private.choices.includes(action.choiceId))return gameFailR47('اختيار الكلمة للمتحدث من خياراته فقط.');
   s._private.secretId=action.choiceId;s._private.choices=[];s.phase='hinting';s.deadline=ctx.now+15_000;return ok('chosen');
  }
  if(action.type==='hint'){
   const word=entry(s._private.secretId);
   if(s.phase!=='hinting'||!speaker||!word||!Number.isInteger(action.hintIndex)||Number(action.hintIndex)<0||Number(action.hintIndex)>1)return gameFailR47('اختر تلميحًا معتمدًا دون كشف الكلمة.');
   s.hint=word.hints[action.hintIndex as 0|1];s.phase='guessing';s.deadline=ctx.now+30_000;return ok('hinted');
  }
  if(action.type==='pass'){
   if(!speaker||!['choosing','hinting','guessing'].includes(s.phase))return gameFailR47('التمرير للمتحدث فقط.');
   endRound(s,ctx.now,'passed');return ok('passed');
  }
  if(action.type==='guess'){
   if(s.phase!=='guessing'||speaker)return gameFailR47('التخمين للمشاركين الآخرين أثناء نافذته.');
   const text=gameTextR47(action.text,60);if(!text)return gameFailR47('تخمين نصي آمن حتى 60 حرفًا.');
   const previous=s._private.guesses.find(g=>g.actorId===ctx.actorId);
   if(previous&&(ctx.now-previous.at<1000||previous.attempts>=20))return gameFailR47('تخمين واحد في الثانية وبحد عشرين محاولة للدور.');
   const matched=normalizeWordR47(text)===normalizeWordR47(entry(s._private.secretId)!.word);
   const guess={actorId:ctx.actorId,text,at:ctx.now,attempts:(previous?.attempts??0)+1,matched};
   s._private.guesses=s._private.guesses.filter(g=>g.actorId!==ctx.actorId);s._private.guesses.push(guess);
   if(matched)endRound(s,ctx.now,'matched',ctx.actorId);
   return ok(matched?'matched':'guessed');
  }
  return gameFailR47('إجراء غير متاح.');
 });},
 view(state,ctx){
  if(!gameVisibleR47('word-guess',ctx))return {id:'word-guess',unavailable:true};
  const raw=state as WordStateR47,s=structuredClone(raw);advanceWordGuessR47(s,ctx);
  const p=gamePermissionsR47(s,ctx,'word-guess'),speaker=s.order[s.round]===ctx.actorId,word=entry(s._private.secretId);
  const own=s._private.guesses.find(g=>g.actorId===ctx.actorId),max=Math.max(0,...s.scores.map(p=>p.score));
  return {id:'word-guess',version:raw.version,sessionId:s.sessionId,serverNow:ctx.now,phase:s.phase,deadline:s.deadline,round:s.round,participants:[...s.participants],participating:s.participants.includes(ctx.actorId),memberId:s.order[s.round]??null,
   hint:s.hint,choices:s.phase==='choosing'&&speaker?s._private.choices.map(id=>({id,text:entry(id)!.word})):[],
   ownSecret:speaker&&['hinting','guessing'].includes(s.phase)?word?.word??null:null,
   hintChoices:speaker&&s.phase==='hinting'?word?.hints.map((text,index)=>({index,text}))??[]:[],
   ownGuess:own?{text:own.text,attempts:own.attempts,nextGuessAt:own.at+1000}:null,
   result:['revealed','finished'].includes(s.phase)?structuredClone(s.result):null,
   scores:s.scores.map(p=>({...p})),winners:s.phase==='finished'&&max>0?s.scores.filter(p=>p.score===max).map(p=>({actorId:p.actorId,score:p.score})):[],
   permissions:{...p,tick:p.tick||(gamePermissionsR47(raw,ctx,'word-guess').tick),choose:p.act&&speaker&&s.phase==='choosing',hint:p.act&&speaker&&s.phase==='hinting',guess:p.act&&!speaker&&s.phase==='guessing'&&(!own||ctx.now>=own.at+1000&&own.attempts<20),pass:p.act&&speaker&&['choosing','hinting','guessing'].includes(s.phase)},
  };
 },
};
export function validWordGuessStateR47(s:any):boolean {
 if(!gameBaseValidR47(s,['lobby','choosing','hinting','guessing','revealed','finished','cancelled'])||!gameOnlyR47(s,[...GAME_BASE_KEYS_R47,'order','scores','hint','_private','result'])||!Array.isArray(s.order)||s.order.length>6||!s.order.every(gameIdR47)||new Set(s.order).size!==s.order.length||!Array.isArray(s.scores)||s.scores.length>6||!s.scores.every((p:any)=>gameOnlyR47(p,['actorId','score'])&&gameIdR47(p.actorId)&&Number.isInteger(p.score)&&p.score>=0&&p.score<=12)||new Set(s.scores.map((p:any)=>p.actorId)).size!==s.scores.length||(s.hint!==null&&!WORD_DICTIONARY_R47.some(w=>w.hints.some(h=>h===s.hint))))return false;
 const p=s._private;
 if(!gameOnlyR47(p,['seed','choices','secretId','guesses'])||(p.seed!==null&&(typeof p.seed!=='string'||!/^[a-f0-9]{64}$/.test(p.seed)))||!Array.isArray(p.choices)||p.choices.length>3||!p.choices.every((id:any)=>typeof id==='string'&&!!entry(id))||new Set(p.choices).size!==p.choices.length||(p.secretId!==null&&(typeof p.secretId!=='string'||!entry(p.secretId)))||!Array.isArray(p.guesses)||p.guesses.length>6||!p.guesses.every((g:any)=>gameOnlyR47(g,['actorId','text','at','attempts','matched'])&&gameIdR47(g.actorId)&&gameTextR47(g.text,60)===g.text&&gameTimeR47(g.at)&&Number.isInteger(g.attempts)&&g.attempts>=1&&g.attempts<=20&&typeof g.matched==='boolean')||new Set(p.guesses.map((g:any)=>g.actorId)).size!==p.guesses.length)return false;
 if(gameActiveR47(s)&&(p.seed===null||s.deadline===null||s.sessionId===null||s.participants.length<2||s.round>=s.order.length))return false;
 if(s.phase==='choosing'&&(p.choices.length!==3||p.secretId!==null))return false;
 if(['hinting','guessing'].includes(s.phase)&&!entry(p.secretId))return false;
 if(s.phase==='guessing'&&s.hint===null)return false;
 return s.result===null||gameOnlyR47(s.result,['answer','matchedBy','reason'])&&(s.result.answer===null||WORD_DICTIONARY_R47.some(w=>w.word===s.result.answer))&&(s.result.matchedBy===null||gameIdR47(s.result.matchedBy))&&['matched','timeout','passed'].includes(s.result.reason);
}
export default wordGuessMode;
