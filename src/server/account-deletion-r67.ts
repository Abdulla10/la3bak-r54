/** R67ae: حذف الحساب — اللاعب يطلب الحذف، والحساب يتعطل فورًا ويختفي، وعنده 30 يوم يتراجع فيها.
 * بعد 30 يوم الحذف ينفّذ (بيانات اللاعب الشخصية تنمسح، وتبقى السجلات المالية المطلوبة للتدقيق بدون اسم). */
import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';

export const DELETION_GRACE_MS = 30 * 86_400_000;
type Rec = { at: number; executeAt: number; done?: number };
type Data = { v: 1; u: Record<string, Rec> };
const valid = (x: Record<string, unknown>) => x.v === 1 && isObj(x.u) && Object.values(x.u).every((r) => isObj(r) && Number.isSafeInteger(r.at) && Number.isSafeInteger(r.executeAt) && (r.done === undefined || Number.isSafeInteger(r.done)));

export class AccountDeletion {
  private d: Data = { v: 1, u: {} };
  private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('account-deletion', file, () => this.d, now, mon, valid);
  }
  private save(prev: Data) { try { this.disk.mustSave(); } catch (e) { this.d = prev; throw e; } }
  /** طلب جاري (ما انحذف ولا تراجع) */
  pending(id: string): Rec | null { const r = this.d.u[id]; return r && !r.done ? { ...r } : null; }
  deleted(id: string): boolean { return !!this.d.u[id]?.done; }
  /** مخفي عن الناس: طلب جاري أو محذوف */
  hidden(id: string): boolean { return !!this.d.u[id]; }
  request(id: string): Rec {
    const old = this.pending(id); if (old) return old;
    const prev = structuredClone(this.d); const now = this.now();
    this.d.u[id] = { at: now, executeAt: now + DELETION_GRACE_MS }; this.save(prev);
    return { ...this.d.u[id] };
  }
  cancel(id: string): boolean {
    const r = this.d.u[id]; if (!r || r.done) return false;
    const prev = structuredClone(this.d); delete this.d.u[id]; this.save(prev); return true;
  }
  due(): string[] { const now = this.now(); return Object.entries(this.d.u).filter(([, r]) => !r.done && r.executeAt <= now).map(([id]) => id); }
  markDone(id: string): void { const r = this.d.u[id]; if (!r || r.done) return; const prev = structuredClone(this.d); r.done = this.now(); this.save(prev); }
  list(): { id: string; at: number; executeAt: number; done: number | null }[] { return Object.entries(this.d.u).map(([id, r]) => ({ id, at: r.at, executeAt: r.executeAt, done: r.done ?? null })).sort((a, b) => b.at - a.at); }
}
