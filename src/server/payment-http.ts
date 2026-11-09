import type http from 'node:http';
import type { Payments } from './payments.js';
import { PaymentsError } from './payments.js';
import { StorageError } from './datafile.js';
import { FunctionalHttp, FunctionalHttpError, type FunctionalContext } from './functional-http.js';
import { KeyedLimiter } from './ratelimit.js';
import type { Platform } from './platform.js';

const MESSAGES: Record<string, string> = {
  payments_unavailable: 'الدفع مقفول الحين؛ ما تم إنشاء دفعة أو إضافة رصيد.',
  complimentary_unavailable: 'الباقات المجانية غير متاحة الحين؛ ما تم إضافة رصيد.',
  claim_rejected: 'تعذّر إضافة الباقة؛ رصيد الحساب تجاوز الحد المسموح.',
  order_not_found: 'الطلب مب موجود في حسابك.', bad_request: 'بيانات الطلب غير صالحة.',
  bad_offset: 'رقم الصفحة غير صالح.', pack_unavailable: 'الباقة أو سعرها مب معتمدين للشحن.',
  key_conflict: 'مفتاح الطلب مرتبط بطلب ثاني؛ راجع سجل مشترياتك.',
  provider_unavailable: 'ما قدرنا نتأكد من مزود الدفع؛ راجع نفس الطلب، ولا تنشئ دفعة ثانية.',
  refund_blocked: 'الاسترجاع يحتاج مراجعة؛ الرصيد المتاح ما يكفي للحجز.',
};
export function paymentHttpError(error: unknown): never {
  if (error instanceof StorageError) throw error;
  if (error instanceof FunctionalHttpError) throw error;
  const status = error instanceof PaymentsError && Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 503;
  const message = error instanceof PaymentsError ? MESSAGES[error.code] : undefined;
  throw new FunctionalHttpError(status, message ?? (status >= 500 ? 'تعذّر تأكيد العملية من الخادم. راجع نفس رقم الطلب؛ ما بنكرر إصدار الرصيد.' : 'الطلب غير صالح أو يحتاج مراجعة من الإدارة.'));
}
const bounded = (value: unknown, maximum: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value);
function fields(ctx: FunctionalContext, allowed: string[]) {
  if (!Object.keys(ctx.body).every(key => allowed.includes(key))) throw new FunctionalHttpError(400, 'هالطلب ما يقبل سعر أو كمية أو بيانات إضافية من المتصفح.');
}
/** Authorization, bans, JSON limits, Origin and x-admin all stay with the existing HTTP bridge. */
export function wirePaymentRoutes(httpRoutes: FunctionalHttp, payments: Payments, platform: Platform, changed: (userId: string) => void) {
  const wrap = (handler: (ctx: FunctionalContext) => unknown | Promise<unknown>) => async (ctx: FunctionalContext) => {
    try { return await handler(ctx); } catch (error) { return paymentHttpError(error); }
  };
  const audit = (ctx: FunctionalContext, action: string, target: string, reason: string) => {
    try { platform.audit({ actorId: ctx.actor!.id, actor: ctx.actor!.name, role: ctx.actor!.role, action, target, detail: reason.slice(0, 300) }); return true; }
    catch { return false; } // the immutable payment audit is already durable; never resubmit a refund because of a secondary audit.
  };
  httpRoutes.add('GET', '/api/payments/packs', wrap(ctx => payments.packs(ctx.user.id)));
  httpRoutes.add('POST', '/api/payments/claims', wrap(async ctx => {
    fields(ctx, ['packId', 'key']);
    if (Object.keys(ctx.body).length !== 2 || !bounded(ctx.body.packId, 80) || !bounded(ctx.body.key, 80)) throw new FunctionalHttpError(400, 'معرّف الباقة ومفتاح العملية مطلوبين.');
    if (process.env.SINGLE_CURRENCY !== '0' && String(ctx.body.packId).startsWith('gems-')) throw new FunctionalHttpError(410, 'باقات الجواهر انشالت — الموقع صار بالعملات بس.');
    const result = await payments.claim(ctx.user.id, ctx.body.packId as string, ctx.body.key as string);
    try { changed(ctx.user.id); } catch { /* The canonical wallet claim is committed; broadcast failure is not grant failure. */ }
    return result;
  }));
  httpRoutes.add('GET', '/api/payments/orders', wrap(ctx => {
    const offset = Number(ctx.url.searchParams.get('offset') ?? '0');
    if (!Number.isSafeInteger(offset) || offset < 0) throw new FunctionalHttpError(400, 'رقم الصفحة غير صالح.');
    return payments.list(ctx.user.id, offset);
  }));
  httpRoutes.add('POST', '/api/payments/orders', wrap(ctx => {
    fields(ctx, ['packId', 'key', 'name', 'email']);
    if (!bounded(ctx.body.packId, 80) || !bounded(ctx.body.key, 80) || !bounded(ctx.body.name, 160) || !bounded(ctx.body.email, 254)) throw new FunctionalHttpError(400, 'راجع اسم صاحب الطلب والبريد ومفتاح العملية.');
    if (process.env.SINGLE_CURRENCY !== '0' && String(ctx.body.packId).startsWith('gems-')) throw new FunctionalHttpError(410, 'باقات الجواهر انشالت — الموقع صار بالعملات بس.');
    return payments.create(ctx.user.id, ctx.body.packId as string, ctx.body.key as string, { name: ctx.body.name as string, email: ctx.body.email as string });
  }));
  httpRoutes.add('GET', '/api/payments/orders/:id', wrap(ctx => payments.get(ctx.user.id, ctx.params.id)));
  httpRoutes.add('POST', '/api/payments/orders/:id/refresh', wrap(async ctx => {
    fields(ctx, []); const order = await payments.refresh(ctx.user.id, ctx.params.id); changed(ctx.user.id); return order;
  }));
  httpRoutes.add('POST', '/api/payments/orders/:id/cancel', wrap(ctx => { fields(ctx, []); return payments.cancel(ctx.user.id, ctx.params.id); }));
  httpRoutes.add('GET', '/api/admin/payments/overview', wrap(ctx => ({ status: payments.status(), ...payments.adminOverview(ctx.url.searchParams.get('q') ?? '') })), 'owner');
  httpRoutes.add('GET', '/api/admin/payments/packs', wrap(() => payments.packs()), 'owner');
  httpRoutes.add('GET', '/api/admin/payments/audit', wrap(() => ({ list: payments.audit() })), 'owner');
  httpRoutes.add('POST', '/api/admin/payments/packs', wrap(ctx => {
    fields(ctx, ['key', 'reason', 'packPrices']);
    if (!bounded(ctx.body.key, 80) || !bounded(ctx.body.reason, 500)) throw new FunctionalHttpError(400, 'سبب اعتماد الأسعار ومفتاح الطلب مطلوبين.');
    const result = payments.configurePrices(ctx.actor!.id, ctx.body.key as string, ctx.body.reason as string, ctx.body.packPrices);
    return { ...payments.packs(), ...result, auditOk: result.duplicate || audit(ctx, 'payments.prices', 'cash-packs', ctx.body.reason as string) };
  }), 'owner');
  httpRoutes.add('POST', '/api/admin/payments/orders/:id/refund', wrap(async ctx => {
    fields(ctx, ['key', 'reason']);
    if (!bounded(ctx.body.key, 80) || !bounded(ctx.body.reason, 500)) throw new FunctionalHttpError(400, 'سبب الاسترجاع ومفتاح الطلب مطلوبين.');
    const order = await payments.refund(ctx.actor!.id, ctx.params.id, ctx.body.key as string, ctx.body.reason as string);
    changed(order.userId);
    return { ...order, auditOk: audit(ctx, 'payments.refund', ctx.params.id, ctx.body.reason as string) };
  }), 'owner');
  return httpRoutes;
}
function rawBody(req: http.IncomingMessage, limit = 131072): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let bytes = 0, settled = false; const chunks: Buffer[] = [];
    const clean = () => { req.off('data', data); req.off('end', end); req.off('aborted', abort); req.off('error', abort); req.off('close', close); };
    const fail = (status: number) => { if (settled) return; settled = true; chunks.length = 0; clean(); req.once('error', () => undefined); req.resume(); reject(new FunctionalHttpError(status, 'إشعار الدفع غير صالح أو تجاوز الحد.')); };
    const data = (chunk: Buffer) => { if (!Buffer.isBuffer(chunk)) return fail(400); bytes += chunk.length; if (bytes > limit) return fail(413); chunks.push(chunk); };
    const end = () => { if (settled) return; settled = true; clean(); resolve(Buffer.concat(chunks, bytes)); };
    const abort = () => fail(400); const close = () => { if (!settled) fail(400); };
    req.on('data', data); req.once('end', end); req.once('error', abort); req.once('aborted', abort); req.once('close', close);
    if (req.aborted || req.destroyed) return fail(400);
    if (Number(req.headers['content-length'] ?? 0) > limit) fail(413);
  });
}
/** Signed provider callbacks are outside player auth/maintenance, never outside signature and server retrieval. */
export function paymentWebhookHandler(payments: Payments, json: (res: http.ServerResponse, status: number, body: unknown) => void) {
  const limiter = new KeyedLimiter(120, 20);
  return async (req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname === '/api/payments/return') {
      const id = url.searchParams.get('orderId') ?? '';
      if (req.method !== 'GET' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        json(res, req.method !== 'GET' ? 405 : 400, { error: 'رابط الرجوع غير صالح.' });
      } else {
        // No provider request, no wallet effect, no user-supplied destination. Account ownership is checked by GET orders/:id.
        res.writeHead(303, { Location: '/#/payments/return/' + encodeURIComponent(id), 'Cache-Control': 'no-store' });
        res.end();
      }
      return true;
    }
    if (!['/api/payments/webhook', '/api/payments/webhook/tap'].includes(url.pathname)) return false;
    try {
      if (req.method !== 'POST') throw new FunctionalHttpError(405, 'الطريقة غير مسموحة.');
      if (!limiter.allow(req.socket.remoteAddress ?? 'unknown')) { req.resume(); throw new FunctionalHttpError(429, 'طلبات كثيرة؛ أعد إرسال الإشعار لاحقًا.'); }
      if (String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase() !== 'application/json') { req.resume(); throw new FunctionalHttpError(415, 'المطلوب إشعار JSON.'); }
      const signature = req.headers.hashstring;
      if (typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) { req.resume(); throw new FunctionalHttpError(400, 'توقيع الإشعار غير صالح.'); }
      const raw = await rawBody(req);
      const result = await payments.webhook(raw, signature);
      json(res, 200, result);
    } catch (error) {
      try { paymentHttpError(error); } catch (safe) {
        if (safe instanceof StorageError) json(res, 503, { error: 'تعذّر حفظ التأكيد؛ أعد إرسال نفس الإشعار لاحقًا.', storage: true });
        else if (safe instanceof FunctionalHttpError) json(res, safe.status, { error: safe.message });
        else json(res, 503, { error: 'تعذّر معالجة الإشعار.' });
      }
    }
    return true;
  };
}
