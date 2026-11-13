/* R128: «شو فاتك» — أول ما ترجع للغرفة يطلع لك ملخص صغير: أقوى الهدايا، مين صعد المايك، مين أكثر واحد يسولف. */
const KEY = (id) => `la3_rv128_${id}`;
const get = (id) => { try { return Number(localStorage.getItem(KEY(id))) || 0; } catch { return 0; } };
const put = (id, t = Date.now()) => { try { localStorage.setItem(KEY(id), String(t)); } catch { /* */ } };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Number(n || 0).toLocaleString('en-US');
const ago = (ms) => { const m = Math.round(ms / 60000); return m < 60 ? `آخر ${m} دقيقة` : `آخر ${Math.round(m / 60) === 1 ? 'ساعة' : Math.round(m / 60) === 2 ? 'ساعتين' : Math.round(m / 60) + ' ساعات'}`; };
const CSS = `.rc128{position:fixed;z-index:60;top:calc(env(safe-area-inset-top) + 74px);left:50%;transform:translate(-50%,-14px);width:min(360px,calc(100% - 24px));background:linear-gradient(180deg,rgba(40,22,78,.97),rgba(22,12,44,.97));color:#f4efff;border:1px solid rgba(250,204,21,.35);border-radius:18px;padding:12px 14px 10px;box-shadow:0 12px 34px rgba(0,0,0,.5),0 0 0 1px rgba(168,85,247,.2) inset;opacity:0;transition:opacity .25s,transform .25s;direction:rtl;font-size:13.5px}
.rc128.on{opacity:1;transform:translate(-50%,0)}
.rc128 h3{margin:0 0 8px;font-size:15px;display:flex;align-items:center;gap:6px}.rc128 h3 small{font-weight:400;color:#c4b5fd;font-size:12px}
.rc128 .x{position:absolute;top:8px;left:8px;width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:14px}
.rc128 ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}.rc128 li{display:flex;gap:8px;align-items:flex-start;line-height:1.5}.rc128 li>i{font-style:normal;flex:none;width:22px;text-align:center}
.rc128 b{color:#fde68a;font-weight:700}.rc128 .g{color:#f9a8d4}.rc128 .bar{height:3px;border-radius:3px;background:rgba(255,255,255,.1);margin-top:9px;overflow:hidden}.rc128 .bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#facc15,#a855f7);transform-origin:right;animation:rc128 12s linear forwards}
@keyframes rc128{to{transform:scaleX(0)}}`;
let shown = '', beat = 0, beatRoom = '';
function style() { if (!document.querySelector('style[data-rc128]')) { const s = document.createElement('style'); s.dataset.rc128 = '1'; s.textContent = CSS; document.head.append(s); } }
/** نحدّث «آخر زيارة» كل دقيقة وأنت داخل الغرفة، عشان الملخص يكون عن اللي فاتك بس */
function heartbeat(roomId) {
  beatRoom = roomId; if (beat) return;
  const tick = () => { if (!beatRoom) return; if (!location.hash.includes(beatRoom)) { beatRoom = ''; clearInterval(beat); beat = 0; return; } if (document.visibilityState === 'visible') put(beatRoom); };
  beat = setInterval(tick, 60_000); addEventListener('pagehide', tick);
}
export async function showRecap(roomId) {
  if (!roomId || shown === roomId) return; shown = roomId;
  const last = get(roomId), now = Date.now(); heartbeat(roomId);
  if (last && now - last < 10 * 60_000) { put(roomId); return; } // كنت هني قبل شوي
  const since = last || now - 2 * 3600_000;
  let d; try { const r = await fetch(`/api/room-recap?room=${encodeURIComponent(roomId)}&since=${since}`, { credentials: 'same-origin' }); d = r.ok ? await r.json() : null; } catch { d = null; }
  put(roomId);
  if (!d?.ok || d.empty) return;
  const rows = [];
  for (const g of d.gifts || []) rows.push(`<li><i>${esc(g.icon || '🎁')}</i><span><b>${esc(g.from)}</b> أرسل <span class="g">${esc(g.name)}${g.qty > 1 ? ` ×${g.qty}` : ''}</span> لـ <b>${esc(g.to)}</b></span></li>`);
  if (d.giftCount > (d.gifts || []).reduce((s, g) => s + g.qty, 0)) rows.push(`<li><i>✨</i><span>المجموع: ${num(d.giftCount)} هدية بقيمة <b>${num(d.giftTotal)}</b> عملة</span></li>`);
  if (d.mics?.length) rows.push(`<li><i>🎙️</i><span>صعدوا المايك: <b>${d.mics.map(esc).join('، ')}</b></span></li>`);
  if (d.chatters?.length && d.messages >= 3) rows.push(`<li><i>💬</i><span>${num(d.messages)} رسالة · أكثر واحد يسولف: <b>${esc(d.chatters[0].name)}</b>${d.chatters[1] ? ` ثم ${esc(d.chatters[1].name)}` : ''}</span></li>`);
  if (!rows.length) return;
  style(); document.querySelector('.rc128')?.remove();
  const el = document.createElement('section'); el.className = 'rc128'; el.setAttribute('role', 'status'); el.setAttribute('aria-label', 'شو فاتك');
  el.innerHTML = `<button type="button" class="x" aria-label="إغلاق">✕</button><h3>👀 شو فاتك <small>${ago(now - d.from)}</small></h3><ul>${rows.join('')}</ul><div class="bar"><i></i></div>`;
  document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
  let t = setTimeout(close, 12_000);
  function close() { clearTimeout(t); el.classList.remove('on'); setTimeout(() => el.remove(), 260); }
  el.querySelector('.x').addEventListener('click', close);
  el.addEventListener('pointerenter', () => { clearTimeout(t); el.querySelector('.bar i')?.style.setProperty('animation-play-state', 'paused'); });
  addEventListener('hashchange', close, { once: true });
}
export function resetRecap() { shown = ''; }
