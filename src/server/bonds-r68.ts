import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

/** R68z36: علاقات عامة بين لاعبين — BF (أصدقاء) / BR (أخ) / SS (أخت).
 * الطلب يحتاج موافقة الطرف الثاني، وأي طرف ينهي العلاقة متى ما بغى. تظهر بملف الطرفين للكل. */
export type BondKind = 'bf' | 'br' | 'ss';
export const BOND_KINDS: readonly BondKind[] = ['bf', 'br', 'ss'];
export const BOND_LIMIT = 10; // لكل نوع لكل لاعب
type Bond = { id: number; a: string; b: string; kind: BondKind; at: number };
type Req = { id: number; from: string; to: string; kind: BondKind; at: number };
type Data = { v: 1; seq: number; bonds: Bond[]; reqs: Req[] };
const ID = /^[0-9a-f-]{36}$/i;
const okKind = (k: unknown): k is BondKind => typeof k === 'string' && (BOND_KINDS as readonly string[]).includes(k);
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const okRow = (r: unknown, f1: string, f2: string) => isObj(r) && nat(r.id) && typeof r[f1] === 'string' && typeof r[f2] === 'string' && ID.test(r[f1] as string) && ID.test(r[f2] as string) && okKind(r.kind) && nat(r.at);
export function validBonds(x: unknown): boolean {
  return isObj(x) && x.v === 1 && nat(x.seq) && Array.isArray(x.bonds) && Array.isArray(x.reqs) && x.bonds.length <= 500_000 && x.reqs.length <= 500_000 && x.bonds.every((r) => okRow(r, 'a', 'b')) && x.reqs.every((r) => okRow(r, 'from', 'to'));
}
export class BondError extends Error { constructor(msg: string) { super(msg); } }
export class Bonds {
  private d: Data = { v: 1, seq: 0, bonds: [], reqs: [] };
  private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const loaded = loadJsonFile(file, validBonds); if (loaded) this.d = loaded as unknown as Data; }
    this.disk = new Persister('bonds', file, () => this.d, now, mon, validBonds);
  }
  private tx<T>(fn: () => T): T { const prev = structuredClone(this.d); try { const r = fn(); this.disk.mustSave(); return r; } catch (e) { this.d = prev; throw e; } }
  of(id: string): Bond[] { return this.d.bonds.filter((x) => x.a === id || x.b === id); }
  between(a: string, b: string): Bond | undefined { return this.d.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)); }
  reqsFor(id: string) { return { incoming: this.d.reqs.filter((r) => r.to === id), outgoing: this.d.reqs.filter((r) => r.from === id) }; }
  pendingBetween(a: string, b: string): Req | undefined { return this.d.reqs.find((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a)); }
  count(id: string, kind: BondKind) { return this.of(id).filter((x) => x.kind === kind).length; }
  request(from: string, to: string, kind: unknown): Req {
    if (!okKind(kind)) throw new BondError('نوع العلاقة غير صالح.');
    if (from === to) throw new BondError('ما تقدر تطلب علاقة مع نفسك.');
    if (this.between(from, to)) throw new BondError('بينكم علاقة من قبل.');
    if (this.pendingBetween(from, to)) throw new BondError('فيه طلب بينكم ينتظر الرد.');
    if (this.count(from, kind) >= BOND_LIMIT) throw new BondError(`وصلت الحد (${BOND_LIMIT}) لهالنوع.`);
    if (this.count(to, kind) >= BOND_LIMIT) throw new BondError('اللاعب وصل الحد لهالنوع.');
    if (this.d.reqs.filter((r) => r.from === from).length >= 30) throw new BondError('عندك طلبات كثيرة تنتظر الرد.');
    return this.tx(() => { const r: Req = { id: ++this.d.seq, from, to, kind, at: this.now() }; this.d.reqs.push(r); return r; });
  }
  answer(me: string, id: number, accept: boolean): Bond | null {
    const r = this.d.reqs.find((x) => x.id === id && x.to === me); if (!r) throw new BondError('الطلب غير موجود.');
    return this.tx(() => {
      this.d.reqs = this.d.reqs.filter((x) => x.id !== id);
      if (!accept) return null;
      if (this.between(r.from, r.to)) throw new BondError('بينكم علاقة من قبل.');
      if (this.count(me, r.kind) >= BOND_LIMIT || this.count(r.from, r.kind) >= BOND_LIMIT) throw new BondError('واحد منكم وصل الحد لهالنوع.');
      const b: Bond = { id: ++this.d.seq, a: r.from, b: r.to, kind: r.kind, at: this.now() }; this.d.bonds.push(b); return b;
    });
  }
  cancel(me: string, id: number): void { if (!this.d.reqs.some((x) => x.id === id && x.from === me)) throw new BondError('الطلب غير موجود.'); this.tx(() => { this.d.reqs = this.d.reqs.filter((x) => x.id !== id); }); }
  end(me: string, id: number): Bond { const b = this.d.bonds.find((x) => x.id === id && (x.a === me || x.b === me)); if (!b) throw new BondError('العلاقة غير موجودة.'); this.tx(() => { this.d.bonds = this.d.bonds.filter((x) => x.id !== id); }); return b; }
  /** حذف حساب/حظر: يشيل كل شي بين الاثنين */
  dropPair(a: string, b: string): void { const has = this.between(a, b) || this.pendingBetween(a, b); if (!has) return; this.tx(() => { const m = (x: string, y: string) => (x === a && y === b) || (x === b && y === a); this.d.bonds = this.d.bonds.filter((x) => !m(x.a, x.b)); this.d.reqs = this.d.reqs.filter((x) => !m(x.from, x.to)); }); }
}
