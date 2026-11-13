// R123: العملات المشحونة — جزء من نفس رصيد العملات، ينضاف بس من الإدارة (بعد ما اللاعب يدفع) أو الدفع التلقائي.
// الأشياء الغالية ما تنشرى إلا منه. الخصم العادي ياكل من المجاني أول؛ المشحون ما ينتقل لحساب ثاني (هدايا/جوائز تصير مجانية).
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
export type RechargePack = { id: string; coins: number; aed: number; link: string };
type Credit = { id: string; to: string; coins: number; by: string; at: number; note: string };
type Cfg = { threshold: number; divisor: number; packs: RechargePack[]; whatsapp: string; enabled: boolean; closed: boolean; closedMsg: string };
type ZPend = { to: string; coins: number; aed: number; at: number; done?: number };
type Data = { v: 1; paid: Record<string, number>; log: Credit[]; cfg?: Partial<Cfg>; zi?: Record<string, ZPend> };
/** R125: نفس باقات العملات اللي بالمتجر (أقل دفع بـZiina 2 درهم) */
export const DEFAULT_PACKS: RechargePack[] = [
  { id: 'c1k', coins: 1_000, aed: 2, link: '' },
  { id: 'c5k', coins: 5_000, aed: 3, link: '' },
  { id: 'c15k', coins: 15_000, aed: 6, link: '' },
  { id: 'c50k', coins: 50_000, aed: 19, link: '' },
  { id: 'p100k', coins: 100_000, aed: 35, link: '' },
  { id: 'c250k', coins: 250_000, aed: 85, link: '' },
  { id: 'p1m', coins: 1_000_000, aed: 349, link: '' },
  { id: 'c5m', coins: 5_000_000, aed: 1599, link: '' },
];
export class PaidCoins {
  private d: Data; private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.paid) && Array.isArray(x.log);
    this.d = (file ? loadJsonFile(file, valid) as unknown as Data : null) ?? { v: 1, paid: {}, log: [] };
    this.disk = new Persister('paid123', file, () => this.d, now, mon, valid);
  }
  cfg(): Cfg { const c = this.d.cfg ?? {}; return { threshold: c.threshold ?? 1_000_000, divisor: c.divisor ?? 10, packs: c.packs?.length ? c.packs : DEFAULT_PACKS, whatsapp: c.whatsapp ?? '', enabled: c.enabled ?? true, closed: c.closed ?? false, closedMsg: c.closedMsg ?? '' }; }
  setCfg(p: Partial<Cfg>) {
    const c = { ...this.cfg(), ...p };
    if (!Number.isSafeInteger(c.threshold) || c.threshold < 1000) throw new Error('الحد غير صحيح.');
    if (!Number.isSafeInteger(c.divisor) || c.divisor < 1 || c.divisor > 100) throw new Error('القسمة من 1 إلى 100.');
    if (!Array.isArray(c.packs) || c.packs.length < 1 || c.packs.length > 12 || c.packs.some((k) => !Number.isSafeInteger(k.coins) || k.coins < 1000 || !(Number(k.aed) > 0) || typeof k.link !== 'string' || (k.link && !/^https:\/\/[^\s"'<>]{4,300}$/.test(k.link)))) throw new Error('الباقات غير صحيحة (الرابط لازم يبدأ بـ https://).');
    if (typeof c.whatsapp !== 'string' || (c.whatsapp && !/^\+?[0-9]{8,15}$/.test(c.whatsapp))) throw new Error('رقم الواتساب غير صحيح.');
    if (typeof c.closed !== 'boolean') throw new Error('بيانات غير صحيحة.');
    c.closedMsg = String(c.closedMsg ?? '').replace(/[<>]/g, '').trim().slice(0, 140);
    c.packs = c.packs.map((k, i) => ({ id: String(k.id || 'p' + i).replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'p' + i, coins: k.coins, aed: Math.round(Number(k.aed) * 100) / 100, link: k.link }));
    this.d.cfg = c; this.disk.save(); return this.cfg();
  }
  of(id: string, balance: number) { return Math.max(0, Math.min(this.d.paid[id] ?? 0, balance)); }
  /** يناديها الـwallet بعد كل خصم */
  clamp(id: string, after: number) { const p = this.d.paid[id]; if (p !== undefined && p > after) { if (after <= 0) delete this.d.paid[id]; else this.d.paid[id] = after; this.disk.save(); } }
  add(id: string, coins: number) { this.d.paid[id] = (this.d.paid[id] ?? 0) + coins; this.disk.save(); }
  /** شراء غالي: لازم المشحون يكفي. ينادى قبل الخصم ويرجع الدالة اللي تثبّت الخصم من المشحون */
  take(id: string, balance: number, price: number): boolean { const have = this.of(id, balance); if (have < price) return false; this.d.paid[id] = have - price; this.disk.save(); return true; }
  refund(id: string, price: number) { this.d.paid[id] = (this.d.paid[id] ?? 0) + price; this.disk.save(); }
  log(entry: Omit<Credit, 'id' | 'at'>) { this.d.log.push({ ...entry, id: Math.random().toString(36).slice(2, 10), at: this.now() }); if (this.d.log.length > 2000) this.d.log.splice(0, this.d.log.length - 2000); this.disk.save(); }
  recent(n = 100) { return this.d.log.slice(-n).reverse(); }
  /** R124: طلبات Ziina المعلّقة */
  zAdd(id: string, p: Omit<ZPend, 'at'>) { (this.d.zi ??= {})[id] = { ...p, at: this.now() }; const old = this.now() - 7 * 86_400_000; for (const [k, v] of Object.entries(this.d.zi)) if (v.at < old) delete this.d.zi[k]; this.disk.save(); }
  zGet(id: string) { return this.d.zi?.[id] ?? null; }
  zDone(id: string) { const z = this.d.zi?.[id]; if (!z || z.done) return false; z.done = this.now(); this.disk.save(); return true; }
  zPending(maxAgeMs: number) { const t = this.now() - maxAgeMs; return Object.entries(this.d.zi ?? {}).filter(([, v]) => !v.done && v.at > t).map(([k]) => k); }
  isPaidOnly(origPrice: number) { const c = this.cfg(); return c.enabled && origPrice >= c.threshold; }
  price(origPrice: number) { return this.isPaidOnly(origPrice) ? Math.max(1, Math.round(origPrice / this.cfg().divisor)) : origPrice; }
}
