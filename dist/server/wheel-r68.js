/** R68z: عجلة الحظ — لفة مجانية كل يوم (بتوقيت الإمارات) ولفات إضافية بالعملات.
 * النتيجة يختارها الخادم بس (crypto)، والجوائز عملات فقط (عملة وحدة بالموقع). */
import { randomInt } from 'node:crypto';
import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';
/** 8 خانات — المتوسط أقل من سعر اللفة المدفوعة عشان ما تصير مصدر عملات */
export const WHEEL_PRIZES = Object.freeze([
    { id: 'c100', label: '100', coins: 100, weight: 34.3, color: '#7b3cff' },
    { id: 'c300', label: '300', coins: 300, weight: 25, color: '#ff8a2e' },
    { id: 'c500', label: '500', coins: 500, weight: 20, color: '#b44dff' },
    { id: 'c1k', label: '1,000', coins: 1000, weight: 10, color: '#2fbf71' },
    { id: 'c2k', label: '2,000', coins: 2000, weight: 6, color: '#e0457b' },
    { id: 'c5k', label: '5,000', coins: 5000, weight: 3, color: '#2f8cff' },
    { id: 'c10k', label: '10,000', coins: 10000, weight: 1.5, color: '#ffc83d' },
    { id: 'c50k', label: '50,000', coins: 50000, weight: 0.2, color: '#ff3d3d' },
]);
export const WHEEL_PAID_COST = 1000;
export const WHEEL_PAID_MAX = 20;
const valid = (x) => x.v === 1 && isObj(x.users) && Array.isArray(x.feed);
export const dubaiDay = (t) => new Date(t + 4 * 3_600_000).toISOString().slice(0, 10);
export class LuckyWheel {
    now;
    d = { v: 1, users: {}, feed: [], seq: 0 };
    disk;
    constructor(file, now = Date.now, mon = new StorageMonitor()) {
        this.now = now;
        if (file) {
            const l = loadJsonFile(file, valid);
            if (l)
                this.d = l;
        }
        this.disk = new Persister('lucky-wheel', file, () => this.d, now, mon, valid);
    }
    today(id) { const day = dubaiDay(this.now()); const u = this.d.users[id]; return u && u.day === day ? u : { day, free: false, paid: 0 }; }
    state(id) { const u = this.today(id); return { freeLeft: !u.free, paidLeft: Math.max(0, WHEEL_PAID_MAX - u.paid), cost: WHEEL_PAID_COST, prizes: WHEEL_PRIZES.map(({ id: pid, label, coins, color }) => ({ id: pid, label, coins, color })), feed: this.d.feed.slice(-12).reverse().map(({ at, name, coins }) => ({ at, name, coins })) }; }
    /** يختار النتيجة ويحجز اللفة (قبل الدفع/المنح). يرجع رقم العملية للمفتاح. */
    reserve(id, paid) {
        const u = this.today(id);
        if (!paid && u.free)
            throw new Error('استخدمت لفتك المجانية اليوم. ترجع بكرة!');
        if (paid && u.paid >= WHEEL_PAID_MAX)
            throw new Error(`وصلت حد اللفات اليوم (${WHEEL_PAID_MAX}).`);
        const total = WHEEL_PRIZES.reduce((n, p) => n + p.weight * 10, 0);
        let r = randomInt(Math.round(total)), index = 0;
        for (; index < WHEEL_PRIZES.length; index++) {
            r -= WHEEL_PRIZES[index].weight * 10;
            if (r < 0)
                break;
        }
        index = Math.min(index, WHEEL_PRIZES.length - 1);
        const prev = structuredClone(this.d);
        const next = { ...u };
        if (paid)
            next.paid++;
        else
            next.free = true;
        this.d.users[id] = next;
        this.d.seq++;
        const op = `wheel:${id}:${u.day}:${paid ? 'p' + next.paid : 'f'}:${this.d.seq}`;
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = prev;
            throw e;
        }
        return { prize: WHEEL_PRIZES[index], index, op };
    }
    /** لو فشل الدفع نرجع اللفة */
    release(id, paid) { const u = this.d.users[id]; if (!u)
        return; if (paid)
        u.paid = Math.max(0, u.paid - 1);
    else
        u.free = false; this.disk.save(); }
    win(id, name, coins) { if (coins < 2000)
        return; this.d.feed.push({ at: this.now(), id, name, coins }); if (this.d.feed.length > 50)
        this.d.feed.splice(0, this.d.feed.length - 50); this.disk.save(); }
}
