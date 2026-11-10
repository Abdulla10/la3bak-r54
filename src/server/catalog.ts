import { rankPerkCatalogItems } from './rank-perks-r56.js';
import { r67Price } from './store-price-r67.js';
import { LUX_ITEMS, LUX_SET, SPECIAL_ID_ITEMS, ROOM_ID_ITEMS, SOUVENIR_ITEMS, ROOM_BG_ITEMS, CUE_ITEMS } from './store-lux-r57.js';
import { luxuryPricedSeed } from './luxury-pricing-r23.js';
import { gemsOnlyStorePrice } from './store-gems-r58.js';
import type { Cur, ShopItemRef } from './wallet.js';
import { REFERENCE_ITEMS, REFERENCE_SETS } from './reference-catalog.js';
import { BACKGROUND_ITEMS, type BackgroundCategory } from './background-catalog.js';
import { ENTRANCE_ITEMS } from './entrance-catalog.js';

/**
 * كتالوج المتجر — المصدر الوحيد للأسعار. العميل يرسل معرّف العنصر فقط والخادم يقرر السعر.
 * كل العناصر تجميلية بالكامل (تظهر بالملف الشخصي وبطاقة اللاعب) وما تعطي أي أفضلية داخل اللعب.
 */
export type Slot = 'frame' | 'bg' | 'title' | 'badge' | 'avatar' | 'entrance' | 'chat-bubble' | 'board' | 'special-id' | 'room-id' | 'souvenir' | 'mic-frame' | 'room-bg' | 'cue';
export type Rarity = 'common' | 'premium' | 'rare' | 'epic' | 'legendary' | 'ultra';
export const RARITIES: Rarity[] = ['common', 'premium', 'rare', 'epic', 'legendary', 'ultra'];
/** set = المجموعة المنسّقة، season = وسم موسمي (عرض فقط، بدون انتهاء)، kids = مناسب لعالم الصغار */
export interface ShopItem extends ShopItemRef {
  slot: Slot; name: string; icon: string; desc: string; css?: string; art?: string; rarity?: Rarity; set?: string; season?: string; kids?: boolean;
  backgroundCategory?: BackgroundCategory; preview?: string; previewPlaceholder?: boolean;
  /** Seed proposals never grant purchase approval; ShopCatalog derives approval from explicit admin overrides. */
  proposalOnly?: boolean; priceApproved?: boolean;
  /** R56: مقتنى من سلّم امتيازات VIP/نوبل — ما ينباع، يُستلم من مكافآت الرتب */
  rankPerk?: { system: 'level' | 'vip' | 'noble'; rank: number };
}
export const SETS: Record<string, string> = { royal: 'المجموعة الملكية', galaxy: 'مجموعة المجرة', ice: 'مملكة الجليد', dragon: 'مجموعة التنين', shadow: 'الأسود والفضي', kids: 'عالم الصغار', emperor: 'الإمبراطور الذهبي', magic: 'الحدائق السحرية', wild: 'البرية' };
/** سعر حسب الندرة (العناصر الجديدة): عادي→ملحمي بالعملات، أسطوري وفخم جداً بالجواهر */
const PRICE: Record<Rarity, [number, Cur]> = { common: [400, 'coins'], premium: [1200, 'coins'], rare: [3000, 'coins'], epic: [6000, 'coins'], legendary: [80, 'gems'], ultra: [150, 'gems'] };
const N = (id: string, slot: Slot, name: string, icon: string, rarity: Rarity, desc: string, css: string, set?: string, extra: Partial<ShopItem> = {}): ShopItem =>
  ({ id, slot, name, icon, price: PRICE[rarity][0], currency: PRICE[rarity][1], desc, css, permanent: true, rarity, ...(set && { set }), ...(set === 'kids' && { kids: true }), ...extra });

const I = (id: string, slot: Slot, name: string, icon: string, price: number, currency: Cur, desc: string, css = ''): ShopItem =>
  ({ id, slot, name, icon, price, currency, desc, css, permanent: true });

export const CATALOG: ShopItem[] = [
  I('frame-emerald', 'frame', 'إطار زمرد', '🟢', 400, 'coins', 'إطار أخضر لامع حول صورتك.', 'emerald'),
  I('frame-gold', 'frame', 'إطار ذهبي', '🟡', 600, 'coins', 'إطار ذهبي كلاسيكي.', 'gold'),
  I('frame-royal', 'frame', 'إطار ملكي', '👑', 20, 'gems', 'إطار بنفسجي-ذهبي حصري.', 'royal'),
  I('frame-neon', 'frame', 'إطار نيون', '💠', 30, 'gems', 'توهّج نيون حصري.', 'neon'),
  I('bg-sunset', 'bg', 'خلفية غروب', '🌇', 500, 'coins', 'خلفية دافئة لبطاقة ملفك.', 'sunset'),
  I('bg-forest', 'bg', 'خلفية غابة', '🌲', 350, 'coins', 'خلفية خضراء هادئة.', 'forest'),
  I('bg-desert', 'bg', 'خلفية صحراء', '🏜️', 15, 'gems', 'كثبان ذهبية حصرية.', 'desert'),
  I('bg-galaxy', 'bg', 'خلفية مجرّة', '🌌', 25, 'gems', 'سماء مرصّعة بالنجوم حصرية.', 'galaxy'),
  I('title-fighter', 'title', 'لقب «المحارب»', '⚔️', 300, 'coins', 'لقب يظهر تحت اسمك.', 'المحارب'),
  I('title-ace', 'title', 'لقب «ملك الأوراق»', '🃏', 30, 'gems', 'لقب حصري.', 'ملك الأوراق'),
  I('title-legend', 'title', 'لقب «الأسطورة»', '🏆', 40, 'gems', 'لقب حصري.', 'الأسطورة'),
  I('badge-star', 'badge', 'شارة نجمة', '⭐', 200, 'coins', 'شارة بجانب اسمك.', '⭐'),
  I('badge-diamond', 'badge', 'شارة ألماسة', '💎', 10, 'gems', 'شارة حصرية.', '💎'),
  I('badge-falcon', 'badge', 'شارة صقر', '🦅', 15, 'gems', 'شارة حصرية.', '🦅'),
  // ---- الأفاتارات (معتمدة): 5 عادي 500 • 4 مميز 1,500 • 3 نادر 3,000 • 2 أسطوري 7,500 • 1 حصري 15,000 (عملات). التصميم بالواجهة (public/avatars.js) والفئة بحقل css ----
  I('av-falcon', 'avatar', 'الصقر', '🦅', 500, 'coins', 'أفاتار عادي: صقر بعين حادة.', 'common'),
  I('av-cat', 'avatar', 'القط', '🐱', 500, 'coins', 'أفاتار عادي: قط فضولي.', 'common'),
  I('av-fox', 'avatar', 'الثعلب', '🦊', 500, 'coins', 'أفاتار عادي: ثعلب ماكر.', 'common'),
  I('av-palm', 'avatar', 'النخلة', '🌴', 500, 'coins', 'أفاتار عادي: نخلة عند الغروب.', 'common'),
  I('av-dallah', 'avatar', 'الدلّة', '☕', 500, 'coins', 'أفاتار عادي: دلّة قهوة ذهبية.', 'common'),
  I('av-knight', 'avatar', 'الفارس', '🛡️', 1500, 'coins', 'أفاتار مميز: فارس بخوذة فضية.', 'premium'),
  I('av-astro', 'avatar', 'رائد الفضاء', '🧑‍🚀', 1500, 'coins', 'أفاتار مميز: رائد بخوذة زرقاء.', 'premium'),
  I('av-wizard', 'avatar', 'الساحر', '🧙', 1500, 'coins', 'أفاتار مميز: ساحر بقبعة نجوم.', 'premium'),
  I('av-ninja', 'avatar', 'النينجا', '🥷', 1500, 'coins', 'أفاتار مميز: نينجا صامت.', 'premium'),
  I('av-phoenix', 'avatar', 'العنقاء', '🔥', 3000, 'coins', 'أفاتار نادر: طائر من اللهب.', 'rare'),
  I('av-wolf', 'avatar', 'الذئب', '🐺', 3000, 'coins', 'أفاتار نادر: ذئب الليل.', 'rare'),
  I('av-lion', 'avatar', 'الأسد', '🦁', 3000, 'coins', 'أفاتار نادر: أسد بعرف ذهبي.', 'rare'),
  I('av-dragonlord', 'avatar', 'سيّد التنين', '🐉', 7500, 'coins', 'أفاتار أسطوري: تنين بتاج وقرون.', 'legendary'),
  I('av-icequeen', 'avatar', 'ملكة الجليد', '❄️', 7500, 'coins', 'أفاتار أسطوري: ملكة بتاج جليدي.', 'legendary'),
  I('av-emperor', 'avatar', 'الإمبراطور الذهبي', '👑', 15000, 'coins', 'أفاتار حصري: قناع الإمبراطور الذهبي.', 'exclusive'),
  // ---- المتجر الفاخر (نوفمبر 2026): رسوم SVG أصلية في public/cosmetics.js. الندرة تضيف تفاصيل (حافة، بريق، أجنحة، أشعة، تاج، حركة) مو لون بس ----
  N('av2-wolf-gray', 'avatar', 'ذئب الجبل', '🐺', 'common', 'ذئب رمادي بعين ذهبية.', 'av2', 'wild'),
  N('av2-wolf-moon', 'avatar', 'ذئب القمر', '🐺', 'epic', 'ذئب ليلي بعيون متوهجة وأجنحة.', 'av2', 'shadow'),
  N('av2-tiger', 'avatar', 'النمر', '🐯', 'premium', 'نمر برتقالي مخطط.', 'av2', 'wild'),
  N('av2-tiger-white', 'avatar', 'النمر الأبيض', '🐯', 'legendary', 'نمر ثلجي نادر بهالة وأشعة.', 'av2', 'ice', { season: 'شتاء' }),
  N('av2-fox-arctic', 'avatar', 'ثعلب القطب', '🦊', 'rare', 'ثعلب أبيض بلمعة جليد.', 'av2', 'ice', { season: 'شتاء' }),
  N('av2-fox-spirit', 'avatar', 'ثعلب الأرواح', '🦊', 'legendary', 'ثعلب أسطوري بألوان الغروب.', 'av2', 'magic'),
  N('av2-panda', 'avatar', 'الباندا', '🐼', 'common', 'باندا لطيف.', 'av2', 'kids'),
  N('av2-panda-kungfu', 'avatar', 'باندا الكونغ فو', '🐼', 'premium', 'باندا بعصابة حمراء.', 'av2', 'wild'),
  N('av2-dragon-jade', 'avatar', 'تنين اليشم', '🐲', 'rare', 'تنين أخضر بقرون.', 'av2', 'dragon'),
  N('av2-dragon-ember', 'avatar', 'تنين الجمر', '🐉', 'epic', 'تنين ناري بأجنحة.', 'av2', 'dragon'),
  N('av2-dragon-king', 'avatar', 'ملك التنانين', '🐉', 'ultra', 'تنين بنفسجي بتاج وأشعة وأجنحة ذهبية.', 'av2', 'dragon'),
  N('av2-unicorn', 'avatar', 'وحيد القرن السحري', '🦄', 'rare', 'حصان أسطوري بقرن ذهبي.', 'av2', 'magic'),
  N('av2-griffin', 'avatar', 'العنقاء الذهبية', '🦅', 'epic', 'مخلوق أسطوري برأس نسر.', 'av2', 'magic'),
  N('av2-king', 'avatar', 'الملك', '🤴', 'legendary', 'ملك بتاج مرصّع ولحية.', 'av2', 'royal'),
  N('av2-queen', 'avatar', 'الملكة', '👸', 'legendary', 'ملكة بتاج ألماس.', 'av2', 'royal'),
  N('av2-sultan', 'avatar', 'السلطان', '👳', 'ultra', 'سلطان بعمامة وجوهرة وأجنحة ذهبية.', 'av2', 'emperor'),
  N('av2-robot', 'avatar', 'الروبوت', '🤖', 'common', 'روبوت كرتوني بعيون مضيئة.', 'av2', 'galaxy'),
  N('av2-blob', 'avatar', 'الوحش اللطيف', '👾', 'premium', 'وحش كرتوني بعين وحدة.', 'av2', 'kids'),
  N('av2-bunny', 'avatar', 'الأرنوب', '🐰', 'common', 'أرنب بفيونكة.', 'av2', 'kids'),
  N('av2-bear', 'avatar', 'الدبدوب', '🐻', 'common', 'دب بني صغير.', 'av2', 'kids'),
  N('av2-chick', 'avatar', 'الكتكوت', '🐥', 'common', 'كتكوت أصفر.', 'av2', 'kids'),
  N('av2-dino', 'avatar', 'الديناصور الصغير', '🦖', 'premium', 'ديناصور أخضر مبتسم.', 'av2', 'kids'),
  N('av2-hero', 'avatar', 'البطل المقنّع', '🦸', 'rare', 'بطل بقناع ورداء.', 'av2', 'shadow'),
  N('av2-archer', 'avatar', 'رامي السهام', '🏹', 'premium', 'رامٍ بقلنسوة خضراء.', 'av2', 'wild'),
  N('frame2-bronze', 'frame', 'إطار برونزي', '🟤', 'common', 'حلقة برونز بسيطة.', 'bronze'),
  N('frame2-kids-rainbow', 'frame', 'إطار قوس قزح', '🌈', 'common', 'ألوان مبهجة للصغار.', 'kids-rainbow', 'kids'),
  N('frame2-kids-candy', 'frame', 'إطار الحلاوة', '🍬', 'common', 'مخطط وردي وأبيض.', 'kids-candy', 'kids'),
  N('frame2-kids-stars', 'frame', 'إطار النجوم', '⭐', 'premium', 'نجوم ذهبية حول صورتك.', 'kids-stars', 'kids'),
  N('frame2-gold-crest', 'frame', 'إطار الغار الذهبي', '🏅', 'premium', 'أوراق غار ذهبية.', 'gold-crest', 'emperor'),
  N('frame2-onyx', 'frame', 'إطار الأونيكس', '⚫', 'premium', 'أسود بمسامير فضية.', 'onyx', 'shadow'),
  N('frame2-silver-thorn', 'frame', 'إطار الأشواك الفضية', '🗡️', 'rare', 'فضي بأشواك حادة.', 'silver-thorn', 'shadow'),
  N('frame2-diamond', 'frame', 'إطار الألماس', '💎', 'rare', 'أوجه ألماس زرقاء.', 'diamond', 'ice'),
  N('frame2-ice', 'frame', 'إطار الجليد', '❄️', 'rare', 'رقاقات ثلج ودلّايات.', 'ice', 'ice', { season: 'شتاء' }),
  N('frame2-crystal', 'frame', 'إطار الكريستال', '🔮', 'epic', 'كريستال بنفسجي ببريق.', 'crystal', 'magic'),
  N('frame2-galaxy', 'frame', 'إطار المجرة', '🪐', 'epic', 'مدار يدور بكوكب.', 'galaxy', 'galaxy'),
  N('frame2-nebula', 'frame', 'إطار السديم', '🌌', 'legendary', 'سديم وردي بتوهج.', 'nebula', 'galaxy'),
  N('frame2-angel-wings', 'frame', 'إطار الأجنحة', '🪽', 'legendary', 'جناحان أبيضان يرفرفان.', 'angel-wings', 'royal'),
  N('frame2-royal-crown', 'frame', 'إطار التاج الملكي', '👑', 'legendary', 'تاج ذهبي بجواهر حمراء.', 'royal-crown', 'royal'),
  N('frame2-dragon-coil', 'frame', 'إطار التنين الملتف', '🐉', 'ultra', 'تنين ناري يلتف حول صورتك.', 'dragon-coil', 'dragon'),
  N('frame2-emperor', 'frame', 'إطار الإمبراطور', '🏛️', 'ultra', 'تاج وأجنحة وجواهر ونجوم تدور.', 'emperor', 'emperor'),
  N('bg2-kids-candy', 'bg', 'أرض الحلاوة', '🍭', 'common', 'تلال حلاوة ومصاصات.', 'kids-candy', 'kids'),
  N('bg2-kids-jungle', 'bg', 'الغابة المرحة', '🌴', 'common', 'شمس مبتسمة ونخيل.', 'kids-jungle', 'kids'),
  N('bg2-kids-sea', 'bg', 'تحت البحر', '🐠', 'common', 'أسماك وفقاعات.', 'kids-sea', 'kids'),
  N('bg2-desert-night', 'bg', 'ليل الصحراء', '🌙', 'common', 'كثبان وهلال ونجوم.', 'desert-night', 'wild'),
  N('bg2-space', 'bg', 'الفضاء', '🪐', 'premium', 'كوكب بحلقات ونجوم.', 'space', 'galaxy'),
  N('bg2-magic-garden', 'bg', 'الحديقة السحرية', '🌸', 'premium', 'زهور مضيئة ويراعات.', 'magic-garden', 'magic'),
  N('bg2-palace', 'bg', 'القصر', '🕌', 'rare', 'قباب ومآذن عند الغروب.', 'palace', 'royal'),
  N('bg2-future-city', 'bg', 'مدينة المستقبل', '🌃', 'rare', 'أبراج بنوافذ نيون.', 'future-city', 'galaxy'),
  N('bg2-castle', 'bg', 'القلعة', '🏰', 'rare', 'قلعة بأبراج وأعلام.', 'castle', 'royal'),
  N('bg2-nebula', 'bg', 'السديم', '🌌', 'epic', 'سحب كونية وردية وزرقاء.', 'nebula-bg', 'galaxy'),
  N('bg2-ice-kingdom', 'bg', 'مملكة الجليد', '🧊', 'epic', 'جبال جليد وثلج.', 'ice-kingdom', 'ice', { season: 'شتاء' }),
  N('bg2-aurora', 'bg', 'الشفق القطبي', '🌠', 'epic', 'أضواء شفق تتموج.', 'aurora', 'ice', { season: 'شتاء' }),
  N('bg2-throne', 'bg', 'قاعة العرش', '🪑', 'legendary', 'عرش ذهبي بين أعمدة.', 'throne', 'royal'),
  N('bg2-crystal-cave', 'bg', 'كهف الكريستال', '💠', 'legendary', 'بلورات متلألئة.', 'crystal-cave', 'magic'),
  N('bg2-dragon-lair', 'bg', 'عرين التنين', '🌋', 'ultra', 'حمم وتنين بالظل.', 'dragon-lair', 'dragon'),
  N('bg2-golden-hall', 'bg', 'القاعة الذهبية', '✨', 'ultra', 'أقواس ذهبية وثريات.', 'golden-hall', 'emperor'),
  N('title2-star', 'title', 'لقب «نجم السهرة»', '🌟', 'premium', 'لقب مدفوع.', 'نجم السهرة'),
  N('title2-night', 'title', 'لقب «سيّد الليل»', '🌙', 'rare', 'لقب مدفوع.', 'سيّد الليل', 'shadow'),
  N('badge2-flame', 'badge', 'شارة لهب', '🔥', 'premium', 'شارة بجانب اسمك.', '🔥'),
  N('badge2-moon', 'badge', 'شارة هلال', '🌙', 'rare', 'شارة بجانب اسمك.', '🌙', 'shadow'),
  N('badge2-crown', 'badge', 'شارة تاج', '👑', 'epic', 'شارة بجانب اسمك.', '👑', 'royal'),
  N('title3-kind', 'title', 'لقب «طيب القلب»', '💚', 'common', 'لقب يظهر تحت اسمك.', 'طيب القلب'),
  N('title3-funny', 'title', 'لقب «ملك الضحك»', '😂', 'common', 'لقب يظهر تحت اسمك.', 'ملك الضحك'),
  N('title3-talker', 'title', 'لقب «أبو السوالف»', '🗣️', 'common', 'لقب يظهر تحت اسمك.', 'أبو السوالف'),
  N('title3-hero', 'title', 'لقب «بطل المجلس»', '🛡️', 'premium', 'لقب يظهر تحت اسمك.', 'بطل المجلس'),
  N('title3-gamer', 'title', 'لقب «قيمر محترف»', '🎮', 'premium', 'لقب يظهر تحت اسمك.', 'قيمر محترف'),
  N('title3-sniper', 'title', 'لقب «القناص»', '🎯', 'premium', 'لقب يظهر تحت اسمك.', 'القناص'),
  N('title3-generous', 'title', 'لقب «الكريم»', '🎁', 'rare', 'لقب يظهر تحت اسمك.', 'الكريم'),
  N('title3-falcon', 'title', 'لقب «صقر الخليج»', '🦅', 'rare', 'لقب يظهر تحت اسمك.', 'صقر الخليج', 'royal'),
  N('title3-sheikh', 'title', 'لقب «شيخ المجلس»', '🪔', 'rare', 'لقب يظهر تحت اسمك.', 'شيخ المجلس', 'royal'),
  N('title3-star', 'title', 'لقب «نجمة المجلس»', '💫', 'epic', 'لقب يظهر تحت اسمك.', 'نجمة المجلس', 'galaxy'),
  N('title3-wolf', 'title', 'لقب «الذيب»', '🐺', 'epic', 'لقب يظهر تحت اسمك.', 'الذيب', 'shadow'),
  N('title3-dragon', 'title', 'لقب «سيّد التنين»', '🐉', 'legendary', 'لقب يظهر تحت اسمك.', 'سيّد التنين', 'dragon'),
  N('title3-emperor', 'title', 'لقب «الإمبراطور»', '👑', 'legendary', 'لقب يظهر تحت اسمك.', 'الإمبراطور', 'emperor'),
  N('title3-legend', 'title', 'لقب «أسطورة لعبك»', '🏆', 'ultra', 'لقب يظهر تحت اسمك.', 'أسطورة لعبك', 'emperor'),
  N('title3-king', 'title', 'لقب «ملك الملوك»', '🔱', 'ultra', 'لقب يظهر تحت اسمك.', 'ملك الملوك', 'royal'),
  N('badge3-heart', 'badge', 'شارة قلب', '💖', 'common', 'شارة بجانب اسمك.', '💖'),
  N('badge3-sun', 'badge', 'شارة شمس', '☀️', 'common', 'شارة بجانب اسمك.', '☀️'),
  N('badge3-rose', 'badge', 'شارة وردة', '🌹', 'common', 'شارة بجانب اسمك.', '🌹'),
  N('badge3-music', 'badge', 'شارة نغمة', '🎵', 'premium', 'شارة بجانب اسمك.', '🎵'),
  N('badge3-game', 'badge', 'شارة يد ألعاب', '🎮', 'premium', 'شارة بجانب اسمك.', '🎮'),
  N('badge3-lightning', 'badge', 'شارة برق', '⚡', 'premium', 'شارة بجانب اسمك.', '⚡'),
  N('badge3-butterfly', 'badge', 'شارة فراشة', '🦋', 'rare', 'شارة بجانب اسمك.', '🦋'),
  N('badge3-sword', 'badge', 'شارة سيفين', '⚔️', 'rare', 'شارة بجانب اسمك.', '⚔️', 'shadow'),
  N('badge3-shield', 'badge', 'شارة درع', '🛡️', 'rare', 'شارة بجانب اسمك.', '🛡️', 'royal'),
  N('badge3-comet', 'badge', 'شارة مذنب', '☄️', 'epic', 'شارة بجانب اسمك.', '☄️', 'galaxy'),
  N('badge3-snow', 'badge', 'شارة ندفة ثلج', '❄️', 'epic', 'شارة بجانب اسمك.', '❄️', 'ice'),
  N('badge3-dragon', 'badge', 'شارة تنين', '🐉', 'legendary', 'شارة بجانب اسمك.', '🐉', 'dragon'),
  N('badge3-trident', 'badge', 'شارة رمح ملكي', '🔱', 'legendary', 'شارة بجانب اسمك.', '🔱', 'emperor'),
  N('badge3-gem', 'badge', 'شارة جوهرة ملكية', '💠', 'ultra', 'شارة بجانب اسمك.', '💠', 'emperor'),
];
CATALOG.push(...REFERENCE_ITEMS);
Object.assign(SETS, REFERENCE_SETS);
const backgroundIds = new Set(CATALOG.map((i) => i.id));
for (const i of BACKGROUND_ITEMS) {
  if (backgroundIds.has(i.id)) throw new Error(`Background catalog ID collision: ${i.id}`);
  backgroundIds.add(i.id);
}
CATALOG.push(...BACKGROUND_ITEMS);
const entranceIds = new Set(CATALOG.map((i) => i.id));
for (const i of ENTRANCE_ITEMS) {
  if (entranceIds.has(i.id)) throw new Error(`Entrance catalog ID collision: ${i.id}`);
  entranceIds.add(i.id);
}
CATALOG.push(...ENTRANCE_ITEMS);
const perkIds = new Set(CATALOG.map((i) => i.id));
for (const i of [...LUX_ITEMS, ...SPECIAL_ID_ITEMS, ...ROOM_ID_ITEMS, ...SOUVENIR_ITEMS, ...ROOM_BG_ITEMS, ...CUE_ITEMS]) { if (perkIds.has(i.id)) throw new Error(`Lux catalog ID collision: ${i.id}`); perkIds.add(i.id); CATALOG.push(i); }
Object.assign(SETS, LUX_SET);
for (const i of rankPerkCatalogItems()) { if (perkIds.has(i.id)) throw new Error(`Rank perk catalog ID collision: ${i.id}`); perkIds.add(i.id); CATALOG.push(i); }
/** ندرة العناصر القديمة (ما تغيّرت أسعارها) */
const OLD_RARITY: Record<string, Rarity> = { 'frame-emerald': 'common', 'frame-gold': 'premium', 'frame-royal': 'rare', 'frame-neon': 'epic', 'bg-forest': 'common', 'bg-sunset': 'premium', 'bg-desert': 'rare', 'bg-galaxy': 'epic', 'title-fighter': 'common', 'title-ace': 'rare', 'title-legend': 'epic', 'badge-star': 'common', 'badge-diamond': 'premium', 'badge-falcon': 'rare' };
for (const i of CATALOG) if (!i.rarity) i.rarity = OLD_RARITY[i.id] ?? (i.slot === 'avatar' ? ({ common: 'common', premium: 'premium', rare: 'rare', legendary: 'legendary', exclusive: 'ultra' } as Record<string, Rarity>)[i.css ?? ''] : undefined) ?? 'common';
for (const i of CATALOG) if (i.id === 'av-emperor') i.set = 'emperor';
for (let index=0;index<CATALOG.length;index++) CATALOG[index]=r67Price(gemsOnlyStorePrice(luxuryPricedSeed(CATALOG[index])));
const BY_ID = new Map(CATALOG.map((i) => [i.id, i]));
export const itemOf = (id: unknown): ShopItem | undefined => (typeof id === 'string' ? BY_ID.get(id) : undefined);
export const SLOTS: Slot[] = ['frame', 'bg', 'title', 'badge', 'avatar', 'entrance', 'chat-bubble', 'board', 'special-id', 'room-id', 'souvenir', 'mic-frame', 'room-bg', 'cue'];

/** مكافآت إنجازات محددة: الخادم يتحقق من الشرط من سجله هو (مو من العميل) وتنصرف مرة وحدة لكل حساب */
export interface Milestone { id: string; label: string; cur: Cur; amount: number; goal: number; metric: 'wins' | 'played' | 'level' }
export const MILESTONES: Milestone[] = [
  { id: 'm-first-win', label: 'أول فوز', cur: 'coins', amount: 100, goal: 1, metric: 'wins' },
  { id: 'm-played-10', label: 'أكمل 10 مباريات', cur: 'coins', amount: 150, goal: 10, metric: 'played' },
  { id: 'm-wins-10', label: 'فز 10 مرات', cur: 'gems', amount: 5, goal: 10, metric: 'wins' },
  { id: 'm-level-5', label: 'وصل المستوى 5', cur: 'gems', amount: 3, goal: 5, metric: 'level' },
  { id: 'm-wins-50', label: 'فز 50 مرة', cur: 'gems', amount: 15, goal: 50, metric: 'wins' },
];
