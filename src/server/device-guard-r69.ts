/* R69za: كشف الحسابات الوهمية. كل جهاز ياخذ رقم عشوائي (كوكي + تخزين المتصفح)، وما نحفظ IP ولا بيانات الجهاز.
 * لو نفس الجهاز دخل منه أكثر من حسابين، الحسابات الزايدة (بالترتيب: الثالث وطالع) ما تاخذ جوائز مجانية
 * (الصناديق، جوائز ألعاب الغرف، ظرف الحظ)، ويوصل تنبيه للمالك. المالك يقدر يسمح لجهاز (مثلاً عائلة على جهاز واحد). */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export const DEVICE_ALLOWED = 2;
const DID = /^[A-Za-z0-9_-]{20,64}$/;
type Dev = { ids: string[]; first: number; last: number; allowed?: boolean };
type Net = { ids: { id: string; at: number }[]; last: number };
type Data = { v: 1; dev: Record<string, Dev>; byId: Record<string, string[]>; alerted: string[]; net?: Record<string, Net> };

export class DeviceGuard {
  private d: Data;
  private disk: Persister;
  constructor(file: string, private deps: { alert: (did: string, ids: string[]) => void; now?: () => number }, mon = new StorageMonitor()) {
    const fresh: Data = { v: 1, dev: {}, byId: {}, alerted: [] };
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.dev) && isObj(x.byId);
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = loaded ? { ...fresh, ...(loaded as unknown as Data) } : fresh;
    this.disk = new Persister('device-guard', file, () => this.d, deps.now ?? Date.now, mon, valid);
  }
  static valid(did: unknown): did is string { return typeof did === 'string' && DID.test(did); }
  /** نسجل إن الحساب دخل من هالجهاز. يرجع عدد الحسابات على الجهاز */
  see(did: string, uid: string): number {
    if (!DeviceGuard.valid(did) || !uid) return 0;
    const t = (this.deps.now ?? Date.now)(); let dv = this.d.dev[did]; let changed = false;
    if (!dv) { dv = this.d.dev[did] = { ids: [], first: t, last: t }; changed = true; }
    if (!dv.ids.includes(uid)) { if (dv.ids.length < 50) dv.ids.push(uid); const l = this.d.byId[uid] ?? (this.d.byId[uid] = []); if (!l.includes(did) && l.length < 30) l.push(did); changed = true; }
    if (t - dv.last > 3600_000) { dv.last = t; changed = true; }
    if (dv.ids.length > DEVICE_ALLOWED && !dv.allowed && !this.d.alerted.includes(did)) { this.d.alerted.push(did); if (this.d.alerted.length > 5000) this.d.alerted.shift(); try { this.deps.alert(did, [...dv.ids]); } catch { /* */ } changed = true; }
    if (changed) this.disk.save();
    return dv.ids.length;
  }
  /** نفس الشبكة (الـ IP مقصوص ومشفر، ما نحفظه): للمراقبة بس، ما نمنع فيها (البيوت والكافيهات يتشاركون نت) */
  seeNet(net: string, uid: string) {
    if (!/^[a-f0-9]{24}$/.test(net) || !uid) return; const m = this.d.net ?? (this.d.net = {}); const t = (this.deps.now ?? Date.now)();
    const n = m[net] ?? (m[net] = { ids: [], last: t }); let changed = false;
    if (!n.ids.some((x) => x.id === uid)) { n.ids.push({ id: uid, at: t }); if (n.ids.length > 40) n.ids.shift(); changed = true; }
    if (t - n.last > 3600_000) { n.last = t; changed = true; }
    const keys = Object.keys(m); if (keys.length > 50000) for (const k of keys.slice(0, 5000)) delete m[k];
    if (changed) this.disk.save();
  }
  /** شبكات عليها حسابات كثيرة انضافت خلال وقت قصير */
  netClusters(limit = 30) {
    return Object.entries(this.d.net ?? {}).filter(([, v]) => v.ids.length >= 4).sort((a, b) => b[1].ids.length - a[1].ids.length || b[1].last - a[1].last).slice(0, limit).map(([k, v]) => ({ net: k.slice(0, 8), ids: v.ids.map((x) => x.id), last: v.last }));
  }
  /** هل الحساب يستاهل جوائز مجانية؟ لا، لو هو حساب زايد (الثالث وطالع) على أي جهاز ما سمح له المالك */
  /** R69zl: لاعبين بنفس المباراة دخلوا من نفس الجهاز (والجهاز مو مسموح له من المالك) */
  sharedDevice(ids: string[]): string[][] {
    const out: string[][] = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = this.d.byId[ids[i]] ?? [], b = new Set(this.d.byId[ids[j]] ?? []);
      if (a.some((did) => b.has(did) && !this.d.dev[did]?.allowed)) out.push([ids[i], ids[j]]);
    }
    return out;
  }
  rewardOk(uid: string): boolean {
    for (const did of this.d.byId[uid] ?? []) { const dv = this.d.dev[did]; if (!dv || dv.allowed) continue; const i = dv.ids.indexOf(uid); if (i >= DEVICE_ALLOWED) return false; }
    return true;
  }
  allow(did: string, on: boolean) { const dv = this.d.dev[did]; if (!dv) return false; dv.allowed = on; this.disk.save(); return true; }
  clusters(limit = 50) {
    return Object.entries(this.d.dev).filter(([, v]) => v.ids.length > DEVICE_ALLOWED).sort((a, b) => b[1].ids.length - a[1].ids.length || b[1].last - a[1].last).slice(0, limit)
      .map(([did, v]) => ({ did, ids: [...v.ids], first: v.first, last: v.last, allowed: !!v.allowed }));
  }
  stats() { const all = Object.values(this.d.dev); return { devices: all.length, flagged: all.filter((v) => v.ids.length > DEVICE_ALLOWED && !v.allowed).length }; }
}
