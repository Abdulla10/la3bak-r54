/* R69zu: نهاية موحّدة لكل الألعاب: بطاقة النتيجة (فزت/خسرت) + احتفال + التصنيف + «العب مرة ثانية».
 * تطلع بعد ما تخلص اللعبة بثانية (عشان كل لعبة تبيّن آخر حركة)، وتختفي بروحها أو بزر الإغلاق. */
let el = null, hideT = 0, pendingRating = null;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function css() {
  if (document.querySelector('style[data-rs69r]')) return;
  const s = document.createElement('style'); s.dataset.rs69r = '1';
  s.textContent = `.rr69{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:flex-end;justify-content:center;pointer-events:none}
  .rr69-card{pointer-events:auto;width:min(420px,calc(100% - 20px));margin-bottom:calc(14px + env(safe-area-inset-bottom));direction:rtl;text-align:center;padding:18px 16px 14px;border-radius:24px;color:#fff;font-family:inherit;
    background:linear-gradient(160deg,#2c0f52,#160630);border:1.5px solid rgba(245,197,66,.7);box-shadow:0 20px 60px rgba(0,0,0,.65);animation:rr69in .45s cubic-bezier(.2,1.3,.4,1)}
  .rr69.lose .rr69-card{border-color:rgba(167,139,250,.5)}
  .rr69-ic{font-size:54px;line-height:1;filter:drop-shadow(0 6px 14px rgba(0,0,0,.5));animation:rr69bounce 1.2s ease-in-out infinite}
  .rr69-t{margin:6px 0 2px;font-size:26px;font-weight:900;background:linear-gradient(#fff3c4,#ffc93c);-webkit-background-clip:text;background-clip:text;color:transparent}
  .rr69.lose .rr69-t{background:none;color:#e9ddff}
  .rr69-s{opacity:.85;font-size:14px;margin:0 0 10px}
  .rr69-w{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:0 0 10px}.rr69-w span{padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.08);font-size:13px}.rr69-w span.me{background:rgba(245,197,66,.2);border:1px solid rgba(245,197,66,.5)}
  .rr69-r{min-height:22px;font-weight:800;font-size:15px;margin-bottom:10px}.rr69-r.up{color:#86efac}.rr69-r.dn{color:#fca5a5}
  .rr69-b{display:flex;gap:8px}.rr69-b button{flex:1;border:0;border-radius:14px;padding:12px;font:800 15px inherit;font-family:inherit;cursor:pointer;min-height:46px}
  .rr69-again{background:linear-gradient(#ffd86b,#e2a920);color:#2a1500}.rr69-x{background:rgba(255,255,255,.1);color:#fff}
  .rr69-cf{position:fixed;inset:0;pointer-events:none;z-index:2147481999}
  @keyframes rr69in{from{transform:translateY(60px) scale(.9);opacity:0}}@keyframes rr69bounce{50%{transform:translateY(-6px) scale(1.06)}}
  @media (prefers-reduced-motion:reduce){.rr69-card,.rr69-ic{animation:none}}`;
  document.head.appendChild(s);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.className = 'rr69-cf'; const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; document.body.appendChild(cv); const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cols = ['#ffd86b', '#f472b6', '#a78bfa', '#34d399', '#60a5fa', '#fb923c'];
  const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .55, vx: (Math.random() - .5) * 12, vy: -Math.random() * 15 - 6, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, va: (Math.random() - .5) * .3 }));
  const t0 = performance.now();
  const step = (t) => { const k = (t - t0) / 1000; g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; g.save(); g.globalAlpha = Math.max(0, 1 - k / 3); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); }
    if (k < 3) requestAnimationFrame(step); else cv.remove(); };
  requestAnimationFrame(step);
}
export function hide() { clearTimeout(hideT); el?.remove(); el = null; }
/** room: حالة الغرفة المنتهية، me: رقمي، opts: {onAgain, sfx} */
export function show(room, me, opts = {}) {
  if (!room?.outcome || !me) return; css(); hide();
  const winners = room.outcome.winners || [], won = winners.includes(me), draw = !winners.length;
  const names = room.players.filter((p) => winners.includes(p.id)).map((p) => `<span class="${p.id === me ? 'me' : ''}">${p.bot ? '🤖 ' : '👑 '}${esc(p.name)}</span>`).join('');
  el = document.createElement('div'); el.className = 'rr69' + (won ? ' win' : ' lose'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<div class="rr69-card"><div class="rr69-ic">${draw ? '🤝' : won ? '🏆' : '😔'}</div><div class="rr69-t">${draw ? 'تعادل!' : won ? 'فزت! مبروك' : 'خسرت هالمرة'}</div>
    <p class="rr69-s">${draw ? 'ما فيه فائز بهالجولة' : won ? 'لعب أسطوري 🔥' : 'حظ أوفر — المرة الجاية لك 💪'}</p>${names ? `<div class="rr69-w">${names}</div>` : ''}<div class="rr69-r" data-rr-rating></div>
    <div class="rr69-b">${opts.onAgain ? '<button type="button" class="rr69-again">🔁 العب مرة ثانية</button>' : ''}<button type="button" class="rr69-x">إغلاق</button></div></div>`;
  el.querySelector('.rr69-x').onclick = hide;
  el.querySelector('.rr69-again')?.addEventListener('click', () => { hide(); opts.onAgain(); });
  document.body.appendChild(el);
  if (won) confetti();
  try { opts.sfx?.(won ? 'win' : draw ? 'ok' : 'lose'); } catch { /* */ }
  try { navigator.vibrate?.(won ? [30, 60, 30] : 40); } catch { /* */ }
  if (pendingRating) { rating(pendingRating); pendingRating = null; }
  hideT = setTimeout(hide, 12000);
}
export function rating(m) {
  const r = el?.querySelector('[data-rr-rating]'); if (!r) { pendingRating = m; setTimeout(() => { pendingRating = null; }, 6000); return false; }
  r.className = 'rr69-r ' + (m.delta > 0 ? 'up' : 'dn'); r.textContent = `${m.icon || ''} التصنيف ${m.delta > 0 ? '+' + m.delta : m.delta} ← ${m.rating} (${m.tier})`; return true;
}
