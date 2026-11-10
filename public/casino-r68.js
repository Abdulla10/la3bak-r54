/* R68z42: «جاكبوت لعبك» (سلوت) + «عجلة الأكل». الخادم يحدد كل النتائج، والواجهة ترسم وتحرّك بس. رسومات أصلية. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const kf = (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K' : nf(n);
const api = (u, body) => fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json().catch(() => ({ ok: false, error: 'خطأ بالاتصال.' }))).catch(() => ({ ok: false, error: 'انقطع الاتصال.' }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const COIN = '<i class="cz-coin" aria-hidden="true"></i>';

const ART = '/assets/art68/casino/';

/* ======================= السلوت ======================= */
const SYM = { ten: 'ten', j: 'j', q: 'q', k: 'k', a: 'a', gem: 'gem', crown: 'crown', falcon: 'falcon', lion: 'lion', wild: 'wild', free: 'free', jack: 'jack' };
const KEYS = Object.keys(SYM);
const tile = (s) => `<div class="cz-t cz-t-${s}"><img src="${ART}sym-${SYM[s] || 'ten'}.webp" alt="" draggable="false"></div>`;
const SL = { st: null, bet: 0, busy: false, last: null, auto: false };
const TIERS = ['MINI', 'MAJOR', 'GRAND', 'MEGA'], TIER_PCT = [5, 15, 40, 100];
const spinLabel = () => SL.st?.free ? 'مجاني' : SL.auto ? 'إيقاف' : 'تدوير';
function slotHTML() {
  const st = SL.st; if (!st) return '<p class="cz-load">جاري التحميل…</p>';
  const lineBet = st.bets[SL.bet], total = lineBet * st.lines, free = st.free;
  const grid = SL.last?.grid || [0, 1, 2, 3, 4].map((r) => [0, 1, 2].map((i) => KEYS[(r * 3 + i * 5) % 9]));
  const feed = st.feed.length ? st.feed.slice(0, 5).map((f) => `<p><i class="sl-av">${esc([...String(f.name || '؟')][0])}</i><bdi>${esc(f.name)}</bdi> فاز بـ <em>${nf(f.win)}</em>${COIN}${f.kind === 'jack' ? ' 🏆' : ''}</p>`).join('') : '<p class="cz-dim">أول فائز كبير يطلع هنا</p>';
  return `<div class="cz cz-slot" dir="rtl">
  <header class="sl-head"><button type="button" class="sl-ic" data-cz="close" aria-label="إغلاق">✕</button><h1 class="sl-logo"><span>جاكبوت</span><span>لعبك</span></h1><button type="button" class="sl-ic sl-help" data-cz="help" aria-label="الشرح">?</button></header>
  <section class="sl-feed">${feed}</section>
  <section class="sl-jp"><i class="sl-jpw">Jackpot</i><div class="sl-jpbar"><small>${TIERS[SL.bet]}</small><b data-cz-jp>${nf(st.jackpot)}</b></div></section>
  <section class="sl-reels"><div class="cz-reels">${grid.map((col, r) => `<div class="cz-reel" data-reel="${r}"><div class="cz-strip">${col.map(tile).join('')}</div></div>`).join('')}<svg class="cz-lines" viewBox="0 0 500 300" preserveAspectRatio="none" aria-hidden="true"></svg></div></section>
  <p class="cz-freeb">${free ? `🎁 لفات مجانية باقية: <b>${free.left}</b>` : ''}</p><p class="cz-msg" role="status" data-cz-msg></p>
  <footer class="sl-bar"><div class="sl-r1"><span><small>الخطوط</small><b>${st.lines}</b></span><span><small>إجمالي الرهانات</small><b>${nf(free ? 0 : total)}</b></span><span><small>فوز</small><b data-cz-win>${nf(SL.last?.win || 0)}</b></span><button type="button" class="sl-auto${SL.auto ? ' on' : ''}" data-cz="auto">تلقائي</button></div>
   <div class="sl-r2"><span class="sl-coins">${COIN}<b data-cz-bal>${nf(st.coins)}</b></span><div class="sl-step"><button type="button" data-cz="bet-" aria-label="أقل" ${free || SL.busy ? 'disabled' : ''}>−</button><b>${nf(lineBet)}</b><button type="button" data-cz="bet+" aria-label="أكثر" ${free || SL.busy ? 'disabled' : ''}>+</button></div><button type="button" class="sl-spin" data-cz="spin" ${SL.busy && !SL.auto ? 'disabled' : ''}>${spinLabel()}</button></div></footer>
  <p class="cz-note">العب بعملات الموقع بس. النتيجة يحددها الخادم.</p></div>`;
}
async function slotSpin(root) {
  if (SL.busy) return; SL.busy = true;
  const msg = root.querySelector('[data-cz-msg]'); if (msg) msg.textContent = '';
  const sb = root.querySelector('[data-cz="spin"]'); if (sb && !SL.auto) sb.setAttribute('disabled', '');
  root.querySelectorAll('[data-cz="bet-"],[data-cz="bet+"]').forEach((b) => b.setAttribute('disabled', ''));
  root.querySelector('.cz-lines').innerHTML = '';
  const reels = [...root.querySelectorAll('.cz-reel')];
  const rnd = () => Array.from({ length: 18 }, () => tile(KEYS[Math.floor(Math.random() * KEYS.length)])).join('');
  reels.forEach((rl) => { const s = rl.querySelector('.cz-strip'); s.innerHTML = rnd() + s.innerHTML; s.style.transition = 'none'; s.style.transform = 'translateY(-' + (18 * 100 / 21) + '%)'; s.offsetHeight; rl.classList.add('spinning'); });
  const r = await api('/api/slot/spin', { bet: SL.bet });
  if (!r.ok) { SL.busy = false; SL.auto = false; root.innerHTML = slotHTML(); const m = root.querySelector('[data-cz-msg]'); if (m) m.textContent = r.error || 'تعذّر.'; return; }
  for (let i = 0; i < 5; i++) {
    const s = reels[i].querySelector('.cz-strip');
    s.innerHTML = r.grid[i].map(tile).join('') + rnd();
    s.style.transition = 'none'; s.style.transform = 'translateY(-' + (18 * 100 / 21) + '%)'; s.offsetHeight;
    s.style.transition = `transform ${0.55 + i * 0.18}s cubic-bezier(.2,.8,.2,1.05)`; s.style.transform = 'translateY(0)'; reels[i].classList.remove('spinning');
  }
  await sleep(1400);
  reels.forEach((rl, i) => { const s = rl.querySelector('.cz-strip'); s.innerHTML = r.grid[i].map(tile).join(''); s.style.transition = 'none'; s.style.transform = 'none'; });
  SL.last = r; SL.st = { ...SL.st, jackpot: r.jackpot, coins: r.coins, free: r.free };
  const svg = root.querySelector('.cz-lines'); const cols = ['#ffe14d', '#7dff6b', '#ff6bd5', '#6bc8ff', '#ff9a4d'];
  svg.innerHTML = r.wins.slice(0, 12).map((w, k) => `<polyline points="${SL.st.lineMap[w.line].map((row, c) => `${50 + c * 100},${50 + row * 100}`).join(' ')}" fill="none" stroke="${cols[k % 5]}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
  const hit = new Set(); r.wins.forEach((w) => SL.st.lineMap[w.line].slice(0, w.count).forEach((row, c) => hit.add(c + ':' + row)));
  reels.forEach((rl, c) => rl.querySelectorAll('.cz-t').forEach((t, row) => t.classList.toggle('hit', hit.has(c + ':' + row))));
  const set = (q, v) => { const e = root.querySelector(q); if (e) e.textContent = v; };
  set('[data-cz-bal]', nf(r.coins)); set('[data-cz-jp]', nf(r.jackpot)); set('[data-cz-win]', nf(r.win));
  const m = root.querySelector('[data-cz-msg]');
  if (r.jackWin) banner(root, `JACKPOT ${r.tier}!`, `+${nf(r.jackWin)}`);
  else if (r.freeWon) banner(root, 'لفات مجانية!', `+${r.freeWon} لفة`);
  else if (r.win >= r.total * 5) banner(root, 'BIG WIN!', `+${nf(r.win)}`);
  else if (m) m.textContent = r.win ? `فزت ${nf(r.win)} عملة 🎉` : '';
  SL.busy = false;
  const fb = root.querySelector('.cz-freeb'); if (fb) fb.innerHTML = r.free ? `🎁 لفات مجانية باقية: <b>${r.free.left}</b>` : '';
  const spinB = root.querySelector('[data-cz="spin"]'); if (spinB) { spinB.removeAttribute('disabled'); spinB.textContent = spinLabel(); }
  if (!SL.auto && !r.free) root.querySelectorAll('[data-cz="bet-"],[data-cz="bet+"]').forEach((b) => b.removeAttribute('disabled'));
  if (SL.auto || r.free) { await sleep(r.win ? 1600 : 700); if ((SL.auto || SL.st.free) && root.isConnected) slotSpin(root); else if (root.isConnected) root.innerHTML = slotHTML(); }
}
function banner(root, a, b) { const el = document.createElement('div'); el.className = 'cz-ban'; el.innerHTML = `<b>${esc(a)}</b><span>${esc(b)}</span>`; root.querySelector('.cz')?.append(el); setTimeout(() => el.remove(), 2200); }

/* ======================= عجلة الأكل ======================= */
const FIMG = (id, c = '') => `<img class="fw-img ${c}" src="${ART}food-${id}.webp" alt="" draggable="false">`;
const FW = { st: null, chip: 0, poll: 0, shownRound: 0, spinning: false, msg: '', auto: false, cur: { round: 0, list: [] }, prev: [], placing: false };
const FW_POS = [[61.9, 22.1], [75.1, 39.0], [74.5, 60.0], [61.0, 74.2], [37.7, 74.2], [24.7, 59.9], [24.0, 39.0], [37.0, 22.2]]; // مراكز دواير رسمة العجلة (٪)
const FW_HUB = [49.5, 48.2];
const fwPos = (i, N) => FW_POS[i] || [50 + Math.sin((i / N) * Math.PI * 2) * 30, 50 - Math.cos((i / N) * Math.PI * 2) * 30];
const stackHTML = (n) => `<span class="fw-stack">${Array.from({ length: n }, (_, k) => `<i style="--k:${k}"></i>`).join('')}</span>`;
function foodHTML() {
  const s = FW.st; if (!s) return '<p class="cz-load">جاري التحميل…</p>';
  const N = s.foods.length, sec = Math.max(0, Math.ceil(s.left / 1000));
  const cnt = s.foods.map((_, i) => s.history.filter((h) => h === i).length); const hot = cnt.indexOf(Math.max(...cnt));
  const res = s.phase === 'show' && !FW.spinning ? s.result : null;
  const items = s.foods.map((f, i) => { const [x, y] = fwPos(i, N);
    return `<button type="button" class="fw-it${res === i ? ' win' : ''}" data-fw-item="${i}" style="left:${x}%;top:${y}%" ${s.phase !== 'bet' ? 'disabled' : ''} aria-label="${esc(f.name)} ${f.mult} أضعاف">${FIMG(f.id, 'fw-food')}<span class="fw-m">${f.mult} اضعاف</span><span class="fw-v"><b>${kf(s.totals[i])}</b>${COIN}</span>${s.mine[i] ? `<em>${kf(s.mine[i])}</em>` : ''}${hot === i && Math.max(...cnt) > 1 ? '<i class="fw-hot">Hot</i>' : ''}</button>`; }).join('');


  const hubLbl = s.phase === 'bet' ? 'حدد الوقت' : FW.spinning ? 'النتيجة قادمة' : 'وقت العرض';
  const veg = s.foods.map((f, i) => f.mult === 5 ? i : -1).filter((i) => i >= 0), meat = s.foods.map((f, i) => f.mult !== 5 ? i : -1).filter((i) => i >= 0);
  const mineSum = s.mine.reduce((a, b) => a + b, 0);
  const pod = s.top.length ? [1, 0, 2].filter((k) => s.top[k]).map((k) => `<div class="fw-p fw-p${k + 1}"><span class="fw-pa">${esc([...String(s.top[k].name || '؟')][0])}<i>${k + 1}</i></span><bdi>${esc(s.top[k].name)}</bdi><b>${nf(s.top[k].win)}</b></div>`).join('') : '<p class="fw-none">ما فيه فايزين هالجولة</p>';
  const modal = res !== null ? `<div class="fw-modal" role="dialog" aria-label="نتيجة الجولة"><span class="fw-mt">(${sec}) ثانية</span><div class="fw-mrow"><div class="fw-mtx"><h3>${FIMG(s.foods[res].id, 'fw-mi')} نتيجة الجولة <bdi>${nf(s.round)}</bdi></h3><p>رهانك في هذه الجولة: <b>${nf(mineSum)}</b></p><p>الفائز في هذه الجولة: <b>${nf(s.myWin || 0)}</b></p></div><img class="fw-mcat" src="${ART}fw-cat.webp" alt=""></div><h4>الفائز الأكبر لهذه الجولة</h4><div class="fw-pod">${pod}</div></div>` : '';
  return `<div class="cz cz-food" dir="rtl">
  <header class="fw-head"><button type="button" class="fw-ic" data-cz="fwhelp" aria-label="الشرح">?</button><h1 class="fw-ttl">عجلة الأكل</h1><span class="fw-rnd"><small>جولة</small><b>${nf(s.round)}</b></span><button type="button" class="fw-ic fw-x" data-cz="close" aria-label="إغلاق">✕</button></header>
  <section class="fw-stage" style="background-image:url(${ART}fw-wheel2.webp)">

   ${items}
   <div class="fw-hub" style="left:${FW_HUB[0]}%;top:${FW_HUB[1]}%"><img class="fw-cat" src="${ART}fw-cat.webp" alt="" draggable="false"><small>${hubLbl}</small><b data-fw-sec>${s.phase === 'bet' || !FW.spinning ? sec + 's' : '…'}</b></div>
   <button type="button" class="fw-side fw-salad" data-fw-group="${veg.join(',')}" ${s.phase !== 'bet' ? 'disabled' : ''}><img class="fw-sideimg" src="${ART}fw-salad.webp" alt=""><b>السلطة</b></button>
   <button type="button" class="fw-side fw-pizza" data-fw-group="${meat.join(',')}" ${s.phase !== 'bet' ? 'disabled' : ''}><img class="fw-sideimg" src="${ART}fw-pizza.webp" alt=""><b>البيتزا</b></button>
   </section>
  ${modal}<section class="fw-panel"><div class="fw-autot"><button type="button" role="switch" aria-checked="${FW.auto}" class="fw-sw${FW.auto ? ' on' : ''}" data-fw-auto aria-label="الرهان التلقائي"></button><span>وضع الرهان التلقائي (متابعة الجولة السابقة)</span></div>
   <div class="fw-chips" role="radiogroup" aria-label="قيمة الرهان">${s.chips.map((c, i) => `<button type="button" role="radio" aria-checked="${FW.chip === i}" class="fw-chip${FW.chip === i ? ' on' : ''}" data-fw-chip="${i}">${stackHTML(i + 1)}<b>${nf(c)}</b></button>`).join('')}<button type="button" class="fw-chip fw-rep" data-fw-repeat ${!FW.prev.length || s.phase !== 'bet' ? 'disabled' : ''}><span class="fw-repi">↻</span><b>وضع رهان</b></button></div></section>
  <section class="fw-red"><div class="fw-pills"><span><small>فائز اليوم</small><b>${nf(s.today)}</b></span><span><small>رهانك بالجولة</small><b>${nf(mineSum)}</b></span><span><small>العملات المتبقية</small><b>${COIN}${nf(s.coins)}</b></span></div>
   <div class="fw-chests">${(s.chests || []).map((c, i) => { const got = (s.chestsGot || []).includes(i), ready = !got && s.today >= c.need; return `<button type="button" class="fw-chest${ready ? ' ready' : ''}${got ? ' got' : ''}" data-fw-chest="${i}" ${ready ? '' : 'disabled'} aria-label="صندوق ${kf(c.need)} مكافأته ${nf(c.reward)}"><img src="${ART}chest-${i + 1}.webp" alt="">${got ? '<i>✓</i>' : ''}<b>${kf(c.need)}</b></button>`; }).join('')}<span class="fw-cbar"><i style="width:${Math.min(100, Math.round((s.chests?.length ? (() => { const n = s.chests.map((c) => c.need); let k = n.findIndex((v) => s.today < v); if (k < 0) return 1; const lo = k ? n[k - 1] : 0; return (k + (s.today - lo) / (n[k] - lo)) / n.length; })() : 0) * 100))}%"></i></span></div>
   <p class="cz-msg" role="status">${esc(FW.msg)}</p>
   <div class="fw-hist"><small>النتيجة:</small><div>${s.history.map((h, k) => `<span class="${k === 0 ? 'new' : ''}">${FIMG(s.foods[h].id)}${k === 0 ? '<i>NEW</i>' : ''}</span>`).join('')}</div></div></section>
  <p class="cz-note">كل جولة 30 ثانية رهان. اختار قيمة الرهان واضغط على الأكلة. احتمال الأكلة أقل كل ما كان مضاعفها أكبر.</p></div>`;
}
async function placeBets(root, list) {
  if (FW.placing || !list.length) return; FW.placing = true;
  for (const b of list) { const r = await api('/api/foodwheel/bet', { item: b.item, chip: b.chip }); if (r.ok) { FW.st = r; FW.msg = ''; FW.cur.list.push(b); } else { FW.msg = r.error || 'تعذّر.'; break; } }
  FW.placing = false; if (root.isConnected && !FW.spinning) root.innerHTML = foodHTML();
}
async function foodLoad(root) {
  const s = await api('/api/foodwheel'); if (!root.isConnected) return;
  if (s.ok) {
    const prev = FW.st; FW.st = s;
    if (s.phase === 'bet' && FW.cur.round !== s.round) { if (FW.cur.list.length) FW.prev = FW.cur.list; FW.cur = { round: s.round, list: [] }; if (FW.auto && FW.prev.length && prev) placeBets(root, FW.prev); }
    if (s.phase === 'show' && FW.shownRound !== s.round && prev && prev.round === s.round && prev.phase === 'bet') { FW.shownRound = s.round; spinAnim(root); return; }
    if (s.phase === 'show') FW.shownRound = s.round; if (s.phase === 'bet' && prev?.phase === 'show') FW.msg = '';
  }
  if (!FW.spinning) root.innerHTML = foodHTML();
}
async function spinAnim(root) {
  FW.spinning = true; root.innerHTML = foodHTML();
  const its = [...root.querySelectorAll('.fw-it')]; const N = its.length, target = FW.st.result; let k = 0; const steps = N * 3 + target;
  for (let i = 0; i <= steps; i++) { its.forEach((e) => e.classList.remove('lit')); its[k % N]?.classList.add('lit'); k++; await sleep(60 + Math.pow(i / steps, 3) * 260); }
  await sleep(500); FW.spinning = false; if (root.isConnected) root.innerHTML = foodHTML();
}

/* ======================= التركيب ======================= */
function mount(root) {
  css();
  const kind = root.dataset.casino;
  if (kind === 'slot') { root.innerHTML = slotHTML(); api('/api/slot').then((s) => { if (s.ok && root.isConnected) { SL.st = s; root.innerHTML = slotHTML(); } }); }
  if (kind === 'food') { root.innerHTML = foodHTML(); foodLoad(root); clearInterval(FW.poll); FW.poll = setInterval(() => { if (!root.isConnected) return clearInterval(FW.poll); if (FW.spinning || FW.placing) return; if (FW.st?.phase === 'bet' && FW.st.left > 1500) { FW.st.left -= 1000; const el = root.querySelector('[data-fw-sec]'); if (el) el.textContent = Math.ceil(FW.st.left / 1000) + 's'; if (Math.ceil(FW.st.left / 1000) % 5 === 0) foodLoad(root); return; } foodLoad(root); }, 1000); }
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cz],[data-fw-item],[data-fw-chip],[data-fw-auto],[data-fw-repeat],[data-fw-group],[data-fw-chest]'); if (!b || b.disabled) return;
    const a = b.dataset.cz;
    if (a === 'close') { SL.auto = false; history.length > 1 ? history.back() : ((globalThis.__LA3BAK_NAV__ || location).hash = '#/games'); return; }
    if (a === 'help') { const m = root.querySelector('[data-cz-msg]'); if (m) m.textContent = `50 خط. 3 رموز FREE = 8 لفات مجانية. 5 رموز JACKPOT = ${TIER_PCT[SL.bet]}% من الجاكبوت.`; return; }
    if (a === 'fwhelp') { FW.msg = 'اختار قيمة الرهان واضغط على الأكلة. «السلطة» تراهن على كل أكلات ×5، و«البيتزا» على الباقي.'; root.innerHTML = foodHTML(); return; }
    if (a === 'spin') { if (SL.auto) { SL.auto = false; b.textContent = spinLabel(); root.querySelector('[data-cz="auto"]')?.classList.remove('on'); return; } return slotSpin(root); }
    if (a === 'auto') { SL.auto = !SL.auto; b.classList.toggle('on', SL.auto); const sb = root.querySelector('[data-cz="spin"]'); if (sb) { sb.textContent = spinLabel(); sb.removeAttribute('disabled'); } if (SL.auto) slotSpin(root); return; }
    if (a === 'bet-' || a === 'bet+') { if (SL.busy) return; SL.bet = Math.max(0, Math.min(SL.st.bets.length - 1, SL.bet + (a === 'bet+' ? 1 : -1))); root.innerHTML = slotHTML(); return; }
    if (b.dataset.fwChip !== undefined) { FW.chip = Number(b.dataset.fwChip); root.innerHTML = foodHTML(); return; }
    if (b.dataset.fwAuto !== undefined) { FW.auto = !FW.auto; root.innerHTML = foodHTML(); return; }
    if (b.dataset.fwRepeat !== undefined) return placeBets(root, FW.prev);
    if (b.dataset.fwChest !== undefined) { const r = await api('/api/foodwheel/chest', { i: Number(b.dataset.fwChest) }); if (r.ok) { FW.st = r; FW.msg = `فتحت الصندوق وأخذت ${nf(r.reward)} عملة 🎉`; } else FW.msg = r.error || 'تعذّر.'; if (!FW.spinning) root.innerHTML = foodHTML(); return; }
    if (b.dataset.fwGroup !== undefined) { const c = FW.st.chips[FW.chip]; return placeBets(root, b.dataset.fwGroup.split(',').map((i) => ({ item: Number(i), chip: c }))); }
    if (b.dataset.fwItem !== undefined) return placeBets(root, [{ item: Number(b.dataset.fwItem), chip: FW.st.chips[FW.chip] }]);
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
.cz{min-height:100%;max-width:520px;margin:0 auto;padding:calc(env(safe-area-inset-top) + 8px) 8px calc(env(safe-area-inset-bottom) + 16px);color:#fff;font-family:Cairo,Tahoma,sans-serif;position:relative;box-sizing:border-box}
.cz *{box-sizing:border-box}.cz button{font-family:inherit}
.cz-coin{display:inline-block;flex:none;width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6b0,#ffc83d 45%,#b97a00);box-shadow:inset 0 0 0 1.5px #a86b00;vertical-align:middle}
.cz-msg{min-height:20px;margin:6px 0 0;text-align:center;font-weight:900;color:#ffe14d;font-size:13px}.cz-note{margin:8px 0 0;text-align:center;font-size:11px;opacity:.6}.cz-dim{opacity:.55}.cz-load{padding:40px;text-align:center;color:#fff}
.cz-ban{direction:ltr;position:fixed;left:0;right:0;top:40%;z-index:5;display:flex;flex-direction:column;align-items:center;pointer-events:none;animation:czban 2.2s ease both}
.cz-ban b{font:italic 900 44px/1 Arial,Tahoma,sans-serif;color:#ffe14d;-webkit-text-stroke:2px #8a3b00;text-shadow:0 0 24px #ffb800}.cz-ban span{font:900 26px/1.4 Arial,sans-serif;color:#fff;text-shadow:0 2px 8px #000}
@keyframes czban{0%{transform:scale(2.4);opacity:0}15%{transform:scale(1);opacity:1}85%{opacity:1}100%{opacity:0}}
/* ---------- السلوت ---------- */
html:has(.cz-ov[data-casino=slot]) .cz-ov{background:#1a0638}
.cz-slot{background:radial-gradient(110% 45% at 50% 0,#7b2fd6 0,#4a128f 45%,#260a52 75%,#1a0638)}
.sl-head{display:grid;grid-template-columns:40px 1fr 40px;align-items:center;direction:ltr}
.sl-ic{width:36px;height:36px;border-radius:50%;border:2px solid #ff8ad8;background:radial-gradient(circle at 40% 35%,#c23cc9,#6d128a);color:#fff;font:900 17px/1 Arial,sans-serif;cursor:pointer;box-shadow:0 2px 0 #3a0650}
.sl-help{border-color:#ff7aa8;background:radial-gradient(circle at 40% 35%,#ff4d8b,#a10f52)}
.sl-logo{margin:0;display:flex;justify-content:center;gap:8px;font:italic 900 32px/1.25 Cairo,Tahoma,sans-serif;white-space:nowrap}
.sl-logo span{background:linear-gradient(180deg,#fff 0,#e6c8ff 45%,#a66bff 55%,#e9d3ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 #4b0a8f) drop-shadow(0 0 1px #2a0060)}
.sl-feed{margin:8px 4px 0;padding:6px 10px;min-height:96px;border-radius:14px;background:linear-gradient(180deg,#2a0c5c99,#1a063a99);border:1px solid #a86bff44;font-size:12.5px}
.sl-feed p{display:flex;align-items:center;gap:6px;margin:3px 0;white-space:nowrap;overflow:hidden}.sl-feed bdi{color:#e9dcff;max-width:40%;overflow:hidden;text-overflow:ellipsis}.sl-feed em{font-style:normal;font-weight:900;color:#ff9a3c;direction:ltr}
.sl-av{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:900;background:linear-gradient(#8a5cff,#4a1fa6);border:1.5px solid #d6b8ff}
.sl-jp{position:relative;margin:6px auto 0;width:86%;padding-top:18px}
.sl-jpw{position:absolute;left:50%;top:-6px;transform:translateX(-50%) rotate(-4deg);z-index:1;font:italic 900 32px/1 "Brush Script MT","Segoe Script",Georgia,serif;color:#fff;-webkit-text-stroke:1px #ff5bd6;text-shadow:0 0 2px #c214a8,0 3px 0 #8a0d7a,0 0 12px #ff5bd6aa}
.sl-jpbar{direction:ltr;display:flex;align-items:center;gap:10px;justify-content:center;height:36px;padding:0 14px;border-radius:12px;background:linear-gradient(180deg,#1e1452,#2d1b6d);border:2px solid #5c46b8;box-shadow:inset 0 2px 6px #0008}
.sl-jpbar small{font:900 12px/1 Arial,sans-serif;color:#ff8ae6;letter-spacing:.5px}.sl-jpbar b{font:900 22px/1 Arial,sans-serif;color:#ffcf4a;text-shadow:0 2px 0 #8a4a00,0 0 10px #ffb80088;letter-spacing:1px}
.sl-reels{position:relative;margin:10px -8px 0;padding:8px 10px;background:linear-gradient(180deg,#4d1d93,#2e0e63);border-top:3px solid #8f5ce6;border-bottom:3px solid #8f5ce6}
.sl-reels::before,.sl-reels::after{content:"";position:absolute;top:8px;bottom:8px;width:10px;background:radial-gradient(circle,#ff6bd5 0 3px,#0000 3.5px) center/10px 33.33% repeat-y}.sl-reels::before{left:0}.sl-reels::after{right:0}
.cz-reels{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:5px;direction:ltr;background:#6a2fc4;padding:0 5px;border-radius:4px}
.cz-reel{position:relative;aspect-ratio:1/3.25;container-type:size;contain:paint;overflow:hidden;background:linear-gradient(180deg,#141a4a,#1e2766 50%,#141a4a)}
.cz-strip{display:flex;flex-direction:column;will-change:transform}
.cz-reel.spinning .cz-strip{animation:czblur .12s linear infinite}@keyframes czblur{0%{filter:blur(0)}50%{filter:blur(2px)}100%{filter:blur(0)}}
.cz-t{flex:none;height:33.333cqh;display:grid;place-items:center;padding:6% 4%}.cz-t img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;filter:drop-shadow(0 2px 3px #000a)}
.cz-t.hit{animation:czhit .6s ease-in-out infinite alternate}.cz-t.hit img{filter:drop-shadow(0 0 6px #ffe14d) drop-shadow(0 0 2px #fff)}@keyframes czhit{to{transform:scale(1.08)}}
.cz-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;filter:drop-shadow(0 0 3px #000)}
.cz-freeb{margin:6px 0 0;min-height:0;text-align:center;font-weight:900;color:#ffe14d}.cz-freeb:empty{display:none}
.sl-bar{direction:ltr;margin:6px -8px 0;padding:8px 8px 10px;background:linear-gradient(180deg,#5a1fa8,#3a0f78);border-top:2px solid #a875ff;border-radius:18px 18px 0 0}
.sl-r1{display:grid;grid-template-columns:auto 1fr 1fr auto;align-items:end;gap:8px}
.sl-r1 span{display:flex;flex-direction:column;align-items:center;line-height:1.1}.sl-r1 small{font-size:12px;color:#d9c2ff}.sl-r1 b{font:900 20px/1.1 Arial,sans-serif;color:#ffe6a8}
.sl-auto{padding:8px 20px;border-radius:99px;border:2px solid #fff3b0;background:linear-gradient(180deg,#ffe55c,#ffb000);color:#7a3a00;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 3px 0 #a86200}.sl-auto.on{background:linear-gradient(180deg,#ff9a3c,#e05a00);color:#fff}
.sl-r2{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:8px;margin-top:8px}
.sl-coins{display:flex;align-items:center;gap:6px;height:40px;padding:0 12px;border-radius:12px;background:#1e0a46;border:1.5px solid #7d4cd6;font:900 16px/1 Arial,sans-serif;overflow:hidden}
.sl-step{display:flex;align-items:center;gap:6px;height:40px;padding:0 4px;border-radius:99px;background:#1e0a46;border:1.5px solid #7d4cd6}.sl-step b{min-width:44px;text-align:center;font:900 18px/1 Arial,sans-serif;color:#e7d4ff}
.sl-step button{width:30px;height:30px;border-radius:50%;border:0;background:linear-gradient(#efe6ff,#b9a3e6);color:#3a1a7a;font:900 20px/1 Arial,sans-serif;cursor:pointer}.sl-step button:disabled{opacity:.4}
.sl-spin{min-width:112px;height:52px;border-radius:16px;border:2px solid #d8ff9c;background:linear-gradient(180deg,#9cff4f,#2fbf14 60%,#1c9a0b);color:#fff;font:900 20px/1 Cairo,Tahoma,sans-serif;text-shadow:0 2px 0 #0b5a00;cursor:pointer;box-shadow:0 4px 0 #0a6a0a}.sl-spin:active{transform:translateY(2px)}.sl-spin:disabled{filter:grayscale(.85);opacity:.75}
/* ---------- عجلة الأكل ---------- */
html:has(.cz-ov[data-casino=food]) .cz-ov{background:#c3122f}
.cz-food{padding-inline:0;padding-top:0;background:#b10f2a}
.fw-head{direction:ltr;display:grid;grid-template-columns:36px 1fr auto 36px;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top) + 8px) 10px 0;background:#2f7fe0}
.fw-ic{width:34px;height:34px;border-radius:50%;border:2px solid #ffffffcc;background:#ffffff26;color:#fff;font:900 17px/1 Arial,sans-serif;cursor:pointer}.fw-x{border:0;background:none;font-size:24px}
.fw-ttl{margin:0;justify-self:center;padding:6px 26px;border-radius:99px;background:#1e3a8a;border:2px solid #9cc4ff;font:900 17px/1 Cairo,Tahoma,sans-serif;color:#fff;box-shadow:inset 0 0 0 2px #2f5bd6}
.fw-rnd{display:flex;flex-direction:column;align-items:center;padding:3px 12px;border-radius:12px;background:#1e3a8a;border:1.5px solid #9cc4ff;line-height:1.1}.fw-rnd small{font-size:10px;opacity:.85}.fw-rnd b{font:900 13px/1 Arial,sans-serif}
.fw-stage{position:relative;width:100%;aspect-ratio:811/756;container-type:inline-size;overflow:hidden;background:#5fb2f5 center/100% 100% no-repeat}

.fw-hill{position:absolute;bottom:-10%;width:90%;height:34%;border-radius:50% 50% 0 0;background:linear-gradient(180deg,#7fd36a,#3f9e3a)}.fw-hill.h1{left:-30%}.fw-hill.h2{right:-35%;height:30%;background:linear-gradient(180deg,#9be27c,#4fae45)}

.fw-it{position:absolute;width:14cqw;height:14cqw;min-height:0;transform:translate(-50%,-50%);border-radius:50%;border:0;padding:1cqw 0 0;cursor:pointer;color:#5a2a00;background:none;box-shadow:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:.5cqw;overflow:visible;transition:box-shadow .1s}
.fw-it:disabled{cursor:default;opacity:1!important;color:#5a2a00}
.fw-food{position:static;width:6.4cqw;height:6.4cqw;object-fit:contain;filter:drop-shadow(0 .4cqw .4cqw #0005);pointer-events:none}
.fw-v{direction:ltr;display:flex;align-items:center;gap:.6cqw}.fw-v b{font:900 2.9cqw/1 Arial,sans-serif;color:#3a1800}.fw-v .cz-coin{width:2.5cqw;height:2.5cqw}.fw-m{font-size:2.15cqw;font-weight:900;line-height:1;color:#6a3208!important;white-space:nowrap}.fw-it.win .fw-m{color:#fff!important}
.fw-it em{position:absolute;top:-1cqw;left:-3cqw;font-style:normal;font-size:2.4cqw;font-weight:900;background:#16a314;color:#fff;border-radius:99px;padding:.2cqw 1.2cqw;border:.3cqw solid #fff;direction:ltr;z-index:1}
.fw-hot{position:absolute;top:-8%;right:-22%;transform:rotate(-8deg);font:italic 900 2.8cqw/1 Arial,sans-serif;color:#fff;background:#e0182d;padding:.8cqw 1.6cqw;border-radius:1cqw 1cqw 1cqw 0;box-shadow:0 .5cqw 0 #8a0010}
.fw-it.lit{box-shadow:0 0 0 1.4cqw #ff2440,0 0 6cqw #ff2440}
.fw-it.win{background:radial-gradient(circle,#ff4d5ecc 0 60%,#e0182dcc 61%);color:#fff;box-shadow:0 0 0 1.4cqw #ffe14d,0 0 7cqw #ff2440;animation:fwwin .5s ease-in-out infinite alternate}.fw-it.win .fw-v b{color:#fff}@keyframes fwwin{to{transform:translate(-50%,-50%) scale(1.07)}}
.fw-hub{position:absolute;width:23cqw;height:23cqw;transform:translate(-50%,-50%);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:2.6cqw;color:#ffe9b0;z-index:1}

.fw-cat{position:absolute;left:50%;bottom:42%;width:52%;transform:translateX(-50%);pointer-events:none;filter:drop-shadow(0 .6cqw .6cqw #0006)}
.fw-hub small{position:relative;font-size:2.9cqw;font-weight:800;line-height:1.2;color:#ffe9b0!important}.fw-hub b{position:relative;font:900 4.6cqw/1 Arial,sans-serif;color:#fff!important}
.fw-side{position:absolute;bottom:1%;width:22%;display:flex;flex-direction:column;align-items:center;border:0;background:none;padding:0;cursor:pointer;z-index:1}.fw-side:disabled{cursor:default}.fw-salad{left:1%}.fw-pizza{right:1%}.fw-sideimg{width:100%;filter:drop-shadow(0 1cqw 1cqw #0006);pointer-events:none}


.fw-chests{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:8px;padding-bottom:4px}.fw-cbar{position:absolute;left:8%;right:8%;bottom:26px;height:6px;border-radius:9px;background:#5a0614;z-index:0}.fw-cbar i{position:absolute;top:0;bottom:0;right:0;border-radius:9px;background:linear-gradient(270deg,#ffe14d,#ff9a3c)}
.fw-chest{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:2px;border:0;background:none;padding:0;cursor:default}.fw-chest img{width:78%;height:54px;object-fit:contain;filter:drop-shadow(0 3px 3px #0006)}.fw-chest b{font:900 13px/1 Arial,sans-serif;color:#fff!important;direction:ltr}.fw-chest.ready{cursor:pointer;animation:fwch .7s ease-in-out infinite alternate}.fw-chest.ready img{filter:drop-shadow(0 0 8px #ffe14d)}@keyframes fwch{to{transform:translateY(-4px) scale(1.05)}}.fw-chest.got img{filter:grayscale(.6) brightness(.8)}.fw-chest i{position:absolute;top:18%;font:normal 900 20px/1 Arial,sans-serif;color:#7dff6b;text-shadow:0 1px 3px #000}.fw-chest:disabled{opacity:1}
.fw-side b{position:relative;margin-top:-1cqw;padding:.8cqw 3cqw;border-radius:2cqw;background:#fff7e6;border:.5cqw solid #8b4a1f;color:#4a2200!important;font-size:3.8cqw;font-weight:900}
.cz-food{container-type:inline-size}.fw-modal{position:absolute;left:3%;right:3%;top:calc(env(safe-area-inset-top) + 56px + 50cqw);z-index:3;padding:2cqw 4cqw 3cqw;border-radius:5cqw 5cqw 0 0;background:linear-gradient(180deg,#3d6bff,#2a3fd6 60%,#2234b8);border:.6cqw solid #8fb0ff;color:#fff;animation:fwm .3s ease both}@keyframes fwm{from{transform:translateY(30%);opacity:0}}
.fw-mt{font-size:3.6cqw;font-weight:800}
.fw-mrow{display:flex;align-items:center;gap:2cqw}.fw-mtx{flex:1}.fw-mtx h3{display:flex;align-items:center;gap:1.5cqw;margin:0 0 1cqw;font-size:4.4cqw}.fw-mi{width:7cqw}.fw-mtx p{margin:.4cqw 0;font-size:3.6cqw}.fw-mtx b{color:#ffe14d}
.fw-mcat{width:20cqw;filter:drop-shadow(0 1cqw 1cqw #0005)}
.fw-modal h4{margin:1cqw 0;text-align:center;font-size:3.8cqw;color:#ffe9a0}
.fw-pod{display:flex;justify-content:center;align-items:flex-end;gap:4cqw}.fw-p{display:flex;flex-direction:column;align-items:center;gap:.4cqw;min-width:18cqw}.fw-p bdi{font-size:3.2cqw;font-weight:900;max-width:22cqw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fw-p b{font:900 3.4cqw/1 Arial,sans-serif;color:#fff;direction:ltr}
.fw-pa{position:relative;width:12cqw;height:12cqw;border-radius:50%;display:grid;place-items:center;font-size:5cqw;font-weight:900;background:linear-gradient(#5a4a8a,#2a1a5a);border:.7cqw solid #c0c8d8}.fw-p1 .fw-pa{width:15cqw;height:15cqw;border-color:#ffd34d;box-shadow:0 0 3cqw #ffd34d}.fw-p3 .fw-pa{border-color:#e09a5a}
.fw-pa i{position:absolute;bottom:-1.5cqw;width:5cqw;height:5cqw;border-radius:50%;background:#ffd34d;color:#5a2a00;font:normal 900 3cqw/5cqw Arial,sans-serif;text-align:center}.fw-none{margin:0;text-align:center;font-size:3.4cqw;opacity:.8}
.fw-panel{margin-top:-1px;padding:8px 8px 10px;background:linear-gradient(180deg,#e9c389,#d9a965);border-top:3px solid #9a5a22;border-radius:0 0 14px 14px}
.fw-autot span{color:#4a2200!important}.fw-autot{display:flex;align-items:center;justify-content:center;gap:8px;color:#4a2200;font-weight:800;font-size:13px}
.fw-sw{position:relative;width:40px;height:22px;border-radius:99px;border:0;background:#b9a48a;cursor:pointer}.fw-sw::after{content:"";position:absolute;top:2px;inset-inline-end:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.15s}.fw-sw.on{background:#16a314}.fw-sw.on::after{inset-inline-end:20px}
.fw-chips{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;margin-top:8px}
.fw-chip{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;aspect-ratio:.86;padding:4px 2px;border-radius:10px;border:3px solid #fff3dc;background:#fff3dc;cursor:pointer;color:#3a1800}
.fw-chip b{max-width:100%;color:#3a1800!important;font:900 10.5px/1 Arial,sans-serif;padding:3px 4px;border-radius:99px;background:#fff;border:1.5px solid #8b4a1f}
.fw-chip.on{border-color:#3ad11f;background:#5a3410;box-shadow:0 0 0 2px #3ad11f88}.fw-chip.on b{background:#fff}
.fw-stack{position:relative;width:80%;flex:1;display:block}.fw-stack i{position:absolute;left:calc(50% - 10px + (var(--k) - 2) * 3px);bottom:calc(var(--k) * 4px);width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6b0,#ffc83d 45%,#b97a00);box-shadow:inset 0 0 0 1.5px #a86b00,0 1px 0 #7a4a00}
.fw-rep b{font-size:10px}.fw-repi{flex:1;display:grid;place-items:center;font:900 24px/1 Arial,sans-serif;color:#8b4a1f}.fw-rep:disabled{opacity:.5;cursor:default}
.fw-red{padding:8px 8px 0}.fw-pills{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.fw-pills span{display:flex;flex-direction:column;align-items:center;padding:5px;border-radius:99px;background:#fff7e6;color:#4a2200;line-height:1.15;border:2px solid #f2cf8f}.fw-pills small{font-size:11.5px;font-weight:800;color:#7a3e10!important}.fw-pills b{color:#3a1800!important;display:flex;align-items:center;gap:4px;font:900 14px/1.1 Arial,sans-serif;direction:ltr}
.cz-food .cz-msg{color:#fff3b0}.cz-food .cz-msg:empty{display:none}
.fw-hist{display:flex;align-items:center;gap:6px;margin-top:6px;padding:6px 10px;border-radius:14px;background:#8a0c22;color:#fff}.fw-hist small{color:#fff!important;font-size:12px;font-weight:800;flex:none}.fw-hist>div{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none}
.fw-hist span{position:relative;flex:none;width:34px;height:34px;border-radius:50%;background:#fff;display:grid;place-items:center;border:2px solid #ffd9a8}.fw-hist .fw-img{width:24px}.fw-hist .new{border-color:#ffe14d;box-shadow:0 0 0 2px #ffb800}
.fw-hist span i{position:absolute;bottom:-5px;font:normal 900 8px/1 Arial,sans-serif;background:#16a314;color:#fff;padding:1px 3px;border-radius:4px}
.cz-food .cz-note{color:#ffe0e5;opacity:.8;padding:0 10px}`;
  document.head.appendChild(st);
}
