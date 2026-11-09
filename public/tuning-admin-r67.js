// R67ae: لوحة الإدارة — أرقام الجوائز والمستويات (المالك فقط)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const p2 = (n) => String(n).padStart(2, '0');
const dt = (ms) => { if (!ms) return ''; const d = new Date(Number(ms) + 4 * 3600_000); return `<span dir="ltr">${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}</span>`; };
const BG_NAME = { img10: 'قاعة المجرة', img11: 'القصر الكوني', img12: 'السجادة الزرقاء', img13: 'عرش الياقوت' };

export function mountTuningAdmin(root, { call }) {
  if (!document.querySelector('style[data-tn67]')) { const st = document.createElement('style'); st.dataset.tn67 = '1'; st.textContent = '[data-tuning-admin]{min-width:0;max-width:100%}.tn67-g{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0}.tn67-g.c3{grid-template-columns:1fr 1fr 1fr}.tn67-g label{display:grid;gap:3px;font-size:12px;color:#b9a8d0}.tn67-g input{min-width:0}.tn67-blk{border:1px solid #ffffff1a;border-radius:12px;padding:10px;margin:8px 0;background:#ffffff06}.tn67-blk b{color:#f3e6ff}.tn67-def{font-size:11px;color:#8f7fa8}'; document.head.appendChild(st); }
  const S = { d: null, err: '', msg: '', busy: false };
  const load = async () => { try { S.d = await call('tuning'); S.err = ''; } catch (e) { S.err = e.message; } paint(); };
  const inp = (name, val, def, label, mult = 1) => `<label>${label}<input class="ad-in" type="number" inputmode="numeric" step="${mult}" min="0" name="${name}" value="${val * mult}"><span class="tn67-def">الأصلي: ${nf(def * mult)}</span></label>`;
  const form = (k, title, note, body) => `<section class="ad-card"><h2>${title}</h2>${note ? `<p class="ad-muted">${note}</p>` : ''}<form data-tnf="${k}" class="ad-form col">${body}<input class="ad-in" name="reason" placeholder="سبب التعديل (إلزامي)" maxlength="200" required minlength="3"><button class="ad-btn" type="submit">حفظ</button></form></section>`;
  function paint() {
    if (!root.isConnected) return;
    if (!S.d) { root.innerHTML = S.err ? `<div class="ad-note bad">${esc(S.err)}</div>` : '<p class="ad-muted">جاري التحميل…</p>'; return; }
    const c = S.d.current, d = S.d.defaults, n = S.d.names;
    root.innerHTML = `${S.err ? `<div class="ad-note bad" role="alert">${esc(S.err)}</div>` : ''}${S.msg ? `<div class="ad-note ok">${esc(S.msg)}</div>` : ''}
    <section class="ad-card"><h2>🏆 أرقام الجوائز والمستويات</h2><p class="ad-muted">كل رقم له حد أعلى وحد أدنى، والخادم يرفض أي رقم غلط. التعديل يسري على اللي جاي بس، وما يغيّر جوائز انصرفت. كل تعديل ينسجل بسجل العمليات.${S.d.meta?.at ? ` آخر تعديل: ${esc(S.d.meta.by)} · ${dt(S.d.meta.at)}` : ''}</p>
      <button class="ad-btn ghost" data-tn="reset">رجّع كل الأرقام للأصلي</button></section>
    ${form('rocket', '🚀 صاروخ الغرفة (يومي)', 'الهدف = كم نقطة هدايا تحتاج المرحلة. الجوائز بالعملات للأول والثاني والثالث.', c.rocket.map((r, i) => `<div class="tn67-blk"><b>${i + 1}. ${esc(n.rocket[i])}</b><div class="tn67-g">${inp(`rg${i}`, r.goal, d.rocket[i].goal, 'الهدف')}</div><div class="tn67-g c3">${r.prizes.map((p, j) => inp(`rp${i}_${j}`, p, d.rocket[i].prizes[j], `المركز ${j + 1}`, 20)).join('')}</div></div>`).join(''))}
    ${form('cannon', '💣 مدفع الغرفة', 'الهدف = نقاط الهدايا لانفجار المستوى. العملات تنقسم على المشاركين الأوائل.', c.cannon.map((x, i) => `<div class="tn67-blk"><b>المستوى ${i + 1}</b><div class="tn67-g">${inp(`cg${i}`, x.goal, d.cannon[i].goal, 'الهدف')}${inp(`cc${i}`, x.coins, d.cannon[i].coins, 'العملات')}</div></div>`).join(''))}
    ${form('tribe', '🏰 مستويات القبائل', 'النقاط اللي تحتاجها القبيلة لكل مستوى، وأقصى عدد أعضاء فيه.', c.tribe.map((x, i) => `<div class="tn67-blk"><b>${i + 1}. ${esc(n.tribe[i])}</b><div class="tn67-g">${i === 0 ? '<label>النقاط<input class="ad-in" value="0" disabled></label>' : inp(`tm${i}`, x.min, d.tribe[i].min, 'النقاط')}${inp(`tc${i}`, x.cap, d.tribe[i].cap, 'أقصى أعضاء')}</div></div>`).join(''))}
    ${form('cp', '💞 مستويات CP', 'نقاط CP اللي يحتاجها الارتباط لكل مستوى.', `<div class="tn67-g">${c.cp.map((v, i) => i === 0 ? '' : inp(`cp${i}`, v, d.cp[i], `${i + 1}. ${esc(n.cp[i])}`)).join('')}</div>`)}
    ${form('roomLevels', '🏠 مستويات الغرف', 'كم دعم تحتاجه الغرفة عشان توصل كل مستوى.', `<div class="tn67-g">${c.roomLevels.map((v, i) => i === 0 ? '' : inp(`rl${i}`, v, d.roomLevels[i], `المستوى ${i + 1}`)).join('')}</div>`)}
    ${form('roomBg', '🖼️ خلفيات الغرف حسب المستوى', 'أي مستوى غرفة يفتح كل خلفية.', `<div class="tn67-g">${Object.keys(c.roomBg).map((k) => inp(`bg_${k}`, c.roomBg[k], d.roomBg[k], esc(BG_NAME[k] ?? k))).join('')}</div>`)}
    ${form('streak', '📅 هدية الدخول اليومي المتتالي', 'العملات الزيادة فوق المكافأة اليومية لكل يوم بالسلسلة.', `<div class="tn67-g">${c.streak.map((v, i) => inp(`st${i}`, v, d.streak[i], `اليوم ${i + 1}`)).join('')}</div>`)}
    ${form('broadcast', '📢 أسعار البرقية العالمية', 'بالعملات. العادية ≤ الذهبية ≤ الشاشة الكاملة.', `<div class="tn67-g c3">${inp('bc_normal', c.broadcast.normal, d.broadcast.normal, 'عادية')}${inp('bc_gold', c.broadcast.gold, d.broadcast.gold, 'ذهبية')}${inp('bc_full', c.broadcast.full, d.broadcast.full, 'شاشة كاملة')}</div>`)}
    ${form('invite', '🤝 مكافأة الدعوة', '', `<div class="tn67-g">${inp('iv_inviter', c.invite.inviter, d.invite.inviter, 'للداعي (عملات)')}${inp('iv_invitee', c.invite.invitee, d.invite.invitee, 'للمدعو (عملات)')}${inp('iv_games', c.invite.games, d.invite.games, 'مباريات مطلوبة')}${inp('iv_cap', c.invite.monthlyCap, d.invite.monthlyCap, 'أقصى دعوات بالشهر')}</div>`)}`;
  }
  const num = (f, name) => Number(f.querySelector(`[name="${name}"]`)?.value);
  const patchOf = (k, f) => {
    const c = S.d.current;
    if (k === 'rocket') return { rocket: c.rocket.map((r, i) => ({ goal: num(f, `rg${i}`), prizes: r.prizes.map((_, j) => { const v = num(f, `rp${i}_${j}`); if (v % 20) throw new Error(`جوائز الصاروخ لازم تكون من مضاعفات 20 (المرحلة ${i + 1}).`); return v / 20; }) })) };
    if (k === 'cannon') return { cannon: c.cannon.map((_, i) => ({ goal: num(f, `cg${i}`), coins: num(f, `cc${i}`) })) };
    if (k === 'tribe') return { tribe: c.tribe.map((_, i) => ({ min: i === 0 ? 0 : num(f, `tm${i}`), cap: num(f, `tc${i}`) })) };
    if (k === 'cp') return { cp: c.cp.map((_, i) => i === 0 ? 0 : num(f, `cp${i}`)) };
    if (k === 'roomLevels') return { roomLevels: c.roomLevels.map((_, i) => i === 0 ? 0 : num(f, `rl${i}`)) };
    if (k === 'roomBg') return { roomBg: Object.fromEntries(Object.keys(c.roomBg).map((b) => [b, num(f, `bg_${b}`)])) };
    if (k === 'streak') return { streak: c.streak.map((_, i) => num(f, `st${i}`)) };
    if (k === 'invite') return { invite: { inviter: num(f, 'iv_inviter'), invitee: num(f, 'iv_invitee'), games: num(f, 'iv_games'), monthlyCap: num(f, 'iv_cap') } };
    if (k === 'broadcast') return { broadcast: { normal: num(f, 'bc_normal'), gold: num(f, 'bc_gold'), full: num(f, 'bc_full') } };
    return {};
  };
  const save = async (body, ok) => { if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; try { const j = await call('tuning', { method: 'POST', body }); S.msg = ok + (j.auditOk === false ? ' (تنبيه: ما انسجل بالتدقيق)' : ''); const t = await call('tuning'); S.d = t; } catch (e) { S.err = e.message || 'فشل الحفظ.'; } finally { S.busy = false; paint(); root.scrollIntoView({ block: 'start' }); } };
  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-tnf]'); if (!f) return; e.preventDefault();
    let patch; try { patch = patchOf(f.dataset.tnf, f); } catch (err) { S.err = err.message; paint(); return; }
    save({ patch, reason: f.querySelector('[name=reason]').value.trim() }, 'انحفظت الأرقام وصارت شغالة.');
  });
  root.addEventListener('click', (e) => {
    if (!e.target.closest('[data-tn="reset"]')) return;
    const r = window.prompt('ترجيع كل الجوائز والمستويات للأرقام الأصلية؟\n\nاكتب السبب (إلزامي):'); if (r && r.trim().length >= 3) save({ reset: true, reason: r.trim() }, 'رجعت كل الأرقام للأصلي.');
  });
  paint(); load();
  return { dispose() {} };
}
