/** R69: «الساحة» — ست ميزات بملف واحد محفوظ:
 *  1) ظرف الحظ بالغرف: أحد يرمي مبلغ، والحاضرين يتقاسمونه بأنصبة عشوائية (المقسوم يتحدد لحظة الرمي، والباقي يرجع لصاحبه).
 *  2) بطولات خروج المغلوب (4/8/16) برسوم دخول، والجايزة من مجموع الرسوم (70% للبطل و30% للوصيف).
 *  3) دوري أسبوعي بمستويات (برونز/فضة/ذهب/ماس): نقاط من الألعاب، صعود وهبوط آخر الأسبوع، وجوايز لأول ثلاثة بكل مستوى.
 *  4) المشاهدة المباشرة: (الحالة الحية بالذاكرة في index.ts — هنا بس التشجيع بالعملات).
 *  5) أغاني الغرفة: طابور يوتيوب صوتي (بالذاكرة؛ ما فيه فلوس).
 *  6) التحقق بخطوتين (TOTP، RFC 6238) لتسجيل الدخول.
 * كل الفلوس تمر بالمحفظة بمعرّفات ثابتة فما تتكرر. */
import { createHmac, randomBytes, randomInt } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export interface ArenaWallet {
  spend(id: string, amount: number, label: string, op: string): { ok: boolean; code?: string };
  grant(id: string, amount: number, label: string, op: string): boolean;
  balance(id: string): number;
}
export class ArenaError extends Error { constructor(message: string, public status = 409) { super(message); } }
const need = (ok: unknown, msg: string, status = 409): void => { if (!ok) throw new ArenaError(msg, status); };
const GULF = 4 * 3_600_000;

/* ======================= ظرف الحظ ======================= */
export const ENV_AMOUNTS = [500, 1000, 5000, 10000, 50000] as const;
export const ENV_COUNTS = [5, 10, 20] as const;
export const ENV_MS = 2 * 60_000;
type Env = { id: string; room: string; by: string; byName: string; total: number; shares: number[]; taken: { id: string; name: string; amt: number }[]; at: number; endsAt: number; settled: boolean };
/** يقسم المبلغ على n نصيب عشوائي (كل نصيب 1 على الأقل) */
export function splitShares(total: number, n: number): number[] {
  const w = Array.from({ length: n }, () => 1 + randomInt(1000));
  const sum = w.reduce((a, b) => a + b, 0);
  const out = w.map((x) => Math.max(1, Math.floor((x / sum) * total)));
  let diff = total - out.reduce((a, b) => a + b, 0);
  for (let i = 0; diff !== 0; i = (i + 1) % n) { if (diff > 0) { out[i]++; diff--; } else if (out[i] > 1) { out[i]--; diff++; } }
  return out;
}

/* ======================= البطولات ======================= */
export const TOUR_SIZES = [4, 8, 16] as const;
export const TOUR_FEES = [0, 100, 500, 1000, 5000] as const;
export const TOUR_OPEN_MS = 60 * 60_000; // ما اكتملت بساعة؟ تنلغي وترجع الرسوم
export const TOUR_MATCH_MS = 25 * 60_000; // مباراة ما خلصت بـ25 دقيقة؟ يتأهل واحد بالقرعة
type TPlayer = { id: string; name: string };
type TMatch = { a: string | null; b: string | null; code: string | null; winner: string | null; at: number; tries: number };
type Tour = { id: string; game: string; gameName: string; size: number; fee: number; by: string; createdAt: number; status: 'open' | 'running' | 'done' | 'cancelled'; players: TPlayer[]; rounds: TMatch[][]; winner: string | null; second: string | null; endedAt: number; left?: string[] };

/* ======================= الدوري ======================= */
export const LEAGUE_TIERS = ['برونز', 'فضة', 'ذهب', 'ماس'] as const;
export const LEAGUE_PRIZES = [[1000, 600, 300], [2000, 1200, 600], [4000, 2400, 1200], [8000, 5000, 2500]] as const;
export const LEAGUE_MOVE = 0.3; // أول 30% يصعدون، وآخر 30% ينزلون
/** مفتاح الأسبوع (يبدأ الأحد 00:00 بتوقيت الخليج) */
export function leagueWeekOf(ms: number): string { const d = new Date(ms + GULF); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); }
export function leagueWeekEnd(ms: number): number { const d = new Date(leagueWeekOf(ms) + 'T00:00:00Z'); return d.getTime() - GULF + 7 * 86_400_000; }
type League = { week: string; tier: Record<string, number>; pts: Record<string, number>; games: Record<string, number>; names: Record<string, string>; last: { week: string; res: Record<string, { tier: number; rank: number; move: -1 | 0 | 1; prize: number }> } | null };

/* ======================= التحقق بخطوتين ======================= */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function b32encode(buf: Buffer): string { let bits = 0, val = 0, out = ''; for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; return out; }
export function b32decode(s: string): Buffer { const clean = s.replace(/=+$/, '').toUpperCase(); let bits = 0, val = 0; const out: number[] = []; for (const c of clean) { const i = B32.indexOf(c); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); }
export function totp(secret: string, step: number): string {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', b32decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15; const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}
type TF = { secret: string; on: boolean; at: number; last: number; fails: number; lockUntil: number };

type Xfer = { at: number; kind: 'env' | 'cheer'; from: string; to: string; amt: number };
export type AdminAlert = { at: number; kind: 'big' | 'xfer' | 'reports' | 'collusion'; title: string; text: string; key: string };
type Data = { v: 1; envs: Env[]; tours: Tour[]; league: League; tf: Record<string, TF>; xfer?: Xfer[]; alerts?: AdminAlert[] };
export const XFER_FLAG_COUNT = 3, XFER_FLAG_SUM = 20_000;
const valid = (x: Record<string, unknown>) => x.v === 1 && Array.isArray(x.envs) && Array.isArray(x.tours) && isObj(x.league) && isObj(x.tf);

/* ======================= أغاني الغرفة (بالذاكرة) ======================= */
export const YT_ID = /^[A-Za-z0-9_-]{11}$/;
type Track = { vid: string; by: string; byName: string };
type Music = { queue: Track[]; cur: (Track & { startAt: number }) | null; paused: number | null };
export const MUSIC_QUEUE_MAX = 15, MUSIC_PER_USER = 3;

export interface ArenaDeps {
  wallet: ArenaWallet;
  name: (id: string) => string;
  notify: (id: string, msg: unknown) => void;
  /** يبني غرفة لعبة للاعبين (ثنائية) ويرجع رمزها، أو null لو تعذّر */
  createMatch: (players: TPlayer[], game: string) => Promise<string | null>;
  /** آخر نشاط بغرفة مباراة (null لو مو شغالة) */
  lastActivity?: (code: string) => number | null;
  /** R69: تنبيه فوري للإدارة */
  onAlert?: (a: AdminAlert) => void;
  now?: () => number;
}

export class Arena {
  private d: Data;
  private disk: Persister;
  private music = new Map<string, Music>();
  private now: () => number;
  constructor(file: string, private deps: ArenaDeps, mon = new StorageMonitor()) {
    this.now = deps.now ?? Date.now;
    const fresh: Data = { v: 1, envs: [], tours: [], league: { week: leagueWeekOf(this.now()), tier: {}, pts: {}, games: {}, names: {}, last: null }, tf: {} };
    this.d = (file && (loadJsonFile(file, valid) as unknown as Data)) || fresh;
    this.disk = new Persister('arena', file, () => this.d, this.now, mon, valid);
  }
  private save() { this.disk.save(); }

  /* ---------- ظرف الحظ ---------- */
  envThrow(roomId: string, by: string, total: number, count: number) {
    need((ENV_AMOUNTS as readonly number[]).includes(total), 'مبلغ غير صالح.', 400);
    need((ENV_COUNTS as readonly number[]).includes(count), 'عدد غير صالح.', 400);
    this.envTick();
    need(this.d.envs.filter((e) => e.room === roomId && !e.settled).length < 3, 'فيه 3 ظروف شغالة بالغرفة، انتظر شوي.');
    const id = randomBytes(6).toString('hex');
    const pay = this.deps.wallet.spend(by, total, 'ظرف الحظ بالغرفة', `env:${id}:pay`);
    need(pay.ok, pay.code === 'poor' ? 'رصيدك ما يكفي.' : 'تعذّر الدفع.', 402);
    const t = this.now();
    const e: Env = { id, room: roomId, by, byName: this.deps.name(by) || 'لاعب', total, shares: splitShares(total, count), taken: [], at: t, endsAt: t + ENV_MS, settled: false };
    this.d.envs.push(e); if (this.d.envs.length > 300) this.d.envs.splice(0, this.d.envs.length - 300);
    this.save(); return e;
  }
  envGrab(roomId: string, envId: string, uid: string) {
    this.envTick();
    const e = this.d.envs.find((x) => x.id === envId && x.room === roomId);
    need(e && !e.settled, 'الظرف خلص.');
    need(e!.by !== uid, 'صاحب الظرف ما ياخذ منه 😄');
    need(!e!.taken.some((x) => x.id === uid), 'أخذت نصيبك من قبل.');
    const amt = e!.shares[e!.taken.length];
    need(amt !== undefined, 'الظرف خلص.');
    need(this.deps.wallet.grant(uid, amt, `ظرف الحظ من ${e!.byName}`, `env:${e!.id}:${uid}`), 'تعذّر التسليم.');
    e!.taken.push({ id: uid, name: this.deps.name(uid) || 'لاعب', amt }); this.logXfer('env', e!.by, uid, amt);
    if (e!.taken.length >= e!.shares.length) e!.settled = true;
    this.save(); return { amt, env: e! };
  }
  /** الظروف المنتهية: الباقي يرجع لصاحبها */
  envTick() {
    const t = this.now(); let ch = false;
    for (const e of this.d.envs) {
      if (e.settled || e.endsAt > t) continue;
      const left = e.shares.slice(e.taken.length).reduce((a, b) => a + b, 0);
      if (left > 0) this.deps.wallet.grant(e.by, left, 'باقي ظرف الحظ رجع لك', `env:${e.id}:refund`);
      e.settled = true; ch = true;
    }
    if (ch) this.save();
  }
  envView(roomId: string, uid: string) {
    this.envTick(); const t = this.now();
    return this.d.envs.filter((e) => e.room === roomId && (!e.settled || t - e.endsAt < 60_000 || t - e.at < ENV_MS + 60_000)).slice(-4).map((e) => ({
      id: e.id, byName: e.byName, mine: e.by === uid, total: e.total, count: e.shares.length, left: e.shares.length - e.taken.length, endsAt: e.endsAt, done: e.settled,
      got: e.taken.find((x) => x.id === uid)?.amt ?? null, taken: e.taken.slice().sort((a, b) => b.amt - a.amt).slice(0, 20).map((x) => ({ name: x.name, amt: x.amt })),
      best: e.settled && e.taken.length ? e.taken.reduce((m, x) => (x.amt > m.amt ? x : m)).name : null,
    }));
  }

  /* ---------- البطولات ---------- */
  private tourOf(uid: string) { return this.d.tours.find((t) => (t.status === 'open' || t.status === 'running') && t.players.some((p) => p.id === uid) && !(t.status === 'running' && this.eliminated(t, uid))); }
  private eliminated(t: Tour, uid: string) { return t.rounds.some((r) => r.some((m) => (m.a === uid || m.b === uid) && m.winner && m.winner !== uid)); }
  tourCreate(uid: string, game: string, gameName: string, size: number, fee: number) {
    need((TOUR_SIZES as readonly number[]).includes(size), 'عدد اللاعبين غير صالح.', 400);
    need((TOUR_FEES as readonly number[]).includes(fee), 'رسم الدخول غير صالح.', 400);
    need(!this.tourOf(uid), 'أنت مشترك ببطولة ثانية الحين.');
    need(this.d.tours.filter((t) => t.status === 'open').length < 30, 'فيه بطولات مفتوحة كثير، اشترك بوحدة منها.');
    const id = randomBytes(5).toString('hex');
    if (fee) { const p = this.deps.wallet.spend(uid, fee, 'رسم دخول بطولة', `tour:${id}:fee:${uid}`); need(p.ok, p.code === 'poor' ? 'رصيدك ما يكفي لرسم الدخول.' : 'تعذّر الدفع.', 402); }
    const t: Tour = { id, game, gameName, size, fee, by: uid, createdAt: this.now(), status: 'open', players: [{ id: uid, name: this.deps.name(uid) || 'لاعب' }], rounds: [], winner: null, second: null, endedAt: 0 };
    this.d.tours.push(t); this.trimTours(); this.save(); return t;
  }
  tourJoin(uid: string, tid: string) {
    const t = this.d.tours.find((x) => x.id === tid); need(t && t.status === 'open', 'البطولة مو مفتوحة.');
    need(!t!.players.some((p) => p.id === uid), 'أنت مشترك فيها.'); need(!(t!.left ?? []).includes(uid), 'طلعت من هالبطولة، اختر بطولة ثانية.'); need(!this.tourOf(uid), 'أنت مشترك ببطولة ثانية الحين.');
    need(t!.players.length < t!.size, 'البطولة اكتملت.');
    if (t!.fee) { const p = this.deps.wallet.spend(uid, t!.fee, 'رسم دخول بطولة', `tour:${t!.id}:fee:${uid}`); need(p.ok, p.code === 'poor' ? 'رصيدك ما يكفي لرسم الدخول.' : 'تعذّر الدفع.', 402); }
    t!.players.push({ id: uid, name: this.deps.name(uid) || 'لاعب' });
    if (t!.players.length >= t!.size) this.tourStart(t!);
    this.save(); return t!;
  }
  tourLeave(uid: string, tid: string) {
    const t = this.d.tours.find((x) => x.id === tid); need(t && t.status === 'open', 'ما تقدر تطلع بعد ما بدت البطولة.');
    const i = t!.players.findIndex((p) => p.id === uid); need(i >= 0, 'أنت مو مشترك فيها.');
    t!.players.splice(i, 1); (t!.left ??= []).push(uid);
    if (t!.fee) this.deps.wallet.grant(uid, t!.fee, 'استرداد رسم البطولة', `tour:${t!.id}:refund:${uid}`);
    if (!t!.players.length) { t!.status = 'cancelled'; t!.endedAt = this.now(); }
    this.save(); return t!;
  }
  private tourStart(t: Tour) {
    const ps = t.players.map((p) => p.id); for (let i = ps.length - 1; i > 0; i--) { const j = randomInt(i + 1); [ps[i], ps[j]] = [ps[j], ps[i]]; }
    t.status = 'running';
    t.rounds = [Array.from({ length: t.size / 2 }, (_, k) => ({ a: ps[2 * k], b: ps[2 * k + 1], code: null, winner: null, at: 0, tries: 0 }))];
    for (let n = t.size / 4; n >= 1; n /= 2) t.rounds.push(Array.from({ length: n }, () => ({ a: null, b: null, code: null, winner: null, at: 0, tries: 0 })));
    for (const p of t.players) this.deps.notify(p.id, { t: 'arena:tour', id: t.id, msg: `بدت بطولة ${t.gameName}! مباراتك الأولى جاية 🏆` });
    void this.tourKick(t);
  }
  /** يبدأ المباريات الجاهزة (فيها لاعبين وما لها غرفة) */
  private async tourKick(t: Tour) {
    for (const r of t.rounds) for (const m of r) {
      if (!m.a || !m.b || m.winner || m.code || m.tries >= 5) continue;
      m.tries++; m.at = this.now();
      const pa = t.players.find((p) => p.id === m.a)!, pb = t.players.find((p) => p.id === m.b)!;
      let code: string | null = null; try { code = await this.deps.createMatch([pa, pb], t.game); } catch { code = null; }
      if (code) { m.code = code; for (const id of [m.a, m.b]) this.deps.notify(id, { t: 'mm:found', code }); }
      this.save();
    }
  }
  /** نتيجة مباراة لعبة: لو كانت مباراة بطولة نأهّل الفايز */
  tourGameFinished(code: string, winners: string[], scores?: Record<string, number>) {
    for (const t of this.d.tours) {
      if (t.status !== 'running') continue;
      for (const [ri, r] of t.rounds.entries()) for (const [mi, m] of r.entries()) {
        if (m.code !== code || m.winner) continue;
        const a = m.a!, b = m.b!; let w: string;
        const ina = winners.includes(a), inb = winners.includes(b);
        if (ina !== inb) w = ina ? a : b;
        else if (scores && scores[a] !== undefined && scores[b] !== undefined && scores[a] !== scores[b]) w = scores[a] > scores[b] ? a : b;
        else w = randomInt(2) ? a : b;
        this.tourAdvance(t, ri, mi, w); return true;
      }
    }
    return false;
  }
  /** لاعب طلع من غرفة مباراة البطولة = ينسحب والثاني يتأهل */
  tourForfeit(code: string, uid: string) {
    for (const t of this.d.tours) { if (t.status !== 'running') continue;
      for (const [ri, r] of t.rounds.entries()) for (const [mi, m] of r.entries()) if (m.code === code && !m.winner && (m.a === uid || m.b === uid)) { this.tourAdvance(t, ri, mi, m.a === uid ? m.b! : m.a!); return true; } }
    return false;
  }
  private tourAdvance(t: Tour, ri: number, mi: number, w: string) {
    const m = t.rounds[ri][mi]; m.winner = w;
    const loser = m.a === w ? m.b : m.a;
    if (loser) this.deps.notify(loser, { t: 'arena:tour', id: t.id, msg: `طلعت من بطولة ${t.gameName}. حظ أوفر 💪` });
    if (ri === t.rounds.length - 1) { this.tourFinish(t, w, loser); this.save(); return; }
    const nm = t.rounds[ri + 1][Math.floor(mi / 2)]; if (mi % 2 === 0) nm.a = w; else nm.b = w;
    this.deps.notify(w, { t: 'arena:tour', id: t.id, msg: `تأهلت للدور اللي بعده ببطولة ${t.gameName} 🔥` });
    this.save(); void this.tourKick(t);
  }
  private tourFinish(t: Tour, w: string, second: string | null) {
    t.status = 'done'; t.winner = w; t.second = second; t.endedAt = this.now();
    const pool = t.fee * t.size;
    if (pool) {
      const first = Math.floor(pool * 0.7), sec = pool - first;
      this.deps.wallet.grant(w, first, `بطل بطولة ${t.gameName} 🏆`, `tour:${t.id}:prize1`);
      if (second) this.deps.wallet.grant(second, sec, `وصيف بطولة ${t.gameName} 🥈`, `tour:${t.id}:prize2`);
    }
    for (const p of t.players) this.deps.notify(p.id, { t: 'arena:tour', id: t.id, msg: `🏆 ${this.deps.name(w) || 'لاعب'} بطل بطولة ${t.gameName}!` });
  }
  tourTick() {
    const now = this.now(); let ch = false;
    for (const t of this.d.tours) {
      if (t.status === 'open' && now - t.createdAt > TOUR_OPEN_MS) {
        t.status = 'cancelled'; t.endedAt = now; ch = true;
        for (const p of t.players) { if (t.fee) this.deps.wallet.grant(p.id, t.fee, 'استرداد رسم البطولة (ما اكتملت)', `tour:${t.id}:cancel:${p.id}`); this.deps.notify(p.id, { t: 'arena:tour', id: t.id, msg: `بطولة ${t.gameName} انلغت لأنها ما اكتملت، ورجعنا لك الرسوم.` }); }
      }
      if (t.status !== 'running') continue;
      for (const [ri, r] of t.rounds.entries()) for (const [mi, m] of r.entries()) {
        if (m.winner || !m.a || !m.b) continue;
        const act = m.code ? (this.deps.lastActivity?.(m.code) ?? null) : null;
        if (m.code && now - m.at > 5 * 60_000 && (act === null || now - act > 5 * 60_000) && m.tries < 5) { m.code = null; ch = true; void this.tourKick(t); continue; } // الغرفة اختفت أو نامت: نسوي غرفة يديدة
        if ((m.code && now - m.at > TOUR_MATCH_MS) || (!m.code && m.tries >= 5)) { this.tourAdvance(t, ri, mi, randomInt(2) ? m.a : m.b); ch = true; }
        else if (!m.code && now - m.at > 20_000) void this.tourKick(t);
      }
    }
    if (ch) this.save();
  }
  private trimTours() { const keep = this.d.tours.filter((t) => t.status === 'open' || t.status === 'running'); const old = this.d.tours.filter((t) => t.status !== 'open' && t.status !== 'running').sort((a, b) => b.endedAt - a.endedAt).slice(0, 40); this.d.tours = [...keep, ...old]; }
  tourList(uid: string) {
    this.tourTick(); const name = (id: string | null) => (id ? this.d.tours.flatMap((t) => t.players).find((p) => p.id === id)?.name ?? this.deps.name(id) : null);
    const view = (t: Tour) => ({ id: t.id, game: t.game, gameName: t.gameName, size: t.size, fee: t.fee, pool: t.fee * t.size, status: t.status, joined: t.players.length, mine: t.players.some((p) => p.id === uid), players: t.players.map((p) => p.name), createdAt: t.createdAt, closesAt: t.createdAt + TOUR_OPEN_MS,
      winner: name(t.winner), second: name(t.second),
      rounds: t.rounds.map((r) => r.map((m) => ({ a: name(m.a), b: name(m.b), w: name(m.winner), live: !!m.code && !m.winner, code: m.code && !m.winner && (m.a === uid || m.b === uid) ? m.code : null, me: m.a === uid || m.b === uid }))) });
    const act = this.d.tours.filter((t) => t.status === 'open' || t.status === 'running'), done = this.d.tours.filter((t) => t.status === 'done').sort((a, b) => b.endedAt - a.endedAt).slice(0, 10);
    return { open: act.map(view), done: done.map(view), sizes: TOUR_SIZES, fees: TOUR_FEES };
  }

  /* ---------- الدوري ---------- */
  private leagueRoll() {
    const L = this.d.league, wk = leagueWeekOf(this.now()); if (L.week === wk) return;
    const res: NonNullable<League['last']>['res'] = {};
    const ids = new Set([...Object.keys(L.tier), ...Object.keys(L.pts)]);
    for (let tier = 0; tier < LEAGUE_TIERS.length; tier++) {
      const inTier = [...ids].filter((id) => (L.tier[id] ?? 0) === tier);
      const active = inTier.filter((id) => (L.pts[id] ?? 0) > 0).sort((a, b) => (L.pts[b] ?? 0) - (L.pts[a] ?? 0) || (L.games[b] ?? 0) - (L.games[a] ?? 0));
      const n = active.length, up = n >= 3 ? Math.max(1, Math.floor(n * LEAGUE_MOVE)) : 0, down = n >= 3 ? Math.max(1, Math.floor(n * LEAGUE_MOVE)) : 0;
      active.forEach((id, k) => {
        const move: -1 | 0 | 1 = k < up && tier < LEAGUE_TIERS.length - 1 ? 1 : k >= n - down && tier > 0 ? -1 : 0;
        const prize = k < 3 ? LEAGUE_PRIZES[tier][k] : 0;
        if (prize) this.deps.wallet.grant(id, prize, `جايزة الدوري الأسبوعي — ${LEAGUE_TIERS[tier]} (المركز ${k + 1})`, `league:${L.week}:${id}`);
        res[id] = { tier, rank: k + 1, move, prize };
      });
      for (const id of inTier) if (!(L.pts[id] > 0) && tier > 0) res[id] = { tier, rank: 0, move: -1, prize: 0 };
    }
    const tier: Record<string, number> = {};
    for (const id of ids) { const nt = Math.max(0, Math.min(LEAGUE_TIERS.length - 1, (L.tier[id] ?? 0) + (res[id]?.move ?? 0))); if (nt > 0) tier[id] = nt; }
    this.d.league = { week: wk, tier, pts: {}, games: {}, names: Object.fromEntries(Object.entries(L.names).filter(([id]) => tier[id] !== undefined)), last: { week: L.week, res } };
    this.save();
  }
  leagueGame(players: { id: string; name: string }[], winners: string[]) {
    this.leagueRoll(); const L = this.d.league;
    for (const p of players) { L.pts[p.id] = (L.pts[p.id] ?? 0) + (winners.includes(p.id) ? 3 : 1); L.games[p.id] = (L.games[p.id] ?? 0) + 1; L.names[p.id] = p.name; }
    this.save();
  }
  leagueView(uid: string) {
    this.leagueRoll(); const L = this.d.league; const my = L.tier[uid] ?? 0;
    const ids = [...new Set([...Object.keys(L.pts), ...Object.keys(L.tier)])].filter((id) => (L.tier[id] ?? 0) === my && (L.pts[id] ?? 0) > 0)
      .sort((a, b) => (L.pts[b] ?? 0) - (L.pts[a] ?? 0) || (L.games[b] ?? 0) - (L.games[a] ?? 0));
    const n = ids.length, up = n >= 3 ? Math.max(1, Math.floor(n * LEAGUE_MOVE)) : 0;
    const rank = ids.indexOf(uid);
    return { week: L.week, endsAt: leagueWeekEnd(this.now()), tier: my, tiers: LEAGUE_TIERS, prizes: LEAGUE_PRIZES[my], up, down: up, count: n,
      me: { pts: L.pts[uid] ?? 0, games: L.games[uid] ?? 0, rank: rank >= 0 ? rank + 1 : null },
      top: ids.slice(0, 50).map((id, k) => ({ rank: k + 1, name: L.names[id] || this.deps.name(id) || 'لاعب', pts: L.pts[id] ?? 0, games: L.games[id] ?? 0, me: id === uid })),
      last: L.last && L.last.res[uid] ? { week: L.last.week, ...L.last.res[uid], tierName: LEAGUE_TIERS[L.last.res[uid].tier] } : null };
  }

  /* ---------- التشجيع بالعملات (المشاهدة) ---------- */
  cheer(from: string, to: string, amount: number, ref: string) {
    need([10, 100, 1000].includes(amount), 'مبلغ غير صالح.', 400); need(from !== to, 'ما تقدر تشجع نفسك 😄');
    const p = this.deps.wallet.spend(from, amount, 'تشجيع لاعب بمباراة', `cheer:${ref}`); need(p.ok, p.code === 'poor' ? 'رصيدك ما يكفي.' : 'تعذّر الدفع.', 402);
    this.deps.wallet.grant(to, amount, `تشجيع من ${this.deps.name(from) || 'مشجع'}`, `cheer:${ref}:to`); this.logXfer('cheer', from, to, amount); this.save();
  }
  private logXfer(kind: Xfer['kind'], from: string, to: string, amt: number) {
    const l = (this.d.xfer ??= []); l.push({ at: this.now(), kind, from, to, amt }); if (l.length > 3000) l.splice(0, l.length - 3000);
    const since = this.now() - 7 * 86_400_000; let n = 0, sum = 0; for (const x of l) if (x.at >= since && x.from === from && x.to === to) { n++; sum += x.amt; }
    if (n >= XFER_FLAG_COUNT || sum >= XFER_FLAG_SUM) { const wk = Math.floor(this.now() / (7 * 86_400_000)); this.alert('xfer', '⚠️ تحويلات مشبوهة', `${this.deps.name(from) || 'حساب'} حوّل لـ ${this.deps.name(to) || 'حساب'} ${n} مرة بمجموع ${sum.toLocaleString('en-US')} عملة خلال 7 أيام (ظرف حظ/تشجيع). شيك عليهم من «ألعاب الحظ والتحويلات».`, `xfer:${from}:${to}:${wk}`); }
  }
  /** يسجل التنبيه مرة وحدة لكل مفتاح ويرسله للإدارة */
  alert(kind: AdminAlert['kind'], title: string, text: string, key: string) {
    const l = (this.d.alerts ??= []); if (l.some((a) => a.key === key)) return false;
    const a = { at: this.now(), kind, title, text, key }; l.unshift(a); if (l.length > 200) l.length = 200; this.save();
    try { this.deps.onAlert?.(a); } catch { /* التنبيه ما يوقف العملية */ }
    return true;
  }
  alertsView() { return (this.d.alerts ?? []).slice(0, 60); }
  /** للإدارة: التحويلات بين الحسابات (ظرف الحظ + التشجيع) والأزواج المشبوهة آخر 7 أيام */
  xferAdmin(name: (id: string) => string) {
    const since = this.now() - 7 * 86_400_000; const l = (this.d.xfer ?? []).filter((x) => x.at >= since);
    const pairs = new Map<string, { from: string; to: string; n: number; sum: number; last: number; kinds: Set<string> }>();
    for (const x of l) { const k = x.from + '>' + x.to; const p = pairs.get(k) ?? { from: x.from, to: x.to, n: 0, sum: 0, last: 0, kinds: new Set<string>() }; p.n++; p.sum += x.amt; p.last = Math.max(p.last, x.at); p.kinds.add(x.kind); pairs.set(k, p); }
    const recv = new Map<string, { n: number; sum: number; from: Set<string> }>();
    for (const x of l) { const r = recv.get(x.to) ?? { n: 0, sum: 0, from: new Set<string>() }; r.n++; r.sum += x.amt; r.from.add(x.from); recv.set(x.to, r); }
    const flagged = [...pairs.values()].filter((p) => p.n >= XFER_FLAG_COUNT || p.sum >= XFER_FLAG_SUM).sort((a, b) => b.sum - a.sum).slice(0, 50)
      .map((p) => ({ from: name(p.from), fromId: p.from, to: name(p.to), toId: p.to, n: p.n, sum: p.sum, last: p.last, kinds: [...p.kinds] }));
    const top = [...recv.entries()].sort((a, b) => b[1].sum - a[1].sum).slice(0, 15).map(([id, r]) => ({ name: name(id), id, n: r.n, sum: r.sum, senders: r.from.size }));
    const recent = l.slice(-80).reverse().map((x) => ({ at: x.at, kind: x.kind, from: name(x.from), to: name(x.to), amt: x.amt }));
    return { flagged, top, recent, rule: { count: XFER_FLAG_COUNT, sum: XFER_FLAG_SUM }, total7d: l.reduce((a, x) => a + x.amt, 0) };
  }

  /* ---------- أغاني الغرفة ---------- */
  private mus(room: string) { let m = this.music.get(room); if (!m) { m = { queue: [], cur: null, paused: null }; this.music.set(room, m); } return m; }
  musicView(room: string) { const m = this.music.get(room); const t = this.now(); return m ? { cur: m.cur ? { vid: m.cur.vid, byName: m.cur.byName, pos: Math.max(0, ((m.paused ?? t) - m.cur.startAt) / 1000), paused: m.paused !== null } : null, queue: m.queue.map((q) => ({ vid: q.vid, byName: q.byName })) } : { cur: null, queue: [] }; }
  musicAdd(room: string, uid: string, vid: string) {
    need(YT_ID.test(vid), 'رابط يوتيوب غير صالح.', 400); const m = this.mus(room);
    need(m.queue.length < MUSIC_QUEUE_MAX, 'القائمة مليانة.'); need(m.queue.filter((q) => q.by === uid).length < MUSIC_PER_USER, `لك ${MUSIC_PER_USER} أغاني بالقائمة، انتظر لين تشتغل.`);
    const tr = { vid, by: uid, byName: this.deps.name(uid) || 'لاعب' };
    if (!m.cur) { m.cur = { ...tr, startAt: this.now() }; m.paused = null; } else m.queue.push(tr);
  }
  musicSkip(room: string, uid: string, mod: boolean) { const m = this.mus(room); need(m.cur, 'ما فيه أغنية شغالة.'); need(mod || m.cur!.by === uid, 'للمشرفين أو صاحب الأغنية بس.'); this.musicNext(m); }
  musicEnded(room: string, vid: string) { const m = this.music.get(room); if (m?.cur && m.cur.vid === vid && m.paused === null && this.now() - m.cur.startAt > 15_000) this.musicNext(m); }
  musicPause(room: string, mod: boolean, pause: boolean) { const m = this.mus(room); need(mod, 'للمشرفين بس.'); need(m.cur, 'ما فيه أغنية شغالة.'); const t = this.now(); if (pause && m.paused === null) m.paused = t; if (!pause && m.paused !== null) { m.cur!.startAt += t - m.paused; m.paused = null; } }
  musicClear(room: string, mod: boolean) { need(mod, 'للمشرفين بس.'); this.music.delete(room); }
  private musicNext(m: Music) { const n = m.queue.shift(); m.cur = n ? { ...n, startAt: this.now() } : null; m.paused = null; }

  /* ---------- التحقق بخطوتين ---------- */
  tfStatus(uid: string) { const x = this.d.tf[uid]; return { on: !!x?.on, pending: !!x && !x.on }; }
  tfEnabled(uid: string) { return !!this.d.tf[uid]?.on; }
  tfSetup(uid: string, label: string) {
    need(!this.d.tf[uid]?.on, 'التحقق بخطوتين مفعّل من قبل.');
    const secret = b32encode(randomBytes(20)); this.d.tf[uid] = { secret, on: false, at: this.now(), last: 0, fails: 0, lockUntil: 0 }; this.save();
    return { secret, uri: `otpauth://totp/${encodeURIComponent('لعبك:' + label)}?secret=${secret}&issuer=${encodeURIComponent('لعبك')}&digits=6&period=30` };
  }
  private tfCheck(uid: string, code: unknown): boolean {
    const x = this.d.tf[uid]; if (!x) return false; const t = this.now();
    need(x.lockUntil <= t, 'محاولات كثيرة غلط. جرّب بعد 10 دقايق.', 429);
    const c = String(code ?? '').replace(/\D/g, ''); const step = Math.floor(t / 30_000);
    for (const s of [step, step - 1, step + 1]) if (c.length === 6 && s > x.last && totp(x.secret, s) === c) { x.last = s; x.fails = 0; this.save(); return true; }
    x.fails++; if (x.fails >= 5) { x.lockUntil = t + 10 * 60_000; x.fails = 0; } this.save(); return false;
  }
  tfEnable(uid: string, code: unknown) { const x = this.d.tf[uid]; need(x && !x.on, 'ابدأ التفعيل من جديد.'); need(this.tfCheck(uid, code), 'الرمز غلط. تأكد من الوقت بجوالك وجرّب الرمز الجديد.', 400); x!.on = true; this.save(); }
  tfDisable(uid: string, code: unknown) { const x = this.d.tf[uid]; need(x, 'التحقق بخطوتين مو مفعّل.'); if (x!.on) need(this.tfCheck(uid, code), 'الرمز غلط.', 400); delete this.d.tf[uid]; this.save(); }
  /** للدخول: true لو ما يحتاج أو الرمز صح */
  tfLogin(uid: string, code: unknown): boolean { if (!this.tfEnabled(uid)) return true; if (code === undefined || code === null || code === '') return false; return this.tfCheck(uid, code); }
  /** للإدارة: فك التحقق لو اللاعب ضيّع جواله */
  tfReset(uid: string) { if (!this.d.tf[uid]) return false; delete this.d.tf[uid]; this.save(); return true; }

  tick() { this.envTick(); this.tourTick(); this.leagueRoll(); }
}
