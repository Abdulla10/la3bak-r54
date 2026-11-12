/** R58: أيدي الغرفة (8 أرقام)، ليفل الغرفة من الدعم، وإعلانات الغرفة. */
import { createHash } from 'node:crypto';
/** رقم ثابت من 8 أرقام لكل غرفة، مشتق من معرّفها الداخلي (ما يتغيّر وما يحتاج تخزين). */
export function roomCodeOf(roomId: string): string {
  const n = createHash('sha256').update('la3bak-room-code-v1:' + roomId).digest().readUInt32BE(0) % 90_000_000;
  return String(10_000_000 + n);
}
export const ROOM_VANITY = /^[1-9][0-9]{0,7}$/;
/** R67au (طلب المالك): ليفل الغرفة لين 300 وبس. الحدود بالعملات (قيمة الهدايا داخل الغرفة؛ الدعم محفوظ بالجواهر ×20).
 * نقاط المنحنى (تتعدل من لوحة التحكم): Lv2 = 500 ألف، Lv10 = 5 مليون، Lv50 = 60 مليون، Lv100 = 200 مليون، Lv300 = 2 مليار. */
export const ROOM_LEVEL_MAX = 300;
export const ROOM_CURVE: { l2: number; l10: number; l50: number; l100: number; l300: number } = { l2: 500_000, l10: 5_000_000, l50: 60_000_000, l100: 200_000_000, l300: 2_000_000_000 };
const niceLv = (n: number) => n >= 10_000_000 ? Math.round(n / 100_000) * 100_000 : n >= 1_000_000 ? Math.round(n / 10_000) * 10_000 : Math.round(n / 1_000) * 1_000;
export function buildRoomLevels(c = ROOM_CURVE): number[] {
  const pts: [number, number][] = [[2, c.l2], [10, c.l10], [50, c.l50], [100, c.l100], [300, c.l300]];
  const out = [0];
  for (let lv = 2; lv <= ROOM_LEVEL_MAX; lv++) {
    let i = 0; while (i < pts.length - 2 && lv > pts[i + 1][0]) i++;
    const [a, va] = pts[i], [b, vb] = pts[i + 1]; const t = (lv - a) / (b - a);
    let v = niceLv(Math.exp(Math.log(va) + (Math.log(vb) - Math.log(va)) * t));
    if (v <= out[out.length - 1]) v = out[out.length - 1] + 1_000;
    out.push(v);
  }
  return out;
}
/** حدود كل ليفل بالعملات (ROOM_LEVELS[i] = بداية الليفل i+1) */
export const ROOM_LEVELS: number[] = buildRoomLevels();
export function setRoomCurve(c: typeof ROOM_CURVE): void { Object.assign(ROOM_CURVE, c); ROOM_LEVELS.splice(0, ROOM_LEVELS.length, ...buildRoomLevels(ROOM_CURVE)); }
/** support = قيمة الهدايا بالجواهر (القديمة)؛ الحساب والعرض بالعملات */
export function roomLevelOf(support: number): { level: number; support: number; floor: number; next: number | null } {
  const s = (Number.isSafeInteger(support) && support > 0 ? support : 0) * 20;
  let lo = 0, hi = ROOM_LEVELS.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (s >= ROOM_LEVELS[mid]) lo = mid; else hi = mid - 1; }
  const level = lo + 1;
  return { level, support: s, floor: ROOM_LEVELS[level - 1], next: level < ROOM_LEVELS.length ? ROOM_LEVELS[level] : null };
}
/** مميزات كل ليفل (يحطها Claude بطلب المالك). الأرقام الفعلية: سعة الأعضاء، هدية صاحب الغرفة، والخلفيات. */
export const roomCapacityBonus = (level: number) => Math.max(0, Math.min(ROOM_LEVEL_MAX, level) - 1) * 2;
export const roomOwnerGift = (level: number) => level >= 5 && level % 5 === 0 ? level * 2_000 : 0;
const MILESTONES: Record<number, string> = {
  10: 'فتح القبيلة + خلفية «قاعة المجرة»', 20: 'خلفية «القصر الكوني» + اسم الغرفة فضي', 30: 'خلفية «السجادة الزرقاء» + إطار فضي لبطاقة الغرفة', 40: 'خلفية «عرش الياقوت» + اسم الغرفة ذهبي',
  50: 'إطار ذهبي لبطاقة الغرفة بقائمة الغرف', 60: 'شارة الغرفة تلمع', 70: 'ترحيب مميز يوم أحد يدخل الغرفة', 80: 'اسم الغرفة بلون متحرك', 90: 'هالة حول بطاقة الغرفة',
  100: 'الغرفة تطلع أول قائمة الغرف (مميزة)', 120: 'إطار ماسي لبطاقة الغرفة', 150: 'إطار ملكي لبطاقة الغرفة', 180: 'شارة الغرفة الماسية', 200: 'اسم الغرفة بألوان ملكية',
  230: 'إطار الغرفة الأسطوري', 260: 'هالة أسطورية متحركة', 300: 'لقب «أسطورة الغرف» + تاج دائم على الغرفة',
};
export function roomLevelPerks(level: number): string[] {
  if (level < 2 || level > ROOM_LEVEL_MAX) return [];
  const out = ['+2 أعضاء بسعة الغرفة'];
  const g = roomOwnerGift(level); if (g) out.push(`هدية لصاحب الغرفة ${g.toLocaleString('en-US')} عملة`);
  if (MILESTONES[level]) out.push(MILESTONES[level]); else if (level % 10 === 0) out.push('شعار الليفل يتطور');
  return out;
}
export const ROOM_ADS_MAX = 10;
export type RoomAd = { id: string; text: string; at: number };

/** R58c: رتبة الغرفة الشهرية — نقاط من قيمة الهدايا داخل الغرفة خلال الشهر (توقيت الخليج)، وتبدأ من جديد كل شهر.
 * الأسطورية تقدر ترحّل النقاط الفايضة عن حدها للشهر الجاي (امتياز «ترحيل النقاط»). */
export const ROOM_TIERS = Object.freeze([
  { id: 'silver', name: 'فضية', min: 300, perks: 1 },
  { id: 'gold', name: 'ذهبية', min: 3_000, perks: 3 },
  { id: 'diamond', name: 'ماسية', min: 15_000, perks: 6 },
  { id: 'royal', name: 'ملكية', min: 40_000, perks: 9 },
  { id: 'legend', name: 'أسطورية', min: 75_000, perks: 10 },
] as const);
export type RoomMonth = { key: string; pts: number; gifts: number; senders: Record<string, number>; floor?: number };
export const ROOM_MONTH_SENDERS_MAX = 200;
const GULF_OFFSET = 4 * 3600_000;
export function monthKeyOf(ms: number): string { const d = new Date(ms + GULF_OFFSET); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
function prevKey(key: string): string { const [y, m] = key.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; }
export function tierIndexOf(pts: number): number { let t = -1; ROOM_TIERS.forEach((x, i) => { if (pts >= x.min) t = i; }); return t; }
/** حال الشهر الحالي للغرفة. نقاط شهر قديم ما تنحسب، إلا الفايض عن الأسطورية من الشهر اللي قبله مباشرة. */
export function currentRoomMonth(stored: RoomMonth | undefined, now: number): RoomMonth {
  const key = monthKeyOf(now);
  if (stored && stored.key === key) return stored;
  const legend = ROOM_TIERS[ROOM_TIERS.length - 1].min;
  const carry = stored && stored.key === prevKey(key) && stored.pts > legend ? Math.min(stored.pts - legend, legend) : 0;
  /* R115: رتبة ثابتة من الإدارة (floor) تنتقل كل شهر */
  const floor = stored?.floor ?? 0;
  return { key, pts: Math.max(carry, floor), gifts: 0, senders: {}, ...(floor ? { floor } : {}) };
}
export function validRoomMonth(v: any): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const k = Object.keys(v); if (k.some((x) => !['key', 'pts', 'gifts', 'senders', 'floor'].includes(x))) return false;
  if (v.floor !== undefined && (!Number.isSafeInteger(v.floor) || v.floor < 0)) return false;
  if (typeof v.key !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v.key)) return false;
  if (!Number.isSafeInteger(v.pts) || v.pts < 0 || !Number.isSafeInteger(v.gifts) || v.gifts < 0) return false;
  if (!v.senders || typeof v.senders !== 'object' || Array.isArray(v.senders)) return false;
  const s = Object.entries(v.senders); return s.length <= ROOM_MONTH_SENDERS_MAX && s.every(([id, n]) => typeof id === 'string' && id.length <= 80 && Number.isSafeInteger(n) && (n as number) > 0);
}
export function roomRankView(stored: RoomMonth | undefined, now: number) {
  const m = currentRoomMonth(stored, now); const t = tierIndexOf(m.pts); const nx = ROOM_TIERS[t + 1];
  return { month: m.key, pts: m.pts, tier: t >= 0 ? ROOM_TIERS[t].id : null, tierName: t >= 0 ? ROOM_TIERS[t].name : null, perks: t >= 0 ? ROOM_TIERS[t].perks : 0, next: nx ? { id: nx.id, name: nx.name, min: nx.min } : null };
}
