/* R56: سلّم امتيازات VIP (1..15) ونوبل (N1..N9) — نفس تعريف الخادم src/server/rank-perks-r56.ts.
 * المقتنيات (إطارات/خلفيات/ألقاب/مركبات) تُستلم من «مكافآت الرتب». المؤثرات (لون الاسم، فقاعة الدردشة، هالة المقعد)
 * تنطبق تلقائيًا من رتبتك الحالية اللي يرسلها الخادم مع بياناتك، بدون أي تخزين أو دفع. */
export const PERK_ITEMS = Object.freeze({
  'rp-vip-f1': { slot: 'frame', css: 'vip-f1', name: 'إطار غار الذهب VIP', system: 'vip', rank: 1 },
  'rp-vip-f2': { slot: 'frame', css: 'vip-f2', name: 'إطار غار الكريستال VIP', system: 'vip', rank: 2 },
  'rp-vip-f3': { slot: 'frame', css: 'vip-f3', name: 'إطار تاج الياقوت VIP', system: 'vip', rank: 3 },
  'rp-vip-f4': { slot: 'frame', css: 'vip-f4', name: 'إطار غار البنفسج VIP', system: 'vip', rank: 4 },
  'rp-vip-f5': { slot: 'frame', css: 'vip-f5', name: 'إطار لهب الياقوت VIP', system: 'vip', rank: 5 },
  'rp-vip-f6': { slot: 'frame', css: 'vip-f6', name: 'إطار جليد الملوك VIP', system: 'vip', rank: 6 },
  'rp-vip-f7': { slot: 'frame', css: 'vip-f7', name: 'إطار القلب الوردي VIP', system: 'vip', rank: 7 },
  'rp-vip-f8': { slot: 'frame', css: 'vip-f8', name: 'إطار أجنحة الفجر VIP', system: 'vip', rank: 8 },
  'rp-vip-f9': { slot: 'frame', css: 'vip-f9', name: 'إطار تاج البنفسج VIP', system: 'vip', rank: 9 },
  'rp-vip-f10': { slot: 'frame', css: 'vip-f10', name: 'إطار أسود العرش VIP', system: 'vip', rank: 10 },
  'rp-vip-f11': { slot: 'frame', css: 'vip-f11', name: 'إطار تنين الجليد VIP', system: 'vip', rank: 11 },
  'rp-vip-f12': { slot: 'frame', css: 'vip-f12', name: 'إطار أسد الذهب VIP', system: 'vip', rank: 12 },
  'rp-vip-f13': { slot: 'frame', css: 'vip-f13', name: 'إطار قلعة البنفسج VIP', system: 'vip', rank: 13 },
  'rp-vip-f14': { slot: 'frame', css: 'vip-f14', name: 'إطار أجنحة الثلج VIP', system: 'vip', rank: 14 },
  'rp-vip-f15': { slot: 'frame', css: 'vip-f15', name: 'إطار تاج VIP الأسطوري', system: 'vip', rank: 15 },
  'rp-nb-f1': { slot: 'frame', css: 'nb-f1', name: 'إطار غار الفارس', system: 'noble', rank: 1 },
  'rp-nb-f2': { slot: 'frame', css: 'nb-f2', name: 'إطار ياقوت البارون', system: 'noble', rank: 2 },
  'rp-nb-f3': { slot: 'frame', css: 'nb-f3', name: 'إطار بنفسج الفيكونت', system: 'noble', rank: 3 },
  'rp-nb-f4': { slot: 'frame', css: 'nb-f4', name: 'إطار جليد الإيرل', system: 'noble', rank: 4 },
  'rp-nb-f5': { slot: 'frame', css: 'nb-f5', name: 'إطار أجنحة الماركيز', system: 'noble', rank: 5 },
  'rp-nb-f6': { slot: 'frame', css: 'nb-f6', name: 'إطار تاج الدوق', system: 'noble', rank: 6 },
  'rp-nb-f7': { slot: 'frame', css: 'nb-f7', name: 'إطار أسد الأمير', system: 'noble', rank: 7 },
  'rp-nb-f8': { slot: 'frame', css: 'nb-f8', name: 'إطار أجنحة الملك', system: 'noble', rank: 8 },
  'rp-nb-f9': { slot: 'frame', css: 'nb-f9', name: 'إطار الإمبراطور الأعظم', system: 'noble', rank: 9 },
  'rp-vip-bub7': { slot: 'chat-bubble', css: 'vip-purple', name: 'فقاعة بنفسج VIP', system: 'vip', rank: 7 },
  'rp-vip-board13': { slot: 'board', css: 'gold', name: 'لوحة الذهب الملكي VIP', system: 'vip', rank: 13 },
  'rp-nb-board4': { slot: 'board', css: 'sapphire', name: 'لوحة ياقوت الإيرل', system: 'noble', rank: 4 },
  'rp-nb-bub7': { slot: 'chat-bubble', css: 'nb-imperial', name: 'فقاعة تاج الأمير', system: 'noble', rank: 7 },
  'rp-vip-b4': { slot: 'bg', css: 'vip-b4', name: 'خلفية ليل الفضة', system: 'vip', rank: 4 },
  'rp-vip-b10': { slot: 'bg', css: 'vip-b10', name: 'خلفية قصر VIP', system: 'vip', rank: 10 },
  'rp-vip-b14': { slot: 'bg', css: 'vip-b14', name: 'خلفية العرش الذهبي', system: 'vip', rank: 14 },
  'rp-vip-t15': { slot: 'title', css: 'أسطورة VIP', name: 'لقب «أسطورة VIP»', system: 'vip', rank: 15 },
  'rp-nb-t1': { slot: 'title', css: 'فارس', name: 'لقب «فارس»', system: 'noble', rank: 1 },
  'rp-nb-t2': { slot: 'title', css: 'بارون', name: 'لقب «بارون»', system: 'noble', rank: 2 },
  'rp-nb-b2': { slot: 'bg', css: 'nb-b2', name: 'خلفية قلعة الفرسان', system: 'noble', rank: 2 },
  'rp-nb-t3': { slot: 'title', css: 'فيكونت', name: 'لقب «فيكونت»', system: 'noble', rank: 3 },
  'rp-nb-t4': { slot: 'title', css: 'إيرل', name: 'لقب «إيرل»', system: 'noble', rank: 4 },
  'rp-nb-t5': { slot: 'title', css: 'ماركيز', name: 'لقب «ماركيز»', system: 'noble', rank: 5 },
  'rp-nb-b5': { slot: 'bg', css: 'nb-b5', name: 'خلفية قصر الماركيز', system: 'noble', rank: 5 },
  'rp-nb-t6': { slot: 'title', css: 'دوق', name: 'لقب «دوق»', system: 'noble', rank: 6 },
  'rp-nb-t7': { slot: 'title', css: 'أمير', name: 'لقب «أمير»', system: 'noble', rank: 7 },
  'rp-nb-b7': { slot: 'bg', css: 'nb-b7', name: 'خلفية حدائق الأمراء', system: 'noble', rank: 7 },
  'rp-nb-t8': { slot: 'title', css: 'ملك', name: 'لقب «ملك»', system: 'noble', rank: 8 },
  'rp-nb-t9': { slot: 'title', css: 'إمبراطور', name: 'لقب «إمبراطور»', system: 'noble', rank: 9 },
  'rp-nb-b9': { slot: 'bg', css: 'nb-b9', name: 'خلفية سماء الإمبراطورية', system: 'noble', rank: 9 },
});
/* المؤثرات التلقائية: لكل نوع، أعلى مستوى وصلته هو اللي ينطبق */
const E = (rank, kind, tier, name, desc) => Object.freeze({ rank, kind, tier, name, desc });
export const EFFECTS = Object.freeze({
  vip: Object.freeze([
    E(1, 'name', 'vip-silver', 'اسم فضي بالدردشة', 'اسمك يظهر بلون فضي لامع في محادثات الغرف.'),
    E(3, 'bubble', 'vip-silver', 'فقاعة دردشة فضية', 'رسائلك بالغرف تطلع بفقاعة فضية مميزة.'),
    E(5, 'name', 'vip-blue', 'اسم أزرق متوهّج', 'لون اسمك يصير أزرق ياقوتي متوهّج.'),
    E(8, 'name', 'vip-purple', 'اسم بنفسجي ملكي', 'اسمك بلون بنفسجي ملكي.'),
    E(8, 'bubble', 'vip-purple', 'فقاعة بنفسجية', 'فقاعة دردشة بنفسجية بحواف لامعة.'),
    E(11, 'aura', 'vip-gold', 'هالة ذهبية حول مقعدك', 'لما تجلس بمقعد بالغرفة تطلع هالة ذهبية حول صورتك.'),
    E(12, 'name', 'vip-gold', 'اسم ذهبي متلألئ', 'اسمك ذهبي يلمع بالدردشة.'),
    E(12, 'bubble', 'vip-gold', 'فقاعة ذهبية', 'فقاعة دردشة ذهبية فخمة.'),
    E(15, 'name', 'vip-legend', 'اسم أسطوري متدرّج', 'اسمك بتدرّج ناري ذهبي متحرّك — لـ VIP15 فقط.'),
    E(15, 'bubble', 'vip-legend', 'فقاعة أسطورية', 'أفخم فقاعة دردشة بالموقع.'),
    E(15, 'aura', 'vip-legend', 'هالة نارية أسطورية', 'هالة نارية متحركة حول مقعدك.'),
  ]),
  noble: Object.freeze([
    E(2, 'name', 'nb-copper', 'اسم نحاسي نبيل', 'اسمك بلون نحاسي نبيل بالدردشة.'),
    E(2, 'bubble', 'nb-bronze', 'فقاعة برونزية', 'فقاعة دردشة برونزية للنبلاء.'),
    E(4, 'aura', 'nb-silver', 'هالة فضية حول مقعدك', 'هالة فضية حول صورتك بالمقعد.'),
    E(5, 'bubble', 'nb-gold', 'فقاعة ذهبية نبيلة', 'فقاعة دردشة ذهبية بنقش نبيل.'),
    E(6, 'name', 'nb-gold', 'اسم ذهبي ملكي', 'اسمك ذهبي ملكي بالدردشة.'),
    E(8, 'aura', 'nb-royal', 'هالة ملكية', 'هالة بنفسجية وذهبية ملكية حول مقعدك.'),
    E(9, 'name', 'nb-imperial', 'اسم إمبراطوري', 'اسمك بتدرّج إمبراطوري أزرق وذهبي — لـ N9 فقط.'),
    E(9, 'bubble', 'nb-imperial', 'فقاعة إمبراطورية', 'فقاعة إمبراطورية بتاج — أعلى فقاعة بالموقع.'),
    E(9, 'aura', 'nb-imperial', 'هالة إمبراطورية', 'هالة إمبراطورية دوّارة حول مقعدك.'),
  ]),
});
/* ترتيب الفخامة لمقارنة VIP مع نوبل: الأعلى يفوز لكل نوع */
const LUX = Object.freeze({ 'vip-silver': 1, 'nb-copper': 2, 'nb-bronze': 2, 'vip-blue': 3, 'nb-silver': 4, 'vip-purple': 5, 'nb-gold': 6, 'vip-gold': 7, 'nb-royal': 8, 'vip-legend': 9, 'nb-imperial': 10 });
const rankOf = (v, max) => (Number.isSafeInteger(v) && v >= 1 && v <= max ? v : 0);
/** المؤثرات المنطبقة على لاعب من رتبه (ranks = {vip, noble} من الخادم) */
export function effectStyle(ranks) {
  const vip = rankOf(ranks?.vip, 15), noble = rankOf(ranks?.noble, 9), out = {};
  for (const [system, have] of [['vip', vip], ['noble', noble]]) for (const e of EFFECTS[system]) if (have >= e.rank && (LUX[e.tier] || 0) > (LUX[out[e.kind]] || 0)) out[e.kind] = e.tier;
  return out;
}
export const effectClasses = (ranks) => Object.entries(effectStyle(ranks)).map(([kind, tier]) => `rp-${kind}-${tier}`).join(' ');
const KIND_LABEL = Object.freeze({ name: 'لون الاسم', bubble: 'فقاعة الدردشة', aura: 'هالة المقعد' });
/** معاينة صغيرة للمؤثر (للبطاقات بصفحتي VIP ونوبل) */
export function effectArt(e) {
  const t = String(e?.tier || '');
  if (e?.kind === 'name') return `<span class="rp-art rp-art-name"><b class="rp-name-${t}">اسمك</b></span>`;
  if (e?.kind === 'bubble') return `<span class="rp-art rp-art-bubble"><span class="rp-bubble-${t}">مرحبا 👋</span></span>`;
  return `<span class="rp-art rp-art-aura"><span class="rp-aura-${t}"><i></i></span></span>`;
}
export const effectKindLabel = (kind) => KIND_LABEL[kind] || 'مؤثر';
