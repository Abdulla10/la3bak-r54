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
export class ArenaError extends Error {
    status;
    constructor(message, status = 409) {
        super(message);
        this.status = status;
    }
}
const need = (ok, msg, status = 409) => { if (!ok)
    throw new ArenaError(msg, status); };
const GULF = 4 * 3_600_000;
/* ======================= ظرف الحظ ======================= */
export const ENV_AMOUNTS = [500, 1000, 5000, 10000, 50000];
export const ENV_COUNTS = [5, 10, 20];
export const ENV_MS = 2 * 60_000;
/** يقسم المبلغ على n نصيب عشوائي (كل نصيب 1 على الأقل) */
export function splitShares(total, n) {
    const w = Array.from({ length: n }, () => 1 + randomInt(1000));
    const sum = w.reduce((a, b) => a + b, 0);
    const out = w.map((x) => Math.max(1, Math.floor((x / sum) * total)));
    let diff = total - out.reduce((a, b) => a + b, 0);
    for (let i = 0; diff !== 0; i = (i + 1) % n) {
        if (diff > 0) {
            out[i]++;
            diff--;
        }
        else if (out[i] > 1) {
            out[i]--;
            diff++;
        }
    }
    return out;
}
/* ======================= البطولات ======================= */
export const TOUR_SIZES = [4, 8, 16];
export const TOUR_FEES = [0, 100, 500, 1000, 5000];
export const TOUR_OPEN_MS = 60 * 60_000; // ما اكتملت بساعة؟ تنلغي وترجع الرسوم
export const TOUR_MATCH_MS = 25 * 60_000; // مباراة ما خلصت بـ25 دقيقة؟ يتأهل واحد بالقرعة
/* ======================= الدوري ======================= */
export const LEAGUE_TIERS = ['برونز', 'فضة', 'ذهب', 'ماس'];
export const LEAGUE_PRIZES = [[1000, 600, 300], [2000, 1200, 600], [4000, 2400, 1200], [8000, 5000, 2500]];
export const LEAGUE_MOVE = 0.3; // أول 30% يصعدون، وآخر 30% ينزلون
/** مفتاح الأسبوع (يبدأ الأحد 00:00 بتوقيت الخليج) */
export function leagueWeekOf(ms) { const d = new Date(ms + GULF); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); }
export function leagueWeekEnd(ms) { const d = new Date(leagueWeekOf(ms) + 'T00:00:00Z'); return d.getTime() - GULF + 7 * 86_400_000; }
/* ======================= التحقق بخطوتين ======================= */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function b32encode(buf) { let bits = 0, val = 0, out = ''; for (const b of buf) {
    val = (val << 8) | b;
    bits += 8;
    while (bits >= 5) {
        out += B32[(val >>> (bits - 5)) & 31];
        bits -= 5;
    }
} if (bits > 0)
    out += B32[(val << (5 - bits)) & 31]; return out; }
export function b32decode(s) { const clean = s.replace(/=+$/, '').toUpperCase(); let bits = 0, val = 0; const out = []; for (const c of clean) {
    const i = B32.indexOf(c);
    if (i < 0)
        continue;
    val = (val << 5) | i;
    bits += 5;
    if (bits >= 8) {
        out.push((val >>> (bits - 8)) & 255);
        bits -= 8;
    }
} return Buffer.from(out); }
export function totp(secret, step) {
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(step));
    const h = createHmac('sha1', b32decode(secret)).update(msg).digest();
    const o = h[h.length - 1] & 15;
    const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
    return String(n % 1_000_000).padStart(6, '0');
}
export const XFER_FLAG_COUNT = 3, XFER_FLAG_SUM = 20_000;
const valid = (x) => x.v === 1 && Array.isArray(x.envs) && Array.isArray(x.tours) && isObj(x.league) && isObj(x.tf);
/* ======================= أغاني الغرفة (بالذاكرة) ======================= */
export const YT_ID = /^[A-Za-z0-9_-]{11}$/;
export const MUSIC_QUEUE_MAX = 15, MUSIC_PER_USER = 3;
export class Arena {
    deps;
    d;
    disk;
    music = new Map();
    now;
    constructor(file, deps, mon = new StorageMonitor()) {
        this.deps = deps;
        this.now = deps.now ?? Date.now;
        const fresh = { v: 1, envs: [], tours: [], league: { week: leagueWeekOf(this.now()), tier: {}, pts: {}, games: {}, names: {}, last: null }, tf: {} };
        this.d = (file && loadJsonFile(file, valid)) || fresh;
        this.disk = new Persister('arena', file, () => this.d, this.now, mon, valid);
    }
    save() { this.disk.save(); }
    /* ---------- ظرف الحظ ---------- */
    envThrow(roomId, by, total, count) {
        need(ENV_AMOUNTS.includes(total), 'مبلغ غير صالح.', 400);
        need(ENV_COUNTS.includes(count), 'عدد غير صالح.', 400);
        this.envTick();
        need(this.d.envs.filter((e) => e.room === roomId && !e.settled).length < 3, 'فيه 3 ظروف شغالة بالغرفة، انتظر شوي.');
        const id = randomBytes(6).toString('hex');
        const pay = this.deps.wallet.spend(by, total, 'ظرف الحظ بالغرفة', `env:${id}:pay`);
        need(pay.ok, pay.code === 'poor' ? 'رصيدك ما يكفي.' : 'تعذّر الدفع.', 402);
        const t = this.now();
        const e = { id, room: roomId, by, byName: this.deps.name(by) || 'لاعب', total, shares: splitShares(total, count), taken: [], at: t, endsAt: t + ENV_MS, settled: false };
        this.d.envs.push(e);
        if (this.d.envs.length > 300)
            this.d.envs.splice(0, this.d.envs.length - 300);
        this.save();
        return e;
    }
    envGrab(roomId, envId, uid) {
        this.envTick();
        const e = this.d.envs.find((x) => x.id === envId && x.room === roomId);
        need(e && !e.settled, 'الظرف خلص.');
        need(e.by !== uid, 'صاحب الظرف ما ياخذ منه 😄');
        need(!e.taken.some((x) => x.id === uid), 'أخذت نصيبك من قبل.');
        const amt = e.shares[e.taken.length];
        need(amt !== undefined, 'الظرف خلص.');
        need(this.deps.wallet.grant(uid, amt, `ظرف الحظ من ${e.byName}`, `env:${e.id}:${uid}`), 'تعذّر التسليم.');
        e.taken.push({ id: uid, name: this.deps.name(uid) || 'لاعب', amt });
        this.logXfer('env', e.by, uid, amt);
        if (e.taken.length >= e.shares.length)
            e.settled = true;
        this.save();
        return { amt, env: e };
    }
    /** الظروف المنتهية: الباقي يرجع لصاحبها */
    envTick() {
        const t = this.now();
        let ch = false;
        for (const e of this.d.envs) {
            if (e.settled || e.endsAt > t)
                continue;
            const left = e.shares.slice(e.taken.length).reduce((a, b) => a + b, 0);
            if (left > 0)
                this.deps.wallet.grant(e.by, left, 'باقي ظرف الحظ رجع لك', `env:${e.id}:refund`);
            e.settled = true;
            ch = true;
        }
        if (ch)
            this.save();
    }
    envView(roomId, uid) {
        this.envTick();
        const t = this.now();
        return this.d.envs.filter((e) => e.room === roomId && (!e.settled || t - e.endsAt < 60_000 || t - e.at < ENV_MS + 60_000)).slice(-4).map((e) => ({
            id: e.id, byName: e.byName, mine: e.by === uid, total: e.total, count: e.shares.length, left: e.shares.length - e.taken.length, endsAt: e.endsAt, done: e.settled,
            got: e.taken.find((x) => x.id === uid)?.amt ?? null, taken: e.taken.slice().sort((a, b) => b.amt - a.amt).slice(0, 20).map((x) => ({ name: x.name, amt: x.amt })),
            best: e.settled && e.taken.length ? e.taken.reduce((m, x) => (x.amt > m.amt ? x : m)).name : null,
        }));
    }
    /* ---------- البطولات ---------- */
    tourOf(uid) { return this.d.tours.find((t) => (t.status === 'open' || t.status === 'running') && t.players.some((p) => p.id === uid) && !(t.status === 'running' && this.eliminated(t, uid))); }
    eliminated(t, uid) { return t.rounds.some((r) => r.some((m) => (m.a === uid || m.b === uid) && m.winner && m.winner !== uid)); }
    tourCreate(uid, game, gameName, size, fee) {
        need(TOUR_SIZES.includes(size), 'عدد اللاعبين غير صالح.', 400);
        need(TOUR_FEES.includes(fee), 'رسم الدخول غير صالح.', 400);
        need(!this.tourOf(uid), 'أنت مشترك ببطولة ثانية الحين.');
        need(this.d.tours.filter((t) => t.status === 'open').length < 30, 'فيه بطولات مفتوحة كثير، اشترك بوحدة منها.');
        const id = randomBytes(5).toString('hex');
        if (fee) {
            const p = this.deps.wallet.spend(uid, fee, 'رسم دخول بطولة', `tour:${id}:fee:${uid}`);
            need(p.ok, p.code === 'poor' ? 'رصيدك ما يكفي لرسم الدخول.' : 'تعذّر الدفع.', 402);
        }
        const t = { id, game, gameName, size, fee, by: uid, createdAt: this.now(), status: 'open', players: [{ id: uid, name: this.deps.name(uid) || 'لاعب' }], rounds: [], winner: null, second: null, endedAt: 0 };
        this.d.tours.push(t);
        this.trimTours();
        this.save();
        return t;
    }
    tourJoin(uid, tid) {
        const t = this.d.tours.find((x) => x.id === tid);
        need(t && t.status === 'open', 'البطولة مو مفتوحة.');
        need(!t.players.some((p) => p.id === uid), 'أنت مشترك فيها.');
        need(!(t.left ?? []).includes(uid), 'طلعت من هالبطولة، اختر بطولة ثانية.');
        need(!this.tourOf(uid), 'أنت مشترك ببطولة ثانية الحين.');
        need(t.players.length < t.size, 'البطولة اكتملت.');
        if (t.fee) {
            const p = this.deps.wallet.spend(uid, t.fee, 'رسم دخول بطولة', `tour:${t.id}:fee:${uid}`);
            need(p.ok, p.code === 'poor' ? 'رصيدك ما يكفي لرسم الدخول.' : 'تعذّر الدفع.', 402);
        }
        t.players.push({ id: uid, name: this.deps.name(uid) || 'لاعب' });
        if (t.players.length >= t.size)
            this.tourStart(t);
        this.save();
        return t;
    }
    tourLeave(uid, tid) {
        const t = this.d.tours.find((x) => x.id === tid);
        need(t && t.status === 'open', 'ما تقدر تطلع بعد ما بدت البطولة.');
        const i = t.players.findIndex((p) => p.id === uid);
        need(i >= 0, 'أنت مو مشترك فيها.');
        t.players.splice(i, 1);
        (t.left ??= []).push(uid);
        if (t.fee)
            this.deps.wallet.grant(uid, t.fee, 'استرداد رسم البطولة', `tour:${t.id}:refund:${uid}`);
        if (!t.players.length) {
            t.status = 'cancelled';
            t.endedAt = this.now();
        }
        this.save();
        return t;
    }
    tourStart(t) {
        const ps = t.players.map((p) => p.id);
        for (let i = ps.length - 1; i > 0; i--) {
            const j = randomInt(i + 1);
            [ps[i], ps[j]] = [ps[j], ps[i]];
        }
        t.status = 'running';
        t.rounds = [Array.from({ length: t.size / 2 }, (_, k) => ({ a: ps[2 * k], b: ps[2 * k + 1], code: null, winner: null, at: 0, tries: 0 }))];
        for (let n = t.size / 4; n >= 1; n /= 2)
            t.rounds.push(Array.from({ length: n }, () => ({ a: null, b: null, code: null, winner: null, at: 0, tries: 0 })));
        for (const p of t.players)
            this.deps.notify(p.id, { t: 'arena:tour', id: t.id, msg: `بدت بطولة ${t.gameName}! مباراتك الأولى جاية 🏆` });
        void this.tourKick(t);
    }
    /** يبدأ المباريات الجاهزة (فيها لاعبين وما لها غرفة) */
    async tourKick(t) {
        for (const r of t.rounds)
            for (const m of r) {
                if (!m.a || !m.b || m.winner || m.code || m.tries >= 5)
                    continue;
                m.tries++;
                m.at = this.now();
                const pa = t.players.find((p) => p.id === m.a), pb = t.players.find((p) => p.id === m.b);
                let code = null;
                try {
                    code = await this.deps.createMatch([pa, pb], t.game);
                }
                catch {
                    code = null;
                }
                if (code) {
                    m.code = code;
                    for (const id of [m.a, m.b])
                        this.deps.notify(id, { t: 'mm:found', code });
                }
                this.save();
            }
    }
    /** نتيجة مباراة لعبة: لو كانت مباراة بطولة نأهّل الفايز */
    tourGameFinished(code, winners, scores) {
        for (const t of this.d.tours) {
            if (t.status !== 'running')
                continue;
            for (const [ri, r] of t.rounds.entries())
                for (const [mi, m] of r.entries()) {
                    if (m.code !== code || m.winner)
                        continue;
                    const a = m.a, b = m.b;
                    let w;
                    const ina = winners.includes(a), inb = winners.includes(b);
                    if (ina !== inb)
                        w = ina ? a : b;
                    else if (scores && scores[a] !== undefined && scores[b] !== undefined && scores[a] !== scores[b])
                        w = scores[a] > scores[b] ? a : b;
                    else
                        w = randomInt(2) ? a : b;
                    this.tourAdvance(t, ri, mi, w);
                    return true;
                }
        }
        return false;
    }
    /** لاعب طلع من غرفة مباراة البطولة = ينسحب والثاني يتأهل */
    tourForfeit(code, uid) {
        for (const t of this.d.tours) {
            if (t.status !== 'running')
                continue;
            for (const [ri, r] of t.rounds.entries())
                for (const [mi, m] of r.entries())
                    if (m.code === code && !m.winner && (m.a === uid || m.b === uid)) {
                        this.tourAdvance(t, ri, mi, m.a === uid ? m.b : m.a);
                        return true;
                    }
        }
        return false;
    }
    tourAdvance(t, ri, mi, w) {
        const m = t.rounds[ri][mi];
        m.winner = w;
        const loser = m.a === w ? m.b : m.a;
        if (loser)
            this.deps.notify(loser, { t: 'arena:tour', id: t.id, msg: `طلعت من بطولة ${t.gameName}. حظ أوفر 💪` });
        if (ri === t.rounds.length - 1) {
            this.tourFinish(t, w, loser);
            this.save();
            return;
        }
        const nm = t.rounds[ri + 1][Math.floor(mi / 2)];
        if (mi % 2 === 0)
            nm.a = w;
        else
            nm.b = w;
        this.deps.notify(w, { t: 'arena:tour', id: t.id, msg: `تأهلت للدور اللي بعده ببطولة ${t.gameName} 🔥` });
        this.save();
        void this.tourKick(t);
    }
    tourFinish(t, w, second) {
        t.status = 'done';
        t.winner = w;
        t.second = second;
        t.endedAt = this.now();
        const pool = t.fee * t.size;
        if (pool) {
            const first = Math.floor(pool * 0.7), sec = pool - first;
            this.deps.wallet.grant(w, first, `بطل بطولة ${t.gameName} 🏆`, `tour:${t.id}:prize1`);
            if (second)
                this.deps.wallet.grant(second, sec, `وصيف بطولة ${t.gameName} 🥈`, `tour:${t.id}:prize2`);
        }
        for (const p of t.players)
            this.deps.notify(p.id, { t: 'arena:tour', id: t.id, msg: `🏆 ${this.deps.name(w) || 'لاعب'} بطل بطولة ${t.gameName}!` });
    }
    tourTick() {
        const now = this.now();
        let ch = false;
        for (const t of this.d.tours) {
            if (t.status === 'open' && now - t.createdAt > TOUR_OPEN_MS) {
                t.status = 'cancelled';
                t.endedAt = now;
                ch = true;
                for (const p of t.players) {
                    if (t.fee)
                        this.deps.wallet.grant(p.id, t.fee, 'استرداد رسم البطولة (ما اكتملت)', `tour:${t.id}:cancel:${p.id}`);
                    this.deps.notify(p.id, { t: 'arena:tour', id: t.id, msg: `بطولة ${t.gameName} انلغت لأنها ما اكتملت، ورجعنا لك الرسوم.` });
                }
            }
            if (t.status !== 'running')
                continue;
            for (const [ri, r] of t.rounds.entries())
                for (const [mi, m] of r.entries()) {
                    if (m.winner || !m.a || !m.b)
                        continue;
                    const act = m.code ? (this.deps.lastActivity?.(m.code) ?? null) : null;
                    if (m.code && now - m.at > 5 * 60_000 && (act === null || now - act > 5 * 60_000) && m.tries < 5) {
                        m.code = null;
                        ch = true;
                        void this.tourKick(t);
                        continue;
                    } // الغرفة اختفت أو نامت: نسوي غرفة يديدة
                    if ((m.code && now - m.at > TOUR_MATCH_MS) || (!m.code && m.tries >= 5)) {
                        this.tourAdvance(t, ri, mi, randomInt(2) ? m.a : m.b);
                        ch = true;
                    }
                    else if (!m.code && now - m.at > 20_000)
                        void this.tourKick(t);
                }
        }
        if (ch)
            this.save();
    }
    trimTours() { const keep = this.d.tours.filter((t) => t.status === 'open' || t.status === 'running'); const old = this.d.tours.filter((t) => t.status !== 'open' && t.status !== 'running').sort((a, b) => b.endedAt - a.endedAt).slice(0, 40); this.d.tours = [...keep, ...old]; }
    tourList(uid) {
        this.tourTick();
        const name = (id) => (id ? this.d.tours.flatMap((t) => t.players).find((p) => p.id === id)?.name ?? this.deps.name(id) : null);
        const view = (t) => ({ id: t.id, game: t.game, gameName: t.gameName, size: t.size, fee: t.fee, pool: t.fee * t.size, status: t.status, joined: t.players.length, mine: t.players.some((p) => p.id === uid), players: t.players.map((p) => p.name), createdAt: t.createdAt, closesAt: t.createdAt + TOUR_OPEN_MS,
            winner: name(t.winner), second: name(t.second),
            rounds: t.rounds.map((r) => r.map((m) => ({ a: name(m.a), b: name(m.b), w: name(m.winner), live: !!m.code && !m.winner, code: m.code && !m.winner && (m.a === uid || m.b === uid) ? m.code : null, me: m.a === uid || m.b === uid }))) });
        const act = this.d.tours.filter((t) => t.status === 'open' || t.status === 'running'), done = this.d.tours.filter((t) => t.status === 'done').sort((a, b) => b.endedAt - a.endedAt).slice(0, 10);
        return { open: act.map(view), done: done.map(view), sizes: TOUR_SIZES, fees: TOUR_FEES };
    }
    /* ---------- الدوري ---------- */
    leagueRoll() {
        const L = this.d.league, wk = leagueWeekOf(this.now());
        if (L.week === wk)
            return;
        const res = {};
        const ids = new Set([...Object.keys(L.tier), ...Object.keys(L.pts)]);
        for (let tier = 0; tier < LEAGUE_TIERS.length; tier++) {
            const inTier = [...ids].filter((id) => (L.tier[id] ?? 0) === tier);
            const active = inTier.filter((id) => (L.pts[id] ?? 0) > 0).sort((a, b) => (L.pts[b] ?? 0) - (L.pts[a] ?? 0) || (L.games[b] ?? 0) - (L.games[a] ?? 0));
            const n = active.length, up = n >= 3 ? Math.max(1, Math.floor(n * LEAGUE_MOVE)) : 0, down = n >= 3 ? Math.max(1, Math.floor(n * LEAGUE_MOVE)) : 0;
            active.forEach((id, k) => {
                const move = k < up && tier < LEAGUE_TIERS.length - 1 ? 1 : k >= n - down && tier > 0 ? -1 : 0;
                const prize = k < 3 ? LEAGUE_PRIZES[tier][k] : 0;
                if (prize)
                    this.deps.wallet.grant(id, prize, `جايزة الدوري الأسبوعي — ${LEAGUE_TIERS[tier]} (المركز ${k + 1})`, `league:${L.week}:${id}`);
                res[id] = { tier, rank: k + 1, move, prize };
            });
            for (const id of inTier)
                if (!(L.pts[id] > 0) && tier > 0)
                    res[id] = { tier, rank: 0, move: -1, prize: 0 };
        }
        const tier = {};
        for (const id of ids) {
            const nt = Math.max(0, Math.min(LEAGUE_TIERS.length - 1, (L.tier[id] ?? 0) + (res[id]?.move ?? 0)));
            if (nt > 0)
                tier[id] = nt;
        }
        this.d.league = { week: wk, tier, pts: {}, games: {}, names: Object.fromEntries(Object.entries(L.names).filter(([id]) => tier[id] !== undefined)), last: { week: L.week, res } };
        this.save();
    }
    leagueGame(players, winners) {
        this.leagueRoll();
        const L = this.d.league;
        for (const p of players) {
            L.pts[p.id] = (L.pts[p.id] ?? 0) + (winners.includes(p.id) ? 3 : 1);
            L.games[p.id] = (L.games[p.id] ?? 0) + 1;
            L.names[p.id] = p.name;
        }
        this.save();
    }
    leagueView(uid) {
        this.leagueRoll();
        const L = this.d.league;
        const my = L.tier[uid] ?? 0;
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
    cheer(from, to, amount, ref) {
        need([10, 100, 1000].includes(amount), 'مبلغ غير صالح.', 400);
        need(from !== to, 'ما تقدر تشجع نفسك 😄');
        const p = this.deps.wallet.spend(from, amount, 'تشجيع لاعب بمباراة', `cheer:${ref}`);
        need(p.ok, p.code === 'poor' ? 'رصيدك ما يكفي.' : 'تعذّر الدفع.', 402);
        this.deps.wallet.grant(to, amount, `تشجيع من ${this.deps.name(from) || 'مشجع'}`, `cheer:${ref}:to`);
        this.logXfer('cheer', from, to, amount);
        this.save();
    }
    logXfer(kind, from, to, amt) {
        const l = (this.d.xfer ??= []);
        l.push({ at: this.now(), kind, from, to, amt });
        if (l.length > 3000)
            l.splice(0, l.length - 3000);
        const since = this.now() - 7 * 86_400_000;
        let n = 0, sum = 0;
        for (const x of l)
            if (x.at >= since && x.from === from && x.to === to) {
                n++;
                sum += x.amt;
            }
        if (n >= XFER_FLAG_COUNT || sum >= XFER_FLAG_SUM) {
            const wk = Math.floor(this.now() / (7 * 86_400_000));
            this.alert('xfer', '⚠️ تحويلات مشبوهة', `${this.deps.name(from) || 'حساب'} حوّل لـ ${this.deps.name(to) || 'حساب'} ${n} مرة بمجموع ${sum.toLocaleString('en-US')} عملة خلال 7 أيام (ظرف حظ/تشجيع). شيك عليهم من «ألعاب الحظ والتحويلات».`, `xfer:${from}:${to}:${wk}`);
        }
    }
    /** يسجل التنبيه مرة وحدة لكل مفتاح ويرسله للإدارة */
    alert(kind, title, text, key) {
        const l = (this.d.alerts ??= []);
        if (l.some((a) => a.key === key))
            return false;
        const a = { at: this.now(), kind, title, text, key };
        l.unshift(a);
        if (l.length > 200)
            l.length = 200;
        this.save();
        try {
            this.deps.onAlert?.(a);
        }
        catch { /* التنبيه ما يوقف العملية */ }
        return true;
    }
    alertsView() { return (this.d.alerts ?? []).slice(0, 60); }
    /** للإدارة: التحويلات بين الحسابات (ظرف الحظ + التشجيع) والأزواج المشبوهة آخر 7 أيام */
    xferAdmin(name) {
        const since = this.now() - 7 * 86_400_000;
        const l = (this.d.xfer ?? []).filter((x) => x.at >= since);
        const pairs = new Map();
        for (const x of l) {
            const k = x.from + '>' + x.to;
            const p = pairs.get(k) ?? { from: x.from, to: x.to, n: 0, sum: 0, last: 0, kinds: new Set() };
            p.n++;
            p.sum += x.amt;
            p.last = Math.max(p.last, x.at);
            p.kinds.add(x.kind);
            pairs.set(k, p);
        }
        const recv = new Map();
        for (const x of l) {
            const r = recv.get(x.to) ?? { n: 0, sum: 0, from: new Set() };
            r.n++;
            r.sum += x.amt;
            r.from.add(x.from);
            recv.set(x.to, r);
        }
        const flagged = [...pairs.values()].filter((p) => p.n >= XFER_FLAG_COUNT || p.sum >= XFER_FLAG_SUM).sort((a, b) => b.sum - a.sum).slice(0, 50)
            .map((p) => ({ from: name(p.from), fromId: p.from, to: name(p.to), toId: p.to, n: p.n, sum: p.sum, last: p.last, kinds: [...p.kinds] }));
        const top = [...recv.entries()].sort((a, b) => b[1].sum - a[1].sum).slice(0, 15).map(([id, r]) => ({ name: name(id), id, n: r.n, sum: r.sum, senders: r.from.size }));
        const recent = l.slice(-80).reverse().map((x) => ({ at: x.at, kind: x.kind, from: name(x.from), to: name(x.to), amt: x.amt }));
        return { flagged, top, recent, rule: { count: XFER_FLAG_COUNT, sum: XFER_FLAG_SUM }, total7d: l.reduce((a, x) => a + x.amt, 0) };
    }
    /* ---------- أغاني الغرفة ---------- */
    mus(room) { let m = this.music.get(room); if (!m) {
        m = { queue: [], cur: null, paused: null };
        this.music.set(room, m);
    } return m; }
    musicView(room) { const m = this.music.get(room); const t = this.now(); return m ? { cur: m.cur ? { vid: m.cur.vid, byName: m.cur.byName, pos: Math.max(0, ((m.paused ?? t) - m.cur.startAt) / 1000), paused: m.paused !== null } : null, queue: m.queue.map((q) => ({ vid: q.vid, byName: q.byName })) } : { cur: null, queue: [] }; }
    musicAdd(room, uid, vid) {
        need(YT_ID.test(vid), 'رابط يوتيوب غير صالح.', 400);
        const m = this.mus(room);
        need(m.queue.length < MUSIC_QUEUE_MAX, 'القائمة مليانة.');
        need(m.queue.filter((q) => q.by === uid).length < MUSIC_PER_USER, `لك ${MUSIC_PER_USER} أغاني بالقائمة، انتظر لين تشتغل.`);
        const tr = { vid, by: uid, byName: this.deps.name(uid) || 'لاعب' };
        if (!m.cur) {
            m.cur = { ...tr, startAt: this.now() };
            m.paused = null;
        }
        else
            m.queue.push(tr);
    }
    musicSkip(room, uid, mod) { const m = this.mus(room); need(m.cur, 'ما فيه أغنية شغالة.'); need(mod || m.cur.by === uid, 'للمشرفين أو صاحب الأغنية بس.'); this.musicNext(m); }
    musicEnded(room, vid) { const m = this.music.get(room); if (m?.cur && m.cur.vid === vid && m.paused === null && this.now() - m.cur.startAt > 15_000)
        this.musicNext(m); }
    musicPause(room, mod, pause) { const m = this.mus(room); need(mod, 'للمشرفين بس.'); need(m.cur, 'ما فيه أغنية شغالة.'); const t = this.now(); if (pause && m.paused === null)
        m.paused = t; if (!pause && m.paused !== null) {
        m.cur.startAt += t - m.paused;
        m.paused = null;
    } }
    musicClear(room, mod) { need(mod, 'للمشرفين بس.'); this.music.delete(room); }
    musicNext(m) { const n = m.queue.shift(); m.cur = n ? { ...n, startAt: this.now() } : null; m.paused = null; }
    /* ---------- التحقق بخطوتين ---------- */
    tfStatus(uid) { const x = this.d.tf[uid]; return { on: !!x?.on, pending: !!x && !x.on }; }
    tfEnabled(uid) { return !!this.d.tf[uid]?.on; }
    tfSetup(uid, label) {
        need(!this.d.tf[uid]?.on, 'التحقق بخطوتين مفعّل من قبل.');
        const secret = b32encode(randomBytes(20));
        this.d.tf[uid] = { secret, on: false, at: this.now(), last: 0, fails: 0, lockUntil: 0 };
        this.save();
        return { secret, uri: `otpauth://totp/${encodeURIComponent('لعبك:' + label)}?secret=${secret}&issuer=${encodeURIComponent('لعبك')}&digits=6&period=30` };
    }
    tfCheck(uid, code) {
        const x = this.d.tf[uid];
        if (!x)
            return false;
        const t = this.now();
        need(x.lockUntil <= t, 'محاولات كثيرة غلط. جرّب بعد 10 دقايق.', 429);
        const c = String(code ?? '').replace(/\D/g, '');
        const step = Math.floor(t / 30_000);
        for (const s of [step, step - 1, step + 1])
            if (c.length === 6 && s > x.last && totp(x.secret, s) === c) {
                x.last = s;
                x.fails = 0;
                this.save();
                return true;
            }
        x.fails++;
        if (x.fails >= 5) {
            x.lockUntil = t + 10 * 60_000;
            x.fails = 0;
        }
        this.save();
        return false;
    }
    tfEnable(uid, code) { const x = this.d.tf[uid]; need(x && !x.on, 'ابدأ التفعيل من جديد.'); need(this.tfCheck(uid, code), 'الرمز غلط. تأكد من الوقت بجوالك وجرّب الرمز الجديد.', 400); x.on = true; this.save(); }
    tfDisable(uid, code) { const x = this.d.tf[uid]; need(x, 'التحقق بخطوتين مو مفعّل.'); if (x.on)
        need(this.tfCheck(uid, code), 'الرمز غلط.', 400); delete this.d.tf[uid]; this.save(); }
    /** للدخول: true لو ما يحتاج أو الرمز صح */
    tfLogin(uid, code) { if (!this.tfEnabled(uid))
        return true; if (code === undefined || code === null || code === '')
        return false; return this.tfCheck(uid, code); }
    /** للإدارة: فك التحقق لو اللاعب ضيّع جواله */
    tfReset(uid) { if (!this.d.tf[uid])
        return false; delete this.d.tf[uid]; this.save(); return true; }
    tick() { this.envTick(); this.tourTick(); this.leagueRoll(); }
}
