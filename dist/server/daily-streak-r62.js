/* R62: هدية الدخول اليومي المتصاعدة — 7 أيام ورا بعض. اليوم السابع أكبر هدية، ولو فوّت يوم ترجع من الأول، وبعد اليوم السابع تبدأ دورة جديدة.
   مكافأة الـ200 عملة اليومية القديمة باقية مثل ما هي؛ هذي إضافة فوقها تنصرف بمفتاح ثابت لكل يوم (ما تتكرر حتى لو انضغط الزر مرتين). */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
export const STREAK_LADDER = Object.freeze([
    { day: 1, coins: 0, gems: 0 }, { day: 2, coins: 100, gems: 0 }, { day: 3, coins: 200, gems: 0 }, { day: 4, coins: 300, gems: 0 },
    { day: 5, coins: 500, gems: 0 }, { day: 6, coins: 800, gems: 0 }, { day: 7, coins: 2300, gems: 0 },
]);
export const BASE_DAILY = 200;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const valid = (v) => v.v === 1 && isObj(v.u) && Object.values(v.u).every((r) => isObj(r) && typeof r.last === 'string' && DAY.test(r.last) && Number.isSafeInteger(r.n) && r.n >= 1 && r.n <= 7 && Number.isSafeInteger(r.best));
const GULF = 4 * 3600_000;
export const dayOf = (t) => new Date(t + GULF).toISOString().slice(0, 10);
const prevDay = (d) => new Date(Date.parse(d + 'T00:00:00Z') - 86400_000).toISOString().slice(0, 10);
export class DailyStreak {
    now;
    d = { v: 1, u: {} };
    disk;
    constructor(file, now = Date.now, mon = new StorageMonitor()) {
        this.now = now;
        if (file) {
            const l = loadJsonFile(file, valid);
            if (l)
                this.d = l;
        }
        this.disk = new Persister('daily-streak', file, () => this.d, now, mon, valid);
    }
    /** اليوم اللي بياخذه لو استلم الحين (1..7) */
    nextFor(r, today) { if (!r)
        return 1; if (r.last === today)
        return r.n; if (r.last === prevDay(today))
        return r.n >= 7 ? 1 : r.n + 1; return 1; }
    view(id, canClaim) {
        const today = dayOf(this.now()), r = this.d.u[id];
        const claimedToday = !canClaim || r?.last === today;
        const day = claimedToday ? (r?.last === today ? r.n : this.nextFor(r, today)) : this.nextFor(r, today);
        const broken = !!r && r.last !== today && r.last !== prevDay(today);
        return { ok: true, day, claimedToday, broken, best: r?.best ?? 0, base: BASE_DAILY, ladder: STREAK_LADDER.map((x) => ({ ...x, total: BASE_DAILY + x.coins })) };
    }
    /** يسجّل استلام اليوم ويرجع رقم اليوم بالسلسلة. ينادى بس بعد ما تنجح المكافأة اليومية الأصلية. */
    claim(id) {
        const today = dayOf(this.now()), r = this.d.u[id];
        if (r?.last === today)
            return { day: r.n, today, bonus: { coins: 0, gems: 0 } };
        const n = this.nextFor(r, today);
        this.d.u[id] = { last: today, n, best: Math.max(r?.best ?? 0, n) };
        this.disk.save();
        const step = STREAK_LADDER[n - 1];
        return { day: n, today, bonus: { coins: step.coins, gems: step.gems } };
    }
}
