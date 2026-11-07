/* Royal Admin: pure presentation. Authentication, permissions and requests stay in admin.js.
 * All numbers below come from the supplied overview response, never generated examples.
 */
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const number = value => finite(value) ? value.toLocaleString('ar-AE-u-nu-latn', {maximumFractionDigits:2}) : '—';
const countText = value => count(value) ? number(value) : '—';
const money = (minor, currency = 'AED') => Number.isSafeInteger(minor) && ['AED','USD','SAR'].includes(currency)
  ? `${(minor / 100).toLocaleString('en-AE', {minimumFractionDigits:2,maximumFractionDigits:2})} ${currency}` : '—';
const array = value => Array.isArray(value) ? value : [];
const safeText = (value, fallback = '') => typeof value === 'string' && value.trim() ? value : fallback;
const stamp = (value, timezone = 'Asia/Dubai') => {
  if ((typeof value !== 'string' && typeof value !== 'number') || value === '') return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  try { return date.toLocaleString('ar-AE-u-nu-latn', {timeZone:timezone,dateStyle:'short',timeStyle:'short'}); }
  catch { return date.toLocaleString('ar-AE-u-nu-latn', {timeZone:'Asia/Dubai',dateStyle:'short',timeStyle:'short'}); }
};
const ICONS = Object.freeze({
  crown:'<path d="m3 6 4 4 5-7 5 7 4-4-2 12H5L3 6Z"/><path d="M6 21h12M6 15h12"/>',
  overview:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  players:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  active:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  games:'<path d="M7 7h10c2.2 0 3.7 1.5 4 4l1 6c.3 2.2-2.1 3.3-3.7 1.7L15 16H9l-3.3 2.7C4.1 20.3 1.7 19.2 2 17l1-6c.3-2.5 1.8-4 4-4Z"/><path d="M6 10v5m-2.5-2.5h5M15 11h.01M18 14h.01M12 7V4"/>',
  matches:'<path d="M4 4h16v17H4zM8 2v4M16 2v4M4 9h16m-12 4h2m4 0h2m-8 4h2m4 0h2"/>',
  chart:'<path d="M3 3v18h18M7 15l4-5 4 3 6-8"/>',
  money:'<path d="M3 5h18v14H3zM3 9h18M17 13h1M7 15h4"/>',
  shop:'<path d="M3 9 5 3h14l2 6M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v9h14v-9M9 21v-6h6v6"/>',
  gifts:'<path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/>',
  notices:'<path d="m4 9 15-6v18L4 15V9Zm3 7 2 5h3l-2-6M21 9v6"/>',
  offers:'<path d="m3 12 9-9h8v8l-9 10-8-9Z"/><circle cx="16" cy="7" r="1"/>',
  reports:'<path d="M5 21V3m0 0h14l-3 5 3 5H5"/>',
  staff:'<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  settings:'<path d="m9 3-.5 3-2 .9L4 6l-2 4 2 2-2 2 2 4 2.5-.9 2 .9L9 21h6l.5-3 2-.9 2.5.9 2-4-2-2 2-2-2-4-2.5.9-2-.9L15 3H9Z"/><circle cx="12" cy="12" r="3"/>',
  audit:'<path d="M8 3H4v18h16V3h-4M8 2h8v4H8zM8 11h8M8 15h8M8 19h5"/>',
  economy:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  arrow:'<path d="M20 12H4m6-6-6 6 6 6"/>',
  chevron:'<path d="m8 5 7 7-7 7"/>',
  refresh:'<path d="M20 7V3m0 4h-4M4 17v4m0-4h4M20 7a8 8 0 0 0-14-2M4 17a8 8 0 0 0 14 2"/>',
  logout:'<path d="M9 4H4v16h5M14 8l4 4-4 4m-6-4h13"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z"/>'
});
const ICON_ALIAS = {payments:'money',pricing:'money',verification:'check',rooms:'games',achievements:'crown',functional:'settings',maintenance:'settings',system:'globe',progression:'crown','owner-tools':'crown',bulk:'gifts',events:'notices',transactions:'money',distribution:'chart',home:'overview',users:'players',controller:'games',wallet:'economy',store:'shop',game:'games',trophy:'crown',calendar:'matches',megaphone:'notices',shield:'staff',list:'audit',gift:'gifts'};
export function adminRoyalIcon(name) {
  const key = Object.prototype.hasOwnProperty.call(ICONS, name) ? name : (Object.prototype.hasOwnProperty.call(ICON_ALIAS, name) ? ICON_ALIAS[name] : 'overview');
  return `<svg class="ad-royal-icon" data-royal-icon="${key}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[key]}</svg>`;
}
export function adminRoyalBrand() {
  return `<span class="ad-royal-brand-icon" aria-hidden="true">${adminRoyalIcon('games')}</span><span class="ad-royal-brand-copy"><b lang="ar">لعبنا</b><small dir="ltr">LA3BAK</small></span>`;
}
export function adminRoyalLogin({error = '', busy = false, checking = false} = {}) {
  const waiting = Boolean(busy || checking);
  return `<section class="ad-royal-login" dir="rtl" aria-labelledby="ad-royal-login-title"><header class="ad-royal-login-brand">${adminRoyalBrand()}</header>
    <div class="ad-royal-login-stage"><div class="ad-royal-login-art" aria-hidden="true"><img src="/admin-royal-assets/login-royal-art.png" alt="" decoding="async"><span class="ad-royal-orbit"></span></div>
      <div class="ad-royal-login-card"><div class="ad-royal-login-title-mark" aria-hidden="true">${adminRoyalIcon('crown')}</div><h1 id="ad-royal-login-title">لوحة الإدارة</h1><p class="ad-royal-login-subtitle">أهلًا بك في مركز إدارة لعبنا</p>
        <p class="ad-royal-auth-note">الدخول برمز الإدارة الحالي، أو بحساب لاعب مسجّل ضمن الطاقم. يحدّد الخادم هويتك وصلاحياتك.</p>
        ${error ? `<div class="ad-royal-login-error" role="alert">${adminRoyalIcon('info')}<span>${escapeHTML(error)}</span></div>` : ''}
        <form data-adf="login" class="ad-royal-login-form" aria-busy="${waiting}">
          <label for="ad-royal-identity">هوية المدير — يحددها الخادم</label><div class="ad-royal-input-wrap ad-royal-identity-wrap">${adminRoyalIcon('user')}<input id="ad-royal-identity" name="username" type="text" readonly tabindex="-1" autocomplete="off" placeholder="تظهر بعد التحقق من الخادم" aria-describedby="ad-royal-identity-note"></div><p id="ad-royal-identity-note" class="ad-royal-field-note">هذه خانة عرض فقط، وليست بيانات دخول مستقلة.</p>
          <label for="ad-royal-token">رمز الإدارة الحالي</label><div class="ad-royal-input-wrap">${adminRoyalIcon('lock')}<input id="ad-royal-token" name="token" type="password" autocomplete="off" spellcheck="false" autocapitalize="off" dir="ltr" placeholder="أدخل رمز الإدارة" required ${waiting ? 'disabled' : ''} aria-describedby="ad-royal-storage-note"><button class="ad-royal-secret-toggle" type="button" data-ad="toggle-secret" aria-controls="ad-royal-token" aria-label="إظهار رمز الإدارة" aria-pressed="false" ${waiting ? 'disabled' : ''}>${adminRoyalIcon('eye')}</button></div>
          <label class="ad-royal-remember"><input name="remember" type="checkbox" disabled aria-describedby="ad-royal-storage-note"><span>تذكّر الدخول</span></label><p id="ad-royal-storage-note" class="ad-royal-field-note">الحفظ في هالتبويب فقط؛ ما نخزّن الرمز بشكل دائم</p>
          <button type="submit" class="ad-royal-login-submit" ${waiting ? 'disabled' : ''}><span>${checking ? 'جاري التحقق من الخادم…' : busy ? 'جاري الدخول…' : 'دخول لوحة الإدارة'}</span>${adminRoyalIcon('arrow')}</button>
        </form>
        <div class="ad-royal-auth-divider"><span>أو بحساب الطاقم</span></div><button class="ad-royal-staff-retry" type="button" data-ad="retry" ${waiting ? 'disabled' : ''}>${adminRoyalIcon('staff')}<span>التحقق من حساب الطاقم الحالي</span></button><a class="ad-royal-player-login" href="/#/profile">تسجيل الدخول بحساب لاعب ${adminRoyalIcon('arrow')}</a>
        <p class="ad-royal-login-status" role="status" aria-live="polite">${checking ? 'نتحقق من جلسة حسابك وصلاحيات الإدارة.' : busy ? 'ننتظر استجابة الخادم.' : 'الوصول متاح فقط للصلاحيات المعتمدة على الخادم.'}</p>
      </div></div><footer class="ad-royal-login-footer"><span dir="ltr">LA3BAK</span><span>مركز الإدارة</span></footer></section>`;
}
const empty = (message, note = '') => `<div class="ad-royal-empty">${adminRoyalIcon('info')}<p>${escapeHTML(message)}</p>${note ? `<small>${escapeHTML(note)}</small>` : ''}</div>`;
const panelTitle = (title, icon, aside = '') => `<div class="ad-royal-panel-heading"><h2>${adminRoyalIcon(icon)}<span>${escapeHTML(title)}</span></h2>${aside}</div>`;
const kpi = (label, value, icon, note, modifier) => `<article class="ad-royal-kpi ad-royal-kpi-${modifier}"><div class="ad-royal-kpi-top"><h2>${escapeHTML(label)}</h2><span class="ad-royal-kpi-icon">${adminRoyalIcon(icon)}</span></div><strong dir="ltr">${countText(value)}</strong><p>${escapeHTML(note)}</p></article>`;
const periodButtons = period => `<div class="ad-royal-periods" role="group" aria-label="فترة نمو اللاعبين">${[['7d','7 أيام'],['30d','30 يوم'],['90d','90 يوم']].map(([value,label]) => `<button type="button" data-ad="period" data-period="${value}" data-p="${value}" aria-pressed="${period === value}" class="${period === value ? 'on' : ''}">${label}</button>`).join('')}</div>`;
function growthChart(raw) {
  const points = array(raw);
  if (!points.length) return empty('لا تتوفر بيانات نمو اللاعبين.', 'سيظهر الرسم عند وصول السجل اليومي الفعلي من الخادم.');
  const valid = points.every(point => point && /^\d{4}-\d{2}-\d{2}$/.test(point.day) && Number.isFinite(Date.parse(`${point.day}T00:00:00Z`)) && new Date(`${point.day}T00:00:00Z`).toISOString().slice(0,10) === point.day && count(point.total) && count(point.added));
  if (!valid) return empty('تعذّر عرض سجل النمو.', 'بعض نقاط الخادم غير مكتملة؛ لا نرسم بيانات تقديرية.');
  const rows = [...points].sort((a,b) => a.day.localeCompare(b.day));
  if (new Set(rows.map(row => row.day)).size !== rows.length) return empty('تعذّر عرض سجل النمو.', 'تكررت أيام في بيانات الخادم.');
  if (rows.length === 1) return `<div class="ad-royal-single-point"><strong dir="ltr">${countText(rows[0].total)}</strong><p>إجمالي اللاعبين في ${escapeHTML(rows[0].day)}</p><small>${countText(rows[0].added)} حساب جديد</small><p class="ad-royal-source-note">نقطة يومية واحدة؛ لا تكفي لرسم اتجاه نمو.</p></div>`;
  const maximum = Math.max(4, Math.ceil(Math.max(...rows.map(row => row.total)) / 4) * 4);
  const first = Date.parse(rows[0].day), last = Date.parse(rows.at(-1).day);
  const coords = rows.map(row => ({x:54 + (Date.parse(row.day) - first) / (last - first) * 602,y:188 - row.total / maximum * 148,row}));
  const line = coords.map((point,index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const fill = `${line} L656 188 L54 188 Z`;
  const ticks = Array.from({length:5}, (_,index) => ({y:188 - index * 37,value:maximum * index / 4}));
  const labelIndices = [...new Set([0,Math.floor((rows.length - 1) / 3),Math.floor((rows.length - 1) * 2 / 3),rows.length - 1])];
  return `<div class="ad-royal-growth-summary"><span><i class="ad-royal-legend-dot gold"></i>إجمالي اللاعبين</span><strong dir="ltr">${countText(rows.at(-1).total)}</strong><span>الجدد في آخر يوم <b dir="ltr">${countText(rows.at(-1).added)}</b></span></div>
    <svg class="ad-royal-growth-svg" viewBox="0 0 680 226" role="img" aria-label="نمو اللاعبين: ${countText(rows[0].total)} إلى ${countText(rows.at(-1).total)}؛ القيم اليومية في الجدول أسفل الرسم" data-royal-chart="growth" direction="ltr"><defs><linearGradient id="ad-royal-growth-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efbd5f" stop-opacity=".22"/><stop offset="1" stop-color="#efbd5f" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map(tick => `<path class="ad-royal-chart-grid" d="M54 ${tick.y}H656"/><text x="42" y="${tick.y + 4}" text-anchor="end">${number(tick.value)}</text>`).join('')}<path d="${fill}" fill="url(#ad-royal-growth-fill)"/><path class="ad-royal-growth-line" d="${line}"/>${coords.map(point => `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="3" class="ad-royal-growth-dot"><title>${point.row.day}: ${countText(point.row.total)} لاعب، ${countText(point.row.added)} جديد</title></circle>`).join('')}
      ${labelIndices.map(index => `<text x="${coords[index].x.toFixed(2)}" y="216" text-anchor="${index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'}">${escapeHTML(rows[index].day.slice(5))}</text>`).join('')}</svg>
    <details class="ad-royal-chart-details"><summary>عرض القيم اليومية</summary><div class="ad-royal-table-scroll"><table><caption>بيانات النمو الواردة من الخادم</caption><thead><tr><th scope="col">اليوم</th><th scope="col">إجمالي اللاعبين</th><th scope="col">الجدد</th></tr></thead><tbody>${rows.map(row => `<tr><th scope="row" dir="ltr">${escapeHTML(row.day)}</th><td dir="ltr">${countText(row.total)}</td><td dir="ltr">${countText(row.added)}</td></tr>`).join('')}</tbody></table></div></details>`;
}
const GAME_NAMES = Object.freeze({jackaro:'جاكارو',ludo:'لودو',baloot:'بلوت',domino:'دومينو',uno:'أونو',carrom:'كيرم',chess:'شطرنج',city:'مدينة',tower:'برج'});
function gameRows(overview, dashboard) {
  let totals;
  if (Array.isArray(dashboard?.gameTotals)) totals = dashboard.gameTotals;
  else if (overview?.games?.perGame && typeof overview.games.perGame === 'object' && !Array.isArray(overview.games.perGame)) totals = Object.entries(overview.games.perGame).map(([id,stat]) => ({id,name:GAME_NAMES[id] || id,matches:typeof stat === 'object' && stat ? stat.played : stat,definition:'مشاركات اللاعبين في ألعاب مكتملة، وليست عدد مباريات فريدة؛ إجمالي كل الفترات.'}));
  else totals = [];
  const valid = totals.filter(row => row && count(row.matches));
  if (!valid.length) return empty('لا تتوفر مشاركات مسجّلة حسب اللعبة.');
  const rows = [...valid].sort((a,b) => b.matches - a.matches).slice(0,5);
  const maximum = Math.max(...rows.map(row => row.matches));
  return `<ol class="ad-royal-game-list">${rows.map((row,index) => `<li><span class="ad-royal-game-icon game-${index}">${adminRoyalIcon('games')}</span><div class="ad-royal-game-copy"><div><b>${escapeHTML(safeText(row.name, GAME_NAMES[row.id] || safeText(row.id,'لعبة')))}</b><span><b dir="ltr">${countText(row.matches)}</b> مشاركة</span></div><div class="ad-royal-game-track" aria-hidden="true"><span style="width:${maximum > 0 ? (row.matches / maximum * 100).toFixed(2) : 0}%"></span></div></div></li>`).join('')}</ol><p class="ad-royal-source-note">${escapeHTML(safeText(rows[0].definition,'مشاركات اللاعبين في ألعاب مكتملة، وليست عدد مباريات فريدة؛ إجمالي كل الفترات.'))}</p>`;
}
function revenue(commerce) {
  if (commerce?.enabled !== true || !commerce.live) return empty('إيرادات المدفوعات غير متاحة.', safeText(commerce?.note,'لا توجد بيانات مدفوعات حقيقية متاحة لهذه اللوحة. العملات والجواهر الافتراضية ليست إيرادات مالية.'));
  const live = commerce.live;
  const change = finite(live.changePct) ? `${live.changePct > 0 ? '+' : ''}${number(live.changePct)}%` : '—';
  return `<div class="ad-royal-revenue-total"><span>صافي الإيرادات المؤكدة · كل الفترات</span><strong dir="ltr">${money(live.netMinor)}</strong><span class="ad-royal-change ${finite(live.changePct) ? live.changePct < 0 ? 'negative' : 'positive' : ''}" dir="ltr">${change}</span><small>تغيّر صافي الفترة الحالية مقابل السابقة</small></div><dl class="ad-royal-revenue-breakdown"><div><dt>إجمالي القبض · كل الفترات</dt><dd dir="ltr">${money(live.grossMinor)}</dd></div><div><dt>المسترد · كل الفترات</dt><dd dir="ltr">${money(live.refundedMinor)}</dd></div><div><dt>صافي الفترة الحالية</dt><dd dir="ltr">${money(live.currentMinor)}</dd></div><div><dt>صافي الفترة السابقة</dt><dd dir="ltr">${money(live.previousMinor)}</dd></div></dl><details class="ad-royal-chart-details"><summary>تعريف الإيرادات والفترات</summary><p class="ad-royal-source-note">${escapeHTML(safeText(commerce.note,'إيراد AED مؤكد فقط. التوزيع إجمالي القبض في الفترة الحالية، والمقارنة لصافي الفترة الحالية والسابقة.'))}</p></details>`;
}
function distribution(commerce) {
  if (commerce?.enabled !== true || !Array.isArray(commerce.live?.distribution)) return empty('توزيع الإيرادات غير متاح.', 'يُحسب فقط من المدفوعات التي يرسلها الخادم.');
  const raw = commerce.live.distribution;
  if (raw.some(row => !row || !count(row.minor))) return empty('تعذّر عرض توزيع الإيرادات.', 'بعض قيم التوزيع غير مكتملة.');
  const rows = raw.filter(row => row.minor > 0);
  const total = rows.reduce((sum,row) => sum + row.minor,0);
  if (!rows.length || !count(total)) return empty('لا توجد إيرادات لتوزيعها في هذه الفترة.');
  const colors = ['#f2c16b','#ac73ee','#6841b2','#e697ac','#76beb6','#aec075'];
  let used = 0;
  const segments = rows.map((row,index) => {
    const share = row.minor / total * 100;
    const offset = used; used += share;
    return `<circle class="ad-royal-donut-segment" cx="90" cy="90" r="64" pathLength="100" fill="none" stroke="${colors[index % colors.length]}" stroke-width="22" stroke-dasharray="${share.toFixed(5)} ${(100 - share).toFixed(5)}" stroke-dashoffset="${(-offset).toFixed(5)}" transform="rotate(-90 90 90)"><title>${escapeHTML(safeText(row.label,'فئة'))}: ${money(row.minor)}</title></circle>`;
  }).join('');
  return `<div class="ad-royal-distribution"><div class="ad-royal-donut-wrap"><svg viewBox="0 0 180 180" class="ad-royal-donut" role="img" aria-label="توزيع الإيرادات حسب الفئة؛ إجمالي القبض في الفترة ${money(total)}" data-royal-chart="distribution">${segments}</svg><div class="ad-royal-donut-center"><span>قبض الفترة</span><strong dir="ltr">${money(total)}</strong></div></div><ul class="ad-royal-donut-legend">${rows.map((row,index) => `<li><i style="background:${colors[index % colors.length]}" aria-hidden="true"></i><span>${escapeHTML(safeText(row.label,'فئة'))}</span><b dir="ltr">${money(row.minor)}</b></li>`).join('')}</ul></div><p class="ad-royal-source-note">إجمالي القبض المؤكد في الفترة الحالية حسب الباقة، قبل خصم الاستردادات.</p>`;
}
function transactions(commerce, timezone) {
  if (commerce?.enabled !== true || !Array.isArray(commerce.live?.latest)) return empty('المعاملات المالية غير متاحة.', 'لا تُعرض معاملات افتراضية على أنها مدفوعات.');
  const rows = commerce.live.latest;
  if (!rows.length) return empty('لا توجد معاملات مالية مؤكدة مسجّلة.');
  const statuses = {paid:'مدفوع',succeeded:'مكتمل',completed:'مكتمل',refunded:'مسترد',partially_refunded:'مسترد جزئيًا',pending:'معلّق',failed:'فشل',cancelled:'ملغي'};
  return `<div class="ad-royal-table-scroll"><table class="ad-royal-transactions"><caption class="ad-royal-sr-only">آخر المعاملات المالية الواردة من الخادم</caption><thead><tr><th scope="col">المعاملة</th><th scope="col">المبلغ</th><th scope="col">التاريخ</th><th scope="col">الحالة</th></tr></thead><tbody>${rows.slice(0,6).filter(row => row && typeof row === 'object').map(row => { const state = ['paid','succeeded','completed'].includes(row.status) ? 'success' : ['refunded','partially_refunded'].includes(row.status) ? 'refund' : 'neutral'; return `<tr><td><div class="ad-royal-transaction-name"><span class="ad-royal-transaction-icon">${adminRoyalIcon('money')}</span><span><b>${escapeHTML(safeText(row.label,'معاملة'))}</b><small dir="ltr">${escapeHTML(safeText(row.id,'—'))}</small></span></div></td><td dir="ltr">${money(row.amountMinor,safeText(row.currency,'AED'))}</td><td>${escapeHTML(stamp(row.at,timezone))}</td><td><span class="ad-royal-transaction-status ${state}">${escapeHTML(statuses[row.status] || safeText(row.status,'—'))}</span></td></tr>`; }).join('')}</tbody></table></div>`;
}
export function adminRoyalOverview(data = {}) {
  const overview = data?.overview;
  if (!overview || typeof overview !== 'object') return `<div class="ad-royal-overview ad-royal-overview-unavailable" dir="rtl">${empty('بيانات لوحة الإدارة غير متاحة.', 'أعد المحاولة لطلب البيانات من الخادم.')}<button class="ad-btn" type="button" data-ad="refresh">${adminRoyalIcon('refresh')} إعادة المحاولة</button></div>`;
  const dashboard = overview.dashboard && typeof overview.dashboard === 'object' ? overview.dashboard : {};
  const period = ['7d','30d','90d'].includes(dashboard.period) ? dashboard.period : null;
  const active = dashboard.activePlayers;
  const activeValue = active ? active.value : overview.online?.users;
  const activeNote = active ? safeText(active.definition,'تعريف النشاط غير موضح في استجابة الخادم.') : 'المتصلون الآن؛ لا يتوفر تعريف نشاط لفترة زمنية.';
  const matches = dashboard.matchesToday;
  const matchValue = matches?.complete === true ? matches.value : null;
  const commerce = dashboard.commerce;
  const quick = dashboard.quick || {};
  const timezone = safeText(dashboard.timezone,'Asia/Dubai');
  const mode = commerce?.enabled === true ? safeText(commerce.mode,'غير محدد') : 'غير متاح';
  const modeLabel = ['test','sandbox'].includes(mode) ? 'بيئة اختبار — ليست إيرادات إنتاج' : ['live','production'].includes(mode) ? 'مدفوعات فعلية' : `وضع المدفوعات: ${mode}`;
  const quickItems = [['المنتجات',quick.products,'shop'],['منتجات فعّالة',quick.activeProducts,'check'],['الفعاليات',quick.events,'notices'],['العروض',quick.offers,'offers']];
  return `<div class="ad-royal-overview" dir="rtl">${overview.maintenance?.on ? `<div class="ad-royal-maintenance" role="status">${adminRoyalIcon('info')}<span>وضع الصيانة مفعّل ${escapeHTML(overview.maintenance.message || '')}</span></div>` : ''}
    <section class="ad-royal-welcome" aria-labelledby="ad-royal-welcome-title"><div><span class="ad-royal-eyebrow">لوحة إدارة لعبنا</span><h1 id="ad-royal-welcome-title">أهلًا بك في لوحة الإدارة <span aria-hidden="true">${adminRoyalIcon('crown')}</span></h1><p>نظرة شاملة على اللاعبين والألعاب وأداء المنصة</p><div class="ad-royal-welcome-meta">${adminRoyalIcon('globe')}<span>بيانات الخادم · ${escapeHTML(timezone)}</span></div></div><img class="ad-royal-welcome-crown" src="/admin-royal-assets/welcome-crown.webp" alt="" aria-hidden="true"></section>
    <div class="ad-royal-kpis">${kpi('إجمالي المستخدمين',overview.players?.total,'players',count(overview.players?.new24h) ? `${countText(overview.players.new24h)} حساب جديد خلال 24 ساعة` : 'إجمالي حسابات اللاعبين المسجّلة.','gold')}${kpi('المستخدمون النشطون',activeValue,'active',activeNote,'purple')}${kpi('الألعاب النشطة',dashboard.activeGames?.value,'games',safeText(dashboard.activeGames?.definition,'لا يتوفر تعريف الألعاب النشطة من الخادم.'),'pink')}${kpi('مباريات اليوم',matchValue,'matches',safeText(matches?.note,matches?.complete === true ? `بحسب يوم الخادم · ${timezone}` : 'السجل اليومي غير مكتمل؛ لا نعرض عددًا تقديريًا.'),'amber')}</div>
    <div class="ad-royal-dashboard-grid"><section class="ad-royal-panel ad-royal-growth-panel">${panelTitle('نمو اللاعبين','chart',periodButtons(period))}${growthChart(dashboard.growth)}<p class="ad-royal-source-note">الفترة: ${period ? period === '7d' ? '7 أيام' : period === '30d' ? '30 يومًا' : '90 يومًا' : 'غير محددة من الخادم'} · ${escapeHTML(timezone)}</p></section>
      <section class="ad-royal-panel ad-royal-revenue-panel">${panelTitle('إيرادات المنصة · AED','money')}<span class="ad-royal-mode-pill">${escapeHTML(modeLabel)}</span>${revenue(commerce)}</section>
      <section class="ad-royal-panel ad-royal-games-panel">${panelTitle('الألعاب الأكثر لعبًا','games')}${gameRows(overview,dashboard)}</section>
      <section class="ad-royal-panel ad-royal-distribution-panel">${panelTitle('توزيع الإيرادات','chart')}${distribution(commerce)}</section>
      <section class="ad-royal-panel ad-royal-transactions-panel">${panelTitle('آخر المعاملات · كل الفترات','money',`<span class="ad-royal-panel-kicker">${escapeHTML(modeLabel)}</span>`)}${transactions(commerce,timezone)}</section>
      <section class="ad-royal-panel ad-royal-quick-panel">${panelTitle('إحصائيات سريعة','overview')}<dl class="ad-royal-quick-list">${quickItems.map(([label,value,icon]) => `<div><dt>${adminRoyalIcon(icon)}<span>${label}</span></dt><dd dir="ltr">${countText(value)}</dd></div>`).join('')}</dl>${quickItems.some(([,value]) => !count(value)) ? '<p class="ad-royal-source-note">— تعني أن العدد غير متاح من الخادم.</p>' : ''}</section></div>
    <footer class="ad-royal-overview-footer"><span>لعبنا · مركز الإدارة</span><span>الأرقام من استجابة الخادم فقط</span></footer></div>`;
}
