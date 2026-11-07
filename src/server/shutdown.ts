/**
 * محاولة أخيرة لحفظ المعلّق عند الإيقاف، ضمن مهلة محددة.
 * ما نضمن الحفظ: لو ظل التخزين معطلاً حتى نهاية المهلة نرجّع clean=false مع الأعداد والأسماء فقط (بدون أي بيانات لاعبين).
 * ملاحظة: كتابة الملفات متزامنة، فلو القرص نفسه معلّق (مثل NFS متعطل) قد ما ترجع المحاولة قبل المهلة؛ حينها systemd
 * يقتل العملية بعد TimeoutStopSec، والمعلّق يضيع.
 */
export interface Unsaved { pendingPayouts: number; stores: string[] }
export interface FlushReport extends Unsaved { clean: boolean; attempts: number; elapsedMs: number; storageFailing: boolean }

/** الوعود اللي بدأت وما خلصت بعد تُحسب معلّقة حتى لو أعلام dirty بعدها ما تغيّرت. */
export class PendingWrites {
  private pending = new Map<string, number>();
  has(name: string) { return this.pending.has(name); }
  stores() { return [...this.pending.keys()]; }
  begin(name: string): () => void {
    this.pending.set(name, (this.pending.get(name) ?? 0) + 1);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      const left = this.pending.get(name)! - 1;
      if (left) this.pending.set(name, left); else this.pending.delete(name);
    };
  }
  track<T>(name: string, work: () => Promise<T>): Promise<T> {
    const finish = this.begin(name);
    try {
      return Promise.resolve(work()).then(
        (value) => { finish(); return value; },
        (error) => { finish(); throw error; },
      );
    } catch (error) { finish(); return Promise.reject(error); }
  }
}

export async function flushUnsaved(
  timeoutMs: number,
  io: { retry: () => void; unsaved: () => Unsaved; failing: () => boolean },
  clock: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<FlushReport> {
  const t0 = clock();
  const deadline = t0 + timeoutMs;
  let attempts = 0;
  let u: Unsaved;
  for (;;) {
    io.retry(); attempts++;
    // نعطي retry سريع فرصة يخلص؛ الوعد البطيء يظل محسوب بدون تعطيل مهلة الإغلاق.
    await sleep(0);
    u = io.unsaved();
    if (!u.pendingPayouts && !u.stores.length) break;
    const left = deadline - clock();
    if (left <= 0) break;
    await sleep(Math.min(250, left));
  }
  const clean = !u.pendingPayouts && !u.stores.length;
  return { clean, attempts, elapsedMs: clock() - t0, pendingPayouts: u.pendingPayouts, stores: u.stores, storageFailing: io.failing() };
}
