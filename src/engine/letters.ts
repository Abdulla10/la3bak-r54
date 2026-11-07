import { CATEGORIES, DICT, LETTER_POOL, type CategoryId } from './letters-dict.js';
import { compareKey, firstLetter, isArabicWord, normalizeArabic } from './arabic.js';
import { topOf } from './util.js';
import type { ApplyResult, BotPlan, Engine, EngineOpts, GameInfo, PlayerRef } from './types.js';

/** الإعدادات اللي تستعملها هذي اللعبة فقط من EngineOpts */
export type LettersOpts = Required<Pick<EngineOpts, 'rounds' | 'answerMs' | 'resultMs' | 'firstDoneMs'>>;

export interface CellResult {
  text: string;
  valid: boolean;
  points: number;
  reason?: string;
}
export type RoundResults = Record<string, { cells: Record<string, CellResult>; total: number }>;

export interface LettersState {
  ver: number;
  opts: LettersOpts;
  players: string[];
  round: number;
  letter: string;
  usedLetters: string[];
  phase: 'answering' | 'result' | 'final';
  endsAt: number;
  firstDone: boolean;
  submitted: Record<string, boolean>;
  answers: Record<string, Record<string, string>>;
  results: RoundResults | null;
  totals: Record<string, number>;
}

export type LettersAction = { type: 'submit'; answers: Record<string, string> };

export const DEFAULT_OPTS: LettersOpts = {
  rounds: 3,
  answerMs: 60_000,
  resultMs: 12_000,
  firstDoneMs: 10_000,
};

export const info: GameInfo = {
  id: 'letters',
  name: 'حرف، جماد، حيوان',
  icon: '🔤',
  tagline: 'حرف واحد، خمس خانات، وأسرع عقل يفوز',
  description: 'نعطيكم حرف، وكل واحد يكتب اسم وحيوان ونبات وجماد وبلد يبدأ بنفس الحرف.',
  minPlayers: 2,
  maxPlayers: 6,
  defaultSeats: 4,
  supportsBots: true,
  status: 'available',
  categories: ['words', 'party'],
  idea: 'كل جولة لها حرف. تكتب كلمة لكل خانة تبدأ بهالحرف، وكل ما كانت كلمتك مختلفة عن الباقين زادت نقاطك.',
  howToStart: 'المضيف ينشئ غرفة ويرسل الرمز لأصحابه، أو يختار اللعب مع الكمبيوتر. لما يجتمع العدد يضغط «ابدأ».',
  howToWin: 'الكلمة الصحيحة المختلفة عن غيرك بعشر نقاط، والمتشابهة بخمس. بعد ثلاث جولات، الأعلى نقاطاً يفوز.',
};

export function validateWord(letter: string, raw: string): { valid: boolean; reason?: string } {
  const text = normalizeArabic(raw ?? '');
  if (!text) return { valid: false, reason: 'خانة فاضية' };
  if (!isArabicWord(text)) return { valid: false, reason: 'اكتب بحروف عربية فقط' };
  if (text.replace(/ /g, '').length < 2) return { valid: false, reason: 'الكلمة قصيرة' };
  if (firstLetter(text) !== normalizeArabic(letter)) {
    return { valid: false, reason: `ما تبدأ بحرف ${letter}` };
  }
  return { valid: true };
}

/** يحسب نقاط جولة: فريدة = 10، مكررة بين لاعبين أو أكثر = 5، غير صالحة أو فاضية = 0 */
export function scoreRound(
  letter: string,
  answers: Record<string, Record<string, string>>,
  playerIds: string[],
): RoundResults {
  const results: RoundResults = {};
  for (const pid of playerIds) results[pid] = { cells: {}, total: 0 };
  for (const cat of CATEGORIES) {
    const keys = new Map<string, number>();
    const checked: Record<string, { text: string; v: { valid: boolean; reason?: string } }> = {};
    for (const pid of playerIds) {
      const text = (answers[pid]?.[cat.id] ?? '').slice(0, 30);
      const v = validateWord(letter, text);
      checked[pid] = { text, v };
      if (v.valid) {
        const k = compareKey(text);
        keys.set(k, (keys.get(k) ?? 0) + 1);
      }
    }
    for (const pid of playerIds) {
      const { text, v } = checked[pid];
      const points = v.valid ? ((keys.get(compareKey(text)) ?? 0) > 1 ? 5 : 10) : 0;
      results[pid].cells[cat.id] = { text, valid: v.valid, points, ...(v.valid ? {} : { reason: v.reason }) };
      results[pid].total += points;
    }
  }
  return results;
}

function pickLetter(used: string[], rng: () => number): string {
  const free = LETTER_POOL.filter((l) => !used.includes(l));
  const pool = free.length ? free : LETTER_POOL;
  return pool[Math.floor(rng() * pool.length)];
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function finishRound(s: LettersState, now: number): LettersState {
  const results = scoreRound(s.letter, s.answers, s.players);
  const totals = { ...s.totals };
  for (const pid of s.players) totals[pid] = (totals[pid] ?? 0) + results[pid].total;
  return { ...s, phase: 'result', results, totals, endsAt: now + s.opts.resultMs, ver: s.ver + 1 };
}

export function createLettersEngine(rng: () => number = Math.random): Engine<LettersState, LettersAction> {
  return {
    info,

    init(players: PlayerRef[], now: number, opts?: EngineOpts): LettersState {
      const o = { ...DEFAULT_OPTS, ...(opts ?? {}) };
      const ids = players.map((p) => p.id);
      const letter = pickLetter([], rng);
      return {
        ver: 1,
        opts: o,
        players: ids,
        round: 1,
        letter,
        usedLetters: [letter],
        phase: 'answering',
        endsAt: now + o.answerMs,
        firstDone: false,
        submitted: Object.fromEntries(ids.map((id) => [id, false])),
        answers: {},
        results: null,
        totals: Object.fromEntries(ids.map((id) => [id, 0])),
      };
    },

    apply(state, playerId, action, now): ApplyResult<LettersState> {
      if (!state.players.includes(playerId)) return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
      if (!action || action.type !== 'submit') return { ok: false, error: 'حركة غير معروفة.' };
      if (state.phase !== 'answering') return { ok: false, error: 'الجولة مو في وقت الإجابة.' };
      if (now >= state.endsAt) return { ok: false, error: 'انتهى الوقت.' };
      if (state.submitted[playerId]) return { ok: false, error: 'أرسلت إجاباتك قبل.' };
      if (typeof action.answers !== 'object' || action.answers === null) {
        return { ok: false, error: 'الإجابات غير صالحة.' };
      }
      const clean: Record<string, string> = {};
      for (const c of CATEGORIES) {
        const v = (action.answers as Record<string, unknown>)[c.id];
        clean[c.id] = typeof v === 'string' ? v.slice(0, 30) : '';
      }
      let next: LettersState = clone(state);
      next.answers[playerId] = clean;
      next.submitted[playerId] = true;
      if (next.players.every((id) => next.submitted[id])) {
        next = finishRound(next, now);
      } else if (!next.firstDone) {
        next.firstDone = true;
        next.endsAt = Math.min(next.endsAt, now + next.opts.firstDoneMs);
      }
      return { ok: true, state: next };
    },

    tick(state, now) {
      if (state.phase === 'answering' && now >= state.endsAt) return finishRound(clone(state), now);
      if (state.phase === 'result' && now >= state.endsAt) {
        if (state.round >= state.opts.rounds) {
          return { ...clone(state), phase: 'final', endsAt: 0, ver: state.ver + 1 };
        }
        const letter = pickLetter(state.usedLetters, rng);
        return {
          ...clone(state),
          round: state.round + 1,
          letter,
          usedLetters: [...state.usedLetters, letter],
          phase: 'answering',
          endsAt: now + state.opts.answerMs,
          firstDone: false,
          submitted: Object.fromEntries(state.players.map((id) => [id, false])),
          answers: {},
          results: null,
          ver: state.ver + 1,
        };
      }
      return state;
    },

    view(state, playerId, now) {
      const showResults = state.phase !== 'answering';
      return {
        game: 'letters',
        ver: state.ver,
        serverNow: now,
        round: state.round,
        rounds: state.opts.rounds,
        letter: state.letter,
        phase: state.phase,
        endsAt: state.endsAt,
        categories: CATEGORIES,
        submitted: state.submitted,
        youSubmitted: !!state.submitted[playerId],
        // إجابات الآخرين لا تُرسل أبداً أثناء الإجابة
        results: showResults ? state.results : null,
        totals: showResults ? state.totals : null,
      };
    },

    botAction(state, botId, now): BotPlan<LettersAction> | null {
      if (state.phase !== 'answering' || state.submitted[botId] || !state.players.includes(botId)) return null;
      const entry = DICT[state.letter];
      const answers: Record<string, string> = {};
      for (const c of CATEGORIES) {
        const options = entry?.[c.id as CategoryId] ?? [];
        // الكمبيوتر يترك الخانة فاضية أحياناً، وما يجاوب إلا بكلمة من قاموسه
        answers[c.id] = options.length && rng() < 0.85 ? options[Math.floor(rng() * options.length)] : '';
      }
      const room = Math.max(2000, state.endsAt - now - 3000);
      return { action: { type: 'submit', answers }, delayMs: 4000 + Math.floor(rng() * Math.min(room, 18_000)) };
    },

    outcome: (s) => topOf(s.totals),
    isOver: (state) => state.phase === 'final',
    version: (state) => state.ver,
  };
}
