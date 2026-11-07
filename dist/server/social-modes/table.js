import { socialAllowed, socialCards, socialPublicCard, socialText, } from '../social-mode-contract.js';
const HISTORY_LIMIT = 50;
const QUEUE_LIMIT = 100;
const ID_LIMIT = 128;
/** Initial, admin-editable content only; never inserts room/member/demo data. */
export const tableCards = [
    { id: 'table-introduction-1', mode: 'table', category: 'تعارف', text: 'ما الهواية التي تحب أن تتعلمها، ولماذا؟', enabled: true },
    { id: 'table-situation-1', mode: 'table', category: 'مواقف اجتماعية', text: 'لو استقبلت ضيفًا لأول مرة، ما الفكرة البسيطة التي تجعله يشعر بالترحيب؟', enabled: true },
    { id: 'table-light-1', mode: 'table', category: 'خفيفة ومضحكة', text: 'لو كان ليومك عنوان فيلم كوميدي، ماذا سيكون؟', enabled: true },
    { id: 'table-reflection-1', mode: 'table', category: 'نقاش وتفكير', text: 'ما التصرف الصغير الذي يمكن أن يجعل يوم الآخرين أفضل؟', enabled: true },
];
const fail = (error) => ({ ok: false, error });
const success = (event) => ({ ok: true, event });
const identifier = (value) => typeof value === 'string'
    && value.length > 0 && value.length <= ID_LIMIT && value.trim() === value
    && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
const validTime = (value) => typeof value === 'number'
    && Number.isSafeInteger(value) && value >= 0;
/** Whitelist and copy content: neither admin metadata nor mutable options escape. */
function snapshot(value) {
    if (!value || typeof value !== 'object')
        return null;
    const card = value;
    if (!identifier(card.id) || card.mode !== 'table' || !identifier(card.category))
        return null;
    const text = socialText(card.text, 1000);
    if (!text)
        return null;
    let options;
    if (card.options !== undefined) {
        if (!Array.isArray(card.options) || card.options.length > 8)
            return null;
        const cleaned = card.options.map(option => socialText(option, 100));
        if (cleaned.some(option => option === null))
            return null;
        options = cleaned;
    }
    return { id: card.id, mode: 'table', category: card.category, text, enabled: true, ...(options ? { options } : {}) };
}
function queue(value, ctx) {
    if (!Array.isArray(value) || value.length > QUEUE_LIMIT)
        return null;
    if (value.some(id => !identifier(id) || !ctx.members.includes(id)) || new Set(value).size !== value.length)
        return null;
    return [...value];
}
function currentCard(state, ctx) {
    const card = snapshot(state.card);
    return card && socialCards(ctx, 'table', card.category).some(candidate => candidate.id === card.id) ? card : null;
}
function history(value) {
    if (!Array.isArray(value))
        return [];
    const entries = [];
    for (const item of value.slice(-HISTORY_LIMIT)) {
        if (!item || !identifier(item.id) || !identifier(item.drawId) || !identifier(item.cardId)
            || !identifier(item.actorId) || !validTime(item.at) || typeof item.passed !== 'boolean')
            continue;
        const text = item.passed ? undefined : socialText(item.text, 500);
        if (!item.passed && !text)
            continue;
        entries.push({ id: item.id, drawId: item.drawId, cardId: item.cardId, actorId: item.actorId,
            at: item.at, passed: item.passed, ...(text ? { text } : {}) });
    }
    return entries;
}
function nextId(ctx) {
    try {
        const id = ctx.newId();
        return identifier(id) ? id : null;
    }
    catch {
        return null;
    }
}
export const tableMode = {
    id: 'table',
    initial() {
        return { enabled: false, card: null, drawId: null, drawCount: 0, answers: [], turnQueue: [], queue: [] };
    },
    apply(state, action, ctx) {
        const denied = socialAllowed(ctx, 'table');
        if (denied)
            return denied;
        if (!action || typeof action.type !== 'string')
            return fail('الإجراء غير معروف.');
        if (!identifier(ctx.actorId) || !validTime(ctx.now))
            return fail('سياق الطلب غير صالح.');
        switch (action.type) {
            case 'configure': {
                if (!ctx.moderator)
                    return fail('تفعيل البطاقات وإعدادها للمضيف أو المشرف فقط.');
                if (typeof action.enabled !== 'boolean')
                    return fail('حدد حالة تفعيل البطاقات.');
                // Optional server-validated roster is a suggestion, not a participation gate.
                const roster = action.queue === undefined ? queue(state.turnQueue, ctx) : queue(action.queue, ctx);
                if (action.queue !== undefined && !roster)
                    return fail('طابور الأدوار غير صالح.');
                state.enabled = action.enabled;
                state.turnQueue = roster ?? [];
                state.queue = [...state.turnQueue];
                if (!action.enabled) {
                    state.card = null;
                    state.drawId = null;
                    state.answers = [];
                    state.queue = [];
                }
                return success('table.configured');
            }
            case 'draw': {
                if (!ctx.moderator)
                    return fail('سحب البطاقات للمضيف أو المشرف فقط.');
                if (state.enabled !== true)
                    return fail('البطاقات غير مفعلة.');
                if (!identifier(action.category) || !ctx.content.settings.table.categories.includes(action.category)) {
                    return fail('اختر فئة مفعلة من الإدارة.');
                }
                const cards = socialCards(ctx, 'table', action.category)
                    .map(snapshot).filter((card) => card !== null);
                if (!cards.length)
                    return fail('لا توجد بطاقات متاحة في هذه الفئة.');
                const count = Number.isSafeInteger(state.drawCount) && state.drawCount >= 0 && state.drawCount < Number.MAX_SAFE_INTEGER
                    ? state.drawCount : 0;
                const card = cards[count % cards.length];
                const id = nextId(ctx);
                if (!id)
                    return fail('تعذر إنشاء معرف البطاقة.');
                const roster = Array.isArray(state.turnQueue)
                    ? state.turnQueue.filter((id) => identifier(id) && ctx.members.includes(id)).slice(0, QUEUE_LIMIT) : [];
                state.card = card;
                state.drawId = id;
                state.drawCount = count + 1;
                state.queue = [...new Set(roster)];
                state.answers = history(state.answers);
                return success('table.drawn');
            }
            case 'answer':
            case 'pass': {
                if (state.enabled !== true)
                    return fail('البطاقات غير مفعلة.');
                const card = currentCard(state, ctx);
                if (!card || !identifier(state.drawId))
                    return fail('اسحب بطاقة مفعلة أولًا.');
                const passed = action.type === 'pass';
                const text = passed ? null : socialText(action.text, 500);
                if (!passed && !text)
                    return fail('اكتب إجابة آمنة من 1 إلى 500 حرف دون معلومات اتصال أو أسرار.');
                const id = nextId(ctx);
                if (!id)
                    return fail('تعذر إنشاء معرف المشاركة.');
                const entry = { id, drawId: state.drawId, cardId: card.id, actorId: ctx.actorId,
                    at: ctx.now, passed, ...(text ? { text } : {}) };
                const answers = [...history(state.answers), entry].slice(-HISTORY_LIMIT);
                const remaining = Array.isArray(state.queue)
                    ? state.queue.filter((id) => identifier(id) && ctx.members.includes(id) && id !== ctx.actorId).slice(0, QUEUE_LIMIT) : [];
                // All validation precedes mutation. Passing never requires an answer or a mic.
                state.answers = answers;
                state.queue = [...new Set(remaining)];
                return success(passed ? 'table.passed' : 'table.answered');
            }
            default:
                return fail('الإجراء غير معروف.');
        }
    },
    view(state, ctx) {
        const unavailable = !ctx.content.settings.table?.enabled || !ctx.members.includes(ctx.actorId);
        if (unavailable)
            return { id: 'table', enabled: false, card: null, drawId: null, answers: [], queue: [], nextParticipantId: null };
        const enabled = state.enabled === true;
        const card = enabled ? currentCard(state, ctx) : null;
        const drawId = card && identifier(state.drawId) ? state.drawId : null;
        const roster = card && Array.isArray(state.queue)
            ? [...new Set(state.queue.filter((id) => identifier(id) && ctx.members.includes(id)).slice(0, QUEUE_LIMIT))] : [];
        return {
            id: 'table', enabled, card: socialPublicCard(card ?? undefined), drawId,
            // Only the current draw is public. Retained previous answers are never projected.
            answers: drawId ? history(state.answers).filter(entry => entry.drawId === drawId && entry.cardId === card?.id) : [],
            queue: roster, nextParticipantId: roster[0] ?? null,
        };
    },
};
export default tableMode;
