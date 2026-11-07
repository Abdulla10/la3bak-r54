/** Cropped user-supplied reference artwork only; no unlock or pricing logic.
 * Achievement links affect presentation only. Unmapped artwork remains an asset.
 */
const freezeEntries = (data) => Object.freeze(Object.fromEntries(
  Object.entries(data).map(([id, item]) => [id, Object.freeze(item)]),
));
export const REFERENCE_ART = freezeEntries({
  "ref-p-av-01": {
    "src": "/assets/reference/ref-p-av-01.webp",
    "slot": "avatar",
    "name": "رجل سماعة",
    "kids": false
  },
  "ref-p-av-02": {
    "src": "/assets/reference/ref-p-av-02.webp",
    "slot": "avatar",
    "name": "امرأة",
    "kids": false
  },
  "ref-p-av-03": {
    "src": "/assets/reference/ref-p-av-03.webp",
    "slot": "avatar",
    "name": "قط نظارة",
    "kids": false
  },
  "ref-p-av-04": {
    "src": "/assets/reference/ref-p-av-04.webp",
    "slot": "avatar",
    "name": "ذئب",
    "kids": false
  },
  "ref-p-av-05": {
    "src": "/assets/reference/ref-p-av-05.webp",
    "slot": "avatar",
    "name": "قط ملكي",
    "kids": false
  },
  "ref-p-av-06": {
    "src": "/assets/reference/ref-p-av-06.webp",
    "slot": "avatar",
    "name": "نينجا",
    "kids": false
  },
  "ref-p-av-07": {
    "src": "/assets/reference/ref-p-av-07.webp",
    "slot": "avatar",
    "name": "امرأة ملثمة",
    "kids": false
  },
  "ref-p-av-08": {
    "src": "/assets/reference/ref-p-av-08.webp",
    "slot": "avatar",
    "name": "أسد",
    "kids": false
  },
  "ref-p-av-09": {
    "src": "/assets/reference/ref-p-av-09.webp",
    "slot": "avatar",
    "name": "نمر أبيض",
    "kids": false
  },
  "ref-p-av-10": {
    "src": "/assets/reference/ref-p-av-10.webp",
    "slot": "avatar",
    "name": "نسر",
    "kids": false
  },
  "ref-p-av-11": {
    "src": "/assets/reference/ref-p-av-11.webp",
    "slot": "avatar",
    "name": "تنين",
    "kids": false
  },
  "ref-p-av-12": {
    "src": "/assets/reference/ref-p-av-12.webp",
    "slot": "avatar",
    "name": "ملك",
    "kids": false
  },
  "ref-p-av-13": {
    "src": "/assets/reference/ref-p-av-13.webp",
    "slot": "avatar",
    "name": "ملكة",
    "kids": false
  },
  "ref-p-av-14": {
    "src": "/assets/reference/ref-p-av-14.webp",
    "slot": "avatar",
    "name": "عنقاء",
    "kids": false
  },
  "ref-p-frame-01": {
    "src": "/assets/reference/ref-p-frame-01.webp",
    "slot": "frame",
    "name": "فضي",
    "kids": false
  },
  "ref-p-frame-02": {
    "src": "/assets/store-r23/diamond-frame.webp",
    "slot": "frame",
    "name": "ألماسي",
    "kids": false
  },
  "ref-p-frame-03": {
    "src": "/assets/reference/ref-p-frame-03.webp",
    "slot": "frame",
    "name": "كريستال بنفسجي",
    "kids": false
  },
  "ref-p-frame-04": {
    "src": "/assets/reference/ref-p-frame-04.webp",
    "slot": "frame",
    "name": "غار ذهبي",
    "kids": false
  },
  "ref-p-frame-05": {
    "src": "/assets/reference/ref-p-frame-05.webp",
    "slot": "frame",
    "name": "أجنحة",
    "kids": false
  },
  "ref-p-frame-06": {
    "src": "/assets/store-r23/dragon-frame.webp",
    "slot": "frame",
    "name": "تنين",
    "kids": false
  },
  "ref-p-frame-07": {
    "src": "/assets/reference/ref-p-frame-07.webp",
    "slot": "frame",
    "name": "عنقاء",
    "kids": false
  },
  "ref-p-frame-08": {
    "src": "/assets/store-r23/royal-frame.webp",
    "slot": "frame",
    "name": "ملكي",
    "kids": false
  },
  "ref-p-frame-09": {
    "src": "/assets/reference/ref-p-frame-09.webp",
    "slot": "frame",
    "name": "إمبراطوري",
    "kids": false
  },
  "ref-p-frame-10": {
    "src": "/assets/reference/ref-p-frame-10.webp",
    "slot": "frame",
    "name": "مجرة",
    "kids": false
  },
  "ref-p-frame-11": {
    "src": "/assets/reference/ref-p-frame-11.webp",
    "slot": "frame",
    "name": "جليدي",
    "kids": false
  },
  "ref-p-frame-12": {
    "src": "/assets/reference/ref-p-frame-12.webp",
    "slot": "frame",
    "name": "ظلال",
    "kids": false
  },
  "ref-p-frame-13": {
    "src": "/assets/reference/ref-p-frame-13.webp",
    "slot": "frame",
    "name": "فخم جداً",
    "kids": false
  },
  "ref-p-bg-01": {
    "src": "/assets/reference/ref-p-bg-01.webp",
    "slot": "bg",
    "name": "غروب",
    "kids": false
  },
  "ref-p-bg-02": {
    "src": "/assets/reference/ref-p-bg-02.webp",
    "slot": "bg",
    "name": "قمر",
    "kids": false
  },
  "ref-p-bg-03": {
    "src": "/assets/reference/ref-p-bg-03.webp",
    "slot": "bg",
    "name": "ساكورا",
    "kids": false
  },
  "ref-p-bg-04": {
    "src": "/assets/reference/ref-p-bg-04.webp",
    "slot": "bg",
    "name": "مدينة",
    "kids": false
  },
  "ref-p-bg-05": {
    "src": "/assets/reference/ref-p-bg-05.webp",
    "slot": "bg",
    "name": "عرش",
    "kids": false
  },
  "ref-p-bg-06": {
    "src": "/assets/reference/ref-p-bg-06.webp",
    "slot": "bg",
    "name": "جليد",
    "kids": false
  },
  "ref-p-bg-07": {
    "src": "/assets/reference/ref-p-bg-07.webp",
    "slot": "bg",
    "name": "مجرة",
    "kids": false
  },
  "ref-p-bg-08": {
    "src": "/assets/reference/ref-p-bg-08.webp",
    "slot": "bg",
    "name": "تنين",
    "kids": false
  },
  "ref-p-bg-09": {
    "src": "/assets/reference/ref-p-bg-09.webp",
    "slot": "bg",
    "name": "حديقة",
    "kids": false
  },
  "ref-p-bg-10": {
    "src": "/assets/reference/ref-p-bg-10.webp",
    "slot": "bg",
    "name": "قصر ذهبي",
    "kids": false
  },
  "ref-p-bg-11": {
    "src": "/assets/reference/ref-p-bg-11.webp",
    "slot": "bg",
    "name": "قلعة",
    "kids": false
  },
  "ref-k-av-01": {
    "src": "/assets/reference/ref-k-av-01.webp",
    "slot": "avatar",
    "name": "ولد المستكشف",
    "kids": true
  },
  "ref-k-av-02": {
    "src": "/assets/reference/ref-k-av-02.webp",
    "slot": "avatar",
    "name": "فتاة الدبدوب",
    "kids": true
  },
  "ref-k-av-03": {
    "src": "/assets/reference/ref-k-av-03.webp",
    "slot": "avatar",
    "name": "الأمير",
    "kids": true
  },
  "ref-k-av-04": {
    "src": "/assets/reference/ref-k-av-04.webp",
    "slot": "avatar",
    "name": "الأميرة",
    "kids": true
  },
  "ref-k-av-05": {
    "src": "/assets/reference/ref-k-av-05.webp",
    "slot": "avatar",
    "name": "رائد الفضاء",
    "kids": true
  },
  "ref-k-av-06": {
    "src": "/assets/reference/ref-k-av-06.webp",
    "slot": "avatar",
    "name": "الديناصور",
    "kids": true
  },
  "ref-k-av-07": {
    "src": "/assets/reference/ref-k-av-07.webp",
    "slot": "avatar",
    "name": "الجنية",
    "kids": true
  },
  "ref-k-av-08": {
    "src": "/assets/reference/ref-k-av-08.webp",
    "slot": "avatar",
    "name": "البطل",
    "kids": true
  },
  "ref-k-av-09": {
    "src": "/assets/reference/ref-k-av-09.webp",
    "slot": "avatar",
    "name": "القطة",
    "kids": true
  },
  "ref-k-av-10": {
    "src": "/assets/reference/ref-k-av-10.webp",
    "slot": "avatar",
    "name": "الباندا",
    "kids": true
  },
  "ref-k-av-11": {
    "src": "/assets/reference/ref-k-av-11.webp",
    "slot": "avatar",
    "name": "الزرافة",
    "kids": true
  },
  "ref-k-av-12": {
    "src": "/assets/reference/ref-k-av-12.webp",
    "slot": "avatar",
    "name": "الأسد",
    "kids": true
  },
  "ref-k-av-13": {
    "src": "/assets/reference/ref-k-av-13.webp",
    "slot": "avatar",
    "name": "البطريق",
    "kids": true
  },
  "ref-k-av-14": {
    "src": "/assets/reference/ref-k-av-14.webp",
    "slot": "avatar",
    "name": "الأرنوب",
    "kids": true
  },
  "ref-k-frame-01": {
    "src": "/assets/reference/ref-k-frame-01.webp",
    "slot": "frame",
    "name": "النجوم",
    "kids": true
  },
  "ref-k-frame-02": {
    "src": "/assets/reference/ref-k-frame-02.webp",
    "slot": "frame",
    "name": "قمر",
    "kids": true
  },
  "ref-k-frame-03": {
    "src": "/assets/reference/ref-k-frame-03.webp",
    "slot": "frame",
    "name": "قوس قزح",
    "kids": true
  },
  "ref-k-frame-04": {
    "src": "/assets/reference/ref-k-frame-04.webp",
    "slot": "frame",
    "name": "فضاء",
    "kids": true
  },
  "ref-k-frame-05": {
    "src": "/assets/reference/ref-k-frame-05.webp",
    "slot": "frame",
    "name": "ألعاب",
    "kids": true
  },
  "ref-k-frame-06": {
    "src": "/assets/reference/ref-k-frame-06.webp",
    "slot": "frame",
    "name": "دبدوب",
    "kids": true
  },
  "ref-k-frame-07": {
    "src": "/assets/reference/ref-k-frame-07.webp",
    "slot": "frame",
    "name": "تاج",
    "kids": true
  },
  "ref-k-frame-08": {
    "src": "/assets/reference/ref-k-frame-08.webp",
    "slot": "frame",
    "name": "يونيكورن",
    "kids": true
  },
  "ref-k-frame-09": {
    "src": "/assets/reference/ref-k-frame-09.webp",
    "slot": "frame",
    "name": "سحاب",
    "kids": true
  },
  "ref-k-frame-10": {
    "src": "/assets/reference/ref-k-frame-10.webp",
    "slot": "frame",
    "name": "قلعة",
    "kids": true
  },
  "ref-k-frame-11": {
    "src": "/assets/reference/ref-k-frame-11.webp",
    "slot": "frame",
    "name": "ديناصور",
    "kids": true
  },
  "ref-k-frame-12": {
    "src": "/assets/reference/ref-k-frame-12.webp",
    "slot": "frame",
    "name": "نجوم ملونة",
    "kids": true
  },
  "ref-k-bg-01": {
    "src": "/assets/reference/ref-k-bg-01.webp",
    "slot": "bg",
    "name": "غرفة",
    "kids": true
  },
  "ref-k-bg-02": {
    "src": "/assets/reference/ref-k-bg-02.webp",
    "slot": "bg",
    "name": "حديقة ألعاب",
    "kids": true
  },
  "ref-k-bg-03": {
    "src": "/assets/reference/ref-k-bg-03.webp",
    "slot": "bg",
    "name": "أرض أميرات",
    "kids": true
  },
  "ref-k-bg-04": {
    "src": "/assets/reference/ref-k-bg-04.webp",
    "slot": "bg",
    "name": "فضاء",
    "kids": true
  },
  "ref-k-bg-05": {
    "src": "/assets/reference/ref-k-bg-05.webp",
    "slot": "bg",
    "name": "بحر",
    "kids": true
  },
  "ref-k-bg-06": {
    "src": "/assets/reference/ref-k-bg-06.webp",
    "slot": "bg",
    "name": "مزرعة",
    "kids": true
  },
  "ref-k-bg-07": {
    "src": "/assets/reference/ref-k-bg-07.webp",
    "slot": "bg",
    "name": "غابة",
    "kids": true
  },
  "ref-k-bg-08": {
    "src": "/assets/reference/ref-k-bg-08.webp",
    "slot": "bg",
    "name": "كوخ جليد",
    "kids": true
  },
  "ref-k-bg-09": {
    "src": "/assets/reference/ref-k-bg-09.webp",
    "slot": "bg",
    "name": "قصر سحابي",
    "kids": true
  },
  "ref-k-bg-10": {
    "src": "/assets/reference/ref-k-bg-10.webp",
    "slot": "bg",
    "name": "مكتبة",
    "kids": true
  },
  "ref-p-badge-01": {
    "src": "/assets/reference/ref-p-badge-01.webp",
    "slot": "badge",
    "name": "لاعب نشيط",
    "kids": false
  },
  "ref-p-badge-02": {
    "src": "/assets/reference/ref-p-badge-02.webp",
    "slot": "badge",
    "name": "منافس",
    "kids": false
  },
  "ref-p-badge-03": {
    "src": "/assets/reference/ref-p-badge-03.webp",
    "slot": "badge",
    "name": "متميز",
    "kids": false
  },
  "ref-p-badge-04": {
    "src": "/assets/reference/ref-p-badge-04.webp",
    "slot": "badge",
    "name": "محترف",
    "kids": false
  },
  "ref-p-badge-05": {
    "src": "/assets/reference/ref-p-badge-05.webp",
    "slot": "badge",
    "name": "نخبة",
    "kids": false
  },
  "ref-p-badge-06": {
    "src": "/assets/reference/ref-p-badge-06.webp",
    "slot": "badge",
    "name": "أسطورة لودو",
    "kids": false
  },
  "ref-p-badge-07": {
    "src": "/assets/reference/ref-p-badge-07.webp",
    "slot": "badge",
    "name": "ملك الدومينو",
    "kids": false
  },
  "ref-p-badge-08": {
    "src": "/assets/reference/ref-p-badge-08.webp",
    "slot": "badge",
    "name": "أسطورة بلوت",
    "kids": false
  },
  "ref-p-badge-09": {
    "src": "/assets/reference/ref-p-badge-09.webp",
    "slot": "badge",
    "name": "ملك الورق",
    "kids": false
  },
  "ref-p-badge-10": {
    "src": "/assets/reference/ref-p-badge-10.webp",
    "slot": "badge",
    "name": "قائد الجاكارو",
    "kids": false
  },
  "ref-p-badge-11": {
    "src": "/assets/reference/ref-p-badge-11.webp",
    "slot": "badge",
    "name": "بطل البطولات",
    "kids": false
  },
  "ref-p-badge-12": {
    "src": "/assets/reference/ref-p-badge-12.webp",
    "slot": "badge",
    "name": "سلسلة انتصارات",
    "kids": false
  },
  "ref-p-badge-13": {
    "src": "/assets/reference/ref-p-badge-13.webp",
    "slot": "badge",
    "name": "أفضل لاعب",
    "kids": false
  },
  "ref-p-badge-14": {
    "src": "/assets/reference/ref-p-badge-14.webp",
    "slot": "badge",
    "name": "موسمي",
    "kids": false
  },
  "ref-p-badge-15": {
    "src": "/assets/reference/ref-p-badge-15.webp",
    "slot": "badge",
    "name": "أسطوري",
    "kids": false
  },
  "ref-p-title-01": {
    "src": "/assets/reference/ref-p-title-01.webp",
    "slot": "title",
    "name": "مبتدئ",
    "kids": false
  },
  "ref-p-title-02": {
    "src": "/assets/reference/ref-p-title-02.webp",
    "slot": "title",
    "name": "لاعب واعد",
    "kids": false
  },
  "ref-p-title-03": {
    "src": "/assets/reference/ref-p-title-03.webp",
    "slot": "title",
    "name": "نخبة اللعبة",
    "kids": false
  },
  "ref-p-title-04": {
    "src": "/assets/reference/ref-p-title-04.webp",
    "slot": "title",
    "name": "محترف",
    "kids": false
  },
  "ref-p-title-05": {
    "src": "/assets/reference/ref-p-title-05.webp",
    "slot": "title",
    "name": "خبير الألعاب",
    "kids": false
  },
  "ref-p-title-06": {
    "src": "/assets/reference/ref-p-title-06.webp",
    "slot": "title",
    "name": "قائد التحدي",
    "kids": false
  },
  "ref-p-title-07": {
    "src": "/assets/reference/ref-p-title-07.webp",
    "slot": "title",
    "name": "سيد العروش",
    "kids": false
  },
  "ref-p-title-08": {
    "src": "/assets/reference/ref-p-title-08.webp",
    "slot": "title",
    "name": "إمبراطور الأساطير",
    "kids": false
  },
  "ref-p-title-09": {
    "src": "/assets/reference/ref-p-title-09.webp",
    "slot": "title",
    "name": "ملك المجرة",
    "kids": false
  },
  "ref-p-title-10": {
    "src": "/assets/reference/ref-p-title-10.webp",
    "slot": "title",
    "name": "فارس الظلال",
    "kids": false
  },
  "ref-p-title-11": {
    "src": "/assets/reference/ref-p-title-11.webp",
    "slot": "title",
    "name": "التنين الأعظم",
    "kids": false
  },
  "ref-p-title-12": {
    "src": "/assets/reference/ref-p-title-12.webp",
    "slot": "title",
    "name": "صاحب الكؤوس",
    "kids": false
  },
  "ref-p-title-13": {
    "src": "/assets/reference/ref-p-title-13.webp",
    "slot": "title",
    "name": "أسطورة البلوت",
    "kids": false
  },
  "ref-p-title-14": {
    "src": "/assets/reference/ref-p-title-14.webp",
    "slot": "title",
    "name": "ملك الدومينو",
    "kids": false
  },
  "ref-p-title-15": {
    "src": "/assets/reference/ref-p-title-15.webp",
    "slot": "title",
    "name": "أسطورة الجاكارو",
    "kids": false
  },
  "ref-k-badge-01": {
    "src": "/assets/reference/ref-k-badge-01.webp",
    "slot": "badge",
    "name": "شارة الأطفال 1",
    "kids": true
  },
  "ref-k-badge-02": {
    "src": "/assets/reference/ref-k-badge-02.webp",
    "slot": "badge",
    "name": "شارة الأطفال 2",
    "kids": true
  },
  "ref-k-badge-03": {
    "src": "/assets/reference/ref-k-badge-03.webp",
    "slot": "badge",
    "name": "شارة الأطفال 3",
    "kids": true
  },
  "ref-k-badge-04": {
    "src": "/assets/reference/ref-k-badge-04.webp",
    "slot": "badge",
    "name": "شارة الأطفال 4",
    "kids": true
  },
  "ref-k-badge-05": {
    "src": "/assets/reference/ref-k-badge-05.webp",
    "slot": "badge",
    "name": "شارة الأطفال 5",
    "kids": true
  },
  "ref-k-badge-06": {
    "src": "/assets/reference/ref-k-badge-06.webp",
    "slot": "badge",
    "name": "شارة الأطفال 6",
    "kids": true
  },
  "ref-k-badge-07": {
    "src": "/assets/reference/ref-k-badge-07.webp",
    "slot": "badge",
    "name": "شارة الأطفال 7",
    "kids": true
  },
  "ref-k-badge-08": {
    "src": "/assets/reference/ref-k-badge-08.webp",
    "slot": "badge",
    "name": "كأس أول انتصار",
    "kids": true
  },
  "ref-k-badge-09": {
    "src": "/assets/reference/ref-k-badge-09.webp",
    "slot": "badge",
    "name": "شارة الأطفال 9",
    "kids": true
  },
  "ref-k-badge-10": {
    "src": "/assets/reference/ref-k-badge-10.webp",
    "slot": "badge",
    "name": "شارة الأطفال 10",
    "kids": true
  },
  "ref-k-badge-11": {
    "src": "/assets/reference/ref-k-badge-11.webp",
    "slot": "badge",
    "name": "شارة الأطفال 11",
    "kids": true
  },
  "ref-k-title-01": {
    "src": "/assets/reference/ref-k-title-01.webp",
    "slot": "title",
    "name": "لقب الأطفال 1",
    "kids": true
  },
  "ref-k-title-02": {
    "src": "/assets/reference/ref-k-title-02.webp",
    "slot": "title",
    "name": "لقب الأطفال 2",
    "kids": true
  },
  "ref-k-title-03": {
    "src": "/assets/reference/ref-k-title-03.webp",
    "slot": "title",
    "name": "لقب الأطفال 3",
    "kids": true
  },
  "ref-k-title-04": {
    "src": "/assets/reference/ref-k-title-04.webp",
    "slot": "title",
    "name": "لقب الأطفال 4",
    "kids": true
  },
  "ref-k-title-05": {
    "src": "/assets/reference/ref-k-title-05.webp",
    "slot": "title",
    "name": "لقب الأطفال 5",
    "kids": true
  },
  "ref-k-title-06": {
    "src": "/assets/reference/ref-k-title-06.webp",
    "slot": "title",
    "name": "لقب الأطفال 6",
    "kids": true
  },
  "ref-k-title-07": {
    "src": "/assets/reference/ref-k-title-07.webp",
    "slot": "title",
    "name": "لقب الأطفال 7",
    "kids": true
  },
  "ref-k-set-01": {
    "src": "/assets/reference/ref-k-set-01.webp",
    "slot": "set",
    "name": "الفضاء",
    "kids": true
  },
  "ref-k-set-02": {
    "src": "/assets/reference/ref-k-set-02.webp",
    "slot": "set",
    "name": "الديناصور",
    "kids": true
  },
  "ref-k-set-03": {
    "src": "/assets/reference/ref-k-set-03.webp",
    "slot": "set",
    "name": "الأميرة",
    "kids": true
  },
  "ref-k-set-04": {
    "src": "/assets/reference/ref-k-set-04.webp",
    "slot": "set",
    "name": "الأبطال",
    "kids": true
  },
  "ref-k-set-05": {
    "src": "/assets/reference/ref-k-set-05.webp",
    "slot": "set",
    "name": "الحيوانات",
    "kids": true
  },
  "ref-k-set-06": {
    "src": "/assets/reference/ref-k-set-06.webp",
    "slot": "set",
    "name": "البحار",
    "kids": true
  }
});

/** Existing achievement ID -> player crop ID. See manifest for the evidence and limits. */
export const ACHIEVEMENT_ART = Object.freeze({
  "ach-b-10": "ref-p-badge-01",
  "ach-t-emperor": "ref-p-title-08",
  "ach-t-galaxy": "ref-p-title-09",
  "ach-t-shadow": "ref-p-title-10",
  "ach-t-dragon": "ref-p-title-11",
  "ach-t-thrones": "ref-p-title-07",
  "ach-t-baloot": "ref-p-title-13",
  "ach-t-domino": "ref-p-title-14",
  "ach-t-jackaro": "ref-p-title-15"
});
/** Optional child-art alternatives for the SAME existing achievements, not new goals. */
export const ACHIEVEMENT_ART_KIDS = Object.freeze({
  "ach-b-win1": "ref-k-badge-08"
});

/** Direct asset ID/css, or mapped existing achievement ID. Unknown input returns null. */
export function referenceOf(id) {
  if (typeof id !== 'string') return null;
  if (Object.hasOwn(REFERENCE_ART, id)) return REFERENCE_ART[id];
  const key = Object.hasOwn(ACHIEVEMENT_ART, id) ? ACHIEVEMENT_ART[id]
    : Object.hasOwn(ACHIEVEMENT_ART_KIDS, id) ? ACHIEVEMENT_ART_KIDS[id] : null;
  return key && Object.hasOwn(REFERENCE_ART, key) ? REFERENCE_ART[key] : null;
}
const escapeAttribute = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
/** Return a safe HTML string for this app's existing HTML renderers. No raw input is injected. */
export function referenceImage(id, cls = '') {
  const art = referenceOf(id);
  if (!art) return '';
  const classes = typeof cls === 'string' ? cls.split(/\s+/)
    .filter((token) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(token)).slice(0, 20) : [];
  const className = ['reference-art', ...classes].join(' ');
  return `<img src="${escapeAttribute(art.src)}" alt="${escapeAttribute(art.name)}" class="${escapeAttribute(className)}" loading="lazy" decoding="async">`;
}
