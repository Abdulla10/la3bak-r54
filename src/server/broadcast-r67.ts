/** R67ae: البرقية العالمية — رسالة مدفوعة تطلع شريط بكل الموقع.
 * ثلاث مستويات، رقابة على النص، حد إرسال لكل لاعب، والمالك يقدر يخفي أي برقية. */
import { randomUUID } from 'node:crypto';
import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';

export type BroadcastTier = 'normal' | 'gold' | 'full';
export const BROADCAST_TIERS: readonly BroadcastTier[] = Object.freeze(['normal', 'gold', 'full']);
/** الأسعار بالعملات — تتعدل من «أرقام الجوائز والمستويات» */
export const BROADCAST_PRICES: Record<BroadcastTier, number> = { normal: 5_000, gold: 20_000, full: 100_000 };
export const BROADCAST_TEXT_MAX = 80;
export const BROADCAST_COOLDOWN_MS = 60_000;
export type Broadcast = { id: string; by: string; name: string; text: string; tier: BroadcastTier; price: number; at: number; hidden?: boolean; hiddenBy?: string };
type Data = { v: 1; list: Broadcast[] };
const valid = (x: Record<string, unknown>) => x.v === 1 && Array.isArray(x.list) && x.list.length <= 500 && x.list.every((b) => isObj(b) && typeof b.id === 'string' && typeof b.by === 'string' && typeof b.text === 'string' && BROADCAST_TIERS.includes(b.tier as BroadcastTier) && Number.isSafeInteger(b.at));

export class BroadcastError extends Error { constructor(public code: string, msg: string) { super(msg); } }
export class Broadcasts {
  private d: Data = { v: 1, list: [] };
  private disk: Persister;
  private last = new Map<string, number>();
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('broadcasts', file, () => this.d, now, mon, valid);
  }
  /** يتحقق قبل الدفع (النص، المستوى، الحد) ويرجع السعر */
  check(user: string, text: string, tier: unknown): { tier: BroadcastTier; price: number; text: string } {
    if (!BROADCAST_TIERS.includes(tier as BroadcastTier)) throw new BroadcastError('tier', 'اختر نوع البرقية.');
    const t = String(text ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
    if ([...t].length < 3 || [...t].length > BROADCAST_TEXT_MAX) throw new BroadcastError('text', `البرقية من 3 إلى ${BROADCAST_TEXT_MAX} حرف.`);
    const last = this.last.get(user) ?? 0, wait = BROADCAST_COOLDOWN_MS - (this.now() - last);
    if (wait > 0) throw new BroadcastError('cooldown', `انتظر ${Math.ceil(wait / 1000)} ثانية قبل البرقية الجاية.`);
    return { tier: tier as BroadcastTier, price: BROADCAST_PRICES[tier as BroadcastTier], text: t };
  }
  /** يسجّل البرقية بعد ما ينجح الخصم */
  add(user: string, name: string, text: string, tier: BroadcastTier, price: number, id: string = randomUUID()): Broadcast {
    const old = this.d.list.find((b) => b.id === id); if (old) return structuredClone(old);
    const b: Broadcast = { id, by: user, name, text, tier, price, at: this.now() };
    const prev = this.d; this.d = { v: 1, list: [...this.d.list, b].slice(-300) };
    try { this.disk.mustSave(); } catch (e) { this.d = prev; throw e; }
    this.last.set(user, this.now()); if (this.last.size > 5000) this.last.clear();
    return structuredClone(b);
  }
  hide(id: string, by: string): Broadcast {
    const b = this.d.list.find((x) => x.id === id); if (!b) throw new BroadcastError('not_found', 'البرقية غير موجودة.');
    const prev = structuredClone(this.d); b.hidden = true; b.hiddenBy = by;
    try { this.disk.mustSave(); } catch (e) { this.d = prev; throw e; }
    return structuredClone(b);
  }
  /** آخر البرقيات الظاهرة (للي يفتح الموقع بعدها بشوي) */
  recent(ms = 10 * 60_000): Broadcast[] { const since = this.now() - ms; return this.d.list.filter((b) => !b.hidden && b.at >= since).slice(-10); }
  list(n = 100): Broadcast[] { return structuredClone(this.d.list.slice(-n).reverse()); }
}
export const publicBroadcast = (b: Broadcast) => ({ id: b.id, name: b.name, text: b.text, tier: b.tier, at: b.at });
