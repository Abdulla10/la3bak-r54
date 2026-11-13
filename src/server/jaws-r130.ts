/* R130: «الفكّ» — لعبة جماعية داخل الغرفة الصوتية (مستوحاة من فكرة Hands Over، برسم وتصميم لعبك).
 * آلة بفكّ مليان أسنان بنص الطاولة، وفيها لوحة أزرار. بعض الأزرار ملغومة.
 * بدورك تدخل يدك وتضغط زر — لو ملغوم الفك يسكّر وتخسر يد. اللي يخسر يدينه يطلع. آخر واحد يبقى يفوز.
 * بطاقات الخيانة: عكس، دبل، تمرير، إعادة، تبديل، سحب جديد، كشف.
 * الخادم يقرر كل شي (مكان الألغام سرّي)، والحالة بالذاكرة لكل غرفة. */
import { randomUUID, randomInt } from 'node:crypto';

export type JawCard = 'reverse' | 'double' | 'pass' | 'reset' | 'swap' | 'redraw' | 'peek';
export const JAW_CARDS: Record<JawCard, { name: string; icon: string; desc: string }> = {
  reverse: { name: 'عكس', icon: '🔄', desc: 'الآلة تمشي بالاتجاه الثاني.' },
  double: { name: 'دبل', icon: '✌️', desc: 'اللي بعدك لازم يضغط زرّين.' },
  pass: { name: 'تمرير', icon: '⏭️', desc: 'تخلّص دورك بدون ما تضغط.' },
  reset: { name: 'إعادة', icon: '🎲', desc: 'الدور يروح لواحد عشوائي (ممكن أنت!).' },
  swap: { name: 'تبديل', icon: '🔁', desc: 'تبدّل كل بطاقاتك ببطاقات جديدة.' },
  redraw: { name: 'سحب جديد', icon: '🃏', desc: 'بطاقات الكل تتبدّل بعشوائية إلا أنت.' },
  peek: { name: 'كشف', icon: '👁️', desc: 'تعرف زر واحد تختاره: سليم ولا ملغوم.' },
};
const CARD_KEYS = Object.keys(JAW_CARDS) as JawCard[];
const CARD_WEIGHT: Record<JawCard, number> = { reverse: 3, double: 3, pass: 2, reset: 2, swap: 1, redraw: 1, peek: 2 };
type Card = { id: string; k: JawCard };
type Player = { id: string; name: string; bot: boolean; hands: number; out: boolean; outAt: number; cards: Card[] };
type Evt = { at: number; text: string; kind: 'card' | 'safe' | 'snap' | 'info' | 'win'; by?: string; card?: JawCard; btn?: number };
type Game = {
  id: string; room: string; host: string; hostName: string; phase: 'lobby' | 'playing' | 'snap' | 'done';
  players: Player[]; dir: 1 | -1; turn: string | null; need: number; extraNext: number; turnEnd: number; turnMs: number; startHands: number;
  size: number; minesN: number; mines: Set<number>; pressed: number[]; board: number; cardsUsed: number;
  snap: { id: string; name: string; btn: number; at: number; mines: number[] } | null; snapUntil: number;
  peek: { uid: string; btn: number; safe: boolean } | null; botAt: number;
  log: Evt[]; winner: { id: string; name: string; bot: boolean } | null; prize: number; prized: boolean; createdAt: number; updatedAt: number; seq: number;
};

export const JAWS_PRIZE = 5000;
export const JAWS_PRIZE_MIN_HUMANS = 3;
const MAX_PLAYERS = 6;
const SIZE = 20; // 4 × 5
const TURN_CHOICES = [20000, 30000, 45000];
const SNAP_MS = 3600;
const MAX_CARDS = 4;
const CARDS_PER_TURN = 2;
const LOBBY_TTL = 20 * 60_000;
const DONE_TTL = 4 * 60_000;
const BOT_NAMES = ['سالم 🤖', 'نورة 🤖', 'فهد 🤖', 'مريم 🤖', 'راشد 🤖'];

export class JawsError extends Error { constructor(message: string, public status = 409) { super(message); } }
const need = (c: unknown, msg: string): void => { if (!c) throw new JawsError(msg); };

export class JawsGames {
  private games = new Map<string, Game>();
  private now: () => number;
  private rnd: (n: number) => number;
  constructor(private deps: { name: (id: string) => string; avatar?: (id: string) => string | null; prize?: (winner: string, humans: number, gameId: string) => number; notify: (ids: string[], room: string) => void; now?: () => number; rnd?: (n: number) => number }) {
    this.now = deps.now ?? Date.now; this.rnd = deps.rnd ?? ((n) => randomInt(n));
  }
  private av(p: Player) { if (p.bot) return null; try { const a = this.deps.avatar?.(p.id); return typeof a === 'string' && a ? a : null; } catch { return null; } }
  private alive(g: Game) { return g.players.filter((p) => !p.out); }
  private draw(): Card {
    const total = CARD_KEYS.reduce((s, k) => s + CARD_WEIGHT[k], 0); let r = this.rnd(total);
    for (const k of CARD_KEYS) { r -= CARD_WEIGHT[k]; if (r < 0) return { id: randomUUID().slice(0, 8), k }; }
    return { id: randomUUID().slice(0, 8), k: 'pass' };
  }
  private say(g: Game, e: Omit<Evt, 'at'>) { g.log.push({ ...e, at: this.now() }); if (g.log.length > 8) g.log.shift(); }
  private ping(g: Game) { g.updatedAt = this.now(); g.seq++; try { this.deps.notify(g.players.filter((p) => !p.bot).map((p) => p.id).concat(g.host), g.room); } catch { /* */ } }
  private newBoard(g: Game) {
    g.board++; g.pressed = []; g.mines = new Set();
    const alive = this.alive(g).length; g.minesN = alive >= 5 ? 4 : alive >= 3 ? 3 : 2;
    const pool = [...Array(g.size).keys()]; while (g.mines.size < g.minesN && pool.length) g.mines.add(pool.splice(this.rnd(pool.length), 1)[0]);
  }
  private setTurn(g: Game, id: string, t: number) {
    g.turn = id; g.need = 1 + g.extraNext; g.extraNext = 0; g.turnEnd = t + g.turnMs; g.cardsUsed = 0; g.peek = null;
    const p = g.players.find((x) => x.id === id); g.botAt = p?.bot ? t + 1400 + this.rnd(1600) : 0;
  }
  private nextOf(g: Game, from: string) {
    const live = this.alive(g); if (!live.length) return null;
    const order = g.players; let i = order.findIndex((p) => p.id === from);
    for (let k = 0; k < order.length; k++) { i = (i + g.dir + order.length) % order.length; if (!order[i].out) return order[i].id; }
    return live[0].id;
  }
  private endTurn(g: Game, t: number, drew = true) {
    const me = g.players.find((p) => p.id === g.turn);
    if (me && drew && me.cards.length < MAX_CARDS) me.cards.push(this.draw());
    const nx = this.nextOf(g, g.turn!); if (nx) this.setTurn(g, nx, t);
  }
  private finish(g: Game) {
    g.phase = 'done'; g.turn = null;
    const live = this.alive(g); const w = live[0]; g.winner = w ? { id: w.id, name: w.name, bot: w.bot } : null;
    if (w) this.say(g, { kind: 'win', text: `🏆 ${w.name} فاز!`, by: w.id });
    if (w && !w.bot && !g.prized) { g.prized = true; const humans = g.players.filter((p) => !p.bot).length; try { g.prize = this.deps.prize?.(w.id, humans, g.id) ?? 0; } catch { g.prize = 0; } }
  }

  /** الوقت: نهاية «العضّة»، انتهاء الدور (ضغط تلقائي)، البوتات، والتنظيف */
  tick(roomId?: string) {
    const t = this.now();
    for (const g of roomId ? [this.games.get(roomId)].filter(Boolean) as Game[] : [...this.games.values()]) {
      try {
        if (g.phase === 'snap' && t >= g.snapUntil) {
          if (this.alive(g).length <= 1) { this.finish(g); this.ping(g); continue; }
          g.phase = 'playing'; this.newBoard(g);
          const victim = g.snap?.id ?? g.turn!; const nx = this.nextOf(g, victim); if (nx) this.setTurn(g, nx, t); this.ping(g);
        } else if (g.phase === 'playing' && g.turn) {
          const p = g.players.find((x) => x.id === g.turn)!;
          if (p.bot && g.botAt && t >= g.botAt) this.botAct(g, p);
          else if (t >= g.turnEnd) { this.say(g, { kind: 'info', text: `⏰ ${p.name} تأخر — ضغطة عشوائية!` }); this.pressInternal(g, p, this.randomFree(g)); }
        } else if ((g.phase === 'lobby' && t - g.updatedAt > LOBBY_TTL) || (g.phase === 'done' && t - g.updatedAt > DONE_TTL)) this.games.delete(g.room);
      } catch { /* لا توقف باقي الألعاب */ }
    }
  }
  private randomFree(g: Game) { const free = [...Array(g.size).keys()].filter((i) => !g.pressed.includes(i)); return free[this.rnd(free.length)]; }
  private botAct(g: Game, p: Player) {
    const t = this.now();
    const danger = g.minesN / Math.max(1, g.size - g.pressed.length);
    if (g.cardsUsed < 1 && p.cards.length && this.rnd(100) < (danger > 0.2 ? 70 : 35)) {
      const pref = p.cards.find((c) => c.k === 'pass' || c.k === 'reset') ?? p.cards.find((c) => c.k === 'double' || c.k === 'reverse') ?? p.cards[0];
      try { this.useInternal(g, p, pref, pref.k === 'peek' ? this.randomFree(g) : undefined); } catch { /* */ }
      if (g.turn !== p.id || g.phase !== 'playing') { this.ping(g); return; }
      g.botAt = t + 900 + this.rnd(900); this.ping(g); return;
    }
    let btn = this.randomFree(g);
    if (g.peek && g.peek.uid === p.id && g.peek.safe && !g.pressed.includes(g.peek.btn)) btn = g.peek.btn;
    else if (g.peek && g.peek.uid === p.id && !g.peek.safe) { const free = [...Array(g.size).keys()].filter((i) => !g.pressed.includes(i) && i !== g.peek!.btn); btn = free[this.rnd(free.length)]; }
    this.pressInternal(g, p, btn);
    if (g.turn === p.id && g.phase === 'playing') g.botAt = t + 900 + this.rnd(900);
  }
  private pressInternal(g: Game, p: Player, btn: number) {
    const t = this.now();
    if (g.mines.has(btn)) {
      p.hands--; g.pressed.push(btn);
      const lost = p.hands <= 0; if (lost) { p.out = true; p.outAt = t; }
      g.snap = { id: p.id, name: p.name, btn, at: t, mines: [...g.mines] }; g.phase = 'snap'; g.snapUntil = t + SNAP_MS; g.turn = p.id; g.botAt = 0; g.extraNext = 0;
      this.say(g, { kind: 'snap', by: p.id, btn, text: lost ? `🦷 الفك عضّ ${p.name} — طلع من اللعبة!` : `🦷 الفك عضّ ${p.name} — خسر يد! باقي له يد وحدة.` });
      this.ping(g); return;
    }
    g.pressed.push(btn); g.need--;
    this.say(g, { kind: 'safe', by: p.id, btn, text: `✅ ${p.name} ضغط زر سليم` });
    if (g.size - g.pressed.length <= g.mines.size) { this.say(g, { kind: 'info', text: '🔧 الأزرار السليمة خلصت — لوحة جديدة!' }); this.newBoard(g); }
    if (g.need <= 0) this.endTurn(g, t); else { g.turnEnd = Math.max(g.turnEnd, t + 8000); g.peek = g.peek?.uid === p.id && g.pressed.includes(g.peek.btn) ? null : g.peek; }
    this.ping(g);
  }
  private useInternal(g: Game, p: Player, card: Card, btn?: number) {
    const t = this.now();
    need(g.cardsUsed < CARDS_PER_TURN, `بطاقتين بس بالدور.`);
    const info = JAW_CARDS[card.k];
    if (card.k === 'peek') { need(Number.isInteger(btn) && btn! >= 0 && btn! < g.size && !g.pressed.includes(btn!), 'اختر زر ما انضغط.'); }
    p.cards = p.cards.filter((c) => c.id !== card.id); g.cardsUsed++;
    this.say(g, { kind: 'card', by: p.id, card: card.k, text: `${info.icon} ${p.name} استخدم «${info.name}»` });
    switch (card.k) {
      case 'reverse': g.dir = g.dir === 1 ? -1 : 1; break;
      case 'double': g.extraNext = 1; break;
      case 'pass': this.endTurn(g, t, false); break;
      case 'reset': { const live = this.alive(g); const pick = live[this.rnd(live.length)]; this.say(g, { kind: 'info', text: `🎲 الدور راح لـ ${pick.name}` }); this.setTurn(g, pick.id, t); break; }
      case 'swap': p.cards = p.cards.map(() => this.draw()); break;
      case 'redraw': for (const o of g.players) if (o.id !== p.id && !o.out) o.cards = o.cards.map(() => this.draw()); break;
      case 'peek': g.peek = { uid: p.id, btn: btn!, safe: !g.mines.has(btn!) }; break;
    }
  }

  view(roomId: string, uid: string, mod: boolean) {
    this.tick(roomId); const g = this.games.get(roomId); const t = this.now();
    if (!g) return { game: null, can: { create: mod } };
    const me = g.players.find((p) => p.id === uid); const isHost = g.host === uid; const myTurn = g.phase === 'playing' && g.turn === uid;
    const remaining = g.size - g.pressed.length;
    return {
      game: {
        id: g.id, phase: g.phase, seq: g.seq, host: g.host, hostName: g.hostName, turnMs: g.turnMs, startHands: g.startHands,
        players: g.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, hands: p.hands, out: p.out, cards: p.cards.length, me: p.id === uid, avatar: this.av(p) })),
        turn: g.turn, turnName: g.turn ? g.players.find((p) => p.id === g.turn)?.name ?? '' : '', dir: g.dir, need: g.need, extraNext: g.extraNext,
        left: g.phase === 'playing' ? Math.max(0, g.turnEnd - t) : null,
        board: { no: g.board, size: g.size, cols: 4, pressed: g.pressed, mines: g.minesN, remaining, danger: remaining > 0 ? Math.round((g.minesN / remaining) * 100) : 0,
          reveal: g.phase === 'snap' || g.phase === 'done' ? (g.snap?.mines ?? []) : [] },
        snap: g.snap, snapLeft: g.phase === 'snap' ? Math.max(0, g.snapUntil - t) : 0,
        log: g.log, winner: g.winner, prize: g.prize, prizeAmount: JAWS_PRIZE,
      },
      me: { joined: !!me, host: isHost, myTurn, cards: me ? me.cards.map((c) => ({ id: c.id, k: c.k, ...JAW_CARDS[c.k] })) : [], peek: g.peek && g.peek.uid === uid ? { btn: g.peek.btn, safe: g.peek.safe } : null, cardsLeft: myTurn ? CARDS_PER_TURN - g.cardsUsed : 0 },
      can: {
        create: false, join: g.phase === 'lobby' && !me && g.players.length < MAX_PLAYERS, leave: g.phase === 'lobby' && !!me && !isHost,
        settings: g.phase === 'lobby' && isHost, bot: g.phase === 'lobby' && isHost && g.players.length < MAX_PLAYERS,
        start: g.phase === 'lobby' && isHost && g.players.length >= 2, cancel: (isHost || mod) && g.phase !== 'done', again: (isHost || mod) && g.phase === 'done',
        press: myTurn, card: myTurn && g.cardsUsed < CARDS_PER_TURN,
      },
    };
  }

  create(roomId: string, uid: string, members: string[], mod: boolean) {
    need(mod, 'لعبة الفكّ يسويها صاحب الغرفة أو المشرفين بس.');
    this.tick(roomId); const cur = this.games.get(roomId);
    need(!cur || cur.phase === 'done', 'فيه لعبة شغالة بالغرفة.'); need(members.includes(uid), 'لازم تكون داخل الغرفة.');
    const t = this.now(), name = this.deps.name(uid) || 'لاعب';
    const g: Game = { id: randomUUID().slice(0, 10), room: roomId, host: uid, hostName: name, phase: 'lobby',
      players: [{ id: uid, name, bot: false, hands: 2, out: false, outAt: 0, cards: [] }], dir: 1, turn: null, need: 1, extraNext: 0, turnEnd: 0, turnMs: 30000, startHands: 2,
      size: SIZE, minesN: 3, mines: new Set(), pressed: [], board: 0, cardsUsed: 0, snap: null, snapUntil: 0, peek: null, botAt: 0,
      log: [], winner: null, prize: 0, prized: false, createdAt: t, updatedAt: t, seq: 0 };
    this.games.set(roomId, g); this.ping(g);
  }
  private game(roomId: string) { this.tick(roomId); const g = this.games.get(roomId); need(g, 'ما فيه لعبة بالغرفة.'); return g!; }
  join(roomId: string, uid: string) {
    const g = this.game(roomId); need(g.phase === 'lobby', 'اللعبة بدت، انتظر الجاية.');
    need(!g.players.some((p) => p.id === uid), 'أنت داخل اللعبة.'); need(g.players.length < MAX_PLAYERS, `اللعبة لـ ${MAX_PLAYERS} لاعبين بس.`);
    g.players.push({ id: uid, name: this.deps.name(uid) || 'لاعب', bot: false, hands: g.startHands, out: false, outAt: 0, cards: [] }); this.ping(g);
  }
  addBot(roomId: string, uid: string) {
    const g = this.game(roomId); need(g.host === uid, 'للمضيف بس.'); need(g.phase === 'lobby', 'اللعبة بدت.'); need(g.players.length < MAX_PLAYERS, 'الطاولة مليانة.');
    const used = new Set(g.players.map((p) => p.name)); const name = BOT_NAMES.find((n) => !used.has(n)) ?? `بوت ${g.players.length} 🤖`;
    g.players.push({ id: `bot-jw-${randomUUID().slice(0, 6)}`, name, bot: true, hands: g.startHands, out: false, outAt: 0, cards: [] }); this.ping(g);
  }
  kick(roomId: string, uid: string, who: string) {
    const g = this.game(roomId); need(g.host === uid, 'للمضيف بس.'); need(g.phase === 'lobby', 'اللعبة بدت.'); need(who !== uid, 'ما تقدر تطلع نفسك.');
    g.players = g.players.filter((p) => p.id !== who); this.ping(g);
  }
  leave(roomId: string, uid: string) {
    const g = this.game(roomId); need(g.phase === 'lobby', 'ما تقدر تطلع بنص اللعبة.'); need(g.host !== uid, 'أنت المضيف، الغِ اللعبة بدال.');
    g.players = g.players.filter((p) => p.id !== uid); this.ping(g);
  }
  settings(roomId: string, uid: string, body: { turnMs?: unknown; hands?: unknown }) {
    const g = this.game(roomId); need(g.host === uid, 'الإعدادات للمضيف بس.'); need(g.phase === 'lobby', 'اللعبة بدت.');
    if (body.turnMs !== undefined) { const ms = Number(body.turnMs); need(TURN_CHOICES.includes(ms), 'مدة غير صالحة.'); g.turnMs = ms; }
    if (body.hands !== undefined) { const h = Number(body.hands); need(h === 1 || h === 2, 'عدد غير صالح.'); g.startHands = h; for (const p of g.players) p.hands = h; }
    this.ping(g);
  }
  start(roomId: string, uid: string, members: string[]) {
    const g = this.game(roomId); need(g.host === uid, 'البداية للمضيف بس.'); need(g.phase === 'lobby', 'اللعبة بدت.');
    g.players = g.players.filter((p) => p.bot || members.includes(p.id)); need(g.players.length >= 2, 'لازم لاعبين على الأقل (تقدر تضيف بوت).');
    for (const p of g.players) { p.hands = g.startHands; p.out = false; p.cards = [this.draw(), this.draw(), this.draw()]; }
    g.phase = 'playing'; g.dir = 1; g.board = 0; g.log = []; g.snap = null; g.winner = null; g.extraNext = 0; this.newBoard(g);
    this.say(g, { kind: 'info', text: '🦷 بدت اللعبة! كل واحد يضغط زر بدوره.' });
    this.setTurn(g, g.players[this.rnd(g.players.length)].id, this.now()); this.ping(g);
  }
  private checkMembers(g: Game, members: string[], except: string) {
    for (const p of g.players) if (!p.bot && !p.out && p.id !== except && !members.includes(p.id)) { p.out = true; p.outAt = this.now(); this.say(g, { kind: 'info', text: `🚪 ${p.name} طلع من الغرفة` }); }
  }
  press(roomId: string, uid: string, btn: unknown, members: string[]) {
    const g = this.game(roomId); need(g.phase === 'playing', 'انتظر شوي.'); need(g.turn === uid, 'مو دورك.');
    const b = Number(btn); need(Number.isInteger(b) && b >= 0 && b < g.size, 'زر غير صالح.'); need(!g.pressed.includes(b), 'هالزر انضغط.');
    this.checkMembers(g, members, uid);
    if (this.alive(g).length <= 1) { this.finish(g); this.ping(g); return; }
    this.pressInternal(g, g.players.find((p) => p.id === uid)!, b);
  }
  card(roomId: string, uid: string, cardId: unknown, btn: unknown) {
    const g = this.game(roomId); need(g.phase === 'playing', 'انتظر شوي.'); need(g.turn === uid, 'البطاقات بدورك بس.');
    const p = g.players.find((x) => x.id === uid)!; const c = p.cards.find((x) => x.id === cardId); need(c, 'البطاقة مو عندك.');
    this.useInternal(g, p, c!, btn === undefined ? undefined : Number(btn)); this.ping(g);
  }
  cancel(roomId: string, uid: string, mod: boolean) {
    const g = this.game(roomId); need(g.host === uid || mod, 'الإلغاء للمضيف أو المشرف.'); this.games.delete(roomId);
    try { this.deps.notify(g.players.filter((p) => !p.bot).map((p) => p.id), roomId); } catch { /* */ }
  }
  again(roomId: string, uid: string, mod: boolean, members: string[]) {
    const g = this.game(roomId); need(g.phase === 'done', 'اللعبة ما خلصت.'); need(g.host === uid || mod, 'للمضيف بس.');
    g.phase = 'lobby'; g.turn = null; g.winner = null; g.snap = null; g.prized = false; g.prize = 0; g.log = []; g.board = 0; g.pressed = []; g.mines = new Set();
    g.players = g.players.filter((p) => p.bot || members.includes(p.id)).map((p) => ({ ...p, hands: g.startHands, out: false, cards: [] })); this.ping(g);
  }
  active(): number { return [...this.games.values()].filter((g) => g.phase === 'playing' || g.phase === 'snap').length; }
}
