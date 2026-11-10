/* المتجر الموحّد: كل الأرقام والتحقق من الخادم؛ العميل يعرض ويرسل معرّف العنصر ومفتاح طلب فريد فقط. لا دفع حقيقي حالياً. */
import { RARITY, RARITY_ORDER, rarityLv, frameArt, isFrame2, bgArt, isBg2 } from './cosmetics.js?v=r68z31';
import { avatarArt } from './avatars.js?v=r68z31';
import { packHTML, conversionHTML } from './economy-view.js?v=reference-r15';
import { referenceOf, referenceImage, ACHIEVEMENT_ART, ACHIEVEMENT_ART_KIDS } from './reference-assets.js?v=r68z31';
import { renderProfileIcon } from './preview/assets/profile/ui-icons-inline.js?v=r58p';
import { giftArt } from './giftart.js?v=r68i-r14';
import {backgroundVisual,isSuppliedBackground} from './background-art.js?v=r58p';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = (n) => Number(n).toLocaleString('ar-EG-u-nu-latn');
export const SH = { dur: 7, data: null, err: '', loading: false, world: 'players', tab: 'frame', preview: null, confirm: null, busy: false, giftTab: null, who: null, try: {}, f: { rar: 'all', own: 'all', sort: 'rar', set: 'all' }, lim: 24 };
// R58p: أسماء أقصر وترتيب أوضح (شبكة 4×2 بأيقونات)
export const STOREFRONT_TABS = [['avatar', 'الصور الرمزية'], ['frame', 'الإطارات'], ['title', 'الألقاب'], ['mic-frame', 'المايك'], ['chat-bubble', 'الفقاعات'], ['board', 'اللوحات'], ['souvenir', 'التذكارات'], ['special-id', 'أيدي مميز'], ['room-id', 'أيدي الغرف'], ['room-bg', 'خلفيات الغرف'], ['cue', 'عصي البلياردو'], ['bball', 'كور البولينغ'], ['bg', 'الخلفيات']];
const STORE_TAB_ICON = { avatar: '👤', title: '👑', 'mic-frame': '🎙️', frame: '🏵️', 'chat-bubble': '💬', board: '🪧', souvenir: '🎁', 'special-id': '🆔', 'room-id': '🏠', 'room-bg': '🏰', cue: '🎱', bball: '🎳', bg: '🖼️' };
export const SLOT_TABS = [['avatar', 'الأفاتارات'], ['frame', 'الإطارات'], ['bg', 'الخلفيات'], ['owned', 'أغراضي'], ['sets', 'المجموعات'], ['title', 'ألقاب'], ['badge', 'شارات'], ['ach', 'المكتسبة'], ['gift', 'الهدايا'], ['coins', 'عملات'], ['tasks', 'مكافآت'], ['log', 'السجل']];
const CUR = { coins: renderProfileIcon('coin').replace('class="pvp-icon"','class="sh-currency sh-currency-coins"').replace('<svg','<svg width="24" height="24"'), gems: giftArt({motif:'diamond',cat:'luxury',variant:0,name:'جواهر'},24).replace('class="gift-art','class="sh-currency sh-currency-gems gift-art') };
const TAB_ICON = { avatar: 'person', frame: 'frame', entrance: 'star', owned: 'shirt', bg: 'image', sets: 'shirt', title: 'crown', badge: 'medal', ach: 'trophy', gift: 'star', convert: 'back', tasks: 'calendar', log: 'file' };
const tabIcon = (tab) => CUR[tab] || renderProfileIcon(TAB_ICON[tab]);
// Keep economy-view's quantities, payment lock and form hooks; replace only its currency artwork.
const packViewHTML = (policy, currency) => packHTML(policy, currency).replaceAll(currency === 'gems' ? '💎' : '🪙', CUR[currency]);
const conversionHint = () => 'الموقع صار بعملة وحدة: الجواهر تحولت لعملات (جوهرة = 20 عملة).';
const KIND = { start: 'رصيد البداية', daily: 'مكافأة يومية', entry_fee: 'رسم دخول', prize: 'جائزة', refund: 'استرجاع رسوم', purchase: 'شراء', gift: 'هدية', reward: 'مكافأة', admin: 'تعديل إدارة' };
export const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));

let loadTask = null;
export function invalidateLedger() { SH.logRows = null; SH.logOffset = 0; SH.logTotal = null; SH.logVersion = (SH.logVersion || 0) + 1; }
export function load(req) {
  if (loadTask) return loadTask;
  SH.loading = true; SH.err = '';
  loadTask = Promise.resolve().then(() => req('shop:get')).catch(() => null).then((r) => {
    if (!r || !r.ok) { SH.err = r?.error || 'تعذّر تحميل المتجر. تأكد من الاتصال.'; return; }
    apply(r);
  }).finally(() => { SH.loading = false; loadTask = null; });
  return loadTask;
}
export function apply(r) { if (r && r.items && r.coins !== undefined) { SH.data = r; invalidateLedger(); } }

export function txListHTML(list, emptyMsg = 'ما فيه معاملات بعد.') {
  // R63: عملة وحدة — نفس تصفية سجل المحفظة
  list = (list || []).filter((t) => !(t.ref === 'single-currency' && (t.cur === 'gems' || String(t.reason).startsWith('تحويل تلقائي')))).map((t) => t.cur === 'gems' ? { ...t, cur: 'coins', delta: t.delta * 20, before: undefined } : t);
  if (!list?.length) return `<p class="muted" style="text-align:start">${emptyMsg}</p>`;
  return `<ul class="tx-list">${list.map((t) => `<li><span class="tx-ic" aria-hidden="true">${CUR[t.cur] ?? CUR.coins}</span>
    <div><b>${esc(t.reason || KIND[t.kind] || t.kind)}</b><small>${new Date(t.ts).toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' })} · ${t.before === undefined ? '' : nf(t.before) + ' ← ' + nf(t.after)}</small></div>
    <strong class="${t.delta < 0 ? 'neg' : 'pos'}" dir="ltr">${t.delta > 0 ? '+' : ''}${nf(t.delta)}</strong></li>`).join('')}</ul>`;
}

/* ---- معاينة مركّبة: خلفية + أفاتار + إطار + لقب + شارة ---- */
const SLOT_NAME = { cue: 'عصا بلياردو', bball: 'كرة بولينغ', 'mic-frame': 'إطار مايك', souvenir: 'تذكار', avatar: 'أفاتار', frame: 'إطار', entrance: 'دخول مركبة', bg: 'خلفية', title: 'لقب', badge: 'شارة', 'chat-bubble': 'فقاعة دردشة', board: 'لوحة اسم', 'special-id': 'أيدي مميز', 'room-id': 'أيدي غرفة' , 'room-bg': 'خلفية غرفة'};
const FACE = `<span class="avatar-wrap cx-ghost" style="--sz:64px">${renderProfileIcon('person')}</span>`;
/** إطار حول محتوى (جديد = طبقة SVG، قديم = حلقة CSS) */
export function framed(css, inner, cls = '') {
  if (!css) return `<span class="cx-fw ${cls}">${inner}</span>`;
  // R59b: الإطارات القديمة (ref-p/ref-k) صورها webp بخلفية سودا وغير موسّطة؛ نستخدم نسخة شفافة موسّطة
  if (isFrame2(css)) return `<span class="cx-fw has ${cls}">${inner}${String(frameArt(css)).replace(/\/(?:assets\/reference|preview\/assets\/cosmetics)\/(ref-[pk]-frame-\d+)\.(?:webp|png)/g, '/assets/art58/legacy/$1.webp')}</span>`;
  return `<span class="cx-fw old ${cls}"><span class="pf-ring fr-${esc(css)}">${inner}</span></span>`;
}
/** خلفية كطبقة (جديدة = مشهد SVG، قديمة = تدرّج CSS) */
export const bgLayer = (item) => {
  if (!item) return '';
  const css = typeof item === 'object' ? item.css : item;
  return isSuppliedBackground(typeof item === 'object' ? item.id : item) ? backgroundVisual(item) : isBg2(css) ? bgArt(css, 'cx-fill') : css ? `<i class="cx-fill sh-bg-${esc(css)}"></i>` : '';
};
const rarChip = (r) => `<em class="cx-rar r-${esc(r)}">${esc(RARITY[r]?.label ?? '')}</em>`;
const safeArt = (src) => typeof src === 'string' && /^\/assets\/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g|svg)$/i.test(src) && !src.includes('..') ? src : '';
export const idPlate = (price) => price >= 100_000_000 ? 6 : price >= 48_000_000 ? 5 : price >= 40_000_000 ? 4 : price >= 30_000_000 ? 3 : price >= 25_000_000 ? 2 : 1;
/** R52: نفس صورة العنصر بالمتجر لصفحتي VIP ونوبل */
export function itemThumb(i) { return thumb(i); }
function thumb(i) {
  // R57: فقاعات الدردشة ولوحات الأسماء والأيديات المميزة
  if (i.slot === 'chat-bubble') return `<span class="rp-art rp-art-bubble lux-thumb"><span class="rp-bubble-${esc(i.css || '')}">مرحبا 👋</span></span>`;
  if (i.slot === 'board') return `<span class="lux-thumb"><span class="lux-board lux-board-${esc(i.css || '')}">اسمك</span></span>`;
  // R58n: قالب الأيدي من رسومات المالك حسب السعر (6 قوالب)
  if (i.slot === 'bball') return safeArt(i.art) ? `<span class="bb68-thumb"><img src="${esc(safeArt(i.art))}" alt="" loading="lazy" decoding="async"></span>` : renderProfileIcon('image');
  if (i.slot === 'cue') return safeArt(i.art) ? `<span class="cue68-thumb"><img src="${esc(safeArt(i.art))}" alt="" loading="lazy" decoding="async"></span>` : renderProfileIcon('image');
  if (i.slot === 'room-bg') return safeArt(i.art) ? `<img class="rbg67-thumb" src="${esc(safeArt(i.art))}" alt="" loading="lazy" decoding="async">` : renderProfileIcon('image');
  if (i.slot === 'room-id') return `<span class="lux-thumb"><span class="lux-sid lux-rid art-idp idp-${idPlate(i.price)} r-${esc(i.rarity || 'rare')}"><small>ROOM ID</small><b dir="ltr">${esc(i.css || '')}</b></span></span>`;
  if (i.slot === 'special-id') return `<span class="lux-thumb"><span class="lux-sid art-idp idp-${idPlate(i.price)} r-${esc(i.rarity || 'rare')}"><small>ID</small><b dir="ltr">${esc(i.css || '')}</b></span></span>`;
  if (i.slot === 'entrance') return safeArt(i.art) ? `<img class="r23-entrance-art" src="${esc(safeArt(i.art))}" alt="" loading="lazy" decoding="async">` : `<span class="r23-art-missing">${renderProfileIcon('image')}<small>صورة المركبة غير متاحة</small></span>`;
  // R58r: إطار المايك فوق دائرة تمثّل صورة المتحدث
  if (i.slot === 'mic-frame') return /^mf\d\d$/.test(i.css || '') ? `<span class="mf-thumb"><i aria-hidden="true">🎙️</i><img src="/assets/art58/mic/m${esc(i.css.slice(2))}.webp?v=r58r" alt="" loading="lazy" decoding="async"></span>` : renderProfileIcon('star');
  if (i.slot === 'souvenir') return safeArt(i.art) ? `<img class="r23-souv-art" src="${esc(safeArt(i.art))}?v=r58o" alt="" loading="lazy" decoding="async">` : renderProfileIcon('star');
  if (i.slot === 'avatar') return avatarArt(i.id, 64, i.css === 'av2' ? undefined : i.css) || renderProfileIcon('person');
  if (i.slot === 'frame') return safeArt(i.art) ? `<img class="r23-frame-art" src="${esc(safeArt(i.art))}" alt="" loading="lazy" decoding="async">` : referenceOf(i.css || i.id)?.slot === 'frame' ? referenceImage(i.css || i.id, 'r23-frame-art') : framed(i.css, FACE, 'sm');
  if (i.slot === 'bg') return `<span class="cx-bgthumb">${bgLayer(i)}</span>`;
  if (i.slot === 'title') return referenceOf(i.id)?.slot === 'title' ? referenceImage(i.id, 'r23-item-art') : `<span class="cx-title r-${esc(i.rarity || i.tier || 'common')}">${esc(i.css || i.name)}</span>`;
  // R58k: الشارة ترجع لرسمتها برقم العنصر لو الـcss رمز (إيموجي)
  const key = referenceOf(i.css || i.id) ? (i.css || i.id) : i.id;
  const art = referenceOf(key);
  return art && art.slot === i.slot ? referenceImage(key, 'r23-item-art') : renderProfileIcon(TAB_ICON[i.slot] || 'image');
}
const curBal = (d, c) => (c === 'coins' ? d.coins : (d.coins ?? 0) / 20 + (d.gems ?? 0)); // R63: عملة وحدة
const itemStatus = (i) => i.status ?? (i.active === false || i.retired ? 'unavailable' : 'available');
const statusLabel = (i) => itemStatus(i) === 'coming-soon' ? 'قريبًا' : itemStatus(i) === 'hidden' ? 'مخفي من المتجر' : 'غير متاح';
const visibleItem = (i, d) => itemStatus(i) !== 'hidden' || d.owned.includes(i.id);
// الاستحقاق من الخادم؛ الشرط الصريح يبقى مقفلاً إذا لم يصل قرار الخادم بعد.
const itemEligible = (i) => i.eligibility ? i.eligibility.eligible === true : !['minLevel', 'minVip', 'minNoble'].some((k) => i[k] > 0);
const requirementLabel = (i) => ['minLevel', 'minVip', 'minNoble'].map((k, n) => Number.isSafeInteger(i[k]) && i[k] > 0 ? `${['LEVEL', 'VIP', 'NOBLE'][n]} ${nf(i[k])}` : '').filter(Boolean).join(' · ');
const approvedPrice = (i) => i.proposalOnly !== true && i.priceApproved !== false && Number.isSafeInteger(i.price) && i.price >= 0 && ['coins', 'gems'].includes(i.currency);
const ownsItem = (i, d) => d.owned.includes(i.id) || (i.earned === true && i.done === true);
/* R68z: أغراض بمدة (يوم/أسبوع/شهر/دائم) */
export const isTimed = (i, d = SH.data) => !!d?.timedSlots?.includes(i.slot) && !!d?.durations?.length && i.price > 0;
export const expOf = (i, d = SH.data) => Number(d?.exp?.[i.id]) || 0;
export function durPrice(i, days, d = SH.data) { const x = d?.durations?.find((v) => v.days === days); if (!x || !days || i.price <= 0) return i.price; const v = i.price * x.pct / 100; const step = v >= 10000 ? 1000 : v >= 1000 ? 100 : 10; return Math.max(step, Math.round(v / step) * step); }
export const chosenDays = (i, d = SH.data) => { if (!isTimed(i, d)) return 0; if (!d.durations.some((x) => x.days === SH.dur)) SH.dur = d.durations[0].days; return SH.dur; };
export const timeLeft = (t) => { const ms = Math.max(0, t - Date.now()); const dd = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000); return dd ? `${dd} يوم${h ? ` و ${h} س` : ''}` : h ? `${h} ساعة` : `${m} دقيقة`; };
const minPrice = (i, d) => isTimed(i, d) ? Math.min(...d.durations.map((x) => durPrice(i, x.days, d))) : i.price;
const canBuyItem = (i, d) => approvedPrice(i) && itemStatus(i) === 'available' && i.active !== false && !i.retired && itemEligible(i) && (!ownsItem(i, d) || (isTimed(i, d) && expOf(i, d) > 0)) && curBal(d, i.currency) >= minPrice(i, d);
function priceHTML(i) {
  if (i.earned) return '<span class="r23-price-note">مكتسب</span>';
  if (!approvedPrice(i)) return '<span class="r23-price-note">بانتظار اعتماد السعر</span>';
  if (i.offer?.live) return `<span class="of62"><span class="of62-tag">🔥${i.offer.discount > 0 ? ` -${nf(i.offer.discount)}%` : ' عرض'} · <time data-of62-end="${esc(i.offer.endsAt)}">${offerLeft(i.offer.endsAt)}</time></span>${i.offer.discount > 0 ? `<s>${nf(i.offer.was)}</s>` : ''}<span class="r23-price-value">${CUR[i.currency]}<b>${nf(i.price)}</b></span></span>`;
  if (i.offer?.exclusive && !i.offer.live && i.offer.startsAt > Date.now()) return `<span class="r23-price-note">حصري — يبدأ بعد <time data-of62-end="${esc(i.offer.startsAt)}">${offerLeft(i.offer.startsAt)}</time></span>`;
  return `<span class="r23-price-value">${CUR[i.currency]}<b>${nf(i.price)}</b></span>`;
}
/* R62: عداد عروض المتجر محدودة الوقت */
function offerLeft(end) { const ms = Math.max(0, Number(end) - Date.now()); const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000), sec = Math.floor(ms % 60000 / 1000); const p2 = (n) => String(n).padStart(2, '0'); return d ? `${d}ي ${p2(h)}:${p2(m)}` : `${p2(h)}:${p2(m)}:${p2(sec)}`; }
if (!globalThis.__of62) { globalThis.__of62 = setInterval(() => { const els = document.querySelectorAll('[data-of62-end]'); for (const el of els) el.textContent = offerLeft(el.dataset.of62End); }, 1000); }
function itemActionHTML(i, d) {
  const on = d.equipped[i.slot] === i.id;
  if (ownsItem(i, d) && i.slot === 'room-bg') return `<a class="btn ghost" href="#/social-rooms">تملكها ✓ · اختارها من «خلفية البث» بغرفتك</a>`;
  if (ownsItem(i, d) && i.slot === 'souvenir') return `<a class="btn ghost" href="#/profile" data-pvp-open-souv>في مقتنياتك ✓</a>`;
  const ex = expOf(i, d);
  if (ownsItem(i, d) && ex) return `<span class="du68-left">⏳ باقي ${timeLeft(ex)}</span><button class="btn ${on ? 'ghost' : 'gold'}" type="button" data-act="shop-equip" data-id="${esc(i.id)}" data-slot="${esc(i.slot)}" data-on="${on ? 1 : 0}"${SH.busy ? ' disabled' : ''}>${on ? 'إزالة التجهيز' : 'تجهيز'}</button><button class="btn ghost" type="button" data-act="shop-ask" data-id="${esc(i.id)}"${SH.busy ? ' disabled' : ''}>تمديد · ${nf(durPrice(i, chosenDays(i, d), d))}</button>`;
  if (ownsItem(i, d)) return `<button class="btn ${on ? 'ghost' : 'gold'}" type="button" data-act="shop-equip" data-id="${esc(i.id)}" data-slot="${esc(i.slot)}" data-on="${on ? 1 : 0}"${SH.busy || (!on && !itemEligible(i)) ? ' disabled' : ''}>${on ? 'إزالة التجهيز' : itemEligible(i) ? 'تجهيز' : 'شرط الرتبة غير مكتمل'}</button>`;
  if (!approvedPrice(i)) return '<button class="btn ghost" type="button" disabled>الشراء غير متاح · السعر غير معتمد</button>';
  if (itemStatus(i) !== 'available' || i.active === false || i.retired) return `<button class="btn ghost" type="button" disabled>${statusLabel(i)}</button>`;
  if (!itemEligible(i)) return '<button class="btn ghost" type="button" disabled>شرط الرتبة غير مكتمل</button>';
  if (!canBuyItem(i, d)) return `<a class="btn ghost" href="#/wallet">${renderProfileIcon('plus')} الرصيد غير كافٍ · المحفظة</a>`;
  return `<button class="btn gold" type="button" data-act="shop-ask" data-id="${esc(i.id)}"${SH.busy ? ' disabled' : ''}>${i.price === 0 ? 'استلام مجاني' : isTimed(i, d) ? `${SH.busy ? 'جاري الشراء…' : 'شراء'} · ${nf(durPrice(i, chosenDays(i, d), d))}` : 'شراء'}</button>`;
}
function itemCard(i, d) {
  const owned = ownsItem(i, d); const on = d.equipped[i.slot] === i.id;
  const state = owned && expOf(i, d) ? `⏳ ${timeLeft(expOf(i, d))}` : owned ? (on ? 'مجهّز' : 'تملكه') : !approvedPrice(i) ? 'عرض فقط' : itemStatus(i) !== 'available' || i.active === false || i.retired ? statusLabel(i) : !itemEligible(i) ? 'مقفل بالرتبة' : '';
  return `<li class="sh-card r23-product r-${esc(i.rarity || i.tier || 'common')}${owned ? ' own' : ''}${on ? ' equipped' : ''}" data-id="${esc(i.id)}" data-slot="${esc(i.slot)}"><span class="r68-rib r-${esc(i.rarity || 'common')}">${RAR_ICON[i.rarity] || '⚪'} ${esc(RARITY[i.rarity]?.label || 'عادي')}</span><button class="r23-product-tile" type="button" data-act="shop-preview" data-id="${esc(i.id)}" aria-label="معاينة ${esc(i.name)}${state ? ' · ' + esc(state) : ''}"><span class="r23-product-art" aria-hidden="true">${thumb(i)}</span>${owned ? `<span class="r23-owned-mark" aria-hidden="true">${renderProfileIcon('check')}</span>` : ''}</button><div class="r23-price" aria-label="${approvedPrice(i) ? 'السعر' : 'حالة السعر'}">${priceHTML(i)}</div><span class="r23-sr">${esc(i.name)}</span>${state ? `<small class="r23-product-state">${esc(state)}</small>` : ''}</li>`;
}
/** العنصر المعروض بالمعاينة لكل خانة: التجربة ثم المجهّز */
function shown(d, slot) {
  const id = SH.try[slot] ?? d.equipped[slot];
  if (!id) return null;
  return d.items.find((x) => x.id === id) ?? d.achievements?.find((a) => a.id === id && a.done && a.kind === slot) ?? d.equippedView?.[slot] ?? null;
}
const currentWho = (me) => ({ name: 'أنت', face: FACE, ...(me || {}), ...(typeof SH.who === 'function' ? SH.who() : SH.who || {}) });
export function previewHTML(d, focusItem = null) {
  const who = currentWho();
  const pick = (slot) => focusItem?.slot === slot ? focusItem : shown(d, slot);
  const av = pick('avatar'); const fr = pick('frame'); const bg = pick('bg'); const ti = pick('title'); const ba = pick('badge');
  const face = av ? avatarArt(av.id, 84) || who.face : who.face;
  const framedFace = safeArt(fr?.art) ? `<span class="cx-fw has lg">${face}<img class="cx-frame ref-frame r23-preview-frame" src="${esc(safeArt(fr.art))}" alt=""></span>` : framed(fr?.css, face, 'lg');
  const artMap = SH.world === 'kids' || av?.id?.startsWith('ref-k-') ? ACHIEVEMENT_ART_KIDS : ACHIEVEMENT_ART;
  const tried = Object.keys(SH.try).length;
  return `<section class="card cx-preview" aria-label="معاينة مظهرك"><div class="cx-stage">${bgLayer(bg)}<div class="cx-who">${framedFace}<b>${ba ? `<span>${artMap[ba.id] ? referenceImage(artMap[ba.id], 'ref-equipped-badge') : renderProfileIcon('medal')}</span> ` : ''}${esc(who.name)}</b>${ti ? `<span class="cx-title r-${esc(ti.rarity ?? ti.tier ?? 'common')}">${artMap[ti.id] ? referenceImage(artMap[ti.id], 'ref-equipped-title') : esc(ti.css ?? ti.name)}</span>` : ''}</div></div>
    <p class="cx-pnote">${focusItem ? 'معاينة فقط — لا خصم ولا تغيير في التجهيز عند فتحها.' : tried ? `معاينة فقط (${nf(tried)} عنصر تجربة) — ما ينخصم شي ولا يتغير مظهرك إلا بعد الشراء والتجهيز.` : 'اضغط على أي منتج لمعاينته على مظهرك.'}${tried ? ' <button class="pill-btn" type="button" data-act="shop-try-clear">إلغاء التجربة</button>' : ''}</p></section>`;
}
function previewItem(id, d = SH.data) {
  if (!d || !id) return null;
  const item = [...d.items, ...(d.collectionItems || []), ...Object.values(d.equippedView || {})].find((i) => i && i.id === id && visibleItem(i, d));
  if (item) return item;
  const earned = d.achievements?.find((a) => a.id === id && a.done && ['title', 'badge'].includes(a.kind));
  return earned ? { ...earned, slot: earned.kind, rarity: earned.tier, earned: true, desc: earned.cond } : null;
}
/** UI state only. No request, wallet debit, equip, key allocation or saved appearance mutation. */
export function openPreview(id) {
  if (SH.busy || !previewItem(id)) return false;
  SH.preview = id; SH.confirm = null;
  return true;
}
export function closePreview() {
  if (SH.busy) return false;
  SH.preview = null; SH.confirm = null;
  return true;
}
export function detailsHTML(i, d = SH.data, confirming = false) {
  if (!i || !d) return '';
  const stage = ['chat-bubble', 'board', 'special-id', 'room-id', 'cue', 'bball'].includes(i.slot) ? `<section class="r23-lux-preview" aria-label="معاينة">${thumb(i)}</section><p class="cx-pnote">${i.slot === 'special-id' ? 'يصير هذا رقمك الظاهر بملفك والغرف بعد الشراء. كل رقم ينباع لحساب واحد فقط.' : i.slot === 'room-id' ? 'بعد الشراء تختاره من إعدادات غرفتك ← «أيدي الغرفة». كل رقم ينباع لحساب واحد فقط.' : i.slot === 'bball' ? 'جهّزها وتطلع لك بلعبة البولينغ بدال الكرة العادية، وخصمك يشوفها بعد.' : i.slot === 'cue' ? 'جهّزها وتطلع لك بلعبة ٨ بول بدال العصا العادية، وخصمك يشوفها بعد.' : 'يظهر بالغرف بعد الشراء والتجهيز.'}</p>` : i.slot === 'entrance' ? `<section class="r23-entrance-preview" data-entrance-preview="${esc(i.id)}" aria-label="معاينة المركبة">${thumb(i)}<span>${renderProfileIcon('person')}${esc(currentWho().name)}</span></section><p class="cx-pnote">معاينة فقط — لا خصم ولا تغيير في دخولك عند فتحها.</p>` : previewHTML(d, i);
  const requirements = requirementLabel(i);
  return `<div class="r23-details-head"><div><small>${esc(SLOT_NAME[i.slot] || 'مظهر')}</small><h2 id="r23-preview-title">${esc(i.name)}</h2></div><button class="r23-dialog-close" type="button" data-act="shop-preview-close" aria-label="إغلاق المعاينة"${SH.busy ? ' disabled' : ''}>${renderProfileIcon('close')}</button></div>${stage}<div class="r23-detail-meta">${rarChip(i.rarity)}${i.set && d.sets?.[i.set] ? `<span>${esc(d.sets[i.set])}</span>` : ''}${i.season ? `<span>موسم ${esc(i.season)}</span>` : ''}</div>${i.desc ? `<p class="r23-detail-desc">${esc(i.desc)}</p>` : ''}${requirements ? `<p class="r23-requirements">شرط الاستحقاق: ${esc(requirements)}</p>` : ''}${i.previewPlaceholder ? '<p class="r23-requirements">المعروض معاينة مؤقتة، وليس الرسم النهائي.</p>' : ''}<div class="r23-detail-price">${priceHTML(isTimed(i, d) ? { ...i, price: durPrice(i, chosenDays(i, d), d) } : i)}</div>${!approvedPrice(i) && !i.earned ? '<p class="r23-price-disclaimer">السعر لم يُعتمد بعد؛ العرض للمعاينة فقط والشراء مقفول.</p>' : ''}${isTimed(i, d) && (confirming || canBuyItem(i, d)) ? `<div class="du68" role="radiogroup" aria-label="مدة الغرض">${d.durations.map((x) => { const pr = durPrice(i, x.days, d); const off = (x.days === 0 && ownsItem(i, d) && !expOf(i, d)) || curBal(d, i.currency) < pr; return `<button type="button" role="radio" class="du68-o${SH.dur === x.days ? ' on' : ''}" data-act="shop-dur" data-d="${x.days}" aria-checked="${SH.dur === x.days}"${off ? ' disabled' : ''}><b>${esc(x.label)}</b><small>${CUR[i.currency]} ${nf(pr)}</small></button>`; }).join('')}</div>${expOf(i, d) ? `<p class="r23-confirm-note">المدة الحالية باقي ${timeLeft(expOf(i, d))}، والجديدة تنضاف فوقها.</p>` : ''}` : ''}${confirming ? `<p class="r23-confirm-note">${i.price === 0 ? 'تأكيد الاستلام المجاني' : `تأكيد الشراء${isTimed(i, d) ? ` (${esc(d.durations.find((x) => x.days === SH.dur)?.label || '')})` : ''} · ${CUR[i.currency]} ${nf(durPrice(i, chosenDays(i, d), d))} · الرصيد بعدها: ${CUR[i.currency]} ${nf(curBal(d, i.currency) - durPrice(i, chosenDays(i, d), d))}`}</p><div class="btn-row"><button class="btn gold" type="button" data-act="shop-buy"${SH.busy ? ' disabled aria-busy="true"' : ''}>${SH.busy ? 'جاري التنفيذ…' : 'تأكيد'}</button><button class="btn ghost" type="button" data-act="shop-cancel"${SH.busy ? ' disabled' : ''}>إلغاء الشراء</button></div>` : `<div class="btn-row r23-detail-actions">${itemActionHTML(i, d)}<button class="btn ghost" type="button" data-act="shop-preview-close"${SH.busy ? ' disabled' : ''}>إغلاق</button></div>`}`;
}
export function previewDialogHTML(d = SH.data) {
  const confirming = previewItem(SH.confirm, d);
  const i = confirming || previewItem(SH.preview, d);
  if (!i) return '';
  const canConfirm = confirming && canBuyItem(i, d);
  return `<div class="sh-modal r23-preview-dialog" data-r23-dialog="preview" role="dialog" aria-modal="true" aria-label="${canConfirm ? 'تأكيد الشراء' : 'معاينة المنتج'}" aria-labelledby="r23-preview-title" tabindex="-1"><div class="card r23-preview-sheet">${detailsHTML(i, d, !!canConfirm)}</div></div>`;
}
function filtersHTML(d, tab) {
  const f = SH.f;
  const sets = [...new Set(d.items.filter((i) => i.slot === tab && i.set).map((i) => i.set))];
  const chip = (k, v, l, on) => `<button type="button" class="cx-chip ${on ? 'on' : ''}" data-act="shop-f" data-k="${k}" data-v="${esc(v)}" aria-pressed="${on}">${l}</button>`;
  return `<div class="cx-filters" role="group" aria-label="تصفية العناصر">
    <div class="cx-row">${chip('rar', 'all', 'كل الندرات', f.rar === 'all')}${RARITY_ORDER.map((r) => chip('rar', r, `<i class="cx-dot r-${r}"></i>${RARITY[r].label}`, f.rar === r)).join('')}</div>
    <div class="cx-row">${chip('own', 'all', 'الكل', f.own === 'all')}${chip('own', 'afford', 'أقدر أشتريه', f.own === 'afford')}${chip('own', 'owned', 'أملكه', f.own === 'owned')}${chip('own', 'not', 'ما أملكه', f.own === 'not')}
      <label class="cx-sort">الترتيب <select data-change="shop-sort" aria-label="ترتيب العناصر"><option value="rar" ${f.sort === 'rar' ? 'selected' : ''}>حسب الندرة</option><option value="asc" ${f.sort === 'asc' ? 'selected' : ''}>السعر: الأقل أولاً</option><option value="desc" ${f.sort === 'desc' ? 'selected' : ''}>السعر: الأعلى أولاً</option></select></label></div>
    ${sets.length ? `<div class="cx-row">${chip('set', 'all', 'كل المجموعات', f.set === 'all')}${sets.map((s) => chip('set', s, esc(d.sets?.[s] ?? s), f.set === s)).join('')}</div>` : ''}</div>`;
}
// لا نفترض سعر صرف بين العملات والجواهر. نجمع العملة ثم نرتب السعر داخلها.
const priceOrder = (a, b) => a.currency === b.currency ? (a.price ?? 0) - (b.price ?? 0) : String(a.currency || '').localeCompare(String(b.currency || ''));
// Featured order is presentation only: no products or prices are fabricated.
// R58h: إطارات المالك أولًا (الأفخم فوق)
const featuredFrames = [...Array.from({ length: 10 }, (_, i) => `art-f4-${String(10 - i).padStart(2, '0')}`), ...Array.from({ length: 42 }, (_, i) => `art-f3-${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 12 }, (_, i) => `art-f2-${String(12 - i).padStart(2, '0')}`), 'art-f-29', 'art-f-28', 'art-f-24', 'art-f-23', 'art-f-22', 'art-f-21', 'art-f-20', 'art-f-18', 'art-f-16', 'art-f-15', 'art-f-14', 'art-f-11', 'art-f-10', 'art-f-09', 'art-f-08', 'art-f-07', 'art-f-06', 'art-f-03', 'art-f-02', 'art-f-01', 'ref-p-frame-08', 'ref-p-frame-02', 'ref-p-frame-06'];
const featuredOrder = (i) => { const n = featuredFrames.indexOf(i.id); return n < 0 ? featuredFrames.length : n; };
function gridFor(d, tab) {
  const f = SH.f;
  const all = tab === 'owned' ? ownedItems(d) : d.items.filter((i) => i.slot === tab);
  let list = all;
  if (f.rar !== 'all') list = list.filter((i) => i.rarity === f.rar);
  if (f.set !== 'all') list = list.filter((i) => i.set === f.set);
  if (tab !== 'owned' && f.own === 'owned') list = list.filter((i) => ownsItem(i, d));
  if (tab !== 'owned' && f.own === 'not') list = list.filter((i) => !ownsItem(i, d));
  if (tab !== 'owned' && f.own === 'afford') list = list.filter((i) => canBuyItem(i, d));
  list = [...list].sort(f.sort === 'asc' ? priceOrder : f.sort === 'desc' ? (a, b) => -priceOrder(a, b) : (a, b) => rarityLv(a.rarity) - rarityLv(b.rarity) || priceOrder(a,b));
  if (tab === 'frame' && f.sort === 'rar') list.sort((a, b) => featuredOrder(a) - featuredOrder(b));
  // R57: الخلفيات الجاهزة للبيع (ومنها مجموعة الفخامة) قبل اللي بانتظار اعتماد السعر
  if (tab === 'bg' && f.sort === 'rar') list.sort((a, b) => (b.id.startsWith('art-pb-') ? 1 : 0) - (a.id.startsWith('art-pb-') ? 1 : 0) || (approvedPrice(b) ? 1 : 0) - (approvedPrice(a) ? 1 : 0) || (b.id.startsWith('lux-') ? 1 : 0) - (a.id.startsWith('lux-') ? 1 : 0) || rarityLv(b.rarity) - rarityLv(a.rarity));
  const have = all.filter((i) => ownsItem(i, d)).length;
  const shownList = list.slice(0, SH.lim);
  const empty = tab === 'owned' ? 'لا توجد أغراض مملوكة متاحة للعرض في بيانات حسابك الحالية.' : !all.length ? tab === 'entrance' ? 'لا توجد مركبات في كتالوج الخادم لهذا القسم حالياً.' : 'لا توجد منتجات لهذا القسم حالياً.' : 'لا توجد عناصر تطابق التصفية الحالية.';
  return `<p class="r23-count" role="status">${tab === 'owned' ? `أغراضك ${nf(all.length)} · من جميع أقسام المتجر` : `تملك ${nf(have)} من ${nf(all.length)} · المعروض ${nf(list.length)}`}</p>${list.length ? `<ul class="sh-grid r23-product-grid">${shownList.map((i) => itemCard(i, d)).join('')}</ul>` : `<div class="card empty-state r23-empty">${renderProfileIcon(tab === 'owned' ? 'shirt' : 'image')}<p>${empty}</p></div>`}${list.length > shownList.length ? `<button class="btn ghost block" type="button" data-act="shop-more">عرض المزيد (${nf(list.length - shownList.length)})</button>` : ''}`;
}
function ownedItems(d) {
  const byId = new Map();
  for (const i of [...(d.items || []), ...(d.collectionItems || []), ...Object.values(d.equippedView || {})]) if (i && d.owned.includes(i.id) && !byId.has(i.id)) byId.set(i.id, i);
  for (const a of d.achievements || []) if (a.done && ['title', 'badge'].includes(a.kind) && !byId.has(a.id)) byId.set(a.id, { ...a, slot: a.kind, rarity: a.tier, earned: true, desc: a.cond });
  return [...byId.values()];
}
function unavailableHTML(tab, me) {
  const who = currentWho(me);
  const id = who.displayPlayerId ?? who.specialPlayerId ?? who.playerId;
  const names = Object.fromEntries(STOREFRONT_TABS);
  return `<section class="card r23-empty" data-empty-category="${esc(tab)}">${renderProfileIcon(tab === 'special-id' ? 'info' : 'image')}<h2>${esc(names[tab] || 'غير متاح')}</h2>${tab === 'special-id' ? `<p>معرّف حسابك الحالي</p>${id !== undefined && id !== null && String(id) !== '' ? `<b class="r23-current-id" dir="ltr">ID: ${esc(id)}</b>` : '<p class="muted">المعرّف غير متاح في بيانات الحساب الحالية.</p>'}<p>اختر رقم مميز من القائمة تحت. بعد الشراء يصير هو رقمك الظاهر بملفك وبالغرف، وكل رقم ينباع لحساب واحد بس. تقدر ترجع لرقمك العادي من «أغراضي».</p>` : '<p>هذا القسم غير متاح في كتالوج المتجر الحالي؛ لا توجد عناصر للبيع أو وظائف شراء مرتبطة به.</p>'}</section>`;
}
function setsHTML(d) {
  const by = {};
  for (const i of d.collectionItems ?? d.items) if (i.set) (by[i.set] ??= []).push(i);
  return `<div class="stack">${Object.entries(by).map(([k, items]) => {
    const have = items.filter((i) => d.owned.includes(i.id)).length;
    const missing = items.filter((i) => !d.owned.includes(i.id));
    const paused = missing.filter((i) => itemStatus(i) !== 'available' || !approvedPrice(i)).length;
    const left = { coins: 0, gems: 0 }; for (const i of missing) if (approvedPrice(i) && itemStatus(i) === 'available' && itemEligible(i)) left[i.currency] += i.price;
    const pick = (slot) => items.find((i) => i.slot === slot);
    return `<section class="card cx-setcard"><div class="cx-sethead"><h2>${esc(d.sets?.[k] ?? k)}</h2>${k.startsWith('ref-kids-set-') ? referenceImage(k.replace('kids-set','k-set'), 'ref-set-cover') : ''}<span class="pa-bal">تملك ${nf(have)}/${nf(items.length)}</span></div>
      <ul class="cx-setrow">${items.map((i) => `<li class="r-${esc(i.rarity)} ${d.owned.includes(i.id) ? 'own' : ''}" title="${esc(i.name)}"><span>${thumb(i)}</span><small>${esc(i.name)}</small>${itemStatus(i) !== 'available' && !d.owned.includes(i.id) ? `<small class="muted">${itemStatus(i) === 'unavailable' ? 'موقوف من البيع — غير متاح' : statusLabel(i)}</small>` : `<button class="btn sm ghost" data-act="shop-open-set-item" data-id="${esc(i.id)}">عرض العنصر</button>`}${requirementLabel(i) ? `<small class="muted">${esc(requirementLabel(i))}</small>` : ''}</li>`).join('')}</ul>
      <p class="hint" style="text-align:start">${have === items.length ? 'كملت المجموعة ✔' : `${left.coins || left.gems ? `الباقي المتاح: ${left.coins ? CUR.coins + ' ' + nf(left.coins) : ''}${left.coins && left.gems ? ' + ' : ''}${left.gems ? CUR.gems + ' ' + nf(left.gems) : ''} — كل عنصر ينشرى لحاله من تبويبه.` : ''}${paused ? ` ${nf(paused)} من العناصر المتبقية موقوفة من البيع وغير متاحة حالياً.` : ''}`}</p>
      <button class="btn ghost block" type="button" data-act="shop-try-set" data-v="${esc(k)}" ${pick('avatar') || pick('frame') || pick('bg') ? '' : 'disabled'}>${renderProfileIcon('camera')} عاين المجموعة على مظهرك</button></section>`;
  }).join('')}</div>`;
}
export function achHTML(d, compact = false) {
  const artMap = d.artWorld === 'kids' ? ACHIEVEMENT_ART_KIDS : ACHIEVEMENT_ART;
  const list = (d.achievements ?? []).filter((a) => (!d.achievementKind || a.kind === d.achievementKind) && (d.artWorld !== 'kids' || artMap[a.id]));
  if (!list.length) return '<section class="card"><h2>شروط الاستحقاق</h2><p>رسوم الأطفال موجودة، لكن باقي شروط ألقابها وشاراتها ما تحددت. ما بنمنح لقب أو شارة عشوائية. إنجازات حسابك القائمة باقية بتبويب المكتبة السابقة.</p></section>'; 
  const row = (a) => {
    const on = d.equipped[a.kind] === a.id;
    const pct = Math.round((a.value / a.goal) * 100);
    return `<li class="cx-ach ${a.done ? 'done' : 'lock'} r-${esc(a.tier)}"><span class="cx-achic" aria-hidden="true">${artMap[a.id] ? referenceImage(artMap[a.id], a.kind === 'title' ? 'ref-ach ref-ach-title' : 'ref-ach') : a.done ? a.icon : '🔒'}</span><div><b>${a.kind === 'title' ? 'لقب' : 'شارة'} «${esc(a.name)}»</b> ${rarChip(a.tier)}<small>${esc(a.cond)} · ${nf(a.value)}/${nf(a.goal)}</small><span class="cx-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${a.goal}" aria-valuenow="${a.value}" aria-label="التقدم"><i style="width:${pct}%"></i></span></div>${a.done && !compact ? `<button class="btn sm ${on ? 'ghost' : ''}" type="button" data-act="shop-equip" data-id="${esc(a.id)}" data-slot="${a.kind}" data-on="${on ? 1 : 0}">${on ? 'إزالة' : 'تجهيز'}</button>` : ''}</li>`;
  };
  const done = list.filter((a) => a.done); const lock = list.filter((a) => !a.done).sort((a, b) => b.value / b.goal - a.value / a.goal);
  return `<section class="card"><h2>🏅 المكتسبة (${nf(done.length)}/${nf(list.length)})</h2>${done.length ? `<ul class="cx-achs">${done.map(row).join('')}</ul>` : '<p class="muted" style="text-align:start">ما اكتسبت شي للحين. الشروط الفعلية موضحة تحت؛ ما ينفتح شيء قبل تحققها.</p>'}</section>
    <section class="card"><h2>🔒 المقفلة وشروطها</h2><ul class="cx-achs">${lock.map(row).join('')}</ul>
    <p class="hint" style="text-align:start">الألقاب والشارات هنا مكتسبة فقط: تنفتح من أرقامك الحقيقية بالخادم (مباريات منتهية، انتصارات، مستوى، نقاط، هدايا فعلية) وما تنشرى. الألقاب والشارات المدفوعة القديمة محفوظة بتبويب «المكتبة السابقة».</p></section>`;
}

/* R68f: صف الندرة الظاهر (مثل التصميم) + الحزم المميزة من مجموعات المتجر الحقيقية */
const RAR_ICON = { common: '⚪', premium: '🟢', rare: '💎', epic: '⭐', legendary: '👑', ultra: '✨' };
function rarityRow68(tab) {
  const f = SH.f, chip = (v, l) => `<button type="button" class="r68-rar r-${v} ${f.rar === v ? 'on' : ''}" data-act="shop-f" data-k="rar" data-v="${v}" aria-pressed="${f.rar === v}">${l}</button>`;
  return `<div class="r68-rars" role="group" aria-label="الندرة">${['common', 'rare', 'epic', 'legendary'].map((r) => chip(r, `<i aria-hidden="true">${RAR_ICON[r]}</i>${RARITY[r].label}`)).join('')}${chip('all', 'الكل')}</div>`;
}
function bundles68() { return '<section class="r68-bundles" data-bnd68 aria-label="حزم مميزة"></section>'; }
/* R68t: الحزم المميزة — تنجاب من الخادم وتنشرى من نفس المتجر */
const BND_ICON = { gift: '/assets/art68/gifts/a17.webp', lion: '/assets/art68/gifts/a03.webp', vip: '/assets/art68/gifts/c01.webp' };
let bndList = null, bndBusy = false;
async function bndFetch() { try { const r = await fetch('/api/shop/bundles', { credentials: 'same-origin', cache: 'no-store' }); const j = await r.json(); bndList = j.ok ? j.list : []; } catch { bndList = []; } }
function bndHTML() {
  if (!bndList?.length) return '';
  const byId = new Map((SH.data?.items || []).map((i) => [i.id, i]));
  return `<h2><span aria-hidden="true">🎁</span> حزم مميزة</h2><div class="r68-bgrid">${bndList.map((b, n) => `<article class="r68-bundle${b.done ? ' is-done' : ''}">${n === bndList.length - 1 ? '<i class="r68-best">الأفضل</i>' : ''}<img class="r68-bicon" src="${BND_ICON[b.icon] || BND_ICON.gift}" alt="" loading="lazy"><b>${esc(b.name)}</b><small>${esc(b.sub)}</small><span class="r68-bart">${b.items.map((it) => { const i = byId.get(it.id); return `<span class="${it.owned ? 'own' : ''}" title="${esc(it.name)}">${i ? thumb(i) : ''}</span>`; }).join('')}</span>${b.done ? '<span class="r68-bprice is-own">تملكها ✓</span>' : `<button type="button" class="r68-bprice" data-bnd-buy="${esc(b.id)}" data-bnd-price="${b.price}"${bndBusy ? ' disabled' : ''}>${CUR.coins}<b>${bndN(b.price)}</b></button>${b.worth > b.price ? `<s>${bndN(b.worth)}</s>` : ''}`}</article>`).join('')}</div>`;
}
const bndN = (n) => n >= 1e6 ? `${+(n / 1e6).toFixed(2)} مليون` : nf(n);
function bndFill() { for (const el of document.querySelectorAll('[data-bnd68]')) el.innerHTML = bndHTML(); }
if (typeof document !== 'undefined' && !globalThis.__bnd68) {
  globalThis.__bnd68 = new MutationObserver(() => { const el = document.querySelector('[data-bnd68]:empty'); if (!el) return; if (bndList) bndFill(); else bndFetch().then(bndFill); });
  globalThis.__bnd68.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-bnd-buy]'); if (!b || bndBusy) return; e.preventDefault();
    const item = bndList?.find((x) => x.id === b.dataset.bndBuy); if (!item) return;
    if (!confirm(`تشتري «${item.name}» بـ ${nf(item.price)} عملة؟`)) return;
    bndBusy = true; bndFill();
    try {
      const r = await fetch('/api/shop/bundles/buy', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, seen: item.price }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { alert(j.error || 'تعذّر الشراء.'); bndList = null; await bndFetch(); }
      else { alert(`تم! صارت قطع «${item.name}» في مقتنياتك.`); location.reload(); return; }
    } finally { bndBusy = false; bndFill(); }
  });
}
/* ---------- R68z: متجر الأرقام المميزة (نفس تصميم الفيديو) ---------- */
const ID_CHIPS = [['rec', 'ترشيح'], ['king', 'ملك'], ['seq', 'مستمر'], ['rep', 'إعادة']];
const allSame = (v) => /^(\d)\1+$/.test(v);
const isSeq = (v) => { if (v.length < 3) return false; const d = [...v].map(Number); const up = d.every((x, i) => !i || x === d[i - 1] + 1), dn = d.every((x, i) => !i || x === d[i - 1] - 1); return up || dn; };
const isRep = (v) => !allSame(v) && !isSeq(v) && (/^(\d+)\1+\d?$/.test(v) || v === [...v].reverse().join('') || /(\d)\1/.test(v));
export function idKind(v) { v = String(v || ''); return allSame(v) ? 'king' : isSeq(v) ? 'seq' : isRep(v) ? 'rep' : 'other'; }
const idPill = (v, big = false) => `<span class="ids-pill ${String(v).length <= 4 ? 'gold' : 'blue'}${big ? ' big' : ''}" dir="ltr"><b>${esc(v)}</b><i aria-hidden="true">ID</i></span>`;
export function idsBodyHTML(d, tab) {
  const f = SH.idsF || 'rec'; const q = String(SH.idsQ || '').replace(/\D/g, '');
  let list = d.items.filter((i) => i.slot === tab && i.css);
  if (f !== 'rec') list = list.filter((i) => idKind(i.css) === f);
  if (q) list = list.filter((i) => String(i.css).includes(q));
  list.sort((a, b) => String(a.css).length - String(b.css).length || Number(a.css) - Number(b.css));
  const chips = `<div class="ids-chips">${ID_CHIPS.map(([k, l]) => `<button type="button" class="ids-c${f === k ? ' sel' : ''}" aria-pressed="${f === k}" data-act="ids-f" data-v="${k}">${l}</button>`).join('')}</div>`;
  const grid = list.length ? `<div class="ids-grid">${list.map((i) => { const own = d.owned.includes(i.id); return `<button type="button" class="ids-card${own ? ' own' : ''}" data-act="shop-preview" data-id="${esc(i.id)}" aria-label="${esc(i.css)} — ${nf(i.price)}">${idPill(i.css)}<span class="ids-pr">${own ? '<em>تملكه ✓</em>' : `${nf(i.price)} <i class="ids-coin" aria-hidden="true"></i>`}</span></button>`; }).join('')}</div>` : `<p class="ids-empty">${q ? 'ما لقينا رقم بهالبحث.' : 'ما فيه أرقام بهالقسم حالياً.'}</p>`;
  return `<div class="ids-body">${chips}${grid}</div>`;
}
export function idsPageHTML() {
  const d = SH.data; if (!d) return `<div class="ids-page"><p class="ids-empty">${esc(SH.err || 'جاري التحميل…')}</p></div>`;
  const tab = SH.idsTab || 'special-id';
  return `<div class="ids-page" dir="rtl"><header class="ids-head"><a class="ids-back" href="#/shop" aria-label="رجوع">›</a><h1>متجر الأرقام المميزة</h1><button type="button" class="ids-ic" data-act="ids-help" aria-label="شرح">?</button><button type="button" class="ids-ic" data-act="ids-search" aria-label="بحث"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button></header>
    ${SH.idsHelp ? '<p class="ids-help">الرقم المميز يصير رقمك الظاهر بملفك (أو رقم غرفتك الصوتية) بدال الرقم العادي. كل رقم ينباع لشخص واحد بس. «ملك» = أرقام مكررة، «مستمر» = أرقام متسلسلة، «إعادة» = أرقام فيها تكرار.</p>' : ''}
    ${SH.idsSearch ? `<input class="ids-search" data-ids-q inputmode="numeric" placeholder="ابحث برقم…" value="${esc(SH.idsQ || '')}" aria-label="بحث برقم">` : ''}
    <nav class="ids-tabs"><button type="button" class="ids-t${tab === 'special-id' ? ' sel' : ''}" data-act="ids-tab" data-v="special-id">مستخدم</button><button type="button" class="ids-t${tab === 'room-id' ? ' sel' : ''}" data-act="ids-tab" data-v="room-id">الغرف الصوتية</button></nav>
    ${idsBodyHTML(d, tab)}
    <footer class="ids-foot"><span class="ids-bal">${nf(d.coins)} <i class="ids-coin" aria-hidden="true"></i></span><a href="#/shop/packs" class="ids-go">اذهب للشحن ‹</a></footer>${previewDialogHTML(d)}</div>`;
}
export function shopHTML(me) {
  if (SH.loading && !SH.data) return '<div class="r23-store" dir="rtl"><div class="card empty-state"><p role="status">جاري تحميل المتجر…</p></div></div>';
  if (SH.err || !SH.data) return `<div class="r23-store" dir="rtl"><div class="card empty-state"><p role="alert">${esc(SH.err || 'تعذّر التحميل.')}</p><button class="btn" type="button" data-act="shop-reload">إعادة المحاولة</button></div></div>`;
  const full = SH.data;
  const inWorld = (i) => /^(lux-|sid-|rid-|rbg-|art-|souv-|cue-|bball-)/.test(i.id) ? SH.world === 'players' : i.slot === 'entrance' ? SH.world === 'kids' ? i.kids === true : SH.world === 'players' && i.kids !== true : SH.world === 'legacy' ? !i.id.startsWith('ref-') : i.id.startsWith(SH.world === 'kids' ? 'ref-k-' : 'ref-p-') || (SH.world === 'players' && isSuppliedBackground(i.id));
  const d = { ...full, items: full.items.filter((i) => inWorld(i) && visibleItem(i, full)), collectionItems: full.collectionItems?.filter((i) => inWorld(i) && visibleItem(i, full)) };
  const tab = [...SLOT_TABS, ...STOREFRONT_TABS].some((t) => t[0] === SH.tab) ? SH.tab : 'frame';
  const header = `<a class="r68-shop-banner" href="#/shop/packs/coins" aria-label="متجر لعبك — مظاهر حصرية"><img src="/assets/art68/shop-banner.webp" alt="" decoding="async" fetchpriority="high"></a><button class="r23-my-items r68-myitems ${tab === 'owned' ? 'on' : ''}" type="button" data-act="shop-tab" data-v="owned" aria-pressed="${tab === 'owned'}">أغراضي</button>`;
  const world = `<div class="ref-worlds" role="group" aria-label="عالم المتجر">${[['players','مظاهر اللاعبين'],['kids','عالم الأطفال'],['legacy','المكتبة السابقة']].map(([v,l])=>`<button type="button" class="${SH.world===v?'on':''}" data-act="shop-world" data-v="${v}" aria-pressed="${SH.world===v}">${renderProfileIcon(v === 'players' ? 'person' : v === 'kids' ? 'game' : 'file')}${l}</button>`).join('')}</div>`;
  const activeTabs = SLOT_TABS.map(([k,l]) => [k, SH.world !== 'legacy' && k === 'badge' ? 'شارات الإنجازات' : SH.world !== 'legacy' && k === 'title' ? 'الألقاب المكتسبة' : l]);
  const tabs = `<div class="sh-tabs r23-store-tabs" role="tablist" aria-label="أقسام المتجر" dir="rtl"><a class="r68-viptab" href="#/vip"><i aria-hidden="true">💎</i><span>VIP</span></a>${STOREFRONT_TABS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" aria-controls="r23-store-panel" class="${tab === k ? 'on' : ''}" data-act="shop-tab" data-v="${k}"><i aria-hidden="true">${STORE_TAB_ICON[k] || ''}</i><span>${l}</span></button>`).join('')}</div>`;
  const more = `<details class="r23-more"><summary>${renderProfileIcon('menu')} المزيد <small>${esc(activeTabs.find(([k]) => k === tab)?.[1] || (SH.world === 'kids' ? 'عالم الأطفال' : SH.world === 'legacy' ? 'المكتبة السابقة' : 'مظاهر اللاعبين'))}</small></summary><div class="r23-more-panel">${world}<nav class="r23-legacy-nav" aria-label="أقسام المتجر الإضافية">${activeTabs.map(([k, l]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-act="shop-tab" data-v="${k}" aria-pressed="${tab === k}">${tabIcon(k)}${l}</button>`).join('')}</nav><details class="r23-policy"><summary>سياسة المتجر</summary><p>المظاهر شكلية فقط ولا تعطي أي أفضلية في اللعب. العملات افتراضية ولا تتحول إلى مال. الأسعار والاستحقاق والملكية كما يحددها الخادم. باقات الشحن تخضع للوضع المعتمد بالخادم. ${conversionHint(d.economy)}</p></details></div></details>`;
  let body;
  if (tab === 'tasks') {
    body = `<section class="card ref-daily"><h2>${SH.world === 'kids' ? 'مكافأة الطفل اليومية' : 'المكافأة اليومية'}</h2><p>200 عملة افتراضية، مرة واحدة لكل حساب في اليوم بتوقيت الإمارات. نفس المكافأة في كل أقسام الموقع، مب مكافأة ثانية.</p><button class="btn gold" data-act="wallet-daily" ${d.canDaily ? '' : 'disabled'}>${d.canDaily ? 'استلام المكافأة اليومية' : 'استلمتها اليوم'}</button></section><section class="card"><h2>مكافآت الإنجازات</h2><ul class="ach">${d.milestones.map((m) => `<li class="${m.done ? 'done' : ''}"><span class="ach-ico" aria-hidden="true">${CUR[m.cur]}</span><div><b>${esc(m.label)} · ${CUR[m.cur]} ${nf(m.amount)}</b><small>${m.done ? 'استلمتها ✅' : `${nf(Math.min(m.value, m.goal))}/${nf(m.goal)}`}</small></div>${m.ready ? `<button class="btn gold" type="button" data-act="shop-claim" data-id="${esc(m.id)}">استلام</button>` : ''}</li>`).join('')}</ul>
      <p class="hint" style="text-align:start">الخادم يتحقق من مبارياتك وانتصاراتك، وكل مكافأة تنصرف مرة وحدة.</p></section>`;
  } else if (tab === 'log') {
    const rows=SH.logRows || d.ledger; const total=SH.logTotal ?? d.ledgerTotal ?? rows.length; const offset=SH.logOffset || 0;
    const start = rows.length ? offset + 1 : 0; const end = rows.length ? Math.min(total, offset + rows.length) : 0;
    const buys = rows.filter((t) => t.kind === 'purchase');
    body = `<section class="card"><h2>مشتريات هالصفحة</h2>${txListHTML(buys, 'ما اشتريت شي بعد.')}</section><section class="card"><h2>كل المعاملات (${CUR.coins} و${CUR.gems})</h2>${txListHTML(rows)}<p class="hint">المعروض ${nf(start)} إلى ${nf(end)} من ${nf(total)} حركة محفوظة.</p><div class="btn-row"><button class="btn ghost" data-act="shop-ledger" data-offset="${Math.max(0,offset-60)}" ${offset===0||SH.loading?'disabled':''}>الأحدث</button><button class="btn ghost" data-act="shop-ledger" data-offset="${offset+60}" ${offset+60>=total||SH.loading?'disabled':''}>الأقدم</button></div></section>`;
  } else if (tab === 'coins') {
    body = packViewHTML(d.economy, 'coins');
  } else if (tab === 'convert') {
    body = conversionHTML(d.economy);
  } else if (tab === 'gems') {
    body = packViewHTML(d.economy, 'gems');
  } else if (tab === 'gift') {
    body = SH.giftTab ? SH.giftTab() : '<div class="card empty-state"><p>تعذّر عرض الهدايا.</p></div>';
  } else if (tab === 'sets') {
    body = `<details class="r23-appearance"><summary>${renderProfileIcon('camera')} معاينة مظهري</summary>${previewHTML(d)}</details>` + setsHTML(d);
  } else if (tab === 'ach' || (SH.world !== 'legacy' && ['badge','title'].includes(tab))) {
    body = achHTML({ ...d, artWorld: SH.world, achievementKind: tab === 'ach' ? null : tab });
    // R58k: شارات المتجر الجديدة (مثل «تنين الكون») تنعرض للبيع تحت الشارات المكتسبة
    if (tab === 'badge' && d.items.some((i) => i.slot === 'badge')) body += `<h3 class="r23-sub">شارات للبيع</h3>` + gridFor(d, 'badge');
  } else if (tab === 'souvenir') {
    body = `<p class="souv-note">التذكار ينحفظ في «المقتنيات» بملفك أول ما تشتريه.</p>` + gridFor(d, tab);
  } else if (tab === 'special-id' || tab === 'room-id') {
    body = idsBodyHTML(full, tab);
  } else if (['special-id', 'board', 'chat-bubble', 'room-id', 'room-bg'].includes(tab)) {
    body = (tab === 'special-id' ? unavailableHTML(tab, me).replace('data-empty-category', 'data-current-id') : '') + gridFor(d, tab);
  } else if (tab === 'owned') {
    body = gridFor(full, 'owned');
  } else {
    body = rarityRow68(tab) + `<details class="r23-filters"><summary>${renderProfileIcon('settings')} تصفية وترتيب</summary>${filtersHTML(d, tab)}</details>` + gridFor(d, tab) + bundles68() + (Object.keys(SH.try).length ? `<details class="r23-appearance" open><summary>${renderProfileIcon('camera')} معاينة مظهري</summary>${previewHTML(d)}</details>` : '') + (tab === 'avatar' && SH.freeAvatars ? SH.freeAvatars() : '');
  }
  let dlg = previewDialogHTML(full);
  if (SH.gemConfirm && SH.gemKey) dlg = `<div class="sh-modal" role="dialog" aria-modal="true" aria-label="إيصال تحويل سابق"><div class="card"><h2>مراجعة إيصال سابق</h2><p>التحويلات الجديدة مقفولة. يُرسل معرّف الطلب السابق فقط للتحقق من وجود إيصال محفوظ، دون إنشاء عملية جديدة.</p><button class="btn gold" type="button" data-act="shop-gem-buy" ${SH.busy?'disabled':''}>التحقق من الإيصال السابق</button></div></div>`;
  if (SH.convertConfirm?.key) dlg=`<div class="sh-modal" role="dialog" aria-modal="true" aria-label="إيصال تحويل سابق"><div class="card"><h2>مراجعة إيصال سابق</h2><p>التحويلات الجديدة مقفولة. يُعاد معرّف الطلب السابق فقط للتحقق من الإيصال، دون خصم أو إضافة جديدة.</p><button class="btn gold" data-act="shop-convert-go" ${SH.busy?'disabled':''}>التحقق من الإيصال السابق</button></div></div>`;
  return `<div class="stack ref-store r23-store" data-world="${esc(SH.world)}" data-store-tab="${esc(tab)}" dir="rtl">${header}${tabs}${more}<div class="r23-store-body" id="r23-store-panel" role="tabpanel">${body}</div>${dlg}</div>`;
}
// R58j: رابط «اقتنِ أول تذكار» من رف الملف يفتح قسم التذكارات مباشرة
if (typeof document !== 'undefined') document.addEventListener('click', (e) => { if (e.target.closest?.('[data-souv-shop]')) SH.tab = 'souvenir'; }, true);
