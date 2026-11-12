// R118: زر رجوع للصفحات اللي ما فيها رجوع (الغرف، الرسائل، المتجر) — يرجع للصفحة اللي قبل، أو للرئيسية
const NEED = /^#\/(social-rooms|rooms|messages)(?:$|[/?])/;
const css = `.bk118{position:absolute;z-index:85;top:calc(env(safe-area-inset-top,0px) + 14px + var(--nt118,0px));right:14px;width:44px;height:44px;display:grid;place-items:center;border-radius:50%;border:1.5px solid #ffffff2e;background:rgba(30,10,55,.72);color:#fff;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 4px 14px #0007}
.bk118 svg{width:22px;height:22px}
html.bk118-on .m68-head h1{margin-right:50px!important;font-size:22px!important;line-height:1.2!important}.bk118:active{scale:.92}`;
let depth = 0, btn = null;
const hash = () => String((globalThis.__LA3BAK_NAV__ || location).hash || location.hash || '');
function paint() {
  const show = NEED.test(hash());
  document.documentElement.classList.toggle('bk118-on', show);
  if (!show) { btn?.remove(); btn = null; return; }
  if (!document.querySelector('style[data-bk118]')) { const s = document.createElement('style'); s.dataset.bk118 = '1'; s.textContent = css; document.head.append(s); }
  if (!btn) {
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'bk118'; btn.setAttribute('aria-label', 'رجوع');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.onclick = () => { if (depth > 1 && history.length > 1) history.back(); else { const n = globalThis.__LA3BAK_NAV__; if (n?.go) n.go('#/'); else location.hash = '#/'; } };
  }
  if (!btn.isConnected) document.body.append(btn);
  const nt = document.getElementById('ntBar'); btn.style.setProperty('--nt118', (nt ? nt.getBoundingClientRect().height : 0) + 'px');
}
addEventListener('hashchange', () => { depth++; paint(); });
addEventListener('popstate', () => setTimeout(paint, 0));
const start = () => { paint(); setInterval(paint, 1200); };
if (document.body) start(); else addEventListener('DOMContentLoaded', start);
