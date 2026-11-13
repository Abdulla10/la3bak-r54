/* R127: «الحماية والخصوصية» — من يراسلني، فلتر الكلمات، عدم الإزعاج، تنبيه الأجهزة الجديدة */
const api = (u, method = 'GET', body) => fetch(u, { method, credentials: 'same-origin', headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }).then(async (r) => { const j = await r.json().catch(() => ({})); return r.ok ? j : { ok: false, ...j }; }).catch(() => ({ ok: false, error: 'انقطع الاتصال.' }));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const mins = (v) => { const [h, m] = String(v || '').split(':').map(Number); return Number.isInteger(h) && Number.isInteger(m) ? h * 60 + m : null; };
const CSS = `.pr127-bg{position:fixed;inset:0;z-index:9000;background:rgba(5,3,15,.62);display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px)}
.pr127{width:min(520px,100%);max-height:88vh;overflow:auto;background:linear-gradient(180deg,#1d1236,#120b24);color:#f4efff;border-radius:22px 22px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.5);font-family:inherit}
.pr127 h2{margin:0 0 4px;font-size:18px;display:flex;align-items:center;justify-content:space-between}.pr127 h2 button{background:rgba(255,255,255,.08);border:0;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px}
.pr127 .sub{margin:0 0 12px;color:#b9a9dd;font-size:12.5px}
.pr127 .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;margin:10px 0}
.pr127 .card h3{margin:0 0 4px;font-size:15px}.pr127 .card p{margin:0 0 8px;color:#b9a9dd;font-size:12.5px;line-height:1.6}
.pr127 .seg{display:flex;gap:6px}.pr127 .seg button{flex:1;padding:9px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#e9e1ff;font:inherit;font-size:13px}
.pr127 .seg button.on{background:linear-gradient(180deg,#a855f7,#6d28d9);border-color:transparent;color:#fff;font-weight:700}
.pr127 .chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.pr127 .chip{display:inline-flex;align-items:center;gap:6px;background:rgba(168,85,247,.18);border:1px solid rgba(168,85,247,.4);border-radius:999px;padding:4px 10px;font-size:13px}.pr127 .chip button{background:none;border:0;color:#fca5a5;font-size:14px;padding:0}
.pr127 .row{display:flex;gap:6px;align-items:center}.pr127 input[type=text],.pr127 input[type=time]{flex:1;min-width:0;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.14);color:#fff;border-radius:12px;padding:9px 10px;font:inherit;color-scheme:dark}
.pr127 input[type=time]{font-size:14px;padding:8px 6px;text-align:center}.pr127 .row.tm{flex-wrap:wrap}.pr127 .row.tm .pbtn{flex-basis:100%;margin-top:6px}.pr127 .pbtn{background:linear-gradient(180deg,#facc15,#d97706)!important;color:#1a1033;border:0;border-radius:12px;padding:9px 14px;font:inherit;font-weight:800;font-size:13px}
.pr127 .sw{width:46px;height:26px;border-radius:999px;border:0;background:rgba(255,255,255,.18);position:relative;flex:none}.pr127 .sw i{position:absolute;top:3px;inset-inline-start:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}.pr127 .sw.on{background:#22c55e}.pr127 .sw.on i{inset-inline-start:23px}
.pr127 .head{display:flex;justify-content:space-between;align-items:center;gap:8px}.pr127 .lim{font-size:12px;color:#facc15}
.pr127 a.lnk{display:flex;justify-content:space-between;align-items:center;color:#e9e1ff;text-decoration:none;padding:9px 0;border-top:1px solid rgba(255,255,255,.07);font-size:13.5px}.pr127 a.lnk:first-of-type{border-top:0}
.pr127 .ok{color:#4ade80;font-size:12.5px;min-height:16px;margin-top:6px}.pr127 .bad{color:#fca5a5}
.pr127 .badge{font-size:11.5px;padding:2px 8px;border-radius:999px;background:rgba(34,197,94,.18);color:#4ade80}.pr127 .badge.off{background:rgba(255,255,255,.08);color:#b9a9dd}`;
const style = () => { if (!document.querySelector('style[data-pr127]')) { const s = document.createElement('style'); s.dataset.pr127 = '1'; s.textContent = CSS; document.head.append(s); } };

export async function openProtect() {
  style(); document.querySelector('.pr127-bg')?.remove();
  const bg = document.createElement('div'); bg.className = 'pr127-bg'; bg.innerHTML = '<div class="pr127" dir="rtl"><h2>🛡️ الحماية والخصوصية</h2><p class="sub">جاري التحميل…</p></div>'; document.body.append(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  const [p, dm] = await Promise.all([api('/api/protect'), api('/api/social-private/settings')]);
  if (p.ok === false) { bg.querySelector('.sub').textContent = p.error || 'تعذّر التحميل.'; return; }
  const st = { words: [...(p.words || [])], lim: p.wordLimit || 5, dnd: p.dnd || { on: false, from: 1380, to: 480 }, dm: dm?.dmEnabled !== false, push: p.push || 0 };
  const box = bg.querySelector('.pr127');
  const paint = () => {
    box.innerHTML = `<h2>🛡️ الحماية والخصوصية <button type="button" data-x aria-label="إغلاق">✕</button></h2><p class="sub">تحكّم مين يوصلك ووش تشوف ومتى ينزعجك الجوال.</p>
    <div class="card"><h3>💬 مين يقدر يراسلني؟</h3><p>الرسائل الخاصة أصلاً للأصدقاء بس. تقدر توقفها كلها.</p>
      <div class="seg"><button type="button" data-dm="1" class="${st.dm ? 'on' : ''}">الأصدقاء</button><button type="button" data-dm="0" class="${st.dm ? '' : 'on'}">ما أحد</button></div><div class="ok" data-ok="dm"></div></div>
    <div class="card"><div class="head"><h3>🚫 فلتر الكلمات</h3><span class="lim">${st.words.length}/${st.lim}</span></div><p>الكلمات اللي تضيفها تتغطى (•••) عندك بالدردشة والرسائل والتعليقات.${st.lim < 30 ? ' مع VIP توصل 30 كلمة.' : ''}</p>
      <div class="chips">${st.words.map((w, i) => `<span class="chip">${esc(w)}<button type="button" data-rm="${i}" aria-label="حذف">✕</button></span>`).join('') || '<span class="sub" style="margin:0">ما أضفت كلمات.</span>'}</div>
      <div class="row"><input type="text" maxlength="24" placeholder="اكتب كلمة…" data-word dir="auto"><button type="button" class="pbtn" data-add>إضافة</button></div><div class="ok" data-ok="w"></div></div>
    <div class="card"><div class="head"><h3>🌙 عدم الإزعاج</h3><button type="button" class="sw${st.dnd.on ? ' on' : ''}" role="switch" aria-checked="${st.dnd.on}" data-dnd-sw><i></i></button></div><p>بهالوقت ما توصلك إشعارات على الجوال. تنبيه «دخول جديد لحسابك» يوصلك دايماً.</p>
      <div class="row tm"><label style="font-size:12.5px;color:#b9a9dd">من</label><input type="time" data-from value="${hm(st.dnd.from)}"><label style="font-size:12.5px;color:#b9a9dd">إلى</label><input type="time" data-to value="${hm(st.dnd.to)}"><button type="button" class="pbtn" data-dnd-save>حفظ</button></div><div class="ok" data-ok="dnd"></div></div>
    <div class="card"><h3>🔐 أمان الحساب</h3>
      <a class="lnk" href="#/devices" data-go>الأجهزة وتنبيه الدخول الجديد <span class="badge${st.push ? '' : ' off'}">${st.push ? 'التنبيه شغّال' : 'شغّل إشعارات الجوال'}</span></a>
      <a class="lnk" href="#/twofa" data-go>التحقق بخطوتين <span>›</span></a>
      <a class="lnk" href="#/privacy-settings" data-go>إعدادات الخصوصية الثانية <span>›</span></a>
      <a class="lnk" href="#/friends" data-go>القائمة السوداء <span>›</span></a></div>`;
  };
  const say = (k, t, bad = false) => { const n = box.querySelector(`[data-ok="${k}"]`); if (n) { n.textContent = t; n.classList.toggle('bad', bad); } };
  const saveWords = async (next) => { const r = await api('/api/perks/mute-words', 'POST', { words: next }); if (r.ok === false || r.error) { say('w', r.error || 'تعذّر الحفظ.', true); return; } st.words = r.muteWords || next; paint(); say('w', 'تم الحفظ ✓'); dispatchEvent(new CustomEvent('la3:mute', { detail: st.words })); };
  box.addEventListener('click', async (e) => {
    const t = e.target.closest('button,a'); if (!t) return;
    if (t.matches('[data-x]') || t.matches('[data-go]')) { close(); return; }
    if (t.dataset.dm) { const on = t.dataset.dm === '1'; if (on === st.dm) return; const r = await api('/api/social-private/settings', 'PATCH', { dmEnabled: on }); if (r.ok === false) { say('dm', r.error || 'تعذّر الحفظ.', true); return; } st.dm = on; paint(); say('dm', on ? 'الأصدقاء يقدرون يراسلونك ✓' : 'وقّفنا الرسائل الخاصة ✓'); return; }
    if (t.dataset.rm) { const next = st.words.filter((_, i) => String(i) !== t.dataset.rm); await saveWords(next); return; }
    if (t.matches('[data-add]')) { const inp = box.querySelector('[data-word]'); const w = inp.value.trim(); if (w.length < 2) { say('w', 'الكلمة لازم حرفين أو أكثر.', true); return; } if (st.words.includes(w)) { say('w', 'موجودة.', true); return; } if (st.words.length >= st.lim) { say('w', st.lim < 30 ? 'وصلت 5 كلمات. مع VIP توصل 30.' : 'وصلت الحد.', true); return; } await saveWords([...st.words, w]); return; }
    if (t.matches('[data-dnd-sw]')) { st.dnd.on = !st.dnd.on; t.classList.toggle('on', st.dnd.on); t.setAttribute('aria-checked', String(st.dnd.on)); if (!st.dnd.on) { const r = await api('/api/protect/dnd', 'POST', { on: false }); say('dnd', r.ok === false ? (r.error || 'تعذّر الحفظ.') : 'طفّينا عدم الإزعاج ✓', r.ok === false); } else say('dnd', 'اختر الوقت واضغط حفظ.'); return; }
    if (t.matches('[data-dnd-save]')) { const f = mins(box.querySelector('[data-from]').value), to = mins(box.querySelector('[data-to]').value); if (f == null || to == null || f === to) { say('dnd', 'الوقت غير صالح.', true); return; } const r = await api('/api/protect/dnd', 'POST', { on: true, from: f, to, tz: -new Date().getTimezoneOffset() }); if (r.ok === false || r.error) { say('dnd', r.error || 'تعذّر الحفظ.', true); return; } st.dnd = r.dnd; paint(); say('dnd', `تم ✓ عدم الإزعاج من ${hm(f)} إلى ${hm(to)}`); }
  });
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-word]')) { e.preventDefault(); box.querySelector('[data-add]')?.click(); } });
  paint();
}
