// R124: ربط Ziina تلقائي — اللاعب يدفع بصفحة Ziina، والسيرفر يتأكد من Ziina نفسها ويشحن العملات المشحونة.
// ما نصدّق المتصفح ولا جسم الويبهوك: كل شحن يصير بعد ما نجيب حالة الدفع من API حق Ziina ونتأكد المبلغ «completed».
import { createHmac, timingSafeEqual } from 'node:crypto';
export const ZIINA_API = process.env.ZIINA_API_BASE || 'https://api-v2.ziina.com/api';
export const ZIINA_IPS = ['3.29.184.186', '3.29.190.95', '20.233.47.127', '13.202.161.181'];
export type ZiinaIntent = { id: string; amount: number; currency_code: string; status: string; redirect_url?: string };
export class Ziina {
  constructor(private token: string, readonly test: boolean, private webhookSecret = '', private fetchFn: typeof fetch = fetch) {}
  get enabled() { return !!this.token; }
  private async call(path: string, init: RequestInit = {}): Promise<any> {
    const r = await this.fetchFn(ZIINA_API + path, { ...init, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(15_000) });
    const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { /* */ }
    if (!r.ok) throw new Error(`ziina_${r.status}:${String(j?.message ?? t).slice(0, 160)}`);
    return j;
  }
  async create(aed: number, message: string, successUrl: string, cancelUrl: string): Promise<ZiinaIntent> {
    const amount = Math.round(aed * 100); if (!(amount >= 200)) throw new Error('المبلغ أقل من 2 درهم.');
    return this.call('/payment_intent', { method: 'POST', body: JSON.stringify({ amount, currency_code: 'AED', message: message.slice(0, 140), success_url: successUrl, cancel_url: cancelUrl, failure_url: cancelUrl, test: this.test }) });
  }
  async registerWebhook(url: string) { return this.call('/webhook', { method: 'POST', body: JSON.stringify({ url, ...(this.webhookSecret ? { secret: this.webhookSecret } : {}) }) }); }
  async get(id: string): Promise<ZiinaIntent> { if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw new Error('bad_id'); return this.call('/payment_intent/' + encodeURIComponent(id)); }
  /** توقيع الويبهوك (لو حطيت سر). بدون سر: نعتمد على إعادة جلب الحالة من API فقط */
  verify(raw: string, sig: string | undefined): boolean {
    if (!this.webhookSecret) return true;
    if (!sig || !/^[0-9a-f]{64}$/i.test(sig)) return false;
    const want = createHmac('sha256', this.webhookSecret).update(raw).digest('hex');
    return timingSafeEqual(Buffer.from(want, 'hex'), Buffer.from(sig.toLowerCase(), 'hex'));
  }
}
