/* R58u: صاروخ الغرفة اليومي — الزر واللوحة وحركة الإطلاق. كل الأرقام من الخادم. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number.isSafeInteger(n) && n >= 0 ? n.toLocaleString('en-US') : '—';
const art = (n, cls = '') => `<img class="rk58-art ${cls}" src="/assets/art58/rocket/k${Math.max(1, Math.min(3, n | 0))}.webp?v=r58u" alt="" decoding="async">`;
const valid = (r) => r && Array.isArray(r.stages) && r.stages.length === 3 && Number.isSafeInteger(r.goal);
export function rocketShortcut(r) {
  if (!valid(r)) return '';
  const pct = r.finished ? 100 : Math.min(100, Math.floor(r.progress / r.goal * 100));
  return `<button type="button" class="so-cannon-shortcut rk58-shortcut" data-so-action="open-panel" data-panel="rocket" aria-label="صاروخ الغرفة · المرحلة ${esc(r.stage)} · ${pct}%">${art(r.stage, 'is-mini')}<span>${r.finished ? '✓' : pct + '%'}</span><span class="so-cannon-mini-track"><i style="transform:scaleX(${pct / 100})"></i></span></button>`;
}
export function rocketPanel(r) {
  if (!valid(r)) return '<p class="so-note">صاروخ الغرفة غير متاح حاليًا.</p>';
  const pct = r.finished ? 100 : r.progress / r.goal * 100;
  const stages = r.stages.map((s) => `<li class="${s.launched ? 'is-done' : s.stage === r.stage ? 'is-now' : ''}">${art(s.stage)}<b>المرحلة ${s.stage}</b><small dir="ltr">${nf(s.goal)} 💎</small><span>🪙 ${nf(s.coins)} للحاضرين</span><span>👑 +${nf(s.topBonus)} لأكبر داعم</span>${s.launched ? '<em>انطلق ✓</em>' : ''}</li>`).join('');
  const top = r.top.length ? `<ol class="rk58-top">${r.top.map((t, i) => `<li><i>${i + 1}</i><b>${esc(t.person.name)}</b><span dir="ltr">${nf(t.pts)} 💎</span></li>`).join('')}</ol>` : '<p class="so-note">ما فيه دعم اليوم للحين. كن أول داعم!</p>';
  return `<section class="rk58-panel"><div class="rk58-hero">${art(r.stage, 'is-hero')}<span>${r.finished ? 'انطلقت كل الصواريخ اليوم 🎉' : `المرحلة ${esc(r.stage)} من 3`}</span></div>
  <div class="so-cannon-track" role="progressbar" aria-valuemin="0" aria-valuemax="${r.goal}" aria-valuenow="${r.progress}"><i style="transform:scaleX(${pct / 100})"></i></div>
  <p class="rk58-num"><b dir="ltr">${nf(r.progress)} / ${nf(r.goal)}</b> <small>طاقة اليوم</small></p>
  <p class="so-cannon-unit">كل جوهرة في هدايا الغرفة = طاقة واحدة. لما يكتمل الصاروخ ينطلق، وكل الموجودين بالغرفة ياخذون عملات، وأكبر داعم ياخذ مكافأة أكبر. الصاروخ يرجع صفر كل يوم الساعة 12 بالليل.</p>
  <button type="button" class="so-button so-primary so-cannon-support" data-so-action="open-panel" data-panel="gifts">أرسل هدية وعبّ الصاروخ</button>
  <h3>مراحل اليوم</h3><ol class="rk58-stages">${stages}</ol><h3>أكبر الداعمين اليوم</h3>${top}</section>`;
}
const seen = new Set();
export function rocketLaunch(ev) {
  if (!ev || typeof ev.id !== 'string' || seen.has(ev.id) || document.hidden) return false; seen.add(ev.id);
  const n = document.createElement('section'); n.className = 'rk58-launch'; n.setAttribute('role', 'status');
  const mine = ev.coins > 0 || ev.topBonus > 0;
  n.innerHTML = `<div class="rk58-fly">${art(ev.stage, 'is-fly')}<i class="rk58-flame" aria-hidden="true"></i></div>${Array.from({ length: 12 }, (_, k) => `<i class="rk58-smoke" style="--d:${k * 120}ms;--s:${0.6 + (k % 4) * 0.25}" aria-hidden="true"></i>`).join('')}${Array.from({ length: 18 }, (_, k) => `<i class="rk58-star" style="--x:${(k * 37) % 100}%;--d:${(k % 6) * 90}ms" aria-hidden="true"></i>`).join('')}<div class="rk58-card"><b>🚀 انطلق صاروخ المرحلة ${esc(ev.stage)}!</b>${mine ? `<span>حصلت على 🪙 ${nf((ev.coins || 0) + (ev.topBonus || 0))} عملة${ev.topBonus ? ' (منها مكافأة أكبر داعم)' : ''}</span>` : ''}${ev.top?.name ? `<small>أكبر داعم: ${esc(ev.top.name)}</small>` : ''}</div>`;
  document.body.appendChild(n);
  setTimeout(() => { n.classList.add('is-out'); setTimeout(() => n.remove(), 500); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 2000 : 4800);
  return true;
}
