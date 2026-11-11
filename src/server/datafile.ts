import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, unlinkSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * قراءة وكتابة ملفات بيانات JSON (المحفظة، الصدارة، الحسابات، الهويات) بطريقة تحمي من فقدان البيانات.
 *
 * القاعدة: «ما فيه ملف» = بداية جديدة (طبيعي أول مرة). «فيه ملف لكنه تالف أو ما نقدر نقراه» = نوقف التشغيل،
 * ما نبدأ ببيانات فاضية، وما نكتب فوق الملف. الأصل ما ينلمس، ونحفظ نسخة منه بجانبه للفحص.
 */

export type DataFailReason = 'unreadable' | 'empty' | 'invalid-json' | 'bad-shape';
export interface DataFailure { file: string; reason: DataFailReason; preserved: string | null; bak: 'ok' | 'bad' | 'none' }

const REASON_AR: Record<DataFailReason, string> = {
  unreadable: 'ما نقدر نقرأ الملف (صلاحيات أو خطأ قراءة)',
  empty: 'الملف فاضي',
  'invalid-json': 'محتوى الملف مو JSON صالح',
  'bad-shape': 'بنية الملف غير متوقعة',
};

export class DataFilesCorruptError extends Error {
  constructor(public failures: DataFailure[]) {
    super(`data file(s) corrupt or unreadable: ${failures.map((f) => `${f.file} (${f.reason})`).join(', ')}`);
    this.name = 'DataFilesCorruptError';
  }
}

export const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
/** حقل اختياري: إما غير موجود أو من النوع المطلوب (الملفات القديمة اللي ينقصها حقل تظل تشتغل). */
export const optObj = (v: unknown) => v === undefined || isObj(v);
export const optArr = (v: unknown) => v === undefined || Array.isArray(v);

const errCode = (e: unknown) => (e as { code?: string } | null)?.code;
type DataValidator = (d: Record<string, unknown>) => boolean;
// التسجيل قبل القراءة يشمل أول تشغيل (ENOENT). نفس الملف بمسار نسبي/مطلق له نفس المدقق.
const validators = new Map<string, DataValidator>();
const fileKey = (file: string) => path.resolve(file);
function validData(data: unknown, validate: DataValidator): boolean {
  try { return isObj(data) && validate(data); } catch { return false; }
}

/** هل اللقطة الداخلية .bak موجودة وسليمة؟ (للرسالة فقط) */
function bakStatus(file: string, validate: DataValidator): 'ok' | 'bad' | 'none' {
  const bak = file + '.bak';
  if (!existsSync(bak)) return 'none';
  try { return validData(JSON.parse(readFileSync(bak, 'utf8')), validate) ? 'ok' : 'bad'; } catch { return 'bad'; }
}

/**
 * يقرأ ملف JSON. يرجّع undefined لو الملف غير موجود (بداية جديدة).
 * لو الملف موجود وغير صالح: يحفظ نسخة منه (باسم ثابت من بصمته فلا تتكرر) ويرمي DataFilesCorruptError. ما يعدّل الأصل أبداً.
 */
export function loadJsonFile(file: string, validate: (d: Record<string, unknown>) => boolean): Record<string, unknown> | undefined {
  validators.set(fileKey(file), validate);
  let buf: Buffer;
  try {
    buf = readFileSync(file);
  } catch (e) {
    if (errCode(e) === 'ENOENT') return undefined;
    throw new DataFilesCorruptError([{ file, reason: 'unreadable', preserved: null, bak: bakStatus(file, validate) }]);
  }
  let reason: DataFailReason | null = null;
  let data: unknown;
  if (!buf.toString('utf8').trim()) reason = 'empty';
  else {
    try { data = JSON.parse(buf.toString('utf8')); } catch { reason = 'invalid-json'; }
    if (!reason && !validData(data, validate)) reason = 'bad-shape';
  }
  if (!reason) return data as Record<string, unknown>;
  let preserved: string | null = null;
  const dest = `${file}.corrupt-${createHash('sha256').update(buf).digest('hex').slice(0, 8)}`;
  try {
    if (!existsSync(dest)) writeFileSync(dest, buf, { mode: 0o600, flag: 'wx' });
    preserved = dest;
  } catch { /* فشل حفظ النسخة؛ الأصل يظل سليماً بمكانه */ }
  throw new DataFilesCorruptError([{ file, reason, preserved, bak: bakStatus(file, validate) }]);
}

/** يفحص كل الملفات المضبوطة ويجمع كل التالف في خطأ واحد، عشان يشوف المشغّل المشكلة كاملة مرة وحدة. */
export function checkDataFiles(specs: { file: string; validate: (d: Record<string, unknown>) => boolean }[]) {
  const failures: DataFailure[] = [];
  for (const s of specs) {
    if (!s.file) continue;
    try { loadJsonFile(s.file, s.validate); } catch (e) { if (e instanceof DataFilesCorruptError) failures.push(...e.failures); else throw e; }
  }
  if (failures.length) throw new DataFilesCorruptError(failures);
}

const BAK_MS = 10 * 60_000;
const lastBak = new Map<string, number>();

// بعض الأنظمة لا تدعم fsync للمجلد فقط. أخطاء I/O/امتلاء القرص لا تُخفى أبداً.
const unsupportedDirectorySync = (e: unknown) => ['EINVAL', 'ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'].includes(errCode(e) ?? '')
  || (process.platform === 'win32' && ['EPERM', 'EACCES', 'EISDIR'].includes(errCode(e) ?? ''));
function openDirectory(dir: string): number | undefined {
  try { return openSync(dir, 'r'); } catch (e) { if (!unsupportedDirectorySync(e)) throw e; }
}
function syncDirectory(fd: number | undefined) {
  if (fd === undefined) return;
  try { fsyncSync(fd); } catch (e) { if (!unsupportedDirectorySync(e)) throw e; }
}
function writeSynced(tmp: string, contents: string | Buffer) {
  const fd = openSync(tmp, 'w', 0o600);
  try { writeFileSync(fd, contents); fsyncSync(fd); } finally { closeSync(fd); }
}
/** مزامنة محتوى المؤقت قبل rename ثم المجلد. فشل ما بعد rename يحاول إعادة النسخة السابقة قبل رمي الخطأ. */
function durableReplace(file: string, contents: string | Buffer, tmp = file + '.tmp') {
  const dirfd = openDirectory(path.dirname(file));
  let renamed = false;
  let previous: Buffer | undefined;
  try {
    // الفحص قبل الالتزام يمنع تغيير الأصل إذا كان fsync المجلد معطلاً أصلاً.
    syncDirectory(dirfd);
    try { previous = readFileSync(file); } catch (e) { if (errCode(e) !== 'ENOENT') throw e; }
    writeSynced(tmp, contents);
    renameSync(tmp, file); renamed = true;
    syncDirectory(dirfd);
  } catch (e) {
    if (renamed) {
      try {
        if (previous === undefined) unlinkSync(file);
        else { writeSynced(tmp, previous); renameSync(tmp, file); }
        syncDirectory(dirfd);
      } catch {
        // عطل قرص مستمر بعد rename قد يمنع حتى التراجع؛ لا ندّعي نجاح الحفظ أو التراجع حينها.
        if (e instanceof Error) Object.defineProperty(e, 'rollbackFailed', { value: true });
      }
    }
    try { unlinkSync(tmp); } catch { /* تنظيف بأفضل جهد؛ لا نمس الأصل */ }
    throw e;
  } finally { if (dirfd !== undefined) closeSync(dirfd); }
}

/** لقطة داخلية `.bak` من آخر نسخة سليمة: أول حفظ بعد التشغيل ثم كل 10 دقائق كحد أدنى. لا نكتب فوقها بملف غير صالح. */
function rotateBak(file: string, now: number, validate: DataValidator) {
  const key = fileKey(file);
  const last = lastBak.get(key);
  if (last !== undefined && now - last < BAK_MS) return;
  try {
    const buf = readFileSync(file);
    if (!validData(JSON.parse(buf.toString('utf8')), validate)) return;
    const tmp = file + '.bak.tmp';
    durableReplace(file + '.bak', buf, tmp);
    lastBak.set(key, now);
  } catch { /* ما فيه ملف سابق أو مو صالح: نبقي اللقطة الأخيرة كما هي */ }
}

/** كتابة ذرّية متينة عند دعم النظام (fsync المؤقت ثم rename ثم fsync المجلد) مع اللقطة الداخلية. ليست multiwriter. */
/** R69zx: نسخة من كل حفظ تروح لقاعدة البيانات (لو مفعّلة) */
let dataMirror: ((file: string, contents: string) => void) | null = null;
export function setDataMirror(fn: ((file: string, contents: string) => void) | null) { dataMirror = fn; }
export function saveJsonFile(file: string, data: unknown, now: number, validate?: DataValidator) {
  // المدقق نفسه المستخدم عند القراءة يحمي الحفظ أيضاً، قبل لمس الأصل أو اللقطة.
  const guard = validate ?? validators.get(fileKey(file)) ?? isObj;
  if (!validData(data, guard)) throw Object.assign(new Error('data_shape_invalid'), { code: 'BAD_SHAPE' });
  const contents = JSON.stringify(data);
  // التحقق بعد JSON يمنع قبول شكل يتبدل وقت التسلسل (toJSON أو قيم غير JSON).
  if (!validData(JSON.parse(contents), guard)) throw Object.assign(new Error('data_shape_invalid'), { code: 'BAD_SHAPE' });
  mkdirSync(path.dirname(file), { recursive: true });
  rotateBak(file, now, guard);
  durableReplace(file, contents); // بيانات لاعبين: قراءة المالك فقط
  if (dataMirror) { try { dataMirror(file, contents); } catch { /* المرآة اختيارية وما توقف الحفظ */ } }
}

/** فشل حفظ دائم: العملية ما اكتملت ولا تغيّر شيء. الرسالة عامة عمداً (بدون مسارات ولا تفاصيل نظام). */
export class StorageError extends Error {
  constructor(public store: string, public code: string) {
    super('storage_unavailable');
    this.name = 'StorageError';
  }
}
/** رسالة للاعب عند فشل عملية بسبب التخزين (بلهجة الموقع، بدون تفاصيل تقنية). */
export const STORAGE_MSG = 'تعذّر حفظ العملية الآن، وما تغيّر رصيدك. جرّب بعد شوي.';

type StoreState = 'ok' | 'failing' | 'volatile';
const errCodeOf = (e: unknown) => String((e as { code?: string } | null)?.code ?? 'UNKNOWN').slice(0, 16);
const syscallOf = (e: unknown) => String((e as { syscall?: string } | null)?.syscall ?? '').slice(0, 16);
const LOG_EVERY_MS = 60_000;

/**
 * حالة التخزين الدائم لكل ملفات البيانات. تسجّل أول فشل وكل دقيقة بعده (بدون إغراق السجل) وتسجّل التعافي.
 * السجل فيه: اسم المخزن، رمز الخطأ (EACCES/ENOSPC/...)، اسم العملية، عدد الإخفاقات، ومنذ متى — بدون مسار ولا نص خطأ ولا بيانات.
 */
export class StorageMonitor {
  private st = new Map<string, { state: StoreState; since: number; failures: number; lastLog: number }>();
  constructor(private log: (event: string, data: Record<string, unknown>) => void = () => undefined, private clock: () => number = Date.now) {}
  register(name: string, persistent: boolean) { this.st.set(name, { state: persistent ? 'ok' : 'volatile', since: this.clock(), failures: 0, lastLog: 0 }); }
  fail(name: string, e: unknown) {
    const s = this.st.get(name); if (!s) return;
    const t = this.clock();
    if (s.state !== 'failing') { s.state = 'failing'; s.since = t; s.failures = 0; s.lastLog = 0; }
    s.failures++;
    if (t - s.lastLog >= LOG_EVERY_MS) {
      s.lastLog = t;
      this.log('storage_write_failed', { store: name, code: errCodeOf(e), syscall: syscallOf(e), failures: s.failures, sinceMs: t - s.since });
    }
  }
  ok(name: string) {
    const s = this.st.get(name);
    if (!s || s.state !== 'failing') return;
    this.log('storage_write_recovered', { store: name, failures: s.failures, downMs: this.clock() - s.since });
    s.state = 'ok'; s.failures = 0;
  }
  /** جاهز = ما فيه مخزن فاشل. الذاكرة فقط (بدون ملف) لا تُعتبر فشلاً لكنها تظهر volatile. */
  status() {
    const stores: Record<string, StoreState> = {};
    for (const [k, v] of this.st) stores[k] = v.state;
    return { ready: ![...this.st.values()].some((v) => v.state === 'failing'), stores };
  }
}

/** كاتب ملف واحد: يحفظ كامل الحالة الحالية، ويتذكر لو فشل (dirty) عشان تنعاد المحاولة. */
export class Persister {
  dirty = false;
  /** تغيير بالذاكرة ما انكتب على القرص (ويبقى كذلك لو فشل الحفظ). بعد تراجع العملية (rolledBack) ما فيه شي ضايع فلا نعتبره غير محفوظ. */
  unsaved = false;
  /** رمز آخر خطأ كتابة (للسجل والاستثناء فقط) */
  code = '';
  constructor(private name: string, private file: string, private data: () => unknown, private now: () => number, private mon: StorageMonitor, private validate?: DataValidator) {
    mon.register(name, !!file);
  }
  /** true إذا انحفظ (أو ما فيه ملف مضبوط). false إذا فشل: الحالة تظل بالذاكرة ويُعاد الحفظ لاحقاً. */
  save(rolledBack = false): boolean {
    if (!this.file) return true;
    try {
      saveJsonFile(this.file, this.data(), this.now(), this.validate);
      this.dirty = false;
      this.unsaved = false;
      this.mon.ok(this.name);
      return true;
    } catch (e) {
      this.dirty = true;
      if (!rolledBack) this.unsaved = true;
      this.code = errCodeOf(e);
      this.mon.fail(this.name, e);
      return false;
    }
  }
  /** إعادة محاولة الحفظ إذا كان آخر حفظ فشل. */
  retry() { if (this.dirty) this.save(!this.unsaved); } // إعادة المحاولة ما تغيّر حكم «غير محفوظ»: لو العملية الأصلية تراجعت تظل متراجعة
  /** يحفظ أو يرمي StorageError (للعمليات اللي لازم تنحفظ قبل ما تُعتبر ناجحة) */
  mustSave() { if (!this.save(true)) throw new StorageError(this.name, this.code); }
}

/** رسالة تشغيل واضحة بدون أي محتوى من الملفات (مسارات وأسباب فقط). */
export function describeDataFailure(err: DataFilesCorruptError): string {
  const L: string[] = [];
  L.push('✖ توقّف الخادم عمداً: ملف/ملفات بيانات تالفة أو غير مقروءة.');
  L.push('  لم يُعدَّل أي ملف، ولم يبدأ الخادم ببيانات فاضية، ولن يكتب فوق التالف.');
  for (const f of err.failures) {
    L.push(`  • ${f.file}`);
    L.push(`      السبب: ${REASON_AR[f.reason]}`);
    L.push(`      نسخة محفوظة من التالف: ${f.preserved ?? 'لم تُحفظ (الأصل ما زال سليماً بمكانه، لا تحذفه)'}`);
    L.push(`      اللقطة الداخلية ${path.basename(f.file)}.bak: ${f.bak === 'ok' ? 'موجودة وسليمة' : f.bak === 'bad' ? 'موجودة لكنها غير صالحة' : 'غير موجودة'}`);
  }
  L.push('  الاستعادة الآمنة (بدون حذف أي شيء):');
  L.push('    1) أوقف الخدمة إن كانت تعمل.');
  L.push('    2) إما استعد من نسخة qawwi-backup.sh الأخيرة، أو من اللقطة الداخلية:');
  L.push('         sudo bash ops/qawwi-recover.sh <مسار الملف>   (يتحقق من اللقطة، ويحتفظ بالتالف، ثم يستبدله)');
  L.push('       اللقطة قد تكون أقدم من آخر حفظ بحتى 10 دقائق.');
  L.push('    3) أعد تشغيل الخدمة. إن كان الملف فاضياً عمداً (ملف جديد) انقله جانباً بنفسك وسيبدأ الخادم بملف جديد.');
  return L.join('\n');
}
