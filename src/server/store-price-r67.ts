/** R67au (طلب المالك): تسعير المتجر كامل من جديد — العادي رخيص والفخم غالي، وكل قطعة سعرها غير عن الثانية.
 * أغلى قطعة زينة 8 مليون عملة، وأغلى أيدي 50 مليون. السعر ينحفظ بالجواهر القديمة (÷20) لأن النظام يعرضها ×20 عملة.
 * أسعار الإدارة (overrides) من اللوحة تبقى فوق هذا. */
import type { ShopItem, Rarity } from './catalog.js';
import { idPattern } from './store-lux-r57.js';

const BANDS: Readonly<Record<Rarity, readonly [number, number]>> = Object.freeze({
  common: [1_000, 8_000], premium: [8_000, 30_000], rare: [30_000, 120_000],
  epic: [120_000, 500_000], legendary: [500_000, 2_000_000], ultra: [2_000_000, 8_000_000],
});
const SLOT_X: Readonly<Partial<Record<ShopItem['slot'], number>>> = Object.freeze({
  title: 0.5, badge: 0.5, avatar: 0.6, 'chat-bubble': 0.8, board: 0.8, frame: 1, bg: 1, 'mic-frame': 1.2, souvenir: 1, 'room-bg': 1.5,
});
/** أسعار حددها المالك بنفسه — ما تنمس */
const KEEP = new Set(['art-pb-11', 'art-pb-12', 'art-pb-13', 'art-pb-14', 'art-pb-15', 'art-pb-16', 'art-pb-17', 'art-pb-18', 'art-pb-19', 'art-pb-20', 'art-pb-21', 'art-pb-22']);
/** رقم ثابت لكل قطعة بين 0 و1 (نفس القطعة نفس السعر دايمًا) */
function unit(id: string): number { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10_000) / 10_000; }
const nice = (n: number) => n >= 1_000_000 ? Math.round(n / 50_000) * 50_000 : n >= 100_000 ? Math.round(n / 5_000) * 5_000 : n >= 10_000 ? Math.round(n / 500) * 500 : Math.max(100, Math.round(n / 100) * 100);
const between = (id: string, lo: number, hi: number) => nice(lo + (hi - lo) * unit(id));

/** سعر الأيدي بالعملات حسب طول الرقم وشكله */
export function idCoins(n: string, id: string): number {
  const p = idPattern(n), fancy = p === 'repeat' || p === 'sequence', nice2 = fancy || p === 'alternate' || p === 'mirror' || p === 'round';
  if (n.length <= 3) return 50_000_000;
  if (n.length === 4) return fancy ? between(id, 30_000_000, 50_000_000) : between(id, 12_000_000, 20_000_000);
  if (n.length === 5) return fancy ? between(id, 15_000_000, 25_000_000) : between(id, 6_000_000, 10_000_000);
  if (n.length === 6) return nice2 ? between(id, 6_000_000, 12_000_000) : between(id, 3_000_000, 5_000_000);
  return nice2 ? between(id, 3_000_000, 5_000_000) : between(id, 1_000_000, 3_000_000);
}
const toItem = (item: ShopItem, coins: number): ShopItem => item.currency === 'gems' ? { ...item, price: Math.max(1, Math.round(coins / 20)) } : { ...item, price: coins };

export function r67Price(item: ShopItem): ShopItem {
  if (!item.price || item.rankPerk || item.slot === 'entrance' || KEEP.has(item.id)) return item;
  if ((item.slot === 'special-id' || item.slot === 'room-id') && typeof item.css === 'string' && /^\d+$/.test(item.css)) return toItem(item, idCoins(item.css, item.id));
  const x = SLOT_X[item.slot]; if (x === undefined) return item;
  const [lo, hi] = BANDS[item.rarity ?? 'common'];
  return toItem(item, nice(between(item.id, lo, hi) * x));
}
