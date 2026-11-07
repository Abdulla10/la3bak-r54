/** R24: every frame is gem-only, including zero-price, custom and overridden frames.
 * The existing numeric prices are preserved; this is not a wallet conversion.
 * Historical receipts, ownership, sale status and other slots are unchanged. */
export function frameGemsOnly(item) {
    return item.slot === 'frame' ? { ...item, currency: 'gems' } : { ...item };
}
/** R23 delegated seed prices stay intact. Admin price overrides retain precedence,
 * but cannot override the R24 gem-only rule for frames. */
export const LUXURY_PRICE_FLOORS = Object.freeze({
    common: Object.freeze({ coins: 0, gems: 0 }),
    premium: Object.freeze({ coins: 1200, gems: 100 }),
    rare: Object.freeze({ coins: 10000, gems: 500 }),
    epic: Object.freeze({ coins: 30000, gems: 2000 }),
    legendary: Object.freeze({ coins: 100000, gems: 6000 }),
    ultra: Object.freeze({ coins: 250000, gems: 15000 }),
});
const ART_PRICES = Object.freeze({
    'ref-p-frame-02': 100000,
    'ref-p-frame-08': 10000,
    'ref-p-frame-06': 15000,
});
export function luxuryPricedSeed(item) {
    if (item.slot === 'entrance' || item.price === 0)
        return frameGemsOnly(item);
    const rarity = item.rarity ?? 'common';
    const floor = LUXURY_PRICE_FLOORS[rarity]?.[item.currency];
    const price = Math.max(item.price, ART_PRICES[item.id] ?? floor ?? item.price);
    return frameGemsOnly({ ...item, price });
}
