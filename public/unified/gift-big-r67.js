/* R67: الهدايا الكبيرة تعبي الشاشة — للهدايا الغالية بس (قيمتها 9,000 عملة أو أكثر).
 * نستخدم رسمة الهدية نفسها مكبرة مع أشعة وألعاب نارية من رسومات المدفع، وشريط «فلان أرسل … إلى فلان». */
import { giftArtwork } from '../gift-assets-r27.js?v=r69zz-r36';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FX = '/assets/art67/cannon/', V = 'r67i';
const seen = new Set(); const queue = []; let busy = false;
export const BIG_GIFT_COINS = 9000;
// R67ae: المالك يغيّر الحد من لوحة التحكم
let bigMin = BIG_GIFT_COINS;
try { fetch('/api/site-flags', { credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null).then((j) => { if (j && Number.isSafeInteger(j.bigGiftMin) && j.bigGiftMin > 0) bigMin = j.bigGiftMin; }).catch(() => {}); } catch {}
export function giftCoins(ev) { const p = Number(ev?.gift?.price) || 0, q = Number(ev?.qty) || 1; return p * q * (ev?.gift?.currency === 'gems' ? 20 : 1); }
export function bigGift(ev) {
  if (!ev?.tx || seen.has(ev.tx) || giftCoins(ev) < bigMin || typeof document === 'undefined' || document.hidden) return false;
  seen.add(ev.tx); queue.push(ev); if (queue.length > 3) queue.splice(0, queue.length - 3); next(); return true;
}
function next() {
  if (busy || !queue.length) return; busy = true; const ev = queue.shift();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const art = giftArtwork(ev.gift) || `<span class="gb67-emoji">${esc(ev.gift?.icon || '🎁')}</span>`;
  const face = (p) => p?.avatar && /^\/[A-Za-z0-9_./?=&-]+$/.test(p.avatar) ? `<img src="${esc(p.avatar)}" alt="">` : `<b>${esc(String(p?.name || '؟').trim().charAt(0))}</b>`;
  const n = document.createElement('section'); n.className = 'gb67'; n.setAttribute('role', 'status'); n.setAttribute('dir', 'rtl');
  const fw = reduced ? '' : Array.from({ length: 6 }, (_, k) => `<i class="gb67-fw" style="--x:${[12, 84, 22, 76, 50, 8][k]}%;--y:${[14, 18, 62, 58, 8, 40][k]}%;--d:${(k * 0.5).toFixed(1)}s;background-image:url(${FX}${['fireworks-gold', 'fireworks-purple', 'fireworks-pink'][k % 3]}.webp?v=${V})"></i>`).join('');
  n.innerHTML = `<i class="gb67-rays" aria-hidden="true"></i>${fw}<div class="gb67-art">${art}</div>
  <div class="gb67-bar"><span class="gb67-face">${face(ev.from)}</span><span class="gb67-tx"><b>${esc(ev.from?.name || 'عضو')}</b><small>أرسل <em>${esc(ev.gift?.name || 'هدية')}</em> إلى <b>${esc(ev.to?.name || 'عضو')}</b></small></span><span class="gb67-qty">×${esc(ev.qty || 1)}</span></div>`;
  document.body.append(n);
  n.addEventListener('click', () => end());
  let done = false; const end = () => { if (done) return; done = true; n.classList.add('is-out'); setTimeout(() => { n.remove(); busy = false; next(); }, 450); };
  setTimeout(end, reduced ? 2500 : 4600);
}
