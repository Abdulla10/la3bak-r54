/** R68z: توثيق الحساب برقم الجوال. R69zc: الرمز يوصل على الواتساب (واتساب للأعمال من Meta).
 * - واتساب: WA_TOKEN و WA_PHONE_ID (و WA_TEMPLATE اسم قالب «المصادقة» المعتمد، الافتراضي la3bak_code، و WA_LANG الافتراضي ar).
 * - المزوّد: Twilio Verify لو انضبطت متغيرات البيئة TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN و TWILIO_VERIFY_SID.
 * - بدون مزوّد: الخدمة «غير متاحة». (للتجربة المحلية فقط: PHONE_DEV_CODES=1 يطلع الرمز بالرد.)
 * - ما نخزن الرقم نفسه: نخزن بصمة HMAC + آخر رقمين بس. والرقم الواحد لحساب واحد. */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';

type Rec = { h: string; tail: string; cc: string; at: number };
type Data = { v: 1; users: Record<string, Rec>; phones: Record<string, string> };
type Pending = { phone: string; h: string; code?: string; exp: number; tries: number };
const valid = (x: Record<string, unknown>) => x.v === 1 && isObj(x.users) && isObj(x.phones);
export const PHONE_COUNTRIES = Object.freeze([['971', 'الإمارات 🇦🇪'], ['966', 'السعودية 🇸🇦'], ['965', 'الكويت 🇰🇼'], ['974', 'قطر 🇶🇦'], ['973', 'البحرين 🇧🇭'], ['968', 'عُمان 🇴🇲'], ['962', 'الأردن 🇯🇴'], ['20', 'مصر 🇪🇬'], ['964', 'العراق 🇮🇶'], ['212', 'المغرب 🇲🇦']] as const);
export class PhoneError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

export class PhoneVerify {
  private d: Data = { v: 1, users: {}, phones: {} };
  private disk: Persister;
  private pending = new Map<string, Pending>();
  private sends = new Map<string, number[]>();
  readonly mode: 'whatsapp' | 'twilio' | 'dev' | 'off';
  constructor(file: string, private secret: string, private env: NodeJS.ProcessEnv, private log: (e: string, d: Record<string, unknown>) => void, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('phone-verify', file, () => this.d, now, mon, valid);
    this.mode = env.WA_TOKEN && env.WA_PHONE_ID ? 'whatsapp' : env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SID ? 'twilio' : env.PHONE_DEV_CODES === '1' && env.NODE_ENV !== 'production' ? 'dev' : 'off';
  }
  private hash(phone: string) { return createHmac('sha256', this.secret).update('phone:' + phone).digest('hex'); }
  status(id: string) { const r = this.d.users[id]; return { channel: this.mode === 'twilio' ? 'sms' : 'whatsapp', available: this.mode !== 'off', verified: !!r, tail: r?.tail ?? '', cc: r?.cc ?? '', at: r?.at ?? null, countries: PHONE_COUNTRIES, pending: this.pending.has(id) && this.pending.get(id)!.exp > this.now() }; }
  verified(id: string) { return !!this.d.users[id]; }
  /** cc = رمز الدولة، num = الرقم المحلي */
  async send(id: string, cc: unknown, num: unknown): Promise<{ devCode?: string }> {
    if (this.mode === 'off') throw new PhoneError('التوثيق بالجوال مو متاح حالياً.', 503);
    if (this.d.users[id]) throw new PhoneError('حسابك موثّق بالجوال من قبل.', 409);
    const c = String(cc ?? ''); if (!PHONE_COUNTRIES.some(([k]) => k === c)) throw new PhoneError('اختر الدولة.');
    let n = String(num ?? '').replace(/[\s\-()]/g, '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/^0+/, '');
    if (!/^\d{6,12}$/.test(n)) throw new PhoneError('رقم الجوال غير صحيح.');
    const phone = '+' + c + n; const h = this.hash(phone);
    const owner = this.d.phones[h]; if (owner && owner !== id) throw new PhoneError('هذا الرقم مستخدم بحساب ثاني.', 409);
    const t = this.now(); const list = (this.sends.get(id) ?? []).filter((x) => t - x < 86_400_000);
    if (list.filter((x) => t - x < 600_000).length >= 3) throw new PhoneError('طلبت رموز كثيرة. جرب بعد 10 دقايق.', 429);
    if (list.length >= 8) throw new PhoneError('وصلت حد الرموز اليوم. جرب بكرة.', 429);
    list.push(t); this.sends.set(id, list);
    const p: Pending = { phone, h, exp: t + 10 * 60_000, tries: 0 };
    if (this.mode === 'twilio') await this.twilio('Verifications', { To: phone, Channel: 'sms', Locale: 'ar' });
    else if (this.mode === 'whatsapp') { p.code = String(randomInt(100000, 1000000)); await this.whatsapp(phone, p.code); }
    else { p.code = String(randomInt(100000, 1000000)); this.log('phone_dev_code', { user: id.slice(0, 8), code: p.code }); }
    this.pending.set(id, p);
    return this.mode === 'dev' ? { devCode: p.code } : {};
  }
  async verify(id: string, code: unknown): Promise<{ tail: string }> {
    const p = this.pending.get(id); const t = this.now();
    if (!p || p.exp < t) throw new PhoneError('انتهى الرمز. اطلب رمز جديد.', 410);
    const c = String(code ?? '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
    if (!/^\d{4,8}$/.test(c)) throw new PhoneError('اكتب الرمز اللي وصلك.');
    if (++p.tries > 5) { this.pending.delete(id); throw new PhoneError('محاولات كثيرة. اطلب رمز جديد.', 429); }
    let ok = false;
    if (this.mode === 'twilio') { const r = await this.twilio('VerificationCheck', { To: p.phone, Code: c }); ok = r?.status === 'approved'; }
    else ok = !!p.code && p.code.length === c.length && timingSafeEqual(Buffer.from(p.code), Buffer.from(c));
    if (!ok) throw new PhoneError('الرمز غلط.');
    const owner = this.d.phones[p.h]; if (owner && owner !== id) throw new PhoneError('هذا الرقم مستخدم بحساب ثاني.', 409);
    const prev = structuredClone(this.d);
    const cc = PHONE_COUNTRIES.find(([k]) => p.phone.startsWith('+' + k))?.[0] ?? '';
    this.d.users[id] = { h: p.h, tail: p.phone.slice(-2), cc, at: t }; this.d.phones[p.h] = id;
    try { this.disk.mustSave(); } catch (e) { this.d = prev; throw e; }
    this.pending.delete(id);
    return { tail: p.phone.slice(-2) };
  }
  /** الإدارة: فك التوثيق (لو اللاعب غيّر رقمه) */
  reset(id: string): boolean { const r = this.d.users[id]; if (!r) return false; const prev = structuredClone(this.d); delete this.d.users[id]; if (this.d.phones[r.h] === id) delete this.d.phones[r.h]; try { this.disk.mustSave(); } catch (e) { this.d = prev; throw e; } return true; }
  /** واتساب Cloud API: قالب «مصادقة» فيه الرمز وزر «نسخ الرمز» */
  private async whatsapp(phone: string, code: string) {
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(this.env.WA_PHONE_ID!)}/messages`;
    const body = { messaging_product: 'whatsapp', to: phone.replace(/^\+/, ''), type: 'template', template: { name: this.env.WA_TEMPLATE || 'la3bak_code', language: { code: this.env.WA_LANG || 'ar' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }, { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }] } };
    try {
      const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + this.env.WA_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
      if (!r.ok) { const j = await r.json().catch(() => null) as { error?: { code?: number } } | null; this.log('phone_wa_error', { status: r.status, code: j?.error?.code ?? 0 });
        if (j?.error?.code === 131026 || j?.error?.code === 131030) throw new PhoneError('هالرقم ما عليه واتساب. تأكد من الرقم.', 400);
        throw new PhoneError('تعذّر إرسال الرمز على الواتساب. تأكد من الرقم وجرب مرة ثانية.', 502); }
    } catch (e) { if (e instanceof PhoneError) throw e; this.log('phone_wa_down', {}); throw new PhoneError('خدمة الواتساب مو متاحة الحين. جرب بعد شوي.', 502); }
  }
  private async twilio(kind: 'Verifications' | 'VerificationCheck', form: Record<string, string>): Promise<{ status?: string } | null> {
    const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(this.env.TWILIO_VERIFY_SID!)}/${kind}`;
    const auth = Buffer.from(`${this.env.TWILIO_ACCOUNT_SID}:${this.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    try {
      const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form), signal: AbortSignal.timeout(10_000) });
      const j = await r.json().catch(() => null) as { status?: string } | null;
      if (!r.ok) { this.log('phone_provider_error', { kind, status: r.status }); if (kind === 'Verifications') throw new PhoneError('تعذّر إرسال الرسالة. تأكد من الرقم وجرب مرة ثانية.', 502); return null; }
      return j;
    } catch (e) { if (e instanceof PhoneError) throw e; this.log('phone_provider_down', { kind }); throw new PhoneError('خدمة الرسائل مو متاحة الحين. جرب بعد شوي.', 502); }
  }
}
