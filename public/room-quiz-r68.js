// R68z: المسابقة المباشرة بالغرفة — المشرف يطرح سؤال، والأعضاء يجاوبون، وأول جواب صح يفوز.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const CSS = `.rq68{position:fixed;inset-inline:10px;top:76px;z-index:80;max-width:460px;margin:0 auto;color:#fff;font-family:inherit;direction:rtl}
.rq68-card{background:linear-gradient(160deg,#3a1468f2,#1d0a36f2);border:1.5px solid #ffc83d;border-radius:20px;padding:12px 14px;box-shadow:0 12px 34px #000a,0 0 22px #ffc83d44;animation:rq68in .35s}
@keyframes rq68in{from{transform:translateY(-14px);opacity:0}}.rq68-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;opacity:.9}.rq68-h b{color:#ffd76b}
.rq68-q{font-size:17px;font-weight:900;margin:6px 0 10px;line-height:1.5}.rq68-ops{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rq68-ops button{border:1px solid #ffffff2e;border-radius:14px;background:#ffffff12;color:#fff;font:inherit;font-weight:800;padding:10px 8px;cursor:pointer;min-height:46px}
.rq68-ops button.ok{background:#1f6b3a;border-color:#4be38a}.rq68-ops button.no{background:#7a1830;border-color:#ff6b85}.rq68-ops button:disabled{cursor:default}
.rq68-bar{height:6px;border-radius:99px;background:#ffffff18;margin-top:10px;overflow:hidden}.rq68-bar u{display:block;height:100%;background:linear-gradient(90deg,#ffc83d,#ff6bd5);transition:width 1s linear}
.rq68-res{text-align:center;font-size:16px;font-weight:900;margin-top:8px}.rq68-x{background:none;border:0;color:#fff;font-size:18px;cursor:pointer;padding:0 4px}
.rq68-fab{position:fixed;left:12px;bottom:170px;z-index:79;width:52px;height:52px;border-radius:50%;border:2px solid #ffc83d;background:radial-gradient(circle at 50% 30%,#6a2ab8,#2a0e4a);font-size:24px;box-shadow:0 6px 18px #000a,0 0 14px #ffc83d55;cursor:pointer}
.rq68-form label{display:block;font-size:13px;margin:8px 0 4px;opacity:.9}.rq68-form input{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid #9b5cff88;background:#0f0520;color:#fff;padding:9px 11px;font:inherit}
.rq68-opt{display:flex;gap:6px;align-items:center;margin-bottom:6px}.rq68-opt input[type=radio]{width:auto;accent-color:#ffc83d}.rq68-pz{display:flex;flex-wrap:wrap;gap:6px}
.rq68-pz button{border:1px solid #ffffff2e;background:#ffffff10;color:#fff;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}.rq68-pz button.on{background:#7b3cff;border-color:#b44dff}
.rq68-go{width:100%;margin-top:12px;border:0;border-radius:14px;padding:12px;font:inherit;font-weight:900;color:#3a1a00;background:linear-gradient(90deg,#ffb020,#ffd76b);cursor:pointer}.rq68-err{color:#ffb3c0;font-size:13px;margin-top:6px}`;
let started = false;
export function startRoomQuiz({ api }) {
  if (started) return; started = true;
  if (!document.querySelector('style[data-rq68]')) { const s = document.createElement('style'); s.dataset.rq68 = '1'; s.textContent = CSS; document.head.append(s); }
  const host = document.createElement('div'); host.className = 'rq68'; host.hidden = true; document.body.append(host);
  const fab = document.createElement('button'); fab.type = 'button'; fab.className = 'rq68-fab'; fab.hidden = true; fab.setAttribute('aria-label', 'مسابقة مباشرة'); fab.textContent = '🧠'; document.body.append(fab);
  const S = { room: '', d: null, form: null, err: '', busy: false, dismissed: '', timer: 0, tick: 0 };
  const roomId = () => { const m = /^#\/social-room\/([0-9a-f-]{36})/i.exec((globalThis.__LA3BAK_NAV__ || location).hash); return m ? m[1] : ''; };
  const left = () => S.d?.quiz && !S.d.quiz.closed ? Math.max(0, Math.ceil((S.d.quiz.endsAt - Date.now()) / 1000)) : 0;
  function paint() {
    const z = S.d?.quiz;
    fab.hidden = !(S.room && S.d?.mod && (!z || z.closed) && !S.form);
    if (S.form) {
      const f = S.form;
      host.hidden = false; host.innerHTML = `<div class="rq68-card rq68-form"><div class="rq68-h"><b>🧠 مسابقة جديدة</b><button class="rq68-x" type="button" data-rq="close" aria-label="إغلاق">✕</button></div>
        <label>السؤال</label><input data-rq-in="q" maxlength="120" value="${esc(f.q)}" placeholder="مثال: كم عدد لاعبين البلوت؟">
        <label>الخيارات (اختر الجواب الصح بالدائرة)</label>${f.options.map((o, i) => `<div class="rq68-opt"><input type="radio" name="rqc" data-rq-c="${i}" ${f.correct === i ? 'checked' : ''} aria-label="الجواب الصح"><input data-rq-o="${i}" maxlength="40" value="${esc(o)}" placeholder="خيار ${i + 1}"></div>`).join('')}
        <label>الجائزة (من رصيدك، ترجع لك لو ما فاز أحد)</label><div class="rq68-pz">${(S.d?.prizes || [0]).map((p) => `<button type="button" data-rq-p="${p}" class="${f.prize === p ? 'on' : ''}">${p ? '🪙 ' + nf(p) : 'بدون جائزة'}</button>`).join('')}</div>
        ${S.err ? `<p class="rq68-err" role="alert">${esc(S.err)}</p>` : ''}<button class="rq68-go" type="button" data-rq="start" ${S.busy ? 'disabled' : ''}>ابدأ المسابقة (30 ثانية)</button></div>`;
      return;
    }
    if (!z || (z.closed && S.dismissed === z.id)) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    const sec = left(), mine = z.mine;
    const ops = z.options.map((o, i) => { const cls = z.closed || mine !== null ? (i === z.correct ? 'ok' : i === mine ? 'no' : '') : ''; return `<button type="button" data-rq-a="${i}" class="${cls}" ${z.closed || mine !== null ? 'disabled' : ''}>${esc(o)}</button>`; }).join('');
    const res = z.closed ? (z.winner ? `🏆 الفايز: ${esc(z.winner)}${z.prize ? ` (+${nf(z.prize)} 🪙)` : ''}` : '⏱️ خلص الوقت وما أحد جاوب صح') : mine !== null ? (mine === z.correct ? '✅ جوابك صح!' : '❌ جوابك غلط، انتظر النتيجة') : '';
    host.innerHTML = `<div class="rq68-card" role="dialog" aria-label="مسابقة مباشرة"><div class="rq68-h"><span>🧠 مسابقة من <b>${esc(z.byName)}</b>${z.prize ? ` · الجائزة <b>🪙 ${nf(z.prize)}</b>` : ''}</span>${z.closed ? '<button class="rq68-x" type="button" data-rq="dismiss" aria-label="إغلاق">✕</button>' : `<span>⏳ ${sec} ث</span>`}</div>
      <div class="rq68-q">${esc(z.q)}</div><div class="rq68-ops">${ops}</div>${res ? `<div class="rq68-res" role="status">${res}</div>` : ''}${S.err ? `<p class="rq68-err">${esc(S.err)}</p>` : ''}
      ${z.closed ? '' : `<div class="rq68-bar"><u style="width:${sec / 30 * 100}%"></u></div>`}${!z.closed && S.d.mod ? `<button class="rq68-x" style="font-size:12px;margin-top:6px" type="button" data-rq="cancel">إلغاء المسابقة</button>` : ''}</div>`;
  }
  async function poll() {
    const r = roomId();
    if (r !== S.room) { S.room = r; S.d = null; S.form = null; S.err = ''; }
    if (!r) { host.hidden = true; fab.hidden = true; return; }
    try { const d = await api('/api/room-quiz?room=' + encodeURIComponent(r)); if (S.room === r) S.d = d.member ? d : null; } catch { /* نجرب المرة الجاية */ }
    paint();
  }
  const run = async (fn) => { if (S.busy) return; S.busy = true; S.err = ''; try { await fn(); } catch (e) { S.err = e.message || 'تعذّر الطلب.'; } S.busy = false; await poll(); };
  fab.addEventListener('click', () => { S.form = { q: '', options: ['', '', '', ''], correct: 0, prize: 0 }; S.err = ''; paint(); });
  host.addEventListener('input', (e) => { const f = S.form; if (!f) return; const t = e.target; if (t.dataset.rqIn === 'q') f.q = t.value; if (t.dataset.rqO) f.options[Number(t.dataset.rqO)] = t.value; });
  host.addEventListener('click', (e) => {
    const t = e.target.closest('button,input[type=radio]'); if (!t) return;
    if (t.dataset.rqC) { S.form.correct = Number(t.dataset.rqC); return; }
    if (t.dataset.rqP) { S.form.prize = Number(t.dataset.rqP); paint(); return; }
    if (t.dataset.rqA) { const z = S.d?.quiz; if (z) run(async () => { await api('/api/room-quiz/answer', 'POST', { room: S.room, id: z.id, pick: Number(t.dataset.rqA) }); }); return; }
    const a = t.dataset.rq;
    if (a === 'close') { S.form = null; S.err = ''; paint(); }
    if (a === 'dismiss') { S.dismissed = S.d?.quiz?.id || ''; paint(); }
    if (a === 'cancel') run(() => api('/api/room-quiz/cancel', 'POST', { room: S.room }));
    if (a === 'start') { const f = S.form; const filled = f.options.map((o, i) => [o.trim(), i]).filter(([o]) => o); const correct = filled.findIndex(([, i]) => i === f.correct);
      if (correct < 0) { S.err = 'الخيار المختار كجواب صح فاضي.'; paint(); return; }
      run(async () => { await api('/api/room-quiz/start', 'POST', { room: S.room, q: f.q, options: filled.map(([o]) => o), correct, prize: f.prize }); S.form = null; }); }
  });
  setInterval(() => { if (S.d?.quiz && !S.d.quiz.closed && !S.form) paint(); }, 1000);
  setInterval(() => { if (!document.hidden) poll(); }, 2500);
  addEventListener('hashchange', poll); poll();
}
