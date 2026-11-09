// R68z: صفحة عجلة الحظ. النتيجة من الخادم بس؛ الواجهة تدوّر العجلة لين الخانة اللي رجعت.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
function wheelSVG(prizes) {
  const n = prizes.length, R = 150, C = 160, a = 360 / n;
  const pt = (deg, r) => { const t = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(t), C + r * Math.sin(t)]; };
  const slices = prizes.map((p, i) => {
    const [x1, y1] = pt(i * a, R), [x2, y2] = pt((i + 1) * a, R), [tx, ty] = pt(i * a + a / 2, R * 0.66);
    return `<path d="M${C},${C} L${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2} Z" fill="${esc(p.color)}" stroke="#2a0f48" stroke-width="3"/>
      <g transform="translate(${tx} ${ty}) rotate(${i * a + a / 2})"><text text-anchor="middle" y="-4" class="wh-t">${esc(p.label)}</text><text text-anchor="middle" y="16" class="wh-c">🪙</text></g>`;
  }).join('');
  const bulbs = Array.from({ length: 24 }, (_, i) => { const [x, y] = pt(i * 15, R + 8); return `<circle cx="${x}" cy="${y}" r="4" class="wh-b ${i % 2 ? 'o' : ''}"/>`; }).join('');
  return `<svg viewBox="-12 -12 344 344" class="wh-svg"><defs><radialGradient id="whg"><stop offset="0" stop-color="#ffffff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></radialGradient></defs>
    <circle cx="${C}" cy="${C}" r="${R + 14}" fill="#3a1466" stroke="#ffc83d" stroke-width="4"/>${bulbs}<g class="wh-rot">${slices}<circle cx="${C}" cy="${C}" r="${R}" fill="url(#whg)" pointer-events="none"/></g>
    <circle cx="${C}" cy="${C}" r="30" fill="#2a0f48" stroke="#ffc83d" stroke-width="4"/><text x="${C}" y="${C + 8}" text-anchor="middle" class="wh-mid">👑</text></svg>`;
}
const CSS = `.wh{padding:12px 14px 120px;color:#fff;text-align:center}.wh h1{font-size:24px;margin:6px 0 2px}.wh>p{opacity:.8;margin:0 0 10px;font-size:14px}
.wh-stage{position:relative;width:min(340px,88vw);margin:8px auto 14px}.wh-svg{width:100%;height:auto;display:block;filter:drop-shadow(0 10px 30px #7b3cff66)}
.wh-ptr{position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:30px solid #ffc83d;filter:drop-shadow(0 3px 4px #000a);z-index:2}
.wh-rot{transform-origin:160px 160px;transition:transform 4.6s cubic-bezier(.12,.7,.08,1)}.wh-t{fill:#fff;font-weight:900;font-size:17px;paint-order:stroke;stroke:#0006;stroke-width:3px}.wh-c{font-size:14px}.wh-mid{font-size:26px}
.wh-b{fill:#fff3b0;animation:whb 1s infinite}.wh-b.o{animation-delay:.5s}@keyframes whb{50%{fill:#ff8a2e}}
.wh-btns{display:flex;flex-direction:column;gap:10px;max-width:340px;margin:0 auto}.wh-btn{border:0;border-radius:18px;padding:14px;font:inherit;font-weight:900;font-size:17px;color:#fff;cursor:pointer;background:linear-gradient(90deg,#7b3cff,#b44dff);box-shadow:0 6px 18px #7b3cff66}
.wh-btn.gold{background:linear-gradient(90deg,#ffb020,#ffd76b);color:#3a1a00;box-shadow:0 6px 18px #ffb02066}.wh-btn:disabled{opacity:.45;cursor:default}.wh-btn small{display:block;font-size:12px;font-weight:700;opacity:.85;color:inherit!important}
.wh-bal{display:inline-flex;gap:6px;align-items:center;background:#ffffff10;border:1px solid #ffffff22;border-radius:99px;padding:5px 14px;font-weight:800;margin-bottom:6px}
.wh-res{margin:10px auto;max-width:340px;padding:12px;border-radius:16px;background:linear-gradient(160deg,#3a1468,#200b3a);border:1px solid #ffc83d88;font-size:18px;font-weight:900;animation:whp .5s}
@keyframes whp{from{transform:scale(.7);opacity:0}}.wh-err{color:#ffb3c0;font-weight:700;margin:8px 0}
.wh-feed{max-width:380px;margin:18px auto 0;text-align:right;background:#ffffff08;border:1px solid #9b5cff40;border-radius:18px;padding:10px 14px}.wh-feed h2{font-size:16px;margin:0 0 6px}
.wh-feed li{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ffffff10;font-size:14px}.wh-feed ul{list-style:none;margin:0;padding:0}.wh-feed li:last-child{border:0}.wh-feed b{color:#ffd76b}`;
export function mountWheel(root, { api }) {
  if (!document.querySelector('style[data-wh68]')) { const s = document.createElement('style'); s.dataset.wh68 = '1'; s.textContent = CSS; document.head.append(s); }
  const S = { d: null, err: '', busy: false, res: null, angle: 0 };
  const paint = () => {
    if (!root.isConnected) return;
    const d = S.d;
    if (!d) { root.innerHTML = `<div class="wh"><p>${esc(S.err || 'جاري التحميل…')}</p></div>`; return; }
    root.innerHTML = `<div class="wh" dir="rtl"><h1>🎡 عجلة الحظ</h1><p>لفة مجانية كل يوم، وتقدر تلف زيادة بالعملات.</p><span class="wh-bal">🪙 ${nf(d.coins)}</span>
      <div class="wh-stage"><span class="wh-ptr" aria-hidden="true"></span>${wheelSVG(d.prizes)}</div>
      ${S.res ? `<div class="wh-res" role="status">🎉 ربحت ${nf(S.res.coins)} عملة!</div>` : ''}${S.err ? `<p class="wh-err" role="alert">${esc(S.err)}</p>` : ''}
      <div class="wh-btns"><button class="wh-btn" type="button" data-wh="free" ${!d.freeLeft || S.busy ? 'disabled' : ''}>${d.freeLeft ? 'لف مجاناً' : 'لفتك المجانية خلصت اليوم'}<small>${d.freeLeft ? 'لفة وحدة كل يوم' : 'ترجع بكرة'}</small></button>
      <button class="wh-btn gold" type="button" data-wh="paid" ${!d.paidLeft || S.busy ? 'disabled' : ''}>لف بـ ${nf(d.cost)} عملة<small>باقي لك ${d.paidLeft} لفة اليوم</small></button></div>
      <section class="wh-feed"><h2>🏆 آخر الفائزين الكبار</h2>${d.feed.length ? `<ul>${d.feed.map((f) => `<li><span>${esc(f.name)}</span><b>+${nf(f.coins)} 🪙</b></li>`).join('')}</ul>` : '<p style="opacity:.7;font-size:13px">ما فيه فائزين كبار للحين، يمكن تكون أنت الأول!</p>'}</section></div>`;
    const rot = root.querySelector('.wh-rot'); if (rot) { rot.style.transition = 'none'; rot.style.transform = `rotate(${S.angle}deg)`; }
  };
  const load = async () => { try { S.d = await api('/api/wheel'); } catch (e) { S.err = e.message; } paint(); };
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-wh]'); if (!b || S.busy) return;
    S.busy = true; S.err = ''; S.res = null; paint();
    let r; try { r = await api('/api/wheel/spin', 'POST', { paid: b.dataset.wh === 'paid' }); } catch (er) { S.busy = false; S.err = er.message; paint(); return; }
    const n = S.d.prizes.length, a = 360 / n; const target = 360 - (r.index * a + a / 2) + (Math.random() - .5) * a * .6;
    const base = S.angle - (S.angle % 360); const next = base + 360 * 6 + target;
    const rot = root.querySelector('.wh-rot'); if (rot) { void rot.getBoundingClientRect(); rot.style.transition = ''; rot.style.transform = `rotate(${next}deg)`; }
    S.angle = next;
    await new Promise((ok) => setTimeout(ok, 4800));
    S.busy = false; S.res = r.prize; S.d = { ...S.d, ...r }; paint();
  });
  paint(); load();
  return { destroy() { root.innerHTML = ''; } };
}
