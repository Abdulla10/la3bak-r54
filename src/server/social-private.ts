import { createHash } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import { KeyedLimiter } from './ratelimit.js';
import { applyFamilyCommand, emptyFamilyState, familyPublic as publicFamilyView, familySnapshot as privateFamilyView, validFamilyState, type FamilyContext, type FamilyKind, type FamilyState } from './family-r47.js';

/** Separate from Community follows. Internal actor/peer IDs are supplied by authenticated parent routes. */
export interface SocialPrivateCallbacks {
  hasAccount(id: string): boolean;
  isBanned(id: string): boolean;
  /** Checked in BOTH directions, even when the implementation already checks both. */
  isBlocked(a: string, b: string): boolean;
  /** Presentation only: never expose internal account IDs when these are absent. */
  pub?(id: string): string;
  nameOf?(id: string): string;
  isMuted?(actor: string, target: string): boolean;
  /** Existing public-ID bridge only; relations never accept an internal target ID from the browser. */
  resolvePublicId?(pub: string): string | null;
  /** Explicit existing account self-declared age: only true means eligible; null/unknown is NOT adult. */
  adultSelfDeclared?(id: string): boolean | null;
  /** Existing account status; required for relations, additive so legacy friends/DM stay compatible. */
  isDeactivated?(id: string): boolean;
  /** Optional stricter current privacy gate; never overrides dmEnabled=false. */
  relationRequestsAllowed?(id: string, kind: FamilyKind): boolean;
}
export interface SocialPrivateLimits {
  send: [number, number]; request: [number, number]; read: [number, number]; change: [number, number];
}
export const SOCIAL_PRIVATE_LIMITS: SocialPrivateLimits = {
  send: [20, 20 / 60], request: [10, 10 / 60], read: [120, 2], change: [30, 0.5],
};
export const PRIVATE_BODY_MAX = 2000, PRIVATE_PAGE_MAX = 50, PRIVATE_PAGE_DEFAULT = 20;
const REF_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,95}$/;
const identity = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 128 && !/[\u0000-\u0020\u007f]/.test(x);
const natural = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const positive = (x: unknown): x is number => natural(x) && x > 0;
const fingerprint = (to: string, body: string) => createHash('sha256').update(JSON.stringify([to, body])).digest('hex');
type LinkState = 'pending' | 'accepted' | 'rejected' | 'removed';
interface Link { id: number; from: string; to: string; state: LinkState; at: number; decidedAt: number | null }
interface Message { id: number; from: string; to: string; body: string; ref: string; fingerprint: string; at: number; readAt: number | null }
interface Preference { id: string; dmEnabled: boolean }
interface Data { v: 1; seq: number; links: Link[]; messages: Message[]; preferences: Preference[]; familyR47?: FamilyState }
export interface PrivatePage { before?: unknown; limit?: unknown }

/** Optional collections permit an empty/new additive schema; malformed nested records fail closed. */
export function validSocialPrivate(d: Record<string, unknown>): boolean {
  if (d.v !== 1 || (d.seq !== undefined && !natural(d.seq))) return false;
  const links = d.links === undefined ? [] : d.links, messages = d.messages === undefined ? [] : d.messages, preferences = d.preferences === undefined ? [] : d.preferences;
  if (!Array.isArray(links) || !Array.isArray(messages) || !Array.isArray(preferences)) return false;
  const ids = new Set<number>(), pairs = new Set<string>(), refs = new Set<string>(), users = new Set<string>();
  const seq = d.seq ?? 0;
  for (const l of links) {
    if (!isObj(l) || !positive(l.id) || l.id > (seq as number) || ids.has(l.id) || !identity(l.from) || !identity(l.to) || l.from === l.to || typeof l.state !== 'string' || !['pending', 'accepted', 'rejected', 'removed'].includes(l.state) || !natural(l.at) || !(l.decidedAt === null || natural(l.decidedAt))) return false;
    if ((l.state === 'pending') !== (l.decidedAt === null)) return false;
    ids.add(l.id);
    if (l.state === 'pending' || l.state === 'accepted') {
      const pair = JSON.stringify([l.from, l.to].sort());
      if (pairs.has(pair)) return false;
      pairs.add(pair);
    }
  }
  for (const m of messages) {
    if (!isObj(m) || !positive(m.id) || m.id > (seq as number) || ids.has(m.id) || !identity(m.from) || !identity(m.to) || m.from === m.to || typeof m.body !== 'string' || !m.body.trim() || m.body.length > PRIVATE_BODY_MAX || typeof m.ref !== 'string' || !REF_RE.test(m.ref) || typeof m.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(m.fingerprint) || !natural(m.at) || !(m.readAt === null || natural(m.readAt))) return false;
    const key = JSON.stringify([m.from, m.ref]);
    if (refs.has(key)) return false;
    refs.add(key); ids.add(m.id);
  }
  for (const p of preferences) {
    if (!isObj(p) || !identity(p.id) || typeof p.dmEnabled !== 'boolean' || users.has(p.id)) return false;
    users.add(p.id);
  }
  return validFamilyState(d.familyR47);
}
export class SocialPrivateError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = 'SocialPrivateError'; }
}
const error = (status: number, code: string, message: string): never => { throw new SocialPrivateError(status, code, message); };

export class SocialPrivate {
  private d: Data = { v: 1, seq: 0, links: [], messages: [], preferences: [] };
  private disk: Persister;
  private lim: Record<keyof SocialPrivateLimits, KeyedLimiter>;
  private refs = new Map<string, Message>();
  constructor(private file = '', private now: () => number = Date.now, mon = new StorageMonitor(), private callbacks: Partial<SocialPrivateCallbacks> = {}, limits: Partial<SocialPrivateLimits> = {}) {
    const L = { ...SOCIAL_PRIVATE_LIMITS, ...limits };
    for (const pair of Object.values(L)) if (!Array.isArray(pair) || pair.length !== 2 || !Number.isFinite(pair[0]) || pair[0] < 1 || !Number.isFinite(pair[1]) || pair[1] < 0) throw new TypeError('invalid_social_private_limits');
    if (file) { const loaded = loadJsonFile(file, validSocialPrivate); if (loaded) this.d = { ...this.d, ...(loaded as unknown as Data) }; }
    this.disk = new Persister('social-private', file, () => this.d, now, mon, validSocialPrivate);
    this.lim = Object.fromEntries(Object.entries(L).map(([k, [capacity, refill]]) => [k, new KeyedLimiter(capacity, refill, now)])) as Record<keyof SocialPrivateLimits, KeyedLimiter>;
    this.reindex();
  }
  get persistent() { return !!this.file; }
  unsaved(): boolean { return this.disk.unsaved; }
  retry() { this.disk.retry(); }
  private reindex() { this.refs = new Map(this.d.messages.map(m => [JSON.stringify([m.from, m.ref]), m])); }
  private tx<T>(fn: () => T): T {
    const previous = structuredClone(this.d);
    try { const out = fn(); this.disk.mustSave(); this.reindex(); return out; }
    catch (e) { this.d = previous; this.reindex(); throw e; }
  }
  private check(kind: 'hasAccount' | 'isBanned' | 'isBlocked', a: string, b?: string): boolean {
    const fn = this.callbacks[kind];
    if (!fn) return error(503, 'safety_unconfigured', 'الخصوصية غير مهيأة الآن.');
    const result = kind === 'isBlocked' ? (fn as SocialPrivateCallbacks['isBlocked'])(a, b!) : (fn as (id: string) => boolean)(a);
    if (typeof result !== 'boolean') return error(503, 'safety_unconfigured', 'الخصوصية غير مهيأة الآن.');
    return result;
  }
  private actor(me: string) {
    // Require every safety callback even for reads without a peer.
    if (!['hasAccount', 'isBanned', 'isBlocked'].every(k => typeof this.callbacks[k as keyof SocialPrivateCallbacks] === 'function')) return error(503, 'safety_unconfigured', 'الخصوصية غير مهيأة الآن.');
    if (!identity(me) || !this.check('hasAccount', me)) return error(401, 'auth', 'سجّل دخولك أول.');
    if (this.check('isBanned', me)) return error(403, 'banned', 'هذا الحساب موقوف.');
  }
  private peer(me: string, other: string) {
    this.actor(me);
    if (!identity(other) || !this.check('hasAccount', other) || this.check('isBanned', other)) return error(404, 'not_found', 'الحساب غير متاح.');
    if (other === me) return error(400, 'self', 'اختر حسابًا آخر.');
    if (this.check('isBlocked', me, other) || this.check('isBlocked', other, me)) return error(403, 'blocked', 'لا يمكن التواصل مع هذا الحساب.');
  }
  private visible(me: string, other: string) { return this.check('hasAccount', other) && !this.check('isBanned', other) && !this.check('isBlocked', me, other) && !this.check('isBlocked', other, me); }
  private rate(kind: keyof SocialPrivateLimits, me: string) { if (!this.lim[kind].allow(me)) return error(429, 'rate', 'طلبات كثيرة، جرّب بعد شوي.'); }
  private tick() { const t = this.now(); if (!natural(t)) throw new TypeError('invalid_social_private_clock'); return t; }
  private nextId() { if (this.d.seq >= Number.MAX_SAFE_INTEGER) return error(409, 'capacity', 'تعذّرت العملية.'); return ++this.d.seq; }
  private pairLink(me: string, other: string) { return this.d.links.find(l => (l.state === 'pending' || l.state === 'accepted') && ((l.from === me && l.to === other) || (l.from === other && l.to === me))); }
  private accepted(me: string, other: string) { return this.pairLink(me, other)?.state === 'accepted'; }
  private friendGuard(me: string, other: string) { this.peer(me, other); if (!this.accepted(me, other)) return error(403, 'friends_only', 'الرسائل متاحة للأصدقاء المقبولين فقط.'); }
  private who(id: string) {
    const pub = this.callbacks.pub?.(id);
    if (typeof pub !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(pub)) return error(503, 'presentation_unconfigured', 'تعذّر عرض الحساب الآن.');
    return { pub, name: this.callbacks.nameOf?.(id) || 'لاعب' };
  }
  private dmEnabled(id: string) { return this.d.preferences.find(p => p.id === id)?.dmEnabled ?? true; }
  private page<T extends { id: number }>(rows: T[], opts: PrivatePage = {}) {
    let before = Infinity, limit = PRIVATE_PAGE_DEFAULT;
    if (opts.before !== undefined && opts.before !== null && opts.before !== '') { const n = Number(opts.before); if (!positive(n)) return error(400, 'page', 'صفحة غير صالحة.'); before = n; }
    if (opts.limit !== undefined && opts.limit !== null && opts.limit !== '') { const n = Number(opts.limit); if (!positive(n)) return error(400, 'page', 'حجم صفحة غير صالح.'); limit = Math.min(n, PRIVATE_PAGE_MAX); }
    const selected = rows.filter(r => r.id < before).sort((a, b) => b.id - a.id).slice(0, limit + 1);
    const more = selected.length > limit, list = selected.slice(0, limit);
    return { list, more, nextBefore: more ? list.at(-1)!.id : null };
  }
  private linkView(l: Link, me: string) { return { id: l.id, user: this.who(l.from === me ? l.to : l.from), direction: l.to === me ? 'incoming' : 'outgoing', state: l.state, at: l.at, decidedAt: l.decidedAt }; }
  private messageView(m: Message, me: string) { return { id: m.id, body: m.body, mine: m.from === me, at: m.at, read: m.readAt !== null, readAt: m.readAt }; }

  settings(me: string) { this.actor(me); this.rate('read', me); return { dmEnabled: this.dmEnabled(me), audience: 'accepted-friends' as const }; }
  setDMEnabled(me: string, enabled: unknown) {
    this.actor(me); if (typeof enabled !== 'boolean') return error(400, 'privacy', 'اختر إعدادًا صحيحًا.');
    if (this.dmEnabled(me) !== enabled) { this.rate('change', me); this.tx(() => { const p = this.d.preferences.find(p => p.id === me); if (p) p.dmEnabled = enabled; else this.d.preferences.push({ id: me, dmEnabled: enabled }); }); }
    return { dmEnabled: enabled, audience: 'accepted-friends' as const };
  }
  /** Actual accepted reciprocal links; never derived from follows, bans or visibility. */
  friendsCount(me: string) { this.actor(me); return this.d.links.filter(l => l.state === 'accepted' && (l.from === me || l.to === me)).length; }
  friendsPresent(me:string,publicIds:ReadonlySet<string>) {
    this.actor(me);
    return this.d.links.filter(l=>l.state==='accepted'&&(l.from===me||l.to===me)).flatMap(l=>{
      const other=l.from===me?l.to:l.from;
      if(!this.visible(me,other))return [];
      const who=this.who(other);return publicIds.has(who.pub)?[{id:who.pub,name:who.name}]:[];
    });
  }
  /** R58f: معرّفات الأصدقاء المقبولين الظاهرين (داخلي) — لشريط «الأصدقاء الحين» */
  friendInternalIds(me: string): string[] { this.actor(me); return this.d.links.filter(l => l.state === 'accepted' && (l.from === me || l.to === me)).map(l => l.from === me ? l.to : l.from).filter(o => this.visible(me, o)); }
  friends(me: string, opts: PrivatePage = {}) {
    this.actor(me); this.rate('read', me);
    const p = this.page(this.d.links.filter(l => l.state === 'accepted' && (l.from === me || l.to === me) && this.visible(me, l.from === me ? l.to : l.from)), opts);
    return { ...p, list: p.list.map(l => this.linkView(l, me)), friendsCount: this.friendsCount(me) };
  }
  requests(me: string, opts: PrivatePage & { direction?: unknown } = {}) {
    this.actor(me); this.rate('read', me);
    const direction = opts.direction ?? 'incoming'; if (direction !== 'incoming' && direction !== 'outgoing') return error(400, 'direction', 'قائمة غير صالحة.');
    const p = this.page(this.d.links.filter(l => l.state === 'pending' && (direction === 'incoming' ? l.to === me : l.from === me) && this.visible(me, l.from === me ? l.to : l.from)), opts);
    return { ...p, list: p.list.map(l => this.linkView(l, me)) };
  }
  request(me: string, other: string) {
    this.peer(me, other); const current = this.pairLink(me, other);
    if (current?.state === 'accepted' || current?.from === me) return this.linkView(current, me);
    if (current) return error(409, 'incoming_pending', 'يوجد طلب وارد؛ اقبله أو ارفضه بنفسك.');
    this.rate('request', me);
    return this.tx(() => { const l: Link = { id: this.nextId(), from: me, to: other, state: 'pending', at: this.tick(), decidedAt: null }; this.d.links.push(l); return this.linkView(l, me); });
  }
  private recipientRequest(me: string, id: unknown) {
    this.actor(me); const n = Number(id); const l = positive(n) ? this.d.links.find(l => l.id === n && l.to === me) : undefined;
    if (!l) return error(404, 'not_found', 'الطلب غير متاح.');
    this.peer(me, l.from); return l;
  }
  accept(me: string, id: unknown) {
    const l = this.recipientRequest(me, id);
    if (l.state === 'accepted') return this.linkView(l, me);
    if (l.state !== 'pending') return error(409, 'request_state', 'هذا الطلب لم يعد معلّقًا.');
    this.rate('change', me); return this.tx(() => { l.state = 'accepted'; l.decidedAt = this.tick(); return this.linkView(l, me); });
  }
  reject(me: string, id: unknown) {
    const l = this.recipientRequest(me, id);
    if (l.state === 'rejected') return { rejected: true };
    if (l.state !== 'pending') return error(409, 'request_state', 'هذا الطلب لم يعد معلّقًا.');
    this.rate('change', me); return this.tx(() => { l.state = 'rejected'; l.decidedAt = this.tick(); return { rejected: true }; });
  }
  /** Either friend may remove; only the original sender may cancel a pending request. Removal works after a block. */
  remove(me: string, other: string) {
    this.actor(me); if (!identity(other) || other === me) return error(400, 'peer', 'حساب غير صالح.');
    const l = this.pairLink(me, other); if (!l) return { removed: true };
    if (l.state === 'pending' && l.from !== me) return error(403, 'recipient_only', 'ارفض الطلب الوارد بدل إلغائه.');
    this.rate('change', me); return this.tx(() => { l.state = 'removed'; l.decidedAt = this.tick(); return { removed: true }; });
  }
  send(me: string, other: string, input: { body?: unknown; ref?: unknown }) {
    this.friendGuard(me, other);
    if (!isObj(input) || Object.keys(input).some(k => k !== 'body' && k !== 'ref')) return error(400, 'text_only', 'الرسائل النصية فقط متاحة.');
    if (typeof input.ref !== 'string' || !REF_RE.test(input.ref)) return error(400, 'ref', 'معرّف الرسالة غير صالح.');
    if (typeof input.body !== 'string' || input.body.length > PRIVATE_BODY_MAX) return error(400, 'body', 'الرسالة طويلة أو غير صالحة.');
    const body = input.body.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').trim();
    if (!body) return error(400, 'body', 'اكتب رسالة نصية.');
    const fp = fingerprint(other, input.body), old = this.refs.get(JSON.stringify([me, input.ref]));
    if (old) { if (old.fingerprint !== fp) return error(409, 'ref_conflict', 'معرّف الرسالة مستخدم لمحتوى مختلف.'); return { message: this.messageView(old, me), duplicate: true }; }
    if (!this.dmEnabled(me) || !this.dmEnabled(other)) return error(403, 'dm_disabled', 'الرسائل الخاصة موقوفة.');
    this.rate('send', me);
    return this.tx(() => { const m: Message = { id: this.nextId(), from: me, to: other, body, ref: input.ref as string, fingerprint: fp, at: this.tick(), readAt: null }; this.d.messages.push(m); return { message: this.messageView(m, me), duplicate: false }; });
  }
  conversation(me: string, other: string, opts: PrivatePage = {}) {
    this.friendGuard(me, other); this.rate('read', me);
    const p = this.page(this.d.messages.filter(m => (m.from === me && m.to === other) || (m.to === me && m.from === other)), opts);
    return { ...p, list: p.list.map(m => this.messageView(m, me)), user: this.who(other), canSend: this.dmEnabled(me) && this.dmEnabled(other) };
  }
  private inboxRows(me: string) {
    const rows = new Map<string, Message>();
    for (const m of this.d.messages) {
      if (m.from !== me && m.to !== me) continue;
      const other = m.from === me ? m.to : m.from;
      if (this.accepted(me, other) && this.visible(me, other)) rows.set(other, m);
    }
    return rows;
  }
  /** R67: عدد الرسائل بين طرفين من وقت معيّن (لمهمة CP اليومية) — داخلي */
  pairMessagesSince(a: string, b: string, since: number): number { return this.d.messages.filter(m => m.at >= since && ((m.from === a && m.to === b) || (m.from === b && m.to === a))).length; }
  private unreadCount(me: string) { const peers = this.inboxRows(me); return this.d.messages.filter(m => m.to === me && m.readAt === null && peers.has(m.from)).length; }
  inbox(me: string, opts: PrivatePage = {}) {
    this.actor(me); this.rate('read', me); const rows = this.inboxRows(me);
    const p = this.page([...rows.values()], opts);
    return { ...p, list: p.list.map(m => { const other = m.from === me ? m.to : m.from; return { id: m.id, user: this.who(other), last: this.messageView(m, me), unread: this.d.messages.filter(x => x.to === me && x.from === other && x.readAt === null).length }; }), unread: this.unreadCount(me) };
  }
  /** R47 uses this same private state + Persister + tx. No parallel identity, storage file, or wallet. */
  private familyContext(me?: string): FamilyContext {
    const deactivated = (id: string) => {
      const value = this.callbacks.isDeactivated?.(id);
      if (typeof value !== 'boolean') return error(503, 'safety_unconfigured', 'خصوصية العلاقات غير مهيأة الآن.');
      return value;
    };
    const available = (id: string) => identity(id) && this.check('hasAccount', id) && !this.check('isBanned', id) && !deactivated(id);
    const allowed = (id: string, kind: FamilyKind) => {
      if (!this.dmEnabled(id)) return false;
      const callback = this.callbacks.relationRequestsAllowed;
      if (!callback) return true;
      const value = callback(id, kind);
      if (typeof value !== 'boolean') return error(503, 'safety_unconfigured', 'خصوصية العلاقات غير مهيأة الآن.');
      return value;
    };
    const relationActor = (id: string, exit = false) => {
      // Self-removal/revocation is never held hostage by block, changed age, privacy, suspension or deactivation.
      if (exit) { if (!identity(id) || !this.check('hasAccount', id)) return error(401, 'auth', 'سجّل دخولك أول.'); return; }
      this.actor(id);
      if (deactivated(id)) return error(403, 'deactivated', 'الحساب غير نشط.');
    };
    const visible = (a: string, b: string, kind: FamilyKind) => available(a) && available(b) && !this.check('isBlocked', a, b) && !this.check('isBlocked', b, a) && allowed(a, kind) && allowed(b, kind);
    return {
      now: () => this.tick(), actor: relationActor, available, visible,
      peer: (a, b, kind) => {
        relationActor(a); this.peer(a, b);
        if (deactivated(b)) return error(404, 'not_found', 'الحساب غير متاح.');
        if (!allowed(a, kind) || !allowed(b, kind)) return error(403, 'relation_privacy', 'طلبات العلاقات موقوفة حسب إعداد الخصوصية.');
      },
      adult: id => {
        if (typeof this.callbacks.adultSelfDeclared !== 'function') return error(503, 'age_unconfigured', 'تصريح العمر غير مهيأ الآن.');
        return this.callbacks.adultSelfDeclared(id) === true;
      },
      resolve: pub => {
        if (typeof this.callbacks.resolvePublicId !== 'function') return error(503, 'public_bridge_unconfigured', 'دليل اللاعبين غير مهيأ الآن.');
        const id = this.callbacks.resolvePublicId(pub);
        return typeof id === 'string' && identity(id) ? id : null;
      },
      who: id => this.who(id), rate: () => { if (me) this.rate('change', me); }, fail: error,
    };
  }
  familySnapshot(me: string) {
    this.rate('read', me);
    return privateFamilyView(this.d.familyR47 ?? emptyFamilyState(), me, this.familyContext(me));
  }
  familyCommand(me: string, command: unknown) {
    return this.tx(() => {
      const state = this.d.familyR47 ??= emptyFamilyState();
      return applyFamilyCommand(state, me, command, this.familyContext(me));
    });
  }
  /** R58w: الارتباط الافتراضي الحالي (للخادم بس: نقاط CP). ما يغيّر شي ولا يتجاوز إعدادات الظهور. */
  coupleOf(me: string): { id: number; partner: string; at: number } | null { const b = (this.d.familyR47?.couples ?? []).find(x => x.a === me || x.b === me); return b ? { id: b.id, partner: b.a === me ? b.b : b.a, at: b.at } : null; }
  /** Parent resolves subject/viewer from the current account/profile; never accept internal IDs from HTTP. */
  familyPublic(subject: string, viewer?: string) {
    return publicFamilyView(this.d.familyR47 ?? emptyFamilyState(), subject, viewer, this.familyContext());
  }
  unread(me: string) { this.actor(me); this.rate('read', me); return this.unreadCount(me); }
  /** Atomic batch: recipient's own incoming messages only. No silent cross-user updates. */
  markRead(me: string, ids: unknown) {
    this.actor(me);
    if (!Array.isArray(ids) || ids.length > PRIVATE_PAGE_MAX || ids.some(id => !positive(id))) return error(400, 'ids', 'قائمة الرسائل غير صالحة.');
    const messages = [...new Set(ids)].map(id => this.d.messages.find(m => m.id === id && m.to === me));
    if (messages.some(m => !m)) return error(404, 'not_found', 'الرسالة غير متاحة.');
    for (const m of messages) this.friendGuard(me, m!.from);
    const changed = messages.filter((m): m is Message => !!m && m.readAt === null);
    this.rate('change', me);
    if (changed.length) this.tx(() => { const at = this.tick(); for (const m of changed) m.readAt = at; });
    return { read: changed.length, unread: this.unreadCount(me) };
  }
}
