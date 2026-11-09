import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';
export const validIdentities = (d) => {
    if (!isObj(d) || (d.v !== undefined && d.v !== 1))
        return false;
    // v والحاوية ممكن يغيبون في ملف قديم؛ حقول سجل الربط نفسه لازم تكون سليمة.
    if (d.bySub === undefined)
        return true;
    if (!isObj(d.bySub))
        return false;
    const ids = new Set();
    for (const [sub, link] of Object.entries(d.bySub)) {
        if (!sub || !isObj(link) || typeof link.id !== 'string' || !link.id
            || typeof link.at !== 'number' || !Number.isSafeInteger(link.at) || link.at < 0 || ids.has(link.id))
            return false;
        ids.add(link.id);
    }
    return true;
};
export class Identities {
    now;
    d = { v: 1, bySub: {} };
    byId = new Map();
    disk;
    constructor(file = '', now = Date.now, mon = new StorageMonitor()) {
        this.now = now;
        if (file) {
            const loaded = loadJsonFile(file, validIdentities);
            if (loaded)
                this.d = loaded;
            this.d.bySub ??= {};
        }
        for (const [sub, v] of Object.entries(this.d.bySub))
            this.byId.set(v.id, sub);
        this.disk = new Persister('identities', file, () => this.d, now, mon);
    }
    linked(id) { return this.byId.has(id); }
    /** R67ae: حذف الحساب — يفك ربط Google عشان نفس الإيميل يقدر يسوي حساب جديد */
    unlink(id) { const sub = this.byId.get(id); if (!sub)
        return false; const prev = this.d.bySub[sub]; delete this.d.bySub[sub]; this.byId.delete(id); try {
        this.disk.mustSave();
    }
    catch (e) {
        this.d.bySub[sub] = prev;
        this.byId.set(id, sub);
        throw e;
    } return true; }
    /**
     * يحدد حساب اللعب لهذا الدخول:
     *  - sub مربوط من قبل → نفس الحساب (يشتغل من أي جهاز)
     *  - غير مربوط → نربطه بالحساب الحالي إذا هو حر (ما هو مربوط بـ Google ثاني)، وإلا حساب جديد
     * beforeCommit اختياري ومتزامن: يجهّز الحساب المحدد قبل أي ربط جديد/حفظ. رميه لا يغيّر الهوية، حتى لو الربط موجود.
     */
    resolve(sub, currentId, fresh, beforeCommit) {
        const hit = this.d.bySub[sub];
        if (hit) {
            const result = { id: hit.id, created: false, adopted: false };
            beforeCommit?.({ ...result });
            return result;
        }
        const adopt = !!currentId && !this.byId.has(currentId);
        const id = adopt ? currentId : fresh();
        const result = { id, created: !adopt, adopted: adopt };
        beforeCommit?.({ ...result });
        this.d.bySub[sub] = { id, at: this.now() };
        this.byId.set(id, sub);
        // الربط لازم ينحفظ قبل ما نعتبره تم؛ لو فشل نتراجع (ما يبقى ربط بالذاكرة فقط) ونرمي StorageError
        try {
            this.disk.mustSave();
        }
        catch (e) {
            delete this.d.bySub[sub];
            this.byId.delete(id);
            throw e;
        }
        return result;
    }
    retry() { this.disk.retry(); }
    unsaved() { return this.disk.unsaved; }
}
