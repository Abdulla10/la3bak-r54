/* R69zp: نسخة احتياطية خارج السيرفر + استرجاع بضغطة.
 * - بعد كل نسخة يومية: نشفّرها (AES-256-GCM برمز سري) ونرفعها لتخزين سحابي متوافق مع S3
 *   (Cloudflare R2 مجاني لين 10GB، أو Backblaze B2، أو Amazon S3). لو السيرفر احترق، النسخ سليمة.
 * - الاسترجاع: نجهّز النسخة كملف RESTORE-PENDING ونعيد تشغيل السيرفر، وأول ما يقوم يرجّع الملفات قبل لا يحمّل أي بيانات. */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

export type OffsiteCfg = { endpoint: string; bucket: string; keyId: string; secret: string; region: string; password: string };
const MAGIC = Buffer.from('LA3B1');
export function encryptBackup(buf: Buffer, password: string) {
  const salt = randomBytes(16), iv = randomBytes(12), key = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  const c = createCipheriv('aes-256-gcm', key, iv); const ct = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([MAGIC, salt, iv, c.getAuthTag(), ct]);
}
export function decryptBackup(buf: Buffer, password: string) {
  if (!buf.subarray(0, 5).equals(MAGIC)) throw new Error('الملف مو نسخة لعبك المشفّرة.');
  const salt = buf.subarray(5, 21), iv = buf.subarray(21, 33), tag = buf.subarray(33, 49), ct = buf.subarray(49);
  const d = createDecipheriv('aes-256-gcm', scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 }), iv); d.setAuthTag(tag);
  try { return Buffer.concat([d.update(ct), d.final()]); } catch { throw new Error('رمز فك النسخ غلط أو الملف خربان.'); }
}
/** يقرا ملفات tar.gz → [{name,data}] */
export function untar(gz: Buffer) {
  const raw = gunzipSync(gz); const out: { name: string; data: Buffer }[] = [];
  for (let off = 0; off + 512 <= raw.length;) {
    const h = raw.subarray(off, off + 512); if (h.every((b) => b === 0)) break;
    const base = h.subarray(0, 100).toString('utf8').replace(/\0.*$/s, ''), prefix = h.subarray(345, 500).toString('utf8').replace(/\0.*$/s, '');
    const size = parseInt(h.subarray(124, 136).toString('ascii').replace(/\0.*$/s, '').trim() || '0', 8);
    out.push({ name: prefix ? prefix + '/' + base : base, data: Buffer.from(raw.subarray(off + 512, off + 512 + size)) });
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}
export function checkArchive(gz: Buffer) {
  const files = untar(gz); const info = files.find((f) => f.name === 'la3bak-data/BACKUP-INFO.json');
  if (!info) throw new Error('هذي مو نسخة لعبك.'); const meta = JSON.parse(info.data.toString('utf8'));
  return { files: files.length - 1, createdAt: String(meta.createdAt ?? '') };
}
const PENDING = 'RESTORE-PENDING.tar.gz';
/** ينادى أول ما يقوم السيرفر وقبل لا يحمّل أي بيانات */
export function applyPendingRestore(root: string, log: (m: string) => void = console.log) {
  const f = path.join(root, PENDING); if (!existsSync(f)) return false;
  const files = untar(readFileSync(f)); let n = 0;
  for (const e of files) {
    if (!e.name.startsWith('la3bak-data/') || e.name.endsWith('BACKUP-INFO.json')) continue;
    const rel = e.name.slice('la3bak-data/'.length); if (!rel || rel.includes('..') || path.isAbsolute(rel) || rel.startsWith('backups/') || !/\.(json|jsonl|ndjson)$/i.test(rel)) continue;
    const dest = path.join(root, rel); mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.restore-tmp'; writeFileSync(tmp, e.data, { mode: 0o600 }); renameSync(tmp, dest);
    try { unlinkSync(dest + '.bak'); } catch { /* */ } n++;
  }
  renameSync(f, path.join(root, 'backups', 'restored-' + new Date().toISOString().replace(/[:.]/g, '-') + '.tar.gz'));
  log(`[la3bak] restored ${n} data files from backup`); return true;
}
export function stageRestore(root: string, gz: Buffer) { checkArchive(gz); mkdirSync(path.join(root, 'backups'), { recursive: true }); const f = path.join(root, PENDING); writeFileSync(f + '.tmp', gz, { mode: 0o600 }); renameSync(f + '.tmp', f); }

/* ---- S3 (توقيع AWS SigV4) ---- */
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const hmac = (k: Buffer | string, s: string) => createHmac('sha256', k).update(s).digest();
export function signV4(method: string, u: URL, payload: string, amz: string, c: { keyId: string; secret: string; region: string }) {
  const day = amz.slice(0, 8);
  const q = [...u.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const headers: Record<string, string> = { host: u.host, 'x-amz-content-sha256': payload, 'x-amz-date': amz };
  const signed = Object.keys(headers).sort().join(';');
  const canon = [method, u.pathname, q, Object.keys(headers).sort().map((h) => `${h}:${headers[h]}\n`).join(''), signed, payload].join('\n');
  const scope = `${day}/${c.region}/s3/aws4_request`;
  const sts = ['AWS4-HMAC-SHA256', amz, scope, sha(canon)].join('\n');
  const kSig = hmac(hmac(hmac(hmac('AWS4' + c.secret, day), c.region), 's3'), 'aws4_request');
  const sig = createHmac('sha256', kSig).update(sts).digest('hex');
  return { headers, sig, auth: `AWS4-HMAC-SHA256 Credential=${c.keyId}/${scope}, SignedHeaders=${signed}, Signature=${sig}` };
}
async function s3(cfg: OffsiteCfg, method: 'GET' | 'PUT' | 'DELETE', key: string, body?: Buffer, query = '') {
  const u = new URL(cfg.endpoint.replace(/\/+$/, '') + '/' + encodeURIComponent(cfg.bucket) + (key ? '/' + key.split('/').map(encodeURIComponent).join('/') : '') + (query ? '?' + query : ''));
  const amz = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const { headers, auth } = signV4(method, u, body ? sha(body) : sha(''), amz, cfg);
  const r = await fetch(u, { method, headers: { ...headers, Authorization: auth }, body: body ? new Uint8Array(body) : undefined, signal: AbortSignal.timeout(120_000) });
  if (!r.ok) { const t = (await r.text().catch(() => '')).slice(0, 300); const code = /<Code>([^<]+)/.exec(t)?.[1] ?? String(r.status); throw new Error('التخزين السحابي رفض: ' + code); }
  return r;
}
export class Offsite {
  lastError: string | null = null; lastUpload: { name: string; at: number; size: number } | null = null; uploading = false;
  constructor(private cfg: () => OffsiteCfg | null, private keep = 30) {}
  configured() { return !!this.cfg(); }
  async upload(name: string, gz: Buffer) {
    const c = this.cfg(); if (!c) return null; this.uploading = true;
    try {
      const enc = encryptBackup(gz, c.password); await s3(c, 'PUT', 'la3bak-backups/' + name + '.enc', enc);
      this.lastUpload = { name, at: Date.now(), size: enc.length }; this.lastError = null;
      try { const l = await this.list(); for (const x of l.slice(this.keep)) await s3(c, 'DELETE', x.key); } catch { /* التنظيف مو ضروري */ }
      return this.lastUpload;
    } catch (e) { this.lastError = String((e as Error).message).slice(0, 200); throw e; } finally { this.uploading = false; }
  }
  async list() {
    const c = this.cfg(); if (!c) return [];
    const xml = await (await s3(c, 'GET', '', undefined, 'list-type=2&prefix=la3bak-backups%2F&max-keys=1000')).text();
    const items = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((m) => ({ key: /<Key>([^<]+)/.exec(m[1])?.[1] ?? '', size: Number(/<Size>(\d+)/.exec(m[1])?.[1] ?? 0), at: Date.parse(/<LastModified>([^<]+)/.exec(m[1])?.[1] ?? '') || 0 }));
    return items.filter((x) => /^la3bak-backups\/la3bak-[\d-]+\.tar\.gz\.enc$/.test(x.key)).sort((a, b) => b.at - a.at);
  }
  async download(key: string) {
    const c = this.cfg(); if (!c) throw new Error('التخزين السحابي مو مربوط.');
    if (!/^la3bak-backups\/la3bak-[\d-]+\.tar\.gz\.enc$/.test(key)) throw new Error('اسم غير صالح.');
    return decryptBackup(Buffer.from(await (await s3(c, 'GET', key)).arrayBuffer()), c.password);
  }
}
