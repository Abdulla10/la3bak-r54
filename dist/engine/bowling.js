import { clone } from './util.js';
import { emit, eventsView, newLog } from './events.js';
// نفس ملف الفيزياء اللي يستخدمه المتصفح (الرسم يطلع مطابق للخادم)
// @ts-ignore — ملف JS عادي خارج src
import * as PH from '../../public/bowling-physics.js';
const P = PH;
/**
 * بولينغ (R68z20) — 2 إلى 4 لاعبين، 5 إطارات (مثل الفيديو).
 *  - كل إطار رميتين. «سترايك» = العشرة من أول رمية، «سبير» = العشرة بالرميتين.
 *  - الإطار الأخير: لو سويت سترايك أو سبير تاخذ رمية زيادة.
 *  - الحساب نفس البولينغ الحقيقي (بونص السترايك والسبير).
 *  - مهلة الرمية: تنحسب صفر. ثلاث مهلات ورا بعض = يطلع من اللعبة (كل رمياته الباقية صفر).
 */
export const FRAMES = 5;
export const info = {
    id: 'bowling', name: 'بولينغ', icon: '🎳', tagline: 'اسحب الكرة وطيّح الدبابيس العشرة',
    description: 'بولينغ أونلاين: حدد مكانك واسحب الكرة لقدام، تحكم بالقوة والانحناء، واجمع أعلى نقاط بخمس إطارات.',
    minPlayers: 2, maxPlayers: 4, defaultSeats: 2, supportsBots: true, status: 'available', categories: ['duel'],
    idea: 'كل لاعب يرمي رميتين بكل إطار. حرّك الكرة يمين ويسار، وبعدها اسحبها لفوق: أسرع سحبة = أقوى رمية، ولو لفّيت إصبعك تنحني الكرة.',
    howToStart: 'أنشئ غرفة بولينغ وادعُ ربعك، أو العب ضد الكمبيوتر. الخادم يحسب كل رمية.',
    howToWin: 'أعلى مجموع بعد 5 إطارات يفوز. السترايك يعطيك بونص الرميتين اللي بعده، والسبير بونص رمية.',
};
const animMs = (steps) => Math.min(8000, Math.round(steps * 1000 / 120) + 1600);
export function createBowlingEngine(rng) {
    const scores = (s) => s.rolls.map((r) => P.scoreOf(r, FRAMES));
    const turnPi = (s) => s.order[s.cur];
    const frameRolls = (s, pi) => (s.rolls[pi][s.frame] ??= []);
    function finish(s, now) {
        const sc = scores(s).map((x) => x.total);
        const best = Math.max(...s.players.map((_, i) => (s.out[i] ? -1 : sc[i])));
        s.winners = s.players.map((_, i) => i).filter((i) => !s.out[i] && sc[i] === best);
        s.phase = 'final';
        s.endsAt = now;
        s.ver++;
        s.msg = s.winners.length > 1 ? 'تعادل!' : `فاز بـ ${best} نقطة`;
        emit(s, { type: 'win', by: s.winners });
    }
    /** بعد الرمية: نفس اللاعب يكمل إطاره، أو اللي بعده */
    function advance(s, now, delay) {
        const pi = turnPi(s);
        const fr = frameRolls(s, pi);
        const last = s.frame === FRAMES - 1;
        let frameDone;
        if (!last)
            frameDone = fr[0] === 10 || fr.length === 2;
        else
            frameDone = fr.length === 3 || (fr.length === 2 && fr[0] + fr[1] < 10);
        if (!frameDone) {
            s.endsAt = now + delay + s.turnMs;
            s.ver++;
            return;
        }
        // الإطار خلص لهاللاعب → اللي بعده
        s.standing = Array(10).fill(true);
        for (let k = 0; k < s.order.length * (FRAMES + 1); k++) {
            s.cur++;
            if (s.cur >= s.order.length) {
                s.cur = 0;
                s.frame++;
            }
            if (s.frame >= FRAMES) {
                finish(s, now + delay);
                return;
            }
            const nx = turnPi(s);
            if (!s.out[nx])
                break;
            s.rolls[nx][s.frame] = [0, 0]; // اللي طلع: صفر
        }
        s.endsAt = now + delay + s.turnMs;
        s.ver++;
    }
    function roll(s, pi, shot, now) {
        const before = [...s.standing];
        const r = P.simulate(before, shot);
        for (const i of r.knocked)
            s.standing[i] = false;
        const fr = frameRolls(s, pi);
        const n = r.knocked.length;
        fr.push(n);
        const allDown = s.standing.every((x) => !x);
        const first = fr.length === 1 || (s.frame === FRAMES - 1 && before.every(Boolean));
        const mark = allDown ? (first ? 'strike' : 'spare') : r.gutter ? 'gutter' : '';
        s.last = { by: pi, shot, before, knocked: r.knocked, gutter: r.gutter, steps: r.steps, mark };
        s.shotNo++;
        s.missed[pi] = 0;
        s.msg = mark === 'strike' ? 'سترايك! 🎳' : mark === 'spare' ? 'سبير! 👏' : mark === 'gutter' ? 'طاحت بالمجرى' : `طيّح ${n} ${n === 1 ? 'دبوس' : 'دبابيس'}`;
        emit(s, { type: 'roll', by: pi, n, mark });
        // الإطار الأخير: بعد سترايك أو سبير الدبابيس ترجع
        if (s.frame === FRAMES - 1 && allDown && fr.length < 3)
            s.standing = Array(10).fill(true);
        advance(s, now, animMs(r.steps));
    }
    /* ---------- الكمبيوتر ---------- */
    function botShot(s) {
        const up = s.standing.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
        // يجرّب رميات ويختار اللي تطيّح أكثر، مع شوية خطأ بشري
        let best = null;
        for (let k = 0; k < 5; k++) {
            const sh = P.normShot({ x0: (rng() - 0.5) * 50, aim: (rng() - 0.5) * 0.02, spin: (rng() - 0.5) * 1.2, power: 0.65 + rng() * 0.35 });
            const n = P.simulate(s.standing, sh).knocked.length;
            if (!best || n > best.n)
                best = { sh, n };
            if (n === up.length)
                break;
        }
        const sh = best.sh;
        const j = P.normShot({ x0: sh.x0 + (rng() - 0.5) * 12, aim: sh.aim + (rng() - 0.5) * 0.005, spin: sh.spin, power: sh.power });
        return { type: 'throw', ...j };
    }
    return {
        info,
        init(players, now, opts) {
            const n = players.length;
            return { ver: 0, turnMs: Math.min(opts?.turnMs ?? 25_000, 25_000), players: players.map((p) => p.id), order: Array.from({ length: n }, (_, i) => i), cur: 0, frame: 0, phase: 'aim',
                endsAt: now + 25_000, standing: Array(10).fill(true), rolls: players.map(() => []), missed: players.map(() => 0), out: players.map(() => false), last: null, shotNo: 0, msg: '', winners: [], ev: newLog() };
        },
        apply(state, playerId, action, now) {
            const pi = state.players.indexOf(playerId);
            if (pi < 0)
                return { ok: false, error: 'أنت مو لاعب بهالمباراة.' };
            if (state.phase !== 'aim')
                return { ok: false, error: 'المباراة خلصت.' };
            if (turnPi(state) !== pi)
                return { ok: false, error: 'مو دورك.' };
            if (!action || action.type !== 'throw' || ![action.x0, action.aim, action.spin, action.power].every((v) => Number.isFinite(Number(v))))
                return { ok: false, error: 'رمية غير صالحة.' };
            if (now < state.endsAt - state.turnMs)
                return { ok: false, error: 'انتظر الدبابيس تترتب.' };
            const s = clone(state);
            roll(s, pi, P.normShot(action), now);
            return { ok: true, state: s };
        },
        tick(state, now) {
            if (state.phase === 'final' || now < state.endsAt)
                return state;
            const s = clone(state);
            const pi = turnPi(s);
            s.missed[pi]++;
            emit(s, { type: 'timeout', by: pi });
            if (s.missed[pi] >= 3) {
                s.out[pi] = true;
                s.msg = 'خلص وقته 3 مرات وطلع';
                const fr = frameRolls(s, pi);
                while (fr.length < 2 && !(fr[0] === 10))
                    fr.push(0);
                if (s.out.filter((o) => !o).length <= 1) {
                    finish(s, now);
                    return s;
                }
                s.standing = Array(10).fill(true);
                s.last = null;
                advanceAfterOut(s, now);
                return s;
            }
            // مهلة = رمية صفر
            s.last = null;
            const fr = frameRolls(s, pi);
            fr.push(0);
            s.msg = 'خلص الوقت — صفر';
            advance(s, now, 0);
            return s;
        },
        view(state, playerId, now) {
            const pi = state.players.indexOf(playerId);
            const sc = scores(state);
            return { game: 'bowling', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, turnMs: state.turnMs, players: state.players, you: pi,
                turnId: state.phase === 'aim' ? state.players[turnPi(state)] : null, frame: state.frame, frames: FRAMES, standing: state.standing,
                rolls: state.rolls, scores: sc, out: state.out, shotNo: state.shotNo, last: state.last ? { ...state.last, by: state.players[state.last.by] } : null,
                msg: state.msg, winners: state.winners.map((i) => state.players[i]), ...eventsView(state) };
        },
        botAction(state, botId, now) {
            const pi = state.players.indexOf(botId);
            if (pi < 0 || state.phase !== 'aim' || turnPi(state) !== pi)
                return null;
            const wait = Math.max(0, state.endsAt - state.turnMs - now);
            return { action: botShot(state), delayMs: wait + 1200 + Math.floor(rng() * 1200) };
        },
        isOver: (s) => s.phase === 'final',
        outcome: (s) => ({ winners: s.winners.map((i) => s.players[i]) }),
        version: (s) => s.ver,
    };
    function advanceAfterOut(s, now) {
        for (let k = 0; k < s.order.length * (FRAMES + 1); k++) {
            s.cur++;
            if (s.cur >= s.order.length) {
                s.cur = 0;
                s.frame++;
            }
            if (s.frame >= FRAMES) {
                finish(s, now);
                return;
            }
            const nx = turnPi(s);
            if (!s.out[nx])
                break;
            s.rolls[nx][s.frame] = [0, 0];
        }
        s.endsAt = now + s.turnMs;
        s.ver++;
    }
}
