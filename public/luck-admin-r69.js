// R69: لوحة الإدارة — ألعاب الحظ (كم دخل وكم طلع، الجاكبوت، الفوز الكبير، تشغيل/إيقاف) + التحويلات بين الحسابات (ظرف الحظ والتشجيع).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const p2 = (n) => String(n).padStart(2, '0');
const dt = (ms) => { if (!ms) return ''; const d = new Date(Number(ms) + 4 * 3600_000); return `<span dir="ltr">${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}</span>`; };
const net = (c) => c.in - c.out; // ربح الموقع
const pct = (c) => (c.in ? Math.round((c.out / c.in) * 1000) / 10 : 0);
export function mountLuckAdmin(root, { call, openLog }) {
  if (!document.querySelector('style[data-lk69]')) { const st = document.createElement('style'); st.dataset.lk69 = '1'; st.textContent = '[data-luck-admin]{min-width:0;max-width:100%;overflow-wrap:anywhere}.lk69-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.lk69-c{border:1px solid #a86bff44;border-radius:14px;padding:12px;background:#ffffff08}.lk69-c h3{margin:0 0 6px;font-size:15px;display:flex;justify-content:space-between;align-items:center;gap:6px}.lk69-c dl{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:0;font-size:13px}.lk69-c dd{margin:0;text-align:left;direction:ltr;font-weight:800}.lk69-pos{color:#4be38a}.lk69-neg{color:#ff6b85}.lk69-off{color:#ff6b85;font-weight:900}.lk69-on{color:#4be38a;font-weight:900}.lk69-row{display:grid;gap:2px;padding:8px 10px;border-bottom:1px solid #ffffff14;font-size:13px}.lk69-row b{font-size:14px}.lk69-flag{border-inline-start:3px solid #ff6b85;background:#ff6b8512}.lk69-t{width:100%;border-collapse:collapse;font-size:12.5px}.lk69-t td,.lk69-t th{padding:5px 6px;border-bottom:1px solid #ffffff12;text-align:right}.lk69-t td.n{direction:ltr;text-align:left}'; document.head.append(st); }
  const S = { d: null, err: '', msg: '', busy: false };
  const load = async () => { try { S.d = await call('luck'); S.err = ''; } catch (e) { S.err = e.message || 'تعذّر التحميل.'; } paint(); };
  const box = (title, c, extra = '') => `<div class="lk69-c"><h3>${title}</h3><dl><dt>دخل (رهانات)</dt><dd>${nf(c.in)}</dd><dt>طلع (فوز)</dt><dd>${nf(c.out)}</dd><dt>ربح الموقع</dt><dd class="${net(c) >= 0 ? 'lk69-pos' : 'lk69-neg'}">${nf(net(c))}</dd><dt>نسبة الرجوع</dt><dd>${pct(c)}%</dd><dt>عدد</dt><dd>${nf(c.n)}</dd>${extra}</dl></div>`;
  function paint() {
    if (!root.isConnected) return;
    const d = S.d; const C = d?.casino, X = d?.xfer;
    root.innerHTML = `${S.err ? `<div class="ad-note bad" role="alert">${esc(S.err)}</div>` : ''}${S.msg ? `<div class="ad-note ok" role="status">${esc(S.msg)}</div>` : ''}
    <section class="ad-card"><h2>🔔 التنبيهات الفورية</h2><p class="ad-muted">توصل على طول لحسابات المالك بالإشعارات: فوز كبير، تحويلات مشبوهة بين حسابين، أو لاعب انبلّغ عليه من 3 أشخاص أو أكثر خلال 24 ساعة.</p>
      ${d?.alerts ? (d.alerts.length ? d.alerts.slice(0, 30).map((a) => `<div class="lk69-row ${a.kind === 'big' ? '' : 'lk69-flag'}"><b>${esc(a.title)}</b><small>${dt(a.at)} · ${esc(a.text)}</small></div>`).join('') : '<p class="ad-empty">ما فيه تنبيهات للحين 👍</p>') : '<p class="ad-muted">جاري التحميل…</p>'}</section>
    <section class="ad-card"><h2>🎰 ألعاب الحظ <button class="ad-btn ghost" type="button" data-lk="reload">تحديث</button></h2>
    ${C ? `<div class="lk69-g">
      <div class="lk69-c"><h3>جاكبوت لعبك <span class="${C.off.slot ? 'lk69-off' : 'lk69-on'}">${C.off.slot ? '⛔ موقفة' : '🟢 شغالة'}</span></h3><dl><dt>الجاكبوت الحين</dt><dd>${nf(C.jackpot)}</dd></dl><button class="ad-btn ${C.off.slot ? '' : 'danger'}" type="button" data-lk="toggle" data-game="slot" data-off="${C.off.slot ? '0' : '1'}">${C.off.slot ? 'شغّلها' : 'أوقفها'}</button></div>
      <div class="lk69-c"><h3>عجلة الأكل <span class="${C.off.food ? 'lk69-off' : 'lk69-on'}">${C.off.food ? '⛔ موقفة' : '🟢 شغالة'}</span></h3><dl><dt>الجولة</dt><dd>${nf(C.round)}</dd></dl><button class="ad-btn ${C.off.food ? '' : 'danger'}" type="button" data-lk="toggle" data-game="food" data-off="${C.off.food ? '0' : '1'}">${C.off.food ? 'شغّلها' : 'أوقفها'}</button></div></div>
      <h3 style="margin:14px 0 8px">اليوم</h3><div class="lk69-g">${box('🎰 السلوت', C.today.slot)}${box('🍗 العجلة', C.today.food)}<div class="lk69-c"><h3>🎁 صناديق العجلة</h3><dl><dt>مكافآت اليوم</dt><dd>${nf(C.today.chest)}</dd><dt>المجموع</dt><dd>${nf(C.total.chest)}</dd></dl></div></div>
      <h3 style="margin:14px 0 8px">من البداية</h3><div class="lk69-g">${box('🎰 السلوت', C.total.slot)}${box('🍗 العجلة', C.total.food)}</div>
      ${C.days.length ? `<h3 style="margin:14px 0 8px">آخر الأيام (ربح الموقع)</h3><table class="lk69-t"><tr><th>اليوم</th><th>السلوت</th><th>العجلة</th><th>الصناديق</th></tr>${C.days.map((x) => `<tr><td>${esc(x.d)}</td><td class="n ${net(x.slot) >= 0 ? 'lk69-pos' : 'lk69-neg'}">${nf(net(x.slot))}</td><td class="n ${net(x.food) >= 0 ? 'lk69-pos' : 'lk69-neg'}">${nf(net(x.food))}</td><td class="n">${nf(x.chest)}</td></tr>`).join('')}</table>` : ''}
      <h3 style="margin:14px 0 8px">🏆 الفوز الكبير</h3>${C.big.length ? C.big.map((b) => `<div class="lk69-row"><b>${esc(b.name)} — ${b.game === 'slot' ? 'السلوت' : 'العجلة'}</b><small>${dt(b.at)} · راهن ${nf(b.bet)} وفاز <b>${nf(b.win)}</b> (×${b.bet ? Math.round(b.win / b.bet) : '—'})</small></div>`).join('') : '<p class="ad-empty">ما فيه فوز كبير للحين.</p>'}
      <p class="ad-muted">«الفوز الكبير» = 50 ألف أو أكثر، أو 20 ضعف الرهان.</p>` : '<p class="ad-muted">جاري التحميل…</p>'}</section>
    <section class="ad-card"><h2>🔁 التحويلات بين الحسابات (آخر 7 أيام)</h2>
    ${X ? `<p class="ad-muted">ظرف الحظ والتشجيع بالعملات ينقلون عملات من حساب لحساب. نعلّم أي حسابين تكرر التحويل بينهم ${X.rule.count} مرات أو أكثر، أو مجموعه ${nf(X.rule.sum)} أو أكثر. مجموع التحويلات: <b>${nf(X.total7d)}</b>.</p>
      <h3 style="margin:10px 0 6px">⚠️ أزواج مشبوهة (${X.flagged.length})</h3>${X.flagged.length ? X.flagged.map((p) => `<div class="lk69-row lk69-flag"><b>${esc(p.from)} ← ${esc(p.to)}</b><small>${nf(p.n)} مرة · ${nf(p.sum)} عملة · ${p.kinds.map((k) => (k === 'env' ? 'ظرف' : 'تشجيع')).join(' + ')} · آخرها ${dt(p.last)}</small><div><button class="ad-btn ghost" type="button" data-lk="log" data-q="${esc(p.toId)}">سجل المستلم</button> <button class="ad-btn ghost" type="button" data-lk="log" data-q="${esc(p.fromId)}">سجل المرسل</button></div></div>`).join('') : '<p class="ad-empty">ما فيه شي مشبوه 👍</p>'}
      <h3 style="margin:14px 0 6px">أكثر المستلمين</h3>${X.top.length ? `<table class="lk69-t"><tr><th>اللاعب</th><th>المبلغ</th><th>مرات</th><th>من كم حساب</th></tr>${X.top.map((t) => `<tr><td>${esc(t.name)}</td><td class="n">${nf(t.sum)}</td><td class="n">${nf(t.n)}</td><td class="n">${nf(t.senders)}</td></tr>`).join('')}</table>` : '<p class="ad-empty">ما فيه تحويلات.</p>'}
      <h3 style="margin:14px 0 6px">آخر التحويلات</h3>${X.recent.length ? X.recent.map((x) => `<div class="lk69-row"><small>${dt(x.at)} · ${x.kind === 'env' ? '🧧 ظرف' : '👏 تشجيع'} · ${esc(x.from)} ← ${esc(x.to)} · <b>${nf(x.amt)}</b></small></div>`).join('') : '<p class="ad-empty">ما فيه.</p>'}` : '<p class="ad-muted">جاري التحميل…</p>'}</section>`;
  }
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-lk]'); if (!b || S.busy) return;
    if (b.dataset.lk === 'reload') return load();
    if (b.dataset.lk === 'log') { openLog?.(b.dataset.q); return; }
    if (b.dataset.lk === 'toggle') {
      const off = b.dataset.off === '1'; if (off && !window.confirm('توقف اللعبة؟ اللاعبين ما بيقدرون يلعبون فيها لين تشغلها.')) return;
      S.busy = true; S.err = ''; S.msg = ''; try { const j = await call('luck/toggle', { method: 'POST', body: { game: b.dataset.game, off } }); S.d = { ...S.d, casino: j.casino }; S.msg = off ? 'وقفناها ⛔' : 'شغلناها 🟢'; } catch (er) { S.err = er.message || 'فشل.'; } S.busy = false; paint();
    }
  });
  paint(); load();
}
