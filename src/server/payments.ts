import { createHash, randomUUID } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageError, StorageMonitor } from './datafile.js';
import type { Wallet, Cur } from './wallet.js';
import { validEconomy, type Economy, type MoneyPrice } from './economy.js';
import type { PaymentProvider, ProviderTransaction } from './payment-provider.js';

type Mode = 'disabled' | 'test' | 'live';
type OrderStatus = 'pending' | 'awaiting_payment' | 'paid' | 'failed' | 'cancelled' | 'refund_pending' | 'refunded' | 'review';
export interface OrderView {
  id: string; userId: string; packId: string; cur: Cur; amount: number; priceMinor: number; currency: 'AED';
  mode: 'test' | 'live'; status: OrderStatus; createdAt: number; updatedAt: number;
  transactionId?: string; checkoutUrl?: string; credited: boolean; refunded: boolean;
  refundStatus?: string; manualReview?: boolean;
}
export interface PaymentsOptions {
  file: string; wallet: Wallet; economy: Economy; provider: PaymentProvider | null; mode: Mode;
  liveApproved: boolean; licenseApproved: boolean; merchantApproved: boolean; publicBaseUrl: string;
  production?: boolean; now?: () => number; mon?: StorageMonitor;
  complimentaryPurchases?: boolean;
  notify?: (userId: string, orderId: string, text: string) => void;
}
/** Only these fields are retained; never provider payloads, signatures, tokens or card data. */
interface Evidence {
  id: string; object: 'charge' | 'refund'; status: string; amountMinor: number; currency: 'AED';
  liveMode: boolean; orderId: string; chargeId?: string; merchantId?: string; created: number;
  observedAt: number; fingerprint: string;
}
interface RefundOp {
  id: string; keyHash: string; actorId: string; reason: string; at: number;
  phase: 'reserving' | 'held' | 'unknown' | 'pending' | 'failed' | 'done' | 'blocked';
  startedAt?: number; transactionId?: string; released: boolean;
}
interface Order extends OrderView {
  provider: string; keyHash: string;
  createStartedAt?: number; createUnknown: boolean; captureVerified: boolean; refundVerified: boolean;
  evidence: Evidence[]; notified: string[]; reviewCode?: string; refund?: RefundOp;
  refundTransactionId?: string; externalHoldId?: string; debt?: number;
}
interface AuditRow { id: string; orderId: string; actorId: string; action: 'refund' | 'price.configured'; reason: string; at: number; keyHash?: string }
interface PriceOp {
  id: string; keyHash: string; actorId: string; reason: string; at: number; fingerprint: string;
  prices: Record<string, MoneyPrice | null>; phase: 'intent' | 'done' | 'review';
}
interface Data { v: 1; orders: Record<string, Order>; keys: Record<string, string>; refundKeys: Record<string, string>; priceOps: Record<string, PriceOp>; audit: AuditRow[] }
// Tap's provider deduplication expires after 24h. The smaller window is deliberate, permanent locally.
const REQUEST_TTL_MS = 23 * 60 * 60_000;
const STATUSES: OrderStatus[] = ['pending', 'awaiting_payment', 'paid', 'failed', 'cancelled', 'refund_pending', 'refunded', 'review'];
const FAILED = new Set(['FAILED', 'DECLINED', 'CANCELLED', 'CANCELED', 'ABANDONED', 'TIMEDOUT', 'RESTRICTED']);
const nat = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const pos = (v: unknown): v is number => nat(v) && v > 0;
const text = (v: unknown, max = 240): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const digest = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const opt = (v: unknown, check: (v: unknown) => boolean) => v === undefined || check(v);
const exact = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
const bool = (v: unknown) => typeof v === 'boolean';
const token = (v: unknown) => text(v, 160);
const providerStatus = (v: unknown) => typeof v === 'string' && /^[A-Z][A-Z_]{0,39}$/.test(v);
const evidenceFields = ['id', 'object', 'status', 'amountMinor', 'currency', 'liveMode', 'orderId', 'chargeId', 'merchantId', 'created', 'observedAt', 'fingerprint'];
function validEvidence(v: unknown): v is Evidence {
  return isObj(v) && exact(v, evidenceFields) && token(v.id) && (v.object === 'charge' || v.object === 'refund')
    && providerStatus(v.status) && pos(v.amountMinor) && v.currency === 'AED' && bool(v.liveMode)
    && token(v.orderId) && opt(v.chargeId, token) && opt(v.merchantId, token) && nat(v.created)
    && nat(v.observedAt) && digest(v.fingerprint) && (v.object !== 'refund' || token(v.chargeId));
}
function validRefund(v: unknown): v is RefundOp {
  return isObj(v) && exact(v, ['id', 'keyHash', 'actorId', 'reason', 'at', 'phase', 'startedAt', 'transactionId', 'released'])
    && token(v.id) && digest(v.keyHash) && token(v.actorId) && text(v.reason, 500) && nat(v.at)
    && ['reserving', 'held', 'unknown', 'pending', 'failed', 'done', 'blocked'].includes(String(v.phase))
    && opt(v.startedAt, nat) && opt(v.transactionId, token) && bool(v.released);
}
const orderFields = ['id', 'userId', 'packId', 'cur', 'amount', 'priceMinor', 'currency', 'mode', 'status', 'createdAt', 'updatedAt', 'transactionId', 'checkoutUrl', 'credited', 'refunded', 'refundStatus', 'manualReview', 'provider', 'keyHash', 'createStartedAt', 'createUnknown', 'captureVerified', 'refundVerified', 'evidence', 'notified', 'reviewCode', 'refund', 'refundTransactionId', 'externalHoldId', 'debt'];
function validOrder(v: unknown): v is Order {
  if (!isObj(v) || !exact(v, orderFields) || !token(v.id) || !token(v.userId) || !token(v.packId)
    || !['coins', 'gems'].includes(String(v.cur)) || !pos(v.amount) || !pos(v.priceMinor) || v.currency !== 'AED'
    || !['test', 'live'].includes(String(v.mode)) || !STATUSES.includes(v.status as OrderStatus)
    || !nat(v.createdAt) || !nat(v.updatedAt) || v.updatedAt < v.createdAt || !token(v.provider) || !digest(v.keyHash)
    || !['credited', 'refunded', 'createUnknown', 'captureVerified', 'refundVerified'].every(k => bool(v[k]))
    || !opt(v.transactionId, token) || !opt(v.checkoutUrl, x => text(x, 2048)) || !opt(v.createStartedAt, nat)
    || !opt(v.refundStatus, providerStatus) || !opt(v.manualReview, bool) || !opt(v.reviewCode, x => text(x, 80))
    || !opt(v.refund, validRefund) || !opt(v.refundTransactionId, token) || !opt(v.externalHoldId, token) || !opt(v.debt, nat)
    || !Array.isArray(v.notified) || !v.notified.every(x => x === 'paid' || x === 'refunded') || new Set(v.notified).size !== v.notified.length
    || !Array.isArray(v.evidence) || !v.evidence.every(validEvidence)) return false;
  const evidence = v.evidence as Evidence[];
  if (evidence.some(e => {
    const clean = { id: e.id, object: e.object, status: e.status, amountMinor: e.amountMinor, currency: e.currency,
      liveMode: e.liveMode, orderId: e.orderId, ...(e.chargeId ? { chargeId: e.chargeId } : {}),
      ...(e.merchantId ? { merchantId: e.merchantId } : {}), created: e.created };
    return hash(JSON.stringify(clean)) !== e.fingerprint;
  })) return false;
  const merchant = evidence.find(e => e.merchantId)?.merchantId;
  if (merchant && evidence.some(e => e.merchantId !== merchant)) return false;
  if (new Set(evidence.map(e => e.fingerprint)).size !== evidence.length) return false;
  if (evidence.some(e => e.orderId !== v.id || e.currency !== v.currency || e.amountMinor !== v.priceMinor || e.liveMode !== (v.mode === 'live')
    || (e.object === 'charge' ? e.id !== v.transactionId : e.chargeId !== v.transactionId))) return false;
  if (v.captureVerified !== evidence.some(e => e.object === 'charge' && e.status === 'CAPTURED')) return false;
  if (v.refundVerified !== evidence.some(e => e.object === 'refund' && e.status === 'REFUNDED')) return false;
  if ((v.credited || v.refunded || v.refundVerified) && !v.captureVerified) return false;
  if (v.refunded && !v.refundVerified) return false;
  if (v.status === 'paid' && (!v.credited || v.refunded)) return false;
  if (v.status === 'refunded' && !v.refunded) return false;
  return true;
}
const priceFingerprint = (prices: Record<string, MoneyPrice | null>) => hash(JSON.stringify(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b))));
function validPriceOp(v: unknown): v is PriceOp {
  return isObj(v) && exact(v, ['id', 'keyHash', 'actorId', 'reason', 'at', 'fingerprint', 'prices', 'phase'])
    && token(v.id) && digest(v.keyHash) && token(v.actorId) && text(v.reason, 500) && nat(v.at) && digest(v.fingerprint)
    && ['intent', 'done', 'review'].includes(String(v.phase)) && isObj(v.prices)
    && validEconomy({ v: 1, gemsToCoinsRate: null, coinToGemsEnabled: false, packPrices: v.prices })
    && Object.values(v.prices).every(p => p === null || (isObj(p) && p.currency === 'AED'))
    && priceFingerprint(v.prices as Record<string, MoneyPrice | null>) === v.fingerprint;
}
/** Compatible DataValidator for startup/checkDataFiles. Corruption is never replaced with an empty store. */
export const validPayments = (d: Record<string, unknown>): boolean => {
  if (!isObj(d) || !exact(d, ['v', 'orders', 'keys', 'refundKeys', 'priceOps', 'audit']) || d.v !== 1 || !isObj(d.orders)
    || !isObj(d.keys) || !isObj(d.refundKeys) || !isObj(d.priceOps) || !Array.isArray(d.audit)) return false;
  const orders = d.orders;
  if (!Object.entries(orders).every(([id, v]) => validOrder(v) && v.id === id && d.keys && (d.keys as Record<string, unknown>)[v.keyHash] === id)) return false;
  if (!Object.entries(d.keys).every(([k, id]) => digest(k) && token(id) && isObj(orders[id]) && orders[id].keyHash === k)) return false;
  if (!Object.entries(d.refundKeys).every(([k, id]) => digest(k) && token(id) && !!orders[id])) return false;
  if (!Object.entries(d.priceOps).every(([k, op]) => validPriceOp(op) && op.keyHash === k)) return false;
  const priceOps = Object.values(d.priceOps) as PriceOp[];
  const audit = d.audit;
  return audit.every(v => isObj(v) && exact(v, ['id', 'orderId', 'actorId', 'action', 'reason', 'at', 'keyHash'])
    && token(v.id) && token(v.orderId) && token(v.actorId) && text(v.reason, 500) && nat(v.at)
    && (v.action === 'refund' ? !!orders[v.orderId] && digest(v.keyHash) && (d.refundKeys as Record<string, unknown>)[v.keyHash] === v.orderId : v.action === 'price.configured'
      && priceOps.some(op => op.id === v.id && op.id === v.orderId && op.actorId === v.actorId && op.reason === v.reason && op.at === v.at && op.phase === 'done')))
    && new Set(audit.map(v => (v as AuditRow).id)).size === audit.length
    && priceOps.every(op => op.phase !== 'done' || audit.some(row => (row as AuditRow).id === op.id));
};

export class PaymentsError extends Error {
  constructor(public code: string, public status = 400) { super(code); this.name = 'PaymentsError'; }
}

/** One process owns this store (the application's data-directory lock enforces that). */
export class Payments {
  private d: Data = { v: 1, orders: {}, keys: {}, refundKeys: {}, priceOps: {}, audit: [] };
  private disk: Persister;
  private now: () => number;
  private locks = new Map<string, Promise<unknown>>();
  private creates = new Map<string, Promise<OrderView>>();
  private retryCursor = 0;
  private base: string | null = null;
  private mon: StorageMonitor;
  constructor(private opts: PaymentsOptions) {
    this.now = opts.now ?? Date.now;
    this.mon = opts.mon ?? new StorageMonitor();
    try {
      const u = new URL(opts.publicBaseUrl);
      if (u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash) this.base = u.origin + u.pathname.replace(/\/$/, '');
    } catch { /* No public checkout/webhook URL means no money requests. */ }
    if (opts.file) {
      const loaded = loadJsonFile(opts.file, validPayments);
      if (loaded) this.d = loaded as unknown as Data;
    }
    this.disk = new Persister('payments', opts.file, () => this.d, this.now, this.mon, validPayments);
  }
  status() {
    const o = this.opts;
    const durable = !!o.file && o.wallet.persistent && o.economy.persistent;
    const healthy = this.mon.status().ready && !o.wallet.unsaved() && !o.economy.unsaved() && !this.disk.unsaved;
    const complimentaryEnabled = o.complimentaryPurchases === true && durable && healthy;
    let reason: string | null = null;
    if (o.complimentaryPurchases) reason = !durable ? 'durable_storage_required' : !healthy ? 'storage_unavailable' : 'complimentary_purchases';
    else if (o.mode === 'disabled') reason = 'disabled';
    else if (!o.provider) reason = 'provider_missing';
    else if (o.provider.mode !== o.mode) reason = 'provider_mode_mismatch';
    else if (o.mode === 'live' && !(o.liveApproved && o.licenseApproved && o.merchantApproved)) reason = 'live_not_approved';
    else if (o.mode === 'test' && o.production) reason = 'production_test_forbidden';
    else if (!o.file || !o.wallet.persistent || !o.economy.persistent) reason = 'durable_storage_required';
    else if (!this.base) reason = 'public_url_required';
    return { mode: o.mode, enabled: reason === null, liveEnabled: reason === null && o.mode === 'live', provider: o.provider?.name ?? null, reason, complimentaryEnabled };
  }
  packs(userId?: string) {
    const status = this.status(), view = this.opts.economy.view();
    const claimedKeys = new Set(userId ? this.opts.wallet.claimed(userId) : []);
    const packs = (rows: typeof view.coinPacks) => rows.map(p => {
      const claimed = claimedKeys.has(this.claimKey(p.id));
      return { ...p, complimentary: status.complimentaryEnabled, claimed,
        available: this.opts.complimentaryPurchases ? status.complimentaryEnabled && !claimed : status.enabled && pos(p.priceMinor) && p.moneyCurrency === 'AED' };
    });
    return { ...view, paymentConfigured: status.enabled, status, coinPacks: packs(view.coinPacks), gemPacks: packs(view.gemPacks) };
  }
  private claimKey(packId: string) { return `complimentary:v1:${packId}`; }
  /** Server catalogue + existing per-account durable grant proof; client keys never define entitlement. */
  async claim(userId: string, packId: string, key: string) {
    if (!token(userId) || !text(packId, 80) || !text(key, 80) || !key.trim()) throw new PaymentsError('bad_request');
    if (!this.status().complimentaryEnabled) throw new PaymentsError('complimentary_unavailable', 503);
    const view = this.opts.economy.view();
    const pack = [...view.coinPacks, ...view.gemPacks].find(p => p.id === packId);
    if (!pack) throw new PaymentsError('pack_unavailable', 409);
    const claimRef = this.claimKey(pack.id);
    return this.lock(JSON.stringify(['complimentary', userId, pack.id]), async () => {
      if (!this.status().complimentaryEnabled) throw new PaymentsError('complimentary_unavailable', 503);
      const wallet = this.opts.wallet;
      const proof = () => wallet.claimed(userId).includes(claimRef);
      const duplicate = proof();
      if (!duplicate) {
        try { wallet.grant(userId, pack.cur, pack.amount, 'باقة مجانية مرة واحدة: ' + pack.id, claimRef); }
        catch (error) { if (!proof()) throw error; } // A postcommit hook failure must not report a failed grant.
        if (!proof()) throw new PaymentsError('claim_rejected', 409);
      }
      return { ok: true as const, duplicate, packId: pack.id, cur: pack.cur, amount: pack.amount,
        coins: wallet.balance(userId), gems: wallet.gems(userId), claimed: true as const, claimRef };
    });
  }
  private cashGuard() {
    if (this.opts.complimentaryPurchases) throw new PaymentsError('payments_unavailable', 503);
  }
  private active(): PaymentProvider {
    if (!this.status().enabled) throw new PaymentsError('payments_unavailable', 503);
    return this.opts.provider!;
  }
  private providerFor(o: Order): PaymentProvider {
    const p = this.active();
    if (p.name !== o.provider || p.mode !== o.mode) throw new PaymentsError('provider_mismatch', 409);
    return p;
  }
  private change(fn: (draft: Data) => void) {
    const before = this.d;
    this.d = structuredClone(before);
    try { fn(this.d); this.disk.mustSave(); } catch (e) { this.d = before; throw e; }
  }
  private update(id: string, fn: (o: Order) => void) {
    this.change(d => { const o = d.orders[id]; fn(o); o.updatedAt = Math.max(o.createdAt, this.now()); });
  }
  private lock<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const old = this.locks.get(id) ?? Promise.resolve();
    const run = old.catch(() => undefined).then(fn);
    this.locks.set(id, run);
    void run.then(() => { if (this.locks.get(id) === run) this.locks.delete(id); }, () => { if (this.locks.get(id) === run) this.locks.delete(id); });
    return run;
  }
  private owned(userId: string, orderId: string): Order {
    const o = this.d.orders[orderId];
    if (!o || o.userId !== userId) throw new PaymentsError('order_not_found', 404);
    return o;
  }
  private view(o: Order): OrderView {
    const { id, userId, packId, cur, amount, priceMinor, currency, mode, status, createdAt, updatedAt, credited, refunded } = o;
    const checkout = o.checkoutUrl && this.opts.provider?.name === o.provider && this.opts.provider.validateCheckoutUrl(o.checkoutUrl) ? o.checkoutUrl : undefined;
    return { id, userId, packId, cur, amount, priceMinor, currency, mode, status, createdAt, updatedAt, credited, refunded,
      ...(o.transactionId ? { transactionId: o.transactionId } : {}), ...(checkout ? { checkoutUrl: checkout } : {}),
      ...(o.refundStatus ? { refundStatus: o.refundStatus } : {}), ...(o.manualReview ? { manualReview: true } : {}) };
  }
  get(userId: string, orderId: string): OrderView { return this.view(this.owned(userId, orderId)); }
  list(userId: string, offset = 0) {
    if (!nat(offset)) throw new PaymentsError('bad_offset');
    const rows = Object.values(this.d.orders).filter(o => o.userId === userId).sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    return { list: rows.slice(offset, offset + 50).map(o => this.view(o)), total: rows.length };
  }
  async create(userId: string, packId: string, key: string, customer: { name: string; email: string }): Promise<OrderView> {
    this.cashGuard();
    if (!token(userId) || !token(packId) || !text(key, 80)) throw new PaymentsError('bad_request');
    const k = hash(JSON.stringify([userId, key]));
    const previous = this.d.keys[k];
    if (previous) {
      const o = this.d.orders[previous];
      if (o.packId !== packId) throw new PaymentsError('idempotency_conflict', 409);
      const running = this.creates.get(k);
      if (running) return running;
      if (o.transactionId || o.status === 'cancelled' || o.captureVerified || o.refundVerified) return this.view(o);
      if (!customer || !text(customer.name?.trim(), 120) || !text(customer.email?.trim(), 254)
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) throw new PaymentsError('bad_customer');
      const run = this.lock(o.id, async () => { await this.createCharge(o.id, { name: customer.name.trim(), email: customer.email.trim() }); return this.view(this.d.orders[o.id]); });
      this.creates.set(k, run);
      void run.then(() => this.creates.delete(k), () => this.creates.delete(k));
      return run;
    }
    const p = this.active();
    if (!customer || !text(customer.name?.trim(), 120) || !text(customer.email?.trim(), 254)
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) throw new PaymentsError('bad_customer');
    const packs = this.packs();
    const pack = [...packs.coinPacks, ...packs.gemPacks].find(v => v.id === packId);
    if (!pack?.available || !pos(pack.priceMinor) || pack.moneyCurrency !== 'AED') throw new PaymentsError('pack_unavailable', 409);
    const at = this.now(), id = randomUUID();
    const o: Order = { id, userId, packId, cur: pack.cur, amount: pack.amount, priceMinor: pack.priceMinor, currency: 'AED', mode: p.mode,
      provider: p.name, keyHash: k, status: 'pending',
      createdAt: at, updatedAt: at, credited: false, refunded: false, createUnknown: false, captureVerified: false, refundVerified: false, evidence: [], notified: [] };
    this.change(d => { d.orders[id] = o; d.keys[k] = id; });
    const details = { name: customer.name.trim(), email: customer.email.trim() };
    const run = this.lock(id, async () => { await this.createCharge(id, details); return this.view(this.d.orders[id]); });
    this.creates.set(k, run);
    void run.then(() => { if (this.creates.get(k) === run) this.creates.delete(k); }, () => { if (this.creates.get(k) === run) this.creates.delete(k); });
    return run;
  }
  private review(id: string, code: string) {
    this.update(id, o => { o.manualReview = true; o.reviewCode = code; if (!o.credited && !o.refunded) o.status = 'review'; });
  }
  private unknown(id: string, refund: boolean) {
    this.update(id, o => {
      o.manualReview = true; o.reviewCode = refund ? 'refund_unknown' : 'charge_unknown';
      if (refund) { o.refund!.phase = 'unknown'; o.status = 'refund_pending'; } else { o.createUnknown = true; o.status = 'review'; }
    });
  }
  private expired(at: number) { return this.now() < at || this.now() - at >= REQUEST_TTL_MS; }
  private check(tx: ProviderTransaction, o: Order, object: 'charge' | 'refund', id: string) {
    const referenceMatches = tx && (tx.orderId === o.id || (object === 'refund' && tx.orderId === '' && tx.chargeId === o.transactionId));
    if (!tx || tx.id !== id || !token(tx.id) || tx.object !== object || !referenceMatches || tx.currency !== 'AED'
      || tx.amountMinor !== o.priceMinor || tx.liveMode !== (o.mode === 'live') || !providerStatus(tx.status) || !nat(tx.created)
      || !opt(tx.merchantId, token) || (object === 'refund' && (!token(tx.chargeId) || tx.chargeId !== o.transactionId))) {
      throw new PaymentsError('verification_failed', 409);
    }
    const merchant = o.evidence.find(e => e.merchantId)?.merchantId;
    if (merchant && tx.merchantId !== merchant) throw new PaymentsError('verification_failed', 409);
  }
  private retain(id: string, tx: ProviderTransaction): boolean {
    const o = this.d.orders[id];
    const clean = { id: tx.id, object: tx.object, status: tx.status, amountMinor: tx.amountMinor, currency: 'AED' as const,
      liveMode: tx.liveMode, orderId: tx.orderId, ...(tx.chargeId ? { chargeId: tx.chargeId } : {}),
      ...(tx.merchantId ? { merchantId: tx.merchantId } : {}), created: tx.created };
    const fingerprint = hash(JSON.stringify(clean));
    const duplicate = o.evidence.some(e => e.fingerprint === fingerprint);
    if (!duplicate) this.update(id, draft => {
      draft.evidence.push({ ...clean, observedAt: this.now(), fingerprint });
      if (tx.object === 'charge' && tx.status === 'CAPTURED') draft.captureVerified = true;
      if (tx.object === 'refund' && tx.status === 'REFUNDED') draft.refundVerified = true;
    });
    return duplicate;
  }
  private async createCharge(id: string, customer?: { name: string; email: string }) {
    let o = this.d.orders[id];
    if (o.transactionId || o.status === 'cancelled' || o.captureVerified || o.refundVerified) return;
    const p = this.providerFor(o);
    if (o.createStartedAt !== undefined && this.expired(o.createStartedAt)) { this.review(id, 'charge_request_expired'); return; }
    if (!customer) { this.review(id, 'customer_reentry_required'); return; }
    if (o.createStartedAt === undefined) this.update(id, v => { v.createStartedAt = this.now(); v.createUnknown = true; });
    o = this.d.orders[id];
    let tx: ProviderTransaction;
    try {
      tx = await p.createCharge({ orderId: o.id, amountMinor: o.priceMinor, currency: 'AED', name: customer.name, email: customer.email,
        returnUrl: `${this.base}/api/payments/return?orderId=${encodeURIComponent(id)}`, webhookUrl: `${this.base}/api/payments/webhook`, idempotencyKey: id });
    } catch { this.unknown(id, false); return; }
    try {
      this.check(tx, o, 'charge', tx.id);
      if (tx.checkoutUrl && !p.validateCheckoutUrl(tx.checkoutUrl)) throw new PaymentsError('verification_failed', 409);
      this.update(id, v => { v.transactionId = tx.id; v.createUnknown = false; if (tx.checkoutUrl) v.checkoutUrl = tx.checkoutUrl; if (v.status !== 'cancelled') v.status = 'awaiting_payment'; });
    } catch (e) {
      if (e instanceof StorageError) throw e;
      this.review(id, 'invalid_charge_response'); throw new PaymentsError('verification_failed', 409);
    }
    await this.retrieveCharge(id);
  }
  private creditKey(id: string) { return `payment:${id}:credit`; }
  private holdKey(id: string, op: RefundOp) { return `payment:${id}:hold:${op.id}`; }
  private releaseKey(id: string, op: RefundOp) { return `payment:${id}:release:${op.id}`; }
  private externalKey(id: string, transactionId: string) { return `payment:${id}:external:${hash(transactionId).slice(0, 24)}`; }
  private proof(o: Order, delta: number, key: string) { return this.opts.wallet.hasPaymentProof(o.userId, o.cur, delta, key); }
  private adjust(o: Order, delta: number, key: string) { return this.opts.wallet.paymentAdjust(o.userId, o.cur, delta, o.id, key); }
  private settlementKey(id: string, transactionId: string) { return `${this.externalKey(id, transactionId)}:settled`; }
  /** Durable verification precedes the wallet's atomic proof. Retrying either side never mints twice. */
  private finalize(id: string) {
    this.cashGuard();
    let o = this.d.orders[id];
    const credited = this.proof(o, o.amount, this.creditKey(id));
    if (credited && !o.credited) this.update(id, v => { v.credited = true; });
    o = this.d.orders[id];
    if (o.refundVerified) {
      let debt = 0;
      // A refund arriving before a credit is a durable tombstone: neither a credit nor a debit is needed.
      if (credited) {
        const op = o.refund;
        const held = op && this.proof(o, -o.amount, this.holdKey(id, op)) && !this.proof(o, o.amount, this.releaseKey(id, op));
        const external = this.externalKey(id, o.refundTransactionId!);
        const externalHeld = this.proof(o, -o.amount, external) && !this.proof(o, o.amount, `${external}:release`);
        if (!held && !externalHeld) {
          const key = this.settlementKey(id, o.refundTransactionId!);
          const out = this.adjust(o, -o.amount, key);
          if (!out.ok) debt = o.amount;
        }
      }
      this.update(id, v => {
        v.refunded = true; v.status = 'refunded'; v.refundStatus = 'REFUNDED'; v.debt = debt;
        if (v.refund) v.refund.phase = 'done';
        if (debt) { v.manualReview = true; v.reviewCode = 'external_refund_debt'; }
        else { v.manualReview = false; delete v.reviewCode; }
        delete v.checkoutUrl;
      });
      this.notify(id, 'refunded'); return;
    }
    // Unknown/pending external refunds cannot unlock a freshly verified purchase.
    if (o.refundTransactionId && o.refundStatus && !FAILED.has(o.refundStatus) && o.refundStatus !== 'REFUNDED') return;
    if (o.captureVerified && !credited) {
      const out = this.adjust(o, o.amount, this.creditKey(id));
      if (!out.ok) { this.review(id, 'wallet_credit_rejected'); return; }
      this.update(id, v => { v.credited = true; });
    }
    o = this.d.orders[id];
    if (o.credited) {
      this.update(id, v => {
        v.status = v.refund?.phase === 'blocked' ? 'review' : v.refund && ['reserving', 'held', 'unknown', 'pending'].includes(v.refund.phase) ? 'refund_pending' : 'paid';
        if (!v.refund || v.refund.phase === 'failed') { v.manualReview = false; delete v.reviewCode; }
        delete v.checkoutUrl;
      });
      this.notify(id, 'paid');
    }
  }
  private notify(id: string, event: 'paid' | 'refunded') {
    const o = this.d.orders[id];
    if (!this.opts.notify || o.notified.includes(event)) return;
    const prefix = o.mode === 'test' ? 'عملية تجريبية Sandbox: ' : '';
    try { this.opts.notify(o.userId, id, prefix + (event === 'paid' ? 'تم تأكيد شراء الباقة وإضافة الرصيد.' : 'تم تأكيد استرجاع مبلغ الطلب.')); }
    catch { return; } // Callback is retried; parent must deduplicate its durable notification using (orderId,event/text).
    this.update(id, v => { v.notified.push(event); });
  }
  private async applyCharge(id: string, tx: ProviderTransaction): Promise<boolean> {
    const o = this.d.orders[id];
    try { this.check(tx, o, 'charge', o.transactionId!); }
    catch { this.review(id, 'invalid_charge_verification'); throw new PaymentsError('verification_failed', 409); }
    const duplicate = this.retain(id, tx);
    if (tx.status === 'CAPTURED' || o.captureVerified) this.finalize(id);
    else if (!this.d.orders[id].credited && !this.d.orders[id].refunded) {
      this.update(id, v => {
        if (v.status !== 'cancelled') v.status = FAILED.has(tx.status) ? 'failed' : 'awaiting_payment';
        v.manualReview = false; delete v.reviewCode;
      });
    }
    return duplicate;
  }
  private async retrieveCharge(id: string) {
    const o = this.d.orders[id], p = this.providerFor(o);
    let tx: ProviderTransaction;
    try { tx = await p.retrieveCharge(o.transactionId!); }
    catch { this.review(id, 'charge_lookup_unavailable'); return; }
    await this.applyCharge(id, tx);
  }
  async refresh(userId: string, orderId: string): Promise<OrderView> {
    this.owned(userId, orderId);
    this.cashGuard();
    return this.lock(orderId, async () => {
      const o = this.owned(userId, orderId);
      if (o.transactionId) await this.retrieveCharge(orderId); else await this.createCharge(orderId);
      const current = this.d.orders[orderId];
      if (current.refund && !['done', 'failed', 'blocked'].includes(current.refund.phase)) await this.resumeRefund(orderId);
      else if (current.refundTransactionId && !current.refundVerified && current.refundStatus && !FAILED.has(current.refundStatus)) await this.retrieveRefund(orderId, current.refundTransactionId);
      this.finalize(orderId);
      return this.view(this.d.orders[orderId]);
    });
  }
  async cancel(userId: string, orderId: string): Promise<OrderView> {
    this.owned(userId, orderId);
    this.cashGuard();
    return this.lock(orderId, async () => {
      if (this.d.orders[orderId].transactionId) await this.retrieveCharge(orderId);
      this.update(orderId, o => { if (!o.captureVerified && !o.credited && !o.refunded) { o.status = 'cancelled'; delete o.checkoutUrl; } });
      return this.view(this.d.orders[orderId]);
    });
  }
  async webhook(raw: Buffer, signature: string): Promise<{ ok: true; duplicate: boolean }> {
    const p = this.active();
    let event: ProviderTransaction;
    try { event = await p.verifyWebhook(raw, signature); }
    catch { throw new PaymentsError('invalid_webhook', 401); }
    if (!event || !token(event.id) || !['charge', 'refund'].includes(event.object)
      || !(token(event.orderId) || (event.object === 'refund' && event.orderId === ''))) throw new PaymentsError('invalid_webhook', 400);
    // Signature fields are routing hints only. An omitted Tap refund reference binds through a stored provider ID.
    const existing = this.d.orders[event.orderId] ?? (event.object === 'refund' && event.orderId === ''
      ? Object.values(this.d.orders).find(o => o.refund?.transactionId === event.id || o.refundTransactionId === event.id || o.transactionId === event.chargeId) : undefined);
    if (!existing) throw new PaymentsError('order_not_found', 404);
    return this.lock(existing.id, async () => {
      const o = this.d.orders[existing.id];
      this.providerFor(o);
      try { this.check(event, event.object === 'refund' && !o.transactionId ? { ...o, transactionId: event.chargeId } : o, event.object, event.id); }
      catch { throw new PaymentsError('verification_failed', 409); }
      if (event.object === 'charge') {
        if (o.transactionId && o.transactionId !== event.id) throw new PaymentsError('verification_failed', 409);
        let tx: ProviderTransaction;
        try { tx = await p.retrieveCharge(event.id); } catch { throw new PaymentsError('provider_unavailable', 502); }
        try { this.check(tx, o, 'charge', event.id); } catch { this.review(o.id, 'invalid_webhook_verification'); throw new PaymentsError('verification_failed', 409); }
        if (!o.transactionId) this.update(o.id, v => { v.transactionId = event.id; v.createUnknown = false; });
        return { ok: true, duplicate: await this.applyCharge(o.id, tx) };
      }
      // Authenticate first, then retrieve BOTH refund and the original captured charge. The webhook body never grants value.
      let refund: ProviderTransaction;
      try { refund = await p.retrieveRefund(event.id); } catch { throw new PaymentsError('provider_unavailable', 502); }
      return { ok: true, duplicate: await this.applyRefund(o.id, refund, event.id) };
    });
  }
  async refund(actorId: string, orderId: string, key: string, reason: string): Promise<OrderView> {
    this.cashGuard();
    if (!token(actorId) || !text(key, 80) || !text(reason?.trim(), 500)) throw new PaymentsError('bad_request');
    if (!this.d.orders[orderId]) throw new PaymentsError('order_not_found', 404);
    const k = hash(JSON.stringify([actorId, key]));
    if (this.d.refundKeys[k] && this.d.refundKeys[k] !== orderId) throw new PaymentsError('idempotency_conflict', 409);
    return this.lock(orderId, async () => {
      let o = this.d.orders[orderId];
      if (this.d.refundKeys[k]) {
        const intent = this.d.audit.find(row => row.action === 'refund' && row.keyHash === k);
        if (!intent || intent.reason !== reason.trim()) throw new PaymentsError('idempotency_conflict', 409);
        return this.view(o);
      }
      this.providerFor(o);
      if (o.refunded) return this.view(o);
      if (o.refund && !['failed', 'blocked'].includes(o.refund.phase)) throw new PaymentsError('refund_in_progress', 409);
      if (!o.transactionId) throw new PaymentsError('order_not_paid', 409);
      await this.retrieveCharge(orderId);
      o = this.d.orders[orderId];
      if (!o.captureVerified || !o.credited) throw new PaymentsError('order_not_paid', 409);
      if (o.refundTransactionId && o.refundStatus && !FAILED.has(o.refundStatus)) throw new PaymentsError('refund_in_progress', 409);
      const at = this.now(), id = randomUUID();
      this.change(d => {
        d.refundKeys[k] = orderId;
        d.audit.push({ id, orderId, actorId, action: 'refund', reason: reason.trim(), at, keyHash: k });
        const order = d.orders[orderId];
        order.refund = { id, keyHash: k, actorId, reason: reason.trim(), at, phase: 'reserving', released: false };
        order.status = 'refund_pending'; order.updatedAt = Math.max(at, order.createdAt);
        delete order.refundTransactionId; delete order.refundStatus;
      });
      await this.resumeRefund(orderId);
      return this.view(this.d.orders[orderId]);
    });
  }
  private async resumeRefund(id: string) {
    let o = this.d.orders[id], op = o.refund;
    if (!op || ['done', 'failed', 'blocked'].includes(op.phase)) return;
    if (o.refundVerified) { this.finalize(id); return; }
    const p = this.providerFor(o);
    if (op.transactionId) { await this.retrieveRefund(id, op.transactionId); return; }
    if (op.startedAt !== undefined && this.expired(op.startedAt)) { this.review(id, 'refund_request_expired'); return; }
    if (!this.proof(o, -o.amount, this.holdKey(id, op))) {
      const out = this.adjust(o, -o.amount, this.holdKey(id, op));
      if (!out.ok) {
        this.update(id, v => { v.refund!.phase = 'blocked'; v.status = 'review'; v.manualReview = true; v.reviewCode = out.code === 'poor' ? 'insufficient_currency' : 'wallet_hold_rejected'; });
        return;
      }
    }
    this.update(id, v => { v.refund!.phase = 'held'; });
    if (this.d.orders[id].refund!.startedAt === undefined) this.update(id, v => { v.refund!.startedAt = this.now(); });
    // The intent is durable BEFORE an unknown provider side effect.
    this.update(id, v => { v.refund!.phase = 'unknown'; });
    o = this.d.orders[id]; op = o.refund!;
    let tx: ProviderTransaction;
    try {
      tx = await p.createRefund({ orderId: id, chargeId: o.transactionId!, amountMinor: o.priceMinor, currency: 'AED', reason: op.reason,
        idempotencyKey: `${id}:refund:${op.id}`, webhookUrl: `${this.base}/api/payments/webhook` });
    } catch { this.unknown(id, true); return; }
    try { this.check(tx, o, 'refund', tx.id); }
    catch { this.review(id, 'invalid_refund_response'); throw new PaymentsError('verification_failed', 409); }
    this.update(id, v => { v.refund!.transactionId = tx.id; v.refund!.phase = 'pending'; v.refundTransactionId = tx.id; v.refundStatus = tx.status; });
    await this.retrieveRefund(id, tx.id);
  }
  private async retrieveRefund(id: string, transactionId: string) {
    const p = this.providerFor(this.d.orders[id]);
    let tx: ProviderTransaction;
    try { tx = await p.retrieveRefund(transactionId); } catch { this.review(id, 'refund_lookup_unavailable'); return; }
    await this.applyRefund(id, tx, transactionId);
  }
  private async applyRefund(id: string, tx: ProviderTransaction, expectedId: string): Promise<boolean> {
    let o = this.d.orders[id];
    const p = this.providerFor(o);
    if (!tx || !token(tx.chargeId)) throw new PaymentsError('verification_failed', 409);
    let charge: ProviderTransaction;
    try { charge = await p.retrieveCharge(tx.chargeId); } catch { throw new PaymentsError('provider_unavailable', 502); }
    try {
      this.check(charge, o, 'charge', o.transactionId ?? tx.chargeId);
      if (charge.status !== 'CAPTURED') throw new PaymentsError('verification_failed', 409);
      // Binding an unknown-create charge is allowed only with exact original capture evidence.
      const bound = { ...o, transactionId: o.transactionId ?? tx.chargeId };
      this.check(tx, bound, 'refund', expectedId);
      if (charge.merchantId && tx.merchantId !== charge.merchantId) throw new PaymentsError('verification_failed', 409);
      if (o.refundVerified && o.refundTransactionId !== tx.id && tx.status === 'REFUNDED') throw new PaymentsError('verification_failed', 409);
    } catch { this.review(id, 'invalid_refund_verification'); throw new PaymentsError('verification_failed', 409); }
    const sanitized = (value: ProviderTransaction): Evidence => {
      const clean = { id: value.id, object: value.object, status: value.status, amountMinor: value.amountMinor, currency: 'AED' as const,
        liveMode: value.liveMode, orderId: id, ...(value.chargeId ? { chargeId: value.chargeId } : {}),
        ...(value.merchantId ? { merchantId: value.merchantId } : {}), created: value.created };
      return { ...clean, observedAt: this.now(), fingerprint: hash(JSON.stringify(clean)) };
    };
    const chargeEvidence = sanitized(charge), refundEvidence = sanitized(tx);
    const duplicate = o.evidence.some(e => e.fingerprint === refundEvidence.fingerprint);
    // Persist capture + refund/tombstone in ONE order commit. A crash must not expose an unrefunded capture to retry().
    this.update(id, v => {
      v.transactionId = charge.id; v.createUnknown = false;
      for (const e of [chargeEvidence, refundEvidence]) if (!v.evidence.some(old => old.fingerprint === e.fingerprint)) v.evidence.push(e);
      v.captureVerified = true;
      if (tx.status === 'REFUNDED') v.refundVerified = true;
      if (!v.refundVerified || tx.status === 'REFUNDED') { v.refundTransactionId = tx.id; v.refundStatus = tx.status; }
      if (v.refund && v.refund.startedAt !== undefined && !v.refund.transactionId && ['unknown', 'held', 'pending'].includes(v.refund.phase)) {
        v.refund.transactionId = tx.id;
        v.refund.phase = 'pending';
      }
    });
    o = this.d.orders[id];
    // Once completed, stale failure/pending evidence must not release a hold or undo a refund.
    if (o.refundVerified && tx.status !== 'REFUNDED') { this.finalize(id); return duplicate; }
    if (tx.status === 'REFUNDED') {
      this.finalize(id);
    } else if (FAILED.has(tx.status)) {
      const op = o.refund;
      if (op && op.transactionId === tx.id && this.proof(o, -o.amount, this.holdKey(id, op))) {
        const out = this.adjust(o, o.amount, this.releaseKey(id, op));
        if (!out.ok) { this.review(id, 'wallet_release_rejected'); return duplicate; }
        this.update(id, v => { v.refund!.released = true; v.refund!.phase = 'failed'; });
      }
      if (o.externalHoldId === tx.id && this.proof(o, -o.amount, this.externalKey(id, tx.id))) {
        const out = this.adjust(o, o.amount, `${this.externalKey(id, tx.id)}:release`);
        if (!out.ok) { this.review(id, 'wallet_release_rejected'); return duplicate; }
      }
      this.finalize(id);
    } else {
      this.update(id, v => { v.status = 'refund_pending'; if (v.refund?.transactionId === tx.id) v.refund.phase = 'pending'; });
      // A known dashboard refund pending after credit reserves currency too, without an overdraft.
      if (this.proof(o, o.amount, this.creditKey(id)) && !(o.refund && o.refund.transactionId === tx.id)) {
        const out = this.adjust(o, -o.amount, this.externalKey(id, tx.id));
        this.update(id, v => { v.externalHoldId = tx.id; if (!out.ok) { v.manualReview = true; v.reviewCode = 'external_refund_debt'; v.debt = v.amount; } });
      }
    }
    return duplicate;
  }
  adminOverview(query = '') {
    const mode = this.opts.mode;
    const all = Object.values(this.d.orders).filter(o => o.mode === mode);
    const paid = all.filter(o => o.captureVerified), refunded = all.filter(o => o.refundVerified);
    const sum = (rows: Order[]) => rows.reduce((n, o) => { const next = n + o.priceMinor; if (!Number.isSafeInteger(next)) throw new PaymentsError('totals_overflow', 503); return next; }, 0);
    const grossMinor = sum(paid), refundedMinor = sum(refunded);
    const q = typeof query === 'string' ? query.trim().toLowerCase().slice(0, 160) : '';
    return { totals: { grossMinor, refundedMinor, netMinor: grossMinor - refundedMinor, successful: paid.length,
      failed: all.filter(o => o.status === 'failed').length, pending: all.filter(o => ['pending', 'awaiting_payment', 'refund_pending', 'review'].includes(o.status)).length,
      currency: 'AED' as const, mode },
      list: all.filter(o => !q || [o.id, o.userId, o.packId, o.transactionId ?? ''].some(v => v.toLowerCase().includes(q)))
        .sort((a, b) => b.createdAt - a.createdAt).slice(0, 100).map(o => this.view(o)) };
  }
  /** Owner-authorized dashboard only: reads durable evidence, never activates/retrieves a provider.
   * One capture/refund per immutable order, even when multiple observations were retained.
   * observedAt is the first local verification time; charge.created is NOT a capture timestamp.
   */
  adminDashboard(at: number, start: number, priorStart: number) {
    if (![at, start, priorStart].every(nat) || priorStart > start || start > at) throw new PaymentsError('bad_period');
    const sum = (a: number, b: number) => {
      const next = a + b;
      if (!Number.isSafeInteger(next)) throw new PaymentsError('totals_overflow', 503);
      return next;
    };
    let grossMinor = 0, refundedMinor = 0, currentMinor = 0, previousMinor = 0;
    const amounts = { coins: 0, gems: 0 };
    const latest: { id: string; label: string; amountMinor: number; at: number; status: 'paid' | 'refunded'; currency: 'AED' }[] = [];
    for (const o of Object.values(this.d.orders)) {
      if (o.mode !== 'live' || o.currency !== 'AED' || !o.captureVerified) continue;
      const first = (object: 'charge' | 'refund', status: string) => {
        const times = o.evidence.filter(e => e.object === object && e.status === status && e.liveMode && e.currency === 'AED')
          .map(e => e.observedAt);
        return times.length ? Math.min(...times) : null;
      };
      const capturedAt = first('charge', 'CAPTURED');
      if (capturedAt === null || capturedAt > at) continue;
      grossMinor = sum(grossMinor, o.priceMinor);
      if (capturedAt >= start) { currentMinor = sum(currentMinor, o.priceMinor); amounts[o.cur] = sum(amounts[o.cur], o.priceMinor); }
      else if (capturedAt >= priorStart) previousMinor = sum(previousMinor, o.priceMinor);
      const refundedAt = o.refundVerified ? first('refund', 'REFUNDED') : null;
      const refunded = refundedAt !== null && refundedAt <= at;
      if (refunded) {
        refundedMinor = sum(refundedMinor, o.priceMinor);
        if (refundedAt >= start) currentMinor = sum(currentMinor, -o.priceMinor);
        else if (refundedAt >= priorStart) previousMinor = sum(previousMinor, -o.priceMinor);
      }
      latest.push({ id: o.id, label: o.cur === 'coins' ? 'باقة عملات' : 'باقة جواهر', amountMinor: o.priceMinor,
        at: refunded ? refundedAt : capturedAt, status: refunded ? 'refunded' : 'paid', currency: 'AED' });
    }
    return { grossMinor, refundedMinor, netMinor: sum(grossMinor, -refundedMinor), currentMinor, previousMinor,
      changePct: previousMinor > 0 ? (currentMinor - previousMinor) / previousMinor * 100 : null,
      distribution: [{ id: 'coins', label: 'باقات العملات', minor: amounts.coins }, { id: 'gems', label: 'باقات الجواهر', minor: amounts.gems }],
      latest: latest.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id)).slice(0, 6) };
  }
  /** Caller authorizes the owner. This is an explicit two-file saga, never a claim of cross-file atomicity. */
  configurePrices(actorId: string, key: string, reason: string, packPrices: unknown): { duplicate: boolean } {
    if (!token(actorId) || !text(key, 80) || !text(reason?.trim(), 500) || !isObj(packPrices)
      || !validEconomy({ v: 1, gemsToCoinsRate: null, coinToGemsEnabled: false, packPrices })
      || !Object.values(packPrices).every(p => p === null || (isObj(p) && p.currency === 'AED'))) throw new PaymentsError('bad_prices');
    if (!this.opts.file || !this.opts.economy.persistent) throw new PaymentsError('durable_storage_required', 503);
    const prices: Record<string, MoneyPrice | null> = {};
    for (const [id, p] of Object.entries(packPrices).sort(([a], [b]) => a.localeCompare(b))) {
      prices[id] = p === null ? null : { minorUnits: (p as MoneyPrice).minorUnits, currency: 'AED' };
    }
    const k = hash(JSON.stringify([actorId, key])), fingerprint = priceFingerprint(prices), prior = this.d.priceOps[k];
    if (prior) {
      if (prior.fingerprint !== fingerprint || prior.reason !== reason.trim()) throw new PaymentsError('idempotency_conflict', 409);
      if (prior.phase === 'done') return { duplicate: true };
      if (!this.pricePolicyMatches(prior)) {
        this.change(d => { d.priceOps[k].phase = 'review'; });
        throw new PaymentsError('price_configuration_review', 409);
      }
      this.completePrices(k); return { duplicate: true };
    }
    const op: PriceOp = { id: randomUUID(), keyHash: k, actorId, reason: reason.trim(), at: this.now(), fingerprint, prices, phase: 'intent' };
    this.change(d => { d.priceOps[k] = op; });
    this.opts.economy.update({ packPrices: prices });
    this.completePrices(k);
    return { duplicate: false };
  }
  private pricePolicyMatches(op: PriceOp): boolean {
    const view = this.opts.economy.view();
    const wanted = new Map(Object.entries(op.prices));
    return [...view.coinPacks, ...view.gemPacks].every(p => {
      const price = wanted.get(p.id);
      return p.priceMinor === (price?.minorUnits ?? null) && p.moneyCurrency === (price?.currency ?? null);
    });
  }
  private completePrices(k: string) {
    this.change(d => {
      const op = d.priceOps[k]; op.phase = 'done';
      if (!d.audit.some(row => row.id === op.id)) d.audit.push({ id: op.id, orderId: op.id, actorId: op.actorId, action: 'price.configured', reason: op.reason, at: op.at });
    });
  }
  audit() { return this.d.audit.map(({ keyHash: _privateKey, ...row }) => structuredClone(row)); }
  /** Unpaid checkouts are not unsaved financial obligations. Debt/review remains visible but never triggers overdraft. */
  pendingCount(): number {
    return Object.values(this.d.orders).filter(o =>
      (o.captureVerified && !o.refundVerified && !o.credited && !o.refundTransactionId)
      || (o.refundVerified && !o.refunded)
      || (o.refund && ['reserving', 'held', 'unknown'].includes(o.refund.phase))
      || (this.opts.notify && ((o.credited && !o.refunded && !o.notified.includes('paid')) || (o.refunded && !o.notified.includes('refunded'))))).length
      + Object.values(this.d.priceOps).filter(op => op.phase === 'intent').length;
  }
  async waitForIdle(): Promise<void> {
    while (this.locks.size) await Promise.allSettled([...this.locks.values()]);
  }
  async retry(): Promise<void> {
    this.disk.retry();
    for (const [k, op] of Object.entries(this.d.priceOps)) {
      if (op.phase !== 'intent') continue;
      try {
        if (this.pricePolicyMatches(op)) this.completePrices(k);
        else this.change(d => { d.priceOps[k].phase = 'review'; });
      } catch { /* Keep the durable intent; no price overwrite on recovery. */ }
    }
    if (this.opts.complimentaryPurchases) return; // Preserve old money orders without provider requests or new settlement.
    const work: Promise<unknown>[] = [];
    const eligible = Object.values(this.d.orders).filter(o => (!o.captureVerified && o.status !== 'failed'
      && !(o.status === 'cancelled' && FAILED.has(o.evidence.filter(e => e.object === 'charge').at(-1)?.status ?? '')))
      || (o.refundVerified && !o.refunded)
      || (o.refund && ['reserving', 'held', 'unknown', 'pending'].includes(o.refund.phase))
      || (o.refundTransactionId && !o.refundVerified && o.refundStatus && !FAILED.has(o.refundStatus))
      || (o.captureVerified && !o.refundVerified && !o.credited)
      || (this.opts.notify && ((o.credited && !o.refunded && !o.notified.includes('paid')) || (o.refunded && !o.notified.includes('refunded')))));
    const start = eligible.length ? this.retryCursor % eligible.length : 0;
    const batch = [...eligible.slice(start), ...eligible.slice(0, start)].slice(0, 50);
    this.retryCursor = start + batch.length;
    for (const { id } of batch) {
      if (this.locks.has(id)) continue;
      work.push(this.lock(id, async () => {
        this.finalize(id);
        let o = this.d.orders[id];
        if (!this.status().enabled || this.opts.provider?.name !== o.provider || this.opts.provider.mode !== o.mode) return;
        if (o.refund && !['done', 'blocked', 'failed'].includes(o.refund.phase)) {
          await this.resumeRefund(id);
        } else if (o.refundTransactionId && !o.refundVerified && o.refundStatus && !FAILED.has(o.refundStatus)) await this.retrieveRefund(id, o.refundTransactionId);
        o = this.d.orders[id];
        if (!o.captureVerified && !o.refundVerified) {
          if (o.transactionId) await this.retrieveCharge(id);
          else await this.createCharge(id);
        }
        this.finalize(id);
      }).catch(() => undefined)); // Storage monitor and persisted review codes expose failures, not raw provider errors.
    }
    await Promise.all(work);
  }
  unsaved(): boolean { return this.disk.unsaved; }
}
