import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { isObj, loadJsonFile, saveJsonFile, StorageError, StorageMonitor } from './datafile.js';
import type { GrantBundle, CampaignGrantResult } from './wallet.js';

export type BulkActor = { id: string; name: string; role: string };
export type BulkFilter = { kind: 'all' } | { kind: 'active'; days: number } | { kind: 'registered'; from: number; to: number };
export type BulkStatus = 'preview' | 'queued' | 'running' | 'paused_storage' | 'paused_authorization' | 'completed' | 'completed_with_errors';
type Item = { id: string; name: string; slot: string; active: boolean; permanent: boolean };
type Target = { id: string; name: string };
type Request = { filter: BulkFilter; rewards: GrantBundle; reason: string; operatorName?: string };
type Receipt = { id: string; status: 'success' | 'failed'; outcome: 'granted' | 'duplicate' | 'failed'; at: number; code?: 'BALANCE_OVERFLOW'; addedItems: string[]; alreadyOwned: string[] };
type Event = { key: string; actor: BulkActor; action: string; target: string; detail: string; mirrored: boolean };
type Campaign = { version: 1; id: string; actor: BulkActor; request: Request; requestHash: string; fingerprint: string; items: Item[]; targets: Target[]; createdAt: number; expiresAt: number; status: BulkStatus; confirmed?: { actor: BulkActor; at: number }; results: (Receipt | null)[]; queue: number[]; cursor: number; events: Event[]; retries: number; manualPause: boolean };
export type BulkGrantsOptions = {
  dir: string; monitor: StorageMonitor; now?: () => number;
  targets: (filter: BulkFilter, asOf: number) => Target[];
  items: () => Item[];
  apply: (campaign: string, fp: string, ids: string[], rewards: GrantBundle, reason: string) => CampaignGrantResult[];
  authorized: (actor: BulkActor) => boolean;
  audit: (event: { key: string; actor: BulkActor; action: string; target: string; detail: string }) => void;
  onGranted?: (ids: string[]) => void;
  enabled: boolean; maxTargets?: number; batchSize?: number; autoStart?: boolean;
  log?: (event: string, data?: Record<string, unknown>) => void;
};
export class BulkGrantError extends Error {
  constructor(public status: number, public code: string) { super(code); this.name = 'BulkGrantError'; }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX = /^[a-f0-9]{64}$/;
const SLOTS = ['avatar', 'frame', 'bg', 'badge', 'title'];
const STATUSES: BulkStatus[] = ['preview', 'queued', 'running', 'paused_storage', 'paused_authorization', 'completed', 'completed_with_errors'];
const MAX_TARGETS = 10_000, MAX_DRAFTS = 100, MAX_CAMPAIGNS = 1_000, TTL = 30 * 60_000, RETRY_MS = 15_000;
const nat = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
const text = (x: unknown, max: number): x is string => typeof x === 'string' && x.length > 0 && x.length <= max;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clone = <T>(x: T): T => structuredClone(x);
const bad = (code = 'INVALID_REQUEST'): never => { throw new BulkGrantError(400, code); };
const checkActor = (x: unknown): x is BulkActor => isObj(x) && text(x.id, 128) && text(x.name, 120) && text(x.role, 40);
function normalize(body: unknown): Request {
  if (!isObj(body) || !isObj(body.filter) || !isObj(body.rewards)) return bad();
  const f = body.filter;
  let filter: BulkFilter;
  if (f.kind === 'all' && Object.keys(f).length === 1) filter = { kind: 'all' };
  else if (f.kind === 'active' && Object.keys(f).length === 2 && nat(f.days) && f.days >= 1 && f.days <= 3650) filter = { kind: 'active', days: f.days };
  else if (f.kind === 'registered' && Object.keys(f).length === 3 && nat(f.from) && nat(f.to) && f.from < f.to && f.to <= 8_640_000_000_000_000) filter = { kind: 'registered', from: f.from, to: f.to };
  else return bad('INVALID_FILTER');
  const r = body.rewards, coins = r.coins === undefined ? 0 : r.coins, gems = r.gems === undefined ? 0 : r.gems;
  const ids = r.itemIds === undefined ? [] : r.itemIds;
  if (!nat(coins) || coins > 1_000_000 || !nat(gems) || gems > 100_000 || !Array.isArray(ids) || ids.length > 30 || !ids.every((x) => text(x, 128)) || new Set(ids).size !== ids.length) return bad('INVALID_REWARDS');
  if (!coins && !gems && !ids.length) return bad('EMPTY_REWARDS');
  if (typeof body.reason !== 'string' || body.reason.trim().length < 3 || body.reason.trim().length > 200) return bad('INVALID_REASON');
  if (body.operatorName !== undefined && (typeof body.operatorName !== 'string' || !text(body.operatorName.trim(), 120))) return bad('INVALID_OPERATOR_NAME');
  return { filter, rewards: { coins, gems, itemIds: [...ids].sort() }, reason: body.reason.trim(), ...(body.operatorName !== undefined ? { operatorName: (body.operatorName as string).trim() } : {}) };
}
const immutable = (c: Campaign) => ({ id: c.id, actor: c.actor, request: c.request, items: c.items, targets: c.targets, createdAt: c.createdAt, expiresAt: c.expiresAt });
function counts(c: Campaign) {
  const pending = new Set(c.queue.slice(c.cursor));
  return { success: c.results.filter((r) => r?.status === 'success').length, failed: c.results.filter((r, i) => r?.status === 'failed' && !pending.has(i)).length, pending: pending.size };
}
export function validCampaign(d: Record<string, unknown>): boolean {
  try {
    const c = d as unknown as Campaign;
    if (c.version !== 1 || !UUID.test(c.id) || !checkActor(c.actor) || !isObj(c.request) || hash(normalize(c.request)) !== hash(c.request) || hash(c.request) !== c.requestHash || !HEX.test(c.fingerprint)) return false;
    if (!nat(c.createdAt) || c.expiresAt !== c.createdAt + TTL || !STATUSES.includes(c.status) || typeof c.manualPause !== 'boolean' || !nat(c.retries) || c.retries > 100) return false;
    if (!Array.isArray(c.targets) || c.targets.length > MAX_TARGETS || !c.targets.every((t) => isObj(t) && typeof t.id === 'string' && UUID.test(t.id) && t.id === t.id.toLowerCase() && text(t.name, 120))) return false;
    const ids = c.targets.map((t) => t.id);
    if (new Set(ids).size !== ids.length || ids.join() !== [...ids].sort().join()) return false;
    if (!Array.isArray(c.items) || c.items.length !== c.request.rewards.itemIds.length || !c.items.every((x, i) => isObj(x) && x.id === c.request.rewards.itemIds[i] && text(x.name, 200) && SLOTS.includes(x.slot) && x.active === true && x.permanent === true)) return false;
    if (hash(immutable(c)) !== c.fingerprint || !Array.isArray(c.results) || c.results.length !== ids.length || !Array.isArray(c.queue) || c.queue.length > ids.length || !nat(c.cursor) || c.cursor > c.queue.length || new Set(c.queue).size !== c.queue.length || !c.queue.every((i) => nat(i) && i < ids.length)) return false;
    const validItems = (v: unknown): v is string[] => Array.isArray(v) && new Set(v).size === v.length && v.every((x) => c.request.rewards.itemIds.includes(x));
    if (!c.results.every((r, i) => r === null || (isObj(r) && r.id === ids[i] && nat(r.at) && ['success', 'failed'].includes(r.status) && ['granted', 'duplicate', 'failed'].includes(r.outcome) && (r.status === 'failed') === (r.outcome === 'failed') && (r.code === undefined || (r.status === 'failed' && r.code === 'BALANCE_OVERFLOW')) && validItems(r.addedItems) && validItems(r.alreadyOwned) && !r.addedItems.some((x) => r.alreadyOwned.includes(x)) && (r.status !== 'failed' || (!r.addedItems.length && !r.alreadyOwned.length))))) return false;
    const remaining = new Set(c.queue.slice(c.cursor));
    if (c.results.some((r, i) => (r === null && !remaining.has(i)) || (r?.status === 'success' && remaining.has(i)))) return false;
    if (c.status === 'preview') { if (c.confirmed || c.cursor !== 0 || c.events.length || c.results.some((r) => r !== null) || c.queue.length !== ids.length) return false; }
    else if (!c.confirmed || !checkActor(c.confirmed.actor) || !nat(c.confirmed.at) || c.confirmed.at < c.createdAt) return false;
    if ((c.status === 'completed' || c.status === 'completed_with_errors') && remaining.size) return false;
    if (c.confirmed && (c.confirmed.at >= c.expiresAt || (c.confirmed.actor.id !== c.actor.id && c.confirmed.actor.role !== 'owner'))) return false;
    if (c.queue.slice(0, c.cursor).some((i) => c.results[i] === null)) return false;
    if (c.manualPause && c.status !== 'paused_storage') return false;
    if (c.status === 'completed' && c.results.some((r) => r?.status !== 'success')) return false;
    if (c.status === 'completed_with_errors' && !c.results.some((r) => r?.status === 'failed')) return false;
    if (!Array.isArray(c.events) || c.events.length > 1000 || new Set(c.events.map((e) => e.key)).size !== c.events.length) return false;
    if (c.status !== 'preview' && (c.events[0]?.action !== 'bulk.confirm' || hash(c.events[0]?.actor) !== hash(c.confirmed!.actor))) return false;
    return c.events.every((e, i) => {
      if (!isObj(e) || e.key !== `bulk:${c.id}:${i}` || !checkActor(e.actor) || !['bulk.confirm', 'bulk.retry', 'bulk.completed', 'bulk.pause', 'bulk.authorization_paused'].includes(e.action) || e.target !== c.id || typeof e.detail !== 'string' || e.detail.length > 20_000 || typeof e.mirrored !== 'boolean') return false;
      const v: unknown = JSON.parse(e.detail);
      return isObj(v) && (v.operatorName === undefined || v.operatorName === c.request.operatorName) && nat(v.at) && v.at >= c.createdAt && v.reason === c.request.reason && v.fingerprint === c.fingerprint && v.targetCount === ids.length && hash(v.rewards) === hash(c.request.rewards) && checkActor(v.actor) && hash(v.actor) === hash(e.actor) && isObj(v.counts) && Object.keys(v.counts).length === 3 && ['success', 'failed', 'pending'].every((k) => nat((v.counts as Record<string, unknown>)[k])) && Object.values(v.counts).reduce<number>((n, x) => n + (x as number), 0) === ids.length;
    });
  } catch { return false; }
}

/** Single-process / single-writer prerequisite (including the wallet). JSON snapshots are
 * deliberately capped, not an unlimited-scale queue. Each turn does one <=25-recipient
 * synchronous wallet commit; it cannot interrupt a slow filesystem/callback mid-commit.
 * Wallet campaign receipts MUST be durable and return duplicate after a checkpoint crash.
 * Audit must be idempotent by event.key. Authorization callbacks must look up live roles.
 */
export class BulkGrants {
  private campaigns = new Map<string, Campaign>();
  private storagePaused = new Set<string>();
  private now: () => number;
  private timer?: ReturnType<typeof setTimeout>;
  private started = false;
  private closed = false;
  private busy = false;
  private blockedUntil = 0;
  private maxTargets: number;
  private batchSize: number;
  constructor(private o: BulkGrantsOptions) {
    this.now = o.now ?? Date.now;
    this.maxTargets = o.maxTargets ?? MAX_TARGETS;
    this.batchSize = o.batchSize ?? 25;
    if ((o.enabled && !text(o.dir, 4096)) || typeof o.dir !== 'string' || o.dir.length > 4096 || !nat(this.maxTargets) || this.maxTargets < 1 || this.maxTargets > MAX_TARGETS || !nat(this.batchSize) || this.batchSize < 1 || this.batchSize > 25) throw new BulkGrantError(400, 'INVALID_OPTIONS');
    o.monitor.register('bulk-grants', !!o.dir);
    if (!o.dir) return; // Disabled/non-persistent application: never create a relative directory.
    try {
      mkdirSync(o.dir, { recursive: true, mode: 0o700 });
      if (!lstatSync(o.dir).isDirectory() || lstatSync(o.dir).isSymbolicLink()) throw new Error('invalid_bulk_directory');
      const files = readdirSync(o.dir).filter((f) => f.endsWith('.json'));
      if (files.length > MAX_CAMPAIGNS) throw new Error('bulk_campaign_limit');
      for (const file of files) {
        const id = file.slice(0, -5);
        if (!UUID.test(id) || id !== id.toLowerCase() || !lstatSync(path.join(o.dir, file)).isFile() || lstatSync(path.join(o.dir, file)).size > 32 * 1024 * 1024) throw new Error('invalid_bulk_file');
        const d = loadJsonFile(path.join(o.dir, file), (v) => validCampaign(v) && v.id === id);
        if (!d) throw new Error('missing_bulk_file');
        this.campaigns.set(id, d as unknown as Campaign);
      }
    } catch (e) { o.monitor.fail('bulk-grants', e); throw e; }
    if (o.autoStart) this.start();
  }
  private actor(actor: BulkActor) {
    if (!this.o.enabled) throw new BulkGrantError(503, 'BULK_DISABLED');
    if (!checkActor(actor) || !this.o.authorized(clone(actor))) throw new BulkGrantError(403, 'FORBIDDEN');
    if (this.closed || this.busy) throw new BulkGrantError(409, 'BULK_BUSY_OR_CLOSED');
  }
  private campaign(id: string) {
    if (typeof id !== 'string' || !UUID.test(id)) throw new BulkGrantError(400, 'INVALID_CAMPAIGN_ID');
    const c = this.campaigns.get(id.toLowerCase());
    if (!c) throw new BulkGrantError(404, 'CAMPAIGN_NOT_FOUND');
    return c;
  }
  private failure(c: Campaign, e: unknown): never {
    this.storagePaused.add(c.id); this.blockedUntil = this.now() + RETRY_MS;
    this.o.monitor.fail('bulk-grants', e);
    this.schedule(RETRY_MS); // Includes idle runner + failed confirm/audit before schedule(0).
    throw e instanceof StorageError ? e : new StorageError('bulk-grants', 'WRITE_OR_AUDIT_FAILED');
  }
  /** Overridable solely for deterministic crash/fault tests; never publish an uncommitted draft. */
  protected writeCampaign(c: Campaign) { saveJsonFile(path.join(this.o.dir, `${c.id}.json`), c, this.now(), validCampaign); }
  private save(c: Campaign) {
    if (!validCampaign(c as unknown as Record<string, unknown>)) throw new Error('invalid_bulk_state');
    try { this.writeCampaign(c); } catch (e) { return this.failure(c, e); }
    this.campaigns.set(c.id, c); this.storagePaused.delete(c.id);
    if (!this.storagePaused.size) this.o.monitor.ok('bulk-grants');
    return c;
  }
  private event(c: Campaign, actor: BulkActor, action: Event['action']) {
    c.events.push({ key: `bulk:${c.id}:${c.events.length}`, actor: clone(actor), action: 'bulk.' + action, target: c.id, mirrored: false,
      detail: JSON.stringify({ at: this.now(), actor, operatorName: c.request.operatorName, reason: c.request.reason, fingerprint: c.fingerprint, targetCount: c.targets.length, counts: counts(c), rewards: c.request.rewards }) });
  }
  private flush() {
    for (let c of this.campaigns.values()) {
      for (let i = 0; i < c.events.length; i++) {
        if (c.events[i].mirrored) continue;
        const { mirrored: _, ...event } = c.events[i];
        try { this.o.audit(clone(event)); } catch (e) { return this.failure(c, e); }
        const draft = clone(c); draft.events[i].mirrored = true; c = this.save(draft);
      }
    }
  }
  private ready() {
    this.flush();
    for (const id of [...this.storagePaused]) { const c = this.campaigns.get(id); if (c) this.save(clone(c)); else this.storagePaused.delete(id); }
    if (!this.storagePaused.size) this.o.monitor.ok('bulk-grants');
    if (!this.o.monitor.status().ready) throw new StorageError('bulk-grants', 'STORAGE_NOT_READY');
  }
  catalog() {
    const items = this.o.items().filter((x) => x.active && x.permanent && SLOTS.includes(x.slot));
    if (items.length > 10_000 || !items.every((x) => text(x.id, 128) && text(x.name, 200)) || new Set(items.map((x) => x.id)).size !== items.length) throw new BulkGrantError(409, 'INVALID_CATALOG');
    return { enabled: this.o.enabled, items: clone(items).sort((a, b) => a.id.localeCompare(b.id)), limits: { maxTargets: this.maxTargets, maxDrafts: MAX_DRAFTS, maxCampaigns: MAX_CAMPAIGNS, coins: 1_000_000, gems: 100_000, itemIds: 30, batchSize: this.batchSize, previewTtlMs: TTL } };
  }
  private checkItems(c: Campaign) {
    const current = new Map(this.catalog().items.map((x) => [x.id, x]));
    if (c.items.some((x) => current.get(x.id)?.slot !== x.slot)) throw new BulkGrantError(409, 'CATALOG_CHANGED');
  }
  private summary(c: Campaign) {
    const count = counts(c);
    return { id: c.id, fingerprint: c.fingerprint, targetCount: c.targets.length, totals: { coins: c.request.rewards.coins * c.targets.length, gems: c.request.rewards.gems * c.targets.length }, rewards: clone(c.request.rewards), itemSnapshots: clone(c.items), filter: clone(c.request.filter), reason: c.request.reason, operatorName: c.request.operatorName, actor: clone(c.actor), createdAt: c.createdAt, expiresAt: c.expiresAt, status: this.storagePaused.has(c.id) ? 'paused_storage' as const : c.status, confirmed: clone(c.confirmed), counts: count, successCount: count.success, failedCount: count.failed, pendingCount: count.pending, retries: c.retries, manualPause: c.manualPause, auditPending: c.events.filter((e) => !e.mirrored).length };
  }
  preview(actor: BulkActor, body: { key: string; filter: BulkFilter; rewards: GrantBundle; reason: string; operatorName?: string }) {
    this.actor(actor);
    if (!isObj(body) || typeof body.key !== 'string' || !UUID.test(body.key)) return bad('INVALID_KEY');
    const id = body.key.toLowerCase(), request = normalize(body), requestHash = hash(request), previous = this.campaigns.get(id);
    if (previous) {
      if (previous.actor.id !== actor.id || previous.requestHash !== requestHash) throw new BulkGrantError(409, 'KEY_CONFLICT');
      return this.summary(previous);
    }
    this.ready();
    if (this.campaigns.size >= MAX_CAMPAIGNS || [...this.campaigns.values()].filter((c) => c.status === 'preview' && c.expiresAt > this.now()).length >= MAX_DRAFTS) throw new BulkGrantError(409, 'CAMPAIGN_LIMIT');
    const createdAt = this.now(), available = new Map(this.catalog().items.map((x) => [x.id, x]));
    const items = request.rewards.itemIds.map((id) => { const item = available.get(id); if (!item) throw new BulkGrantError(409, 'INVALID_ITEM'); return clone(item); });
    const raw = this.o.targets(clone(request.filter), createdAt);
    if (!Array.isArray(raw) || raw.length > this.maxTargets) throw new BulkGrantError(400, 'TARGET_LIMIT');
    const targets = raw.map((t) => { if (!isObj(t) || typeof t.id !== 'string' || !UUID.test(t.id) || !text(t.name, 120)) return bad('INVALID_TARGET'); return { id: t.id.toLowerCase(), name: t.name }; }).sort((a, b) => a.id.localeCompare(b.id));
    if (new Set(targets.map((t) => t.id)).size !== targets.length) return bad('DUPLICATE_TARGET');
    if (![request.rewards.coins * targets.length, request.rewards.gems * targets.length].every(nat)) return bad('TOTAL_OVERFLOW');
    const c: Campaign = { version: 1, id, actor: clone(actor), request, requestHash, fingerprint: '', items, targets, createdAt, expiresAt: createdAt + TTL, status: 'preview', results: targets.map(() => null), queue: targets.map((_, i) => i), cursor: 0, events: [], retries: 0, manualPause: false };
    c.fingerprint = hash(immutable(c));
    this.save(c); return this.summary(c);
  }
  private verify(actor: BulkActor, c: Campaign, body: { fingerprint: string; targetCount: number }) {
    this.actor(actor);
    if (actor.id !== c.actor.id && actor.role !== 'owner') throw new BulkGrantError(403, 'NOT_CAMPAIGN_CREATOR');
    if (!isObj(body) || body.fingerprint !== c.fingerprint || body.targetCount !== c.targets.length) throw new BulkGrantError(409, 'SNAPSHOT_MISMATCH');
    if (!this.o.authorized(clone(c.actor))) throw new BulkGrantError(403, 'CREATOR_REVOKED');
  }
  confirm(actor: BulkActor, id: string, body: { fingerprint: string; targetCount: number }) {
    let c = this.campaign(id); this.verify(actor, c, body);
    this.ready(); c = this.campaign(id);
    if (c.status !== 'preview') return this.summary(c);
    if (this.now() >= c.expiresAt) throw new BulkGrantError(409, 'PREVIEW_EXPIRED');
    if (!c.targets.length) throw new BulkGrantError(409, 'NO_TARGETS');
    this.checkItems(c);
    const draft = clone(c); draft.confirmed = { actor: clone(actor), at: this.now() }; draft.status = 'queued';
    this.event(draft, actor, 'confirm'); this.save(draft); this.flush(); this.schedule(0);
    return this.summary(this.campaign(id));
  }
  retry(actor: BulkActor, id: string, body: { fingerprint: string; targetCount: number }) {
    let c = this.campaign(id); this.verify(actor, c, body); const wasPaused = this.storagePaused.has(c.id); this.ready(); c = this.campaign(id);
    if (c.status === 'preview') throw new BulkGrantError(409, 'NOT_CONFIRMED');
    if (c.status === 'completed' || (!wasPaused && (c.status === 'queued' || c.status === 'running'))) { this.schedule(0); return this.summary(c); }
    if (c.retries >= 100) throw new BulkGrantError(409, 'RETRY_LIMIT');
    this.checkItems(c);
    const draft = clone(c); draft.queue = draft.results.flatMap((r, i) => r?.status === 'success' ? [] : [i]); draft.cursor = 0; draft.status = 'queued'; draft.manualPause = false; draft.retries++;
    this.event(draft, actor, 'retry'); this.save(draft); this.flush(); this.blockedUntil = 0; this.schedule(0);
    return this.summary(this.campaign(id));
  }
  pause(id: string) {
    if (this.busy || this.closed) throw new BulkGrantError(409, 'BULK_BUSY_OR_CLOSED');
    this.ready(); const c = this.campaign(id);
    if (c.status === 'preview') throw new BulkGrantError(409, 'NOT_CONFIRMED');
    if (c.status === 'completed' || c.status === 'completed_with_errors' || c.manualPause) return this.summary(c);
    const d = clone(c); d.manualPause = true; d.status = 'paused_storage'; this.event(d, c.confirmed!.actor, 'pause'); this.save(d); this.flush(); return this.summary(this.campaign(id));
  }
  get(id: string, opt: { status?: 'success' | 'failed' | 'pending'; offset?: number; limit?: number } = {}) {
    const c = this.campaign(id), { offset, limit } = this.page(opt, 50), pending = new Set(c.queue.slice(c.cursor));
    if (opt.status !== undefined && !['success', 'failed', 'pending'].includes(opt.status)) return bad('INVALID_STATUS');
    const rows = c.targets.flatMap((t, i) => { const status = pending.has(i) ? 'pending' : c.results[i]?.status; return opt.status && status !== opt.status ? [] : [{ ...t, ...clone(c.results[i]), status }]; });
    return { ...this.summary(c), results: { total: rows.length, offset, limit, list: rows.slice(offset, offset + limit) } };
  }
  private page(opt: { offset?: number; limit?: number }, max: number) {
    const offset = opt.offset ?? 0, limit = opt.limit ?? max;
    if (!nat(offset) || !nat(limit) || !limit || limit > max) return bad('INVALID_PAGE');
    return { offset, limit };
  }
  list(opt: { offset?: number; limit?: number } = {}) {
    const { offset, limit } = this.page(opt, 20);
    const rows = [...this.campaigns.values()].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
    return { campaigns: rows.slice(offset, offset + limit).map((c) => this.summary(c)), offset, limit, total: rows.length };
  }
  runBatch() { return this.pump(true); }
  tick() { return this.pump(false); }
  private pump(force: boolean) {
    if (this.closed || this.busy || !this.o.enabled || (!force && this.now() < this.blockedUntil)) return false;
    try { this.ready(); } catch (e) {
      for (const c of this.campaigns.values()) if (['queued', 'running'].includes(c.status)) this.storagePaused.add(c.id);
      this.blockedUntil = this.now() + RETRY_MS; this.schedule(RETRY_MS); throw e;
    }
    let c = [...this.campaigns.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)).find((x) => ['queued', 'running', 'paused_storage'].includes(x.status) && !x.manualPause);
    if (!c) return false;
    const validAuth = this.o.authorized(clone(c.actor)) && this.o.authorized(clone(c.confirmed!.actor));
    let itemError = false;
    try { this.checkItems(c); } catch (e) { if (!(e instanceof BulkGrantError)) throw e; itemError = true; }
    if (!validAuth || itemError) {
      const d = clone(c); d.status = 'paused_authorization'; this.event(d, c.confirmed!.actor, 'authorization_paused'); this.save(d); this.flush(); return false;
    }
    const running = clone(c); running.status = 'running'; c = this.save(running); // durable intent before touching wallet
    const indexes = c.queue.slice(c.cursor, c.cursor + this.batchSize), ids = indexes.map((i) => c!.targets[i].id);
    this.busy = true;
    const startedAt = Date.now();
    try {
      const rows = ids.length ? this.o.apply(c.id, c.fingerprint, [...ids], clone(c.request.rewards), c.request.reason) : [];
      if (!Array.isArray(rows) || rows.length !== ids.length || new Set(rows.map((r) => r.id)).size !== ids.length || !rows.every((r) => ids.includes(r.id) && ['granted', 'duplicate', 'failed'].includes(r.status))) throw new Error('invalid_wallet_batch_result');
      const byId = new Map(rows.map((r) => [r.id, r])), draft = clone(c), granted: string[] = [];
      for (const i of indexes) {
        const r = byId.get(c.targets[i].id)!;
        draft.results[i] = { id: r.id, status: r.status === 'failed' ? 'failed' : 'success', outcome: r.status, at: this.now(), ...(r.code === undefined ? {} : { code: r.code }), addedItems: clone(r.addedItems ?? []), alreadyOwned: clone(r.alreadyOwned ?? []) };
        if (r.status !== 'failed') granted.push(r.id);
      }
      draft.cursor += indexes.length;
      if (draft.cursor === draft.queue.length) { draft.status = counts(draft).failed ? 'completed_with_errors' : 'completed'; this.event(draft, c.confirmed!.actor, 'completed'); }
      this.save(draft); this.flush();
      if (granted.length) { try { this.o.onGranted?.(granted); } catch { this.o.log?.('bulk_notification_failed', { count: granted.length }); } }
      return true;
    } catch (e) { return this.failure(c, e); }
    finally { this.busy = false; if (Date.now() - startedAt > 1000) this.o.log?.('bulk_slow_batch', { count: ids.length, durationMs: Date.now() - startedAt }); }
  }
  private schedule(delay: number) {
    if (!this.started || this.closed || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      try { this.tick(); } catch (e) { this.o.log?.('bulk_runner_paused', { code: e instanceof StorageError ? e.code : 'RUNNER_FAILED' }); this.blockedUntil = this.now() + RETRY_MS; }
      const work = [...this.campaigns.values()].some((c) => (['queued', 'running', 'paused_storage'].includes(c.status) && !c.manualPause) || c.events.some((e) => !e.mirrored));
      if (this.started && this.o.enabled && work) this.schedule(this.blockedUntil > this.now() ? RETRY_MS : 0);
    }, delay);
    this.timer.unref?.();
  }
  start() { if (this.closed) throw new BulkGrantError(409, 'BULK_CLOSED'); this.started = true; this.schedule(0); }
  stop() { this.started = false; if (this.timer) clearTimeout(this.timer); this.timer = undefined; }
  close() { this.stop(); this.closed = true; }
}
