import { createHash } from 'node:crypto';
import { itemOf } from './catalog.js';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import { PRICE_MAX } from './wallet.js';
const DAY = 86_400_000;
const MAX_DATE = 8_640_000_000_000_000;
const KEY = /^[A-Za-z0-9:_-]{8,80}$/;
const ID = /^[a-z][a-z0-9-]{2,63}$/;
const USER = /^[A-Za-z0-9_-]{1,100}$/;
const HASH = /^[a-f0-9]{64}$/;
const nat = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const pos = (v) => nat(v) && v > 0;
const date = (v) => nat(v) && v <= MAX_DATE;
const text = (v, max) => typeof v === 'string' && !!v.trim() && v === v.trim()
    && v.length <= max && !/[\u0000-\u001f\u007f<>]/.test(v);
const exact = (v, keys) => Object.keys(v).every(k => keys.includes(k));
const user = (v) => typeof v === 'string' && USER.test(v) && !['__proto__', 'constructor', 'prototype'].includes(v);
const requestKey = (v) => typeof v === 'string' && KEY.test(v) && !['__proto__', 'constructor', 'prototype'].includes(v);
const clone = (v) => structuredClone(v);
const hash = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const scopedKey = (id, key) => JSON.stringify([id, key]);
const orderIdFor = (id, key) => 'vm_' + hash(['la3bak-vip-membership-v1', id, key]);
export class VipMembershipError extends Error {
    code;
    status;
    constructor(code, status = 400) {
        super(code);
        this.code = code;
        this.status = status;
        this.name = 'VipMembershipError';
    }
}
function validPackage(v) {
    return isObj(v) && exact(v, ['id', 'name', 'points', 'durationDays', 'price', 'approved', 'enabled'])
        && typeof v.id === 'string' && ID.test(v.id) && text(v.name, 100)
        && pos(v.points) && v.points <= 1_000_000_000 && pos(v.durationDays) && date(v.durationDays * DAY)
        && isObj(v.price) && exact(v.price, ['cur', 'amount']) && (v.price.cur === 'coins' || v.price.cur === 'gems')
        // Positive prices only: no free or unconfirmed-debit VIP XP grants.
        && pos(v.price.amount) && v.price.amount <= PRICE_MAX[v.price.cur]
        && typeof v.approved === 'boolean' && typeof v.enabled === 'boolean';
}
function validBenefit(v) {
    return isObj(v) && exact(v, ['id', 'name', 'description', 'level', 'artwork', 'itemId', 'requiresActive'])
        && typeof v.id === 'string' && ID.test(v.id) && text(v.name, 100) && text(v.description, 500)
        && pos(v.level) && v.level <= 15 && typeof v.requiresActive === 'boolean'
        && typeof v.artwork === 'string' && (v.artwork === '' || /^\/(?!\/)[A-Za-z0-9_./-]+$/.test(v.artwork))
        && v.artwork.length <= 300 && !v.artwork.includes('..')
        && (v.itemId === undefined || (typeof v.itemId === 'string' && ID.test(v.itemId)));
}
function validPolicy(v) {
    return isObj(v) && exact(v, ['renewal', 'expiry', 'warningsDays']) && v.renewal === 'preserve-active-expiry'
        && v.expiry === 'retain-lifetime-xp' && Array.isArray(v.warningsDays) && v.warningsDays.length <= 20
        && v.warningsDays.every(d => nat(d) && date(d * DAY)) && new Set(v.warningsDays).size === v.warningsDays.length;
}
function validConfig(v) {
    return isObj(v) && exact(v, ['enabled', 'packages', 'benefits', 'policy']) && typeof v.enabled === 'boolean'
        && Array.isArray(v.packages) && v.packages.length <= 100 && v.packages.every(validPackage)
        && new Set(v.packages.map(p => p.id)).size === v.packages.length
        && Array.isArray(v.benefits) && v.benefits.length <= 200 && v.benefits.every(validBenefit)
        && new Set(v.benefits.map(b => b.id)).size === v.benefits.length
        && (v.policy === null || validPolicy(v.policy))
        && (!v.enabled || (validPolicy(v.policy) && v.packages.some(p => p.enabled && p.approved)));
}
function validTerm(v) {
    return isObj(v) && date(v.startedAt) && date(v.expiresAt) && v.expiresAt > v.startedAt && date(v.renewedAt)
        && v.renewedAt >= v.startedAt && v.renewedAt < v.expiresAt && (v.priorExpiresAt === null || date(v.priorExpiresAt));
}
function validSnapshot(v) {
    return isObj(v) && validPackage(v.package) && v.package.enabled && v.package.approved && validPolicy(v.policy)
        && nat(v.configRevision) && isObj(v.progressionVip) && v.progressionVip.enabled === true && v.progressionVip.max === 15
        && Array.isArray(v.progressionVip.thresholds) && v.progressionVip.thresholds.length === 15
        && v.progressionVip.thresholds.every(nat) && v.progressionVip.thresholds.every((n, i, a) => i === 0 || n > a[i - 1]);
}
function validOrder(key, v) {
    if (!isObj(v) || !user(v.userId) || !requestKey(v.key) || key !== scopedKey(v.userId, v.key)
        || v.id !== orderIdFor(v.userId, v.key) || v.debitKey !== 'vip:' + v.id || v.pointsRef !== 'vip:' + v.id
        || !validSnapshot(v.snapshot) || v.fingerprint !== hash([v.userId, v.snapshot]) || !date(v.createdAt)
        || !['pending', 'debited', 'complete', 'failed'].includes(String(v.status))
        || (v.code !== undefined && !text(v.code, 100)) || !validTerm(v.term))
        return false;
    const term = v.term;
    const active = term.priorExpiresAt !== null && term.priorExpiresAt > term.renewedAt;
    if (term.renewedAt !== v.createdAt || term.expiresAt !== (active ? term.priorExpiresAt : term.renewedAt) + v.snapshot.package.durationDays * DAY
        || (!active && term.startedAt !== term.renewedAt))
        return false;
    if (v.status === 'failed' && !text(v.code, 100))
        return false;
    return v.status !== 'complete' || (date(v.completedAt) && v.completedAt >= v.createdAt);
}
/** Metadata only. Full validation on load/save; corrupt state is never silently reset. */
export const validVipMembership = (v) => v.v === 1 && validConfig(v.config) && nat(v.revision)
    && isObj(v.orders) && Object.entries(v.orders).every(([k, o]) => validOrder(k, o))
    && isObj(v.members) && Object.entries(v.members).every(([id, m]) => user(id) && validTerm(m) && isObj(m)
    && typeof m.orderId === 'string' && Array.isArray(m.warningsDays) && m.warningsDays.every(nat)
    && Object.values(v.orders).some(o => o.userId === id && o.id === m.orderId && o.status === 'complete'
        && JSON.stringify(o.term) === JSON.stringify({ startedAt: m.startedAt, expiresAt: m.expiresAt, renewedAt: m.renewedAt, priorExpiresAt: m.priorExpiresAt })
        && JSON.stringify(m.warningsDays) === JSON.stringify(o.snapshot.policy.warningsDays)))
    && Array.isArray(v.audit) && v.audit.every(a => isObj(a) && date(a.at) && text(a.actor, 100)
    && text(a.action, 100) && text(a.ref, 200) && text(a.reason, 500))
    && isObj(v.configReceipts) && Object.values(v.configReceipts).every(r => isObj(r) && typeof r.fingerprint === 'string' && HASH.test(r.fingerprint) && validConfig(r.config))
    && isObj(v.notices) && Object.entries(v.notices).every(([ref, n]) => isObj(n) && typeof n.sent === 'boolean'
    && isObj(n.notice) && user(n.notice.userId) && ref === n.notice.ref && /^[A-Za-z0-9:_-]{8,100}$/.test(ref)
    && text(n.notice.title, 100) && text(n.notice.body, 2000) && date(n.notice.expiresAt) && nat(n.notice.warningDays));
/** Single writer, shared canonical Wallet and Progression. Intent -> debit proof -> dates -> XP -> receipt.
 * No browser amounts, financial account duplication, auto renewal, cash payments or item deletion.
 */
export class VipMembership {
    options;
    d = { v: 1, config: { enabled: false, packages: [], benefits: [], policy: null }, revision: 0,
        orders: {}, members: {}, audit: [], configReceipts: {}, notices: {} };
    disk;
    tail = Promise.resolve();
    clock;
    catalog;
    persistent;
    constructor(file, options) {
        this.options = options;
        this.persistent = !!file;
        this.clock = options.now ?? Date.now;
        this.catalog = options.catalogItem ?? itemOf;
        const loaded = file ? loadJsonFile(file, validVipMembership) : undefined;
        if (loaded)
            this.d = loaded;
        this.disk = new Persister('vip-membership', file, () => this.d, this.clock, options.mon ?? new StorageMonitor(), validVipMembership);
    }
    now() { const t = this.clock(); if (!date(t))
        throw new VipMembershipError('vip_membership_clock_invalid'); return t; }
    account(id) {
        if (!user(id) || !this.options.hasAccount(id))
            throw new VipMembershipError('vip_membership_account_not_found', 404);
    }
    actor(actor, ownerOnly = false) {
        if (!actor || !user(actor.id) || !['owner', 'admin'].includes(actor.role) || (ownerOnly && actor.role !== 'owner'))
            throw new VipMembershipError('vip_membership_forbidden', 403);
    }
    tx(fn) {
        const before = clone(this.d);
        try {
            const out = fn();
            this.disk.mustSave();
            return out;
        }
        catch (e) {
            this.d = before;
            throw e;
        }
    }
    enqueue(fn) {
        const run = this.tail.then(fn);
        this.tail = run.then(() => undefined, () => undefined);
        return run;
    }
    log(actor, action, ref, reason) { this.d.audit.push({ at: this.now(), actor, action, ref, reason }); }
    configView() { return clone(this.d.config); }
    /** Server RBAC actor only. Exact envelope, immutable idempotency receipt and reasoned config audit. */
    configure(input, actor) {
        this.actor(actor, true);
        if (!isObj(input) || !exact(input, ['config', 'reason', 'key']) || !validConfig(input.config)
            || !text(input.reason, 500) || !requestKey(input.key))
            throw new VipMembershipError('vip_membership_config_invalid');
        const config = {
            enabled: input.config.enabled,
            packages: input.config.packages.map(p => ({ id: p.id, name: p.name, points: p.points, durationDays: p.durationDays,
                price: { cur: p.price.cur, amount: p.price.amount }, approved: p.approved, enabled: p.enabled })).sort((a, b) => a.id.localeCompare(b.id)),
            benefits: input.config.benefits.map(b => ({ id: b.id, name: b.name, description: b.description, level: b.level,
                artwork: b.artwork, ...(b.itemId ? { itemId: b.itemId } : {}), requiresActive: b.requiresActive })).sort((a, b) => a.level - b.level || a.id.localeCompare(b.id)),
            policy: input.config.policy ? { renewal: input.config.policy.renewal, expiry: input.config.policy.expiry,
                warningsDays: [...input.config.policy.warningsDays].sort((a, b) => b - a) } : null,
        };
        const key = scopedKey(actor.id, input.key), fingerprint = hash([config, input.reason]);
        const old = this.d.configReceipts[key];
        if (old) {
            if (old.fingerprint !== fingerprint)
                throw new VipMembershipError('vip_membership_key_conflict', 409);
            return clone(old.config);
        }
        for (const benefit of config.benefits)
            if (benefit.itemId && !this.cosmetic(benefit.itemId))
                throw new VipMembershipError('vip_membership_catalog_item_invalid');
        if (config.enabled && (!this.persistent || !this.options.wallet.persistent || !this.options.progression.persistent))
            throw new VipMembershipError('vip_membership_persistence_required', 409);
        return this.tx(() => {
            this.d.config = config;
            this.d.revision++;
            this.d.configReceipts[key] = { fingerprint, config: clone(config) };
            this.log(actor.id, 'configure', input.key, input.reason);
            return this.configView();
        });
    }
    cosmetic(id) {
        const item = this.catalog(id);
        return item && item.id === id && ['frame', 'bg', 'title', 'badge', 'avatar'].includes(item.slot) ? item : undefined;
    }
    economicSnapshot(id, packageId) {
        if (!this.d.config.enabled || !this.d.config.policy)
            throw new VipMembershipError('vip_membership_not_configured', 409);
        const pack = this.d.config.packages.find(p => p.id === packageId && p.approved && p.enabled);
        if (!pack)
            throw new VipMembershipError('vip_membership_package_unavailable', 404);
        const vip = this.options.progression.configView().vip;
        if (!vip.enabled || !vip.thresholds)
            throw new VipMembershipError('vip_membership_progression_disabled', 409);
        if (!this.persistent || !this.options.wallet.persistent || !this.options.progression.persistent)
            throw new VipMembershipError('vip_membership_persistence_required', 409);
        if (!nat(this.options.progression.view(id).vip.points + pack.points))
            throw new VipMembershipError('vip_membership_points_overflow', 409);
        return clone({ package: pack, policy: this.d.config.policy, configRevision: this.d.revision, progressionVip: vip });
    }
    term(id, durationDays) {
        const now = this.now(), old = this.d.members[id], active = !!old && old.expiresAt > now;
        const expiresAt = (active ? old.expiresAt : now) + durationDays * DAY;
        if (!date(expiresAt))
            throw new VipMembershipError('vip_membership_expiry_overflow', 409);
        return { startedAt: active ? old.startedAt : now, expiresAt, renewedAt: now, priorExpiresAt: old?.expiresAt ?? null };
    }
    preview(id, input) {
        this.account(id);
        if (!isObj(input) || !exact(input, ['packageId']) || typeof input.packageId !== 'string' || !ID.test(input.packageId))
            throw new VipMembershipError('vip_membership_request_invalid');
        if (this.hasPending(id))
            throw new VipMembershipError('vip_membership_pending_recovery', 409);
        const snapshot = this.economicSnapshot(id, input.packageId), current = this.options.progression.view(id).vip;
        const after = current.points + snapshot.package.points;
        const level = snapshot.progressionVip.thresholds.reduce((r, floor, i) => after >= floor ? i + 1 : r, 0);
        const term = this.term(id, snapshot.package.durationDays);
        return { package: clone(snapshot.package), fingerprint: hash([id, snapshot]), serverNow: this.now(), vipPointsBefore: current.points,
            vipPointsAfter: after, projectedLevel: level ? 'V' + level : null, startedAt: term.startedAt, expiresAt: term.expiresAt,
            policy: clone(snapshot.policy), benefits: clone(this.d.config.benefits.filter(b => b.level <= level && b.itemId && !!this.cosmetic(b.itemId))),
            paymentMode: 'internal-virtual-currency' };
    }
    safeOrder(o) {
        return { id: o.id, packageId: o.snapshot.package.id, packageName: o.snapshot.package.name, points: o.snapshot.package.points,
            durationDays: o.snapshot.package.durationDays, price: clone(o.snapshot.package.price), fingerprint: o.fingerprint,
            status: o.status, createdAt: o.createdAt, startedAt: o.term?.startedAt ?? null, expiresAt: o.term?.expiresAt ?? null,
            completedAt: o.completedAt ?? null, ...(o.code ? { code: o.code } : {}) };
    }
    view(id) {
        this.account(id);
        const now = this.now(), member = this.d.members[id], active = !!member && now < member.expiresAt;
        const vip = this.options.progression.view(id).vip, level = vip.value ? Number(vip.value.slice(1)) : 0;
        const owned = new Set(this.options.wallet.owned(id));
        const benefits = this.d.config.benefits.map(b => {
            const available = !!b.itemId && !!this.cosmetic(b.itemId);
            // Legacy rank/ownership is never suppressed by the new timed policy. Only explicit purchasers opt in.
            const lockedReason = !available ? 'catalog-unavailable' : level < b.level ? 'level-required' : b.requiresActive && !!member && !active ? 'active-membership-required' : null;
            const eligible = lockedReason === null;
            return { ...clone(b), eligible, unlocked: eligible, owned: !!b.itemId && owned.has(b.itemId), state: eligible ? 'unlocked' : 'locked', lockedReason };
        });
        return { enabled: this.d.config.enabled, purchasesEnabled: this.d.config.enabled && vip.enabled && this.persistent
                && this.options.wallet.persistent && this.options.progression.persistent,
            persistent: this.persistent, serverNow: now, mode: member ? 'timed' : 'legacy-untimed', legacyEligibilityUnchanged: true,
            timedGatingApplies: !!member, active, status: member ? (active ? 'active' : 'expired') : 'legacy-untimed',
            startedAt: member?.startedAt ?? null, expiresAt: member?.expiresAt ?? null, remainingMs: member ? Math.max(0, member.expiresAt - now) : 0,
            vip: clone(vip), packages: clone(this.d.config.packages.filter(p => p.enabled && p.approved)), policy: clone(this.d.config.policy),
            benefits, futureBenefits: clone(this.d.config.benefits.filter(b => b.level > level)),
            orders: Object.values(this.d.orders).filter(o => o.userId === id).slice(-50).reverse().map(o => this.safeOrder(o)) };
    }
    order(id, orderId) {
        this.account(id);
        if (typeof orderId !== 'string' || !/^vm_[a-f0-9]{64}$/.test(orderId))
            throw new VipMembershipError('vip_membership_request_invalid');
        const order = Object.values(this.d.orders).find(o => o.userId === id && o.id === orderId);
        if (!order)
            throw new VipMembershipError('vip_membership_order_not_found', 404);
        return this.safeOrder(order);
    }
    buy(id, input) {
        // Freeze before enqueue so a caller cannot mutate the request while it waits.
        if (!isObj(input) || !exact(input, ['packageId', 'fingerprint', 'key']) || typeof input.packageId !== 'string' || !ID.test(input.packageId)
            || typeof input.fingerprint !== 'string' || !HASH.test(input.fingerprint) || !requestKey(input.key))
            return Promise.reject(new VipMembershipError('vip_membership_request_invalid'));
        const request = { packageId: input.packageId, fingerprint: input.fingerprint, key: input.key };
        return this.enqueue(() => this.buyLocked(id, request));
    }
    buyLocked(id, input) {
        this.account(id);
        const key = scopedKey(id, input.key), old = this.d.orders[key];
        if (old) {
            if (old.snapshot.package.id !== input.packageId || old.fingerprint !== input.fingerprint)
                throw new VipMembershipError('vip_membership_key_conflict', 409);
            return this.settle(key, true);
        }
        // A user's prior in-flight renewal must finish before planning another term; never overlap frozen terms.
        for (const [k, o] of Object.entries(this.d.orders))
            if (o.userId === id && (o.status === 'pending' || o.status === 'debited'))
                this.settle(k, true);
        if (this.hasPending(id))
            throw new VipMembershipError('vip_membership_pending_recovery', 409);
        const snapshot = this.economicSnapshot(id, input.packageId), fingerprint = hash([id, snapshot]);
        if (input.fingerprint !== fingerprint)
            throw new VipMembershipError('vip_membership_snapshot_conflict', 409);
        const term = this.term(id, snapshot.package.durationDays); // Freeze accepted dates before any debit.
        const orderId = orderIdFor(id, input.key);
        this.tx(() => {
            this.d.orders[key] = { id: orderId, userId: id, key: input.key, fingerprint, snapshot, createdAt: term.renewedAt,
                status: 'pending', term, debitKey: 'vip:' + orderId, pointsRef: 'vip:' + orderId };
            this.log(id, 'purchase-intent', orderId, 'طلب شراء VIP بعملة افتراضية بسعر مؤكّد');
        });
        return this.settle(key, false);
    }
    settle(key, duplicate) {
        let order = this.d.orders[key];
        if (order.status === 'failed')
            return { ok: false, code: order.code, order: this.safeOrder(order) };
        if (order.status === 'complete')
            return { ok: true, dup: true, order: this.safeOrder(order), membership: this.view(order.userId) };
        this.account(order.userId);
        const pack = order.snapshot.package;
        // A synchronous, single-writer Wallet operation: balance check + debit + immutable key/proof + ledger
        // commit together. onTx can throw AFTER commit; keep intent pending and replay here on recovery.
        // Never use charge(), direct assignments, fake shop items, paymentAdjust(), or coins as VIP XP.
        const debit = this.options.wallet.adminAdjust(order.userId, pack.price.cur, -pack.price.amount, `شراء عضوية VIP داخلية: ${pack.name}`, order.debitKey);
        if (!debit.ok) {
            // A recorded debited term with a missing/conflicting proof fails closed; never grant XP.
            if (order.status === 'debited')
                throw new VipMembershipError('vip_membership_debit_proof_conflict', 409);
            this.tx(() => {
                this.d.orders[key].status = 'failed';
                this.d.orders[key].code = debit.code === 'poor' ? 'vip_membership_insufficient_balance' : 'vip_membership_debit_conflict';
                this.log(order.userId, 'purchase-failed', order.id, this.d.orders[key].code);
            });
            order = this.d.orders[key];
            return { ok: false, code: order.code, order: this.safeOrder(order) };
        }
        if (order.status === 'pending') {
            const term = order.term ?? this.term(order.userId, pack.durationDays);
            this.tx(() => {
                this.d.orders[key].status = 'debited';
                this.d.orders[key].term = term;
                this.log(order.userId, 'debit-confirmed', order.id, 'تم تأكيد خصم العملة الافتراضية من المحفظة');
            });
            order = this.d.orders[key];
        }
        const previous = this.options.progression.eventRecords(order.userId).find(r => r.system === 'vip' && r.ref === order.pointsRef);
        if (previous && (previous.points !== pack.points || previous.kind !== 'purchase'))
            throw new VipMembershipError('vip_membership_points_proof_conflict', 409);
        if (!previous) {
            if (!this.options.progression.configView().vip.enabled)
                throw new VipMembershipError('vip_membership_pending_recovery', 503);
            this.options.progression.grant(order.userId, 'vip', pack.points, order.pointsRef, `خبرة باقة VIP: ${pack.name}`, 'purchase');
        }
        this.tx(() => {
            const next = this.d.orders[key];
            next.status = 'complete';
            next.completedAt = this.now();
            this.d.members[order.userId] = { ...next.term, orderId: order.id, warningsDays: [...order.snapshot.policy.warningsDays] };
            this.log(order.userId, 'purchase-complete', order.id, 'اكتملت خبرة VIP والعضوية بعد خصم مؤكد');
        });
        order = this.d.orders[key];
        return { ok: true, dup: duplicate || debit.dup || !!previous, order: this.safeOrder(order), membership: this.view(order.userId) };
    }
    hasPending(id) { return Object.values(this.d.orders).some(o => (!id || o.userId === id) && (o.status === 'pending' || o.status === 'debited')); }
    pendingCount() { return Object.values(this.d.orders).filter(o => o.status === 'pending' || o.status === 'debited').length; }
    /** Resume frozen intent economics, even after package removal. Never enqueue an unconfirmed new purchase. */
    retryPending() {
        return this.enqueue(() => {
            for (const [key, order] of Object.entries(this.d.orders))
                if (order.status === 'pending' || order.status === 'debited') {
                    try {
                        this.settle(key, true);
                    }
                    catch { /* Durable pending journal remains for next sweep/readiness. */ }
                }
        });
    }
    /** Parent calls at startup, periodically, and lazily after GET if wanted; no internal timer/service. */
    sweep() {
        return this.enqueue(async () => {
            for (const [key, order] of Object.entries(this.d.orders))
                if (order.status === 'pending' || order.status === 'debited') {
                    try {
                        this.settle(key, true);
                    }
                    catch { /* Retain durable pending work. */ }
                }
            let warnings = 0;
            if (!this.options.notify)
                return { warnings, pending: this.pendingCount() };
            const now = this.now();
            for (const [id, member] of Object.entries(this.d.members)) {
                if (!this.options.hasAccount(id))
                    continue;
                for (const warningDays of member.warningsDays) {
                    const remaining = member.expiresAt - now;
                    if (warningDays > 0 ? remaining <= 0 || remaining > warningDays * DAY : remaining > 0)
                        continue;
                    const ref = 'vipwarn:' + hash([id, member.expiresAt, warningDays]);
                    if (!this.d.notices[ref]) {
                        try {
                            this.tx(() => {
                                this.d.notices[ref] = { sent: false, notice: { userId: id,
                                        title: warningDays === 0 ? 'انتهت عضوية VIP' : 'تنبيه انتهاء عضوية VIP',
                                        body: warningDays === 0 ? `انتهت مدة عضويتك بتاريخ ${new Date(member.expiresAt).toISOString()}. خبرة VIP والعناصر المكتسبة محفوظة، ويمكن التجديد وفق الباقات المعتمدة.`
                                            : `تنتهي عضوية VIP بتاريخ ${new Date(member.expiresAt).toISOString()}. خبرتك وعناصرك المكتسبة تبقى محفوظة.`,
                                        ref, expiresAt: member.expiresAt, warningDays } };
                            });
                        }
                        catch {
                            continue;
                        }
                    }
                }
            }
            // Deliver all saved notice intents, including a previous term's warning whose callback failed.
            // The body identifies its original expiry date, so it remains truthful even after renewal.
            for (const [ref, receipt] of Object.entries(this.d.notices)) {
                if (receipt.sent || !this.options.hasAccount(receipt.notice.userId))
                    continue;
                try {
                    await this.options.notify(clone(receipt.notice));
                    this.tx(() => { this.d.notices[ref].sent = true; });
                    warnings++;
                }
                catch { /* Stable ref + frozen body permits durable SupportNotifications replay. */ }
            }
            return { warnings, pending: this.pendingCount() };
        });
    }
    adminView(actor, input = {}) {
        this.actor(actor);
        if (!isObj(input) || !exact(input, ['userId', 'offset', 'limit'])
            || (input.userId !== undefined && !user(input.userId)) || (input.offset !== undefined && !nat(input.offset))
            || (input.limit !== undefined && (!pos(input.limit) || input.limit > 100)))
            throw new VipMembershipError('vip_membership_request_invalid');
        const offset = input.offset ?? 0, limit = input.limit ?? 50;
        const rows = Object.values(this.d.orders).filter(o => !input.userId || o.userId === input.userId).reverse();
        const ids = input.userId ? [input.userId] : [...new Set([...Object.keys(this.d.members), ...rows.map(o => o.userId)])];
        return { config: this.configView(), revision: this.d.revision, total: rows.length, orders: clone(rows.slice(offset, offset + limit)),
            players: ids.filter(id => this.options.hasAccount(id)).slice(offset, offset + limit).map(id => ({ id, ...this.view(id) })),
            audit: clone(this.d.audit.filter(a => !input.userId || a.actor === input.userId).slice(-100).reverse()),
            pending: this.pendingCount(), notificationPending: Object.values(this.d.notices).filter(n => !n.sent).length };
    }
    /** No Progression subtraction primitive exists. Never fake a refund/correction or delete earned items. */
    prepareCorrection(actor, input) {
        this.actor(actor, true);
        if (!isObj(input) || !exact(input, ['orderId', 'reason', 'key']) || typeof input.orderId !== 'string' || !/^vm_[a-f0-9]{64}$/.test(input.orderId)
            || !text(input.reason, 500) || !requestKey(input.key))
            throw new VipMembershipError('vip_membership_request_invalid');
        if (!Object.values(this.d.orders).some(o => o.id === input.orderId))
            throw new VipMembershipError('vip_membership_order_not_found', 404);
        throw new VipMembershipError('vip_membership_xp_reversal_unsupported', 409);
    }
    /** Server-only clone for consistent-set backup; never expose to a player or restore it alone. */
    snapshot() { return clone(this.d); }
    /** Coordinate all economic writers separately; this only drains this service's current queue. */
    waitForIdle() { return this.tail; }
    retry() { this.disk.retry(); }
    unsaved() { return this.disk.unsaved; }
}
