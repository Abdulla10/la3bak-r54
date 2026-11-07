import { councilSeatLayout, validLockedSeats } from './social-room-controls-r27.js';

/** Free capacity presets, not entitlements, prices or game-engine seats. */
export const ROOM_UPGRADE_PRESETS_R47 = Object.freeze([
  Object.freeze({ id: 'standard', label: 'الأساسية', seats: 4, maxMembers: 24 }),
  Object.freeze({ id: 'expanded', label: 'الموسعة', seats: 8, maxMembers: 36 }),
  Object.freeze({ id: 'grand', label: 'الكبرى', seats: 12, maxMembers: 50 }),
] as const);
export type RoomUpgradePresetR47 = typeof ROOM_UPGRADE_PRESETS_R47[number]['id'];
export type RoomUpgradeMetadataR47 = Readonly<{ v: 1; preset: RoomUpgradePresetR47; councilId: string }>;
export type RoomUpgradeMemberR47 = Readonly<{ id: string; councilId: string | null; seatIndex?: number }>;
export type RoomUpgradeCouncilR47 = Readonly<{ id: string; kind: 'public' | 'pair' | 'group' | 'private' | 'quiet'; seats: number; lockedSeats?: number[] }>;
export type RoomUpgradeRoomR47 = Readonly<{ id: string; ownerId: string; maxMembers: number; members: readonly RoomUpgradeMemberR47[]; councils: readonly RoomUpgradeCouncilR47[]; upgrade?: RoomUpgradeMetadataR47 }>;
/** Only construct from authoritative draft state, never request-supplied context/role/caps. */
export type RoomUpgradeContextR47 = Readonly<{ actorId: string; room: RoomUpgradeRoomR47; config: Readonly<{ maxCouncilSeats: number }>; gameBound: boolean }>;
export type RoomUpgradeInputR47 = Readonly<{ roomId: string; councilId: string; preset: RoomUpgradePresetR47 }>;
export type RoomUpgradeIntentR47 = Readonly<{
  roomId: string; councilId: string; preset: RoomUpgradePresetR47;
  from: Readonly<{ seats: number; maxMembers: number }>;
  to: Readonly<{ seats: number; maxMembers: number }>;
  upgrade: RoomUpgradeMetadataR47; changed: boolean;
}>;
export type RoomUpgradeFailureR47 = { ok: false; error: string; status: number };
export type RoomUpgradeResultR47 = { ok: true; intent: RoomUpgradeIntentR47 } | RoomUpgradeFailureR47;
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number => Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const ident = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\s\u0000-\u001f\u007f]/.test(v);
export const validRoomUpgradePresetR47 = (v: unknown): v is RoomUpgradePresetR47 => ROOM_UPGRADE_PRESETS_R47.some(p => p.id === v);
export function validRoomUpgradeMetadataR47(v: unknown): v is RoomUpgradeMetadataR47 {
  return obj(v) && Object.keys(v).length === 3 && Object.keys(v).every(k => ['v', 'preset', 'councilId'].includes(k)) && v.v === 1 && validRoomUpgradePresetR47(v.preset) && uuid(v.councilId);
}
/** Parent command() strips key/command before calling. No client prices, caps or role hints accepted. */
export function validRoomUpgradeInputR47(v: unknown): v is RoomUpgradeInputR47 {
  return obj(v) && Object.keys(v).length === 3 && Object.keys(v).every(k => ['roomId', 'councilId', 'preset'].includes(k)) && uuid(v.roomId) && uuid(v.councilId) && validRoomUpgradePresetR47(v.preset);
}
const denied = (error: string, status = 400): RoomUpgradeFailureR47 => ({ ok: false, error, status });
function validContext(ctx: RoomUpgradeContextR47): boolean {
  if (!obj(ctx) || !ident(ctx.actorId) || typeof ctx.gameBound !== 'boolean' || !obj(ctx.config) || !integer(ctx.config.maxCouncilSeats, 2, 12) || !obj(ctx.room)) return false;
  const r = ctx.room;
  if (!uuid(r.id) || !ident(r.ownerId) || !integer(r.maxMembers, 2, 50) || !Array.isArray(r.members) || r.members.length > r.maxMembers || !Array.isArray(r.councils) || r.councils.length > 50) return false;
  if (Object.hasOwn(r, 'upgrade') && !validRoomUpgradeMetadataR47(r.upgrade)) return false;
  const councilIds = new Set<string>();
  for (const c of r.councils) {
    if (!obj(c) || !uuid(c.id) || councilIds.has(c.id) || typeof c.kind !== 'string' || !['public', 'pair', 'group', 'private', 'quiet'].includes(c.kind) || !integer(c.seats, 2, 12) || c.kind === 'pair' && c.seats !== 2 || c.kind === 'group' && !integer(c.seats, 3, 5)) return false;
    councilIds.add(c.id);
  }
  const ids = new Set<string>();
  for (const m of r.members) {
    if (!obj(m) || !ident(m.id) || ids.has(m.id) || !(m.councilId === null || uuid(m.councilId) && councilIds.has(m.councilId)) || Object.hasOwn(m, 'seatIndex') && (m.councilId === null || !integer(m.seatIndex, 0, 11))) return false;
    ids.add(m.id);
  }
  return true;
}

/**
 * PURE planner: no writes, wallet access, clock, receipt store or async work.
 * Exactly one council and room.maxMembers are planned together. Parent MUST call
 * this inside existing SocialRooms.serial/tx and apply only to that draft, then
 * save both fields + metadata + existing durable receipt in the SAME commit.
 * Existing command receipts own retry/conflict semantics; changed=false is a
 * stable no-op for repeated selections, not an alternate idempotency store.
 */
export function planRoomUpgradeR47(ctx: RoomUpgradeContextR47, input: unknown): RoomUpgradeResultR47 {
  if (!validRoomUpgradeInputR47(input)) return denied('invalid_room_upgrade');
  if (!validContext(ctx)) return denied('room_upgrade_invalid_state', 409);
  const r = ctx.room;
  if (input.roomId !== r.id) return denied('room_not_found', 404);
  if (ctx.actorId !== r.ownerId) return denied('owner_required', 403);
  if (ctx.gameBound) return denied('game_room_upgrade_unavailable', 403);
  const c = r.councils.find(c => c.id === input.councilId);
  if (!c) return denied('council_not_found', 404);
  if (c.kind === 'pair') return denied('pair_room_upgrade_unavailable', 403);
  const preset = ROOM_UPGRADE_PRESETS_R47.find(p => p.id === input.preset)!;
  if (preset.seats > ctx.config.maxCouncilSeats) return denied('room_upgrade_platform_cap', 409);
  if (c.kind === 'group' && preset.seats > 5) return denied('room_upgrade_group_cap', 409);
  if (preset.maxMembers < r.members.length) return denied('room_upgrade_members_occupied', 409);
  const members = r.members.filter(m => m.councilId === c.id);
  // Use the existing explicit-index/legacy layout: never compact or discard seats.
  const layout = councilSeatLayout(c as { seats: number; lockedSeats?: number[] }, [...members]);
  if (!layout) return denied('room_upgrade_invalid_state', 409);
  if ([...layout.values()].some(index => index >= preset.seats)) return denied('seats_occupied', 409);
  // Existing vacant locks are preserved, not silently dropped by a smaller preset.
  if (!validLockedSeats(c.lockedSeats ?? [], preset.seats, true)) return denied('invalid_locked_seats');
  const upgrade = Object.freeze({ v: 1 as const, preset: preset.id, councilId: c.id });
  return { ok: true, intent: Object.freeze({
    roomId: r.id, councilId: c.id, preset: preset.id,
    from: Object.freeze({ seats: c.seats, maxMembers: r.maxMembers }),
    to: Object.freeze({ seats: preset.seats, maxMembers: preset.maxMembers }), upgrade,
    changed: c.seats !== preset.seats || r.maxMembers !== preset.maxMembers || r.upgrade?.preset !== preset.id || r.upgrade?.councilId !== c.id,
  }) };
}

export const ROOM_UPGRADE_ERRORS_R47: Readonly<Record<string, string>> = Object.freeze({
  invalid_room_upgrade: 'اختر حزمة صالحة للمجلس الحالي فقط.',
  room_upgrade_invalid_state: 'تعذر التحقق من حالة السعة. حدّث حالة الغرفة أولًا.',
  room_not_found: 'الغرفة غير متاحة.', council_not_found: 'المجلس غير متاح.',
  owner_required: 'تطبيق الحزمة متاح لمالك الغرفة فقط، وليس للمشرف أو مضيف المجلس.',
  game_room_upgrade_unavailable: 'لا تتاح حزم السعة للغرف المرتبطة بلعبة.',
  pair_room_upgrade_unavailable: 'المجلس الثنائي يبقى بمقعدين ولا يقبل هذه الحزم.',
  room_upgrade_platform_cap: 'عدد مقاعد الحزمة يتجاوز حد المنصة الحالي.',
  room_upgrade_group_cap: 'المجموعة الصغيرة لا تتجاوز 5 مقاعد؛ اختر الحزمة الأساسية.',
  room_upgrade_members_occupied: 'عدد أعضاء الغرفة الحالي أكبر من سعة هذه الحزمة.',
  seats_occupied: 'يوجد عضو في موضع مقعد خارج سعة الحزمة. لا ننقل الأعضاء تلقائيًا.',
  invalid_locked_seats: 'يوجد قفل مقعد خارج سعة الحزمة. أزل القفل أولًا من إعدادات المقاعد.',
});

/** Privacy-safe view; actual server fields always beat a previous selected label. */
export function projectRoomUpgradeR47(ctx: RoomUpgradeContextR47, councilId: string) {
  if (!validContext(ctx)) return null;
  const r = ctx.room, c = r.councils.find(c => c.id === councilId);
  if (!c) return null;
  const selected = r.upgrade?.councilId === c.id ? r.upgrade.preset : null;
  const activePreset = ROOM_UPGRADE_PRESETS_R47.find(p => p.seats === c.seats && p.maxMembers === r.maxMembers)?.id ?? null;
  const options = ROOM_UPGRADE_PRESETS_R47.map(p => {
    const result = planRoomUpgradeR47(ctx, { roomId: r.id, councilId: c.id, preset: p.id });
    return { ...p, available: result.ok, current: selected === p.id && activePreset === p.id,
      error: result.ok ? null : result.error, message: result.ok ? '' : ROOM_UPGRADE_ERRORS_R47[result.error] ?? 'الحزمة غير متاحة.' };
  });
  return {
    roomId: r.id, councilId: c.id, selected, activePreset, seats: c.seats, maxMembers: r.maxMembers,
    memberCount: r.members.length, councilCount: r.members.filter(m => m.councilId === c.id).length,
    maxCouncilSeats: ctx.config.maxCouncilSeats, kind: c.kind, free: true as const,
    canApply: ctx.actorId === r.ownerId && options.some(p => p.available), options,
  };
}
export type RoomUpgradeViewR47 = NonNullable<ReturnType<typeof projectRoomUpgradeR47>>;
