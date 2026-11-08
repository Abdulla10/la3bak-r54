const A = (id, kind, name, icon, metric, goal, cond, tier) => ({ id, kind, name, icon, metric, goal, cond, tier });
export const ACHIEVEMENTS = [
    // شارات البداية
    A('ach-b-first', 'badge', 'الخطوة الأولى', '🎯', 'played', 1, 'أكمل أول مباراة', 'common'),
    A('ach-b-win1', 'badge', 'أول انتصار', '🥇', 'wins', 1, 'فز بأول مباراة', 'common'),
    A('ach-b-10', 'badge', 'لاعب نشيط', '🎮', 'played', 10, 'أكمل 10 مباريات', 'common'),
    A('ach-b-gift', 'badge', 'الكريم', '🎁', 'giftsSent', 10, 'أرسل 10 هدايا', 'premium'),
    A('ach-b-loved', 'badge', 'المحبوب', '💝', 'giftsRecv', 10, 'استلم 10 هدايا', 'premium'),
    A('ach-b-collector', 'badge', 'الجامع', '🧳', 'owned', 10, 'امتلك 10 عناصر من المتجر', 'rare'),
    A('ach-b-lv10', 'badge', 'مستوى 10', '🔟', 'level', 10, 'وصّل المستوى 10', 'rare'),
    // شارات الألعاب: أول فوز بكل لعبة
    A('ach-b-baloot', 'badge', 'فارس البلوت', '🃏', 'won:baloot', 1, 'فز بمباراة بلوت', 'common'),
    A('ach-b-domino', 'badge', 'حجر الدومينو', '🁫', 'won:domino', 1, 'فز بمباراة دومينو', 'common'),
    A('ach-b-jackaro', 'badge', 'خطوة جاكارو', '♦️', 'won:jackaro', 1, 'فز بمباراة جاكارو', 'common'),
    A('ach-b-ludo', 'badge', 'نرد اللودو', '🎲', 'won:ludo', 1, 'فز بمباراة لودو', 'common'),
    A('ach-b-uno', 'badge', 'ورقة أونو', '🎴', 'won:uno', 1, 'فز بمباراة أونو', 'common'),
    A('ach-b-carrom', 'badge', 'ضربة كيرم', '🎯', 'won:carrom', 1, 'فز بمباراة كيرم', 'common'),
    // ألقاب عامة
    A('ach-t-rookie', 'title', 'المبتدئ الواعد', '🌱', 'played', 3, 'أكمل 3 مباريات', 'common'),
    A('ach-t-dark', 'title', 'الملك المظلم', '🌑', 'wins', 50, 'فز 50 مرة', 'rare'),
    A('ach-t-impossible', 'title', 'قاهر المستحيل', '⚡', 'wins', 100, 'فز 100 مرة', 'epic'),
    A('ach-t-dragon', 'title', 'التنين الأعظم', '🐉', 'wins', 250, 'فز 250 مرة', 'legendary'),
    A('ach-t-emperor', 'title', 'إمبراطور الأساطير', '🏛️', 'wins', 500, 'فز 500 مرة', 'ultra'),
    A('ach-t-shadow', 'title', 'فارس الظلال', '🗡️', 'played', 300, 'أكمل 300 مباراة', 'epic'),
    A('ach-t-arena', 'title', 'أسطورة الساحة', '🏟️', 'played', 1000, 'أكمل 1000 مباراة', 'legendary'),
    A('ach-t-diamond', 'title', 'النخبة الماسية', '💠', 'level', 20, 'وصّل المستوى 20', 'epic'),
    A('ach-t-thrones', 'title', 'سيّد العروش', '👑', 'level', 30, 'وصّل المستوى 30', 'legendary'),
    A('ach-t-glory', 'title', 'سيّد المجد', '🏆', 'points', 1000, 'اجمع 1000 نقطة تصنيف', 'epic'),
    A('ach-t-galaxy', 'title', 'ملك المجرة', '🌌', 'points', 5000, 'اجمع 5000 نقطة تصنيف', 'ultra'),
    // ألقاب الألعاب
    A('ach-t-baloot', 'title', 'أسطورة البلوت', '🃏', 'won:baloot', 50, 'فز 50 مباراة بلوت', 'legendary'),
    A('ach-t-domino', 'title', 'ملك الدومينو', '🁫', 'won:domino', 50, 'فز 50 مباراة دومينو', 'legendary'),
    A('ach-t-jackaro', 'title', 'أسطورة الجاكارو', '♦️', 'won:jackaro', 50, 'فز 50 مباراة جاكارو', 'legendary'),
    A('ach-t-ludo', 'title', 'إمبراطور اللودو', '🎲', 'won:ludo', 50, 'فز 50 مباراة لودو', 'legendary'),
    A('ach-t-carrom', 'title', 'بطل الكيرم', '🎯', 'won:carrom', 25, 'فز 25 مباراة كيرم', 'epic'),
    A('ach-t-uno', 'title', 'بطل أونو', '🎴', 'won:uno', 25, 'فز 25 مباراة أونو', 'epic'),
];
const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export const achOf = (id) => (typeof id === 'string' ? BY_ID.get(id) : undefined);
export function valueOf(a, s) {
    if (a.metric.startsWith('won:'))
        return s.games[a.metric.slice(4)]?.won ?? 0;
    return s[a.metric];
}
export const earned = (a, s) => valueOf(a, s) >= a.goal;
/** قائمة للعرض: كل إنجاز مع تقدّمه الحقيقي */
export const achView = (s) => ACHIEVEMENTS.map((a) => { const v = valueOf(a, s); return { id: a.id, kind: a.kind, name: a.name, icon: a.icon, cond: a.cond, tier: a.tier, goal: a.goal, value: Math.min(v, a.goal), done: v >= a.goal }; });
