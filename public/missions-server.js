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
  rewards.coins ? `${num(rewards.coins)} عملة` : '', rewards.gems ? `${num(rewards.gems)} جوهرة` : '',
  ...(rewards.items || []).map((id) => `عنصر: ${id}`),
].filter(Boolean).join(' + ');

/** api(fullPath, method='GET', body?) => JSON أو يرمي. يرد {refresh,destroy,ready}. */
export function missionsServerView(root, { api }) {
  if (!root || typeof root.addEventListener !== 'function' || typeof api !== 'function') throw new TypeError('missions_view_invalid');
  let view = null, error = '', loading = false, busy = false, destroyed = false, sequence = 0;
  const render = () => {
    if (destroyed) return;
    if (!view) {
      root.innerHTML = `<section class="card empty-state"><h2>المهام الرسمية</h2><p ${error ? 'role="alert"' : 'role="status"'}>${esc(error || 'جاري تحميل المهام…')}</p>${error ? '<button class="btn" type="button" data-ms-action="refresh">إعادة المحاولة</button>' : ''}</section>`;
      return;
    }
    const row = (m) => {
      const value = Math.max(0, Math.min(m.goal, m.value));
      const percent = m.goal > 0 ? Math.min(100, value / m.goal * 100) : 0;
      return `<li class="ms ${m.done ? 'done' : ''}"><div><b>${esc(m.title)}</b><small>${num(value)} / ${num(m.goal)}</small><i class="ms-bar" role="progressbar" aria-label="${esc(m.title)}" aria-valuemin="0" aria-valuemax="${esc(m.goal)}" aria-valuenow="${esc(value)}"><u style="width:${percent}%"></u></i><small>${esc(rewardText(m.rewards))}</small></div>${m.claimed ? '<span class="badge live">استلمتها</span>' : m.claimable ? `<button class="btn" type="button" data-ms-action="claim" data-ms-id="${esc(m.id)}" ${busy || loading ? 'disabled' : ''}>${m.pending ? 'استكمال المطالبة' : 'استلم'}</button>` : '<span class="badge">قيد التقدم</span>'}</li>`;
    };
    const section = (scope, title) => {
      const missions = view.missions.filter((m) => m.scope === scope);
      const end = new Date(view.windows[scope].endAt).toLocaleString('ar-EG-u-nu-latn', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' });
      return `<section class="card"><h2>${title}</h2>${missions.length ? `<ul class="ms-list">${missions.map(row).join('')}</ul><p class="hint">تتجدد: ${esc(end)} UTC</p>` : '<p class="hint">لا توجد مهام نشطة حالياً.</p>'}</section>`;
    };
    root.innerHTML = `<div class="stack"><section class="card"><h2>المهام الرسمية</h2><p class="hint">التقدم من مبارياتك والهدايا الفعلية على الخادم فقط. يتجدد اليوم بتوقيت UTC، والأسبوع يبدأ الاثنين. النجوم المحلية ليست عملة أو خبرة رسمية.</p>${error ? `<p role="alert">${esc(error)}</p>` : ''}<button class="btn ghost" type="button" data-ms-action="refresh" ${busy || loading ? 'disabled' : ''}>${loading ? 'جاري التحديث…' : 'تحديث'}</button></section>${section('daily', 'مهام اليوم')}${section('weekly', 'مهام الأسبوع')}</div>`;
  };
  const refresh = async () => {
    if (destroyed) return;
    const request = ++sequence;
    loading = true; error = ''; render();
    try {
      const result = await api('/api/missions', 'GET');
      if (destroyed || request !== sequence) return;
      view = unwrap(result);
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
