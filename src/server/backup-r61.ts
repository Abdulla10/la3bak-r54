/* R61: نسخة احتياطية يومية تلقائية لملفات البيانات (الأرصدة والحسابات والمشتريات وكل شي محفوظ بملف).
   - تنحفظ كملف .tar.gz داخل مجلد backups جنب ملفات البيانات، ونخلي آخر 14 نسخة (BACKUP_KEEP).
   - كل ساعة نشيك: لو آخر نسخة أقدم من 24 ساعة نسوي وحدة جديدة. أول تشغيل: بعد دقيقتين.
   - ملفات البيانات تنكتب ذريًّا (ملف مؤقت ثم rename)، فالقراءة دايمًا تشوف نسخة كاملة من كل ملف.
   - الصور (الصور الشخصية ووسائط المجتمع) ما تدخل إلا بـ BACKUP_MEDIA=1 لأنها ممكن تكون كبيرة.
   - المالك يقدر ينزّل أي نسخة من لوحة التحكم عشان يحفظها برا السيرفر. */
import { createReadStream, readdirSync, statSync, readFileSync, writeFileSync, renameSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import type { ServerResponse } from 'node:http';

export type BackupInfo = { name: string; size: number; at: number; files: number };
export type BackupOpts = { dir: string; keep?: number; media?: boolean; skipDirs?: string[]; now?: () => number; log?: (event: string, data?: Record<string, unknown>) => void; everyMs?: number; extraFiles?: () => string[] };

const NAME = /^la3bak-\d{4}-\d{2}-\d{2}-\d{4}\.tar\.gz$/;
const DATA_EXT = /\.(json|jsonl|ndjson)$/i;
const MAX_FILE = 200 * 1024 * 1024;

/** كتلة رأس tar (ustar) لملف عادي */
function header(name: string, size: number, mtime: number): Buffer {
  const h = Buffer.alloc(512);
  let prefix = '', base = name;
  if (Buffer.byteLength(name) > 100) { const cut = name.lastIndexOf('/', 154); prefix = name.slice(0, cut); base = name.slice(cut + 1); }
  h.write(base, 0, 100, 'utf8');
  h.write('0000600\0', 100, 8, 'ascii'); h.write('0000000\0', 108, 8, 'ascii'); h.write('0000000\0', 116, 8, 'ascii');
  h.write(size.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
  h.write(Math.floor(mtime / 1000).toString(8).padStart(11, '0') + '\0', 136, 12, 'ascii');
  h.write('        ', 148, 8, 'ascii'); h.write('0', 156, 1, 'ascii');
  h.write('ustar\0', 257, 6, 'ascii'); h.write('00', 263, 2, 'ascii');
  h.write(prefix, 345, 155, 'utf8');
  let sum = 0; for (const b of h) sum += b;
  h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  return h;
}

export function tarGz(entries: { name: string; data: Buffer; mtime: number }[]): Buffer {
  const parts: Buffer[] = [];
  for (const e of entries) { parts.push(header(e.name, e.data.length, e.mtime), e.data); const pad = (512 - (e.data.length % 512)) % 512; if (pad) parts.push(Buffer.alloc(pad)); }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts), { level: 6 });
}

export class Backups {
  readonly root: string; readonly out: string; private keep: number; private media: boolean; private skip: Set<string>;
  private now: () => number; private log: BackupOpts['log']; private extra: () => string[]; private timer: NodeJS.Timeout | null = null; private first: NodeJS.Timeout | null = null;
  lastError: string | null = null; lastRunAt = 0; running = false;
  constructor(o: BackupOpts) {
    this.root = path.resolve(o.dir); this.out = path.join(this.root, 'backups');
    this.keep = Math.max(1, Math.min(90, o.keep ?? 14)); this.media = !!o.media;
    this.skip = new Set(['backups', 'node_modules', ...(o.skipDirs ?? [])]);
    this.now = o.now ?? Date.now; this.log = o.log; this.extra = o.extraFiles ?? (() => []);
  }
  /** الملفات اللي تدخل بالنسخة (مسارات نسبية) */
  collect(): string[] {
    const files: string[] = [];
    const walk = (dir: string, rel: string, depth: number) => {
      let names: string[] = []; try { names = readdirSync(dir); } catch { return; }
      for (const n of names.sort()) {
        if (n.startsWith('.') || n.endsWith('.tmp') || n.includes('.tmp-') || n === 'lock' || /\.lock$/.test(n)) continue;
        const abs = path.join(dir, n), r = rel ? rel + '/' + n : n; let st; try { st = statSync(abs); } catch { continue; }
        if (st.isDirectory()) { if (depth === 0 && this.skip.has(n)) continue; if (depth < 4) walk(abs, r, depth + 1); }
        else if (st.isFile() && st.size <= MAX_FILE && (DATA_EXT.test(n) || this.media)) files.push(r);
      }
    };
    walk(this.root, '', 0); return files;
  }
  list(): BackupInfo[] {
    let names: string[] = []; try { names = readdirSync(this.out).filter((n) => NAME.test(n)); } catch { return []; }
    return names.map((name) => { const st = statSync(path.join(this.out, name)); let files = 0; try { files = Number(JSON.parse(readFileSync(path.join(this.out, name + '.json'), 'utf8')).files) || 0; } catch { /* قديم */ } return { name, size: st.size, at: st.mtimeMs, files }; }).sort((a, b) => b.at - a.at);
  }
  latest(): BackupInfo | null { return this.list()[0] ?? null; }
  /** يسوي نسخة الحين ويرجع معلوماتها */
  run(reason = 'schedule'): BackupInfo {
    if (this.running) throw new Error('backup_running');
    this.running = true;
    try {
      mkdirSync(this.out, { recursive: true, mode: 0o700 });
      const t = new Date(this.now()); const pad = (n: number) => String(n).padStart(2, '0');
      let name = `la3bak-${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}-${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}.tar.gz`;
      if (existsSync(path.join(this.out, name))) unlinkSync(path.join(this.out, name));
      const rels = this.collect(); const entries: { name: string; data: Buffer; mtime: number }[] = [];
      for (const r of rels) { const abs = path.join(this.root, r); try { entries.push({ name: 'la3bak-data/' + r, data: readFileSync(abs), mtime: statSync(abs).mtimeMs }); } catch { /* انحذف بنص النسخ */ } }
      // ملفات بيانات مضبوطة بمسار برا مجلد البيانات (مثلاً ECONOMY_FILE بمكان ثاني)
      for (const f of new Set(this.extra().filter(Boolean).map((x) => path.resolve(x)))) { const r = path.relative(this.root, f); if (!r.startsWith('..') && !path.isAbsolute(r)) continue; try { const st = statSync(f); if (st.isFile() && st.size <= MAX_FILE) entries.push({ name: 'la3bak-data/_outside' + f.replace(/[^A-Za-z0-9._/-]/g, '_'), data: readFileSync(f), mtime: st.mtimeMs }); } catch { /* مب موجود */ } }
      const manifest = { createdAt: t.toISOString(), reason, files: entries.length, names: entries.map((e) => e.name), note: 'نسخة احتياطية من ملفات بيانات لعبك. للاسترجاع: أوقف الخدمة، فك الملف، وانسخ محتوى la3bak-data مكان مجلد البيانات.' };
      entries.unshift({ name: 'la3bak-data/BACKUP-INFO.json', data: Buffer.from(JSON.stringify(manifest, null, 1)), mtime: this.now() });
      const buf = tarGz(entries);
      const dest = path.join(this.out, name), tmp = dest + '.tmp-' + process.pid;
      writeFileSync(tmp, buf, { mode: 0o600 }); renameSync(tmp, dest);
      writeFileSync(path.join(this.out, name + '.json'), JSON.stringify({ files: entries.length - 1, reason }), { mode: 0o600 });
      this.prune(); this.lastRunAt = this.now(); this.lastError = null;
      this.log?.('backup_done', { name, bytes: buf.length, files: entries.length - 1, reason });
      return { name, size: buf.length, at: this.lastRunAt, files: entries.length - 1 };
    } catch (e) {
      this.lastError = String((e as Error)?.message ?? e).slice(0, 200); this.log?.('backup_failed', { error: this.lastError }); throw e;
    } finally { this.running = false; }
  }
  /** R69: يقرا ملف واحد (مسار نسبي من مجلد البيانات) من داخل نسخة احتياطية */
  readFile(name: string, rel: string): Buffer | null {
    if (!NAME.test(name)) return null;
    let raw: Buffer; try { raw = gunzipSync(readFileSync(path.join(this.out, name))); } catch { return null; }
    const want = 'la3bak-data/' + rel.split(path.sep).join('/');
    for (let off = 0; off + 512 <= raw.length;) {
      const h = raw.subarray(off, off + 512); if (h.every((b) => b === 0)) break;
      const base = h.subarray(0, 100).toString('utf8').replace(/\0.*$/s, ''), prefix = h.subarray(345, 500).toString('utf8').replace(/\0.*$/s, '');
      const full = prefix ? prefix + '/' + base : base; const size = parseInt(h.subarray(124, 136).toString('ascii').replace(/\0.*$/s, '').trim() || '0', 8);
      if (full === want) return Buffer.from(raw.subarray(off + 512, off + 512 + size));
      off += 512 + Math.ceil(size / 512) * 512;
    }
    return null;
  }
  get dataRoot() { return this.root; }
  private prune() {
    for (const b of this.list().slice(this.keep)) { try { unlinkSync(path.join(this.out, b.name)); } catch { /* */ } try { unlinkSync(path.join(this.out, b.name + '.json')); } catch { /* */ } }
  }
  private due() { const l = this.latest(); return !l || this.now() - l.at >= 24 * 3600_000 - 60_000; }
  start(firstDelayMs = 120_000, everyMs = 3600_000) {
    const tick = () => { if (this.due()) { try { this.run('schedule'); } catch { /* مسجّل */ } } };
    this.first = setTimeout(tick, firstDelayMs); this.first.unref?.();
    this.timer = setInterval(tick, everyMs); this.timer.unref?.();
  }
  stop() { if (this.first) clearTimeout(this.first); if (this.timer) clearInterval(this.timer); this.first = this.timer = null; }
  /** ينزّل ملف نسخة (الاسم لازم يطابق الشكل بالضبط — ما فيه مسارات) */
  send(res: ServerResponse, name: string, headers: Record<string, string>): boolean {
    if (!NAME.test(name)) return false; const file = path.join(this.out, name); let st; try { st = statSync(file); } catch { return false; } if (!st.isFile()) return false;
    res.writeHead(200, { ...headers, 'Content-Type': 'application/gzip', 'Content-Length': String(st.size), 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res); return true;
  }
  status() { const l = this.latest(); return { dir: this.out, keep: this.keep, media: this.media, count: this.list().length, latest: l, lastError: this.lastError, running: this.running, ageHours: l ? Math.round((this.now() - l.at) / 360_000) / 10 : null }; }
}
