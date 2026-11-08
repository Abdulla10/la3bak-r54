/** R56: سلّم امتيازات VIP (1..15) ونوبل (N1..N9) بالتدريج — كل مستوى يعطي شي، والفخامة تزيد مع المستوى.
 * العناصر هنا مقتنيات شكلية حصرية (إطارات، خلفيات، ألقاب) ما تنباع بالمتجر: تُستلم مرة وحدة من «مكافآت الرتب».
 * ما فيه عملات ولا جواهر ولا خصومات: ما نلمس المحفظة غير منح المقتنى نفسه عبر نفس مسار مكافآت الرتب الموجود.
 * سياسات الإدارة المحفوظة لأي مستوى تتقدّم دائمًا على الافتراضي هنا. */
import type { ShopItem } from './catalog.js';
import type { ProgressSystem } from './progression.js';

type PerkItem = Pick<ShopItem, 'id' | 'slot' | 'name' | 'icon' | 'desc' | 'css' | 'rarity'> & { system: ProgressSystem; rank: number };
const F = (system: ProgressSystem, rank: number, id: string, name: string, css: string, rarity: ShopItem['rarity'], desc: string): PerkItem => ({ system, rank, id, slot: 'frame', name, icon: '👑', desc, css, rarity });
const B = (system: ProgressSystem, rank: number, id: string, name: string, css: string, rarity: ShopItem['rarity'], desc: string): PerkItem => ({ system, rank, id, slot: 'bg', name, icon: '🏰', desc, css, rarity });
const T = (system: ProgressSystem, rank: number, id: string, name: string, text: string, rarity: ShopItem['rarity']): PerkItem => ({ system, rank, id, slot: 'title', name: `لقب «${text}»`, icon: '🎖️', desc: `لقب حصري لرتبة ${name}.`, css: text, rarity });

// R58e: بدل مركبات الدخول (انشالت): فقاعات ولوحات أسماء حصرية للرتب
const U = (system: ProgressSystem, rank: number, id: string, name: string, css: string, rarity: ShopItem['rarity'], desc: string): PerkItem => ({ system, rank, id, slot: 'chat-bubble', name, icon: '💬', desc, css, rarity });
const D = (system: ProgressSystem, rank: number, id: string, name: string, css: string, rarity: ShopItem['rarity'], desc: string): PerkItem => ({ system, rank, id, slot: 'board', name, icon: '🪧', desc, css, rarity });

export const RANK_PERK_ITEMS: readonly PerkItem[] = Object.freeze([
  U('vip', 7, 'rp-vip-bub7', 'فقاعة بنفسج VIP', 'vip-purple', 'epic', 'فقاعة دردشة بنفسجية لامعة بالغرف، حصرية لـ VIP7.'),
  D('vip', 13, 'rp-vip-board13', 'لوحة الذهب الملكي VIP', 'gold', 'legendary', 'لوحة اسم ذهبية بتاج تحت اسمك، حصرية لـ VIP13.'),
  D('noble', 4, 'rp-nb-board4', 'لوحة ياقوت الإيرل', 'sapphire', 'rare', 'لوحة اسم ياقوتية تحت اسمك، حصرية لرتبة الإيرل N4.'),
  U('noble', 7, 'rp-nb-bub7', 'فقاعة تاج الأمير', 'nb-imperial', 'legendary', 'فقاعة دردشة إمبراطورية بتاج، حصرية لرتبة الأمير N7.'),
  // VIP
  F('vip', 2, 'rp-vip-f2', 'إطار فضة VIP', 'vip-f2', 'premium', 'إطار فضي مرصّع، حصري لأعضاء VIP2 وما فوق.'),
  B('vip', 4, 'rp-vip-b4', 'خلفية ليل الفضة', 'vip-b4', 'rare', 'خلفية ملف ليلية بلمعة فضية، حصرية لـ VIP4.'),
  F('vip', 6, 'rp-vip-f6', 'إطار ياقوت الملوك', 'vip-f6', 'rare', 'إطار ياقوت أزرق بفصوص لامعة، حصري لـ VIP6.'),
  F('vip', 9, 'rp-vip-f9', 'إطار كريستال الليل', 'vip-f9', 'epic', 'إطار كريستال بنفسجي متوهّج، حصري لـ VIP9.'),
  B('vip', 10, 'rp-vip-b10', 'خلفية قصر VIP', 'vip-b10', 'epic', 'قصر بأبراج ذهبية تحت سماء بنفسجية، حصري لـ VIP10.'),
  F('vip', 12, 'rp-vip-f12', 'إطار أجنحة الذهب', 'vip-f12', 'legendary', 'إطار ذهبي بأجنحة متحركة، حصري لـ VIP12.'),
  B('vip', 14, 'rp-vip-b14', 'خلفية العرش الذهبي', 'vip-b14', 'legendary', 'قاعة عرش ذهبية بأضواء ملكية، حصرية لـ VIP14.'),
  F('vip', 15, 'rp-vip-f15', 'إطار تاج VIP الأسطوري', 'vip-f15', 'ultra', 'أفخم إطار VIP: ياقوت وذهب بتاج كبير وأجنحة وهالة لهب، لـ VIP15 فقط.'),
  T('vip', 15, 'rp-vip-t15', 'VIP15', 'أسطورة VIP', 'ultra'),
  // نوبل
  T('noble', 1, 'rp-nb-t1', 'فارس', 'فارس', 'premium'),
  F('noble', 1, 'rp-nb-f1', 'إطار غار الفارس', 'nb-f1', 'premium', 'إطار برونزي بأوراق الغار، حصري لرتبة الفارس N1.'),
  T('noble', 2, 'rp-nb-t2', 'بارون', 'بارون', 'premium'),
  B('noble', 2, 'rp-nb-b2', 'خلفية قلعة الفرسان', 'nb-b2', 'rare', 'قلعة حجرية عند الغروب، حصرية لرتبة البارون N2.'),
  T('noble', 3, 'rp-nb-t3', 'فيكونت', 'فيكونت', 'rare'),
  F('noble', 3, 'rp-nb-f3', 'إطار شوك الفيكونت', 'nb-f3', 'rare', 'إطار فضي بأشواك ملكية، حصري لرتبة الفيكونت N3.'),
  T('noble', 4, 'rp-nb-t4', 'إيرل', 'إيرل', 'rare'),
  T('noble', 5, 'rp-nb-t5', 'ماركيز', 'ماركيز', 'epic'),
  B('noble', 5, 'rp-nb-b5', 'خلفية قصر الماركيز', 'nb-b5', 'epic', 'قصر رخامي تحت قمر ذهبي، حصري لرتبة الماركيز N5.'),
  T('noble', 6, 'rp-nb-t6', 'دوق', 'دوق', 'epic'),
  F('noble', 6, 'rp-nb-f6', 'إطار تاج الدوق', 'nb-f6', 'legendary', 'إطار ذهبي يعلوه تاج مرصّع، حصري لرتبة الدوق N6.'),
  T('noble', 7, 'rp-nb-t7', 'أمير', 'أمير', 'legendary'),
  B('noble', 7, 'rp-nb-b7', 'خلفية حدائق الأمراء', 'nb-b7', 'legendary', 'حدائق ملكية بنوافير ذهبية، حصرية لرتبة الأمير N7.'),
  T('noble', 8, 'rp-nb-t8', 'ملك', 'ملك', 'legendary'),
  F('noble', 8, 'rp-nb-f8', 'إطار عرش الملك', 'nb-f8', 'ultra', 'إطار ملكي بتاج وجواهر، حصري لرتبة الملك N8.'),
  T('noble', 9, 'rp-nb-t9', 'إمبراطور', 'إمبراطور', 'ultra'),
  F('noble', 9, 'rp-nb-f9', 'إطار الإمبراطور الأعظم', 'nb-f9', 'ultra', 'أعلى إطار بالموقع: تاج إمبراطوري وأجنحة وهالة، لـ N9 فقط.'),
  B('noble', 9, 'rp-nb-b9', 'خلفية سماء الإمبراطورية', 'nb-b9', 'ultra', 'سماء إمبراطورية بنجوم ذهبية وشعار التاج، لـ N9 فقط.'),
]);

/** مركبات الدخول الموجودة أصلًا بالمتجر تُمنح هدية عند هذي المستويات */
// R58e: السيارات انشالت من الموقع بطلب المالك، فما فيه مركبات تنمنح مع الرتب
const EXISTING_GRANTS: readonly { system: ProgressSystem; rank: number; itemId: string }[] = Object.freeze([]);

export const RANK_PERK_IDS: ReadonlySet<string> = new Set(RANK_PERK_ITEMS.map((i) => i.id));

/** سياسات افتراضية (عناصر فقط) لكل مستوى فيه مقتنى؛ تنستخدم بس للمستويات اللي ما لها سياسة من الإدارة */
export function defaultRankPolicies(): { system: ProgressSystem; rank: number; rewards: { type: 'item'; itemId: string; mode: 'grant' }[] }[] {
  const map = new Map<string, { system: ProgressSystem; rank: number; rewards: { type: 'item'; itemId: string; mode: 'grant' }[] }>();
  const add = (system: ProgressSystem, rank: number, itemId: string) => {
    const key = `${system}:${rank}`; if (!map.has(key)) map.set(key, { system, rank, rewards: [] });
    map.get(key)!.rewards.push({ type: 'item', itemId, mode: 'grant' });
  };
  for (const i of RANK_PERK_ITEMS) add(i.system, i.rank, i.id);
  for (const g of EXISTING_GRANTS) add(g.system, g.rank, g.itemId);
  return [...map.values()].sort((a, b) => a.system.localeCompare(b.system) || a.rank - b.rank);
}

/** عناصر المتجر للسلّم: ما تنباع (مخفية افتراضيًا)، وتظهر وتنجهّز لمالكها فقط */
export function rankPerkCatalogItems(): ShopItem[] {
  return RANK_PERK_ITEMS.map(({ system, rank, ...i }) => ({ ...i, price: 1, currency: 'gems' as const, permanent: true, rankPerk: { system, rank } }));
}
