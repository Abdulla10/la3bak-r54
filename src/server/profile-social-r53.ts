import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';
import { FunctionalHttp, FunctionalHttpError } from './functional-http.js';

/**
 * R53: ميزتان من قائمة «الخاص بي» بالتطبيق المرجعي ما كان لهم نظام بـLA3BAK:
 * 1) «من الذي رآني»: يُسجَّل فقط لما لاعب مسجّل يفتح الملف العام للاعب ثاني (/api/community/user/:pub).
 *    لا يُسجَّل: زيارة نفسك، الضيوف، المحظورين من الطرفين، الحسابات الموقوفة. صاحب الملف يشوف آخر الزوار مع عدد مرات الزيارة.
 *    الخصوصية: هوية الزائر تظهر فقط إذا كان مفعّل «إظهار نشاطي» (showActivity) وقت الزيارة والآن؛ غير كذا تظهر الزيارة «زائر مخفي» بدون اسم ولا رابط.
 * 2) «ادعُ الأصدقاء»: رابط دعوة برقمك العام. الحساب الجديد (عمره أقل من 72 ساعة) يقدر يربط نفسه بدعوة مرة وحدة،
 *    وصاحب الدعوة يشوف قائمة من انضم. **بدون أي مكافأة مالية** — ما يلمس المحفظة.
 * التخزين: ملف JSON واحد (profile-social.json) بنفس نمط الملفات الأخرى (كتابة ذرية + .bak، التالف يوقف التشغيل).
 */
export const VISITS_KEEP = 200, VISIT_DEDUP_MS = 10 * 60_000, INVITE_WINDOW_MS = 72 * 3600_000;
interface Visit { by: string; at: number; n: number; h?: boolean }
interface Data { v: 1; visits: Record<string, Visit[]>; seen: Record<string, number>; invites: Record<string, { by: string; at: number }> }

export function validProfileSocial(d: Record<string, unknown>): boolean {
  const nat = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  const acc = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 128;
  if (!isObj(d) || d.v !== 1 || !isObj(d.visits) || !isObj(d.seen) || !isObj(d.invites)) return false;
  if (!Object.entries(d.visits).every(([k, l]) => acc(k) && Array.isArray(l) && l.length <= VISITS_KEEP && l.every((x) => isObj(x) && acc(x.by) && x.by !== k && nat(x.at) && nat(x.n) && x.n >= 1 && (x.h === undefined || typeof x.h === 'boolean')))) return false;
  if (!Object.entries(d.seen).every(([k, v]) => acc(k) && nat(v))) return false;
  return Object.entries(d.invites).every(([k, x]) => acc(k) && isObj(x) && acc(x.by) && x.by !== k && nat(x.at));
}

export interface ProfileSocialDeps {
  hasAccount(id: string): boolean;
  isBanned(id: string): boolean;
  blocked(a: string, b: string): boolean;
  hidesActivity(id: string): boolean;
  sinceOf(id: string): number | null;
  resolvePublicId(pub: unknown): string | null;
  who(id: string): { publicId: string; name: string; avatar: string | null; level: number | null };
  log(event: string, data?: Record<string, unknown>): void;
}

export class ProfileSocial {
  private d: Data = { v: 1, visits: {}, seen: {}, invites: {} };
  private disk: Persister;
  constructor(file: string, private dep: ProfileSocialDeps, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const loaded = loadJsonFile(file, validProfileSocial); if (loaded) this.d = loaded as unknown as Data; }
    this.disk = new Persister('profile-social', file, () => this.d, now, mon, validProfileSocial);
  }
  retry() { this.disk.retry(); }
  private usable(id: string) { return this.dep.hasAccount(id) && !this.dep.isBanned(id); }

  /** تسجيل زيارة (غير مالي): لو فشل الحفظ ما نوقف فتح الملف، يبقى بالذاكرة ويُعاد الحفظ مع المحاولة التالية */
  recordVisit(viewer: string, subject: string) {
    if (!viewer || !subject || viewer === subject || !this.usable(viewer) || !this.usable(subject)) return false;
    if (this.dep.blocked(viewer, subject)) return false;
    const hidden = this.dep.hidesActivity(viewer);
    const list = this.d.visits[subject] ??= [];
    const at = this.now(); const i = list.findIndex((v) => v.by === viewer);
    if (i >= 0) {
      const row = list[i];
      if (at - row.at < VISIT_DEDUP_MS) return false; // تحديثات متكررة لنفس الزائر ما تُحسب زيارات جديدة
      list.splice(i, 1); list.unshift({ by: viewer, at, n: Math.min(row.n + 1, 1_000_000), ...(hidden || row.h ? { h: true } : {}) });
    } else list.unshift({ by: viewer, at, n: 1, ...(hidden ? { h: true } : {}) });
    if (list.length > VISITS_KEEP) list.length = VISITS_KEEP;
    if (!this.disk.save()) this.dep.log('profile_visit_unsaved', {});
    return true;
  }
  private visible(me: string, other: string) { return this.usable(other) && !this.dep.blocked(me, other); }
  visitors(me: string, limit = 50) {
    const list = (this.d.visits[me] ?? []).filter((v) => this.visible(me, v.by));
    const seen = this.d.seen[me] ?? 0;
    const lim = Math.max(1, Math.min(VISITS_KEEP, limit));
    return { ok: true as const, total: list.length, fresh: list.filter((v) => v.at > seen).length, seenAt: seen || null,
      list: list.slice(0, lim).map((v) => (v.h || this.dep.hidesActivity(v.by)
        ? { hidden: true, publicId: null, name: 'زائر مخفي', avatar: null, level: null, at: v.at, count: v.n, fresh: v.at > seen }
        : { ...this.dep.who(v.by), hidden: false, at: v.at, count: v.n, fresh: v.at > seen })) };
  }
  markVisitorsSeen(me: string) {
    const prev = this.d.seen[me]; this.d.seen[me] = this.now();
    try { this.disk.mustSave(); } catch (e) { if (prev === undefined) delete this.d.seen[me]; else this.d.seen[me] = prev; throw e; }
    return { ok: true as const, seenAt: this.d.seen[me] };
  }
  /** الدعوات */
  invites(me: string, myPublicId: string) {
    const joined = Object.entries(this.d.invites).filter(([id, x]) => x.by === me && this.visible(me, id)).sort((a, b) => b[1].at - a[1].at);
    const mine = this.d.invites[me];
    const since = this.dep.sinceOf(me);
    return { ok: true as const, code: myPublicId, joinedCount: joined.length,
      joined: joined.slice(0, 100).map(([id, x]) => ({ ...this.dep.who(id), at: x.at })),
      invitedBy: mine && this.visible(me, mine.by) ? { ...this.dep.who(mine.by), at: mine.at } : null,
      canClaim: !mine && since !== null && this.now() - since <= INVITE_WINDOW_MS, rewards: null };
  }
  claim(me: string, code: unknown) {
    if (this.d.invites[me]) return { ok: true as const, already: true };
    const by = this.dep.resolvePublicId(code);
    if (!by || !this.usable(by)) throw new FunctionalHttpError(404, 'رابط الدعوة غير صالح.');
    if (by === me) throw new FunctionalHttpError(400, 'ما تقدر تستخدم دعوتك لنفسك.');
    if (this.dep.blocked(me, by)) throw new FunctionalHttpError(403, 'ما تقدر تستخدم هذه الدعوة.');
    const since = this.dep.sinceOf(me), bySince = this.dep.sinceOf(by);
    if (since === null || this.now() - since > INVITE_WINDOW_MS) throw new FunctionalHttpError(409, 'الدعوة تُربط للحسابات الجديدة فقط (أول 72 ساعة).');
    if (bySince === null || bySince > since) throw new FunctionalHttpError(409, 'صاحب الدعوة لازم يكون مسجّل قبلك.');
    this.d.invites[me] = { by, at: this.now() };
    try { this.disk.mustSave(); } catch (e) { delete this.d.invites[me]; throw e; }
    return { ok: true as const, already: false };
  }
}

/** المسارات فوق جلسة الموقع (FunctionalHttp: جلسة + نفس المصدر للكتابة + فحص الحظر الإداري) */
export function wireProfileSocialRoutes(http: FunctionalHttp, ps: ProfileSocial, pub: (id: string) => string) {
  const only = (body: Record<string, unknown>, keys: string[]) => { if (Object.keys(body).some((k) => !keys.includes(k))) throw new FunctionalHttpError(400, 'حقول الطلب غير صالحة.'); };
  http.add('GET', '/api/profile/visitors', ({ user, url }) => {
    const raw = url.searchParams.get('limit');
    if (raw !== null && !/^\d{1,3}$/.test(raw)) throw new FunctionalHttpError(400, 'قيمة غير صالحة.');
    return ps.visitors(user.id, raw === null ? 50 : Number(raw));
  });
  http.add('POST', '/api/profile/visitors/seen', ({ user, body }) => { only(body, []); return ps.markVisitorsSeen(user.id); });
  http.add('GET', '/api/profile/invites', ({ user }) => ps.invites(user.id, pub(user.id)));
  http.add('POST', '/api/profile/invites/claim', ({ user, body }) => {
    only(body, ['code']);
    if (typeof body.code !== 'string' || !/^[A-Za-z0-9_-]{4,64}$/.test(body.code)) throw new FunctionalHttpError(400, 'رمز الدعوة غير صالح.');
    return ps.claim(user.id, body.code);
  });
}
