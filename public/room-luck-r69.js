// R69: داخل الغرفة الصوتية — «ظرف الحظ» (ترمي عملات والحاضرين يتقاسمونها) و«أغاني الغرفة» (طابور يوتيوب صوتي يسمعه الكل مع بعض).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const YT = /^[A-Za-z0-9_-]{11}$/;
const ORIGIN = 'https://www.youtube-nocookie.com';
function ytId(text) {
  const t = String(text || '').trim(); if (YT.test(t)) return t;
  try { const u = new URL(t.startsWith('http') ? t : 'https://' + t), h = u.hostname.replace(/^www\.|^m\./, '');
    if (h === 'youtu.be') { const id = u.pathname.slice(1, 12); return YT.test(id) ? id : null; }
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(h)) { const v = u.searchParams.get('v'); if (v && YT.test(v)) return v; const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/); if (m) return m[1]; }
  } catch { /* مو رابط */ }
  return null;
}
const CSS = `.rl69-fab{position:fixed;right:12px;z-index:79;width:50px;height:50px;border-radius:50%;font-size:24px;cursor:pointer;box-shadow:0 6px 18px #000a}
.rl69-fab.env{bottom:230px;border:2px solid #ffd34d;background:radial-gradient(circle at 50% 30%,#ff4d5e,#a10f2a)}.rl69-fab.mus{bottom:290px;border:2px solid #7df0ff;background:radial-gradient(circle at 50% 30%,#3d6bff,#1a0a56)}
body:has(.so-menu-tile) .rl69-fab,body:has(.so-menu-tile) .rq68-fab{display:none!important}
.rl69-fab.has::after{content:"";position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:#ffe14d;box-shadow:0 0 8px #ffe14d}
.rl69-ov{position:fixed;inset:0;z-index:120;background:#0009;display:flex;align-items:flex-end;justify-content:center;direction:rtl}
.rl69-sh{width:min(100%,480px);max-height:82vh;overflow:auto;background:linear-gradient(170deg,#3a1060,#170830);border:1px solid #a86bff55;border-radius:22px 22px 0 0;padding:14px 14px calc(env(safe-area-inset-bottom) + 16px);color:#fff;font-family:inherit;animation:rl69up .25s ease}@keyframes rl69up{from{transform:translateY(40%)}}
.rl69-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.rl69-h b{font-size:17px}.rl69-x{border:0;background:#ffffff14;color:#fff;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer}
.rl69-lbl{font-size:13px;font-weight:800;margin:10px 0 6px;opacity:.9}.rl69-ch{display:flex;flex-wrap:wrap;gap:6px}.rl69-ch button{border:1px solid #ffffff2e;background:#ffffff10;color:#fff;border-radius:99px;padding:7px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.rl69-ch button.on{background:#e0182d;border-color:#ffd34d}
.rl69-go{width:100%;margin-top:12px;border:0;border-radius:14px;padding:12px;font:inherit;font-weight:900;font-size:15px;color:#3a1a00;background:linear-gradient(90deg,#ffb020,#ffd76b);cursor:pointer}.rl69-go:disabled{opacity:.5}.rl69-go.red{color:#fff;background:linear-gradient(90deg,#ff2e4d,#c2185b)}.rl69-go.ghost{background:#ffffff14;color:#fff}
.rl69-err{color:#ffb3c0;font-weight:800;font-size:13px;margin:8px 0 0}.rl69-ok{color:#9dffb0;font-weight:800;font-size:13px;margin:8px 0 0}
.rl69-env{position:relative;margin:8px 0;padding:14px;border-radius:18px;background:linear-gradient(160deg,#e0182d,#8a0a1e);border:2px solid #ffd34d;text-align:center;box-shadow:0 6px 20px #e0182d55}
.rl69-env.done{background:linear-gradient(160deg,#5a1a2a,#2a0a14);border-color:#ffd34d55}.rl69-env b{font-size:22px;color:#ffe14d;display:block}.rl69-env small{opacity:.9}
.rl69-open{margin-top:10px;width:84px;height:84px;border-radius:50%;border:4px solid #ffe14d;background:radial-gradient(circle at 50% 35%,#ffe58a,#e0a000);color:#8a0a1e;font:900 20px/1 inherit;cursor:pointer;box-shadow:0 0 22px #ffd34d;animation:rl69p 1s ease-in-out infinite alternate}@keyframes rl69p{to{transform:scale(1.08)}}
.rl69-got{font-size:20px;font-weight:900;color:#9dffb0;margin-top:8px}.rl69-tk{list-style:none;margin:8px 0 0;padding:0;font-size:13px;text-align:right}.rl69-tk li{display:flex;justify-content:space-between;padding:3px 6px;border-bottom:1px solid #ffffff14}.rl69-tk em{font-style:normal;color:#ffe14d;font-weight:800}
.rl69-toast{position:fixed;left:50%;top:88px;transform:translateX(-50%);z-index:121;padding:10px 16px;border-radius:99px;background:linear-gradient(90deg,#e0182d,#ff6b2e);color:#fff;font-weight:900;box-shadow:0 6px 18px #0008;cursor:pointer;direction:rtl;animation:rl69up .3s}
.rl69-now{display:flex;gap:10px;align-items:center;padding:10px;border-radius:14px;background:#0005}.rl69-now img{width:96px;height:54px;object-fit:cover;border-radius:8px}.rl69-now div{flex:1;font-size:13px}.rl69-now b{display:block;font-size:14px}
.rl69-q{list-style:none;margin:6px 0 0;padding:0;font-size:13px}.rl69-q li{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #ffffff12}.rl69-q img{width:56px;height:32px;object-fit:cover;border-radius:6px}
.rl69-in{width:100%;border-radius:12px;border:1px solid #9b5cff88;background:#0f0520;color:#fff;padding:10px 12px;font:inherit;direction:ltr}.rl69-row{display:flex;gap:6px;margin-top:8px}.rl69-row .rl69-go{margin-top:0}
.rl69-bar{position:fixed;right:12px;bottom:290px;z-index:79;display:flex;align-items:center;gap:6px;padding:4px;border-radius:12px;background:#1a0a30ee;border:1px solid #7df0ff66;box-shadow:0 4px 14px #0008}
.rl69-bar iframe{width:128px;height:72px;border:0;border-radius:8px;display:block}.rl69-bar button{border:0;background:#ffffff18;color:#fff;border-radius:8px;width:30px;height:30px;cursor:pointer}`;
let started = false;
export function startRoomLuck() {
  if (started) return; started = true;
  if (!document.querySelector('style[data-rl69]')) { const s = document.createElement('style'); s.dataset.rl69 = '1'; s.textContent = CSS; document.head.append(s); }
  const api = (u, body) => fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || 'تعذّر الطلب.'); return j; });
  const fabE = document.createElement('button'); fabE.type = 'button'; fabE.className = 'rl69-fab env'; fabE.hidden = true; fabE.textContent = '🧧'; fabE.setAttribute('aria-label', 'ظرف الحظ');
  const fabM = document.createElement('button'); fabM.type = 'button'; fabM.className = 'rl69-fab mus'; fabM.hidden = true; fabM.textContent = '🎵'; fabM.setAttribute('aria-label', 'أغاني الغرفة');
  const ov = document.createElement('div'); ov.className = 'rl69-ov'; ov.hidden = true;
  const bar = document.createElement('div'); bar.className = 'rl69-bar'; bar.hidden = true;
  document.body.append(fabE, fabM, ov, bar);
  const S = { room: '', env: null, mus: null, open: '', form: { total: 1000, count: 10 }, err: '', ok: '', busy: false, listen: false, playing: '', seen: new Set(), toast: null };
  const roomId = () => { const m = /^#\/social-room\/([0-9a-f-]{36})/i.exec((globalThis.__LA3BAK_NAV__ || location).hash); return m ? m[1] : ''; };
  const active = () => (S.env?.envs || []).filter((e) => !e.done);

  function envSheet() {
    const d = S.env, f = S.form;
    const list = (d?.envs || []).slice().reverse().map((e) => `<div class="rl69-env${e.done ? ' done' : ''}"><small>🧧 ظرف من ${esc(e.byName)}</small><b>🪙 ${nf(e.total)}</b><small>على ${e.count} أشخاص · باقي ${e.left}${e.done ? ' · خلص' : ` · <span data-rl-sec="${e.endsAt}">${Math.max(0, Math.ceil((e.endsAt - Date.now()) / 1000))}</span> ث`}</small>
      ${e.got !== null ? `<div class="rl69-got">أخذت 🪙 ${nf(e.got)} 🎉</div>` : e.mine ? '<div class="rl69-ok">هذا ظرفك 😄 الباقي يرجع لك</div>' : !e.done && e.left > 0 ? `<button type="button" class="rl69-open" data-rl="grab" data-id="${e.id}" ${S.busy ? 'disabled' : ''}>افتح</button>` : ''}
      ${e.taken.length ? `<ol class="rl69-tk">${e.taken.map((t, k) => `<li><span>${k === 0 && e.done ? '👑 ' : ''}${esc(t.name)}</span><em>🪙 ${nf(t.amt)}</em></li>`).join('')}</ol>` : ''}</div>`).join('');
    return `<div class="rl69-sh" role="dialog" aria-label="ظرف الحظ"><div class="rl69-h"><b>🧧 ظرف الحظ</b><button class="rl69-x" type="button" data-rl="close" aria-label="إغلاق">✕</button></div>
      ${list}
      <p class="rl69-lbl">ارمي ظرف للحاضرين (كل واحد ياخذ نصيب عشوائي، واللي يبقى بعد دقيقتين يرجع لك)</p>
      <div class="rl69-ch">${(d?.amounts || [500, 1000, 5000, 10000, 50000]).map((a) => `<button type="button" data-rl-t="${a}" class="${f.total === a ? 'on' : ''}">🪙 ${nf(a)}</button>`).join('')}</div>
      <p class="rl69-lbl">كم شخص؟</p><div class="rl69-ch">${(d?.counts || [5, 10, 20]).map((c) => `<button type="button" data-rl-c="${c}" class="${f.count === c ? 'on' : ''}">${c} أشخاص</button>`).join('')}</div>
      ${S.err ? `<p class="rl69-err" role="alert">${esc(S.err)}</p>` : ''}${S.ok ? `<p class="rl69-ok" role="status">${esc(S.ok)}</p>` : ''}
      <button type="button" class="rl69-go red" data-rl="throw" ${S.busy ? 'disabled' : ''}>ارمي الظرف 🪙 ${nf(f.total)}</button></div>`;
  }
  function musSheet() {
    const d = S.mus || { cur: null, queue: [] };
    const th = (v) => `https://i.ytimg.com/vi/${v}/mqdefault.jpg`;
    return `<div class="rl69-sh" role="dialog" aria-label="أغاني الغرفة"><div class="rl69-h"><b>🎵 أغاني الغرفة</b><button class="rl69-x" type="button" data-rl="close" aria-label="إغلاق">✕</button></div>
      ${d.cur ? `<div class="rl69-now"><img src="${th(d.cur.vid)}" alt=""><div><b>${d.cur.paused ? '⏸ موقفة' : '▶ تشتغل الحين'}</b>أضافها ${esc(d.cur.byName)}</div></div>
        <div class="rl69-row"><button type="button" class="rl69-go${S.listen ? ' ghost' : ''}" data-rl="listen">${S.listen ? '🔇 وقف السماع عندي' : '🎧 اسمع مع الغرفة'}</button></div>
        ${S.env?.mod || d.mod ? `<div class="rl69-row"><button type="button" class="rl69-go ghost" data-rl="pause">${d.cur.paused ? '▶ كمّل' : '⏸ وقف للكل'}</button><button type="button" class="rl69-go ghost" data-rl="skip">⏭ التالية</button><button type="button" class="rl69-go ghost" data-rl="clear">🗑 امسح الكل</button></div>` : `<div class="rl69-row"><button type="button" class="rl69-go ghost" data-rl="skip">⏭ التالية (لو أنت أضفتها)</button></div>`}`
      : '<p class="rl69-lbl">ما فيه أغنية شغالة. أضف أول وحدة!</p>'}
      ${d.queue.length ? `<p class="rl69-lbl">الجاية (${d.queue.length})</p><ol class="rl69-q">${d.queue.map((q) => `<li><img src="${th(q.vid)}" alt=""><span>أضافها ${esc(q.byName)}</span></li>`).join('')}</ol>` : ''}
      <p class="rl69-lbl">أضف أغنية من يوتيوب (الصق الرابط)</p><input class="rl69-in" data-rl-in placeholder="https://youtu.be/..." inputmode="url" autocomplete="off" aria-label="رابط يوتيوب">
      ${S.err ? `<p class="rl69-err" role="alert">${esc(S.err)}</p>` : ''}${S.ok ? `<p class="rl69-ok" role="status">${esc(S.ok)}</p>` : ''}
      <button type="button" class="rl69-go" data-rl="add" ${S.busy ? 'disabled' : ''}>أضف للقائمة</button></div>`;
  }
  function paint() {
    const inRoom = !!S.room && !!S.env?.member;
    fabE.hidden = !inRoom; fabM.hidden = true;
    fabE.classList.toggle('has', active().some((e) => !e.mine && e.got === null && e.left > 0));
    fabM.classList.toggle('has', !!S.mus?.cur);
    if (!inRoom) { ov.hidden = true; S.open = ''; }
    if (S.open) { const keep = ov.querySelector('[data-rl-in]')?.value; ov.hidden = false; ov.innerHTML = S.open === 'env' ? envSheet() : musSheet(); if (keep) { const i = ov.querySelector('[data-rl-in]'); if (i) i.value = keep; } } else { ov.hidden = true; ov.innerHTML = ''; }
    // تنبيه ظرف يديد
    const fresh = active().find((e) => !e.mine && e.got === null && e.left > 0 && !S.seen.has(e.id));
    if (fresh && S.open !== 'env') { S.seen.add(fresh.id); S.toast?.remove(); const t = document.createElement('button'); t.type = 'button'; t.className = 'rl69-toast'; t.textContent = `🧧 ${fresh.byName} رمى ظرف 🪙 ${nf(fresh.total)} — افتحه!`; t.onclick = () => { t.remove(); S.open = 'env'; paint(); }; document.body.append(t); S.toast = t; setTimeout(() => t.remove(), 9000); }
    syncPlayer();
  }
  // المشغل: نعيد بناءه بس لو تغيّرت الأغنية أو موضعها
  let frame = null, lastKey = '';
  function syncPlayer() {
    const cur = S.mus?.cur; const want = S.room && S.listen && cur && !cur.paused;
    if (!want) { if (frame) { frame.remove(); frame = null; lastKey = ''; } bar.hidden = true; return; }
    const startAt = Date.now() - cur.pos * 1000; const key = cur.vid;
    if (frame && lastKey === key) { bar.hidden = false; return; }
    lastKey = key; bar.hidden = false;
    const pos = Math.max(0, Math.floor((Date.now() - startAt) / 1000));
    bar.innerHTML = `<iframe title="أغنية الغرفة" allow="autoplay; encrypted-media" src="${ORIGIN}/embed/${cur.vid}?autoplay=1&start=${pos}&enablejsapi=1&playsinline=1&controls=1&rel=0&origin=${encodeURIComponent(location.origin)}"></iframe><button type="button" data-rl="mute" aria-label="وقف السماع">✕</button>`;
    frame = bar.querySelector('iframe');
    frame.addEventListener('load', () => { try { frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), ORIGIN); } catch { /* */ } });
  }
  addEventListener('message', (e) => {
    if (e.origin !== ORIGIN || !frame || e.source !== frame.contentWindow) return;
    let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (d?.event === 'infoDelivery' && d.info?.playerState === 0 && S.mus?.cur) { const vid = S.mus.cur.vid; api('/api/room-music/ended', { room: S.room, vid }).then((r) => { S.mus = { ...S.mus, ...r }; lastKey = ''; paint(); }).catch(() => {}); }
  });
  async function poll() {
    const r = roomId();
    if (r !== S.room) { S.room = r; S.env = null; S.mus = null; S.open = ''; S.err = ''; S.ok = ''; S.listen = false; }
    if (!r) { paint(); return; }
    let changed = true;
    try { const [e, m] = await Promise.all([api('/api/room-env?room=' + encodeURIComponent(r)), api('/api/room-music?room=' + encodeURIComponent(r))]); if (S.room === r) { const k = JSON.stringify([e, m.cur?.vid, m.cur?.paused, m.queue, m.mod]); changed = k !== S.key; S.key = k; S.env = e; S.mus = m; } } catch { /* المرة الجاية */ }
    if (changed) paint();
  }
  const run = async (fn) => { if (S.busy) return; S.busy = true; S.err = ''; S.ok = ''; paint(); try { await fn(); } catch (e) { S.err = e.message || 'تعذّر الطلب.'; } S.busy = false; paint(); };
  fabE.addEventListener('click', () => { S.open = 'env'; S.err = ''; S.ok = ''; paint(); });
  fabM.addEventListener('click', () => { S.open = 'mus'; S.err = ''; S.ok = ''; paint(); });
  // R69b: زر الأغاني صار داخل قائمة الغرفة (☰)
  document.addEventListener('click', (e) => { if (e.target.closest?.('[data-rl69-music]')) { e.preventDefault(); S.open = 'mus'; S.err = ''; S.ok = ''; paint(); poll(); } }, true);
  bar.addEventListener('click', (e) => { if (e.target.closest('[data-rl="mute"]')) { S.listen = false; paint(); } });
  ov.addEventListener('click', (e) => {
    if (e.target === ov) { S.open = ''; paint(); return; }
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.rlT) { S.form.total = Number(b.dataset.rlT); paint(); return; }
    if (b.dataset.rlC) { S.form.count = Number(b.dataset.rlC); paint(); return; }
    const a = b.dataset.rl;
    if (a === 'close') { S.open = ''; paint(); }
    if (a === 'throw') run(async () => { const r = await api('/api/room-env/throw', { room: S.room, total: S.form.total, count: S.form.count }); S.env = { ...S.env, envs: r.envs }; S.ok = 'رميت الظرف! 🧧'; });
    if (a === 'grab') run(async () => { const r = await api('/api/room-env/grab', { room: S.room, id: b.dataset.id }); S.env = { ...S.env, envs: r.envs }; S.ok = `مبروك! أخذت 🪙 ${nf(r.amt)}`; });
    if (a === 'listen') { S.listen = !S.listen; lastKey = ''; paint(); }
    if (a === 'add') { const vid = ytId(ov.querySelector('[data-rl-in]')?.value); if (!vid) { S.err = 'الصق رابط يوتيوب صحيح.'; paint(); return; } run(async () => { const r = await api('/api/room-music/add', { room: S.room, vid }); S.mus = { ...S.mus, ...r }; S.ok = 'أضفناها ✅'; const i = ov.querySelector('[data-rl-in]'); if (i) i.value = ''; if (!S.listen) { S.listen = true; lastKey = ''; } }); }
    if (a === 'skip') run(async () => { const r = await api('/api/room-music/skip', { room: S.room }); S.mus = { ...S.mus, ...r }; lastKey = ''; });
    if (a === 'pause') run(async () => { const r = await api('/api/room-music/pause', { room: S.room, pause: !S.mus?.cur?.paused }); S.mus = { ...S.mus, ...r }; lastKey = ''; });
    if (a === 'clear') run(async () => { const r = await api('/api/room-music/clear', { room: S.room }); S.mus = { ...S.mus, ...r }; });
  });
  setInterval(() => { if (S.open === 'env') ov.querySelectorAll('[data-rl-sec]').forEach((el) => { el.textContent = String(Math.max(0, Math.ceil((Number(el.dataset.rlSec) - Date.now()) / 1000))); }); }, 1000);
  setInterval(() => { if (!document.hidden && !(S.open && ov.contains(document.activeElement) && document.activeElement.matches('input'))) poll(); }, 3000);
  addEventListener('hashchange', poll); poll();
}
