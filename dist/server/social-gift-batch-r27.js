import { quoteGiftRewards } from './gift-rewards.js';
/** A council has at most 12 seats, including the sender. Parent enforces its actual smaller capacity. */
export const GIFT_BATCH_TARGET_MAX = 11;
export const GIFT_BATCH_QUANTITY_MAX = 777;
export const GIFT_BATCH_GEMS_MAX = 1_000_000;
/** Reject duplicates (including sparse arrays) rather than silently changing the quoted audience. */
export function canonicalGiftBatchTargets(from, targets) {
    if (typeof from !== 'string' || !from || from.length > 160 || !Array.isArray(targets)
        || targets.length < 1 || targets.length > GIFT_BATCH_TARGET_MAX
        || !Array.from(targets).every(id => typeof id === 'string' && !!id && id.length <= 160)
        || new Set(targets).size !== targets.length)
        return { ok: false, code: 'bad' };
    if (targets.includes(from))
        return { ok: false, code: 'self' };
    // Code-unit sorting is deterministic and does not depend on server locale.
    return [...targets].sort();
}
/** Quantity is PER selected recipient; round the sender bonus per target, never on batch cost. */
export function quoteGiftBatch(price, qty, recipientCount) {
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > GIFT_BATCH_QUANTITY_MAX
        || !Number.isSafeInteger(recipientCount) || recipientCount < 1 || recipientCount > GIFT_BATCH_TARGET_MAX)
        return null;
    const perRecipient = quoteGiftRewards(price, qty);
    if (!perRecipient || price > GIFT_BATCH_GEMS_MAX || perRecipient.total > GIFT_BATCH_GEMS_MAX)
        return null;
    const total = perRecipient.total * recipientCount;
    const recv = perRecipient.recv * recipientCount;
    const senderBonus = perRecipient.senderBonus * recipientCount;
    const house = perRecipient.house * recipientCount;
    if (![total, recv, senderBonus, house].every(Number.isSafeInteger) || total > GIFT_BATCH_GEMS_MAX)
        return null;
    return { policy: perRecipient.policy, cur: perRecipient.cur, rewardCur: perRecipient.rewardCur,
        total, recv, senderBonus, house, recipientCount, qtyPerRecipient: qty, perRecipient };
}
