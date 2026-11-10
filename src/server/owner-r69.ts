/** R69: أدوات المالك —
 *  1) التحقق بخطوتين لدخول لوحة التحكم (المالك برمز من تطبيق المصادقة، والمشرف بتحققه الشخصي).
 *  2) زر طوارئ يوقف كل صرف العملات من اللاعبين (والموقع يظل شغال).
 *  3) تقرير صباحي يوصل المالك كل يوم.
 *  4) مؤشرات النمو: النشطين يومي/أسبوعي/شهري، ورجوع اللاعبين بعد يوم وأسبوع.
 *  5) مراقبة المشرفين: إيقاف مشرف، وحد يومي خاص لكل مشرف.
 *  6) التراجع عن عمليات (يتنفذ في index.ts — هنا نحفظ اللي تراجعنا عنه بس). */
import { createHash, randomBytes } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import { b32encode, totp } from './arena-r69.js';

const GULF = 4 * 3_600_000;
export const dayKey = (t: number) => new Date(t + GULF).toISOString().slice(0, 10);
const SESSION_MS = 12 * 3_600_000;
type Data = {
  v: 1;
  panel: { on: boolean; secret: string; pending: string; last: number; fails: number; lockUntil: number };
  sessions: Record<string, { who: string; exp: number }>;
  frozen: { on: boolean; at: number; by: string; reason: string };
  suspended: Record<string, { at: number; by: string }>;
  limits: Record<string, number>;
  seen: Record<string, string[]>;
  reports: { day: string; at: number; text: string }[];
  undone: number[];
};
const valid = (x: Record<string, unknown>) => x.v === 1 && isObj(x.panel) && isObj(x.sessions) && isObj(x.frozen) && isObj(x.seen);
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export class OwnerError extends Error { constructor(message: string, public status = 400) { super(message); } }
const need = (ok: unknown, msg: string, status = 400): void => { if (!ok) throw new OwnerError(msg, status); };

export class OwnerOps {
  private d: Data;
  private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const fresh: Data = { v: 1, panel: { on: false, secret: '', pending: '', last: 0, fails: 0, lockUntil: 0 }, sessions: {}, frozen: { on: false, at: 0, by: '', reason: '' }, suspended: {}, limits: {}, seen: {}, reports: [], undone: [] };
    this.d = (file && (loadJsonFile(file, valid) as unknown as Data)) || fresh;
    this.d.suspended ??= {}; this.d.limits ??= {}; this.d.reports ??= []; this.d.undone ??= [];
    this.disk = new Persister('owner-ops', file, () => this.d, now, mon, valid);
  }
  private save() { this.disk.save(); }

  /* ---------- 1) التحقق بخطوتين للوحة ---------- */
  panelStatus() { return { on: this.d.panel.on, pending: !!this.d.panel.pending }; }
  panelSetup() { need(!this.d.panel.on, 'التحقق بخطوتين للوحة مفعّل من قبل.'); const secret = b32encode(randomBytes(20)); this.d.panel.pending = secret; this.save(); return { secret, uri: `otpauth://totp/${encodeURIComponent('لعبك:لوحة التحكم')}?secret=${secret}&issuer=${encodeURIComponent('لعبك')}&digits=6&period=30` }; }
  private check(secret: string, code: unknown): boolean {
    const P = this.d.panel; const t = this.now(); need(P.lockUntil <= t, 'محاولات كثيرة غلط. جرّب بعد 10 دقايق.', 429);
    const c = String(code ?? '').replace(/\D/g, ''); const step = Math.floor(t / 30_000);
    for (const s of [step, step - 1, step + 1]) if (c.length === 6 && s > P.last && totp(secret, s) === c) { P.last = s; P.fails = 0; this.save(); return true; }
    P.fails++; if (P.fails >= 5) { P.lockUntil = t + 10 * 60_000; P.fails = 0; } this.save(); return false;
  }
  /** يفعّل ويرجع جلسة للجهاز الحالي (عشان ما ينقفل عليك) */
  panelEnable(code: unknown, who: string) { const P = this.d.panel; need(P.pending, 'ابدأ التفعيل من جديد.'); need(this.check(P.pending, code), 'الرمز غلط. جرّب الرمز الجديد.'); P.secret = P.pending; P.pending = ''; P.on = true; this.d.sessions = {}; const tok = this.newSession(who); this.save(); return tok; }
  panelDisable(code: unknown) { const P = this.d.panel; need(P.on, 'مو مفعّل.'); need(this.check(P.secret, code), 'الرمز غلط.'); P.on = false; P.secret = ''; this.d.sessions = {}; this.save(); }
  /** طوارئ: ماينوس يقدر يطفيه من متغير البيئة لو المالك ضيّع جواله */
  panelForceOff() { if (!this.d.panel.on) return; this.d.panel.on = false; this.d.panel.secret = ''; this.d.sessions = {}; this.save(); }
  private newSession(who: string) { const tok = randomBytes(24).toString('base64url'); this.d.sessions[hash(tok)] = { who, exp: this.now() + SESSION_MS }; const t = this.now(); for (const [k, v] of Object.entries(this.d.sessions)) if (v.exp < t) delete this.d.sessions[k]; return tok; }
  /** دخول المالك (رمز الإدارة) برمز اللوحة */
  panelLoginOwner(code: unknown) { need(this.d.panel.on, 'التحقق بخطوتين للوحة مو مفعّل.'); need(this.check(this.d.panel.secret, code), 'الرمز غلط.', 401); const t = this.newSession('token'); this.save(); return t; }
  /** دخول المشرف بعد ما يتحقق بتحققه الشخصي (يتأكد منه index.ts) */
  panelLoginStaff(id: string) { const t = this.newSession(id); this.save(); return t; }
  /** null = مسموح، وإلا سبب الرفض */
  gate(actorId: string, sessionToken: string): null | 'need2fa' | 'suspended' {
    if (actorId !== 'token' && this.d.suspended[actorId]) return 'suspended';
    if (!this.d.panel.on) return null;
    const s = sessionToken ? this.d.sessions[hash(sessionToken)] : undefined;
    return s && s.exp > this.now() && s.who === actorId ? null : 'need2fa';
  }

  /* ---------- 2) زر الطوارئ ---------- */
  freezeView() { return { ...this.d.frozen }; }
  setFrozen(on: boolean, by: string, reason: string) { this.d.frozen = { on, at: this.now(), by, reason }; this.save(); return this.freezeView(); }
  frozen() { return this.d.frozen.on; }

  /* ---------- 5) المشرفين ---------- */
  suspend(id: string, by: string, on: boolean) { if (on) this.d.suspended[id] = { at: this.now(), by }; else delete this.d.suspended[id]; for (const [k, v] of Object.entries(this.d.sessions)) if (v.who === id) delete this.d.sessions[k]; this.save(); }
  suspendedOf(id: string) { return this.d.suspended[id] ?? null; }
  setLimit(id: string, coins: number | null) { if (coins === null) delete this.d.limits[id]; else this.d.limits[id] = coins; this.save(); }
  limitOf(id: string): number | null { return this.d.limits[id] ?? null; }

  /* ---------- 4) مؤشرات النمو ---------- */
  seen(id: string) {
    const k = dayKey(this.now()); const l = (this.d.seen[id] ??= []);
    if (l[l.length - 1] === k) return; l.push(k); if (l.length > 40) l.splice(0, l.length - 40); this.save();
  }
  kpis(since: (id: string) => number | null) {
    const t = this.now(); const today = dayKey(t); const dayAgo = (n: number) => dayKey(t - n * 86_400_000);
    const last7 = new Set(Array.from({ length: 7 }, (_, i) => dayAgo(i))), last30 = new Set(Array.from({ length: 30 }, (_, i) => dayAgo(i)));
    let dau = 0, wau = 0, mau = 0; const perDay = new Map<string, number>();
    for (const days of Object.values(this.d.seen)) {
      if (days.includes(today)) dau++; if (days.some((d) => last7.has(d))) wau++; if (days.some((d) => last30.has(d))) mau++;
      for (const d of days) if (last30.has(d)) perDay.set(d, (perDay.get(d) ?? 0) + 1);
    }
    // الرجوع: من سجل بيوم X (آخر 30 يوم)، كم رجع اليوم اللي بعده / بعد 7 أيام
    let c1 = 0, r1 = 0, c7 = 0, r7 = 0;
    for (const [id, days] of Object.entries(this.d.seen)) {
      const s = since(id); if (!s || t - s > 31 * 86_400_000) continue; const d0 = dayKey(s); const set = new Set(days);
      const d1 = dayKey(s + 86_400_000), d7 = dayKey(s + 7 * 86_400_000);
      if (d1 < today) { c1++; if (set.has(d1)) r1++; }
      if (d7 < today) { c7++; if ([...set].some((d) => d >= d7 && d > d0)) r7++; }
    }
    const pctOf = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
    return { dau, wau, mau, stickiness: pctOf(dau, mau), d1: pctOf(r1, c1), d1n: c1, d7: pctOf(r7, c7), d7n: c7, daily: Array.from({ length: 14 }, (_, i) => dayAgo(13 - i)).map((d) => ({ d, n: perDay.get(d) ?? 0 })) };
  }
  activeOn(day: string) { let n = 0; for (const days of Object.values(this.d.seen)) if (days.includes(day)) n++; return n; }

  /* ---------- 3) التقرير الصباحي ---------- */
  reportDue(hour = 9) { const t = this.now(); const g = new Date(t + GULF); const k = dayKey(t); return g.getUTCHours() >= hour && !this.d.reports.some((r) => r.day === k); }
  addReport(text: string) { const k = dayKey(this.now()); if (this.d.reports.some((r) => r.day === k)) return false; this.d.reports.unshift({ day: k, at: this.now(), text }); this.d.reports = this.d.reports.slice(0, 30); this.save(); return true; }
  reportsList() { return this.d.reports.slice(0, 14); }

  /* ---------- 6) التراجع ---------- */
  isUndone(auditId: number) { return this.d.undone.includes(auditId); }
  markUndone(auditId: number) { this.d.undone.push(auditId); if (this.d.undone.length > 2000) this.d.undone.splice(0, 500); this.save(); }
}
