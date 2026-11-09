import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

/** R58x: القبائل — نظام عام منفصل عن «العائلة» الخاصة (R47).
 * - الإنشاء يحتاج غرفة يملكها المؤسس وصلت ليفل TRIBE_ROOM_LEVEL (طلب المالك)، وحساب مؤهل للمجتمع (مو قاصر مصرّح).
 * - كل حساب بقبيلة وحدة. الانضمام بطلب يوافق عليه القائد. القائد يطرد ويوافق ويحل القبيلة.
 * - نقاط القبيلة = قيمة الهدايا (بالجواهر) اللي يرسلها أعضاؤها، من إيصال المحفظة. والمستوى والشعار والسعة من النقاط الكلية، والترتيب بنقاط الشهر. */
export const TRIBE_ROOM_LEVEL = 10;
export const TRIBE_LEVELS = Object.freeze([
  ({ level: 1, min: 0, cap: 30, name: 'قبيلة ناشئة' }),
  ({ level: 2, min: 1_000_000, cap: 40, name: 'قبيلة صاعدة' }),
  ({ level: 3, min: 5_000_000, cap: 50, name: 'قبيلة عريقة' }),
  ({ level: 4, min: 20_000_000, cap: 60, name: 'قبيلة أسطورية' }),
]);
export const TRIBE_REQUESTS_MAX = 50;
export type TribeMember = { id: string; at: number; pts: number };
export type Tribe = { id: number; name: string; leader: string; at: number; pts: number; month: { key: string; pts: number }; members: TribeMember[]; requests: { id: string; at: number }[] };
type Data = { v: 1; seq: number; tribes: Tribe[] };
const GULF_OFFSET = 4 * 3600_000;
export const tribeMonthOf = (ms: number) => { const d = new Date(ms + GULF_OFFSET); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const uuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
export function tribeLevelOf(pts: number) { let t = TRIBE_LEVELS[0]; for (const l of TRIBE_LEVELS) if (pts >= l.min) t = l; const nx = TRIBE_LEVELS[t.level] ?? null; return { level: t.level, name: t.name, cap: t.cap, floor: t.min, next: nx ? nx.min : null }; }
export function validTribes(x: unknown): boolean {
  if (!isObj(x) || x.v !== 1 || !nat(x.seq) || !Array.isArray(x.tribes) || x.tribes.length > 50_000) return false;
  const ids = new Set<number>(), people = new Set<string>(), names = new Set<string>();
  for (const t of x.tribes as any[]) {
    if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).length !== 8 || !Number.isSafeInteger(t.id) || t.id < 1 || t.id > (x.seq as number) || ids.has(t.id) || typeof t.name !== 'string' || t.name.length < 3 || t.name.length > 24 || !uuid(t.leader) || !nat(t.at) || !nat(t.pts)) return false;
    const key = t.name.normalize('NFKC').toLowerCase(); if (names.has(key)) return false; names.add(key); ids.add(t.id);
    if (!t.month || typeof t.month !== 'object' || typeof t.month.key !== 'string' || !/^\d{4}-\d{2}$/.test(t.month.key) || !nat(t.month.pts)) return false;
    if (!Array.isArray(t.members) || !t.members.length || t.members.length > 60 || !t.members.some((m: any) => m?.id === t.leader)) return false;
    for (const m of t.members) { if (!isObj(m) || Object.keys(m).length !== 3 || !uuid(m.id) || !nat(m.at) || !nat(m.pts) || people.has(m.id)) return false; people.add(m.id); }
    if (!Array.isArray(t.requests) || t.requests.length > TRIBE_REQUESTS_MAX || !t.requests.every((r: any) => isObj(r) && Object.keys(r).length === 2 && uuid(r.id) && nat(r.at))) return false;
  }
  return true;
}
export class TribeError extends Error { constructor(public code: string) { super(code); } }
export const TRIBE_ERR: Record<string, string> = {
  room_level: `تحتاج غرفة تملكها توصل ليفل ${TRIBE_ROOM_LEVEL} عشان تفتح قبيلة.`, ineligible: 'حسابك ما يقدر يستخدم القبائل.', in_tribe: 'أنت عضو بقبيلة الحين.', name: 'اسم القبيلة لازم يكون من 3 إلى 24 حرف (حروف وأرقام ومسافات).',
  name_taken: 'هذا الاسم مستخدم لقبيلة ثانية.', not_found: 'القبيلة غير موجودة.', full: 'القبيلة مليانة. لازم ترتفع مستواها عشان تكبر.', requests_full: 'طلبات الانضمام لهالقبيلة كثيرة الحين. حاول بعدين.',
  not_leader: 'هذا الإجراء للقائد بس.', not_member: 'هذا الحساب مو عضو بالقبيلة.', leader_leave: 'القائد ما يقدر يطلع. تقدر تحل القبيلة.', no_request: 'ما فيه طلب من هذا الحساب.', no_tribe: 'أنت مو عضو بقبيلة.',
};
export class Tribes {
  private d: Data = { v: 1, seq: 0, tribes: [] };
  private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const loaded = loadJsonFile(file, validTribes); if (loaded) this.d = loaded as unknown as Data; }
    this.disk = new Persister('tribes', file, () => this.d, now, mon, validTribes);
  }
  private tx<T>(fn: () => T): T { const prev = structuredClone(this.d); try { const out = fn(); this.disk.mustSave(); return out; } catch (e) { this.d = prev; throw e; } }
  get(id: number): Tribe | null { return this.d.tribes.find((t) => t.id === id) ?? null; }
  of(user: string): Tribe | null { return this.d.tribes.find((t) => t.members.some((m) => m.id === user)) ?? null; }
  requestedBy(user: string): Tribe[] { return this.d.tribes.filter((t) => t.requests.some((r) => r.id === user)); }
  monthPts(t: Tribe): number { return t.month.key === tribeMonthOf(this.now()) ? t.month.pts : 0; }
  top(n = 30): Tribe[] { return [...this.d.tribes].sort((a, b) => this.monthPts(b) - this.monthPts(a) || b.pts - a.pts || a.id - b.id).slice(0, n); }
  create(leader: string, rawName: string): Tribe {
    if (this.of(leader)) throw new TribeError('in_tribe');
    const name = String(rawName ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (name.length < 3 || name.length > 24 || !/^[\p{L}\p{M}\p{N} _-]+$/u.test(name)) throw new TribeError('name');
    if (this.d.tribes.some((t) => t.name.toLowerCase() === name.toLowerCase())) throw new TribeError('name_taken');
    const now = this.now();
    return this.tx(() => { const t: Tribe = { id: ++this.d.seq, name, leader, at: now, pts: 0, month: { key: tribeMonthOf(now), pts: 0 }, members: [{ id: leader, at: now, pts: 0 }], requests: [] }; for (const x of this.d.tribes) x.requests = x.requests.filter((r) => r.id !== leader); this.d.tribes.push(t); return t; });
  }
  join(user: string, id: number): void {
    const t = this.get(id); if (!t) throw new TribeError('not_found'); if (this.of(user)) throw new TribeError('in_tribe');
    if (t.requests.some((r) => r.id === user)) return; if (t.members.length >= tribeLevelOf(t.pts).cap) throw new TribeError('full'); if (t.requests.length >= TRIBE_REQUESTS_MAX) throw new TribeError('requests_full');
    this.tx(() => { t.requests.push({ id: user, at: this.now() }); });
  }
  cancelJoin(user: string, id: number): void { const t = this.get(id); if (!t) throw new TribeError('not_found'); this.tx(() => { t.requests = t.requests.filter((r) => r.id !== user); }); }
  respond(leader: string, id: number, user: string, accept: boolean): void {
    const t = this.get(id); if (!t) throw new TribeError('not_found'); if (t.leader !== leader) throw new TribeError('not_leader');
    if (!t.requests.some((r) => r.id === user)) throw new TribeError('no_request');
    if (accept && this.of(user)) { this.tx(() => { t.requests = t.requests.filter((r) => r.id !== user); }); throw new TribeError('in_tribe'); }
    if (accept && t.members.length >= tribeLevelOf(t.pts).cap) throw new TribeError('full');
    this.tx(() => { t.requests = t.requests.filter((r) => r.id !== user); if (accept) { t.members.push({ id: user, at: this.now(), pts: 0 }); for (const x of this.d.tribes) if (x !== t) x.requests = x.requests.filter((r) => r.id !== user); } });
  }
  kick(leader: string, id: number, user: string): void {
    const t = this.get(id); if (!t) throw new TribeError('not_found'); if (t.leader !== leader) throw new TribeError('not_leader'); if (user === leader) throw new TribeError('leader_leave');
    if (!t.members.some((m) => m.id === user)) throw new TribeError('not_member'); this.tx(() => { t.members = t.members.filter((m) => m.id !== user); });
  }
  leave(user: string): void { const t = this.of(user); if (!t) throw new TribeError('no_tribe'); if (t.leader === user) throw new TribeError('leader_leave'); this.tx(() => { t.members = t.members.filter((m) => m.id !== user); }); }
  disband(leader: string): Tribe { const t = this.of(leader); if (!t) throw new TribeError('no_tribe'); if (t.leader !== leader) throw new TribeError('not_leader'); this.tx(() => { this.d.tribes = this.d.tribes.filter((x) => x.id !== t.id); }); return t; }
  /** R67ae: أدوات الإدارة (المالك) */
  all(): Tribe[] { return this.d.tribes; }
  adminRename(id: number, rawName: string): Tribe {
    const t = this.get(id); if (!t) throw new TribeError('not_found');
    const name = String(rawName ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (name.length < 3 || name.length > 24 || !/^[\p{L}\p{M}\p{N} _-]+$/u.test(name)) throw new TribeError('name');
    if (this.d.tribes.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) throw new TribeError('name_taken');
    this.tx(() => { t.name = name; }); return t;
  }
  adminKick(id: number, user: string): Tribe {
    const t = this.get(id); if (!t) throw new TribeError('not_found'); if (t.leader === user) throw new TribeError('leader_leave');
    if (!t.members.some((m) => m.id === user)) throw new TribeError('not_member'); this.tx(() => { t.members = t.members.filter((m) => m.id !== user); }); return t;
  }
  adminDisband(id: number): Tribe { const t = this.get(id); if (!t) throw new TribeError('not_found'); this.tx(() => { this.d.tribes = this.d.tribes.filter((x) => x.id !== id); }); return t; }
  /** هدية مؤكدة بالمحفظة من عضو. ترجع القبيلة إذا تغيّرت. */
  addGift(from: string, gems: number): Tribe | null {
    if (!nat(gems) || !gems) return null; const t = this.of(from); if (!t) return null; const m = t.members.find((x) => x.id === from)!;
    const key = tribeMonthOf(this.now()); if (!nat(t.pts + gems) || !nat(m.pts + gems)) return null;
    try { this.tx(() => { t.pts += gems; m.pts += gems; t.month = { key, pts: (t.month.key === key ? t.month.pts : 0) + gems }; }); return t; } catch { return null; }
  }
}
