import type { ApplyResult, BotPlan, Engine, EngineOpts, GameInfo, PlayerRef } from './types.js';
import { clone, shuffle, type Rng } from './util.js';
import { emit, eventsView, newLog, type EventLog } from './events.js';

/**
 * أونو بالقواعد الكلاسيكية الرسمية (بدون قواعد منزلية). الخادم هو المرجع في كل شي.
 *  - 108 ورقة: لكل لون (أحمر/أصفر/أخضر/أزرق) صفر واحد، واثنتان من 1–9، واثنتان من «تخطي» و«عكس» و«+2»؛ و4 «جوكر» و4 «جوكر +4».
 *  - 2 إلى 10 لاعبين، 7 أوراق لكل لاعب. الموزّع يتغيّر كل جولة، ويبدأ اللي بعده.
 *  - أول ورقة بالمرمى: «جوكر +4» ترجع للرزمة وتنخلط؛ «جوكر» = أول لاعب يختار اللون (حركة مستقلة) ثم يلعب؛ «+2» = أول لاعب يسحب 2 ويُتخطّى؛
 *    «تخطي» = أول لاعب يُتخطّى؛ «عكس» = الموزّع يبدأ والاتجاه ينعكس (بلاعبين: يتصرف كتخطي).
 *  - تلعب ورقة تطابق اللون أو الرقم أو الرمز، أو جوكر بأي وقت. «جوكر +4» مسموح دائماً لكن لو عندك ورقة بنفس اللون الحالي
 *    وتحدّاك اللاعب التالي تسحب أنت 4؛ لو التحدي فشل يسحب المتحدّي 6 ويضيع دوره. بدون تحدي: يسحب 4 ويضيع دوره.
 *  - بدل اللعب تقدر تسحب ورقة وحدة؛ لو تنلعب تقدر تلعبها فوراً (هي فقط) أو تمرّر، ولو ما تنلعب ينتقل الدور.
 *  - لما تلعب قبل الأخيرة لازم تعلن «أونو». لو ما أعلنت وكشفك أي لاعب قبل ما يبدأ اللي بعدك دوره: تسحب 2.
 *  - رزمة السحب لما تخلص: يُخلط المرمى (إلا الورقة العلوية) ويصير رزمة جديدة. لو ما بقي شي: ما فيه سحب.
 *  - نهاية الجولة: أول من يخلّص أوراقه (لو آخر ورقة «+2» أو «+4» يسحب التالي قبل الحساب). الفائز ياخذ مجموع أوراق خصومه:
 *    الأرقام بقيمتها، «تخطي/عكس/+2» = 20، «جوكر/جوكر +4» = 50. أول من يوصل 500 يفوز بالمباراة.
 *  - مهلة الدور: الخادم يلعب عنك حركة قانونية (أو يسحب/يمرّر)، وثلاث مهلات ورا بعض = انسحاب (أوراقه ترجع للرزمة).
 */
export const COLORS = ['r', 'y', 'g', 'b'] as const;
export type Color = (typeof COLORS)[number];
export type Val = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'rev' | 'd2' | 'wild' | 'wd4';
export interface Card { id: number; c: Color | 'w'; v: Val }
export const HAND = 7;
export const TARGET = 500;
export const ROUND_PAUSE_MS = 8_000;
export const MAX_ROUNDS = 40;

export interface UnoState {
  ver: number;
  turnMs: number;
  target: number;
  players: string[];
  scores: number[];
  round: number;
  dealer: number;
  hands: Card[][];
  draw: Card[];
  discard: Card[];
  color: Color;
  dir: 1 | -1;
  turn: number;
  phase: 'play' | 'wd4' | 'roundEnd' | 'final';
  endsAt: number;
  /** أول ورقة جوكر: أول لاعب لازم يختار اللون قبل ما يلعب */
  pick: boolean;
  /** ورقة سحبها صاحب الدور وتنلعب: يلعبها أو يمرّر */
  drawn: number | null;
  /** «جوكر +4» بانتظار قرار التالي: من لعبها وهل كان معه لون مطابق (غير قانوني) */
  wd4: { by: number; illegal: boolean } | null;
  /** أعلن أونو (لكل لاعب) — يتصفّر لما يصير عنده أكثر من ورقة */
  said: boolean[];
  /** من لعب قبل الأخيرة بدون إعلان، ونافذة كشفه مفتوحة لين يتحرك اللي بعده */
  exposed: number | null;
  missed: number[];
  out: boolean[];
  last: { by: number; kind: string; card?: Card; n?: number; color?: Color } | null;
  result: { winner: number; points: number; hands: Card[][] } | null;
  winner: number | null;
  ev?: EventLog;
}
export type UnoAction =
  | { type: 'play'; card: number; color?: Color; uno?: boolean }
  | { type: 'draw' }
  | { type: 'pass' }
  | { type: 'uno' }
  | { type: 'catch'; target: string }
  | { type: 'accept' }
  | { type: 'challenge' }
  | { type: 'color'; color: Color };

export const info: GameInfo = {
  id: 'uno',
  name: 'أونو',
  icon: '🃏',
  tagline: 'طابق اللون أو الرقم وخلّص أوراقك أول',
  description: 'أونو الكلاسيكية: 108 ورقة، تخطي وعكس و+2 والجوكر و+4، وإعلان «أونو» قبل آخر ورقة. أول من يوصل 500 نقطة يفوز.',
  minPlayers: 2,
  maxPlayers: 10,
  defaultSeats: 4,
  supportsBots: true,
  status: 'available',
  categories: ['board', 'party'],
  idea: 'كل لاعب عنده 7 أوراق. بدورك العب ورقة تطابق لون أو رقم أو رمز الورقة اللي فوق، أو جوكر. ما عندك؟ اسحب ورقة.',
  howToStart: 'أنشئ غرفة أونو وادعُ أصحابك بالرمز، أو العب ضد الكمبيوتر. الخادم يوزّع ويقلب أول ورقة.',
  howToWin: 'خلّص أوراقك أول وخذ مجموع أوراق خصومك. لا تنسَ «أونو» قبل آخر ورقة! أول من يوصل 500 يفوز.',
};

export function fullDeck(): Card[] {
  const out: Card[] = []; let id = 0;
  for (const c of COLORS) {
    out.push({ id: id++, c, v: '0' });
    for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'rev', 'd2'] as Val[]) { out.push({ id: id++, c, v }); out.push({ id: id++, c, v }); }
  }
  for (let i = 0; i < 4; i++) out.push({ id: id++, c: 'w', v: 'wild' });
  for (let i = 0; i < 4; i++) out.push({ id: id++, c: 'w', v: 'wd4' });
  return out;
}
export const pointsOf = (c: Card) => (c.v === 'wild' || c.v === 'wd4' ? 50 : c.v === 'skip' || c.v === 'rev' || c.v === 'd2' ? 20 : Number(c.v));
const top = (s: UnoState) => s.discard[s.discard.length - 1];
const isWild = (c: Card) => c.c === 'w';
/** قانونية الورقة على المرمى الحالي (جوكر +4 دائماً مسموح شكلياً؛ عقوبته بالتحدي) */
export const canPlay = (s: UnoState, c: Card) => !s.pick && (isWild(c) || c.c === s.color || (top(s).c !== 'w' && c.v === top(s).v));
const activeIdx = (s: UnoState) => s.players.map((_, i) => i).filter((i) => !s.out[i]);
const nextOf = (s: UnoState, from: number, steps = 1) => {
  let i = from;
  for (let k = 0; k < steps; k++) { do { i = (i + s.dir + s.players.length) % s.players.length; } while (s.out[i]); }
  return i;
};

export function legalCards(s: UnoState, pi: number): number[] {
  if (s.phase !== 'play' || s.turn !== pi || s.out[pi]) return [];
  if (s.drawn !== null) { const c = s.hands[pi].find((x) => x.id === s.drawn); return c && canPlay(s, c) ? [c.id] : []; }
  return s.hands[pi].filter((c) => canPlay(s, c)).map((c) => c.id);
}

export function createUnoEngine(rng: Rng, cfg: { target?: number } = {}): Engine<UnoState, UnoAction> {
  const target = cfg.target ?? TARGET;

  /** سحب n ورقة (مع إعادة خلط المرمى عند الحاجة). يرجّع عدد ما انسحب فعلاً */
  function takeCards(s: UnoState, pi: number, n: number): number {
    let got = 0;
    for (let k = 0; k < n; k++) {
      if (!s.draw.length) {
        if (s.discard.length <= 1) break;
        const keep = s.discard.pop()!;
        s.draw = shuffle(s.discard, rng); s.discard = [keep];
        emit(s, { type: 'reshuffle', size: s.draw.length });
      }
      s.hands[pi].push(s.draw.pop()!); got++;
    }
    if (s.hands[pi].length > 1) s.said[pi] = false;
    return got;
  }

  function startTurn(s: UnoState, i: number, now: number) {
    s.turn = i; s.drawn = null; s.endsAt = now + s.turnMs; s.ver++;
    emit(s, { type: 'turn', turn: i });
  }

  function deal(s: UnoState, now: number) {
    s.round++;
    s.dealer = s.round === 1 ? s.dealer : nextOf(s, s.dealer);
    let deck = shuffle(fullDeck(), rng);
    s.hands = s.players.map((_, i) => (s.out[i] ? [] : deck.splice(0, HAND)));
    // أول ورقة: «+4» ترجع للرزمة وتنخلط ونقلب غيرها
    let first = deck.pop()!;
    while (first.v === 'wd4') { deck.unshift(first); deck = shuffle(deck, rng); first = deck.pop()!; }
    s.draw = deck; s.discard = [first];
    s.dir = 1; s.drawn = null; s.wd4 = null; s.exposed = null; s.result = null;
    s.said = s.players.map(() => false);
    s.pick = isWild(first);
    s.color = isWild(first) ? 'r' : (first.c as Color); // مع الجوكر اللون الفعلي يحدده أول لاعب
    s.phase = 'play';
    let start = nextOf(s, s.dealer);
    if (first.v === 'rev') { s.dir = -1; start = activeIdx(s).length === 2 ? nextOf(s, s.dealer) : s.dealer; }
    emit(s, { type: 'deal', round: s.round, dealer: s.dealer, first, color: s.color });
    if (first.v === 'skip' || (first.v === 'rev' && activeIdx(s).length === 2)) start = nextOf(s, start);
    if (first.v === 'd2') { const n = takeCards(s, start, 2); emit(s, { type: 'draw', by: start, n, forced: true }); start = nextOf(s, start); }
    s.last = { by: s.dealer, kind: 'flip', card: first, color: s.color };
    startTurn(s, start, now);
  }

  function finish(s: UnoState, w: number | null) {
    s.phase = 'final'; s.winner = w; s.endsAt = 0; s.ver++;
    emit(s, { type: 'win', winner: w, scores: s.scores.slice() });
  }

  function endRound(s: UnoState, w: number, now: number) {
    const points = s.hands.reduce((a, h, i) => (i === w ? a : a + h.reduce((x, c) => x + pointsOf(c), 0)), 0);
    s.scores[w] += points;
    s.result = { winner: w, points, hands: s.hands.map((h) => h.map((c) => ({ ...c }))) };
    emit(s, { type: 'round', winner: w, points, scores: s.scores.slice() });
    s.ver++;
    if (s.scores[w] >= s.target) return finish(s, w);
    if (s.round >= MAX_ROUNDS) { const best = Math.max(...s.scores); const ws = s.scores.map((v, i) => i).filter((i) => s.scores[i] === best); return finish(s, ws.length === 1 ? ws[0] : null); }
    s.phase = 'roundEnd'; s.endsAt = now + ROUND_PAUSE_MS; s.drawn = null; s.wd4 = null; s.exposed = null;
  }

  /** أي حركة من صاحب الدور الجديد تقفل نافذة كشف من نسي أونو */
  const closeExposure = (s: UnoState) => { if (s.exposed !== null) { s.exposed = null; } };

  function doPlay(s: UnoState, pi: number, card: Card, color: Color | undefined, uno: boolean, now: number) {
    const before = s.color;
    const illegalWd4 = card.v === 'wd4' && s.hands[pi].some((c) => c.id !== card.id && c.c === before);
    s.hands[pi] = s.hands[pi].filter((c) => c.id !== card.id);
    s.discard.push(card);
    s.drawn = null;
    if (uno) s.said[pi] = true;
    s.color = isWild(card) ? color! : (card.c as Color);
    s.last = { by: pi, kind: 'play', card, color: s.color };
    emit(s, { type: 'play', by: pi, card, color: s.color, left: s.hands[pi].length });
    // أونو: قبل الأخيرة بدون إعلان = مكشوف لين يتحرك اللي بعده
    s.exposed = s.hands[pi].length === 1 && !s.said[pi] ? pi : null;
    if (s.hands[pi].length !== 1) s.said[pi] = false;
    const n = activeIdx(s).length;
    if (!s.hands[pi].length) {
      // آخر ورقة: تأثير +2/+4 على التالي قبل الحساب
      const nx = nextOf(s, pi);
      if (card.v === 'd2') takeCards(s, nx, 2);
      if (card.v === 'wd4') takeCards(s, nx, 4);
      return endRound(s, pi, now);
    }
    if (card.v === 'rev') { s.dir = (s.dir * -1) as 1 | -1; if (n === 2) return startTurn(s, pi, now); return startTurn(s, nextOf(s, pi), now); }
    if (card.v === 'skip') return startTurn(s, nextOf(s, pi, 2), now);
    if (card.v === 'd2') { const nx = nextOf(s, pi); const got = takeCards(s, nx, 2); emit(s, { type: 'draw', by: nx, n: got, forced: true }); return startTurn(s, nextOf(s, nx), now); }
    if (card.v === 'wd4') { s.wd4 = { by: pi, illegal: illegalWd4 }; s.phase = 'wd4'; return startTurn(s, nextOf(s, pi), now); }
    startTurn(s, nextOf(s, pi), now);
  }

  /** الكمبيوتر/المهلة: يفضّل غير الجوكر، ثم الأوراق الخاصة لو التالي قرّب يخلص، ولون الجوكر = أكثر لون معه */
  function pick(s: UnoState, pi: number, ids: number[]): { card: Card; color?: Color } | null {
    if (!ids.length) return null;
    const hand = s.hands[pi];
    const cards = hand.filter((c) => ids.includes(c.id));
    const nxLeft = s.hands[nextOf(s, pi)].length;
    const score = (c: Card) => (c.v === 'wd4' ? 1 : c.v === 'wild' ? 2 : ['skip', 'rev', 'd2'].includes(c.v) ? (nxLeft <= 2 ? 9 : 4) : 5) + pointsOf(c) / 100 + rng() * 0.5;
    const card = cards.reduce((a, b) => (score(b) > score(a) ? b : a));
    const counts = COLORS.map((col) => hand.filter((c) => c.c === col && c.id !== card.id).length);
    const color = isWild(card) ? COLORS[counts.indexOf(Math.max(...counts))] : undefined;
    return { card, color };
  }

  function autoTurn(s: UnoState, pi: number, now: number) {
    if (s.pick) { const counts = COLORS.map((col) => s.hands[pi].filter((c) => c.c === col).length); s.color = COLORS[counts.indexOf(Math.max(...counts))]; s.pick = false; emit(s, { type: 'color', by: pi, color: s.color }); }
    if (s.phase === 'wd4') { // قبول تلقائي
      const got = takeCards(s, pi, 4); emit(s, { type: 'draw', by: pi, n: got, forced: true }); s.wd4 = null; s.phase = 'play';
      return startTurn(s, nextOf(s, pi), now);
    }
    let p = pick(s, pi, legalCards(s, pi));
    if (!p && s.drawn === null) {
      const got = takeCards(s, pi, 1); emit(s, { type: 'draw', by: pi, n: got });
      const c = got ? s.hands[pi][s.hands[pi].length - 1] : null;
      if (c && canPlay(s, c)) p = pick(s, pi, [c.id]);
    }
    if (p) return doPlay(s, pi, p.card, p.color, s.hands[pi].length === 2, now);
    emit(s, { type: 'pass', by: pi }); s.last = { by: pi, kind: 'pass' };
    startTurn(s, nextOf(s, pi), now);
  }

  return {
    info,
    init(players: PlayerRef[], now: number, opts?: EngineOpts): UnoState {
      if (players.length < 2 || players.length > 10) throw new Error('uno needs 2-10 players');
      const ids = shuffle(players.map((p) => p.id), rng);
      const turnMs = Math.max(opts?.turnMs ?? 30_000, 15_000);
      const s: UnoState = {
        ver: 0, turnMs, target, players: ids, scores: ids.map(() => 0), round: 0, dealer: Math.floor(rng() * ids.length),
        hands: [], draw: [], discard: [], color: 'r', dir: 1, turn: 0, phase: 'play', endsAt: 0, drawn: null, wd4: null,
        pick: false, said: ids.map(() => false), exposed: null, missed: ids.map(() => 0), out: ids.map(() => false), last: null, result: null, winner: null, ev: newLog(),
      };
      deal(s, now);
      return s;
    },
    apply(state, playerId, action, now): ApplyResult<UnoState> {
      const pi = state.players.indexOf(playerId);
      if (pi < 0) return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
      if (!action || typeof action !== 'object') return { ok: false, error: 'حركة غير معروفة.' };
      if (state.phase === 'final') return { ok: false, error: 'اللعبة انتهت.' };
      if (state.phase === 'roundEnd') return { ok: false, error: 'الجولة انتهت، الجولة الجاية تبدأ بعد شوي.' };
      if (state.out[pi]) return { ok: false, error: 'انسحبت من هذي المباراة.' };
      // حركات خارج الدور: إعلان أونو المتأخر، وكشف من نسي
      if (action.type === 'uno') {
        const hand = state.hands[pi].length;
        const preDeclare = state.turn === pi && state.phase === 'play' && hand === 2;
        if (!(state.exposed === pi || preDeclare)) return { ok: false, error: 'تعلن أونو لما يبقى معك ورقتين بدورك، أو ورقة وحدة قبل ما ينكشف.' };
        if (state.said[pi]) return { ok: false, error: 'أعلنت أونو خلاص.' };
        const s = clone(state); s.said[pi] = true; if (s.exposed === pi) s.exposed = null; s.ver++;
        emit(s, { type: 'uno', by: pi });
        return { ok: true, state: s };
      }
      if (action.type === 'catch') {
        const ti = state.players.indexOf(String(action.target));
        if (ti < 0 || ti === pi) return { ok: false, error: 'لاعب غير صالح.' };
        if (state.exposed !== ti || state.hands[ti].length !== 1 || state.said[ti]) return { ok: false, error: 'ما فيه أحد تقدر تكشفه الحين.' };
        const s = clone(state); s.exposed = null;
        const got = takeCards(s, ti, 2); s.ver++;
        emit(s, { type: 'caught', by: pi, target: ti, n: got });
        s.last = { by: pi, kind: 'catch', n: got };
        return { ok: true, state: s };
      }
      if (state.turn !== pi) return { ok: false, error: 'مو دورك.' };
      if (now >= state.endsAt) return { ok: false, error: 'انتهى وقت دورك.' };
      if (state.pick) {
        if (action.type !== 'color' || !COLORS.includes(action.color)) return { ok: false, error: 'أول ورقة جوكر: اختر اللون أول.' };
        const s = clone(state); s.missed[pi] = 0; s.pick = false; s.color = action.color; s.endsAt = now + s.turnMs; s.ver++;
        emit(s, { type: 'color', by: pi, color: s.color }); s.last = { by: pi, kind: 'color', color: s.color };
        return { ok: true, state: s };
      }
      if (state.phase === 'wd4') {
        if (action.type !== 'accept' && action.type !== 'challenge') return { ok: false, error: 'لعبوا عليك +4: اقبل واسحب 4، أو تحدَّ.' };
        const s = clone(state); s.missed[pi] = 0; closeExposure(s);
        const w = s.wd4!; s.wd4 = null; s.phase = 'play';
        if (action.type === 'accept') {
          const got = takeCards(s, pi, 4); emit(s, { type: 'draw', by: pi, n: got, forced: true }); s.last = { by: pi, kind: 'accept', n: got };
          startTurn(s, nextOf(s, pi), now);
        } else if (w.illegal) {
          const got = takeCards(s, w.by, 4); emit(s, { type: 'challenge', by: pi, target: w.by, won: true, n: got }); s.last = { by: pi, kind: 'challenge-won', n: got };
          startTurn(s, pi, now); // المتحدّي يكمل دوره عادي
        } else {
          const got = takeCards(s, pi, 6); emit(s, { type: 'challenge', by: pi, target: w.by, won: false, n: got }); s.last = { by: pi, kind: 'challenge-lost', n: got };
          startTurn(s, nextOf(s, pi), now);
        }
        return { ok: true, state: s };
      }
      if (action.type === 'play') {
        const card = state.hands[pi].find((c) => c.id === action.card);
        if (!Number.isInteger(action.card) || !card) return { ok: false, error: 'هذي الورقة مو عندك.' };
        if (state.drawn !== null && card.id !== state.drawn) return { ok: false, error: 'بعد السحب تقدر تلعب الورقة اللي سحبتها بس، أو تمرّر.' };
        if (!canPlay(state, card)) return { ok: false, error: 'الورقة ما تطابق اللون ولا الرقم.' };
        if (isWild(card) && !COLORS.includes(action.color as Color)) return { ok: false, error: 'اختر لون الجوكر.' };
        const s = clone(state); s.missed[pi] = 0; closeExposure(s);
        doPlay(s, pi, s.hands[pi].find((c) => c.id === card.id)!, isWild(card) ? action.color : undefined, action.uno === true && state.hands[pi].length === 2, now);
        return { ok: true, state: s };
      }
      if (action.type === 'draw') {
        if (state.drawn !== null) return { ok: false, error: 'سحبت خلاص: العب الورقة أو مرّر.' };
        const s = clone(state); s.missed[pi] = 0; closeExposure(s);
        const got = takeCards(s, pi, 1); emit(s, { type: 'draw', by: pi, n: got }); s.last = { by: pi, kind: 'draw', n: got };
        const c = got ? s.hands[pi][s.hands[pi].length - 1] : null;
        if (c && canPlay(s, c)) { s.drawn = c.id; s.ver++; } // يقرر: يلعبها أو يمرّر
        else { emit(s, { type: 'pass', by: pi }); startTurn(s, nextOf(s, pi), now); }
        return { ok: true, state: s };
      }
      if (action.type === 'pass') {
        if (state.drawn === null) return { ok: false, error: 'اسحب ورقة أول قبل التمرير.' };
        const s = clone(state); s.missed[pi] = 0;
        emit(s, { type: 'pass', by: pi }); s.last = { by: pi, kind: 'pass' };
        startTurn(s, nextOf(s, pi), now);
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
      closeExposure(s);
      if (s.missed[pi] >= 3) {
        s.out[pi] = true; s.draw = shuffle([...s.draw, ...s.hands[pi]], rng); s.hands[pi] = []; s.wd4 = null; s.phase = 'play';
        emit(s, { type: 'out', by: pi }); s.last = { by: pi, kind: 'out' }; s.ver++;
        const left = activeIdx(s);
        if (left.length === 1) { finish(s, left[0]); return s; }
        startTurn(s, nextOf(s, pi), now);
        return s;
      }
      const keep = s.missed[pi];
      autoTurn(s, pi, now);
      s.missed[pi] = keep;
      return s;
    },
    view(state, playerId, now) {
      const pi = state.players.indexOf(playerId);
      const mine = pi === state.turn && !state.out[pi];
      return {
        game: 'uno', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, turnMs: state.turnMs,
        players: state.players, turnId: state.players[state.turn], dir: state.dir, round: state.round, target: state.target, scores: state.scores,
        dealer: state.players[state.dealer], top: top(state), color: state.color, drawCount: state.draw.length, discardCount: state.discard.length,
        hand: pi >= 0 ? state.hands[pi] : [], counts: state.hands.map((h) => h.length), said: state.said, out: state.out,
        legal: mine && state.phase === 'play' ? legalCards(state, pi) : [], drawn: mine ? state.drawn : null,
        needColor: mine && state.pick, pick: state.pick,
        canDraw: mine && state.phase === 'play' && state.drawn === null && !state.pick, canPass: mine && state.phase === 'play' && state.drawn !== null,
        canUno: pi >= 0 && !state.said[pi] && (state.exposed === pi || (mine && state.phase === 'play' && state.hands[pi].length === 2)),
        wd4: mine && state.phase === 'wd4', exposed: state.exposed === null ? null : state.players[state.exposed],
        canCatch: state.exposed !== null && state.exposed !== pi && pi >= 0 && !state.out[pi],
        last: state.last, result: state.result, winner: state.winner === null ? null : state.players[state.winner],
        ...eventsView(state),
      };
    },
    botAction(state, botId): BotPlan<UnoAction> | null {
      const pi = state.players.indexOf(botId);
      if (pi < 0 || state.out[pi] || state.phase === 'final' || state.phase === 'roundEnd') return null;
      // الكمبيوتر يكشف اللي نسي أونو (أحياناً) حتى لو مو دوره
      if (state.exposed !== null && state.exposed !== pi && rng() < 0.6) return { action: { type: 'catch', target: state.players[state.exposed] }, delayMs: 700 + Math.floor(rng() * 900) };
      if (state.turn !== pi) return null;
      if (state.pick) { const counts = COLORS.map((col) => state.hands[pi].filter((c) => c.c === col).length); return { action: { type: 'color', color: COLORS[counts.indexOf(Math.max(...counts))] }, delayMs: 800 }; }
      if (state.phase === 'wd4') {
        // يتحدى لو الخصم عنده أوراق كثيرة من اللون الحالي احتمالاً (بدون غش: ما يشوف يده) — هنا عشوائي بسيط
        return { action: { type: rng() < 0.25 ? 'challenge' : 'accept' }, delayMs: 900 + Math.floor(rng() * 700) };
      }
      const p = pick(state, pi, legalCards(state, pi));
      if (p) return { action: { type: 'play', card: p.card.id, color: p.color, uno: state.hands[pi].length === 2 }, delayMs: 900 + Math.floor(rng() * 900) };
      if (state.drawn !== null) return { action: { type: 'pass' }, delayMs: 600 };
      return { action: { type: 'draw' }, delayMs: 700 + Math.floor(rng() * 600) };
    },
    isOver: (s) => s.phase === 'final',
    outcome: (s) => ({ winners: s.winner === null ? [] : [s.players[s.winner]], scores: Object.fromEntries(s.players.map((p, i) => [p, s.scores[i]])) }),
    version: (s) => s.ver,
  };
}
