/* R90: صفحة «استوديو التصميم» (#/studio) — نوبل 5 وفوق يصمم إطار أو خلفية، يلبسها، أو يبيعها بالعملات.
 * الرسم كله من cosmetics.js (studioArt) بنفس مفتاح st~ اللي يرجعه الخادم. */
import { studioArt } from './cosmetics.js?v=r90';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = (n) => Number(n || 0).toLocaleString('en');
const PATS = [['plain', 'سادة'], ['stars', '⭐ نجوم'], ['dots', '⚪ نقاط'], ['waves', '〰️ موج'], ['diamonds', '💎 ماس'], ['hearts', '❤️ قلوب'], ['crowns', '👑 تيجان'], ['sparkle', '✨ لمعة']];
const PRESETS = [['#ffd66b', '#b8740e', '#fff4d6'], ['#a855f7', '#3b0764', '#ffd66b'], ['#22d3ee', '#1e3a8a', '#ffffff'], ['#f43f5e', '#7f1d1d', '#ffe4e6'], ['#34d399', '#064e3b', '#fef3c7'], ['#111827', '#4b5563', '#ffd66b']];
const S = { d: null, err: '', tab: 'make', spec: { k: 'frame', c1: '#ffd66b', c2: '#b8740e', c3: '#fff4d6', p: 'stars', t: '', g: true }, name: '', busy: false };
let VIEW = null, toast = (m) => console.log(m);

async function api(path, method = 'GET', body) {
  const r = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch { /* */ }
  if (!r.ok || j.ok === false) throw new Error(j.error || 'صار خطأ، جرّب مرة ثانية.');
  return j;
}
/* نفس ترميز الخادم: st~ + base64url(JSON) */
const cssOf = (s) => { const raw = JSON.stringify([s.k, s.c1, s.c2, s.c3, s.p, s.t, s.g ? 1 : 0]); return 'st~' + btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const preview = (css, kind, big = false) => kind === 'frame'
  ? `<span class="st90-av${big ? ' big' : ''}"><span class="st90-face">🙂</span>${studioArt(css)}</span>`
  : `<span class="st90-bg${big ? ' big' : ''}">${studioArt(css)}</span>`;
const isOn = (slot, item) => S.d?.equipped?.[slot] === item;

function makeHTML() {
  const s = S.spec;
  if (!S.d.can) return `<div class="sp73-card st90-lock"><b>🔒 الاستوديو لأصحاب نوبل ${S.d.need} وفوق</b><small class="sp73-t">تقدر تشتري تصاميم اللاعبين من «السوق».</small><a class="btn block" href="#/vip">👑 ترقية النوبل</a></div>`;
  return `<div class="sp73-card st90-maker">
    <div class="st90-kinds"><button type="button" class="${s.k === 'frame' ? 'on' : ''}" data-st="kind" data-v="frame">🖼️ إطار</button><button type="button" class="${s.k === 'bg' ? 'on' : ''}" data-st="kind" data-v="bg">🌄 خلفية</button></div>
    <div class="st90-prev" data-st-prev>${preview(cssOf(s), s.k, true)}</div>
    <p class="sp73-l">الألوان</p>
    <div class="st90-cols"><label>الأساسي<input type="color" data-st-c="c1" value="${s.c1}"></label><label>الثاني<input type="color" data-st-c="c2" value="${s.c2}"></label><label>النقشة والكتابة<input type="color" data-st-c="c3" value="${s.c3}"></label></div>
    <div class="st90-presets">${PRESETS.map((p, i) => `<button type="button" data-st="preset" data-v="${i}" aria-label="ألوان جاهزة ${i + 1}" style="background:linear-gradient(135deg,${p[0]},${p[1]})"></button>`).join('')}</div>
    <p class="sp73-l">النقشة</p>
    <div class="sp73-chips">${PATS.map(([k, n]) => `<button type="button" class="${s.p === k ? 'on' : ''}" data-st="pat" data-v="${k}">${n}</button>`).join('')}</div>
    <label class="st90-row"><span>كتابة على التصميم (اختياري، لين 12 حرف)</span><input data-st-t maxlength="12" value="${esc(s.t)}" placeholder="مثلاً: اسمك"></label>
    <label class="st90-check"><input type="checkbox" data-st-g ${s.g ? 'checked' : ''}> ✨ توهج وإطار لامع</label>
    <label class="st90-row"><span>اسم التصميم</span><input data-st-name maxlength="24" value="${esc(S.name)}" placeholder="مثلاً: ذهب الملوك"></label>
    <button class="btn block" type="button" data-st="create" ${S.busy ? 'disabled' : ''}>🎨 احفظ التصميم</button>
    <small class="sp73-t">التصميم ينحفظ بمقتنياتك على طول، وتقدر تلبسه أو تعرضه للبيع (تاخذ ${Math.round((S.d.share || .8) * 100)}% من كل بيعة).</small>
  </div>`;
}
function mineHTML() {
  const mine = S.d.mine || [], bought = S.d.bought || [];
  const card = (d) => `<div class="sp73-card st90-item">${preview(d.css, d.kind)}<div class="st90-meta"><b>${esc(d.name)}</b><small>${d.kind === 'frame' ? 'إطار' : 'خلفية'} · انباع ${nf(d.sales)} مرة${d.price ? ` · معروض بـ ${nf(d.price)} 🪙` : ''}</small>
    <div class="st90-acts"><button class="btn sm" type="button" data-st="wear" data-item="${esc(d.itemId)}" data-slot="${d.kind}">${isOn(d.kind, d.itemId) ? '✅ لابسه — شيله' : 'البسه'}</button>
    <form class="st90-price" data-st-price="${d.id}"><input name="p" inputmode="numeric" placeholder="السعر" value="${d.price || ''}"><button class="btn sm ghost" type="submit">${d.price ? 'غيّر السعر' : 'اعرضه للبيع'}</button></form>
    ${d.price ? `<button class="btn sm ghost" type="button" data-st="unsell" data-id="${d.id}">إيقاف البيع</button>` : ''}<button class="btn sm danger" type="button" data-st="del" data-id="${d.id}">حذف</button></div></div></div>`;
  const got = (it) => `<div class="sp73-card st90-item">${preview(it.css, it.slot)}<div class="st90-meta"><b>${esc(it.name)}</b><small>اشتريته من السوق</small><div class="st90-acts"><button class="btn sm" type="button" data-st="wear" data-item="${esc(it.id)}" data-slot="${it.slot}">${isOn(it.slot, it.id) ? '✅ لابسه — شيله' : 'البسه'}</button></div></div></div>`;
  return `${mine.length ? `<h2 class="sp73-sec">🎨 تصاميمي</h2><div class="sp73-list">${mine.map(card).join('')}</div>` : '<p class="sp73-empty">ما عندك تصاميم بعد.</p>'}
    ${bought.length ? `<h2 class="sp73-sec">🛍️ اشتريتها</h2><div class="sp73-list">${bought.map(got).join('')}</div>` : ''}`;
}
function marketHTML() {
  const list = S.d.market || [];
  if (!list.length) return '<p class="sp73-empty">ما فيه تصاميم معروضة للحين.</p>';
  const owned = new Set(S.d.owned || []);
  return `<div class="st90-grid">${list.map((d) => `<div class="sp73-card st90-mk">${preview(d.css, d.kind)}<b>${esc(d.name)}</b><small>من ${esc(d.by?.name || 'لاعب')} · ${nf(d.sales)} بيعة</small>
    ${d.mine ? '<small class="st90-own">تصميمك</small>' : owned.has(d.itemId) ? '<small class="st90-own">✅ عندك</small>' : `<button class="btn sm" type="button" data-st="buy" data-id="${d.id}" data-price="${d.price}">${nf(d.price)} 🪙 اشتري</button>`}</div>`).join('')}</div>`;
}
function paint() {
  if (!VIEW || (globalThis.__LA3BAK_NAV__?.hash ?? location.hash) !== '#/studio') return;
  const head = `<div class="sp73"><header class="sp73-h"><a class="sp73-back" href="#/perks" aria-label="رجوع">‹</a><div><h1>🎨 استوديو التصميم</h1><p>صمّم إطارك وخلفيتك — البسها أو بيعها${S.d ? ` · رصيدك ${nf(S.d.coins)} 🪙` : ''}</p></div></header>`;
  if (!S.d) { VIEW.innerHTML = head + `<p class="sp73-empty">${esc(S.err || 'جاري التحميل…')}</p></div>`; return; }
  const tabs = [['make', '✏️ صمّم'], ['mine', '🎨 تصاميمي'], ['market', '🛍️ السوق']];
  VIEW.innerHTML = head + `<div class="sp73-chips st90-tabs">${tabs.map(([k, n]) => `<button type="button" class="${S.tab === k ? 'on' : ''}" data-st="tab" data-v="${k}">${n}</button>`).join('')}</div>
    ${S.tab === 'make' ? makeHTML() : S.tab === 'mine' ? mineHTML() : marketHTML()}</div>`;
}
const refreshPrev = () => { const el = VIEW?.querySelector('[data-st-prev]'); if (el) el.innerHTML = preview(cssOf(S.spec), S.spec.k, true); };
async function load() { try { S.d = await api('/api/studio'); S.err = ''; } catch (e) { S.err = e.message; } paint(); }
const run = async (fn, ok) => { if (S.busy) return; S.busy = true; try { await fn(); if (ok) toast(ok); } catch (e) { toast('⚠️ ' + e.message); } finally { S.busy = false; paint(); } };

let wired = false;
function wire() {
  if (wired) return; wired = true;
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-st]'); if (!b || !VIEW?.contains(b)) return;
    const a = b.dataset.st, v = b.dataset.v;
    if (a === 'tab') { S.tab = v; paint(); }
    else if (a === 'kind') { S.spec.k = v; paint(); }
    else if (a === 'pat') { S.spec.p = v; VIEW.querySelectorAll('[data-st="pat"]').forEach((x) => x.classList.toggle('on', x === b)); refreshPrev(); }
    else if (a === 'preset') { const p = PRESETS[Number(v)]; if (p) { [S.spec.c1, S.spec.c2, S.spec.c3] = p; paint(); } }
    else if (a === 'create') run(async () => { const r = await api('/api/studio', 'POST', { name: S.name, spec: S.spec }); S.d.mine = [r.design, ...(S.d.mine || [])]; Object.assign(S.d, { coins: r.coins, equipped: r.equipped, owned: r.owned }); S.tab = 'mine'; S.name = ''; }, '🎨 انحفظ تصميمك');
    else if (a === 'wear') run(async () => { const slot = b.dataset.slot, item = b.dataset.item; const r = await api('/api/studio/wear', 'POST', { slot, item: isOn(slot, item) ? null : item }); S.d.equipped = r.equipped; }, '✅ تم');
    else if (a === 'unsell') run(async () => { await api(`/api/studio/${b.dataset.id}/price`, 'POST', { price: 0 }); await load(); }, 'وقف البيع');
    else if (a === 'del') { if (!confirm('تحذف التصميم من قائمتك؟ (اللي اشتروه يبقى معهم)')) return; run(async () => { await api(`/api/studio/${b.dataset.id}/delete`, 'POST', {}); await load(); }, 'انحذف'); }
    else if (a === 'buy') { const price = Number(b.dataset.price); if (!confirm(`تشتري التصميم بـ ${nf(price)} عملة؟`)) return; run(async () => { const key = 'st' + (crypto.randomUUID?.() || String(Date.now()) + Math.random()).replace(/[^A-Za-z0-9]/g, '').slice(0, 30); await api(`/api/studio/${b.dataset.id}/buy`, 'POST', { seen: price, key }); await load(); }, '🛍️ صار عندك! تقدر تلبسه من «تصاميمي»'); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target; if (!VIEW?.contains(t)) return;
    if (t.dataset.stC) { S.spec[t.dataset.stC] = String(t.value).toLowerCase(); refreshPrev(); }
    else if (t.hasAttribute('data-st-t')) { S.spec.t = t.value.slice(0, 12); refreshPrev(); }
    else if (t.hasAttribute('data-st-name')) S.name = t.value.slice(0, 24);
  });
  document.addEventListener('change', (e) => { const t = e.target; if (VIEW?.contains(t) && t.hasAttribute('data-st-g')) { S.spec.g = t.checked; refreshPrev(); } });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest?.('[data-st-price]'); if (!f || !VIEW?.contains(f)) return; e.preventDefault();
    const price = Number(String(f.p.value).replace(/[^\d]/g, '')); run(async () => { await api(`/api/studio/${f.dataset.stPrice}/price`, 'POST', { price }); await load(); }, price ? `🛍️ معروض بـ ${nf(price)} عملة` : 'وقف البيع');
  });
}
export function page(view, ctx = {}) { VIEW = view; toast = ctx.toast || toast; wire(); paint(); void load(); }
