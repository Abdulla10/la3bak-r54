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
  ${opts.mine ? '<p class="cp58-hint">كل جوهرة بهدية بينكم = نقطة CP. تقدر تتحكم بظهور العلاقة أو تنهيها من «العائلة والارتباط الافتراضي».</p>' : ''}</section>`;
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
function scan(root = document) {
  root.querySelectorAll?.('[data-cp-me]').forEach((el) => { if (el.dataset.cpDone) return; el.dataset.cpDone = '1'; fillMe(el); });
  const m = /^(?:#)?\/u\/([A-Za-z0-9_-]{6,64})\/?$/.exec(((globalThis.__LA3BAK_NAV__ || location).hash) || location.pathname); const prof = document.querySelector('.cm-prof');
  if (m && prof && !prof.nextElementSibling?.matches?.('[data-cp-of]')) { const el = document.createElement('div'); el.dataset.cpOf = m[1]; prof.after(el); fillOf(el); }
}
if (typeof document !== 'undefined' && !globalThis.__LA3BAK_CP__) {
  globalThis.__LA3BAK_CP__ = true;
  new MutationObserver(() => scan()).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-cp-ask]'); if (b) { e.preventDefault(); ask(b); } }, true);
  addEventListener('la3bak:cp', () => document.querySelectorAll('[data-cp-me],[data-cp-of]').forEach((el) => (el.dataset.cpMe !== undefined ? fillMe(el) : fillOf(el))));
  scan();
}
