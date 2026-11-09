// R67ae: لوحة الإدارة — إعدادات التشغيل + الغرف (مستوى/خلفية/يوتيوب) + المنشورات (المالك فقط)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const dt = (ms) => { try { return new Date(ms).toLocaleString('ar-AE', { dateStyle: 'short', timeStyle: 'short' }); } catch { return ''; } };
const key = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const THEME = { royal: 'الافتراضية' };

export function mountSiteAdmin(root, { call }) {
  if (!document.querySelector('style[data-sa67]')) { const st = document.createElement('style'); st.dataset.sa67 = '1'; st.textContent = '[data-site-admin]{min-width:0;max-width:100%;overflow-wrap:anywhere}.sa67-tog{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #ffffff14}.sa67-tog small{display:block;color:#b9a8d0}.sa67-tog input[type=checkbox]{width:22px;height:22px}.sa67-tog input[type=number]{max-width:140px}.sa67-row{display:grid;gap:4px;padding:10px 12px;border:1px solid #ffffff1a;border-radius:12px;background:#ffffff08;margin:8px 0;font-size:13px}.sa67-row b{color:#f3e6ff}.sa67-row small{color:#b9a8d0}.sa67-acts{display:flex;flex-wrap:wrap;gap:6px}.sa67-post img{max-width:120px;border-radius:8px}.ad-btn.danger{background:#7a1f2b;color:#fff}'; document.head.appendChild(st); }
  const S = { flags: null, meta: null, envTopup: 100, rooms: null, posts: null, counts: null, bcs: null, q: '', err: '', msg: '', busy: false };
  const loadAll = async () => {
    try { const f = await call('site-flags'); S.flags = f.flags; S.meta = f.meta; S.envTopup = f.envFirstTopup; } catch (e) { S.err = e.message; }
    try { const s = await call('social'); S.rooms = s.rooms || []; } catch (e) { S.rooms = []; }
    try { S.bcs = (await call('broadcasts')).list; } catch { S.bcs = []; }
    await loadPosts();
  };
  const loadPosts = async () => { try { const p = await call('posts?q=' + encodeURIComponent(S.q)); S.posts = p.posts; S.counts = p.counts; } catch (e) { S.err = e.message; } paint(); };
  const tog = (k, label, sub) => `<label class="sa67-tog"><span>${label}<small>${sub}</small></span><input type="checkbox" name="${k}" ${S.flags[k] ? 'checked' : ''}></label>`;
  const numIn = (k, label, sub, min, max) => `<label class="sa67-tog"><span>${label}<small>${sub}</small></span><input class="ad-in" type="number" name="${k}" min="${min}" max="${max}" step="1" value="${S.flags[k]}" inputmode="numeric"></label>`;
  function paint() {
    if (!root.isConnected) return;
    if (!S.flags) { root.innerHTML = S.err ? `<div class="ad-note bad">${esc(S.err)}</div>` : '<p class="ad-muted">جاري التحميل…</p>'; return; }
    const rooms = S.rooms || [];
    root.innerHTML = `${S.err ? `<div class="ad-note bad" role="alert">${esc(S.err)}</div>` : ''}${S.msg ? `<div class="ad-note ok">${esc(S.msg)}</div>` : ''}
      <section class="ad-card"><h2>⚙️ إعدادات التشغيل</h2><p class="ad-muted">تتغير فورًا بدون إعادة تشغيل الخادم، وكل تغيير ينسجل بسجل العمليات.${S.meta?.at ? ` آخر تعديل: ${esc(S.meta.by)} · ${dt(S.meta.at)}` : ''}</p>
      <form data-saf="flags" class="ad-form col">
        ${tog('cinema', '🎬 وضع اليوتيوب بالغرف', 'لو طفيته، ما أحد يقدر يشغّل فيديو جديد (اللي شغال يكمل لين يطفونه)')}
        ${tog('broadcast', '📢 البرقية العالمية', 'لو طفيتها، ما أحد يقدر يرسل برقية جديدة')}
        ${tog('streak', '📅 هدية الدخول اليومي المتتالي', 'العملات الزيادة على المكافأة اليومية حسب أيام السلسلة')}
        ${tog('invite', '🤝 مكافآت الدعوات', 'المكافأة لما صديقك المدعو يلعب')}
        ${numIn('firstTopupPercent', '💳 هدية أول شحن (%)', `0 = مطفية · -1 = إعداد الخادم (${nf(S.envTopup)}%) · أقصى شي 200`, -1, 200)}
        ${numIn('bigGiftMin', '🎁 الهدية الكبيرة بالشاشة الكاملة', 'أقل قيمة بالعملات', 1000, 10000000)}
        ${numIn('profileBgVip', '🖼️ خلفية الملف الكاملة من VIP', 'غير الخلفيات الأسطورية والفخمة جدًا (تطلع كاملة دايمًا)', 1, 15)}
        <input class="ad-in" name="reason" placeholder="سبب التعديل (إلزامي)" maxlength="200" required minlength="3">
        <button class="ad-btn" type="submit">حفظ الإعدادات</button></form></section>
      <section class="ad-card"><h2>📢 البرقيات (${nf((S.bcs || []).length)})</h2><p class="ad-muted">أسعارها تتعدل من «أرقام الجوائز والمستويات». الإخفاء يشيلها من شاشات الكل فورًا، والعملات ما ترجع.</p>
        ${(S.bcs || []).length ? S.bcs.slice(0, 40).map((b) => `<div class="sa67-row"><b>${esc(b.name)} · ${b.tier === 'full' ? '🎆 شاشة كاملة' : b.tier === 'gold' ? '👑 ذهبية' : '📢 عادية'} · ${nf(b.price)} عملة</b><small>${dt(b.at)}${b.hidden ? ` · مخفية (${esc(b.hiddenBy || '')})` : ''}</small><div>${esc(b.text)}</div>${b.hidden ? '' : `<div class="sa67-acts"><button class="ad-btn danger" data-sa="bc-hide" data-id="${esc(b.id)}">إخفاء</button></div>`}</div>`).join('') : '<p class="ad-empty">ما فيه برقيات.</p>'}</section>
      <section class="ad-card"><h2>🏠 الغرف (${nf(rooms.length)})</h2><p class="ad-muted">مستوى كل غرفة وخلفيتها والفيديو الشغال فيها. إغلاق الغرفة ونقل الملكية في قسم «الغرف الاجتماعية والمجالس».</p>
        ${rooms.length ? rooms.map((r) => `<div class="sa67-row"><b>${esc(r.name)}</b><small>المالك: ${esc(r.owner?.name ?? '')} · ${nf(r.members)} عضو · Lv ${nf(r.level ?? 1)} · دعم ${nf(r.support ?? 0)}</small><small>الخلفية: ${esc(THEME[r.theme] ?? r.theme ?? '')}${r.video ? ` · 🎬 فيديو ${r.video.playing ? 'شغال' : 'موقف'} (${esc(r.video.vid)})` : ''}</small>
          <div class="sa67-acts">${r.video ? `<button class="ad-btn ghost" data-sa="video-off" data-id="${esc(r.id)}">إيقاف الفيديو</button>` : ''}${r.theme && r.theme !== 'royal' ? `<button class="ad-btn ghost" data-sa="theme-reset" data-id="${esc(r.id)}">رجّع الخلفية الافتراضية</button>` : ''}</div></div>`).join('') : '<p class="ad-empty">ما فيه غرف.</p>'}</section>
      <section class="ad-card"><h2>📝 المنشورات</h2><p class="ad-muted">${S.counts ? `${nf(S.counts.posts)} منشور · ${nf(S.counts.comments)} تعليق · ${nf(S.counts.reports)} بلاغ مفتوح` : ''}</p>
        <form data-saf="psearch" class="ad-form"><input class="ad-in" name="q" value="${esc(S.q)}" placeholder="بحث بالكلام أو اسم الكاتب"><button class="ad-btn" type="submit">بحث</button></form>
        ${(S.posts || []).length ? S.posts.map((p) => `<div class="sa67-row sa67-post"><b>${esc(p.author)}</b><small>${dt(p.at)} · ❤️ ${nf(p.likes)} · 💬 ${nf(p.comments)} · رقم ${p.id}</small><div>${esc(p.text)}</div>${p.media ? `<img src="${esc(p.media)}" alt="" loading="lazy">` : ''}<div class="sa67-acts"><button class="ad-btn danger" data-sa="post-del" data-id="${p.id}">حذف المنشور</button></div></div>`).join('') : '<p class="ad-empty">ما فيه منشورات.</p>'}</section>`;
  }
  const ask = (msg) => { const r = window.prompt(msg + '\n\nاكتب السبب (إلزامي):'); return r && r.trim().length >= 3 ? r.trim() : null; };
  const run = async (fn, ok) => { if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; try { const j = await fn(); S.msg = ok + (j?.auditOk === false ? ' (تنبيه: ما انسجل بالتدقيق)' : ''); await loadAll(); } catch (e) { S.err = e.message || 'فشل الطلب.'; } finally { S.busy = false; paint(); } };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sa]'); if (!b) return; const id = b.dataset.id, k = b.dataset.sa;
    if (k === 'video-off') { const r = ask('إيقاف الفيديو بهالغرفة؟'); if (r) run(() => call('social', { method: 'POST', body: { command: 'room:video-off', roomId: id, reason: r, key: key() } }), 'توقف الفيديو.'); }
    if (k === 'theme-reset') { const r = ask('ترجيع خلفية الغرفة للافتراضية؟'); if (r) run(() => call('social', { method: 'POST', body: { command: 'room:theme-reset', roomId: id, reason: r, key: key() } }), 'رجعت الخلفية الافتراضية.'); }
    if (k === 'bc-hide') { const r = ask('إخفاء هذي البرقية عن الكل؟'); if (r) run(() => call('broadcasts/hide', { method: 'POST', body: { id, reason: r } }), 'انخفت البرقية.'); }
    if (k === 'post-del') { const r = ask('حذف هذا المنشور نهائيًا؟'); if (r) run(() => call('posts/delete', { method: 'POST', body: { id: Number(id), reason: r } }), 'انحذف المنشور.'); }
  });
  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-saf]'); if (!f) return; e.preventDefault();
    if (f.dataset.saf === 'psearch') { S.q = f.querySelector('[name=q]').value; loadPosts(); return; }
    const g = (n) => f.querySelector(`[name=${n}]`);
    const body = { cinema: g('cinema').checked, broadcast: g('broadcast').checked, streak: g('streak').checked, invite: g('invite').checked, firstTopupPercent: Number(g('firstTopupPercent').value), bigGiftMin: Number(g('bigGiftMin').value), profileBgVip: Number(g('profileBgVip').value), reason: g('reason').value.trim() };
    run(() => call('site-flags', { method: 'POST', body }), 'انحفظت الإعدادات.');
  });
  paint(); loadAll().then(paint);
  return { dispose() {} };
}
