/* R74: مزايا عملية لـ VIP والنوبل (مو بس شكل). الضعيفة لمستويات تحت، والقوية لمستويات فوق.
 * المالك يقدر يغيّر المستوى المطلوب لكل ميزة من لوحة التحكم (ينحفظ بملف perks74.json). */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export type PerkKey = 'bigGroups' | 'quitPass' | 'mmPriority' | 'roomFull' | 'rankShield' | 'support' | 'reqNote' | 'seat' | 'broadcast' | 'noKick' | 'stealth';
export type PerkDef = { key: PerkKey; system: 'vip' | 'noble'; level: number; icon: string; name: string; desc: string };
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
];
type Data = { v: 1; levels: Partial<Record<PerkKey, number>>; used: Record<string, string>; bc: Record<string, number> };
const day = (t: number) => new Date(t + 4 * 3600_000).toISOString().slice(0, 10);

export class Perks {
  private d: Data; private disk: Persister;
  constructor(file: string, private tier: (id: string) => { vip: number; noble: number }, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.levels) && isObj(x.used);
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = (loaded as unknown as Data) ?? { v: 1, levels: {}, used: {}, bc: {} }; this.d.bc ??= {};
    this.disk = new Persister('perks74', file, () => this.d, now, mon, valid);
  }
  def(k: PerkKey) { return PERK_DEFS.find((p) => p.key === k)!; }
  level(k: PerkKey) { return this.d.levels[k] ?? this.def(k).level; }
  has(id: string, k: PerkKey) { if (!id || id.startsWith('bot-')) return false; const d = this.def(k), t = this.tier(id); const v = d.system === 'vip' ? t.vip : t.noble; return v > 0 && v >= this.level(k); }
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
    return { vip: t.vip, noble: t.noble, list: PERK_DEFS.map((p) => ({ ...p, level: this.level(p.key), open: this.has(id, p.key) })) };
  }
  setLevel(k: unknown, lv: unknown) {
    const d = PERK_DEFS.find((p) => p.key === k); if (!d) throw Object.assign(new Error('ميزة غير معروفة.'), { status: 400 });
    const n = Number(lv), max = d.system === 'vip' ? 15 : 9; if (!Number.isInteger(n) || n < 1 || n > max) throw Object.assign(new Error(`المستوى من 1 لين ${max}.`), { status: 400 });
    this.d.levels[d.key] = n; this.disk.save(); return { ok: true, list: PERK_DEFS.map((p) => ({ ...p, level: this.level(p.key) })) };
  }
  adminList() { return { list: PERK_DEFS.map((p) => ({ ...p, default: p.level, level: this.level(p.key) })) }; }
}
