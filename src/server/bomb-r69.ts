/* R69s: «لعبة القنبلة» داخل الغرفة الصوتية.
 * قنبلة تنتقل بين اللاعبين، والوقت يخلص على واحد فينفجر ويطلع من الجولة، لين يبقى فائز واحد.
 * وضعين: «الأسئلة» (اللي معاه القنبلة يجاوب التحدي بصوته وبعدين يمرّر) و«السرعة» (يمرّر على طول، والفتيل مخفي).
 * الحالة بالذاكرة لكل غرفة (لعبة قصيرة)، والخادم هو اللي يقرر الانفجار والدور. بدون عملات. */
import { randomUUID, randomInt } from 'node:crypto';

export type BombMode = 'questions' | 'speed';
type Player = { id: string; name: string; out: boolean; outRound: number };
type Game = {
  id: string; room: string; host: string; hostName: string; mode: BombMode; roundMs: number; hard: boolean; prized: boolean;
  phase: 'lobby' | 'playing' | 'boom' | 'done'; players: Player[];
  round: number; holder: string | null; fuseEnd: number; heldAt: number; passes: number;
  challenge: string; used: number[]; lastBoom: { id: string; name: string; at: number } | null;
  winner: { id: string; name: string } | null; prize: number; createdAt: number; updatedAt: number; boomUntil: number;
};

export const BOMB_CHALLENGES: readonly string[] = [
  'اذكر 3 دول تبدأ بحرف الميم', 'سمّ 4 حيوانات تعيش في البحر', 'اذكر 5 أشياء لونها أحمر', 'قل اسم 3 يوتيوبرز',
  'اذكر 4 ألعاب جوال', 'اذكر 3 أطعمة تبدأ بحرف الباء', 'اذكر 3 دول عربية', 'سمّ 3 فواكه صفراء',
  'اذكر 4 أشياء تلقاها في المطبخ', 'اذكر 3 لاعبين كورة', 'سمّ 3 مدن خليجية', 'اذكر 4 ألوان',
  'اذكر 3 حيوانات تطير', 'سمّ 3 سيارات', 'اذكر 3 أشياء في الفصل', 'اذكر 3 مهن',
  'اذكر 3 أكلات شعبية', 'سمّ 3 عواصم', 'اذكر 3 أشياء تلبسها في الشتاء', 'اذكر 3 رياضات',
  'اذكر 4 أشياء مدورة', 'سمّ 3 حيوانات في الصحراء', 'اذكر 3 أسماء تبدأ بحرف العين', 'اذكر 3 خضار',
  'عد من 10 لين 1 بسرعة', 'قل الحروف من أ لين ح', 'اذكر 3 أفلام كرتون', 'اذكر 3 أشياء تشتغل بالكهرباء',
  'سمّ 3 مشروبات', 'اذكر 3 أشياء في البحر', 'اذكر 3 حلويات', 'اذكر 3 أدوات مدرسية',
  'سمّ 3 أشياء لونها أخضر', 'اذكر 3 تطبيقات بجوالك', 'اذكر 3 أشياء تلقاها في السوبرماركت', 'اذكر 3 حيوانات أليفة',
  'اذكر 3 ماركات ملابس', 'سمّ 3 كواكب', 'اذكر 3 أشياء تسويها الصبح', 'اذكر 3 أشياء باردة',
  'اذكر 3 أشياء حارة', 'سمّ 3 آلات موسيقية', 'اذكر 3 أشياء تلقاها في الحديقة', 'اذكر 3 أسماء بنات',
  'اذكر 3 أسماء أولاد', 'سمّ 3 أشياء في غرفة النوم', 'اذكر 3 أشياء تطير غير الطيور', 'اذكر 3 أنواع عصير',
  'قلّد صوت حيوان', 'قل جملة بدون حرف الألف', 'اذكر 3 أشياء تبدأ بحرف السين', 'سمّ 3 أشياء في المستشفى',
  'اذكر 3 أشياء نستخدمها في المطر', 'اذكر 3 دول في أوروبا', 'اذكر 3 أشياء مربعة', 'سمّ 3 حشرات',
  'اذكر 3 أشياء تلقاها في السيارة', 'اذكر 3 أشياء تحبها في الصيف', 'اذكر 3 مسلسلات', 'سمّ 3 أشياء من ذهب',
];
/** تحديات أصعب (يختارها المضيف من «نوع التحديات») */
export const BOMB_HARD: readonly string[] = [
  'اذكر 5 عواصم أفريقية', 'اذكر 4 عناصر من الجدول الدوري', 'سمّ 3 دول ما لها بحر', 'اذكر 4 كواكب بالترتيب من الشمس',
  'اذكر 3 أنبياء ذكروا في القرآن غير محمد ﷺ', 'سمّ 4 دول حدودها مع السعودية', 'اذكر 3 لغات رسمية في الأمم المتحدة غير العربية',
  'اذكر 4 عملات عربية', 'سمّ 3 مخترعين وشو اخترعوا', 'اذكر 5 دول تبدأ بحرف الألف',
];
const ROUND_CHOICES = [15000, 20000, 30000, 45000];
const MAX_PLAYERS = 8;
export const BOMB_PRIZE = 5000;
export const BOMB_PRIZE_MIN_PLAYERS = 3;
const BOOM_MS = 3500;
const MIN_HOLD_Q = 2500; // وضع الأسئلة: لازم تمسك القنبلة شوي (تجاوب) قبل لا تمررها
const MIN_HOLD_S = 400;
const LOBBY_TTL = 15 * 60_000;
const DONE_TTL = 3 * 60_000;

export class BombError extends Error { constructor(message: string, public status = 409) { super(message); } }
const need = (c: unknown, msg: string): void => { if (!c) throw new BombError(msg); };

export class BombGames {
  private games = new Map<string, Game>();
  private now: () => number;
  constructor(private deps: { name: (id: string) => string; avatar?: (id: string) => string | null; prize?: (winner: string, players: number, gameId: string) => number; notify: (ids: string[], room: string) => void; now?: () => number }) { this.now = deps.now ?? Date.now; }

  private av(id: string) { try { const a = this.deps.avatar?.(id); return typeof a === 'string' && a ? a : null; } catch { return null; } }
  private alive(g: Game) { return g.players.filter((p) => !p.out); }
  private pickChallenge(g: Game) {
    const list = g.hard ? BOMB_HARD : BOMB_CHALLENGES;
    if (g.used.length >= list.length - 1) g.used = [];
    let i = randomInt(list.length); let guard = 0;
    while (g.used.includes(i) && guard++ < 50) i = randomInt(list.length);
    g.used.push(i); g.challenge = list[i];
  }
  /** الفايز ياخذ الجائزة مرة وحدة لكل لعبة (الخادم يتحقق من الشروط) */
  private finish(g: Game) {
    g.phase = 'done'; g.holder = null;
    if (g.winner && !g.prized) { g.prized = true; try { g.prize = this.deps.prize?.(g.winner.id, g.players.length, g.id) ?? 0; } catch { g.prize = 0; } }
  }
  private fuse(g: Game) { return g.mode === 'speed' ? Math.round(g.roundMs * (0.55 + Math.random() * 0.9)) : g.roundMs; }
  private startRound(g: Game, t: number) {
    const live = this.alive(g); g.round++; g.phase = 'playing'; g.passes = 0;
    g.holder = live[randomInt(live.length)].id; g.heldAt = t; g.fuseEnd = t + this.fuse(g); this.pickChallenge(g);
  }
  private ping(g: Game) { g.updatedAt = this.now(); try { this.deps.notify(g.players.map((p) => p.id).concat(g.host), g.room); } catch { /* */ } }

  /** يتقدم باللعبة حسب الوقت: الانفجار، والجولة اللي بعدها، والتنظيف */
  tick(roomId?: string) {
    const t = this.now();
    for (const g of roomId ? [this.games.get(roomId)].filter(Boolean) as Game[] : [...this.games.values()]) {
      if (g.phase === 'playing' && t >= g.fuseEnd && g.holder) {
        const p = g.players.find((x) => x.id === g.holder)!; p.out = true; p.outRound = g.round;
        g.lastBoom = { id: p.id, name: p.name, at: g.fuseEnd }; g.holder = null; g.phase = 'boom'; g.boomUntil = t + BOOM_MS;
        const live = this.alive(g); if (live.length <= 1) { g.winner = live[0] ? { id: live[0].id, name: live[0].name } : null; this.finish(g); }
        this.ping(g);
      } else if (g.phase === 'boom' && t >= g.boomUntil) { this.startRound(g, t); this.ping(g); }
      else if ((g.phase === 'lobby' && t - g.updatedAt > LOBBY_TTL) || (g.phase === 'done' && t - g.updatedAt > DONE_TTL)) this.games.delete(g.room);
    }
  }

  view(roomId: string, uid: string, mod: boolean) {
    this.tick(roomId); const g = this.games.get(roomId); const t = this.now();
    if (!g) return { game: null, can: { create: mod } };
    const isHost = g.host === uid, joined = g.players.some((p) => p.id === uid);
    const holding = g.phase === 'playing' && g.holder === uid;
    const minHold = g.mode === 'questions' ? MIN_HOLD_Q : MIN_HOLD_S;
    return {
      game: {
        id: g.id, mode: g.mode, roundMs: g.roundMs, phase: g.phase, host: g.host, hostName: g.hostName,
        players: g.players.map((p) => ({ id: p.id, name: p.name, out: p.out, outRound: p.outRound, me: p.id === uid, avatar: this.av(p.id) })),
        round: g.round, rounds: Math.max(1, g.players.length - 1), holder: g.holder,
        holderName: g.holder ? g.players.find((p) => p.id === g.holder)?.name ?? '' : '',
        // وضع السرعة: الفتيل مخفي، نرسل بس «قريب ينفجر» بآخر 4 ثواني
        left: g.phase === 'playing' ? (g.mode === 'speed' ? null : Math.max(0, g.fuseEnd - t)) : null,
        danger: g.phase === 'playing' && g.fuseEnd - t <= 4000,
        challenge: g.phase === 'playing' && g.mode === 'questions' ? g.challenge : '',
        passIn: holding ? Math.max(0, g.heldAt + minHold - t) : null,
        hard: g.hard, prize: g.prize, prizeAmount: BOMB_PRIZE, lastBoom: g.lastBoom, boomLeft: g.phase === 'boom' ? Math.max(0, g.boomUntil - t) : 0, winner: g.winner, passes: g.passes,
      },
      me: { joined, host: isHost, holding },
      can: {
        create: false, join: g.phase === 'lobby' && !joined && g.players.length < MAX_PLAYERS, leave: g.phase === 'lobby' && joined && !isHost,
        settings: g.phase === 'lobby' && isHost, start: g.phase === 'lobby' && isHost && g.players.length >= 2,
        cancel: (isHost || mod) && g.phase !== 'done', again: (isHost || mod) && g.phase === 'done',
        pass: holding && t >= g.heldAt + minHold,
      },
    };
  }

  create(roomId: string, uid: string, members: string[], mod: boolean) {
    need(mod, 'لعبة القنبلة يسويها صاحب الغرفة أو المشرفين بس.');
    this.tick(roomId); const cur = this.games.get(roomId);
    need(!cur || cur.phase === 'done', 'فيه لعبة قنبلة شغالة بالغرفة.'); need(members.includes(uid), 'لازم تكون داخل الغرفة.');
    const t = this.now(), name = this.deps.name(uid) || 'لاعب';
    const g: Game = { id: randomUUID().slice(0, 10), room: roomId, host: uid, hostName: name, mode: 'questions', roundMs: 30000, hard: false, prized: false, prize: 0, phase: 'lobby',
      players: [{ id: uid, name, out: false, outRound: 0 }], round: 0, holder: null, fuseEnd: 0, heldAt: 0, passes: 0, challenge: '', used: [],
      lastBoom: null, winner: null, createdAt: t, updatedAt: t, boomUntil: 0 };
    this.games.set(roomId, g); this.ping(g);
  }
  private game(roomId: string) { this.tick(roomId); const g = this.games.get(roomId); need(g, 'ما فيه لعبة قنبلة بالغرفة.'); return g!; }
  join(roomId: string, uid: string) {
    const g = this.game(roomId); need(g.phase === 'lobby', 'اللعبة بدت، انتظر الجاية.');
    need(!g.players.some((p) => p.id === uid), 'أنت داخل اللعبة.'); need(g.players.length < MAX_PLAYERS, `اللعبة لـ ${MAX_PLAYERS} لاعبين بس.`);
    g.players.push({ id: uid, name: this.deps.name(uid) || 'لاعب', out: false, outRound: 0 }); this.ping(g);
  }
  leave(roomId: string, uid: string) {
    const g = this.game(roomId); need(g.phase === 'lobby', 'ما تقدر تطلع بنص اللعبة.'); need(g.host !== uid, 'أنت المضيف، الغِ اللعبة بدال.');
    g.players = g.players.filter((p) => p.id !== uid); this.ping(g);
  }
  settings(roomId: string, uid: string, body: { mode?: unknown; roundMs?: unknown; hard?: unknown }) {
    const g = this.game(roomId); need(g.host === uid, 'الإعدادات للمضيف بس.'); need(g.phase === 'lobby', 'اللعبة بدت.');
    if (body.mode !== undefined) { need(body.mode === 'questions' || body.mode === 'speed', 'وضع غير صالح.'); g.mode = body.mode as BombMode; }
    if (body.hard !== undefined) { need(typeof body.hard === 'boolean', 'نوع غير صالح.'); g.hard = body.hard as boolean; }
    if (body.roundMs !== undefined) { const ms = Number(body.roundMs); need(ROUND_CHOICES.includes(ms), 'مدة غير صالحة.'); g.roundMs = ms; }
    this.ping(g);
  }
  start(roomId: string, uid: string, members: string[]) {
    const g = this.game(roomId); need(g.host === uid, 'البداية للمضيف بس.'); need(g.phase === 'lobby', 'اللعبة بدت.');
    g.players = g.players.filter((p) => members.includes(p.id)); need(g.players.length >= 2, 'لازم لاعبين على الأقل.');
    this.startRound(g, this.now()); this.ping(g);
  }
  pass(roomId: string, uid: string, members: string[]) {
    const g = this.game(roomId); const t = this.now();
    need(g.phase === 'playing', 'الجولة مو شغالة.'); need(g.holder === uid, 'القنبلة مو عندك.');
    need(t < g.fuseEnd, 'انفجرت! 💥'); need(t >= g.heldAt + (g.mode === 'questions' ? MIN_HOLD_Q : MIN_HOLD_S), 'جاوب التحدي أول 😄');
    // اللاعب اللي طلع من الغرفة ينشال من الدور
    for (const p of g.players) if (!p.out && !members.includes(p.id) && p.id !== uid) { p.out = true; p.outRound = g.round; }
    const live = this.alive(g); const i = live.findIndex((p) => p.id === uid);
    if (live.length <= 1) { g.winner = { id: uid, name: live[0]?.name ?? '' }; this.finish(g); this.ping(g); return; }
    g.holder = live[(i + 1) % live.length].id; g.heldAt = t; g.passes++; if (g.mode === 'questions') this.pickChallenge(g);
    this.ping(g);
  }
  cancel(roomId: string, uid: string, mod: boolean) {
    const g = this.game(roomId); need(g.host === uid || mod, 'الإلغاء للمضيف أو المشرف.'); this.games.delete(roomId);
    try { this.deps.notify(g.players.map((p) => p.id), roomId); } catch { /* */ }
  }
  again(roomId: string, uid: string, mod: boolean, members: string[]) {
    const g = this.game(roomId); need(g.phase === 'done', 'اللعبة ما خلصت.'); need(g.host === uid || mod, 'للمضيف بس.');
    g.phase = 'lobby'; g.round = 0; g.holder = null; g.winner = null; g.lastBoom = null; g.passes = 0; g.prized = false; g.prize = 0; g.used = [];
    g.players = g.players.filter((p) => members.includes(p.id)).map((p) => ({ ...p, out: false, outRound: 0 })); this.ping(g);
  }
  active(): number { return [...this.games.values()].filter((g) => g.phase === 'playing' || g.phase === 'boom').length; }
}
