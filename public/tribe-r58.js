/* R58x: القبائل — بطاقة بملفك ([data-tribe-me])، شارة بملف أي لاعب، ونافذة القبيلة (قبيلتي / الترتيب / إنشاء). البيانات من الخادم بس. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number.isSafeInteger(n) ? n.toLocaleString('en-US') : '—';
const emblem = (lv, cls = '') => `<img class="tr58-emblem ${cls}" src="/assets/art58/tribe/t${Math.max(1, Math.min(4, lv | 0))}.webp?v=r58x" alt="" decoding="async">`;
const face = (p) => p?.avatar && /^\/(api|assets|preview)\//.test(p.avatar) ? `<img src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async">` : `<b>${esc([...String(p?.name || '؟')][0])}</b>`;
const api = (u, body) => fetch(u, body === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json().catch(() => ({}))).catch(() => ({ ok: false, error: 'انقطع الاتصال.' }));
const nav = () => ((globalThis.__LA3BAK_NAV__ || location).hash) || location.pathname;
const S = { tab: 'mine', view: null, me: null, top: null, msg: '', busy: false };
function bar(t) { const pct = t.next ? Math.min(100, Math.floor((t.pts - t.floor) / (t.next - t.floor) * 100)) : 100; return `<div class="tr58-bar"><i style="width:${pct}%"></i></div><p class="tr58-sub">${nf(t.pts)} نقطة${t.next ? ` · المستوى الجاي عند ${nf(t.next)}` : ' · أعلى مستوى'}</p>`; }
function detail(t) {
  const act = t.isLeader ? `<button type="button" class="tr58-btn is-danger" data-tr="disband">حل القبيلة</button>` : t.isMember ? `<button type="button" class="tr58-btn is-ghost" data-tr="leave">اطلع من القبيلة</button>` : t.requested ? `<button type="button" class="tr58-btn is-ghost" data-tr="cancel" data-id="${t.id}">إلغاء طلب الانضمام</button>` : S.me?.tribe ? '' : `<button type="button" class="tr58-btn" data-tr="join" data-id="${t.id}">اطلب الانضمام</button>`;
  const reqs = t.requests?.length ? `<h3>طلبات الانضمام (${t.requests.length})</h3><ul class="tr58-list">${t.requests.map((p) => `<li><span class="tr58-face">${face(p)}</span><b>${esc(p.name)}</b><button type="button" class="tr58-mini" data-tr="accept" data-id="${t.id}" data-user="${esc(p.id)}">قبول</button><button type="button" class="tr58-mini is-ghost" data-tr="decline" data-id="${t.id}" data-user="${esc(p.id)}">رفض</button></li>`).join('')}</ul>` : '';
  const members = `<h3>الأعضاء (${t.members}/${t.cap})</h3><ul class="tr58-list">${t.list.map((p, i) => `<li><i>${i + 1}</i><span class="tr58-face">${face(p)}</span><b><a href="#/u/${esc(p.id)}">${esc(p.name)}</a>${p.leader ? ' <em>👑 القائد</em>' : ''}</b><span dir="ltr">${nf(p.pts)} 💎</span>${t.isLeader && !p.leader ? `<button type="button" class="tr58-mini is-ghost" data-tr="kick" data-id="${t.id}" data-user="${esc(p.id)}" aria-label="طرد ${esc(p.name)}">طرد</button>` : ''}</li>`).join('')}</ul>`;
  return `<section class="tr58-detail">${emblem(t.level, 'is-big')}<h2>${esc(t.name)}</h2><p class="tr58-lv">Lv${t.level} · ${esc(t.levelName)} · نقاط الشهر <b dir="ltr">${nf(t.monthPts)}</b></p>${bar(t)}${act}${reqs}${members}<p class="tr58-note">نقاط القبيلة = قيمة الهدايا (بالجواهر) اللي يرسلها أعضاؤها. المستوى يكبّر سعة القبيلة ويغيّر شعارها.</p></section>`;
}
function body() {
  if (S.tab === 'view' && S.view) return detail(S.view);
  if (S.tab === 'top') return S.top ? (S.top.length ? `<ol class="tr58-top">${S.top.map((t, i) => `<li><button type="button" data-tr="open" data-id="${t.id}"><i>${i + 1}</i>${emblem(t.level)}<span><b>${esc(t.name)}</b><small>Lv${t.level} · ${t.members} عضو</small></span><span dir="ltr">${nf(t.monthPts)} 💎</span></button></li>`).join('')}</ol>` : '<p class="tr58-note">ما فيه قبائل للحين. كن أول من يفتح قبيلة!</p>') : '<p class="tr58-note">جاري التحميل…</p>';
  if (S.tab === 'create') { const c = S.me?.create; return S.me?.tribe ? '<p class="tr58-note">أنت عضو بقبيلة الحين.</p>' : `<section class="tr58-create">${emblem(1, 'is-big')}<p>تقدر تفتح قبيلة لما توصل غرفة تملكها ليفل <b>${c?.need ?? 10}</b>. ليفل أعلى غرفة عندك الحين: <b>${c?.roomLevel ?? 0}</b>.</p>${c?.canCreate ? `<label>اسم القبيلة<input type="text" maxlength="24" data-tr-name placeholder="مثال: فرسان الخليج"></label><button type="button" class="tr58-btn" data-tr="create">افتح القبيلة</button>` : `<div class="tr58-bar"><i style="width:${Math.min(100, (c?.roomLevel ?? 0) / (c?.need ?? 10) * 100)}%"></i></div><p class="tr58-note">ارفع ليفل غرفتك بالهدايا والدعم داخلها.</p>`}</section>`; }
  const t = S.me?.tribe; return t ? detail(t) : `<section class="tr58-create">${emblem(1, 'is-big')}<p>ما أنت عضو بأي قبيلة. شوف الترتيب واطلب الانضمام لقبيلة، أو افتح قبيلتك.</p>${S.me?.requested?.length ? `<p class="tr58-note">طلباتك المعلّقة: ${S.me.requested.map((x) => esc(x.name)).join('، ')}</p>` : ''}</section>`;
}
function paint() {
  let el = document.querySelector('.tr58-sheet'); if (!el) return;
  el.querySelector('.tr58-body').innerHTML = (S.msg ? `<p class="tr58-msg" role="status">${esc(S.msg)}</p>` : '') + body();
  el.querySelectorAll('[data-tr-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.trTab === S.tab || (S.tab === 'view' && b.dataset.trTab === 'top'))));
}
async function load() { S.me = await api('/api/tribes/me'); if (S.tab === 'top' || !S.top) S.top = (await api('/api/tribes/top')).list || []; paint(); document.querySelectorAll('[data-tribe-me]').forEach(fillMe); }
export function openTribes(tab = 'mine', id = null) {
  if (!document.querySelector('.tr58-sheet')) {
    const el = document.createElement('div'); el.className = 'tr58-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'القبائل'); el.dir = 'rtl';
    el.innerHTML = `<div class="tr58-panel"><header><h2>القبائل</h2><button type="button" class="tr58-x" data-tr="close" aria-label="إغلاق">✕</button></header><nav class="tr58-tabs" role="tablist">${[['mine', 'قبيلتي'], ['top', 'الترتيب'], ['create', 'إنشاء']].map(([k, l]) => `<button type="button" role="tab" data-tr-tab="${k}">${l}</button>`).join('')}</nav><div class="tr58-body"></div></div>`;
    document.body.appendChild(el);
  }
  S.tab = tab; S.msg = ''; paint(); load().then(async () => { if (id) { const r = await api('/api/tribes/' + id); if (r.ok) { S.view = r.tribe; S.tab = 'view'; paint(); } } });
}
async function act(b) {
  const a = b.dataset.tr, id = b.dataset.id; if (S.busy) return;
  if (a === 'close') { document.querySelector('.tr58-sheet')?.remove(); return; }
  if (a === 'open') { const r = await api('/api/tribes/' + id); if (r.ok) { S.view = r.tribe; S.tab = 'view'; S.msg = ''; paint(); } return; }
  if ((a === 'disband' && !confirm('أكيد تبي تحل القبيلة؟ كل الأعضاء بيطلعون.')) || (a === 'leave' && !confirm('أكيد تبي تطلع من القبيلة؟'))) return;
  const url = { create: '/api/tribes/create', join: `/api/tribes/${id}/join`, cancel: `/api/tribes/${id}/cancel`, accept: `/api/tribes/${id}/respond`, decline: `/api/tribes/${id}/respond`, kick: `/api/tribes/${id}/kick`, leave: '/api/tribes/leave', disband: '/api/tribes/disband' }[a]; if (!url) return;
  const payload = a === 'create' ? { name: document.querySelector('[data-tr-name]')?.value || '' } : a === 'accept' || a === 'decline' ? { user: b.dataset.user, accept: a === 'accept' } : a === 'kick' ? { user: b.dataset.user } : {};
  S.busy = true; b.disabled = true; const r = await api(url, payload); S.busy = false;
  S.msg = r.ok === false || r.error ? (r.error || 'تعذّر تنفيذ الطلب.') : ({ create: 'انفتحت قبيلتك 🎉', join: 'انرسل طلب الانضمام ✓', cancel: 'انلغى الطلب.', accept: 'انضاف العضو ✓', decline: 'انرفض الطلب.', kick: 'انطرد العضو.', leave: 'طلعت من القبيلة.', disband: 'انحلّت القبيلة.' }[a]);
  if (!(r.ok === false || r.error)) { if (a === 'create' || a === 'leave' || a === 'disband') S.tab = 'mine'; if (S.tab === 'view' && S.view) { const v = await api('/api/tribes/' + S.view.id); if (v.ok) S.view = v.tribe; else S.tab = 'mine'; } }
  S.top = null; await load();
}
async function fillMe(el) {
  const r = S.me && el.dataset.trFresh ? S.me : await api('/api/tribes/me'); if (!el.isConnected || !r?.ok || !r.eligible) { if (el.isConnected) el.innerHTML = ''; return; }
  const t = r.tribe;
  el.innerHTML = `<button type="button" class="tr58-card" data-tr-open="mine">${emblem(t ? t.level : 1)}<span><b>${t ? esc(t.name) : 'القبائل'}</b><small>${t ? `Lv${t.level} · ${esc(t.levelName)} · ${t.members} عضو${t.isLeader && t.requests.length ? ` · ${t.requests.length} طلب جديد` : ''}` : r.create?.canCreate ? 'تقدر تفتح قبيلتك الحين!' : 'انضم لقبيلة أو افتح قبيلتك'}</small></span><i aria-hidden="true">‹</i></button>`;
}
async function fillOf(el) {
  const r = await api('/api/tribes/of/' + encodeURIComponent(el.dataset.tribeOf)); if (!el.isConnected || !r?.tribe) return;
  el.innerHTML = `<button type="button" class="tr58-chip" data-tr-open="view" data-id="${r.tribe.id}">${emblem(r.tribe.level)}<span>قبيلة <b>${esc(r.tribe.name)}</b> · Lv${r.tribe.level}</span></button>`;
}
function scan() {
  document.querySelectorAll('[data-tribe-me]').forEach((el) => { if (!el.dataset.trDone) { el.dataset.trDone = '1'; fillMe(el); } });
  const m = /^(?:#)?\/u\/([A-Za-z0-9_-]{6,64})\/?$/.exec(nav()); const prof = document.querySelector('.cm-prof');
  if (m && prof && !document.querySelector('[data-tribe-of]')) { const el = document.createElement('div'); el.dataset.tribeOf = m[1]; el.className = 'tr58-of'; prof.after(el); fillOf(el); }
}
if (typeof document !== 'undefined' && !globalThis.__LA3BAK_TRIBE__) {
  globalThis.__LA3BAK_TRIBE__ = true;
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', (e) => {
    const o = e.target.closest?.('[data-tr-open]'); if (o) { e.preventDefault(); openTribes(o.dataset.trOpen === 'view' ? 'mine' : o.dataset.trOpen, o.dataset.id || null); return; }
    const t = e.target.closest?.('[data-tr-tab]'); if (t) { S.tab = t.dataset.trTab; S.msg = ''; paint(); if (S.tab === 'top') load(); return; }
    const b = e.target.closest?.('.tr58-sheet [data-tr]'); if (b) { e.preventDefault(); act(b); }
  }, true);
  addEventListener('la3bak:tribe', () => { document.querySelectorAll('[data-tribe-me]').forEach(fillMe); if (document.querySelector('.tr58-sheet')) load(); });
  scan();
}
