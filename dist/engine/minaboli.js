import { clone, shuffle } from './util.js';
import { emit, eventsView, newLog } from './events.js';
/** Original R47 rules, not a reference-game reproduction. All money is match-only. */
export const MAX_TURNS = 120;
export const START_CASH = 1_200;
export const START_BONUS = 100;
export const JAIL_FINE = 50;
export const DEFAULT_TURN_MS = 45_000;
export const MAX_BUILDINGS = 3;
const districts = ['الواحة', 'النخيل', 'الساحة', 'المرسى', 'المنارة', 'الحديقة', 'الروابي', 'الأفق'];
const pairs = [[1, 2], [4, 5], [7, 8], [10, 11], [13, 14], [16, 17], [19, 20], [22, 23]];
const specials = {
    0: { name: 'بوابة البداية', kind: 'start' }, 3: { name: 'رسالة الحي', kind: 'chance' },
    6: { name: 'مركز التوقيف', kind: 'jail' }, 9: { name: 'صيانة المرافق', kind: 'tax', amount: 70 },
    12: { name: 'استراحة الساحة', kind: 'park' }, 15: { name: 'رسالة الجوار', kind: 'chance' },
    18: { name: 'أمر توقيف', kind: 'goJail' }, 21: { name: 'رسم الخدمات', kind: 'tax', amount: 100 },
};
export const BOARD = Object.freeze(Array.from({ length: 24 }, (_, id) => {
    if (specials[id])
        return Object.freeze({ id, ...specials[id] });
    const group = pairs.findIndex((p) => p.includes(id));
    return Object.freeze({ id, name: `${districts[group]} ${pairs[group][0] === id ? 'الشرقية' : 'الغربية'}`,
        kind: 'property', group, price: 100 + group * 40, rent: 15 + group * 5, buildCost: 50 + group * 10 });
}));
export const info = {
    id: 'minaboli', name: 'مينابولي', icon: '▦', tagline: 'أملاك وأحياء وقرارات تصنع الفوز',
    description: 'لعبة أملاك أصلية من 2 إلى 4 لاعبين: لوحة 24 خانة وشراء وإيجار وبناء ورهن وسجن وإفلاس. نقود المباراة منفصلة تمامًا عن محفظة المنصة.',
    minPlayers: 2, maxPlayers: 4, defaultSeats: 4, supportsBots: true, status: 'available', categories: ['board', 'party'],
    idea: 'ابدأ بـ1200 من نقود المباراة، اشترِ أحياء كاملة وابنِ بالتساوي. الرهن يوقف إيجار العقار. لا تجارة أو تحويل يدوي.',
    howToStart: 'ابدأ غرفة مع أصدقائك أو بوتات. يرمي الخادم نردَي الحركة، ثم تختار من الحركات القانونية المعروضة. مهلة الدور كاملة 45 ثانية افتراضيًا.',
    howToWin: 'آخر لاعب غير مفلس يفوز؛ أو بعد 120 دورًا مكتملًا يفوز الأعلى بصافي الأصول (التعادل مشترك). ثلاث مهلات متتالية انسحاب. النقود لا تتحول إلى Coins أو Gems.',
};
const groupTiles = (tile) => BOARD.filter((t) => t.kind === 'property' && t.group === BOARD[tile]?.group);
const active = (s) => s.players.map((_, i) => i).filter((i) => !s.out[i]);
export const mortgageValue = (tile) => Math.floor((BOARD[tile]?.price ?? 0) / 2);
export const unmortgageCost = (tile) => Math.ceil(mortgageValue(tile) * 110 / 100);
/** Cash + purchase value of unmortgaged land / half value of mortgaged land + building cost. */
export function netAssets(s, pi) {
    if (pi < 0 || pi >= s.players.length || s.out[pi])
        return 0;
    return s.cash[pi] + s.properties.reduce((sum, p, tile) => p.owner === pi
        ? sum + (p.mortgaged ? mortgageValue(tile) : BOARD[tile].price) + p.buildings * BOARD[tile].buildCost : sum, 0);
}
export function liquidationValue(s, pi) {
    return s.cash[pi] + s.properties.reduce((sum, p, tile) => p.owner === pi
        ? sum + (p.mortgaged ? 0 : mortgageValue(tile)) + p.buildings * Math.floor(BOARD[tile].buildCost / 2) : sum, 0);
}
export function rentFor(s, tile) {
    const p = s.properties[tile], t = BOARD[tile];
    if (!p || t?.kind !== 'property' || p.owner === null || p.mortgaged || s.out[p.owner])
        return 0;
    const full = groupTiles(tile).every((x) => s.properties[x.id].owner === p.owner && !s.properties[x.id].mortgaged);
    return t.rent * (p.buildings ? [1, 3, 6, 10][p.buildings] : full ? 2 : 1);
}
/** Only the acting seat sees commands; spectators see the same public board and balances. */
export function legalMoves(s, pi, now = -Infinity) {
    if (pi < 0 || pi !== s.turn || s.out[pi] || s.phase === 'final' || now >= s.endsAt)
        return [];
    const moves = [];
    const add = (action, label, cost, gain) => moves.push({ action, label, ...(cost === undefined ? {} : { cost }), ...(gain === undefined ? {} : { gain }) });
    if (s.phase === 'roll')
        add({ type: 'roll' }, 'رمي الحركة');
    if (s.phase === 'jail') {
        add({ type: 'rollJail' }, 'محاولة الخروج بزوج متساوٍ');
        if (s.cash[pi] >= JAIL_FINE)
            add({ type: 'payJail' }, 'دفع كفالة والخروج', JAIL_FINE);
    }
    if (s.phase === 'buy' && s.pending?.kind === 'buy') {
        const t = BOARD[s.pending.tile];
        if (s.cash[pi] >= t.price)
            add({ type: 'buy' }, `شراء ${t.name}`, t.price);
        add({ type: 'decline' }, 'رفض الشراء');
    }
    if (s.phase === 'manage')
        add({ type: 'end' }, 'إنهاء الدور');
    for (const t of BOARD) {
        const p = s.properties[t.id];
        if (t.kind !== 'property' || p.owner !== pi)
            continue;
        const group = groupTiles(t.id).map((q) => s.properties[q.id]);
        if (p.buildings > 0 && p.buildings === Math.max(...group.map((q) => q.buildings)))
            add({ type: 'sell', tile: t.id }, `بيع مبنى · ${t.name}`, undefined, Math.floor(t.buildCost / 2));
        if (!p.mortgaged && group.every((q) => q.buildings === 0))
            add({ type: 'mortgage', tile: t.id }, `رهن · ${t.name}`, undefined, mortgageValue(t.id));
        if (s.phase !== 'debt' && p.mortgaged && s.cash[pi] >= unmortgageCost(t.id))
            add({ type: 'unmortgage', tile: t.id }, `فك رهن · ${t.name}`, unmortgageCost(t.id));
        if (s.phase === 'manage' && group.every((q) => q.owner === pi && !q.mortgaged)
            && p.buildings < MAX_BUILDINGS && p.buildings === Math.min(...group.map((q) => q.buildings)) && s.cash[pi] >= t.buildCost)
            add({ type: 'build', tile: t.id }, `بناء · ${t.name}`, t.buildCost);
    }
    return moves;
}
function finish(s, reason) {
    const left = active(s), top = Math.max(...left.map((i) => netAssets(s, i)));
    s.winners = left.filter((i) => reason === 'lastPlayer' || netAssets(s, i) === top).map((i) => s.players[i]);
    s.endReason = reason;
    s.phase = 'final';
    s.pending = null;
    s.endsAt = 0;
    emit(s, { type: 'finish', reason, winners: s.winners.slice(), scores: s.players.map((_, i) => netAssets(s, i)) });
}
function advance(s, now) {
    s.completedTurns++;
    s.pending = null;
    s.lastRoll = null;
    if (active(s).length <= 1)
        return finish(s, 'lastPlayer');
    if (s.completedTurns >= MAX_TURNS)
        return finish(s, 'turnLimit');
    for (let k = 1; k <= s.players.length; k++) {
        const i = (s.turn + k) % s.players.length;
        if (!s.out[i]) {
            s.turn = i;
            break;
        }
    }
    s.phase = s.jailed[s.turn] ? 'jail' : 'roll';
    s.endsAt = now + s.turnMs;
    emit(s, { type: 'turn', by: s.turn, completedTurns: s.completedTurns });
}
/** Bankruptcy releases all deeds to the bank; only remaining cash goes to the creditor. */
function eliminate(s, pi, now, kind) {
    const debt = pi === s.turn && s.pending?.kind === 'debt' ? s.pending : null;
    if (debt?.creditor !== null && debt?.creditor !== undefined && !s.out[debt.creditor])
        s.cash[debt.creditor] += Math.min(s.cash[pi], debt.amount);
    s.cash[pi] = 0;
    s.out[pi] = true;
    s.jailed[pi] = false;
    s.jailTurns[pi] = 0;
    for (const p of s.properties)
        if (p.owner === pi) {
            p.owner = null;
            p.buildings = 0;
            p.mortgaged = false;
        }
    emit(s, { type: kind, by: pi });
    if (active(s).length <= 1)
        finish(s, 'lastPlayer');
    else if (pi === s.turn)
        advance(s, now);
    else if (s.pending?.kind === 'debt' && s.pending.creditor === pi)
        s.pending.creditor = null;
}
function sendToJail(s) {
    s.positions[s.turn] = 6;
    s.jailed[s.turn] = true;
    s.jailTurns[s.turn] = 0;
    s.phase = 'manage';
    s.pending = null;
    emit(s, { type: 'jail', by: s.turn });
}
function resumeDebt(s, resume, rng, now) {
    s.phase = 'manage';
    if (resume === 'move') {
        s.jailed[s.turn] = false;
        s.jailTurns[s.turn] = 0;
        move(s, s.lastRoll[0] + s.lastRoll[1], rng, now);
    }
}
function settleDebt(s, rng, now) {
    if (s.pending?.kind !== 'debt')
        return;
    const d = s.pending, pi = s.turn;
    if (s.cash[pi] >= d.amount) {
        s.cash[pi] -= d.amount;
        if (d.creditor !== null && !s.out[d.creditor])
            s.cash[d.creditor] += d.amount;
        s.pending = null;
        emit(s, { type: 'payment', by: pi, amount: d.amount, creditor: d.creditor, reason: d.reason });
        resumeDebt(s, d.resume, rng, now);
    }
    else if (liquidationValue(s, pi) < d.amount) {
        // Realise the remaining asset value first, so a creditor receives available proceeds.
        s.cash[pi] = liquidationValue(s, pi);
        eliminate(s, pi, now, 'bankrupt');
    }
}
function charge(s, amount, creditor, reason, resume, rng, now) {
    s.pending = { kind: 'debt', amount, creditor, reason, resume };
    s.phase = 'debt';
    settleDebt(s, rng, now);
}
function land(s, rng, now) {
    const pi = s.turn, tile = s.positions[pi], t = BOARD[tile], p = s.properties[tile];
    s.phase = 'manage';
    s.pending = null;
    emit(s, { type: 'land', by: pi, tile });
    if (t.kind === 'property') {
        if (p.owner === null) {
            s.phase = 'buy';
            s.pending = { kind: 'buy', tile };
        }
        else if (p.owner !== pi && rentFor(s, tile))
            charge(s, rentFor(s, tile), p.owner, `إيجار ${t.name}`, 'manage', rng, now);
    }
    else if (t.kind === 'tax')
        charge(s, t.amount, null, t.name, 'manage', rng, now);
    else if (t.kind === 'goJail')
        sendToJail(s);
    else if (t.kind === 'chance') {
        const card = Math.floor(rng() * 4);
        emit(s, { type: 'card', by: pi, card });
        if (card === 0)
            s.cash[pi] += 60;
        else if (card === 1)
            charge(s, 50, null, 'مساهمة الجوار', 'manage', rng, now);
        else if (card === 2) {
            s.positions[pi] = 0;
            s.cash[pi] += START_BONUS;
        }
        else
            sendToJail(s);
    }
}
function move(s, distance, rng, now) {
    const pi = s.turn, to = s.positions[pi] + distance;
    if (to >= BOARD.length) {
        s.cash[pi] += START_BONUS;
        emit(s, { type: 'startBonus', by: pi, amount: START_BONUS });
    }
    s.positions[pi] = to % BOARD.length;
    land(s, rng, now);
}
function rollDice(s, rng) {
    const dice = [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
    s.lastRoll = dice;
    emit(s, { type: 'roll', by: s.turn, dice: dice.slice() });
    return dice;
}
function roll(s, rng, now) {
    const dice = rollDice(s, rng);
    move(s, dice[0] + dice[1], rng, now);
}
function jailRoll(s, rng, now) {
    const pi = s.turn, dice = rollDice(s, rng);
    if (dice[0] === dice[1]) {
        s.jailed[pi] = false;
        s.jailTurns[pi] = 0;
        move(s, dice[0] + dice[1], rng, now);
    }
    else if (++s.jailTurns[pi] >= 3)
        charge(s, JAIL_FINE, null, 'كفالة المحاولة الثالثة', 'move', rng, now);
    else
        advance(s, now);
}
function deedAction(s, action) {
    if (!('tile' in action))
        return;
    const p = s.properties[action.tile], t = BOARD[action.tile], pi = s.turn;
    if (action.type === 'build') {
        p.buildings++;
        s.cash[pi] -= t.buildCost;
    }
    else if (action.type === 'sell') {
        p.buildings--;
        s.cash[pi] += Math.floor(t.buildCost / 2);
    }
    else if (action.type === 'mortgage') {
        p.mortgaged = true;
        s.cash[pi] += mortgageValue(action.tile);
    }
    else if (action.type === 'unmortgage') {
        p.mortgaged = false;
        s.cash[pi] -= unmortgageCost(action.tile);
    }
    emit(s, { type: action.type, by: pi, tile: action.tile });
}
const sameAction = (a, b) => a.type === b.type && (!('tile' in b) || ('tile' in a && a.tile === b.tile));
export function createMinaboliEngine(rng) {
    return {
        info,
        init(players, now, opts) {
            if (players.length < 2 || players.length > 4 || players.some((p) => !p.id || typeof p.id !== 'string') || new Set(players.map((p) => p.id)).size !== players.length)
                throw new Error('مينابولي تحتاج 2–4 هويات لاعبين فريدة.');
            if (!Number.isFinite(now))
                throw new Error('وقت البداية غير صالح.');
            const refs = shuffle(players, rng), ids = refs.map((p) => p.id);
            const turnMs = Number.isFinite(opts?.turnMs) ? Math.min(180_000, Math.max(15_000, Math.floor(opts.turnMs))) : DEFAULT_TURN_MS;
            const s = { ver: 1, turnMs, players: ids, bots: refs.map((p) => p.bot), cash: ids.map(() => START_CASH), positions: ids.map(() => 0),
                properties: BOARD.map(() => ({ owner: null, buildings: 0, mortgaged: false })), jailed: ids.map(() => false), jailTurns: ids.map(() => 0),
                missed: ids.map(() => 0), out: ids.map(() => false), turn: 0, completedTurns: 0, maxTurns: MAX_TURNS, phase: 'roll', pending: null,
                lastRoll: null, endsAt: now + turnMs, winners: [], endReason: null, ev: newLog() };
            emit(s, { type: 'start', by: s.turn });
            return s;
        },
        apply(state, playerId, action, now) {
            const fail = (error) => ({ ok: false, error });
            const pi = state.players.indexOf(playerId);
            if (pi < 0)
                return fail('أنت لست لاعبًا في المباراة.');
            if (!action || typeof action !== 'object' || Array.isArray(action))
                return fail('حركة غير معروفة.');
            const deed = ['build', 'sell', 'mortgage', 'unmortgage'].includes(action.type);
            const keys = deed ? ['type', 'tile', 'ver'] : ['type', 'ver'];
            if (Object.keys(action).some((key) => !keys.includes(key)) || (deed && (!('tile' in action) || !Number.isInteger(action.tile))))
                return fail('حقول حركة غير مسموحة؛ السعر والرصيد يحددهما الخادم.');
            if ('ver' in action && action.ver !== state.ver)
                return fail('تغيّرت نسخة المباراة، حدّث الشاشة.');
            if (state.phase === 'final')
                return fail('المباراة انتهت.');
            if (state.out[pi])
                return fail('خرجت من هذه المباراة.');
            if (!Number.isFinite(now))
                return fail('وقت الحركة غير صالح.');
            if (action.type !== 'surrender' && pi !== state.turn)
                return fail('ليس دورك.');
            if (now >= state.endsAt)
                return fail('انتهت مهلة الدور.');
            if (action.type !== 'surrender' && !legalMoves(state, pi, now).some((m) => sameAction(action, m.action)))
                return fail('الحركة غير قانونية أو لا تملك سعرها؛ استخدم الحركات المعروضة.');
            const s = clone(state);
            s.ver++;
            const beforeTurn = s.completedTurns;
            if (action.type === 'surrender')
                eliminate(s, pi, now, 'surrender');
            else if (action.type === 'roll')
                roll(s, rng, now);
            else if (action.type === 'rollJail')
                jailRoll(s, rng, now);
            else if (action.type === 'payJail') {
                s.cash[pi] -= JAIL_FINE;
                s.jailed[pi] = false;
                s.jailTurns[pi] = 0;
                s.phase = 'roll';
                emit(s, { type: 'bail', by: pi, amount: JAIL_FINE });
            }
            else if (action.type === 'buy' && s.pending?.kind === 'buy') {
                const tile = s.pending.tile;
                s.cash[pi] -= BOARD[tile].price;
                s.properties[tile].owner = pi;
                s.pending = null;
                s.phase = 'manage';
                emit(s, { type: 'buy', by: pi, tile, price: BOARD[tile].price });
            }
            else if (action.type === 'decline') {
                s.pending = null;
                s.phase = 'manage';
                emit(s, { type: 'decline', by: pi });
            }
            else if (action.type === 'end')
                advance(s, now);
            else {
                deedAction(s, action);
                settleDebt(s, rng, now);
            }
            // Reset consecutive misses only after a manually completed turn, never for a partial action.
            if (s.completedTurns !== beforeTurn)
                s.missed[pi] = 0;
            return { ok: true, state: s };
        },
        tick(state, now) {
            if (state.phase === 'final' || !Number.isFinite(now) || now < state.endsAt)
                return state;
            const s = clone(state), pi = s.turn, completed = s.completedTurns;
            s.ver++;
            s.missed[pi]++;
            emit(s, { type: 'timeout', by: pi, missed: s.missed[pi] });
            if (s.missed[pi] >= 3) {
                eliminate(s, pi, now, 'timeout');
                return s;
            }
            if (s.phase === 'roll')
                roll(s, rng, now);
            else if (s.phase === 'jail')
                jailRoll(s, rng, now);
            // Resolve debt by selling the highest buildings, then mortgaging land. Bounded by 64 deeds/buildings.
            for (let n = 0; n < 80 && s.phase === 'debt' && s.turn === pi && s.completedTurns === completed; n++) {
                const moves = legalMoves(s, pi).filter((m) => m.action.type === 'sell' || m.action.type === 'mortgage');
                if (!moves.length) {
                    eliminate(s, pi, now, 'bankrupt');
                    break;
                }
                deedAction(s, moves[0].action);
                settleDebt(s, rng, now);
            }
            if (s.phase !== 'final' && s.turn === pi && s.completedTurns === completed) {
                if (s.phase === 'buy') {
                    s.pending = null;
                    s.phase = 'manage';
                    emit(s, { type: 'decline', by: pi });
                }
                advance(s, now);
            }
            return s;
        },
        view(state, playerId, now) {
            const pi = state.players.indexOf(playerId);
            // Detached DTO: a UI or test modifying the view cannot mutate authoritative state/board.
            return clone({ game: 'minaboli', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, turnMs: state.turnMs,
                players: state.players, bots: state.bots, turnId: state.players[state.turn], cash: state.cash, positions: state.positions,
                board: BOARD.map((t) => ({ ...t, ...state.properties[t.id], rentDue: rentFor(state, t.id) })),
                jailed: state.jailed, jailTurns: state.jailTurns, out: state.out, missed: state.missed, completedTurns: state.completedTurns,
                maxTurns: MAX_TURNS, lastRoll: state.lastRoll, pending: state.pending, winners: state.winners, endReason: state.endReason,
                assets: state.players.map((_, i) => netAssets(state, i)), moves: legalMoves(state, pi, now),
                canSurrender: pi >= 0 && !state.out[pi] && state.phase !== 'final' && now < state.endsAt,
                rules: { startCash: START_CASH, startBonus: START_BONUS, jailFine: JAIL_FINE, maxBuildings: MAX_BUILDINGS,
                    maxTurns: MAX_TURNS, maxMissed: 3, currency: 'matchOnly', timeout: 'autoResolveThenEnd',
                    scoring: 'cash+land(full/halfIfMortgaged)+buildingsCost', bankruptcy: 'cashToCreditorDeedsToBank',
                    jail: 'doublesOrFine;thirdFailureMandatoryFine;noBonusTurn', turnClock: 'wholeTurn' }, ...eventsView(state) });
        },
        botAction(state, botId, now) {
            const pi = state.players.indexOf(botId);
            if (pi < 0 || !state.bots[pi])
                return null;
            const moves = legalMoves(state, pi, now);
            const find = (type) => moves.find((m) => m.action.type === type);
            let m;
            if (state.phase === 'debt')
                m = find('sell') ?? find('mortgage');
            else if (state.phase === 'buy')
                m = find('buy') ?? find('decline');
            else if (state.phase === 'jail')
                m = state.cash[pi] > 200 ? find('payJail') : undefined;
            else if (state.phase === 'manage') {
                m = moves.find((q) => q.action.type === 'unmortgage' && state.cash[pi] - (q.cost ?? 0) >= 150)
                    ?? moves.find((q) => q.action.type === 'build' && state.cash[pi] - (q.cost ?? 0) >= 200) ?? find('end');
            }
            m ??= find('roll') ?? find('rollJail');
            return m ? { action: m.action, delayMs: 650 } : null;
        },
        isOver: (s) => s.phase === 'final',
        outcome: (s) => ({ winners: s.phase === 'final' ? s.winners.slice() : [], scores: Object.fromEntries(s.players.map((p, i) => [p, netAssets(s, i)])) }),
        version: (s) => s.ver,
    };
}
