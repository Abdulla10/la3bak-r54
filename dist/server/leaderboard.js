import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';
/**
 * نقاط الصدارة من ألعاب منتهية فيها لاعبان حقيقيان أو أكثر؛ الكمبيوتر واللعب بروحك ما يحسبون.
 * الأسبوع يبدأ السبت 00:00، والشهر يبدأ اليوم الأول 00:00 بتوقيت Asia/Dubai (UTC+4 بلا DST).
 * الأشهر تتجمع من التسجيلات الجديدة فقط؛ الأسابيع القديمة ما تكفي لإعادة بناء شهر دقيق.
 */
const GULF_MS = 4 * 3600_000;
const WEEK_MS = 7 * 24 * 3600_000;
// 1970-01-01 كان خميس؛ السبت الأول = 1970-01-03
const SAT_OFFSET = 2 * 24 * 3600_000;
const MONTHS_RETAINED = 12; // الشهر الحالي + 11 شهر تقويمي سابق، عند تسجيل نتيجة جديدة.
export const weekStartOf = (ts) => Math.floor((ts + GULF_MS - SAT_OFFSET) / WEEK_MS) * WEEK_MS + SAT_OFFSET - GULF_MS;
export const monthStartOf = (ts) => {
    const local = new Date(ts + GULF_MS);
    local.setUTCDate(1);
    local.setUTCHours(0, 0, 0, 0);
    return local.getTime() - GULF_MS;
};
const shiftMonthStart = (start, months) => {
    const local = new Date(start + GULF_MS);
    local.setUTCMonth(local.getUTCMonth() + months);
    return local.getTime() - GULF_MS;
};
export const nextMonthStartOf = (ts) => shiftMonthStart(monthStartOf(ts), 1);
const validCount = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const validTimestamp = (v) => validCount(v) && v < 8640000000000000 - GULF_MS;
const validBuckets = (buckets, monthly = false) => {
    if (!isObj(buckets))
        return false;
    for (const [start, bucket] of Object.entries(buckets)) {
        if (!start.trim() || !Number.isSafeInteger(Number(start)) || !isObj(bucket)
            || (monthly && monthStartOf(Number(start)) !== Number(start)))
            return false;
        for (const [id, row] of Object.entries(bucket)) {
            if (!isObj(row) || typeof row.id !== 'string' || !row.id || row.id !== id || typeof row.name !== 'string'
                || !validCount(row.points) || !validCount(row.wins) || !validCount(row.games))
                return false;
        }
    }
    return true;
};
export const validBoard = (d) => {
    if (!isObj(d))
        return false;
    // غياب الحاويات في الملفات القديمة مقبول؛ وجودها بنوع غلط أو بسجل ناقص مب مقبول.
    if (d.recorded !== undefined && (!Array.isArray(d.recorded) || !d.recorded.every((key) => typeof key === 'string')))
        return false;
    if (d.weeks !== undefined && !validBuckets(d.weeks))
        return false;
    if (d.months !== undefined && !validBuckets(d.months, true))
        return false;
    if (d.monthlySince !== undefined && !validTimestamp(d.monthlySince))
        return false;
    return true;
};
export const POINTS = { played: 10, won: 20 };
export class Leaderboard {
    now;
    d = { weeks: {}, recorded: [] };
    disk;
    constructor(file = '', now = Date.now, mon = new StorageMonitor()) {
        this.now = now;
        if (file) {
            const loaded = loadJsonFile(file, validBoard);
            if (loaded)
                this.d = loaded;
            this.d.weeks ??= {};
            this.d.recorded ??= [];
        }
        this.d.months ??= {};
        // لا backfill ولا تعديل ملف عند القراءة؛ تُحفظ بداية التتبع مع أول تسجيل مقبول.
        // لو أُعيد التشغيل قبله، البداية الجديدة محافظة (ما تدّعي تغطية غير محفوظة).
        this.d.monthlySince ??= this.now();
        this.disk = new Persister('leaderboard', file, () => this.d, now, mon);
    }
    /** يسجّل لعبة منتهية مرة وحدة فقط في الأسبوع والشهر معاً. يرجّع true إذا انحسبت. */
    record(key, players, winners) {
        if (players.length < 2 || this.d.recorded.includes(key))
            return false;
        // نفس اللحظة للحاويتين حتى لو التسجيل صار على حدّ الشهر/الأسبوع.
        const ts = this.now(), start = weekStartOf(ts), month = monthStartOf(ts);
        const week = (this.d.weeks[String(start)] ??= {});
        const monthly = (this.d.months[String(month)] ??= {});
        for (const bucket of [week, monthly]) {
            for (const p of players) {
                const r = (bucket[p.id] ??= { id: p.id, name: p.name, points: 0, wins: 0, games: 0 });
                r.name = p.name;
                r.games++;
                r.points += POINTS.played;
                if (winners.includes(p.id)) {
                    r.wins++;
                    r.points += POINTS.won;
                }
            }
        }
        // مفاتيح النتائج دليل منع التكرار؛ ما تنحذف حتى لو انتهت نافذة عرض النقاط.
        this.d.recorded = [...this.d.recorded, key];
        // نفس حد الأسبوع القديم: الحالي + الأسابيع الثمانية السابقة (أقصى 9 حاويات).
        for (const k of Object.keys(this.d.weeks))
            if (Number(k) < start - 8 * WEEK_MS)
                delete this.d.weeks[k];
        const earliestMonth = shiftMonthStart(month, -(MONTHS_RETAINED - 1));
        for (const k of Object.keys(this.d.months))
            if (Number(k) < earliestMonth)
                delete this.d.months[k];
        this.save();
        return true;
    }
    standings(bucket, limit, me, avOf) {
        const rows = Object.values(bucket).sort((a, b) => b.points - a.points || b.wins - a.wins || a.games - b.games
            || a.name.localeCompare(b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        const present = (r, i) => ({ rank: i + 1, name: r.name, points: r.points, wins: r.wins,
            games: r.games, me: r.id === me, av: avOf ? avOf(r.id) : null });
        const list = rows.slice(0, limit).map(present);
        const idx = me ? rows.findIndex((r) => r.id === me) : -1;
        return { total: rows.length, list, mine: idx >= 0 ? present(rows[idx], idx) : null };
    }
    top(limit = 20, me, avOf, period = 'weekly') {
        const ts = this.now();
        if (period === 'monthly') {
            const start = monthStartOf(ts), resetsAt = nextMonthStartOf(ts), trackingSince = this.d.monthlySince;
            return { period, timeZone: 'Asia/Dubai', monthStart: start, resetsAt,
                coverage: { trackingSince, from: trackingSince < resetsAt ? Math.max(start, trackingSince) : null, complete: trackingSince <= start },
                ...this.standings(this.d.months[String(start)] ?? {}, limit, me, avOf) };
        }
        const start = weekStartOf(ts);
        return { weekStart: start, resetsAt: start + WEEK_MS,
            ...this.standings(this.d.weeks[String(start)] ?? {}, limit, me, avOf) };
    }
    /** الحفظ بعد التسجيل: لو فشل تبقى النقاط بالذاكرة وتنعاد الكتابة (retry) وتظهر الحالة في /readyz. */
    save() { this.disk.save(); }
    /** R62: أوائل شهر معيّن (بداية الشهر بتوقيت الخليج) — لجوايز الموسم الشهري */
    monthRows(start, limit = 10) { const b = this.d.months?.[String(start)]; if (!b)
        return []; return Object.values(b).filter((r) => r.points > 0).sort((a, b2) => b2.points - a.points || b2.wins - a.wins || a.games - b2.games || a.id.localeCompare(b2.id)).slice(0, limit).map((r) => ({ ...r })); }
    retry() { this.disk.retry(); }
    /** نتائج بالذاكرة ما انكتبت بعد */
    unsaved() { return this.disk.unsaved; }
}
