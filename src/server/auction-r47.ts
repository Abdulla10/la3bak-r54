import type { Cur, ShopItemRef, Wallet } from './wallet.js';

export const AUCTION_R47_LIMITS = Object.freeze({ lots: 512, active: 100, receipts: 20_000, history: 64, page: 100 });
export type AuctionStatusR47 = 'open' | 'settled' | 'cancelled' | 'refunded' | 'expired';
export interface AuctionItemR47 extends ShopItemRef {
  active: boolean; status: string; proposalOnly?: boolean; priceApproved?: boolean; kids?: boolean; name?: string;
}
/** Synchronous, read-only CURRENT server authorities; never use browser flags, prices, ranks or identity. */
export interface AuctionGuardsR47 {
  item(id: string): AuctionItemR47 | undefined;
  isAdmin(actor: string): boolean;
  canBid(actor: string, item: AuctionItemR47): boolean;
}
export type AuctionRequestR47 =
  | { op: 'create'; actor: string; itemId: string; durationMinutes: number }
  | { op: 'bid'; actor: string; lotId: string; amount: number }
  | { op: 'cancel' | 'settle'; actor: string; lotId: string };
export type AuctionErrorR47 = { ok: false; code: 'bad' | 'conflict' | 'forbidden' | 'ineligible' | 'owned' | 'missing' | 'poor' | 'low' | 'ended' | 'terminal' | 'early' | 'capacity' | 'unavailable' | 'unconfigured' | 'overflow' };
export interface AuctionReceiptR47 { ok: true; dup: boolean; lotId: string; receiptId: string; op: AuctionRequestR47['op']; status: AuctionStatusR47; amount?: number; sequence?: number }
export type AuctionResultR47 = AuctionReceiptR47 | AuctionErrorR47;
export interface AuctionBidR47 { id: string; actor: string; amount: number; at: number; sequence: number }
export interface AuctionCloseR47 { id: string; at: number; reason: 'winner' | 'no_bids' | 'cancelled' | 'unavailable' | 'ineligible' | 'owned'; paid: number; winner?: string }
export interface AuctionLotR47 {
  id: string; createdBy: string; item: ShopItemRef; createdAt: number; endsAt: number; status: AuctionStatusR47;
  escrow: number; bidCount: number; history: AuctionBidR47[]; highest?: AuctionBidR47; close?: AuctionCloseR47;
}
export interface AuctionProofR47 { fingerprint: string; request: AuctionRequestR47; result: AuctionReceiptR47 }
export interface AuctionStateR47 { v: 1; lots: Record<string, AuctionLotR47>; ops: Record<string, AuctionProofR47> }
/** Public projection: no account IDs, request keys, other balances, or historical bidders. */
export interface AuctionViewR47 {
  id: string; itemId: string; currency: Cur; reservePrice: number; highestAmount: number | null;
  minimumBid: number | null; createdAt: number; endsAt: number; status: AuctionStatusR47; bidCount: number;
  mine: boolean; held: number; won: boolean; closeReason: AuctionCloseR47['reason'] | null;
}
const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const nat = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const text = (v: unknown, max = 160): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && v.trim() === v && !/[\x00-\x1f\x7f]/.test(v) && !['__proto__', 'constructor', 'prototype'].includes(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const keys = (v: Record<string, unknown>, ks: string[]) => Object.keys(v).length === ks.length && ks.every(k => Object.hasOwn(v, k));
export function approvedAuctionItemR47(v: unknown): v is AuctionItemR47 {
  return obj(v) && text(v.id, 64) && ['frame', 'bg', 'title', 'badge', 'avatar', 'entrance'].includes(v.slot)
    && v.permanent === true && v.active === true && v.status === 'available' && v.proposalOnly !== true && v.priceApproved !== false && v.kids !== true
    && (v.currency === 'coins' || v.currency === 'gems') && nat(v.price) && v.price <= (v.currency === 'coins' ? 1_000_000 : 100_000);
}
export function validAuctionRequestR47(v: unknown): v is AuctionRequestR47 {
  if (!obj(v) || !text(v.actor)) return false;
  if (v.op === 'create') return keys(v, ['op', 'actor', 'itemId', 'durationMinutes']) && text(v.itemId, 64) && nat(v.durationMinutes) && v.durationMinutes >= 1 && v.durationMinutes <= 60;
  if (v.op === 'bid') return keys(v, ['op', 'actor', 'lotId', 'amount']) && uuid(v.lotId) && nat(v.amount) && v.amount > 0;
  return (v.op === 'cancel' || v.op === 'settle') && keys(v, ['op', 'actor', 'lotId']) && uuid(v.lotId);
}
export function auctionFingerprintR47(r: AuctionRequestR47): string {
  return JSON.stringify(r.op === 'create' ? [r.op, r.actor, r.itemId, r.durationMinutes] : r.op === 'bid' ? [r.op, r.actor, r.lotId, r.amount] : [r.op, r.actor, r.lotId]);
}
export const auctionKeyR47 = (actor: string, key: string) => JSON.stringify([actor, key]);
export const validAuctionKeyR47 = (actor: unknown, key: unknown): boolean => text(actor) && text(key, 80);
export function auctionViewR47(lot: AuctionLotR47, viewer: string): AuctionViewR47 {
  const next = lot.highest ? lot.highest.amount + 1 : Math.max(1, lot.item.price);
  return { id: lot.id, itemId: lot.item.id, currency: lot.item.currency, reservePrice: lot.item.price,
    highestAmount: lot.highest?.amount ?? null, minimumBid: lot.status === 'open' && Number.isSafeInteger(next) ? next : null,
    createdAt: lot.createdAt, endsAt: lot.endsAt, status: lot.status, bidCount: lot.bidCount,
    mine: lot.highest?.actor === viewer, held: lot.highest?.actor === viewer ? lot.escrow : 0,
    won: lot.close?.winner === viewer, closeReason: lot.close?.reason ?? null };
}
/** Backward compatible when absent; strict relational proof when present. Never silently reset corrupt escrow. */
export function validAuctionWalletR47(d: Record<string, any>): boolean {
  if (d.auctionR47 === undefined) return true;
  const s = d.auctionR47;
  if (!obj(s) || !keys(s, ['v', 'lots', 'ops']) || s.v !== 1 || !obj(s.lots) || !obj(s.ops)
    || Object.keys(s.lots).length > AUCTION_R47_LIMITS.lots || Object.keys(s.ops).length > AUCTION_R47_LIMITS.receipts) return false;
  const accounts = d.acc ?? {}, creates = new Map<string, AuctionProofR47>(), bids = new Map<string, AuctionProofR47[]>();
  const statuses = ['open', 'settled', 'cancelled', 'refunded', 'expired'];
  for (const [key, p] of Object.entries(s.ops) as [string, any][]) {
    if (!obj(p) || !keys(p, ['fingerprint', 'request', 'result']) || !validAuctionRequestR47(p.request) || p.fingerprint !== auctionFingerprintR47(p.request)
      || !obj(p.result) || !Object.hasOwn(accounts, p.request.actor)) return false;
    let tuple: any; try { tuple = JSON.parse(key); } catch { return false; }
    if (!Array.isArray(tuple) || tuple.length !== 2 || tuple[0] !== p.request.actor || !validAuctionKeyR47(tuple[0], tuple[1]) || key !== JSON.stringify(tuple)) return false;
    const r = p.result, req = p.request;
    if (!keys(r, ['ok', 'dup', 'lotId', 'receiptId', 'op', 'status', ...(req.op === 'bid' ? ['amount', 'sequence'] : [])]) || r.ok !== true || r.dup !== false
      || r.op !== req.op || !uuid(r.lotId) || !uuid(r.receiptId) || !statuses.includes(r.status) || !s.lots[r.lotId]
      || (req.op !== 'create' && r.lotId !== req.lotId)) return false;
    if (req.op === 'create') {
      if (r.lotId !== r.receiptId || r.status !== 'open' || creates.has(r.lotId)) return false;
      creates.set(r.lotId, p as AuctionProofR47);
    } else if (req.op === 'bid') {
      if (r.amount !== req.amount || !nat(r.sequence) || r.sequence < 1 || r.status !== 'open') return false;
      const rows = bids.get(r.lotId) ?? []; rows.push(p as AuctionProofR47); bids.set(r.lotId, rows);
    } else if (!s.lots[r.lotId].close || r.receiptId !== s.lots[r.lotId].close.id || r.status !== s.lots[r.lotId].status || (req.op === 'cancel' && r.status !== 'cancelled')) return false;
  }
  let active = 0;
  const held = new Map<string, number>(), globalIds = new Set<string>();
  const unique = (id: string) => { if (globalIds.has(id)) return false; globalIds.add(id); return true; };
  for (const [id, lot] of Object.entries(s.lots) as [string, any][]) {
    if (!obj(lot) || !keys(lot, ['id', 'createdBy', 'item', 'createdAt', 'endsAt', 'status', 'escrow', 'bidCount', 'history', ...(lot.highest === undefined ? [] : ['highest']), ...(lot.close === undefined ? [] : ['close'])])
      || id !== lot.id || !uuid(id) || !unique(id) || !text(lot.createdBy) || !Object.hasOwn(accounts, lot.createdBy)
      || !obj(lot.item) || !keys(lot.item, ['id', 'slot', 'price', 'currency', 'permanent']) || !approvedAuctionItemR47({ ...lot.item, active: true, status: 'available' })
      || !nat(lot.createdAt) || !nat(lot.endsAt) || lot.endsAt - lot.createdAt < 60_000 || lot.endsAt - lot.createdAt > 3_600_000 || (lot.endsAt - lot.createdAt) % 60_000
      || !statuses.includes(lot.status) || !nat(lot.escrow) || !nat(lot.bidCount) || !Array.isArray(lot.history) || lot.history.length > AUCTION_R47_LIMITS.history) return false;
    const create = creates.get(id);
    if (!create || create.request.op !== 'create' || create.request.actor !== lot.createdBy || create.request.itemId !== lot.item.id || create.request.durationMinutes * 60_000 !== lot.endsAt - lot.createdAt) return false;
    const proofs = (bids.get(id) ?? []).sort((a, b) => a.result.sequence! - b.result.sequence!);
    if (proofs.length !== lot.bidCount || lot.history.length !== Math.min(lot.bidCount, AUCTION_R47_LIMITS.history)) return false;
    const rows: AuctionBidR47[] = [];
    for (const [i, proof] of proofs.entries()) {
      const r = proof.result, req = proof.request;
      if (req.op !== 'bid' || r.sequence !== i + 1 || !unique(r.receiptId) || req.actor === lot.createdBy || r.amount! < (i ? proofs[i - 1].result.amount! + 1 : Math.max(1, lot.item.price))) return false;
      const source = accounts[req.actor]?.ledger ?? [];
      const debits = source.filter((l: any) => l.ref === `auction:${id}:bid:${r.receiptId}`);
      if (debits.length !== 1 || debits[0].cur !== lot.item.currency || debits[0].kind !== 'transfer' || debits[0].delta !== -req.amount
        || debits[0].ts < lot.createdAt || debits[0].ts >= lot.endsAt || (i && debits[0].ts < rows[i - 1].at)) return false;
      rows.push({ id: r.receiptId, actor: req.actor, amount: req.amount, at: debits[0].ts, sequence: i + 1 });
      const refunds = source.filter((l: any) => l.ref === `auction:${id}:refund:${r.receiptId}`);
      const refunded = i < proofs.length - 1 || (lot.status !== 'open' && lot.status !== 'settled');
      if (refunded ? refunds.length !== 1 || refunds[0].kind !== 'refund' || refunds[0].cur !== lot.item.currency || refunds[0].delta !== req.amount || refunds[0].ts < debits[0].ts : refunds.length !== 0) return false;
    }
    if (JSON.stringify(lot.history) !== JSON.stringify(rows.slice(-AUCTION_R47_LIMITS.history)) || JSON.stringify(lot.highest) !== JSON.stringify(rows.at(-1))) return false;
    if (lot.status === 'open') {
      active++;
      if (lot.close !== undefined || lot.escrow !== (lot.highest?.amount ?? 0)) return false;
      if (lot.highest) { const k = auctionKeyR47(lot.highest.actor, lot.item.currency); held.set(k, (held.get(k) ?? 0) + lot.escrow); }
    } else {
      const c = lot.close;
      if (lot.escrow !== 0 || !obj(c) || !keys(c, ['id', 'at', 'reason', 'paid', ...(c.winner === undefined ? [] : ['winner'])]) || !uuid(c.id) || !unique(c.id) || !nat(c.at) || c.at < lot.createdAt || !nat(c.paid)
        || (lot.status === 'cancelled' ? c.reason !== 'cancelled' || c.at >= lot.endsAt : c.at < lot.endsAt)) return false;
      if (lot.status === 'settled') {
        if (c.reason !== 'winner' || !lot.highest || c.winner !== lot.highest.actor || c.paid !== lot.highest.amount || !(accounts[c.winner]?.owned ?? []).includes(lot.item.id)) return false;
        const ledger = accounts[c.winner].ledger ?? [];
        if (ledger.filter((l: any) => l.ref === `auction:${id}:settle:${c.id}` && l.cur === lot.item.currency && l.kind === 'purchase' && l.delta === 0 && l.ts === c.at).length !== 1) return false;
      } else if (c.winner !== undefined || c.paid !== 0 || (lot.status === 'expired' ? c.reason !== 'no_bids' || lot.highest !== undefined : lot.status === 'refunded' && (!lot.highest || !['unavailable', 'ineligible', 'owned'].includes(c.reason)))) return false;
    }
  }
  if (active > AUCTION_R47_LIMITS.active) return false;
  for (const [key, amount] of held) {
    const [actor, cur] = JSON.parse(key);
    if (!nat(amount) || !nat((accounts[actor]?.[cur] ?? 0) + amount)) return false;
  }
  return true;
}

/** Adapter only: no balance/escrow state, no HTTP listener, no alternate auth. */
export class AuctionR47 {
  constructor(readonly wallet: Wallet, guards: AuctionGuardsR47) { wallet.configureAuctionsR47(guards); }
  list(actor: string, offset = 0, limit = 30) { return this.wallet.listAuctionsR47(actor, offset, limit); }
  view(actor: string, lotId: string) { return this.wallet.auctionViewR47(actor, lotId); }
  create(actor: string, itemId: string, key: string, durationMinutes = 5) { return this.wallet.createAuctionR47(actor, itemId, key, durationMinutes); }
  bid(actor: string, lotId: string, amount: number, key: string) { return this.wallet.bidAuctionR47(actor, lotId, amount, key); }
  cancel(actor: string, lotId: string, key: string) { return this.wallet.cancelAuctionR47(actor, lotId, key); }
  settle(actor: string, lotId: string, key: string) { return this.wallet.settleAuctionR47(actor, lotId, key); }
}
