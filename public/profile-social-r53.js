/* R53: صفحتا «من الذي رآني» و«ادعُ الأصدقاء» من قائمة ملفي.
 * البيانات من الخادم فقط (/api/profile/visitors و/api/profile/invites)، بنفس جلسة الموقع.
 * ما فيه أرقام ثابتة ولا مكافآت: الدعوات بدون أي مكافأة مالية. */
import { mini } from './avatars.js?v=r58o';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const PUB = /^[A-Za-z0-9_-]{16}$/;
const INVITE_KEY = 'la3bak:pending-invite';
const store = { get() { try { return localStorage.getItem(INVITE_KEY) || ''; } catch { return ''; } }, set(v) { try { v ? localStorage.setItem(INVITE_KEY, v) : localStorage.removeItem(INVITE_KEY); } catch { /* اختياري */ } } };
const nf = (n) => (Number.isSafeInteger(n) && n >= 0 ? new Intl.NumberFormat('en-US').format(n) : '—');
function ago(at) {
  const t = Number(at); if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'الآن';
  if (s < 3600) return `قبل ${Math.round(s / 60)} د`;
  if (s < 86400) return `قبل ${Math.round(s / 3600)} س`;
  if (s < 30 * 86400) return `قبل ${Math.round(s / 86400)} يوم`;
  return new Date(t).toLocaleDateString('ar-EG-u-nu-latn');
}
function face(u, size = 46) {
  const a = typeof u?.avatar === 'string' ? u.avatar : '';
  if (/^\/api\/social\/avatar\?id=[A-Za-z0-9_-]{16}&v=\d+$/.test(a)) return `<img class="ps-av" src="${esc(a)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  if (/^[A-Za-z0-9_-]{1,100}$/.test(a)) { try { const h = mini(a, size); if (h) return `<span class="ps-av">${h}</span>`; } catch { /* حرف أول */ } }
  return `<span class="ps-av ps-initial" aria-hidden="true">${esc(String(u?.name || 'ل').trim().slice(0, 1))}</span>`;
}
const userRow = (u, side) => u?.hidden === true ? `<li class="ps-row is-hidden${u.fresh ? ' is-fresh' : ''}"><div class="ps-rowbox"><span class="ps-av ps-initial" aria-hidden="true">؟</span><span class="ps-who"><b>زائر مخفي</b><small>مخفي حسب إعدادات خصوصيته</small></span><span class="ps-side">${side}</span></div></li>` : PUB.test(u?.publicId || '') ? `<li class="ps-row${u.fresh ? ' is-fresh' : ''}"><a href="#/u/${esc(u.publicId)}">${face(u)}<span class="ps-who"><b>${esc(u.name || 'لاعب')}</b>${Number.isSafeInteger(u.level) ? `<small>المستوى ${nf(u.level)}</small>` : ''}</span><span class="ps-side">${side}</span></a></li>` : '';
function status(root, msg, error = false) { const el = root.querySelector('[data-ps-status]'); if (el) { el.textContent = msg || ''; el.setAttribute('role', error ? 'alert' : 'status'); el.classList.toggle('is-error', !!error); } }

/** من الذي رآني */
export function visitorsView(root, { api }) {
  let alive = true;
  async function load() {
    root.innerHTML = '<section class="card ps-card"><p data-ps-status role="status">جاري تحميل زوار ملفك…</p></section>';
    try {
      const d = await api('/api/profile/visitors?limit=100');
      if (!alive || !root.isConnected) return;
      const rows = (Array.isArray(d.list) ? d.list : []).map((v) => userRow(v, `${v.fresh ? '<em class="ps-new">جديد</em>' : ''}<time>${esc(ago(v.at))}</time>${v.count > 1 ? `<small>${nf(v.count)} زيارات</small>` : ''}`)).join('');
      root.innerHTML = `<section class="card ps-card"><div class="ps-stats"><span><b>${nf(d.total)}</b><small>زائر</small></span><span><b>${nf(d.fresh)}</b><small>جديد منذ آخر مرة</small></span></div>
        <p class="hint ps-hint">يظهر هنا اللاعبون المسجلون اللي فتحوا ملفك العام. اسم الزائر يظهر فقط إذا مفعّل «إظهار نشاطي» في إعداداته، وغير كذا يظهر «زائر مخفي». وزياراتك أنت لغيرك تتبع نفس الإعداد من <a href="#/settings">الإعدادات</a>.</p>
        <p data-ps-status role="status"></p>${rows ? `<ul class="ps-list">${rows}</ul>` : '<div class="ps-empty"><p>ما زار أحد ملفك بعد.</p><a class="btn" href="#/community">شارك بالمجتمع عشان يتعرفون عليك</a></div>'}</section>`;
      if (d.fresh > 0) { try { await api('/api/profile/visitors/seen', 'POST', {}); } catch { /* يبقى «جديد» للمرة الجاية */ } }
    } catch (e) {
      if (!alive || !root.isConnected) return;
      root.innerHTML = `<section class="card ps-card"><p data-ps-status role="alert" class="is-error">${esc(e?.message || 'تعذّر التحميل.')}</p><button class="btn" type="button" data-ps-retry>إعادة المحاولة</button></section>`;
      root.querySelector('[data-ps-retry]')?.addEventListener('click', load);
    }
  }
  void load();
  return { destroy() { alive = false; } };
}

/** ادعُ الأصدقاء — code: رمز دعوة من الرابط (#/invite/<رمز>) إن وجد */
export function inviteView(root, { api, code = '' }) {
  let alive = true;
  if (PUB.test(code)) store.set(code);
  async function load() {
    root.innerHTML = '<section class="card ps-card"><p data-ps-status role="status">جاري التحميل…</p></section>';
    try {
      const d = await api('/api/profile/invites');
      if (!alive || !root.isConnected) return;
      const pending = store.get();
      const link = `${location.origin}/#/invite/${encodeURIComponent(d.code)}`;
      const claim = pending && pending !== d.code && d.canClaim && !d.invitedBy
        ? `<section class="card ps-card ps-claim"><h2>عندك دعوة</h2><p>تبي تربط حسابك الجديد بدعوة صديقك؟ هذا يظهر له أنك انضميت عن طريقه، وما فيه أي مكافأة مالية.</p><button class="btn" type="button" data-ps-claim>تأكيد الانضمام عبر الدعوة</button><button class="btn ghost" type="button" data-ps-skip>تجاهل</button></section>` : '';
      const joined = (Array.isArray(d.joined) ? d.joined : []).map((u) => userRow(u, `<time>${esc(ago(u.at))}</time>`)).join('');
      root.innerHTML = `${claim}<section class="card ps-card"><h2>رابط دعوتك</h2><p class="hint ps-hint">أرسل الرابط لأصدقائك. اللي يسوي حساب جديد ويفتح الرابط خلال أول 72 ساعة يقدر يأكد إنه انضم عن طريقك.</p>
        <div class="ps-link"><input type="text" readonly dir="ltr" value="${esc(link)}" aria-label="رابط الدعوة" data-ps-link><button class="btn" type="button" data-ps-copy>نسخ</button></div>
        <div class="ps-actions"><button class="btn" type="button" data-ps-share>مشاركة الرابط</button><a class="btn ghost" href="https://wa.me/?text=${encodeURIComponent('تعال العب معي في لعبك LA3BAK ' + link)}" target="_blank" rel="noopener noreferrer">واتساب</a></div>
        <p data-ps-status role="status"></p></section>
        <section class="card ps-card"><h2>انضموا عن طريقك <small>(${nf(d.joinedCount)})</small></h2>${joined ? `<ul class="ps-list">${joined}</ul>` : '<p class="ps-empty">ما انضم أحد عن طريق رابطك بعد.</p>'}
        ${d.invitedBy ? `<p class="hint ps-hint">أنت انضميت عن طريق دعوة <a href="#/u/${esc(d.invitedBy.publicId)}">${esc(d.invitedBy.name)}</a>.</p>` : ''}<p class="hint ps-hint">الدعوات للتعارف فقط وما تعطي عملات أو جواهر.</p></section>`;
      root.querySelector('[data-ps-copy]')?.addEventListener('click', async () => {
        const input = root.querySelector('[data-ps-link]');
        try { await navigator.clipboard.writeText(link); status(root, 'تم نسخ الرابط.'); } catch { input?.select(); status(root, 'حدّد الرابط وانسخه يدوياً.'); }
      });
      root.querySelector('[data-ps-share]')?.addEventListener('click', async () => {
        if (navigator.share) { try { await navigator.share({ title: 'لعبك LA3BAK', text: 'تعال العب معي في لعبك', url: link }); } catch { /* المستخدم ألغى */ } }
        else { try { await navigator.clipboard.writeText(link); status(root, 'جهازك ما يدعم المشاركة؛ نسخنا الرابط بدلها.'); } catch { status(root, 'انسخ الرابط من الخانة فوق.'); } }
      });
      root.querySelector('[data-ps-skip]')?.addEventListener('click', () => { store.set(''); void load(); });
      root.querySelector('[data-ps-claim]')?.addEventListener('click', async (ev) => {
        ev.currentTarget.disabled = true;
        try { await api('/api/profile/invites/claim', 'POST', { code: pending }); store.set(''); await load(); status(root, 'تم ربط حسابك بالدعوة.'); }
        catch (e) { status(root, e?.message || 'تعذّر ربط الدعوة.', true); ev.currentTarget.disabled = false; if (/غير صالح|نفسك|الجديدة|قبلك/.test(e?.message || '')) store.set(''); }
      });
    } catch (e) {
      if (!alive || !root.isConnected) return;
      root.innerHTML = `<section class="card ps-card"><p data-ps-status role="alert" class="is-error">${esc(e?.message || 'تعذّر التحميل.')}</p><button class="btn" type="button" data-ps-retry>إعادة المحاولة</button></section>`;
      root.querySelector('[data-ps-retry]')?.addEventListener('click', load);
    }
  }
  void load();
  return { destroy() { alive = false; } };
}
