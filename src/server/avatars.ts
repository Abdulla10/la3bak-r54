import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { StorageError, StorageMonitor } from './datafile.js';

/**
 * صورة لكل حساب باسم SHA-256 للمعرّف، ولا يُستخدم المعرّف كمسار أبداً.
 * set متزامن للتخزين فقط: على مسار HTTP استدعاء normalizeAvatar أولاً.
 * sniff فحص توقيع أولي مشترك مع المجتمع، وليس تحققاً من سلامة الصورة.
 * بدون مجلد تبقى الصور في الذاكرة فقط.
 */
export const AVATAR_MAX = 150 * 1024;
export type AvatarType = 'image/jpeg' | 'image/png' | 'image/webp';
const EXT: Record<AvatarType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const EXTS = Object.values(EXT);

/** النوع من البايتات الأولى فقط؛ لا يغني عن فك الترميز الكامل. */
export function sniff(b: Buffer): AvatarType | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

export class Avatars {
  private mem = new Map<string, { buf: Buffer; type: AvatarType; v: number }>();
  /** يُبطَل الكاش بعد تغيير الملفات فقط؛ فشل ما قبل rename يحفظ النسخة السابقة كما هي. */
  private vcache = new Map<string, number | null>();
  constructor(private dir = '', private mon = new StorageMonitor()) { mon.register('avatars', !!dir); }
  private base(id: string) { return path.join(this.dir, createHash('sha256').update(id).digest('hex').slice(0, 40)); }
  private failure(e: unknown): StorageError {
    const raw = e as { code?: unknown; syscall?: unknown } | null;
    const code = typeof raw?.code === 'string' && /^[A-Z0-9_]{1,16}$/.test(raw.code) ? raw.code : 'UNKNOWN';
    const syscall = typeof raw?.syscall === 'string' && /^[a-zA-Z_]{1,16}$/.test(raw.syscall) ? raw.syscall : '';
    // لا مسارات أو نصوص أخطاء أصلية في السجل أو الاستثناء العام.
    this.mon.fail('avatars', { code, syscall });
    return new StorageError('avatars', code);
  }

  get(id: string): { buf: Buffer; type: AvatarType; v: number } | null {
    if (!this.dir) return this.mem.get(id) ?? null;
    for (const [type, ext] of Object.entries(EXT) as [AvatarType, string][]) {
      const f = `${this.base(id)}.${ext}`;
      if (existsSync(f)) {
        try { return { buf: readFileSync(f), type, v: Math.floor(statSync(f).mtimeMs) }; } catch { return null; }
      }
    }
    return null;
  }
  /** رقم نسخة الصورة أو null لو ما فيه صورة؛ يحافظ على صيغة mtime الحالية. */
  version(id: string): number | null {
    if (this.vcache.has(id)) return this.vcache.get(id)!;
    const v = this.readVersion(id);
    if (this.vcache.size > 5000) this.vcache.clear();
    this.vcache.set(id, v);
    return v;
  }
  private readVersion(id: string): number | null {
    if (!this.dir) return this.mem.get(id)?.v ?? null;
    for (const ext of EXTS) {
      const f = `${this.base(id)}.${ext}`;
      try { if (existsSync(f)) return Math.floor(statSync(f).mtimeMs); } catch { /* نكمّل */ }
    }
    return null;
  }
  set(id: string, buf: Buffer, type: AvatarType, now = Date.now()): number {
    if (!this.dir) {
      this.mem.set(id, { buf, type, v: now });
      this.vcache.delete(id);
      return now;
    }
    const ext = EXT[type];
    if (!Object.hasOwn(EXT, type)) throw new TypeError('unsupported_avatar_type');
    const base = this.base(id);
    const f = `${base}.${ext}`;
    // ملف حصري غير قابل للتخمين، في المجلد نفسه حتى يكون rename ذرّياً.
    const tmp = `${f}.${randomUUID()}.tmp`;
    let wrote = false;
    let committed = false;
    try {
      mkdirSync(this.dir, { recursive: true });
      writeFileSync(tmp, buf, { flag: 'wx', mode: 0o600 });
      wrote = true;
      renameSync(tmp, f);
      committed = true;
      this.vcache.delete(id);
      // لا نحذف الوجهة الجديدة أبداً، ولا نحذف أي امتداد قديم قبل نجاح rename.
      this.removeOtherExtensions(base, ext);
      const v = Math.floor(statSync(f).mtimeMs);
      this.mon.ok('avatars');
      return v;
    } catch (e) {
      // فشل ما قبل commit لا يمس الصورة القديمة أو كاشها. لا نمس اسماً متصادماً.
      if (!committed && (wrote || (e as NodeJS.ErrnoException)?.code !== 'EEXIST')) {
        try { unlinkSync(tmp); } catch { /* تنظيف مؤقت فقط؛ الخطأ الأصلي سيُرمى */ }
      }
      throw this.failure(e);
    }
  }
  private removeOtherExtensions(base: string, keep?: string): boolean {
    let any = false;
    let failure: unknown;
    let failed = false;
    for (const ext of EXTS) {
      if (ext === keep) continue;
      try { unlinkSync(`${base}.${ext}`); any = true; }
      catch (e) {
        if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') { failure ??= e; failed = true; }
      }
    }
    if (failed) throw failure;
    return any;
  }
  del(id: string): boolean {
    if (!this.dir) { this.vcache.delete(id); return this.mem.delete(id); }
    // قد يُحذف بعض الامتدادات قبل تعذّر حذف غيرها؛ لا نُرجع نجاحاً كاذباً.
    this.vcache.delete(id);
    try {
      const any = this.removeOtherExtensions(this.base(id));
      this.mon.ok('avatars');
      return any;
    } catch (e) { throw this.failure(e); }
  }
}
