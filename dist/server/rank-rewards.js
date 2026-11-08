import { defaultRankPolicies } from './rank-perks-r56.js';
import { createHash } from 'node:crypto';
import { itemOf } from './catalog.js';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import { rankAdminReceiptRequest, rankAdminReceiptConflict, validRankAdminReceipts } from './progression.js';
const clone = (value) => structuredClone(value);
const systems = ['level', 'vip', 'noble'];
const nat = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const maxRank = (system) => system === 'level' ? 100 : system === 'vip' ? 15 : 9;
const validRank = (system, rank) => systems.includes(system)
    && nat(rank) && rank >= 1 && rank <= maxRank(system);
const exact = (v, keys) => Object.keys(v).every((key) => keys.includes(key));
function validRewards(v) {
    if (!Array.isArray(v) || v.length > 100)
        return false;
    const seen = new Set();
    for (const r of v) {
        if (!isObj(r))
            return false;
        let key;
        if (r.type === 'currency') {
            if (!exact(r, ['type', 'cur', 'amount']) || !['coins', 'gems'].includes(String(r.cur)) || !nat(r.amount) || r.amount === 0)
                return false;
            key = `currency:${r.cur}`;
        }
        else {
            if (!exact(r, ['type', 'itemId', 'mode']) || r.type !== 'item' || r.mode !== 'grant'
                || typeof r.itemId !== 'string' || !/^[a-z][a-z0-9-]{2,63}$/.test(r.itemId))
                return false;
            key = `item:${r.itemId}`;
        }
        // One amount per currency avoids a Wallet.grantBulk preflight cumulative-overflow ambiguity.
        if (seen.has(key))
            return false;
        seen.add(key);
    }
    return true;
}
function validPolicies(v) {
    if (!Array.isArray(v) || v.length > 124)
        return false;
    const seen = new Set();
    return v.every((p) => {
        if (!isObj(p) || !exact(p, ['system', 'rank', 'rewards']) || !validRank(p.system, p.rank) || !validRewards(p.rewards) || !p.rewards.length)
            return false;
        const key = `${p.system}:${p.rank}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
const claimKey = (id, system, rank) => JSON.stringify([id, system, rank]);
const operationId = (key) => `rank_${createHash('sha256').update('la3bak-rank-rewards-v1\0').update(key).digest('hex')}`;
const fingerprint = (p) => createHash('sha256').update(JSON.stringify(p)).digest('hex');
function validClaim(key, v) {
    return isObj(v) && typeof v.user === 'string' && !!v.user && validRank(v.system, v.rank)
        && key === claimKey(v.user, v.system, v.rank) && v.operationId === operationId(key)
        && typeof v.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(v.fingerprint)
        && validRewards(v.rewards) && nat(v.ts) && ['pending', 'claimed', 'failed'].includes(String(v.status))
        && (v.code === undefined || typeof v.code === 'string');
}
/** Additive schema: omitted policies/claims mean empty; malformed existing fields fail closed. */
export const validRankRewards = (v) => isObj(v) && v.v === 1
    && (v.policies === undefined || validPolicies(v.policies))
    && (v.claims === undefined || (isObj(v.claims) && Object.entries(v.claims).every(([key, claim]) => validClaim(key, claim))))
    && (v.adminReceipts === undefined || validRankAdminReceipts(v.adminReceipts, (kind, result) => kind === 'policies' && validPolicies(result)));
/** One writer per file, shared Wallet instance. Durable intent -> atomic wallet grant -> durable receipt.
 * Intent snapshots pin economics across policy edits and crashes. No second event outbox or invented rewards.
 */
export class RankRewards {
    wallet;
    progression;
    options;
    d = { v: 1, policies: [], claims: {} };
    disk;
    tail = Promise.resolve();
    now;
    itemExists;
    persistent;
    constructor(file, wallet, progression, options) {
        this.wallet = wallet;
        this.progression = progression;
        this.options = options;
        this.persistent = !!file;
        this.now = options.now ?? Date.now;
        this.itemExists = options.itemExists ?? ((id) => !!itemOf(id));
        if (file) {
            const loaded = loadJsonFile(file, validRankRewards);
            if (loaded)
                this.d = { v: 1, policies: [], claims: {}, ...loaded };
        }
        this.disk = new Persister('rank-rewards', file, () => this.d, this.now, options.mon ?? new StorageMonitor(), validRankRewards);
    }
    currentRank(id, system) {
        if (!this.options.hasAccount(id))
            return 0;
        const view = this.progression.view(id);
        const value = view[system].value;
        if (!view[system].enabled || value === null)
            return 0;
        return typeof value === 'number' ? value : Number(value.slice(1));
    }
    configView() { return clone(this.d.policies); }
    /** R56: سياسات الإدارة + السلّم الافتراضي للمستويات اللي ما لها سياسة (عناصر شكلية فقط، بدون عملات) */
    effectivePolicies() {
        const own = new Set(this.d.policies.map((p) => `${p.system}:${p.rank}`));
        const defaults = defaultRankPolicies().filter((p) => !own.has(`${p.system}:${p.rank}`) && p.rewards.every((r) => this.itemExists(r.itemId)))
            .map((p) => ({ ...p, rewards: p.rewards.map((r) => ({ type: 'item', itemId: r.itemId, mode: 'grant' })), builtIn: true }));
        // R58e: مكافآت السيارات انشالت من العرض (السجلات القديمة ما تنمس)
        const noCars = this.d.policies.map((p) => ({ ...p, rewards: p.rewards.filter((r) => !(r && r.type === 'item' && typeof r.itemId === 'string' && r.itemId.startsWith('entrance-'))) })).filter((p) => p.rewards.length > 0);
        return [...noCars, ...defaults];
    }
    /** Call only with actor from existing authenticated RBAC; client-supplied roles are never authority. */
    configure(policies, actor) {
        if (!actor?.id || actor.role !== 'owner')
            throw new Error('rank_rewards_forbidden');
        const normalized = this.preparePolicies(policies);
        this.checkPolicyItems(normalized);
        const before = this.d.policies;
        this.d.policies = normalized;
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d.policies = before;
            throw e;
        }
        return this.configView();
    }
    /** Parent must enforce authenticated owner RBAC and separate audit before calling this server-only API. */
    configureReceipt(policies, options) {
        // Validate the original JSON too, before normalization can discard hostile/non-JSON properties.
        const rawRequest = rankAdminReceiptRequest(policies, options, 'policies'), old = this.d.adminReceipts?.[rawRequest.scope];
        let normalized;
        try {
            normalized = this.preparePolicies(policies);
        }
        catch (e) {
            if (old)
                throw rankAdminReceiptConflict('rank_rewards_receipt_conflict');
            throw e;
        }
        const request = rankAdminReceiptRequest(normalized, options, 'policies');
        if (old) {
            if (old.fingerprint !== request.fingerprint)
                throw rankAdminReceiptConflict('rank_rewards_receipt_conflict');
            return { policies: clone(old.result), duplicate: true };
        }
        this.checkPolicyItems(normalized);
        const receipts = { ...this.d.adminReceipts, [request.scope]: { fingerprint: request.fingerprint, result: clone(normalized) } };
        if (!validRankAdminReceipts(receipts, (kind, result) => kind === 'policies' && validPolicies(result)))
            throw rankAdminReceiptConflict('rank_rewards_receipt_capacity');
        const before = this.d;
        this.d = { ...before, policies: normalized, adminReceipts: receipts };
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = before;
            throw e;
        }
        return { policies: clone(normalized), duplicate: false };
    }
    preparePolicies(policies) {
        if (!validPolicies(policies))
            throw new Error('rank_rewards_policy_invalid');
        return policies.map((p) => ({ system: p.system, rank: p.rank, rewards: p.rewards.map((r) => r.type === 'currency'
                ? { type: 'currency', cur: r.cur, amount: r.amount } : { type: 'item', itemId: r.itemId, mode: 'grant' })
                .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) }))
            .sort((a, b) => a.system.localeCompare(b.system) || a.rank - b.rank);
    }
    checkPolicyItems(policies) {
        if (policies.some((p) => p.rewards.some((r) => r.type === 'item' && !this.itemExists(r.itemId))))
            throw new Error('rank_rewards_item_missing');
    }
    /** Includes retired claimed policies without making them claimable again. */
    view(id) {
        return {
            persistent: this.persistent,
            policies: this.effectivePolicies().map((p) => {
                const claim = this.d.claims[claimKey(id, p.system, p.rank)];
                return { id: `${p.system}:${p.rank}`, ...clone(p), rewards: clone(claim?.rewards ?? p.rewards), fingerprint: claim?.fingerprint ?? fingerprint(p), eligible: this.currentRank(id, p.system) >= p.rank,
                    status: claim?.status ?? 'available', claimable: !claim && this.currentRank(id, p.system) >= p.rank };
            }),
            claims: Object.values(this.d.claims).filter((c) => c.user === id).map((c) => ({ id: `${c.system}:${c.rank}`, system: c.system, rank: c.rank,
                rewards: clone(c.rewards), fingerprint: c.fingerprint, status: c.status, ts: c.ts, ...(c.code ? { code: c.code } : {}) })),
        };
    }
    /** Authenticated session id only. expectedFingerprint optionally detects stale unclaimed policy requests. */
    claim(id, system, rank, expectedFingerprint) {
        const run = this.tail.then(() => this.claimLocked(id, system, rank, expectedFingerprint));
        this.tail = run.then(() => undefined, () => undefined);
        return run;
    }
    async claimLocked(id, system, rank, expectedFingerprint) {
        const fail = (code) => ({ ok: false, code, system, rank });
        if (typeof id !== 'string' || !id || !validRank(system, rank))
            return fail('rank_rewards_request_invalid');
        const key = claimKey(id, system, rank);
        let intent = this.d.claims[key];
        const previous = !!intent;
        if (!intent) {
            const policy = this.effectivePolicies().find((p) => p.system === system && p.rank === rank);
            if (!policy)
                return fail('rank_rewards_not_configured');
            if (expectedFingerprint !== undefined && expectedFingerprint !== fingerprint(policy))
                return fail('rank_rewards_policy_conflict');
            if (this.currentRank(id, system) < rank)
                return fail('rank_rewards_ineligible');
            if (policy.rewards.some((r) => r.type === 'item' && !this.itemExists(r.itemId)))
                return fail('rank_rewards_item_missing');
            const owned = new Set(this.wallet.owned(id));
            // Ownership from another grant is not a charge or failure; grant only missing items with currencies atomically.
            intent = { user: id, system, rank, fingerprint: fingerprint(policy), operationId: operationId(key),
                rewards: clone(policy.rewards.filter((r) => r.type !== 'item' || !owned.has(r.itemId))), ts: this.now(), status: 'pending' };
            this.d.claims[key] = intent;
            try {
                this.disk.mustSave();
            }
            catch (e) {
                delete this.d.claims[key];
                throw e;
            }
        }
        if (intent.status === 'failed')
            return fail(intent.code ?? 'rank_rewards_claim_failed');
        if (intent.status === 'claimed')
            return { ok: true, dup: true, status: 'claimed', system, rank, fingerprint: intent.fingerprint };
        // Safe restart: same wallet operation key replays its durable result, never another grant.
        let result;
        if (intent.rewards.length)
            result = await this.wallet.grantBulk(intent.operationId, [id], clone(intent.rewards), `مكافأة رتبة ${system}:${rank}`);
        const before = clone(intent);
        const succeeded = !result || (result.total === 1 && result.succeeded === 1 && result.failed === 0);
        intent.status = succeeded ? 'claimed' : 'failed';
        if (!succeeded)
            intent.code = result?.failures[0]?.code ?? 'rank_rewards_wallet_conflict';
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d.claims[key] = before;
            throw e;
        }
        return succeeded ? { ok: true, dup: previous || !!result?.duplicate, status: 'claimed', system, rank, fingerprint: intent.fingerprint } : fail(intent.code);
    }
    pendingCount() { return Object.values(this.d.claims).filter((c) => c.status === 'pending').length; }
    /** Startup/periodic automatic recovery. Drain all original intents; one failed save does not block others.
     * No policy/account re-evaluation: eligibility was checked before the durable intent was recorded.
     */
    async retryPending() {
        const pending = Object.values(this.d.claims).filter((c) => c.status === 'pending').map((c) => ({ user: c.user, system: c.system, rank: c.rank }));
        for (const intent of pending) {
            try {
                await this.claim(intent.user, intent.system, intent.rank);
            }
            catch { /* Storage/Wallet transient failure retains its durable pending snapshot for the next cycle. */ }
        }
    }
    /** Parent readiness wiring must include pendingCount(): pending wallet/receipt work is durably saved. */
    retry() { this.disk.retry(); }
    unsaved() { return this.disk.unsaved; }
}
