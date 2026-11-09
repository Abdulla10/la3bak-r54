/* R62: عروض المتجر محدودة الوقت — المالك يحدد قطعة، خصم (0–90%)، ووقت بداية ونهاية (أقصى 30 يوم).
   - خلال العرض السعر يطلع مخفّض للكل، والشراء نفسه يمشي بالسعر المخفّض (نفس فحص السعر الموجود بالمتجر).
   - «حصري»: القطعة ما تنباع إلا خلال وقت العرض (قبله «قريبًا»، وبعده «غير متاح»). اللي اشتراها تبقى له. */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export type Offer = { id: string; itemId: string; discount: number; startsAt: number; endsAt: number; exclusive: boolean; by: string; at: number };
type Data = { v: 1; offers: Offer[] };
const ID = /^[a-z0-9]{6,20}$/;
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const validOffer = (o: any) => isObj(o) && typeof o.id === 'string' && ID.test(o.id) && typeof o.itemId === 'string' && o.itemId.length <= 100 && nat(o.discount) && o.discount <= 90 && nat(o.startsAt) && nat(o.endsAt) && o.endsAt > o.startsAt && typeof o.exclusive === 'boolean';
const valid = (v: Record<string, unknown>) => v.v === 1 && Array.isArray(v.offers) && v.offers.length <= 200 && v.offers.every(validOffer);
export class OfferError extends Error { constructor(msg: string, public code = 400) { super(msg); } }
export class ShopOffers {
  private d: Data = { v: 1, offers: [] };
  private disk: Persister;
  constructor(file: string, mon = new StorageMonitor(), private now: () => number = Date.now) {
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('shop-offers', file, () => this.d, now, mon, valid);
  }
  /** العرض اللي يخص القطعة الحين (شغال، أو حصري ولسه ما بدأ/خلص) */
  forItem(itemId: string): (Offer & { live: boolean }) | null {
    const t = this.now(); let best: (Offer & { live: boolean }) | null = null;
    for (const o of this.d.offers) {
      if (o.itemId !== itemId) continue;
      const live = t >= o.startsAt && t < o.endsAt;
      if (live) { if (!best || !best.live || o.discount > best.discount) best = { ...o, live }; }
      else if (o.exclusive && !best) best = { ...o, live };
    }
    return best;
  }
  list() { const t = this.now(); return this.d.offers.map((o) => ({ ...o, state: t < o.startsAt ? 'upcoming' : t < o.endsAt ? 'live' : 'ended' })).sort((a, b) => b.startsAt - a.startsAt); }
  add(input: unknown, by: string, itemOk: (id: string) => boolean) {
    if (!isObj(input)) throw new OfferError('بيانات غير صالحة.');
    const itemId = String(input.itemId ?? '').trim(); if (!itemOk(itemId)) throw new OfferError('القطعة مب موجودة بالمتجر.');
    const discount = Math.floor(Number(input.discount ?? 0)); if (!Number.isFinite(discount) || discount < 0 || discount > 90) throw new OfferError('الخصم من 0 إلى 90%.');
    const startsAt = input.startsAt === undefined || input.startsAt === '' ? this.now() : Math.floor(Number(input.startsAt));
    const hours = Math.floor(Number(input.hours ?? 48)); if (!Number.isFinite(hours) || hours < 1 || hours > 720) throw new OfferError('مدة العرض من ساعة إلى 30 يوم.');
    if (!nat(startsAt) || startsAt < this.now() - 60_000 || startsAt > this.now() + 60 * 86400_000) throw new OfferError('وقت البداية غير صالح.');
    if (this.d.offers.length >= 200) this.d.offers = this.d.offers.filter((o) => o.endsAt > this.now());
    const o: Offer = { id: Math.random().toString(36).slice(2, 12).padEnd(8, '0'), itemId, discount, startsAt, endsAt: startsAt + hours * 3600_000, exclusive: input.exclusive === true, by: by.slice(0, 80), at: this.now() };
    if (!validOffer(o)) throw new OfferError('بيانات العرض غير صالحة.');
    this.d.offers.push(o); this.disk.mustSave(); return o;
  }
  end(id: string) { const o = this.d.offers.find((x) => x.id === id); if (!o) throw new OfferError('العرض مب موجود.', 404); const t = this.now(); if (o.endsAt > t) { o.endsAt = Math.max(o.startsAt + 1, t); if (o.startsAt > t) { o.startsAt = t - 1; o.endsAt = t; } } this.disk.mustSave(); return o; }
}
