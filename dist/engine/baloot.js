import { clone, shuffle } from './util.js';
import { RULES, RULESET_VERSION, compareProjects, detectProjects, isProjectKind, matchState, scoreRoundPure } from './baloot-rules.js';
/**
 * بلوت (النظام السعودي المبسّط): 4 لاعبين في فريقين متقابلين، 32 ورقة (من 7 إلى A).
 *  - التوزيع: 5 أوراق لكل لاعب وورقة مكشوفة. الدور الأول: «حكم» (نوع الورقة المكشوفة) أو «صن» أو «بس».
 *    الدور الثاني: «حكم» بنوع ثاني أو «صن» أو «بس». لو الكل «بس» مرتين تنعاد الورقة.
 *    صاحب العقد ياخذ المكشوفة وورقتين، والباقين 3 أوراق.
 *  - اللعب 8 أكلات. لازم تلعب نفس النوع؛ بالحكم لو ما عندك النوع لازم «تدق» بالحكم (إلا لو شريكك ياكل)، ولازم تكبّر الحكم لو تقدر.
 *  - قيمة الأوراق: صن وغير الحكم: A=11 10=10 K=4 Q=3 J=2. الحكم: J=20 9=14 A=11 10=10 K=4 Q=3. آخر أكلة +10.
 *  - النقاط: الحكم مجموعه 16 نقطة، والصن 26 (التقريب في baloot-rules.ts). نجاح المشتري بالنقاط الجاهزة (أوراق + مشاريع + بلوت) والتعادل = فشل؛ ويأخذ الخصم كل شيء عند الفشل.
 *  - بلوت (K و Q الحكم عند نفس اللاعب) = +2 نقطة، لازم يُعلَن قبل رمي الثانية، ولا يُضاعف. «كبوت» (كل الأكلات) = 25 بالحكم و44 بالصن.
 *  - المشاريع (سرا، خمسين، مية، أربع إكك/أربعمية) تُعلَن بالأكلة الأولى وتُكشف بعدها. الدبل ثم الثري ثم الفور بالحكم فقط، قبل أول ورقة.
 *  - أول فريق يوصل 152 نقطة يفوز؛ التعادل التام بعدها = جولة فاصلة.
 *  كل القواعد والأرقام المعتمدة في baloot-rules.ts (النسخة baloot-ksa-1). غير مطبّق عمداً: أشكل، المقفل، القهوة، مضاعفات الصن.
 */
export const TARGET = RULES.target;
export const SUIT_NAMES = ['♠', '♥', '♦', '♣'];
export const info = {
    id: 'baloot',
    name: 'بلوت',
    icon: '♠️',
    tagline: 'لعبة الورق الخليجية: فريقين، صن وحكم',
    description: 'بلوت سعودي بأربعة لاعبين في فريقين: مزايدة صن أو حكم، ثمان أكلات، وأول فريق يوصل 152 نقطة.',
    minPlayers: 4,
    maxPlayers: 4,
    defaultSeats: 4,
    supportsBots: true,
    status: 'available',
    categories: ['board'],
    idea: 'أربعة لاعبين، اللي يقابلك شريكك. تزايدون على نوع اللعب (صن أو حكم) وبعدين تلعبون ثمان أكلات وتجمعون نقاط الأوراق.',
    howToStart: 'أنشئ غرفة بأربعة لاعبين، أو ابحث عن لاعبين، أو العب مع الكمبيوتر (شريكك وخصومك كمبيوتر). الأوراق توزّع تلقائياً.',
    howToWin: 'أول فريق يوصل 152 نقطة. صاحب العقد لازم يكسب أكثر من خصمه وإلا ياخذ الخصم كل النقاط. بلوت = K و Q الحكم عند نفس اللاعب (+2).',
};
/** مهلة أول ورقة للبوت بالحكم، تتيح للاعب البشري يرفع المضاعف قبل بداية اللعب */
export const FIRST_LEAD_WAIT_MS = 6000;
const isInt = (n) => Number.isInteger(n);
export const teamOf = (pi) => pi % 2;
const SUN_ORDER = [14, 10, 13, 12, 11, 9, 8, 7];
const TRUMP_ORDER = [11, 9, 14, 10, 13, 12, 8, 7];
const SUN_VAL = { 14: 11, 10: 10, 13: 4, 12: 3, 11: 2, 9: 0, 8: 0, 7: 0 };
const TRUMP_VAL = { 11: 20, 9: 14, 14: 11, 10: 10, 13: 4, 12: 3, 8: 0, 7: 0 };
const same = (a, b) => a.s === b.s && a.r === b.r;
export const isTrump = (st, c) => st.contract?.type === 'hokm' && c.s === st.contract.trump;
export const pointsOf = (st, c) => (isTrump(st, c) ? TRUMP_VAL[c.r] : SUN_VAL[c.r]);
/** قوة الورقة داخل نوعها (الأكبر أعلى) */
const strength = (st, c) => (isTrump(st, c) ? TRUMP_ORDER : SUN_ORDER).length - (isTrump(st, c) ? TRUMP_ORDER : SUN_ORDER).indexOf(c.r);
export function trickWinner(st) {
    const lead = st.trick[0].c.s;
    const trumps = st.trick.filter((x) => isTrump(st, x.c));
    const pool = trumps.length ? trumps : st.trick.filter((x) => x.c.s === lead);
    return pool.reduce((best, x) => (strength(st, x.c) > strength(st, best.c) ? x : best)).p;
}
export function legalCards(st, pi) {
    const hand = st.hands[pi];
    if (st.phase !== 'play' || st.turn !== pi)
        return [];
    if (!st.trick.length)
        return hand;
    const lead = st.trick[0].c.s;
    const follow = hand.filter((c) => c.s === lead);
    const hokm = st.contract?.type === 'hokm';
    const trumpS = st.contract?.trump ?? -1;
    if (follow.length) {
        if (hokm && lead === trumpS) {
            const top = Math.max(...st.trick.filter((x) => x.c.s === trumpS).map((x) => strength(st, x.c)));
            const higher = follow.filter((c) => strength(st, c) > top);
            return higher.length ? higher : follow;
        }
        return follow;
    }
    if (!hokm)
        return hand;
    const trumps = hand.filter((c) => c.s === trumpS);
    if (!trumps.length)
        return hand;
    const w = trickWinner({ contract: st.contract, trick: st.trick });
    if (teamOf(w) === teamOf(pi))
        return hand; // شريكك ياكل: حر
    const inTrick = st.trick.filter((x) => x.c.s === trumpS);
    if (inTrick.length) {
        const top = Math.max(...inTrick.map((x) => strength(st, x.c)));
        const higher = trumps.filter((c) => strength(st, c) > top);
        return higher.length ? higher : hand;
    }
    return trumps;
}
function newDeck(rng) {
    const d = [];
    for (let s = 0; s < 4; s++)
        for (let r = 7; r <= 14; r++)
            d.push({ s, r });
    return shuffle(d, rng);
}
function dealRound(s, rng, now) {
    const deck = newDeck(rng);
    s.hands = [0, 1, 2, 3].map(() => deck.splice(0, 5));
    s.floor = deck.splice(0, 1)[0];
    s.rest = deck;
    s.phase = 'bid';
    s.bidRound = 1;
    s.bidSpoken = 0;
    s.bids = [];
    s.contract = null;
    s.trick = [];
    s.lastTrick = null;
    s.lastWinner = null;
    s.tricks = 0;
    s.abnat = [0, 0];
    s.tricksWon = [0, 0];
    s.balootBy = null;
    s.level = 1;
    s.projCand = [[], [], [], []];
    s.projDecl = [null, null, null, null];
    s.projReveal = null;
    s.balootDeclared = false;
    s.turn = (s.dealer + 1) % 4;
    s.endsAt = now + s.turnMs;
    s.ver++;
}
function startPlay(s, bidder, type, trump, now) {
    s.contract = { type, trump, bidder };
    s.hands[bidder].push(s.floor);
    s.hands[bidder].push(...s.rest.splice(0, 2));
    for (let k = 1; k <= 3; k++)
        s.hands[(bidder + k) % 4].push(...s.rest.splice(0, 3));
    s.floor = null;
    s.rest = [];
    if (type === 'hokm') {
        for (let p = 0; p < 4; p++)
            if (s.hands[p].some((c) => c.s === trump && c.r === 13) && s.hands[p].some((c) => c.s === trump && c.r === 12))
                s.balootBy = p;
    }
    s.projCand = s.hands.map((h) => detectProjects(h, type));
    s.phase = 'play';
    s.turn = (s.dealer + 1) % 4;
    s.trick = [];
    s.endsAt = now + s.turnMs;
    s.ver++;
}
function finishBid(s, rng, now) {
    // الصن أقوى من الحكم؛ وإلا آخر حكم
    const sun = s.bids.find((b) => b.bid === 'sun');
    if (sun)
        return startPlay(s, sun.p, 'sun', null, now);
    const hokm = s.bids.find((b) => b.bid === 'hokm');
    if (hokm)
        return startPlay(s, hokm.p, 'hokm', hokm.suit, now);
    if (s.bidRound === 1) {
        s.bidRound = 2;
        s.bidSpoken = 0;
        s.bids = [];
        s.turn = (s.dealer + 1) % 4;
        s.endsAt = now + s.turnMs;
        s.ver++;
        return;
    }
    // الكل بس مرتين: توزيع جديد
    s.dealer = (s.dealer + 1) % 4;
    s.summary = null;
    dealRound(s, rng, now);
}
const teamItems = (s, t) => [0, 1, 2, 3].filter((p) => teamOf(p) === t).flatMap((p) => s.projDecl[p] ?? []);
function scoreRound(s, now) {
    const c = s.contract;
    const bt = teamOf(c.bidder);
    const baloot = c.type === 'hokm' && s.balootDeclared && s.balootBy !== null ? teamOf(s.balootBy) : null;
    const r = scoreRoundPure({
        type: c.type, buyer: bt, abnat: [s.abnat[0], s.abnat[1]], tricksWon: [s.tricksWon[0], s.tricksWon[1]], level: s.level,
        projects: [teamItems(s, 0), teamItems(s, 1)], baloot,
    });
    s.scores = [s.scores[0] + r.pts[0], s.scores[1] + r.pts[1]];
    s.summary = {
        contract: c.type, trump: c.trump, bidderTeam: bt, abnat: [s.abnat[0], s.abnat[1]], pts: r.pts, baloot: r.balootTo, kaboot: r.kaboot, failed: !r.success,
        reason: r.reason, level: r.level, cardPts: r.cardPts, projPts: r.projPts, projWinner: r.projWinner, tied: false, deciding: s.deciding, rulesetVersion: RULESET_VERSION,
    };
    const m = matchState([s.scores[0], s.scores[1]]);
    if (m.over) {
        s.phase = 'final';
        s.winTeam = m.winTeam;
        s.endsAt = 0;
    }
    else {
        s.tied = m.tied;
        s.summary.tied = m.tied;
        s.phase = 'roundEnd';
        s.endsAt = now + 7000;
    }
    s.ver++;
}
function playCard(s, pi, card, now) {
    const i = s.hands[pi].findIndex((c) => same(c, card));
    s.hands[pi].splice(i, 1);
    s.trick.push({ p: pi, c: card });
    if (s.trick.length < 4) {
        s.turn = (pi + 1) % 4;
        s.endsAt = now + s.turnMs;
        s.ver++;
        return;
    }
    const w = trickWinner(s);
    const wt = teamOf(w);
    s.abnat[wt] += s.trick.reduce((a, x) => a + pointsOf(s, x.c), 0);
    s.tricksWon[wt]++;
    s.tricks++;
    s.lastTrick = s.trick;
    s.lastWinner = w;
    s.trick = [];
    if (s.tricks === 1) {
        const items = [teamItems(s, 0), teamItems(s, 1)];
        const cmp = compareProjects(items[0], items[1]);
        s.projReveal = { winner: cmp.winner, pts: cmp.pts, items };
    }
    if (s.tricks === 8) {
        s.abnat[wt] += 10;
        scoreRound(s, now);
        return;
    }
    s.turn = w;
    s.endsAt = now + s.turnMs;
    s.ver++;
}
/** قوة اليد للمزايدة (للبوتات) */
function hokmStrength(hand, suit) {
    return hand.reduce((a, c) => a + (c.s === suit ? TRUMP_VAL[c.r] + 2 : c.r === 14 ? 8 : c.r === 10 ? 3 : 0), 0);
}
function sunStrength(hand) {
    return hand.reduce((a, c) => a + (c.r === 14 ? 11 : c.r === 10 ? 6 : c.r === 13 ? 3 : c.r === 12 ? 1 : 0), 0);
}
export function createBalootEngine(rng) {
    const chooseBid = (s, pi) => {
        const hand = s.hands[pi];
        const hasHokm = s.bids.some((b) => b.bid === 'hokm');
        const sunS = sunStrength(hand);
        if (sunS >= 34 && hand.filter((c) => c.r === 14).length >= 2)
            return { type: 'bid', bid: 'sun' };
        if (hasHokm)
            return { type: 'bid', bid: 'pass' };
        if (s.bidRound === 1) {
            const suit = s.floor.s;
            // نحسب مع الورقة المكشوفة لأنها بتجي لصاحب العقد
            if (hokmStrength([...hand, s.floor], suit) >= 44)
                return { type: 'bid', bid: 'hokm', suit };
            return { type: 'bid', bid: 'pass' };
        }
        let best = -1, bs = -1;
        for (let su = 0; su < 4; su++) {
            if (su === s.floor.s)
                continue;
            const v = hokmStrength(hand, su);
            if (v > bs) {
                bs = v;
                best = su;
            }
        }
        if (bs >= 40 || (pi === s.dealer && bs >= 30))
            return { type: 'bid', bid: 'hokm', suit: best };
        return { type: 'bid', bid: 'pass' };
    };
    const choosePlay = (s, pi) => {
        const legal = legalCards(s, pi);
        if (legal.length === 1)
            return legal[0];
        const val = (c) => pointsOf(s, c);
        const lowest = (cs) => cs.reduce((a, c) => (strength(s, c) < strength(s, a) || (strength(s, c) === strength(s, a) && val(c) < val(a)) ? c : a));
        const highest = (cs) => cs.reduce((a, c) => (strength(s, c) > strength(s, a) ? c : a));
        if (!s.trick.length) {
            const sure = legal.filter((c) => !isTrump(s, c) && c.r === 14);
            if (sure.length)
                return sure[0];
            if (s.contract?.type === 'hokm') {
                const j = legal.filter((c) => isTrump(s, c) && (c.r === 11 || c.r === 9));
                if (j.length && s.contract.bidder % 2 === pi % 2)
                    return highest(j);
            }
            const cheap = legal.filter((c) => !isTrump(s, c));
            return lowest(cheap.length ? cheap : legal);
        }
        const w = trickWinner(s);
        const partnerWins = teamOf(w) === teamOf(pi);
        const curTop = s.trick.find((x) => x.p === w).c;
        const beaters = legal.filter((c) => {
            const t = [...s.trick, { p: pi, c }];
            return trickWinner({ contract: s.contract, trick: t }) === pi;
        });
        if (partnerWins) {
            // نحط ورقة ثقيلة النقاط لشريكنا لو شريكنا مضمون
            const heavy = legal.filter((c) => !isTrump(s, c)).sort((a, b) => val(b) - val(a))[0];
            return heavy && s.trick.length === 3 ? heavy : lowest(legal);
        }
        if (beaters.length)
            return s.trick.length === 3 ? lowest(beaters) : lowest(beaters.filter((c) => !isTrump(s, c)).length ? beaters.filter((c) => !isTrump(s, c)) : beaters);
        void curTop;
        return lowest(legal);
    };
    return {
        info,
        init(players, now, opts) {
            if (players.length !== 4)
                throw new Error('baloot needs 4 players');
            const ids = shuffle(players.map((p) => p.id), rng);
            const s = {
                ver: 1, turnMs: Math.max(opts?.turnMs ?? 30_000, 20_000), players: ids, dealer: 3, round: 1, phase: 'bid', bidRound: 1, bidSpoken: 0, bids: [],
                floor: null, hands: [[], [], [], []], rest: [], contract: null, turn: 0, trick: [], lastTrick: null, lastWinner: null, tricks: 0, abnat: [0, 0],
                tricksWon: [0, 0], balootBy: null, scores: [0, 0], summary: null, endsAt: 0, winTeam: null, missed: [0, 0, 0, 0],
                rulesetVersion: RULESET_VERSION, level: 1, projCand: [[], [], [], []], projDecl: [null, null, null, null], projReveal: null, balootDeclared: false, tied: false, deciding: false,
            };
            dealRound(s, rng, now);
            return s;
        },
        apply(state, playerId, action, now) {
            const pi = state.players.indexOf(playerId);
            if (pi < 0)
                return { ok: false, error: 'أنت مو لاعب في هذي اللعبة.' };
            if (!action || typeof action !== 'object')
                return { ok: false, error: 'حركة غير معروفة.' };
            if (state.phase === 'final' || state.phase === 'roundEnd')
                return { ok: false, error: 'انتظر الجولة الجاية.' };
            // المضاعف يصير من الخصم أو المشتري خارج الدور (قبل أول ورقة)، وباقي الحركات بالدور
            if (state.turn !== pi && action.type !== 'mult')
                return { ok: false, error: 'مو دورك.' };
            if (now >= state.endsAt)
                return { ok: false, error: 'انتهى وقت دورك.' };
            const s = clone(state);
            s.missed[pi] = 0;
            if (action.type === 'bid') {
                if (s.phase !== 'bid')
                    return { ok: false, error: 'المزايدة انتهت.' };
                const bid = action.bid;
                if (bid !== 'hokm' && bid !== 'sun' && bid !== 'pass')
                    return { ok: false, error: 'مزايدة غير صالحة.' };
                const hokmTaken = s.bids.some((b) => b.bid === 'hokm');
                if (bid === 'hokm') {
                    if (hokmTaken)
                        return { ok: false, error: 'فيه أحد أخذ حكم قبلك. تقدر تقول صن أو بس.' };
                    let suit = action.suit;
                    if (s.bidRound === 1)
                        suit = s.floor.s;
                    else if (!isInt(suit) || suit < 0 || suit > 3 || suit === s.floor.s)
                        return { ok: false, error: 'اختر نوع حكم غير نوع الورقة المكشوفة.' };
                    s.bids.push({ p: pi, bid, suit });
                }
                else
                    s.bids.push({ p: pi, bid });
                s.bidSpoken++;
                s.ver++;
                if (bid === 'sun' || s.bidSpoken >= 4) {
                    finishBid(s, rng, now);
                    return { ok: true, state: s };
                }
                s.turn = (pi + 1) % 4;
                s.endsAt = now + s.turnMs;
                return { ok: true, state: s };
            }
            if (action.type === 'mult') {
                if (s.phase !== 'play' || !s.contract)
                    return { ok: false, error: 'مو وقت المضاعف.' };
                if (s.tricks !== 0 || s.trick.length !== 0)
                    return { ok: false, error: 'فات وقت المضاعف: ما يصير بعد ما تبدأ اللعب.' };
                if (s.contract.type !== 'hokm')
                    return { ok: false, error: 'الصن بدون مضاعفات.' };
                const to = action.level;
                if (!isInt(to) || to < 2 || to > RULES.maxLevel.hokm)
                    return { ok: false, error: 'مضاعف غير مسموح.' };
                if (to !== s.level + 1)
                    return { ok: false, error: 'المضاعف بالتسلسل: دبل ثم ثري ثم فور.' };
                const bt = teamOf(s.contract.bidder);
                const need = to === 3 ? bt : 1 - bt; // الدبل والفور من الخصم، والثري من المشتري
                if (teamOf(pi) !== need)
                    return { ok: false, error: 'هذا المضاعف مو من حق فريقك.' };
                s.level = to;
                s.endsAt = now + s.turnMs;
                s.ver++;
                return { ok: true, state: s };
            }
            if (action.type === 'project') {
                if (s.phase !== 'play')
                    return { ok: false, error: 'مو وقت المشاريع.' };
                if (s.tricks !== 0 || s.hands[pi].length !== 8)
                    return { ok: false, error: 'المشاريع تنعلن بالأكلة الأولى قبل ما تلعب ورقتك.' };
                if (s.projDecl[pi])
                    return { ok: false, error: 'أعلنت مشاريعك.' };
                const cand = s.projCand[pi];
                if (!cand.length)
                    return { ok: false, error: 'ما عندك مشروع.' };
                let items = cand;
                if (action.kinds !== undefined) {
                    if (!Array.isArray(action.kinds) || !action.kinds.length)
                        return { ok: false, error: 'مشروع غير معروف.' };
                    const pool = cand.slice();
                    items = [];
                    for (const k of action.kinds) {
                        if (!isProjectKind(k))
                            return { ok: false, error: 'مشروع غير معروف.' };
                        const j = pool.findIndex((x) => x.kind === k);
                        if (j < 0)
                            return { ok: false, error: 'ما عندك هذا المشروع.' };
                        items.push(pool.splice(j, 1)[0]);
                    }
                }
                s.projDecl[pi] = items;
                s.ver++;
                return { ok: true, state: s };
            }
            if (action.type === 'baloot') {
                if (s.phase !== 'play' || s.contract?.type !== 'hokm')
                    return { ok: false, error: 'البلوت بالحكم بس.' };
                if (s.balootBy !== pi)
                    return { ok: false, error: 'ما عندك بلوت.' };
                if (s.balootDeclared)
                    return { ok: false, error: 'أعلنت البلوت.' };
                const t = s.contract.trump;
                // لازم ما رميت الثانية: لسا عندك أحد الشايب أو البنت
                if (!s.hands[pi].some((c) => c.s === t && (c.r === 12 || c.r === 13)))
                    return { ok: false, error: 'فات وقت إعلان البلوت (بعد رمي الثانية).' };
                s.balootDeclared = true;
                s.ver++;
                return { ok: true, state: s };
            }
            if (action.type === 'play') {
                if (s.phase !== 'play')
                    return { ok: false, error: 'مو وقت اللعب.' };
                if (!isInt(action.s) || !isInt(action.r))
                    return { ok: false, error: 'ورقة غير صالحة.' };
                const card = { s: action.s, r: action.r };
                const legal = legalCards(s, pi);
                if (!legal.some((c) => same(c, card)))
                    return { ok: false, error: s.hands[pi].some((c) => same(c, card)) ? 'ما تقدر تلعب هذي الورقة الحين (لازم تتبع النوع أو تدق).' : 'ما عندك هذي الورقة.' };
                playCard(s, pi, card, now);
                return { ok: true, state: s };
            }
            return { ok: false, error: 'حركة غير معروفة.' };
        },
        tick(state, now) {
            if (state.phase === 'final' || now < state.endsAt)
                return state;
            const s = clone(state);
            if (s.phase === 'roundEnd') {
                s.dealer = (s.dealer + 1) % 4;
                s.round++;
                s.summary = s.summary;
                s.deciding = s.tied;
                s.tied = false;
                dealRound(s, rng, now);
                return s;
            }
            const pi = s.turn;
            s.missed[pi]++;
            if (s.missed[pi] >= 3) {
                s.phase = 'final';
                s.winTeam = 1 - teamOf(pi);
                s.endsAt = 0;
                s.ver++;
                return s;
            }
            const keep = s.missed[pi];
            if (s.phase === 'bid') {
                const bid = 'pass';
                s.bids.push({ p: pi, bid });
                s.bidSpoken++;
                s.ver++;
                if (s.bidSpoken >= 4)
                    finishBid(s, rng, now);
                else {
                    s.turn = (pi + 1) % 4;
                    s.endsAt = now + s.turnMs;
                }
            }
            else if (s.phase === 'play') {
                const legal = legalCards(s, pi);
                playCard(s, pi, legal[Math.floor(rng() * legal.length)], now);
            }
            s.missed[pi] = keep;
            return s;
        },
        view(state, playerId, now) {
            const pi = state.players.indexOf(playerId);
            const mine = pi === state.turn && (state.phase === 'bid' || state.phase === 'play');
            const hand = pi >= 0 ? [...state.hands[pi]].sort((a, b) => a.s - b.s || b.r - a.r) : [];
            return {
                game: 'baloot', ver: state.ver, serverNow: now, phase: state.phase, endsAt: state.endsAt, players: state.players, dealer: state.dealer, round: state.round,
                bidRound: state.bidRound, bids: state.bids, floor: state.floor, contract: state.contract, turnId: state.players[state.turn],
                trick: state.trick.map((x) => ({ by: state.players[x.p], p: x.p, c: x.c })), lastTrick: state.lastTrick?.map((x) => ({ by: state.players[x.p], p: x.p, c: x.c })) ?? null,
                lastWinner: state.lastWinner === null ? null : state.players[state.lastWinner],
                hand, handCounts: state.hands.map((h) => h.length), legal: mine && state.phase === 'play' ? legalCards(state, pi) : [],
                canBid: mine && state.phase === 'bid', hokmTaken: state.bids.some((b) => b.bid === 'hokm'),
                scores: state.scores, abnat: state.abnat, tricksWon: state.tricksWon, summary: state.summary, target: TARGET,
                me: pi, teams: state.players.map((_, i) => teamOf(i)), balootBy: state.balootBy !== null && state.balootDeclared && state.contract && state.hands[state.balootBy].filter((c) => c.s === state.contract.trump && (c.r === 12 || c.r === 13)).length < 2 ? state.players[state.balootBy] : null,
                winTeam: state.winTeam, winners: state.winTeam === null ? [] : state.players.filter((_, i) => teamOf(i) === state.winTeam),
                rulesetVersion: state.rulesetVersion, level: state.level, balootDeclared: state.balootDeclared, deciding: state.deciding, tricks: state.tricks,
                // الواجهة تعرض الأزرار بحسب هذي الحقول فقط، والخادم يتحقق مرة ثانية عند التنفيذ
                canProject: pi >= 0 && state.phase === 'play' && state.turn === pi && state.tricks === 0 && state.hands[pi].length === 8 && !state.projDecl[pi] && state.projCand[pi].length > 0,
                canBaloot: pi >= 0 && state.phase === 'play' && state.contract?.type === 'hokm' && state.turn === pi && state.balootBy === pi && !state.balootDeclared
                    && state.hands[pi].some((c) => c.s === state.contract.trump && (c.r === 12 || c.r === 13)),
                // مشاريعي أنا فقط قبل الإعلان؛ والمعلَن يشوفه الكل (النوع والنقاط)، وتفاصيل الأوراق بعد الأكلة الأولى
                myProjects: pi >= 0 && state.phase === 'play' && state.tricks === 0 ? state.projCand[pi] : [],
                projDeclared: state.projDecl.flatMap((d, i) => (d ? [{ by: state.players[i], p: i, kinds: d.map((x) => x.kind), pts: d.reduce((a, x) => a + x.pts, 0) }] : [])),
                projReveal: state.projReveal,
                multOffer: pi >= 0 && state.phase === 'play' && state.contract?.type === 'hokm' && state.tricks === 0 && state.trick.length === 0 && state.level < RULES.maxLevel.hokm
                    && teamOf(pi) === (state.level === 2 ? teamOf(state.contract.bidder) : 1 - teamOf(state.contract.bidder)) ? state.level + 1 : null,
            };
        },
        botAction(state, botId) {
            const pi = state.players.indexOf(botId);
            if (state.turn !== pi)
                return null;
            if (state.phase === 'bid')
                return { action: chooseBid(state, pi), delayMs: 1100 + Math.floor(rng() * 900) };
            if (state.phase === 'play') {
                // البوت يعلن مشاريعه قبل أول ورقة، والبلوت قبل رمي أول ورقة من الشايب/البنت (ما يرفع مضاعف أبداً)
                if (state.tricks === 0 && state.hands[pi].length === 8 && !state.projDecl[pi] && state.projCand[pi].length)
                    return { action: { type: 'project' }, delayMs: 500 };
                const c = choosePlay(state, pi);
                if (state.contract?.type === 'hokm' && state.balootBy === pi && !state.balootDeclared && c.s === state.contract.trump && (c.r === 12 || c.r === 13))
                    return { action: { type: 'baloot' }, delayMs: 400 };
                // أول ورقة بالحكم: نمهل اللاعب البشري وقتاً يدبّل/يثلّث قبل ما يبدأ البوت (المضاعف يقفل بأول ورقة)
                const firstLead = state.contract?.type === 'hokm' && state.tricks === 0 && state.trick.length === 0 && state.level < RULES.maxLevel.hokm;
                return { action: { type: 'play', s: c.s, r: c.r }, delayMs: firstLead ? FIRST_LEAD_WAIT_MS + Math.floor(rng() * 1000) : 1000 + Math.floor(rng() * 1000) };
            }
            return null;
        },
        isOver: (s) => s.phase === 'final',
        outcome: (s) => ({
            winners: s.winTeam === null ? [] : s.players.filter((_, i) => teamOf(i) === s.winTeam),
            scores: Object.fromEntries(s.players.map((p, i) => [p, s.scores[teamOf(i)]])),
        }),
        version: (s) => s.ver,
    };
}
