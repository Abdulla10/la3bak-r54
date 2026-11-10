/* R69v: «لعبة الجاسوس» داخل الغرفة الصوتية.
 * الكل ياخذ نفس الكلمة السرية إلا الجاسوس (أو الجاسوسين). يتناقشون بأسئلة غير مباشرة بالصوت،
 * وبعدين تصويت سري. إذا كشفوا الجاسوس يفوز المواطنين، وإلا يفوز الجاسوس. وضع التخمين: الجاسوس المكشوف يخمن الكلمة.
 * الحالة بالذاكرة لكل غرفة، والخادم يوزع الأدوار سراً: كل لاعب يشوف دوره بس. */
import { randomUUID, randomInt } from 'node:crypto';

export const SPY_WORDS: Record<string, { name: string; words: string[] }> = {
  places: { name: 'أماكن', words: ['المطار', 'المستشفى', 'المدرسة', 'البحر', 'السوق', 'المطعم', 'الملعب', 'السينما', 'المسجد', 'الحديقة', 'البنك', 'الفندق', 'المكتبة', 'الصحراء', 'محطة البنزين', 'الجامعة', 'حديقة الحيوان', 'المول'] },
  foods: { name: 'أكلات', words: ['الكبسة', 'البيتزا', 'الهريس', 'المجبوس', 'البرجر', 'الشاورما', 'اللقيمات', 'السمبوسة', 'الفلافل', 'المندي', 'الآيس كريم', 'السوشي', 'الكنافة', 'الشوربة', 'المعكرونة', 'التمر'] },
  jobs: { name: 'مهن', words: ['الطبيب', 'المعلم', 'الطيار', 'الشرطي', 'الطباخ', 'المهندس', 'الحلاق', 'الإطفائي', 'المحامي', 'الصياد', 'النجار', 'الممرض', 'المذيع', 'السائق', 'المبرمج', 'الخباز'] },
  animals: { name: 'حيوانات', words: ['الجمل', 'الأسد', 'الصقر', 'القطوة', 'الحصان', 'الدلفين', 'الفيل', 'الزرافة', 'البطريق', 'التمساح', 'الثعلب', 'الأرنب', 'السلحفاة', 'القرد', 'النحلة', 'الغزال'] },
  things: { name: 'أغراض', words: ['الجوال', 'الساعة', 'المظلة', 'المفتاح', 'النظارة', 'الكرسي', 'الثلاجة', 'التلفزيون', 'الشنطة', 'الكاميرا', 'المخدة', 'السيارة', 'الدراجة', 'المروحة', 'القلم', 'المراية'] },
};
export const SPY_CATEGORIES = [...Object.keys(SPY_WORDS), 'mixed'];
const DISCUSS = [60000, 90000, 120000, 180000];
const ROUNDS = [1, 2, 3, 5];
const REVEAL_MS = 6000, VOTE_MS = 30000, GUESS_MS = 20000, RESULT_MS = 8000, ASK_MS = 15000;
export const SPY_PRIZE = 10000;
const MAX_PLAYERS = 8, LOBBY_TTL = 20 * 60_000, DONE_TTL = 5 * 60_000;

type Player = { id: string; name: string; score: number };
type Round = { n: number; word: string; cat: string; spies: string[]; votes: Record<string, string>; accused: string | null; caught: boolean; guess: string | null; guessed: boolean | null; options: string[]; winner: 'spy' | 'town' | null };
type Game = {
  id: string; room: string; host: string; hostName: string; mode: 'one' | 'two'; rounds: number; cat: string; discussMs: number; guess: boolean;
  phase: 'lobby' | 'reveal' | 'discuss' | 'vote' | 'guess' | 'result' | 'done'; players: Player[]; round: Round | null; history: Round[];
  phaseEnd: number; phaseStart: number; order: string[]; usedWords: string[]; prizes: { id: string; name: string; amt: number }[]; createdAt: number; updatedAt: number;
};
export class SpyError extends Error { constructor(message: string, public status = 409) { super(message); } }
const need = (c: unknown, msg: string): void => { if (!c) throw new SpyError(msg); };
const shuffle = <T>(a: T[]) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = randomInt(i + 1); [x[i], x[j]] = [x[j], x[i]]; } return x; };

export class SpyGames {
  private games = new Map<string, Game>();
  private now: () => number;
  constructor(private deps: { prize?: (winner: string, amount: number, gameId: string) => number; name: (id: string) => string; avatar?: (id: string) => string | null; notify: (ids: string[], room: string) => void; now?: () => number }) { this.now = deps.now ?? Date.now; }
  private av(id: string) { try { const a = this.deps.avatar?.(id); return typeof a === 'string' && a ? a : null; } catch { return null; } }
  private ping(g: Game) { g.updatedAt = this.now(); try { this.deps.notify(g.players.map((p) => p.id).concat(g.host), g.room); } catch { /* */ } }
  private minPlayers(g: Game) { return g.mode === 'two' ? 5 : 3; }

  private newRound(g: Game, t: number) {
    const catKey = g.cat === 'mixed' ? Object.keys(SPY_WORDS)[randomInt(Object.keys(SPY_WORDS).length)] : g.cat;
    const pool = SPY_WORDS[catKey].words.filter((w) => !g.usedWords.includes(w));
    const word = (pool.length ? pool : SPY_WORDS[catKey].words)[randomInt((pool.length ? pool : SPY_WORDS[catKey].words).length)];
    g.usedWords.push(word);
    const ids = shuffle(g.players.map((p) => p.id)); const spies = ids.slice(0, g.mode === 'two' ? 2 : 1);
    const options = shuffle([word, ...shuffle(SPY_WORDS[catKey].words.filter((w) => w !== word)).slice(0, 7)]);
    g.round = { n: (g.round?.n ?? 0) + 1, word, cat: catKey, spies, votes: {}, accused: null, caught: false, guess: null, guessed: null, options, winner: null };
    g.order = shuffle(g.players.map((p) => p.id)); g.phase = 'reveal'; g.phaseStart = t; g.phaseEnd = t + REVEAL_MS;
  }
  private tally(g: Game) {
    const r = g.round!; const count = new Map<string, number>();
    for (const v of Object.values(r.votes)) count.set(v, (count.get(v) ?? 0) + 1);
    let best: string | null = null, top = 0, tie = false;
    for (const [id, n] of count) { if (n > top) { top = n; best = id; tie = false; } else if (n === top) tie = true; }
    r.accused = tie ? null : best; r.caught = !!r.accused && r.spies.includes(r.accused);
  }
  private settle(g: Game, t: number) {
    const r = g.round!;
    if (r.caught && !(r.guessed === true)) { r.winner = 'town'; for (const p of g.players) if (!r.spies.includes(p.id)) p.score += 1; }
    else { r.winner = 'spy'; for (const p of g.players) if (r.spies.includes(p.id)) p.score += r.guessed === true ? 3 : 2; }
    g.phase = 'result'; g.phaseStart = t; g.phaseEnd = t + RESULT_MS;
  }
  tick(roomId?: string) {
    const t = this.now();
    for (const g of roomId ? [this.games.get(roomId)].filter(Boolean) as Game[] : [...this.games.values()]) {
      if (g.phase === 'lobby' || g.phase === 'done') { if (t - g.updatedAt > (g.phase === 'lobby' ? LOBBY_TTL : DONE_TTL)) this.games.delete(g.room); continue; }
      if (t < g.phaseEnd) continue;
      if (g.phase === 'reveal') { g.phase = 'discuss'; g.phaseStart = t; g.phaseEnd = t + g.discussMs; }
      else if (g.phase === 'discuss') { g.phase = 'vote'; g.phaseStart = t; g.phaseEnd = t + VOTE_MS; }
      else if (g.phase === 'vote') this.closeVote(g, t);
      else if (g.phase === 'guess') { g.round!.guessed = false; this.settle(g, t); }
      else if (g.phase === 'result') {
        g.history.push(g.round!);
        if (g.history.length >= g.rounds) { g.phase = 'done'; g.phaseEnd = 0; this.payout(g); }
        else this.newRound(g, t);
      }
      this.ping(g);
    }
  }
  /** الجائزة: 10,000 للفايز (أعلى نقاط). لو تعادلوا تنقسم بينهم بالتساوي. */
  private payout(g: Game) {
    g.prizes = []; const top = Math.max(0, ...g.players.map((p) => p.score)); if (top <= 0) return;
    const ws = g.players.filter((p) => p.score === top); const each = Math.floor(SPY_PRIZE / ws.length);
    for (const w of ws) { let got = 0; try { got = this.deps.prize?.(w.id, each, g.id) ?? 0; } catch { got = 0; } g.prizes.push({ id: w.id, name: w.name, amt: got }); }
  }
  private closeVote(g: Game, t: number) {
    this.tally(g); const r = g.round!;
    if (r.caught && g.guess) { g.phase = 'guess'; g.phaseStart = t; g.phaseEnd = t + GUESS_MS; }
    else this.settle(g, t);
  }

  view(roomId: string, uid: string, mod: boolean) {
    this.tick(roomId); const g = this.games.get(roomId); const t = this.now();
    if (!g) return { game: null, can: { create: mod } };
    const r = g.round, joined = g.players.some((p) => p.id === uid), isHost = g.host === uid;
    const amSpy = !!r && r.spies.includes(uid);
    const open = g.phase === 'result' || g.phase === 'done';
    const myRole = r && joined && g.phase !== 'lobby' ? (amSpy ? { spy: true, cat: SPY_WORDS[r.cat].name, partners: g.mode === 'two' ? r.spies.filter((s) => s !== uid).map((s) => g.players.find((p) => p.id === s)?.name ?? '') : [] } : { spy: false, word: r.word, cat: SPY_WORDS[r.cat].name }) : null;
    const ask = g.phase === 'discuss' && g.order.length >= 2 ? (() => { const i = Math.floor((t - g.phaseStart) / ASK_MS) % g.order.length; const a = g.order[i], b = g.order[(i + 1) % g.order.length]; return { from: g.players.find((p) => p.id === a)?.name ?? '', to: g.players.find((p) => p.id === b)?.name ?? '', left: ASK_MS - ((t - g.phaseStart) % ASK_MS) }; })() : null;
    const votedCount = r ? Object.keys(r.votes).length : 0;
    return {
      game: {
        id: g.id, phase: g.phase, mode: g.mode, rounds: g.rounds, cat: g.cat, catName: g.cat === 'mixed' ? 'منوعة' : SPY_WORDS[g.cat].name, discussMs: g.discussMs, guess: g.guess,
        host: g.host, hostName: g.hostName, round: r?.n ?? 0, left: g.phaseEnd ? Math.max(0, g.phaseEnd - t) : null,
        players: g.players.map((p) => ({ id: p.id, name: p.name, score: p.score, me: p.id === uid, avatar: this.av(p.id), voted: !!r && g.phase === 'vote' && !!r.votes[p.id],
          votes: open && r ? Object.values(r.votes).filter((v) => v === p.id).length : 0, spy: open && r ? r.spies.includes(p.id) : false })),
        ask, votedCount, minPlayers: this.minPlayers(g), prizeAmount: SPY_PRIZE, prizes: g.phase === 'done' ? g.prizes : [],
        myVote: r?.votes[uid] ?? null,
        options: g.phase === 'guess' && amSpy ? r!.options : null,
        result: open && r ? { word: r.word, cat: SPY_WORDS[r.cat].name, spies: r.spies.map((s) => g.players.find((p) => p.id === s)?.name ?? ''), accused: r.accused ? g.players.find((p) => p.id === r.accused)?.name ?? '' : null, caught: r.caught, guess: r.guess, guessed: r.guessed, winner: r.winner } : null,
        guessing: g.phase === 'guess' && r ? r.spies.map((s) => g.players.find((p) => p.id === s)?.name ?? '').join(' و ') : null,
      },
      role: myRole,
      me: { joined, host: isHost, spy: amSpy },
      can: {
        create: false, join: g.phase === 'lobby' && !joined && g.players.length < MAX_PLAYERS, leave: g.phase === 'lobby' && joined && !isHost,
        settings: g.phase === 'lobby' && isHost, start: g.phase === 'lobby' && isHost && g.players.length >= this.minPlayers(g),
        vote: g.phase === 'vote' && joined, skip: (isHost || mod) && g.phase === 'discuss', guess: g.phase === 'guess' && amSpy && !r!.guess,
        cancel: (isHost || mod) && g.phase !== 'done', again: (isHost || mod) && g.phase === 'done',
      },
    };
  }
  create(roomId: string, uid: string, members: string[], mod: boolean) {
    need(mod, 'لعبة الجاسوس يسويها صاحب الغرفة أو المشرفين بس.'); this.tick(roomId);
    const cur = this.games.get(roomId); need(!cur || cur.phase === 'done', 'فيه لعبة جاسوس شغالة بالغرفة.'); need(members.includes(uid), 'لازم تكون داخل الغرفة.');
    const t = this.now(), name = this.deps.name(uid) || 'لاعب';
    const g: Game = { id: randomUUID().slice(0, 10), room: roomId, host: uid, hostName: name, mode: 'one', rounds: 3, cat: 'places', discussMs: 90000, guess: true,
      phase: 'lobby', players: [{ id: uid, name, score: 0 }], round: null, history: [], phaseEnd: 0, phaseStart: 0, order: [], usedWords: [], prizes: [], createdAt: t, updatedAt: t };
    this.games.set(roomId, g); this.ping(g);
  }
  private game(roomId: string) { this.tick(roomId); const g = this.games.get(roomId); need(g, 'ما فيه لعبة جاسوس بالغرفة.'); return g!; }
  join(roomId: string, uid: string) {
    const g = this.game(roomId); need(g.phase === 'lobby', 'اللعبة بدت، انتظر الجاية.'); need(!g.players.some((p) => p.id === uid), 'أنت داخل اللعبة.');
    need(g.players.length < MAX_PLAYERS, `اللعبة لـ ${MAX_PLAYERS} لاعبين بس.`); g.players.push({ id: uid, name: this.deps.name(uid) || 'لاعب', score: 0 }); this.ping(g);
  }
  leave(roomId: string, uid: string) { const g = this.game(roomId); need(g.phase === 'lobby', 'ما تقدر تطلع بنص اللعبة.'); need(g.host !== uid, 'أنت المضيف، الغِ اللعبة بدال.'); g.players = g.players.filter((p) => p.id !== uid); this.ping(g); }
  settings(roomId: string, uid: string, b: Record<string, unknown>) {
    const g = this.game(roomId); need(g.host === uid, 'الإعدادات للمضيف بس.'); need(g.phase === 'lobby', 'اللعبة بدت.');
    if (b.mode !== undefined) { need(b.mode === 'one' || b.mode === 'two', 'وضع غير صالح.'); g.mode = b.mode as 'one' | 'two'; }
    if (b.rounds !== undefined) { need(ROUNDS.includes(Number(b.rounds)), 'عدد غير صالح.'); g.rounds = Number(b.rounds); }
    if (b.cat !== undefined) { need(SPY_CATEGORIES.includes(String(b.cat)), 'نوع غير صالح.'); g.cat = String(b.cat); }
    if (b.discussMs !== undefined) { need(DISCUSS.includes(Number(b.discussMs)), 'وقت غير صالح.'); g.discussMs = Number(b.discussMs); }
    if (b.guess !== undefined) { need(typeof b.guess === 'boolean', 'قيمة غير صالحة.'); g.guess = b.guess as boolean; }
    this.ping(g);
  }
  start(roomId: string, uid: string, members: string[]) {
    const g = this.game(roomId); need(g.host === uid, 'البداية للمضيف بس.'); need(g.phase === 'lobby', 'اللعبة بدت.');
    g.players = g.players.filter((p) => members.includes(p.id)); need(g.players.length >= this.minPlayers(g), g.mode === 'two' ? 'وضع الجاسوسين يبي 5 لاعبين على الأقل.' : 'لازم 3 لاعبين على الأقل.');
    for (const p of g.players) p.score = 0; g.history = []; g.round = null; g.usedWords = []; this.newRound(g, this.now()); this.ping(g);
  }
  skip(roomId: string, uid: string, mod: boolean) { const g = this.game(roomId); need(g.host === uid || mod, 'للمضيف بس.'); need(g.phase === 'discuss', 'مو وقت النقاش.'); const t = this.now(); g.phase = 'vote'; g.phaseStart = t; g.phaseEnd = t + VOTE_MS; this.ping(g); }
  vote(roomId: string, uid: string, target: unknown) {
    const g = this.game(roomId); need(g.phase === 'vote', 'التصويت مو شغال.'); need(g.players.some((p) => p.id === uid), 'أنت مو لاعب بهالجولة.');
    const id = String(target ?? ''); need(g.players.some((p) => p.id === id), 'اختيار غير صالح.'); need(id !== uid, 'ما تقدر تصوت على نفسك 😄');
    g.round!.votes[uid] = id;
    if (g.players.every((p) => g.round!.votes[p.id])) this.closeVote(g, this.now());
    this.ping(g);
  }
  guess(roomId: string, uid: string, word: unknown) {
    const g = this.game(roomId); const r = g.round!; need(g.phase === 'guess', 'مو وقت التخمين.'); need(r.spies.includes(uid), 'التخمين للجاسوس بس.'); need(!r.guess, 'خمنت من قبل.');
    const w = String(word ?? ''); need(r.options.includes(w), 'اختيار غير صالح.'); r.guess = w; r.guessed = w === r.word; this.settle(g, this.now()); this.ping(g);
  }
  cancel(roomId: string, uid: string, mod: boolean) { const g = this.game(roomId); need(g.host === uid || mod, 'الإلغاء للمضيف أو المشرف.'); this.games.delete(roomId); try { this.deps.notify(g.players.map((p) => p.id), roomId); } catch { /* */ } }
  again(roomId: string, uid: string, mod: boolean, members: string[]) {
    const g = this.game(roomId); need(g.phase === 'done', 'اللعبة ما خلصت.'); need(g.host === uid || mod, 'للمضيف بس.');
    g.phase = 'lobby'; g.round = null; g.history = []; g.prizes = []; g.players = g.players.filter((p) => members.includes(p.id)).map((p) => ({ ...p, score: 0 })); this.ping(g);
  }
}
