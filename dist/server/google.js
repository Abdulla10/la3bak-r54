import { createPublicKey, verify } from 'node:crypto';
/**
 * التحقق من رمز Google ID (JWT, RS256) في الخادم بدون أي مكتبة:
 * التوقيع بمفاتيح Google العامة، ثم iss وaud وexp وiat. ما نحتاج Client Secret (الرمز يجي من زر Google في المتصفح).
 */
export const GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs';
const b64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
export function googleKeyFetcher() {
    let cache = null;
    return async () => {
        if (cache && cache.until > Date.now())
            return cache.keys;
        const r = await fetch(GOOGLE_CERTS, { signal: AbortSignal.timeout(5000) });
        if (!r.ok)
            throw new Error('certs_unavailable');
        const j = (await r.json());
        const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') ?? '');
        cache = { keys: j.keys ?? [], until: Date.now() + Math.min(Number(m?.[1] ?? 3600), 24 * 3600) * 1000 };
        return cache.keys;
    };
}
/** يرجّع بيانات المستخدم أو يرمي خطأ برمز واضح. now بالثواني للاختبار. */
export async function verifyGoogleToken(token, clientId, keys, nowMs = Date.now()) {
    if (typeof token !== 'string' || token.length > 4096)
        throw new Error('bad_token');
    const parts = token.split('.');
    if (parts.length !== 3)
        throw new Error('bad_token');
    let header, payload;
    try {
        header = JSON.parse(b64(parts[0]).toString('utf8'));
        payload = JSON.parse(b64(parts[1]).toString('utf8'));
    }
    catch {
        throw new Error('bad_token');
    }
    if (header.alg !== 'RS256' || typeof header.kid !== 'string')
        throw new Error('bad_alg');
    const jwk = (await keys()).find((k) => k.kid === header.kid);
    if (!jwk)
        throw new Error('unknown_key');
    if (jwk.kty !== 'RSA' || typeof jwk.n !== 'string' || typeof jwk.e !== 'string')
        throw new Error('bad_key');
    // مرّر حقول RSA العامة فقط؛ كائن صريح متوافق مع تعريفات Node وWebCrypto بدون any أو تعطيل TypeScript.
    const key = createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' });
    const ok = verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, b64(parts[2]));
    if (!ok)
        throw new Error('bad_signature');
    const now = Math.floor(nowMs / 1000);
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com')
        throw new Error('bad_iss');
    if (payload.aud !== clientId)
        throw new Error('bad_aud');
    if (typeof payload.exp !== 'number' || payload.exp + 30 < now)
        throw new Error('expired');
    if (typeof payload.iat === 'number' && payload.iat > now + 120)
        throw new Error('bad_iat');
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 64)
        throw new Error('bad_sub');
    if (payload.email && payload.email_verified === false)
        throw new Error('email_unverified');
    return { sub: payload.sub, name: String(payload.name ?? ''), email: payload.email, picture: payload.picture };
}
