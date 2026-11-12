import { randomUUID } from 'node:crypto';
import { splitGift, type GiftRec } from './gifts.js';
import { GIFT_REWARD_POLICY, quoteGiftRewards } from './gift-rewards.js';
import { MANUAL_CONVERSION_DISABLED } from './economy.js';
import { loadJsonFile, Persister, StorageMonitor, StorageError, isObj } from './datafile.js';
import { canonicalGiftBatchTargets, quoteGiftBatch, GIFT_BATCH_QUANTITY_MAX, type GiftBatchOffer, type GiftBatchOptions, type GiftBatchProof, type GiftBatchReceipt, type GiftBatchRequest, type GiftBatchResult } from './social-gift-batch-r27.js';
import { AUCTION_R47_LIMITS, approvedAuctionItemR47, auctionFingerprintR47, auctionKeyR47, auctionViewR47, validAuctionKeyR47, validAuctionRequestR47, validAuctionWalletR47, type AuctionGuardsR47, type AuctionStateR47, type AuctionLotR47, type AuctionRequestR47, type AuctionResultR47, type AuctionReceiptR47, type AuctionErrorR47, type AuctionCloseR47 } from './auction-r47.js';
export type TxKind = 'start' | 'daily' | 'entry_fee' | 'prize' | 'refund' | 'purchase' | 'reward' | 'admin' | 'gift';
export type TxHook = (id: string, kind: TxKind, delta: number, balance: number, ref: string) => void;
export type Cur = 'coins' | 'gems';
/** سجل مالي موحّد (عملات وجواهر): معرّف فريد، العملة، المقدار، السبب، الرصيد قبل وبعد، التاريخ، ومعرّف المباراة/المنتج في ref */
export interface LedgerEntry { id: string; ts: number; cur: Cur; kind: TxKind | 'transfer'; delta: number; before: number; after: number; reason: string; ref: string; giftTx?: string }
/** سقف سعر أي عنصر بالمتجر لكل عملة: مصدر واحد يُستخدم عند الإنشاء والتعديل وعند تنفيذ الشراء */
export const PRICE_MAX: Record<Cur, number> = { coins: 1_000_000, gems: 100_000 };
/** R58b: سقف أسعار عناصر المتجر فقط (أيديات مميزة بـ45 مليون وفوق، إطارات وسيارات فخمة).
 * الهدايا والحقائب والعضويات تبقى على PRICE_MAX كما هي. */
export const SHOP_PRICE_MAX: Record<Cur, number> = { coins: 1_000_000, gems: 1_000_000_000 };
export interface ShopItemRef { id: string; slot: string; price: number; currency: Cur; permanent: boolean }
export type BuyResult = { ok: true; dup: boolean; coins: number; gems: number } | { ok: false; code: 'owned' | 'poor' | 'bad' | typeof MANUAL_CONVERSION_DISABLED };
export type BuyKind = 'item' | 'gems' | 'conversion';
/** Server-resolved approved offer only; never accept browser-supplied prices or identity. */
export type LuckyBagOffer = { type: 'coins'; perRecipient: number }
  | { type: 'item'; id: string; slot: string; price: number; currency: 'gems'; permanent: true; available: true }
  | { type: 'gift'; id: string; name: string; icon: string; price: number; currency: 'gems'; active: true };
export type LuckyBagError = { ok: false; code: 'bad' | 'conflict' | 'noto' | 'poor' | 'self' | 'early' | 'expired' | 'full' | 'claimed' | 'owned' | 'ineligible' | 'overflow' | 'empty' | 'missing' };
export interface LuckyBagCreateReceipt { ok: true; dup: boolean; bagId: string; coins: number; gems: number }
export interface LuckyBagClaimReceipt extends LuckyBagCreateReceipt { claimId: string; type: LuckyBagOffer['type']; amount: number; cur: Cur; itemId?: string; creditId?: string }
export interface PrepaidGiftRec extends GiftRec { cur: 'gems'; prepaid: true; creditId: string }
export interface PrepaidGiftRedeemReceipt { ok: true; dup: boolean; creditId: string; coins: number; gems: number; toGems: number; toCoins?: number; rec: PrepaidGiftRec }
export interface RoomRewardReceipt { ok: true; dup: boolean; rewardId: string; coins: number; gems: number; toGems: number }
export type RoomRewardResult = RoomRewardReceipt | LuckyBagError;
export type LuckyBagCreateResult = LuckyBagCreateReceipt | LuckyBagError;
export type LuckyBagClaimResult = LuckyBagClaimReceipt | LuckyBagError;
export type PrepaidGiftRedeemResult = PrepaidGiftRedeemReceipt | LuckyBagError;
export interface PrepaidGiftCredit { id: string; bagId: string; gift: { id: string; name: string; icon: string; price: number }; qty: 1; remaining: 0 | 1; value: number }
interface LuckyClaim { id: string; recipient: string; at: number; creditId?: string }
interface LuckyBag { id: string; senderId: string; room: string; offer: LuckyBagOffer; count: number; total: number; reserve: number; createdAt: number; opensAt: number; expiresAt: number; claims: LuckyClaim[]; refund?: { id: string; at: number; amount: number } }
export interface LuckyBagView { id: string; senderId: string; room: string; offer: LuckyBagOffer; count: number; total: number; reserve: number; createdAt: number; opensAt: number; expiresAt: number; remaining: number; claimed: boolean; status: 'scheduled' | 'open' | 'full' | 'expired'; refunded: number }
type LuckyRequest = { op: 'create'; actor: string; room: string; offer: LuckyBagOffer; count: number; delay: 0 | 300 }
  | { op: 'claim'; actor: string; bagId: string }
  | { op: 'redeem'; actor: string; to: string; creditId: string; fromName: string; toName: string; room: string }
  | { op: 'roomReward'; actor: string; to: string; amount: number; room: string };
interface LuckyOp { fingerprint: string; request: LuckyRequest; result: LuckyBagCreateReceipt | LuckyBagClaimReceipt | PrepaidGiftRedeemReceipt | RoomRewardReceipt }
type BuyOp = { kind: 'item'; itemId: string; cur: Cur; price: number }
  | { kind: 'gems'; itemId: string; coins: number; gems: number }
  | { kind: 'conversion'; itemId: string; gems: number; rate: number; coins: number };
export type ManualConversionReceipt = Extract<BuyOp, { kind: 'gems' | 'conversion' }>;
export type ManualConversionResult = { ok: true; dup: true; coins: number; gems: number; receipt: ManualConversionReceipt }
  | { ok: false; code: 'bad' | typeof MANUAL_CONVERSION_DISABLED };
export const START_COINS = 1000;
/** Historical coin→gem offers, retained for receipt identification only; new conversions are closed. */
export const GEM_PACKS = [{ id: 'gems-10', gems: 10, coins: 1_000 }, { id: 'gems-50', gems: 50, coins: 5_000 }, { id: 'gems-100', gems: 100, coins: 10_000 }, { id: 'gems-500', gems: 500, coins: 50_000 }] as const;
export const DAILY_COINS = 200;
export const STAKES: number[] = [0, 100, 500];
/** R68y: الإدارة تغيّر الرسوم بدون إعادة تشغيل (نفس المصفوفة حتى تشوفها كل الأماكن) */
export function setStakes(list: readonly number[]): void { STAKES.splice(0, STAKES.length, ...list); }
const GULF = 4 * 3600_000;
const dayOf = (t: number) => new Date(t + GULF).toISOString().slice(0, 10);
/** الحقول الاختيارية (جواهر، ملكية، مجهّز، مكافآت، سجل) تُكمَّل للحسابات القديمة بدون مسح شيء */
interface Acc { coins: number; daily?: string; gems?: number; owned?: string[]; equipped?: Record<string, string>; claimed?: string[]; ledger?: LedgerEntry[]; gifts?: GiftRec[]; gSent?: number; gRecv?: number; prepaidGifts?: Record<string, PrepaidGiftCredit>; exp?: Record<string, number> }
interface AdmOp { id: string; cur: Cur; delta: number; before: number; after: number; at: number }
interface GiftKey { to: string; gift: string; rid: string; qty?: number; room?: string; rec?: GiftRec }
/** Separate virtual house balance: legacy shares in original currency; R13 consumes full gem cost. */
interface HouseEntry { id: string; ts: number; kind: 'gift_share'; delta: number; after: number; tx: string; from: string; to: string; gift: string; qty: number; total: number; room: string; cur?: Cur; rewardPolicy?: string }
interface House { coins: number; gems?: number; count: number; ledger: HouseEntry[] }
export interface BulkRewardCurrency { type: 'currency'; cur: Cur; amount: number }
export interface BulkRewardItem { type: 'item'; itemId: string; mode: 'grant' | 'purchase'; price?: number; currency?: Cur }
export type BulkReward = BulkRewardCurrency | BulkRewardItem;
export interface BulkGrantResult { ok: true; duplicate: boolean; operationId: string; total: number; succeeded: number; failed: number; failures: { id: string; code: string }[] }
export interface GrantBundle { coins: number; gems: number; itemIds: string[] }
export interface CampaignGrantResult { id: string; status: 'granted' | 'duplicate' | 'failed'; code?: 'BALANCE_OVERFLOW'; addedItems?: string[]; alreadyOwned?: string[] }
export interface CampaignGrantReceipt { addedItems: string[]; alreadyOwned: string[] }
interface CampaignGrant { fingerprint: string; receipts: Record<string, CampaignGrantReceipt> }
interface Data { acc: Record<string, Acc>; settled: string[]; auctionR47?: AuctionStateR47; bulkOps?: Record<string, BulkGrantResult>; campaignGrants?: Record<string, CampaignGrant>; buys?: Record<string, string>; buyOps?: Record<string, BuyOp>; admOps?: Record<string, AdmOp>; giftKeys?: Record<string, GiftKey>; giftBatches?: Record<string, GiftBatchProof>; house?: House; giftStats?: Record<string, number>; luckyBags?: Record<string, LuckyBag>; luckyOps?: Record<string, LuckyOp> }
const HOUSE_LEDGER_CAP = 5000;
const GIFTS_CAP = 300;
/** مفاتيح العمليات المالية أدلة دائمة، وليست كاش عرض؛ لا تُحذف عند تجاوز عدد ثابت. */
export const GIFT_GEMS_MAX = 1_000_000;
export type GiftSendResult = { ok: true; dup: boolean; coins: number; gems: number; toCoins: number; toGems: number; rec: GiftRec } | { ok: false; code: 'self' | 'noto' | 'poor' | 'bad' };
const nat = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const pos = (v: unknown): v is number => nat(v) && v > 0;
const signed = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const str = (v: unknown): v is string => typeof v === 'string';
const currency = (v: unknown): v is Cur => v === 'coins' || v === 'gems';
const optional = (v: unknown, check: (x: unknown) => boolean) => v === undefined || check(v);
const array = (v: unknown, check: (x: unknown) => boolean) => Array.isArray(v) && v.every(check);
const record = (v: unknown, check: (x: unknown) => boolean) => isObj(v) && Object.values(v).every(check);
const strs = (v: unknown) => array(v, str);
const fields = (v: Record<string, unknown>, keys: string[], check: (x: unknown) => boolean) => keys.every((k) => check(v[k]));
const arithmetic = (v: Record<string, unknown>) => nat(v.before) && nat(v.after) && signed(v.delta) && Number.isSafeInteger(v.before + v.delta) && v.before + v.delta === v.after;
const validLedger = (v: unknown) => isObj(v) && fields(v, ['id', 'reason', 'ref'], str) && nat(v.ts) && currency(v.cur)
  && ['start', 'daily', 'entry_fee', 'prize', 'refund', 'purchase', 'reward', 'admin', 'gift', 'transfer'].includes(String(v.kind)) && arithmetic(v) && optional(v.giftTx, str);
const validGift = (v: unknown): v is GiftRec => {
  if (!isObj(v) || !fields(v, ['id', 'from', 'fromName', 'to', 'toName', 'gift', 'name', 'icon'], str)
    || !nat(v.ts) || !pos(v.price) || (v.dir !== 'in' && v.dir !== 'out') || !optional(v.qty, pos)
    || !['total', 'recv', 'house'].every((k) => optional(v[k], nat)) || !optional(v.room, str) || !optional(v.status, (x) => x === 'done')
    || !optional(v.cur, currency) || !optional(v.prepaid, (x) => x === true) || !optional(v.creditId, str)
    || (v.prepaid === undefined ? v.creditId !== undefined : v.cur !== 'gems' || v.qty !== 1 || !str(v.creditId))) return false;
  if (v.rewardPolicy !== undefined) {
    const q = quoteGiftRewards(v.price, (v.qty ?? 1) as number);
    return !!q && v.rewardPolicy === q.policy && v.cur === q.cur && v.rewardCur === q.rewardCur && v.qty !== undefined && v.status === 'done'
      && v.from !== v.to && v.total === q.total && v.recv === q.recv && v.senderBonus === q.senderBonus && v.house === q.house
      && v.price <= (v.prepaid ? PRICE_MAX.gems : GIFT_GEMS_MAX) && q.total <= (v.prepaid ? PRICE_MAX.gems : GIFT_GEMS_MAX);
  }
  // Absence of a policy is historical, never infer or stamp R13 from the currency.
  const total = v.price * ((v.qty ?? 1) as number), old = splitGift(total);
  return pos(total) && v.rewardCur === undefined && v.senderBonus === undefined
    && (v.total === undefined || v.total === total) && (v.recv === undefined || v.recv === old.recv) && (v.house === undefined || v.house === old.house)
    && (v.prepaid === undefined || v.total === total && v.recv === old.recv && v.house === old.house);
};
const validAcc = (v: unknown) => isObj(v) && nat(v.coins) && optional(v.gems, nat) && optional(v.daily, str)
  && optional(v.owned, strs) && optional(v.claimed, strs) && optional(v.equipped, (x) => record(x, str))
  && optional(v.ledger, (x) => array(x, validLedger)) && optional(v.gifts, (x) => array(x, validGift)) && optional(v.gSent, nat) && optional(v.gRecv, nat)
  && optional(v.prepaidGifts, (x) => record(x, validCredit)) && optional(v.exp, (x) => record(x, nat));
const validBuyOp = (v: unknown) => {
  if (!isObj(v) || !str(v.itemId)) return false;
  if (v.kind === 'item') return currency(v.cur) && nat(v.price) && v.price <= SHOP_PRICE_MAX[v.cur];
  if (v.kind === 'gems') return pos(v.coins) && pos(v.gems);
  return v.kind === 'conversion' && pos(v.gems) && pos(v.rate) && pos(v.coins) && Number.isSafeInteger(v.gems * v.rate)
    && v.coins === v.gems * v.rate && v.itemId === JSON.stringify([v.gems, v.rate]);
};
const validAdm = (v: unknown) => isObj(v) && str(v.id) && currency(v.cur) && nat(v.at) && arithmetic(v);
const validGiftKey = (v: unknown) => isObj(v) && fields(v, ['to', 'gift', 'rid'], str) && optional(v.qty, pos) && optional(v.room, str)
  && (v.rec === undefined || validGift(v.rec) && v.rec.dir === 'out' && v.rec.prepaid === undefined && v.rec.id === v.rid && v.rec.to === v.to
    && v.rec.gift === v.gift && (v.rec.qty ?? 1) === (v.qty ?? 1) && (v.rec.room ?? '') === (v.room ?? ''));
const validHouseEntry = (v: unknown) => isObj(v) && fields(v, ['id', 'tx', 'from', 'to', 'gift', 'room'], str)
  && v.kind === 'gift_share' && fields(v, ['ts', 'delta', 'after', 'total'], nat) && pos(v.qty) && (v.delta as number) <= (v.after as number) && optional(v.cur, currency)
  && (v.rewardPolicy === undefined || v.rewardPolicy === GIFT_REWARD_POLICY.id && v.cur === 'gems' && v.delta === v.total);
const validHouse = (v: unknown) => isObj(v) && nat(v.coins) && optional(v.gems, nat) && nat(v.count) && array(v.ledger, validHouseEntry);
const uuid = (v: unknown): v is string => str(v) && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const fingerprint = (v: unknown): v is string => str(v) && /^[0-9a-f]{64}$/.test(v);
const itemId = (v: unknown): v is string => str(v) && v.length <= 64 && v.trim().length > 0;
const itemIds = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 30 && Array.from(v).every(itemId) && new Set(v).size === v.length;
const exactKeys = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));
const validCampaignReceipt = (v: unknown) => isObj(v) && exactKeys(v, ['addedItems', 'alreadyOwned'])
  && itemIds(v.addedItems) && itemIds(v.alreadyOwned) && itemIds([...v.addedItems, ...v.alreadyOwned]);
const validCampaignGrants = (v: unknown) => isObj(v) && Object.entries(v).every(([id, campaign]) => uuid(id) && isObj(campaign)
  && exactKeys(campaign, ['fingerprint', 'receipts']) && fingerprint(campaign.fingerprint) && isObj(campaign.receipts)
  && Object.entries(campaign.receipts).every(([recipient, receipt]) => uuid(recipient) && validCampaignReceipt(receipt)));
const internalId = (v: unknown): v is string => str(v) && v.length > 0 && v.length <= 160;
const bagUnit = (offer: LuckyBagOffer) => offer.type === 'coins' ? offer.perRecipient : offer.price;
const bagCur = (offer: LuckyBagOffer): Cur => offer.type === 'coins' ? 'coins' : 'gems';
const validOffer = (v: unknown): v is LuckyBagOffer => {
  if (!isObj(v)) return false;
  if (v.type === 'coins') return exactKeys(v, ['type', 'perRecipient']) && pos(v.perRecipient) && v.perRecipient <= PRICE_MAX.coins;
  if (!itemId(v.id) || !pos(v.price) || v.price > PRICE_MAX.gems || v.currency !== 'gems') return false;
  if (v.type === 'item') return exactKeys(v, ['type', 'id', 'slot', 'price', 'currency', 'permanent', 'available']) && itemId(v.slot) && v.permanent === true && v.available === true;
  return v.type === 'gift' && exactKeys(v, ['type', 'id', 'name', 'icon', 'price', 'currency', 'active']) && str(v.name) && !!v.name && v.name.length <= 200 && str(v.icon) && v.icon.length <= 200 && v.active === true;
};
/** Exact canonical tuple, not a truncated hash or delimiter join; all validated numeric inputs are integers. */
const luckyFingerprint = (r: LuckyRequest): string => {
  if (r.op === 'claim') return JSON.stringify(['claim', r.actor, r.bagId]);
  if (r.op === 'redeem') return JSON.stringify(['redeem', r.actor, r.to, r.creditId, r.fromName, r.toName, r.room]);
  if (r.op === 'roomReward') return JSON.stringify(['roomReward', r.actor, r.to, r.amount, r.room]);
  const o = r.offer;
  const offer = o.type === 'coins' ? [o.type, o.perRecipient] : o.type === 'item'
    ? [o.type, o.id, o.slot, o.price, o.currency, o.permanent, o.available] : [o.type, o.id, o.name, o.icon, o.price, o.currency, o.active];
  return JSON.stringify(['create', r.actor, r.room, offer, r.count, r.delay]);
};
const validLuckyRequest = (v: unknown): v is LuckyRequest => {
  if (!isObj(v) || !internalId(v.actor)) return false;
  if (v.op === 'claim') return exactKeys(v, ['op', 'actor', 'bagId']) && uuid(v.bagId);
  if (v.op === 'roomReward') return exactKeys(v, ['op', 'actor', 'to', 'amount', 'room']) && internalId(v.to) && v.actor !== v.to && pos(v.amount) && v.amount <= PRICE_MAX.gems && internalId(v.room);
  if (v.op === 'redeem') return exactKeys(v, ['op', 'actor', 'to', 'creditId', 'fromName', 'toName', 'room']) && internalId(v.to) && v.actor !== v.to
    && uuid(v.creditId) && str(v.fromName) && v.fromName.length <= 200 && str(v.toName) && v.toName.length <= 200 && str(v.room) && v.room.length <= 160;
  return v.op === 'create' && exactKeys(v, ['op', 'actor', 'room', 'offer', 'count', 'delay']) && internalId(v.room) && validOffer(v.offer)
    && pos(v.count) && v.count <= 49 && (v.delay === 0 || v.delay === 300) && !Object.is(v.delay, -0)
    && pos(bagUnit(v.offer) * v.count) && bagUnit(v.offer) * v.count <= PRICE_MAX[bagCur(v.offer)];
};
const validCredit = (v: unknown): v is PrepaidGiftCredit => isObj(v) && exactKeys(v, ['id', 'bagId', 'gift', 'qty', 'remaining', 'value'])
  && uuid(v.id) && uuid(v.bagId) && isObj(v.gift) && exactKeys(v.gift, ['id', 'name', 'icon', 'price']) && itemId(v.gift.id)
  && str(v.gift.name) && !!v.gift.name && v.gift.name.length <= 200 && str(v.gift.icon) && v.gift.icon.length <= 200
  && pos(v.gift.price) && v.gift.price <= PRICE_MAX.gems && v.qty === 1 && (v.remaining === 0 || v.remaining === 1)
  && nat(v.value) && v.value === v.gift.price * v.remaining;
const validLuckyBag = (v: unknown): v is LuckyBag => {
  if (!isObj(v) || !exactKeys(v, ['id', 'senderId', 'room', 'offer', 'count', 'total', 'reserve', 'createdAt', 'opensAt', 'expiresAt', 'claims', ...(v.refund === undefined ? [] : ['refund'])])
    || !uuid(v.id) || !internalId(v.senderId) || !internalId(v.room) || !validOffer(v.offer) || !pos(v.count) || v.count > 49
    || !pos(v.total) || v.total !== bagUnit(v.offer) * v.count || v.total > PRICE_MAX[bagCur(v.offer)] || !nat(v.reserve)
    || !nat(v.createdAt) || !nat(v.opensAt) || !nat(v.expiresAt) || ![0, 300_000].includes(v.opensAt - v.createdAt) || v.expiresAt - v.opensAt !== 600_000
    || !array(v.claims, (c) => isObj(c) && exactKeys(c, ['id', 'recipient', 'at', ...(v.offer && (v.offer as LuckyBagOffer).type === 'gift' ? ['creditId'] : [])])
      && uuid(c.id) && internalId(c.recipient) && c.recipient !== v.senderId && nat(c.at) && c.at >= (v.opensAt as number) && c.at < (v.expiresAt as number)
      && ((v.offer as LuckyBagOffer).type !== 'gift' || uuid(c.creditId)))) return false;
  const b = v as unknown as LuckyBag;
  if (b.claims.length > b.count || new Set(b.claims.map((c) => c.recipient)).size !== b.claims.length || new Set(b.claims.map((c) => c.id)).size !== b.claims.length) return false;
  const remaining = b.total - b.claims.length * bagUnit(b.offer);
  return b.refund === undefined ? b.reserve === remaining : isObj(b.refund) && exactKeys(b.refund, ['id', 'at', 'amount'])
    && b.refund.id === JSON.stringify(['refund', b.id]) && nat(b.refund.at) && b.refund.at >= b.expiresAt && pos(b.refund.amount) && b.refund.amount === remaining && b.reserve === 0;
};
const validLuckyOp = (v: unknown): v is LuckyOp => {
  if (!isObj(v) || !exactKeys(v, ['fingerprint', 'request', 'result']) || !validLuckyRequest(v.request) || v.fingerprint !== luckyFingerprint(v.request)
    || !isObj(v.result) || v.result.ok !== true || v.result.dup !== false || !nat(v.result.coins) || !nat(v.result.gems)) return false;
  const r = v.result;
  if (v.request.op === 'roomReward') return exactKeys(r, ['ok', 'dup', 'rewardId', 'coins', 'gems', 'toGems']) && uuid(r.rewardId) && nat(r.toGems);
  if (v.request.op === 'create') return exactKeys(r, ['ok', 'dup', 'bagId', 'coins', 'gems']) && uuid(r.bagId);
  if (v.request.op === 'claim') return exactKeys(r, ['ok', 'dup', 'bagId', 'coins', 'gems', 'claimId', 'type', 'amount', 'cur', ...(r.type === 'item' ? ['itemId'] : r.type === 'gift' ? ['creditId'] : [])])
    && r.bagId === v.request.bagId && uuid(r.claimId) && pos(r.amount) && (r.type === 'coins' ? r.cur === 'coins' : r.cur === 'gems' && (r.type === 'item' ? itemId(r.itemId) : r.type === 'gift' && uuid(r.creditId)));
  const versioned = isObj(r.rec) && r.rec.rewardPolicy === GIFT_REWARD_POLICY.id;
  return exactKeys(r, ['ok', 'dup', 'creditId', 'coins', 'gems', 'toGems', 'rec', ...(versioned ? ['toCoins'] : [])])
    && r.creditId === v.request.creditId && nat(r.toGems) && (!versioned || nat(r.toCoins)) && validGift(r.rec)
    && isObj(r.rec) && exactKeys(r.rec, ['id', 'ts', 'from', 'fromName', 'to', 'toName', 'gift', 'name', 'icon', 'price', 'qty', 'total', 'recv', 'house', ...(v.request.room ? ['room'] : []), 'status', 'cur', 'prepaid', 'creditId', 'dir', ...(versioned ? ['rewardCur', 'senderBonus', 'rewardPolicy'] : [])])
    && uuid(r.rec.id) && r.rec.from === v.request.actor && r.rec.to === v.request.to && r.rec.fromName === v.request.fromName && r.rec.toName === v.request.toName
    && (r.rec.room ?? '') === v.request.room && r.rec.dir === 'out' && r.rec.creditId === v.request.creditId && r.rec.prepaid === true;
};
/** Permanent accounting evidence; display gift/house rows can be capped independently. */
const giftLedgerProof = (accounts: Record<string, Acc>, rec: GiftRec): boolean => {
  const source = (accounts[rec.from]?.ledger ?? []).filter((l) => l.giftTx === rec.id);
  const target = (accounts[rec.to]?.ledger ?? []).filter((l) => l.giftTx === rec.id);
  const matches = (l: LedgerEntry, cur: Cur, delta: number) => l.kind === 'gift' && l.cur === cur && l.delta === delta && l.ts === rec.ts && l.ref === rec.gift;
  const total = rec.total ?? rec.price * (rec.qty ?? 1), recv = rec.recv ?? splitGift(total).recv;
  if (rec.rewardPolicy === GIFT_REWARD_POLICY.id) return source.length === 2 && target.length === 1
    && source.some((l) => matches(l, 'gems', rec.prepaid ? 0 : -total))
    && source.some((l) => matches(l, 'coins', rec.senderBonus!)) && target.some((l) => matches(l, 'coins', recv));
  const cur = rec.cur ?? 'coins';
  return source.some((l) => matches(l, cur, rec.prepaid ? 0 : -total)) && target.some((l) => matches(l, cur, recv));
};
/** Relational checks stop orphan/mutated reserves, receipts or reusable credits on restart. */
const validLuckyState = (d: Record<string, unknown>): boolean => {
  if (!optional(d.luckyBags, (x) => record(x, validLuckyBag)) || !optional(d.luckyOps, (x) => record(x, validLuckyOp))) return false;
  const data = d as unknown as Data, bags = data.luckyBags ?? {}, ops = data.luckyOps ?? {}, accounts = data.acc ?? {};
  const creates = new Map<string, LuckyOp>(), claims = new Map<string, LuckyOp>(), redemptions = new Map<string, LuckyOp>();
  for (const [key, op] of Object.entries(ops)) {
    let parts: unknown; try { parts = JSON.parse(key); } catch { return false; }
    if (!Array.isArray(parts) || parts.length !== 2 || parts[0] !== op.request.actor || !str(parts[1]) || !parts[1] || parts[1].length > 80 || key !== JSON.stringify(parts)
      || !Object.hasOwn(accounts, op.request.actor)) return false;
    const result = op.result;
    if (op.request.op === 'create') { if (creates.has((result as LuckyBagCreateReceipt).bagId)) return false; creates.set((result as LuckyBagCreateReceipt).bagId, op); }
    else if (op.request.op === 'claim') { const id = (result as LuckyBagClaimReceipt).claimId; if (claims.has(id)) return false; claims.set(id, op); }
    else if (op.request.op === 'roomReward') {
      const req = op.request, r = result as RoomRewardReceipt, ref = `roomReward:${r.rewardId}`;
      if (!Object.hasOwn(accounts, req.to) || !(accounts[req.actor].ledger ?? []).some((l) => l.ref === ref && l.kind === 'transfer' && l.cur === 'gems' && l.delta === -req.amount && l.after === r.gems)
        || !(accounts[req.to].ledger ?? []).some((l) => l.ref === ref && l.kind === 'transfer' && l.cur === 'gems' && l.delta === req.amount && l.after === r.toGems)) return false;
    }
    else { if (!Object.hasOwn(accounts, op.request.to) || redemptions.has(op.request.creditId)) return false; redemptions.set(op.request.creditId, op); }
  }
  const credits = new Set<string>();
  for (const [id, b] of Object.entries(bags)) {
    const created = creates.get(id);
    if (id !== b.id || !Object.hasOwn(accounts, b.senderId) || !created || created.request.op !== 'create'
      || luckyFingerprint(created.request) !== luckyFingerprint({ op: 'create', actor: b.senderId, room: b.room, offer: b.offer, count: b.count, delay: (b.opensAt - b.createdAt) / 1000 as 0 | 300 })) return false;
    creates.delete(id);
    const source = accounts[b.senderId].ledger ?? [];
    if (!source.some((l) => l.ref === `lucky:${id}:create` && l.cur === bagCur(b.offer) && l.kind === 'transfer' && l.delta === -b.total && l.ts === b.createdAt
      && l.after === (bagCur(b.offer) === 'coins' ? created.result.coins : created.result.gems))) return false;
    if (b.refund && !source.some((l) => l.ref === b.refund!.id && l.kind === 'refund' && l.cur === bagCur(b.offer) && l.delta === b.refund!.amount && l.ts === b.refund!.at)) return false;
    for (const c of b.claims) {
      const proof = claims.get(c.id), a = accounts[c.recipient];
      if (!Object.hasOwn(accounts, c.recipient) || !proof || proof.request.op !== 'claim' || proof.request.actor !== c.recipient || proof.request.bagId !== id) return false;
      const r = proof.result as LuckyBagClaimReceipt;
      if (r.type !== b.offer.type || r.cur !== bagCur(b.offer) || r.amount !== bagUnit(b.offer) || r.creditId !== c.creditId
        || (b.offer.type === 'item' && (r.itemId !== b.offer.id || !(a.owned ?? []).includes(b.offer.id)))
        || !(a.ledger ?? []).some((l) => l.ref === `lucky:${id}:claim:${c.id}` && l.cur === r.cur && l.kind === 'transfer' && l.delta === (r.type === 'coins' ? r.amount : 0) && l.ts === c.at
          && l.after === (r.cur === 'coins' ? r.coins : r.gems))) return false;
      claims.delete(c.id);
      if (b.offer.type === 'gift') {
        const credit = a.prepaidGifts?.[c.creditId!];
        if (!credit || credits.has(credit.id) || credit.id !== c.creditId || credit.bagId !== id || JSON.stringify([credit.gift.id, credit.gift.name, credit.gift.icon, credit.gift.price]) !== JSON.stringify([b.offer.id, b.offer.name, b.offer.icon, b.offer.price])) return false;
        credits.add(credit.id);
        const used = redemptions.get(credit.id);
        if ((credit.remaining === 0) !== !!used) return false;
        if (used) {
          const req = used.request, receipt = used.result as PrepaidGiftRedeemReceipt, rec = receipt.rec;
          if (req.op !== 'redeem' || req.actor !== c.recipient || rec.ts < c.at || rec.gift !== credit.gift.id || rec.price !== credit.gift.price || rec.name !== credit.gift.name || rec.icon !== credit.gift.icon
            || !giftLedgerProof(accounts, rec)
            || !(a.ledger ?? []).some((l) => l.giftTx === rec.id && l.cur === 'gems' && l.after === receipt.gems)
            || !(accounts[req.to].ledger ?? []).some((l) => l.giftTx === rec.id && l.cur === (rec.rewardCur ?? 'gems') && l.after === (rec.rewardPolicy ? receipt.toCoins : receipt.toGems))
            || (rec.rewardPolicy && !(a.ledger ?? []).some((l) => l.giftTx === rec.id && l.cur === 'coins' && l.after === receipt.coins))) return false;
          const h = (data.house?.ledger ?? []).find((l) => l.tx === rec.id);
          if (h && (h.cur !== 'gems' || h.delta !== rec.house || h.total !== rec.total || h.from !== rec.from || h.to !== rec.to
            || h.gift !== rec.gift || h.qty !== 1 || h.ts !== rec.ts || h.room !== (rec.room ?? '') || h.rewardPolicy !== rec.rewardPolicy)) return false;
          redemptions.delete(credit.id);
        }
      }
    }
  }
  for (const a of Object.values(accounts)) for (const [id, credit] of Object.entries(a.prepaidGifts ?? {})) if (id !== credit.id || !credits.has(id)) return false;
  return !creates.size && !claims.size && !redemptions.size;
};
const validGiftProofs = (d: Record<string, unknown>): boolean => {
  const data = d as unknown as Data;
  for (const [key, proof] of Object.entries(data.giftKeys ?? {})) {
    if (!proof.rec) continue; // Old permanent keys may legitimately outlive their display receipt.
    const rec = proof.rec;
    if (rec.rewardPolicy) {
      let parts: unknown; try { parts = JSON.parse(key); } catch { return false; }
      if (!Array.isArray(parts) || parts.length !== 2 || parts[0] !== rec.from || !str(parts[1]) || !parts[1] || parts[1].length > 80 || key !== JSON.stringify(parts)) return false;
    } else if (!key.startsWith(rec.from + ':')) return false;
    if (!giftLedgerProof(data.acc ?? {}, rec)) return false;
    const h = (data.house?.ledger ?? []).find((l) => l.tx === rec.id);
    if (h && (h.delta !== rec.house || h.total !== rec.total || (h.cur ?? 'coins') !== (rec.cur ?? 'coins') || h.rewardPolicy !== rec.rewardPolicy
      || h.from !== rec.from || h.to !== rec.to || h.gift !== rec.gift || h.qty !== rec.qty || h.ts !== rec.ts || h.room !== (rec.room ?? ''))) return false;
  }
  return true;
};
/** Permanent parent/child relational evidence. No migration or policy relabeling of single gifts. */
const validGiftBatches = (d: Record<string, unknown>): boolean => {
  if (d.giftBatches === undefined) return true;
  if (!isObj(d.giftBatches)) return false;
  const data = d as unknown as Data, accounts = data.acc ?? {};
  const receiptIds = new Set(Object.values(data.giftKeys ?? {}).map(p => p.rid));
  for (const op of Object.values(data.luckyOps ?? {})) if ('rec' in op.result) receiptIds.add(op.result.rec.id);
  const batchIds = new Set<string>();
  for (const [key, value] of Object.entries(d.giftBatches)) {
    if (!isObj(value) || !exactKeys(value, ['request', 'result']) || !isObj(value.request) || !isObj(value.result)) return false;
    const req = value.request, r = value.result;
    if (!exactKeys(req, ['from', 'targets', 'gift', 'qty', 'room']) || !internalId(req.from) || !internalId(req.gift)
      || !pos(req.qty) || req.qty > GIFT_BATCH_QUANTITY_MAX || !str(req.room) || req.room.length > 160) return false;
    const targets = canonicalGiftBatchTargets(req.from, req.targets);
    if (!Array.isArray(targets) || JSON.stringify(targets) !== JSON.stringify(req.targets)) return false;
    let parts: unknown; try { parts = JSON.parse(key); } catch { return false; }
    if (!Array.isArray(parts) || parts.length !== 2 || parts[0] !== req.from || !str(parts[1]) || !parts[1] || parts[1].length > 80
      || key !== JSON.stringify(parts) || data.giftKeys?.[key] || data.giftKeys?.[req.from + ':' + parts[1]] || !Object.hasOwn(accounts, req.from)) return false;
    if (!exactKeys(r, ['ok', 'dup', 'batchId', 'targets', 'qty', 'room', 'coins', 'gems', 'quote', 'receipts']) || r.ok !== true || r.dup !== false
      || !uuid(r.batchId) || batchIds.has(r.batchId) || !nat(r.coins) || !nat(r.gems) || r.qty !== req.qty || r.room !== req.room
      || JSON.stringify(r.targets) !== JSON.stringify(targets) || !Array.isArray(r.receipts) || r.receipts.length !== targets.length) return false;
    batchIds.add(r.batchId);
    let first: GiftRec | undefined, previousCoins: number | undefined, previousGems: number | undefined;
    for (const [i, child] of r.receipts.entries()) {
      if (!isObj(child) || !exactKeys(child, ['to', 'toCoins', 'toGems', 'rec']) || child.to !== targets[i] || !nat(child.toCoins) || !nat(child.toGems)
        || !Object.hasOwn(accounts, targets[i]) || !validGift(child.rec)) return false;
      const rec = child.rec;
      if (!uuid(rec.id) || receiptIds.has(rec.id) || rec.dir !== 'out' || rec.prepaid !== undefined || rec.rewardPolicy !== GIFT_REWARD_POLICY.id
        || rec.from !== req.from || rec.to !== child.to || rec.gift !== req.gift || rec.qty !== req.qty || (rec.room ?? '') !== req.room
        || !giftLedgerProof(accounts, rec)) return false;
      receiptIds.add(rec.id);
      first ??= rec;
      if (rec.ts !== first.ts || rec.price !== first.price || rec.name !== first.name || rec.icon !== first.icon || rec.fromName !== first.fromName) return false;
      const source = accounts[req.from].ledger ?? [], target = accounts[targets[i]].ledger ?? [];
      const debit = source.find(l => l.giftTx === rec.id && l.cur === 'gems')!, bonus = source.find(l => l.giftTx === rec.id && l.cur === 'coins')!;
      if (!target.some(l => l.giftTx === rec.id && l.cur === 'coins' && l.after === child.toCoins)
        || previousCoins !== undefined && bonus.before !== previousCoins || previousGems !== undefined && debit.before !== previousGems) return false;
      previousCoins = bonus.after; previousGems = debit.after;
      const h = data.house?.ledger.find(l => l.tx === rec.id);
      if (h && (h.delta !== rec.house || h.total !== rec.total || h.cur !== 'gems' || h.rewardPolicy !== rec.rewardPolicy || h.from !== rec.from
        || h.to !== rec.to || h.gift !== rec.gift || h.qty !== rec.qty || h.ts !== rec.ts || h.room !== req.room)) return false;
    }
    const quote = quoteGiftBatch(first!.price, req.qty, targets.length);
    if (!quote || !isObj(r.quote) || !exactKeys(r.quote, Object.keys(quote)) || !isObj(r.quote.perRecipient)
      || !exactKeys(r.quote.perRecipient, Object.keys(quote.perRecipient)) || r.coins !== previousCoins || r.gems !== previousGems) return false;
    const { perRecipient, ...totals } = quote, storedQuote = r.quote, storedPerRecipient = r.quote.perRecipient;
    if (!Object.entries(totals).every(([k, amount]) => storedQuote[k] === amount)
      || !Object.entries(perRecipient).every(([k, amount]) => storedPerRecipient[k] === amount)) return false;
  }
  return true;
};
/** الحقول الجذرية الناقصة وdaily القديم اختياريان؛ القيم المالية الموجودة يجب أن تكون أعداداً صحيحة آمنة. */
export const validWallet = (d: Record<string, unknown>) => isObj(d) && optional(d.acc, (x) => record(x, validAcc)) && optional(d.settled, strs)
  && optional(d.bulkOps, (x) => record(x, (v) => isObj(v) && v.ok === true && str(v.operationId) && nat(v.total) && nat(v.succeeded) && nat(v.failed) && Array.isArray(v.failures)))
  && optional(d.campaignGrants, validCampaignGrants)
  && optional(d.buys, (x) => record(x, str)) && optional(d.buyOps, (x) => record(x, validBuyOp))
  && optional(d.admOps, (x) => record(x, validAdm)) && optional(d.giftKeys, (x) => record(x, validGiftKey))
  && optional(d.house, validHouse) && optional(d.giftStats, (x) => record(x, nat)) && validGiftProofs(d) && validGiftBatches(d) && validLuckyState(d) && validAuctionWalletR47(d);
/**
 * المحفظة الموحّدة لكل لاعب (كل الألعاب): عملات وجواهر افتراضية بلا قيمة مالية، لا تُسحب ولا تتحول لمال. الشراء بأموال حقيقية غير مفعّل؛ لما يتفعّل يمر عبر grant() بمفتاح عملية فريد (نفس ضمان عدم التكرار).
 * الرصيد على الخادم (مربوط بمعرّف الجلسة) عشان ما يتلاعب فيه اللاعب من جواله.
 */
export class Wallet {
  private d: Data = { acc: {}, settled: [] };
  private disk: Persister;
  readonly persistent: boolean;
  /** جوائز/استرجاعات مستحقة ما انحفظت بعد (بالذاكرة فقط). تُعاد محاولتها ولا تظهر للاعب قبل ما تنحفظ. */
  private pending: { key: string; payers: string[]; fee: number; winners: string[] }[] = [];
  private bulkTail: Promise<void> = Promise.resolve();
  /** يُنادى بعد كل تغيير رصيد عشان نكتب سجل الحركات (بعد نجاح الحفظ فقط) */
  onTx?: TxHook;
  /** R123: كل نقص بالعملات — رصيد «المشحون» ما يزيد عن الرصيد الكلي (الخصم العادي ياكل من المجاني أول) */
  onCoinsDown?: (id: string, after: number) => void;
  onCampaignTxBatch?: (rows: { id: string; delta: number; balance: number; ref: string }[]) => void;
  /** Server balance/event bridge, AFTER commit only; never replayed or called for failed persistence. */
  onBenefitsChange?: (ids: string[]) => void;
  /** يُنادى بعد حفظ هدية جديدة فقط؛ إعادة الطلب لا تستدعيه. */
  onGift?: (from: string, to: string, ref: string) => void;
  /** Optional durable reservation before any gift mutation; failure prevents the primary commit. */
  onBeforeGift?: (from: string, to: string, ref: string, ts: number) => void | (() => void);
  /** يُنادى لما جائزة معلّقة تنحفظ أخيراً (مفتاح اللعبة والمبالغ) */
  onSettled?: (key: string, out: Record<string, number>) => void;
  /** رمز عام فقط؛ لا معرّف لاعب أو مباراة أو محتوى استثناء في السجل. */
  onPayoutError?: (code: 'BALANCE_OVERFLOW' | 'PAYOUT_RETRY_FAILED' | 'CAMPAIGN_HOOK_FAILED') => void;
  private settlingLucky = false;
  private preparingGiftBatch = false;
  private auctionGuardsR47?: AuctionGuardsR47;
  private recoveringAuctionsR47 = false;
  constructor(file = '', private now: () => number = Date.now, mon = new StorageMonitor()) {
    this.persistent = !!file;
    if (file) {
      // ما فيه ملف = بداية جديدة. ملف تالف = يرمي DataFilesCorruptError (ما نبدأ بفاضي وما نكتب فوقه)
      const loaded = loadJsonFile(file, validWallet);
      if (loaded) this.d = loaded as unknown as Data;
      this.d.acc ??= {};
      this.d.settled ??= [];
    }
    this.disk = new Persister('wallet', file, () => this.d, now, mon);
    this.settleExpiredLuckyBags();
  }
  /** R63: «عملة وحدة» — الجواهر انشالت من الموقع والكل يشوف عملات بس (جوهرة = 20 عملة).
   * أي خصم بالجواهر (شراء، هدية، مزاد، حقيبة، مكافأة غرفة، باقة VIP) يحوّل قبله من العملات بالضبط اللي ناقص (بنفس النسبة)، بعملية محفوظة لحالها.
   * التحويل محايد القيمة (الرصيد المعروض = عملات + جواهر × 20 ما يتغيّر)، فلو العملية بعده فشلت ما أحد يخسر شي. SINGLE_CURRENCY=0 يطفيه. */
  static readonly COINS_PER_GEM = 20;
  coverGems(id: string, need: number): boolean {
    if (process.env.SINGLE_CURRENCY === '0' || !nat(need) || need <= 0 || !this.has(id)) return false;
    const a = this.a(id), have = a.gems ?? 0; if (have >= need) return true;
    const deficit = need - have, cost = deficit * Wallet.COINS_PER_GEM;
    if (!nat(cost) || a.coins < cost || !this.auctionCanBalanceR47(id, 'coins', a.coins - cost) || !nat(have + deficit)) return false;
    const sn = this.snap([id]);
    a.coins -= cost; a.gems = have + deficit;
    this.rec(id, 'coins', 'transfer', -cost, a.coins, 'تحويل تلقائي (عملة وحدة)', 'single-currency');
    this.rec(id, 'gems', 'transfer', deficit, a.gems, 'تحويل تلقائي (عملة وحدة)', 'single-currency');
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); throw e; }
    return true;
  }
  /** R63: يحوّل كل جواهر اللاعب لعملات (×20) — يُستخدم للتحويل الأول وبعد أي جوايز قديمة تنصرف بالجواهر. يرجع عدد الجواهر اللي انحولت. */
  sweepGems(id: string): number {
    if (process.env.SINGLE_CURRENCY === '0' || !this.has(id)) return 0;
    const a = this.a(id), g = a.gems ?? 0; if (g <= 0) return 0;
    const add = g * Wallet.COINS_PER_GEM; if (!nat(add) || !nat(a.coins + add) || !this.auctionCanBalanceR47(id, 'coins', a.coins + add)) return 0;
    const sn = this.snap([id]);
    a.gems = 0; a.coins += add;
    this.rec(id, 'gems', 'transfer', -g, 0, 'تحويل الجواهر إلى عملات (جوهرة = 20 عملة)', 'single-currency');
    this.rec(id, 'coins', 'transfer', add, a.coins, 'تحويل الجواهر إلى عملات (جوهرة = 20 عملة)', 'single-currency');
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); throw e; }
    return g;
  }
  /** R63: اللاعبين اللي عندهم جواهر (للتحويل الدوري) */
  withGems(): string[] { return Object.entries(this.d.acc).filter(([, a]) => (a.gems ?? 0) > 0).map(([id]) => id); }
  /** R63: الرصيد الموحّد اللي ينعرض للاعب (عملات + جواهر × 20) */
  unified(id: string): number { const a = this.d.acc[id]; return a ? a.coins + (a.gems ?? 0) * Wallet.COINS_PER_GEM : 0; }
  private snap(ids: string[]): Map<string, Acc> { return new Map(ids.map((id) => [id, structuredClone(this.a(id))])); }
  private restore(m: Map<string, Acc>) { for (const [id, a] of m) this.d.acc[id] = a; }
  private rec(id: string, cur: Cur, kind: LedgerEntry['kind'], delta: number, after: number, reason: string, ref = '', giftTx?: string, ts = this.now()) {
    const a = this.a(id);
    if (cur === 'coins' && delta < 0) { try { this.onCoinsDown?.(id, after); } catch { /* */ } }
    (a.ledger ??= []).push({ id: randomUUID(), ts, cur, kind, delta, before: after - delta, after, reason, ref, ...(giftTx ? { giftTx } : {}) });
  }
  private a(id: string): Acc { return (this.d.acc[id] ??= { coins: START_COINS, daily: '' }); }
  balance(id: string) { this.recoverAuctionsR47(); return this.a(id).coins; }
  gems(id: string) { this.recoverAuctionsR47(); return this.a(id).gems ?? 0; }
  /** R68z: الأغراض المؤقتة: متى تنتهي */
  expiries(id: string): Record<string, number> { return { ...(this.d.acc[id]?.exp ?? {}) }; }
  /** R68z: نشيل الأغراض اللي خلصت مدتها (ونفك تجهيزها). يرجع مين انشال له شي. */
  expireDue(now = Date.now()): { id: string; items: string[] }[] {
    const out: { id: string; items: string[] }[] = [];
    for (const [id, a] of Object.entries(this.d.acc)) {
      if (!a.exp) continue;
      const due = Object.entries(a.exp).filter(([, t]) => t <= now).map(([k]) => k); if (!due.length) continue;
      a.owned = (a.owned ?? []).filter((x) => !due.includes(x));
      if (a.equipped) for (const [slot, it] of Object.entries(a.equipped)) if (due.includes(it)) delete a.equipped[slot];
      for (const k of due) delete a.exp[k]; if (!Object.keys(a.exp).length) delete a.exp;
      out.push({ id, items: due });
    }
    if (out.length) this.disk.save();
    return out;
  }
  owned(id: string): string[] { this.recoverAuctionsR47(); return [...(this.a(id).owned ?? [])]; }
  /** R58: هل يملك هذا العنصر حساب غير exceptId؟ (للمقتنيات الفريدة مثل أيدي الغرف) — قراءة فقط */
  anyOwner(itemId: string, exceptId: string): boolean { for (const [key, acc] of Object.entries(this.d.acc)) if (key !== exceptId && acc.owned?.includes(itemId)) return true; return false; }
  /** الأفاتار المجهّز (معرّف عنصر) أو null؛ قراءة فقط ولا تنشئ حساباً للمعرّف */
  equippedAvatar(id: string): string | null { return this.d.acc[id]?.equipped?.avatar ?? null; }
  equipped(id: string): Record<string, string> { return { ...(this.a(id).equipped ?? {}) }; }
  /** Existing owned equipment only; never creates/normalizes an account or persists. Catalog slot validation belongs to the caller. */
  equippedOwnedItem(id: string, slot: string): string | null {
    const a = this.d.acc[id], equipped = a?.equipped;
    const item = equipped && Object.hasOwn(equipped, slot) ? equipped[slot] : undefined;
    return typeof item === 'string' && a?.owned?.includes(item) ? item : null;
  }
  claimed(id: string): string[] { return [...(this.a(id).claimed ?? [])]; }
  /** آخر العمليات (الأحدث أولاً) لعملات وجواهر */
  ledgerOf(id: string, n = 50, offset = 0): LedgerEntry[] {
    if (!nat(n) || !nat(offset) || n === 0) return [];
    const rows = this.a(id).ledger ?? []; const end = Math.max(0, rows.length - offset);
    return rows.slice(Math.max(0, end - n), end).reverse().map((row) => ({ ...row }));
  }
  ledgerCount(id: string) { return (this.d.acc[id]?.ledger ?? []).length; }
  canClaim(id: string) { return this.a(id).daily !== dayOf(this.now()); }
  /** جوائز معلّقة بانتظار نجاح الحفظ (للصحة) */
  pendingCount() { return this.pending.length; }
  /** تغيير بالمحفظة ما انكتب؟ (العمليات الفاشلة تتراجع فما تُحسب؛ الجوائز المعلّقة تُعدّ لوحدها في pendingCount) */
  unsaved() { return this.disk.unsaved; }
  /** المكافأة اليومية. لو الحفظ فشل يتراجع كل شيء ويرمي StorageError (ما انضاف شيء). */
  claimDaily(id: string): number {
    const a = this.a(id);
    if (a.daily === dayOf(this.now())) return 0;
    if (!this.auctionCanBalanceR47(id, 'coins', a.coins + DAILY_COINS)) throw new RangeError('wallet_balance_overflow');
    const sn = this.snap([id]);
    a.daily = dayOf(this.now());
    a.coins += DAILY_COINS;
    this.rec(id, 'coins', 'daily', DAILY_COINS, a.coins, 'المكافأة اليومية');
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); throw e; }
    this.onTx?.(id, 'daily', DAILY_COINS, a.coins, '');
    return DAILY_COINS;
  }
  /** R67ae: خصم خدمة (مثل البرقية العالمية) — مرة وحدة لكل مرجع؛ نفس المرجع يرجع نفس النتيجة بدون خصم ثاني */
  spendService(id: string, amount: number, reason: string, ref: string): { ok: true; coins: number; dup: boolean } | { ok: false; code: 'poor' | 'bad' } {
    if (!nat(amount) || amount <= 0 || !ref) return { ok: false, code: 'bad' };
    const acc = this.a(id);
    if ((acc.ledger ?? []).some((l) => l.ref === ref && l.kind === 'purchase')) return { ok: true, coins: acc.coins, dup: true };
    if (acc.coins < amount) return { ok: false, code: 'poor' };
    const sn = this.snap([id]); acc.coins -= amount; this.rec(id, 'coins', 'purchase', -amount, acc.coins, reason, ref);
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); throw e; }
    this.onTx?.(id, 'purchase', -amount, acc.coins, ref);
    return { ok: true, coins: acc.coins, dup: false };
  }
  /** يخصم من الكل أو ما يخصم أبداً. يرجّع أرقام الفاشلين (رصيدهم ما يكفي). لو الحفظ فشل يتراجع الخصم ويرمي StorageError. */
  charge(ids: string[], amount: number, ref = ''): string[] {
    if (!nat(amount)) throw new RangeError('wallet_invalid_amount');
    if (new Set(ids).size !== ids.length) throw new RangeError('wallet_invalid_payers');
    if (amount <= 0) return [];
    const poor = ids.filter((id) => this.a(id).coins < amount);
    if (poor.length) return poor;
    const sn = this.snap(ids);
    for (const id of ids) { this.a(id).coins -= amount; this.rec(id, 'coins', 'entry_fee', -amount, this.a(id).coins, 'رسم دخول مباراة', ref); }
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); throw e; }
    for (const id of ids) this.onTx?.(id, 'entry_fee', -amount, this.a(id).coins, ref);
    return [];
  }
  /**
   * توزيع الجائزة مرة وحدة: الفائزون يقتسمون المجموع. لو ما فيه فائز نرجّع الرسوم.
   * لو الحفظ فشل: نتراجع، وتنحط الجائزة في قائمة معلّقة وتنعاد محاولتها (retryPending). لا ترجع مبالغ حتى تنحفظ فعلاً.
   */
  settle(key: string, payers: string[], fee: number, winners: string[]): Record<string, number> {
    if (!nat(fee)) throw new RangeError('wallet_invalid_amount');
    if (fee <= 0 || this.d.settled.includes(key) || this.pending.some((p) => p.key === key)) return {};
    return this.commit({ key, payers, fee, winners }) ?? {};
  }
  private commit(p: { key: string; payers: string[]; fee: number; winners: string[] }): Record<string, number> | null {
    const out: Record<string, number> = {};
    const pool = p.fee * p.payers.length;
    if (!nat(pool)) throw new RangeError('wallet_balance_overflow');
    if (new Set(p.payers).size !== p.payers.length || new Set(p.winners).size !== p.winners.length) throw new RangeError('wallet_invalid_payers');
    const w = p.winners.filter((id) => p.payers.includes(id));
    const recv = w.length ? w : p.payers;
    if (!recv.length) return {};
    const each = Math.floor(pool / recv.length);
    for (let i = 0; i < recv.length; i++) {
      const n = each + (i === 0 ? pool - each * recv.length : 0);
      if (!nat(n) || !this.auctionCanBalanceR47(recv[i], 'coins', (this.d.acc[recv[i]]?.coins ?? START_COINS) + n)) throw new RangeError('wallet_balance_overflow');
    }
    const sn = this.snap(recv);
    const settledBefore = this.d.settled;
    const kind0: TxKind = p.key.startsWith('refund:') || !w.length ? 'refund' : 'prize';
    recv.forEach((id, i) => { const n = each + (i === 0 ? pool - each * recv.length : 0); this.a(id).coins += n; out[id] = n; this.rec(id, 'coins', kind0, n, this.a(id).coins, kind0 === 'prize' ? 'جائزة مباراة' : 'استرجاع رسوم', p.key); });
    this.d.settled = [...settledBefore, p.key];
    if (!this.disk.save(true)) {
      this.restore(sn);
      this.d.settled = settledBefore;
      if (!this.pending.some((q) => q.key === p.key)) this.pending.push(p);
      return null;
    }
    const kind = p.key.startsWith('refund:') || !w.length ? 'refund' : 'prize';
    for (const id of recv) this.onTx?.(id, kind, out[id], this.a(id).coins, p.key);
    return out;
  }
  private opKey(id: string, key: string) { return JSON.stringify([id, key]); }
  private validKey(id: unknown, key: unknown) { return str(id) && !!id && str(key) && !!key && key.length <= 80; }
  /** Private server integration view; never expose internal request IDs or keys through HTTP. */
  luckyReceiptByKey(actor: string, key: string): {request: LuckyRequest; result: LuckyOp['result']} | null {
    if(!this.validKey(actor,key))return null;
    const operation=this.d.luckyOps?.[this.opKey(actor,key)];
    return operation?structuredClone({request:operation.request,result:{...operation.result,dup:true}}):null;
  }
  private luckyReplay(request: LuckyRequest, key: string): LuckyOp['result'] | LuckyBagError | null {
    if (!this.validKey(request.actor, key) || !validLuckyRequest(request)) return { ok: false, code: 'bad' };
    const op = this.d.luckyOps?.[this.opKey(request.actor, key)];
    if (!op) return null;
    return op.fingerprint === luckyFingerprint(request) ? structuredClone({ ...op.result, dup: true }) : { ok: false, code: 'conflict' };
  }
  /** Whole Wallet draft, same Persister: no asynchronous window or second store. */
  private luckyCommit<T>(apply: () => T): T {
    const before = this.d;
    this.d = structuredClone(before);
    try { const result = apply(); if (!this.auctionBalancesValidR47()) throw new RangeError('wallet_balance_overflow'); this.disk.mustSave(); return structuredClone(result); }
    catch (e) { this.d = before; throw e; }
  }
  private luckyProof(request: LuckyRequest, key: string, result: LuckyOp['result']) {
    this.d.luckyOps = { ...this.d.luckyOps, [this.opKey(request.actor, key)]: { fingerprint: luckyFingerprint(request), request: structuredClone(request), result: structuredClone(result) } };
  }
  private luckyNotify(id: string, cur: Cur, kind: TxKind, delta: number, balance: number, ref: string) {
    // Existing TxHook is coins-only; gem and entitlement accounting remains in the canonical ledger.
    if (cur === 'coins') try { this.onTx?.(id, kind, delta, balance, ref); } catch { /* observation cannot undo a durable payment */ }
  }
  private benefitsNotify(ids: string[]) {
    try { this.onBenefitsChange?.([...new Set(ids)]); } catch { /* observer failure is not financial failure */ }
  }
  /** Existing single Wallet writer only. Configure after current catalog/auth are ready; recovers restart deadlines. */
  configureAuctionsR47(guards: AuctionGuardsR47): void {
    if (!guards || typeof guards.item !== 'function' || typeof guards.isAdmin !== 'function' || typeof guards.canBid !== 'function') throw new TypeError('auction_bad_guards');
    this.auctionGuardsR47 = guards;
    this.recoverAuctionsR47();
  }
  private auctionReplayR47(request: AuctionRequestR47, key: string): AuctionResultR47 | null {
    if (!validAuctionKeyR47(request.actor, key) || !validAuctionRequestR47(request)) return { ok: false, code: 'bad' };
    const p = this.d.auctionR47?.ops[auctionKeyR47(request.actor, key)];
    return !p ? null : p.fingerprint === auctionFingerprintR47(request) ? structuredClone({ ...p.result, dup: true }) : { ok: false, code: 'conflict' };
  }
  private auctionProofR47(request: AuctionRequestR47, key: string, result: AuctionReceiptR47): void {
    const s = this.d.auctionR47 ??= { v: 1, lots: {}, ops: {} };
    s.ops[auctionKeyR47(request.actor, key)] = { request: structuredClone(request), fingerprint: auctionFingerprintR47(request), result: structuredClone(result) };
  }
  private auctionAuthorizedR47(actor: string, admin = false): AuctionErrorR47 | null {
    if (!this.auctionGuardsR47) return { ok: false, code: 'unconfigured' };
    if (!this.has(actor) || (admin && this.auctionGuardsR47.isAdmin(actor) !== true)) return { ok: false, code: 'forbidden' };
    return null;
  }
  /** Never evict idempotency evidence. At the finite cap NEW create/bid commands fail closed. */
  private auctionCapacityR47(): boolean { return Object.keys(this.d.auctionR47?.ops ?? {}).length < AUCTION_R47_LIMITS.receipts - AUCTION_R47_LIMITS.lots; }
  private auctionHeldR47(actor: string, cur: Cur): number {
    return Object.values(this.d.auctionR47?.lots ?? {}).reduce((sum, lot) => sum + (lot.status === 'open' && lot.item.currency === cur && lot.highest?.actor === actor ? lot.escrow : 0), 0);
  }
  private auctionCanBalanceR47(actor: string, cur: Cur, after: number): boolean { return nat(after) && nat(after + this.auctionHeldR47(actor, cur)); }
  /** Protect the refund headroom as well as the spendable balance when legacy reward/admin code credits. */
  private auctionBalancesValidR47(): boolean {
    const held = new Map<string, number>();
    for (const lot of Object.values(this.d.auctionR47?.lots ?? {})) {
      if (lot.status !== 'open' || !lot.highest) continue;
      const key = auctionKeyR47(lot.highest.actor, lot.item.currency);
      held.set(key, (held.get(key) ?? 0) + lot.escrow);
    }
    for (const [key, amount] of held) {
      const [actor, cur] = JSON.parse(key) as [string, Cur];
      if (!nat(amount) || !nat((this.d.acc[actor]?.[cur] ?? 0) + amount)) return false;
    }
    return true;
  }
  createAuctionR47(actor: string, itemId: string, key: string, durationMinutes = 5): AuctionResultR47 {
    const req: AuctionRequestR47 = { op: 'create', actor, itemId, durationMinutes };
    const auth = this.auctionAuthorizedR47(actor, true); if (auth) return auth;
    this.recoverAuctionsR47();
    const replay = this.auctionReplayR47(req, key); if (replay) return replay;
    const item = this.auctionGuardsR47!.item(itemId);
    if (!approvedAuctionItemR47(item)) return { ok: false, code: 'unavailable' };
    const ts = this.now(), endsAt = ts + durationMinutes * 60_000;
    if (!nat(ts) || !nat(endsAt)) return { ok: false, code: 'bad' };
    const lots = Object.values(this.d.auctionR47?.lots ?? {});
    if (!this.auctionCapacityR47() || lots.length >= AUCTION_R47_LIMITS.lots || lots.filter(l => l.status === 'open').length >= AUCTION_R47_LIMITS.active) return { ok: false, code: 'capacity' };
    const lotId = randomUUID();
    return this.luckyCommit(() => {
      const s = this.d.auctionR47 ??= { v: 1, lots: {}, ops: {} };
      s.lots[lotId] = { id: lotId, createdBy: actor, item: { id: item.id, slot: item.slot, price: item.price, currency: item.currency, permanent: true },
        createdAt: ts, endsAt, status: 'open', escrow: 0, bidCount: 0, history: [] };
      const result: AuctionReceiptR47 = { ok: true, dup: false, op: 'create', lotId, receiptId: lotId, status: 'open' };
      this.auctionProofR47(req, key, result); return result;
    });
  }
  bidAuctionR47(actor: string, lotId: string, amount: number, key: string): AuctionResultR47 {
    const req: AuctionRequestR47 = { op: 'bid', actor, lotId, amount };
    const auth = this.auctionAuthorizedR47(actor); if (auth) return auth;
    this.recoverAuctionsR47();
    const replay = this.auctionReplayR47(req, key); if (replay) return replay;
    const lot = this.d.auctionR47?.lots[lotId]; if (!lot) return { ok: false, code: 'missing' };
    const ts = this.now(); if (!nat(ts)) return { ok: false, code: 'bad' };
    if (ts >= lot.endsAt) return { ok: false, code: 'ended' };
    if (lot.status !== 'open') return { ok: false, code: 'terminal' };
    if (ts < lot.createdAt) return { ok: false, code: 'bad' };
    if (actor === lot.createdBy) return { ok: false, code: 'forbidden' };
    const item = this.auctionGuardsR47!.item(lot.item.id);
    if (!approvedAuctionItemR47(item) || item.currency !== lot.item.currency || item.price !== lot.item.price || item.slot !== lot.item.slot) return { ok: false, code: 'unavailable' };
    if (this.auctionGuardsR47!.canBid(actor, item) !== true) return { ok: false, code: 'ineligible' };
    const a = this.d.acc[actor], cur = lot.item.currency;
    if ((a.owned ?? []).includes(lot.item.id)) return { ok: false, code: 'owned' };
    if (amount < (lot.highest ? lot.highest.amount + 1 : Math.max(1, lot.item.price))) return { ok: false, code: 'low' };
    if (!this.auctionCapacityR47()) return { ok: false, code: 'capacity' };
    { const held0 = lot.highest?.actor === actor ? lot.escrow : 0; if (cur === 'gems' && amount > held0) this.coverGems(actor, amount - held0); }
    const have = a[cur] ?? 0, ownHeld = lot.highest?.actor === actor ? lot.escrow : 0;
    if (have + ownHeld < amount) return { ok: false, code: 'poor' };
    const previous = lot.highest, receiptId = randomUUID();
    const previousAfter = previous ? (this.d.acc[previous.actor][cur] ?? 0) + lot.escrow : 0;
    if (previous && !nat(previousAfter)) return { ok: false, code: 'overflow' };
    // CURRENT authority callbacks may read Wallet and lazily settle other lots. Recheck this lot
    // and the actual server deadline immediately before the synchronous financial draft.
    if (this.now() >= lot.endsAt || this.d.auctionR47!.lots[lotId].status !== 'open') return { ok: false, code: 'ended' };
    const result = this.luckyCommit(() => {
      const l = this.d.auctionR47!.lots[lotId];
      if (l.highest) this.auctionRefundR47(l, ts);
      const source = this.d.acc[actor]; source[cur] = (source[cur] ?? 0) - amount;
      this.rec(actor, cur, 'transfer', -amount, source[cur]!, 'حجز أعلى عرض مزاد منصة — غير قابل للصرف', `auction:${lotId}:bid:${receiptId}`, undefined, ts);
      const bid = { id: receiptId, actor, amount, at: ts, sequence: ++l.bidCount };
      l.escrow = amount; l.highest = bid; l.history.push(bid); l.history = l.history.slice(-AUCTION_R47_LIMITS.history);
      const r: AuctionReceiptR47 = { ok: true, dup: false, op: 'bid', lotId, receiptId, status: 'open', amount, sequence: l.bidCount };
      this.auctionProofR47(req, key, r); return r;
    });
    // Balance/event bridge only AFTER the single financial commit. Coins TxHook remains coins-only.
    if (previous) this.luckyNotify(previous.actor, cur, 'refund', previous.amount, previousAfter, `auction:${lotId}:refund:${previous.id}`);
    this.luckyNotify(actor, cur, 'purchase', -amount, have + ownHeld - amount, `auction:${lotId}:bid:${receiptId}`);
    this.benefitsNotify([actor, ...(previous ? [previous.actor] : [])]);
    return result;
  }
  private auctionRefundR47(lot: AuctionLotR47, ts: number): void {
    if (!lot.highest || !lot.escrow) return;
    const { actor, id } = lot.highest, cur = lot.item.currency, a = this.d.acc[actor];
    const after = (a[cur] ?? 0) + lot.escrow;
    if (!nat(after)) throw new RangeError('auction_refund_overflow');
    a[cur] = after;
    this.rec(actor, cur, 'refund', lot.escrow, after, 'فك حجز عرض مزاد المنصة', `auction:${lot.id}:refund:${id}`, undefined, ts);
    lot.escrow = 0;
  }
  /** Current catalog AND current account eligibility AND ownership are rechecked before granting. */
  private auctionCloseR47(lotId: string, cancel: boolean, request?: AuctionRequestR47, key?: string): AuctionReceiptR47 {
    const previousRecovery = this.recoveringAuctionsR47;
    this.recoveringAuctionsR47 = true;
    try { return this.auctionCloseLockedR47(lotId, cancel, request, key); }
    finally { this.recoveringAuctionsR47 = previousRecovery; }
  }
  private auctionCloseLockedR47(lotId: string, cancel: boolean, request?: AuctionRequestR47, key?: string): AuctionReceiptR47 {
    const lot = this.d.auctionR47!.lots[lotId], ts = this.now(), item = cancel ? undefined : this.auctionGuardsR47!.item(lot.item.id);
    let reason: AuctionCloseR47['reason'] = cancel ? 'cancelled' : !lot.highest ? 'no_bids' : 'winner';
    if (!cancel && lot.highest) {
      if (!approvedAuctionItemR47(item) || item.currency !== lot.item.currency || item.price !== lot.item.price || item.slot !== lot.item.slot) reason = 'unavailable';
      else if (!this.has(lot.highest.actor) || this.auctionGuardsR47!.canBid(lot.highest.actor, item) !== true) reason = 'ineligible';
      else if ((this.d.acc[lot.highest.actor].owned ?? []).includes(lot.item.id)) reason = 'owned';
    }
    const receiptId = randomUUID();
    const result = this.luckyCommit(() => {
      const l = this.d.auctionR47!.lots[lotId], high = l.highest;
      if (reason === 'winner' && high) {
        (this.d.acc[high.actor].owned ??= []).push(l.item.id);
        l.status = 'settled'; l.escrow = 0;
        l.close = { id: receiptId, at: ts, reason, paid: high.amount, winner: high.actor };
        // Funds were deducted into escrow at bid time: consume reserve, NEVER debit spendable twice.
        this.rec(high.actor, l.item.currency, 'purchase', 0, this.d.acc[high.actor][l.item.currency] ?? 0, 'تسوية الحجز ومنح عنصر المزاد مرة واحدة', `auction:${lotId}:settle:${receiptId}`, undefined, ts);
      } else {
        this.auctionRefundR47(l, ts);
        l.status = cancel ? 'cancelled' : reason === 'no_bids' ? 'expired' : 'refunded';
        l.close = { id: receiptId, at: ts, reason, paid: 0 };
      }
      const r: AuctionReceiptR47 = { ok: true, dup: false, op: cancel ? 'cancel' : 'settle', lotId, receiptId, status: l.status };
      if (request && key) this.auctionProofR47(request, key, r);
      return r;
    });
    if (lot.highest) {
      if (reason !== 'winner') this.luckyNotify(lot.highest.actor, lot.item.currency, 'refund', lot.highest.amount, this.d.acc[lot.highest.actor][lot.item.currency] ?? 0, `auction:${lotId}:refund:${lot.highest.id}`);
      this.benefitsNotify([lot.highest.actor]);
    }
    return result;
  }
  cancelAuctionR47(actor: string, lotId: string, key: string): AuctionResultR47 {
    const req: AuctionRequestR47 = { op: 'cancel', actor, lotId };
    const auth = this.auctionAuthorizedR47(actor, true); if (auth) return auth;
    this.recoverAuctionsR47();
    const replay = this.auctionReplayR47(req, key); if (replay) return replay;
    const lot = this.d.auctionR47?.lots[lotId]; if (!lot) return { ok: false, code: 'missing' };
    if (lot.status !== 'open') return { ok: false, code: 'terminal' };
    const ts = this.now(); if (!nat(ts) || ts < lot.createdAt) return { ok: false, code: 'bad' };
    if (ts >= lot.endsAt) return { ok: false, code: 'ended' };
    return this.auctionCloseR47(lotId, true, req, key);
  }
  settleAuctionR47(actor: string, lotId: string, key: string): AuctionResultR47 {
    const req: AuctionRequestR47 = { op: 'settle', actor, lotId };
    const auth = this.auctionAuthorizedR47(actor); if (auth) return auth;
    const replay = this.auctionReplayR47(req, key); if (replay) return replay;
    const lot = this.d.auctionR47?.lots[lotId]; if (!lot) return { ok: false, code: 'missing' };
    const ts = this.now(); if (!nat(ts) || ts < lot.createdAt) return { ok: false, code: 'bad' };
    if (ts < lot.endsAt) return { ok: false, code: 'early' };
    if (lot.status !== 'open') {
      if (!lot.close) return { ok: false, code: 'terminal' };
      if (!this.auctionCapacityR47()) return { ok: false, code: 'capacity' };
      return this.luckyCommit(() => {
        const result: AuctionReceiptR47 = { ok: true, dup: false, op: 'settle', lotId, receiptId: lot.close!.id, status: lot.status };
        this.auctionProofR47(req, key, result); return result;
      });
    }
    return this.auctionCloseR47(lotId, false, req, key);
  }
  /** No timer. Deferred until injected CURRENT authorities exist; failure leaves escrow intact and retryable. */
  recoverAuctionsR47(): { settled: string[]; pending: string[] } {
    const result = { settled: [] as string[], pending: [] as string[] }, ts = this.now();
    if (!this.auctionGuardsR47 || this.recoveringAuctionsR47 || !nat(ts)) return result;
    this.recoveringAuctionsR47 = true;
    try {
      for (const lot of Object.values(this.d.auctionR47?.lots ?? {}).filter(l => l.status === 'open' && ts >= l.endsAt).slice(0, AUCTION_R47_LIMITS.active)) {
        try { this.auctionCloseR47(lot.id, false); result.settled.push(lot.id); }
        catch { result.pending.push(lot.id); }
      }
    } finally { this.recoveringAuctionsR47 = false; }
    return result;
  }
  auctionViewR47(actor: string, lotId: string) {
    this.recoverAuctionsR47();
    if (!uuid(lotId) || !Object.hasOwn(this.d.auctionR47?.lots ?? {}, lotId)) return null;
    const lot = this.d.auctionR47?.lots[lotId];
    return lot ? { ...auctionViewR47(lot, actor), serverNow: this.now(), settlementPending: lot.status === 'open' && this.now() >= lot.endsAt } : null;
  }
  listAuctionsR47(actor: string, offset = 0, limit = 30) {
    this.recoverAuctionsR47();
    if (!nat(offset) || !pos(limit) || limit > AUCTION_R47_LIMITS.page) return { serverNow: this.now(), total: 0, lots: [] };
    const rows = Object.values(this.d.auctionR47?.lots ?? {}).sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
    return { serverNow: this.now(), total: rows.length, lots: rows.slice(offset, offset + limit).map(l => ({ ...auctionViewR47(l, actor), settlementPending: l.status === 'open' && this.now() >= l.endsAt })) };
  }
  /** Caller holds SocialRooms authorization lock and supplies only the canonical approved offer. */
  createLuckyBag(from: string, room: string, offer: LuckyBagOffer, count: number, delay: 0 | 300, key: string): LuckyBagCreateResult {
    const request: LuckyRequest = { op: 'create', actor: from, room, offer, count, delay };
    const replay = this.luckyReplay(request, key); if (replay) return replay as LuckyBagCreateResult;
    if (!this.has(from)) return { ok: false, code: 'noto' };
    const ts = this.now(), opensAt = ts + delay * 1000, expiresAt = opensAt + 600_000;
    if (!nat(ts) || !nat(opensAt) || !nat(expiresAt)) return { ok: false, code: 'bad' };
    const total = bagUnit(offer) * count, cur = bagCur(offer), a = this.d.acc[from];
    if (cur === 'gems') this.coverGems(from, total);
    const have = cur === 'coins' ? a.coins : a.gems ?? 0;
    if (have < total) return { ok: false, code: 'poor' };
    const bagId = randomUUID();
    const result = this.luckyCommit((): LuckyBagCreateReceipt => {
      const sender = this.d.acc[from];
      if (cur === 'coins') sender.coins -= total; else sender.gems = (sender.gems ?? 0) - total;
      this.rec(from, cur, 'transfer', -total, have - total, 'تمويل حقيبة حظ بالتوزيع المتساوي', `lucky:${bagId}:create`, undefined, ts);
      this.d.luckyBags = { ...this.d.luckyBags, [bagId]: { id: bagId, senderId: from, room, offer: structuredClone(offer), count, total, reserve: total, createdAt: ts, opensAt, expiresAt, claims: [] } };
      const receipt: LuckyBagCreateReceipt = { ok: true, dup: false, bagId, coins: sender.coins, gems: sender.gems ?? 0 };
      this.luckyProof(request, key, receipt); return receipt;
    });
    this.luckyNotify(from, cur, 'gift', -total, have - total, `lucky:${bagId}:create`);
    this.benefitsNotify([from]);
    return result;
  }
  /** Item eligibility (current catalog/level/VIP/NOBLE) MUST be authorized by parent at claim time. */
  claimLuckyBag(recipient: string, bagId: string, key: string, opt: { itemEligible?: boolean } = {}): LuckyBagClaimResult {
    const request: LuckyRequest = { op: 'claim', actor: recipient, bagId };
    if (!isObj(opt) || Object.keys(opt).some((k) => k !== 'itemEligible') || !optional(opt.itemEligible, (x) => typeof x === 'boolean')) return { ok: false, code: 'bad' };
    const replay = this.luckyReplay(request, key); if (replay) return replay as LuckyBagClaimResult;
    if (!this.has(recipient)) return { ok: false, code: 'noto' };
    const bag = this.d.luckyBags?.[bagId]; if (!bag) return { ok: false, code: 'missing' };
    if (recipient === bag.senderId) return { ok: false, code: 'self' };
    if (bag.claims.some((c) => c.recipient === recipient)) return { ok: false, code: 'claimed' };
    const ts = this.now(); if (!nat(ts)) return { ok: false, code: 'bad' };
    if (ts < bag.opensAt) return { ok: false, code: 'early' };
    if (ts >= bag.expiresAt) return { ok: false, code: 'expired' };
    if (bag.claims.length >= bag.count || !bag.reserve) return { ok: false, code: 'full' };
    const offer = bag.offer, unit = bagUnit(offer), cur = bagCur(offer), a = this.d.acc[recipient];
    if (offer.type === 'item') {
      if ((a.owned ?? []).includes(offer.id)) return { ok: false, code: 'owned' };
      if (opt.itemEligible !== true) return { ok: false, code: 'ineligible' };
    }
    if (offer.type === 'coins' && !nat(a.coins + unit)) return { ok: false, code: 'overflow' };
    const claimId = randomUUID(), creditId = offer.type === 'gift' ? randomUUID() : undefined;
    const result = this.luckyCommit((): LuckyBagClaimReceipt => {
      const b = this.d.luckyBags![bagId], target = this.d.acc[recipient];
      b.reserve -= unit; b.claims.push({ id: claimId, recipient, at: ts, ...(creditId ? { creditId } : {}) });
      if (offer.type === 'coins') target.coins += unit;
      else if (offer.type === 'item') (target.owned ??= []).push(offer.id);
      else target.prepaidGifts = { ...target.prepaidGifts, [creditId!]: { id: creditId!, bagId, gift: { id: offer.id, name: offer.name, icon: offer.icon, price: offer.price }, qty: 1, remaining: 1, value: unit } };
      this.rec(recipient, cur, 'transfer', offer.type === 'coins' ? unit : 0, cur === 'coins' ? target.coins : target.gems ?? 0,
        offer.type === 'coins' ? 'حصة عملات حقيبة حظ ممولة' : offer.type === 'item' ? `ملكية غرض ممول من حقيبة حظ: ${offer.id}` : `حق هدية مسبقة الدفع ممول بقيمة ${unit} جوهرة`, `lucky:${bagId}:claim:${claimId}`, undefined, ts);
      const receipt: LuckyBagClaimReceipt = { ok: true, dup: false, bagId, claimId, type: offer.type, amount: unit, cur, coins: target.coins, gems: target.gems ?? 0,
        ...(offer.type === 'item' ? { itemId: offer.id } : {}), ...(creditId ? { creditId } : {}) };
      this.luckyProof(request, key, receipt); return receipt;
    });
    if (offer.type === 'coins') this.luckyNotify(recipient, cur, 'gift', unit, result.coins, `lucky:${bagId}:claim:${claimId}`);
    this.benefitsNotify([recipient, bag.senderId]);
    return result;
  }
  /** Bounded durable refunds; any failed or overflowing refund leaves its entire reserve retryable. */
  settleExpiredLuckyBags(limit = 100): { refunded: string[]; pending: string[] } {
    const refunded: string[] = [], pending: string[] = [];
    const ts = this.now(); if (this.settlingLucky || !nat(limit) || limit < 1 || limit > 1000 || !nat(ts)) return { refunded, pending };
    this.settlingLucky = true;
    try {
    const expired = Object.values(this.d.luckyBags ?? {}).filter((b) => b.reserve > 0 && ts >= b.expiresAt).slice(0, limit);
    for (const candidate of expired) {
      const bag = this.d.luckyBags?.[candidate.id];
      if (!bag || !bag.reserve || bag.refund) continue;
      const cur = bagCur(bag.offer), sender = this.d.acc[bag.senderId], before = cur === 'coins' ? sender.coins : sender.gems ?? 0;
      if (!nat(before + bag.reserve)) { pending.push(bag.id); continue; }
      const amount = bag.reserve, ref = JSON.stringify(['refund', bag.id]);
      try {
        this.luckyCommit(() => {
          const b = this.d.luckyBags![bag.id], a = this.d.acc[bag.senderId];
          if (cur === 'coins') a.coins += amount; else a.gems = (a.gems ?? 0) + amount;
          b.reserve = 0; b.refund = { id: ref, at: ts, amount };
          this.rec(bag.senderId, cur, 'refund', amount, before + amount, 'استرجاع الجزء غير المستلم من حقيبة الحظ', ref, undefined, ts);
        });
        refunded.push(bag.id); this.luckyNotify(bag.senderId, cur, 'refund', amount, before + amount, ref);
        this.benefitsNotify([bag.senderId]);
      } catch { pending.push(bag.id); }
    }
    return { refunded, pending };
    } finally { this.settlingLucky = false; }
  }
  /** Server-only clones; parent projects internal sender/room identity, never exposes this object raw. */
  luckyBagView(bagId: string, viewer?: string): LuckyBagView | null {
    this.settleExpiredLuckyBags();
    if (!uuid(bagId)) return null;
    const b = this.d.luckyBags?.[bagId]; return b ? this.luckyView(b, viewer) : null;
  }
  private luckyView(b: LuckyBag, viewer?: string): LuckyBagView {
    const ts = this.now();
    return structuredClone({ id: b.id, senderId: b.senderId, room: b.room, offer: b.offer, count: b.count, total: b.total, reserve: b.reserve,
      createdAt: b.createdAt, opensAt: b.opensAt, expiresAt: b.expiresAt, remaining: b.count - b.claims.length, claimed: b.claims.some((c) => c.recipient === viewer),
      status: ts >= b.expiresAt ? 'expired' : b.claims.length === b.count ? 'full' : ts < b.opensAt ? 'scheduled' : 'open', refunded: b.refund?.amount ?? 0 });
  }
  listLuckyBags(room: string, viewer?: string): LuckyBagView[] {
    this.settleExpiredLuckyBags();
    return Object.values(this.d.luckyBags ?? {}).filter((b) => b.room === room).sort((a, b) => b.createdAt - a.createdAt).map((b) => this.luckyView(b, viewer));
  }
  prepaidGiftInventory(id: string): PrepaidGiftCredit[] {
    return structuredClone(Object.values(this.d.acc[id]?.prepaidGifts ?? {}).filter((c) => c.remaining > 0));
  }
  /** A funded right, not a fresh gem debit. New consumption always uses the R13 coin rewards. */
  redeemPrepaidGift(from: string, to: string, creditId: string, key: string, fromName: string, toName: string, opt: { room?: string } = {}): PrepaidGiftRedeemResult {
    if (!isObj(opt) || Object.keys(opt).some((k) => k !== 'room') || !optional(opt.room, (x) => str(x) && x.length <= 160)) return { ok: false, code: 'bad' };
    if (from === to) return { ok: false, code: 'self' };
    const room = opt.room ?? '', request: LuckyRequest = { op: 'redeem', actor: from, to, creditId, fromName, toName, room };
    const replay = this.luckyReplay(request, key); if (replay) return replay as PrepaidGiftRedeemResult;
    if (!this.has(from) || !this.has(to)) return { ok: false, code: 'noto' };
    const credit = this.d.acc[from].prepaidGifts?.[creditId];
    if (!credit) return { ok: false, code: 'missing' };
    if (!credit.remaining) return { ok: false, code: 'empty' };
    const ts = this.now(); if (!nat(ts)) return { ok: false, code: 'bad' };
    const gift = credit.gift, quote = quoteGiftRewards(credit.value);
    if (!quote) return { ok: false, code: 'overflow' };
    const { recv, house, senderBonus } = quote, a = this.d.acc[from], b = this.d.acc[to];
    const sent = a.gSent ?? (a.gifts ?? []).filter((g) => g.dir === 'out').length, received = b.gRecv ?? (b.gifts ?? []).filter((g) => g.dir === 'in').length;
    if (!nat(a.coins + senderBonus) || !nat(b.coins + recv) || !nat((this.d.house?.gems ?? 0) + house) || !nat((this.d.house?.count ?? 0) + 1)
      || !nat(sent + 1) || !nat(received + 1) || !nat((this.d.giftStats?.[gift.id] ?? 0) + 1)) return { ok: false, code: 'overflow' };
    const rec: PrepaidGiftRec = { id: randomUUID(), ts, from, fromName, to, toName, gift: gift.id, name: gift.name, icon: gift.icon, price: gift.price,
      qty: 1, total: credit.value, recv, house, senderBonus, rewardPolicy: quote.policy, rewardCur: quote.rewardCur,
      ...(room ? { room } : {}), status: 'done', cur: 'gems', prepaid: true, creditId, dir: 'out' };
    const release = this.onBeforeGift?.(from, to, rec.id, ts);
    try {
    const result = this.luckyCommit((): PrepaidGiftRedeemReceipt => {
      const sender = this.d.acc[from], target = this.d.acc[to], c = sender.prepaidGifts![creditId];
      c.remaining = 0; c.value = 0; sender.coins += senderBonus; target.coins += recv;
      this.rec(from, 'gems', 'gift', 0, sender.gems ?? 0, `استهلاك حق هدية مسبقة الدفع بقيمة ${rec.total} جوهرة: ${gift.name}`, gift.id, rec.id, ts);
      this.rec(from, 'coins', 'gift', senderBonus, sender.coins, 'مكافأة إرسال هدية مسبقة الدفع: ' + gift.name, gift.id, rec.id, ts);
      this.rec(to, 'coins', 'gift', recv, target.coins, 'عائد هدية مسبقة الدفع مستلمة: ' + gift.name, gift.id, rec.id, ts);
      (sender.gifts ??= []).push(structuredClone(rec)); (target.gifts ??= []).push({ ...rec, dir: 'in' });
      sender.gSent = sent + 1; target.gRecv = received + 1;
      for (const acc of [sender, target]) if (acc.gifts!.length > GIFTS_CAP) acc.gifts!.splice(0, acc.gifts!.length - GIFTS_CAP);
      const h = (this.d.house ??= { coins: 0, count: 0, ledger: [] });
      h.gems = (h.gems ?? 0) + house; h.count++;
      h.ledger.push({ id: randomUUID(), ts, kind: 'gift_share', cur: 'gems', rewardPolicy: quote.policy, delta: house, after: h.gems, tx: rec.id, from, to, gift: gift.id, qty: 1, total: rec.total!, room });
      if (h.ledger.length > HOUSE_LEDGER_CAP) h.ledger.splice(0, h.ledger.length - HOUSE_LEDGER_CAP);
      this.d.giftStats = { ...this.d.giftStats, [gift.id]: (this.d.giftStats?.[gift.id] ?? 0) + 1 };
      const receipt: PrepaidGiftRedeemReceipt = { ok: true, dup: false, creditId, coins: sender.coins, gems: sender.gems ?? 0, toGems: target.gems ?? 0, toCoins: target.coins, rec };
      this.luckyProof(request, key, receipt); return receipt;
    });
    this.luckyNotify(from, 'coins', 'gift', senderBonus, result.coins, gift.id);
    this.luckyNotify(to, 'coins', 'gift', recv, result.toCoins!, gift.id);
    try { this.onGift?.(from, to, rec.id); } catch { /* canonical financial proof already committed */ }
    this.benefitsNotify([from, to]);
    return result;
    } finally { release?.(); }
  }
  /** Explicitly approved manual owner-funded gem reward; parent verifies owner + both room members. */
  sendRoomReward(from: string, to: string, amount: number, key: string, roomId: string): RoomRewardResult {
    if (from === to) return { ok: false, code: 'self' };
    const request: LuckyRequest = { op: 'roomReward', actor: from, to, amount, room: roomId };
    const replay = this.luckyReplay(request, key); if (replay) return replay as RoomRewardResult;
    if (!this.has(from) || !this.has(to)) return { ok: false, code: 'noto' };
    const ts = this.now(); if (!nat(ts)) return { ok: false, code: 'bad' };
    const a = this.d.acc[from], b = this.d.acc[to];
    this.coverGems(from, amount);
    if ((a.gems ?? 0) < amount) return { ok: false, code: 'poor' };
    if (!nat((b.gems ?? 0) + amount)) return { ok: false, code: 'overflow' };
    const rewardId = randomUUID(), ref = `roomReward:${rewardId}`;
    const result = this.luckyCommit((): RoomRewardReceipt => {
      const sender = this.d.acc[from], target = this.d.acc[to];
      sender.gems = (sender.gems ?? 0) - amount; target.gems = (target.gems ?? 0) + amount;
      this.rec(from, 'gems', 'transfer', -amount, sender.gems, 'مكافأة غرفة يدوية ممولة من المالك (100%)', ref, undefined, ts);
      this.rec(to, 'gems', 'transfer', amount, target.gems, 'مكافأة غرفة يدوية مستلمة من المالك (100%)', ref, undefined, ts);
      const result: RoomRewardReceipt = { ok: true, dup: false, rewardId, coins: sender.coins, gems: sender.gems, toGems: target.gems };
      this.luckyProof(request, key, result); return result;
    });
    this.benefitsNotify([from, to]);
    return result;
  }
  /**
   * يُنادى قبل قراءة الكتالوج/فحص السعر: null = طلب جديد، bad = تعارض، dup = نُفّذ سابقاً.
   * هوية الشراء (kind,itemId) ثابتة؛ تعديل/تعطيل الكتالوج لاحقاً لا يمنع إعادة نتيجة العملية المنفذة.
   * conversion يستخدم itemId=JSON.stringify([gems,rate])، ولا يُوثق أي معدل مرسل من العميل.
   * legacy buys لا يحمل نوعاً: gems-* ملتبس ولذلك يرفض استخدام مفتاحه بلا خصم جديد ولا dup كاذب.
   */
  replayBuy(id: string, key: string, kind: BuyKind, itemId: string): BuyResult | null {
    if (kind === 'gems' || kind === 'conversion') return this.replayManualConversion(id, key, kind, itemId);
    if (!this.validKey(id, key) || !str(itemId) || !itemId || !['item', 'gems', 'conversion'].includes(kind)) return { ok: false, code: 'bad' };
    const op = this.d.buyOps?.[this.opKey(id, key)];
    if (op) {
      if (op.kind !== kind || op.itemId !== itemId) return { ok: false, code: 'bad' };
      const a = this.a(id); return { ok: true, dup: true, coins: a.coins, gems: a.gems ?? 0 };
    }
    const legacy = this.d.buys?.[id + ':' + key];
    if (legacy !== undefined) {
      if (legacy.startsWith('gems-') || kind !== 'item' || legacy !== itemId) return { ok: false, code: 'bad' };
      const a = this.a(id); return { ok: true, dup: true, coins: a.coins, gems: a.gems ?? 0 };
    }
    return null;
  }
  /** Read-only durable proof: exact actor/key/kind/request, never this.a(), save(), hooks or migration.
   * The receipt is the stored operation verbatim; top-level balances are current canonical balances,
   * not invented historical balances. Untyped old buys remain ambiguous and fail closed.
   */
  replayManualConversion(id: string, key: string, kind: 'gems' | 'conversion', itemId: string): ManualConversionResult | null {
    if (!this.validKey(id, key) || !str(itemId) || !itemId || !['gems', 'conversion'].includes(kind)) return { ok: false, code: 'bad' };
    const op = this.d.buyOps?.[this.opKey(id, key)];
    if (op) {
      const a = this.d.acc[id];
      if (op.kind !== kind || op.itemId !== itemId || !Object.hasOwn(this.d.acc, id) || !a) return { ok: false, code: 'bad' };
      return { ok: true, dup: true, coins: a.coins, gems: a.gems ?? 0, receipt: structuredClone(op) as ManualConversionReceipt };
    }
    if (this.d.buys?.[id + ':' + key] !== undefined) return { ok: false, code: 'bad' };
    return null;
  }
  /**
   * شراء عنصر من المتجر. الخادم هو اللي يتحقق من السعر (من الكتالوج) والرصيد والملكية.
   * key = مفتاح طلب فريد من العميل: إعادة إرسال نفس الطلب ما تخصم مرة ثانية. العملية كلها (خصم + ملكية + سجل) تنحفظ بملف واحد أو تتراجع.
   */
  buy(id: string, item: ShopItemRef, key: string, days = 0): BuyResult {
    const replay = this.replayBuy(id, key, 'item', item?.id); if (replay) return replay;
    // عنصر مجاني بسعر صفر يستخدم الملكية والسجل والمفتاح أنفسها، دون منح عملات.
    if (!nat(item.price)) return { ok: false, code: 'bad' };
    // خط دفاع أخير: عملة معروفة وسعر ضمن السقف حتى لو ملف المتجر تعدّل يدوياً أو بخلل
    if ((item.currency !== 'coins' && item.currency !== 'gems') || item.price > SHOP_PRICE_MAX[item.currency]) return { ok: false, code: 'bad' };
    const k = this.opKey(id, key);
    const a = this.a(id);
    const timedNow = a.exp?.[item.id] !== undefined;
    if (!Number.isSafeInteger(days) || days < 0 || days > 365) return { ok: false, code: 'bad' };
    if (item.permanent && (a.owned ?? []).includes(item.id) && !timedNow) return { ok: false, code: 'owned' };
    if (item.currency === 'gems') this.coverGems(id, item.price);
    const bal = item.currency === 'coins' ? a.coins : (a.gems ?? 0);
    if (bal < item.price) return { ok: false, code: 'poor' };
    const sn = this.snap([id]); const opsBefore = this.d.buyOps;
    if (item.currency === 'coins') a.coins -= item.price; else a.gems = (a.gems ?? 0) - item.price;
    const expBefore = a.exp ? { ...a.exp } : undefined;
    if (!(a.owned ?? []).includes(item.id)) (a.owned ??= []).push(item.id);
    if (days > 0) { const base = Math.max(this.now(), a.exp?.[item.id] ?? 0); (a.exp ??= {})[item.id] = base + days * 86_400_000; }
    else if (a.exp) { delete a.exp[item.id]; if (!Object.keys(a.exp).length) delete a.exp; }
    this.rec(id, item.currency, 'purchase', -item.price, item.currency === 'coins' ? a.coins : a.gems!, days > 0 ? `شراء من المتجر (${days === 1 ? 'يوم' : days + ' أيام'})` : 'شراء من المتجر', item.id);
    this.d.buyOps = { ...opsBefore, [k]: { kind: 'item', itemId: item.id, cur: item.currency, price: item.price } };
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); this.d.buyOps = opsBefore; if (expBefore) a.exp = expBefore; else delete a.exp; throw e; }
    if (item.currency === 'coins') this.onTx?.(id, 'purchase', -item.price, a.coins, item.id);
    return { ok: true, dup: false, coins: a.coins, gems: a.gems ?? 0 };
  }
  /**
   * Closed manual coins→gems conversion. Only an exact committed receipt may be replayed.
   * Complimentary/cash packs use Payments + grant(), not this historical API.
   */
  buyGems(id: string, packId: string, key: string): ManualConversionResult & { pack?: { id: string; gems: number; coins: number } } {
    const replay = this.replayManualConversion(id, key, 'gems', packId);
    if (replay?.ok) return { ...replay, pack: { id: replay.receipt.itemId, gems: replay.receipt.gems, coins: replay.receipt.coins } };
    return replay ?? { ok: false, code: MANUAL_CONVERSION_DISABLED };
  }
  /** Closed manual gems→coins conversion, including trusted/forged explicit rates. */
  convertGems(id: string, gems: number, key: string, rate?: number | null): ManualConversionResult {
    const replay = this.replayManualConversion(id, key, 'conversion', JSON.stringify([gems, rate]));
    return replay ?? { ok: false, code: MANUAL_CONVERSION_DISABLED };
  }
  /**
   * إرسال هدية (qty من نفس الهدية) من لاعب للاعب، داخل غرفة أو من المتجر.
   * R13: debit full gems, credit recipient coins and sender coin bonus, consume full gems into house.
   * All balances, ledgers, counters and permanent receipt commit in the same existing Wallet store.
   * Historical keys never become fresh sends, even when their capped display receipt is gone.
   */
  sendGift(from: string, to: string, gift: { id: string; name: string; icon: string; price: number }, key: string, fromName: string, toName: string, opt: { qty?: number; room?: string } = {}): GiftSendResult {
    if (this.preparingGiftBatch) return { ok: false, code: 'bad' };
    if (!isObj(opt) || Object.keys(opt).some((k) => k !== 'qty' && k !== 'room') || !optional(opt.room, str)
      || !this.validKey(from, key) || !str(to) || !to || !isObj(gift) || !fields(gift, ['id', 'name', 'icon'], str)
      || !gift.id || !str(fromName) || !str(toName)) return { ok: false, code: 'bad' };
    const qty = opt.qty ?? 1, room = opt.room ?? '';
    if (!pos(qty)) return { ok: false, code: 'bad' };
    if (from === to) return { ok: false, code: 'self' };
    if (this.d.giftBatches?.[this.opKey(from, key)]) return { ok: false, code: 'bad' };
    const k = this.opKey(from, key), prev = this.d.giftKeys?.[k] ?? this.d.giftKeys?.[from + ':' + key];
    if (prev) {
      const rec = this.giftByKey(from, key);
      if (!rec || prev.to !== to || prev.gift !== gift.id || (prev.qty ?? 1) !== qty || (prev.room ?? '') !== room
        || rec.rewardPolicy && (rec.price !== gift.price || rec.name !== gift.name || rec.icon !== gift.icon || rec.fromName !== fromName || rec.toName !== toName)) return { ok: false, code: 'bad' };
      return { ok: true, dup: true, coins: this.balance(from), gems: this.gems(from), toCoins: this.balance(to), toGems: this.gems(to), rec };
    }
    const quote = quoteGiftRewards(gift.price, qty);
    if (!quote || gift.price > GIFT_GEMS_MAX || quote.total > GIFT_GEMS_MAX) return { ok: false, code: 'bad' };
    if (!this.has(from) || !this.has(to)) return { ok: false, code: 'noto' };
    this.coverGems(from, quote.total);
    const a = this.d.acc[from], b = this.d.acc[to], { total, recv, house, senderBonus } = quote;
    if ((a.gems ?? 0) < total) return { ok: false, code: 'poor' };
    const ts = this.now(); if (!nat(ts)) return { ok: false, code: 'bad' };
    const sent = a.gSent ?? (a.gifts ?? []).filter((g) => g.dir === 'out').length;
    const received = b.gRecv ?? (b.gifts ?? []).filter((g) => g.dir === 'in').length;
    if (!nat(a.coins + senderBonus) || !nat(b.coins + recv) || !nat((this.d.house?.gems ?? 0) + house) || !nat((this.d.house?.count ?? 0) + 1)
      || !nat(sent + 1) || !nat(received + 1) || !nat((this.d.giftStats?.[gift.id] ?? 0) + qty)) return { ok: false, code: 'bad' };
    const out: GiftRec = { id: randomUUID(), ts, from, fromName, to, toName, gift: gift.id, name: gift.name, icon: gift.icon, price: gift.price,
      qty, total, recv, house, cur: quote.cur, rewardCur: quote.rewardCur, senderBonus, rewardPolicy: quote.policy, ...(room ? { room } : {}), status: 'done', dir: 'out' };
    const release = this.onBeforeGift?.(from, to, out.id, ts);
    try {
      const result = this.luckyCommit((): Extract<GiftSendResult, { ok: true }> => {
        const sender = this.d.acc[from], target = this.d.acc[to], label = qty > 1 ? `${gift.name} ×${qty}` : gift.name;
        sender.gems = (sender.gems ?? 0) - total; sender.coins += senderBonus; target.coins += recv;
        this.rec(from, 'gems', 'gift', -total, sender.gems, 'هدية مرسلة: ' + label, gift.id, out.id, ts);
        this.rec(from, 'coins', 'gift', senderBonus, sender.coins, 'مكافأة إرسال هدية: ' + label, gift.id, out.id, ts);
        this.rec(to, 'coins', 'gift', recv, target.coins, 'عائد هدية مستلمة: ' + label, gift.id, out.id, ts);
        (sender.gifts ??= []).push(structuredClone(out)); (target.gifts ??= []).push({ ...out, dir: 'in' });
        sender.gSent = sent + 1; target.gRecv = received + 1;
        for (const acc of [sender, target]) if (acc.gifts!.length > GIFTS_CAP) acc.gifts!.splice(0, acc.gifts!.length - GIFTS_CAP);
        const h = (this.d.house ??= { coins: 0, count: 0, ledger: [] });
        h.gems = (h.gems ?? 0) + house; h.count++;
        h.ledger.push({ id: randomUUID(), ts, kind: 'gift_share', cur: 'gems', rewardPolicy: quote.policy, delta: house, after: h.gems, tx: out.id, from, to, gift: gift.id, qty, total, room });
        if (h.ledger.length > HOUSE_LEDGER_CAP) h.ledger.splice(0, h.ledger.length - HOUSE_LEDGER_CAP);
        this.d.giftStats = { ...this.d.giftStats, [gift.id]: (this.d.giftStats?.[gift.id] ?? 0) + qty };
        this.d.giftKeys = { ...this.d.giftKeys, [k]: { to, gift: gift.id, rid: out.id, qty, ...(room ? { room } : {}), rec: structuredClone(out) } };
        return { ok: true, dup: false, coins: sender.coins, gems: sender.gems, toCoins: target.coins, toGems: target.gems ?? 0, rec: out };
      });
      this.luckyNotify(from, 'coins', 'gift', senderBonus, result.coins, gift.id);
      this.luckyNotify(to, 'coins', 'gift', recv, result.toCoins, gift.id);
      this.benefitsNotify([from, to]);
      this.onGift?.(from, to, out.id);
      return result;
    } finally { release?.(); }
  }
  /** Before current catalogue/price/confirmation lookup: null=new, bad=identity conflict, dup=original full batch.
   * Identity is actor/key + canonical audience + gift ID + quantity PER recipient + trusted room scope.
   * No account accessor, save, hook, receipt migration, or current catalogue is involved in replay.
   */
  replayGiftBatch(from: string, targets: string[], giftId: string, qty: number, key: string, room: string): GiftBatchResult | null {
    const canonical = canonicalGiftBatchTargets(from, targets);
    if (!Array.isArray(canonical)) return canonical;
    if (!this.validKey(from, key) || !internalId(giftId) || !pos(qty) || qty > GIFT_BATCH_QUANTITY_MAX || !str(room) || room.length > 160) return { ok: false, code: 'bad' };
    const k = this.opKey(from, key);
    if (this.d.giftKeys?.[k] || this.d.giftKeys?.[from + ':' + key]) return { ok: false, code: 'bad' };
    const proof = this.d.giftBatches?.[k];
    if (!proof) return null;
    const request: GiftBatchRequest = { from, targets: canonical, gift: giftId, qty, room };
    const identity = (r: GiftBatchRequest) => JSON.stringify([r.from, r.targets, r.gift, r.qty, r.room]);
    if (identity(request) !== identity(proof.request)) return { ok: false, code: 'bad' };
    return structuredClone({ ...proof.result, dup: true });
  }
  /** Caller holds ONE SocialRooms all-target authorization lock; this synchronous method never takes that lock.
   * Allocate ordinary child receipts, PREPARE all outbox intents, then use the existing whole-Wallet draft
   * and Persister exactly once. A failing preparation or persistence leaves no partial financial proof.
   */
  sendGiftBatch(from: string, targets: string[], gift: GiftBatchOffer, qty: number, key: string, room: string, fromName: string, toNames: Record<string, string>, opt: GiftBatchOptions = {}): GiftBatchResult {
    if (this.preparingGiftBatch) return { ok: false, code: 'bad' };
    const replay = this.replayGiftBatch(from, targets, gift?.id, qty, key, room); if (replay) return replay;
    if (!isObj(gift) || !fields(gift, ['id', 'name', 'icon'], str) || !str(fromName) || fromName.length > 200
      || gift.name.length > 200 || gift.icon.length > 200 || !isObj(toNames) || !isObj(opt)
      || Object.keys(opt).some(k => k !== 'beforeCommit') || !optional(opt.beforeCommit, v => typeof v === 'function')) return { ok: false, code: 'bad' };
    const canonical = canonicalGiftBatchTargets(from, targets); if (!Array.isArray(canonical)) return canonical;
    if (!canonical.every(id => Object.hasOwn(toNames, id) && str(toNames[id]) && toNames[id].length <= 200)) return { ok: false, code: 'bad' };
    const quote = quoteGiftBatch(gift.price, qty, canonical.length); if (!quote) return { ok: false, code: 'bad' };
    if (!this.has(from) || !canonical.every(id => this.has(id))) return { ok: false, code: 'noto' };
    const a = this.d.acc[from], count = canonical.length, per = quote.perRecipient;
    this.coverGems(from, quote.total);
    if ((a.gems ?? 0) < quote.total) return { ok: false, code: 'poor' };
    const ts = this.now(); if (!nat(ts)) return { ok: false, code: 'bad' };
    const sent = a.gSent ?? (a.gifts ?? []).filter(g => g.dir === 'out').length;
    const received = canonical.map(id => this.d.acc[id].gRecv ?? (this.d.acc[id].gifts ?? []).filter(g => g.dir === 'in').length);
    if (!nat(a.coins + quote.senderBonus) || !nat((this.d.house?.gems ?? 0) + quote.house) || !nat((this.d.house?.count ?? 0) + count)
      || !nat(sent + count) || !nat((this.d.giftStats?.[gift.id] ?? 0) + qty * count)
      || !canonical.every((id, i) => nat(this.d.acc[id].coins + per.recv) && nat(received[i] + 1))) return { ok: false, code: 'bad' };
    const offer = structuredClone(gift), batchId = randomUUID();
    const outs: GiftRec[] = canonical.map(to => ({ id: randomUUID(), ts, from, fromName, to, toName: toNames[to], gift: offer.id,
      name: offer.name, icon: offer.icon, price: offer.price, qty, total: per.total, recv: per.recv, house: per.house,
      cur: per.cur, rewardCur: per.rewardCur, senderBonus: per.senderBonus, rewardPolicy: per.policy,
      ...(room ? { room } : {}), status: 'done', dir: 'out' }));
    const request: GiftBatchRequest = { from, targets: canonical, gift: offer.id, qty, room }, releases: (() => void)[] = [];
    const prepare = opt.beforeCommit as GiftBatchOptions['beforeCommit'], existingPrepare = this.onBeforeGift;
    this.preparingGiftBatch = true;
    let result: GiftBatchReceipt;
    try {
      // Never expose a financial draft to outbox hooks; every child is absent until ALL commit.
      for (const out of outs) {
        const release = prepare ? prepare(Object.freeze(structuredClone(out))) : existingPrepare?.(from, out.to, out.id, ts);
        if (typeof release === 'function') releases.push(release);
        else if (release !== undefined) throw new TypeError('gift_batch_prepare_must_be_synchronous');
      }
      result = this.luckyCommit((): GiftBatchReceipt => {
        const sender = this.d.acc[from], label = qty > 1 ? `${offer.name} ×${qty}` : offer.name;
        const children: GiftBatchReceipt['receipts'] = [];
        for (const [i, out] of outs.entries()) {
          const target = this.d.acc[out.to];
          sender.gems = (sender.gems ?? 0) - per.total; sender.coins += per.senderBonus; target.coins += per.recv;
          this.rec(from, 'gems', 'gift', -per.total, sender.gems, 'هدية مرسلة: ' + label, offer.id, out.id, ts);
          this.rec(from, 'coins', 'gift', per.senderBonus, sender.coins, 'مكافأة إرسال هدية: ' + label, offer.id, out.id, ts);
          this.rec(out.to, 'coins', 'gift', per.recv, target.coins, 'عائد هدية مستلمة: ' + label, offer.id, out.id, ts);
          (sender.gifts ??= []).push(structuredClone(out)); (target.gifts ??= []).push({ ...out, dir: 'in' });
          target.gRecv = received[i] + 1;
          for (const acc of [sender, target]) if (acc.gifts!.length > GIFTS_CAP) acc.gifts!.splice(0, acc.gifts!.length - GIFTS_CAP);
          const h = (this.d.house ??= { coins: 0, count: 0, ledger: [] });
          h.gems = (h.gems ?? 0) + per.house; h.count++;
          h.ledger.push({ id: randomUUID(), ts, kind: 'gift_share', cur: 'gems', rewardPolicy: per.policy, delta: per.house, after: h.gems,
            tx: out.id, from, to: out.to, gift: offer.id, qty, total: per.total, room });
          if (h.ledger.length > HOUSE_LEDGER_CAP) h.ledger.splice(0, h.ledger.length - HOUSE_LEDGER_CAP);
          children.push({ to: out.to, toCoins: target.coins, toGems: target.gems ?? 0, rec: structuredClone(out) });
        }
        sender.gSent = sent + count;
        this.d.giftStats = { ...this.d.giftStats, [offer.id]: (this.d.giftStats?.[offer.id] ?? 0) + qty * count };
        const receipt: GiftBatchReceipt = { ok: true, dup: false, batchId, targets: [...canonical], qty, room,
          coins: sender.coins, gems: sender.gems!, quote: structuredClone(quote), receipts: children };
        this.d.giftBatches = { ...this.d.giftBatches, [this.opKey(from, key)]: { request: structuredClone(request), result: structuredClone(receipt) } };
        return receipt;
      });
    } finally {
      this.preparingGiftBatch = false;
      // All previously prepared pins release even if the SECOND preparation throws. Orphan intents
      // remain safe: parent outbox reconciliation checks each child ledger proof before consuming.
      for (const release of releases.reverse()) try { release(); } catch { /* pin cleanup cannot undo a committed payment */ }
    }
    for (const child of result.receipts) {
      const bonusRow = this.d.acc[from].ledger!.find(l => l.giftTx === child.rec.id && l.cur === 'coins')!;
      this.luckyNotify(from, 'coins', 'gift', per.senderBonus, bonusRow.after, offer.id);
      this.luckyNotify(child.to, 'coins', 'gift', per.recv, child.toCoins, offer.id);
      try { this.onGift?.(from, child.to, child.rec.id); } catch { /* all child sources already committed; outbox retries */ }
    }
    this.benefitsNotify([from, ...canonical]);
    return result;
  }
  private batchGiftSource(from: string, to: string, ref: string): GiftRec | undefined {
    for (const proof of Object.values(this.d.giftBatches ?? {})) {
      if (proof.request.from !== from) continue;
      const rec = proof.result.receipts.find(c => c.to === to && c.rec.id === ref)?.rec;
      if (rec) return rec;
    }
    return undefined;
  }
  /** Server-only primary proof, independent of capped gift receipt/key/house views. Legacy receipts remain valid. */
  hasGiftSource(from: string, to: string, ref: string): boolean {
    const proof = Object.values(this.d.giftKeys ?? {}).find((p) => p.rid === ref && p.rec?.from === from && p.to === to)?.rec ?? this.batchGiftSource(from, to, ref);
    if (proof && giftLedgerProof(this.d.acc, proof)) return true;
    const ledger = (id: string, outgoing: boolean) => (this.d.acc[id]?.ledger ?? []).some((r) => r.kind === 'gift' && r.cur === 'coins'
      && r.giftTx === ref && (outgoing ? r.delta < 0 : r.delta >= 0));
    if (ledger(from, true) && ledger(to, false)) return true;
    const gemsDebit = (this.d.acc[from]?.ledger ?? []).find((r) => r.kind === 'gift' && r.cur === 'gems' && r.giftTx === ref && r.delta < 0);
    const q = gemsDebit ? quoteGiftRewards(-gemsDebit.delta) : null;
    if (q && (this.d.acc[from]?.ledger ?? []).some((r) => r.kind === 'gift' && r.cur === 'coins' && r.giftTx === ref && r.delta === q.senderBonus)
      && (this.d.acc[to]?.ledger ?? []).some((r) => r.kind === 'gift' && r.cur === 'coins' && r.giftTx === ref && r.delta === q.recv)) return true;
    const prepaid = Object.values(this.d.luckyOps ?? {}).some((op) => op.request.op === 'redeem' && op.request.actor === from && op.request.to === to
      && 'rec' in op.result && op.result.rec.id === ref && giftLedgerProof(this.d.acc, op.result.rec));
    if (prepaid) return true;
    return (this.d.acc[from]?.gifts ?? []).some((r) => r.id === ref && r.dir === 'out' && r.from === from && r.to === to);
  }
  /** Read-only durable R25 source lookup. Never infer amounts from capped displays or coin payouts. */
  committedGiftReceipt(from: string, to: string, ref: string): GiftRec | null {
    if (this.unsaved()) return null;
    const regular = Object.values(this.d.giftKeys ?? {}).find(p => p.rid === ref && p.to === to && p.rec?.from === from)?.rec;
    const prepaid = Object.values(this.d.luckyOps ?? {}).find(op => op.request.op === 'redeem' && op.request.actor === from && op.request.to === to && 'rec' in op.result && op.result.rec.id === ref);
    const rec = regular ?? this.batchGiftSource(from, to, ref) ?? (prepaid && 'rec' in prepaid.result ? prepaid.result.rec : undefined);
    return rec && rec.id === ref && rec.from === from && rec.to === to && giftLedgerProof(this.d.acc, rec) ? structuredClone(rec) : null;
  }
  /** طلب هدية سبق تنفيذه بنفس المفتاح (لإرجاع نفس النتيجة حتى لو تغيّر حال الغرفة بعدها) */
  giftByKey(from: string, key: string): GiftRec | null {
    if (!this.validKey(from, key)) return null;
    if (this.d.giftBatches?.[this.opKey(from, key)]) return null;
    const p = this.d.giftKeys?.[this.opKey(from, key)] ?? this.d.giftKeys?.[from + ':' + key]; if (!p) return null;
    const rec = p.rec ?? (this.d.acc[from]?.gifts ?? []).find((g) => g.id === p.rid);
    return rec && rec.from === from && rec.to === p.to ? structuredClone(rec) : null;
  }
  /** حساب الإدارة (للوحة الإدارة فقط) */
  houseView(n = 100) { const h = this.d.house ?? { coins: 0, count: 0, ledger: [] }; return { coins: h.coins, ...(h.gems !== undefined ? { gems: h.gems } : {}), count: h.count, ledger: structuredClone(h.ledger.slice(-n).reverse()) }; }
  /** عدد مرات إرسال كل هدية (للأكثر شعبية — من الإرسال الفعلي فقط) */
  giftPopularity(): Record<string, number> { return { ...(this.d.giftStats ?? {}) }; }
  /** R67ae: للإدارة — كل الهدايا المرسلة (من سجلات الحسابات المحفوظة)، الأحدث أول */
  adminGifts(opts: { q?: string; since?: number; limit?: number } = {}) {
    const q = (opts.q ?? '').trim().toLowerCase(), since = opts.since ?? 0, limit = Math.max(1, Math.min(500, opts.limit ?? 200));
    const all: GiftRec[] = [];
    for (const a of Object.values(this.d.acc)) for (const g of a.gifts ?? []) if (g.dir === 'out' && g.ts >= since) all.push(g);
    all.sort((x, y) => y.ts - x.ts);
    const val = (g: GiftRec) => (g.total ?? g.price * (g.qty ?? 1)) * (g.cur === 'gems' ? 20 : 1);
    const hit = all.filter((g) => !q || g.fromName.toLowerCase().includes(q) || g.toName.toLowerCase().includes(q) || g.name.toLowerCase().includes(q));
    // أزواج متكررة (نفس المرسل لنفس المستلم) — مؤشر لتحويل العملات بين الحسابات
    const pairs = new Map<string, { from: string; to: string; count: number; value: number }>();
    for (const g of hit) { const k = g.from + '>' + g.to; const p = pairs.get(k) ?? { from: g.fromName, to: g.toName, count: 0, value: 0 }; p.count++; p.value += val(g); pairs.set(k, p); }
    return {
      total: hit.length, value: hit.reduce((n, g) => n + val(g), 0),
      list: hit.slice(0, limit).map((g) => ({ id: g.id, ts: g.ts, from: g.fromName, fromId: g.from, to: g.toName, toId: g.to, gift: g.name, icon: g.icon, qty: g.qty ?? 1, value: val(g), recv: g.recv ?? 0, room: !!g.room })),
      pairs: [...pairs.values()].sort((x, y) => y.value - x.value).slice(0, 15),
    };
  }
  /** R67ae: للإدارة — حركة العملات يوم بيوم (من سجلات الحسابات المحفوظة، بتوقيت الخليج) */
  adminEconomy(days = 14, now = Date.now()) {
    const GULF = 4 * 3600_000, dayOf = (t: number) => new Date(t + GULF).toISOString().slice(0, 10);
    const since = now - days * 86_400_000;
    const byDay = new Map<string, { day: string; in: number; out: number; kinds: Record<string, number> }>();
    for (let i = days - 1; i >= 0; i--) { const d = dayOf(now - i * 86_400_000); byDay.set(d, { day: d, in: 0, out: 0, kinds: {} }); }
    const spend = new Map<string, number>(); const giftCount = new Map<string, { name: string; icon: string; count: number; value: number }>();
    for (const [id, a] of Object.entries(this.d.acc)) {
      for (const l of a.ledger ?? []) {
        if (l.ts < since) continue; const coins = l.cur === 'gems' ? l.delta * 20 : l.delta; const row = byDay.get(dayOf(l.ts)); if (!row) continue;
        if (coins > 0) row.in += coins; else row.out += -coins;
        const k = (coins > 0 ? '+' : '-') + l.kind; row.kinds[k] = (row.kinds[k] ?? 0) + Math.abs(coins);
        if (coins < 0 && (l.kind === 'purchase' || l.kind === 'gift' || l.kind === 'entry_fee')) spend.set(id, (spend.get(id) ?? 0) - coins);
      }
      for (const g of a.gifts ?? []) { if (g.dir !== 'out' || g.ts < since) continue; const v = (g.total ?? g.price * (g.qty ?? 1)) * (g.cur === 'gems' ? 20 : 1); const c = giftCount.get(g.gift) ?? { name: g.name, icon: g.icon, count: 0, value: 0 }; c.count += g.qty ?? 1; c.value += v; giftCount.set(g.gift, c); }
    }
    const balances = Object.values(this.d.acc).reduce((n, a) => n + (a.coins ?? 0) + (a.gems ?? 0) * 20, 0);
    return {
      days: [...byDay.values()], balances, accounts: Object.keys(this.d.acc).length,
      topSpenders: [...spend.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id, v]) => ({ id, spent: v })),
      spenders: spend.size, spentTotal: [...spend.values()].reduce((x, y) => x + y, 0),
      topGifts: [...giftCount.values()].sort((a, b) => b.value - a.value).slice(0, 10),
      house: { coins: this.d.house?.coins ?? 0, gems: this.d.house?.gems ?? 0 },
    };
  }
  /** سجل هدايا اللاعب نفسه (الأحدث أولاً). */
  giftsOf(id: string, dir?: 'in' | 'out', n = 50): GiftRec[] { return structuredClone((this.d.acc[id]?.gifts ?? []).filter((g) => !dir || g.dir === dir).slice(-n).reverse()); }
  /** عدد الهدايا المرسلة والمستلمة (عمليات فعلية، للإنجازات) */
  giftCounts(id: string): { sent: number; recv: number } { const a = this.d.acc[id]; if (!a) return { sent: 0, recv: 0 }; const g = a.gifts ?? []; return { sent: a.gSent ?? g.filter((x) => x.dir === 'out').length, recv: a.gRecv ?? g.filter((x) => x.dir === 'in').length }; }
  /** تجهيز لقب/شارة مكتسبة (مو مشتراة): الجهة المنادية تتحقق من الاستحقاق بالخادم قبل المناداة */
  equipEarned(id: string, slot: 'title' | 'badge', achId: string | null): void {
    const a = this.a(id); const sn = this.snap([id]);
    a.equipped ??= {};
    if (achId === null) delete a.equipped[slot]; else a.equipped[slot] = achId;
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); throw e; }
  }
  /** تجهيز/إزالة عنصر مملوك لخانة (إطار، خلفية...). null = إزالة. */
  equip(id: string, slot: string, itemId: string | null): boolean {
    const a = this.a(id);
    if (itemId !== null && !(a.owned ?? []).includes(itemId)) return false;
    const sn = this.snap([id]);
    a.equipped ??= {};
    if (itemId === null) delete a.equipped[slot]; else a.equipped[slot] = itemId;
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); throw e; }
    return true;
  }
  /**
   * مكافأة (عملات/جواهر) مرة وحدة لكل مفتاح (إنجاز، فعالية، ولاحقاً عملية دفع موثّقة من الخادم). ترجّع false لو انصرفت قبل.
   * الجهة المنادية مسؤولة عن التحقق من الاستحقاق بالخادم قبل المناداة.
   */
  /** R72: هل انصرفت جائزة بهالمفتاح قبل؟ (ما ينشئ حساب) */
  hasClaimed(id: string, key: string): boolean { return (this.d.acc[id]?.claimed ?? []).includes(key); }
  grant(id: string, cur: Cur, amount: number, reason: string, key: string): boolean {
    if (!currency(cur) || !pos(amount) || !str(key) || !key) return false;
    const a = this.a(id);
    if ((a.claimed ?? []).includes(key)) return false;
    if (!this.auctionCanBalanceR47(id, cur, (cur === 'coins' ? a.coins : (a.gems ?? 0)) + amount)) return false;
    const sn = this.snap([id]);
    (a.claimed ??= []).push(key);
    if (cur === 'coins') a.coins += amount; else a.gems = (a.gems ?? 0) + amount;
    this.rec(id, cur, 'reward', amount, cur === 'coins' ? a.coins : a.gems!, reason, key);
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); throw e; }
    if (cur === 'coins') this.onTx?.(id, 'reward', amount, a.coins, key);
    return true;
  }
  /**
   * تعديل رصيد من الإدارة (إضافة أو خصم): يُسجَّل بالسجل المالي بنوع «admin» وسببه، ولا ينزل الرصيد تحت صفر، ويتراجع كله لو فشل الحفظ.
   * opKey (اختياري للتوافق، وإلزامي عند الإدارة): مفتاح عملية يُحفظ **بنفس حفظ الرصيد**، فإعادة المناداة بنفس المفتاح بعد أي انقطاع
   * ترجّع نفس النتيجة (dup) بدون تعديل ثانٍ. إعادة استخدام المفتاح لحساب/عملة/مقدار مختلف = رفض (bad).
   * يرجّع before/after لرصيد العملة المعدَّلة.
   */
  adminAdjust(id: string, cur: Cur, delta: number, reason: string, opKey = ''): { ok: true; coins: number; gems: number; before: number; after: number; dup: boolean } | { ok: false; code: 'bad' | 'poor' } {
    if (!currency(cur) || !signed(delta) || delta === 0 || !str(reason) || !reason) return { ok: false, code: 'bad' };
    if (!str(opKey) || opKey.length > 160) return { ok: false, code: 'bad' };
    const a = this.a(id);
    const prev = opKey ? this.d.admOps?.[opKey] : undefined;
    if (prev) return prev.id === id && prev.cur === cur && prev.delta === delta ? { ok: true, coins: a.coins, gems: a.gems ?? 0, before: prev.before, after: prev.after, dup: true } : { ok: false, code: 'bad' };
    if (cur === 'gems' && delta < 0) this.coverGems(id, -delta);
    const have = cur === 'coins' ? a.coins : (a.gems ?? 0);
    if (have + delta < 0) return { ok: false, code: 'poor' };
    if (!this.auctionCanBalanceR47(id, cur, have + delta)) return { ok: false, code: 'bad' };
    const sn = this.snap([id]); const opsBefore = this.d.admOps;
    if (cur === 'coins') a.coins += delta; else a.gems = (a.gems ?? 0) + delta;
    const after = cur === 'coins' ? a.coins : a.gems!;
    this.rec(id, cur, 'admin', delta, after, reason, 'admin');
    if (opKey) {
      const ops = { ...(this.d.admOps ?? {}), [opKey]: { id, cur, delta, before: have, after, at: Date.now() } };
      this.d.admOps = ops;
    }
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); this.d.admOps = opsBefore; throw e; }
    if (cur === 'coins') this.onTx?.(id, 'admin', delta, a.coins, 'admin');
    return { ok: true, coins: a.coins, gems: a.gems ?? 0, before: have, after, dup: false };
  }
  /** R69: استرجاع محفظة لاعب لحالتها بنسخة احتياطية (العملات والجواهر والأغراض). السجل يبقى ويتسجل فيه الفرق. */
  restorePlayer(id: string, snap: { coins: number; gems?: number; owned?: string[]; equipped?: Record<string, string>; exp?: Record<string, number> }, reason: string, opKey: string): { ok: true; dup: boolean; coins: number; gems: number; items: number } | { ok: false; code: 'bad' } {
    if (!str(opKey) || !opKey || !nat(snap?.coins) || (snap.gems !== undefined && !nat(snap.gems))) return { ok: false, code: 'bad' };
    const a = this.a(id);
    if (this.d.admOps?.[opKey]) return { ok: true, dup: true, coins: a.coins, gems: a.gems ?? 0, items: (a.owned ?? []).length };
    const sn = this.snap([id]); const opsBefore = this.d.admOps;
    const dc = snap.coins - a.coins, dg = (snap.gems ?? 0) - (a.gems ?? 0);
    a.coins = snap.coins; a.gems = snap.gems ?? 0;
    a.owned = [...new Set((snap.owned ?? []).filter((x) => typeof x === 'string'))];
    a.equipped = Object.fromEntries(Object.entries(snap.equipped ?? {}).filter(([, v]) => typeof v === 'string'));
    if (snap.exp && typeof snap.exp === 'object') a.exp = { ...snap.exp }; else delete a.exp;
    if (dc) this.rec(id, 'coins', 'admin', dc, a.coins, reason, 'admin');
    if (dg) this.rec(id, 'gems', 'admin', dg, a.gems, reason, 'admin');
    this.d.admOps = { ...(this.d.admOps ?? {}), [opKey]: { id, cur: 'coins', delta: dc, before: a.coins - dc, after: a.coins, at: Date.now() } };
    try { this.disk.mustSave(); } catch (e) { this.restore(sn); this.d.admOps = opsBefore; throw e; }
    return { ok: true, dup: false, coins: a.coins, gems: a.gems ?? 0, items: a.owned.length };
  }
  /** R69: حالة لاعب مختصرة من بيانات محفظة خام (للنسخ الاحتياطية) */
  static snapshotOf(raw: unknown, id: string) { const acc = (raw as { acc?: Record<string, Acc> })?.acc?.[id]; return acc ? { coins: acc.coins, gems: acc.gems ?? 0, owned: acc.owned ?? [], equipped: acc.equipped ?? {}, exp: acc.exp } : null; }
  /** خادم الدفع فقط: إثبات العملية ضمن نفس الكاتب والرصيد والسجل؛ لا تقبل هالدالة مبلغًا من المتصفح. */
  hasPaymentProof(id: string, cur: Cur, delta: number, key: string): boolean {
    const proof = this.d.admOps?.[key];
    return !!proof && key.startsWith('payment:') && proof.id === id && proof.cur === cur && proof.delta === delta;
  }
  paymentAdjust(id: string, cur: Cur, delta: number, orderId: string, key: string): ReturnType<Wallet['adminAdjust']> {
    if (!str(id) || !id || !currency(cur) || !signed(delta) || delta === 0 || !str(orderId)
      || !/^[A-Za-z0-9_-]{8,100}$/.test(orderId) || !str(key) || !key.startsWith('payment:') || key.length > 160) return { ok: false, code: 'bad' };
    const a = this.a(id), previous = this.d.admOps?.[key];
    if (previous) return previous.id === id && previous.cur === cur && previous.delta === delta
      ? { ok: true, coins: a.coins, gems: a.gems ?? 0, before: previous.before, after: previous.after, dup: true }
      : { ok: false, code: 'bad' };
    const before = cur === 'coins' ? a.coins : (a.gems ?? 0), after = before + delta;
    if (after < 0) return { ok: false, code: 'poor' };
    if (!this.auctionCanBalanceR47(id, cur, after)) return { ok: false, code: 'bad' };
    const snapshot = this.snap([id]), proofs = this.d.admOps;
    if (cur === 'coins') a.coins = after; else a.gems = after;
    const kind: TxKind = delta > 0 ? 'purchase' : 'refund';
    this.rec(id, cur, kind, delta, after, delta > 0 ? 'رصيد باقة بتأكيد خادم الدفع' : 'استرجاع باقة أو حجز رصيدها للاسترجاع', orderId);
    this.d.admOps = { ...proofs, [key]: { id, cur, delta, before, after, at: this.now() } };
    try { this.disk.mustSave(); } catch (e) { this.restore(snapshot); this.d.admOps = proofs; throw e; }
    // إثبات المحفظة انحفظ أول؛ فشل سجل الحساب الملحق ما يسمح بإصدار الرصيد مرتين.
    try { if (cur === 'coins') this.onTx?.(id, kind, delta, a.coins, orderId); } catch { /* canonical wallet proof is durable */ }
    return { ok: true, coins: a.coins, gems: a.gems ?? 0, before, after, dup: false };
  }
  /** منح جماعي ذري: تجهيز معزول ثم التزام واحد، بدون إظهار أو حفظ مسودة جزئية. */
  async grantBulk(operationId: string, ids: string[], rewards: BulkReward[], reason: string): Promise<BulkGrantResult> {
    // تجميد مدخلات الطلب قبل انتظار عملية أخرى؛ العميل لا يملك مراجع لمسودة الخادم.
    const targets = [...ids], rewardSet = structuredClone(rewards);
    const run = this.bulkTail.then(() => this.grantBulkLocked(operationId, targets, rewardSet, reason));
    this.bulkTail = run.then(() => undefined, () => undefined);
    return run;
  }
  private async grantBulkLocked(operationId: string, ids: string[], rewards: BulkReward[], reason: string): Promise<BulkGrantResult> {
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(operationId) || !ids.length || ids.some(id => !str(id) || !id)
      || !str(reason) || !reason || !rewards.length) throw new RangeError('bulk_invalid');
    const previous = this.d.bulkOps?.[operationId];
    if (previous) return structuredClone({ ...previous, duplicate: true });
    const unique = [...new Set(ids)];
    const plans = new Map<string, { base: string; next: Acc; code: string }>();
    const prepare = (id: string) => {
      const source = this.d.acc[id];
      const base = JSON.stringify(source);
      const next: Acc = source ? structuredClone(source) : { coins: START_COINS, daily: '' };
      let code = '';
      const record = (cur: Cur, kind: LedgerEntry['kind'], delta: number, after: number, ref: string) => {
        (next.ledger ??= []).push({ id: randomUUID(), ts: this.now(), cur, kind, delta, before: after - delta, after, reason, ref });
      };
      // تحقق تراكمي على نسخة المستفيد، وليس على الرصيد الأول لكل مكافأة على حدة.
      for (const reward of rewards) {
        if (!reward || typeof reward !== 'object') { code = 'invalid_reward'; break; }
        if (reward.type === 'currency') {
          if (!currency(reward.cur) || !pos(reward.amount)) { code = 'invalid_reward'; break; }
          const before = reward.cur === 'coins' ? next.coins : (next.gems ?? 0);
          const after = before + reward.amount;
          if (!this.auctionCanBalanceR47(id, reward.cur, after)) { code = 'overflow'; break; }
          if (reward.cur === 'coins') next.coins = after; else next.gems = after;
          record(reward.cur, 'reward', reward.amount, after, operationId);
        } else if (reward.type === 'item') {
          if (!str(reward.itemId) || !reward.itemId || (reward.mode !== 'grant' && reward.mode !== 'purchase')) { code = 'invalid_item'; break; }
          if ((next.owned ?? []).includes(reward.itemId)) { code = 'already_owned'; break; }
          if (reward.mode === 'purchase') {
            if (!currency(reward.currency) || !pos(reward.price) || reward.price > PRICE_MAX[reward.currency]) { code = 'invalid_item'; break; }
            const have = reward.currency === 'coins' ? next.coins : (next.gems ?? 0);
            if (have < reward.price) { code = 'insufficient_funds'; break; }
            const after = have - reward.price;
            if (reward.currency === 'coins') next.coins = after; else next.gems = after;
            record(reward.currency, 'purchase', -reward.price, after, reward.itemId);
          }
          (next.owned ??= []).push(reward.itemId);
        } else { code = 'invalid_reward'; break; }
      }
      return { base, next, code };
    };
    for (let index = 0; index < unique.length; index++) {
      if (index > 0 && index % 100 === 0) await new Promise<void>(resolve => setImmediate(resolve));
      plans.set(unique[index], prepare(unique[index]));
    }
    // لا يوجد await في نافذة الالتزام. نعيد تجهيز أي حساب تغيّر أثناء التجهيز،
    // ونضم النتائج إلى أحدث حالة، فيظل الشراء/المنح/السجلات المتزامنة محفوظة.
    const before = this.d;
    const accounts = { ...before.acc };
    const failures: { id: string; code: string }[] = [];
    const success: string[] = [];
    for (const id of unique) {
      let plan = plans.get(id)!;
      if (JSON.stringify(before.acc[id]) !== plan.base) plan = prepare(id);
      if (plan.code) { failures.push({ id, code: plan.code }); continue; }
      accounts[id] = plan.next;
      success.push(id);
    }
    const result: BulkGrantResult = { ok: true, duplicate: false, operationId, total: unique.length, succeeded: success.length, failed: failures.length, failures };
    this.d = { ...before, acc: accounts, bulkOps: { ...before.bulkOps, [operationId]: result } };
    try { this.disk.mustSave(); } catch (e) { this.d = before; throw e; }
    for (const id of success) { const a = this.a(id); for (const reward of rewards) if (reward.type === 'currency') this.onTx?.(id, 'reward', reward.amount, reward.cur === 'coins' ? a.coins : a.gems ?? 0, operationId); }
    return structuredClone(result);
  }
  /** Read-only reconciliation: no account creation, save, receipt expiry or pruning. */
  campaignCommitted(campaignId: string, id: string): boolean {
    return uuid(campaignId) && uuid(id) && !!this.d.campaignGrants?.[campaignId]?.receipts[id];
  }
  grantReceipt(campaignId: string, id: string): CampaignGrantReceipt | null {
    if (!this.campaignCommitted(campaignId, id)) return null;
    return structuredClone(this.d.campaignGrants![campaignId].receipts[id]);
  }
  /**
   * Trusted owner/campaign-worker primitive; caller authorizes and hashes ALL campaign semantics,
   * including the complete audience, reward bundle and reason (not just this batch), upstream.
   * Synchronous single-process batching: one result per unique recipient, in first-seen order.
   * Every successful bundle and its permanent receipt share ONE wallet JSON commit. Overflow is
   * recipient-local and leaves no receipt; even an all-overflow first batch binds the fingerprint.
   * Invalid input throws RangeError('wallet_invalid_campaign'); fingerprint reuse conflicts throw
   * Error('campaign_conflict'); storage errors throw StorageError with complete in-memory rollback.
   */
  grantCampaignBatch(campaignId: string, fp: string, ids: string[], rewards: GrantBundle, reason: string): CampaignGrantResult[] {
    if (!uuid(campaignId) || !fingerprint(fp)) throw new RangeError('wallet_invalid_campaign');
    const previous = this.d.campaignGrants?.[campaignId];
    if (previous && previous.fingerprint !== fp) throw new Error('campaign_conflict');
    if (!Array.isArray(ids) || !ids.length || !Array.from(ids).every(uuid) || new Set(ids).size > 25
      || !isObj(rewards) || !exactKeys(rewards, ['coins', 'gems', 'itemIds'])
      || !nat(rewards.coins) || rewards.coins > PRICE_MAX.coins || !nat(rewards.gems) || rewards.gems > PRICE_MAX.gems
      || !itemIds(rewards.itemIds) || !(rewards.coins || rewards.gems || rewards.itemIds.length)
      || !str(reason) || !reason.trim()) throw new RangeError('wallet_invalid_campaign');

    const results: CampaignGrantResult[] = [];
    const accounts: Record<string, Acc> = {};
    const receipts = { ...previous?.receipts };
    const hooks: { id: string; delta: number; balance: number; ref: string }[] = [];
    const ref = `campaign:${campaignId}`;
    for (const id of new Set(ids)) {
      const receipt = receipts[id];
      if (receipt) {
        results.push({ id, status: 'duplicate', addedItems: [...receipt.addedItems], alreadyOwned: [...receipt.alreadyOwned] });
        continue;
      }
      const existing = this.d.acc[id];
      const coins = (existing?.coins ?? START_COINS) + rewards.coins;
      const gems = (existing?.gems ?? 0) + rewards.gems;
      if (!this.auctionCanBalanceR47(id, 'coins', coins) || !this.auctionCanBalanceR47(id, 'gems', gems)) {
        results.push({ id, status: 'failed', code: 'BALANCE_OVERFLOW' });
        continue;
      }
      const a: Acc = structuredClone(existing ?? { coins: START_COINS, daily: '' });
      const owned = new Set(a.owned ?? []);
      const addedItems = rewards.itemIds.filter((item) => !owned.has(item));
      const alreadyOwned = rewards.itemIds.filter((item) => owned.has(item));
      const rec = (cur: Cur, delta: number, after: number, entryRef: string) => {
        (a.ledger ??= []).push({ id: randomUUID(), ts: this.now(), cur, kind: 'admin', delta, before: after - delta, after, reason, ref: entryRef });
      };
      a.coins = coins;
      if (rewards.coins) { rec('coins', rewards.coins, coins, ref); hooks.push({ id, delta: rewards.coins, balance: coins, ref }); }
      if (rewards.gems) { a.gems = gems; rec('gems', rewards.gems, gems, ref); }
      if (addedItems.length) {
        a.owned = [...new Set([...(a.owned ?? []), ...addedItems])];
        for (const item of addedItems) rec('coins', 0, coins, `${ref}:item:${item}`);
      }
      accounts[id] = a;
      receipts[id] = { addedItems, alreadyOwned };
      results.push({ id, status: 'granted', addedItems: [...addedItems], alreadyOwned: [...alreadyOwned] });
    }
    if (!previous || Object.keys(accounts).length) {
      const before = this.d;
      this.d = { ...before, acc: { ...before.acc, ...accounts }, campaignGrants: {
        ...before.campaignGrants, [campaignId]: { fingerprint: fp, receipts },
      } };
      try { this.disk.mustSave(); } catch (e) { this.d = before; throw e; }
      // TxHook follows the existing coins-only convention; gems/items are in the wallet ledger.
      // Observer failure is AFTER commit, never an award failure and never a reason to grant again.
      if (hooks.length && this.onCampaignTxBatch) {
        try { this.onCampaignTxBatch(structuredClone(hooks)); }
        catch { try { this.onPayoutError?.('CAMPAIGN_HOOK_FAILED'); } catch { /* diagnostics cannot undo a commit */ } }
      } else for (const hook of hooks) {
        try { this.onTx?.(hook.id, 'admin', hook.delta, hook.balance, hook.ref); }
        catch { try { this.onPayoutError?.('CAMPAIGN_HOOK_FAILED'); } catch { /* diagnostics cannot undo a commit */ } }
      }
    }
    return results;
  }
  /**
   * تعديل رصيد من الإدارة (إضافة أو خصم): يُسجَّل بالسجل المالي بنوع «admin» وسببه، ولا ينزل الرصيد تحت صفر، ويتراجع كله لو فشل الحفظ.
   * opKey (اختياري للتوافق، وإلزامي عند الإدارة): مفتاح عملية يُحفظ **بنفس حفظ الرصيد**، فإعادة المناداة بنفس المفتاح بعد أي انقطاع
   * ترجّع نفس النتيجة (dup) بدون تعديل ثانٍ. إعادة استخدام المفتاح لحساب/عملة/مقدار مختلف = رفض (bad).
   * يرجّع before/after لرصيد العملة المعدَّلة.
   */
  /** قراءة للإدارة فقط (لا تنشئ حساب جديد لو المعرّف غير موجود) */
  has(id: string) { return str(id) && Object.hasOwn(this.d.acc, id); }
  adminView(id: string) { const a = this.a(id); return { coins: a.coins, gems: a.gems ?? 0, owned: [...(a.owned ?? [])], equipped: { ...(a.equipped ?? {}) }, claimed: [...(a.claimed ?? [])], ledger: this.ledgerOf(id, 100) }; }
  totals() { let coins = 0, gems = 0; const ids = Object.keys(this.d.acc); for (const id of ids) { coins += this.d.acc[id].coins; gems += this.d.acc[id].gems ?? 0; } return { accounts: ids.length, coins, gems, settledGames: this.d.settled.length }; }
  /** كم حساب يملك كل عنصر / استلم كل مكافأة (عدّ حقيقي من الحسابات) */
  countOwned(): Record<string, number> { const o: Record<string, number> = {}; for (const a of Object.values(this.d.acc)) for (const i of a.owned ?? []) o[i] = (o[i] ?? 0) + 1; return o; }
  countClaimed(): Record<string, number> { const o: Record<string, number> = {}; for (const a of Object.values(this.d.acc)) for (const i of a.claimed ?? []) o[i] = (o[i] ?? 0) + 1; return o; }
  /** إعادة محاولة الجوائز المعلّقة (يناديها الخادم بمؤقت). تنصرف مرة وحدة فقط لأن المفتاح يُسجَّل مع الحفظ. */
  retryPending() {
    for (const p of [...this.pending]) {
      if (this.d.settled.includes(p.key)) { this.pending = this.pending.filter((q) => q !== p); continue; }
      try {
        const out = this.commit(p);
        if (out) { this.pending = this.pending.filter((q) => q !== p); this.onSettled?.(p.key, out); }
      } catch (e) {
        // استحقاق واحد خارج مجال الأعداد الآمنة لا يُسقط المؤقت ولا يمنع صرف البقية.
        // يبقى غير المصروف بالقائمة، ولا نسقط حارس الأرصدة ولا نعلن نجاحاً وهمياً.
        const code = e instanceof RangeError && e.message === 'wallet_balance_overflow' ? 'BALANCE_OVERFLOW' : 'PAYOUT_RETRY_FAILED';
        try { this.onPayoutError?.(code); } catch { /* قناة التشخيص لا تُسقط إعادة المحاولة */ }
      }
    }
    this.settleExpiredLuckyBags();
    this.disk.retry();
  }
}
