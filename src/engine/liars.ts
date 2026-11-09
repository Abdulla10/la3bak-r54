import type { ApplyResult, BotPlan, Engine, EngineOpts, GameInfo, PlayerRef } from './types.js';
import { clone, shuffle, type Rng } from './util.js';
import { emit, eventsView, newLog, type EventLog } from './events.js';

/**
 * لعبة الكذابين (R68z) — الخادم هو المرجع بكل شي.
 *  - 2 إلى 4 لاعبين. الرزمة 20 ورقة: 6 بنت (Q) و6 شايب (K) و6 إكَه (A) و2 جوكر.
 *  - كل جولة: يتوزع 5 أوراق لكل لاعب حي، وتنقلب «ورقة الطاولة» (بنت أو شايب أو إكَه).
 *  - بدورك: تحط 1 إلى 3 أوراق مقلوبة وتقول إنها ورقة الطاولة (صدق أو كذب)، أو تقول «كذاب!» على اللي قبلك.
 *    الجوكر يحسب دايم ورقة الطاولة.
 *  - «كذاب!»: تنكشف آخر أوراق انحطت. لو فيها ورقة غير ورقة الطاولة والجوكر = اللي حطها كذاب ويروح للقنبلة.
 *    لو كلها صح = اللي قال «كذاب» يروح للقنبلة.
 *  - القنبلة: لكل لاعب قنبلة فيها 6 أسلاك، واحد منها يفجّر (مخفي ومختار عشوائي من بداية اللعبة).
 *    اللي عليه العقاب يقطع سلك (عنده 10 ثواني وإلا ينقطع عنه). لو طلع سلك التفجير = يطلع من اللعبة.
 *    كل ما يقطع سلك تكبر فرصة التفجير المرة الجاية (1/6 ثم 1/5 …).
 *  - بعد كل «كذاب!» تبدأ جولة جديدة. آخر لاعب يبقى حي يفوز.
 *  - لو دورك وما عندك أوراق: لازم تقول «كذاب!» على اللي قبلك (ولو ما فيه شي انحط ينتقل الدور).
 *  - مهلة الدور: الخادم يحط عنك ورقة وحدة عشوائية (أو يقول «كذاب» لو ما عندك).
 */
export type Rank = 'Q' | 'K' | 'A' | 'J';
export interface LCard { id: number; r: Rank }
export const RANKS: readonly Exclude<Rank, 'J'>[] = ['Q', 'K', 'A'];
export const RANK_NAME: Record<Rank, string> = { Q: 'البنت', K: 'الشايب', A: 'الإكَه', J: 'الجوكر' };
export const HAND = 5;
export const WIRES = 6;
export const DEAL_MS = 4_000, REVEAL_MS = 3_200, BOMB_MS = 10_000, RESULT_MS = 3_000;

export interface LiarsState {
  ver: number;
  turnMs: number;
  players: string[];
  bots: boolean[];
  alive: boolean[];
  hands: LCard[][];
  table: Exclude<Rank, 'J'>;
  round: number;
  turn: number;
  phase: 'deal' | 'play' | 'reveal' | 'bomb' | 'result' | 'final';
  endsAt: number;
  pile: number;
  /** آخر أوراق انحطت (مخفية لين أحد يقول كذاب) */
  last: { by: number; cards: LCard[] } | null;
  /** القنبلة: كم سلك انقطع، ورقم سلك التفجير (مخفي) */
  cuts: number[];
  boom: number[];
  /** من عليه العقاب، والكشف */
  reveal: { caller: number; target: number; cards: LCard[]; lied: boolean; loser: number } | null;
  bombResult: { who: number; wire: number; exploded: boolean } | null;
  missed: number[];
  winner: number | null;
  ev?: EventLog;
}
export type LiarsAction = { type: 'play'; cards: number[] } | { type: 'liar' } | { type: 'cut'; wire?: number };

export const info: GameInfo = {
  id: 'liars',
  name: 'الكذابين',
  icon: '💣',
  tagline: 'اكذب بثقة… أو اكشف الكذاب',
  description: 'حط أوراقك مقلوبة وقول إنها ورقة الطاولة. صدق أو كذب؟ اللي ينكشف يقطع سلك من القنبلة، وآخر واحد يبقى يفوز.',
  minPlayers: 2,
  maxPlayers: 4,
  defaultSeats: 4,
  supportsBots: true,
  status: 'available',
  categories: ['party'],
  idea: 'كل لاعب عنده 5 أوراق. بدورك حط 1 إلى 3 أوراق مقلوبة وقول إنها ورقة الطاولة، أو قول «كذاب!» على اللي قبلك.',
  howToStart: 'أنشئ غرفة الكذابين وادعُ أصحابك، أو العب ضد الكمبيوتر. الخادم يوزّع ويختار ورقة الطاولة.',
  howToWin: 'اللي ينكشف كذبه — أو يتهم غلط — يقطع سلك من قنبلته. لو طلع سلك التفجير يطلع من اللعبة. آخر واحد يبقى يفوز.',
};

export function createLiarsEngine(rng: Rng): Engine<LiarsState, LiarsAction> {
  const aliveIdx = (s: LiarsState) => s.players.map((_, i) => i).filter((i) => s.alive[i]);
  const nextAlive = (s: LiarsState, from: number) => { for (let k = 1; k <= s.players.length; k++) { const i = (from + k) % s.players.length; if (s.alive[i]) return i; } return from; };
  const isTrue = (s: LiarsState, c: LCard) => c.r === 'J' || c.r === s.table;

  function deal(s: LiarsState, now: number, starter: number) {
    const deck: LCard[] = []; let id = 0;
    for (const r of RANKS) for (let k = 0; k < 6; k++) deck.push({ id: id++, r });
    deck.push({ id: id++, r: 'J' }, { id: id++, r: 'J' });
    const d = shuffle(deck, rng);
    s.hands = s.players.map((_, i) => (s.alive[i] ? d.splice(0, HAND) : []));
    s.table = RANKS[Math.floor(rng() * RANKS.length)];
    s.round++; s.pile = 0; s.last = null; s.reveal = null; s.bombResult = null;
    s.turn = s.alive[starter] ? starter : nextAlive(s, starter);
    s.phase = 'deal'; s.endsAt = now + DEAL_MS; s.ver++;
    emit(s, { type: 'deal', round: s.round, table: s.table });
  }
  function startTurn(s: LiarsState, i: number, now: number) { s.turn = i; s.phase = 'play'; s.endsAt = now + s.turnMs; s.ver++; }
  /** بعد ما حط أوراق: الدور للي بعده. لو اللي بعده ما عنده أوراق لازم يقول كذاب (يتعامل معه المؤقت/الواجهة) */
  function doPlay(s: LiarsState, pi: number, ids: number[], now: number) {
    const cards = s.hands[pi].filter((c) => ids.includes(c.id));
    s.hands[pi] = s.hands[pi].filter((c) => !ids.includes(c.id));
    s.last = { by: pi, cards }; s.pile += cards.length; s.missed[pi] = 0;
    emit(s, { type: 'play', by: pi, n: cards.length, claim: s.table });
    startTurn(s, nextAlive(s, pi), now);
  }
  function doLiar(s: LiarsState, pi: number, now: number) {
    const l = s.last!; const lied = l.cards.some((c) => !isTrue(s, c));
    const loser = lied ? l.by : pi;
    s.reveal = { caller: pi, target: l.by, cards: l.cards, lied, loser };
    s.phase = 'reveal'; s.endsAt = now + REVEAL_MS; s.ver++; s.missed[pi] = 0;
    emit(s, { type: 'liar', by: pi, target: l.by, lied, loser });
  }
  function doCut(s: LiarsState, wire: number | undefined, now: number) {
    const who = s.reveal!.loser;
    const w = Number.isInteger(wire) && wire! >= 0 && wire! < WIRES ? wire! : Math.floor(rng() * WIRES);
    // السلك المختار ما يغيّر الاحتمال: نفجّر لو هذا رقم القطع اللي يساوي سلك التفجير المخفي
    const exploded = s.cuts[who] === s.boom[who];
    s.cuts[who]++;
    s.bombResult = { who, wire: w, exploded };
    if (exploded) s.alive[who] = false;
    s.phase = 'result'; s.endsAt = now + RESULT_MS; s.ver++;
    emit(s, { type: exploded ? 'boom' : 'safe', by: who, cuts: s.cuts[who] });
  }
  function afterResult(s: LiarsState, now: number) {
    const left = aliveIdx(s);
    if (left.length <= 1) { s.winner = left[0] ?? null; s.phase = 'final'; s.endsAt = now; s.ver++; emit(s, { type: 'win', by: s.winner }); return; }
    const who = s.bombResult!.who;
    deal(s, now, s.alive[who] ? who : nextAlive(s, who));
  }
  /** الحركات القانونية للاعب صاحب الدور */
  const mustCall = (s: LiarsState, pi: number) => s.hands[pi].length === 0 && !!s.last && s.last.by !== pi;
  const canCall = (s: LiarsState, pi: number) => !!s.last && s.last.by !== pi && s.alive[s.last.by] !== undefined;

  return {
    info,
    init(players: PlayerRef[], now: number, opts?: EngineOpts): LiarsState {
      const n = players.length;
      const s: LiarsState = {
        ver: 0, turnMs: Math.min(opts?.turnMs ?? 25_000, 25_000), players: players.map((p) => p.id), bots: players.map((p) => p.bot), alive: players.map(() => true),
        hands: [], table: 'Q', round: 0, turn: 0, phase: 'deal', endsAt: now, pile: 0, last: null,
        cuts: players.map(() => 0), boom: players.map(() => Math.floor(rng() * WIRES)), reveal: null, bombResult: null, missed: players.map(() => 0), winner: null, ev: newLog(),
      };
      deal(s, now, Math.floor(rng() * n));
      emit(s, { type: 'armed' });
      return s;
    },
    apply(state, playerId, action, now): ApplyResult<LiarsState> {
      const pi = state.players.indexOf(playerId);
      if (pi < 0) return { ok: false, error: 'أنت مو لاعب بهالمباراة.' };
      if (!state.alive[pi]) return { ok: false, error: 'طلعت من اللعبة 💥' };
      if (!action || typeof action !== 'object') return { ok: false, error: 'حركة غير صالحة.' };
      if (action.type === 'cut') {
        if (state.phase !== 'bomb' || state.reveal?.loser !== pi) return { ok: false, error: 'مو دورك تقطع السلك.' };
        const s = clone(state); doCut(s, action.wire, now); return { ok: true, state: s };
      }
      if (state.phase !== 'play') return { ok: false, error: 'انتظر شوي…' };
      if (state.turn !== pi) return { ok: false, error: 'مو دورك.' };
      if (action.type === 'liar') {
        if (!canCall(state, pi)) return { ok: false, error: 'ما فيه أوراق تكشفها.' };
        const s = clone(state); doLiar(s, pi, now); return { ok: true, state: s };
      }
      if (action.type === 'play') {
        if (mustCall(state, pi)) return { ok: false, error: 'خلصت أوراقك، لازم تقول «كذاب!».' };
        const ids = Array.isArray(action.cards) ? [...new Set(action.cards)] : [];
        if (ids.length < 1 || ids.length > 3) return { ok: false, error: 'اختر من ورقة لين 3 أوراق.' };
        if (!ids.every((id) => Number.isInteger(id) && state.hands[pi].some((c) => c.id === id))) return { ok: false, error: 'هذي الأوراق مو عندك.' };
        const s = clone(state); doPlay(s, pi, ids, now); return { ok: true, state: s };
      }
      return { ok: false, error: 'حركة غير معروفة.' };
    },
    tick(state, now) {
      if (state.phase === 'final' || now < state.endsAt) return state;
      const s = clone(state);
      if (s.phase === 'deal') { startTurn(s, s.turn, now); return s; }
      if (s.phase === 'reveal') { s.phase = 'bomb'; s.endsAt = now + BOMB_MS; s.ver++; emit(s, { type: 'bomb', by: s.reveal!.loser }); return s; }
      if (s.phase === 'bomb') { doCut(s, undefined, now); return s; }
      if (s.phase === 'result') { afterResult(s, now); return s; }
      // انتهت مهلة الدور
      const pi = s.turn; s.missed[pi]++;
      emit(s, { type: 'timeout', by: pi });
      if (mustCall(s, pi) || (!s.hands[pi].length && s.last)) { doLiar(s, pi, now); return s; }
      if (!s.hands[pi].length) { startTurn(s, nextAlive(s, pi), now); return s; }
      doPlay(s, pi, [s.hands[pi][Math.floor(rng() * s.hands[pi].length)].id], now);
      return s;
    },
    view(state, playerId, now) {
      const pi = state.players.indexOf(playerId);
      const mine = pi >= 0 && state.phase === 'play' && state.turn === pi && state.alive[pi];
      const showReveal = state.phase === 'reveal' || state.phase === 'bomb' || state.phase === 'result';
      return {
        game: 'liars', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, turnMs: state.turnMs,
        players: state.players, you: pi, turnId: state.players[state.turn], round: state.round, table: state.table,
        hand: pi >= 0 ? state.hands[pi] : [], counts: state.hands.map((h) => h.length), alive: state.alive, cuts: state.cuts, wires: WIRES,
        pile: state.pile, last: state.last ? { by: state.players[state.last.by], n: state.last.cards.length } : null,
        canPlay: mine && state.hands[pi].length > 0 && !mustCall(state, pi), canLiar: mine && canCall(state, pi), mustLiar: mine && mustCall(state, pi),
        reveal: showReveal && state.reveal ? { caller: state.players[state.reveal.caller], target: state.players[state.reveal.target], cards: state.reveal.cards, lied: state.reveal.lied, loser: state.players[state.reveal.loser] } : null,
        canCut: state.phase === 'bomb' && state.reveal?.loser === pi,
        bomb: state.phase === 'result' && state.bombResult ? { who: state.players[state.bombResult.who], wire: state.bombResult.wire, exploded: state.bombResult.exploded } : null,
        winner: state.winner === null ? null : state.players[state.winner],
        ...eventsView(state),
      };
    },
    botAction(state, botId): BotPlan<LiarsAction> | null {
      const pi = state.players.indexOf(botId);
      if (pi < 0 || !state.alive[pi]) return null;
      if (state.phase === 'bomb' && state.reveal?.loser === pi) return { action: { type: 'cut', wire: Math.floor(rng() * WIRES) }, delayMs: 2200 + Math.floor(rng() * 1500) };
      if (state.phase !== 'play' || state.turn !== pi) return null;
      const delay = 1400 + Math.floor(rng() * 1600);
      if (mustCall(state, pi)) return { action: { type: 'liar' }, delayMs: delay };
      const hand = state.hands[pi]; const good = hand.filter((c) => c.r === 'J' || c.r === state.table);
      // يشك أكثر لو اللي قبله حط أوراق كثيرة ويده هو فيها أوراق صح كثيرة (يعني الباقي قليل)
      if (state.last && state.last.by !== pi) {
        const n = state.last.cards.length; const outside = 8 - good.length; // 6 من ورقة الطاولة + 2 جوكر
        let p = 0.12 + (n - 1) * 0.16 + (good.length >= 3 ? 0.18 : 0) + (n > outside ? 0.9 : 0);
        if (!hand.length) p = 1;
        if (rng() < Math.min(0.95, p)) return { action: { type: 'liar' }, delayMs: delay };
      }
      if (good.length) { const k = Math.min(good.length, 1 + Math.floor(rng() * Math.min(3, good.length))); return { action: { type: 'play', cards: good.slice(0, k).map((c) => c.id) }, delayMs: delay }; }
      const k = rng() < 0.75 ? 1 : 2; return { action: { type: 'play', cards: shuffle(hand, rng).slice(0, Math.min(k, hand.length)).map((c) => c.id) }, delayMs: delay };
    },
    isOver: (s) => s.phase === 'final',
    outcome: (s) => ({ winners: s.winner === null ? [] : [s.players[s.winner]], scores: Object.fromEntries(s.players.map((p, i) => [p, s.alive[i] ? 1 : 0])) }),
    version: (s) => s.ver,
  };
}
