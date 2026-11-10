// R67ae: لوحة الإدارة — المباشر + ملف اللاعب الكامل + رسالة للاعب + الفعاليات + دخول الإدارة (المالك فقط)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const p2 = (n) => String(n).padStart(2, '0');
const dt = (ms) => { if (!ms) return ''; const d = new Date(Number(ms) + 4 * 3600_000); return `<span dir="ltr">${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}</span>`; };
const localInput = (ms) => { const d = new Date(ms + 4 * 3600_000); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
const fromInput = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - 4 * 3600_000 : NaN; };
const SLOTS = { frame: 'الإطارات', bg: 'خلفيات الملف', 'chat-bubble': 'الفقاعات', board: 'اللوحات', 'mic-frame': 'إطارات المايك', souvenir: 'التذكارات', title: 'الألقاب', badge: 'الشارات', 'room-bg': 'خلفيات الغرف', 'special-id': 'الأيدي المميز', 'room-id': 'أيدي الغرف' };
const key = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

export function mountLiveAdmin(root, { call }) {
  if (!document.querySelector('style[data-la67]')) { const st = document.createElement('style'); st.dataset.la67 = '1'; st.textContent = '[data-live-admin]{min-width:0;max-width:100%;overflow-wrap:anywhere}.la67-row{display:grid;gap:3px;padding:9px 12px;border:1px solid #ffffff1a;border-radius:12px;background:#ffffff08;margin:6px 0;font-size:13px}.la67-row small{color:#b9a8d0}.la67-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;margin:6px 0}.la67-kv dt{color:#b9a8d0}.la67-kv dd{margin:0}.la67-p{border:1px solid #d8b56b55;border-radius:16px;padding:12px;margin:10px 0;background:#ffffff06}.la67-p h3{margin:0 0 6px}.la67-on{color:#4ade80}.la67-bad{color:#ff8a8a}'; document.head.appendChild(st); }
  const S = { live: null, players: null, q: '', events: null, logins: null, msgTo: null, err: '', msg: '', busy: false };
  const loadLive = async () => { try { S.live = await call('live'); } catch (e) { S.err = e.message; } };
  const loadEvents = async () => { try { S.events = await call('events'); } catch (e) { S.err = e.message; } };
  const loadLogins = async () => { try { S.logins = (await call('admin-logins')).list; } catch (e) { S.err = e.message; } };
  const evRow = (e, now) => { const st = e.ended ? 'انتهت مبكر' : now < e.startsAt ? 'قادمة' : now < e.endsAt ? '🟢 شغالة' : 'خلصت'; return `<div class="la67-row"><b>${e.kind === 'daily2x' ? '🎉 ضعف المكافأة اليومية' : `🏷️ خصم ${nf(e.percent)}% على ${esc(SLOTS[e.slot] ?? e.slot)}`}</b><small>${st} · من ${dt(e.startsAt)} إلى ${dt(e.endsAt)} · ${esc(e.by)}</small>${!e.ended && now < e.endsAt ? `<div><button class="ad-btn ghost" data-la="ev-end" data-id="${esc(e.id)}">إنهاء الحين</button></div>` : ''}</div>`; };
  const pcard = (p) => `<div class="la67-p"><h3>${esc(p.name)} ${p.online ? '<small class="la67-on">● متصل</small>' : ''} ${p.ban ? '<small class="la67-bad">⛔ محظور</small>' : ''}</h3>
    <dl class="la67-kv"><dt>رقم اللاعب</dt><dd dir="ltr">${esc(p.displayId)}</dd><dt>من</dt><dd>${dt(p.since)}</dd><dt>الرتب</dt><dd>Lv ${esc(p.level)}${p.vip ? ' · ' + esc(p.vip) : ''}${p.noble ? ' · ' + esc(p.noble) : ''}</dd>
    <dt>الرصيد</dt><dd>${nf(p.coins + p.gems * 20)} عملة</dd><dt>اللعب</dt><dd>${nf(p.played)} مباراة · ${nf(p.wins)} فوز</dd>
    <dt>هدايا أرسلها</dt><dd>${nf(p.giftsSent.count)} · ${nf(p.giftsSent.value)} عملة</dd><dt>هدايا وصلته</dt><dd>${nf(p.giftsRecv.count)} · ${nf(p.giftsRecv.value)} عملة</dd>
    <dt>القبيلة</dt><dd>${p.tribe ? esc(p.tribe.name) + (p.tribe.leader ? ' (القائد)' : '') : '—'}</dd><dt>CP</dt><dd>${p.cp ? `${esc(p.cp.partner)} · ${nf(p.cp.pts)} نقطة` : '—'}</dd>
    <dt>غرفه</dt><dd>${p.rooms.length ? p.rooms.map((r) => `${esc(r.name)} (Lv ${r.level})`).join('، ') : '—'}</dd><dt>المقتنيات</dt><dd>${nf(p.owned)}</dd>
    <dt>بلاغات عليه</dt><dd>${nf(p.reports.total)} (مفتوحة ${nf(p.reports.open)} · انحذف ${nf(p.reports.removed)})</dd>${p.ban ? `<dt>سبب الحظر</dt><dd>${esc(p.ban.reason)}</dd>` : ''}</dl>
    ${S.msgTo === p.id ? `<form data-laf="msg" data-id="${esc(p.id)}" class="ad-form col"><input class="ad-in" name="title" placeholder="العنوان" maxlength="100" required minlength="3"><textarea class="ad-in" name="body" rows="3" placeholder="الرسالة" maxlength="2000" required minlength="3"></textarea><button class="ad-btn" type="submit">إرسال</button></form>` : `<button class="ad-btn ghost" data-la="msg-open" data-id="${esc(p.id)}">✉️ رسالة لهذا اللاعب</button>${p.twofa ? ` <button class="ad-btn ghost" type="button" data-la="tf-reset" data-id="${esc(p.id)}" data-name="${esc(p.name)}">🔐 فك التحقق بخطوتين</button>` : ''}`}</div>`;
  function paint() {
    if (!root.isConnected) return;
    const L = S.live, now = S.events?.now ?? Date.now();
    root.innerHTML = `${S.err ? `<div class="ad-note bad" role="alert">${esc(S.err)}</div>` : ''}${S.msg ? `<div class="ad-note ok">${esc(S.msg)}</div>` : ''}
    <section class="ad-card"><h2>🟢 المباشر الحين <button class="ad-btn ghost" data-la="live-refresh">تحديث</button></h2>
      ${L ? `<div class="ad-grid"><div class="ad-stat"><b>${nf(L.online)}</b><span>لاعب متصل</span></div><div class="ad-stat"><b>${nf(L.inRooms)}</b><span>داخل الغرف</span></div><div class="ad-stat"><b>${nf(L.rooms.length)}</b><span>غرفة فيها ناس</span></div></div>
      ${L.rooms.map((r) => `<div class="la67-row"><b>${esc(r.name)} · Lv ${nf(r.level)}</b><small>${nf(r.members)} داخلها · المالك ${esc(r.owner)}${r.video ? ' · 🎬 فيديو' : ''}</small><div><a class="ad-btn ghost" href="#/social-room/${encodeURIComponent(r.id)}">افتح الغرفة</a></div></div>`).join('') || '<p class="ad-empty">ما فيه أحد بالغرف الحين.</p>'}
      <p class="ad-muted">«افتح الغرفة» يدخلك بحسابك العادي، فالموجودين بيشوفونك.</p>` : '<p class="ad-muted">جاري التحميل…</p>'}</section>
    <section class="ad-card"><h2>👤 ملف اللاعب الكامل</h2>
      <form data-laf="p" class="ad-form"><input class="ad-in" name="q" value="${esc(S.q)}" placeholder="اسم اللاعب أو رقمه" required minlength="2"><button class="ad-btn" type="submit">بحث</button></form>
      ${S.players ? (S.players.length ? S.players.map(pcard).join('') : '<p class="ad-empty">ما لقينا لاعب.</p>') : ''}</section>
    <section class="ad-card"><h2>🎉 فعاليات بوقت محدد</h2><p class="ad-muted">تبدأ وتخلص بروحها، بتوقيت الإمارات. الخصم ما يمس القطع اللي عليها عرض خاص، ولا القطع المجانية.</p>
      <form data-laf="ev" class="ad-form col"><select class="ad-in" name="kind"><option value="daily2x">ضعف المكافأة اليومية</option><option value="slotSale">خصم على قسم كامل بالمتجر</option></select>
        <label>القسم (للخصم)<select class="ad-in" name="slot">${Object.entries(SLOTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label>نسبة الخصم %<input class="ad-in" name="percent" type="number" min="5" max="90" step="1" value="20"></label>
        <label>يبدأ<input class="ad-in" name="start" type="datetime-local" value="${localInput(Date.now() + 60_000)}" required></label>
        <label>المدة (ساعات)<input class="ad-in" name="hours" type="number" min="1" max="336" step="1" value="48" required></label>
        <input class="ad-in" name="reason" placeholder="السبب (إلزامي)" maxlength="200" required minlength="3"><button class="ad-btn" type="submit">إضافة الفعالية</button></form>
      ${S.events ? (S.events.events.length ? S.events.events.slice(0, 30).map((e) => evRow(e, now)).join('') : '<p class="ad-empty">ما فيه فعاليات.</p>') : ''}</section>
    <section class="ad-card"><h2>🔐 دخول لوحة التحكم</h2><p class="ad-muted">كل جهاز أو شبكة جديدة تدخل اللوحة تنسجل هنا، ويوصل تنبيه لحسابات المالك. ينمسح السجل لو انعاد تشغيل الخادم.</p>
      ${S.logins ? (S.logins.length ? S.logins.map((l) => `<div class="la67-row"><b>${esc(l.actor)}</b><small>${dt(l.at)} · ${esc(l.device)} · شبكة <span dir="ltr">${esc(l.net)}</span></small></div>`).join('') : '<p class="ad-empty">ما فيه.</p>') : ''}</section>`;
  }
  const run = async (fn, ok) => { if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; try { const j = await fn(); S.msg = ok + (j?.auditOk === false ? ' (تنبيه: ما انسجل بالتدقيق)' : ''); } catch (e) { S.err = e.message || 'فشل الطلب.'; } finally { S.busy = false; paint(); } };
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-la]'); if (!b) return;
    if (b.dataset.la === 'live-refresh') { await loadLive(); paint(); }
    if (b.dataset.la === 'tf-reset') { if (window.confirm(`فك التحقق بخطوتين عن «${b.dataset.name}»؟\nسوّه بس بعد ما تتأكد إن الحساب حقه.`)) run(async () => { const j = await call('2fa-reset', { method: 'POST', body: { id: b.dataset.id } }); const r = await call('player-360?q=' + encodeURIComponent(S.q)); S.players = r.players; return j; }, 'تم فك التحقق بخطوتين ✅'); return; }
    if (b.dataset.la === 'msg-open') { S.msgTo = b.dataset.id; paint(); root.querySelector('[data-laf="msg"] [name=title]')?.focus(); }
    if (b.dataset.la === 'ev-end') { const r = window.prompt('إنهاء الفعالية الحين؟\n\nاكتب السبب (إلزامي):'); if (r && r.trim().length >= 3) run(async () => { const j = await call('events', { method: 'POST', body: { op: 'end', id: b.dataset.id, reason: r.trim() } }); await loadEvents(); return j; }, 'انتهت الفعالية.'); }
  });
  root.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-laf]'); if (!f) return; e.preventDefault(); const g = (n) => f.querySelector(`[name=${n}]`)?.value ?? '';
    if (f.dataset.laf === 'p') { S.q = g('q').trim(); S.msgTo = null; run(async () => { const j = await call('player-360?q=' + encodeURIComponent(S.q)); S.players = j.players; return j; }, ''); return; }
    if (f.dataset.laf === 'msg') { const id = f.dataset.id; run(async () => { const j = await call('message', { method: 'POST', body: { id, title: g('title').trim(), body: g('body').trim(), key: key() } }); S.msgTo = null; return j; }, 'انرسلت الرسالة، وبتوصله بالإشعارات.'); return; }
    if (f.dataset.laf === 'ev') { const startsAt = fromInput(g('start')); run(async () => { const j = await call('events', { method: 'POST', body: { kind: g('kind'), slot: g('slot'), percent: Number(g('percent')), startsAt, hours: Number(g('hours')), reason: g('reason').trim() } }); await loadEvents(); return j; }, 'انضافت الفعالية.'); }
  });
  paint(); Promise.all([loadLive(), loadEvents(), loadLogins()]).then(paint);
  return { dispose() {} };
}
