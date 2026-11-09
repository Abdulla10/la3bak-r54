/* R67: مشاهدة يوتيوب جماعية بالغرفة (وضع السينما).
 * المشغل iframe رسمي من youtube-nocookie ونكلمه بـ postMessage (بدون سكربت خارجي).
 * الـiframe عايش برا إعادة رسم الغرفة (فوق المكان المحجوز بالضبط) عشان ما يعيد التحميل مع كل تحديث. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const YT = /^[A-Za-z0-9_-]{11}$/;
const ORIGIN = 'https://www.youtube-nocookie.com';
export function parseYouTube(text) {
  const t = String(text || '').trim(); if (YT.test(t)) return t;
  try {
    const u = new URL(t.startsWith('http') ? t : 'https://' + t), h = u.hostname.replace(/^www\.|^m\./, '');
    if (h === 'youtu.be') { const id = u.pathname.slice(1, 12); return YT.test(id) ? id : null; }
    if (h === 'youtube.com' || h === 'music.youtube.com' || h === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v'); if (v && YT.test(v)) return v;
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/); if (m) return m[1];
    }
  } catch { /* مب رابط */ }
  return null;
}
const ICON = {
  yt: '<svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true"><rect width="28" height="20" rx="5" fill="#ff0033"/><path d="M11 5.5v9l8-4.5z" fill="#fff"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor"/></svg>',
};
/** المكان المحجوز داخل الغرفة. المشغل نفسه يطفو فوقه. */
export function cinemaHTML(room, canControl, open) {
  const v = room?.video;
  if (!v && !open) return '';
  if (!v) return `<section class="cn67" data-cn67 dir="rtl"><div class="cn67-empty"><span class="cn67-brand">${ICON.yt}<b>YouTube</b></span><p>اختر مقطع فيديو على يوتيوب، وسولف مع ربعك في الغرفة وأنتم تشوفونه</p>${canControl ? '<button type="button" class="cn67-add" data-so-action="cinema-add">▶ إضافة فيديو</button><button type="button" class="cn67-link" data-so-action="cinema-close">إلغاء</button>' : ''}</div></section>`;
  const ctl = canControl ? `<div class="cn67-ctl"><button type="button" data-so-action="cinema-seek" data-delta="-10" aria-label="رجوع 10 ثواني">−10</button><button type="button" class="cn67-pp" data-so-action="${v.paused === null ? 'cinema-pause' : 'cinema-play'}" aria-label="${v.paused === null ? 'إيقاف مؤقت' : 'تشغيل'}">${v.paused === null ? ICON.pause : ICON.play}</button><button type="button" data-so-action="cinema-seek" data-delta="10" aria-label="تقديم 10 ثواني">+10</button><button type="button" data-so-action="cinema-add" aria-label="تغيير الفيديو">تغيير</button><button type="button" class="cn67-off" data-so-action="cinema-off" aria-label="إيقاف المشاهدة">إنهاء</button></div>` : `<p class="cn67-note">${v.paused === null ? 'تشاهدون مع بعض الحين' : 'المشرف موقّف الفيديو'}</p>`;
  return `<section class="cn67" data-cn67 dir="rtl"><div class="cn67-screen" data-cn67-slot></div>${ctl}</section>`;
}
/* ———— المشغل الطافي ———— */
let host = null, frame = null, cur = null, ready = false, lastTime = null, lastTimeAt = 0, raf = 0, skew = 0, poll = 0, stateKey = '';
const send = (func, args = []) => { try { frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), ORIGIN); } catch { /* */ } };
const target = () => !cur ? 0 : Math.max(0, cur.paused ?? (Date.now() + skew - cur.base) / 1000);
function sync(force = false) {
  if (!cur || !ready) return;
  const want = target(), have = lastTime === null ? null : lastTime + (cur.paused === null ? (Date.now() - lastTimeAt) / 1000 : 0);
  if (force || have === null || Math.abs(have - want) > 2.5) send('seekTo', [want, true]);
  send(cur.paused === null ? 'playVideo' : 'pauseVideo');
}
addEventListener('message', (e) => {
  if (e.origin !== ORIGIN || !frame || e.source !== frame.contentWindow) return;
  let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
  if (d?.event === 'onReady') { ready = true; sync(true); }
  if (d?.event === 'infoDelivery' && d.info) {
    if (typeof d.info.currentTime === 'number') { lastTime = d.info.currentTime; lastTimeAt = Date.now(); }
    if (d.info.playerState === 1 && cur?.paused !== null) send('pauseVideo');
  }
});
function place() {
  raf = 0; const slot = document.querySelector('[data-cn67-slot]');
  if (!host) return;
  if (!slot || !cur) { host.style.visibility = 'hidden'; return; }
  const r = slot.getBoundingClientRect();
  host.style.visibility = r.height > 0 ? 'visible' : 'hidden';
  host.style.transform = `translate(${Math.round(r.left)}px,${Math.round(r.top)}px)`; host.style.width = r.width + 'px'; host.style.height = r.height + 'px';
  raf = requestAnimationFrame(place);
}
/** تنادى بعد كل رسم للغرفة. video = حالة الخادم أو null. */
export function cinemaMount(video) {
  if (!video || !YT.test(video.vid)) return cinemaUnmount();
  skew = typeof video.now === 'number' ? video.now - Date.now() : 0;
  const key = `${video.vid}|${video.paused}|${video.base}`;
  if (!host) { host = document.createElement('div'); host.className = 'cn67-host'; document.body.append(host); }
  if (!cur || cur.vid !== video.vid) {
    ready = false; lastTime = null; host.innerHTML = '';
    const start = Math.floor(Math.max(0, video.paused ?? (Date.now() + skew - video.base) / 1000));
    frame = document.createElement('iframe');
    frame.src = `${ORIGIN}/embed/${video.vid}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&modestbranding=1&start=${start}&origin=${encodeURIComponent(location.origin)}`;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture'; frame.title = 'فيديو يوتيوب بالغرفة'; frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('load', () => { try { frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'cn67' }), ORIGIN); } catch { /* */ } setTimeout(() => { ready = true; sync(true); }, 900); });
    host.append(frame);
  }
  const changed = key !== stateKey; cur = { ...video }; stateKey = key;
  if (changed) sync(true);
  clearInterval(poll); poll = setInterval(() => sync(false), 5000);
  if (!raf) raf = requestAnimationFrame(place);
}
export function cinemaUnmount() {
  cur = null; stateKey = ''; ready = false; lastTime = null; clearInterval(poll); poll = 0;
  if (raf) cancelAnimationFrame(raf); raf = 0; if (host) { host.remove(); host = null; frame = null; }
}
/** الموضع الحالي بالثواني (للتحكم من المشرف) */
export function cinemaPosition() { return target(); }
