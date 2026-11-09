/** R68y: سجل نشاط اللاعب للإدارة — دخول الموقع والغرف والمباريات.
 * آخر 60 حدث لكل لاعب، ويتحفظ على القرص كل 20 ثانية (مو كل حدث). */
import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';

export type ActivityKind = 'login' | 'room' | 'game';
export type ActivityEv = { t: number; k: ActivityKind; ref: string; label: string };
type Data = { v: 1; u: Record<string, ActivityEv[]> };
const PER_USER = 60, MAX_USERS = 50_000;
const valid = (x: Record<string, unknown>) => x.v === 1 && isObj(x.u);

export class PlayerActivity {
  private d: Data = { v: 1, u: {} };
  private disk: Persister;
  private dirty = false;
  private lastLogin = new Map<string, number>();
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('player-activity', file, () => this.d, now, mon, valid);
    const tm = setInterval(() => this.flush(), 20_000); tm.unref?.();
  }
  flush() { if (this.dirty) { this.dirty = false; if (!this.disk.save()) this.dirty = true; } }
  note(id: string, k: ActivityKind, ref = '', label = '') {
    if (!id) return;
    const t = this.now();
    // الدخول: مرة وحدة كل 10 دقايق (إعادة الاتصال ما تعبي السجل)
    if (k === 'login') { const last = this.lastLogin.get(id) ?? 0; if (t - last < 600_000) return; this.lastLogin.set(id, t); }
    const l = this.d.u[id] ?? (this.d.u[id] = []);
    const prev = l[l.length - 1];
    if (prev && prev.k === k && prev.ref === ref && t - prev.t < 300_000) return; // نفس الغرفة خلال 5 دقايق
    l.push({ t, k, ref: String(ref).slice(0, 60), label: String(label).slice(0, 60) });
    if (l.length > PER_USER) l.splice(0, l.length - PER_USER);
    const ids = Object.keys(this.d.u);
    if (ids.length > MAX_USERS) { ids.sort((a, b) => (this.d.u[a].at(-1)?.t ?? 0) - (this.d.u[b].at(-1)?.t ?? 0)); for (const x of ids.slice(0, ids.length - MAX_USERS)) delete this.d.u[x]; }
    this.dirty = true;
  }
  of(id: string): ActivityEv[] { return structuredClone(this.d.u[id] ?? []).reverse(); }
  lastSeen(id: string): number | null { return this.d.u[id]?.at(-1)?.t ?? null; }
}
