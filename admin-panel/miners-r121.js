// R122: المناجم اشتراك شهري — المالك يعطي منجم لشهر، ويغيّر سعر الاشتراك والتعدين اليومي.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const day = (t) => t ? new Date(t + 4 * 3600_000).toISOString().slice(0, 10) : '';
const COL = { 1: '#9fb3c8', 2: '#4fc3ff', 3: '#ffc83d' };
export function mountMiners(root, { call }) {
  if (!document.querySelector('style[data-mn121a]')) { const st = document.createElement('style'); st.dataset.mn121a = '1'; st.textContent = `
.mn121a{display:grid;gap:12px}.mn121a .tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.mn121a .tier{padding:12px;border-radius:16px;background:#ffffff0a;border:1.5px solid var(--c);display:grid;gap:6px}.mn121a .tier h3{margin:0;color:var(--c);font-size:17px}
.mn121a .tier ul{margin:0;padding-inline-start:18px;display:grid;gap:3px;font-size:13px}.mn121a .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.mn121a .pick{display:flex;gap:6px;flex-wrap:wrap}.mn121a .pick button{flex:1 1 70px;padding:10px;border-radius:12px;border:1.5px solid #ffffff2e;background:#ffffff10;color:#fff;font-weight:900;cursor:pointer}
.mn121a .pick button.on{border-color:var(--c,#a86bff);background:color-mix(in srgb,var(--c,#a86bff) 30%,transparent)}
.mn121a .who{padding:12px;border-radius:14px;background:#ffffff0d;border:1px solid #a86bff55;display:grid;gap:8px}
.mn121a .ok{color:#5be08f;font-weight:800}.mn121a .err{color:#ff7d8c;font-weight:800}.mn121a .li{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;background:#ffffff08}`; document.head.append(st); }
  const S = { d: null, q: '', err: '', msg: '', busy: false };
  const load = async (q = S.q) => { try { S.d = await call('miners' + (q ? '?q=' + encodeURIComponent(q) : '')); S.err = S.d.notFound ? 'ما لقيت اللاعب. اكتب الآيدي أو الاسم بالضبط.' : ''; } catch (e) { S.err = e.message; } paint(); };
  const paint = () => {
    const d = S.d; if (!d) { root.innerHTML = '<p class="ad-muted">جاري التحميل…</p>'; return; }
    const f = d.found;
    root.innerHTML = `<div class="mn121a"><section class="ad-card"><h2>⛏️ المناجم</h2><p class="ad-muted">المنجم اشتراك شهري: اللاعب يشتريه بالعملات من ملفه، ويخلص بعد 30 يوم ويرجع يشترك. هنا تقدر تعطيه شهر مجاناً أو تشيله، وتغيّر الأسعار.</p>
      <div class="tiers">${[1, 2, 3].map((l) => `<div class="tier" style="--c:${COL[l]}"><h3>⛏️ ${esc(d.tiers[l].name)}</h3><ul>${d.tiers[l].perks.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><form data-mn="cfg" data-l="${l}" class="ad-form col"><label>سعر الاشتراك الشهري (عملة)<input class="ad-in" name="price" type="number" min="1000" value="${d.tiers[l].price}" dir="ltr"></label><label>التعدين اليومي (عملة)<input class="ad-in" name="daily" type="number" min="0" value="${d.tiers[l].daily}" dir="ltr"></label><button class="ad-btn" type="submit">حفظ</button></form></div>`).join('')}</div></section>
      <section class="ad-card"><form data-mn="find" class="row"><input class="ad-in" name="q" placeholder="آيدي اللاعب أو اسمه" value="${esc(S.q)}" required style="flex:1"><button class="ad-btn" type="submit">بحث</button></form>
      ${S.err ? `<p class="err">${esc(S.err)}</p>` : ''}${S.msg ? `<p class="ok">${esc(S.msg)}</p>` : ''}
      ${f ? `<div class="who"><b>${esc(f.name)} <small dir="ltr">#${esc(f.displayId)}</small></b><small>الحين: ${f.level ? 'منجم ' + f.level + ' — يخلص ' + day(f.until) : 'بدون منجم'}</small>
        <div class="pick">${[0, 1, 2, 3].map((l) => `<button type="button" data-mn-set="${l}" class="${f.level === l ? 'on' : ''}" style="--c:${COL[l] || '#ff7d8c'}"${S.busy ? ' disabled' : ''}>${l ? '⛏️ منجم ' + l + ' (شهر)' : 'إزالة'}</button>`).join('')}</div></div>` : ''}</section>
      <section class="ad-card"><h2>أصحاب المناجم (${nf(d.list.length)})</h2>${d.list.length ? d.list.map((r) => `<div class="li"><span>${esc(r.name)} <small dir="ltr">#${esc(r.displayId)}</small></span><b style="color:${COL[r.level]}">⛏️ منجم ${r.level} <small>لين ${day(r.until)}</small></b></div>`).join('') : '<p class="ad-muted">ما فيه أحد للحين.</p>'}</section></div>`;
  };
  root.addEventListener('submit', async (e) => {
    const c = e.target.closest('[data-mn=cfg]'); if (c) { e.preventDefault(); try { await call('miners/config', { method: 'POST', body: { level: Number(c.dataset.l), price: Number(c.price.value), daily: Number(c.daily.value) } }); S.msg = 'تم ✅ انحفظت الأسعار.'; S.err = ''; } catch (er) { S.err = er.message; } return load(); }
    const f = e.target.closest('[data-mn=find]'); if (!f) return; e.preventDefault(); S.q = f.q.value.trim(); S.msg = ''; load(); });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-mn-set]'); if (!b || !S.d?.found || S.busy) return;
    const lvl = Number(b.dataset.mnSet); if (!confirm(lvl ? `تعطي ${S.d.found.name} منجم ${lvl} لمدة شهر؟` : `تشيل المنجم من ${S.d.found.name}؟`)) return;
    S.busy = true; paint();
    try { await call('miners', { method: 'POST', body: { player: S.d.found.id, level: lvl } }); S.msg = lvl ? `تم ✅ صار منجم ${lvl}.` : 'تم ✅ انشال المنجم.'; } catch (er) { S.err = er.message; }
    S.busy = false; await load();
  });
  paint(); load('');
}
