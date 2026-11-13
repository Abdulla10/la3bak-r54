import { moderateText } from './moderation-r58.js';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { User } from './rooms.js';

const COOKIE = 'qa_s';
const MAX_AGE_S = 60 * 60 * 24 * 365;
export const SESSION_MAX_AGE_MS = MAX_AGE_S * 1000;
export const SESSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function cleanName(input: unknown): string {
  return String(input ?? '')
    .replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

// قائمة أساسية للكلمات المسيئة الواضحة (مطابقة لكلمة كاملة بعد توحيد الحروف). تقدر تزيدها حسب الحاجة.
const BAD_WORDS = ['شرموطه', 'شرموطة', 'قحبه', 'قحبة', 'منيوك', 'منيك', 'عرص', 'متناك', 'كس', 'زب', 'نيك', 'ابن الكلب', 'ولد الحرام', 'لعنه', 'ملعون'];
const norm = (s: string) => s.replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();

/** يرجع رسالة الخطأ لو الاسم مرفوض (HTML/سكربت/روابط/كلمات مسيئة)، أو null لو سليم */
/** allowStaff: حسابات الإدارة (من لوحة التحكم) تقدر تسمّي نفسها «الإدارة» أو «الدعم» */
export function nameProblem(name: string, opts: { allowStaff?: boolean } = {}): string | null {
  if (/[<>&"'`{}\\]/.test(name)) return 'الاسم فيه رموز غير مسموحة. استخدم حروف وأرقام فقط.';
  if (/(javascript|data|vbscript)\s*:|:\/\/|www\.|\.(com|net|org)\b/i.test(name)) return 'ما نقبل روابط أو أكواد داخل الاسم.';
  const n = norm(name);
  const tokens = n.split(/[\s._\-]+/);
  if (BAD_WORDS.some((w) => { const k = norm(w); return k.includes(' ') ? n.includes(k) : tokens.includes(k); })) {
    return 'الاسم فيه كلمة غير لائقة، اختر اسم ثاني.';
  }
  // R58: المراجعة التلقائية الموحّدة (روابط، أرقام تواصل، انتحال صفة الإدارة، كلمات مسيئة إضافية)
  const m = moderateText(name, 'profile-name');
  return m.ok || (opts.allowStaff && m.code === 'moderation_impersonation') ? null : m.message;
}

/** الأوقات بالملّي ثانية؛ كل إصدار له معرّف مستقل حتى لو الحساب نفسه. */
export function encodeSession(user: User, secret: string, now = Date.now()): string {
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + SESSION_MAX_AGE_MS)) {
    throw new RangeError('invalid_session_time');
  }
  const payload = b64(JSON.stringify({ id: user.id, name: user.name, iat: now, exp: now + SESSION_MAX_AGE_MS, jti: randomUUID() }));
  return `${payload}.${sign(payload, secret)}`;
}

export interface InspectedSession {
  user: User;
  /** القديم ما فيه exp؛ السجل يحدد عمره مرّة وحدة عند أول تبنّي. */
  expiresAt: number | null;
  jti: string | null;
  legacy: boolean;
}

/** توقيع وصيغة base64url قانونية فقط؛ ما نقبل لاحقة أو ترميز بديل لنفس التوقيع. */
export function inspectSession(token: string | undefined, secret: string, now = Date.now()): InspectedSession | null {
  if (!token || !Number.isSafeInteger(now) || now < 0) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return null;
  if (Buffer.from(payload, 'base64url').toString('base64url') !== payload) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data: unknown = JSON.parse(unb64(payload));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const { id, name, iat, exp, jti } = data as Record<string, unknown>;
    if (typeof id !== 'string' || !SESSION_UUID.test(id) || typeof name !== 'string') return null;
    const n = cleanName(name);
    if (!n) return null;
    const user = { id, name: n };
    // فقط جلسة قديمة بلا أي حقل حديث، مو جلسة حديثة ناقصة أو exp=null.
    const modern = ['iat', 'exp', 'jti'].some((key) => Object.hasOwn(data, key));
    if (!modern) return { user, expiresAt: null, jti: null, legacy: true };
    if (typeof iat !== 'number' || typeof exp !== 'number' || !Number.isSafeInteger(iat) || !Number.isSafeInteger(exp)) return null;
    if (iat < 0 || iat > now || exp <= iat || exp <= now || exp - iat > SESSION_MAX_AGE_MS) return null;
    if (typeof jti !== 'string' || !SESSION_UUID.test(jti)) return null;
    return { user, expiresAt: exp, jti, legacy: false };
  } catch {
    return null;
  }
}

export function decodeSession(token: string | undefined, secret: string, now = Date.now()): User | null {
  return inspectSession(token, secret, now)?.user ?? null;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      const key = part.slice(0, i).trim();
      Object.defineProperty(out, key, { value: part.slice(i + 1).trim(), writable: true, enumerable: true, configurable: true });
    }
  }
  return out;
}

export function sessionFromCookieHeader(header: string | undefined, secret: string, now = Date.now()): User | null {
  return decodeSession(parseCookies(header)[COOKIE], secret, now);
}

export function sessionCookie(user: User, secret: string, secure: boolean, now = Date.now()): string {
  return [
    `${COOKIE}=${encodeSession(user, secret, now)}`,
    'Path=/',
    `Max-Age=${MAX_AGE_S}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export const newUserId = () => randomUUID();

/** يمسح كوكي الجلسة (تسجيل الخروج) */
export function clearCookie(secure: boolean): string {
  return [`${COOKIE}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax', ...(secure ? ['Secure'] : [])].join('; ');
}
