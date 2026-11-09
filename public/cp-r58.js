/* R58w: بطاقة CP — فوق «الارتباط الافتراضي» الموجود (R47). الطلب والقبول والإنهاء والظهور من نظام R47 نفسه.
 * [data-cp-me] بملفك الشخصي، وبطاقة تنضاف تحت رأس ملف أي لاعب (#/u/...). البيانات من الخادم بس. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number.isSafeInteger(n) ? n.toLocaleString('en-US') : '—';
const face = (p) => p?.avatar && /^\/(api|assets|preview)\//.test(p.avatar) ? `<img src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async">` : `<b>${esc([...String(p?.name || '؟')][0])}</b>`;
const badge = (lv) => `<img class="cp58-badge" src="/assets/art58/cp/cp${lv >= 4 ? 2 : 1}.webp?v=r58w" alt="CP" decoding="async">`;
const get = (u) => fetch(u, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
function card(cp, me, opts = {}) {
  const pct = cp.next ? Math.min(100, Math.floor((cp.pts - cp.floor) / (cp.next - cp.floor) * 100)) : 100;
  return `<section class="cp58-card" dir="rtl" aria-label="علاقة CP">${badge(cp.level)}<div class="cp58-pair"><span class="cp58-face">${face(me)}</span><i aria-hidden="true">💞</i><span class="cp58-face">${cp.partner ? face(cp.partner) : '<b>؟</b>'}</span></div>
  <h3>${cp.partner ? `${opts.mine ? 'أنت و' : esc(me?.name || '') + ' و'}<a href="#/u/${esc(cp.partner.id)}">${esc(cp.partner.name)}</a>` : 'شريكك مخفي حاليًا'}</h3>
  <p class="cp58-meta"><span>معًا منذ <b dir="ltr">${nf(cp.days)}</b> يوم</span><span>CP Lv${cp.level} · ${esc(cp.name)}</span></p>
  <div class="cp58-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
  <p class="cp58-pts"><b dir="ltr">${nf(cp.pts)}</b> نقطة CP${cp.next ? ` · المستوى الجاي عند <b dir="ltr">${nf(cp.next)}</b>` : ' · أعلى مستوى'}</p>
  ${opts.mine ? '<button type="button" class="cp67-open" data-cp-space>💞 مساحة CP</button><p class="cp58-hint">كل 20 عملة بهدية بينكم = نقطة CP. تقدر تتحكم بظهور العلاقة أو تنهيها من «العائلة والارتباط الافتراضي».</p>' : ''}</section>`;
}
async function fillMe(el) {
  const r = await get('/api/cp/me'); if (!el.isConnected || !r?.ok) return;
  if (!r.adult) { el.innerHTML = ''; return; }
  const me = r.me || { name: 'أنت', avatar: null };
  el.innerHTML = r.cp ? card(r.cp, me, { mine: true }) : `<section class="cp58-card is-empty" dir="rtl">${badge(1)}<h3>ما عندك CP للحين</h3><p class="cp58-hint">افتح ملف صديق عمره 18+ واضغط «اطلب CP». العلاقة تظهر للناس بس لو أنتم الاثنين وافقتوا على ظهورها.</p></section>`;
}
async function fillOf(el) {
  const pub = el.dataset.cpOf; const r = await get('/api/cp/of/' + encodeURIComponent(pub)); if (!el.isConnected || !r?.ok) return;
  const me = { name: document.querySelector('.cm-prof h1')?.childNodes[0]?.textContent?.trim() || '', avatar: document.querySelector('.cm-prof img')?.getAttribute('src') || null };
  el.innerHTML = r.cp ? card(r.cp, me) : r.canRequest ? `<button type="button" class="btn cp58-ask" data-cp-ask="${esc(pub)}">${badge(1)}<span>اطلب CP 💞</span></button><p class="cp58-msg" role="status"></p>` : '';
}
async function ask(btn) {
  const msg = btn.parentElement.querySelector('.cp58-msg'); btn.disabled = true;
  const key = 'cp-' + ((crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const r = await fetch('/api/social-private/family', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'couple-request', key, to: btn.dataset.cpAsk }) }).then((x) => x.json().catch(() => ({}))).catch(() => ({}));
  if (msg) msg.textContent = r && r.ok !== false && !r.error ? 'انرسل الطلب ✓ لما يوافق تصيرون CP.' : (r?.error?.message || r?.error || r?.message || 'تعذّر إرسال الطلب.');
  if (r && r.ok !== false && !r.error) btn.remove(); else btn.disabled = false;
}
/* R67: مساحة CP — صفحة كاملة: الثنائي فوق، شريط المستوى، تبويب المهام اليومية والامتيازات (مثل الفيديو) */
const LV_NAMES = ['بداية', 'قريبين', 'متفاهمين', 'روح وحدة', 'أسطورة CP'];
const PERKS = [[1, 'بطاقة CP بملفكم الشخصي', 'تطلع لكل من يزور ملفكم (لو الاثنين موافقين على الظهور)'], [1, 'شارة CP', 'جنب بطاقة العلاقة'], [4, 'شارة CP الذهبية', 'تتبدل الشارة لذهبية من مستوى «روح وحدة»'], [5, 'لقب «أسطورة CP»', 'أعلى مستوى للثنائي']];
const TASK_ICON = { game: '🎮', msg: '💬', room: '🎙️', gift: '🎁' };
async function openSpace() {
  if (document.querySelector('.cp67')) return;
  const root = document.createElement('div'); root.className = 'cp67'; root.setAttribute('dir', 'rtl'); document.body.append(root);
  const st = { tab: 'tasks', cp: null, me: null, tasks: [], msg: '' };
  const close = () => { root.classList.add('is-out'); setTimeout(() => root.remove(), 200); };
  const paint = () => {
    const cp = st.cp; if (!cp) { root.innerHTML = `<header class="cp67-head"><button type="button" data-cp67="close" aria-label="رجوع">›</button><h2>مساحة CP</h2><span></span></header><p class="cp67-note">${esc(st.msg || 'جاري التحميل…')}</p>`; return; }
    const pct = cp.next ? Math.min(100, Math.floor((cp.pts - cp.floor) / (cp.next - cp.floor) * 100)) : 100;
    const tasks = st.tasks.length ? st.tasks.map((t) => `<li class="cp67-task"><span class="cp67-ti">${TASK_ICON[t.id] || '💞'}</span><span class="cp67-tx"><b>${esc(t.name)}</b><small>+${nf(t.reward)} نقطة CP · ${nf(t.have)}/${nf(t.need)}</small></span>${t.claimed ? '<em class="cp67-done">تم ✓</em>' : t.have >= t.need ? `<button type="button" class="cp67-claim" data-cp67="claim" data-id="${esc(t.id)}">استلم</button>` : '<em class="cp67-go">ما خلصت</em>'}</li>`).join('') : '<p class="cp67-note">ما في مهام الحين.</p>';
    const perks = PERKS.map(([lv, n, d]) => `<li class="cp67-perk${cp.level >= lv ? ' is-open' : ''}"><span class="cp67-lv">LV${lv}</span><span class="cp67-tx"><b>${esc(n)}</b><small>${esc(d)}</small></span><em>${cp.level >= lv ? 'مفتوح' : '🔒'}</em></li>`).join('');
    root.innerHTML = `<header class="cp67-head"><button type="button" data-cp67="close" aria-label="رجوع">›</button><h2>مساحة CP</h2><span></span></header>
    <div class="cp67-scroll"><section class="cp67-hero"><div class="cp67-pair"><span class="cp67-face">${face(st.me)}</span><span class="cp67-heart">${badge(cp.level)}<b>LV${cp.level}</b></span><span class="cp67-face">${cp.partner ? face(cp.partner) : '<b>؟</b>'}</span></div>
    <p class="cp67-names"><span>${esc(st.me?.name || 'أنت')}</span><i>💞</i><span>${esc(cp.partner?.name || 'مخفي')}</span></p><p class="cp67-days">معًا منذ <b dir="ltr">${nf(cp.days)}</b> يوم · ${esc(cp.name)}</p></section>
    <section class="cp67-prog"><p>${cp.next ? `باقي <b dir="ltr">${nf(cp.next - cp.pts)}</b> نقطة للمستوى الجاي` : 'وصلتوا أعلى مستوى 👑'}</p><div class="cp67-bar"><i style="width:${pct}%"></i></div><div class="cp67-ends"><span>LV${cp.level}</span><span dir="ltr">${nf(cp.pts)}${cp.next ? ' / ' + nf(cp.next) : ''}</span><span>${cp.next ? 'LV' + (cp.level + 1) : ''}</span></div></section>
    <nav class="cp67-tabs"><button type="button" data-cp67="tab" data-tab="tasks" aria-current="${st.tab === 'tasks'}">المهام</button><button type="button" data-cp67="tab" data-tab="perks" aria-current="${st.tab === 'perks'}">الامتيازات</button></nav>
    ${st.msg ? `<p class="cp67-msg" role="status">${esc(st.msg)}</p>` : ''}
    ${st.tab === 'tasks' ? `<h3 class="cp67-h">💗 المهام اليومية 💗</h3><ul class="cp67-list">${tasks}</ul><p class="cp67-note">المهام تتجدد كل يوم. وكل 20 عملة بهدية بينكم = نقطة CP زيادة.</p>` : `<ul class="cp67-list">${perks}</ul>`}</div>`;
  };
  const load = async () => {
    const [me, tk] = await Promise.all([get('/api/cp/me'), get('/api/cp/tasks')]);
    if (!me?.ok || !me.cp) { st.msg = me?.adult === false ? 'مساحة CP لأعمار 18+ بس.' : 'ما عندك CP للحين.'; paint(); return; }
    st.cp = me.cp; st.me = me.me; st.tasks = tk?.tasks || []; paint();
  };
  root.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-cp67]'); if (!t) return; const a = t.dataset.cp67;
    if (a === 'close') return close();
    if (a === 'tab') { st.tab = t.dataset.tab; st.msg = ''; return paint(); }
    if (a === 'claim') {
      t.disabled = true;
      const r = await fetch(`/api/cp/tasks/${encodeURIComponent(t.dataset.id)}/claim`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then((x) => x.json()).catch(() => null);
      st.msg = r?.ok ? 'انضافت النقاط ✓' : (r?.error || 'تعذّر الاستلام.'); await load(); dispatchEvent(new Event('la3bak:cp'));
    }
  });
  paint(); load();
}
function scan(root = document) {
  root.querySelectorAll?.('[data-cp-me]').forEach((el) => { if (el.dataset.cpDone) return; el.dataset.cpDone = '1'; fillMe(el); });
  const m = /^(?:#)?\/u\/([A-Za-z0-9_-]{6,64})\/?$/.exec(((globalThis.__LA3BAK_NAV__ || location).hash) || location.pathname); const prof = document.querySelector('.cm-prof');
  if (m && prof && !document.querySelector('[data-cp-of]')) { const el = document.createElement('div'); el.dataset.cpOf = m[1]; prof.after(el); fillOf(el); }
}
if (typeof document !== 'undefined' && !globalThis.__LA3BAK_CP__) {
  globalThis.__LA3BAK_CP__ = true;
  // R60: نجمع التغييرات بإطار رسم واحد
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; scan(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-cp-ask]'); if (b) { e.preventDefault(); ask(b); } const sp = e.target.closest?.('[data-cp-space]'); if (sp) { e.preventDefault(); openSpace(); } }, true);
  addEventListener('la3bak:cp', () => document.querySelectorAll('[data-cp-me],[data-cp-of]').forEach((el) => (el.dataset.cpMe !== undefined ? fillMe(el) : fillOf(el))));
  scan();
}
