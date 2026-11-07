import { compareKey, normalizeArabic } from './arabic.js';
import { OUTSIDER_CATEGORIES } from './outsider-words.js';
import { topOf } from './util.js';
import { clone, shuffle } from './util.js';
export const info = {
    id: 'outsider',
    name: 'برا السالفة',
    icon: '🕵️',
    tagline: 'واحد ما يعرف الكلمة، اكشفوه',
    description: 'الكل يعرف كلمة سرية إلا واحد بس. كل واحد يعطي تلميح، وبعدها تكتشفون الدخيل.',
    minPlayers: 3,
    maxPlayers: 8,
    defaultSeats: 4,
    supportsBots: true,
    status: 'available',
    categories: ['party', 'words'],
    idea: 'كل جولة لها فئة (مثل أكلات) وكلمة سرية. الكل يشوف الكلمة إلا واحد، وهو «برا السالفة» ويشوف الفئة بس. كل واحد يعطي تلميح بكلمة وحدة، والدخيل يحاول يتخفّى.',
    howToStart: 'المضيف ينشئ غرفة من ثلاثة لاعبين فأكثر ويرسل الرمز، أو يلعب مع الكمبيوتر. اللعبة تعطيك دورك للتلميح بشكل تلقائي.',
    howToWin: 'بعد التلميحات الكل يصوّت مين الدخيل. إذا ما انكشف يأخذ ثلاث نقاط. إذا انكشف يحاول يخمّن الكلمة: لو صح ياخذ نقطتين، ولو غلط ياخذ كل من كشفه نقطتين.',
};
const cat = (id) => OUTSIDER_CATEGORIES.find((c) => c.id === id);
function startRound(s, now, rng) {
    const c = OUTSIDER_CATEGORIES[Math.floor(rng() * OUTSIDER_CATEGORIES.length)];
    const words = c.words.filter((w) => !s.usedWords.includes(w));
    const word = (words.length ? words : c.words)[Math.floor(rng() * (words.length || c.words.length))];
    // ما نكرر نفس الدخيل في جولتين متتاليتين إلا لو ما فيه خيار
    const candidates = s.players.filter((p) => !s.lastOutsiders.includes(p));
    const pool = candidates.length ? candidates : s.players;
    const outsider = pool[Math.floor(rng() * pool.length)];
    return {
        ...s,
        round: s.round + 1,
        phase: 'clues',
        endsAt: now + s.opts.clueMs,
        categoryId: c.id,
        word,
        outsider,
        order: shuffle(s.players, rng),
        clueIdx: 0,
        clues: [],
        votes: {},
        accused: null,
        caught: false,
        options: [],
        guess: null,
        roundPoints: Object.fromEntries(s.players.map((p) => [p, 0])),
        usedWords: [...s.usedWords, word],
        lastOutsiders: [outsider],
        ver: s.ver + 1,
    };
}
function toResult(s, now) {
    const pts = Object.fromEntries(s.players.map((p) => [p, 0]));
    if (!s.caught)
        pts[s.outsider] += 3;
    else if (s.guess !== null && normalizeArabic(s.guess) === normalizeArabic(s.word))
        pts[s.outsider] += 2;
    else
        for (const [v, t] of Object.entries(s.votes))
            if (t === s.outsider)
                pts[v] += 2;
    const totals = { ...s.totals };
    for (const p of s.players)
        totals[p] += pts[p];
    return { ...s, phase: 'result', roundPoints: pts, totals, endsAt: now + s.opts.resultMs, ver: s.ver + 1 };
}
function finishVoting(s, now, rng) {
    const counts = Object.fromEntries(s.players.map((p) => [p, 0]));
    for (const t of Object.values(s.votes))
        counts[t]++;
    const max = Math.max(...Object.values(counts));
    const top = max > 0 ? s.players.filter((p) => counts[p] === max) : [];
    const accused = top.length === 1 ? top[0] : null; // التعادل = ما انكشف أحد
    const caught = accused === s.outsider;
    const next = { ...s, accused, caught, ver: s.ver + 1 };
    if (!caught)
        return toResult(next, now);
    const others = cat(s.categoryId).words.filter((w) => w !== s.word);
    return { ...next, phase: 'guess', endsAt: now + s.opts.voteMs, ...guessOptions(next, others, rng) };
}
function guessOptions(s, others, rng) {
    // ثمانية خيارات: الكلمة الصحيحة + سبع من نفس الفئة، مرتبة أبجدياً عشان موقعها ما يدل عليها
    const options = [s.word, ...shuffle(others, rng).slice(0, 7)].sort((a, b) => compareKey(a).localeCompare(compareKey(b)));
    return { options };
}
export function createOutsiderEngine(rng = Math.random) {
    return {
        info,
        init(players, now, opts) {
            const ids = players.map((p) => p.id);
            const base = {
                ver: 0,
                opts: { rounds: opts?.rounds ?? 3, clueMs: opts?.clueMs ?? 30_000, voteMs: opts?.voteMs ?? 40_000, resultMs: opts?.resultMs ?? 12_000 },
                players: ids, round: 0, phase: 'clues', endsAt: 0, categoryId: '', word: '', outsider: '', order: [], clueIdx: 0, clues: [],
                votes: {}, accused: null, caught: false, options: [], guess: null, roundPoints: {}, totals: Object.fromEntries(ids.map((i) => [i, 0])),
                usedWords: [], lastOutsiders: [],
            };
            return startRound(base, now, rng);
        },
        apply(state, playerId, action, now) {
            if (!state.players.includes(playerId))
                return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
            if (!action || typeof action !== 'object')
                return { ok: false, error: 'حركة غير معروفة.' };
            if (now >= state.endsAt && state.endsAt !== 0)
                return { ok: false, error: 'انتهى الوقت.' };
            const s = clone(state);
            if (action.type === 'clue') {
                if (s.phase !== 'clues')
                    return { ok: false, error: 'مو وقت التلميحات.' };
                if (s.order[s.clueIdx] !== playerId)
                    return { ok: false, error: 'مو دورك.' };
                const text = normalizeArabic(String(action.text ?? '')).slice(0, 24);
                if (!text || !/^[ء-ي]+( [ء-ي]+)?$/.test(text))
                    return { ok: false, error: 'اكتب تلميح من كلمة أو كلمتين بحروف عربية.' };
                // الدخيل ما يعرف السر؛ قبول تلميحه لازم ما يكشف إذا صادفه. المنع لأهل السالفة بس.
                if (playerId !== s.outsider && compareKey(text) === compareKey(s.word))
                    return { ok: false, error: 'لا تكتب الكلمة نفسها!' };
                s.clues.push({ id: playerId, text });
                s.clueIdx++;
                s.ver++;
                if (s.clueIdx >= s.order.length) {
                    s.phase = 'voting';
                    s.endsAt = now + s.opts.voteMs;
                }
                else
                    s.endsAt = now + s.opts.clueMs;
                return { ok: true, state: s };
            }
            if (action.type === 'vote') {
                if (s.phase !== 'voting')
                    return { ok: false, error: 'التصويت مقفل الحين.' };
                if (s.votes[playerId])
                    return { ok: false, error: 'صوّت قبل.' };
                if (typeof action.target !== 'string' || !s.players.includes(action.target))
                    return { ok: false, error: 'اختيار غير صالح.' };
                if (action.target === playerId)
                    return { ok: false, error: 'ما تقدر تصوّت لنفسك.' };
                s.votes[playerId] = action.target;
                if (s.players.every((p) => s.votes[p]))
                    return { ok: true, state: finishVoting(s, now, rng) };
                return { ok: true, state: s };
            }
            if (action.type === 'guess') {
                if (s.phase !== 'guess')
                    return { ok: false, error: 'مو وقت التخمين.' };
                if (playerId !== s.outsider)
                    return { ok: false, error: 'التخمين للدخيل بس.' };
                if (typeof action.word !== 'string' || !s.options.includes(action.word))
                    return { ok: false, error: 'اختر كلمة من القائمة.' };
                s.guess = action.word;
                return { ok: true, state: toResult(s, now) };
            }
            return { ok: false, error: 'حركة غير معروفة.' };
        },
        tick(state, now) {
            if (state.phase === 'final' || state.endsAt === 0 || now < state.endsAt)
                return state;
            const s = clone(state);
            if (s.phase === 'clues') {
                s.clues.push({ id: s.order[s.clueIdx], text: '—' }); // فاته دوره
                s.clueIdx++;
                s.ver++;
                if (s.clueIdx >= s.order.length) {
                    s.phase = 'voting';
                    s.endsAt = now + s.opts.voteMs;
                }
                else
                    s.endsAt = now + s.opts.clueMs;
                return s;
            }
            if (s.phase === 'voting')
                return finishVoting(s, now, rng);
            if (s.phase === 'guess')
                return toResult(s, now);
            if (s.phase === 'result') {
                if (s.round >= s.opts.rounds)
                    return { ...s, phase: 'final', endsAt: 0, ver: s.ver + 1 };
                return startRound(s, now, rng);
            }
            return state;
        },
        view(state, playerId, now) {
            const isOut = playerId === state.outsider;
            const revealed = state.phase === 'guess' || state.phase === 'result' || state.phase === 'final';
            const done = state.phase === 'result' || state.phase === 'final';
            return {
                game: 'outsider', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, round: state.round,
                rounds: state.opts.rounds, category: cat(state.categoryId).label, players: state.players,
                // الدخيل ما يشوف الكلمة أبداً قبل النتيجة
                word: isOut && !done ? null : state.word,
                youAreOutsider: isOut,
                // هوية الدخيل تنكشف بعد التصويت (لما ينكشف) أو في النتيجة
                outsiderId: done || (revealed && state.caught) ? state.outsider : null,
                order: state.order, clueIdx: state.clueIdx, turnId: state.phase === 'clues' ? state.order[state.clueIdx] : null,
                clues: state.clues,
                voted: Object.fromEntries(state.players.map((p) => [p, !!state.votes[p]])),
                youVoted: !!state.votes[playerId],
                votes: revealed ? state.votes : null,
                accused: revealed ? state.accused : null, caught: revealed ? state.caught : null,
                options: state.phase === 'guess' && isOut ? state.options : [],
                guess: done ? state.guess : null,
                roundPoints: done ? state.roundPoints : null, totals: done ? state.totals : null,
            };
        },
        botAction(state, botId, now) {
            if (!state.players.includes(botId))
                return null;
            if (state.phase === 'clues' && state.order[state.clueIdx] === botId) {
                const words = cat(state.categoryId).words.filter((w) => compareKey(w) !== compareKey(state.word));
                return { action: { type: 'clue', text: words[Math.floor(rng() * words.length)] }, delayMs: 1500 + Math.floor(rng() * 3000) };
            }
            if (state.phase === 'voting' && !state.votes[botId]) {
                const others = state.players.filter((p) => p !== botId);
                return { action: { type: 'vote', target: others[Math.floor(rng() * others.length)] }, delayMs: 2500 + Math.floor(rng() * 6000) };
            }
            if (state.phase === 'guess' && botId === state.outsider) {
                return { action: { type: 'guess', word: state.options[Math.floor(rng() * state.options.length)] }, delayMs: 2500 + Math.floor(rng() * 4000) };
            }
            return null;
        },
        outcome: (s) => topOf(s.totals),
        isOver: (s) => s.phase === 'final',
        version: (s) => s.ver,
    };
}
