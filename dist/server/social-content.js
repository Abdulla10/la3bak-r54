import { isObj } from './datafile.js';
import { SOCIAL_MODE_IDS, SOCIAL_GAME_IDS, socialText } from './social-mode-contract.js';
import { SOCIAL_DEFAULT_CARDS, hydrateCouncilGamesR47 } from './social-modes/index.js';
const only = (x, names) => Object.keys(x).every(k => names.includes(k));
const safe = (x, max) => typeof x === 'string' && socialText(x, max) === x;
/** Strict, bounded admin-content validator used for both load and every commit. No unvalidated admin metadata reaches a module. */
export function validSocialContent(value) {
    value = hydrateSocialContentR47(value);
    if (!isObj(value) || !only(value, ['cards', 'settings']) || !Array.isArray(value.cards) || value.cards.length > 1000 || !isObj(value.settings) || Object.keys(value.settings).length !== SOCIAL_MODE_IDS.length || !only(value.settings, [...SOCIAL_MODE_IDS]))
        return false;
    for (const mode of SOCIAL_MODE_IDS) {
        const s = value.settings[mode];
        if (!isObj(s) || !only(s, ['enabled', 'durationMs', 'allowParticipation', 'categories']) || typeof s.enabled !== 'boolean' || typeof s.allowParticipation !== 'boolean' || !Number.isSafeInteger(s.durationMs) || s.durationMs < 1000 || s.durationMs > 3600000 || mode === 'topics' && s.durationMs < 10000 || !Array.isArray(s.categories) || s.categories.length > 40 || !s.categories.every(c => safe(c, 80)) || new Set(s.categories).size !== s.categories.length)
            return false;
    }
    const ids = new Set();
    for (const card of value.cards) {
        if (!isObj(card) || !only(card, ['id', 'mode', 'category', 'text', 'options', 'enabled']) || typeof card.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(card.id) || ids.has(card.id) || !SOCIAL_MODE_IDS.includes(card.mode) || !safe(card.category, 80) || !safe(card.text, card.mode === 'topics' ? 240 : 500) || typeof card.enabled !== 'boolean')
            return false;
        if (card.options !== undefined && (!Array.isArray(card.options) || card.options.length > 8 || card.options.length < 2 || !card.options.every(o => safe(o, 100)) || new Set(card.options).size !== card.options.length))
            return false;
        if (card.mode === 'understand' && !Array.isArray(card.options))
            return false;
        ids.add(card.id);
    }
    return true;
}
export function defaultSocialContent() {
    const cards = structuredClone(SOCIAL_DEFAULT_CARDS);
    const settings = Object.fromEntries(SOCIAL_MODE_IDS.map(mode => [mode, {
            enabled: true, durationMs: mode === 'hotseat' ? 180000 : 120000,
            allowParticipation: true, categories: [...new Set(cards.filter(c => c.mode === mode).map(c => c.category))],
        }]));
    const content = { cards, settings };
    if (!validSocialContent(content))
        throw new Error('social_default_content_invalid');
    return content;
}
/** Missing new settings only: old disabled settings/cards remain byte-for-byte equivalent. */
export function hydrateSocialContentR47(value) {
    const out = structuredClone(value);
    if (!isObj(out) || !isObj(out.settings) || !Array.isArray(out.cards))
        return out;
    const missing = SOCIAL_GAME_IDS.filter(mode => !Object.hasOwn(out.settings, mode));
    for (const mode of missing)
        out.settings[mode] = { enabled: true, durationMs: mode === 'draw-story' ? 20000 : 30000, allowParticipation: true, categories: mode === 'draw-story' ? ['خيال'] : [] };
    if (missing.includes('draw-story') && !out.cards.some(c => isObj(c) && c.mode === 'draw-story')) {
        const ids = new Set(out.cards.filter(isObj).map(c => c.id));
        out.cards.push(...structuredClone(SOCIAL_DEFAULT_CARDS.filter(c => c.mode === 'draw-story' && !ids.has(c.id))));
    }
    return out;
}
/** Wrap validSocialRooms input and hydrate loaded state with the SAME function. No IO/second store. */
export function hydrateSocialRoomsGamesR47(value) {
    const out = structuredClone(value);
    if (!isObj(out))
        return out;
    if (isObj(out.config) && Object.hasOwn(out.config, 'content'))
        out.config.content = hydrateSocialContentR47(out.config.content);
    if (Array.isArray(out.rooms))
        for (const room of out.rooms)
            if (isObj(room) && Array.isArray(room.councils))
                room.councils = room.councils.map(hydrateCouncilGamesR47);
    return out;
}
