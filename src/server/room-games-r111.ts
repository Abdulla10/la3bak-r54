/* R111: ألعاب الغرف الصوتية الجديدة — «ذئب الليل»، «أسرع جواب»، «من سيربح المليون».
 * كل شي بالخادم: الأدوار سرية، الأسئلة والإجابات الصح ما تطلع للمتصفح لين وقتها، والجوائز تنصرف من الخادم. */
import { randomUUID, randomInt } from 'node:crypto';
import { byLevel, type Q } from './qbank-r111.js';

export class RoomGameError extends Error { constructor(message: string, public status = 409) { super(message); } }
const need = (c: unknown, msg: string): void => { if (!c) throw new RoomGameError(msg); };
const shuffle = <T>(a: T[]) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = randomInt(i + 1); [x[i], x[j]] = [x[j], x[i]]; } return x; };
type Deps = { prize?: (winner: string, amount: number, gameId: string, why: string) => number; name: (id: string) => string; avatar?: (id: string) => string | null; notify: (ids: string[], room: string) => void; now?: () => number };
const LOBBY_TTL = 20 * 60_000, DONE_TTL = 5 * 60_000;

abstract class Base<G extends { id: string; room: string; host: string; phase: string; updatedAt: number; players: { id: string; name: string }[] }> {
  protected games = new Map<string, G>();
  protected now: () => number;
  constructor(protected deps: Deps) { this.now = deps.now ?? Date.now; }
  protected av(id: string) { try { const a = this.deps.avatar?.(id); return typeof a === 'string' && a ? a : null; } catch { return null; } }
  protected ping(g: G, extra: string[] = []) { g.updatedAt = this.now(); try { this.deps.notify([...g.players.map((p) => p.id), g.host, ...extra], g.room); } catch { /* */ } }
  protected game(room: string) { this.tick(room); const g = this.games.get(room); need(g, 'ما فيه لعبة شغالة بالغرفة.'); return g!; }
  protected pay(winner: string, amt: number, gid: string, why: string) { try { return this.deps.prize?.(winner, amt, gid, why) ?? 0; } catch { return 0; } }
  protected expire(g: G, t: number) { if ((g.phase === 'lobby' && t - g.updatedAt > LOBBY_TTL) || (g.phase === 'done' && t - g.updatedAt > DONE_TTL)) { this.games.delete(g.room); return true; } return false; }
  abstract tick(room?: string): void;
  cancel(room: string, uid: string, mod: boolean) { const g = this.game(room); need(g.host === uid || mod, 'الإلغاء للمضيف أو المشرف.'); this.games.delete(room); try { this.deps.notify(g.players.map((p) => p.id), room); } catch { /* */ } }
  liveRooms() { return [...this.games.values()].filter((g) => g.phase !== 'done').map((g) => g.room); }
}

/* ======================= ذئب الليل ======================= */
type WRole = 'wolf' | 'doctor' | 'seer' | 'villager';
type WPlayer = { id: string; name: string; role: WRole; alive: boolean };
type WGame = {
  id: string; room: string; host: string; hostName: string; phase: 'lobby' | 'reveal' | 'night' | 'dawn' | 'day' | 'vote' | 'verdict' | 'done';
  players: WPlayer[]; day: number; dayMs: number; phaseEnd: number; updatedAt: number;
  night: { kills: Record<string, string>; save: string | null; seen: string | null }; lastSave: string | null;
  seerLog: { id: string; name: string; wolf: boolean }[]; votes: Record<string, string>;
  news: { kind: 'killed' | 'saved' | 'quiet' | 'lynched' | 'tie'; name?: string; role?: WRole } | null; winner: 'wolves' | 'village' | null; prizes: { id: string; name: string; amt: number }[];
};
export const WOLF_PRIZE = 5000;
const W_REVEAL = 9000, W_NIGHT = 35000, W_DAWN = 7000, W_VOTE = 35000, W_VERDICT = 8000;
export class WolfGames extends Base<WGame> {
  private wolvesFor(n: number) { return n >= 10 ? 3 : n >= 7 ? 2 : 1; }
  private alive(g: WGame) { return g.players.filter((p) => p.alive); }
  private set(g: WGame, phase: WGame['phase'], ms: number) { g.phase = phase; g.phaseEnd = ms ? this.now() + ms : 0; }
  private checkWin(g: WGame) {
    const a = this.alive(g), w = a.filter((p) => p.role === 'wolf').length;
    if (w === 0) g.winner = 'village'; else if (w >= a.length - w) g.winner = 'wolves';
    if (!g.winner) return false;
    this.set(g, 'done', 0); g.prizes = [];
    if (g.players.length >= 5) for (const p of g.players) if ((p.role === 'wolf') === (g.winner === 'wolves')) g.prizes.push({ id: p.id, name: p.name, amt: this.pay(p.id, WOLF_PRIZE, g.id, 'فوز بلعبة ذئب الليل 🐺') });
    return true;
  }
  private endNight(g: WGame) {
    const tally = new Map<string, number>(); for (const v of Object.values(g.night.kills)) tally.set(v, (tally.get(v) ?? 0) + 1);
    const top = Math.max(0, ...tally.values()); const tied = [...tally].filter(([, n]) => n === top).map(([id]) => id);
    const victim = tied.length ? tied[randomInt(tied.length)] : null;
    g.lastSave = g.night.save;
    if (victim && victim === g.night.save) g.news = { kind: 'saved' };
    else if (victim) { const p = g.players.find((x) => x.id === victim)!; p.alive = false; g.news = { kind: 'killed', name: p.name, role: p.role }; }
    else g.news = { kind: 'quiet' };
    if (!this.checkWin(g)) this.set(g, 'dawn', W_DAWN);
  }
  private endVote(g: WGame) {
    const tally = new Map<string, number>(); for (const v of Object.values(g.votes)) tally.set(v, (tally.get(v) ?? 0) + 1);
    let best: string | null = null, top = 0, tie = false; for (const [id, n] of tally) { if (n > top) { top = n; best = id; tie = false; } else if (n === top) tie = true; }
    if (best && !tie) { const p = g.players.find((x) => x.id === best)!; p.alive = false; g.news = { kind: 'lynched', name: p.name, role: p.role }; } else g.news = { kind: 'tie' };
    if (!this.checkWin(g)) this.set(g, 'verdict', W_VERDICT);
  }
  private startNight(g: WGame) { g.day++; g.night = { kills: {}, save: null, seen: null }; g.votes = {}; this.set(g, 'night', W_NIGHT); }
  private nightDone(g: WGame) {
    const a = this.alive(g); const wolves = a.filter((p) => p.role === 'wolf');
    const doc = a.find((p) => p.role === 'doctor'), seer = a.find((p) => p.role === 'seer');
    return wolves.every((w) => g.night.kills[w.id]) && (!doc || g.night.save) && (!seer || g.night.seen);
  }
  tick(room?: string) {
    const t = this.now();
    for (const g of room ? [this.games.get(room)].filter(Boolean) as WGame[] : [...this.games.values()]) {
      if (this.expire(g, t) || g.phase === 'lobby' || g.phase === 'done' || t < g.phaseEnd) continue;
      if (g.phase === 'reveal') this.startNight(g);
      else if (g.phase === 'night') this.endNight(g);
      else if (g.phase === 'dawn') this.set(g, 'day', g.dayMs);
      else if (g.phase === 'day') { g.votes = {}; this.set(g, 'vote', W_VOTE); }
      else if (g.phase === 'vote') this.endVote(g);
      else if (g.phase === 'verdict') this.startNight(g);
      this.ping(g);
    }
  }
  view(room: string, uid: string, mod: boolean) {
    this.tick(room); const g = this.games.get(room); const t = this.now();
    if (!g) return { game: null, can: { create: mod } };
    const me = g.players.find((p) => p.id === uid), done = g.phase === 'done', isHost = g.host === uid;
    const night = g.phase === 'night' && me?.alive;
    const wolfMate = me?.role === 'wolf';
    return {
      game: {
        id: g.id, phase: g.phase, day: g.day, host: g.host, hostName: g.hostName, dayMs: g.dayMs, left: g.phaseEnd ? Math.max(0, g.phaseEnd - t) : null,
        players: g.players.map((p) => ({ id: p.id, name: p.name, avatar: this.av(p.id), me: p.id === uid, alive: p.alive,
          role: done || !p.alive || p.id === uid || (wolfMate && p.role === 'wolf') ? p.role : null,
          voted: g.phase === 'vote' && !!g.votes[p.id], votes: g.phase === 'verdict' || done ? Object.values(g.votes).filter((v) => v === p.id).length : 0,
          wolfPick: wolfMate && g.phase === 'night' ? Object.entries(g.night.kills).filter(([, v]) => v === p.id).length : 0 })),
        news: g.phase === 'dawn' || g.phase === 'verdict' || g.phase === 'day' || done ? g.news : null, winner: g.winner, prizes: done ? g.prizes : [], prizeAmount: WOLF_PRIZE,
        wolves: this.wolvesFor(Math.max(5, g.players.length)), minPlayers: 5, maxPlayers: 12,
        myVote: g.votes[uid] ?? null, votedCount: Object.keys(g.votes).length, aliveCount: this.alive(g).length,
        myNight: night ? (me!.role === 'wolf' ? g.night.kills[uid] ?? null : me!.role === 'doctor' ? g.night.save : me!.role === 'seer' ? g.night.seen : null) : null,
        lastSave: me?.role === 'doctor' ? g.lastSave : null,
        seerLog: me?.role === 'seer' ? g.seerLog : [],
      },
      me: { joined: !!me, host: isHost, role: g.phase === 'lobby' ? null : me?.role ?? null, alive: !!me?.alive },
      can: {
        create: false, join: g.phase === 'lobby' && !me && g.players.length < 12, leave: g.phase === 'lobby' && !!me && !isHost, settings: g.phase === 'lobby' && isHost,
        start: g.phase === 'lobby' && isHost && g.players.length >= 5,
        night: !!night && me!.role !== 'villager', vote: g.phase === 'vote' && !!me?.alive, skip: (isHost || mod) && g.phase === 'day',
        cancel: (isHost || mod) && g.phase !== 'done', again: (isHost || mod) && done,
      },
    };
  }
  create(room: string, uid: string, members: string[], mod: boolean) {
    need(mod, 'ذئب الليل يسويها صاحب الغرفة أو المشرفين.'); this.tick(room); const cur = this.games.get(room); need(!cur || cur.phase === 'done', 'فيه لعبة شغالة بالغرفة.'); need(members.includes(uid), 'لازم تكون داخل الغرفة.');
    const name = this.deps.name(uid) || 'لاعب', t = this.now();
    this.games.set(room, { id: randomUUID().slice(0, 10), room, host: uid, hostName: name, phase: 'lobby', players: [{ id: uid, name, role: 'villager', alive: true }], day: 0, dayMs: 90000, phaseEnd: 0, updatedAt: t,
      night: { kills: {}, save: null, seen: null }, lastSave: null, seerLog: [], votes: {}, news: null, winner: null, prizes: [] });
    this.ping(this.games.get(room)!);
  }
  join(room: string, uid: string) { const g = this.game(room); need(g.phase === 'lobby', 'اللعبة بدت.'); need(!g.players.some((p) => p.id === uid), 'أنت داخل.'); need(g.players.length < 12, 'اللعبة لـ 12 لاعب بس.'); g.players.push({ id: uid, name: this.deps.name(uid) || 'لاعب', role: 'villager', alive: true }); this.ping(g); }
  leave(room: string, uid: string) { const g = this.game(room); need(g.phase === 'lobby', 'ما تقدر تطلع بنص اللعبة.'); need(g.host !== uid, 'أنت المضيف، الغِ اللعبة.'); g.players = g.players.filter((p) => p.id !== uid); this.ping(g); }
  settings(room: string, uid: string, b: Record<string, unknown>) { const g = this.game(room); need(g.host === uid && g.phase === 'lobby', 'الإعدادات للمضيف قبل البداية.'); if (b.dayMs !== undefined) { need([60000, 90000, 120000, 180000].includes(Number(b.dayMs)), 'وقت غير صالح.'); g.dayMs = Number(b.dayMs); } this.ping(g); }
  start(room: string, uid: string, members: string[]) {
    const g = this.game(room); need(g.host === uid && g.phase === 'lobby', 'البداية للمضيف.');
    g.players = g.players.filter((p) => members.includes(p.id)); need(g.players.length >= 5, 'ذئب الليل يبي 5 لاعبين على الأقل.');
    const ids = shuffle(g.players.map((p) => p.id)), w = this.wolvesFor(ids.length);
    const role = new Map<string, WRole>(); ids.forEach((id, i) => role.set(id, i < w ? 'wolf' : i === w ? 'doctor' : i === w + 1 ? 'seer' : 'villager'));
    for (const p of g.players) { p.role = role.get(p.id)!; p.alive = true; }
    Object.assign(g, { day: 0, seerLog: [], votes: {}, news: null, winner: null, prizes: [], lastSave: null }); this.set(g, 'reveal', W_REVEAL); this.ping(g);
  }
  act(room: string, uid: string, target: unknown) {
    const g = this.game(room); need(g.phase === 'night', 'مو وقت الليل.'); const me = g.players.find((p) => p.id === uid); need(me?.alive, 'أنت مو لاعب حي.');
    const p = g.players.find((x) => x.id === String(target ?? '')); need(p?.alive, 'اختيار غير صالح.');
    if (me!.role === 'wolf') { need(p!.role !== 'wolf', 'ما تقدر تختار ذيب مثلك.'); g.night.kills[uid] = p!.id; }
    else if (me!.role === 'doctor') { need(p!.id !== g.lastSave, 'ما تقدر تحمي نفس الشخص ليلتين ورا بعض.'); g.night.save = p!.id; }
    else if (me!.role === 'seer') { need(!g.night.seen, 'كشفت شخص الليلة.'); need(p!.id !== uid, 'اختر غيرك.'); g.night.seen = p!.id; g.seerLog.push({ id: p!.id, name: p!.name, wolf: p!.role === 'wolf' }); }
    else throw new RoomGameError('القروي ينام بالليل 😴');
    if (this.nightDone(g)) g.phaseEnd = Math.min(g.phaseEnd, this.now() + 2500);
    this.ping(g);
  }
  vote(room: string, uid: string, target: unknown) {
    const g = this.game(room); need(g.phase === 'vote', 'التصويت مو شغال.'); const me = g.players.find((p) => p.id === uid); need(me?.alive, 'الأموات ما يصوتون 👻');
    const p = g.players.find((x) => x.id === String(target ?? '')); need(p?.alive && p.id !== uid, 'اختيار غير صالح.'); g.votes[uid] = p!.id;
    if (this.alive(g).every((x) => g.votes[x.id])) g.phaseEnd = Math.min(g.phaseEnd, this.now() + 1500);
    this.ping(g);
  }
  skip(room: string, uid: string, mod: boolean) { const g = this.game(room); need(g.host === uid || mod, 'للمضيف بس.'); need(g.phase === 'day', 'مو وقت النقاش.'); g.votes = {}; this.set(g, 'vote', W_VOTE); this.ping(g); }
  again(room: string, uid: string, mod: boolean, members: string[]) { const g = this.game(room); need(g.phase === 'done' && (g.host === uid || mod), 'للمضيف بعد نهاية اللعبة.'); g.players = g.players.filter((p) => members.includes(p.id)).map((p) => ({ ...p, alive: true, role: 'villager' as WRole })); Object.assign(g, { phase: 'lobby', winner: null, prizes: [], news: null, phaseEnd: 0 }); this.ping(g); }
}

/* ======================= أسرع جواب ======================= */
type FPlayer = { id: string; name: string; score: number; streak: number };
type FGame = {
  id: string; room: string; host: string; hostName: string; phase: 'lobby' | 'ready' | 'question' | 'reveal' | 'done'; players: FPlayer[];
  count: number; idx: number; qs: Q[]; order: number[][]; askedAt: number; phaseEnd: number; updatedAt: number;
  answers: Record<string, { pick: number; ms: number; pts: number }>; fastest: string | null; prizes: { id: string; name: string; amt: number }[];
};
export const FAST_PRIZE = 10000;
const F_READY = 4000, F_Q = 12000, F_REVEAL = 5000;
export class FastGames extends Base<FGame> {
  private set(g: FGame, phase: FGame['phase'], ms: number) { g.phase = phase; g.phaseEnd = ms ? this.now() + ms : 0; }
  private ask(g: FGame) { g.answers = {}; g.fastest = null; g.askedAt = this.now(); this.set(g, 'question', F_Q); }
  private reveal(g: FGame) { this.set(g, 'reveal', F_REVEAL); }
  private finish(g: FGame) {
    this.set(g, 'done', 0); g.prizes = []; const top = Math.max(0, ...g.players.map((p) => p.score)); if (top <= 0 || g.players.length < 2) return;
    const ws = g.players.filter((p) => p.score === top), each = Math.floor(FAST_PRIZE / ws.length);
    for (const w of ws) g.prizes.push({ id: w.id, name: w.name, amt: g.players.length >= 3 ? this.pay(w.id, each, g.id, 'فوز بلعبة أسرع جواب ⚡') : 0 });
  }
  tick(room?: string) {
    const t = this.now();
    for (const g of room ? [this.games.get(room)].filter(Boolean) as FGame[] : [...this.games.values()]) {
      if (this.expire(g, t) || g.phase === 'lobby' || g.phase === 'done' || t < g.phaseEnd) continue;
      if (g.phase === 'ready') this.ask(g);
      else if (g.phase === 'question') this.reveal(g);
      else if (g.phase === 'reveal') { g.idx++; if (g.idx >= g.count) this.finish(g); else this.ask(g); }
      this.ping(g);
    }
  }
  view(room: string, uid: string, mod: boolean) {
    this.tick(room); const g = this.games.get(room); const t = this.now();
    if (!g) return { game: null, can: { create: mod } };
    const me = g.players.find((p) => p.id === uid), isHost = g.host === uid, q = g.qs[g.idx], ord = g.order[g.idx];
    const showQ = (g.phase === 'question' || g.phase === 'reveal') && q;
    const shown = showQ ? ord.map((k) => q.o[k]) : null;
    const correct = g.phase === 'reveal' && q ? ord.indexOf(q.a) : null;
    const dist = g.phase === 'reveal' ? [0, 1, 2, 3].map((i) => Object.values(g.answers).filter((a) => a.pick === i).length) : null;
    return {
      game: {
        id: g.id, phase: g.phase, host: g.host, hostName: g.hostName, count: g.count, idx: g.idx, left: g.phaseEnd ? Math.max(0, g.phaseEnd - t) : null, qMs: F_Q,
        q: showQ ? q.q : null, options: shown, level: showQ ? q.lv : null, correct, dist, answered: Object.keys(g.answers).length,
        fastest: g.phase === 'reveal' && g.fastest ? g.players.find((p) => p.id === g.fastest)?.name ?? null : null,
        mine: g.answers[uid] ?? null,
        players: g.players.map((p) => ({ id: p.id, name: p.name, avatar: this.av(p.id), me: p.id === uid, score: p.score, streak: p.streak, done: !!g.answers[p.id], gain: g.phase === 'reveal' ? g.answers[p.id]?.pts ?? 0 : 0 })),
        prizes: g.phase === 'done' ? g.prizes : [], prizeAmount: FAST_PRIZE, minPlayers: 2,
      },
      me: { joined: !!me, host: isHost },
      can: { create: false, join: g.phase === 'lobby' && !me && g.players.length < 16, leave: g.phase === 'lobby' && !!me && !isHost, settings: g.phase === 'lobby' && isHost, start: g.phase === 'lobby' && isHost && g.players.length >= 2,
        answer: g.phase === 'question' && !!me && !g.answers[uid], cancel: (isHost || mod) && g.phase !== 'done', again: (isHost || mod) && g.phase === 'done' },
    };
  }
  create(room: string, uid: string, members: string[], mod: boolean) {
    need(mod, 'أسرع جواب يسويها صاحب الغرفة أو المشرفين.'); this.tick(room); const cur = this.games.get(room); need(!cur || cur.phase === 'done', 'فيه لعبة شغالة بالغرفة.'); need(members.includes(uid), 'لازم تكون داخل الغرفة.');
    const name = this.deps.name(uid) || 'لاعب';
    this.games.set(room, { id: randomUUID().slice(0, 10), room, host: uid, hostName: name, phase: 'lobby', players: [{ id: uid, name, score: 0, streak: 0 }], count: 10, idx: 0, qs: [], order: [], askedAt: 0, phaseEnd: 0, updatedAt: this.now(), answers: {}, fastest: null, prizes: [] });
    this.ping(this.games.get(room)!);
  }
  join(room: string, uid: string) { const g = this.game(room); need(g.phase === 'lobby', 'اللعبة بدت.'); need(!g.players.some((p) => p.id === uid), 'أنت داخل.'); need(g.players.length < 16, 'اللعبة لـ 16 لاعب.'); g.players.push({ id: uid, name: this.deps.name(uid) || 'لاعب', score: 0, streak: 0 }); this.ping(g); }
  leave(room: string, uid: string) { const g = this.game(room); need(g.phase === 'lobby', 'ما تقدر تطلع بنص اللعبة.'); need(g.host !== uid, 'أنت المضيف.'); g.players = g.players.filter((p) => p.id !== uid); this.ping(g); }
  settings(room: string, uid: string, b: Record<string, unknown>) { const g = this.game(room); need(g.host === uid && g.phase === 'lobby', 'الإعدادات للمضيف.'); if (b.count !== undefined) { need([5, 10, 15, 20].includes(Number(b.count)), 'عدد غير صالح.'); g.count = Number(b.count); } this.ping(g); }
  start(room: string, uid: string, members: string[]) {
    const g = this.game(room); need(g.host === uid && g.phase === 'lobby', 'البداية للمضيف.'); g.players = g.players.filter((p) => members.includes(p.id)); need(g.players.length >= 2, 'لازم لاعبين على الأقل.');
    const n = g.count, e = Math.ceil(n * 0.4), m = Math.ceil(n * 0.35), h = n - e - m;
    g.qs = [...shuffle(byLevel(1)).slice(0, e), ...shuffle(byLevel(2)).slice(0, m), ...shuffle(byLevel(3)).slice(0, Math.max(0, h))];
    g.order = g.qs.map(() => shuffle([0, 1, 2, 3])); g.idx = 0; for (const p of g.players) { p.score = 0; p.streak = 0; }
    this.set(g, 'ready', F_READY); this.ping(g);
  }
  answer(room: string, uid: string, pick: unknown) {
    const g = this.game(room); need(g.phase === 'question', 'مو وقت الجواب.'); const me = g.players.find((p) => p.id === uid); need(me, 'أنت مو لاعب.'); need(!g.answers[uid], 'جاوبت.');
    const i = Number(pick); need(Number.isInteger(i) && i >= 0 && i < 4, 'اختيار غير صالح.');
    const ms = this.now() - g.askedAt, q = g.qs[g.idx], ok = g.order[g.idx][i] === q.a;
    let pts = 0;
    if (ok) { pts = 100 + Math.max(0, Math.round((F_Q - ms) / 60)) + q.lv * 20; if (!g.fastest) { g.fastest = uid; pts += 50; } me!.streak++; if (me!.streak >= 3) pts += 30; } else me!.streak = 0;
    me!.score += pts; g.answers[uid] = { pick: i, ms, pts };
    if (g.players.every((p) => g.answers[p.id])) g.phaseEnd = Math.min(g.phaseEnd, this.now() + 800);
    this.ping(g);
  }
  again(room: string, uid: string, mod: boolean, members: string[]) { const g = this.game(room); need(g.phase === 'done' && (g.host === uid || mod), 'للمضيف بعد النهاية.'); g.players = g.players.filter((p) => members.includes(p.id)).map((p) => ({ ...p, score: 0, streak: 0 })); Object.assign(g, { phase: 'lobby', prizes: [], idx: 0, phaseEnd: 0 }); this.ping(g); }
}

/* ======================= من سيربح المليون ======================= */
export const MIL_LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
const SAFE = [4, 9]; // ضمان 1,000 و 32,000
type MGame = {
  id: string; room: string; host: string; hostName: string; phase: 'lobby' | 'intro' | 'question' | 'locked' | 'reveal' | 'done';
  players: { id: string; name: string }[]; seat: string | null; seatName: string; level: number; q: Q | null; order: number[]; used: string[];
  hidden: number[]; pick: number | null; life: { fifty: boolean; audience: boolean; swap: boolean }; poll: { endsAt: number; votes: Record<string, number>; result: number[] | null; real: number } | null;
  phaseEnd: number; updatedAt: number; result: { won: number; reason: 'walk' | 'wrong' | 'win' | 'timeout' } | null; paid: number;
};
const M_INTRO = 5000, M_LOCK = 3500, M_REVEAL = 3500, M_POLL = 20000;
const qTime = (lv: number) => (lv < 5 ? 30000 : lv < 10 ? 45000 : 60000);
export class MillionGames extends Base<MGame> {
  private set(g: MGame, phase: MGame['phase'], ms: number) { g.phase = phase; g.phaseEnd = ms ? this.now() + ms : 0; }
  private safeAmount(level: number) { let s = 0; for (const k of SAFE) if (level > k) s = MIL_LADDER[k]; return s; }
  private nextQ(g: MGame) {
    const lv: 1 | 2 | 3 = g.level < 5 ? 1 : g.level < 10 ? 2 : 3;
    const pool = byLevel(lv).filter((x) => !g.used.includes(x.q)); const q = (pool.length ? pool : byLevel(lv))[randomInt((pool.length ? pool : byLevel(lv)).length)];
    g.used.push(q.q); g.q = q; g.order = shuffle([0, 1, 2, 3]); g.hidden = []; g.pick = null; g.poll = null; this.set(g, 'question', qTime(g.level));
  }
  private end(g: MGame, won: number, reason: NonNullable<MGame['result']>['reason']) {
    g.result = { won, reason }; this.set(g, 'done', 0);
    g.paid = won > 0 && g.seat ? this.pay(g.seat, won, g.id, `من سيربح المليون 💰 (${won.toLocaleString('en-US')})`) : 0;
  }
  private closePoll(g: MGame) {
    const p = g.poll; if (!p || p.result) return; const counts = [0, 0, 0, 0]; for (const v of Object.values(p.votes)) counts[v]++;
    p.real = Object.keys(p.votes).length;
    // لو الجمهور قليل (أقل من 3) نكمّل بجمهور الاستوديو الافتراضي: يميل للصح أكثر بالأسئلة السهلة
    if (p.real < 3) {
      const right = g.order.indexOf(g.q!.a), lean = g.level < 5 ? 0.62 : g.level < 10 ? 0.45 : 0.32, n = 100;
      for (let i = 0; i < n; i++) { const vis = [0, 1, 2, 3].filter((k) => !g.hidden.includes(k)); counts[Math.random() < lean ? right : vis[randomInt(vis.length)]]++; }
    }
    const sum = counts.reduce((a, b) => a + b, 0) || 1; p.result = counts.map((c) => Math.round((c / sum) * 100));
  }
  tick(room?: string) {
    const t = this.now();
    for (const g of room ? [this.games.get(room)].filter(Boolean) as MGame[] : [...this.games.values()]) {
      if (this.expire(g, t)) continue;
      if (g.poll && !g.poll.result && t >= g.poll.endsAt) { this.closePoll(g); this.ping(g); }
      if (g.phase === 'lobby' || g.phase === 'done' || t < g.phaseEnd) continue;
      if (g.phase === 'intro') this.nextQ(g);
      else if (g.phase === 'question') this.end(g, this.safeAmount(g.level), 'timeout');
      else if (g.phase === 'locked') this.set(g, 'reveal', M_REVEAL);
      else if (g.phase === 'reveal') {
        const right = g.order[g.pick!] === g.q!.a;
        if (!right) this.end(g, this.safeAmount(g.level), 'wrong');
        else if (g.level >= MIL_LADDER.length - 1) this.end(g, MIL_LADDER[MIL_LADDER.length - 1], 'win');
        else { g.level++; this.nextQ(g); }
      }
      this.ping(g);
    }
  }
  view(room: string, uid: string, mod: boolean) {
    this.tick(room); const g = this.games.get(room); const t = this.now();
    if (!g) return { game: null, can: { create: mod } };
    const isSeat = g.seat === uid, isHost = g.host === uid, q = g.q, live = g.phase === 'question' || g.phase === 'locked' || g.phase === 'reveal';
    const reveal = g.phase === 'reveal' || (g.phase === 'done' && !!q && g.result?.reason !== 'walk');
    return {
      game: {
        id: g.id, phase: g.phase, host: g.host, hostName: g.hostName, seat: g.seat, seatName: g.seatName, level: g.level, ladder: MIL_LADDER, safe: SAFE,
        left: g.phaseEnd ? Math.max(0, g.phaseEnd - t) : null, qMs: qTime(g.level),
        q: live || g.phase === 'done' ? q?.q ?? null : null, options: (live || g.phase === 'done') && q ? g.order.map((k, i) => (g.hidden.includes(i) ? '' : q.o[k])) : null,
        hidden: g.hidden, pick: g.pick, correct: reveal && q ? g.order.indexOf(q.a) : null, life: g.life,
        poll: g.poll ? { left: Math.max(0, g.poll.endsAt - t), result: g.poll.result, votes: Object.keys(g.poll.votes).length, real: g.poll.real, mine: g.poll.votes[uid] ?? null } : null,
        players: g.players.map((p) => ({ id: p.id, name: p.name, avatar: this.av(p.id), me: p.id === uid, seat: p.id === g.seat })),
        safeNow: this.safeAmount(g.level), current: g.level > 0 ? MIL_LADDER[g.level - 1] : 0, result: g.result, paid: g.phase === 'done' ? g.paid : 0,
        seatAvatar: g.seat ? this.av(g.seat) : null,
      },
      me: { seat: isSeat, host: isHost, joined: g.players.some((p) => p.id === uid) },
      can: {
        create: false, volunteer: g.phase === 'lobby' && !g.seat, unseat: g.phase === 'lobby' && (isSeat || isHost) && !!g.seat, start: g.phase === 'lobby' && (isHost || isSeat) && !!g.seat,
        answer: g.phase === 'question' && isSeat, walk: g.phase === 'question' && isSeat && g.level > 0,
        fifty: g.phase === 'question' && isSeat && !g.life.fifty, audience: g.phase === 'question' && isSeat && !g.life.audience, swap: g.phase === 'question' && isSeat && !g.life.swap,
        vote: !!g.poll && !g.poll.result && !isSeat && g.poll.votes[uid] === undefined, cancel: (isHost || mod) && g.phase !== 'done', again: (isHost || mod || isSeat) && g.phase === 'done',
      },
    };
  }
  create(room: string, uid: string, members: string[], mod: boolean) {
    need(mod, 'من سيربح المليون يسويها صاحب الغرفة أو المشرفين.'); this.tick(room); const cur = this.games.get(room); need(!cur || cur.phase === 'done', 'فيه لعبة شغالة بالغرفة.'); need(members.includes(uid), 'لازم تكون داخل الغرفة.');
    const name = this.deps.name(uid) || 'لاعب';
    this.games.set(room, { id: randomUUID().slice(0, 10), room, host: uid, hostName: name, phase: 'lobby', players: [{ id: uid, name }], seat: null, seatName: '', level: 0, q: null, order: [0, 1, 2, 3], used: [], hidden: [], pick: null,
      life: { fifty: false, audience: false, swap: false }, poll: null, phaseEnd: 0, updatedAt: this.now(), result: null, paid: 0 });
    this.ping(this.games.get(room)!);
  }
  private seen(g: MGame, uid: string) { if (!g.players.some((p) => p.id === uid)) g.players.push({ id: uid, name: this.deps.name(uid) || 'لاعب' }); }
  volunteer(room: string, uid: string) { const g = this.game(room); need(g.phase === 'lobby', 'اللعبة بدت.'); need(!g.seat, 'فيه متسابق بالكرسي.'); this.seen(g, uid); g.seat = uid; g.seatName = this.deps.name(uid) || 'لاعب'; this.ping(g); }
  unseat(room: string, uid: string) { const g = this.game(room); need(g.phase === 'lobby' && (g.seat === uid || g.host === uid), 'ما تقدر.'); g.seat = null; g.seatName = ''; this.ping(g); }
  start(room: string, uid: string, members: string[]) {
    const g = this.game(room); need(g.phase === 'lobby' && (g.host === uid || g.seat === uid), 'البداية للمضيف أو المتسابق.'); need(g.seat && members.includes(g.seat), 'لازم متسابق داخل الغرفة.');
    Object.assign(g, { level: 0, used: [], life: { fifty: false, audience: false, swap: false }, result: null, paid: 0, poll: null }); this.set(g, 'intro', M_INTRO); this.ping(g);
  }
  private seatOnly(g: MGame, uid: string) { need(g.phase === 'question', 'مو وقت السؤال.'); need(g.seat === uid, 'هذا للمتسابق بالكرسي بس.'); }
  answer(room: string, uid: string, pick: unknown) { const g = this.game(room); this.seatOnly(g, uid); const i = Number(pick); need(Number.isInteger(i) && i >= 0 && i < 4 && !g.hidden.includes(i), 'اختيار غير صالح.'); g.pick = i; if (g.poll && !g.poll.result) this.closePoll(g); this.set(g, 'locked', M_LOCK); this.ping(g); }
  walk(room: string, uid: string) { const g = this.game(room); this.seatOnly(g, uid); need(g.level > 0, 'جاوب سؤال واحد على الأقل.'); this.end(g, MIL_LADDER[g.level - 1], 'walk'); this.ping(g); }
  fifty(room: string, uid: string) { const g = this.game(room); this.seatOnly(g, uid); need(!g.life.fifty, 'استخدمتها.'); g.life.fifty = true; const right = g.order.indexOf(g.q!.a); g.hidden = shuffle([0, 1, 2, 3].filter((i) => i !== right)).slice(0, 2); this.ping(g); }
  audience(room: string, uid: string) { const g = this.game(room); this.seatOnly(g, uid); need(!g.life.audience, 'استخدمتها.'); g.life.audience = true; g.poll = { endsAt: this.now() + M_POLL, votes: {}, result: null, real: 0 }; g.phaseEnd += M_POLL; this.ping(g); }
  swap(room: string, uid: string) { const g = this.game(room); this.seatOnly(g, uid); need(!g.life.swap, 'استخدمتها.'); g.life.swap = true; this.nextQ(g); this.ping(g); }
  vote(room: string, uid: string, pick: unknown) {
    const g = this.game(room); need(g.poll && !g.poll.result, 'تصويت الجمهور مو شغال.'); need(g.seat !== uid, 'المتسابق ما يصوت 😄'); need(g.poll!.votes[uid] === undefined, 'صوّتت.');
    const i = Number(pick); need(Number.isInteger(i) && i >= 0 && i < 4 && !g.hidden.includes(i), 'اختيار غير صالح.'); this.seen(g, uid); g.poll!.votes[uid] = i; this.ping(g);
  }
  again(room: string, uid: string, mod: boolean) { const g = this.game(room); need(g.phase === 'done' && (g.host === uid || mod || g.seat === uid), 'ما تقدر.'); Object.assign(g, { phase: 'lobby', seat: null, seatName: '', level: 0, q: null, result: null, poll: null, hidden: [], pick: null, phaseEnd: 0 }); this.ping(g); }
}
