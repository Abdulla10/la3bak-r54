/** R67ae: حذف الحساب — اللاعب يطلب الحذف، والحساب يتعطل فورًا ويختفي، وعنده 30 يوم يتراجع فيها.
 * بعد 30 يوم الحذف ينفّذ (بيانات اللاعب الشخصية تنمسح، وتبقى السجلات المالية المطلوبة للتدقيق بدون اسم). */
import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';
export const DELETION_GRACE_MS = 30 * 86_400_000;
const valid = (x) => x.v === 1 && isObj(x.u) && Object.values(x.u).every((r) => isObj(r) && Number.isSafeInteger(r.at) && Number.isSafeInteger(r.executeAt) && (r.done === undefined || Number.isSafeInteger(r.done)));
export class AccountDeletion {
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
        this.disk = new Persister('account-deletion', file, () => this.d, now, mon, valid);
    }
    save(prev) { try {
        this.disk.mustSave();
    }
    catch (e) {
        this.d = prev;
        throw e;
    } }
    /** طلب جاري (ما انحذف ولا تراجع) */
    pending(id) { const r = this.d.u[id]; return r && !r.done ? { ...r } : null; }
    deleted(id) { return !!this.d.u[id]?.done; }
    /** مخفي عن الناس: طلب جاري أو محذوف */
    hidden(id) { return !!this.d.u[id]; }
    request(id) {
        const old = this.pending(id);
        if (old)
            return old;
        const prev = structuredClone(this.d);
        const now = this.now();
        this.d.u[id] = { at: now, executeAt: now + DELETION_GRACE_MS };
        this.save(prev);
        return { ...this.d.u[id] };
    }
    cancel(id) {
        const r = this.d.u[id];
        if (!r || r.done)
            return false;
        const prev = structuredClone(this.d);
        delete this.d.u[id];
        this.save(prev);
        return true;
    }
    due() { const now = this.now(); return Object.entries(this.d.u).filter(([, r]) => !r.done && r.executeAt <= now).map(([id]) => id); }
    markDone(id) { const r = this.d.u[id]; if (!r || r.done)
        return; const prev = structuredClone(this.d); r.done = this.now(); this.save(prev); }
    list() { return Object.entries(this.d.u).map(([id, r]) => ({ id, at: r.at, executeAt: r.executeAt, done: r.done ?? null })).sort((a, b) => b.at - a.at); }
}
