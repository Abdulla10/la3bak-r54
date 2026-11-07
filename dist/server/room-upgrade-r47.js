import { councilSeatLayout, validLockedSeats } from './social-room-controls-r27.js';
/** Free capacity presets, not entitlements, prices or game-engine seats. */
export const ROOM_UPGRADE_PRESETS_R47 = Object.freeze([
    Object.freeze({ id: 'standard', label: 'الأساسية', seats: 4, maxMembers: 24 }),
    Object.freeze({ id: 'expanded', label: 'الموسعة', seats: 8, maxMembers: 36 }),
    Object.freeze({ id: 'grand', label: 'الكبرى', seats: 12, maxMembers: 50 }),
]);
const obj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
const uuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const ident = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\s\u0000-\u001f\u007f]/.test(v);
export const validRoomUpgradePresetR47 = (v) => ROOM_UPGRADE_PRESETS_R47.some(p => p.id === v);
export function validRoomUpgradeMetadataR47(v) {
    return obj(v) && Object.keys(v).length === 3 && Object.keys(v).every(k => ['v', 'preset', 'councilId'].includes(k)) && v.v === 1 && validRoomUpgradePresetR47(v.preset) && uuid(v.councilId);
}
/** Parent command() strips key/command before calling. No client prices, caps or role hints accepted. */
export function validRoomUpgradeInputR47(v) {
    return obj(v) && Object.keys(v).length === 3 && Object.keys(v).every(k => ['roomId', 'councilId', 'preset'].includes(k)) && uuid(v.roomId) && uuid(v.councilId) && validRoomUpgradePresetR47(v.preset);
}
const denied = (error, status = 400) => ({ ok: false, error, status });
function validContext(ctx) {
    if (!obj(ctx) || !ident(ctx.actorId) || typeof ctx.gameBound !== 'boolean' || !obj(ctx.config) || !integer(ctx.config.maxCouncilSeats, 2, 12) || !obj(ctx.room))
        return false;
    const r = ctx.room;
    if (!uuid(r.id) || !ident(r.ownerId) || !integer(r.maxMembers, 2, 50) || !Array.isArray(r.members) || r.members.length > r.maxMembers || !Array.isArray(r.councils) || r.councils.length > 50)
        return false;
    if (Object.hasOwn(r, 'upgrade') && !validRoomUpgradeMetadataR47(r.upgrade))
        return false;
    const councilIds = new Set();
    for (const c of r.councils) {
        if (!obj(c) || !uuid(c.id) || councilIds.has(c.id) || typeof c.kind !== 'string' || !['public', 'pair', 'group', 'private', 'quiet'].includes(c.kind) || !integer(c.seats, 2, 12) || c.kind === 'pair' && c.seats !== 2 || c.kind === 'group' && !integer(c.seats, 3, 5))
            return false;
        councilIds.add(c.id);
    }
    const ids = new Set();
    for (const m of r.members) {
        if (!obj(m) || !ident(m.id) || ids.has(m.id) || !(m.councilId === null || uuid(m.councilId) && councilIds.has(m.councilId)) || Object.hasOwn(m, 'seatIndex') && (m.councilId === null || !integer(m.seatIndex, 0, 11)))
            return false;
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
export function planRoomUpgradeR47(ctx, input) {
    if (!validRoomUpgradeInputR47(input))
        return denied('invalid_room_upgrade');
    if (!validContext(ctx))
        return denied('room_upgrade_invalid_state', 409);
    const r = ctx.room;
    if (input.roomId !== r.id)
        return denied('room_not_found', 404);
    if (ctx.actorId !== r.ownerId)
        return denied('owner_required', 403);
    if (ctx.gameBound)
        return denied('game_room_upgrade_unavailable', 403);
    const c = r.councils.find(c => c.id === input.councilId);
    if (!c)
        return denied('council_not_found', 404);
    if (c.kind === 'pair')
        return denied('pair_room_upgrade_unavailable', 403);
    const preset = ROOM_UPGRADE_PRESETS_R47.find(p => p.id === input.preset);
    if (preset.seats > ctx.config.maxCouncilSeats)
        return denied('room_upgrade_platform_cap', 409);
    if (c.kind === 'group' && preset.seats > 5)
        return denied('room_upgrade_group_cap', 409);
    if (preset.maxMembers < r.members.length)
        return denied('room_upgrade_members_occupied', 409);
    const members = r.members.filter(m => m.councilId === c.id);
    // Use the existing explicit-index/legacy layout: never compact or discard seats.
    const layout = councilSeatLayout(c, [...members]);
    if (!layout)
        return denied('room_upgrade_invalid_state', 409);
    if ([...layout.values()].some(index => index >= preset.seats))
        return denied('seats_occupied', 409);
    // Existing vacant locks are preserved, not silently dropped by a smaller preset.
    if (!validLockedSeats(c.lockedSeats ?? [], preset.seats, true))
        return denied('invalid_locked_seats');
    const upgrade = Object.freeze({ v: 1, preset: preset.id, councilId: c.id });
    return { ok: true, intent: Object.freeze({
            roomId: r.id, councilId: c.id, preset: preset.id,
            from: Object.freeze({ seats: c.seats, maxMembers: r.maxMembers }),
            to: Object.freeze({ seats: preset.seats, maxMembers: preset.maxMembers }), upgrade,
            changed: c.seats !== preset.seats || r.maxMembers !== preset.maxMembers || r.upgrade?.preset !== preset.id || r.upgrade?.councilId !== c.id,
        }) };
}
export const ROOM_UPGRADE_ERRORS_R47 = Object.freeze({
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
export function projectRoomUpgradeR47(ctx, councilId) {
    if (!validContext(ctx))
        return null;
    const r = ctx.room, c = r.councils.find(c => c.id === councilId);
    if (!c)
        return null;
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
        maxCouncilSeats: ctx.config.maxCouncilSeats, kind: c.kind, free: true,
        canApply: ctx.actorId === r.ownerId && options.some(p => p.available), options,
    };
}
