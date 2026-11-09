/* R58x: القبائل — بطاقة بملفك ([data-tribe-me])، شارة بملف أي لاعب، ونافذة القبيلة (قبيلتي / الترتيب / إنشاء). البيانات من الخادم بس. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number.isSafeInteger(n) ? n.toLocaleString('en-US') : '—';
const emblem = (lv, cls = '') => `<img class="tr58-emblem ${cls}" src="/assets/art58/tribe/t${Math.max(1, Math.min(4, lv | 0))}.webp?v=r58x" alt="" decoding="async">`;
const face = (p) => p?.avatar && /^\/(api|assets|preview)\//.test(p.avatar) ? `<img src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async">` : `<b>${esc([...String(p?.name || '؟')][0])}</b>`;
const api = (u, body) => fetch(u, body === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json().catch(() => ({}))).catch(() => ({ ok: false, error: 'انقطع الاتصال.' }));
const nav = () => ((globalThis.__LA3BAK_NAV__ || location).hash) || location.pathname;
const S = { tab: 'mine', view: null, me: null, top: null, msg: '', busy: false, tr: null, trTab: 'tasks', shopTab: 'shop' };
const ship = (cls = '') => `<img class="tr59-ship ${cls}" src="/assets/art58/rocket/ship.webp?v=r59t" alt="" decoding="async">`;
function bar(t) { const pct = t.next ? Math.min(100, Math.floor((t.pts - t.floor) / (t.next - t.floor) * 100)) : 100; return `<div class="tr58-bar"><i style="width:${pct}%"></i></div><p class="tr58-sub">${nf(t.pts)} نقطة${t.next ? ` · المستوى الجاي عند ${nf(t.next)}` : ' · أعلى مستوى'}</p>`; }
function detail(t) {
  const act = t.isLeader ? `<button type="button" class="tr58-btn is-danger" data-tr="disband">حل القبيلة</button>` : t.isMember ? `<button type="button" class="tr58-btn is-ghost" data-tr="leave">اطلع من القبيلة</button>` : t.requested ? `<button type="button" class="tr58-btn is-ghost" data-tr="cancel" data-id="${t.id}">إلغاء طلب الانضمام</button>` : S.me?.tribe ? '' : `<button type="button" class="tr58-btn" data-tr="join" data-id="${t.id}">اطلب الانضمام</button>`;
  const reqs = t.requests?.length ? `<h3>طلبات الانضمام (${t.requests.length})</h3><ul class="tr58-list">${t.requests.map((p) => `<li><span class="tr58-face">${face(p)}</span><b>${esc(p.name)}</b><button type="button" class="tr58-mini" data-tr="accept" data-id="${t.id}" data-user="${esc(p.id)}">قبول</button><button type="button" class="tr58-mini is-ghost" data-tr="decline" data-id="${t.id}" data-user="${esc(p.id)}">رفض</button></li>`).join('')}</ul>` : '';
  const members = `<h3>الأعضاء (${t.members}/${t.cap})</h3><ul class="tr58-list">${t.list.map((p, i) => `<li><i>${i + 1}</i><span class="tr58-face">${face(p)}</span><b><a href="#/u/${esc(p.id)}">${esc(p.name)}</a>${p.leader ? ' <em>👑 القائد</em>' : ''}</b><span dir="ltr">${nf(p.pts)} 🏆</span>${t.isLeader && !p.leader ? `<button type="button" class="tr58-mini is-ghost" data-tr="kick" data-id="${t.id}" data-user="${esc(p.id)}" aria-label="طرد ${esc(p.name)}">طرد</button>` : ''}</li>`).join('')}</ul>`;
  return `<section class="tr58-detail">${emblem(t.level, 'is-big')}<h2>${esc(t.name)}</h2><p class="tr58-lv">Lv${t.level} · ${esc(t.levelName)} · نقاط الشهر <b dir="ltr">${nf(t.monthPts)}</b></p>${bar(t)}${act}${reqs}${members}<p class="tr58-note">نقاط القبيلة = قيمة الهدايا (كل 20 عملة = نقطة) اللي يرسلها أعضاؤها. المستوى يكبّر سعة القبيلة ويغيّر شعارها.</p></section>`;
}

/* R59: صفحة القبيلة الرئيسية (مثل الفيديو) وصفحة «كنز القبيلة» (الصاروخ، المهام، المكافأة، المتجر). كل الأرقام من الخادم. */
function short(n) { return !Number.isSafeInteger(n) ? '—' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'm' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }
/* R62: حرب القبائل الأسبوعية */
function warCard(w, myName) {
  if (!w) return '';
  const last = w.last ? `<p class="wr62-last">${w.last.draw ? '🤝 الأسبوع اللي طاف: تعادل' : w.last.won ? '🏆 الأسبوع اللي طاف: فزتوا' : '😔 الأسبوع اللي طاف: خسرتوا'} ضد «${esc(w.last.opponentName || '؟')}» (<b dir="ltr">${short(w.last.mine)}</b> ضد <b dir="ltr">${short(w.last.theirs)}</b>)</p>` : '';
  if (w.opponent === null) return `<h3 class="tr59-h">⚔️ حرب القبائل</h3><div class="wr62"><p class="wr62-none">ما فيه خصم لقبيلتكم هالأسبوع. الحرب تبدأ كل سبت، وتحتاج القبيلة ${esc(w.prize?.minMembers ?? 2)} أعضاء أو أكثر.</p>${last}</div>`;
  const total = Math.max(1, w.mine + w.theirs), pct = Math.round(w.mine / total * 100), lead = w.mine === w.theirs ? 'متعادلين' : w.mine > w.theirs ? 'متقدمين 🔥' : 'متأخرين — شدّوا حيلكم!';
  return `<h3 class="tr59-h">⚔️ حرب القبائل هالأسبوع</h3><div class="wr62"><div class="wr62-vs"><div><b>${esc(myName)}</b><span dir="ltr">🏆 ${short(w.mine)}</span></div><i>VS</i><div><b>${esc(w.opponentName || '؟')}</b><span dir="ltr">🏆 ${short(w.theirs)}</span></div></div>
    <div class="wr62-bar"><i style="width:${pct}%"></i></div><p class="wr62-lead">${lead}</p>
    <p class="wr62-rule">النتيجة = هيبة القبيلة هالأسبوع (من هدايا الأعضاء). القبيلة الفايزة كل عضو فيها ياخذ <b dir="ltr">${esc(w.prize?.win ?? 0)}</b> وقود، والتعادل <b dir="ltr">${esc(w.prize?.draw ?? 0)}</b>. تنتهي ليلة الجمعة.</p>${last}</div>`;
}
function home(t) {
  const tr = S.tr?.ok ? S.tr : null, info = tr?.tribe;
  const need = t.next ? Math.max(0, t.next - t.pts) : 0, pct = t.next ? Math.min(100, Math.floor((t.pts - t.floor) / (t.next - t.floor) * 100)) : 100;
  const room = info?.room ? `<h3 class="tr59-h">غرفة القبيلة</h3><a class="tr59-room" href="#/social-room/${esc(info.room.id)}"><span class="tr59-room-ic">🏠</span><span><b>${esc(info.room.name)}</b><small>Lv${esc(info.room.level)} · ${esc(info.room.members)} حاضر · ID ${esc(info.room.code)}</small></span><i>‹</i></a>` : '';
  const act = t.isLeader ? `<button type="button" class="tr58-btn is-danger" data-tr="disband">حل القبيلة</button>` : `<button type="button" class="tr58-btn is-ghost" data-tr="leave">اطلع من القبيلة</button>`;
  const reqs = t.requests?.length ? `<h3 class="tr59-h">طلبات الانضمام (${t.requests.length})</h3><ul class="tr58-list">${t.requests.map((p) => `<li><span class="tr58-face">${face(p)}</span><b>${esc(p.name)}</b><button type="button" class="tr58-mini" data-tr="accept" data-id="${t.id}" data-user="${esc(p.id)}">قبول</button><button type="button" class="tr58-mini is-ghost" data-tr="decline" data-id="${t.id}" data-user="${esc(p.id)}">رفض</button></li>`).join('')}</ul>` : '';
  const members = `<h3 class="tr59-h">أعضاء القبيلة <small dir="ltr">${t.members}/${t.cap}</small></h3><div class="tr59-faces">${t.list.slice(0, 8).map((p) => `<a href="#/u/${esc(p.id)}" class="tr58-face" title="${esc(p.name)}">${face(p)}</a>`).join('')}</div><ul class="tr58-list">${t.list.map((p, i) => `<li><i>${i + 1}</i><span class="tr58-face">${face(p)}</span><b><a href="#/u/${esc(p.id)}">${esc(p.name)}</a>${p.leader ? ' <em>👑 القائد</em>' : ''}</b><span dir="ltr">${nf(p.pts)}</span>${t.isLeader && !p.leader ? `<button type="button" class="tr58-mini is-ghost" data-tr="kick" data-id="${t.id}" data-user="${esc(p.id)}">طرد</button>` : ''}</li>`).join('')}</ul>`;
  return `<section class="tr59-home"><div class="tr59-hero">${emblem(t.level, 'is-hero')}<span class="tr59-lvchip">Lv${t.level} · ${esc(t.levelName)}</span><p class="tr59-idrow"><span>معرّف القبيلة: <b dir="ltr">${esc(t.id)}</b></span>${info ? `<span>إنشاء <b>${esc(info.createdDays)}</b> يوم</span>` : ''}</p>
  <div class="tr59-card"><h2>${esc(t.name)}</h2><div class="tr59-pres"><div><small>الهيبة اليومية</small><b dir="ltr">🏆 ${short(info?.dayPts ?? 0)}</b></div><div><small>الهيبة الأسبوعية</small><b dir="ltr">🏆 ${short(info?.weekPts ?? 0)}</b></div></div>
  <div class="tr58-bar"><i style="width:${pct}%"></i></div><p class="tr59-up">${t.next ? `باقي <b dir="ltr">${nf(need)}</b> نقطة للترقية إلى مستوى ${t.level + 1}` : 'أعلى مستوى للقبيلة 👑'}</p></div></div>
  <div class="tr59-actions"><button type="button" class="tr59-act is-group" disabled title="قريبًا"><span>💬</span><b>مجموعة القبيلة</b><small>قريبًا</small></button><button type="button" class="tr59-act is-task" data-tr="treasure">${ship('is-mini')}<b>المهمة والمكافأة</b></button></div>
  ${warCard(tr?.war, t.name)}${room}<h3 class="tr59-h">إشعارات القبيلة</h3><p class="tr58-note">${t.isLeader && t.requests?.length ? `عندك ${t.requests.length} طلب انضمام جديد` : 'لا يوجد إشعار'}</p>${reqs}${members}${act}</section>`;
}
function treasure() {
  const r = S.tr; if (!r) return '<p class="tr58-note">جاري التحميل…</p>'; if (!r.ok) return `<p class="tr58-note">${esc(r.error || 'تعذّر تحميل كنز القبيلة.')}</p>`;
  const t = r.tribe, k = r.rocket;
  const tasks = r.tasks.map((x) => `<li><div><b>${esc(x.title)}</b><small><span>⛽ +${nf(x.fuel)}</span>${x.prestige ? `<span>🏆 +${nf(x.prestige)}</span>` : ''}${x.wealth ? `<span>💰 +${nf(x.wealth)}</span>` : ''}</small></div>${x.auto ? `<a class="tr59-go" href="${x.id === 'shop' ? '#/shop' : t.room ? '#/social-room/' + esc(t.room.id) : '#/social'}">اذهب إلى</a>` : x.done ? '<span class="tr59-done">التحديث غدًا</span>' : `<button type="button" class="tr59-go" data-tr="task" data-id="${x.id}">${x.id === 'checkin' ? 'سجّل' : 'استلم'}</button>`}</li>`).join('');
  const boxes = r.boxes.map((b) => `<li class="${b.open ? 'is-open' : ''}"><span class="tr59-box">🎁</span><div><b>صندوق وقود Lv.${b.level}</b><small>يفتح لكل الأعضاء لما توصل هيبة القبيلة الأسبوعية <b dir="ltr">${nf(b.need)}</b> · فيه ⛽ ${nf(b.fuel)}</small></div>${b.claimed ? '<span class="tr59-done">استلمته ✓</span>' : b.open ? `<button type="button" class="tr59-go" data-tr="box" data-id="${b.level}">استلم</button>` : '<span class="tr59-lock">🔒</span>'}</li>`).join('');
  const bagN = (id) => r.me.bag?.[id] || 0;
  const shop = S.shopTab === 'bag' ? (Object.keys(r.me.bag || {}).length ? `<div class="tr59-grid">${r.shop.filter((x) => x.kind === 'bag' && bagN(x.id)).map((x) => `<div class="tr59-item"><span class="tr59-item-art">🎒</span><b>${esc(x.name)}</b><small>×${bagN(x.id)} · ⛽ ${nf(x.fuel)}</small><button type="button" class="tr59-go" data-tr="sendbag" data-id="${x.id}">أرسل وقود</button></div>`).join('')}</div><p class="tr58-note">الحقيبة تتوزع بالتساوي على كل أعضاء القبيلة غيرك.</p>` : '<p class="tr58-note">حقيبة القبيلة فاضية.</p>')
    : `<div class="tr59-grid">${r.shop.map((x) => `<div class="tr59-item"><span class="tr59-item-art">${x.kind === 'coins' ? '🪙' : '🎒'}</span><b>${esc(x.name)}</b><small>${x.kind === 'coins' ? `+${nf(x.coins)} عملة` : `فيها ⛽ ${nf(x.fuel)}`}</small><button type="button" class="tr59-go" data-tr="buy" data-id="${x.id}">⛽ ${nf(x.price)}</button></div>`).join('')}</div>`;
  const last = k.launches.length ? `<ul class="tr59-launches">${k.launches.slice().reverse().map((l) => `<li><b>🚀 ${esc(l.n)} · ${esc(l.planet)}</b><span>${l.winners.map((w) => `${['🥇', '🥈', '🥉'][w.rank - 1]} ${esc(w.name)}`).join(' · ')}${l.luck ? ` · 🍀 ${esc(l.luck.name)}` : ''}</span></li>`).join('')}</ul>` : '';
  return `<section class="tr59-tr"><div class="tr59-trhead"><button type="button" class="tr59-back" data-tr="home" aria-label="رجوع">›</button><h2>مخزن كنز القبيلة</h2></div>
  <div class="tr59-tcard">${emblem(t.level)}<span><b>${esc(t.name)}</b><small>Lv${t.level} · ${esc(t.levelName)}</small></span><span class="tr59-wealth"><b dir="ltr">💰 ${nf(t.wealth)}</b><small>ثروة القبيلة</small></span></div>
  <div class="tr59-rocket"><span class="tr59-count">🚀 ${nf(k.count)}</span>${ship('is-hero')}<h3>صاروخ القبيلة</h3><p>باقي <b dir="ltr">${nf(k.toNext)}</b> هيبة أسبوعية لصاروخ واحد · الوجهة: كوكب ${esc(k.nextPlanet.name)}</p><div class="tr58-bar"><i style="width:${Math.min(100, Math.floor((k.per - k.toNext) / k.per * 100))}%"></i></div>${last}</div>
  <nav class="tr59-tabs" role="tablist">${[['tasks', 'المهام'], ['reward', 'المكافأة'], ['shop', 'المتجر']].map(([id, n]) => `<button type="button" role="tab" data-tr="trtab" data-id="${id}" aria-selected="${S.trTab === id}">${n}</button>`).join('')}</nav>
  <div class="tr59-pane">${S.trTab === 'tasks' ? `<h4>المهمة اليومية</h4><ul class="tr59-tasks">${tasks}</ul>` : S.trTab === 'reward' ? `<p class="tr59-mine">🏆 هيبتي الأسبوعية <b dir="ltr">${nf(r.me.weekPts)}</b> · هيبة القبيلة هالأسبوع <b dir="ltr">${nf(t.weekPts)}</b></p><ul class="tr59-boxes">${boxes}</ul>` : `<nav class="tr59-sub">${[['shop', 'متجر القبيلة'], ['bag', 'حقيبة القبيلة']].map(([id, n]) => `<button type="button" data-tr="shoptab" data-id="${id}" aria-pressed="${S.shopTab === id}">${n}</button>`).join('')}</nav>${shop}`}</div>
  <footer class="tr59-bal"><span dir="ltr">⛽ ${nf(r.me.fuel)}</span><span dir="ltr">🪙 ${nf(r.me.coins)}</span></footer></section>`;
}
function body() {
  if (S.tab === 'treasure') return treasure();
  if (S.tab === 'view' && S.view) return detail(S.view);
  if (S.tab === 'top') return S.top ? (S.top.length ? `<ol class="tr58-top">${S.top.map((t, i) => `<li><button type="button" data-tr="open" data-id="${t.id}"><i>${i + 1}</i>${emblem(t.level)}<span><b>${esc(t.name)}</b><small>Lv${t.level} · ${t.members} عضو</small></span><span dir="ltr">${nf(t.monthPts)} 🏆</span></button></li>`).join('')}</ol>` : '<p class="tr58-note">ما فيه قبائل للحين. كن أول من يفتح قبيلة!</p>') : '<p class="tr58-note">جاري التحميل…</p>';
  if (S.tab === 'create') { const c = S.me?.create; return S.me?.tribe ? '<p class="tr58-note">أنت عضو بقبيلة الحين.</p>' : `<section class="tr58-create">${emblem(1, 'is-big')}<p>تقدر تفتح قبيلة لما توصل غرفة تملكها ليفل <b>${c?.need ?? 10}</b>. ليفل أعلى غرفة عندك الحين: <b>${c?.roomLevel ?? 0}</b>.</p>${c?.canCreate ? `<label>اسم القبيلة<input type="text" maxlength="24" data-tr-name placeholder="مثال: فرسان الخليج"></label><button type="button" class="tr58-btn" data-tr="create">افتح القبيلة</button>` : `<div class="tr58-bar"><i style="width:${Math.min(100, (c?.roomLevel ?? 0) / (c?.need ?? 10) * 100)}%"></i></div><p class="tr58-note">ارفع ليفل غرفتك بالهدايا والدعم داخلها.</p>`}</section>`; }
  const t = S.me?.tribe; return t ? (t.isMember ? home(t) : detail(t)) : `<section class="tr58-create">${emblem(1, 'is-big')}<p>ما أنت عضو بأي قبيلة. شوف الترتيب واطلب الانضمام لقبيلة، أو افتح قبيلتك.</p>${S.me?.requested?.length ? `<p class="tr58-note">طلباتك المعلّقة: ${S.me.requested.map((x) => esc(x.name)).join('، ')}</p>` : ''}</section>`;
}
function paint() {
  let el = document.querySelector('.tr58-sheet'); if (!el) return;
  el.querySelector('.tr58-body').innerHTML = (S.msg ? `<p class="tr58-msg" role="status">${esc(S.msg)}</p>` : '') + body();
  el.querySelectorAll('[data-tr-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.trTab === S.tab || (S.tab === 'view' && b.dataset.trTab === 'top'))));
}
async function load() { S.me = await api('/api/tribes/me'); if (S.me?.tribe) S.tr = await api('/api/tribes/treasure'); if (S.tab === 'top' || !S.top) S.top = (await api('/api/tribes/top')).list || []; paint(); document.querySelectorAll('[data-tribe-me]').forEach(fillMe); }
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
  if (a === 'treasure') { S.tab = 'treasure'; S.msg = ''; paint(); S.tr = await api('/api/tribes/treasure'); paint(); return; }
  if (a === 'home') { S.tab = 'mine'; S.msg = ''; paint(); return; }
  if (a === 'trtab') { S.trTab = id; paint(); return; }
  if (a === 'shoptab') { S.shopTab = id; paint(); return; }
  if (['task', 'box', 'buy', 'sendbag'].includes(a)) {
    const u = { task: '/api/tribes/treasure/task', box: '/api/tribes/treasure/box', buy: '/api/tribes/treasure/buy', sendbag: '/api/tribes/treasure/send-bag' }[a];
    const pl = a === 'task' ? { id } : a === 'box' ? { level: Number(id) } : a === 'buy' ? { item: id } : { bag: id };
    S.busy = true; b.disabled = true; const r = await api(u, pl); S.busy = false;
    if (r.ok) { S.tr = r; S.msg = { task: 'تم ✓ انضاف الوقود والهيبة', box: 'استلمت صندوق الوقود ✓', buy: 'تم الشراء ✓', sendbag: `انرسل الوقود ✓ كل عضو أخذ ⛽ ${nf(r.sent)}` }[a]; } else S.msg = r.error || 'تعذّر تنفيذ الطلب.';
    paint(); return;
  }
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
  // R60: نجمع التغييرات بإطار رسم واحد (كان يفحص الصفحة كاملة مع كل تغيير، وهذا يثقّل الجوال)
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; scan(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', (e) => {
    const o = e.target.closest?.('[data-tr-open]'); if (o) { e.preventDefault(); openTribes(o.dataset.trOpen === 'view' ? 'mine' : o.dataset.trOpen, o.dataset.id || null); return; }
    const t = e.target.closest?.('[data-tr-tab]'); if (t) { S.tab = t.dataset.trTab; S.msg = ''; paint(); if (S.tab === 'top') load(); return; }
    const b = e.target.closest?.('.tr58-sheet [data-tr]'); if (b) { e.preventDefault(); act(b); }
  }, true);
  // R59: لما تنتقل لصفحة ثانية (مثل غرفة القبيلة أو المتجر من «اذهب إلى») تتسكر نافذة القبيلة
  addEventListener('hashchange', () => { document.querySelector('.tr58-sheet')?.remove(); });
  addEventListener('la3bak:tribe', () => { document.querySelectorAll('[data-tribe-me]').forEach(fillMe); if (document.querySelector('.tr58-sheet')) load(); });
  scan();
}
