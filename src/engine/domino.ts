import type { ApplyResult, BotPlan, Engine, EngineOpts, GameInfo, PlayerRef } from './types.js';
import { clone, shuffle, type Rng } from './util.js';
import { emit, eventsView, newLog, type EventLog } from './events.js';

/**
 * دومينو «السحب» (Draw Dominoes) بطقم دبل-6 (28 قطعة)، من 2 إلى 4 لاعبين، كل لاعب 7 قطع والباقي مخزن.
 * القواعد المطبّقة (الخادم هو المرجع):
 *  - الجولة الأولى (أو بعد جولة متعادلة): يبدأ صاحب أعلى دبل ويفتح به إلزامياً؛ لو ما فيه دبل عند أحد يفتح صاحب أعلى قطعة بمجموع النقاط.
 *    الجولات التالية: يبدأ فائز الجولة السابقة بأي قطعة.
 *  - تلعب قطعة يطابق أحد نصفيها طرف المسار (يمين أو يسار). ما عندك قطعة مناسبة؟ تسحب من المخزن قطعة قطعة حتى تقدر تلعب.
 *  - المخزن فاضي وما عندك حركة؟ يمرّر الخادم دورك تلقائياً.
 *  - تنتهي الجولة لما يخلّص لاعب قطعه (يقفل) أو تنسد اللعبة (ما أحد يقدر يلعب والمخزن فاضي).
 *  - النقاط: الفائز بالجولة ياخذ مجموع نقاط القطع اللي بأيدي خصومه. بالانسداد يفوز صاحب أقل مجموع، وتعادل الأقل = جولة بدون نقاط.
 *  - المباراة لمن يوصل 50 نقطة أول (الرقم ظاهر في الفيديو المرجعي «0/50»). حد أمان: 20 جولة ثم الأعلى نقاطاً.
 *  - مهلة الدور: عند انتهائها يلعب الخادم حركة قانونية (أو يسحب/يمرّر)، وثلاث مهلات ورا بعض = انسحاب من المباراة.
 */
export const MAX_PIP = 6;
export const HAND_SIZE = 7;
export const TARGET = 50;
export const MAX_ROUNDS = 20;
export const ROUND_PAUSE_MS = 6_000;

export type Tile = [number, number];
export type End = 'L' | 'R';
/** قطعة على الطاولة. t = [الداخل، الخارج] للأطراف، و[يسار، يمين] لأول قطعة. by = اللاعب، n = ترتيب اللعب */
export interface Placed { t: Tile; by: number; n: number }
export interface RoundResult {
  kind: 'domino' | 'blocked' | 'tie' | 'forfeit';
  winner: number | null;
  points: number;
  pips: number[];
  hands: Tile[][];
}
export interface DominoState {
  ver: number;
  turnMs: number;
  target: number;
  players: string[];
  scores: number[];
  round: number;
  hands: Tile[][];
  stock: Tile[];
  first: Placed | null;
  left: Placed[];
  right: Placed[];
  turn: number;
  phase: 'play' | 'roundEnd' | 'final';
  endsAt: number;
  /** القطعة الإلزامية للفتح (الجولة الأولى) أو null */
  opening: string | null;
  missed: number[];
  out: boolean[];
  nPlaced: number;
  last: { by: number; kind: 'play' | 'draw' | 'pass' | 'timeout' | 'out'; tile?: string; end?: End } | null;
  result: RoundResult | null;
  /** فائز الجولة السابقة (يبدأ الجولة التالية) */
  lead: number | null;
  winner: number | null;
  ev?: EventLog;
}
export type DominoAction = { type: 'play'; tile: string; end: End } | { type: 'draw' };
export interface DominoMove { tile: string; end: End }

export const info: GameInfo = {
  id: 'domino',
  name: 'دومينو',
  icon: '🁣',
  tagline: 'طابق الأرقام وقفّل قطعك قبل خصمك',
  description: 'دومينو السحب بطقم دبل-6: طابق نصف القطعة مع طرف المسار، اسحب من المخزن لو ما عندك قطعة، وأول من يوصل 50 نقطة يفوز.',
  minPlayers: 2,
  maxPlayers: 4,
  defaultSeats: 2,
  supportsBots: true,
  status: 'available',
  categories: ['board'],
  idea: 'كل لاعب عنده 7 قطع. بدورك تحط قطعة يطابق رقمها أحد طرفي المسار. ما عندك قطعة مناسبة؟ اسحب من المخزن.',
  howToStart: 'أنشئ غرفة من صفحة الدومينو، أو العب ضد الكمبيوتر. صاحب أعلى دبل يفتح أول جولة.',
  howToWin: 'اللي يخلّص قطعه أول ياخذ مجموع نقاط قطع خصومه. لو انسدت اللعبة يفوز صاحب أقل مجموع. أول من يوصل 50 نقطة يفوز بالمباراة.',
};

export const idOf = (t: Tile) => `${Math.min(t[0], t[1])}-${Math.max(t[0], t[1])}`;
export const pipsOf = (t: Tile) => t[0] + t[1];
const isDouble = (t: Tile) => t[0] === t[1];
const ID_RE = /^([0-6])-([0-6])$/;
export function fullSet(): Tile[] {
  const s: Tile[] = [];
  for (let a = 0; a <= MAX_PIP; a++) for (let b = a; b <= MAX_PIP; b++) s.push([a, b]);
  return s;
}
/** طرفا المسار الحاليان أو null قبل أول قطعة */
export function endsOf(s: Pick<DominoState, 'first' | 'left' | 'right'>): { L: number; R: number } | null {
  if (!s.first) return null;
  const L = s.left.length ? s.left[s.left.length - 1].t[1] : s.first.t[0];
  const R = s.right.length ? s.right[s.right.length - 1].t[1] : s.first.t[1];
  return { L, R };
}

export function legalMoves(s: DominoState, pi: number): DominoMove[] {
  if (s.phase !== 'play' || pi < 0 || s.out[pi]) return [];
  const hand = s.hands[pi];
  const ends = endsOf(s);
  if (!ends) {
    // أول قطعة بالجولة: الطرف ما يفرق (نعتمد R)
    const ids = hand.map(idOf);
    return (s.opening ? ids.filter((id) => id === s.opening) : ids).map((tile) => ({ tile, end: 'R' as End }));
  }
  const out: DominoMove[] = [];
  for (const t of hand) {
    const id = idOf(t);
    if (t[0] === ends.L || t[1] === ends.L) out.push({ tile: id, end: 'L' });
    if (t[0] === ends.R || t[1] === ends.R) out.push({ tile: id, end: 'R' });
  }
  return out;
}

const handPips = (h: Tile[]) => h.reduce((a, t) => a + pipsOf(t), 0);

/** من يفتح الجولة: أعلى دبل، وإلا أعلى مجموع (ثم أعلى نصف) */
function opener(hands: Tile[][]): { pi: number; tile: string } {
  let best: { pi: number; t: Tile; rank: number } | null = null;
  hands.forEach((h, pi) => h.forEach((t) => {
    const rank = isDouble(t) ? 1000 + t[0] : pipsOf(t) * 10 + Math.max(t[0], t[1]); // أي دبل يسبق أي قطعة عادية
    if (!best || rank > best.rank) best = { pi, t, rank };
  }));
  const b = best as unknown as { pi: number; t: Tile };
  return { pi: b.pi, tile: idOf(b.t) };
}

const activeIdx = (s: DominoState) => s.players.map((_, i) => i).filter((i) => !s.out[i]);

export function createDominoEngine(rng: Rng, cfg: { target?: number } = {}): Engine<DominoState, DominoAction> {
  const target = cfg.target ?? TARGET;

  function deal(s: DominoState, now: number) {
    const set = shuffle(fullSet(), rng);
    s.hands = s.players.map((_, i) => (s.out[i] ? [] : set.splice(0, HAND_SIZE)));
    s.stock = set;
    s.first = null; s.left = []; s.right = []; s.nPlaced = 0;
    s.result = null;
    s.round++;
    if (s.lead !== null && !s.out[s.lead]) { s.turn = s.lead; s.opening = null; }
    else { const o = opener(s.hands); s.turn = o.pi; s.opening = o.tile; }
    s.phase = 'play';
    s.endsAt = now + s.turnMs;
    s.last = null;
    s.ver++;
    emit(s, { type: 'deal', round: s.round, turn: s.turn, opening: s.opening, stock: s.stock.length });
  }

  function endRound(s: DominoState, kind: 'domino' | 'blocked', who: number | null, now: number) {
    const pips = s.hands.map(handPips);
    let winner = who, points = 0, k: RoundResult['kind'] = kind;
    if (kind === 'blocked') {
      const act = activeIdx(s);
      const min = Math.min(...act.map((i) => pips[i]));
      const low = act.filter((i) => pips[i] === min);
      if (low.length === 1) winner = low[0]; else { winner = null; k = 'tie'; }
    }
    if (winner !== null) points = pips.reduce((a, p, i) => (i === winner ? a : a + p), 0);
    if (winner !== null) s.scores[winner] += points;
    s.result = { kind: k, winner, points, pips, hands: s.hands.map((h) => h.map((t) => [t[0], t[1]] as Tile)) };
    s.lead = winner;
    emit(s, { type: 'round', kind: k, winner, points, scores: s.scores.slice() });
    s.ver++;
    if (winner !== null && s.scores[winner] >= s.target) return finish(s, winner);
    if (s.round >= MAX_ROUNDS) {
      const active = activeIdx(s);
      const top = Math.max(...active.map((i) => s.scores[i]));
      const best = active.filter((i) => s.scores[i] === top);
      return finish(s, best.length === 1 ? best[0] : null);
    }
    s.phase = 'roundEnd';
    s.endsAt = now + ROUND_PAUSE_MS;
  }

  function finish(s: DominoState, w: number | null) {
    s.phase = 'final'; s.winner = w; s.endsAt = 0; s.ver++;
    emit(s, { type: 'win', winner: w, scores: s.scores.slice() });
  }

  /** ينقل الدور للاعب التالي القادر؛ يمرّر تلقائياً من لا يملك حركة والمخزن فاضي، ويكشف الانسداد */
  function advance(s: DominoState, now: number) {
    const n = s.players.length;
    for (let k = 1; k <= n; k++) {
      const i = (s.turn + k) % n;
      if (s.out[i]) continue;
      if (legalMoves(s, i).length || s.stock.length) {
        s.turn = i; s.endsAt = now + s.turnMs; s.ver++;
        emit(s, { type: 'turn', turn: i });
        return;
      }
      emit(s, { type: 'pass', by: i });
      s.last = { by: i, kind: 'pass' };
    }
    endRound(s, 'blocked', null, now);
  }

  function doPlay(s: DominoState, pi: number, mv: DominoMove, now: number) {
    const hand = s.hands[pi];
    const idx = hand.findIndex((t) => idOf(t) === mv.tile);
    const t = hand[idx];
    hand.splice(idx, 1);
    const ends = endsOf(s);
    s.nPlaced++;
    if (!ends) s.first = { t: [t[0], t[1]], by: pi, n: s.nPlaced };
    else {
      const e = mv.end === 'L' ? ends.L : ends.R;
      const oriented: Tile = t[0] === e ? [t[0], t[1]] : [t[1], t[0]];
      (mv.end === 'L' ? s.left : s.right).push({ t: oriented, by: pi, n: s.nPlaced });
    }
    s.opening = null;
    s.last = { by: pi, kind: 'play', tile: mv.tile, end: ends ? mv.end : undefined };
    emit(s, { type: 'play', by: pi, tile: mv.tile, end: ends ? mv.end : null, n: s.nPlaced, left: hand.length });
    s.ver++;
    if (!hand.length) return endRound(s, 'domino', pi, now);
    advance(s, now);
  }

  function doDraw(s: DominoState, pi: number, now: number) {
    const t = s.stock.pop()!;
    s.hands[pi].push(t);
    s.last = { by: pi, kind: 'draw' };
    emit(s, { type: 'draw', by: pi, stock: s.stock.length }); // القطعة نفسها ما تنكشف للبقية
    s.endsAt = now + s.turnMs;
    s.ver++;
    if (!legalMoves(s, pi).length && !s.stock.length) advance(s, now);
  }

  /** حركة تلقائية (مهلة/كمبيوتر): أثقل قطعة قانونية، والدبل أولى عند التساوي */
  const bestMove = (s: DominoState, pi: number, noise = 0): DominoMove | null => {
    const moves = legalMoves(s, pi);
    let best: DominoMove | null = null, bv = -Infinity;
    for (const m of moves) {
      const [a, b] = m.tile.split('-').map(Number);
      const v = a + b + (a === b ? 3 : 0) + noise * rng();
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  };

  return {
    info,
    init(players: PlayerRef[], now: number, opts?: EngineOpts): DominoState {
      if (players.length < 2 || players.length > 4) throw new Error('domino needs 2-4 players');
      const ids = shuffle(players.map((p) => p.id), rng);
      const turnMs = Math.max(opts?.turnMs ?? 30_000, 15_000);
      const s: DominoState = {
        ver: 0, turnMs, target, players: ids, scores: ids.map(() => 0), round: 0, hands: [], stock: [], first: null, left: [], right: [],
        turn: 0, phase: 'play', endsAt: 0, opening: null, missed: ids.map(() => 0), out: ids.map(() => false), nPlaced: 0, last: null,
        result: null, lead: null, winner: null, ev: newLog(),
      };
      deal(s, now);
      return s;
    },
    apply(state, playerId, action, now): ApplyResult<DominoState> {
      const pi = state.players.indexOf(playerId);
      if (pi < 0) return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
      if (!action || typeof action !== 'object') return { ok: false, error: 'حركة غير معروفة.' };
      if (state.phase === 'final') return { ok: false, error: 'اللعبة انتهت.' };
      if (state.phase === 'roundEnd') return { ok: false, error: 'الجولة انتهت، الجولة الجاية تبدأ بعد شوي.' };
      if (state.out[pi]) return { ok: false, error: 'انسحبت من هذي المباراة.' };
      if (state.turn !== pi) return { ok: false, error: 'مو دورك.' };
      if (now >= state.endsAt) return { ok: false, error: 'انتهى وقت دورك.' };
      const moves = legalMoves(state, pi);
      if (action.type === 'play') {
        const m = typeof action.tile === 'string' ? ID_RE.exec(action.tile) : null;
        if (!m || Number(m[1]) > Number(m[2])) return { ok: false, error: 'قطعة غير صالحة.' };
        if (action.end !== 'L' && action.end !== 'R') return { ok: false, error: 'اختر طرف المسار.' };
        if (!state.hands[pi].some((t) => idOf(t) === action.tile)) return { ok: false, error: 'هذي القطعة مو عندك.' };
        if (!state.first && state.opening && action.tile !== state.opening) return { ok: false, error: `لازم تفتح الجولة بـ ${state.opening.replace('-', '|')}.` };
        const mv = state.first ? moves.find((x) => x.tile === action.tile && x.end === action.end) : moves.find((x) => x.tile === action.tile);
        if (!mv) return { ok: false, error: 'هذي القطعة ما تركب على هذا الطرف.' };
        const s = clone(state);
        s.missed[pi] = 0;
        doPlay(s, pi, mv, now);
        return { ok: true, state: s };
      }
      if (action.type === 'draw') {
        if (moves.length) return { ok: false, error: 'عندك قطعة تقدر تلعبها، ما تقدر تسحب.' };
        if (!state.stock.length) return { ok: false, error: 'المخزن فاضي.' };
        const s = clone(state);
        s.missed[pi] = 0;
        doDraw(s, pi, now);
        return { ok: true, state: s };
      }
      return { ok: false, error: 'حركة غير معروفة.' };
    },
    tick(state, now) {
      if (state.phase === 'final' || now < state.endsAt) return state;
      const s = clone(state);
      if (s.phase === 'roundEnd') { deal(s, now); return s; }
      const pi = s.turn;
      s.missed[pi]++;
      emit(s, { type: 'timeout', by: pi, missed: s.missed[pi] });
      s.last = { by: pi, kind: 'timeout' };
      if (s.missed[pi] >= 3) {
        s.out[pi] = true;
        s.last = { by: pi, kind: 'out' };
        emit(s, { type: 'out', by: pi });
        s.ver++;
        const left = activeIdx(s);
        if (left.length === 1) {
          s.result = { kind: 'forfeit', winner: left[0], points: 0, pips: s.hands.map(handPips), hands: s.hands.map((h) => h.map((t) => [t[0], t[1]] as Tile)) };
          finish(s, left[0]);
          return s;
        }
        advance(s, now);
        return s;
      }
      const keep = s.missed[pi];
      while (!legalMoves(s, pi).length && s.stock.length) {
        const t = s.stock.pop()!;
        s.hands[pi].push(t);
        emit(s, { type: 'draw', by: pi, stock: s.stock.length });
      }
      const mv = bestMove(s, pi);
      if (mv) doPlay(s, pi, mv, now);
      else { s.ver++; advance(s, now); }
      s.missed[pi] = keep;
      return s;
    },
    view(state, playerId, now) {
      const pi = state.players.indexOf(playerId);
      const mine = pi === state.turn && state.phase === 'play' && !state.out[pi];
      const moves = mine ? legalMoves(state, pi) : [];
      return {
        game: 'domino', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, turnMs: state.turnMs,
        players: state.players, turnId: state.players[state.turn], round: state.round, target: state.target, scores: state.scores,
        hand: pi >= 0 ? state.hands[pi].map(idOf) : [], counts: state.hands.map((h) => h.length), stock: state.stock.length,
        first: state.first, left: state.left, right: state.right, ends: endsOf(state), opening: state.opening,
        moves, canDraw: mine && !moves.length && state.stock.length > 0,
        last: state.last, out: state.out, result: state.result, nPlaced: state.nPlaced,
        winner: state.winner === null ? null : state.players[state.winner],
        ...eventsView(state),
      };
    },
    botAction(state, botId): BotPlan<DominoAction> | null {
      const pi = state.players.indexOf(botId);
      if (state.phase !== 'play' || state.turn !== pi || state.out[pi]) return null;
      const mv = bestMove(state, pi, 2);
      if (mv) return { action: { type: 'play', tile: mv.tile, end: mv.end }, delayMs: 900 + Math.floor(rng() * 900) };
      if (state.stock.length) return { action: { type: 'draw' }, delayMs: 600 + Math.floor(rng() * 500) };
      return null;
    },
    isOver: (s) => s.phase === 'final',
    outcome: (s) => ({ winners: s.winner === null ? [] : [s.players[s.winner]], scores: Object.fromEntries(s.players.map((p, i) => [p, s.scores[i]])) }),
    version: (s) => s.ver,
  };
}
