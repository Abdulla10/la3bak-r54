import { readFileSync } from 'node:fs';
import type { ShopItem } from './catalog.js';

/** Public effect contract: server-canonical identity/artwork only, never wallet or request data. */
export interface PublicEntrance { id: string; name: string; art: string }

/** Fail closed when a packaged entrance asset is absent, empty or not a real WebP.
 * Both source (tsx) and compiled (dist/server) layouts resolve to this project's public folder.
 * User-delegated R23 luxury pricing is approved; this gate is artwork readiness only.
 */
const artReady = (id: string, dir = 'store-r23'): boolean => {
  try {
    const bytes = readFileSync(new URL(`../../public/assets/${dir}/${id}.webp`, import.meta.url));
    return bytes.length > 100 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  } catch { return false; }
};
const entrance = (item: ShopItem, dir = 'store-r23'): ShopItem => ({ ...item, proposalOnly: !artReady(item.id, dir), priceApproved: artReady(item.id, dir) });
/** R57: مركبات فخمة جديدة برسومات أصلية للموقع */
const lux = (id: string, name: string, desc: string, price: number, rarity: ShopItem['rarity']): ShopItem => entrance({ id, slot: 'entrance', name, icon: '🏎️', desc, price, currency: 'coins', permanent: true, rarity, set: 'lux', css: id, art: `/assets/store-r57/${id}.webp` }, 'store-r57');

/** Exactly two permanent cosmetics. New approved luxury prices; no historical ownership mutation. */
export const ENTRANCE_ITEMS: ShopItem[] = [
  entrance({
    id: 'entrance-sport', slot: 'entrance', name: 'دخول السيارة الرياضية الفاخرة', icon: '🏎️',
    desc: 'دخول بسيارة رياضية فاخرة بلمسات بنفسجية وذهبية.',
    price: 150000, currency: 'coins', permanent: true, rarity: 'legendary', set: 'royal',
    css: 'entrance-sport', art: '/assets/store-r23/entrance-sport.webp',
  }),
  entrance({
    id: 'entrance-royal', slot: 'entrance', name: 'دخول الكوبيه الملكية', icon: '🚘',
    desc: 'دخول بكوبيه ملكية فاخرة بلمسات بنفسجية وذهبية.',
    price: 500000, currency: 'coins', permanent: true, rarity: 'ultra', set: 'royal',
    css: 'entrance-royal', art: '/assets/store-r23/entrance-royal.webp',
  }),
  lux('entrance-lux-gold', 'دخول الهايبركار الذهبية', 'هايبركار ذهبية بإضاءة سفلية ونجوم لامعة.', 200000, 'legendary'),
  lux('entrance-lux-red', 'دخول الهايبركار الحمراء', 'هايبركار حمراء بجناح خلفي وإضاءة نارية.', 220000, 'legendary'),
  lux('entrance-lux-blue', 'دخول الـGT الزرقاء', 'سيارة GT زرقاء بإضاءة سماوية.', 180000, 'epic'),
  lux('entrance-lux-white', 'دخول الـGT الماسية', 'سيارة GT بيضاء بلمعة ماسية.', 250000, 'legendary'),
  lux('entrance-lux-rose', 'دخول الكشف الوردية', 'سيارة مكشوفة وردية بإضاءة ناعمة.', 160000, 'epic'),
  lux('entrance-lux-black', 'دخول الليموزين السوداء', 'ليموزين سوداء بحواف ذهبية — قمة الفخامة.', 400000, 'ultra'),
];

/** R68z31: دخوليات ثلاثية الأبعاد (صور المالك) — طبقة خلفية + طبقة أمامية (-fg) تبرز قدام */
const ent3 = (id: string, name: string, desc: string, rarity: ShopItem['rarity']): ShopItem => entrance({ id, slot: 'entrance', name, icon: '✨', desc, price: 1, currency: 'gems', permanent: true, rarity, set: 'ent3d', css: id, art: `/assets/entr68/${id}.webp` }, 'entr68');
ENTRANCE_ITEMS.push(
  ent3('ent-whale', 'دخولية الحوت المضيء', 'حوت مضيء يسبح بين النجوم والقناديل.', 'legendary'),
  ent3('ent-moto', 'دخولية الدراجة النارية', 'دراجة سوداء بلهب بنفسجي.', 'legendary'),
  ent3('ent-phoenix', 'دخولية العنقاء', 'طائر العنقاء بأجنحة نارية ملونة.', 'legendary'),
  ent3('ent-royalcar', 'دخولية السيارة الملكية', 'سيارة سوداء فخمة بتاج ذهبي ودخان بنفسجي.', 'ultra'),
  ent3('ent-pegasus', 'دخولية الحصان المجنّح', 'حصان أبيض بأجنحة وقرن ذهبي تحت القمر.', 'ultra'),
  ent3('ent-portal', 'دخولية البوابة الكونية', 'بوابة ذهبية تفتح على مجرة.', 'ultra'),
  ent3('ent-dragon', 'دخولية التنين الناري', 'تنين ناري يطير فوق الغيوم واللهب.', 'ultra'),
  ent3('ent-yacht', 'دخولية اليخت الذهبي', 'يخت ذهبي يشق الموج تحت القمر.', 'ultra'),
  ent3('ent-jet', 'دخولية الطيارة الخاصة', 'طيارة خاصة بيضا وذهبية فوق الغيوم.', 'ultra'),
  ent3('ent-carriage', 'دخولية العربة الملكية', 'عربة ذهبية يجرّها حصانين أبيض.', 'ultra'),
);

/** R57: مسارات صور المركبات المعتمدة (للتحقق قبل عرض الدخول بالغرف) */
export const ENTRANCE_ART_PATHS: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(ENTRANCE_ITEMS.filter((i) => i.priceApproved !== false && typeof i.art === 'string').map((i) => [i.id, i.art as string])));
