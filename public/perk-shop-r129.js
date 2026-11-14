/* R129: متجر المميزات — مميزات قوية تنشرى بدل الهدايا (رفع الغرفة، مين زار ملفي، التخفي، مضاعف الليفل، اسم متحرك، المقعد الذهبي) */
const COIN = '<img src="/coin-r128.svg?v=r128h" width="18" height="18" alt="" aria-hidden="true" style="display:inline-block;vertical-align:-4px">';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const left = (until) => { const ms = until - Date.now(); if (ms <= 0) return ''; const h = Math.ceil(ms / 3600_000); return h < 48 ? `باقي ${h} ساعة` : `باقي ${Math.ceil(h / 24)} يوم`; };
const dur = (d) => (d === 1 ? '24 ساعة' : d === 7 ? 'أسبوع' : d === 30 ? 'شهر' : `${d} يوم`);
const api = async (u, body) => { const r = await fetch(u, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) }); const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw Object.assign(new Error(j.error || 'تعذّر الطلب.'), { status: r.status }); return j; };
const CSS = `.ps129{position:fixed;inset:0;z-index:9000;background:rgba(5,3,15,.62);display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px)}
.ps129 .sh{width:min(520px,100%);max-height:90vh;overflow:auto;background:linear-gradient(180deg,#24124a,#120b24);color:#f4efff;border-radius:22px 22px 0 0;padding:16px 14px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.5);direction:rtl}
.ps129 h2{margin:2px 0 4px;font-size:19px;text-align:center}.ps129 .sub{margin:0 0 10px;text-align:center;color:#c4b5fd;font-size:13px}
.ps129 .x{position:absolute;margin-top:-4px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:16px}
.ps129 .bal{display:flex;justify-content:center;gap:16px;margin:4px 0 12px;font-size:13px;color:#c4b5fd}.ps129 .bal b{color:#fff;font-size:15px}
.ps129 .c{display:flex;gap:12px;align-items:center;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));border:1px solid rgba(250,204,21,.22);border-radius:18px;padding:12px;margin:9px 0}
.ps129 .c.on{border-color:rgba(74,222,128,.55);box-shadow:0 0 0 1px rgba(74,222,128,.2) inset}
.ps129 .ic{flex:none;width:50px;height:50px;border-radius:15px;display:grid;place-items:center;font-size:27px;background:radial-gradient(circle at 35% 30%,rgba(253,230,138,.35),rgba(168,85,247,.25));border:1px solid rgba(253,230,138,.35)}
.ps129 .t{flex:1;min-width:0}.ps129 .t b{display:block;font-size:15px}.ps129 .t p{margin:2px 0 4px;font-size:12.5px;color:#cbbcf0;line-height:1.55}.ps129 .t small{font-size:12px;color:#fde68a;font-weight:700}
.ps129 .t .act{color:#4ade80}
.ps129 .buy{flex:none;border:0;border-radius:14px;padding:10px 12px;min-width:84px;font:inherit;font-weight:800;font-size:13px;color:#2a1650;background:linear-gradient(180deg,#fde68a,#e5a91c);display:flex;flex-direction:column;align-items:center;gap:2px}
.ps129 .buy span{display:inline-flex;align-items:center;gap:3px;font-size:12px}.ps129 .buy[disabled]{opacity:.55}
.ps129 select{width:100%;margin-top:6px;background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:7px;font:inherit;font-size:13px;color-scheme:dark}
.ps129 .msg{position:sticky;top:0;z-index:2;margin:0 0 8px;padding:9px 12px;border-radius:12px;font-size:13px;font-weight:700;text-align:center}.ps129 .msg.ok{background:rgba(34,197,94,.18);color:#bbf7d0}.ps129 .msg.bad{background:rgba(239,68,68,.18);color:#fecaca}
.ps129 .msg button{margin-inline-start:8px;border:0;border-radius:10px;padding:4px 10px;font:inherit;font-weight:800;background:#fde68a;color:#2a1650}
.ps129 h3{margin:16px 2px 4px;font-size:14px;color:#c4b5fd}`;
const style = () => { if (!document.querySelector('style[data-ps129]')) { const s = document.createElement('style'); s.dataset.ps129 = '1'; s.textContent = CSS; document.head.append(s); } };

export async function openPerkShop() {
  style(); document.querySelector('.ps129')?.remove();
  const root = document.createElement('div'); root.className = 'ps129'; root.innerHTML = '<section class="sh" role="dialog" aria-label="المميزات"><p class="sub">جاري التحميل…</p></section>'; document.body.append(root);
  const sh = root.querySelector('.sh'); let d = null, busy = '', msg = null;
  const close = () => root.remove();
  setTimeout(() => { addEventListener('hashchange', close, { once: true }); addEventListener('popstate', close, { once: true }); }, 500); /* R134: الرجوع لنفس الصفحة ما يطلق hashchange */
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  const paint = () => {
    const card = (p) => { const on = p.key === 'boost' ? (d.rooms || []).some((r) => r.promoted > Date.now()) : p.until > Date.now(); const pr = p.key === 'boost' ? (d.rooms || []).find((r) => r.promoted > Date.now()) : null;
      const status = p.key === 'boost' ? (pr ? `<small class="act">✅ «${esc(pr.name)}» مرفوعة · ${left(pr.promoted)}</small>` : '') : (on ? `<small class="act">✅ مفعّلة · ${left(p.until)}</small>` : '');
      const rooms = p.key === 'boost' ? ((d.rooms || []).length ? `<select data-room aria-label="اختر الغرفة">${d.rooms.map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select>` : '<small style="color:#fca5a5">لازم يكون عندك غرفة.</small>') : '';
      const dis = busy || (p.key === 'boost' && !(d.rooms || []).length);
      return `<div class="c${on ? ' on' : ''}"><span class="ic" aria-hidden="true">${p.icon}</span><div class="t"><b>${esc(p.name)}</b><p>${esc(p.desc)}</p><small>${dur(p.days)}</small> ${status}${rooms}</div><button type="button" class="buy" data-buy="${p.key}"${dis ? ' disabled' : ''}>${busy === p.key ? '…' : on ? 'تمديد' : 'اشترِ'}<span>${nf(p.price)}${COIN}</span></button></div>`; };
    sh.innerHTML = `<button type="button" class="x" data-x aria-label="إغلاق">✕</button><h2>✨ المميزات</h2><p class="sub">مميزات قوية تستفيد منها بنفسك${d.paidOnly ? ' — تنشرى بالعملات المشحونة 💳' : ''}</p>
      <div class="bal"><span>رصيدك <b>${nf(d.coins)}</b> ${COIN}</span>${d.paidOnly ? `<span>مشحونة <b>${nf(d.paid)}</b> 💳</span>` : ''}</div>
      ${msg ? `<div class="msg ${msg.ok ? 'ok' : 'bad'}" role="status">${esc(msg.t)}${msg.recharge ? '<button type="button" data-rc>اشحن</button>' : ''}</div>` : ''}
      ${d.passes.map(card).join('')}
      <h3>موجودة عندك بالموقع</h3>
      <div class="c"><span class="ic" aria-hidden="true">📢</span><div class="t"><b>برقية عالمية</b><p>رسالتك تطلع شريط فوق الشاشة عند كل اللي بالموقع (عادية، ذهبية، أو شاشة كاملة).</p></div><button type="button" class="buy" data-bc${d.broadcast ? '' : ' disabled'}>${d.broadcast ? 'أرسل' : 'موقفة'}</button></div>
      <div class="c"><span class="ic" aria-hidden="true">🔒</span><div class="t"><b>غرفة بكلمة سر</b><p>مجانية: لما تنشئ غرفة اختر «خاصة» وحط كلمة مرور، ومحد يدخل إلا اللي معه الرمز.</p></div></div>`;
  };
  const load = async () => { try { d = await api('/api/perk-shop'); paint(); } catch (e) { sh.innerHTML = `<button type="button" class="x" data-x>✕</button><p class="sub">${esc(e.message)}</p>`; } };
  sh.addEventListener('click', async (e) => {
    if (e.target.closest('[data-x]')) { close(); return; }
    if (e.target.closest('[data-rc]')) { close(); import('/recharge-r123.js?v=r134').then((m) => m.openRecharge()).catch(() => {}); return; }
    if (e.target.closest('[data-bc]')) { close(); import('/broadcast-r67.js?v=r67ao').then((m) => m.openComposer?.()).catch(() => {}); return; }
    const b = e.target.closest('[data-buy]'); if (!b || busy) return;
    const p = d.passes.find((x) => x.key === b.dataset.buy); if (!p) return;
    const room = p.key === 'boost' ? b.closest('.c')?.querySelector('[data-room]')?.value : undefined;
    if (!confirm(`تشتري «${p.name}» (${dur(p.days)}) بـ ${nf(p.price)} عملة؟`)) return;
    busy = p.key; paint();
    try { d = await api('/api/perk-shop/buy', { pass: p.key, room, key: crypto.randomUUID() }); msg = { ok: true, t: `تم ✅ ${p.icon} ${p.name} صارت شغّالة!` }; }
    catch (er) { msg = { ok: false, t: er.message, recharge: er.status === 402 || /رصيدك|مشحونة/.test(er.message) }; }
    busy = ''; paint(); sh.scrollTop = 0;
  });
  await load();
}
