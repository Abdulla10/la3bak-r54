// R127: الرسائل الصوتية — تسجيل (لين 60 ثانية) وتشغيل بموجة وسرعة ×1 ×1.5 ×2. نفس الكود للخاص ودردشة الغرف.
const TOKEN = /^\[vn:([a-f0-9]{24}):(\d{1,2})\]$/;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const CSS = `.vn127{display:inline-flex;align-items:center;gap:8px;width:240px;max-width:100%;box-sizing:border-box;padding:6px 10px 6px 6px;border-radius:22px;background:rgba(255,255,255,.1);direction:ltr;vertical-align:middle}
.vn127 .p{flex:none;width:34px;height:34px;border-radius:50%;border:0;display:grid;place-items:center;background:linear-gradient(180deg,#a855f7,#6d28d9);color:#fff;cursor:pointer}.vn127 .p svg{width:16px;height:16px}
.vn127 .w{flex:1;min-width:0;overflow:hidden;display:flex;align-items:center;gap:2px;height:26px;cursor:pointer}.vn127 .w i{flex:1;min-width:2px;border-radius:2px;background:#ffffff55;transition:background .1s}.vn127 .w i.on{background:#ffd76a}
.vn127 .t{flex:none;font:700 11.5px/1 system-ui,sans-serif;color:#e9dcff;min-width:30px;text-align:center}
.vn127 .s{flex:none;border:0;border-radius:10px;padding:3px 6px;background:#ffffff1f;color:#fff;font:800 11px system-ui,sans-serif;cursor:pointer}
.vnrec127{position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);z-index:9800;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:22px;background:linear-gradient(180deg,#2a0f4a,#1a0733);border:1.5px solid #a86bff66;box-shadow:0 10px 30px #000a;color:#fff;direction:rtl;font-family:inherit}
.vnrec127 .dot{width:12px;height:12px;border-radius:50%;background:#ef4444;animation:vnrec 1s infinite}@keyframes vnrec{50%{opacity:.25}}
.vnrec127 .tm{font:900 16px system-ui,sans-serif;min-width:44px}.vnrec127 .lv{flex:1;display:flex;align-items:center;gap:2px;height:28px;overflow:hidden}.vnrec127 .lv i{width:3px;border-radius:2px;background:#c084fc}
.vnrec127 button{border:0;border-radius:50%;width:42px;height:42px;display:grid;place-items:center;font-size:18px;cursor:pointer}.vnrec127 .x{background:#ffffff1a;color:#fff}.vnrec127 .ok{background:linear-gradient(180deg,#22c55e,#15803d);color:#fff}
.vn127-mic{flex:none;width:38px;height:38px;border:0;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#a855f7,#6d28d9);color:#fff;cursor:pointer}.vn127-mic svg{width:19px;height:19px}.vn127-mic[disabled]{opacity:.45}.r127-vnp{max-width:100%;overflow:hidden}`;
function style() { if (typeof document !== 'undefined' && !document.querySelector('style[data-vn127]')) { const s = document.createElement('style'); s.dataset.vn127 = '1'; s.textContent = CSS; document.head.append(s); } }
export const MIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>', PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>';
export const isVoiceNote = (text) => TOKEN.test(String(text ?? '').trim());
/** HTML المشغّل لرمز رسالة صوتية، أو null لو مو رسالة صوتية */
export function voiceNoteHTML(text) {
  const m = TOKEN.exec(String(text ?? '').trim()); if (!m) return null; style();
  const id = m[1], sec = Math.min(60, Number(m[2]) || 1); let h = parseInt(id.slice(0, 8), 16);
  const bars = Array.from({ length: 28 }, () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return 25 + (h % 75); });
  return `<span class="vn127" data-vn127="${id}" data-sec="${sec}" dir="ltr"><button type="button" class="p" data-vn127-play aria-label="تشغيل الرسالة الصوتية">${PLAY}</button><span class="w" data-vn127-seek>${bars.map((b) => `<i style="height:${b}%"></i>`).join('')}</span><span class="t">${fmt(sec)}</span><button type="button" class="s" data-vn127-speed>1×</button></span>`;
}
/* ───── التشغيل (واحد بس بنفس الوقت) ───── */
let cur = null;
function stopCur() { if (!cur) return; cur.a.pause(); cur.el.querySelector('.p').innerHTML = PLAY; cur = null; }
function paint(el, a, sec) { const p = a.duration && isFinite(a.duration) ? a.currentTime / a.duration : a.currentTime / sec; const bars = el.querySelectorAll('.w i'); const n = Math.round(p * bars.length); bars.forEach((b, i) => b.classList.toggle('on', i < n)); el.querySelector('.t').textContent = fmt(a.paused && a.currentTime === 0 ? sec : a.currentTime); }
if (typeof document !== 'undefined') document.addEventListener('click', (e) => {
  const el = e.target.closest?.('[data-vn127]'); if (!el) return;
  e.preventDefault(); e.stopPropagation(); const sec = Number(el.dataset.sec) || 1;
  if (e.target.closest('[data-vn127-speed]')) { const b = e.target.closest('[data-vn127-speed]'); const sp = { '1×': 1.5, '1.5×': 2, '2×': 1 }[b.textContent] ?? 1; b.textContent = `${sp}×`; if (cur?.el === el) cur.a.playbackRate = sp; el.dataset.rate = String(sp); return; }
  if (cur?.el === el && !e.target.closest('[data-vn127-seek]')) { if (cur.a.paused) { cur.a.play().catch(() => {}); el.querySelector('.p').innerHTML = PAUSE; } else { cur.a.pause(); el.querySelector('.p').innerHTML = PLAY; } return; }
  if (cur?.el !== el) { stopCur(); const a = new Audio(`/api/voice-note/${el.dataset.vn127}`); a.preload = 'auto'; a.playbackRate = Number(el.dataset.rate) || 1; cur = { el, a }; a.ontimeupdate = () => paint(el, a, sec); a.onended = () => { el.querySelector('.p').innerHTML = PLAY; a.currentTime = 0; paint(el, a, sec); el.querySelectorAll('.w i').forEach((b) => b.classList.remove('on')); cur = null; }; a.onerror = () => { el.querySelector('.t').textContent = '⚠️'; cur = null; }; }
  const seek = e.target.closest('[data-vn127-seek]'); if (seek) { const r = seek.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); const go = () => { cur.a.currentTime = (isFinite(cur.a.duration) ? cur.a.duration : sec) * p; }; if (cur.a.readyState >= 1) go(); else cur.a.addEventListener('loadedmetadata', go, { once: true }); }
  cur.a.play().catch(() => {}); el.querySelector('.p').innerHTML = PAUSE;
}, true);
/* ───── التسجيل ───── */
let rec = null;
/** يبدأ التسجيل (لازم يكون من ضغطة المستخدم). يرجع Promise فيها الرمز [vn:…] أو null لو ألغى */
export function recordVoiceNote() {
  if (rec) return Promise.resolve(null); style();
  return new Promise(async (resolve) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { alert('جهازك ما يدعم تسجيل الصوت.'); return resolve(null); }
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { alert('اسمح للمايك عشان تسجل رسالة صوتية.'); return resolve(null); }
    const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48000 } : undefined); const chunks = []; mr.ondataavailable = (ev) => { if (ev.data?.size) chunks.push(ev.data); };
    const bar = document.createElement('div'); bar.className = 'vnrec127'; bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'تسجيل رسالة صوتية');
    bar.innerHTML = '<button type="button" class="x" aria-label="إلغاء">✕</button><span class="dot"></span><b class="tm">0:00</b><span class="lv"></span><button type="button" class="ok" aria-label="إرسال">➤</button>'; document.body.append(bar);
    const t0 = Date.now(); let cancelled = false, an, raf = 0;
    try { const ac = new (window.AudioContext || window.webkitAudioContext)(); const src = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 256; src.connect(an); rec = { ac }; } catch { rec = {}; }
    const lv = bar.querySelector('.lv'); const buf = an ? new Uint8Array(an.fftSize) : null;
    const tick = () => { const s = (Date.now() - t0) / 1000; bar.querySelector('.tm').textContent = fmt(s); if (an) { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); const i = document.createElement('i'); i.style.height = `${Math.max(8, Math.min(100, m * 1.6))}%`; lv.append(i); while (lv.children.length > 60) lv.firstChild.remove(); } if (s >= 60) return stop(false); raf = requestAnimationFrame(tick); };
    const stop = (cancel) => { if (!rec) return; cancelled = cancel; cancelAnimationFrame(raf); try { mr.state !== 'inactive' && mr.stop(); } catch { /* */ } };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop()); try { rec?.ac?.close(); } catch { /* */ } rec = null;
      const sec = Math.round((Date.now() - t0) / 1000);
      if (cancelled || sec < 1 || !chunks.length) { bar.remove(); return resolve(null); }
      bar.innerHTML = '<span class="dot"></span><b class="tm">جاري الإرسال…</b>';
      try { const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }); const r = await fetch(`/api/voice-note?sec=${Math.min(60, sec)}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob }); const j = await r.json().catch(() => ({})); if (!r.ok || !j.token) throw new Error(j.error || 'ما انرسل التسجيل.'); bar.remove(); resolve(j.token); }
      catch (er) { bar.remove(); alert(er.message || 'ما انرسل التسجيل.'); resolve(null); }
    };
    bar.querySelector('.x').onclick = () => stop(true); bar.querySelector('.ok').onclick = () => stop(false);
    mr.start(250); raf = requestAnimationFrame(tick);
  });
}
style();
