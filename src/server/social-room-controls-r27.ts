/** Fixed, server-approved CSS presets. These are not uploaded covers or purchasable items. */
export const ROOM_BACKGROUND_PRESETS = Object.freeze([
  Object.freeze({ id: 'royal', name: 'ملكي', gradient: 'linear-gradient(165deg, #42275c 0%, #38204f 65%, #48275a 100%)' }),
  Object.freeze({ id: 'amethyst', name: 'جمشت', gradient: 'linear-gradient(145deg, #614480 0%, #704e94 65%, #846847 100%)' }),
  Object.freeze({ id: 'gold', name: 'ذهبي', gradient: 'linear-gradient(145deg, #503360 0%, #896745 65%, #ab8f58 100%)' }),
  Object.freeze({ id: 'img1', name: 'قاعة العرش', gradient: 'url(/assets/art58/roombg/r1.jpg)' }),
  Object.freeze({ id: 'img2', name: 'شرفة القمر', gradient: 'url(/assets/art58/roombg/r2.jpg)' }),
  Object.freeze({ id: 'img3', name: 'صالة الجيمر', gradient: 'url(/assets/art58/roombg/r3.jpg)' }),
  Object.freeze({ id: 'img4', name: 'خيمة الصحراء', gradient: 'url(/assets/art58/roombg/r4.jpg)' }),
  Object.freeze({ id: 'img5', name: 'قاعة الفلك', gradient: 'url(/assets/art58/roombg/r5.jpg)' }),
  Object.freeze({ id: 'dusk', name: 'الغسق', gradient: 'linear-gradient(145deg, #463257 0%, #61466a 65%, #675645 100%)' }),
] as const);
export type RoomTheme = typeof ROOM_BACKGROUND_PRESETS[number]['id'];
export const validRoomTheme = (x: unknown): x is RoomTheme => typeof x === 'string' && ROOM_BACKGROUND_PRESETS.some(p => p.id === x);
export const validSeatIndex = (x: unknown, seats: number): x is number => Number.isSafeInteger(x) && (x as number) >= 0 && (x as number) < seats;
/** Commands accept unique unsorted sets, but durable state uses sorted arrays. */
export function validLockedSeats(x: unknown, seats: number, sorted = false): x is number[] {
  return Array.isArray(x) && x.length <= seats && Array.from(x).every(n => validSeatIndex(n, seats)) && new Set(x).size === x.length && (!sorted || x.every((n, i) => i === 0 || x[i - 1] < n));
}
type SeatCouncil = { seats: number; lockedSeats?: number[] };
type SeatMember = { id: string; seatIndex?: number };
/** Pure legacy projection: reserve explicit positions first, then preserve stored order.
 * Never compacts explicit seats or mutates the live store while rendering a view. */
export function councilSeatLayout(c: SeatCouncil, members: readonly SeatMember[]): Map<string, number> | null {
  if (Object.hasOwn(c, 'lockedSeats') && !validLockedSeats(c.lockedSeats, c.seats, true)) return null;
  const locked = new Set(c.lockedSeats ?? []), used = new Set<number>(), layout = new Map<string, number>();
  for (const m of members) if (Object.hasOwn(m, 'seatIndex')) {
    if (!validSeatIndex(m.seatIndex, c.seats) || used.has(m.seatIndex) || locked.has(m.seatIndex)) return null;
    used.add(m.seatIndex); layout.set(m.id, m.seatIndex);
  }
  for (const m of members) if (!layout.has(m.id)) {
    let index = 0;
    while (index < c.seats && (used.has(index) || locked.has(index))) index++;
    if (index >= c.seats) return null;
    used.add(index); layout.set(m.id, index);
  }
  return layout;
}
