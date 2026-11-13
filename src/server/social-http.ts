import { randomUUID } from 'node:crypto';
import { FunctionalHttp, FunctionalHttpError } from './functional-http.js';
import { can, type Platform, type Perm } from './platform.js';
import type { Actor } from './admin.js';
import type { SocialRooms } from './social-rooms.js';
import type { SocialVoice } from './social-voice.js';

type Result = {ok?:boolean;error?:string;status?:number;[key:string]:unknown};
function checked<T>(result:T):T { const r=result as Result; if(r?.ok===false)throw new FunctionalHttpError(r.status&&r.status>=400&&r.status<=599?r.status:400,r.error||'تعذّر تنفيذ الطلب الاجتماعي.'); return result; }
export function wireSocialRoutes(http:FunctionalHttp,deps:{onRoomJoin?:(id:string,roomId:string)=>void;onCommand?:(id:string,command:string,body:Record<string,unknown>)=>void;rooms:SocialRooms;voice:SocialVoice;platform:Platform;eligible:(id:string)=>boolean;resolveTarget:(value:string)=>string|null;resolveGiftTarget:(value:string)=>string|null;sendGift:(user:{id:string;name:string},body:Record<string,unknown>,scope:string)=>Promise<{ok:boolean;[key:string]:unknown}>;replayGiftBatch?:(user:{id:string;name:string},body:Record<string,unknown>,scope:string)=>{ok:boolean;[key:string]:unknown}|null;replayGift?:(user:{id:string;name:string},body:Record<string,unknown>,scope:string)=>{ok:boolean;[key:string]:unknown}|null;publicId:(id:string)=>string;quoteGift?:(user:{id:string;name:string},body:Record<string,unknown>)=>Promise<{ok:boolean;[key:string]:unknown}>|{ok:boolean;[key:string]:unknown};presentFriends:(id:string,publicIds:string[])=>{id:string;name:string}[]}) {
 const batchReplay=deps.replayGiftBatch;
 const externalSupport=Object.freeze({allowExternalSupport:true});
 const giftTargets=(value:unknown)=>{const values=Array.isArray(value)?value:[value];if(values.length<1||values.length>11||new Set(values).size!==values.length||values.some(v=>typeof v!=='string'||!/^[A-Za-z0-9_-]{16}$/.test(v)))throw new FunctionalHttpError(400,'اختر مستلمين صالحين دون تكرار.');return values.map(v=>{const id=deps.resolveGiftTarget(v as string);if(!id||deps.publicId(id)!==v)throw new FunctionalHttpError(404,'أحد المستلمين غير متاح.');return id;});};
 const permission=(actor:Actor|null,perm:Perm)=>{if(!actor||deps.platform.isBanned(actor.id)||!can(actor.role,perm))throw new FunctionalHttpError(403,'هالصلاحية مب متاحة لحسابك.');return actor;};
 const resolve=(value:unknown)=>{if(typeof value!=='string')throw new FunctionalHttpError(400,'معرّف اللاعب مب صالح.');const id=deps.resolveTarget(value);if(!id)throw new FunctionalHttpError(404,'الحساب مب موجود.');return id;};
 const target=(body:Record<string,unknown>)=>{
  if(body.command==='challenge:start'){
   const teams=body.teams;
   if(!teams||typeof teams!=='object'||Array.isArray(teams)||Object.keys(teams).some(k=>!['blue','red'].includes(k)))throw new FunctionalHttpError(400,'فرق التحدي مب صالحة.');
   const team=(value:unknown)=>{if(!Array.isArray(value)||value.length<1||value.length>5)throw new FunctionalHttpError(400,'اختر من عضو إلى خمسة لكل فريق.');return value.map(v=>{if(typeof v!=='string'||!/^[A-Za-z0-9_-]{16}$/.test(v))throw new FunctionalHttpError(400,'استخدم معرّف المجتمع العام فقط.');const id=deps.resolveGiftTarget(v);if(!id||deps.publicId(id)!==v)throw new FunctionalHttpError(404,'عضو التحدي غير متاح.');return id;});};
   return {...body,teams:{blue:team((teams as Record<string,unknown>).blue),red:team((teams as Record<string,unknown>).red)}};
  }
  // Message/council UUIDs are content references, not account identities.
  if(body.targetId===undefined||body.command==='report:send'&&body.targetType!=='member')return body;
  return {...body,targetId:resolve(body.targetId)};
 };
 const playerView=(userId:string,result:Result)=>{checked(result);const room=result.room as {members?:{id:string}[]}|undefined;return {...result,selfId:deps.publicId(userId),...(room?{friendsPresent:deps.presentFriends(userId,Array.isArray(room.members)?room.members.map(m=>m.id):[])}:{})};};
 http.add('GET','/api/social/rooms',async({user})=>playerView(user.id,await deps.rooms.list(user.id)));
 http.add('GET','/api/social/rooms/:roomId',async({user,params})=>playerView(user.id,await deps.rooms.detail(user.id,params.roomId)));
 http.add('GET','/api/social/config',async({user})=>{const r=checked(await deps.rooms.list(user.id)) as Result;return {ok:true,selfId:deps.publicId(user.id),config:r.config,preferences:r.preferences};});
 http.add('POST','/api/social/rooms/:roomId/gifts/quote',async({user,params,body})=>{
  const allowed=['councilId','to','gift','qty','seen','seenPolicy'];
  if(Object.keys(body).some(k=>!allowed.includes(k))||typeof body.councilId!=='string'||typeof body.gift!=='string'||!body.gift||body.gift.length>128||!Number.isSafeInteger(body.qty)||(body.qty as number)<1||(body.qty as number)>777||!Number.isSafeInteger(body.seen)||(body.seen as number)<=0||typeof body.seenPolicy!=='string'||body.seenPolicy.length>80)throw new FunctionalHttpError(400,'بيانات عرض الهدية مب صالحة.');
  if(!deps.eligible(user.id)||!deps.quoteGift)throw new FunctionalHttpError(403,'عرض الهدية غير متاح.');
  if(body.to!==undefined){const recipients=giftTargets(body.to);return {...checked(await deps.rooms.withGiftBatchAccess(user.id,params.roomId,body.councilId,recipients,async()=>checked(await deps.quoteGift!(user,{...body,to:recipients})),externalSupport)),to:Array.isArray(body.to)?[...body.to].sort():[body.to],roomId:params.roomId,councilId:body.councilId};}
  const detail=checked(await deps.rooms.detail(user.id,params.roomId)) as Record<string,any>;
  if(detail.current?.roomId!==params.roomId||detail.current?.councilId!==body.councilId)throw new FunctionalHttpError(403,'خذ مقعدًا في المجلس الحالي قبل مراجعة العرض.');
  return checked(await deps.quoteGift(user,body));
 });
 http.add('POST','/api/social/rooms/:roomId/gifts',async({user,params,body})=>{
  const allowed=['councilId','to','gift','qty','key','seen','confirm','seenPolicy'];
  if(Object.keys(body).some(k=>!allowed.includes(k))||typeof body.councilId!=='string'||typeof body.gift!=='string'||!body.gift||body.gift.length>128||typeof body.key!=='string'||!body.key.trim()||body.key.length>80||!Number.isSafeInteger(body.qty)||(body.qty as number)<1||(body.qty as number)>777||!Number.isSafeInteger(body.seen)||(body.seen as number)<=0||body.seenPolicy!==undefined&&(typeof body.seenPolicy!=='string'||body.seenPolicy.length>80)||body.confirm!==undefined&&typeof body.confirm!=='boolean')throw new FunctionalHttpError(400,'بيانات طلب الهدية مب صالحة.');
  if(!deps.eligible(user.id))throw new FunctionalHttpError(403,'الهدايا غير متاحة لهذا الحساب.');
  const recipients=giftTargets(body.to);
  const payload={...body,to:Array.isArray(body.to)?recipients:recipients[0]},scope=`social:${params.roomId}:${body.councilId}`;
  const replay=Array.isArray(body.to)?batchReplay:deps.replayGift;
  if(replay){const previous=await deps.rooms.withGiftReplayAccess(user.id,params.roomId,body.councilId,recipients,()=>replay(user,payload,scope));if(previous)return{...checked(previous),roomId:params.roomId,councilId:body.councilId};}
  if(Array.isArray(body.to)){const result=await deps.rooms.withGiftBatchAccess(user.id,params.roomId,body.councilId,recipients,s=>deps.sendGift(user,payload,s),externalSupport);return{...checked(result),roomId:params.roomId,councilId:body.councilId};}
  // Gift recipient accepts ONLY the community public identity, never internal/display IDs or names.
  const recipient=recipients[0];
  if(!recipient)throw new FunctionalHttpError(404,'المستلم غير متاح.');
  const result=await deps.rooms.withGiftAccess(user.id,params.roomId,body.councilId,recipient,scope=>deps.sendGift(user,{...body,to:recipient},scope),externalSupport);
  return {...checked(result),roomId:params.roomId,councilId:body.councilId};
 });
 http.add('POST','/api/social/command',async({user,body})=>{
  if(typeof body.command!=='string')throw new FunctionalHttpError(400,'الأمر الاجتماعي مطلوب.');
  if(!deps.eligible(user.id))throw new FunctionalHttpError(403,'القسم الاجتماعي متاح للحسابات المستوفية لضوابط العمر فقط.');
  const out=checked(await deps.rooms.command(user.id,body.command,target(body)));
  try{if((out as any)?.ok!==false)deps.onCommand?.(user.id,body.command,body);}catch{/* R128: الملخص شكلي */}
  // R58f: تنبيه الأصدقاء إن صاحبهم دخل غرفة
  try{if((body.command==='room:join'||body.command==='room:create')&&(out as any)?.ok!==false){const rid=typeof body.roomId==='string'?body.roomId:typeof (out as any)?.roomId==='string'?(out as any).roomId:null;if(rid)deps.onRoomJoin?.(user.id,rid);}}catch{/* التنبيه شكلي */}
  return out;
 });
 http.add('GET','/api/social/voice',({user})=>{
  if(!deps.eligible(user.id))throw new FunctionalHttpError(403,'القسم الصوتي مب متاح لهالحساب.');
  return checked(deps.voice.ticket(user.id));
 });
 http.add('GET','/api/admin/social',async({actor})=>{
  const a=permission(actor,'social.view');const stats=checked(await deps.rooms.admin(a.id,'stats',{})) as Result;
  const reports=can(a.role,'social.moderate')?checked(await deps.rooms.admin(a.id,'reports:list',{})) as Result:null;
  return {...stats,reports:reports?.reports??reports?.list??[],voice:deps.voice.health(),permissions:{view:true,moderate:can(a.role,'social.moderate'),configure:can(a.role,'social.configure'),ownership:a.role==='owner'}};
 },'support');
 http.add('POST','/api/admin/social',async({actor,body})=>{
  const commands=['config:update','room:close','council:close','room:owner','room:moderator','report:resolve','room:video-off','room:theme-reset'];
  if(typeof body.command!=='string'||!commands.includes(body.command))throw new FunctionalHttpError(400,'الأمر الإداري مب مسموح.');
  const config=body.command==='config:update'||body.command==='room:owner'||body.command==='room:moderator';
  const a=permission(actor,config?'social.configure':'social.moderate');
  if(body.command==='room:owner'&&a.role!=='owner')throw new FunctionalHttpError(403,'نقل الملكية للمالك الإداري فقط.');
  return checked(await deps.rooms.admin(a.id,body.command,target(body)));
 },'support');
 /* R115: لوحة التحكم — مميزات الغرفة (ليفل، رتبة ثابتة، آيدي مميز) للمالك فقط */
 http.add('GET','/api/admin/room-boost',({actor,url})=>{
  if(permission(actor,'social.view').role!=='owner')throw new FunctionalHttpError(403,'للمالك فقط.');
  const q=String(url.searchParams.get('q')??'').trim();if(q.length<1)throw new FunctionalHttpError(400,'اكتب آيدي الغرفة.');
  const r=deps.rooms.findRoom(q);if(!r)throw new FunctionalHttpError(404,'ما لقيت غرفة بهذا الآيدي.');return {ok:true,room:r};
 },'support');
 http.add('POST','/api/admin/room-boost',async({actor,body})=>{
  const a=permission(actor,'social.view');if(a.role!=='owner')throw new FunctionalHttpError(403,'للمالك فقط.');
  const r=deps.rooms.findRoom(String(body.room??''));if(!r)throw new FunctionalHttpError(404,'ما لقيت الغرفة.');
  const b:Record<string,unknown>={roomId:r.id,key:randomUUID(),reason:'admin-boost'};
  if(body.level!==undefined&&body.level!=='')b.level=Number(body.level);
  if(typeof body.tier==='string')b.tier=body.tier;
  if(typeof body.vanity==='string')b.vanity=body.vanity;
  const out=await deps.rooms.admin(a.id,'room:boost',b) as Result;
  if(!out?.ok){const e=String((out as any)?.error??'');const msg:Record<string,string>={room_vanity_taken:'هذا الآيدي مستخدم لغرفة ثانية.',invalid_vanity:'الآيدي لازم أرقام بس (1 إلى 8 أرقام) وما يبدأ بصفر.',invalid_level:'الليفل من 1 إلى 300.',invalid_tier:'الرتبة غير صحيحة.'};throw new FunctionalHttpError(400,msg[e]||'ما تم الحفظ.');}
  return {ok:true,room:deps.rooms.findRoom(r.id)};
 },'support');
 return http;
}
