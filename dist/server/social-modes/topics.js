import { socialAllowed, socialCards, socialText, } from '../social-mode-contract.js';
// Seed content only: the core/admin owns enabling, editing and persisting these cards.
export const topicsCards = [
    { id: 'topics-small-joys', mode: 'topics', category: 'يوميات', text: 'ما الشيء البسيط الذي يجعل يومك أجمل؟', enabled: true },
    { id: 'topics-new-hobby', mode: 'topics', category: 'يوميات', text: 'ما الهواية التي تود تجربتها ولماذا؟', enabled: true },
    { id: 'topics-good-habit', mode: 'topics', category: 'يوميات', text: 'ما العادة الصغيرة التي تنصح بها ليوم مريح؟', enabled: true },
    { id: 'topics-kindness', mode: 'topics', category: 'يوميات', text: 'كيف يمكن أن نجعل حديثنا مع الآخرين أكثر لطفًا؟', enabled: true },
];
const MAX_TEXT = 240;
const MAX_SUGGESTIONS = 12;
const MAX_AUTOMATIC = 8;
const MAX_PER_MEMBER = 3;
const MAX_VOTES = 500;
const MIN_DURATION = 10_000;
const MAX_DURATION = 3_600_000;
const identifier = /^[A-Za-z0-9_.:-]{1,120}$/;
const fail = (error) => ({ ok: false, error });
const success = (event) => ({ ok: true, event });
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const validDuration = (n) => typeof n === 'number'
    && Number.isSafeInteger(n) && n >= MIN_DURATION && n <= MAX_DURATION;
const validTime = (n) => typeof n === 'number'
    && Number.isSafeInteger(n) && n >= 0;
function duration(s, ctx) {
    const n = s.config.durationMs ?? ctx.content.settings.topics.durationMs;
    return validDuration(n) ? n : null;
}
function categories(ctx) {
    return ctx.content.settings.topics.categories.filter(c => socialText(c, 100) === c);
}
function cards(ctx) {
    const seen = new Set();
    return socialCards(ctx, 'topics').filter(c => {
        if (!identifier.test(c.id) || !categories(ctx).includes(c.category)
            || !socialText(c.text, MAX_TEXT) || seen.has(c.id))
            return false;
        seen.add(c.id);
        return true;
    }).map(c => ({ id: c.id, mode: 'topics', category: c.category,
        text: socialText(c.text, MAX_TEXT), enabled: true }))
        .sort((a, b) => compare(a.id, b.id));
}
function visible(topic, ctx, available) {
    if (!categories(ctx).includes(topic.category) || socialText(topic.text, MAX_TEXT) !== topic.text)
        return false;
    return topic.source === 'manual' || (topic.source === 'card'
        && available.some(c => c.id === topic.cardId && c.category === topic.category && c.text === topic.text));
}
function choices(s, ctx, available = cards(ctx)) {
    return s.suggestions.filter(t => visible(t, ctx, available)).slice(0, MAX_SUGGESTIONS);
}
function validVotes(s, candidates, ctx) {
    const members = new Set(ctx.members);
    const ids = new Set(candidates.map(c => c.id));
    // Iterate backwards so even a recovered duplicate cannot give a member two votes.
    const seen = new Set();
    return [...s.votes].reverse().filter(v => {
        if (seen.has(v.memberId))
            return false;
        seen.add(v.memberId);
        return members.has(v.memberId) && ids.has(v.topicId);
    }).slice(0, MAX_VOTES).reverse();
}
function automated(current, round, ctx, available, existing = []) {
    const usedText = new Set([current.text, ...existing.map(t => t.text)]);
    const result = [];
    const limit = Math.min(MAX_AUTOMATIC, MAX_SUGGESTIONS - existing.length);
    if (limit <= 0)
        return result;
    for (const card of available) {
        if (card.category !== current.category || usedText.has(card.text))
            continue;
        result.push({ id: `card:${round}:${card.id}`, text: card.text, category: card.category,
            source: 'card', cardId: card.id });
        usedText.add(card.text);
        if (result.length >= limit)
            break;
    }
    return result;
}
function manualTopic(text, category, available, ctx, round) {
    const matching = available.find(c => c.text === text);
    // Do not turn an explicitly disabled/unconfigured card into a manual card by copying it.
    if (!matching && ctx.content.cards.some(c => c.mode === 'topics' && socialText(c.text, MAX_TEXT) === text))
        return null;
    let token;
    try {
        token = ctx.newId();
    }
    catch {
        return null;
    }
    if (typeof token !== 'string' || !identifier.test(token))
        return null;
    return { id: `topic:${round}:${token}`, text, category: matching?.category ?? category,
        source: matching ? 'card' : 'manual', ...(matching ? { cardId: matching.id } : {}) };
}
function publicTopic(t) {
    return { id: t.id, text: t.text, category: t.category, source: t.source };
}
export const topicsMode = {
    id: 'topics',
    initial() {
        return { current: null, suggestions: [], votes: [], round: 0,
            config: { autoSuggestions: true, durationMs: null } };
    },
    apply(state, action, ctx) {
        const denied = socialAllowed(ctx, 'topics');
        if (denied)
            return denied;
        if (!validTime(ctx.now))
            return fail('وقت المجلس غير صالح.');
        const s = state;
        const available = cards(ctx);
        const enabledCategories = categories(ctx);
        switch (action.type) {
            case 'start': {
                if (!ctx.moderator)
                    return fail('بدء الموضوع للمضيف أو المشرف فقط.');
                const text = socialText(action.text, MAX_TEXT);
                if (!text)
                    return fail('اكتب موضوعًا آمنًا من 1 إلى 240 حرفًا دون معلومات اتصال أو أسرار.');
                if (!enabledCategories.length)
                    return fail('لا توجد فئات مواضيع مفعلة.');
                const ms = duration(s, ctx);
                if (ms === null || !validTime(ctx.now + ms) || !Number.isSafeInteger(s.round + 1))
                    return fail('مدة الموضوع غير صالحة.');
                const round = s.round + 1;
                const topic = manualTopic(text, enabledCategories[0], available, ctx, round);
                if (!topic)
                    return fail('الموضوع غير متاح أو معرّفه غير صالح.');
                const current = { ...topic, startedAt: ctx.now, deadline: ctx.now + ms };
                const suggestions = s.config.autoSuggestions ? automated(current, round, ctx, available) : [];
                Object.assign(state, { current, suggestions, votes: [], round });
                return success('topics.started');
            }
            case 'suggest': {
                if (!s.current)
                    return fail('ابدأ موضوعًا أولًا.');
                if (ctx.now >= s.current.deadline)
                    return fail('انتهت مدة الاقتراح والتصويت.');
                const text = socialText(action.text, MAX_TEXT);
                if (!text)
                    return fail('اكتب اقتراحًا آمنًا من 1 إلى 240 حرفًا دون معلومات اتصال أو أسرار.');
                if (!enabledCategories.includes(s.current.category))
                    return fail('فئة الموضوع غير مفعلة.');
                const candidates = choices(s, ctx, available);
                if (text === s.current.text || candidates.some(t => t.text === text))
                    return fail('هذا الموضوع موجود بالفعل.');
                if (candidates.length >= MAX_SUGGESTIONS)
                    return fail('وصل المجلس إلى حد الاقتراحات.');
                if (candidates.filter(t => t.suggestedBy === ctx.actorId).length >= MAX_PER_MEMBER)
                    return fail('وصلت إلى حد اقتراحاتك لهذا الموضوع.');
                const topic = manualTopic(text, s.current.category, available, ctx, s.round);
                if (!topic || topic.id === s.current.id || candidates.some(t => t.id === topic.id))
                    return fail('الاقتراح غير متاح أو معرّفه مكرر.');
                const suggestions = [...candidates, { ...topic, suggestedBy: ctx.actorId }];
                Object.assign(state, { suggestions, votes: validVotes(s, suggestions, ctx) });
                return success('topics.suggested');
            }
            case 'vote': {
                if (!s.current)
                    return fail('لا يوجد موضوع للتصويت.');
                if (ctx.now >= s.current.deadline)
                    return fail('انتهت مدة التصويت.');
                const candidates = choices(s, ctx, available);
                if (typeof action.topicId !== 'string' || !candidates.some(t => t.id === action.topicId))
                    return fail('اختر اقتراحًا متاحًا.');
                const votes = validVotes(s, candidates, ctx).filter(v => v.memberId !== ctx.actorId);
                if (votes.length >= MAX_VOTES)
                    return fail('وصل التصويت إلى حد المشاركين.');
                votes.push({ memberId: ctx.actorId, topicId: action.topicId });
                Object.assign(state, { suggestions: candidates, votes });
                return success('topics.voted');
            }
            case 'advance': {
                if (!s.current)
                    return fail('لا يوجد موضوع للانتقال منه.');
                if (!ctx.moderator && ctx.now < s.current.deadline)
                    return fail('انتظر نهاية مدة الموضوع أو اطلب من المشرف تغييره.');
                const candidates = choices(s, ctx, available);
                if (!candidates.length)
                    return fail('لا يوجد موضوع تالٍ متاح؛ أضف اقتراحًا أو ابدأ موضوعًا جديدًا.');
                const ms = duration(s, ctx);
                if (ms === null || !validTime(ctx.now + ms) || !Number.isSafeInteger(s.round + 1))
                    return fail('مدة الموضوع غير صالحة.');
                const votes = validVotes(s, candidates, ctx);
                const tally = new Map();
                for (const v of votes)
                    tally.set(v.topicId, (tally.get(v.topicId) ?? 0) + 1);
                // Total ordering is independent of member order, action order and system locale.
                const winner = [...candidates].sort((a, b) => (tally.get(b.id) ?? 0) - (tally.get(a.id) ?? 0) || compare(a.id, b.id))[0];
                const { suggestedBy: _privateAuthor, ...topic } = winner;
                const current = { ...topic, startedAt: ctx.now, deadline: ctx.now + ms };
                const round = s.round + 1;
                const suggestions = s.config.autoSuggestions ? automated(current, round, ctx, available) : [];
                // Topic changes intentionally touch no council membership or voice transport.
                Object.assign(state, { current, round, suggestions, votes: [] });
                return success('topics.advanced');
            }
            case 'configure': {
                if (!ctx.moderator)
                    return fail('إعدادات الموضوع للمضيف أو المشرف فقط.');
                // Both duration and durationMs mean milliseconds; accepting both together is ambiguous.
                if (action.duration !== undefined && action.durationMs !== undefined)
                    return fail('حدد مدة واحدة فقط.');
                const requestedDuration = action.durationMs !== undefined ? action.durationMs : action.duration;
                if (action.autoSuggestions === undefined && requestedDuration === undefined)
                    return fail('حدد إعدادًا لتغييره.');
                if (action.autoSuggestions !== undefined && typeof action.autoSuggestions !== 'boolean')
                    return fail('إعداد الاقتراحات يجب أن يكون صحيحًا أو خطأ.');
                if (requestedDuration !== undefined && !validDuration(requestedDuration))
                    return fail('مدة الموضوع يجب أن تكون بين 10 ثوانٍ و60 دقيقة.');
                const config = { autoSuggestions: action.autoSuggestions === undefined
                        ? s.config.autoSuggestions : action.autoSuggestions,
                    durationMs: requestedDuration === undefined ? s.config.durationMs : requestedDuration };
                let current = s.current;
                if (current && requestedDuration !== undefined) {
                    if (!validTime(current.startedAt + requestedDuration))
                        return fail('مدة الموضوع غير صالحة.');
                    current = { ...current, deadline: current.startedAt + requestedDuration };
                }
                let suggestions = choices(s, ctx, available).filter(t => config.autoSuggestions || t.suggestedBy !== undefined);
                if (current && config.autoSuggestions) {
                    const automaticCount = suggestions.filter(t => t.source === 'card' && t.suggestedBy === undefined).length;
                    suggestions = [...suggestions, ...automated(current, s.round, ctx, available, suggestions)
                            .slice(0, MAX_AUTOMATIC - automaticCount)];
                }
                Object.assign(state, { config, current, suggestions, votes: validVotes(s, suggestions, ctx) });
                return success('topics.configured');
            }
            default: return fail('إجراء غير معروف لهذا النمط.');
        }
    },
    view(state, ctx) {
        if (!ctx.content.settings.topics?.enabled || !ctx.members.includes(ctx.actorId)) {
            return { id: 'topics', unavailable: true };
        }
        const s = state;
        const available = cards(ctx);
        const candidates = choices(s, ctx, available);
        const votes = validVotes(s, candidates, ctx);
        const current = s.current && visible(s.current, ctx, available) ? {
            ...publicTopic(s.current), startedAt: s.current.startedAt, deadline: s.current.deadline,
        } : null;
        return { id: 'topics', current, round: s.round,
            suggestions: candidates.map(t => ({ ...publicTopic(t), votes: votes.filter(v => v.topicId === t.id).length })),
            ownVote: votes.find(v => v.memberId === ctx.actorId)?.topicId ?? null,
            autoSuggestions: s.config.autoSuggestions, durationMs: duration(s, ctx),
            canParticipate: socialAllowed(ctx, 'topics') === null,
            canModerate: ctx.moderator && socialAllowed(ctx, 'topics') === null,
            canAdvance: socialAllowed(ctx, 'topics') === null && current !== null && candidates.length > 0
                && (ctx.moderator || ctx.now >= (s.current?.deadline ?? Infinity)),
        };
    },
};
export default topicsMode;
