import { FunctionalHttpError } from './functional-http.js';
import { approvedAuctionItemR47 } from './auction-r47.js';
const ERRORS = { bad: 'بيانات المزاد غير صالحة.', conflict: 'المفتاح استُعمل لطلب مختلف. أعد فتح العرض.', forbidden: 'ما عندك صلاحية لهالعملية.', ineligible: 'حسابك أو رتبتك ما تستوفي شروط المقتنى.', owned: 'أنت تملك هالمقتنى من قبل.', missing: 'المزاد غير موجود.', poor: 'الرصيد المتاح ما يكفي للمزايدة.', low: 'وصل عرض أعلى. حدّث المزاد واختر القيمة الجديدة.', ended: 'انتهت مدة المزاد.', terminal: 'المزاد مغلق.', early: 'المزاد ما انتهى بعد.', capacity: 'وصل المزاد إلى حد العمليات الآمن.', unavailable: 'المقتنى ما عاد متاحًا للمزاد.', unconfigured: 'المزاد غير مهيأ.', overflow: 'المبلغ يتجاوز الحد الآمن.' };
function fields(body, required, optional = []) {
    if (required.some(k => !Object.hasOwn(body, k)) || Object.keys(body).some(k => ![...required, ...optional].includes(k)))
        throw new FunctionalHttpError(400, 'حقول الطلب غير صالحة.');
}
function result(out) { if (out.ok)
    return out; const status = ['forbidden', 'ineligible'].includes(out.code) ? 403 : ['missing'].includes(out.code) ? 404 : ['conflict', 'owned', 'low', 'ended', 'terminal', 'early', 'poor', 'capacity'].includes(out.code) ? 409 : 400; throw new FunctionalHttpError(status, ERRORS[out.code] || 'تعذر تنفيذ المزاد.'); }
function pageValue(value, fallback, max) { if (value === null)
    return fallback; if (!/^\d{1,6}$/.test(value) || Number(value) > max)
    throw new FunctionalHttpError(400, 'قيمة التصفح غير صالحة.'); return Number(value); }
/** Same FunctionalHttp session/origin/JSON/rate guards; no independent listener or financial writer. */
export function wireFeaturesR47(http, d) {
    const display = (id) => d.items().filter(x => x.id === id).map(({ id, name }) => ({ id, name }));
    http.add('GET', '/api/auction', ({ user, url }) => { if (!d.hasAccount(user.id))
        throw new FunctionalHttpError(403, 'حساب فعلي مطلوب.'); const data = d.auction.list(user.id, pageValue(url.searchParams.get('offset'), 0, 512), pageValue(url.searchParams.get('limit'), 30, 100)); return { ok: true, ...data, items: data.lots.flatMap(x => display(x.itemId)) }; });
    http.add('POST', '/api/auction/:id/bid', ({ user, params, body }) => { fields(body, ['amount', 'key']); return result(d.auction.bid(user.id, params.id, body.amount, body.key)); });
    http.add('POST', '/api/auction/:id/settle', ({ user, params, body }) => { fields(body, ['key']); return result(d.auction.settle(user.id, params.id, body.key)); });
    http.add('GET', '/api/admin/auction', ({ user }) => ({ ok: true, ...d.auction.list(user.id, 0, 100), items: d.items().filter(approvedAuctionItemR47).map(({ id, name, slot, price, currency }) => ({ id, name, slot, price, currency })) }), 'owner');
    http.add('POST', '/api/admin/auction', ({ user, actor, body }) => {
        fields(body, ['itemId', 'key'], ['durationMinutes']);
        if (!d.hasAccount(user.id))
            throw new FunctionalHttpError(403, 'سجّل حسابك في الموقع أولًا؛ رمز الإدارة وحده ما ينشئ حساب محفظة.');
        const out = result(d.asAdmin(user.id, () => d.auction.create(user.id, body.itemId, body.key, body.durationMinutes === undefined ? 5 : body.durationMinutes)));
        const auditOk = out.dup ? true : d.audit(actor, 'auction.create', out.lotId, 'مزاد مقتنى معتمد من الكتالوج؛ مدة ' + String(body.durationMinutes ?? 5) + ' دقيقة');
        return { ...out, auditOk };
    }, 'owner');
    http.add('POST', '/api/admin/auction/:id/cancel', ({ user, actor, params, body }) => {
        fields(body, ['key']);
        const out = result(d.asAdmin(user.id, () => d.auction.cancel(user.id, params.id, body.key)));
        const auditOk = out.dup ? true : d.audit(actor, 'auction.cancel', params.id, 'إلغاء المزاد واسترجاع الحجز وفق المحفظة');
        return { ...out, auditOk };
    }, 'owner');
    http.add('GET', '/api/social-private/family', ({ user }) => d.social.familySnapshot(user.id));
    http.add('POST', '/api/social-private/family', ({ user, body }) => d.social.familyCommand(user.id, body));
    return http;
}
