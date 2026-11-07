/** Fixed, server-approved CSS presets. These are not uploaded covers or purchasable items. */
export const ROOM_BACKGROUND_PRESETS = Object.freeze([
    Object.freeze({ id: 'royal', name: 'ملكي', gradient: 'linear-gradient(165deg, #42275c 0%, #38204f 65%, #48275a 100%)' }),
    Object.freeze({ id: 'amethyst', name: 'جمشت', gradient: 'linear-gradient(145deg, #614480 0%, #704e94 65%, #846847 100%)' }),
    Object.freeze({ id: 'gold', name: 'ذهبي', gradient: 'linear-gradient(145deg, #503360 0%, #896745 65%, #ab8f58 100%)' }),
    Object.freeze({ id: 'dusk', name: 'الغسق', gradient: 'linear-gradient(145deg, #463257 0%, #61466a 65%, #675645 100%)' }),
]);
export const validRoomTheme = (x) => typeof x === 'string' && ROOM_BACKGROUND_PRESETS.some(p => p.id === x);
export const validSeatIndex = (x, seats) => Number.isSafeInteger(x) && x >= 0 && x < seats;
/** Commands accept unique unsorted sets, but durable state uses sorted arrays. */
export function validLockedSeats(x, seats, sorted = false) {
    return Array.isArray(x) && x.length <= seats && Array.from(x).every(n => validSeatIndex(n, seats)) && new Set(x).size === x.length && (!sorted || x.every((n, i) => i === 0 || x[i - 1] < n));
}
/** Pure legacy projection: reserve explicit positions first, then preserve stored order.
 * Never compacts explicit seats or mutates the live store while rendering a view. */
export function councilSeatLayout(c, members) {
    if (Object.hasOwn(c, 'lockedSeats') && !validLockedSeats(c.lockedSeats, c.seats, true))
        return null;
    const locked = new Set(c.lockedSeats ?? []), used = new Set(), layout = new Map();
    for (const m of members)
        if (Object.hasOwn(m, 'seatIndex')) {
            if (!validSeatIndex(m.seatIndex, c.seats) || used.has(m.seatIndex) || locked.has(m.seatIndex))
                return null;
            used.add(m.seatIndex);
            layout.set(m.id, m.seatIndex);
        }
    for (const m of members)
        if (!layout.has(m.id)) {
            let index = 0;
            while (index < c.seats && (used.has(index) || locked.has(index)))
                index++;
            if (index >= c.seats)
                return null;
            used.add(index);
            layout.set(m.id, index);
        }
    return layout;
}
