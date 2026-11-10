// R69v: «لعبة الجاسوس» داخل الغرفة الصوتية. الخادم يوزع الأدوار سراً، وكل لاعب يشوف دوره بس.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const first = (s) => esc([...String(s || '؟')][0]);
const ART = '/assets/art69/';
const CSS = `
.sp69-ov{position:fixed;inset:0;z-index:96;display:flex;justify-content:center;color:#fff;direction:rtl;font-family:inherit;overflow:hidden;background:linear-gradient(180deg,#12041fcc,#12041fee),url(/assets/art67/roombg/cosmic-palace.jpg) center/cover no-repeat,#12041f}
.sp69-ov[hidden]{display:none}
.sp69-in{position:relative;width:100%;max-width:470px;display:flex;flex-direction:column;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-bottom,0px) + 14px);overflow-y:auto}
.sp69-top{display:flex;align-items:center;gap:8px}
.sp69-top h2{flex:1;margin:0;text-align:center;font-size:19px;font-weight:900;color:#ffd76a;text-shadow:0 2px 10px #ff8a1a66}
.sp69-ic{width:40px;height:40px;border-radius:50%;border:1.5px solid #e9b44c99;background:linear-gradient(180deg,#3a1470,#1c0838);color:#fff;font-size:18px;display:grid;place-items:center;cursor:pointer;flex:none}
.sp69-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 18px;border-radius:99px;background:linear-gradient(180deg,#2a0c52,#14052a);border:2px solid #e9b44c;box-shadow:0 0 14px #e9b44c55;font-weight:900;font-size:16px}
.sp69-card{background:linear-gradient(180deg,#2c0f55f2,#170632f2);border-radius:20px;padding:12px;box-shadow:0 0 0 1.5px #e9b44c,0 0 0 3px #6a3d08,0 10px 26px #000a}
.sp69-card h3{margin:0 0 8px;font-size:16px;color:#ffd76a;display:flex;align-items:center;gap:6px}
.sp69-txt{margin:0;font-size:13.5px;line-height:1.7;color:#eadcff}
.sp69-hero{display:grid;place-items:center}.sp69-hero img{width:150px;filter:drop-shadow(0 10px 20px #000c)}
.sp69-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 6px}
.sp69-slot{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}
.sp69-av{position:relative;width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:20px;background:radial-gradient(circle at 35% 30%,#a07aff,#4a1fa6) padding-box;border:3px solid transparent;box-shadow:0 0 0 2.5px #f2c14e,0 0 0 4px #8a5a12,0 6px 14px #000a;overflow:hidden;flex:none}
.sp69-av img{width:100%;height:100%;object-fit:cover}
.sp69-slot.is-empty .sp69-av{background:#ffffff0d;box-shadow:none;border:2px dashed #c79bff66;color:#c79bff}
.sp69-name{max-width:100%;padding:2px 10px;border-radius:99px;background:linear-gradient(180deg,#2a0c52,#14052a);border:1.5px solid #e9b44c;font-size:12px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp69-crown{position:absolute;top:-12px;left:50%;transform:translateX(-50%);font-size:16px;z-index:3}
.sp69-set{display:grid;gap:8px}
.sp69-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:14px;background:#ffffff0d;font-size:13.5px}
.sp69-row>span{font-weight:800;white-space:nowrap}
.sp69-chips{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
.sp69-chip{min-width:40px;padding:6px 9px;border-radius:99px;border:1px solid #c79bff55;background:#1a0733;color:#e9dcff;font-weight:800;font-size:12.5px;cursor:pointer}
.sp69-chip.on{background:linear-gradient(180deg,#b06bff,#6d2fd6);border-color:transparent;color:#fff}
.sp69-chip:disabled{opacity:.8;cursor:default}
.sp69-btn{width:100%;padding:14px;border:2px solid #fff3b0;border-radius:18px;font-size:19px;font-weight:900;cursor:pointer;color:#3a1600;background:linear-gradient(180deg,#ffe07a,#ffb21f 60%,#e88a00);box-shadow:inset 0 2px 0 #fff8,0 6px 0 #a35a00,0 12px 24px #0008}
.sp69-btn:active{transform:translateY(3px)}.sp69-btn:disabled{filter:grayscale(.6);opacity:.6}
.sp69-btn.ghost{background:#ffffff14;color:#fff;box-shadow:none;border:1px solid #c79bff55;font-size:15px;padding:11px}
.sp69-steps{margin:0;padding:0;list-style:none;display:grid;gap:7px;font-size:13px;color:#eadcff}
.sp69-steps li{display:flex;gap:8px;line-height:1.55}.sp69-steps i{flex:none;width:22px;height:22px;border-radius:50%;background:linear-gradient(#ffd76a,#e8a000);color:#3a1600;font-style:normal;font-weight:900;display:grid;place-items:center;font-size:12px}
.sp69-err{margin:0;padding:8px 10px;border-radius:12px;background:#ff3b5c22;border:1px solid #ff3b5c66;color:#ffd0d8;font-size:13px;text-align:center}
.sp69-wait{text-align:center;font-size:15px;font-weight:800;padding:12px;border-radius:16px;background:linear-gradient(180deg,#2a0c52,#14052a);border:2px solid #e9b44c}
/* الطاولة */
.sp69-table{position:relative;width:100%;aspect-ratio:1/1;max-height:56vh;margin:0 auto;border-radius:28px;background:radial-gradient(circle at 50% 62%,#ff9a2a33 0,transparent 40%),linear-gradient(180deg,#2a0c52e6,#160630f0);box-shadow:0 0 0 2px #e9b44c,0 0 0 4px #7a4a0a,0 0 30px #b06bff55,inset 0 0 50px #000a}
.sp69-table::after{content:"";position:absolute;left:50%;top:52%;width:74%;height:74%;transform:translate(-50%,-50%);border-radius:50%;border:2px solid #e9b44c66;box-shadow:0 0 22px #b06bff55,inset 0 0 26px #b06bff33}
.sp69-mid{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:50%;z-index:1;text-align:center}
.sp69-mid img{width:100%;filter:drop-shadow(0 10px 20px #000c)}
.sp69-p{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;width:84px;z-index:2;cursor:default;border:0;background:none;color:inherit;font:inherit;padding:0}
.sp69-p .sp69-av{width:58px;height:58px}
.sp69-p.can-vote{cursor:pointer}.sp69-p.can-vote .sp69-av{animation:sp69pulse 1.4s ease-in-out infinite}
.sp69-p.is-pick .sp69-av{box-shadow:0 0 0 3px #ff4d6a,0 0 0 5px #ffd24a,0 0 24px #ff4d6a}
.sp69-p.is-pick .sp69-name{background:#ff4d6a}
.sp69-p.is-spy .sp69-av::after{content:"🕵️";position:absolute;inset:0;display:grid;place-items:center;font-size:28px;background:#000a}
.sp69-p.is-me .sp69-name{color:#ffd76a}
.sp69-badge{position:absolute;top:-4px;left:-2px;min-width:22px;height:22px;border-radius:99px;background:#ff3b5c;color:#fff;font-size:12px;font-weight:900;display:grid;place-items:center;border:2px solid #fff;z-index:3}
.sp69-tick{position:absolute;bottom:18px;right:4px;width:20px;height:20px;border-radius:50%;background:#2ecc71;border:2px solid #fff;font-size:11px;display:grid;place-items:center;z-index:3}
@keyframes sp69pulse{50%{transform:scale(1.07)}}
.sp69-role{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:linear-gradient(180deg,#3a1470,#1c0838);border:2px solid #b06bff;box-shadow:0 0 22px #b06bff55;cursor:pointer}
.sp69-role.is-spy{border-color:#ff4d6a;box-shadow:0 0 22px #ff4d6a66;background:linear-gradient(180deg,#4a0f2a,#1c0818)}
.sp69-role .ic{font-size:34px;flex:none}
.sp69-role small{display:block;color:#ffd76a;font-weight:900;font-size:12.5px}
.sp69-role b{font-size:22px;font-weight:900;display:block}
.sp69-role.is-hidden b{filter:blur(9px);user-select:none}
.sp69-role em{font-style:normal;font-size:11.5px;color:#cdb8f2}
.sp69-ask{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:18px;background:linear-gradient(180deg,#2c0f55,#1c0838);border:2px solid #e9b44c}
.sp69-ask img{width:46px;height:46px;flex:none}
.sp69-ask small{display:block;color:#ffd76a;font-weight:900}
.sp69-ask p{margin:0;font-size:16px;font-weight:800}
.sp69-words{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sp69-word{padding:12px 6px;border-radius:14px;border:2px solid #e9b44c;background:linear-gradient(180deg,#3a1470,#1c0838);color:#fff;font-weight:900;font-size:16px;cursor:pointer}
.sp69-res{text-align:center;padding:16px 12px}
.sp69-res .big{font-size:56px;line-height:1}
.sp69-res h3{justify-content:center;font-size:22px;margin:6px 0}
.sp69-res p{margin:4px 0;color:#eadcff;font-size:14.5px}
.sp69-res .word{display:inline-block;margin-top:6px;padding:6px 18px;border-radius:99px;background:#ffd76a;color:#3a1600;font-weight:900;font-size:18px}
.sp69-score{display:grid;gap:6px;margin:0;padding:0;list-style:none}
.sp69-score li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:#ffffff0d}
.sp69-score li b{flex:1}.sp69-score li span{font-weight:900;color:#ffd76a}
.sp69-score li.top{background:linear-gradient(90deg,#ffd76a33,#ffffff0d);border:1.5px solid #ffd76a}
.sp69-flip{animation:sp69flip .7s ease both}@keyframes sp69flip{from{transform:rotateY(90deg) scale(.8);opacity:0}to{transform:none;opacity:1}}
.sp69-float{position:fixed;top:calc(env(safe-area-inset-top,0px) + 118px);left:50%;transform:translateX(-50%);z-index:85;display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:99px;border:1.5px solid #ffc83d;background:linear-gradient(180deg,#5a2fd6,#2a0f6a);color:#fff;font-weight:900;font-size:14px;box-shadow:0 8px 20px #000a,0 0 18px #8a5cff88;cursor:pointer;white-space:nowrap}
.sp69-float[hidden]{display:none}
body:has(.so-room-panel[data-so-open-panel]) .sp69-float{display:none!important}
@media (prefers-reduced-motion:reduce){.sp69-ov *{animation:none!important}}
`;
const CATS = [['places', 'أماكن'], ['foods', 'أكلات'], ['jobs', 'مهن'], ['animals', 'حيوانات'], ['things', 'أغراض'], ['mixed', 'منوعة']];

export function startRoomSpy() {
  if (globalThis.__sp69) return; globalThis.__sp69 = true;
  if (!document.querySelector('style[data-sp69]')) { const s = document.createElement('style'); s.dataset.sp69 = '1'; s.textContent = CSS; document.head.append(s); }
  const api = (u, body) => fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || 'تعذّر الطلب.'); return j; });
  const ov = document.createElement('div'); ov.className = 'sp69-ov'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'لعبة الجاسوس');
  const fl = document.createElement('button'); fl.type = 'button'; fl.className = 'sp69-float'; fl.hidden = true;
  document.body.append(ov, fl);
  const S = { room: '', d: null, at: 0, open: false, err: '', busy: false, key: '', show: false, poll: 0, lastPhase: '' };
  const roomId = () => { const m = /^#\/social-room\/([0-9a-f-]{36})/i.exec((globalThis.__LA3BAK_NAV__ || location).hash); return m ? m[1] : ''; };
  const g = () => S.d?.game || null;
  const left = () => { const x = g(); if (!x || x.left === null) return null; return Math.max(0, x.left - (performance.now() - S.at)); };
  const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const av = (p, extra = '') => `<span class="sp69-av">${p.avatar && /^(\/|https:)/.test(p.avatar) ? `<img src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async">` : first(p.name)}</span>${extra}`;
  let ac = null; const beep = (f = 660, d = 0.08) => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), gg = ac.createGain(); o.frequency.value = f; gg.gain.value = 0.05; o.connect(gg).connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch { /* */ } };

  function lobby(x) {
    const c = S.d.can, me = S.d.me, ed = c.settings ? '' : 'disabled';
    const slots = Array.from({ length: 8 }, (_, i) => { const p = x.players[i]; return p ? `<div class="sp69-slot">${av(p)}${p.id === x.host ? '<i class="sp69-crown">👑</i>' : ''}<span class="sp69-name">${esc(p.name)}</span></div>` : '<div class="sp69-slot is-empty"><span class="sp69-av">+</span><span class="sp69-name">فاضي</span></div>'; }).join('');
    const chips = (k, list, cur) => list.map(([v, l]) => `<button type="button" class="sp69-chip ${String(cur) === String(v) ? 'on' : ''}" data-sp="set" data-k="${k}" data-v="${v}" ${ed}>${l}</button>`).join('');
    return `<div class="sp69-hero"><img src="${ART}spy-hero.webp?v=r69z5" alt="" decoding="async"></div>
    <section class="sp69-card"><h3>👥 اللاعبين <small style="color:#cdb8f2">(${x.players.length} من 8 · أقل شي ${x.minPlayers})</small></h3><div class="sp69-grid">${slots}</div></section>
    <section class="sp69-card"><h3>⚙️ إعدادات اللعبة</h3><div class="sp69-set">
      <div class="sp69-row"><span>🕵️ الوضع</span><div class="sp69-chips">${chips('mode', [['one', 'جاسوس واحد'], ['two', 'جاسوسين']], x.mode)}</div></div>
      <div class="sp69-row"><span>🔁 عدد الجولات</span><div class="sp69-chips">${chips('rounds', [[1, '1'], [2, '2'], [3, '3'], [5, '5']], x.rounds)}</div></div>
      <div class="sp69-row"><span>📚 نوع الكلمات</span><div class="sp69-chips">${chips('cat', CATS, x.cat)}</div></div>
      <div class="sp69-row"><span>⏱️ وقت النقاش</span><div class="sp69-chips">${chips('discussMs', [[60000, '60ث'], [90000, '90ث'], [120000, '2د'], [180000, '3د']], x.discussMs)}</div></div>
      <div class="sp69-row"><span>🎯 وضع التخمين</span><div class="sp69-chips">${chips('guess', [['true', 'شغال'], ['false', 'طافي']], x.guess)}</div></div>
      <p class="sp69-txt" style="font-size:12px">${x.mode === 'two' ? '🤝 جاسوسين يعرفون بعض ويتعاونون سراً (5 لاعبين أو أكثر).' : '🕵️ جاسوس واحد ضد الكل.'} ${x.guess ? 'لو انكشف الجاسوس يقدر يخمن الكلمة، ولو صاب يفوز.' : ''} التصويت سري.</p>
    </div></section>
    ${S.err ? `<p class="sp69-err" role="alert">${esc(S.err)}</p>` : ''}
    ${c.start ? `<button type="button" class="sp69-btn" data-sp="start" ${S.busy ? 'disabled' : ''}>▶ بدء اللعبة</button>` : me.host ? `<button type="button" class="sp69-btn" disabled>ينتظر لاعبين (أقل شي ${x.minPlayers})…</button>` : ''}
    ${c.join ? `<button type="button" class="sp69-btn" data-sp="join" ${S.busy ? 'disabled' : ''}>أشارك 🙋</button>` : ''}
    ${!me.host && me.joined ? `<p class="sp69-wait">أنت داخل ✓ ننتظر ${esc(x.hostName)} يبدأ…</p>` : ''}
    ${c.leave ? '<button type="button" class="sp69-btn ghost" data-sp="leave">انسحب</button>' : ''}${c.cancel ? '<button type="button" class="sp69-btn ghost" data-sp="cancel">إلغاء اللعبة</button>' : ''}
    <section class="sp69-card"><h3>🎯 فكرة اللعبة</h3><p class="sp69-txt">لعبة ذكاء وملاحظة: الكل ياخذ نفس الكلمة السرية إلا الجاسوس. اكتشفوه قبل لا يفهم الكلمة!</p></section>
    <section class="sp69-card"><h3>🎮 كيف تلعب؟</h3><ol class="sp69-steps"><li><i>1</i>كل اللاعبين ياخذون نفس الكلمة (مثلاً: المطار).</li><li><i>2</i>لاعب واحد بس هو الجاسوس وما يعرف الكلمة.</li><li><i>3</i>تتناقشون بالصوت وتسألون أسئلة غير مباشرة.</li><li><i>4</i>بالنهاية تصوتون سراً على اللي تحسبونه الجاسوس.</li></ol></section>
    <section class="sp69-card"><h3>🏆 الفوز</h3><p class="sp69-txt">يفوز المواطنين إذا كشفوا الجاسوس (+1 لكل واحد). ويفوز الجاسوس إذا ما انكشف (+2)، أو انكشف وخمّن الكلمة صح (+3).</p></section>`;
  }
  function table(x) {
    const n = x.players.length, voting = x.phase === 'vote' && S.d.can.vote, open = x.phase === 'result' || x.phase === 'done';
    return `<div class="sp69-table">${x.players.map((p, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2, r = 41, l = 50 + r * Math.cos(a), t = 52 + r * Math.sin(a) * 0.95;
      const pick = x.myVote === p.id, can = voting && !p.me;
      return `<button type="button" class="sp69-p${can ? ' can-vote' : ''}${pick ? ' is-pick' : ''}${open && p.spy ? ' is-spy' : ''}${p.me ? ' is-me' : ''}" style="left:${l}%;top:${t}%" ${can ? `data-sp="vote" data-id="${esc(p.id)}"` : 'tabindex="-1"'} aria-label="${esc(p.name)}">${av(p)}${p.id === x.host ? '<i class="sp69-crown">👑</i>' : ''}${open && p.votes ? `<i class="sp69-badge">${p.votes}</i>` : ''}${x.phase === 'vote' && p.voted ? '<i class="sp69-tick">✓</i>' : ''}<span class="sp69-name">${p.me ? 'أنت' : esc(p.name)}</span></button>`; }).join('')}
      <div class="sp69-mid"><img src="${ART}spy-hero.webp?v=r69z5" alt="" decoding="async"></div></div>`;
  }
  function role() {
    const r = S.d.role; if (!r) return '';
    return r.spy ? `<div class="sp69-role is-spy${S.show ? '' : ' is-hidden'}" data-sp="peek"><span class="ic">🕵️</span><div><small>دورك السري · اضغط عشان تشوف</small><b>${S.show ? 'أنت الجاسوس!' : '••••••'}</b><em>${S.show ? `الفئة: ${esc(r.cat)}${r.partners?.length ? ` · شريكك: ${esc(r.partners.join('، '))}` : ''} — حاول تفهم الكلمة بدون ما تنكشف` : 'خلك حذر، لا أحد يشوف شاشتك'}</em></div></div>`
      : `<div class="sp69-role${S.show ? '' : ' is-hidden'}" data-sp="peek"><span class="ic">🔑</span><div><small>الكلمة السرية · اضغط عشان تشوف</small><b>${S.show ? esc(r.word) : '••••••'}</b><em>الفئة: ${esc(r.cat)} — لا تقولها صريحة!</em></div></div>`;
  }
  function playing(x) {
    const c = S.d.can; let mid = '';
    if (x.phase === 'reveal') mid = `<div class="sp69-wait sp69-flip">🎴 شوف دورك السري… النقاش يبدأ بعد شوي</div>`;
    if (x.phase === 'discuss') mid = `${x.ask ? `<div class="sp69-ask"><img src="${ART}spy-mag.webp?v=r69z5" alt=""><div><small>🎤 دور السؤال</small><p><b>${esc(x.ask.from)}</b> يسأل <b>${esc(x.ask.to)}</b> سؤال غير مباشر</p></div></div>` : ''}<div class="sp69-wait">فكروا جيداً… هناك جاسوس بينكم! 🔍</div>${c.skip ? '<button type="button" class="sp69-btn ghost" data-sp="skip">ابدأ التصويت الحين 🗳️</button>' : ''}`;
    if (x.phase === 'vote') mid = c.vote ? `<div class="sp69-wait">🗳️ اضغط على اللي تحسبه الجاسوس · ${x.myVote ? 'صوّتت ✓ (تقدر تغيّر)' : 'التصويت سري'}<br><small style="color:#cdb8f2">صوّت ${x.votedCount} من ${x.players.length}</small></div>` : `<div class="sp69-wait">🗳️ اللاعبين يصوتون… (${x.votedCount} من ${x.players.length})</div>`;
    if (x.phase === 'guess') mid = x.options ? `<section class="sp69-card"><h3>🎯 انكشفت! خمّن الكلمة عشان تفوز</h3><div class="sp69-words">${x.options.map((w) => `<button type="button" class="sp69-word" data-sp="guess" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div></section>` : `<div class="sp69-wait">😱 انكشف الجاسوس <b>${esc(x.guessing)}</b>! يحاول الحين يخمن الكلمة…</div>`;
    if (x.phase === 'result' && x.result) { const R = x.result, town = R.winner === 'town';
      mid = `<section class="sp69-card sp69-res sp69-flip"><div class="big">${town ? '🎉' : '🕵️'}</div><h3>${town ? 'كشفتوا الجاسوس! فاز المواطنين' : 'فاز الجاسوس!'}</h3>
        <p>${R.spies.length > 1 ? 'الجواسيس' : 'الجاسوس'}: <b>${esc(R.spies.join(' و '))}</b></p>
        <p>${R.accused ? `أغلب الأصوات على: <b>${esc(R.accused)}</b>` : 'الأصوات تعادلت، ما انكشف أحد'}</p>
        ${R.guess ? `<p>خمّن: «${esc(R.guess)}» ${R.guessed ? '✅ صح!' : '❌ غلط'}</p>` : ''}<span class="word">الكلمة: ${esc(R.word)}</span></section>`; }
    const label = { reveal: 'شوف دورك', discuss: 'الوقت المتبقي للنقاش', vote: 'وقت التصويت', guess: 'وقت التخمين', result: 'الجولة الجاية بعد' }[x.phase] || '';
    return `<div style="text-align:center"><span class="sp69-pill">⏱️ ${label} <b data-sp69-t dir="ltr">--:--</b></span></div>${table(x)}${role()}${S.err ? `<p class="sp69-err" role="alert">${esc(S.err)}</p>` : ''}${mid}${c.cancel ? '<button type="button" class="sp69-btn ghost" data-sp="cancel">إيقاف اللعبة</button>' : ''}`;
  }
  function done(x) {
    const sorted = [...x.players].sort((a, b) => b.score - a.score), top = sorted[0]?.score ?? 0;
    return `<section class="sp69-card sp69-res"><div class="big">🏆</div><h3>النتيجة النهائية</h3>${x.result ? `<p>آخر كلمة كانت: <b>${esc(x.result.word)}</b></p>` : ''}
      <ol class="sp69-score">${sorted.map((p, i) => `<li class="${p.score === top && top > 0 ? 'top' : ''}"><i style="font-style:normal">${p.score === top && top > 0 ? '👑' : i + 1}</i>${av(p)}<b>${p.me ? 'أنت' : esc(p.name)}</b><span>${p.score} نقطة</span></li>`).join('')}</ol></section>
      ${S.d.can.again ? '<button type="button" class="sp69-btn" data-sp="again">لعبة جديدة</button>' : ''}<button type="button" class="sp69-btn ghost" data-sp="close">رجوع للغرفة</button>`;
  }
  function paint() {
    const x = g(), r = S.room;
    fl.hidden = !(r && x && !S.open && x.phase !== 'done');
    if (!fl.hidden) fl.textContent = x.phase === 'lobby' ? `🕵️ لعبة الجاسوس تنتظر لاعبين · ${S.d.me.joined ? 'افتح' : 'انضم'}` : `🕵️ لعبة الجاسوس شغالة · ${S.d.me.joined ? 'ارجع' : 'تفرّج'}`;
    if (!S.open || !r) { ov.hidden = true; return; }
    ov.hidden = false;
    const head = `<header class="sp69-top"><button type="button" class="sp69-ic" data-sp="close" aria-label="رجوع للغرفة">✕</button><h2>${x && x.phase !== 'lobby' && x.phase !== 'done' ? `<span class="sp69-pill">الجولة ${x.round} / ${x.rounds}</span>` : 'لعبة الجاسوس'}</h2><span class="sp69-ic" aria-hidden="true">🕵️</span></header>`;
    let body;
    if (!x) body = `<div class="sp69-hero"><img src="${ART}spy-hero.webp?v=r69z5" alt=""></div><section class="sp69-card"><h3>🕵️ لعبة الجاسوس</h3><p class="sp69-txt">الكل يعرف الكلمة السرية إلا الجاسوس. تناقشوا بالصوت، وصوتوا سراً، واكشفوه قبل لا يكشف الكلمة!</p></section>${S.err ? `<p class="sp69-err">${esc(S.err)}</p>` : ''}${S.d?.can?.create ? `<button type="button" class="sp69-btn" data-sp="create" ${S.busy ? 'disabled' : ''}>سوّ لعبة جديدة</button>` : '<p class="sp69-wait">لعبة الجاسوس يسويها صاحب الغرفة أو المشرفين، وأنت تقدر تنضم لها.</p>'}`;
    else if (x.phase === 'lobby') body = lobby(x);
    else if (x.phase === 'done') body = done(x);
    else body = playing(x);
    ov.innerHTML = `<div class="sp69-in">${head}${body}</div>`;
    tick();
  }
  function tick() { const el = ov.querySelector('[data-sp69-t]'); const l = left(); if (el && l !== null) el.textContent = mmss(l); }
  function apply(d) {
    const prevPhase = g()?.phase; S.d = d; S.at = performance.now(); const x = g();
    if (x && prevPhase && prevPhase !== x.phase) { if (x.phase === 'reveal') S.show = false; if (S.open) beep(x.phase === 'result' ? 880 : 520, 0.12); }
    const k = JSON.stringify([x?.phase, x?.round, x?.players?.map((p) => [p.id, p.voted, p.votes, p.score, p.spy]), x?.mode, x?.rounds, x?.cat, x?.discussMs, x?.guess, x?.ask?.from, x?.myVote, x?.votedCount, x?.options, x?.result, d.role, d.can, d.me, S.err, S.busy, S.show]);
    if (k !== S.key) { S.key = k; paint(); } else tick();
    schedule();
  }
  async function poll() {
    const r = roomId();
    if (r !== S.room) { S.room = r; S.d = null; S.open = false; S.err = ''; S.key = ''; S.show = false; }
    if (!r) { paint(); schedule(); return; }
    try { const d = await api('/api/room-spy?room=' + encodeURIComponent(r)); if (S.room === r) apply(d); } catch { schedule(); }
  }
  function schedule() { clearTimeout(S.poll); const x = g(); const ms = !S.room ? 6000 : x && x.phase !== 'lobby' && x.phase !== 'done' ? 1200 : x?.phase === 'lobby' ? 2500 : 7000; S.poll = setTimeout(poll, document.hidden ? Math.max(ms, 6000) : ms); }
  const run = async (path, extra = {}) => { if (S.busy) return; S.busy = true; S.err = ''; paint();
    try { const d = await api('/api/room-spy/' + path, { room: S.room, ...extra }); S.busy = false; apply(d); } catch (e) { S.busy = false; S.err = e.message || 'تعذّر الطلب.'; S.key = ''; paint(); poll(); } };
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sp]'); if (!b || b.disabled) return; const a = b.dataset.sp;
    if (a === 'close') { S.open = false; S.err = ''; paint(); return; }
    if (a === 'peek') { S.show = !S.show; S.key = ''; paint(); return; }
    if (a === 'set') { const k = b.dataset.k, v = b.dataset.v; return run('settings', { [k]: k === 'guess' ? v === 'true' : k === 'rounds' || k === 'discussMs' ? Number(v) : v }); }
    if (a === 'vote') return run('vote', { target: b.dataset.id });
    if (a === 'guess') return run('guess', { word: b.dataset.w });
    if (a === 'cancel') { if (!confirm('توقف لعبة الجاسوس؟')) return; return run('cancel'); }
    if (['create', 'join', 'leave', 'start', 'skip', 'again'].includes(a)) return run(a);
  });
  fl.addEventListener('click', () => { S.open = true; S.err = ''; S.key = ''; paint(); poll(); });
  document.addEventListener('click', (e) => { if (!e.target.closest?.('[data-sp69-open]')) return; e.preventDefault(); e.stopPropagation(); document.querySelector('[data-so-action="panel-close"]')?.click(); S.open = true; S.err = ''; S.key = ''; paint(); poll(); }, true);
  addEventListener('la3bak:spy', (e) => { if (e.detail?.room === S.room) poll(); });
  addEventListener('hashchange', () => setTimeout(poll, 50));
  addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  setInterval(() => { if (S.open && g()) tick(); }, 250);
  poll();
}
