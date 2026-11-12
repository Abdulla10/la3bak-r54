// R123: الشحن — المالك يشحن «عملات مشحونة» للاعب بعد ما يدفع له (رابط Ziina / تحويل)، ويضبط الباقات والحد.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const dt = (t) => t ? new Date(t + 4 * 3600_000).toISOString().slice(0, 16).replace('T', ' ') : '';
export function mountRecharge(root, { call }) {
  if (!document.querySelector('style[data-rc123a]')) { const st = document.createElement('style'); st.dataset.rc123a = '1'; st.textContent = `.rc123a{display:grid;gap:12px}.rc123a .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.rc123a .row>*{flex:1 1 120px;min-width:0}
.rc123a .who{padding:12px;border-radius:14px;background:#ffffff0d;border:1px solid #f5c54266;display:grid;gap:8px}.rc123a .quick{display:flex;gap:6px;flex-wrap:wrap}.rc123a .quick button{flex:1 1 90px}
.rc123a .ok{color:#5be08f;font-weight:800}.rc123a .err{color:#ff7d8c;font-weight:800}.rc123a .li{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;background:#ffffff08;font-size:13px}
.rc123a .pk{display:grid;grid-template-columns:1fr 1fr 2fr;gap:6px}`; document.head.append(st); }
  const S = { d: null, q: '', err: '', msg: '', busy: false };
  const load = async () => { try { S.d = await call('recharge' + (S.q ? '?q=' + encodeURIComponent(S.q) : '')); if (S.d.notFound) S.err = 'ما لقيت اللاعب.'; } catch (e) { S.err = e.message; } paint(); };
  const paint = () => {
    const d = S.d; if (!d) { root.innerHTML = '<p class="ad-muted">جاري التحميل…</p>'; return; }
    const f = d.found, c = d.cfg;
    root.innerHTML = `<div class="rc123a"><section class="ad-card"><h2>💳 شحن لاعب</h2><p class="ad-muted">بعد ما يوصلك الدفع (Ziina أو تحويل) اكتب آيدي اللاعب واشحن له. العملات المشحونة بس تشتري الأشياء الغالية.</p>
      <form data-rc="find" class="row"><input class="ad-in" name="q" placeholder="آيدي اللاعب أو اسمه" value="${esc(S.q)}" required><button class="ad-btn" type="submit" style="flex:0 0 auto">بحث</button></form>
      ${S.err ? `<p class="err">${esc(S.err)}</p>` : ''}${S.msg ? `<p class="ok">${esc(S.msg)}</p>` : ''}
      ${f ? `<div class="who"><b>${esc(f.name)} <small dir="ltr">#${esc(f.displayId)}</small></b><small>الرصيد: ${nf(f.coins)} 🪙 — منها مشحونة: ${nf(f.paid)} 💳</small>
        <div class="quick">${c.packs.map((p) => `<button type="button" class="ad-btn" data-rc-amt="${p.coins}"${S.busy ? ' disabled' : ''}>+${nf(p.coins)} (${nf(p.aed)} د)</button>`).join('')}</div>
        <form data-rc="credit" class="row"><input class="ad-in" name="coins" type="number" min="1000" placeholder="مبلغ ثاني" dir="ltr"><input class="ad-in" name="note" placeholder="ملاحظة (مثل رقم الإيصال)" maxlength="120"><button class="ad-btn" type="submit" style="flex:0 0 auto"${S.busy ? ' disabled' : ''}>اشحن</button></form></div>` : ''}</section>
      <section class="ad-card"><h2>⚙️ إعدادات الشحن</h2><form data-rc="cfg" class="ad-form col">
        <label>الأشياء اللي سعرها من كذا وفوق (بالسعر الأصلي) تصير بالمشحون بس<input class="ad-in" name="threshold" type="number" value="${c.threshold}" dir="ltr"></label>
        <label>سعرها يتقسم على<input class="ad-in" name="divisor" type="number" min="1" max="100" value="${c.divisor}" dir="ltr"></label>
        <label>رقم الواتساب لاستلام الإيصالات (مع رمز الدولة)<input class="ad-in" name="whatsapp" placeholder="9715xxxxxxxx" value="${esc(c.whatsapp)}" dir="ltr"></label>
        <b>الباقات (العملات — السعر بالدرهم — رابط Ziina)</b>
        ${c.packs.map((p, i) => `<div class="pk"><input class="ad-in" name="c${i}" type="number" value="${p.coins}" dir="ltr"><input class="ad-in" name="a${i}" type="number" step="0.01" value="${p.aed}" dir="ltr"><input class="ad-in" name="l${i}" placeholder="https://pay.ziina.com/..." value="${esc(p.link)}" dir="ltr"></div>`).join('')}
        <button class="ad-btn" type="submit">حفظ الإعدادات</button></form></section>
      <section class="ad-card"><h2>آخر الشحنات</h2>${d.log.length ? d.log.map((l) => `<div class="li"><span>${esc(l.name)} <small dir="ltr">#${esc(l.displayId)}</small>${l.note ? ` — ${esc(l.note)}` : ''}</span><b>+${nf(l.coins)} 💳</b><small>${esc(dt(l.at))} · ${esc(l.by)}</small></div>`).join('') : '<p class="ad-muted">ما فيه شحنات للحين.</p>'}</section></div>`;
  };
  const credit = async (coins, note) => {
    if (!S.d?.found || S.busy) return; if (!confirm(`تشحن ${nf(coins)} عملة مشحونة لـ ${S.d.found.name}؟`)) return;
    S.busy = true; S.err = ''; S.msg = ''; paint();
    try { await call('recharge/credit', { method: 'POST', body: { player: S.d.found.id, coins, note, key: crypto.randomUUID() } }); S.msg = `تم ✅ انشحن ${nf(coins)} 💳`; } catch (e) { S.err = e.message; }
    S.busy = false; await load();
  };
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-rc-amt]'); if (b) credit(Number(b.dataset.rcAmt), ''); });
  root.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-rc]'); if (!f) return; e.preventDefault();
    if (f.dataset.rc === 'find') { S.q = f.q.value.trim(); S.err = ''; S.msg = ''; return load(); }
    if (f.dataset.rc === 'credit') return credit(Number(f.coins.value), f.note.value.trim());
    if (f.dataset.rc === 'cfg') {
      const packs = S.d.cfg.packs.map((p, i) => ({ id: p.id, coins: Number(f['c' + i].value), aed: Number(f['a' + i].value), link: f['l' + i].value.trim() }));
      try { await call('recharge/config', { method: 'POST', body: { threshold: Number(f.threshold.value), divisor: Number(f.divisor.value), whatsapp: f.whatsapp.value.trim(), packs } }); S.msg = 'تم ✅ انحفظت الإعدادات.'; S.err = ''; } catch (er) { S.err = er.message; }
      return load();
    }
  });
  paint(); load();
}
