const k = (minAge, maxAge, difficulty, type, skill, needsReading, needsWriting = false) => ({ minAge, maxAge, difficulty, type, skill, needsReading, needsWriting });
/** العمر المناسب لكل لعبة. اختبار يتأكد إن كل لعبة في السجل لها سطر هنا. */
export const KIDS = {
    letterpic: k(6, 8, 'easy', 'single', 'الحروف', true),
    kidsscience: k(6, 11, 'medium', 'both', 'العلوم والحيوانات', true),
    picriddle: k(6, 11, 'easy', 'both', 'التصنيف والربط', true),
    islamic: k(9, 14, 'medium', 'both', 'الثقافة الإسلامية', true),
    sports: k(9, 14, 'medium', 'both', 'الثقافة الرياضية', true),
    gulf: k(9, 14, 'medium', 'both', 'التراث والثقافة الخليجية', true),
    trivia: k(9, 14, 'medium', 'both', 'المعلومات العامة', true),
    capitals: k(9, 14, 'medium', 'both', 'الجغرافيا', true),
    letters: k(9, 14, 'hard', 'both', 'الكلمات العربية', true, true),
    mostlikely: k(12, 14, 'medium', 'group', 'التفاعل مع الأصحاب', true),
    outsider: k(12, 14, 'hard', 'group', 'الاستنتاج والتحليل', true, true),
    codewords: k(12, 14, 'advanced', 'group', 'الكلمات والتلميحات', true, true),
    jackaro: k(12, 14, 'advanced', 'both', 'الاستراتيجية', false),
    baloot: k(12, 14, 'advanced', 'group', 'الاستراتيجية وحساب الأوراق', false),
    ludo: k(7, 14, 'medium', 'both', 'الحظ والتخطيط', false),
    domino: k(7, 14, 'medium', 'both', 'مطابقة الأرقام والجمع', false),
    uno: k(7, 14, 'easy', 'both', 'الألوان والأرقام والتخطيط', false),
    pool: k(10, 99, 'medium', 'both', 'الزوايا والتركيز والتخطيط', false),
    liars: k(12, 99, 'medium', 'both', 'الخداع والملاحظة والحظ', false),
    carrom: k(8, 14, 'medium', 'both', 'التصويب وتقدير القوة', false),
};
