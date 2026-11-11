// R68z: عارض إعادة المباراة (للإدارة). اللقطات من الخادم، والرسم بنفس واجهة اللعبة لكن بدون أي تفاعل.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CSS = `.rp68-ov{position:fixed;inset:0;z-index:200;background:#0b0418f2;display:flex;flex-direction:column;color:#fff;direction:rtl}
.rp68-top{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #9b5cff44;background:#1a0a30}.rp68-top b{flex:1;font-size:16px}.rp68-top small{opacity:.75}
.rp68-x{border:0;background:#ffffff14;color:#fff;border-radius:12px;width:40px;height:40px;font-size:18px;cursor:pointer}
.rp68-stage{flex:1;overflow:auto;padding:12px;position:relative;transform:translateZ(0);contain:paint;isolation:isolate}.rp68-stage>div{pointer-events:none;user-select:none;max-width:560px;margin:0 auto}
.rp68-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px 16px;border-top:1px solid #9b5cff44;background:#1a0a30}
.rp68-ctl button{border:1px solid #9b5cff77;background:#2a1048;color:#fff;border-radius:12px;min-width:44px;height:42px;font-size:16px;cursor:pointer}.rp68-ctl button.on{background:#7b3cff}
.rp68-ctl input[type=range]{flex:1;min-width:140px;accent-color:#ffc83d}.rp68-ctl span{font-size:13px;min-width:90px;text-align:center}`;
export function openReplay(rep) {
  if (!document.querySelector('style[data-rp68]')) { const s = document.createElement('style'); s.dataset.rp68 = '1'; s.textContent = CSS; document.head.append(s); }
  const draw = globalThis.__LA3BAK_GAMEHTML__;
  const ov = document.createElement('div'); ov.className = 'rp68-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'إعادة المباراة');
  let i = 0, playing = false, speed = 1, timer = 0;
  const frames = rep.list || [];
  const who = (rep.players || []).map((p) => p.name).join('، ');
  const time = (t) => new Date(t).toLocaleTimeString('ar-AE-u-nu-latn', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  ov.innerHTML = `<div class="rp68-top"><b>🎬 إعادة ${esc(rep.gameName || rep.game)}<br><small>${esc(who)} · من عين: ${esc((rep.players || []).find((p) => p.id === rep.viewer)?.name || '')}</small></b><button class="rp68-x" type="button" data-rp="x" aria-label="إغلاق">✕</button></div>
    <div class="rp68-stage" inert><div data-rp-stage></div></div>
    <div class="rp68-ctl"><button type="button" data-rp="first" aria-label="البداية">⏮</button><button type="button" data-rp="prev" aria-label="السابق">◀</button><button type="button" data-rp="play" aria-label="تشغيل">▶</button><button type="button" data-rp="next" aria-label="التالي">▶▶</button><button type="button" data-rp="speed">1×</button>
    <input type="range" min="0" max="${Math.max(0, frames.length - 1)}" value="0" data-rp-range aria-label="الحركة"><span data-rp-pos></span></div>`;
  document.body.append(ov);
  const stage = ov.querySelector('[data-rp-stage]'), range = ov.querySelector('[data-rp-range]'), pos = ov.querySelector('[data-rp-pos]'), playBtn = ov.querySelector('[data-rp="play"]');
  const show = () => {
    const f = frames[i]; if (!f) { stage.innerHTML = '<p>ما فيه لقطات.</p>'; return; }
    try { stage.innerHTML = typeof draw === 'function' ? draw(f.s) : `<pre>${esc(JSON.stringify(f.s).slice(0, 2000))}</pre>`; } catch { stage.innerHTML = '<p>تعذّر رسم هاللقطة.</p>'; }
    range.value = String(i); pos.textContent = `${i + 1} / ${frames.length} · ${time(f.t)}`;
  };
  const stop = () => { playing = false; clearInterval(timer); playBtn.textContent = '▶'; };
  const play = () => { playing = true; playBtn.textContent = '⏸'; clearInterval(timer); timer = setInterval(() => { if (i >= frames.length - 1) return stop(); i++; show(); }, 900 / speed); };
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rp]'); if (!b) return; const a = b.dataset.rp;
    if (a === 'x') { stop(); ov.remove(); return; }
    if (a === 'first') { stop(); i = 0; show(); }
    if (a === 'prev') { stop(); i = Math.max(0, i - 1); show(); }
    if (a === 'next') { stop(); i = Math.min(frames.length - 1, i + 1); show(); }
    if (a === 'play') { playing ? stop() : (i >= frames.length - 1 && (i = 0), play()); }
    if (a === 'speed') { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; b.textContent = speed + '×'; if (playing) play(); }
  });
  range.addEventListener('input', () => { stop(); i = Number(range.value); show(); });
  show();
}
