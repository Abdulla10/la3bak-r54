/* R69zk: مفاتيح الخدمات اللي يحطها المالك من لوحته (بدل متغيرات السيرفر). تنحفظ مشفّرة على القرص،
 * وما ترجع للوحة أبد (بس آخر 4 حروف). متغير السيرفر لو موجود يغلب. */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';

const NAMES = ['ANTHROPIC_API_KEY', 'BACKUP_S3_ENDPOINT', 'BACKUP_S3_BUCKET', 'BACKUP_S3_KEY_ID', 'BACKUP_S3_SECRET', 'BACKUP_S3_REGION', 'BACKUP_PASSWORD'] as const;
export type SecretName = typeof NAMES[number];
export class OwnerSecrets {
  private k: Buffer; private d: Record<string, string> = {};
  constructor(private file: string, secret: string) {
    this.k = createHash('sha256').update('la3bak-owner-secrets|' + secret).digest();
    try { if (file && fs.existsSync(file)) { const raw = JSON.parse(fs.readFileSync(file, 'utf8')); if (raw && typeof raw === 'object') for (const n of NAMES) if (typeof raw[n] === 'string') { const v = this.dec(raw[n]); if (v) this.d[n] = v; } } } catch { /* ملف خربان: نتجاهله */ }
  }
  private enc(v: string) { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', this.k, iv); const out = Buffer.concat([c.update(v, 'utf8'), c.final()]); return [iv, c.getAuthTag(), out].map((b) => b.toString('base64url')).join('.'); }
  private dec(s: string) { try { const [iv, tag, out] = s.split('.').map((x) => Buffer.from(x, 'base64url')); const d = createDecipheriv('aes-256-gcm', this.k, iv); d.setAuthTag(tag); return Buffer.concat([d.update(out), d.final()]).toString('utf8'); } catch { return ''; } }
  get(n: SecretName) { return process.env[n] || this.d[n] || ''; }
  source(n: SecretName) { return process.env[n] ? 'env' : this.d[n] ? 'panel' : 'none'; }
  hint(n: SecretName) { const v = this.get(n); return v ? '…' + v.slice(-4) : ''; }
  set(n: SecretName, v: string) {
    if (v) this.d[n] = v; else delete this.d[n];
    if (!this.file) return;
    const raw: Record<string, string> = {}; for (const k of NAMES) if (this.d[k]) raw[k] = this.enc(this.d[k]);
    const tmp = this.file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(raw), { mode: 0o600 }); fs.renameSync(tmp, this.file);
  }
}
/** نتأكد المفتاح شغال: طلب صغير لقائمة الموديلات */
export async function checkAnthropicKey(key: string): Promise<'ok' | 'bad' | 'unknown'> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, signal: AbortSignal.timeout(8000) });
    if (r.ok) return 'ok'; if (r.status === 401 || r.status === 403) return 'bad'; return 'unknown';
  } catch { return 'unknown'; }
}
