import { createHash } from 'node:crypto';

/** R59: مدفع الغرفة الجديد (طلب المالك، فيديو RPReplay_Final1793818358).
 * - 3 مستويات: الأخضر LV1 ← الأحمر LV2 ← البنفسجي LV3. الهدف لكل مستوى (مو تراكمي).
 * - يتعبّى بنفس قيمة هدايا الغرفة (إيصال المحفظة)، 1 جوهرة = 1 طاقة.
 * - لما يكتمل المستوى ينفجر تلقائي: أكثر 3 ساهموا فيه («اللي فجروه») ياخذون نفس الجوايز بالضبط،
 *   والأول ياخذ فوقها قطعة «للأول بس». الفائض ينتقل للمستوى اللي بعده، وبعد LV3 تبدأ جولة جديدة من LV1.
 * - المنح عبر wallet.grantCampaignBatch بمعرّف ثابت لكل (غرفة، جولة، مستوى، نوع) فما يتكرر أبدًا. */
export type CannonPrize = { id: string; name: string; slot: 'frame' | 'mic-frame' | 'badge' };
const P = (id: string, name: string, slot: CannonPrize['slot']): CannonPrize => ({ id, name, slot });
export const CANNON3_LEVELS = Object.freeze([
  Object.freeze({ level: 1, color: 'green', goal: 816_700, coins: 30_000, top1: P('art-mf-58', 'إطار مايك سفينة البحّار', 'mic-frame'), items: [P('art-f2-17', 'إطار أجنحة البنفسج', 'frame'), P('badge-falcon', 'شارة صقر', 'badge')] }),
  Object.freeze({ level: 2, color: 'red', goal: 4_500_000, coins: 100_000, top1: P('art-mf-45', 'إطار مايك أجنحة الذهب الملكية', 'mic-frame'), items: [P('art-mf-46', 'إطار مايك تنين الحمم', 'mic-frame'), P('art-f2-09', 'إطار غيوم الفضة', 'frame'), P('badge2-crown', 'شارة تاج', 'badge')] }),
  Object.freeze({ level: 3, color: 'purple', goal: 14_000_000, coins: 300_000, top1: P('art-mf-43', 'إطار مايك مدار الكواكب', 'mic-frame'), items: [P('art-f2-15', 'إطار تنين الظلام', 'frame'), P('art-mf-38', 'إطار مايك هالة الملاك', 'mic-frame'), P('art-b-20', 'شارة تنين الكون', 'badge')] }),
]);
export const CANNON3_WINNERS = 3;
export const CANNON3_SENDERS_MAX = 200;
export const CANNON3_HISTORY_MAX = 12;
export type Cannon3Blast = { round: number; level: number; at: number; status: 'pending' | 'done'; winners: { id: string; pts: number }[] };
export type RoomCannon3 = { round: number; level: number; pts: number; senders: Record<string, number>; blasts: Cannon3Blast[] };
export const newCannon3 = (): RoomCannon3 => ({ round: 1, level: 1, pts: 0, senders: {}, blasts: [] });
const uuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
export function validRoomCannon3(v: any): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== 5) return false;
  if (!Number.isSafeInteger(v.round) || v.round < 1 || !Number.isSafeInteger(v.level) || v.level < 1 || v.level > CANNON3_LEVELS.length || !nat(v.pts) || v.pts >= CANNON3_LEVELS[v.level - 1].goal) return false;
  if (!v.senders || typeof v.senders !== 'object' || Array.isArray(v.senders)) return false;
  const s = Object.entries(v.senders); if (s.length > CANNON3_SENDERS_MAX || !s.every(([id, n]) => uuid(id) && Number.isSafeInteger(n) && (n as number) > 0)) return false;
  if (!Array.isArray(v.blasts) || v.blasts.length > CANNON3_HISTORY_MAX) return false;
  return v.blasts.every((b: any) => b && typeof b === 'object' && Object.keys(b).length === 5 && Number.isSafeInteger(b.round) && b.round >= 1 && Number.isSafeInteger(b.level) && b.level >= 1 && b.level <= CANNON3_LEVELS.length
    && nat(b.at) && ['pending', 'done'].includes(b.status) && Array.isArray(b.winners) && b.winners.length >= 1 && b.winners.length <= CANNON3_WINNERS
    && b.winners.every((w: any) => w && Object.keys(w).length === 2 && uuid(w.id) && Number.isSafeInteger(w.pts) && w.pts > 0) && new Set(b.winners.map((w: any) => w.id)).size === b.winners.length);
}
export const cannon3Top = (senders: Record<string, number>, n = CANNON3_WINNERS) => Object.entries(senders).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([id, pts]) => ({ id, pts }));
/** يضيف دعم ويرجع المدفع الجديد (نسخة) مع أي انفجارات صارت. الفائض ينحسب لنفس المرسل بالمستوى اللي بعده. */
export function cannon3Add(c: RoomCannon3, sender: string, value: number, now: number): RoomCannon3 {
  const out: RoomCannon3 = structuredClone(c); let left = value;
  while (left > 0) {
    const goal = CANNON3_LEVELS[out.level - 1].goal, take = Math.min(left, goal - out.pts);
    out.pts += take; left -= take;
    const prev = out.senders[sender] ?? 0; if (prev || Object.keys(out.senders).length < CANNON3_SENDERS_MAX) out.senders[sender] = prev + take;
    if (out.pts < goal) break;
    out.blasts.push({ round: out.round, level: out.level, at: now, status: 'pending', winners: cannon3Top(out.senders) });
    if (out.blasts.length > CANNON3_HISTORY_MAX) { const i = out.blasts.findIndex((b) => b.status === 'done'); if (i >= 0) out.blasts.splice(i, 1); else break; }
    out.pts = 0; out.senders = {};
    if (out.level < CANNON3_LEVELS.length) out.level += 1; else { out.level = 1; out.round += 1; }
  }
  return out;
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const asUuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
export type Cannon3Grant = { kind: 'all' | 'top1'; ids: string[]; coins: number; itemIds: string[]; reason: string };
/** نفس الجوايز للثلاثة، وقطعة «للأول بس» للأول */
export function cannon3Grants(b: Cannon3Blast): Cannon3Grant[] {
  const L = CANNON3_LEVELS[b.level - 1];
  return [
    { kind: 'all', ids: b.winners.map((w) => w.id), coins: L.coins, itemIds: L.items.map((i) => i.id), reason: `مدفع الغرفة: انفجار المستوى ${b.level}` },
    { kind: 'top1', ids: [b.winners[0].id], coins: 0, itemIds: [L.top1.id], reason: `مدفع الغرفة: المستوى ${b.level} — للأول بس` },
  ];
}
export const cannon3CampaignId = (roomId: string, b: Pick<Cannon3Blast, 'round' | 'level'>, kind: string) => asUuid(hash(['room-cannon-r59', roomId, b.round, b.level, kind]));
export const cannon3Fingerprint = (roomId: string, b: Cannon3Blast, g: Cannon3Grant) => hash({ v: 'room-cannon-r59', roomId, round: b.round, level: b.level, kind: g.kind, ids: g.ids, coins: g.coins, itemIds: g.itemIds });
export function cannon3Art(id: string): string {
  const m = /^(art-mf|art-f2|art-b)-(\d\d)$/.exec(id);
  if (m) return ({ 'art-mf': `/assets/art58/mic/m${m[2]}.webp`, 'art-f2': `/assets/art58/frames2/f${m[2]}.webp`, 'art-b': `/assets/art58/badges/b${m[2]}.webp` } as Record<string, string>)[m[1]];
  return '';
}
