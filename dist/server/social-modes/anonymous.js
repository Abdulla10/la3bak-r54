import { socialAllowed, socialCards, socialPublicCard, socialText, } from '../social-mode-contract.js';
/** Initial admin-editable guidance only; never seeded participant messages. */
export const anonymousCards = [
    { id: 'anonymous-kind-word', mode: 'anonymous', category: 'kindness', text: 'اكتب كلمة لطيفة تمنح أحد أعضاء المجلس شعورًا جميلًا، دون ذكر أسماء أو معلومات شخصية.', enabled: true },
    { id: 'anonymous-small-joy', mode: 'anonymous', category: 'reflection', text: 'ما الشيء البسيط الذي أسعدك اليوم؟ شاركه إن أحببت، ويمكنك الاحتفاظ بهويتك مجهولة.', enabled: true },
    { id: 'anonymous-imagination', mode: 'anonymous', category: 'imagination', text: 'لو كان للمجلس مكان خيالي يجتمع فيه، كيف تتخيله؟ المشاركة اختيارية.', enabled: true },
];
export const anonymousReactions = ['like', 'heart', 'laugh', 'agree', 'support'];
const MAX_MESSAGES = 100;
const MAX_REACTIONS = 100;
const MAX_REPORTS = 200;
const MAX_RATE_LIMITS = 1000;
const SEND_INTERVAL_MS = 10_000;
const fail = (error) => ({ ok: false, error });
const success = (event) => ({ ok: true, event });
const validTime = (value) => Number.isSafeInteger(value) && value >= 0;
const validActor = (value) => typeof value === 'string' && value.length > 0 && value.length <= 200;
const validId = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
const validReaction = (value) => typeof value === 'string' && anonymousReactions.includes(value);
/** The shared guard is conservative, not a semantic harassment detector. */
function safeText(value, max) {
    const text = socialText(value, max);
    if (text === null)
        return null;
    // Also detect obvious contact details written with Arabic/Persian digits or invisible separators.
    const detectable = text.replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '')
        .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0));
    return socialText(detectable, max) === null ? null : text;
}
function readState(state) {
    const { messages, reports, rateLimits } = state;
    if (!Array.isArray(messages) || !Array.isArray(reports) || !Array.isArray(rateLimits)
        || messages.length > MAX_MESSAGES || reports.length > MAX_REPORTS || rateLimits.length > MAX_RATE_LIMITS)
        return null;
    if (!messages.every((m) => m && validId(m.id) && validActor(m.senderId)
        && safeText(m.text, 500) !== null && validTime(m.createdAt) && typeof m.revealed === 'boolean'
        && typeof m.hidden === 'boolean' && Array.isArray(m.reactions) && m.reactions.length <= MAX_REACTIONS
        && m.reactions.every(r => r && validActor(r.actorId) && validReaction(r.reaction))
        && new Set(m.reactions.map(r => r.actorId)).size === m.reactions.length))
        return null;
    if (new Set(messages.map((m) => m.id)).size !== messages.length)
        return null;
    if (!reports.every((r) => r && validId(r.id) && validId(r.messageId) && validActor(r.actorId)
        && safeText(r.reason, 200) !== null && validTime(r.createdAt) && r.message
        && validActor(r.message.senderId) && safeText(r.message.text, 500) !== null && validTime(r.message.createdAt)))
        return null;
    if (!rateLimits.every((r) => r && validActor(r.actorId) && validTime(r.sentAt)))
        return null;
    if (new Set(rateLimits.map((r) => r.actorId)).size !== rateLimits.length)
        return null;
    return { messages, reports, rateLimits };
}
const duplicateText = (text) => text.replace(/\s+/g, ' ').toLocaleLowerCase('ar');
function freshId(ctx, state) {
    const id = ctx.newId();
    return validId(id) && !state.messages.some(m => m.id === id) && !state.reports.some(r => r.id === id) ? id : null;
}
function apply(state, action, ctx) {
    const denied = socialAllowed(ctx, 'anonymous');
    if (denied)
        return denied;
    if (!validActor(ctx.actorId) || !validTime(ctx.now))
        return fail('سياق المشاركة غير صالح.');
    const current = readState(state);
    if (!current)
        return fail('حالة النمط غير صالحة.');
    if (!action || typeof action.type !== 'string')
        return fail('إجراء غير صالح.');
    if (action.type === 'send') {
        const text = safeText(action.text, 500);
        if (text === null)
            return fail('اكتب رسالة مناسبة دون معلومات شخصية أو روابط، بحد أقصى 500 حرف.');
        const previous = current.rateLimits.find(r => r.actorId === ctx.actorId);
        if (previous && ctx.now - previous.sentAt < SEND_INTERVAL_MS)
            return fail('انتظر عشر ثوانٍ بين الرسائل.');
        if (current.messages.some(m => m.senderId === ctx.actorId && duplicateText(m.text) === duplicateText(text)))
            return fail('لا تكرر الرسالة نفسها.');
        const limits = current.rateLimits.filter(r => ctx.now - r.sentAt < SEND_INTERVAL_MS);
        if (limits.length >= MAX_RATE_LIMITS)
            return fail('المجلس مشغول حاليًا، حاول لاحقًا.');
        const id = freshId(ctx, current);
        if (!id)
            return fail('تعذر إنشاء معرف آمن للرسالة.');
        const message = { id, text, senderId: ctx.actorId, createdAt: ctx.now, revealed: false, hidden: false, reactions: [] };
        // Commit only after every check succeeds. Persisted limiter is independent of message eviction.
        state.messages = [...current.messages, message].slice(-MAX_MESSAGES);
        state.rateLimits = [...limits, { actorId: ctx.actorId, sentAt: ctx.now }];
        return success('anonymous.sent');
    }
    if (!['react', 'reveal', 'report', 'moderate'].includes(action.type))
        return fail('إجراء غير معروف في هذا النمط.');
    if (!validId(action.messageId))
        return fail('معرف الرسالة غير صالح.');
    const message = current.messages.find(m => m.id === action.messageId);
    if (!message)
        return fail('الرسالة غير موجودة.');
    if (action.type === 'moderate') {
        if (!ctx.moderator)
            return fail('هذا الإجراء للمشرف فقط.');
        if (action.hide !== true)
            return fail('يسمح بإخفاء الرسالة فقط.');
        if (message.hidden)
            return fail('الرسالة مخفية بالفعل.');
        message.hidden = true;
        return success('anonymous.moderated');
    }
    if (message.hidden)
        return fail('الرسالة غير متاحة.');
    if (action.type === 'react') {
        if (!validReaction(action.reaction))
            return fail('التفاعل غير مسموح.');
        if (message.reactions.some(r => r.actorId === ctx.actorId))
            return fail('يمكنك التفاعل مرة واحدة مع كل رسالة.');
        if (message.reactions.length >= MAX_REACTIONS)
            return fail('وصلت الرسالة إلى حد التفاعلات.');
        message.reactions.push({ actorId: ctx.actorId, reaction: action.reaction });
        return success('anonymous.reacted');
    }
    if (action.type === 'reveal') {
        // This explicit action is consent; even a moderator cannot consent on someone else's behalf.
        if (message.senderId !== ctx.actorId)
            return fail('المرسل وحده يستطيع الموافقة على كشف هويته.');
        if (message.revealed)
            return fail('تم كشف الهوية بموافقتك بالفعل.');
        message.revealed = true;
        return success('anonymous.revealed');
    }
    const reason = safeText(action.reason, 200);
    if (reason === null)
        return fail('اكتب سببًا مناسبًا دون معلومات شخصية، بحد أقصى 200 حرف.');
    if (current.reports.some(r => r.messageId === message.id && r.actorId === ctx.actorId))
        return fail('سبق أن أبلغت عن هذه الرسالة.');
    if (current.reports.length >= MAX_REPORTS)
        return fail('وصلت البلاغات إلى الحد المسموح، تواصل مع الإدارة.');
    const id = freshId(ctx, current);
    if (!id)
        return fail('تعذر إنشاء معرف آمن للبلاغ.');
    current.reports.push({ id, messageId: message.id, actorId: ctx.actorId, reason, createdAt: ctx.now,
        message: { senderId: message.senderId, text: message.text, createdAt: message.createdAt } });
    return success('anonymous.reported');
}
export const anonymousMode = {
    id: 'anonymous',
    initial: () => ({ messages: [], reports: [], rateLimits: [] }),
    apply,
    view(state, ctx) {
        const accessible = Boolean(ctx.content.settings.anonymous?.enabled && ctx.members.includes(ctx.actorId));
        const current = readState(state);
        const cards = accessible ? socialCards(ctx, 'anonymous').filter(c => safeText(c.text, 500) !== null
            && (!c.options || c.options.every(o => safeText(o, 100) !== null))).map(c => socialPublicCard(c)) : [];
        const messages = accessible && current ? current.messages.filter(m => !m.hidden).map(m => {
            const reactions = {};
            for (const reaction of anonymousReactions)
                reactions[reaction] = m.reactions.filter(r => r.reaction === reaction).length;
            // Explicit allowlist: no spreads of server state, reporter IDs, reaction actors, or rate-limit data.
            return { id: m.id, text: m.text, createdAt: m.createdAt, reactions, revealed: m.revealed,
                ...(m.revealed ? { senderId: m.senderId } : {}) };
        }) : [];
        return { id: 'anonymous', cards, messages, allowedReactions: [...anonymousReactions] };
    },
};
export default anonymousMode;
