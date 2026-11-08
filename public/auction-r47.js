/* Platform cosmetic auctions only. Parent mounts inside existing authenticated shell. */
const TEXT = {
  bad: 'بيانات الطلب غير صالحة.', conflict: 'استُخدم مفتاح الطلب لمحتوى مختلف. حدّث الصفحة.', forbidden: 'هذا الإجراء غير مسموح لهذا الحساب.',
  ineligible: 'شروط العنصر أو أهلية الحساب غير مستوفاة.', owned: 'تملك هذا العنصر بالفعل.', missing: 'العرض غير موجود.',
  poor: 'رصيدك المتاح لا يكفي؛ المبلغ المحجوز غير قابل للصرف.', low: 'وصل عرض أعلى. حدّث المبلغ ثم أكد مجددًا.', ended: 'انتهى وقت المزايدة.',
  terminal: 'أُغلق هذا العرض نهائيًا.', early: 'لم ينته وقت العرض بعد.', capacity: 'وصل سجل المزاد إلى حده الآمن.',
  unavailable: 'العنصر لم يعد متاحًا وفق الكتالوج المعتمد.', unconfigured: 'خدمة المزاد لم تتهيأ بعد.', overflow: 'تعذر تنفيذ العملية بأمان.'
};
const STATUS = { open: 'مفتوح', settled: 'تم التسليم', cancelled: 'ملغي — أُعيد الحجز', refunded: 'تعذر التسليم — أُعيد الحجز', expired: 'انتهى بلا عروض' };
const number = n => Number(n).toLocaleString('ar-u-nu-latn');
const currency = c => c === 'gems' ? 'جوهرة' : 'عملة';
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
function key() { return globalThis.crypto.randomUUID(); }
/** api(path, {method, body}) must use the SAME authenticated site bridge; body is an object. */
export function auctionView(root, { api, getUserId, refreshMe = async () => {}, toast = () => {} } = {}) {
  if (!root || typeof api !== 'function' || typeof getUserId !== 'function') throw new TypeError('auction_mount_requires_existing_auth_bridge');
  let destroyed = false, loading = false, serverOffset = 0, page = 0, total = 0;
  const pending = new Map();
  const section = el('section', 'auction-r47'); section.dir = 'rtl';
  const title = el('h1', '', 'مزاد المنصة');
  const note = el('p', 'auction-r47-note', 'عناصر تجميلية معتمدة من المنصة فقط، دون إعادة بيع بين اللاعبين. يُحجز أعلى عرض وحده، ويُعاد حجزك كاملًا عند تجاوزه أو إلغاء العرض. الفوز نهائي بلا صرف نقدي أو تحويل عملات.');
  const feedback = el('p', 'auction-r47-feedback'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  const toolbar = el('div', 'auction-r47-toolbar'); const refresh = el('button', '', 'تحديث العروض'); refresh.type = 'button';
  const clock = el('span', 'auction-r47-clock'); toolbar.append(refresh, clock);
  const list = el('div', 'auction-r47-list'); const pager = el('nav', 'auction-r47-pager'); pager.setAttribute('aria-label', 'صفحات المزاد');
  const previous = el('button', '', 'السابق'), next = el('button', '', 'التالي'); previous.type = next.type = 'button'; pager.append(previous, next);
  section.append(title, note, toolbar, feedback, list, pager); root.replaceChildren(section);
  const fail = error => { const code = error?.code || error?.error || error?.message; return TEXT[code] || 'تعذر تأكيد العملية. أعد المحاولة بالمبلغ نفسه للاحتفاظ بمفتاح الطلب، أو حدّث للتحقق من النتيجة.'; };
  async function request(path, options) {
    const response = await api(path, options);
    const result = response && typeof response.json === 'function' ? await response.json() : response;
    if (result?.ok === false) throw Object.assign(new Error(result.code || result.error || 'bad'), result);
    return result;
  }
  function card(lot, names) {
    const item = el('article', 'auction-r47-card'); item.dataset.lotId = lot.id;
    const heading = el('h2', '', names.get(lot.itemId) || lot.itemName || lot.itemId);
    const status = el('span', 'auction-r47-status', STATUS[lot.status] || 'غير معروف');
    const detail = el('dl');
    for (const [label, value] of [['السعر الاحتياطي', `${number(lot.reservePrice)} ${currency(lot.currency)}`], ['أعلى عرض', lot.highestAmount == null ? 'لا يوجد' : `${number(lot.highestAmount)} ${currency(lot.currency)}`], ['نهاية العرض', new Date(lot.endsAt).toLocaleString('ar-u-nu-latn')], ['عدد العروض', number(lot.bidCount)]]) detail.append(el('dt', '', label), el('dd', '', value));
    item.append(heading, status, detail);
    if (lot.held > 0) item.append(el('p', 'auction-r47-held', `حجزك الحالي: ${number(lot.held)} ${currency(lot.currency)} — خارج الرصيد المتاح.`));
    if (lot.won) item.append(el('p', 'auction-r47-held', 'فزت بهذا العنصر وأُضيف إلى مقتنياتك. يمكنك تجهيزه من المتجر.'));
    const ended = lot.settlementPending || lot.endsAt <= Date.now() + serverOffset;
    if (lot.status === 'open' && ended) item.append(el('p', 'auction-r47-pending', 'انتهى وقت المزايدة. التسوية الخادمية قيد التأكيد؛ اضغط تحديث ولا ترسل عرضًا جديدًا.'));
    if (lot.status === 'open' && !ended && lot.minimumBid != null) {
      const form = el('form', 'auction-r47-bid'); const label = el('label', '', `عرضك (${currency(lot.currency)})`);
      const amount = el('input'); amount.type = 'number'; amount.name = 'amount'; amount.min = String(lot.minimumBid); amount.step = '1'; amount.required = true; amount.inputMode = 'numeric'; amount.value = String(pending.get(lot.id)?.amount ?? lot.minimumBid); label.append(amount);
      const submit = el('button', '', lot.mine ? 'زيادة عرضي وحجز المبلغ' : 'تأكيد العرض وحجز المبلغ'); submit.type = 'submit';
      const hint = el('small', '', `الحد الأدنى ${number(lot.minimumBid)}. لا يمكنك سحب العرض؛ يُخصم الحجز فقط مرة واحدة عند الفوز.`);
      form.append(label, hint, submit); item.append(form);
      form.addEventListener('submit', async event => {
        event.preventDefault(); const value = Number(amount.value);
        if (!getUserId()) { feedback.textContent = 'سجّل الدخول بالحساب الحالي للمزايدة.'; return; }
        if (!Number.isSafeInteger(value) || value < lot.minimumBid) { feedback.textContent = 'أدخل عددًا صحيحًا لا يقل عن الحد الأدنى.'; return; }
        const old = pending.get(lot.id), operation = old?.amount === value ? old : { amount: value, key: key() }; pending.set(lot.id, operation);
        submit.disabled = true; amount.disabled = true; feedback.textContent = 'جارٍ التحقق من العرض وحفظ الحجز…';
        try {
          const response = await request(`/api/auction/${encodeURIComponent(lot.id)}/bid`, { method: 'POST', body: operation });
          pending.delete(lot.id); if (destroyed) return;
          feedback.textContent = response.dup ? 'العرض نفسه مؤكد سابقًا، ولم يُحجز مرتين.' : 'تم حفظ العرض والحجز. الرصيد الظاهر هو المتاح للصرف فقط.';
          await refreshMe(); await load(); toast('تم تأكيد عرض المزاد');
        } catch (error) {
          if (!destroyed) { feedback.textContent = fail(error); submit.disabled = false; amount.disabled = false; }
        }
      });
    }
    return item;
  }
  async function load() {
    if (loading || destroyed) return; loading = true; refresh.disabled = true;
    try {
      const result = await request(`/api/auction?offset=${page * 30}&limit=30`, { method: 'GET' }); if (destroyed) return;
      const data = result.auction || result; const lots = Array.isArray(data.lots) ? data.lots : [];
      total = Number.isSafeInteger(data.total) ? data.total : lots.length;
      if (Number.isFinite(data.serverNow)) { serverOffset = data.serverNow - Date.now(); clock.textContent = `وقت الخادم: ${new Date(data.serverNow).toLocaleTimeString('ar-u-nu-latn')}`; }
      const names = new Map((data.items || []).map(i => [i.id, i.name]));
      list.replaceChildren(...lots.map(lot => card(lot, names)));
      if (!lots.length) list.append(el('p', 'auction-r47-empty', 'لا توجد عروض في هذه الصفحة.'));
      previous.disabled = page === 0; next.disabled = (page + 1) * 30 >= total;
    } catch (error) { if (!destroyed) feedback.textContent = fail(error); }
    finally { loading = false; if (!destroyed) refresh.disabled = false; }
  }
  refresh.addEventListener('click', load);
  previous.addEventListener('click', () => { if (page > 0) { page--; load(); } });
  next.addEventListener('click', () => { if ((page + 1) * 30 < total) { page++; load(); } });
  load();
  return { refresh: load, destroy() { destroyed = true; pending.clear(); section.remove(); } };
}
export const mountAuctionR47 = auctionView;
