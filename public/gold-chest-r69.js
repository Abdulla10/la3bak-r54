// R69z: الصناديق الذهبية — يطلع صندوق يتنطط فجأة لكل المتصلين. اضغطه بسرعة: أسرع 5 ياخذون عملات أو إطار.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const IMG = '/assets/art68/casino/chest-3.webp?v=r69z9';
const CSS = `
.gc69{position:fixed;z-index:9000;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 104px);width:104px;display:flex;flex-direction:column;align-items:center;gap:2px;border:0;background:none;padding:0;cursor:pointer;direction:rtl;font-family:inherit;color:#fff;animation:gc69in .6s cubic-bezier(.2,1.6,.4,1) both}
.gc69[hidden]{display:none}
.gc69 .glow{position:absolute;top:-6px;left:50%;width:120px;height:120px;transform:translateX(-50%);border-radius:50%;background:conic-gradient(from 0deg,#ffd76a00,#ffd76acc,#ffd76a00,#ffb21fcc,#ffd76a00,#ffe7a8cc,#ffd76a00);filter:blur(4px);animation:gc69spin 3s linear infinite;opacity:.9}
.gc69 img{position:relative;width:92px;height:auto;filter:drop-shadow(0 8px 12px #000a) drop-shadow(0 0 10px #ffd76a);animation:gc69bob 1s ease-in-out infinite}
.gc69 b{position:relative;margin-top:-6px;padding:3px 10px;border-radius:99px;background:linear-gradient(180deg,#ffe07a,#ffb21f);color:#3a1600;font-size:12.5px;font-weight:900;box-shadow:0 3px 8px #0008;white-space:nowrap}
.gc69 small{position:relative;padding:1px 8px;border-radius:99px;background:#12041fcc;border:1px solid #ffd76a88;font-size:11px;font-weight:800}
.gc69.is-taken img{animation:gc69shake .3s linear infinite}
@keyframes gc69in{from{transform:translateY(120px) scale(.3);opacity:0}to{transform:none;opacity:1}}
@keyframes gc69bob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-8px) rotate(4deg)}}
@keyframes gc69shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
@keyframes gc69spin{to{transform:translateX(-50%) rotate(360deg)}}
.gc69-pop{position:fixed;inset:0;z-index:9001;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#5a2a00cc,#12041fee 70%);direction:rtl;font-family:inherit;color:#fff;animation:gc69fade .25s ease both}
.gc69-card{position:relative;width:min(320px,86vw);text-align:center;padding:20px 16px 18px;border-radius:24px;background:linear-gradient(180deg,#3a1470,#1a0733);box-shadow:0 0 0 2px #ffd76a,0 0 0 4px #7a4a0a,0 0 60px #ffb21f88}
.gc69-rays{position:absolute;left:50%;top:70px;width:340px;height:340px;transform:translate(-50%,-50%);background:repeating-conic-gradient(#ffd76a33 0 10deg,transparent 10deg 20deg);border-radius:50%;animation:gc69spin 8s linear infinite;pointer-events:none;-webkit-mask-image:radial-gradient(circle,#000 30%,transparent 70%);mask-image:radial-gradient(circle,#000 30%,transparent 70%)}
.gc69-card img{position:relative;width:130px;animation:gc69open .9s cubic-bezier(.2,1.6,.4,1) both}
@keyframes gc69open{0%{transform:scale(.4) rotate(-20deg)}60%{transform:scale(1.2) rotate(6deg)}100%{transform:scale(1)}}
.gc69-card h3{position:relative;margin:4px 0 2px;font-size:20px;font-weight:900;color:#ffd76a}
.gc69-prize{position:relative;margin:8px auto;display:inline-block;padding:8px 22px;border-radius:99px;background:linear-gradient(180deg,#ffe07a,#ffb21f);color:#3a1600;font-size:26px;font-weight:900;box-shadow:0 0 24px #ffb21f;animation:gc69open .7s .35s cubic-bezier(.2,1.6,.4,1) both}
.gc69-card p{position:relative;margin:4px 0;color:#eadcff;font-size:13.5px}
.gc69-card button{position:relative;margin-top:10px;width:100%;padding:12px;border:0;border-radius:16px;font-weight:900;font-size:16px;color:#3a1600;background:linear-gradient(180deg,#ffe07a,#ffb21f);cursor:pointer}
.gc69-win{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px;font-size:12.5px;color:#eadcff}
.gc69-win li{display:flex;justify-content:space-between;gap:8px;padding:4px 10px;border-radius:10px;background:#ffffff0d}
.gc69-coins{position:fixed;inset:0;pointer-events:none;z-index:9002;overflow:hidden}
.gc69-coins i{position:absolute;top:-30px;font-size:24px;font-style:normal;animation:gc69fall linear forwards}
@keyframes gc69fall{to{transform:translateY(110vh) rotate(540deg)}}
@keyframes gc69fade{from{opacity:0}}
.gc69-toast{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 70px);transform:translateX(-50%);z-index:9001;padding:8px 14px;border-radius:99px;background:#1a0733ee;border:1.5px solid #ffd76a;color:#fff;font-size:13px;font-weight:800;direction:rtl;box-shadow:0 6px 18px #000a;animation:gc69fade .3s ease both;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis}
@media (prefers-reduced-motion:reduce){.gc69 *,.gc69,.gc69-pop *{animation:none!important}}
`;
let started = false;
export function startGoldChest() {
  if (started) return; started = true;
  if (!document.querySelector('style[data-gc69]')) { const s = document.createElement('style'); s.dataset.gc69 = '1'; s.textContent = CSS; document.head.append(s); }
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gc69'; btn.hidden = true; btn.setAttribute('aria-label', 'صندوق ذهبي! اضغطه بسرعة');
  btn.innerHTML = `<i class="glow" aria-hidden="true"></i><img src="${IMG}" alt="" decoding="async"><b>صندوق ذهبي! افتحه</b><small data-gc-left></small>`;
  document.body.append(btn);
  const S = { chest: null, at: 0, busy: false, tried: new Set() };
  const api = (u, body) => fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || 'تعذّر الطلب.'); return j; });
  const toast = (t) => { document.querySelector('.gc69-toast')?.remove(); const n = document.createElement('div'); n.className = 'gc69-toast'; n.setAttribute('role', 'status'); n.textContent = t; document.body.append(n); setTimeout(() => n.remove(), 3500); };
  const leftMs = () => S.chest ? Math.max(0, S.chest.left - (performance.now() - S.at)) : 0;
  function paint() {
    const c = S.chest, show = !!c && !c.mine && c.taken < c.slots && leftMs() > 0 && !S.tried.has(c.id);
    btn.hidden = !show; if (!show) return;
    btn.querySelector('[data-gc-left]').textContent = `باقي ${c.slots - c.taken} من ${c.slots} · ${Math.ceil(leftMs() / 1000)}ث`;
    btn.classList.toggle('is-taken', c.taken > 0);
  }
  function rain() { const c = document.createElement('div'); c.className = 'gc69-coins'; c.innerHTML = Array.from({ length: 34 }, () => `<i style="left:${Math.random() * 100}%;animation-duration:${1.6 + Math.random() * 1.6}s;animation-delay:${Math.random() * 0.6}s">🪙</i>`).join(''); document.body.append(c); setTimeout(() => c.remove(), 4000); }
  function reveal(r, winners) {
    const n = document.createElement('div'); n.className = 'gc69-pop'; n.setAttribute('role', 'dialog'); n.setAttribute('aria-label', 'جائزة الصندوق');
    n.innerHTML = `<div class="gc69-card"><i class="gc69-rays" aria-hidden="true"></i><img src="${IMG}" alt=""><h3>فتحت الصندوق الذهبي! 🎉</h3>
      <div class="gc69-prize">${r.itemName ? `🖼️ ${esc(r.itemName)}` : `+${nf(r.coins)} 🪙`}</div>
      <p>${r.itemName ? 'الإطار انضاف لمقتنياتك، تقدر تلبسه من ملفك.' : 'انضافت العملات لرصيدك على طول.'}</p>
      ${winners?.length ? `<ul class="gc69-win">${winners.map((w) => `<li><b>${esc(w.name)}</b><span>${w.itemName ? '🖼️ ' + esc(w.itemName) : nf(w.coins) + ' 🪙'}</span></li>`).join('')}</ul>` : ''}
      <button type="button" data-gc-close>تمام</button></div>`;
    n.addEventListener('click', (e) => { if (e.target === n || e.target.closest('[data-gc-close]')) n.remove(); });
    document.body.append(n); if (!r.itemName) rain(); try { navigator.vibrate?.([60, 40, 120]); } catch { /* */ }
  }
  btn.addEventListener('click', async () => {
    const c = S.chest; if (!c || S.busy) return; S.busy = true;
    try { const r = await api('/api/chest/claim', { id: c.id }); S.tried.add(c.id); paint(); const v = await api('/api/chest').catch(() => null); reveal(r, v?.chest?.winners); }
    catch (e) { S.tried.add(c.id); paint(); toast(e.message || 'راح الصندوق!'); }
    S.busy = false;
  });
  async function load() { try { const v = await api('/api/chest'); S.chest = v.chest; S.at = performance.now(); paint(); } catch { /* ضيف أو غير مسجل */ } }
  addEventListener('la3bak:chest', (e) => {
    const m = e.detail || {};
    if (m.t === 'chest:drop') { S.chest = { id: m.id, left: Math.max(0, m.endsAt - Date.now()), taken: 0, slots: m.slots, mine: null }; S.at = performance.now(); paint(); load(); try { navigator.vibrate?.(80); } catch { /* */ } }
    else if (m.t === 'chest:taken' && S.chest?.id === m.id) { S.chest.taken = m.taken; paint(); }
    else if (m.t === 'chest:end' && S.chest?.id === m.id) { S.chest = null; paint(); }
  });
  addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  setInterval(paint, 1000);
  setTimeout(load, 1500);
}
startGoldChest();
