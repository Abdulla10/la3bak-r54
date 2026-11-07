import { compareKey, isArabicWord, normalizeArabic } from './arabic.js';
import { CODE_WORDS } from './codewords-words.js';
import type { ApplyResult, BotPlan, Engine, EngineOpts, GameInfo, PlayerRef } from './types.js';
import { clone, shuffle, type Rng } from './util.js';

export type Team = 0 | 1;
/** 0 و1 فريقين، 2 محايدة، 3 القاتلة */
export type KeyCell = 0 | 1 | 2 | 3;

export interface CwState {
  ver: number;
  opts: { clueMs: number; guessMs: number };
  players: string[];
  teams: Record<string, Team>;
  spymasters: [string, string];
  words: string[];
  key: KeyCell[]; // سرّي إلا لقائدي الفريقين
  revealed: boolean[];
  turn: Team;
  phase: 'clue' | 'guess' | 'final';
  clue: { word: string; num: number } | null;
  guessesLeft: number;
  endsAt: number;
  winner: Team | null;
  reason: 'all' | 'assassin' | 'abandoned' | null;
  idle: number;
  history: { team: Team; clue: string; num: number; picks: { cell: number; kind: KeyCell }[] }[];
}
export type CwAction =
  | { type: 'clue'; word: string; num: number }
  | { type: 'guess'; cell: number }
  | { type: 'pass' };

export const TEAM_NAME = ['الفريق الأزرق', 'الفريق الأحمر'];

export const info: GameInfo = {
  id: 'codewords',
  name: 'شفرة الكلمات',
  icon: '🧩',
  tagline: 'فريقين وقائد يعطي تلميح',
  description: 'فريقين يتنافسون على كشف كلماتهم السرية من اللوحة، بتلميح واحد من قائد الفريق.',
  minPlayers: 4,
  maxPlayers: 8,
  defaultSeats: 4,
  supportsBots: false,
  status: 'available',
  categories: ['party', 'words'],
  idea: 'لوحة من 25 كلمة. قائد كل فريق يعرف أي الكلمات لفريقه، ويعطي تلميح من كلمة وحدة ورقم. أعضاء الفريق يخمّنون الكلمات.',
  howToStart: 'لازم أربعة لاعبين على الأقل (مع الأصدقاء بس). اللعبة توزّع الفريقين وتختار قائد لكل فريق عشوائياً.',
  howToWin: 'الفريق اللي يكشف كل كلماته أولاً يفوز. وإذا كشف فريقك الكلمة القاتلة تخسر مباشرة.',
};

const remaining = (s: CwState, t: Team) => s.key.filter((k, i) => k === t && !s.revealed[i]).length;

export function checkClue(wordsOnBoard: string[], revealed: boolean[], raw: unknown): string | null {
  if (typeof raw !== 'string') return 'التلميح كلمة وحدة بحروف عربية.';
  return checkNormalizedClue(wordsOnBoard, revealed, normalizeArabic(raw));
}

function checkNormalizedClue(wordsOnBoard: string[], revealed: boolean[], w: string): string | null {
  if (!w) return 'اكتب التلميح.';
  if (w.includes(' ') || !isArabicWord(w) || w.length < 2 || w.length > 20) return 'التلميح كلمة وحدة بحروف عربية.';
  const k = compareKey(w);
  for (let i = 0; i < wordsOnBoard.length; i++) {
    if (revealed[i]) continue;
    const b = compareKey(wordsOnBoard[i]);
    if (k === b || (k.length >= 3 && b.length >= 3 && (k.includes(b) || b.includes(k)))) {
      return 'التلميح ما يصير يشبه كلمة من اللوحة.';
    }
  }
  return null;
}

function endTurn(s: CwState, now: number) {
  s.turn = (1 - s.turn) as Team;
  s.phase = 'clue';
  s.clue = null;
  s.guessesLeft = 0;
  s.endsAt = now + s.opts.clueMs;
}

function win(s: CwState, t: Team, reason: 'all' | 'assassin' | 'abandoned' | null) {
  s.phase = 'final';
  s.winner = t;
  s.reason = reason;
  s.endsAt = 0;
}

export function createCodewordsEngine(rng: Rng = Math.random): Engine<CwState, CwAction> {
  return {
    info,
    init(players: PlayerRef[], now: number, opts?: EngineOpts): CwState {
      if (players.length < 4) throw new Error('codewords needs 4 players');
      const clueMs = (opts?.clueMs ?? 30_000) * 3;
      const guessMs = (opts?.turnMs ?? 30_000) * 4;
      const order = shuffle(players.map((p) => p.id), rng);
      const teams: Record<string, Team> = {};
      order.forEach((id, i) => (teams[id] = (i % 2) as Team));
      const spymasters: [string, string] = [order[0], order[1]];
      const first = (rng() < 0.5 ? 0 : 1) as Team;
      const key: KeyCell[] = shuffle<KeyCell>(
        [...Array(9).fill(first), ...Array(8).fill(1 - first), ...Array(7).fill(2), 3] as KeyCell[],
        rng,
      );
      return {
        ver: 1, opts: { clueMs, guessMs }, players: order, teams, spymasters,
        words: shuffle(CODE_WORDS, rng).slice(0, 25), key, revealed: Array(25).fill(false), turn: first, phase: 'clue',
        clue: null, guessesLeft: 0, endsAt: now + clueMs, winner: null, reason: null, idle: 0, history: [],
      };
    },
    apply(state, playerId, action, now): ApplyResult<CwState> {
      if (!state.players.includes(playerId)) return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
      if (!action || typeof action !== 'object') return { ok: false, error: 'حركة غير معروفة.' };
      if (state.phase === 'final') return { ok: false, error: 'اللعبة انتهت.' };
      if (now >= state.endsAt) return { ok: false, error: 'انتهى الوقت.' };
      const team = state.teams[playerId];
      if (team !== state.turn) return { ok: false, error: 'مو دور فريقك.' };
      const isSpy = state.spymasters[team] === playerId;
      const s = clone(state);
      if (action.type === 'clue') {
        if (s.phase !== 'clue') return { ok: false, error: 'مو وقت التلميح.' };
        if (!isSpy) return { ok: false, error: 'التلميح للقائد بس.' };
        const raw = action.word;
        if (typeof raw !== 'string') return { ok: false, error: 'التلميح كلمة وحدة بحروف عربية.' };
        const word = normalizeArabic(raw);
        const err = checkNormalizedClue(s.words, s.revealed, word);
        if (err) return { ok: false, error: err };
        const num = action.num;
        if (!Number.isInteger(num) || num < 1 || num > 9) return { ok: false, error: 'الرقم من 1 إلى 9.' };
        s.clue = { word, num };
        s.guessesLeft = num + 1;
        s.phase = 'guess';
        s.endsAt = now + s.opts.guessMs;
        s.idle = 0;
        s.history.push({ team, clue: word, num, picks: [] });
        s.ver++;
        return { ok: true, state: s };
      }
      if (action.type === 'guess') {
        if (s.phase !== 'guess') return { ok: false, error: 'استنى تلميح القائد.' };
        if (isSpy) return { ok: false, error: 'القائد ما يخمّن.' };
        const c = action.cell;
        if (!Number.isInteger(c) || c < 0 || c > 24) return { ok: false, error: 'كلمة غير صالحة.' };
        if (s.revealed[c]) return { ok: false, error: 'هذي الكلمة انكشفت.' };
        s.revealed[c] = true;
        s.idle = 0;
        const kind = s.key[c];
        s.history[s.history.length - 1].picks.push({ cell: c, kind });
        s.ver++;
        if (kind === 3) {
          win(s, (1 - team) as Team, 'assassin');
          return { ok: true, state: s };
        }
        if (remaining(s, 0) === 0) return { ok: true, state: (win(s, 0, 'all'), s) };
        if (remaining(s, 1) === 0) return { ok: true, state: (win(s, 1, 'all'), s) };
        if (kind === team) {
          s.guessesLeft--;
          if (s.guessesLeft > 0) {
            s.endsAt = now + s.opts.guessMs;
            return { ok: true, state: s };
          }
        }
        endTurn(s, now);
        return { ok: true, state: s };
      }
      if (action.type === 'pass') {
        if (s.phase !== 'guess') return { ok: false, error: 'ما تقدر تنهي الدور قبل التلميح.' };
        if (isSpy) return { ok: false, error: 'القائد ما ينهي الدور.' };
        if (s.history[s.history.length - 1].picks.length === 0) return { ok: false, error: 'خمّن كلمة وحدة على الأقل.' };
        endTurn(s, now);
        s.ver++;
        return { ok: true, state: s };
      }
      return { ok: false, error: 'حركة غير معروفة.' };
    },
    tick(state, now) {
      if (state.phase === 'final' || now < state.endsAt) return state;
      const s = clone(state);
      s.idle++;
      s.ver++;
      if (s.idle >= 4) {
        // أربع مهل متتالية بدون حركة: نوقف اللعبة بدل ما تعلق للأبد
        s.phase = 'final';
        s.winner = null;
        s.reason = 'abandoned';
        s.endsAt = 0;
        return s;
      }
      endTurn(s, now);
      return s;
    },
    view(state, playerId, now) {
      const team = state.teams[playerId] as Team;
      const isSpy = state.spymasters.includes(playerId);
      const showKey = isSpy || state.phase === 'final';
      return {
        game: 'codewords', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt,
        words: state.words, revealed: state.revealed,
        // المفتاح كامل للقادة فقط، وللبقية يظهر لون الكلمات المكشوفة بس
        key: state.key.map((k, i) => (showKey || state.revealed[i] ? k : null)),
        teams: state.teams, spymasters: state.spymasters, players: state.players,
        turn: state.turn, clue: state.clue, guessesLeft: state.guessesLeft,
        left: [remaining(state, 0), remaining(state, 1)], winner: state.winner, reason: state.reason,
        youTeam: team ?? null, youSpy: isSpy, history: state.history.slice(-6),
      };
    },
    botAction(): BotPlan<CwAction> | null {
      return null;
    },
    outcome: (s) => ({ winners: s.winner === null ? [] : s.players.filter((p) => s.teams[p] === s.winner) }),
    isOver: (s) => s.phase === 'final',
    version: (s) => s.ver,
  };
}
