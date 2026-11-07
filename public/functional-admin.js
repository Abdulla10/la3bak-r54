const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const key = () => crypto.randomUUID();

export async function mountFunctionalAdmin(root, { api }) {
  if (root.dataset.functionalMounted === '1') return;
  root.dataset.functionalMounted = '1';
  root.innerHTML = '<section class="ad-card"><h2>المهام والمكافآت والدعم</h2><p data-functional-status role="status">جاري تحميل بيانات الخادم…</p></section>';
  const state = (text, bad = false) => { const node = root.querySelector('[data-functional-status]'); if (node) { node.textContent = text; node.className = bad ? 'ad-note bad' : 'ad-note ok'; } };
  try {
    const [missions, ranks, tickets] = await Promise.all([api('missions'), api('rank-rewards'), api('support-notifications/tickets')]);
    if (!root.isConnected) return;
    root.innerHTML = `<p data-functional-status role="status"></p><section class="ad-card"><h2>المهام الخادمية</h2><p>القائمة الحالية من الخادم. لا تتم إضافة مكافآت أو أهداف إلا من إعدادك الصريح. المطالبة مبنية على نتائج اللعب والهدايا الفعلية، مب أرقام الجهاز.</p><form data-fx-policy="missions"><label>تعريفات المهام JSON<textarea class="ad-in" name="definitions" rows="8" dir="ltr" required>${esc(JSON.stringify(missions.definitions, null, 2))}</textarea></label><button class="ad-btn" type="submit">حفظ تعريفات المهام</button></form></section><section class="ad-card"><h2>مكافآت الرتب</h2><p>العناصر والعملات اللي يحددها المالك فقط؛ ما فيه هدايا تلقائية غير معتمدة. الاستلام مرة واحدة لكل استحقاق.</p><form data-fx-policy="rank-rewards"><label>سياسة مكافآت الرتب JSON<textarea class="ad-in" name="policies" rows="8" dir="ltr" required>${esc(JSON.stringify(ranks.policies, null, 2))}</textarea></label><button class="ad-btn" type="submit">حفظ سياسة مكافآت الرتب</button></form></section><section class="ad-card"><h2>إشعار داخلي من الإدارة</h2><form data-fx-announcement><label>العنوان<input class="ad-in" name="title" minlength="3" maxlength="100" required></label><label>المحتوى<textarea class="ad-in" name="body" minlength="3" maxlength="2000" rows="4" required></textarea></label><label>الفئة<select class="ad-in" name="filter"><option value="all">كل الحسابات المسجلة</option><option value="active">المتصلون الآن</option></select></label><button class="ad-btn" type="submit">معاينة الإشعار</button></form><div data-fx-notice-preview></div></section><section class="ad-card"><h2>طلبات الدعم</h2><p>الإجمالي: ${esc(tickets.total)}</p>${tickets.list.length ? tickets.list.map((t) => `<article class="ad-card"><h3>${esc(t.subject)}</h3><p>${esc(t.body)}</p><p>${esc(t.status)} · ${esc(new Date(t.at).toLocaleString('ar-AE'))}</p>${t.replies.map((r) => `<blockquote><b>${esc(r.actor)}</b><p>${esc(r.body)}</p></blockquote>`).join('')}<form data-fx-reply="${esc(t.id)}"><label>رد الإدارة<textarea class="ad-in" name="body" minlength="3" maxlength="2000" required></textarea></label><button class="ad-btn" type="submit">إرسال الرد</button></form></article>`).join('') : '<p>ما فيه طلبات دعم.</p>'}</section>`;
    root.querySelectorAll('[data-fx-policy]').forEach((form) => form.addEventListener('submit', async (event) => {
      event.preventDefault(); const button = form.querySelector('button'); if (button.disabled) return; button.disabled = true;
      try { const route = form.dataset.fxPolicy; const name = route === 'missions' ? 'definitions' : 'policies'; const value = JSON.parse(new FormData(form).get(name)); await api(route, 'POST', { [name]: value, reason: 'تعديل سياسة من المالك', key: key() }); state('تم حفظ السياسة الخادمية.'); }
      catch (e) { state(e.message || 'السياسة غير صالحة.', true); }
      finally { button.disabled = false; }
    }));
    root.querySelectorAll('[data-fx-reply]').forEach((form) => {
      const ref = key();
      form.addEventListener('submit', async (event) => {
        event.preventDefault(); const button = form.querySelector('button'); if (button.disabled) return; button.disabled = true;
        try { await api('support-notifications/tickets/' + form.dataset.fxReply + '/reply', 'POST', { body: new FormData(form).get('body'), key: ref }); state('تم حفظ الرد وإشعار صاحب الطلب.'); }
        catch (e) { state(e.message, true); button.disabled = false; }
      });
    });
    const form = root.querySelector('[data-fx-announcement]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
      try {
        const payload = { ...Object.fromEntries(new FormData(form)), key: key() };
        const preview = await api('support-notifications/announcements/preview', 'POST', payload);
        const target = root.querySelector('[data-fx-notice-preview]');
        target.innerHTML = `<p>المستفيدون: ${esc(preview.beneficiaries)}</p><h3>${esc(payload.title)}</h3><p>${esc(payload.body)}</p><button class="ad-btn" data-confirm-notice>تأكيد الإرسال</button>`;
        target.querySelector('button').addEventListener('click', async (e) => {
          const confirm = e.currentTarget; if (confirm.disabled) return; confirm.disabled = true;
          try { const result = await api('support-notifications/announcements', 'POST', { token: preview.token }); state('تم حفظ الإشعار لـ ' + result.beneficiaries + ' حساب.'); target.innerHTML = ''; }
          catch (error) { state(error.message, true); confirm.disabled = false; }
        });
      } catch (e) { state(e.message, true); }
      finally { button.disabled = false; }
    });
  } catch (e) { state(e.message || 'تعذّر تحميل الإدارة.', true); }
}
