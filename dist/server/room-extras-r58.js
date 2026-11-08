/** R58: أيدي الغرفة (8 أرقام)، ليفل الغرفة من الدعم، وإعلانات الغرفة. */
import { createHash } from 'node:crypto';
/** رقم ثابت من 8 أرقام لكل غرفة، مشتق من معرّفها الداخلي (ما يتغيّر وما يحتاج تخزين). */
export function roomCodeOf(roomId) {
    const n = createHash('sha256').update('la3bak-room-code-v1:' + roomId).digest().readUInt32BE(0) % 90_000_000;
    return String(10_000_000 + n);
}
export const ROOM_VANITY = /^[1-9][0-9]{0,7}$/;
/** حدود ليفل الغرفة بقيمة الهدايا (جواهر) اللي انرسلت داخل الغرفة. */
export const ROOM_LEVELS = Object.freeze([0, 500, 2_000, 5_000, 12_000, 25_000, 50_000, 100_000, 200_000, 400_000]);
export function roomLevelOf(support) {
    const s = Number.isSafeInteger(support) && support > 0 ? support : 0;
    let level = 1;
    for (let i = 0; i < ROOM_LEVELS.length; i++)
        if (s >= ROOM_LEVELS[i])
            level = i + 1;
    return { level, support: s, floor: ROOM_LEVELS[level - 1], next: level < ROOM_LEVELS.length ? ROOM_LEVELS[level] : null };
}
export const ROOM_ADS_MAX = 10;
/** R58c: رتبة الغرفة الشهرية — نقاط من قيمة الهدايا داخل الغرفة خلال الشهر (توقيت الخليج)، وتبدأ من جديد كل شهر.
 * الأسطورية تقدر ترحّل النقاط الفايضة عن حدها للشهر الجاي (امتياز «ترحيل النقاط»). */
export const ROOM_TIERS = Object.freeze([
    { id: 'silver', name: 'فضية', min: 300, perks: 1 },
    { id: 'gold', name: 'ذهبية', min: 3_000, perks: 3 },
    { id: 'diamond', name: 'ماسية', min: 15_000, perks: 6 },
    { id: 'royal', name: 'ملكية', min: 40_000, perks: 9 },
    { id: 'legend', name: 'أسطورية', min: 75_000, perks: 10 },
]);
export const ROOM_MONTH_SENDERS_MAX = 200;
const GULF_OFFSET = 4 * 3600_000;
export function monthKeyOf(ms) { const d = new Date(ms + GULF_OFFSET); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
function prevKey(key) { const [y, m] = key.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; }
export function tierIndexOf(pts) { let t = -1; ROOM_TIERS.forEach((x, i) => { if (pts >= x.min)
    t = i; }); return t; }
/** حال الشهر الحالي للغرفة. نقاط شهر قديم ما تنحسب، إلا الفايض عن الأسطورية من الشهر اللي قبله مباشرة. */
export function currentRoomMonth(stored, now) {
    const key = monthKeyOf(now);
    if (stored && stored.key === key)
        return stored;
    const legend = ROOM_TIERS[ROOM_TIERS.length - 1].min;
    const carry = stored && stored.key === prevKey(key) && stored.pts > legend ? Math.min(stored.pts - legend, legend) : 0;
    return { key, pts: carry, gifts: 0, senders: {} };
}
export function validRoomMonth(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v))
        return false;
    const k = Object.keys(v);
    if (k.some((x) => !['key', 'pts', 'gifts', 'senders'].includes(x)))
        return false;
    if (typeof v.key !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v.key))
        return false;
    if (!Number.isSafeInteger(v.pts) || v.pts < 0 || !Number.isSafeInteger(v.gifts) || v.gifts < 0)
        return false;
    if (!v.senders || typeof v.senders !== 'object' || Array.isArray(v.senders))
        return false;
    const s = Object.entries(v.senders);
    return s.length <= ROOM_MONTH_SENDERS_MAX && s.every(([id, n]) => typeof id === 'string' && id.length <= 80 && Number.isSafeInteger(n) && n > 0);
}
export function roomRankView(stored, now) {
    const m = currentRoomMonth(stored, now);
    const t = tierIndexOf(m.pts);
    const nx = ROOM_TIERS[t + 1];
    return { month: m.key, pts: m.pts, tier: t >= 0 ? ROOM_TIERS[t].id : null, tierName: t >= 0 ? ROOM_TIERS[t].name : null, perks: t >= 0 ? ROOM_TIERS[t].perks : 0, next: nx ? { id: nx.id, name: nx.name, min: nx.min } : null };
}
