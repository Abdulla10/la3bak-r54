// room-tools-r33: imports
import {roomRankPageHTML,tierChip,welcomeHTML,perkActive,tierIndex as rankTierIndex} from './room-rank-r58.js?v=r63a';
import {createRoomToolsR33} from '../social-room-tools-r33.js?v=r58p';
import {SOCIAL_GAME_LABELS_R47,renderSocialGame,normalizeSocialGameActionR47,createSocialGamesR47} from '../social-games-r47.js?v=r58p';
import {renderUpgradePanel,roomUpgradeConfirmationR47,roomUpgradeErrorR47} from '../room-upgrade-r47.js?v=build-all-r47';
import {roomPhotoFields,createRoomPhotoPicker} from '../room-photo-r31.js?v=room-photo-r31';
import {renderDirectory,renderCreateFields,validateCreate} from '../social-directory-r30.js?v=r63a';
import {createOwnerRoomStart,confirmedOwnerSeat,startOwnerVoice,ownerStartFeedback} from '../room-start-r33.js?v=room-owner-start-r33';
import {themeName,themeCards,applyRoomTheme,seatLockCards} from '../social-room-controls-r27.js?v=r58s';
import {framed as frameOwnedPortrait} from '../shop.js?v=r63b';
import { createEntranceFX } from '../entrancefx-r23.js?v=r58r';
import { createSocialChallenge, renderSetup, validateTeams, preserveScorebar } from '../social-challenge.js?v=r57';
import {attachGiftRuntime,receiveGiftRuntime,clearGiftRuntime,giftRuntimeMetrics,giftArtwork} from '../social-gift-runtime-r27.js?v=r63a';
import {cannon3Shortcut,cannon3Panel,cannon3Blast} from './room-cannon-r59.js?v=r67g';
import {cannonPanel,cannonShortcut,createCannonEffects} from '../social-cannon-ui-r27.js?v=r63b';
/* Social rooms only. Parent owns routes, session, authenticated api and shell.
 * The live controller outlives DOM mounts. No implicit room/council join on render. */
import { mini as avatarMini } from '../avatars.js?v=r59d';
import { effectStyle as rankEffects } from '../rank-perks-r56.js?v=r58i';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr = value => Array.isArray(value) ? value : [];
const FRIENDLY = {moderation_profanity:'النص فيه كلام غير لائق؛ عدّله وحاول مرة ثانية.',moderation_link:'الروابط والمواقع الخارجية ممنوعة هنا.',moderation_contact:'أرقام الجوال والبريد وحسابات التواصل ممنوعة هنا.',moderation_impersonation:'ما يصير الاسم يوحي إنه من الإدارة أو الدعم.',moderation_spam:'النص فيه تكرار مزعج؛ اختصره.',room_vanity_not_owned:'لازم تملك أيدي الغرفة من المتجر أول.',room_vanity_taken:'هذا الرقم مستخدم لغرفة ثانية.',invalid_room_ads:'الإعلانات غير صالحة (حد أقصى 10 إعلانات، 200 حرف لكل إعلان).',cannon_award_pending:'فيه جائزة مدفع للحين ما انصرفت لصاحبها؛ انتظر شوي وحاول مرة ثانية.',game_room_delete_unavailable:'هذي غرفة مربوطة بلعبة وما تنحذف من هنا.',invalid_room_delete:'طلب الحذف غير صالح.',room_follow_capacity:'وصلت الحد الأعلى للغرف المحفوظة؛ شيل وحدة قبل.',social_ineligible:'المجالس متاحة للبالغين فقط. بيانات حسابك لا تسمح بالدخول الآن؛ راجع إعدادات الحساب أو الدعم.',adult_acknowledgement_required:'نحتاج إقرارك الصريح بالبلوغ قبل دخول المجالس.',social_disabled:'الغرف الاجتماعية متوقفة مؤقتًا من الإدارة.',game_voice_closed:'أُغلقت الغرفة أو المجلس المرتبط بهذه اللعبة. اللعبة نفسها محفوظة.',room_access_denied:'دخول الغرفة الصوتية غير متاح لهذا الحساب.',council_access_denied:'دخول المجلس الصوتي غير متاح لهذا الحساب.',invitations_disabled:'استقبال الدعوات مقفل في إعدادات الخصوصية.',council_capacity:'المجلس الصوتي ممتلئ حاليًا؛ اللعبة ما زالت متاحة.',room_capacity:'بلغت الغرف الاجتماعية سعتها المتاحة.',invalid_seats:'سعة اللعبة الحالية غير مدعومة في المجلس الصوتي.',room_not_found:'الغرفة غير متاحة لك أو أُغلقت.',council_not_found:'المجلس غير متاح أو أُغلق.',council_membership_required:'خذ مقعدًا في مجلس أولًا.',moderator_required:'هذا الإجراء متاح لصاحب المجلس أو المشرف فقط.',owner_required:'هذا الإجراء لمالك الغرفة فقط.',target_not_found:'لم نجد اللاعب بهذا المعرف. تحقق من رقم اللاعب.',previous_council_unavailable:'المجلس السابق لم يعد متاحًا.',social_storage_or_dependency_unavailable:'الخدمة غير متاحة مؤقتًا. حدّث الحالة قبل إعادة المحاولة.'};
const friendly = value => FRIENDLY[String(value)]||String(value||'تعذر تنفيذ الطلب.');
const MODES = {table:['سوالف على الطاولة','بطاقة تفتح حديثًا جميلًا.'],anonymous:['الرسالة المجهولة','شارك بأمان؛ كشف الهوية باختيار المرسل فقط.'],topics:['الموضوع يتغير','اقترح وصوّت، دون قطع حديث المجلس.'],understand:['من يفهمني؟','توقعات لطيفة، لا تقييم ولا إحراج.'],quiet:['الوقت الصامت','استمع أو اكتب؛ المشاركة دائمًا اختيارية.'],hotseat:['المقعد الساخن','دور اختياري، وسؤال يمكن تخطيه دائمًا.'],...SOCIAL_GAME_LABELS_R47};
const KINDS = {public:'مجلس عام',pair:'مجلس ثنائي',group:'مجلس جماعي',private:'مجلس خاص',quiet:'مجلس هادئ'};
const REACTIONS = {like:'أعجبني',heart:'محبة',laugh:'لطيفة',agree:'أتفق',support:'دعم'};
const PATHS = {plus:'M12 5v14M5 12h14',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',lock:'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',mic:'M12 16a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v8a3 3 0 0 0 3 3M5 10v3a7 7 0 0 0 14 0v-3M12 20v3M8 23h8',off:'M2 2l20 20M9 9v4a3 3 0 0 0 5 2M15 9V5a3 3 0 0 0-6 0M5 10v3a7 7 0 0 0 12 5M19 10v3M12 20v3M8 23h8',star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',arrow:'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',chair:'M6 11V5h12v6M4 11h16v7H4zM6 18v4M18 18v4',shield:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6zM8 12l3 3 5-6',chat:'M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4',close:'M6 6l12 12M18 6 6 18',volume:'M11 4 6 8H2v8h4l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14',person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3'};
const icon = name => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name] || PATHS.chat}"/></svg>`;
PATHS.gift='M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3ZM12 8h4a3 3 0 1 0-3-3l-1 3Z';
PATHS.info='M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0';
PATHS.share='M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8';
PATHS.back='M5 12h14m-6-6 6 6-6 6';
PATHS.invite='M9 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10M1 22v-2a7 7 0 0 1 14 0v2M19 8v8M15 12h8';
PATHS.smile='M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M8 9h.01M16 9h.01M7 14a5 5 0 0 0 10 0';
PATHS.send='m3 3 18 9-18 9 4-9-4-9ZM7 12h14';
PATHS.menu='M4 6h16M4 12h16M4 18h16';
PATHS.heart='M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.1 5 2.9 1.4-1.8 2.9-2.9 5-2.9 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21Z';
PATHS.palette='M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.4-9-7.4ZM7.5 12h.01M9.5 8h.01M14.5 8h.01M17 11h.01';
PATHS.trash='M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3';
PATHS.broom='M14 4l6 6M9 9l6 6M4 20l5-11 6 6-11 5ZM7 15l2 2';
PATHS.lock='M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4';
PATHS.minimize='M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7';
PATHS.exit='M9 21H5V3h4M16 17l5-5-5-5M21 12H9';
PATHS.more='M5 12h.01M12 12h.01M19 12h.01';
PATHS.expand='M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5';
PATHS.down='m5 9 7 7 7-7';
PATHS.chevronLeft='m15 5-7 7 7 7';
PATHS.chevronRight='m9 5 7 7-7 7';
PATHS.cover='M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M9 7h.01';
const crown = () => `<svg class="so-crown" viewBox="0 0 40 28" fill="none" aria-hidden="true"><path d="m4 8 9 7 7-12 7 12 9-7-4 16H8Z" fill="currentColor" stroke="#fff0ad" stroke-width="1.2"/><path d="M9 21h22" stroke="#9c5714" stroke-width="1.7"/><circle cx="4" cy="6" r="2" fill="currentColor"/><circle cx="20" cy="2" r="2" fill="currentColor"/><circle cx="36" cy="6" r="2" fill="currentColor"/><path d="m20 13 2 3-2 3-2-3Z" fill="#bb3985"/></svg>`;
const uuid = () => { if (!globalThis.crypto?.randomUUID) throw Error('تعذر إنشاء مفتاح آمن للطلب.'); return crypto.randomUUID(); };
const identity = ctx => String(ctx?.user?.id ?? ctx?.user?.uid ?? ctx?.user?.pub ?? ctx?.me?.id ?? '');
const roomURL = id => `#/social-room/${encodeURIComponent(String(id))}`;
const safeImage = value => { if(typeof value!=='string'||!value.trim())return '';try { const url = new URL(String(value), location.origin); return (url.protocol === 'https:' || (url.origin === location.origin && url.protocol === location.protocol)) && !url.username && !url.password ? url.href : ''; } catch { return ''; } };
const storage = {get(k){try{return sessionStorage.getItem(k);}catch{return null;}},set(k,v){try{sessionStorage.setItem(k,v);}catch{}},remove(k){try{sessionStorage.removeItem(k);}catch{}}};
let live = null;
function newController(ctx) {
  const c = {uid:identity(ctx),api:ctx.api,ctx,epoch:0,readSeq:0,routeRoom:'',snapshot:null,list:null,config:null,loading:false,busy:false,error:'',notice:'',pending:null,listeners:new Set(),voice:null,voiceTarget:'',voiceState:{status:'disconnected',microphone:false},speakers:new Set(),voiceBusy:false,ambient:null,ambientVolume:.25,ambientOn:false,selectedMode:'table'};
  c.drafts=new Map();
  c.directoryUI={tab:'all',mineTab:'recent',category:'all',country:'',query:'',searchOpen:false};
  c.entranceFX=createEntranceFX({getHost:()=>c.entranceHost,getScope:()=>c.routeRoom});
  c.challengeModel={available:false};
  c.challengeUI=createSocialChallenge({getHost:()=>c.challengeHost,getModel:()=>c.challengeModel,renderMember:m=>challengeMemberHTML(m,c)});
  c.cannonFX=!ctx.gameRoom?createCannonEffects(()=>c.ctx.gameRoom?null:c.entranceHost):null;
  c.storageKey = `la3bak:social:pending:${encodeURIComponent(c.uid)}`;
  try { const p=JSON.parse(storage.get(c.storageKey)||'null'); if(p?.command && typeof p.key==='string' && p.owner===c.uid) c.pending=p; } catch { storage.remove(c.storageKey); }
  c.creationStorageKey=`la3bak:social:owner-create-r33:${encodeURIComponent(c.uid)}`;
  try {const saved=JSON.parse(storage.get(c.creationStorageKey)||'null');if(saved?.owner===c.uid&&saved?.state?.version===33&&saved.state.keys)c.creationRecord=saved.state;}catch {storage.remove(c.creationStorageKey);}
  c.notify = () => c.listeners.forEach(fn => fn());
  // DOM remounts keep the live controller, but page navigation must stop its GETs.
  // Otherwise socket invalidations can fetch from a document WebKit is unloading.
  c.readAbort=new AbortController();c.suspended=false;
  c.onPageHide=()=>{c.suspended=true;c.readSeq++;c.loading=false;c.readAbort.abort();};
  c.onPageShow=()=>{if(c!==live||!c.suspended)return;c.suspended=false;c.readAbort=new AbortController();void read(c);};
  window.addEventListener('beforeunload',c.onPageHide);
  window.addEventListener('pagehide',c.onPageHide);
  window.addEventListener('pageshow',c.onPageShow);
  return c;
}
function ensure(ctx) {
  const uid=identity(ctx);
  if (!live || live.uid!==uid) { if(live) void cleanup(live); live=newController(ctx); }
  live.api=ctx.api; live.ctx=ctx; return live;
}
async function read(c) {
  if(c!==live||c.suspended)return;
  if(c.ctx.gameRoom && c.ctx.gameVoice?.status!=='ready'){c.loading=false;c.notify();return;}
  if(typeof c.api!=='function' || !c.uid) return;
  const epoch=c.epoch, seq=++c.readSeq, roomId=c.routeRoom;
  const options={method:'GET',signal:c.readAbort.signal};
  c.loading=true; c.notify();
  try {
    if(roomId) {
      const configuration=await c.api('/api/social/config',options);
      if(c!==live || epoch!==c.epoch || seq!==c.readSeq || roomId!==c.routeRoom) return;
      if(configuration?.ok===false)throw Error(friendly(configuration.error));
      if(configuration?.config)c.config=configuration.config;
      else if(!c.config){const listing=await c.api('/api/social/rooms',options);if(c!==live || epoch!==c.epoch || seq!==c.readSeq)return;if(!listing?.ok)throw Error(friendly(listing?.error));c.list=listing;c.config=listing.config;}
    }
    const result=await c.api(roomId?`/api/social/rooms/${encodeURIComponent(roomId)}`:'/api/social/rooms',options);
    if(c!==live || epoch!==c.epoch || seq!==c.readSeq || roomId!==c.routeRoom) return;
    if(!result?.ok) throw Error(friendly(result?.error || 'تعذر تحميل المجالس.'));
    if(roomId && (!result.room || result.room.id!==roomId)) throw Error('استجابة الغرفة غير مكتملة.');
    if(!roomId && !Array.isArray(result.rooms)) throw Error('استجابة قائمة الغرف غير مكتملة.');
    if(roomId){c.snapshot=result;c.challengeClockOffset=Number.isFinite(result.room?.challenge?.serverNow)?result.room.challenge.serverNow-Date.now():0;c.benefits?.sync(result);c.entranceFX?.sync(result);c.challengeModel=challengeModel(c);c.challengeUI?.sync(c.challengeModel,`${c.uid}/${roomId}`);} else c.list=result;
    if(result.config) c.config=result.config;
    c.error='';
    const current=result.current;
    if(c.voiceTarget && (!current?.councilId || c.voiceTarget!==`${current.roomId}/${current.councilId}`)) await disconnectVoice(c);
    if(!current?.councilId && c.ambientOn) await stopAmbient(c);
  } catch(e) { if(c===live && epoch===c.epoch && seq===c.readSeq) c.error=friendly(e.message || 'تعذر الاتصال بالخادم.'); }
  finally { if(c===live && epoch===c.epoch && seq===c.readSeq) {c.loading=false;c.notify();} }
}
async function openOwnBenefits(c,options={}) {
  if(!document.querySelector('link[data-social-benefits-r12]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/social-benefits-r12.css?v=r58q';link.dataset.socialBenefitsR12='';document.head.append(link);}
  const epoch=c.epoch,roomId=c.routeRoom;
  if(!roomId||c.snapshot?.current?.roomId!==roomId)throw Error('ادخل الغرفة بحسابك قبل فتح حقيبة الحظ أو المكافأة.');
  if(!c.benefits){
    const module=await import('../social-benefits.js?v=r63a');
    if(c!==live||c.epoch!==epoch||c.routeRoom!==roomId)return;
    c.benefitsHost=document.createElement('div');c.benefitsHost.dataset.soBenefitsHost='';if(!c.ctx.gameRoom)c.benefitsHost.dataset.soReferenceR28='';document.body.append(c.benefitsHost);
    c.benefits=module.createSocialBenefits({api:(...args)=>c.api(...args),roomId,getUserId:()=>c===live&&c.routeRoom===roomId?c.uid:'',openPacks:currency=>{c.benefits?.close();(globalThis.__LA3BAK_NAV__ || location).hash='#/payments/'+(currency==='gems'?'gems':'coins');},toast:message=>c.ctx.toast?.(message)});
    c.benefits.mount(c.benefitsHost,{mode:'sheet',open:false});
    c.benefitsEvent=event=>{if(c===live&&event.detail?.roomId===c.routeRoom)void c.benefits?.load();};window.addEventListener('la3bak:social-benefits',c.benefitsEvent);
  }
  c.benefits.sync(c.snapshot);
  return c.benefits.open(options.mode==='reward'?'reward':undefined);
}
function destroyBenefits(c){c.benefits?.destroy();c.benefits=null;c.benefitsHost?.remove();c.benefitsHost=null;if(c.benefitsEvent)window.removeEventListener('la3bak:social-benefits',c.benefitsEvent);c.benefitsEvent=null;}
export function refreshSocial(event) {
  const c=live;if(!c)return Promise.resolve();
  if(event?.roomId&&String(event.roomId)!==c.routeRoom)return Promise.resolve();
  // social:update is invalidation only, not score/result data. Same event IDs or
  // same scoped timestamp are remembered so a replay does not trigger a refresh.
  const token=event?.eventId||event?.id||(Number.isFinite(event?.ts)?`${event.roomId||c.routeRoom}/${event.councilId||''}/${event.ts}`:'');
  if(token){c.challengeUpdates??=new Set();if(c.challengeUpdates.has(token))return Promise.resolve();c.challengeUpdates.add(token);while(c.challengeUpdates.size>100)c.challengeUpdates.delete(c.challengeUpdates.values().next().value);}
  return read(c);
}
export function receiveSocialSupport(event) {
  const c=live;if(!c||c.ctx.gameRoom||c.snapshot?.current?.roomId!==c.routeRoom)return false;
  return c.challengeUI?.receive(supportEventModel(event))===true;
}
export function receiveSocialGiftEffect(event,meta){const ok=receiveGiftRuntime(live,event,meta);try{if(!meta?.dup&&!meta?.historical&&live&&!live.ctx?.gameRoom&&meta?.roomId===live.routeRoom&&!(live.ctx?.hideChatEffects||live.ctx?.accountSettings?.hideChatEffects))giftSlide(event);}catch{}return ok;}
/* R59: شريط الهدية الجانبي «N×» (صورة المرسل + الهدية + المستلم) مثل الفيديو. عرض بس؛ القيم من حدث الخادم المؤكد. */
const slideSeen=new Set();
function giftSlide(ev){
  if(!ev?.tx||slideSeen.has(ev.tx)||!ev.gift||typeof document==='undefined')return;slideSeen.add(ev.tx);
  let host=document.querySelector('.g59-slides');if(!host){host=document.createElement('div');host.className='g59-slides';host.setAttribute('aria-live','polite');document.body.append(host);}
  const face=p=>p?.avatar&&/^\/[A-Za-z0-9_./-]+$/.test(p.avatar)?`<img src="${esc(p.avatar)}" alt="">`:`<b>${esc(String(p?.name||'؟').trim().charAt(0))}</b>`;
  const n=document.createElement('div');n.className='g59-slide';n.setAttribute('role','status');
  n.innerHTML=`<span class="g59-face">${face(ev.from)}</span><span class="g59-txt"><b>${esc(ev.from?.name||'عضو')}</b><small>أرسل إلى ${esc(ev.to?.name||'عضو')}</small></span><span class="g59-gift">${giftArtwork(ev.gift)||'🎁'}</span><em>${esc(ev.qty||1)}<i>×</i></em>`;
  host.append(n);while(host.children.length>3)host.firstElementChild.remove();
  setTimeout(()=>{n.classList.add('is-out');setTimeout(()=>n.remove(),400);},3600);
}
/* R59: زر Combo — بعد الإرسال يطلع يسار تحت 5 ثواني، والضغط يعيد نفس الهدية بطلب جديد (نفس مسار الإرسال بالخادم). */
let comboTimer=null,comboCount=0;
function showCombo(c){
  if(typeof document==='undefined'||!c||c.ctx?.gameRoom)return;const gifts=c.ctx.socialGifts;if(typeof gifts?.combo!=='function')return;
  const info=gifts.comboInfo?.();if(!info)return;comboCount+=1;
  let b=document.querySelector('.g59-combo');
  if(!b){b=document.createElement('button');b.type='button';b.className='g59-combo';let h=document.querySelector('.g59-combo-host');if(!h){h=document.createElement('div');h.className='g59-combo-host';document.body.append(h);}h.append(b);}
  b.setAttribute('aria-label',`Combo: أرسل ${info.gift.name} مرة ثانية`);
  b.innerHTML=`<span class="g59-combo-ring" aria-hidden="true"></span><span class="g59-combo-gift">${giftArtwork(info.gift)||'🎁'}</span><b>Combo</b><small>×${comboCount}</small>`;
  b.classList.remove('is-ticking');void b.offsetWidth;b.classList.add('is-ticking');
  clearTimeout(comboTimer);comboTimer=setTimeout(()=>{b.remove();comboCount=0;},5000);
}
function comboClick(b){const r=live&&live.ctx.socialGifts?.combo(live.snapshot);if(r){b.classList.add('is-hit');clearTimeout(comboTimer);comboTimer=setTimeout(()=>{b.remove();comboCount=0;},15000);setTimeout(()=>b.classList.remove('is-hit'),180);}}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target?.closest?.('.g59-combo');if(b)comboClick(b);});
function hideCombo(){clearTimeout(comboTimer);comboCount=0;document.querySelector?.('.g59-combo')?.remove();}
export function socialGiftEffectMetrics(){return giftRuntimeMetrics(live);}
export function socialCannonMetrics(){return live?.cannonFX?.metrics?.()||{disposed:true,contexts:0,frames:0,triangles:0};}
/* R59: الصاروخ انتقل للقبيلة؛ رسائل صاروخ الغرفة القديمة تنتجاهل */
export function receiveSocialRocket(){return false;}
export function receiveSocialCannon3(message){const c=live;if(!c||c.ctx.gameRoom||message?.roomId!==c.routeRoom||c.ctx.hideChatEffects)return false;const ok=cannon3Blast(message.event);try{c.refresh?.();}catch{}return ok;}
export function receiveSocialCannon(message){const c=live;if(!c||c.ctx.gameRoom||message?.roomId!==c.routeRoom||c.snapshot?.current?.roomId!==c.routeRoom||c.ctx.hideChatEffects)return false;return c.cannonFX?.receive(message.event,message.event?.cannon||c.snapshot?.room?.cannon)===true;}
async function disconnectVoice(c) { c.voiceTarget=''; c.speakers.clear(); if(c.voice) await c.voice.disconnect().catch(()=>{}); c.voiceState={status:'disconnected',microphone:false}; c.notify(); }
async function stopAmbient(c) { const audio=c.ambient;c.ambient=null;c.ambientOn=false;if(audio){audio.pause();audio.removeAttribute('src');audio.load();} }
async function cleanup(c) { c.onPageHide();window.removeEventListener('beforeunload',c.onPageHide);window.removeEventListener('pagehide',c.onPageHide);window.removeEventListener('pageshow',c.onPageShow);c.cannonFX?.destroy();c.cannonFX=null;clearGiftRuntime(c);hideCombo();document.querySelector('.g59-slides')?.remove();destroyBenefits(c);c.entranceFX?.cancel();c.challengeUI?.destroy();c.challengeHost=null;c.challengeModel={available:false};c.epoch++;c.readSeq++;await Promise.all([disconnectVoice(c),stopAmbient(c)]);c.snapshot=null;c.list=null; }
/** Route exit/logout only. DOM destroy intentionally does NOT invoke this. */
export async function leaveSocial() { clearMinimized(); const c=live; if(!c) return; live=null; await cleanup(c);c.listeners.clear(); }
async function voiceConnect(c,confirmedCurrent=null) {
  const current=confirmedCurrent||(c.routeRoom?c.snapshot:c.list)?.current;
  if(!current?.councilId) throw Error('اختر مقعدًا وانضم إلى مجلس أولًا.');
  const target=`${current.roomId}/${current.councilId}`,epoch=c.epoch;
  if(c.voiceBusy) return;
  c.voiceBusy=true;c.notify();
  try {
    if(c.voiceTarget && c.voiceTarget!==target) await disconnectVoice(c);
    if(!c.voice) {
      const module=await import('../social-voice.js?v=release-r14');
      if(c!==live || epoch!==c.epoch) return;
      c.voice=new module.SocialVoiceClient({api:(...args)=>c.api(...args),onState:state=>{if(c!==live)return;c.voiceState=typeof state==='string'?{status:state}:{...state,status:state?.state||state?.status||'disconnected'};if(state?.error)c.error=state.error;c.notify();},onSpeakers:ids=>{if(c!==live)return;c.speakers=new Set(arr(ids).map(x=>String(typeof x==='object'?x.id:x)));c.notify();}});
    }
    c.voiceTarget=target;
    await c.voice.connect();if(c.outputVolume!==undefined)c.voice.setOutput(c.outputVolume);
    if(c!==live || epoch!==c.epoch) await c.voice.disconnect();
  } catch(e) {c.voiceTarget='';const message=/dynamically imported module|module script|MIME/i.test(e.message||'')?'تعذر تحميل خدمة الصوت. ملفات الصوت غير متاحة أو لم تُنشر بنوع صحيح؛ حدّث الصفحة أو تواصل مع الدعم.':e.message||'الصوت غير متاح الآن.';c.voiceState={status:'error',microphone:false,error:message};throw Error(message);}
  finally {c.voiceBusy=false;if(c===live)c.notify();}
}
async function toggleAmbient(c) {
  if(c.ambientOn) {await stopAmbient(c);c.notify();return;}
  const audio=new Audio('/social-assets/quiet-ambience.mp3');audio.preload='none';audio.loop=false;audio.volume=c.ambientVolume;
  audio.onended=()=>{if(c.ambient===audio){c.ambientOn=false;c.ambient=null;c.notify();}};
  audio.onerror=()=>{if(c.ambient===audio){c.ambientOn=false;c.ambient=null;c.error='تعذر تشغيل الموسيقى المحلية. حاول لاحقًا.';c.notify();}};
  c.ambient=audio;
  try {await audio.play();c.ambientOn=true;c.notify();}catch(e){await stopAmbient(c);throw Error('لم يسمح المتصفح بتشغيل الموسيقى. اضغط تشغيل مرة أخرى.');}
}
async function command(c,commandName,fields={},retry=false) {
  if(c.busy) return null;
  if(c.pending && !retry) throw Error('يوجد طلب غير محسوم. أعد المحاولة بالمفتاح نفسه أو تجاهله بعد تحديث الحالة.');
  const payload=retry?c.pending:{owner:c.uid,command:commandName,key:uuid(),...fields};
  if(!payload || payload.owner!==c.uid) throw Error('الطلب لا ينتمي لهذا الحساب.');
  if(payload.requiresPassword&&!payload.password)throw Error('أعد إدخال كلمة مرور الغرفة لإعادة نفس الطلب.');
  c.pending=payload;const saved={...payload};delete saved.password;if(payload.password)saved.requiresPassword=true;storage.set(c.storageKey,JSON.stringify(saved));c.busy=true;c.error='';c.notice='جارٍ تنفيذ الطلب…';c.notify();
  const epoch=c.epoch;
  try {
    if(['council:join','council:return','council:create','council:leave','room:leave'].includes(payload.command)) {await disconnectVoice(c);await stopAmbient(c);}
    const {owner,requiresPassword,...body}=payload;
    const result=await c.api('/api/social/command','POST',body);
    if(!result?.ok) {c.pending=null;storage.remove(c.storageKey);throw Error(payload.command==='room:upgrade'?roomUpgradeErrorR47(result?.error):friendly(result?.error||'لم يقبل الخادم الطلب.'));}
    if(c!==live || epoch!==c.epoch) return null;
    c.pending=null;storage.remove(c.storageKey);c.notice='تم حفظ الإجراء في الخادم.';
    await read(c);if(c!==live||epoch!==c.epoch)return null;return result;
  } catch(e) { if(Number(e.status)>=400 && Number(e.status)<500){c.pending=null;storage.remove(c.storageKey);} if(c===live && epoch===c.epoch) {c.error=e.message || 'تعذر إكمال الطلب.';c.notice=c.pending?'قد يكون الطلب وصل للخادم. حدّث الحالة، ثم أعد المحاولة بنفس المفتاح إن لزم.':'';} throw e; }
  finally {c.busy=false;if(c===live)c.notify();}
}
const button = (action,text,extra='',primary=false) => `<button type="button" class="so-button${primary?' so-primary':''}" data-so-action="${action}" ${extra}>${text}</button>`;
const empty = (title,text) => `<div class="so-empty">${icon('chair')}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
const field = (name,label,type='text',value='',max=80) => `<label class="so-field">${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" maxlength="${max}" ${type==='number'?'':'autocomplete="off"'} required></label>`;
const textField = (name,label,max=500,value='',required=true) => `<label class="so-field">${esc(label)}<textarea name="${name}" rows="3" maxlength="${max}" ${required?'required':''}>${esc(value)}</textarea></label>`;
const check = (name,label,checked=false) => `<label class="so-check"><input name="${name}" type="checkbox" ${checked?'checked':''}>${esc(label)}</label>`;
const select = (name,label,options,value) => `<label class="so-field">${esc(label)}<select name="${name}">${Object.entries(options).map(([id,text])=>`<option value="${esc(id)}"${id===String(value)?' selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const selfId = c => String(c.snapshot?.selfId || c.list?.selfId || c.uid);
const RANK_CHIP=(key,n)=>key==='vip'&&n>=1&&n<=15?`/assets/art58/chips/vip${n}.webp?v=r58o`:key==='noble'&&n>=1&&n<=9?`/assets/art58/chips/n${n}.webp?v=r58o`:key==='room'&&n>=1&&n<=10?`/assets/art58/chips/lv${n}.webp?v=r58s`:'';
function rankBadges(m) {
  const rank=[['vip','VIP',15],['noble','N',9],['level','LV',100]].find(([key,,max])=>Number.isInteger(m.ranks?.[key])&&m.ranks[key]>0&&m.ranks[key]<=max);
  return rank?`<span class="so-member-ranks"><small class="so-rank so-rank-${rank[0]}${RANK_CHIP(rank[0],m.ranks[rank[0]])?' has-art58':''}" data-so-rank="${rank[0]}" dir="ltr">${RANK_CHIP(rank[0],m.ranks[rank[0]])?`<img class="art58-chip" src="${RANK_CHIP(rank[0],m.ranks[rank[0]])}" alt="" decoding="async"><b class="art58-chip-tx">${rank[1]}${m.ranks[rank[0]]}</b>`:`${icon('star')}${rank[1]}${m.ranks[rank[0]]}`}</small></span>`:'';
}
const ROLE_NAMES={owner:'مالك الغرفة',host:'مضيف',moderator:'مشرف','council-owner':'صاحب المجلس','council-host':'مضيف المجلس'};
function referenceHeaderRanks(m) {
  const ranks=[['level','LV',100],['vip','VIP',15],['noble','N',9]].filter(([key,,max])=>Number.isInteger(m.ranks?.[key])&&m.ranks[key]>0&&m.ranks[key]<=max);
  return ranks.map(([key,name])=>RANK_CHIP(key,m.ranks[key])?`<span class="so-rank so-rank-${key} has-art58" data-so-rank="${key}" dir="ltr"><img class="art58-chip" src="${RANK_CHIP(key,m.ranks[key])}" alt="" decoding="async"><b class="art58-chip-tx">${name}${m.ranks[key]}</b></span>`:`<span class="so-rank so-rank-${key}" data-so-rank="${key}" dir="ltr">${icon('star')}${name}${m.ranks[key]}</span>`).join('');
}
// R58v: قائمة الداعمين (اليوم، الأسبوع، الشهر، كل الوقت) — من بيانات الخادم فقط
const SUP_TABS=[['day','اليوم'],['week','الأسبوع'],['month','الشهر'],['all','الكل']];
function supportersShortcut(s){
  if(!s||!Array.isArray(s.week))return '';
  const top=(s.day?.length?s.day:s.week.length?s.week:s.month||[]).slice(0,3);
  return `<button type="button" class="so-cannon-shortcut sup58-shortcut" data-so-action="open-panel" data-panel="supporters" aria-label="داعمين الغرفة"><span class="sup58-faces">${top.length?top.map(p=>`<span>${portraitHTML(p,26)}</span>`).join(''):'<span class="sup58-cup">🏆</span>'}</span><span>الداعمين</span></button>`;
}
function supportersPanel(s,tab='day'){
  if(!s)return '<p class="so-note">قائمة الداعمين غير متاحة.</p>';
  const key=SUP_TABS.some(([k])=>k===tab)?tab:'day',list=Array.isArray(s[key])?s[key]:[];
  const medal=i=>i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
  const rows=list.length?`<ol class="sup58-list">${list.map((p,i)=>`<li class="${i<3?'is-top is-top'+(i+1):''}"><i>${medal(i)}</i><span class="sup58-face">${portraitHTML(p,40)}</span><b>${esc(p.name)}</b><span dir="ltr">${Number(p.pts * 20).toLocaleString('en-US')} 🪙</span></li>`).join('')}</ol>`:'<p class="so-note">ما فيه دعم بهالفترة للحين. أرسل هدية وكن أول داعم!</p>';
  return `<section class="sup58-panel"><div class="sup58-tabs" role="tablist">${SUP_TABS.map(([k,l])=>`<button type="button" role="tab" data-so-action="sup-tab" data-tab="${k}" aria-selected="${k===key}">${l}</button>`).join('')}</div>${rows}<p class="so-cannon-unit">الترتيب حسب قيمة الهدايا (كل 20 عملة = نقطة) اللي انرسلت داخل الغرفة. الأسبوع يبدأ السبت، واليوم يبدأ 12 بالليل بتوقيت الخليج.</p><button type="button" class="so-button so-primary so-cannon-support" data-so-action="open-panel" data-panel="gifts">أرسل هدية وادعم الغرفة</button></section>`;
}
function referenceShortcuts(c) {
  if(c.ctx.gameRoom)return '';
  return `<aside class="so-room-shortcuts" aria-label="مدفع الغرفة والداعمين">${cannon3Shortcut(c.snapshot?.room?.cannon3)}${supportersShortcut(c.snapshot?.room?.supporters)}</aside>`;
}
function publicRole(m,c) {
  if(ROLE_NAMES[m.role])return m.role;
  const room=c.snapshot?.room,council=currentCouncil(c),id=String(m.id);
  if(room?.owner?.id!=null&&String(room.owner.id)===id)return 'owner';
  if(arr(room?.moderators).some(x=>String(x.id)===id))return 'moderator';
  if(room?.host?.id!=null&&String(room.host.id)===id)return 'host';
  if(council?.owner?.id!=null&&String(council.owner.id)===id)return 'council-owner';
  if(council?.host?.id!=null&&String(council.host.id)===id)return 'council-host';
  return 'member';
}
function portraitHTML(m,size=88) {
  const photo=safeImage(m.photo),art=!photo?avatarMini(m.avatar,size):'',image=photo||(!art&&/^(?:https:\/\/|\/)/.test(String(m.avatar||''))?safeImage(m.avatar):'');
  return image?`<img src="${esc(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:art||`<span class="so-avatar-initial" aria-hidden="true">${esc(Array.from(String(m.name||'عضو').trim())[0]||'ع')}</span>`;
}
function actualHost(m,c) {
  if(m.id==null)return false;
  const id=String(m.id),council=currentCouncil(c);
  return ['host','council-host'].includes(m.role)||[c.snapshot?.room?.host,council?.host].some(x=>x?.id!=null&&String(x.id)===id);
}
function memberBadge(m,c) {
  const mine=String(m.id)===selfId(c)||String(m.id)===String(c.voiceState?.identity),council=currentCouncil(c),seated=arr(council?.members).some(x=>String(x.id)===String(m.id)),voiceHere=seated&&c.voiceTarget===`${c.snapshot?.room?.id}/${council?.id}`&&c.voiceState?.status==='connected',role=publicRole(m,c);
  const speaking=voiceHere&&c.speakers.has(String(m.id)),mic=mine&&voiceHere&&(c.voiceState?.microphone===true||c.voiceState?.micEnabled===true),host=actualHost(m,c);
  const remoteMic=voiceHere?c.voiceState?.microphones?.[String(m.id)]:undefined;
  const serverMuted=m.muted===true||(mine&&c.snapshot?.current?.muted===true),remoteState=typeof remoteMic==='boolean'?(remoteMic?'remote-live':'remote-off'):'unknown';
  const state=serverMuted?'server-muted':mine?(mic?'local-live':voiceHere?'local-off':'disconnected'):remoteState;
  const label=serverMuted?'كتم إداري':mine?(mic?'مايكك يعمل':voiceHere?'مايكك مغلق':'صوتك غير متصل'):typeof remoteMic==='boolean'?(remoteMic?'المايك يعمل':'المايك مغلق'):'حالة المايك غير معروفة';
  const portrait=portraitHTML(m),frame=typeof m.frame==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(m.frame)?m.frame:null;
  const micFrame=typeof m.micFrame==='string'&&/^mf\d\d$/.test(m.micFrame)?m.micFrame:null;
  // R58r: إطار المايك (من المتجر) يطلع بدل إطار الملف وأنت على المقعد
  const face=micFrame?`${portrait}<img class="so-mic-frame-r58" src="/assets/art58/mic/m${micFrame.slice(2)}.webp?v=r58r" alt="" decoding="async">`:frame?frameOwnedPortrait(frame,portrait,'so-owned-seat-frame'):portrait;
  const fx=rankEffects(m.ranks);
  return `<span class="so-member${speaking?' is-speaking':''}${host?' is-host':''}${fx.aura?' rp-aura-'+fx.aura:''}" data-so-member-id="${esc(m.id)}" data-so-role="${role}" data-so-mic-state="${state}" title="${esc(m.name||'عضو')}${ROLE_NAMES[role]?' · '+ROLE_NAMES[role]:''} · ${label}"><span class="so-portrait"><span class="so-avatar">${face}</span>${host?crown():''}${rankBadges(m)}<span class="so-seat-mic so-seat-mic-${state}" aria-label="${label}">${icon(serverMuted||state==='local-off'||state==='remote-off'?'off':'mic')}<small class="so-sr">${label}</small></span></span><span class="so-member-name${typeof m.board==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(m.board)?' lux-board lux-board-'+m.board:''}">${esc(m.name||'عضو')}</span>${host?'<small class="so-member-role">المضيف</small>':`<small class="so-sr">${esc(ROLE_NAMES[role]||'عضو')}</small>`}</span>`;
}
function challengeMemberHTML(m,c) {
  const member={...m,photo:safeImage(m.photo)||safeImage(m.avatarUrl)||m.photo};
  const html=memberBadge(member,c),face=portraitHTML(member);
  return member.frame&&typeof c.ctx.framed==='function'?html.replace(`<span class="so-avatar">${face}</span>`,`<span class="so-avatar">${c.ctx.framed(face,member.frame,'sm')}</span>`):html;
}
// Exact R25 contract adapter. Never derive gift value from price/qty or wallet.
function supportEventModel(event) {
  if(event?.kind!=='gift-support'||typeof event.id!=='string'||!event.id||!Number.isFinite(event.occurredAt)||!Number.isFinite(event.expiresAt)||event.expiresAt<=Date.now()||event.currency!=='gems'||!Number.isSafeInteger(event.value)||event.value<0)return null;
  if(!event.room?.name||!event.sender?.name||!event.recipient?.name||!event.gift?.name||!Number.isSafeInteger(event.gift.quantity)||event.gift.quantity<1)return null;
  return {id:event.id,kind:'gift',ts:event.occurredAt,text:`${event.sender.name} دعم ${event.recipient.name} · ${event.gift.name} × ${event.gift.quantity.toLocaleString('ar-u-nu-latn')} · ${event.value.toLocaleString('ar-u-nu-latn')} عملة · ${event.room.name}`};
}
function challengeStartAllowed(c) {
  if(c.ctx.gameRoom||c.snapshot?.current?.roomId!==c.routeRoom||!currentCouncil(c))return false;
  const room=c.snapshot.room,council=currentCouncil(c),id=selfId(c);
  const host=[room.host,council.host].some(m=>m?.id!=null&&String(m.id)===id);
  return (moderator(c)||host)&&settingsPermission(c,'moderation');
}
function challengeModel(c) {
  const snapshot=c.snapshot,room=snapshot?.room,council=currentCouncil(c);
  if(c.ctx.gameRoom||!room||snapshot?.current?.roomId!==c.routeRoom)return {available:false};
  const feed=arr(room.supportEvents).map(supportEventModel).filter(Boolean),raw=room.challenge;
  const base={available:true,canStart:challengeStartAllowed(c)&&(!raw||['finished','cancelled'].includes(raw.status)),canCancel:false,feed};
  if(!raw||!council||raw.councilId!==council.id||raw.scoreCurrency!=='gems'||raw.scoreBasis!=='received-gift-total'||!['active','settling','finished','cancelled'].includes(raw.status))return base;
  const status={active:'active',settling:'settling',finished:'ended',cancelled:'cancelled'}[raw.status];
  const teams=['blue','red'].map(key=>({key,total:raw.totals?.[key],leaderId:raw.teams?.[key]?.[0]?.id,people:arr(raw.teams?.[key]).map(player=>{
    if(typeof player?.id!=='string'||typeof player.name!=='string'||!player.name.trim())return null;
    const known=arr(council.members).find(m=>String(m.id)===player.id)||arr(room.members).find(m=>String(m.id)===player.id);
    const member={...known,id:player.id,name:player.name,avatar:known?.avatar||player.avatar};
    return {member,value:player.receivedGiftValue,canSupport:player.present===true&&String(player.id)!==selfId(c)&&arr(council.members).some(m=>String(m.id)===player.id)&&typeof c.ctx.socialGifts?.handle==='function'};
  }).filter(Boolean)}));
  const resultText=raw.status==='finished'?{blue:'الفريق الأزرق فاز · نتيجة مؤكدة من الخادم',red:'الفريق الوردي فاز · نتيجة مؤكدة من الخادم',tie:'تعادل الفريقان · نتيجة مؤكدة من الخادم'}[raw.winner]:'';
  return {...base,canCancel:raw.canManage===true&&raw.status==='active',clockOffset:c.challengeClockOffset||0,challenge:{id:raw.id,councilId:raw.councilId,status,endsAt:raw.endsAt,teams,resultText}};
}
async function challengeCommand(c,type,fields) {
  if(type==='start')return command(c,'challenge:start',{roomId:fields.roomId,councilId:fields.councilId,teams:fields.teams,durationSeconds:180});
  if(type==='cancel')return command(c,'challenge:cancel',{roomId:fields.roomId,councilId:currentCouncil(c)?.id,challengeId:fields.challengeId});
  throw Error('إجراء تحدي غير متاح.');
}
function challengeBoardHTML(c,focused,joined) {
  const challenge=c.challengeUI?.render(c.challengeModel)||'';
  const feed=c.challengeModel?.available?c.challengeUI?.renderFeed()||'':'';
  const setup=c.ctx.gameRoom&&c.challengeModel?.canStart===true?'<button type="button" class="so-challenge-entry" data-so-action="challenge-setup">تحدي الفريقين · 3 دقائق</button>':'';
  const members=arr(c.snapshot?.room?.members),count=Number.isInteger(c.snapshot?.room?.count)?c.snapshot.room.count:members.length;
  const summary=`<span class="so-pk-member-count">${icon('users')}<b>${esc(count)}</b></span><span class="so-pk-room-members">${members.slice(0,6).map(m=>`<span class="so-pk-room-member" title="${esc(m.name)}">${portraitHTML(m,44)}</span>`).join('')}</span><span class="so-pk-seat-control">${icon('chair')}<span>المقاعد</span></span>`;
  return `${feed}${setup}`+(challenge?`${challenge}<details class="so-challenge-chairs" id="so-challenge-chairs" data-so-challenge-chairs><summary aria-label="أعضاء الغرفة؛ افتح مقاعد المجلس والتحكم بالغرفة">${summary}</summary>${centralCouncilHTML(c,focused,joined)}</details>`:centralCouncilHTML(c,focused,joined));
}
function councilCard(council,c,rail=false) {
  const active=c.snapshot?.current?.councilId===council.id,privateCouncil=council.privacy==='private'||council.locked;
  const count=Number.isInteger(council.count)?council.count:arr(council.members).length;
  const attrs=`data-id="${esc(council.id)}"`;
  if(rail) return `<button type="button" class="so-rail-item${active?' is-active':''}" data-so-action="preview" ${attrs}><span>${icon(privateCouncil?'lock':'chair')}<b>${esc(council.name)}</b></span><small>${esc(count)} / ${esc(council.seats)} · ${esc(KINDS[council.kind]||'مجلس')}</small></button>`;
  const favorites=arr(c.snapshot?.preferences?.favorites),favorite=favorites.some(f=>(typeof f==='string'?f:f.councilId)===council.id);
  const action=active?button('council-leave','مغادرة المقعد',attrs):council.canJoin?button('council-join','خذ مقعدًا',attrs,true):council.canRequest?button('request','طلب انضمام',attrs):'<span class="so-tag">غير متاح للانضمام</span>';
  return `<article class="so-council so-kind-${esc(council.kind)}${active?' is-current':''}" id="so-council-${esc(encodeURIComponent(council.id))}"><div class="so-council-head"><span class="so-tag">${icon(privateCouncil?'lock':'chair')}${esc(KINDS[council.kind]||'مجلس')}${privateCouncil?' · خاص':''}</span>${button('favorite',icon('star')+`<span class="so-sr">${favorite?'إزالة من المفضلة':'حفظ في المفضلة'}</span>`,`${attrs} data-enabled="${!favorite}" aria-pressed="${favorite}"`)}</div><h3>${esc(council.name)}</h3><p>${esc(council.description||'مساحة لحديث مستقل داخل الغرفة.')}</p><div class="so-seating" aria-label="أعضاء المجلس">${arr(council.members).length?arr(council.members).map(m=>memberBadge(m,c)).join(''):`<span class="so-open-seat">${icon('chair')}<small>${privateCouncil?'أعضاء المجلس غير ظاهرين':'المقاعد متاحة'}</small></span>`}</div><div class="so-table"><span>${esc(count)} / ${esc(council.seats)} مقاعد</span>${active?'<b>مجلسك الحالي</b>':`<small>${council.locked?'مقفل':privateCouncil?'بالدعوة أو الموافقة':'صوت مستقل'}</small>`}</div><div class="so-council-actions">${action}</div></article>`;
}
function feedback(c) {
  return `<div class="so-feedback" aria-live="polite">${c.error?`<p class="so-error" role="alert">${esc(c.error)}</p>`:''}${c.notice?`<p role="status">${esc(c.notice)}</p>`:''}${c.pending?`<div class="so-pending"><p>طلب غير محسوم: <b>${esc(c.pending.command)}</b>. لن يُنفذ تلقائيًا عند إعادة فتح الصفحة.</p>${button('retry','إعادة المحاولة بالمفتاح نفسه')}${button('discard','تجاهل الطلب المحفوظ')}</div>`:''}</div>`;
}
function listHTML(c) {
  const raw=c.list?.directory||{},data=c.list?{...c.list,directory:{recent:raw.recent||raw.recentRoomIds||[],followed:raw.followed||raw.followedRoomIds||[],joined:raw.joined||raw.joinedRoomIds||[],owned:raw.owned||[]}}:null;
  const directory=renderDirectory({data,ui:c.directoryUI,busy:c.busy,loading:c.loading,error:c.error,notice:c.notice,actorId:selfId(c)});
  return directory+(c.pending?`<div class="so-directory-pending" role="status"><p>طلب غير محسوم؛ لا ننفّذه تلقائيًا.</p>${button('retry','إعادة المحاولة بالمفتاح نفسه')}${button('discard','تجاهل بعد تحديث الحالة')}</div>`:'');
}
const roomRole = c => c.snapshot?.room?.role;
const moderator = c => ['owner','moderator'].includes(roomRole(c));
const owner = c => roomRole(c)==='owner';
const currentCouncil = c => arr(c.snapshot?.room?.councils).find(x=>x.id===c.snapshot?.current?.councilId);
const councilModerator = c => moderator(c) || Object.hasOwn(currentCouncil(c)||{},'requests') || ['owner','host','moderator'].includes(currentCouncil(c)?.role) || (currentCouncil(c)?.owner?.id && String(currentCouncil(c).owner.id)===selfId(c));
const canInvite = c => currentCouncil(c)?councilModerator(c):moderator(c);
const nameOf = (c,id) => arr(c.snapshot?.room?.members).find(m=>m.id===id)?.name || 'عضو المجلس';
function voiceHTML(c) {
  const seated=!!currentCouncil(c),status=c.voiceState?.status || 'disconnected',connected=status==='connected',mic=c.voiceState?.microphone===true || c.voiceState?.micEnabled===true;
  const labels={connected:'الصوت متصل',connecting:'جارٍ الاتصال بالصوت',reconnecting:'جارٍ إعادة الاتصال',disconnected:'الصوت غير متصل',error:'تعذر اتصال الصوت',unavailable:'خدمة الصوت غير متاحة',disabled:'الصوت غير مفعل من المنصة'};
  return `<section class="so-voice" aria-label="التحكم بالصوت"><div><span class="so-eyebrow">${seated?esc(currentCouncil(c).name):'خذ مقعدًا أولًا'}</span><p class="so-voice-status"><span class="so-status-dot${connected?' is-online':''}"></span>${esc(labels[status]||status)}</p></div><button type="button" class="so-mic${mic?' is-live':''}" data-so-action="${connected?'microphone':'voice-connect'}" ${!seated||c.voiceBusy?'disabled':''} aria-pressed="${mic}">${icon(mic?'mic':'off')}<span>${connected?(mic?'كتم المايك':'تشغيل المايك'):'اتصال بالصوت'}</span></button><div class="so-voice-options"><label>صوت المجلس<input type="range" min="0" max="1" step=".05" value="${c.outputVolume??1}" data-so-volume="voice" aria-label="مستوى صوت المجلس" ${!connected?'disabled':''}></label>${connected?button('voice-disconnect','فصل الصوت'):''}${c.voiceState?.needsAudioUnlock?button('voice-unlock','إتاحة تشغيل الصوت'):''}</div><small>المايك بإذنك فقط. حالة الاتصال تأتي من خدمة الصوت، لا من إشغال المقعد.</small></section>`;
}
function categories(c,mode) { return arr(c.config?.content?.settings?.[mode]?.categories || c.config?.modes?.[mode]?.categories || c.config?.settings?.[mode]?.categories); }
function modeForm(mode,type,body,submitLabel='حفظ') {return `<form data-so-form="mode" data-mode="${mode}" data-type="${type}" class="so-form">${body}<button class="so-button so-primary" type="submit">${submitLabel}</button></form>`;}
function modeButton(mode,type,label,fields={}) {return button('mode-action',label,`data-mode="${mode}" data-payload="${esc(JSON.stringify({type,...fields}))}"`);}
function categorySelect(c,mode) { const values=categories(c,mode); return values.length?select('category','فئة السؤال',Object.fromEntries(values.map(v=>[v,v])),values[0]):'<p class="so-note">لا توجد فئات معتمدة متاحة. حدّث إعدادات المحتوى.</p>'; }
function modeHTML(c,council) {
  if(!council) return '';
  const available=Object.keys(MODES).filter(id=>c.config?.content?.settings?.[id]?.enabled!==false && c.config?.modes?.[id]?.enabled!==false && c.config?.settings?.[id]?.enabled!==false);
  if(!available.length)return '<section class="so-panel"><h2>أنماط الجلسة متوقفة</h2><p class="so-note">الحديث الصوتي والكتابي متاح وفق إعدادات المجلس.</p></section>';
  if(!available.includes(c.selectedMode)) c.selectedMode=available[0]||'table';
  const id=c.selectedMode,view=council.modes?.[id],enabled=council.modeEnabled?.[id]===true,canMod=councilModerator(c);
  let body='';
  if(!enabled) body=`<p class="so-note">النمط غير مفعّل في هذا المجلس.</p>${canMod?button('enable-mode','تفعيل هذا النمط',`data-mode="${id}" data-enabled="true"`,true):'<p>يمكن للمضيف تفعيله عندما يناسب أجواء المجلس.</p>'}`;
  else if(!view) body='<p class="so-note" role="status">عرض النمط غير متاح في استجابة الخادم بعد. لا نعرض محتوى أو نتائج وهمية.</p>';
  else if(id==='table') body=`<div class="so-question-card"><small>${esc(view.card?.category||'طاولة الحديث')}</small><h3>${esc(view.card?.text||'لم تُسحب بطاقة بعد.')}</h3></div>${canMod?`<div class="so-actions">${modeButton(id,'configure',view.enabled?'إيقاف البطاقات':'تفعيل البطاقات',{enabled:!view.enabled})}</div>${view.enabled?modeForm(id,'draw',categorySelect(c,id),'سحب بطاقة جديدة'):''}`:''}${view.card?modeForm(id,'answer',textField('text','إجابتك الاختيارية'),'شارك بالإجابة')+modeButton(id,'pass','تمرير الدور'):''}<div class="so-mode-results">${arr(view.answers).map(a=>`<p><b>${esc(nameOf(c,a.actorId))}</b> · ${a.passed?'مرّر دوره':esc(a.text)}</p>`).join('')}</div>`;
  else if(id==='anonymous') body=`<p class="so-note">لا تشارك بيانات اتصال أو معلومات شخصية. الهوية محمية في الخادم؛ الكشف لا يتم إلا بموافقة المرسل.</p>${modeForm(id,'send',textField('text','رسالة مجهولة'),'إرسال دون اسم')}<div class="so-anonymous-list">${arr(view.messages).map(m=>`<article class="so-anonymous-card"><small>${m.revealed?esc(nameOf(c,m.senderId)):'رسالة مجهولة'}</small><p>${esc(m.text)}</p><div class="so-actions">${arr(view.allowedReactions).map(r=>modeButton(id,'react',`${REACTIONS[r]||r} ${Number(m.reactions?.[r])||0}`,{messageId:m.id,reaction:r})).join('')}${!m.revealed?button('reveal','كشف هويتي بموافقتي',`data-id="${esc(m.id)}"`):''}${button('report-anonymous','إبلاغ',`data-id="${esc(m.id)}"`)}${canMod?modeButton(id,'moderate','إخفاء الرسالة',{messageId:m.id,hide:true}):''}</div></article>`).join('')||'<p class="so-note">لا توجد رسائل بعد.</p>'}</div>`;
  else if(id==='topics') body=`<div class="so-question-card"><small>موضوع المجلس${view.current?.deadline?` · ينتهي ${esc(new Date(view.current.deadline).toLocaleTimeString('ar-u-nu-latn',{hour:'2-digit',minute:'2-digit'}))}`:''}</small><h3>${esc(view.current?.text||'لم يبدأ موضوع بعد.')}</h3></div>${view.canModerate?modeForm(id,'start',textField('text','ابدأ موضوعًا جديدًا',240),'بدء الموضوع')+modeForm(id,'configure',field('durationSeconds','مدة الموضوع بالثواني','number',Number(view.durationMs||120000)/1000)+check('autoSuggestions','اقتراحات تلقائية',view.autoSuggestions),'حفظ الإعدادات'):''}${view.current&&view.canParticipate?modeForm(id,'suggest',textField('text','اقتراحك للموضوع القادم',240),'إضافة اقتراح'):''}<div class="so-topic-votes">${arr(view.suggestions).map(t=>`<article><p>${esc(t.text)}</p>${modeButton(id,'vote',`${view.ownVote===t.id?'صوتك':'صوّت'} · ${Number(t.votes)||0}`,{topicId:t.id})}</article>`).join('')}</div>${view.canAdvance?modeButton(id,'advance','الانتقال للموضوع الفائز'):''}`;
  else if(id==='understand') {const p=view.permissions||{},r=view.round;body=`<div class="so-actions">${p.participate?modeButton(id,'participate',view.participating?'الانسحاب من المشاركة':'أرغب بالمشاركة',{enabled:!view.participating}):''}${p.start?modeButton(id,'start','بدء الدور التالي'):''}</div>${r?`<div class="so-question-card"><small>دور ${esc(nameOf(c,r.memberId))}</small><h3>${esc(r.card?.text)}</h3></div><div class="so-options">${arr(r.card?.options).map((option,index)=>p.answer||p.guess?modeButton(id,p.answer?'answer':'guess',option,{option:index}):`<span class="so-tag">${esc(option)}</span>`).join('')}</div>${r.results?`<p class="so-result">الإجابة: ${esc(r.card?.options?.[r.results.answer])} · ${esc(r.results.matchedCount)} توقعات متوافقة</p>`:''}${p.reveal?modeButton(id,'reveal','أوافق على كشف إجابتي'):''}${p.skip?modeButton(id,'skip','تخطي الدور دون كشف'):''}`:'<p class="so-note">لا يوجد دور نشط. المشاركة اختيارية.</p>'}`;}
  else if(id==='quiet') body=`<div class="so-quiet-orbit" aria-hidden="true"></div><div class="so-question-card"><small>خذ وقتك</small><h3>${esc(view.prompt?.card?.text||'لا تحتاج أن تقول شيئًا. يكفي أن تكون هنا.')}</h3></div><div class="so-actions">${modeButton(id,'relax',view.preference?.relax?'إنهاء الاسترخاء':'وضع الاسترخاء',{enabled:!view.preference?.relax})}${button('ambient',c.ambientOn?'إيقاف الموسيقى المحلية':'تشغيل موسيقى هادئة محلية')}</div><label class="so-field">مستوى الموسيقى المحلية<input type="range" min="0" max="1" step=".05" value="${c.ambientVolume}" data-so-volume="ambient"></label><p class="so-note">موسيقى أصلية اختيارية لهذا الجهاز فقط؛ لا تُبث في المجلس ولا تسجل صوتك. لا تشغيل تلقائي ولا تكرار؛ تتوقف عند مغادرة المجلس.</p>${canMod?modeForm(id,'configure',check('prompts','أسئلة اختيارية دورية',view.prompts)+field('intervalSeconds','الفاصل بالثواني','number',Number(view.intervalMs||120000)/1000),'حفظ الأسئلة'):''}${view.prompts?modeButton(id,'prompt','إظهار السؤال التالي عندما يحين وقته'):''}`;
  else if(id==='hotseat') {const mine=String(view.seatedId)===selfId(c),queued=arr(view.queue).includes(selfId(c));body=`<div class="so-hotseat-chair">${icon('chair')}<b>${view.seatedId?esc(nameOf(c,view.seatedId)):'المقعد ينتظر من يرغب'}</b></div><div class="so-actions">${modeButton(id,'participate',queued||mine?'الانسحاب من الدور':'أرغب بالمشاركة',{enabled:!queued&&!mine})}${!view.seatedId&&String(view.nextParticipantId)===selfId(c)?modeButton(id,'sit','الجلوس على المقعد'):''}</div><p class="so-note">${arr(view.queue).length} في قائمة الانتظار · لا أسئلة خاصة أو إجبار على الإجابة.</p>${view.seatedId?`<div class="so-question-card"><h3>${esc(view.question?.text||'اختر فئة لسؤال لطيف.')}</h3></div>${modeForm(id,'question',categorySelect(c,id),'اختيار سؤال')}${mine?modeButton(id,'skip','تخطي السؤال'):''}${mine||canMod?modeButton(id,'end','إنهاء الدور'):''}`:''}`;}
  else if(SOCIAL_GAME_LABELS_R47[id]) body=renderSocialGame(id,view,{esc,nameOf:uid=>nameOf(c,uid)});
  return `<section class="so-panel so-mode-panel so-mode-${id}"><div class="so-section-head"><h2>نمط الجلسة</h2>${enabled&&canMod?button('enable-mode','إيقاف النمط',`data-mode="${id}" data-enabled="false"`):''}</div><nav class="so-mode-tabs" aria-label="أنماط الجلسة">${available.map(mode=>`<button type="button" data-so-action="select-mode" data-mode="${mode}" aria-pressed="${mode===id}" class="${mode===id?'is-active':''}">${MODES[mode][0]}</button>`).join('')}</nav><header><h3>${MODES[id][0]}</h3><p class="so-note">${MODES[id][1]}</p></header>${body}</section>`;
}

/* R55: قائمة الغرفة الوحيدة (☰ فوق) بشبكة أيقونات، وزر القلب، وبطاقة العضو، والخروج بخيارين (حفظ/مغادرة). */
function roomFollowed(c){const id=c.snapshot?.room?.id;return !!id&&arr(c.snapshot?.preferences?.followedRoomIds).includes(id);}
function roomHeartHTML(c){if(c.ctx.gameRoom||!c.snapshot?.room)return '';const on=roomFollowed(c);return `<button type="button" class="so-circle-button so-room-heart${on?' is-on':''}" data-so-action="room-heart" aria-pressed="${on}" aria-label="${on?'إزالة الغرفة من المحفوظة':'حفظ الغرفة بالقلب'}" title="${on?'محفوظة بالقلب':'حفظ الغرفة'}">${icon('heart')}</button>`;}
function roomMenuGridHTML(c,ui,council){
  const room=c.snapshot.room,joined=c.snapshot.current?.roomId===room.id,mine=owner(c),can=key=>settingsPermission(c,key);
  const tile=(action,art,label,attrs='',cls='')=>`<button type="button" class="so-menu-tile${cls?' '+cls:''}" data-so-action="${action}" ${attrs}><span class="so-menu-tile-icon" aria-hidden="true">${icon(art)}</span><span class="so-menu-tile-label">${esc(label)}</span></button>`;
  const panelTile=(panel,art,label,disabled=false)=>tile('open-panel',art,label,`data-panel="${panel}" aria-controls="so-room-panel-slot" ${disabled?'disabled':''}`);
  const tiles=[
    joined?panelTile('settings','settings','الإعدادات'):'',
    joined&&can('identity')&&!c.ctx.gameRoom?tile('room-background','palette','الخلفية'):'',
    tile('share','share','مشاركة'),
    canInvite(c)?tile('invite','invite','دعوة صديق'):'',
    tile('room-heart','heart',roomFollowed(c)?'محفوظة ❤':'حفظ بالقلب'),
    panelTile('members','users','الأعضاء'),
    panelTile('councils','chair','المجالس'),
    panelTile('audio','volume','الصوت'),
    panelTile('modes','star','أنماط الجلسة',!council),
    panelTile('roomtools','star','أدوات المجلس',!council),
    room.memory?panelTile('memory','chat','ذاكرة المجلس',!joined):'',
    joined?tile('reference-benefits','gift','حقيبة الحظ'):'',
    c.challengeModel?.available?tile('challenge-setup','users','تحدّي الفريقين',c.challengeModel.canStart?'':'disabled'):'',
    council?tile('room-clear-chat','broom','مسح الدردشة'):'',
    !c.ctx.gameRoom?tile('rank-open','star','رتبة الغرفة'):'',
    !c.ctx.gameRoom?panelTile('supporters','heart','الداعمين'):'',
    tile('info','info','معلومات الغرفة'),
    !joined?tile('join-room','plus','دخول الغرفة','','is-primary'):'',
    mine&&!c.ctx.gameRoom?tile('room-delete','trash','حذف الغرفة','','is-danger'):'',
  ].filter(Boolean).join('');
  return `<nav class="so-menu-grid-r55" data-so-room-tools aria-label="قائمة الغرفة">${tiles}</nav>`;
}
/* R67: قوائم اختيار من تحت (مثل الفيديو) + رسالة «تم الضبط بنجاح» + اختيار عدد المقاعد بالصور */
function toast67(text){document.querySelector('.st67-toast')?.remove();const t=document.createElement('div');t.className='st67-toast';t.setAttribute('role','status');t.textContent=text;document.body.append(t);setTimeout(()=>t.classList.add('is-out'),1500);setTimeout(()=>t.remove(),1900);}
function sheet67(inner,cls=''){return new Promise(resolve=>{const root=document.createElement('div');root.className='st67 '+cls;root.setAttribute('dir','rtl');root.innerHTML=`<button type="button" class="st67-scrim" data-st67="cancel" aria-label="إلغاء"></button><section class="st67-sheet" role="dialog" aria-modal="true">${inner}</section>`;document.body.append(root);requestAnimationFrame(()=>root.classList.add('is-in'));let picked=root.querySelector('[data-st67-v][aria-checked="true"]')?.dataset.st67V??null;
  const done=v=>{root.classList.remove('is-in');document.removeEventListener('keydown',key);setTimeout(()=>root.remove(),220);resolve(v);};const key=e=>{if(e.key==='Escape')done(null);};document.addEventListener('keydown',key);
  root.addEventListener('click',e=>{const t=e.target.closest('[data-st67],[data-st67-v]');if(!t)return;if(t.dataset.st67==='cancel')return done(null);if(t.dataset.st67==='ok')return done(picked);if('st67V' in t.dataset){if(root.dataset.mode==='grid'){picked=t.dataset.st67V;root.querySelectorAll('[data-st67-v]').forEach(b=>b.setAttribute('aria-checked',String(b===t)));}else done(t.dataset.st67V);}});
  if(cls.includes('is-grid'))root.dataset.mode='grid';});}
function choiceSheet(title,options,current){return sheet67(`<h3 class="st67-title">${esc(title)}</h3><div class="st67-list">${options.map(([v,label])=>`<button type="button" class="st67-opt" data-st67-v="${esc(v)}" role="radio" aria-checked="${String(v===current)}"><span>${esc(label)}</span>${v===current?'<i aria-hidden="true">✓</i>':''}</button>`).join('')}</div><button type="button" class="st67-cancel" data-st67="cancel">إلغاء</button>`);}
function seatLayout67(n){const cols=n<=4?n:n<=9?(n===6?3:n===8?4:n===9?3:5):n<=16?4:n<=20?5:6;return `<span class="st67-dots" style="--cols:${cols}">${Array.from({length:n},()=>'<i></i>').join('')}</span>`;}
function seatSheet(current,min,max){const opts=[...new Set([2,3,4,5,6,8,10,12,14,16,20,24,current])].filter(n=>n>=min&&n<=max).sort((a,b)=>b-a);return sheet67(`<h3 class="st67-title">عدد المقاعد</h3><div class="st67-grid">${opts.map(n=>`<button type="button" class="st67-seat" data-st67-v="${n}" aria-checked="${String(n===current)}" aria-label="${n} مقاعد">${seatLayout67(n)}<b>${n}</b></button>`).join('')}</div><button type="button" class="st67-ok" data-st67="ok">حسنًا</button>`,'is-grid').then(v=>v==null?null:Number(v));}
function memberCardHTML(c,m){
  const mine=String(m.id)===selfId(c),canMod=moderator(c)&&!mine,isOwner=owner(c)&&!mine,role=publicRole(m,c);
  const portrait=portraitHTML(m,84),frame=typeof m.frame==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(m.frame)?m.frame:null,face=frame?frameOwnedPortrait(frame,portrait,'so-owned-seat-frame'):portrait;
  const pub=/^[A-Za-z0-9_-]{16}$/.test(String(m.id))?String(m.id):'';
  return `<div class="so-member-card-r55"><div class="so-member-card-face"><span class="so-avatar">${face}</span></div><h3>${esc(m.name||'عضو')}</h3><p class="so-member-card-role">${esc(ROLE_NAMES[role]||'عضو')}</p><div class="so-member-card-ranks">${rankBadges(m)}</div>
  <div class="so-member-card-actions">${pub?`<button type="button" class="so-button so-primary" data-so-action="member-profile" data-id="${esc(pub)}">الملف الشخصي</button>`:''}${pub&&!mine&&!c.ctx.gameRoom?`<button type="button" class="so-button" data-so-action="room-dm" data-peer="${esc(pub)}">رسالة خاصة</button>`:''}${!mine&&typeof c.ctx.socialGifts?.render==='function'?button('member-gift',icon('gift')+' إرسال هدية',`data-id="${esc(m.id)}"`):''}${!mine?button('report-member','إبلاغ',`data-id="${esc(m.id)}"`):''}</div>
  ${canMod?`<div class="so-member-card-mod"><small>إدارة العضو</small><div class="so-actions">${button('mute',m.muted?'إلغاء الكتم':'كتم',`data-id="${esc(m.id)}" data-enabled="${!m.muted}"`)}${button('kick','طرد',`data-id="${esc(m.id)}"`)}${button('ban','حظر',`data-id="${esc(m.id)}"`)}${isOwner?button('moderator',m.role==='moderator'?'إزالة الإشراف':'تعيين مشرف',`data-id="${esc(m.id)}" data-enabled="${m.role!=='moderator'}"`):''}</div></div>`:''}</div>`;
}
/* تصغير الغرفة: تبقى عضو ويكمل الصوت وأنت تتصفح الموقع، وتطلع فقاعة ترجّعك للغرفة */
let minimizedRoom=null;
export function socialMinimized(){return !!(minimizedRoom&&live&&live.uid===minimizedRoom.uid);}
function minimizeBubble(){
  document.querySelector('[data-so-mini-room]')?.remove();
  if(!minimizedRoom)return;
  const el=document.createElement('div');el.className='so-mini-room-r55 so-mini-room-r67';el.dataset.soMiniRoom='';el.setAttribute('dir','rtl');
  const photo=safeImage(minimizedRoom.photo);
  el.innerHTML=`<button type="button" class="so-mini-room-open" aria-label="الرجوع إلى غرفة ${esc(minimizedRoom.name)}">${photo?`<img src="${esc(photo)}" alt="" draggable="false">`:`<span>${esc(Array.from(String(minimizedRoom.name||'غ'))[0])}</span>`}<i aria-hidden="true"><b></b><b></b><b></b></i></button><button type="button" class="so-mini-room-close" aria-label="مغادرة الغرفة">×</button>`;
  /* السحب بالإصبع: يبقى المربع وين ما تحطه، ونحفظ مكانه */
  const KEY='la3bak.miniRoomPos';let moved=false;
  const place=(x,y)=>{const w=el.offsetWidth||72,h=el.offsetHeight||72,maxX=innerWidth-w-6,maxY=innerHeight-h-6;x=Math.max(6,Math.min(maxX,x));y=Math.max(6,Math.min(maxY,y));el.style.left=x+'px';el.style.top=y+'px';el.style.bottom='auto';el.style.right='auto';return [x,y];};
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(Array.isArray(saved))requestAnimationFrame(()=>place(saved[0],saved[1]));}catch{}
  el.addEventListener('pointerdown',ev=>{if(ev.target.closest('.so-mini-room-close'))return;const r=el.getBoundingClientRect(),dx=ev.clientX-r.left,dy=ev.clientY-r.top,sx=ev.clientX,sy=ev.clientY;moved=false;let last=null;
    const mv=e=>{if(!moved&&Math.hypot(e.clientX-sx,e.clientY-sy)<6)return;moved=true;el.classList.add('is-dragging');last=place(e.clientX-dx,e.clientY-dy);e.preventDefault();};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);el.classList.remove('is-dragging');if(last){try{localStorage.setItem(KEY,JSON.stringify(last));}catch{}}};
    addEventListener('pointermove',mv,{passive:false});addEventListener('pointerup',up);addEventListener('pointercancel',up);});
  el.querySelector('.so-mini-room-open').addEventListener('click',e=>{if(moved){e.preventDefault();moved=false;return;}const id=minimizedRoom?.roomId;if(id)(globalThis.__LA3BAK_NAV__?.go?globalThis.__LA3BAK_NAV__.go(roomURL(id)):(location.hash=roomURL(id)));});
  el.querySelector('.so-mini-room-close').addEventListener('click',async()=>{const m=minimizedRoom,c=live;minimizedRoom=null;el.remove();try{if(c&&m)await command(c,'room:leave',{roomId:m.roomId});}catch{}await leaveSocial();});
  document.body.append(el);
}
function clearMinimized(){minimizedRoom=null;document.querySelector('[data-so-mini-room]')?.remove();}
function memberListHTML(c) {
  const room=c.snapshot.room,canMod=moderator(c);
  return `<div class="so-members-list">${arr(room.members).map(m=>`<article class="so-member-row">${memberBadge(m,c)}<div class="so-member-controls"><small>${esc(({owner:'مالك الغرفة',host:'مضيف',moderator:'مشرف','council-owner':'صاحب المجلس','council-host':'مضيف المجلس'})[m.role]||'عضو')}</small><div class="so-actions">${button('report-member','إبلاغ',`data-id="${esc(m.id)}"`)}${canMod&&String(m.id)!==selfId(c)?button('mute',m.muted?'إلغاء الكتم':'كتم',`data-id="${esc(m.id)}" data-enabled="${!m.muted}"`)+button('kick','طرد',`data-id="${esc(m.id)}"`)+button('ban','حظر',`data-id="${esc(m.id)}"`):''}${owner(c)&&String(m.id)!==selfId(c)?button('moderator',m.role==='moderator'?'إزالة الإشراف':'تعيين مشرف',`data-id="${esc(m.id)}" data-enabled="${m.role!=='moderator'}"`):''}</div></div></article>`).join('')||'<p class="so-note">لا يوجد أعضاء ظاهرون في استجابة الغرفة.</p>'}</div>`;
}
function moderationHTML(c,council) {
  const canMod=moderator(c),canCouncil=councilModerator(c);
  return `<section class="so-settings-content"><div class="so-actions">${button('preferences','خصوصيتي واهتماماتي')}${canMod||canCouncil?button('invite','دعوة لاعب'):''}${canCouncil&&council?button('edit-council','إعدادات المجلس'):''}${owner(c)?button('edit-room','هوية الغرفة وذاكرتها'):''}</div>${canCouncil&&council&&arr(council.requests).length?`<h3>طلبات المجلس الخاص</h3>${arr(council.requests).map(m=>`<div class="so-request-row"><span>${esc(m.name||nameOf(c,m.id||m))}</span><div class="so-actions">${button('approve','قبول',`data-id="${esc(m.id||m)}" data-enabled="true"`)}${button('approve','رفض',`data-id="${esc(m.id||m)}" data-enabled="false"`)}</div></div>`).join('')}`:''}<h3>أصدقاؤك الموجودون في الغرفة</h3><div class="so-actions">${arr(c.snapshot.friendsPresent).map(f=>`<a class="so-button" href="#/u/${encodeURIComponent(f.id)}">${esc(f.name)}</a>`).join('')||'<p class="so-note">ما عندك أصدقاء موجودين في هالغرفة الحين.</p>'}</div>${canCouncil&&council?button('close-council','إغلاق المجلس الحالي'):''}</section>`;
}
function councilListHTML(c,selected='') {
  const data=c.snapshot,room=data.room,joined=data.current?.roomId===room.id;
  if(!joined)return '<p class="so-note">ادخل الغرفة لعرض مجالسها الفعلية. المجالس الخاصة محمية.</p>'+button('join-room','دخول الغرفة','',true);
  return `<div class="so-compact-councils">${arr(room.councils).map(x=>{
    const active=currentCouncil(c)?.id===x.id,privateCouncil=x.privacy==='private'||x.locked,attrs=`data-id="${esc(x.id)}"`,favorite=arr(data.preferences?.favorites).some(f=>(typeof f==='string'?f:f.councilId)===x.id);
    return `<details class="so-compact-council${active?' is-current':''}" id="so-council-${esc(encodeURIComponent(x.id))}" ${x.id===selected?'open':''}><summary><span>${icon(privateCouncil?'lock':'chair')}<b>${esc(x.name)}</b></span><small>${esc(Number.isInteger(x.count)?x.count:arr(x.members).length)} / ${esc(x.seats)} · ${active?'مجلسك الحالي':esc(KINDS[x.kind]||'مجلس')}</small></summary><div class="so-compact-council-body"><p>${esc(x.description||'مجلس مستقل داخل الغرفة.')}</p>${privateCouncil?'<p class="so-note">مجلس محمي؛ الأعضاء والمحادثة حسب صلاحية الدخول.</p>':''}<div class="so-actions">${active?button('council-leave','مغادرة المقعد',attrs):x.canJoin?button('council-join','خذ مقعدًا',attrs,true):x.canRequest?button('request','طلب انضمام',attrs):'<span class="so-tag">غير متاح للانضمام</span>'}${button('favorite',icon('star')+(favorite?' إزالة المفضلة':' حفظ المفضلة'),`${attrs} data-enabled="${!favorite}" aria-pressed="${favorite}"`)}</div></div></details>`;
  }).join('')||'<p class="so-note">لم يُنشأ مجلس بعد.</p>'}</div><div class="so-council-list-tools so-actions">${joined?button('create-council',icon('plus')+' إنشاء مجلس')+button('switch',icon('arrow')+' التنقل بين المجالس')+(data.preferences?.previous?button('return','العودة إلى المجلس السابق'):''):''}${button('preferences','إعدادات الدعوات')}</div>`;
}
function visibleCouncil(c) {
  return currentCouncil(c)||arr(c.snapshot?.room?.councils).find(x=>x.kind==='public'&&x.privacy==='public'&&!x.locked)||arr(c.snapshot?.room?.councils).find(x=>x.privacy==='public'&&!x.locked)||null;
}
const SETTINGS_RIGHTS={identity:'الغلاف والإسم والإعلان',entry:'خصوصية دخول الغرفة',seats:'عدد مقاعد المجلس',audio:'الصوت وطلبات المايك',chat:'سياسة الدردشة',moderation:'الكتم والحظر وإزالتهما'};
function settingsPolicy(c) {
  const s=c.snapshot?.room?.settings||{};
  return {highQuality:s.highQuality===true,micRequests:s.micRequests===true,speak:s.speak==='moderators'?'moderators':'everyone',chat:s.chat==='moderators'?'moderators':'everyone',luckyBag:['moderators','owner'].includes(s.luckyBag)?s.luckyBag:'everyone',moderatorPermissions:Object.fromEntries(Object.keys(SETTINGS_RIGHTS).map(k=>[k,typeof s.moderatorPermissions?.[k]==='boolean'?s.moderatorPermissions[k]:true]))};
}
function settingsPermission(c,key) {
  const p=c.snapshot?.room?.permissions;
  // R12 fields are authoritative, even when a role label says owner/moderator.
  if(p&&typeof p==='object')return p[key]===true;
  // R10 rooms have no permission fields; preserve only their existing role rights.
  if(owner(c))return true;
  if(key==='owner')return false;
  return moderator(c)&&(key==='audit'||settingsPolicy(c).moderatorPermissions[key]===true);
}
function settingsSeats(c) {
  const council=visibleCouncil(c),occupied=council?Math.max(Number(council.count)||0,arr(council.members).length):0;
  const cap=Number.isInteger(c.config?.maxCouncilSeats)?c.config.maxCouncilSeats:12;
  const min=Math.max(occupied,council?.kind==='group'?3:2),max=council?.kind==='pair'?Math.min(2,cap):council?.kind==='group'?Math.min(5,cap):cap;
  return {council,occupied,min,max,editable:!!council&&council.kind!=='pair'&&min<=max&&Number.isInteger(council.seats)&&settingsPermission(c,'seats')};
}
function settingsRow(key,label,value,{enabled=true,note='',cover='',toggle}={}) {
  const control=typeof toggle==='boolean'?`<span class="so-settings-switch${toggle?' is-on':''}" aria-hidden="true"><span></span></span>`:enabled?icon('chevronLeft'):'';
  return `<button type="button" class="so-settings-row" data-so-action="settings-row" data-setting="${key}" ${key==='benefits'?'data-so-benefits-open':''} ${enabled?'':'disabled'} ${typeof toggle==='boolean'?`role="switch" aria-checked="${toggle}"`:''} ${note?`title="${esc(note)}"`:''}><span class="so-settings-label">${esc(label)}${note?`<small>${esc(note)}</small>`:''}</span><span class="so-settings-trailing"><span class="so-settings-value" dir="auto">${cover||esc(value)}</span>${control}</span></button>`;
}
function roomSettingsHTML(c,ui) {
  const r=c.snapshot.room,s=settingsPolicy(c),seat=settingsSeats(c),can=key=>settingsPermission(c,key),readOnly=key=>can(key)?'':'للقراءة فقط — لا تملك صلاحية التعديل';
  const benefitsReady=typeof c.ctx.openBenefits==='function';
  const photo=safeImage(r.photo),cover=`<span class="so-settings-cover">${photo?`<img src="${esc(photo)}" alt="غلاف الغرفة الحالي">`:icon('cover')}</span>`;
  const listValue=(name,right)=>can(right)?Array.isArray(r[name])?String(r[name].length):'غير متاح الآن':'للمخولين فقط';
  const rows=[
    settingsRow('cover','صورة الغرفة',photo?'':'لم يحدد',{enabled:can('identity'),note:readOnly('identity'),cover}),
    settingsRow('name','الإسم',r.name,{enabled:can('identity'),note:readOnly('identity')}),
    settingsRow('announcement','الإعلان',r.description||'لم يحدد',{enabled:can('identity'),note:readOnly('identity')}),
    settingsRow('ads','إعلانات الغرفة المتحركة',`${arr(r.ads).length}/10`,{enabled:can('identity'),note:can('identity')?'تمر على مراجعة تلقائية فورية':readOnly('identity')}),
    settingsRow('roomId','أيدي الغرفة',r.code||'',{enabled:can('owner'),note:can('owner')?'رقم 8 أرقام، أو رقم مميز من المتجر':'للمالك فقط'}),
    settingsRow('level','ليفل الغرفة',`Lv ${r.level||1}`,{note:'يرتفع بقيمة الهدايا داخل الغرفة'}),
    settingsRow('reward','مكافأة الغرفة','عملات من رصيد المالك',{enabled:benefitsReady&&can('owner'),note:can('owner')?'مكافأة يدوية لعضو موجود؛ تتطلب تأكيدًا':'للمالك فقط'}),
    settingsRow('highQuality','جودة صوت عالية','',{enabled:can('audio'),note:readOnly('audio'),toggle:s.highQuality}),
    settingsRow('seats','عدد المقاعد',seat.council?.seats??'لا يوجد مجلس',{enabled:seat.editable,note:seat.council?seat.council.kind==='pair'?'مجلس ثنائي — مقعدان ثابتان':can('seats')?seat.council.name:readOnly('seats'):'لم ينشأ مجلس؛ لا تغيير لإعدادات المنصة'}),
    settingsRow('micRequests','أخذ مايك يتطلب تقديم طلب',s.micRequests?'فتح':'إغلاق',{note:can('audio')?'':'السياسة للقراءة فقط؛ يمكنك تقديم طلب من مقعدك'}),
    settingsRow('capture','حماية لقطة الشاشة وتسجيل الشاشة','غير مضمون على الويب',{enabled:false,note:'لا يستطيع الموقع ضمان منع التصوير أو التسجيل'}),
    settingsRow('entry','من يمكنه دخول الغرفة',r.privacy==='private'?'بالدعوة فقط':'الجميع',{enabled:can('entry'),note:readOnly('entry')}),
    settingsRow('speak','من يمكنه التحدث بالميكروفون',s.speak==='moderators'?'المالك والمشرفون':'الجميع',{enabled:can('audio'),note:readOnly('audio')}),
    settingsRow('chat','من يمكنه الدردشة',s.chat==='moderators'?'المالك والمشرفون':'الجميع',{enabled:can('chat'),note:readOnly('chat')}),
    settingsRow('luckyBag','من يمكنه ارسال حقيبة الحظ',{everyone:'الجميع',moderators:'المالك والمشرفون',owner:'المالك فقط'}[s.luckyBag],{enabled:can('owner'),note:can('owner')?'':'للقراءة فقط — يحددها مالك الغرفة'}),
    settingsRow('muted','قائمة الكتم',listValue('mutedMembers','moderation'),{enabled:can('moderation'),note:can('moderation')?'':'قائمة خاصة بالمخولين بالإدارة'}),
    settingsRow('banned','القائمة السوداء',listValue('bannedMembers','moderation'),{enabled:can('moderation'),note:can('moderation')?'':'قائمة خاصة بالمخولين بالإدارة'}),
    settingsRow('audit','سجل عمليات المشرف',listValue('audit','audit'),{enabled:can('audit'),note:can('audit')?'':'سجل خاص بالمخولين فقط'}),
    settingsRow('rights','إعدادات صلاحيات المشرفين',can('owner')?'':'للمالك فقط',{enabled:can('owner'),note:can('owner')?'':'صلاحيات المشرفين يحددها مالك الغرفة فقط'}),
    settingsRow('benefits','حقيبة الحظ',benefitsReady?'فتح':'غير متاحة حاليًا',{enabled:benefitsReady,note:benefitsReady?'':'خدمة حقيبة الحظ لم تربط بعد'}),
    settingsRow('theme','خلفية البث',themeName(r.settings?.theme),{enabled:can('identity')&&!c.ctx.gameRoom,note:readOnly('identity')}),
    settingsRow('seatLocks','قفل المقاعد',String(seat.council?.lockedSeats?.length||0),{enabled:can('seats')&&!!seat.council&&!c.ctx.gameRoom,note:readOnly('seats')}),
    settingsRow('giftEffects','عرض مؤثرات الهدايا','',{enabled:typeof c.ctx.updateAccountSettings==='function'&&!c.ctx.gameRoom,toggle:c.ctx.accountSettings?.hideChatEffects!==true,note:'تفضيل خاص بك، لا يغيّر مؤثرات الآخرين'}),
  ].join('');
  return `<section class="so-room-settings" data-so-room-settings dir="rtl" role="region" aria-labelledby="so-settings-title" tabindex="-1"><header class="so-settings-header"><button type="button" class="so-settings-back" data-so-action="settings-back" aria-label="الرجوع إلى الغرفة">${icon('chevronRight')}</button><h2 id="so-settings-title">الإعدادات</h2></header><div class="so-settings-scroll" data-so-settings-scroll>${c.error||c.pending||c.notice?feedback(c):''}<div class="so-settings-list" aria-label="إعدادات الغرفة">${rows}</div>${renderUpgradePanel(c.snapshot,esc,seat.council?.id)}</div><div class="so-settings-dialog-host" data-so-settings-dialog-host></div></section>`;
}
function settingsPrivateList(c,kind) {
  const r=c.snapshot?.room||{},audit=kind==='audit',allowed=settingsPermission(c,audit?'audit':'moderation'),items=r[audit?'audit':kind==='muted'?'mutedMembers':'bannedMembers'];
  if(!allowed)return '<p class="so-note">لا تملك صلاحية الاطلاع على هذه القائمة الخاصة.</p>';
  if(!Array.isArray(items))return '<p class="so-note">لم يوفر الخادم هذه القائمة بعد. لا نعرض بيانات بديلة.</p>';
  if(!items.length)return '<p class="so-note">لا توجد إجراءات مسجلة في هذه الغرفة.</p>'.replace('إجراءات مسجلة',audit?'إجراءات مسجلة':kind==='muted'?'أعضاء مكتومون':'أعضاء محظورون');
  const actions={'room:update':'تحديث إعدادات الغرفة','council:update':'تحديث المجلس','member:mute':'تغيير الكتم','member:ban':'حظر عضو','member:unban':'إزالة حظر','member:kick':'طرد عضو','room:moderator':'تغيير مشرف','mic:request':'طلب مايك','mic:approve':'قرار طلب مايك','room:cover':'تحديث الغلاف'};
  return `<div class="so-settings-private-list">${items.map(m=>audit?`<article class="so-settings-audit"><b>${esc(actions[m.action]||m.action)}</b><p>${esc(m.actor?.name||'إجراء نظام')}${m.target?.name?' · '+esc(m.target.name):''}</p>${m.reason?`<p>${esc(m.reason)}</p>`:''}${m.at!=null&&!Number.isNaN(new Date(m.at).valueOf())?`<time datetime="${new Date(m.at).toISOString()}">${esc(new Date(m.at).toLocaleString('ar-u-nu-latn'))}</time>`:''}</article>`:`<article class="so-settings-person"><span class="so-settings-person-photo">${portraitHTML(m,44)}</span><div><b>${esc(m.name||'عضو')}</b>${m.reason?`<p>${esc(m.reason)}</p>`:''}</div>${button(kind==='muted'?'settings-unmute':'settings-unban',kind==='muted'?'فك الكتم':'إزالة الحظر',`data-id="${esc(m.id)}" ${c.busy||c.pending?'disabled':''}`)}</article>`).join('')}</div>`;
}
function settingsMicHTML(c) {
  const r=c.snapshot?.room||{},s=settingsPolicy(c),current=c.snapshot?.current||{},seated=!!currentCouncil(c),mine=selfId(c);
  const approved=typeof current.micApproved==='boolean'?current.micApproved:arr(r.microphoneApprovals).some(m=>String(m.id)===mine),requested=typeof current.micRequested==='boolean'?current.micRequested:arr(r.microphoneRequests).some(m=>String(m.id)===mine);
  const serverMuted=typeof current.serverMuted==='boolean'?current.serverMuted:arr(r.members).find(m=>String(m.id)===mine)?.muted===true;
  const restricted=s.speak==='moderators'&&!moderator(c),canRequest=s.micRequests&&seated&&!approved&&!requested&&!serverMuted&&!restricted;
  const requestList=r.microphoneRequests,requests=settingsPermission(c,'audio')?arr(requestList):[];
  return `<div class="so-settings-mic-state"><p class="so-note">الطلب لا يأخذ مقعدًا ولا يشغّل المايك. بعد الموافقة اضغط تشغيل المايك بنفسك؛ الكتم الإداري وسياسة التحدث يبقيان نافذين.</p>${s.micRequests?`<p role="status">${!seated?'خذ مقعدًا أولًا لتقديم طلب المايك.':serverMuted?'مايكك مكتوم إداريًا.':restricted?'التحدث متاح للمالك والمشرفين فقط.':approved?'تمت الموافقة؛ التشغيل باختيارك فقط.':requested?'طلبك بانتظار الموافقة.':'لم تقدم طلبًا بعد.'}</p>${canRequest?button('settings-mic-request',icon('mic')+' تقديم طلب مايك',c.busy||c.pending?'disabled':'',true):''}`:'<p>طلب المايك غير مطلوب حاليًا.</p>'}${settingsPermission(c,'audio')&&s.micRequests?`<h3>طلبات المايك في الغرفة</h3>${Array.isArray(requestList)?requests.map(m=>`<article class="so-settings-person"><div><b>${esc(m.name||arr(r.members).find(x=>String(x.id)===String(m?.id??m))?.name||'عضو')}</b></div><div class="so-actions">${button('settings-mic-approve','موافقة',`data-id="${esc(m?.id??m)}" data-enabled="true" ${c.busy||c.pending?'disabled':''}`)}${button('settings-mic-approve','رفض',`data-id="${esc(m?.id??m)}" data-enabled="false" ${c.busy||c.pending?'disabled':''}`)}</div></article>`).join('')||'<p class="so-note">لا توجد طلبات معلقة.</p>':'<p class="so-note">قائمة الطلبات غير متاحة من الخادم بعد.</p>'}`:''}</div>`;
}
function centralCouncilHTML(c,council,joined) {
  const configured=!!council,active=configured&&currentCouncil(c)?.id===council.id;
  const members=arr(council?.members),count=configured&&Number.isInteger(council.count)?council.count:members.length;
  const seats=configured&&Number.isInteger(council.seats)?council.seats:Number.isInteger(c.config?.defaultCouncilSeats)?c.config.defaultCouncilSeats:0;
  // Non-member previews are neutral layout slots based on server configuration, not claims of vacant real seats.
  const hiddenOccupants=Math.max(0,count-members.length),vacant=Math.max(0,seats-count);
  const attrs=configured?`data-id="${esc(council.id)}"`:'',canSeat=!configured||active||council.canJoin||council.canRequest;
  const bySeat=new Map(members.map((m,i)=>[Number.isInteger(m.seatIndex)?m.seatIndex:i,m])),occupied=new Set(Array.isArray(council?.occupiedSeats)?council.occupiedSeats:[...bySeat.keys()]),locks=new Set(council?.lockedSeats||[]),unknown=hiddenOccupants>0&&!Array.isArray(council?.occupiedSeats);
  const slots=Array.from({length:seats},(_,i)=>{const n=i+1,m=bySeat.get(i);
    if(m)return `<div class="so-seat" data-so-seat="occupied" data-so-seat-number="${n}" data-so-seat-index="${i}" role="listitem"><small class="so-seat-number" aria-hidden="true">${n}</small>${memberBadge(m,c)}</div>`;
    if(configured&&(occupied.has(i)||unknown))return `<div class="so-seat" data-so-seat="restricted" data-so-seat-number="${n}" role="listitem"><span class="so-seat-available"><span class="so-empty-avatar">${icon('person')}</span><span>${n}</span><small class="so-sr">مقعد محمي، لا نعرضه كأنه فارغ</small></span></div>`;
    const locked=configured&&locks.has(i);return `<div class="so-seat so-seat-empty" data-so-seat="${!configured?'preview':locked?'locked':'empty'}" data-so-seat-number="${n}" data-so-seat-index="${i}" role="listitem"><button type="button" class="so-seat-available" data-so-action="${configured?'seat':'prepare-council'}" ${attrs} data-seat="${n}" ${!c.ctx.gameRoom&&configured?`data-seat-index="${i}"`:''} ${!canSeat||locked?'disabled':''} aria-label="${locked?'المقعد مقفل':configured?'الانضمام إلى المقعد الحقيقي':'معاينة ترتيب المقعد'} ${n}"><span class="so-empty-avatar">${icon(locked?'lock':'plus')}</span><span>${n}</span><small class="so-sr">${locked?'القفل محفوظ في الخادم':configured?'الحجز النهائي يتحقق منه الخادم':'معاينة بالسعة المعتمدة، الإشغال بعد الدخول'}</small></button></div>`;
  }).join('');
  const summary=configured?`${active?'مجلسك':'معاينة مجلس'} · ${count} / ${seats} مقاعد`:joined?'اختر مجلسًا · التخطيط بالسعة الافتراضية':'معاينة التخطيط · الإشغال بعد الدخول';
  return `<section class="so-central-council${active?' is-current':''}" data-so-board data-so-active-council="${active?esc(council.id):''}" data-so-focused-council="${configured?esc(council.id):''}" data-so-configured="${configured}" aria-label="مقاعد المجلس الصوتي"><h2 class="so-sr" id="so-central-title">${esc(council?.name||'معاينة تخطيط المقاعد')}</h2><div class="so-seat-grid" data-so-seats style="--so-seat-columns:${Math.min(4,Math.max(1,seats))}" role="list" aria-label="${configured?'إشغال المجلس ومواضع المقاعد الفعلية من الخادم':'معاينة تخطيط بالسعة الافتراضية، وليست حالة إشغال المجلس'}">${slots||'<p class="so-note">سعة المقاعد لم ترد من الخادم بعد.</p>'}</div><footer class="so-central-footer" dir="ltr"><span class="so-seat-count" dir="rtl">${esc(summary)}</span><div class="so-seat-toolbar">${circleButton('open-panel','down','اختيار المجلس','data-panel="councils"')}<button type="button" class="so-council-selector" data-so-action="open-panel" data-panel="councils" aria-label="المجلس المعروض">${esc(council?.name||'المجالس')}</button>${circleButton('expand','expand','تكبير الغرفة',`aria-pressed="false"`)}</div></footer></section>`;
}
function voiceStatusHTML(c) {
  const status=c.voiceState?.status||'disconnected',labels={connected:'الصوت متصل',connecting:'جارٍ الاتصال بالصوت',reconnecting:'جارٍ إعادة الاتصال',disconnected:'الصوت غير متصل',error:'تعذر اتصال الصوت',unavailable:'خدمة الصوت غير متاحة',disabled:'الصوت غير مفعل من المنصة'};
  return `<span class="so-status-dot${status==='connected'?' is-online':''}"></span> ${esc(labels[status]||'الصوت غير متصل')}`;
}
const circleButton=(action,art,label,attrs='')=>`<button type="button" class="so-circle-button" data-so-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${attrs}>${icon(art)}</button>`;
function chatMessageHTML(c,m) {
  const known=arr(c.snapshot?.room?.members).find(x=>String(x.id)===String(m.author?.id||m.actorId||m.senderId)),author={...known,...m.author,name:m.author?.name||known?.name||m.name||'عضو المجلس'};
  // Protected historical photos use the CURRENT visible member snapshot only.
  if(known)author.avatar=known.avatar;
  else if(typeof author.avatar==='string'&&author.avatar.startsWith('/api/social/avatar'))delete author.avatar;
  const stamp=m.at??m.createdAt,date=stamp!==undefined?new Date(stamp):null,valid=date&&!Number.isNaN(date.valueOf());
  const fx=rankEffects(author.ranks);if(typeof author.bubble==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(author.bubble))fx.bubble=author.bubble;
  return `<article class="so-chat-message${fx.bubble?' rp-bubble-'+fx.bubble:''}" data-so-message-id="${esc(m.id)}"><header><span class="so-chat-author"><span class="so-chat-avatar" ${author.id!=null?`data-so-member-id="${esc(author.id)}"`:''}>${portraitHTML(author,36)}</span><b${fx.name?` class="rp-name-${fx.name}"`:''}>${esc(author.name)}</b>${rankBadges(author)}</span>${valid?`<time datetime="${date.toISOString()}" dir="ltr">${esc(date.toLocaleTimeString('ar-u-nu-latn',{hour:'2-digit',minute:'2-digit'}))}</time>`:''}</header><p dir="auto">${esc(m.text)}</p><details class="so-chat-message-actions"><summary aria-label="خيارات الرسالة">${icon('info')}</summary>${button('report-chat','إبلاغ',`data-id="${esc(m.id)}"`)}</details></article>`;
}
function chatHTML(c,council,ui) {
  const joined=c.snapshot?.current?.roomId===c.snapshot?.room?.id;
  const giftEvents=council&&typeof c.ctx.socialGifts?.events==='function'?c.ctx.socialGifts.events(c.snapshot,{compact:!c.ctx.gameRoom&&c.challengeModel?.challenge?.status==='active'}):'';
  const notice=council?'أنت عضو في هذا المجلس. شارك باحترام؛ المقعد لا يعني أن المايك يعمل.':joined?'أنت عضو في الغرفة، ولم تأخذ مقعدًا بعد. اختر مجلسًا لبدء الحديث.':'أنت تشاهد الغرفة فقط، ولست عضوًا فيها. التخطيط معاينة؛ الدخول والمقعد باختيارك.';
  return `<section class="so-chat" data-so-chat-region aria-labelledby="so-chat-title"><h2 id="so-chat-title" class="so-sr">محادثة المجلس</h2><div class="so-chat-messages" role="log" aria-live="polite" aria-label="رسائل المجلس"><article class="so-chat-system" data-so-local-notice><span>${icon('shield')}</span><p>${notice}</p></article>${council?arr(council.chat).filter(m=>{const cut=Number(storage.get(`la3bak:social:cleared:${c.snapshot?.room?.id}:${council.id}`));return !Number.isFinite(cut)||!(Number(m.at)<=cut);}).map(m=>chatMessageHTML(c,m)).join(''):''}${giftEvents}</div></section>`;
}
function roomDockExtras(c) {
  if(c.ctx.gameRoom)return '';
  const joined=c.snapshot?.current?.roomId===c.snapshot?.room?.id;
  const bag='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 5h10l-2 5c7 4 10 9 7 14-2 4-18 4-20 0-3-5 0-10 7-14z" fill="#e8c16d"/><path d="M11 10h10M11 7l10 0" stroke="#805d25" stroke-width="2" stroke-linecap="round"/><path d="m16 14 1.6 3.2 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#fff4cc"/></svg>';
  const pk='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m3 6 16 20M29 6 13 26" stroke="#ef81a8" stroke-width="3"/><path d="m3 26 16-20M29 26 13 6" stroke="#74caee" stroke-width="3"/><rect x="5" y="8" width="22" height="17" rx="5" fill="#251c38"/><text x="16" y="21" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="800" fill="#fff">PK</text></svg>';
  return `<button type="button" class="so-circle-button so-dock-luckybag" data-so-action="reference-benefits" data-so-dock-tool="luckybag" aria-label="حقيبة الحظ" title="حقيبة الحظ" ${joined?'':'disabled'}>${bag}</button><button type="button" class="so-circle-button so-dock-pk" data-so-action="challenge-setup" data-so-dock-tool="pk" aria-label="PK · بدء تحدي الفريقين" title="${c.challengeModel?.canStart?'بدء تحدي الفريقين':'بدء التحدي متاح للمضيف والمشرف حسب صلاحيات الخادم'}" ${c.challengeModel?.canStart?'':'disabled'}>${pk}</button>`;
}
function roomDockHTML(c,council,ui) {
  const giftIconId=`sg${++giftIconSeq}`;
  const connected=c.voiceState?.status==='connected',mic=connected&&(c.voiceState?.microphone===true||c.voiceState?.micEnabled===true),muted=c.snapshot?.current?.muted===true;
  const unread=Number.isSafeInteger(ui.chatUnread)&&ui.chatUnread>0?ui.chatUnread:0;
  return `<footer class="so-room-dock so-room-composer-r18" data-so-room-dock>
    ${ui.emoji?`<div class="so-emoji-picker" role="group" aria-label="أضف رمزًا إلى رسالتك">${['😊','😂','❤️','👏','✨','👍','🌹','🤝','🎉','💜','😍','🙏'].map(emoji=>`<button type="button" data-so-action="emoji-insert" data-emoji="${emoji}" aria-label="إضافة ${emoji}">${emoji}</button>`).join('')}</div>`:''}
    ${ui.output?`<div class="so-output-control"><label for="so-output-volume">صوت المجلس</label><input id="so-output-volume" type="range" min="0" max="1" step=".05" value="${c.outputVolume??1}" data-so-volume="voice"><output>${Math.round((c.outputVolume??1)*100)}%</output>${c.voiceState?.needsAudioUnlock?button('voice-unlock','إتاحة تشغيل الصوت'):''}${button('open-panel','تفاصيل الصوت','data-panel="audio"')}</div>`:''}
    <div class="so-dock-row" data-so-composer-row dir="ltr">
      <button type="button" class="so-circle-button so-composer-chat" data-so-action="focus-chat" aria-label="${unread?'المحادثة · '+unread+' رسالة غير مقروءة':'المحادثة'}">${icon('chat')}${unread?`<span class="so-chat-unread" data-so-chat-unread>${unread}</span>`:''}</button>
      ${!c.ctx.gameRoom?`<button type="button" class="so-circle-button so-dm-r67" data-so-action="room-dm" aria-label="الرسائل الخاصة"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg><span class="so-chat-unread so-dm-unread-r67" data-so-dm-unread ${(Number(globalThis.__LA3_DM_UNREAD__)||0)>0?'':'hidden'}>${Number(globalThis.__LA3_DM_UNREAD__)||0}</span></button>`:''}
      ${c.ctx.gameRoom?circleButton('open-panel','gift','إرسال هدية',`data-panel="gifts" aria-expanded="${ui.panel==='gifts'}" ${typeof c.ctx.socialGifts?.render!=='function'?'disabled':''}`):`<button type="button" class="so-circle-button" data-so-action="open-panel" data-panel="gifts" aria-label="إرسال هدية" aria-expanded="${ui.panel==='gifts'}" ${typeof c.ctx.socialGifts?.render!=='function'?'disabled':''}><svg class="so-reference-gift-toolbar so-gift-icon-r58" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><defs><linearGradient id="${giftIconId}sgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fb8"/><stop offset="1" stop-color="#e0306e"/></linearGradient><linearGradient id="${giftIconId}sgL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3cf"/><stop offset="1" stop-color="#f05a8e"/></linearGradient><linearGradient id="${giftIconId}sgR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#e0a12a"/></linearGradient></defs><path d="M16 10C13 4.5 7.5 5 8 8.6c.4 2.6 4.6 2.4 8 1.4zM16 10c3-5.5 8.5-5 8-1.4-.4 2.6-4.6 2.4-8 1.4z" fill="url(#${giftIconId}sgR)" stroke="#b07a12" stroke-width=".8"/><rect x="6" y="15" width="20" height="13" rx="2.2" fill="url(#${giftIconId}sgB)"/><rect x="4.5" y="10" width="23" height="6" rx="2" fill="url(#${giftIconId}sgL)"/><rect x="14" y="10" width="4" height="18" fill="url(#${giftIconId}sgR)"/><path d="M6 17.5h20" stroke="#b81e57" stroke-opacity=".35"/><rect x="6.5" y="11" width="9" height="1.6" rx=".8" fill="#fff" opacity=".55"/><circle cx="16" cy="10" r="2.1" fill="url(#${giftIconId}sgR)" stroke="#b07a12" stroke-width=".7"/></svg></button>`}
      ${!c.ctx.gameRoom?circleButton('emoji','smile','الرموز التعبيرية',`aria-expanded="${!!ui.emoji}"`):''}
      ${roomDockExtras(c)}
      <form data-so-form="chat" class="so-chat-form" dir="ltr"><div class="so-chat-input-wrap"><label class="so-sr" for="so-chat-text">اكتب رسالة للمجلس</label><input id="so-chat-text" name="text" maxlength="500" placeholder="قل شيئًا…" required autocomplete="off" dir="auto" enterkeyhint="send"><button class="so-circle-button so-send-button" type="submit" aria-label="إرسال الرسالة" title="إرسال الرسالة">${icon('send')}</button></div></form>
      ${c.ctx.gameRoom?circleButton('emoji','smile','الرموز التعبيرية',`aria-expanded="${!!ui.emoji}"`):''}
      ${circleButton(connected?'microphone':'voice-connect',mic?'mic':'off',muted?'المايك مكتوم إداريًا':connected?(mic?'كتم المايك':'تشغيل المايك'):'الاتصال بالصوت للاستماع',`aria-pressed="${mic}" ${c.voiceBusy||(connected&&muted)?'disabled':''}`)}
      ${circleButton('output','volume','مستوى صوت المجلس',`aria-expanded="${!!ui.output}"`)}
    </div><span class="so-dock-status so-sr" role="status">${voiceStatusHTML(c)}</span>
  </footer>`;
}
function roomMemoryHTML(c) {
  const room=c.snapshot.room;
  return `<section class="so-memory"><p class="so-note">ذاكرة نصية اختيارية، بموافقة أصحابها. لا تسجيل للصوت.</p>${currentCouncil(c)?button('memory','اقتراح ذكرى نصية'):''}${arr(room.memories).map(m=>`<article><p>${esc(m.text||'ذكرى بانتظار الموافقة')}</p>${m.saved===false&&arr(m.authors).some(a=>a.id===selfId(c))?button('memory-consent','أوافق على الحفظ',`data-id="${esc(m.id)}" data-enabled="true"`)+button('memory-consent','لا أوافق',`data-id="${esc(m.id)}" data-enabled="false"`):`<small>${m.saved?'ذكرى محفوظة بموافقة أصحابها':'بانتظار الموافقة'}</small>`}</article>`).join('')||'<p class="so-note">لا توجد ذكريات محفوظة بعد.</p>'}</section>`;
}
// room-tools-r33: panel
const PANEL_NAMES={roomtools:'أدوات المجلس',menu:'خيارات الغرفة',memory:'ذاكرة المجلس',councils:'المجالس المتاحة',members:'أعضاء الغرفة',settings:'الخصوصية وإدارة الغرفة',audio:'الصوت والمايك',modes:'أنماط الجلسة',gifts:'هدايا الغرفة',cannon:'مدفع الغرفة',cannon3:'مدفع الغرفة',supporters:'داعمين الغرفة'};
function roomPanelHTML(c,ui) {
  const panel=ui.panel,council=currentCouncil(c);
  if(!PANEL_NAMES[panel])return '';
  const body=panel==='roomtools'?(c.roomTools?.render()||'<p>حالة الأدوات غير متاحة.</p>'):panel==='cannon'?cannonPanel(c.snapshot.room.cannon,ui.cannonStage):panel==='cannon3'?cannon3Panel(c.snapshot.room.cannon3,ui.c59Level,ui.c59Help):panel==='supporters'?supportersPanel(c.snapshot.room.supporters,ui.supTab):panel==='menu'?roomMenuGridHTML(c,ui,council):panel==='memory'?roomMemoryHTML(c):panel==='gifts'?`<div data-so-gifts>${typeof c.ctx.socialGifts?.render==='function'?c.ctx.socialGifts.render({...c.snapshot,snapshotVoice:c.voiceState}):'<p class="so-note">الهدايا غير متاحة في هذه الغرفة الآن.</p>'}</div>`:panel==='councils'?councilListHTML(c,ui.preview):panel==='members'?memberListHTML(c):panel==='settings'?moderationHTML(c,council):panel==='audio'?voiceHTML(c):modeHTML(c,council)||'<p class="so-note">خذ مقعدًا في مجلس لعرض أنماط الجلسة.</p>';
  return `<section class="so-room-panel" data-so-open-panel="${panel}" data-so-panel="${panel}" role="region" aria-labelledby="so-panel-title" tabindex="-1"><header class="so-room-panel-heading"><h2 id="so-panel-title">${PANEL_NAMES[panel]}</h2>${button('panel-close',icon('close')+'<span class="so-sr">إغلاق '+PANEL_NAMES[panel]+'</span>')}</header><div class="so-room-panel-body" data-so-panel-scroll>${body}</div></section>`;
}
function roomToolsHTML(c,ui,joined,council) {
  if(!c.ctx.gameRoom){
    const tool=(panel,name,art,disabled=false)=>button('open-panel',icon(art)+`<span>${name}</span>`,`data-panel="${panel}" aria-controls="so-room-panel-slot" aria-expanded="${ui.panel===panel}" ${disabled?'disabled':''}`);
    const bags=joined?button('reference-benefits','<img src="/assets/reference-r28/tool-luckybag.webp" alt="" width="40" height="40"><span>حقيبة الحظ</span>',''):'';
    const pk=c.challengeModel?.available?button('challenge-setup','<img src="/assets/reference-r28/tool-challenge.webp" alt="" width="40" height="40"><span>تحدّي الفريقين</span>',c.challengeModel.canStart?'':'disabled'):'';
    return `<nav class="so-room-tools" data-so-room-tools aria-label="أدوات الغرفة الفعلية">${bags}${tool('settings','الإعدادات','settings',!joined)}${tool('councils','المجالس','chair')}${tool('members','الأعضاء','users')}${tool('audio','الصوت','volume')}${tool('modes','أنماط الجلسة','star',!council)}${tool('roomtools','أدوات المجلس','star',!council)}${c.snapshot?.room?.memory?tool('memory','ذاكرة المجلس','chat',!joined):''}${pk}</nav>`;
  }
  const status=c.voiceState?.status||'disconnected',connected=status==='connected',mic=c.voiceState?.microphone===true||c.voiceState?.micEnabled===true,muted=c.snapshot?.current?.muted===true;
  const tool=(panel,name,art,disabled=false)=>button('open-panel',icon(art)+`<span>${name}</span>`,`data-panel="${panel}" aria-controls="so-room-panel-slot" aria-expanded="${ui.panel===panel}" ${disabled?'disabled':''}`);
  return `<nav class="so-room-tools" data-so-room-tools aria-label="لوحات الغرفة">${tool('councils','المجالس','chair')}${tool('members','الأعضاء','users')}${tool('modes','الأنماط','star',!council)}${tool('audio','الصوت','volume')}${tool('settings','الإعدادات','settings',!joined)}${c.snapshot?.room?.memory?tool('memory','ذاكرة المجلس','chat',!joined):''}</nav>`;
}
function councilStripHTML(c) {
  const councils=arr(c.snapshot?.room?.councils).filter(x=>x.id!==currentCouncil(c)?.id);
  return councils.length?`<nav class="so-council-strip" data-so-council-strip aria-label="المجالس الأخرى"><span class="so-strip-label">مجالس أخرى <small>${councils.length}</small></span>${councils.map(x=>councilCard(x,c,true)).join('')}</nav>`:'';
}
function roomHostHTML(c,person,role) {
  if(!person?.name)return '';
  const member=arr(c.snapshot?.room?.members).find(m=>String(m.id)===String(person.id));
  const host=actualHost({...person,...member},c),entered=c.snapshot?.current?.roomId===c.snapshot?.room?.id;
  const portrait=entered?{...person,...member}:{id:person.id,name:person.name,avatar:typeof person.avatar==='string'&&!person.avatar.includes('/api/social/avatar')?person.avatar:null};
  return `<div class="so-room-host" data-so-role="${esc(role)}" title="${esc(person.name)} · ${host?'المضيف':esc(ROLE_NAMES[role]||'عضو')}"><span class="so-host-portrait">${portraitHTML(portrait,60)}${host?crown():''}</span><span class="so-host-label"><b>${esc(person.name)}</b><small>${host?'المضيف':esc(ROLE_NAMES[role]||'عضو')}</small></span></div>`;
}
let giftIconSeq=0;
function detailHTML(c,ui={panel:'',preview:'',dialogOpen:false}) {
  const data=c.snapshot,room=data?.room,joined=data?.current?.roomId===room?.id,council=currentCouncil(c);
  if(!room)return `${feedback(c)}<section class="so-panel">${c.loading?'<p class="so-loading" role="status">جارٍ فتح الغرفة…</p>':empty('الغرفة غير متاحة','حدّث الصفحة أو عد إلى الغرف الاجتماعية.')}<a class="so-button" href="#/social-rooms">العودة للغرف</a>${button('refresh','إعادة التحميل')}</section>`;
  const focused=visibleCouncil(c),host=room.host||room.owner,hostMember={...host,...arr(room.members).find(m=>m.id===host?.id)};
  const count=Number.isInteger(room.count)?room.count:arr(room.members).length;
  return `<div class="so-room-detail" data-so-room-detail ${room.rank?.tier&&perkActive(room.rank.tier,"theme")?`data-rr-theme="${esc(room.rank.tier)}"`:""} ${room.rank?.tier&&perkActive(room.rank.tier,"frame")?`data-rr-frame="${esc(room.rank.tier)}"`:""} data-so-entered="${joined}" data-so-layout="voice-stage-r15" ${!c.ctx.gameRoom?'data-so-reference-room="r28"':''}><header class="so-room-header"><div class="so-room-topline" dir="ltr"><div class="so-room-menu">${circleButton('open-panel','menu','قائمة الغرفة','data-panel="menu"')}${roomHeartHTML(c)}<button type="button" class="so-room-wordmark" data-so-action="info" aria-label="معلومات غرفة لعبنا">${crown()}</button></div><div class="so-room-identity" dir="rtl"><div class="so-room-title"><h1>${esc(room.name)}</h1><span class="so-room-id${room.vanity?' is-vanity':''}" dir="ltr">ID: ${esc(room.code||room.id)}</span>${RANK_CHIP("room",room.level||1)?`<span class="rl-chip rl-chip-${esc(room.level||1)} has-art58" title="ليفل الغرفة"><img class="art58-chip" src="${RANK_CHIP("room",room.level||1)}" alt="" decoding="async"><b class="art58-chip-tx">Lv ${esc(room.level||1)}</b></span>`:`<span class="rl-chip rl-chip-${esc(room.level||1)}" title="ليفل الغرفة">Lv ${esc(room.level||1)}</span>`}${room.rank?.tier?`<button type="button" class="rr-chip-btn" data-so-action="rank-open" aria-label="رتبة الغرفة">${tierChip(room.rank.tier,"h")}</button>`:""}</div>${roomHostHTML(c,host,room.host?'host':'owner')}</div><button type="button" class="so-circle-button so-back" data-so-action="back-room" aria-label="الرجوع من الغرفة" aria-expanded="${ui.exitPop?'true':'false'}">${icon('back')}</button></div>${ui.exitPop?`<button type="button" class="so-exit-scrim-r67" data-so-action="exit-pop-close" aria-label="إغلاق"></button><div class="so-exit-panel-r67" role="menu" dir="ltr"><button type="button" role="menuitem" class="is-leave" data-so-action="room-leave-now"><span class="so-exit-ring-r67"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg></span><b>مغادرة</b></button><button type="button" role="menuitem" data-so-action="room-minimize"><span class="so-exit-ring-r67"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4v6h6"/><path d="M20 4l-6 6"/><path d="M10 20v-6H4"/><path d="M4 20l6-6"/></svg></span><b>حفظ</b></button></div>`:''}${arr(room.ads).length?`<div class="so-ads-r58" role="marquee" aria-label="إعلانات الغرفة"><span aria-hidden="true">📢</span><div class="so-ads-viewport"><div class="so-ads-track" style="--ads-n:${arr(room.ads).length}">${[...arr(room.ads),...arr(room.ads)].map(a=>`<span>${esc(a.text)}</span>`).join('<i>•</i>')}</div></div></div>`:''}<div class="so-header-chips" dir="rtl"><button type="button" class="so-count-pill" data-so-action="open-panel" data-panel="members" aria-label="${esc(count)} أعضاء منضمون للغرفة؛ المشاهدة وحدها لا تحتسب">${icon('users')}<span>${esc(count)} أعضاء منضمون</span></button><span class="so-membership-state" role="status">${council?'عضو بالمجلس':joined?'عضو بالغرفة · دون مقعد':'معاينة فقط'}</span>${!joined?button('join-room','انضمام','',true):''}${!c.ctx.gameRoom&&data.publicSupport?.available===true&&!council?button('open-panel',icon('gift')+' دعم بدون مقعد','data-panel="gifts" aria-label="دعم الغرفة بدون دخول أو تشغيل المايك"'):''}<span class="so-room-rank" aria-label="رتبة المضيف، وليست مستوى الغرفة">${c.ctx.gameRoom?rankBadges(hostMember):referenceHeaderRanks(hostMember)}</span></div></header>${c.pending||c.error?feedback(c):''}<div class="so-room-workspace${ui.panel||ui.dialogOpen?' has-open-panel':''}" data-so-workspace>${challengeBoardHTML(c,focused,joined)}${chatHTML(c,council,ui)}${referenceShortcuts(c)}<aside class="so-room-panel-slot${ui.panel==='gifts'?' is-gifts-panel':''}" id="so-room-panel-slot" data-so-panel-slot aria-label="لوحات الغرفة" ${!ui.panel&&!ui.dialogOpen?'hidden':''}>${roomPanelHTML(c,ui)}<div data-so-reserved-dialog></div></aside></div>${roomDockHTML(c,council,ui)}${ui.rankOpen?roomRankPageHTML(room,ui,c.snapshot.room.rankStats):""}${ui.welcome?ui.welcome.html:""}</div>`;
}

function gameVoiceWaitingHTML(c) {
  const voice=c.ctx.gameVoice,blocked=voice?.status==='blocked';
  return `<section class="so-panel gv-voice-waiting"><span class="so-eyebrow">اللعبة والغرفة في مكان واحد</span><h1>${esc(c.ctx.gameRoom?.gameId||'اللعبة')}</h1><p role="status">${blocked?'اللعبة محفوظة ومتاحة. تعذر دخول الغرفة الصوتية: '+esc(friendly(voice.error)):'جارٍ تأكيد غرفتك الصوتية من الخادم…'}</p>${feedback(c)}${blocked?button('game-voice-retry',voice.error==='adult_acknowledgement_required'?'إقرار البلوغ ومحاولة دخول الصوت':'إعادة محاولة دخول الصوت','',true):''}<p class="so-note">افتح «اللعبة» للوحة والتحكم. لا يتغير عدد اللاعبين بسبب دعوات الصوت؛ والانضمام للعبة يكون برمزها وكلمة مرورها إن كانت خاصة. المايك لا يعمل تلقائيًا.</p></section>`;
}

/** Page body only. Original environment art is CSS decoration, never clickable UI. */
export function render(ctx={}) {
  const auth=!ctx.user?'<section class="so-panel">'+empty('المجلس يرحّب بك','سجّل دخولك بحساب لعبنا الحالي لتفتح غرفك ومجالسك.')+'<a class="so-button so-primary" href="#/account">تسجيل الدخول</a></section>':'';
  return `<div class="so-page" data-lb-page="social" dir="rtl"><div data-so-host>${auth||'<section class="so-panel"><p class="so-loading" role="status">جارٍ تحميل الغرف الاجتماعية…</p></section>'}</div><div data-so-dialog-host></div></div>`;
}
export function mount(root,ctx={}) {
  const page=root?.matches?.('.so-page[data-lb-page="social"]')?root:root?.querySelector?.('.so-page[data-lb-page="social"]');
  const host=page?.querySelector('[data-so-host]'),dialogHost=page?.querySelector('[data-so-dialog-host]');
  if(page)page.dataset.soSocialVoice=String(!ctx.gameRoom);
  if(!host||!ctx.user) return {destroy(){}};
  if(!document.querySelector('link[data-social-styles]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/social.css?v=r58p';link.dataset.socialStyles='';document.head.append(link);}
  if(typeof ctx.api!=='function' || !identity(ctx)) {host.innerHTML='<section class="so-panel"><p role="alert">واجهة الاتصال الموثقة أو هوية الحساب غير متاحة.</p></section>';return {destroy(){}};}
  if(!document.querySelector('link[data-rank-perks-r56]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/rank-perks-r56.css?v=r56';link.dataset.rankPerksR56='';document.head.append(link);}
  if(!document.querySelector('link[data-social-r55]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/social-r55.css?v=r58q';link.dataset.socialR55='';document.head.append(link);}
  if(!document.querySelector('link[data-social-room-r7]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/social-room-r7.css?v=r58p';link.dataset.socialRoomR7='';document.head.append(link);}
  if(!document.querySelector('link[data-room-composer-r18]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/room-composer-r18.css?v=r58p';link.dataset.roomComposerR18='';document.head.append(link);}
  if(!document.querySelector('link[data-scorebar-r26]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/social-challenge.css?v=r58p';link.dataset.scorebarR26='';document.head.append(link);}
  if(!document.querySelector('link[data-room-viewport-r27]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/room-viewport-r27.css';link.dataset.roomViewportR27='';document.head.append(link);}
  if(!document.querySelector('link[data-room-style-r27]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/room-style-r27.css?v=r58p';link.dataset.roomStyleR27='';document.head.append(link);}
  if(!ctx.gameRoom){
    for(const [tag,file] of [['room','reference-room-r28.css'],['panels','reference-panels-r28.css'],['gifts','reference-gifts-r28.css']]){
      if(!document.querySelector(`link[data-reference-r28="${tag}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/'+file+'?v=gifts-cannon-r29';link.dataset.referenceR28=tag;document.head.append(link);}
    }
  }
  if(!ctx.gameRoom){
    for(const [tag,file] of [['colors','/unified/gift-colors-r29.css?v=r58p'],['dock','/unified/room-dock-r29.css?v=r58p'],['cannon','/cannon3d-r29.css?v=r58p']]){
      if(!document.querySelector(`link[data-room-r29="${tag}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=file+'?v='+(tag==='colors'?'purple-r38':'gifts-cannon-r29');link.dataset.roomR29=tag;document.head.append(link);}
    }
  }
  if(!document.querySelector('link[data-gift-compact-r38]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/gift-compact-r38.css?v=r58p';link.dataset.giftCompactR38='';document.head.append(link);}
  if(!ctx.gameRoom&&!document.querySelector('link[data-room-directory-r30]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/room-directory-r30.css?v=r58q';link.dataset.roomDirectoryR30='';document.head.append(link);}
  if(!document.querySelector('link[data-room-photo-r31]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/room-photo-r31.css?v=r58q';link.dataset.roomPhotoR31='';document.head.append(link);}
  if(!ctx.gameRoom&&!document.querySelector('link[data-pk-reference-r32]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/pk-reference-r32.css?v=r58p';link.dataset.pkReferenceR32='';document.head.append(link);}
  if(!ctx.gameRoom&&!document.querySelector('link[data-room-owner-start-r33]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/room-owner-start-r33.css?v=r58q';link.dataset.roomOwnerStartR33='';document.head.append(link);}
  const c=ensure(ctx);let autoVoiceAttempt='';let alive=true,dialog=null,dialogReturn=null,dialogSubmit=null,dialogBusy=false,panelReturn=null,photoPicker=null;
  const ui={rankOpen:false,rankView:null,rankTab:'perks',welcome:null,seenMembers:null,exitPop:false,cannonStage:null,chatUnread:0,chatSeenScope:'',chatSeen:new Set(),panel:'',preview:'',dialogOpen:false,previousPanel:'',emoji:false,output:false,chatSelection:null,settings:false,settingsScroll:0,settingsDialog:''},draftCache=c.drafts,gifts=ctx.socialGifts;let giftsUnsubscribe=null,renderedScope='',settingsReturn=null;
  // room-tools-r33: mount
  c.roomTools?.destroy();
  const roomToolsR33 = createRoomToolsR33({getSnapshot:()=>c.snapshot, getCouncil:()=>currentCouncil(c), send:(name,fields)=>command(c,name,fields), onError:message=>{if(alive){c.error=message;c.notify();}}});
  c.roomTools = roomToolsR33;
  c.gamesR47?.destroy();
  const gamesR47=createSocialGamesR47({getSnapshot:()=>c.snapshot,getCouncil:()=>currentCouncil(c),send:(name,fields)=>command(c,name,fields),onError:message=>{if(alive){c.error=message;c.notify();}}});
  c.gamesR47=gamesR47;
  const shell=page.closest('.lb-unified'),draftScope=()=>JSON.stringify([c.routeRoom,currentCouncil(c)?.id||'']);
  const draftKey=(type,mode,actionType,scope=draftScope())=>JSON.stringify([scope,type,mode,actionType]);
  const saveDrafts=()=>host.querySelectorAll('form[data-so-form]').forEach(form=>draftCache.set(draftKey(form.dataset.soForm,form.dataset.mode,form.dataset.type,renderedScope),[...form.elements].filter(e=>e.name&&!(SOCIAL_GAME_LABELS_R47[form.dataset.mode]&&['version','round'].includes(e.name))).map(e=>({name:e.name,value:e.value,checked:e.checked}))));
  const routeRoom=String(ctx.socialRoomId||'');
  if(routeRoom&&!ctx.gameRoom)import('./room-dm-r67.js?v=r67a').then(m=>m.watchUnread()).catch(()=>{});if(routeRoom&&minimizedRoom){clearMinimized();} else if(!routeRoom&&minimizedRoom&&!ctx.gameRoom){minimizeBubble();}
  if(c.routeRoom!==routeRoom) {destroyBenefits(c);c.entranceFX?.cancel();c.challengeUI?.reset();c.challengeUpdates?.clear();c.challengeModel={available:false};c.routeRoom=routeRoom;c.readSeq++;c.loading=false;c.error='';c.snapshot=null;}
  ctx.openBenefits=options=>openOwnBenefits(c,options);
  const focusMark=el=>el&&page.contains(el)?{node:el,action:el.dataset?.soAction,id:el.dataset?.id,panel:el.dataset?.panel,mode:el.dataset?.mode,setting:el.dataset?.setting,value:el.dataset?.value,name:el.name,gift:!!el.closest?.('[data-so-gifts]'),domId:el.id,form:el.closest?.('form')?.dataset.soForm,formMode:el.closest?.('form')?.dataset.mode,formType:el.closest?.('form')?.dataset.type}:null;
  const editableFocus=el=>!!el&&(el.isContentEditable||el.matches?.('textarea,select,input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="hidden"])'));
  // A sheet/dialog transition ends typing, not the draft. Safari does not always
  // focus tapped buttons, so explicitly blur before paint captures the old input.
  const dismissEditableFocus=()=>{
    const active=document.activeElement;
    if(active?.id==='so-chat-text')ui.chatSelection=[active.selectionStart,active.selectionEnd,active.selectionDirection];
    if(page.contains(active)&&editableFocus(active))active.blur();
  };
  const returnFocus=(mark,{allowEditable=false}={})=>{
    if(!alive||!page.isConnected||!mark)return;
    let el=mark.node?.isConnected&&page.contains(mark.node)?mark.node:null;
    if(!el&&mark.gift)el=[...host.querySelectorAll('[data-so-gifts] input,[data-so-gifts] select,[data-so-gifts] textarea,[data-so-gifts] button')].find(x=>mark.domId?x.id===mark.domId:mark.name&&x.name===mark.name);
    if(!el&&mark.name&&mark.form)el=[...host.querySelectorAll('form')].find(f=>f.dataset.soForm===mark.form&&f.dataset.mode===mark.formMode&&f.dataset.type===mark.formType)?.elements.namedItem(mark.name);
    if(!el&&mark.action)el=[...page.querySelectorAll('[data-so-action]')].find(x=>x.dataset.soAction===mark.action&&x.dataset.id===mark.id&&x.dataset.panel===mark.panel&&x.dataset.mode===mark.mode&&x.dataset.setting===mark.setting&&x.dataset.value===mark.value);
    if(!allowEditable&&editableFocus(el))el=null;
    if(!el&&ui.panel)el=host.querySelector('[data-so-open-panel]');
    if(!el&&dialog)el=dialog.querySelector('[data-so-action="dialog-close"]');
    if(!el&&ui.settings)el=host.querySelector('[data-so-action="settings-back"]');
    if(!el)el=host.querySelector('[data-so-room-dock] button:not(:disabled)')||host.querySelector('[data-so-room-tools] button:not(:disabled)')||host.querySelector('[data-so-action="back-room"]');
    if(el?.disabled&&dialog)el=dialog.querySelector('[data-so-action="dialog-close"]');
    if(el&&!el.disabled)el.focus?.({preventScroll:true});
  };
  const paint=()=>{
    if(!alive)return;
    // R58c: ترحيب حصري (امتياز الرتبة الملكية فما فوق) لما يدخل عضو جديد الغرفة
    try{const room=c.snapshot?.room,ids=arr(room?.members).map(m=>String(m.id));if(room&&c.routeRoom===room.id){const prevSeen=ui.seenMembers&&ui.seenMembers.room===room.id?ui.seenMembers.ids:null;ui.seenMembers={room:room.id,ids:new Set(ids)};if(prevSeen&&room.rank?.tier&&perkActive(room.rank.tier,'welcome')){const fresh=arr(room.members).find(m=>!prevSeen.has(String(m.id))&&String(m.id)!==String(c.uid)&&m.stealth!==true);if(fresh){const t=Date.now();ui.welcome={t,html:welcomeHTML(room.rank.tier,fresh.name||'')};setTimeout(()=>{if(ui.welcome?.t===t){ui.welcome=null;paint();}},3600);}}}}catch{/* ترحيب شكلي فقط */}
    const active=document.activeElement,mark=focusMark(active),selection=[active?.selectionStart,active?.selectionEnd,active?.selectionDirection],inDialog=dialog?.contains(active);
    const log=host.querySelector('.so-chat-messages'),scroll=log?.scrollTop,atBottom=!log||log.scrollHeight-log.clientHeight-log.scrollTop<48,panelScroll=host.querySelector('[data-so-panel-scroll]')?.scrollTop;
    const settingsScroll=host.querySelector('[data-so-settings-scroll]');if(settingsScroll)ui.settingsScroll=settingsScroll.scrollTop;
    const giftConfirmWasOpen=!!host.querySelector('[data-so-gifts] .so-gift-confirm');
    const giftScroll=host.querySelector('.so-gift-catalog')?.scrollTop,giftSheetScroll=host.querySelector('.so-gift-shop')?.scrollTop,recipientScroll=host.querySelector('.so-gift-recipient-strip')?.scrollLeft;
    const oldDirectoryQuery=host.querySelector('[data-so-directory-query]');
    const directoryScroll=[...host.querySelectorAll('[data-so-directory-rail]')].map(el=>[el.dataset.soDirectoryRail,el.scrollLeft]);
    const oldInput=host.querySelector('#so-chat-text'),sameScope=renderedScope===draftScope();saveDrafts();
    if(sameScope&&oldInput)ui.chatSelection=[oldInput.selectionStart,oldInput.selectionEnd,oldInput.selectionDirection];
    const oldMarquee=host.querySelector('[data-so-challenge-marquee]');
    const oldScorebar=host.querySelector('[data-so-scorebar]');
    // Count only real newly received chat IDs while older messages are being read.
    // History on entry/council change and the player's own messages never count.
    const chatScope=draftScope(),messages=arr(currentCouncil(c)?.chat);
    if(ui.chatSeenScope!==chatScope){ui.chatSeenScope=chatScope;ui.chatUnread=0;ui.chatSeen=new Set(messages.map(message=>message.id));}
    else {const incoming=messages.filter(message=>message.id&&!ui.chatSeen.has(message.id)&&String(message.author?.id)!==String(selfId(c)));ui.chatSeen=new Set(messages.map(message=>message.id));ui.chatUnread=atBottom?0:ui.chatUnread+incoming.length;}

    const openDetails=[...host.querySelectorAll('details[open]')].map(el=>el.id||el.className);
    const settingsDialog=dialog?.classList.contains('so-dialog-settings'),dialogScroll=dialog?.querySelector('.so-dialog-body')?.scrollTop;
    const reservedDialog=dialog?.classList.contains('so-dialog-reserved')||settingsDialog;
    if(reservedDialog)dialog.remove();
    // Parse in an inert template, so unchanged private portraits do not refetch
    // on every chat/voice/panel update. Nodes never survive a room/account teardown.
    const portraits=new Map();
    for(const image of host.querySelectorAll('img')){
      if(image.complete&&image.naturalWidth===0)continue;
      const source=image.getAttribute('src'),bucket=portraits.get(source)||[];
      bucket.push(image);portraits.set(source,bucket);
    }
    const template=document.createElement('template');
    template.innerHTML=ctx.gameRoom&&ctx.gameVoice?.status!=='ready'?gameVoiceWaitingHTML(c):c.routeRoom?detailHTML(c,ui):listHTML(c);
    const pkStage=template.content.querySelector('[data-so-room-detail]');if(pkStage&&!ctx.gameRoom&&c.challengeModel?.challenge?.status==='active'&&pkStage.querySelector('[data-so-challenge]')){pkStage.dataset.soPkReference='active';pkStage.classList.add('is-pk-reference-active');}
    if(!ctx.gameRoom&&c.ownerVoiceStart?.roomId===c.routeRoom&&confirmedOwnerSeat(c.snapshot,c.ownerVoiceStart))template.content.querySelector('.so-room-header')?.insertAdjacentHTML('afterend',ownerStartFeedback(c.ownerVoiceStart,c.voiceState));
    if(ctx.gameRoom&&ctx.gameVoice?.status==='ready'){const header=template.content.querySelector('.so-header-chips');if(header)header.insertAdjacentHTML('beforeend',`${canInvite(c)?button('invite',icon('invite')+' دعوة صديق'):''}<span class="gv-voice-state" role="status">${voiceStatusHTML(c)}</span>`);}
    if(ui.settings&&c.snapshot?.room){const stage=template.content.querySelector('[data-so-room-detail]');if(stage){stage.dataset.soSettingsOpen='true';stage.querySelector(':scope > .so-feedback')?.remove();const settings=document.createElement('template');settings.innerHTML=roomSettingsHTML(c,ui);stage.append(settings.content);}}
    const reused=[];
    for(const image of template.content.querySelectorAll('img')){
      const previous=portraits.get(image.getAttribute('src'))?.shift();
      if(previous){
        for(const attribute of [...image.attributes]){if(previous.getAttribute(attribute.name)!==attribute.value)previous.setAttribute(attribute.name,attribute.value);}
        const marker=document.createElement('span');image.replaceWith(marker);reused.push([marker,previous]);
      }
    }
    host.replaceChildren(template.content);
    for(const [marker,image] of reused)marker.replaceWith(image);
    // room-tools-r33: restore
    roomToolsR33.restore(host);
    gamesR47.refresh(host);
    renderedScope=draftScope();
    const nextDirectoryQuery=host.querySelector('[data-so-directory-query]');if(!c.routeRoom&&oldDirectoryQuery&&nextDirectoryQuery){if(oldDirectoryQuery.value!==c.directoryUI.query)oldDirectoryQuery.value=c.directoryUI.query;nextDirectoryQuery.replaceWith(oldDirectoryQuery);}
    if(!c.routeRoom)for(const [rail,left] of directoryScroll){const el=host.querySelector(`[data-so-directory-rail="${rail}"]`);if(el)el.scrollLeft=left;}
    const nextInput=host.querySelector('#so-chat-text');if(sameScope&&oldInput&&nextInput){nextInput.replaceWith(oldInput);if(ui.chatSelection)try{oldInput.setSelectionRange(...ui.chatSelection);}catch{}}else if(!sameScope)ui.chatSelection=null;
    const nextMarquee=host.querySelector('[data-so-challenge-marquee]');
    if(sameScope&&oldMarquee&&nextMarquee&&oldMarquee.querySelector('[data-so-feed-id]')?.dataset.soFeedId===nextMarquee.querySelector('[data-so-feed-id]')?.dataset.soFeedId)nextMarquee.replaceWith(oldMarquee);
    preserveScorebar(oldScorebar,host.querySelector('[data-so-scorebar]'),sameScope);
    shell?.classList.toggle('lb-social-entered',!!c.routeRoom&&!!c.snapshot?.room);
    shell?.classList.toggle('lb-social-directory-r30',!ctx.gameRoom&&!c.routeRoom);
    page.dataset.soSocialVoice=String(!ctx.gameRoom);
    const fullRoom=!!c.routeRoom&&!!c.snapshot?.room&&!ctx.gameRoom;
    page.dataset.soViewportRoom=String(fullRoom);if(shell)shell.dataset.soViewportRoom=String(fullRoom);
    document.documentElement.classList.toggle('lb-social-viewport-r27',fullRoom);
    if(reservedDialog){(host.querySelector(settingsDialog?'[data-so-settings-dialog-host]':'[data-so-reserved-dialog]')||dialogHost).append(dialog);if(inDialog&&active?.isConnected)active.focus({preventScroll:true});}
    if(settingsDialog){
      const dynamic=dialog.querySelector('[data-so-settings-dynamic]');
      if(dynamic){const focused=focusMark(document.activeElement),inside=dynamic.contains(document.activeElement);dynamic.innerHTML=ui.settingsDialog==='theme'?themeCards(c.snapshot.room.settings?.theme):ui.settingsDialog==='seatLocks'?seatLockCards(settingsSeats(c).council):ui.settingsDialog==='micRequests'?settingsMicHTML(c):settingsPrivateList(c,ui.settingsDialog);if(inside)returnFocus(focused);}
      if(dialogScroll!==undefined)dialog.querySelector('.so-dialog-body').scrollTop=dialogScroll;
    }
    host.querySelectorAll('form[data-so-form]').forEach(form=>{const draft=draftCache.get(draftKey(form.dataset.soForm,form.dataset.mode,form.dataset.type));draft?.forEach(v=>{const el=form.elements.namedItem(v.name);if(el){if(el.value!==v.value)el.value=v.value;if(el.type==='checkbox')el.checked=v.checked;}});});
    host.querySelectorAll('details').forEach(el=>{if(openDetails.includes(el.id||el.className))el.open=true;});
    if(mark&&!inDialog){const allowEditable=sameScope&&(mark.gift?ui.panel==='gifts':!ui.panel&&!ui.dialogOpen&&!ui.settings);returnFocus(mark,{allowEditable});if(mark.name&&allowEditable){const field=document.activeElement;try{field?.setSelectionRange(...selection);}catch{}}}
    host.querySelector('.so-chat-input-wrap')?.classList.toggle('has-text',!!host.querySelector('#so-chat-text')?.value.trim());
    const nextLog=host.querySelector('.so-chat-messages');if(nextLog)nextLog.scrollTop=atBottom?nextLog.scrollHeight:scroll||0;
    if(panelScroll!==undefined&&host.querySelector('[data-so-panel-scroll]'))host.querySelector('[data-so-panel-scroll]').scrollTop=panelScroll;
    if(giftScroll!==undefined&&host.querySelector('.so-gift-catalog'))host.querySelector('.so-gift-catalog').scrollTop=giftScroll;
    if(giftSheetScroll!==undefined&&host.querySelector('.so-gift-shop'))host.querySelector('.so-gift-shop').scrollTop=giftSheetScroll;
    if(recipientScroll!==undefined&&host.querySelector('.so-gift-recipient-strip'))host.querySelector('.so-gift-recipient-strip').scrollLeft=recipientScroll;
    const giftConfirm=host.querySelector('[data-so-gifts] .so-gift-confirm');
    if(giftConfirm&&!giftConfirmWasOpen){giftConfirm.scrollIntoView({block:'nearest'});giftConfirm.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
    const nextSettingsScroll=host.querySelector('[data-so-settings-scroll]');if(nextSettingsScroll)nextSettingsScroll.scrollTop=ui.settingsScroll;
    if(c.busy||c.loading)host.querySelectorAll('button:not([data-so-action="select-mode"]):not([data-so-action="panel-close"]):not([data-so-action="open-panel"]):not([data-so-action="dialog-close"]):not([data-so-action="settings-back"])').forEach(b=>{if(dialog?.contains(b)||b.closest('[data-so-gifts]')||b.dataset.soAction==='game-voice-retry')return;b.disabled=true;b.setAttribute('aria-busy','true');});
    if(ui.settings)host.querySelectorAll('[data-so-room-detail] > :not([data-so-room-settings])').forEach(el=>el.inert=true);
    observeDock();fitViewport();
    applyRoomTheme(host.querySelector('[data-so-room-detail]'),c.snapshot?.room?.settings?.theme,ctx.gameRoom);
    c.entranceHost=host.querySelector('[data-so-room-detail]');c.entranceFX?.restore();
    c.challengeHost=host;c.challengeUI?.restore();
    attachGiftRuntime(c,host.querySelector('.so-room-workspace'));
    if(!c.cannonFX&&!ctx.gameRoom)c.cannonFX=createCannonEffects(()=>c.ctx.gameRoom?null:c.entranceHost);
    c.cannonFX?.restore(c.snapshot?.room?.cannon);
    if(settingsDialog){host.querySelector('[data-so-settings-scroll]').inert=true;host.querySelector('.so-settings-header').inert=true;}
    if(dialog&&c.routeRoom)host.querySelectorAll('[data-so-challenge],[data-so-challenge-chairs],[data-so-board],[data-so-room-tools],[data-so-chat-region],[data-so-council-strip],[data-so-room-dock],.so-room-header,.so-room-shortcuts').forEach(el=>{el.inert=true;});
    // Connect listen-only once, after real current membership matches both returned IDs.
    const binding=ctx.gameVoice,target=binding?.status==='ready'?`${binding.roomId}/${binding.councilId}`:'';
    if(target&&target!==autoVoiceAttempt&&!c.loading&&c.snapshot?.current?.roomId===binding.roomId&&c.snapshot?.current?.councilId===binding.councilId&&currentCouncil(c)?.id===binding.councilId){autoVoiceAttempt=target;if(c.voiceTarget!==target)queueMicrotask(()=>{if(alive&&c===live&&c.routeRoom===binding.roomId)void run(()=>voiceConnect(c));});}
    host.classList.toggle('so-relaxed',currentCouncil(c)?.modes?.quiet?.preference?.relax===true&&c.selectedMode==='quiet');
  };
  // The gift controller owns all financial state, including pending/idempotency keys.
  const closeGifts=()=>{if(ui.panel==='gifts'){try{gifts?.close?.();}catch(e){reportError(e);}}};
  const openGifts=()=>{void run(async()=>{await gifts?.open?.(c.snapshot);if(alive)paint();});};
  const closeDialog=(restore=true)=>{
    if(dialogBusy)return;
    photoPicker?.destroy();photoPicker=null;const mark=dialogReturn,wasOpen=!!dialog;if(wasOpen)dismissEditableFocus();dialog?.close?.();dialog?.remove();dialogHost.innerHTML='';dialog=null;dialogSubmit=null;dialogReturn=null;ui.dialogOpen=false;ui.settingsDialog='';
    if(wasOpen&&alive){ui.panel=ui.previousPanel;ui.previousPanel='';paint();if(ui.panel==='gifts')openGifts();if(restore)returnFocus(mark);}
  };
  const closePanel=(restore=true)=>{if(!alive)return;dismissEditableFocus();closeGifts();ui.panel='';ui.preview='';paint();if(restore)returnFocus(panelReturn);};
  const closeSettings=()=>{if(dialogBusy)return;if(dialog){closeDialog();return;}ui.settings=false;ui.settingsScroll=0;ui.panel='menu';paint();returnFocus(settingsReturn);};
  const openSettings=target=>{
    if(!alive||dialogBusy||c.snapshot?.current?.roomId!==c.routeRoom)return;
    if(!document.querySelector('link[data-social-settings-r12]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/social-settings-r12.css?v=r58p';link.dataset.socialSettingsR12='';document.head.append(link);}
    if(dialog)closeDialog(false);settingsReturn=focusMark(target||document.activeElement);dismissEditableFocus();closeGifts();ui.panel='';ui.preview='';ui.settings=true;ui.settingsScroll=0;paint();host.querySelector('[data-so-action="settings-back"]')?.focus({preventScroll:true});
  };
  const openPanel=(name,target)=>{
    if(!PANEL_NAMES[name]||!alive||dialogBusy)return;
    if(name==='settings'){openSettings(target);return;}
    if(dialog)closeDialog(false);
    if(ui.panel===name){closePanel();return;}
    closeGifts();
    panelReturn=focusMark(target||document.activeElement);dismissEditableFocus();ui.panel=name;ui.preview='';paint();
    if(name==='gifts')openGifts();
    const panel=host.querySelector('[data-so-open-panel]');panel?.focus({preventScroll:true});if(name==='cannon'){const body=panel?.querySelector('[data-so-panel-scroll]');if(body)body.scrollTop=0;if(panel)panel.scrollTop=0;}else panel?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  };
  const openDialog=(title,body,onSubmit,label='تأكيد')=>{
    if(!alive||dialogBusy)return;
    const mark=focusMark(document.activeElement);closeDialog(false);dismissEditableFocus();dialogReturn=mark;dialogSubmit=onSubmit;
    const settings=ui.settings,reserved=!!c.routeRoom&&!!c.snapshot?.room;
    if(reserved){closeGifts();ui.previousPanel=ui.panel;ui.panel='';ui.dialogOpen=true;paint();}
    const target=settings?host.querySelector('[data-so-settings-dialog-host]'):reserved?host.querySelector('[data-so-reserved-dialog]'):dialogHost;
    target.innerHTML=`<dialog class="so-dialog${settings?' so-dialog-settings':reserved?' so-dialog-reserved':''}" ${reserved?`open data-so-open-panel="dialog" aria-modal="${settings?'true':'false'}"`:''} aria-labelledby="so-dialog-title"><form data-so-dialog-form><header><h2 id="so-dialog-title" tabindex="-1" autofocus>${esc(title)}</h2>${button('dialog-close',icon(settings?'chevronRight':'close')+'<span class="so-sr">رجوع</span>')}</header><div class="so-dialog-body">${body}</div><p class="so-error" data-so-dialog-error role="alert"></p><footer>${button('dialog-close',onSubmit?'إلغاء':'رجوع')}${onSubmit?`<button type="submit" class="so-button so-primary">${esc(label)}</button>`:''}</footer></form></dialog>`;
    dialog=target.querySelector('dialog');if(dialog.querySelector('[data-so-room-photo]'))photoPicker=createRoomPhotoPicker(dialog.querySelector('form'));dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
    if(!reserved)dialog.showModal();
    else if(settings){host.querySelector('[data-so-settings-scroll]').inert=true;host.querySelector('.so-settings-header').inert=true;}
    else {host.querySelectorAll('[data-so-challenge],[data-so-challenge-chairs],[data-so-board],[data-so-room-tools],[data-so-chat-region],[data-so-council-strip],[data-so-room-dock],.so-room-header,.so-room-shortcuts').forEach(el=>{el.inert=true;});dialog.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
    dialog.querySelector('#so-dialog-title')?.focus({preventScroll:true});
  };
  const reportError=e=>{if(alive){c.error=friendly(e?.message||'تعذر تنفيذ الطلب.');c.notify();}};
  const run=async(fn)=>{try{await fn();}catch(e){reportError(e);}};
  const scope=()=>({roomId:c.snapshot?.room?.id,councilId:currentCouncil(c)?.id});
  const openChallengeGifts=async(id,target)=>{
    const view=challengeModel(c),challenge=view.challenge,council=currentCouncil(c);
    const person=arr(challenge?.teams).flatMap(t=>arr(t.people)).find(p=>String(p.member?.id)===String(id));
    if(!person||person.canSupport!==true||challenge?.status!=='active'||challenge.endsAt<=Date.now()+(view.clockOffset||0))throw Error('الدعم غير متاح لهذا المشارك في مجلسك الحالي.');
    if(c.snapshot?.current?.roomId!==c.routeRoom||!arr(council?.members).some(m=>String(m.id)===String(id))||String(id)===selfId(c))throw Error('إرسال الهدايا متاح لعضو آخر من مجلسك الحالي فقط.');
    if(typeof gifts?.open!=='function'||typeof gifts?.handle!=='function')throw Error('الهدايا غير متاحة حاليًا.');
    if(ui.panel!=='gifts'){if(dialog)closeDialog(false);closeGifts();panelReturn=focusMark(target||document.activeElement);dismissEditableFocus();ui.panel='gifts';ui.preview='';paint();await gifts.open(c.snapshot);}
    if(!alive||ui.panel!=='gifts')return;
    paint();
    const recipient=[...host.querySelectorAll('[data-so-gift-action="recipient"]')].find(el=>String(el.dataset.id)===String(id));
    if(!recipient||recipient.disabled)throw Error('المستلم غير متاح الآن أو يوجد طلب هدية غير محسوم. لن نغير المستلم المحفوظ.');
    await gifts.handle({type:'click',target:recipient,preventDefault(){}},c.snapshot);
    if(!alive)return;paint();
    const selected=[...host.querySelectorAll('[data-so-gift-action="recipient"]')].find(el=>String(el.dataset.id)===String(id));
    if(selected?.getAttribute('aria-pressed')!=='true')throw Error('لم يتأكد اختيار المشارك. راجع المستلم قبل إرسال الهدية.');
    selected.scrollIntoView?.({block:'nearest',inline:'nearest'});selected.focus?.({preventScroll:true});
  };
  const openChallengeSetup=()=>{
    const view=challengeModel(c),council=currentCouncil(c),roomId=c.routeRoom,councilId=council?.id;
    if(!view.available||view.canStart!==true||!council||ctx.gameRoom)throw Error('بدء التحدي متاح للمالك أو المشرف المخول من مجلسه الحالي فقط.');
    openDialog('تحدي الفريقين',renderSetup(council.members),async form=>{
      const latest=challengeModel(c),current=currentCouncil(c);
      if(latest.canStart!==true||roomId!==c.routeRoom||current?.id!==councilId)throw Error('تغير المجلس أو الصلاحية؛ افتح إعداد التحدي مجددًا.');
      const picks={blue:[],red:[]};
      for(const select of form.querySelectorAll('[data-so-challenge-pick]'))if(['blue','red'].includes(select.value))picks[select.value].push(select.dataset.soChallengePick);
      const teams=validateTeams(picks,current.members);
      return challengeCommand(c,'start',{roomId,councilId,teams});
    },'بدء التحدي');
  };
  const cancelChallenge=()=>{
    const view=challengeModel(c),id=view.challenge?.id;
    if(view.canCancel!==true||view.challenge?.status!=='active')throw Error('لا تملك صلاحية إلغاء هذا التحدي.');
    return openDialog('إلغاء التحدي','<p>هل تؤكد إلغاء التحدي الحالي؟ لا يلغي ذلك الهدايا المؤكدة، ولا يغير الأرصدة. يقرر الخادم حالة التحدي.</p>',async()=>{
      const latest=challengeModel(c);
      if(latest.canCancel!==true||latest.challenge?.id!==id||latest.challenge?.status!=='active')throw Error('تغير التحدي أو الصلاحية؛ حدّث حالة الغرفة.');
      return challengeCommand(c,'cancel',{roomId:c.routeRoom,challengeId:id});
    },'تأكيد الإلغاء');
  };
  const ensureSeat=async()=>{
    if(currentCouncil(c))return;
    if(c.snapshot?.current?.roomId!==c.routeRoom){await command(c,'room:join',{roomId:c.routeRoom});if(c.error||c.snapshot?.current?.roomId!==c.routeRoom)throw Error('تم طلب الدخول لكن تعذر تأكيد حالة الغرفة. حدّث الحالة قبل متابعة المقاعد.');}
    const council=visibleCouncil(c);
    if(council){if(!council.canJoin)throw Error('المجلس غير متاح؛ اختر مجلسًا آخر من القائمة.');await command(c,'council:join',{roomId:c.routeRoom,councilId:council.id});}
    else {if(arr(c.snapshot?.room?.councils).length)throw Error('المجالس خاصة أو مقفلة. اختر مجلسًا واطلب الانضمام.');await command(c,'council:create',{roomId:c.routeRoom,name:c.snapshot.room.name,kind:'public',privacy:'public',seats:c.config.defaultCouncilSeats});}
    if(c.error||!currentCouncil(c)||c.snapshot?.current?.roomId!==c.routeRoom)throw Error('تعذر تأكيد المقعد من الخادم. حدّث الحالة قبل متابعة الصوت أو إرسال الرسالة.');
    // Membership starts only after an explicit seat/chat/microphone action. Never publish mic here.
  };
  const requireAdult=(fn)=>{
    if((c.routeRoom?c.snapshot:c.list)?.preferences?.adultAcknowledged===true) return fn();
    openDialog('قبل دخول المجالس',`<p>المجالس الاجتماعية للبالغين وفق سياسة المنصة. إن كانت بيانات عمرك غير مؤكدة، يقرر الخادم أهليتك. الإقرار لا يثبت العمر ولا يتجاوز الحماية.</p>${check('adultAcknowledged','أقر أنني بالغ وأوافق على قواعد الخصوصية والمشاركة')}<p class="so-note">لا تشارك بيانات شخصية. لا يتم تسجيل صوتك.</p>`,async form=>{if(!form.elements.adultAcknowledged.checked)throw Error('نحتاج موافقتك الصريحة. إن كنت دون السن المسموح فلا تدخل المجالس.');await command(c,'prefs:update',{adultAcknowledged:true});setTimeout(()=>{if(alive)void run(fn);},0);},'الموافقة والمتابعة');
  };
  // CREATE-COMMIT: one immutable intent survives dialog close/retry; raw passwords never enter storage.
  const openOwnerCreation=()=>{
    if(ctx.gameRoom)return;
    if(!c.ownerCreation)c.ownerCreation=createOwnerRoomStart({api:(...args)=>c.api(...args),uuid,config:c.config,restored:c.creationRecord||null,
      save:state=>{c.creationRecord=state;storage.set(c.creationStorageKey,JSON.stringify({owner:c.uid,state}));},
      send:async(name,fields,key)=>{if(c.pending){if(c.pending.key!==key||c.pending.command!==name)throw Error('يوجد طلب آخر غير محسوم. حدّث الحالة وأعد طلبك الأصلي أولاً.');if(c.pending.requiresPassword&&!c.pending.password)c.pending.password=fields.password;return command(c,'',{},true);}return command(c,name,{...fields,key});}});
    const flow=c.ownerCreation;
    openDialog('إنشاء غرفة',renderCreateFields(c.config),async form=>{
      const photo=photoPicker?.ready(),consent=form.elements.startMicrophone?.checked===true;
      let fields=flow.state?.fields;
      if(!fields){const validation=validateCreate(form);if(!validation.ok)throw Error(Object.values(validation.errors||{})[0]||'راجع بيانات الغرفة.');const {passwordEnabled,...value}=validation.value;fields=value;}
      else if(flow.state.requiresPassword&&!flow.state.roomReceipt)fields={...fields,password:form.elements.password.value};
      const epoch=c.epoch;let committed;
      try {committed=await flow.start(fields,{photo});}finally {if(flow.state?.roomId)form.dataset.createdRoom=flow.state.roomId;}
      if(!alive||c!==live||epoch!==c.epoch)return;
      c.ownerVoiceStart=await startOwnerVoice({...committed,consent,connect:()=>voiceConnect(c,committed.snapshot.current),voice:()=>c.voice,active:()=>alive&&c===live&&epoch===c.epoch});
      if(!alive||c!==live||epoch!==c.epoch)return;
      storage.remove(c.creationStorageKey);c.creationRecord=null;c.ownerCreation=null;
      c.notice=c.ownerVoiceStart.message||'غرفتك ومقعدك محفوظان. المايك حسب اختيارك وإذن المتصفح.';
      (globalThis.__LA3BAK_NAV__ || location).hash=roomURL(committed.state.roomId);
    },flow.state?'إكمال إنشاء غرفتك وبدء البث':'إنشاء الغرفة وبدء البث');
    dialog?.classList.add('so-create-room-r30');const form=dialog?.querySelector('form');form?.setAttribute('data-so-create-form','');if(form)form._ownerCreation=flow;
    if(form&&flow.state){for(const [name,value] of Object.entries(flow.state.fields||{})){const field=form.elements.namedItem(name);if(field&&name!=='password')field.value=String(value??'');}if(flow.state.roomId)form.dataset.createdRoom=flow.state.roomId;form.querySelectorAll('input:not([data-so-room-photo-input]):not([name="startMicrophone"]):not([name="password"]),textarea,select,[data-so-action="directory-create-choice"]').forEach(el=>el.disabled=true);if(flow.state.requiresPassword&&!flow.state.roomReceipt){form.elements.password.disabled=false;form.elements.password.required=true;}if(flow.state.photoRequired&&!flow.state.photoSaved){form.querySelector('[data-so-photo-status]').textContent='أعد اختيار الصورة بعد تحديث الصفحة أو ألغها صراحة؛ نكمل غرفتك الأصلية فقط.';form.querySelector('[data-so-action="room-photo-clear"]').hidden=false;}}
  };
  const forwardGift=event=>{
    const target=event.target?.closest?.('[data-so-gifts]');if(!target||!page.contains(target))return false;
    event.stopPropagation();if(event.type==='submit')event.preventDefault();
    const action=event.target?.closest?.('[data-so-gift-action]')?.dataset.soGiftAction;
    if(event.type==='click'&&action==='send'){
      const input=target.querySelector('#so-gift-custom-quantity');
      if(input&&document.activeElement===input&&typeof gifts?.handle==='function')gifts.handle({type:'change',target:input,preventDefault(){}},c.snapshot);
    }
    if(typeof gifts?.handle==='function')void run(()=>gifts.handle(event,c.snapshot)).then(()=>{
      if(alive&&ui.panel==='gifts'&&['pick','quantity'].includes(action))requestAnimationFrame(()=>{
        const panel=page.querySelector('[data-so-open-panel="gifts"] [data-so-panel-scroll]'),checkout=panel?.querySelector('.so-gift-checkout');
        if(panel&&checkout)panel.scrollTop+=checkout.getBoundingClientRect().top-panel.getBoundingClientRect().top-12;
      });
    });
    return true;
  };
  const requireSettingsRight=key=>{if(c.snapshot?.current?.roomId!==c.routeRoom||!settingsPermission(c,key))throw Error('لا تملك صلاحية تعديل هذا الإعداد في الغرفة.');};
  const settingsUpdate=async(right,fields)=>{requireSettingsRight(right);return command(c,'room:update',{roomId:c.routeRoom,...fields});};
  const pickAndSave=async(title,opts,current,save)=>{const v=await choiceSheet(title,opts,current);if(v==null||v===current)return;try{await save(v);toast67('تم الضبط بنجاح');}catch(e){reportError(e);}};
  const openSettingsEditor=key=>{
    if(!ui.settings)return;
    const r=c.snapshot?.room,s=settingsPolicy(c),policyOptions={everyone:'الجميع',moderators:'المالك والمشرفون'};
    if(key==='entry'){requireSettingsRight('entry');return pickAndSave('من يمكنه دخول الغرفة',[['public','الجميع'],['private','بالدعوة فقط']],r.privacy==='private'?'private':'public',v=>settingsUpdate('entry',{privacy:v}));}
    if(key==='speak'||key==='chat'){const right=key==='speak'?'audio':'chat';requireSettingsRight(right);return pickAndSave(key==='speak'?'من يمكنه التحدث بالميكروفون':'من يمكنه الدردشة',Object.entries(policyOptions),s[key]==='moderators'?'moderators':'everyone',v=>settingsUpdate(right,{settings:{[key]:v}}));}
    if(key==='luckyBag'){requireSettingsRight('owner');return pickAndSave('من يمكنه ارسال حقيبة الحظ',[['everyone','الجميع'],['moderators','المالك والمشرفون'],['owner','المالك فقط']],s.luckyBag,v=>settingsUpdate('owner',{settings:{luckyBag:v}}));}
    if(key==='seats'){const seat=settingsSeats(c);requireSettingsRight('seats');if(!seat.editable)throw Error('عدد المقاعد غير قابل للتعديل في هذا المجلس.');return seatSheet(seat.council.seats,seat.min,seat.max).then(async n=>{if(n==null||n===seat.council.seats)return;const latest=settingsSeats(c);if(latest.council?.id!==seat.council.id||!latest.editable||n<latest.min||n>latest.max)return reportError(Error('العدد لا يطابق حدود المجلس الحالي.'));try{await command(c,'council:update',{roomId:c.routeRoom,councilId:seat.council.id,seats:n});toast67('تم الضبط بنجاح');}catch(e){reportError(e);}});}
    if(key==='reward'){requireSettingsRight('owner');if(typeof c.ctx.openBenefits!=='function')throw Error('خدمة المكافأة لم تربط بعد.');return c.ctx.openBenefits({mode:'reward',roomId:c.routeRoom});}
    if(key==='benefits'){if(typeof c.ctx.openBenefits!=='function')throw Error('خدمة حقيبة الحظ لم تربط بعد.');return c.ctx.openBenefits({roomId:c.routeRoom,snapshot:c.snapshot,api:(...args)=>c.api(...args),refresh:()=>read(c)});}
    if(key==='luckyBag'){requireSettingsRight('owner');return openDialog('من يمكنه ارسال حقيبة الحظ',select('luckyBag','المسموح لهم',{everyone:'الجميع',moderators:'المالك والمشرفون',owner:'المالك فقط'},s.luckyBag)+'<p class="so-note">هذا الإعداد يحدد من يمكنه الإرسال فقط؛ لا ينشئ حقيبة ولا يخصم رصيدًا.</p>',async f=>{const value=f.elements.luckyBag.value;if(!['everyone','moderators','owner'].includes(value))throw Error('خيار غير صالح.');return settingsUpdate('owner',{settings:{luckyBag:value}});},'حفظ');}
    if(key==='ads'){requireSettingsRight('identity');const ads=arr(r.ads).map(a=>a.text);return openDialog('إعلانات الغرفة',`<p class="so-note">لين 10 إعلانات تتحرك تحت اسم الغرفة. كل إعلان يمر على مراجعة تلقائية: الكلام المسيء والروابط وأرقام التواصل ممنوعة، والسليم ينقبل فورًا.</p>${Array.from({length:10},(_,i)=>`<label class="so-field"><span>إعلان ${i+1}</span><input name="ad${i}" maxlength="200" value="${esc(ads[i]||'')}" dir="auto"></label>`).join('')}`,async f=>{const list=Array.from({length:10},(_,i)=>f.elements['ad'+i].value.trim()).filter(Boolean);await command(c,'room:ads',{roomId:c.routeRoom,ads:list});},'حفظ الإعلانات');}
    if(key==='roomId'){requireSettingsRight('owner');return (async()=>{let mine=[];try{const res=await c.api('/api/room-ids/mine');mine=arr(res?.items);}catch{}const opts=mine.map(it=>`<label class="so-radio"><input type="radio" name="rid" value="${esc(it.id)}" ${r.code===it.code?'checked':''}><b dir="ltr">${esc(it.code)}</b></label>`).join('');return openDialog('أيدي الغرفة',`<p class="so-note">رقم غرفتك الحالي: <b dir="ltr">${esc(r.code||'')}</b>. تقدر تشتري رقم مميز من المتجر (قسم «أيدي الغرف») وتختاره هنا.</p>${opts||'<p class="so-note">ما تملك أيدي غرفة مميز بعد.</p>'}<label class="so-radio"><input type="radio" name="rid" value="" ${r.vanity?'':'checked'}><span>الرقم العادي (8 أرقام)</span></label><a class="so-button" href="#/shop">افتح المتجر</a>`,async f=>{const v=f.querySelector('input[name=rid]:checked')?.value||'';await command(c,'room:vanity',{roomId:c.routeRoom,itemId:v||null});},'تطبيق');})();}
    if(key==='level'){const lv=r.level||1,next=r.levelNext,floor=r.levelFloor||0,s=r.support||0,pct=next?Math.min(100,Math.round((s-floor)/(next-floor)*100)):100;const perks=[[2,'شارة ليفل ملونة بجانب اسم الغرفة'],[3,'إطار فضي لبطاقة الغرفة بقائمة الغرف'],[5,'اسم الغرفة ذهبي'],[7,'بطاقة الغرفة تلمع بقائمة الغرف'],[8,'إطار ذهبي متحرك لبطاقة الغرفة'],[10,'تاج ذهبي وهالة أسطورية للغرفة']];return openDialog('ليفل الغرفة',`<div class="rl-level-sheet"><span class="rl-chip rl-chip-${lv} is-big has-art58"><img class="art58-chip" src="${RANK_CHIP("room",lv)}" alt="" decoding="async"><b class="art58-chip-tx">Lv ${lv}</b></span><p>دعم الغرفة: <b dir="ltr">${s.toLocaleString('en-US')}</b> نقطة${next?` · الليفل الجاي عند <b dir="ltr">${next.toLocaleString('en-US')}</b>`:' · وصلت أعلى ليفل'}</p><div class="rl-bar"><i style="width:${pct}%"></i></div><ul>${perks.map(([l,t])=>`<li class="${lv>=l?'is-open':''}"><b>Lv ${l}</b> ${esc(t)}</li>`).join('')}</ul><p class="so-note">الليفل يرتفع تلقائيًا بقيمة الهدايا (كل 20 عملة = نقطة) اللي تنرسل داخل الغرفة.</p></div>`,null);}
    if(key==='name'){requireSettingsRight('identity');return openDialog('الإسم',field('name','اسم الغرفة','text',r.name,80),async f=>{const name=f.elements.name.value.trim();if(!name)throw Error('اكتب اسم الغرفة.');await settingsUpdate('identity',{name});},'حفظ');}
    if(key==='announcement'){requireSettingsRight('identity');return openDialog('الإعلان',textField('description','إعلان الغرفة',400,r.description||'',false),async f=>settingsUpdate('identity',{description:f.elements.description.value.trim()}),'حفظ');}
    if(key==='cover'){
      requireSettingsRight('identity');
      return openDialog('صورة الغرفة',roomPhotoFields(r.photo)+'<p class="so-note">هذي صورة الغرفة في القائمة، مب صورتك الشخصية ولا خلفية البث.</p>',async f=>{
        requireSettingsRight('identity');if(c.busy||c.pending)throw Error('يوجد طلب غير محسوم؛ حدّث الحالة أولًا.');
        const file=photoPicker?.ready();if(!file)throw Error('اختر صورة جديدة أولًا.');
        const epoch=c.epoch,roomId=c.routeRoom;f._coverKey??=uuid();c.busy=true;c.error='';c.notice='جارٍ حفظ صورة الغرفة…';c.notify();
        try{const result=await c.api(`/api/social/rooms/${encodeURIComponent(roomId)}/cover`,{method:'POST',body:file,headers:{'X-Idempotency-Key':f._coverKey}});if(!result?.ok)throw Error(friendly(result?.error||'تعذر رفع الصورة.'));if(c!==live||c.epoch!==epoch||c.routeRoom!==roomId)return;c.notice='تم حفظ صورة الغرفة في الخادم.';await read(c);}finally{c.busy=false;if(c===live)c.notify();}
      },'حفظ الصورة');
    }
    if(key==='theme'){requireSettingsRight('identity');if(c.ctx.gameRoom)throw Error('خلفية البث لا تغيّر غرف الألعاب.');openDialog('خلفية البث',`<div data-so-settings-dynamic>${themeCards(r.settings?.theme)}</div>`,null,'إغلاق');ui.settingsDialog=key;return;}
    if(key==='seatLocks'){requireSettingsRight('seats');const seat=settingsSeats(c);if(!seat.council||c.ctx.gameRoom)throw Error('اختر مجلسًا صوتيًا أولًا.');openDialog('قفل المقاعد',`<div data-so-settings-dynamic>${seatLockCards(seat.council)}</div>`,null,'إغلاق');ui.settingsDialog=key;return;}
    if(key==='giftEffects'){if(typeof c.ctx.updateAccountSettings!=='function'||c.ctx.gameRoom)throw Error('تفضيل المؤثرات غير متاح.');return c.ctx.updateAccountSettings({hideChatEffects:c.ctx.accountSettings?.hideChatEffects!==true}).then(settings=>{c.ctx.accountSettings=settings;if(settings.hideChatEffects)c.giftFx?.clear('effects-disabled');paint();});}
    if(key==='highQuality')return settingsUpdate('audio',{settings:{highQuality:!s.highQuality}}).then(()=>toast67('تم الضبط بنجاح'));
    if(key==='seats'){
      const seat=settingsSeats(c);requireSettingsRight('seats');if(!seat.editable)throw Error('عدد المقاعد غير قابل للتعديل في هذا المجلس.');
      return openDialog('عدد المقاعد',`<p>${esc(seat.council.name)} · ${esc(seat.occupied)} مقاعد مشغولة</p><label class="so-field">عدد المقاعد<input type="number" name="seats" min="${seat.min}" max="${seat.max}" step="1" value="${esc(seat.council.seats)}" required></label><p class="so-note">هذا المجلس فقط؛ لا ننقل أعضاء ولا نعدل سعة المجالس الأخرى.</p>`,async f=>{
        requireSettingsRight('seats');const latest=settingsSeats(c),n=Number(f.elements.seats.value);if(latest.council?.id!==seat.council.id)throw Error('تغير المجلس الحالي؛ ارجع واختر عدد مقاعده الفعلي.');if(!latest.editable||!Number.isInteger(n)||n<latest.min||n>latest.max)throw Error('العدد لا يطابق حدود نوع المجلس أو عدد المقاعد المشغولة.');await command(c,'council:update',{roomId:c.routeRoom,councilId:seat.council.id,seats:n});
      },'حفظ');
    }
    if(key==='entry'){requireSettingsRight('entry');return openDialog('من يمكنه دخول الغرفة',select('privacy','دخول الغرفة',{public:'الجميع',private:'بالدعوة فقط'},r.privacy)+'<p class="so-note">الخصوصية بالدعوة مستقلة عن كلمة مرور الغرفة. كل تحقق للدخول يتم في الخادم.</p>',async f=>settingsUpdate('entry',{privacy:f.elements.privacy.value}),'حفظ');}
    if(key==='speak'||key==='chat'){const right=key==='speak'?'audio':'chat';requireSettingsRight(right);return openDialog(key==='speak'?'من يمكنه التحدث بالميكروفون':'من يمكنه الدردشة',select(key,'المسموح لهم',policyOptions,s[key])+(key==='speak'?'<p class="so-note">السماح بالتحدث لا يشغّل مايك أي عضو تلقائيًا ولا يلغي الكتم الإداري.</p>':''),async f=>settingsUpdate(right,{settings:{[key]:f.elements[key].value}}),'حفظ');}
    if(key==='micRequests'){
      const editable=settingsPermission(c,'audio');openDialog('أخذ مايك يتطلب تقديم طلب',(editable?check('micRequests','يتطلب أخذ المايك تقديم طلب',s.micRequests):`<p>السياسة الحالية: ${s.micRequests?'فتح':'إغلاق'} — للقراءة فقط</p>`)+`<div data-so-settings-dynamic>${settingsMicHTML(c)}</div>`,editable?async f=>settingsUpdate('audio',{settings:{micRequests:f.elements.micRequests.checked}}):null,editable?'حفظ':'إغلاق');ui.settingsDialog=key;return;
    }
    if(['muted','banned','audit'].includes(key)){requireSettingsRight(key==='audit'?'audit':'moderation');openDialog({muted:'قائمة الكتم',banned:'القائمة السوداء',audit:'سجل عمليات المشرف'}[key],`<p class="so-note">بيانات هذه الغرفة فقط، بحسب الصلاحيات المعتمدة من الخادم.</p><div data-so-settings-dynamic>${settingsPrivateList(c,key)}</div>`,null,'إغلاق');ui.settingsDialog=key;return;}
    if(key==='rights'){
      requireSettingsRight('owner');return openDialog('إعدادات صلاحيات المشرفين','<p class="so-note">تطبق هذه الحقوق على مشرفي الغرفة؛ لا تسحب أي حق من المالك. التحقق النهائي في الخادم.</p>'+Object.entries(SETTINGS_RIGHTS).map(([k,label])=>check(k,label,s.moderatorPermissions[k])).join(''),async f=>settingsUpdate('owner',{settings:{moderatorPermissions:Object.fromEntries(Object.keys(SETTINGS_RIGHTS).map(k=>[k,f.elements[k].checked]))}}),'حفظ الصلاحيات');
    }
  };
  const onClick=event=>{
    if(forwardGift(event))return;
    if(!event.target.closest?.('[data-so-action]')&&!dialogBusy&&c.snapshot?.room&&!c.ctx.gameRoom){
      const mEl=event.target.closest?.('.so-seat .so-member[data-so-member-id], .so-chat-message [data-so-member-id]');
      if(mEl&&page.contains(mEl)){const mid=mEl.dataset.soMemberId,m=arr(c.snapshot.room.members).find(x=>String(x.id)===mid)||arr(currentCouncil(c)?.members).find(x=>String(x.id)===mid);if(m){event.preventDefault();event.stopPropagation();openDialog(m.name||'عضو',memberCardHTML(c,m),null);return;}}
    }
    const target=event.target.closest?.('[data-so-action]');if(!target||!page.contains(target))return;
    event.preventDefault();event.stopPropagation();const action=target.dataset.soAction,id=target.dataset.id,enabled=target.dataset.enabled==='true';
    if(action==='room-photo-clear'){if(!dialogBusy){photoPicker?.clear();dialog?.querySelector('form')?._ownerCreation?.clearPhoto();if(dialog?.querySelector('form'))delete dialog.querySelector('form')._coverKey;}return;}
    // Native retry runs before async network/adult work, preserving a fresh Safari tap.
    if(action==='owner-start-mic-retry'){if(ctx.gameRoom||c.busy||c.loading||dialogBusy||c.voiceBusy||!confirmedOwnerSeat(c.snapshot,c.ownerVoiceStart)||c.voiceState.status!=='connected')return;void c.voice?.microphone(true).then(ok=>{if(alive&&ok&&c.ownerVoiceStart){c.ownerVoiceStart.message='';c.notify();}});return;}
    if(action==='owner-start-voice-retry'){if(ctx.gameRoom||c.busy||c.loading||dialogBusy||c.voiceBusy||!confirmedOwnerSeat(c.snapshot,c.ownerVoiceStart))return;void run(()=>voiceConnect(c));return;}
    if(action==='directory-create-choice'&&dialog?.classList.contains('so-create-room-r30')){
      if(c.busy||dialogBusy||target.disabled||!['roomMode','roomTag'].includes(target.dataset.field))return;
      const field=dialog.querySelector(`select[name="${target.dataset.field}"]`),choice=[...(field?.options||[])].find(option=>option.value===target.dataset.value&&!option.disabled);if(!choice)return;
      field.value=choice.value;target.closest('fieldset')?.querySelectorAll('[data-so-action="directory-create-choice"]').forEach(button=>{const selected=button.dataset.value===choice.value;button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));});return;
    }
    if(action.startsWith('directory-')&&!c.routeRoom&&!ctx.gameRoom){
      if(c.busy||dialogBusy)return;
      const value=target.dataset.value;
      if(action==='directory-tab'&&['all','mine','popular'].includes(value))c.directoryUI.tab=value;
      else if(action==='directory-mine'&&['recent','joined','following'].includes(value))c.directoryUI.mineTab=value;
      else if(action==='directory-category'&&['all','friends','music','games','call','birthday'].includes(value))c.directoryUI.category=value;
      else if(action==='directory-country'&&['','SA','AE','KW','QA','OM','BH','EG','IQ'].includes(value))c.directoryUI.country=value;
      else if(action==='directory-search'){c.directoryUI.searchOpen=!c.directoryUI.searchOpen;if(!c.directoryUI.searchOpen)c.directoryUI.query='';paint();if(c.directoryUI.searchOpen)host.querySelector('[data-so-directory-query]')?.focus({preventScroll:true});return;}
      else if(action==='directory-follow'){if(c.loading)return;void run(()=>command(c,'room:follow',{roomId:id,enabled}));return;}
      else return;
      paint();return;
    }
    if(action==='room-theme'){if(c.busy||dialogBusy||c.ctx.gameRoom)return;void run(()=>settingsUpdate('identity',{settings:{theme:target.dataset.theme}}));return;}
    if(action==='seat-lock'){if(c.busy||dialogBusy||c.ctx.gameRoom)return;void run(async()=>{requireSettingsRight('seats');const council=settingsSeats(c).council,index=Number(target.dataset.seatIndex);if(!council||!Number.isInteger(index))throw Error('المقعد غير متاح.');const locked=new Set(council.lockedSeats||[]);locked.has(index)?locked.delete(index):locked.add(index);await command(c,'council:update',{roomId:c.routeRoom,councilId:council.id,lockedSeats:[...locked].sort((a,b)=>a-b)});});return;}
    if(action==='settings-back'){closeSettings();return;}
    if(action==='game-voice-retry'){if(c.busy||dialogBusy)return;const retry=async()=>{autoVoiceAttempt='';await ctx.retryGameVoice?.();if(alive)await read(c);};void run(()=>ctx.gameVoice?.error==='adult_acknowledgement_required'?requireAdult(retry):retry());return;}
    if(action==='dialog-close'){closeDialog();return;}
    if(action==='panel-close'){closePanel();return;}
    if(action==='sup-tab'){const t=target.dataset.tab;if(['day','week','month','all'].includes(t)){ui.supTab=t;paint();}return;}
    if(action==='c59-level'){const lv=Number(target.dataset.level);if(Number.isInteger(lv)&&lv>=1&&lv<=3){ui.c59Level=lv;paint();}return;}
    if(action==='c59-help'){ui.c59Help=!ui.c59Help;paint();return;}
    if(action==='cannon-stage'){const stage=Number(target.dataset.stage);if(!dialogBusy&&Number.isInteger(stage)&&stage>=1&&stage<=(c.snapshot?.room?.cannon?.stages?.length||3)){ui.cannonStage=stage;paint();}return;}
    if(action==='reference-benefits'){if(!dialogBusy&&!c.ctx.gameRoom){void openOwnBenefits(c).catch(error=>{c.error=friendly(error?.message);c.notify();});}return;}
    if(action==='open-panel'){if(!dialogBusy)openPanel(target.dataset.panel,target);return;}
    if(action==='focus-chat'){if(dialogBusy)return;ui.chatUnread=0;if(dialog)closeDialog(false);closePanel(false);const log=host.querySelector('.so-chat-messages');if(log)log.scrollTop=log.scrollHeight;const input=host.querySelector('#so-chat-text');if(input&&ui.chatSelection)try{input.setSelectionRange(...ui.chatSelection);}catch{}input?.scrollIntoView?.({behavior:'smooth',block:'nearest'});input?.focus({preventScroll:true});return;}
    if(action==='emoji'){if(dialogBusy)return;const input=host.querySelector('#so-chat-text');ui.chatSelection=[input?.selectionStart??0,input?.selectionEnd??0];ui.emoji=!ui.emoji;paint();return;}
    if(action==='emoji-insert'){const input=host.querySelector('#so-chat-text'),emoji=target.dataset.emoji;if(!input||!emoji)return;const [start,end]=ui.chatSelection||[input.value.length,input.value.length];if(input.value.length-(end-start)+emoji.length>500)return;input.setRangeText(emoji,start,end,'end');ui.chatSelection=[input.selectionStart,input.selectionEnd];input.dispatchEvent(new Event('input',{bubbles:true}));input.focus({preventScroll:true});return;}
    if(action==='output'){ui.output=!ui.output;paint();return;}
    if(action==='expand'){const stage=host.querySelector('[data-so-room-detail]');void run(async()=>{if(document.fullscreenElement){await document.exitFullscreen();return;}if(stage?.requestFullscreen){await stage.requestFullscreen();return;}stage?.classList.toggle('is-expanded');target.setAttribute('aria-pressed',String(stage?.classList.contains('is-expanded')));});return;}
    if(action==='prepare-council'){if(c.busy||c.loading||dialogBusy)return;void run(()=>requireAdult(async()=>{await ensureSeat();await voiceConnect(c);}));return;}
    if(c.busy||c.loading||dialogBusy)return;
    void run(async()=>{
      if(action==='challenge-support')return openChallengeGifts(id,target);
      if(action==='challenge-setup')return openChallengeSetup();
      if(action==='challenge-cancel')return cancelChallenge();
      if(action==='settings-row')return openSettingsEditor(target.dataset.setting);
      if(action==='room-upgrade') {
        const roomId=target.dataset.roomId,councilId=target.dataset.councilId,preset=target.dataset.preset;
        const checkScope=()=>{
          const council=settingsSeats(c).council,view=council?.capacityUpgrade,option=arr(view?.options).find(p=>p.id===preset);
          if(!alive||c!==live||!ui.settings||c.ctx.gameRoom||!owner(c)||!settingsPermission(c,'owner')||c.routeRoom!==roomId||c.snapshot?.room?.id!==roomId||c.snapshot?.current?.roomId!==roomId||council?.id!==councilId||view?.roomId!==roomId||view?.councilId!==councilId||!view.canApply||!option?.available||option.current)throw Error(roomUpgradeErrorR47('room_upgrade_invalid_state'));
        };
        checkScope();
        return openDialog('تأكيد حزمة السعة',`<p>${esc(roomUpgradeConfirmationR47(preset))}</p>`,async()=>{checkScope();return command(c,'room:upgrade',{roomId,councilId,preset});},'تأكيد التطبيق المجاني');
      }
      if(action==='settings-unmute'||action==='settings-unban'){requireSettingsRight('moderation');const list=c.snapshot.room[action==='settings-unmute'?'mutedMembers':'bannedMembers'];if(!arr(list).some(m=>String(m.id)===String(id)))throw Error('تغيرت القائمة؛ حدّث الحالة.');return command(c,action==='settings-unmute'?'member:mute':'member:unban',{roomId:c.routeRoom,targetId:id,...(action==='settings-unmute'?{muted:false}:{})});}
      if(action==='settings-mic-request'){if(!ui.settings||!currentCouncil(c)||!settingsPolicy(c).micRequests)throw Error('خذ مقعدًا وتحقق من سياسة المايك أولًا.');return command(c,'mic:request',{roomId:c.routeRoom});}
      if(action==='settings-mic-approve'){requireSettingsRight('audio');return command(c,'mic:approve',{roomId:c.routeRoom,targetId:id,approve:enabled});}
      if(action==='back-room'){
        if(c.snapshot?.current?.roomId!==c.routeRoom||c.ctx.gameRoom){if(alive)(globalThis.__LA3BAK_NAV__ || location).hash='#/social-rooms';return;}
        ui.exitPop=!ui.exitPop;paint();return;
      }
      if(action==='rank-open'){ui.exitPop=false;ui.panel='';ui.rankOpen=true;ui.rankView=null;ui.rankTab='perks';paint();host.querySelector('.rr-page')?.scrollTo?.(0,0);return;}
      if(action==='rank-close'){ui.rankOpen=false;paint();return;}
      if(action==='rank-view'){ui.rankView=Math.max(0,Math.min(4,Number(id)||0));paint();return;}
      if(action==='rank-tab'){ui.rankTab=id==='monthly'?'monthly':'perks';paint();return;}
      if(action==='room-dm'){closeDialog(false);import('./room-dm-r67.js?v=r67a').then(m=>m.openRoomDM({peer:target.dataset.peer||''})).catch(reportError);return;}
      if(action==='exit-pop-close'){ui.exitPop=false;paint();return;}
      if(action==='room-leave-now'){ui.exitPop=false;closeDialog(false);clearMinimized();await command(c,'room:leave',{roomId:c.routeRoom});if(alive)(globalThis.__LA3BAK_NAV__ || location).hash='#/social-rooms';return;}
      if(action==='room-minimize'){ui.exitPop=false;const room=c.snapshot?.room;if(!room)return;closeDialog(false);minimizedRoom={uid:c.uid,roomId:room.id,name:room.name,photo:room.photo||null};const nav=globalThis.__LA3BAK_NAV__;if(nav?.back)nav.back('#/');else location.hash='#/';minimizeBubble();return;}
      if(action==='room-heart'){const room=c.snapshot?.room;if(!room)return;const on=!roomFollowed(c);await command(c,'room:follow',{roomId:room.id,enabled:on});c.notice=on?'انحفظت الغرفة بالقلب، وتلقاها في ملفك الشخصي.':'انشالت الغرفة من المحفوظة.';c.notify();return;}
      if(action==='room-background'){closePanel(false);openSettings(target);return openSettingsEditor('theme');}
      if(action==='room-clear-chat'){const council=currentCouncil(c);if(!council)return;const last=arr(council.chat).at(-1);storage.set(`la3bak:social:cleared:${c.routeRoom}:${council.id}`,String(last?.at??Date.now()));closePanel(false);c.notice='انمسحت الدردشة من شاشتك.';c.notify();return;}
      if(action==='room-delete'){if(!owner(c))throw Error('حذف الغرفة لصاحبها فقط.');const room=c.snapshot.room;return openDialog('حذف الغرفة',`<p>متأكد تبي تحذف «${esc(room.name)}» نهائيًا؟ كل الموجودين بيطلعون منها، وما تقدر ترجعها.</p>`,async()=>{await command(c,'room:delete',{roomId:room.id});clearMinimized();if(alive)(globalThis.__LA3BAK_NAV__ || location).hash='#/social-rooms';},'حذف الغرفة نهائيًا');}
      if(action==='member-profile'){if(!/^[A-Za-z0-9_-]{16}$/.test(String(id)))return;closeDialog(false);const room=c.snapshot?.room;if(room&&c.snapshot?.current?.roomId===room.id&&!c.ctx.gameRoom){minimizedRoom={uid:c.uid,roomId:room.id,name:room.name,photo:room.photo||null};minimizeBubble();}(globalThis.__LA3BAK_NAV__?.go?globalThis.__LA3BAK_NAV__.go(`#/u/${id}`):(location.hash=`#/u/${id}`));return;}
      if(action==='member-gift'){closeDialog(false);return openPanel('gifts',target);}
      if(action==='share') {const room=c.snapshot?.room;if(!room)throw Error('معلومات الغرفة غير متاحة.');const url=new URL(roomURL(room.id),location.href).href;c.notice='';if(typeof navigator.share==='function'){try{await navigator.share({title:`لعبنا · ${room.name}`,text:room.description||room.name,url});}catch(e){if(e.name!=='AbortError')throw e;}return;}if(!navigator.clipboard?.writeText)throw Error('المشاركة والنسخ غير متاحين في هذا المتصفح.');await navigator.clipboard.writeText(url);c.notice='تم نسخ رابط الغرفة.';c.notify();return;}
      if(action==='info') {const room=c.snapshot?.room;if(!room)return;return openDialog('معلومات الغرفة',`<h3>${esc(room.name)}</h3>${room.description?`<p>${esc(room.description)}</p>`:''}<p dir="ltr">#${esc(room.id)}</p><p>${room.privacy==='private'?'غرفة خاصة':'غرفة عامة'} · ${esc(Number.isInteger(room.count)?room.count:arr(room.members).length)} موجودون${Number.isInteger(room.maxMembers)?' / '+room.maxMembers:''}</p>${room.owner?`<p>مالك الغرفة: ${esc(room.owner.name)}</p>`:''}${room.host?`<p>المضيف: ${esc(room.host.name)}</p>`:''}<p class="so-note">لكل مجلس صوته ومحادثته المستقلة. لا تسجيل للصوت ولا تشغيل للمايك دون إذنك.</p><div class="so-actions">${button('refresh','تحديث الحالة')}${c.snapshot.current?.roomId===room.id?button('leave-room','مغادرة الغرفة'):button('join-room','الانضمام للغرفة','',true)}</div>`,null,'إغلاق');}
      if(action==='seat'&&!c.ctx.gameRoom&&target.dataset.seatIndex!==undefined)return requireAdult(async()=>{const index=Number(target.dataset.seatIndex),previous=currentCouncil(c)?.id;if(!Number.isInteger(index))throw Error('المقعد غير صالح.');await command(c,'council:join',{roomId:c.routeRoom,councilId:id,seatIndex:index});if(previous!==id&&currentCouncil(c))await voiceConnect(c);});
      if(action==='seat'&&c.snapshot.preferences?.adultAcknowledged!==true)return requireAdult(async()=>{await ensureSeat();await voiceConnect(c);});
      if(action==='seat') {const council=arr(c.snapshot?.room?.councils).find(x=>x.id===id);if(!council)throw Error('المجلس غير متاح.');const seats=Number(council.seats),count=Math.max(Number(council.count)||0,arr(council.members).length);if(!Number.isFinite(seats)||count>=seats)throw Error('لا يوجد مقعد متاح الآن. حدّث الحالة.');if(currentCouncil(c)?.id===id){if(councilModerator(c)){return openDialog('دعوة صديق إلى مقعد متاح',field('targetId','رقم اللاعب العام أو المميز','text','',64)+'<p class="so-note">الدعوة لا تحجز مقعدًا ولا تتجاوز السعة أو إعدادات اللاعب.</p>',async f=>command(c,'council:invite',{roomId:c.routeRoom,councilId:id,targetId:f.elements.targetId.value.trim()}),'إرسال الدعوة');}return openDialog('أنت في المجلس بالفعل','<p>لديك مقعد في هذا المجلس. لا يمكن أخذ مقعد ثانٍ. يمكنك مشاركة رابط الغرفة أو انتظار انضمام صديق.</p><div class="so-actions">'+button('share','مشاركة رابط الغرفة')+'</div>',null,'إغلاق');}if(council.canJoin){await command(c,'council:join',{roomId:c.routeRoom,councilId:id});if(currentCouncil(c))await voiceConnect(c);return;}if(council.canRequest)return command(c,'council:request',{roomId:c.routeRoom,councilId:id});throw Error('لا يمكنك الانضمام إلى هذا المجلس حاليًا.');}
      if(action==='refresh') return read(c);
      if(action==='retry') {
        if(!ctx.gameRoom&&c.creationRecord&&Object.values(c.creationRecord.keys||{}).includes(c.pending?.key))return requireAdult(openOwnerCreation);
        const resume=async()=>{const name=c.pending?.command;const result=await command(c,'',{},true);if(result?.roomId&&['room:create','room:join','council:return'].includes(name)&&result.roomId!==c.routeRoom){if(alive)(globalThis.__LA3BAK_NAV__ || location).hash=roomURL(result.roomId);return;}if(result&&['council:join','council:return'].includes(name)&&currentCouncil(c))await voiceConnect(c);};
        if(c.pending?.requiresPassword)return openDialog('إعادة نفس الطلب',field('password','كلمة مرور الغرفة','password','',64)+'<p class="so-note">الكلمة لا تُحفظ في المتصفح. نعيد المفتاح الأصلي فقط.</p>',async form=>{c.pending.password=form.elements.password.value;return resume();},'إعادة المحاولة');
        return resume();
      }
      if(action==='discard') return openDialog('تجاهل طلب غير محسوم','<p>قد يكون الطلب نُفذ بالفعل. حدّث حالة الغرفة قبل إنشاء طلب جديد. تجاهل المفتاح لا يلغي الإجراء في الخادم.</p>',async()=>{await read(c);c.pending=null;storage.remove(c.storageKey);c.notice='تم تجاهل المفتاح المحفوظ فقط.';c.notify();},'تحديث وتجاهل المفتاح');
      if(action==='select-mode'){c.selectedMode=target.dataset.mode;c.notify();return;}
      if(action==='preview'){if(ui.panel!=='councils')openPanel('councils',target);ui.preview=id;paint();const row=host.querySelector(`[id="so-council-${encodeURIComponent(id)}"]`);if(row){row.open=true;row.scrollIntoView?.({behavior:'smooth',block:'nearest'});}return;}
      if(action==='switch'){openDialog('التنقل بين المجالس',arr(c.snapshot?.room?.councils).map(x=>`<article class="so-switch-row"><b>${esc(x.name)}</b><small>${esc(x.count??arr(x.members).length)} / ${esc(x.seats)} · ${x.privacy==='private'?'خاص':'عام'}</small>${x.canJoin?button('council-join','انتقل لهذا المجلس',`data-id="${esc(x.id)}"`,true):x.canRequest?button('request','طلب انضمام',`data-id="${esc(x.id)}"`):'<span>غير متاح</span>'}</article>`).join('')||'<p>لا توجد مجالس بعد.</p>',null,'إغلاق');return;}
      if(action==='preferences') {const p=(c.routeRoom?c.snapshot:c.list)?.preferences||{};return openDialog('خصوصيتي في المجالس',check('invitations','استقبال دعوات المجالس',p.invitations!==false)+check('remember','حفظ المفضلة وتذكر المجلس السابق',p.remember===true)+textField('interests','اهتمامات اختيارية، مفصولة بفاصلة',200,typeof p.interests==='string'?p.interests:'',false)+'<p class="so-note">لا تضف عنوانًا أو بيانات اتصال أو معلومات حساسة.</p>',async f=>command(c,'prefs:update',{invitations:f.elements.invitations.checked,remember:f.elements.remember.checked,interests:f.elements.interests.value.trim()}),'حفظ الخصوصية');}
      if(action==='create-room')return requireAdult(openOwnerCreation);
      if(action==='enter'){
        const room=arr(c.list?.rooms).find(item=>item.id===id);if(!room)throw Error('الغرفة لم تعد متاحة؛ حدّث القائمة.');
        const enter=async(password)=>{const result=await command(c,'room:join',{roomId:id,...(password?{password}:{})});if(result&&alive)(globalThis.__LA3BAK_NAV__ || location).hash=roomURL(id);};
        return requireAdult(()=>room.hasPassword&&!room.joined?openDialog('دخول الغرفة',field('password','كلمة مرور الغرفة','password','',64),form=>enter(form.elements.password.value),'دخول'):enter());
      }
      if(action==='join-room')return requireAdult(()=>c.snapshot?.room?.hasPassword?openDialog('دخول الغرفة',field('password','كلمة مرور الغرفة','password','',64),form=>command(c,'room:join',{roomId:c.routeRoom,password:form.elements.password.value}),'دخول'):command(c,'room:join',{roomId:c.routeRoom}));
      if(action==='leave-room') return openDialog('مغادرة الغرفة','<p>سيُفصل صوت المجلس وتتوقف الموسيقى المحلية. يمكنك العودة لاحقًا إذا بقيت الغرفة متاحة.</p>',async()=>{await command(c,'room:leave',{roomId:c.routeRoom});if(alive)(globalThis.__LA3BAK_NAV__ || location).hash='#/social-rooms';},'مغادرة');
      if(action==='create-council') return openDialog('مجلس جديد',field('name','اسم المجلس')+textField('description','وصف قصير',300,'',false)+select('kind','نوع المجلس',KINDS,'public')+'<label class="so-field">عدد المقاعد<input name="seats" type="number" min="2" max="'+esc(c.config?.maxCouncilSeats||12)+'" value="4" required></label>'+select('privacy','خصوصية المجلس',{public:'عام',private:'خاص'},'public')+check('allowRequests','السماح بطلبات الانضمام',true),async f=>{const kind=f.elements.kind.value;if(kind==='group'&&(Number(f.elements.seats.value)<3||Number(f.elements.seats.value)>5))throw Error('المجلس الجماعي الصغير من 3 إلى 5 مقاعد.');await command(c,'council:create',{roomId:c.routeRoom,name:f.elements.name.value.trim(),description:f.elements.description.value.trim(),kind,seats:kind==='pair'?2:Number(f.elements.seats.value),privacy:kind==='private'?'private':f.elements.privacy.value,allowRequests:f.elements.allowRequests.checked});},'إنشاء المجلس');
      if(action==='council-join') {closeDialog();await command(c,'council:join',{roomId:c.routeRoom,councilId:id});if(currentCouncil(c)) await voiceConnect(c);return;}
      if(action==='return'){const result=await command(c,'council:return');if(result?.roomId&&result.roomId!==c.routeRoom){if(alive)(globalThis.__LA3BAK_NAV__ || location).hash=roomURL(result.roomId);return;}if(currentCouncil(c))await voiceConnect(c);return;}
      if(action==='council-leave') return command(c,'council:leave',{roomId:c.routeRoom,councilId:id});
      if(action==='request') {closeDialog();return command(c,'council:request',{roomId:c.routeRoom,councilId:id});}
      if(action==='favorite') {if(enabled&&c.snapshot?.preferences?.remember!==true)throw Error('فعّل حفظ المفضلة وتذكر المجلس السابق من إعدادات خصوصيتك أولًا.');return command(c,'council:favorite',{roomId:c.routeRoom,councilId:id,enabled});}
      if(action==='approve') return command(c,'council:approve',{...scope(),targetId:id,approve:enabled});
      if(action==='invite'&&!canInvite(c)){c.notice='الدعوات الخاصة للمضيف والمشرف؛ يمكنك مشاركة رابط الغرفة من القائمة.';c.notify();return;}
      if(action==='invite') return openDialog('دعوة إلى '+(currentCouncil(c)?'المجلس':'الغرفة'),field('targetId','رقم اللاعب العام أو المميز','text','',64)+(ctx.gameRoom?check('inviteToRoom','دعوة اللاعب لدخول الغرفة أولًا',true):'')+'<p class="so-note">يُحل رقم اللاعب في الخادم وتُحترم إعدادات الحظر والدعوات. للدخول إلى مجلس خاص: ادعُه للغرفة أولًا؛ بعد دخوله ألغِ خيار دعوة الغرفة وأرسل دعوة المجلس. دعوة الصوت لا تضم اللاعب إلى اللعبة؛ شارك رمز اللعبة للانضمام الفعلي.</p>',async f=>command(c,currentCouncil(c)&&!(ctx.gameRoom&&f.elements.inviteToRoom.checked)?'council:invite':'room:invite',{...scope(),targetId:f.elements.targetId.value.trim()}),'إرسال الدعوة');
      if(action==='voice-connect') return requireAdult(async()=>{await ensureSeat();await voiceConnect(c);});
      if(action==='voice-disconnect') return disconnectVoice(c);
      if(action==='voice-unlock') return c.voice?.unlockAudio();
      if(action==='microphone'){if(c.snapshot?.current?.muted)throw Error('الميكروفون مكتوم من المشرف.');const mic=c.voiceState?.microphone===true||c.voiceState?.micEnabled===true;await c.voice?.microphone(!mic);return;}
      if(action==='ambient'){await toggleAmbient(c);await command(c,'mode:action',{mode:'quiet',action:{type:'music',enabled:c.ambientOn,volume:c.ambientVolume}}).catch(async e=>{await stopAmbient(c);throw e;});return;}
      if(action==='enable-mode') return command(c,'mode:set',{...scope(),mode:target.dataset.mode,enabled});
      if(action==='mode-action') return command(c,'mode:action',{...scope(),mode:target.dataset.mode,action:normalizeSocialGameActionR47(target.dataset.mode,JSON.parse(target.dataset.payload))});
      if(action==='reveal') return openDialog('كشف الهوية بموافقتك','<p>إذا كنت مرسل هذه الرسالة، سيظهر اسمك لأعضاء المجلس. هذا اختيارك أنت فقط، ولا يمكن التراجع عن الكشف. لا يستطيع المشرف الموافقة نيابة عنك.</p>',async()=>command(c,'mode:action',{mode:'anonymous',action:{type:'reveal',messageId:id}}),'أوافق على كشف هويتي');
      if(action==='report-anonymous') return openDialog('الإبلاغ عن رسالة مجهولة',textField('reason','سبب البلاغ',200),async f=>command(c,'mode:action',{mode:'anonymous',action:{type:'report',messageId:id,reason:f.elements.reason.value.trim()}}),'إرسال البلاغ');
      if(action.startsWith('report-')) return openDialog('إرسال بلاغ',textField('text','وصف المخالفة',500),async f=>command(c,'report:send',{targetType:action==='report-member'?'member':'chat',targetId:id,text:f.elements.text.value.trim()}),'إرسال البلاغ');
      if(action==='mute') return command(c,'member:mute',{roomId:c.routeRoom,targetId:id,muted:enabled});
      if(action==='moderator') return openDialog(enabled?'تعيين مشرف':'إزالة الإشراف',`<p>${esc(nameOf(c,id))} · يتحقق الخادم من ملكية الغرفة والصلاحيات.</p>`,async()=>command(c,'room:moderator',{roomId:c.routeRoom,targetId:id,enabled}));
      if(action==='kick'||action==='ban') return openDialog(action==='kick'?'تأكيد الطرد':'تأكيد الحظر',`<p>هل تريد ${action==='kick'?'طرد':'حظر'} ${esc(nameOf(c,id))} من الغرفة؟ سيُفصل اتصاله بالمجلس.</p>`+textField('reason','سبب الإجراء',200),async f=>command(c,`member:${action}`,{roomId:c.routeRoom,targetId:id,reason:f.elements.reason.value.trim()}),action==='kick'?'طرد العضو':'حظر العضو');
      if(action==='close-council') return openDialog('إغلاق المجلس','<p>سيغادر جميع الأعضاء وتتوقف قناة المجلس. هل تؤكد الإغلاق؟</p>',async()=>command(c,'council:close',scope()),'إغلاق المجلس');
      if(action==='edit-council'){const x=currentCouncil(c);return openDialog('إعدادات المجلس',field('name','الاسم','text',x.name)+textField('description','الوصف',300,x.description||'',false)+check('locked','قفل المجلس',x.locked)+check('allowRequests','السماح بالطلبات',x.allowRequests)+select('privacy','الخصوصية',{public:'عام',private:'خاص'},x.privacy)+`<label class="so-field">المقاعد<input type="number" name="seats" min="2" max="${esc(c.config?.maxCouncilSeats||12)}" value="${esc(x.seats)}" required></label>`,async f=>command(c,'council:update',{...scope(),name:f.elements.name.value.trim(),description:f.elements.description.value.trim(),locked:f.elements.locked.checked,allowRequests:f.elements.allowRequests.checked,privacy:f.elements.privacy.value,seats:Number(f.elements.seats.value)}),'حفظ');}
      if(action==='edit-room'){const r=c.snapshot.room;return openDialog('هوية الغرفة',field('name','الاسم','text',r.name)+textField('description','الوصف',300,r.description||'',false)+select('privacy','الخصوصية',{public:'عامة',private:'خاصة'},r.privacy)+check('memory','ذاكرة نصية بموافقة المشاركين',r.memory),async f=>command(c,'room:update',{roomId:r.id,name:f.elements.name.value.trim(),description:f.elements.description.value.trim(),privacy:f.elements.privacy.value,memory:f.elements.memory.checked}),'حفظ');}
      if(action==='memory') return openDialog('ذكرى نصية اختيارية',textField('text','النص المقترح',500)+'<p class="so-note">لن تُحفظ أو تُعرض طويلًا قبل موافقة جميع المشاركين المعنيين. لا تسجيل صوتي.</p>',async f=>command(c,'memory:propose',{text:f.elements.text.value.trim()}),'طلب موافقة المشاركين');
      if(action==='memory-consent') return command(c,'memory:consent',{memoryId:id,approve:enabled});
    });
  };
  const onSubmit=async event=>{
    if(forwardGift(event))return;
    const form=event.target;if(!page.contains(form)||!(form.hasAttribute('data-so-form')||form.hasAttribute('data-so-dialog-form')))return;
    event.preventDefault();event.stopPropagation();if(c.busy||c.loading||dialogBusy)return;
    if(form.hasAttribute('data-so-dialog-form')){
      if(!dialogSubmit){closeDialog();return;}
      dialogBusy=true;const disabledStates=new Map([...form.querySelectorAll('button,input,textarea,select')].map(el=>[el,el.disabled]));disabledStates.forEach((_,el)=>el.disabled=true);
      try {await dialogSubmit(form);dialogBusy=false;closeDialog();}catch(e){if(alive&&dialog){dialog.querySelector('[data-so-dialog-error]').textContent=e.message;dialogBusy=false;disabledStates.forEach((disabled,el)=>el.disabled=disabled);if(form._ownerCreation?.state){const state=form._ownerCreation.state;form.querySelectorAll('input:not([data-so-room-photo-input]):not([name="startMicrophone"]):not([name="password"]),textarea,select,[data-so-action="directory-create-choice"]').forEach(el=>el.disabled=true);form.elements.password.disabled=!(state.requiresPassword&&!state.roomReceipt);form.elements.password.required=!form.elements.password.disabled;form.querySelector('button[type="submit"]').textContent=state.seatReceipt&&state.photoRequired&&!state.photoSaved?'حفظ الصورة والدخول':'إكمال إنشاء غرفتك وبدء البث';}else if(form.dataset.createdRoom){form.querySelectorAll('input:not([data-so-room-photo-input]),textarea,select,[data-so-action="directory-create-choice"]').forEach(el=>el.disabled=true);form.querySelector('button[type="submit"]').textContent='حفظ الصورة والدخول';}}}finally{dialogBusy=false;}return;
    }
    await run(async()=>{
      if(form.dataset.soForm==='chat'){const submitted=form.elements.text.value,text=submitted.trim();if(!text)throw Error('اكتب رسالة قبل الإرسال.');const previousKey=draftKey('chat',undefined,undefined);return requireAdult(async()=>{try{await ensureSeat();}finally{const nextKey=draftKey('chat',undefined,undefined);if(nextKey!==previousKey&&currentCouncil(c)){const draft=draftCache.get(previousKey)||[{name:'text',value:submitted,checked:false}];if(!draftCache.has(nextKey))draftCache.set(nextKey,draft);draftCache.delete(previousKey);c.notify();}}const key=draftKey('chat',undefined,undefined);await command(c,'chat:send',{text});const next=host.querySelector('form[data-so-form="chat"]');if(key===draftKey('chat',undefined,undefined)&&next&&(next.elements.text.value===submitted||!next.elements.text.value)){next.reset();draftCache.delete(key);draftCache.delete(previousKey);}else saveDrafts();});}
      const mode=form.dataset.mode,type=form.dataset.type;let action={type};
      [...form.elements].filter(e=>e.name).forEach(e=>{action[e.name]=e.type==='checkbox'?e.checked:e.type==='number'?Number(e.value):e.value.trim();});
      if(mode==='topics'&&type==='configure'){action.durationMs=action.durationSeconds*1000;delete action.durationSeconds;}
      if(mode==='quiet'&&type==='configure'){action.intervalMs=action.intervalSeconds*1000;delete action.intervalSeconds;}
      action=normalizeSocialGameActionR47(mode,action);
      await command(c,'mode:action',{...scope(),mode,action});form.reset();const next=host.querySelector(`form[data-so-form="mode"][data-mode="${mode}"][data-type="${type}"]`);if(['answer','send','suggest','start'].includes(type)){next?.reset();draftCache.delete(draftKey('mode',mode,type));}
    });
  };
  const onInput=event=>{if(forwardGift(event))return;const el=event.target;if(!c.routeRoom&&el?.hasAttribute?.('data-so-directory-query')){c.directoryUI.query=el.value.slice(0,80);paint();return;}if(el?.id==='so-chat-text'){ui.chatSelection=[el.selectionStart,el.selectionEnd];el.closest('.so-chat-input-wrap')?.classList.toggle('has-text',!!el.value.trim());saveDrafts();return;}if(!el?.dataset.soVolume)return;event.stopPropagation();const volume=Number(el.value);if(!Number.isFinite(volume)||volume<0||volume>1)return;if(el.dataset.soVolume==='voice'){c.outputVolume=volume;c.voice?.setOutput(volume);const output=el.closest('.so-output-control')?.querySelector('output');if(output)output.textContent=Math.round(volume*100)+'%';}else {c.ambientVolume=volume;if(c.ambient)c.ambient.volume=volume;}};
  const onChatScroll=event=>{const log=event.target;if(!log?.classList?.contains('so-chat-messages')||log.scrollHeight-log.clientHeight-log.scrollTop>=48||!ui.chatUnread)return;ui.chatUnread=0;host.querySelector('[data-so-chat-unread]')?.remove();host.querySelector('.so-composer-chat')?.setAttribute('aria-label','المحادثة');};
  const onChange=event=>{if(forwardGift(event))return;if(event.target?.matches?.('[data-so-room-photo-input]')&&photoPicker){if(!dialogBusy){const form=event.target.closest('form');if(form)delete form._coverKey;const file=event.target.files?.[0];if(file)void photoPicker.select(file);else photoPicker.clear();}return;}if(event.target?.name==='passwordEnabled'&&dialog?.classList.contains('so-create-room-r30')){const password=dialog.querySelector('input[name="password"]');if(password){password.disabled=!event.target.checked;password.required=event.target.checked;if(!event.target.checked)password.value='';}return;}if(event.target?.dataset.soVolume==='ambient'&&currentCouncil(c)?.modeEnabled?.quiet&&!c.busy&&!c.pending)void run(()=>command(c,'mode:action',{mode:'quiet',action:{type:'music',enabled:c.ambientOn,volume:c.ambientVolume}}));};
  const onKey=event=>{if(!c.routeRoom&&!dialog&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)&&event.target?.closest?.('[role="tablist"]')){const rail=event.target.closest('[role="tablist"]'),tabs=[...rail.querySelectorAll('button[role="tab"]')].filter(button=>!button.disabled),index=tabs.indexOf(event.target),rtl=getComputedStyle(rail).direction==='rtl';if(index>=0&&tabs.length){event.preventDefault();event.stopPropagation();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+((event.key==='ArrowLeft')===rtl?1:-1)+tabs.length)%tabs.length;tabs[next].focus({preventScroll:true});tabs[next].click();return;}}if(event.key==='Escape'&&(dialog||ui.panel||ui.settings)){event.preventDefault();event.stopPropagation();if(dialog)closeDialog();else if(ui.settings)closeSettings();else closePanel();return;}if(!dialog||event.key!=='Tab')return;const focusable=[...dialog.querySelectorAll('button,input,textarea,select,a[href]')].filter(x=>!x.disabled);if(!focusable.length){event.preventDefault();return;}const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
  const preserveGiftPress=event=>{if(event.target?.closest?.('#so-gift-send')&&document.activeElement?.id==='so-gift-custom-quantity')event.preventDefault();};
  // Quantity commits on input blur: update the existing footer without replacing
  // the button under the pointer. The same click can then send the committed qty.
  const paintGiftQuantity=()=>{
    if(!alive||ui.panel!=='gifts'||typeof gifts?.render!=='function')return false;
    const container=host.querySelector('[data-so-gifts]'),footer=container?.querySelector('.so-gift-footer');
    if(!footer)return false;
    const template=document.createElement('template');template.innerHTML=gifts.render({...c.snapshot,snapshotVoice:c.voiceState});
    const fresh=template.content.querySelector('.so-gift-footer');if(!fresh)return false;
    for(const selector of ['[data-so-gift-total]','.so-gift-selected-name','[data-so-gift-quote-status]','[data-so-gift-balance]']){
      const old=footer.querySelector(selector),next=fresh.querySelector(selector);if(old&&next)old.textContent=next.textContent;
    }
    for(const old of footer.querySelectorAll('button[id],input[id]')){
      const next=fresh.querySelector('#'+CSS.escape(old.id));if(!next)continue;
      old.disabled=next.disabled;if(old.tagName==='BUTTON')old.innerHTML=next.innerHTML;
      for(const name of ['aria-pressed','aria-invalid','aria-expanded']){
        const value=next.getAttribute(name);if(value===null)old.removeAttribute(name);else old.setAttribute(name,value);
      }
    }
    // Refresh only quote/error presentation, not the focused input or send button.
    const currentPreview=container.querySelector('.gr13-checkout-preview'),nextPreview=template.content.querySelector('.gr13-checkout-preview');
    if(currentPreview&&nextPreview)currentPreview.replaceWith(nextPreview);
    for(const selector of ['.so-gift-error','.so-gift-success','.so-gift-confirm']){
      const old=container.querySelector(selector),next=template.content.querySelector(selector);
      if(old&&next)old.replaceWith(next);else if(old)old.remove();else if(next)container.querySelector('.so-gift-shop')?.append(next);
    }
    return true;
  };
  if(typeof gifts?.onChange==='function'){try{giftsUnsubscribe=gifts.onChange(reason=>{if(!alive)return;if(reason==='gift-sent'&&!ctx.gameRoom){showCombo(live);if(ui.panel==='gifts'){closePanel(false);return;}}if(!(reason==='quantity-inline'&&paintGiftQuantity()))paint();});}catch(e){reportError(e);}}
  const viewport=window.visualViewport,fitViewport=()=>{
    if(!alive)return;
    const currentViewport=window.visualViewport||viewport;
    const height=currentViewport?.height||window.innerHeight;
    page.style.setProperty('--so-viewport-height',height+'px');
    if(shell&&page.dataset.soViewportRoom==='true'){
      shell.style.setProperty('--so-viewport-height',height+'px');
      shell.style.setProperty('--so-viewport-width',(currentViewport?.width||window.innerWidth)+'px');
      shell.style.setProperty('--so-viewport-top',(currentViewport?.offsetTop||0)+'px');
      shell.style.setProperty('--so-viewport-left',(currentViewport?.offsetLeft||0)+'px');
    }
    page.dataset.soCompactViewport=String(height<520);
    const stage=host.querySelector('[data-so-room-detail]'),dock=stage?.querySelector('[data-so-room-dock]');
    if(dock)stage.style.setProperty('--so-dock-height',Math.ceil(dock.getBoundingClientRect().height)+'px');
  };
  let measuredDock=null;
  const dockObserver=typeof ResizeObserver==='function'?new ResizeObserver(fitViewport):null;
  const observeDock=()=>{const dock=host.querySelector('[data-so-room-dock]');if(dock!==measuredDock){dockObserver?.disconnect();measuredDock=dock;if(dock)dockObserver?.observe(dock);}};
  fitViewport();viewport?.addEventListener('resize',fitViewport);viewport?.addEventListener('scroll',fitViewport);window.addEventListener('resize',fitViewport);
  page.addEventListener('pointerdown',preserveGiftPress,true);page.addEventListener('mousedown',preserveGiftPress,true);
  page.addEventListener('scroll',onChatScroll,true);page.addEventListener('click',onClick);page.addEventListener('submit',onSubmit);page.addEventListener('input',onInput);page.addEventListener('change',onChange);page.addEventListener('keydown',onKey);c.listeners.add(paint);paint();void read(c);
  // Bounded visible-only fallback. Parent can call refreshSocial on social:update.
  const poll=setInterval(()=>{if(alive&&document.visibilityState==='visible'&&!c.busy&&!c.loading&&!dialog&&!document.activeElement?.closest?.('form'))void read(c);},20000);
  return {updateGameContext(next){if(!alive)return;ctx.gameRoom=next.gameRoom||ctx.gameRoom;const previous=JSON.stringify(ctx.gameVoice);if(next.gameVoice)ctx.gameVoice=next.gameVoice;c.ctx=ctx;if(previous===JSON.stringify(ctx.gameVoice))return;const id=ctx.gameVoice?.status==='ready'?String(ctx.gameVoice.roomId):'';if(id!==c.routeRoom){c.challengeUI?.reset();c.challengeUpdates?.clear();c.challengeModel={available:false};c.routeRoom=id;c.readSeq++;c.loading=false;c.error='';c.snapshot=null;autoVoiceAttempt='';void read(c);}paint();},destroy(){saveDrafts();dismissEditableFocus();alive=false;/* // room-tools-r33: destroy */roomToolsR33.destroy();if(c.roomTools===roomToolsR33)c.roomTools=null;gamesR47.destroy();if(c.gamesR47===gamesR47)c.gamesR47=null;c.cannonFX?.destroy();c.cannonFX=null;clearGiftRuntime(c);c.entranceFX?.cancel();c.entranceHost=null;c.challengeHost=null;c.challengeUI?.reset();c.challengeUpdates?.clear();dockObserver?.disconnect();viewport?.removeEventListener('resize',fitViewport);viewport?.removeEventListener('scroll',fitViewport);window.removeEventListener('resize',fitViewport);shell?.classList.remove('lb-social-entered','lb-social-directory-r30');document.documentElement.classList.remove('lb-social-viewport-r27');delete page.dataset.soViewportRoom;if(shell){delete shell.dataset.soViewportRoom;for(const name of ['--so-viewport-height','--so-viewport-width','--so-viewport-top','--so-viewport-left'])shell.style.removeProperty(name);}clearInterval(poll);c.listeners.delete(paint);if(typeof giftsUnsubscribe==='function')giftsUnsubscribe();closeGifts();page.removeEventListener('pointerdown',preserveGiftPress,true);page.removeEventListener('mousedown',preserveGiftPress,true);page.removeEventListener('scroll',onChatScroll,true);page.removeEventListener('click',onClick);page.removeEventListener('submit',onSubmit);page.removeEventListener('input',onInput);page.removeEventListener('change',onChange);page.removeEventListener('keydown',onKey);dialogBusy=false;closeDialog();}};
}
