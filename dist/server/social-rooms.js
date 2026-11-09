import { currentWeek, validRoomWeek, validAllSenders, addSender, topOf } from './room-supporters-r58.js';
import { CANNON3_LEVELS, newCannon3, validRoomCannon3, cannon3Add, cannon3Grants, cannon3CampaignId, cannon3Fingerprint, cannon3Art, cannon3Top } from './room-cannon-r59.js';
/** R59: المدفع القديم (R27/R58t) انقفل وانستبدل بمدفع R59 بطلب المالك. بياناته تبقى محفوظة، وأي جوائز معلّقة فيه تنصرف عادي. */
const LEGACY_CANNON = false;
/** R59: صاروخ الغرفة انقفل (انتقل للقبيلة) */
const ROOM_ROCKET = false;
import { ROCKET_PLANETS, ROCKET_SENDERS_MAX, ROCKET_LUCK_MIN_MS, currentRocket, rocketBoundaries, validRoomRocket, rocketCampaignId, rocketFingerprint, rocketGrants, rocketWinners, rocketLuckPick, rocketShareOf, rocketGiftArt } from './room-rocket-r58.js';
import { roomCapacityBonus, roomLevelPerks, ROOM_LEVEL_MAX, roomCodeOf, roomLevelOf, ROOM_VANITY, ROOM_ADS_MAX, currentRoomMonth, roomRankView, validRoomMonth, ROOM_MONTH_SENDERS_MAX } from './room-extras-r58.js';
import { ENTRANCE_ART_PATHS } from './entrance-catalog.js';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { DataDirectoryLock } from './data-directory-lock.js';
import { isObj, loadJsonFile, saveJsonFile, StorageMonitor } from './datafile.js';
import { SOCIAL_MODE_IDS, SOCIAL_GAME_IDS, socialText } from './social-mode-contract.js';
import { SOCIAL_MODES, validSocialModeState, advanceSocialGamesR47 } from './social-modes/index.js';
import { defaultSocialContent, validSocialContent, hydrateSocialContentR47, hydrateSocialRoomsGamesR47 } from './social-content.js';
import { planRoomUpgradeR47, projectRoomUpgradeR47, validRoomUpgradeMetadataR47 } from './room-upgrade-r47.js';
import { CHALLENGE_RECEIPT_CAP, SUPPORT_RECEIPT_CAP, SUPPORT_EVENT_TTL_MS, challengeTotals, finishChallenge, supportGiftValue, validChallenge, validGiftSupportContext, validSupportEvent, validSupportReceipt } from './social-challenge.js';
import { CANNON_VERSION_V1, CANNON_RECEIPT_CAP, cannonAwardFingerprint, cannonGiftValue, cannonHash, cannonReason, createCannon, validCannonGiftContext, validCannonState, validateCannonCatalog } from './social-cannon-r27.js';
import { councilSeatLayout, validLockedSeats, validRoomTheme, validSeatIndex, ROOM_BG_LEVEL, ROOM_BG_STORE } from './social-room-controls-r27.js';
export { ROOM_BACKGROUND_PRESETS } from './social-room-controls-r27.js';
import { DIRECTORY_LIMIT_R30, UNSUPPORTED_ROOM_MODES_R30, directoryCapabilitiesR30, validDirectoryMode, validDirectoryTag, validDirectoryCountry, validRoomPasswordR30, validPasswordInputR30, makeRoomPasswordR30, verifyRoomPasswordR30, passwordFingerprintR30 } from './social-directory-r30.js';
// room-tools-r33: imports
import { initialRoomToolsR33, validRoomToolsR33, validRoomToolResultR33, applyRoomToolR33, projectRoomToolsR33 } from './social-room-tools-r33.js';
const roomPermissionKeys = ['identity', 'entry', 'seats', 'audio', 'chat', 'moderation'];
const defaultRoomSettings = () => ({ theme: 'royal', highQuality: false, micRequests: false, speak: 'everyone', chat: 'everyone', luckyBag: 'everyone', moderatorPermissions: { identity: true, entry: true, seats: true, audio: true, chat: true, moderation: true } });
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const validRoomVideo = (v) => isObj(v) && keys(v, ['vid', 'by', 'base', 'paused', 'at']) && typeof v.vid === 'string' && YT_ID.test(v.vid) && typeof v.by === 'string' && v.by.length <= 80 && nat(v.base) && (v.paused === null || (typeof v.paused === 'number' && Number.isFinite(v.paused) && v.paused >= 0 && v.paused <= 86400 * 2)) && nat(v.at);
const uuid = (x) => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const ident = (x) => typeof x === 'string' && x.length > 0 && x.length <= 128 && !/[\s\u0000-\u001f\u007f]/.test(x);
const nat = (x) => Number.isSafeInteger(x) && x >= 0;
const num = (x, min, max) => nat(x) && x >= min && x <= max;
const str = (x, max) => typeof x === 'string' && x.length <= max;
const strings = (x, test = ident, max = 10000) => Array.isArray(x) && x.length <= max && x.every(test) && new Set(x).size === x.length;
const keys = (x, allowed) => Object.keys(x).every(k => allowed.includes(k));
const privacy = (x) => x === 'public' || x === 'private';
const kinds = ['public', 'pair', 'group', 'private', 'quiet'];
const ref = (x) => isObj(x) && keys(x, ['roomId', 'councilId']) && uuid(x.roomId) && uuid(x.councilId);
const jsonSafe = (x, depth = 0) => depth <= 20 && (x === null || typeof x === 'boolean' || typeof x === 'string' && x.length <= 12000 || typeof x === 'number' && Number.isFinite(x) || Array.isArray(x) && x.length <= 5000 && x.every(v => jsonSafe(v, depth + 1)) || isObj(x) && Object.keys(x).length <= 1000 && Object.entries(x).every(([k, v]) => !['__proto__', 'constructor', 'prototype'].includes(k) && jsonSafe(v, depth + 1)));
const canonical = (v) => JSON.stringify(v, (_k, x) => isObj(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const stamp = (x) => nat(x);
const modeMap = (x, check) => isObj(x) && Object.keys(x).length === SOCIAL_MODE_IDS.length && SOCIAL_MODE_IDS.every(id => check(x[id]));
const digest = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const validSettings = (x) => isObj(x) && keys(x, ['theme', 'highQuality', 'micRequests', 'speak', 'chat', 'luckyBag', 'moderatorPermissions']) && Object.entries(x).every(([k, v]) => k === 'theme' ? validRoomTheme(v) : k === 'moderatorPermissions' ? isObj(v) && keys(v, roomPermissionKeys) && Object.values(v).every(v => typeof v === 'boolean') : k === 'luckyBag' ? v === 'everyone' || v === 'moderators' || v === 'owner' : k === 'speak' || k === 'chat' ? v === 'everyone' || v === 'moderators' : typeof v === 'boolean');
/** Never accepts a player ID or external URL; account and room storage keys are disjoint. */
export function roomCoverKey(roomId, hash) { if (!uuid(roomId) || !digest(hash))
    throw new TypeError('invalid_room_cover'); return `room:${roomId}:${hash}`; }
/** Strict social-domain schema, including uniqueness, capacities, admission references and durable receipt shape. Corruption never starts a fresh store. */
export function validSocialRooms(d) {
    d = hydrateSocialRoomsGamesR47(d);
    if (!keys(d, ['v', 'rooms', 'preferences', 'receipts', 'reports', 'audit', 'config', 'supportReceipts', 'supportEvents']) || d.v !== 1 || !Array.isArray(d.rooms) || d.rooms.length > 1000 || !Array.isArray(d.preferences) || !Array.isArray(d.receipts) || !Array.isArray(d.reports) || !Array.isArray(d.audit) || !isObj(d.config))
        return false;
    if (Object.hasOwn(d, 'supportReceipts') && (!Array.isArray(d.supportReceipts) || d.supportReceipts.length > SUPPORT_RECEIPT_CAP || !d.supportReceipts.every(validSupportReceipt) || new Set(d.supportReceipts.map(r => r.id)).size !== d.supportReceipts.length))
        return false;
    const supportIds = new Set(d.supportReceipts?.map(r => r.id));
    if (Object.hasOwn(d, 'supportEvents') && (!Array.isArray(d.supportEvents) || d.supportEvents.length > 100 || !d.supportEvents.every(validSupportEvent) || new Set(d.supportEvents.map(e => e.id)).size !== d.supportEvents.length || d.supportEvents.some(e => !supportIds.has(e.id))))
        return false;
    const cfg = d.config;
    if (!keys(cfg, ['enabled', 'maxCouncilSeats', 'defaultCouncilSeats', 'content']) || typeof cfg.enabled !== 'boolean' || !num(cfg.maxCouncilSeats, 2, 12) || !num(cfg.defaultCouncilSeats, 2, cfg.maxCouncilSeats) || !isObj(cfg.content) || !validSocialContent(cfg.content))
        return false;
    const roomIds = new Set(), councilIds = new Set(), users = new Set(), channels = new Set(), challengeIds = new Set(), scoredIds = new Set();
    const cannonIds = new Set(), cannonReceiptIds = new Set();
    for (const r of d.rooms) {
        if (!isObj(r) || !keys(r, ['id', 'name', 'description', 'privacy', 'memory', 'maxMembers', 'ownerId', 'hostId', 'moderators', 'invites', 'bans', 'members', 'councils', 'memories', 'activity', 'createdAt', 'updatedAt', 'settings', 'micRequests', 'micApprovals', 'cover', 'challenge', 'cannon', 'roomMode', 'roomTag', 'country', 'password', 'upgrade', 'vanity', 'vanityItem', 'support', 'ads', 'month', 'rocket', 'week', 'allSenders', 'cannon3', 'video']) || !uuid(r.id) || roomIds.has(r.id) || !str(r.name, 80) || !r.name.trim() || !str(r.description, 400) || !privacy(r.privacy) || typeof r.memory !== 'boolean' || !num(r.maxMembers, 2, 50) || !ident(r.ownerId) || !(r.hostId === null || ident(r.hostId)) || !strings(r.moderators, ident, 50) || r.moderators.includes(r.ownerId) || !strings(r.invites, ident, 200) || !Array.isArray(r.bans) || r.bans.length > 500 || !Array.isArray(r.members) || r.members.length > r.maxMembers || !Array.isArray(r.councils) || r.councils.length > 50 || !Array.isArray(r.memories) || r.memories.length > 100 || !Array.isArray(r.activity) || r.activity.length > 100 || !stamp(r.createdAt) || !stamp(r.updatedAt))
            return false;
        if (Object.hasOwn(r, 'upgrade') && !validRoomUpgradeMetadataR47(r.upgrade))
            return false;
        if (Object.hasOwn(r, 'vanity') && (typeof r.vanity !== 'string' || !ROOM_VANITY.test(r.vanity) || typeof r.vanityItem !== 'string'))
            return false;
        if (Object.hasOwn(r, 'support') && !nat(r.support))
            return false;
        if (Object.hasOwn(r, 'video') && !validRoomVideo(r.video))
            return false;
        if (Object.hasOwn(r, 'month') && !validRoomMonth(r.month))
            return false;
        if (Object.hasOwn(r, 'rocket') && !validRoomRocket(r.rocket))
            return false;
        if (Object.hasOwn(r, 'cannon3') && !validRoomCannon3(r.cannon3))
            return false;
        if (Object.hasOwn(r, 'week') && !validRoomWeek(r.week) || Object.hasOwn(r, 'allSenders') && !validAllSenders(r.allSenders))
            return false;
        if (Object.hasOwn(r, 'ads') && (!Array.isArray(r.ads) || r.ads.length > ROOM_ADS_MAX || r.ads.some((a) => !isObj(a) || !keys(a, ['id', 'text', 'at']) || !uuid(a.id) || !str(a.text, 200) || !a.text.trim() || !nat(a.at))))
            return false;
        if (Object.hasOwn(r, 'roomMode') && !validDirectoryMode(r.roomMode) || Object.hasOwn(r, 'roomTag') && !validDirectoryTag(r.roomTag) || Object.hasOwn(r, 'country') && !validDirectoryCountry(r.country) || Object.hasOwn(r, 'password') && !validRoomPasswordR30(r.password))
            return false;
        if (Object.hasOwn(r, 'cannon')) {
            if (!validCannonState(r.cannon) || r.cannon.enabledAt < r.createdAt || cannonIds.has(r.cannon.id) || r.cannon.receipts.some(x => cannonReceiptIds.has(x.id)))
                return false;
            cannonIds.add(r.cannon.id);
            r.cannon.receipts.forEach(x => cannonReceiptIds.add(x.id));
        }
        if (Object.hasOwn(r, 'challenge')) {
            const challenge = r.challenge;
            if (!validChallenge(challenge) || challenge.receipts.some(x => !supportIds.has(x.id)) || challenge.status === 'active' && !r.councils.some(c => isObj(c) && c.id === challenge.councilId))
                return false;
            if (challengeIds.has(challenge.id) || challenge.receipts.some(x => scoredIds.has(x.id)))
                return false;
            challengeIds.add(challenge.id);
            challenge.receipts.forEach(x => scoredIds.add(x.id));
        }
        if (Object.hasOwn(r, 'settings') && !validSettings(r.settings) || Object.hasOwn(r, 'cover') && !digest(r.cover))
            return false;
        for (const k of ['micRequests', 'micApprovals'])
            if (Object.hasOwn(r, k) && (!strings(r[k], ident, 50) || r[k].some(id => !r.members.some(m => m.id === id && m.councilId !== null))))
                return false;
        if (Array.isArray(r.micRequests) && Array.isArray(r.micApprovals) && r.micRequests.some(id => r.micApprovals.includes(id)))
            return false;
        roomIds.add(r.id);
        const banned = new Set();
        for (const b of r.bans) {
            if (!isObj(b) || !keys(b, ['id', 'reason']) || !ident(b.id) || !str(b.reason, 400) || banned.has(b.id))
                return false;
            banned.add(b.id);
        }
        const memberIds = new Set();
        for (const m of r.members) {
            if (!isObj(m) || !keys(m, ['id', 'councilId', 'joinedAt', 'epoch', 'muted', 'deadline', 'seatIndex']) || !ident(m.id) || users.has(m.id) || banned.has(m.id) || !(m.councilId === null || uuid(m.councilId)) || !stamp(m.joinedAt) || !uuid(m.epoch) || typeof m.muted !== 'boolean' || !(m.deadline === null || stamp(m.deadline)))
                return false;
            if (Object.hasOwn(m, 'seatIndex') && (m.councilId === null || !validSeatIndex(m.seatIndex, 12)))
                return false;
            users.add(m.id);
            memberIds.add(m.id);
        }
        if (r.hostId !== null && !memberIds.has(r.hostId))
            return false;
        const localCouncils = new Set();
        for (const c of r.councils) {
            if (!isObj(c) || !keys(c, ['id', 'name', 'description', 'kind', 'privacy', 'ownerId', 'hostId', 'seats', 'locked', 'lockedSeats', 'allowRequests', 'invites', 'requests', 'channel', 'createdAt', 'modeEnabled', 'modes', 'chat', 'tools']) || !uuid(c.id) || councilIds.has(c.id) || !str(c.name, 80) || !c.name.trim() || !str(c.description, 400) || !kinds.includes(c.kind) || !privacy(c.privacy) || !ident(c.ownerId) || !(c.hostId === null || ident(c.hostId)) || !num(c.seats, 2, 12) || c.kind === 'pair' && c.seats !== 2 || c.kind === 'group' && !num(c.seats, 3, 5) || typeof c.locked !== 'boolean' || typeof c.allowRequests !== 'boolean' || !strings(c.invites, ident, 200) || !strings(c.requests, ident, 50) || !uuid(c.channel) || channels.has(c.channel) || !stamp(c.createdAt) || !modeMap(c.modeEnabled, v => typeof v === 'boolean') || !modeMap(c.modes, v => isObj(v) && jsonSafe(v)) || !Array.isArray(c.chat) || c.chat.length > 100)
                return false;
            const occupants = r.members.filter((m) => m.councilId === c.id);
            if (!councilSeatLayout(c, occupants))
                return false;
            if (!SOCIAL_MODE_IDS.every(mode => validSocialModeState(mode, c.modes[mode])))
                return false;
            // room-tools-r33: council schema
            if (Object.hasOwn(c, 'tools') && !validRoomToolsR33(c.tools))
                return false;
            if (occupants.length > c.seats || c.hostId !== null && !occupants.some((m) => m.id === c.hostId) || c.requests.some(id => !memberIds.has(id)))
                return false;
            const chatIds = new Set();
            for (const m of c.chat) {
                if (!isObj(m) || !keys(m, ['id', 'actor', 'text', 'at']) || !uuid(m.id) || chatIds.has(m.id) || !ident(m.actor) || !str(m.text, 1000) || !stamp(m.at))
                    return false;
                chatIds.add(m.id);
            }
            channels.add(c.channel);
            councilIds.add(c.id);
            localCouncils.add(c.id);
        }
        if (r.members.some((m) => m.councilId !== null && !localCouncils.has(m.councilId)))
            return false;
        const memoryIds = new Set();
        for (const m of r.memories) {
            if (!isObj(m) || !keys(m, ['id', 'councilId', 'authors', 'approved', 'text', 'at']) || !uuid(m.id) || memoryIds.has(m.id) || !uuid(m.councilId) || !strings(m.authors, ident, 50) || !m.authors.length || !strings(m.approved, ident, 50) || !stamp(m.at))
                return false;
            const authors = m.authors, approved = m.approved;
            if (approved.some(id => !authors.includes(id)) || !(m.text === null || str(m.text, 1000) && authors.every(id => approved.includes(id))))
                return false;
            memoryIds.add(m.id);
        }
        if (r.activity.some(a => !isObj(a) || !keys(a, ['action', 'at']) || !str(a.action, 80) || !stamp(a.at)))
            return false;
    }
    const prefIds = new Set();
    for (const p of d.preferences) {
        if (!isObj(p) || !keys(p, ['id', 'invitations', 'interests', 'remember', 'adultConsent', 'favorites', 'previous', 'rates', 'recentRoomIds', 'followedRoomIds']) || !ident(p.id) || prefIds.has(p.id) || typeof p.invitations !== 'boolean' || !str(p.interests, 200) || typeof p.remember !== 'boolean' || typeof p.adultConsent !== 'boolean' || !Array.isArray(p.favorites) || p.favorites.length > 50 || !p.favorites.every(ref) || !(p.previous === null || ref(p.previous)) || !Array.isArray(p.rates) || p.rates.length > 120 || !p.rates.every(stamp))
            return false;
        for (const k of ['recentRoomIds', 'followedRoomIds'])
            if (Object.hasOwn(p, k) && !strings(p[k], uuid, DIRECTORY_LIMIT_R30))
                return false;
        prefIds.add(p.id);
    }
    const receiptIds = new Set();
    for (const x of d.receipts) {
        if (!isObj(x) || !keys(x, ['actor', 'command', 'key', 'fingerprint', 'result', 'at', 'admin']) || !ident(x.actor) || !str(x.command, 80) || !ident(x.key) || !str(x.key, 96) || typeof x.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(x.fingerprint) || typeof x.admin !== 'boolean' || !stamp(x.at) || !isObj(x.result) || x.result.ok !== true || !keys(x.result, ['ok', 'roomId', 'councilId', 'messageId', 'reportId', 'memoryId', 'event', 'updated', 'left', 'closed', 'requested', 'invited', 'approved', 'favorite', 'followed', 'toolResult']) || !jsonSafe(x.result))
            return false;
        if (Object.hasOwn(x.result, 'followed') && (x.command !== 'room:follow' || typeof x.result.followed !== 'boolean' || !uuid(x.result.roomId)))
            return false;
        // room-tools-r33: receipt schema
        const toolCommand = x.command === 'tool:set' || x.command === 'tool:action';
        if (toolCommand) {
            if (x.admin || !uuid(x.result.roomId) || !uuid(x.result.councilId) || !validRoomToolResultR33(x.result.toolResult) || !isObj(x.result.toolResult) || x.result.event !== `tool:${x.result.toolResult.tool}:${x.result.toolResult.type}` || (x.command === 'tool:set') !== (x.result.toolResult.type === 'set'))
                return false;
        }
        else if (Object.hasOwn(x.result, 'toolResult'))
            return false;
        const id = canonical([x.actor, x.command, x.key, x.admin]);
        if (receiptIds.has(id))
            return false;
        receiptIds.add(id);
    }
    const reportIds = new Set();
    for (const r of d.reports) {
        if (!isObj(r) || !keys(r, ['id', 'actor', 'targetType', 'targetId', 'subjectId', 'roomId', 'councilId', 'text', 'evidence', 'at', 'resolution']) || !uuid(r.id) || reportIds.has(r.id) || !ident(r.actor) || !['member', 'chat', 'anonymous', 'council'].includes(r.targetType) || !ident(r.targetId) || !(r.subjectId === null || ident(r.subjectId)) || !uuid(r.roomId) || !uuid(r.councilId) || !str(r.text, 1000) || !(r.evidence === null || str(r.evidence, 1000)) || !stamp(r.at) || !(r.resolution === null || str(r.resolution, 400)))
            return false;
        reportIds.add(r.id);
    }
    const auditIds = new Set();
    for (const a of d.audit) {
        if (!isObj(a) || !keys(a, ['id', 'actor', 'action', 'targetId', 'reason', 'at', 'delivered', 'roomId']) || !uuid(a.id) || auditIds.has(a.id) || !ident(a.actor) || !str(a.action, 80) || !str(a.targetId, 128) || !str(a.reason, 400) || !stamp(a.at) || typeof a.delivered !== 'boolean' || Object.hasOwn(a, 'roomId') && !uuid(a.roomId))
            return false;
        auditIds.add(a.id);
    }
    return d.receipts.length <= 100000 && d.preferences.length <= 100000 && d.reports.length <= 10000 && d.audit.length <= 100000;
}
class SocialError extends Error {
    error;
    status;
    constructor(error, status = 400) {
        super(error);
        this.error = error;
        this.status = status;
    }
}
function fail(e, s = 400) { throw new SocialError(e, s); }
const text = (v, max, optional = false) => v === undefined && optional ? '' : typeof v === 'string' && !v.trim() && optional ? '' : socialText(v, max) ?? fail('invalid_text');
const boolean = (v) => typeof v === 'boolean' ? v : fail('invalid_boolean');
/** Local single-writer social domain. No game registry, accounts, wallet or audio recordings are stored here. */
export class SocialRooms {
    opts;
    state = { v: 1, rooms: [], preferences: [], receipts: [], reports: [], audit: [], config: { enabled: true, maxCouncilSeats: 12, defaultCouncilSeats: 8, content: defaultSocialContent() } };
    lock;
    monitor;
    connections = new Map();
    pendingMemory = new Map();
    transitioning = new Set();
    /** Bounded failed-attempt buckets supplement durable successful-action rates before crypto. */
    passwordAttempts = new Map();
    passwordGlobalAttempts = [];
    failedDisconnects = new Map();
    activeGift = null;
    queue = Promise.resolve();
    started = false;
    stopped = false;
    closing = false;
    now;
    grace;
    maxReceipts;
    constructor(opts) {
        this.opts = opts;
        if (typeof opts.file !== 'string' || !['profile', 'blocked', 'eligible', 'emit'].every(k => typeof opts[k] === 'function'))
            throw new TypeError('social_options_required');
        this.now = opts.now ?? Date.now;
        this.grace = opts.graceMs ?? 120000;
        this.maxReceipts = opts.maxReceipts ?? 20000;
        if (!num(this.grace, 1, 86400000) || !num(this.maxReceipts, 1, 100000))
            throw new TypeError('social_limits_invalid');
        this.lock = opts.mon || !opts.file ? null : new DataDirectoryLock(path.resolve(opts.file) + '.writer');
        this.monitor = opts.mon ?? new StorageMonitor();
        this.monitor.register('social-rooms', !!opts.file);
    }
    serial(fn) {
        const job = this.queue.then(fn);
        this.queue = job.catch(() => undefined);
        return job;
    }
    ready() { if (!this.started || this.stopped || this.closing)
        fail('social_unavailable', 503); }
    clock() { const n = this.now(); if (!nat(n))
        throw new TypeError('invalid_clock'); return n; }
    save(d, now) {
        if (!this.opts.file) {
            if (!validSocialRooms(d))
                throw new Error('social_shape_invalid');
            return;
        }
        try {
            saveJsonFile(this.opts.file, d, now, validSocialRooms);
            this.monitor.ok('social-rooms');
        }
        catch (e) {
            this.monitor.fail('social-rooms', e);
            if (e?.rollbackFailed)
                this.stopped = true;
            throw e;
        }
    }
    async init() {
        return this.serial(async () => {
            if (this.started || this.closing)
                throw new Error('social_already_initialized');
            this.lock?.acquire();
            try {
                if (this.opts.file)
                    try {
                        const s = lstatSync(this.opts.file);
                        if (!s.isFile() || s.isSymbolicLink())
                            throw new Error('social_file_unsafe');
                    }
                    catch (e) {
                        if (e.code !== 'ENOENT')
                            throw e;
                    }
                const loaded = this.opts.file ? loadJsonFile(this.opts.file, validSocialRooms) : undefined;
                const d = hydrateSocialRoomsGamesR47(loaded ? loaded : this.state);
                const n = this.clock();
                // Existing deadlines, including expired ones, NEVER receive a new lease on startup.
                for (const r of d.rooms)
                    for (const m of r.members)
                        if (m.deadline === null)
                            m.deadline = n + this.grace;
                // Unapproved content lived only in process memory. Startup removes the orphan metadata, not an approved memory.
                for (const r of d.rooms)
                    r.memories = r.memories.filter(m => m.text !== null);
                this.save(d, n);
                this.state = d;
                this.started = true;
                this.stopped = false;
                await this.deliverAudit();
            }
            catch (e) {
                this.lock?.release();
                throw e;
            }
        });
    }
    async close() {
        this.closing = true;
        return this.serial(async () => {
            if (!this.started) {
                this.lock?.release();
                return;
            }
            for (const r of this.state.rooms)
                for (const m of r.members)
                    await this.opts.disconnectMedia?.(m.id);
            const d = structuredClone(this.state), n = this.clock();
            for (const r of d.rooms)
                for (const m of r.members)
                    if (m.deadline === null)
                        m.deadline = this.failedDisconnects.get(m.id) ?? n + this.grace;
            this.save(d, n);
            this.state = d;
            this.connections.clear();
            this.pendingMemory.clear();
            this.failedDisconnects.clear();
            this.started = false;
            this.stopped = true;
            if (this.lock && !this.lock.release())
                throw new Error('social_lock_release_failed');
        });
    }
    unsaved() { return this.failedDisconnects.size > 0; } // Mutations never publish dirty drafts; a physical socket-close lease may need retry.
    waitForIdle() { return this.queue.then(() => undefined); }
    retry() { return this.serial(() => this.guard(async () => { this.ready(); await this.repairDisconnects(); this.save(this.state, this.clock()); await this.deliverAudit(); return { ok: true }; })); }
    /** Server-only bridge: caller holds RoomService's current active-membership lock.
     * Uses existing room/council/receipt shapes, never a client-supplied binding ID. */
    ensureGameRoom(ctx, actingId) {
        return this.serial(() => this.guard(async () => {
            this.ready();
            this.actor(actingId, true);
            if (!this.opts.gameVoiceSecret || !ctx.players.some(p => p.id === actingId && !p.bot) || !ident(ctx.hostId) || !nat(ctx.createdAt) || !num(ctx.seats, 1, 12))
                fail('invalid_game_voice_context', 403);
            // Never publish an ineligible/child host's social profile through a game bridge.
            if (!this.opts.profile(ctx.hostId) || this.opts.eligible(ctx.hostId) !== true)
                fail('social_ineligible', 403);
            const source = canonical([ctx.code, ctx.createdAt]);
            const digest = (scope) => createHmac('sha256', this.opts.gameVoiceSecret).update(canonical(['game-voice-r9', scope, source])).digest('hex');
            const id = (scope) => { const h = digest(scope); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`; };
            const roomId = id('room'), councilId = id('council'), fingerprint = digest('receipt');
            const receipt = this.state.receipts.find(r => !r.admin && r.command === 'game:bind' && r.key === roomId);
            if (receipt && receipt.fingerprint !== fingerprint)
                fail('game_voice_binding_conflict', 409);
            const existing = this.state.rooms.find(r => r.id === roomId);
            if (receipt && (!existing || !existing.councils.some(c => c.id === councilId)))
                fail('game_voice_closed', 403);
            if (!receipt && existing)
                fail('game_voice_binding_conflict', 409);
            return this.tx((d, media, now) => {
                this.actor(actingId, true, d);
                const old = this.member(d, actingId);
                if (old && old.member.deadline !== null && old.member.deadline <= now)
                    this.remove(d, actingId, media);
                let r = d.rooms.find(r => r.id === roomId), c = r?.councils.find(c => c.id === councilId);
                if (!r) {
                    if (d.rooms.length >= 1000 || d.rooms.filter(r => r.ownerId === ctx.hostId).length >= 10)
                        fail('room_capacity', 409);
                    if (d.receipts.length >= this.maxReceipts)
                        fail('idempotency_capacity', 409);
                    const councilSeats = Math.max(d.config.defaultCouncilSeats, ctx.seats);
                    if (councilSeats > d.config.maxCouncilSeats)
                        fail('invalid_seats');
                    r = { id: roomId, name: 'غرفة اللعب', description: '', privacy: 'private', memory: false, maxMembers: 24, ownerId: ctx.hostId, hostId: null, moderators: [], invites: [], bans: [], members: [], councils: [], memories: [], activity: [], createdAt: now, updatedAt: now };
                    c = { id: councilId, name: 'مجلس اللعب', description: '', kind: 'private', privacy: 'private', ownerId: ctx.hostId, hostId: null, seats: councilSeats, locked: false, allowRequests: true, invites: [], requests: [], channel: randomUUID(), createdAt: now, modeEnabled: Object.fromEntries(SOCIAL_MODE_IDS.map(mode => [mode, true])), modes: Object.fromEntries(SOCIAL_MODE_IDS.map(mode => [mode, SOCIAL_MODES[mode].initial()])), chat: [] };
                    r.councils.push(c);
                    d.rooms.push(r);
                    d.receipts.push({ actor: actingId, command: 'game:bind', key: roomId, fingerprint, result: { ok: true, roomId, councilId }, at: now, admin: false });
                }
                if (!c || r.privacy !== 'private' || c.privacy !== 'private')
                    fail('game_voice_binding_conflict', 409);
                const already = r.members.some(m => m.id === actingId && m.councilId === councilId);
                // A current verified game host may take the social ownership role after
                // a former host leaves. Check the old domain's bans/blocks FIRST; role
                // migration must never make an existing denial disappear.
                if (ctx.hostId === actingId && r.ownerId !== actingId) {
                    if (r.bans.some(b => b.id === actingId) || this.blocked(actingId, r.ownerId) || this.blocked(actingId, c.ownerId) || r.members.some(m => m.id !== actingId && this.blocked(actingId, m.id)))
                        fail('room_access_denied', 403);
                    r.ownerId = actingId;
                    r.moderators = r.moderators.filter(id => id !== actingId);
                    c.ownerId = actingId;
                    this.audit(d, actingId, 'game:host', roomId, 'verified-game-host', now);
                }
                if (!already)
                    this.rate(d, actingId, now);
                // Invitations do not move peers, acknowledge consent, or seat game guests.
                for (const p of ctx.players) {
                    if (!this.opts.profile(p.id) || this.opts.eligible(p.id) !== true || !this.pref(d, p.id, false)?.adultConsent || this.pref(d, p.id, false)?.invitations === false || this.blocked(p.id, r.ownerId) || this.blocked(p.id, c.ownerId) || this.blocked(p.id, actingId) || r.bans.some(b => b.id === p.id))
                        continue;
                    if (p.id !== r.ownerId && !r.members.some(m => m.id === p.id))
                        this.invite(d, actingId, p.id, r.invites);
                    if (!r.members.some(m => m.id === p.id && m.councilId === c.id))
                        this.invite(d, actingId, p.id, c.invites);
                }
                // Only a verified actor enters; admitRoom/admitCouncil preserve bans,
                // blocks, private invitations and existing social capacity.
                this.enterCouncil(d, r, c, actingId, media, now);
                this.activity(r, 'game:voice', now);
                return { ok: true, roomId, councilId };
            });
        }));
    }
    /** Synchronous access check, always inside the same frozen membership queue.
     * External permission is a server argument, never an HTTP body field or an admission. */
    giftAccess(sender, roomId, councilId, recipients, allowExternalSupport) {
        this.ready();
        if (!uuid(roomId) || !uuid(councilId) || !strings(recipients, ident, 11) || !recipients.length)
            fail('invalid_gift_context');
        this.actor(sender, true);
        const from = this.mediaAccess(sender), source = this.member(this.state, sender);
        const same = from?.roomId === roomId && from.councilId === councilId;
        if (!same) {
            if (!allowExternalSupport)
                fail('gift_council_membership_required', 403);
            if (this.transitioning.has(sender) || this.failedDisconnects.has(sender))
                fail('gift_support_unavailable', 403);
            // Staying in another room is allowed; an expired/revoked seat cannot become a bypass.
            if (source) {
                this.requireRoomMember(source.room, sender);
                if (!this.directoryVisibleRoom(source.room, sender) || source.member.councilId !== null && !from)
                    fail('gift_support_unavailable', 403);
                if (source.member.muted)
                    fail('member_muted', 403);
                if (!this.canChat(source.room, sender))
                    fail('write_restricted', 403);
            }
        }
        const r = this.room(this.state, roomId), c = this.council(r, councilId);
        if (!same) {
            // Invites/owner/moderator status never authorize external private or game scopes.
            if (r.privacy !== 'public' || c.privacy !== 'public' || this.gameBound(this.state, r) || !this.directoryVisibleRoom(r, sender) || this.blocked(sender, c.ownerId) || c.hostId !== null && this.blocked(sender, c.hostId))
                fail('gift_support_unavailable', 403);
            if (!this.canChat(r, sender))
                fail('write_restricted', 403);
        }
        for (const recipient of recipients) {
            this.actor(recipient, true);
            if (sender === recipient)
                fail('self_target');
            const to = this.mediaAccess(recipient), m = r.members.find(m => m.id === recipient && m.councilId === c.id);
            if (!to || to.roomId !== roomId || to.councilId !== councilId || !m || !this.gameBound(this.state, r) && this.memberSeat(r, m) === null)
                fail('gift_council_membership_required', 403);
            if (this.blocked(sender, recipient) || !same && !this.publicPerson(recipient))
                fail('target_unavailable', 403);
        }
        return same ? 'seated' : source?.room.id === roomId && source.member.councilId === null ? 'lobby' : 'external';
    }
    /** Server-only financial bridge. Hold the membership queue, NOT a social tx/save:
     * the callback owns the existing wallet commit and its durable idempotency.
     * Without explicit server opt-in, ordinary same-council behavior is unchanged. */
    withGiftAccess(sender, roomId, councilId, recipient, fn, access = {}) {
        return this.serial(async () => {
            try {
                this.giftAccess(sender, roomId, councilId, [recipient], access.allowExternalSupport === true);
                this.ensureCannon(roomId);
            }
            catch (e) {
                return e instanceof SocialError ? { ok: false, error: e.error, status: e.status } : { ok: false, error: 'social_storage_or_dependency_unavailable', status: 503 };
            }
            // Nothing after this callback can roll back a committed financial transaction.
            this.activeGift = Object.freeze({ sender, recipient, roomId, councilId, allowExternalSupport: access.allowExternalSupport === true });
            let result;
            try {
                result = await fn(`social:${roomId}:${councilId}`);
            }
            finally {
                this.activeGift = null;
            }
            if (result.ok && isObj(result.ev) && typeof result.ev.tx === 'string')
                try {
                    this.opts.reconcileGift?.(sender, recipient, result.ev.tx);
                }
                catch { /* wallet already committed */ }
            if (result.ok && result.dup === false && isObj(result.ev) && typeof result.ev.tx === 'string')
                this.addRoomSupport(roomId, sender, recipient, result.ev.tx);
            if (result.ok && result.dup === false && result.ev) {
                try {
                    const r = this.state.rooms.find(r => r.id === roomId);
                    const ids = (r?.members ?? []).filter(m => {
                        const access = this.mediaAccess(m.id);
                        return access?.roomId === roomId && access.councilId === councilId && !this.blocked(m.id, sender) && !this.blocked(m.id, recipient);
                    }).map(m => m.id);
                    this.opts.emit(ids, { t: 'social:gift', roomId, councilId, ev: result.ev });
                }
                catch { /* committed; notification failure is not a financial failure */ }
            }
            return result;
        });
    }
    /** Same membership lock, one atomic Wallet operation, one frozen support context per child. */
    withGiftBatchAccess(sender, roomId, councilId, recipients, fn, access = {}) {
        return this.serial(async () => {
            try {
                this.giftAccess(sender, roomId, councilId, recipients, access.allowExternalSupport === true);
                this.ensureCannon(roomId);
            }
            catch (e) {
                return e instanceof SocialError ? { ok: false, error: e.error, status: e.status } : { ok: false, error: 'social_storage_or_dependency_unavailable', status: 503 };
            }
            const ordered = [...recipients].sort();
            this.activeGift = Object.freeze({ sender, recipient: ordered[0], roomId, councilId, allowExternalSupport: access.allowExternalSupport === true });
            this.activeGiftBatch = Object.freeze(ordered);
            let result;
            try {
                result = await fn(`social:${roomId}:${councilId}`);
            }
            finally {
                this.activeGift = null;
                this.activeGiftBatch = null;
            }
            if (result.ok && Array.isArray(result.evs))
                for (let i = 0; i < result.evs.length; i++) {
                    const ev = result.evs[i], recipient = ordered[i];
                    if (!recipient || !isObj(ev) || typeof ev.tx !== 'string')
                        continue;
                    try {
                        this.opts.reconcileGift?.(sender, recipient, ev.tx);
                    }
                    catch { /* existing committed source retries independently */ }
                    if (result.dup === false)
                        this.addRoomSupport(roomId, sender, recipient, ev.tx);
                    if (result.dup === false)
                        try {
                            const r = this.state.rooms.find(r => r.id === roomId);
                            const ids = (r?.members ?? []).filter(m => { const a = this.mediaAccess(m.id); return a?.roomId === roomId && a.councilId === councilId && !this.blocked(m.id, sender) && !this.blocked(m.id, recipient); }).map(m => m.id);
                            this.opts.emit(ids, { t: 'social:gift', roomId, councilId, ev });
                        }
                        catch { /* committed finance is never rolled back */ }
                }
            return result;
        });
    }
    activeGiftBatch = null;
    /** A saved Wallet replay may outlive a public scope. Never return historic peer
     * names/events when its recipients are no longer freshly authorized. No Wallet mutation. */
    withGiftReplayAccess(sender, roomId, councilId, recipients, replay) {
        return this.serial(() => {
            this.ready();
            this.actor(sender, true);
            if (!uuid(roomId) || !uuid(councilId) || !strings(recipients, ident, 11) || !recipients.length)
                fail('invalid_gift_context');
            const previous = replay();
            if (!previous || !previous.ok)
                return previous;
            try {
                this.giftAccess(sender, roomId, councilId, recipients, true);
                return previous;
            }
            catch { /* own immutable financial receipt, not a room projection */ }
            const receipt = (v) => isObj(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => ['id', 'ts', 'dir', 'gift', 'name', 'icon', 'price', 'qty', 'total', 'recv', 'house', 'currency', 'rewardCurrency', 'prepaid', 'rewardPolicy', 'senderBonus'].includes(k))) : undefined;
            return { ok: true, dup: true, coins: previous.coins, gems: previous.gems, projectionRedacted: true,
                ...(typeof previous.batchId === 'string' ? { batchId: previous.batchId } : {}),
                ...(previous.aggregate ? { aggregate: previous.aggregate } : {}),
                ...(previous.gift ? { gift: receipt(previous.gift) } : {}),
                ...(Array.isArray(previous.gifts) ? { gifts: previous.gifts.map(receipt) } : {}) };
        });
    }
    /** Synchronous pre-Wallet hook only. Its caller is inside withGiftAccess's queue.
     * Never infer room/challenge context from client event payloads or an arbitrary wallet call. */
    reserveGiftSupport(sender, recipient, at) {
        const x = this.activeGift;
        if (!x || x.sender !== sender || x.recipient !== recipient && !this.activeGiftBatch?.includes(recipient))
            return null;
        this.ready();
        if (!nat(at))
            fail('invalid_clock');
        this.giftAccess(sender, x.roomId, x.councilId, [...(this.activeGiftBatch ?? [recipient])], x.allowExternalSupport);
        if ((this.state.supportReceipts?.length ?? 0) + (this.opts.pendingSupportCount?.(null) ?? 0) >= SUPPORT_RECEIPT_CAP)
            fail('support_receipt_capacity', 409);
        const r = this.room(this.state, x.roomId), c = this.council(r, x.councilId), challenge = r.challenge;
        const challengeId = challenge?.status === 'active' && challenge.councilId === c.id && at >= challenge.startedAt && at < challenge.endsAt && [...challenge.teams.blue, ...challenge.teams.red].includes(recipient) ? challenge.id : null;
        if (challengeId && challenge.receipts.length + (this.opts.pendingSupportCount?.(challengeId) ?? 0) >= CHALLENGE_RECEIPT_CAP)
            fail('challenge_receipt_capacity', 409);
        return Object.freeze({ roomId: r.id, councilId: c.id, challengeId, sourcePublic: r.privacy === 'public' && c.privacy === 'public' && [sender, recipient].every(id => this.opts.supportPublicActivity?.(id) !== false) && !this.state.receipts.some(p => p.command === 'game:bind' && p.key === r.id) });
    }
    /** R58: يزيد دعم الغرفة (ليفلها) بقيمة هدية ملتزمة بالمحفظة. فشل الحفظ ما يأثر على الهدية نفسها. */
    addRoomSupport(roomId, sender, recipient, tx) {
        try {
            const value = this.opts.giftValue?.(sender, recipient, tx, roomId);
            if (!nat(value) || !value)
                return;
            const r = this.state.rooms.find((x) => x.id === roomId);
            if (!r)
                return;
            const before = this.state, d = structuredClone(before), room = this.room(d, roomId), now = this.clock();
            const next = (room.support ?? 0) + value;
            if (!nat(next))
                return;
            const lvBefore = roomLevelOf(room.support ?? 0).level;
            room.support = next;
            const lvAfter = roomLevelOf(next).level;
            if (lvAfter > lvBefore) {
                room.activity.push({ action: 'room:levelup', at: now });
                room.activity = room.activity.slice(-100);
            }
            // R58c: نقاط رتبة الشهر + بيانات الشهر لأداة مراجعة بيانات الغرفة
            const m = structuredClone(currentRoomMonth(room.month, now));
            const pts = m.pts + value;
            if (nat(pts)) {
                m.pts = pts;
                m.gifts += 1;
                const prev = m.senders[sender] ?? 0;
                if (prev || Object.keys(m.senders).length < ROOM_MONTH_SENDERS_MAX)
                    m.senders[sender] = prev + value;
                room.month = m;
            }
            // R58v: داعمين الأسبوع وكل الوقت
            const wk = currentWeek(room.week, now);
            room.week = { key: wk.key, senders: addSender(wk.senders, sender, value) };
            room.allSenders = addSender(room.allSenders ?? {}, sender, value);
            // R59: مدفع الغرفة الجديد (3 مستويات)
            room.cannon3 = cannon3Add(room.cannon3 ?? newCannon3(), sender, value, now);
            // R58u: صاروخ الغرفة اليومي
            // R59: الصاروخ انتقل للقبيلة بطلب المالك؛ صاروخ الغرفة ما ينطلق ولا يوزّع. نكمل نسجل داعمين اليوم بس (قائمة «اليوم» بالداعمين تعتمد عليها)
            const rk = structuredClone(currentRocket(room.rocket, now));
            const rpts = rk.pts + value;
            if (nat(rpts)) {
                rk.pts = rpts;
                const pv = rk.senders[sender] ?? 0;
                if (pv || Object.keys(rk.senders).length < ROCKET_SENDERS_MAX)
                    rk.senders[sender] = pv + value;
                const bounds = rocketBoundaries();
                while (ROOM_ROCKET && rk.launches.length < ROCKET_PLANETS.length && rk.pts >= bounds[rk.launches.length]) {
                    // R58y: أكثر 3 عبّوا بترول باليوم ياخذون الجواهر والهدايا، وفايز حظ من الحاضرين (3 دقايق أو أكثر بالغرفة)
                    const stage = rk.launches.length + 1, winners = rocketWinners(rk);
                    const cand = room.members.filter((mm) => this.mediaAccess(mm.id)?.roomId === roomId && now - mm.joinedAt >= ROCKET_LUCK_MIN_MS && !winners.includes(mm.id)).map((mm) => mm.id);
                    rk.launches.push({ stage, at: now, status: 'pending', winners, luck: rocketLuckPick(roomId, rk.day, stage, cand) });
                }
                room.rocket = rk;
            }
            this.save(d, now);
            this.state = d;
            this.notice(before, d);
            if (lvAfter > lvBefore) {
                try {
                    this.opts.roomLevelUp?.(roomId, room.ownerId, room.name, lvBefore, lvAfter, room.members.map((mm) => mm.id));
                }
                catch { /* */ }
            }
            this.settleRocket(roomId);
            this.settleCannon3(roomId);
        }
        catch { /* الهدية انصرفت؛ الليفل يكمل مع الهدايا الجاية */ }
    }
    /** R58x: أعلى ليفل لغرفة يملكها الحساب (شرط إنشاء القبيلة) */
    /** R59: غرفة القبيلة = أعلى غرفة ليفل يملكها القائد */
    ownerTopRoom(userId) {
        let best = null;
        for (const r of this.state.rooms)
            if (r.ownerId === userId && (!best || (r.support ?? 0) > (best.support ?? 0)))
                best = r;
        return best ? { id: best.id, name: best.name, level: roomLevelOf(best.support ?? 0).level, members: best.members.length, code: this.roomCode(best) } : null;
    }
    /** R67: «مملكتي» — أعلى غرفة دعم يملكها الحساب، مع أكثر 3 داعمين هالشهر (بدون المحظورين عن المشاهد) */
    kingdomView(ownerId, viewer) {
        let best = null;
        for (const r of this.state.rooms)
            if (r.ownerId === ownerId && (!best || (r.support ?? 0) > (best.support ?? 0)))
                best = r;
        if (!best)
            return null;
        const r = best, lv = roomLevelOf(r.support ?? 0), m = currentRoomMonth(r.month, this.clock()), rank = roomRankView(r.month, this.clock());
        const top = Object.entries(m.senders).sort((a, b) => b[1] - a[1]).filter(([id]) => !this.blocked(viewer, id)).slice(0, 3).map(([id, pts]) => ({ ...this.who(id), pts }));
        return { id: r.id, name: r.name, photo: this.photo(r), code: this.roomCode(r), level: lv.level, members: r.members.length, monthPts: m.pts, tier: rank.tier, tierName: rank.tierName, top };
    }
    /** R59: من متى الحساب حاضر بالغرفة (للمهمة «ابقَ 5 دقايق») */
    /** R62: اللي قاعدين على مقعد (مايك) ومتصلين بصوت الغرفة الحين — لعدّ دقايق المايك بالمهام */
    seatedNow() { const out = []; for (const r of this.state.rooms)
        for (const m of r.members)
            if (m.councilId !== null && this.mediaAccess(m.id)?.roomId === r.id)
                out.push(m.id); return out; }
    presenceSince(userId, roomId) { const r = this.state.rooms.find((x) => x.id === roomId); const m = r?.members.find((x) => x.id === userId); return m && this.mediaAccess(userId)?.roomId === roomId ? m.joinedAt : null; }
    /** R67ae: للإدارة — غرف لاعب والغرف النشطة */
    /** R68z: المسابقة المباشرة — هل اللاعب داخل الغرفة، وهل هو مشرف، ومين الأعضاء */
    quizAccess(userId, roomId) {
        const r = this.state.rooms.find((x) => x.id === roomId);
        if (!r)
            return null;
        const now = this.clock();
        const members = r.members.filter((m) => m.deadline === null || m.deadline > now).map((m) => m.id);
        if (!members.includes(userId))
            return null;
        let mod = false;
        try {
            mod = this.moderator(r, userId);
        }
        catch {
            mod = false;
        }
        return { mod, members, name: r.name };
    }
    roomIdOf(userId) { return this.member(this.state, userId)?.room.id ?? null; }
    ownedRoomsOf(userId) { return this.state.rooms.filter((r) => r.ownerId === userId).map((r) => ({ id: r.id, name: r.name, level: roomLevelOf(r.support ?? 0).level, members: r.members.length })); }
    liveRooms() { return this.state.rooms.filter((r) => r.members.length > 0).map((r) => ({ id: r.id, name: r.name, level: roomLevelOf(r.support ?? 0).level, members: r.members.length, owner: this.opts.profile(r.ownerId)?.name ?? '', video: !!r.video })).sort((a, b) => b.members - a.members); }
    ownerMaxRoomLevel(userId) { let lv = 0; for (const r of this.state.rooms)
        if (r.ownerId === userId)
            lv = Math.max(lv, roomLevelOf(r.support ?? 0).level); return lv; }
    /** R58u: يمنح جوائز إطلاقات الصاروخ المعلّقة (معرّف ثابت لكل إطلاق، فإعادة المحاولة ما تكرر). */
    settleRocket(roomId) {
        const wallet = this.opts.cannon?.wallet;
        if (!wallet || wallet.unsaved())
            return;
        const r = this.state.rooms.find((x) => x.id === roomId);
        const rk = r?.rocket;
        if (!r || !rk)
            return;
        rk.launches.forEach((l, i) => {
            if (l.status !== 'pending')
                return;
            const grants = rocketGrants(l);
            try {
                for (const g of grants) {
                    const res = wallet.grantCampaignBatch(rocketCampaignId(roomId, rk.day, l.stage, g.kind), rocketFingerprint(roomId, rk.day, l.stage, g), [g.id], { coins: 0, gems: g.gems, itemIds: g.itemIds }, g.reason);
                    if (res.some((x) => x.status === 'failed' && x.code !== 'BALANCE_OVERFLOW'))
                        return;
                }
            }
            catch {
                return;
            }
            const before = this.state, d = structuredClone(before), now = this.clock(), room = this.room(d, roomId);
            const dl = room.rocket?.launches[i];
            if (!dl || room.rocket.day !== rk.day || dl.status !== 'pending')
                return;
            dl.status = 'done';
            this.save(d, now);
            this.state = d;
            this.notice(before, d);
            try {
                const p = ROCKET_PLANETS[l.stage - 1];
                const winners = dl.winners.map((id, k) => ({ rank: k + 1, person: this.publicPerson(id) })).filter((w) => w.person);
                const luck = dl.luck ? this.publicPerson(dl.luck) : null;
                const ids = new Set(room.members.filter((mm) => this.mediaAccess(mm.id)?.roomId === roomId).map((mm) => mm.id));
                for (const id of ids) {
                    const mine = rocketShareOf(dl, id);
                    this.opts.emit([id], { t: 'social:rocket', roomId, event: { id: rocketCampaignId(roomId, rk.day, l.stage, 'event'), stage: l.stage, planet: p.name, at: l.at, rank: mine.rank, gems: mine.gems, gifts: mine.gifts, winners, luck } });
                }
            }
            catch { /* الجوائز انحفظت؛ التنبيه بس اللي فشل */ }
        });
    }
    /** R59: يمنح جوايز انفجارات المدفع المعلّقة (معرّف ثابت لكل انفجار، فإعادة المحاولة ما تكرر) ويبلغ الحاضرين. */
    settleCannon3(roomId) {
        const wallet = this.opts.cannon?.wallet;
        if (!wallet || wallet.unsaved())
            return;
        const r = this.state.rooms.find((x) => x.id === roomId);
        const c = r?.cannon3;
        if (!r || !c)
            return;
        c.blasts.forEach((b, i) => {
            if (b.status !== 'pending')
                return;
            try {
                for (const g of cannon3Grants(b)) {
                    const res = wallet.grantCampaignBatch(cannon3CampaignId(roomId, b, g.kind), cannon3Fingerprint(roomId, b, g), g.ids, { coins: g.coins, gems: 0, itemIds: g.itemIds }, g.reason);
                    if (res.some((x) => x.status === 'failed' && x.code !== 'BALANCE_OVERFLOW'))
                        return;
                }
            }
            catch {
                return;
            }
            const before = this.state, d = structuredClone(before), now = this.clock(), room = this.room(d, roomId);
            const db = room.cannon3?.blasts[i];
            if (!db || db.status !== 'pending' || db.round !== b.round || db.level !== b.level)
                return;
            db.status = 'done';
            this.save(d, now);
            this.state = d;
            this.notice(before, d);
            try {
                const L = CANNON3_LEVELS[b.level - 1];
                const winners = b.winners.map((w, k) => ({ rank: k + 1, pts: w.pts, person: this.publicPerson(w.id) })).filter((w) => w.person);
                const ids = room.members.filter((mm) => this.mediaAccess(mm.id)?.roomId === roomId).map((mm) => mm.id);
                for (const id of ids) {
                    const k = b.winners.findIndex((w) => w.id === id);
                    this.opts.emit([id], { t: 'social:cannon3', roomId, event: { id: cannon3CampaignId(roomId, b, 'event'), round: b.round, level: b.level, at: b.at, winners, mine: k >= 0 ? { coins: L.coins, items: [...L.items.map((x) => x.name), ...(k === 0 ? [L.top1.name] : [])] } : null } });
                }
            }
            catch { /* الجوايز انحفظت؛ التنبيه بس اللي فشل */ }
        });
    }
    cannon3View(r, viewer = '') {
        const c = r.cannon3 ?? newCannon3();
        const prize = (p) => { const it = this.opts.cannon?.catalog.get(p.id); return { id: p.id, name: p.name, slot: p.slot, art: cannon3Art(p.id) || (typeof it?.art === 'string' ? it.art : ''), icon: it?.icon ?? '🎁' }; };
        const last = (lv) => { const b = [...c.blasts].reverse().find((x) => x.level === lv); return b ? { round: b.round, at: b.at, winners: b.winners.map((w, k) => ({ rank: k + 1, pts: w.pts, person: this.publicPerson(w.id) })).filter((w) => w.person) } : null; };
        return { v: 3, round: c.round, level: c.level, pts: c.pts, mine: c.senders[viewer] ?? 0, goal: CANNON3_LEVELS[c.level - 1].goal, top: cannon3Top(c.senders, 5).map((w) => ({ pts: w.pts, person: this.publicPerson(w.id) })).filter((w) => w.person),
            levels: CANNON3_LEVELS.map((L) => ({ level: L.level, color: L.color, goal: L.goal, coins: L.coins, top1: prize(L.top1), items: L.items.map(prize), last: last(L.level) })) };
    }
    /** R58v: قائمة الداعمين (اليوم، الأسبوع، الشهر، كل الوقت) — أعلى 20 بكل فترة */
    supportersView(r) {
        const now = this.clock();
        const list = (m) => topOf(m, 20).map(([id, pts]) => { const p = this.who(id); return p && p.id !== id ? { id: p.id, name: p.name, ...(p.avatar ? { avatar: p.avatar } : {}), ...(p.frame ? { frame: p.frame } : {}), pts } : null; }).filter(Boolean);
        return { day: list(currentRocket(r.rocket, now).senders), week: list(currentWeek(r.week, now).senders), month: list(currentRoomMonth(r.month, now).senders), all: list(r.allSenders) };
    }
    rocketView(r) {
        const rk = currentRocket(r.rocket, this.clock());
        const bounds = rocketBoundaries();
        const done = rk.launches.length, N = ROCKET_PLANETS.length;
        const stage = Math.min(done + 1, N), floor = stage > 1 ? bounds[stage - 2] : 0, goal = ROCKET_PLANETS[stage - 1].goal;
        const progress = done >= N ? goal : Math.max(0, Math.min(goal, rk.pts - floor));
        const top = Object.entries(rk.senders).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([id, pts]) => ({ person: this.publicPerson(id), pts })).filter((x) => x.person);
        const gift = (g) => ({ id: g.id, name: g.name, art: rocketGiftArt(g.id) });
        return { v: 2, day: rk.day, pts: rk.pts, stage, progress, goal, finished: done >= N, reached: done,
            stages: ROCKET_PLANETS.map((s, i) => {
                const l = rk.launches[i];
                const nm = (id) => this.publicPerson(id)?.name ?? null;
                return { stage: s.stage, name: s.name, goal: s.goal, total: bounds[i], prizes: [...s.prizes], gifts: s.gifts.map((g) => g.map(gift)), luck: gift(s.luck), launched: i < done,
                    ...(l ? { won: { winners: l.winners.map((id, k) => ({ rank: k + 1, name: nm(id) })).filter((w) => w.name), luck: l.luck ? nm(l.luck) : null } } : {}) };
            }), top };
    }
    /** R58c: أداة مراجعة بيانات الغرفة (للمالك والمشرفين): نقاط الشهر وعدد الهدايا وأكثر الداعمين */
    rankStatsView(r, viewer) {
        const m = currentRoomMonth(r.month, this.clock());
        const top = Object.entries(m.senders).sort((a, b) => b[1] - a[1]).slice(0, 10).filter(([id]) => !this.blocked(viewer, id)).map(([id, pts]) => ({ ...this.who(id), pts }));
        return { month: m.key, pts: m.pts, gifts: m.gifts, supporters: Object.keys(m.senders).length, top, members: r.members.length, totalSupport: r.support ?? 0 };
    }
    /** R58: الرقم الظاهر للغرفة: الأيدي المميز إذا موجود، وإلا رقم 8 خانات الثابت */
    roomCode(r) { return r.vanity ?? roomCodeOf(r.id); }
    roomExtrasView(r) { const lv = roomLevelOf(r.support ?? 0); return { weekPts: Object.values(currentWeek(r.week, this.clock()).senders).reduce((n, v) => n + v, 0), rank: roomRankView(r.month, this.clock()), code: this.roomCode(r), vanity: !!r.vanity, level: lv.level, support: lv.support, levelFloor: lv.floor, levelNext: lv.next, levelMax: ROOM_LEVEL_MAX, nextPerks: roomLevelPerks(lv.level + 1), capacity: r.maxMembers + roomCapacityBonus(lv.level), ads: (r.ads ?? []).map((a) => ({ id: a.id, text: a.text })), video: r.video ? { vid: r.video.vid, paused: r.video.paused, base: r.video.base, now: this.clock() } : null, }; }
    /** R55: فحص جوائز المدفع بدون رمي خطأ. لو عنصر جائزة صار مقفول برتبة أو موقوف بالمتجر، الغرف والدردشة والهدايا تكمل عادي والمدفع ما ينفعّل لين ترجع الجوائز صالحة. */
    cannonCatalogReady() {
        if (!this.opts.cannon)
            return false;
        try {
            validateCannonCatalog(this.opts.cannon.catalog);
            return true;
        }
        catch {
            if (!this.cannonCatalogWarned) {
                this.cannonCatalogWarned = true;
                console.warn(JSON.stringify({ event: 'cannon_reward_catalog_unavailable', note: 'room cannon disabled until reward items are valid' }));
            }
            return false;
        }
    }
    cannonCatalogWarned = false;
    /** Lazy enablement is a social commit BEFORE any outgoing payment, never history backfill. */
    ensureCannon(roomId) {
        if (!this.opts.cannon || !LEGACY_CANNON)
            return; // R59: المدفع القديم انقفل (انستبدل بمدفع R59)
        const r = this.room(this.state, roomId);
        // R58t: مدفع v1 فاضي (بدون أي دعم ولا جوائز) يترقّى لمدفع المراحل الخمس. اللي فيه دعم يبقى مثل ما هو.
        const emptyV1 = !!r.cannon && r.cannon.version === CANNON_VERSION_V1 && r.cannon.total === 0 && r.cannon.receipts.length === 0 && r.cannon.stages.every(s => s.status === 'locked') && (this.opts.cannon.pendingCount?.(r.cannon.id) ?? 0) === 0;
        if ((r.cannon && !emptyV1) || this.state.receipts.some(p => p.command === 'game:bind' && p.key === roomId))
            return;
        if (!this.cannonCatalogReady())
            return; // R55: جوائز المدفع غير جاهزة بالمتجر → الغرفة تشتغل بدون مدفع بدل ما تتعطل
        const before = this.state, d = structuredClone(before), now = this.clock(), room = this.room(d, roomId);
        room.cannon = createCannon(room.ownerId, now);
        room.updatedAt = now;
        this.save(d, now);
        this.state = d;
        this.notice(before, d);
    }
    /** Synchronous server-only hook inside withGiftAccess. Original challenge context stays exact4. */
    reserveCannonGiftContext(sender, recipient, at) {
        const x = this.activeGift;
        if (!LEGACY_CANNON || !x || x.sender !== sender || x.recipient !== recipient && !this.activeGiftBatch?.includes(recipient) || !this.opts.cannon)
            return null;
        this.ready();
        if (!nat(at))
            fail('invalid_clock');
        this.giftAccess(sender, x.roomId, x.councilId, [...(this.activeGiftBatch ?? [recipient])], x.allowExternalSupport);
        const r = this.room(this.state, x.roomId), c = r.cannon;
        if (!c)
            return null;
        if (c.receipts.length + (this.opts.cannon.pendingCount?.(c.id) ?? 0) >= CANNON_RECEIPT_CAP)
            fail('cannon_receipt_capacity', 409);
        return Object.freeze({ roomId: r.id, councilId: x.councilId, cannonId: c.id, version: c.version, ownerId: c.ownerId, enabledAt: c.enabledAt });
    }
    /** Canonical Wallet proof is mandatory even for direct server callers. Save pending before grant. */
    consumeCannonGift(context, supplied, live = false) {
        return this.serial(() => {
            this.ready();
            if (!validCannonGiftContext(context))
                throw new Error('invalid_cannon_context');
            const backend = this.opts.cannon;
            if (!backend)
                throw new Error('cannon_backend_unavailable');
            if (backend.wallet.unsaved() || !backend.wallet.hasGiftSource(supplied.from, supplied.to, supplied.id))
                throw new Error('cannon_gift_not_committed');
            const rec = backend.wallet.committedGiftReceipt(supplied.from, supplied.to, supplied.id);
            if (!rec || canonical(rec) !== canonical(supplied))
                throw new Error('cannon_gift_proof_conflict');
            const value = cannonGiftValue(rec, context);
            if (value === null)
                return;
            const r = this.state.rooms.find(r => r.id === context.roomId), c = r?.cannon;
            if (!r || !c)
                return; // Closed source scopes cannot be rebound to a new cannon.
            if (c.id !== context.cannonId || c.version !== context.version || c.ownerId !== context.ownerId || c.enabledAt !== context.enabledAt)
                throw new Error('cannon_context_conflict');
            const fingerprint = cannonHash({ context, rec }), previous = c.receipts.find(x => x.id === rec.id);
            if (previous) {
                if (previous.fingerprint !== fingerprint)
                    throw new Error('cannon_receipt_conflict');
                this.reconcileCannonAwardsInternal(context.roomId, false);
                return;
            }
            if (c.receipts.length >= CANNON_RECEIPT_CAP || !nat(c.total + value))
                throw new Error('cannon_accumulation_capacity');
            const before = this.state, d = structuredClone(before), room = this.room(d, r.id), draft = room.cannon, now = this.clock();
            draft.receipts.push({ id: rec.id, fingerprint, from: rec.from, to: rec.to, councilId: context.councilId, at: rec.ts, value });
            draft.total += value;
            const liveStages = new Set();
            let boundary = 0;
            for (const stage of draft.stages) {
                boundary += stage.goal;
                if (stage.status === 'locked' && draft.total >= boundary) {
                    stage.status = 'pending';
                    stage.crossedAt = rec.ts;
                    if (live)
                        liveStages.add(stage.id);
                }
            }
            room.updatedAt = now;
            this.save(d, now);
            this.state = d;
            this.notice(before, d);
            this.reconcileCannonAwardsInternal(r.id, false, liveStages);
        });
    }
    /** One queue entry. The synchronous Wallet call NEVER calls another serialized social method. */
    reconcileCannonAwards(roomId) { return this.serial(() => { this.ready(); this.reconcileCannonAwardsInternal(roomId, false); }); }
    cannonPendingCount() { return this.state.rooms.reduce((n, r) => n + (r.cannon?.stages.filter(s => s.status === 'pending').length ?? 0), 0); }
    reconcileCannonAwardsInternal(roomId, _live = false, liveStages = new Set()) {
        const backend = this.opts.cannon;
        if (!backend)
            return;
        for (const id of this.state.rooms.filter(r => (!roomId || r.id === roomId) && r.cannon).map(r => r.id)) {
            for (let i = 0; i < 3; i++) {
                const room = this.room(this.state, id), c = room.cannon, s = c.stages[i];
                if (s.status !== 'pending')
                    continue;
                if (backend.wallet.unsaved())
                    throw new Error('cannon_wallet_unavailable');
                if (!backend.wallet.has(c.ownerId))
                    throw new Error('cannon_owner_wallet_unavailable');
                // Successful receipts reconcile even if a later catalog sale status changed.
                if (!backend.wallet.campaignCommitted(s.id, c.ownerId)) {
                    validateCannonCatalog(backend.catalog, [s]);
                }
                const result = backend.wallet.grantCampaignBatch(s.id, cannonAwardFingerprint(id, c, s), [c.ownerId], { coins: 0, gems: 0, itemIds: [s.frameId, s.backgroundId] }, cannonReason(s, c.version));
                if (result.length !== 1 || result[0].status === 'failed')
                    throw new Error('cannon_award_pending');
                const reward = backend.wallet.grantReceipt(s.id, c.ownerId), owned = backend.wallet.owned(c.ownerId);
                if (!reward || ![s.frameId, s.backgroundId].every(item => owned.includes(item)))
                    throw new Error('cannon_award_proof_missing');
                const before = this.state, d = structuredClone(before), draft = this.room(d, id), stage = draft.cannon.stages[i], now = this.clock();
                stage.status = 'awarded';
                stage.completedAt = Math.max(now, stage.crossedAt);
                stage.reward = reward;
                draft.updatedAt = now;
                // A failure HERE leaves the wallet success intact and social pending durable.
                this.save(d, now);
                this.state = d;
                this.notice(before, d);
                try {
                    backend.onAward?.(c.ownerId, s.id);
                }
                catch { /* authoritative ownership already durable */ }
                if (liveStages.has(s.id))
                    try {
                        for (const member of draft.members) {
                            const snapshot = this.cannonView(draft, member.id);
                            if (snapshot)
                                this.opts.emit([member.id], { t: 'social:cannon', roomId: id, event: { id: s.id, kind: 'cannon-explosion', cannonId: c.id, stage: s.stage, occurredAt: stage.completedAt, owner: this.publicPerson(c.ownerId), reward: structuredClone(reward), cannon: snapshot } });
                        }
                    }
                    catch { /* no historical cosmetic replay; snapshot is canonical */ }
            }
        }
    }
    cannonView(r, viewer) {
        const c = r.cannon, member = r.members.find(m => m.id === viewer);
        if (!c || !member || member.deadline !== null && member.deadline <= this.clock() || this.transitioning.has(viewer) || this.failedDisconnects.has(viewer) || !this.visibleRoom(r, viewer) || this.blocked(viewer, c.ownerId))
            return null;
        try {
            this.actor(viewer, true);
        }
        catch {
            return null;
        }
        if (member.councilId !== null && !this.mediaAccess(viewer))
            return null;
        const current = c.stages.find(s => s.status === 'locked'), stageNumber = current?.stage ?? c.stages.length;
        const spent = c.stages.filter(s => s.stage < stageNumber).reduce((n, s) => n + s.goal, 0), progress = current ? Math.min(current.goal, Math.max(0, c.total - spent)) : c.stages[c.stages.length - 1].goal;
        const info = (id) => { const item = this.opts.cannon?.catalog.get(id); return item ? { id: item.id, slot: item.slot, name: item.name, icon: item.icon, css: item.css, art: item.art, rarity: item.rarity, permanent: item.permanent } : { id }; };
        return { id: c.id, version: c.version, scope: 'room', owner: this.publicPerson(c.ownerId), enabledAt: c.enabledAt, serverNow: this.clock(), currency: 'gems', energyPerGem: 1, totalEnergy: c.total, yourContribution: c.receipts.filter(x => x.from === viewer).reduce((n, x) => n + x.value, 0), currentStage: stageNumber, status: current ? 'charging' : c.stages.every(s => s.status === 'awarded') ? 'complete' : 'settling', progress, goal: current?.goal ?? c.stages[2].goal, remaining: current ? current.goal - progress : 0, pending: this.cannonPendingFor(c), completedStages: c.stages.filter(s => s.status === 'awarded').length, stages: c.stages.map(s => ({ id: s.id, stage: s.stage, goal: s.goal, status: s.status, crossedAt: s.crossedAt, completedAt: s.completedAt, rewards: { frame: info(s.frameId), background: info(s.backgroundId) }, reward: s.reward ? structuredClone(s.reward) : null })) };
    }
    cannonPendingFor(c) { return c.stages.filter(s => s.status === 'pending').length + (this.opts.cannon?.pendingCount?.(c.id) ?? 0); }
    /** Existing outbox calls this AFTER wallet commit, asynchronously outside the membership callback.
     * Save + receipt-ID dedup + scores are one social JSON commit; throwing retains the outbox intent. */
    consumeGiftSupport(context, rec, live = false) {
        return this.serial(() => {
            this.ready();
            if (!validGiftSupportContext(context))
                throw new Error('invalid_support_context');
            const wallet = this.opts.cannon?.wallet;
            if (wallet && (wallet.unsaved() || !wallet.hasGiftSource(rec.from, rec.to, rec.id)))
                throw new Error('support_gift_not_committed');
            if (wallet && canonical(wallet.committedGiftReceipt(rec.from, rec.to, rec.id)) !== canonical(rec))
                throw new Error('support_gift_proof_conflict');
            const value = supportGiftValue(rec, context);
            if (value === null)
                return;
            const fingerprint = createHash('sha256').update(canonical({ context, rec })).digest('hex');
            const previous = this.state.supportReceipts?.find(r => r.id === rec.id);
            if (previous) {
                if (previous.fingerprint !== fingerprint)
                    throw new Error('support_receipt_conflict');
                return;
            }
            if (this.opts.verifyGiftSupport && this.opts.verifyGiftSupport(context, rec) !== true)
                throw new Error('support_context_proof_conflict');
            if ((this.state.supportReceipts?.length ?? 0) >= SUPPORT_RECEIPT_CAP)
                throw new Error('support_receipt_capacity');
            const before = this.state, d = structuredClone(before), now = this.clock();
            (d.supportReceipts ??= []).push({ id: rec.id, fingerprint });
            d.supportEvents = (d.supportEvents ?? []).filter(e => e.expiresAt > now);
            const r = d.rooms.find(r => r.id === context.roomId), c = r?.councils.find(c => c.id === context.councilId), challenge = r?.challenge;
            if (context.challengeId && challenge?.id === context.challengeId && challenge.councilId === context.councilId && rec.ts >= challenge.startedAt && rec.ts < challenge.endsAt && (challenge.status !== 'cancelled' || rec.ts <= challenge.endedAt) && [...challenge.teams.blue, ...challenge.teams.red].includes(rec.to)) {
                if (challenge.receipts.length >= CHALLENGE_RECEIPT_CAP)
                    throw new Error('challenge_receipt_capacity');
                challenge.receipts.push({ id: rec.id, recipient: rec.to, at: rec.ts, value });
                // A final result is never frozen until every committed pre-deadline intent is consumed.
                if (challenge.status === 'finished')
                    finishChallenge(challenge);
                r.updatedAt = now;
            }
            let event = null;
            if (context.sourcePublic && r?.privacy === 'public' && c?.privacy === 'public' && rec.ts + SUPPORT_EVENT_TTL_MS > now && rec.ts <= now) {
                event = { id: rec.id, kind: 'gift-support', occurredAt: rec.ts, expiresAt: rec.ts + SUPPORT_EVENT_TTL_MS, roomId: r.id, councilId: c.id, senderId: rec.from, recipientId: rec.to, gift: { id: rec.gift, name: rec.name, icon: rec.icon, quantity: rec.qty }, value, currency: 'gems', prepaid: rec.prepaid === true, challengeId: context.challengeId };
                d.supportEvents.push(event);
                d.supportEvents = d.supportEvents.slice(-100);
            }
            this.save(d, now);
            this.state = d;
            this.notice(before, d);
            // Never emit historical/restart replay as a fresh banner, even if original TTL remains.
            if (live && event)
                try {
                    const viewers = this.state.rooms.flatMap(r => r.members.map(m => m.id));
                    for (const viewer of viewers) {
                        const view = this.supportEventView(event, viewer);
                        if (view)
                            this.opts.emit([viewer], { t: 'social:support', event: view });
                    }
                }
                catch { /* committed notification is best effort */ }
        });
    }
    challengePending(challengeId) { return this.opts.pendingChallengeGift?.(challengeId) === true; }
    canManageChallenge(r, c, id) {
        const access = this.mediaAccess(id);
        return access?.roomId === r.id && access.councilId === c.id && (r.ownerId === id || r.hostId === id || this.councilMod(r, c, id)) && (r.ownerId === id || this.settings(r).moderatorPermissions.moderation);
    }
    challengeView(r, viewer) {
        const c = r.challenge, access = this.mediaAccess(viewer), council = r.councils.find(x => x.id === c?.councilId);
        if (!c || !council || access?.roomId !== r.id || access.councilId !== c.councilId)
            return null;
        const all = [...c.teams.blue, ...c.teams.red];
        if (all.some(id => this.blocked(viewer, id) || !this.publicPerson(id) || !this.opts.eligible(id)))
            return null;
        const now = this.clock(), totals = challengeTotals(c), pending = this.challengePending(c.id);
        const status = c.status === 'active' && now >= c.endsAt ? 'settling' : c.status;
        const players = (ids) => ids.map(id => ({ ...this.privateWho(id), receivedGiftValue: c.receipts.filter(x => x.recipient === id).reduce((n, x) => n + x.value, 0), present: this.mediaAccess(id)?.councilId === c.councilId }));
        return { id: c.id, councilId: c.councilId, status: pending && c.status === 'finished' ? 'settling' : status, durationSeconds: 180, startedAt: c.startedAt, endsAt: c.endsAt, serverNow: now, remainingSeconds: c.status === 'active' ? Math.max(0, Math.ceil((c.endsAt - now) / 1000)) : 0, endedAt: c.endedAt, teams: { blue: players(c.teams.blue), red: players(c.teams.red) }, totals, winner: pending ? null : c.winner, canManage: this.canManageChallenge(r, council, viewer), scoreCurrency: 'gems', scoreBasis: 'received-gift-total' };
    }
    supportEventView(event, viewer) {
        const now = this.clock();
        if (event.expiresAt <= now || event.occurredAt > now || this.transitioning.has(viewer) || this.failedDisconnects.has(viewer))
            return null;
        try {
            this.actor(viewer, true);
        }
        catch {
            return null;
        }
        const current = this.member(this.state, viewer);
        if (!current || current.member.deadline !== null && current.member.deadline <= now || !this.visibleRoom(current.room, viewer))
            return null;
        if (current.member.councilId !== null && !this.mediaAccess(viewer))
            return null;
        const source = this.state.rooms.find(r => r.id === event.roomId), c = source?.councils.find(c => c.id === event.councilId), destination = current.room;
        if (!source || source.privacy !== 'public' || c?.privacy !== 'public' || !destination || !this.visibleRoom(destination, viewer) || !this.visibleRoom(source, viewer) || this.blocked(viewer, c.ownerId) || [event.senderId, event.recipientId].some(id => this.opts.supportPublicActivity?.(id) === false))
            return null;
        // The sender's seat is not proof of payment; the frozen durable receipt is.
        // Recheck public source visibility/opt-outs without exposing sender's current room.
        try {
            this.actor(event.senderId, true);
        }
        catch {
            return null;
        }
        const to = this.mediaAccess(event.recipientId);
        if (to?.roomId !== source.id || to.councilId !== c.id || !this.directoryVisibleRoom(source, event.senderId) || this.blocked(event.senderId, c.ownerId) || this.blocked(event.senderId, event.recipientId) || [event.senderId, event.recipientId].some(id => this.blocked(viewer, id) || destination.bans.some(b => b.id === id)))
            return null;
        const sender = this.publicPerson(event.senderId), recipient = this.publicPerson(event.recipientId);
        if (!sender || !recipient)
            return null;
        return { id: event.id, kind: event.kind, occurredAt: event.occurredAt, expiresAt: event.expiresAt, room: { id: source.id, name: source.name }, councilId: c.id, sender, recipient, gift: structuredClone(event.gift), value: event.value, currency: event.currency, prepaid: event.prepaid, challengeId: event.challengeId };
    }
    /** Membership queue only: financial operation owns its commit/idempotency. The callback must NOT call another serialized SocialRooms method (nested queue deadlock). */
    withRoomBenefitAccess(uid, roomId, targetUid, operation) {
        return this.serial(async () => {
            let snapshot;
            try {
                this.ready();
                if (!uuid(roomId) || targetUid !== null && !ident(targetUid))
                    fail('invalid_benefit_context');
                this.actor(uid, true);
                const r = this.room(this.state, roomId), m = this.requireRoomMember(r, uid);
                if (this.transitioning.has(uid) || this.failedDisconnects.has(uid) || !this.visibleRoom(r, uid) || r.bans.some(b => b.id === uid) || this.blocked(uid, r.ownerId))
                    fail('room_access_denied', 403);
                if (targetUid !== null) {
                    this.actor(targetUid, true);
                    this.requireRoomMember(r, targetUid);
                    if (this.transitioning.has(targetUid) || this.failedDisconnects.has(targetUid) || !this.visibleRoom(r, targetUid) || r.bans.some(b => b.id === targetUid) || this.blocked(uid, targetUid))
                        fail('target_unavailable', 403);
                }
                const owner = r.ownerId === uid, moderator = this.moderator(r, uid), luckyBag = this.settings(r).luckyBag;
                snapshot = Object.freeze({ roomId: r.id, ownerId: r.ownerId, actorId: m.id, targetId: targetUid, maxMembers: r.maxMembers, memberCount: r.members.filter(m => m.deadline === null || m.deadline > this.clock()).length, owner, moderator, luckyBag, canCreateBag: luckyBag === 'everyone' || luckyBag === 'moderators' && moderator || owner });
            }
            catch (e) {
                return e instanceof SocialError ? { ok: false, error: e.error, status: e.status } : { ok: false, error: 'social_storage_or_dependency_unavailable', status: 503 };
            }
            // No social save/rollback after this callback can reinterpret a committed financial operation.
            return operation(snapshot);
        });
    }
    /** Server-only post-wallet notice: no financial state, no mutation and no nested membership queue. */
    notifyBenefits(roomId) {
        this.ready();
        if (!uuid(roomId))
            return;
        const room = this.state.rooms.find(r => r.id === roomId);
        if (!room)
            return;
        const ids = room.members.filter(m => (m.deadline === null || m.deadline > this.clock()) && this.visibleRoom(room, m.id) && this.opts.eligible(m.id) && !room.bans.some(b => b.id === m.id)).map(m => m.id);
        this.opts.emit(ids, { t: 'social:benefits', roomId });
    }
    /** Photo bytes are read from the existing avatar service only for visible, live room peers. */
    withAvatarAccess(viewer, recipient, read) {
        return this.serial(() => {
            try {
                this.ready();
                this.actor(viewer, true);
                this.actor(recipient, true);
                if (this.transitioning.has(viewer) || this.transitioning.has(recipient) || this.failedDisconnects.has(viewer) || this.failedDisconnects.has(recipient))
                    return null;
                const from = this.member(this.state, viewer), to = this.member(this.state, recipient);
                if (!from || !to || from.room.id !== to.room.id || this.blocked(viewer, recipient) || !this.visibleRoom(from.room, viewer) || !this.visibleRoom(to.room, recipient))
                    return null;
                this.requireRoomMember(from.room, viewer);
                this.requireRoomMember(to.room, recipient);
                return read();
            }
            catch {
                return null;
            }
        });
    }
    /** Check before decoding, then recheck inside the serialized commit (revocation races). */
    coverPermission(userId, roomId) {
        return this.serial(() => this.guard(() => { this.ready(); this.actor(userId, true); if (!uuid(roomId))
            fail('invalid_room'); const r = this.room(this.state, roomId); if (!this.visibleRoom(r, userId))
            fail('room_not_found', 404); this.requireMod(r, userId, undefined, 'identity'); return { ok: true }; }));
    }
    withCoverAccess(userId, roomId, read) {
        return this.serial(() => { try {
            this.ready();
            this.actor(userId);
            if (!uuid(roomId))
                return null;
            const r = this.room(this.state, roomId);
            if (!this.visibleRoom(r, userId) || !r.cover)
                return null;
            return read(roomCoverKey(r.id, r.cover));
        }
        catch {
            return null;
        } });
    }
    /** Bytes already normalized by parent HTTP. Immutable digest keys preserve the previous cover if JSON commit fails. */
    setCover(userId, roomId, hash, persist, key = randomUUID()) {
        return this.serial(() => this.guard(async () => {
            this.ready();
            this.actor(userId, true);
            if (!uuid(roomId) || !digest(hash))
                fail('invalid_room_cover');
            const r = this.room(this.state, roomId);
            if (!this.visibleRoom(r, userId))
                fail('room_not_found', 404);
            this.requireMod(r, userId, undefined, 'identity');
            if (!ident(key) || key.length > 96)
                fail('invalid_cover_key');
            const fingerprint = createHash('sha256').update(canonical({ roomId, hash })).digest('hex');
            const old = this.state.receipts.find(x => !x.admin && x.actor === userId && x.command === 'room:cover' && x.key === key);
            if (old) {
                if (old.fingerprint !== fingerprint)
                    fail('idempotency_key_conflict', 409);
                return structuredClone(old.result);
            }
            if (this.state.receipts.length >= this.maxReceipts)
                fail('idempotency_capacity', 409);
            return this.tx((d, _media, now) => { const room = this.room(d, roomId); this.requireMod(room, userId, undefined, 'identity'); persist(roomCoverKey(roomId, hash)); room.cover = hash; this.activity(room, 'room:cover', now); this.audit(d, userId, 'room:cover', roomId, 'cover-upload', now, roomId); const result = { ok: true, updated: true, roomId }; d.receipts.push({ actor: userId, command: 'room:cover', key, fingerprint, result, at: now, admin: false }); return result; });
        }));
    }
    health() { const storage = this.monitor.status(); return { ready: this.started && !this.stopped && !this.closing && !this.unsaved() && storage.ready, persistent: !!this.opts.file, singleWriter: true, storage, auditPending: this.state.audit.filter(a => !a.delivered).length, rooms: this.state.rooms.length, councils: this.state.rooms.reduce((n, r) => n + r.councils.length, 0), members: this.state.rooms.reduce((n, r) => n + r.members.length, 0) }; }
    async guard(fn) { try {
        return await fn();
    }
    catch (e) {
        return e instanceof SocialError ? { ok: false, error: e.error, status: e.status } : { ok: false, error: 'social_storage_or_dependency_unavailable', status: 503 };
    } }
    actor(id, entry = false, d = this.state) {
        if (!ident(id) || !this.opts.profile(id))
            fail('authentication_required', 401);
        if (this.opts.eligible(id) !== true)
            fail('social_ineligible', 403);
        if (entry && !d.config.enabled)
            fail('social_disabled', 403);
        if (entry && this.opts.requireAdultAck !== false && !this.pref(d, id, false)?.adultConsent)
            fail('adult_acknowledgement_required', 403);
    }
    pref(d, id, make = true) {
        let p = d.preferences.find(p => p.id === id);
        if (!p && make) {
            if (d.preferences.length >= 100000)
                fail('preferences_capacity', 409);
            p = { id, invitations: true, interests: '', remember: false, adultConsent: false, favorites: [], previous: null, rates: [] };
            d.preferences.push(p);
        }
        return p;
    }
    blocked(a, b) { return this.opts.blocked(a, b) !== false || this.opts.blocked(b, a) !== false; }
    target(d, value) {
        if (!ident(value))
            fail('invalid_target');
        const all = new Set(d.preferences.map(p => p.id));
        for (const r of d.rooms) {
            all.add(r.ownerId);
            r.members.forEach(m => all.add(m.id));
            r.invites.forEach(id => all.add(id));
            r.moderators.forEach(id => all.add(id));
            r.councils.forEach(c => { all.add(c.ownerId); c.invites.forEach(id => all.add(id)); });
        }
        for (const r of d.rooms)
            for (const b of r.bans)
                all.add(b.id);
        for (const id of all) {
            const p = this.opts.profile(id);
            if (p?.id === value || p?.publicId === value)
                return id;
        }
        if (this.opts.profile(value))
            return value;
        return fail('target_not_found', 404);
    }
    room(d, id) { const r = d.rooms.find(r => r.id === id); return r ?? fail('room_not_found', 404); }
    council(r, id) { return r.councils.find(c => c.id === id) ?? fail('council_not_found', 404); }
    member(d, id) { for (const room of d.rooms) {
        const member = room.members.find(m => m.id === id);
        if (member)
            return { room, member };
    } return null; }
    currentCouncil(d, id, b) {
        const x = this.member(d, id);
        if (!x?.member.councilId)
            fail('council_membership_required', 403);
        if (x.member.deadline !== null && x.member.deadline <= this.clock())
            fail('membership_expired', 403);
        if (b.roomId !== undefined && b.roomId !== x.room.id || b.councilId !== undefined && b.councilId !== x.member.councilId)
            fail('wrong_council', 403);
        return { ...x, council: this.council(x.room, x.member.councilId) };
    }
    moderator(r, id) { return r.ownerId === id || r.moderators.includes(id); }
    councilMod(r, c, id) { return this.moderator(r, id) || c.ownerId === id || c.hostId === id; }
    requireRoomMember(r, id) { return r.members.find(m => m.id === id && (m.deadline === null || m.deadline > this.clock())) ?? fail('room_membership_required', 403); }
    requireMod(r, id, c, permission) {
        if (!(c ? this.councilMod(r, c, id) : this.moderator(r, id)))
            fail('moderator_required', 403);
        // Council ownership/host status must never bypass a room-level revoked permission.
        if (r.ownerId !== id && permission && !this.settings(r).moderatorPermissions[permission])
            fail('permission_denied', 403);
    }
    settings(r) { const defaults = defaultRoomSettings(); return { ...defaults, ...r.settings, moderatorPermissions: { ...defaults.moderatorPermissions, ...r.settings?.moderatorPermissions } }; }
    permissions(r, id) { const owner = r.ownerId === id, mod = this.moderator(r, id), s = this.settings(r), p = s.moderatorPermissions; const member = r.members.some(m => m.id === id && (m.deadline === null || m.deadline > this.clock())); const createBag = member && this.opts.eligible(id) === true && this.state.config.enabled && (this.opts.requireAdultAck === false || this.pref(this.state, id, false)?.adultConsent === true) && !this.transitioning.has(id) && !this.failedDisconnects.has(id) && this.visibleRoom(r, id) && (owner || s.luckyBag === 'everyone' || s.luckyBag === 'moderators' && mod); return { ...Object.fromEntries(roomPermissionKeys.map(k => [k, owner || mod && p[k]])), owner, audit: owner || mod && p.moderation, createBag }; }
    canChat(r, id) { return this.settings(r).chat === 'everyone' || this.moderator(r, id); }
    audioMuted(r, m) { const s = this.settings(r); return m.muted || s.speak === 'moderators' && !this.moderator(r, m.id) || s.micRequests && !(r.micApprovals ?? []).includes(m.id); }
    revokeAudio(r, media, id) { for (const m of r.members)
        if (!id || m.id === id) {
            m.epoch = randomUUID();
            media.add(m.id);
        } }
    clearMic(r, id) { if (r.micRequests)
        r.micRequests = r.micRequests.filter(x => x !== id); if (r.micApprovals)
        r.micApprovals = r.micApprovals.filter(x => x !== id); }
    visibleRoom(r, id) { return !r.bans.some(b => b.id === id) && !this.blocked(id, r.ownerId) && (r.privacy === 'public' || r.ownerId === id || r.moderators.includes(id) || r.invites.includes(id) || r.members.some(m => m.id === id && (m.deadline === null || m.deadline > this.clock()))); }
    directoryVisibleRoom(r, id) { return this.visibleRoom(r, id) && !(r.hostId && this.blocked(id, r.hostId)); }
    chooseHost(r, c) { const members = r.members.filter(m => !c || m.councilId === c.id); members.sort((a, b) => Number(this.moderator(r, b.id)) - Number(this.moderator(r, a.id)) || a.joinedAt - b.joinedAt || a.id.localeCompare(b.id)); return members[0]?.id ?? null; }
    hosts(r) { r.hostId = this.chooseHost(r); for (const c of r.councils)
        c.hostId = this.chooseHost(r, c); }
    activity(r, command, now) { r.updatedAt = now; r.activity.push({ action: command, at: now }); r.activity = r.activity.slice(-100); this.hosts(r); }
    gameBound(d, r) { return d.receipts.some(x => !x.admin && x.command === 'game:bind' && x.key === r.id); }
    /** Normalize only detached tx drafts; legacy detail reads and startup keep optional fields absent. */
    normalizeSeats(d) {
        for (const r of d.rooms)
            if (!this.gameBound(d, r))
                for (const c of r.councils) {
                    const members = r.members.filter(m => m.councilId === c.id), layout = councilSeatLayout(c, members);
                    if (!layout)
                        throw new Error('social_seat_shape_invalid');
                    for (const m of members)
                        m.seatIndex = layout.get(m.id);
                }
    }
    memberSeat(r, m) {
        if (!m.councilId)
            return null;
        const c = this.council(r, m.councilId);
        return councilSeatLayout(c, r.members.filter(peer => peer.councilId === c.id))?.get(m.id) ?? null;
    }
    previous(d, id, r, councilId) { const p = this.pref(d, id); if (p.remember && councilId)
        p.previous = { roomId: r.id, councilId }; }
    remove(d, id, media) {
        const old = this.member(d, id);
        if (!old)
            return;
        this.previous(d, id, old.room, old.member.councilId);
        old.room.members = old.room.members.filter(m => m.id !== id);
        for (const c of old.room.councils)
            c.requests = c.requests.filter(x => x !== id);
        this.clearMic(old.room, id);
        media.add(id);
        this.hosts(old.room);
    }
    admitRoom(d, r, id, admission) {
        if (r.bans.some(b => b.id === id) || this.blocked(id, r.ownerId) || r.members.some(m => m.id !== id && this.blocked(id, m.id)))
            fail('room_access_denied', 403);
        const active = r.members.some(m => m.id === id && (m.deadline === null || m.deadline > this.clock()));
        if (r.privacy === 'private' && !r.invites.includes(id) && r.ownerId !== id && !r.moderators.includes(id) && !active)
            fail('room_invitation_required', 403);
        if (!active && r.members.length >= r.maxMembers + roomCapacityBonus(roomLevelOf(r.support ?? 0).level))
            fail('room_full', 409);
        if (r.password && !active && admission?.passwordVerifiedRoomId !== r.id)
            fail('room_password_required', 403);
    }
    enterRoom(d, r, id, media, now, admission) {
        this.admitRoom(d, r, id, admission);
        if (this.opts.onEnter) {
            const cb = this.opts.onEnter, rid = r.id, rn = r.name;
            queueMicrotask(() => { try {
                cb(id, rid, rn);
            }
            catch { /* السجل اختياري */ } });
        }
        const old = this.member(d, id);
        if (old?.room.id === r.id)
            return old.member;
        this.remove(d, id, media);
        const m = { id, councilId: null, joinedAt: now, epoch: randomUUID(), muted: false, deadline: (this.connections.get(id) ?? 0) > 0 ? null : now + this.grace };
        r.members.push(m);
        r.invites = r.invites.filter(x => x !== id);
        this.hosts(r);
        const p = this.pref(d, id);
        if (p.remember)
            p.recentRoomIds = [r.id, ...(p.recentRoomIds ?? []).filter(roomId => roomId !== r.id)].slice(0, DIRECTORY_LIMIT_R30);
        return m;
    }
    admitCouncil(r, c, id, checkCapacity = true) {
        if (this.blocked(id, c.ownerId) || r.members.some(m => m.id !== id && m.councilId === c.id && this.blocked(id, m.id)))
            fail('council_access_denied', 403);
        const already = r.members.some(m => m.id === id && m.councilId === c.id);
        if (checkCapacity && !already && r.members.filter(m => m.councilId === c.id).length >= c.seats)
            fail('council_full', 409);
        if (!already && (c.locked || c.privacy === 'private') && !c.invites.includes(id) && !this.councilMod(r, c, id))
            fail('council_invitation_required', 403);
    }
    enterCouncil(d, r, c, id, media, now, requestedSeat, admission) {
        const gameBound = this.gameBound(d, r);
        if (gameBound && requestedSeat !== undefined)
            fail('game_room_controls_unavailable', 403);
        this.admitRoom(d, r, id, admission);
        this.admitCouncil(r, c, id, gameBound);
        let seatIndex;
        if (!gameBound) {
            const occupants = r.members.filter(m => m.councilId === c.id), layout = councilSeatLayout(c, occupants);
            if (!layout)
                throw new Error('social_seat_shape_invalid');
            const already = occupants.find(m => m.id === id);
            if (already && requestedSeat === undefined)
                return;
            const locked = new Set(c.lockedSeats ?? []), occupied = new Set([...layout].filter(([memberId]) => memberId !== id).map(([, index]) => index));
            if (requestedSeat !== undefined) {
                if (!validSeatIndex(requestedSeat, c.seats))
                    fail('invalid_seat_index');
                if (locked.has(requestedSeat))
                    fail('seat_locked', 409);
                if (occupied.has(requestedSeat))
                    fail('seat_occupied', 409);
                seatIndex = requestedSeat;
            }
            else {
                seatIndex = Array.from({ length: c.seats }, (_, i) => i).find(i => !locked.has(i) && !occupied.has(i));
                if (seatIndex === undefined)
                    fail('council_full', 409);
            }
            if (already) {
                already.seatIndex = seatIndex;
                return;
            } // Same channel and permissions: keep voice epoch/approval.
        }
        const m = this.enterRoom(d, r, id, media, now, admission);
        if (m.councilId === c.id)
            return;
        this.previous(d, id, r, m.councilId);
        media.add(id);
        m.councilId = c.id;
        m.epoch = randomUUID();
        if (seatIndex === undefined)
            delete m.seatIndex;
        else
            m.seatIndex = seatIndex;
        this.clearMic(r, id);
        c.invites = c.invites.filter(x => x !== id);
        c.requests = c.requests.filter(x => x !== id);
        this.hosts(r);
    }
    seats(d, kind, value) {
        const n = value ?? (kind === 'pair' ? 2 : kind === 'group' ? 4 : d.config.defaultCouncilSeats);
        if (!num(n, 2, d.config.maxCouncilSeats) || kind === 'pair' && n !== 2 || kind === 'group' && !num(n, 3, 5))
            fail('invalid_seats');
        return n;
    }
    peer(d, id, value) { const t = this.target(d, value); if (t === id)
        fail('self_target'); if (this.opts.eligible(t) !== true || this.blocked(id, t))
        fail('target_unavailable', 403); return t; }
    invite(d, id, t, list) { if (this.pref(d, t, false)?.invitations === false)
        fail('invitations_disabled', 403); if (!list.includes(t)) {
        if (list.length >= 200)
            fail('invitation_capacity', 409);
        list.push(t);
    } }
    rate(d, id, now, max = 20) { const p = this.pref(d, id); p.rates = p.rates.filter(t => t > now - 60000); if (p.rates.length >= max)
        fail('rate_limited', 429); p.rates.push(now); }
    // room-tools-r33: trusted context
    toolContextR33(d, r, c, id, now) {
        const m = r.members.find(m => m.id === id && m.councilId === c.id && (m.deadline === null || m.deadline > now));
        const membership = this.member(d, id);
        const eligible = this.opts.eligible(id) === true && !!this.opts.profile(id) && d.config.enabled && (this.opts.requireAdultAck === false || this.pref(d, id, false)?.adultConsent === true);
        const scopeAllowed = !!m && !this.transitioning.has(id) && !this.failedDisconnects.has(id) && this.visibleRoom(r, id) && !r.bans.some(b => b.id === id) && !this.blocked(id, c.ownerId) && !r.members.some(p => p.id !== id && p.councilId === c.id && this.blocked(id, p.id));
        return { actorId: id, roomId: r.id, councilId: c.id, currentRoomId: membership?.room.id ?? null, currentCouncilId: membership?.member.councilId ?? null,
            member: !!m, eligible, muted: m?.muted === true, canWrite: !!m && eligible && !m.muted && this.canChat(r, id), scopeAllowed,
            moderator: this.councilMod(r, c, id) && (r.ownerId === id || this.settings(r).moderatorPermissions.chat), now,
            authorVisible: authorId => !!this.opts.profile(authorId) && this.opts.eligible(authorId) === true && !this.blocked(id, authorId) };
    }
    context(d, r, c, id, now) {
        // Muting/chat policy affects writing, not membership or the right to opt out.
        const members = r.members.filter(m => m.councilId === c.id && (m.deadline === null || m.deadline > now) && !!this.opts.profile(m.id) && this.opts.eligible(m.id) === true && (this.opts.requireAdultAck === false || this.pref(d, m.id, false)?.adultConsent === true) && !r.bans.some(b => b.id === m.id) && !this.blocked(m.id, r.ownerId) && !this.blocked(m.id, c.ownerId));
        const m = members.find(m => m.id === id);
        return { actorId: id, members: members.map(m => m.id), moderator: this.councilMod(r, c, id) && (r.ownerId === id || this.settings(r).moderatorPermissions.chat), now, content: d.config.content, newId: randomUUID, canWrite: !!m && !m.muted && this.canChat(r, id) && d.config.enabled };
    }
    advanceGamesR47(d, now) {
        let changed = false;
        for (const r of d.rooms)
            for (const c of r.councils)
                if (advanceSocialGamesR47(c.modes, this.context(d, r, c, c.ownerId, now))) {
                    r.updatedAt = now;
                    changed = true;
                }
        return changed;
    }
    audit(d, id, action, targetId, reason, now, roomId) { if (d.audit.length >= 100000)
        fail('audit_capacity', 409); d.audit.push({ id: randomUUID(), actor: id, action, targetId, reason, at: now, delivered: false, ...(roomId ? { roomId } : {}) }); }
    notice(before, after) {
        for (const id of new Set([...before.rooms, ...after.rooms].map(r => r.id))) {
            const a = before.rooms.find(r => r.id === id), b = after.rooms.find(r => r.id === id);
            if (canonical(a ?? null) === canonical(b ?? null))
                continue;
            // room-tools-r33: council-only invalidation
            const receipt = after.receipts.at(-1);
            const toolReceipt = receipt?.result;
            if (receipt && toolReceipt?.ok === true && after.receipts.length === before.receipts.length + 1 && (receipt.command === 'tool:set' || receipt.command === 'tool:action')) {
                // Receipt scope is a committed server result, never an arbitrary socket/client hint.
                // Legacy seat normalization in the same transaction must not broaden tool notifications.
                const council = b?.councils.find(c => c.id === toolReceipt.councilId);
                if (b && council && toolReceipt.roomId === id) {
                    const viewers = b.members.filter(m => m.councilId === council.id && this.mediaAccess(m.id)?.councilId === council.id).map(m => m.id);
                    try {
                        this.opts.emit(viewers, { t: 'social:update', roomId: id, councilId: council.id });
                    }
                    catch { /* committed state stays successful */ }
                }
                continue;
            }
            const ids = [...new Set([...(a?.members ?? []), ...(b?.members ?? [])].map(m => m.id))];
            // Invitations are notifications to the invited user, not public broadcasts.
            if (b) {
                for (const uid of b.invites)
                    ids.push(uid);
                for (const c of b.councils)
                    ids.push(...c.invites);
            }
            try {
                this.opts.emit([...new Set(ids)], { t: 'social:update', roomId: id });
            }
            catch { /* committed state must not be reported as failure because a socket closed */ }
        }
    }
    async deliverAudit() {
        if (!this.opts.audit)
            return;
        for (const a of this.state.audit.filter(a => !a.delivered)) {
            try {
                await this.opts.audit(a.actor, `social:${a.action}:${a.id}`, a.targetId, a.reason);
            }
            catch {
                break;
            } // Durable outbox; callback must dedupe the included audit UUID.
            const d = structuredClone(this.state);
            d.audit.find(x => x.id === a.id).delivered = true;
            try {
                this.save(d, this.clock());
                this.state = d;
            }
            catch {
                break;
            }
        }
    }
    async tx(fn) {
        const before = this.state, d = structuredClone(before), media = new Set(), now = this.clock();
        const priorMemory = new Map(this.pendingMemory);
        try {
            this.normalizeSeats(d);
            const result = fn(d, media, now);
            if (!result.ok)
                return result;
            // Same atomic draft/receipt as leave, ban, council switch, consent and expiry.
            this.advanceGamesR47(d, now);
            for (const id of media)
                this.transitioning.add(id);
            for (const id of media)
                await this.opts.disconnectMedia?.(id); // No new membership is visible until old transport is gone.
            this.save(d, now);
            this.state = d;
            const pending = new Set(d.rooms.flatMap(r => r.memories.filter(m => m.text === null).map(m => m.id)));
            for (const id of this.pendingMemory.keys())
                if (!pending.has(id))
                    this.pendingMemory.delete(id);
            this.notice(before, d);
            await this.deliverAudit();
            return result;
        }
        catch (e) {
            this.pendingMemory.clear();
            for (const [id, value] of priorMemory)
                this.pendingMemory.set(id, value);
            throw e;
        }
        finally {
            for (const id of media)
                this.transitioning.delete(id);
        }
    }
    directoryMetadata(b) {
        if (Object.hasOwn(b, 'roomMode') && !validDirectoryMode(b.roomMode))
            fail(UNSUPPORTED_ROOM_MODES_R30.includes(b.roomMode) ? 'unsupported_room_mode' : 'invalid_room_mode');
        if (Object.hasOwn(b, 'roomTag') && !validDirectoryTag(b.roomTag))
            fail('invalid_room_tag');
        if (Object.hasOwn(b, 'country') && !validDirectoryCountry(b.country))
            fail('invalid_room_country');
    }
    throttlePassword(id) {
        const now = this.clock(), cutoff = now - 60000;
        for (const [actor, attempts] of this.passwordAttempts)
            if (!attempts.some(t => t > cutoff))
                this.passwordAttempts.delete(actor);
        const attempts = (this.passwordAttempts.get(id) ?? []).filter(t => t > cutoff);
        this.passwordGlobalAttempts = this.passwordGlobalAttempts.filter(t => t > cutoff);
        const durable = (this.pref(this.state, id, false)?.rates ?? []).filter(t => t > cutoff);
        if (attempts.length >= 20 || durable.length >= 20 || this.passwordGlobalAttempts.length >= 100 || !this.passwordAttempts.has(id) && this.passwordAttempts.size >= 1000)
            fail('rate_limited', 429);
        attempts.push(now);
        this.passwordAttempts.set(id, attempts);
        this.passwordGlobalAttempts.push(now);
    }
    /** Runs inside the SAME serial queue before tx. Verified authority is server-local, never a body field. */
    async prepareDirectory(id, command, b) {
        const admission = {};
        if (command === 'room:create' || command === 'room:update')
            this.directoryMetadata(b);
        if ((command === 'room:create' || command === 'room:update') && this.opts.moderate) {
            for (const [k, kind] of [['name', 'room-name'], ['description', 'room-ad']])
                if (typeof b[k] === 'string' && b[k].trim()) {
                    const m = this.opts.moderate(b[k], kind);
                    if (!m.ok)
                        fail(m.code, 422);
                }
        }
        if (command === 'room:update' && Object.hasOwn(b, 'password')) {
            const r = this.room(this.state, b.roomId);
            if (!this.visibleRoom(r, id))
                fail('room_not_found', 404);
            this.requireMod(r, id, undefined, 'entry');
            if (this.gameBound(this.state, r))
                fail('game_room_password_unavailable', 403);
        }
        if ((command === 'room:create' || command === 'room:update') && typeof b.password === 'string' && b.password)
            admission.protection = await makeRoomPasswordR30(b.password);
        if (command === 'room:join' || command === 'council:join' || command === 'council:return') {
            const roomId = command === 'council:return' ? this.pref(this.state, id, false)?.previous?.roomId : b.roomId;
            if (command === 'council:return' && !roomId)
                fail('previous_council_unavailable', 404);
            const r = this.room(this.state, roomId);
            if (command !== 'room:join' && !this.visibleRoom(r, id))
                fail('room_not_found', 404);
            // Check invitation/ban/block/capacity before any password comparison. This token only skips the password gate.
            this.admitRoom(this.state, r, id, { passwordVerifiedRoomId: r.id });
            const active = r.members.some(m => m.id === id && (m.deadline === null || m.deadline > this.clock()));
            if (r.password && !active) {
                if (!b.password)
                    fail('room_password_required', 403);
                if (!await verifyRoomPasswordR30(b.password, r.password))
                    fail('room_password_invalid', 403);
                admission.passwordVerifiedRoomId = r.id;
            }
        }
        return admission;
    }
    async command(userId, command, body) {
        return this.serial(() => this.guard(async () => {
            this.ready();
            this.actor(userId);
            if (!isObj(body) || !jsonSafe(body) || Buffer.byteLength(canonical(body)) > 24000 || typeof command !== 'string' || command.length > 80)
                fail('invalid_command');
            if (!ident(body.key) || body.key.length > 96)
                fail('idempotency_key_required');
            const input = Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'key' && k !== 'command'));
            const passwordCommand = ['room:create', 'room:update', 'room:join', 'council:join', 'council:return'].includes(command);
            if (Object.hasOwn(input, 'password') && (!passwordCommand || !validPasswordInputR30(input.password)))
                fail('invalid_room_password');
            const old = this.state.receipts.find(r => !r.admin && r.actor === userId && r.command === command && r.key === body.key);
            const slowFingerprint = typeof input.password === 'string' && input.password.length > 0;
            const admissionRoom = command === 'council:return' ? this.pref(this.state, userId, false)?.previous?.roomId : input.roomId;
            const protectedAdmission = ['room:join', 'council:join', 'council:return'].includes(command) && this.state.rooms.some(r => r.id === admissionRoom && r.password && !r.members.some(m => m.id === userId && (m.deadline === null || m.deadline > this.clock())));
            const passwordWork = slowFingerprint || protectedAdmission;
            if (passwordWork)
                this.throttlePassword(userId);
            const fp = slowFingerprint ? await passwordFingerprintR30(canonical(input), old?.fingerprint) : createHash('sha256').update(canonical(input)).digest('hex');
            if (old) {
                if (old.fingerprint !== fp)
                    fail('idempotency_key_conflict', 409);
                return structuredClone(old.result);
            }
            if (this.state.receipts.length >= this.maxReceipts)
                fail('idempotency_capacity', 409);
            if (command !== 'prefs:update' && command !== 'room:leave' && command !== 'council:leave' && command !== 'report:send')
                this.actor(userId, true);
            const admission = await this.prepareDirectory(userId, command, input);
            return this.tx((d, media, now) => {
                // Expired memberships cannot be revived by a late mutation or a reconnect.
                const oldMember = this.member(d, userId);
                if (oldMember?.member.deadline !== null && oldMember && oldMember.member.deadline <= now)
                    this.remove(d, userId, media);
                if (passwordWork)
                    this.rate(d, userId, now);
                const out = this.apply(d, userId, command, input, media, now, admission);
                d.receipts.push({ actor: userId, command, key: body.key, fingerprint: fp, result: out, at: now, admin: false });
                return out;
            });
        }));
    }
    apply(d, id, command, b, media, now, admission = {}) {
        const success = (more = {}) => ({ ok: true, ...more });
        // room-tools-r33: commands
        if (command === 'tool:set' || command === 'tool:action') {
            if (!uuid(b.roomId) || !uuid(b.councilId))
                fail('invalid_tool_command');
            const { room: r, council: c } = this.currentCouncil(d, id, b);
            // Game-bound council utilities are intentionally unavailable: no game/PK contract changes.
            if (this.gameBound(d, r))
                fail('game_room_tools_unavailable', 403);
            const tools = c.tools ?? initialRoomToolsR33();
            const out = applyRoomToolR33(tools, command, b, this.toolContextR33(d, r, c, id, now));
            if (!out.ok)
                fail(out.error, out.status);
            this.rate(d, id, now);
            c.tools = tools;
            this.activity(r, command, now);
            return success({ roomId: r.id, councilId: c.id, event: out.event, toolResult: out.toolResult });
        }
        if (command === 'challenge:start' || command === 'challenge:cancel') {
            if (!keys(b, command === 'challenge:start' ? ['roomId', 'councilId', 'teams', 'durationSeconds'] : ['roomId', 'councilId', 'challengeId']))
                fail('invalid_challenge_command');
            const { room: r, council: c } = this.currentCouncil(d, id, b);
            if (!uuid(b.roomId) || !uuid(b.councilId) || !this.canManageChallenge(r, c, id))
                fail('challenge_permission_required', 403);
            if (d.receipts.some(x => x.command === 'game:bind' && x.key === r.id))
                fail('game_challenge_unavailable', 403);
            if (command === 'challenge:cancel') {
                const challenge = r.challenge;
                if (!challenge || challenge.id !== b.challengeId || challenge.councilId !== c.id)
                    fail('challenge_not_found', 404);
                if (challenge.status !== 'active' || now >= challenge.endsAt)
                    fail('challenge_not_active', 409);
                challenge.status = 'cancelled';
                challenge.endedAt = now;
                challenge.winner = null;
            }
            else {
                if (b.durationSeconds !== 180 || !isObj(b.teams) || !keys(b.teams, ['blue', 'red']) || !strings(b.teams.blue, ident, 5) || !strings(b.teams.red, ident, 5) || !b.teams.blue.length || !b.teams.red.length)
                    fail('invalid_challenge_teams');
                const teams = { blue: b.teams.blue.map(value => this.target(d, value)), red: b.teams.red.map(value => this.target(d, value)) }, all = [...teams.blue, ...teams.red];
                if (new Set(all).size !== all.length)
                    fail('invalid_challenge_teams');
                if (r.challenge && (r.challenge.status === 'active' && now < r.challenge.endsAt || this.challengePending(r.challenge.id)))
                    fail('challenge_in_progress', 409);
                for (const target of all) {
                    const access = this.mediaAccess(target);
                    if (!access || access.roomId !== r.id || access.councilId !== c.id || !this.publicPerson(target) || this.blocked(id, target))
                        fail('challenge_current_council_required', 403);
                }
                r.challenge = { id: randomUUID(), councilId: c.id, startedAt: now, endsAt: now + 180_000, durationSeconds: 180, status: 'active', endedAt: null, winner: null, teams, receipts: [] };
            }
            this.activity(r, command, now);
            this.audit(d, id, command, r.id, 'social-challenge', now, r.id);
            return success({ roomId: r.id, councilId: c.id, updated: true });
        }
        if (command === 'prefs:update') {
            const p = this.pref(d, id);
            for (const k of ['invitations', 'remember', 'adultConsent'])
                if (b[k] !== undefined)
                    p[k] = boolean(b[k]);
            if (b.adultAcknowledged !== undefined) {
                if (b.adultConsent !== undefined && b.adultConsent !== b.adultAcknowledged)
                    fail('conflicting_adult_consent');
                p.adultConsent = boolean(b.adultAcknowledged);
            }
            if (this.opts.requireAdultAck !== false && !p.adultConsent)
                this.remove(d, id, media);
            if (b.interests !== undefined)
                p.interests = text(b.interests, 200, true);
            if (!p.remember) {
                p.previous = null;
                p.favorites = [];
                if (p.recentRoomIds)
                    p.recentRoomIds = [];
            }
            return success({ updated: true });
        }
        if (command === 'room:create') {
            if (!keys(b, ['name', 'description', 'privacy', 'memory', 'maxMembers', 'roomMode', 'roomTag', 'country', 'password']))
                fail('invalid_room_create');
            if (d.rooms.length >= 1000 || d.rooms.filter(r => r.ownerId === id).length >= 10)
                fail('room_capacity', 409);
            const room = { id: randomUUID(), name: text(b.name, 80), description: text(b.description, 400, true), privacy: b.privacy === undefined ? 'public' : privacy(b.privacy) ? b.privacy : fail('invalid_privacy'), memory: b.memory === undefined ? false : boolean(b.memory), maxMembers: b.maxMembers === undefined ? 24 : num(b.maxMembers, 2, 50) ? b.maxMembers : fail('invalid_members_limit'), ownerId: id, hostId: null, moderators: [], invites: [], bans: [], members: [], councils: [], memories: [], activity: [], createdAt: now, updatedAt: now };
            for (const k of ['roomMode', 'roomTag', 'country'])
                if (Object.hasOwn(b, k))
                    room[k] = b[k];
            if (admission.protection)
                room.password = admission.protection;
            if (LEGACY_CANNON && this.opts.cannon && this.cannonCatalogReady())
                room.cannon = createCannon(id, now);
            d.rooms.push(room);
            this.enterRoom(d, room, id, media, now, { passwordVerifiedRoomId: room.id });
            this.activity(room, command, now);
            return success({ roomId: room.id });
        }
        if (command === 'room:leave') {
            const old = this.member(d, id);
            if (b.roomId !== undefined && old?.room.id !== b.roomId)
                fail('wrong_room', 403);
            if (old) {
                this.remove(d, id, media);
                this.activity(old.room, command, now);
            }
            return success({ left: true });
        }
        if (command === 'council:return') {
            const p = this.pref(d, id, false);
            if (!p?.previous)
                fail('previous_council_unavailable', 404);
            if (!keys(b, ['password']))
                fail('invalid_council_return');
            const r = this.room(d, p.previous.roomId), c = this.council(r, p.previous.councilId);
            this.enterCouncil(d, r, c, id, media, now, undefined, admission);
            this.activity(r, command, now);
            return success({ roomId: r.id, councilId: c.id });
        }
        if (command === 'council:leave') {
            const x = this.currentCouncil(d, id, b);
            this.previous(d, id, x.room, x.member.councilId);
            x.member.councilId = null;
            delete x.member.seatIndex;
            x.member.epoch = randomUUID();
            this.clearMic(x.room, id);
            media.add(id);
            this.activity(x.room, command, now);
            return success({ left: true, roomId: x.room.id });
        }
        if (command === 'chat:send' || command === 'mode:action' || command === 'report:send' || command === 'memory:propose') {
            const x = this.currentCouncil(d, id, b), { room: r, council: c, member: m } = x;
            const withdrawingR47 = command === 'mode:action' && SOCIAL_GAME_IDS.includes(b.mode) && isObj(b.action) && b.action.type === 'participate' && b.action.enabled === false;
            if (command !== 'report:send' && m.muted && !withdrawingR47)
                fail('member_muted', 403);
            if (command === 'chat:send' && !this.canChat(r, id))
                fail('chat_policy_denied', 403);
            if (command === 'mode:action' && b.mode === 'anonymous' && isObj(b.action)) {
                if (b.action.type === 'send' && !this.canChat(r, id))
                    fail('chat_policy_denied', 403);
                if (b.action.type === 'moderate')
                    this.requireMod(r, id, c, 'chat');
            }
            this.rate(d, id, now);
            if (command === 'chat:send') {
                const raw0 = text(b.text, 1000), masked = this.opts.maskChat ? this.opts.maskChat(raw0) : raw0;
                const message = { id: randomUUID(), actor: id, text: masked.slice(0, 1000) || raw0, at: now };
                c.chat.push(message);
                c.chat = c.chat.slice(-100);
                this.activity(r, command, now);
                return success({ messageId: message.id, roomId: r.id, councilId: c.id });
            }
            if (command === 'mode:action') {
                if (!SOCIAL_MODE_IDS.includes(b.mode) || !isObj(b.action) || typeof b.action.type !== 'string')
                    fail('invalid_mode_action');
                const mode = b.mode;
                if (!c.modeEnabled[mode] && !withdrawingR47)
                    fail('council_mode_disabled', 403);
                const out = SOCIAL_MODES[mode].apply(c.modes[mode], b.action, this.context(d, r, c, id, now));
                if (!out.ok)
                    fail(out.error, 400);
                if (mode === 'anonymous' && b.action.type === 'report') {
                    if (d.reports.length >= 10000)
                        fail('report_capacity', 409);
                    const report = c.modes.anonymous.reports.at(-1);
                    if (!report || report.actorId !== id)
                        fail('invalid_report_state', 503);
                    d.reports.push({ id: report.id, actor: id, targetType: 'anonymous', targetId: report.messageId, subjectId: report.message.senderId, roomId: r.id, councilId: c.id, text: report.reason, evidence: report.message.text, at: now, resolution: null });
                }
                if (mode === 'anonymous' && b.action.type === 'moderate')
                    this.audit(d, id, 'anonymous:hide', String(b.action.messageId), 'content-hidden', now, r.id);
                this.activity(r, command, now);
                return success({ event: out.event, roomId: r.id, councilId: c.id });
            }
            if (command === 'report:send') {
                if (d.reports.length >= 10000)
                    fail('report_capacity', 409);
                if (!['member', 'chat', 'anonymous', 'council'].includes(b.targetType) || !ident(b.targetId))
                    fail('invalid_report_target');
                let targetId = b.targetId, subjectId = null, evidence = null;
                if (b.targetType === 'member') {
                    subjectId = this.target(d, b.targetId);
                    if (!r.members.some(m => m.id === subjectId && m.councilId === c.id))
                        fail('target_not_found', 404);
                    targetId = subjectId;
                }
                if (b.targetType === 'chat') {
                    const msg = c.chat.find(m => m.id === targetId);
                    if (!msg)
                        fail('target_not_found', 404);
                    subjectId = msg.actor;
                    evidence = msg.text;
                }
                if (b.targetType === 'anonymous') {
                    const messages = c.modes.anonymous.messages;
                    if (!Array.isArray(messages))
                        fail('target_not_found', 404);
                    const msg = messages.find((m) => m.id === targetId && !m.hidden);
                    if (!msg)
                        fail('target_not_found', 404);
                    subjectId = msg.senderId;
                    evidence = msg.text;
                }
                if (b.targetType === 'council' && targetId !== c.id)
                    fail('wrong_council', 403);
                const report = { id: randomUUID(), actor: id, targetType: b.targetType, targetId, subjectId, roomId: r.id, councilId: c.id, text: text(b.text, 1000), evidence, at: now, resolution: null };
                d.reports.push(report);
                return success({ reportId: report.id });
            }
            if (!r.memory)
                fail('room_memory_disabled', 403);
            if (r.memories.length >= 100)
                fail('memory_capacity', 409);
            const memory = { id: randomUUID(), councilId: c.id, authors: r.members.filter(m => m.councilId === c.id).map(m => m.id), approved: [], text: null, at: now };
            // Proposal text remains transient until explicit consent from ALL participant authors, including proposer.
            const proposal = text(b.text, 1000);
            this.pendingMemory.set(memory.id, proposal);
            r.memories.push(memory);
            this.activity(r, command, now);
            return success({ memoryId: memory.id });
        }
        if (command === 'memory:consent') {
            const r = d.rooms.find(r => r.memories.some(m => m.id === b.memoryId));
            if (!r)
                fail('memory_not_found', 404);
            if (!r.memory || !this.visibleRoom(r, id))
                fail('memory_access_denied', 403);
            const memory = r.memories.find(m => m.id === b.memoryId);
            if (!memory.authors.includes(id))
                fail('memory_author_required', 403);
            if (memory.text !== null)
                fail('memory_already_saved', 409);
            const proposal = this.pendingMemory.get(memory.id);
            if (!proposal)
                fail('memory_proposal_expired', 410);
            if (!boolean(b.approve)) {
                r.memories = r.memories.filter(m => m.id !== memory.id);
                this.activity(r, command, now);
                return success({ approved: false });
            }
            if (!memory.approved.includes(id))
                memory.approved.push(id);
            if (memory.authors.every(uid => memory.approved.includes(uid)))
                memory.text = proposal;
            this.activity(r, command, now);
            return success({ approved: true, memoryId: memory.id });
        }
        const r = this.room(d, b.roomId);
        if (command === 'room:join') {
            if (!keys(b, ['roomId', 'password']))
                fail('invalid_room_join');
            this.enterRoom(d, r, id, media, now, admission);
            this.activity(r, command, now);
            return success({ roomId: r.id });
        }
        if (!this.visibleRoom(r, id))
            fail('room_not_found', 404);
        /* R58: إعلانات الغرفة (حتى 10) — كل إعلان يمر على المراجعة التلقائية وينقبل فورًا إذا سليم */
        if (command === 'room:ads') {
            if (!keys(b, ['roomId', 'ads']) || !Array.isArray(b.ads) || b.ads.length > ROOM_ADS_MAX)
                fail('invalid_room_ads');
            this.requireMod(r, id, undefined, 'identity');
            const ads = [];
            for (const raw of b.ads) {
                if (typeof raw !== 'string')
                    fail('invalid_room_ads');
                const t = raw.trim().slice(0, 200);
                if (!t)
                    continue;
                if (this.opts.moderate) {
                    const m = this.opts.moderate(t, 'room-ad');
                    if (!m.ok)
                        fail(m.code, 422);
                }
                const old = (r.ads ?? []).find(a => a.text === t);
                ads.push(old ?? { id: randomUUID(), text: t, at: now });
            }
            if (ads.length)
                r.ads = ads;
            else
                delete r.ads;
            this.activity(r, command, now);
            return success({ roomId: r.id, updated: true });
        }
        /* R67: يوتيوب بالغرفة — المالك والمشرفين بس (بصلاحية «الهوية»). الكل يشوف نفس اللحظة. */
        if (command === 'video:set' || command === 'video:control' || command === 'video:off') {
            this.requireMod(r, id, undefined, 'identity');
            const pos = (v) => Math.max(0, v.paused ?? (now - v.base) / 1000);
            if (command === 'video:off') {
                if (!keys(b, ['roomId']))
                    fail('invalid_video');
                delete r.video;
                this.activity(r, command, now);
                return success({ roomId: r.id, updated: true });
            }
            if (command === 'video:set' && this.opts.cinemaOff?.())
                fail('cinema_disabled', 403);
            if (command === 'video:set') {
                if (!keys(b, ['roomId', 'vid']) || typeof b.vid !== 'string' || !YT_ID.test(b.vid))
                    fail('invalid_video');
                r.video = { vid: b.vid, by: id, base: now, paused: null, at: now };
                this.activity(r, command, now);
                return success({ roomId: r.id, updated: true });
            }
            if (!r.video)
                fail('video_not_playing', 409);
            if (!keys(b, ['roomId', 'action', 'position']) || !['play', 'pause', 'seek'].includes(String(b.action)) || (b.position !== null && (typeof b.position !== 'number' || !Number.isFinite(b.position) || b.position < 0 || b.position > 86400 * 2)))
                fail('invalid_video');
            const v = r.video, p = typeof b.position === 'number' ? b.position : pos(v);
            if (b.action === 'pause')
                v.paused = p;
            else if (b.action === 'play') {
                v.paused = null;
                v.base = Math.round(now - p * 1000);
            }
            else {
                if (v.paused !== null)
                    v.paused = p;
                else
                    v.base = Math.round(now - p * 1000);
            }
            v.at = now;
            this.activity(r, command, now);
            return success({ roomId: r.id, updated: true });
        }
        /* R58: أيدي غرفة مميز (من المتجر) — للمالك فقط، والرقم ما يتكرر بين الغرف */
        if (command === 'room:vanity') {
            if (!keys(b, ['roomId', 'itemId']))
                fail('invalid_room_vanity');
            if (r.ownerId !== id)
                fail('owner_required', 403);
            if (b.itemId === null) {
                delete r.vanity;
                delete r.vanityItem;
                this.activity(r, command, now);
                return success({ roomId: r.id, updated: true });
            }
            if (typeof b.itemId !== 'string')
                fail('invalid_room_vanity');
            const code = this.opts.roomIdItem?.(id, b.itemId);
            if (!code || !ROOM_VANITY.test(code))
                fail('room_vanity_not_owned', 403);
            if (d.rooms.some(x => x.id !== r.id && (x.vanity === code || roomCodeOf(x.id) === code)))
                fail('room_vanity_taken', 409);
            for (const x of d.rooms)
                if (x.id !== r.id && x.vanityItem === b.itemId && x.ownerId === id) {
                    delete x.vanity;
                    delete x.vanityItem;
                }
            r.vanity = code;
            r.vanityItem = b.itemId;
            this.activity(r, command, now);
            return success({ roomId: r.id, updated: true });
        }
        /* R55: صاحب الغرفة يحذف غرفته بنفسه — نفس حماية الإدارة: ما تنحذف وفيه جائزة مدفع معلّقة، ولا غرفة مربوطة بلعبة. */
        if (command === 'room:delete') {
            if (!keys(b, ['roomId']))
                fail('invalid_room_delete');
            if (r.ownerId !== id)
                fail('owner_required', 403);
            if (this.gameBound(d, r))
                fail('game_room_delete_unavailable', 403);
            if (r.cannon && this.cannonPendingFor(r.cannon) > 0)
                fail('cannon_award_pending', 409);
            for (const m of [...r.members])
                this.remove(d, m.id, media);
            d.rooms = d.rooms.filter(x => x.id !== r.id);
            for (const p of d.preferences) {
                if (p.followedRoomIds)
                    p.followedRoomIds = p.followedRoomIds.filter(x => x !== r.id);
                if (p.recentRoomIds)
                    p.recentRoomIds = p.recentRoomIds.filter(x => x !== r.id);
            }
            return success({ roomId: r.id, closed: true });
        }
        if (command === 'room:follow') {
            if (!this.directoryVisibleRoom(r, id))
                fail('room_not_found', 404);
            if (!keys(b, ['roomId', 'enabled']))
                fail('invalid_room_follow');
            const enabled = boolean(b.enabled), p = this.pref(d, id), followed = p.followedRoomIds ?? [];
            if (enabled && !followed.includes(r.id) && followed.length >= DIRECTORY_LIMIT_R30)
                fail('room_follow_capacity', 409);
            p.followedRoomIds = enabled ? followed.includes(r.id) ? [...followed] : [r.id, ...followed] : followed.filter(roomId => roomId !== r.id);
            return success({ roomId: r.id, followed: enabled });
        }
        if (command === 'room:upgrade') {
            const out = planRoomUpgradeR47({ actorId: id, room: r, config: d.config, gameBound: this.gameBound(d, r) }, b);
            if (!out.ok)
                fail(out.error, out.status);
            const c = this.council(r, out.intent.councilId);
            r.maxMembers = out.intent.to.maxMembers;
            c.seats = out.intent.to.seats;
            r.upgrade = out.intent.upgrade;
            this.audit(d, id, command, c.id, `free-capacity:${out.intent.preset}`, now, r.id);
            this.activity(r, command, now);
            return success({ updated: true, roomId: r.id, councilId: c.id });
        }
        if (command === 'room:update') {
            if (!keys(b, ['roomId', 'name', 'description', 'privacy', 'memory', 'maxMembers', 'settings', 'roomMode', 'roomTag', 'country', 'password']))
                fail('invalid_room_update');
            this.requireMod(r, id);
            if (b.name !== undefined || b.description !== undefined || ['roomMode', 'roomTag', 'country'].some(k => Object.hasOwn(b, k)))
                this.requireMod(r, id, undefined, 'identity');
            if (b.privacy !== undefined || b.maxMembers !== undefined || Object.hasOwn(b, 'password'))
                this.requireMod(r, id, undefined, 'entry');
            if (b.memory !== undefined)
                this.requireMod(r, id, undefined, 'chat');
            for (const k of ['roomMode', 'roomTag', 'country'])
                if (Object.hasOwn(b, k))
                    r[k] = b[k];
            if (Object.hasOwn(b, 'password')) {
                if (this.gameBound(d, r))
                    fail('game_room_password_unavailable', 403);
                if (admission.protection)
                    r.password = admission.protection;
                else
                    delete r.password;
            }
            if (b.name !== undefined)
                r.name = text(b.name, 80);
            if (b.description !== undefined)
                r.description = text(b.description, 400, true);
            if (b.privacy !== undefined && b.privacy !== 'private' && d.receipts.some(x => x.command === 'game:bind' && x.key === r.id))
                fail('game_voice_private_required', 403);
            if (b.privacy !== undefined)
                r.privacy = privacy(b.privacy) ? b.privacy : fail('invalid_privacy');
            if (b.memory !== undefined) {
                r.memory = boolean(b.memory);
                if (!r.memory)
                    r.memories = [];
            }
            if (b.maxMembers !== undefined) {
                if (!num(b.maxMembers, 2, 50) || b.maxMembers < r.members.length)
                    fail('invalid_members_limit');
                r.maxMembers = b.maxMembers;
            }
            if (b.settings !== undefined) {
                if (!validSettings(b.settings))
                    fail('invalid_room_settings');
                const patch = b.settings, before = this.settings(r);
                if (Object.hasOwn(patch, 'moderatorPermissions') && r.ownerId !== id)
                    fail('owner_required', 403);
                if (Object.hasOwn(patch, 'luckyBag') && r.ownerId !== id)
                    fail('owner_required', 403);
                if (Object.hasOwn(patch, 'theme')) {
                    this.requireMod(r, id, undefined, 'identity');
                    if (this.gameBound(d, r))
                        fail('game_room_controls_unavailable', 403);
                    const th = String(patch.theme);
                    if (th !== before.theme) {
                        const need = ROOM_BG_LEVEL[th];
                        if (need && roomLevelOf(r.support ?? 0).level < need)
                            fail('room_bg_level_locked', 403);
                        const item = ROOM_BG_STORE[th];
                        if (item && !(this.opts.ownsItem?.(id, item) || this.opts.ownsItem?.(r.ownerId, item)))
                            fail('room_bg_not_owned', 403);
                    }
                }
                if (['highQuality', 'micRequests', 'speak'].some(k => Object.hasOwn(patch, k)))
                    this.requireMod(r, id, undefined, 'audio');
                if (Object.hasOwn(patch, 'chat'))
                    this.requireMod(r, id, undefined, 'chat');
                r.settings = { ...r.settings, ...patch, ...(patch.moderatorPermissions ? { moderatorPermissions: { ...r.settings?.moderatorPermissions, ...patch.moderatorPermissions } } : {}) };
                const after = this.settings(r);
                if (before.micRequests !== after.micRequests) {
                    r.micRequests = [];
                    r.micApprovals = [];
                }
                if (before.highQuality !== after.highQuality || before.micRequests !== after.micRequests || before.speak !== after.speak || before.moderatorPermissions.audio !== after.moderatorPermissions.audio)
                    this.revokeAudio(r, media);
            }
            this.audit(d, id, command, r.id, 'room-settings', now, r.id);
        }
        else if (command === 'room:moderator') {
            if (r.ownerId !== id)
                fail('owner_required', 403);
            const t = this.peer(d, id, b.targetId);
            const enabled = boolean(b.enabled);
            const prior = this.moderator(r, t);
            r.moderators = r.moderators.filter(x => x !== t);
            if (enabled) {
                if (r.moderators.length >= 50)
                    fail('moderator_capacity', 409);
                r.moderators.push(t);
            }
            if (prior !== this.moderator(r, t))
                this.revokeAudio(r, media, t);
            this.audit(d, id, command, t, 'role-change', now, r.id);
        }
        else if (command === 'mic:request') {
            if (!keys(b, ['roomId']))
                fail('invalid_mic_request');
            const m = this.requireRoomMember(r, id);
            if (!m.councilId)
                fail('council_membership_required', 403);
            if (!this.settings(r).micRequests)
                fail('mic_requests_disabled', 403);
            if ((r.micApprovals ?? []).includes(id))
                fail('mic_already_approved', 409);
            r.micRequests ??= [];
            if (!r.micRequests.includes(id))
                r.micRequests.push(id);
            this.activity(r, command, now);
            return success({ requested: true, roomId: r.id });
        }
        else if (command === 'mic:approve') {
            if (!keys(b, ['roomId', 'targetId', 'approve']))
                fail('invalid_mic_approval');
            this.requireMod(r, id, undefined, 'audio');
            const t = this.target(d, b.targetId), m = this.requireRoomMember(r, t), approve = boolean(b.approve);
            if (!m.councilId)
                fail('council_membership_required', 403);
            if (!this.settings(r).micRequests)
                fail('mic_requests_disabled', 403);
            if (approve && !(r.micRequests ?? []).includes(t))
                fail('mic_request_not_found', 404);
            r.micRequests = (r.micRequests ?? []).filter(x => x !== t);
            r.micApprovals = (r.micApprovals ?? []).filter(x => x !== t);
            if (approve)
                r.micApprovals.push(t);
            this.revokeAudio(r, media, t);
            this.audit(d, id, command, t, approve ? 'mic-approved' : 'mic-revoked', now, r.id);
            this.activity(r, command, now);
            return success({ approved: approve, roomId: r.id });
        }
        else if (command === 'room:invite') {
            this.requireMod(r, id, undefined, 'entry');
            const t = this.peer(d, id, b.targetId);
            if (r.bans.some(b => b.id === t))
                fail('target_banned', 403);
            this.invite(d, id, t, r.invites);
        }
        else if (command === 'council:create') {
            this.requireRoomMember(r, id);
            if (r.councils.length >= 50 || r.councils.filter(c => c.ownerId === id).length >= 10)
                fail('council_capacity', 409);
            const kind = b.kind === undefined ? 'public' : kinds.includes(b.kind) ? b.kind : fail('invalid_kind');
            const p = b.privacy === undefined ? (kind === 'private' ? 'private' : 'public') : privacy(b.privacy) ? b.privacy : fail('invalid_privacy');
            if (kind === 'private' && p !== 'private')
                fail('invalid_privacy');
            const c = { id: randomUUID(), name: text(b.name, 80), description: text(b.description, 400, true), kind, privacy: p, ownerId: id, hostId: null, seats: this.seats(d, kind, b.seats), locked: false, allowRequests: b.allowRequests === undefined ? kind === 'private' : boolean(b.allowRequests), invites: [], requests: [], channel: randomUUID(), createdAt: now, modeEnabled: Object.fromEntries(SOCIAL_MODE_IDS.map(mode => [mode, true])), modes: Object.fromEntries(SOCIAL_MODE_IDS.map(mode => [mode, SOCIAL_MODES[mode].initial()])), chat: [] };
            r.councils.push(c);
            this.enterCouncil(d, r, c, id, media, now);
            this.activity(r, command, now);
            return success({ roomId: r.id, councilId: c.id });
        }
        else if (command === 'member:mute' || command === 'member:kick' || command === 'member:ban' || command === 'member:unban') {
            this.requireMod(r, id, undefined, 'moderation');
            const t = this.target(d, b.targetId);
            if (t === id || t === r.ownerId || r.moderators.includes(t) && r.ownerId !== id)
                fail('protected_member', 403);
            const m = r.members.find(m => m.id === t);
            if (!m && command !== 'member:ban' && command !== 'member:unban')
                fail('member_not_found', 404);
            const reason = command === 'member:ban' ? text(b.reason, 400) : text(b.reason, 400, true) || 'moderation';
            if (command === 'member:unban') {
                if (!r.bans.some(b => b.id === t))
                    fail('ban_not_found', 404);
                r.bans = r.bans.filter(b => b.id !== t);
            }
            else if (command === 'member:mute') {
                m.muted = boolean(b.muted);
                m.epoch = randomUUID();
                media.add(t);
            }
            else {
                if (m)
                    this.remove(d, t, media);
                if (command === 'member:ban' && !r.bans.some(b => b.id === t)) {
                    if (r.bans.length >= 500)
                        fail('ban_capacity', 409);
                    r.bans.push({ id: t, reason });
                }
                r.invites = r.invites.filter(x => x !== t);
                for (const c of r.councils) {
                    c.invites = c.invites.filter(x => x !== t);
                    c.requests = c.requests.filter(x => x !== t);
                }
            }
            this.audit(d, id, command, t, reason, now, r.id);
        }
        else {
            const c = this.council(r, b.councilId);
            if (command === 'council:join') {
                if (!keys(b, ['roomId', 'councilId', 'seatIndex', 'password']))
                    fail('invalid_council_join');
                if (Object.hasOwn(b, 'seatIndex')) {
                    if (this.gameBound(d, r))
                        fail('game_room_controls_unavailable', 403);
                    if (!validSeatIndex(b.seatIndex, c.seats))
                        fail('invalid_seat_index');
                }
                this.enterCouncil(d, r, c, id, media, now, b.seatIndex, admission);
                this.activity(r, command, now);
                return success({ roomId: r.id, councilId: c.id });
            }
            if (command === 'council:request') {
                this.requireRoomMember(r, id);
                if (!c.allowRequests)
                    fail('requests_disabled', 403);
                if (this.blocked(id, c.ownerId))
                    fail('target_unavailable', 403);
                if (r.members.some(m => m.id === id && m.councilId === c.id))
                    fail('already_joined', 409);
                if (!c.requests.includes(id)) {
                    if (c.requests.length >= 50)
                        fail('requests_capacity', 409);
                    c.requests.push(id);
                }
                this.activity(r, command, now);
                return success({ requested: true, roomId: r.id, councilId: c.id });
            }
            if (command === 'council:favorite') {
                const p = this.pref(d, id);
                if (!p.remember)
                    fail('remember_preference_required', 403);
                p.favorites = p.favorites.filter(f => f.councilId !== c.id);
                if (boolean(b.enabled)) {
                    if (p.favorites.length >= 50)
                        fail('favorite_capacity', 409);
                    p.favorites.push({ roomId: r.id, councilId: c.id });
                }
                return success({ favorite: b.enabled });
            }
            this.requireMod(r, id, c);
            if (command === 'council:invite') {
                this.requireMod(r, id, c, 'entry');
                const t = this.peer(d, id, b.targetId);
                this.requireRoomMember(r, t);
                if (r.bans.some(b => b.id === t))
                    fail('target_banned', 403);
                this.invite(d, id, t, c.invites);
            }
            else if (command === 'council:approve') {
                this.requireMod(r, id, c, 'audio');
                const t = this.peer(d, id, b.targetId);
                if (!c.requests.includes(t))
                    fail('request_not_found', 404);
                c.requests = c.requests.filter(x => x !== t);
                if (boolean(b.approve))
                    this.invite(d, id, t, c.invites);
            }
            else if (command === 'council:update') {
                if (!keys(b, ['roomId', 'councilId', 'name', 'description', 'locked', 'lockedSeats', 'allowRequests', 'privacy', 'seats']))
                    fail('invalid_council_update');
                if (b.name !== undefined || b.description !== undefined)
                    this.requireMod(r, id, c, 'identity');
                if (b.locked !== undefined || b.privacy !== undefined)
                    this.requireMod(r, id, c, 'entry');
                if (b.allowRequests !== undefined)
                    this.requireMod(r, id, c, 'audio');
                if (b.seats !== undefined || Object.hasOwn(b, 'lockedSeats'))
                    this.requireMod(r, id, c, 'seats');
                if (Object.hasOwn(b, 'lockedSeats') && this.gameBound(d, r))
                    fail('game_room_controls_unavailable', 403);
                if (b.name !== undefined)
                    c.name = text(b.name, 80);
                if (b.description !== undefined)
                    c.description = text(b.description, 400, true);
                if (b.locked !== undefined)
                    c.locked = boolean(b.locked);
                if (b.allowRequests !== undefined)
                    c.allowRequests = boolean(b.allowRequests);
                if (b.privacy !== undefined) {
                    if (!privacy(b.privacy) || c.kind === 'private' && b.privacy !== 'private')
                        fail('invalid_privacy');
                    c.privacy = b.privacy;
                }
                if (b.seats !== undefined || Object.hasOwn(b, 'lockedSeats')) {
                    const seats = b.seats === undefined ? c.seats : this.seats(d, c.kind, b.seats), members = r.members.filter(m => m.councilId === c.id);
                    const layout = councilSeatLayout(c, members);
                    if (!layout)
                        throw new Error('social_seat_shape_invalid');
                    if ([...layout.values()].some(index => index >= seats))
                        fail('seats_occupied', 409);
                    const locked = Object.hasOwn(b, 'lockedSeats') ? b.lockedSeats : c.lockedSeats ?? [];
                    if (!validLockedSeats(locked, seats))
                        fail('invalid_locked_seats');
                    if ([...layout.values()].some(index => locked.includes(index)))
                        fail('seats_occupied', 409);
                    c.seats = seats;
                    if (Object.hasOwn(b, 'lockedSeats'))
                        c.lockedSeats = [...locked].sort((a, b) => a - b);
                }
                this.audit(d, id, command, c.id, 'council-settings', now, r.id);
            }
            else if (command === 'council:close') {
                this.requireMod(r, id, c, 'moderation');
                this.closeCouncil(d, r, c, media);
                this.audit(d, id, command, c.id, 'council-close', now, r.id);
            }
            else if (command === 'mode:set') {
                this.requireMod(r, id, c, 'chat');
                if (!SOCIAL_MODE_IDS.includes(b.mode))
                    fail('invalid_mode');
                c.modeEnabled[b.mode] = boolean(b.enabled);
            }
            else
                fail('unknown_command', 404);
        }
        this.activity(r, command, now);
        return success({ updated: true, roomId: r.id });
    }
    closeCouncil(d, r, c, media) { if (r.challenge?.councilId === c.id && r.challenge.status === 'active') {
        r.challenge.status = 'cancelled';
        r.challenge.endedAt = Math.min(this.clock(), r.challenge.endsAt);
        r.challenge.winner = null;
    } for (const m of r.members.filter(m => m.councilId === c.id)) {
        this.previous(d, m.id, r, c.id);
        m.councilId = null;
        delete m.seatIndex;
        m.epoch = randomUUID();
        this.clearMic(r, m.id);
        media.add(m.id);
    } r.councils = r.councils.filter(x => x.id !== c.id); this.hosts(r); }
    async admin(actorId, command, body = {}) {
        // Platform authorization is deliberately the parent route's responsibility, never inferred from social ownership.
        return this.serial(() => this.guard(async () => {
            this.ready();
            if (!ident(actorId) || !this.opts.profile(actorId) && this.opts.trustedAdmin?.(actorId) !== true)
                fail('authentication_required', 401);
            if (command === 'stats')
                return { ok: true, counts: { rooms: this.state.rooms.length, councils: this.state.rooms.reduce((n, r) => n + r.councils.length, 0), members: this.state.rooms.reduce((n, r) => n + r.members.length, 0), content: this.state.config.content.cards.length, reports: this.state.reports.length, pendingReports: this.state.reports.filter(r => r.resolution === null).length }, config: structuredClone(this.state.config), rooms: this.state.rooms.map(r => ({ id: r.id, name: r.name, privacy: r.privacy, level: roomLevelOf(r.support ?? 0).level, support: r.support ?? 0, theme: this.settings(r).theme, video: r.video ? { vid: r.video.vid, playing: r.video.paused === null } : null, owner: this.who(r.ownerId), moderators: r.moderators.map(id => this.who(id)), members: r.members.length, councils: r.councils.map(c => ({ id: c.id, name: c.name, kind: c.kind, seats: c.seats, members: r.members.filter(m => m.councilId === c.id).length })) })), audit: this.state.audit.slice(-100).map(a => ({ id: a.id, actor: this.who(a.actor), action: a.action, targetId: a.targetId, reason: a.reason, at: a.at })) };
            if (command === 'reports:list')
                return { ok: true, reports: this.state.reports.slice(-500).map(r => ({ ...r, actor: this.who(r.actor), subject: r.subjectId ? this.who(r.subjectId) : null })) };
            if (!isObj(body) || !jsonSafe(body) || Buffer.byteLength(canonical(body)) > 200000 || !ident(body.key) || body.key.length > 96)
                fail('idempotency_key_required');
            const b = Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'key' && k !== 'command')), fp = createHash('sha256').update(canonical(b)).digest('hex');
            const old = this.state.receipts.find(r => r.admin && r.actor === actorId && r.command === command && r.key === body.key);
            if (old) {
                if (old.fingerprint !== fp)
                    fail('idempotency_key_conflict', 409);
                return structuredClone(old.result);
            }
            if (this.state.receipts.length >= this.maxReceipts)
                fail('idempotency_capacity', 409);
            return this.tx((d, media, now) => {
                let targetId = 'config', roomId;
                const reason = text(b.reason, 400, true) || 'platform-admin';
                if (command === 'config:update') {
                    if (b.enabled !== undefined) {
                        d.config.enabled = boolean(b.enabled);
                        if (!d.config.enabled)
                            for (const r of d.rooms)
                                for (const m of [...r.members])
                                    this.remove(d, m.id, media);
                    }
                    if (b.maxCouncilSeats !== undefined) {
                        if (!num(b.maxCouncilSeats, 2, 12) || d.rooms.some(r => r.councils.some(c => c.seats > b.maxCouncilSeats)))
                            fail('invalid_max_seats');
                        d.config.maxCouncilSeats = b.maxCouncilSeats;
                    }
                    if (b.defaultCouncilSeats !== undefined) {
                        if (!num(b.defaultCouncilSeats, 2, d.config.maxCouncilSeats))
                            fail('invalid_default_seats');
                        d.config.defaultCouncilSeats = b.defaultCouncilSeats;
                    }
                    else
                        d.config.defaultCouncilSeats = Math.min(d.config.defaultCouncilSeats, d.config.maxCouncilSeats);
                    if (b.content !== undefined) {
                        if (!isObj(b.content) || !validSocialContent(b.content))
                            fail('invalid_content');
                        d.config.content = hydrateSocialContentR47(b.content);
                    }
                    if (b.cards !== undefined) {
                        const content = { ...d.config.content, cards: b.cards };
                        if (!validSocialContent(content))
                            fail('invalid_content');
                        d.config.content = structuredClone(content);
                    }
                    if (b.mode !== undefined) {
                        if (!SOCIAL_MODE_IDS.includes(b.mode) || !isObj(b.settings))
                            fail('invalid_mode_settings');
                        const mode = b.mode;
                        const content = structuredClone(d.config.content);
                        content.settings[mode] = { ...content.settings[mode], ...b.settings };
                        if (!validSocialContent(content))
                            fail('invalid_content');
                        d.config.content = content;
                    }
                }
                else if (command === 'report:resolve') {
                    const report = d.reports.find(r => r.id === b.reportId);
                    if (!report)
                        fail('report_not_found', 404);
                    report.resolution = text(b.resolution, 400);
                    targetId = report.id;
                }
                else {
                    const r = this.room(d, b.roomId);
                    targetId = r.id;
                    roomId = r.id;
                    if (command === 'room:close') {
                        if (r.cannon && this.cannonPendingFor(r.cannon) > 0)
                            fail('cannon_award_pending', 409);
                        for (const m of [...r.members])
                            this.remove(d, m.id, media);
                        d.rooms = d.rooms.filter(x => x.id !== r.id);
                    }
                    else if (command === 'room:video-off') {
                        if (!r.video)
                            fail('video_not_playing', 409);
                        delete r.video;
                        this.activity(r, 'video:off', now);
                    }
                    else if (command === 'room:theme-reset') {
                        r.settings = { ...r.settings, theme: defaultRoomSettings().theme };
                        this.activity(r, 'room:update', now);
                    }
                    else if (command === 'council:close') {
                        const c = this.council(r, b.councilId);
                        targetId = c.id;
                        this.closeCouncil(d, r, c, media);
                        this.activity(r, command, now);
                    }
                    else if (command === 'room:owner') {
                        const t = this.target(d, b.targetId);
                        if (this.opts.eligible(t) !== true || r.bans.some(b => b.id === t))
                            fail('target_unavailable', 403);
                        r.ownerId = t;
                        r.moderators = r.moderators.filter(x => x !== t);
                        this.revokeAudio(r, media);
                        this.activity(r, command, now);
                        targetId = t;
                    }
                    else if (command === 'room:moderator') {
                        const t = this.target(d, b.targetId);
                        if (t === r.ownerId)
                            fail('protected_member', 403);
                        const prior = this.moderator(r, t);
                        r.moderators = r.moderators.filter(x => x !== t);
                        if (boolean(b.enabled)) {
                            if (r.moderators.length >= 50)
                                fail('moderator_capacity', 409);
                            r.moderators.push(t);
                        }
                        if (prior !== this.moderator(r, t))
                            this.revokeAudio(r, media, t);
                        this.activity(r, command, now);
                        targetId = t;
                    }
                    else
                        fail('unknown_admin_command', 404);
                }
                this.audit(d, actorId, command, targetId, reason, now, roomId);
                const result = { ok: true, updated: true };
                d.receipts.push({ actor: actorId, command, key: body.key, fingerprint: fp, result, at: now, admin: true });
                return result;
            });
        }));
    }
    async connect(userId) {
        return this.serial(() => this.guard(async () => {
            this.ready();
            this.actor(userId);
            const now = this.clock(), x = this.member(this.state, userId);
            if (x) {
                const result = await this.tx((d, media) => { const m = this.member(d, userId); const deadline = this.failedDisconnects.get(userId) ?? m.member.deadline; if (deadline !== null && deadline <= now)
                    this.remove(d, userId, media);
                else
                    m.member.deadline = null; return { ok: true }; });
                if (!result.ok)
                    return result;
            }
            this.failedDisconnects.delete(userId);
            this.connections.set(userId, (this.connections.get(userId) ?? 0) + 1);
            return { ok: true };
        }));
    }
    async disconnect(userId) {
        return this.serial(() => this.guard(async () => {
            this.ready();
            if (!ident(userId))
                fail('invalid_user');
            const count = this.connections.get(userId) ?? 0;
            if (count > 1) {
                this.connections.set(userId, count - 1);
                return { ok: true };
            }
            if (count === 0)
                return { ok: true };
            this.connections.delete(userId);
            const x = this.member(this.state, userId);
            if (x) {
                const deadline = x.member.deadline ?? this.clock() + this.grace;
                this.failedDisconnects.set(userId, deadline);
                const result = await this.tx((d, media) => { const m = this.member(d, userId); m.member.deadline = deadline; media.add(userId); return { ok: true }; });
                this.failedDisconnects.delete(userId);
                return result;
            }
            return { ok: true };
        }));
    }
    async repairDisconnects() {
        if (!this.failedDisconnects.size)
            return;
        await this.tx((d, media) => { for (const [id, deadline] of this.failedDisconnects) {
            const x = this.member(d, id);
            if (x) {
                x.member.deadline = x.member.deadline === null ? deadline : Math.min(deadline, x.member.deadline);
                media.add(id);
            }
        } return { ok: true }; });
        this.failedDisconnects.clear();
    }
    finalizeChallenges(now = this.clock()) {
        const due = this.state.rooms.filter(r => r.challenge?.status === 'active' && r.challenge.endsAt <= now && !this.challengePending(r.challenge.id));
        if (!due.length)
            return;
        const before = this.state, d = structuredClone(before);
        for (const r of d.rooms)
            if (due.some(x => x.id === r.id)) {
                finishChallenge(r.challenge);
                r.updatedAt = now;
            }
        this.save(d, now);
        this.state = d;
        this.notice(before, d);
    }
    async sweep(now = this.clock()) {
        return this.serial(() => this.guard(async () => {
            this.ready();
            if (!nat(now))
                fail('invalid_clock');
            await this.repairDisconnects();
            this.finalizeChallenges(now);
            this.reconcileCannonAwardsInternal();
            const expired = this.state.rooms.flatMap(r => r.members).filter(m => m.deadline !== null && m.deadline <= now || this.opts.eligible(m.id) !== true);
            if (expired.length)
                return this.tx((d, media) => { for (const m of expired) {
                    const x = this.member(d, m.id);
                    this.remove(d, m.id, media);
                    if (x)
                        this.activity(x.room, 'member:expired', now);
                } return { ok: true, updated: true }; });
            // Reuse the host's existing sweep; idle sweeps do not write or bump versions.
            const probe = structuredClone(this.state);
            if (this.advanceGamesR47(probe, now))
                return this.tx(d => { this.advanceGamesR47(d, now); return { ok: true, updated: true }; });
            await this.deliverAudit();
            return { ok: true };
        }));
    }
    who(id) {
        const p = this.opts.profile(id);
        if (!p)
            return null;
        const r = p.ranks;
        const ranks = r ? { level: num(r.level, 1, 100) ? r.level : null, vip: num(r.vip, 0, 15) ? r.vip : null, noble: num(r.noble, 0, 9) ? r.noble : null, ...(r.nameOff === true ? { nameOff: true } : {}), ...(r.official === true ? { official: true } : {}) } : undefined;
        const frame = typeof p.frame === 'string' && /^[A-Za-z_][A-Za-z0-9_-]{0,79}$/.test(p.frame) ? p.frame : null;
        const cosmetic = (v) => typeof v === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(v) ? v : null;
        const bubble = cosmetic(p.bubble), board = cosmetic(p.board), micFrame = cosmetic(p.micFrame);
        // R57: مركبات الدخول من كتالوج الخادم فقط (المسار لازم يطابق صورة العنصر نفسه)
        const entranceOk = !!p.entrance && ENTRANCE_ART_PATHS[p.entrance.id] === p.entrance.art;
        return { id: p.publicId ?? p.id, name: p.name, ...(p.avatar ? { avatar: p.avatar } : {}), ...(frame ? { frame } : {}), ...(bubble ? { bubble } : {}), ...(board ? { board } : {}), ...(micFrame ? { micFrame } : {}), ...(ranks ? { ranks } : {}), ...(entranceOk ? { entrance: { id: p.entrance.id, name: p.entrance.name, art: p.entrance.art } } : {}), ...(p.stealth === true ? { stealth: true } : {}) };
    }
    role(r, id, c) { return r.ownerId === id ? 'owner' : r.moderators.includes(id) ? 'moderator' : c?.ownerId === id ? 'council-owner' : c?.hostId === id ? 'council-host' : r.hostId === id ? 'host' : 'member'; }
    memberView(r, m, viewer, c) {
        if (this.blocked(viewer, m.id))
            return null;
        const who = this.who(m.id), seatCouncil = m.councilId ? this.council(r, m.councilId) : null;
        const seatVisible = seatCouncil && (seatCouncil.privacy === 'public' || r.members.some(peer => peer.id === viewer && peer.councilId === seatCouncil.id));
        return who ? { ...who, seatIndex: seatVisible ? this.memberSeat(r, m) : null, joinedAt: m.joinedAt, muted: m.muted, connected: (this.connections.get(m.id) ?? 0) > 0, role: this.role(r, m.id, c), ...(this.pref(this.state, m.id, false)?.interests ? { interests: this.pref(this.state, m.id, false).interests } : {}) } : null;
    }
    /** R58f: الغرفة اللي فيها الصديق الحين، بس إذا الغرفة ظاهرة للمشاهد وما بينهم حظر */
    friendRoom(viewer, target) {
        try {
            const x = this.member(this.state, target);
            if (!x || (x.member.deadline !== null && x.member.deadline <= this.clock()))
                return null;
            const r = x.room;
            if (this.blocked(viewer, target) || !this.directoryVisibleRoom(r, viewer))
                return null;
            return { id: r.id, name: r.name, code: this.roomCode(r), photo: this.photo(r), count: r.members.length, tier: roomRankView(r.month, this.clock()).tier, locked: !!r.password || r.privacy !== 'public' };
        }
        catch {
            return null;
        }
    }
    current(id) { const x = this.member(this.state, id); if (!x || !this.directoryVisibleRoom(x.room, id) || x.member.deadline !== null && x.member.deadline <= this.clock())
        return null; const muted = this.audioMuted(x.room, x.member); return { roomId: x.room.id, councilId: x.member.councilId, seatIndex: this.memberSeat(x.room, x.member), muted, serverMuted: x.member.muted, canSpeak: !muted && !!x.member.councilId, micRequested: (x.room.micRequests ?? []).includes(id), micApproved: (x.room.micApprovals ?? []).includes(id) }; }
    photo(r) { return r.cover ? `/api/social/rooms/${r.id}/cover?v=${r.cover}` : null; }
    privateWho(id) { const p = this.who(id); return p && p.id !== id ? p : null; }
    publicPerson(id) { const p = this.who(id); return p && p.id !== id ? { id: p.id, name: p.name } : null; }
    auditView(r) {
        // Old member-target outbox records have no unambiguous room scope: never guess.
        return this.state.audit.filter(a => a.roomId === r.id || a.roomId === undefined && (a.targetId === r.id || r.councils.some(c => c.id === a.targetId))).slice(-100).map(a => ({ id: a.id, action: a.action, actor: this.publicPerson(a.actor), target: this.publicPerson(a.targetId), reason: a.reason, at: a.at }));
    }
    /** Only identity fields in already allowlisted module views are mapped. Never inspect/project private raw state. */
    modeProjection(value, key = '') {
        if (['senderId', 'actorId', 'memberId', 'seatedId', 'nextParticipantId', 'matchedBy'].includes(key) && typeof value === 'string')
            return this.who(value)?.id ?? null;
        if (Array.isArray(value))
            return ['queue', 'participants'].includes(key) ? value.map(id => typeof id === 'string' ? this.who(id)?.id ?? null : null).filter(Boolean) : value.map(v => this.modeProjection(v));
        if (isObj(value))
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.modeProjection(v, k)]));
        return value;
    }
    visibleRoomIds(id) { return new Set(this.state.rooms.filter(r => this.directoryVisibleRoom(r, id)).map(r => r.id)); }
    visibleCouncilRef(id, value) {
        const r = this.state.rooms.find(r => r.id === value.roomId), c = r?.councils.find(c => c.id === value.councilId);
        return !!r && !!c && this.directoryVisibleRoom(r, id) && !this.blocked(id, c.ownerId) && (c.privacy === 'public' || c.invites.includes(id) || this.councilMod(r, c, id) || r.members.some(m => m.id === id && m.councilId === c.id && (m.deadline === null || m.deadline > this.clock())));
    }
    directoryView(id, visible = this.visibleRoomIds(id)) {
        const p = this.pref(this.state, id, false);
        return { recent: (p?.remember ? p.recentRoomIds ?? [] : []).filter(roomId => visible.has(roomId)), followed: (p?.followedRoomIds ?? []).filter(roomId => visible.has(roomId)), joined: this.state.rooms.filter(r => visible.has(r.id) && r.members.some(m => m.id === id && (m.deadline === null || m.deadline > this.clock()))).map(r => r.id), owned: this.state.rooms.filter(r => visible.has(r.id) && r.ownerId === id).map(r => r.id) };
    }
    directoryRoomView(r) { return { roomMode: r.roomMode ?? 'normal', roomTag: r.roomTag ?? '', country: r.country ?? '', hasPassword: !!r.password, ...this.roomExtrasView(r) }; }
    prefsView(id) { const p = this.pref(this.state, id, false), directory = this.directoryView(id); return p ? { invitations: p.invitations, interests: p.interests, remember: p.remember, adultConsent: p.adultConsent, adultAcknowledged: p.adultConsent, favorites: p.favorites.filter(f => this.visibleCouncilRef(id, f)).map(f => ({ ...f })), previous: p.previous && this.visibleCouncilRef(id, p.previous) ? { ...p.previous } : null, recentRoomIds: directory.recent, followedRoomIds: directory.followed } : { invitations: true, interests: '', remember: false, adultConsent: false, adultAcknowledged: false, favorites: [], previous: null, recentRoomIds: [], followedRoomIds: [] }; }
    councilView(r, c, id) {
        const joined = r.members.some(m => m.id === id && m.councilId === c.id), mod = this.councilMod(r, c, id), members = r.members.filter(m => m.councilId === c.id);
        const accessible = !this.blocked(id, c.ownerId) && !members.some(m => m.id !== id && this.blocked(id, m.id));
        const layout = councilSeatLayout(c, members), occupied = new Set(layout?.values()), lockedSeats = c.lockedSeats ?? [];
        const available = Array.from({ length: c.seats }, (_, i) => i).some(i => !occupied.has(i) && !lockedSeats.includes(i));
        const canJoin = accessible && available && (!(c.locked || c.privacy === 'private') || c.invites.includes(id) || mod) || joined;
        const content = joined ? { chat: c.chat.filter(m => !this.blocked(id, m.actor)).map(m => ({ id: m.id, author: this.who(m.actor), text: m.text, at: m.at })), modes: Object.fromEntries(SOCIAL_MODE_IDS.map(mode => [mode, c.modeEnabled[mode] && this.state.config.content.settings[mode].enabled ? this.modeProjection(SOCIAL_MODES[mode].view(c.modes[mode], this.context(this.state, r, c, id, this.clock()))) : null])) } : {};
        // room-tools-r33: public projection
        const tools = joined && accessible && !this.gameBound(this.state, r) ? projectRoomToolsR33(c.tools, this.toolContextR33(this.state, r, c, id, this.clock())) : null;
        // Aggregate occupancy has no identity fields. Never add positions to a private outsider's view.
        const seatOccupancy = c.privacy === 'public' || joined ? { occupiedSeats: [...occupied].sort((a, b) => a - b) } : {};
        return { id: c.id, name: c.name, description: c.description, kind: c.kind, privacy: c.privacy, seats: c.seats, locked: c.locked, lockedSeats: [...lockedSeats], ...seatOccupancy, allowRequests: c.allowRequests, owner: this.blocked(id, c.ownerId) ? null : this.who(c.ownerId), host: c.hostId && !this.blocked(id, c.hostId) && (c.privacy === 'public' || joined) ? this.who(c.hostId) : null, count: members.length, members: c.privacy === 'public' || joined ? members.map(m => this.memberView(r, m, id, c)).filter(Boolean) : [], joined, canJoin, canRequest: !joined && accessible && c.allowRequests, ...(mod && (r.ownerId === id || this.settings(r).moderatorPermissions.audio) ? { requests: c.requests.map(uid => this.who(uid)).filter(Boolean) } : {}), modeEnabled: structuredClone(c.modeEnabled), capacityUpgrade: projectRoomUpgradeR47({ actorId: id, room: r, config: this.state.config, gameBound: this.gameBound(this.state, r) }, c.id), ...content, ...(tools ? { tools } : {}) };
    }
    /** Independent allowlisted public gift target, NEVER a synthetic current membership.
     * No room member list, council private fields, mode/chat/channel or photo-byte access. */
    publicSupportView(r, viewer) {
        const councils = [];
        let access = null;
        if (r.privacy === 'public' && !this.gameBound(this.state, r))
            for (const c of r.councils) {
                if (c.privacy !== 'public')
                    continue;
                const recipients = [];
                for (const m of r.members) {
                    if (m.councilId !== c.id || m.id === viewer)
                        continue;
                    try {
                        const kind = this.giftAccess(viewer, r.id, c.id, [m.id], true), person = this.privateWho(m.id), seatIndex = this.memberSeat(r, m);
                        if (!person || seatIndex === null)
                            continue;
                        recipients.push({ id: person.id, name: person.name, ...(person.frame ? { frame: person.frame } : {}), ...(person.ranks ? { ranks: person.ranks } : {}), seatIndex, giftEligible: true });
                        // "seated" describes real membership only, never a target selection.
                        access = kind === 'seated' ? 'seated' : access ?? kind;
                    }
                    catch { /* inaccessible/stale targets are not projected */ }
                }
                if (recipients.length)
                    councils.push({ id: c.id, name: c.name, recipients: recipients.sort((a, b) => a.seatIndex - b.seatIndex) });
            }
        return { available: councils.length > 0, access, requiresSeat: false, grantsMembership: false, grantsAudio: false, councils };
    }
    async list(userId) {
        return this.serial(() => this.guard(() => {
            this.ready();
            this.actor(userId);
            const visible = this.visibleRoomIds(userId);
            return { ok: true, rooms: this.state.rooms.filter(r => visible.has(r.id)).sort((a, b) => Number(roomLevelOf(b.support ?? 0).level >= 100) - Number(roomLevelOf(a.support ?? 0).level >= 100)).map(r => ({ id: r.id, mine: r.ownerId === userId, name: r.name, description: r.description, photo: this.photo(r), privacy: r.privacy, memory: r.memory, maxMembers: r.maxMembers, ...this.directoryRoomView(r), owner: this.who(r.ownerId), host: r.hostId && !this.blocked(userId, r.hostId) ? this.who(r.hostId) : null, count: r.members.length, councils: r.councils.length, joined: r.members.some(m => m.id === userId && (m.deadline === null || m.deadline > this.clock())), createdAt: r.createdAt, updatedAt: r.updatedAt })), directory: this.directoryView(userId, visible), current: this.current(userId), preferences: this.prefsView(userId), config: { enabled: this.state.config.enabled, requireAdultAck: this.opts.requireAdultAck !== false, minimumAge: 18, ageVerification: 'parent-eligibility-hook-plus-self-acknowledgement', maxCouncilSeats: this.state.config.maxCouncilSeats, defaultCouncilSeats: this.state.config.defaultCouncilSeats, modes: structuredClone(this.state.config.content.settings), capabilities: directoryCapabilitiesR30() } };
        }));
    }
    async detail(userId, roomId) {
        return this.serial(() => this.guard(() => {
            this.ready();
            this.actor(userId);
            this.finalizeChallenges();
            let r = this.room(this.state, roomId);
            if (!this.visibleRoom(r, userId))
                fail('room_not_found', 404);
            const member = r.members.some(m => m.id === userId && (m.deadline === null || m.deadline > this.clock())), privileged = this.moderator(r, userId);
            if (member && this.state.config.enabled && this.opts.eligible(userId) && !this.transitioning.has(userId) && !this.failedDisconnects.has(userId)) {
                this.ensureCannon(roomId);
                r = this.room(this.state, roomId);
            }
            // Full room preview stays unchanged; public gift targets use their independent allowlist below.
            const permissions = this.permissions(r, userId);
            const base = { id: r.id, name: r.name, description: r.description, photo: this.photo(r), settings: this.settings(r), permissions, privacy: r.privacy, memory: r.memory, maxMembers: r.maxMembers, ...this.directoryRoomView(r), owner: this.who(r.ownerId), host: r.hostId && !this.blocked(userId, r.hostId) ? this.who(r.hostId) : null, createdAt: r.createdAt, updatedAt: r.updatedAt, count: r.members.length, role: this.role(r, userId) };
            const room = { ...base, moderators: member || privileged ? r.moderators.map(id => this.who(id)) : [], members: member ? r.members.map(m => this.memberView(r, m, userId)).filter(Boolean) : [], councils: member ? r.councils.map(c => this.councilView(r, c, userId)) : [], memories: member ? r.memories.filter(m => m.text !== null || m.authors.includes(userId)).map(m => ({ id: m.id, councilId: m.councilId, text: m.text ?? this.pendingMemory.get(m.id) ?? null, saved: m.text !== null, authors: m.authors.map(uid => this.who(uid)), approved: m.approved.map(uid => this.who(uid)), at: m.at })) : [], activity: member ? structuredClone(r.activity) : [], ...(permissions.audio ? { microphoneRequests: (r.micRequests ?? []).map(id => this.privateWho(id)).filter(Boolean), microphoneApprovals: (r.micApprovals ?? []).map(id => this.privateWho(id)).filter(Boolean) } : {}), ...(permissions.moderation ? { mutedMembers: r.members.filter(m => m.muted).map(m => this.privateWho(m.id) ? this.memberView(r, m, userId) : null).filter(Boolean), bannedMembers: r.bans.map(b => { const who = this.privateWho(b.id); return who ? { ...who, reason: b.reason } : null; }).filter(Boolean) } : {}), ...(permissions.audit ? { audit: this.auditView(r) } : {}) };
            return { ok: true, room: { ...room, cannon3: this.cannon3View(r, userId), rocket: this.rocketView(r), supporters: this.supportersView(r), cannon: member ? this.cannonView(r, userId) : null, challenge: member ? this.challengeView(r, userId) : null, supportEvents: member ? (this.state.supportEvents ?? []).map(e => this.supportEventView(e, userId)).filter(Boolean) : [], rankStats: privileged ? this.rankStatsView(r, userId) : null }, publicSupport: this.publicSupportView(r, userId), current: this.current(userId), preferences: this.prefsView(userId) };
        }));
    }
    mediaAccess(userId) {
        try {
            if (this.transitioning.has(userId) || this.failedDisconnects.has(userId))
                return null;
            this.ready();
            this.actor(userId, true);
            const x = this.member(this.state, userId);
            if (!x?.member.councilId || x.member.deadline !== null && x.member.deadline <= this.clock())
                return null;
            const c = this.council(x.room, x.member.councilId), p = this.opts.profile(userId);
            if (!p || x.room.bans.some(b => b.id === userId) || this.blocked(userId, x.room.ownerId) || this.blocked(userId, c.ownerId) || x.room.members.some(m => m.id !== userId && m.councilId === c.id && this.blocked(userId, m.id)))
                return null;
            return { roomId: x.room.id, councilId: c.id, channel: c.channel, epoch: x.member.epoch, muted: this.audioMuted(x.room, x.member), highQuality: this.settings(x.room).highQuality, name: p.name, id: p.id };
        }
        catch {
            return null;
        }
    }
}
