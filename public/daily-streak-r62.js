/* R62: هدية الدخول اليومي المتصاعدة — شريط بالرئيسية + نافذة الأيام السبعة. الأرقام كلها من الخادم. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
let cache = null, cacheAt = 0, busy = false;
async function load(force = false) {
  if (!force && cache && Date.now() - cacheAt < 30000) return cache;
  try { const r = await fetch('/api/daily-streak', { credentials: 'same-origin', cache: 'no-store' }); if (!r.ok) return null; cache = await r.json(); cacheAt = Date.now(); return cache; } catch { return null; }
}
const cell = (x, s) => {
  const done = s.claimedToday ? x.day <= s.day : x.day < s.day;
  const now = !s.claimedToday && x.day === s.day;
  return `<li class="ds62-day${done ? ' is-done' : ''}${now ? ' is-now' : ''}${x.day === 7 ? ' is-big' : ''}"><small>اليوم ${x.day}</small><span class="ds62-ic" aria-hidden="true">${done ? '✓' : x.day === 7 ? '🎁' : '🪙'}</span><b dir="ltr">${nf(x.total)}</b>${x.gems ? `<em dir="ltr">+${nf(x.gems)} 💎</em>` : ''}</li>`;
};
function sheetHTML(s, msg = '') {
  const next = s.ladder[s.day - 1];
  return `<div class="ds62-card" role="dialog" aria-modal="true" aria-label="هدية الدخول اليومي">
    <button type="button" class="ds62-x" data-ds62="x" aria-label="إغلاق">×</button>
    <h2>🎁 هدية الدخول اليومي</h2>
    <p>ادخل كل يوم ورا بعض وتكبر هديتك. اليوم السابع أكبر هدية! لو فوّت يوم ترجع من اليوم الأول.</p>
    ${s.broken && !s.claimedToday ? '<p class="ds62-warn">فاتك يوم، فرجعت السلسلة من الأول.</p>' : ''}
    <ol class="ds62-grid">${s.ladder.map((x) => cell(x, s)).join('')}</ol>
    ${msg ? `<p class="ds62-msg" role="status">${msg}</p>` : ''}
    ${s.claimedToday ? `<p class="ds62-done">استلمت هدية اليوم ✓ — تعال بكرة لليوم ${s.day >= 7 ? 1 : s.day + 1}</p>` : `<button type="button" class="ds62-go" data-ds62="claim">استلم هدية اليوم ${s.day} (${nf(next.total)} 🪙${next.gems ? ` + ${nf(next.gems)} 💎` : ''})</button>`}
  </div>`;
}
export async function openDailyStreak({ req, after } = {}) {
  const s = await load(true); if (!s?.ok) return;
  document.querySelector('.ds62-sheet')?.remove();
  const el = document.createElement('div'); el.className = 'ds62-sheet'; el.dir = 'rtl'; el.innerHTML = sheetHTML(s); document.body.appendChild(el);
  el.addEventListener('click', async (e) => {
    const a = e.target.closest?.('[data-ds62]')?.dataset.ds62;
    if (e.target === el || a === 'x') { el.remove(); return; }
    if (a === 'claim' && !busy && typeof req === 'function') {
      busy = true; const b = e.target.closest('button'); b.disabled = true; b.textContent = 'لحظة…';
      try {
        const r = await req('wallet:daily');
        const fresh = await load(true);
        el.innerHTML = sheetHTML(fresh || s, r?.ok ? `مبروك! استلمت ${nf(r.got)} 🪙${r.gems ? ` و ${nf(r.gems)} 💎` : ''}` : esc(r?.error || 'ما قدرنا نستلم الهدية.'));
        if (r?.ok) { document.querySelector('.ds62-banner')?.remove(); after?.(r); }
      } finally { busy = false; }
    }
  });
}
/** شريط صغير بالرئيسية لما تكون الهدية جاهزة. يفتح النافذة تلقائيًا مرة باليوم. */
export async function mountDailyBanner(view, opts) {
  const s = await load(); if (!s?.ok || s.claimedToday) return;
  const host = view.querySelector('.hq60'); if (!host || view.querySelector('.ds62-banner')) return;
  const next = s.ladder[s.day - 1];
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ds62-banner';
  b.innerHTML = `<span aria-hidden="true">🎁</span><span><b>هديتك اليومية جاهزة</b><small>اليوم ${s.day} من 7 · ${nf(next.total)} 🪙${next.gems ? ` + ${nf(next.gems)} 💎` : ''}</small></span><i aria-hidden="true">‹</i>`;
  b.addEventListener('click', () => openDailyStreak(opts));
  host.before(b);
  const today = new Date().toISOString().slice(0, 10);
  if (navigator.webdriver) return; // متصفحات الاختبار الآلي: بدون فتح تلقائي (عشان ما تغطي الصفحة)
  try { if (localStorage.getItem('la3bak.ds62') !== today) { localStorage.setItem('la3bak.ds62', today); setTimeout(() => { if (document.querySelector('.ds62-banner') && !document.querySelector('.g60-sheet, .ds62-sheet')) openDailyStreak(opts); }, 900); } } catch { /* بدون تخزين: ما نفتحها تلقائي */ }
}
