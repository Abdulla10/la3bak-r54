/** R67ae: إعدادات تشغيل يغيّرها المالك من لوحة التحكم (بدون أسرار وبدون إعادة تشغيل).
 * كل قيمة لها حدود ثابتة هنا، وأي قيمة برا الحدود تنرفض. */
import { loadJsonFile, Persister, StorageMonitor } from './datafile.js';
export const STAKE_OPTIONS = Object.freeze([0, 100, 500, 1000, 2500, 5000, 10000, 50000]);
const validGamesOff = (v) => Array.isArray(v) && v.length <= 100 && v.every((g) => typeof g === 'string' && /^[a-z0-9_-]{1,40}$/i.test(g));
const validStakes = (v) => Array.isArray(v) && v.length >= 1 && v.length <= STAKE_OPTIONS.length && v.includes(0) && new Set(v).size === v.length && v.every((n) => STAKE_OPTIONS.includes(n));
export const SITE_FLAGS_DEFAULT = Object.freeze({ cinema: true, broadcast: true, streak: true, invite: true, firstTopupPercent: -1, bigGiftMin: 9000, profileBgVip: 6, gamesOff: [], stakes: [0, 100, 500], prizeBonus: 0 });
export const SITE_FLAG_LIMITS = Object.freeze({ firstTopupPercent: [-1, 200], bigGiftMin: [1000, 10_000_000], profileBgVip: [1, 15], prizeBonus: [0, 100] });
export const EVENT_SLOTS = Object.freeze(['frame', 'bg', 'chat-bubble', 'board', 'mic-frame', 'souvenir', 'title', 'badge', 'room-bg', 'special-id', 'room-id']);
const validEvent = (e) => isObj(e) && typeof e.id === 'string' && (e.kind === 'daily2x' || e.kind === 'slotSale') && typeof e.title === 'string' && Number.isSafeInteger(e.startsAt) && Number.isSafeInteger(e.endsAt) && e.endsAt > e.startsAt && typeof e.by === 'string' && (e.kind !== 'slotSale' || (typeof e.slot === 'string' && Number.isSafeInteger(e.percent) && e.percent >= 5 && e.percent <= 90));
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const inRange = (k, v) => Number.isSafeInteger(v) && v >= SITE_FLAG_LIMITS[k][0] && v <= SITE_FLAG_LIMITS[k][1];
function validFlags(x) {
    if (!isObj(x) || !isObj(x.flags))
        return false;
    if (x.tuning !== undefined && !isObj(x.tuning))
        return false;
    if (x.events !== undefined && (!Array.isArray(x.events) || x.events.length > 200 || !x.events.every(validEvent)))
        return false;
    if (x.words !== undefined && (!Array.isArray(x.words) || x.words.length > 500 || x.words.some((w) => typeof w !== 'string' || w.length < 2 || w.length > 40)))
        return false;
    for (const [k, v] of Object.entries(x.flags)) {
        if (k === 'cinema' || k === 'broadcast' || k === 'streak' || k === 'invite') {
            if (typeof v !== 'boolean')
                return false;
        }
        else if (k === 'gamesOff') {
            if (!validGamesOff(v))
                return false;
        }
        else if (k === 'stakes') {
            if (!validStakes(v))
                return false;
        }
        else if (k in SITE_FLAG_LIMITS) {
            if (!inRange(k, v))
                return false;
        }
        else
            return false;
    }
    return true;
}
export class SiteFlagsStore {
    now;
    d = { v: 1, flags: {}, at: 0, by: '' };
    disk;
    constructor(file, now = Date.now, mon = new StorageMonitor()) {
        this.now = now;
        if (file) {
            const l = loadJsonFile(file, validFlags);
            if (l)
                this.d = l;
        }
        this.disk = new Persister('site-flags', file, () => this.d, now, mon, validFlags);
    }
    get() { const f = { ...SITE_FLAGS_DEFAULT, ...this.d.flags }; return { ...f, gamesOff: [...f.gamesOff], stakes: [...f.stakes] }; }
    meta() { return { at: this.d.at, by: this.d.by }; }
    events() { return structuredClone(this.d.events ?? []); }
    activeEvents(now = this.now()) { return (this.d.events ?? []).filter((e) => !e.ended && e.startsAt <= now && now < e.endsAt); }
    saleFor(slot, now = this.now()) { let best = null; for (const e of this.activeEvents(now))
        if (e.kind === 'slotSale' && e.slot === slot && (!best || (e.percent ?? 0) > (best.percent ?? 0)))
            best = e; return best; }
    addEvent(input, by) {
        const kind = input.kind === 'slotSale' ? 'slotSale' : input.kind === 'daily2x' ? 'daily2x' : null;
        if (!kind)
            throw new Error('نوع الفعالية غير معروف.');
        const startsAt = Number(input.startsAt), hours = Number(input.hours);
        if (!Number.isSafeInteger(startsAt) || startsAt < this.now() - 3_600_000)
            throw new Error('وقت البداية غير صالح.');
        if (!Number.isSafeInteger(hours) || hours < 1 || hours > 24 * 14)
            throw new Error('المدة من ساعة إلى 14 يوم.');
        const ev = { id: 'ev-' + this.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, title: '', startsAt, endsAt: startsAt + hours * 3_600_000, by, at: this.now() };
        if (kind === 'slotSale') {
            const slot = String(input.slot ?? ''), percent = Number(input.percent);
            if (!EVENT_SLOTS.includes(slot))
                throw new Error('اختر قسم من المتجر.');
            if (!Number.isSafeInteger(percent) || percent < 5 || percent > 90)
                throw new Error('الخصم من 5% إلى 90%.');
            Object.assign(ev, { slot, percent, title: `خصم ${percent}%` });
        }
        else
            ev.title = 'ضعف المكافأة اليومية';
        const list = [...(this.d.events ?? []).filter((e) => e.endsAt > this.now() - 30 * 86_400_000).slice(-150), ev];
        const prev = this.d;
        this.d = { ...this.d, events: list };
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = prev;
            throw e;
        }
        return structuredClone(ev);
    }
    endEvent(id) {
        const ev = (this.d.events ?? []).find((e) => e.id === id);
        if (!ev)
            throw new Error('الفعالية غير موجودة.');
        if (ev.ended || ev.endsAt <= this.now())
            throw new Error('الفعالية خلصت من قبل.');
        const prev = structuredClone(this.d);
        ev.ended = true;
        ev.endsAt = Math.max(ev.startsAt + 1, this.now());
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = prev;
            throw e;
        }
        return structuredClone(ev);
    }
    tuning() { return this.d.tuning ? structuredClone(this.d.tuning) : null; }
    tuningMeta() { return { at: this.d.tuningAt ?? 0, by: this.d.tuningBy ?? '' }; }
    setTuning(t, by) { const prev = this.d; this.d = { ...this.d, tuningAt: this.now(), tuningBy: by }; if (t)
        this.d.tuning = structuredClone(t);
    else
        delete this.d.tuning; try {
        this.disk.mustSave();
    }
    catch (e) {
        this.d = prev;
        throw e;
    } }
    migrated(name) { return (this.d.migrations ?? []).includes(name); }
    markMigrated(name) { const prev = this.d; this.d = { ...this.d, migrations: [...(this.d.migrations ?? []), name].slice(-50) }; try {
        this.disk.mustSave();
    }
    catch (e) {
        this.d = prev;
        throw e;
    } }
    words() { return [...(this.d.words ?? [])]; }
    wordsMeta() { return { at: this.d.wordsAt ?? 0, by: this.d.wordsBy ?? '' }; }
    /** كلمات ممنوعة: إضافة/حذف — ترجع القائمة الجديدة */
    editWords(add, remove, by) {
        const list = (v) => (Array.isArray(v) ? v : []).map((w) => String(w ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim()).filter(Boolean);
        const a = list(add), r = new Set(list(remove));
        if (a.some((w) => w.length < 2 || w.length > 40))
            throw new Error('الكلمة لازم تكون من حرفين إلى 40 حرف.');
        const cur = this.words();
        const added = a.filter((w) => !cur.includes(w));
        const next = [...cur.filter((w) => !r.has(w)), ...added];
        if (next.length > 500)
            throw new Error('وصلت الحد الأقصى (500 كلمة).');
        const prev = this.d;
        this.d = { ...this.d, words: [...new Set(next)], wordsAt: this.now(), wordsBy: by };
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = prev;
            throw e;
        }
        return { words: this.words(), added, removed: cur.filter((w) => r.has(w)) };
    }
    /** يرجع التغييرات (قبل/بعد) أو يرمي برسالة عربية */
    update(input, by) {
        if (!isObj(input))
            throw new Error('بيانات غير صالحة.');
        const next = { ...this.d.flags };
        for (const [k, v] of Object.entries(input)) {
            if (k === 'cinema' || k === 'broadcast' || k === 'streak' || k === 'invite') {
                if (typeof v !== 'boolean')
                    throw new Error('قيمة تشغيل/إطفاء غير صالحة.');
                next[k] = v;
            }
            else if (k === 'gamesOff') {
                if (!validGamesOff(v))
                    throw new Error('قائمة الألعاب غير صالحة.');
                next.gamesOff = [...new Set(v)];
            }
            else if (k === 'stakes') {
                if (!validStakes(v))
                    throw new Error('رسوم الدخول لازم تكون من القائمة وفيها «مجانية».');
                next.stakes = [...v].sort((a, b) => a - b);
            }
            else if (k in SITE_FLAG_LIMITS) {
                const key = k;
                if (!inRange(key, v))
                    throw new Error(`القيمة لازم تكون بين ${SITE_FLAG_LIMITS[key][0]} و ${SITE_FLAG_LIMITS[key][1]}.`);
                next[key] = v;
            }
            else
                throw new Error('إعداد غير معروف.');
        }
        const before = this.get();
        const prev = this.d;
        this.d = { ...this.d, v: 1, flags: next, at: this.now(), by };
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = prev;
            throw e;
        }
        const after = this.get();
        return { before, after, changed: Object.keys(after).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])) };
    }
}
