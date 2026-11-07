export const GIFTS = [
    { id: 'rose', name: 'وردة', icon: '🌹', price: 100 },
    { id: 'heart', name: 'قلب', icon: '❤️', price: 250 },
    { id: 'coffee', name: 'كوب قهوة', icon: '☕', price: 400 },
    { id: 'chocolate', name: 'شوكولاتة', icon: '🍫', price: 500 },
    { id: 'teddy', name: 'دبدوب', icon: '🧸', price: 750 },
    { id: 'balloons', name: 'بالونات', icon: '🎈', price: 1_000 },
    { id: 'bouquet', name: 'باقة ورد', icon: '💐', price: 1_500 },
    { id: 'crown', name: 'تاج', icon: '👑', price: 2_500 },
    { id: 'diamond', name: 'ماسة', icon: '💎', price: 5_000 },
    { id: 'butterfly', name: 'فراشة ذهبية', icon: '🦋', price: 7_500 },
    { id: 'car', name: 'سيارة فاخرة', icon: '🏎️', price: 15_000 },
    { id: 'palace', name: 'قصر ذهبي', icon: '🏰', price: 30_000 },
    { id: 'dragon', name: 'تنين أسطوري', icon: '🐉', price: 50_000 },
    { id: 'rocket', name: 'صاروخ فضائي', icon: '🚀', price: 100_000 },
];
export const giftOf = (id) => (typeof id === 'string' ? GIFTS.find((g) => g.id === id) : undefined);
/** Legacy only: never use this split to price or relabel a new R13 receipt. */
export const splitGift = (total) => { const recv = Math.floor(total / 2); return { recv, house: total - recv }; };
