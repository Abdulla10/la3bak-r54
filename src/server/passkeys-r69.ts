/* R69zo: الدخول بـ Face ID / البصمة (Passkeys - WebAuthn).
 * المفتاح السري يبقى بجوال اللاعب (محمي بالوجه أو البصمة)، والسيرفر يحفظ المفتاح العام بس.
 * ما فيه كلمة سر تنسرق، وما ينفع التصيّد (المفتاح مربوط باسم الموقع). */
import { createHash, createPublicKey, randomBytes, verify as cryptoVerify } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

type Cred = { uid: string; spki: string; alg: number; count: number; at: number; used: number; label: string };
type Data = { v: 1; creds: Record<string, Cred> };
const b64u = (b: Buffer) => b.toString('base64url');
const unb = (s: unknown) => { if (typeof s !== 'string' || s.length > 20000 || !/^[A-Za-z0-9_-]*$/.test(s)) throw new PasskeyError('بيانات غير صالحة.'); return Buffer.from(s, 'base64url'); };
export class PasskeyError extends Error {}
export const PASSKEY_MAX = 8;

export class Passkeys {
  private d: Data; private disk: Persister;
  private challenges = new Map<string, { uid: string | null; exp: number; kind: 'reg' | 'login' }>();
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.creds);
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = loaded ? (loaded as unknown as Data) : { v: 1, creds: {} };
    this.disk = new Persister('passkeys', file, () => this.d, now, mon, valid);
  }
  private challenge(uid: string | null, kind: 'reg' | 'login') {
    const t = this.now(); for (const [k, v] of this.challenges) if (v.exp < t) this.challenges.delete(k);
    if (this.challenges.size > 20000) this.challenges.clear();
    const c = b64u(randomBytes(32)); this.challenges.set(c, { uid, exp: t + 5 * 60_000, kind }); return c;
  }
  list(uid: string) { return Object.entries(this.d.creds).filter(([, c]) => c.uid === uid).map(([id, c]) => ({ id: id.slice(0, 10), full: id, label: c.label, at: c.at, used: c.used })); }
  count(uid: string) { return this.list(uid).length; }
  remove(uid: string, idPrefix: string) { const k = Object.keys(this.d.creds).find((id) => this.d.creds[id].uid === uid && id.startsWith(idPrefix) && idPrefix.length >= 6); if (!k) return false; delete this.d.creds[k]; this.disk.save(); return true; }
  regOptions(uid: string, name: string, rpId: string) {
    if (this.count(uid) >= PASSKEY_MAX) throw new PasskeyError(`الحد ${PASSKEY_MAX} أجهزة. احذف جهاز قديم أول.`);
    return {
      challenge: this.challenge(uid, 'reg'), rp: { id: rpId, name: 'لعبك LA3BAK' },
      user: { id: b64u(Buffer.from(uid)), name: name.slice(0, 60) || 'لاعب', displayName: name.slice(0, 60) || 'لاعب' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
      excludeCredentials: this.list(uid).map((c) => ({ type: 'public-key', id: c.full })), timeout: 120000, attestation: 'none',
    };
  }
  private client(raw: Buffer, want: 'webauthn.create' | 'webauthn.get', origins: string[]) {
    let c: { type?: string; challenge?: string; origin?: string };
    try { c = JSON.parse(raw.toString('utf8')); } catch { throw new PasskeyError('بيانات غير صالحة.'); }
    if (c.type !== want) throw new PasskeyError('نوع العملية غلط.');
    if (!c.origin || !origins.includes(c.origin)) throw new PasskeyError('الطلب من موقع ثاني.');
    const ch = this.challenges.get(String(c.challenge)); if (!ch || ch.exp < this.now() || ch.kind !== (want === 'webauthn.create' ? 'reg' : 'login')) throw new PasskeyError('انتهت المهلة، جرّب مرة ثانية.');
    this.challenges.delete(String(c.challenge)); return ch;
  }
  private authData(ad: Buffer, rpId: string) {
    if (ad.length < 37) throw new PasskeyError('بيانات غير صالحة.');
    if (!ad.subarray(0, 32).equals(createHash('sha256').update(rpId).digest())) throw new PasskeyError('المفتاح مو لهذا الموقع.');
    const flags = ad[32]; if (!(flags & 0x01)) throw new PasskeyError('لازم تأكد بنفسك.'); if (!(flags & 0x04)) throw new PasskeyError('لازم Face ID أو البصمة أو رمز الجهاز.');
    return { count: ad.readUInt32BE(33) };
  }
  /** تسجيل: المتصفح يعطينا المفتاح العام جاهز (getPublicKey) */
  register(uid: string, body: Record<string, unknown>, rpId: string, origins: string[], label: string) {
    const id = String(body.id ?? ''); if (!/^[A-Za-z0-9_-]{16,1400}$/.test(id)) throw new PasskeyError('بيانات غير صالحة.');
    const ch = this.client(unb(body.clientDataJSON), 'webauthn.create', origins); if (ch.uid !== uid) throw new PasskeyError('الجلسة تغيّرت.');
    const ad = unb(body.authenticatorData); const { count } = this.authData(ad, rpId);
    const alg = Number(body.alg); if (alg !== -7 && alg !== -257) throw new PasskeyError('نوع المفتاح مو مدعوم.');
    const spki = unb(body.publicKey); try { createPublicKey({ key: spki, format: 'der', type: 'spki' }); } catch { throw new PasskeyError('المفتاح غير صالح.'); }
    if (this.d.creds[id]) throw new PasskeyError('هالجهاز مسجل من قبل.');
    if (this.count(uid) >= PASSKEY_MAX) throw new PasskeyError(`الحد ${PASSKEY_MAX} أجهزة.`);
    this.d.creds[id] = { uid, spki: b64u(spki), alg, count, at: this.now(), used: 0, label: label.slice(0, 40) }; this.disk.save();
    return { ok: true, count: this.count(uid) };
  }
  loginOptions(rpId: string) { return { challenge: this.challenge(null, 'login'), rpId, userVerification: 'required', timeout: 120000, allowCredentials: [] }; }
  /** دخول: نتحقق من التوقيع ونرجع رقم الحساب */
  login(body: Record<string, unknown>, rpId: string, origins: string[]): string {
    const id = String(body.id ?? ''); const cred = this.d.creds[id]; if (!cred) throw new PasskeyError('هالمفتاح مو مسجل عندنا. سجّل دخولك بطريقة ثانية وفعّل Face ID من الإعدادات.');
    const cd = unb(body.clientDataJSON); this.client(cd, 'webauthn.get', origins);
    const ad = unb(body.authenticatorData); const { count } = this.authData(ad, rpId);
    const sig = unb(body.signature); const data = Buffer.concat([ad, createHash('sha256').update(cd).digest()]);
    const key = createPublicKey({ key: Buffer.from(cred.spki, 'base64url'), format: 'der', type: 'spki' });
    if (!cryptoVerify('sha256', data, key, sig)) throw new PasskeyError('ما قدرنا نتحقق. جرّب مرة ثانية.');
    if (body.userHandle && Buffer.from(String(body.userHandle), 'base64url').toString() !== cred.uid) throw new PasskeyError('المفتاح ما يطابق الحساب.');
    if (count > 0 && cred.count > 0 && count <= cred.count) throw new PasskeyError('هالمفتاح شكله منسوخ. تواصل مع الدعم.');
    cred.count = count; cred.used = this.now(); this.disk.save(); return cred.uid;
  }
}
