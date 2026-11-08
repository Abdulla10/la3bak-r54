import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

/** R58w: نقاط ومستوى CP فوق «الارتباط الافتراضي» الموجود (family-r47).
 * العلاقة نفسها (الطلب، القبول، 18+، موافقة الطرفين على الظهور، الإنهاء) تبقى بنظام R47 بدون أي تغيير.
 * هنا بس: نقاط CP = قيمة الهدايا (بالجواهر) بين الطرفين بعد بداية العلاقة، من إيصال المحفظة.
 * المفتاح مربوط برقم الارتباط + الطرفين، فلو انتهت العلاقة وبدأت وحدة جديدة تبدأ النقاط من صفر. */
export const CP_LEVELS = Object.freeze([0, 10_000, 50_000, 200_000, 1_000_000]);
export const CP_LEVEL_NAMES = Object.freeze(['بداية', 'قريبين', 'متفاهمين', 'روح وحدة', 'أسطورة CP']);
type Data = { v: 1; pts: Record<string, number> };
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
export function validCpPoints(x: unknown): boolean {
  return isObj(x) && x.v === 1 && isObj(x.pts) && Object.keys(x.pts).length <= 200_000 && Object.entries(x.pts).every(([k, v]) => /^\d{1,15}:[0-9a-f-]{36}:[0-9a-f-]{36}$/i.test(k) && nat(v));
}
export function cpKey(coupleId: number, a: string, b: string): string { const [x, y] = [a, b].sort(); return `${coupleId}:${x}:${y}`; }
export function cpLevelOf(pts: number) {
  let lv = 1; CP_LEVELS.forEach((min, i) => { if (pts >= min) lv = i + 1; });
  return { level: lv, name: CP_LEVEL_NAMES[lv - 1], floor: CP_LEVELS[lv - 1], next: CP_LEVELS[lv] ?? null };
}
export class CpPoints {
  private d: Data = { v: 1, pts: {} };
  private disk: Persister;
  constructor(file: string, now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const loaded = loadJsonFile(file, validCpPoints); if (loaded) this.d = loaded as unknown as Data; }
    this.disk = new Persister('cp-points', file, () => this.d, now, mon, validCpPoints);
  }
  get(key: string): number { return this.d.pts[key] ?? 0; }
  /** ترجع true إذا تغيّرت النقاط وانحفظت */
  add(key: string, gems: number): boolean {
    if (!nat(gems) || !gems) return false; const next = this.get(key) + gems; if (!nat(next)) return false;
    const prev = this.d.pts[key];
    this.d.pts[key] = next;
    try { this.disk.mustSave(); return true; } catch { if (prev === undefined) delete this.d.pts[key]; else this.d.pts[key] = prev; return false; }
  }
}
