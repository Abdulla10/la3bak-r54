const LADDERS = Object.freeze({
    frame: { common: 2_000, premium: 6_000, rare: 15_000, epic: 50_000, legendary: 100_000, ultra: 250_000 },
    bg: { common: 1_000, premium: 3_000, rare: 8_000, epic: 25_000, legendary: 60_000, ultra: 150_000 },
    entrance: { common: 50_000, premium: 80_000, rare: 120_000, epic: 200_000, legendary: 350_000, ultra: 600_000 },
    'chat-bubble': { common: 1_000, premium: 3_000, rare: 10_000, epic: 30_000, legendary: 80_000, ultra: 200_000 },
    board: { common: 1_000, premium: 3_000, rare: 10_000, epic: 30_000, legendary: 80_000, ultra: 200_000 },
});
/** قطع العرض الأفخم بكل قسم */
const SHOWPIECES = Object.freeze({
    'ref-p-frame-02': 500_000, 'lux-f-galaxy': 400_000, 'lux-f-inferno': 450_000,
    'lux-b-falls': 250_000, 'lux-b-snowcastle': 250_000, 'bg2-golden-hall': 200_000,
    'entrance-lux-black': 1_000_000, 'entrance-royal': 900_000,
    'lux-bub-imperial': 300_000, 'lux-board-inferno': 300_000,
});
export function gemsOnlyStorePrice(item) {
    const ladder = LADDERS[item.slot];
    if (!ladder || item.rankPerk || item.price === 0)
        return item;
    const price = SHOWPIECES[item.id] ?? ladder[item.rarity ?? 'common'] ?? item.price;
    return { ...item, price: Math.max(price, item.currency === 'gems' ? item.price : 0), currency: 'gems' };
}
