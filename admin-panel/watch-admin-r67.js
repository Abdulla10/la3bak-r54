// R67ae: لوحة الإدارة — الاقتصاد اليومي + سجل الهدايا + الكلمات الممنوعة (المالك فقط)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const short = (n) => { n = Number(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n); };
const dt = (ms) => { const d = new Date(Number(ms) + 4 * 3600_000); if (Number.isNaN(d.getTime())) return ''; const p = (n) => String(n).padStart(2, '0'); return `<span dir="ltr">${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}</span>`; };
const KIND = { start: 'رصيد البداية', daily: 'اليومية', entry_fee: 'رسوم دخول', prize: 'جوائز', refund: 'استرجاع', purchase: 'شراء', reward: 'مكافآت', admin: 'تعديل إداري', gift: 'هدايا', transfer: 'هدايا بين اللاعبين' };

export function mountWatchAdmin(root, { call }) {
  if (!document.querySelector('style[data-wa67]')) { const st = document.createElement('style'); st.dataset.wa67 = '1'; st.textContent = '[data-watch-admin]{min-width:0;max-width:100%;overflow-wrap:anywhere}.wa67-chart{width:100%;height:auto;display:block;margin:8px 0}.wa67-leg{display:flex;gap:14px;font-size:12px;color:#b9a8d0}.wa67-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-inline-end:5px}.wa67-row{display:grid;gap:3px;padding:9px 12px;border:1px solid #ffffff1a;border-radius:12px;background:#ffffff08;margin:6px 0;font-size:13px}.wa67-row small{color:#b9a8d0}.wa67-row.warn{border-color:#ff8a8a66;background:#ff5a5a12}.wa67-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.wa67-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#ffffff12;border:1px solid #ffffff22;font-size:13px}.wa67-chip button{background:none;border:0;color:#ff9a9a;font-size:15px;cursor:pointer;padding:0}.wa67-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.wa67-tabs .on{outline:2px solid #d8b56b}'; document.head.appendChild(st); }
  const S = { eco: null, gifts: null, words: null, q: '', gDays: 7, eDays: 14, err: '', msg: '', busy: false };
  const loadEco = async () => { try { S.eco = await call('economy-daily?days=' + S.eDays); } catch (e) { S.err = e.message; } };
  const loadGifts = async () => { try { S.gifts = await call(`gifts?days=${S.gDays}&q=${encodeURIComponent(S.q)}`); } catch (e) { S.err = e.message; } };
  const loadWords = async () => { try { S.words = await call('banned-words'); } catch (e) { S.err = e.message; } };
  const chart = (days) => {
    const W = 340, H = 150, P = 4, max = Math.max(1, ...days.map((d) => Math.max(d.in, d.out))); const bw = (W - P * 2) / days.length;
    const bars = days.map((d, i) => { const x = P + i * bw, hi = (d.in / max) * (H - 24), ho = (d.out / max) * (H - 24); return `<rect x="${x + 1}" y="${H - 14 - hi}" width="${bw / 2 - 1.5}" height="${hi}" rx="2" fill="#4ade80"><title>${d.day} دخل ${nf(d.in)}</title></rect><rect x="${x + bw / 2}" y="${H - 14 - ho}" width="${bw / 2 - 1.5}" height="${ho}" rx="2" fill="#f87171"><title>${d.day} طلع ${nf(d.out)}</title></rect>${i % Math.ceil(days.length / 7) === 0 ? `<text x="${x + bw / 2}" y="${H - 2}" font-size="9" fill="#b9a8d0" text-anchor="middle">${d.day.slice(5)}</text>` : ''}`; }).join('');
    return `<svg class="wa67-chart" dir="ltr" viewBox="0 0 ${W} ${H}" role="img" aria-label="العملات الداخلة والطالعة يوم بيوم"><text x="4" y="10" font-size="9" fill="#b9a8d0" text-anchor="start" direction="ltr">أعلى يوم: ${short(max)}</text>${bars}</svg>`;
  };
  function paint() {
    if (!root.isConnected) return;
    const e = S.eco, g = S.gifts, w = S.words;
    const tot = e ? e.days.reduce((a, d) => ({ in: a.in + d.in, out: a.out + d.out }), { in: 0, out: 0 }) : null;
    const kinds = e ? Object.entries(e.days.reduce((a, d) => { for (const [k, v] of Object.entries(d.kinds)) a[k] = (a[k] ?? 0) + v; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10) : [];
    root.innerHTML = `${S.err ? `<div class="ad-note bad" role="alert">${esc(S.err)}</div>` : ''}${S.msg ? `<div class="ad-note ok">${esc(S.msg)}</div>` : ''}
    <section class="ad-card"><h2>📊 الاقتصاد يوم بيوم</h2><div class="wa67-tabs">${[7, 14, 30].map((n) => `<button class="ad-btn ghost${S.eDays === n ? ' on' : ''}" data-wa="edays" data-n="${n}">${n} يوم</button>`).join('')}</div>
      ${e ? `<div class="ad-grid"><div class="ad-stat"><b>${short(tot.in)}</b><span>عملات دخلت</span></div><div class="ad-stat"><b>${short(tot.out)}</b><span>عملات طلعت</span></div><div class="ad-stat"><b>${short(e.balances)}</b><span>أرصدة اللاعبين الحين</span></div><div class="ad-stat"><b>${short(e.house.coins + e.house.gems * 20)}</b><span>حصة الموقع من الهدايا</span></div></div>
      ${chart(e.days)}<div class="wa67-leg"><span><i style="background:#4ade80"></i>دخلت لحسابات اللاعبين</span><span><i style="background:#f87171"></i>طلعت منها</span></div>
      <h3>من وين؟</h3>${kinds.map(([k, v]) => `<div class="wa67-row"><b>${k[0] === '+' ? '⬆️' : '⬇️'} ${esc(KIND[k.slice(1)] ?? k.slice(1))}</b><small>${nf(v)} عملة</small></div>`).join('') || '<p class="ad-empty">ما فيه حركة.</p>'}
      <h3>أكثر اللاعبين صرفًا</h3>${e.topSpenders.map((s, i) => `<div class="wa67-row"><b>${i + 1}. ${esc(s.name)}</b><small>${nf(s.spent)} عملة</small></div>`).join('') || '<p class="ad-empty">ما فيه.</p>'}
      <h3>أكثر الهدايا مبيعًا</h3>${e.topGifts.map((x) => `<div class="wa67-row"><b>${esc(x.icon)} ${esc(x.name)}</b><small>${nf(x.count)} مرة · ${nf(x.value)} عملة</small></div>`).join('') || '<p class="ad-empty">ما فيه.</p>'}
      <p class="ad-muted">الأرقام من سجلات الحسابات المحفوظة بالخادم، والجواهر القديمة محسوبة ×20 عملة.</p>` : '<p class="ad-muted">جاري التحميل…</p>'}</section>
    <section class="ad-card"><h2>🎁 سجل الهدايا</h2>
      <form data-waf="gq" class="ad-form"><input class="ad-in" name="q" value="${esc(S.q)}" placeholder="بحث باسم المرسل أو المستلم أو الهدية"><select class="ad-in" name="days">${[1, 7, 30, 90].map((n) => `<option value="${n}"${S.gDays === n ? ' selected' : ''}>آخر ${n === 1 ? 'يوم' : n + ' يوم'}</option>`).join('')}</select><button class="ad-btn" type="submit">بحث</button></form>
      ${g ? `<p class="ad-sub">${nf(g.total)} هدية · ${nf(g.value)} عملة</p>
      <h3>⚠️ أكثر الأزواج تحويلًا</h3><p class="ad-muted">نفس الشخص يرسل لنفس الشخص كثير. مو شرط غش، بس يستاهل نظرة.</p>
      ${g.pairs.map((p) => `<div class="wa67-row${p.count >= 10 || p.value >= 1_000_000 ? ' warn' : ''}"><b>${esc(p.from)} ← ${esc(p.to)}</b><small>${nf(p.count)} هدية · ${nf(p.value)} عملة</small></div>`).join('') || '<p class="ad-empty">ما فيه.</p>'}
      <h3>آخر الهدايا</h3>${g.list.map((x) => `<div class="wa67-row"><b>${esc(x.icon)} ${esc(x.gift)}${x.qty > 1 ? ' ×' + nf(x.qty) : ''} · ${nf(x.value)} عملة</b><small>${esc(x.from)} ← ${esc(x.to)} · ${dt(x.ts)}${x.room ? ' · بغرفة' : ''}</small></div>`).join('') || '<p class="ad-empty">ما فيه هدايا.</p>'}` : '<p class="ad-muted">جاري التحميل…</p>'}</section>
    <section class="ad-card"><h2>🚫 الكلمات الممنوعة</h2><p class="ad-muted">فوق القائمة الأساسية الثابتة. بالدردشة تنخفى بنجوم، وبالمنشورات والتعليقات وأسماء الغرف والملفات تنرفض.</p>
      ${w ? `<div class="wa67-chips">${w.words.map((x) => `<span class="wa67-chip">${esc(x)}<button type="button" data-wa="rm" data-w="${esc(x)}" aria-label="حذف ${esc(x)}">×</button></span>`).join('') || '<p class="ad-empty">ما أضفت كلمات للحين.</p>'}</div>
      <form data-waf="add" class="ad-form col"><input class="ad-in" name="words" placeholder="كلمة أو أكثر، افصل بينها بفاصلة" maxlength="400" required><input class="ad-in" name="reason" placeholder="السبب (إلزامي)" maxlength="200" required minlength="3"><button class="ad-btn" type="submit">إضافة</button></form>
      <p class="ad-muted">${nf(w.words.length)} من ${nf(w.max)}</p>` : '<p class="ad-muted">جاري التحميل…</p>'}</section>`;
  }
  const run = async (fn, ok) => { if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; try { const j = await fn(); S.msg = ok + (j?.auditOk === false ? ' (تنبيه: ما انسجل بالتدقيق)' : ''); } catch (e) { S.err = e.message || 'فشل الطلب.'; } finally { S.busy = false; paint(); } };
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-wa]'); if (!b) return;
    if (b.dataset.wa === 'edays') { S.eDays = Number(b.dataset.n); S.eco = null; paint(); await loadEco(); paint(); }
    if (b.dataset.wa === 'rm') { const r = window.prompt(`حذف «${b.dataset.w}» من الممنوعة؟\n\nاكتب السبب (إلزامي):`); if (r && r.trim().length >= 3) run(async () => { const j = await call('banned-words', { method: 'POST', body: { remove: [b.dataset.w], reason: r.trim() } }); S.words = { ...S.words, words: j.words }; return j; }, 'انحذفت الكلمة.'); }
  });
  root.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-waf]'); if (!f) return; e.preventDefault();
    if (f.dataset.waf === 'gq') { S.q = f.querySelector('[name=q]').value; S.gDays = Number(f.querySelector('[name=days]').value); S.gifts = null; paint(); await loadGifts(); paint(); return; }
    const words = f.querySelector('[name=words]').value.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean), reason = f.querySelector('[name=reason]').value.trim();
    run(async () => { const j = await call('banned-words', { method: 'POST', body: { add: words, reason } }); S.words = { ...S.words, words: j.words }; return j; }, 'انضافت الكلمات.');
  });
  paint(); Promise.all([loadEco(), loadGifts(), loadWords()]).then(paint);
  return { dispose() {} };
}
