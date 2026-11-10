/** Cropped user-supplied reference artwork only; no unlock or pricing logic.
 * Achievement links affect presentation only. Unmapped artwork remains an asset.
 */
const freezeEntries = (data) => Object.freeze(Object.fromEntries(
  Object.entries(data).map(([id, item]) => [id, Object.freeze(item)]),
));
export const REFERENCE_ART = freezeEntries({
  /* R58i: سلسلة إطارات VIP1–15 والنبلاء N1–9 (من تصميم المالك) */
  /* R58o: إطارات المتجر الجديدة */
  /* R59c: إطارات المالك الجديدة */
  "art-f3-01": {"src": "/assets/art58/frames3/f01.webp?v=r59c", "slot": "frame", "name": "التاج الياقوتي", "kids": false},
  "art-f3-02": {"src": "/assets/art58/frames3/f02.webp?v=r59c", "slot": "frame", "name": "تاج الكريستال الفضي", "kids": false},
  "art-f3-03": {"src": "/assets/art58/frames3/f03.webp?v=r59c", "slot": "frame", "name": "تاج الياقوت الأزرق", "kids": false},
  "art-f3-04": {"src": "/assets/art58/frames3/f04.webp?v=r59c", "slot": "frame", "name": "تاج الجمشت", "kids": false},
  "art-f3-05": {"src": "/assets/art58/frames3/f05.webp?v=r59c", "slot": "frame", "name": "تاج القلوب الوردي", "kids": false},
  "art-f3-06": {"src": "/assets/art58/frames3/f06.webp?v=r59c", "slot": "frame", "name": "تاج الزمرد", "kids": false},
  "art-f3-07": {"src": "/assets/art58/frames3/f07.webp?v=r59c", "slot": "frame", "name": "التاج والستارة", "kids": false},
  "art-f3-08": {"src": "/assets/art58/frames3/f08.webp?v=r59c", "slot": "frame", "name": "الذئب الفضي", "kids": false},
  "art-f3-09": {"src": "/assets/art58/frames3/f09.webp?v=r59c", "slot": "frame", "name": "مجرة الكواكب", "kids": false},
  "art-f3-10": {"src": "/assets/art58/frames3/f10.webp?v=r59c", "slot": "frame", "name": "زهر الربيع", "kids": false},
  "art-f3-11": {"src": "/assets/art58/frames3/f11.webp?v=r59c", "slot": "frame", "name": "أجنحة الفضة", "kids": false},
  "art-f3-12": {"src": "/assets/art58/frames3/f12.webp?v=r59c", "slot": "frame", "name": "حلقة اللهب", "kids": false},
  "art-f3-13": {"src": "/assets/art58/frames3/f13.webp?v=r59c", "slot": "frame", "name": "الأسد الذهبي", "kids": false},
  "art-f3-14": {"src": "/assets/art58/frames3/f14.webp?v=r59c", "slot": "frame", "name": "موجة الصدف", "kids": false},
  "art-f3-15": {"src": "/assets/art58/frames3/f15.webp?v=r59c", "slot": "frame", "name": "فراشة الكريستال", "kids": false},
  "art-f3-16": {"src": "/assets/art58/frames3/f16.webp?v=r59c", "slot": "frame", "name": "هلال الفوانيس", "kids": false},
  "art-f3-17": {"src": "/assets/art58/frames3/f17.webp?v=r59c", "slot": "frame", "name": "كريستال الجليد", "kids": false},
  "art-f3-18": {"src": "/assets/art58/frames3/f18.webp?v=r59c", "slot": "frame", "name": "الوردتين", "kids": false},
  "art-f3-19": {"src": "/assets/art58/frames3/f19.webp?v=r59c", "slot": "frame", "name": "تاج الثلج", "kids": false},
  "art-f3-20": {"src": "/assets/art58/frames3/f20.webp?v=r59c", "slot": "frame", "name": "الجناح الأرجواني", "kids": false},
  "art-f3-21": {"src": "/assets/art58/frames3/f21.webp?v=r59c", "slot": "frame", "name": "الجناح الذهبي", "kids": false},
  "art-f3-22": {"src": "/assets/art58/frames3/f22.webp?v=r59c", "slot": "frame", "name": "شجرة الساكورا", "kids": false},
  "art-f3-23": {"src": "/assets/art58/frames3/f23.webp?v=r59c", "slot": "frame", "name": "الدلفين الأزرق", "kids": false},
  "art-f3-24": {"src": "/assets/art58/frames3/f24.webp?v=r59c", "slot": "frame", "name": "قلعة السحاب", "kids": false},
  "art-f3-25": {"src": "/assets/art58/frames3/f25.webp?v=r59c", "slot": "frame", "name": "الأفعى الملكية", "kids": false},
  "art-f3-26": {"src": "/assets/art58/frames3/f26.webp?v=r59c", "slot": "frame", "name": "عنقاء الجليد", "kids": false},
  "art-f3-27": {"src": "/assets/art58/frames3/f27.webp?v=r59c", "slot": "frame", "name": "العنقاء الذهبية", "kids": false},
  "art-f3-28": {"src": "/assets/art58/frames3/f28.webp?v=r59c", "slot": "frame", "name": "الحصان الملكي", "kids": false},
  "art-f3-29": {"src": "/assets/art58/frames3/f29.webp?v=r59c", "slot": "frame", "name": "الألماسة البنفسجية", "kids": false},
  "art-f3-30": {"src": "/assets/art58/frames3/f30.webp?v=r59c", "slot": "frame", "name": "سفينة الأمواج", "kids": false},
  "art-f3-31": {"src": "/assets/art58/frames3/f31.webp?v=r59c", "slot": "frame", "name": "نخلة الصحراء", "kids": false},
  "art-f3-32": {"src": "/assets/art58/frames3/f32.webp?v=r59c", "slot": "frame", "name": "القمر والغيوم", "kids": false},
  "art-f3-33": {"src": "/assets/art58/frames3/f33.webp?v=r59c", "slot": "frame", "name": "قلوب الوردي", "kids": false},
  "art-f3-34": {"src": "/assets/art58/frames3/f34.webp?v=r59c", "slot": "frame", "name": "فهد الظلام", "kids": false},
  "art-f3-35": {"src": "/assets/art58/frames3/f35.webp?v=r59c", "slot": "frame", "name": "الساعة الذهبية", "kids": false},
  "art-f3-36": {"src": "/assets/art58/frames3/f36.webp?v=r59c", "slot": "frame", "name": "فراشة الثلج", "kids": false},
  "art-f3-37": {"src": "/assets/art58/frames3/f37.webp?v=r59c", "slot": "frame", "name": "شريط السينما", "kids": false},
  "art-f3-38": {"src": "/assets/art58/frames3/f38.webp?v=r59c", "slot": "frame", "name": "سماعة الألعاب", "kids": false},
  "art-f3-39": {"src": "/assets/art58/frames3/f39.webp?v=r59c", "slot": "frame", "name": "وصيف الموسم", "kids": false},
  "art-f3-40": {"src": "/assets/art58/frames3/f40.webp?v=r59c", "slot": "frame", "name": "ثالث الموسم", "kids": false},
  "art-f3-41": {"src": "/assets/art58/frames3/f41.webp?v=r59c", "slot": "frame", "name": "سماعة الموسيقى", "kids": false},
  "art-f3-42": {"src": "/assets/art58/frames3/f42.webp?v=r59c", "slot": "frame", "name": "بطل الموسم", "kids": false},
  "art-f4-01": {"src": "/assets/art68/frames4/f01.webp?v=r68z31", "slot": "frame", "name": "التاج والستارة", "kids": false},
  "art-f4-02": {"src": "/assets/art68/frames4/f02.webp?v=r68z31", "slot": "frame", "name": "كريستال الجمشت", "kids": false},
  "art-f4-03": {"src": "/assets/art68/frames4/f03.webp?v=r68z31", "slot": "frame", "name": "الهلال والنجوم", "kids": false},
  "art-f4-04": {"src": "/assets/art68/frames4/f04.webp?v=r68z31", "slot": "frame", "name": "التنين الناري", "kids": false},
  "art-f4-05": {"src": "/assets/art68/frames4/f05.webp?v=r68z31", "slot": "frame", "name": "الكريستال الثلجي", "kids": false},
  "art-f4-06": {"src": "/assets/art68/frames4/f06.webp?v=r68z31", "slot": "frame", "name": "زهر الساكورا", "kids": false},
  "art-f4-07": {"src": "/assets/art68/frames4/f07.webp?v=r68z31", "slot": "frame", "name": "موج البحر", "kids": false},
  "art-f4-08": {"src": "/assets/art68/frames4/f08.webp?v=r68z31", "slot": "frame", "name": "الكوكب والمجرة", "kids": false},
  "art-f4-09": {"src": "/assets/art68/frames4/f09.webp?v=r68z31", "slot": "frame", "name": "القيمر", "kids": false},
  "art-f4-10": {"src": "/assets/art68/frames4/f10.webp?v=r68z31", "slot": "frame", "name": "الأجنحة الذهبية", "kids": false},
  "art-f2-13": {"src": "/assets/art58/frames2/f13.webp?v=r58r", "slot": "frame", "name": "التاج البنفسجي", "kids": false},
  "art-f2-14": {"src": "/assets/art58/frames2/f14.webp?v=r58r", "slot": "frame", "name": "هلال الغيوم", "kids": false},
  "art-f2-15": {"src": "/assets/art58/frames2/f15.webp?v=r58r", "slot": "frame", "name": "تنين الظلام", "kids": false},
  "art-f2-16": {"src": "/assets/art58/frames2/f16.webp?v=r58r", "slot": "frame", "name": "غصن الساكورا", "kids": false},
  "art-f2-17": {"src": "/assets/art58/frames2/f17.webp?v=r58r", "slot": "frame", "name": "أجنحة البنفسج", "kids": false},
  "art-f2-18": {"src": "/assets/art58/frames2/f18.webp?v=r58r", "slot": "frame", "name": "الغار الملكي", "kids": false},
  "art-f2-19": {"src": "/assets/art58/frames2/f19.webp?v=r58r", "slot": "frame", "name": "سماعة القطة", "kids": false},
  "art-f2-20": {"src": "/assets/art58/frames2/f20.webp?v=r58r", "slot": "frame", "name": "الجليد الأزرق", "kids": false},
  "art-f2-21": {"src": "/assets/art58/frames2/f21.webp?v=r58r", "slot": "frame", "name": "لؤلؤة البحر", "kids": false},
  "art-f2-22": {"src": "/assets/art58/frames2/f22.webp?v=r58r", "slot": "frame", "name": "الورد الأحمر", "kids": false},
  "art-f2-23": {"src": "/assets/art58/frames2/f23.webp?v=r58r", "slot": "frame", "name": "مدار النجوم", "kids": false},
  "art-f2-24": {"src": "/assets/art58/frames2/f24.webp?v=r58r", "slot": "frame", "name": "أجنحة الملكة", "kids": false},
  "art-pb-01": {"src": "/assets/art58/pbg/p01.jpg?v=r58r", "slot": "bg", "name": "قاعة العرش", "kids": false},
  "art-pb-02": {"src": "/assets/art58/pbg/p02.jpg?v=r58r", "slot": "bg", "name": "شرفة الغروب", "kids": false},
  "art-pb-03": {"src": "/assets/art58/pbg/p03.jpg?v=r58r", "slot": "bg", "name": "كوكب البنفسج", "kids": false},
  "art-pb-04": {"src": "/assets/art58/pbg/p04.jpg?v=r58r", "slot": "bg", "name": "شلال الساكورا", "kids": false},
  "art-pb-05": {"src": "/assets/art58/pbg/p05.jpg?v=r58r", "slot": "bg", "name": "خيمة الصحراء", "kids": false},
  "art-pb-06": {"src": "/assets/art58/pbg/p06.jpg?v=r58r", "slot": "bg", "name": "قلعة السماء", "kids": false},
  "art-pb-07": {"src": "/assets/art58/pbg/p07.jpg?v=r58r", "slot": "bg", "name": "مكتبة الدفء", "kids": false},
  "art-pb-08": {"src": "/assets/art58/pbg/p08.jpg?v=r58r", "slot": "bg", "name": "الشفق القطبي", "kids": false},
  "art-pb-09": {"src": "/assets/art58/pbg/p09.jpg?v=r58r", "slot": "bg", "name": "شرفة المدينة", "kids": false},
  "art-pb-10": {"src": "/assets/art58/pbg/p10.jpg?v=r58r", "slot": "bg", "name": "بوابة البحيرة", "kids": false},
  "art-pb-11": {"src": "/assets/art58/pbg/p11.jpg?v=r67ac", "slot": "bg", "name": "منصة الأسطورة", "kids": false},
  "art-pb-12": {"src": "/assets/art58/pbg/p12.jpg?v=r67ac", "slot": "bg", "name": "غرفة الجيمر", "kids": false},
  "art-pb-13": {"src": "/assets/art58/pbg/p13.jpg?v=r67ac", "slot": "bg", "name": "الممر الأحمر", "kids": false},
  "art-pb-14": {"src": "/assets/art58/pbg/p14.jpg?v=r67ac", "slot": "bg", "name": "محطة الفضاء", "kids": false},
  "art-pb-15": {"src": "/assets/art58/pbg/p15.jpg?v=r67ac", "slot": "bg", "name": "ساحة البطولة", "kids": false},
  "art-pb-16": {"src": "/assets/art58/pbg/p16.jpg?v=r67ac", "slot": "bg", "name": "شارع الأركيد", "kids": false},
  "art-pb-17": {"src": "/assets/art58/pbg/p17.jpg?v=r67ac", "slot": "bg", "name": "قصر الصحراء", "kids": false},
  "art-pb-18": {"src": "/assets/art58/pbg/p18.jpg?v=r67ac", "slot": "bg", "name": "بحيرة الساكورا", "kids": false},
  "art-pb-19": {"src": "/assets/art58/pbg/p19.jpg?v=r67ac", "slot": "bg", "name": "المجرة الملكية", "kids": false},
  "art-pb-20": {"src": "/assets/art58/pbg/p20.jpg?v=r67ac", "slot": "bg", "name": "شرفة القصر", "kids": false},
  "art-pb-21": {"src": "/assets/art58/pbg/p21.jpg?v=r67ac", "slot": "bg", "name": "قلعة الجليد", "kids": false},
  "art-pb-22": {"src": "/assets/art58/pbg/p22.jpg?v=r67ac", "slot": "bg", "name": "عرش الأسود", "kids": false},
  "mf01": {"src": "/assets/art58/mic/m01.webp?v=r58r", "slot": "mic-frame", "name": "تاج البنفسج", "kids": false},
  "mf02": {"src": "/assets/art58/mic/m02.webp?v=r58r", "slot": "mic-frame", "name": "كريستال الملوك", "kids": false},
  "mf03": {"src": "/assets/art58/mic/m03.webp?v=r58r", "slot": "mic-frame", "name": "هلال النجوم", "kids": false},
  "mf04": {"src": "/assets/art58/mic/m04.webp?v=r58r", "slot": "mic-frame", "name": "التنين الذهبي", "kids": false},
  "mf05": {"src": "/assets/art58/mic/m05.webp?v=r58r", "slot": "mic-frame", "name": "أجنحة الملاك", "kids": false},
  "mf06": {"src": "/assets/art58/mic/m06.webp?v=r58r", "slot": "mic-frame", "name": "فراشة الزهور", "kids": false},
  "mf07": {"src": "/assets/art58/mic/m07.webp?v=r58r", "slot": "mic-frame", "name": "مدار النجوم", "kids": false},
  "mf08": {"src": "/assets/art58/mic/m08.webp?v=r58r", "slot": "mic-frame", "name": "الريشة والقناع", "kids": false},
  "mf09": {"src": "/assets/art58/mic/m09.webp?v=r58r", "slot": "mic-frame", "name": "مسرح القصر", "kids": false},
  "mf10": {"src": "/assets/art58/mic/m10.webp?v=r58r", "slot": "mic-frame", "name": "غار البطل", "kids": false},
  "mf11": {"src": "/assets/art58/mic/m11.webp?v=r58r", "slot": "mic-frame", "name": "ستارة الملك", "kids": false},
  "mf12": {"src": "/assets/art58/mic/m12.webp?v=r58r", "slot": "mic-frame", "name": "أجنحة الفضة", "kids": false},
  "mf13": {"src": "/assets/art58/mic/m13.webp?v=r58r", "slot": "mic-frame", "name": "كريستال البنفسج", "kids": false},
  "mf14": {"src": "/assets/art58/mic/m14.webp?v=r58r", "slot": "mic-frame", "name": "هلال الغيوم", "kids": false},
  "mf15": {"src": "/assets/art58/mic/m15.webp?v=r58r", "slot": "mic-frame", "name": "الأسد الذهبي", "kids": false},
  "mf16": {"src": "/assets/art58/mic/m16.webp?v=r58r", "slot": "mic-frame", "name": "تنين اللهب", "kids": false},
  "mf17": {"src": "/assets/art58/mic/m17.webp?v=r58r", "slot": "mic-frame", "name": "الحصان المجنح", "kids": false},
  "mf18": {"src": "/assets/art58/mic/m18.webp?v=r58r", "slot": "mic-frame", "name": "تنين البنفسج", "kids": false},
  "mf19": {"src": "/assets/art58/mic/m19.webp?v=r58r", "slot": "mic-frame", "name": "موج البحّار", "kids": false},
  "mf20": {"src": "/assets/art58/mic/m20.webp?v=r58r", "slot": "mic-frame", "name": "زهر الساكورا", "kids": false},
  "mf21": {"src": "/assets/art58/mic/m21.webp?v=r58r", "slot": "mic-frame", "name": "الفراشة", "kids": false},
  "mf22": {"src": "/assets/art58/mic/m22.webp?v=r58r", "slot": "mic-frame", "name": "سماعة الموسيقى", "kids": false},
  "mf23": {"src": "/assets/art58/mic/m23.webp?v=r58r", "slot": "mic-frame", "name": "ليالي رمضان", "kids": false},
  "mf24": {"src": "/assets/art58/mic/m24.webp?v=r58r", "slot": "mic-frame", "name": "الجليد الملكي", "kids": false},
  "mf25": {"src": "/assets/art58/mic/m25.webp?v=r58r", "slot": "mic-frame", "name": "الساعة الرملية", "kids": false},
  "mf26": {"src": "/assets/art58/mic/m26.webp?v=r58r", "slot": "mic-frame", "name": "الكوكب", "kids": false},
  "mf27": {"src": "/assets/art58/mic/m27.webp?v=r58r", "slot": "mic-frame", "name": "سيوف الملك", "kids": false},
  "mf28": {"src": "/assets/art58/mic/m28.webp?v=r58r", "slot": "mic-frame", "name": "الشطرنج الذهبي", "kids": false},
  "mf29": {"src": "/assets/art58/mic/m29.webp?v=r58r", "slot": "mic-frame", "name": "الورد الأسود", "kids": false},
  "mf30": {"src": "/assets/art58/mic/m30.webp?v=r58r", "slot": "mic-frame", "name": "زهرة اللوتس", "kids": false},
  "mf31": {"src": "/assets/art58/mic/m31.webp?v=r58r", "slot": "mic-frame", "name": "جناح السماء", "kids": false},
  "mf32": {"src": "/assets/art58/mic/m32.webp?v=r58r", "slot": "mic-frame", "name": "الجناح الأسود", "kids": false},
  "mf33": {"src": "/assets/art58/mic/m33.webp?v=r58r", "slot": "mic-frame", "name": "الحمم", "kids": false},
  "mf34": {"src": "/assets/art58/mic/m34.webp?v=r58r", "slot": "mic-frame", "name": "قلعة الغيوم", "kids": false},
  "mf35": {"src": "/assets/art58/mic/m35.webp?v=r58r", "slot": "mic-frame", "name": "الربيع الوردي", "kids": false},
  "mf36": {"src": "/assets/art58/mic/m36.webp?v=r58r", "slot": "mic-frame", "name": "البوابة الذهبية", "kids": false},
  "art-f2-01": {"src": "/assets/art58/frames2/f01.webp?v=r59b", "slot": "frame", "name": "الغار الذهبي", "kids": false},
  "art-f2-02": {"src": "/assets/art58/frames2/f02.webp?v=r59b", "slot": "frame", "name": "زهر الساكورا", "kids": false},
  "art-f2-03": {"src": "/assets/art58/frames2/f03.webp?v=r59b", "slot": "frame", "name": "فراشة البنفسج", "kids": false},
  "art-f2-04": {"src": "/assets/art58/frames2/f04.webp?v=r59b", "slot": "frame", "name": "الثلج الملكي", "kids": false},
  "art-f2-05": {"src": "/assets/art58/frames2/f05.webp?v=r59b", "slot": "frame", "name": "تاج البنفسج", "kids": false},
  "art-f2-06": {"src": "/assets/art58/frames2/f06.webp?v=r59b", "slot": "frame", "name": "القطة الوردية", "kids": false},
  "art-f2-07": {"src": "/assets/art58/frames2/f07.webp?v=r59b", "slot": "frame", "name": "سماعة الجيمر", "kids": false},
  "art-f2-08": {"src": "/assets/art58/frames2/f08.webp?v=r59b", "slot": "frame", "name": "الورد الوردي", "kids": false},
  "art-f2-09": {"src": "/assets/art58/frames2/f09.webp?v=r59b", "slot": "frame", "name": "غيوم الفضة", "kids": false},
  "art-f2-10": {"src": "/assets/art58/frames2/f10.webp?v=r59b", "slot": "frame", "name": "الشمس الذهبية", "kids": false},
  "art-f2-11": {"src": "/assets/art58/frames2/f11.webp?v=r59b", "slot": "frame", "name": "الياقوت الذهبي", "kids": false},
  "art-f2-12": {"src": "/assets/art58/frames2/f12.webp?v=r59b", "slot": "frame", "name": "غصن الربيع", "kids": false},
  /* R58l: الألقاب الـ20 من تصميم المالك */
  "art-t-01": {"src": "/assets/art58/titles/t01.webp?v=r58l", "slot": "title", "name": "لاعب جديد"},
  "art-t-02": {"src": "/assets/art58/titles/t02.webp?v=r58l", "slot": "title", "name": "مشارك نشط"},
  "art-t-03": {"src": "/assets/art58/titles/t03.webp?v=r58l", "slot": "title", "name": "لاعب مميز"},
  "art-t-04": {"src": "/assets/art58/titles/t04.webp?v=r58l", "slot": "title", "name": "محترف الألعاب"},
  "art-t-05": {"src": "/assets/art58/titles/t05.webp?v=r58l", "slot": "title", "name": "عاشق التحدي"},
  "art-t-06": {"src": "/assets/art58/titles/t06.webp?v=r58l", "slot": "title", "name": "نجم اللعبة"},
  "art-t-07": {"src": "/assets/art58/titles/t07.webp?v=r58l", "slot": "title", "name": "سيد الدوري"},
  "art-t-08": {"src": "/assets/art58/titles/t08.webp?v=r58l", "slot": "title", "name": "متصدر الترتيب"},
  "art-t-09": {"src": "/assets/art58/titles/t09.webp?v=r58l", "slot": "title", "name": "ملك الألعاب"},
  "art-t-10": {"src": "/assets/art58/titles/t10.webp?v=r58l", "slot": "title", "name": "إمبراطور الساحة"},
  "art-t-11": {"src": "/assets/art58/titles/t11.webp?v=r58l", "slot": "title", "name": "أسطورة الجيمنغ"},
  "art-t-12": {"src": "/assets/art58/titles/t12.webp?v=r58l", "slot": "title", "name": "صائد الانتصارات"},
  "art-t-13": {"src": "/assets/art58/titles/t13.webp?v=r58l", "slot": "title", "name": "قاهر الخصوم"},
  "art-t-14": {"src": "/assets/art58/titles/t14.webp?v=r58l", "slot": "title", "name": "اللاعب الذهبي"},
  "art-t-15": {"src": "/assets/art58/titles/t15.webp?v=r58l", "slot": "title", "name": "سيد الاستراتيجيات"},
  "art-t-16": {"src": "/assets/art58/titles/t16.webp?v=r58l", "slot": "title", "name": "ملك الدومينو"},
  "art-t-17": {"src": "/assets/art58/titles/t17.webp?v=r58l", "slot": "title", "name": "أسطورة البلوت"},
  "art-t-18": {"src": "/assets/art58/titles/t18.webp?v=r58l", "slot": "title", "name": "ملك الجاكارو"},
  "art-t-19": {"src": "/assets/art58/titles/t19.webp?v=r58l", "slot": "title", "name": "سيد العروش"},
  "art-t-20": {"src": "/assets/art58/titles/t20.webp?v=r58l", "slot": "title", "name": "إمبراطور الأساطير"},
  /* R58k: الشارات الـ20 الجديدة من تصميم المالك */
  "art-b-01": {"src": "/assets/art58/badges/b01.webp?v=r58k", "slot": "badge", "name": "شارة عادي"},
  "art-b-02": {"src": "/assets/art58/badges/b02.webp?v=r58k", "slot": "badge", "name": "شارة شائع"},
  "art-b-03": {"src": "/assets/art58/badges/b03.webp?v=r58k", "slot": "badge", "name": "شارة متقدم"},
  "art-b-04": {"src": "/assets/art58/badges/b04.webp?v=r58k", "slot": "badge", "name": "شارة محقق"},
  "art-b-05": {"src": "/assets/art58/badges/b05.webp?v=r58k", "slot": "badge", "name": "شارة مميز"},
  "art-b-06": {"src": "/assets/art58/badges/b06.webp?v=r58k", "slot": "badge", "name": "شارة غير شائع"},
  "art-b-07": {"src": "/assets/art58/badges/b07.webp?v=r58k", "slot": "badge", "name": "شارة نادر"},
  "art-b-08": {"src": "/assets/art58/badges/b08.webp?v=r58k", "slot": "badge", "name": "شارة نادر"},
  "art-b-09": {"src": "/assets/art58/badges/b09.webp?v=r58k", "slot": "badge", "name": "شارة نادر"},
  "art-b-10": {"src": "/assets/art58/badges/b10.webp?v=r58k", "slot": "badge", "name": "شارة مميز"},
  "art-b-11": {"src": "/assets/art58/badges/b11.webp?v=r58k", "slot": "badge", "name": "شارة ملحمي"},
  "art-b-12": {"src": "/assets/art58/badges/b12.webp?v=r58k", "slot": "badge", "name": "شارة ملحمي"},
  "art-b-13": {"src": "/assets/art58/badges/b13.webp?v=r58k", "slot": "badge", "name": "شارة ملحمي"},
  "art-b-14": {"src": "/assets/art58/badges/b14.webp?v=r58k", "slot": "badge", "name": "شارة ملحمي"},
  "art-b-15": {"src": "/assets/art58/badges/b15.webp?v=r58k", "slot": "badge", "name": "شارة ملحمي"},
  "art-b-16": {"src": "/assets/art58/badges/b16.webp?v=r58k", "slot": "badge", "name": "شارة أسطوري"},
  "art-b-17": {"src": "/assets/art58/badges/b17.webp?v=r58k", "slot": "badge", "name": "شارة أسطوري"},
  "art-b-18": {"src": "/assets/art58/badges/b18.webp?v=r58k", "slot": "badge", "name": "شارة أسطوري"},
  "art-b-19": {"src": "/assets/art58/badges/b19.webp?v=r58k", "slot": "badge", "name": "شارة أسطوري"},
  "art-b-20": {"src": "/assets/art58/badges/b20.webp?v=r58k", "slot": "badge", "name": "شارة أسطوري+"},
  "vip-f1": {"src": "/assets/art58/rank/vip01.webp?v=r58o", "slot": "frame", "name": "إطار غار الذهب VIP", "kids": false},
  "vip-f2": {"src": "/assets/art58/rank/vip02.webp?v=r58o", "slot": "frame", "name": "إطار غار الكريستال VIP", "kids": false},
  "vip-f3": {"src": "/assets/art58/rank/vip03.webp?v=r58o", "slot": "frame", "name": "إطار تاج الياقوت VIP", "kids": false},
  "vip-f4": {"src": "/assets/art58/rank/vip04.webp?v=r58o", "slot": "frame", "name": "إطار غار البنفسج VIP", "kids": false},
  "vip-f5": {"src": "/assets/art58/rank/vip05.webp?v=r58o", "slot": "frame", "name": "إطار لهب الياقوت VIP", "kids": false},
  "vip-f6": {"src": "/assets/art58/rank/vip06.webp?v=r58o", "slot": "frame", "name": "إطار جليد الملوك VIP", "kids": false},
  "vip-f7": {"src": "/assets/art58/rank/vip07.webp?v=r58o", "slot": "frame", "name": "إطار القلب الوردي VIP", "kids": false},
  "vip-f8": {"src": "/assets/art58/rank/vip08.webp?v=r58o", "slot": "frame", "name": "إطار أجنحة الفجر VIP", "kids": false},
  "vip-f9": {"src": "/assets/art58/rank/vip09.webp?v=r58o", "slot": "frame", "name": "إطار تاج البنفسج VIP", "kids": false},
  "vip-f10": {"src": "/assets/art58/rank/vip10.webp?v=r58o", "slot": "frame", "name": "إطار أسود العرش VIP", "kids": false},
  "vip-f11": {"src": "/assets/art58/rank/vip11.webp?v=r58o", "slot": "frame", "name": "إطار تنين الجليد VIP", "kids": false},
  "vip-f12": {"src": "/assets/art58/rank/vip12.webp?v=r58o", "slot": "frame", "name": "إطار أسد الذهب VIP", "kids": false},
  "vip-f13": {"src": "/assets/art58/rank/vip13.webp?v=r58o", "slot": "frame", "name": "إطار قلعة البنفسج VIP", "kids": false},
  "vip-f14": {"src": "/assets/art58/rank/vip14.webp?v=r58o", "slot": "frame", "name": "إطار أجنحة الثلج VIP", "kids": false},
  "vip-f15": {"src": "/assets/art58/rank/vip15.webp?v=r58o", "slot": "frame", "name": "إطار تاج VIP الأسطوري", "kids": false},
  "nb-f1": {"src": "/assets/art58/rank/n1.webp?v=r58o", "slot": "frame", "name": "إطار غار الفارس", "kids": false},
  "nb-f2": {"src": "/assets/art58/rank/n2.webp?v=r58o", "slot": "frame", "name": "إطار ياقوت البارون", "kids": false},
  "nb-f3": {"src": "/assets/art58/rank/n3.webp?v=r58o", "slot": "frame", "name": "إطار بنفسج الفيكونت", "kids": false},
  "nb-f4": {"src": "/assets/art58/rank/n4.webp?v=r58o", "slot": "frame", "name": "إطار جليد الإيرل", "kids": false},
  "nb-f5": {"src": "/assets/art58/rank/n5.webp?v=r58o", "slot": "frame", "name": "إطار أجنحة الماركيز", "kids": false},
  "nb-f6": {"src": "/assets/art58/rank/n6.webp?v=r58o", "slot": "frame", "name": "إطار تاج الدوق", "kids": false},
  "nb-f7": {"src": "/assets/art58/rank/n7.webp?v=r58o", "slot": "frame", "name": "إطار أسد الأمير", "kids": false},
  "nb-f8": {"src": "/assets/art58/rank/n8.webp?v=r58o", "slot": "frame", "name": "إطار أجنحة الملك", "kids": false},
  "nb-f9": {"src": "/assets/art58/rank/n9.webp?v=r58o", "slot": "frame", "name": "إطار الإمبراطور الأعظم", "kids": false},
  /* R58h: إطارات المالك (مجموعة «إطارات المتجر» المرسلة) — مقصوصة بخلفية شفافة */
  "art-f-01": {"src": "/assets/art58/frames/f01.webp?v=r58h", "slot": "frame", "name": "حلقة الفضة", "kids": false},
  "art-f-02": {"src": "/assets/art58/frames/f02.webp?v=r58h", "slot": "frame", "name": "حلقة الياقوت الأزرق", "kids": false},
  "art-f-03": {"src": "/assets/art58/frames/f03.webp?v=r58h", "slot": "frame", "name": "حلقة البرونز الملكي", "kids": false},
  "art-f-06": {"src": "/assets/art58/frames/f06.webp?v=r58h", "slot": "frame", "name": "مدار النجوم", "kids": false},
  "art-f-07": {"src": "/assets/art58/frames/f07.webp?v=r58h", "slot": "frame", "name": "فراشة الربيع", "kids": false},
  "art-f-08": {"src": "/assets/art58/frames/f08.webp?v=r58h", "slot": "frame", "name": "موج المحيط", "kids": false},
  "art-f-09": {"src": "/assets/art58/frames/f09.webp?v=r58h", "slot": "frame", "name": "ساكورا الوردية", "kids": false},
  "art-f-10": {"src": "/assets/art58/frames/f10.webp?v=r58h", "slot": "frame", "name": "هلال الأحلام", "kids": false},
  "art-f-11": {"src": "/assets/art58/frames/f11.webp?v=r58h", "slot": "frame", "name": "أجنحة الملاك", "kids": false},
  "art-f-14": {"src": "/assets/art58/frames/f14.webp?v=r58h", "slot": "frame", "name": "تنين اللهب", "kids": false},
  "art-f-15": {"src": "/assets/art58/frames/f15.webp?v=r58h", "slot": "frame", "name": "كريستال الشتاء", "kids": false},
  "art-f-16": {"src": "/assets/art58/frames/f16.webp?v=r58h", "slot": "frame", "name": "تنين الذهب", "kids": false},
  "art-f-18": {"src": "/assets/art58/frames/f18.webp?v=r58h", "slot": "frame", "name": "مجرة الأحلام", "kids": false},
  "art-f-20": {"src": "/assets/art58/frames/f20.webp?v=r58h", "slot": "frame", "name": "وردة الملكة", "kids": false},
  "art-f-21": {"src": "/assets/art58/frames/f21.webp?v=r58h", "slot": "frame", "name": "ساعة الزمن", "kids": false},
  "art-f-22": {"src": "/assets/art58/frames/f22.webp?v=r58h", "slot": "frame", "name": "سفينة الأمواج", "kids": false},
  "art-f-23": {"src": "/assets/art58/frames/f23.webp?v=r58h", "slot": "frame", "name": "غابة الأيل", "kids": false},
  "art-f-24": {"src": "/assets/art58/frames/f24.webp?v=r58h", "slot": "frame", "name": "قلعة الغيوم", "kids": false},
  "art-f-28": {"src": "/assets/art58/frames/f28.webp?v=r58h", "slot": "frame", "name": "تنين البنفسج", "kids": false},
  "art-f-29": {"src": "/assets/art58/frames/f29.webp?v=r58h", "slot": "frame", "name": "أجنحة القمر", "kids": false},

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
  /* R58k: كل الشارات (المكتسبة والمتجر) برسومات المالك */
  "ach-t-a01": "art-t-01",
  "ach-t-a02": "art-t-02",
  "ach-t-a03": "art-t-03",
  "ach-t-a04": "art-t-04",
  "ach-t-a05": "art-t-05",
  "ach-t-a06": "art-t-06",
  "ach-t-a07": "art-t-07",
  "ach-t-a08": "art-t-08",
  "ach-t-a09": "art-t-09",
  "ach-t-a10": "art-t-10",
  "ach-t-a11": "art-t-11",
  "ach-t-a12": "art-t-12",
  "ach-t-a13": "art-t-13",
  "ach-t-a14": "art-t-14",
  "ach-t-a15": "art-t-15",
  "ach-t-domino": "art-t-16",
  "ach-t-baloot": "art-t-17",
  "ach-t-jackaro": "art-t-18",
  "ach-t-thrones": "art-t-19",
  "ach-t-emperor": "art-t-20",
  "ach-b-first": "art-b-01",
  "ach-b-win1": "art-b-03",
  "ach-b-10": "art-b-10",
  "ach-b-gift": "art-b-16",
  "ach-b-loved": "art-b-15",
  "ach-b-collector": "art-b-12",
  "ach-b-lv10": "art-b-13",
  "ach-b-baloot": "art-b-08",
  "ach-b-domino": "art-b-06",
  "ach-b-jackaro": "art-b-09",
  "ach-b-ludo": "art-b-14",
  "ach-b-uno": "art-b-05",
  "ach-b-carrom": "art-b-04",
  "badge-star": "art-b-02",
  "badge-diamond": "art-b-11",
  "badge-falcon": "art-b-07",
  "badge2-flame": "art-b-18",
  "badge2-moon": "art-b-19",
  "badge2-crown": "art-b-17",
  "ach-t-galaxy": "ref-p-title-09",
  "ach-t-shadow": "ref-p-title-10",
  "ach-t-dragon": "ref-p-title-11",
});
/** Optional child-art alternatives for the SAME existing achievements, not new goals. */
export const ACHIEVEMENT_ART_KIDS = Object.freeze({
  "ach-t-a01": "art-t-01",
  "ach-t-a02": "art-t-02",
  "ach-t-a03": "art-t-03",
  "ach-t-a04": "art-t-04",
  "ach-t-a05": "art-t-05",
  "ach-t-a06": "art-t-06",
  "ach-t-a07": "art-t-07",
  "ach-t-a08": "art-t-08",
  "ach-t-a09": "art-t-09",
  "ach-t-a10": "art-t-10",
  "ach-t-a11": "art-t-11",
  "ach-t-a12": "art-t-12",
  "ach-t-a13": "art-t-13",
  "ach-t-a14": "art-t-14",
  "ach-t-a15": "art-t-15",
  "ach-t-domino": "art-t-16",
  "ach-t-baloot": "art-t-17",
  "ach-t-jackaro": "art-t-18",
  "ach-t-thrones": "art-t-19",
  "ach-t-emperor": "art-t-20",
  "ach-b-first": "art-b-01",
  "ach-b-win1": "art-b-03",
  "ach-b-10": "art-b-10",
  "ach-b-gift": "art-b-16",
  "ach-b-loved": "art-b-15",
  "ach-b-collector": "art-b-12",
  "ach-b-lv10": "art-b-13",
  "ach-b-baloot": "art-b-08",
  "ach-b-domino": "art-b-06",
  "ach-b-jackaro": "art-b-09",
  "ach-b-ludo": "art-b-14",
  "ach-b-uno": "art-b-05",
  "ach-b-carrom": "art-b-04",
  "badge-star": "art-b-02",
  "badge-diamond": "art-b-11",
  "badge-falcon": "art-b-07",
  "badge2-flame": "art-b-18",
  "badge2-moon": "art-b-19",
  "badge2-crown": "art-b-17"
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
