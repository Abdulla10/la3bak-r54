/* R59: مدفع الغرفة الجديد — 3 مستويات (الأخضر، الأحمر، البنفسجي). الزر، اللوحة، والانفجار. كل الأرقام من الخادم. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number.isSafeInteger(n) && n >= 0 ? n.toLocaleString('en-US') : '—';
const V = 'r59a';
const art = (lv, cls = '') => `<img class="c59-art ${cls}" src="/assets/art58/cannon/v${Math.max(1, Math.min(3, lv | 0))}.webp?v=${V}" alt="" decoding="async">`;
const safe = (s) => typeof s === 'string' && /^\/assets\/[A-Za-z0-9_./-]+\.(webp|png|jpe?g)$/.test(s) && !s.includes('..') ? s : '';
const valid = (m) => m && m.v === 3 && Array.isArray(m.levels) && m.levels.length === 3 && Number.isSafeInteger(m.goal);
const face = (p) => p?.avatar && safe(p.avatar) ? `<img src="${esc(p.avatar)}" alt="" loading="lazy">` : `<b>${esc(String(p?.name || '؟').trim().charAt(0))}</b>`;
const MEDAL = ['🥇', '🥈', '🥉'];
const SLOT = { frame: 'إطار', 'mic-frame': 'إطار مايك', badge: 'شارة' };
const prizeTile = (p, cls = '') => `<div class="c59-prize ${cls}"><span class="c59-prize-art">${safe(p.art) ? `<img src="${esc(p.art)}" alt="" loading="lazy">` : `<i>${esc(p.icon || '🎁')}</i>`}</span><small>${esc(SLOT[p.slot] || '')}</small><b>${esc(p.name)}</b></div>`;
export function cannon3Shortcut(m) {
  if (!valid(m)) return '';
  if (typeof requestIdleCallback === 'function' && !preloaded) requestIdleCallback(() => preload()); 
  const pct = Math.min(100, Math.floor(m.pts / m.goal * 100));
  return `<button type="button" class="so-cannon-shortcut c59-shortcut" data-so-action="open-panel" data-panel="cannon3" aria-label="مدفع الغرفة · المستوى ${esc(m.level)} · ${pct}%">${art(m.level, 'is-mini')}<span>${pct}%</span><span class="so-cannon-mini-track"><i style="transform:scaleX(${pct / 100})"></i></span></button>`;
}
/** view: المستوى المعروض (1–3). الافتراضي المستوى الحالي. */
export function cannon3Panel(m, view, help = false) {
  if (!valid(m)) return '<p class="so-note">مدفع الغرفة غير متاح حاليًا.</p>';
  const lv = Number.isInteger(view) && view >= 1 && view <= 3 ? view : m.level, L = m.levels[lv - 1], now = lv === m.level;
  const done = lv < m.level, pct = now ? Math.min(100, m.pts / m.goal * 100) : done ? 100 : 0;
  const side = (n, dir) => n >= 1 && n <= 3 ? `<button type="button" class="c59-side is-${dir}" data-so-action="c59-level" data-level="${n}" aria-label="المستوى ${n}">${art(n)}</button>` : '<span class="c59-side is-empty"></span>';
  const winners = L.last?.winners?.length ? `<div class="c59-blasted"><h4>فجّروه${L.last.round ? ` · الجولة ${esc(L.last.round)}` : ''}</h4><ol>${L.last.winners.map((w) => `<li><span class="c59-face">${face(w.person)}</span><i>${MEDAL[w.rank - 1]}</i><b>${esc(w.person.name)}</b><small dir="ltr">⚡ ${nf(w.pts)}</small></li>`).join('')}</ol></div>` : '';
  const top = now && m.top?.length ? `<ol class="c59-top">${m.top.map((t, i) => `<li><i>${i < 3 ? MEDAL[i] : i + 1}</i><span class="c59-face">${face(t.person)}</span><b>${esc(t.person.name)}</b><small dir="ltr">⚡ ${nf(t.pts)}</small></li>`).join('')}</ol>` : '';
  return `<section class="c59-panel c59-c${esc(L.color)}" data-c59-level="${lv}">
  <header class="c59-head"><button type="button" class="c59-help" data-so-action="c59-help" aria-expanded="${help ? 'true' : 'false'}" aria-label="طريقة المدفع">؟</button><span class="c59-lv">LV${lv}</span><span></span></header>
  ${help ? '<p class="c59-helptext">كل 20 عملة بهدايا الغرفة = طاقة وحدة للمدفع. لما تكتمل طاقة المستوى ينفجر المدفع، وأكثر 3 ساهموا فيه ياخذون نفس الجوايز بالضبط، والأول ياخذ فوقها قطعة «للأول بس». بعدها ينتقل المدفع للمستوى اللي بعده، وبعد الثالث تبدأ جولة جديدة من الأول.</p>' : ''}
  <div class="c59-stage">${side(lv - 1, 'prev')}<div class="c59-main">${art(lv, 'is-hero')}<i class="c59-ring" aria-hidden="true"></i>${done ? '<em class="c59-badge-done">انفجر ✓</em>' : !now ? '<em class="c59-badge-lock">🔒 بعدين</em>' : ''}</div>${side(lv + 1, 'next')}</div>
  <nav class="c59-dots" aria-label="المستويات">${[1, 2, 3].map((n) => `<button type="button" data-so-action="c59-level" data-level="${n}" aria-current="${n === lv ? 'true' : 'false'}" aria-label="المستوى ${n}"></button>`).join('')}</nav>
  <p class="c59-need"><span>يحتاج</span><b dir="ltr">⚡ ${nf(now ? m.goal - m.pts : L.goal)}</b></p>
  <div class="c59-track" role="progressbar" aria-valuemin="0" aria-valuemax="${L.goal}" aria-valuenow="${now ? m.pts : done ? L.goal : 0}"><i style="transform:scaleX(${pct / 100})"></i></div>
  <p class="c59-meta"><span>مساهمتك <b dir="ltr">⚡ ${nf(now ? m.mine : 0)}</b></span><span dir="ltr">20 🪙 = 1 ⚡</span></p>
  <button type="button" class="c59-send" data-so-action="open-panel" data-panel="gifts"><b>إرسال هدية</b><small>أكثر 3 يساهمون يفجّرون المدفع وياخذون الجوايز</small></button>
  ${winners}${top ? `<h4 class="c59-h">أكثر المساهمين الحين</h4>${top}` : ''}
  <h4 class="c59-h">حوض الجوائز</h4>
  <div class="c59-pool is-n${L.items.length + 1}">${prizeTile(L.top1, 'is-top1')}<span class="c59-top1tag">للأول بس</span>${L.items.map((p) => prizeTile(p)).join('')}<div class="c59-prize"><span class="c59-prize-art"><i>🪙</i></span><small>عملات</small><b dir="ltr">${nf(L.coins)}</b></div></div>
  <p class="c59-note">الأوائل الثلاثة ياخذون نفس الجوايز بالضبط، والأول ياخذ فوقها «للأول بس».</p></section>`;
}
const seen = new Set();
/** R67b الانفجار بالرسومات الجديدة: الدائرة الذهبية تدور، أعلى مساهم بالإطار، أرقام ذهبية 5→1، المدفع يطلق والألعاب النارية، انفجار، وبعدين «تهانينا!». */
const FX = '/assets/art67/cannon/', FXV = 'r67b';
const fx = (n) => `${FX}${n}.webp?v=${FXV}`;
const CANNON_ART = ['cannon-green', 'cannon-red', 'cannon-purple'];
const FW = ['fireworks-gold', 'fireworks-purple', 'fireworks-pink'];
let preloaded = false;
function preload() { if (preloaded) return; preloaded = true; for (const n of ['wheel', 'frame', 'card', 'base', 'fire-sheet', 'boom-sheet', ...CANNON_ART, ...FW, 'num-1', 'num-2', 'num-3', 'num-4', 'num-5']) { const i = new Image(); i.decoding = 'async'; i.src = fx(n); } }
export function cannon3Blast(ev) {
  if (!ev || typeof ev.id !== 'string' || seen.has(ev.id) || document.hidden) return false; seen.add(ev.id);
  preload();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const list = Array.isArray(ev.winners) ? ev.winners.filter((w) => w?.person?.name) : [];
  const top = list.find((w) => w.rank === 1) || list[0];
  const lv = Math.max(1, Math.min(3, ev.level | 0));
  const n = document.createElement('section'); n.className = 'c59-blast c67-blast c67b'; n.setAttribute('role', 'status'); n.setAttribute('dir', 'rtl');
  const ws = list.map((w) => `<li><span class="c59-face">${face(w.person)}</span><i>${MEDAL[w.rank - 1] || ''}</i><b>${esc(w.person.name)}</b></li>`).join('');
  const mine = ev.mine && Array.isArray(ev.mine.items);
  const prize = mine ? `<p class="c67-prize">حصلت على ${ev.mine.items.map(esc).join(' + ')}${ev.mine.coins ? ` + 🪙 ${nf(ev.mine.coins)}` : ''}</p>` : '<p class="c67-prize">مبروك للفايزين بجوايز المدفع</p>';
  n.innerHTML = `<img class="c67b-wheel" src="${fx('wheel')}" alt="" decoding="async">
  <div class="c67b-fws" aria-hidden="true"></div>
  <div class="c67b-top">${top ? `<span class="c67b-frame"><span class="c67b-face">${face(top.person)}</span><img src="${fx('frame')}" alt="" decoding="async"></span><em>أعلى 1 مساهم</em><small>${esc(top.person.name)}</small>` : ''}</div>
  <img class="c67b-num" data-c67-num src="${fx('num-5')}" alt="5">
  <div class="c67b-cannon"><img src="${fx(CANNON_ART[lv - 1])}" alt="" decoding="async"><i class="c67b-fire" data-c67-fire aria-hidden="true"></i></div>
  <i class="c67b-boom" aria-hidden="true"></i><i class="c59-flash" aria-hidden="true"></i>${Array.from({ length: 22 }, (_, k) => `<i class="c59-spark" style="--a:${k * 16.4}deg;--d:${(k % 5) * 40}ms" aria-hidden="true"></i>`).join('')}
  <div class="c67-card c67b-card" role="dialog" aria-label="تهانينا"><img class="c67b-cardbg" src="${fx('card')}" alt=""><button type="button" class="c67-x" data-c67-ok aria-label="إغلاق">×</button><span class="c67b-prize"><img class="c67b-base" src="${fx('base')}" alt=""><img class="c67b-prizeart" src="${fx(CANNON_ART[lv - 1])}" alt=""></span><h3>تهانينا!</h3>${prize}${ws ? `<ol>${ws}</ol>` : ''}<button type="button" class="c67-ok" data-c67-ok>حسنًا</button></div>`;
  document.body.appendChild(n);
  let done = false; const timers = [];
  const close = () => { if (done) return; done = true; timers.forEach(clearTimeout); n.classList.add('is-out'); setTimeout(() => n.remove(), 450); };
  n.addEventListener('click', (e) => { if (e.target.closest('[data-c67-ok]')) close(); });
  const num = n.querySelector('[data-c67-num]'), fire = n.querySelector('[data-c67-fire]'), fws = n.querySelector('.c67b-fws'), step = reduced ? 400 : 1000;
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const burst = (k) => {
    if (reduced) return;
    for (let j = 0; j < 2; j++) {
      const b = document.createElement('i'); b.className = 'c67b-fw';
      b.style.cssText = `--x:${8 + Math.random() * 74}%;--y:${6 + Math.random() * 46}%;--s:${0.7 + Math.random() * 0.7};background-image:url(${fx(FW[(k + j) % 3])});animation-delay:${j * 0.35}s`;
      fws.append(b); setTimeout(() => b.remove(), 1600);
    }
  };
  const tick = (k) => { if (k > 0) { num.src = fx('num-' + (5 - k)); num.alt = String(5 - k); } replay(num, 'is-pop'); replay(fire, 'is-shoot'); burst(k); };
  tick(0);
  for (let k = 1; k <= 4; k++) timers.push(setTimeout(() => tick(k), step * k));
  timers.push(setTimeout(() => { n.classList.add('is-boom'); burst(5); burst(6); }, step * 5));
  timers.push(setTimeout(() => n.classList.add('is-card'), step * 5 + (reduced ? 300 : 1200)));
  timers.push(setTimeout(close, step * 5 + 10000));
  return true;
}
