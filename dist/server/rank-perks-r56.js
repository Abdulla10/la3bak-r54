const F = (system, rank, id, name, css, rarity, desc) => ({ system, rank, id, slot: 'frame', name, icon: '👑', desc, css, rarity });
const B = (system, rank, id, name, css, rarity, desc) => ({ system, rank, id, slot: 'bg', name, icon: '🏰', desc, css, rarity });
const T = (system, rank, id, name, text, rarity) => ({ system, rank, id, slot: 'title', name: `لقب «${text}»`, icon: '🎖️', desc: `لقب حصري لرتبة ${name}.`, css: text, rarity });
// R58e: بدل مركبات الدخول (انشالت): فقاعات ولوحات أسماء حصرية للرتب
const U = (system, rank, id, name, css, rarity, desc) => ({ system, rank, id, slot: 'chat-bubble', name, icon: '💬', desc, css, rarity });
const D = (system, rank, id, name, css, rarity, desc) => ({ system, rank, id, slot: 'board', name, icon: '🪧', desc, css, rarity });
export const RANK_PERK_ITEMS = Object.freeze([
    // R58i: إطار لكل مستوى VIP ونبلاء (تصميم المالك)
    F('vip', 1, 'rp-vip-f1', 'إطار غار الذهب VIP', 'vip-f1', 'premium', 'إطار حصري لأعضاء VIP1 وما فوق.'),
    F('vip', 2, 'rp-vip-f2', 'إطار غار الكريستال VIP', 'vip-f2', 'premium', 'إطار حصري لأعضاء VIP2 وما فوق.'),
    F('vip', 3, 'rp-vip-f3', 'إطار تاج الياقوت VIP', 'vip-f3', 'premium', 'إطار حصري لأعضاء VIP3 وما فوق.'),
    F('vip', 4, 'rp-vip-f4', 'إطار غار البنفسج VIP', 'vip-f4', 'rare', 'إطار حصري لأعضاء VIP4 وما فوق.'),
    F('vip', 5, 'rp-vip-f5', 'إطار لهب الياقوت VIP', 'vip-f5', 'rare', 'إطار حصري لأعضاء VIP5 وما فوق.'),
    F('vip', 6, 'rp-vip-f6', 'إطار جليد الملوك VIP', 'vip-f6', 'rare', 'إطار حصري لأعضاء VIP6 وما فوق.'),
    F('vip', 7, 'rp-vip-f7', 'إطار القلب الوردي VIP', 'vip-f7', 'epic', 'إطار حصري لأعضاء VIP7 وما فوق.'),
    F('vip', 8, 'rp-vip-f8', 'إطار أجنحة الفجر VIP', 'vip-f8', 'epic', 'إطار حصري لأعضاء VIP8 وما فوق.'),
    F('vip', 9, 'rp-vip-f9', 'إطار تاج البنفسج VIP', 'vip-f9', 'epic', 'إطار حصري لأعضاء VIP9 وما فوق.'),
    F('vip', 10, 'rp-vip-f10', 'إطار أسود العرش VIP', 'vip-f10', 'legendary', 'إطار حصري لأعضاء VIP10 وما فوق.'),
    F('vip', 11, 'rp-vip-f11', 'إطار تنين الجليد VIP', 'vip-f11', 'legendary', 'إطار حصري لأعضاء VIP11 وما فوق.'),
    F('vip', 12, 'rp-vip-f12', 'إطار أسد الذهب VIP', 'vip-f12', 'legendary', 'إطار حصري لأعضاء VIP12 وما فوق.'),
    F('vip', 13, 'rp-vip-f13', 'إطار قلعة البنفسج VIP', 'vip-f13', 'ultra', 'إطار حصري لأعضاء VIP13 وما فوق.'),
    F('vip', 14, 'rp-vip-f14', 'إطار أجنحة الثلج VIP', 'vip-f14', 'ultra', 'إطار حصري لأعضاء VIP14 وما فوق.'),
    F('vip', 15, 'rp-vip-f15', 'إطار تاج VIP الأسطوري', 'vip-f15', 'ultra', 'إطار حصري لأعضاء VIP15 وما فوق.'),
    F('noble', 1, 'rp-nb-f1', 'إطار غار الفارس', 'nb-f1', 'premium', 'إطار حصري لرتبة N1 وما فوق.'),
    F('noble', 2, 'rp-nb-f2', 'إطار ياقوت البارون', 'nb-f2', 'premium', 'إطار حصري لرتبة N2 وما فوق.'),
    F('noble', 3, 'rp-nb-f3', 'إطار بنفسج الفيكونت', 'nb-f3', 'rare', 'إطار حصري لرتبة N3 وما فوق.'),
    F('noble', 4, 'rp-nb-f4', 'إطار جليد الإيرل', 'nb-f4', 'rare', 'إطار حصري لرتبة N4 وما فوق.'),
    F('noble', 5, 'rp-nb-f5', 'إطار أجنحة الماركيز', 'nb-f5', 'epic', 'إطار حصري لرتبة N5 وما فوق.'),
    F('noble', 6, 'rp-nb-f6', 'إطار تاج الدوق', 'nb-f6', 'legendary', 'إطار حصري لرتبة N6 وما فوق.'),
    F('noble', 7, 'rp-nb-f7', 'إطار أسد الأمير', 'nb-f7', 'legendary', 'إطار حصري لرتبة N7 وما فوق.'),
    F('noble', 8, 'rp-nb-f8', 'إطار أجنحة الملك', 'nb-f8', 'ultra', 'إطار حصري لرتبة N8 وما فوق.'),
    F('noble', 9, 'rp-nb-f9', 'إطار الإمبراطور الأعظم', 'nb-f9', 'ultra', 'إطار حصري لرتبة N9 وما فوق.'),
    U('vip', 7, 'rp-vip-bub7', 'فقاعة بنفسج VIP', 'vip-purple', 'epic', 'فقاعة دردشة بنفسجية لامعة بالغرف، حصرية لـ VIP7.'),
    D('vip', 13, 'rp-vip-board13', 'لوحة الذهب الملكي VIP', 'gold', 'legendary', 'لوحة اسم ذهبية بتاج تحت اسمك، حصرية لـ VIP13.'),
    D('noble', 4, 'rp-nb-board4', 'لوحة ياقوت الإيرل', 'sapphire', 'rare', 'لوحة اسم ياقوتية تحت اسمك، حصرية لرتبة الإيرل N4.'),
    U('noble', 7, 'rp-nb-bub7', 'فقاعة تاج الأمير', 'nb-imperial', 'legendary', 'فقاعة دردشة إمبراطورية بتاج، حصرية لرتبة الأمير N7.'),
    // VIP
    B('vip', 4, 'rp-vip-b4', 'خلفية ليل الفضة', 'vip-b4', 'rare', 'خلفية ملف ليلية بلمعة فضية، حصرية لـ VIP4.'),
    B('vip', 10, 'rp-vip-b10', 'خلفية قصر VIP', 'vip-b10', 'epic', 'قصر بأبراج ذهبية تحت سماء بنفسجية، حصري لـ VIP10.'),
    B('vip', 14, 'rp-vip-b14', 'خلفية العرش الذهبي', 'vip-b14', 'legendary', 'قاعة عرش ذهبية بأضواء ملكية، حصرية لـ VIP14.'),
    T('vip', 15, 'rp-vip-t15', 'VIP15', 'أسطورة VIP', 'ultra'),
    // نوبل
    T('noble', 1, 'rp-nb-t1', 'فارس', 'فارس', 'premium'),
    T('noble', 2, 'rp-nb-t2', 'بارون', 'بارون', 'premium'),
    B('noble', 2, 'rp-nb-b2', 'خلفية قلعة الفرسان', 'nb-b2', 'rare', 'قلعة حجرية عند الغروب، حصرية لرتبة البارون N2.'),
    T('noble', 3, 'rp-nb-t3', 'فيكونت', 'فيكونت', 'rare'),
    T('noble', 4, 'rp-nb-t4', 'إيرل', 'إيرل', 'rare'),
    T('noble', 5, 'rp-nb-t5', 'ماركيز', 'ماركيز', 'epic'),
    B('noble', 5, 'rp-nb-b5', 'خلفية قصر الماركيز', 'nb-b5', 'epic', 'قصر رخامي تحت قمر ذهبي، حصري لرتبة الماركيز N5.'),
    T('noble', 6, 'rp-nb-t6', 'دوق', 'دوق', 'epic'),
    T('noble', 7, 'rp-nb-t7', 'أمير', 'أمير', 'legendary'),
    B('noble', 7, 'rp-nb-b7', 'خلفية حدائق الأمراء', 'nb-b7', 'legendary', 'حدائق ملكية بنوافير ذهبية، حصرية لرتبة الأمير N7.'),
    T('noble', 8, 'rp-nb-t8', 'ملك', 'ملك', 'legendary'),
    T('noble', 9, 'rp-nb-t9', 'إمبراطور', 'إمبراطور', 'ultra'),
    B('noble', 9, 'rp-nb-b9', 'خلفية سماء الإمبراطورية', 'nb-b9', 'ultra', 'سماء إمبراطورية بنجوم ذهبية وشعار التاج، لـ N9 فقط.'),
]);
/** مركبات الدخول الموجودة أصلًا بالمتجر تُمنح هدية عند هذي المستويات */
// R58e: السيارات انشالت من الموقع بطلب المالك، فما فيه مركبات تنمنح مع الرتب
const EXISTING_GRANTS = Object.freeze([]);
export const RANK_PERK_IDS = new Set(RANK_PERK_ITEMS.map((i) => i.id));
/** سياسات افتراضية (عناصر فقط) لكل مستوى فيه مقتنى؛ تنستخدم بس للمستويات اللي ما لها سياسة من الإدارة */
export function defaultRankPolicies() {
    const map = new Map();
    const add = (system, rank, itemId) => {
        const key = `${system}:${rank}`;
        if (!map.has(key))
            map.set(key, { system, rank, rewards: [] });
        map.get(key).rewards.push({ type: 'item', itemId, mode: 'grant' });
    };
    for (const i of RANK_PERK_ITEMS)
        add(i.system, i.rank, i.id);
    for (const g of EXISTING_GRANTS)
        add(g.system, g.rank, g.itemId);
    return [...map.values()].sort((a, b) => a.system.localeCompare(b.system) || a.rank - b.rank);
}
/** عناصر المتجر للسلّم: ما تنباع (مخفية افتراضيًا)، وتظهر وتنجهّز لمالكها فقط */
export function rankPerkCatalogItems() {
    return RANK_PERK_ITEMS.map(({ system, rank, ...i }) => ({ ...i, price: 1, currency: 'gems', permanent: true, rankPerk: { system, rank } }));
}
