/* R73: تواصل وتعارف أقوى — صفحات: القروبات، أبي شريك، مجالس الاهتمامات، سوالف عشوائية
 * + إضافات على الصفحات الموجودة: رسائل صوتية بالخاص، نبذة صوتية بالملف، اقتراحات أصدقاء ومستويات الصداقة بصفحة الأصدقاء. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const go = (h) => (globalThis.__LA3BAK_NAV__ || location).hash = h;
const curHash = () => (globalThis.__LA3BAK_NAV__?.hash ?? location.hash) || '';
async function api(path, method = 'GET', body) {
  const r = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch { /* */ }
  if (!r.ok || j.ok === false && j.error) throw new Error(j.error || 'صار خطأ، جرّب مرة ثانية.');
  return j;
}
let toast = (m) => console.log(m);
const GAMES = [['baloot', '♠️ بلوت'], ['jackaro', '🃏 جاكارو'], ['ludo', '🎲 لودو'], ['uno', '🟥 أونو'], ['domino', '🁫 دومينو'], ['carrom', '🎯 كيرم']];
const ago = (t) => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? 'الحين' : s < 3600 ? `قبل ${Math.floor(s / 60)} د` : s < 86400 ? `قبل ${Math.floor(s / 3600)} س` : `قبل ${Math.floor(s / 86400)} يوم`; };

/* ---------- تسجيل الصوت ---------- */
const REC = { mr: null, chunks: [], t0: 0, timer: 0, stt: null, text: '', max: 60, onTick: null, done: null };
export const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && globalThis.MediaRecorder);
async function recStart(max, onTick) {
  if (!canRecord()) throw new Error('جهازك ما يدعم تسجيل الصوت هني.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
  const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
  Object.assign(REC, { mr, chunks: [], t0: Date.now(), max, onTick, text: '' });
  mr.ondataavailable = (e) => { if (e.data?.size) REC.chunks.push(e.data); };
  mr.start(250);
  /* نص الكلام (لو الجهاز يدعم) عشان المشرف يفحص الرسالة */
  try { const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition; if (SR) { const sr = new SR(); sr.lang = 'ar-SA'; sr.continuous = true; sr.interimResults = false; sr.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) REC.text += ' ' + e.results[i][0].transcript; }; sr.onerror = () => {}; sr.start(); REC.stt = sr; } } catch { REC.stt = null; }
  REC.timer = setInterval(() => { const s = (Date.now() - REC.t0) / 1000; REC.onTick?.(s); if (s >= REC.max) void recStop(); }, 200);
}
function recStop() {
  return new Promise((resolve) => {
    const mr = REC.mr; if (!mr) return resolve(null);
    clearInterval(REC.timer); try { REC.stt?.stop(); } catch { /* */ }
    mr.onstop = () => { mr.stream.getTracks().forEach((t) => t.stop()); const blob = new Blob(REC.chunks, { type: (mr.mimeType || 'audio/webm').split(';')[0] }); const dur = Math.min(REC.max, (Date.now() - REC.t0) / 1000); REC.mr = null; setTimeout(() => resolve({ blob, dur, text: REC.text.trim() }), 250); };
    try { mr.stop(); } catch { resolve(null); }
  });
}
function recCancel() { const mr = REC.mr; if (!mr) return; clearInterval(REC.timer); try { REC.stt?.stop(); } catch { /* */ } mr.onstop = () => mr.stream.getTracks().forEach((t) => t.stop()); try { mr.stop(); } catch { /* */ } REC.mr = null; }
async function upload(rec, q) {
  const r = await fetch('/api/vn?' + new URLSearchParams(q), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': rec.blob.type || 'audio/webm', 'x-dur': String(rec.dur.toFixed(1)), 'x-transcript': encodeURIComponent(rec.text.slice(0, 600)) }, body: rec.blob });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'ما انرسل الصوت.'); return j;
}
/* R73b: مشغّل صوت بتصميم الموقع (بدل مشغّل المتصفح الأسود): زر ذهبي + موجات + الوقت */
const fmtT = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const bars = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return Array.from({ length: 28 }, (_, i) => { h = (h * 1103515245 + 12345) >>> 0; const v = 0.28 + ((h >>> 8) % 1000) / 1000 * 0.72; return `<i style="height:${Math.round(v * 100)}%"></i>`; }).join(''); };
const player = (id, dur) => `<span class="sp73-vn" data-vn="${esc(id)}" data-dur="${Number(dur) || 0}"><button type="button" class="sp73-play" data-sp73="vn-play" aria-label="شغّل الرسالة الصوتية"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="pl" d="M8 5.5v13l10.5-6.5z"/><path class="pa" d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg></button><span class="sp73-wave" data-sp73="vn-seek">${bars(id)}</span><small class="sp73-tm">${dur ? fmtT(dur) : '🎤'}</small><audio preload="none" src="/api/vn/${esc(id)}"></audio></span>`;
let VN_CUR = null;
function vnToggle(box) {
  const a = box.querySelector('audio'); if (!a) return;
  if (VN_CUR && VN_CUR !== a) { VN_CUR.pause(); }
  if (!a.dataset.wired) {
    a.dataset.wired = '1';
    const tm = box.querySelector('.sp73-tm'), wave = box.querySelector('.sp73-wave'), total = () => (Number.isFinite(a.duration) && a.duration > 0 ? a.duration : Number(box.dataset.dur) || 0);
    const bs = [...wave.children]; const paint = (p) => { const n = Math.round(p * bs.length); bs.forEach((b, i) => b.classList.toggle('d', i < n)); };
    a.addEventListener('timeupdate', () => { paint(total() ? Math.min(1, a.currentTime / total()) : 0); tm.textContent = fmtT(a.currentTime); });
    a.addEventListener('play', () => box.classList.add('on')); a.addEventListener('pause', () => box.classList.remove('on'));
    a.addEventListener('ended', () => { box.classList.remove('on'); paint(0); tm.textContent = fmtT(total()); });
    a.addEventListener('error', () => { box.classList.remove('on'); tm.textContent = 'ما اشتغل'; });
  }
  if (a.paused) { VN_CUR = a; void a.play().catch(() => {}); } else a.pause();
}
function vnSeek(box, ev) {
  const a = box.querySelector('audio'), wave = box.querySelector('.sp73-wave'); if (!a || !wave) return;
  const r = wave.getBoundingClientRect(); const rtl = getComputedStyle(wave).direction === 'rtl';
  const f = Math.min(1, Math.max(0, rtl ? (r.right - ev.clientX) / r.width : (ev.clientX - r.left) / r.width));
  const go = () => { const d = Number.isFinite(a.duration) ? a.duration : Number(box.dataset.dur) || 0; if (d) a.currentTime = f * d; };
  if (a.readyState < 1) { a.addEventListener('loadedmetadata', go, { once: true }); vnToggle(box); } else go();
}
/** زر تسجيل: يرجع HTML، والتحكم بالنقر عبر data-sp73="rec" */
const recBtn = (label = '🎤') => `<button type="button" class="sp73-mic" data-sp73="rec" aria-label="سجّل رسالة صوتية">${label}</button>`;
async function recordFlow(btn, max, send) {
  if (REC.mr) { btn.classList.remove('on'); btn.textContent = '…'; const r = await recStop(); btn.textContent = btn.dataset.label || '🎤'; if (!r || r.dur < 0.6) return toast('التسجيل قصير، اضغط وتكلم.'); try { await send(r); } catch (e) { toast(e.message); } return; }
  try { btn.dataset.label = btn.textContent; await recStart(max, (s) => { btn.textContent = `⏹ ${Math.floor(s)}ث`; }); btn.classList.add('on'); }
  catch (e) { toast(e.name === 'NotAllowedError' ? 'اسمح للموقع يستخدم المايك من إعدادات المتصفح.' : e.message || 'ما قدرنا نشغّل المايك.'); }
}

/* ---------- الصفحات ---------- */
const S = { groups: null, group: null, gid: '', addOpen: false, membersOpen: false, lfg: null, lfgForm: { gameId: 'baloot', need: 1, note: 'جاهز الحين' }, maj: null, majI: '', vibe: null, vibeI: 'chill', vibePoll: 0, friends: null };
const shell = (title, sub, body, back = '#/friends') => `<div class="sp73"><header class="sp73-h"><a class="sp73-back" href="${back}" aria-label="رجوع">‹</a><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div></header>${body}</div>`;
export const ROUTES = new Set(['groups', 'group', 'lfg', 'majalis', 'vibe']);

export function render(view, r, ctx = {}) {
  toast = ctx.toast || toast;
  if (!ctx.user) { view.innerHTML = shell('سجّل دخولك', '', '<p class="sp73-empty">سجّل دخولك عشان تستخدم هالميزة.</p><a class="btn block" href="#/profile">دخول</a>', '#/'); return; }
  if (ctx.restricted) { view.innerHTML = shell('مقفل', '', '<p class="sp73-empty">التواصل الاجتماعي مقفل من إعدادات ولي الأمر.</p>', '#/'); return; }
  if (r.name === 'groups') return groupsPage(view);
  if (r.name === 'group') return groupPage(view, r.a);
  if (r.name === 'lfg') return lfgPage(view);
  if (r.name === 'majalis') return majPage(view);
  if (r.name === 'vibe') return vibePage(view);
}
let RENDER = () => {};
const rerender = () => RENDER();

/* 1) القروبات */
async function groupsPage(view) {
  const paint = () => {
    const list = S.groups?.list;
    const friends = S.friends || [];
    view.innerHTML = shell('👥 قروباتي', 'قروب لربعك أو عائلتك لين 50 شخص — شات، رسائل صوتية، وزر «يلا نلعب»', `
      <button class="btn block" type="button" data-sp73="gnew-open">➕ قروب جديد</button>
      ${S.addOpen ? `<form class="sp73-card sp73-gnew" data-sp73f="gnew"><label>اسم القروب<input name="name" maxlength="30" required placeholder="مثلاً: ربع الديوانية"></label>
        <p class="sp73-l">اختر أصدقاءك:</p><div class="sp73-pick">${friends.length ? friends.map((f) => `<label><input type="checkbox" name="m" value="${esc(f.pub)}"> ${esc(f.name)}</label>`).join('') : '<small>ما عندك أصدقاء للحين — تقدر تضيفهم بعدين.</small>'}</div>
        <button class="btn block" type="submit">أنشئ القروب</button></form>` : ''}
      <div class="sp73-list">${!list ? '<p class="sp73-empty">جاري التحميل…</p>' : list.length ? list.map((g) => `<a class="sp73-row" href="#/group/${esc(g.id)}"><span class="sp73-av">👥</span><span class="sp73-mid"><b>${esc(g.name)}</b><small>${g.last ? `${esc(g.last.from)}: ${esc(g.last.text)}` : `${g.count} أعضاء`}</small></span>${g.unread ? `<span class="sp73-badge">${g.unread}</span>` : `<small class="sp73-t">${g.last ? ago(g.last.at) : ''}</small>`}</a>`).join('') : '<p class="sp73-empty">ما عندك قروبات للحين. سوّ واحد لربعك! 👆</p>'}</div>`);
  };
  paint();
  try { S.groups = await api('/api/groups'); } catch (e) { S.groups = { list: [] }; toast(e.message); }
  if (curHash().startsWith('#/groups')) paint();
}
async function loadFriends() { if (S.friends) return S.friends; try { const j = await api('/api/social-private/friends?limit=100'); S.friends = (j.list || []).map((x) => ({ pub: x.user?.pub, name: x.user?.name })).filter((x) => x.pub); } catch { S.friends = []; } return S.friends; }

async function groupPage(view, id) {
  S.gid = id;
  const paint = () => {
    const g = S.group && S.group.id === id ? S.group : null;
    if (!g) { view.innerHTML = shell('القروب', '', '<p class="sp73-empty">جاري التحميل…</p>', '#/groups'); return; }
    const msgs = g.msgs.map((m) => {
      if (m.hidden) return `<div class="sp73-msg sys"><small>🚫 رسالة محذوفة من المشرف</small></div>`;
      if (m.game) return `<div class="sp73-msg game${m.mine ? ' mine' : ''}"><b>${esc(m.mine ? 'أنت' : m.from.name)}</b><p>🎮 فتح طاولة ${esc(m.game.name)}</p><a class="btn sm" href="#/join/${esc(m.game.code)}">ادخل معهم</a></div>`;
      return `<div class="sp73-msg${m.mine ? ' mine' : ''}"><b>${esc(m.mine ? 'أنت' : m.from.name)}</b>${m.vn ? player(m.vn.id, m.vn.dur) : `<p>${esc(m.text)}</p>`}<small>${ago(m.at)}</small></div>`;
    }).join('');
    const friends = (S.friends || []).filter((f) => !g.members.some((m) => m.pub === f.pub));
    view.innerHTML = shell(`👥 ${esc(g.name)}`, `${g.count} أعضاء`, `
      <div class="sp73-tools"><button type="button" class="btn sm ghost" data-sp73="gmembers">👤 الأعضاء</button>${GAMES.slice(0, 4).map(([k, n]) => `<button type="button" class="btn sm" data-sp73="gplay" data-g="${k}">${n}</button>`).join('')}</div>
      ${S.membersOpen ? `<div class="sp73-card"><div class="sp73-mem">${g.members.map((m) => `<span>${m.owner ? '👑 ' : ''}${esc(m.me ? 'أنت' : m.name)}${g.owner && !m.me ? ` <button type="button" class="sp73-x" data-sp73="gkick" data-p="${esc(m.pub)}" aria-label="طلّعه">✕</button>` : ''}</span>`).join('')}</div>
        ${friends.length ? `<form class="sp73-add" data-sp73f="gadd"><select name="p">${friends.map((f) => `<option value="${esc(f.pub)}">${esc(f.name)}</option>`).join('')}</select><button class="btn sm" type="submit">➕ أضف</button></form>` : ''}
        <button type="button" class="btn sm ghost danger" data-sp73="gleave">اطلع من القروب</button></div>` : ''}
      <div class="sp73-chat" id="sp73Chat">${msgs || '<p class="sp73-empty">ابدأ السوالف 👋</p>'}</div>
      <form class="sp73-compose" data-sp73f="gmsg">${recBtn()}<input name="text" maxlength="500" autocomplete="off" placeholder="اكتب رسالة…"><button class="btn" type="submit">إرسال</button></form>`, '#/groups');
    const c = view.querySelector('#sp73Chat'); if (c) c.scrollTop = c.scrollHeight;
  };
  if (!S.group || S.group.id !== id) S.group = null;
  paint(); void loadFriends();
  try { S.group = await api('/api/groups/' + encodeURIComponent(id)); } catch (e) { toast(e.message); go('#/groups'); return; }
  if (curHash() === '#/group/' + id) paint();
}
const reloadGroup = async () => { try { S.group = await api('/api/groups/' + encodeURIComponent(S.gid)); } catch { /* */ } if (curHash() === '#/group/' + S.gid) rerender(); };

/* 5) أبي شريك */
async function lfgPage(view) {
  const f = S.lfgForm; const notes = S.lfg?.notes || ['جاهز الحين', 'أبي شريك محترف', 'لعب خفيف وسوالف', 'ناقصنا واحد بس', 'مبتدئ وأبي أتعلم'];
  const paint = () => {
    const list = S.lfg?.list;
    view.innerHTML = shell('🙋 أبي شريك', 'انشر بطاقة وتنفتح لك طاولة — اللي يضغط «أنا» يدخل معك على طول', `
      <div class="sp73-card"><p class="sp73-l">اللعبة</p><div class="sp73-chips">${GAMES.map(([k, n]) => `<button type="button" class="${f.gameId === k ? 'on' : ''}" data-sp73="lfg-g" data-v="${k}">${n}</button>`).join('')}</div>
        <p class="sp73-l">كم واحد ناقصك؟</p><div class="sp73-chips">${[1, 2, 3].map((n) => `<button type="button" class="${f.need === n ? 'on' : ''}" data-sp73="lfg-n" data-v="${n}">${n}</button>`).join('')}</div>
        <p class="sp73-l">وش تبي؟</p><div class="sp73-chips">${notes.map((n) => `<button type="button" class="${f.note === n ? 'on' : ''}" data-sp73="lfg-t" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <button class="btn block" type="button" data-sp73="lfg-post">📣 انشر وافتح طاولتي</button></div>
      <h2 class="sp73-sec">بطاقات الحين</h2>
      <div class="sp73-list">${!list ? '<p class="sp73-empty">جاري التحميل…</p>' : list.length ? list.map((c) => `<div class="sp73-row"><span class="sp73-av">${esc((GAMES.find(([k]) => k === c.gameId) || ['', '🎮'])[1].split(' ')[0])}</span><span class="sp73-mid"><b>${esc(c.name)}${c.friend ? ' <small class="sp73-f">صديقك</small>' : ''}</b><small>${esc(c.game)} · ${esc(c.note)} · ناقصه ${c.need}</small></span>${c.mine ? '<button type="button" class="btn sm ghost" data-sp73="lfg-cancel">إلغاء</button>' : `<button type="button" class="btn sm" data-sp73="lfg-join" data-v="${esc(c.id)}">🙋 أنا</button>`}</div>`).join('') : '<p class="sp73-empty">ما فيه بطاقات الحين — كن أول واحد 👆</p>'}</div>`);
  };
  paint();
  try { S.lfg = await api('/api/lfg'); } catch (e) { toast(e.message); S.lfg = { list: [] }; }
  if (curHash() === '#/lfg') paint();
}

/* 6) مجالس الاهتمامات */
async function majPage(view) {
  const paint = () => {
    const m = S.maj; if (!m) { view.innerHTML = shell('🎙️ مجالس الاهتمامات', '', '<p class="sp73-empty">جاري التحميل…</p>'); return; }
    const I = m.interests;
    view.innerHTML = shell('🎙️ مجالس الاهتمامات', 'مجالس صوتية حسب اللي تحبه — اختر اهتمامك', `
      <div class="sp73-chips sp73-int"><button type="button" class="${!S.majI ? 'on' : ''}" data-sp73="maj-i" data-v="">🔥 الكل</button>${I.map((i) => `<button type="button" class="${S.majI === i.id ? 'on' : ''}" data-sp73="maj-i" data-v="${i.id}">${i.icon} ${esc(i.name)}</button>`).join('')}</div>
      ${S.majI && m.mine !== S.majI ? `<button class="btn sm ghost" type="button" data-sp73="maj-me" data-v="${S.majI}">⭐ خلّه اهتمامي</button>` : ''}
      <div class="sp73-list">${m.live.length ? m.live.map((r) => { const i = I.find((x) => x.id === r.interest); return `<a class="sp73-row" href="#/social-room/${esc(encodeURIComponent(r.id))}"><span class="sp73-av">${i ? i.icon : '🎙️'}</span><span class="sp73-mid"><b>${esc(r.name)}</b><small>${i ? esc(i.name) + ' · ' : ''}${r.members ?? 0} داخلين الحين</small></span><span class="sp73-live">● مباشر</span></a>`; }).join('') : `<p class="sp73-empty">ما فيه مجالس ${S.majI ? 'بهالاهتمام ' : ''}شغالة الحين.</p>`}</div>
      ${m.owned.length ? `<h2 class="sp73-sec">مجالسك</h2><div class="sp73-card">${m.owned.map((r) => `<div class="sp73-own"><b>${esc(r.name)}</b><select data-sp73="maj-room" data-r="${esc(r.id)}"><option value="">بدون اهتمام</option>${I.map((i) => `<option value="${i.id}"${r.interest === i.id ? ' selected' : ''}>${i.icon} ${esc(i.name)}</option>`).join('')}</select></div>`).join('')}<small>حدد اهتمام مجلسك عشان يلقونه الناس اللي يحبون نفس الشي.</small></div>` : ''}`);
  };
  paint();
  try { S.maj = await api('/api/majalis' + (S.majI ? '?i=' + S.majI : '')); if (!S.majI && S.maj.mine && !S.majInit) { S.majInit = true; } } catch (e) { toast(e.message); }
  if (curHash() === '#/majalis') paint();
}

/* 8) سوالف عشوائية */
async function vibePage(view) {
  const I = S.maj?.interests || [{ id: 'chill', name: 'سوالف', icon: '☕' }, { id: 'games', name: 'قيمز', icon: '🎮' }, { id: 'football', name: 'كورة', icon: '⚽' }, { id: 'cars', name: 'سيارات', icon: '🏎️' }, { id: 'tech', name: 'تقنية', icon: '💻' }, { id: 'poetry', name: 'شعر', icon: '📜' }];
  const v = S.vibe;
  view.innerHTML = shell('☕ سوالف عشوائية', 'مجلس صوتي صغير (2–4) مع ناس بنفس اهتمامك — للكبار 18+ والمشرف الذكي يراقب', `
    ${v?.waiting ? `<div class="sp73-card sp73-wait"><div class="sp73-pulse">☕</div><b>ندوّر لك على ناس…</b><small>${v.count || 1} ينتظرون بنفس الاهتمام</small><button class="btn ghost block" type="button" data-sp73="vibe-stop">إلغاء</button></div>` : `
    <div class="sp73-card"><p class="sp73-l">اهتمامك اليوم</p><div class="sp73-chips">${I.map((i) => `<button type="button" class="${S.vibeI === i.id ? 'on' : ''}" data-sp73="vibe-i" data-v="${i.id}">${i.icon} ${esc(i.name)}</button>`).join('')}</div>
      <button class="btn block" type="button" data-sp73="vibe-go">🎲 دخلني مع ناس</button>
      <ul class="sp73-rules"><li>احترم الكل — أي إساءة تنكتم وتنبلغ.</li><li>لا تشارك رقمك أو حساباتك.</li><li>لو ارتحت لأحد أضفه من ملفه.</li></ul></div>`}`);
}
function vibePollStart() {
  clearInterval(S.vibePoll);
  S.vibePoll = setInterval(async () => {
    if (!S.vibe?.waiting) return clearInterval(S.vibePoll);
    try { const st = await api('/api/vibe'); if (st.matched) { S.vibe = null; clearInterval(S.vibePoll); toast('لقينا لك ناس! ☕'); go('#/room/' + st.code); } else { S.vibe.count = st.waiting; if (curHash() === '#/vibe') rerender(); } } catch { /* */ }
  }, 2500);
}

/* ---------- الأحداث ---------- */
document.addEventListener('click', async (e) => {
  const b = e.target.closest?.('[data-sp73]'); if (!b) return;
  const k = b.dataset.sp73;
  try {
    if (k === 'vn-play') { vnToggle(b.closest('.sp73-vn')); return; }
    if (k === 'vn-seek') { vnSeek(b.closest('.sp73-vn'), e); return; }
    if (k === 'gnew-open') { S.addOpen = !S.addOpen; await loadFriends(); rerender(); }
    else if (k === 'gmembers') { S.membersOpen = !S.membersOpen; rerender(); }
    else if (k === 'gplay') { b.disabled = true; const r = await api(`/api/groups/${encodeURIComponent(S.gid)}/play`, 'POST', { gameId: b.dataset.g }); go('#/room/' + r.code); }
    else if (k === 'gkick') { if (!confirm('تطلّعه من القروب؟')) return; S.group = await api(`/api/groups/${encodeURIComponent(S.gid)}/kick`, 'POST', { pub: b.dataset.p }); rerender(); }
    else if (k === 'gleave') { if (!confirm('تطلع من القروب؟')) return; await api(`/api/groups/${encodeURIComponent(S.gid)}/leave`, 'POST', {}); S.groups = null; go('#/groups'); }
    else if (k === 'rec') {
      const form = b.closest('[data-sp73f="gmsg"]');
      if (form) await recordFlow(b, 60, async (rec) => { const v = await upload(rec, { kind: 'group', g: S.gid }); await api(`/api/groups/${encodeURIComponent(S.gid)}/msg`, 'POST', { vn: v.id }); await reloadGroup(); });
      else if (b.closest('.chat-compose')) await recordFlow(b, 60, async (rec) => { const peer = dmPeer(); if (!peer) throw new Error('افتح محادثة أول.'); const v = await upload(rec, { kind: 'dm', to: peer }); const f = b.closest('form'); const ta = f.querySelector('textarea[name=text]'); ta.value = `🎤 رسالة صوتية [vn:${v.id}]`; ta.dispatchEvent(new Event('input', { bubbles: true })); f.requestSubmit(); });
      else if (b.dataset.bio) await recordFlow(b, 20, async (rec) => { await upload(rec, { kind: 'bio' }); toast('✅ انحفظت نبذتك الصوتية'); BIO.cache.delete('me'); decorate(true); });
    }
    else if (k === 'bio-del') { await api('/api/voice-bio', 'DELETE'); BIO.cache.delete('me'); toast('انحذفت النبذة'); decorate(true); }
    else if (k === 'lfg-g') { S.lfgForm.gameId = b.dataset.v; rerender(); }
    else if (k === 'lfg-n') { S.lfgForm.need = Number(b.dataset.v); rerender(); }
    else if (k === 'lfg-t') { S.lfgForm.note = b.dataset.v; rerender(); }
    else if (k === 'lfg-post') { b.disabled = true; const r = await api('/api/lfg', 'POST', S.lfgForm); toast('📣 انتشرت بطاقتك — ننتظر اللي يدخل'); go('#/room/' + r.code); }
    else if (k === 'lfg-join') { b.disabled = true; const r = await api(`/api/lfg/${encodeURIComponent(b.dataset.v)}/join`, 'POST', {}); go('#/room/' + r.code); }
    else if (k === 'lfg-cancel') { await api('/api/lfg', 'DELETE'); S.lfg = null; rerender(); }
    else if (k === 'maj-i') { S.majI = b.dataset.v; S.maj = null; rerender(); }
    else if (k === 'maj-me') { await api('/api/majalis/me', 'POST', { interest: b.dataset.v }); toast('⭐ انحفظ اهتمامك'); S.maj = null; rerender(); }
    else if (k === 'vibe-i') { S.vibeI = b.dataset.v; rerender(); }
    else if (k === 'vibe-go') { b.disabled = true; const r = await api('/api/vibe', 'POST', { interest: S.vibeI }); S.vibe = { waiting: true, count: r.waiting }; rerender(); vibePollStart(); }
    else if (k === 'vibe-stop') { await api('/api/vibe', 'DELETE'); S.vibe = null; clearInterval(S.vibePoll); rerender(); }
    else if (k === 'sug-add') { b.disabled = true; await api('/api/social-private/friend-requests', 'POST', { to: b.dataset.p, key: 'sug-' + crypto.randomUUID() }); b.textContent = '✓ انرسل'; }
    else if (k === 'our-table') { b.disabled = true; const r = await api('/api/friend-table', 'POST', { pub: b.dataset.p, gameId: 'baloot' }); go('#/room/' + r.code); }
  } catch (err) { toast(err.message || 'صار خطأ.'); b.disabled = false; }
});
document.addEventListener('submit', async (e) => {
  const f = e.target.closest?.('[data-sp73f]'); if (!f) return; e.preventDefault();
  const k = f.dataset.sp73f; const btn = f.querySelector('[type=submit]'); if (btn) btn.disabled = true;
  try {
    if (k === 'gnew') { const g = await api('/api/groups', 'POST', { name: f.name.value, members: [...f.querySelectorAll('input[name=m]:checked')].map((x) => x.value) }); S.addOpen = false; S.groups = null; go('#/group/' + g.id); }
    else if (k === 'gmsg') { const t = f.text.value.trim(); if (!t) return; await api(`/api/groups/${encodeURIComponent(S.gid)}/msg`, 'POST', { text: t }); f.text.value = ''; await reloadGroup(); }
    else if (k === 'gadd') { S.group = await api(`/api/groups/${encodeURIComponent(S.gid)}/add`, 'POST', { pub: f.p.value }); rerender(); }
  } catch (err) { toast(err.message || 'صار خطأ.'); } finally { if (btn) btn.disabled = false; }
}, true);
document.addEventListener('change', async (e) => {
  const s = e.target.closest?.('[data-sp73="maj-room"]'); if (!s) return;
  try { await api('/api/majalis/room', 'POST', { roomId: s.dataset.r, interest: s.value || null }); toast('✅ انحفظ اهتمام المجلس'); } catch (err) { toast(err.message); }
});

/** أحداث من السيرفر */
export function onEvent(m) {
  if (m.t === 'group:msg') { if (curHash() === '#/group/' + m.g) void reloadGroup(); else { toast(`💬 رسالة جديدة في «${m.name}»`); S.groups = null; } return true; }
  if (m.t === 'group:update') { S.groups = null; if (curHash() === '#/group/' + m.g) go('#/groups'); return true; }
  if (m.t === 'friend:level') { toast(`${m.icon} صرتوا «${m.level}» أنت و${m.name}!${m.perk ? ' · ' + m.perk : ''}`); return true; }
  if (m.t === 'friend:table') { toast(`🎲 ${m.name || m.from} فتح لكم طاولة ${m.game || ''} — ادخل من «#/join/${m.code}»`); setTimeout(() => { if (confirm(`${m.from} يبيك بطاولة ${m.game || ''} — تدخل؟`)) go('#/join/' + m.code); }, 300); return true; }
  if (m.t === 'lfg:new') { toast(`🙋 ${m.from} يدوّر شريك ${m.game} — «${m.note}» · افتح «أبي شريك»`); if (curHash() === '#/lfg') { S.lfg = null; rerender(); } return true; }
  if (m.t === 'lfg:joined') { toast(`🙋 ${m.name} دخل طاولتك!`); return true; }
  if (m.t === 'vibe:match') { if (S.vibe) { S.vibe = null; clearInterval(S.vibePoll); toast('لقينا لك ناس! ☕'); go('#/room/' + m.code); } return true; }
  return false;
}

/* ---------- إضافات على الصفحات الموجودة ---------- */
const BIO = { cache: new Map() };
const dmPeer = () => { const a = document.querySelector('#view .lb-message-profile'); const h = a?.getAttribute('href') || ''; const m = /#\/u\/([^/?#]+)/.exec(h); return m ? decodeURIComponent(m[1]) : null; };
const LV = { data: null, at: 0 };
let decoT = 0;
function decorate(force = false) {
  const h = curHash(); const view = document.getElementById('view'); if (!view) return;
  /* الرسائل الخاصة: زر المايك + تشغيل الرسائل الصوتية */
  if (h.startsWith('#/messages')) {
    const f = view.querySelector('form.chat-compose'); if (f && !f.querySelector('.sp73-mic') && canRecord()) { const ta = f.querySelector('textarea'); if (ta && !ta.disabled) f.insertAdjacentHTML('afterbegin', recBtn()); }
    /* معاينة آخر رسالة بالقائمة: نخفي رمز الملف */
    const tw = document.createTreeWalker(view, NodeFilter.SHOW_TEXT); const fix = []; for (let t = tw.nextNode(); t; t = tw.nextNode()) if (t.textContent.includes('[vn:') && !t.parentElement?.closest('.chat-bubble')) fix.push(t);
    for (const t of fix) t.textContent = t.textContent.replace(/\s*\[vn:[A-Za-z0-9_-]{8,40}\]/g, '');
    for (const p of view.querySelectorAll('.chat-bubble p')) { const m = /^🎤 رسالة صوتية \[vn:([A-Za-z0-9_-]{8,40})\]$/.exec(p.textContent.trim()); if (m && !p.dataset.sp73) { p.dataset.sp73 = '1'; p.innerHTML = player(m[1]); } }
  }
  /* صفحة الأصدقاء: روابط الميزات + الاقتراحات + مستوى الصداقة */
  if (h.startsWith('#/friends')) {
    const anchor = view.querySelector('main.lb-content > section.hero, .lb-content .hero') ;
    if (anchor && !view.querySelector('.sp73-hub')) anchor.insertAdjacentHTML('afterend', `<nav class="sp73-hub" aria-label="تواصل"><a href="#/groups">👥<b>قروباتي</b></a><a href="#/lfg">🙋<b>أبي شريك</b></a><a href="#/majalis">🎙️<b>مجالس الاهتمامات</b></a><a href="#/vibe">☕<b>سوالف عشوائية</b></a></nav><section class="sp73-sug" hidden></section>`);
    const sug = view.querySelector('.sp73-sug'); if (sug && !sug.dataset.loaded) { sug.dataset.loaded = '1'; api('/api/friend-suggestions').then((j) => { if (!j.list?.length) return; sug.hidden = false; sug.innerHTML = `<h2 class="sp73-sec">✨ ناس يمكن تعرفهم</h2><div class="sp73-sugs">${j.list.map((u) => `<div class="sp73-sc"><a href="#/u/${esc(encodeURIComponent(u.pub))}"><span class="sp73-av">${u.online ? '🟢' : '👤'}</span><b>${esc(u.name)}</b></a><small>${esc(u.why.join(' · '))}</small><button type="button" class="btn sm" data-sp73="sug-add" data-p="${esc(u.pub)}">➕ إضافة</button></div>`).join('')}</div>`; }).catch(() => {}); }
    const paintLv = () => { for (const a of view.querySelectorAll('a.lb-friends-name')) { if (a.dataset.sp73) continue; const m = /#\/u\/([^/?#]+)/.exec(a.getAttribute('href') || ''); const pub = m && decodeURIComponent(m[1]); const l = pub && LV.data?.levels?.[pub]; if (!l) continue; a.dataset.sp73 = '1'; a.insertAdjacentHTML('afterend', `<span class="sp73-lv" title="${l.next ? `باقي ${l.next.need} نقطة على «${esc(l.next.name)}»` : 'أعلى مستوى'}">${l.icon} ${esc(l.level)}</span>${l.score >= 40 ? `<button type="button" class="btn sm sp73-ours" data-sp73="our-table" data-p="${esc(pub)}">🎲 طاولتنا</button>` : ''}`); } };
    if (!LV.data || Date.now() - LV.at > 60_000) { LV.at = Date.now(); api('/api/friend-levels').then((j) => { LV.data = j; paintLv(); }).catch(() => {}); } else paintLv();
  }
  /* الملف الشخصي: نبذة صوتية */
  const um = /^#\/u\/([^/?#]+)/.exec(h); const own = /^#\/(profile|account)(\/|$)/.test(h) || h === '#/profile';
  if (um || own) {
    const key = um ? decodeURIComponent(um[1]) : 'me';
    const spot = view.querySelector(own ? '.pf68-stats, .pf68-hero' : '.cm-rel, main.lb-content .stack > section.card'); if (!spot) return;
    let box = view.querySelector('.sp73-bio');
    if (box && box.dataset.k === key && !force) return;
    if (!box) { spot.insertAdjacentHTML('afterend', '<section class="sp73-bio"></section>'); box = view.querySelector('.sp73-bio'); }
    box.dataset.k = key;
    const show = (bio) => { box.innerHTML = bio ? `<span>🎙️ ${own ? 'نبذتك الصوتية' : 'اسمع صوته'}</span>${player(bio.id, bio.dur)}${own ? `<button type="button" class="sp73-x" data-sp73="bio-del" aria-label="احذف النبذة">✕</button>` : ''}` : own && canRecord() ? `<span>🎙️ سجّل نبذة صوتية (20 ثانية) يسمعها اللي يفتح ملفك</span><button type="button" class="btn sm" data-sp73="rec" data-bio="1">🎤 سجّل</button>` : ''; box.hidden = !box.innerHTML; };
    if (BIO.cache.has(key) && !force) show(BIO.cache.get(key));
    else api('/api/voice-bio?u=' + encodeURIComponent(key)).then((j) => { BIO.cache.set(key, j.bio); if (BIO.cache.size > 200) BIO.cache.clear(); show(j.bio); }).catch(() => { box.hidden = true; });
  }
}
export function start(opts = {}) {
  toast = opts.toast || toast; if (opts.render) RENDER = opts.render;
  const view = document.getElementById('view'); if (!view) return;
  new MutationObserver(() => { clearTimeout(decoT); decoT = setTimeout(() => decorate(), 120); }).observe(view, { childList: true, subtree: true });
  decorate();
}
