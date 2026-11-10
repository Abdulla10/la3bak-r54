/* R68c: الصفحة الرئيسية بتصميم المالك — رأس، بنرات من لوحة التحكم، اختصارات، الألعاب المتاحة، غرف مباشرة، الآن في اللعب. */
import { rankSummary } from '../preview/rank-overview.js?v=r66b';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const arr = (v) => (Array.isArray(v) ? v : []);
const short = (v) => { const n = Number(v); if (!Number.isFinite(n)) return '—'; return n >= 1e9 ? +(n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : new Intl.NumberFormat('en-US').format(n); };
const nf = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? new Intl.NumberFormat('en-US').format(Number(v)) : '—');
const SVG = {
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4.2L4.4 16a1 1 0 0 0 .9 1.5h13.4a1 1 0 0 0 .9-1.5L18 13.2V9a6 6 0 0 0-6-6z" fill="url(#h68v)"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0" fill="url(#h68v)"/><defs><linearGradient id="h68v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1dcff"/><stop offset="1" stop-color="#b98af0"/></linearGradient></defs></svg>',
  pad: '<svg viewBox="0 0 48 34" aria-hidden="true"><path d="M13 4h22a11 11 0 0 1 10.7 13.4l-1.6 8.3a5.4 5.4 0 0 1-9.4 2.5L30.4 23H17.6l-4.3 5.2a5.4 5.4 0 0 1-9.4-2.5l-1.6-8.3A11 11 0 0 1 13 4z" fill="#c9a2ff"/><path d="M13 11v8M9 15h8" stroke="#3d1670" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="12.5" r="2.4" fill="#3d1670"/><circle cx="37.5" cy="17" r="2.4" fill="#3d1670"/><circle cx="28.5" cy="17" r="2.4" fill="#3d1670"/><circle cx="33" cy="21.5" r="2.4" fill="#3d1670"/></svg>',
  live: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2.6" fill="currentColor"/><path d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8M5 5a9.8 9.8 0 0 0 0 14M19 5a9.8 9.8 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/></svg>',
};
/* اختصارات الصف (من اليمين لليسار) — أيقونات ملونة مرسومة */
const SHORT = [
  ['#/leaderboard', 'التصنيف', '<svg viewBox="0 0 40 36"><rect x="13" y="10" width="14" height="24" rx="2" fill="#ffc83d"/><rect x="1" y="17" width="12" height="17" rx="2" fill="#9f8cff"/><rect x="27" y="21" width="12" height="13" rx="2" fill="#d77bff"/><text x="20" y="27" font-size="11" font-weight="900" text-anchor="middle" fill="#6b3d00">1</text><text x="7" y="30" font-size="9" font-weight="900" text-anchor="middle" fill="#2b1a6b">2</text><text x="33" y="31" font-size="9" font-weight="900" text-anchor="middle" fill="#4a0f6b">3</text><path d="M20 1l1.6 3.4 3.6.4-2.7 2.4.8 3.6L20 9l-3.3 1.8.8-3.6-2.7-2.4 3.6-.4z" fill="#ffd66b"/></svg>'],
  ['#/friends', 'الأصدقاء', '<svg viewBox="0 0 40 34"><circle cx="25" cy="9" r="7" fill="#c9a8ff"/><path d="M12 33c0-8 5.6-13 13-13s13 5 13 13z" fill="#a77cf2"/><circle cx="12" cy="11.5" r="5.6" fill="#e2d0ff"/><path d="M1 32c0-7 4.4-11 10.6-11 2 0 3.8.4 5.3 1.2A14.6 14.6 0 0 0 12 32z" fill="#c9a8ff"/></svg>', 'friends'],
  ['#/shop', 'المتجر', '<svg viewBox="0 0 40 36"><path d="M4 4h32l3 10a5 5 0 0 1-8.6 3.6 5 5 0 0 1-7.4 0 5 5 0 0 1-7.4 0A5 5 0 0 1 1 14z" fill="#ff5fa2"/><path d="M4 4h6l-2 10H1zM17 4h6v10h-7zM30 4h6l3 10h-7z" fill="#ffd0e6"/><rect x="4" y="19" width="32" height="15" rx="2" fill="#ffb74d"/><rect x="15" y="23" width="10" height="11" fill="#c96a00"/></svg>'],
  ['#/missions', 'المهام اليومية', '<svg viewBox="0 0 40 38"><rect x="3" y="6" width="34" height="30" rx="5" fill="#b28bff"/><rect x="3" y="6" width="34" height="9" rx="4" fill="#7a46e0"/><rect x="10" y="2" width="4" height="8" rx="2" fill="#5a2aa8"/><rect x="26" y="2" width="4" height="8" rx="2" fill="#5a2aa8"/><path d="M13 25l5 5 10-11" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
  ['#/tournaments', 'البطولات', '<svg viewBox="0 0 44 34"><path d="M3 9l10 8 9-15 9 15 10-8-4 21H7z" fill="#ffc83d" stroke="#a86400" stroke-width="1.4"/><rect x="7" y="27" width="30" height="5" rx="1.5" fill="#e09a1a"/><circle cx="22" cy="18" r="3.2" fill="#8a3dff"/><circle cx="13" cy="20" r="2" fill="#ff4f7a"/><circle cx="31" cy="20" r="2" fill="#ff4f7a"/></svg>'],
  ['#/events', 'الفعاليات', '<svg viewBox="0 0 40 38"><rect x="4" y="15" width="32" height="21" rx="2" fill="#ff4b5c"/><rect x="2" y="10" width="36" height="7" rx="2" fill="#ff6f7d"/><rect x="17" y="10" width="6" height="26" fill="#ffd34d"/><path d="M20 10c-4 0-9-1.8-8-5.4C13 1.4 17 3 20 10c3-7 7-8.6 8-5.4 1 3.6-4 5.4-8 5.4z" fill="#ffd34d"/></svg>', 'events'],
];
/* الألعاب: بطاقات من تصميم المالك للأربع الأولى، والباقي بنفس الأسلوب من صور الألعاب الموجودة */
const TILE = { pool: '/preview/assets/game-pool.svg', bowling: '/preview/assets/game-bowling.svg', liars: '/preview/assets/game-liars.svg', carrom: '/assets/art68/tile-carrom.webp', jackaro: '/assets/art68/tile-jackaro.webp', baloot: '/assets/art68/tile-baloot.webp', ludo: '/assets/art68/tile-ludo.webp' };
const ART = { domino: '/preview/assets/game-domino.webp', uno: '/preview/assets/game-uno.webp', codewords: '/preview/assets/game-codewords-3d-r45.webp', minaboli: '/preview/assets/game-minaboli-3d-r49.webp' };
const ORDER = ['pool', 'bowling', 'liars', 'carrom', 'jackaro', 'baloot', 'ludo', 'domino', 'uno', 'codewords', 'minaboli'];
const HUBS = new Set(['ludo', 'baloot', 'jackaro']);
export const DEFAULT_BANNERS = [{ id: 'default-cup', title: 'بطولة لعبك الكبرى', gold: 'بطولة', text: 'نافس اللاعبين واربح جوائز حصرية!', cta: 'شارك الآن', href: '#/tournaments', img: '/assets/art68/banner-trophy.webp', full: false }];
let bannerCache = null;
const safeHref = (h) => (/^#\/[A-Za-z0-9_\-/]{0,80}$/.test(String(h)) || /^https:\/\/[A-Za-z0-9.-]+(\/[A-Za-z0-9_\-./?=&%]*)?$/.test(String(h)) ? String(h) : '#/');
const safeImg = (u) => (/^\/(assets|api\/home-banners\/img)\/[A-Za-z0-9_\-./]+\.(webp|png|jpe?g)$/.test(String(u)) ? String(u) : '');
function titleHTML(b) {
  const t = String(b.title || ''), g = String(b.gold || '');
  if (!g || !t.includes(g)) return esc(t);
  const i = t.indexOf(g);
  return `${esc(t.slice(0, i))}<em>${esc(g)}</em>${esc(t.slice(i + g.length))}`;
}
export function bannersHTML(list) {
  const bs = arr(list).length ? arr(list) : DEFAULT_BANNERS;
  return `<section class="h68-banners" data-h68-banners aria-roledescription="عارض لافتات" aria-label="اللافتات"><div class="h68-track">${bs.map((b, i) => {
    const img = safeImg(b.img), href = safeHref(b.href), ext = /^https:/.test(href);
    return `<a class="h68-banner${b.full ? ' is-full' : ''}" data-h68-slide="${i}" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}${i ? ' aria-hidden="true" tabindex="-1"' : ''}>${img ? `<img class="h68-bimg" src="${esc(img)}" alt="" decoding="async"${i ? ' loading="lazy"' : ' fetchpriority="high"'}>` : ''}<span class="h68-bglow" aria-hidden="true"></span><span class="h68-bcopy"><b class="h68-btitle">${titleHTML(b)}</b>${b.text ? `<small>${esc(b.text)}</small>` : ''}${b.cta ? `<span class="h68-bcta">${esc(b.cta)}</span>` : ''}</span></a>`;
  }).join('')}</div>${bs.length > 1 ? `<div class="h68-dots" role="group" aria-label="اختيار اللافتة">${bs.map((_, i) => `<button type="button" data-h68-dot="${i}" aria-label="اللافتة ${i + 1}" aria-pressed="${i === 0}"></button>`).join('')}</div>` : ''}</section>`;
}
export function headerHTML(ctx) {
  const m = ctx.me, user = ctx.user;
  const face = typeof ctx.avatarHTML === 'function' ? (() => { try { return ctx.avatarHTML(56); } catch { return ''; } })() : '';
  const vip = user ? rankSummary(ctx, 'vip') : null, vipN = vip?.state === 'earned' && Number.isSafeInteger(vip.rank) ? vip.rank : 0;
  const me = user ? `<a class="h68-me" href="#/profile" aria-label="ملفي الشخصي"><span class="h68-av"><i class="h68-avcrown" aria-hidden="true">👑</i><span class="h68-avin">${face || `<b>${esc([...String(m?.name || user?.name || '؟')][0])}</b>`}</span>${m && Number.isFinite(Number(m.level)) ? `<small class="h68-lv">Lv.${nf(m.level)}</small>` : ''}</span><span class="h68-who"><b>${esc(m?.name || user?.name || '')}${m?.verified ? '<i class="h68-ok" aria-label="موثق">✓</i>' : ''}</b>${vipN ? `<span class="h68-vip">VIP</span>` : ''}</span></a>` : `<a class="h68-login" href="#/profile">سجّل دخولك</a>`;
  return `<header class="h68-head" dir="ltr">${me}<a class="h68-logo" href="#/" aria-label="لعبك"><i aria-hidden="true">👑</i><b lang="ar">لعبك</b><small>LA3BAK</small></a><span class="h68-right">${user ? `<a class="h68-coins" href="#/wallet" aria-label="رصيدك — شحن"><i aria-hidden="true">★</i><b>${short(m?.coins ?? ctx.coins)}</b><span aria-hidden="true">+</span></a><a class="h68-bell" href="#/notifications" aria-label="الإشعارات">${SVG.bell}${ctx.unread ? '<i class="h68-dot"></i>' : ''}</a>` : ''}</span></header>`;
}
function shortcutsHTML(ctx) {
  return `<nav class="h68-short" aria-label="اختصارات">${SHORT.map(([href, label, svg, dotKey]) => `<a href="${href}"><span class="h68-sic" aria-hidden="true">${svg}</span><b>${label}</b>${dotKey && ctx.h68dots?.[dotKey] ? '<i class="h68-dot"></i>' : ''}</a>`).join('')}</nav>`;
}
/* R69j: ألعاب الحظ والتحدي بأيقونات ثلاثية الأبعاد مع باقي الألعاب */
export const EXTRA68 = [['#/slot', 'tile-slot', 'جاكبوت لعبك'], ['#/foodwheel', 'tile-foodwheel', 'عجلة الأكل'], ['#/tournaments', 'tile-tournaments', 'البطولات'], ['#/league', 'tile-league', 'الدوري'], ['#/watch', 'tile-watch', 'مباشر']];
function gamesHTML(ctx) {
  const all = arr(ctx.games).filter((g) => g && g.status === 'available' && /^[a-z0-9_-]+$/i.test(String(g.id)));
  const games = [...ORDER.map((id) => all.find((g) => g.id === id)).filter(Boolean), ...all.filter((g) => !ORDER.includes(g.id))].slice(0, 7);
  const url = (g) => `#/${HUBS.has(g.id) ? 'hub' : 'game'}/${encodeURIComponent(g.id)}`;
  return `<section class="h68-card h68-games"><header><h2>${SVG.pad}<span>الألعاب المتاحة</span></h2><a class="h68-all" href="#/games">عرض الكل ${SVG.chev}</a></header>${games.length ? `<div class="h68-grid">${EXTRA68.map((x) => `<a class="h68-tile is-img is-xtra" href="${x[0]}" aria-label="${x[2]}"><img src="/assets/art68/${x[1]}.webp?v=r69s" alt="" loading="lazy" decoding="async"><b>${x[2]}</b></a>`).join('')}${games.map((g, i) => TILE[g.id] ? `<a class="h68-tile is-img" href="${url(g)}" aria-label="العب ${esc(g.name)}"><img src="${TILE[g.id]}" alt="" loading="lazy" decoding="async"></a>` : `<a class="h68-tile t${i % 4}" href="${url(g)}" aria-label="العب ${esc(g.name)}"><span class="h68-tart">${ART[g.id] ? `<img src="${ART[g.id]}" alt="" loading="lazy" decoding="async">` : SVG.pad}</span><b>${esc(g.name)}</b></a>`).join('')}</div>` : '<p class="h68-empty">جاري تحميل الألعاب…</p>'}</section>`;
}
export function render68(ctx = {}) {
  return `<div class="h68" dir="rtl">${headerHTML(ctx)}<div data-h68-banner-host>${bannersHTML(bannerCache)}</div>${shortcutsHTML(ctx)}${gamesHTML(ctx)}${ctx.user && !ctx.noCommunity ? `<div class="h68-row"><section class="h68-card h68-live" data-h68-live><header><h2><span>غرف مباشرة</span>${SVG.live}</h2><a class="h68-all" href="#/social-rooms" aria-label="كل الغرف">${SVG.chev}</a></header><div class="h68-rooms"><p class="h68-empty">جاري التحميل…</p></div></section><section class="h68-card h68-now" data-h68-now><header><h2><i class="h68-on" aria-hidden="true"></i><span>الآن في اللعب</span></h2></header><div class="h68-people"><p class="h68-empty">جاري التحميل…</p></div></section></div>` : ''}</div>`;
}
const getJSON = (u) => fetch(u, { credentials: 'same-origin', cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
function roomsHTML(rooms) {
  const live = arr(rooms).filter((r) => r && typeof r.id === 'string' && !r.hasPassword).sort((a, b) => (b.count || 0) - (a.count || 0) || (b.level || 1) - (a.level || 1)).slice(0, 3);
  if (!live.length) return '<p class="h68-empty">ما في غرف شغالة الحين.</p>';
  return live.map((r, i) => {
    const photo = typeof r.photo === 'string' && /^\/(api\/social\/room-photo\?|[A-Za-z0-9_./-]+$)/.test(r.photo) ? r.photo : '';
    const cap = Number.isSafeInteger(r.capacity) ? r.capacity : r.maxMembers;
    return `<a class="h68-room r${i}" href="#/social-room/${encodeURIComponent(r.id)}" aria-label="ادخل ${esc(r.name)}"><b>${esc(r.name)}</b><span class="h68-rpic">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy">` : `<i>${esc([...String(r.name || 'غ')][0])}</i>`}</span><small dir="ltr">${SVG.user}${nf(r.count || 0)}/${nf(cap)}</small></a>`;
  }).join('');
}
function peopleHTML(list) {
  const on = arr(list).filter((f) => f && (f.room || f.online)).slice(0, 4);
  if (!on.length) return '<p class="h68-empty">ما في أحد من أصدقائك أونلاين الحين.</p>';
  return on.map((f) => {
    const pic = f.avatar ? `<img src="${esc(f.avatar)}" alt="" loading="lazy">` : `<i>${esc([...String(f.name || '؟')][0])}</i>`;
    const href = f.room ? `#/social-room/${encodeURIComponent(f.room.id)}` : `#/u/${encodeURIComponent(f.id)}`;
    return `<a class="h68-person" href="${esc(href)}"><span class="h68-ppic">${pic}<i class="h68-on"></i></span><span class="h68-pinfo"><b>${esc(f.name)}</b><small>${f.room ? `🎙️ ${esc(f.room.name)}` : 'متصل الآن'}</small></span></a>`;
  }).join('');
}
/* البنرات: تتبدل لحالها كل 5 ثواني وبالسحب — تشتغل على أي صفحة فيها بنرات (الرئيسية والغرف) */
function bindBanners(b) {
  if (b.dataset.h68Bound) return; b.dataset.h68Bound = '1';
  let idx = 0, sx = null;
  const n = () => b.querySelectorAll('[data-h68-slide]').length;
  const show = (i) => { const k = n(); if (!k) return; idx = ((i % k) + k) % k; const t = b.querySelector('.h68-track'); if (t) t.style.transform = `translateX(${idx * 100}%)`; b.querySelectorAll('[data-h68-slide]').forEach((s, q) => { s.toggleAttribute('aria-hidden', q !== idx); s.tabIndex = q === idx ? 0 : -1; }); b.querySelectorAll('[data-h68-dot]').forEach((d, q) => d.setAttribute('aria-pressed', String(q === idx))); };
  const timer = setInterval(() => { if (!b.isConnected) return clearInterval(timer); if (!document.hidden && n() > 1) show(idx + 1); }, 5000);
  b.addEventListener('click', (e) => { const d = e.target.closest?.('[data-h68-dot]'); if (d) { e.preventDefault(); e.stopPropagation(); show(Number(d.dataset.h68Dot)); } });
  b.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  b.addEventListener('touchend', (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40) show(idx + (dx > 0 ? 1 : -1)); });
}
let bannerFetch = null;
function fillHosts() {
  const hosts = [...document.querySelectorAll('[data-h68-banner-host]:not([data-h68-filled])')];
  if (!hosts.length) return;
  hosts.forEach((h) => { h.dataset.h68Filled = '1'; });
  const apply = () => { for (const h of hosts) { if (!h.isConnected || !Array.isArray(bannerCache)) continue; const cur = h.querySelector('[data-h68-banners]'); const want = bannersHTML(bannerCache); if (!cur || cur.dataset.h68Sig !== JSON.stringify(bannerCache).length + '') { h.innerHTML = want; const nb = h.querySelector('[data-h68-banners]'); if (nb) { nb.dataset.h68Sig = JSON.stringify(bannerCache).length + ''; bindBanners(nb); } } } };
  if (Array.isArray(bannerCache)) apply();
  if (!bannerFetch) bannerFetch = getJSON('/api/home-banners').then((j) => { if (j?.ok) bannerCache = arr(j.list); setTimeout(() => { bannerFetch = null; }, 60000); return bannerCache; });
  bannerFetch.then(apply);
}
function scan() { document.querySelectorAll('[data-h68-banners]:not([data-h68-bound])').forEach(bindBanners); fillHosts(); }
if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined' && !globalThis.__h68obs) {
  globalThis.__h68obs = new MutationObserver(() => { if (document.querySelector('[data-h68-banners]:not([data-h68-bound]),[data-h68-banner-host]:not([data-h68-filled])')) scan(); });
  const go = () => { globalThis.__h68obs.observe(document.body, { childList: true, subtree: true }); scan(); };
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
}
export function mount68(root, ctx = {}) {
  let alive = true;
  scan();
  if (ctx.user && !ctx.noCommunity) {
    getJSON('/api/social/rooms').then((j) => { const el = root.querySelector('[data-h68-live] .h68-rooms'); if (alive && el) el.innerHTML = j?.ok ? roomsHTML(j.rooms) : '<p class="h68-empty">تعذّر التحميل.</p>'; });
    getJSON('/api/friends/live').then((j) => { const el = root.querySelector('[data-h68-now] .h68-people'); if (alive && el) el.innerHTML = peopleHTML(j?.list); });
  }
  return () => { alive = false; };
}
