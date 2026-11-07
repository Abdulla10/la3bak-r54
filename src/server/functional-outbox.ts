import { isObj, loadJsonFile, Persister, StorageError, StorageMonitor } from './datafile.js';

export type IntentJson = null | boolean | number | string | IntentJson[] | { [key: string]: IntentJson };
/** تفاصيل الحدث وسياسة النقاط المعتمدة تُحفظ من الخادم؛ لا مبالغ/أوامر دفع أو كائنات تنفيذية. */
export type FunctionalIntentPayload = { kind: 'game' | 'gift'; [key: string]: IntentJson };
export interface FunctionalIntent { ref: string; payload: FunctionalIntentPayload; createdAt: number }
interface OutboxData { v?: 1; intents?: FunctionalIntent[] }
export const OUTBOX_MAX_PENDING = 2000;
export const OUTBOX_MAX_PAYLOAD_BYTES = 16 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const validRef = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9:_-]{1,160}$/.test(v);
function plainJson(v: unknown, depth = 0, seen = new Set<object>()): v is IntentJson {
  if (depth > 20) return false;
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v !== 'object' || !v || seen.has(v)) return false;
  seen.add(v);
  let valid = false;
  if (Array.isArray(v)) valid = v.length <= OUTBOX_MAX_PAYLOAD_BYTES && Reflect.ownKeys(v).length === v.length + 1
    && Array.from({ length: v.length }, (_, i) => Object.getOwnPropertyDescriptor(v, String(i)))
      .every((d) => !!d && 'value' in d && plainJson(d.value, depth + 1, seen));
  else if ([Object.prototype, null].includes(Object.getPrototypeOf(v))) {
    valid = Reflect.ownKeys(v).every((k) => typeof k === 'string' && !['__proto__', 'constructor', 'prototype'].includes(k)
      && !!Object.getOwnPropertyDescriptor(v, k)?.enumerable && 'value' in Object.getOwnPropertyDescriptor(v, k)!
      && plainJson((v as Record<string, unknown>)[k], depth + 1, seen));
  }
  seen.delete(v); return valid;
}
function validPayload(v: unknown): v is FunctionalIntentPayload {
  return isObj(v) && plainJson(v) && (v.kind === 'game' || v.kind === 'gift')
    && Buffer.byteLength(JSON.stringify(v)) <= OUTBOX_MAX_PAYLOAD_BYTES;
}
export function validFunctionalOutbox(v: Record<string, unknown>): boolean {
  if ((v.v !== undefined && v.v !== 1) || (v.intents !== undefined && !Array.isArray(v.intents))) return false;
  const rows = (v.intents ?? []) as unknown[];
  if (rows.length > OUTBOX_MAX_PENDING || Buffer.byteLength(JSON.stringify(v)) > MAX_TOTAL_BYTES) return false;
  const refs = new Set<string>();
  return rows.every((row) => {
    if (!isObj(row) || !validRef(row.ref) || refs.has(row.ref) || !validPayload(row.payload)
      || !Number.isSafeInteger(row.createdAt) || Number(row.createdAt) < 0) return false;
    refs.add(row.ref); return true;
  });
}
/** intent/replay فقط. المستهلك مسؤول عن idempotency وحفظ التقدم قبل settle؛ ليست transaction مع المحفظة. */
export class FunctionalOutbox {
  private d: { v: 1; intents: FunctionalIntent[] } = { v: 1, intents: [] };
  private disk: Persister;
  constructor(file = '', private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) {
      const loaded = loadJsonFile(file, validFunctionalOutbox) as OutboxData | undefined;
      if (loaded) this.d = { v: 1, intents: loaded.intents ?? [] };
    }
    this.disk = new Persister('functionalOutbox', file, () => this.d, now, mon, validFunctionalOutbox);
  }
  /** true لجديد محفوظ؛ false لنفس ref/payload معلق. تعارض المرجع يُرفض؛ فشل الحفظ يرمي ويبقي النية dirty لإعادة المحاولة. */
  enqueue(ref: string, payload: FunctionalIntentPayload): boolean {
    if (!validRef(ref) || !validPayload(payload)) throw new RangeError('functional_outbox_invalid');
    const cloned = JSON.parse(JSON.stringify(payload)) as FunctionalIntentPayload;
    const previous = this.d.intents.find((x) => x.ref === ref);
    if (previous) {
      if (JSON.stringify(previous.payload) !== JSON.stringify(cloned)) throw new RangeError('functional_outbox_conflict');
      if (this.disk.unsaved && !this.disk.save()) throw new StorageError('functionalOutbox', this.disk.code);
      return false;
    }
    const createdAt = this.now();
    if (!Number.isSafeInteger(createdAt) || createdAt < 0) throw new RangeError('functional_outbox_invalid');
    const next = { v: 1 as const, intents: [...this.d.intents, { ref, payload: cloned, createdAt }] };
    if (!validFunctionalOutbox(next)) throw new RangeError('functional_outbox_full'); // لا نسقط أقدم intent.
    this.d = next;
    if (!this.disk.save()) throw new StorageError('functionalOutbox', this.disk.code);
    return true;
  }
  /** Pre-commit back-pressure. Failed reservations roll back; retries pin the original policy/time. */
  reserve(ref: string, payload: FunctionalIntentPayload, createdAt = this.now()): FunctionalIntent {
    if (!validRef(ref) || !validPayload(payload) || !Number.isSafeInteger(createdAt) || createdAt < 0) throw new RangeError('functional_outbox_invalid');
    this.retry();
    if (this.unsaved()) throw new StorageError('functionalOutbox', this.disk.code);
    const previous = this.get(ref);
    if (previous) {
      const identity = (p: FunctionalIntentPayload) => { const { policy, ...source } = p; return JSON.stringify(source); };
      if (identity(previous.payload) !== identity(payload)) throw new RangeError('functional_outbox_conflict');
      return previous;
    }
    const before = this.d;
    const intent = { ref, payload: structuredClone(payload), createdAt };
    const next = { v: 1 as const, intents: [...before.intents, intent] };
    if (!validFunctionalOutbox(next)) throw new RangeError('functional_outbox_full');
    this.d = next;
    try { this.disk.mustSave(); } catch (e) { this.d = before; throw e; }
    return structuredClone(intent);
  }
  get(ref: string): FunctionalIntent | undefined { const intent = this.d.intents.find((x) => x.ref === ref); return intent && structuredClone(intent); }
  /** نسخ مستقلة مرتبة للتشغيل/المؤقت؛ payload لا يخرج إلى عميل أو سجل. unsaved يمنع اعتباره durable. */
  pending(): FunctionalIntent[] { return structuredClone(this.d.intents); }
  /** بعد نجاح حفظ المستهلك فقط. فشل الحفظ يعيد intent ليُعاد بأمان بمفتاح التقدم نفسه. */
  settle(ref: string): boolean {
    if (!validRef(ref)) throw new RangeError('functional_outbox_invalid');
    if (!this.d.intents.some((x) => x.ref === ref)) return false;
    const before = this.d;
    this.d = { v: 1, intents: before.intents.filter((x) => x.ref !== ref) };
    if (!this.disk.save(true)) { this.d = before; throw new StorageError('functionalOutbox', this.disk.code); }
    return true;
  }
  /** Atomic deletion only; callers must establish that every selected intent is safe to settle. */
  settleMany(refs: readonly string[]): number {
    if (!Array.isArray(refs) || refs.length > OUTBOX_MAX_PENDING) throw new RangeError('functional_outbox_invalid');
    const selected = new Set<string>();
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      if (!validRef(ref)) throw new RangeError('functional_outbox_invalid');
      selected.add(ref);
    }
    if (!selected.size) return 0;
    const before = this.d;
    const intents = before.intents.filter((x) => !selected.has(x.ref));
    const removed = before.intents.length - intents.length;
    if (!removed) return 0;
    this.d = { v: 1, intents };
    if (!this.disk.save(true)) { this.d = before; throw new StorageError('functionalOutbox', this.disk.code); }
    return removed;
  }
  /** يعيد الحفظ فقط؛ تنفيذ replay عند الوكيل الرئيسي حتى لا ندخل Wallet/RBAC أو سياسات جديدة هنا. */
  retry(): void { this.disk.retry(); }
  unsaved(): boolean { return this.disk.unsaved; }
}
