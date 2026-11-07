import { createHash } from 'node:crypto';
import { isObj } from './datafile.js';
export const FAMILY_MEMBER_MAX = 20;
export const FAMILY_RECEIPT_MAX = 512;
export const FAMILY_HISTORY_MAX = 256;
const PUB = /^[A-Za-z0-9_-]{16}$/;
const KEY = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,95}$/;
const identity = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\u0000-\u0020\u007f]/.test(v);
const nat = (v) => Number.isSafeInteger(v) && Number(v) >= 0;
const pos = (v) => nat(v) && v > 0;
export const emptyFamilyState = () => ({ v: 1, seq: 0, circles: [], requests: [], couples: [], receipts: [] });
export function familySafeName(v) {
    if (typeof v !== 'string' || v.length > 80 || /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(v))
        return null;
    const name = v.normalize('NFKC').replace(/\s+/gu, ' ').trim();
    return name.length >= 3 && name.length <= 32 && /^[\p{L}\p{M}\p{N} _-]+$/u.test(name) ? name : null;
}
const nameKey = (name) => name.normalize('NFKC').toLowerCase();
const ACTION_FIELDS = {
    create: ['name'], invite: ['id', 'to'], accept: ['id'], reject: ['id'], cancel: ['id'], leave: ['id'], kick: ['id', 'to'], disband: ['id'], transfer: ['id', 'to'],
    'couple-request': ['to'], 'couple-accept': ['id'], 'couple-reject': ['id'], 'couple-cancel': ['id'], 'couple-dissolve': ['id'], 'couple-exposure': ['id', 'enabled'],
};
const action = (s) => typeof s === 'string' && Object.hasOwn(ACTION_FIELDS, s);
/** Additive v1 extension. Old social files without this field remain valid; corruption fails closed. */
export function validFamilyState(value) {
    if (value === undefined)
        return true;
    if (!isObj(value) || value.v !== 1 || !nat(value.seq) || !Array.isArray(value.circles) || !Array.isArray(value.requests) || !Array.isArray(value.couples) || !Array.isArray(value.receipts) || value.receipts.length > FAMILY_RECEIPT_MAX)
        return false;
    const ids = new Set(), members = new Set(), names = new Set(), bound = new Set(), pendingCouples = new Set(), receiptKeys = new Set(), pendingPairs = new Set();
    const addId = (id) => { if (!pos(id) || id > Number(value.seq) || ids.has(id))
        return false; ids.add(id); return true; };
    for (const c of value.circles) {
        if (!isObj(c) || !addId(c.id) || !identity(c.owner) || !Array.isArray(c.members) || !c.members.includes(c.owner) || c.members.length < 1 || c.members.length > FAMILY_MEMBER_MAX || !nat(c.at) || typeof c.name !== 'string' || familySafeName(c.name) !== c.name || names.has(nameKey(c.name)))
            return false;
        names.add(nameKey(c.name));
        for (const id of c.members) {
            if (!identity(id) || members.has(id))
                return false;
            members.add(id);
        }
    }
    for (const b of value.couples) {
        if (!isObj(b) || !addId(b.id) || !identity(b.a) || !identity(b.b) || b.a === b.b || bound.has(b.a) || bound.has(b.b) || typeof b.exposeA !== 'boolean' || typeof b.exposeB !== 'boolean' || !nat(b.at))
            return false;
        bound.add(b.a);
        bound.add(b.b);
    }
    for (const r of value.requests) {
        if (!isObj(r) || !addId(r.id) || !['invite', 'transfer', 'couple'].includes(String(r.kind)) || !identity(r.from) || !identity(r.to) || r.from === r.to || !['pending', 'accepted', 'rejected', 'cancelled'].includes(String(r.state)) || !nat(r.at) || !(r.decidedAt === null || nat(r.decidedAt)) || (r.state === 'pending') !== (r.decidedAt === null))
            return false;
        if (r.kind === 'couple' ? r.circle !== null : !pos(r.circle))
            return false;
        if (r.state !== 'pending')
            continue;
        if (r.kind === 'couple') {
            if (bound.has(r.from) || bound.has(r.to) || pendingCouples.has(r.from) || pendingCouples.has(r.to))
                return false;
            pendingCouples.add(r.from);
            pendingCouples.add(r.to);
        }
        else {
            const c = value.circles.find(c => isObj(c) && c.id === r.circle);
            if (!c || c.owner !== r.from || (r.kind === 'transfer' ? !c.members.includes(r.to) : c.members.includes(r.to)))
                return false;
            const pair = JSON.stringify([r.kind, r.circle, r.kind === 'transfer' ? '*' : r.to]);
            if (pendingPairs.has(pair))
                return false;
            pendingPairs.add(pair);
        }
    }
    for (const r of value.receipts) {
        if (!isObj(r) || !identity(r.actor) || typeof r.key !== 'string' || !KEY.test(r.key) || typeof r.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(r.fingerprint) || !nat(r.at) || !isObj(r.result) || r.result.ok !== true || !action(r.result.action) || !(r.result.id === undefined || (pos(r.result.id) && r.result.id <= Number(value.seq))) || Object.keys(r.result).some(k => !['ok', 'action', 'id'].includes(k)))
            return false;
        const k = JSON.stringify([r.actor, r.key]);
        if (receiptKeys.has(k))
            return false;
        receiptKeys.add(k);
    }
    return true;
}
const ownCircle = (s, me) => s.circles.find(c => c.members.includes(me));
const ownBond = (s, me) => s.couples.find(b => b.a === me || b.b === me);
const partner = (b, me) => b.a === me ? b.b : b.a;
const pendingCouple = (s, me) => s.requests.find(r => r.kind === 'couple' && r.state === 'pending' && (r.from === me || r.to === me));
const exposed = (b, ctx) => b.exposeA && b.exposeB && ctx.available(b.a) && ctx.available(b.b) && ctx.adult(b.a) && ctx.adult(b.b) && ctx.visible(b.a, b.b, 'couple');
const publicWho = (id, ctx) => {
    const user = ctx.who(id);
    if (!user || !PUB.test(user.pub))
        return ctx.fail(503, 'presentation_unconfigured', 'تعذّر عرض الحساب الآن.');
    // Never forward callback objects, account IDs, or account/profile extras.
    return { pub: user.pub, name: String(user.name || 'لاعب').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, 80) };
};
/** Own private view only; a circle membership means its current and future (max 20) unblocked members can see it. */
export function familySnapshot(s, me, ctx) {
    ctx.actor(me);
    const circle = ownCircle(s, me), bond = ownBond(s, me);
    const requestView = (r) => {
        const other = r.from === me ? r.to : r.from, visible = ctx.visible(me, other, r.kind === 'couple' ? 'couple' : 'family');
        return { id: r.id, kind: r.kind, circleId: visible ? r.circle : null, circleName: !visible || r.circle === null ? null : s.circles.find(c => c.id === r.circle)?.name ?? null, direction: r.to === me ? 'incoming' : 'outgoing', user: visible ? publicWho(other, ctx) : null, hidden: !visible, at: r.at };
    };
    const requests = s.requests.filter(r => r.state === 'pending' && (r.from === me || r.to === me));
    const bVisible = bond && ctx.visible(me, partner(bond, me), 'couple');
    return {
        ok: true,
        policy: { maxMembers: FAMILY_MEMBER_MAX, oneCircle: true, audience: 'current-and-future-unblocked-members', publicFamily: false, coupleLabel: 'ارتباط افتراضي', adultSelfDeclaredOnly: true, exclusive: true },
        circle: circle ? { id: circle.id, name: circle.name, isOwner: circle.owner === me, owner: circle.owner === me || ctx.visible(me, circle.owner, 'family') ? publicWho(circle.owner, ctx) : null, members: circle.members.filter(id => id === me || ctx.visible(me, id, 'family')).map(id => ({ ...publicWho(id, ctx), owner: id === circle.owner, mine: id === me })), at: circle.at } : null,
        invitations: requests.filter(r => r.kind !== 'couple').map(requestView),
        coupleRequests: requests.filter(r => r.kind === 'couple').map(requestView),
        couple: bond ? { id: bond.id, label: 'ارتباط افتراضي', partner: bVisible ? publicWho(partner(bond, me), ctx) : null, hidden: !bVisible, exposure: bond.a === me ? bond.exposeA : bond.exposeB, public: !!bVisible && exposed(bond, ctx), canDissolve: true } : null,
    };
}
/** For an existing public profile adapter only. Circle membership is NEVER public; no internal IDs or names. */
export function familyPublic(s, subject, viewer, ctx) {
    if (!ctx.available(subject))
        return { couple: null };
    const b = ownBond(s, subject);
    if (!b || !exposed(b, ctx))
        return { couple: null };
    const other = partner(b, subject);
    if (viewer && (!ctx.available(viewer) || (viewer !== subject && !ctx.visible(viewer, subject, 'couple')) || (viewer !== other && !ctx.visible(viewer, other, 'couple'))))
        return { couple: null };
    return { couple: { label: 'ارتباط افتراضي', partnerPub: publicWho(other, ctx).pub } };
}
/** Mutates only the provided extension; the caller MUST run this inside SocialPrivate.tx, including the receipt. */
export function applyFamilyCommand(s, me, input, ctx) {
    if (!isObj(input) || !action(input.action) || typeof input.key !== 'string' || !KEY.test(input.key))
        return ctx.fail(400, 'family_command', 'طلب العائلة غير صالح.');
    const act = input.action, fields = ACTION_FIELDS[act];
    if (Object.keys(input).some(k => k !== 'action' && k !== 'key' && !fields.includes(k)) || fields.some(k => input[k] === undefined))
        return ctx.fail(400, 'family_command', 'حقول الطلب غير صالحة.');
    if (fields.includes('id') && !pos(input.id))
        return ctx.fail(400, 'family_id', 'معرّف الطلب غير صالح.');
    if (fields.includes('to') && (typeof input.to !== 'string' || !PUB.test(input.to)))
        return ctx.fail(400, 'public_id', 'اختر معرّف اللاعب العام.');
    if (act === 'couple-exposure' && typeof input.enabled !== 'boolean')
        return ctx.fail(400, 'privacy', 'اختر إعداد ظهور صحيحًا.');
    const exit = ['leave', 'disband', 'couple-dissolve', 'reject', 'cancel', 'couple-reject', 'couple-cancel'].includes(act) || (act === 'couple-exposure' && input.enabled === false);
    ctx.actor(me, exit);
    const fp = createHash('sha256').update(JSON.stringify([act, ...fields.map(k => input[k])])).digest('hex');
    const receipt = s.receipts.find(r => r.actor === me && r.key === input.key);
    if (receipt) {
        if (receipt.fingerprint !== fp)
            return ctx.fail(409, 'ref_conflict', 'معرّف الطلب مستخدم لعملية مختلفة.');
        return { ...receipt.result, duplicate: true };
    }
    ctx.rate();
    const at = ctx.now();
    if (!nat(at))
        throw new TypeError('invalid_family_clock');
    const next = () => { if (s.seq >= Number.MAX_SAFE_INTEGER)
        return ctx.fail(409, 'capacity', 'تعذّرت العملية.'); return ++s.seq; };
    const finish = (r, state) => { r.state = state; r.decidedAt = at; };
    const cancelWhere = (fn) => { for (const r of s.requests)
        if (r.state === 'pending' && fn(r))
            finish(r, 'cancelled'); };
    const target = (kind) => { const other = ctx.resolve(input.to); if (!other)
        return ctx.fail(404, 'not_found', 'الحساب غير متاح.'); ctx.peer(me, other, kind); return other; };
    const adultPair = (a, b) => { if (!ctx.adult(a) || !ctx.adult(b))
        return ctx.fail(403, 'adult_required', 'الارتباط الافتراضي يحتاج تصريح عمر 18+ من الطرفين في الحساب.'); };
    const circleForMember = () => { const c = ownCircle(s, me); if (!c || c.id !== input.id)
        return ctx.fail(404, 'not_found', 'الدائرة غير متاحة.'); return c; };
    const circleForOwner = () => { const c = circleForMember(); if (c.owner !== me)
        return ctx.fail(403, 'owner_only', 'هذا الإجراء لمالك الدائرة فقط.'); return c; };
    const makeRequest = (kind, to, circle) => { const r = { id: next(), kind, circle, from: me, to, state: 'pending', at, decidedAt: null }; s.requests.push(r); return r.id; };
    let id;
    if (act === 'create') {
        const name = familySafeName(input.name);
        if (!name)
            return ctx.fail(400, 'family_name', 'اكتب اسمًا آمنًا من 3 إلى 32 حرفًا، دون روابط أو رموز مخفية.');
        if (ownCircle(s, me))
            return ctx.fail(409, 'already_member', 'يمكنك الانضمام إلى دائرة واحدة فقط.');
        if (s.circles.some(c => nameKey(c.name) === nameKey(name)))
            return ctx.fail(409, 'name_taken', 'اختر اسم دائرة آخر.');
        id = next();
        s.circles.push({ id, name, owner: me, members: [me], at });
        cancelWhere(r => r.kind === 'invite' && r.to === me);
    }
    else if (act === 'invite' || act === 'transfer') {
        const c = circleForOwner(), other = target('family');
        if (act === 'invite') {
            if (c.members.length >= FAMILY_MEMBER_MAX)
                return ctx.fail(409, 'family_full', 'الدائرة ممتلئة؛ الحد 20 عضوًا.');
            if (ownCircle(s, other))
                return ctx.fail(409, 'already_member', 'الحساب غير متاح للدعوة الآن.');
            for (const member of c.members)
                if (member !== other)
                    ctx.peer(member, other, 'family');
            const old = s.requests.find(r => r.kind === 'invite' && r.circle === c.id && r.to === other && r.state === 'pending');
            if (old)
                id = old.id;
            else {
                if (s.requests.filter(r => (r.circle === c.id || r.to === other) && r.state === 'pending').length >= FAMILY_MEMBER_MAX)
                    return ctx.fail(409, 'capacity', 'أكمل الدعوات الحالية أولًا.');
                id = makeRequest('invite', other, c.id);
            }
        }
        else {
            if (!c.members.includes(other))
                return ctx.fail(404, 'not_found', 'اختر عضوًا من الدائرة.');
            const old = s.requests.find(r => r.kind === 'transfer' && r.circle === c.id && r.state === 'pending');
            if (old && old.to !== other)
                return ctx.fail(409, 'transfer_pending', 'يوجد طلب نقل ملكية معلّق؛ ألغِه أولًا.');
            id = old?.id ?? makeRequest('transfer', other, c.id);
        }
    }
    else if (['accept', 'reject', 'cancel', 'couple-accept', 'couple-reject', 'couple-cancel'].includes(act)) {
        const couple = act.startsWith('couple-'), cancel = act.endsWith('cancel'), accept = act.endsWith('accept');
        const r = s.requests.find(r => r.id === input.id && (couple ? r.kind === 'couple' : r.kind !== 'couple') && (cancel ? r.from === me : r.to === me));
        if (!r)
            return ctx.fail(404, 'not_found', 'الطلب غير متاح.');
        if (r.state !== 'pending')
            return ctx.fail(409, 'request_state', 'هذا الطلب لم يعد معلّقًا.');
        id = r.id;
        if (!accept)
            finish(r, cancel ? 'cancelled' : 'rejected');
        else {
            ctx.peer(me, r.from, couple ? 'couple' : 'family');
            if (couple) {
                adultPair(me, r.from);
                if (ownBond(s, me) || ownBond(s, r.from))
                    return ctx.fail(409, 'exclusive', 'الارتباط الافتراضي حصري بين حسابين.');
                s.couples.push({ id: next(), a: r.from, b: me, exposeA: false, exposeB: false, at });
                finish(r, 'accepted');
                cancelWhere(x => x.kind === 'couple' && (x.from === me || x.to === me || x.from === r.from || x.to === r.from));
            }
            else {
                const c = s.circles.find(c => c.id === r.circle && c.owner === r.from);
                if (!c)
                    return ctx.fail(409, 'request_state', 'الدعوة لم تعد متاحة.');
                for (const member of c.members)
                    if (member !== me)
                        ctx.peer(me, member, 'family');
                if (r.kind === 'transfer') {
                    if (!c.members.includes(me))
                        return ctx.fail(409, 'request_state', 'طلب الملكية لم يعد متاحًا.');
                    c.owner = me;
                    finish(r, 'accepted');
                    cancelWhere(x => x.circle === c.id);
                }
                else {
                    if (ownCircle(s, me))
                        return ctx.fail(409, 'already_member', 'يمكنك الانضمام إلى دائرة واحدة فقط.');
                    if (c.members.length >= FAMILY_MEMBER_MAX)
                        return ctx.fail(409, 'family_full', 'الدائرة ممتلئة؛ الحد 20 عضوًا.');
                    c.members.push(me);
                    finish(r, 'accepted');
                    cancelWhere(x => x.kind === 'invite' && x.to === me);
                }
            }
        }
    }
    else if (act === 'leave' || act === 'kick') {
        const c = act === 'kick' ? circleForOwner() : circleForMember();
        // Leaving never needs consent or contact with another member. Kicking is ordinary-member removal only.
        const other = act === 'leave' ? me : target('family');
        if (other === c.owner)
            return ctx.fail(409, 'owner_locked', 'مالك الدائرة ينقل الملكية بقبول المستلم أو يحل الدائرة.');
        if (!c.members.includes(other))
            return ctx.fail(404, 'not_found', 'العضو غير متاح.');
        c.members = c.members.filter(member => member !== other);
        cancelWhere(r => r.circle === c.id && (r.to === other || r.from === other));
        id = c.id;
    }
    else if (act === 'disband') {
        const c = circleForOwner();
        id = c.id;
        s.circles = s.circles.filter(x => x !== c);
        cancelWhere(r => r.circle === c.id);
    }
    else if (act === 'couple-request') {
        const other = target('couple');
        adultPair(me, other);
        if (ownBond(s, me) || ownBond(s, other))
            return ctx.fail(409, 'exclusive', 'الارتباط الافتراضي حصري بين حسابين.');
        const a = pendingCouple(s, me), b = pendingCouple(s, other);
        if (a?.from === me && a.to === other)
            id = a.id;
        else if (a || b)
            return ctx.fail(409, 'pending_request', 'يوجد طلب ارتباط معلّق؛ أكمله أو ألغِه أولًا.');
        else
            id = makeRequest('couple', other, null);
    }
    else if (act === 'couple-dissolve') {
        const bond = ownBond(s, me);
        if (bond && bond.id === input.id) {
            id = bond.id;
            s.couples = s.couples.filter(b => b !== bond);
        }
        // A stale completion is harmless even after its receipt expires: never dissolve a newer bond or pending request.
    }
    else if (act === 'couple-exposure') {
        const b = ownBond(s, me);
        if (!b || b.id !== input.id)
            return ctx.fail(404, 'not_found', 'الارتباط الافتراضي لم يعد متاحًا.');
        if (input.enabled) {
            ctx.peer(me, partner(b, me), 'couple');
            adultPair(me, partner(b, me));
        }
        if (b.a === me)
            b.exposeA = input.enabled;
        else
            b.exposeB = input.enabled;
        id = b.id;
    }
    const result = id === undefined ? { ok: true, action: act } : { ok: true, action: act, id };
    s.receipts.push({ actor: me, key: input.key, fingerprint: fp, at, result });
    s.receipts = s.receipts.slice(-FAMILY_RECEIPT_MAX);
    const terminal = s.requests.filter(r => r.state !== 'pending').slice(-FAMILY_HISTORY_MAX), kept = new Set(terminal);
    s.requests = s.requests.filter(r => r.state === 'pending' || kept.has(r));
    return { ...result, duplicate: false };
}
