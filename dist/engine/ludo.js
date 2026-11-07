import { clone, shuffle } from './util.js';
import { emit, eventsView, newLog } from './events.js';
/**
 * لودو الكلاسيكية: 2 إلى 4 لاعبين، لكل لاعب 4 قطع.
 * «التقدم» لكل قطعة: -1 = في البيت، 0..50 = على الدائرة (0 = خانة بدايتك)، 51..55 = ممر الأمان، 56 = وصلت النهاية.
 *  - الزهر يرميه الخادم (ما يتلاعب فيه أحد). تطلع القطعة من البيت برقم 6 فقط.
 *  - 6، أو كسر قطعة، أو وصول قطعة للنهاية = دور إضافي. ثلاث ستات ورا بعض = يضيع الدور.
 *  - النزول فوق قطعة خصم يرجّعها للبيت، إلا لو الخانة آمنة (خانات البداية والخانات المنجمة).
 *  - النهاية بالرقم المضبوط. أول لاعب توصل قطعه الأربع يفوز.
 */
export const RING = 52;
export const FINISH = 56;
export const LANE_START = 51;
const SAFE_OFFSETS = [0, 8];
export const info = {
    id: 'ludo',
    name: 'لودو',
    icon: '🎲',
    tagline: 'ارمِ الزهر ووصّل قطعك الأربع للنهاية',
    description: 'لودو الكلاسيكية: من 2 إلى 4 لاعبين، زهر، قطع تنكسر وترجع للبيت، وأول واحد يوصّل قطعه كلها يفوز.',
    minPlayers: 2,
    maxPlayers: 4,
    defaultSeats: 4,
    supportsBots: true,
    status: 'available',
    categories: ['board'],
    idea: 'لكل لاعب أربع قطع. ترمي الزهر وتحرك قطعة بعدد النقاط. 6 تطلّع قطعة من البيت وتعطيك دور إضافي.',
    howToStart: 'أنشئ غرفة من قسم لودو، أو ابحث عن لاعبين، أو العب ضد الكمبيوتر. ما تحتاج تجهّز شي.',
    howToWin: 'أول لاعب توصل قطعه الأربع للنهاية (بالرقم المضبوط) يفوز. النزول فوق قطعة خصم يرجّعها للبيت، وخانات النجمة والبداية آمنة.',
};
export const seatsFor = (n) => (n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n));
export const absOf = (s, pi, prog) => prog >= 0 && prog <= 50 ? (s.seats[pi] * 13 + prog) % RING : null;
export const isSafeAbs = (abs) => SAFE_OFFSETS.includes(abs % 13);
const isInt = (n) => Number.isInteger(n);
export function legalMoves(s, pi) {
    if (s.phase !== 'move' || s.roll === null)
        return [];
    const out = [];
    s.tokens[pi].forEach((p, t) => {
        let to;
        if (p === -1) {
            if (s.roll !== 6)
                return;
            to = 0;
        }
        else if (p === FINISH)
            return;
        else {
            to = p + s.roll;
            if (to > FINISH)
                return;
        }
        const abs = absOf(s, pi, to);
        const caps = [];
        if (abs !== null && !isSafeAbs(abs)) {
            s.players.forEach((_, o) => {
                if (o === pi)
                    return;
                s.tokens[o].forEach((q, k) => { if (absOf(s, o, q) === abs)
                    caps.push({ owner: o, token: k }); });
            });
        }
        out.push({ token: t, to, kind: p === -1 ? 'enter' : to === FINISH ? 'finish' : 'move', captures: caps });
    });
    return out;
}
function nextTurn(s, now, bonus) {
    if (!bonus) {
        for (let k = 1; k <= s.players.length; k++) {
            const i = (s.turn + k) % s.players.length;
            if (!s.out[i]) {
                s.turn = i;
                break;
            }
        }
        s.sixes = 0;
    }
    s.phase = 'roll';
    s.roll = null;
    s.endsAt = now + s.turnMs;
    s.ver++;
    emit(s, { type: 'turn', turn: s.turn, bonus });
}
function doRoll(s, pi, rng, now) {
    const r = 1 + Math.floor(rng() * 6);
    s.roll = r;
    s.ver++;
    // «ورا بعض»: أي رقم غير 6 يقطع السلسلة (حتى لو جاك بونص من كسر/وصول)
    s.sixes = r === 6 ? s.sixes + 1 : 0;
    emit(s, { type: 'roll', by: pi, roll: r, sixes: s.sixes });
    if (s.sixes >= 3) {
        emit(s, { type: 'triple', by: pi });
        s.last = { by: pi, roll: r, kind: 'triple' };
        nextTurn(s, now, false);
        return;
    }
    s.phase = 'move';
    s.last = { by: pi, roll: r, kind: 'roll' };
    const moves = legalMoves(s, pi);
    if (!moves.length) {
        emit(s, { type: 'nomove', by: pi, roll: r });
        s.last = { by: pi, roll: r, kind: 'nomove' };
        nextTurn(s, now, false);
        return;
    }
    s.endsAt = now + s.turnMs;
}
function doMove(s, pi, mv, now) {
    const roll = s.roll;
    const from = s.tokens[pi][mv.token];
    const capFrom = mv.captures.map((c) => s.tokens[c.owner][c.token]);
    s.tokens[pi][mv.token] = mv.to;
    for (const c of mv.captures)
        s.tokens[c.owner][c.token] = -1;
    const kind = mv.captures.length ? 'capture' : mv.kind === 'finish' ? 'finish' : mv.kind === 'enter' ? 'enter' : 'move';
    s.last = { by: pi, roll, kind, token: mv.token };
    emit(s, { type: 'move', by: pi, token: mv.token, from, to: mv.to, kind: mv.kind, roll });
    mv.captures.forEach((c, i) => emit(s, { type: 'capture', by: pi, owner: c.owner, token: c.token, from: capFrom[i] }));
    if (s.tokens[pi].every((p) => p === FINISH)) {
        emit(s, { type: 'win', winner: pi });
        s.phase = 'final';
        s.winner = pi;
        s.endsAt = 0;
        s.roll = null;
        s.ver++;
        return;
    }
    nextTurn(s, now, roll === 6 || mv.captures.length > 0 || mv.kind === 'finish');
}
export function createLudoEngine(rng) {
    const rate = (s, pi, m) => {
        let v = 0;
        const from = s.tokens[pi][m.token];
        if (m.kind === 'finish')
            v += 100;
        v += m.captures.length * 80 + m.captures.reduce((a, c) => a + s.tokens[c.owner][c.token], 0) * 0.5;
        if (m.kind === 'enter')
            v += 45;
        if (m.to >= LANE_START)
            v += 25;
        const abs = absOf(s, pi, m.to);
        if (abs !== null && isSafeAbs(abs))
            v += 15;
        // قطعة معرّضة قبل الحركة: نهرّبها
        const fa = absOf(s, pi, from);
        if (fa !== null && !isSafeAbs(fa))
            v += 10;
        v += (m.to - from) * 0.3 + from * 0.1;
        return v + rng() * 2;
    };
    return {
        info,
        init(players, now, opts) {
            if (players.length < 2 || players.length > 4)
                throw new Error('ludo needs 2-4 players');
            const ids = shuffle(players.map((p) => p.id), rng);
            const turnMs = Math.max(opts?.turnMs ?? 30_000, 15_000);
            return {
                ver: 1, turnMs, players: ids, seats: seatsFor(ids.length), tokens: ids.map(() => [-1, -1, -1, -1]), turn: 0, phase: 'roll', roll: null, sixes: 0,
                endsAt: now + turnMs, winner: null, missed: ids.map(() => 0), out: ids.map(() => false), last: null, ev: newLog(),
            };
        },
        apply(state, playerId, action, now) {
            const pi = state.players.indexOf(playerId);
            if (pi < 0)
                return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
            if (!action || typeof action !== 'object')
                return { ok: false, error: 'حركة غير معروفة.' };
            if (state.phase === 'final')
                return { ok: false, error: 'اللعبة انتهت.' };
            if (state.turn !== pi)
                return { ok: false, error: 'مو دورك.' };
            if (now >= state.endsAt)
                return { ok: false, error: 'انتهى وقت دورك.' };
            const s = clone(state);
            s.missed[pi] = 0;
            if (action.type === 'roll') {
                if (s.phase !== 'roll')
                    return { ok: false, error: 'اختر قطعة تحركها.' };
                doRoll(s, pi, rng, now);
                return { ok: true, state: s };
            }
            if (action.type === 'move') {
                if (s.phase !== 'move')
                    return { ok: false, error: 'ارمِ الزهر أول.' };
                if (!isInt(action.token))
                    return { ok: false, error: 'حركة غير صالحة.' };
                const mv = legalMoves(s, pi).find((m) => m.token === action.token);
                if (!mv)
                    return { ok: false, error: 'هذي القطعة ما تتحرك بهذا الرقم.' };
                doMove(s, pi, mv, now);
                return { ok: true, state: s };
            }
            return { ok: false, error: 'حركة غير معروفة.' };
        },
        tick(state, now) {
            if (state.phase === 'final' || now < state.endsAt)
                return state;
            const s = clone(state);
            const pi = s.turn;
            s.missed[pi]++;
            emit(s, { type: 'timeout', by: pi, missed: s.missed[pi] });
            if (s.missed[pi] >= 3) {
                emit(s, { type: 'out', by: pi, lost: s.tokens[pi].slice() });
                s.out[pi] = true;
                s.tokens[pi] = [-1, -1, -1, -1];
                const left = s.players.map((_, i) => i).filter((i) => !s.out[i]);
                if (left.length === 1) {
                    emit(s, { type: 'win', winner: left[0] });
                    s.phase = 'final';
                    s.winner = left[0];
                    s.endsAt = 0;
                    s.ver++;
                    return s;
                }
                nextTurn(s, now, false);
                return s;
            }
            const keep = s.missed[pi];
            if (s.phase === 'roll')
                doRoll(s, pi, rng, now);
            if (s.phase === 'move') {
                const moves = legalMoves(s, pi);
                if (moves.length)
                    doMove(s, pi, moves[Math.floor(rng() * moves.length)], now);
            }
            s.missed[pi] = keep;
            return s;
        },
        view(state, playerId, now) {
            const pi = state.players.indexOf(playerId);
            const mine = pi === state.turn && state.phase !== 'final';
            return {
                game: 'ludo', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, players: state.players, seats: state.seats,
                tokens: state.tokens, turnId: state.players[state.turn], roll: state.roll, last: state.last, out: state.out,
                canRoll: mine && state.phase === 'roll', moves: mine && state.phase === 'move' ? legalMoves(state, pi) : [],
                winner: state.winner === null ? null : state.players[state.winner],
                done: state.tokens.map((t) => t.filter((p) => p === FINISH).length),
                ...eventsView(state),
            };
        },
        botAction(state, botId) {
            const pi = state.players.indexOf(botId);
            if (state.phase === 'final' || state.turn !== pi)
                return null;
            if (state.phase === 'roll')
                return { action: { type: 'roll' }, delayMs: 900 + Math.floor(rng() * 800) };
            const moves = legalMoves(state, pi);
            if (!moves.length)
                return null;
            let best = moves[0], bv = -Infinity;
            for (const m of moves) {
                const v = rate(state, pi, m);
                if (v > bv) {
                    bv = v;
                    best = m;
                }
            }
            return { action: { type: 'move', token: best.token }, delayMs: 900 + Math.floor(rng() * 900) };
        },
        isOver: (s) => s.phase === 'final',
        outcome: (s) => ({ winners: s.winner === null ? [] : [s.players[s.winner]], scores: Object.fromEntries(s.players.map((p, i) => [p, s.tokens[i].filter((x) => x === FINISH).length])) }),
        version: (s) => s.ver,
    };
}
