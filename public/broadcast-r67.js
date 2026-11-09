// R67ae: البرقية العالمية — شريط يطلع بكل الموقع + نافذة الإرسال
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const TIER = { normal: { name: 'عادية', icon: '📢', ms: 12000, sub: 'شريط يتحرك فوق' }, gold: { name: 'ذهبية', icon: '👑', ms: 16000, sub: 'شريط ذهبي أطول' }, full: { name: 'شاشة كاملة', icon: '🎆', ms: 16000, sub: 'تطلع بنص الشاشة لكل الناس، وبعدها شريط ذهبي' } };
const SEEN_KEY = 'bc67-seen';
let info = null, queue = [], showing = null, hidden = new Set(), hideFx = false;
const seen = (() => { try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } })();
const markSeen = (id) => { seen.add(id); try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-50))); } catch {} };

function css() {
  if (document.querySelector('style[data-bc67]')) return; const st = document.createElement('style'); st.dataset.bc67 = '1';
  st.textContent = `.bc67-bar{position:fixed;inset-inline:8px;top:calc(var(--bc67-top,64px) + 6px);top:max(calc(var(--bc67-top,64px) + 6px),calc(env(safe-area-inset-top) + 6px));z-index:9000;height:38px;border-radius:999px;overflow:hidden;display:flex;align-items:center;gap:8px;padding-inline:10px;background:linear-gradient(90deg,#3b1366ee,#5b1c8fee);border:1px solid #c79bff66;box-shadow:0 8px 22px #0007;color:#fff;font:600 14px/1 var(--font-body,'Cairo',sans-serif);pointer-events:auto;animation:bc67In .35s ease both}
.bc67-bar.gold{background:linear-gradient(90deg,#5a3a06f2,#9a6a12f2,#5a3a06f2);border-color:#ffd66bcc;box-shadow:0 0 0 1px #ffd66b55,0 8px 26px #ffb84a55}
.bc67-bar .bc67-ic{flex:none;font-size:18px}.bc67-bar .bc67-x{flex:none;background:none;border:0;color:#fff9;font-size:18px;cursor:pointer;padding:0 2px}
.bc67-track{flex:1;position:relative;height:100%;overflow:hidden;white-space:nowrap;direction:ltr;mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.bc67-run{position:absolute;left:0;top:50%;margin-top:-.6em;line-height:1.2;display:inline-block;direction:rtl;will-change:transform;transform:translateX(-100%)}
.bc67-run b{color:#ffd66b}.bc67-bar.gold .bc67-run b{color:#fff3c4}
@keyframes bc67In{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
.bc67-full{position:fixed;inset:0;z-index:9500;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#3d1166cc,#0d0614ee);animation:bc67Fade 5.2s ease forwards;pointer-events:none}
.bc67-full .bc67-card{max-width:min(92vw,520px);text-align:center;padding:26px 22px;border-radius:24px;background:linear-gradient(160deg,#2a0d44,#4a1878);border:2px solid #ffd66b;box-shadow:0 0 60px #ffd66b66;color:#fff;animation:bc67Pop .6s cubic-bezier(.2,1.4,.4,1) both}
.bc67-full .bc67-card small{display:block;color:#ffd66b;font-weight:700;margin-bottom:8px}.bc67-full .bc67-card p{font:700 22px/1.5 var(--font-display,'Cairo');margin:0}
@keyframes bc67Pop{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}@keyframes bc67Fade{0%,85%{opacity:1}100%{opacity:0}}
.bc67-sheet{position:fixed;inset:0;z-index:9600;display:grid;align-items:end;background:#0008}.bc67-box{background:#1a0b2b;border-top:1px solid #ffffff22;border-radius:22px 22px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));color:#fff;max-height:88vh;overflow:auto}
.bc67-box h3{margin:0 0 4px;font:700 20px var(--font-display,'Cairo')}.bc67-box .bc67-muted{color:#b9a8d0;font-size:13px;margin:0 0 10px}
.bc67-tiers{display:grid;gap:8px;margin:10px 0}.bc67-tier{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;border:1px solid #ffffff22;background:#ffffff08;cursor:pointer;text-align:start;color:#fff;font:inherit}
.bc67-tier.on{border-color:#ffd66b;background:#ffd66b18}.bc67-tier b{display:block}.bc67-tier small{color:#b9a8d0}.bc67-tier .bc67-p{margin-inline-start:auto;font-weight:700;color:#ffd66b;white-space:nowrap}
.bc67-box textarea{width:100%;box-sizing:border-box;min-height:74px;border-radius:14px;border:1px solid #ffffff2a;background:#0d0614;color:#fff;padding:10px;font:inherit;resize:none}
.bc67-count{font-size:12px;color:#b9a8d0;text-align:end}.bc67-err{color:#ff9a9a;font-size:13px;min-height:18px}
.bc67-acts{display:flex;gap:8px;margin-top:8px}.bc67-acts button{flex:1;height:46px;border-radius:14px;border:0;font:700 16px inherit;cursor:pointer}.bc67-send{background:linear-gradient(90deg,#ffd66b,#e7a93a);color:#2a1300}.bc67-cancel{background:#ffffff14;color:#fff}`;
  document.head.appendChild(st);
}
const topOf = () => { const b = [...document.querySelectorAll('.lb-topbar, header')].map((h) => h.getBoundingClientRect().bottom).filter((x) => x > 0 && x < 220); return b.length ? Math.round(Math.max(...b)) : 2; };
async function loadInfo(force = false) { if (info && !force) return info; try { const r = await fetch('/api/broadcast/info', { credentials: 'same-origin', cache: 'no-store' }); info = r.ok ? await r.json() : null; } catch { info = null; } return info; }
function enqueue(b) { if (!b || seen.has(b.id) || hidden.has(b.id) || queue.some((x) => x.id === b.id) || showing?.id === b.id) return; queue.push(b); next(); }
function next() {
  if (showing || !queue.length || document.hidden) return; const b = queue.shift(); if (hidden.has(b.id)) return next();
  showing = b; markSeen(b.id); css();
  const ms = TIER[b.tier]?.ms ?? 12000;
  if (b.tier === 'full' && !hideFx) { const f = document.createElement('div'); f.className = 'bc67-full'; f.innerHTML = `<div class="bc67-card"><small>🎆 برقية من ${esc(b.name)}</small><p>${esc(b.text)}</p></div>`; document.body.appendChild(f); setTimeout(() => f.remove(), 5300); }
  const bar = document.createElement('div'); bar.className = 'bc67-bar' + (b.tier === 'normal' ? '' : ' gold'); bar.dataset.id = b.id; bar.setAttribute('role', 'status');
  bar.style.setProperty('--bc67-top', topOf() + 'px'); bar.style.setProperty('--bc67-ms', ms / 1000 + 's');
  bar.innerHTML = `<span class="bc67-ic" aria-hidden="true">${TIER[b.tier]?.icon ?? '📢'}</span><span class="bc67-track"><span class="bc67-run"><b>${esc(b.name)}:</b> ${esc(b.text)}</span></span><button type="button" class="bc67-x" aria-label="إخفاء">×</button>`;
  const pos = setInterval(() => { if (!bar.isConnected) return clearInterval(pos); bar.style.setProperty('--bc67-top', topOf() + 'px'); }, 400);
  let timer = 0; const done = () => { clearTimeout(timer); clearInterval(pos); bar.remove(); showing = null; setTimeout(next, 600); };
  bar.querySelector('.bc67-x').addEventListener('click', done);
  document.body.appendChild(bar);
  const run = bar.querySelector('.bc67-run'), tw = bar.querySelector('.bc67-track').clientWidth, rw = run.scrollWidth;
  const dur = Math.max(ms, Math.round((tw + rw) / 70 * 1000)); // 70px بالثانية عشان تنقرا
  try { run.animate([{ transform: `translateX(${-rw}px)` }, { transform: `translateX(${tw}px)` }], { duration: dur, easing: 'linear', fill: 'forwards' }); } catch { run.style.transform = 'none'; }
  timer = setTimeout(() => { if (bar.isConnected) done(); }, dur + 300);
}
async function openComposer() {
  css(); const i = await loadInfo(true);
  if (!i) return alert('تعذّر فتح البرقية، جرّب بعد شوي.');
  if (!i.enabled) return alert('البرقية موقفة حاليًا من الإدارة.');
  let tier = 'normal'; const max = i.max || 80;
  const sh = document.createElement('div'); sh.className = 'bc67-sheet';
  const render = () => { sh.innerHTML = `<div class="bc67-box" role="dialog" aria-modal="true" aria-label="أرسل برقية"><h3>📢 برقية للكل</h3><p class="bc67-muted">رسالتك تطلع شريط فوق عند كل اللي فاتحين الموقع. الروابط وأرقام التواصل والكلام المسيء ممنوعة.</p>
    <div class="bc67-tiers">${Object.entries(TIER).map(([k, t]) => `<button type="button" class="bc67-tier${tier === k ? ' on' : ''}" data-t="${k}"><span style="font-size:22px">${t.icon}</span><span><b>${t.name}</b><small>${t.sub}</small></span><span class="bc67-p">🪙 ${nf(i.prices[k])}</span></button>`).join('')}</div>
    <textarea maxlength="${max}" placeholder="مثال: مبروك لفلان على الفوز 🎉" data-tx></textarea><div class="bc67-count"><span data-n>0</span>/${max}</div><div class="bc67-err" data-err></div>
    <div class="bc67-acts"><button type="button" class="bc67-cancel" data-x>إلغاء</button><button type="button" class="bc67-send" data-go>إرسال بـ ${nf(i.prices[tier])} 🪙</button></div></div>`; };
  render(); document.body.appendChild(sh);
  let text = '', busy = false, key = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/[^A-Za-z0-9_-]/g, '');
  const sync = () => { const tx = sh.querySelector('[data-tx]'); tx.value = text; sh.querySelector('[data-n]').textContent = [...text].length; };
  sync();
  sh.addEventListener('input', (e) => { if (e.target.matches('[data-tx]')) { text = e.target.value; sh.querySelector('[data-n]').textContent = [...text].length; } });
  sh.addEventListener('click', async (e) => {
    if (e.target === sh || e.target.closest('[data-x]')) return sh.remove();
    const t = e.target.closest('[data-t]'); if (t) { tier = t.dataset.t; render(); sync(); return; }
    if (e.target.closest('[data-go]') && !busy) {
      const err = sh.querySelector('[data-err]'); if ([...text.trim()].length < 3) { err.textContent = 'اكتب 3 أحرف على الأقل.'; return; }
      busy = true; const btn = sh.querySelector('[data-go]'); btn.textContent = 'جاري الإرسال…';
      try {
        const r = await fetch('/api/broadcast', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.trim(), tier, key }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { err.textContent = j.error || 'تعذّر الإرسال.'; busy = false; btn.textContent = `إرسال بـ ${nf(i.prices[tier])} 🪙`; return; }
        sh.remove();
      } catch { err.textContent = 'تعذّر الاتصال. جرّب مرة ثانية.'; busy = false; btn.textContent = `إرسال بـ ${nf(i.prices[tier])} 🪙`; }
    }
  });
}
document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-bc67-open]'); if (b) { e.preventDefault(); openComposer(); } }, true);
addEventListener('la3bak:broadcast', (e) => { const m = e.detail || {}; if (m.t === 'broadcast:hide') { hidden.add(m.id); queue = queue.filter((x) => x.id !== m.id); document.querySelectorAll(`.bc67-bar[data-id="${CSS.escape(m.id)}"]`).forEach((x) => x.remove()); if (showing?.id === m.id) { showing = null; next(); } return; } enqueue(m.b); });
document.addEventListener('visibilitychange', next);
(async () => { try { const s = await fetch('/api/account-tools/settings', { credentials: 'same-origin' }); if (s.ok) { const j = await s.json(); hideFx = (j.settings ?? j)?.hideChatEffects === true; } } catch {} const i = await loadInfo(); if (i?.enabled) for (const b of i.recent || []) if (Date.now() - b.at < 3 * 60_000) enqueue(b); })();
export { openComposer };
