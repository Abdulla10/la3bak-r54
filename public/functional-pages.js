import { PERK_ITEMS } from './rank-perks-r56.js?v=r67t';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = (at) => new Date(at).toLocaleString('ar-AE-u-nu-latn');
const error = (root, e) => { const el = root.querySelector('[data-functional-status]'); if (el) { el.textContent = e.message || 'تعذّر تنفيذ الطلب.'; el.setAttribute('role', 'alert'); } };
const key = () => crypto.randomUUID();

export async function supportView(root, { api }) {
  root.innerHTML = '<section class="card"><h1>الدعم والمساعدة</h1><p data-functional-status role="status">جاري تحميل طلباتك…</p></section>';
  try {
    const d = await api('/api/support/tickets');
    if (!root.isConnected) return;
    root.innerHTML = `<section class="card"><h1>الدعم والمساعدة</h1><p>طلبك يُحفظ داخل الموقع وتقدر تتابع رد الإدارة هنا. لا ترسل كلمات مرور أو بيانات دفع.</p><p data-functional-status role="status"></p><form data-support-create><label>عنوان الطلب<input class="input" name="subject" minlength="3" maxlength="100" required></label><label>تفاصيل الطلب<textarea class="input" name="body" minlength="3" maxlength="2000" required rows="4"></textarea></label><button class="btn" type="submit">إرسال الطلب</button></form></section><section class="card"><h2>طلباتك</h2>${d.list.length ? d.list.map((t) => `<article class="card"><h3>${esc(t.subject)}</h3><p>${esc(t.body)}</p><small>${esc(date(t.at))} · ${esc({ open: 'بانتظار الرد', answered: 'تم الرد', closed: 'مغلق' }[t.status])}</small>${t.replies.map((r) => `<blockquote><b>${esc(r.actor)}</b><p>${esc(r.body)}</p><small>${esc(date(r.at))}</small></blockquote>`).join('')}${t.status !== 'closed' ? `<button class="btn ghost" data-ticket-close="${esc(t.id)}">إغلاق الطلب</button>` : ''}</article>`).join('') : '<p>ما عندك طلبات دعم بعد.</p>'}</section>`;
    const form = root.querySelector('[data-support-create]');
    const requestKey = key();
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); const button = form.querySelector('button'); if (button.disabled) return; button.disabled = true;
      try { const body = Object.fromEntries(new FormData(form)); await api('/api/support/tickets', 'POST', { ...body, key: requestKey }); await supportView(root, { api }); }
      catch (e) { error(root, e); button.disabled = false; }
    });
    root.querySelectorAll('[data-ticket-close]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try { await api('/api/support/tickets/' + button.dataset.ticketClose + '/close', 'POST', {}); await supportView(root, { api }); }
      catch (e) { error(root, e); button.disabled = false; }
    }));
  } catch (e) { error(root, e); }
}

export async function administrativeNotificationsView(root, { api }) {
  root.innerHTML = '<section class="card"><h1>إشعارات الإدارة والدعم</h1><p data-functional-status role="status">جاري التحميل…</p></section>';
  try {
    const d = await api('/api/notifications-internal'); if (!root.isConnected) return;
    root.innerHTML = `<section class="card"><h1>إشعارات الإدارة والدعم</h1><p data-functional-status role="status"></p><a class="btn ghost" href="#/notifications">إشعارات المجتمع</a><a class="btn ghost" href="#/messages">الرسائل الخاصة</a><p>غير المقروء: ${esc(d.unread)}</p>${d.list.length ? d.list.map((n) => `<article class="card"><h2>${esc(n.title)}</h2><p>${esc(n.body)}</p><small>${esc(n.actor)} · ${esc(date(n.at))}</small>${!n.read ? `<button class="btn ghost" data-notice-read="${esc(n.id)}">تمت القراءة</button>` : '<p>مقروء</p>'}</article>`).join('') : '<p>ما عندك إشعارات داخلية بعد.</p>'}</section>`;
    root.querySelectorAll('[data-notice-read]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try { await api('/api/notifications-internal/' + button.dataset.noticeRead + '/read', 'POST', {}); await administrativeNotificationsView(root, { api }); }
      catch (e) { error(root, e); button.disabled = false; }
    }));
  } catch (e) { error(root, e); }
}

export async function rankRewardsView(root, { api }) {
  root.innerHTML = '<section class="card"><h1>مكافآت الرتب</h1><p data-functional-status role="status">جاري التحميل…</p></section>';
  try {
    const d = await api('/api/rank-rewards'); if (!root.isConnected) return;
    const rows = [...d.list, ...(d.claims || []).filter((c) => !d.list.some((r) => r.id === c.id))];
    const rewards = (r) => r.rewards ? r.rewards.map((v) => v.type === 'currency' ? `${Number(v.cur === 'gems' ? v.amount * 20 : v.amount).toLocaleString('ar-AE-u-nu-latn')} عملة` : `${PERK_ITEMS[v.itemId]?.name || 'مقتنى خاص'}`).join(' + ') : r.description || '';
    const row = (r) => { const claimed = r.claimed === true || r.status === 'claimed', pending = r.pending === true || r.status === 'pending', allowed = !claimed && (r.claimable === true || pending);
      const label = claimed ? 'تم الاستلام' : pending ? 'استكمال المطالبة المحفوظة' : r.status === 'failed' ? 'تعذّر المنح — راجع الدعم' : allowed ? 'استلام المكافأة' : 'الرتبة المطلوبة غير مكتسبة';
      return `<article class="card"><h2>${esc(r.label || r.id)}</h2><p>${esc(r.system)} · ${esc(r.rank)}</p><p>${esc(rewards(r))}</p><button class="btn" data-rank-claim="${esc(r.id)}" data-reward-fp="${esc(r.fingerprint)}" ${allowed ? '' : 'disabled'}>${label}</button></article>`;
    };
    root.innerHTML = `<section class="card"><h1>مكافآت الرتب</h1><p data-functional-status role="status"></p><p>المكافآت اللي حددها المالك فقط؛ الاستحقاق من رتبتك الفعلية في الخادم.</p>${rows.length ? rows.map(row).join('') : '<p>المالك ما فعّل مكافآت رتب بعد. نقاطك ورتبتك محفوظة، وما بنعرض هدايا وهمية.</p>'}</section>`;
    root.querySelectorAll('[data-rank-claim]:not([disabled])').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try { await api('/api/rank-rewards/' + encodeURIComponent(button.dataset.rankClaim) + '/claim', 'POST', { fingerprint: button.dataset.rewardFp }); await rankRewardsView(root, { api }); }
      catch (e) { error(root, e); button.disabled = false; }
    }));
  } catch (e) { error(root, e); }
}
