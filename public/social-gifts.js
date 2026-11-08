import { giftRewardQuote, giftRewardEventQuote, giftRewardCard, giftCurrencyName, giftCurrencyIcon, safeGiftArt } from './gift-reward-ui.js?v=r57';
import {giftTarget, publicGiftCouncils} from './social-gift-context-r33.js?v=complete-r33';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Number(n).toLocaleString('ar-u-nu-latn');
const pencil=()=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 20h9M16 3l5 5M3 21l4-1L20 7a2.1 2.1 0 0 0-3-3L4 17l-1 4Z"/></svg>';
const presets=[1,7,77,777],MAX_TARGETS=11,MAX_TOTAL=1000000;
const amount=n=>Number.isSafeInteger(n)&&n>=0;
const currency=c=>c==='gems'||c==='coins';
const targets=value=>[...new Set((Array.isArray(value)?value:typeof value==='string'&&value?[value]:[]).filter(id=>typeof id==='string'&&id))].sort();
const sameTargets=(a,b)=>JSON.stringify(targets(a))===JSON.stringify(targets(b));
function quantityRange(cat){const r=cat?.socialQuantity;return Number.isSafeInteger(r?.min)&&Number.isSafeInteger(r?.max)&&r.min>=1&&r.max<=777&&r.min<=r.max?r:null;}
function quantityAllowed(cat,q){if(!Number.isSafeInteger(q)||q<1||q>777)return false;const r=quantityRange(cat);return r?q>=r.min&&q<=r.max:Array.isArray(cat?.qty)&&cat.qty.includes(q);}
function parseQuantity(value){const digits=String(value??'').trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0));return /^\d+$/.test(digits)?Number(digits):NaN;}
function historicalTotal(price,qty,count=1){const n=price*qty*count;return Number.isSafeInteger(price)&&price>0&&Number.isSafeInteger(qty)&&qty>0&&Number.isSafeInteger(count)&&count>0&&Number.isSafeInteger(n)?n:null;}
function avatarHTML(p){const initial=Array.from(String(p.name||'').trim())[0]||'';return `<span class="so-gift-recipient-avatar so-avatar">${p.avatar?`<img src="${esc(p.avatar)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`:`<span aria-hidden="true">${esc(initial)}</span>`}</span>`;}
function voiceStatus(snapshot){
 const v=snapshot?.snapshotVoice;if(!v||typeof v!=='object')return 'هدايا الغرفة';
 const state=v.status||v.state,labels={connected:'الصوت متصل',connecting:'جارٍ الاتصال بالصوت',reconnecting:'جارٍ إعادة الاتصال',disconnected:'الصوت غير متصل',error:'تعذر اتصال الصوت',unavailable:'خدمة الصوت غير متاحة',disabled:'الصوت غير مفعل'};
 const status=labels[state];if(!status)return 'هدايا الغرفة';
 return state==='connected'?`${status} · ${snapshot?.current?.muted?'المايك مكتوم إداريًا':v.microphone===true||v.micEnabled===true?'المايك يعمل':'المايك مغلق'}`:status;
}
const ROYAL_MOTIFS=Object.freeze(Object.fromEntries(['crown','car','rocket','palace','diamond','dragon','butterfly'].map(id=>[id,'legacy:'+id])));
/** Only exact legacy IDs AND matching motifs use local posters. Hooks are trusted application code,
 * never catalog HTML. A ready 3D marker requires an explicit parent mapping, not a price/rarity guess. */
export function renderSocialGiftArtwork(gift,hooks={},size=64){
 let html='',mappedReady=false;try{const art=hooks.giftArtwork?.(gift);html=typeof art==='string'?art:art?.nodeType===1&&typeof art.outerHTML==='string'?art.outerHTML:'';mappedReady=!!html&&hooks.gift3DReady?.(gift)===true;}catch{}
 const royal=Object.hasOwn(ROYAL_MOTIFS,gift?.id)&&gift.motif===ROYAL_MOTIFS[gift.id];
 let ready=mappedReady;try{ready=ready||(royal&&(hooks.gift3DReady?.(gift)===true||/data-gift-art-3d=["']true["']/.test(html)));}catch{}
 if(!html&&royal)html=`<img class="so-gift-royal-artwork" src="/assets/gifts-r27/royal-${gift.id}.webp" alt="${esc(gift.name)}" width="${size}" height="${size}" loading="lazy" decoding="async">`;
 if(!html){try{const safe={...gift,name:esc(gift?.name),icon:esc(gift?.icon)};const art=hooks.art?.(safe,size);html=typeof art==='string'?art:art?.nodeType===1&&typeof art.outerHTML==='string'?art.outerHTML:'';}catch{}if(!html)html=safeGiftArt(gift,size);}
 return `<span class="gift-art"${ready?' data-so-gift-3d="true"':''}>${html}</span>`;
}
function validEvent(e){return !!(e&&typeof e.tx==='string'&&e.tx&&typeof e.gift?.id==='string'&&e.gift.id&&typeof e.from?.id==='string'&&typeof e.to?.id==='string'&&e.from.id!==e.to.id&&Number.isSafeInteger(e.qty)&&e.qty>=1&&e.qty<=777&&Number.isFinite(e.ts)&&e.ts>0&&Number.isFinite(new Date(e.ts).getTime())&&giftRewardEventQuote(e));}
function eventHTML(e,compact=false){const full=`<article class="so-gift-receipt" data-so-gift-receipt="${esc(e.tx)}"><div>${giftRewardCard({gift:e.gift,recipient:e.to,qty:e.qty,quote:giftRewardEventQuote(e),confirmed:true,prepaid:e.prepaid===true,compact:true,sender:e.from})}</div><time datetime="${new Date(e.ts).toISOString()}">${esc(new Date(e.ts).toLocaleTimeString('ar-u-nu-latn',{hour:'2-digit',minute:'2-digit'}))}</time></article>`;if(!compact)return full;return `<details class="so-pk-gift-event" data-so-pk-gift-event="${esc(e.tx)}"><summary><span><b>${esc(e.from?.name)}</b> أرسل ${esc(e.gift?.name)} ×${esc(e.qty)} إلى <b>${esc(e.to?.name)}</b></span><small>تفاصيل</small></summary>${full}</details>`;}
function virtualTabs(cat){return (cat?.virtual||[]).filter(c=>['popular','newest','rare'].includes(c?.id));}
function filteredGifts(cat,id){
 const all=cat.gifts||[];if(id==='all')return all;
 if(virtualTabs(cat).some(c=>c.id===id)){
  if(id==='popular')return all.filter(g=>Number.isFinite(g.sent)&&g.sent>0).sort((a,b)=>b.sent-a.sent||a.price-b.price);
  if(id==='newest'){const newest=all.reduce((n,g)=>Number.isFinite(g.added)?Math.max(n,g.added):n,-Infinity);return all.filter(g=>Number.isFinite(g.added)&&g.added===newest);}
  if(id==='rare')return all.filter(g=>Number.isInteger(g.rarity)&&g.rarity>=4);
 }
 return all.filter(g=>g.cat===id);
}
/** Existing server catalog/Wallet adapter; no deductions, reward arithmetic, independent sends or joins. */
export function createSocialGiftStore({ownerId,req,api,hooks={},giftArtwork,onConfirmedGift,art,gift3DReady}){
 hooks={...hooks,...(giftArtwork?{giftArtwork}:{}),...(onConfirmedGift?{onConfirmedGift}:{}),...(art?{art}:{}),...(gift3DReady?{gift3DReady}:{})};
 const storageKey='la3bak:social-gift-pending:'+ownerId;
 const listeners=new Set(),receipts=new Map();let generation=0,quoteGeneration=0,walletRevision=0,opened=false,disposed=false,lastSnapshot=null,quotePromise=null;
 const s={targetCouncil:'',catalog:null,coins:null,gems:null,cat:'all',page:1,gift:null,to:[],qty:1,pending:null,busy:false,sendWaiting:false,loading:false,error:'',success:'',confirm:false,confirmSig:'',result:[],customOpen:false,quantityError:'',quote:null,quoteSig:'',quoteLoading:false};
 const targetFor=snapshot=>giftTarget(snapshot,s.targetCouncil);
 function current(snapshot){const t=targetFor(snapshot);if(!t)return null;return t.external?{id:t.councilId,members:t.recipients}:snapshot.room.councils?.find(c=>c.id===t.councilId);}
 function peer(snapshot){const seen=new Set();return (targetFor(snapshot)?.recipients||[]).filter(p=>p?.id&&p.id!==snapshot.selfId&&!seen.has(p.id)&&seen.add(p.id));}
 function scope(snapshot){const t=targetFor(snapshot);return t?`${t.roomId}:${t.councilId}`:'';}
 function joinedMembers(snapshot){
 const target=targetFor(snapshot);
 if(target?.external)return target.recipients.map(p=>({...p,available:true,hint:'يستقبل الدعم في '+target.name}));
 const eligible=new Set(peer(snapshot).map(p=>p.id)),councils=snapshot?.room?.councils||[],other=new Set();
 for(const c of councils)if(c.id!==targetFor(snapshot)?.councilId)for(const p of c.members||[])other.add(p.id);
 const complete=councils.every(c=>c.privacy==='public'||c.joined===true),seen=new Set();
 const members=[...(Array.isArray(snapshot?.room?.members)?snapshot.room.members:[]),...peer(snapshot)];
 return members.filter(p=>p?.id&&p.id!==snapshot.selfId&&!seen.has(p.id)&&seen.add(p.id)).map(p=>{
  const available=!!scope(snapshot)&&eligible.has(p.id),elsewhere=other.has(p.id)||(p.councilId!=null&&p.councilId!==targetFor(snapshot)?.councilId);
  const unseated=p.councilId===null||(!eligible.has(p.id)&&!elsewhere&&complete);
  return {...p,available,hint:available?'في مجلسك':elsewhere?'في مجلس آخر · غير متاح':unseated?'بلا مقعد · غير متاح':'غير متاح في مجلسك'};
 });
}

 const clone=value=>JSON.parse(JSON.stringify(value));
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
 try{const p=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(p&&typeof p.key==='string'&&p.body&&typeof p.roomId==='string'){s.pending=freeze(p);s.targetCouncil=p.body.councilId;s.gift=p.body.gift;s.to=targets(p.body.to);s.qty=p.body.qty;}}catch{}
 const changed=reason=>{if(!disposed)for(const f of [...listeners])f(reason);};
 function persist(){try{if(s.pending)sessionStorage.setItem(storageKey,JSON.stringify(s.pending));else sessionStorage.removeItem(storageKey);}catch{}}
 function policy(gift){return s.catalog?.policy?.id||presets.map(q=>giftRewardQuote(gift,q)?.policy).find(Boolean)||'';}
 function draft(snapshot){const gift=s.catalog?.gifts?.find(g=>g.id===s.gift);return JSON.stringify([scope(snapshot),targets(s.to),gift?.id,s.qty,gift?.price,gift?.cur||s.catalog?.cur,policy(gift)]);}
 function invalidateQuote(){quoteGeneration++;s.quote=null;s.quoteSig='';s.quoteLoading=false;quotePromise=null;s.confirm=false;s.confirmSig='';}
 function sync(snapshot){
  const before=draft(lastSnapshot);lastSnapshot=snapshot;const peers=peer(snapshot);
  if(!s.pending){s.to=targets(s.to).filter(id=>peers.some(p=>p.id===id));if(s.quoteSig&&s.quoteSig!==draft(snapshot))invalidateQuote();}
  if(s.confirmSig&&s.confirmSig!==draft(snapshot)){s.confirm=false;s.confirmSig='';}
  if(opened&&!s.pending&&before!==draft(snapshot))queueMicrotask(()=>{if(!disposed)void ensureQuote(lastSnapshot);});
 }
 function eligible(snapshot){const ids=targets(s.to);return !!scope(snapshot)&&ids.length>0&&ids.length<=MAX_TARGETS&&ids.every(id=>peer(snapshot).some(p=>p.id===id));}
 function quoteFor(snapshot){return !s.quantityError&&quantityAllowed(s.catalog,s.qty)&&eligible(snapshot)&&s.quoteSig===draft(snapshot)?s.quote:null;}
 function ensureQuote(snapshot){
  if(disposed||s.pending)return Promise.resolve(null);
  const gift=s.catalog?.gifts?.find(g=>g.id===s.gift),sig=draft(snapshot),ids=targets(s.to);
  if(!gift||!eligible(snapshot)||s.quantityError||!quantityAllowed(s.catalog,s.qty))return Promise.resolve(null);
  if(s.quoteSig===sig&&(s.quote||s.quoteLoading))return quotePromise||Promise.resolve(s.quote);
  invalidateQuote();const g=quoteGeneration,revision=walletRevision,qty=s.qty,seenPolicy=policy(gift),cur=gift.cur||s.catalog.cur;
  if(!seenPolicy||!currency(cur)||!Number.isSafeInteger(gift.price)||gift.price<=0){s.error='سعر الهدية أو عملتها أو سياسة الخادم غير متاحة. حدّث الهدايا.';changed('quantity-inline');return Promise.resolve(null);}
  const expectedTotal=historicalTotal(gift.price,qty,ids.length);
  if(expectedTotal===null||expectedTotal>MAX_TOTAL){s.error='الإجمالي يتجاوز الحد الآمن: مليون من عملة الإرسال.';changed('quantity-inline');return Promise.resolve(null);}
  s.quoteSig=sig;s.quoteLoading=true;s.error='';changed('quantity-inline');
  quotePromise=(async()=>{
   try{
    const r=await api('/api/social/rooms/'+encodeURIComponent(targetFor(snapshot).roomId)+'/gifts/quote','POST',{councilId:targetFor(snapshot).councilId,to:ids,gift:gift.id,qty,seen:gift.price,seenPolicy});
    if(disposed||g!==quoteGeneration||s.pending||draft(lastSnapshot)!==sig||!eligible(lastSnapshot))return null;
    const q=giftRewardQuote({rewardQuotes:{[qty]:r?.quote}},qty);
    if(!r?.ok||r.giftId!==gift.id||r.qty!==qty||!q||q.policy!==seenPolicy||q.cur!==cur||q.total!==expectedTotal||q.total>MAX_TOTAL||(r.to!==undefined&&!sameTargets(r.to,ids))||(r.roomId!==undefined&&r.roomId!==targetFor(snapshot).roomId)||(r.councilId!==undefined&&r.councilId!==targetFor(snapshot).councilId)){
     const error=Error(r?.error||'عرض الخادم لا يطابق المستلمين والسعر والكمية الحالية. حدّث البيانات.');error.status=r?.status;throw error;
    }
    // Aggregate reward fields are copied verbatim. Never multiply/round the sender bonus.
    s.quote=freeze(clone(q));if(revision===walletRevision){if(amount(r.coins))s.coins=r.coins;if(amount(r.gems))s.gems=r.gems;}return s.quote;
   }catch(e){if(!disposed&&g===quoteGeneration){s.quote=null;s.error=e.message||'تعذر تحميل عرض المستلمين من الخادم.';}return null;}
   finally{if(!disposed&&g===quoteGeneration){s.quoteLoading=false;quotePromise=null;changed('quantity-inline');}}
  })();return quotePromise;
 }
 async function load(){
  if(s.loading||disposed)return;const g=++generation,revision=walletRevision;s.loading=true;s.error='';changed();
  try{const r=await req('gift:list');if(disposed||g!==generation)return;if(!r?.ok)throw Error(r?.error||'تعذر تحميل الهدايا من الخادم.');s.catalog=r;
   if(revision===walletRevision){s.coins=amount(r.coins)?r.coins:null;s.gems=amount(r.gems)?r.gems:null;}
   if(!s.pending&&!quantityAllowed(r,s.qty))s.qty=(r.qty||[]).find(q=>quantityAllowed(r,q))??quantityRange(r)?.min??1;
   invalidateQuote();void ensureQuote(lastSnapshot);
  }catch(e){if(!disposed&&g===generation){s.error=e.message||'تعذر الاتصال.';s.coins=null;s.gems=null;}}
  finally{if(!disposed&&g===generation){s.loading=false;changed();}}
 }
 function accept(snapshot,event,{dup=event?.dup===true}={}){
  if(disposed||!event||!scope(snapshot)||event.roomId!==targetFor(snapshot).roomId||event.councilId!==targetFor(snapshot).councilId||!validEvent(event.ev))return false;
  const ev=event.ev;if(ev.roomId!==undefined&&ev.roomId!==event.roomId||ev.councilId!==undefined&&ev.councilId!==event.councilId)return false;
  const old=receipts.get(ev.tx),counted=old?.counted===true;
  // Remember before calling the renderer (including dup:true history), preventing reentrant/WS+HTTP FX.
  receipts.set(ev.tx,{scope:scope(snapshot),ev:freeze(clone(ev)),counted:true});while(receipts.size>256)receipts.delete(receipts.keys().next().value);
  if(!counted&&!dup)try{hooks.onConfirmedGift?.(clone(ev),{roomId:event.roomId,councilId:event.councilId,dup});}catch{}
  changed();return true;
 }
 async function send(snapshot,confirmed=false){
  if(s.busy||s.sendWaiting||disposed)return;sync(snapshot);const sc=scope(snapshot);
  if(!sc){s.error='الدعم غير متاح لهالغرفة أو المجلس حاليًا. حدّث بيانات الغرفة.';changed();return;}
  if(s.pending&&`${s.pending.roomId}:${s.pending.body.councilId}`!==sc){s.error='يوجد طلب سابق غير محسوم في مجلس آخر. عد إلى مجلسه لإعادة المحاولة بنفس المفتاح؛ لا ننشئ خصمًا جديدًا.';changed();return;}
  const gift=s.catalog?.gifts?.find(g=>g.id===s.gift);let quote=quoteFor(snapshot);
  if(!s.pending){
   if(!gift||!eligible(snapshot)){s.error='اختر الهدية ومن مستلم واحد إلى 11 مستلمًا من القائمة المتاحة.';changed();return;}
   if(s.quantityError||!quantityAllowed(s.catalog,s.qty)){s.error=s.quantityError||'اختر كمية صحيحة لكل مستلم ضمن حدود الخادم.';changed();return;}
   const sig=draft(snapshot),confirmationMatches=s.confirm&&s.confirmSig===sig;
   if(!quote){s.sendWaiting=true;changed('quantity-inline');try{quote=await ensureQuote(snapshot);}finally{s.sendWaiting=false;}if(disposed)return;
    if(draft(lastSnapshot)!==sig||scope(lastSnapshot)!==sc||!eligible(lastSnapshot)){s.error='تغير المجلس أو المستلمون أو تفاصيل الهدية. راجع العرض قبل الإرسال.';changed();return;}
   }
   if(!quote||!amount(quote.total)||quote.total<=0||quote.total>MAX_TOTAL){s.error=s.error||'عرض الخادم غير صالح للإجمالي الحالي. حدّث قائمة الهدايا.';changed();return;}
   if(!amount(s[quote.cur])||s[quote.cur]<quote.total){s.error=`رصيد ${quote.cur==='gems'?'الجواهر':'العملات'} غير متاح أو لا يكفي للإجمالي.`;changed();return;}
   const threshold=Math.min(10000,Number.isSafeInteger(s.catalog.confirmAt)&&s.catalog.confirmAt>0?s.catalog.confirmAt:10000);
   if(quote.total>=threshold&&(!confirmed||!confirmationMatches)){s.confirm=true;s.confirmSig=sig;changed();return;}
   const ids=targets(s.to);
   s.pending=freeze(clone({roomId:targetFor(snapshot).roomId,key:crypto.randomUUID(),body:{councilId:targetFor(snapshot).councilId,to:ids.length===1?ids[0]:ids,gift:gift.id,qty:s.qty,seen:gift.price,seenPolicy:quote.policy,...(quote.total>=threshold?{confirm:true}:{})},quote,gift,recipient:ids.map(id=>peer(lastSnapshot).find(p=>p.id===id)?.name||id).join('، ')}));persist();
  }
  const p=s.pending;s.busy=true;s.confirm=false;s.confirmSig='';s.error='';s.success='';s.result=[];changed();
  try{
   // Exactly one all-or-nothing API request. Copy immutable saved JSON so transports cannot mutate it.
   const r=await api('/api/social/rooms/'+encodeURIComponent(p.roomId)+'/gifts','POST',{...clone(p.body),key:p.key});
   if(!r?.ok){const err=Error(r?.error||'لم يؤكد الخادم إرسال الهدية.');err.status=r?.status;throw err;}
   if(disposed)return;generation++;walletRevision++;s.loading=false;invalidateQuote();if(amount(r.coins))s.coins=r.coins;if(amount(r.gems))s.gems=r.gems;
   const evs=Array.isArray(r.evs)?r.evs:r.ev?[r.ev]:[];
   s.result=[];s.success=r.dup?'هذا الطلب أُرسل سابقًا، ما تكرر الخصم أو البونص.':'تم تأكيد إرسال الهدية لجميع المستلمين وحفظ أرصدتها الفعلية في الخادم.';
   for(const ev of evs)if(accept(lastSnapshot,{roomId:r.roomId??p.roomId,councilId:r.councilId??p.body.councilId,ev},{dup:r.dup===true}))s.result.push(ev);
   s.pending=null;persist();
   if(r.dup!==true&&s.result.length>0)changed('gift-sent');
  }catch(e){if(disposed)return;const status=e.status||e.response?.status;s.error=e.message||'انقطع الاتصال. أعد المحاولة بنفس المفتاح.';
   // Preserve historical scalar/array bodies and key on every uncertain/lost/429/408 response.
   if(status>=400&&status<500&&status!==408&&status!==429){s.pending=null;persist();}else s.error+=' نحتفظ بنفس الطلب حتى تعيد المحاولة، لمنع الخصم مرتين.';
  }finally{if(!disposed){s.busy=false;changed();}}
 }
 function render(snapshot){
  sync(snapshot);const cat=s.catalog,fixed=!!s.pending||s.busy||s.sendWaiting,members=joinedMembers(snapshot),ids=targets(s.pending?.body.to??s.to),available=members.filter(p=>p.available);
  const target=targetFor(snapshot),supportCouncils=publicGiftCouncils(snapshot);
  const councilPicker=target?.external&&supportCouncils.length>1?`<nav class="so-gift-categories so-gift-support-councils" aria-label="المجلس المستلم للدعم">${supportCouncils.map(c=>`<button type="button" data-so-gift-action="support-council" data-council-id="${esc(c.id)}" aria-pressed="${target.councilId===c.id}" ${fixed?'disabled':''}>${esc(c.name)}</button>`).join('')}</nav>`:'';
  const status=`<p class="so-gift-sheet-status" role="status">${esc(target?.external?'دعم '+target.name+' · بدون دخول أو تشغيل المايك':voiceStatus(snapshot))}</p>${councilPicker}`;
  const allPicked=available.length>0&&available.every(p=>ids.includes(p.id));
  const recipients=`<div class="so-gift-recipient-row"><div class="so-gift-recipient-strip" role="group" aria-label="اختر المستلمين من أعضاء الغرفة، بحد أقصى 11">${members.map(p=>`<button type="button" role="checkbox" id="so-gift-recipient-${esc(p.id)}" class="so-gift-recipient-card${ids.includes(p.id)?' is-picked':''}${!p.available?' is-unavailable':''}" data-so-gift-action="recipient" data-id="${esc(p.id)}" aria-checked="${ids.includes(p.id)}" aria-pressed="${ids.includes(p.id)}" ${fixed||!p.available?'disabled':''} title="${esc(p.hint)}">${avatarHTML(p)}<span class="so-gift-recipient-check" aria-hidden="true">${ids.includes(p.id)?'✓':''}</span><span class="so-gift-recipient-copy"><b>${esc(p.name)}</b><small>${esc(p.hint)}</small></span></button>`).join('')}</div><div class="so-gift-recipient-tools"><button type="button" role="checkbox" data-so-gift-action="recipients-all" aria-checked="${allPicked?'true':available.some(p=>ids.includes(p.id))?'mixed':'false'}" ${fixed||!available.length||available.length>MAX_TARGETS?'disabled':''}>${allPicked?'إلغاء الكل':'تحديد الكل'}</button><span data-so-gift-recipient-count>${nf(ids.length)} / ${MAX_TARGETS}</span></div></div>`;
  const hint=!target?'<p class="so-note so-gift-seat-hint">الدعم غير متاح حاليًا. الغرف والمجالس الخاصة لا تُفتح للدعم الخارجي.</p>':!members.length?'<p class="so-note so-gift-seat-hint">لا يوجد مستلم مؤهل آخر في المجلس المختار الآن.</p>':target.external?'<p class="so-note so-gift-seat-hint">تقدر تدعم المستلمين الظاهرين بدون أخذ مقعد أو تغيير غرفتك الحالية. الخادم يتحقق من المستلمين والخصوصية والسعر قبل الخصم.</p>':!available.length?'<p class="so-note so-gift-seat-hint">لا يوجد مستلم آخر ظاهر في مجلسك الحالي.</p>':available.length>MAX_TARGETS?'<p class="so-note">اختر حتى 11 مستلمًا يدويًا.</p>':'';
  if(!cat)return `<section class="so-gift-shop so-gift-reference-r28" dir="rtl">${status}${recipients}${hint}<div class="so-gift-empty"><p role="status">${esc(s.error||'جاري تحميل هدايا الخادم…')}</p><button type="button" class="so-button" data-so-gift-action="reload" ${s.loading||fixed?'disabled':''}>إعادة التحميل</button></div></section>`;
  const filtered=filteredGifts(cat,s.cat),gifts=filtered.slice(0,s.page*32),selected=s.pending?.gift||cat.gifts?.find(g=>g.id===s.gift),range=quantityRange(cat);
  const q=s.pending?(s.pending.body.seenPolicy&&s.pending.quote?.policy===s.pending.body.seenPolicy?giftRewardQuote({rewardQuotes:{[s.qty]:s.pending.quote}},s.qty):null):quoteFor(snapshot);
  const total=q?.total??(s.pending?historicalTotal(s.pending.body.seen,s.pending.body.qty,ids.length):null),cur=q?.cur||(s.pending?!s.pending.body.seenPolicy?'coins':s.pending.gift?.cur: selected?.cur||cat.cur),balance=currency(cur)?s[cur]:null;
  const recipient=s.pending?.recipient||ids.map(id=>peer(snapshot).find(p=>p.id===id)?.name||id).join('، '),qty=s.pending?.body.qty??s.qty;
  let preview=selected?giftRewardCard({gift:selected,recipient,qty,quote:q,pending:!!s.pending,cost:currency(cur)?total:null,costCur:currency(cur)?cur:'coins'}):'<p class="so-note">اختر الهدية والمستلمين لمراجعة العملات والبونص من الخادم.</p>';
  if(ids.length>1)preview=preview.replace('يحصل المستلم على','إجمالي العملات للمستلمين').replace('بونص</span>','بونص إجمالي</span>');
  const summary=`<p class="so-gift-batch-summary" data-so-gift-batch-summary>الكمية لكل مستلم: <strong>${nf(qty)}</strong> · عدد المستلمين: <strong>${nf(ids.length)}</strong> · الإجمالي لجميع المستلمين: <strong>${total===null||!currency(cur)?'بانتظار عرض خادمي صالح':nf(total)+' '+giftCurrencyName(cur)}</strong></p>`;
  const valid=!!selected&&eligible(snapshot)&&quantityAllowed(cat,s.qty)&&!s.quantityError;
  const canSend=!s.busy&&!s.sendWaiting&&!!scope(snapshot)&&(s.pending?`${s.pending.roomId}:${s.pending.body.councilId}`===scope(snapshot):valid&&!!q&&q.total<=MAX_TOTAL&&amount(balance)&&balance>=q.total);
  const customShown=s.customOpen||(!presets.includes(s.qty)&&!!range),balanceCur=currency(cat.cur)?cat.cur:null;
  const sendLabel=s.busy||s.sendWaiting?'جارٍ التأكيد…':s.pending?'إعادة نفس الطلب':s.quoteLoading?'بانتظار العرض':'إرسال';
  const sendButton=`<button type="button" id="so-gift-send" class="so-button so-primary so-gift-send-inline" data-so-gift-action="send" aria-label="${esc(selected?sendLabel+' '+selected.name+' لجميع المستلمين المختارين':'اختر الهدية والمستلمين أولًا')}" ${canSend?'':'disabled'}>${sendLabel}</button>`;
  const selectedInGrid=gifts.some(g=>g.id===s.gift);
  const quoteSummary=q?`<span>المستلمون:</span><strong>${giftCurrencyIcon(q.rewardCur)} ${nf(q.recv)}</strong>${amount(q.senderBonus)?`<span>بونص المرسل:</span><strong>${giftCurrencyIcon(q.rewardCur)} ${nf(q.senderBonus)}</strong>`:''}`:'<span>اختر الهدية والمستلمين لمراجعة عرض الخادم</span>';
  // The grid lives inside the existing footer so its inline send button is updated
  // by the room's quantity-inline patch, without replacing a pressed control.
  return `<section class="so-gift-shop so-gift-reference-r28" dir="rtl">${status}${recipients}${hint}
   <nav class="so-gift-categories" aria-label="تصنيفات الهدايا">${[{id:'all',name:cat.virtual?.find(c=>c.id==='all')?.name||'الكل'},...virtualTabs(cat),...(cat.cats||[])].map(c=>`<button type="button" data-so-gift-action="category" data-category="${esc(c.id)}" aria-pressed="${s.cat===c.id}" ${fixed?'disabled':''}>${esc(c.name)}</button>`).join('')}</nav>
   <footer class="so-gift-footer">
   <details class="gr13-checkout-preview so-gift-quote-details"><summary class="so-gift-quote-summary">${quoteSummary}<span class="so-gift-quote-disclosure" aria-label="تفاصيل إجمالي الإرسال ومكافآته">⌄</span></summary><div class="so-gift-quote-expanded">${summary}${preview}<p class="so-note so-gift-policy">الهدايا والأسعار ومكافآت العملات والأرصدة من الخادم فقط. الإرسال لجميع المستلمين طلب واحد كامل؛ لا توجد إرساليات جزئية.</p></div></details>
   <div class="so-gift-catalog" role="group" aria-label="هدايا الخادم">${gifts.map(g=>`<article class="so-gift-card${s.gift===g.id?' is-picked':''}" data-so-gift-card="${esc(g.id)}"><button type="button" id="so-gift-item-${esc(g.id)}" class="so-gift-item${s.gift===g.id?' is-picked':''}" data-so-gift-action="pick" data-gift="${esc(g.id)}" aria-pressed="${s.gift===g.id}" ${fixed?'disabled':''}>${renderSocialGiftArtwork(g,hooks)}<b>${esc(g.name)}</b><small aria-label="${esc(currency(g.cur||cat.cur)&&Number.isSafeInteger(g.price)&&g.price>0?nf(g.price)+' '+giftCurrencyName(g.cur||cat.cur):'السعر أو العملة غير متاح')}">${currency(g.cur||cat.cur)&&Number.isSafeInteger(g.price)&&g.price>0?giftCurrencyIcon(g.cur||cat.cur)+' '+nf(g.price):'السعر أو العملة غير متاح'}</small></button>${s.gift===g.id?sendButton:''}</article>`).join('')}</div>
   ${gifts.length<filtered.length?`<button type="button" class="so-button" data-so-gift-action="more" ${fixed?'disabled':''}>عرض المزيد من الهدايا</button>`:''}
   ${!gifts.length?`<div class="so-gift-empty so-gift-empty-category" role="status"><p>${s.cat==='popular'?'لا توجد هدايا مُرسلة فعلًا لتحديد الأكثر شعبية بعد.':'لا توجد هدايا متاحة في هذا التصنيف.'}</p></div>`:''}
   ${s.pending?'<p class="so-note">طلب غير محسوم: نفس الهدية والمستلمين والكمية والمفتاح محفوظة لإعادة المحاولة بأمان. سياسة الطلب القديم لا تتغير عند إعادة التحميل.</p>':''}
   ${s.error?`<p class="so-gift-error" role="alert">${esc(s.error)}</p>`:''}${s.success?`<p class="so-gift-success" role="status">${esc(s.success)}</p>`:''}
    <div class="so-gift-bottom-bar"><div class="so-gift-quantities" dir="rtl" role="group" aria-label="كمية الهدية لكل مستلم">${presets.map(qty=>`<button type="button" id="so-gift-quantity-${qty}" data-so-gift-action="quantity" data-quantity="${qty}" aria-pressed="${s.qty===qty}" ${fixed||!quantityAllowed(cat,qty)?'disabled':''}>${qty}</button>`).join('')}<button type="button" id="so-gift-custom-toggle" class="so-gift-custom" data-so-gift-action="custom-toggle" aria-label="إدخال كمية مخصصة لكل مستلم" aria-expanded="${customShown}" aria-controls="so-gift-custom-quantity" ${fixed||!range?'disabled':''} title="${range?'كمية مخصصة ضمن حدود الخادم':'الكمية المخصصة غير متاحة من الخادم'}">${pencil()}</button></div>
    <div class="so-gift-checkout"><div class="so-gift-balance" aria-label="رصيدك الفعلي المتاح ${esc(balanceCur?giftCurrencyName(balanceCur):'العملة غير متاحة')}">${balanceCur?giftCurrencyIcon(balanceCur):''}<strong data-so-gift-balance data-currency="${esc(balanceCur||'')}">${!balanceCur||s[balanceCur]===null?'غير متاح':nf(s[balanceCur])}</strong></div><p class="so-gift-total">الإجمالي: <strong data-so-gift-total>${total===null||!currency(cur)?'بانتظار عرض خادمي صالح':nf(total)+' '+giftCurrencyName(cur)}</strong></p>${selected?`<span class="so-gift-selected-name">${esc(selected.name)} × ${nf(qty)} لكل مستلم</span>`:''}</div></div>
    ${!selectedInGrid?`<div class="so-gift-send-fallback${selected?'':' is-empty'}">${selected?`<span>${esc(selected.name)}</span>`:''}${sendButton}</div>`:''}
    ${customShown&&range?`<label class="so-gift-custom-label" for="so-gift-custom-quantity">كمية مخصصة لكل مستلم (${nf(range.min)}–${nf(range.max)})<input type="text" id="so-gift-custom-quantity" name="socialGiftQuantity" class="so-gift-custom-quantity" data-so-gift-action="quantity-custom" inputmode="numeric" pattern="[0-90-90-9]+" min="${range.min}" max="${range.max}" maxlength="12" autocomplete="off" value="${esc(s.qty)}" aria-invalid="${!!s.quantityError}" ${fixed?'disabled':''}></label>`:''}
    <p class="so-gift-quote-status" data-so-gift-quote-status role="status">${s.quoteLoading?'جارٍ تحميل عرض إجمالي المستلمين والكمية لكل مستلم من الخادم…':''}</p>
   </footer>
   ${s.result.map(ev=>giftRewardCard({gift:ev.gift,recipient:ev.to,qty:ev.qty,quote:giftRewardEventQuote(ev),confirmed:true,prepaid:ev.prepaid===true,compact:true,sender:ev.from})).join('')}
   ${s.confirm?`<div class="so-gift-confirm" role="dialog" aria-modal="true" aria-labelledby="so-gift-confirm-title"><h3 id="so-gift-confirm-title">تأكيد إجمالي إرسال الهدية لجميع المستلمين</h3>${summary}${preview}<button type="button" id="so-gift-confirm-send" class="so-button so-primary" data-so-gift-action="confirm" ${canSend?'':'disabled'}>تأكيد الإرسال للجميع</button><button type="button" id="so-gift-confirm-cancel" class="so-button" data-so-gift-action="cancel">إلغاء</button></div>`:''}
  </section>`;
 }
 return {render,open(snapshot){sync(snapshot);opened=true;void load();},close(){opened=false;s.confirm=false;s.confirmSig='';},onChange(cb){listeners.add(cb);return()=>listeners.delete(cb);},events(snapshot,options={}){sync(snapshot);return [...receipts.values()].filter(r=>r.scope===scope(snapshot)).slice(-60).map(r=>eventHTML(r.ev,options.compact===true)).join('');},receive(event){accept(lastSnapshot,event);},accept,
  handle(e,snapshot){
   if(disposed)return false;sync(snapshot);const el=e.target.closest?.('[data-so-gift-action]');if(!el)return false;const action=el.dataset.soGiftAction,isInput=el.tagName==='INPUT'||el.tagName==='SELECT';
   // Never replace focused input while typing; change commits before the same send click. No focus calls.
   if(isInput?e.type!=='change':e.type!=='click')return true;e.preventDefault();if(el.disabled)return true;
   if(action==='send'||action==='confirm'){void send(snapshot,action==='confirm');return true;}if(action==='cancel'){s.confirm=false;s.confirmSig='';changed();return true;}
   if(s.busy||s.pending||s.sendWaiting){s.error='انتظر حسم الطلب السابق قبل تغيير تفاصيله.';changed();return true;}
   if(action==='reload'){void load();return true;}
   if(action==='support-council'){const id=el.dataset.councilId;if(!publicGiftCouncils(snapshot).some(c=>c.id===id))return true;s.targetCouncil=id;s.to=[];invalidateQuote();s.error='';s.success='';s.result=[];sync(snapshot);changed();return true;}
   if(action==='quantity'||action==='quantity-custom'){
    const qty=parseQuantity(action==='quantity'?el.dataset.quantity??el.value:el.value);
    if(action==='quantity-custom'&&!quantityRange(s.catalog)||!quantityAllowed(s.catalog,qty)){
     const r=quantityRange(s.catalog);s.quantityError=r?`أدخل عددًا صحيحًا لكل مستلم من ${nf(r.min)} إلى ${nf(r.max)}.`:'اختر إحدى الكميات المعتمدة من الخادم.';s.error=s.quantityError;invalidateQuote();el.setAttribute?.('aria-invalid','true');changed(action==='quantity-custom'?'quantity-inline':undefined);return true;
    }
    s.qty=qty;s.quantityError='';if(action==='quantity')s.customOpen=false;
   }
   if(action==='custom-toggle'){if(!quantityRange(s.catalog))return true;s.customOpen=!s.customOpen;}
   if(action==='recipient'){
    const id=el.dataset.id??el.value;if(!peer(snapshot).some(p=>p.id===id)||!scope(snapshot))return true;const ids=targets(s.to);
    if(ids.includes(id))s.to=ids.filter(x=>x!==id);else if(ids.length<MAX_TARGETS)s.to=targets([...ids,id]);else{s.error='الحد الأقصى 11 مستلمًا. ألغِ اختيار مستلم قبل إضافة آخر.';changed();return true;}
   }
   if(action==='recipients-all'){
    const ids=targets(peer(snapshot).map(p=>p.id));if(!scope(snapshot)||!ids.length||ids.length>MAX_TARGETS){s.error='تحديد الكل غير متاح؛ الحد الأقصى 11 مستلمًا من المجلس المختار.';changed();return true;}
    s.to=ids.every(id=>targets(s.to).includes(id))?[]:ids;
   }
   if(action==='category'){if(el.dataset.category!=='all'&&![...(s.catalog?.cats||[]),...virtualTabs(s.catalog)].some(c=>c.id===el.dataset.category))return true;s.cat=el.dataset.category;s.page=1;}
   if(action==='more')s.page++;if(action==='pick'){if(!s.catalog?.gifts?.some(g=>g.id===el.dataset.gift))return true;s.gift=el.dataset.gift;}
   if(s.quoteSig&&s.quoteSig!==draft(snapshot))invalidateQuote();s.confirm=false;s.confirmSig='';s.error='';s.success='';s.result=[];
   void ensureQuote(snapshot);changed(action==='quantity-custom'?'quantity-inline':undefined);return true;
  },wallet(message){let updated=false;for(const cur of ['coins','gems'])if(amount(message?.[cur])){s[cur]=message[cur];updated=true;}if(updated){walletRevision++;if(opened)changed();}},destroy(){disposed=true;opened=false;generation++;invalidateQuote();listeners.clear();receipts.clear();s.catalog=null;s.coins=null;s.gems=null;s.result=[];}};
}
