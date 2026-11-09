import { createGlobalSearch } from '../unified/global-search.js?v=global-search-r17';
import * as PR from './profile.js?v=r66b';
import * as UNIFIED from '../unified/shell.js?v=r66b';
import * as REF from '../unified/home.js?v=r63a';
import * as SOCIAL from '../unified/social.js?v=r63b';
const { leaveSocial, refreshSocial } = SOCIAL;
import { isRetiredGame, visibleGameCatalogue, retiredGameHTML } from '../game-availability.js?v=games-royal-1';
import { createSocialGiftStore } from '../social-gifts.js?v=r63a';
import {giftArtwork} from '../gift-assets-r27.js?v=unique-r36';
/* لعبك — واجهة الموقع. بدون مكتبات، وكل حالة اللعب الحقيقية تجي من الخادم. */
import { GAME_VIEWS, JK, flipSnapshot, flipPlay, FX_GEOM } from '../games.js?v=r59d';
import { createEventSync, buildPlan } from '../gameevents.js?v=shell-r6';
import { runPlan } from '../gamefx.js?v=shell-r6';
import * as BK from '../backup.js?v=shell-r6';
import * as HUB from '../hub.js?v=shell-r6';
import { CLOCK, startClocks, updateClocks } from '../turnclock.js?v=shell-r6';
import { initStatus, checkStatusNow } from '../status.js?v=root-navigation-r50';
import * as LOB from '../lobby.js?v=r59d';
import * as AVT from '../avatar.js?v=shell-r6';
import * as AUTH from '../auth.js?v=shell-r6';
import * as FS from '../fullscreen.js?v=shell-r6';
import { mountSprite } from '../characters.js?v=shell-r6';
mountSprite();
import * as SEASON from '../seasons.js?v=shell-r6';
import * as PF from '../profile.js?v=r63a';
import * as SHOP from '../shop.js?v=r63b';
import * as GIFT from '../gifts.js?v=r63a';
import * as GFX from '../giftfx.js?v=r57';
import * as AVR from '../avatars.js?v=r59d';
import * as DMV from '../domino.js?v=r59d';
import * as UNV from '../uno.js?v=r59d';
import * as CRV from '../carrom.js?v=r59d';
import * as MNV from '../minaboli-r47.js?v=r57';
import * as CITY from '../city.js?v=r57';
import * as COM from '../community.js?v=r66a';
import { isCommunityRestricted } from '../community-access-r37.js';
import * as THEME from '../theme.js?v=r64a';
import * as PWA from '../pwa.js?v=r62e';
import * as SFX from '../sfx.js?v=shell-r6';
import * as OFF from '../offline.js?v=games-royal-1';
import * as MIS from '../missions.js?v=r63a';
import * as CHAT from '../chat.js?v=r63a';
import { accountToolsView } from '../account-tools.js?v=shell-r6';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* مزامنة أحداث اللعب من الخادم (gameevents.js). curFx يحمل أحداث اللقطة الحالية للرسم الذي يليها مباشرة فقط */
const EVS = createEventSync();
let curFx = null;
const S = {
  user: null,
  games: [],
  rooms: new Map(),
  ws: null,
  online: false,
  helloDone: false,
  offset: 0,
  pending: new Map(),
  seq: 0,
  retry: 0,
  drafts: {},
  autoSent: {},
  next: null,
  categories: [],
  fCat: 'all',
  fMode: 'all',
  pf: { editing: false, draft: null, confirmClear: false, tab: 'info', sec: 'profile' },
};

const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
function normalizeCode(input) {
  let v = String(input || '').trim();
  const m = v.match(/\/join\/([^/?#\s]+)/i);
  if (m) v = m[1];
  return v
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toUpperCase()
    .replace(/[\s\-_]/g, '');
}

/* ---------------- تنبيهات ---------------- */
let toastTimer;
function toast(msg, isErr = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 3600);
}

/* ---------------- الاتصال ---------------- */
function updateConn() {
  const el = $('#conn');
  if(el){el.hidden=!S.user;el.classList.toggle('off',!S.online);const label=el.querySelector('b');if(label)label.textContent=S.online?'متصل':'جاري الاتصال…';}
  patchLive();
}

/** الشريط العلوي: رصيد العملات الحقيقي (من الخادم) وجرس الإشعارات بعدد غير المقروء */
function updateTop() {
  const ctx=referenceContext();
  const ownsHomeWallet=parseRoute().name==='home'&&ctx.user&&ctx.walletOwnerId===ctx.user.id;
  if(!ownsHomeWallet)document.querySelectorAll('.lb-wallet-strip').forEach(el=>el.remove());
  else document.querySelectorAll('[data-lb-balance]').forEach(el=>{const value=el.dataset.lbBalance==='coins'?ctx.coins:ctx.gems;const text=typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value.toLocaleString('en-US'):'—';el.textContent=text;el.title=text;});
  const top=$('#top');
  if(top){if(UNIFIED.hasRoute(parseRoute().name))top.replaceChildren();else top.innerHTML=royalSharedHeader(ctx);}
}
function royalSharedHeader(ctx) {
  return `<div class="lb-unified lb-standalone-header">${UNIFIED.headerHTML(ctx).replace('data-lb-shell="menu"','data-royal-home-menu="1"')}<div class="lb-shared-meta"><button id="back" data-act="back" class="btn ghost" type="button" aria-label="رجوع">رجوع</button><span class="conn" id="conn" ${ctx.user?'':'hidden'}><i></i><b>${ctx.connected?'متصل':'جاري الاتصال…'}</b></span></div></div>`;
}
let openRoyalMenuOnHome=false;
document.addEventListener('click',e=>{if(e.target.closest?.('[data-royal-home-menu]')){e.preventDefault();openRoyalMenuOnHome=true;(globalThis.__LA3BAK_NAV__ || location).hash='#/';}});


// Wallet pushes can arrive before hello or during a purchase. Coalesce them and
// refresh only once the shop is ready; never replace an in-flight purchase modal.
let shopWalletDirty = false, shopWalletTimer = null;
function scheduleShopWallet() {
  if (!shopWalletDirty || shopWalletTimer || !S.user || !S.helloDone || !S.online || SHOP.SH.busy || SHOP.SH.loading || (parseRoute().name !== 'shop' || parseRoute().a === 'packs')) return;
  shopWalletTimer = setTimeout(async () => {
    shopWalletTimer = null;
    if (!S.user || !S.helloDone || !S.online || SHOP.SH.busy || SHOP.SH.loading || (parseRoute().name !== 'shop' || parseRoute().a === 'packs')) return;
    shopWalletDirty = false;
    try { await SHOP.load(req); } catch { /* load failure stays recoverable through shop reload */ }
    if (parseRoute().name === 'shop' && parseRoute().a !== 'packs' && !SHOP.SH.busy) render();
  }, 100);
}

function connect() {
  if (!S.user) return;
  if (S.ws && S.ws.readyState <= 1) return;
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  S.ws = ws;
  ws.onmessage = (e) => {
    let m;
    try {
      m = JSON.parse(e.data);
    } catch {
      return;
    }
    if (m.r !== undefined && S.pending.has(m.r)) {
      if (m.code === 'guest') guestPrompt(m.error);
      S.pending.get(m.r)(m);
      S.pending.delete(m.r);
    } else if (m.t === 'hello') {
      S.user = m.user;
      S.coins = m.coins ?? 0;
      S.canClaim = !!m.canClaim;
      // فتح #/shop مباشرة (تحديث الصفحة) يطلب المتجر قبل جاهزية الاتصال فيفشل؛ أول ما يجهز الاتصال نعيد التحميل
      if (['home','profile','account'].includes(parseRoute().name) && !SHOP.SH.data) SHOP.load(req).then(() => { if (['home','profile','account'].includes(parseRoute().name)) render(); });
      if (parseRoute().name === 'shop' && (SHOP.SH.err || !SHOP.SH.data)) SHOP.load(req).then(() => { if (parseRoute().name === 'shop') render(); });
      // إعادة الاتصال: الأحداث المتصلة نشغّلها، والفجوة الكبيرة نزامن الحالة بدون حركة، واللقطة الأقدم من المعروضة نتجاهلها
      const fxs = new Map();
      gameVoiceBindings.clear(); // Re-authorize bindings after every authenticated reconnect.
      S.rooms = new Map(m.rooms.map((r) => [r.code, r]));
      for (const r of m.rooms) {
        const f = EVS.feed(r.code, r.gameNo, r.game);
        if (f.mode === 'stale') { EVS.drop(r.code); EVS.feed(r.code, r.gameNo, r.game); } // اتصال جديد: الخادم هو المرجع، لا نتجمّد على حالة أقدم
        else if (f.mode === 'play') fxs.set(r.code, f);
      }
      m.rooms.forEach(trackRoom);
      S.online = true;
      S.helloDone = true;
      S.retry = 0;
      if (m.rooms[0]) { S.offset = m.rooms[0].serverNow - Date.now(); CLOCK.observe(m.rooms[0].serverNow); }
      updateConn(); COM.loadMe().then(updateTop);
      curFx = fxs;
      try { render(); } finally { curFx = null; }
      refreshSocial();
    } else if (m.t === 'friend:online' || m.t === 'friend:room') {
      // R58f: تنبيه دخول صديق للموقع أو لغرفة
      if (S.user && S.ws === ws) window.dispatchEvent(new CustomEvent('la3bak:friend', { detail: m }));
    } else if (m.t === 'social:update') {
      if (S.user && S.ws === ws && ['social-room','room'].includes(parseRoute().name)) refreshSocial(m);
    } else if (m.t === 'social:support') {
      if (S.user && S.ws === ws && parseRoute().name === 'social-room') SOCIAL.receiveSocialSupport(m.event);
    } else if (m.t === 'tribe:update') {
      if (S.user && S.ws === ws) window.dispatchEvent(new CustomEvent('la3bak:tribe', { detail: m }));
    } else if (m.t === 'cp:update') {
      if (S.user && S.ws === ws) window.dispatchEvent(new CustomEvent('la3bak:cp', { detail: m }));
    } else if (m.t === 'social:rocket') {
      if(S.user&&S.ws===ws&&parseRoute().name==='social-room'&&!S.accountSettings?.hideChatEffects)SOCIAL.receiveSocialRocket?.(m);
      if(S.user&&S.ws===ws&&parseRoute().name==='social-room')refreshSocial(m);
    } else if (m.t === 'tribe:rocket') {
      // R59: صاروخ القبيلة انطلق — نفس حركة الإطلاق لكل أعضاء القبيلة، مع جايزتك إذا فزت
      if(S.user&&S.ws===ws&&!S.accountSettings?.hideChatEffects){const e=m.event||{};import('../unified/room-rocket-r58.js?v=r63a').then(x=>x.rocketLaunch({id:String(e.id||''),stage:e.stage,planet:e.planet,title:`🚀 تم إطلاق صاروخ القبيلة رقم ${e.n} — كوكب ${e.planet||''}!`,rank:e.mine?e.mine.rank:-1,gems:e.mine?.gems||0,gifts:e.mine?.gifts||[],winners:(e.winners||[]).map(w=>({rank:w.rank,person:{name:w.name,avatar:w.avatar}})),luck:e.luck||null})).catch(()=>{});}
      try{dispatchEvent(new CustomEvent('la3bak:tribe'));}catch{}
    } else if (m.t === 'social:cannon3') {
      if(S.user&&S.ws===ws&&parseRoute().name==='social-room'&&!S.accountSettings?.hideChatEffects)SOCIAL.receiveSocialCannon3?.(m);
    } else if (m.t === 'social:cannon') {
      if(S.user&&S.ws===ws&&parseRoute().name==='social-room'&&!S.accountSettings?.hideChatEffects)SOCIAL.receiveSocialCannon(m);
      if(S.user&&S.ws===ws&&parseRoute().name==='social-room')refreshSocial(m);
    } else if (m.t === 'social:benefits') {
      if (S.user && S.ws === ws && parseRoute().name === 'social-room') window.dispatchEvent(new CustomEvent('la3bak:social-benefits',{detail:{roomId:m.roomId}}));
    } else if (m.t === 'social:gift') {
      if (S.user && S.ws === ws && ['social-room','room'].includes(parseRoute().name)) socialGiftStore?.receive(m);
    } else if (m.t === 'room') {
      const fx = EVS.feed(m.room.code, m.room.gameNo, m.room.game);
      if (fx.mode === 'stale') return; // لقطة أقدم من اللي عرضناه: ما تغيّر حالة أحدث
      S.rooms.set(m.room.code, m.room);
      trackRoom(m.room);
      S.offset = m.room.serverNow - Date.now();
      CLOCK.observe(m.room.serverNow);
      curFx = new Map([[m.room.code, fx]]);
      try { onRoomUpdate(m.room.code); } finally { curFx = null; }
    } else if (m.t === 'mm') {
      if (HUB.MM.game === m.game) { HUB.MM.waiting = m.waiting; HUB.MM.seats = m.seats; HUB.MM.since = m.since - (S.offset || 0); const c = document.getElementById('mmCount'); if (c) c.textContent = `المنتظرين الحين: ${m.waiting} من ${m.seats}`; document.querySelectorAll('.mm-slot').forEach((el, i) => { el.classList.toggle('on', i < m.waiting); el.textContent = i < m.waiting ? (i === 0 ? '🙋' : '👤') : '…'; }); }
    } else if (m.t === 'roomgift') {
      // حدث مؤكد من الخادم (بعد حفظ المعاملة): الحركة لمن هو فاتح الغرفة، والرسالة بمحادثتها
      const cur = parseRoute();
      if (cur.name === 'room' && cur.a === m.code && !S.accountSettings?.hideChatEffects) GFX.play(m.ev, S.user?.id);
      if (CHAT.currentCode() === m.code) CHAT.addGift(m.ev);
      if (m.ev.to.id === S.user?.id) { SFX.play('win'); GIFT.G.log = null; }
    } else if (m.t === 'gift') {
      if (S.accountSettings?.notifications) toast(`🎁 وصلتك هدية: ${m.gift.name} من ${m.gift.from}${m.gift.recv ? ` (+${nf(m.gift.recv)} 🪙)` : ''}`);
      SFX.play('tap'); GIFT.G.log = null;
      const rn = parseRoute().name;
      if (['account','profile'].includes(rn))void loadAcct();
      if (['shop', 'account', 'profile'].includes(rn)) { if (rn === 'shop') GIFT.loadLog(req); if (rn !== 'shop' || !SHOP.SH.busy) render(); }
    } else if (m.t === 'notif') {
      COM.CM.unread = m.unread; updateTop();
      if (['account','profile'].includes(parseRoute().name))void loadAcct();
      if (parseRoute().name === 'notifications') COM.loadNotifs().then(() => parseRoute().name === 'notifications' && render());
    } else if (m.t === 'wallet') {
      if (!S.user || S.ws !== ws) return;
      const ownMe=ACCT.ownerId===S.user.id?ACCT.me:null;
      if (typeof m.coins === 'number' && Number.isFinite(m.coins)) { S.coins = m.coins; GIFT.G.coins=m.coins; if (ownMe) ownMe.coins = m.coins; if (SHOP.SH.data) SHOP.SH.data.coins = m.coins; }
      if (typeof m.gems === 'number' && Number.isFinite(m.gems)) { S.gems = m.gems; GIFT.G.gems=m.gems; if (ownMe) ownMe.gems = m.gems; if (SHOP.SH.data) SHOP.SH.data.gems = m.gems; }
      updateTop();
      socialGiftStore?.wallet(m);
      SHOP.invalidateLedger(); shopWalletDirty = true;
      if (parseRoute().name === 'shop' && parseRoute().a !== 'packs' && !SHOP.SH.busy && S.user && S.helloDone) render();
      scheduleShopWallet();
      if (m.won > 0) { toast(`ربحت 🪙 ${nf(m.won)} عملة!`); SFX.play('win'); }
      if (parseRoute().name === 'hub') render();
      if (['profile', 'account', 'wallet', 'home'].includes(parseRoute().name) && S.user) loadAcct();
      if (parseRoute().name === 'lobby') LOB.load().then(() => parseRoute().name === 'lobby' && render());
    } else if (m.t === 'mm:drop') {
      HUB.reset();
      toast(m.reason, true);
      render();
    } else if (m.t === 'mm:found') {
      HUB.reset();
      SFX.play('win');
      toast(m.bots ? 'بدأنا اللعبة مع بوتات 🤖' : 'لقينا لاعبين! 🎉');
      (globalThis.__LA3BAK_NAV__ || location).hash = '#/room/' + m.code;
    } else if (m.t === 'react') {
      receiveRoomReaction(m);
    } else if (m.t === 'gone') {
      S.rooms.delete(m.code);
      EVS.drop(m.code);
      const cur = parseRoute();
      if (cur.name === 'room' && cur.a === m.code) {
        const why = { deleted: 'المضيف حذف الغرفة.', expired: 'انتهت الغرفة لأنها خاملة.', left: '' }[m.reason];
        if (why) toast(why);
        (globalThis.__LA3BAK_NAV__ || location).hash = '#/rooms';
      } else if (cur.name === 'rooms') render();
    }
  };
  ws.onclose = (ev) => {
    if (S.ws!==ws) return; // اتصال هوية سابقة ما يغيّر حالة اتصال الحساب اليديد
    if (ev && (ev.code === 4503 || ev.code === 4403)) checkStatusNow();
    if (ev?.code===4401) {S.user=null;S.online=false;fetch('/api/me',{credentials:'same-origin'}).then(r=>r.json()).then(m=>{S.user=m.user||null;render();if(S.user)connect();}).catch(()=>render());}
    S.online = false;
    for (const [, cb] of S.pending) cb({ ok: false, uncertain: true, error: 'انقطع الاتصال، جرّب مرة ثانية.' });
    S.pending.clear();
    updateConn();
    if (S.user) setTimeout(connect, Math.min(1000 * 2 ** S.retry++, 8000));
  };
}

// المفتاح محفوظ داخل جلسة التبويب فقط؛ لا نخزّن كلمة المرور أو نسخة منها.
const roomCreateKeys = new Map();
async function req(t, body = {}) {
  // This is a deny-only choice: guardian protection must prevent server-side
  // membership as well as hiding the voice UI. It grants no social permission.
  if (['room:create','room:join'].includes(t) && isCommunityRestricted()) body={...body,voice:false};
  const ownerId=S.user?.id;
  let storageKey='';
  if (t==='room:create' && !body.key) {
    const text=JSON.stringify([ownerId,body.gameId,body.mode,body.seats,body.visibility||'code',body.password||'']);
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    if(ownerId!==S.user?.id)return {ok:false,error:'تغيّرت جلسة الحساب؛ أعد المحاولة.'};
    // الهاش غير محفوظ: فقط اختيار إعدادات الطلب المعلقة في ذاكرة التبويب.
    const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    storageKey='lb-room-create:'+String(ownerId||'guest');
    let saved;
    try {saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{}
    const choice=JSON.stringify([body.gameId,body.mode,body.seats,body.visibility||'code']);
    let key=roomCreateKeys.get(fingerprint)||(saved?.choice===choice?saved.key:null);
    if (!key) key=crypto.randomUUID();
    roomCreateKeys.set(fingerprint,key);
    try {sessionStorage.setItem(storageKey,JSON.stringify({key,choice}));}catch{}
    body={...body,key};
  }
  if(ownerId!==S.user?.id)return {ok:false,error:'تغيّرت جلسة الحساب؛ أعد المحاولة.'};
  return new Promise((resolve) => {
    if (!S.ws || S.ws.readyState !== 1) return resolve({ ok: false, uncertain: true, error: 'ما فيه اتصال بالخادم حالياً، انتظر شوي وجرّب.' });
    const id = ++S.seq;
    const timer = setTimeout(() => {
      S.pending.delete(id);
      resolve({ ok: false, uncertain: true, error: 'انتهت مهلة الطلب، جرّب مرة ثانية.' });
    }, 8000);
    S.pending.set(id, (r) => {
      clearTimeout(timer);
      if (t==='room:create' && r.ok && storageKey) {
        try {sessionStorage.removeItem(storageKey);}catch{}
        for (const [fp,key] of roomCreateKeys) if (key===body.key) roomCreateKeys.delete(fp);
      }
      if(['room:create','room:join'].includes(t) && r.ok && r.room && S.user?.id===ownerId) rememberGameVoice(r.room.code,r.voice,ownerId);
      resolve(r);
    });
    try { S.ws.send(JSON.stringify({ id, t, ...body })); }
    catch { clearTimeout(timer); S.pending.delete(id); resolve({ ok: false, uncertain: true, error: 'تعذّر إرسال الطلب؛ جرّب مرة ثانية.' }); }
  });
}

/* ---------------- التوجيه ---------------- */
function parseRoute() {
  const parts = ((globalThis.__LA3BAK_NAV__ || location).hash.replace(/^#\/?/, '') || '').split('/');
  const raw = parts[0] || 'home';
  const name = {ranking:'leaderboard',store:'shop','game-voice':'room'}[raw] || raw;
  const dec = (v) => { try { return v ? decodeURIComponent(v) : ''; } catch { return ''; } };
  return { name, a: dec(parts[1]), b: dec(parts[2]), c: dec(parts[3]) };
}

const NAV_OF = { lobby: 'games', hub: 'games', challenge: 'games', daily: 'home', play: 'games', offline: 'games', leaderboard: 'home', about: 'home', privacy: 'home', terms: 'home', agreement: 'home', settings: 'account', 'privacy-settings': 'account', 'account-info': 'account', devices: 'account', 'hidden-posts': 'account', admin: 'home', home: 'home', games: 'games', game: 'games', city: 'games', rooms: 'home', room: 'games', join: 'games', profile: 'account', account: 'account', wallet: 'account', shop: 'shop', voice: 'community', vroom: 'community', community: 'community', post: 'community', u: 'community', notifications: 'home' };
/* R51: الأب المنطقي يُستخدم فقط لو فُتحت الصفحة مباشرة (ما فيه صفحة سابقة داخل الموقع)؛ غير كذا زر الرجوع يرجع للصفحة السابقة الفعلية.
   صفحات قائمة «ملفي» (VIP، نوبل، المحفظة…) أبوها الملف الشخصي، مو الرئيسية. */
const PROFILE_CHILDREN = new Set(['vip','ranks','rank-rewards','missions','wallet','settings','family','visitors','invite']);
/* R53b: توثيق الحساب والمساعدة والخصوصية والشروط صارت داخل الإعدادات */
const SETTINGS_CHILDREN = new Set(['verification','support','privacy','terms','privacy-settings','account-info','devices','hidden-posts','about']);
const BACK_OF = (r) => (r.name === 'social-room' ? '#/social-rooms' : ['game','hub','city'].includes(r.name) ? '#/games' : r.name === 'room' ? '#/rooms' : PROFILE_CHILDREN.has(r.name) ? '#/profile' : SETTINGS_CHILDREN.has(r.name) ? '#/settings' : '#/');

function needUser(nextHash) {
  if (S.user) return false;
  toast('قبل ما تدخل الغرفة، اكتب الاسم اللي بيظهر لأصحابك.');
  S.next = nextHash;
  (globalThis.__LA3BAK_NAV__ || location).hash = '#/profile';
  return true;
}

// R46: these side-effect-free views have no home/room boot work. Keep each
// exact module URL stable so dynamic and static callers share ESM identity.
const functionalModules = new Map();
function loadFunctionalModule(name) {
  const key = ['auction','family'].includes(name) ? name : name === 'friends' || name === 'messages' ? 'private' : name === 'missions' ? 'missions' : ['visitors','invite'].includes(name) ? 'profile-social' : 'pages';
  if (!functionalModules.has(key)) {
    const promise = key === 'auction' ? import('../auction-r47.js?v=r63a')
      : key === 'family' ? import('../family-r47.js?v=build-all-r47')
      : key === 'private' ? import('../social-private.js?v=r57')
      : key === 'missions' ? import('../missions-server.js?v=r63a')
      : key === 'profile-social' ? import('../profile-social-r53.js?v=r63a')
      : import('../functional-pages.js?v=r63a');
    functionalModules.set(key, promise);
    promise.catch(() => { if (functionalModules.get(key) === promise) functionalModules.delete(key); });
  }
  return functionalModules.get(key);
}
// Responsive derivative of the shipped public artwork only. The original stays
// available for high-density/wide displays; no uploaded/configured art is changed.
function responsiveRoyalScenery(html) {
  const visibleProfile = ['profile', 'u'].includes(parseRoute().name);
  if (!visibleProfile) return html;
  return html.replace(/<img\b[^>]*\bsrc="\/preview\/assets\/profile\/royal-landscape\.webp"[^>]*>/g, tag =>
    tag.replace(/\sfetchpriority="[^"]*"/g, '').replace('src="/preview/assets/profile/royal-landscape.webp"',
      'src="/preview/assets/profile/royal-landscape.webp" srcset="/preview/assets/profile/royal-landscape-r46.webp 1200w, /preview/assets/profile/royal-landscape.webp 2176w" sizes="(max-width: 1200px) 100vw, 1200px" loading="' + (visibleProfile ? 'eager' : 'lazy') + '" decoding="async" fetchpriority="' + (visibleProfile ? 'high' : 'low') + '"'));
}
let functionalMount = null;
let unifiedMount = null;
let socialGiftStore=null, socialGiftOwner='';
function socialGiftContext(page) {
 if (!S.user || (socialGiftOwner && socialGiftOwner!==S.user.id)) { socialGiftStore?.destroy();socialGiftStore=null;socialGiftOwner=''; }
 if(!['social-room','room'].includes(page))return undefined;
 if(!socialGiftStore&&S.user){socialGiftOwner=S.user.id;socialGiftStore=createSocialGiftStore({ownerId:S.user.id,req,api:functionalApi,giftArtwork,onConfirmedGift:(ev,meta)=>{if(!S.accountSettings?.hideChatEffects)SOCIAL.receiveSocialGiftEffect(ev,meta);}});}
 return socialGiftStore;
}
function unifiedContext(page, content='') {
 const scoped={...profileContext(),socialGifts:socialGiftContext(page)};
 return {...scoped, page, content, paymentCurrency:parseRoute().name==='shop'&&parseRoute().a==='packs'?parseRoute().b:undefined, socialRoomId:parseRoute().name==='social-room'?parseRoute().a:null, backHref:BACK_OF(parseRoute()), noCommunity:isCommunityRestricted(), paymentReturnId:parseRoute().name==='payments' && parseRoute().a==='return' ? parseRoute().b : undefined, user:S.user, me:scoped.me, connected:S.online, games:S.games, rooms:[...S.rooms.values()], board:BOARD, api:functionalApi, getUserId:()=>S.user?.id, req, refreshMe:()=>loadAcct(false), mountGoogle, googleCard:()=>googleCard(S.google), toast};
}
/* R60: الإعدادات/الخصوصية/معلومات الحساب (قوائم صفوف مثل فيديو المالك) */
let S60 = null;
async function settingsR60(view, name) {
  const M = await import('../settings-r60.js?v=r66a');
  const st = { msg: '', bad: false, priv: null, settings: null };
  const paint = () => {
    if (parseRoute().name !== name) return;
    const html = name === 'hidden-posts' ? M.hiddenPostsHTML(st.rel, st.msg, st.bad) : name === 'devices' ? M.devicesHTML(st.dev, st.msg, st.bad) : name === 'privacy-settings' ? M.privacyHTML(st.priv, st.msg, st.bad) : name === 'account-info' ? M.accountInfoHTML({ me: ACCT.me, user: S.user, google: S.google }) : M.settingsHTML({ google: S.google, settings: st.settings, msg: st.msg, bad: st.bad });
    const root = view.querySelector('[data-s60-root]'); if (root) { root.innerHTML = html; if (name === 'settings') M.pushState?.(root); }
  };
  unifiedPage(view, 'settings', '<div data-s60-root></div>', true);
  const root = view.querySelector('[data-s60-root]');
  M.bind(root, { google: S.google, nav: (h) => { (globalThis.__LA3BAK_NAV__ || location).hash = h; }, logout: () => previewLogout(), after: async (m, bad) => { st.msg = m; st.bad = bad; await load(); paint(); } });
  async function load() {
    if (name === 'hidden-posts') st.rel = await fetch('/api/community/relations', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json()).catch(() => ({ ok: false }));
    else if (name === 'devices') st.dev = await fetch('/api/devices', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json()).catch(() => ({ ok: false, list: [] }));
    else if (name === 'privacy-settings') st.priv = await fetch('/api/privacy', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({ ok: false }));
    else if (name === 'settings') st.settings = await fetch('/api/account-tools/settings', { credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null).catch(() => null);
    else if (!ACCT.me) await loadAcct(false);
  }
  paint(); await load(); paint();
}
/* R60b: الضيف القديم بالمهلة — تنبيه مرة باليوم: اربط حسابك قبل التاريخ */
function guestGraceNotice(lockAt) {
  if (!Number.isFinite(lockAt) || lockAt <= Date.now()) return;
  const day = new Date().toISOString().slice(0, 10); try { if (localStorage.getItem('la3bak.g60grace') === day) return; localStorage.setItem('la3bak.g60grace', day); } catch { /* بدون تخزين يطلع كل مرة تفتح الموقع */ }
  const left = Math.max(1, Math.ceil((lockAt - Date.now()) / 86400000));
  const date = new Date(lockAt).toLocaleDateString('ar', { day: 'numeric', month: 'long' });
  setTimeout(() => guestPrompt(`حسابك حاليًا حساب ضيف. اربطه بـGoogle قبل ${date} (باقي ${left} ${left === 1 ? 'يوم' : left === 2 ? 'يومين' : left <= 10 ? 'أيام' : 'يوم'}) عشان تقدر تكمل تلعب أونلاين وترسل هدايا وتشتري وتاخذ مقعد بالغرف.`, { title: 'اربط حسابك بـGoogle', sub: 'بعد هالتاريخ حساب الضيف يقدر يتصفح ويلعب ضد الكمبيوتر بس. رصيدك ومشترياتك ما تنحذف، وتنتقل معك لما تربط.', ic: '⏳', later: 'ذكّرني بكرة' }), 1800);
}
/* R62: عرض الشحن الأول — شريط بصفحة الشحن والمحفظة لو اللاعب ما شحن قبل */
async function firstTopupBanner(view) {
  try {
    const r = await fetch('/api/first-topup', { credentials: 'same-origin', cache: 'no-store' }).then((x) => x.json());
    if (!r?.eligible || !(r.percent > 0)) return; const host = view.querySelector('[data-lb-page]'); if (!host || host.querySelector('.ft62')) return;
    const el = document.createElement('a'); el.className = 'ft62'; el.href = '#/payments';
    el.innerHTML = `<span aria-hidden="true">🎁</span><span><b>${r.percent >= 100 ? 'أول شحن لك = ضعف الكمية!' : `أول شحن لك عليه ${r.percent}% زيادة!`}</b><small>أول عملية شحن ناجحة تاخذ ${r.percent >= 100 ? 'نفس الكمية' : `${r.percent}% منها`} هدية فوقها — مرة وحدة بس.</small></span>`;
    host.prepend(el);
  } catch { /* بدون الشريط */ }
}
/* R60: الضيف يتصفح بس — أي ميزة مقفولة (الخادم يرجع code: 'guest') تطلع نافذة تسجيل الدخول بـGoogle */
let guestPromptAt = 0;
function guestPrompt(text, o = {}) {
  if (Date.now() - guestPromptAt < 1500 || document.querySelector('.g60-sheet')) return; guestPromptAt = Date.now();
  const el = document.createElement('div'); el.className = 'g60-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.dir = 'rtl';
  el.innerHTML = `<div class="g60-card"><span class="g60-ic" aria-hidden="true">${esc(o.ic || '🔐')}</span><h2>${esc(o.title || 'سجّل دخولك بحساب Google')}</h2><p>${esc(text || 'عشان تقدر تلعب أونلاين، وترسل هدايا ورسائل، وتشتري وتاخذ مقعد بالغرف.')}</p><p class="g60-sub">${esc(o.sub || 'كضيف تقدر تتصفح وتلعب ضد الكمبيوتر بس. حسابك الحالي ورصيده ينتقلون معك لما تربطه.')}</p><button type="button" class="g60-go" data-g60="go">تسجيل الدخول بـ Google</button><button type="button" class="g60-x" data-g60="x">${esc(o.later || 'لاحقًا')}</button></div>`;
  el.addEventListener('click', (e) => { const a = e.target.closest?.('[data-g60]')?.dataset.g60; if (e.target === el || a === 'x') el.remove(); if (a === 'go') { el.remove(); (globalThis.__LA3BAK_NAV__ || location).hash = '#/profile'; setTimeout(() => { const d = document.querySelector('.lpu-google-details'); if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); } }, 700); } });
  document.body.append(el);
}
if (typeof window !== 'undefined' && !window.__g60Fetch) {
  window.__g60Fetch = true; const of = window.fetch.bind(window);
  window.fetch = async (...a) => { const r = await of(...a); if (r.status === 403) { try { const j = await r.clone().json(); if (j?.code === 'guest') guestPrompt(j.error); } catch { /* مو JSON */ } } return r; };
}
function unifiedPage(view, page, content='', contentOnly=false) {
  unifiedMount?.destroy?.();
 const ctx=unifiedContext(page,content);
 ctx.contentOnly=contentOnly;
 view.innerHTML=responsiveRoyalScenery(UNIFIED.pageHTML(ctx));
 unifiedMount=UNIFIED.mount(view,ctx);
}
async function functionalApi(path, method = 'GET', body) {
  const requestOptions = method && typeof method === 'object' ? method : {};
  if (method && typeof method === 'object') { body = method.body; method = method.method || 'GET'; }
  const binary = typeof Blob !== 'undefined' && body instanceof Blob;
  if (binary && (method !== 'POST' || !/^\/api\/social\/rooms\/[0-9a-f-]{36}\/cover$/i.test(String(path)))) throw Error('رفع الصور متاح لصورة الغرفة فقط.');
  const headers = method === 'GET' ? {} : { 'Content-Type': binary ? (body.type || 'application/octet-stream') : 'application/json' };
  if(binary&&requestOptions.headers?.['X-Idempotency-Key'])headers['X-Idempotency-Key']=requestOptions.headers['X-Idempotency-Key'];
  const res = await fetch(path, { method, credentials: 'same-origin', headers, body: method === 'GET' ? undefined : binary ? body : JSON.stringify(body ?? {}), cache: 'no-store', signal: requestOptions.signal });
  let data; try { data = await res.json(); } catch { throw Error('تعذّر قراءة رد الخادم.'); }
  if (!res.ok || data?.ok === false) throw Object.assign(Error(data?.error || 'تعذّر تنفيذ الطلب.'), { status: res.status });
  if (path === '/api/account-tools/settings' && method === 'PATCH') applyAccountSettings(data.settings ?? data);
  if (method === 'POST' && (/^\/api\/(missions|rank-rewards)\/[^/]+\/claim$/.test(path) || path === '/api/vip-membership/purchase')) { try { await loadAcct(false); } catch { /* Claim is already saved; never show a failed mint or apply local currency. */ } }
  return data;
}
function applyAccountSettings(settings) {
  if (!settings) return;
  S.accountSettings = settings;
  if (typeof settings.sound === 'boolean' && SFX.isOn() !== settings.sound) SFX.setOn(settings.sound);
}
async function functionalPage(view, name) {
  functionalMount?.destroy?.(); functionalMount = null;
  const heading=name==='verification'?'':`<section class="card"><h1>${esc({ auction:'مزادات المقتنيات', family:'العائلة والارتباط الافتراضي', friends:'الأصدقاء', messages:'الرسائل الخاصة', missions:'المهام اليومية والأسبوعية', verification:'توثيق الحساب', 'rank-rewards':'مكافآت الرتب', support:'الدعم', contact:'التواصل مع الإدارة', 'notifications-internal':'إشعارات الإدارة', settings:'الإعدادات', visitors:'من الذي رآني', invite:'ادعُ الأصدقاء' }[name] || name)}</h1></section>`;
  unifiedPage(view, name, `${heading}<div data-functional-page></div>`);
  const root = view.querySelector('[data-functional-page]');
  // R53: رابط دعوة لزائر ما عنده حساب بعد: نحفظ الرمز محلياً ونعرضه بعد التسجيل بصفحة «ادعُ الأصدقاء»
  if (name === 'invite' && /^[A-Za-z0-9_-]{16}$/.test(parseRoute().a || '')) { try { localStorage.setItem('la3bak:pending-invite', parseRoute().a); } catch { /* اختياري */ } }
  if (!S.user) { root.innerHTML = name === 'invite' ? '<section class="card"><p>صديقك دعاك للعب في لعبك. سوّ حسابك وارجع لهذي الصفحة عشان تأكد انضمامك عن طريقه.</p><a class="btn" href="#/account">إنشاء حساب أو تسجيل الدخول</a></section>' : '<section class="card"><p>سجّل دخولك أول لعرض بيانات حسابك الخاصة.</p><a class="btn" href="#/account">تسجيل الدخول</a></section>'; return; }
  const owner = S.user.id, route = (globalThis.__LA3BAK_NAV__ || location).hash;
  let module;
  if (!['settings', 'verification'].includes(name)) {
    root.innerHTML = '<section class="card"><p role="status">جاري تحميل الصفحة…</p></section>';
    try { module = await loadFunctionalModule(name); }
    catch {
      if (root.isConnected && S.user?.id === owner && (globalThis.__LA3BAK_NAV__ || location).hash === route) root.innerHTML = '<section class="card"><p role="alert">تعذّر تحميل الصفحة. حدّث الصفحة وأعد المحاولة.</p></section>';
      return;
    }
    // Navigation, rerender or account switch during import must not mount a stale view.
    if (!root.isConnected || S.user?.id !== owner || (globalThis.__LA3BAK_NAV__ || location).hash !== route) return;
  }
  if (name === 'friends' || name === 'messages') functionalMount = module.socialPrivateView(root, { api: functionalApi, mode: name, me: S.user });
  else if (name === 'settings' || name === 'verification') functionalMount = accountToolsView(root, { api: functionalApi, mode: name, accountId:S.user.id, getUserId:()=>S.user?.id, refreshMe: () => loadAcct(false) });
  else if (name === 'missions') functionalMount = module.missionsServerView(root, { api: functionalApi });
  else if (name === 'visitors') functionalMount = module.visitorsView(root, { api: functionalApi });
  else if (name === 'invite') functionalMount = module.inviteView(root, { api: functionalApi, code: parseRoute().a || '' });
  else if (name === 'rank-rewards') void module.rankRewardsView(root, { api: functionalApi });
  else if (name === 'notifications-internal') void module.administrativeNotificationsView(root, { api: functionalApi });
  else if (name === 'auction' || name === 'family') {
    const mount = name === 'auction' ? (module.auctionView || module.mount) : (module.familyView || module.mount);
    functionalMount = mount(root, {api:functionalApi,user:S.user,getUserId:()=>S.user?.id,refreshMe:()=>loadAcct(false),toast});
  }
  else void module.supportView(root, { api: functionalApi });
}
const globalSearch = createGlobalSearch({getContext:()=>({user:S.user,noCommunity:isCommunityRestricted(),api:functionalApi})});
let roomRequestGeneration = 0;
let lastRouteKey = '';
let lastSocialIdentity = null;
async function render() {
  globalSearch.checkScope();
  const r = parseRoute();
  if (['kids','tower'].includes(r.name)) { (globalThis.__LA3BAK_NAV__ || location).replace('#/not-found'); return; }
  // Never mount the retired public game-room listing, including on saved links.
  if(r.name==='rooms'){(globalThis.__LA3BAK_NAV__ || location).replace('#/social-rooms');return;}
  document.documentElement.classList.toggle('is-admin-ui',r.name==='admin');
  document.documentElement.classList.toggle('is-reference-profile',['profile','account'].includes(r.name));
  document.documentElement.classList.toggle('is-brand-site',!['room','city','game','play'].includes(r.name));
  // Keep current social/game voice surfaces stable on account updates.
  const keepLiveSocial = r.name==='social-room' && lastRouteKey==='social-room/'+r.a && lastSocialIdentity===S.user?.id && !isCommunityRestricted() && !!$('#view [data-lb-page="social"]');
  const keepGameVoice = r.name==='room' && gameVoiceUI?.code===r.a && gameVoiceUI.owner===S.user?.id && gameVoiceUI.root.isConnected && gameVoiceUI.protected===(isCommunityRestricted());
  if(!keepGameVoice) destroyGameVoiceUI();
  const keepLiveShell = keepLiveSocial || keepGameVoice || (r.name === 'room' && !!$('#view [data-lb-page="room"]'));
  if (!keepLiveShell) { unifiedMount?.destroy?.(); unifiedMount=null; }
  document.documentElement.classList.toggle('has-unified',UNIFIED.hasRoute(r.name));
  const key = r.name + '/' + r.a;
  const changed = key !== lastRouteKey;
  if(changed){SHOP.SH.preview=null;storePreviewOrigin=null;}
  if (changed) UNIFIED.resetDrawerState();
  lastRouteKey = key;
  if (changed) { roomRequestGeneration++; DMV.DM.pending = null; DMV.DM.busy = false; CRV.CR.busy = false; }
  if (changed) destroyMinaboliMount();
  if (changed) { cityAnimationGeneration++; CITY.CT.moving = false; if (CITY.CT.data) CITY.CT.shownPos = CITY.CT.data.pos; }
  if (changed) { functionalMount?.destroy?.(); functionalMount = null; }
  /* R55: «حفظ الغرفة» يخلي الغرفة والصوت شغالين وأنت تتصفح؛ تبديل الحساب أو القيود تطلعك دايمًا */
  if (!S.user || lastSocialIdentity!==S.user.id || isCommunityRestricted() || (!['social-room','room'].includes(r.name) && !SOCIAL.socialMinimized?.())) void leaveSocial();
  lastSocialIdentity = S.user?.id ?? null;
  document.documentElement.classList.toggle('is-home', r.name === 'home');
  document.documentElement.classList.toggle('is-profile-ui', ['profile','account','settings','wallet','shop','notifications','notifications-internal'].includes(r.name));
  if (changed) {
    roomUI.code = null;
    roomUI.key = '';
    roomUI.joining = false;
  }
  if (r.name !== 'room') document.documentElement.classList.remove('in-play');
  $$('.bnav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === NAV_OF[r.name]));
  const back = $('#back');
  if(back){back.hidden = r.name === 'home';back.dataset.href = BACK_OF(r);}
  const view = $('#view');
  if (changed && S.user && ['shop','notifications','notifications-internal'].includes(r.name)) void loadAcct();
  if (changed && S.user && UNIFIED.hasRoute(r.name) && !['home','shop','notifications','notifications-internal','wallet'].includes(r.name)) void loadAcct();

  const comOff = isCommunityRestricted();
  const navCom = $('.bnav a[data-nav="community"]'); if (navCom) navCom.hidden = comOff;
  if (comOff && ['community', 'post', 'u', 'notifications','social-rooms','social-room','family'].includes(r.name)) {
    unifiedPage(view, r.name, `<div class="card empty-state"><p>المجتمع مقفل على هذا الجهاز من إعدادات الأمان السابقة.</p><a class="btn" href="#/">الرئيسية</a></div>`, true);
    updateTop(); return;
  }
  switch (r.name) {
    case 'home':
      if (changed) {
        loadReferenceHome();
        if (S.user) loadAcct();
        if (!isCommunityRestricted()) loadHomePosts();
        if (S.user && S.helloDone && !SHOP.SH.loading) SHOP.load(req).then(() => { if (parseRoute().name === 'home') render(); });
      }
      unifiedPage(view,'home');
      if (S.user) import('../daily-streak-r62.js?v=r62o').then((M) => { if (parseRoute().name === 'home') M.mountDailyBanner(view, { req, after: (r) => { S.coins = r.coins; S.canClaim = false; if (SHOP.SH.data) { SHOP.SH.data.coins = r.coins; SHOP.SH.data.canDaily = false; } ACCT.me = null; SHOP.invalidateLedger?.(); } }); }).catch(() => {});
      if(openRoyalMenuOnHome){openRoyalMenuOnHome=false;view.querySelector('[data-lb-shell=menu]')?.click();}
      break;
    case 'events':
    case 'tournaments':
      unifiedPage(view,r.name,referenceInfoPage(r.name));
      break;
    case 'friends':
    case 'messages':
      unifiedPage(view,r.name);
      break;
    case 'auction':
    case 'family':
    case 'support':
    case 'contact':
    case 'missions':
    case 'visitors':
    case 'invite':
    case 'verification':
    case 'rank-rewards':
    case 'notifications-internal':
      functionalPage(view, r.name);
      break;
    case 'games':
      unifiedPage(view,'games',gamesView());
      applyGameFilter();
      break;
    case 'game':
      unifiedPage(view,'game',gameInfoView(r.a));
      break;
    case 'daily':
    case 'play':
    case 'challenge':
    case 'offline':
      if (changed) OFF.leave();
      unifiedPage(view,r.name,retiredGameHTML());
      break;
    case 'lobby':
      if (needUser('#/lobby')) return;
      if (changed) { LOB.L.me = null; LOB.load().then(() => { if (parseRoute().name === 'lobby') render(); }); }
      unifiedPage(view,'lobby',LOB.lobbyHTML({ nf, esc, avatar: LOB.L.me?.equipped?.avatar ? AVR.avatarArt(LOB.L.me.equipped.avatar.id, 54) : LOB.L.me?.avatar ? PF.photoHTML(54, LOB.L.me.avatar, S.user?.name) : PF.avatarHTML(PF.sanitize(PF.load()), 54) }));
      break;
    case 'hub':
      if (isRetiredGame(r.a)) { unifiedPage(view,'hub',retiredGameHTML()); break; }
      if (needUser('#/hub/' + r.a)) return;
      if (changed) loadOnline(r.a);
      unifiedPage(view,'hub',HUB.hubHTML(r.a, { nf, esc, coins: S.coins || 0, canClaim: !!S.canClaim }));
      if (HUB.MM.game === r.a && HUB.MM.seats) HUB.tickTimer();
      break;
    case 'ranks':
    case 'vip':
      if (!S.user) { (globalThis.__LA3BAK_NAV__ || location).replace('#/account'); return; }
      unifiedPage(view,r.name);
      break;
    case 'leaderboard':
      if (changed) loadBoard();
      unifiedPage(view,'leaderboard',boardView());
      break;
    case 'about':
      unifiedPage(view,r.name,aboutView());
      break;
    case 'privacy':
      unifiedPage(view,r.name,privacyView());
      break;
    case 'terms':
      unifiedPage(view,r.name,termsView());
      break;
    case 'agreement':
      unifiedPage(view,r.name,agreementView());
      break;
    case 'settings':
    case 'privacy-settings':
    case 'account-info':
    case 'devices':
    case 'hidden-posts':
      if (!S.user) { (globalThis.__LA3BAK_NAV__ || location).replace('#/account'); return; }
      S.pf.sec = 'settings';
      void settingsR60(view, r.name);
      break;
    case 'admin': {
      const identity=S.user?.id||'',existing=view.querySelector('#adminRoot');
      if(changed||!existing||existing.dataset.sessionIdentity!==identity) {view.innerHTML='<div id="adminRoot"></div>';const root=view.querySelector('#adminRoot');root.dataset.sessionIdentity=identity;import('../admin.js?v=r66a').then(m=>{if(root.isConnected&&parseRoute().name==='admin')m.mountAdmin(root);}).catch(()=>{if(root.isConnected)root.textContent='تعذّر تحميل الإدارة؛ حدّث الصفحة.';});}
      break;
    }
    case 'city':
      if (needUser('#/city')) return;
      // التحميل ينتظر اتصال الخادم (عند تحديث الصفحة على هذا الرابط الاتصال يجي بعد أول رسم)
      if (changed) { CITY.CT.sheet = null; CITY.CT.want = true; }
      if (CITY.CT.want && S.helloDone) { CITY.CT.want = false; CITY.load(req).then(() => { if (parseRoute().name === 'city') render(); }); }
      unifiedPage(view,'city',(CITY.CT.upgradeUncertain ? '<div class="notice" role="alert">رد الترقية السابقة ما تأكد. حدّث الحالة قبل أي ترقية ثانية. <button class="btn ghost sm" type="button" data-act="city-reload">تحديث مدينتي</button></div>' : '') + (CITY.CT.want && !CITY.CT.data ? '<div class="card empty-state"><p>جاري تحميل مدينتك…</p></div>' : CITY.cityHTML()));
      break;
    case 'rooms':
      (globalThis.__LA3BAK_NAV__ || location).replace('#/social-rooms');
      break;
    case 'social-rooms':
    case 'social-room':
      if (needUser((globalThis.__LA3BAK_NAV__ || location).hash)) return;
      if (!keepLiveSocial) unifiedPage(view,r.name);
      break;
    case 'community':
      if (changed) { COM.CM.menu = null; COM.CM.edit = null; COM.CM.report = null; if (S.user) COM.loadMe().then(updateTop); COM.loadFeed().then(() => { if (parseRoute().name === 'community') render(); }); }
      unifiedPage(view,'community',COM.communityHTML(!!S.user));
      break;
    case 'post':
      if (changed) { COM.CM.menu = null; COM.CM.edit = null; COM.CM.report = null; COM.CM.post.reply = null; COM.CM.post.data = null; COM.loadPost(r.a).then(() => { if (parseRoute().name === 'post') render(); }); }
      unifiedPage(view,'post',COM.postPageHTML(!!S.user));
      break;
    case 'u':
      if (changed || r.b !== (COM.CM.user.list?.which ?? '')) {
        COM.CM.menu = null; COM.CM.report = null; COM.CM.user.list = null;
        if (changed) { COM.CM.user.data = null; COM.loadUser(r.a).then(() => { if (parseRoute().name === 'u') render(); }); }
        if (r.b === 'followers' || r.b === 'following') COM.loadFollowList(r.a, r.b).then(() => { if (parseRoute().name === 'u') render(); });
      }
      unifiedPage(view,'u',COM.userPageHTML(!!S.user, (id) => gameInfo(id)?.name ?? id));
      break;
    case 'notifications':
      if (!S.user) { (globalThis.__LA3BAK_NAV__ || location).replace('#/account'); return; }
      unifiedPage(view,'notifications');
      break;
    case 'voice': case 'vroom':
      // الروابط القديمة تفتح القسم الاجتماعي المستقل، ولا تغيّر غرف الألعاب.
      (globalThis.__LA3BAK_NAV__ || location).replace('#/social-rooms');
      return;
    case 'shop':
      if (needUser('#/shop/'+r.a)) return;
      if (r.a === 'packs') { unifiedPage(view,'payments'); break; }
      if (changed && r.a === 'bg') SHOP.SH.tab = 'bg';
      if (changed && SHOP.SH.tab === 'gift') GIFT.loadList(req).then(() => { if (parseRoute().name === 'shop') render(); });
      if (changed) { SHOP.SH.confirm = null; SHOP.SH.want = true; }
      if (SHOP.SH.want && S.helloDone) { SHOP.SH.want = false; SHOP.load(req).then(() => { if (parseRoute().name === 'shop') render(); }); }
      const shopCtx = profileContext();
      if (SHOP.SH.data) shopCtx.me = {...shopCtx.me, coins:SHOP.SH.data.coins, gems:SHOP.SH.data.gems};
      unifiedPage(view,'shop',SHOP.SH.want && !SHOP.SH.data ? '<div class="card empty-state"><p>جاري تحميل المتجر…</p></div>' : SHOP.shopHTML());
      scheduleShopWallet();
      break;
    case 'payments':
      if (needUser((globalThis.__LA3BAK_NAV__ || location).hash)) return;
      unifiedPage(view,'payments'); firstTopupBanner(view);
      break;
    case 'wallet':
      if (changed && S.user) void loadAcct();
      unifiedPage(view,'wallet'); firstTopupBanner(view);
      break;
    case 'profile':
    case 'account':
      if (r.name === 'wallet') S.pf.sec = 'wallet';
      if (changed && S.user) loadAcct();
      if (S.user && !isCommunityRestricted() && r.a === 'gifts' && ['received','sent'].includes(r.b) && S.helloDone && (changed || PROFILE_GIFT_LOG.owner !== S.user.id)) void loadProfileGiftHistory();
      view.innerHTML = profileView();
      mountGoogle();
      break;
    case 'join': {
      if (needUser('#/join/' + r.a)) return;
      unifiedPage(view,'join',`<div class="card empty-state"><p>جاري الدخول للغرفة…</p></div>`);
      if (S.helloDone) {
        const owner=S.user?.id,generation=roomRequestGeneration;
        const res = await req('room:join', { code: r.a });
        if(owner!==S.user?.id||generation!==roomRequestGeneration||parseRoute().name!=='join'||parseRoute().a!==r.a)return;
        if (res.ok) {
          S.rooms.set(res.room.code, res.room);
          (globalThis.__LA3BAK_NAV__ || location).replace('#/room/' + res.room.code);
        } else {
          unifiedPage(view,'join',`<section class="card"><p role="alert">${esc(res.error)}</p>${joinFormHTML()}</section>`);const input=view.querySelector('[name=code]');if(input)input.value=r.a;
        }
      }
      break;
    }
    case 'room':
      if (needUser('#/room/' + r.a)) return;
      renderRoom(r.a, changed);
      break;
    default:
      document.documentElement.classList.add('has-unified');
      unifiedPage(view,'not-found','<section class="card empty-state"><h1>الصفحة مب موجودة</h1><a class="btn" href="#/">الرجوع للرئيسية</a></section>');
  }
  updateTop();
  CHAT.sync(null, S.user?.id);
  if (r.name !== 'room' && GIFT.G.open) GIFT.closeRoom();
  FS.sync(r.name === 'room' && gameVoiceUI?.mode==='game' && S.rooms.get(r.a)?.status === 'playing' && !isRetiredGame(S.rooms.get(r.a)?.gameId));
  if (r.name!=='admin' && !UNIFIED.hasRoute(r.name) && ((FOOTED.has(r.name) && !['profile','account','shop','notifications','notifications-internal'].includes(r.name)) || ['events','tournaments','support','contact'].includes(r.name))) view.insertAdjacentHTML('beforeend', `<div class="lb-unified lb-standalone-footer">${REF.footerHTML(referenceContext())}</div>`);
  if(r.name!=='admin'&&!UNIFIED.hasRoute(r.name))REF.mountHome(view, referenceContext());
  if (!UNIFIED.hasRoute(r.name) && ['profile','account','settings','wallet','shop','notifications','notifications-internal'].includes(r.name)) PR.mountProfile(view, profileContext());
  document.body.dataset.page = r.name;
  globalSearch.checkScope();
  if (changed) {
    // R51: عند الرجوع للصفحة السابقة نرجّع موضع التمرير المحفوظ بسجل التنقل، وإلا نبدأ من أعلى الصفحة
    const savedY = globalThis.__LA3BAK_NAV__?.takeScroll?.();
    if (typeof savedY === 'number' && savedY > 0) restoreScroll(savedY); else window.scrollTo(0, 0);
    if (r.name !== 'room') view.focus({ preventScroll: true });
  }
}
/* المحتوى قد يكتمل بعد التحميل من الخادم، فنعيد المحاولة لين توصل الصفحة للطول المطلوب (حد أقصى ثانيتين)، ونوقف لو المستخدم بدأ يمرر بنفسه */
let scrollRestoreGeneration = 0;
function restoreScroll(y) {
  const gen = ++scrollRestoreGeneration; const until = Date.now() + 2000; let stopped = false;
  const stop = () => { stopped = true; };
  const opts = { passive: true, once: true };
  window.addEventListener('wheel', stop, opts); window.addEventListener('touchstart', stop, opts); window.addEventListener('keydown', stop, opts);
  const step = () => {
    if (stopped || gen !== scrollRestoreGeneration) return;
    window.scrollTo(0, y);
    if (Math.abs(window.scrollY - y) > 2 && Date.now() < until) requestAnimationFrame(step);
  };
  step();
}

/* ---------------- الصفحات ---------------- */
const playersText = (g) => `${g.minPlayers} إلى ${g.maxPlayers} لاعبين`;

/* أيقونات SVG لألعاب رمزها النصي قد لا يظهر على كل الأجهزة (رموز الدومينو خارج مجموعة الإيموجي) */
const ICON_SVG = {
  uno: '<svg viewBox="0 0 40 40" width="1em" height="1em" aria-hidden="true"><rect x="5" y="7" width="18" height="27" rx="3.5" fill="#1e88e5" stroke="#fff" stroke-width="2" transform="rotate(-14 14 20)"/><rect x="16" y="5" width="18" height="27" rx="3.5" fill="#e53935" stroke="#fff" stroke-width="2" transform="rotate(10 25 18)"/><ellipse cx="25" cy="18" rx="6" ry="9" fill="#fff" transform="rotate(38 25 18)"/><text x="25" y="22" text-anchor="middle" font-size="11" font-weight="900" fill="#e53935" style="direction:ltr">7</text></svg>',
  carrom: '<svg viewBox="0 0 40 40" width="1em" height="1em" aria-hidden="true"><rect x="3" y="3" width="34" height="34" rx="5" fill="#6a3412"/><rect x="6.5" y="6.5" width="27" height="27" fill="#efd29a"/><circle cx="9" cy="9" r="2.6" fill="#2a1608"/><circle cx="31" cy="9" r="2.6" fill="#2a1608"/><circle cx="9" cy="31" r="2.6" fill="#2a1608"/><circle cx="31" cy="31" r="2.6" fill="#2a1608"/><circle cx="20" cy="20" r="3" fill="#d3202a"/><circle cx="15" cy="18" r="2.6" fill="#fff8e8" stroke="#a88" stroke-width=".5"/><circle cx="25" cy="18" r="2.6" fill="#222"/><circle cx="20" cy="25" r="2.6" fill="#fff8e8" stroke="#a88" stroke-width=".5"/><circle cx="20" cy="30" r="3.4" fill="#cfe7f7" stroke="#2a6fa8"/></svg>',
  domino: '<svg viewBox="0 0 40 40" width="1em" height="1em" aria-hidden="true"><g transform="rotate(-14 20 20)"><rect x="11" y="3" width="18" height="34" rx="4" fill="#fcf9f4" stroke="#3a2a18" stroke-width="2"/><path d="M13 20h14" stroke="#3a2a18" stroke-width="1.6"/><g fill="#1b1b1b"><circle cx="16" cy="8.5" r="1.9"/><circle cx="24" cy="15" r="1.9"/><circle cx="20" cy="11.8" r="1.9"/><circle cx="16" cy="25" r="1.9"/><circle cx="24" cy="25" r="1.9"/><circle cx="16" cy="32" r="1.9"/><circle cx="24" cy="32" r="1.9"/></g></g></svg>',
};
const gameIco = (g) => g.id === 'minaboli' ? '<img src="/preview/assets/game-minaboli-3d-r49.webp" alt="" width="64" height="44" decoding="async" style="width:100%;height:100%;object-fit:contain">' : ICON_SVG[g.id] ?? esc(g.icon);
function gameCardHTML(g, full) {
  const live = g.status === 'available';
  return `<article class="card game-card ${live ? '' : 'soon-card'}" data-bots="${g.supportsBots ? 1 : 0}" data-rooms="${g.maxPlayers >= 2 ? 1 : 0}" data-cats="${uiCat(g)}">
    <div class="game-head">
      <div class="game-ico" aria-hidden="true">${gameIco(g)}</div>
      <div style="min-width:0">
        <h3>${esc(g.name)}</h3>
        <span class="badge ${live ? 'live' : 'soon'}">${live ? 'متاحة الآن' : 'قريباً'}</span>
      </div>
    </div>
    <p class="muted">${esc(live ? g.description : g.tagline)}</p>
    <div class="meta">
      <span class="badge">${esc(playersText(g))}</span>
      ${live ? '<span class="badge">مع الأصدقاء</span>' : ''}
      ${live && g.supportsBots ? '<span class="badge">مع الكمبيوتر</span>' : ''}
    </div>
    ${full && live ? `<p class="small muted">${esc(g.idea)}</p>` : ''}
    ${
      live
        ? `<a class="btn block" href="#/game/${esc(g.id)}">ادخل الغرف والعب</a>`
        : `<button class="btn ghost block" disabled>قريباً</button>`
    }
  </article>`;
}

function statusStrip() {
  const live = S.games.filter((g) => g.status === 'available').length;
  const soon = S.games.length - live;
  return `<div class="strip"><span class="badge live">متاحة الآن ${live}</span>${soon ? `<span class="badge soon">قريباً ${soon}</span>` : ''}</div>`;
}

/* ---------------- الرئيسية ----------------
 * كل قسم مستقل: لو فشل رسمه يطلع مكانه تنبيه صغير وما تنكسر الصفحة. كل الأرقام من الخادم (الرصيد، المنشورات، المتجر) أو حالة فاضية صادقة. */
const HOME_FEATURED = [
  { id: 'uno', href: '#/game/uno', tag: 'ألوان وأرقام وتخطيط', bg: 'linear-gradient(135deg,#e53935,#f2b705)' },
  { id: 'domino', href: '#/game/domino', tag: 'كلاسيكية المجالس', bg: 'linear-gradient(135deg,#17908a,#0b5a5c)' },
  { id: 'carrom', href: '#/game/carrom', tag: 'صوّب ودخّل القطع', bg: 'linear-gradient(135deg,#a0612a,#4a2208)' },
  { id: 'ludo', href: '#/hub/ludo', tag: 'أونلاين أو ضد الكمبيوتر', bg: 'linear-gradient(135deg,#2e9d4a,#1e78d6)' },
  { id: 'jackaro', href: '#/hub/jackaro', tag: 'الورق والكرات', bg: 'linear-gradient(135deg,#8d6bff,#4a2a9a)' },
  { id: 'baloot', href: '#/hub/baloot', tag: 'صن وحكم بفريقين', bg: 'linear-gradient(135deg,#c97a3a,#6a2c00)' },
];
function homeSafe(name, fn) {
  try { return fn(); } catch (e) { console.error('home section', name, e); return `<section class="card home-fail" role="status"><p>تعذّر عرض هذا القسم الحين.</p></section>`; }
}
function homeWelcome() {
  const me = ACCT.me;
  if (!S.user) return `<section class="hm-hero"><div class="hm-hero-in"><p class="hm-kick" dir="ltr">LA3BAK</p><h1 class="hm-title">لعبك، جمعتكم تبدأ هنا!</h1><p class="hm-lead">ألعاب عربية جماعية من جوالك: أونو ودومينو ولودو وجاكارو وبلوت، ومجتمع تشارك فيه لحظاتك.</p>
    <div class="hm-ctas"><a class="btn" href="#/account">ابدأ اللعب</a><a class="btn ghost" href="#/games">اكتشف الألعاب</a><a class="btn ghost" href="#/community">استكشف المجتمع</a></div></div></section>`;
  const face = me?.equipped?.avatar ? AVR.avatarArt(me.equipped.avatar.id, 56) : PF.avatarHTML(PF.sanitize(PF.load()), 56);
  return `<section class="hm-hero signed"><div class="hm-me"><a class="hm-face" href="#/account" aria-label="حسابي">${face}</a><div><p class="hm-hi">أهلاً ${esc(S.user.name)} 👋</p><p class="hm-sub">${me ? `المستوى ${nf(me.level)} · ${nf(me.wins)} فوز من ${nf(me.played)} مباراة` : ACCT.err ? 'تعذّر تحميل بيانات حسابك.' : 'جاري تحميل حسابك…'}</p></div></div>
    <div class="hm-ctas"><a class="btn" href="#/lobby">ابدأ اللعب</a><a class="btn ghost" href="#/games">اكتشف الألعاب</a><a class="btn ghost" href="#/community">استكشف المجتمع</a></div></section>`;
}
function homeFeatured() {
  const live = S.games.filter((g) => g.status === 'available');
  const list = HOME_FEATURED.map((f) => ({ ...f, g: live.find((g) => g.id === f.id) })).filter((f) => f.g);
  if (!list.length) return S.games.length ? '' : `<section class="hm-sec"><h2 class="hm-h">ألعاب مميزة</h2>${COM.skeleton(1)}</section>`;
  return `<section class="hm-sec" aria-labelledby="hmFeat"><div class="hm-hrow"><h2 class="hm-h" id="hmFeat">ألعاب مميزة</h2><a class="hm-all" href="#/games">كل الألعاب</a></div>
    <div class="hm-feat">${list.map((f) => `<a class="hm-fg" href="${f.href}" style="--fbg:${f.bg}"><span class="hm-fi" aria-hidden="true">${gameIco(f.g)}</span><b>${esc(f.g.name)}</b><small>${esc(f.tag)}</small><span class="hm-play">العب</span></a>`).join('')}</div></section>`;
}
function homeBrowse() {
  const live = S.games.filter((g) => g.status === 'available');
  if (!live.length) return '';
  const cats = UI_CATS.map((c) => ({ ...c, n: live.filter((g) => uiCat(g) === c.id).length + (c.id === 'solo' ? 2 : 0) })).filter((c) => c.n > 0); // + مدينتي + بناء البرج
  return `<section class="hm-sec" aria-labelledby="hmBrowse"><h2 class="hm-h" id="hmBrowse">تصفّح الألعاب</h2>
    <form class="hm-search" data-form="home-search" role="search"><label class="sr" for="hmQ">ابحث عن لعبة</label><input class="input" id="hmQ" name="q" type="search" placeholder="🔎 ابحث باسم اللعبة" autocomplete="off"><button class="btn sm" type="submit">بحث</button></form>
    <div class="hm-cats">${cats.map((c) => `<button type="button" class="hm-cat" data-act="home-cat" data-c="${c.id}"><span aria-hidden="true">${c.icon}</span><b>${c.label}</b><small>${nf(c.n)}</small></button>`).join('')}</div></section>`;
}
function homePosts() {
  const P = HOMEP;
  let body;
  if (P.posts === null) body = P.err ? `<div class="card empty-state"><p>${esc(P.err)}</p><button class="btn sm" type="button" data-act="home-posts">إعادة المحاولة</button></div>` : COM.skeleton(1);
  else if (!P.posts.length) body = `<div class="card empty-state"><p>ما فيه منشورات بعد. كن أول من يشارك! ✨</p><a class="btn sm" href="#/community">اكتب منشور</a></div>`;
  else body = `<div class="hm-posts">${P.posts.map((p) => `<a class="card hm-post" href="#/post/${p.id}">${COM.faceOf(p.author, 36)}<div class="hm-pb"><b>${esc(p.author.name)}</b>${p.text ? `<p>${esc(p.text)}</p>` : ''}${p.media ? `<img src="${esc(p.media)}" alt="" loading="lazy" decoding="async">` : ''}<small><span aria-label="إعجابات">❤ ${nf(p.likes)}</span><span aria-label="تعليقات">💬 ${nf(p.comments)}</span><span>${esc(COM.ago(p.at))}</span></small></div></a>`).join('')}</div>`;
  return `<section class="hm-sec" aria-labelledby="hmPosts"><div class="hm-hrow"><h2 class="hm-h" id="hmPosts">من المجتمع</h2><a class="hm-all" href="#/community">كل المنشورات</a></div>${body}</section>`;
}
function homeStore() {
  if (!S.user) return `<section class="card hm-store"><div class="hm-hrow"><h2 class="hm-h">المتجر والعملات</h2></div><p class="muted">سجّل دخولك عشان تشوف رصيدك وتزيّن ملفك بالإطارات والأفاتارات.</p><a class="btn sm" href="#/account">تسجيل الدخول</a></section>`;
  const d = SHOP.SH.data;
  const items = d ? d.items.filter((i) => !i.retired && !d.owned.includes(i.id)).slice(0, 4) : null;
  const CUR = { coins: '🪙', gems: '💎' };
  const grid = items === null ? (SHOP.SH.err ? `<p class="muted">${esc(SHOP.SH.err)}</p>` : COM.skeleton(1)) : items.length ? `<div class="hm-items">${items.map((i) => `<a class="hm-item" href="#/shop" aria-label="${esc(i.name)} بـ ${nf(i.price)}"><span class="sh-prev sh-${esc(i.slot)}-${esc(i.css ?? '')}" aria-hidden="true">${i.icon}</span><b>${esc(i.name)}</b><small>${CUR[i.currency] ?? '🪙'} ${nf(i.price)}</small></a>`).join('')}</div>` : '<p class="muted">تملك كل المعروض حالياً 👏</p>';
  return `<section class="card hm-store" aria-labelledby="hmStore"><div class="hm-hrow"><h2 class="hm-h" id="hmStore">المتجر والعملات</h2><a class="hm-all" href="#/shop">افتح المتجر</a></div>
    <p class="hm-bal"><span>رصيدك</span><b>🪙 ${nf(S.coins ?? 0)}</b></p>
    ${(S.coins ?? 0) === 0 ? '<p class="muted">رصيدك صفر. العملات تجيك من المكافأة اليومية والمباريات.</p>' : ''}
    ${grid}<p class="hm-fine">الشراء من صفحة المتجر بعد التأكيد فقط. العملات افتراضية بدون قيمة مالية.</p></section>`;
}
function homeDaily() {
  const d = MIS.daily();
  return `<div class="hm-two"><a class="daily-card" href="#/daily"><span aria-hidden="true">🔥</span><div><b>تحدي اليوم</b><small>${d.doneToday ? `خلصته! سلسلتك ${nf(d.live)} — تعال بكرة` : d.live ? `حافظ على سلسلتك: ${nf(d.live)} يوم` : 'خمس أسئلة جديدة كل يوم'}</small></div></a>
    <a class="daily-card lb" href="#/leaderboard"><span aria-hidden="true">🏆</span><div><b>الصدارة</b><small>ترتيب اللاعبين من نتائج المباريات</small></div></a></div>`;
}

async function loadHomePosts() {
  if (HOMEP.loading) return; HOMEP.loading = true; HOMEP.err = '';
  const r = await COM.api('feed?limit=3');
  HOMEP.loading = false;
  if (r.ok) HOMEP.posts = r.posts; else { HOMEP.err = r.error; HOMEP.posts = null; }
  if (parseRoute().name === 'home') render();
}

const FOOTED = new Set(['daily', 'home', 'games', 'profile', 'leaderboard', 'about', 'privacy', 'admin', 'play']);
const nf = (n) => new Intl.NumberFormat('ar-EG-u-nu-latn').format(n);

function dailyView() {
  const d = MIS.daily();
  const err = OFF.O.error ? `<div class="notice bad">${esc(OFF.O.error)}</div>` : '';
  return `<div class="stack"><h1 class="section-title" style="margin-top:0">تحدي اليوم</h1>${err}
    <section class="card streak"><span aria-hidden="true" style="font-size:40px">🔥</span><b>${d.live}</b><span>${d.live === 1 ? 'يوم متتالي' : 'أيام متتالية'}${d.best ? ` — أفضل سلسلة ${nf(d.best)}` : ''}</span>
      <p class="muted">${d.doneToday ? `خلصت تحدي اليوم (${nf(d.ok)} من ${nf(d.total)}). تعال بكرة بأسئلة جديدة.` : 'خمس أسئلة جديدة لكل الناس، مرة وحدة باليوم. حافظ على سلسلتك!'}</p>
      ${d.doneToday ? '' : '<button class="btn block" type="button" data-act="daily-start">ابدأ التحدي</button>'}</section>
    ${MIS.missionsHTML()}</div>`;
}

async function loadOnline(game) {
  try {
    const r = await fetch('/api/online?game=' + encodeURIComponent(game), { cache: 'no-store' });
    if (r.ok) HUB.MM.online = await r.json();
  } catch { HUB.MM.online = null; }
  const cur = parseRoute();
  if (cur.name === 'hub' && !HUB.MM.seats) render();
}

function challengeView(r) {
  const seed = /^[a-z0-9]{4,12}$/.test(r.a) ? r.a : '';
  if (!seed) return `<div class="card empty-state"><p>رابط التحدي غير صحيح.</p><a class="btn" href="#/play">رجوع</a></div>`;
  const err = OFF.O.error ? `<div class="notice bad">${esc(OFF.O.error)}</div>` : '';
  const from = r.b ? esc(r.b.slice(0, 14)) : 'صديقك';
  const sc = /^\d{1,2}$/.test(r.c) ? Number(r.c) : null;
  return `<div class="stack"><section class="card" style="text-align:center"><span aria-hidden="true" style="font-size:48px">⚔️</span>
    <h1 class="section-title" style="margin:6px 0">${from} يتحداك!</h1>
    <p class="muted">${sc === null ? 'خمس أسئلة، نفس الأسئلة عند الكل.' : `${from} جاب ${nf(sc)} من 5. تقدر تغلبه؟`}</p>${err}
    <button class="btn block" type="button" data-act="challenge-accept" data-seed="${seed}" data-from="${esc(r.b)}" data-sc="${sc ?? ''}">اقبل التحدي</button></section></div>`;
}

function seasonBanner() {
  const s = SEASON.season();
  return s ? `<section class="card season"><span aria-hidden="true" style="font-size:36px">${s.emoji}</span><div><b>${esc(s.title)}</b><small>${esc(s.text)}</small></div><button class="btn sm" type="button" data-act="season-play" data-kind="${s.kind}">العب</button></section>` : '';
}

function playView() {
  return `<div class="stack">
    <h1 class="section-title" style="margin-top:0">كيف تبي تلعب؟</h1>
    <div class="mode-split">
      <a class="mode-card" href="#/offline"><span class="ic" aria-hidden="true">📴</span><b>أوفلاين</b><small>نفس الجهاز، تمررون الجوال بالدور. أفراد أو فرق.</small></a>
      <a class="mode-card" href="#/social-rooms"><span class="ic" aria-hidden="true">🌐</span><b>أونلاين</b><small>كل واحد من جواله: أنشئ غرفة وأرسل الرمز.</small></a>
    </div>
    <button class="mode-card" type="button" data-act="challenge-new" style="width:100%"><span class="ic" aria-hidden="true">⚔️</span><b>تحدّى صديق</b><small>تحل 5 أسئلة وترسل له رابط: يحل نفس الأسئلة ونقارن.</small></button>
    <button class="play-now" type="button" data-act="quick-play"><b>العب الآن — 5 أسئلة عشوائية</b><small>بدون إعداد — جواب سريع وممتع</small></button>
  </div>`;
}

/* الصدارة الأسبوعية: كل الأرقام من الخادم، وإذا ما فيه لاعبين نقول هذا بصراحة */
const BOARD = { data: null, err: '', loading: false };
async function loadBoard() {
  BOARD.loading = true; BOARD.err = '';
  try {
    const r = await fetch('/api/leaderboard', { cache: 'no-store' });
    if (!r.ok) throw new Error('bad');
    BOARD.data = await r.json();
  } catch {
    BOARD.err = 'ما قدرنا نحمّل الصدارة. تأكد من الاتصال.';
  }
  BOARD.loading = false;
  if (parseRoute().name === 'leaderboard') render();
}
function boardView() {
  const d = BOARD.data;
  const days = d ? Math.max(0, Math.ceil((d.resetsAt - Date.now()) / 86400000)) : 0;
  const row = (r) => `<div class="lb-row ${r.me ? 'me' : ''}"><span class="lb-rank">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : nf(r.rank)}</span><span class="lb-pic" aria-hidden="true">${AVR.mini(r.av, 34) || esc([...r.name][0] ?? '?')}</span><div><b>${esc(r.name)}${r.me ? ' (أنت)' : ''}</b><small>${nf(r.wins)} فوز من ${nf(r.games)} لعبة</small></div><span class="lb-pts">${nf(r.points)}</span></div>`;
  let body;
  if (BOARD.err) body = `<div class="notice bad">${esc(BOARD.err)}</div>`;
  else if (!d) body = `<div class="card empty-state"><p>جاري التحميل…</p></div>`;
  else if (!d.list.length) body = `<div class="card empty-state board-empty"><span class="es-ic" aria-hidden="true">🏆</span><p>ما فيه أحد في صدارة هالأسبوع للحين. العب مع أصحابك في غرفة (لاعبين حقيقيين أو أكثر) وتبدأ النقاط تنحسب.</p><a class="btn" href="#/social-rooms">افتح الغرف</a></div>`;
  else body = `<div class="stack" style="gap:8px">${d.list.map(row).join('')}${d.mine && d.mine.rank > d.list.length ? `<p class="hint">ترتيبك:</p>${row(d.mine)}` : ''}</div>`;
  return `<div class="stack"><h1 class="section-title" style="margin-top:0">الصدارة الأسبوعية</h1>
    <p class="lead small" style="margin-top:-6px">${d ? `تتصفّر كل سبت — باقي ${days === 0 ? 'أقل من يوم' : days === 1 ? 'يوم' : days + ' أيام'}. ` : ''}النقاط: 10 لكل لعبة و20 زيادة على الفوز، من ألعاب الغرف اللي فيها لاعبين حقيقيين فقط (الكمبيوتر واللعب لوحدك ما يحسبون).</p>
    ${body}</div>`;
}

function aboutView() {
  return `<div class="stack"><h1 class="section-title" style="margin-top:0">عن الموقع</h1>
    <section class="card"><p>«لعبك» منصة ألعاب عربية: تلعب مع أصحابك في غرفة من جوالاتكم، أو مع الكمبيوتر، أو كلكم على جوال واحد بدون إنترنت. ${nf(S.games.length)} لعبة بينها ألعاب أطفال مرتبة حسب العمر.</p>
    <p class="muted">ما فيه حسابات ولا كلمات سر، واللعب كله بالعربي من اليمين لليسار.</p></section></div>`;
}
/* صفحات قانونية: نص صادق يوصف الموجود فعلاً، ومسودة تحتاج مراجعة قانونية قبل الإطلاق التجاري */
const DRAFT_NOTE = '<p class="notice">مسودة تصف عمل الموقع الحالي فعلياً، وتحتاج مراجعة محامٍ قبل الإطلاق التجاري.</p>';
function termsView() {
  return `<div class="stack"><h1 class="section-title" style="margin-top:0">شروط الاستخدام</h1>${DRAFT_NOTE}
    <section class="card"><ul class="steps">
    <li><span>«لعبك» منصة ألعاب للتسلية. الدخول مجاني وما نطلب كلمة سر.</span></li>
    <li><span>العملات 🪙 والهدايا افتراضية داخل اللعبة فقط: ما تُشترى بمال حقيقي حالياً، وما تنسحب ولا تتحول لمال، وما لها قيمة خارج الموقع.</span></li>
    <li><span>الهدية تنقسم: 50% لمستلمها كعملات افتراضية و50% حصة تشغيل للمنصة (افتراضية أيضاً، ما هي إيراد نقدي).</span></li>
    <li><span>المظاهر (أفاتارات، إطارات، خلفيات، ألقاب، شارات) شكلية وما تعطي أفضلية باللعب. المشتريات دائمة ما لم يُوقف الحساب لمخالفة.</span></li>
    <li><span>ممنوع: الغش أو استغلال الأخطاء، انتحال شخصية، الإساءة أو المحتوى غير اللائق بالمجتمع، فتح حسابات للتحايل على الحظر.</span></li>
    <li><span>للإدارة حق إيقاف حساب أو حذف محتوى مخالف، وكل إجراء إداري مسجّل.</span></li>
    <li><span>الخدمة تُقدَّم «كما هي»، وقد تتوقف ميزات أو تتغير بعد إشعار داخل الموقع.</span></li>
    </ul></section><a class="btn ghost block" href="#/settings">رجوع للإعدادات</a></div>`;
}
function agreementView() {
  return `<div class="stack"><h1 class="section-title" style="margin-top:0">اتفاقية المستخدم</h1>${DRAFT_NOTE}
    <section class="card"><ul class="steps">
    <li><span>باستخدامك الموقع توافق على <a href="#/terms">شروط الاستخدام</a> و<a href="#/privacy">سياسة الخصوصية</a>.</span></li>
    <li><span>أنت مسؤول عن اسمك وما تنشره بالمجتمع، ويظهر للكل مع أفاتارك المجهّز ومستواك.</span></li>
    <li><span>حسابك كضيف مرتبط بهذا المتصفح؛ لو مسحت بيانات المتصفح بدون ربط Google ممكن تفقد الوصول له.</span></li>
    <li><span>تقدر تطلب حذف بياناتك عن طريق الإدارة.</span></li>
    </ul></section><a class="btn ghost block" href="#/settings">رجوع للإعدادات</a></div>`;
}
function privacyView() {
  return `<div class="stack"><h1 class="section-title" style="margin-top:0">سياسة الخصوصية</h1>
    <section class="card"><ul class="steps"><li><span>ما نطلب بريد ولا رقم جوال ولا كلمة سر. نحفظ اسمك في ملف تعريف (cookie) عشان تكمل لعبك.</span></li>
    <li><span>شخصيتك وإحصائياتك وإنجازاتك ومظهرك وإعداداتك محفوظة على جهازك فقط.</span></li>
    <li><span>تسجيل الدخول بـ Google اختياري: نتحقق من هويتك عند Google ونحفظ معرّفاً داخلياً ثابتاً لربط حسابك فقط، وما نحفظ بريدك ولا صورتك من Google. صورتك التي ترفعها تنحفظ على خادمنا مربوطة بحسابك.</span></li>
    <li><span>الغرف تنحذف تلقائياً إذا خملت. اسمك يشوفه أعضاء غرفتك.</span></li>
    <li><span>المجتمع عام: منشوراتك وتعليقاتك واسمك وأفاتارك المجهّز ومستواك وعدد مبارياتك يشوفها الكل. صورتك الشخصية المرفوعة ما تظهر بالمجتمع، ورصيدك ما يظهر لأحد. الصور اللي تنشرها تتصغّر بجهازك قبل الرفع (فتنشال منها بيانات الموقع والكاميرا). تقدر تحذف منشوراتك وتعليقاتك بأي وقت، وتنحذف معها الصورة.</span></li>
    <li><span>الصدارة الأسبوعية تحفظ اسمك ونقاطك للأسبوع الحالي وتنحذف بعد عدة أسابيع.</span></li>
    </ul></section></div>`;
}

/* تصنيف صفحة الألعاب (عرض فقط): تعيين يدوي لكل لعبة موجودة، وللألعاب الجديدة نستنتج من تصنيف المحرك */
const UI_CATS = [
  { id: 'party', label: 'جماعية', icon: '🎉' },
  { id: 'quick', label: 'تحدي سريع', icon: '⚡' },
  { id: 'brain', label: 'ذكاء وتفكير', icon: '🧠' },
  { id: 'quiz', label: 'مسابقات وأسئلة', icon: '❓' },
  { id: 'solo', label: 'فردية', icon: '🎯' },
];
const UI_OF = {
  jackaro: 'party', ludo: 'party', baloot: 'party', domino: 'party', uno: 'party', carrom: 'party', codewords: 'party',
};
function uiCat(g) {
  if (UI_OF[g.id]) return UI_OF[g.id];
  const c = g.categories || [];
  if (g.maxPlayers === 1) return 'solo';
  if (c.includes('trivia')) return 'quiz';
  if (c.includes('duel')) return 'quick';
  if (c.includes('kids')) return 'brain';
  return 'party';
}
/* مختارات يدوية (مو ترتيب حسب اللعب: ما عندنا أرقام استخدام) */
const FEATURED = ['uno', 'domino', 'carrom', 'jackaro', 'ludo', 'baloot'];

function gamesView() {
  const live = visibleGameCatalogue(S.games).filter((g) => g.status === 'available');
  const soon = visibleGameCatalogue(S.games).filter((g) => g.status !== 'available');
  const count = (id) => live.filter((g) => uiCat(g) === id).length;
  const chip = (id, label, n) => `<button class="chip-btn ${S.fCat === id ? 'on' : ''}" type="button" data-act="filter" data-k="cat" data-f="${id}" aria-pressed="${S.fCat === id}">${label}<small>${n}</small></button>`;
  const sections = UI_CATS.map((c) => {
    const ord = (g) => { const i = Object.keys(UI_OF).indexOf(g.id); return i < 0 ? 999 : i; };
    const cards = live.filter((g) => uiCat(g) === c.id).sort((x, y) => ord(x) - ord(y)).map((g) => gameCardHTML(g, true));
    return cards.length ? `<section class="gcat" data-cat="${c.id}" aria-label="${c.label}"><h2 class="gcat-h"><span aria-hidden="true">${c.icon}</span>${c.label}<small>${cards.length}</small></h2><div class="grid two">${cards.join('')}</div></section>` : '';
  }).join('');
  const feat = FEATURED.map((id) => live.find((g) => g.id === id)).filter(Boolean);
  return `<div class="stack">
    <h1 class="section-title" style="margin-top:0">الألعاب</h1>
    ${statusStrip()}
    <input class="input" id="gq" type="search" inputmode="search" placeholder="🔎 ابحث باسم اللعبة" aria-label="بحث باسم اللعبة" autocomplete="off" value="${esc(S.fQ || '')}">
    <div class="chips filters scroll-row" role="group" aria-label="تصنيفات الألعاب">
      ${chip('all', 'جميع الألعاب', live.length)}
      ${UI_CATS.filter((c) => count(c.id) > 0).map((c) => chip(c.id, `${c.icon} ${c.label}`, count(c.id))).join('')}
    </div>
    <div class="chips filters scroll-row" role="group" aria-label="طريقة اللعب">
      <button class="chip-btn ${S.fMode === 'all' ? 'on' : ''}" type="button" data-act="filter" data-k="mode" data-f="all" aria-pressed="${S.fMode === 'all'}">أي طريقة</button>
      <button class="chip-btn ${S.fMode === 'bots' ? 'on' : ''}" type="button" data-act="filter" data-k="mode" data-f="bots" aria-pressed="${S.fMode === 'bots'}">مع الكمبيوتر</button>
      <button class="chip-btn ${S.fMode === 'friends' ? 'on' : ''}" type="button" data-act="filter" data-k="mode" data-f="friends" aria-pressed="${S.fMode === 'friends'}">مع الأصدقاء</button>
    </div>
    ${feat.length ? `<section class="featured" id="featured" aria-label="ألعاب مميزة"><h2 class="gcat-h"><span aria-hidden="true">⭐</span>ألعاب مميزة<small>اختيارنا</small></h2>
      <div class="feat-row">${feat.map((g) => `<a class="feat" href="#/game/${esc(g.id)}"><span aria-hidden="true">${gameIco(g)}</span><b>${esc(g.name)}</b><small>${esc(playersText(g))}</small></a>`).join('')}</div></section>` : ''}
    <p class="hint" id="noMatch" hidden>ما فيه ألعاب بهالتصفية.</p>
    <div id="liveGames" class="stack">${sections}</div>
    ${soon.length ? `<h2 class="section-title">قريباً</h2><p class="lead small" style="margin-top:-8px">ما تنفتح غرفها إلا لما تكتمل وتنختبر.</p><div class="grid two">${soon.map((g) => gameCardHTML(g, false)).join('')}</div>` : ''}
  </div>`;
}

/* يطبّق التصنيف وطريقة اللعب على البطاقات ويخفي الأقسام الفاضية */
function applyGameFilter() {
  let shown = 0;
  $$('#liveGames .game-card').forEach((c) => {
    const okCat = S.fCat === 'all' || c.dataset.cats === S.fCat;
    const okMode = S.fMode === 'all' || (S.fMode === 'bots' ? c.dataset.bots === '1' : c.dataset.rooms === '1');
    const okQ = !S.fQ || (c.querySelector('h3')?.textContent || '').includes(S.fQ.trim());
    c.hidden = !(okCat && okMode && okQ);
    if (!c.hidden) shown++;
  });
  $$('#liveGames .gcat').forEach((sec) => { sec.hidden = !sec.querySelector('.game-card:not([hidden])'); });
  const f = $('#featured');
  if (f) f.hidden = S.fCat !== 'all' || S.fMode !== 'all' || !!S.fQ;
  const nm = $('#noMatch');
  if (nm) nm.hidden = shown > 0;
}

function createFormHTML(g) {
  const seats = Array.from({ length: g.maxPlayers - g.minPlayers + 1 }, (_, i) => g.minPlayers + i)
    .map((n) => `<option value="${n}" ${n === g.defaultSeats ? 'selected' : ''}>${n === 1 ? 'لاعب واحد (تدريب)' : n + ' مقاعد'}</option>`)
    .join('');
  return `<form class="form" data-form="create" data-game="${esc(g.id)}">
    <div class="field">
      <span class="lab">مع مين تلعب؟</span>
      <div class="seg">
        <input type="radio" name="mode" id="m-friends" value="friends" checked>
        <label for="m-friends">مع الأصدقاء<small>لاعبين حقيقيين بالرمز</small></label>
        <input type="radio" name="mode" id="m-bots" value="bots" ${g.supportsBots ? '' : 'disabled'}>
        <label for="m-bots">مع الكمبيوتر<small>تبدأ بدون انتظار</small></label>
      </div>
    </div>
    <div class="field">
      <label for="seats">عدد المقاعد</label>
      <select class="select" id="seats" name="seats">${seats}</select>
    </div>
    <div class="field"><label for="gamePrivacy">خصوصية اللعبة</label><select class="select" id="gamePrivacy" name="visibility"><option value="code">بالرمز</option><option value="private">خاصة بكلمة مرور</option></select></div>
    <div class="field"><label for="gamePassword">كلمة المرور للعبة الخاصة</label><input class="input" id="gamePassword" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password"><small class="hint">اتركها فارغة للعبة بالرمز؛ الخاصة تحتاج 8 أحرف على الأقل.</small></div>
    <p class="hint">إنشاء اللعبة يفتح مكان اللعب والحديث نفسه تلقائيًا للبالغين المؤهلين. لا تحتاج إنشاء غرفة صوتية أخرى؛ المايك لا يعمل إلا بإذنك. قيود العمر والصوت الحالية تبقى مطبّقة من الخادم.</p>
    <button class="btn block" type="submit">ابدأ اللعبة</button>
  </form>`;
}

function joinFormHTML() {
  return `<form class="form" data-form="join">
    <div class="field">
      <label for="joinCode">رمز اللعبة</label>
      <div class="join-row">
        <input class="input code" id="joinCode" name="code" inputmode="text" autocapitalize="characters"
          autocomplete="off" autocorrect="off" spellcheck="false" placeholder="مثال: K7M4Q" aria-describedby="joinHelp">
        <button class="btn" type="submit">انضمام</button>
      </div>
      <p class="hint" id="joinHelp">الصق الرمز كامل، أو اكتبه. خمس خانات من حروف إنجليزية وأرقام.</p>
      <label for="joinPassword">كلمة المرور إن كانت اللعبة خاصة</label><input class="input" id="joinPassword" name="password" type="password" maxlength="128" autocomplete="current-password">
    </div>
  </form>`;
}

function gameInfoView(id) {
  if (isRetiredGame(id)) return retiredGameHTML();
  const g = S.games.find((x) => x.id === id);
  if (!g) return `<div class="card empty-state"><p>ما لقينا هذي اللعبة.</p><a class="btn" href="#/games">الألعاب</a></div>`;
  if (g.status !== 'available') {
    return `<div class="card empty-state"><p>${esc(g.name)} قريباً، لسه ما جهزناها.</p><a class="btn" href="#/games">الألعاب</a></div>`;
  }
  return `<div class="stack">
    <section class="card game-card glow">
      <div class="game-head">
        <div class="game-ico" aria-hidden="true">${gameIco(g)}</div>
        <div style="min-width:0"><h1 style="font:400 30px/1.2 var(--font-display)">${esc(g.name)}</h1><span class="badge live">متاحة الآن</span></div>
      </div>
      <dl class="dl">
        <div><dt>فكرة اللعبة</dt><dd>${esc(g.idea)}</dd></div>
        <div><dt>كم لاعب؟</dt><dd>${esc(playersText(g))}${g.supportsBots ? '، أو مع الكمبيوتر بدون انتظار' : ''}</dd></div>
        <div><dt>كيف تبدأ؟</dt><dd>${esc(g.howToStart)}</dd></div>
        <div><dt>كيف تفوز؟</dt><dd>${esc(g.howToWin)}</dd></div>
      </dl>
    </section>
    <div class="grid two">
      <section class="card"><h2 style="margin-bottom:14px">إنشاء اللعبة</h2>${createFormHTML(g)}</section>
      <section class="card"><h2 style="margin-bottom:14px">الانضمام برمز</h2>${joinFormHTML()}</section>
    </div>
  </div>`;
}

const STATUS_AR = { lobby: 'تنتظر اللاعبين', playing: 'اللعب شغّال', finished: 'انتهت الجولة' };

function roomsView() {
  const rooms = [...S.rooms.values()];
  const live = S.games.filter((x) => x.status === 'available');
  const g = live.find((x) => x.id === S.pickGame) || live[0];
  const list = rooms.length
    ? rooms
        .map((r) => {
          const info = S.games.find((x) => x.id === r.gameId);
          const n = r.players.filter((p) => !p.left).length;
          return `<a class="card room-item" href="#/room/${esc(r.code)}">
            <div class="game-ico" aria-hidden="true">${esc(info?.icon ?? '🎮')}</div>
            <div class="p-main">
              <span class="p-name">${esc(info?.name ?? 'لعبة')}</span>
              <span class="small muted">رمز <span class="room-code">${esc(r.code)}</span> · ${n}/${r.seats} لاعبين</span>
              <div class="p-tags"><span class="badge">${r.mode === 'bots' ? 'مع الكمبيوتر' : 'مع الأصدقاء'}</span><span class="badge">${STATUS_AR[r.status]}</span></div>
            </div>
          </a>`;
        })
        .join('')
    : `<div class="card empty-state"><p>ما عندك غرف مفتوحة.</p><p class="small">أنشئ غرفة جديدة أو انضم برمز صاحبك.</p></div>`;
  return `<div class="stack">
    <h1 class="section-title" style="margin-top:0">الغرف</h1>
    <section class="card"><h2 style="margin-bottom:14px">الانضمام برمز</h2>${joinFormHTML()}</section>
    <h2 class="section-title">غرفك</h2>
    <div class="grid two">${list}</div>
    ${
      g
        ? `<section class="card"><h2 style="margin-bottom:14px">إنشاء غرفة جديدة</h2>
            <div class="field" style="margin-bottom:14px"><label for="pickGame">اللعبة</label>
              <select class="select" id="pickGame" data-change="pickgame">${live.map((x) => `<option value="${esc(x.id)}" ${x.id === g.id ? 'selected' : ''}>${esc(x.icon)} ${esc(x.name)}</option>`).join('')}</select></div>
            <div id="createBox">${createFormHTML(g)}</div></section>`
        : ''
    }
  </div>`;
}

const ACCT = { me: null, ownerId:null, err: '', loading: false };
/* تبويب «الأفاتارات» بالمتجر: الأفاتارات الحالية مجانية ومحفوظة محلياً (نظام الملف القائم)، فلا شراء ولا خصم */
SHOP.SH.giftTab = () => GIFT.giftTabHTML();
SHOP.SH.who = () => { const me=ACCT.ownerId===S.user?.id?ACCT.me:null;return { name:S.user?.name??'أنت',displayPlayerId:me?.displayPlayerId,specialPlayerId:me?.specialPlayerId,playerId:me?.playerId,face:me?.avatar?PF.photoHTML(84,me.avatar,S.user?.name):PF.avatarHTML(PF.sanitize(PF.load()),84) }; };
let storePreviewOrigin=null;
async function closeStorePreview(){if(!SHOP.closePreview())return;await render();document.querySelector(`.r23-product-tile[data-id="${CSS.escape(storePreviewOrigin||'')}"]`)?.focus();}
document.addEventListener('keydown',e=>{const dialog=document.querySelector('[data-r23-dialog="preview"]');if(!dialog)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();void closeStorePreview();return;}if(e.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(!first){e.preventDefault();dialog.focus();return;}if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}},true);
/* الأفاتارات المجانية: محفوظة محلياً (نظام الملف القائم)، فلا شراء ولا خصم */
SHOP.SH.freeAvatars = () => {
  const p = PF.sanitize(PF.load());
  const free = PF.AVATARS.map((a) => {
    const on = p.avatar === a.id;
    return `<li class="sh-card${on ? ' own' : ''}"><span class="sh-prev" aria-hidden="true">${PF.avatarHTML({ ...p, avatar: a.id, frame: 'plain' }, 56)}</span><b>${esc(a.label)}</b><small>مجاني</small>${on ? '<em class="sh-own">✔ مستخدم</em>' : ''}
      <button class="btn ${on ? 'ghost' : ''} block" type="button" data-act="av-use" data-id="${esc(a.id)}" ${on ? 'disabled' : ''}>${on ? 'مستخدم حالياً' : 'استخدم'}</button></li>`;
  }).join('');
  return `<section class="card" style="margin-top:12px"><h2 style="margin-bottom:10px">أفاتارات مجانية</h2><ul class="sh-grid">${free}</ul>
    <p class="hint" style="text-align:start">المجانية تنحفظ على هذا الجهاز فقط. تقدر ترفع صورتك من <a href="#/account">حسابي</a>. الأفاتار المدفوع المجهّز يظهر في ملفك والغرف واللوبي ومن أي جهاز.</p></section>`;
};
try { if ('caches' in window) caches.keys().then((k) => { S.swVer = k.find((x) => x.startsWith('qawwi-shell')) || ''; }).catch(() => {}); } catch { /* بدون كاش */ }
CRV.CR.send = async (action, err) => {
  if (err) return toast(err, true);
  const r = activeGameRoom('carrom'); const g = r?.game;
  if (!g || CRV.CR.busy || !action) return;
  const generation = roomRequestGeneration, epoch = CRV.CR.epoch, owner = S.user?.id;
  CRV.CR.busy = true;
  const res = await req('game:action', { code: r.code, ver: g.ver, action }).catch(() => ({ ok: false, error: 'انقطع الاتصال، جرّب مرة ثانية.' }));
  const active = activeGameRoom('carrom');
  if (generation !== roomRequestGeneration || owner !== S.user?.id || epoch !== CRV.CR.epoch || !active
    || active.code !== r.code || (active.gameNo ?? 0) !== (r.gameNo ?? 0) || active.you !== r.you) return;
  CRV.CR.busy = false;
  if (!res.ok) { toast(res.error, true); renderRoom(r.code, true); return; }
  SFX.play('tap');
  afterRoomOk(res);
};
setInterval(() => { if (parseRoute().name === 'city') CITY.tickRegen(req, () => { if (parseRoute().name === 'city') render(); }); }, 1000);
AVT.init({ toast, onDone: () => { loadAcct(); } });
async function loadAcct(redraw = true) {
  const ownerId=S.user?.id;
  if(!ownerId){ACCT.me=null;ACCT.ownerId=null;return;}
  ACCT.loading = true; ACCT.err = '';
  const r = await LOB.loadMe();
  if(S.user?.id!==ownerId)return; // ignore a late response after logout/account switch
  ACCT.me = r.me; ACCT.ownerId=r.me?ownerId:null; ACCT.err = r.err; ACCT.loading = false;
  applyAccountSettings(r.me?.settings);
  if (typeof r.me?.coins === 'number') { S.coins = r.me.coins; updateTop(); } // الرصيد من الخادم (قد يتغير من الإدارة بدون رسالة لحظية)
  if (redraw && (UNIFIED.hasRoute(parseRoute().name) || ['profile', 'account', 'wallet', 'home', 'settings', 'shop', 'notifications', 'notifications-internal'].includes(parseRoute().name)) && !S.pf.editing) render();
}

function googleCard(linked) {
  if (linked) {
    return `<section class="card g-card g-ok"><h2>🔗 حسابك مربوط بـ Google</h2><p class="muted">تقدمك وصورتك ورصيدك محفوظة على حسابك، وتدخلها من أي جهاز بنفس حساب Google.</p>
      <button class="btn ghost block" type="button" data-act="auth-logout">تسجيل الخروج</button></section>`;
  }
  return `<section class="card g-card"><h2>سجّل الدخول بحساب Google</h2><p class="muted">${S.user ? 'اربط حسابك الحالي بـ Google عشان يبقى تقدمك وصورتك ورصيدك وتدخلها من أي جهاز.' : 'ادخل بحساب Google وارجع لتقدمك من أي جهاز. أو اكتب اسمك تحت وابدأ بدون حساب.'}</p>
    <p class="hint">إذا Google جديد، يرتبط بحساب الضيف الحالي. وإذا مربوط بحساب لعب سابق، بتدخل حسابه السابق بدون دمج أو نقل رصيد الضيف. احتفظ بنسخة الدخول لحسابك قبل التبديل.</p><details class="hint"><summary>مساعدة خطأ origin_mismatch</summary><p>هالخطأ من إعدادات Google للمطور. مصدر JavaScript الحالي لازم يكون مصرحًا في نفس OAuth Client ID، بدون أي مسار بعد الدومين:</p><code dir="ltr">${esc(location.origin)}</code><p>هذا عرض للمصدر، مب تأكيد أن Google سمح به. تسجيله يتم في Google Cloud من المالك.</p></details><div id="gBtn" class="g-btn" aria-label="تسجيل الدخول بحساب Google"></div><div id="gErr" class="pf-note bad" role="alert" hidden></div></section>`;
}
function mountGoogle() {
  const el = $('#gBtn');
  if (!el) return;
  AUTH.mount(el, {
    beforeLogin: () => !S.user || window.confirm('إذا حساب Google مربوط من قبل، بتنتقل لحسابه السابق. ما بننقل رصيد أو مقتنيات حساب الضيف ولا بندمج الحسابين. احتفظ بنسخة دخول الضيف أولاً. تبي تكمّل؟'),
    onLogin: (j) => {
      const to = S.next || '#/profile'; S.next = null;
      adoptPreviewSession(j, to).catch((e)=>toast(e.message,true));
    },
    // الخطأ داخل البطاقة (ما يغطي الصفحة) مع إعادة محاولة، بدل التنبيه العائم
    onError: (m) => { const e = $('#gErr'); if (e) { e.innerHTML = `<span>${esc(m)}</span> <button class="pill-btn" type="button" data-act="g-retry">إعادة المحاولة</button>`; e.hidden = false; } },
  });
}

function profileView() { return responsiveRoyalScenery(PR.profileHTML(profileContext())); }

/** معاينة آخر منشورات المجتمع بالرئيسية (بيانات حقيقية من الخادم أو حالة فاضية/خطأ صادقة) */
const HOMEP = { posts: null, err: '', loading: false };


// Server-returned bindings are identity-scoped, transient routing state, never a
// substitute for game admission or social current membership.
const gameVoiceBindings=new Map(), gameVoicePending=new Map();
let gameVoiceUI=null;
let minaboliMount=null;
function destroyMinaboliMount() { minaboliMount?.(); minaboliMount=null; }
function rememberGameVoice(code,voice,owner=S.user?.id) {
  if(!owner||S.user?.id!==owner||!voice||!['ready','blocked'].includes(voice.status))return;
  if(voice.status==='ready'&&(!voice.roomId||!voice.councilId))return;
  gameVoiceBindings.set(owner+'/'+code,voice);
}
function destroyGameVoiceUI() {
  destroyMinaboliMount();
  if(!gameVoiceUI)return;
  const ui=gameVoiceUI;gameVoiceUI=null;ui.social?.destroy?.();ui.root.removeEventListener('click',ui.click);
  document.documentElement.classList.remove('has-game-voice','gv-game-open');
}
async function resolveGameVoice(code,retry=false) {
  const owner=S.user?.id,key=owner+'/'+code,room=S.rooms.get(code);
  if(!owner||!room||isCommunityRestricted())return null;
  if(!retry&&gameVoiceBindings.has(key))return gameVoiceBindings.get(key);
  if(gameVoicePending.has(key))return gameVoicePending.get(key);
  const task=(async()=>{
    const generation=roomRequestGeneration,ws=S.ws;
    const result=await req('room:voice',{code});
    if(S.user?.id!==owner||S.ws!==ws||!S.rooms.has(code)||generation!==roomRequestGeneration||parseRoute().name!=='room'||parseRoute().a!==code)return null;
    const voice=result.ok?result.voice:{status:'blocked',roomId:null,councilId:null,error:result.error||'تعذر تأكيد غرفة الصوت.'};
    rememberGameVoice(code,voice,owner);
    if(gameVoiceUI?.code===code&&gameVoiceUI.owner===owner){gameVoiceUI.social?.updateGameContext?.({gameRoom:S.rooms.get(code),gameVoice:voice});}
    return voice;
  })().finally(()=>{if(gameVoicePending.get(key)===task)gameVoicePending.delete(key);});
  gameVoicePending.set(key,task);return task;
}
function setGameVoiceMode(mode) {
  const ui=gameVoiceUI;if(!ui||!ui.root.isConnected)return;
  ui.mode=mode;ui.surface.hidden=mode!=='game';ui.root.dataset.gameVoiceMode=mode;
  ui.root.querySelectorAll('[data-gv-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gvMode===mode)));
  document.documentElement.classList.toggle('gv-game-open',mode==='game');
  const room=S.rooms.get(ui.code);document.documentElement.classList.toggle('in-play',mode==='game'&&room?.status!=='lobby');
  CHAT.sync(null,S.user?.id);
  FS.sync(mode==='game'&&room?.status==='playing');
  if(mode==='game'){if(ui.surfaceDirty){ui.surfaceDirty=false;renderRoom(ui.code,true);}const room=S.rooms.get(ui.code);if(room?.gameId==='jackaro'){JK_FIT.clear();jkFitTop(ui.surface);}updateClocks(ui.surface);}
}
function ensureGameVoiceUI(room) {
  const owner=S.user?.id,protectedGame=isCommunityRestricted();
  if(gameVoiceUI?.code===room.code&&gameVoiceUI.owner===owner&&gameVoiceUI.root.isConnected&&gameVoiceUI.protected===protectedGame){
    const binding=gameVoiceBindings.get(owner+'/'+room.code);gameVoiceUI.social?.updateGameContext?.({gameRoom:room,gameVoice:binding});
    if(!protectedGame&&!binding)void resolveGameVoice(room.code);
    return gameVoiceUI.surface;
  }
  destroyGameVoiceUI();
  if(!document.querySelector('link[data-game-voice-r9]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/unified/game-voice-r9.css?v=r58p';link.dataset.gameVoiceR9='';document.head.append(link);}
  const voice=gameVoiceBindings.get(owner+'/'+room.code),ctx={...unifiedContext('room'),page:'social-room',gameRoom:room,gameVoice:voice,socialRoomId:voice?.status==='ready'?voice.roomId:null,retryGameVoice:()=>resolveGameVoice(room.code,true)};
  unifiedPage($('#view'),'room',`<section class="gv-wrapper" data-game-voice-wrapper data-game-voice-mode="${protectedGame?'game':'room'}"><div class="gv-social" data-game-voice-social>${protectedGame?'<section class="card"><h2>لعب آمن</h2><p>المجتمع مقفل من إعدادات ولي الأمر؛ اللعبة متاحة دون غرفة صوتية.</p></section>':SOCIAL.render(ctx)}</div><nav class="gv-switch" aria-label="اللعبة والغرفة"><button type="button" data-gv-mode="room" aria-pressed="${!protectedGame}" ${protectedGame?'disabled':''}>الغرفة</button><button type="button" data-gv-mode="game" aria-pressed="${protectedGame}" aria-controls="gv-game-surface">اللعبة</button><button type="button" data-gv-share>دعوة للعبة</button></nav><section id="gv-game-surface" class="gv-game-surface" data-game-voice-surface aria-label="لوحة اللعبة وتحكمها" ${protectedGame?'':'hidden'}></section></section>`,true);
  const root=$('[data-game-voice-wrapper]'),surface=root.querySelector('[data-game-voice-surface]');
  const ui={code:room.code,owner,root,surface,protected:protectedGame,mode:protectedGame?'game':'room',surfaceDirty:!protectedGame,social:null};gameVoiceUI=ui;
  ui.click=event=>{const button=event.target.closest('[data-gv-mode],[data-gv-share]');if(!button||!root.contains(button))return;event.preventDefault();if(button.hasAttribute('data-gv-share'))ACTIONS.share();else setGameVoiceMode(button.dataset.gvMode);};root.addEventListener('click',ui.click);
  if(!protectedGame)ui.social=SOCIAL.mount(root.querySelector('[data-game-voice-social]'),ctx);
  document.documentElement.classList.add('has-game-voice');document.documentElement.classList.toggle('gv-game-open',ui.mode==='game');
  if(!protectedGame)void resolveGameVoice(room.code,true); // Re-enter only this actor on saved/returning routes.
  return surface;
}

const roomUI = { code: null, key: '', joining: false };
const nameOf = (room, id) => room.players.find((p) => p.id === id)?.name ?? 'لاعب غادر';
const gameInfo = (id) => S.games.find((g) => g.id === id);

function structKey(room) {
  if (room.status === 'lobby') {
    return ['L', room.gameId, room.seats, room.hostId, room.players.map((p) => p.id + (p.ready ? 'r' : '') + (p.left ? 'x' : '')).join(',')].join('|');
  }
  const g = room.game || {};
  return ['G', room.status, g.phase, g.ver, g.youSubmitted, g.youVoted, g.youChose, room.hostId, room.gameId === 'domino' ? DMV.uiKey() : room.gameId === 'uno' ? UNV.uiKey() : room.gameId === 'carrom' ? CRV.uiKey() : ''].join('|');
}

/* جاكارو: لو المساحة الآمنة العلوية (الجزيرة بالتطبيق المثبّت) دفعت المقعد العلوي لين صار اسمه يلمس حافة اللوحة،
 * ننقل شريط الاسم بجانب الصورة لهذا المقعد فقط. القرار بالقياس الفعلي (مو تخمين جهاز)، ويُحفظ لكل مقاس شاشة ويُعاد عند تغييره. */
const JK_FIT = new Map();
function jkFitTop(view) {
  const scr = view.querySelector('.jk-screen.jx'); if (!scr) return;
  const key = `${innerWidth}x${innerHeight}`;
  if (JK_FIT.has(key)) return scr.classList.toggle('top-side', JK_FIT.get(key));
  scr.classList.remove('top-side');
  const pill = scr.querySelector('.jx-seat.k0 .jx-pill');
  const wood = [...scr.querySelectorAll('.jk-boardwrap svg *')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 150).sort((a, b) => b.width - a.width)[0];
  if (!pill || !wood) return;
  const side = wood.top - pill.getBoundingClientRect().bottom < 8;
  JK_FIT.set(key, side); scr.classList.toggle('top-side', side);
}
let unoRz = 0;
addEventListener('resize', () => { clearTimeout(unoRz); unoRz = setTimeout(() => { const r = currentRoom(); if (r?.gameId === 'uno' && r.status !== 'lobby' && parseRoute().name === 'room') renderRoom(r.code, true); }, 200); });
addEventListener('resize', () => { JK_FIT.clear(); const v = $('#view'); if (v) jkFitTop(v); });

function renderRoom(code, force) {
  const view = $('#view');
  const route=parseRoute();if(route.name!=='room'||route.a!==code)return;
  const room = S.rooms.get(code);
  document.documentElement.classList.toggle('in-play', !!room && gameVoiceUI?.mode==='game' && room.status !== 'lobby' && !isRetiredGame(room.gameId));
  if (room && isRetiredGame(room.gameId)) {
    roomUI.code = code;
    unifiedPage(view,'room',retiredGameHTML() + '<section class="card"><button class="btn ghost" data-act="leave" type="button">خروج من الغرفة السابقة</button></section>');
    return;
  }
  if (!room) {
    destroyMinaboliMount();
    roomUI.code = null;
    if (!S.helloDone) {
      unifiedPage(view,'room',`<div class="card empty-state"><p>جاري الاتصال بالغرفة…</p></div>`);
      return;
    }
    if (!roomUI.joining) {
      roomUI.joining = true;
      unifiedPage(view,'room',`<div class="card empty-state"><p>جاري الدخول للغرفة…</p></div>`);
      const owner=S.user?.id,generation=roomRequestGeneration;
      req('room:join', { code }).then((res) => {
        roomUI.joining = false;
        if(owner!==S.user?.id||generation!==roomRequestGeneration||parseRoute().name!=='room'||parseRoute().a!==code)return;
        if (res.ok) {
          S.rooms.set(res.room.code, res.room);
          renderRoom(code, true);
        } else {
          if (parseRoute().name === 'room' && parseRoute().a === code) {unifiedPage(view,'room',`<section class="card"><p role="alert">${esc(res.error)}</p>${joinFormHTML()}<a class="btn ghost" href="#/social-rooms">الغرف</a></section>`);const input=view.querySelector('[name=code]');if(input)input.value=code;}
        }
      });
    }
    return;
  }
  const surface=ensureGameVoiceUI(room);
  const key = structKey(room);
  if (!force && roomUI.code === code && roomUI.key === key) return patchLive();
  // مرحلة جديدة (الانتقال من الانتظار للعب، جولة جديدة، نتيجة) ترجّعك لأعلى الصفحة
  const kind = room.status === 'lobby' ? 'L' : 'G' + (room.game?.phase ?? '') + (room.gameId === 'jackaro' ? '' : (room.game?.ver ?? '')) + (room.gameNo ?? '');
  if (roomUI.code !== code || roomUI.kind !== kind) window.scrollTo(0, 0);
  roomUI.code = code;
  roomUI.key = key;
  roomUI.kind = kind;
  // ألعاب الأحداث (لودو/جاكارو): الحركة من أحداث الخادم فقط. غيرها يبقى على الانتقال القديم
  const geom = room.game && typeof room.game.evSeq === 'number' ? FX_GEOM[room.gameId] : null;
  const fx = geom ? curFx?.get(code) : null;
  const snap = geom ? null : flipSnapshot();
  surface.innerHTML=room.status === 'lobby' ? lobbyHTML(room) : gameHTML(room);
  // Install the new scoped context before disposing the old one: a same-version
  // repaint must retain an in-flight token, while a newer snapshot releases it.
  const previousMinaboliMount=minaboliMount;
  minaboliMount=room.gameId==='minaboli' && room.status!=='lobby' ? MNV.mount(surface,room) : null;
  previousMinaboliMount?.();
  updateClocks(surface);
  const visible=gameVoiceUI?.mode==='game';if(gameVoiceUI)gameVoiceUI.surfaceDirty=!visible;
  if(visible)flipPlay(snap);
  if (visible && room.gameId === 'domino' && room.status !== 'lobby') DMV.afterRender(surface, room);
  if (visible && room.gameId === 'uno' && room.status !== 'lobby') UNV.afterRender(surface, room);
  if (visible && room.gameId === 'carrom' && room.status !== 'lobby') CRV.afterRender(surface, room, () => { if (roomUI.code === code) renderRoom(code, true); });
  if (visible && room.gameId === 'jackaro' && room.status !== 'lobby') jkFitTop(surface);
  if (visible && fx?.mode === 'play') runPlan(surface, buildPlan(room.game, fx.events, geom), geom);
  restoreDrafts(room);
  patchLive();
}

function onRoomUpdate(code) {
  const r = parseRoute();
  if (r.name === 'room' && r.a === code) { renderRoom(code, false); CHAT.sync(null, S.user?.id); GIFT.syncRoom(S.rooms.get(code), S.user?.id); FS.sync(gameVoiceUI?.mode==='game'&&S.rooms.get(code)?.status === 'playing'); }
  else if (r.name === 'rooms') render();
}

function playerRow(p, room) {
  const tags = [
    p.host ? '<span class="badge you">المضيف</span>' : '',
    p.id === room.you ? '<span class="badge">أنت</span>' : '',
    p.bot ? '<span class="badge">كمبيوتر</span>' : p.ready || p.host ? '<span class="badge live">جاهز</span>' : '<span class="badge soon">ما جهز</span>',
  ].join('');
  return `<li class="player">
    ${p.av ? `<span class="avatar pa-slot" aria-hidden="true">${AVR.avatarArt(p.av, 44)}</span>` : `<span class="avatar ${p.bot ? 'bot' : ''}" aria-hidden="true">${p.bot ? '🤖' : esc([...p.name][0] ?? '?')}</span>`}
    <div class="p-main"><span class="p-name">${esc(p.name)}</span><div class="p-tags">${tags}</div></div>
    ${p.bot ? '' : `<span class="dot ${p.connected ? 'on' : ''}" data-conn="${esc(p.id)}" title="${p.connected ? 'متصل' : 'غير متصل'}"></span>`}
  </li>`;
}

function startReason(room, g) {
  const active = room.players.filter((p) => !p.left);
  if (active.length < g.minPlayers) return `تحتاج ${g.minPlayers} لاعبين على الأقل، الحين ${active.length}.`;
  const wait = active.filter((p) => !p.bot && !p.host && !p.ready);
  if (wait.length) return `ننتظر ${wait.map((p) => p.name).join('، ')} يضغطون «جاهز».`;
  return '';
}

function lobbyHTML(room) {
  const me = room.you;
  const isHost = room.hostId === me;
  const g = gameInfo(room.gameId) || { name: room.gameId, minPlayers: 2, maxPlayers: 6 };
  const active = room.players.filter((p) => !p.left);
  const empty = room.mode === 'friends' ? Math.max(0, room.seats - active.length) : 0;
  const mine = room.players.find((p) => p.id === me);
  const host = room.players.find((p) => p.host);
  const reason = isHost ? startReason(room, g) : '';
  const options = S.games
    .filter((x) => x.status === 'available' && (room.mode !== 'bots' || x.supportsBots))
    .map((x) => `<option value="${esc(x.id)}" ${x.id === room.gameId ? 'selected' : ''}>${esc(x.icon)} ${esc(x.name)}</option>`)
    .join('');
  return `<div class="stack">
    <section class="card code-box glow">
      <span class="muted">${room.mode === 'bots' ? 'غرفة تدريب مع الكمبيوتر' : 'رمز الغرفة، أرسله لأصحابك'}</span>
      <div class="code-big" id="roomCode">${esc(room.code)}</div>
      ${
        room.mode === 'bots'
          ? ''
          : `<div class="btn-row">
              <button class="btn ghost" data-act="copy" type="button"><svg><use href="#i-copy"/></svg>نسخ الرمز</button>
              <button class="btn ghost" data-act="share" type="button"><svg><use href="#i-share"/></svg>مشاركة</button>
            </div>`
      }
    </section>

    <section class="card"><dl class="dl">
      <div><dt>المضيف</dt><dd>${esc(host?.name ?? '')}</dd></div>
      <div><dt>اللعبة</dt><dd>${
        isHost
          ? `<select class="select" data-change="game" aria-label="اختيار اللعبة">${options}</select>`
          : esc(`${g.icon ?? ''} ${g.name}`)
      }</dd></div>
      <div><dt>المقاعد</dt><dd>${active.length} من ${room.seats} ممتلئة${empty ? `، المتبقي ${empty}` : ''}</dd></div>
    </dl></section>

    <section class="card">
      <h2 style="margin-bottom:14px">اللاعبين</h2>
      <ul class="players">
        ${active.map((p) => playerRow(p, room)).join('')}
        ${Array.from({ length: empty }, () => `<li class="player empty"><span class="avatar" style="background:rgba(255,255,255,.08)">+</span><div class="p-main"><span class="p-name muted">مقعد فاضي</span></div></li>`).join('')}
      </ul>
    </section>

    <section class="card form">
      ${
        isHost
          ? `<button class="btn block" data-act="start" type="button" ${reason ? 'disabled' : ''}>ابدأ الجولة</button>
             ${reason ? `<p class="hint">${esc(reason)}</p>` : ''}`
          : `<button class="btn block ${mine?.ready ? 'ghost' : ''}" data-act="ready" type="button">${mine?.ready ? 'إلغاء الجاهزية' : 'جاهز'}</button>
             <p class="hint">${mine?.ready ? 'ننتظر المضيف يبدأ الجولة.' : 'اضغط «جاهز» لما تكون مستعد.'}</p>`
      }
      <div class="btn-row">
        <button class="btn ghost" data-act="leave" type="button">خروج من الغرفة</button>
        ${isHost ? `<button class="btn danger" data-act="delete" type="button">حذف الغرفة</button>` : ''}
      </div>
    </section>
  </div>`;
}

function gameHTML(room) {
  const g = room.game;
  if (isRetiredGame(room.gameId) || isRetiredGame(g?.game)) return retiredGameHTML();
  if (g && GAME_VIEWS[g.game]) return GAME_VIEWS[g.game](room);
  return `<div class="card empty-state"><p>جاري تحميل اللعبة…</p></div>`;
}

/* عناصر تتحدث بدون إعادة بناء الصفحة (ما نمسح مسودة الكتابة) */
function patchLive() {
  const code = roomUI.code;
  const room = code && S.rooms.get(code);
  if (!room) return;
  $$('[data-conn]').forEach((el) => {
    const p = room.players.find((x) => x.id === el.dataset.conn);
    el.classList.toggle('on', !!p?.connected);
    el.title = p?.connected ? 'متصل' : 'غير متصل';
  });
  const subs = room.game?.submitted || room.game?.voted || room.game?.answered;
  if (subs) $$('[data-sub]').forEach((el) => el.classList.toggle('done', !!subs[el.dataset.sub]));
  tickTimer();
  updateClocks();
}

function tickTimer() {
  const room = roomUI.code && S.rooms.get(roomUI.code);
  const el = $('#timer');
  if (!room || !el || !room.game) return;
  if (!CLOCK.ready()) CLOCK.observe(room.serverNow ?? room.game.serverNow);
  if (!CLOCK.ready() || !Number.isFinite(room.game.endsAt)) { el.textContent = '--'; return; }
  const left = Math.max(0, Math.ceil((room.game.endsAt - CLOCK.now()) / 1000));
  el.textContent = String(left);
  el.classList.toggle('low', left <= 10);
  const g = room.game;
  // إرسال تلقائي لمسودتك قبل ما ينتهي الوقت بثانية، عشان ما تضيع إجاباتك
  if (g.phase === 'answering' && !g.youSubmitted && left <= 1 && !S.autoSent[g.ver + room.code]) {
    S.autoSent[g.ver + room.code] = true;
    submitAnswers(room, true);
  }
}
setInterval(tickTimer, 250);
document.addEventListener('visibilitychange', tickTimer);
startClocks();

function draftKey(room) {
  return room.code + ':' + (room.game?.ver ?? 0);
}
function restoreDrafts(room) {
  if (room.game?.phase !== 'answering') return;
  const d = S.drafts[draftKey(room)] || {};
  $$('[data-cat]').forEach((i) => {
    if (d[i.dataset.cat]) i.value = d[i.dataset.cat];
  });
  if (!room.game.youSubmitted && document.activeElement === document.body && matchMedia('(hover: hover)').matches) {
    $('[data-cat]')?.focus({ preventScroll: true });
  }
}

async function submitAnswers(room, auto = false) {
  const answers = {};
  $$('[data-cat]').forEach((i) => (answers[i.dataset.cat] = i.value));
  const res = await req('game:action', { code: room.code, ver: room.game.ver, action: { type: 'submit', answers } });
  if (!res.ok) {
    if (!auto) toast(res.error, true);
  } else {
    S.rooms.set(res.room.code, res.room);
    onRoomUpdate(res.room.code);
  }
}

/* ---------------- الأحداث ---------------- */
/** لما تنتهي لعبة، نسجّل نتيجتها في إحصائيات اللاعب على جهازه */
function trackRoom(room) {
  try {
    if (S.user && PF.recordFinished(room, S.user.id)) {
      const won = room.outcome?.winners.includes(S.user.id);
      MIS.event('played');
      if (won) { MIS.event('won'); SFX.play('win'); }
      if (room.mode === 'friends' && room.players.filter((p) => !p.bot && !p.left).length >= 2) MIS.event('friends');
      if (parseRoute().name === 'profile') render();
    }
  } catch {
    /* الإحصائيات ما لازم توقف اللعب */
  }
}

/** تحديث منشور بكل القوائم المعروضة (الصفحة الرئيسية للمجتمع، صفحة المنشور، صفحة اللاعب) */
function cmPatchPost(id, patch) {
  for (const p of [...COM.CM.feed.list, ...(COM.CM.user.data?.posts ?? []), ...(COM.CM.post.data ? [COM.CM.post.data.post] : []), ...(HOMEP.posts ?? [])]) if (p.id === id) Object.assign(p, patch);
}

/** نافذة الهدايا داخل الغرفة: طبقة مستقلة فوق اللعب (ما تغادر الغرفة ولا توقف اللعب) */
function openRoomGift() {
  const r = currentRoom(); if (!r) return;
  const humans = r.players.filter((p) => !p.bot && !p.left && p.id !== r.you);
  if (!humans.length) return toast('الهدايا تنرسل للاعبين الحقيقيين بس، وما فيه لاعب حقيقي معك بالغرفة.', true);
  CHAT.close();
  GIFT.openRoom(r, r.you);
  GIFT.loadList(req).then(() => GIFT.paintRoom());
}
CHAT.setLoader((code) => req('room:chat', { code }));

function currentRoom() {
  return S.rooms.get(roomUI.code);
}

/** غرفة المسار المعروض فقط؛ roomUI القديمة مب تفويض لرد شبكة متأخر. */
function activeGameRoom(game) {
  const route = parseRoute();
  const room = currentRoom();
  return route.name === 'room' && room && room.code === route.a && room.game?.game === game ? room : null;
}
function receiveRoomReaction(message) {
  const route = parseRoute();
  const room = currentRoom();
  if (route.name !== 'room' || route.a !== message.code || !room || room.code !== message.code) return;
  if (!gameVoiceUI && !S.accountSettings?.hideChatEffects) CHAT.pop(message.name, message.text, message.from === S.user?.id, message.from, message);
  if (room.game?.game === 'domino') DMV.feedPush(message.name, message.text, message.from === S.user?.id, message.code);
}

async function afterRoomOk(res) {
  if (!res.ok) return toast(res.error, true);
  if (res.room) {
    S.rooms.set(res.room.code, res.room);
    trackRoom(res.room);
    onRoomUpdate(res.room.code);
  }
}

let cityAnimationGeneration = 0;
function cityPaint() { if (parseRoute().name === 'city') render(); }
function cityRollOperation(C) {
  const ownerId = S.user?.id;
  if (C.pendingRoll?.ownerId === ownerId) return C.pendingRoll;
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem('lb-city-roll:' + ownerId) || 'null'); } catch { /* ذاكرة الجلسة بديل آمن */ }
  const valid = saved && typeof saved.key === 'string' && saved.key.length > 0 && [1, 2, 3].includes(saved.mult);
  if (!valid && C.data.rolls < C.mult) return null;
  const op = { ownerId, key: valid ? saved.key : CITY.newKey(), mult: valid ? saved.mult : C.mult };
  C.pendingRoll = op; C.key = op.key;
  try { sessionStorage.setItem('lb-city-roll:' + ownerId, JSON.stringify({ key: op.key, mult: op.mult })); } catch { /* تبقى إعادة المحاولة بنفس الصفحة آمنة */ }
  return op;
}
function cityFinishRoll(C, op) {
  if (C.pendingRoll !== op) return;
  C.pendingRoll = null; C.key = null;
  try { sessionStorage.removeItem('lb-city-roll:' + op.ownerId); } catch { /* ما نغيّر نتيجة ملتزمة */ }
}
function cityRollRejected(res) {
  // هذي أخطاء CityError قبل تنفيذ الرمية؛ غيرها ممكن يكون فشل نقل أو فشل بعد الالتزام.
  return res && !res.uncertain && !res.storage && ['المضاعف غير صالح.', 'طلب غير صالح.', 'خلصت رمياتك. تتجدد رمية كل 8 دقائق.', 'المضاعف ×2 يحتاج 2 رميات.', 'المضاعف ×3 يحتاج 3 رميات.'].includes(res.error);
}

const ACTIONS = {
  theme(el) {
    THEME.set(el.dataset.id);
    render();
  },
  install() {
    PWA.install();
  },
  'install-close'() {
    PWA.closeDialog();
  },
  sound() {
    SFX.setOn(!SFX.isOn());
    render();
  },
  quality() {
    PWA.setQuality(PWA.quality() === 'high' ? 'low' : 'high');
    render();
  },
  'react-toggle'() {
    CHAT.toggle();
  },
  async react(el) {
    const res = await req('room:react', { code: CHAT.currentCode(), text: el.dataset.e });
    if (!res.ok) toast(res.error, true);
    else CHAT.close();
  },
  'hub-size'(el) {
    HUB.MM.size[el.dataset.g] = Number(el.dataset.n);
    render();
  },
  async 'hub-search'(el) {
    const g = el.dataset.g;
    const seats = HUB.MM.size[g] ?? HUB.HUBS[g].defSize;
    const stake = HUB.MM.stakeSel[g] ?? 0;
    if (g === 'ludo' && !HUB.ldPlayable()) return toast('هذا الوضع قيد التطوير. اختر «كلاسيكي» عشان تلعب.', true);
    const res = await req('mm:join', { gameId: g, seats, stake, ...(g === 'ludo' ? { variant: HUB.ldMode() } : {}) });
    if (!res.ok) return toast(res.error, true);
    if (res.found) return; // mm:found يوصل لنا
    HUB.MM.game = g; HUB.MM.seats = seats; HUB.MM.stake = stake; HUB.MM.waiting = res.status.waiting; HUB.MM.since = res.status.since - (S.offset || 0); HUB.MM.snooze = false;
    render();
  },
  async 'hub-cancel'() {
    await req('mm:leave');
    HUB.reset();
    render();
  },
  'fs-toggle'() {
    FS.toggle();
  },
  'hub-stake'(el) {
    HUB.MM.stakeSel[el.dataset.g] = Number(el.dataset.v);
    render();
  },
  'lobby-tab'(el) { LOB.L.tab = el.dataset.v; render(); },
  'lobby-reload'() { LOB.L.err = ''; LOB.L.me = null; render(); LOB.load().then(render); },
  /* ---------- الهدايا (نافذة الغرفة والمتجر): التحقق والخصم والتقسيم بالخادم ---------- */
  'gift-reload'() { GIFT.loadList(req).then(() => GIFT.repaint(render)); },
  'gift-view'(el) { GIFT.G.view = el.dataset.v; if (el.dataset.v === 'log') { GIFT.G.log = null; GIFT.loadLog(req).then(render); } render(); },
  'gift-to'(el) { if (GIFT.G.busy) return; GIFT.G.to = { id: el.dataset.id, name: el.dataset.name }; GIFT.G.key = null; GIFT.G.keySig = ''; GIFT.G.done = null; GIFT.G.fail = null; render(); },
  'gift-change'() { if (GIFT.G.busy) return; Object.assign(GIFT.G, { to: null, key: null, fail: null, results: null }); render(); },
  'room-gift'() { openRoomGift(); },
  'chat-log'() { CHAT.toggleLog(); },
  'gs-close'() { GIFT.closeRoom(); },
  'gs-close-go'() { GIFT.closeRoom(); },
  'gs-to'(el) { if (GIFT.G.busy) return; GIFT.G.to = { id: el.dataset.id, name: el.dataset.name }; GIFT.G.key = null; GIFT.G.keySig = ''; GIFT.G.fail = null; GIFT.G.done = null; GIFT.repaint(render); },
  'gs-cat'(el) { GIFT.G.cat = el.dataset.c; GIFT.G.limit = 48; GIFT.G.sel = null; GIFT.repaint(render); },
  'gs-more'() { GIFT.G.limit += 48; GIFT.repaint(render); },
  'gs-qty'(el) { if (GIFT.G.busy) return; GIFT.G.qty = Number(el.dataset.q) || 1; GIFT.repaint(render); },
  'gs-pick'(el, e) {
    if (GIFT.G.busy) return; GIFT.G.sel = GIFT.G.sel === el.dataset.id ? null : el.dataset.id; GIFT.G.fail = null; GIFT.repaint(render);
  },
  async 'gs-send'(el, _e, confirmed = false) {
    if (GIFT.G.busy) return;
    if (!GIFT.G.to) return toast(GIFT.G.mode === 'room' ? 'اختر اللاعب اللي تبي ترسل له.' : 'اختر المستلم أولاً.', true);
    const g = GIFT.G.list?.find((x) => x.id === (el?.dataset?.id || GIFT.G.sel)); if (!g) return;
    if (!GIFT.giftAffordability(g.id).allowed) return toast('رصيدك ما يكفي لهذي الهدية أو عرضها غير متاح. حدّث الهدايا وراجع الحسبة.', true);
    const p = GIFT.send(req, g.id, confirmed); GIFT.repaint(render);
    const r = await p; GIFT.repaint(render); if (!r || r.pending) return;
    if (r.ok) { S.coins = r.coins; if(Number.isFinite(r.gems))S.gems=r.gems; updateTop(); if (GIFT.G.mode !== 'room') { toast(`تم إرسال ${g.name} ✔`); GFX.play(r.ev, S.user?.id); } }
    else { toast(r.error, true); if (r.code === 'price') GIFT.loadList(req).then(() => GIFT.repaint(render)); }
  },
  'gs-confirm-yes'() { const id = GIFT.G.confirm?.id; if (id) ACTIONS['gs-send']({ dataset: { id } }, null, true); },
  'gs-confirm-no'() { GIFT.G.confirm = null; GIFT.repaint(render); },
  async 'shop-ledger'(el) {
    if(SHOP.SH.loading)return;SHOP.SH.loading=true;render();
    const version = SHOP.SH.logVersion;
    const r=await req('shop:ledger',{offset:Number(el.dataset.offset)}).catch(()=>null);SHOP.SH.loading=false;
    if(r?.ok && version===SHOP.SH.logVersion){SHOP.SH.logRows=r.ledger;SHOP.SH.logOffset=r.offset;SHOP.SH.logTotal=r.total;}else if(!r?.ok) toast(r?.error||'تعذر تحميل سجل المعاملات.',true);render();
  },
  'shop-convert-cancel'() { if(!SHOP.SH.busy) {SHOP.SH.convertConfirm=null;render();} },
  async 'shop-convert-go'() {
    const c=SHOP.SH.convertConfirm;if(!c?.key||SHOP.SH.busy)return; const owner=S.user?.id;SHOP.SH.busy=true;render();
    const r=await req('shop:convert',{gems:c.gems,seenRate:c.rate,key:c.key}).catch(()=>({ok:false,error:'انقطع الرد؛ راجع السجل أو أعد المحاولة بنفس الطلب. ما نقدر نأكد نتيجة الحفظ من دون رد.'}));
    if(owner!==S.user?.id)return;
    SHOP.SH.busy=false;
    if(r.ok&&r.dup===true&&r.receipt?.kind==='conversion'&&r.receipt?.itemId===JSON.stringify([c.gems,c.rate])){SHOP.SH.convertConfirm=null;await SHOP.load(req);await loadAcct(false);toast('تم التحقق من إيصال التحويل السابق؛ ما انضافت عملية جديدة.');}
    else {if(r.code==='conversion_disabled')SHOP.SH.convertConfirm=null;toast(r.error||'ما قدرنا نأكد الإيصال السابق. نفس معرّف الطلب محفوظ.',true);}render();
  },
  'shop-open-set-item'(el) { const i = SHOP.SH.data?.items.find(x => x.id === el.dataset.id); if (!i) return; SHOP.SH.tab = i.slot; SHOP.SH.f = { rar:'all', own:'all', sort:'rar', set:i.set || 'all' }; SHOP.SH.lim=24; render(); },
  'shop-world'(el) { SHOP.SH.world = el.dataset.v; SHOP.SH.tab = 'frame'; SHOP.SH.f = { rar: 'all', own: 'all', sort: 'rar', set: 'all' }; SHOP.SH.try = {}; SHOP.SH.lim = 24; render(); },
  'shop-tab'(el) { SHOP.SH.tab = el.dataset.v; SHOP.SH.lim = 24; SHOP.SH.f.set = 'all'; if (el.dataset.v === 'gift') GIFT.loadList(req).then(render); render(); },
  'shop-f'(el) { SHOP.SH.f[el.dataset.k] = el.dataset.v; SHOP.SH.lim = 24; render(); },
  'shop-more'() { SHOP.SH.lim += 24; render(); },
  'shop-try'(el) { const it = SHOP.SH.data?.items.find((x) => x.id === el.dataset.id); if (!it) return; if (SHOP.SH.try[it.slot] === it.id) delete SHOP.SH.try[it.slot]; else SHOP.SH.try[it.slot] = it.id; render(); document.querySelector('.cx-preview')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); },
  'shop-try-clear'() { SHOP.SH.try = {}; render(); },
  'shop-try-set'(el) { const items = (SHOP.SH.data?.items ?? []).filter((i) => i.set === el.dataset.v); SHOP.SH.try = {}; for (const slot of ['avatar', 'frame', 'bg', 'title', 'badge']) { const best = items.filter((i) => i.slot === slot).sort((a, b) => (b.currency === 'gems' ? b.price * 100 : b.price) - (a.currency === 'gems' ? a.price * 100 : a.price))[0]; if (best) SHOP.SH.try[slot] = best.id; } render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  'shop-reload'() { SHOP.load(req).then(render); render(); },
  async 'shop-preview'(el) {if(!SHOP.openPreview(el.dataset.id))return;storePreviewOrigin=el.dataset.id;await render();document.querySelector('[data-r23-dialog="preview"] button:not([disabled])')?.focus();},
  async 'shop-preview-close'(){await closeStorePreview();},
  'shop-ask'(el) {if(SHOP.SH.busy)return; if (el.getAttribute('aria-disabled')) return toast('رصيدك ما يكفي لهذا العنصر.', true); SHOP.SH.confirm = el.dataset.id; SHOP.SH.key = SHOP.newKey(); render(); },
  'shop-cancel'() { if(SHOP.SH.busy)return;SHOP.SH.confirm = null; SHOP.SH.gemConfirm = null; render(); },
  'shop-gem-ask'() { toast('تحويل العملات إلى جواهر مقفول. باقات الجواهر من صفحة الباقات فقط.',true); },
  async 'shop-gem-buy'() {
    if (SHOP.SH.busy || !SHOP.SH.gemConfirm || !SHOP.SH.gemKey) return;
    const owner=S.user?.id;
    SHOP.SH.busy = true; render();
    const p = SHOP.SH.data?.gemPacks?.find((x) => x.id === SHOP.SH.gemConfirm);
    const res = await req('shop:gems', { pack: SHOP.SH.gemConfirm, key: SHOP.SH.gemKey, seen: p?.coins }).catch(() => ({ ok: false, error: 'انقطع الاتصال. اضغط تأكيد مرة ثانية وما راح ينخصم مرتين.', net: true }));
    if(owner!==S.user?.id)return;
    SHOP.SH.busy = false;
    if(res.ok&&res.dup===true&&res.receipt?.kind==='gems'&&res.receipt?.itemId===SHOP.SH.gemConfirm){SHOP.SH.gemConfirm=null;await SHOP.load(req);await loadAcct(false);toast('تم التحقق من إيصال الجواهر السابق، دون خصم جديد.');}
    else {if(res.code==='conversion_disabled')SHOP.SH.gemConfirm=null;toast(res.error||'ما قدرنا نأكد الإيصال السابق. نفس معرّف الطلب محفوظ.',true);}render();
  },
  async 'shop-buy'() {
    if (SHOP.SH.busy || !SHOP.SH.confirm) return;
    const owner=S.user?.id;
    SHOP.SH.busy = true; render();
    const asked = SHOP.SH.data?.items.find((x) => x.id === SHOP.SH.confirm);
    const res = await req('shop:buy', { item: SHOP.SH.confirm, key: SHOP.SH.key, seen: asked?.price, seenCur: asked?.currency }).catch(() => ({ ok:false,net:true,error:'انقطع الاتصال والطلب غير محسوم. أعد التأكيد بنفس الطلب للتحقق دون خصم مكرر.' }));
    if(owner!==S.user?.id)return;
    SHOP.SH.busy = false;
    if(res.net){toast(res.error,true);render();return;}
    SHOP.SH.confirm = null;
    if (!res.ok) { SHOP.apply(res); toast(res.error, true); } else { SHOP.apply(res); S.coins = res.coins; toast('تم الشراء ✅ تقدر تجهّزه الحين.'); }
    ACCT.me = null; render();
  },
  async 'shop-equip'(el) {
    const owner=S.user?.id;
    const res = await req('shop:equip', el.dataset.on === '1' ? { item: null, slot: el.dataset.slot || SHOP.SH.tab } : { item: el.dataset.id });
    if(owner!==S.user?.id)return;
    if (!res.ok) return toast(res.error, true);
    SHOP.apply(res); if (['account', 'profile'].includes(parseRoute().name)) loadAcct(); else { ACCT.me = null; render(); }
  },
  async 'shop-claim'(el) {
    const res = await req('shop:claim', { mid: el.dataset.id });
    if (!res.ok) return toast(res.error, true);
    SHOP.apply(res); S.coins = res.coins; ACCT.me = null; toast(`استلمت 🪙 ${nf(res.cur === 'gems' ? res.got * 20 : res.got)}!`); render();
  },
  async 'wallet-daily'() {
    const res = await req('wallet:daily');
    if (!res.ok) return toast(res.error, true);
    S.coins = res.coins; S.canClaim = false; if (SHOP.SH.data) { SHOP.SH.data.coins = res.coins; SHOP.SH.data.canDaily = false; } ACCT.me = null;
    SHOP.invalidateLedger();
    // An older pending snapshot must finish before fetching the saved daily entry.
    if (SHOP.SH.loading) await SHOP.load(req);
    await SHOP.load(req);
    if (LOB.L.me) { LOB.L.me.coins = res.coins; LOB.L.me.canClaim = false; LOB.load().then(() => { if (parseRoute().name === 'lobby') render(); }); }
    toast(`استلمت 🪙 ${nf(res.got)} عملة!`);
    render();
  },
  'hub-wait'() {
    HUB.MM.snooze = true;
    const a = document.getElementById('mmAsk');
    if (a) a.innerHTML = '<p class="hint">تمام، ننتظر. تقدر تلغي بأي وقت.</p>';
  },
  async 'hub-fill'() {
    const res = await req('mm:fill');
    if (!res.ok) { toast(res.error, true); HUB.reset(); render(); }
  },
  async 'hub-bots'(el) {
    const g = el.dataset.g;
    const seats = HUB.MM.size[g] ?? HUB.HUBS[g].defSize;
    if (g === 'ludo' && !HUB.ldPlayable()) return toast('هذا الوضع قيد التطوير. اختر «كلاسيكي» عشان تلعب.', true);
    let c = await req('room:create', { gameId: g, mode: 'bots', seats, ...(g === 'ludo' ? { variant: HUB.ldMode() } : {}) });
    if (!c.ok) return toast(c.error, true);
    S.rooms.set(c.room.code, c.room);
    const st = await req('room:start', { code: c.room.code });
    if (!st.ok) toast(st.error, true);
    (globalThis.__LA3BAK_NAV__ || location).hash = '#/room/' + c.room.code;
  },
  'challenge-new'() {
    const seed = OFF.newSeed();
    OFF.O.error = '';
    OFF.O.challenge = null;
    OFF.O.game = null;
    (globalThis.__LA3BAK_NAV__ || location).hash = '#/challenge/' + seed;
    OFF.startChallenge(seed, '', NaN, S.user?.name || '', render);
  },
  'challenge-accept'(el) {
    OFF.startChallenge(el.dataset.seed, el.dataset.from, el.dataset.sc === '' ? NaN : Number(el.dataset.sc), S.user?.name || '', render);
  },
  'ch-send'() {
    OFF.sendChallenge();
  },
  'season-play'(el) {
    (globalThis.__LA3BAK_NAV__ || location).hash = '#/offline';
    OFF.quickPlay(S.user?.name || '', render, el.dataset.kind);
  },
  'backup-export'() {
    const n = BK.exportData();
    toast(n ? 'نزّلنا نسخة تقدمك. احتفظ بالملف.' : 'ما فيه شي نحفظه بعد.', !n);
  },
  'daily-start'() {
    OFF.startDaily(S.user?.name || '', render);
  },
  'ms-claim'(el) {
    const n = MIS.claim(el.dataset.id);
    if (n) toast(`استلمت ⭐${n} — وزادت نقاط شخصيتك!`);
    render();
  },
  speak(el) {
    if (!SFX.speak(el.dataset.say)) toast('جهازك ما فيه صوت عربي للقراءة.', true);
  },
  fontsize() {
    PWA.setFontScale(PWA.nextFontScale());
    render();
  },
  'quick-play'() {
    (globalThis.__LA3BAK_NAV__ || location).hash = '#/offline';
    OFF.quickPlay(S.user?.name || '', render);
  },
  filter(el) {
    const k = el.dataset.k;
    if (k === 'cat') S.fCat = el.dataset.f;
    else S.fMode = el.dataset.f;
    $$(`.filters .chip-btn[data-k="${k}"]`).forEach((b) => { b.classList.toggle('on', b === el); b.setAttribute('aria-pressed', String(b === el)); });
    applyGameFilter();
  },
  async 'auth-logout'() {
    return previewLogout();
  },
  'g-retry'() { const e = $('#gErr'); if (e) e.hidden = true; mountGoogle(); },
  'av-pick'() { AVT.pick(); },
  'av-confirm'() { AVT.upload(); },
  'av-cancel'() { AVT.closeModal(); },
  'av-del'() { AVT.askDelete(); },
  'av-del-yes'() { AVT.remove(); },
  'av-use'(el) { const p = PF.sanitize(PF.load()); p.avatar = el.dataset.id; PF.save(p); toast('تم تغيير الأفاتار.'); render(); },
  'pf-tab'(el) { S.pf.tab = el.dataset.v; render(); },
  'pf-sec'(el) { S.pf.sec = el.dataset.v; const want = el.dataset.v === 'settings' ? 'settings' : 'account'; if (parseRoute().name !== want) (globalThis.__LA3BAK_NAV__ || location).hash = '#/' + want; else render(); },
  'sfx-toggle'() { SFX.setOn(!SFX.isOn()); render(); },
  'pf-reload'() { loadAcct(); render(); },
  'pf-edit'() {
    S.pf.draft = { ...PF.sanitize(PF.load()) };
    S.pf.editing = true;
    render();
    window.scrollTo(0, 0);
  },
  'pf-pick'(el) {
    if (!S.pf.draft) return;
    S.pf.draft[el.dataset.k] = el.dataset.v;
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  },
  'pf-save'() {
    const p = PF.load();
    const d = S.pf.draft;
    Object.assign(p, { avatar: d.avatar, color: d.color, frame: d.frame, title: d.title, saved: true });
    PF.save(PF.sanitize(p));
    S.pf.editing = false;
    S.pf.draft = null;
    toast('تم حفظ شخصيتك');
    render();
    window.scrollTo(0, 0);
  },
  'pf-cancel'() {
    S.pf.editing = false;
    S.pf.draft = null;
    render();
    window.scrollTo(0, 0);
  },
  'pf-update'() {
    toast('جاري التحقق…');
    fetch('/app.js', { cache: 'reload' }).then(() => fetch('/games.js?v=r59d', { cache: 'reload' })).then(() => fetch('/app.css?v=r58q', { cache: 'reload' }))
      .then(() => { toast('اكتملت المزامنة، بنحدّث الصفحة'); setTimeout(() => location.reload(), 700); })
      .catch(() => toast('ما قدرنا نتحقق الحين، جرّب بعد شوي'));
  },
  'pf-clear'() {
    S.pf.confirmClear = true;
    render();
  },
  'pf-clear-no'() {
    S.pf.confirmClear = false;
    render();
  },
  'pf-clear-yes'() {
    PF.clearAll();
    S.pf.confirmClear = false;
    S.pf.editing = false;
    toast('انمسحت شخصيتك من هذا الجهاز');
    render();
  },
  'jk-card'(el) {
    const r = currentRoom();
    const g = r?.game;
    if (!g || g.game !== 'jackaro') return;
    const i = Number(el.dataset.i);
    if (g.canDiscard) return ACTIONS.sendAction({ type: 'discard', card: i });
    JK.card = JK.card === i ? null : i;
    JK.marble = null;
    renderRoom(r.code, true);
  },
  // سبب عدم تحريك ورقة/كرة/قطعة (من قواعد المحرك الحالية فقط، بدون تخمين)
  'jk-nocard'(el) {
    const g = currentRoom()?.game; if (!g || g.game !== 'jackaro') return;
    const rank = g.hand[Number(el.dataset.i)];
    const rule = { 1: 'A تطلّع كرة من البيت أو تمشي 1 أو 11', 13: 'K تطلّع كرة من البيت فقط', 11: 'J تبدّل كرتك بكرة ثانية على اللوحة', 4: '4 ترجّع كرة 4 خانات', 5: '5 تحرّك أي كرة 5 خانات', 7: '7 تمشي كرة 7 خانات أو تتقسم على كرتين', 12: 'Q تمشي 12 خانة' }[rank] ?? `ورقة ${rank} تمشي كرة بعدد خانات الورقة`;
    toast(`هذي الورقة ما لها حركة قانونية الحين (${rule}). اختر ورقة ثانية.`, true);
  },
  'jk-nomarble'() { toast('هذي الكرة ما تتحرك بالورقة المختارة. اختر كرة مضيئة، أو غيّر الورقة.', true); },
  'ludo-nomove'(el) {
    const g = currentRoom()?.game; if (!g || g.game !== 'ludo') return;
    const pi = g.players.indexOf(currentRoom().you); const prog = g.tokens[pi]?.[Number(el.dataset.t)]; const roll = g.roll;
    const why = prog === -1 ? `القطعة تطلع من البيت برقم 6 فقط (رميتك ${roll}).` : prog === 56 ? 'هذي القطعة وصلت للنهاية خلاص.' : prog + roll > 56 ? `ما تنزل النهاية إلا بالرقم المضبوط (رميتك ${roll} تتعدّاها).` : `هذي القطعة ما تتحرك بالرقم ${roll}.`;
    toast(why + ' اختر قطعة مضيئة.', true);
  },
  'jk-marble'(el) {
    const r = currentRoom();
    JK.marble = el.dataset.m;
    renderRoom(r.code, true);
  },
  'jk-menu'() { JK.menu = !JK.menu; if (roomUI.code) renderRoom(roomUI.code, true); },
  'ld-mode'(el) { HUB.setLdMode(el.dataset.m); render(); },
  'ld-info'() { JK.menu = false; JK.modeInfo = !JK.modeInfo; if (roomUI.code) renderRoom(roomUI.code, true); },
  /* ---------- الدومينو: الواجهة ترسل (القطعة، الطرف) أو السحب فقط؛ التحقق كله بالخادم ---------- */
  async 'dm-send'(action) {
    const r = activeGameRoom('domino'); const g = r?.game;
    if (!g) return;
    const token = DMV.beginAction(r); if (!token) return;
    const generation = roomRequestGeneration, owner = S.user?.id;
    renderRoom(r.code, true);
    const res = await req('game:action', { code: r.code, ver: g.ver, action }).catch(() => ({ ok: false, error: 'انقطع الاتصال، جرّب مرة ثانية.' }));
    if (generation !== roomRequestGeneration || owner !== S.user?.id || !DMV.finishAction(token, activeGameRoom('domino'))) return;
    if (!res.ok) { toast(res.error, true); renderRoom(r.code, true); return; }
    SFX.play('tap');
    afterRoomOk(res);
  },
  'dm-tile'(el) {
    const r = currentRoom(); const g = r?.game;
    if (!g || g.game !== 'domino' || g.phase !== 'play' || DMV.DM.busy) return;
    if (g.turnId !== r.you) return toast(`مو دورك. دور ${r.players.find((p) => p.id === g.turnId)?.name ?? 'الخصم'}.`, true);
    const id = el.dataset.id;
    const ends = [...new Set((g.moves || []).filter((m) => m.tile === id).map((m) => m.end))];
    if (!ends.length) {
      const why = !g.first && g.opening ? `لازم تفتح الجولة بالدبل ${g.opening.replace('-', '|')}.` : g.canDraw ? 'ما عندك قطعة تركب. اسحب من المخزن.' : g.ends ? `هذي القطعة ما تركب: الطرفان ${g.ends.L} و${g.ends.R}.` : 'هذي القطعة ما تنلعب الحين.';
      return toast(why, true);
    }
    if (ends.length === 1 || !g.first) return ACTIONS['dm-send']({ type: 'play', tile: id, end: ends[0] });
    DMV.DM.sel = DMV.DM.sel === id ? null : id;
    renderRoom(r.code, true);
  },
  'dm-slot'(el) {
    const id = DMV.DM.sel; if (!id) return;
    ACTIONS['dm-send']({ type: 'play', tile: id, end: el.dataset.end });
  },
  'dm-draw'() {
    const r = currentRoom(); const g = r?.game; if (!g || g.game !== 'domino') return;
    if (g.canDraw) return ACTIONS['dm-send']({ type: 'draw' });
    if (g.phase !== 'play') return;
    if (g.turnId !== r.you) return toast(`المخزن فيه ${g.stock} قطعة. تسحب منه بدورك لو ما عندك قطعة تركب.`);
    toast(g.stock ? 'عندك قطعة تركب، العبها بدل السحب.' : 'المخزن فاضي.', true);
  },
  'dm-menu'() { DMV.DM.menu = !DMV.DM.menu; if (roomUI.code) renderRoom(roomUI.code, true); },
  'dm-rules'() { DMV.DM.menu = false; DMV.DM.rules = !DMV.DM.rules; if (roomUI.code) renderRoom(roomUI.code, true); },
  /* ---------- المجتمع: الواجهة ترسل الطلب وتعرض رد الخادم (العدّ والصلاحيات من الخادم) ---------- */
  'cm-scope'(el) { COM.CM.feed.scope = el.dataset.s === 'following' ? 'following' : 'all'; COM.CM.feed.list = []; COM.CM.feed.loaded = false; render(); COM.loadFeed().then(render); },
  'cm-more'(el) { const more = !el.dataset.retry; COM.loadFeed(more).then(render); render(); },
  'cm-umore'() { const r = parseRoute(); COM.loadUser(r.a, true).then(render); render(); },
  'cm-notifs'() { COM.loadNotifs().then(render); render(); },
  async 'cm-like'(el) {
    if (!S.user) return toast('سجّل دخولك عشان تعجب بالمنشورات.', true);
    const id = Number(el.dataset.id); const k = 'l' + id; if (COM.CM.busy.has(k)) return;
    const on = el.getAttribute('aria-pressed') !== 'true';
    COM.CM.busy.add(k);
    const res = await COM.api(`post/${id}/like`, { method: 'POST', body: { on } });
    COM.CM.busy.delete(k);
    if (!res.ok) { toast(res.error, true); return render(); }
    cmPatchPost(id, { likes: res.likes, liked: res.liked }); render();
  },
  'cm-menu'(el) { COM.CM.menu = COM.CM.menu === el.dataset.k ? null : el.dataset.k; COM.CM.delAsk = null; render(); },
  'cm-edit'(el) { COM.CM.edit = Number(el.dataset.id); COM.CM.menu = null; render(); document.getElementById('ed' + el.dataset.id)?.focus(); },
  'cm-edit-x'() { COM.CM.edit = null; render(); },
  async 'cm-del'(el) {
    const id = Number(el.dataset.id);
    if (COM.CM.delAsk !== 'p' + id) { COM.CM.delAsk = 'p' + id; el.textContent = 'متأكد؟ اضغط للحذف نهائياً'; return; }
    COM.CM.delAsk = null; COM.CM.menu = null;
    const res = await COM.api('post/' + id, { method: 'DELETE', body: {} });
    if (!res.ok) return toast(res.error, true);
    toast('انحذف المنشور.');
    COM.CM.feed.list = COM.CM.feed.list.filter((p) => p.id !== id);
    if (COM.CM.user.data) COM.CM.user.data.posts = COM.CM.user.data.posts.filter((p) => p.id !== id);
    if (parseRoute().name === 'post') (globalThis.__LA3BAK_NAV__ || location).hash = '#/community'; else render();
  },
  async 'cm-cdel'(el) {
    const id = Number(el.dataset.id);
    if (COM.CM.delAsk !== 'c' + id) { COM.CM.delAsk = 'c' + id; el.textContent = 'متأكد؟ اضغط للحذف'; return; }
    COM.CM.delAsk = null; COM.CM.menu = null;
    const res = await COM.api('comment/' + id, { method: 'DELETE', body: {} });
    if (!res.ok) return toast(res.error, true);
    await COM.loadPost(COM.CM.post.id); render();
  },
  'cm-reply'(el) { COM.CM.post.reply = Number(el.dataset.id); render(); const t = document.getElementById('cmC'); t?.focus(); t?.scrollIntoView({ block: 'center' }); },
  'cm-reply-x'() { COM.CM.post.reply = null; render(); },
  'cm-report'(el) { COM.CM.menu = null; COM.CM.report = { kind: el.dataset.kind, id: Number(el.dataset.id), busy: false }; render(); },
  'cm-report-x'() { COM.CM.report = null; render(); },
  'cm-img-x'() { const D = COM.CM.draft; if (D.url) URL.revokeObjectURL(D.url); D.blob = null; D.url = ''; render(); },
  async 'cm-follow'(el) {
    const pub = el.dataset.pub; const k = 'f' + pub; if (COM.CM.busy.has(k)) return;
    COM.CM.busy.add(k); render();
    const res = await COM.api(`user/${pub}/follow`, { method: 'POST', body: { on: el.dataset.on === '1' } });
    COM.CM.busy.delete(k);
    if (!res.ok) { toast(res.error, true); return render(); }
    await COM.loadUser(pub); render();
  },
  async 'cm-rel'(el) {
    const { pub, k } = el.dataset; const on = el.dataset.on === '1';
    if (on && k === 'block' && el.dataset.sure !== '1') { el.dataset.sure = '1'; el.textContent = 'متأكد؟ اضغط مرة ثانية للحظر'; return; }
    const res = await COM.api(`user/${pub}/${k}`, { method: 'POST', body: { on } });
    if (!res.ok) return toast(res.error, true);
    toast(k === 'block' ? (on ? 'تم الحظر ⛔' : 'تم فك الحظر') : (on ? 'انخفت منشوراته عنك 🙈' : 'رجعت منشوراته تطلع لك 👁'));
    if (el.dataset.from === 'settings') { await COM.loadRelations(); return render(); }
    COM.CM.feed.loaded = false; await COM.loadUser(pub); render();
  },
  async 'cm-readall'() { const r = await COM.api('notifs/read', { method: 'POST', body: {} }); if (r.ok) { COM.CM.unread = r.unread; await COM.loadNotifs(); render(); } else toast(r.error, true); },
  'cm-nread'(el) { const id = Number(el.dataset.id); const href = el.getAttribute('href'); COM.api('notifs/read', { method: 'POST', body: { ids: [id] } }).then((r) => { if (r.ok) { COM.CM.unread = r.unread; updateTop(); } }); (globalThis.__LA3BAK_NAV__ || location).hash = href; },
  'home-cat'(el) { S.fCat = el.dataset.c; S.fQ = ''; (globalThis.__LA3BAK_NAV__ || location).hash = '#/games'; },
  'home-posts'() { loadHomePosts(); render(); },
  'dm-gift'() { openRoomGift(); },
  /* ---------- أونو: الواجهة ترسل (الورقة واللون) أو السحب/التمرير/الإعلان/الكشف/قرار +4؛ التحقق كله بالخادم ---------- */
  async 'un-send'(action) {
    const r = currentRoom(); const g = r?.game;
    if (!g || g.game !== 'uno' || UNV.UN.busy) return;
    UNV.UN.busy = true; renderRoom(r.code, true);
    const res = await req('game:action', { code: r.code, ver: g.ver, action }).catch(() => ({ ok: false, error: 'انقطع الاتصال، جرّب مرة ثانية.' }));
    UNV.UN.busy = false; UNV.UN.wild = null;
    if (!res.ok) { toast(res.error, true); renderRoom(r.code, true); return; }
    SFX.play(action.type === 'uno' || action.type === 'catch' ? 'win' : 'tap');
    afterRoomOk(res);
  },
  'un-card'(el) {
    const r = currentRoom(); const g = r?.game;
    if (!g || g.game !== 'uno' || UNV.UN.busy) return;
    if (g.phase !== 'play') return;
    if (g.turnId !== r.you) return toast(`مو دورك. دور ${r.players.find((p) => p.id === g.turnId)?.name ?? 'الخصم'}.`, true);
    const id = Number(el.dataset.id); const c = g.hand.find((k) => k.id === id); if (!c) return;
    if (!g.legal.includes(id)) {
      const why = g.needColor ? 'اختر لون البداية أول.' : g.drawn !== null ? 'تقدر تلعب الورقة اللي سحبتها بس، أو تمرّر.' : `هذي الورقة ما تطابق: اللون ${UNV.COLOR_NAME[g.color]} أو ${UNV.cardName(g.top)}.`;
      return toast(why, true);
    }
    if (c.c === 'w') { UNV.UN.wild = id; return renderRoom(r.code, true); }
    ACTIONS['un-send']({ type: 'play', card: id });
  },
  'un-wild'(el) { const id = UNV.UN.wild; if (id === null) return; ACTIONS['un-send']({ type: 'play', card: id, color: el.dataset.c }); },
  'un-wild-x'() { UNV.UN.wild = null; if (roomUI.code) renderRoom(roomUI.code, true); },
  'un-color'(el) { ACTIONS['un-send']({ type: 'color', color: el.dataset.c }); },
  'un-draw'() {
    const r = currentRoom(); const g = r?.game; if (!g || g.game !== 'uno') return;
    if (g.canDraw) return ACTIONS['un-send']({ type: 'draw' });
    if (g.phase !== 'play') return;
    if (g.turnId !== r.you) return toast(`بالرزمة ${g.drawCount} ورقة. تسحب منها بدورك.`);
    toast(g.drawn !== null ? 'سحبت خلاص: العب الورقة أو مرّر.' : 'اختر لون البداية أول.', true);
  },
  'un-pass'() { ACTIONS['un-send']({ type: 'pass' }); },
  'un-uno'() { ACTIONS['un-send']({ type: 'uno' }); },
  'un-catch'(el) { ACTIONS['un-send']({ type: 'catch', target: el.dataset.id }); },
  'un-accept'() { ACTIONS['un-send']({ type: 'accept' }); },
  'un-challenge'() { ACTIONS['un-send']({ type: 'challenge' }); },
  'un-menu'() { UNV.UN.menu = !UNV.UN.menu; if (roomUI.code) renderRoom(roomUI.code, true); },
  'un-rules'() { UNV.UN.menu = false; UNV.UN.rules = !UNV.UN.rules; if (roomUI.code) renderRoom(roomUI.code, true); },
  'un-gift'() { openRoomGift(); },
  /* ---------- كيرم: الواجهة ترسل (الموقع، الزاوية، القوة) والخادم يحاكي ويقرر ---------- */
  'cr-rules'() { CRV.CR.rules = !CRV.CR.rules; if (roomUI.code) renderRoom(roomUI.code, true); },
  'cr-gift'() { openRoomGift(); },
  /* ---------- مدينتي: كل النتائج من الخادم ---------- */
  'city-reload'() { if (CITY.CT.busy || CITY.CT.moving) return toast('انتظر اكتمال حركة المدينة.'); const ownerId = S.user?.id; CITY.load(req).then(() => { if (S.user?.id !== ownerId) return; if (!CITY.CT.err) CITY.CT.upgradeUncertain = false; cityPaint(); }); cityPaint(); },
  'city-mult'(el) { CITY.CT.mult = Number(el.dataset.v) || 1; render(); },
  'city-sheet'(el) { CITY.CT.sheet = el.dataset.v; render(); if (el.dataset.v === 'log' && CITY.CT.data?.unseen && !CITY.CT.busy && !CITY.CT.loading) { const ownerId = S.user?.id; CITY.CT.busy = true; req('city:seen').then((r) => { if (S.user?.id !== ownerId) return; CITY.CT.busy = false; if (r?.ok) CITY.CT.data = r.city; cityPaint(); }).catch(() => { if (S.user?.id === ownerId) { CITY.CT.busy = false; cityPaint(); } }); } },
  'city-close'() { CITY.CT.sheet = null; render(); },
  'city-tut-next'() { if (CITY.CT.tut >= 4) { CITY.CT.tut = 0; req('city:tut'); } else CITY.CT.tut++; render(); },
  'city-tut-skip'() { CITY.CT.tut = 0; req('city:tut'); render(); },
  async 'city-roll'(el) {
    const C = CITY.CT; const d = C.data; if (!d || C.busy || C.moving || C.loading) return;
    const op = cityRollOperation(C);
    if (!op) return toast(C.mult > 1 ? `المضاعف ×${C.mult} يحتاج ${C.mult} رميات.` : 'خلصت رمياتك. تتجدد رمية كل 8 دقائق.', true);
    C.busy = true; const generation = cityAnimationGeneration; cityPaint();
    const stop = CITY.rollingDice();
    const res = await req('city:roll', { mult: op.mult, key: op.key }).catch(() => null);
    stop(); if (S.user?.id !== op.ownerId || C.pendingRoll !== op) return;
    C.busy = false;
    if (!res?.ok) { if (cityRollRejected(res)) cityFinishRoll(C, op); toast(res?.error || 'انقطع الاتصال. اضغط ارمِ مرة ثانية بنفس الرمية.', true); return cityPaint(); }
    cityFinishRoll(C, op);
    C.data = res.city; C.dice = res.res.dice; C.last = res.res;
    if (generation !== cityAnimationGeneration || parseRoute().name !== 'city') { C.shownPos = C.data.pos; return; }
    C.moving = true; C.shownPos = res.res.from; cityPaint();
    SFX.play('tap');
    CITY.animateMove(res.res.path, () => { if (generation !== cityAnimationGeneration || S.user?.id !== op.ownerId) return; C.moving = false; C.shownPos = C.data.pos; cityPaint(); if (res.res.raid && !res.res.raid.blocked) SFX.play('win'); });
  },
  async 'city-up'(el) {
    const C = CITY.CT; if (C.busy || C.moving || C.loading) return;
    if (C.pendingRoll) return toast('أعد محاولة الرمية المعلّقة أول عشان نتأكد من نتيجتها.', true);
    if (C.upgradeUncertain) return toast('ما نقدر نأكد نتيجة الترقية السابقة. حدّث مدينتك من إعادة المحاولة قبل ما ترقي مرة ثانية.', true);
    if (el.getAttribute('aria-disabled')) return toast('ذهب المدينة ما يكفي لهذي الترقية.', true);
    const ownerId = S.user?.id; C.busy = true; el.disabled = true;
    const res = await req('city:up', { i: Number(el.dataset.i) }).catch(() => null);
    if (S.user?.id !== ownerId) return;
    C.busy = false; el.disabled = false;
    if (!res?.ok) { C.upgradeUncertain = true; toast(res?.error || 'انقطع الاتصال.', true); return cityPaint(); }
    C.data = res.city; toast(res.res.levelUp ? `🏆 مدينتك وصلت المستوى ${nf(res.city.level)}! +20 رمية` : 'تمت الترقية ⭐'); SFX.play(res.res.levelUp ? 'win' : 'tap'); cityPaint();
  },
  async 'city-claim'(el) {
    const C = CITY.CT; if (C.busy || C.loading) return;
    if (C.pendingRoll) return toast('أعد محاولة الرمية المعلّقة أول عشان نتأكد من نتيجتها.', true);
    const ownerId = S.user?.id; C.busy = true; el.disabled = true;
    const res = await req('city:claim', { mid: el.dataset.id }).catch(() => null);
    if (S.user?.id !== ownerId) return;
    C.busy = false; el.disabled = false;
    if (!res?.ok) return toast(res?.error || 'انقطع الاتصال.', true);
    C.data = res.city; toast('استلمت مكافأة المهمة ✔'); cityPaint();
  },
  'jk-help'() { JK.menu = false; JK.guide = false; JK.rules = !JK.rules; if (roomUI.code) renderRoom(roomUI.code, true); },
  'bl-guide'() { JK.menu = false; JK.rules = false; JK.guide = !JK.guide; if (roomUI.code) renderRoom(roomUI.code, true); },
  'jk-chat'() { if (CHAT.currentCode()) CHAT.toggle(); else toast('الردود السريعة تشتغل لما يكون معك لاعب حقيقي بالغرفة.'); },
  'jk-leave'(el) { JK.menu = false; return ACTIONS.leave(el); },
  'ludo-move'(el) {
    ACTIONS.sendAction({ type: 'move', token: Number(el.dataset.t) });
  },
  'jk-dest'(el) {
    const g = currentRoom()?.game;
    const m = g?.moves?.[Number(el.dataset.i)];
    if (!m) return;
    ACTIONS.sendAction({ type: 'play', card: m.card, owner: m.owner, marble: m.marble, to: m.to, ...(m.target ? { target: m.target } : {}) });
  },
  async sendAction(action) {
    const r = currentRoom();
    if (!r?.game) return;
    const res = await req('game:action', { code: r.code, ver: r.game.ver, action });
    if (!res.ok) toast(res.error, true);
    else afterRoomOk(res);
  },
  async play(el) {
    const r = currentRoom();
    if (!r?.game || el.disabled) return;
    if (r.game.game === 'minaboli') {
      if (activeGameRoom('minaboli') !== r || r.you !== S.user?.id) return;
      const payload=MNV.action(el,r);
      if (!payload) return;
      const token=MNV.beginAction(r);
      if (!token) return;
      const owner=S.user.id,generation=roomRequestGeneration,route=(globalThis.__LA3BAK_NAV__ || location).hash,ws=S.ws;
      const res=await req('game:action',payload).catch(()=>({ok:false,error:'انقطع الاتصال، جرّب مرة ثانية.'}));
      const current=activeGameRoom('minaboli');
      if (owner!==S.user?.id || generation!==roomRequestGeneration || route!==(globalThis.__LA3BAK_NAV__ || location).hash || ws!==S.ws || !current || current.code!==r.code || current.gameNo!==r.gameNo || current.you!==r.you) { MNV.finishAction(token,current||r); return; }
      if (!MNV.finishAction(token,current,res.error||'')) return;
      // Never replace a newer push or another room/game/identity with a reply.
      if (res.room && (res.room.code!==current.code || res.room.gameNo!==current.gameNo || res.room.you!==current.you || res.room.game?.game!=='minaboli' || res.room.game.ver<current.game.ver)) return;
      if (!res.ok) toast(res.error,true);
      else afterRoomOk(res);
      return;
    }
    let action;
    try {
      action = JSON.parse(el.dataset.a);
    } catch {
      return;
    }
    el.disabled = true;
    const res = await req('game:action', { code: r.code, ver: r.game.ver, action });
    if (!res.ok) {
      toast(res.error, true);
      el.disabled = false;
    } else afterRoomOk(res);
  },
  back: (el) => { const nav = globalThis.__LA3BAK_NAV__; if (nav?.back) nav.back(el.dataset.href || '#/'); else location.hash = el.dataset.href || '#/'; },
  async copy() {
    const code = currentRoom()?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast('اننسخ الرمز: ' + code);
    } catch {
      const t = document.createElement('textarea');
      t.value = code;
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand('copy');
        toast('اننسخ الرمز: ' + code);
      } catch {
        toast('انسخ الرمز يدوياً: ' + code);
      }
      t.remove();
    }
  },
  async share() {
    const code = currentRoom()?.code;
    if (!code) return;
    const url = `${location.origin}/#/join/${code}`;
    const text = `تعال العب معي في «لعبك». رمز الغرفة: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'لعبك', text, url });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast('اننسخ رابط الدعوة');
    } catch {
      toast('الرابط: ' + url);
    }
  },
  async ready() {
    const r = currentRoom();
    const me = r?.players.find((p) => p.id === r.you);
    afterRoomOk(await req('room:ready', { code: r.code, ready: !me?.ready }));
  },
  async start() {
    afterRoomOk(await req('room:start', { code: currentRoom().code }));
  },
  async rematch() {
    afterRoomOk(await req('room:rematch', { code: currentRoom().code }));
  },
  async leave() {
    const r = currentRoom();
    try {
      if (r?.status === 'playing') PF.recordLeftEarly(r);
    } catch {
      /* تجاهل */
    }
    const res = await req('room:leave', { code: r.code });
    if (!res.ok) return toast(res.error, true);
    S.rooms.delete(r.code);
    (globalThis.__LA3BAK_NAV__ || location).hash = '#/rooms';
  },
  async delete(el) {
    if (el.dataset.armed !== '1') {
      el.dataset.armed = '1';
      el.textContent = 'اضغط مرة ثانية للتأكيد';
      setTimeout(() => {
        el.dataset.armed = '';
        el.textContent = 'حذف الغرفة';
      }, 4000);
      return;
    }
    const r = currentRoom();
    const res = await req('room:delete', { code: r.code });
    if (!res.ok) return toast(res.error, true);
    S.rooms.delete(r.code);
    (globalThis.__LA3BAK_NAV__ || location).hash = '#/rooms';
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (e.target.classList?.contains('modal-back') && !(el && ACTIONS[el.dataset.act])) return PWA.closeDialog();
  if (e.target.closest('button, a.btn, .bnav a, .mode-card')) SFX.play('tap');
  if (el && ACTIONS[el.dataset.act]) {
    e.preventDefault();
    ACTIONS[el.dataset.act](el, e);
  }
});

let gqT = 0;
document.addEventListener('input', (e) => {
  if (e.target?.id === 'gq2') {
    const q = e.target.value.trim(); clearTimeout(gqT);
    if (q.length < 2) { GIFT.G.q = q; GIFT.G.results = null; const r0 = document.getElementById('gres'); if (r0) r0.innerHTML = GIFT.resultsHTML(); return; }
    gqT = setTimeout(async () => { const ok = await GIFT.find(req, q); const r1 = document.getElementById('gres'); if (ok && r1) r1.innerHTML = GIFT.resultsHTML(); }, 300);
  }
  if (e.target.matches?.('[data-of]')) OFF.onInput(e.target);
  if (e.target?.id === 'gsq') {
    GIFT.G.q = e.target.value; GIFT.G.limit = 48; const pos = e.target.selectionStart;
    GIFT.repaint(render); const q = document.getElementById('gsq'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch { /* */ } }
  }
  if (e.target?.id === 'cmText') { COM.CM.draft.text = e.target.value; const c = document.getElementById('cmCount'); if (c) c.textContent = `${nf(e.target.value.length)}/${nf(COM.LIMITS.post)}`; }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') PWA.closeDialog();
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.matches?.('[data-change="gs-sort"]')) { GIFT.G.sort = el.value; GIFT.repaint(render); return; }
  if (el.matches?.('[data-change="shop-sort"]')) { SHOP.SH.f.sort = el.value; SHOP.SH.lim = 24; render(); return; }
  if (el.matches?.('input[data-cm-file]')) {
    const D = COM.CM.draft; const t = document.getElementById('cmText'); if (t) D.text = t.value;
    const out = await COM.prepareImage(el.files?.[0]); el.value = '';
    if (out.error) return toast(out.error, true);
    if (D.url) URL.revokeObjectURL(D.url);
    D.blob = out.blob; D.url = URL.createObjectURL(out.blob); return render();
  }
  if (el.matches?.('[data-change="pickgame"]')) {
    S.pickGame = el.value;
    const g = S.games.find((x) => x.id === el.value);
    const box = $('#createBox');
    if (g && box) box.innerHTML = createFormHTML(g);
    return;
  }
  if (el.matches?.('[data-change="game"]')) {
    const r = currentRoom();
    const res = await req('room:setGame', { code: r.code, gameId: el.value });
    if (!res.ok) {
      toast(res.error, true);
      renderRoom(r.code, true);
    } else afterRoomOk(res);
  }
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (!el.matches?.('input[data-backup]')) return;
  const res = await BK.importFile(el.files?.[0]);
  el.value = '';
  if (!res.ok) return toast(res.error, true);
  toast(`رجّعنا ${res.n} من بيانات تقدمك.`);
  setTimeout(() => location.reload(), 900);
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset?.cat) {
    const r = currentRoom();
    if (!r) return;
    const k = draftKey(r);
    (S.drafts[k] ||= {})[el.dataset.cat] = el.value;
  }
});

document.addEventListener('keydown', (e) => {
  const el = e.target;
  if (e.key === 'Enter' && el.dataset?.cat) {
    e.preventDefault();
    const all = $$('[data-cat]');
    const i = all.indexOf(el);
    if (i < all.length - 1) all[i + 1].focus();
    else el.closest('form')?.requestSubmit();
  }
});

async function cmSubmit(kind, form, btn) {
  const C = COM.CM;
  if (kind === 'cm-post') {
    const D = C.draft; if (D.busy) return;
    D.text = form.text.value;
    if (!D.text.trim() && !D.blob) return toast('اكتب شي أو أضف صورة.', true);
    D.busy = true; render();
    let media;
    if (D.blob) {
      const up = await COM.api('media', { method: 'POST', raw: D.blob, type: D.blob.type });
      if (!up.ok) { D.busy = false; render(); return toast(up.error, true); }
      media = up.media;
    }
    const r = await COM.api('posts', { method: 'POST', body: { text: D.text, media } });
    D.busy = false;
    if (!r.ok) { render(); return toast(r.error, true); }
    if (D.url) URL.revokeObjectURL(D.url);
    Object.assign(D, { text: '', blob: null, url: '' });
    if (C.feed.scope === 'all' || C.feed.scope === 'following') C.feed.list = [r.post, ...C.feed.list.filter((p) => p.id !== r.post.id)];
    toast('انتشر منشورك ✨'); return render();
  }
  if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
  try {
    if (kind === 'cm-edit') {
      const id = Number(form.dataset.id);
      const r = await COM.api('post/' + id, { method: 'PATCH', body: { text: form.text.value } });
      if (!r.ok) return toast(r.error, true);
      C.edit = null; cmPatchPost(id, r.post); render();
    } else if (kind === 'cm-comment') {
      const id = Number(form.dataset.id);
      const r = await COM.api(`post/${id}/comments`, { method: 'POST', body: { text: form.text.value, parent: C.post.reply ?? undefined } });
      if (!r.ok) return toast(r.error, true);
      C.post.reply = null; await COM.loadPost(id); cmPatchPost(id, { comments: r.comments }); render();
      document.getElementById('c' + r.comment.id)?.scrollIntoView({ block: 'center' });
    } else if (kind === 'cm-report') {
      const R = C.report; if (!R || R.busy) return;
      R.busy = true;
      const r = await COM.api('report', { method: 'POST', body: { kind: R.kind, id: R.id, reason: form.reason.value, note: form.note.value } });
      R.busy = false;
      if (!r.ok) return toast(r.error, true);
      C.report = null; render(); toast(r.dup ? 'بلّغت عن هذا من قبل، والبلاغ قيد المراجعة.' : 'وصل بلاغك للإدارة. شكراً 🙏');
    }
  } finally { if (btn?.isConnected) { btn.disabled = false; btn.removeAttribute('aria-busy'); } }
}

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  const btn = form.querySelector('button[type=submit]');

  if (kind.startsWith('cm-')) return cmSubmit(kind, form, btn);
  if (kind === 'shop-convert') return toast('التحويل اليدوي بين العملات والجواهر مقفول بالاتجاهين.',true);
  if (kind === 'home-search') { S.fQ = form.q.value.trim(); S.fCat = 'all'; (globalThis.__LA3BAK_NAV__ || location).hash = '#/games'; return; }
  if (kind === 'name') {
    const name = form.name.value.trim();
    if (name.length < 2) return toast('اكتب اسم من حرفين على الأقل.', true);
    btn.disabled = true;
    const wasUser = !!S.user;
    try {
      const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await r.json();
      if (!r.ok) return toast(data.error || 'ما انحفظ الاسم.', true);
      S.user = data.user;
      if (S.ws) {
        S.ws.onclose = null;
        S.ws.close();
        S.ws = null;
      }
      S.online = false;
      S.helloDone = false;
      connect();
      updateConn();
      const first = !wasUser;
      toast(first ? 'أهلاً ' + data.user.name : 'تم حفظ شخصيتك');
      const next = S.next || (first ? '#/games' : null);
      S.next = null;
      if (next) (globalThis.__LA3BAK_NAV__ || location).hash = next;
      else render();
    } catch {
      toast('ما قدرنا نتصل بالخادم.', true);
    } finally {
      btn.disabled = false;
    }
    return;
  }

  if (!S.user) {
    S.next = (globalThis.__LA3BAK_NAV__ || location).hash;
    (globalThis.__LA3BAK_NAV__ || location).hash = '#/profile';
    return;
  }

  if (kind === 'create') {
    const owner=S.user?.id,generation=roomRequestGeneration;
    const mode = form.querySelector('input[name=mode]:checked')?.value;
    btn.disabled = true;
    if (form.dataset.game === 'ludo' && !HUB.ldPlayable()) { btn.disabled = false; return toast('هذا الوضع قيد التطوير. اختر «كلاسيكي» من صفحة لودو عشان تلعب.', true); }
    const res = await req('room:create', { gameId: form.dataset.game, mode, seats: Number(form.seats.value), visibility:form.elements.visibility.value, password:form.elements.password.value, ...(form.dataset.game === 'ludo' ? { variant: HUB.ldMode() } : {}) });
    btn.disabled = false;
    if(owner!==S.user?.id||generation!==roomRequestGeneration)return;
    if (!res.ok) return toast(res.error, true);
    S.rooms.set(res.room.code, res.room);
    (globalThis.__LA3BAK_NAV__ || location).hash = '#/room/' + res.room.code;
  } else if (kind === 'join') {
    const owner=S.user?.id,generation=roomRequestGeneration;
    const code = normalizeCode(form.code.value);
    if (!CODE_RE.test(code)) return toast('الرمز غلط. الرمز خمس خانات من حروف إنجليزية وأرقام.', true);
    btn.disabled = true;
    const res = await req('room:join', { code, password:form.elements.password.value });
    btn.disabled = false;
    if(owner!==S.user?.id||generation!==roomRequestGeneration)return;
    if (!res.ok) return toast(res.error, true);
    S.rooms.set(res.room.code, res.room);
    (globalThis.__LA3BAK_NAV__ || location).hash = '#/room/' + res.room.code;
  } else if (kind === 'gform') {
    const r = currentRoom();
    if (!r?.game) return;
    const action = { type: form.dataset.type };
    const nums = (form.dataset.nums || '').split(',');
    for (const [k, v] of new FormData(form)) action[k] = nums.includes(k) ? Number(v) : String(v);
    if (btn) btn.disabled = true;
    const res = await req('game:action', { code: r.code, ver: r.game.ver, action });
    if (btn) btn.disabled = false;
    if (!res.ok) toast(res.error, true);
    else afterRoomOk(res);
  } else if (kind === 'answers') {
    const r = currentRoom();
    if (r) submitAnswers(r);
  }
});

for (const name of OFF.ACTION_NAMES) ACTIONS[name] = (el) => OFF.handle(name, el, render);

window.addEventListener('hashchange', render);
// R58y: الدخول للملف من الغرفة (أو أي صفحة ما تحمّل المتجر) كان يخلي رف «تذكاراتي» فاضي لين تحديث الصفحة؛ نحمّل بيانات المتجر أول ما يفتح الملف
window.addEventListener('hashchange', () => { try { if (S.user && S.helloDone && !SHOP.SH.data && !SHOP.SH.loading && parseRoute().name === 'profile') SHOP.load(req).then(() => { if (parseRoute().name === 'profile') render(); }); } catch { /* المتجر يتحمّل بعدين */ } });

/* ---------------- الإقلاع ---------------- */
/* الخطوط تنحمّل بعد ما تظهر الصفحة، عشان بطء الشبكة ما يوقف العرض */
function loadFonts() {
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Lalezar&display=swap';
  document.head.appendChild(l);
}

async function boot() {
  initStatus();
  loadFonts();
  try {
    const [me, games] = await Promise.all([fetch('/api/me').then((r) => r.json()), fetch('/api/games').then((r) => r.json())]);
    S.user = me.user;
    S.google = !!me.google; S.guestReadOnly = !!me.guestReadOnly; if (me.guestLockAt) guestGraceNotice(Number(me.guestLockAt));
    S.games = visibleGameCatalogue(games.games);
    S.categories = games.categories || [];
  } catch {
    toast(navigator.onLine === false ? 'ما فيه إنترنت. اللعب على نفس الجهاز يشتغل بدون اتصال.' : 'ما قدرنا نحمّل الموقع، حدّث الصفحة.', true);
  }
  updateConn();
  render();
  connect();
}
window.addEventListener('qa-toast', (e) => toast(e.detail));
if (typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener?.('voiceschanged', () => { if (['offline', 'daily'].includes(parseRoute().name) && OFF.O.game) render(); });
// This separate review entry does not register/change the original PWA worker.

// boot moved after review-entry constants


/* إخفاء الشريط السفلي أثناء الكتابة (لوحة المفاتيح) حتى لا يغطي الحقول */
{
  const typing = (el) => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !['checkbox', 'radio', 'button', 'submit', 'range', 'file'].includes(el.type);
  document.addEventListener('focusin', (e) => { if (typing(e.target)) document.documentElement.classList.add('kb-open'); });
  document.addEventListener('focusout', () => setTimeout(() => { if (!typing(document.activeElement)) document.documentElement.classList.remove('kb-open'); }, 50));
}

document.addEventListener('input', (e) => { if (e.target?.id === 'gq') { S.fQ = e.target.value; applyGameFilter(); } });

const REF_STATE = {rankings:null, rankingsLoading:false, rankingsError:'', rankGame:'all', online:null, notices:[], siteConfig:{}, loaded:false};
// Read-only profile sections reuse existing community identity and wallet receipts.
// A late reply cannot populate another account's history or move another route.
const PROFILE_GIFT_LOG = {owner:null,log:null,logErr:'',loading:false,generation:0};
function profileGiftDirection() {
 const route=parseRoute();
 return ['profile','account'].includes(route.name)&&route.a==='gifts'&&['received','sent'].includes(route.b)?route.b:null;
}
async function loadProfileGiftHistory() {
 const owner=S.user?.id,route=(globalThis.__LA3BAK_NAV__ || location).hash;
 if(!owner||isCommunityRestricted()||!profileGiftDirection())return;
 const generation=++PROFILE_GIFT_LOG.generation;
 Object.assign(PROFILE_GIFT_LOG,{owner,log:null,logErr:'',loading:true});
 const result=await req('gift:log').catch(()=>({ok:false,error:'تعذّر تحميل سجل الهدايا. حاول مرة ثانية.'}));
 if(owner!==S.user?.id||generation!==PROFILE_GIFT_LOG.generation)return;
 PROFILE_GIFT_LOG.loading=false;
 if(result.ok&&Array.isArray(result.received)&&Array.isArray(result.sent))PROFILE_GIFT_LOG.log={received:result.received,sent:result.sent};
 else PROFILE_GIFT_LOG.logErr=result.error||'تعذّر تحميل سجل الهدايا. حاول مرة ثانية.';
 if((globalThis.__LA3BAK_NAV__ || location).hash===route)render();
}
async function openOwnPosts(which) {
 const owner=S.user?.id,route=(globalThis.__LA3BAK_NAV__ || location).hash;
 if(!owner){toast('سجّل الدخول أولًا.',true);return;}
 if(isCommunityRestricted()){toast('المجتمع مقفل من إعدادات ولي الأمر.',true);return;}
 const result=await COM.api('me');
 if(owner!==S.user?.id||(globalThis.__LA3BAK_NAV__ || location).hash!==route)return;
 if(result.ok&&typeof result.pub==='string'&&/^[A-Za-z0-9_-]{16}$/.test(result.pub))(globalThis.__LA3BAK_NAV__ || location).hash='#/u/'+encodeURIComponent(result.pub)+(['followers','following'].includes(which)?'/'+which:'');
 else toast(result.error||'تعذّر فتح منشوراتك. حاول مرة ثانية.',true);
}

function referenceFace(size=48) {
 const me=ACCT.me, eq=me?.equipped;
 if(eq?.avatar) return previewArt(AVR.avatarArt(eq.avatar.id,size,eq.avatar.css==='av2'?undefined:eq.avatar.css) || PF.avatarHTML(PF.sanitize(PF.load()),size));
 return me?.avatar ? PF.photoHTML(size,me.avatar,me.name) : PF.avatarHTML(PF.sanitize(PF.load()),size);
}
function referenceContext() {
 const ownMe=S.user&&ACCT.ownerId===S.user.id?ACCT.me:null;
 return {user:S.user, me:ownMe,walletOwnerId:ownMe?ACCT.ownerId:null,coins:ownMe?(typeof S.coins==='number'?S.coins:ownMe.coins):undefined,
 gems:ownMe?.gems, games:S.games,categories:S.categories,
 posts:HOMEP.posts,postsLoading:HOMEP.loading,postsError:HOMEP.err,
 rankings:REF_STATE.rankings,rankingsLoading:REF_STATE.rankingsLoading,rankingsError:REF_STATE.rankingsError,
 rankGame:REF_STATE.rankGame,online:REF_STATE.online,connected:S.online,unread:COM.CM.unread,notices:REF_STATE.notices,
 season:SEASON.season(),noCommunity:isCommunityRestricted(),shopData:SHOP.SH.data,siteConfig:REF_STATE.siteConfig,
 gameIco,avatarHTML:referenceFace,onAction:referenceAction,toast};
}
async function referenceRank(game='all') {
 REF_STATE.rankGame=game; REF_STATE.rankingsLoading=true;REF_STATE.rankingsError='';
 try {const res=await fetch('/api/rankings?game='+encodeURIComponent(game),{cache:'no-store'});if(!res.ok) throw Error('تعذّر تحميل الترتيب.');REF_STATE.rankings=await res.json();}
 catch(e){REF_STATE.rankingsError=e.message;REF_STATE.rankings=null;}
 REF_STATE.rankingsLoading=false;if(parseRoute().name==='home') render();
}
async function loadReferenceHome() {
 referenceRank(REF_STATE.rankGame);
 try {const res=await fetch('/api/online',{cache:'no-store'});if(res.ok)REF_STATE.online=await res.json();} catch {}
 try {const res=await fetch('/api/status',{cache:'no-store'});if(res.ok)REF_STATE.notices=(await res.json()).notices||[];} catch {}
 try {const res=await fetch('/preview/site-config.json',{cache:'no-store'});if(res.ok)REF_STATE.siteConfig=await res.json();} catch {}
 REF_STATE.loaded=true;if(parseRoute().name==='home') render();
}
function referenceAction(action,value) {
 if(action==='self-posts')return openOwnPosts();
 if(action==='self-follows'&&['following','followers'].includes(value))return openOwnPosts(value);
 if(action==='gift-log'){
  value=({incoming:'received',outgoing:'sent'}[value]||value);
  if(!S.user){toast('سجّل الدخول أولًا.',true);return;}
  if(isCommunityRestricted()){toast('الهدايا مقفلة من إعدادات ولي الأمر.',true);return;}
  if(['received','sent'].includes(value))(globalThis.__LA3BAK_NAV__ || location).hash='#/profile/gifts/'+value;
  return;
 }
 if(action==='gift-log-retry')return loadProfileGiftHistory();
 if(action==='rank') return referenceRank(value);
 if(['friends','messages','missions','verification','rank-rewards','notifications-internal','settings','support'].includes(action)){(globalThis.__LA3BAK_NAV__ || location).hash='#/'+action;return;}
 if(action==='shop') {SHOP.SH.tab=value;SHOP.SH.own=false;(globalThis.__LA3BAK_NAV__ || location).hash='#/shop';if(parseRoute().name==='shop'){SHOP.load(req).then(render);render();}return;}
 if(action==='profile'){PR.openInventory?.(value);(globalThis.__LA3BAK_NAV__ || location).hash='#/profile';render();return;}
 if(action==='category'){S.fCat=value;S.fMode='all';S.fQ='';(globalThis.__LA3BAK_NAV__ || location).hash='#/games';return;}
}
document.addEventListener('click',(event)=>{
 const target=event.target.closest?.('[data-preview-shop],[data-preview-profile]');if(!target)return;
 event.preventDefault();
 if(target.dataset.previewShop!==undefined)referenceAction('shop',target.dataset.previewShop);
 else referenceAction('profile',target.dataset.previewProfile);
},true);
function referenceInfoPage(name) {
 const content={
tournaments:['البطولات','نظام إدارة البطولات والتسجيل فيها مب موجود في هالنسخة. ما بنعرض بطولات أو جوائز غير حقيقية. تقدر تلعب في الغرف الحالية وتتابع ترتيب نتائجك.','العب مع الأصدقاء','#/rooms'],
 events:['الأخبار والفعاليات',SEASON.season()?.text || 'ما فيه فعالية موسمية حالية معلنة في هالنسخة. منشورات المجتمع والتحدي اليومي متوفرة فعلًا.','تحدي اليوم','#/daily'],
 support:['المساعدة والدعم','لإنشاء غرفة: افتح الألعاب، اختر لعبتك ثم أنشئ غرفة وشارك رمزها. لتغيير مظهرك: افتح المتجر ثم مقتنياتي وجهّز العنصر المملوك. تفاصيل سياسة الحساب والتواصل المعلنة موجودة في صفحة من نحن.','من نحن','#/about'],
 contact:['اتصل بنا','ما تمت تهيئة قناة دعم خارجية موثقة في إعدادات هالنسخة. ما بنحط بريد أو رابط تواصل من عندنا. تقدر تراجع معلومات المشروع وقنواته المعلنة من صفحة من نحن.','من نحن','#/about']
 }[name];
 return `<section class="pv-information"><h1>${content[0]}</h1><p>${esc(content[1])}</p><a class="btn" href="${content[3]}">${content[2]}</a><a class="btn ghost" href="#/">رجوع للرئيسية</a></section>`;
}

let previewIdentityBusy=false;
function previewArt(html){return String(html||'').replace(/\/assets\/reference\/(ref-[pk]-(?:av|frame|badge|title)-\d+)\.webp/g,'/preview/assets/cosmetics/$1.png').replaceAll('/assets/reference/','/preview/assets/cosmetics/');}
function closePreviewSocket() {
 PROFILE_GIFT_LOG.generation++;Object.assign(PROFILE_GIFT_LOG,{owner:null,log:null,logErr:'',loading:false});
 destroyGameVoiceUI();gameVoiceBindings.clear();gameVoicePending.clear();
 void leaveSocial();lastSocialIdentity=null;
 socialGiftStore?.destroy();socialGiftStore=null;socialGiftOwner='';
 if(S.ws){S.ws.onclose=null;S.ws.onmessage=null;S.ws.close();S.ws=null;}
 S.online=false;S.helloDone=false;
 for(const [,cb] of S.pending)cb({ok:false,uncertain:true,error:'تغيّرت جلسة الحساب؛ أعد المحاولة.'});S.pending.clear();
 roomRequestGeneration++;DMV.DM.pending=null;DMV.DM.busy=false;CRV.CR.busy=false;
 cityAnimationGeneration++;CITY.CT.data=null;CITY.CT.shownPos=null;CITY.CT.last=null;CITY.CT.key=null;CITY.CT.pendingRoll=null;CITY.CT.busy=false;CITY.CT.moving=false;
 CITY.CT.upgradeUncertain=false;
 S.rooms.clear();HUB.reset();
}
async function adoptPreviewSession(j,to='#/profile') {
 closePreviewSocket();S.user=j.user;S.google=!!j.google;S.coins=undefined;
 ACCT.me=null;ACCT.ownerId=null;ACCT.err='';SHOP.SH.preview=null;SHOP.SH.confirm=null;SHOP.SH.try={};SHOP.SH.busy=false;storePreviewOrigin=null;SHOP.SH.data=null;SHOP.SH.err='';SHOP.invalidateLedger();COM.CM.me=null;COM.CM.unread=0;
 (globalThis.__LA3BAK_NAV__ || location).hash=to;connect();await loadAcct();render();
}
async function previewLogout() {
 if(previewIdentityBusy)return {ok:false,error:'انتظر اكتمال تغيير الجلسة.'};previewIdentityBusy=true;
 try {
  if(S.user&&!S.google&&!window.confirm('هذا حساب ضيف غير مربوط بـ Google. إذا طلعت ما تقدر ترجع له بالاسم وحده. تبي تسجّل الخروج؟'))return {ok:false,error:'تم إلغاء تسجيل الخروج.'};
  await AUTH.logout();closePreviewSocket();S.user=null;S.google=false;S.coins=undefined;
  ACCT.me=null;ACCT.ownerId=null;ACCT.err='';SHOP.SH.preview=null;SHOP.SH.confirm=null;SHOP.SH.try={};SHOP.SH.busy=false;storePreviewOrigin=null;SHOP.SH.data=null;SHOP.SH.err='';SHOP.invalidateLedger();COM.CM.me=null;COM.CM.unread=0;
  (globalThis.__LA3BAK_NAV__ || location).hash='#/profile';render();toast('تم تسجيل الخروج من هالجهاز.');
  return {ok:true};
 }catch(e){toast(e.message,true);return {ok:false,error:e.message};}finally{previewIdentityBusy=false;}
}
async function previewEquip(item,slot,remove=false) {
 if(!S.user)return {ok:false,error:'سجّل الدخول أولًا.'};
 const result=await req('shop:equip',remove?{item:null,slot}:{item});
 if(result.ok){SHOP.apply(result);await loadAcct();render();}
 return result;
}
async function previewRename(name) {
 try {const response=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});const j=await response.json();if(!response.ok)return {ok:false,error:j.error||'تعذّر حفظ الاسم.'};
  const oldGoogle=S.google;await adoptPreviewSession({...j,google:oldGoogle},'#/profile');return {ok:true,user:j.user};
 }catch{return {ok:false,error:'تعذّر الاتصال؛ ما نقدر نأكد حفظ الاسم.'};}
}
async function previewPresentation(update) {
 try {const response=await fetch('/api/account',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(update)});const j=await response.json();if(!response.ok)return {ok:false,error:j.error||'تعذّر حفظ الملف.'};await loadAcct();return j;
 }catch{return {ok:false,error:'تعذّر الاتصال؛ ما نقدر نأكد حفظ الملف.'};}
}
function profileContext() {
 return {...referenceContext(),accountSettings:S.accountSettings,refreshAccountSettings:async()=>{const owner=S.user?.id;if(!owner)throw Error('سجل دخولك أولًا.');const response=await functionalApi('/api/account-tools/settings');const settings=response.settings||response;if(S.user?.id!==owner)throw Error('تغير الحساب أثناء التحميل.');applyAccountSettings(settings);return settings;},updateAccountSettings:async patch=>{const owner=S.user?.id;if(!owner)throw Error('سجل دخولك أولًا.');const before=await functionalApi('/api/account-tools/settings');if(S.user?.id!==owner)throw Error('تغير الحساب قبل الحفظ.');const response=await functionalApi('/api/account-tools/settings','PATCH',{...(before.settings||before),...patch});const settings=response.settings||response;if(typeof settings.hideChatEffects!=='boolean')throw Error('تعذر تأكيد إعداد المؤثرات.');if(S.user?.id!==owner)throw Error('تغير الحساب أثناء الحفظ.');S.accountSettings=settings;return settings;},loading:ACCT.loading,error:ACCT.err,google:S.google,
  playerId:ACCT.me?.playerId ?? null,pickPhoto:()=>AVT.pick(),
  friendsCount:ACCT.me?.friendsCount, verified:ACCT.me?.verified,
  profileBridges:{selfPosts:true,giftLog:true},
  giftLogDirection:profileGiftDirection(),
  giftLogHTML:profileGiftDirection()&&S.user&&!isCommunityRestricted()?GIFT.logHTML(profileGiftDirection(),PROFILE_GIFT_LOG.owner===S.user.id?PROFILE_GIFT_LOG:{log:null,logErr:''}):'',
  giftLogError:PROFILE_GIFT_LOG.owner===S.user?.id?PROFILE_GIFT_LOG.logErr:'',
  googleCard:()=>googleCard(S.google),render,api:functionalApi,refreshMe:()=>loadAcct(false),equip:previewEquip,rename:previewRename,
  savePresentation:previewPresentation,logout:previewLogout,
  framed:(face,frame,size)=>previewArt(SHOP.framed(typeof frame==='string'?frame:frame?.css||frame?.id,face,size||'lg')),
  bgHTML:(bg)=>previewArt(SHOP.bgLayer(typeof bg==='string'?bg:(/^bg_\d{2}$/.test(bg?.id??'')?bg:bg?.css||bg?.id))),
  onAction:(action,value)=>{if(action==='inventory'){PR.openInventory?.(value);render();}else return referenceAction(action,value);}};
}
window.addEventListener('focus',()=>{if(S.user&&S.helloDone&&!document.activeElement?.closest('.pv-profile-editor')){loadAcct();if(['profile','account','shop'].includes(parseRoute().name))SHOP.load(req).then(render);}});

boot();
