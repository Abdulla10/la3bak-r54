export const SOCIAL_MODE_IDS = ['table', 'anonymous', 'topics', 'understand', 'quiet', 'hotseat', 'draw-story', 'word-guess', 'memory-challenge'];
export function socialText(value, max = 500) {
    if (typeof value !== 'string')
        return null;
    const s = value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim();
    if (!s || s.length > max)
        return null;
    // Conservative guard against obvious contact/credential disclosure. User reports and moderation remain essential.
    if (/(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){8,}|\b(?:password|passwd|api[_ -]?key)\s*[:=])/i.test(s))
        return null;
    return s;
}
export function socialAllowed(ctx, id) {
    const s = ctx.content.settings[id];
    if (!s?.enabled)
        return { ok: false, error: 'هالنمط مقفل من الإدارة.' };
    if (!ctx.members.includes(ctx.actorId))
        return { ok: false, error: 'لازم تكون داخل المجلس.' };
    if (!s.allowParticipation && !ctx.moderator)
        return { ok: false, error: 'المشاركة مقفلة في هالنمط.' };
    if (!ctx.canWrite)
        return { ok: false, error: 'المشاركة موقوفة مؤقتًا.' };
    return null;
}
export function socialCards(ctx, id, category) {
    const settings = ctx.content.settings[id];
    return ctx.content.cards.filter(c => c.enabled && c.mode === id && settings.categories.includes(c.category) && (typeof category !== 'string' || c.category === category));
}
export function socialPublicCard(card) { return card ? { id: card.id, category: card.category, text: card.text, ...(card.options ? { options: [...card.options] } : {}) } : null; }
// R47 games reuse council transactions/receipts. No economic fields or secondary store.
export const SOCIAL_GAME_IDS = ['draw-story', 'word-guess', 'memory-challenge'];
export const gameFailR47 = (error) => ({ ok: false, error });
export const gameIdR47 = (x) => typeof x === 'string' && x.length > 0 && x.length <= 128 && !/[\s\u0000-\u001f\u007f-\u009f]/u.test(x);
export const gameTimeR47 = (x) => Number.isSafeInteger(x) && Number(x) >= 0;
export const gameActiveR47 = (s) => !['lobby', 'finished', 'cancelled'].includes(s.phase);
export const gameInitialR47 = () => ({ participants: [], version: 0, sessionId: null, phase: 'lobby', deadline: null, round: 0 });
export function gameNewSessionR47(ctx) { try {
    const id = ctx.newId();
    return gameIdR47(id) ? id : null;
}
catch {
    return null;
} }
export function gameVisibleR47(id, ctx) { return !!ctx.content.settings[id]?.enabled && ctx.members.includes(ctx.actorId); }
export function gamePermissionsR47(s, ctx, id) {
    const allowed = !socialAllowed(ctx, id), active = gameActiveR47(s), joined = s.participants.includes(ctx.actorId);
    return { participate: allowed && !active && !joined && s.participants.length < 6, withdraw: joined,
        start: allowed && ctx.moderator && !active && s.participants.filter(p => ctx.members.includes(p)).length >= 2,
        cancel: allowed && ctx.moderator && active, tick: allowed && active,
        act: allowed && joined && active && s.deadline !== null && ctx.now < s.deadline };
}
/** Rejected commands leave nested state untouched; request replay belongs to existing durable receipts. */
export function gameApplyR47(state, action, ctx, id, fields, run) {
    if (!action || typeof action.type !== 'string' || !Object.hasOwn(fields, action.type) || Object.keys(action).some(k => !['type', 'version', ...fields[action.type]].includes(k)))
        return gameFailR47('إجراء اللعبة أو حقوله غير صالحة.');
    const withdrawing = action.type === 'participate' && action.enabled === false;
    const denied = socialAllowed(ctx, id);
    if (denied && !(withdrawing && ctx.members.includes(ctx.actorId)))
        return denied;
    if (!gameIdR47(ctx.actorId) || !gameTimeR47(ctx.now) || ctx.now > Number.MAX_SAFE_INTEGER - 3_600_000)
        return gameFailR47('ساعة المجلس غير صالحة.');
    const s = state;
    if (!gameTimeR47(action.version) || action.version !== s.version || !Number.isSafeInteger(s.version + 1))
        return gameFailR47('تغيرت حالة اللعبة؛ حدّث العرض وأعد المحاولة.');
    const draft = structuredClone(s), result = run(draft);
    if (result.ok) {
        draft.version++;
        Object.assign(state, draft);
    }
    return result;
}
export function gameParticipateR47(s, enabled, ctx) {
    if (typeof enabled !== 'boolean')
        return gameFailR47('حدد المشاركة أو الانسحاب.');
    if (enabled) {
        if (gameActiveR47(s))
            return gameFailR47('انتظر الجلسة التالية للمشاركة.');
        s.participants = s.participants.filter(p => ctx.members.includes(p));
        if (s.participants.includes(ctx.actorId))
            return gameFailR47('أنت مشارك بالفعل.');
        if (s.participants.length >= 6)
            return gameFailR47('اللعبة من عضوين إلى ستة.');
        s.participants.push(ctx.actorId);
    }
    else
        s.participants = s.participants.filter(p => p !== ctx.actorId);
    return { ok: true, event: 'participation' };
}
/** Supply current eligible council members, never client-supplied identities. */
export function gamePruneR47(s, ctx) {
    s.participants = s.participants.filter(p => ctx.members.includes(p));
    if (gameActiveR47(s) && s.participants.length < 2) {
        s.phase = 'cancelled';
        s.deadline = null;
        return true;
    }
    return false;
}
export const gameTextR47 = (x, max) => socialText(x, max)?.replace(/\s+/gu, ' ') ?? null;
export function gameBaseValidR47(x, phases) {
    return !!x && typeof x === 'object' && !Array.isArray(x) && Array.isArray(x.participants) && x.participants.length <= 6 && x.participants.every(gameIdR47) && new Set(x.participants).size === x.participants.length && gameTimeR47(x.version) && (x.sessionId === null || gameIdR47(x.sessionId)) && phases.includes(x.phase) && (x.deadline === null || gameTimeR47(x.deadline)) && Number.isInteger(x.round) && x.round >= 0 && x.round <= 6;
}
export const gameOnlyR47 = (x, keys) => !!x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).every(k => keys.includes(k));
export const GAME_BASE_KEYS_R47 = ['participants', 'version', 'sessionId', 'phase', 'deadline', 'round'];
