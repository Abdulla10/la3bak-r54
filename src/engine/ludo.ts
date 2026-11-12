import type { ApplyResult, BotPlan, Engine, EngineOpts, GameInfo, PlayerRef } from './types.js';
import { clone, shuffle, type Rng } from './util.js';
import { emit, eventsView, newLog, type EventLog } from './events.js';

/**
 * لودو الكلاسيكية: 2 إلى 4 لاعبين، لكل لاعب 4 قطع.
 * «التقدم» لكل قطعة: -1 = في البيت، 0..50 = على الدائرة (0 = خانة بدايتك)، 51..55 = ممر الأمان، 56 = وصلت النهاية.
 *  - الزهر يرميه الخادم (ما يتلاعب فيه أحد). تطلع القطعة من البيت برقم 6 فقط.
 *  - 6، أو كسر قطعة، أو وصول قطعة للنهاية = دور إضافي. ثلاث ستات ورا بعض = يضيع الدور.
 *  - النزول فوق قطعة خصم يرجّعها للبيت، إلا لو الخانة آمنة (خانات البداية والخانات المنجمة).
 *  - النهاية بالرقم المضبوط. أول لاعب توصل قطعه الأربع يفوز.
 */
export const RING = 52;
export const FINISH = 56;
export const LANE_START = 51;
const SAFE_OFFSETS = [0, 8];

export interface LudoState {
  ver: number;
  turnMs: number;
  players: string[];
  seats: number[];
  tokens: number[][];
  turn: number;
  phase: 'roll' | 'move' | 'final';
  roll: number | null;
  sixes: number;
  endsAt: number;
  winner: number | null;
  missed: number[];
  out: boolean[];
  /** سجل الأحداث للعرض فقط (اختياري لتوافق الحالات المحفوظة قديماً) */
  ev?: EventLog;
  /** R108: الوضع — classic (افتراضي) / quick / magic */
  variant?: LudoVariant;
  /** R108 سريع: كم قطعة توصل عشان تفوز، ومين فتح طريق النهاية (بكسر قطعة خصم) */
  goal?: number;
  unlocked?: boolean[];
  /** R108 سحري: الأغراض على الدائرة (abs = رقم الخانة) + اللاعب المجمّد يضيع دوره الجاي */
  items?: LudoItem[];
  frozen?: boolean[];
  last: { by: number; roll: number; kind: 'roll' | 'move' | 'enter' | 'capture' | 'finish' | 'nomove' | 'triple' | 'timeout' | 'item'; token?: number; item?: LudoItemKind } | null;
}
export type LudoVariant = 'classic' | 'quick' | 'magic';
export type LudoItemKind = 'dice' | 'rocket' | 'portal' | 'bomb' | 'ice';
export interface LudoItem { abs: number; kind: LudoItemKind }
export type LudoAction = { type: 'roll' } | { type: 'move'; token: number };
export interface LudoMove { token: number; to: number; kind: 'enter' | 'move' | 'finish'; captures: { owner: number; token: number }[] }

export const info: GameInfo = {
  id: 'ludo',
  name: 'لودو',
  icon: '🎲',
  tagline: 'ارمِ الزهر ووصّل قطعك الأربع للنهاية',
  description: 'لودو الكلاسيكية: من 2 إلى 4 لاعبين، زهر، قطع تنكسر وترجع للبيت، وأول واحد يوصّل قطعه كلها يفوز.',
  minPlayers: 2,
  maxPlayers: 4,
  defaultSeats: 4,
  supportsBots: true,
  status: 'available',
  categories: ['board'],
  idea: 'لكل لاعب أربع قطع. ترمي الزهر وتحرك قطعة بعدد النقاط. 6 تطلّع قطعة من البيت وتعطيك دور إضافي.',
  howToStart: 'أنشئ غرفة من قسم لودو، أو ابحث عن لاعبين، أو العب ضد الكمبيوتر. ما تحتاج تجهّز شي.',
  howToWin: 'أول لاعب توصل قطعه الأربع للنهاية (بالرقم المضبوط) يفوز. النزول فوق قطعة خصم يرجّعها للبيت، وخانات النجمة والبداية آمنة.',
  variants: ['quick', 'magic'],
};

export const seatsFor = (n: number): number[] => (n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n));
export const absOf = (s: Pick<LudoState, 'seats'>, pi: number, prog: number): number | null =>
  prog >= 0 && prog <= 50 ? (s.seats[pi] * 13 + prog) % RING : null;
export const isSafeAbs = (abs: number) => SAFE_OFFSETS.includes(abs % 13);
const isInt = (n: unknown): n is number => Number.isInteger(n);

export function legalMoves(s: LudoState, pi: number): LudoMove[] {
  if (s.phase !== 'move' || s.roll === null) return [];
  const out: LudoMove[] = [];
  s.tokens[pi].forEach((p, t) => {
    let to: number;
    if (p === -1) {
      // R108 سريع: القطعة تطلع بـ 1 أو 6
      if (!(s.roll === 6 || (s.variant === 'quick' && s.roll === 1))) return;
      to = 0;
    } else if (p === FINISH) return;
    else {
      to = p + s.roll!;
      if (to > FINISH) return;
      // R108 سريع: طريق النهاية مقفول لين تكسر قطعة خصم
      if (s.variant === 'quick' && !s.unlocked?.[pi] && to > 50) return;
    }
    const abs = absOf(s, pi, to);
    const caps: { owner: number; token: number }[] = [];
    if (abs !== null && !isSafeAbs(abs)) {
      s.players.forEach((_, o) => {
        if (o === pi) return;
        s.tokens[o].forEach((q, k) => { if (absOf(s, o, q) === abs) caps.push({ owner: o, token: k }); });
      });
    }
    out.push({ token: t, to, kind: p === -1 ? 'enter' : to === FINISH ? 'finish' : 'move', captures: caps });
  });
  return out;
}

/* ---------- R108: الوضع السحري ---------- */
const ITEM_SET: LudoItemKind[] = ['portal', 'portal', 'portal', 'portal', 'rocket', 'rocket', 'dice', 'dice', 'bomb', 'bomb', 'ice', 'ice'];
const freeCell = (s: LudoState, abs: number) => !isSafeAbs(abs) && abs % 13 !== 12 && !(s.items ?? []).some((i) => i.abs === abs);
function placeItems(rng: Rng): LudoItem[] {
  // نوزّع الأغراض بشكل متناظر على الأرباع الأربعة (3 لكل ربع) عشان ما يستفيد لاعب أكثر من غيره
  const offs = [3, 5, 10]; const kinds = shuffle(ITEM_SET.slice(), rng); const out: LudoItem[] = [];
  for (let q = 0; q < 4; q++) offs.forEach((o, k) => out.push({ abs: q * 13 + o, kind: kinds[q * 3 + k] }));
  return out;
}
function respawn(s: LudoState, kind: LudoItemKind, rng: Rng) {
  for (let i = 0; i < 40; i++) { const a = Math.floor(rng() * RING); if (freeCell(s, a) && !s.tokens.some((ts, o) => ts.some((q) => absOf(s, o, q) === a))) { s.items!.push({ abs: a, kind }); return; } }
}

function nextTurn(s: LudoState, now: number, bonus: boolean) {
  if (!bonus) {
    for (let k = 1; k <= s.players.length; k++) {
      const i = (s.turn + k) % s.players.length;
      if (s.out[i]) continue;
      // R108 سحري: اللاعب المجمّد يضيع هالدور مرة وحدة
      if (s.frozen?.[i] && s.players.filter((_, j) => !s.out[j]).length > 1) { s.frozen[i] = false; emit(s, { type: 'frozen', by: i }); continue; }
      s.turn = i; break;
    }
    s.sixes = 0;
  }
  s.phase = 'roll';
  s.roll = null;
  s.endsAt = now + s.turnMs;
  s.ver++;
  emit(s, { type: 'turn', turn: s.turn, bonus });
}

function doRoll(s: LudoState, pi: number, rng: Rng, now: number) {
  const r = 1 + Math.floor(rng() * 6);
  s.roll = r;
  s.ver++;
  // «ورا بعض»: أي رقم غير 6 يقطع السلسلة (حتى لو جاك بونص من كسر/وصول)
  s.sixes = r === 6 ? s.sixes + 1 : 0;
  emit(s, { type: 'roll', by: pi, roll: r, sixes: s.sixes });
  if (s.sixes >= 3) { emit(s, { type: 'triple', by: pi }); s.last = { by: pi, roll: r, kind: 'triple' }; nextTurn(s, now, false); return; }
  s.phase = 'move';
  s.last = { by: pi, roll: r, kind: 'roll' };
  const moves = legalMoves(s, pi);
  if (!moves.length) { emit(s, { type: 'nomove', by: pi, roll: r }); s.last = { by: pi, roll: r, kind: 'nomove' }; nextTurn(s, now, false); return; }
  s.endsAt = now + s.turnMs;
}

const capturesAt = (s: LudoState, pi: number, prog: number) => {
  const abs = absOf(s, pi, prog); const caps: { owner: number; token: number }[] = [];
  if (abs === null || isSafeAbs(abs)) return caps;
  s.players.forEach((_, o) => { if (o !== pi) s.tokens[o].forEach((q, k) => { if (absOf(s, o, q) === abs) caps.push({ owner: o, token: k }); }); });
  return caps;
};
function doMove(s: LudoState, pi: number, mv: LudoMove, now: number, rng: Rng = Math.random) {
  const roll = s.roll!;
  const from = s.tokens[pi][mv.token];
  let to = mv.to, captures = mv.captures, extra = false, item: LudoItemKind | undefined;
  // R108 سحري: الغرض اللي تنزل عليه يشتغل
  if (s.variant === 'magic' && s.items) {
    const abs = absOf(s, pi, to); const hit = abs === null ? -1 : s.items.findIndex((x) => x.abs === abs);
    if (hit >= 0) {
      const it = s.items[hit]; item = it.kind;
      if (it.kind === 'rocket') to = Math.min(to + 6, 50);
      else if (it.kind === 'portal') { const ahead = s.items.filter((x) => x.kind === 'portal' && x !== it).map((x) => (x.abs - s.seats[pi] * 13 + RING) % RING).filter((pr) => pr > to && pr <= 50).sort((a, b) => a - b); if (ahead.length) to = ahead[0]; }
      else if (it.kind === 'bomb') to = -1;
      else if (it.kind === 'ice') { (s.frozen ??= s.players.map(() => false))[pi] = true; }
      else if (it.kind === 'dice') extra = true;
      if (it.kind !== 'portal') { s.items.splice(hit, 1); respawn(s, it.kind, rng); }
      captures = to >= 0 ? capturesAt(s, pi, to) : [];
      emit(s, { type: 'item', by: pi, token: mv.token, item: it.kind, at: mv.to, to });
    }
  }
  const capFrom = captures.map((c) => s.tokens[c.owner][c.token]);
  s.tokens[pi][mv.token] = to;
  for (const c of captures) s.tokens[c.owner][c.token] = -1;
  if (captures.length && s.variant === 'quick' && s.unlocked && !s.unlocked[pi]) { s.unlocked[pi] = true; emit(s, { type: 'unlock', by: pi }); }
  const fin = to === FINISH;
  const kind = captures.length ? 'capture' : item ? 'item' : fin ? 'finish' : mv.kind === 'enter' ? 'enter' : 'move';
  s.last = { by: pi, roll, kind, token: mv.token, ...(item ? { item } : {}) };
  emit(s, { type: 'move', by: pi, token: mv.token, from, to: mv.to, kind: mv.kind, roll });
  captures.forEach((c, i) => emit(s, { type: 'capture', by: pi, owner: c.owner, token: c.token, from: capFrom[i] }));
  const goal = s.goal ?? 4;
  if (s.tokens[pi].filter((p) => p === FINISH).length >= goal) { emit(s, { type: 'win', winner: pi }); s.phase = 'final'; s.winner = pi; s.endsAt = 0; s.roll = null; s.ver++; return; }
  nextTurn(s, now, roll === 6 || captures.length > 0 || fin || extra);
}

export function createLudoEngine(rng: Rng): Engine<LudoState, LudoAction> {
  const rate = (s: LudoState, pi: number, m: LudoMove) => {
    let v = 0;
    const from = s.tokens[pi][m.token];
    if (m.kind === 'finish') v += 100;
    v += m.captures.length * 80 + m.captures.reduce((a, c) => a + s.tokens[c.owner][c.token], 0) * 0.5;
    if (m.kind === 'enter') v += 45;
    if (m.to >= LANE_START) v += 25;
    const abs = absOf(s, pi, m.to);
    if (abs !== null && isSafeAbs(abs)) v += 15;
    if (s.variant === 'quick' && !s.unlocked?.[pi]) v += m.captures.length * 60;
    const it = abs === null ? undefined : s.items?.find((x) => x.abs === abs);
    if (it) v += it.kind === 'bomb' ? -120 : it.kind === 'ice' ? -25 : it.kind === 'rocket' ? 30 : it.kind === 'dice' ? 35 : 20;
    // قطعة معرّضة قبل الحركة: نهرّبها
    const fa = absOf(s, pi, from);
    if (fa !== null && !isSafeAbs(fa)) v += 10;
    v += (m.to - from) * 0.3 + from * 0.1;
    return v + rng() * 2;
  };
  return {
    info,
    init(players: PlayerRef[], now: number, opts?: EngineOpts): LudoState {
      if (players.length < 2 || players.length > 4) throw new Error('ludo needs 2-4 players');
      const ids = shuffle(players.map((p) => p.id), rng);
      const turnMs = Math.max(opts?.turnMs ?? 30_000, 15_000);
      const variant: LudoVariant = opts?.variant === 'quick' || opts?.variant === 'magic' ? opts.variant : 'classic';
      const st: LudoState = {
        ver: 1, turnMs, players: ids, seats: seatsFor(ids.length), tokens: ids.map(() => [-1, -1, -1, -1]), turn: 0, phase: 'roll', roll: null, sixes: 0,
        endsAt: now + turnMs, winner: null, missed: ids.map(() => 0), out: ids.map(() => false), last: null, ev: newLog(),
      };
      if (variant === 'quick') { st.variant = 'quick'; st.goal = 2; st.unlocked = ids.map(() => false); st.tokens = ids.map(() => [0, -1, -1, -1]); }
      if (variant === 'magic') { st.variant = 'magic'; st.items = placeItems(rng); st.frozen = ids.map(() => false); }
      return st;
    },
    apply(state, playerId, action, now): ApplyResult<LudoState> {
      const pi = state.players.indexOf(playerId);
      if (pi < 0) return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
      if (!action || typeof action !== 'object') return { ok: false, error: 'حركة غير معروفة.' };
      if (state.phase === 'final') return { ok: false, error: 'اللعبة انتهت.' };
      if (state.turn !== pi) return { ok: false, error: 'مو دورك.' };
      if (now >= state.endsAt) return { ok: false, error: 'انتهى وقت دورك.' };
      const s = clone(state);
      s.missed[pi] = 0;
      if (action.type === 'roll') {
        if (s.phase !== 'roll') return { ok: false, error: 'اختر قطعة تحركها.' };
        doRoll(s, pi, rng, now);
        return { ok: true, state: s };
      }
      if (action.type === 'move') {
        if (s.phase !== 'move') return { ok: false, error: 'ارمِ الزهر أول.' };
        if (!isInt(action.token)) return { ok: false, error: 'حركة غير صالحة.' };
        const mv = legalMoves(s, pi).find((m) => m.token === action.token);
        if (!mv) return { ok: false, error: 'هذي القطعة ما تتحرك بهذا الرقم.' };
        doMove(s, pi, mv, now, rng);
        return { ok: true, state: s };
      }
      return { ok: false, error: 'حركة غير معروفة.' };
    },
    tick(state, now) {
      if (state.phase === 'final' || now < state.endsAt) return state;
      const s = clone(state);
      const pi = s.turn;
      s.missed[pi]++;
      emit(s, { type: 'timeout', by: pi, missed: s.missed[pi] });
      if (s.missed[pi] >= 3) {
        emit(s, { type: 'out', by: pi, lost: s.tokens[pi].slice() });
        s.out[pi] = true;
        s.tokens[pi] = [-1, -1, -1, -1];
        const left = s.players.map((_, i) => i).filter((i) => !s.out[i]);
        if (left.length === 1) { emit(s, { type: 'win', winner: left[0] }); s.phase = 'final'; s.winner = left[0]; s.endsAt = 0; s.ver++; return s; }
        nextTurn(s, now, false);
        return s;
      }
      const keep = s.missed[pi];
      if (s.phase === 'roll') doRoll(s, pi, rng, now);
      if (s.phase === 'move') {
        const moves = legalMoves(s, pi);
        if (moves.length) doMove(s, pi, moves[Math.floor(rng() * moves.length)], now, rng);
      }
      s.missed[pi] = keep;
      return s;
    },
    view(state, playerId, now) {
      const pi = state.players.indexOf(playerId);
      const mine = pi === state.turn && state.phase !== 'final';
      return {
        game: 'ludo', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, players: state.players, seats: state.seats,
        tokens: state.tokens, turnId: state.players[state.turn], roll: state.roll, last: state.last, out: state.out,
        canRoll: mine && state.phase === 'roll', moves: mine && state.phase === 'move' ? legalMoves(state, pi) : [],
        winner: state.winner === null ? null : state.players[state.winner],
        done: state.tokens.map((t) => t.filter((p) => p === FINISH).length),
        variant: state.variant ?? 'classic', goal: state.goal ?? 4, unlocked: state.unlocked ?? null, items: state.items ?? null, frozen: state.frozen ?? null,
        ...eventsView(state),
      };
    },
    botAction(state, botId): BotPlan<LudoAction> | null {
      const pi = state.players.indexOf(botId);
      if (state.phase === 'final' || state.turn !== pi) return null;
      if (state.phase === 'roll') return { action: { type: 'roll' }, delayMs: 900 + Math.floor(rng() * 800) };
      const moves = legalMoves(state, pi);
      if (!moves.length) return null;
      let best = moves[0], bv = -Infinity;
      for (const m of moves) { const v = rate(state, pi, m); if (v > bv) { bv = v; best = m; } }
      return { action: { type: 'move', token: best.token }, delayMs: 900 + Math.floor(rng() * 900) };
    },
    isOver: (s) => s.phase === 'final',
    outcome: (s) => ({ winners: s.winner === null ? [] : [s.players[s.winner]], scores: Object.fromEntries(s.players.map((p, i) => [p, s.tokens[i].filter((x) => x === FINISH).length])) }),
    version: (s) => s.ver,
  };
}
