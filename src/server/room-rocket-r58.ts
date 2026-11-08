import { createHash } from 'node:crypto';

/** R58y: صاروخ الغرفة — رحلة يومية على 7 كواكب (طلب المالك).
 * - البترول = قيمة هدايا الغرفة بالجواهر (من إيصال المحفظة، مو من المتصفح). كل جوهرة = لتر.
 * - لكل كوكب بترول خاص، والفائض ينحسب للكوكب اللي بعده. الرحلة ترجع صفر كل يوم الساعة 12 بالليل (توقيت الإمارات).
 * - لما يوصل الصاروخ كوكب: أكثر 3 عبّوا بترول باليوم (لحظة الوصول) ياخذون جواهر + هدية من هدايا الكوكب،
 *   وفايز حظ واحد من الحاضرين (قاعد بالغرفة 3 دقايق أو أكثر، ومو من الثلاثة) ياخذ هدية الحظ. ما فيه شي للحاضرين غير كذا.
 * - المنح عبر wallet.grantCampaignBatch بمعرّف ثابت لكل (غرفة، يوم، كوكب، جايزة) فما يتكرر أبدًا.
 * - مجموع جواهر كل كوكب 35٪ من بتروله، فحتى لو واحد احتل المراكز الثلاثة بحساباته ما يرجع له أكثر من اللي صرفه. */
export type RocketGift = { id: string; name: string };
/** R58y: هدايا الكواكب من قطع المتجر الموجودة (طلب المالك: «الهدايا خذها من المتجر»)، كل كوكب بقطع تناسب شكله، والأغلى للمركز الأول. */
const G = (id: string, name: string): RocketGift => ({ id, name });
export const ROCKET_PLANETS = Object.freeze([
  { stage: 1, name: 'القمر', goal: 10_000, prizes: [2_000, 1_000, 500], gifts: [[G('souv-12', 'الهلال')], [G('art-mf-14', 'إطار مايك هلال الغيوم')], [G('art-bd-11', 'لوحة الليل الذهبي')]], luck: G('art-bub-10', 'فقاعة الفضة الليلية') },
  { stage: 2, name: 'الكريستال', goal: 25_000, prizes: [5_000, 2_500, 1_250], gifts: [[G('art-mf-02', 'إطار مايك كريستال الملوك')], [G('souv-26', 'الكريستالة')], [G('art-bub-15', 'فقاعة الكريستال الأزرق')]], luck: G('art-bub-04', 'فقاعة ندفة الثلج') },
  { stage: 3, name: 'اللهب', goal: 50_000, prizes: [10_000, 5_000, 2_500], gifts: [[G('art-bd-13', 'لوحة اللهب')], [G('art-mf-16', 'إطار مايك تنين اللهب')], [G('art-bub-05', 'فقاعة اللهب')]], luck: G('art-bd-02', 'لوحة الياقوت الأحمر') },
  { stage: 4, name: 'الزمرد', goal: 100_000, prizes: [20_000, 10_000, 5_000], gifts: [[G('art-mf-30', 'إطار مايك زهرة اللوتس')], [G('art-pb-04', 'خلفية شلال الساكورا')], [G('art-f2-12', 'إطار غصن الربيع')]], luck: G('souv-14', 'النخلة') },
  { stage: 5, name: 'مجرة الملوك', goal: 250_000, prizes: [50_000, 25_000, 12_500], gifts: [[G('art-mf-15', 'إطار مايك الأسد الذهبي')], [G('art-f2-13', 'إطار التاج البنفسجي')], [G('art-pb-01', 'خلفية قاعة العرش')]], luck: G('art-bd-17', 'لوحة التاج الملكي') },
  { stage: 6, name: 'بوابة المجرات', goal: 500_000, prizes: [100_000, 50_000, 25_000], gifts: [[G('art-mf-36', 'إطار مايك البوابة الذهبية')], [G('souv-28', 'البوابة السحرية')], [G('art-mf-17', 'إطار مايك الحصان المجنح')]], luck: G('art-f2-23', 'إطار مدار النجوم') },
  { stage: 7, name: 'الأكوان المتعددة', goal: 1_000_000, prizes: [200_000, 100_000, 50_000], gifts: [[G('art-mf-18', 'إطار مايك تنين البنفسج'), G('souv-03', 'التاج الملكي')], [G('souv-09', 'العنقاء')], [G('art-pb-06', 'خلفية قلعة السماء')]], luck: G('art-bub-20', 'فقاعة قصر الليل') },
].map((p) => Object.freeze(p)));
/** صورة مصغّرة لقطعة المتجر (نفس رسومات المتجر) */
export function rocketGiftArt(id: string): string {
  const m = /^(art-mf|art-f2|art-bub|art-bd|art-pb|souv)-(\d\d)$/.exec(id); if (!m) return '';
  const n = m[2]; return ({ 'art-mf': `/assets/art58/mic/m${n}.webp`, 'art-f2': `/assets/art58/frames2/f${n}.webp`, 'art-bub': `/assets/art58/bubbles/b${n}.webp`, 'art-bd': `/assets/art58/boards/b${n}.webp`, 'art-pb': `/assets/art58/pbg/p${n}.jpg`, souv: `/assets/art58/souv/s${n}.webp` } as Record<string, string>)[m[1]];
}
/** توافق مع الكود اللي يستورد الاسم القديم */
export const ROCKET_STAGES = ROCKET_PLANETS;
export const ROCKET_GIFTS: RocketGift[] = ROCKET_PLANETS.flatMap((p) => [...p.gifts.flat(), p.luck]);
export const ROCKET_SENDERS_MAX = 200;
export const ROCKET_WINNERS = 3;
export const ROCKET_LUCK_MIN_MS = 3 * 60_000;
/** حد المحفظة للجواهر بالمنحة الوحدة؛ الجايزة الأكبر تنقسم على أكثر من منحة */
export const ROCKET_GRANT_GEMS_MAX = 100_000;
export type RocketLaunch = { stage: number; at: number; status: 'pending' | 'done'; winners: string[]; luck: string | null };
export type RoomRocket = { day: string; pts: number; senders: Record<string, number>; launches: RocketLaunch[] };
const GULF_OFFSET = 4 * 3600_000;
const uuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
export function rocketDayOf(ms: number): string { const d = new Date(ms + GULF_OFFSET); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }
/** شكل R58u القديم (3 مراحل، عملات للحاضرين). ما انتشر على الإنتاج؛ نقبله بالقراءة ونبدأ رحلة جديدة بداله. */
const legacyLaunch = (l: any) => l && typeof l === 'object' && Object.hasOwn(l, 'recipients');
export function currentRocket(stored: RoomRocket | undefined, now: number): RoomRocket {
  const day = rocketDayOf(now);
  return stored && stored.day === day && !stored.launches.some(legacyLaunch) ? stored : { day, pts: 0, senders: {}, launches: [] };
}
/** حدود الكواكب التراكمية: 10 آلاف، 35 ألف، 85 ألف، 185 ألف، 435 ألف، 935 ألف، 1.935 مليون */
export function rocketBoundaries(): number[] { let b = 0; return ROCKET_PLANETS.map((s) => (b += s.goal)); }
export function validRoomRocket(v: any): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if (Object.keys(v).some((k) => !['day', 'pts', 'senders', 'launches'].includes(k))) return false;
  if (typeof v.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.day) || !nat(v.pts)) return false;
  if (!v.senders || typeof v.senders !== 'object' || Array.isArray(v.senders)) return false;
  const s = Object.entries(v.senders); if (s.length > ROCKET_SENDERS_MAX || !s.every(([id, n]) => uuid(id) && Number.isSafeInteger(n) && (n as number) > 0)) return false;
  if (!Array.isArray(v.launches) || v.launches.length > ROCKET_PLANETS.length) return false;
  if (v.launches.some(legacyLaunch)) return v.launches.length <= 3 && v.launches.every((l: any, i: number) => Object.keys(l).length === 5 && l.stage === i + 1 && nat(l.at) && ['pending', 'done'].includes(l.status) && Array.isArray(l.recipients) && l.recipients.length <= 25 && l.recipients.every(uuid) && (l.top === null || uuid(l.top)));
  const bounds = rocketBoundaries();
  return v.launches.every((l: any, i: number) => l && typeof l === 'object' && Object.keys(l).length === 5 && l.stage === i + 1 && nat(l.at) && ['pending', 'done'].includes(l.status)
    && Array.isArray(l.winners) && l.winners.length <= ROCKET_WINNERS && l.winners.every(uuid) && new Set(l.winners).size === l.winners.length
    && (l.luck === null || (uuid(l.luck) && !l.winners.includes(l.luck))) && v.pts >= bounds[i]);
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const asUuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
/** أكثر 3 عبّوا بترول باليوم (التعادل بالمعرّف عشان النتيجة ثابتة) */
export function rocketWinners(r: RoomRocket): string[] { return Object.entries(r.senders).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, ROCKET_WINNERS).map(([id]) => id); }
/** فايز الحظ: اختيار ثابت من المرشحين حسب (غرفة، يوم، كوكب)، فإعادة الحساب تعطي نفس الشخص */
export function rocketLuckPick(roomId: string, day: string, stage: number, candidates: string[]): string | null {
  const c = [...new Set(candidates)].sort(); if (!c.length) return null;
  return c[parseInt(hash(['room-rocket-luck-r58y', roomId, day, stage]).slice(0, 12), 16) % c.length];
}
export type RocketGrant = { kind: string; id: string; rank: number; gems: number; itemIds: string[]; reason: string };
/** كل منح كوكب واحد. الجواهر فوق حد المحفظة تنقسم على منح إضافية (r1b, r1c…). */
export function rocketGrants(l: RocketLaunch): RocketGrant[] {
  const p = ROCKET_PLANETS[l.stage - 1]; const out: RocketGrant[] = [];
  l.winners.forEach((id, i) => {
    let left = p.prizes[i]; const items = p.gifts[i].map((g) => g.id); let part = 0;
    while (left > 0 || part === 0) {
      const gems = Math.min(left, ROCKET_GRANT_GEMS_MAX);
      out.push({ kind: `r${i + 1}${part ? String.fromCharCode(97 + part) : ''}`, id, rank: i + 1, gems, itemIds: part ? [] : items, reason: `صاروخ الغرفة: كوكب ${p.name} — المركز ${i + 1}` });
      left -= gems; part += 1;
    }
  });
  if (l.luck) out.push({ kind: 'luck', id: l.luck, rank: 0, gems: 0, itemIds: [p.luck.id], reason: `صاروخ الغرفة: كوكب ${p.name} — هدية الحظ` });
  return out;
}
export function rocketCampaignId(roomId: string, day: string, stage: number, kind: string): string { return asUuid(hash(['room-rocket-r58y2', roomId, day, stage, kind])); }
export function rocketFingerprint(roomId: string, day: string, stage: number, g: RocketGrant): string {
  return hash({ v: 'room-rocket-r58y2', roomId, day, stage, kind: g.kind, ids: [g.id], gems: g.gems, itemIds: g.itemIds });
}
/** الجواهر والهدايا اللي ياخذها حساب من إطلاق واحد */
export function rocketShareOf(l: RocketLaunch, id: string): { rank: number; gems: number; gifts: string[] } {
  const p = ROCKET_PLANETS[l.stage - 1]; const i = l.winners.indexOf(id);
  if (i >= 0) return { rank: i + 1, gems: p.prizes[i], gifts: p.gifts[i].map((g) => g.name) };
  if (l.luck === id) return { rank: 0, gems: 0, gifts: [p.luck.name] };
  return { rank: -1, gems: 0, gifts: [] };
}
