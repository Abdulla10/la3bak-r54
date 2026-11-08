/**
 * الإنجازات والألقاب والشارات المكتسبة — كلها من أرقام حقيقية بالخادم (نتائج يؤكدها المحرك، هدايا منفّذة، ملكية فعلية).
 * منفصلة تماماً عن الألقاب/الشارات المدفوعة بالمتجر: ما تنشرى ولا تنباع، تنفتح لما يتحقق شرطها.
 * الشرط يُحسب لحظة الطلب (الأرقام تزيد فقط)، فما نخزن «مفتوح» منفصل يقدر يختلف عن الأرقام.
 */
export type Metric = 'played' | 'wins' | 'level' | 'points' | 'giftsSent' | 'giftsRecv' | 'owned' | `won:${string}`;
export interface Ach { id: string; kind: 'title' | 'badge'; name: string; icon: string; metric: Metric; goal: number; cond: string; tier: 'common' | 'premium' | 'rare' | 'epic' | 'legendary' | 'ultra' }
const A = (id: string, kind: Ach['kind'], name: string, icon: string, metric: Metric, goal: number, cond: string, tier: Ach['tier']): Ach => ({ id, kind, name, icon, metric, goal, cond, tier });

export const ACHIEVEMENTS: Ach[] = [
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
  // R58l: ألقاب جديدة من تصميم المالك (مكتسبة بشروط من أرقام الخادم)
  A('ach-t-a01', 'title', 'لاعب جديد', '🎮', 'played', 1, 'أكمل أول مباراة', 'common'),
  A('ach-t-a02', 'title', 'مشارك نشط', '⭐', 'played', 20, 'أكمل 20 مباراة', 'common'),
  A('ach-t-a03', 'title', 'لاعب مميز', '🌟', 'wins', 10, 'فز 10 مرات', 'premium'),
  A('ach-t-a04', 'title', 'محترف الألعاب', '🕹️', 'played', 100, 'أكمل 100 مباراة', 'premium'),
  A('ach-t-a05', 'title', 'عاشق التحدي', '⚔️', 'wins', 30, 'فز 30 مرة', 'premium'),
  A('ach-t-a06', 'title', 'نجم اللعبة', '✨', 'level', 5, 'وصّل المستوى 5', 'rare'),
  A('ach-t-a07', 'title', 'سيد الدوري', '👑', 'points', 500, 'اجمع 500 نقطة تصنيف', 'rare'),
  A('ach-t-a08', 'title', 'متصدر الترتيب', '🏆', 'points', 2500, 'اجمع 2500 نقطة تصنيف', 'epic'),
  A('ach-t-a09', 'title', 'ملك الألعاب', '🦁', 'wins', 150, 'فز 150 مرة', 'epic'),
  A('ach-t-a10', 'title', 'إمبراطور الساحة', '🦅', 'played', 500, 'أكمل 500 مباراة', 'epic'),
  A('ach-t-a11', 'title', 'أسطورة الجيمنغ', '🎮', 'played', 2000, 'أكمل 2000 مباراة', 'legendary'),
  A('ach-t-a12', 'title', 'صائد الانتصارات', '🐺', 'wins', 300, 'فز 300 مرة', 'legendary'),
  A('ach-t-a13', 'title', 'قاهر الخصوم', '🐉', 'wins', 750, 'فز 750 مرة', 'ultra'),
  A('ach-t-a14', 'title', 'اللاعب الذهبي', '🥇', 'level', 25, 'وصّل المستوى 25', 'legendary'),
  A('ach-t-a15', 'title', 'سيد الاستراتيجيات', '♟️', 'points', 4000, 'اجمع 4000 نقطة تصنيف', 'legendary'),
  // ألقاب الألعاب
  A('ach-t-baloot', 'title', 'أسطورة البلوت', '🃏', 'won:baloot', 50, 'فز 50 مباراة بلوت', 'legendary'),
  A('ach-t-domino', 'title', 'ملك الدومينو', '🁫', 'won:domino', 50, 'فز 50 مباراة دومينو', 'legendary'),
  A('ach-t-jackaro', 'title', 'ملك الجاكارو', '♦️', 'won:jackaro', 50, 'فز 50 مباراة جاكارو', 'legendary'),
  A('ach-t-ludo', 'title', 'إمبراطور اللودو', '🎲', 'won:ludo', 50, 'فز 50 مباراة لودو', 'legendary'),
  A('ach-t-carrom', 'title', 'بطل الكيرم', '🎯', 'won:carrom', 25, 'فز 25 مباراة كيرم', 'epic'),
  A('ach-t-uno', 'title', 'بطل أونو', '🎴', 'won:uno', 25, 'فز 25 مباراة أونو', 'epic'),
];
const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export const achOf = (id: unknown): Ach | undefined => (typeof id === 'string' ? BY_ID.get(id) : undefined);

export interface AchInput { played: number; wins: number; level: number; points: number; games: Record<string, { played: number; won: number }>; giftsSent: number; giftsRecv: number; owned: number }
export function valueOf(a: Ach, s: AchInput): number {
  if (a.metric.startsWith('won:')) return s.games[a.metric.slice(4)]?.won ?? 0;
  return s[a.metric as Exclude<Metric, `won:${string}`>];
}
export const earned = (a: Ach, s: AchInput) => valueOf(a, s) >= a.goal;
/** قائمة للعرض: كل إنجاز مع تقدّمه الحقيقي */
export const achView = (s: AchInput) => ACHIEVEMENTS.map((a) => { const v = valueOf(a, s); return { id: a.id, kind: a.kind, name: a.name, icon: a.icon, cond: a.cond, tier: a.tier, goal: a.goal, value: Math.min(v, a.goal), done: v >= a.goal }; });
