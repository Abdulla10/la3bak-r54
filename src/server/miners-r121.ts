// R121: «المنجم» — رتبة يعطيها المالك من لوحة التحكم: منجم 1 و2 و3. كل منجم يفتح مزايا، ومنجم 3 أقواها.
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
export type MinerLevel = 0 | 1 | 2 | 3;
type Rec = { lvl: 1 | 2 | 3; at: number; by: string };
type Data = { v: 1; m: Record<string, Rec> };
/** كل منجم يعطيك مزايا رتبة تعادل VIP/نوبل (تشتغل حتى لو ما عندك VIP) + تعدين يومي بالعملات */
export const MINER_TIERS: Record<1 | 2 | 3, { vip: number; noble: number; daily: number; name: string; perks: string[] }> = {
  1: { vip: 5, noble: 2, daily: 20_000, name: 'منجم 1', perks: ['تعدين يومي 20,000 عملة', 'نشر الصور بالغرفة', 'تعديل وحذف الرسائل', 'خصم بالمتجر', 'شارة ⛏️ منجم 1'] },
  2: { vip: 10, noble: 5, daily: 75_000, name: 'منجم 2', perks: ['تعدين يومي 75,000 عملة', 'كل مزايا منجم 1', 'دخول المجالس الممتلئة', 'المقاعد المحجوزة', 'استوديو التصميم', 'مضاعف خبرة', 'شارة ⛏️ منجم 2'] },
  3: { vip: 15, noble: 9, daily: 250_000, name: 'منجم 3', perks: ['تعدين يومي 250,000 عملة', 'كل المزايا مفتوحة (مثل VIP 15 ونوبل 9)', 'حماية من الطرد والكتم', 'إعلان على كل الموقع', 'الدخول المخفي', 'آيدي مميز تختاره', 'شارة ⛏️ منجم 3 الذهبية'] },
};
export class Miners {
  private d: Data; private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.m);
    this.d = (file ? loadJsonFile(file, valid) as unknown as Data : null) ?? { v: 1, m: {} };
    this.disk = new Persister('miners121', file, () => this.d, now, mon, valid);
  }
  level(id: string): MinerLevel { return (this.d.m[id]?.lvl ?? 0) as MinerLevel; }
  set(id: string, lvl: number, by: string): MinerLevel {
    if (![0, 1, 2, 3].includes(lvl)) throw new Error('المنجم من 0 إلى 3.');
    if (lvl === 0) delete this.d.m[id]; else this.d.m[id] = { lvl: lvl as 1 | 2 | 3, at: this.now(), by: by.slice(0, 60) };
    this.disk.save(); return lvl as MinerLevel;
  }
  list() { return Object.entries(this.d.m).map(([id, r]) => ({ id, ...r })).sort((a, b) => b.lvl - a.lvl || b.at - a.at); }
  /** أعلى رتبة بين الحقيقية والمنجم */
  boost(id: string, t: { vip: number; noble: number }) { const l = this.level(id); if (!l) return t; const m = MINER_TIERS[l]; return { vip: Math.max(t.vip, m.vip), noble: Math.max(t.noble, m.noble) }; }
  daily(id: string) { const l = this.level(id); return l ? MINER_TIERS[l].daily : 0; }
}
