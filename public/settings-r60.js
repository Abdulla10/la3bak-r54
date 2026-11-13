/* R60: صفحة الإعدادات (قائمة صفوف مثل فيديو المالك)، وصفحة «إعدادات الخصوصية» (خيارات مقفولة بالرتبة)، وصفحة «معلومات الحساب».
 * كل القيم من الخادم؛ القفل بالرتبة يتحقق منه الخادم أيضًا (PATCH يرفض إذا الرتبة ما تسمح). */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = (u, method = 'GET', body) => fetch(u, { method, credentials: 'same-origin', headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }).then(async (r) => { const j = await r.json().catch(() => ({})); return r.ok ? j : { ok: false, ...j }; }).catch(() => ({ ok: false, error: 'انقطع الاتصال. جرّب مرة ثانية.' }));
const chev = '<i class="s60-chev" aria-hidden="true">‹</i>';
const soon = '<span class="s60-soon">قريبًا</span>';
const row = (label, right = '', attrs = '', cls = '') => `<li class="s60-row ${cls}" ${attrs}><span class="s60-label">${label}</span><span class="s60-right">${right}</span></li>`;
const link = (label, href, value = '') => `<li class="s60-row"><a class="s60-link" href="${esc(href)}"><span class="s60-label">${esc(label)}</span><span class="s60-right">${value ? `<small>${value}</small>` : ''}${chev}</span></a></li>`;
const btn = (label, act, value = '', cls = '') => `<li class="s60-row ${cls}"><button type="button" class="s60-link" data-s60="${esc(act)}"><span class="s60-label">${esc(label)}</span><span class="s60-right">${value ? `<small>${value}</small>` : ''}${chev}</span></button></li>`;
const soonRow = (label) => row(esc(label), soon, 'aria-disabled="true"', 'is-soon');
const toggle = (key, on, disabled = false) => `<button type="button" class="s60-switch${on ? ' is-on' : ''}" role="switch" aria-checked="${on}" data-s60-toggle="${esc(key)}" ${disabled ? 'disabled' : ''}><i></i></button>`;
const head = (title, back) => `<header class="s60-head"><a class="s60-back" href="${esc(back)}" aria-label="رجوع">›</a><h1>${esc(title)}</h1><span></span></header>`;
const msg = (t, bad = false) => t ? `<p class="s60-msg${bad ? ' is-bad' : ''}" role="status">${esc(t)}</p>` : '';

/* R68h: أيقونات ذهبية لصفوف الإعدادات (تصميم المالك) */
const G68 = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="g68" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset="1" stop-color="#f0a926"/></linearGradient></defs><g fill="none" stroke="url(#g68)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</g></svg>`;
const S68 = {
  'اللغة': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  'إعادة تعيين كلمة المرور': '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  'ربط الحساب': '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  'الأجهزة اللي سجّلت الدخول منها': '<rect x="3" y="4" width="14" height="10" rx="1.5"/><path d="M6 18h8"/><rect x="16" y="9" width="5" height="11" rx="1"/>',
  'الوضع الداكن': '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  'معلومات الحساب': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  'إشعارات الجوال': '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  'إعدادات الإشعارات': '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>',
  'إعدادات الخصوصية': '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  'القائمة السوداء': '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  'إخفاء منشوراتي': '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/><path d="M4 20L20 4"/>',
  'خلفية الملف كاملة': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/>',
  'إخفاء لون اسمي': '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  'إخفاء جميع منشوراته': '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  'المؤثرات الصوتية': '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  'مسح ذاكرة التخزين المؤقت': '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  'إصلاح مشاكل اللعبة': '<path d="M7 7h10a5 5 0 0 1 4.9 6l-.7 3.4a2.6 2.6 0 0 1-4.5 1.2L14.6 15H9.4l-2.1 2.6a2.6 2.6 0 0 1-4.5-1.2L2.1 13A5 5 0 0 1 7 7zM7 10v4M5 12h4"/>',
  'حول لعبك | LA3BAK': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  'إرشادات المجتمع': '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6v14"/>',
  'سياسة الخصوصية': '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  'المساعدة والدعم': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.5"/>',
  'تبديل الحساب': '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  'خروج': '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
  'حذف الحساب': '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};
function icons68(html) { for (const [k, d] of Object.entries(S68)) html = html.split(`<span class="s60-label">${k}`).join(`<span class="s60-label"><i class="s68-ic">${G68(d)}</i>${k}`); return html.replace('<header class="s60-head">', '<header class="s60-head s68-head"><span class="s68-logo" aria-hidden="true"><i>👑</i><b>لعبك</b><small>LA3BAK</small></span>'); }
/** صفحة الإعدادات */
export function settingsHTML(ctx) {
  const google = ctx.google === true;
  return icons68(`<section class="s60" dir="rtl">${head('الإعدادات', '#/profile')}
  <ul class="s60-list">
    ${row('اللغة', '<small>العربية</small>')}
    ${btn('إعادة تعيين كلمة المرور', 'password', google ? 'من حساب Google' : '')}
    ${link('ربط الحساب', '#/account-info', google ? '<b class="s60-ok">محمي ✓</b>' : '<b class="s60-warn">غير محمي ⓘ</b>')}
    ${link('ألوان الموقع 🎨', '#/themes')}
    <!-- R69zc: توثيق الجوال (واتساب) مخفي لين نفعّله مستقبلاً، والكود جاهز -->
    ${link('الأجهزة اللي سجّلت الدخول منها', '#/devices')}
    ${link('التحقق بخطوتين 🔐', '#/twofa')}
    ${row('الوضع الداكن', `<button type="button" class="s60-switch${document.documentElement.classList.contains('lb-dark') ? ' is-on' : ''}" role="switch" aria-checked="${document.documentElement.classList.contains('lb-dark')}" data-s60-dark><i></i></button>`)}
  </ul>
  <ul class="s60-list">
    ${link('معلومات الحساب', '#/account-info')}
    ${row('إشعارات الجوال', `<small data-s60-push-note></small><button type="button" class="s60-switch" role="switch" aria-checked="false" data-s60-push><i></i></button>`)}
    ${link('إعدادات الإشعارات', '#/notifications')}
    ${link('إعدادات الخصوصية', '#/privacy-settings')}
    ${link('القائمة السوداء', '#/friends')}
    ${row('إخفاء منشوراتي<small class="s60-sub">منشوراتك ما تطلع لأحد غيرك</small>', toggle('hidePosts', ctx.settings?.hidePosts === true, !ctx.settings))}
    ${row('خلفية الملف كاملة<small class="s60-sub">للخلفيات الأسطورية والفخمة جدًا، ولـVIP 6 وفوق. لو طفيتها تطلع الخلفية فوق الملف بس</small>', toggle('flatProfileBg', ctx.settings?.flatProfileBg !== true, !ctx.settings))}
    ${row('إخفاء لون اسمي<small class="s60-sub">لون اسمك حسب مستوى VIP ما يطلع للناس</small>', toggle('hideNameColor', ctx.settings?.hideNameColor === true, !ctx.settings))}
    ${link('إخفاء جميع منشوراته', '#/hidden-posts')}
  </ul>
  <ul class="s60-list">
    ${row('المؤثرات الصوتية', toggle('sound', ctx.settings?.sound === true, !ctx.settings))}
    ${btn('مسح ذاكرة التخزين المؤقت', 'cache')}
    ${btn('إصلاح مشاكل اللعبة', 'repair')}
  </ul>
  <ul class="s60-list">
    ${link('حول لعبك | LA3BAK', '#/about')}
    ${link('إرشادات المجتمع', '#/terms')}
    ${link('سياسة الخصوصية', '#/privacy')}
    ${link('المساعدة والدعم', '#/support')}
  </ul>
  <ul class="s60-list">
    ${btn('تبديل الحساب', 'switch')}
    ${btn('خروج', 'logout', '', 'is-danger')}
  </ul>
  <ul class="s60-list">
    ${btn('حذف الحساب', 'delete-account', 'بعد 30 يوم', 'is-danger')}
  </ul>${msg(ctx.msg, ctx.bad)}</section>`);
}

const PRIV = [
  { key: 'showPresence', title: 'إخفاء حالة الاتصال', desc: 'بعد التشغيل، أصدقاؤك ما يشوفون إذا كنت متصل، وما يقدرون يتبعونك للغرف.', invert: true },
  { key: 'hideEntrances', title: 'إخفاء الدخولية', desc: 'بعد التشغيل، ما يطلع ترحيب ولا دخولية لما تدخل الغرفة.' },
  { key: 'hideVisits', title: 'التخفي في زيارة الملف', desc: 'بعد التشغيل، تطلع «زائر مخفي» لما تزور ملف أحد، حتى لأصحاب VIP.' },
  { key: 'showActivity', title: 'إظهار نشاطي', desc: 'السماح بعرض إحصائيات نشاطك العامة.' },
  { key: 'hideChatEffects', title: 'إخفاء مؤثرات الصوت والمحادثة', desc: 'إخفاء مؤثرات الهدايا والمحادثة في الغرف عندك.' },
  // R68z41
  { key: 'hideGender', title: 'خصوصية نوع الجنس', desc: 'بعد التشغيل، جنسك ما يطلع للناس بملفك.' },
  { key: 'hideLists', title: 'إخفاء القوائم المتعلقة بي', desc: 'قائمة متابعينك واللي تتابعهم ما تطلع لأحد غيرك.' },
  { key: 'hideGiftLog', title: 'إخفاء سجل الهدايا', desc: 'عدد الهدايا اللي وصلتك وأرسلتها ما يطلع للناس.' },
  { key: 'hideVipId', title: 'إخفاء هوية VIP', desc: 'شارة VIP حقتك ما تطلع للناس بالغرف والملف.' },
  { key: 'noFollow', title: 'لا يمكن متابعتك', desc: 'ما أحد يقدر يتابعك (اللي يتابعونك من قبل يبقون).' },
  { key: 'unsearchable', title: 'عدم إمكانية العثور عليك', desc: 'ما تطلع بالبحث، لا بالاسم ولا بالـID.' },
  { key: 'hideWealth', title: 'إخفاء مستوى الثروة', desc: 'مستواك ما يطلع للناس بالغرف والملف.' },
  // R88
  { key: 'hideRead', title: 'إخفاء «قرأ رسالتك»', desc: 'اللي يراسلونك ما يشوفون إذا قريت رسايلهم.' },
];
const SOON_PRIV = [['أدخل الغرفة متخفي', 'ما أحد يشوفك وأنت داخل الغرفة.'], ['حظر تعليقات وإعجابات الغرباء', 'ما تستقبل تعليقات وإعجابات من غير الأصدقاء.'], ['غير مسموح بإرسال طلب صداقة', 'ما أحد يقدر يرسلك طلب صداقة.'], ['إخفاء أيقونة النبلاء', 'ما تطلع شارة النبلاء حقتك.'], ['إخفاء عدد أيام تسجيل الدخول', 'ما أحد يشوف كم يوم دخلت.'], ['حالتك داخل الغرفة', 'تحدد مين يشوف إنك بغرفة صوت.'], ['حفظ سجل الدردشة', 'تحتفظ بسجل دردشتك مع أصدقائك.']];
const chip = (g) => g ? `${g.vip ? `<em class="s60-chip is-vip">VIP${g.vip}</em>` : ''}${g.noble ? `<em class="s60-chip is-noble">N${g.noble}</em>` : ''}${g.level ? `<em class="s60-chip is-vip">Lv.${g.level}</em>` : ''}` : '';
/** صفحة «إعدادات الخصوصية» */
export function privacyHTML(d, m = '', bad = false) {
  if (!d) return `<section class="s60" dir="rtl">${head('إعدادات الخصوصية', '#/settings')}<p class="s60-msg">جاري التحميل…</p></section>`;
  if (d.ok === false) return `<section class="s60" dir="rtl">${head('إعدادات الخصوصية', '#/settings')}${msg(d.error || 'تعذّر التحميل.', true)}</section>`;
  const items = PRIV.map((p) => { const g = d.gates?.[p.key]; const raw = d.settings?.[p.key] === true; const on = p.invert ? !raw : raw; const locked = g && !g.allowed;
    return `<li class="s60-prow${locked ? ' is-locked' : ''}"><div><b>${esc(p.title)} ${chip(g)}</b><small>${esc(p.desc)}${locked ? ` <span class="s60-need">يحتاج ${g.vip ? 'VIP ' + g.vip : ''}${g.noble ? ' أو نبيل ' + g.noble : ''}${g.level ? 'المستوى ' + g.level : ''}</span>` : ''}</small></div>${toggle(p.key, locked ? false : on, locked)}</li>`; }).join('');
  const visitors = `<li class="s60-prow${d.visitorsOpen ? '' : ' is-locked'}"><div><b>من الذي رآني ${chip({ vip: d.visitorsVip })}</b><small>تشوف أسماء وصور اللي زاروا ملفك، حتى اللي مسكرين نشاطهم.${d.visitorsOpen ? '' : ` <span class="s60-need">يحتاج VIP ${esc(d.visitorsVip)}</span>`}</small></div><a class="s60-mini" href="#/visitors">${d.visitorsOpen ? 'فتح' : 'شوف'}</a></li>`;
  const later = SOON_PRIV.map(([t, x]) => `<li class="s60-prow is-soon"><div><b>${esc(t)}</b><small>${esc(x)}</small></div>${soon}</li>`).join('');
  return `<section class="s60" dir="rtl">${head('إعدادات الخصوصية', '#/settings')}<p class="s60-tier">رتبتك: <b>${d.vip ? 'VIP ' + d.vip : 'بدون VIP'}</b>${d.noble ? ` · <b>نبيل ${d.noble}</b>` : ''}</p>${msg(m, bad)}<ul class="s60-plist">${visitors}${items}${later}</ul></section>`;
}
const countries = (() => { try { return new Intl.DisplayNames(['ar'], { type: 'region' }); } catch { return null; } })();
const country = (c) => c === 'AE' ? 'الإمارات' : c ? (countries?.of(c) || c) : 'غير محدد';
/** صفحة «معلومات الحساب» */
/* R66: «إخفاء جميع منشوراته» — الأشخاص اللي أخفيت منشوراتهم عنك (الكتم بالمجتمع، بالخادم) */
export function hiddenPostsHTML(d, m = '', bad = false) {
  const top = `${head('إخفاء جميع منشوراته', '#/settings')}<p class="s60-note">منشورات هالأشخاص وتعليقاتهم ما تطلع لك بالمجتمع، وهم ما يدرون. تقدر تخفي منشورات أي شخص من ملفه بزر «🙈 إخفاء منشوراته».</p>${msg(m, bad)}`;
  if (!d) return `<section class="s60" dir="rtl">${top}<p class="s60-msg">جاري التحميل…</p></section>`;
  if (d.ok === false || d.error || !Array.isArray(d.muted)) return `<section class="s60" dir="rtl">${top}${msg(d.error || 'تعذّر التحميل.', true)}</section>`;
  const list = d.muted.map((u) => `<li class="s60-row hp66"><a class="s60-label hp66-who" href="#/u/${esc(u.pub)}"><i class="hp66-face" aria-hidden="true">${esc([...String(u.name || 'ل').trim()][0] || 'ل')}</i><b>${esc(u.name)}</b></a><span class="s60-right"><button type="button" class="hp66-btn" data-s60="unmute" data-pub="${esc(u.pub)}">إظهار منشوراته</button></span></li>`).join('');
  return `<section class="s60" dir="rtl">${top}<ul class="s60-list">${list || '<li class="s60-row"><span class="s60-label"><small>ما أخفيت منشورات أحد.</small></span></li>'}</ul></section>`;
}
/* R62: الأجهزة */
const ago = (t) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 2 ? 'الحين' : m < 60 ? `قبل ${m} دقيقة` : m < 1440 ? `قبل ${Math.round(m / 60)} ساعة` : `قبل ${Math.round(m / 1440)} يوم`; };
export function devicesHTML(d, m = '', bad = false) {
  if (!d) return `<section class="s60" dir="rtl">${head('الأجهزة', '#/settings')}<p class="s60-msg">جاري التحميل…</p></section>`;
  const list = (d.list || []).map((x) => `<li class="s60-row dv62"><span class="s60-label"><b>${x.label.includes('iPhone') || x.label.includes('Android') || x.label.includes('iPad') ? '📱' : '💻'} ${esc(x.label)}${x.current ? ' <em class="dv62-cur">هذا الجهاز</em>' : ''}</b><small>أول دخول: ${esc(new Date(x.at).toLocaleDateString('ar-EG-u-nu-latn'))} · آخر استخدام: ${esc(ago(x.seen))}</small></span><span class="s60-right">${x.current ? '' : `<button type="button" class="dv62-out" data-s60="dev-out" data-id="${esc(x.id)}">مب أنا · طلّعه</button>`}</span></li>`).join('');
  const others = (d.list || []).filter((x) => !x.current).length;
  return `<section class="s60" dir="rtl">${head('الأجهزة', '#/settings')}${msg(m, bad)}
  <p class="s60-note">هذي الأجهزة اللي حسابك مفتوح عليها الحين. لو شفت جهاز ما تعرفه اضغط «مب أنا · طلّعه»، أو طلّع كل الأجهزة الثانية مرة وحدة. وإذا حسابك مربوط بـGoogle، غيّر كلمة سر Google بعد.</p>
  <ul class="s60-list">${list || '<li class="s60-row"><span class="s60-label">ما فيه أجهزة مسجلة للحين.</span></li>'}</ul>
  ${others ? `<button type="button" class="s60-danger" data-s60="dev-out-all">طلّع كل الأجهزة الثانية (${others})</button>` : ''}</section>`;
}
export function accountInfoHTML(ctx) {
  const m = ctx.me || {}; const id = m.displayPlayerId || m.specialPlayerId || m.playerId || '';
  const since = Number(m.since) > 0 ? new Date(Number(m.since)).toISOString().slice(0, 10) : 'غير متوفر';
  const g = ctx.google === true;
  return `<section class="s60" dir="rtl">${head('معلومات الحساب', '#/settings')}
  <ul class="s60-list">
    ${row('الاسم', `<small>${esc(m.name || ctx.user?.name || '—')}</small>`)}
    ${row('معرّف اللاعب', `<small dir="ltr">${esc(id || '—')}</small>`)}
    ${row('الدولة', `<small>${esc(country(m.country))}</small>`)}
    ${row('الجنس', `<small>${m.gender === 'male' ? 'ذكر' : m.gender === 'female' ? 'أنثى' : 'غير محدد'}</small>`)}
    ${row('العمر', `<small>${Number.isFinite(m.age) ? esc(m.age) + ' سنة' : 'غير محدد'}</small>`)}
    ${row('تاريخ الانضمام', `<small dir="ltr">${esc(since)}</small>`)}
    ${row('النبذة', `<small class="s60-bio">${esc(m.bio || 'ما فيه نبذة')}</small>`)}
  </ul>
  <ul class="s60-list">${btn('تعديل المعلومات', 'edit')}</ul>
  <ul class="s60-list">
    ${row('حساب Google', g ? '<b class="s60-ok">مربوط ✓</b>' : '<b class="s60-warn">غير مربوط</b>')}
    ${g ? '' : btn('احمِ حسابك بربطه بـ Google', 'google')}
  </ul>
  ${g ? '' : '<p class="s60-note">حساب الضيف ممكن يضيع لو مسحت بيانات المتصفح أو غيّرت جهازك. اربطه بـ Google عشان يبقى رصيدك ومشترياتك محفوظة، وعشان تقدر تستخدم كل مميزات الموقع.</p>'}</section>`;
}
/** الأحداث (يركبها المضيف مرة) */
export function bind(root, host) {
  root.addEventListener('click', async (e) => {
    const pu = e.target.closest?.('[data-s60-push]');
    if (pu && !pu.disabled) { pu.disabled = true; try { await togglePush(root, pu.getAttribute('aria-checked') !== 'true'); } finally { pu.disabled = false; } return; }
    const dk = e.target.closest?.('[data-s60-dark]');
    if (dk) { const on = !document.documentElement.classList.contains('lb-dark'); const TH = await import('./theme.js?v=r64a'); TH.setDark(on); dk.classList.toggle('is-on', on); dk.setAttribute('aria-checked', String(on)); return; }
    const t = e.target.closest?.('[data-s60-toggle]');
    if (t && !t.disabled) {
      const key = t.dataset.s60Toggle; const p = PRIV.find((x) => x.key === key) || (key === 'flatProfileBg' ? { invert: true } : null); const nowOn = t.getAttribute('aria-checked') !== 'true';
      const val = p?.invert ? !nowOn : nowOn; t.disabled = true;
      const r = await api('/api/account-tools/settings', 'PATCH', { [key]: val });
      host.after?.(r && r.ok !== false && !r.error ? '' : (r.error || 'تعذّر الحفظ.'), !(r && r.ok !== false && !r.error)); return;
    }
    const b = e.target.closest?.('[data-s60]'); if (!b) return; const a = b.dataset.s60;
    if (a === 'unmute') { b.disabled = true; const r = await api(`/api/community/user/${encodeURIComponent(b.dataset.pub || '')}/mute`, 'POST', { on: false }); host.after?.(r && !r.error ? 'رجعت منشوراته تطلع لك ✓' : (r?.error || 'ما قدرنا نحفظ.'), !(r && !r.error)); return; }
    if (a === 'dev-out' || a === 'dev-out-all') {
      b.disabled = true;
      const r = await api(a === 'dev-out' ? '/api/devices/revoke' : '/api/devices/revoke-others', 'POST', a === 'dev-out' ? { id: b.dataset.id } : {});
      host.after?.(r?.ok ? (r.revoked ? `طلّعنا الحساب من ${r.revoked === 1 ? 'جهاز واحد' : r.revoked + ' أجهزة'}.` : 'ما فيه أجهزة ثانية.') : (r?.error || 'ما قدرنا نطلّعه.'), !r?.ok); return;
    }
    if (a === 'password') { if (host.google) window.open('https://myaccount.google.com/security', '_blank', 'noopener'); else host.nav('#/account-info'); }
    else if (a === 'cache' || a === 'repair') {
      try { if (globalThis.caches) for (const k of await caches.keys()) await caches.delete(k); } catch {}
      try { for (const k of Object.keys(sessionStorage)) sessionStorage.removeItem(k); } catch {}
      if (a === 'repair') { try { const regs = await navigator.serviceWorker?.getRegistrations?.(); for (const r of regs || []) await r.update(); } catch {} location.reload(); }
      else host.after?.('انمسحت ذاكرة التخزين المؤقت ✓', false);
    }
    else if (a === 'switch' || a === 'logout') { if (a === 'logout' && !confirm('أكيد تبي تسجل خروج؟')) return; host.logout?.(); }
    else if (a === 'edit') { host.nav('#/profile'); setTimeout(() => document.querySelector('[data-pvp="edit-personal"]')?.click(), 700); }
    else if (a === 'google') { host.nav('#/profile'); setTimeout(() => { const d = document.querySelector('.lpu-google-details'); if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); } }, 700); }
  });
}

/* R62: إشعارات الجوال (Web Push) */
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const keyBytes = (b64) => { const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
async function pushReg() { return (await navigator.serviceWorker.getRegistration()) || navigator.serviceWorker.register('/sw.js?v=r124'); }
function pushPaint(root, on, note) { const b = root.querySelector('[data-s60-push]'); const n = root.querySelector('[data-s60-push-note]'); if (b) { b.classList.toggle('is-on', !!on); b.setAttribute('aria-checked', String(!!on)); } if (n) n.textContent = note || ''; }
export async function pushState(root) {
  if (!root.querySelector('[data-s60-push]')) return;
  if (!pushSupported()) return pushPaint(root, false, isIOS() && !standalone() ? 'أضف الموقع للشاشة الرئيسية أول' : 'متصفحك ما يدعمها');
  if (Notification.permission === 'denied') return pushPaint(root, false, 'مقفولة من إعدادات المتصفح');
  try { const r = await navigator.serviceWorker.getRegistration(); const s = await r?.pushManager.getSubscription(); pushPaint(root, !!s && Notification.permission === 'granted', ''); } catch { pushPaint(root, false, ''); }
}
async function togglePush(root, on) {
  if (!pushSupported()) { alertBox(root, isIOS() && !standalone() ? 'على الآيفون: افتح الموقع في Safari ← زر المشاركة ← «إضافة إلى الشاشة الرئيسية»، وافتح لعبك من الأيقونة، وبعدها فعّل الإشعارات من هنا.' : 'هالمتصفح ما يدعم إشعارات الجوال.'); return; }
  try {
    if (!on) { const r = await navigator.serviceWorker.getRegistration(); const s = await r?.pushManager.getSubscription(); if (s) { await fetch('/api/push/unsubscribe', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) }).catch(() => {}); await s.unsubscribe().catch(() => {}); } return pushPaint(root, false, ''); }
    const perm = await Notification.requestPermission(); if (perm !== 'granted') return pushPaint(root, false, perm === 'denied' ? 'مقفولة من إعدادات المتصفح' : '');
    const k = await fetch('/api/push/key', { credentials: 'same-origin' }).then((r) => r.json()); if (!k.ok) throw new Error('الإشعارات مب متاحة على الخادم حاليًا.');
    const reg = await pushReg(); await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(k.key) });
    const r = await fetch('/api/push/subscribe', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), test: true }) }).then((x) => x.json());
    if (!r.ok) throw new Error(r.error || 'ما قدرنا نفعّلها.');
    pushPaint(root, true, 'وصلك إشعار تجربة');
  } catch (err) { pushPaint(root, false, ''); alertBox(root, err?.message || 'ما قدرنا نفعّل الإشعارات.'); }
}
function alertBox(root, text) { let m = root.querySelector('.s60-msg'); if (!m) { m = document.createElement('p'); m.className = 's60-msg'; root.querySelector('.s60')?.prepend(m); } m.textContent = text; m.classList.add('is-bad'); }
