// R67ae: لوحة الإدارة — القبائل وCP وجوائز الصاروخ والمدفع (المالك فقط)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const dt = (ms) => { try { return new Date(ms).toLocaleDateString('ar-AE'); } catch { return ''; } };

export function mountTribesCpAdmin(root, { call }) {
  if (!document.querySelector('style[data-tc67]')) { const st = document.createElement('style'); st.dataset.tc67 = '1'; st.textContent = '[data-tribes-cp-admin]{min-width:0;max-width:100%;overflow-wrap:anywhere}.tc67-rows{display:grid;gap:8px;margin:8px 0}.tc67-row{display:grid;gap:3px;padding:10px 12px;border:1px solid #ffffff1a;border-radius:12px;background:#ffffff08;font-size:13px}.tc67-row b{color:#d8b56b}.tc67-row small{color:#b9a8d0}.ad-line{flex-wrap:wrap;gap:6px}.tc67-tribe{margin:8px 0}.tc67-tribe summary{cursor:pointer}.ad-btn.danger{background:#7a1f2b;color:#fff}'; document.head.appendChild(st); }
  const S = { data: null, err: '', msg: '', q: '', open: 0, busy: false };
  const load = async () => { try { S.data = await call('tribes-cp'); S.err = ''; } catch (e) { S.err = e.message || 'تعذّر التحميل.'; } paint(); };
  const tribeCard = (t) => `<details class="ad-card tc67-tribe" ${S.open === t.id ? 'open' : ''} data-tid="${t.id}"><summary><b>${esc(t.name)}</b> <em class="ad-tag">Lv ${nf(t.level?.level)}</em><small class="ad-muted"> · ${nf(t.members.length)} عضو · نقاط الشهر ${nf(t.monthPts)} · كنز الأسبوع ${nf(t.weekPts)}</small></summary>
    <p class="ad-sub">القائد: ${esc(t.leader)} · كل النقاط ${nf(t.pts)} · تأسست ${dt(t.at)} · رقم ${t.id}</p>
    <div class="ad-list">${t.members.map((m) => `<div class="ad-line"><span>${m.leader ? '👑 ' : ''}${esc(m.name)}<small> · ${nf(m.pts)} نقطة</small></span>${m.leader ? '' : `<button class="ad-btn ghost" data-tc="kick" data-id="${t.id}" data-user="${esc(m.id)}">طرد</button>`}</div>`).join('')}</div>
    <form class="ad-form col" data-tcf="rename" data-id="${t.id}"><input class="ad-in" name="name" value="${esc(t.name)}" maxlength="24" required><button class="ad-btn" type="submit">تغيير الاسم</button></form>
    <button class="ad-btn danger" data-tc="disband" data-id="${t.id}">حل القبيلة</button></details>`;
  const coupleRow = (c) => `<div class="ad-line"><span><b>${esc(c.a)} 💞 ${esc(c.b)}</b><small> · ${nf(c.pts)} نقطة · ${esc(c.level?.name ?? '')} · من ${dt(c.at)}</small></span><span class="ad-acts"><button class="ad-btn ghost" data-tc="cp-reset" data-id="${c.id}">تصفير النقاط</button><button class="ad-btn danger" data-tc="cp-break" data-id="${c.id}">فك الارتباط</button></span></div>`;
  const table = (head, rows) => `<div class="tc67-rows">${rows.map((r) => `<div class="tc67-row"><b>${r[0]}</b>${r.slice(1).map((c, i) => `<span><small>${head[i + 1]}:</small> ${c}</span>`).join('')}</div>`).join('')}</div>`;
  function paint() {
    if (!root.isConnected) return;
    const d = S.data;
    if (!d) { root.innerHTML = S.err ? `<div class="ad-note bad">${esc(S.err)}</div>` : '<p class="ad-muted">جاري التحميل…</p>'; return; }
    const q = S.q.trim().toLowerCase();
    const tribes = d.tribes.filter((t) => !q || t.name.toLowerCase().includes(q) || t.members.some((m) => m.name.toLowerCase().includes(q)));
    const couples = d.couples.filter((c) => !q || c.a.toLowerCase().includes(q) || c.b.toLowerCase().includes(q));
    const c = d.config;
    root.innerHTML = `<section class="ad-card"><h2>القبائل وCP والجوائز</h2><p class="ad-muted">كل تعديل هنا يطلب سبب وينسجل في سجل العمليات. الطرد وحل القبيلة وفك الارتباط ما ينرجعون.</p>
      ${S.err ? `<div class="ad-note bad" role="alert">${esc(S.err)}</div>` : ''}${S.msg ? `<div class="ad-note ok">${esc(S.msg)}</div>` : ''}
      <div class="ad-grid"><div class="ad-stat"><b>${nf(d.tribes.length)}</b><span>قبيلة</span></div><div class="ad-stat"><b>${nf(d.tribes.reduce((a, t) => a + t.members.length, 0))}</b><span>عضو بالقبائل</span></div><div class="ad-stat"><b>${nf(d.couples.length)}</b><span>ارتباط CP</span></div></div>
      <input class="ad-in" data-tc-q placeholder="بحث باسم قبيلة أو لاعب" value="${esc(S.q)}"></section>
      <section class="ad-card"><h2>القبائل (${nf(tribes.length)})</h2>${tribes.length ? tribes.map(tribeCard).join('') : '<p class="ad-empty">ما فيه قبائل.</p>'}</section>
      <section class="ad-card"><h2>ارتباطات CP (${nf(couples.length)})</h2>${couples.length ? `<div class="ad-list">${couples.map(coupleRow).join('')}</div>` : '<p class="ad-empty">ما فيه ارتباطات.</p>'}</section>
      <section class="ad-card"><h2>🚀 جوائز صاروخ الغرفة (يومي)</h2>${table(['المرحلة', 'الهدف', 'جوائز الأوائل (عملات)', 'هدايا الأوائل', 'جائزة الحظ'], c.rocket.map((r) => [`${r.stage}. ${esc(r.name)}`, nf(r.goal), r.prizes.map(nf).join(' / '), r.gifts.map((g) => esc(g.join('، '))).join(' / '), esc(r.luck)]))}</section>
      <section class="ad-card"><h2>💣 جوائز المدفع</h2>${table(['المستوى', 'الهدف', 'عملات', 'جائزة الأول', 'قطع'], c.cannon.map((l) => [l.level, nf(l.goal), nf(l.coins), esc(l.top1), esc(l.items.join('، '))]))}</section>
      <section class="ad-card"><h2>💞 مستويات CP ومهامه</h2>${table(['المستوى', 'من نقاط'], c.cpLevels.map((l, i) => [`${i + 1}. ${esc(l.name)}`, nf(l.min)]))}${table(['المهمة', 'المكافأة'], (c.cpTasks || []).map((t) => [esc(t.name), nf(t.reward) + ' نقطة']))}</section>
      <section class="ad-card"><h2>🏰 مستويات القبائل وحرب القبائل</h2>${table(['المستوى', 'من نقاط'], (c.tribeLevels || []).map((l) => [`${l.level}. ${esc(l.name)} (حتى ${nf(l.cap)} عضو)`, nf(l.min)]))}<p class="ad-sub">وقود الحرب: فوز ${nf(c.warFuel?.win)} · تعادل ${nf(c.warFuel?.draw)} · أقل أعضاء ${nf(c.warFuel?.minMembers)} · هيبة الصاروخ ${nf(c.rocketPrestige)}</p>
      <p class="ad-muted">أرقام الجوائز والمستويات مثبتة بالكود عشان ما تتغير بالغلط. لو تبي تغير رقم، اطلبه ونعدله.</p></section>`;
    root.querySelector('[data-tc-q]')?.addEventListener('input', (e) => { S.q = e.target.value; const pos = e.target.selectionStart; paint(); const el = root.querySelector('[data-tc-q]'); el?.focus(); try { el?.setSelectionRange(pos, pos); } catch {} });
  }
  const ask = (msg) => { const r = window.prompt(msg + '\n\nاكتب سبب التعديل (إلزامي):'); return r && r.trim().length >= 3 ? r.trim() : null; };
  const act = async (path, body, ok) => { if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; try { const j = await call(path, { method: 'POST', body }); S.msg = ok + (j.auditOk === false ? ' (تنبيه: ما انسجل بالتدقيق)' : ''); await load(); } catch (e) { S.err = e.message || 'فشل الطلب.'; paint(); } finally { S.busy = false; } };
  root.addEventListener('toggle', (e) => { const d = e.target.closest?.('details[data-tid]'); if (d && d.open) S.open = Number(d.dataset.tid); }, true);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tc]'); if (!b) return; const id = Number(b.dataset.id), k = b.dataset.tc; S.open = k === 'kick' ? id : S.open;
    const t = S.data?.tribes.find((x) => x.id === id), c = S.data?.couples.find((x) => x.id === id);
    if (k === 'kick') { const r = ask(`طرد ${t?.members.find((m) => m.id === b.dataset.user)?.name ?? ''} من قبيلة ${t?.name ?? ''}؟`); if (r) act('tribes-cp/tribe', { id, op: 'kick', user: b.dataset.user, reason: r }, 'انطرد العضو.'); }
    if (k === 'disband') { const r = ask(`حل قبيلة «${t?.name ?? ''}» نهائيًا؟ كل الأعضاء يطلعون منها.`); if (r) act('tribes-cp/tribe', { id, op: 'disband', reason: r }, 'انحلت القبيلة.'); }
    if (k === 'cp-reset') { const r = ask(`تصفير نقاط CP بين ${c?.a} و ${c?.b}؟`); if (r) act('tribes-cp/couple', { id, op: 'reset', reason: r }, 'تصفرت النقاط.'); }
    if (k === 'cp-break') { const r = ask(`فك ارتباط ${c?.a} و ${c?.b} نهائيًا؟ النقاط تنمسح.`); if (r) act('tribes-cp/couple', { id, op: 'break', reason: r }, 'انفك الارتباط.'); }
  });
  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-tcf="rename"]'); if (!f) return; e.preventDefault(); const id = Number(f.dataset.id); S.open = id;
    const name = f.querySelector('[name=name]').value; const r = ask(`تغيير اسم القبيلة إلى «${name}»؟`); if (r) act('tribes-cp/tribe', { id, op: 'rename', name, reason: r }, 'تغيّر الاسم.');
  });
  paint(); load();
  return { dispose() {} };
}
