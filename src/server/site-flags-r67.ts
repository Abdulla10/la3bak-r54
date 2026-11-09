/** R67ae: إعدادات تشغيل يغيّرها المالك من لوحة التحكم (بدون أسرار وبدون إعادة تشغيل).
 * كل قيمة لها حدود ثابتة هنا، وأي قيمة برا الحدود تنرفض. */
import { loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export type SiteFlags = {
  cinema: boolean;            // وضع اليوتيوب بالغرف
  streak: boolean;            // هدية الدخول اليومي المتتالي
  invite: boolean;            // مكافآت الدعوات
  firstTopupPercent: number;  // نسبة هدية أول شحن (0 = مطفية)، -1 = حسب إعداد الخادم
  bigGiftMin: number;         // أقل قيمة هدية (عملات) تطلع بالشاشة الكاملة
  profileBgVip: number;       // من أي VIP تطلع خلفية الملف كاملة
};
export const SITE_FLAGS_DEFAULT: SiteFlags = Object.freeze({ cinema: true, streak: true, invite: true, firstTopupPercent: -1, bigGiftMin: 9000, profileBgVip: 6 });
export const SITE_FLAG_LIMITS = Object.freeze({ firstTopupPercent: [-1, 200], bigGiftMin: [1000, 10_000_000], profileBgVip: [1, 15] } as const);
type Data = { v: 1; flags: Partial<SiteFlags>; at: number; by: string; words?: string[]; wordsAt?: number; wordsBy?: string };
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const inRange = (k: keyof typeof SITE_FLAG_LIMITS, v: unknown) => Number.isSafeInteger(v) && (v as number) >= SITE_FLAG_LIMITS[k][0] && (v as number) <= SITE_FLAG_LIMITS[k][1];
function validFlags(x: unknown): boolean {
  if (!isObj(x) || !isObj(x.flags)) return false;
  if (x.words !== undefined && (!Array.isArray(x.words) || x.words.length > 500 || x.words.some((w) => typeof w !== 'string' || w.length < 2 || w.length > 40))) return false;
  for (const [k, v] of Object.entries(x.flags)) {
    if (k === 'cinema' || k === 'streak' || k === 'invite') { if (typeof v !== 'boolean') return false; }
    else if (k in SITE_FLAG_LIMITS) { if (!inRange(k as keyof typeof SITE_FLAG_LIMITS, v)) return false; }
    else return false;
  }
  return true;
}
export class SiteFlagsStore {
  private d: Data = { v: 1, flags: {}, at: 0, by: '' };
  private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const l = loadJsonFile(file, validFlags as (v: Record<string, unknown>) => boolean); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('site-flags', file, () => this.d, now, mon, validFlags as (v: Record<string, unknown>) => boolean);
  }
  get(): SiteFlags { return { ...SITE_FLAGS_DEFAULT, ...this.d.flags }; }
  meta() { return { at: this.d.at, by: this.d.by }; }
  words(): string[] { return [...(this.d.words ?? [])]; }
  wordsMeta() { return { at: this.d.wordsAt ?? 0, by: this.d.wordsBy ?? '' }; }
  /** كلمات ممنوعة: إضافة/حذف — ترجع القائمة الجديدة */
  editWords(add: unknown, remove: unknown, by: string): { words: string[]; added: string[]; removed: string[] } {
    const list = (v: unknown) => (Array.isArray(v) ? v : []).map((w) => String(w ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const a = list(add), r = new Set(list(remove));
    if (a.some((w) => w.length < 2 || w.length > 40)) throw new Error('الكلمة لازم تكون من حرفين إلى 40 حرف.');
    const cur = this.words(); const added = a.filter((w) => !cur.includes(w)); const next = [...cur.filter((w) => !r.has(w)), ...added];
    if (next.length > 500) throw new Error('وصلت الحد الأقصى (500 كلمة).');
    const prev = this.d; this.d = { ...this.d, words: [...new Set(next)], wordsAt: this.now(), wordsBy: by };
    try { this.disk.mustSave(); } catch (e) { this.d = prev; throw e; }
    return { words: this.words(), added, removed: cur.filter((w) => r.has(w)) };
  }
  /** يرجع التغييرات (قبل/بعد) أو يرمي برسالة عربية */
  update(input: unknown, by: string): { before: SiteFlags; after: SiteFlags; changed: string[] } {
    if (!isObj(input)) throw new Error('بيانات غير صالحة.');
    const next: Partial<SiteFlags> = { ...this.d.flags };
    for (const [k, v] of Object.entries(input)) {
      if (k === 'cinema' || k === 'streak' || k === 'invite') { if (typeof v !== 'boolean') throw new Error('قيمة تشغيل/إطفاء غير صالحة.'); next[k] = v; }
      else if (k in SITE_FLAG_LIMITS) { const key = k as keyof typeof SITE_FLAG_LIMITS; if (!inRange(key, v)) throw new Error(`القيمة لازم تكون بين ${SITE_FLAG_LIMITS[key][0]} و ${SITE_FLAG_LIMITS[key][1]}.`); next[key] = v as number; }
      else throw new Error('إعداد غير معروف.');
    }
    const before = this.get(); const prev = this.d;
    this.d = { ...this.d, v: 1, flags: next, at: this.now(), by };
    try { this.disk.mustSave(); } catch (e) { this.d = prev; throw e; }
    const after = this.get();
    return { before, after, changed: (Object.keys(after) as (keyof SiteFlags)[]).filter((k) => before[k] !== after[k]) };
  }
}
