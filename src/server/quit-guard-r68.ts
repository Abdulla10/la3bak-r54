/**
 * R68z28: عقوبة الخروج المتكرر من الألعاب.
 * لو اللاعب طلع من غرف ألعاب (مع لاعبين حقيقيين) أكثر من 3 مرات خلال دقيقة → ممنوع يدخل أي لعبة 5 دقايق.
 * غرف الكمبيوتر ما تنحسب. الحفظ بالذاكرة (يرجع صفر لو الخادم ريّست).
 */
export const QUIT_WINDOW_MS = 60_000;
export const QUIT_LIMIT = 3;        // أكثر من 3 = الرابعة توقفه
export const QUIT_BAN_MS = 5 * 60_000;

const exits = new Map<string, number[]>();
const bans = new Map<string, number>();

export function recordQuit(userId: string, now = Date.now()): { banned: boolean; until: number } {
  const list = (exits.get(userId) ?? []).filter((t) => now - t < QUIT_WINDOW_MS);
  list.push(now); exits.set(userId, list);
  if (list.length > QUIT_LIMIT) { const until = now + QUIT_BAN_MS; bans.set(userId, until); exits.delete(userId); return { banned: true, until }; }
  return { banned: false, until: 0 };
}
/** ترجع الوقت الباقي بالملي ثانية لو ممنوع، وإلا 0 */
export function quitBanLeft(userId: string, now = Date.now()): number {
  const u = bans.get(userId) ?? 0;
  if (u <= now) { if (u) bans.delete(userId); return 0; }
  return u - now;
}
export function quitBlock(userId: string, now = Date.now()) {
  const left = quitBanLeft(userId, now);
  if (!left) return null;
  const mins = Math.ceil(left / 60_000);
  return { ok: false as const, code: 'quit_ban', banLeft: left, error: `بسبب الخروج المتكرر، تم منعك من دخول الألعاب. (${mins} ${mins === 1 ? 'دقيقة' : 'دقايق'} متبقية)` };
}
export function clearQuitBan(userId: string) { bans.delete(userId); exits.delete(userId); }
// تنظيف دوري
setInterval(() => { const now = Date.now(); for (const [k, v] of bans) if (v <= now) bans.delete(k); for (const [k, v] of exits) if (!v.some((t) => now - t < QUIT_WINDOW_MS)) exits.delete(k); }, 120_000).unref?.();
