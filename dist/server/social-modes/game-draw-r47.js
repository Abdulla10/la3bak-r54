import { gameActiveR47, gameApplyR47, gameBaseValidR47, gameFailR47, gameIdR47, gameInitialR47, gameNewSessionR47, gameOnlyR47, gameParticipateR47, gamePermissionsR47, gamePruneR47, gameTextR47, gameVisibleR47, GAME_BASE_KEYS_R47, } from '../social-mode-contract.js';
export const DRAW_COLORS_R47 = ['#065f46', '#fff9e8', '#c9a84c'];
export const drawStoryCards = [
    { id: 'draw-r47-guest', mode: 'draw-story', category: 'خيال', text: 'ارسموا آلة خيالية ترحّب بضيف المجلس.', enabled: true },
    { id: 'draw-r47-garden', mode: 'draw-story', category: 'خيال', text: 'ابنوا حديقة صغيرة فوق غيمة بخط واحد لكل مشارك.', enabled: true },
];
const ok = (event) => ({ ok: true, event: `draw-story.${event}` });
const initial = () => ({ ...gameInitialR47(), order: [], prompt: null, strokes: [], _private: { titles: [], votes: [] }, result: null });
const activeTitles = (s) => s._private.titles.filter(t => t.authors.some(p => s.participants.includes(p)));
function finish(s) {
    const titles = activeTitles(s).map(t => ({ id: t.id, text: t.text, votes: s._private.votes.filter(v => s.participants.includes(v.actorId) && v.titleId === t.id).length }));
    const max = Math.max(0, ...titles.map(t => t.votes));
    s.result = { titles, winners: max > 0 ? titles.filter(t => t.votes === max).map(t => t.id) : [] };
    s.phase = 'finished';
    s.deadline = null;
}
function nextTurn(s, at) {
    s.round++;
    while (s.round < s.order.length && !s.participants.includes(s.order[s.round]))
        s.round++;
    if (s.round >= s.order.length) {
        s.phase = 'titles';
        s.deadline = at + 15_000;
    }
    else
        s.deadline = at + 20_000;
}
/** Mutates a transaction draft only. Deadlines remain anchored to server time, never extended by reconnect. */
export function advanceDrawStoryR47(s, ctx) {
    if (gamePruneR47(s, ctx)) {
        s._private = { titles: [], votes: [] };
        return;
    }
    if (s.phase === 'drawing' && !s.participants.includes(s.order[s.round]))
        nextTurn(s, ctx.now);
    for (let i = 0; i < 10 && gameActiveR47(s) && s.deadline !== null && ctx.now >= s.deadline; i++) {
        const at = s.deadline;
        if (s.phase === 'drawing')
            nextTurn(s, at);
        else if (s.phase === 'titles') {
            if (!activeTitles(s).length) {
                finish(s);
                break;
            }
            s.phase = 'voting';
            s.deadline = at + 10_000;
        }
        else if (s.phase === 'voting')
            finish(s);
        else
            break;
    }
}
function pruneTitles(s) {
    s._private.titles = s._private.titles.map(t => ({ ...t, authors: t.authors.filter(p => s.participants.includes(p)) })).filter(t => t.authors.length);
    s._private.votes = s._private.votes.filter(v => s.participants.includes(v.actorId) && s._private.titles.some(t => t.id === v.titleId));
}
export const drawStoryMode = {
    id: 'draw-story', initial,
    apply(state, action, ctx) {
        return gameApplyR47(state, action, ctx, 'draw-story', {
            participate: ['enabled'], start: [], stroke: ['color', 'points', 'turn'], pass: ['turn'], title: ['text'], vote: ['titleId'], tick: [], cancel: [],
        }, s => {
            if (action.type === 'participate') {
                const before = s.order[s.round], r = gameParticipateR47(s, action.enabled, ctx);
                if (!r.ok)
                    return r;
                pruneTitles(s);
                if (gamePruneR47(s, ctx)) {
                    s._private = { titles: [], votes: [] };
                }
                else if (s.phase === 'drawing' && before === ctx.actorId && action.enabled === false)
                    nextTurn(s, ctx.now);
                return ok('participation');
            }
            if (action.type === 'start') {
                if (!ctx.moderator || gameActiveR47(s))
                    return gameFailR47('بدء الجلسة للمشرف بعد نهاية السابقة فقط.');
                const participants = s.participants.filter(p => ctx.members.includes(p));
                if (participants.length < 2 || participants.length > 6)
                    return gameFailR47('اختر من عضوين إلى ستة مشاركين.');
                const cards = ctx.content.cards.filter(c => c.mode === 'draw-story' && c.enabled && ctx.content.settings['draw-story'].categories.includes(c.category) && gameTextR47(c.text, 500));
                if (!cards.length)
                    return gameFailR47('لا توجد بطاقة خيال معتمدة.');
                const sessionId = gameNewSessionR47(ctx);
                if (!sessionId)
                    return gameFailR47('تعذر إنشاء الجلسة.');
                Object.assign(s, initial(), { version: s.version, participants, order: [...participants], sessionId, phase: 'drawing', deadline: ctx.now + 20_000, prompt: cards[0].text });
                return ok('started');
            }
            if (action.type === 'tick') {
                advanceDrawStoryR47(s, ctx);
                pruneTitles(s);
                return ok('tick');
            }
            if (action.type === 'cancel') {
                if (!ctx.moderator || !gameActiveR47(s))
                    return gameFailR47('الإلغاء للمشرف في جلسة نشطة.');
                s.phase = 'cancelled';
                s.deadline = null;
                s._private = { titles: [], votes: [] };
                return ok('cancelled');
            }
            advanceDrawStoryR47(s, ctx);
            pruneTitles(s);
            if (!s.participants.includes(ctx.actorId) || !ctx.members.includes(ctx.actorId) || s.participants.some(p => !ctx.members.includes(p)))
                return gameFailR47('تغير المشاركون؛ حدّث اللعبة.');
            if (s.deadline === null || ctx.now >= s.deadline)
                return gameFailR47('انتهت مهلة المرحلة؛ انتقل بالحالة الخادمية.');
            if (action.type === 'stroke' || action.type === 'pass') {
                if (s.phase !== 'drawing' || s.order[s.round] !== ctx.actorId || action.turn !== s.round)
                    return gameFailR47('هذا ليس دورك الحالي.');
                if (action.type === 'stroke') {
                    if (!DRAW_COLORS_R47.includes(action.color) || !Array.isArray(action.points) || action.points.length < 1 || action.points.length > 128 || !action.points.every(validPoint))
                        return gameFailR47('خط واحد من 1 إلى 128 نقطة معيارية ولون معتمد.');
                    s.strokes.push({ actorId: ctx.actorId, color: action.color, points: action.points.map(p => ({ x: p.x, y: p.y })) });
                }
                nextTurn(s, ctx.now);
                return ok(action.type);
            }
            if (action.type === 'title') {
                if (s.phase !== 'titles')
                    return gameFailR47('نافذة العناوين غير مفتوحة.');
                const text = gameTextR47(action.text, 40);
                if (!text)
                    return gameFailR47('عنوان آمن من 1 إلى 40 حرفًا.');
                if (s._private.titles.some(t => t.authors.includes(ctx.actorId)))
                    return gameFailR47('عنوان واحد لكل مشارك.');
                const same = s._private.titles.find(t => t.text === text);
                if (same)
                    same.authors.push(ctx.actorId);
                else
                    s._private.titles.push({ id: `title-${s.order.indexOf(ctx.actorId) + 1}`, text, authors: [ctx.actorId] });
                return ok('title');
            }
            if (action.type === 'vote') {
                if (s.phase !== 'voting')
                    return gameFailR47('نافذة التصويت غير مفتوحة.');
                const title = s._private.titles.find(t => t.id === action.titleId);
                if (!title || title.authors.includes(ctx.actorId))
                    return gameFailR47('اختر عنوانًا لم تساهم في كتابته.');
                if (s._private.votes.some(v => v.actorId === ctx.actorId))
                    return gameFailR47('صوت واحد نهائي لكل مشارك.');
                s._private.votes.push({ actorId: ctx.actorId, titleId: title.id });
                return ok('vote');
            }
            return gameFailR47('إجراء غير متاح.');
        });
    },
    view(state, ctx) {
        if (!gameVisibleR47('draw-story', ctx))
            return { id: 'draw-story', unavailable: true };
        const raw = state, s = structuredClone(raw);
        advanceDrawStoryR47(s, ctx);
        pruneTitles(s);
        const p = gamePermissionsR47(s, ctx, 'draw-story'), myTitle = s._private.titles.some(t => t.authors.includes(ctx.actorId));
        return { id: 'draw-story', version: raw.version, sessionId: s.sessionId, serverNow: ctx.now, phase: s.phase, deadline: s.deadline, round: s.round, participants: [...s.participants], participating: s.participants.includes(ctx.actorId), prompt: s.prompt,
            memberId: s.phase === 'drawing' ? s.order[s.round] : null, strokes: s.strokes.map(t => ({ color: t.color, points: t.points.map(p => ({ ...p })) })),
            titles: s.phase === 'voting' ? activeTitles(s).map(t => ({ id: t.id, text: t.text, canVote: p.act && !t.authors.includes(ctx.actorId) && !s._private.votes.some(v => v.actorId === ctx.actorId) })) : [],
            hasTitle: myTitle, hasVoted: s._private.votes.some(v => v.actorId === ctx.actorId), result: s.phase === 'finished' ? structuredClone(s.result) : null,
            permissions: { ...p, tick: p.tick || gamePermissionsR47(raw, ctx, 'draw-story').tick, stroke: p.act && s.phase === 'drawing' && s.order[s.round] === ctx.actorId, title: p.act && s.phase === 'titles' && !myTitle },
        };
    },
};
const validPoint = (p) => gameOnlyR47(p, ['x', 'y']) && typeof p.x === 'number' && Number.isFinite(p.x) && p.x >= 0 && p.x <= 1 && typeof p.y === 'number' && Number.isFinite(p.y) && p.y >= 0 && p.y <= 1;
export function validDrawStoryStateR47(s) {
    const title = (t) => gameOnlyR47(t, ['id', 'text', 'authors']) && gameIdR47(t.id) && gameTextR47(t.text, 40) === t.text && Array.isArray(t.authors) && t.authors.length >= 1 && t.authors.length <= 6 && t.authors.every(gameIdR47) && new Set(t.authors).size === t.authors.length;
    if (!gameBaseValidR47(s, ['lobby', 'drawing', 'titles', 'voting', 'finished', 'cancelled']) || !gameOnlyR47(s, [...GAME_BASE_KEYS_R47, 'order', 'prompt', 'strokes', '_private', 'result']) || !Array.isArray(s.order) || s.order.length > 6 || !s.order.every(gameIdR47) || new Set(s.order).size !== s.order.length || (s.prompt !== null && gameTextR47(s.prompt, 500) !== s.prompt) || !Array.isArray(s.strokes) || s.strokes.length > 6 || !s.strokes.every((t) => gameOnlyR47(t, ['actorId', 'color', 'points']) && gameIdR47(t.actorId) && DRAW_COLORS_R47.includes(t.color) && Array.isArray(t.points) && t.points.length >= 1 && t.points.length <= 128 && t.points.every(validPoint)))
        return false;
    if (!gameOnlyR47(s._private, ['titles', 'votes']) || !Array.isArray(s._private.titles) || s._private.titles.length > 6 || !s._private.titles.every(title) || new Set(s._private.titles.map((t) => t.id)).size !== s._private.titles.length || !Array.isArray(s._private.votes) || s._private.votes.length > 6 || !s._private.votes.every((v) => gameOnlyR47(v, ['actorId', 'titleId']) && gameIdR47(v.actorId) && gameIdR47(v.titleId) && s._private.titles.some((t) => t.id === v.titleId && !t.authors.includes(v.actorId))) || new Set(s._private.votes.map((v) => v.actorId)).size !== s._private.votes.length)
        return false;
    if (gameActiveR47(s) && (s.deadline === null || s.sessionId === null || s.participants.length < 2))
        return false;
    if (s.phase === 'drawing' && (s.round >= s.order.length || !s.order.includes(s.order[s.round])))
        return false;
    if (s.result === null)
        return s.phase !== 'finished';
    return s.phase === 'finished' && gameOnlyR47(s.result, ['titles', 'winners']) && Array.isArray(s.result.titles) && s.result.titles.length <= 6 && s.result.titles.every((t) => gameOnlyR47(t, ['id', 'text', 'votes']) && gameIdR47(t.id) && gameTextR47(t.text, 40) === t.text && Number.isInteger(t.votes) && t.votes >= 0 && t.votes <= 6) && Array.isArray(s.result.winners) && s.result.winners.length <= 6 && s.result.winners.every((w) => s.result.titles.some((t) => t.id === w));
}
export default drawStoryMode;
