import { createHash, randomUUID } from 'node:crypto';
import { isObj } from './datafile.js';
import type { GiftRec } from './gifts.js';
import { supportGiftValue } from './social-challenge.js';
import type { Wallet } from './wallet.js';
import type { ShopCatalog } from './shopcatalog.js';

/** Immutable local policy. Goals are PER STAGE, not lifetime thresholds. */
export const CANNON_VERSION = 'room-gems-permanent-r27-v1';
export const CANNON_RECEIPT_CAP = 100_000;
export const CANNON_STAGES = Object.freeze([
  Object.freeze({ stage: 1, goal: 1_000_000, frameId: 'ref-p-frame-08', backgroundId: 'bg2-throne' }),
  Object.freeze({ stage: 2, goal: 4_500_000, frameId: 'ref-p-frame-06', backgroundId: 'ref-p-bg-08' }),
  Object.freeze({ stage: 3, goal: 14_000_000, frameId: 'ref-p-frame-02', backgroundId: 'ref-p-bg-10' }),
]);
export type CannonGiftContext = { roomId: string; councilId: string; cannonId: string; version: typeof CANNON_VERSION; ownerId: string; enabledAt: number };
export type CannonReward = { addedItems: string[]; alreadyOwned: string[] };
export type CannonStage = { id: string; stage: number; goal: number; frameId: string; backgroundId: string; status: 'locked' | 'pending' | 'awarded'; crossedAt: number | null; completedAt: number | null; reward: CannonReward | null };
export type CannonState = { id: string; version: typeof CANNON_VERSION; ownerId: string; enabledAt: number; total: number; receipts: { id: string; fingerprint: string; from: string; to: string; councilId: string; at: number; value: number }[]; stages: CannonStage[] };
export type CannonBackend = {
  wallet: Pick<Wallet, 'hasGiftSource' | 'committedGiftReceipt' | 'grantCampaignBatch' | 'campaignCommitted' | 'grantReceipt' | 'owned' | 'has' | 'unsaved'>;
  catalog: Pick<ShopCatalog, 'get'>;
  pendingCount?: (cannonId: string) => number;
  /** Confirmed ownership refresh only; never grant/equip/credit in this observer. */
  onAward?: (ownerId: string, eventId: string) => void;
};
const uuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && Number(x) >= 0;
const exact = (x: Record<string, unknown>, fields: string[]) => Object.keys(x).length === fields.length && fields.every(k => Object.hasOwn(x, k));
export const cannonCanonical = (v: unknown): string => JSON.stringify(v, (_k, x) => isObj(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
export const cannonHash = (v: unknown): string => createHash('sha256').update(cannonCanonical(v)).digest('hex');
export function cannonStageId(id: string, stage: number): string {
  const h = cannonHash(['cannon-stage', CANNON_VERSION, id, stage]);
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&3)|8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function validCannonGiftContext(x: unknown): x is CannonGiftContext {
  return isObj(x) && exact(x, ['roomId','councilId','cannonId','version','ownerId','enabledAt']) && uuid(x.roomId) && uuid(x.councilId) && uuid(x.cannonId) && uuid(x.ownerId) && x.version === CANNON_VERSION && nat(x.enabledAt);
}
export function createCannon(ownerId: string, enabledAt: number): CannonState {
  if (!uuid(ownerId) || !nat(enabledAt)) throw new Error('invalid_cannon_owner_or_time');
  const id = randomUUID();
  return { id, version: CANNON_VERSION, ownerId, enabledAt, total: 0, receipts: [], stages: CANNON_STAGES.map(s => ({ ...s, id: cannonStageId(id,s.stage), status:'locked', crossedAt:null, completedAt:null, reward:null })) };
}
export function validCannonState(x: unknown): x is CannonState {
  if (!isObj(x) || !exact(x,['id','version','ownerId','enabledAt','total','receipts','stages']) || !uuid(x.id) || x.version !== CANNON_VERSION || !uuid(x.ownerId) || !nat(x.enabledAt) || !nat(x.total) || !Array.isArray(x.receipts) || x.receipts.length > CANNON_RECEIPT_CAP || !Array.isArray(x.stages) || x.stages.length !== 3) return false;
  const c = x as unknown as CannonState, seen = new Set<string>(); let total = 0;
  for (const r of c.receipts) {
    if (!isObj(r) || !exact(r,['id','fingerprint','from','to','councilId','at','value']) || !uuid(r.id) || seen.has(r.id) || typeof r.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(r.fingerprint) || !uuid(r.from) || !uuid(r.to) || r.from === r.to || !uuid(r.councilId) || !nat(r.at) || r.at < c.enabledAt || !nat(r.value) || r.value < 1 || r.value > 1_000_000) return false;
    seen.add(r.id); total += r.value; if (!nat(total)) return false;
  }
  if (total !== c.total) return false;
  let boundary = 0;
  for (let i=0;i<3;i++) {
    const s = c.stages[i], p = CANNON_STAGES[i]; boundary += p.goal;
    if (!isObj(s) || !exact(s,['id','stage','goal','frameId','backgroundId','status','crossedAt','completedAt','reward']) || s.id !== cannonStageId(c.id,p.stage) || s.stage !== p.stage || s.goal !== p.goal || s.frameId !== p.frameId || s.backgroundId !== p.backgroundId) return false;
    // Receipt insertion order is commitment order, not wall-clock timestamp order.
    let running=0; const crossing=c.receipts.find(r => (running+=r.value) >= boundary);
    if (!crossing) { if (s.status !== 'locked' || s.crossedAt !== null || s.completedAt !== null || s.reward !== null) return false; continue; }
    if (s.crossedAt !== crossing.at || !['pending','awarded'].includes(s.status)) return false;
    if (s.status === 'pending') { if (s.completedAt !== null || s.reward !== null) return false; continue; }
    if (i>0 && c.stages[i-1].status !== 'awarded' || !nat(s.completedAt) || s.completedAt < s.crossedAt! || !isObj(s.reward) || !exact(s.reward,['addedItems','alreadyOwned'])) return false;
    const reward = s.reward as CannonReward;
    if (!Array.isArray(reward.addedItems) || !Array.isArray(reward.alreadyOwned)) return false;
    const all=[...reward.addedItems,...reward.alreadyOwned];
    if (all.length !== 2 || new Set(all).size !== 2 || !all.includes(s.frameId) || !all.includes(s.backgroundId)) return false;
  }
  return true;
}
export function cannonGiftValue(rec: GiftRec, context: CannonGiftContext): number | null {
  if (!validCannonGiftContext(context) || rec.prepaid === true || !uuid(rec.from) || !uuid(rec.to) || rec.ts < context.enabledAt) return null;
  return supportGiftValue(rec,{roomId:context.roomId,councilId:context.councilId,challengeId:null,sourcePublic:false});
}
export function cannonReason(stage: CannonStage): string { return `Room cannon R27 stage ${stage.stage}: permanent owner cosmetics`; }
export function cannonAwardFingerprint(roomId: string, c: CannonState, s: CannonStage): string {
  return cannonHash({roomId,cannonId:c.id,version:c.version,ownerId:c.ownerId,enabledAt:c.enabledAt,stage:s.stage,goal:s.goal,campaignId:s.id,rewards:{coins:0,gems:0,itemIds:[s.frameId,s.backgroundId]},permanent:true,reason:cannonReason(s)});
}
/** Approved base IDs only. No rank-gated, proposal-only, custom or unavailable reward. */
export function validateCannonCatalog(catalog: CannonBackend['catalog'], stages: readonly Pick<CannonStage,'frameId'|'backgroundId'>[] = CANNON_STAGES): void {
  for (const s of stages) for (const [id,slot] of [[s.frameId,'frame'],[s.backgroundId,'bg']] as const) {
    const item=catalog.get(id);
    if (!item || item.id !== id || item.slot !== slot || item.custom || !item.baseId || !item.active || item.status !== 'available' || item.proposalOnly || item.currency !== 'gems' || !item.permanent || !nat(item.price) || item.price < 1 || [item.minLevel,item.minVip,item.minNoble].some(n=>n!==undefined&&n!==0)) throw new Error('cannon_reward_catalog_unavailable');
  }
}
