// R122: «المنجم» اشتراك شهري بالعملات — منجم 1 و2 و3. يخلص الشهر يرجع يشترك. المالك يقدر يعطيه من اللوحة ويغيّر الأسعار.
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
export type MinerLevel = 0 | 1 | 2 | 3;
type Rec = { lvl: 1 | 2 | 3; at: number; by: string; until: number };
type Cfg = { price: number; daily: number };
type Data = { v: 1; m: Record<string, Rec>; cfg?: Partial<Record<'1' | '2' | '3', Cfg>> };
export const MINER_MONTH = 30 * 86_400_000;
/** مزايا كل منجم: تعادل مستوى VIP/نوبل معيّن (مو أعلى شي) + تعدين يومي. منجم 3 أقواها. */
const BASE: Record<1 | 2 | 3, { vip: number; noble: number; price: number; daily: number; name: string; perks: string[] }> = {
  1: { vip: 3, noble: 0, price: 500_000, daily: 10_000, name: 'منجم 1', perks: ['تعدين يومي بالعملات', 'مزايا VIP 3 (راتب، خصم، كتم كلمات، تثبيت المحادثات، قروبات أكبر)', 'شارة ⛏️ منجم 1'] },
  2: { vip: 6, noble: 2, price: 2_000_000, daily: 40_000, name: 'منجم 2', perks: ['تعدين يومي أكبر', 'مزايا VIP 6 (نشر الصور بالغرفة، تعديل وحذف الرسائل، مين زار ملفي)', 'دعم فني أولوية + رسالة مع طلب الصداقة', 'شارة ⛏️ منجم 2'] },
  3: { vip: 10, noble: 4, price: 6_000_000, daily: 120_000, name: 'منجم 3', perks: ['أكبر تعدين يومي', 'مزايا VIP 10 (دخول المجالس الممتلئة، مضاعف خبرة، أولوية البحث)', 'المقاعد المحجوزة بالمجالس', 'شارة ⛏️ منجم 3 الذهبية'] },
};
export class Miners {
  private d: Data; private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.m);
    this.d = (file ? loadJsonFile(file, valid) as unknown as Data : null) ?? { v: 1, m: {} };
    for (const r of Object.values(this.d.m)) if (!r.until) r.until = r.at + MINER_MONTH; // سجلات R121 القديمة: شهر من وقت المنح
    this.disk = new Persister('miners121', file, () => this.d, now, mon, valid);
  }
  tier(l: 1 | 2 | 3) { const c = this.d.cfg?.[String(l) as '1']; return { ...BASE[l], price: c?.price ?? BASE[l].price, daily: c?.daily ?? BASE[l].daily }; }
  tiers() { return { 1: this.tier(1), 2: this.tier(2), 3: this.tier(3) }; }
  setCfg(l: 1 | 2 | 3, price: number, daily: number) {
    if (![1, 2, 3].includes(l) || !Number.isSafeInteger(price) || price < 1000 || price > 1e10 || !Number.isSafeInteger(daily) || daily < 0 || daily > 1e9) throw new Error('السعر أو التعدين غير صحيح.');
    (this.d.cfg ??= {})[String(l) as '1'] = { price, daily }; this.disk.save();
  }
  rec(id: string) { const r = this.d.m[id]; return r && r.until > this.now() ? r : null; }
  level(id: string): MinerLevel { return (this.rec(id)?.lvl ?? 0) as MinerLevel; }
  until(id: string) { return this.rec(id)?.until ?? 0; }
  /** اشتراك/تجديد: نفس المنجم يمدّد شهر فوق الباقي، منجم مختلف يبدأ شهر من الحين */
  grant(id: string, lvl: number, by: string, months = 1): MinerLevel {
    if (![0, 1, 2, 3].includes(lvl)) throw new Error('المنجم من 0 إلى 3.');
    if (lvl === 0) { delete this.d.m[id]; this.disk.save(); return 0; }
    const cur = this.rec(id), now = this.now(), start = cur && cur.lvl === lvl ? cur.until : now;
    this.d.m[id] = { lvl: lvl as 1 | 2 | 3, at: now, by: by.slice(0, 60), until: start + MINER_MONTH * Math.max(1, Math.min(12, months)) };
    this.disk.save(); return lvl as MinerLevel;
  }
  list() { const now = this.now(); return Object.entries(this.d.m).filter(([, r]) => r.until > now).map(([id, r]) => ({ id, ...r })).sort((a, b) => b.lvl - a.lvl || b.at - a.at); }
  boost(id: string, t: { vip: number; noble: number }) { const l = this.level(id); if (!l) return t; const m = BASE[l]; return { vip: Math.max(t.vip, m.vip), noble: Math.max(t.noble, m.noble) }; }
  daily(id: string) { const l = this.level(id); return l ? this.tier(l).daily : 0; }
}
export const MINER_TIERS = BASE;
