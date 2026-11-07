import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
const COOKIE = 'qa_s';
const MAX_AGE_S = 60 * 60 * 24 * 365;
export const SESSION_MAX_AGE_MS = MAX_AGE_S * 1000;
export const SESSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s) => Buffer.from(s, 'base64url').toString('utf8');
function sign(payload, secret) {
    return createHmac('sha256', secret).update(payload).digest('base64url');
}
export function cleanName(input) {
    return String(input ?? '')
        .replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 20);
}
// قائمة أساسية للكلمات المسيئة الواضحة (مطابقة لكلمة كاملة بعد توحيد الحروف). تقدر تزيدها حسب الحاجة.
const BAD_WORDS = ['شرموطه', 'شرموطة', 'قحبه', 'قحبة', 'منيوك', 'منيك', 'عرص', 'متناك', 'كس', 'زب', 'نيك', 'ابن الكلب', 'ولد الحرام', 'لعنه', 'ملعون'];
const norm = (s) => s.replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
/** يرجع رسالة الخطأ لو الاسم مرفوض (HTML/سكربت/روابط/كلمات مسيئة)، أو null لو سليم */
export function nameProblem(name) {
    if (/[<>&"'`{}\\]/.test(name))
        return 'الاسم فيه رموز غير مسموحة. استخدم حروف وأرقام فقط.';
    if (/(javascript|data|vbscript)\s*:|:\/\/|www\.|\.(com|net|org)\b/i.test(name))
        return 'ما نقبل روابط أو أكواد داخل الاسم.';
    const n = norm(name);
    const tokens = n.split(/[\s._\-]+/);
    if (BAD_WORDS.some((w) => { const k = norm(w); return k.includes(' ') ? n.includes(k) : tokens.includes(k); })) {
        return 'الاسم فيه كلمة غير لائقة، اختر اسم ثاني.';
    }
    return null;
}
/** الأوقات بالملّي ثانية؛ كل إصدار له معرّف مستقل حتى لو الحساب نفسه. */
export function encodeSession(user, secret, now = Date.now()) {
    if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + SESSION_MAX_AGE_MS)) {
        throw new RangeError('invalid_session_time');
    }
    const payload = b64(JSON.stringify({ id: user.id, name: user.name, iat: now, exp: now + SESSION_MAX_AGE_MS, jti: randomUUID() }));
    return `${payload}.${sign(payload, secret)}`;
}
/** توقيع وصيغة base64url قانونية فقط؛ ما نقبل لاحقة أو ترميز بديل لنفس التوقيع. */
export function inspectSession(token, secret, now = Date.now()) {
    if (!token || !Number.isSafeInteger(now) || now < 0)
        return null;
    const parts = token.split('.');
    if (parts.length !== 2)
        return null;
    const [payload, sig] = parts;
    if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(sig))
        return null;
    if (Buffer.from(payload, 'base64url').toString('base64url') !== payload)
        return null;
    const expected = sign(payload, secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
        return null;
    try {
        const data = JSON.parse(unb64(payload));
        if (!data || typeof data !== 'object' || Array.isArray(data))
            return null;
        const { id, name, iat, exp, jti } = data;
        if (typeof id !== 'string' || !SESSION_UUID.test(id) || typeof name !== 'string')
            return null;
        const n = cleanName(name);
        if (!n)
            return null;
        const user = { id, name: n };
        // فقط جلسة قديمة بلا أي حقل حديث، مو جلسة حديثة ناقصة أو exp=null.
        const modern = ['iat', 'exp', 'jti'].some((key) => Object.hasOwn(data, key));
        if (!modern)
            return { user, expiresAt: null, jti: null, legacy: true };
        if (typeof iat !== 'number' || typeof exp !== 'number' || !Number.isSafeInteger(iat) || !Number.isSafeInteger(exp))
            return null;
        if (iat < 0 || iat > now || exp <= iat || exp <= now || exp - iat > SESSION_MAX_AGE_MS)
            return null;
        if (typeof jti !== 'string' || !SESSION_UUID.test(jti))
            return null;
        return { user, expiresAt: exp, jti, legacy: false };
    }
    catch {
        return null;
    }
}
export function decodeSession(token, secret, now = Date.now()) {
    return inspectSession(token, secret, now)?.user ?? null;
}
export function parseCookies(header) {
    const out = {};
    for (const part of (header ?? '').split(';')) {
        const i = part.indexOf('=');
        if (i > 0) {
            const key = part.slice(0, i).trim();
            Object.defineProperty(out, key, { value: part.slice(i + 1).trim(), writable: true, enumerable: true, configurable: true });
        }
    }
    return out;
}
export function sessionFromCookieHeader(header, secret, now = Date.now()) {
    return decodeSession(parseCookies(header)[COOKIE], secret, now);
}
export function sessionCookie(user, secret, secure, now = Date.now()) {
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
export function clearCookie(secure) {
    return [`${COOKIE}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax', ...(secure ? ['Secure'] : [])].join('; ');
}
