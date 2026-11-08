import { defaultRankPolicies } from './rank-perks-r56.js';
import { createHash } from 'node:crypto';
import { itemOf } from './catalog.js';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import type { Role } from './platform.js';
import { rankAdminReceiptRequest, rankAdminReceiptConflict, validRankAdminReceipts,
  type RankAdminReceipt, type RankAdminReceiptOptions, type Progression, type ProgressSystem } from './progression.js';
import type { BulkReward, BulkGrantResult, Wallet } from './wallet.js';

export type RankReward = { type: 'currency'; cur: 'coins' | 'gems'; amount: number }
  | { type: 'item'; itemId: string; mode: 'grant' };
/** Lifetime rank numbers: LEVEL 1..100, VIP 1..15, NOBLE 1..9; no reward contents are seeded.
 * Seasons do not imply a new claim scope or a repeated economic grant. Existing claim keys remain unchanged.
 */
export interface RankRewardPolicy { system: ProgressSystem; rank: number; rewards: RankReward[] }
export interface RankRewardsOptions {
  /** Must use the canonical server Accounts.has, not client input. */
  hasAccount: (id: string) => boolean;
  /** Current server catalog lookup; existing base catalog only when omitted. */
  itemExists?: (id: string) => boolean;
  now?: () => number;
  mon?: StorageMonitor;
}
interface Claim {
  user: string; system: ProgressSystem; rank: number; fingerprint: string;
  operationId: string; rewards: RankReward[]; ts: number;
  status: 'pending' | 'claimed' | 'failed'; code?: string;
}
interface Data { v: 1; policies: RankRewardPolicy[]; claims: Record<string, Claim>; adminReceipts?: Record<string, RankAdminReceipt<RankRewardPolicy[]>> }
export type RankClaimResult = { ok: true; dup: boolean; status: 'claimed'; system: ProgressSystem; rank: number; fingerprint: string }
  | { ok: false; code: string; system: ProgressSystem; rank: number };

const clone = <T>(value: T): T => structuredClone(value);
const systems = ['level', 'vip', 'noble'] as const;
const nat = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const maxRank = (system: ProgressSystem) => system === 'level' ? 100 : system === 'vip' ? 15 : 9;
const validRank = (system: unknown, rank: unknown): system is ProgressSystem => systems.includes(system as ProgressSystem)
  && nat(rank) && rank >= 1 && rank <= maxRank(system as ProgressSystem);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every((key) => keys.includes(key));
function validRewards(v: unknown): v is RankReward[] {
  if (!Array.isArray(v) || v.length > 100) return false;
  const seen = new Set<string>();
  for (const r of v) {
    if (!isObj(r)) return false;
    let key: string;
    if (r.type === 'currency') {
      if (!exact(r, ['type', 'cur', 'amount']) || !['coins', 'gems'].includes(String(r.cur)) || !nat(r.amount) || r.amount === 0) return false;
      key = `currency:${r.cur}`;
    } else {
      if (!exact(r, ['type', 'itemId', 'mode']) || r.type !== 'item' || r.mode !== 'grant'
        || typeof r.itemId !== 'string' || !/^[a-z][a-z0-9-]{2,63}$/.test(r.itemId)) return false;
      key = `item:${r.itemId}`;
    }
    // One amount per currency avoids a Wallet.grantBulk preflight cumulative-overflow ambiguity.
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}
function validPolicies(v: unknown): v is RankRewardPolicy[] {
  if (!Array.isArray(v) || v.length > 124) return false;
  const seen = new Set<string>();
  return v.every((p) => {
    if (!isObj(p) || !exact(p, ['system', 'rank', 'rewards']) || !validRank(p.system, p.rank) || !validRewards(p.rewards) || !p.rewards.length) return false;
    const key = `${p.system}:${p.rank}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
const claimKey = (id: string, system: ProgressSystem, rank: number) => JSON.stringify([id, system, rank]);
const operationId = (key: string) => `rank_${createHash('sha256').update('la3bak-rank-rewards-v1\0').update(key).digest('hex')}`;
const fingerprint = (p: RankRewardPolicy) => createHash('sha256').update(JSON.stringify(p)).digest('hex');
function validClaim(key: string, v: unknown): boolean {
  return isObj(v) && typeof v.user === 'string' && !!v.user && validRank(v.system, v.rank)
    && key === claimKey(v.user, v.system, v.rank as number) && v.operationId === operationId(key)
    && typeof v.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(v.fingerprint)
    && validRewards(v.rewards) && nat(v.ts) && ['pending', 'claimed', 'failed'].includes(String(v.status))
    && (v.code === undefined || typeof v.code === 'string');
}
/** Additive schema: omitted policies/claims mean empty; malformed existing fields fail closed. */
export const validRankRewards = (v: Record<string, unknown>): boolean => isObj(v) && v.v === 1
  && (v.policies === undefined || validPolicies(v.policies))
  && (v.claims === undefined || (isObj(v.claims) && Object.entries(v.claims).every(([key, claim]) => validClaim(key, claim))))
  && (v.adminReceipts === undefined || validRankAdminReceipts(v.adminReceipts, (kind, result) => kind === 'policies' && validPolicies(result)));

/** One writer per file, shared Wallet instance. Durable intent -> atomic wallet grant -> durable receipt.
 * Intent snapshots pin economics across policy edits and crashes. No second event outbox or invented rewards.
 */
export class RankRewards {
  private d: Data = { v: 1, policies: [], claims: {} };
  private disk: Persister;
  private tail: Promise<void> = Promise.resolve();
  private now: () => number;
  private itemExists: (id: string) => boolean;
  readonly persistent: boolean;
  constructor(file: string, private wallet: Pick<Wallet, 'grantBulk' | 'owned'>, private progression: Progression, private options: RankRewardsOptions) {
    this.persistent = !!file;
    this.now = options.now ?? Date.now;
    this.itemExists = options.itemExists ?? ((id) => !!itemOf(id));
    if (file) {
      const loaded = loadJsonFile(file, validRankRewards);
      if (loaded) this.d = { v: 1, policies: [], claims: {}, ...(loaded as unknown as Partial<Data>) };
    }
    this.disk = new Persister('rank-rewards', file, () => this.d, this.now, options.mon ?? new StorageMonitor(), validRankRewards);
  }
  private currentRank(id: string, system: ProgressSystem): number {
    if (!this.options.hasAccount(id)) return 0;
    const view = this.progression.view(id);
    const value = view[system].value;
    if (!view[system].enabled || value === null) return 0;
    return typeof value === 'number' ? value : Number(value.slice(1));
  }
  configView() { return clone(this.d.policies); }
  /** R56: سياسات الإدارة + السلّم الافتراضي للمستويات اللي ما لها سياسة (عناصر شكلية فقط، بدون عملات) */
  private effectivePolicies(): (RankRewardPolicy & { builtIn?: true })[] {
    const own = new Set(this.d.policies.map((p) => `${p.system}:${p.rank}`));
    const defaults = defaultRankPolicies().filter((p) => !own.has(`${p.system}:${p.rank}`) && p.rewards.every((r) => this.itemExists(r.itemId)))
      .map((p) => ({ ...p, rewards: p.rewards.map((r): RankReward => ({ type: 'item', itemId: r.itemId, mode: 'grant' })), builtIn: true as const }));
    // R58e: مكافآت السيارات انشالت من العرض (السجلات القديمة ما تنمس)
    const noCars = this.d.policies.map((p) => ({ ...p, rewards: p.rewards.filter((r: any) => !(r && r.type === 'item' && typeof r.itemId === 'string' && r.itemId.startsWith('entrance-'))) })).filter((p) => p.rewards.length > 0);
    return [...noCars, ...defaults];
  }
  /** Call only with actor from existing authenticated RBAC; client-supplied roles are never authority. */
  configure(policies: unknown, actor: { id: string; role: Role }): RankRewardPolicy[] {
    if (!actor?.id || actor.role !== 'owner') throw new Error('rank_rewards_forbidden');
    const normalized = this.preparePolicies(policies);
    this.checkPolicyItems(normalized);
    const before = this.d.policies; this.d.policies = normalized;
    try { this.disk.mustSave(); } catch (e) { this.d.policies = before; throw e; }
    return this.configView();
  }
  /** Parent must enforce authenticated owner RBAC and separate audit before calling this server-only API. */
  configureReceipt(policies: unknown, options: RankAdminReceiptOptions): { policies: RankRewardPolicy[]; duplicate: boolean } {
    // Validate the original JSON too, before normalization can discard hostile/non-JSON properties.
    const rawRequest = rankAdminReceiptRequest(policies, options, 'policies'), old = this.d.adminReceipts?.[rawRequest.scope];
    let normalized: RankRewardPolicy[];
    try { normalized = this.preparePolicies(policies); }
    catch (e) { if (old) throw rankAdminReceiptConflict('rank_rewards_receipt_conflict'); throw e; }
    const request = rankAdminReceiptRequest(normalized, options, 'policies');
    if (old) {
      if (old.fingerprint !== request.fingerprint) throw rankAdminReceiptConflict('rank_rewards_receipt_conflict');
      return { policies: clone(old.result), duplicate: true };
    }
    this.checkPolicyItems(normalized);
    const receipts = { ...this.d.adminReceipts, [request.scope]: { fingerprint: request.fingerprint, result: clone(normalized) } };
    if (!validRankAdminReceipts(receipts, (kind, result) => kind === 'policies' && validPolicies(result))) throw rankAdminReceiptConflict('rank_rewards_receipt_capacity');
    const before = this.d;
    this.d = { ...before, policies: normalized, adminReceipts: receipts };
    try { this.disk.mustSave(); } catch (e) { this.d = before; throw e; }
    return { policies: clone(normalized), duplicate: false };
  }
  private preparePolicies(policies: unknown): RankRewardPolicy[] {
    if (!validPolicies(policies)) throw new Error('rank_rewards_policy_invalid');
    return policies.map((p) => ({ system: p.system, rank: p.rank, rewards: p.rewards.map((r): RankReward => r.type === 'currency'
      ? { type: 'currency', cur: r.cur, amount: r.amount } : { type: 'item', itemId: r.itemId, mode: 'grant' })
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) }))
      .sort((a, b) => a.system.localeCompare(b.system) || a.rank - b.rank);
  }
  private checkPolicyItems(policies: RankRewardPolicy[]) {
    if (policies.some((p) => p.rewards.some((r) => r.type === 'item' && !this.itemExists(r.itemId)))) throw new Error('rank_rewards_item_missing');
  }
  /** Includes retired claimed policies without making them claimable again. */
  view(id: string) {
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
  claim(id: string, system: ProgressSystem, rank: number, expectedFingerprint?: string): Promise<RankClaimResult> {
    const run = this.tail.then(() => this.claimLocked(id, system, rank, expectedFingerprint));
    this.tail = run.then(() => undefined, () => undefined);
    return run;
  }
  private async claimLocked(id: string, system: ProgressSystem, rank: number, expectedFingerprint?: string): Promise<RankClaimResult> {
    const fail = (code: string): RankClaimResult => ({ ok: false, code, system, rank });
    if (typeof id !== 'string' || !id || !validRank(system, rank)) return fail('rank_rewards_request_invalid');
    const key = claimKey(id, system, rank);
    let intent = this.d.claims[key];
    const previous = !!intent;
    if (!intent) {
      const policy = this.effectivePolicies().find((p) => p.system === system && p.rank === rank);
      if (!policy) return fail('rank_rewards_not_configured');
      if (expectedFingerprint !== undefined && expectedFingerprint !== fingerprint(policy)) return fail('rank_rewards_policy_conflict');
      if (this.currentRank(id, system) < rank) return fail('rank_rewards_ineligible');
      if (policy.rewards.some((r) => r.type === 'item' && !this.itemExists(r.itemId))) return fail('rank_rewards_item_missing');
      const owned = new Set(this.wallet.owned(id));
      // Ownership from another grant is not a charge or failure; grant only missing items with currencies atomically.
      intent = { user: id, system, rank, fingerprint: fingerprint(policy), operationId: operationId(key),
        rewards: clone(policy.rewards.filter((r) => r.type !== 'item' || !owned.has(r.itemId))), ts: this.now(), status: 'pending' };
      this.d.claims[key] = intent;
      try { this.disk.mustSave(); } catch (e) { delete this.d.claims[key]; throw e; }
    }
    if (intent.status === 'failed') return fail(intent.code ?? 'rank_rewards_claim_failed');
    if (intent.status === 'claimed') return { ok: true, dup: true, status: 'claimed', system, rank, fingerprint: intent.fingerprint };
    // Safe restart: same wallet operation key replays its durable result, never another grant.
    let result: BulkGrantResult | undefined;
    if (intent.rewards.length) result = await this.wallet.grantBulk(intent.operationId, [id], clone(intent.rewards) as BulkReward[], `مكافأة رتبة ${system}:${rank}`);
    const before = clone(intent);
    const succeeded = !result || (result.total === 1 && result.succeeded === 1 && result.failed === 0);
    intent.status = succeeded ? 'claimed' : 'failed';
    if (!succeeded) intent.code = result?.failures[0]?.code ?? 'rank_rewards_wallet_conflict';
    try { this.disk.mustSave(); } catch (e) { this.d.claims[key] = before; throw e; }
    return succeeded ? { ok: true, dup: previous || !!result?.duplicate, status: 'claimed', system, rank, fingerprint: intent.fingerprint } : fail(intent.code!);
  }
  pendingCount(): number { return Object.values(this.d.claims).filter((c) => c.status === 'pending').length; }
  /** Startup/periodic automatic recovery. Drain all original intents; one failed save does not block others.
   * No policy/account re-evaluation: eligibility was checked before the durable intent was recorded.
   */
  async retryPending(): Promise<void> {
    const pending = Object.values(this.d.claims).filter((c) => c.status === 'pending').map((c) => ({ user: c.user, system: c.system, rank: c.rank }));
    for (const intent of pending) {
      try { await this.claim(intent.user, intent.system, intent.rank); }
      catch { /* Storage/Wallet transient failure retains its durable pending snapshot for the next cycle. */ }
    }
  }
  /** Parent readiness wiring must include pendingCount(): pending wallet/receipt work is durably saved. */
  retry() { this.disk.retry(); }
  unsaved() { return this.disk.unsaved; }
}
