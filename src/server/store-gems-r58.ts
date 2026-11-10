import type { ShopItem, Rarity } from './catalog.js';

/** R58b (طلب المالك): متجر الزينة بالمجوهرات فقط — العملات للألعاب فقط.
 * الإطارات والخلفيات والسيارات والفقاعات واللوحات تنباع بالمجوهرات وبأسعار فخمة حسب الندرة.
 * ما يمس الملكية ولا السجلات القديمة: يغيّر سعر وعملة العرض للشراء الجديد فقط.
 * العناصر المجانية (سعر صفر) تبقى مجانية، وجوائز الرتب (rankPerk) ما تنباع أصلًا. */
type Ladder = Readonly<Record<Rarity, number>>;
const LADDERS: Readonly<Partial<Record<ShopItem['slot'], Ladder>>> = Object.freeze({
  frame: { common: 2_000, premium: 6_000, rare: 15_000, epic: 50_000, legendary: 100_000, ultra: 250_000 },
  bg: { common: 1_000, premium: 3_000, rare: 8_000, epic: 25_000, legendary: 60_000, ultra: 150_000 },
  entrance: { common: 50_000, premium: 80_000, rare: 120_000, epic: 200_000, legendary: 350_000, ultra: 600_000 },
  'chat-bubble': { common: 1_000, premium: 3_000, rare: 10_000, epic: 30_000, legendary: 80_000, ultra: 200_000 },
  'mic-frame': { common: 5_000, premium: 15_000, rare: 40_000, epic: 100_000, legendary: 250_000, ultra: 500_000 },
  souvenir: { common: 5_000, premium: 15_000, rare: 40_000, epic: 100_000, legendary: 250_000, ultra: 600_000 },
  board: { common: 1_000, premium: 3_000, rare: 10_000, epic: 30_000, legendary: 80_000, ultra: 200_000 },
});
/** قطع العرض الأفخم بكل قسم */
const SHOWPIECES: Readonly<Record<string, number>> = Object.freeze({
  'ref-p-frame-02': 500_000, 'lux-f-galaxy': 400_000, 'lux-f-inferno': 450_000,
  'lux-b-falls': 250_000, 'lux-b-snowcastle': 250_000, 'bg2-golden-hall': 200_000,
  'entrance-lux-black': 1_000_000, 'entrance-royal': 900_000,
  // R68z31: الدخوليات ثلاثية الأبعاد (بالجواهر؛ تنعرض عملات ×20): من مليون إلى 6 ملايين
  'ent-whale': 50_000, 'ent-moto': 60_000, 'ent-phoenix': 75_000, 'ent-royalcar': 100_000, 'ent-pegasus': 125_000, 'ent-portal': 150_000, 'ent-dragon': 175_000, 'ent-yacht': 200_000, 'ent-jet': 250_000, 'ent-carriage': 300_000,
  'lux-bub-imperial': 300_000, 'lux-board-inferno': 300_000,
  // R67ad: خلفيات الملف الجديدة — أسعار متنوعة (بالجواهر؛ تنعرض عملات ×20)
  'art-pb-11': 18_000, 'art-pb-12': 6_000, 'art-pb-13': 5_000, 'art-pb-14': 20_000, 'art-pb-15': 40_000, 'art-pb-16': 15_000,
  'art-pb-17': 45_000, 'art-pb-18': 50_000, 'art-pb-19': 90_000, 'art-pb-20': 100_000, 'art-pb-21': 110_000, 'art-pb-22': 125_000,
});
export function gemsOnlyStorePrice(item: ShopItem): ShopItem {
  const ladder = LADDERS[item.slot];
  if (!ladder || item.rankPerk || item.price === 0) return item;
  const price = SHOWPIECES[item.id] ?? ladder[item.rarity ?? 'common'] ?? item.price;
  return { ...item, price: Math.max(price, item.currency === 'gems' ? item.price : 0), currency: 'gems' };
}
