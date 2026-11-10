/* R68z36: علاقات BF (أصدقاء) / BR (أخ) / SS (أخت) — بطاقة بملفك وبملف أي لاعب (#/u/...).
 * الطلب والقبول والإنهاء من الخادم. */
const K = { bf: ['BF', 'أصدقاء', 'صديق', '#3b8cff'], br: ['BR', 'أخ', 'أخ', '#f0b429'], ss: ['SS', 'أخت', 'أخت', '#b26bff'] };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const face = (p) => p?.avatar && /^\/(api|assets|preview)\//.test(p.avatar) ? `<img src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async">` : `<b>${esc([...String(p?.name || '؟')][0])}</b>`;
const tag = (k) => K[k] ? `<span class="bd68-tag" style="--bd:${K[k][3]}">${K[k][0]}</span>` : '';
const get = (u) => fetch(u, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const post = (u, b = {}) => fetch(u, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json().catch(() => ({}))).catch(() => ({ ok: false, error: 'انقطع الاتصال.' }));
const list = (bs, mine) => bs.length ? `<ul class="bd68-list">${bs.map((b) => `<li><a class="bd68-p" href="#/u/${esc(b.partner.id)}"><span class="bd68-face">${face(b.partner)}</span>${tag(b.kind)}<b>${esc(b.partner.name)}</b><small>${esc(K[b.kind]?.[2] || '')} · ${b.days} يوم</small></a>${mine ? `<button type="button" class="bd68-x" data-bd="end" data-id="${b.id}" aria-label="إنهاء العلاقة">✕</button>` : ''}</li>`).join('')}</ul>` : '';
const groups = (bs, mine) => Object.keys(K).map((k) => { const g = bs.filter((b) => b.kind === k); return g.length ? `<div class="bd68-g"><h4>${tag(k)} ${K[k][1]} <small>${g.length}</small></h4>${list(g, mine)}</div>` : ''; }).join('');
async function fillMe(el) {
  const r = await get('/api/bonds/me'); if (!el.isConnected || !r?.ok) return;
  const inc = r.incoming.length ? `<div class="bd68-req"><h4>طلبات توصلك</h4>${r.incoming.map((q) => `<div class="bd68-rq"><span class="bd68-face">${face(q.user)}</span>${tag(q.kind)}<b>${esc(q.user.name)}</b><span class="bd68-act"><button type="button" class="bd68-ok" data-bd="accept" data-id="${q.id}">قبول</button><button type="button" class="bd68-no" data-bd="decline" data-id="${q.id}">رفض</button></span></div>`).join('')}</div>` : '';
  const out = r.outgoing.length ? `<p class="bd68-hint">أرسلت ${r.outgoing.length} طلب ينتظر الرد.</p>` : '';
  el.innerHTML = `<section class="bd68" dir="rtl"><header><h3>علاقاتي</h3><span class="bd68-legend">${tag('bf')}${tag('br')}${tag('ss')}</span></header>${inc}${groups(r.bonds, true) || '<p class="bd68-hint">ما عندك علاقات للحين. افتح ملف أي لاعب واطلب: صديق BF، أخ BR، أو أخت SS.</p>'}${out}<p class="bd68-msg" role="status"></p></section>`;
}
async function fillOf(el) {
  const pub = el.dataset.bdOf; const r = await get('/api/bonds/of/' + encodeURIComponent(pub)); if (!el.isConnected || !r?.ok) return;
  if (r.me) { el.innerHTML = ''; return; }
  const ask = r.can ? `<div class="bd68-ask"><span>اطلب علاقة:</span>${Object.keys(K).map((k) => `<button type="button" data-bd="request" data-kind="${k}" data-to="${esc(pub)}" style="--bd:${K[k][3]}">${tag(k)} ${K[k][2]}</button>`).join('')}</div>`
    : r.pending === 'out' ? `<p class="bd68-hint">أرسلت له طلب، ينتظر رده. <button type="button" class="bd68-link" data-bd="cancel" data-id="${r.pendingId}">إلغاء الطلب</button></p>`
    : r.pending === 'in' ? '<p class="bd68-hint">أرسل لك طلب علاقة، تلقاه بملفك تحت «علاقاتي».</p>'
    : r.withMe ? `<p class="bd68-hint">${tag(r.withMe.kind)} بينكم علاقة ${esc(K[r.withMe.kind]?.[1] || '')}. <button type="button" class="bd68-link" data-bd="end" data-id="${r.withMe.id}">إنهاء</button></p>` : '';
  if (!r.bonds.length && !ask) { el.innerHTML = ''; return; }
  el.innerHTML = `<section class="bd68" dir="rtl"><header><h3>العلاقات</h3></header>${groups(r.bonds, false)}${ask}<p class="bd68-msg" role="status"></p></section>`;
}
function css() {
  if (document.getElementById('bd68-css')) return;
  const st = document.createElement('style'); st.id = 'bd68-css';
  st.textContent = `.bd68{margin:12px 0;padding:14px;border-radius:20px;background:linear-gradient(180deg,#2a1150,#170830);border:1px solid #6a3fb066;color:#f3eaff}
.bd68 header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.bd68 h3{margin:0;font-size:17px;font-weight:900}.bd68 h4{display:flex;align-items:center;gap:6px;margin:10px 0 6px;font-size:14px}.bd68 h4 small{opacity:.6}
.bd68-legend{display:flex;gap:4px}
.bd68-tag{display:inline-grid;place-items:center;min-width:30px;height:20px;padding:0 6px;border-radius:7px;font:900 11px/1 Arial,sans-serif;letter-spacing:.5px;color:#fff;background:linear-gradient(180deg,color-mix(in srgb,var(--bd) 85%,#fff),var(--bd));box-shadow:0 0 8px color-mix(in srgb,var(--bd) 60%,transparent);direction:ltr}
.bd68-list{list-style:none;margin:0;padding:0;display:grid;gap:6px}.bd68-list li{display:flex;align-items:center;gap:6px}
.bd68-p{flex:1;display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:14px;background:#ffffff0d;color:inherit;text-decoration:none;min-width:0}.bd68-p b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bd68-p small{opacity:.65;white-space:nowrap}
.bd68-face{flex:none;width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#3a1670}.bd68-face img{width:100%;height:100%;object-fit:cover}
.bd68-x{width:30px;height:30px;border-radius:50%;border:0;background:#ffffff12;color:#fff;cursor:pointer}
.bd68-req{padding:8px;border-radius:14px;background:#ffcb4714;border:1px solid #ffcb4744}.bd68-rq{display:flex;align-items:center;gap:8px;padding:4px 0}.bd68-rq b{flex:1}.bd68-act{display:flex;gap:6px}
.bd68-ok,.bd68-no{border:0;border-radius:999px;padding:6px 12px;font-weight:800;cursor:pointer}.bd68-ok{background:linear-gradient(180deg,#ffd76a,#e0a020);color:#3a2600}.bd68-no{background:#ffffff18;color:#fff}
.bd68-ask{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}.bd68-ask>span{opacity:.8;font-size:13px}
.bd68-ask button{display:inline-flex;align-items:center;gap:6px;border:1px solid color-mix(in srgb,var(--bd) 60%,transparent);background:color-mix(in srgb,var(--bd) 16%,transparent);color:#fff;border-radius:999px;padding:6px 12px;font-weight:800;cursor:pointer}
.bd68-hint{margin:8px 0 0;font-size:13px;opacity:.8}.bd68-link{border:0;background:none;color:#ffcb47;text-decoration:underline;cursor:pointer;font:inherit}.bd68-msg:empty{display:none}.bd68-msg{margin:8px 0 0;font-size:13px;color:#ffcb47}`;
  document.head.appendChild(st);
}
function scan() {
  css();
  document.querySelectorAll('[data-bonds-me]').forEach((el) => { if (el.dataset.bdDone) return; el.dataset.bdDone = '1'; fillMe(el); });
  const m = /^(?:#)?\/u\/([A-Za-z0-9_-]{6,64})\/?$/.exec(((globalThis.__LA3BAK_NAV__ || location).hash) || ''); const prof = document.querySelector('.cm-prof');
  if (m && prof && !document.querySelector('[data-bd-of]')) { const el = document.createElement('div'); el.dataset.bdOf = m[1]; (document.querySelector('[data-cp-of]') || prof).after(el); fillOf(el); }
}
const refresh = () => document.querySelectorAll('[data-bonds-me],[data-bd-of]').forEach((el) => (el.dataset.bdOf ? fillOf(el) : fillMe(el)));
if (typeof document !== 'undefined' && !globalThis.__LA3BAK_BONDS__) {
  globalThis.__LA3BAK_BONDS__ = true;
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; scan(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-bd]'); if (!b) return; e.preventDefault();
    const act = b.dataset.bd, box = b.closest('.bd68'), msg = box?.querySelector('.bd68-msg');
    if (act === 'end' && !confirm('أكيد تبي تنهي هالعلاقة؟')) return;
    b.disabled = true;
    const r = act === 'request' ? await post('/api/bonds/request', { to: b.dataset.to, kind: b.dataset.kind }) : await post(`/api/bonds/${encodeURIComponent(b.dataset.id)}/${act}`);
    if (r?.ok) { if (msg) msg.textContent = act === 'request' ? 'انرسل الطلب ✓' : act === 'accept' ? 'صرتوا مرتبطين ✓' : 'تم ✓'; setTimeout(refresh, 500); }
    else { b.disabled = false; if (msg) msg.textContent = r?.error || 'تعذّر تنفيذ الطلب.'; }
  }, true);
  scan();
}
