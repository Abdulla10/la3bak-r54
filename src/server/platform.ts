import { loadJsonFile, Persister, StorageMonitor, optObj, optArr, isObj } from './datafile.js';

/**
 * حالة المنصة الإدارية (ملف واحد دائم بجانب ملف المحفظة): الصيانة، الحظر، طاقم الإدارة وأدوارهم، الإعلانات والفعاليات، وسجل التدقيق.
 * كل تغيير يُحفظ قبل ما يُعتبر ناجحاً؛ لو فشل الحفظ يتراجع بالكامل ويرمي StorageError (نفس نمط المحفظة).
 * ما فيه أسرار هنا؛ رمز الإدارة الاستثنائي من البيئة (ADMIN_TOKEN) ولا يُكتب بأي ملف.
 */
export type Role = 'owner' | 'admin' | 'moderator' | 'support';
export const ROLES: Role[] = ['owner', 'admin', 'moderator', 'support'];
export const ROLE_LABEL: Record<Role, string> = { owner: 'مالك', admin: 'مدير', moderator: 'مشرف', support: 'دعم' };

export const PERMS = [
  'stats.view', 'players.view', 'players.ban', 'wallet.view', 'wallet.adjust', 'wallet.approve', 'shop.view', 'shop.manage', 'rooms.view', 'rooms.close',
  'ach.view', 'ann.manage', 'community.moderate', 'audit.view', 'system.view', 'maint.manage', 'settings.view', 'staff.manage', 'wallet.bulk-grant',
  'social.view', 'social.moderate', 'social.configure',
] as const;
export type Perm = (typeof PERMS)[number];
const ALL = PERMS;
export const ROLE_PERMS: Record<Role, readonly Perm[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== 'staff.manage' && p !== 'wallet.approve' && p !== 'wallet.bulk-grant'),
  moderator: ['stats.view', 'players.view', 'players.ban', 'rooms.view', 'rooms.close', 'ach.view', 'ann.manage', 'community.moderate', 'social.view', 'social.moderate'],
  support: ['stats.view', 'players.view', 'wallet.view', 'shop.view', 'ach.view'],
};
export const can = (role: Role | null | undefined, perm: Perm) => !!role && ROLE_PERMS[role].includes(perm);

export interface Staff { role: Role; name: string; at: number; by: string; bulkGrant?: boolean }
export interface Ban { name: string; reason: string; at: number; by: string; /** بصمة الشبكة وقت الحظر (إن عُرفت) */ h?: string }
export interface AdjReq { id: string; target: string; targetName: string; cur: 'coins' | 'gems'; delta: number; reason: string; why: 'op_limit' | 'day_limit'; by: { id: string; name: string; role: string }; at: number; status: 'pending' | 'approving' | 'approved' | 'rejected' | 'failed'; decidedBy?: string; decidedById?: string; decidedAt?: number; note?: string; /** رصيد العملة قبل/بعد التنفيذ الفعلي */ before?: number; after?: number }
/** مفتاح منع التكرار: مربوط بالمنفّذ (في اسم المفتاح) وببصمة محتوى العملية. reserved = حُجزت الحصة ولم تكتمل بعد (يُستأنف بنفس المفتاح) */
export interface AdjKeyEntry { at: number; fp: string; state: 'reserved' | 'done'; out?: Record<string, unknown> }
export const ADJ_CAP = 500, ADJ_PENDING_PER_ACTOR = 20, ADJ_EXPIRE_MS = 7 * 86_400_000, ADJ_KEY_TTL_MS = 48 * 3_600_000, ADJ_KEY_CAP = 2000;
/** يوم الحصة بتوقيت الخليج (UTC+4) مثل بقية المنصة */
export const gulfDay = (t: number) => new Date(t + 4 * 3_600_000).toISOString().slice(0, 10);
export interface Suspect { of: string; ofName: string; at: number }
export interface Notice { id: string; kind: 'announcement' | 'event'; title: string; body: string; startsAt: number; endsAt: number; active: boolean; createdAt: number; by: string }
export interface AuditEntry { id: number; ts: number; actorId: string; actor: string; role: string; action: string; target: string; detail: string }
export interface Maintenance { on: boolean; message: string; since: number; by: string }
export interface OwnerOperation { id: string; target: string; actorId: string; actor: string; action: string; fingerprint: string; reason: string; key: string; body: Record<string, unknown>; plan: Record<string, unknown>; at: number; state: 'pending' | 'done'; result?: Record<string, unknown> }
interface PData { v: 1; maintenance: Maintenance; bans: Record<string, Ban>; staff: Record<string, Staff>; notices: Notice[]; audit: AuditEntry[]; seq: number; net?: Record<string, { h: string; at: number }>; suspects?: Record<string, Suspect>; adj?: AdjReq[]; adjDay?: Record<string, { day: string; coins: number; gems: number }>; adjKeys?: Record<string, AdjKeyEntry>; ownerOperations?: Record<string, OwnerOperation>; bulkAuditKeys?: Record<string, number> }

/** يبني سجل التدقيق من نتيجة العملية؛ يرجع null لو ما فيه شي يُسجَّل */
export type AuditFn<T> = (r: T) => Omit<AuditEntry, 'id' | 'ts'> | null;
const validOwnerOperation = (v: unknown) => isObj(v) && typeof v.id === 'string' && typeof v.target === 'string' && typeof v.actorId === 'string' && typeof v.actor === 'string'
  && ['special-id', 'verification', 'rank', 'item', 'role'].includes(String(v.action)) && typeof v.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(v.fingerprint)
  && typeof v.reason === 'string' && typeof v.key === 'string' && isObj(v.body) && isObj(v.plan) && Number.isSafeInteger(v.at) && Number(v.at) >= 0
  && ['pending', 'done'].includes(String(v.state)) && (v.result === undefined || isObj(v.result));
export const validPlatform = (d: Record<string, unknown>) => optObj(d.maintenance) && optObj(d.bans) && optObj(d.staff) && optArr(d.notices) && optArr(d.audit)
  && optObj(d.bulkAuditKeys) && Object.values((d.bulkAuditKeys ?? {}) as Record<string, unknown>).every((v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0)
  && Object.values(d.staff ?? {}).every((v) => isObj(v) && (v.bulkGrant === undefined || typeof v.bulkGrant === 'boolean'))
  && (d.ownerOperations === undefined || (isObj(d.ownerOperations) && Object.entries(d.ownerOperations).every(([k, v]) => validOwnerOperation(v) && isObj(v) && v.id === k)));
export const AUDIT_CAP = 3000;
export const NOTICE_CAP = 200;
/** إشارة الشبكة للحسابات الجديدة: بصمة مجزّأة (HMAC) لا IP خام، تُحذف بعد 30 يوماً وبحد أقصى 20000 */
export const NET_TTL_MS = 30 * 86_400_000;
export const NET_CAP = 20_000;
export const DEFAULT_MAINT_MSG = 'المنصة تحت الصيانة حالياً، نرجع لكم قريباً بإذن الله.';

const blank = (): PData => ({ v: 1, maintenance: { on: false, message: DEFAULT_MAINT_MSG, since: 0, by: '' }, bans: {}, staff: {}, notices: [], audit: [], seq: 0 });

export class Platform {
  private d: PData = blank();
  private disk: Persister;
  readonly persistent: boolean;
  constructor(file = '', private now: () => number = Date.now, mon = new StorageMonitor()) {
    this.persistent = !!file;
    if (file) {
      const loaded = loadJsonFile(file, validPlatform); // ملف تالف يوقف الخادم (ما نبدأ بفاضي ولا نكتب فوقه)
      if (loaded) this.d = { ...blank(), ...(loaded as unknown as Partial<PData>) };
      this.d.maintenance = { ...blank().maintenance, ...this.d.maintenance };
      this.d.bans ??= {}; this.d.staff ??= {}; this.d.notices ??= []; this.d.audit ??= []; this.d.seq ??= 0; this.d.net ??= {}; this.d.suspects ??= {}; this.d.adj ??= []; this.d.adjDay ??= {}; this.d.adjKeys ??= {};
    }
    this.disk = new Persister('platform', file, () => this.d, now, mon);
  }

  /** ينفّذ تغييراً ويحفظه؛ لو فشل الحفظ يرجع الحالة كما كانت ويرمي StorageError */
  private commit<T>(fn: () => T, au?: AuditFn<T>): T {
    const snap = structuredClone(this.d);
    try {
      const r = fn();
      const e = au?.(r); // التدقيق يدخل نفس الحفظ: يا الاثنين ينحفظون يا ولا واحد (ما فيه عملية إدارية بلا أثر)
      if (e) this.pushAudit(e);
      this.disk.mustSave(); return r;
    } catch (e) { this.d = snap; throw e; }
  }
  private pushAudit(e: Omit<AuditEntry, 'id' | 'ts'>) { this.d.audit.push({ id: ++this.d.seq, ts: this.now(), ...e }); if (this.d.audit.length > AUDIT_CAP) this.d.audit.splice(0, this.d.audit.length - AUDIT_CAP); }
  retry() { this.disk.retry(); }
  unsaved() { return this.disk.unsaved; }

  ownerOperation(id: string): OwnerOperation | null { const v = this.d.ownerOperations?.[id]; return v ? structuredClone(v) : null; }
  ownerPending() { return Object.values(this.d.ownerOperations ?? {}).filter(v => v.state === 'pending').map(v => structuredClone(v)); }
  beginOwnerOperation(op: OwnerOperation) {
    const old = this.ownerOperation(op.id);
    if (old) { if (old.fingerprint !== op.fingerprint) throw new Error('owner_operation_conflict'); return old; }
    if (!validOwnerOperation(op) || op.state !== 'pending') throw new Error('owner_operation_invalid');
    if (Object.keys(this.d.ownerOperations ?? {}).length >= 50000) throw new Error('owner_operation_capacity');
    return this.commit(() => { (this.d.ownerOperations ??= {})[op.id] = structuredClone(op); return structuredClone(op); }, () => ({ actorId: op.actorId, actor: op.actor, role: 'owner', action: 'owner-tools.prepare', target: op.target, detail: `${op.action} · ${op.reason} · ${op.key}` }));
  }
  finishOwnerOperation(id: string, result: Record<string, unknown>) {
    const op = this.d.ownerOperations?.[id]; if (!op) throw new Error('owner_operation_missing');
    if (op.state === 'done') return structuredClone(op.result);
    return this.commit(() => { op.state = 'done'; op.result = structuredClone(result); return structuredClone(result); }, () => ({ actorId: op.actorId, actor: op.actor, role: 'owner', action: 'owner-tools.' + op.action, target: op.target, detail: `${op.reason} · ${op.key}` }));
  }

  // ---- الصيانة ----
  maintenance(): Maintenance { return { ...this.d.maintenance }; }
  setMaintenance(on: boolean, message: string, by: string, au?: AuditFn<Maintenance>) {
    return this.commit(() => { this.d.maintenance = { on, message: message || DEFAULT_MAINT_MSG, since: on && !this.d.maintenance.on ? this.now() : on ? this.d.maintenance.since : 0, by }; return { ...this.d.maintenance }; }, au);
  }

  // ---- الحظر ----
  isBanned(id: string) { return !!this.d.bans[id]; }
  banOf(id: string) { return this.d.bans[id] ? { ...this.d.bans[id] } : null; }
  bans() { return Object.entries(this.d.bans).map(([id, b]) => ({ id, ...b })); }
  ban(id: string, name: string, reason: string, by: string, au?: AuditFn<void>) { this.commit(() => { const h = this.d.net?.[id]?.h; this.d.bans[id] = { name, reason, at: this.now(), by, ...(h ? { h } : {}) }; }, au); }
  unban(id: string, au?: AuditFn<boolean>) {
    return this.commit(() => {
      const had = !!this.d.bans[id]; delete this.d.bans[id];
      for (const [k, s] of Object.entries(this.d.suspects ?? {})) if (s.of === id) delete this.d.suspects![k]; // الاشتباه مرتبط بالحظر؛ يزول مع رفعه
      return had;
    }, au);
  }

  // ---- تعديل الأرصدة الإدارية: حصة يومية لكل منفّذ + طلبات موافقة المالك + مفاتيح عدم التكرار ----
  adjUsed(actorId: string) { const u = this.d.adjDay?.[actorId]; return u && u.day === gulfDay(this.now()) ? { coins: u.coins, gems: u.gems } : { coins: 0, gems: 0 }; }
  /** يحجز من الحصة اليومية ويسجّل مفتاح العملية (state=reserved) بحفظ واحد، قبل تنفيذ التعديل. false = تجاوز الحصة ولم يُحجز شيء */
  reserveAdj(actorId: string, cur: 'coins' | 'gems', amount: number, dayLimit: number, key = '', fp = ''): boolean {
    const used = this.adjUsed(actorId);
    if (used[cur] + amount > dayLimit) return false;
    this.commit(() => {
      const day = gulfDay(this.now()); const m = (this.d.adjDay ??= {}); const u = m[actorId]?.day === day ? m[actorId] : { day, coins: 0, gems: 0 }; u[cur] += amount; m[actorId] = u;
      if (key) this.putKey(key, { at: this.now(), fp, state: 'reserved' });
    });
    return true;
  }
  /** تراجع عن حجز لم يُنفَّذ (فشل التعديل): يعيد الحصة ويحذف المفتاح المحجوز ليمكن إعادة المحاولة */
  releaseAdj(actorId: string, cur: 'coins' | 'gems', amount: number, key = '') {
    this.commit(() => { const u = this.d.adjDay?.[actorId]; if (u && u.day === gulfDay(this.now())) u[cur] = Math.max(0, u[cur] - amount); if (key && this.d.adjKeys?.[key]?.state === 'reserved') delete this.d.adjKeys[key]; });
  }
  private putKey(k: string, e: AdjKeyEntry) {
    const m = (this.d.adjKeys ??= {}); const t = this.now(); m[k] = e;
    for (const [x, v] of Object.entries(m)) if (t - v.at > ADJ_KEY_TTL_MS) delete m[x];
    const ks = Object.keys(m); if (ks.length > ADJ_KEY_CAP) for (const x of ks.sort((a, b) => m[a].at - m[b].at).slice(0, ks.length - ADJ_KEY_CAP)) delete m[x];
  }
  adjKeyGet(k: string): AdjKeyEntry | null { const x = this.d.adjKeys?.[k]; return x && this.now() - x.at < ADJ_KEY_TTL_MS ? { ...x, ...(x.out ? { out: { ...x.out } } : {}) } : null; }
  /** تثبيت نتيجة عملية منفّذة تحت مفتاحها (للإعادة اللاحقة بنفس النتيجة) */
  finishAdjKey(k: string, fp: string, out: Record<string, unknown>) { this.commit(() => { const e = this.d.adjKeys?.[k]; this.putKey(k, { at: e?.at ?? this.now(), fp, state: 'done', out }); }); }
  adjList() { const t = this.now(); return [...(this.d.adj ?? [])].reverse().map((r) => ({ ...r, expired: r.status === 'pending' && t - r.at > ADJ_EXPIRE_MS })); }
  adjGet(id: string) { const r = this.d.adj?.find((x) => x.id === id); return r ? { ...r, expired: r.status === 'pending' && this.now() - r.at > ADJ_EXPIRE_MS } : null; }
  adjPendingOf(actorId: string) { const t = this.now(); return (this.d.adj ?? []).filter((r) => r.status === 'pending' && r.by.id === actorId && t - r.at <= ADJ_EXPIRE_MS).length; }
  addAdj(r: Omit<AdjReq, 'id' | 'at' | 'status'>, au?: AuditFn<AdjReq>, key?: { k: string; fp: string }) {
    return this.commit(() => {
      const full: AdjReq = { ...r, id: 'q' + (++this.d.seq).toString(36) + this.now().toString(36), at: this.now(), status: 'pending' };
      const list = (this.d.adj ??= []); list.push(full);
      if (key) this.putKey(key.k, { at: this.now(), fp: key.fp, state: 'done', out: { ok: true, pending: true, request: { id: full.id, why: full.why } } }); // الطلب ومفتاحه بحفظ واحد
      while (list.length > ADJ_CAP) { const i = list.findIndex((x) => x.status !== 'pending'); list.splice(i < 0 ? 0 : i, 1); }
      return { ...full };
    }, au);
  }
  /** رفض طلب معلّق فقط (لا يُرفض ما بدأت الموافقة عليه ولا ما تم البتّ فيه). يرجع null لو ما كان معلقاً */
  rejectAdj(id: string, by: string, byId: string, note = '', au?: AuditFn<AdjReq | null>) {
    return this.commit(() => {
      const r = this.d.adj?.find((x) => x.id === id);
      if (!r || r.status !== 'pending') return null;
      r.status = 'rejected'; r.decidedBy = by; r.decidedById = byId; r.decidedAt = this.now(); if (note) r.note = note.slice(0, 200);
      return { ...r };
    }, au);
  }
  /**
   * أول خطوات الموافقة: pending → approving ويُحفظ قبل أي تعديل بالمحفظة (نية مسجّلة تتحمل الانقطاع).
   * بعدها يُنفَّذ التعديل بمفتاح عملية idempotent بالمحفظة، ثم finishAdj. لو انقطع الخادم بينهما يبقى approving ويُستأنف بالإقلاع.
   */
  beginApprove(id: string, by: string, byId: string): AdjReq | null {
    return this.commit(() => {
      const r = this.d.adj?.find((x) => x.id === id);
      if (!r || r.status !== 'pending' || this.now() - r.at > ADJ_EXPIRE_MS) return null;
      r.status = 'approving'; r.decidedBy = by; r.decidedById = byId; r.decidedAt = this.now();
      return { ...r };
    });
  }
  /** خاتمة الموافقة: approving → approved (مع قبل/بعد) أو failed، والتدقيق بنفس الحفظ. يرجع null لو لم يكن approving (استُكمل من قبل) */
  finishAdj(id: string, outcome: { ok: true; before: number; after: number } | { ok: false; note: string }, au?: AuditFn<AdjReq | null>) {
    return this.commit(() => {
      const r = this.d.adj?.find((x) => x.id === id);
      if (!r || r.status !== 'approving') return null;
      if (outcome.ok) { r.status = 'approved'; r.before = outcome.before; r.after = outcome.after; } else { r.status = 'failed'; r.note = outcome.note.slice(0, 200); }
      return { ...r };
    }, au);
  }
  approvingList(): AdjReq[] { return (this.d.adj ?? []).filter((r) => r.status === 'approving').map((r) => ({ ...r })); }

  // ---- إشارة الشبكة (ضابط ناعم ضد تفادي الحظر؛ لا يمنع اللعب المجاني) ----
  netOf(id: string) { return this.d.net?.[id] ? { ...this.d.net[id] } : null; }
  /**
   * يسجّل بصمة شبكة حساب جديد. لو تطابقت مع بصمة حساب محظور (غير نفسه) يُوسم الحساب «مشتبه» فيُمنع من المباريات برسوم فقط
   * لحين مراجعة الإدارة. تحذير: الشبكات المشتركة (جوال/مقهى/سكن) تعطي تطابقات خاطئة، لذلك لا نحظر آلياً.
   */
  noteNet(id: string, h: string) {
    this.commit(() => {
      const net = (this.d.net ??= {}); const t = this.now();
      net[id] = { h, at: t };
      const ids = Object.keys(net);
      if (ids.length > NET_CAP) for (const k of ids.sort((a, b) => net[a].at - net[b].at).slice(0, ids.length - NET_CAP)) delete net[k];
      for (const [k, v] of Object.entries(net)) if (t - v.at > NET_TTL_MS) delete net[k];
      for (const [bid, b] of Object.entries(this.d.bans)) if (b.h === h && bid !== id && !this.d.bans[id]) { (this.d.suspects ??= {})[id] = { of: bid, ofName: b.name, at: t }; break; }
    });
  }
  /**
   * إشارة نشاط (للمراجعة فقط، لا تمنع أحداً): شبكات (بصمة مُجزّأة، بلا IP) أُنشئ منها حسابات جديدة آخر 24 ساعة فوق العتبة.
   * مشتقة من سجل الشبكة المخزّن أصلاً، فلا تكتب شيئاً. شبكات الجوال/الواي فاي المشتركة تظهر هنا كثيراً بصورة مشروعة.
   */
  netBursts(threshold: number) {
    if (!(threshold > 0)) return [] as { ref: string; count: number; last: number; ids: string[] }[];
    const since = this.now() - 86_400_000; const g = new Map<string, { id: string; at: number }[]>();
    for (const [id, v] of Object.entries(this.d.net ?? {})) if (v.at > since) { const l = g.get(v.h) ?? []; l.push({ id, at: v.at }); g.set(v.h, l); }
    return [...g].filter(([, l]) => l.length > threshold).map(([h, l]) => { l.sort((x, y) => y.at - x.at); return { ref: h.slice(0, 6), count: l.length, last: l[0].at, ids: l.slice(0, 20).map((x) => x.id) }; }).sort((x, y) => y.count - x.count);
  }
  /** R68y: حسابات تشترك بنفس الشبكة (آخر 30 يوم) — للمراجعة فقط */
  netGroups(min = 3) {
    const g = new Map<string, { id: string; at: number }[]>();
    for (const [id, v] of Object.entries(this.d.net ?? {})) { const l = g.get(v.h) ?? []; l.push({ id, at: v.at }); g.set(v.h, l); }
    return [...g].filter(([, l]) => l.length >= min).map(([h, l]) => { l.sort((x, y) => y.at - x.at); return { ref: h.slice(0, 6), count: l.length, last: l[0].at, ids: l.slice(0, 30).map((x) => x.id), bannedHere: Object.values(this.d.bans).some((b) => (b as { h?: string }).h === h) }; }).sort((x, y) => y.count - x.count).slice(0, 50);
  }
  netRefOf(id: string): string { return this.d.net?.[id]?.h?.slice(0, 6) ?? ''; }
  isSuspect(id: string) { return !!this.d.suspects?.[id]; }
  suspects() { return Object.entries(this.d.suspects ?? {}).map(([id, s]) => ({ id, ...s })); }
  clearSuspect(id: string, au?: AuditFn<boolean>) { return this.commit(() => { const had = !!this.d.suspects?.[id]; if (had) delete this.d.suspects![id]; return had; }, au); }

  // ---- الطاقم ----
  roleOf(id: string): Role | null { return this.d.staff[id]?.role ?? null; }
  staff() { return Object.entries(this.d.staff).map(([id, s]) => ({ id, ...s })); }
  setStaff(id: string, name: string, role: Role, by: string, au?: AuditFn<void>) { this.commit(() => { this.d.staff[id] = { role, name, at: this.now(), by }; }, au); }
  removeStaff(id: string, au?: AuditFn<boolean>) { return this.commit(() => { const had = !!this.d.staff[id]; delete this.d.staff[id]; return had; }, au); }
  /** Owner role is looked up live; other staff need explicit delegation, revoked by role replacement/removal. */
  bulkGrantAllowed(id: string) { const s = this.d.staff[id]; return !!s && (s.role === 'owner' || s.bulkGrant === true); }
  setBulkGrantPermission(id: string, enabled: boolean, au?: AuditFn<boolean>) {
    if (typeof enabled !== 'boolean' || this.d.staff[id]?.role === 'owner') throw new Error('bulk_staff_required');
    return this.commit(() => { const s = this.d.staff[id]; if (!s) return false; s.bulkGrant = enabled; return true; }, au);
  }
  /** Compatibility with the campaign reference API; canonical permission stays wallet.bulk-grant. */
  bulkAllowed(id: string) { return this.bulkGrantAllowed(id); }
  setBulkPermission(id: string, allowed: boolean, au?: AuditFn<void>) {
    if (!this.d.staff[id] || this.d.staff[id].role === 'owner' || typeof allowed !== 'boolean') throw new Error('bulk_staff_required');
    this.setBulkGrantPermission(id, allowed, () => au?.() ?? null);
  }

  // ---- الإعلانات والفعاليات ----
  notices() { return [...this.d.notices].sort((a, b) => b.createdAt - a.createdAt); }
  activeNotices(t = this.now()) { return this.d.notices.filter((n) => n.active && n.startsAt <= t && (!n.endsAt || n.endsAt > t)).map(({ id, kind, title, body, startsAt, endsAt }) => ({ id, kind, title, body, startsAt, endsAt })); }
  addNotice(n: Omit<Notice, 'id' | 'createdAt'>, au?: AuditFn<Notice>) {
    return this.commit(() => {
      const full: Notice = { ...n, id: 'n' + (++this.d.seq).toString(36) + this.now().toString(36), createdAt: this.now() };
      this.d.notices.push(full);
      if (this.d.notices.length > NOTICE_CAP) this.d.notices.splice(0, this.d.notices.length - NOTICE_CAP);
      return { ...full };
    }, au);
  }
  updateNotice(id: string, patch: Partial<Pick<Notice, 'title' | 'body' | 'startsAt' | 'endsAt' | 'active' | 'kind'>>, au?: AuditFn<Notice | null>) {
    return this.commit(() => {
      const n = this.d.notices.find((x) => x.id === id); if (!n) return null;
      const merged = { ...n, ...patch };
      // نفحص الحالة النهائية، مب تواريخ patch بروحها. الصفر يبقى بدون انتهاء مثل قبل.
      if (!Number.isSafeInteger(merged.startsAt) || merged.startsAt < 0 || !Number.isSafeInteger(merged.endsAt) || merged.endsAt < 0
        || (merged.endsAt !== 0 && merged.endsAt <= merged.startsAt)) throw new RangeError('notice_period_invalid');
      Object.assign(n, patch); return { ...n };
    }, au);
  }
  deleteNotice(id: string, au?: AuditFn<boolean>) { return this.commit(() => { const i = this.d.notices.findIndex((x) => x.id === id); if (i < 0) return false; this.d.notices.splice(i, 1); return true; }, au); }

  // ---- سجل التدقيق (إضافة فقط، بدون تعديل ولا حذف من الواجهة) ----
  /** يُحفظ مع العملية نفسها؛ لو فشل الحفظ تفشل العملية كلها فما تصير عملية إدارية بلا أثر */
  audit(e: Omit<AuditEntry, 'id' | 'ts'>) {
    this.commit(() => { this.pushAudit(e); });
  }
  /** Event and permanent delivery proof share one commit; outbox replay never duplicates even after audit pruning. */
  auditOnce(key: string, e: Omit<AuditEntry, 'id' | 'ts'>) {
    if (!/^[A-Za-z0-9:_-]{1,200}$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('bulk_audit_key');
    if (Object.hasOwn(this.d.bulkAuditKeys ?? {}, key)) return;
    this.commit(() => { this.pushAudit(e); (this.d.bulkAuditKeys ??= {})[key] = this.d.seq; });
  }
  auditList(limit = 100, before = Infinity) { return this.d.audit.filter((a) => a.id < before).slice(-limit).reverse(); }
  auditCount() { return this.d.audit.length; }
}
