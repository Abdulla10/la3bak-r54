import { createHash } from 'node:crypto';

/** R58u: صاروخ الغرفة اليومي.
 * - يتعبّى بنفس قيمة الهدايا اللي ترفع ليفل الغرفة (من إيصال المحفظة، مو من المتصفح).
 * - 3 مراحل باليوم (توقيت الخليج)، الفائض ينتقل للمرحلة اللي بعدها، ويرجع صفر كل يوم.
 * - لما تكتمل مرحلة ينطلق الصاروخ: كل الموجودين بالغرفة (حتى 25) ياخذون عملات، وأكبر داعم باليوم ياخذ مكافأة إضافية.
 * - المنح عبر wallet.grantCampaignBatch بمعرّف ثابت لكل (غرفة، يوم، مرحلة) فما يتكرر أبدًا. */
export const ROCKET_STAGES = Object.freeze([
  Object.freeze({ stage: 1, goal: 50_000, coins: 200, topBonus: 1_000 }),
  Object.freeze({ stage: 2, goal: 150_000, coins: 500, topBonus: 3_000 }),
  Object.freeze({ stage: 3, goal: 400_000, coins: 1_500, topBonus: 10_000 }),
]);
export const ROCKET_SENDERS_MAX = 200;
export const ROCKET_RECIPIENTS_MAX = 25;
export type RocketLaunch = { stage: number; at: number; status: 'pending' | 'done'; recipients: string[]; top: string | null };
export type RoomRocket = { day: string; pts: number; senders: Record<string, number>; launches: RocketLaunch[] };
const GULF_OFFSET = 4 * 3600_000;
const uuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
export function rocketDayOf(ms: number): string { const d = new Date(ms + GULF_OFFSET); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }
export function currentRocket(stored: RoomRocket | undefined, now: number): RoomRocket {
  const day = rocketDayOf(now);
  return stored && stored.day === day ? stored : { day, pts: 0, senders: {}, launches: [] };
}
/** حدود المراحل التراكمية: 50 ألف، 200 ألف، 600 ألف */
export function rocketBoundaries(): number[] { let b = 0; return ROCKET_STAGES.map((s) => (b += s.goal)); }
export function validRoomRocket(v: any): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if (Object.keys(v).some((k) => !['day', 'pts', 'senders', 'launches'].includes(k))) return false;
  if (typeof v.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.day) || !nat(v.pts)) return false;
  if (!v.senders || typeof v.senders !== 'object' || Array.isArray(v.senders)) return false;
  const s = Object.entries(v.senders); if (s.length > ROCKET_SENDERS_MAX || !s.every(([id, n]) => uuid(id) && Number.isSafeInteger(n) && (n as number) > 0)) return false;
  if (!Array.isArray(v.launches) || v.launches.length > ROCKET_STAGES.length) return false;
  const bounds = rocketBoundaries();
  return v.launches.every((l: any, i: number) => l && typeof l === 'object' && Object.keys(l).length === 5 && l.stage === i + 1 && nat(l.at) && ['pending', 'done'].includes(l.status)
    && Array.isArray(l.recipients) && l.recipients.length <= ROCKET_RECIPIENTS_MAX && l.recipients.every(uuid) && new Set(l.recipients).size === l.recipients.length
    && (l.top === null || uuid(l.top)) && v.pts >= bounds[i]);
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const asUuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
export function rocketCampaignId(roomId: string, day: string, stage: number, kind: 'crowd' | 'top'): string { return asUuid(hash(['room-rocket-r58', roomId, day, stage, kind])); }
export function rocketFingerprint(roomId: string, day: string, l: RocketLaunch, kind: 'crowd' | 'top'): string {
  const st = ROCKET_STAGES[l.stage - 1];
  return hash({ v: 'room-rocket-r58', roomId, day, stage: l.stage, kind, ids: kind === 'crowd' ? l.recipients : [l.top], coins: kind === 'crowd' ? st.coins : st.topBonus });
}
export function rocketReason(stage: number, kind: 'crowd' | 'top'): string { return kind === 'crowd' ? `صاروخ الغرفة: المرحلة ${stage}` : `صاروخ الغرفة: أكبر داعم بالمرحلة ${stage}`; }
export function topSender(r: RoomRocket): string | null { let best: string | null = null, n = 0; for (const [id, v] of Object.entries(r.senders)) if (v > n) { best = id; n = v; } return best; }
