/* R74: مزايا عملية لـ VIP والنوبل (مو بس شكل). الضعيفة لمستويات تحت، والقوية لمستويات فوق.
 * المالك يقدر يغيّر المستوى المطلوب لكل ميزة من لوحة التحكم (ينحفظ بملف perks74.json). */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export type PerkKey = 'bigGroups' | 'quitPass' | 'mmPriority' | 'roomFull' | 'rankShield' | 'support' | 'reqNote' | 'seat' | 'broadcast' | 'noKick' | 'stealth'
  | 'salary' | 'muteWords' | 'shopDiscount' | 'pinChats' | 'dmEdit' | 'visitors' | 'xpBoost' | 'pickId' | 'studio';
/** alt: مستوى النوبل اللي يفتح نفس ميزة الـVIP (اختياري) */
export type PerkDef = { key: PerkKey; system: 'vip' | 'noble'; level: number; icon: string; name: string; desc: string; alt?: number };
export const PERK_DEFS: PerkDef[] = [
  { key: 'bigGroups', system: 'vip', level: 3, icon: '👥', name: 'قروبات أكبر وصوت أطول', desc: 'قروب لين 100 شخص، ورسالة صوتية لين 3 دقايق.' },
  { key: 'quitPass', system: 'vip', level: 5, icon: '🚪', name: 'إعفاء من عقوبة الخروج', desc: 'مرة باليوم تطلع من مباراة بدون منع الـ5 دقايق.' },
  { key: 'mmPriority', system: 'vip', level: 7, icon: '⚡', name: 'أولوية بالبحث عن لاعبين', desc: 'تتقدم بالدور وتلقى مباراة أسرع.' },
  { key: 'roomFull', system: 'vip', level: 10, icon: '🚪✨', name: 'دخول المجالس الممتلئة', desc: 'تدخل المجلس حتى لو امتلى (مكان إضافي).' },
  { key: 'rankShield', system: 'vip', level: 13, icon: '🛡️', name: 'حماية التصنيف', desc: 'أول خسارة باليوم ما تنقّص نقاط تصنيفك.' },
  { key: 'support', system: 'noble', level: 1, icon: '🎧', name: 'دعم فني أولوية', desc: 'بلاغاتك ورسائلك تطلع أول شي عند الإدارة.' },
  { key: 'reqNote', system: 'noble', level: 2, icon: '💌', name: 'رسالة مع طلب الصداقة', desc: 'ترسل رسالة قصيرة مع طلب الصداقة لأي أحد.' },
  { key: 'seat', system: 'noble', level: 4, icon: '🎙️', name: 'المقاعد المحجوزة', desc: 'تقعد بمقاعد المايك المقفولة (المحجوزة) بأي مجلس.' },
  { key: 'broadcast', system: 'noble', level: 6, icon: '📣', name: 'إعلان على كل الموقع', desc: 'رسالة تطلع لكل المتصلين — مرة بالأسبوع.' },
  { key: 'noKick', system: 'noble', level: 7, icon: '🛡️👑', name: 'حماية من الطرد والكتم', desc: 'مشرف المجلس ما يقدر يطردك ولا يكتمك — بس صاحب المجلس.' },
  { key: 'stealth', system: 'noble', level: 9, icon: '🥷', name: 'الدخول المخفي', desc: 'تخفي زياراتك للملفات ودخوليتك وحالة اتصالك (من إعدادات الخصوصية).' },
  // R88: مزايا جديدة (الأرقام تكبر مع المستوى)
  { key: 'salary', system: 'vip', level: 1, alt: 1, icon: '💰', name: 'راتب يومي', desc: 'فوق المكافأة اليومية: 100 عملة لكل مستوى VIP و300 لكل مستوى نوبل.' },
  { key: 'muteWords', system: 'vip', level: 1, alt: 1, icon: '🔇', name: 'كتم كلمات', desc: 'كلمات ما تبي تشوفها بالدردشة والرسائل والتعليقات — تختفي عندك بس.' },
  { key: 'shopDiscount', system: 'vip', level: 2, alt: 1, icon: '🏷️', name: 'خصم دائم بالمتجر', desc: 'من 5% لين 30% حسب مستواك، ينخصم تلقائي وقت الشراء.' },
  { key: 'pinChats', system: 'vip', level: 2, alt: 1, icon: '📌', name: 'تثبيت المحادثات', desc: 'تثبّت لين 10 محادثات فوق قائمة رسائلك.' },
  { key: 'dmEdit', system: 'vip', level: 5, alt: 3, icon: '✏️', name: 'تعديل وحذف الرسائل', desc: 'تعدّل رسالتك الخاصة أو تحذفها عند الطرفين خلال 10 دقايق.' },
  { key: 'visitors', system: 'vip', level: 6, icon: '👁️', name: 'مين زار ملفي', desc: 'تشوف أسماء وصور اللي زاروا ملفك ومتى.' },
  { key: 'xpBoost', system: 'vip', level: 8, alt: 4, icon: '⚡', name: 'مضاعف الخبرة', desc: 'خبرة إضافية من كل مباراة: من 24% لين 50% حسب مستواك.' },
  { key: 'pickId', system: 'vip', level: 11, alt: 5, icon: '🆔', name: 'آيدي مميز تختاره', desc: 'تختار آيدي من 4 أرقام فاضي (مثل 7777) بنفسك — تغيير مرة كل 30 يوم.' },
  { key: 'studio', system: 'noble', level: 5, icon: '🎨', name: 'استوديو التصميم', desc: 'تصمم إطارك وخلفيتك بنفسك (ألوان ونقشة واسمك)، وتلبسها أو تبيعها للاعبين بالعملات.' },
];
PERK_DEFS.sort((a, b) => (a.system === b.system ? 0 : a.system === 'vip' ? -1 : 1) || a.level - b.level);
export const PICK_ID_EVERY = 30 * 86400_000, EDIT_WINDOW = 10 * 60_000;
type Prefs = { mw?: string[]; pin?: string[]; idAt?: number };
type Data = { v: 1; levels: Partial<Record<PerkKey, number>>; used: Record<string, string>; bc: Record<string, number>; prefs?: Record<string, Prefs> };
const day = (t: number) => new Date(t + 4 * 3600_000).toISOString().slice(0, 10);

export class Perks {
  private d: Data; private disk: Persister;
  constructor(file: string, private tier: (id: string) => { vip: number; noble: number }, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.levels) && isObj(x.used);
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = (loaded as unknown as Data) ?? { v: 1, levels: {}, used: {}, bc: {} }; this.d.bc ??= {}; this.d.prefs ??= {};
    this.disk = new Persister('perks74', file, () => this.d, now, mon, valid);
  }
  def(k: PerkKey) { return PERK_DEFS.find((p) => p.key === k)!; }
  level(k: PerkKey) { return this.d.levels[k] ?? this.def(k).level; }
  has(id: string, k: PerkKey) { if (!id || id.startsWith('bot-')) return false; const d = this.def(k), t = this.tier(id); const v = d.system === 'vip' ? t.vip : t.noble; return (v > 0 && v >= this.level(k)) || (!!d.alt && t.noble > 0 && t.noble >= d.alt); }
  /** R88: الأرقام اللي تكبر مع المستوى */
  salaryOf(id: string) { if (!this.has(id, 'salary')) return 0; const t = this.tier(id); return t.vip * 100 + t.noble * 300; }
  discountPct(id: string) { if (!this.has(id, 'shopDiscount')) return 0; const t = this.tier(id); return Math.max(5, Math.min(30, Math.max(t.vip * 2, t.noble * 4))); }
  xpPct(id: string) { if (!this.has(id, 'xpBoost')) return 0; const t = this.tier(id); return Math.max(24, Math.min(50, Math.max(t.vip * 3, t.noble * 6))); }
  prefs(id: string) { const p = this.d.prefs![id] ?? {}; return { muteWords: this.has(id, 'muteWords') ? [...(p.mw ?? [])] : [], pins: this.has(id, 'pinChats') ? [...(p.pin ?? [])] : [], nextIdAt: p.idAt ? p.idAt + PICK_ID_EVERY : 0 }; }
  private pset(id: string, fn: (p: Prefs) => void) { const p = (this.d.prefs![id] ??= {}); fn(p); if (!p.mw?.length && !p.pin?.length && !p.idAt) delete this.d.prefs![id]; this.disk.save(); }
  private need(id: string, k: PerkKey) { if (!this.has(id, k)) { const d = this.def(k); throw Object.assign(new Error(`هذي الميزة تحتاج VIP ${this.level(k)}${d.alt ? ` أو نوبل ${d.alt}` : ''}.`), { status: 403 }); } }
  setMuteWords(id: string, list: unknown) {
    this.need(id, 'muteWords'); if (!Array.isArray(list) || list.length > 30) throw Object.assign(new Error('لين 30 كلمة.'), { status: 400 });
    const clean = [...new Set(list.map((w) => String(w ?? '').replace(/[\u0000-\u001f]/g, '').trim()).filter((w) => w.length >= 2 && w.length <= 24))];
    this.pset(id, (p) => { p.mw = clean; }); return { ok: true, muteWords: clean };
  }
  togglePin(id: string, pub: unknown) {
    this.need(id, 'pinChats'); const v = String(pub ?? ''); if (!/^[A-Za-z0-9_-]{16}$/.test(v)) throw Object.assign(new Error('محادثة غير صالحة.'), { status: 400 });
    const cur = this.d.prefs![id]?.pin ?? []; const on = !cur.includes(v);
    if (on && cur.length >= 10) throw Object.assign(new Error('تقدر تثبّت لين 10 محادثات.'), { status: 409 });
    this.pset(id, (p) => { p.pin = on ? [v, ...cur] : cur.filter((x) => x !== v); }); return { ok: true, pinned: on, pins: this.d.prefs![id]?.pin ?? [] };
  }
  /** آيدي مختار: يتأكد من الميزة والمهلة. الحفظ الفعلي عند المتصل، وبعده markPick */
  pickIdCheck(id: string) { this.need(id, 'pickId'); const at = this.d.prefs![id]?.idAt ?? 0; const left = at + PICK_ID_EVERY - this.now(); if (at && left > 0) throw Object.assign(new Error(`تقدر تغيّر الآيدي بعد ${Math.ceil(left / 86400_000)} يوم.`), { status: 429 }); }
  markPick(id: string) { this.pset(id, (p) => { p.idAt = this.now(); }); }
  /** ميزة «مرة باليوم»: ترجع true وتسجّل لو متاحة */
  useDaily(id: string, k: PerkKey) {
    if (!this.has(id, k)) return false; const key = `${k}:${id}`, today = day(this.now());
    if (this.d.used[key] === today) return false; this.d.used[key] = today;
    const ks = Object.keys(this.d.used); if (ks.length > 50_000) for (const x of ks) if (this.d.used[x] !== today) delete this.d.used[x];
    this.disk.save(); return true;
  }
  /** الإعلان العام: مرة كل 7 أيام */
  broadcastLeft(id: string) { const last = this.d.bc[id] ?? 0; return Math.max(0, last + 7 * 86400_000 - this.now()); }
  markBroadcast(id: string) { this.d.bc[id] = this.now(); this.disk.save(); }
  view(id: string) {
    const t = this.tier(id);
    return { vip: t.vip, noble: t.noble, list: PERK_DEFS.map((p) => ({ ...p, level: this.level(p.key), open: this.has(id, p.key) })), amounts: { salary: this.salaryOf(id), discount: this.discountPct(id), xp: this.xpPct(id) }, prefs: this.prefs(id) };
  }
  setLevel(k: unknown, lv: unknown) {
    const d = PERK_DEFS.find((p) => p.key === k); if (!d) throw Object.assign(new Error('ميزة غير معروفة.'), { status: 400 });
    const n = Number(lv), max = d.system === 'vip' ? 15 : 9; if (!Number.isInteger(n) || n < 1 || n > max) throw Object.assign(new Error(`المستوى من 1 لين ${max}.`), { status: 400 });
    this.d.levels[d.key] = n; this.disk.save(); return { ok: true, list: PERK_DEFS.map((p) => ({ ...p, level: this.level(p.key) })) };
  }
  adminList() { return { list: PERK_DEFS.map((p) => ({ ...p, default: p.level, level: this.level(p.key) })) }; }
}
