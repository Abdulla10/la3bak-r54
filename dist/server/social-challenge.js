import { isObj } from './datafile.js';
export const CHALLENGE_DURATION_SECONDS = 180;
export const SUPPORT_EVENT_TTL_MS = 20_000;
export const SUPPORT_RECEIPT_CAP = 100_000;
export const CHALLENGE_RECEIPT_CAP = 10_000;
const exact = (x, allowed) => Object.keys(x).every(k => allowed.includes(k)) && allowed.every(k => Object.hasOwn(x, k));
const nat = (x) => Number.isSafeInteger(x) && x >= 0;
const id = (x) => typeof x === 'string' && x.length > 0 && x.length <= 128 && !/[\s\u0000-\u001f\u007f]/.test(x);
const uuid = (x) => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const unique = (x, max, test = id) => Array.isArray(x) && x.length <= max && x.every(test) && new Set(x).size === x.length;
export function validGiftSupportContext(x) {
    return isObj(x) && exact(x, ['roomId', 'councilId', 'challengeId', 'sourcePublic']) && uuid(x.roomId) && uuid(x.councilId) && (x.challengeId === null || uuid(x.challengeId)) && typeof x.sourcePublic === 'boolean';
}
export function challengeTotals(c) {
    const totals = { blue: 0, red: 0 };
    for (const r of c.receipts)
        totals[c.teams.blue.includes(r.recipient) ? 'blue' : 'red'] += r.value;
    return totals;
}
export function finishChallenge(c) {
    const totals = challengeTotals(c);
    c.status = 'finished';
    c.endedAt = c.endsAt;
    c.winner = totals.blue === totals.red ? 'tie' : totals.blue > totals.red ? 'blue' : 'red';
}
export function validChallenge(x) {
    if (!isObj(x) || !exact(x, ['id', 'councilId', 'startedAt', 'endsAt', 'durationSeconds', 'status', 'endedAt', 'winner', 'teams', 'receipts']) || !uuid(x.id) || !uuid(x.councilId) || !nat(x.startedAt) || !nat(x.endsAt) || x.endsAt !== x.startedAt + 180_000 || x.durationSeconds !== 180 || !['active', 'finished', 'cancelled'].includes(String(x.status)) || !isObj(x.teams) || !exact(x.teams, ['blue', 'red']) || !unique(x.teams.blue, 5) || !unique(x.teams.red, 5) || !x.teams.blue.length || !x.teams.red.length || x.teams.blue.some(v => x.teams.red.includes(v)) || !Array.isArray(x.receipts) || x.receipts.length > CHALLENGE_RECEIPT_CAP)
        return false;
    const c = x, seen = new Set();
    for (const r of c.receipts) {
        if (!isObj(r) || !exact(r, ['id', 'recipient', 'at', 'value']) || !uuid(r.id) || seen.has(r.id) || !id(r.recipient) || ![...c.teams.blue, ...c.teams.red].includes(r.recipient) || !nat(r.at) || r.at < c.startedAt || r.at >= c.endsAt || !nat(r.value) || r.value < 1 || r.value > 1_000_000 || c.status === 'cancelled' && r.at > c.endedAt)
            return false;
        seen.add(r.id);
    }
    const t = challengeTotals(c);
    if (!nat(t.blue) || !nat(t.red))
        return false;
    if (c.status === 'active')
        return c.endedAt === null && c.winner === null;
    if (c.status === 'cancelled')
        return nat(c.endedAt) && c.endedAt >= c.startedAt && c.endedAt <= c.endsAt && c.winner === null;
    return c.endedAt === c.endsAt && c.winner === (t.blue === t.red ? 'tie' : t.blue > t.red ? 'blue' : 'red');
}
export function validSupportReceipt(x) {
    return isObj(x) && exact(x, ['id', 'fingerprint']) && uuid(x.id) && typeof x.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(x.fingerprint);
}
export function validSupportEvent(x) {
    return isObj(x) && exact(x, ['id', 'kind', 'occurredAt', 'expiresAt', 'roomId', 'councilId', 'senderId', 'recipientId', 'gift', 'value', 'currency', 'prepaid', 'challengeId']) && uuid(x.id) && x.kind === 'gift-support' && nat(x.occurredAt) && nat(x.expiresAt) && x.expiresAt === x.occurredAt + SUPPORT_EVENT_TTL_MS && uuid(x.roomId) && uuid(x.councilId) && id(x.senderId) && id(x.recipientId) && x.senderId !== x.recipientId && isObj(x.gift) && exact(x.gift, ['id', 'name', 'icon', 'quantity']) && id(x.gift.id) && typeof x.gift.name === 'string' && x.gift.name.length <= 200 && typeof x.gift.icon === 'string' && x.gift.icon.length <= 2000 && nat(x.gift.quantity) && x.gift.quantity >= 1 && x.gift.quantity <= 777 && nat(x.value) && x.value >= 1 && x.value <= 1_000_000 && x.currency === 'gems' && typeof x.prepaid === 'boolean' && (x.challengeId === null || uuid(x.challengeId));
}
/** Receipt only; legacy coins and non-gift transfers/rewards are never gem support. */
export function supportGiftValue(rec, context) {
    const total = rec.total;
    return uuid(rec.id) && rec.dir === 'out' && rec.status === 'done' && rec.cur === 'gems' && rec.room === `social:${context.roomId}:${context.councilId}` && rec.from !== rec.to && nat(rec.ts) && nat(rec.price) && rec.price > 0 && nat(rec.qty) && rec.qty >= 1 && rec.qty <= 777 && nat(total) && total > 0 && total <= 1_000_000 && total === rec.price * rec.qty ? total : null;
}
