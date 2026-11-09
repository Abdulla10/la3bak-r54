/* أقسام الألعاب الكبيرة (جاكارو الحين، ولودو وبلوت لاحقاً): كل قسم صفحة فيها المطابقة والكمبيوتر والأصدقاء */
export const HUBS = {
  jackaro: {
    name: 'جاكارو', icon: '🃏', tag: 'لعبة الورق والكرات: طلّع كراتك للنهاية قبل خصومك',
    sizes: [{ n: 2, label: '2 لاعبين' }, { n: 3, label: '3 لاعبين' }, { n: 4, label: '4 لاعبين (فريقين)' }],
    defSize: 4,
    how: ['كل لاعب 4 كرات يبدأها بالبيت، وتطلع بورقة A أو K.', 'تلعب ورقة بدورك وتحرّك كرة حسب الورقة.', 'لو نزلت على كرة خصمك ترجعها لبيتها.', 'أول من يوصّل كراته (أو فريقه) يفوز.'],
  },
};
HUBS.ludo = {
  name: 'لودو', icon: '🎲', tag: 'ارمِ الزهر ووصّل قطعك الأربع للنهاية قبل الكل',
  sizes: [{ n: 2, label: '2 لاعبين' }, { n: 3, label: '3 لاعبين' }, { n: 4, label: '4 لاعبين' }], defSize: 4,
  how: ['كل لاعب 4 قطع في بيته، وتطلع القطعة برقم 6 بس.', '6 أو كسر قطعة أو وصول للنهاية يعطيك دور إضافي. ثلاث ستات ورا بعض يضيع الدور.', 'تنزل فوق قطعة خصم ترجعها لبيتها، إلا في الخانات الآمنة (خانة البداية والنجمة).', 'النهاية بالرقم المضبوط. أول من يوصّل قطعه الأربع يفوز.'],
};
HUBS.baloot = {
  name: 'بلوت', icon: '♠️', tag: 'لعبة الورق الخليجية: فريقين، صن وحكم، وأول فريق يوصل 152',
  sizes: [{ n: 4, label: '4 لاعبين (فريقين)' }], defSize: 4,
  how: ['4 لاعبين في فريقين، وشريكك اللي يقابلك.', 'المزايدة: حكم (نوع الورقة المكشوفة) أو صن أو بس. لو الكل بس تدور مرة ثانية بنوع ثاني.', 'ثمان أكلات: لازم تتبع النوع، وبالحكم تدق وتكبّر لو ما عندك النوع.', 'صاحب العقد لازم تكون نقاطه أكثر من خصمه وإلا ياخذ الخصم كل النقاط. المشاريع (سرا، خمسين، مية) والبلوت (K و Q الحكم +2) تنعلن بالأزرار بدورك. بالحكم تقدر ترفع دبل/ثري/فور قبل أول ورقة. الهدف 152.'],
};
/* أوضاع لودو: الكلاسيكي قواعده كاملة. «سهم» و«مداهمات» تصميمهما محفوظ للمعاينة فقط (قريباً): قواعدهما غير مطبّقة، فلا تبدأ مباراة بهما (الخادم يرفض variant غير classic). لتفعيل وضع لاحقاً: قواعده بالمحرك + real:true. */
const mi = (body) => `<svg viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
export const LD_MODES = [
  { id: 'classic', name: 'كلاسيكي', real: true,
    icon: mi('<defs><linearGradient id="lmC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb6d4"/><stop offset="1" stop-color="#d9548d"/></linearGradient></defs><circle cx="32" cy="32" r="27" fill="url(#lmC)" stroke="#ffe4ef" stroke-width="4"/><path d="M32 13l5.6 12.2 13.4 1.4-10 9 2.9 13.2L32 41.6 20.1 48.8 23 35.6l-10-9 13.4-1.4z" fill="#fff" opacity=".95"/>'),
    note: 'القواعد الكاملة مطبّقة: زهر من الخادم، 6 تطلّع القطعة، كسر القطع، الخانات الآمنة، ودور إضافي.' },
  { id: 'arrow', name: 'سهم', real: false,
    icon: mi('<defs><linearGradient id="lmA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd0ff"/><stop offset="1" stop-color="#1769d8"/></linearGradient></defs><circle cx="32" cy="32" r="26" fill="#1a2d6b" stroke="#f1c75a" stroke-width="6"/><path d="M18 46L44 20M44 20H27M44 20V37" fill="none" stroke="url(#lmA)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'),
    note: 'قريباً — قيد التطوير. هذي معاينة للتصميم فقط، وقواعد «سهم» الخاصة غير مطبّقة بعد، فما تقدر تبدأ مباراة بها الحين. العب الكلاسيكي.' },
  { id: 'raids', name: 'مداهمات', real: false,
    icon: mi('<defs><linearGradient id="lmR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd0e6"/><stop offset="1" stop-color="#e0507f"/></linearGradient></defs><circle cx="32" cy="32" r="27" fill="#5a1d4a" stroke="#d6dff7" stroke-width="3" stroke-dasharray="6 3"/><path d="M32 10l16 16-8 26H24l-8-26z" fill="url(#lmR)" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 10v42M16 26h32" stroke="#fff" stroke-width="1.8" opacity=".6"/>'),
    note: 'قريباً — قيد التطوير. هذي معاينة للتصميم فقط، وقواعد «مداهمات» الخاصة غير مطبّقة بعد، فما تقدر تبدأ مباراة بها الحين. العب الكلاسيكي.' },
];
export const ldMode = () => { let m = ''; try { m = localStorage.getItem('qawwi_ld_mode') || ''; } catch { /* خاص */ } return LD_MODES.some((x) => x.id === m) ? m : 'classic'; };
/** الوضع المسموح اللعب به فعلاً (الحقيقي فقط) — المعاينة شيء ولعب المباراة شيء */
export const ldPlayable = () => !!LD_MODES.find((x) => x.id === ldMode())?.real;
export const ldPlayMode = () => (ldPlayable() ? ldMode() : 'classic');
export const setLdMode = (m) => { try { localStorage.setItem('qawwi_ld_mode', m); } catch { /* خاص */ } };
function ludoModesHTML() {
  const cur = ldMode(), m = LD_MODES.find((x) => x.id === cur);
  const order = [LD_MODES[2], LD_MODES[1], LD_MODES[0]]; // مداهمات، سهم، كلاسيكي (من اليمين لليسار مثل المرجع)
  return `<section class="ld-modes" aria-label="وضع اللعب"><p class="ld-modes-h">2 – 4 لاعبين</p>
    <div class="ld-tabs" role="tablist">${order.map((x) => `<button type="button" role="tab" class="${x.id === cur ? 'on' : ''}" aria-selected="${x.id === cur}" data-act="ld-mode" data-m="${x.id}"><i>${x.icon}</i><span>${x.name}</span>${x.real ? '' : '<em class="ld-soon">قريباً</em>'}</button>`).join('')}</div>
    <div class="ld-modeinfo"><b>${m.name}${m.real ? '' : ' <em>قريباً · قيد التطوير</em>'}</b><p>${m.note}</p></div></section>`;
}
export const MM = { game: '', seats: 0, stake: 0, waiting: 0, since: 0, timer: 0, online: null, size: {}, stakeSel: {} };
export const STAKES = [0, 100, 500];
export const askAfterMs = 30_000;

export function isHub(id) { return !!HUBS[id]; }

export function hubHTML(id, o) {
  const h = HUBS[id];
  if (!h) return `<div class="card empty-state"><p>هذا القسم غير موجود.</p><a class="btn" href="#/games">رجوع</a></div>`;
  const size = MM.size[id] ?? h.defSize;
  const chips = (act) => h.sizes.map((s) => `<button type="button" class="${size === s.n ? 'on' : ''}" data-act="${act}" data-g="${id}" data-n="${s.n}" aria-pressed="${size === s.n}">${s.label}</button>`).join('');
  if (MM.game === id && MM.seats) return searchHTML(h, id);
  const stake = MM.stakeSel[id] ?? 0;
  const locked = id === 'ludo' && !ldPlayable();
  const lockAttr = locked ? ' disabled aria-disabled="true"' : '';
  const lockNote = locked ? `<p class="notice" role="status">وضع «${LD_MODES.find((x) => x.id === ldMode()).name}» قيد التطوير، ما تقدر تبدأ مباراة به الحين. اختر «كلاسيكي» عشان تلعب.</p>` : '';
  const stakeList = Array.isArray(o.stakes) && o.stakes.length ? o.stakes : STAKES;
  const stakeChips = stakeList.map((v) => `<button type="button" class="${stake === v ? 'on' : ''}" data-act="hub-stake" data-g="${id}" data-v="${v}" aria-pressed="${stake === v}">${v ? '🪙 ' + o.nf(v) : 'مجانية'}</button>`).join('');
  const wallet = `<section class="card wallet"><div><b>🪙 رصيدك: ${o.nf(o.coins)}</b><small>عملات افتراضية للعب فقط، بدون قيمة مالية. <a href="#/shop">🛍️ المتجر</a></small></div>${o.canClaim ? '<button class="btn sm" type="button" data-act="wallet-daily">استلم مكافأة اليوم +200</button>' : '<span class="hint">استلمت مكافأة اليوم ✅</span>'}</section>`;
  const online = MM.online ? `<p class="hint">🟢 ${o.nf(MM.online.online)} متصل بالموقع الحين · ${o.nf(MM.online.waiting)} ينتظر لاعبين</p>` : '';
  return `<div class="stack hub">
    <section class="card hub-hero"><span class="hub-ic" aria-hidden="true">${h.icon}</span><h1 class="section-title" style="margin:0">${h.name}</h1><p class="muted">${o.esc(h.tag)}</p>${online}</section>
    ${id === 'ludo' ? ludoModesHTML() : ''}
    ${wallet}
    <section class="card"><h2>🌐 العب أونلاين مع ناس</h2><p class="muted">نبحث لك عن لاعبين داخلين الموقع الحين. بدون رمز ولا دعوة.</p>
      <div class="of-seg">${chips('hub-size')}</div>
      <p class="hint" style="margin:10px 0 4px">رسم الدخول: الفائزون يقتسمون عملات الجميع. لو ما فيه فائز ترجع الرسوم.</p>
      <div class="of-seg">${stakeChips}</div>
      ${stake ? `<p class="stake-info" role="status">رسم الدخول: <b>🪙 ${o.nf(stake)}</b> · صندوق الجائزة: <b>🪙 ${o.nf(stake * size)}</b> يقتسمه الفائزون${o.coins < stake ? ' · <span class="neg">رصيدك ما يكفي لهذا الرسم</span>' : ''}</p>` : ''}
      ${lockNote}<button class="btn block" type="button" data-act="hub-search" data-g="${id}" style="margin-top:12px"${lockAttr}>🔍 ابحث عن لاعبين</button></section>
    <section class="card"><h2>🤖 العب ضد الكمبيوتر</h2><p class="muted">تبدأ فوراً بدون انتظار.</p>
      <button class="btn block ghost" type="button" data-act="hub-bots" data-g="${id}"${lockAttr}>ابدأ ضد الكمبيوتر (${size} لاعبين)</button></section>
    <section class="card"><h2>👥 مع أصدقائك</h2><p class="muted">أنشئ غرفة وأرسل الرمز، أو ادخل برمز صديقك.</p>
      <div class="btn-row">${locked ? '<button class="btn ghost" type="button" disabled aria-disabled="true">أنشئ غرفة</button>' : `<a class="btn ghost" href="#/game/${id}">أنشئ غرفة</a>`}<a class="btn ghost" href="#/rooms">عندي رمز</a></div></section>
    <details class="card"><summary><b>📖 كيف تلعب؟</b></summary><ul class="hub-how">${h.how.map((t) => `<li>${o.esc(t)}</li>`).join('')}</ul></details>
  </div>`;
}

function searchHTML(h, id) {
  const slots = Array.from({ length: MM.seats }, (_, i) => `<div class="mm-slot ${i < MM.waiting ? 'on' : ''}">${i < MM.waiting ? (i === 0 ? '🙋' : '👤') : '…'}</div>`).join('');
  return `<div class="stack hub"><section class="card mm"><h1 class="section-title" style="margin:0">جاري البحث عن لاعبين…</h1>
    <p class="muted">${h.name} · ${MM.seats} لاعبين · ${MM.stake ? '🪙 رسم ' + MM.stake : 'غرفة مجانية'}</p>
    <div class="mm-slots">${slots}</div>
    <p class="mm-timer" id="mmTimer" aria-live="off">00:00</p>
    <p class="hint" id="mmCount">المنتظرين الحين: ${MM.waiting} من ${MM.seats}</p>
    <div id="mmAsk"></div>
    <button class="btn ghost block" type="button" data-act="hub-cancel">إلغاء البحث</button></section></div>`;
}

export function askHTML(h) {
  return `<div class="notice">ما لقينا لاعبين كفاية للحين. وش تبي؟</div>
    <button class="btn block" type="button" data-act="hub-fill">🤖 كمّل ببوتات وابدأ الحين${MM.stake ? ' (مجانية، بدون رسم)' : ''}</button>
    <button class="btn ghost block" type="button" data-act="hub-wait">⏳ أنتظر أكثر</button>`;
}

export function tickTimer() {
  clearInterval(MM.timer);
  MM.asked = false;
  MM.timer = setInterval(() => {
    const el = document.getElementById('mmTimer');
    if (!MM.game) return clearInterval(MM.timer);
    const sec = Math.floor((Date.now() - MM.since) / 1000);
    if (el) el.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    const ask = document.getElementById('mmAsk');
    if (ask && !MM.asked && !MM.snooze && Date.now() - MM.since >= askAfterMs) { MM.asked = true; ask.innerHTML = askHTML(HUBS[MM.game]); }
  }, 500);
}
export function reset() { clearInterval(MM.timer); MM.game = ''; MM.seats = 0; MM.waiting = 0; MM.asked = false; MM.snooze = false; }
