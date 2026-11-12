export interface PlayerRef {
  id: string;
  name: string;
  bot: boolean;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'advanced';
/** بيانات العمر لقسم الأطفال. كل لعبة لازم يكون لها عمر محدد */
export interface KidsMeta {
  minAge: number;
  maxAge: number;
  difficulty: Difficulty;
  /** single = وحدك (مع الكمبيوتر)، group = لازم أصدقاء، both = الاثنين */
  type: 'single' | 'group' | 'both';
  skill: string;
  needsReading: boolean;
  needsWriting: boolean;
}

export interface GameInfo {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  defaultSeats: number;
  supportsBots: boolean;
  status: 'available' | 'soon';
  /** يضيفها السجل من kids.ts */
  kids?: KidsMeta;
  /** أقسام اللعبة في صفحة الألعاب (معرّفات من GAME_CATEGORIES) */
  categories: string[];
  idea: string;
  howToStart: string;
  howToWin: string;
  /** R108: أوضاع إضافية غير الكلاسيكي (لودو: quick, magic) */
  variants?: string[];
}

export interface EngineOpts {
  /** R108: وضع اللعب الخاص (مثلاً لودو: quick / magic) */
  variant?: string;
  rounds?: number;
  answerMs?: number;
  resultMs?: number;
  firstDoneMs?: number;
  /** مهلة دور اللاعب في الألعاب بالدور */
  turnMs?: number;
  /** مهلة التصويت */
  voteMs?: number;
  /** مهلة التلميح / الكلام */
  clueMs?: number;
  /** مهلة السؤال في ألعاب الأسئلة */
  questionMs?: number;
}

/** نتيجة لعبة منتهية: مين فاز، ونقاط كل لاعب إن وُجدت. تُستعمل لإحصائيات اللاعب على جهازه. */
export interface Outcome {
  winners: string[];
  scores?: Record<string, number>;
}

export type ApplyResult<S> = { ok: true; state: S } | { ok: false; error: string };

export interface BotPlan<A> {
  action: A;
  delayMs: number;
}

/**
 * كل لعبة تنفّذ هذه الواجهة كمحرك مستقل. المحرك دوال نقيّة:
 * لا يغيّر الحالة الممرّرة، ويرجع حالة جديدة أو خطأ بالعربي.
 */
export interface Engine<S = any, A = any> {
  info: GameInfo;
  init(players: PlayerRef[], now: number, opts?: EngineOpts): S;
  apply(state: S, playerId: string, action: A, now: number): ApplyResult<S>;
  tick(state: S, now: number): S;
  view(state: S, playerId: string, now: number): unknown;
  botAction(state: S, botId: string, now: number): BotPlan<A> | null;
  /** R69zm: مستوى البوت (اختياري لكل لعبة): سهل يغلط أحياناً، محترف يحسب الورق ويخطط */
  botLevelAction?(state: S, botId: string, now: number, level: 'easy' | 'pro'): BotPlan<A> | null;
  isOver(state: S): boolean;
  /** نتيجة اللعبة بعد انتهائها */
  outcome(state: S): Outcome;
  /** رقم يزيد كل ما تغيّرت مرحلة اللعب، تتحقق منه الحركات */
  version(state: S): number;
}
