/* R68z28: نافذة «تنويه» لما ينمنع اللاعب من الألعاب بسبب الخروج المتكرر (عداد تنازلي) */
let until = 0, tick = 0;
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export function showQuitBan(leftMs) {
  if (!(leftMs > 0)) return;
  until = Date.now() + leftMs;
  document.querySelector('.qb68')?.remove();
  const el = document.createElement('div'); el.className = 'qb68'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'qb68-t'); el.dir = 'rtl';
  el.innerHTML = `<div class="qb68-box"><button type="button" class="qb68-x" aria-label="إغلاق">✕</button><div class="qb68-ic" aria-hidden="true">⏳</div><h2 id="qb68-t">تنويه</h2>
    <p>بسبب الخروج المتكرر من الألعاب، تم منعك من دخول الألعاب مؤقتاً.</p><div class="qb68-left"><b class="qb68-c">${fmt(leftMs)}</b><small>متبقية</small></div>
    <button type="button" class="qb68-ok">حسناً</button><p class="qb68-note">لا تطلع من اللعبة أكثر من 3 مرات بالدقيقة.</p></div>`;
  const close = () => { clearInterval(tick); el.remove(); };
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('.qb68-x,.qb68-ok')) close(); });
  document.body.appendChild(el); el.querySelector('.qb68-ok').focus();
  clearInterval(tick); tick = setInterval(() => { const l = until - Date.now(); const c = el.querySelector('.qb68-c'); if (c) c.textContent = fmt(l); if (l <= 0) close(); }, 500);
}
if (!document.getElementById('qb68-css')) {
  const st = document.createElement('style'); st.id = 'qb68-css';
  st.textContent = `.qb68{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:#07021299;backdrop-filter:blur(4px);animation:qb68in .2s}
.qb68-box{position:relative;width:min(100%,360px);padding:26px 22px 18px;border-radius:26px;text-align:center;color:#f3eaff;background:linear-gradient(180deg,#3a1670,#1c0a38);border:1.5px solid #c9a24a99;box-shadow:0 20px 50px #000a}
.qb68-x{position:absolute;top:12px;inset-inline-start:14px;width:34px;height:34px;border:0;border-radius:50%;background:#ffffff14;color:#fff;font-size:16px;cursor:pointer}
.qb68-ic{font-size:40px;line-height:1}.qb68 h2{margin:6px 0 10px!important;font-size:22px!important;font-weight:900!important;color:#ffcb47!important}
.qb68 p{margin:0 0 12px;font-size:15px;line-height:1.7}
.qb68-left{display:flex;flex-direction:column;align-items:center;margin:4px auto 16px}.qb68-c{font:900 34px/1 Arial,sans-serif!important;color:#ffcb47!important;direction:ltr}.qb68-left small{opacity:.8;margin-top:4px}
.qb68-ok{width:100%;padding:12px;border-radius:999px;border:1.5px solid #ffcb47;background:linear-gradient(180deg,#ffd76a,#e0a020);color:#3a2600;font-size:17px;font-weight:900;cursor:pointer}
.qb68-note{margin:12px 0 0!important;font-size:12.5px!important;opacity:.7}
@keyframes qb68in{from{opacity:0}}`;
  document.head.appendChild(st);
}
