import { createHash } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import { inspectSession, parseCookies, SESSION_MAX_AGE_MS, SESSION_UUID } from './session.js';
import type { User } from './rooms.js';

interface SessionRecord {
  userId: string;
  expiresAt: number;
  revokedAt?: number;
}
interface SessionData { v: 1; tokens: Record<string, SessionRecord> }

const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const onlyKeys = (obj: Record<string, unknown>, keys: string[]) => Object.keys(obj).every((key) => keys.includes(key));

/** أي تلف في النسخة المحفوظة يوقف التحميل؛ ما نبدأ بسجل فارغ فوق سجل إلغاء قديم. */
export function validSessionRegistry(data: Record<string, unknown>): boolean {
  if (data.v !== 1 || !isObj(data.tokens) || !onlyKeys(data, ['v', 'tokens'])) return false;
  return Object.entries(data.tokens).every(([hash, record]) => /^[0-9a-f]{64}$/.test(hash)
    && isObj(record)
    && onlyKeys(record, ['userId', 'expiresAt', 'revokedAt'])
    && typeof record.userId === 'string' && SESSION_UUID.test(record.userId)
    && timestamp(record.expiresAt)
    && (!Object.hasOwn(record, 'revokedAt') || timestamp(record.revokedAt)));
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * بصمة ربط فقط، مو إثبات دخول: الاستدعاء بوسيط واحد لازم يكون بعد cookieUser.
 * السر الاختياري يضيف فحص التوقيع والعمر، مثل registry.tokenHash. ما فيه تبنّي أو حفظ.
 */
export function sessionTokenHash(header: string | undefined, secret?: string, now = Date.now()): string | null {
  const token = parseCookies(header).qa_s;
  if (!token) return null;
  if (secret !== undefined) return inspectSession(token, secret, now) ? hashToken(token) : null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
  if (parts.some((part) => Buffer.from(part, 'base64url').toString('base64url') !== part)) return null;
  return hashToken(token);
}

/**
 * سجل كاتب واحد: لا يخزن الكوكي ولا الاسم ولا السر، فقط SHA-256 والمعرّف وأوقات العمر/الإلغاء.
 * الملف مطلوب صراحةً؛ المسار الفارغ مسموح للاختبارات فقط، وليس خيار تشغيل مؤقت للإنتاج.
 */
export class SessionRegistry {
  private data: SessionData = { v: 1, tokens: {} };
  private readonly disk: Persister;

  constructor(file: string, private readonly secret: string, private readonly now: () => number = Date.now, mon = new StorageMonitor()) {
    if (!file && process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT) {
      throw new Error('session_registry_file_required');
    }
    if (file) {
      const loaded = loadJsonFile(file, validSessionRegistry);
      if (loaded) this.data = loaded as unknown as SessionData;
    }
    this.disk = new Persister('server-sessions', file, () => this.data, now, mon, validSessionRegistry);
  }

  /** لازم ينحفظ التبنّي قبل قبول جلسة قديمة/غير مسجلة؛ العمر الموجود ما يتجدد أبداً. */
  cookieUser(header: string | undefined): User | null {
    const now = this.now();
    const token = parseCookies(header).qa_s;
    const inspected = inspectSession(token, this.secret, now);
    if (!inspected) return null;
    const hash = hashToken(token);
    const existing = this.data.tokens[hash];
    if (existing) {
      if (existing.userId !== inspected.user.id || existing.revokedAt !== undefined || existing.expiresAt <= now) return null;
      return inspected.user;
    }
    const expiresAt = inspected.expiresAt ?? now + SESSION_MAX_AGE_MS;
    if (!timestamp(expiresAt)) return null;
    this.transaction(() => {
      this.data.tokens[hash] = { userId: inspected.user.id, expiresAt };
    });
    return inspected.user;
  }

  /** يسجل qa_s من Set-Cookie قبل إرسال نجاح إصدار الجلسة؛ يرمي StorageError لو فشل الحفظ. */
  registerCookie(setCookieHeader: string): void {
    this.cookieUser(setCookieHeader);
  }

  /** يلغي التوكن المحدد فقط، حتى لو فيه جلسة ثانية لنفس المستخدم؛ لا يمس غير الموقّع. */
  revokeCookie(header: string | undefined): void {
    const now = this.now();
    const token = parseCookies(header).qa_s;
    const inspected = inspectSession(token, this.secret, now);
    if (!inspected) return;
    const hash = hashToken(token);
    const existing = this.data.tokens[hash];
    if (existing?.revokedAt !== undefined) return;
    const expiresAt = existing?.expiresAt ?? inspected.expiresAt ?? now + SESSION_MAX_AGE_MS;
    if (!timestamp(expiresAt)) return;
    this.transaction(() => {
      this.data.tokens[hash] = { userId: inspected.user.id, expiresAt, revokedAt: now };
    });
  }

  /** للربط بين WebSocket والكوكي نفسه، بدون تعريض نص التوكن للسجل أو ملفات البيانات. */
  tokenHash(header: string | undefined): string | null {
    return sessionTokenHash(header, this.secret, this.now());
  }

  private transaction(change: () => void): void {
    const previous = this.data;
    this.data = structuredClone(previous);
    try {
      change();
      this.disk.mustSave();
    } catch (error) {
      this.data = previous;
      throw error;
    }
  }

  /** R62: الجلسات الشغالة للاعب (بصمات بس — ما فيه توكنات) */
  activeHashes(userId: string): string[] { const now = this.now(); return Object.entries(this.data.tokens).filter(([, r]) => r.userId === userId && r.revokedAt === undefined && r.expiresAt > now).map(([h]) => h); }
  /** R62: يطلّع الحساب من كل الأجهزة إلا الجهاز الحالي (أو جهاز واحد محدد لو only) */
  revokeHashes(userId: string, keep: string | null, only: string | null = null): number {
    const now = this.now(); const targets = Object.entries(this.data.tokens).filter(([h, r]) => r.userId === userId && r.revokedAt === undefined && r.expiresAt > now && h !== keep && (only === null || h === only)).map(([h]) => h);
    if (!targets.length) return 0;
    this.transaction(() => { for (const h of targets) this.data.tokens[h] = { ...this.data.tokens[h], revokedAt: now }; });
    return targets.length;
  }
  retry(): void { this.disk.retry(); }
  unsaved(): boolean { return this.disk.unsaved; }

  /** أعداد فقط؛ ما يعرض بصمات ولا معرّفات حسابات. السجلات ما تنحذف تلقائياً. */
  stats(): { tokens: number; active: number; revoked: number; expired: number } {
    const now = this.now();
    const records = Object.values(this.data.tokens);
    return {
      tokens: records.length,
      active: records.filter((record) => record.revokedAt === undefined && record.expiresAt > now).length,
      revoked: records.filter((record) => record.revokedAt !== undefined).length,
      expired: records.filter((record) => record.expiresAt <= now).length,
    };
  }

  // ما نحذف سجلات منتهية: القديم بلا exp قد يُعاد تبنّيه إذا انحذفت بصمته،
  // وسجل الإلغاء له لازم يبقى حتى بعد انتهاء عمره المحلي. إبقاء الجميع آمن للصيغتين.
}
