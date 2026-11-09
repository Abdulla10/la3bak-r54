import { createHash } from 'node:crypto';
import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';
import { ProgressionEvents, APPROVED_EVENT_REWARDS } from './progression-events.js';
const RANKS = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9'];
const SYSTEMS = ['level', 'vip', 'noble'];
const EVENT_NAMES = ['gamePlayed', 'gameWon', 'giftSent', 'giftReceived'];
const DEFAULT_CONFIG = {
    v: 1, level: { enabled: true, max: 100, formula: 'existing-xp-sqrt-v1' },
    vip: { enabled: false, max: 15, thresholds: null },
    noble: { enabled: false, ranks: RANKS.slice(0, 5), thresholds: null }, rewards: {},
};
const safeInt = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const pointAmount = (v) => safeInt(v) && v <= 1_000_000_000;
const exact = (v, keys) => Object.keys(v).every((key) => keys.includes(key));
const safeId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 180 && !['__proto__', 'constructor', 'prototype'].includes(v);
const validRef = (v) => typeof v === 'string' && /^[a-zA-Z0-9:_-]{3,100}$/.test(v);
const seasonId = (v) => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/.test(v) && safeId(v);
const text = (v, max) => typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= max && !/[<>\u0000-\u001f\u007f]/.test(v);
const localArt = (v) => v === null || (typeof v === 'string' && v.length <= 300
    && /^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|webp|jpg|jpeg|svg|avif)$/.test(v));
const RECEIPT_LIMIT = 10_000, RECEIPT_BYTES = 16 * 1024 * 1024;
const dangerousKey = (key) => ['__proto__', 'constructor', 'prototype'].includes(key);
const receiptKey = (v) => typeof v === 'string' && /^[A-Za-z0-9:_-]{8,80}$/.test(v) && !dangerousKey(v);
/** Strict JSON only: reject prototype traps, accessors, toJSON, cycles and oversized/deep inputs. */
function canonicalReceiptJson(value) {
    let nodes = 0;
    const active = new Set();
    const visit = (v, depth) => {
        if (++nodes > 100_000 || depth > 24)
            throw new Error('rank_admin_receipt_json_invalid');
        if (v === null || typeof v === 'boolean' || typeof v === 'string')
            return JSON.stringify(v);
        if (typeof v === 'number' && Number.isFinite(v))
            return JSON.stringify(v);
        if (typeof v !== 'object' || !v || active.has(v))
            throw new Error('rank_admin_receipt_json_invalid');
        const proto = Object.getPrototypeOf(v);
        if (Array.isArray(v) ? proto !== Array.prototype : proto !== Object.prototype && proto !== null)
            throw new Error('rank_admin_receipt_json_invalid');
        if (Reflect.ownKeys(v).some(k => typeof k !== 'string' || dangerousKey(k)
            || !('value' in Object.getOwnPropertyDescriptor(v, k))
            || (!Object.getOwnPropertyDescriptor(v, k).enumerable && !(Array.isArray(v) && k === 'length'))))
            throw new Error('rank_admin_receipt_json_invalid');
        active.add(v);
        let out;
        if (Array.isArray(v)) {
            if (Object.keys(v).length !== v.length || Object.keys(v).some((k, i) => k !== String(i)))
                throw new Error('rank_admin_receipt_json_invalid');
            out = '[' + v.map(x => visit(x, depth + 1)).join(',') + ']';
        }
        else {
            out = '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + visit(v[k], depth + 1)).join(',') + '}';
        }
        active.delete(v);
        return out;
    };
    const result = visit(value, 0);
    if (Buffer.byteLength(result) > RECEIPT_BYTES)
        throw new Error('rank_admin_receipt_json_invalid');
    return result;
}
export function rankAdminReceiptRequest(input, options, kind) {
    canonicalReceiptJson(options);
    if (!isObj(options) || !exact(options, ['actorId', 'key', 'reason']) || !safeId(options.actorId) || !text(options.actorId, 180)
        || !receiptKey(options.key) || !text(options.reason, 180) || options.reason.length < 3)
        throw new Error('rank_admin_receipt_invalid');
    return { scope: JSON.stringify([options.actorId, kind, options.key]),
        fingerprint: createHash('sha256').update(canonicalReceiptJson({ input, reason: options.reason })).digest('hex') };
}
/** Optional additive root field; never trim receipts to make malformed/over-capacity data load. */
export function validRankAdminReceipts(v, validResult) {
    try {
        if (!isObj(v) || Object.keys(v).length > RECEIPT_LIMIT)
            return false;
        canonicalReceiptJson(v);
        return Object.entries(v).every(([scope, receipt]) => {
            const tuple = JSON.parse(scope);
            return Array.isArray(tuple) && tuple.length === 3 && safeId(tuple[0]) && text(tuple[0], 180) && typeof tuple[1] === 'string'
                && receiptKey(tuple[2]) && scope === JSON.stringify(tuple) && isObj(receipt) && exact(receipt, ['fingerprint', 'result'])
                && typeof receipt.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(receipt.fingerprint) && validResult(tuple[1], receipt.result);
        });
    }
    catch {
        return false;
    }
}
export function rankAdminReceiptConflict(code) {
    return Object.assign(new Error(code), { code, status: 409 });
}
const validThresholds = (v, sizes) => v === null || (Array.isArray(v) && sizes.includes(v.length)
    && v.every(safeInt) && v.every((x, i, a) => i === 0 || Number(x) > Number(a[i - 1])));
const validTier = (v) => isObj(v) && exact(v, ['id', 'name', 'artworkUrl', 'accent', 'rarity'])
    && RANKS.includes(v.id) && (v.name === null || text(v.name, 80)) && localArt(v.artworkUrl)
    && (v.accent === null || (typeof v.accent === 'string' && /^#[a-fA-F0-9]{6}$/.test(v.accent)))
    && (v.rarity === null || text(v.rarity, 40));
const validCatalog = (v) => Array.isArray(v) && v.length === 9
    && v.every((tier, i) => validTier(tier) && tier.id === RANKS[i]);
const levelToTier = (level) => ({ id: RANKS[level.rank - 1], name: level.name, artworkUrl: level.artwork, accent: level.color, rarity: level.rarity });
const tierToLevel = (tier, index) => ({ rank: index + 1, name: tier.name, artwork: tier.artworkUrl, color: tier.accent, rarity: tier.rarity });
const validLevels = (v) => Array.isArray(v) && v.length === 9 && v.every((level, i) => isObj(level)
    && exact(level, ['rank', 'name', 'artwork', 'color', 'rarity']) && level.rank === i + 1 && validTier(levelToTier(level)));
const validEventRules = (v) => isObj(v) && exact(v, EVENT_NAMES)
    && EVENT_NAMES.every((name) => isObj(v[name]) && exact(v[name], ['vip', 'noble']) && pointAmount(v[name].vip) && pointAmount(v[name].noble));
export const validProgressConfig = (v) => {
    if (!isObj(v) || v.v !== 1 || !isObj(v.level) || !isObj(v.vip) || !isObj(v.noble) || !isObj(v.rewards))
        return false;
    const size = Array.isArray(v.noble.thresholds) ? v.noble.thresholds.length : 5;
    return v.level.enabled === true && v.level.max === 100 && v.level.formula === 'existing-xp-sqrt-v1'
        && typeof v.vip.enabled === 'boolean' && v.vip.max === 15 && validThresholds(v.vip.thresholds, [15])
        && typeof v.noble.enabled === 'boolean' && Array.isArray(v.noble.ranks) && [5, 9].includes(v.noble.ranks.length)
        && v.noble.ranks.join(',') === RANKS.slice(0, v.noble.ranks.length).join(',') && (size !== 9 || v.noble.ranks.length === 9)
        && validThresholds(v.noble.thresholds, [5, 9]) && (v.noble.catalog === undefined || validCatalog(v.noble.catalog))
        && (v.noble.levels === undefined || validLevels(v.noble.levels))
        && (v.eventRules === undefined || validEventRules(v.eventRules));
};
const validRecord = (v) => isObj(v) && typeof v.id === 'string' && v.id.length > 0 && safeInt(v.ts)
    && SYSTEMS.includes(v.system) && ['grant', 'game', 'gift', 'purchase', 'admin'].includes(String(v.kind))
    && safeInt(v.points) && typeof v.ref === 'string' && typeof v.reason === 'string';
const validPlayer = (v) => isObj(v) && safeInt(v.levelPoints) && safeInt(v.vipPoints) && safeInt(v.noblePoints)
    && (v.noble === null || RANKS.includes(v.noble)) && Array.isArray(v.records) && v.records.every(validRecord);
const validCarry = (v) => isObj(v) && (v.mode === 'none' ? exact(v, ['mode'])
    : v.mode === 'previous' && exact(v, ['mode', 'fromSeasonId', 'percent']) && seasonId(v.fromSeasonId) && safeInt(v.percent) && v.percent <= 100);
function validSeasons(v) {
    if (!Array.isArray(v))
        return false;
    const seen = new Set();
    for (const s of v) {
        if (!isObj(s) || !seasonId(s.id) || seen.has(s.id) || !text(s.name, 80) || !safeInt(s.startAt) || !safeInt(s.endAt)
            || s.endAt <= s.startAt || !safeInt(s.createdAt) || s.createdAt > s.startAt || !validCarry(s.carry) || !validProgressConfig(s.policy))
            return false;
        const startAt = s.startAt, endAt = s.endAt;
        if (s.carry.mode === 'previous') {
            const sourceId = s.carry.fromSeasonId;
            const source = v.find((p) => isObj(p) && p.id === sourceId);
            if (!isObj(source) || !safeInt(source.endAt) || source.endAt > s.createdAt || source.endAt > s.startAt)
                return false;
        }
        if (v.some((other) => isObj(other) && other !== s && safeInt(other.startAt) && safeInt(other.endAt)
            && startAt < other.endAt && other.startAt < endAt))
            return false;
        seen.add(s.id);
    }
    return true;
}
const eventKey = (id, kind, ref) => JSON.stringify([id, kind, ref]);
const validAmounts = (v) => isObj(v) && exact(v, SYSTEMS) && SYSTEMS.every((s) => pointAmount(v[s]));
const validEvent = (v) => isObj(v) && safeId(v.id) && validRef(v.ref) && safeInt(v.ts)
    && (v.kind === 'game' ? ['won', 'played'].includes(String(v.outcome)) : v.kind === 'gift' && ['sent', 'received'].includes(String(v.outcome)))
    && validAmounts(v.amounts) && (v.kind !== 'game' || v.amounts.level === 0);
const validConfigReceiptResult = (v) => validProgressConfig(v) && exact(v, ['v', 'level', 'vip', 'noble', 'rewards', 'eventRules'])
    && exact(v.level, ['enabled', 'max', 'formula']) && exact(v.vip, ['enabled', 'max', 'thresholds'])
    && exact(v.noble, ['enabled', 'ranks', 'thresholds', 'catalog', 'levels']) && validLevels(v.noble.levels) && validEventRules(v.eventRules);
const validSeasonReceiptResult = (v) => isObj(v) && exact(v, ['id', 'name', 'startAt', 'endAt', 'carry', 'createdAt', 'status', 'remainingMs'])
    && seasonId(v.id) && text(v.name, 80) && safeInt(v.startAt) && safeInt(v.endAt) && v.endAt > v.startAt
    && safeInt(v.createdAt) && v.createdAt <= v.startAt && validCarry(v.carry) && ['scheduled', 'active', 'ended'].includes(String(v.status))
    && safeInt(v.remainingMs) && (v.status === 'active' ? v.remainingMs > 0 && v.remainingMs <= v.endAt - v.startAt : v.remainingMs === 0);
const validProgressAdminReceipts = (v) => validRankAdminReceipts(v, (kind, result) => kind === 'config'
    ? validConfigReceiptResult(result) : kind === 'season' && validSeasonReceiptResult(result));
export const validProgression = (v) => isObj(v) && v.v === 1 && validProgressConfig(v.config)
    && isObj(v.players) && Object.values(v.players).every(validPlayer)
    && (v.seasons === undefined || validSeasons(v.seasons)) && (v.events === undefined || (isObj(v.events)
    && Object.entries(v.events).every(([key, event]) => validEvent(event) && key === eventKey(event.id, event.kind, event.ref))))
    && (v.adminReceipts === undefined || validProgressAdminReceipts(v.adminReceipts));
function blank() { return { levelPoints: 0, vipPoints: 0, noblePoints: 0, noble: null, records: [] }; }
function clone(v) { return structuredClone(v); }
const blankCatalog = () => RANKS.map((id) => ({ id, name: null, artworkUrl: null, accent: null, rarity: null }));
function configSnapshot(value) {
    const config = clone(value);
    config.noble.levels ??= (config.noble.catalog ?? blankCatalog()).map(tierToLevel);
    config.eventRules ??= clone(APPROVED_EVENT_REWARDS);
    return config;
}
export class Progression {
    now;
    xpOf;
    d = { v: 1, config: clone(DEFAULT_CONFIG), players: {} };
    disk;
    durable;
    constructor(file = '', now = Date.now, mon = new StorageMonitor(), xpOf) {
        this.now = now;
        this.xpOf = xpOf;
        this.durable = !!file;
        if (file) {
            const loaded = loadJsonFile(file, validProgression);
            if (loaded)
                this.d = loaded;
        }
        this.disk = new Persister('progression', file, () => this.d, this.now, mon, validProgression);
    }
    get persistent() { return this.durable; }
    p(id) { return this.d.players[id] ??= blank(); }
    /** Read-only overlay: historical game LEVEL records never duplicate Accounts XP. */
    canonicalXp(id, baseXp) {
        if (!safeInt(baseXp))
            throw new RangeError('progression_xp_invalid');
        const bonus = (this.d.players[id]?.records ?? []).reduce((sum, r) => sum + (r.system === 'level' && r.kind !== 'game' ? r.points : 0), 0);
        if (!safeInt(bonus) || !safeInt(baseXp + bonus))
            throw new RangeError('progression_xp_overflow');
        return baseXp + bonus;
    }
    rank(points, thresholds, labels) {
        if (!thresholds?.length)
            return null;
        let out = null;
        for (let i = 0; i < thresholds.length; i++)
            if (points >= thresholds[i])
                out = labels[i];
        return out;
    }
    nextView(enabled, thresholds, value, prefix) {
        const current = value ? Number(value.slice(1)) : 0;
        if (!enabled || !thresholds)
            return { pointsFloor: null, pointsNext: null, nextRank: null };
        return { pointsFloor: current > 0 ? thresholds[current - 1] : 0, pointsNext: current < thresholds.length ? thresholds[current] : null,
            nextRank: current < thresholds.length ? `${prefix}${current + 1}` : null };
    }
    nobleView(points, config = this.d.config) {
        const { enabled, thresholds } = config.noble;
        const value = enabled ? this.rank(points, thresholds, RANKS) : null;
        const current = value ? Number(value.slice(1)) : 0;
        const catalog = (config.noble.levels?.map(levelToTier) ?? config.noble.catalog ?? blankCatalog()).map((tier, i) => {
            const threshold = thresholds?.[i] ?? null;
            const available = enabled && threshold !== null;
            const state = !available ? 'unavailable' : i + 1 === current ? 'current' : i + 1 < current ? 'passed' : 'locked';
            return { ...clone(tier), ...tierToLevel(tier, i), threshold, configured: threshold !== null, available, state };
        });
        const next = this.nextView(enabled, thresholds, value, 'N');
        return { value, points, enabled, ranks: [...RANKS], max: 9, activeMax: thresholds?.length ?? 0, ...next, catalog,
            currentTier: catalog.find((tier) => tier.id === value) ?? null, nextTier: catalog.find((tier) => tier.id === next.nextRank) ?? null };
    }
    /** Pure read: no player creation, point grant, season reset, or persistence on page views. */
    view(id, baseXp = 0) {
        const p = this.d.players[id] ?? blank();
        const levelXp = this.canonicalXp(id, this.xpOf ? this.xpOf(id) : baseXp);
        const level = Math.min(100, 1 + Math.floor(Math.sqrt(levelXp / 40)));
        const vipRank = this.d.config.vip.enabled ? this.rank(p.vipPoints, this.d.config.vip.thresholds, Array.from({ length: 15 }, (_, i) => `V${i + 1}`)) : null;
        const active = this.activeSeason();
        return { level: { value: level, xp: levelXp, xpFloor: 40 * (level - 1) ** 2, xpNext: level >= 100 ? null : 40 * level ** 2, enabled: true, max: 100 },
            vip: { value: vipRank, points: p.vipPoints, enabled: this.d.config.vip.enabled, max: 15, ...this.nextView(this.d.config.vip.enabled, this.d.config.vip.thresholds, vipRank, 'V') },
            noble: this.nobleView(p.noblePoints), season: active ? this.seasonView(id, active.id) : null, records: clone(p.records.slice(-50).reverse()) };
    }
    configView() {
        return configSnapshot(this.d.config);
    }
    eventRulesView() { return clone(this.d.config.eventRules ?? APPROVED_EVENT_REWARDS); }
    eventRecords(id) { return clone(this.d.players[id]?.records ?? []); }
    all() {
        return Object.entries(this.d.players).map(([id, p]) => {
            const view = this.view(id);
            return { id, vipPoints: p.vipPoints, noblePoints: p.noblePoints, noble: view.noble.value, vip: view.vip.value,
                xp: view.level.xp, level: view.level.value, records: p.records.length };
        });
    }
    /** Whitelisted public metadata only: no opaque rewards, event receipts, or grant history. */
    publicRankMetadata() {
        const noble = this.nobleView(0);
        return { level: { enabled: true, max: 100 }, vip: { enabled: this.d.config.vip.enabled, max: 15, thresholds: clone(this.d.config.vip.thresholds) },
            noble: { enabled: noble.enabled, max: 9, activeMax: noble.activeMax, ranks: noble.ranks, thresholds: clone(this.d.config.noble.thresholds), catalog: noble.catalog },
            season: this.activeSeason() ? this.seasonSummary(this.activeSeason()) : null, seasons: this.seasonsView() };
    }
    rankPage(id) {
        const progression = this.view(id);
        return { progression, catalog: progression.noble.catalog, season: progression.season, seasons: this.seasonsView() };
    }
    catalogView(id, selectedSeasonId) {
        if (selectedSeasonId !== undefined) {
            if (!id)
                throw new Error('progression_player_required');
            return this.seasonView(id, selectedSeasonId).noble.catalog;
        }
        return this.nobleView(id ? this.d.players[id]?.noblePoints ?? 0 : 0).catalog;
    }
    /** R67ae: تفعيل نوبل N6–N9 بطلب المالك — مرة وحدة. الحدود الجديدة = ضعف اللي قبلها، والأسماء ما تمس اللي حدده المالك */
    ensureNineNoble(drafts) {
        const n = this.d.config.noble;
        if (n.ranks.length === 9)
            return false;
        const t = n.thresholds;
        const thresholds = Array.isArray(t) && t.length === 5 ? [...t, t[4] * 2, t[4] * 4, t[4] * 8, t[4] * 16] : null;
        const have = n.levels ?? (n.catalog ?? blankCatalog()).map(tierToLevel);
        const levels = drafts.map((d, i) => ({ rank: i + 6, name: d.name, artwork: d.artwork, color: d.color, rarity: d.rarity })).filter((l) => !have[l.rank - 1]?.name);
        this.updateConfig({ noble: { ranks: [...RANKS], ...(thresholds && thresholds.every((x) => Number.isSafeInteger(x)) ? { thresholds } : {}), ...(levels.length ? { levels } : {}) } });
        return true;
    }
    updateConfig(patch) {
        const next = this.prepareConfig(patch);
        const before = this.d.config;
        this.d.config = next;
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d.config = before;
            throw e;
        }
        return this.configView();
    }
    /** Exact retries return the original result, never reapply an older configuration. */
    updateConfigReceipt(patch, options) {
        const request = rankAdminReceiptRequest(patch, options, 'config'), old = this.d.adminReceipts?.[request.scope];
        if (old) {
            if (old.fingerprint !== request.fingerprint)
                throw rankAdminReceiptConflict('progression_receipt_conflict');
            return { config: clone(old.result), duplicate: true };
        }
        const next = this.prepareConfig(patch), config = configSnapshot(next);
        const receipts = { ...this.d.adminReceipts, [request.scope]: { fingerprint: request.fingerprint, result: clone(config) } };
        if (!validProgressAdminReceipts(receipts))
            throw rankAdminReceiptConflict('progression_receipt_capacity');
        const before = this.d;
        this.d = { ...before, config: next, adminReceipts: receipts };
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = before;
            throw e;
        }
        return { config, duplicate: false };
    }
    prepareConfig(patch) {
        if (!isObj(patch) || !exact(patch, ['vip', 'noble', 'rewards', 'eventRules']))
            throw new Error('progression_config_invalid');
        const next = clone(this.d.config);
        for (const system of ['vip', 'noble']) {
            const input = patch[system];
            if (input === undefined)
                continue;
            if (!isObj(input) || !exact(input, system === 'vip' ? ['enabled', 'thresholds', 'max'] : ['enabled', 'thresholds', 'catalog', 'levels', 'ranks'])
                || (system === 'vip' && input.max !== undefined && input.max !== 15))
                throw new Error('progression_config_invalid');
            if (input.enabled !== undefined) {
                if (typeof input.enabled !== 'boolean')
                    throw new Error('progression_config_invalid');
                next[system].enabled = input.enabled;
            }
            if (input.thresholds !== undefined) {
                if (!validThresholds(input.thresholds, system === 'vip' ? [15] : [5, 9]) || input.thresholds === null)
                    throw new Error('progression_thresholds_required');
                next[system].thresholds = [...input.thresholds];
                if (system === 'noble')
                    next.noble.ranks = RANKS.slice(0, input.thresholds.length);
            }
            if (system === 'noble' && input.ranks !== undefined) {
                if (!Array.isArray(input.ranks) || ![5, 9].includes(input.ranks.length) || input.ranks.join(',') !== RANKS.slice(0, input.ranks.length).join(','))
                    throw new Error('progression_config_invalid');
                next.noble.ranks = [...input.ranks];
            }
            if (system === 'noble' && input.levels !== undefined) {
                if (input.catalog !== undefined || !Array.isArray(input.levels) || input.levels.length > 9)
                    throw new Error('progression_catalog_invalid');
                const levels = clone(next.noble.levels ?? (next.noble.catalog ?? blankCatalog()).map(tierToLevel)), seen = new Set();
                for (const change of input.levels) {
                    if (!isObj(change) || !safeInt(change.rank) || change.rank < 1 || change.rank > 9 || seen.has(change.rank)
                        || !exact(change, ['rank', 'name', 'artwork', 'color', 'rarity']))
                        throw new Error('progression_catalog_invalid');
                    const level = { ...levels[change.rank - 1], ...change };
                    if (!validTier(levelToTier(level)))
                        throw new Error('progression_catalog_invalid');
                    seen.add(level.rank);
                    levels[level.rank - 1] = level;
                }
                next.noble.levels = levels;
                delete next.noble.catalog;
            }
            if (system === 'noble' && input.catalog !== undefined) {
                if (!Array.isArray(input.catalog) || input.catalog.length > 9)
                    throw new Error('progression_catalog_invalid');
                const catalog = clone(next.noble.levels?.map(levelToTier) ?? next.noble.catalog ?? blankCatalog()), seen = new Set();
                for (const change of input.catalog) {
                    if (!isObj(change) || !RANKS.includes(change.id) || !exact(change, ['id', 'name', 'artworkUrl', 'accent', 'rarity']) || seen.has(String(change.id)))
                        throw new Error('progression_catalog_invalid');
                    const index = RANKS.indexOf(change.id), tier = { ...catalog[index], ...change };
                    if (!validTier(tier))
                        throw new Error('progression_catalog_invalid');
                    seen.add(tier.id);
                    catalog[index] = tier;
                }
                next.noble.levels = catalog.map(tierToLevel);
                delete next.noble.catalog;
            }
        }
        if (patch.rewards !== undefined) {
            if (!isObj(patch.rewards))
                throw new Error('progression_rewards_invalid');
            next.rewards = clone(patch.rewards);
        }
        if (patch.eventRules !== undefined) {
            if (!isObj(patch.eventRules) || !exact(patch.eventRules, EVENT_NAMES))
                throw new Error('progression_event_rules_invalid');
            const rules = clone(next.eventRules ?? APPROVED_EVENT_REWARDS);
            for (const name of EVENT_NAMES) {
                const change = patch.eventRules[name];
                if (change === undefined)
                    continue;
                if (!isObj(change) || !exact(change, ['vip', 'noble']))
                    throw new Error('progression_event_rules_invalid');
                const amounts = { ...rules[name], ...change };
                if (!pointAmount(amounts.vip) || !pointAmount(amounts.noble))
                    throw new Error('progression_event_rules_invalid');
                rules[name] = amounts;
            }
            next.eventRules = rules;
        }
        if (next.vip.enabled && !next.vip.thresholds)
            throw new Error('vip_thresholds_required');
        if (next.noble.enabled && !next.noble.thresholds)
            throw new Error('noble_thresholds_required');
        if (!validProgressConfig(next))
            throw new Error('progression_config_invalid');
        return next;
    }
    activeSeason() { const now = this.now(); return this.d.seasons?.find((s) => s.startAt <= now && now < s.endAt) ?? null; }
    seasonSummary(s) {
        const now = this.now();
        const status = now < s.startAt ? 'scheduled' : now < s.endAt ? 'active' : 'ended';
        return { id: s.id, name: s.name, startAt: s.startAt, endAt: s.endAt, createdAt: s.createdAt, carry: clone(s.carry), status,
            remainingMs: status === 'active' ? s.endAt - now : 0 };
    }
    seasonsView() { return (this.d.seasons ?? []).map((s) => this.seasonSummary(s)); }
    /** No implicit activation/reset. Windows are explicit, non-overlapping and cannot retroactively capture history. */
    createSeason(input) {
        const { season, next } = this.prepareSeason(input);
        const before = this.d.seasons;
        this.d.seasons = next;
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d.seasons = before;
            throw e;
        }
        return this.seasonSummary(season);
    }
    createSeasonReceipt(input, options) {
        const request = rankAdminReceiptRequest(input, options, 'season'), old = this.d.adminReceipts?.[request.scope];
        if (old) {
            if (old.fingerprint !== request.fingerprint)
                throw rankAdminReceiptConflict('progression_receipt_conflict');
            return { season: clone(old.result), duplicate: true };
        }
        const prepared = this.prepareSeason(input), season = this.seasonSummary(prepared.season);
        const receipts = { ...this.d.adminReceipts, [request.scope]: { fingerprint: request.fingerprint, result: clone(season) } };
        if (!validProgressAdminReceipts(receipts))
            throw rankAdminReceiptConflict('progression_receipt_capacity');
        const before = this.d;
        this.d = { ...before, seasons: prepared.next, adminReceipts: receipts };
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = before;
            throw e;
        }
        return { season, duplicate: false };
    }
    prepareSeason(input) {
        const now = this.now();
        if (!isObj(input) || !exact(input, ['id', 'name', 'startAt', 'endAt', 'carry']) || !seasonId(input.id) || !text(input.name, 80)
            || !safeInt(now) || !safeInt(input.startAt) || input.startAt < now || !safeInt(input.endAt) || input.endAt <= input.startAt || !validCarry(input.carry))
            throw new Error('progression_season_invalid');
        if (!this.d.config.noble.enabled || !this.d.config.noble.thresholds)
            throw new Error('noble_thresholds_required');
        if (this.d.seasons?.some((s) => s.id === input.id))
            throw new Error('progression_season_exists');
        const season = { id: input.id, name: input.name, startAt: input.startAt, endAt: input.endAt, carry: clone(input.carry), createdAt: now, policy: this.configView() };
        const next = [...(this.d.seasons ?? []), season];
        if (!validSeasons(next))
            throw new Error('progression_season_overlap_or_carry_invalid');
        return { season, next };
    }
    getSeason(id) {
        if (!seasonId(id))
            throw new Error('progression_season_invalid');
        const season = this.d.seasons?.find((s) => s.id === id);
        if (!season)
            throw new Error('progression_season_not_found');
        return season;
    }
    seasonPoints(id, season) {
        // The source timestamp, not delivery time, assigns canonical grants to a season. Admin/purchase/mission points are excluded.
        const earnedPoints = Object.values(this.d.events ?? {}).reduce((sum, event) => sum + (event.id === id
            && season.startAt <= event.ts && event.ts < season.endAt ? event.amounts.noble : 0), 0);
        const carriedPoints = season.carry.mode === 'previous'
            ? Number(BigInt(this.seasonPoints(id, this.getSeason(season.carry.fromSeasonId)).points) * BigInt(season.carry.percent) / 100n) : 0;
        if (!safeInt(earnedPoints) || !safeInt(carriedPoints) || !safeInt(earnedPoints + carriedPoints))
            throw new RangeError('progression_points_overflow');
        return { earnedPoints, carriedPoints, points: earnedPoints + carriedPoints };
    }
    seasonView(id, selectedSeasonId) {
        const season = this.getSeason(selectedSeasonId), totals = this.seasonPoints(id, season);
        return { ...this.seasonSummary(season), ...totals, noble: this.nobleView(totals.points, season.policy), claimsScope: 'lifetime' };
    }
    /** Real persisted rank points only. Parent can pass canonical Accounts.has to exclude deleted/unknown accounts. */
    standings(options = {}, include = () => true) {
        if (!isObj(options) || !exact(options, ['seasonId', 'limit', 'offset', 'userId']) || (options.userId !== undefined && !safeId(options.userId))
            || (options.seasonId !== undefined && !seasonId(options.seasonId)))
            throw new Error('progression_standings_invalid');
        const limit = options.limit ?? 50, offset = options.offset ?? 0;
        if (!safeInt(limit) || limit < 1 || limit > 100 || !safeInt(offset))
            throw new Error('progression_standings_invalid');
        const season = options.seasonId === undefined ? null : this.getSeason(options.seasonId);
        const config = season?.policy ?? this.d.config;
        const entries = Object.entries(this.d.players).filter(([id]) => include(id)).map(([id, p]) => ({ id, points: season ? this.seasonPoints(id, season).points : p.noblePoints }))
            .sort((a, b) => b.points - a.points || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
            .map((entry, i) => { const noble = this.nobleView(entry.points, config); return { position: i + 1, ...entry, noble: noble.value, currentTier: noble.currentTier }; });
        return { scope: season ? 'season' : 'lifetime', seasonId: season?.id ?? null, total: entries.length, offset, limit,
            entries: entries.slice(offset, offset + limit), me: options.userId ? entries.find((entry) => entry.id === options.userId) ?? null : null };
    }
    frozenEvents() { return new ProgressionEvents(this, (events) => this.applyCanonicalEvents(events, true)); }
    /** Server-only canonical receipt read; never expose this as an input-capable HTTP endpoint. */
    eventSnapshot(id, kind, ref) {
        const event = this.d.events?.[eventKey(id, kind, ref)];
        return event ? clone(event) : null;
    }
    /** Ordinary trusted consumers retain current-policy gating; frozenEvents is only for the existing durable outbox. */
    recordCanonicalEvents(events) { return this.applyCanonicalEvents(events, false); }
    applyCanonicalEvents(events, frozen) {
        if (!Array.isArray(events) || !events.every(validEvent))
            throw new Error('progression_event_invalid');
        const beforePlayers = clone(this.d.players), beforeEvents = this.d.events === undefined ? undefined : clone(this.d.events);
        let applied = 0, skipped = 0, changed = false;
        try {
            for (const event of events) {
                const key = eventKey(event.id, event.kind, event.ref), old = this.d.events?.[key];
                if (old && JSON.stringify(old) !== JSON.stringify(event))
                    throw new Error('progression_grant_conflict');
                for (const system of SYSTEMS) {
                    const points = event.amounts[system];
                    if (!points)
                        continue;
                    const policy = frozen ? { ...this.d.config, vip: { ...this.d.config.vip, enabled: true }, noble: { ...this.d.config.noble, enabled: true } } : this.d.config;
                    this.validateGrant(event.id, system, points, `${event.ref}:${system}`, event.outcome, event.kind, policy);
                    const p = this.p(event.id);
                    if (this.duplicate(p, system, `${event.ref}:${system}`, points, event.kind)) {
                        skipped++;
                        continue;
                    }
                    this.add(p, system, points);
                    p.records.push({ id: `${event.ts}-${p.records.length}`, ts: event.ts, system, kind: event.kind, points, ref: `${event.ref}:${system}`,
                        reason: event.kind === 'game' ? event.outcome === 'won' ? 'نهاية مباراة: فوز' : 'نهاية مباراة: مشاركة' : event.outcome === 'sent' ? 'هدية مرسلة' : 'هدية مستلمة' });
                    this.canonicalXp(event.id, this.xpOf ? this.xpOf(event.id) : 0);
                    applied++;
                }
                if (!old) {
                    (this.d.events ??= {})[key] = clone(event);
                    changed = true;
                }
            }
            if (changed || applied)
                this.disk.mustSave();
            return { applied, skipped };
        }
        catch (e) {
            this.d.players = beforePlayers;
            this.d.events = beforeEvents;
            throw e;
        }
    }
    validateGrant(id, system, points, ref, reason, kind, policy = this.d.config) {
        if (!safeId(id) || !SYSTEMS.includes(system) || !['grant', 'game', 'gift', 'purchase', 'admin'].includes(kind)
            || !validRef(ref) || !pointAmount(points) || points === 0 || typeof reason !== 'string')
            throw new Error('progression_grant_invalid');
        if ((system === 'vip' && !policy.vip.enabled) || (system === 'noble' && !policy.noble.enabled))
            throw new Error('progression_system_disabled');
    }
    duplicate(p, system, ref, points, kind) {
        const record = p.records.find((r) => r.system === system && r.ref === ref);
        if (record && (record.points !== points || record.kind !== kind))
            throw new Error('progression_grant_conflict');
        return !!record;
    }
    add(p, system, points) {
        const field = system === 'level' ? 'levelPoints' : system === 'vip' ? 'vipPoints' : 'noblePoints';
        if (!safeInt(p[field] + points))
            throw new RangeError('progression_points_overflow');
        p[field] += points;
    }
    grant(id, system, points, ref, reason, kind = 'admin') {
        this.validateGrant(id, system, points, ref, reason, kind);
        const before = this.d.players[id] ? clone(this.d.players[id]) : undefined, p = this.p(id);
        if (this.duplicate(p, system, ref, points, kind))
            return { ok: true, dup: true, ...this.view(id) };
        const ts = this.now();
        let view;
        try {
            this.add(p, system, points);
            p.records.push({ id: `${ts}-${p.records.length}`, ts, system, kind, points, ref, reason: reason.slice(0, 180) });
            view = this.view(id);
            this.disk.mustSave();
        }
        catch (e) {
            if (before)
                this.d.players[id] = before;
            else
                delete this.d.players[id];
            throw e;
        }
        return { ok: true, dup: false, ...view };
    }
    grantMany(items) {
        const before = clone(this.d.players), ts = this.now();
        let applied = 0, skipped = 0;
        try {
            for (const item of items) {
                this.validateGrant(item.id, item.system, item.points, item.ref, item.reason, item.kind ?? 'admin');
                const p = this.p(item.id);
                if (this.duplicate(p, item.system, item.ref, item.points, item.kind ?? 'admin')) {
                    skipped++;
                    continue;
                }
                this.add(p, item.system, item.points);
                p.records.push({ id: `${ts}-${p.records.length}`, ts, system: item.system, kind: item.kind ?? 'admin', points: item.points, ref: item.ref, reason: item.reason.slice(0, 180) });
                this.canonicalXp(item.id, this.xpOf ? this.xpOf(item.id) : 0);
                applied++;
            }
            if (applied)
                this.disk.mustSave();
            return { applied, skipped };
        }
        catch (e) {
            this.d.players = before;
            throw e;
        }
    }
    retry() { this.disk.retry(); }
    unsaved() { return this.disk.unsaved; }
}
