// R115: مميزات الغرفة من لوحة التحكم — المالك يعطي أي غرفة: ليفل، رتبة ثابتة (ما تنزل كل شهر)، آيدي مميز.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TIERS = [['none', 'بدون رتبة ثابتة'], ['silver', 'فضية'], ['gold', 'ذهبية'], ['diamond', 'ماسية'], ['royal', 'ملكية'], ['legend', 'أسطورية']];
export function mountRoomBoost(root, { call }) {
  if (!document.querySelector('style[data-rb115]')) { const st = document.createElement('style'); st.dataset.rb115 = '1'; st.textContent = `
.rb115 .ad-card{display:grid;gap:10px}.rb115 .rb-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.rb115 .rb-row>*{flex:1 1 140px;min-width:0}
.rb115 .rb-room{display:grid;gap:4px;padding:12px;border-radius:14px;background:#ffffff0d;border:1px solid #a86bff55}.rb115 .rb-room b{font-size:16px}
.rb115 label{display:grid;gap:4px;font-size:13px;font-weight:700}.rb115 .rb-ok{color:#5be08f;font-weight:800}.rb115 .rb-err{color:#ff7d8c;font-weight:800}
.rb115 .rb-all{background:linear-gradient(180deg,#ffe07a,#ffb21f)!important;color:#3a1600!important;font-weight:900}`; document.head.append(st); }
  const S = { room: null, err: '', msg: '', busy: false };
  const paint = () => {
    const r = S.room;
    root.innerHTML = `<div class="rb115"><section class="ad-card"><h2>💎 مميزات الغرفة</h2><p class="ad-muted">اكتب آيدي الغرفة (الرقم اللي يطلع تحت اسمها) وبعدين اختر المميزات.</p>
      <form data-rb="find" class="rb-row"><input class="ad-in" name="q" placeholder="آيدي الغرفة مثل 52058034" inputmode="numeric" dir="ltr" value="${esc(S.q || '')}" required><button class="ad-btn" type="submit">بحث</button></form>
      ${S.err ? `<p class="rb-err">${esc(S.err)}</p>` : ''}${S.msg ? `<p class="rb-ok">${esc(S.msg)}</p>` : ''}
      ${r ? `<div class="rb-room"><b>${esc(r.name)}</b><small>الآيدي: <span dir="ltr">#${esc(r.code)}</span> · المالك: ${esc(r.owner || '—')} · الأعضاء الحين: ${r.members}</small><small>الليفل: ${r.level} · الرتبة: ${esc(r.tierName || 'بدون')}${r.fixedTier ? ' (ثابتة)' : ''}</small></div>
      <button type="button" class="ad-btn rb-all" data-rb-all>👑 أعطها كل المميزات (ليفل 300 + أسطورية ثابتة)</button>
      <form data-rb="save" class="ad-form col">
        <label>الليفل (1 إلى 300)<input class="ad-in" name="level" type="number" min="1" max="300" value="${r.level}"></label>
        <label>الرتبة الشهرية الثابتة<select class="ad-in" name="tier">${TIERS.map(([v, n]) => `<option value="${v}"${(r.fixedTier || 'none') === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>آيدي مميز للغرفة (أرقام بس، فاضي = الآيدي الأصلي)<input class="ad-in" name="vanity" inputmode="numeric" dir="ltr" maxlength="8" placeholder="مثل 7 أو 777 أو 1000" value="${esc(r.vanity || '')}"></label>
        <button class="ad-btn" type="submit"${S.busy ? ' disabled' : ''}>حفظ المميزات</button>
      </form>` : ''}</section></div>`;
  };
  const save = async (body) => {
    S.busy = true; S.err = ''; S.msg = ''; paint();
    try { const out = await call('room-boost', { method: 'POST', body: { room: S.room.id, ...body } }); S.room = out.room; S.q = out.room.code; S.msg = 'تم ✅ انحفظت مميزات الغرفة.'; }
    catch (e) { S.err = e.message || 'ما تم الحفظ.'; }
    S.busy = false; paint();
  };
  root.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-rb]'); if (!f) return; e.preventDefault();
    if (f.dataset.rb === 'find') {
      S.q = f.q.value.trim(); S.err = ''; S.msg = ''; S.room = null; paint();
      try { S.room = (await call('room-boost?q=' + encodeURIComponent(S.q))).room; } catch (er) { S.err = er.message || 'ما لقيت الغرفة.'; }
      paint();
    } else if (S.room) save({ level: f.level.value, tier: f.tier.value, vanity: f.vanity.value.trim() });
  });
  root.addEventListener('click', (e) => { if (e.target.closest('[data-rb-all]') && S.room) save({ level: 300, tier: 'legend' }); });
  paint();
}
