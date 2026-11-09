import type { ApplyResult, BotPlan, Engine, EngineOpts, GameInfo, PlayerRef } from './types.js';
import { clone, type Rng } from './util.js';
import { emit, eventsView, newLog, type EventLog } from './events.js';
// نفس ملف الفيزياء اللي يستخدمه المتصفح (عشان الحركة تطلع مطابقة للخادم)
// @ts-ignore — ملف JS عادي خارج src
import * as PH from '../../public/pool-physics.js';

type Ball = { n: number; x: number; y: number; in: boolean };
type SimOut = { balls: Ball[]; first: number | null; pocketed: number[]; rails: number; steps: number };
const P = PH as unknown as {
  W: number; H: number; R: number; MAXV: number; HEAD_Y: number; POCKETS: { x: number; y: number; r: number }[];
  simulate(b: Ball[], v: { x: number; y: number }, spin?: number): SimOut; rack(rng: Rng): Ball[];
  canPlace(b: Ball[], x: number, y: number, kitchen: boolean): boolean; groupOf(n: number): 'solid' | 'stripe' | null;
};

/**
 * ٨ بول (R68z) — لاعبين. الخادم يحاكي كل ضربة ويقرر النتيجة.
 *  - الكسر: الأول يضرب من ورا خط الكسر. بعدها الطاولة «مفتوحة» لين أحد يدخل كرة: يصير له نوعها (سادة 1–7 أو مخططة 9–15).
 *  - تكمل دورك لو دخّلت كرة من نوعك بدون خطأ.
 *  - خطأ: البيضا دخلت، أو ما لمست ولا كرة، أو أول لمسة على كرة مو من نوعك (أو الـ8 قبل وقتها) → الخصم ياخذ البيضا بيده ويحطها وين ما يبي.
 *  - الـ8: تدخلها بعد ما تخلص كراتك = تفوز. تدخلها قبل، أو مع خطأ = تخسر. الـ8 بالكسر ترجع مكانها.
 *  - مهلة الضربة: تنحسب خطأ (والخصم ياخذ البيضا). ثلاث مهلات ورا بعض = خسارة.
 */
export interface PoolState {
  ver: number; turnMs: number; players: string[]; turn: number; phase: 'aim' | 'final';
  endsAt: number; balls: Ball[]; groups: (null | 'solid' | 'stripe')[]; inHand: boolean; kitchen: boolean; broke: boolean;
  shotNo: number; last: null | { by: number; v: { x: number; y: number }; spin: number; before: Ball[]; place: { x: number; y: number } | null; first: number | null; pocketed: number[]; foul: string; steps: number };
  msg: string; missed: number[]; winner: number | null; ev?: EventLog;
}
export type PoolAction = { type: 'shot'; angle: number; power: number; spin?: number; place?: { x: number; y: number } };

export const info: GameInfo = {
  id: 'pool', name: '٨ بول', icon: '🎱', tagline: 'بلياردو ٨ بول: دخّل كراتك ثم الـ8',
  description: 'بلياردو ٨ بول أونلاين: اختر الزاوية والقوة، دخّل كراتك (سادة أو مخططة) وبعدها الكرة 8 قبل خصمك.',
  minPlayers: 2, maxPlayers: 2, defaultSeats: 2, supportsBots: true, status: 'available', categories: ['duel'],
  idea: 'لاعبين. كل واحد له نوع كرات (سادة أو مخططة). اسحب على الطاولة عشان تصوب، واختر القوة من الشريط واضرب.',
  howToStart: 'أنشئ غرفة ٨ بول وادعُ صديقك، أو العب ضد الكمبيوتر. الخادم يرتب الكرات ويحاكي كل ضربة.',
  howToWin: 'دخّل كل كراتك وبعدها دخّل الكرة 8. لو دخلت الـ8 قبل وقتها أو مع البيضا تخسر.',
};
const MAX_STEPS_MS = (steps: number) => Math.min(9000, Math.round(steps * 1000 / 60) + 400);

export function createPoolEngine(rng: Rng): Engine<PoolState, PoolAction> {
  const left = (s: PoolState, g: 'solid' | 'stripe') => s.balls.filter((b) => !b.in && P.groupOf(b.n) === g).length;
  const startTurn = (s: PoolState, i: number, now: number, extraMs = 0) => { s.turn = i; s.endsAt = now + extraMs + s.turnMs; s.ver++; };
  function finish(s: PoolState, w: number, msg: string, now: number) { s.winner = w; s.phase = 'final'; s.msg = msg; s.endsAt = now; s.ver++; emit(s, { type: 'win', by: w }); }

  function shoot(s: PoolState, pi: number, v: { x: number; y: number }, spin: number, place: { x: number; y: number } | null, now: number) {
    const before = clone(s.balls);
    const out = P.simulate(s.balls, v, spin);
    s.balls = out.balls; s.shotNo++; s.missed[pi] = 0;
    const g = s.groups[pi]; const opp = 1 - pi;
    const scratch = out.pocketed.includes(0); const eight = out.pocketed.includes(8);
    let foul = '';
    if (out.first === null) foul = 'البيضا ما لمست ولا كرة';
    else if (g && out.first !== 8 && P.groupOf(out.first) !== g) foul = 'أول لمسة على كرة الخصم';
    else if (g && out.first === 8 && left(s, g) + out.pocketed.filter((n) => P.groupOf(n) === g).length > 0) foul = 'لمست الـ8 قبل وقتها';
    else if (!g && out.first === 8 && s.broke) foul = 'لمست الـ8 والطاولة مفتوحة';
    if (scratch) foul = 'البيضا دخلت الجيب';
    const animMs = MAX_STEPS_MS(out.steps);
    s.last = { by: pi, v, spin, before, place, first: out.first, pocketed: out.pocketed, foul, steps: out.steps };
    emit(s, { type: 'shot', by: pi, pocketed: out.pocketed, foul });
    const wasBreak = !s.broke; s.broke = true; s.kitchen = false;
    // الـ8
    if (eight) {
      if (wasBreak) { const e = s.balls.find((b) => b.n === 8)!; e.in = false; e.x = P.W / 2; e.y = 270; if (!P.canPlace(s.balls.filter((b) => b.n !== 8), e.x, e.y, false)) e.y = 230; }
      else {
        const cleared = g ? left(s, g) === 0 : false;
        if (!cleared || foul) { finish(s, opp, `${foul ? foul + ' مع الـ8' : 'الـ8 دخلت قبل وقتها'} — خسر`, now + animMs); return; }
        finish(s, pi, 'دخّل الـ8 وفاز! 🏆', now + animMs); return;
      }
    }
    // البيضا ترجع للطاولة لو دخلت
    if (scratch) { const c = s.balls.find((b) => b.n === 0)!; c.in = false; c.x = P.W / 2; c.y = 820; }
    // تحديد النوع لما الطاولة مفتوحة
    let mine = 0;
    if (!g && !foul && !wasBreak) {
      const firstIn = out.pocketed.find((n) => n !== 0 && n !== 8);
      if (firstIn) { const t = P.groupOf(firstIn)!; s.groups[pi] = t; s.groups[opp] = t === 'solid' ? 'stripe' : 'solid'; emit(s, { type: 'groups', by: pi, group: t }); }
    }
    const g2 = s.groups[pi];
    mine = out.pocketed.filter((n) => n !== 0 && n !== 8 && (!g2 || P.groupOf(n) === g2)).length;
    if (wasBreak && !foul) mine = out.pocketed.filter((n) => n !== 0 && n !== 8).length; // بالكسر: أي كرة تدخل تكمل
    if (foul) { s.inHand = true; s.msg = `خطأ: ${foul}`; startTurn(s, opp, now, animMs); emit(s, { type: 'foul', by: pi, why: foul }); return; }
    s.inHand = false;
    if (mine > 0) { s.msg = 'دخّل وكمّل دوره'; startTurn(s, pi, now, animMs); }
    else { s.msg = ''; startTurn(s, opp, now, animMs); }
  }
  function velocity(angle: number, power: number) { const p = Math.max(0.03, Math.min(1, power)); return { x: Math.round(Math.cos(angle) * p * P.MAXV * 1e6) / 1e6, y: Math.round(Math.sin(angle) * p * P.MAXV * 1e6) / 1e6 }; }

  /* ---------- الكمبيوتر: يختار أحسن ضربة مباشرة (كرة → جيب) ---------- */
  function botShot(s: PoolState, pi: number): PoolAction {
    const g = s.groups[pi]; const live = s.balls.filter((b) => !b.in);
    let cue = live.find((b) => b.n === 0)!; let place: { x: number; y: number } | undefined;
    const targets = live.filter((b) => b.n !== 0 && (g ? (left(s, g) ? P.groupOf(b.n) === g : b.n === 8) : b.n !== 8));
    if (s.inHand) {
      // يجرّب أماكن ويختار اللي يعطي أسهل ضربة
      let best: { x: number; y: number; sc: number } | null = null;
      for (let i = 0; i < 40; i++) {
        const x = Math.round(40 + rng() * (P.W - 80)), y = Math.round((s.kitchen ? P.HEAD_Y + 20 : 60) + rng() * ((s.kitchen ? P.H - P.HEAD_Y - 60 : P.H - 120)));
        if (!P.canPlace(s.balls, x, y, s.kitchen)) continue;
        const sc = Math.max(...targets.map((t) => -Math.hypot(t.x - x, t.y - y)), -9999);
        if (!best || sc > best.sc) best = { x, y, sc };
      }
      if (best) { place = { x: Math.round(best.x), y: Math.round(best.y) }; cue = { ...cue, x: place.x, y: place.y }; }
    }
    if (!s.broke) return { type: 'shot', angle: Math.atan2(270 - cue.y, P.W / 2 - cue.x) + (rng() - 0.5) * 0.02, power: 1, ...(place ? { place } : {}) };
    let bestShot: { angle: number; power: number; sc: number } | null = null;
    for (const t of targets) for (const p of P.POCKETS) {
      const px = Math.min(P.W, Math.max(0, p.x)), py = Math.min(P.H, Math.max(0, p.y));
      const dx = px - t.x, dy = py - t.y, d = Math.hypot(dx, dy); if (d < 1) continue;
      const gx = t.x - dx / d * P.R * 2, gy = t.y - dy / d * P.R * 2; // الكرة الشبح
      const ax = gx - cue.x, ay = gy - cue.y, ad = Math.hypot(ax, ay); if (ad < 1) continue;
      const cut = (ax * dx + ay * dy) / (ad * d); if (cut < 0.35) continue; // زاوية صعبة
      // الطريق فاضي؟
      const blocked = live.some((b) => b.n !== 0 && b.n !== t.n && segDist(cue.x, cue.y, gx, gy, b.x, b.y) < P.R * 2) || live.some((b) => b.n !== 0 && b.n !== t.n && segDist(t.x, t.y, px, py, b.x, b.y) < P.R * 2);
      if (blocked) continue;
      const sc = cut * 2 - (ad + d) / 900;
      if (!bestShot || sc > bestShot.sc) bestShot = { angle: Math.atan2(ay, ax), power: Math.min(1, 0.32 + (ad + d) / 1500 / Math.max(0.5, cut)), sc };
    }
    if (!bestShot) { const t = targets.sort((a, b) => Math.hypot(a.x - cue.x, a.y - cue.y) - Math.hypot(b.x - cue.x, b.y - cue.y))[0] ?? live.find((b) => b.n !== 0)!; bestShot = { angle: Math.atan2(t.y - cue.y, t.x - cue.x), power: 0.55, sc: 0 }; }
    return { type: 'shot', angle: bestShot.angle + (rng() - 0.5) * 0.03, power: bestShot.power, ...(place ? { place } : {}) };
  }
  function segDist(x1: number, y1: number, x2: number, y2: number, px: number, py: number) { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)); return Math.hypot(x1 + t * dx - px, y1 + t * dy - py); }

  return {
    info,
    init(players: PlayerRef[], now: number, opts?: EngineOpts): PoolState {
      return { ver: 0, turnMs: Math.min(opts?.turnMs ?? 30_000, 30_000), players: players.map((p) => p.id), turn: Math.floor(rng() * 2), phase: 'aim', endsAt: now + 30_000,
        balls: P.rack(rng), groups: [null, null], inHand: true, kitchen: true, broke: false, shotNo: 0, last: null, msg: 'الكسر', missed: [0, 0], winner: null, ev: newLog() };
    },
    apply(state, playerId, action, now): ApplyResult<PoolState> {
      const pi = state.players.indexOf(playerId);
      if (pi < 0) return { ok: false, error: 'أنت مو لاعب بهالمباراة.' };
      if (state.phase !== 'aim') return { ok: false, error: 'المباراة خلصت.' };
      if (state.turn !== pi) return { ok: false, error: 'مو دورك.' };
      if (!action || action.type !== 'shot' || !Number.isFinite(action.angle) || !Number.isFinite(action.power)) return { ok: false, error: 'ضربة غير صالحة.' };
      const s = clone(state);
      let place: { x: number; y: number } | null = null;
      if (action.place) {
        if (!s.inHand) return { ok: false, error: 'ما معك البيضا باليد.' };
        const x = Number(action.place.x), y = Number(action.place.y);
        if (!P.canPlace(s.balls, x, y, s.kitchen)) return { ok: false, error: s.kitchen ? 'حط البيضا ورا خط الكسر وبعيد عن الكرات.' : 'المكان مو صالح للبيضا.' };
        const c = s.balls.find((b) => b.n === 0)!; c.x = x; c.y = y; place = { x, y };
      }
      const spin = Math.max(-1, Math.min(1, Number(action.spin) || 0));
      shoot(s, pi, velocity(action.angle, action.power), spin, place, now);
      return { ok: true, state: s };
    },
    tick(state, now) {
      if (state.phase === 'final' || now < state.endsAt) return state;
      const s = clone(state); const pi = s.turn; s.missed[pi]++;
      emit(s, { type: 'timeout', by: pi });
      if (s.missed[pi] >= 3) { finish(s, 1 - pi, 'خلص وقته 3 مرات', now); return s; }
      s.inHand = true; s.msg = 'خلص الوقت — البيضا مع الخصم'; s.last = null; startTurn(s, 1 - pi, now);
      return s;
    },
    view(state, playerId, now) {
      const pi = state.players.indexOf(playerId);
      return { game: 'pool', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, turnMs: state.turnMs, players: state.players, you: pi, turnId: state.players[state.turn],
        balls: state.balls, groups: state.groups, inHand: state.inHand, kitchen: state.kitchen, broke: state.broke, shotNo: state.shotNo, last: state.last ? { ...state.last, by: state.players[state.last.by] } : null,
        msg: state.msg, winner: state.winner === null ? null : state.players[state.winner], dims: { W: P.W, H: P.H, R: P.R, HEAD_Y: P.HEAD_Y }, ...eventsView(state) };
    },
    botAction(state, botId, now): BotPlan<PoolAction> | null {
      const pi = state.players.indexOf(botId);
      if (pi < 0 || state.phase !== 'aim' || state.turn !== pi) return null;
      const wait = Math.max(0, state.endsAt - state.turnMs - now);
      return { action: botShot(state, pi), delayMs: wait + 1500 + Math.floor(rng() * 1200) };
    },
    isOver: (s) => s.phase === 'final',
    outcome: (s) => ({ winners: s.winner === null ? [] : [s.players[s.winner]] }),
    version: (s) => s.ver,
  };
}
