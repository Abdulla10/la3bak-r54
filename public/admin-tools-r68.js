// R68y: لوحة التحكم — (8) الحسابات المشبوهة، (9) التحكم بالألعاب، (10) سجل اللاعب. المالك فقط.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const ago = (t) => { if (!t) return '—'; const s = Math.max(0, (Date.now() - t) / 1000); if (s < 60) return 'الحين'; if (s < 3600) return `قبل ${Math.floor(s / 60)} د`; if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`; return `قبل ${Math.floor(s / 86400)} يوم`; };
const when = (t) => t ? new Date(t).toLocaleString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const ask = (q) => { const r = prompt(q); return r && r.trim().length >= 3 ? r.trim() : null; };
const CSS = `.at68 .ad-card{margin-bottom:12px}.at68-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.at68-row:last-child{border-bottom:0}.at68-p{display:flex;flex-direction:column;min-width:0;flex:1}.at68-p b{font-size:14px}.at68-p small{opacity:.7;font-size:12px}
.at68-tag{font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(155,92,255,.18);color:#d6bcff}.at68-tag.bad{background:rgba(255,80,100,.18);color:#ff9aa8}.at68-tag.gold{background:rgba(255,196,60,.16);color:#ffd36b}
.at68-btns{display:flex;gap:6px}.at68-btns .ad-btn{padding:6px 10px;font-size:12px;min-height:0}.at68-grp{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:10px;margin:8px 0}
.at68-games{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.at68-g{display:flex;align-items:center;gap:8px;padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);cursor:pointer}
.at68-g.off{opacity:.5;border-color:rgba(255,80,100,.4)}.at68-g i{font-style:normal;font-size:22px}.at68-g b{flex:1;font-size:13px}.at68-g em{font-style:normal;font-size:11px}
.at68-chips{display:flex;flex-wrap:wrap;gap:6px}.at68-chips label{display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:99px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);font-size:13px}
.at68-tl{list-style:none;margin:0;padding:0}.at68-tl li{display:grid;grid-template-columns:26px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}
.at68-tl li small{display:block;opacity:.6;font-size:11px}.at68-tl .plus{color:#7be0a0}.at68-tl .minus{color:#ff9aa8}.at68-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin:8px 0}
.at68-stats div{background:rgba(255,255,255,.04);border-radius:12px;padding:8px;text-align:center}.at68-stats b{display:block;font-size:15px}.at68-stats small{opacity:.7;font-size:11px}
.at68-filter{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.at68-filter button{padding:5px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.12);background:transparent;color:inherit;font-size:12px}.at68-filter button.on{background:#7b3cff;border-color:#7b3cff}`;
function style() { if (!document.querySelector('style[data-at68]')) { const s = document.createElement('style'); s.dataset.at68 = '1'; s.textContent = CSS; document.head.append(s); } }
function shell(root, S, body) {
  root.innerHTML = `<div class="at68">${S.err ? `<div class="ad-note bad" role="alert">${esc(S.err)}</div>` : ''}${S.msg ? `<div class="ad-note ok" role="status">${esc(S.msg)}</div>` : ''}${body}</div>`;
}
const who = (p, extra = '') => `<div class="at68-p"><b>${esc(p.name)} ${p.banned ? '<span class="at68-tag bad">محظور</span>' : ''}${p.suspect ? ' <span class="at68-tag gold">مشتبه</span>' : ''}</b><small>#${esc(p.displayId || '—')}${p.phone ? ' · 📱 موثّق' : ''} · ${p.since ? 'سجّل ' + ago(p.since) : ''} · 🪙 ${nf(p.coins)}${extra}</small></div>`;
const acts = (p, self = false) => `<div class="at68-btns">${self ? '' : `<button class="ad-btn ghost" type="button" data-at="log" data-q="${esc(p.displayId || p.id)}">السجل</button>`}${p.suspect ? `<button class="ad-btn ghost" type="button" data-at="clear" data-id="${esc(p.id)}">مو مشبوه</button>` : ''}${p.banned ? '' : `<button class="ad-btn danger" type="button" data-at="ban" data-id="${esc(p.id)}" data-n="${esc(p.name)}">حظر</button>`}</div>`;

/* ---------------- (8) الحسابات المشبوهة ---------------- */
export function mountSuspicious(root, { call, openLog }) {
  style();
  const S = { d: null, err: '', msg: '', busy: false };
  const load = async () => { S.err = ''; try { S.d = await call('suspicious'); } catch (e) { S.err = e.message; } paint(); };
  function paint() {
    if (!root.isConnected) return;
    if (!S.d) return shell(root, S, '<p class="ad-muted">جاري الفحص…</p>');
    const d = S.d;
    const net = d.net.length ? d.net.map((g) => `<div class="at68-grp"><div class="at68-row"><b>🌐 شبكة ${esc(g.ref)}</b><span class="at68-tag">${g.count} حسابات</span>${g.bannedHere ? '<span class="at68-tag bad">فيها حساب محظور</span>' : ''}<small class="ad-muted">آخر نشاط ${ago(g.last)}</small></div>${g.players.map((p) => `<div class="at68-row">${who(p)}${acts(p)}</div>`).join('')}</div>`).join('') : '<p class="ad-muted">ما فيه شبكات عليها 3 حسابات أو أكثر.</p>';
    const ev = d.evasion.length ? d.evasion.map((p) => `<div class="at68-row">${who(p, ` · يشبه المحظور «${esc(p.of)}»`)}${acts(p)}</div>`).join('') : '<p class="ad-muted">ما فيه.</p>';
    const fu = d.funnel.length ? d.funnel.map((f) => `<div class="at68-grp"><div class="at68-row">${who(f.player, ` · استلم ${nf(f.value)} 🪙 بـ ${f.count} هدية`)}${f.young ? '<span class="at68-tag gold">حساب جديد</span>' : ''}${acts(f.player)}</div><div class="at68-row"><small class="ad-muted">${f.share}% منها من:</small>${who(f.top)}${acts(f.top)}</div></div>`).join('') : '<p class="ad-muted">ما فيه.</p>';
    const tr = d.transfers.length ? d.transfers.map((t) => `<div class="at68-grp"><div class="at68-row"><span class="at68-tag gold">${nf(t.value)} 🪙 آخر 24 ساعة</span><small class="ad-muted">${t.count} عملية</small></div>${t.from ? `<div class="at68-row"><small>من</small>${who(t.from)}${acts(t.from)}</div>` : ''}<div class="at68-row"><small>إلى</small>${who(t.to)}${acts(t.to)}</div></div>`).join('') : '<p class="ad-muted">ما فيه.</p>';
    shell(root, S, `<section class="ad-card"><h2>🕵️ الحسابات المشبوهة</h2><p class="ad-muted">إشارات للمراجعة بس — ما ينحظر أحد تلقائي. الشبكات المشتركة (جوال، مقهى، بيت) ممكن تطلع هني عادي. <button class="ad-btn ghost" type="button" data-at="reload">🔄 فحص من جديد</button></p>
      <div class="at68-stats"><div><b>${d.net.length}</b><small>شبكات مشتركة</small></div><div><b>${d.evasion.length}</b><small>تهرّب من حظر</small></div><div><b>${d.funnel.length}</b><small>تجميع هدايا</small></div><div><b>${d.transfers.length}</b><small>تحويلات كبيرة</small></div></div></section>
      <section class="ad-card"><h2>🚫 حسابات تشبه حساب محظور</h2>${ev}</section>
      <section class="ad-card"><h2>🎁 حساب يجمع هدايا من شخص واحد (آخر 7 أيام)</h2>${fu}</section>
      <section class="ad-card"><h2>💸 تحويلات وهدايا كبيرة بين شخصين (آخر 24 ساعة)</h2>${tr}</section>
      <section class="ad-card"><h2>🌐 حسابات كثيرة من نفس الشبكة</h2>${net}</section>`);
  }
  const run = async (fn, ok) => { if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; try { await fn(); S.msg = ok; await load(); } catch (e) { S.err = e.message; paint(); } finally { S.busy = false; } };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-at]'); if (!b) return; const a = b.dataset.at;
    if (a === 'reload') { S.d = null; paint(); load(); }
    if (a === 'log') openLog?.(b.dataset.q);
    if (a === 'clear') run(() => call(`players/${b.dataset.id}/clear-suspect`, { method: 'POST', body: {} }), 'انشال الاشتباه.');
    if (a === 'ban') { const r = ask(`حظر «${b.dataset.n}»؟ اكتب السبب:`); if (r) run(() => call(`players/${b.dataset.id}/ban`, { method: 'POST', body: { reason: r } }), 'انحظر الحساب وطلع من الموقع.'); }
  });
  paint(); load();
}

/* ---------------- (9) التحكم بالألعاب ---------------- */
export function mountGamesControl(root, { call }) {
  style();
  const S = { d: null, err: '', msg: '', busy: false, off: new Set(), stakes: new Set(), bonus: 0 };
  const load = async () => { try { S.d = await call('games-control'); S.off = new Set(S.d.games.filter((g) => g.off).map((g) => g.id)); S.stakes = new Set(S.d.stakes); S.bonus = S.d.prizeBonus; } catch (e) { S.err = e.message; } paint(); };
  function paint() {
    if (!root.isConnected) return;
    if (!S.d) return shell(root, S, '<p class="ad-muted">جاري التحميل…</p>');
    const d = S.d; const changed = [...S.off].sort().join() !== d.games.filter((g) => g.off).map((g) => g.id).sort().join() || [...S.stakes].sort((a, b) => a - b).join() !== d.stakes.join() || S.bonus !== d.prizeBonus;
    const ex = (s) => { const n = [...S.stakes].filter((x) => x > 0)[0] || 100; return `مثال: رسم ${nf(n)} بين 4 لاعبين = الفائز ياخذ ${nf(n * 4 + Math.floor(n * 4 * s / 100))} 🪙`; };
    shell(root, S, `<section class="ad-card"><h2>🎮 تشغيل وإقفال الألعاب</h2><p class="ad-muted">اضغط على اللعبة عشان تقفلها أو تفتحها. اللعبة المقفلة تطلع «قريباً» وما أحد يقدر يبدأ مباراة جديدة فيها (المباريات الشغالة تكمل).</p>
      <div class="at68-games">${d.games.map((g) => { const off = S.off.has(g.id); return `<button type="button" class="at68-g${off ? ' off' : ''}" data-at="g" data-id="${esc(g.id)}" aria-pressed="${!off}"><i>${esc(g.icon)}</i><b>${esc(g.name)}</b><em>${off ? '🔴 مقفلة' : '🟢 شغالة'}</em></button>`; }).join('')}</div></section>
      <section class="ad-card"><h2>🪙 رسوم الدخول</h2><p class="ad-muted">اختر الرسوم اللي تطلع للاعبين بصفحة كل لعبة. «مجانية» دايم موجودة.${d.paidDisabled ? ' <b>تنبيه: الألعاب المدفوعة موقفة من إعدادات الخادم حاليًا.</b>' : ''}</p>
      <div class="at68-chips">${d.options.map((v) => `<label><input type="checkbox" data-at="s" value="${v}" ${S.stakes.has(v) ? 'checked' : ''} ${v === 0 ? 'disabled' : ''}> ${v ? nf(v) + ' 🪙' : 'مجانية'}</label>`).join('')}</div></section>
      <section class="ad-card"><h2>🏆 جائزة الفوز</h2><p class="ad-muted">الفائز ياخذ كل الرسوم اللي دفعوها اللاعبين. تقدر تضيف مكافأة فوقها من الموقع:</p>
      <div class="at68-chips">${[0, 10, 25, 50, 100].map((v) => `<label><input type="radio" name="bonus" data-at="b" value="${v}" ${S.bonus === v ? 'checked' : ''}> ${v ? '+' + v + '%' : 'بدون إضافة'}</label>`).join('')}</div><p class="ad-muted">${ex(S.bonus)}</p></section>
      <section class="ad-card"><button class="ad-btn" type="button" data-at="save" ${!changed || S.busy ? 'disabled' : ''}>${S.busy ? 'جاري الحفظ…' : 'حفظ التغييرات'}</button> ${changed ? '<small class="ad-muted">فيه تغييرات ما انحفظت</small>' : ''}</section>`);
  }
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-at]'); if (!b) return; const a = b.dataset.at;
    if (a === 'g') { const id = b.dataset.id; S.off.has(id) ? S.off.delete(id) : S.off.add(id); S.msg = ''; paint(); }
    if (a === 'save') {
      const reason = ask('سبب التعديل؟ (ينحفظ بسجل الإدارة)'); if (!reason || S.busy) return;
      S.busy = true; S.err = ''; S.msg = ''; paint();
      try { await call('games-control', { method: 'POST', body: { gamesOff: [...S.off], stakes: [...S.stakes].sort((x, y) => x - y), prizeBonus: S.bonus, reason } }); S.msg = 'انحفظت إعدادات الألعاب.'; await load(); } catch (er) { S.err = er.message; } finally { S.busy = false; paint(); }
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target; if (t.dataset.at === 's') { const v = Number(t.value); t.checked ? S.stakes.add(v) : S.stakes.delete(v); S.stakes.add(0); paint(); }
    if (t.dataset.at === 'b') { S.bonus = Number(t.value); paint(); }
  });
  paint(); load();
}

/* ---------------- (10) سجل اللاعب الكامل ---------------- */
const ICON = { login: '🔑', room: '🚪', game: '🎮', buy: '🛍️', coin: '🪙', 'gift-out': '🎁', 'gift-in': '💝', report: '🚩', ban: '⛔' };
const FILTERS = [['all', 'الكل'], ['login', 'الدخول'], ['room', 'الغرف'], ['game', 'المباريات'], ['buy', 'المشتريات'], ['gift-out', 'هدايا أرسلها'], ['gift-in', 'هدايا استلمها'], ['coin', 'العملات'], ['report', 'البلاغات']];
export function mountPlayerLog(root, { call, q: q0 = '' }) {
  style();
  const S = { q: q0, d: null, err: '', msg: '', busy: false, f: 'all' };
  const load = async () => { if (S.q.trim().length < 2) return; S.busy = true; S.err = ''; paint(); try { S.d = await call('player-log?q=' + encodeURIComponent(S.q.trim())); } catch (e) { S.err = e.message; S.d = null; } finally { S.busy = false; paint(); } };
  function paint() {
    if (!root.isConnected) return;
    const form = `<section class="ad-card"><h2>📜 سجل اللاعب</h2><form data-at="find" class="ad-form"><input class="ad-in" name="q" placeholder="رقم اللاعب أو اسمه" value="${esc(S.q)}" inputmode="search"><button class="ad-btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'جاري البحث…' : 'عرض السجل'}</button></form></section>`;
    let body = '';
    const d = S.d;
    if (d && !d.player) body = d.matches.length ? `<section class="ad-card"><h2>اختر اللاعب</h2>${d.matches.map((p) => `<div class="at68-row">${who(p)}<div class="at68-btns"><button class="ad-btn ghost" type="button" data-at="pick" data-q="${esc(p.displayId || p.id)}">السجل</button></div></div>`).join('')}</section>` : '<section class="ad-card"><p class="ad-muted">ما لقيت لاعب بهذا الرقم أو الاسم.</p></section>';
    if (d?.player) {
      const p = d.player; const tl = p.timeline.filter((x) => S.f === 'all' || x.k === S.f);
      body = `<section class="ad-card"><div class="at68-row">${who(p, ` · ${p.online ? '🟢 متصل الحين' : 'آخر ظهور ' + ago(p.lastSeen)}`)}${acts(p, true)}</div>
        ${p.ban ? `<div class="ad-note bad">محظور ${when(p.ban.at)}: ${esc(p.ban.reason)} <button class="ad-btn ghost" type="button" data-at="unban" data-id="${esc(p.id)}">رفع الحظر</button></div>` : ''}
        <div class="at68-stats"><div><b>${esc(p.level)}</b><small>الليفل</small></div><div><b>${esc(p.vip || '—')}</b><small>VIP</small></div><div><b>${nf(p.coins)}</b><small>عملات</small></div><div><b>${nf(p.played)}</b><small>مباريات</small></div><div><b>${nf(p.wins)}</b><small>فوز</small></div><div><b>${p.reportsCount.total}</b><small>بلاغات ضده</small></div><div><b>${p.rooms?.length ?? 0}</b><small>غرف يملكها</small></div><div><b>${p.sameNet.length}</b><small>حسابات بنفس شبكته</small></div></div>
        ${p.sameNet.length ? `<details><summary>حسابات بنفس الشبكة (${p.sameNet.length})</summary>${p.sameNet.map((x) => `<div class="at68-row">${who(x)}${acts(x)}</div>`).join('')}</details>` : ''}</section>
        ${p.replays?.length ? `<section class="ad-card"><h2>🎬 إعادة آخر مبارياته</h2>${p.replays.map((r) => `<div class="at68-row"><div class="at68-p"><b>${esc(r.gameName)}</b><small>${when(r.at)} · ${esc(r.players.map((x) => x.name).join('، '))} · ${r.frames} لقطة</small></div><div class="at68-btns"><button class="ad-btn ghost" type="button" data-at="replay" data-ref="${esc(r.ref)}">▶ شاهد</button></div></div>`).join('')}</section>` : ''}
        <section class="ad-card"><h2>🕒 كل شي سواه (${tl.length})</h2><div class="at68-filter">${FILTERS.map(([k, l]) => `<button type="button" data-at="f" data-k="${k}" class="${S.f === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${tl.length ? `<ul class="at68-tl">${tl.map((x) => `<li><span>${ICON[x.k] || '•'}</span><div>${esc(x.text)}<small>${when(x.t)}</small></div>${x.delta ? `<b dir="ltr" class="${x.delta > 0 ? 'plus' : 'minus'}">${x.delta > 0 ? '+' : ''}${nf(x.delta)} ${x.cur === 'gems' ? '💎' : '🪙'}</b>` : '<span></span>'}</li>`).join('')}</ul>` : '<p class="ad-muted">ما فيه شي هني.</p>'}</section>`;
    }
    shell(root, S, form + body);
    if (!S.q) root.querySelector('input[name=q]')?.focus();
  }
  const run = async (fn, ok) => { if (S.busy) return; S.err = ''; S.msg = ''; try { await fn(); S.msg = ok; } catch (e) { S.err = e.message; } await load(); };
  root.addEventListener('submit', (e) => { if (!e.target.closest('[data-at="find"]')) return; e.preventDefault(); S.q = e.target.querySelector('[name=q]').value; S.f = 'all'; load(); });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-at]'); if (!b || b.tagName === 'FORM') return; const a = b.dataset.at;
    if (a === 'f') { S.f = b.dataset.k; paint(); }
    if (a === 'replay') { b.disabled = true; call('replay?ref=' + encodeURIComponent(b.dataset.ref)).then((r) => import('./replay-r68.js?v=r68z').then((M) => M.openReplay(r.replay))).catch((er) => { S.err = er.message; paint(); }).finally(() => { b.disabled = false; }); }
    if (a === 'pick' || a === 'log') { S.q = b.dataset.q; S.f = 'all'; load(); }
    if (a === 'clear') run(() => call(`players/${b.dataset.id}/clear-suspect`, { method: 'POST', body: {} }), 'انشال الاشتباه.');
    if (a === 'ban') { const r = ask(`حظر «${b.dataset.n}»؟ اكتب السبب:`); if (r) run(() => call(`players/${b.dataset.id}/ban`, { method: 'POST', body: { reason: r } }), 'انحظر الحساب.'); }
    if (a === 'unban' && confirm('رفع الحظر عن هذا اللاعب؟')) run(() => call(`players/${b.dataset.id}/unban`, { method: 'POST', body: {} }), 'انرفع الحظر.');
  });
  paint(); if (S.q) load();
}
