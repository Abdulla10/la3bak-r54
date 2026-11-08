/** R57: توسعة المتجر بمقتنيات أصلية جديدة (رسومات SVG/WebP من صنع الموقع):
 * إطارات وخلفيات فخمة، فقاعات دردشة، لوحات أسماء، ومركبات دخول. أسعار بالجواهر/العملات حسب الندرة، والإدارة تقدر تغيّرها من لوحتها. */
import type { ShopItem, Rarity } from './catalog.js';
const X = (id: string, slot: ShopItem['slot'], name: string, icon: string, price: number, currency: 'coins' | 'gems', rarity: Rarity, desc: string, css: string): ShopItem =>
  ({ id, slot, name, icon, price, currency, desc, css, permanent: true, rarity, set: 'lux' });
export const LUX_SET = { lux: 'مجموعة الفخامة' };
export const LUX_ITEMS: ShopItem[] = [
  // إطارات
  X('lux-f-rose', 'frame', 'إطار الوردة الكريستالية', '💍', 800, 'gems', 'rare', 'كريستال وردي بفصوص لامعة.', 'lux-rose'),
  X('lux-f-ocean', 'frame', 'إطار موج المحيط', '💍', 800, 'gems', 'rare', 'حلقة فيروزية بقطرات جليدية.', 'lux-ocean'),
  X('lux-f-sakura', 'frame', 'إطار غار الساكورا', '💍', 900, 'gems', 'rare', 'أوراق غار وردية حول صورتك.', 'lux-sakura'),
  X('lux-f-obsidian', 'frame', 'إطار الأوبسيديان الذهبي', '💍', 2500, 'gems', 'epic', 'أسود لامع بمسامير ذهبية.', 'lux-obsidian'),
  X('lux-f-moon', 'frame', 'إطار مدار القمر', '💍', 2500, 'gems', 'epic', 'مدار فضي بقمر يدور.', 'lux-moon'),
  X('lux-f-desert', 'frame', 'إطار شوك الصحراء الذهبي', '💍', 2800, 'gems', 'epic', 'أشواك ذهبية بلمسة صحراوية.', 'lux-desert'),
  X('lux-f-emerald', 'frame', 'إطار تاج الزمرد', '💍', 8000, 'gems', 'legendary', 'تاج ذهبي مرصّع بالزمرد.', 'lux-emerald'),
  X('lux-f-ruby', 'frame', 'إطار تاج الياقوت الأحمر', '💍', 8000, 'gems', 'legendary', 'تاج ملكي بياقوت أحمر.', 'lux-ruby'),
  X('lux-f-phoenix', 'frame', 'إطار أجنحة العنقاء', '💍', 9000, 'gems', 'legendary', 'أجنحة نارية حول صورتك.', 'lux-phoenix'),
  X('lux-f-sapphire', 'frame', 'إطار أجنحة الياقوت الأزرق', '💍', 9000, 'gems', 'legendary', 'أجنحة بيضاء بإطار ياقوتي.', 'lux-sapphire'),
  X('lux-f-galaxy', 'frame', 'إطار ملك المجرّة', '💍', 20000, 'gems', 'ultra', 'تاج إمبراطوري وسط المجرّة.', 'lux-galaxy'),
  X('lux-f-inferno', 'frame', 'إطار تنين الجحيم', '💍', 22000, 'gems', 'ultra', 'تنين ناري ملتف بتاج.', 'lux-inferno'),
  // خلفيات
  X('lux-b-chandelier', 'bg', 'خلفية قاعة الثريّات', '🏛️', 30000, 'coins', 'epic', 'قاعة قصر بثريّات كريستال.', 'lux-chandelier'),
  X('lux-b-yacht', 'bg', 'خلفية يخت الليل', '🛥️', 30000, 'coins', 'epic', 'يخت فاخر تحت سماء المدينة.', 'lux-yacht'),
  X('lux-b-skyline', 'bg', 'خلفية أبراج المدينة', '🌃', 35000, 'coins', 'epic', 'أبراج مضيئة على الخليج ليلًا.', 'lux-skyline'),
  X('lux-b-dunes', 'bg', 'خلفية الكثبان الذهبية', '🏜️', 25000, 'coins', 'rare', 'كثبان ذهبية تحت قمر صحراوي.', 'lux-dunes'),
  X('lux-b-crystal', 'bg', 'خلفية قاعة الكريستال', '💎', 120000, 'coins', 'legendary', 'قاعة كريستال بأعمدة مضيئة.', 'lux-crystal'),
  X('lux-b-royalgalaxy', 'bg', 'خلفية المجرّة الملكية', '🌌', 120000, 'coins', 'legendary', 'مجرّة بنفسجية بتاج ذهبي.', 'lux-royalgalaxy'),
  X('lux-b-falls', 'bg', 'خلفية الشلال الذهبي', '🌊', 260000, 'coins', 'ultra', 'شلال ذهبي بين صخور مضيئة.', 'lux-falls'),
  X('lux-b-snowcastle', 'bg', 'خلفية قلعة الثلج', '🏰', 260000, 'coins', 'ultra', 'قلعة جليدية تحت الشفق القطبي.', 'lux-snowcastle'),
  // فقاعات الدردشة
  X('lux-bub-silver', 'chat-bubble', 'فقاعة الفضة', '💬', 300, 'gems', 'premium', 'فقاعة دردشة فضية لامعة بالغرف.', 'vip-silver'),
  X('lux-bub-bronze', 'chat-bubble', 'فقاعة البرونز', '💬', 300, 'gems', 'premium', 'فقاعة برونزية دافئة.', 'nb-bronze'),
  X('lux-bub-purple', 'chat-bubble', 'فقاعة البنفسج', '💬', 800, 'gems', 'rare', 'فقاعة بنفسجية بحواف لامعة.', 'vip-purple'),
  X('lux-bub-gold', 'chat-bubble', 'فقاعة الذهب', '💬', 2000, 'gems', 'epic', 'فقاعة ذهبية فخمة.', 'vip-gold'),
  X('lux-bub-legend', 'chat-bubble', 'فقاعة اللهب الأسطورية', '💬', 6000, 'gems', 'legendary', 'فقاعة نارية متدرجة.', 'vip-legend'),
  X('lux-bub-imperial', 'chat-bubble', 'فقاعة التاج الإمبراطورية', '💬', 15000, 'gems', 'ultra', 'فقاعة إمبراطورية بتاج فوقها.', 'nb-imperial'),
  // لوحات الأسماء (تظهر تحت اسمك بمقعد الغرفة وبملفك)
  X('lux-board-silver', 'board', 'لوحة الفضة', '🪧', 300, 'gems', 'premium', 'لوحة اسم فضية تحت اسمك.', 'silver'),
  X('lux-board-sapphire', 'board', 'لوحة الياقوت', '🪧', 800, 'gems', 'rare', 'لوحة زرقاء ياقوتية.', 'sapphire'),
  X('lux-board-amethyst', 'board', 'لوحة الجمشت', '🪧', 2000, 'gems', 'epic', 'لوحة بنفسجية بحواف ذهبية.', 'amethyst'),
  X('lux-board-gold', 'board', 'لوحة الذهب الملكي', '🪧', 6000, 'gems', 'legendary', 'لوحة ذهبية بتاج صغير.', 'gold'),
  X('lux-board-inferno', 'board', 'لوحة اللهب', '🪧', 15000, 'gems', 'ultra', 'لوحة نارية متحركة.', 'inferno'),
];

/** R57: أيديات حساب مميزة. كل رقم ينباع مرة وحدة لحساب واحد، ويصير هو رقمك الظاهر (displayPlayerId).
 * السعر حسب ندرة النمط. الأرقام المستخدمة من حسابات ثانية ما تنعرض ولا تنباع. */
const SID = (n: string, price: number, rarity: Rarity): ShopItem => ({ id: `sid-${n}`, slot: 'special-id', name: `أيدي ${n}`, icon: '🆔', price, currency: 'gems', desc: `رقم حساب مميز يظهر بملفك وبالغرف بدل رقمك العادي: ${n}`, css: n, permanent: true, rarity, set: 'lux' });
export const SPECIAL_ID_ITEMS: ShopItem[] = [
  // R58b: الأيديات المميزة من 45 مليون جوهرة وفوق، وكل ما قصر الرقم أو صار أندر غلي
  ...['1234567', '7654321', '1212121', '1000000', '2000000', '5000000', '1010101', '9090909'].map((n) => SID(n, 45_000_000, 'legendary')),
  ...['1111111', '2222222', '3333333', '4444444', '5555555', '6666666', '7777777', '8888888', '9999999'].map((n) => SID(n, 50_000_000, 'legendary')),
  ...['111111', '777777', '999999', '123456', '100000', '888888'].map((n) => SID(n, 75_000_000, 'ultra')),
  ...['11111', '77777', '99999', '12345', '10000'].map((n) => SID(n, 120_000_000, 'ultra')),
  ...['1111', '7777', '2026', '1000'].map((n) => SID(n, 250_000_000, 'ultra')),
];

/** R58: أيديات غرف مميزة — المالك يشتريها ويطبّقها على وحدة من غرفه (رقم وحدة لغرفة وحدة) */
const RID = (n: string, price: number, rarity: Rarity): ShopItem => ({ id: `rid-${n}`, slot: 'room-id', name: `أيدي غرفة ${n}`, icon: '🏠', price, currency: 'gems', desc: `رقم غرفة مميز يظهر بدل رقم غرفتك العادي: ${n}`, css: n, permanent: true, rarity, set: 'lux' });
export const ROOM_ID_ITEMS: ShopItem[] = [
  ...['11111111', '22222222', '33333333', '55555555', '77777777', '88888888', '99999999', '12345678', '87654321'].map((n) => RID(n, 45_000_000, 'legendary')),
  ...['1111111', '7777777', '9999999', '1234567'].map((n) => RID(n, 60_000_000, 'ultra')),
  ...['111111', '777777', '999999', '100000'].map((n) => RID(n, 90_000_000, 'ultra')),
  ...['11111', '77777', '2026', '313'].map((n) => RID(n, 200_000_000, 'ultra')),
];
