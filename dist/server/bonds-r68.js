import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
export const BOND_KINDS = ['bf', 'br', 'ss'];
export const BOND_LIMIT = 10; // لكل نوع لكل لاعب
const ID = /^[0-9a-f-]{36}$/i;
const okKind = (k) => typeof k === 'string' && BOND_KINDS.includes(k);
const nat = (x) => Number.isSafeInteger(x) && x >= 0;
const okRow = (r, f1, f2) => isObj(r) && nat(r.id) && typeof r[f1] === 'string' && typeof r[f2] === 'string' && ID.test(r[f1]) && ID.test(r[f2]) && okKind(r.kind) && nat(r.at);
export function validBonds(x) {
    return isObj(x) && x.v === 1 && nat(x.seq) && Array.isArray(x.bonds) && Array.isArray(x.reqs) && x.bonds.length <= 500_000 && x.reqs.length <= 500_000 && x.bonds.every((r) => okRow(r, 'a', 'b')) && x.reqs.every((r) => okRow(r, 'from', 'to'));
}
export class BondError extends Error {
    constructor(msg) { super(msg); }
}
export class Bonds {
    now;
    d = { v: 1, seq: 0, bonds: [], reqs: [] };
    disk;
    constructor(file, now = Date.now, mon = new StorageMonitor()) {
        this.now = now;
        if (file) {
            const loaded = loadJsonFile(file, validBonds);
            if (loaded)
                this.d = loaded;
        }
        this.disk = new Persister('bonds', file, () => this.d, now, mon, validBonds);
    }
    tx(fn) { const prev = structuredClone(this.d); try {
        const r = fn();
        this.disk.mustSave();
        return r;
    }
    catch (e) {
        this.d = prev;
        throw e;
    } }
    of(id) { return this.d.bonds.filter((x) => x.a === id || x.b === id); }
    between(a, b) { return this.d.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)); }
    reqsFor(id) { return { incoming: this.d.reqs.filter((r) => r.to === id), outgoing: this.d.reqs.filter((r) => r.from === id) }; }
    pendingBetween(a, b) { return this.d.reqs.find((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a)); }
    count(id, kind) { return this.of(id).filter((x) => x.kind === kind).length; }
    request(from, to, kind) {
        if (!okKind(kind))
            throw new BondError('نوع العلاقة غير صالح.');
        if (from === to)
            throw new BondError('ما تقدر تطلب علاقة مع نفسك.');
        if (this.between(from, to))
            throw new BondError('بينكم علاقة من قبل.');
        if (this.pendingBetween(from, to))
            throw new BondError('فيه طلب بينكم ينتظر الرد.');
        if (this.count(from, kind) >= BOND_LIMIT)
            throw new BondError(`وصلت الحد (${BOND_LIMIT}) لهالنوع.`);
        if (this.count(to, kind) >= BOND_LIMIT)
            throw new BondError('اللاعب وصل الحد لهالنوع.');
        if (this.d.reqs.filter((r) => r.from === from).length >= 30)
            throw new BondError('عندك طلبات كثيرة تنتظر الرد.');
        return this.tx(() => { const r = { id: ++this.d.seq, from, to, kind, at: this.now() }; this.d.reqs.push(r); return r; });
    }
    answer(me, id, accept) {
        const r = this.d.reqs.find((x) => x.id === id && x.to === me);
        if (!r)
            throw new BondError('الطلب غير موجود.');
        return this.tx(() => {
            this.d.reqs = this.d.reqs.filter((x) => x.id !== id);
            if (!accept)
                return null;
            if (this.between(r.from, r.to))
                throw new BondError('بينكم علاقة من قبل.');
            if (this.count(me, r.kind) >= BOND_LIMIT || this.count(r.from, r.kind) >= BOND_LIMIT)
                throw new BondError('واحد منكم وصل الحد لهالنوع.');
            const b = { id: ++this.d.seq, a: r.from, b: r.to, kind: r.kind, at: this.now() };
            this.d.bonds.push(b);
            return b;
        });
    }
    cancel(me, id) { if (!this.d.reqs.some((x) => x.id === id && x.from === me))
        throw new BondError('الطلب غير موجود.'); this.tx(() => { this.d.reqs = this.d.reqs.filter((x) => x.id !== id); }); }
    end(me, id) { const b = this.d.bonds.find((x) => x.id === id && (x.a === me || x.b === me)); if (!b)
        throw new BondError('العلاقة غير موجودة.'); this.tx(() => { this.d.bonds = this.d.bonds.filter((x) => x.id !== id); }); return b; }
    /** حذف حساب/حظر: يشيل كل شي بين الاثنين */
    dropPair(a, b) { const has = this.between(a, b) || this.pendingBetween(a, b); if (!has)
        return; this.tx(() => { const m = (x, y) => (x === a && y === b) || (x === b && y === a); this.d.bonds = this.d.bonds.filter((x) => !m(x.a, x.b)); this.d.reqs = this.d.reqs.filter((x) => !m(x.from, x.to)); }); }
}
