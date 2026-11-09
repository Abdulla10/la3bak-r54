/* المهام الرسمية: تقدم ومطالبات الخادم فقط؛ لا localStorage ولا نجوم محلية أو XP. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (n) => Number(n).toLocaleString('ar-EG-u-nu-latn');
const messages = {
  bad: 'طلب المهمة غير صالح.', not_found: 'المهمة غير موجودة.', inactive: 'هذه المهمة غير نشطة الآن.',
  ineligible: 'لم يكتمل تقدمك الخادمي لهذه المهمة بعد.', reward_failed: 'تعذّر منح المكافأة؛ لم تسجّل كمستلمة. تواصل مع الإدارة.',
};
function unwrap(result) {
  if (result?.ok === false) throw new Error(messages[result.code] || result.error || 'تعذّر تحميل المهام.');
  const view = Array.isArray(result?.missions) ? result : result?.missions;
  if (!view || !Array.isArray(view.missions) || !view.windows || !Number.isFinite(view.serverNow)) throw new Error('تعذّر تحميل المهام.');
  return view;
}
const rewardText = (rewards) => [
  rewards.coins ? `${num(rewards.coins)} عملة` : '', rewards.gems ? `${num(rewards.gems * 20)} عملة` : '',
  ...(rewards.items || []).map((id) => `عنصر: ${id}`),
].filter(Boolean).join(' + ');

/** api(fullPath, method='GET', body?) => JSON أو يرمي. يرد {refresh,destroy,ready}. */
const M68CSS = `.m68{display:flex;flex-direction:column;gap:14px;padding:4px 2px 110px;color:#fff}
.m68-wheel{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:22px;text-decoration:none;color:#fff;background:linear-gradient(110deg,#5a1aa8,#2a0d4f 60%,#4a2a0a);border:1px solid #ffc83d88;box-shadow:0 8px 24px #7b3cff44}
.m68-wheel>span{font-size:40px;animation:m68s 6s linear infinite}@keyframes m68s{to{transform:rotate(360deg)}}.m68-wheel div{flex:1}.m68-wheel b{display:block;font-size:18px}.m68-wheel small{opacity:.85}
.m68-wheel em{font-style:normal;font-weight:900;background:linear-gradient(90deg,#ffb020,#ffd76b);color:#3a1a00;border-radius:99px;padding:7px 14px;font-size:14px}
.m68-card{background:linear-gradient(160deg,#2a1048,#1a0a30);border:1px solid #9b5cff4d;border-radius:22px;padding:14px;box-shadow:0 8px 24px #0006}
.m68-card header{display:flex;justify-content:space-between;align-items:center;gap:8px}.m68-card h2{margin:0;font-size:19px}.m68-time{font-size:12px;background:#ffffff10;border-radius:99px;padding:4px 10px;white-space:nowrap}
.m68-sub{margin:4px 0 10px;opacity:.75;font-size:13px}.m68-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.m68-row{display:flex;align-items:center;gap:10px;padding:10px;border-radius:16px;background:#ffffff08;border:1px solid #ffffff12}.m68-row.ready{border-color:#ffc83d;box-shadow:0 0 14px #ffc83d33}.m68-row.got{opacity:.6}
.m68-ic{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:radial-gradient(circle at 50% 30%,#5a2299,#26093f);font-size:22px;flex:none}
.m68-row div,.m68-chest div{flex:1;min-width:0}.m68-row b{display:block;font-size:15px}.m68-row small,.m68-chest small{font-size:12px;opacity:.8}
.m68-bar{display:block;height:8px;border-radius:99px;background:#ffffff14;margin:6px 0 3px;overflow:hidden}.m68-bar u{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#7b3cff,#e070ff)}
.m68-claim{border:0;border-radius:12px;padding:9px 16px;font:inherit;font-weight:900;color:#fff;background:linear-gradient(90deg,#7b3cff,#b44dff);cursor:pointer}.m68-claim.gold{background:linear-gradient(90deg,#ffb020,#ffd76b);color:#3a1a00}.m68-claim:disabled{opacity:.5}
.m68-rw{font-weight:800;font-size:13px;color:#ffd76b;white-space:nowrap}.m68-done{font-size:13px;color:#7be0a0;font-weight:800;white-space:nowrap}
.m68-chest{display:flex;align-items:center;gap:12px;padding:12px;margin-bottom:10px;border-radius:18px;background:linear-gradient(110deg,#4a2a0a55,#2a0f48);border:1px dashed #ffc83d88}.m68-chest.ready{border-style:solid;box-shadow:0 0 18px #ffc83d55}.m68-chest b{display:block;font-size:16px;color:#ffd76b}
.m68-box{font-size:40px}.m68-chest.ready .m68-box{animation:m68b 1s infinite}@keyframes m68b{50%{transform:scale(1.12) rotate(-6deg)}}.m68-err{background:#ffffff10;border-radius:14px;padding:10px;font-weight:800;text-align:center;margin:0}`;
export function missionsServerView(root, { api }) {
  if (!document.querySelector('style[data-m68]')) { const st = document.createElement('style'); st.dataset.m68 = '1'; st.textContent = M68CSS; document.head.append(st); }
  if (!root || typeof root.addEventListener !== 'function' || typeof api !== 'function') throw new TypeError('missions_view_invalid');
  let view = null, error = '', loading = false, busy = false, destroyed = false, sequence = 0;
  const render = () => {
    if (destroyed) return;
    if (!view) {
      root.innerHTML = `<section class="card empty-state"><h2>المهام الرسمية</h2><p ${error ? 'role="alert"' : 'role="status"'}>${esc(error || 'جاري تحميل المهام…')}</p>${error ? '<button class="btn" type="button" data-ms-action="refresh">إعادة المحاولة</button>' : ''}</section>`;
      return;
    }
    const left = (t) => { const s = Math.max(0, (t - Date.now()) / 1000); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), mi = Math.floor(s % 3600 / 60); return d ? `${d} يوم و ${h} ساعة` : h ? `${h} ساعة و ${mi} دقيقة` : `${mi} دقيقة`; };
    const ICON = { gamesPlayed: '🎮', gamesWon: '🏆', giftsSent: '🎁', giftsReceived: '💝', micMinutes: '🎙️' };
    const row = (m) => {
      const value = Math.max(0, Math.min(m.goal, m.value));
      const percent = m.goal > 0 ? Math.min(100, value / m.goal * 100) : 0;
      const act = m.claimed ? '<span class="m68-done">✓ استلمتها</span>' : m.claimable ? `<button class="m68-claim" type="button" data-ms-action="claim" data-ms-id="${esc(m.id)}" ${busy || loading ? 'disabled' : ''}>${m.pending ? 'استكمال' : 'استلم'}</button>` : `<span class="m68-rw">🪙 ${esc(rewardText(m.rewards).replace(' عملة', ''))}</span>`;
      return `<li class="m68-row${m.claimable ? ' ready' : ''}${m.claimed ? ' got' : ''}"><span class="m68-ic" aria-hidden="true">${ICON[m.metric] || '⭐'}</span><div><b>${esc(m.title)}</b><i class="m68-bar" role="progressbar" aria-label="${esc(m.title)}" aria-valuemin="0" aria-valuemax="${esc(m.goal)}" aria-valuenow="${esc(value)}"><u style="width:${percent}%"></u></i><small>${num(value)} / ${num(m.goal)}</small></div>${act}</li>`;
    };
    const chest = view.chest;
    const chestHTML = chest && chest.total ? `<div class="m68-chest${chest.ready ? ' ready' : ''}${chest.opened ? ' got' : ''}"><span class="m68-box" aria-hidden="true">${chest.opened ? '📭' : '🎁'}</span><div><b>صندوق الأسبوع</b><small>${chest.opened ? 'فتحته هالأسبوع ✓' : `خلّص واستلم كل مهام الأسبوع (${chest.done}/${chest.total}) وافتحه بـ ${num(chest.coins)} عملة`}</small><i class="m68-bar"><u style="width:${chest.total ? chest.done / chest.total * 100 : 0}%"></u></i></div>${chest.ready ? `<button class="m68-claim gold" type="button" data-ms-action="chest" ${busy ? 'disabled' : ''}>افتح</button>` : ''}</div>` : '';
    const section = (scope, title, sub) => {
      const missions = view.missions.filter((m) => m.scope === scope);
      return `<section class="m68-card"><header><h2>${title}</h2><span class="m68-time">⏳ تتجدد بعد ${esc(left(view.windows[scope].endAt))}</span></header><p class="m68-sub">${sub}</p>${scope === 'weekly' ? chestHTML : ''}${missions.length ? `<ul class="m68-list">${missions.map(row).join('')}</ul>` : '<p class="m68-sub">ما فيه مهام الحين.</p>'}</section>`;
    };
    root.innerHTML = `<div class="m68" dir="rtl"><a class="m68-wheel" href="#/wheel"><span aria-hidden="true">🎡</span><div><b>عجلة الحظ</b><small>لفة مجانية كل يوم — جرب حظك!</small></div><em>لف الحين</em></a>${error ? `<p class="m68-err" role="alert">${esc(error)}</p>` : ''}${section('daily', '🎯 مهام اليوم', 'تتجدد كل يوم. خلّصها واستلم جوائزك.')}${section('weekly', '📅 مهام الأسبوع', 'مهام أكبر بجوائز أكبر، والصندوق لمن يخلصها كلها.')}</div>`;
  };
  const refresh = async () => {
    if (destroyed) return;
    const request = ++sequence;
    loading = true; error = ''; render();
    try {
      const result = await api('/api/missions', 'GET');
      if (destroyed || request !== sequence) return;
      view = unwrap(result);
      try { const c = await api('/api/missions/chest', 'GET'); if (request === sequence) view.chest = c; } catch { /* الصندوق اختياري */ }
    } catch {
      if (!destroyed && request === sequence) error = 'تعذّر تحميل المهام. تأكد من الاتصال وأعد المحاولة.';
    } finally {
      if (!destroyed && request === sequence) { loading = false; render(); }
    }
  };
  const click = async (event) => {
    const button = event.target?.closest?.('[data-ms-action]');
    if (!button || !root.contains(button) || busy || loading || destroyed) return;
    if (button.dataset.msAction === 'refresh') { await refresh(); return; }
    if (button.dataset.msAction === 'chest') { busy = true; render(); let msg = ''; try { const r = await api('/api/missions/chest', 'POST', {}); msg = `🎉 فتحت الصندوق وربحت ${num(r.coins)} عملة!`; } catch (e) { msg = e.message || 'تعذّر فتح الصندوق.'; } busy = false; await refresh(); error = msg; render(); return; }
    if (button.dataset.msAction !== 'claim') return;
    const missionId = button.dataset.msId;
    // عرض الاستحقاق ليس إذناً؛ الخادم يعيد التحقق بالهوية الحالية والتقدم الحالي.
    if (!view?.missions.some((m) => m.id === missionId && m.claimable)) return;
    busy = true; error = ''; render();
    let claimError = '';
    try {
      const result = await api(`/api/missions/${encodeURIComponent(missionId)}/claim`, 'POST', {});
      if (!result?.ok) claimError = messages[result?.code] || 'تعذّر استلام المكافأة. حدّث الصفحة وأعد المحاولة.';
    } catch { claimError = 'تعذّر تأكيد المطالبة. حدّث المهام أو أعد المحاولة؛ الطلب المتكرر لا يمنح مرتين.'; }
    finally {
      if (!destroyed) {
        busy = false;
        await refresh();
        if (claimError) { error = claimError; render(); }
      }
    }
  };
  root.addEventListener('click', click);
  const ready = refresh();
  return { ready, refresh, destroy() { destroyed = true; sequence++; root.removeEventListener('click', click); } };
}
