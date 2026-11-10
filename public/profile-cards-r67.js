/* R67: بطاقتين بملفك — «بطاقتي» (البيانات الشخصية + مشاركة كصورة) و«مملكتي» (غرفتك الأعلى دعم).
 * [data-idcard-me] و[data-kingdom-me] بالملف. البيانات من الخادم بس، ونخزنها 30 ثانية عشان إعادة رسم الملف ما تعيد الطلب. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => (Number.isSafeInteger(n) ? n.toLocaleString('en-US') : '0');
const safeImg = (u) => typeof u === 'string' && /^\/(api|assets|preview)\/[A-Za-z0-9_./?=&%-]+$/.test(u) ? u : '';
const flag = (cc) => /^[A-Z]{2}$/.test(cc || '') ? String.fromCodePoint(...[...cc].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : '';
const country = (cc) => { try { return cc ? new Intl.DisplayNames(['ar'], { type: 'region' }).of(cc) : ''; } catch { return ''; } };
const vipSrc = (n) => `/preview/assets/profile/ranks/r65/vip-v${n}.webp?v=r65a`;
const nobleSrc = (n) => `/preview/assets/profile/ranks/r65/noble-n${n}.webp?v=r65a`;
const get = (u) => fetch(u, { credentials: 'same-origin', cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
let cache = null, cacheAt = 0, inflight = null;
async function load(force = false) {
  if (!force && cache && Date.now() - cacheAt < 30000) return cache;
  if (inflight) return inflight;
  inflight = Promise.all([get('/api/account'), get('/api/profile-cards/me')]).then(([acc, pc]) => { inflight = null; if (!acc || !pc?.ok) return null; cache = { acc, pc }; cacheAt = Date.now(); return cache; });
  return inflight;
}
const days = (since) => Number.isFinite(since) ? Math.max(1, Math.floor((Date.now() - since) / 86400000) + 1) : null;
const face = (me) => safeImg(me?.avatar) ? `<img src="${esc(me.avatar)}" alt="" decoding="async">` : `<b>${esc([...String(me?.name || 'ل')][0])}</b>`;

function idCardHTML({ acc, pc }) {
  const me = pc.me || { name: acc.name }, r = pc.ranks || {}, d = days(acc.since), cc = acc.country || '';
  const badges = `${r.noble ? `<img src="${nobleSrc(r.noble)}" alt="نوبل ${r.noble}">` : ''}${r.vip ? `<img src="${vipSrc(r.vip)}" alt="VIP ${r.vip}">` : ''}`;
  const stat = (v, l) => `<span><b dir="ltr">${v}</b><small>${l}</small></span>`;
  return `<section class="idc67" dir="rtl" aria-label="بطاقتي">
  <header class="idc67-top"><span class="idc67-face">${face(me)}</span><div class="idc67-who"><h3>${esc(me.name || acc.name)}</h3><p><span dir="ltr">${/^[1-9]\d{2}$/.test(String(acc.displayPlayerId || '')) ? `<span class="aid68 sm"><b>${esc(acc.displayPlayerId)}</b><span class="aid68-tag">ADMIN</span><i aria-hidden="true">👑</i></span>` : `ID: ${esc(acc.displayPlayerId || acc.playerId || '')}`}</span>${cc ? ` · ${flag(cc)} ${esc(country(cc))}` : ''}</p><p class="idc67-lv"><i>Lv ${esc(acc.level || 1)}</i>${badges}</p></div></header>
  <div class="idc67-stats">${stat(d ? nf(d) : '—', 'يوم معانا')}${stat(nf(pc.gifts?.sent ?? 0), 'هدية أرسلتها')}${stat(nf(pc.gifts?.recv ?? 0), 'هدية وصلتني')}${stat(nf(pc.friends ?? 0), 'صديق')}</div>
  <div class="idc67-tags">${pc.cp ? `<span>💞 CP: ${esc(pc.cp)}</span>` : ''}${pc.tribe ? `<span>🛡️ ${esc(pc.tribe)}</span>` : ''}</div>
  <button type="button" class="idc67-share" data-idc67-share>مشاركة البطاقة</button></section>`;
}
function kingdomHTML({ pc }) {
  const k = pc.kingdom;
  if (!k) return `<section class="kd67 is-empty" dir="rtl" aria-label="مملكتي"><h3>👑 مملكتي</h3><p>ما عندك غرفة للحين. افتح غرفتك وخلها مملكتك.</p><a class="kd67-go" href="#/social-rooms">افتح مملكتك</a></section>`;
  const cover = safeImg(k.photo) ? `<img src="${esc(k.photo)}" alt="" decoding="async">` : `<b>${esc([...String(k.name || 'م')][0])}</b>`;
  const top = (k.top || []).map((p, i) => `<li><span class="kd67-face">${face(p)}</span><i>${['🥇', '🥈', '🥉'][i]}</i><small>${esc(p.name || '')}</small></li>`).join('');
  return `<section class="kd67" dir="rtl" aria-label="مملكتي"><h3>👑 مملكتي</h3>
  <div class="kd67-row"><span class="kd67-cover">${cover}</span><div class="kd67-info"><b>${esc(k.name)}</b><p><span dir="ltr">ID: ${esc(k.code)}</span> · Lv ${esc(k.level)}${k.tierName ? ` · ${esc(k.tierName)}` : ''}</p><p>👥 ${nf(k.members)} عضو · دعم الشهر <b dir="ltr">${nf(k.monthPts)}</b></p></div></div>
  ${top ? `<p class="kd67-sub">أكثر الداعمين هالشهر</p><ol class="kd67-top">${top}</ol>` : '<p class="kd67-sub">ما في داعمين هالشهر للحين.</p>'}
  <a class="kd67-go" href="#/social-room/${encodeURIComponent(k.id)}">ادخل المملكة</a></section>`;
}

/* المشاركة: نرسم البطاقة على canvas ونشاركها صورة (أو ننزلها لو الجهاز ما يدعم المشاركة) */
async function shareCard(btn) {
  const data = cache || await load(); if (!data) return;
  const { acc, pc } = data, me = pc.me || {}, r = pc.ranks || {};
  btn.disabled = true; const old = btn.textContent; btn.textContent = 'جاري التجهيز…';
  try {
    await document.fonts?.ready;
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2A0E45'); bg.addColorStop(.55, '#1C0A30'); bg.addColorStop(1, '#0D0614'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#E0A526'; g.lineWidth = 10; g.strokeRect(30, 30, W - 60, H - 60); g.strokeStyle = '#A63DFF88'; g.lineWidth = 3; g.strokeRect(52, 52, W - 104, H - 104);
    const img = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    const [av, vb, nb] = await Promise.all([img(safeImg(me.avatar)), img(r.vip ? vipSrc(r.vip) : ''), img(r.noble ? nobleSrc(r.noble) : '')]);
    const cx = W / 2, cy = 300, R = 150;
    g.save(); g.beginPath(); g.arc(cx, cy, R + 14, 0, Math.PI * 2); g.fillStyle = '#E0A526'; g.shadowColor = '#E0A526'; g.shadowBlur = 40; g.fill(); g.restore();
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip(); g.fillStyle = '#A63DFF'; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    if (av) g.drawImage(av, cx - R, cy - R, R * 2, R * 2); else { g.fillStyle = '#FFD66B'; g.font = '900 140px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText([...String(me.name || acc.name || 'ل')][0], cx, cy + 6); }
    g.restore();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.direction = 'rtl';
    g.fillStyle = '#F5E9FF'; g.font = '800 72px system-ui,sans-serif'; g.fillText(String(me.name || acc.name || ''), cx, 560);
    g.fillStyle = '#CDB8E6'; g.font = '500 40px system-ui,sans-serif'; g.fillText(`ID: ${acc.displayPlayerId || acc.playerId || ''}${acc.country ? '  ' + flag(acc.country) : ''}`, cx, 625);
    let bx = cx - ((vb ? 1 : 0) + (nb ? 1 : 0) + 1) * 80;
    g.fillStyle = '#E0A526'; g.beginPath(); g.roundRect(bx, 670, 150, 70, 35); g.fill(); g.fillStyle = '#1C0A30'; g.font = '900 38px system-ui,sans-serif'; g.fillText(`Lv ${acc.level || 1}`, bx + 75, 718); bx += 170;
    for (const b of [nb, vb]) if (b) { g.drawImage(b, bx, 650, 110, 110); bx += 150; }
    const stats = [[days(acc.since) ?? 0, 'يوم معانا'], [pc.gifts?.sent ?? 0, 'هدية أرسلتها'], [pc.gifts?.recv ?? 0, 'هدية وصلتني'], [pc.friends ?? 0, 'صديق']];
    stats.forEach(([v, l], i) => { const x = W - 190 - i * 233, y = 830; g.fillStyle = '#ffffff12'; g.beginPath(); g.roundRect(x - 100, y, 200, 170, 24); g.fill(); g.fillStyle = '#FFD66B'; g.font = '900 56px system-ui,sans-serif'; g.fillText(nf(v), x, y + 82); g.fillStyle = '#CDB8E6'; g.font = '500 30px system-ui,sans-serif'; g.fillText(l, x, y + 132); });
    g.fillStyle = '#F5E9FF'; g.font = '600 40px system-ui,sans-serif';
    const tags = [pc.cp ? `💞 CP: ${pc.cp}` : '', pc.tribe ? `🛡️ ${pc.tribe}` : ''].filter(Boolean).join('   ·   '); if (tags) g.fillText(tags, cx, 1100);
    g.fillStyle = '#E0A526'; g.font = '900 50px system-ui,sans-serif'; g.fillText('LA3BAK | لعبك', cx, 1230); g.fillStyle = '#CDB8E6'; g.font = '500 30px system-ui,sans-serif'; g.fillText('la3bak.com', cx, 1275);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
    const file = new File([blob], 'la3bak-card.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'بطاقتي في لعبك' }).catch(() => {}); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'la3bak-card.png'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  } finally { btn.disabled = false; btn.textContent = old; }
}

function fill() {
  const id = [...document.querySelectorAll('[data-idcard-me]:not([data-pc67])')], kd = [...document.querySelectorAll('[data-kingdom-me]:not([data-pc67])')];
  if (!id.length && !kd.length) return;
  for (const el of [...id, ...kd]) { el.dataset.pc67 = '1'; if (cache) el.innerHTML = el.hasAttribute('data-idcard-me') ? idCardHTML(cache) : kingdomHTML(cache); }
  load().then((d) => { if (!d) return; for (const el of [...id, ...kd]) if (el.isConnected) el.innerHTML = el.hasAttribute('data-idcard-me') ? idCardHTML(d) : kingdomHTML(d); });
}
if (typeof document !== 'undefined' && !globalThis.__LA3BAK_PC67__) {
  globalThis.__LA3BAK_PC67__ = true;
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; fill(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-idc67-share]'); if (b) { e.preventDefault(); shareCard(b); } }, true);
  addEventListener('la3bak:cp', () => { cache = null; });
  fill();
}
