/* R12 social benefits. Auth, room membership, prices, awards and balances remain server-owned.
 * API adapter: api(path, method, body?, {signal}?). See reports/lucky-bag-frontend-report.md.
 * R13 prepaid redemption displays only supplied server reward quotes; no wallet mutation. */
import { giftArt } from './giftart.js?v=release-r14';
import { giftRewardQuote, giftRewardEventQuote, giftRewardCard } from './gift-reward-ui.js?v=r63a';
import { frameArt, isFrame2, bgArt, isBg2 } from './cosmetics.js?v=r67ac';
import { avatarArt } from './avatars.js?v=r67ac';
import { backgroundVisual, isSuppliedBackground } from './background-art.js?v=r58p';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr = value => Array.isArray(value) ? value : [];
const positive = value => Number.isSafeInteger(value) && value > 0;
const amount = value => Number.isSafeInteger(value) && value >= 0;
const PRICE_MAX = Object.freeze({coins:1_000_000,gems:100_000}); // Existing Wallet limits, never a new price.
const creditId = gift => ID(gift?.creditId) || ID(gift?.id);
const remainingCount = bag => amount(bag?.remaining) ? bag.remaining : bag?.remainingCount;
const claimedByMe = bag => bag?.claimed === true || bag?.claimedByMe === true;
const claimedCount = bag => amount(bag?.claimedCount) ? bag.claimedCount : amount(bag?.count) && amount(remainingCount(bag)) ? bag.count - remainingCount(bag) : null;
const number = value => amount(value) ? value.toLocaleString('ar-EG-u-nu-latn') : 'غير متاح';
const intInput = value => /^\d+$/.test(String(value)) && positive(Number(value)) ? Number(value) : null;
const ID = value => typeof value === 'string' && value.length > 0 && value.length <= 160 ? value : '';
const publicId = member => ID(member?.publicId) || ID(member?.id);
const timeMs = value => { if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null; if (typeof value !== 'string' || !value) return null; const result = Date.parse(value); return Number.isFinite(result) ? result : null; };
const datetime = value => { const ts = timeMs(value); return ts === null ? '<span>وقت الخادم غير متاح</span>' : `<time datetime="${new Date(ts).toISOString()}">${esc(new Date(ts).toLocaleString('ar-EG-u-nu-latn', {dateStyle:'short',timeStyle:'medium'}))}</time>`; };
const currencyName = () => 'عملة';
/* R63: عملة وحدة — رصيد الجواهر بالخادم يتحول تلقائيًا من العملات (جوهرة = 20 عملة). هنا: رصيد بوحدة الجواهر للمقارنة، والعرض بالعملات */
const gemUnits = (d) => d ? (Number(d.gems) || 0) + Math.floor((Number(d.coins) || 0) / 20) : null;
const balOf = (d, cur) => cur === 'gems' ? gemUnits(d) : d?.[cur];
const showN = (n, cur) => cur === 'gems' ? n * 20 : n;
const icon = kind => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${{close:'M6 6l12 12M18 6 6 18',plus:'M12 5v14M5 12h14',clock:'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 6v12M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9',bag:'M8 3h8l-2 5H10ZM10 8C3 12 3 21 8 21h8c5 0 5-9-2-13M8 8h8M10 14h4M12 12v6',gem:'M3 8l4-5h10l4 5-9 13ZM3 8h18M7 3l5 18 5-18',refresh:'M20 7V3l-3 3M4 17v4l3-3M20 7a8 8 0 0 0-14-2M4 17a8 8 0 0 0 14 2'}[kind] || ''}"/></svg>`;
const placeholderFace = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="11" fill="#c7b0e9"/><path d="M12 60c0-23 40-23 40 0" fill="#8e69b3"/></svg>';
const FRIENDLY = {
  bag_permission_required:'إعدادات الغرفة لا تسمح لك بإنشاء حقيبة.', lucky_bag_permission_required:'إنشاء الحقائب غير متاح لصلاحيتك الحالية.',
  room_membership_required:'انضم إلى الغرفة قبل استخدام الحقائب.', council_membership_required:'اختر مجلسًا مصرحًا لك أولًا.',
  bag_not_open:'لم يحن موعد فتح الحقيبة.', bag_expired:'انتهت مهلة الحقيبة؛ تسوية المتبقي من الخادم.', bag_exhausted:'استُلمت جميع حصص الحقيبة.',
  bag_already_claimed:'سبق أن استلم هذا الحساب حصته.', sender_cannot_claim:'المرسل لا يستلم من حقيبته.', already_owned:'تملك هذا الغرض بالفعل؛ تبقى الحصة لعضو آخر.', item_already_owned:'تملك هذا الغرض بالفعل؛ تبقى الحصة لعضو آخر.',
  insufficient_coins:'رصيد العملات لا يكفي.', insufficient_gems:'رصيد العملات لا يكفي.', price_changed:'تغير السعر في الخادم. راجع الإجمالي الحالي ثم أكد من جديد.',
  target_not_in_council:'المستلم لم يعد في مجلسك المصرح به.', cannot_send_to_self:'لا يمكنك إرسال الهدية إلى نفسك.', gift_inventory_empty:'لا توجد وحدة مسبقة الدفع متاحة من هذه الهدية.',
  social_storage_or_dependency_unavailable:'الخدمة غير متاحة مؤقتًا؛ لا توجد نتيجة مؤكدة لهذا الطلب.', key_payload_mismatch:'تعارض مفتاح الطلب مع تفاصيله؛ لا تُنشئ خصمًا آخر قبل مراجعة النتيجة.',
  account_banned:'هذا الإجراء غير متاح للحساب الحالي.'
};
const friendly = value => FRIENDLY[String(value)] || String(value || 'تعذر تنفيذ الطلب في الخادم.');
function safeArtURL(value) {
  if (typeof value !== 'string' || !value) return '';
  try { const origin = globalThis.location?.origin || 'http://localhost'; const url = new URL(value, origin); return !url.username && !url.password && (url.protocol === 'https:' || url.origin === origin && url.protocol === new URL(origin).protocol) ? url.href : ''; } catch { return ''; }
}
function giftHTML(gift, size = 72) {
  if (!ID(gift?.motif)) return '<span class="sb12-art-unavailable">الرسم غير متاح</span>';
  try { return giftArt({motif:gift.motif,variant:Number.isInteger(gift.variant) && gift.variant >= 0 && gift.variant <= 7 ? gift.variant : 0,cat:ID(gift.cat) || 'normal',rarity:0,name:esc(gift.name)},size); } catch { return '<span class="sb12-art-unavailable">تعذر عرض الرسم</span>'; }
}
function itemHTML(item, size = 76) {
  const url = safeArtURL(typeof item?.art === 'string' ? item.art : item?.art?.url);
  if (url) return `<img class="sb12-real-art" src="${esc(url)}" alt="${esc(item.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  const css = typeof item?.css === 'string' ? item.css : '';
  if (item?.slot === 'avatar') { const art = avatarArt(item.id,size,css === 'av2' ? undefined : css); if (art) return art; }
  if (item?.slot === 'frame' && css) return `<span class="sb12-frame">${placeholderFace}${isFrame2(css) ? frameArt(css) : `<span class="pf-ring fr-${esc(css)}"></span>`}</span>`;
  if (item?.slot === 'bg' && css) { const art = isSuppliedBackground(css) ? backgroundVisual(css) : isBg2(css) ? bgArt(css) : `<i class="cx-fill sh-bg-${esc(css)}"></i>`; return `<span class="sb12-background">${art}</span>`; }
  if (item?.slot === 'title' && css) return `<span class="sb12-title-art cx-title">${esc(css)}</span>`;
  // Never replace a canonical item with an unrelated emoji or a fabricated gift.
  return '<span class="sb12-art-unavailable">الرسم غير متاح</span>';
}
function offersOf(data, type) {
  const list = arr(type === 'item' ? data?.offers?.items : data?.offers?.gifts);
  const seen = new Set();
  return list.filter(offer => ID(offer?.id) && !seen.has(offer.id) && (seen.add(offer.id), true) && offer.currency === 'gems' && positive(offer.price) && offer.available !== false && offer.active !== false && (!offer.status || offer.status === 'available'));
}

/** Create once per authenticated controller. Mount/unmount does not discard a pending request. */
export function createSocialBenefits({api,roomId,getUserId,openPacks,toast,onChange} = {}) {
  if (typeof api !== 'function' || typeof getUserId !== 'function') throw new TypeError('createSocialBenefits requires api and getUserId.');
  const readUser = () => { try { return String(getUserId() ?? ''); } catch { return ''; } };
  const s = {owner:readUser(),room:ID(roomId),selfId:'',councilId:'',councilMembers:[],maxMembers:null,contextToken:'',data:null,receivedAt:0,serverAt:null,loading:false,busy:false,stale:true,error:'',notice:'',open:false,mode:'sheet',view:'bags',type:'coins',itemId:'',perRecipient:'',count:'',delay:0,creditId:'',to:'',rewardTo:'',rewardAmount:'',pending:null,confirm:'',lastResult:null};
  let disposed = false, generation = 0, readSequence = 0, activeLoad = null, host = null, timer = null, returnFocus = null, keyboardCleanup = null;
  const requests = new Set();
  const storageKey = () => `la3bak:social-benefits:r12:pending:${encodeURIComponent(s.owner)}:${encodeURIComponent(s.room)}`;
  const scope = () => `${s.owner}\u0000${s.room}`;
  function restore() {
    s.pending = null;
    if (!s.owner || !s.room) return;
    try { const p = JSON.parse(globalThis.localStorage?.getItem(storageKey()) || 'null'); if (p?.owner === s.owner && p?.roomId === s.room && /^[A-Za-z0-9_-]{8,80}$/.test(p.key || '') && ['bag:create','bag:claim','gift:redeem','reward:send'].includes(p.body?.command) && p.body.key === p.key) s.pending = p; } catch {}
  }
  function persist(pending) {
    const storage = globalThis.localStorage;
    if (!storage) throw Error('تعذر حفظ مفتاح الطلب على هذا الجهاز؛ لم يُرسل الطلب.');
    try { if (pending) { const serialized = JSON.stringify(pending); storage.setItem(storageKey(),serialized); if (storage.getItem(storageKey()) !== serialized) throw Error('storage_unavailable'); } else storage.removeItem(storageKey()); }
    catch { throw Error('تعذر حفظ مفتاح الطلب على هذا الجهاز؛ لم يُرسل طلب جديد.'); }
  }
  function stopRequests() { for (const controller of requests) controller.abort(); requests.clear(); activeLoad = null; readSequence++; }
  function invalidate({owner = s.owner, room = s.room, resetDraft = false} = {}) {
    generation++; stopRequests();
    s.owner = owner; s.room = room; s.data = null; s.serverAt = null; s.receivedAt = 0; s.loading = false; s.busy = false; s.stale = true; s.error = ''; s.notice = ''; s.confirm = ''; s.lastResult = null;
    if (resetDraft) { s.selfId = ''; s.councilId = ''; s.councilMembers = []; s.maxMembers = null; s.contextToken = ''; s.type = 'coins'; s.itemId = ''; s.perRecipient = ''; s.count = ''; s.delay = 0; s.creditId = ''; s.to = ''; s.rewardTo = ''; s.rewardAmount = ''; }
    restore();
  }
  function ensureIdentity() { const owner = readUser(); if (owner !== s.owner) { invalidate({owner,resetDraft:true}); return false; } return !!s.owner && !!s.room && !disposed; }
  function current(g, sc) { return !disposed && g === generation && sc === scope() && readUser() === s.owner; }
  function viewState() { return {roomId:s.room,ownerId:s.owner,data:s.data,loading:s.loading,busy:s.busy,stale:s.stale,pending:s.pending ? {...s.pending,body:{...s.pending.body}} : null,draft:{type:s.type,itemId:s.itemId,perRecipient:s.perRecipient,count:s.count,delay:s.delay,creditId:s.creditId,to:s.to,rewardTo:s.rewardTo,rewardAmount:s.rewardAmount},error:s.error,notice:s.notice,lastResult:s.lastResult,view:s.view,open:s.open}; }
  function notify(kind = 'render', extra = {}) {
    if (disposed) return;
    paint();
    try { const result = onChange?.({kind,...extra,...viewState()}); if (result?.catch) result.catch(() => {}); } catch {}
  }
  function message(text) { try { toast?.(text); } catch {} }
  const serverNow = () => s.serverAt === null ? null : s.serverAt + Math.max(0,Date.now() - s.receivedAt);
  function maxRecipients() {
    if (positive(s.data?.maxRecipients)) return s.data.maxRecipients;
    if (positive(s.data?.limits?.maxRecipients)) return s.data.limits.maxRecipients;
    const max = positive(s.data?.maxMembers) ? s.data.maxMembers : s.maxMembers;
    return positive(max) && max > 1 ? max - 1 : null;
  }
  function selectedOffer() { return s.type === 'coins' ? null : offersOf(s.data,s.type).find(offer => offer.id === s.itemId) || null; }
  function quote() {
    const count = intInput(s.count), perRecipient = s.type === 'coins' ? intInput(s.perRecipient) : 1, offer = selectedOffer();
    const unit = s.type === 'coins' ? perRecipient : offer?.price, currency = s.type === 'coins' ? 'coins' : 'gems';
    const total = positive(count) && positive(unit) && Number.isSafeInteger(unit * count) ? unit * count : null;
    const max = maxRecipients();
    let reason = '';
    if (!s.owner || !s.room) reason = 'سجّل الدخول وافتح غرفة فعلية.';
    else if (!s.data || s.stale) reason = 'حدّث بيانات الخادم قبل الإرسال.';
    else if (s.data.permissions?.createBag !== true) reason = 'إنشاء الحقائب غير متاح وفق صلاحيتك وإعدادات الغرفة.';
    else if (s.type !== 'coins' && !offer) reason = 'اختر غرضًا أو هدية معتمدة من قائمة الخادم.';
    else if (!positive(perRecipient)) reason = 'أدخل عددًا صحيحًا موجبًا من العملات لكل مستلم.';
    else if (!positive(count)) reason = 'أدخل عددًا صحيحًا موجبًا للمستلمين.';
    else if (!max) reason = 'حد المستلمين لم يصل من بيانات الغرفة؛ الإرسال متوقف.';
    else if (count > max) reason = `الحد المعتمد لهذه الغرفة ${number(max)} مستلمًا.`;
    else if (!positive(total)) reason = 'الإجمالي يتجاوز نطاق الأعداد الصحيحة الآمنة.';
    else if (total > (positive(s.data?.limits?.priceMax) ? s.data.limits.priceMax : PRICE_MAX[currency])) reason = 'الإجمالي يتجاوز حد المعاملة الحالي.';
    else if (s.delay !== 0 && s.delay !== 300) reason = 'اختر حالًا أو بعد 300 ثانية فقط.';
    else if (!amount(balOf(s.data, currency))) reason = 'رصيدك الحالي غير متاح من الخادم.';
    else if (balOf(s.data, currency) < total) reason = 'رصيد العملات لا يكفي للإجمالي.';
    const fingerprint = JSON.stringify({type:s.type,itemId:offer?.id || '',perRecipient,count,delay:s.delay,total,unit});
    return {valid:!reason,reason,offer,currency,unit,count,perRecipient,total,max,fingerprint};
  }
  function peers() {
    const councilId = ID(s.data?.councilId) || s.councilId, selfId = ID(s.data?.selfId) || s.selfId;
    if (!councilId || !selfId) return [];
    const actualCouncilMembers = new Set(s.councilMembers.map(publicId).filter(Boolean));
    if (Array.isArray(s.data?.giftMembers)) return s.data.giftMembers.filter(member => publicId(member) && publicId(member) !== selfId && publicId(member) !== s.owner && member.canReceiveGift !== false);
    return arr(s.data?.members).filter(member => {
      const id = publicId(member);
      return id && id !== selfId && id !== s.owner && member.canReceiveGift !== false && (member.councilId === councilId || actualCouncilMembers.has(id));
    });
  }
  function inventory() { return arr(s.data?.inventory).filter(gift => creditId(gift) && ID(gift?.giftId) && positive(gift.quantity) && gift.active !== false); }
  function redemption() {
    const gift = inventory().find(g => creditId(g) === s.creditId), recipient = peers().find(p => publicId(p) === s.to), councilId = ID(s.data?.councilId) || s.councilId;
    const rewards = giftRewardQuote({rewardQuotes:{1:gift?.rewards}},1);
    return {gift,recipient,councilId,rewards,valid:!!(s.data && !s.stale && councilId && gift && recipient && rewards && s.data.permissions?.redeemGift !== false)};
  }
  function rewardPeers() {
    const self = ID(s.data?.selfId) || s.selfId;
    return self ? arr(s.data?.members).filter(member => publicId(member) && publicId(member) !== self && publicId(member) !== s.owner) : [];
  }
  function rewardQuote() {
    const recipient = rewardPeers().find(member => publicId(member) === s.rewardTo), coinsIn = intInput(s.rewardAmount), total = coinsIn && coinsIn % 20 === 0 ? coinsIn / 20 : 0;
    let reason = '';
    if (!s.data || s.stale) reason = 'حدّث بيانات الخادم قبل المكافأة.';
    else if (s.data.permissions?.sendReward !== true) reason = 'هذه المكافأة اليدوية لمالك الغرفة فقط.';
    else if (!recipient) reason = 'اختر عضوًا موجودًا في الغرفة، غير المالك.';
    else if (!total) reason = 'حدد مبلغ عملات صحيح (من مضاعفات 20).';
    else if (total > PRICE_MAX.gems) reason = 'حد المكافأة الحالي 2,000,000 عملة.';
    else if (!amount(gemUnits(s.data))) reason = 'رصيدك غير متاح من الخادم.';
    else if (gemUnits(s.data) < total) reason = 'رصيد عملاتك لا يكفي للمكافأة.';
    return {recipient,total,valid:!reason,reason,fingerprint:JSON.stringify({command:'reward:send',to:s.rewardTo,amount:total})};
  }
  function claimGate(bag) {
    if (!s.data || s.stale) return {allowed:false,reason:'حدّث حالة الخادم أولًا.'};
    if (claimedByMe(bag)) return {allowed:false,reason:'استلمت حصتك بالفعل.'};
    const self = ID(s.data.selfId) || s.selfId;
    if (bag?.isSender === true || self && publicId(bag?.sender) === self || publicId(bag?.sender) === s.owner) return {allowed:false,reason:'المرسل لا يستلم من حقيبته.'};
    const now = serverNow(), opens = timeMs(bag?.opensAt), expires = timeMs(bag?.expiresAt);
    if (now === null || opens === null || expires === null) return {allowed:false,reason:'توقيت الحقيبة غير مكتمل من الخادم.'};
    if (now < opens) return {allowed:false,reason:'بانتظار موعد الفتح.'};
    if (now >= expires || bag.status === 'expired' || bag.status === 'refunded') return {allowed:false,reason:bag.status === 'refunded' || positive(bag.refunded) ? 'انتهت الحقيبة وأُكد استرداد المتبقي.' : 'انتهت المهلة؛ تسوية المتبقي من الخادم.'};
    if (remainingCount(bag) === 0 || bag.status === 'full') return {allowed:false,reason:'استُلمت جميع الحصص.'};
    if (!self || !arr(s.data.members).some(member => publicId(member) === self)) return {allowed:false,reason:'الاستلام للأعضاء الموجودين في الغرفة فقط.'};
    if (bag.canClaim === false) return {allowed:false,reason:friendly(bag.claimReason || 'الاستلام غير متاح لحسابك وفق حالة الخادم.')};
    return {allowed:true,reason:''};
  }
  function sync(snapshot = {}) {
    if (disposed) return;
    ensureIdentity();
    const nextRoom = ID(snapshot.roomId) || ID(snapshot.room?.id) || s.room;
    if (nextRoom !== s.room) invalidate({room:nextRoom,resetDraft:true});
    const currentMembership = snapshot.current;
    const councilId = ID(snapshot.councilId) || (currentMembership?.roomId === s.room ? ID(currentMembership.councilId) : '');
    const council = arr(snapshot.room?.councils).find(c => c.id === councilId);
    const councilMembers = council ? arr(council.members) : arr(snapshot.councilMembers);
    const selfId = ID(snapshot.selfId) || '';
    const maxMembers = positive(snapshot.room?.maxMembers) ? snapshot.room.maxMembers : positive(snapshot.maxMembers) ? snapshot.maxMembers : null;
    const token = JSON.stringify([selfId,councilId,maxMembers,councilMembers.map(publicId).sort(),snapshot.room?.joined,snapshot.room?.role,snapshot.room?.settings?.luckyBag]);
    if (s.contextToken && token !== s.contextToken) invalidate();
    s.contextToken = token; s.selfId = selfId; s.councilId = councilId; s.councilMembers = councilMembers; s.maxMembers = maxMembers;
    if (!s.pending && s.to && !peers().some(member => publicId(member) === s.to)) s.to = '';
    notify('sync');
  }
  function acceptData(result) {
    if (result?.ok !== true || !result.permissions || !Array.isArray(result.members) || !result.offers || !Array.isArray(result.offers.items) || !Array.isArray(result.offers.gifts) || !Array.isArray(result.bags) || !Array.isArray(result.inventory) || timeMs(result.now) === null) throw Error('استجابة الحقائب غير مكتملة؛ لن نعرض أرصدة أو خيارات مخمّنة.');
    s.data = result; s.serverAt = timeMs(result.now); s.receivedAt = Date.now(); s.stale = false;
    if (!s.pending) {
      if (s.itemId && !selectedOffer()) s.itemId = '';
      if (s.creditId && !inventory().some(g => creditId(g) === s.creditId)) s.creditId = '';
      if (s.to && !peers().some(p => publicId(p) === s.to)) s.to = '';
      if (s.rewardTo && !rewardPeers().some(p => publicId(p) === s.rewardTo)) s.rewardTo = '';
    }
    if (s.confirm && s.confirm !== (s.view === 'reward' ? rewardQuote() : quote()).fingerprint) s.confirm = '';
  }
  async function load() {
    if (disposed) return null;
    if (!ensureIdentity()) { s.error = 'سجّل الدخول وافتح غرفة فعلية.'; notify(); return null; }
    if (activeLoad) return activeLoad;
    const g = generation, sc = scope(), seq = ++readSequence, controller = new AbortController(); requests.add(controller);
    s.loading = true; s.error = ''; notify('loading');
    const task = (async () => {
      await Promise.resolve(); // Ensure task is assigned even when a JSON adapter throws synchronously.
      try {
        if (!current(g,sc) || seq !== readSequence || controller.signal.aborted) return null;
        const result = await api(`/api/social/rooms/${encodeURIComponent(s.room)}/benefits`,'GET',undefined,{signal:controller.signal});
        if (!current(g,sc) || seq !== readSequence) return null;
        if (result?.ok !== true) throw Error(friendly(result?.error));
        acceptData(result); notify('loaded'); return result;
      } catch (error) {
        if (current(g,sc) && seq === readSequence && error?.name !== 'AbortError') { s.stale = true; s.error = friendly(error?.message || 'تعذر الاتصال بالخادم.'); notify('error'); }
        return null;
      } finally {
        requests.delete(controller);
        if (current(g,sc) && seq === readSequence) { s.loading = false; if (activeLoad === task) activeLoad = null; notify(); }
      }
    })();
    activeLoad = task;
    return task;
  }
  function resultMessage(result, command) {
    if (command === 'bag:create') return result.dup ? 'هذا الطلب محفوظ سابقًا؛ لم ننشئ حقيبة ثانية.' : 'أكد الخادم إنشاء الحقيبة وتمويلها.';
    if (command === 'gift:redeem') { const ev = result.ev; return ev?.to?.name && ev?.gift?.name ? `أكد الخادم إرسال ${ev.gift.name} إلى ${ev.to.name} من مخزونك المسبق الدفع.` : 'أكد الخادم استخدام وحدة الهدية وإرسالها؛ لا خصم جديد.'; }
    if (command === 'reward:send') return result.dup ? 'المكافأة محفوظة سابقًا؛ ما كررنا التحويل.' : 'أكد الخادم تحويل المكافأة اليدوية كاملة إلى العضو، دون رسوم.';
    const award = result.award || result.awarded;
    if (award?.type === 'coins' && amount(award.amount)) return `استلمت ${number(award.amount)} عملة، بتأكيد الخادم.`;
    return result.dup ? 'الاستلام محفوظ سابقًا؛ لم تُمنح حصة ثانية.' : 'أكد الخادم استلام حصتك؛ النتيجة والمخزون من حالة الخادم.';
  }
  async function transact(body, retry = false) {
    if (disposed || s.busy) return null;
    if (!ensureIdentity()) { s.error = 'تغير الحساب أو انتهت الجلسة؛ حدّث الحالة.'; notify(); return null; }
    if (!s.data || s.stale) { s.error = 'حدّث الحالة قبل إرسال الطلب.'; notify(); return null; }
    let pending;
    try {
      if (s.pending) { if (!retry) throw Error('يوجد طلب غير محسوم؛ أعد الطلب نفسه أولًا.'); pending = s.pending; }
      else {
        if (retry) return null;
        if (!globalThis.crypto?.randomUUID) throw Error('تعذر إنشاء مفتاح آمن؛ لم يُرسل الطلب.');
        const key = globalThis.crypto.randomUUID();
        pending = {owner:s.owner,roomId:s.room,key,body:{...body,key}};
        persist(pending); s.pending = pending;
      }
    } catch (error) { s.error = error.message; notify('error'); return null; }
    const g = generation, sc = scope(), controller = new AbortController(); requests.add(controller);
    // A read that began before the financial commit must never overwrite its refresh.
    readSequence++; activeLoad = null; s.loading = false; s.busy = true; s.error = ''; s.notice = ''; s.confirm = ''; notify('busy');
    try {
      if (!current(g,sc) || controller.signal.aborted) return null;
      const result = await api(`/api/social/rooms/${encodeURIComponent(pending.roomId)}/benefits`,'POST',{...pending.body},{signal:controller.signal});
      if (!current(g,sc)) return null;
      if (result?.ok !== true) {
        const error = Error(friendly(result?.error || 'لم يؤكد الخادم حفظ المعاملة.'));
        error.status = result?.status; error.definite = result?.ok === false && !(Number(result.status) >= 500) && ![408,429].includes(Number(result.status)); throw error;
      }
      // Only an acknowledged server commit settles the persisted attempt. Balances are refreshed, not patched.
      try { persist(null); } catch { /* A retained key is still safe to replay after a storage failure. */ }
      s.pending = null; s.lastResult = result; s.notice = resultMessage(result,pending.body.command); s.stale = true;
      message(s.notice); notify('commit',{command:pending.body.command,result});
      const refreshed = await load();
      if (current(g,sc) && !refreshed) { s.error = 'المعاملة مؤكدة، لكن تعذر تحديث الحالة. لا تُعد الإرسال؛ اضغط تحديث الحالة.'; notify('error'); }
      return result;
    } catch (error) {
      if (!current(g,sc)) return null;
      const status = Number(error?.status || error?.response?.status);
      const definitive = error?.definite === true || status >= 400 && status < 500 && status !== 408 && status !== 429;
      if (definitive) {
        try { persist(null); s.pending = null; } catch {}
        s.error = friendly(error?.message); s.stale = true; notify('rejected');
        const rejectedMessage = s.error;
        await load();
        if (current(g,sc)) { s.error = rejectedMessage; notify('rejected'); }
      } else {
        s.error = `${friendly(error?.message || 'انقطع الاتصال قبل معرفة النتيجة.')} نفس الطلب ومفتاحه محفوظان؛ أعد المحاولة دون خصم جديد.`; s.stale = true; notify('uncertain');
        await load();
        if (current(g,sc)) { s.error = `${friendly(error?.message || 'نتيجة الطلب غير مؤكدة.')} أعد الطلب المحفوظ نفسه؛ لا ننشئ مفتاحًا ثانيًا.`; notify('uncertain'); }
      }
      return null;
    } finally { requests.delete(controller); if (current(g,sc)) { s.busy = false; notify(); } }
  }
  async function create(confirmed = false) {
    if (!ensureIdentity() || s.busy || s.pending) return null;
    const q = quote();
    if (!q.valid) { s.error = q.reason; notify('error'); return null; }
    if (confirmed !== true || s.confirm !== q.fingerprint) { s.confirm = q.fingerprint; s.error = ''; notify('confirm'); return null; }
    return transact({command:'bag:create',type:s.type,...(s.type === 'coins' ? {perRecipient:q.perRecipient} : {itemId:q.offer.id}),count:q.count,delay:s.delay,seenTotal:q.total,confirm:true});
  }
  async function claim(bagId) {
    if (!ensureIdentity() || s.busy || s.pending) return null;
    const bag = arr(s.data?.bags).find(b => b.id === bagId), gate = claimGate(bag);
    if (!bag || !ID(bag.id) || !gate.allowed) { s.error = gate.reason || 'الحقيبة غير موجودة في الحالة الحالية.'; notify('error'); return null; }
    return transact({command:'bag:claim',bagId:bag.id});
  }
  async function redeem() {
    if (!ensureIdentity() || s.busy || s.pending) return null;
    const r = redemption();
    if (!r.valid) { s.error = r.gift && !r.rewards ? 'عرض مكافآت هذه الوحدة غير متاح من الخادم؛ حدّث الحالة قبل الإرسال.' : 'اختر وحدة متاحة من مخزونك وعضوًا حاضرًا في مجلسك المصرح به، غير نفسك.'; notify('error'); return null; }
    return transact({command:'gift:redeem',creditId:creditId(r.gift),to:publicId(r.recipient),councilId:r.councilId,seenPolicy:r.rewards.policy});
  }
  async function reward(confirmed = false) {
    if (!ensureIdentity() || s.busy || s.pending) return null;
    const q = rewardQuote();
    if (!q.valid) { s.error = q.reason; notify('error'); return null; }
    if (confirmed !== true || s.confirm !== q.fingerprint) { s.confirm = q.fingerprint; s.error = ''; notify('confirm'); return null; }
    return transact({command:'reward:send',to:publicId(q.recipient),amount:q.total,confirm:true});
  }
  function update(draft = {}) {
    if (disposed || !ensureIdentity() || s.busy || s.pending) return false;
    if (['coins','item','gift'].includes(draft.type) && draft.type !== s.type) { s.type = draft.type; s.itemId = ''; }
    if (typeof draft.itemId === 'string' && offersOf(s.data,s.type).some(o => o.id === draft.itemId)) s.itemId = draft.itemId;
    for (const field of ['perRecipient','count','rewardAmount']) if (Object.prototype.hasOwnProperty.call(draft,field)) s[field] = String(draft[field] ?? '').replace(/[٠-٩]/g,c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
    if (draft.delay === 0 || draft.delay === 300) s.delay = draft.delay;
    if (typeof draft.creditId === 'string') s.creditId = inventory().some(g => creditId(g) === draft.creditId) ? draft.creditId : '';
    if (typeof draft.to === 'string') s.to = peers().some(p => publicId(p) === draft.to) ? draft.to : '';
    if (typeof draft.rewardTo === 'string') s.rewardTo = rewardPeers().some(p => publicId(p) === draft.rewardTo) ? draft.rewardTo : '';
    s.confirm = ''; s.error = ''; s.notice = ''; notify('draft'); return true;
  }
  function previewHTML(q) {
    const offer = q.offer;
    return `<div class="sb12-preview"><div class="sb12-art ${s.type === 'coins' ? 'sb12-coins-art' : ''}">${s.type === 'coins' ? icon('coin') : offer ? s.type === 'gift' ? giftHTML(offer,100) : itemHTML(offer,100) : icon('bag')}</div><h3>${s.type === 'coins' ? 'حقيبة العملات' : offer ? esc(offer.name) : s.type === 'item' ? 'اختر غرضًا من كتالوجك' : 'اختر هدية من كتالوجك'}</h3><p class="sb12-per-recipient">لكل مستلم <strong data-sb12-per-recipient>${s.type === 'coins' ? q.perRecipient ? number(q.perRecipient) + ' عملة' : 'حدد عدد العملات' : offer ? 'وحدة واحدة' : 'اختر المحتوى'}</strong></p>${s.type === 'item' && offer ? `<span class="sb12-lifetime">${offer.permanent === true ? 'ملكية دائمة وفق المتجر' : 'الملكية وفق بيانات المتجر؛ لا مدة مخمّنة'}</span>` : ''}<div class="sb12-preview-stats"><span>عدد المستلمين<strong data-sb12-preview-count>${q.count ? number(q.count) : 'لم يُحدد'}</strong></span><span>الإجمالي<strong data-sb12-preview-total>${q.total === null ? 'لم يُحدد' : number(showN(q.total, q.currency || 'gems')) + ' ' + currencyName(q.currency)}</strong></span></div><p class="sb12-caption">حصص متساوية، مرة لكل حساب حاضر في الغرفة عند الاستلام. المرسل مستبعد.</p></div>`;
  }
  function choicesHTML(q, fixed) {
    const offers = offersOf(s.data,s.type);
    return `<div class="sb12-choices"><h3>${s.type === 'coins' ? 'حدد تمويل الحقيبة' : 'خيارات الكتالوج المعتمدة'}</h3>${s.type === 'coins' ? `<label class="sb12-field">عملات لكل مستلم<input data-sb12-field="perRecipient" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${esc(s.perRecipient)}" ${fixed ? 'disabled' : ''} aria-describedby="sb12-integer-help" placeholder="عدد صحيح موجب"></label><p id="sb12-integer-help" class="sb12-caption">مبلغ كل حصة، وليس إجمالي الحقيبة.</p>` : `<div class="sb12-offers" role="group" aria-label="اختر المحتوى">${offers.length ? offers.map(o => `<button type="button" class="sb12-offer ${s.itemId === o.id ? 'is-selected' : ''}" data-sb12-action="pick" data-id="${esc(o.id)}" aria-pressed="${s.itemId === o.id}" ${fixed ? 'disabled' : ''}><span class="sb12-offer-art">${s.type === 'gift' ? giftHTML(o,48) : itemHTML(o,48)}</span><span><b>${esc(o.name)}</b><small>${number(o.price)} عملة لكل مستلم</small>${s.type === 'item' && o.permanent === true ? '<small>غرض دائم</small>' : ''}</span><i class="sb12-selection" aria-hidden="true"></i></button>`).join('') : `<p class="sb12-empty">لا توجد ${s.type === 'item' ? 'أغراض' : 'هدايا'} معتمدة ومسعّرة في استجابة الخادم.</p>`}</div>`}<label class="sb12-field">عدد المستلمين<input data-sb12-field="count" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${esc(s.count)}" ${fixed ? 'disabled' : ''} placeholder="عدد صحيح موجب" aria-describedby="sb12-count-help"></label><p id="sb12-count-help" class="sb12-caption">${q.max ? 'حد الغرفة: ' + number(q.max) + ' مستلمًا؛ يمكن للمنضمين لاحقًا الاستلام قبل انتهاء المهلة.' : 'بانتظار حد المستلمين من بيانات الغرفة.'}</p><div class="sb12-quote"><span>الإجمالي المحسوب من ${s.type === 'coins' ? 'المبلغ لكل مستلم' : 'سعر الكتالوج الخادمي'}</span><strong data-sb12-total>${q.total === null ? 'أكمل الاختيارات' : number(showN(q.total, q.currency || 'gems')) + ' ' + currencyName(q.currency)}</strong><small>${q.total !== null ? number(showN(q.unit, q.currency)) + ' × ' + number(q.count) : 'لا أسعار أو كميات افتراضية'}</small></div></div>`;
  }
  function bagHTML(bag) {
    if (!ID(bag?.id)) return '';
    const gate = claimGate(bag), item = bag.item || bag.gift || null;
    const title = bag.type === 'coins' ? 'حقيبة العملات' : item?.name || bag.name || (bag.type === 'gift' ? 'حقيبة هدايا' : 'حقيبة أغراض');
    const refunded = bag.status === 'refunded' || positive(bag.refunded);
    const art = bag.type === 'coins' ? icon('coin') : item ? bag.type === 'gift' ? giftHTML(item,52) : itemHTML(item,52) : icon('bag');
    return `<article class="sb12-bag ${refunded ? 'is-refunded' : ''}" data-sb12-bag="${esc(bag.id)}"><div class="sb12-bag-heading"><span class="sb12-bag-art">${art}</span><div><h4>${esc(title)}</h4><p>${bag.sender?.name ? 'من ' + esc(bag.sender.name) : 'المرسل وفق سجل الخادم'}</p></div><span class="sb12-status">${refunded ? 'مستردة' : claimedByMe(bag) ? 'استلمتها' : bag.status === 'full' || remainingCount(bag) === 0 ? 'مكتملة' : gate.allowed ? 'متاحة' : 'غير متاحة الآن'}</span></div><dl class="sb12-bag-details"><div><dt>يفتح بتوقيت الخادم</dt><dd data-sb12-opens>${datetime(bag.opensAt)}</dd></div><div><dt>تنتهي المهلة بتوقيت الخادم</dt><dd data-sb12-expires>${datetime(bag.expiresAt)}</dd></div><div><dt>حصتك</dt><dd>${bag.type === 'coins' ? positive(bag.perRecipient) ? number(bag.perRecipient) + ' عملة' : 'غير متاحة' : 'وحدة واحدة وفق الحقيبة'}</dd></div><div><dt>استُلم / متبقٍ</dt><dd data-sb12-remaining>${number(claimedCount(bag))} / ${number(remainingCount(bag))}</dd></div></dl>${refunded ? `<p class="sb12-caption">أكد الخادم استرداد المتبقي${positive(bag.refunded) ? ': ' + number(bag.refunded) + ' ' + currencyName(bag.currency) : ''}.</p>` : !gate.allowed ? `<p class="sb12-caption" data-sb12-claim-reason>${esc(gate.reason)}</p>` : ''}<button type="button" class="sb12-button sb12-claim" data-sb12-action="claim" data-id="${esc(bag.id)}" ${s.busy || s.pending || !gate.allowed ? 'disabled' : ''}>${s.busy && s.pending?.body?.bagId === bag.id ? 'جارٍ تأكيد الاستلام…' : claimedByMe(bag) ? 'تم الاستلام' : 'استلام حصتي'}</button></article>`;
  }
  function inventoryHTML(fixed) {
    const gifts = inventory(), r = redemption(), availablePeers = peers();
    const pendingGift = s.pending?.body.command === 'gift:redeem';
    const pendingCredit = pendingGift ? gifts.find(g => creditId(g) === s.pending.body.creditId) : null;
    const selected = pendingGift ? pendingCredit : r.gift;
    const offer = selected ? offersOf(s.data,'gift').find(o => o.id === selected.giftId) : null;
    const preview = selected || pendingGift ? giftRewardCard({gift:selected ? {...offer,...selected} : null,recipient:pendingGift ? availablePeers.find(p => publicId(p) === s.pending.body.to) || s.pending.body.to : r.recipient,qty:1,quote:pendingGift ? null : r.rewards,prepaid:true,pending:pendingGift}) : '';
    const ev = s.lastResult?.ev;
    const result = ev?.prepaid === true ? `<div class="gr13-prepaid-result" role="status">${giftRewardCard({gift:ev.gift,recipient:ev.to,qty:ev.qty || 1,quote:giftRewardEventQuote(ev),confirmed:true,prepaid:true})}${s.lastResult.dup ? '<p>الطلب محفوظ سابقًا؛ لم نكرر استخدام الهدية أو البونص.</p>' : ''}</div>` : '';
    return `${result}<section class="sb12-inventory" aria-labelledby="sb12-inventory-title"><div class="sb12-section-heading"><h3 id="sb12-inventory-title">هداياك المسبقة الدفع</h3><span>من استلامك المؤكد فقط</span></div>${gifts.length ? `<div class="sb12-inventory-options">${gifts.map(g => { const offer = offersOf(s.data,'gift').find(o => o.id === g.giftId), id = creditId(g); return `<button type="button" class="sb12-owned ${s.creditId === id ? 'is-selected' : ''}" data-sb12-action="inventory" data-id="${esc(id)}" data-gift-id="${esc(g.giftId)}" aria-pressed="${s.creditId === id}" ${fixed ? 'disabled' : ''}>${giftHTML({...offer,...g},54)}<b>${esc(g.name || offer?.name || g.giftId)}</b><span>${number(g.quantity)} وحدة متاحة</span></button>`; }).join('')}</div><label class="sb12-field">إلى عضو حاضر في مجلسك<select data-sb12-field="to" ${fixed || !availablePeers.length ? 'disabled' : ''}><option value="">اختر المستلم</option>${availablePeers.map(p => `<option value="${esc(publicId(p))}" ${s.to === publicId(p) ? 'selected' : ''}>${esc(p.name || publicId(p))}</option>`).join('')}</select></label>${!r.councilId ? '<p class="sb12-caption">خذ مقعدًا في مجلس مصرح لك به قبل استخدام الهدية.</p>' : !availablePeers.length ? '<p class="sb12-caption">لا يوجد عضو آخر حاضر في مجلسك المصرح به.</p>' : ''}${preview}<div class="sb12-redemption"><p>وحدة واحدة للمستلم المختار. ممولة مسبقًا؛ لا خصم جديد من رصيدك.</p><button type="button" class="sb12-button" data-sb12-action="redeem" ${fixed || !r.valid ? 'disabled' : ''}>إرسال من المخزون</button></div>` : preview + '<p class="sb12-empty">لا توجد وحدات مسبقة الدفع متاحة في مخزونك الحالي.</p>'}</section>`;
  }
  function rewardRender() {
    const q = rewardQuote(), fixed = s.busy || !!s.pending, members = rewardPeers(), hasData = !!s.data;
    const pending = s.pending ? `<aside class="sb12-pending" role="status" data-sb12-pending><b>طلب محفوظ غير محسوم</b><p>نحتفظ بنفس التفاصيل والمفتاح. لا تنشئ مكافأة أو حقيبة ثانية قبل حسم هذا الطلب.</p><button type="button" class="sb12-button" data-sb12-action="retry" ${s.busy || s.stale || !hasData ? 'disabled' : ''}>${s.busy ? 'جارٍ تأكيد الطلب…' : 'إعادة الطلب نفسه بأمان'}</button></aside>` : '';
    const content = !hasData ? `<div class="sb12-initial" role="status">${icon('coin')}<h3>${s.loading ? 'نحضر رصيدك وصلاحية المكافأة…' : 'بيانات المكافأة غير متاحة'}</h3><p>الرصيد والأعضاء والصلاحية من الخادم فقط.</p></div>` : s.data.permissions?.sendReward !== true ? '<p class="sb12-warning" role="status">هذه المكافأة اليدوية من مالك الغرفة فقط. لا تسمح صلاحيتك الحالية بإرسالها.</p>' : `<section class="sb12-reward" data-sb12-reward><div class="sb12-reward-summary">${icon('coin')}<div><h3>مكافأة من عملاتك</h3><p>تحويل يدوي منك، مالك الغرفة، إلى عضو موجود فيها. يصل المبلغ كاملًا بنسبة 100٪، دون اقتطاع أو مكافأة تلقائية.</p></div></div><label class="sb12-field">العضو المستلم<select data-sb12-field="rewardTo" ${fixed || !members.length ? 'disabled' : ''}><option value="">اختر عضوًا من الغرفة</option>${members.map(member => `<option value="${esc(publicId(member))}" ${s.rewardTo === publicId(member) ? 'selected' : ''}>${esc(member.name || publicId(member))}</option>`).join('')}</select></label>${members.length ? '' : '<p class="sb12-caption">لا يوجد عضو آخر ظاهر في الغرفة الحالية.</p>'}<label class="sb12-field">مبلغ المكافأة بالعملات (من مضاعفات 20)<input data-sb12-field="rewardAmount" type="text" inputmode="numeric" pattern="[0-9]*" value="${esc(s.rewardAmount)}" autocomplete="off" placeholder="عدد صحيح موجب" ${fixed ? 'disabled' : ''} aria-describedby="sb12-reward-limit"></label><p id="sb12-reward-limit" class="sb12-caption">الحد الحالي: 2,000,000 عملة. لا يمكنك مكافأة نفسك.</p><div class="sb12-quote"><span>الإجمالي المحوّل من رصيدك إلى العضو</span><strong data-sb12-total>${q.total === null ? 'حدد المبلغ' : number(q.total) + ' جوهرة'}</strong><small>لا رسوم · لا توزيع 50/50</small></div></section>`;
    const confirmation = s.confirm && s.confirm === q.fingerprint ? `<div class="sb12-confirm" role="group" aria-label="تأكيد المكافأة اليدوية" data-sb12-confirm><h3>تأكيد تحويل العملات</h3><p>تحويل <strong>${number(showN(q.total, q.currency || 'gems'))} عملة</strong> من رصيدك إلى <strong>${esc(q.recipient?.name || s.rewardTo)}</strong>، عضو الغرفة الحالي.</p><p>سيصل المبلغ كاملًا؛ يؤكد الخادم التحويل ويحفظه قبل تحديث الرصيد.</p><div><button type="button" class="sb12-button" data-sb12-action="reward-confirm" ${!q.valid || fixed ? 'disabled' : ''}>تأكيد المكافأة</button><button type="button" class="sb12-text-button" data-sb12-action="cancel-confirm">رجوع</button></div></div>` : '';
    const footer = hasData ? `<footer class="sb12-footer sb12-reward-footer"><div class="sb12-balance">${icon('coin')}<span>رصيد عملاتك<strong data-sb12-balance data-currency="coins">${s.stale ? 'يلزم تحديث' : number(s.data.coins)} <small>عملة</small></strong></span><button type="button" class="sb12-plus" data-sb12-action="packs" data-currency="gems" aria-label="فتح باقات الجواهر الحالية" ${typeof openPacks !== 'function' || s.busy ? 'disabled' : ''}>${icon('plus')}</button></div><div class="sb12-send-wrap"><button type="button" class="sb12-button" data-sb12-action="reward-send" ${fixed || !q.valid || s.loading ? 'disabled' : ''}>${s.busy ? 'جارٍ تأكيد الخادم…' : 'مراجعة المكافأة'}</button><small>${s.pending ? 'احسم الطلب المحفوظ أولًا' : esc(q.reason || 'تحويل كامل من المالك إلى العضو')}</small></div></footer>` : '';
    return `<div class="sb12-root ${s.mode === 'panel' ? 'sb12-panel-mode' : 'sb12-sheet-mode'}" dir="rtl" ${!s.open ? 'hidden' : ''} data-sb12-root data-sb12-view="reward">${s.mode === 'sheet' ? '<button type="button" class="sb12-backdrop" data-sb12-action="close" aria-label="إغلاق المكافأة" tabindex="-1"></button>' : ''}<section class="sb12-sheet" ${s.mode === 'sheet' ? 'role="dialog" aria-modal="true"' : 'role="region"'} aria-labelledby="sb12-title" tabindex="-1" data-sb12-sheet><span class="sb12-handle" aria-hidden="true"></span><header class="sb12-header"><span class="sb12-emblem">${icon('coin')}</span><div><span class="sb12-eyebrow">لعبك · تقدير من مالك المجلس</span><h2 id="sb12-title">مكافأة الغرفة</h2></div><button type="button" class="sb12-close" data-sb12-action="close" aria-label="إغلاق">${icon('close')}</button></header><div class="sb12-scroll" data-sb12-scroll>${s.stale && hasData ? '<p class="sb12-warning" role="status">الرصيد آخر قراءة؛ حدّث الحالة قبل التحويل.</p>' : ''}${s.error ? `<p class="sb12-error" role="alert" data-sb12-error>${esc(s.error)}</p>` : ''}${s.notice ? `<p class="sb12-success" role="status" data-sb12-result>${esc(s.notice)}</p>` : ''}<button type="button" class="sb12-text-button" data-sb12-action="reload" ${s.loading || s.busy ? 'disabled' : ''}>${icon('refresh')} ${s.loading ? 'جارٍ التحديث…' : 'تحديث الحالة'}</button>${pending}${content}${confirmation}</div>${footer}</section></div>`;
  }
  function render() {
    ensureIdentity();
    if (s.view === 'reward') return rewardRender();
    const q = quote(), fixed = s.busy || !!s.pending, hasData = !!s.data;
    const content = !hasData ? `<div class="sb12-initial" role="status">${icon('bag')}<h3>${s.loading ? 'نحضر حالة الحقائب من الخادم…' : 'بيانات الحقائب غير متاحة'}</h3><p>لن نعرض رصيدًا أو باقات وهمية. حدّث الحالة للمتابعة.</p><button type="button" class="sb12-button" data-sb12-action="reload" ${s.loading ? 'disabled' : ''}>تحديث الحالة</button></div>` : `<div class="sb12-compose" data-sb12-compose>${previewHTML(q)}${choicesHTML(q,fixed)}</div><section class="sb12-bags" aria-labelledby="sb12-bags-title"><div class="sb12-section-heading"><h3 id="sb12-bags-title">حقائب الغرفة</h3><button type="button" class="sb12-text-button" data-sb12-action="reload" ${s.loading || s.busy ? 'disabled' : ''}>${icon('refresh')} تحديث</button></div><p class="sb12-caption">مهلة الاستلام 10 دقائق بعد الفتح، وغير المستلم يعود للمرسل بتسوية الخادم. مؤقت الشاشة للعرض فقط.</p><div class="sb12-bag-list">${arr(s.data.bags).length ? arr(s.data.bags).map(bagHTML).join('') : '<p class="sb12-empty">لا توجد حقائب في حالة الغرفة الحالية.</p>'}</div></section>${inventoryHTML(fixed)}`;
    const pending = s.pending ? `<aside class="sb12-pending" role="status" data-sb12-pending><b>طلب محفوظ غير محسوم</b><p>التفاصيل والمفتاح ثابتان، حتى لو تغير الرصيد بعد انقطاع الاتصال. إعادة الطلب نفسه لا تعني معاملة جديدة.</p><button type="button" class="sb12-button" data-sb12-action="retry" ${s.busy || s.stale || !hasData ? 'disabled' : ''}>${s.busy ? 'جارٍ تأكيد الطلب…' : 'إعادة الطلب نفسه بأمان'}</button><button type="button" class="sb12-text-button" data-sb12-action="reload" ${s.loading || s.busy ? 'disabled' : ''}>تحديث الحالة</button></aside>` : '';
    const footer = hasData ? `<footer class="sb12-footer"><div class="sb12-balance">${icon('coin')}<span>رصيدك الفعلي<strong data-sb12-balance data-currency="coins">${s.stale ? 'يلزم تحديث' : number(s.data.coins)} <small>عملة</small></strong></span><button type="button" class="sb12-plus" data-sb12-action="packs" data-currency="${q.currency}" aria-label="فتح باقات ${q.currency === 'coins' ? 'العملات' : 'الجواهر'} الحالية" ${typeof openPacks !== 'function' || s.busy ? 'disabled' : ''}>${icon('plus')}</button></div><fieldset class="sb12-delay" ${fixed ? 'disabled' : ''}><legend>${icon('clock')} موعد الفتح</legend><label><input type="radio" name="sb12-delay" data-sb12-field="delay" value="0" ${s.delay === 0 ? 'checked' : ''}> حالًا</label><label><input type="radio" name="sb12-delay" data-sb12-field="delay" value="300" ${s.delay === 300 ? 'checked' : ''}> 300 ثانية</label></fieldset><div class="sb12-send-wrap"><button type="button" class="sb12-button sb12-send" data-sb12-action="send" ${fixed || !q.valid || s.loading ? 'disabled' : ''}>${s.busy ? 'جارٍ تأكيد الخادم…' : 'إرسال الحقيبة'}</button><small>${s.pending ? 'احسم الطلب المحفوظ أولًا' : q.reason ? esc(q.reason) : 'يؤكد الخادم السعر ويحفظ التمويل'}</small></div></footer>` : '';
    const confirmation = s.confirm && s.confirm === q.fingerprint ? `<div class="sb12-confirm" role="group" aria-label="تأكيد تمويل الحقيبة" data-sb12-confirm><h3>تأكيد التمويل</h3><p>لكل مستلم ${s.type === 'coins' ? number(q.perRecipient) + ' عملة' : 'وحدة واحدة من ' + esc(q.offer?.name)}، لعدد ${number(q.count)} مستلمًا.</p><p>سيحجز الخادم الإجمالي <strong>${number(showN(q.total, q.currency || 'gems'))} عملة</strong> من رصيدك؛ الفتح ${s.delay === 0 ? 'حالًا' : 'بعد 300 ثانية'}.</p><div><button type="button" class="sb12-button" data-sb12-action="confirm" ${!q.valid || s.busy ? 'disabled' : ''}>تأكيد وإرسال</button><button type="button" class="sb12-text-button" data-sb12-action="cancel-confirm">رجوع</button></div></div>` : '';
    return `<div class="sb12-root ${s.mode === 'panel' ? 'sb12-panel-mode' : 'sb12-sheet-mode'}" dir="rtl" ${!s.open ? 'hidden' : ''} data-sb12-root>${s.mode === 'sheet' ? '<button type="button" class="sb12-backdrop" data-sb12-action="close" aria-label="إغلاق حقائب الغرفة" tabindex="-1"></button>' : ''}<section class="sb12-sheet" ${s.mode === 'sheet' ? 'role="dialog" aria-modal="true"' : 'role="region"'} aria-labelledby="sb12-title" tabindex="-1" data-sb12-sheet><span class="sb12-handle" aria-hidden="true"></span><header class="sb12-header"><span class="sb12-emblem">${icon('bag')}</span><div><span class="sb12-eyebrow">لعبك · مشاركة تليق بمجلسك</span><h2 id="sb12-title">حقائب الغرفة</h2></div><button type="button" class="sb12-close" data-sb12-action="close" aria-label="إغلاق">${icon('close')}</button></header><div class="sb12-tabs" role="tablist" aria-label="محتوى الحقيبة">${[['coins','العملات الذهبية'],['item','الأغراض'],['gift','الهدايا']].map(([type,label]) => `<button type="button" role="tab" id="sb12-tab-${type}" aria-selected="${s.type === type}" aria-controls="sb12-content" tabindex="${s.type === type ? 0 : -1}" data-sb12-action="tab" data-type="${type}" ${fixed ? 'disabled' : ''}>${label}</button>`).join('')}</div><div id="sb12-content" class="sb12-scroll" role="tabpanel" aria-labelledby="sb12-tab-${s.type}" data-sb12-scroll>${s.loading && hasData ? '<p class="sb12-refreshing" role="status">جارٍ تحديث الحالة…</p>' : ''}${s.stale && hasData ? '<p class="sb12-warning" role="status">البيانات المعروضة آخر قراءة وليست رصيدًا حيًا؛ أوقفنا الإرسال حتى تحديث الخادم.</p>' : ''}${s.error ? `<p class="sb12-error" role="alert" data-sb12-error>${esc(s.error)}</p>` : ''}${s.notice ? `<p class="sb12-success" role="status" data-sb12-result>${esc(s.notice)}</p>` : ''}${pending}${content}${confirmation}</div>${footer}</section></div>`;
  }
  function paint() {
    if (!host || disposed) return;
    const oldRoot = host.querySelector?.('[data-sb12-root]'), scroll = host.querySelector?.('[data-sb12-scroll]');
    const oldTop = scroll?.scrollTop || 0;
    const offersScroll = host.querySelector?.('.sb12-offers')?.scrollTop || 0;
    const active = globalThis.document?.activeElement;
    const focused = host.contains?.(active) ? {field:active.dataset?.sb12Field,action:active.dataset?.sb12Action,id:active.dataset?.id,type:active.dataset?.type,start:active.selectionStart,end:active.selectionEnd} : null;
    const keyboardBottom = oldRoot?.style.getPropertyValue('--sb12-keyboard-bottom') || '', viewportHeight = oldRoot?.style.getPropertyValue('--sb12-viewport-height') || '';
    host.innerHTML = render();
    const nextRoot = host.querySelector('[data-sb12-root]');
    if (keyboardBottom) nextRoot.style.setProperty('--sb12-keyboard-bottom',keyboardBottom);
    if (viewportHeight) nextRoot.style.setProperty('--sb12-viewport-height',viewportHeight);
    const nextScroll = host.querySelector('[data-sb12-scroll]'); if (nextScroll) nextScroll.scrollTop = oldTop;
    const nextOffers = host.querySelector('.sb12-offers'); if (nextOffers) nextOffers.scrollTop = offersScroll;
    if (focused) {
      const candidates = host.querySelectorAll('[data-sb12-field], [data-sb12-action]');
      const next = [...candidates].find(el => focused.field ? el.dataset.sb12Field === focused.field : el.dataset.sb12Action === focused.action && (el.dataset.id || '') === (focused.id || '') && (el.dataset.type || '') === (focused.type || ''));
      if (next && !next.disabled) { next.focus({preventScroll:true}); try { if (typeof focused.start === 'number') next.setSelectionRange(focused.start,focused.end); } catch {} }
    }
    if (s.confirm && nextScroll) host.querySelector('[data-sb12-confirm]')?.scrollIntoView?.({block:'nearest'});
  }
  function handle(event) {
    if (disposed) return false;
    const element = event.target?.closest?.('[data-sb12-action], [data-sb12-field]');
    if (!element || host && !host.contains(element)) return false;
    if (element.disabled) return true;
    const field = element.dataset.sb12Field;
    if (field) {
      if (['count','perRecipient','rewardAmount'].includes(field) ? event.type !== 'input' : event.type !== 'change') return true;
      update({[field]:field === 'delay' ? Number(element.value) : element.value}); return true;
    }
    if (event.type !== 'click') return true;
    event.preventDefault();
    const action = element.dataset.sb12Action;
    if (action === 'close') close();
    else if (action === 'reload') void load();
    else if (action === 'retry') void transact(null,true);
    else if (action === 'tab') update({type:element.dataset.type});
    else if (action === 'pick') update({itemId:element.dataset.id});
    else if (action === 'inventory') update({creditId:element.dataset.id});
    else if (action === 'send') void create();
    else if (action === 'confirm') void create(true);
    else if (action === 'reward-send') void reward();
    else if (action === 'reward-confirm') void reward(true);
    else if (action === 'cancel-confirm') { s.confirm = ''; notify(); }
    else if (action === 'claim') void claim(element.dataset.id);
    else if (action === 'redeem') void redeem();
    else if (action === 'packs' && !s.busy && typeof openPacks === 'function') {
      const currency = s.view === 'reward' ? 'gems' : quote().currency;
      close(); Promise.resolve().then(() => openPacks(currency)).then(() => { if (!disposed && ensureIdentity()) return load(); }).catch(error => { if (!disposed) { s.error = friendly(error?.message); message(s.error); notify('error'); } });
    }
    return true;
  }
  function keydown(event) {
    if (!s.open || !host || disposed) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    const tab = event.target?.closest?.('[role="tab"]');
    if (tab && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault(); const order = ['coins','item','gift'], index = order.indexOf(s.type), type = event.key === 'Home' ? order[0] : event.key === 'End' ? order[2] : order[(index + (event.key === 'ArrowLeft' ? 1 : 2)) % order.length];
      if (update({type})) host.querySelector(`[data-type="${type}"]`)?.focus(); return;
    }
    if (s.mode === 'sheet' && event.key === 'Tab') {
      const nodes = [...host.querySelectorAll('[data-sb12-sheet] button:not(:disabled), [data-sb12-sheet] input:not(:disabled), [data-sb12-sheet] select:not(:disabled), [data-sb12-sheet][tabindex]')].filter(el => el.tabIndex >= 0 && !el.hidden);
      if (!nodes.length) { event.preventDefault(); host.querySelector('[data-sb12-sheet]')?.focus(); return; }
      const first = nodes[0], last = nodes[nodes.length - 1], active = document.activeElement;
      if (event.shiftKey && (active === first || !nodes.includes(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !nodes.includes(active))) { event.preventDefault(); first.focus(); }
    }
  }
  function tick() {
    if (!s.open || !host || !s.data || disposed) return;
    // Display-clock transitions trigger a fresh authoritative GET, never an award/refund in the browser.
    const now = serverNow();
    const transition = arr(s.data.bags).some(bag => {
      const opens = timeMs(bag.opensAt), expires = timeMs(bag.expiresAt);
      return now !== null && (opens !== null && s.serverAt < opens && now >= opens || expires !== null && s.serverAt < expires && now >= expires);
    });
    if (transition && !s.loading && !s.busy && !s.stale) void load();
  }
  function open(type) {
    if (disposed) return;
    const options = typeof type === 'object' && type ? type : {};
    const selection = typeof type === 'string' ? type : options.mode || options.type;
    if (options.layout === 'panel' || options.layout === 'sheet') s.mode = options.layout;
    s.view = selection === 'reward' ? 'reward' : 'bags'; s.confirm = '';
    type = selection;
    ensureIdentity(); if (['coins','item','gift'].includes(type) && !s.pending && !s.busy) update({type});
    returnFocus = globalThis.document?.activeElement || null; s.open = true; notify('open');
    host?.querySelector('[data-sb12-sheet]')?.focus({preventScroll:true});
    if (!timer && typeof globalThis.setInterval === 'function') timer = setInterval(tick,1000);
    return load();
  }
  function close() { s.open = false; s.confirm = ''; if (timer) { clearInterval(timer); timer = null; } notify('closed'); if (returnFocus?.isConnected) returnFocus.focus?.({preventScroll:true}); returnFocus = null; }
  function unmount() {
    if (host) { host.removeEventListener('click',handle); host.removeEventListener('input',handle); host.removeEventListener('change',handle); host.removeEventListener('keydown',keydown); host.innerHTML = ''; }
    keyboardCleanup?.(); keyboardCleanup = null; host = null; if (timer) { clearInterval(timer); timer = null; }
  }
  function mount(container, {mode = 'sheet',open:shouldOpen = true} = {}) {
    if (disposed) throw Error('This benefits controller was destroyed.');
    if (!container?.addEventListener) throw new TypeError('mount requires a DOM container.');
    unmount(); host = container; s.mode = mode === 'panel' ? 'panel' : 'sheet';
    host.addEventListener('click',handle); host.addEventListener('input',handle); host.addEventListener('change',handle); host.addEventListener('keydown',keydown);
    const viewport = globalThis.visualViewport;
    if (viewport && globalThis.window) {
      const resize = () => { const root = host?.querySelector('[data-sb12-root]'); if (!root) return; const bottom = Math.max(0,window.innerHeight - viewport.height - viewport.offsetTop); root.style.setProperty('--sb12-keyboard-bottom',`${bottom}px`); root.style.setProperty('--sb12-viewport-height',`${viewport.height}px`); };
      viewport.addEventListener('resize',resize); viewport.addEventListener('scroll',resize); keyboardCleanup = () => { viewport.removeEventListener('resize',resize); viewport.removeEventListener('scroll',resize); }; paint(); resize();
    }
    if (shouldOpen) void open(s.view === 'reward' ? 'reward' : undefined); else { s.open = false; paint(); }
    return unmount;
  }
  function destroy() { if (disposed) return; close(); disposed = true; generation++; stopRequests(); unmount(); s.data = null; s.lastResult = null; }
  restore();
  return {load,sync,render,mount,unmount,handle,open,close,update,create,claim,redeem,reward,retry:() => transact(null,true),getState:viewState,destroy};
}
