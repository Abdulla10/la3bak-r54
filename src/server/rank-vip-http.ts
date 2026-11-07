import {FunctionalHttp,FunctionalHttpError,type FunctionalContext} from './functional-http.js';
import type {Actor} from './admin.js';
import {StorageError} from './datafile.js';
/** Thin bridge over current authenticated router; current Wallet and Progression remain sole authorities. */
export interface RankVipHttpServices {
 rankPage(id:string):unknown; standings(id:string,url:URL):unknown;
 adminRanks(url:URL):unknown; season(body:Record<string,unknown>,actor:Actor):unknown;
 membership(id:string):unknown; preview(id:string,body:Record<string,unknown>):unknown;
 purchase(id:string,body:Record<string,unknown>):unknown|Promise<unknown>;
 adminMembership(url:URL,actor:Actor):unknown; configureMembership(body:Record<string,unknown>,actor:Actor):unknown;
 member(id:string,actor:Actor):unknown; refund(id:string,body:Record<string,unknown>,actor:Actor):unknown|Promise<unknown>;
 audit(actor:Actor,action:string,target:string):boolean; refresh(id:string):void;
}
function need(value:unknown,message:string,status=400):asserts value {if(!value)throw new FunctionalHttpError(status,message);}
const only=(body:Record<string,unknown>,allowed:string[])=>need(Object.keys(body).every(k=>allowed.includes(k)),'الطلب يحتوي حقول غير مسموحة.');
function operation(body:Record<string,unknown>) {need(typeof body.key==='string'&&/^[A-Za-z0-9:_-]{8,80}$/.test(body.key)&&!['__proto__','constructor','prototype'].includes(body.key),'معرّف العملية مطلوب.');need(typeof body.reason==='string'&&body.reason.trim().length>=3&&body.reason.length<=180,'اكتب سبب واضح للعملية.');}
function duplicate(out:unknown) {return !!out&&typeof out==='object'&&('duplicate' in out&&out.duplicate===true||'dup' in out&&out.dup===true);}
function actor(ctx:FunctionalContext):Actor {need(ctx.actor,'تسجيل الإدارة مطلوب.',401);return ctx.actor;}
function safeError(e:unknown):never {
 if(e instanceof FunctionalHttpError)throw e;
 const value=e as {status?:number;code?:string};
 if(e instanceof StorageError||value.status===503)throw new FunctionalHttpError(503,'تعذّر إكمال العملية الحين. ممكن تكون محفوظة جزئيًا؛ أعد المحاولة بنفس معرّف الطلب فقط، وراجع سجل الطلبات قبل أي شراء يديد.');
 if(value.code?.includes('xp_reversal_unsupported'))throw new FunctionalHttpError(409,'الاسترجاع مقفول: يلزم عكس خبرة VIP والمدة بأمان قبل رد المحفظة.');
 const status=value.status&&value.status>=400&&value.status<=499?value.status:400;
 throw new FunctionalHttpError(status,status===409?'الطلب متعارض أو بانتظار الاستكمال. استخدم نفس بيانات الطلب ومعرّفه.':'بيانات العضوية أو إعداداتها مب صالحة؛ راجع الباقة والاعتماد والرصيد.');
}
export function wireRankVipRoutes(http:FunctionalHttp,d:RankVipHttpServices) {
 http.add('GET','/api/rank-vip',({user})=>d.rankPage(user.id));
 http.add('GET','/api/rank-vip/standings',({user,url})=>d.standings(user.id,url));
 http.add('GET','/api/vip-membership',({user})=>d.membership(user.id));
 http.add('POST','/api/vip-membership/preview',({user,body})=>{only(body,['packageId']);need(typeof body.packageId==='string','اختر باقة صحيحة.');try{return d.preview(user.id,body);}catch(e){safeError(e);}});
 http.add('POST','/api/vip-membership/purchase',async({user,body})=>{only(body,['packageId','fingerprint','key']);need(typeof body.key==='string'&&/^[A-Za-z0-9:_-]{8,80}$/.test(body.key),'معرّف العملية مطلوب.');need(typeof body.packageId==='string'&&typeof body.fingerprint==='string','راجع الباقة قبل تأكيد الشراء.');try{const out=await d.purchase(user.id,body);d.refresh(user.id);return out;}catch(e){safeError(e);}});
 http.add('GET','/api/admin/rank-vip',({url})=>d.adminRanks(url),'owner');
 http.add('POST','/api/admin/rank-vip/season',ctx=>{only(ctx.body,['action','id','name','startAt','endAt','carry','key','reason']);operation(ctx.body);need(ctx.body.action==='create','البداية والنهاية حسب مواعيد الموسم المعتمدة.');const out=d.season(ctx.body,actor(ctx));return {...out as object,auditOk:duplicate(out)||d.audit(actor(ctx),'rank.season',String(ctx.body.id))};},'owner');
 http.add('GET','/api/admin/vip-membership',ctx=>d.adminMembership(ctx.url,actor(ctx)),'owner');
 http.add('POST','/api/admin/vip-membership/config',ctx=>{only(ctx.body,['config','reason','key']);operation(ctx.body);try{const out=d.configureMembership(ctx.body,actor(ctx));return {...out as object,auditOk:duplicate(out)||d.audit(actor(ctx),'vip.configure','سياسة العضوية والباقات')};}catch(e){safeError(e);}},'owner');
 http.add('GET','/api/admin/vip-membership/player/:id',ctx=>d.member(ctx.params.id,actor(ctx)),'owner');
 http.add('POST','/api/admin/vip-membership/orders/:id/refund',async ctx=>{only(ctx.body,['reason','key']);operation(ctx.body);try{return await d.refund(ctx.params.id,ctx.body,actor(ctx));}catch(e){safeError(e);}},'owner');
 return http;
}
