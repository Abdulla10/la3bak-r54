/* حالة المنصة العامة: شاشة الصيانة (يفرضها الخادم أصلاً؛ هذي الواجهة فقط تشرح للاعب) وشريط الإعلانات/الفعاليات.
   المصدر: GET /api/status. الطاقم ما تظهر له شاشة الصيانة (يدخل ويلعب)، ويظهر له شريط تنبيه بدلها. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let timer = 0, fast = 0, last = null;
/* صفحة الإدارة تبقى متاحة وقت الصيانة (الخادم هو اللي يتحقق من الرمز/الدور لكل طلب؛ هذي الشاشة فقط شرح) — ما نغطيها بشاشة الصيانة */
const onAdmin = () => /^#\/admin/.test((globalThis.__LA3BAK_NAV__ || location).hash);
const seenKey = 'qa_notice_seen';
const seen = () => { try { return JSON.parse(sessionStorage.getItem(seenKey) || '[]'); } catch { return []; } };
const markSeen = (id) => { try { sessionStorage.setItem(seenKey, JSON.stringify([...new Set([...seen(), id])].slice(-50))); } catch { /* بدون تخزين: يرجع الشريط بعد التحديث */ } };

function paintMaintenance(st) {
  let el = document.getElementById('mtScreen');
  const banned = !!st.ban;
  const show = banned || (st.maintenance.on && !st.staff && !onAdmin());
  if (!show) { el?.remove(); document.documentElement.classList.remove('mt-on'); return; }
  document.documentElement.classList.add('mt-on');
  if (!el) {
    el = document.createElement('div'); el.id = 'mtScreen'; el.className = 'mt-screen'; el.setAttribute('role', 'alert'); el.dir = 'rtl';
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="mt-box"><div class="mt68-logo" aria-hidden="true"><i>👑</i><b>لعبك</b><small>LA3BAK</small></div><div class="mt-ico" aria-hidden="true">🛠️</div>${banned ? `<h1>تم إيقاف حسابك</h1><p>${esc(st.ban.reason || '')}</p><small>للاعتراض تواصل مع إدارة المنصة.</small>` : `<h1>لعبك تحت الصيانة</h1><p>${esc(st.maintenance.message)}</p><small>نتحقق تلقائياً، وترجع لك الصفحة لما تنتهي الصيانة.</small><button type="button" class="btn" id="mtRetry">تحقق الآن</button>`}</div>`;
  const rb = el.querySelector('#mtRetry'); if (rb) rb.onclick = () => checkStatusNow();
}
function paintNotices(st) {
  let bar = document.getElementById('ntBar');
  const list = st.notices.filter((n) => !seen().includes(n.id));
  const staffMt = st.maintenance.on && (st.staff || onAdmin());
  if (!list.length && !staffMt) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'ntBar'; bar.className = 'nt-bar'; bar.dir = 'rtl'; document.body.prepend(bar); }
  bar.innerHTML = (staffMt ? `<div class="nt-row warn"><span>🛠️ وضع الصيانة مفعّل (لوحة الإدارة تشتغل، واللاعبون ممنوعون من الخادم).</span></div>` : '') +
    list.map((n) => `<div class="nt-row ${n.kind}"><span><b>${n.kind === 'event' ? '🎉 فعالية' : '📢 إعلان'}:</b> ${esc(n.title)}${n.body ? ' — ' + esc(n.body) : ''}</span><button type="button" data-nt="${esc(n.id)}" aria-label="إخفاء">✕</button></div>`).join('');
  bar.querySelectorAll('[data-nt]').forEach((b) => { b.onclick = () => { markSeen(b.dataset.nt); paintNotices(last); }; });
}

export async function checkStatusNow() {
  try {
    const r = await fetch('/api/status', { cache: 'no-store' });
    if (!r.ok) return;
    const st = await r.json();
    const was = last && ((last.maintenance.on && !last.staff && !onAdmin()) || last.ban);
    last = st;
    if (was && !st.ban && !(st.maintenance.on && !st.staff && !onAdmin())) { location.reload(); return; } // انتهت الصيانة: نعيد التحميل لحالة نظيفة
    paintMaintenance(st); paintNotices(st);
    schedule(st.maintenance.on && !st.staff && !onAdmin() ? 15_000 : 60_000);
  } catch { /* الشبكة طايحة: نجرّب بالدورة الجاية */ }
}
function schedule(ms) { clearTimeout(timer); timer = setTimeout(checkStatusNow, ms); }
export function initStatus() {
  if (fast) return; fast = 1;
  checkStatusNow();
  window.addEventListener('hashchange', () => { if (last) { paintMaintenance(last); paintNotices(last); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkStatusNow(); });
}
