/** R67ae: أرقام الجوائز والمستويات اللي يعدّلها المالك من لوحة التحكم.
 * القيم الأصلية تنحفظ عند التشغيل، وأي تعديل يتحقق من حدود ثابتة قبل ما يتطبق. */
import { ROCKET_PLANETS, ROCKET_GRANT_GEMS_MAX } from './room-rocket-r58.js';
import { CANNON3_LEVELS } from './room-cannon-r59.js';
import { TRIBE_LEVELS } from './tribes-r58.js';
import { CP_LEVELS } from './cp-r58.js';
import { STREAK_LADDER } from './daily-streak-r62.js';
import { INVITE_REWARD } from './invite-rewards-r62.js';
import { ROOM_LEVELS } from './room-extras-r58.js';
import { ROOM_BG_LEVEL } from './social-room-controls-r27.js';

export type Tuning = {
  rocket: { goal: number; prizes: number[] }[];   // الجوائز بالجواهر داخليًا (تنعرض ×20 عملة)
  cannon: { goal: number; coins: number }[];
  tribe: { min: number; cap: number }[];
  cp: number[];
  streak: number[];
  invite: { inviter: number; invitee: number; games: number; monthlyCap: number };
  roomLevels: number[];
  roomBg: Record<string, number>;
};
const snapshot = (): Tuning => ({
  rocket: ROCKET_PLANETS.map((p) => ({ goal: p.goal, prizes: [...p.prizes] })),
  cannon: CANNON3_LEVELS.map((l) => ({ goal: l.goal, coins: l.coins })),
  tribe: TRIBE_LEVELS.map((l) => ({ min: l.min, cap: l.cap })),
  cp: [...CP_LEVELS],
  streak: STREAK_LADDER.map((x) => x.coins),
  invite: { inviter: INVITE_REWARD.inviter.coins, invitee: INVITE_REWARD.invitee.coins, games: INVITE_REWARD.games, monthlyCap: INVITE_REWARD.monthlyCap },
  roomLevels: [...ROOM_LEVELS],
  roomBg: { ...ROOM_BG_LEVEL },
});
export const TUNING_DEFAULT: Tuning = snapshot();
export const currentTuning = (): Tuning => snapshot();

class TErr extends Error {}
const int = (v: unknown, lo: number, hi: number, what: string) => { if (!Number.isSafeInteger(v) || (v as number) < lo || (v as number) > hi) throw new TErr(`${what}: لازم رقم صحيح من ${lo.toLocaleString('en-US')} إلى ${hi.toLocaleString('en-US')}.`); return v as number; };
const arr = (v: unknown, n: number, what: string) => { if (!Array.isArray(v) || v.length !== n) throw new TErr(`${what}: عدد القيم غير صحيح.`); return v as unknown[]; };
const rising = (l: number[], what: string) => { for (let i = 1; i < l.length; i++) if (l[i] <= l[i - 1]) throw new TErr(`${what}: كل مستوى لازم يكون أكبر من اللي قبله.`); };

/** يتحقق من تعديل جزئي ويرجع النسخة الكاملة الجديدة (ما يطبّق شي) */
export function validateTuning(input: unknown, base: Tuning): Tuning {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TErr('بيانات غير صالحة.');
  const x = input as Record<string, unknown>, out: Tuning = structuredClone(base);
  for (const k of Object.keys(x)) if (!(k in out)) throw new TErr('قسم غير معروف.');
  if (x.rocket !== undefined) out.rocket = arr(x.rocket, base.rocket.length, 'الصاروخ').map((r, i) => {
    const o = r as Record<string, unknown>; const goal = int(o?.goal, 1_000, 100_000_000, `هدف المرحلة ${i + 1}`);
    const prizes = arr(o?.prizes, 3, `جوائز المرحلة ${i + 1}`).map((p, j) => int(p, 0, ROCKET_GRANT_GEMS_MAX * 5, `جائزة المركز ${j + 1} بالمرحلة ${i + 1}`));
    if (prizes[0] < prizes[1] || prizes[1] < prizes[2]) throw new TErr(`جوائز المرحلة ${i + 1}: الأول أكبر أو يساوي الثاني، والثاني أكبر أو يساوي الثالث.`);
    return { goal, prizes };
  });
  if (x.cannon !== undefined) { out.cannon = arr(x.cannon, base.cannon.length, 'المدفع').map((c, i) => { const o = c as Record<string, unknown>; return { goal: int(o?.goal, 10_000, 1_000_000_000, `هدف مستوى المدفع ${i + 1}`), coins: int(o?.coins, 0, 10_000_000, `عملات مستوى المدفع ${i + 1}`) }; }); rising(out.cannon.map((c) => c.goal), 'أهداف المدفع'); }
  if (x.tribe !== undefined) { out.tribe = arr(x.tribe, base.tribe.length, 'القبائل').map((t, i) => { const o = t as Record<string, unknown>; return { min: i === 0 ? 0 : int(o?.min, 1, 10_000_000_000, `نقاط مستوى القبيلة ${i + 1}`), cap: int(o?.cap, 5, 500, `أعضاء مستوى القبيلة ${i + 1}`) }; }); rising(out.tribe.map((t) => t.min), 'مستويات القبائل'); for (let i = 1; i < out.tribe.length; i++) if (out.tribe[i].cap < out.tribe[i - 1].cap) throw new TErr('عدد أعضاء المستوى الأعلى ما يصير أقل من اللي قبله.'); }
  if (x.cp !== undefined) { out.cp = arr(x.cp, base.cp.length, 'CP').map((v, i) => i === 0 ? 0 : int(v, 1, 1_000_000_000, `نقاط مستوى CP ${i + 1}`)); rising(out.cp, 'مستويات CP'); }
  if (x.streak !== undefined) out.streak = arr(x.streak, base.streak.length, 'الدخول اليومي').map((v, i) => int(v, 0, 1_000_000, `هدية اليوم ${i + 1}`));
  if (x.invite !== undefined) { const o = x.invite as Record<string, unknown>; out.invite = { inviter: int(o?.inviter, 0, 1_000_000, 'مكافأة الداعي'), invitee: int(o?.invitee, 0, 1_000_000, 'هدية المدعو'), games: int(o?.games, 1, 50, 'عدد المباريات المطلوبة'), monthlyCap: int(o?.monthlyCap, 1, 500, 'أقصى دعوات بالشهر') }; }
  if (x.roomLevels !== undefined) { out.roomLevels = arr(x.roomLevels, base.roomLevels.length, 'مستويات الغرف').map((v, i) => i === 0 ? 0 : int(v, 1, 10_000_000_000, `دعم مستوى الغرفة ${i + 1}`)); rising(out.roomLevels, 'مستويات الغرف'); }
  if (x.roomBg !== undefined) { const o = x.roomBg as Record<string, unknown>; if (!o || typeof o !== 'object') throw new TErr('خلفيات الغرف غير صالحة.'); const next: Record<string, number> = {}; for (const k of Object.keys(base.roomBg)) next[k] = int(o[k], 1, base.roomLevels.length, `مستوى خلفية ${k}`); out.roomBg = next; }
  return out;
}
/** يطبّق نسخة كاملة صالحة على الأنظمة (يغيّر القيم بمكانها عشان كل مكان يستخدمها يشوف الجديد) */
export function applyTuning(t: Tuning): void {
  t.rocket.forEach((r, i) => { const p = ROCKET_PLANETS[i] as { goal: number; prizes: number[] }; p.goal = r.goal; p.prizes.splice(0, p.prizes.length, ...r.prizes); });
  t.cannon.forEach((c, i) => { const l = CANNON3_LEVELS[i] as { goal: number; coins: number }; l.goal = c.goal; l.coins = c.coins; });
  t.tribe.forEach((x, i) => { const l = TRIBE_LEVELS[i] as { min: number; cap: number }; l.min = x.min; l.cap = x.cap; });
  CP_LEVELS.splice(0, CP_LEVELS.length, ...t.cp);
  t.streak.forEach((c, i) => { (STREAK_LADDER[i] as { coins: number }).coins = c; });
  INVITE_REWARD.inviter.coins = t.invite.inviter; INVITE_REWARD.invitee.coins = t.invite.invitee; INVITE_REWARD.games = t.invite.games; INVITE_REWARD.monthlyCap = t.invite.monthlyCap;
  ROOM_LEVELS.splice(0, ROOM_LEVELS.length, ...t.roomLevels);
  for (const k of Object.keys(ROOM_BG_LEVEL)) delete ROOM_BG_LEVEL[k]; Object.assign(ROOM_BG_LEVEL, t.roomBg);
}
export const isTuningError = (e: unknown): e is Error => e instanceof TErr;
