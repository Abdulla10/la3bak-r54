import { topOf } from './util.js';
import { clone } from './util.js';
export const QUESTIONS = [
    'منو الأكثر واحد ينسى مواعيده؟', 'منو الأكثر واحد يتأخر عن أي مشوار؟', 'منو الأكثر واحد ينام في أي مكان؟',
    'منو الأكثر واحد يصير مليونير؟', 'منو الأكثر واحد يضيّع جواله؟', 'منو الأكثر واحد يسولف بدون ما يوقف؟',
    'منو الأكثر واحد يبكي في الأفلام؟', 'منو الأكثر واحد يطبخ زين؟', 'منو الأكثر واحد يصرف فلوسه بسرعة؟',
    'منو الأكثر واحد يصير مشهور؟', 'منو الأكثر واحد يقول «خمس دقايق» وهو لسه في البيت؟', 'منو الأكثر واحد ما يرد على الرسايل؟',
    'منو الأكثر واحد يحب الأكل؟', 'منو الأكثر واحد يسوق بسرعة؟', 'منو الأكثر واحد يعرف كل الأخبار قبل الكل؟',
    'منو الأكثر واحد يتهرّب من الحساب؟', 'منو الأكثر واحد يتحمّس لأي فكرة جديدة؟', 'منو الأكثر واحد يضحّك الكل؟',
    'منو الأكثر واحد يسهر للفجر؟', 'منو الأكثر واحد يعيش في بلد ثاني؟', 'منو الأكثر واحد يكسب في أي لعبة؟',
    'منو الأكثر واحد ينسى أسماء الناس؟', 'منو الأكثر واحد يشتري أشياء ما يحتاجها؟', 'منو الأكثر واحد يستحي بسرعة؟',
    'منو الأكثر واحد يقدر يحفظ سر؟', 'منو الأكثر واحد يصير مدير شركة؟', 'منو الأكثر واحد يخاف من الصراصير؟',
    'منو الأكثر واحد يعلّق في الزحمة وهو مبتسم؟', 'منو الأكثر واحد ما يقدر يصحى بدري؟', 'منو الأكثر واحد يرجع الأغراض متأخر؟',
    'منو الأكثر واحد يحب السفر؟', 'منو الأكثر واحد يسوي مقلب في الباقين؟',
];
export const info = {
    id: 'mostlikely',
    name: 'منو الأكثر',
    icon: '🗳️',
    tagline: 'صوّتوا على الأنسب للسالفة',
    description: 'سؤال في كل جولة، وكل واحد يصوّت على اللي يشوفه الأنسب له من الشلة.',
    minPlayers: 3,
    maxPlayers: 10,
    defaultSeats: 4,
    supportsBots: true,
    status: 'available',
    categories: ['party'],
    idea: 'يطلع سؤال مثل «منو الأكثر واحد ينسى مواعيده؟» وكل لاعب يختار واحد من الباقين بشكل سري. بعدها نكشف مين أخذ أكثر الأصوات.',
    howToStart: 'المضيف ينشئ غرفة من ثلاثة لاعبين فأكثر ويرسل الرمز، أو يلعب مع الكمبيوتر. تصويتك سري لين تنتهي الجولة.',
    howToWin: 'ما فيه خاسر! اللي يأخذ أكثر الأصوات في جولة ياخذ لقب الجولة، وفي النهاية نعرض مين طلع الأكثر لقباً وأصواتاً.',
};
function tally(s) {
    const counts = Object.fromEntries(s.players.map((p) => [p, 0]));
    for (const t of Object.values(s.votes))
        counts[t]++;
    const max = Math.max(...Object.values(counts));
    const winners = max > 0 ? s.players.filter((p) => counts[p] === max) : [];
    return { counts, winners, votes: { ...s.votes } };
}
function finishVoting(s, now) {
    const r = tally(s);
    for (const p of s.players)
        s.totals[p] += r.counts[p];
    for (const w of r.winners)
        s.titles[w]++;
    s.result = r;
    s.phase = 'result';
    s.endsAt = now + s.opts.resultMs;
    s.ver++;
    return s;
}
export function createMostLikelyEngine(rng = Math.random) {
    const pickQ = (used) => {
        const pool = QUESTIONS.map((_, i) => i).filter((i) => !used.includes(i));
        return pool[Math.floor(rng() * pool.length)];
    };
    return {
        info,
        init(players, now, opts) {
            const ids = players.map((p) => p.id);
            const q = pickQ([]);
            const o = { rounds: Math.min(opts?.rounds ?? 5, QUESTIONS.length), voteMs: opts?.voteMs ?? 40_000, resultMs: opts?.resultMs ?? 10_000 };
            return {
                ver: 1, opts: o, players: ids, round: 1, used: [q], question: QUESTIONS[q], phase: 'voting', endsAt: now + o.voteMs,
                votes: {}, result: null, totals: Object.fromEntries(ids.map((i) => [i, 0])), titles: Object.fromEntries(ids.map((i) => [i, 0])),
            };
        },
        apply(state, playerId, action, now) {
            if (!state.players.includes(playerId))
                return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
            if (!action || action.type !== 'vote')
                return { ok: false, error: 'حركة غير معروفة.' };
            if (state.phase !== 'voting')
                return { ok: false, error: 'التصويت مقفل الحين.' };
            if (now >= state.endsAt)
                return { ok: false, error: 'انتهى وقت التصويت.' };
            if (state.votes[playerId])
                return { ok: false, error: 'صوّت قبل.' };
            if (typeof action.target !== 'string' || !state.players.includes(action.target))
                return { ok: false, error: 'اختيار غير صالح.' };
            if (action.target === playerId)
                return { ok: false, error: 'ما تقدر تصوّت لنفسك.' };
            const s = clone(state);
            s.votes[playerId] = action.target;
            if (s.players.every((p) => s.votes[p]))
                return { ok: true, state: finishVoting(s, now) };
            return { ok: true, state: s };
        },
        tick(state, now) {
            if (state.phase === 'voting' && now >= state.endsAt)
                return finishVoting(clone(state), now);
            if (state.phase === 'result' && now >= state.endsAt) {
                const s = clone(state);
                s.ver++;
                if (s.round >= s.opts.rounds) {
                    s.phase = 'final';
                    s.endsAt = 0;
                    return s;
                }
                const q = pickQ(s.used);
                s.round++;
                s.used.push(q);
                s.question = QUESTIONS[q];
                s.phase = 'voting';
                s.votes = {};
                s.result = null;
                s.endsAt = now + s.opts.voteMs;
                return s;
            }
            return state;
        },
        view(state, playerId, now) {
            const open = state.phase !== 'voting';
            return {
                game: 'mostlikely', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, round: state.round,
                rounds: state.opts.rounds, question: state.question, players: state.players,
                // مين صوّت يظهر، لكن لمن صوّت ما يظهر إلا بعد انتهاء التصويت
                voted: Object.fromEntries(state.players.map((p) => [p, !!state.votes[p]])),
                youVoted: !!state.votes[playerId], yourVote: state.votes[playerId] ?? null,
                result: open ? state.result : null, totals: open ? state.totals : null, titles: open ? state.titles : null,
            };
        },
        botAction(state, botId, now) {
            if (state.phase !== 'voting' || !state.players.includes(botId) || state.votes[botId])
                return null;
            const others = state.players.filter((p) => p !== botId);
            return { action: { type: 'vote', target: others[Math.floor(rng() * others.length)] }, delayMs: 2500 + Math.floor(rng() * 8000) };
        },
        outcome: (s) => ({ ...topOf(s.titles), scores: s.totals }),
        isOver: (s) => s.phase === 'final',
        version: (s) => s.ver,
    };
}
