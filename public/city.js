/* «مدينتي» — الواجهة فقط. النرد والحركة والمكافآت والترقيات والغارات والمهام كلها من الخادم (src/server/city.ts).
 * الواجهة ترسل «ارمِ» (مع المضاعف ومفتاح طلب فريد) و«رقِّ معلم» و«استلم مهمة»، وتعرض النتيجة وتحرّك القطعة على المسار اللي رجّعه الخادم.
 * ذهب المدينة 🏙️ منفصل عن عملات لعبك 🪙. تصميم أصلي (بدون أي أسماء أو أصول من ألعاب ثانية). */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = (n) => Number(n).toLocaleString('ar-EG');
export const CT = { data: null, err: '', loading: false, mult: 1, busy: false, sheet: null, tut: 0, last: null, key: null, moving: false, shownPos: null, dice: [3, 4] };
export const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));

let loadSeq = 0, regenRequest = null, regenPending = false, retryAt = 0, snapshot = null, receivedAt = 0;
const clock = () => performance.now();
function trackSnapshot() { if (snapshot !== CT.data) { snapshot = CT.data; receivedAt = clock(); } }
function regenLeft() {
  trackSnapshot();
  const d = CT.data;
  return d?.nextRollAt == null ? null : d.nextRollAt - d.serverNow - (clock() - receivedAt);
}

const TILE = {
  start: { ic: '🚩', l: 'البداية', c: '#2bb673' }, prop: { ic: '🏠', l: 'أملاك', c: '#4aa8ff' }, bonus: { ic: '💰', l: 'كنز', c: '#ffcf4a' },
  event: { ic: '❔', l: 'حدث', c: '#b388ff' }, raid: { ic: '⚔️', l: 'غارة', c: '#ff5a4a' }, shield: { ic: '🛡️', l: 'درع', c: '#58e1ff' }, tax: { ic: '🏛️', l: 'ضريبة', c: '#ff9f43' },
};
/** خانات اللوحة على محيط شبكة 7×7: نبدأ من الزاوية اليمنى تحت ونمشي يسار ثم فوق ثم يمين ثم تحت (مع عقارب الساعة على الشاشة RTL) */
export function cellOf(i) {
  if (i <= 6) return { r: 6, c: 6 - i };
  if (i <= 12) return { r: 6 - (i - 6), c: 0 };
  if (i <= 18) return { r: 0, c: i - 12 };
  return { r: i - 18, c: 6 };
}

/* ---------- المدينة بالوسط: 5 معالم، ارتفاعها وتفاصيلها من نجومها ---------- */
const PAL = [['#ffcf4a', '#c98a12'], ['#4fd37a', '#1f9a4b'], ['#4aa8ff', '#1a62d6'], ['#b388ff', '#6d3fd6'], ['#ff7a59', '#c0392b']];
function building(i, stars, x) {
  const [a, b] = PAL[i]; const h = 26 + stars * 16; const base = 132; const w = 30;
  if (!stars) return `<g opacity=".75"><rect x="${x}" y="${base - 18}" width="${w}" height="18" fill="none" stroke="#fff" stroke-dasharray="3 3"/><path d="M${x + 4} ${base - 18}l${w / 2 - 4} -14 ${w / 2 - 4} 14" fill="none" stroke="#ffcf4a" stroke-width="2"/><text x="${x + w / 2}" y="${base - 4}" text-anchor="middle" font-size="9" fill="#fff">🏗</text></g>`;
  const top = base - h; let roof = '';
  if (i === 0) roof = `<path d="M${x - 2} ${top}h${w + 4}l-${w / 2 + 2} -12z" fill="${b}"/>`;
  if (i === 1) roof = `<path d="M${x} ${top}a${w / 2} ${w / 2} 0 0 1 ${w} 0z" fill="${b}"/>`;
  if (i === 2) roof = `<rect x="${x + w / 2 - 3}" y="${top - 16}" width="6" height="16" fill="${b}"/><circle cx="${x + w / 2}" cy="${top + 10}" r="6" fill="#fff"/><path d="M${x + w / 2} ${top + 10}v-4M${x + w / 2} ${top + 10}h3" stroke="#333" stroke-width="1.2"/>`;
  if (i === 3) roof = `<path d="M${x + w / 2} ${top - 18}v18" stroke="${b}" stroke-width="3"/><circle cx="${x + w / 2}" cy="${top - 20}" r="4" fill="#ffcf4a"/>`;
  if (i === 4) roof = `<path d="M${x - 4} ${top}l${w / 2 + 4} -14 ${w / 2 + 4} 14z" fill="${b}"/><path d="M${x + w / 2} ${top - 14}v-10l8 4-8 4" fill="#ff5a4a"/>`;
  let win = ''; for (let y = top + 8; y < base - 8; y += 12) win += `<rect x="${x + 6}" y="${y}" width="6" height="6" fill="#fff6c4" opacity=".85"/><rect x="${x + w - 12}" y="${y}" width="6" height="6" fill="#fff6c4" opacity=".85"/>`;
  const glow = stars >= 4 ? `<rect x="${x - 3}" y="${top - 3}" width="${w + 6}" height="${h + 3}" rx="4" fill="none" stroke="#ffd166" stroke-width="2" class="ct-glow"/>` : '';
  return `<g>${glow}<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="3" fill="${a}" stroke="${b}" stroke-width="2"/>${roof}${win}</g>`;
}
function skyline(d) {
  const xs = [12, 52, 92, 132, 172];
  return `<svg class="ct-sky" viewBox="0 0 214 150" role="img" aria-label="مدينتك: ${esc(d.theme)}" style="direction:ltr"><defs><linearGradient id="ctSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1f6b"/><stop offset="1" stop-color="#7a4cff"/></linearGradient></defs><rect width="214" height="150" rx="12" fill="url(#ctSky)"/><circle cx="182" cy="26" r="11" fill="#fff6c4"/><rect y="132" width="214" height="18" fill="#2a6b3a"/>${d.marks.map((m, i) => building(i, m.stars, xs[i])).join('')}</svg>`;
}
const stars = (n) => '★'.repeat(n) + '☆'.repeat(4 - n);
const fmtLeft = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const dieFace = (n) => `<svg viewBox="0 0 40 40" class="ct-die" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="8" fill="#fff" stroke="#c9c3e6" stroke-width="2"/>${({ 1: [[20, 20]], 2: [[12, 12], [28, 28]], 3: [[11, 11], [20, 20], [29, 29]], 4: [[12, 12], [28, 12], [12, 28], [28, 28]], 5: [[11, 11], [29, 11], [20, 20], [11, 29], [29, 29]], 6: [[12, 10], [28, 10], [12, 20], [28, 20], [12, 30], [28, 30]] })[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#241b55"/>`).join('')}</svg>`;

const TUT = [
  ['🎲', 'ارمِ النرد', 'كل رمية تحرّك قطعتك على اللوحة. النرد من الخادم، والرميات تتجدد رمية كل 8 دقائق (لين 50).'],
  ['🏠', 'اجمع الذهب', 'الأملاك والكنوز والأحداث تعطيك ذهب المدينة 🏙️ — عملة خاصة بهذي اللعبة ومنفصلة عن عملات لعبك.'],
  ['🏗️', 'ابنِ مدينتك', 'رقِّ المعالم الخمسة. لما تكمل كلها 4 نجوم تنتقل مدينتك لمستوى جديد بمكافأة 20 رمية.'],
  ['⚔️', 'الغارات والدروع', 'خانة الغارة تأخذ حصة من ذهب مدينة لاعب ثاني (أو مدينة تدريب). الدرع 🛡️ يصد غارة وحدة عليك.'],
];

export async function load(req) {
  regenRequest = req;
  const seq = ++loadSeq, before = CT.data;
  CT.loading = true; CT.err = '';
  const r = await req('city:get').catch(() => null);
  if (seq !== loadSeq) return false;
  CT.loading = false;
  // رد تحميل متأخر ما يكتب فوق رمية/ترقية أحدث، ولا يحرّك القطعة وسط الحركة.
  if (CT.data !== before || CT.busy || CT.moving) return false;
  if (!r?.ok) { CT.err = r?.error || 'تعذّر تحميل مدينتك. تأكد من الاتصال.'; return false; }
  CT.data = r.city; CT.shownPos = r.city.pos; trackSnapshot(); retryAt = 0;
  if (!r.city.tut && CT.tut === 0) CT.tut = 1;
  return true;
}

function sheetHTML(d) {
  if (CT.sheet === 'build') {
    return `<h2>🏗️ معالم ${esc(d.theme)}</h2><ul class="ct-marks">${d.marks.map((m, i) => `<li><b>${esc(m.name)}</b><span class="ct-stars" aria-label="${m.stars} من 4 نجوم">${stars(m.stars)}</span>${m.cost === null ? '<em class="ct-done">مكتمل ✔</em>' : `<button class="btn ${d.coins >= m.cost ? 'gold' : 'ghost'} sm" type="button" data-act="city-up" data-i="${i}" ${d.coins >= m.cost ? '' : 'aria-disabled="true"'}>رقِّ · 🏙️ ${nf(m.cost)}</button>`}</li>`).join('')}</ul>
      <p class="hint" style="text-align:start">كمّل الخمسة 4 نجوم وتنتقل مدينتك للمستوى ${nf(d.level + 1)} (+20 رمية وذهب). التكلفة تزيد مع النجوم والمستوى.</p>`;
  }
  if (CT.sheet === 'missions') {
    return `<h2>🎯 مهام اليوم</h2><ul class="ct-miss">${d.missions.map((m) => `<li class="${m.done ? 'done' : ''}"><div><b>${esc(m.label)}</b><small>${nf(m.value)}/${nf(m.goal)} · المكافأة: ${[m.reward.rolls ? `🎲 ${nf(m.reward.rolls)}` : '', m.reward.coins ? `🏙️ ${nf(m.reward.coins * d.level)}` : '', m.reward.shields ? `🛡️ ${nf(m.reward.shields)}` : ''].filter(Boolean).join(' + ')}</small><span class="cx-bar"><i style="width:${Math.round((m.value / m.goal) * 100)}%"></i></span></div>${m.claimed ? '<em class="ct-done">استلمت ✔</em>' : m.done ? `<button class="btn gold sm" type="button" data-act="city-claim" data-id="${esc(m.id)}">استلم</button>` : ''}</li>`).join('')}</ul><p class="hint" style="text-align:start">تتجدد كل يوم (بتوقيت الخليج). التقدم يحسبه الخادم من رمياتك وترقياتك الفعلية.</p>`;
  }
  if (CT.sheet === 'log') {
    return `<h2>📜 سجل مدينتك</h2>${d.log.length ? `<ul class="ct-log">${d.log.map((l) => `<li class="k-${l.kind}"><span>${{ raided: '⚔️', blocked: '🛡️', level: '🏆', raid: '💥', event: '❔' }[l.kind] ?? '•'}</span><div><b>${esc(l.text)}</b><small>${new Date(l.ts).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</small></div>${l.coins ? `<strong class="${l.coins < 0 ? 'neg' : 'pos'}" dir="ltr">${l.coins > 0 ? '+' : ''}${nf(l.coins)}</strong>` : ''}</li>`).join('')}</ul>` : '<p class="muted">ما صار شي للحين.</p>'}`;
  }
  if (CT.sheet === 'help') {
    return `<h2>كيف ألعب «مدينتي»؟</h2><ul class="steps">${TUT.map(([ic, h, t]) => `<li><span>${ic} <b>${h}:</b> ${t}</span></li>`).join('')}
      <li><span>🎰 <b>المضاعف:</b> ×2 أو ×3 يصرف رميات أكثر ويضاعف ذهب الخانة والغارة.</span></li>
      <li><span>🏛️ <b>الضريبة</b> تاخذ 5% من ذهبك، و<b>العاصفة</b> 8%. ما تنزل تحت الصفر.</span></li></ul>
      <p class="hint" style="text-align:start">مو موجود بهذي النسخة (MVP): ألبوم بطاقات، تبادل بين الأصدقاء، فعاليات موسمية، شراء رميات بفلوس حقيقية (ما فيه أي دفع).</p>`;
  }
  return '';
}

export function cityHTML() {
  if (CT.loading && !CT.data) return '<div class="card empty-state"><p>جاري تحميل مدينتك…</p></div>';
  if (!CT.data) return `<div class="card empty-state"><p role="alert">${esc(CT.err || 'تعذّر التحميل.')}</p><button class="btn" type="button" data-act="city-reload">إعادة المحاولة</button></div>`;
  const d = CT.data; const pos = CT.shownPos ?? d.pos;
  const tiles = d.board.map((t, i) => { const { r, c } = cellOf(i); const T = TILE[t]; return `<div class="ct-tile t-${t} ${i === pos ? 'here' : ''}" style="grid-row:${r + 1};grid-column:${c + 1};--tc:${T.c}" data-i="${i}"><span aria-hidden="true">${T.ic}</span><small>${T.l}</small></div>`; }).join('');
  const cc = cellOf(pos);
  const left = regenLeft();
  const unseen = d.unseen ? `<b class="ct-dot" aria-label="${nf(d.unseen)} جديد">${nf(d.unseen)}</b>` : '';
  const tut = CT.tut > 0 && CT.tut <= TUT.length ? `<div class="sh-modal ct-tut" role="dialog" aria-modal="true" aria-label="تعريف باللعبة"><div class="card"><div class="ct-tutic" aria-hidden="true">${TUT[CT.tut - 1][0]}</div><h2>${TUT[CT.tut - 1][1]}</h2><p>${TUT[CT.tut - 1][2]}</p><p class="muted">${nf(CT.tut)} / ${nf(TUT.length)}</p><div class="btn-row"><button class="btn gold" type="button" data-act="city-tut-next">${CT.tut === TUT.length ? 'يلا نبدأ!' : 'التالي'}</button><button class="btn ghost" type="button" data-act="city-tut-skip">تخطّي</button></div></div></div>` : '';
  const sheet = CT.sheet ? `<div class="sh-modal ct-sheet" role="dialog" aria-modal="true"><div class="card">${sheetHTML(d)}<button class="btn ghost block" type="button" data-act="city-close">إغلاق</button></div></div>` : '';
  const can = d.rolls >= CT.mult && !CT.busy && !CT.moving;
  return `<div class="stack ct-page">
    <div class="ct-hud" role="group" aria-label="مدينتك">
      <div><i>🏙️</i><b id="ctCoins">${nf(d.coins)}</b><span>ذهب المدينة</span></div>
      <div><i>🎲</i><b id="ctRolls">${nf(d.rolls)}<small>/${nf(d.maxRolls)}</small></b><span id="ctRegen" data-left="${left ?? ''}" data-at="${clock()}">${left === null ? 'ممتلئ' : `+1 خلال ${fmtLeft(left)}`}</span></div>
      <div><i>🛡️</i><b>${nf(d.shields)}<small>/${nf(d.maxShields)}</small></b><span>الدروع</span></div>
    </div>
    <div class="ct-board">
      ${tiles}
      <div class="ct-center"><h2>${esc(d.theme)} <small>· المستوى ${nf(d.level)}</small></h2>${skyline(d)}<p class="ct-res" aria-live="polite">${esc(CT.last?.text ?? 'ارمِ النرد وابدأ تبني مدينتك')}</p></div>
      <div class="ct-token" id="ctToken" style="grid-row:${cc.r + 1};grid-column:${cc.c + 1}" aria-hidden="true"><span>🚗</span></div>
    </div>
    <div class="ct-ctrl">
      <div class="ct-dice" aria-label="النرد: ${nf(CT.dice[0])} و${nf(CT.dice[1])}">${dieFace(CT.dice[0])}${dieFace(CT.dice[1])}</div>
      <button class="btn gold ct-roll" type="button" data-act="city-roll" ${can ? '' : 'aria-disabled="true"'}>${CT.busy || CT.moving ? '…' : d.rolls < CT.mult ? 'خلصت الرميات' : `🎲 ارمِ${CT.mult > 1 ? ' ×' + CT.mult : ''}`}</button>
      <div class="ct-mult" role="radiogroup" aria-label="المضاعف">${[1, 2, 3].map((m) => `<button type="button" role="radio" aria-checked="${CT.mult === m}" class="${CT.mult === m ? 'on' : ''}" data-act="city-mult" data-v="${m}">×${m}</button>`).join('')}</div>
    </div>
    <div class="ct-acts"><button class="btn" type="button" data-act="city-sheet" data-v="build">🏗️ ابنِ</button><button class="btn ghost" type="button" data-act="city-sheet" data-v="missions">🎯 المهام</button><button class="btn ghost ct-logbtn" type="button" data-act="city-sheet" data-v="log">📜 السجل${unseen}</button><button class="btn ghost" type="button" data-act="city-sheet" data-v="help" aria-label="كيف ألعب">؟</button></div>
    <p class="hint" style="text-align:start">ذهب المدينة 🏙️ خاص بهذي اللعبة: ما ينشرى ولا يتحول لعملات لعبك. كل النتائج من الخادم.</p>
    ${CT.err ? `<p role="alert">${esc(CT.err)}</p>` : ''}
    ${sheet}${tut}
  </div>`;
}

/** حركة القطعة خانة خانة على المسار اللي رجّعه الخادم */
export function animateMove(path, onDone) {
  const tok = document.getElementById('ctToken'); const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!tok || reduce || !path?.length) { onDone(); return; }
  let i = 0;
  const step = () => {
    const { r, c } = cellOf(path[i]); tok.style.gridRow = String(r + 1); tok.style.gridColumn = String(c + 1);
    tok.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1.15)' }, { transform: 'translateY(0) scale(1)' }], { duration: 170 });
    document.querySelectorAll('.ct-tile.here').forEach((e) => e.classList.remove('here')); document.querySelector(`.ct-tile[data-i="${path[i]}"]`)?.classList.add('here');
    i++; if (i < path.length) setTimeout(step, 190); else setTimeout(onDone, 260);
  };
  step();
}
/** ما نمنح رميات محلياً: عند الموعد نزامن من الخادم، بطلب واحد ومع مهلة إعادة محاولة عند الانقطاع. */
export async function tickRegen(req = regenRequest, onUpdate) {
  const el = document.getElementById('ctRegen'); if (!el || !CT.data) return;
  const left = regenLeft();
  el.textContent = left === null ? 'ممتلئ' : left > 0 ? `+1 خلال ${fmtLeft(left)}`
    : CT.err && clock() < retryAt ? 'تعذّر تحديث الرميات. بنحاول مرة ثانية.' : 'جاري تحديث الرميات…';
  if (left === null || left > 0 || !req || regenPending || CT.loading || CT.busy || CT.moving || clock() < retryAt) return;
  regenPending = true;
  try {
    const updated = await load(req);
    if (!updated) { retryAt = clock() + 5000; if (document.getElementById('ctRegen') === el) el.textContent = 'تعذّر تحديث الرميات. بنحاول مرة ثانية.'; return; }
    // المنادي القديم ما يمرر render؛ حدّث الرصيد والزر مباشرة، بدون تغيير صفحة ثانية أو منح تقديري.
    if (document.getElementById('ctRegen') !== el) return;
    if (onUpdate) { onUpdate(); return; }
    const d = CT.data, next = regenLeft();
    const rolls = document.getElementById('ctRolls'); if (rolls) rolls.innerHTML = `${nf(d.rolls)}<small>/${nf(d.maxRolls)}</small>`;
    el.dataset.left = String(next ?? ''); el.dataset.at = String(clock());
    el.textContent = next === null ? 'ممتلئ' : `+1 خلال ${fmtLeft(next)}`;
    const button = document.querySelector('[data-act="city-roll"]');
    if (button) {
      const can = d.rolls >= CT.mult && !CT.busy && !CT.moving;
      if (can) button.removeAttribute('aria-disabled'); else button.setAttribute('aria-disabled', 'true');
      button.textContent = CT.busy || CT.moving ? '…' : d.rolls < CT.mult ? 'خلصت الرميات' : `🎲 ارمِ${CT.mult > 1 ? ' ×' + CT.mult : ''}`;
    }
  } finally { regenPending = false; }
}
export function rollingDice() {
  const el = document.querySelector('.ct-dice'); if (!el) return () => {};
  const t = setInterval(() => { el.innerHTML = dieFace(1 + Math.floor(Math.random() * 6)) + dieFace(1 + Math.floor(Math.random() * 6)); }, 90);
  return () => clearInterval(t);
}
