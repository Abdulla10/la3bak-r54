/** R58v: قائمة داعمي الغرفة — الأسبوع (يبدأ السبت بتوقيت الخليج) وكل الوقت.
 * اليوم من صاروخ الغرفة، والشهر من رتبة الغرفة الشهرية، فما نكرر نفس البيانات. القيم من إيصالات المحفظة فقط. */
export const SUPPORTERS_MAX = 200;
const GULF_OFFSET = 4 * 3600_000;
const DAY = 86_400_000;
/** مفتاح الأسبوع = تاريخ السبت اللي يبدأ فيه الأسبوع (YYYY-MM-DD) */
export function weekKeyOf(ms) {
    const g = ms + GULF_OFFSET;
    const d = new Date(g);
    const back = (d.getUTCDay() + 1) % 7; // السبت = 0
    const s = new Date(g - back * DAY);
    return `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, '0')}-${String(s.getUTCDate()).padStart(2, '0')}`;
}
export function currentWeek(stored, now) { const key = weekKeyOf(now); return stored && stored.key === key ? stored : { key, senders: {} }; }
const uuid = (x) => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const senders = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= SUPPORTERS_MAX && Object.entries(v).every(([id, n]) => uuid(id) && Number.isSafeInteger(n) && n > 0);
export function validRoomWeek(v) { return !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && typeof v.key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.key) && senders(v.senders); }
export const validAllSenders = senders;
/** يضيف قيمة للداعم؛ لو القائمة مليانة يطلع أقل واحد إذا الجديد أكبر منه (عشان الكبار ما ينحذفون). */
export function addSender(map, id, value) {
    const out = { ...map };
    const prev = out[id] ?? 0;
    const next = prev + value;
    if (!Number.isSafeInteger(next))
        return out;
    if (prev || Object.keys(out).length < SUPPORTERS_MAX) {
        out[id] = next;
        return out;
    }
    let low = null;
    for (const [k, v] of Object.entries(out))
        if (low === null || v < out[low])
            low = k;
    if (low !== null && out[low] < next) {
        delete out[low];
        out[id] = next;
    }
    return out;
}
export const topOf = (map, n = 20) => Object.entries(map ?? {}).sort((a, b) => b[1] - a[1]).slice(0, n);
