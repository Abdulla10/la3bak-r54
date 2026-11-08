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

/** صفحة الإعدادات */
export function settingsHTML(ctx) {
  const google = ctx.google === true;
  return `<section class="s60" dir="rtl">${head('الإعدادات', '#/profile')}
  <ul class="s60-list">
    ${row('اللغة', '<small>العربية</small>')}
    ${btn('إعادة تعيين كلمة المرور', 'password', google ? 'من حساب Google' : '')}
    ${link('ربط الحساب', '#/account-info', google ? '<b class="s60-ok">محمي ✓</b>' : '<b class="s60-warn">غير محمي ⓘ</b>')}
    ${soonRow('الأجهزة اللي سجّلت الدخول منها')}
    ${soonRow('الوضع الداكن')}
  </ul>
  <ul class="s60-list">
    ${link('معلومات الحساب', '#/account-info')}
    ${link('إعدادات الإشعارات', '#/notifications')}
    ${link('إعدادات الخصوصية', '#/privacy-settings')}
    ${link('القائمة السوداء', '#/friends')}
    ${soonRow('إخفاء منشوراتي')}
    ${soonRow('إخفاء جميع منشوراته')}
  </ul>
  <ul class="s60-list">
    ${row('المؤثرات الصوتية', toggle('sound', ctx.settings?.sound === true, !ctx.settings))}
    ${btn('مسح ذاكرة التخزين المؤقت', 'cache')}
    ${btn('إصلاح مشاكل اللعبة', 'repair')}
  </ul>
  <ul class="s60-list">
    ${link('حول لعبنا', '#/about')}
    ${link('إرشادات المجتمع', '#/terms')}
    ${link('سياسة الخصوصية', '#/privacy')}
    ${link('المساعدة والدعم', '#/support')}
    ${soonRow('تبديل النطاق')}
  </ul>
  <ul class="s60-list">
    ${btn('تبديل الحساب', 'switch')}
    ${btn('خروج', 'logout', '', 'is-danger')}
  </ul>${msg(ctx.msg, ctx.bad)}</section>`;
}

const PRIV = [
  { key: 'showPresence', title: 'إخفاء حالة الاتصال', desc: 'بعد التشغيل، أصدقاؤك ما يشوفون إذا كنت متصل، وما يقدرون يتبعونك للغرف.', invert: true },
  { key: 'hideEntrances', title: 'إخفاء الدخولية', desc: 'بعد التشغيل، ما يطلع ترحيب ولا دخولية لما تدخل الغرفة.' },
  { key: 'hideVisits', title: 'التخفي في زيارة الملف', desc: 'بعد التشغيل، تطلع «زائر مخفي» لما تزور ملف أحد، حتى لأصحاب VIP 11.' },
  { key: 'showActivity', title: 'إظهار نشاطي', desc: 'السماح بعرض إحصائيات نشاطك العامة.' },
  { key: 'hideChatEffects', title: 'إخفاء مؤثرات الصوت والمحادثة', desc: 'إخفاء مؤثرات الهدايا والمحادثة في الغرف عندك.' },
];
const SOON_PRIV = [['أدخل الغرفة متخفي', 'ما أحد يشوفك وأنت داخل الغرفة.'], ['حظر تعليقات وإعجابات الغرباء', 'ما تستقبل تعليقات وإعجابات من غير الأصدقاء.'], ['غير مسموح بإرسال طلب صداقة', 'ما أحد يقدر يرسلك طلب صداقة.'], ['الإخفاء من التصنيفات', 'تطلع بالقوائم كشخص غامض.'], ['إخفاء أيقونة النبلاء', 'ما تطلع شارة النبلاء حقتك.'], ['إخفاء عدد أيام تسجيل الدخول', 'ما أحد يشوف كم يوم دخلت.'], ['حالتك داخل الغرفة', 'تحدد مين يشوف إنك بغرفة صوت.'], ['حفظ سجل الدردشة', 'تحتفظ بسجل دردشتك مع أصدقائك.']];
const chip = (g) => g ? `${g.vip ? `<em class="s60-chip is-vip">VIP${g.vip}</em>` : ''}${g.noble ? `<em class="s60-chip is-noble">N${g.noble}</em>` : ''}` : '';
/** صفحة «إعدادات الخصوصية» */
export function privacyHTML(d, m = '', bad = false) {
  if (!d) return `<section class="s60" dir="rtl">${head('إعدادات الخصوصية', '#/settings')}<p class="s60-msg">جاري التحميل…</p></section>`;
  if (d.ok === false) return `<section class="s60" dir="rtl">${head('إعدادات الخصوصية', '#/settings')}${msg(d.error || 'تعذّر التحميل.', true)}</section>`;
  const items = PRIV.map((p) => { const g = d.gates?.[p.key]; const raw = d.settings?.[p.key] === true; const on = p.invert ? !raw : raw; const locked = g && !g.allowed;
    return `<li class="s60-prow${locked ? ' is-locked' : ''}"><div><b>${esc(p.title)} ${chip(g)}</b><small>${esc(p.desc)}${locked ? ` <span class="s60-need">يحتاج ${g.vip ? 'VIP ' + g.vip : ''}${g.noble ? ' أو نبيل ' + g.noble : ''}</span>` : ''}</small></div>${toggle(p.key, locked ? false : on, locked)}</li>`; }).join('');
  const visitors = `<li class="s60-prow${d.visitorsOpen ? '' : ' is-locked'}"><div><b>من الذي رآني ${chip({ vip: d.visitorsVip })}</b><small>تشوف أسماء وصور اللي زاروا ملفك، حتى اللي مسكرين نشاطهم.${d.visitorsOpen ? '' : ` <span class="s60-need">يحتاج VIP ${esc(d.visitorsVip)}</span>`}</small></div><a class="s60-mini" href="#/visitors">${d.visitorsOpen ? 'فتح' : 'شوف'}</a></li>`;
  const later = SOON_PRIV.map(([t, x]) => `<li class="s60-prow is-soon"><div><b>${esc(t)}</b><small>${esc(x)}</small></div>${soon}</li>`).join('');
  return `<section class="s60" dir="rtl">${head('إعدادات الخصوصية', '#/settings')}<p class="s60-tier">رتبتك: <b>${d.vip ? 'VIP ' + d.vip : 'بدون VIP'}</b>${d.noble ? ` · <b>نبيل ${d.noble}</b>` : ''}</p>${msg(m, bad)}<ul class="s60-plist">${visitors}${items}${later}</ul></section>`;
}
const countries = (() => { try { return new Intl.DisplayNames(['ar'], { type: 'region' }); } catch { return null; } })();
const country = (c) => c === 'AE' ? 'الإمارات' : c ? (countries?.of(c) || c) : 'غير محدد';
/** صفحة «معلومات الحساب» */
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
    const t = e.target.closest?.('[data-s60-toggle]');
    if (t && !t.disabled) {
      const key = t.dataset.s60Toggle; const p = PRIV.find((x) => x.key === key); const nowOn = t.getAttribute('aria-checked') !== 'true';
      const val = p?.invert ? !nowOn : nowOn; t.disabled = true;
      const r = await api('/api/account-tools/settings', 'PATCH', { [key]: val });
      host.after?.(r && r.ok !== false && !r.error ? '' : (r.error || 'تعذّر الحفظ.'), !(r && r.ok !== false && !r.error)); return;
    }
    const b = e.target.closest?.('[data-s60]'); if (!b) return; const a = b.dataset.s60;
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
