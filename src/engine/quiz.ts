import { topOf, clone, type Rng } from './util.js';
import type { ApplyResult, BotPlan, Engine, EngineOpts, GameInfo, PlayerRef } from './types.js';

export interface Question {
  key: string; // يمنع التكرار
  prompt: string;
  big?: string; // رمز كبير فوق السؤال (إيموجي)
  options: string[];
  answer: number;
}

export interface QuizDef {
  info: GameInfo;
  /** يولّد سؤالاً ما استُخدم قبل (حسب key) */
  make(rng: Rng, used: string[]): Question;
  /** احتمال أن يجاوب الكمبيوتر صح */
  botSkill: number;
}

export interface QuizState {
  ver: number;
  opts: { rounds: number; questionMs: number; resultMs: number };
  players: string[];
  round: number;
  used: string[];
  q: Question;
  phase: 'asking' | 'reveal' | 'final';
  endsAt: number;
  startedAt: number;
  choices: Record<string, number>;
  /** وقت إجابة كل لاعب (للمكافأة على السرعة) */
  at: Record<string, number>;
  gained: Record<string, number>;
  scores: Record<string, number>;
  correctCount: Record<string, number>;
}
export type QuizAction = { type: 'answer'; choice: number };

const BASE = 100;
const SPEED = 50;

export function createQuizEngine(def: QuizDef, rng: Rng = Math.random): Engine<QuizState, QuizAction> {
  const next = (s: QuizState, now: number, first = false): QuizState => {
    const q = def.make(rng, s.used);
    return {
      ...s, round: first ? 1 : s.round + 1, used: [...s.used, q.key], q, phase: 'asking',
      endsAt: now + s.opts.questionMs, startedAt: now, choices: {}, at: {}, gained: {}, ver: s.ver + 1,
    };
  };
  const finish = (s: QuizState, now: number): QuizState => {
    const at = s.at;
    const gained: Record<string, number> = {};
    const scores = { ...s.scores };
    const correctCount = { ...s.correctCount };
    for (const p of s.players) {
      if (s.choices[p] === s.q.answer) {
        const frac = Math.max(0, Math.min(1, (s.endsAt - (at[p] ?? s.endsAt)) / s.opts.questionMs));
        gained[p] = BASE + Math.round(SPEED * frac);
        correctCount[p]++;
      } else gained[p] = 0;
      scores[p] += gained[p];
    }
    return { ...s, phase: 'reveal', gained, scores, correctCount, endsAt: now + s.opts.resultMs, ver: s.ver + 1 };
  };
  return {
    info: def.info,
    init(players: PlayerRef[], now: number, opts?: EngineOpts): QuizState {
      const ids = players.map((p) => p.id);
      const base: QuizState = {
        ver: 0,
        opts: { rounds: opts?.rounds ?? 8, questionMs: opts?.questionMs ?? 15_000, resultMs: Math.min(opts?.resultMs ?? 4000, 6000) },
        players: ids, round: 0, used: [], q: { key: '', prompt: '', options: [], answer: 0 }, phase: 'asking', endsAt: 0, startedAt: now,
        choices: {}, at: {}, gained: {}, scores: Object.fromEntries(ids.map((i) => [i, 0])), correctCount: Object.fromEntries(ids.map((i) => [i, 0])),
      };
      return next(base, now, true);
    },
    apply(state, playerId, action, now): ApplyResult<QuizState> {
      if (!state.players.includes(playerId)) return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
      if (!action || action.type !== 'answer') return { ok: false, error: 'حركة غير معروفة.' };
      if (state.phase !== 'asking') return { ok: false, error: 'السؤال انتهى.' };
      if (now >= state.endsAt) return { ok: false, error: 'انتهى الوقت.' };
      if (state.choices[playerId] !== undefined) return { ok: false, error: 'جاوبت قبل.' };
      const c = action.choice;
      if (!Number.isInteger(c) || c < 0 || c >= state.q.options.length) return { ok: false, error: 'خيار غير صالح.' };
      const s = clone(state);
      s.choices[playerId] = c;
      s.at[playerId] = now;
      if (s.players.every((p) => s.choices[p] !== undefined)) return { ok: true, state: finish(s, now) };
      return { ok: true, state: s };
    },
    tick(state, now) {
      if (state.phase === 'final' || now < state.endsAt) return state;
      const s = clone(state);
      if (s.phase === 'asking') return finish(s, now);
      // reveal → السؤال التالي أو النهاية
      if (s.round >= s.opts.rounds) return { ...s, phase: 'final', endsAt: 0, ver: s.ver + 1 };
      return next(s, now);
    },
    view(state, playerId, now) {
      const show = state.phase !== 'asking';
      return {
        game: 'quiz', quiz: def.info.id, ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt,
        round: state.round, rounds: state.opts.rounds, prompt: state.q.prompt, big: state.q.big ?? null, options: state.q.options,
        // الجواب الصحيح واختيارات الآخرين ما تنرسل إلا بعد انتهاء السؤال
        answer: show ? state.q.answer : null,
        answered: Object.fromEntries(state.players.map((p) => [p, state.choices[p] !== undefined])),
        youChose: state.choices[playerId] ?? null,
        choices: show ? state.choices : null, gained: show ? state.gained : null,
        scores: state.scores, correct: state.correctCount, players: state.players,
      };
    },
    botAction(state, botId): BotPlan<QuizAction> | null {
      if (state.phase !== 'asking' || !state.players.includes(botId) || state.choices[botId] !== undefined) return null;
      const right = rng() < def.botSkill;
      const wrong = state.q.options.map((_, i) => i).filter((i) => i !== state.q.answer);
      const choice = right ? state.q.answer : wrong[Math.floor(rng() * wrong.length)];
      return { action: { type: 'answer', choice }, delayMs: 2000 + Math.floor(rng() * 7000) };
    },
    isOver: (s) => s.phase === 'final',
    outcome: (s) => topOf(s.scores),
    version: (s) => s.ver,
  };
}

