import { readFileSync } from 'node:fs';
/** Fail closed when a packaged entrance asset is absent, empty or not a real WebP.
 * Both source (tsx) and compiled (dist/server) layouts resolve to this project's public folder.
 * User-delegated R23 luxury pricing is approved; this gate is artwork readiness only.
 */
const artReady = (id) => {
    try {
        const bytes = readFileSync(new URL(`../../public/assets/store-r23/${id}.webp`, import.meta.url));
        return bytes.length > 100 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    }
    catch {
        return false;
    }
};
const entrance = (item) => ({ ...item, proposalOnly: !artReady(item.id), priceApproved: artReady(item.id) });
/** Exactly two permanent cosmetics. New approved luxury prices; no historical ownership mutation. */
export const ENTRANCE_ITEMS = [
    entrance({
        id: 'entrance-sport', slot: 'entrance', name: 'دخول السيارة الرياضية الفاخرة', icon: '🏎️',
        desc: 'دخول بسيارة رياضية فاخرة بلمسات بنفسجية وذهبية.',
        price: 150000, currency: 'coins', permanent: true, rarity: 'legendary', set: 'royal',
        css: 'entrance-sport', art: '/assets/store-r23/entrance-sport.webp',
    }),
    entrance({
        id: 'entrance-royal', slot: 'entrance', name: 'دخول الكوبيه الملكية', icon: '🚘',
        desc: 'دخول بكوبيه ملكية فاخرة بلمسات بنفسجية وذهبية.',
        price: 500000, currency: 'coins', permanent: true, rarity: 'ultra', set: 'royal',
        css: 'entrance-royal', art: '/assets/store-r23/entrance-royal.webp',
    }),
];
