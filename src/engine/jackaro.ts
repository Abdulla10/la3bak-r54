import type { ApplyResult, BotPlan, Engine, EngineOpts, GameInfo, PlayerRef } from './types.js';
import { clone, shuffle, type Rng } from './util.js';
import { emit, eventsView, newLog, type EventLog } from './events.js';

/**
 * جاكارو (على قواعد اللعبة المعروفة): 4 لاعبين في فريقين متقابلين (أو لاعبين اثنين ضد بعض).
 * كل لاعب 4 كرات. اللوحة دائرة من 76 خانة (19 لكل ربع)، ولكل مقعد خانة بداية. بعد دورة كاملة تدخل الكرة «منطقة الأمان» (4 خانات).
 * «التقدم» لكل كرة: -1 = في البيت، 0..75 = على الدائرة (0 = خانة بدايتك)، 76..79 = في منطقة الأمان.
 *
 * القواعد المطبّقة (والمصادر اللي اختلفت فيها نختار الأكثر اتفاقاً، والاختيارات موثقة في README):
 *  - A: تطلّع كرة من البيت، أو تمشي 1 أو 11.   K: تطلّع كرة من البيت فقط.
 *  - 2 3 6 8 9 10 و Q(12): تمشي كرة للأمام بقيمة الورقة.
 *  - 4: كرة من كراتك ترجع 4 خانات (ما تدخل ولا تطلع من منطقة الأمان).
 *  - 5: تحرّك أي كرة على الدائرة 5 خانات للأمام (كرتك أو كرة شريكك أو كرة خصم).
 *  - 7: تمشي كرة 7 خانات، أو تقسّمها على كرتين من كراتك (مثلاً 3 + 4). كل جزء لازم يكون حركة قانونية.
 *  - J: تبدّل كرة من كراتك على الدائرة بأي كرة ثانية على الدائرة (حتى كرة شريكك). التبديل ما يكسر.
 *  - النزول فوق كرة (خصم أو شريك) يرجّعها للبيت. كرة واقفة على خانة بدايتها ما تنكسر ولا تنعدّى ولا تتبدّل.
 *  - ما تقدر تعدّي كرة من لونك. منطقة الأمان بالعدد المضبوط وتتعبّى من الأبعد للأقرب، وكرات الأمان ما تتحرك ولا تنكسر.
 *  - إذا ما عندك حركة تتخلص من ورقة وحدة بدورك (تحتفظ بباقي أوراقك دايماً).
 *  - لما توصل كل كراتك الأربع للأمان، أوراقك تحرّك كرات شريكك.
 *  - الفريق اللي توصل كل كراته للأمان يفوز.
 */
export const QUARTER = 19; // خانات كل ربع (مطابق للوحة المرجع: 19 × 4 = 76)
export const RING = QUARTER * 4;
export const LANE_START = RING;
export const LANE_END = RING + 3;
const HAND = 4;

export type MoveKind = 'enter' | 'move' | 'back' | 'swap';
export interface Ref {
  owner: number; // رقم اللاعب في مصفوفة players
  marble: number;
}
export interface Move {
  card: number; // رقم الورقة في يدك، -1 = الجزء الثاني من سبعة مقسومة
  kind: MoveKind;
  owner: number; // صاحب الكرة المتحركة (غالباً أنت، أو شريكك لو خلصت كراتك، أو أي أحد لو ورقة 5)
  marble: number;
  to: number; // التقدم الجديد للكرة
  steps?: number;
  split?: boolean; // أول جزء من سبعة مقسومة
  target?: Ref; // للتبديل
  captures?: Ref[];
}

export interface JkState {
  ver: number;
  opts: { turnMs: number };
  players: string[];
  seats: number[];
  marbles: number[][];
  deck: number[];
  hands: number[][];
  turn: number;
  phase: 'playing' | 'final';
  endsAt: number;
  winTeam: number | null;
  missed: number[];
  out: boolean[];
  last: { by: number; rank: number; kind: MoveKind | 'discard' | 'timeout' | 'fold'; captured: number } | null;
  deals: number;
  split: { owner: number; from: number; left: number } | null;
  /** سجل الأحداث للعرض فقط (اختياري لتوافق الحالات المحفوظة قديماً) */
  ev?: EventLog;
}
export type JkAction =
  | { type: 'play'; card: number; owner: number; marble: number; to: number; target?: Ref }
  | { type: 'discard'; card: number };

export const info: GameInfo = {
  id: 'jackaro',
  name: 'جاكارو',
  icon: '🎴',
  tagline: 'فريقين، أوراق وكرات ومطاردة على اللوحة',
  description: 'جاكارو الأصلية: 4 لاعبين في فريقين، أوراق خاصة (A K J 4 5 7)، كسر كرات الخصوم، وأول فريق يوصل كل كراته للأمان.',
  minPlayers: 2,
  maxPlayers: 4,
  defaultSeats: 4,
  supportsBots: true,
  status: 'available',
  categories: ['board'],
  idea: 'لكل لاعب أربع كرات وأربع أوراق. اللاعبين المتقابلين شركاء. تلعب ورقة وتحرّك فيها، وإذا نزلت فوق كرة ترجع للبيت.',
  howToStart: 'المضيف ينشئ غرفة (4 لاعبين فريقين، أو لاعبين اثنين ضد بعض) ويرسل الرمز، أو يلعب مع الكمبيوتر وشريكه كمبيوتر. الأوراق توزّع تلقائياً.',
  howToWin:
    'الفريق اللي توصل كل كراته للأمان يفوز. A تطلّع كرة أو تمشي 1 أو 11. K تطلّع كرة. J تبدّل كرتك بأي كرة على اللوحة. 4 ترجّع كرة 4 خانات. 5 تحرّك أي كرة 5 خانات. 7 تمشيها أو تقسمها على كرتين. Q تمشي 12. والباقي بقيمتها. إذا خلصت كراتك تلعب بكرات شريكك.',
};

export const startOf = (s: Pick<JkState, 'seats'>, pi: number) => s.seats[pi] * QUARTER;
/** رقم الخانة على الدائرة لتقدّم معيّن (null لو مو على الدائرة) */
export const absOf = (s: Pick<JkState, 'seats'>, pi: number, prog: number): number | null =>
  prog >= 0 && prog < RING ? (startOf(s, pi) + prog) % RING : null;
/** فريق اللاعب: في لعبة الأربعة الفريق = رقم اللاعب % 2، وإلا كل لاعب لحاله */
export const teamOf = (s: Pick<JkState, 'players'>, pi: number) => (s.players.length === 4 ? pi % 2 : pi);
const sameTeam = (s: JkState, a: number, b: number) => teamOf(s, a) === teamOf(s, b);
const laneCount = (s: JkState, pi: number) => s.marbles[pi].filter((p) => p >= LANE_START).length;
const finished = (s: JkState, pi: number) => laneCount(s, pi) === 4;
/** مين تتحكم بكراته أوراق هذا اللاعب: كراته، أو كرات شريكه لو خلّص كل كراته */
export const controlled = (s: JkState, pi: number) => (s.players.length === 4 && finished(s, pi) ? (pi + 2) % 4 : pi);

function newDeck(rng: Rng): number[] {
  const d: number[] = [];
  for (let r = 1; r <= 13; r++) for (let k = 0; k < 4; k++) d.push(r);
  return shuffle(d, rng);
}

function seatsFor(n: number): number[] {
  return n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n);
}

/** مين واقف على خانة من الدائرة */
function occupant(s: JkState, abs: number): Ref | null {
  for (let o = 0; o < s.players.length; o++) {
    for (let m = 0; m < 4; m++) if (absOf(s, o, s.marbles[o][m]) === abs) return { owner: o, marble: m };
  }
  return null;
}
const protectedRef = (s: JkState, r: Ref) => s.marbles[r.owner][r.marble] === 0;

/** مشي كرة للأمام. يرجع null لو ما تصير. */
function forward(s: JkState, owner: number, m: number, steps: number, allowLane: boolean): { to: number; captures: Ref[] } | null {
  const from = s.marbles[owner][m];
  if (from < 0 || from >= RING) return null; // في البيت، أو في الأمان (ما تتحرك)
  const to = from + steps;
  if (to > LANE_END) return null;
  if (!allowLane && to >= RING) return null;
  const mine = s.marbles[owner];
  let captures: Ref[] = [];
  for (let p = from + 1; p <= to; p++) {
    if (mine.some((q, i) => i !== m && q === p)) return null; // ما تعدّي كرتك
    if (p < RING) {
      const occ = occupant(s, (s.seats[owner] * QUARTER + p) % RING);
      if (occ && occ.owner !== owner) {
        if (protectedRef(s, occ)) return null;
        if (p === to) captures = [occ];
      }
    }
  }
  // منطقة الأمان تتعبّى من الأبعد للأقرب (وإلا تسكّر الكرة الأولى الطريق على الباقي)
  if (to >= LANE_START) for (let q = to + 1; q <= LANE_END; q++) if (!mine.includes(q)) return null;
  return { to, captures };
}

function backward(s: JkState, owner: number, m: number, steps: number): { to: number; captures: Ref[] } | null {
  const from = s.marbles[owner][m];
  if (from < steps || from >= RING) return null;
  const to = from - steps;
  const mine = s.marbles[owner];
  let captures: Ref[] = [];
  for (let p = from - 1; p >= to; p--) {
    if (mine.some((q, i) => i !== m && q === p)) return null;
    const occ = occupant(s, (s.seats[owner] * QUARTER + p) % RING);
    if (occ && occ.owner !== owner) {
      if (protectedRef(s, occ)) return null;
      if (p === to) captures = [occ];
    }
  }
  return { to, captures };
}

const FORWARD_RANKS: Record<number, number[]> = { 1: [1, 11], 2: [2], 3: [3], 6: [6], 8: [8], 9: [9], 10: [10], 12: [12] };

/** أجزاء الحركة بعد تطبيق جزء من سبعة مقسومة: هل فيه كرة ثانية تكمّل الباقي؟ */
function completions(s: JkState, owner: number, exceptMarble: number, left: number): Move[] {
  const out: Move[] = [];
  for (let m = 0; m < 4; m++) {
    if (m === exceptMarble) continue;
    const f = forward(s, owner, m, left, true);
    if (f) out.push({ card: -1, kind: 'move', owner, marble: m, to: f.to, steps: left, captures: f.captures });
  }
  return out;
}

function applyBoard(s: JkState, mv: Move) {
  if (mv.kind === 'swap' && mv.target) {
    const a = s.marbles[mv.owner][mv.marble];
    const b = s.marbles[mv.target.owner][mv.target.marble];
    const absA = absOf(s, mv.owner, a)!;
    const absB = absOf(s, mv.target.owner, b)!;
    s.marbles[mv.owner][mv.marble] = (absB - startOf(s, mv.owner) + RING) % RING;
    s.marbles[mv.target.owner][mv.target.marble] = (absA - startOf(s, mv.target.owner) + RING) % RING;
    return;
  }
  s.marbles[mv.owner][mv.marble] = mv.to;
  for (const c of mv.captures ?? []) s.marbles[c.owner][c.marble] = -1;
}

/** كل الحركات القانونية للاعب (حسب أوراق يده) */
export function legalMoves(s: JkState, pi: number): Move[] {
  if (s.out[pi]) return [];
  const ci = controlled(s, pi);
  if (s.split) {
    if (s.split.owner !== ci) return [];
    return completions(s, ci, s.split.from, s.split.left);
  }
  const out: Move[] = [];
  s.hands[pi].forEach((rank, card) => {
    // ---- كرات المتحكَّم فيه ----
    for (let m = 0; m < 4; m++) {
      const p = s.marbles[ci][m];
      if (rank === 1 || rank === 13) {
        if (p === -1) {
          const mine = s.marbles[ci];
          if (!mine.includes(0)) {
            const occ = occupant(s, startOf(s, ci));
            out.push({ card, kind: 'enter', owner: ci, marble: m, to: 0, captures: occ ? [occ] : [] });
          }
        }
      }
      for (const st of FORWARD_RANKS[rank] ?? []) {
        const f = forward(s, ci, m, st, true);
        if (f) out.push({ card, kind: 'move', owner: ci, marble: m, to: f.to, steps: st, captures: f.captures });
      }
      if (rank === 5) {
        const f = forward(s, ci, m, 5, true);
        if (f) out.push({ card, kind: 'move', owner: ci, marble: m, to: f.to, steps: 5, captures: f.captures });
      }
      if (rank === 4) {
        const b = backward(s, ci, m, 4);
        if (b) out.push({ card, kind: 'back', owner: ci, marble: m, to: b.to, steps: 4, captures: b.captures });
      }
      if (rank === 7) {
        for (let a = 1; a <= 7; a++) {
          const f = forward(s, ci, m, a, true);
          if (!f) continue;
          if (a === 7) {
            out.push({ card, kind: 'move', owner: ci, marble: m, to: f.to, steps: 7, captures: f.captures });
            continue;
          }
          // جزء من تقسيم: لازم يكون فيه كرة ثانية تكمّل الباقي
          const probe = clone(s);
          applyBoard(probe, { card, kind: 'move', owner: ci, marble: m, to: f.to, captures: f.captures });
          if (completions(probe, ci, m, 7 - a).length) {
            out.push({ card, kind: 'move', owner: ci, marble: m, to: f.to, steps: a, split: true, captures: f.captures });
          }
        }
      }
      if (rank === 11 && p >= 1 && p < RING) {
        for (let o = 0; o < s.players.length; o++) {
          if (o === ci || s.out[o]) continue;
          for (let t = 0; t < 4; t++) {
            const q = s.marbles[o][t];
            if (q < 1 || q >= RING) continue;
            const myNew = (absOf(s, o, q)! - startOf(s, ci) + RING) % RING;
            out.push({ card, kind: 'swap', owner: ci, marble: m, to: myNew, target: { owner: o, marble: t } });
          }
        }
      }
    }
    // ---- ورقة 5: أي كرة على الدائرة ----
    if (rank === 5) {
      for (let o = 0; o < s.players.length; o++) {
        if (o === ci || s.out[o]) continue;
        for (let t = 0; t < 4; t++) {
          const q = s.marbles[o][t];
          if (q < 1 || q >= RING) continue;
          const f = forward(s, o, t, 5, false);
          if (f) out.push({ card, kind: 'move', owner: o, marble: t, to: f.to, steps: 5, captures: f.captures });
        }
      }
    }
  });
  return out;
}

function deal(s: JkState, rng: Rng) {
  const need = s.players.filter((_, i) => !s.out[i]).length * HAND;
  if (s.deck.length < need) s.deck = newDeck(rng);
  s.players.forEach((_, i) => {
    s.hands[i] = s.out[i] ? [] : s.deck.splice(0, HAND);
  });
  s.deals++;
  emit(s, { type: 'deal', n: s.deals, counts: s.hands.map((h) => h.length) });
}

/** يجهّز اللاعب الحالي: يعيد التوزيع لو خلصت الأوراق، ويتخطى من ما عنده أوراق أو لازم ترمي أوراقه */
function settle(s: JkState, rng: Rng, now: number, advanceFirst: boolean) {
  let first = advanceFirst;
  for (let guard = 0; guard < 400; guard++) {
    if (s.hands.every((h, i) => h.length === 0 || s.out[i])) deal(s, rng);
    if (first) {
      for (let k = 1; k <= s.players.length; k++) {
        const i = (s.turn + k) % s.players.length;
        if (!s.out[i] && s.hands[i].length > 0) {
          s.turn = i;
          break;
        }
      }
      first = false;
    }
    const pi = s.turn;
    if (s.out[pi] || s.hands[pi].length === 0) {
      first = true;
      continue;
    }
    break;
  }
  s.endsAt = now + s.opts.turnMs;
  emit(s, { type: 'turn', turn: s.turn });
}

const teamDone = (s: JkState, t: number) => s.players.every((_, i) => teamOf(s, i) !== t || finished(s, i));

function checkWin(s: JkState): boolean {
  const teams = new Set(s.players.map((_, i) => teamOf(s, i)));
  for (const t of teams) {
    if (teamDone(s, t)) {
      emit(s, { type: 'win', team: t });
      s.phase = 'final';
      s.winTeam = t;
      s.endsAt = 0;
      return true;
    }
  }
  return false;
}

function execute(s: JkState, pi: number, mv: Move, rng: Rng, now: number) {
  const rank = mv.card >= 0 ? s.hands[pi][mv.card] : 7;
  // نسجّل المواضع قبل التطبيق (للعرض فقط)
  const from = s.marbles[mv.owner][mv.marble];
  const capFrom = (mv.captures ?? []).map((c) => s.marbles[c.owner][c.marble]);
  const tgt = mv.target;
  const tgtFrom = tgt ? s.marbles[tgt.owner][tgt.marble] : -1;
  applyBoard(s, mv);
  if (mv.kind === 'swap' && tgt) {
    emit(s, { type: 'swap', by: pi, rank, a: { owner: mv.owner, marble: mv.marble, from, to: s.marbles[mv.owner][mv.marble] }, b: { owner: tgt.owner, marble: tgt.marble, from: tgtFrom, to: s.marbles[tgt.owner][tgt.marble] } });
  } else {
    emit(s, { type: 'move', by: pi, rank, kind: mv.kind, owner: mv.owner, marble: mv.marble, from, to: mv.to, steps: mv.steps ?? null, split: !!mv.split, part2: mv.card < 0 });
    (mv.captures ?? []).forEach((c, i) => emit(s, { type: 'capture', by: pi, owner: c.owner, marble: c.marble, from: capFrom[i] }));
  }
  if (mv.card >= 0) s.hands[pi].splice(mv.card, 1);
  s.last = { by: pi, rank, kind: mv.kind, captured: mv.captures?.length ?? 0 };
  s.missed[pi] = 0;
  s.ver++;
  if (mv.split) {
    s.split = { owner: mv.owner, from: mv.marble, left: 7 - (mv.steps ?? 0) };
    s.endsAt = now + s.opts.turnMs; // نفس اللاعب يكمّل الجزء الثاني
    return;
  }
  s.split = null;
  if (checkWin(s)) return;
  settle(s, rng, now, true);
}

function discard(s: JkState, pi: number, card: number, rng: Rng, now: number, timeout = false) {
  const rank = s.hands[pi][card];
  s.hands[pi].splice(card, 1);
  emit(s, { type: 'discard', by: pi, rank, timeout });
  s.last = { by: pi, rank, kind: timeout ? 'timeout' : 'discard', captured: 0 };
  s.ver++;
  settle(s, rng, now, true);
}

const isInt = (n: unknown): n is number => Number.isInteger(n);

export function createJackaroEngine(rng: Rng = Math.random): Engine<JkState, JkAction> {
  const sameMove = (a: Move, act: Extract<JkAction, { type: 'play' }>) =>
    a.card === act.card && a.owner === act.owner && a.marble === act.marble && a.to === act.to &&
    (a.kind !== 'swap' || (a.target?.owner === act.target?.owner && a.target?.marble === act.target?.marble));

  /** تقييم تقريبي لحركة، يستعمله الكمبيوتر */
  const rate = (s: JkState, pi: number, mv: Move): number => {
    let v = rng();
    const mine = sameTeam(s, mv.owner, pi);
    const from = s.marbles[mv.owner][mv.marble];
    for (const c of mv.captures ?? []) v += sameTeam(s, c.owner, pi) ? -90 : 45 + s.marbles[c.owner][c.marble] * 0.3;
    if (mv.kind === 'enter') v += 30;
    else if (mv.kind === 'move') {
      const d = mv.to - from;
      v += mine ? d * 0.8 + (mv.to >= LANE_START ? 30 : 0) : -d * 0.8;
    } else if (mv.kind === 'back') v -= 12;
    else if (mv.kind === 'swap' && mv.target) {
      const gain = mv.to - from;
      const tFrom = s.marbles[mv.target.owner][mv.target.marble];
      const tNew = (absOf(s, mv.owner, from)! - startOf(s, mv.target.owner) + RING) % RING;
      const tGain = tNew - tFrom;
      v += gain * 0.8 + (sameTeam(s, mv.target.owner, pi) ? tGain * 0.5 : -tGain * 0.5);
    }
    if (mv.split) v -= 2;
    return v;
  };

  return {
    info,
    init(players: PlayerRef[], now: number, opts?: EngineOpts): JkState {
      if (players.length < 2 || players.length > 4) throw new Error('jackaro needs 2-4 players');
      const ids = shuffle(players.map((p) => p.id), rng);
      const s: JkState = {
        ver: 1, opts: { turnMs: Math.max(opts?.turnMs ?? 30_000, 20_000) }, players: ids, seats: seatsFor(ids.length),
        marbles: ids.map(() => [-1, -1, -1, -1]), deck: newDeck(rng), hands: ids.map(() => []), turn: 0, phase: 'playing',
        endsAt: 0, winTeam: null, missed: ids.map(() => 0), out: ids.map(() => false), last: null, deals: 0, split: null, ev: newLog(),
      };
      deal(s, rng);
      settle(s, rng, now, false);
      return s;
    },
    apply(state, playerId, action, now): ApplyResult<JkState> {
      const pi = state.players.indexOf(playerId);
      if (pi < 0) return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
      if (!action || typeof action !== 'object') return { ok: false, error: 'حركة غير معروفة.' };
      if (state.phase !== 'playing') return { ok: false, error: 'اللعبة انتهت.' };
      if (state.turn !== pi) return { ok: false, error: 'مو دورك.' };
      if (now >= state.endsAt) return { ok: false, error: 'انتهى وقت دورك.' };
      const moves = legalMoves(state, pi);
      const s = clone(state);
      if (action.type === 'discard') {
        if (moves.length) return { ok: false, error: 'عندك حركة ممكنة، لازم تلعبها.' };
        if (!isInt(action.card) || action.card < 0 || action.card >= s.hands[pi].length) return { ok: false, error: 'ورقة غير صالحة.' };
        discard(s, pi, action.card, rng, now);
        return { ok: true, state: s };
      }
      if (action.type !== 'play') return { ok: false, error: 'حركة غير معروفة.' };
      if (![action.card, action.owner, action.marble, action.to].every(isInt)) return { ok: false, error: 'حركة غير صالحة.' };
      const mv = moves.find((m) => sameMove(m, action));
      if (!mv) return { ok: false, error: 'هذي الحركة ما تصير.' };
      execute(s, pi, mv, rng, now);
      return { ok: true, state: s };
    },
    tick(state, now) {
      if (state.phase !== 'playing' || now < state.endsAt) return state;
      const s = clone(state);
      const pi = s.turn;
      s.missed[pi]++;
      emit(s, { type: 'timeout', by: pi, missed: s.missed[pi] });
      if (s.missed[pi] >= 3) {
        emit(s, { type: 'out', by: pi });
        // طلع من اللعبة بعد ثلاث مرات فات دوره فيها
        s.out[pi] = true;
        s.marbles[pi] = [-1, -1, -1, -1];
        s.hands[pi] = [];
        s.split = null;
        s.ver++;
        const left = s.players.map((_, i) => i).filter((i) => !s.out[i]);
        if (s.players.length === 4) {
          // فريق نقص لاعب ما يقدر يوصل كل كراته: الفريق الثاني يفوز
          emit(s, { type: 'win', team: 1 - teamOf(s, pi) });
          s.phase = 'final';
          s.winTeam = 1 - teamOf(s, pi);
          s.endsAt = 0;
        } else if (left.length === 1) {
          emit(s, { type: 'win', team: teamOf(s, left[0]) });
          s.phase = 'final';
          s.winTeam = teamOf(s, left[0]);
          s.endsAt = 0;
        } else settle(s, rng, now, true);
        return s;
      }
      const moves = legalMoves(s, pi);
      const keep = s.missed[pi];
      if (moves.length) execute(s, pi, moves[Math.floor(rng() * moves.length)], rng, now);
      else discard(s, pi, Math.floor(rng() * s.hands[pi].length), rng, now, true);
      s.missed[pi] = keep;
      return s;
    },
    view(state, playerId, now) {
      const pi = state.players.indexOf(playerId);
      const mine = pi === state.turn && state.phase === 'playing';
      const moves = mine ? legalMoves(state, pi) : [];
      return {
        game: 'jackaro', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, turnMs: state.opts.turnMs, players: state.players,
        seats: state.seats, teams: state.players.map((_, i) => teamOf(state, i)), marbles: state.marbles, turnId: state.players[state.turn],
        out: state.out, ctl: pi >= 0 ? controlled(state, pi) : -1,
        // أوراقك بس. للباقين نرسل عددها
        hand: pi >= 0 ? state.hands[pi] : [], handCounts: state.hands.map((h) => h.length),
        moves, canDiscard: mine && moves.length === 0, split: state.split, last: state.last,
        winTeam: state.winTeam, winners: state.winTeam === null ? [] : state.players.filter((_, i) => teamOf(state, i) === state.winTeam),
        home: state.players.map((_, i) => laneCount(state, i)), deckLeft: state.deck.length,
        ...eventsView(state),
      };
    },
    botAction(state, botId): BotPlan<JkAction> | null {
      const pi = state.players.indexOf(botId);
      if (state.phase !== 'playing' || state.turn !== pi) return null;
      const moves = legalMoves(state, pi);
      if (!moves.length) {
        return { action: { type: 'discard', card: Math.floor(rng() * state.hands[pi].length) }, delayMs: 1200 + Math.floor(rng() * 1200) };
      }
      let best = moves[0];
      let bv = -Infinity;
      for (const m of moves) {
        const v = rate(state, pi, m);
        if (v > bv) { bv = v; best = m; }
      }
      return {
        action: { type: 'play', card: best.card, owner: best.owner, marble: best.marble, to: best.to, ...(best.target ? { target: best.target } : {}) },
        delayMs: 1200 + Math.floor(rng() * 1500),
      };
    },
    isOver: (s) => s.phase === 'final',
    outcome: (s) => ({
      winners: s.winTeam === null ? [] : s.players.filter((_, i) => teamOf(s, i) === s.winTeam),
      scores: Object.fromEntries(s.players.map((p, i) => [p, laneCount(s, i)])),
    }),
    version: (s) => s.ver,
  };
}
