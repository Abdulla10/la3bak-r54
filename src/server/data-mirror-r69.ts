/* R69zx: مرآة قاعدة البيانات لملفات البيانات.
 * كل ما ينحفظ ملف بيانات (الحسابات، الأرصدة، الغرف…) ناخذ منه نسخة بقاعدة البيانات MariaDB خلال ثواني.
 * وأول ما يقوم السيرفر: أي ملف ناقص أو خربان يرجع من قاعدة البيانات قبل لا يتحمّل.
 * الملفات تبقى هي الأساس (ما يتغير شي بطريقة الحفظ الحالية) — هذي طبقة أمان إضافية. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';

type Pool = { query(sql: string, values?: unknown[]): Promise<any>; end(): Promise<void> };
const MAX = 14 * 1024 * 1024; // أكبر من كذا ما يدخل حزمة MariaDB الافتراضية

export class DataMirror {
  private q = new Map<string, string>(); private t: NodeJS.Timeout | null = null; private busy = false;
  stats = { written: 0, skipped: 0, failed: 0, restored: 0, lastError: '' as string, lastAt: 0 };
  constructor(private pool: Pool, private root: string, private log: (e: string, d?: Record<string, unknown>) => void) {}
  key(file: string) { const rel = path.relative(this.root, file).split(path.sep).join('/'); return rel.startsWith('..') ? null : rel.slice(0, 190); }
  /** ينادى بعد كل حفظ ناجح للملف */
  note(file: string, contents: string) {
    const k = this.key(file); if (!k || /\.(tmp|bak)$/.test(k) || k.startsWith('backups/')) return;
    if (contents.length > MAX) { this.stats.skipped++; return; }
    this.q.set(k, contents); if (!this.t) { this.t = setTimeout(() => { this.t = null; void this.flush(); }, 2500); this.t.unref?.(); }
  }
  async flush() {
    if (this.busy || !this.q.size) return; this.busy = true;
    const batch = [...this.q]; this.q.clear();
    try {
      for (const [k, body] of batch) {
        try { await this.pool.query('INSERT INTO la3bak_docs (name, body, bytes, sha, updated) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE body=VALUES(body), bytes=VALUES(bytes), sha=VALUES(sha), updated=VALUES(updated)', [k, body, Buffer.byteLength(body), createHash('sha1').update(body).digest('hex'), Date.now()]); this.stats.written++; }
        catch (e) { this.stats.failed++; this.stats.lastError = String((e as Error).message).slice(0, 160); if (!this.q.has(k)) this.q.set(k, body); }
      }
      this.stats.lastAt = Date.now();
    } finally { this.busy = false; if (this.q.size && !this.t) { this.t = setTimeout(() => { this.t = null; void this.flush(); }, 10_000); this.t.unref?.(); } }
  }
  /** قبل تحميل البيانات: نرجّع أي ملف ناقص أو خربان */
  async restoreMissing() {
    const rows: { name: string; sha: string }[] = (await this.pool.query('SELECT name, sha FROM la3bak_docs'))[0];
    for (const r of rows) {
      const f = path.join(this.root, r.name); if (!f.startsWith(this.root + path.sep)) continue;
      let ok = false; if (existsSync(f)) { try { JSON.parse(readFileSync(f, 'utf8')); ok = true; } catch { ok = false; } }
      if (ok) continue;
      const [[row]] = await this.pool.query('SELECT body FROM la3bak_docs WHERE name = ?', [r.name]);
      if (!row?.body) continue;
      try { JSON.parse(row.body); } catch { continue; }
      mkdirSync(path.dirname(f), { recursive: true });
      if (existsSync(f)) { try { renameSync(f, f + '.broken-' + Date.now()); } catch { /* */ } }
      writeFileSync(f + '.mirror-tmp', row.body, { mode: 0o600 }); renameSync(f + '.mirror-tmp', f);
      this.stats.restored++; this.log('data_mirror_restored', { file: r.name });
    }
    return this.stats.restored;
  }
  /** لما السيرفر يطفي: نكتب اللي باقي */
  async close() { if (this.t) clearTimeout(this.t); this.t = null; await this.flush().catch(() => undefined); }
}
