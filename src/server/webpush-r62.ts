/* R62: إشعارات الجوال (Web Push) بدون أي مكتبة خارجية — تشفير RFC 8291 (aes128gcm) وتوقيع VAPID (RFC 8292, ES256).
   - مفاتيح VAPID: من البيئة (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY بصيغة base64url) أو تنولد مرة وحدة وتنحفظ بملف vapid.json (0600) جنب البيانات.
   - كل لاعب له لين 5 أجهزة مشتركة. الاشتراك اللي يرجع 404/410 ينحذف.
   - نرسل بس لخوادم الإشعارات المعروفة (Apple / Google / Mozilla / Microsoft) — ما نتصل بأي عنوان ثاني (حماية من SSRF).
   - iPhone: يشتغل بس لو الموقع مضاف للشاشة الرئيسية (iOS 16.4+) — هذا شرط من Apple. */
import { createECDH, createCipheriv, createPrivateKey, createPublicKey, generateKeyPairSync, hkdfSync, randomBytes, sign, type KeyObject } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export type PushSub = { endpoint: string; p256dh: string; auth: string; at: number; ua?: string };
type Data = { v: 1; subs: Record<string, PushSub[]> };
const b64u = (b: Buffer) => b.toString('base64url');
const fromB64u = (s: string) => Buffer.from(s, 'base64url');
const ALLOWED_HOSTS = [/\.googleapis\.com$/, /^fcm\.googleapis\.com$/, /\.push\.apple\.com$/, /^web\.push\.apple\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];
export function allowedEndpoint(s: unknown): s is string {
  if (typeof s !== 'string' || s.length > 1000) return false;
  try { const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password && (u.port === '' || u.port === '443') && ALLOWED_HOSTS.some((r) => r.test(u.hostname)); } catch { return false; }
}
const validData = (v: Record<string, unknown>) => v.v === 1 && isObj(v.subs) && Object.values(v.subs as object).every((l) => Array.isArray(l) && l.length <= 5 && l.every((x) => isObj(x) && allowedEndpoint(x.endpoint) && typeof x.p256dh === 'string' && typeof x.auth === 'string'));

/** تشفير الرسالة لجهاز واحد (RFC 8291) — يرجع جسم الطلب كامل */
export function encryptPayload(payload: Buffer, uaPublicB64: string, authB64: string, salt = randomBytes(16), asPrivate?: Buffer): Buffer {
  const uaPub = fromB64u(uaPublicB64), authSecret = fromB64u(authB64);
  if (uaPub.length !== 65 || uaPub[0] !== 4 || authSecret.length < 16) throw new Error('bad_subscription_keys');
  const asECDH = createECDH('prime256v1'); if (asPrivate) asECDH.setPrivateKey(asPrivate); else asECDH.generateKeys();
  const asPub = asECDH.getPublicKey();
  const shared = asECDH.computeSecret(uaPub);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]);
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, keyInfo, 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const c = createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([c.update(Buffer.concat([payload, Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, ct]);
}

export class WebPush {
  private d: Data = { v: 1, subs: {} };
  private disk: Persister;
  readonly publicKey: string; private priv: KeyObject; private subject: string;
  sent = 0; failed = 0; lastError: string | null = null;
  constructor(file: string, keyFile: string, opts: { subject?: string; now?: () => number; mon?: StorageMonitor; log?: (e: string, d?: Record<string, unknown>) => void } = {}) {
    const mon = opts.mon ?? new StorageMonitor();
    if (file) { const l = loadJsonFile(file, validData); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('web-push', file, () => this.d, opts.now ?? Date.now, mon, validData);
    this.subject = opts.subject || 'https://la3bak.com';
    this.log = opts.log;
    const envPub = process.env.VAPID_PUBLIC_KEY, envPriv = process.env.VAPID_PRIVATE_KEY;
    let pub = '', d = '';
    if (envPub && envPriv) { pub = envPub; d = envPriv; }
    else if (keyFile && existsSync(keyFile)) { try { const j = JSON.parse(readFileSync(keyFile, 'utf8')); pub = j.publicKey; d = j.privateKey; } catch { /* نولد من جديد */ } }
    if (!pub || !d) {
      const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
      const jwk = privateKey.export({ format: 'jwk' }) as { x: string; y: string; d: string };
      pub = b64u(Buffer.concat([Buffer.from([4]), fromB64u(jwk.x), fromB64u(jwk.y)])); d = jwk.d;
      if (keyFile) { try { writeFileSync(keyFile, JSON.stringify({ publicKey: pub, privateKey: d }), { mode: 0o600, flag: 'wx' }); } catch { /* موجود أو ما نقدر نكتب */ } }
    }
    const raw = fromB64u(pub);
    this.publicKey = pub;
    this.priv = createPrivateKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(raw.subarray(1, 33)), y: b64u(raw.subarray(33, 65)), d }, format: 'jwk' });
    createPublicKey(this.priv); // يتأكد إن المفتاح سليم
  }
  private log?: (e: string, d?: Record<string, unknown>) => void;
  count(user: string) { return this.d.subs[user]?.length ?? 0; }
  total() { return Object.values(this.d.subs).reduce((n, l) => n + l.length, 0); }
  subscribe(user: string, sub: unknown, ua = ''): boolean {
    if (!isObj(sub) || !allowedEndpoint(sub.endpoint) || !isObj(sub.keys)) return false;
    const p256dh = String((sub.keys as Record<string, unknown>).p256dh ?? ''), auth = String((sub.keys as Record<string, unknown>).auth ?? '');
    if (fromB64u(p256dh).length !== 65 || fromB64u(auth).length < 16) return false;
    // نفس الجهاز مسجّل عند لاعب ثاني (تبديل حساب على نفس الجوال) → ينتقل
    for (const [u, l] of Object.entries(this.d.subs)) { const k = l.filter((x) => x.endpoint !== sub.endpoint); if (k.length !== l.length) { if (k.length) this.d.subs[u] = k; else delete this.d.subs[u]; } }
    const list = this.d.subs[user] ?? [];
    list.unshift({ endpoint: sub.endpoint as string, p256dh, auth, at: Date.now(), ua: ua.slice(0, 120) });
    this.d.subs[user] = list.slice(0, 5); this.disk.save(); return true;
  }
  unsubscribe(user: string, endpoint: string) { const l = this.d.subs[user]; if (!l) return; const k = l.filter((x) => x.endpoint !== endpoint); if (k.length) this.d.subs[user] = k; else delete this.d.subs[user]; this.disk.save(); }
  private jwt(aud: string) {
    const h = b64u(Buffer.from('{"typ":"JWT","alg":"ES256"}'));
    const p = b64u(Buffer.from(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: this.subject })));
    const sig = sign('sha256', Buffer.from(h + '.' + p), { key: this.priv, dsaEncoding: 'ieee-p1363' });
    return `${h}.${p}.${b64u(sig)}`;
  }
  /** يرسل لكل أجهزة اللاعب. الرسالة: { title, body, url, tag } — صغيرة (أقل من 3KB) */
  async send(user: string, msg: { title: string; body: string; url?: string; tag?: string }): Promise<number> {
    const list = this.d.subs[user]; if (!list?.length) return 0;
    const payload = Buffer.from(JSON.stringify({ title: msg.title.slice(0, 80), body: msg.body.slice(0, 200), url: msg.url && /^#\/|^\//.test(msg.url) ? msg.url : '/', tag: msg.tag?.slice(0, 60) }));
    let ok = 0; const dead: string[] = [];
    await Promise.all(list.map(async (s) => {
      try {
        const u = new URL(s.endpoint);
        const r = await fetch(s.endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000), headers: { TTL: '86400', Urgency: 'normal', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', Authorization: `vapid t=${this.jwt(u.origin)}, k=${this.publicKey}`, ...(msg.tag ? { Topic: msg.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } : {}) }, body: new Uint8Array(encryptPayload(payload, s.p256dh, s.auth)) });
        if (r.status === 404 || r.status === 410) dead.push(s.endpoint);
        else if (r.ok) ok++;
        else { this.failed++; this.lastError = `HTTP ${r.status}`; }
      } catch (e) { this.failed++; this.lastError = String((e as Error).message).slice(0, 120); }
    }));
    if (dead.length) { for (const e of dead) this.unsubscribe(user, e); }
    this.sent += ok; if (ok === 0 && list.length && !dead.length) this.log?.('push_failed', { error: this.lastError });
    return ok;
  }
  status() { return { publicKey: this.publicKey.slice(0, 12) + '…', devices: this.total(), players: Object.keys(this.d.subs).length, sent: this.sent, failed: this.failed, lastError: this.lastError }; }
}
