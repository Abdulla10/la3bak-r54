/* R58y: صاروخ الغرفة — رحلة يومية على 7 كواكب. الزر واللوحة وحركة الإطلاق. كل الأرقام من الخادم. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number.isSafeInteger(n) && n >= 0 ? n.toLocaleString('en-US') : '—';
const V = 'r58y';
const ship = (cls = '') => `<img class="rk58-ship ${cls}" src="/assets/art58/rocket/ship.webp?v=${V}" alt="" decoding="async">`;
const planet = (n, cls = '') => `<img class="rk58-planet ${cls}" src="/assets/art58/planets/pl${Math.max(1, Math.min(7, n | 0))}.webp?v=${V}" alt="" decoding="async" loading="lazy">`;
const safeArt = (s) => typeof s === 'string' && /^\/assets\/art58\/(mic\/m|frames2\/f|bubbles\/b|boards\/b|souv\/s)\d{2}\.webp$|^\/assets\/art58\/pbg\/p\d{2}\.jpg$/.test(s) ? s : '';
const gift = (g) => g && typeof g.name === 'string' ? `<span class="rk58-gift" title="${esc(g.name)}">${safeArt(g.art) ? `<img src="${esc(g.art)}?v=${V}" alt="" loading="lazy" decoding="async">` : ''}<small>${esc(g.name)}</small></span>` : '';
const valid = (r) => r && r.v === 2 && Array.isArray(r.stages) && r.stages.length === 7 && Number.isSafeInteger(r.goal);
const MEDAL = ['🥇', '🥈', '🥉'];
export function rocketShortcut(r) {
  if (!valid(r)) return '';
  const pct = r.finished ? 100 : Math.min(100, Math.floor(r.progress / r.goal * 100));
  return `<button type="button" class="so-cannon-shortcut rk58-shortcut" data-so-action="open-panel" data-panel="rocket" aria-label="صاروخ الغرفة · الكوكب ${esc(r.stage)} ${esc(r.stages[r.stage - 1]?.name)} · ${pct}%">${ship('is-mini')}<span>${r.finished ? '✓' : pct + '%'}</span><span class="so-cannon-mini-track"><i style="transform:scaleX(${pct / 100})"></i></span></button>`;
}
export function rocketPanel(r) {
  if (!valid(r)) return '<p class="so-note">صاروخ الغرفة غير متاح حاليًا.</p>';
  const pct = r.finished ? 100 : r.progress / r.goal * 100;
  const target = r.stages[r.stage - 1];
  const planets = r.stages.map((s) => `<li class="${s.launched ? 'is-done' : s.stage === r.stage && !r.finished ? 'is-now' : ''}">
    <div class="rk58-pl-head">${planet(s.stage)}<div><b>${esc(s.stage)}. ${esc(s.name)}</b><small dir="ltr">⛽ ${nf(s.goal)}</small>${s.launched ? '<em>وصلها الصاروخ ✓</em>' : ''}</div></div>
    ${s.won ? `<p class="rk58-won">${s.won.winners.map((w) => `${MEDAL[w.rank - 1] || ''} ${esc(w.name)}`).join(' · ')}${s.won.luck ? ` · 🍀 ${esc(s.won.luck)}` : ''}</p>` : ''}<div class="rk58-prizes">${s.prizes.map((g, i) => `<div class="rk58-prize"><i>${MEDAL[i]}</i><span dir="ltr">${nf(g)} 💎</span>${(s.gifts[i] || []).map(gift).join('')}</div>`).join('')}<div class="rk58-prize is-luck"><i>🍀</i><span>هدية الحظ</span>${gift(s.luck)}</div></div></li>`).join('');
  const top = r.top.length ? `<ol class="rk58-top">${r.top.map((t, i) => `<li><i>${i < 3 ? MEDAL[i] : i + 1}</i><b>${esc(t.person.name)}</b><span dir="ltr">⛽ ${nf(t.pts)}</span></li>`).join('')}</ol>` : '<p class="so-note">ما أحد عبّى بترول اليوم للحين. كن الأول!</p>';
  return `<section class="rk58-panel"><div class="rk58-hero">${planet(target.stage, 'is-target')}${ship('is-hero')}<span>${r.finished ? 'وصل الصاروخ آخر كوكب اليوم 🎉' : `الوجهة: كوكب ${esc(target.name)} (${esc(r.stage)} من 7)`}</span></div>
  <div class="so-cannon-track" role="progressbar" aria-valuemin="0" aria-valuemax="${r.goal}" aria-valuenow="${r.progress}"><i style="transform:scaleX(${pct / 100})"></i></div>
  <p class="rk58-num"><b dir="ltr">⛽ ${nf(r.progress)} / ${nf(r.goal)}</b> <small>بترول الكوكب</small></p>
  <p class="so-cannon-unit">كل جوهرة في هدايا الغرفة = لتر بترول. لما يكتمل بترول الكوكب يوصل له الصاروخ: أكثر 3 عبّوا بترول اليوم ياخذون جواهر وهدية، وواحد من الحاضرين (قاعد 3 دقايق أو أكثر) ياخذ هدية الحظ. الرحلة ترجع من أول كل يوم الساعة 12 بالليل.</p>
  <button type="button" class="so-button so-primary so-cannon-support" data-so-action="open-panel" data-panel="gifts">أرسل هدية وعبّ بترول</button>
  <h3>أكثر من عبّى بترول اليوم</h3>${top}<h3>الكواكب وجوايزها</h3><ol class="rk58-planets">${planets}</ol></section>`;
}
const seen = new Set();
export function rocketLaunch(ev) {
  if (!ev || typeof ev.id !== 'string' || seen.has(ev.id) || document.hidden) return false; seen.add(ev.id);
  const n = document.createElement('section'); n.className = 'rk58-launch'; n.setAttribute('role', 'status');
  const mine = ev.gems > 0 || (Array.isArray(ev.gifts) && ev.gifts.length > 0);
  const what = [ev.gems > 0 ? `${nf(ev.gems)} 💎` : '', ...(Array.isArray(ev.gifts) ? ev.gifts.map(esc) : [])].filter(Boolean).join(' + ');
  const ws = Array.isArray(ev.winners) ? ev.winners.filter((w) => w?.person?.name).map((w) => `<small>${MEDAL[w.rank - 1] || ''} ${esc(w.person.name)}</small>`).join('') : '';
  n.innerHTML = `<div class="rk58-dest">${planet(ev.stage, 'is-dest')}</div><div class="rk58-fly">${ship('is-fly')}<i class="rk58-flame" aria-hidden="true"></i></div>${Array.from({ length: 12 }, (_, k) => `<i class="rk58-smoke" style="--d:${k * 120}ms;--s:${0.6 + (k % 4) * 0.25}" aria-hidden="true"></i>`).join('')}${Array.from({ length: 18 }, (_, k) => `<i class="rk58-star" style="--x:${(k * 37) % 100}%;--d:${(k % 6) * 90}ms" aria-hidden="true"></i>`).join('')}<div class="rk58-card"><b>🚀 وصل الصاروخ كوكب ${esc(ev.planet || '')}!</b>${mine ? `<span>${ev.rank > 0 ? `${MEDAL[ev.rank - 1]} مبروك! ` : '🍀 هدية الحظ لك! '}${what}</span>` : ''}${ws}${ev.luck?.name ? `<small>🍀 ${esc(ev.luck.name)}</small>` : ''}</div>`;
  document.body.appendChild(n);
  setTimeout(() => { n.classList.add('is-out'); setTimeout(() => n.remove(), 500); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 2500 : 5600);
  return true;
}
