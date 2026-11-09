/** R67ae: أرقام الجوائز والمستويات اللي يعدّلها المالك من لوحة التحكم.
 * القيم الأصلية تنحفظ عند التشغيل، وأي تعديل يتحقق من حدود ثابتة قبل ما يتطبق. */
import { ROCKET_PLANETS, ROCKET_GRANT_GEMS_MAX } from './room-rocket-r58.js';
import { CANNON3_LEVELS } from './room-cannon-r59.js';
import { TRIBE_LEVELS } from './tribes-r58.js';
import { CP_LEVELS } from './cp-r58.js';
import { STREAK_LADDER } from './daily-streak-r62.js';
import { INVITE_REWARD } from './invite-rewards-r62.js';
import { ROOM_CURVE, setRoomCurve } from './room-extras-r58.js';
import { ROOM_BG_LEVEL } from './social-room-controls-r27.js';
import { BROADCAST_PRICES } from './broadcast-r67.js';
const snapshot = () => ({
    rocket: ROCKET_PLANETS.map((p) => ({ goal: p.goal, prizes: [...p.prizes] })),
    cannon: CANNON3_LEVELS.map((l) => ({ goal: l.goal, coins: l.coins })),
    tribe: TRIBE_LEVELS.map((l) => ({ min: l.min, cap: l.cap })),
    cp: [...CP_LEVELS],
    streak: STREAK_LADDER.map((x) => x.coins),
    invite: { inviter: INVITE_REWARD.inviter.coins, invitee: INVITE_REWARD.invitee.coins, games: INVITE_REWARD.games, monthlyCap: INVITE_REWARD.monthlyCap },
    roomCurve: { ...ROOM_CURVE },
    roomBg: { ...ROOM_BG_LEVEL },
    broadcast: { ...BROADCAST_PRICES },
});
export const TUNING_DEFAULT = snapshot();
export const currentTuning = () => snapshot();
class TErr extends Error {
}
const int = (v, lo, hi, what) => { if (!Number.isSafeInteger(v) || v < lo || v > hi)
    throw new TErr(`${what}: لازم رقم صحيح من ${lo.toLocaleString('en-US')} إلى ${hi.toLocaleString('en-US')}.`); return v; };
const arr = (v, n, what) => { if (!Array.isArray(v) || v.length !== n)
    throw new TErr(`${what}: عدد القيم غير صحيح.`); return v; };
const rising = (l, what) => { for (let i = 1; i < l.length; i++)
    if (l[i] <= l[i - 1])
        throw new TErr(`${what}: كل مستوى لازم يكون أكبر من اللي قبله.`); };
/** يتحقق من تعديل جزئي ويرجع النسخة الكاملة الجديدة (ما يطبّق شي) */
export function validateTuning(input, base) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new TErr('بيانات غير صالحة.');
    const x = input, out = structuredClone(base);
    for (const k of Object.keys(x))
        if (k !== 'roomLevels' && !(k in out))
            throw new TErr('قسم غير معروف.');
    if (x.rocket !== undefined)
        out.rocket = arr(x.rocket, base.rocket.length, 'الصاروخ').map((r, i) => {
            const o = r;
            const goal = int(o?.goal, 1_000, 100_000_000, `هدف المرحلة ${i + 1}`);
            const prizes = arr(o?.prizes, 3, `جوائز المرحلة ${i + 1}`).map((p, j) => int(p, 0, ROCKET_GRANT_GEMS_MAX * 5, `جائزة المركز ${j + 1} بالمرحلة ${i + 1}`));
            if (prizes[0] < prizes[1] || prizes[1] < prizes[2])
                throw new TErr(`جوائز المرحلة ${i + 1}: الأول أكبر أو يساوي الثاني، والثاني أكبر أو يساوي الثالث.`);
            return { goal, prizes };
        });
    if (x.cannon !== undefined) {
        out.cannon = arr(x.cannon, base.cannon.length, 'المدفع').map((c, i) => { const o = c; return { goal: int(o?.goal, 10_000, 1_000_000_000, `هدف مستوى المدفع ${i + 1}`), coins: int(o?.coins, 0, 10_000_000, `عملات مستوى المدفع ${i + 1}`) }; });
        rising(out.cannon.map((c) => c.goal), 'أهداف المدفع');
    }
    if (x.tribe !== undefined) {
        out.tribe = arr(x.tribe, base.tribe.length, 'القبائل').map((t, i) => { const o = t; return { min: i === 0 ? 0 : int(o?.min, 1, 10_000_000_000, `نقاط مستوى القبيلة ${i + 1}`), cap: int(o?.cap, 5, 500, `أعضاء مستوى القبيلة ${i + 1}`) }; });
        rising(out.tribe.map((t) => t.min), 'مستويات القبائل');
        for (let i = 1; i < out.tribe.length; i++)
            if (out.tribe[i].cap < out.tribe[i - 1].cap)
                throw new TErr('عدد أعضاء المستوى الأعلى ما يصير أقل من اللي قبله.');
    }
    if (x.cp !== undefined) {
        out.cp = arr(x.cp, base.cp.length, 'CP').map((v, i) => i === 0 ? 0 : int(v, 1, 1_000_000_000, `نقاط مستوى CP ${i + 1}`));
        rising(out.cp, 'مستويات CP');
    }
    if (x.streak !== undefined)
        out.streak = arr(x.streak, base.streak.length, 'الدخول اليومي').map((v, i) => int(v, 0, 1_000_000, `هدية اليوم ${i + 1}`));
    if (x.invite !== undefined) {
        const o = x.invite;
        out.invite = { inviter: int(o?.inviter, 0, 1_000_000, 'مكافأة الداعي'), invitee: int(o?.invitee, 0, 1_000_000, 'هدية المدعو'), games: int(o?.games, 1, 50, 'عدد المباريات المطلوبة'), monthlyCap: int(o?.monthlyCap, 1, 500, 'أقصى دعوات بالشهر') };
    }
    if (x.roomCurve !== undefined) {
        const o = x.roomCurve;
        out.roomCurve = { l2: int(o?.l2, 1_000, 100_000_000, 'Lv2'), l10: int(o?.l10, 2_000, 1_000_000_000, 'Lv10'), l50: int(o?.l50, 3_000, 10_000_000_000, 'Lv50'), l100: int(o?.l100, 4_000, 50_000_000_000, 'Lv100'), l300: int(o?.l300, 5_000, 500_000_000_000, 'Lv300') };
        rising([out.roomCurve.l2, out.roomCurve.l10, out.roomCurve.l50, out.roomCurve.l100, out.roomCurve.l300], 'مستويات الغرف');
    }
    if (x.roomBg !== undefined) {
        const o = x.roomBg;
        if (!o || typeof o !== 'object')
            throw new TErr('خلفيات الغرف غير صالحة.');
        const next = {};
        for (const k of Object.keys(base.roomBg))
            next[k] = int(o[k], 1, 300, `مستوى خلفية ${k}`);
        out.roomBg = next;
    }
    if (x.broadcast !== undefined) {
        const o = x.broadcast;
        out.broadcast = { normal: int(o?.normal, 100, 10_000_000, 'سعر البرقية العادية'), gold: int(o?.gold, 100, 10_000_000, 'سعر البرقية الذهبية'), full: int(o?.full, 100, 10_000_000, 'سعر برقية الشاشة الكاملة') };
        if (!(out.broadcast.normal <= out.broadcast.gold && out.broadcast.gold <= out.broadcast.full))
            throw new TErr('أسعار البرقية: العادية ≤ الذهبية ≤ الشاشة الكاملة.');
    }
    return out;
}
/** يطبّق نسخة كاملة صالحة على الأنظمة (يغيّر القيم بمكانها عشان كل مكان يستخدمها يشوف الجديد) */
export function applyTuning(t) {
    t.rocket.forEach((r, i) => { const p = ROCKET_PLANETS[i]; p.goal = r.goal; p.prizes.splice(0, p.prizes.length, ...r.prizes); });
    t.cannon.forEach((c, i) => { const l = CANNON3_LEVELS[i]; l.goal = c.goal; l.coins = c.coins; });
    t.tribe.forEach((x, i) => { const l = TRIBE_LEVELS[i]; l.min = x.min; l.cap = x.cap; });
    CP_LEVELS.splice(0, CP_LEVELS.length, ...t.cp);
    t.streak.forEach((c, i) => { STREAK_LADDER[i].coins = c; });
    INVITE_REWARD.inviter.coins = t.invite.inviter;
    INVITE_REWARD.invitee.coins = t.invite.invitee;
    INVITE_REWARD.games = t.invite.games;
    INVITE_REWARD.monthlyCap = t.invite.monthlyCap;
    setRoomCurve(t.roomCurve);
    for (const k of Object.keys(ROOM_BG_LEVEL))
        delete ROOM_BG_LEVEL[k];
    Object.assign(ROOM_BG_LEVEL, t.roomBg);
    Object.assign(BROADCAST_PRICES, t.broadcast);
}
export const isTuningError = (e) => e instanceof TErr;
