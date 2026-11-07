/** Approved R13 virtual-currency gift policy; independent of store/conversion policies. */
export const GIFT_REWARD_POLICY = Object.freeze({
    id: 'gems-coins-r13',
    costCur: 'gems',
    rewardCur: 'coins',
    recipientCoinsPerGem: 8,
    senderBonusNumerator: 8,
    senderBonusDenominator: 5,
});
/** Round the sender bonus once on the aggregate cost. Limits belong to each caller. */
export function quoteGiftRewards(price, qty = 1) {
    if (!Number.isSafeInteger(price) || price <= 0 || !Number.isSafeInteger(qty) || qty <= 0)
        return null;
    const total = price * qty;
    const recv = total * GIFT_REWARD_POLICY.recipientCoinsPerGem;
    const numerator = total * GIFT_REWARD_POLICY.senderBonusNumerator;
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(recv) || !Number.isSafeInteger(numerator))
        return null;
    const senderBonus = Math.floor(numerator / GIFT_REWARD_POLICY.senderBonusDenominator);
    if (!Number.isSafeInteger(senderBonus))
        return null;
    return { policy: GIFT_REWARD_POLICY.id, cur: GIFT_REWARD_POLICY.costCur, rewardCur: GIFT_REWARD_POLICY.rewardCur, total, recv, senderBonus, house: total };
}
