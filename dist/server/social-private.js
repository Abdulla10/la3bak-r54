import { createHash } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import { KeyedLimiter } from './ratelimit.js';
import { applyFamilyCommand, emptyFamilyState, familyPublic as publicFamilyView, familySnapshot as privateFamilyView, validFamilyState } from './family-r47.js';
export const SOCIAL_PRIVATE_LIMITS = {
    send: [20, 20 / 60], request: [10, 10 / 60], read: [120, 2], change: [30, 0.5],
};
export const PRIVATE_BODY_MAX = 2000, PRIVATE_PAGE_MAX = 50, PRIVATE_PAGE_DEFAULT = 20;
const REF_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,95}$/;
const identity = (x) => typeof x === 'string' && x.length > 0 && x.length <= 128 && !/[\u0000-\u0020\u007f]/.test(x);
const natural = (x) => Number.isSafeInteger(x) && x >= 0;
const positive = (x) => natural(x) && x > 0;
const fingerprint = (to, body) => createHash('sha256').update(JSON.stringify([to, body])).digest('hex');
/** Optional collections permit an empty/new additive schema; malformed nested records fail closed. */
export function validSocialPrivate(d) {
    if (d.v !== 1 || (d.seq !== undefined && !natural(d.seq)))
        return false;
    const links = d.links === undefined ? [] : d.links, messages = d.messages === undefined ? [] : d.messages, preferences = d.preferences === undefined ? [] : d.preferences;
    if (!Array.isArray(links) || !Array.isArray(messages) || !Array.isArray(preferences))
        return false;
    const ids = new Set(), pairs = new Set(), refs = new Set(), users = new Set();
    const seq = d.seq ?? 0;
    for (const l of links) {
        if (!isObj(l) || !positive(l.id) || l.id > seq || ids.has(l.id) || !identity(l.from) || !identity(l.to) || l.from === l.to || typeof l.state !== 'string' || !['pending', 'accepted', 'rejected', 'removed'].includes(l.state) || !natural(l.at) || !(l.decidedAt === null || natural(l.decidedAt)))
            return false;
        if ((l.state === 'pending') !== (l.decidedAt === null))
            return false;
        ids.add(l.id);
        if (l.state === 'pending' || l.state === 'accepted') {
            const pair = JSON.stringify([l.from, l.to].sort());
            if (pairs.has(pair))
                return false;
            pairs.add(pair);
        }
    }
    for (const m of messages) {
        if (!isObj(m) || !positive(m.id) || m.id > seq || ids.has(m.id) || !identity(m.from) || !identity(m.to) || m.from === m.to || typeof m.body !== 'string' || !m.body.trim() || m.body.length > PRIVATE_BODY_MAX || typeof m.ref !== 'string' || !REF_RE.test(m.ref) || typeof m.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(m.fingerprint) || !natural(m.at) || !(m.readAt === null || natural(m.readAt)))
            return false;
        const key = JSON.stringify([m.from, m.ref]);
        if (refs.has(key))
            return false;
        refs.add(key);
        ids.add(m.id);
    }
    for (const p of preferences) {
        if (!isObj(p) || !identity(p.id) || typeof p.dmEnabled !== 'boolean' || users.has(p.id))
            return false;
        users.add(p.id);
    }
    return validFamilyState(d.familyR47);
}
export class SocialPrivateError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'SocialPrivateError';
    }
}
const error = (status, code, message) => { throw new SocialPrivateError(status, code, message); };
export class SocialPrivate {
    file;
    now;
    callbacks;
    d = { v: 1, seq: 0, links: [], messages: [], preferences: [] };
    disk;
    lim;
    refs = new Map();
    constructor(file = '', now = Date.now, mon = new StorageMonitor(), callbacks = {}, limits = {}) {
        this.file = file;
        this.now = now;
        this.callbacks = callbacks;
        const L = { ...SOCIAL_PRIVATE_LIMITS, ...limits };
        for (const pair of Object.values(L))
            if (!Array.isArray(pair) || pair.length !== 2 || !Number.isFinite(pair[0]) || pair[0] < 1 || !Number.isFinite(pair[1]) || pair[1] < 0)
                throw new TypeError('invalid_social_private_limits');
        if (file) {
            const loaded = loadJsonFile(file, validSocialPrivate);
            if (loaded)
                this.d = { ...this.d, ...loaded };
        }
        this.disk = new Persister('social-private', file, () => this.d, now, mon, validSocialPrivate);
        this.lim = Object.fromEntries(Object.entries(L).map(([k, [capacity, refill]]) => [k, new KeyedLimiter(capacity, refill, now)]));
        this.reindex();
    }
    get persistent() { return !!this.file; }
    unsaved() { return this.disk.unsaved; }
    retry() { this.disk.retry(); }
    reindex() { this.refs = new Map(this.d.messages.map(m => [JSON.stringify([m.from, m.ref]), m])); }
    tx(fn) {
        const previous = structuredClone(this.d);
        try {
            const out = fn();
            this.disk.mustSave();
            this.reindex();
            return out;
        }
        catch (e) {
            this.d = previous;
            this.reindex();
            throw e;
        }
    }
    check(kind, a, b) {
        const fn = this.callbacks[kind];
        if (!fn)
            return error(503, 'safety_unconfigured', 'الخصوصية غير مهيأة الآن.');
        const result = kind === 'isBlocked' ? fn(a, b) : fn(a);
        if (typeof result !== 'boolean')
            return error(503, 'safety_unconfigured', 'الخصوصية غير مهيأة الآن.');
        return result;
    }
    actor(me) {
        // Require every safety callback even for reads without a peer.
        if (!['hasAccount', 'isBanned', 'isBlocked'].every(k => typeof this.callbacks[k] === 'function'))
            return error(503, 'safety_unconfigured', 'الخصوصية غير مهيأة الآن.');
        if (!identity(me) || !this.check('hasAccount', me))
            return error(401, 'auth', 'سجّل دخولك أول.');
        if (this.check('isBanned', me))
            return error(403, 'banned', 'هذا الحساب موقوف.');
    }
    peer(me, other) {
        this.actor(me);
        if (!identity(other) || !this.check('hasAccount', other) || this.check('isBanned', other))
            return error(404, 'not_found', 'الحساب غير متاح.');
        if (other === me)
            return error(400, 'self', 'اختر حسابًا آخر.');
        if (this.check('isBlocked', me, other) || this.check('isBlocked', other, me))
            return error(403, 'blocked', 'لا يمكن التواصل مع هذا الحساب.');
    }
    visible(me, other) { return this.check('hasAccount', other) && !this.check('isBanned', other) && !this.check('isBlocked', me, other) && !this.check('isBlocked', other, me); }
    rate(kind, me) { if (!this.lim[kind].allow(me))
        return error(429, 'rate', 'طلبات كثيرة، جرّب بعد شوي.'); }
    tick() { const t = this.now(); if (!natural(t))
        throw new TypeError('invalid_social_private_clock'); return t; }
    nextId() { if (this.d.seq >= Number.MAX_SAFE_INTEGER)
        return error(409, 'capacity', 'تعذّرت العملية.'); return ++this.d.seq; }
    pairLink(me, other) { return this.d.links.find(l => (l.state === 'pending' || l.state === 'accepted') && ((l.from === me && l.to === other) || (l.from === other && l.to === me))); }
    accepted(me, other) { return this.pairLink(me, other)?.state === 'accepted'; }
    friendGuard(me, other) { this.peer(me, other); if (!this.accepted(me, other))
        return error(403, 'friends_only', 'الرسائل متاحة للأصدقاء المقبولين فقط.'); }
    who(id) {
        const pub = this.callbacks.pub?.(id);
        if (typeof pub !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(pub))
            return error(503, 'presentation_unconfigured', 'تعذّر عرض الحساب الآن.');
        return { pub, name: this.callbacks.nameOf?.(id) || 'لاعب' };
    }
    dmEnabled(id) { return this.d.preferences.find(p => p.id === id)?.dmEnabled ?? true; }
    page(rows, opts = {}) {
        let before = Infinity, limit = PRIVATE_PAGE_DEFAULT;
        if (opts.before !== undefined && opts.before !== null && opts.before !== '') {
            const n = Number(opts.before);
            if (!positive(n))
                return error(400, 'page', 'صفحة غير صالحة.');
            before = n;
        }
        if (opts.limit !== undefined && opts.limit !== null && opts.limit !== '') {
            const n = Number(opts.limit);
            if (!positive(n))
                return error(400, 'page', 'حجم صفحة غير صالح.');
            limit = Math.min(n, PRIVATE_PAGE_MAX);
        }
        const selected = rows.filter(r => r.id < before).sort((a, b) => b.id - a.id).slice(0, limit + 1);
        const more = selected.length > limit, list = selected.slice(0, limit);
        return { list, more, nextBefore: more ? list.at(-1).id : null };
    }
    linkView(l, me) { return { id: l.id, user: this.who(l.from === me ? l.to : l.from), direction: l.to === me ? 'incoming' : 'outgoing', state: l.state, at: l.at, decidedAt: l.decidedAt }; }
    messageView(m, me) { return { id: m.id, body: m.body, mine: m.from === me, at: m.at, read: m.readAt !== null, readAt: m.readAt }; }
    settings(me) { this.actor(me); this.rate('read', me); return { dmEnabled: this.dmEnabled(me), audience: 'accepted-friends' }; }
    setDMEnabled(me, enabled) {
        this.actor(me);
        if (typeof enabled !== 'boolean')
            return error(400, 'privacy', 'اختر إعدادًا صحيحًا.');
        if (this.dmEnabled(me) !== enabled) {
            this.rate('change', me);
            this.tx(() => { const p = this.d.preferences.find(p => p.id === me); if (p)
                p.dmEnabled = enabled;
            else
                this.d.preferences.push({ id: me, dmEnabled: enabled }); });
        }
        return { dmEnabled: enabled, audience: 'accepted-friends' };
    }
    /** Actual accepted reciprocal links; never derived from follows, bans or visibility. */
    friendsCount(me) { this.actor(me); return this.d.links.filter(l => l.state === 'accepted' && (l.from === me || l.to === me)).length; }
    friendsPresent(me, publicIds) {
        this.actor(me);
        return this.d.links.filter(l => l.state === 'accepted' && (l.from === me || l.to === me)).flatMap(l => {
            const other = l.from === me ? l.to : l.from;
            if (!this.visible(me, other))
                return [];
            const who = this.who(other);
            return publicIds.has(who.pub) ? [{ id: who.pub, name: who.name }] : [];
        });
    }
    /** R58f: معرّفات الأصدقاء المقبولين الظاهرين (داخلي) — لشريط «الأصدقاء الحين» */
    friendInternalIds(me) { this.actor(me); return this.d.links.filter(l => l.state === 'accepted' && (l.from === me || l.to === me)).map(l => l.from === me ? l.to : l.from).filter(o => this.visible(me, o)); }
    friends(me, opts = {}) {
        this.actor(me);
        this.rate('read', me);
        const p = this.page(this.d.links.filter(l => l.state === 'accepted' && (l.from === me || l.to === me) && this.visible(me, l.from === me ? l.to : l.from)), opts);
        return { ...p, list: p.list.map(l => this.linkView(l, me)), friendsCount: this.friendsCount(me) };
    }
    requests(me, opts = {}) {
        this.actor(me);
        this.rate('read', me);
        const direction = opts.direction ?? 'incoming';
        if (direction !== 'incoming' && direction !== 'outgoing')
            return error(400, 'direction', 'قائمة غير صالحة.');
        const p = this.page(this.d.links.filter(l => l.state === 'pending' && (direction === 'incoming' ? l.to === me : l.from === me) && this.visible(me, l.from === me ? l.to : l.from)), opts);
        return { ...p, list: p.list.map(l => this.linkView(l, me)) };
    }
    request(me, other) {
        this.peer(me, other);
        const current = this.pairLink(me, other);
        if (current?.state === 'accepted' || current?.from === me)
            return this.linkView(current, me);
        if (current)
            return error(409, 'incoming_pending', 'يوجد طلب وارد؛ اقبله أو ارفضه بنفسك.');
        this.rate('request', me);
        return this.tx(() => { const l = { id: this.nextId(), from: me, to: other, state: 'pending', at: this.tick(), decidedAt: null }; this.d.links.push(l); return this.linkView(l, me); });
    }
    recipientRequest(me, id) {
        this.actor(me);
        const n = Number(id);
        const l = positive(n) ? this.d.links.find(l => l.id === n && l.to === me) : undefined;
        if (!l)
            return error(404, 'not_found', 'الطلب غير متاح.');
        this.peer(me, l.from);
        return l;
    }
    accept(me, id) {
        const l = this.recipientRequest(me, id);
        if (l.state === 'accepted')
            return this.linkView(l, me);
        if (l.state !== 'pending')
            return error(409, 'request_state', 'هذا الطلب لم يعد معلّقًا.');
        this.rate('change', me);
        return this.tx(() => { l.state = 'accepted'; l.decidedAt = this.tick(); return this.linkView(l, me); });
    }
    reject(me, id) {
        const l = this.recipientRequest(me, id);
        if (l.state === 'rejected')
            return { rejected: true };
        if (l.state !== 'pending')
            return error(409, 'request_state', 'هذا الطلب لم يعد معلّقًا.');
        this.rate('change', me);
        return this.tx(() => { l.state = 'rejected'; l.decidedAt = this.tick(); return { rejected: true }; });
    }
    /** Either friend may remove; only the original sender may cancel a pending request. Removal works after a block. */
    remove(me, other) {
        this.actor(me);
        if (!identity(other) || other === me)
            return error(400, 'peer', 'حساب غير صالح.');
        const l = this.pairLink(me, other);
        if (!l)
            return { removed: true };
        if (l.state === 'pending' && l.from !== me)
            return error(403, 'recipient_only', 'ارفض الطلب الوارد بدل إلغائه.');
        this.rate('change', me);
        return this.tx(() => { l.state = 'removed'; l.decidedAt = this.tick(); return { removed: true }; });
    }
    send(me, other, input) {
        this.friendGuard(me, other);
        if (!isObj(input) || Object.keys(input).some(k => k !== 'body' && k !== 'ref'))
            return error(400, 'text_only', 'الرسائل النصية فقط متاحة.');
        if (typeof input.ref !== 'string' || !REF_RE.test(input.ref))
            return error(400, 'ref', 'معرّف الرسالة غير صالح.');
        if (typeof input.body !== 'string' || input.body.length > PRIVATE_BODY_MAX)
            return error(400, 'body', 'الرسالة طويلة أو غير صالحة.');
        const body = input.body.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').trim();
        if (!body)
            return error(400, 'body', 'اكتب رسالة نصية.');
        const fp = fingerprint(other, input.body), old = this.refs.get(JSON.stringify([me, input.ref]));
        if (old) {
            if (old.fingerprint !== fp)
                return error(409, 'ref_conflict', 'معرّف الرسالة مستخدم لمحتوى مختلف.');
            return { message: this.messageView(old, me), duplicate: true };
        }
        if (!this.dmEnabled(me) || !this.dmEnabled(other))
            return error(403, 'dm_disabled', 'الرسائل الخاصة موقوفة.');
        this.rate('send', me);
        return this.tx(() => { const m = { id: this.nextId(), from: me, to: other, body, ref: input.ref, fingerprint: fp, at: this.tick(), readAt: null }; this.d.messages.push(m); return { message: this.messageView(m, me), duplicate: false }; });
    }
    conversation(me, other, opts = {}) {
        this.friendGuard(me, other);
        this.rate('read', me);
        const p = this.page(this.d.messages.filter(m => (m.from === me && m.to === other) || (m.to === me && m.from === other)), opts);
        return { ...p, list: p.list.map(m => this.messageView(m, me)), user: this.who(other), canSend: this.dmEnabled(me) && this.dmEnabled(other) };
    }
    inboxRows(me) {
        const rows = new Map();
        for (const m of this.d.messages) {
            if (m.from !== me && m.to !== me)
                continue;
            const other = m.from === me ? m.to : m.from;
            if (this.accepted(me, other) && this.visible(me, other))
                rows.set(other, m);
        }
        return rows;
    }
    unreadCount(me) { const peers = this.inboxRows(me); return this.d.messages.filter(m => m.to === me && m.readAt === null && peers.has(m.from)).length; }
    inbox(me, opts = {}) {
        this.actor(me);
        this.rate('read', me);
        const rows = this.inboxRows(me);
        const p = this.page([...rows.values()], opts);
        return { ...p, list: p.list.map(m => { const other = m.from === me ? m.to : m.from; return { id: m.id, user: this.who(other), last: this.messageView(m, me), unread: this.d.messages.filter(x => x.to === me && x.from === other && x.readAt === null).length }; }), unread: this.unreadCount(me) };
    }
    /** R47 uses this same private state + Persister + tx. No parallel identity, storage file, or wallet. */
    familyContext(me) {
        const deactivated = (id) => {
            const value = this.callbacks.isDeactivated?.(id);
            if (typeof value !== 'boolean')
                return error(503, 'safety_unconfigured', 'خصوصية العلاقات غير مهيأة الآن.');
            return value;
        };
        const available = (id) => identity(id) && this.check('hasAccount', id) && !this.check('isBanned', id) && !deactivated(id);
        const allowed = (id, kind) => {
            if (!this.dmEnabled(id))
                return false;
            const callback = this.callbacks.relationRequestsAllowed;
            if (!callback)
                return true;
            const value = callback(id, kind);
            if (typeof value !== 'boolean')
                return error(503, 'safety_unconfigured', 'خصوصية العلاقات غير مهيأة الآن.');
            return value;
        };
        const relationActor = (id, exit = false) => {
            // Self-removal/revocation is never held hostage by block, changed age, privacy, suspension or deactivation.
            if (exit) {
                if (!identity(id) || !this.check('hasAccount', id))
                    return error(401, 'auth', 'سجّل دخولك أول.');
                return;
            }
            this.actor(id);
            if (deactivated(id))
                return error(403, 'deactivated', 'الحساب غير نشط.');
        };
        const visible = (a, b, kind) => available(a) && available(b) && !this.check('isBlocked', a, b) && !this.check('isBlocked', b, a) && allowed(a, kind) && allowed(b, kind);
        return {
            now: () => this.tick(), actor: relationActor, available, visible,
            peer: (a, b, kind) => {
                relationActor(a);
                this.peer(a, b);
                if (deactivated(b))
                    return error(404, 'not_found', 'الحساب غير متاح.');
                if (!allowed(a, kind) || !allowed(b, kind))
                    return error(403, 'relation_privacy', 'طلبات العلاقات موقوفة حسب إعداد الخصوصية.');
            },
            adult: id => {
                if (typeof this.callbacks.adultSelfDeclared !== 'function')
                    return error(503, 'age_unconfigured', 'تصريح العمر غير مهيأ الآن.');
                return this.callbacks.adultSelfDeclared(id) === true;
            },
            resolve: pub => {
                if (typeof this.callbacks.resolvePublicId !== 'function')
                    return error(503, 'public_bridge_unconfigured', 'دليل اللاعبين غير مهيأ الآن.');
                const id = this.callbacks.resolvePublicId(pub);
                return typeof id === 'string' && identity(id) ? id : null;
            },
            who: id => this.who(id), rate: () => { if (me)
                this.rate('change', me); }, fail: error,
        };
    }
    familySnapshot(me) {
        this.rate('read', me);
        return privateFamilyView(this.d.familyR47 ?? emptyFamilyState(), me, this.familyContext(me));
    }
    familyCommand(me, command) {
        return this.tx(() => {
            const state = this.d.familyR47 ??= emptyFamilyState();
            return applyFamilyCommand(state, me, command, this.familyContext(me));
        });
    }
    /** R58w: الارتباط الافتراضي الحالي (للخادم بس: نقاط CP). ما يغيّر شي ولا يتجاوز إعدادات الظهور. */
    coupleOf(me) { const b = (this.d.familyR47?.couples ?? []).find(x => x.a === me || x.b === me); return b ? { id: b.id, partner: b.a === me ? b.b : b.a, at: b.at } : null; }
    /** Parent resolves subject/viewer from the current account/profile; never accept internal IDs from HTTP. */
    familyPublic(subject, viewer) {
        return publicFamilyView(this.d.familyR47 ?? emptyFamilyState(), subject, viewer, this.familyContext());
    }
    unread(me) { this.actor(me); this.rate('read', me); return this.unreadCount(me); }
    /** Atomic batch: recipient's own incoming messages only. No silent cross-user updates. */
    markRead(me, ids) {
        this.actor(me);
        if (!Array.isArray(ids) || ids.length > PRIVATE_PAGE_MAX || ids.some(id => !positive(id)))
            return error(400, 'ids', 'قائمة الرسائل غير صالحة.');
        const messages = [...new Set(ids)].map(id => this.d.messages.find(m => m.id === id && m.to === me));
        if (messages.some(m => !m))
            return error(404, 'not_found', 'الرسالة غير متاحة.');
        for (const m of messages)
            this.friendGuard(me, m.from);
        const changed = messages.filter((m) => !!m && m.readAt === null);
        this.rate('change', me);
        if (changed.length)
            this.tx(() => { const at = this.tick(); for (const m of changed)
                m.readAt = at; });
        return { read: changed.length, unread: this.unreadCount(me) };
    }
}
