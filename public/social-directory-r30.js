import {roomPhotoFields} from './room-photo-r31.js?v=room-photo-r31';
import { roomTier, roomChipHTML, roomLevelClasses, ROOM_LEVEL_MAX } from './room-level-r67.js?v=r67av';
import {tierChip,perkActive} from './unified/room-rank-r58.js?v=r63a';
import { bannersHTML } from './unified/home-r68.js?v=r126';
/* LA3BAK R30 directory: pure HTML/data helpers. The existing parent controller
 * owns requests, delegated actions, keyboard handling, dialogs and repaint focus.
 * No fake rooms, ratings, rankings, image imports, storage or event listeners. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const list = value => Array.isArray(value) ? value : [];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const idOf = value => typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : '';
const ids = value => [...new Set(list(value).map(idOf).filter(Boolean))];
const hasCount = room => Number.isSafeInteger(room?.count) && room.count >= 0;
const TABS = Object.freeze({mine:'غرفي', all:'استكشف', country:'البلد', popular:'هدايا الغرفة', rank:'رتبة الغرفة'});
const MINE_TABS = Object.freeze({recent:'مؤخراً', joined:'منضم لها', following:'متابعة'});
const TAGS = Object.freeze({all:'توصية', friends:'الأصدقاء', music:'الموسيقى', games:'الألعاب', call:'المكالمة', birthday:'عيد ميلاد'});
const CREATE_TAGS = Object.freeze({'':'بدون تصنيف', friends:TAGS.friends, music:TAGS.music, games:TAGS.games, call:TAGS.call, birthday:TAGS.birthday});
const MODES = Object.freeze({normal:'عادي', social:'تعارف'});
const COUNTRIES = Object.freeze({'':'غير محدد', SA:'السعودية', AE:'الإمارات', KW:'الكويت', QA:'قطر', OM:'عُمان', BH:'البحرين', EG:'مصر', IQ:'العراق'});
const DISABLED_MODES = Object.freeze({games:['ألعاب', 'غير متاح: نحتاج تحديد اللعبة وقواعدها أولاً.'], auction:['مزاد', 'غير متاح: لا توجد آلية مزاد معتمدة.']});
const PATHS = Object.freeze({search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', close:'M6 6l12 12M18 6L6 18', settings:'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0', refresh:'M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0 1 13-2l2 2M4 17l2 2a8 8 0 0 0 13-2', people:'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 21v-2a7 7 0 0 1 14 0v2M18 5a3 3 0 0 1 0 6M21 20v-2a5 5 0 0 0-2-4', heart:'M20.4 5.6a5.5 5.5 0 0 0-7.8 0L12 6.2l-.6-.6a5.5 5.5 0 0 0-7.8 7.8L12 22l8.4-8.6a5.5 5.5 0 0 0 0-7.8', globe:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M2 12h20M12 2a20 20 0 0 1 0 20 20 20 0 0 1 0-20', room:'M5 21V4h14v17M3 21h18M14 12h.01M8 7h8', lock:'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3', check:'M5 12l4 4L19 6', clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2'});
const icon = name => `<svg class="so-dir-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATHS[name] || PATHS.room}"/></svg>`;

function normalizeUI(ui = {}) {
  return {tab:own(TABS, ui?.tab) ? ui.tab : 'all', mineTab:own(MINE_TABS, ui?.mineTab) ? ui.mineTab : 'recent', category:own(TAGS, ui?.category) ? ui.category : 'all', country:typeof ui?.country === 'string' ? ui.country.trim().toUpperCase() : '', query:typeof ui?.query === 'string' ? ui.query : '', searchOpen:ui?.searchOpen === true};
}
function normalizedRooms(data) {
  const seen = new Set();
  return list(data?.rooms).flatMap(room => {
    if (!room || typeof room !== 'object') return [];
    const id = idOf(room.id);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{...room, id, country:typeof room.country === 'string' ? room.country.trim().toUpperCase() : '', roomTag:own(CREATE_TAGS, room.roomTag) ? room.roomTag : ''}];
  });
}
function joinedIds(data, rooms) {
  const result = new Set(ids(data?.directory?.joined));
  rooms.forEach(room => { if (room.joined === true) result.add(room.id); });
  const current = idOf(data?.current?.roomId);
  if (current) result.add(current);
  return result;
}
const searchText = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ar').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا');

/** Returns copied, ID-normalized accessible rooms; never invents a directory row. */
export function filterDirectory(data = {}, ui = {}) {
  const state = normalizeUI(ui);
  let rooms = normalizedRooms(data);
  if (state.tab === 'mine') {
    if (state.mineTab === 'joined') {
      const joined = joinedIds(data, rooms);
      rooms = rooms.filter(room => joined.has(room.id));
    } else {
      const order = ids(state.mineTab === 'following' ? data?.directory?.followed : data?.directory?.recent);
      const byId = new Map(rooms.map(room => [room.id, room]));
      rooms = order.map(id => byId.get(id)).filter(Boolean);
    }
  }
  if (state.category !== 'all') rooms = rooms.filter(room => room.roomTag === state.category);
  if (state.country) rooms = rooms.filter(room => room.country === state.country);
  const query = searchText(state.query.trim());
  // R58: البحث بأيدي الغرفة (8 أرقام أو المميز) أو بالاسم
  if (query) rooms = rooms.filter(room => (/^[0-9]{1,8}$/.test(query) && String(room.code ?? '') === query) || searchText([room.name, room.description, room.code, CREATE_TAGS[room.roomTag], COUNTRIES[room.country] || room.country].join(' ')).includes(query));
  const wk = (r) => Number.isSafeInteger(r.weekPts) && r.weekPts > 0 ? r.weekPts : 0;
  // R62: «الشائعة» = الأكثر دعم (هدايا) هالأسبوع، وبعدها عدد الحضور
  if (state.tab === 'popular') rooms.sort((a, b) => wk(b) - wk(a) || (hasCount(a) && hasCount(b) ? b.count - a.count : hasCount(a) ? -1 : hasCount(b) ? 1 : 0));
  // R68e: «رتبة الغرفة» = ترتيب الغرف حسب نقاط رتبة الشهر
  if (state.tab === 'rank') rooms.sort((a, b) => (Number(b.rank?.pts) || 0) - (Number(a.rank?.pts) || 0) || (b.level || 1) - (a.level || 1));
  // R58c: امتياز «ظهور ترويجي» — غرف الرتبة الماسية فما فوق تطلع أول (ترتيب مستقر، بدون البحث وبدون «غرفي»)
  if (!query && state.tab !== 'mine') { const w = (r) => (typeof r.rank?.tier === 'string' && perkActive(r.rank.tier, 'promo') ? 1 : 0); rooms = rooms.map((r, i) => [r, i]).sort((x, y) => w(y[0]) - w(x[0]) || x[1] - y[1]).map(([r]) => r); }
  // R62: ترتيب الغرف الأسبوعي — أكثر 3 غرف دعم هالأسبوع تطلع أول (مع شارة)، بدون البحث وبدون «غرفي»
  if (!query && state.tab !== 'mine') { const top = rooms.filter((r) => wk(r) > 0).sort((a, b) => wk(b) - wk(a)).slice(0, 3); if (top.length) { const ids = new Set(top.map((r) => r.id)); rooms = [...top.map((r, i) => ({ ...r, weekRank: i + 1 })), ...rooms.filter((r) => !ids.has(r.id))]; } }
  return rooms;
}

// Relative/root-local paths and credential-free HTTPS only. No protocol-relative,
// data, javascript, blob, controls or URL backslash ambiguities; no browser global required.
function safeImage(value) {
  if (typeof value !== 'string') return '';
  const input = value.trim();
  if (!input || /[\u0000-\u0020\u007f\\]/.test(input) || input.startsWith('//') || input.startsWith('#') || input.startsWith('?')) return '';
  try {
    const base = 'https://local.la3bak.invalid/';
    const url = new URL(input, base);
    if (url.username || url.password || url.protocol !== 'https:') return '';
    if (/^[a-z][a-z\d+.-]*:/i.test(input)) return /^https:\/\//i.test(input) ? url.href : '';
    return url.origin === new URL(base).origin ? `${url.pathname}${url.search}${url.hash}` : '';
  } catch { return ''; }
}
function tabRail(values, active, action, label, suffix) {
  return `<div class="so-dir-tabs so-dir-tabs-${suffix}" role="tablist" aria-label="${esc(label)}" aria-orientation="horizontal" data-so-directory-rail="${suffix}">${Object.entries(values).map(([value, text]) => `<button type="button" role="tab" id="so-directory-${suffix}-${value}-r30" aria-selected="${value === active}" aria-controls="${suffix === 'main' ? 'so-directory-panel-r30' : 'so-directory-mine-panel-r30'}" tabindex="0" data-so-action="${action}" data-value="${esc(value)}" class="so-dir-tab${value === active ? ' is-active' : ''}">${esc(text)}</button>`).join('')}</div>`;
}
function categoryRail(state) {
  return `<div class="so-dir-categories" role="group" aria-label="تصنيف الغرفة" data-so-directory-rail="categories">${Object.entries(TAGS).map(([value, text]) => `<button type="button" class="so-dir-chip${state.category === value ? ' is-active' : ''}" data-so-action="directory-category" data-value="${esc(value)}" aria-pressed="${state.category === value}">${esc(text)}</button>`).join('')}</div>`;
}
function countryRail(data, state) {
  const values = [...new Set(normalizedRooms(data).map(room => room.country).filter(value => /^[A-Z]{2}$/.test(value)))];
  if (state.country && /^[A-Z]{2}$/.test(state.country) && !values.includes(state.country)) values.push(state.country);
  return `<div class="so-dir-country-row"><span class="so-dir-country-label">${icon('globe')}<span>البلد</span></span><div class="so-dir-country-options" role="group" aria-label="تصفية حسب البلد" data-so-directory-rail="countries"><button type="button" class="so-dir-country${!state.country ? ' is-active' : ''}" data-so-action="directory-country" data-value="" aria-pressed="${!state.country}">كل البلدان</button>${values.map(value => `<button type="button" class="so-dir-country${state.country === value ? ' is-active' : ''}" data-so-action="directory-country" data-value="${esc(value)}" aria-pressed="${state.country === value}">${esc(COUNTRIES[value] || value)}</button>`).join('')}</div></div>`;
}
const R68_ICONS = {
  room:'<svg viewBox="0 0 36 32"><path d="M18 2 3 13.5V30h30V13.5z" fill="#e2ccff"/><rect x="14" y="12" width="8" height="11" rx="4" fill="#6a2fc4"/><path d="M11 19a7 7 0 0 0 14 0" fill="none" stroke="#6a2fc4" stroke-width="2.2" stroke-linecap="round"/><path d="M18 26v2.5" stroke="#6a2fc4" stroke-width="2.2" stroke-linecap="round"/></svg>',
  games:'<svg viewBox="0 0 48 34"><path d="M13 4h22a11 11 0 0 1 10.7 13.4l-1.6 8.3a5.4 5.4 0 0 1-9.4 2.5L30.4 23H17.6l-4.3 5.2a5.4 5.4 0 0 1-9.4-2.5l-1.6-8.3A11 11 0 0 1 13 4z" fill="#e2ccff"/><path d="M13 11v8M9 15h8" stroke="#4a1a86" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="12.5" r="2.4" fill="#4a1a86"/><circle cx="37.5" cy="17" r="2.4" fill="#4a1a86"/><circle cx="28.5" cy="17" r="2.4" fill="#4a1a86"/><circle cx="33" cy="21.5" r="2.4" fill="#4a1a86"/></svg>',
  mic:'<svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="13" rx="4" fill="#e2ccff"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" fill="none" stroke="#e2ccff" stroke-width="2" stroke-linecap="round"/></svg>',
  users:'<svg viewBox="0 0 34 30"><circle cx="21.5" cy="8" r="5.6" fill="#e2ccff"/><path d="M11.5 28c0-7 4.3-11 10-11s10 4 10 11z" fill="#e2ccff"/><circle cx="10.5" cy="10" r="4.6" fill="#c9a8ff"/><path d="M2 27c0-6 3.4-9.4 8.5-9.4 1.6 0 3 .3 4.2 1A13 13 0 0 0 10.5 27z" fill="#c9a8ff"/></svg>',
  gift:'<svg viewBox="0 0 32 32"><rect x="4" y="12" width="24" height="6" rx="1.5" fill="#e2ccff"/><rect x="6" y="18" width="20" height="11" rx="1.5" fill="#c9a8ff"/><rect x="14" y="12" width="4" height="17" fill="#ffd34d"/></svg>',
  crown:'<svg viewBox="0 0 40 26"><path d="M3 8l9 7 8-13 8 13 9-7-3.6 15H6.6z" fill="#ffc83d"/><circle cx="20" cy="15" r="2.3" fill="#c0263a"/></svg>',
};
const R68_TAGICON = { games:'games', music:'mic', call:'mic', friends:'users', birthday:'gift' };
const BARS = '<svg class="so-dir-bars" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="5" width="2" height="4" rx="1"/><rect x="5" y="2" width="2" height="10" rx="1"/><rect x="9" y="4" width="2" height="6" rx="1"/></svg>';
function roomRow(room, options) {
  const current = idOf(options.data?.current?.roomId) === room.id;
  const ownerId = idOf(typeof room.owner === 'object' ? room.owner?.id : room.owner);
  const owned = options.owned.has(room.id) || Boolean(idOf(options.actorId) && ownerId === idOf(options.actorId));
  const photo = safeImage(room.photo);
  const name = String(room.name ?? '').trim() || 'غرفة دون اسم';
  const cover = photo ? `<img src="${esc(photo)}" alt="" width="64" height="64" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="so-dir-initial" aria-hidden="true">${esc(Array.from(name)[0] || 'غ')}</span>`;
  const disabled = options.busy || options.disabled;
  const lv = Number.isSafeInteger(room.level) && room.level >= 1 && room.level <= ROOM_LEVEL_MAX ? room.level : 1, tier = roomTier(lv);
  const rt = typeof room.rank?.tier === 'string' ? room.rank.tier : '';
  const sub = String(room.description || '').trim() || [room.roomTag ? TAGS[room.roomTag] : 'دردشة', room.country ? COUNTRIES[room.country] || room.country : '', room.roomMode === 'social' ? 'تعارف' : ''].filter(Boolean).join(' • ');
  const ic = lv >= 100 ? 'crown' : R68_TAGICON[room.roomTag] || 'room';
  return `<li class="so-dir-row r68-dir-row${current ? ' is-current' : ''} rl-${tier} ${roomLevelClasses(lv)}${rt && perkActive(rt, 'list') ? ' rr-list-' + esc(rt) : ''}" data-room-tier="${esc(rt)}" data-room-level="${lv}" data-so-directory-room="${esc(room.id)}" data-so-current="${current}"><button type="button" class="so-dir-enter" data-so-action="enter" data-id="${esc(room.id)}" aria-label="${esc(`${current ? 'العودة إلى' : 'دخول'} غرفة ${name}`)}"${disabled ? ' disabled' : ''}><span class="so-dir-cover">${cover}</span><span class="so-dir-room-copy"><span class="so-dir-room-title"><b dir="auto">${esc(name)}</b>${lv >= 300 ? '<i class="rl67-crown-ic" aria-hidden="true">👑</i>' : ''}</span><small class="r68-dir-sub" dir="auto">${esc(sub)}</small><span class="r68-dir-tags" dir="rtl">${rt ? tierChip(rt, 'd' + esc(room.id).slice(0, 6)) : ''}${room.weekRank ? `<span class="wk62 wk62-${room.weekRank}">${['🥇', '🥈', '🥉'][room.weekRank - 1]}</span>` : ''}${owned ? '<span class="so-dir-owned">غرفتك</span>' : ''}${current ? '<span class="so-dir-current-label">أنت هنا</span>' : ''}<span class="r68-dir-lv" dir="ltr"><i aria-hidden="true">◆</i>Lv.${lv}</span></span></span><span class="r68-dir-side"><span class="r68-dir-ic" aria-hidden="true">${R68_ICONS[ic]}</span><span class="r68-dir-count" dir="ltr">${hasCount(room) ? esc(room.count) : '—'}${BARS}</span></span></button>${owned ? `<button type="button" class="r101-del" data-so-action="dir-delete" data-id="${esc(room.id)}" aria-label="${esc('حذف غرفة ' + name)}"${disabled ? ' disabled' : ''}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}</li>`;
}
function emptyState(state, filtered, disabled) {
  let title, body, art = 'room';
  if (filtered) { title = 'لا توجد غرف مطابقة'; body = 'جرّب تصنيفاً أو بلداً آخر، أو غيّر كلمات البحث.'; art = 'search'; }
  else if (state.tab === 'mine' && state.mineTab === 'recent') { title = 'لم تدخل غرفة بعد'; body = 'الغرف التي تدخلها ستظهر هنا، لتعود إليها بسهولة.'; art = 'clock'; }
  else if (state.tab === 'mine' && state.mineTab === 'following') { title = 'لم تتابع غرفة بعد'; body = 'تابع غرفة من القائمة لتجدها هنا في المرة القادمة.'; art = 'heart'; }
  else if (state.tab === 'mine') { title = 'لا توجد غرف منضم لها'; body = 'عندما تنضم إلى غرفة ستظهر هنا. يمكنك أيضاً إنشاء غرفتك.'; }
  else { title = 'لا توجد غرف متاحة الآن'; body = 'حدّث القائمة، أو انتقل إلى غرفتي لإنشاء الغرفة.'; }
  return `<div class="so-dir-empty" role="status"><span class="so-dir-empty-icon">${icon(art)}</span><h2>${esc(title)}</h2><p>${esc(body)}</p>${state.tab !== 'mine' && !filtered ? `<button type="button" class="so-dir-text-button" data-so-action="refresh"${disabled ? ' disabled' : ''}>${icon('refresh')}تحديث الغرف</button>` : ''}</div>`;
}

/** Pure render. Parent should restore query focus/selection around its DOM repaint. */
export function renderDirectory({data = null, ui = {}, busy = false, loading = false, error = '', notice = '', actorId = ''} = {}) {
  const state = normalizeUI(ui);
  const rooms = filterDirectory(data, state);
  const disabled = data?.config?.enabled === false;
  const actionDisabled = busy || disabled;
  const followed = new Set(ids(data?.directory?.followed));
  const owned = new Set(ids(data?.directory?.owned));
  const filtered = Boolean(state.query.trim() || state.category !== 'all' || state.country);
  const initialLoading = loading && data == null;
  const panel = `${state.tab === 'mine' ? `<div class="so-dir-mine-panel" id="so-directory-mine-panel-r30" role="tabpanel" aria-labelledby="so-directory-mine-${state.mineTab}-r30"><div class="so-dir-create-banner"><span class="so-dir-banner-icon">${icon('room')}</span><div><b>مساحة على ذوقك</b><p>أنشئ غرفة وابدأ حديثاً يناسبك.</p></div><button type="button" class="so-dir-create-button" data-so-action="create-room"${actionDisabled ? ' disabled' : ''}><span>إنشاء الغرفة</span></button></div>` : ''}<div class="so-dir-list-heading"><h2>${state.tab === 'mine' ? esc(MINE_TABS[state.mineTab]) : state.tab === 'popular' ? 'أكثر الغرف هدايا هالأسبوع' : state.tab === 'rank' ? 'ترتيب الغرف حسب الرتبة' : 'الغرف المتاحة'}</h2>${data != null ? `<span>${esc(rooms.length)} غرفة${state.tab === 'popular' ? ' · حسب عدد الأعضاء' : ''}</span>` : ''}</div>${initialLoading ? '<p class="so-dir-loading" role="status">جارٍ تحميل الغرف من الخادم…</p>' : rooms.length ? `<ul class="so-dir-rooms" aria-label="قائمة الغرف">${rooms.map(room => roomRow(room, {data, followed, owned, actorId, busy, disabled})).join('')}</ul>` : error && data == null ? '<div class="so-dir-empty"><h2>تعذر تحميل الغرف</h2><p>أعد المحاولة عند عودة الاتصال. لا نعرض غرفاً دون بيانات.</p></div>' : state.tab==='mine'&&state.mineTab==='recent'&&!filtered&&data?.preferences?.remember!==true?`<div class="so-dir-empty" role="status"><span class="so-dir-empty-icon">${icon('clock')}</span><h2>سجل الغرف غير مفعّل</h2><p>تقدر تفعّل حفظ الغرف الأخيرة من إعدادات خصوصيتك. المتابعة تعمل بدون حفظ السجل.</p><button type="button" class="so-dir-text-button" data-so-action="preferences">إعدادات الخصوصية</button></div>` : emptyState(state, filtered, actionDisabled)}${state.tab === 'mine' ? '</div>' : ''}`;
  return `<section class="so-directory-r30" dir="rtl" aria-labelledby="so-directory-title-r30" aria-busy="${Boolean(busy || loading)}"><header class="so-dir-header r68-dir-head"><span class="r68-dir-logo" aria-hidden="true"><i>👑</i><b>لعبك</b><small>LA3BAK</small></span><h1 id="so-directory-title-r30" class="so-dir-sr">الغرف</h1><nav class="r68-dir-tabs" dir="rtl"><div class="r68-dir-main" role="tablist">${['mine','all','country'].map(v=>`<button type="button" role="tab" class="${state.tab===v?'is-on':''}" aria-selected="${state.tab===v}" data-so-action="directory-tab" data-value="${v}">${TABS[v]}</button>`).join('')}</div><div class="r68-dir-tools"><button type="button" class="r68-dir-ibtn r101-menu" data-lb-shell="menu" aria-label="القائمة" aria-expanded="false"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg></button><a class="r68-news" href="#/events" aria-label="الأخبار والفعاليات"><span aria-hidden="true">🔥</span><b>أخبار</b></a><button type="button" class="r68-dir-ibtn" data-so-action="create-room" aria-label="إنشاء غرفة"${actionDisabled ? ' disabled' : ''}><span aria-hidden="true">🎉</span></button><button type="button" class="r68-dir-ibtn${state.searchOpen ? ' is-active' : ''}" data-so-action="directory-search" data-value="${state.searchOpen ? 'hide' : 'show'}" aria-label="${state.searchOpen ? 'إغلاق البحث' : 'البحث في الغرف'}" aria-expanded="${state.searchOpen}" aria-controls="so-directory-search-r30">${icon(state.searchOpen ? 'close' : 'search')}</button></div></nav></header><div data-h68-banner-host>${bannersHTML(null)}</div><div class="r68-dir-big"><button type="button" class="is-gold${state.tab==='popular'?' is-on':''}" data-so-action="directory-tab" data-value="popular"><b>هدايا الغرفة</b><span aria-hidden="true">🎁</span></button><button type="button" class="is-violet${state.tab==='rank'?' is-on':''}" data-so-action="directory-tab" data-value="rank"><b>رُتبة الغرفة</b><span class="r68-t" aria-hidden="true">T</span></button></div><div class="so-dir-search" id="so-directory-search-r30"${state.searchOpen ? '' : ' hidden'}><label for="so-directory-query-r30">${icon('search')}<span class="so-dir-sr">البحث في الغرف</span></label><input id="so-directory-query-r30" type="search" name="directoryQuery" data-so-directory-query value="${esc(state.query)}" placeholder="ابحث باسم الغرفة أو تصنيفها" maxlength="120" autocomplete="off" enterkeyhint="search" dir="auto"></div><div class="so-dir-feedback" aria-live="polite">${error ? `<p class="so-dir-error" role="alert">${esc(error)}</p>` : ''}${notice ? `<p class="so-dir-notice" role="status">${esc(notice)}</p>` : ''}${disabled ? '<p class="so-dir-error" role="status">الغرف الاجتماعية متوقفة مؤقتاً من الإدارة.</p>' : ''}${loading && !initialLoading ? '<p class="so-dir-update" role="status">جارٍ تحديث القائمة…</p>' : ''}</div><div class="so-dir-panel" id="so-directory-panel-r30" role="tabpanel" aria-labelledby="so-directory-main-${state.tab}-r30">${state.tab === 'mine' ? tabRail(MINE_TABS, state.mineTab, 'directory-mine', 'غرفتي', 'mine') : ''}${categoryRail(state)}${state.tab === 'country' || state.country ? countryRail(data, state) : ''}${panel}</div></section>`;
}

function optionsFrom(raw, approved, emptyAllowed = false) {
  if (raw === undefined) return Object.keys(approved);
  let entries;
  if (Array.isArray(raw)) entries = raw.map(item => typeof item === 'string' ? {value:item} : item);
  else if (raw && typeof raw === 'object') entries = Object.entries(raw).map(([value, item]) => ({...(item && typeof item === 'object' ? item : {}), value}));
  else entries = [];
  return [...new Set(entries.filter(item => item && item.enabled !== false && typeof item.value === 'string').map(item => item.value).filter(value => own(approved, value)))].filter(value => emptyAllowed || value !== '');
}
function createOptions(config = {}) {
  const source = config?.capabilities && typeof config.capabilities === 'object' ? config.capabilities : config?.directory && typeof config.directory === 'object' ? config.directory : config || {};
  const tags = optionsFrom(source.roomTags, CREATE_TAGS, true);
  const countries = optionsFrom(source.countryCodes ?? source.countries, COUNTRIES, true);
  // Empty is the documented optional/unclassified sentinel, never a synthetic category.
  return {modes:optionsFrom(source.roomModes, MODES), tags:['', ...tags.filter(Boolean)], countries:['', ...countries.filter(Boolean)]};
}
function createSelect(name, label, choices, labels, selected, extra = '') {
  return `<label class="so-dir-field"><span>${esc(label)}</span><select name="${esc(name)}" ${extra}>${choices.length ? choices.map(value => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(labels[value])}</option>`).join('') : '<option value="" disabled selected>لا توجد خيارات معتمدة</option>'}</select></label>`;
}

function createChoiceField(name,label,choices,labels,selected,disabledValues=[]) {
  const available=choices.filter(value=>!disabledValues.includes(value));
  const value=available.includes(selected)?selected:(available[0]??'');
  return `<fieldset class="so-dir-choice-field"><legend>${esc(label)}</legend><select name="${esc(name)}" hidden aria-hidden="true" tabindex="-1">${choices.map(option=>`<option value="${esc(option)}"${option===value?' selected':''}${disabledValues.includes(option)?' disabled aria-disabled="true"':''}>${esc(labels[option])}</option>`).join('')}</select><div class="so-dir-choice-grid${name==='roomTag'?' is-tags':''}">${choices.map(option=>`<button type="button" data-so-action="directory-create-choice" data-field="${esc(name)}" data-value="${esc(option)}" class="so-dir-choice${option===value?' is-active':''}" aria-pressed="${option===value}"${disabledValues.includes(option)?' disabled':''}>${name==='roomMode'?icon({normal:'room',social:'people',auction:'lock',games:'people'}[option]):''}<span>${esc(labels[option])}</span>${disabledValues.includes(option)?'<small>غير متاح</small>':''}</button>`).join('')}</div></fieldset>`;
}
/** Inner fields only: insert into the existing data-so-create-form dialog form. */
export function renderCreateFields(config = {}) {
  const options = createOptions(config);
  const hasMode = options.modes.length > 0;
  const modeChoices=['normal','social','auction','games'],modeLabels={...MODES,...Object.fromEntries(Object.entries(DISABLED_MODES).map(([key,[label]])=>[key,label]))};
  const modeSelect=createChoiceField('roomMode','نوع الغرفة',modeChoices,modeLabels,options.modes[0],modeChoices.filter(value=>!options.modes.includes(value)));
  return `<div class="so-create-room-r30 so-dir-create-fields" data-so-create-modes="${esc(JSON.stringify(options.modes))}" data-so-create-tags="${esc(JSON.stringify(options.tags))}" data-so-create-countries="${esc(JSON.stringify(options.countries))}"><p class="so-dir-create-intro">اسم بسيط، وتصنيف يناسب أجواء غرفتك.</p><section class="so-owner-create-consent-r33" aria-label="بدء صوت المالك"><b>إنشاء الغرفة وبدء البث</b><p>سنأخذ لك مقعداً في مجلس غرفتك الرئيسي ونتصل للاستماع. البث بالمايك اختياري وبإذن المتصفح.</p><label class="so-dir-check"><input name="startMicrophone" type="checkbox" aria-describedby="so-owner-mic-help-r33"><span>تشغيل المايك بعد الإنشاء</span></label><p id="so-owner-mic-help-r33">اختيارك ثم الضغط على إنشاء يسمح بطلب إذن المايك. إذا رفضت الإذن تبقى الغرفة ومقعدك؛ يمكنك إعادة المحاولة بنقرة تشغيل المايك. لا تشغيل للكاميرا أو لعبة.</p></section>${roomPhotoFields()}<label class="so-dir-field"><span>اسم الغرفة <small>مطلوب</small></span><input name="name" type="text" maxlength="80" required autocomplete="off" placeholder="اختر اسم الغرفة" dir="auto"></label><div class="so-dir-password-group"><label class="so-dir-check"><input name="passwordEnabled" type="checkbox" aria-controls="so-create-password-r30"><span>حماية بكلمة مرور</span></label><label class="so-dir-field"><span class="so-dir-sr">كلمة مرور الغرفة</span><input id="so-create-password-r30" name="password" type="password" minlength="4" maxlength="64" autocomplete="new-password" placeholder="كلمة مرور من 4 إلى 64 حرفاً" aria-describedby="so-create-password-help-r30" disabled></label><p class="so-dir-field-help" id="so-create-password-help-r30">فعّل الحماية إذا أردت طلب كلمة مرور عند الدخول.</p></div>${modeSelect}${createChoiceField('roomTag','تصنيف الغرفة',options.tags,CREATE_TAGS,options.tags[0])}<div class="so-dir-create-grid">${createSelect('country', 'البلد', options.countries, COUNTRIES, options.countries[0])}${createSelect('privacy', 'الخصوصية', ['public','private'], {public:'عامة', private:'خاصة بالدعوة'}, 'public', 'required')}</div><div class="so-dir-mode-help" id="so-create-mode-help-r30"><p>${hasMode ? 'المتاح الآن: ' + options.modes.map(value => esc(MODES[value])).join(' / ') + '.' : 'لا يوجد نوع غرفة معتمد في الإعدادات الحالية.'}</p><ul>${Object.values(DISABLED_MODES).map(([label, help]) => `<li><span>${esc(label)}</span> — ${esc(help)}</li>`).join('')}</ul></div><p class="so-dir-game-note">ألعاب الغرفة تحتاج تحديد اللعبة؛ التصنيف ما يشغّل لعبة</p><label class="so-dir-field"><span>وصف قصير <small>اختياري</small></span><textarea name="description" rows="2" maxlength="400" placeholder="ما أجواء غرفتك؟" dir="auto"></textarea></label><p class="so-dir-field-help">المايك يعمل فقط عند اختيارك وإذن المتصفح. لا تتغير إعدادات العمر أو عدد المقاعد المعتمد.</p></div>`;
}
function allowedFromForm(form) {
  const root = form?.querySelector?.('[data-so-create-modes]');
  if (root) {
    try {
      const defaults = createOptions();
      return {modes:JSON.parse(root.dataset.soCreateModes).filter(value => defaults.modes.includes(value)), tags:JSON.parse(root.dataset.soCreateTags).filter(value => defaults.tags.includes(value)), countries:JSON.parse(root.dataset.soCreateCountries).filter(value => defaults.countries.includes(value))};
    } catch { return {modes:[], tags:[], countries:[]}; }
  }
  return createOptions(form?.config);
}
function fieldValue(form, name) {
  if (form?.elements) {
    const element = form.elements.namedItem ? form.elements.namedItem(name) : form.elements[name];
    return name === 'passwordEnabled' ? element?.checked === true : element?.value;
  }
  if (typeof form?.get === 'function') return form.get(name);
  return form?.[name];
}
const clean = value => typeof value === 'string' ? value.trim() : '';
const isEnabled = value => value === true || value === 'true' || value === 'on' || value === '1';

/** Result is {ok,value,errors}. Backend still authorizes and validates every command. */
export function validateCreate(form) {
  const options = allowedFromForm(form);
  const value = {name:clean(fieldValue(form, 'name')), description:clean(fieldValue(form, 'description')), privacy:clean(fieldValue(form, 'privacy')) || 'public', roomMode:clean(fieldValue(form, 'roomMode')) || 'normal', roomTag:clean(fieldValue(form, 'roomTag')), country:clean(fieldValue(form, 'country')).toUpperCase(), passwordEnabled:isEnabled(fieldValue(form, 'passwordEnabled')), password:''};
  const rawPassword = fieldValue(form, 'password');
  value.password = value.passwordEnabled && typeof rawPassword === 'string' ? rawPassword : '';
  const errors = {};
  if (!value.name || value.name.length > 80 || /[\u0000-\u001f\u007f]/.test(value.name)) errors.name = 'اسم الغرفة مطلوب، وبحد أقصى 80 حرفاً دون محارف تحكم.';
  if (value.description.length > 400 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.description)) errors.description = 'الوصف بحد أقصى 400 حرف دون محارف تحكم.';
  if (!['public','private'].includes(value.privacy)) errors.privacy = 'اختر خصوصية عامة أو خاصة.';
  if (!options.modes.includes(value.roomMode)) errors.roomMode = 'نوع الغرفة غير متاح؛ اختر عادي أو تعارف من الخيارات المعتمدة.';
  if (!options.tags.includes(value.roomTag)) errors.roomTag = 'اختر تصنيفاً معتمداً للغرفة.';
  if (!options.countries.includes(value.country)) errors.country = 'اختر بلداً من القائمة المعتمدة.';
  if (value.passwordEnabled && (value.password.length < 4 || value.password.length > 64 || /[\u0000-\u001f\u007f]/.test(value.password))) errors.password = 'كلمة المرور من 4 إلى 64 حرفاً دون محارف تحكم.';
  return {ok:Object.keys(errors).length === 0, value:Object.keys(errors).length ? null : value, errors};
}
