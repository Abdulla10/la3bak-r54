// R122: المنجم — اشتراك شهري بالعملات. تفتحه من ملفي ← المنجم.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const COL = { 1: '#9fb3c8', 2: '#4fc3ff', 3: '#ffc83d' };
const day = (t) => t ? new Date(t + 4 * 3600_000).toISOString().slice(0, 10) : '';
const CSS = `.mi122{position:fixed;inset:0;z-index:9600;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,2,12,.65);direction:rtl;font-family:inherit}
.mi122-s{width:100%;max-width:560px;max-height:90vh;overflow:auto;padding:18px 16px calc(18px + env(safe-area-inset-bottom));border-radius:26px 26px 0 0;background:linear-gradient(180deg,#2a0f4a,#14062a 70%);border-top:1.5px solid #a86bff66;color:#fff;animation:mi122 .25s ease both}
@keyframes mi122{from{transform:translateY(100%)}}
.mi122 h2{margin:0 0 4px;font-size:22px;text-align:center}.mi122 .sub{margin:0 0 12px;text-align:center;color:#cdb8f0;font-size:13px}
.mi122 .now{margin:0 0 12px;padding:10px;border-radius:14px;background:#ffffff10;text-align:center;font-weight:800}
.mi122 .card{position:relative;display:grid;gap:8px;margin-bottom:12px;padding:14px;border-radius:18px;border:2px solid var(--c);background:linear-gradient(160deg,color-mix(in srgb,var(--c) 22%,transparent),#ffffff06)}
.mi122 .card h3{margin:0;font-size:19px;color:var(--c)}.mi122 .card ul{margin:0;padding-inline-start:18px;display:grid;gap:3px;font-size:13.5px;color:#eadcff}
.mi122 .row{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800}
.mi122 .buy{border:0;border-radius:14px;padding:12px 18px;font:900 15px inherit;background:linear-gradient(180deg,#ffe07a,#f0a91f);color:#3a1600;cursor:pointer}.mi122 .buy:disabled{opacity:.45}
.mi122 .x{position:absolute;top:12px;left:12px;width:38px;height:38px;border-radius:50%;border:1.5px solid #ffffff2e;background:#ffffff12;color:#fff;font-size:18px}
.mi122 .err{color:#ff8a98;font-weight:800;text-align:center}.mi122 .ok{color:#5be08f;font-weight:800;text-align:center}
.mi122 .tag{position:absolute;top:-10px;left:14px;padding:2px 10px;border-radius:99px;background:var(--c);color:#2a1500;font-size:11.5px;font-weight:900}`;
async function api(u, body) { const r = await fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' }); const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || 'تعذّر الطلب.'); return j; }
export async function openMiner() {
  if (!document.querySelector('style[data-mi122]')) { const s = document.createElement('style'); s.dataset.mi122 = '1'; s.textContent = CSS; document.head.append(s); }
  document.querySelector('.mi122')?.remove();
  const root = document.createElement('div'); root.className = 'mi122'; root.innerHTML = '<section class="mi122-s" role="dialog" aria-label="المنجم"><p class="sub">جاري التحميل…</p></section>'; document.body.append(root);
  const sh = root.querySelector('.mi122-s'); const S = { d: null, err: '', ok: '', busy: false };
  const paint = () => {
    const d = S.d; if (!d) return;
    sh.innerHTML = `<button type="button" class="x" data-mi="x" aria-label="إغلاق">✕</button><h2>⛏️ المنجم</h2><p class="sub">اشتراك شهري (30 يوم) بالعملات المشحونة 💳. يخلص الشهر وترجع تشترك.</p>
      ${d.level ? `<p class="now" style="color:${COL[d.level]}">عندك منجم ${d.level} — يخلص ${esc(day(d.until))}</p>` : ''}
      ${S.err ? `<p class="err">${esc(S.err)}</p>` : ''}${S.ok ? `<p class="ok">${esc(S.ok)}</p>` : ''}
      ${[1, 2, 3].map((l) => { const t = d.tiers[l]; const mine = d.level === l; const locked = d.level > l; return `<div class="card" style="--c:${COL[l]}">${l === 3 ? '<span class="tag">الأقوى</span>' : ''}<h3>⛏️ ${esc(t.name)}</h3><ul><li>تعدين يومي: ${nf(t.daily)} عملة (مع المكافأة اليومية)</li>${t.perks.slice(1).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="row"><span>${nf(t.price)} 💳 / شهر</span><button type="button" class="buy" data-mi="buy" data-l="${l}"${S.busy || locked ? ' disabled' : ''}>${mine ? 'جدّد شهر' : locked ? 'عندك أعلى' : 'اشترك'}</button></div></div>`; }).join('')}
      <p class="sub">رصيدك: ${nf(d.coins)} 🪙</p>`;
  };
  const close = () => root.remove();
  root.addEventListener('click', async (e) => {
    if (e.target === root || e.target.closest('[data-mi=x]')) return close();
    const b = e.target.closest('[data-mi=buy]'); if (!b || S.busy) return;
    const l = Number(b.dataset.l), t = S.d.tiers[l]; if (!confirm(`تشترك في ${t.name} بـ ${nf(t.price)} عملة مشحونة لمدة شهر؟`)) return;
    S.busy = true; S.err = ''; S.ok = ''; paint();
    try { await api('/api/miner/subscribe', { level: l, key: crypto.randomUUID() }); S.ok = `تم ✅ صرت ${t.name}!`; S.d = await api('/api/miner'); } catch (er) { S.err = er.message; if (/مشحونة/.test(er.message)) import('/recharge-r123.js?v=r134').then((m) => m.openRecharge()).catch(() => {}); }
    S.busy = false; paint();
  });
  try { S.d = await api('/api/miner'); paint(); } catch (e) { sh.innerHTML = `<p class="err">${esc(e.message)}</p><button type="button" class="x" data-mi="x">✕</button>`; }
}
document.addEventListener('click', (e) => { if (e.target.closest?.('[data-mine122]')) { e.preventDefault(); openMiner(); } });
