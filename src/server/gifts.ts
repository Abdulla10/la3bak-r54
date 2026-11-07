/**
 * Approved gift catalogue; the existing unit price amounts are unchanged.
 * New gifts use the versioned gems-to-coins R13 policy in gift-rewards.ts.
 * Historical receipts without rewardPolicy keep their original currency and 50/50 split.
 */
export interface Gift { id: string; name: string; icon: string; price: number }
export const GIFTS: readonly Gift[] = [
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
export const giftOf = (id: unknown): Gift | undefined => (typeof id === 'string' ? GIFTS.find((g) => g.id === id) : undefined);

/** Same transaction at sender (out) and recipient (in).
 * R13: total/house are gems, recv/senderBonus are coins. Legacy: recv/house split total in cur ?? coins. */
export interface GiftRec {
  id: string; ts: number; dir: 'in' | 'out'; from: string; fromName: string; to: string; toName: string;
  gift: string; name: string; icon: string; price: number; qty?: number; total?: number; recv?: number; house?: number;
  room?: string; status?: 'done'; cur?: 'coins' | 'gems'; rewardCur?: 'coins'; senderBonus?: number; rewardPolicy?: string;
  prepaid?: true; creditId?: string;
}
/** Legacy only: never use this split to price or relabel a new R13 receipt. */
export const splitGift = (total: number) => { const recv = Math.floor(total / 2); return { recv, house: total - recv }; };
