/* R52: أدوات عرض مشتركة لصفحتي VIP ونوبل بتصميم المرجع (داكن، شبكة امتيازات، أوراق سفلية).
 * عرض فقط: كل رقم ومستوى وامتياز يأتي من بيانات الخادم الموجودة (التقدم، عضوية VIP، مكافآت الرتب، شروط عناصر المتجر)،
 * ولا يُخترع امتياز أو رقم. */
import * as R from './rank-vip-shared.js?v=r66b';
// استيراد كمساحة أسماء: لو المتصفح عنده نسخة أقدم من shop.js بالكاش (بدون itemThumb) ما تنكسر الصفحة
import * as SHOP from '../shop.js?v=r68z16';
import { PERK_ITEMS } from '../rank-perks-r56.js?v=r67t';
const { esc, obj, list, nat } = R;

/* رموز أحادية اللون داخل الشكل السداسي (رسم بسيط خاص بالموقع) */
const P = {
  bubble: '<path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><path d="M7 10h10M7 13h6" class="o"/>',
  frame: '<circle cx="12" cy="13" r="6.5" class="o" stroke-width="2.4"/><path d="M7 6l2.5 2L12 4l2.5 4L17 6l-1 4H8Z"/>',
  badge: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z"/><path d="M12 8l1.4 2.8 3 .4-2.2 2.1.5 3L12 14.9 9.3 16.3l.5-3-2.2-2.1 3-.4Z" class="i"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M6 16l4-4 3 3 2-2 3 3" class="o"/><circle cx="16" cy="9" r="1.6" class="i"/>',
  title: '<rect x="3" y="8" width="18" height="8" rx="3"/><path d="M3 12H1l2-3M21 12h2l-2-3M7 12h10" class="o"/>',
  car: '<path d="M3 15l2-5c.4-1 1.2-1.6 2.3-1.6h7.6c1 0 1.8.5 2.3 1.4L20 13h1a2 2 0 0 1 2 2v2H3Z"/><circle cx="7.5" cy="17.5" r="2" class="i"/><circle cx="17" cy="17.5" r="2" class="i"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7Z"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.5h4a1.6 1.6 0 0 1 0 3.2h-3a1.6 1.6 0 0 0 0 3.2h4" class="o i"/>',
  gem: '<path d="M7 4h10l4 5-9 11L3 9Z"/><path d="M3 9h18M9 4l3 5 3-5M12 9v11" class="o i"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5Z"/><path d="M5 20h14" class="o"/>',
  gift: '<rect x="3" y="9" width="18" height="5" rx="1"/><rect x="5" y="14" width="14" height="7" rx="1"/><path d="M12 9v12M12 9c-2-4-6-4-6-1.5S10 9 12 9c2 0 6-.5 6-1.5S14 5 12 9Z" class="o i"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" class="o"/>',
  chevron: '<path d="M9 5l7 7-7 7" class="o" stroke-width="2.4"/>',
  dots: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>',
  help: '<circle cx="12" cy="12" r="9" class="o"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.7.3-1 .8-1 1.6v.6" class="o"/><circle cx="12" cy="17.2" r="1.1"/>',
  history: '<rect x="4" y="3" width="12" height="17" rx="2" class="o"/><path d="M7 8h6M7 11h4" class="o"/><circle cx="17" cy="16" r="4.5"/><path d="M17 14v2.2l1.4 1" class="o i"/>',
  bell: '<path d="M5 17c1.6-1 1-4.5 2-8a5 5 0 0 1 10 0c1 3.5.4 7 2 8l1 1.6H4Z"/><path d="M10 20.5a2 2 0 0 0 4 0" class="o"/>',
  close: '<path d="M6 6l12 12M18 6L6 18" class="o" stroke-width="2.2"/>',
  laurel: '<path d="M14 21c-6-3-8-9-6-16" class="o" stroke-width="1.6"/><path d="M8.5 7.5c-2-.5-3-2-3-3.8 2 .2 3.3 1.5 3 3.8ZM7.6 11.2c-2.1.1-3.6-1.1-4.2-2.8 2-.4 3.6.6 4.2 2.8ZM8.2 14.8c-2 .7-3.8 0-4.8-1.5 1.9-.9 3.7-.4 4.8 1.5ZM10.2 17.8c-1.7 1.2-3.6 1.1-5-.1 1.6-1.4 3.5-1.4 5 .1Z"/>',
  play: '<circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4Z" class="i"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M7.5 12.3l3 3 6-6.3" class="o i" stroke-width="2.2"/>',
};
export function glyph(name, cls = '') {
  return `<svg class="vn-glyph ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] ?? P.star}</svg>`;
}
export const hex = (name) => `<span class="vn-hex" aria-hidden="true">${glyph(name)}</span>`;

/** 4m / 500k / 10k مثل المرجع، والرقم الكامل يبقى بالنص البديل */
export function short(value) {
  if (!nat(value)) return '—';
  const f = (n, s) => `${Number.isInteger(n) ? n : n.toFixed(1).replace(/\.0$/, '')}${s}`;
  return value >= 1e6 ? f(value / 1e6, 'm') : value >= 1e3 ? f(value / 1e3, 'k') : String(value);
}
export const num = (value) => (nat(value) ? new Intl.NumberFormat('en-US').format(value) : '—');
export function dateLine(value) {
  const at = R.timestamp(value);
  if (at === null) return '';
  const d = new Date(at), p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
export const SLOT_LABEL = Object.freeze({ frame: 'إطار رأس', badge: 'شارة', bg: 'خلفية الملف', title: 'لقب', entrance: 'مركبة دخول', avatar: 'أفاتار' });
export const SLOT_GLYPH = Object.freeze({ frame: 'frame', badge: 'badge', bg: 'image', title: 'title', entrance: 'car', avatar: 'person' });

/** صورة عنصر متجر حقيقي (نفس عرض المتجر)، أو رمز سداسي */
/** R58b: لقب الرتبة كشريط ملكي بنص على سطر واحد (بدل الدائرة اللي كانت تكسر «أسطورة VIP» لسطرين) */
const TITLE_TONES = [['#f3d6b4', '#9a5a22'], ['#ffffff', '#8d97ab'], ['#fff1b8', '#c58b12'], ['#ffe08a', '#a8700e'], ['#ffe9a0', '#b0141f']];
function titleArt(item) {
  const text = String(item.css || item.name || '').replace(/^لقب\s*«|»$/g, '');
  const m = /^rp-(vip|nb)-t(\d+)$/.exec(String(item.id || '')); const rank = m ? Number(m[2]) : 5;
  const tier = m && m[1] === 'vip' ? 4 : Math.min(4, Math.max(0, Math.ceil(rank / 2) - 1));
  const [a, b] = TITLE_TONES[tier]; const g = 'vt' + Math.random().toString(36).slice(2, 8);
  const w = Math.min(104, 26 + [...text].length * 9.5);
  return `<span class="vn-item-art vn-title-art"><svg viewBox="2 4 116 48" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`
    + (tier >= 3 ? `<path d="M48 18l3-9 5 5 4-8 4 8 5-5 3 9z" fill="url(#${g})" stroke="#4a2c06" stroke-width=".8"/>` : '')
    + `<path d="M${60 - w / 2 - 10} 28l8 9-8 9h10v-18z M${60 + w / 2 + 10} 28l-8 9 8 9h-10v-18z" fill="${b}" opacity=".85"/>`
    + `<rect x="${60 - w / 2}" y="22" width="${w}" height="26" rx="6" fill="url(#${g})" stroke="#3a2406" stroke-width="1"/><rect x="${60 - w / 2 + 2.5}" y="24.5" width="${w - 5}" height="21" rx="4.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>`
    + `<text x="60" y="40" text-anchor="middle" direction="rtl" font-family="Tajawal,Cairo,Arial,sans-serif" font-size="13" font-weight="800" fill="#2a1704" ${[...text].length > 9 ? `textLength="${w - 12}" lengthAdjust="spacingAndGlyphs"` : ''}>${esc(text)}</text></svg></span>`;
}
export function itemArt(item) {
  if (!obj(item)) return hex('gift');
  if (item.slot === 'title') return titleArt(item);
  try {
    if (typeof SHOP.itemThumb === 'function') return `<span class="vn-item-art">${SHOP.itemThumb(item)}</span>`;
    const art = typeof item.art === 'string' && /^\/assets\/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g|svg)$/i.test(item.art) && !item.art.includes('..') ? item.art : '';
    if (art) return `<span class="vn-item-art"><img src="${esc(art)}" alt="" loading="lazy" decoding="async"></span>`;
    if (item.slot === 'bg' && typeof SHOP.bgLayer === 'function') return `<span class="vn-item-art"><span class="cx-bgthumb">${SHOP.bgLayer(item)}</span></span>`;
  } catch { /* رمز بديل تحت */ }
  return hex(SLOT_GLYPH[item.slot] || 'gift');
}
export const shopItems = (state, ctx) => list(state.shop?.items ?? ctx.shopData?.items).filter((i) => obj(i) && typeof i.id === 'string');
/** عناصر المتجر من الخادم: تُحمّل مرة لعرض صور ومتطلبات الرتب (قراءة فقط) */
export async function loadShop(state, ctx) {
  if (list(ctx.shopData?.items).length || state.shop || typeof ctx.req !== 'function') return false;
  try { const r = await ctx.req('shop:get'); if (r?.ok && Array.isArray(r.items)) { state.shop = { items: r.items }; return true; } } catch { /* العرض يكمل بدون صور المتجر */ }
  return false;
}
/** سياسات مكافآت الرتب لنظام معيّن ومستوى معيّن (من /api/rank-rewards أو ضمن /api/rank-vip) */
export function rewardPolicies(raw, system) {
  const policies = list(Array.isArray(raw?.policies) ? raw.policies : raw?.list);
  return policies.filter((p) => obj(p) && p.system === system && nat(p.rank));
}
export function rewardRows(policy, items) {
  return list(policy?.rewards).map((r) => {
    if (obj(r) && r.type === 'currency' && ['coins', 'gems'].includes(r.cur) && nat(r.amount)) return { kind: 'currency', name: `${num(r.cur === 'gems' ? r.amount * 20 : r.amount)} عملة`, sub: 'مكافأة الرتبة', art: hex(r.cur === 'coins' ? 'coin' : 'gem') };
    if (obj(r) && r.type === 'item' && typeof r.itemId === 'string') {
      // R56: مقتنيات سلّم الرتب ما تنباع (ما تطلع بقائمة المتجر)، فنعرض صورتها من تعريفها المشترك
      const perk = PERK_ITEMS[r.itemId];
      const item = items.find((i) => i.id === r.itemId) || (perk ? { id: r.itemId, slot: perk.slot, css: perk.css, name: perk.name, rarity: 'legendary', permanent: true } : null);
      return { kind: 'item', item, name: SLOT_LABEL[item?.slot] || 'مقتنى', sub: item?.name || 'عنصر من المتجر', art: item ? itemArt(item) : hex('gift'), video: item?.slot === 'entrance' };
    }
    return null;
  }).filter(Boolean);
}
/** الورقة السفلية (bottom sheet) */
export function sheetHTML(sheet) {
  if (!sheet) return '';
  return `<div class="vn-sheet-wrap" data-vn-sheet><button class="vn-sheet-backdrop" type="button" data-vn-action="close" aria-label="إغلاق"></button><section class="vn-sheet" role="dialog" aria-modal="true" aria-labelledby="vn-sheet-title"><span class="vn-sheet-grip" aria-hidden="true"></span><header><h2 id="vn-sheet-title">${esc(sheet.title)}</h2><button class="vn-icon-btn" type="button" data-vn-action="close" aria-label="إغلاق">${glyph('close')}</button></header><div class="vn-sheet-body">${sheet.body}</div></section></div>`;
}
/** شريط العنوان الداكن مثل المرجع: رجوع (يمين) + العنوان + أدوات (يسار). الرجوع يستخدم نظام R51 */
export function topbarHTML(ctx, title, tools = '') {
  return `<header class="vn-topbar"><a class="lb-route-back vn-back" href="${esc(ctx.backHref || '#/profile')}" aria-label="رجوع">${glyph('chevron')}</a><h1>${esc(title)}</h1><div class="vn-tools">${tools}</div></header>`;
}
export function perkCardHTML(p, i, cls = '', showSub = true) {
  return `<button class="vn-perk ${cls}${p.open ? ' is-open' : ' is-locked'}" type="button" data-vn-action="perk" data-vn-perk="${i}"><span class="vn-perk-art">${p.art}${p.video ? `<span class="vn-play">${glyph('play')}</span>` : ''}</span><b>${esc(p.name)}</b>${showSub && p.sub ? `<small>${esc(p.sub)}</small>` : ''}${p.tag ? `<em>${esc(p.tag)}</em>` : ''}</button>`;
}
export function perkSheetBody(p, extra = '') {
  return `<div class="vn-perk-detail"><span class="vn-perk-big">${p.art}</span><b>${esc(p.name)}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}${p.desc ? `<p>${esc(p.desc)}</p>` : ''}<span class="vn-state ${p.open ? 'is-open' : ''}">${glyph(p.open ? 'check' : 'lock')}${esc(p.stateText)}</span>${p.link ? `<a class="vn-gold-btn" href="${esc(p.link)}">${esc(p.linkText)}</a>` : ''}${extra}</div>`;
}
/** يقفل تمرير الصفحة خلف الورقة ويرجّع التركيز */
export function focusSheet(page) {
  const sheet = page?.querySelector?.('.vn-sheet');
  sheet?.querySelector?.('button,a[href]')?.focus?.({ preventScroll: true });
}
export { R };
