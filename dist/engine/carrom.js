import { clone, shuffle } from './util.js';
import { emit, eventsView, newLog } from './events.js';
/**
 * كيرم «حر» (Freestyle Carrom) من 2 إلى 4 لاعبين — القواعد المطبّقة (الخادم هو المرجع، وموثّقة في docs/CARROM.md):
 *  - لوحة 1000×1000 بأربع جيوب بالزوايا، 9 قطع بيضاء و9 سوداء والملكة الحمراء بالوسط.
 *  - بدورك تحط الضاربة على خط القاعدة حقك (أسفل/أعلى/يمين/يسار حسب مقعدك)، وتختار الاتجاه والقوة، والخادم يحسب الحركة كاملة (فيزياء حتمية).
 *  - النقاط: الأبيض 20، الأسود 10، الملكة 50 بشرط «تغطيتها»: تدخل قطعة ثانية بنفس الضربة أو بالضربة اللي بعدها مباشرة (لنفس اللاعب).
 *    ما غطّيتها؟ ترجع الملكة للوسط. لو ما بقى غير الملكة على اللوحة تنحسب بدون تغطية.
 *  - دخّلت قطعة (بدون مخالفة)؟ تكمل دورك. ما دخّلت شي؟ ينتقل الدور.
 *  - مخالفة: الضاربة دخلت الجيب ⇒ خصم 10 نقاط (ما تنزل عن صفر)، والقطع اللي دخلت بنفس الضربة (والملكة المعلّقة) ترجع للوسط، وينتقل الدور.
 *  - تنتهي المباراة لما تخلص القطع، والأعلى نقاطاً يفوز (التعادل = فوز مشترك). حد أمان: 300 ضربة.
 *  - المهلة: انتهى وقتك ⇒ يروح دورك بدون ضربة، وثلاث مرات ورا بعض = انسحاب.
 */
export const SIZE = 1000;
export const COIN_R = 21;
export const STRIKER_R = 28;
export const POCKET_INSET = 46;
export const POCKET_R = 34; // مركز القطعة داخل هذا النصف قطر = دخلت
export const BASE_OFF = 150; // بُعد خط القاعدة عن الحافة
export const BASE_MIN = 220, BASE_MAX = 780; // مدى الضاربة على خط القاعدة
export const MAX_SPEED = 2300;
export const POINTS = { w: 20, b: 10, q: 50 };
export const FOUL = 10;
export const MAX_SHOTS = 300;
const DT = 1 / 240, REC_EVERY = 8, MAX_STEPS = 240 * 9;
const DAMP = 0.9935, DECEL = 140, STOP_V = 6, WALL_E = 0.72, BALL_E = 0.93;
const MASS = { w: 1, b: 1, q: 1, s: 2.4 };
export const info = {
    id: 'carrom',
    name: 'كيرم',
    icon: '🎯',
    tagline: 'صوّب الضاربة ودخّل القطع بالجيوب',
    description: 'كيرم حر من 2 إلى 4 لاعبين: حط الضاربة على خطك، اسحب للخلف عشان تحدد الاتجاه والقوة، ودخّل القطع. الأبيض 20 والأسود 10 والملكة 50 لو غطّيتها.',
    minPlayers: 2,
    maxPlayers: 4,
    defaultSeats: 2,
    supportsBots: true,
    status: 'available',
    categories: ['board', 'duel'],
    idea: 'لوحة بأربع جيوب وقطع بيضاء وسوداء وملكة حمراء. كل ضربة تدخّل فيها قطعة تكمل دورك.',
    howToStart: 'أنشئ غرفة كيرم أو العب ضد الكمبيوتر. حرّك الضاربة على خطك ثم اسحب للخلف وأفلت.',
    howToWin: 'لما تخلص القطع، صاحب أعلى نقاط يفوز. الأبيض 20، الأسود 10، الملكة 50 (لازم تغطيها بقطعة ثانية). دخول الضاربة الجيب = خصم 10.',
};
export const POCKETS = [[POCKET_INSET, POCKET_INSET], [SIZE - POCKET_INSET, POCKET_INSET], [POCKET_INSET, SIZE - POCKET_INSET], [SIZE - POCKET_INSET, SIZE - POCKET_INSET]];
/** موقع الضاربة لمقعد (0 أسفل، 1 يمين، 2 أعلى، 3 يسار) و pos من 0 إلى 1 على خطه */
export function strikerAt(side, pos) {
    const t = BASE_MIN + (BASE_MAX - BASE_MIN) * pos;
    switch (side) {
        case 0: return { x: t, y: SIZE - BASE_OFF };
        case 1: return { x: SIZE - BASE_OFF, y: SIZE - t };
        case 2: return { x: SIZE - t, y: BASE_OFF };
        default: return { x: BASE_OFF, y: t };
    }
}
export function setup() {
    const p = [{ id: 'q', k: 'q', x: 500, y: 500, on: true }];
    const d1 = COIN_R * 2 + 1, d2 = COIN_R * 4 + 2;
    for (let i = 0; i < 6; i++) {
        const a = (i * 60 + 30) * Math.PI / 180;
        p.push({ id: 'i' + i, k: i % 2 ? 'b' : 'w', x: 500 + d1 * Math.cos(a), y: 500 + d1 * Math.sin(a), on: true });
    }
    for (let i = 0; i < 12; i++) {
        const a = (i * 30 + 30) * Math.PI / 180;
        const r = i % 2 ? d2 * 0.87 : d2;
        p.push({ id: 'o' + i, k: i % 2 ? 'w' : 'b', x: 500 + r * Math.cos(a), y: 500 + r * Math.sin(a), on: true });
    }
    for (const c of p) {
        c.x = Math.round(c.x * 10) / 10;
        c.y = Math.round(c.y * 10) / 10;
    }
    return p;
}
/** محاكاة حتمية كاملة للضربة. ما تستعمل أرقام عشوائية. */
export function simulate(pieces, striker, angle, power) {
    const bodies = pieces.filter((p) => p.on).map((p) => ({ id: p.id, k: p.k, x: p.x, y: p.y, vx: 0, vy: 0, r: COIN_R, m: MASS[p.k], on: true, moved: false, pts: [], inAt: -1 }));
    const sp = MAX_SPEED * Math.max(0.05, Math.min(1, power));
    const s = { id: 's', k: 's', x: striker.x, y: striker.y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, r: STRIKER_R, m: MASS.s, on: true, moved: true, pts: [], inAt: -1 };
    bodies.push(s);
    let frame = 0, step = 0;
    const rec = () => { for (const b of bodies)
        if (b.moved && (b.on || b.inAt === frame))
            b.pts.push(Math.round(b.x), Math.round(b.y)); frame++; };
    // كل قطعة تتحرك أول مرة تبدأ مسارها من الإطار الحالي (نعبّي الإطارات السابقة بموقعها الثابت)
    const startTrack = (b) => { b.moved = true; for (let i = 0; i < frame; i++)
        b.pts.push(Math.round(b.x), Math.round(b.y)); };
    rec();
    for (; step < MAX_STEPS; step++) {
        let moving = false;
        for (const b of bodies) {
            if (!b.on)
                continue;
            b.x += b.vx * DT;
            b.y += b.vy * DT;
            if (b.x - b.r < 0) {
                b.x = b.r;
                b.vx = -b.vx * WALL_E;
            }
            else if (b.x + b.r > SIZE) {
                b.x = SIZE - b.r;
                b.vx = -b.vx * WALL_E;
            }
            if (b.y - b.r < 0) {
                b.y = b.r;
                b.vy = -b.vy * WALL_E;
            }
            else if (b.y + b.r > SIZE) {
                b.y = SIZE - b.r;
                b.vy = -b.vy * WALL_E;
            }
        }
        for (let i = 0; i < bodies.length; i++) {
            const a = bodies[i];
            if (!a.on)
                continue;
            for (let j = i + 1; j < bodies.length; j++) {
                const b = bodies[j];
                if (!b.on)
                    continue;
                const dx = b.x - a.x, dy = b.y - a.y;
                const d2 = dx * dx + dy * dy;
                const rr = a.r + b.r;
                if (d2 >= rr * rr || d2 === 0)
                    continue;
                const d = Math.sqrt(d2);
                const nx = dx / d, ny = dy / d;
                const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                // فصل المتداخلين حسب الكتلة
                const over = rr - d;
                const tm = a.m + b.m;
                a.x -= nx * over * (b.m / tm);
                a.y -= ny * over * (b.m / tm);
                b.x += nx * over * (a.m / tm);
                b.y += ny * over * (a.m / tm);
                if (rel < 0) {
                    const jimp = (-(1 + BALL_E) * rel) / (1 / a.m + 1 / b.m);
                    a.vx -= (jimp / a.m) * nx;
                    a.vy -= (jimp / a.m) * ny;
                    b.vx += (jimp / b.m) * nx;
                    b.vy += (jimp / b.m) * ny;
                    if (!a.moved)
                        startTrack(a);
                    if (!b.moved)
                        startTrack(b);
                }
            }
        }
        for (const b of bodies) {
            if (!b.on)
                continue;
            for (const [px, py] of POCKETS)
                if ((b.x - px) ** 2 + (b.y - py) ** 2 < POCKET_R * POCKET_R) {
                    b.on = false;
                    b.x = px;
                    b.y = py;
                    b.inAt = frame;
                    if (!b.moved)
                        startTrack(b);
                    break;
                }
            if (!b.on)
                continue;
            const v = Math.hypot(b.vx, b.vy);
            if (v > 0) {
                const nv = Math.max(0, v * DAMP - DECEL * DT);
                if (nv < STOP_V) {
                    b.vx = 0;
                    b.vy = 0;
                }
                else {
                    b.vx *= nv / v;
                    b.vy *= nv / v;
                    moving = true;
                }
            }
        }
        if (step % REC_EVERY === REC_EVERY - 1)
            rec();
        if (!moving)
            break;
    }
    rec();
    return { bodies, frames: frame };
}
const active = (s) => s.players.map((_, i) => i).filter((i) => !s.out[i]);
const coinsOn = (s) => s.pieces.filter((p) => p.on && p.k !== 'q').length;
/** يرجّع قطعة للوسط بأقرب مكان فاضي */
function toCenter(s, p) {
    for (let r = 0; r < 400; r += 6) {
        for (let a = 0; a < 360; a += r ? Math.max(8, 360 / (r / 3)) : 360) {
            const x = 500 + r * Math.cos(a * Math.PI / 180), y = 500 + r * Math.sin(a * Math.PI / 180);
            if (s.pieces.every((o) => !o.on || o === p || (o.x - x) ** 2 + (o.y - y) ** 2 >= (COIN_R * 2 + 1) ** 2)) {
                p.x = Math.round(x * 10) / 10;
                p.y = Math.round(y * 10) / 10;
                p.on = true;
                return;
            }
        }
    }
    p.x = 500;
    p.y = 500;
    p.on = true;
}
export function createCarromEngine(rng) {
    function nextTurn(s, now) {
        const n = s.players.length;
        for (let k = 1; k <= n; k++) {
            const i = (s.turn + k) % n;
            if (!s.out[i]) {
                s.turn = i;
                break;
            }
        }
        s.endsAt = now + s.turnMs;
        s.ver++;
        emit(s, { type: 'turn', turn: s.turn });
    }
    function finish(s) {
        const act = active(s);
        const pool = act.length ? act : s.players.map((_, i) => i);
        const top = Math.max(...pool.map((i) => s.scores[i]));
        s.winners = pool.filter((i) => s.scores[i] === top);
        s.phase = 'final';
        s.endsAt = 0;
        s.ver++;
        emit(s, { type: 'win', winners: s.winners, scores: s.scores.slice() });
    }
    function shoot(s, pi, a, now) {
        const st = strikerAt(s.sides[pi], a.pos);
        const { bodies, frames } = simulate(s.pieces, st, a.angle, a.power);
        s.shots++;
        const striker = bodies.find((b) => b.k === 's');
        const inNow = bodies.filter((b) => !b.on && b.k !== 's');
        const foul = !striker.on;
        for (const b of bodies)
            if (b.k !== 's') {
                const p = s.pieces.find((x) => x.id === b.id);
                p.x = Math.round(b.x * 10) / 10;
                p.y = Math.round(b.y * 10) / 10;
                p.on = b.on;
            }
        let delta = 0;
        let queen = 'none';
        const qIn = inNow.some((b) => b.k === 'q');
        const others = inNow.filter((b) => b.k !== 'q');
        if (foul) {
            for (const b of inNow)
                toCenter(s, s.pieces.find((x) => x.id === b.id));
            if (s.queenBy === pi) {
                const q = s.pieces.find((x) => x.k === 'q');
                if (!q.on)
                    toCenter(s, q);
                s.queenBy = null;
                queen = 'returned';
            }
            delta = -Math.min(FOUL, s.scores[pi]);
        }
        else {
            for (const b of others)
                delta += POINTS[b.k];
            if (qIn) {
                if (others.length || coinsOn(s) === 0) {
                    delta += POINTS.q;
                    queen = 'covered';
                    s.queenBy = null;
                }
                else {
                    s.queenBy = pi;
                    s.queenShot = s.shots;
                    queen = 'pending';
                }
            }
            else if (s.queenBy === pi) {
                if (others.length) {
                    delta += POINTS.q;
                    queen = 'covered';
                    s.queenBy = null;
                }
                else {
                    toCenter(s, s.pieces.find((x) => x.k === 'q'));
                    s.queenBy = null;
                    queen = 'returned';
                }
            }
        }
        s.scores[pi] += delta;
        s.last = {
            n: s.shots, by: pi, side: s.sides[pi], frames, striker: st, foul, delta, queen,
            pocketed: inNow.map((b) => ({ id: b.id, k: b.k })),
            tracks: bodies.filter((b) => b.moved).map((b) => ({ id: b.id, pts: b.pts, inAt: b.inAt })),
        };
        s.ver++;
        emit(s, { type: 'shot', n: s.shots, by: pi, pocketed: s.last.pocketed.map((p) => p.k), foul, delta, queen });
        const left = s.pieces.filter((p) => p.on).length;
        if ((left === 0 && s.queenBy === null) || s.shots >= MAX_SHOTS)
            return finish(s);
        // دخّلت بدون مخالفة ⇒ تكمل؛ وإلا الدور للي بعدك
        if (!foul && inNow.length) {
            s.endsAt = now + s.turnMs;
            emit(s, { type: 'again', by: pi });
            return;
        }
        nextTurn(s, now);
    }
    /** تخطيط الكمبيوتر: يجرّب قطعة×جيب×موقع على الخط، ويختار أقرب تصويبة واضحة (بدون محاكاة: نفس الطريقة لكل مستوى) */
    function plan(s, pi, noise) {
        const side = s.sides[pi];
        let best = null;
        const coins = s.pieces.filter((p) => p.on);
        for (const c of coins)
            for (const [px, py] of POCKETS) {
                const dx = px - c.x, dy = py - c.y;
                const dd = Math.hypot(dx, dy);
                if (dd < 1)
                    continue;
                // «الكرة الشبح»: مكان الضاربة لحظة الاصطدام
                const gx = c.x - (dx / dd) * (COIN_R + STRIKER_R), gy = c.y - (dy / dd) * (COIN_R + STRIKER_R);
                for (let k = 0; k <= 10; k++) {
                    const pos = k / 10;
                    const st = strikerAt(side, pos);
                    const ax = gx - st.x, ay = gy - st.y;
                    const ad = Math.hypot(ax, ay);
                    if (ad < 1)
                        continue;
                    const cut = (ax * dx + ay * dy) / (ad * dd);
                    if (cut < 0.35)
                        continue; // زاوية قطع حادة جداً
                    if (coins.some((o) => (o.x - st.x) ** 2 + (o.y - st.y) ** 2 < (COIN_R + STRIKER_R + 2) ** 2))
                        continue;
                    // الطريق للقطعة لازم يكون فاضي تقريباً
                    const blocked = coins.some((o) => { if (o === c)
                        return false; const t = ((o.x - st.x) * ax + (o.y - st.y) * ay) / (ad * ad); if (t < 0 || t > 1)
                        return false; const qx = st.x + ax * t, qy = st.y + ay * t; return (o.x - qx) ** 2 + (o.y - qy) ** 2 < (COIN_R + STRIKER_R) ** 2; });
                    if (blocked)
                        continue;
                    const v = cut * 3 - (ad + dd) / 600 + (c.k === 'w' ? 0.4 : c.k === 'q' ? 0.6 : 0) + noise * rng();
                    if (!best || v > best.v)
                        best = { v, a: { type: 'shoot', pos, angle: Math.atan2(ay, ax), power: Math.min(1, 0.32 + (ad + dd * 1.6) / 2300) } };
                }
            }
        if (best)
            return { ...best.a, angle: best.a.angle + (rng() - 0.5) * noise * 0.04 };
        // ما فيه تصويبة واضحة: ضربة قوية للوسط
        const pos = 0.5;
        const st = strikerAt(side, pos);
        return { type: 'shoot', pos, angle: Math.atan2(500 - st.y, 500 - st.x) + (rng() - 0.5) * 0.3, power: 0.8 };
    }
    return {
        info,
        init(players, now, opts) {
            if (players.length < 2 || players.length > 4)
                throw new Error('carrom needs 2-4 players');
            const ids = shuffle(players.map((p) => p.id), rng);
            const sides = ids.length === 2 ? [0, 2] : ids.length === 3 ? [0, 1, 2] : [0, 1, 2, 3];
            const s = {
                ver: 0, turnMs: Math.max(opts?.turnMs ?? 30_000, 15_000), players: ids, sides, scores: ids.map(() => 0), pieces: setup(),
                turn: 0, phase: 'aim', endsAt: now + Math.max(opts?.turnMs ?? 30_000, 15_000), missed: ids.map(() => 0), out: ids.map(() => false), shots: 0,
                queenBy: null, queenShot: 0, last: null, winners: [], ev: newLog(),
            };
            emit(s, { type: 'start', turn: 0 });
            return s;
        },
        apply(state, playerId, action, now) {
            const pi = state.players.indexOf(playerId);
            if (pi < 0)
                return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
            if (!action || typeof action !== 'object' || action.type !== 'shoot')
                return { ok: false, error: 'حركة غير معروفة.' };
            if (state.phase === 'final')
                return { ok: false, error: 'اللعبة انتهت.' };
            if (state.out[pi])
                return { ok: false, error: 'انسحبت من هذي المباراة.' };
            if (state.turn !== pi)
                return { ok: false, error: 'مو دورك.' };
            if (now >= state.endsAt)
                return { ok: false, error: 'انتهى وقت دورك.' };
            const { pos, angle, power } = action;
            if (![pos, angle, power].every((v) => typeof v === 'number' && Number.isFinite(v)))
                return { ok: false, error: 'ضربة غير صالحة.' };
            if (pos < 0 || pos > 1 || power < 0.05 || power > 1 || Math.abs(angle) > 7)
                return { ok: false, error: 'ضربة خارج الحدود.' };
            const st = strikerAt(state.sides[pi], pos);
            if (state.pieces.some((p) => p.on && (p.x - st.x) ** 2 + (p.y - st.y) ** 2 < (COIN_R + STRIKER_R) ** 2))
                return { ok: false, error: 'الضاربة فوق قطعة؛ حرّكها على الخط.' };
            const s = clone(state);
            s.missed[pi] = 0;
            shoot(s, pi, { type: 'shoot', pos, angle, power }, now);
            return { ok: true, state: s };
        },
        tick(state, now) {
            if (state.phase === 'final' || now < state.endsAt)
                return state;
            const s = clone(state);
            const pi = s.turn;
            s.missed[pi]++;
            emit(s, { type: 'timeout', by: pi, missed: s.missed[pi] });
            if (s.queenBy === pi) {
                toCenter(s, s.pieces.find((x) => x.k === 'q'));
                s.queenBy = null;
            }
            if (s.missed[pi] >= 3) {
                s.out[pi] = true;
                emit(s, { type: 'out', by: pi });
                if (active(s).length <= 1) {
                    finish(s);
                    return s;
                }
            }
            nextTurn(s, now);
            return s;
        },
        view(state, playerId, now) {
            const pi = state.players.indexOf(playerId);
            return {
                game: 'carrom', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, turnMs: state.turnMs,
                players: state.players, sides: state.sides, me: pi, mySide: pi >= 0 ? state.sides[pi] : 0, turnId: state.players[state.turn], scores: state.scores,
                pieces: state.pieces.filter((p) => p.on).map((p) => ({ id: p.id, k: p.k, x: p.x, y: p.y })),
                counts: { w: state.pieces.filter((p) => p.on && p.k === 'w').length, b: state.pieces.filter((p) => p.on && p.k === 'b').length, q: state.pieces.some((p) => p.on && p.k === 'q') },
                queenBy: state.queenBy === null ? null : state.players[state.queenBy], shots: state.shots, out: state.out, missed: state.missed,
                last: state.last, winners: state.winners.map((i) => state.players[i]),
                canShoot: pi >= 0 && pi === state.turn && state.phase === 'aim' && !state.out[pi],
                geo: { size: SIZE, coinR: COIN_R, strikerR: STRIKER_R, pocketR: POCKET_R, inset: POCKET_INSET, baseOff: BASE_OFF, baseMin: BASE_MIN, baseMax: BASE_MAX },
                ...eventsView(state),
            };
        },
        botAction(state, botId) {
            const pi = state.players.indexOf(botId);
            if (state.phase !== 'aim' || state.turn !== pi || state.out[pi])
                return null;
            return { action: plan(state, pi, 1.2), delayMs: 1500 + Math.floor(rng() * 900) };
        },
        isOver: (s) => s.phase === 'final',
        outcome: (s) => ({ winners: s.winners.map((i) => s.players[i]), scores: Object.fromEntries(s.players.map((p, i) => [p, s.scores[i]])) }),
        version: (s) => s.ver,
    };
}
