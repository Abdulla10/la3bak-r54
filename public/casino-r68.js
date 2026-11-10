/* R68z42: «جاكبوت لعبك» (سلوت) + «عجلة الأكل». الخادم يحدد كل النتائج، والواجهة ترسم وتحرّك بس. رسومات أصلية. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const kf = (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K' : nf(n);
const api = (u, body) => fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json().catch(() => ({ ok: false, error: 'خطأ بالاتصال.' }))).catch(() => ({ ok: false, error: 'انقطع الاتصال.' }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const COIN = '<i class="cz-coin" aria-hidden="true"></i>';

/* ======================= السلوت ======================= */
const ART = '/assets/art68/casino/';
const SYM = { ten: 'ten', j: 'j', q: 'q', k: 'k', a: 'a', gem: 'gem', crown: 'crown', falcon: 'falcon', lion: 'lion', wild: 'wild', free: 'free', jack: 'jack' };
const KEYS = Object.keys(SYM);
const tile = (s) => `<div class="cz-t cz-t-${s}"><img src="${ART}sym-${SYM[s] || 'ten'}.webp" alt="" draggable="false"></div>`;
const SL = { st: null, bet: 0, busy: false, last: null, auto: false };
function slotHTML() {
  const st = SL.st; if (!st) return '<p class="cz-load">جاري التحميل…</p>';
  const lineBet = st.bets[SL.bet], total = lineBet * st.lines, free = st.free;
  const grid = SL.last?.grid || [0, 1, 2, 3, 4].map((r) => [0, 1, 2].map((i) => KEYS[(r * 3 + i * 5) % 9]));
  return `<div class="cz cz-slot" dir="rtl"><header class="cz-top"><button type="button" class="cz-x" data-cz="close" aria-label="إغلاق">✕</button><h1 class="cz-title">جاكبوت <span>لعبك</span></h1><span class="cz-bal">${COIN}<b data-cz-bal>${nf(st.coins)}</b></span></header>
  <section class="cz-jp"><div class="cz-feed">${st.feed.length ? st.feed.map((f) => `<p><b>${esc(f.name)}</b> فاز بـ <em>${nf(f.win)}</em>${COIN}${f.kind === 'jack' ? ' 🏆' : ''}</p>`).join('') : '<p class="cz-dim">أول فائز كبير يطلع هنا</p>'}</div>
   <p class="cz-jphint">5 رموز «JACKPOT» بأي مكان = تفوز بـ ${[5, 15, 40, 100][SL.bet]}% من الجاكبوت</p></section>
  <section class="cz-machine" style="background-image:url(${ART}slot-frame.webp)"><div class="cz-mjp"><small>${['MINI', 'MAJOR', 'GRAND', 'MEGA'][SL.bet]} JACKPOT</small><b data-cz-jp>${nf(st.jackpot)}</b></div>
   <div class="cz-reels">${grid.map((col, r) => `<div class="cz-reel" data-reel="${r}"><div class="cz-strip">${col.map(tile).join('')}</div></div>`).join('')}<svg class="cz-lines" viewBox="0 0 500 300" preserveAspectRatio="none" aria-hidden="true"></svg></div>
   <div class="cz-mwin"><small>فوز</small><b data-cz-win>${nf(SL.last?.win || 0)}</b></div>
   <button type="button" class="cz-mbtn cz-mminus" data-cz="bet-" aria-label="أقل" ${free ? 'disabled' : ''}></button>
   <button type="button" class="cz-spin" data-cz="spin" ${SL.busy ? 'disabled' : ''}>${free ? 'مجاني' : 'دوّر'}</button>
   <button type="button" class="cz-mbtn cz-mplus" data-cz="bet+" aria-label="أكثر" ${free ? 'disabled' : ''}></button>
   <div class="cz-mtot"><small>الرهان</small><b>${nf(free ? 0 : total)}</b></div></section>
  ${free ? `<p class="cz-freeb">🎁 لفات مجانية باقية: <b>${free.left}</b></p>` : ''}<p class="cz-msg" role="status" data-cz-msg></p>
  <footer class="cz-bar2"><span>${st.lines} خط × <b>${nf(lineBet)}</b></span><button type="button" class="cz-auto${SL.auto ? ' on' : ''}" data-cz="auto">تلقائي</button></footer>
   <p class="cz-note">العب بعملات الموقع بس. النتيجة يحددها الخادم.</p></div>`;
}
async function slotSpin(root) {
  if (SL.busy) return; SL.busy = true;
  const msg = root.querySelector('[data-cz-msg]'); if (msg) msg.textContent = '';
  root.querySelector('[data-cz="spin"]')?.setAttribute('disabled', '');
  root.querySelector('.cz-lines').innerHTML = '';
  const reels = [...root.querySelectorAll('.cz-reel')];
  reels.forEach((rl) => { const s = rl.querySelector('.cz-strip'); s.innerHTML = Array.from({ length: 18 }, () => tile(KEYS[Math.floor(Math.random() * KEYS.length)])).join('') + s.innerHTML; s.style.transition = 'none'; s.style.transform = 'translateY(-' + (18 * 100 / 21) + '%)'; s.offsetHeight; rl.classList.add('spinning'); });
  const r = await api('/api/slot/spin', { bet: SL.bet });
  if (!r.ok) { reels.forEach((rl) => rl.classList.remove('spinning')); SL.busy = false; SL.auto = false; paintSlot(root); const m = root.querySelector('[data-cz-msg]'); if (m) m.textContent = r.error || 'تعذّر.'; return; }
  for (let i = 0; i < 5; i++) {
    const rl = reels[i], s = rl.querySelector('.cz-strip');
    s.innerHTML = r.grid[i].map(tile).join('') + Array.from({ length: 18 }, () => tile(KEYS[Math.floor(Math.random() * KEYS.length)])).join('');
    s.style.transition = 'none'; s.style.transform = 'translateY(-' + (18 * 100 / 21) + '%)'; s.offsetHeight;
    s.style.transition = `transform ${0.55 + i * 0.18}s cubic-bezier(.2,.8,.2,1.05)`; s.style.transform = 'translateY(0)'; rl.classList.remove('spinning');
  }
  await sleep(1400);
  reels.forEach((rl) => { const s = rl.querySelector('.cz-strip'); s.innerHTML = r.grid[reels.indexOf(rl)].map(tile).join(''); s.style.transition = 'none'; s.style.transform = 'none'; });
  SL.last = r; SL.st = { ...SL.st, jackpot: r.jackpot, coins: r.coins, free: r.free };
  // الخطوط الفايزة
  const svg = root.querySelector('.cz-lines'); const cols = ['#ffe14d', '#4dffb8', '#ff6bd5', '#6bc8ff', '#ff9a4d'];
  svg.innerHTML = r.wins.slice(0, 12).map((w, k) => `<polyline points="${SL.st.lineMap[w.line].map((row, c) => `${50 + c * 100},${50 + row * 100}`).join(' ')}" fill="none" stroke="${cols[k % 5]}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`).join('');
  const hit = new Set(); r.wins.forEach((w) => SL.st.lineMap[w.line].slice(0, w.count).forEach((row, c) => hit.add(c + ':' + row)));
  reels.forEach((rl, c) => rl.querySelectorAll('.cz-t').forEach((t, row) => t.classList.toggle('hit', hit.has(c + ':' + row))));
  const bal = root.querySelector('[data-cz-bal]'); if (bal) bal.textContent = nf(r.coins);
  const jp = root.querySelector('[data-cz-jp]'); if (jp) jp.textContent = nf(r.jackpot);
  const wv = root.querySelector('[data-cz-win]'); if (wv) wv.textContent = nf(r.win);
  const m = root.querySelector('[data-cz-msg]');
  if (r.jackWin) banner(root, `🏆 JACKPOT ${r.tier}!`, `+${nf(r.jackWin)}`);
  else if (r.freeWon) banner(root, '🎁 لفات مجانية!', `+${r.freeWon} لفة`);
  else if (r.win >= r.total * 5) banner(root, 'BIG WIN!', `+${nf(r.win)}`);
  else if (m) m.textContent = r.win ? `فزت ${nf(r.win)} عملة 🎉` : '';
  SL.busy = false;
  const spinB = root.querySelector('[data-cz="spin"]'); if (spinB) { spinB.removeAttribute('disabled'); spinB.textContent = r.free ? 'مجاني' : 'دوّر'; }
  const fb = root.querySelector('.cz-freeb'); if (fb) fb.innerHTML = r.free ? `🎁 لفات مجانية باقية: <b>${r.free.left}</b>` : '';
  if (r.free && !fb) paintSlot(root, true);
  if (SL.auto || r.free) { await sleep(r.win ? 1600 : 700); if ((SL.auto || SL.st.free) && root.isConnected) slotSpin(root); }
}
function banner(root, a, b) { const el = document.createElement('div'); el.className = 'cz-ban'; el.innerHTML = `<b>${esc(a)}</b><span>${esc(b)}</span>`; root.querySelector('.cz')?.append(el); setTimeout(() => el.remove(), 2200); }
function paintSlot(root, keepGrid) { root.innerHTML = slotHTML(); if (!keepGrid) return; }

/* ======================= عجلة الأكل ======================= */
const FOOD_EMOJI = { chicken: '🍗', tomato: '🍅', fish: '🐟', apple: '🍎', shrimp: '🦐', carrot: '🥕', steak: '🥩', corn: '🌽' };
const FIMG = (id, c = '') => `<img class="fw-img ${c}" src="${ART}food-${id}.webp" alt="" draggable="false">`;
const FW_POS = [[61.9, 21.4], [75.8, 37.1], [75.2, 57.3], [61.9, 71.5], [41.1, 71.4], [27.6, 57.4], [26.9, 37.2], [40.9, 21.4]];
const FW = { st: null, chip: 0, timer: 0, poll: 0, shownRound: 0, spinning: false, msg: '' };
function foodHTML() {
  const s = FW.st; if (!s) return '<p class="cz-load">جاري التحميل…</p>';
  const N = s.foods.length;
  const items = s.foods.map((f, i) => { const a = (i / N) * Math.PI * 2 - Math.PI / 2; const [x, y] = FW_POS[i] || [50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30];
    return `<button type="button" class="fw-it${s.phase === 'show' && s.result === i && !FW.spinning ? ' win' : ''}" data-fw-item="${i}" style="left:${x}%;top:${y}%" ${s.phase !== 'bet' ? 'disabled' : ''}>${FIMG(f.id)}<small>×${f.mult}</small><b>${kf(s.totals[i])}</b>${s.mine[i] ? `<em>${kf(s.mine[i])}</em>` : ''}</button>`; }).join('');
  const sec = Math.ceil(s.left / 1000);
  return `<div class="cz cz-food" dir="rtl"><header class="cz-top"><button type="button" class="cz-x" data-cz="close" aria-label="إغلاق">✕</button><h1 class="cz-title fw-t">عجلة <span>الأكل</span></h1><span class="cz-bal">${COIN}<b>${nf(s.coins)}</b></span></header>
  <p class="fw-round">الجولة ${nf(s.round)}</p>
  <section class="fw-wheel" style="background-image:url(${ART}fw-wheel.webp)">${items}
   <div class="fw-hub"><small>${s.phase === 'bet' ? 'وقت الرهان' : 'النتيجة'}</small><b data-fw-sec>${s.phase === 'bet' ? sec + 's' : s.result !== null && !FW.spinning ? FIMG(s.foods[s.result].id, 'fw-himg') : '…'}</b></div><img class="fw-cat" src="${ART}fw-cat.webp" alt="" draggable="false"></section>
  <p class="cz-msg" role="status">${esc(FW.msg)}</p>
  <section class="fw-chips" role="radiogroup" aria-label="قيمة الرهان">${s.chips.map((c, i) => `<button type="button" role="radio" aria-checked="${FW.chip === i}" class="fw-chip${FW.chip === i ? ' on' : ''}" data-fw-chip="${i}"><b>${kf(c)}</b></button>`).join('')}</section>
  <section class="fw-info"><span><small>عملاتك</small><b>${nf(s.coins)}</b></span><span><small>رهانك بالجولة</small><b>${nf(s.mine.reduce((a, b) => a + b, 0))}</b></span><span><small>فايز اليوم</small><b>${nf(s.today)}</b></span></section>
  <section class="fw-hist"><small>آخر النتايج:</small>${s.history.map((h, k) => `<span class="${k === 0 ? 'new' : ''}">${FIMG(s.foods[h].id)}</span>`).join('')}</section>
  ${s.phase === 'show' && !FW.spinning ? `<div class="fw-res"><h3>نتيجة الجولة ${nf(s.round)}: ${FIMG(s.foods[s.result].id, 'fw-rimg')} ×${s.foods[s.result].mult}</h3><p>${s.myWin ? `فزت <b>${nf(s.myWin)}</b> عملة 🎉` : s.mine.some(Boolean) ? 'ما حالفك الحظ هالمرة' : 'ما راهنت بهالجولة'}</p>${s.top.length ? `<ol class="fw-top">${s.top.map((t, k) => `<li><span>${['🥇', '🥈', '🥉'][k]}</span><b>${esc(t.name)}</b><em>${nf(t.win)}</em></li>`).join('')}</ol>` : ''}</div>` : ''}
  <p class="cz-note">كل جولة 30 ثانية رهان. اختار قيمة الرهان واضغط على الأكلة. احتمال الأكلة أقل كل ما كان مضاعفها أكبر.</p></div>`;
}
async function foodLoad(root) { const s = await api('/api/foodwheel'); if (!root.isConnected) return; if (s.ok) { const prev = FW.st; FW.st = s; if (s.phase === 'show' && FW.shownRound !== s.round && prev && prev.round === s.round && prev.phase === 'bet') { FW.shownRound = s.round; spinAnim(root); return; } if (s.phase === 'show') FW.shownRound = s.round; if (s.phase === 'bet' && prev?.phase === 'show') FW.msg = ''; } root.innerHTML = foodHTML(); }
async function spinAnim(root) {
  FW.spinning = true; root.innerHTML = foodHTML();
  const its = [...root.querySelectorAll('.fw-it')]; const N = its.length, target = FW.st.result; let k = 0; const steps = N * 3 + ((target - 0 + N) % N);
  for (let i = 0; i <= steps; i++) { its.forEach((e) => e.classList.remove('lit')); its[k % N]?.classList.add('lit'); k++; await sleep(60 + Math.pow(i / steps, 3) * 260); }
  FW.spinning = false; root.innerHTML = foodHTML();
}

/* ======================= التركيب ======================= */
function mount(root) {
  css();
  const kind = root.dataset.casino;
  if (kind === 'slot') { root.innerHTML = slotHTML(); api('/api/slot').then((s) => { if (s.ok && root.isConnected) { SL.st = s; root.innerHTML = slotHTML(); } }); }
  if (kind === 'food') { root.innerHTML = foodHTML(); foodLoad(root); clearInterval(FW.poll); FW.poll = setInterval(() => { if (!root.isConnected) return clearInterval(FW.poll); if (FW.spinning) return; if (FW.st?.phase === 'bet' && FW.st.left > 1500) { FW.st.left -= 1000; const el = root.querySelector('[data-fw-sec]'); if (el) el.textContent = Math.ceil(FW.st.left / 1000) + 's'; if (Math.ceil(FW.st.left / 1000) % 5 === 0) foodLoad(root); return; } foodLoad(root); }, 1000); }
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cz],[data-fw-item],[data-fw-chip]'); if (!b) return;
    const a = b.dataset.cz;
    if (a === 'close') { history.length > 1 ? history.back() : ((globalThis.__LA3BAK_NAV__ || location).hash = '#/games'); return; }
    if (a === 'spin') return slotSpin(root);
    if (a === 'auto') { SL.auto = !SL.auto; b.classList.toggle('on', SL.auto); if (SL.auto) slotSpin(root); return; }
    if (a === 'bet-' || a === 'bet+') { if (SL.busy) return; SL.bet = Math.max(0, Math.min(SL.st.bets.length - 1, SL.bet + (a === 'bet+' ? 1 : -1))); root.innerHTML = slotHTML(); return; }
    if (b.dataset.fwChip !== undefined) { FW.chip = Number(b.dataset.fwChip); root.innerHTML = foodHTML(); return; }
    if (b.dataset.fwItem !== undefined) { const r = await api('/api/foodwheel/bet', { item: Number(b.dataset.fwItem), chip: FW.st.chips[FW.chip] }); if (r.ok) { FW.st = r; FW.msg = ''; } else FW.msg = r.error || 'تعذّر.'; root.innerHTML = foodHTML(); }
  });
}
export const casinoHTML = (kind) => `<div class="cz-host" data-casino="${kind}"></div>`;
if (typeof document !== 'undefined' && !globalThis.__CZ68__) {
  globalThis.__CZ68__ = true;
  let q = 0; const scan = () => {
    const ovs = [...document.querySelectorAll('body > .cz-ov')];
    document.querySelectorAll('.cz-host[data-casino]').forEach((ph) => {
      if (ph._ov && ph._ov.isConnected) return;
      const reuse = ovs.find((o) => o.dataset.casino === ph.dataset.casino && ![...document.querySelectorAll('.cz-host')].some((x) => x !== ph && x._ov === o));
      if (reuse) { ph._ov = reuse; return; }
      const ov = document.createElement('div'); ov.className = 'cz-ov'; ov.dataset.casino = ph.dataset.casino; document.body.append(ov); ph._ov = ov; mount(ov); document.documentElement.classList.add('cz-open');
    });
    for (const ov of document.querySelectorAll('body > .cz-ov')) { if (![...document.querySelectorAll('.cz-host')].some((x) => x._ov === ov)) { ov.remove(); if (ov.dataset.casino === 'slot') SL.auto = false; else clearInterval(FW.poll); } }
    if (!document.querySelector('body > .cz-ov')) document.documentElement.classList.remove('cz-open');
  };
  new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; scan(); }); }).observe(document.documentElement, { childList: true, subtree: true }); scan();
}
function css() {
  if (document.getElementById('cz-css')) return;
  const st = document.createElement('style'); st.id = 'cz-css';
  st.textContent = `
.cz-host{min-height:60vh}.cz-ov{position:fixed;inset:0;z-index:9500;overflow:auto;-webkit-overflow-scrolling:touch;background:#14052b}html.cz-open body{overflow:hidden}
.cz{min-height:100%;padding:calc(env(safe-area-inset-top) + 8px) 10px calc(env(safe-area-inset-bottom) + 16px);color:#fff;font-family:Cairo,Tahoma,sans-serif;position:relative}
.cz-slot{background:radial-gradient(120% 60% at 50% 0,#6a1fc9,#2a0a56 55%,#14052b)}
.cz-top{display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:8px}
.cz-x{width:40px;height:40px;border-radius:50%;border:0;background:#ffffff1f;color:#fff;font-size:18px;cursor:pointer}
.cz-title{margin:0;text-align:center;font:italic 900 26px/1 Cairo,Tahoma,sans-serif;background:linear-gradient(180deg,#fff,#ffd6ff 40%,#d96bff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #5a0a8a) drop-shadow(0 0 10px #c46bff)}
.cz-title span{background:linear-gradient(180deg,#fff3b0,#ffb800);-webkit-background-clip:text;background-clip:text}
.cz-bal{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:99px;background:#0006;font-weight:900;font-size:13px}
.cz-coin{display:inline-block;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6b0,#ffc83d 45%,#b97a00);box-shadow:inset 0 0 0 1.5px #a86b00;vertical-align:middle}
.cz-jp{position:relative;margin:10px 0;padding:10px;border-radius:18px;background:linear-gradient(180deg,#3d1080cc,#1e0640cc);border:1.5px solid #c98bff66}
.cz-feed{max-height:84px;overflow:hidden;font-size:12px}.cz-feed p{margin:2px 0;opacity:.9}.cz-feed em{color:#ffd34d;font-style:normal;font-weight:900}.cz-dim{opacity:.5}
.cz-jpbox{display:flex;flex-direction:column;align-items:center;margin-top:6px}.cz-jpbox small{font-size:11px;padding:1px 10px;border-radius:99px;background:#7b2ff0;font-weight:900;letter-spacing:1px}
.cz-jpv{font:900 34px/1.1 Arial,sans-serif;color:#ffd34d;text-shadow:0 2px 0 #8a4a00,0 0 16px #ffb800;direction:ltr}
.cz-jpbox i{font:italic 900 16px/1 Arial,sans-serif;color:#ff9ef0;letter-spacing:2px}.cz-jphint{margin:4px 0 0;text-align:center;font-size:11px;opacity:.75}
.cz-reels-wrap{padding:8px;border-radius:20px;background:linear-gradient(180deg,#ffd76a,#b37400);box-shadow:0 0 24px #c46bff88}
.cz-reels{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding:6px;border-radius:14px;background:#120530;direction:ltr}
.cz-reel{position:relative;aspect-ratio:1/3;contain:paint;overflow:hidden;border-radius:10px;background:linear-gradient(180deg,#1e0a46,#2d0f63,#1e0a46)}
.cz-strip{display:flex;flex-direction:column;will-change:transform}
.cz-reel.spinning .cz-strip{animation:czblur .12s linear infinite}@keyframes czblur{0%{filter:blur(0)}50%{filter:blur(2px)}100%{filter:blur(0)}}
.cz-t{flex:none;aspect-ratio:1;display:grid;place-items:center;border-radius:10px;margin:2px;background:radial-gradient(circle at 50% 35%,#ffffff1a,#0000)}
.cz-t.hit{box-shadow:0 0 0 2.5px #ffe14d,0 0 16px #ffd34d;animation:czhit .6s ease-in-out infinite alternate}@keyframes czhit{to{transform:scale(1.07)}}
.cz-l{font:900 clamp(22px,8vw,40px)/1 Georgia,serif;background:linear-gradient(180deg,#fff,var(--c1) 35%,var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 #0008)}
.cz-e{font-size:clamp(24px,8.6vw,42px);line-height:1;filter:drop-shadow(0 3px 4px #000a)}.cz-gold{filter:drop-shadow(0 0 6px #ffc83d) drop-shadow(0 3px 4px #000a)}
.cz-sp{display:flex;flex-direction:column;align-items:center;justify-content:center;width:88%;height:88%;border-radius:12px}
.cz-sp b{font:italic 900 clamp(9px,2.8vw,13px)/1 Arial,sans-serif;letter-spacing:.5px}
.cz-wild{background:linear-gradient(180deg,#ffd76a,#c97800);color:#4a1a00;box-shadow:inset 0 0 0 2px #fff4}.cz-wild .cz-e{font-size:clamp(18px,6vw,30px)}
.cz-free{background:linear-gradient(180deg,#ff7a2e,#c2185b);color:#fff}.cz-free b{font-size:clamp(13px,4.2vw,20px)}
.cz-jack{background:radial-gradient(circle,#ffe16b,#d18a00 70%);color:#7a1d00;border-radius:50%}.cz-jack .cz-e{font-size:clamp(14px,4.8vw,24px)}.cz-jack b{font-size:clamp(7px,2.1vw,10px)}
.cz-lines{position:absolute;inset:6px;width:calc(100% - 12px);height:calc(100% - 12px);pointer-events:none}
.cz-freeb{margin:8px 0 0;text-align:center;font-weight:900;color:#3a1a00}.cz-msg{min-height:20px;margin:8px 0 0;text-align:center;font-weight:900;color:#ffe14d}
.cz-bar{margin-top:10px;padding:10px;border-radius:18px;background:linear-gradient(180deg,#2d0a5e,#1a063a);border:1px solid #c98bff44}
.cz-cells{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.cz-cells span{display:flex;flex-direction:column;align-items:center;padding:4px;border-radius:12px;background:#0005}.cz-cells small{font-size:11px;opacity:.7}.cz-cells b{font-size:16px;direction:ltr}
.cz-ctrl{display:flex;align-items:center;gap:8px;margin-top:10px}
.cz-betsel{display:flex;align-items:center;gap:8px;padding:4px;border-radius:99px;background:#0006;direction:ltr}.cz-betsel button{width:34px;height:34px;border-radius:50%;border:0;background:#ffffff26;color:#fff;font-size:20px;cursor:pointer}.cz-betsel b{min-width:44px;text-align:center}
.cz-auto{padding:10px 14px;border-radius:99px;border:1.5px solid #ffd34d;background:transparent;color:#ffd34d;font-weight:900;cursor:pointer}.cz-auto.on{background:#ffd34d;color:#3a2600}
.cz-spin{flex:1;padding:14px;border-radius:99px;border:0;font:900 20px/1 Cairo,Tahoma,sans-serif;color:#fff;background:linear-gradient(180deg,#7dff6b,#16a314);box-shadow:0 5px 0 #0a6a0a,0 0 16px #7dff6b88;cursor:pointer}.cz-spin:disabled{filter:grayscale(.7);opacity:.7}
.cz-note{margin:8px 0 0;text-align:center;font-size:11px;opacity:.6}
.cz-ban{direction:ltr;position:fixed;left:0;right:0;top:40%;z-index:5;display:flex;flex-direction:column;align-items:center;pointer-events:none;animation:czban 2.2s ease both}
.cz-ban b{font:italic 900 44px/1 Arial,Tahoma,sans-serif;color:#ffe14d;-webkit-text-stroke:2px #8a3b00;text-shadow:0 0 24px #ffb800}.cz-ban span{font:900 26px/1.4 Arial,sans-serif;color:#fff;text-shadow:0 2px 8px #000}
@keyframes czban{0%{transform:scale(2.4);opacity:0}15%{transform:scale(1);opacity:1}85%{opacity:1}100%{opacity:0}}
.cz-load{padding:40px;text-align:center;color:#fff}
/* عجلة الأكل */
.cz-food{background:linear-gradient(180deg,#3fa9ff 0,#7fd0ff 40%,#bfe9a8 70%,#e0a24a 100%)}
.fw-t{background:linear-gradient(180deg,#fff,#fff3b0);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 3px 0 #c2410c)}
.fw-round{margin:6px 0 0;text-align:center;font-weight:900;color:#7a2e00}
.fw-wheel{position:relative;width:min(94vw,440px);aspect-ratio:1;margin:6px auto 0}
.fw-spokes{position:absolute;inset:0}.fw-spokes i{position:absolute;left:50%;top:50%;width:6px;height:40%;margin-left:-3px;transform-origin:50% 0;background:linear-gradient(#b5651d,#7a3e12);border-radius:3px}
.fw-wheel::before{content:"";position:absolute;inset:6%;border-radius:50%;border:8px solid #b5651d;box-shadow:inset 0 0 0 3px #e9a45b}
.fw-it{position:absolute;width:23%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:4px solid #fff;background:radial-gradient(circle at 50% 40%,#fffbe8,#ffe2a6);color:#7a2e00;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;cursor:pointer;box-shadow:0 4px 0 #c47a2c,0 6px 12px #0004;padding:0;font-family:inherit}
.fw-it:disabled{cursor:default;opacity:1!important}.fw-e{font-size:clamp(22px,7vw,34px);line-height:1}.fw-it small{font-size:9px;font-weight:800;color:#a0521d!important}.fw-it b{font-size:11px;direction:ltr;color:#7a2e00!important}
.fw-it em{position:absolute;top:-6px;inset-inline-end:-6px;font-style:normal;font-size:10px;font-weight:900;background:#16a314;color:#fff;border-radius:99px;padding:1px 6px;border:2px solid #fff}
.fw-it.lit{box-shadow:0 0 0 5px #ffe14d,0 0 26px #ffb800;transform:translate(-50%,-50%) scale(1.08)}
.fw-it.win{border-color:#ff2e4d;box-shadow:0 0 0 5px #ff2e4d,0 0 30px #ff2e4d;animation:fwwin .5s ease-in-out infinite alternate}@keyframes fwwin{to{transform:translate(-50%,-50%) scale(1.1)}}
.fw-hub{position:absolute;left:50%;top:50%;width:30%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#ffb15e,#c2610f);border:5px solid #fff;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;box-shadow:0 6px 0 #8a3e00}
.fw-chef{font-size:clamp(20px,6vw,30px)}.fw-hub small{font-size:10px;font-weight:800}.fw-hub b{font:900 clamp(18px,5vw,26px)/1 Arial,sans-serif}
.fw-chips{display:flex;justify-content:center;gap:6px;margin-top:8px}.fw-chip{width:58px;height:58px;border-radius:50%;border:3px dashed #fff;background:radial-gradient(circle,#4fa8ff,#0d47a1);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 4px 0 #0a2f6a}.fw-chip.on{background:radial-gradient(circle,#7dff6b,#16a314);box-shadow:0 0 0 3px #ffe14d,0 4px 0 #0a6a0a;transform:translateY(-3px)}
.fw-info{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}.fw-info span{display:flex;flex-direction:column;align-items:center;padding:6px;border-radius:14px;background:#c2185bdd;color:#fff}.fw-info small{font-size:11px;opacity:.85}.fw-info b{direction:ltr}
.fw-hist{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:8px;padding:6px 10px;border-radius:99px;background:#7a1d3a;color:#fff;font-size:18px}.fw-hist small{font-size:11px;margin-inline-end:4px}.fw-hist .new{background:#ffe14d;border-radius:50%;padding:0 2px}
.fw-res{margin:10px 0 0;padding:12px;border-radius:18px;background:linear-gradient(180deg,#3d6bff,#5b2fd6);color:#fff;text-align:center}.fw-res h3{margin:0 0 4px}.fw-res p{margin:0}
.fw-top{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px}.fw-top li{display:flex;align-items:center;gap:8px;padding:4px 10px;border-radius:12px;background:#0003}.fw-top b{flex:1;text-align:right}.fw-top em{font-style:normal;color:#ffe14d;font-weight:900}
.cz-food .cz-note{color:#5a2a00;opacity:.8}.cz-food .cz-msg{color:#b3121e}
.cz-machine{position:relative;width:min(100%,560px);margin:6px auto 0;aspect-ratio:790/539;background:center/100% 100% no-repeat;container-type:inline-size;direction:ltr}
.cz-machine .cz-reels{position:absolute;left:14.4%;top:27.6%;width:71.2%;height:48.4%;display:grid;grid-template-columns:repeat(5,1fr);gap:0;padding:0;background:none;border-radius:0}
.cz-machine .cz-reel{height:100%;aspect-ratio:auto;container-type:size;background:none;border-radius:0}
.cz-machine .cz-t{height:33.333cqh;aspect-ratio:auto;margin:0;padding:4%;border-radius:8px;background:none}.cz-t img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;filter:drop-shadow(0 2px 3px #0009)}
.cz-machine .cz-lines{inset:0;width:100%;height:100%}
.cz-mjp,.cz-mwin,.cz-mtot{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;text-align:center}
.cz-mjp{left:30.4%;top:13.2%;width:39.9%;height:10.6%}.cz-mjp small{margin-top:.8cqw;font:900 1.8cqw/1 Arial,sans-serif;color:#ffb3f2;letter-spacing:.3cqw}.cz-mjp b{font:900 4.6cqw/1.05 Arial,sans-serif;color:#ffd34d;text-shadow:0 .3cqw 0 #8a4a00,0 0 2cqw #ffb800}
.cz-mwin{left:10.8%;top:85%;width:17.1%;height:7.2%}.cz-mtot{left:72.8%;top:85%;width:17.3%;height:7.2%}
.cz-mwin small,.cz-mtot small{font-size:1.7cqw;font-weight:800;opacity:.8}.cz-mwin b,.cz-mtot b{font:900 2.8cqw/1.1 Arial,sans-serif;color:#ffe14d}
.cz-mbtn{position:absolute;top:85.2%;height:6.6%;border:0;background:none;cursor:pointer;border-radius:99px}.cz-mminus{left:32.9%;width:8.3%}.cz-mplus{left:59.2%;width:8.5%}.cz-mbtn:active{background:#fff3}.cz-mbtn:disabled{opacity:.4;background:#0006}
.cz-machine .cz-spin{position:absolute;left:44.5%;top:80.4%;width:11.6%;height:17%;padding:0;border-radius:50%;background:none;box-shadow:none;font:900 3.4cqw/1 Cairo,Tahoma,sans-serif;color:#fff;text-shadow:0 .3cqw .6cqw #000}.cz-machine .cz-spin:active{transform:scale(.94)}.cz-machine .cz-spin:disabled{filter:none;opacity:.55}
.cz-bar2{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;padding:8px 12px;border-radius:99px;background:#0005;font-size:13px}.cz-bar2 b{color:#ffe14d}
.cz-slot .cz-freeb{color:#ffe14d}
.fw-wheel{background:center/100% 100% no-repeat;aspect-ratio:493/482;container-type:inline-size}.fw-wheel::before{display:none}
.fw-wheel .fw-it{width:13.8%;border:0;background:none;box-shadow:none;gap:0;justify-content:flex-start;padding-top:.6cqw;border-radius:50%}
.fw-img{width:66%;height:auto;display:block;pointer-events:none;filter:drop-shadow(0 .4cqw .5cqw #0006)}
.fw-wheel .fw-it small{direction:ltr;font:900 2.3cqw/1 Arial,sans-serif;color:#7a2e00!important}.fw-wheel .fw-it b{position:absolute;bottom:-3.4cqw;font:900 2.5cqw/1 Arial,sans-serif;padding:.3cqw 1.4cqw;border-radius:99px;background:#7a2e00;color:#ffe9b0!important;white-space:nowrap}
.fw-wheel .fw-it.lit{box-shadow:0 0 0 1.2cqw #ffe14d,0 0 5cqw #ffb800;background:#fff7}.fw-wheel .fw-it.win{box-shadow:0 0 0 1.2cqw #ff2e4d,0 0 6cqw #ff2e4d;background:#fff8}
.fw-wheel .fw-hub{left:51.4%;top:46.7%;width:22.4%;border:0;background:none;box-shadow:none;color:#7a2e00}.fw-wheel .fw-hub small{font-size:2.8cqw;font-weight:900;color:#9a4a10!important;opacity:1}.fw-wheel .fw-hub b{font:900 7cqw/1 Arial,sans-serif;color:#c2410c;text-shadow:0 .3cqw 0 #fff}
.fw-himg{width:11cqw}.fw-cat{position:absolute;right:-2%;bottom:3%;width:22%;pointer-events:none;filter:drop-shadow(0 1cqw 1cqw #0005)}
.fw-hist span{display:inline-flex}.fw-hist .fw-img{width:24px}.fw-hist .new{background:#ffe14d;border-radius:50%;padding:2px}.fw-rimg{width:30px;display:inline-block;vertical-align:middle}`;
  document.head.appendChild(st);
}
