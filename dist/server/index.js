import { recordQuit, quitBlock } from './quit-guard-r68.js';
import { moderateText, maskBanned, profanityOnly, setExtraBannedWords, BANNED_WORDS_MAX } from './moderation-r58.js';
import { Economy, validEconomy, MANUAL_CONVERSION_DISABLED, MANUAL_CONVERSION_CLOSED_MESSAGE } from './economy.js';
import { GIFT_REWARD_POLICY, quoteGiftRewards } from './gift-rewards.js';
import { quoteGiftBatch } from './social-gift-batch-r27.js';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { timingSafeEqual, createHash, createHmac, randomInt, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GiftCatalog, GIFT_CATS, VIRTUAL_CATS, RARITY, validGiftOverrides } from './giftcatalog.js';
import { WebSocketServer } from 'ws';
import { createRegistry, GAME_CATEGORIES } from '../engine/registry.js';
import { VipMembership, validVipMembership } from './vip-membership.js';
import { wireRankVipRoutes } from './rank-vip-http.js';
import { loadConfig } from './config.js';
import { RoomService } from './rooms.js';
import { MemoryStore } from './store.js';
import { Leaderboard, validBoard } from './leaderboard.js';
import { Matchmaker } from './matchmaker.js';
import { MILESTONES, SLOTS, SETS, RARITIES } from './catalog.js';
import { CpPoints, cpKey, cpLevelOf, CP_TASKS, CP_LEVELS, CP_LEVEL_NAMES } from './cp-r58.js';
import { ROCKET_PLANETS } from './room-rocket-r58.js';
import { STAKE_OPTIONS, SiteFlagsStore } from './site-flags-r67.js';
import { roomOwnerGift } from './room-extras-r58.js';
import { AccountDeletion, DELETION_GRACE_MS } from './account-deletion-r67.js';
import { HomeBanners, HomeBannerError } from './home-banners-r68.js';
import { Broadcasts, BroadcastError, BROADCAST_PRICES, BROADCAST_TEXT_MAX, publicBroadcast } from './broadcast-r67.js';
import { TUNING_DEFAULT, currentTuning, validateTuning, applyTuning, isTuningError } from './tuning-r67.js';
import { CANNON3_LEVELS } from './room-cannon-r59.js';
import { Tribes, TribeError, TRIBE_ERR, TRIBE_ROOM_LEVEL, TRIBE_LEVELS, tribeLevelOf } from './tribes-r58.js';
import { TribeTreasure, TreasureError, TREASURE_ERR, TRIBE_TASKS, TRIBE_BOXES, TRIBE_SHOP, ROCKET_PRESTIGE, launchGrants, planetOfLaunch } from './tribe-treasure-r59.js';
import { achOf, achView, earned } from './achievements.js';
import { City, CityError, validCity } from './city.js';
import { ShopCatalog, validShop, shopEligibility } from './shopcatalog.js';
import { Wallet, STAKES, setStakes, validWallet } from './wallet.js';
import { PlayerActivity } from './player-activity-r68.js';
import { LuckyWheel, WHEEL_PAID_COST } from './wheel-r68.js';
import { Replays } from './replays-r68.js';
import { PhoneVerify, PhoneError } from './phone-verify-r68.js';
import { Platform, validPlatform } from './platform.js';
import { createAdmin } from './admin.js';
import { Accounts, validAccounts } from './account.js';
import { Avatars, AVATAR_MAX } from './avatars.js';
import { normalizeAvatar, ValidationError } from './avatar-validation.js';
import { dailyQuestions, challengeQuestions, cleanSeed } from './daily.js';
import { QUIZ_DEFS } from '../engine/quiz-games.js';
import { RETIRED_GAME_MESSAGE } from '../engine/retired-games.js';
import { ENTRANCE_ITEMS } from './entrance-catalog.js';
import { KeyedLimiter, TokenBucket } from './ratelimit.js';
import { cleanName, nameProblem, newUserId, sessionCookie, clearCookie } from './session.js';
import { Identities, validIdentities } from './identities.js';
import { Community, communityHttp, validCommunity } from './community.js';
import { checkDataFiles, DataFilesCorruptError, describeDataFailure, StorageMonitor, StorageError, STORAGE_MSG, Persister } from './datafile.js';
import { flushUnsaved, PendingWrites } from './shutdown.js';
import { googleKeyFetcher, verifyGoogleToken } from './google.js';
import { Progression, validProgression } from './progression.js';
import { AccountTools, validAccountTools } from './account-tools.js';
import { SocialPrivate, validSocialPrivate } from './social-private.js';
import { MissionsServer, validMissionsServer } from './missions-server.js';
import { RankRewards, validRankRewards } from './rank-rewards.js';
import { SupportNotifications, validSupportNotifications } from './support-notifications.js';
import { FunctionalOutbox, validFunctionalOutbox } from './functional-outbox.js';
import { validGiftSupportContext } from './social-challenge.js';
import { DataDirectoryLock } from './data-directory-lock.js';
import { SessionRegistry, validSessionRegistry, sessionTokenHash } from './session-registry.js';
import { FunctionalHttpError, FunctionalHttp } from './functional-http.js';
import { Payments, validPayments } from './payments.js';
import { wirePaymentRoutes, paymentWebhookHandler } from './payment-http.js';
import { TapPaymentProvider } from './tap-payments.js';
import { wireFunctionalRoutes } from './functional-wiring.js';
import { AuctionR47 } from './auction-r47.js';
import { wireFeaturesR47 } from './features-r47-http.js';
import { ProfileSocial, validProfileSocial, wireProfileSocialRoutes } from './profile-social-r53.js';
import { OwnerPlayerTools } from './owner-player-tools.js';
import { SocialRooms, validSocialRooms } from './social-rooms.js';
import { SocialVoice } from './social-voice.js';
import { Backups } from './backup-r61.js';
import { WebPush } from './webpush-r62.js';
import { DailyStreak } from './daily-streak-r62.js';
import { TribeWar, WAR_FUEL } from './tribe-war-r62.js';
import { MonthlySeason, SEASON_PRIZES, monthLabel } from './season-r62.js';
import { InviteRewards } from './invite-rewards-r62.js';
import { FirstTopup } from './first-topup-r62.js';
import { ShopOffers } from './shop-offers-r62.js';
import { Devices } from './devices-r62.js';
import { monthStartOf, nextMonthStartOf } from './leaderboard.js';
import { weekKeyOf } from './room-supporters-r58.js';
import { BulkGrants } from './bulk-grants.js';
import { wireSocialRoutes } from './social-http.js';
import { wireSocialBenefitsRoutes } from './social-benefits-http.js';
import { validCannonGiftContext } from './social-cannon-r27.js';
/** Compatibility wrapper: old generic intents remain valid; optional social payloads fail closed. */
export function validSocialGiftOutbox(d) {
    if (!validFunctionalOutbox(d))
        return false;
    return (d.intents ?? []).every(i => {
        const p = i.payload;
        if (p.socialSupport !== undefined && (p.kind !== 'gift' || !validGiftSupportContext(p.socialSupport)))
            return false;
        if (p.cannonSupport === undefined)
            return true;
        return p.kind === 'gift' && validCannonGiftContext(p.cannonSupport) && i.createdAt >= p.cannonSupport.enabledAt
            && typeof p.from === 'string' && typeof p.to === 'string' && p.from !== p.to && typeof p.eventRef === 'string' && i.ref === 'gift:' + p.eventRef
            && (p.socialSupport === undefined || validGiftSupportContext(p.socialSupport) && p.socialSupport.roomId === p.cannonSupport.roomId && p.socialSupport.councilId === p.cannonSupport.councilId);
    });
}
/** Trusted integration helper. Caller supplies current SERVER ranks, never browser claims.
 * Sale status is intentionally independent from owned equipment, as for existing cosmetics.
 * Fixed catalog artwork/name cannot be replaced by a wallet string or custom product URL.
 */
/** R58e: إيقاف قسم السيارات بالكامل (المالك طلب حذفها). البيانات والملكية ما تنمس، فيقدر يرجع بتغيير هذا العلم. */
export const CARS_REMOVED = true;
export function equippedEntranceView(wallet, shopcat, id, ranks) {
    // R58e: السيارات انشالت من الموقع بطلب المالك — ما تنعرض ولا تشتغل بالغرف
    if (CARS_REMOVED || !wallet.has(id))
        return null;
    const iid = wallet.equipped(id).entrance;
    const base = ENTRANCE_ITEMS.find((i) => i.id === iid);
    const item = base && shopcat.get(base.id);
    if (!base?.art || !item || item.custom || item.slot !== 'entrance' || !wallet.owned(id).includes(base.id) || !shopEligibility(item, ranks).eligible)
        return null;
    return { id: base.id, name: base.name, art: base.art };
}
/** Cosmetic snapshot only: existing owned equipment, actual catalog slot, and one safe CSS identifier. */
export function equippedFrameView(wallet, shopcat, id) {
    const iid = wallet.equippedOwnedItem(id, 'frame');
    const item = iid === null ? null : shopcat.get(iid);
    return item?.slot === 'frame' && typeof item.css === 'string' && /^[A-Za-z_][A-Za-z0-9_-]{0,79}$/.test(item.css) ? item.css : null;
}
/** Called before shopView/catalogue access. A closed operation never creates an account or
 * operation record; a committed exact retry only reads the existing wallet receipt.
 * Real/complimentary purchases remain in payment-http.ts, not the old shop:checkout API.
 */
export function manualConversionShopReply(wallet, id, m) {
    const gemCheckout = m.t === 'shop:checkout' && typeof m.pack === 'string' && m.pack.startsWith('gems-');
    if (m.t !== 'shop:convert' && m.t !== 'shop:gems' && !gemCheckout)
        return null;
    const kind = m.t === 'shop:convert' ? 'conversion' : 'gems';
    const request = kind === 'conversion' ? JSON.stringify([m.gems, m.seenRate]) : m.pack;
    const replay = wallet.replayManualConversion(id, String(m.key ?? ''), kind, request);
    if (!replay)
        return { ok: false, code: MANUAL_CONVERSION_DISABLED, error: MANUAL_CONVERSION_CLOSED_MESSAGE };
    if (!replay.ok)
        return { ok: false, code: replay.code, error: 'مفتاح الطلب غير صالح أو استُعمل لعملية مختلفة. التحويل اليدوي مقفول.' };
    return { ...replay, economy: { conversion: { enabled: false, coinsPerGem: null }, legacyGemPacksEnabled: false },
        ...(kind === 'conversion' ? { converted: replay.receipt.gems } : { bought: replay.receipt.itemId, got: replay.receipt.gems }) };
}
export class BodyReadError extends Error {
    status;
    constructor(status, reason) {
        super(reason);
        this.status = status;
        this.name = 'BodyReadError';
    }
}
/** نجمع البايتات أول؛ حدود حزم النقل ما تغيّر حروف العربي أو الإيموجي. */
export function readBody(req, limit = 2048) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        let settled = false;
        const cleanup = () => {
            req.off('data', onData);
            req.off('end', onEnd);
            req.off('error', onError);
            req.off('aborted', onAborted);
            req.off('close', onClose);
        };
        const fail = (error, drain = false) => {
            if (settled)
                return;
            settled = true;
            chunks.length = 0;
            cleanup();
            // ما نكسر المقبس قبل إرسال 413. نصرّف الباقي بدون تجميعه ونستهلك خطأ النقل اللاحق.
            req.once('error', () => undefined);
            if (drain)
                req.resume();
            reject(error);
        };
        const onData = (chunk) => {
            if (!Buffer.isBuffer(chunk))
                return fail(new BodyReadError(400, 'invalid_body'));
            size += chunk.length;
            if (size > limit)
                return fail(new BodyReadError(413, 'too_large'), true);
            chunks.push(chunk);
        };
        const onEnd = () => {
            if (settled)
                return;
            let body;
            try {
                body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size));
            }
            catch {
                return fail(new BodyReadError(400, 'invalid_utf8'));
            }
            settled = true;
            chunks.length = 0;
            cleanup();
            resolve(body);
        };
        const onError = () => fail(new BodyReadError(400, 'body_error'));
        const onAborted = () => fail(new BodyReadError(400, 'aborted'));
        const onClose = () => { if (!settled)
            fail(new BodyReadError(400, 'body_closed')); };
        req.on('data', onData);
        req.once('end', onEnd);
        req.once('error', onError);
        req.once('aborted', onAborted);
        req.once('close', onClose);
        if (req.aborted || req.destroyed)
            return onAborted();
        const declared = Number(req.headers['content-length']);
        if (Number.isFinite(declared) && declared > limit)
            fail(new BodyReadError(413, 'too_large'), true);
    });
}
/** توافق مؤقت: المخزنين الحاليين ما عندهم unsaved() عامة. نقرأ علم الكاتب فقط، مب بيانات اللاعبين.
 * إذا تغيّرت الواجهة ما نعلن إغلاق نظيف بالغلط؛ الأفضل getter عام في الوحدة المالكة. */
export function transportStoreUnsaved(store) {
    const disk = Reflect.get(store, 'disk');
    return disk instanceof Persister ? disk.unsaved : true;
}
const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public');
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
};
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', // الميكروفون مقفّل افتراضياً؛ يُسمح لنفس الموقع فقط عند تفعيل الصوت.
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://i.ytimg.com; connect-src 'self' blob: ws: wss:; " +
        "frame-src https://www.youtube-nocookie.com; media-src 'self' blob:; " +
        "frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
/** One configured room store for both embedded createApp and the CLI. Never fall back on DB failure. */
async function configuredRoomStore(cfg) {
    if (cfg.store === 'memory')
        return new MemoryStore();
    const { createMariaStore } = await import('./maria-store.js');
    const store = await createMariaStore(cfg.db);
    if (!(await store.ping())) {
        await store.close();
        throw Object.assign(new Error('مخزن الغرف غير جاهز: طبّق ترحيل الحماية على البيئة المعتمدة قبل تشغيل النسخة.'), { code: 'ROOM_STORAGE_NOT_READY' });
    }
    return store;
}
export async function createApp(cfg, suppliedStore, opts = {}) {
    const registry = createRegistry();
    const trustProxy = process.env.TRUST_PROXY === 'true';
    const securityHeaders = { ...SECURITY_HEADERS, 'Permissions-Policy': `camera=(), microphone=${cfg.socialVoice?.enabled ? '(self)' : '()'}, geolocation=()` };
    const errRing = [];
    const log = (event, data = {}) => {
        // لا نسجّل أسماء اللاعبين ولا رموز الغرف
        if (/error|failed|unsaved|corrupt/i.test(event)) {
            errRing.push({ ts: new Date().toISOString(), event, data });
            if (errRing.length > 100)
                errRing.shift();
        }
        if (!opts.silent)
            console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data }));
    };
    const accFile = cfg.accountsFile || (cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'accounts.json') : '');
    const platFile = cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'platform.json') : '';
    const economyFile = cfg.economyFile || (cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'economy.json') : '');
    const progressionFile = cfg.progressionFile || (cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'progression.json') : '');
    const shopFile = cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'shop.json') : '';
    const idFile = cfg.identitiesFile || (cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'identities.json') : '');
    const giftFile = cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'gifts.json') : '';
    const cityFile = cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'city.json') : '';
    const comFile = cfg.communityFile || (cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'community.json') : '');
    const comMedia = cfg.communityMediaDir || (cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'community-media') : '');
    const functionalFile = (configured, name) => configured || (cfg.walletFile ? path.join(path.dirname(cfg.walletFile), name + '.json') : '');
    const accountToolsFile = functionalFile(cfg.accountToolsFile, 'account-tools');
    const socialFile = functionalFile(cfg.socialPrivateFile, 'social-private');
    // R61: كانت تعتمد على SOCIAL_PRIVATE_FILE بس — ولو ما كان مضبوط (مثل الإنتاج) نقاط الارتباط والقبائل ما تنحفظ أبدًا. الحين تنحفظ جنب ملف social-private حتى لو مساره محسوب تلقائيًا.
    const besideSocial = (name) => socialFile ? path.join(path.dirname(socialFile), name) : '';
    const boardFile = functionalFile(cfg.leaderboardFile, 'leaderboard');
    const cpFile = process.env.CP_POINTS_FILE ?? besideSocial('cp-points.json');
    const missionsFile = functionalFile(cfg.missionsFile, 'missions');
    const rankRewardsFile = functionalFile(cfg.rankRewardsFile, 'rank-rewards');
    const supportFile = functionalFile(cfg.supportNotificationsFile, 'support-notifications');
    const outboxFile = functionalFile(cfg.functionalOutboxFile, 'functional-outbox');
    const sessionsFile = functionalFile(cfg.serverSessionsFile, 'server-sessions');
    const paymentsFile = functionalFile(cfg.payments?.file, 'payments');
    const vipMembershipFile = functionalFile(cfg.vipMembershipFile, 'vip-membership');
    const socialRoomsFile = functionalFile(cfg.socialRoomsFile, 'social-rooms');
    const profileSocialFile = functionalFile(undefined, 'profile-social'); // R53: من الذي رآني + دعوات الأصدقاء
    if (opts.paymentProvider && (cfg.production || cfg.payments?.mode !== 'test'))
        throw new Error('PAYMENT_PROVIDER_INJECTION_TEST_ONLY');
    if (cfg.dataDirectoryLock && cfg.walletFile) {
        const root = path.resolve(path.dirname(cfg.walletFile));
        const writtenPaths = [cfg.walletFile, boardFile, accFile, platFile, economyFile, progressionFile, shopFile, idFile, giftFile, cityFile, comFile, accountToolsFile, socialFile, socialRoomsFile, profileSocialFile, missionsFile, rankRewardsFile, supportFile, outboxFile, sessionsFile, paymentsFile, vipMembershipFile, cfg.avatarsDir, cfg.communityMediaDir].filter((v) => !!v);
        if (writtenPaths.some((file) => { const relative = path.relative(root, path.resolve(file)); return relative === '..' || relative.startsWith('../') || path.isAbsolute(relative); }))
            throw new Error('DATA_DIRECTORY_LOCK_REQUIRES_ALL_WRITES_INSIDE_ROOT');
    }
    const writerLock = cfg.dataDirectoryLock && cfg.walletFile ? new DataDirectoryLock(path.dirname(cfg.walletFile)).acquire() : null;
    let ownedStore;
    try {
        const store = suppliedStore ?? (ownedStore = await configuredRoomStore(cfg));
        // قبل أي شيء: لو أي ملف بيانات تالف نوقف التشغيل (ما نبدأ ببيانات فاضية ولا نكتب فوق التالف)
        checkDataFiles([
            { file: sessionsFile, validate: validSessionRegistry },
            { file: paymentsFile, validate: validPayments },
            { file: vipMembershipFile, validate: validVipMembership },
            { file: socialRoomsFile, validate: validSocialRooms },
            { file: profileSocialFile, validate: validProfileSocial },
            { file: accountToolsFile, validate: validAccountTools }, { file: socialFile, validate: validSocialPrivate },
            { file: missionsFile, validate: validMissionsServer }, { file: rankRewardsFile, validate: validRankRewards },
            { file: supportFile, validate: validSupportNotifications }, { file: outboxFile, validate: validSocialGiftOutbox },
            { file: economyFile, validate: validEconomy },
            { file: progressionFile, validate: validProgression },
            { file: platFile, validate: validPlatform }, { file: shopFile, validate: validShop },
            { file: cfg.walletFile ?? '', validate: validWallet }, { file: boardFile, validate: validBoard },
            { file: accFile, validate: validAccounts }, { file: idFile, validate: validIdentities }, { file: comFile, validate: validCommunity }, { file: giftFile, validate: validGiftOverrides }, { file: cityFile, validate: validCity },
        ]);
        const storage = new StorageMonitor(log);
        const sessions = new SessionRegistry(sessionsFile, cfg.cookieSecret, Date.now, storage);
        const board = new Leaderboard(boardFile, Date.now, storage);
        const economy = new Economy(economyFile, Date.now, storage);
        const accounts = new Accounts(accFile, Date.now, storage);
        const progression = new Progression(progressionFile, Date.now, storage, (id) => accounts.rawXp(id));
        accounts.setXpOverlay((id, baseXp) => progression.canonicalXp(id, baseXp));
        const progressionEvents = progression.frozenEvents();
        const wallet = new Wallet(cfg.walletFile ?? '', Date.now, storage);
        const platform = new Platform(platFile, Date.now, storage);
        const shopcat = new ShopCatalog(shopFile, Date.now, storage);
        const giftcat = new GiftCatalog(giftFile, Date.now, storage);
        const accountTools = new AccountTools(accountToolsFile, Date.now, storage);
        const verificationView = (id) => {
            const kind = accountTools.verificationKind(id), administrativeRole = platform.roleOf(id);
            const verificationKind = kind === 'administration' && !administrativeRole ? null : kind;
            return { verified: !!verificationKind, verificationKind, administrativeRole };
        };
        const missions = new MissionsServer(missionsFile, wallet, Date.now, storage, shopcat);
        const rankRewards = new RankRewards(rankRewardsFile, wallet, progression, { hasAccount: (id) => accounts.has(id), itemExists: (id) => !!shopcat.get(id), mon: storage });
        const support = new SupportNotifications(supportFile, Date.now, storage);
        /* R62: إشعارات الجوال — تنرسل بس للي مب فاتح الموقع الحين (اللي فاتحه يشوف التنبيه داخل الموقع) */
        const webPush = process.env.WEB_PUSH === '0' || !cfg.walletFile && cfg.production ? null : (() => { try {
            return new WebPush(cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'web-push.json') : '', cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'vapid.json') : '', { subject: process.env.VAPID_SUBJECT || 'https://la3bak.com', mon: storage, log: (e, d) => log(e, d) });
        }
        catch (e) {
            log('web_push_disabled', { error: String(e.message).slice(0, 120) });
            return null;
        } })();
        let onlineNow = () => false;
        let inviteRewardsView = () => null;
        const pushTo = (ids, msg) => { if (!webPush)
            return; for (const id of ids.slice(0, 5000))
            if (!onlineNow(id) && webPush.count(id))
                void webPush.send(id, msg).catch(() => { }); };
        {
            const orig = support.announce.bind(support);
            support.announce = (r, t, b, a, ref) => { const out = orig(r, t, b, a, ref); try {
                if (out && !out.error && !out.duplicate && typeof t === 'string')
                    pushTo(r, { title: t, body: typeof b === 'string' ? b : '', url: '#/notifications', tag: ref.slice(0, 40) });
            }
            catch { /* */ } return out; };
        }
        const outbox = new FunctionalOutbox(outboxFile, Date.now, storage);
        const vipMembership = new VipMembership(vipMembershipFile, { wallet, progression, hasAccount: id => accounts.has(id), mon: storage, catalogItem: id => shopcat.get(id), notify: notice => { support.announce([notice.userId], notice.title, notice.body, 'VIP', notice.ref); } });
        const paymentSettings = cfg.payments;
        const provider = opts.paymentProvider ?? (!cfg.complimentaryPurchases && paymentSettings && paymentSettings.mode !== 'disabled' && paymentSettings.provider === 'tap' && paymentSettings.secretKey && paymentSettings.merchantId ? new TapPaymentProvider({ mode: paymentSettings.mode, secretKey: paymentSettings.secretKey, merchantId: paymentSettings.merchantId }) : null);
        /* R67ae: إعدادات التشغيل من لوحة التحكم */
        const siteFlags = new SiteFlagsStore(functionalFile(undefined, 'site-flags'), Date.now, storage);
        setExtraBannedWords(siteFlags.words());
        // R67ae: تفعيل نوبل N6–N9 بطلب المالك (مرة وحدة؛ لو المالك رجّعها خمس بعدين ما تنعاد)
        if (!siteFlags.migrated('noble-nine')) {
            try {
                const art = (n) => `/preview/assets/profile/ranks/r65/noble-n${n}.webp`;
                if (progression.ensureNineNoble([{ name: 'الدوق', color: '#c58bff', rarity: 'epic', artwork: art(6) }, { name: 'الأمير', color: '#ff7ac8', rarity: 'epic', artwork: art(7) }, { name: 'الملك', color: '#ffd66b', rarity: 'legendary', artwork: art(8) }, { name: 'الإمبراطور', color: '#ff9d2e', rarity: 'legendary', artwork: art(9) }]))
                    log('noble_nine_enabled', {});
                siteFlags.markMigrated('noble-nine');
            }
            catch (e) {
                log('noble_nine_failed', { error: String(e.message).slice(0, 120) });
            }
        }
        const deletion = new AccountDeletion(functionalFile(undefined, 'account-deletion'), Date.now, storage);
        accounts.hiddenFilter = (id) => deletion.hidden(id);
        const broadcasts = new Broadcasts(functionalFile(undefined, 'broadcasts'), Date.now, storage);
        const homeBanners = new HomeBanners(functionalFile(undefined, 'home-banners'), Date.now, storage);
        const expTimer = setInterval(() => { try {
            for (const x of wallet.expireDue()) {
                const names = x.items.map((i) => shopcat.get(i)?.name ?? i).join('، ');
                try {
                    support.announce([x.id], '⏰ انتهت مدة أغراضك', `خلصت مدة: ${names}. تقدر تجددها من المتجر.`, 'المتجر', `exp-${x.id.slice(0, 8)}-${Date.now()}`);
                }
                catch { /* التنبيه اختياري */ }
                sendToUser(x.id, { t: 'wallet', coins: wallet.balance(x.id), gems: wallet.gems(x.id), won: 0 });
            }
        }
        catch (e) {
            log('expire_failed', { error: String(e).slice(0, 100) });
        } }, 60_000);
        expTimer.unref?.();
        const replays = new Replays(cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'replays') : '', Date.now);
        const phoneVerify = new PhoneVerify(functionalFile(undefined, 'phone-verify'), cfg.cookieSecret, process.env, log, Date.now, storage);
        const wheel = new LuckyWheel(functionalFile(undefined, 'lucky-wheel'), Date.now, storage);
        const activity = new PlayerActivity(functionalFile(undefined, 'player-activity'), Date.now, storage);
        // R68y: التحكم بالألعاب ورسوم الدخول من اللوحة
        const GAME_STATUS0 = new Map(registry.list().map((g) => [g.id, g.status]));
        const applyGameFlags = () => { const f = siteFlags.get(); setStakes(f.stakes); for (const id of GAME_STATUS0.keys()) {
            const e = registry.get(id);
            if (e)
                e.info.status = f.gamesOff.includes(id) ? 'soon' : (GAME_STATUS0.get(id) ?? 'available');
        } };
        applyGameFlags();
        {
            const t = siteFlags.tuning();
            if (t)
                try {
                    applyTuning(validateTuning(t, TUNING_DEFAULT));
                }
                catch (e) {
                    log('tuning_invalid', { error: String(e.message).slice(0, 120) });
                }
        }
        /* R62: عرض الشحن الأول (ضعف الباقة مرة وحدة) */
        const firstTopup = new FirstTopup(functionalFile(undefined, 'first-topup'), {
            percentOverride: () => siteFlags.get().firstTopupPercent,
            grant: (id, cur, amt, why, key) => wallet.grant(id, cur, amt, why, key),
            debit: (id, cur, amt, why, key) => { const r = wallet.adminAdjust(id, cur, -amt, why, key); return r.ok; }, log,
        }, storage);
        const payments = new Payments({ file: paymentsFile, wallet, economy, provider, complimentaryPurchases: cfg.complimentaryPurchases, mode: paymentSettings?.mode ?? 'disabled', liveApproved: paymentSettings?.liveApproved ?? false, licenseApproved: paymentSettings?.licenseApproved ?? false, merchantApproved: paymentSettings?.merchantApproved ?? false, publicBaseUrl: paymentSettings?.publicBaseUrl ?? '', production: cfg.production, mon: storage, notify: (id, orderId, text) => { support.announce([id], 'تأكيد عملية الباقة', text, 'payments-server', 'payment:' + orderId + ':' + (text.includes('استرجاع') ? 'refund' : 'paid')); try {
                const o = payments.get(id, orderId);
                if (text.includes('استرجاع'))
                    firstTopup.onRefunded(id, orderId);
                else {
                    const b = firstTopup.onPaid(id, o);
                    if (b)
                        support.announce([id], '🎁 هدية أول شحن', `لأنها أول عملية شحن لك، أضفنا ${b.toLocaleString('en-US')} ${o.cur === 'gems' ? 'جوهرة' : 'عملة'} هدية فوق الباقة.`, 'payments-server', 'firstbonus:' + id.slice(0, 40));
                }
            }
            catch (e) {
                log('first_topup_failed', { error: String(e.message).slice(0, 100) });
            } sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id) }); } });
        const paidGamesDisabled = paymentSettings?.mode !== undefined && paymentSettings.mode !== 'disabled';
        const availableStakes = paidGamesDisabled ? [0] : STAKES;
        const canonicalProfile = (id, coins) => {
            return accounts.profile(id, coins);
        };
        // An async room write can yield between reservation and Accounts.record. Never cancel an active reservation.
        const activeIntents = new Map();
        const sourceState = (intent) => {
            const p = intent.payload;
            if (p.kind === 'game') {
                if (accounts.unsaved())
                    return 'waiting';
                return typeof p.eventRef === 'string' && accounts.hasRecorded(p.eventRef) ? 'committed' : 'absent';
            }
            if (wallet.unsaved())
                return 'waiting';
            return typeof p.from === 'string' && typeof p.to === 'string' && typeof p.eventRef === 'string'
                && wallet.hasGiftSource(p.from, p.to, p.eventRef) ? 'committed' : 'absent';
        };
        const supportJobs = new Map();
        const consumeIntent = (intent, live = false, deferredSettlements) => {
            if (sourceState(intent) !== 'committed')
                return;
            const payload = intent.payload;
            const policy = payload.policy && validProgression({ v: 1, config: payload.policy, players: {} }) ? payload.policy : progression.configView();
            if (payload.kind === 'game') {
                const players = payload.players, winners = payload.winners;
                progressionEvents.game(policy, players, winners, String(payload.eventRef), intent.createdAt);
                missions.game(players, winners, String(payload.eventRef), intent.createdAt);
            }
            else {
                const from = String(payload.from), to = String(payload.to), ref = String(payload.eventRef);
                progressionEvents.gift(policy, from, 'sent', ref, intent.createdAt);
                progressionEvents.gift(policy, to, 'received', ref, intent.createdAt);
                missions.gift(from, to, ref, intent.createdAt);
                if (payload.socialSupport !== undefined || payload.cannonSupport !== undefined) {
                    if (payload.socialSupport !== undefined && !validGiftSupportContext(payload.socialSupport))
                        throw new Error('invalid_gift_support_intent');
                    if (payload.cannonSupport !== undefined && !validCannonGiftContext(payload.cannonSupport))
                        throw new Error('invalid_cannon_support_intent');
                    if (supportJobs.has(intent.ref))
                        return;
                    const context = payload.socialSupport, cannon = payload.cannonSupport;
                    const rec = wallet.committedGiftReceipt(from, to, ref);
                    if (!rec)
                        throw new Error('committed_gift_receipt_missing');
                    // Schedule after the current withGiftAccess callback releases membership serialization.
                    // NEVER await SocialRooms from wallet.onGift (it runs inside that same queue).
                    const job = Promise.resolve().then(async () => { if (context)
                        await socialRooms.consumeGiftSupport(context, rec, live); if (cannon)
                        await socialRooms.consumeCannonGift(cannon, rec, live); }).then(() => { outbox.settle(intent.ref); }).catch(() => { log('functional_event_pending', { kind: 'gift' }); }).finally(() => { supportJobs.delete(intent.ref); });
                    supportJobs.set(intent.ref, job);
                    void pendingWrites.track('social-support:' + intent.ref, () => job).catch(() => undefined);
                    return;
                }
            }
            if (deferredSettlements)
                deferredSettlements.push(intent.ref);
            else
                outbox.settle(intent.ref);
        };
        const replayIntents = () => {
            outbox.retry();
            if (outbox.unsaved())
                return;
            const settlements = [];
            for (const intent of outbox.pending()) {
                try {
                    if (sourceState(intent) === 'absent' && !activeIntents.has(intent.ref))
                        settlements.push(intent.ref);
                    else
                        consumeIntent(intent, false, settlements);
                }
                catch {
                    log('functional_event_retry_failed', { kind: intent.payload.kind });
                }
            }
            // Only proven absent/inactive sources or consumers already durably saved.
            // No money/grant batching; async support jobs retain their own post-success settlement.
            // A crash before this save leaves the original intents for idempotent consumer replay.
            if (settlements.length) {
                try {
                    outbox.settleMany(settlements);
                }
                catch {
                    log('functional_event_retry_failed', { kind: 'batch' });
                }
            }
        };
        const reserveIntent = (ref, payload, ts) => {
            if (!validSocialGiftOutbox({ v: 1, intents: [{ ref, payload, createdAt: ts }] }))
                throw new Error('invalid_social_gift_intent');
            outbox.reserve(ref, { ...payload, policy: JSON.parse(JSON.stringify(progression.configView())) }, ts);
            activeIntents.set(ref, (activeIntents.get(ref) ?? 0) + 1);
            return () => { const n = activeIntents.get(ref) - 1; if (n)
                activeIntents.set(ref, n);
            else
                activeIntents.delete(ref); };
        };
        const deliverIntent = (ref, live = false) => {
            const saved = outbox.get(ref);
            if (!saved || outbox.unsaved())
                return; // Callback replay never creates a new event or re-freezes policy.
            try {
                consumeIntent(saved, live);
            }
            catch {
                log('functional_event_pending', { kind: saved.payload.kind });
            }
        };
        const reserveGame = (ref, players, winners, ts) => reserveIntent('game:' + ref, { kind: 'game', eventRef: ref, players: players.map((p) => ({ id: p.id })), winners }, ts);
        accounts.onBeforeRecord = reserveGame;
        accounts.onRecorded = (ref) => deliverIntent('game:' + ref);
        // «مدينتي»: نرد الخادم من مولّد التشفير (العميل ما يقرر شي)
        const city = new City(cityFile, Date.now, () => randomInt(0, 2 ** 32) / 2 ** 32, storage);
        const avatars = new Avatars(cfg.avatarsDir || (cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'avatars') : ''), storage);
        let avatarDecodes = 0;
        const avatarLimiter = new KeyedLimiter(6, 6 / 60);
        const roomAvatarLimiter = new KeyedLimiter(120, 2);
        const identities = new Identities(idFile, Date.now, storage);
        /* R60 (قرار المالك): الضيف (بدون Google) يتصفح بس، ويلعب ضد الكمبيوتر بدون جوايز. القفل هنا بالخادم.
         * يشتغل بس إذا الدخول بـGoogle مفعّل بالخادم (وإلا الضيف ما يقدر يربط حسابه أصلًا). GUEST_READONLY=0 يطفيه. */
        const GUEST_READONLY = process.env.GUEST_READONLY !== '0' && !!cfg.googleClientId;
        const SINGLE_CUR = process.env.SINGLE_CURRENCY !== '0';
        /* R60b: مهلة للضيوف القدامى — اللي سجّلوا قبل تشغيل القفل ياخذون مهلة (افتراضيًا 14 يوم) يربطون فيها Google وكل شي شغال عندهم مع تنبيه.
           الضيف الجديد (بعد التشغيل) يتقفل على طول. بداية المهلة تنحفظ بملف صغير عشان ما تتجدد مع كل إعادة تشغيل.
           GUEST_LOCK_AT=2026-12-01 يحدد تاريخ القفل بنفسه، GUEST_GRACE_DAYS=0 يلغي المهلة. */
        const graceFile = accFile ? path.join(path.dirname(accFile), 'guest-grace.json') : '';
        const graceStart = (() => { let t = 0; try {
            if (graceFile)
                t = Number(JSON.parse(readFileSync(graceFile, 'utf8')).startedAt) || 0;
        }
        catch { /* أول مرة */ } if (!Number.isSafeInteger(t) || t <= 0) {
            t = Date.now();
            try {
                if (graceFile)
                    writeFileSync(graceFile, JSON.stringify({ startedAt: t }));
            }
            catch { /* الذاكرة تكفي */ }
        } return t; })();
        const graceDays = Math.max(0, Math.min(90, Number(process.env.GUEST_GRACE_DAYS ?? 14) || 0));
        const lockAtEnv = Date.parse(process.env.GUEST_LOCK_AT ?? '');
        const guestLockAt = Number.isFinite(lockAtEnv) ? lockAtEnv : graceStart + graceDays * 86_400_000;
        /** ضيف قديم (حسابه قبل بداية المهلة) والمهلة ما خلصت */
        const inGrace = (id) => { if (Date.now() >= guestLockAt)
            return false; const since = accounts.sinceOf(id); return since === null || since < graceStart; };
        const unlinkedGuest = (id) => GUEST_READONLY && !identities.linked(id);
        const isGuest = (id) => unlinkedGuest(id) && !inGrace(id);
        const GUEST_MSG = 'سجّل دخولك بحساب Google عشان تقدر تستخدم هالميزة. الضيف يقدر يتصفح ويلعب ضد الكمبيوتر بس.';
        const GUEST_WS_BLOCK = new Set(['room:join', 'room:chat', 'room:react', 'room:voice', 'room:rematch', 'mm:join', 'mm:fill', 'gift:send', 'shop:buy', 'shop:checkout', 'shop:convert', 'shop:gems', 'shop:claim', 'shop:equip', 'wallet:daily', 'city:claim', 'city:roll', 'city:up']);
        /** مسارات الكتابة المسموحة للضيف: الدخول/الخروج والربط بـGoogle، والإعدادات الشخصية، وتعليم الإشعارات مقروءة */
        const guestHttpAllowed = (p) => /^\/api\/(auth\/|logout$|account-tools\/settings$|profile\/visitors\/seen$|profile\/invites\/claim$|notifications|push\/|devices\/)/.test(p);
        const googleKeys = opts.googleKeys ?? googleKeyFetcher();
        const authLimiter = new KeyedLimiter(30, 30 / 60);
        // زر Google يحتاج هذي المصادر بالضبط (حسب توثيق Google)؛ ما نفتحها إلا إذا الدخول بـ Google مفعّل
        if (cfg.googleClientId) {
            securityHeaders['Content-Security-Policy'] =
                "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; " +
                    "font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://i.ytimg.com; connect-src 'self' blob: ws: wss: https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/ https://www.youtube-nocookie.com; " +
                    "media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
        }
        /* ---- المتجر: كل التحقق بالخادم. العميل يرسل معرّف العنصر ومفتاح الطلب فقط ---- */
        const progress = (id) => { const pr = canonicalProfile(id, 0); return { wins: pr.wins, played: pr.played, level: pr.level, progression: progression.view(id) }; };
        const achInput = (id) => { const st = accounts.achStats(id); const gc = wallet.giftCounts(id); return { ...st, giftsSent: gc.sent, giftsRecv: gc.recv, owned: wallet.owned(id).length }; };
        /** R57: هل الرقم مستخدم من حساب ثاني (أيدي عادي أو مميز)؟ */
        const specialTaken = (id, value) => { const owner = accounts.findByDisplayPlayerId(value); return owner !== null && owner !== id; };
        /* R62: عروض المتجر محدودة الوقت */
        const offers = new ShopOffers(functionalFile(undefined, 'shop-offers'), storage);
        // R67ae: خصم على قسم كامل (فعالية من اللوحة) لو القطعة ما عليها عرض خاص
        shopcat.offerHook = (id, slot, price) => { const own = offers.forItem(id); if (own)
            return own; if (!slot || !price)
            return null; const ev = siteFlags.saleFor(slot); return ev ? { discount: ev.percent ?? 0, startsAt: ev.startsAt, endsAt: ev.endsAt, exclusive: false, live: true } : null; };
        /** R67au: تذكارات CP الجديدة اللي يرسلها المالك تنضاف هنا (فاضي لين توصل رسوماته) */
        const SOUVENIR_R67 = new Set();
        /** R68z: مدة الأغراض بالمتجر — 7 / 15 / 30 يوم / دائم. السعر نسبة من سعر الدائم. */
        const TIMED_SLOTS = new Set(['frame', 'bg', 'chat-bubble', 'board', 'mic-frame', 'title', 'badge', 'room-bg', 'avatar', 'voice-fx', 'pcard']); // R68z32: مؤثرات الصوت بمدة. R68z30: العصي وكور البولينغ دائم بس
        const DURATIONS = [{ days: 7, pct: 25, label: '7 أيام' }, { days: 15, pct: 40, label: '15 يوم' }, { days: 30, pct: 60, label: '30 يوم' }, { days: 0, pct: 100, label: 'دائم' }]; // R68z29: مثل فيديو المالك
        const durPrice = (price, days) => { const d = DURATIONS.find((x) => x.days === days); if (!d)
            return -1; if (!days || price <= 0)
            return price; const v = price * d.pct / 100; const step = v >= 10000 ? 1000 : v >= 1000 ? 100 : 10; return Math.max(step, Math.round(v / step) * step); };
        const shopView = (id) => {
            const pr = progress(id);
            const got = new Set(wallet.claimed(id));
            const owned = new Set(wallet.owned(id));
            const ranks = { level: pr.progression.level.value, vip: pr.progression.vip.enabled && pr.progression.vip.value ? Number(pr.progression.vip.value.slice(1)) : 0, noble: pr.progression.noble.enabled && pr.progression.noble.value ? Number(pr.progression.noble.value.slice(1)) : 0 };
            const allItems = shopcat.all().map((i) => ({ id: i.id, slot: i.slot, name: i.name, icon: i.icon, desc: i.desc, price: i.price, currency: i.currency, permanent: i.permanent, css: i.css, art: i.art, active: i.active, retired: !i.active, status: i.status, minLevel: i.minLevel, minVip: i.minVip, minNoble: i.minNoble, ...(i.offer ? { offer: i.offer } : {}), eligibility: shopEligibility(i, ranks), rarity: i.rarity ?? 'common', set: i.set ?? null, season: i.season ?? null, kids: !!i.kids, ...(i.backgroundCategory ? { backgroundCategory: i.backgroundCategory, priceApproved: i.priceApproved } : {}), ...(i.slot === 'entrance' ? { proposalOnly: i.proposalOnly, priceApproved: i.priceApproved } : {}) }));
            // R63: عملة وحدة — أسعار الجواهر تنعرض عملات (×20)، والشراء يقبل السعر المعروض
            if (SINGLE_CUR)
                for (const x of allItems)
                    if (x.currency === 'gems') {
                        x.currency = 'coins';
                        x.price = x.price * 20;
                        if (x.offer)
                            x.offer = { ...x.offer, was: x.offer.was * 20 };
                    }
            return {
                ok: true, canDaily: wallet.canClaim(id), coins: wallet.balance(id), gems: wallet.gems(id), owned: wallet.owned(id), exp: wallet.expiries(id), durations: DURATIONS, timedSlots: [...TIMED_SLOTS], equipped: wallet.equipped(id), equippedView: equippedView(id),
                // R57: الأيدي المميز المحجوز لحساب ثاني ما ينعرض
                items: allItems.filter((i) => !(CARS_REMOVED && i.slot === 'entrance') && (i.status !== 'hidden' || owned.has(i.id)) && !(i.slot === 'special-id' && !owned.has(i.id) && (specialTaken(id, String(i.css ?? '')) || String(i.css ?? '').length <= 3)) && !(i.slot === 'souvenir' && !owned.has(i.id) && !SOUVENIR_R67.has(i.id)) && !(i.slot === 'room-id' && !owned.has(i.id) && wallet.anyOwner(i.id, id))),
                collectionItems: allItems.filter((i) => !(CARS_REMOVED && i.slot === 'entrance') && i.set && (i.status !== 'hidden' || owned.has(i.id))),
                sets: SETS, rarities: RARITIES, achievements: achView(achInput(id)),
                economy: economy.view(), gemPacks: [],
                milestones: MILESTONES.map((x) => ({ ...x, value: pr[x.metric], done: got.has(x.id), ready: !got.has(x.id) && pr[x.metric] >= x.goal })),
                ledger: wallet.ledgerOf(id, 60), ledgerTotal: wallet.ledgerCount(id), progression: progression.view(id),
            };
        };
        /* R60: رتبة VIP/النبلاء الفعلية + خيارات الخصوصية المقفولة بالرتبة (قرار المالك) */
        /** R68z: الملف المتحرك: VIP 5+ أو نبيل 3+ = لمعة، VIP 10+ أو نبيل 6+ = كامل */
        const profileAnimTier = (id) => { const t = tierOf(id); return t.vip >= 10 || t.noble >= 6 ? 2 : t.vip >= 5 || t.noble >= 3 ? 1 : 0; };
        const tierOf = (id) => { const p = progression.view(id); return { vip: p.vip.enabled && p.vip.value ? Number(p.vip.value.slice(1)) || 0 : 0, noble: p.noble.enabled && p.noble.value ? Number(p.noble.value.slice(1)) || 0 : 0 }; };
        const PRIVACY_GATES = {
            showPresence: { on: false, vip: 4, noble: 3, msg: 'إخفاء حالة الاتصال يحتاج VIP 4 أو نبيل 3.' },
            hideEntrances: { on: true, vip: 6, noble: 8, msg: 'إخفاء الدخولية يحتاج VIP 6 أو نبيل 8.' },
            hideVisits: { on: true, vip: 14, noble: null, msg: 'التخفي في زيارة الملف يحتاج VIP 14.' },
        };
        const VISITORS_VIP = 11;
        accountTools.gate = (id, key, value) => { const g = PRIVACY_GATES[key]; return g && value === g.on && !privacyAllowed(id, key) ? g.msg : null; };
        const privacyAllowed = (id, key) => { const g = PRIVACY_GATES[key]; if (!g)
            return true; const t = tierOf(id); return t.vip >= g.vip || (g.noble !== null && t.noble >= g.noble); };
        /** الخيار مفعّل فعليًا (اختاره اللاعب + رتبته تسمح الحين) */
        const privacyOn = (id, key) => { const g = PRIVACY_GATES[key]; const v = accountTools.explicitSetting(id, key); return v === g.on && privacyAllowed(id, key); };
        const eligibleItem = (id, it) => {
            if (!it)
                return false;
            const p = progression.view(id);
            const vip = p.vip.enabled && p.vip.value ? Number(p.vip.value.slice(1)) : 0;
            const noble = p.noble.enabled && p.noble.value ? Number(p.noble.value.slice(1)) : 0;
            return p.level.value >= (it.minLevel ?? 0) && vip >= (it.minVip ?? 0) && noble >= (it.minNoble ?? 0);
        };
        const entranceView = (id) => {
            const p = progression.view(id);
            return equippedEntranceView(wallet, shopcat, id, {
                level: p.level.value,
                vip: p.vip.enabled && p.vip.value ? Number(p.vip.value.slice(1)) : 0,
                noble: p.noble.enabled && p.noble.value ? Number(p.noble.value.slice(1)) : 0,
            });
        };
        const equippedView = (id) => Object.fromEntries(Object.entries(wallet.equipped(id)).flatMap(([slot, iid]) => {
            if (slot === 'entrance') {
                const entrance = entranceView(id);
                return entrance ? [[slot, entrance]] : [];
            }
            const ach = achOf(iid);
            if (ach)
                return [[slot, { id: ach.id, name: ach.name, icon: ach.icon, css: slot === 'badge' ? ach.icon : ach.name, earned: true, rarity: ach.tier }]];
            const it = shopcat.get(iid);
            return it && it.slot !== 'entrance' ? [[slot, { id: it.id, name: it.name, icon: it.icon, css: it.css, art: it.art, rarity: it.rarity ?? 'common' }]] : [];
        }));
        const shopCmd = (id, m) => {
            const conversionReply = manualConversionShopReply(wallet, id, m);
            if (conversionReply)
                return conversionReply;
            if (m.t === 'shop:buy') {
                const replay = wallet.replayBuy(id, String(m.key ?? ''), 'item', m.item);
                if (replay)
                    return replay.ok ? { ...shopView(id), bought: m.item, dup: true } : { ok: false, code: 'bad', error: 'مفتاح الطلب غير صالح أو استُعمل لعملية مختلفة.' };
                const it = shopcat.get(m.item);
                if (!it)
                    return { ok: false, error: 'عنصر غير موجود.' };
                // R58e: السيارات انشالت من الموقع بطلب المالك (الملكية القديمة محفوظة بالبيانات)
                if (it.slot === 'entrance')
                    return { ok: false, code: 'unavailable', error: 'هذا القسم غير متاح.' };
                if (achOf(it.id))
                    return { ok: false, code: 'reserved', error: 'هذا المعرّف مخصص لإنجاز مكتسب، ولا يُشترى.' };
                if (it.slot === 'special-id' && String(it.css ?? '').length <= 3)
                    return { ok: false, code: 'reserved', error: 'الأيدي من خانة لين ثلاث خانات محجوز للإدارة.' };
                // R67au: التذكارات القديمة انشالت بطلب المالك؛ القسم ينتظر تذكارات CP الجديدة (ساعات، خواتم، شنط، ورد)
                if (it.slot === 'souvenir' && !SOUVENIR_R67.has(it.id))
                    return { ok: false, code: 'unavailable', error: 'التذكارات الجديدة قريبًا.' };
                // السعر دائماً من الخادم. لو العميل أرسل السعر اللي شافه وتغيّر، نرفض ونرجّع المتجر محدّثاً (ما نخصم سعراً ما شافه).
                const shownPrice = SINGLE_CUR && it.currency === 'gems' ? it.price * 20 : it.price, shownCur = SINGLE_CUR && it.currency === 'gems' ? 'coins' : it.currency;
                if ((m.seen !== undefined && m.seen !== it.price && m.seen !== shownPrice && !(Number(m.days) > 0 && (m.seen === durPrice(it.price, Number(m.days)) || m.seen === durPrice(shownPrice, Number(m.days))))) || (m.seenCur !== undefined && m.seenCur !== it.currency && m.seenCur !== shownCur))
                    return { ...shopView(id), ok: false, error: 'تغيّر سعر العنصر أو نوع عملته. راجع العرض الجديد.', code: 'price' };
                if (!it.active)
                    return { ok: false, error: wallet.owned(id).includes(it.id) ? 'تملك هذا العنصر من قبل.' : 'هذا العنصر غير متاح للشراء حالياً.', code: 'inactive' };
                if (!eligibleItem(id, it))
                    return { ok: false, code: 'rank_required', error: 'رتبتك الحالية ما تستوفي شرط فتح العنصر.' };
                // R57: الأيدي المميز: محجوز؟ نرفض. نثبّته قبل الخصم ونرجّعه لو الخصم فشل (كل هذا متزامن بدون انتظار)
                let prevSpecial;
                if (it.slot === 'special-id') {
                    const value = String(it.css ?? '');
                    if (specialTaken(id, value))
                        return { ...shopView(id), ok: false, code: 'taken', error: 'هذا الأيدي محجوز لحساب ثاني.' };
                    prevSpecial = accounts.specialPlayerIdOf(id);
                    try {
                        accounts.setSpecialPlayerId(id, value);
                    }
                    catch {
                        return { ...shopView(id), ok: false, code: 'taken', error: 'هذا الأيدي محجوز لحساب ثاني.' };
                    }
                }
                if (it.slot === 'room-id' && wallet.anyOwner(it.id, id))
                    return { ...shopView(id), ok: false, code: 'taken', error: 'أيدي الغرفة هذا انباع لحساب ثاني.' };
                const days = m.days === undefined ? 0 : Number(m.days);
                if (!DURATIONS.some((x) => x.days === days) || (days > 0 && !TIMED_SLOTS.has(it.slot)))
                    return { ok: false, code: 'bad', error: 'مدة غير صالحة.' };
                const r = wallet.buy(id, days > 0 ? { ...it, price: durPrice(it.price, days) } : it, String(m.key ?? ''), days);
                if (!r.ok && prevSpecial !== undefined) {
                    try {
                        accounts.setSpecialPlayerId(id, prevSpecial);
                    }
                    catch { /* يبقى كما هو؛ ما فيه خصم */ }
                }
                if (!r.ok)
                    return { ok: false, error: r.code === 'owned' ? (days > 0 ? 'تملك هذا العنصر دائم، ما يحتاج مدة.' : 'تملك هذا العنصر من قبل.') : r.code === 'poor' ? 'عملاتك ما تكفي.' : 'طلب غير صالح.', code: r.code };
                if (!r.dup && it.currency === 'gems') {
                    try {
                        treasure.shopSpend(id, Number(it.price) || 0);
                    }
                    catch { /* وقود القبيلة بس */ }
                }
                return { ...shopView(id), bought: it.id, dup: r.dup };
            }
            if (m.t === 'shop:checkout')
                return { ok: false, code: 'payments_not_configured', error: 'بوابة الدفع مب مهيأة. ما تم خصم أو إضافة أي رصيد.' };
            if (m.t === 'shop:equip') {
                // لقب/شارة مكتسبة: الخادم يتحقق من الشرط من أرقامه هو لحظة الطلب
                const ach = achOf(m.item);
                if (ach) {
                    if (!earned(ach, achInput(id)))
                        return { ok: false, error: 'ما حققت شرط هذا الإنجاز بعد.' };
                    wallet.equipEarned(id, ach.kind, ach.id);
                    return shopView(id);
                }
                const it = m.item === null ? null : shopcat.get(m.item);
                if (m.item !== null && !it)
                    return { ok: false, error: 'عنصر غير موجود.' };
                if (it && !eligibleItem(id, it))
                    return { ok: false, code: 'rank_required', error: 'رتبتك الحالية ما تستوفي شرط استخدام العنصر.' };
                const slot = it ? it.slot : String(m.slot ?? '');
                if (!SLOTS.includes(slot))
                    return { ok: false, error: 'خانة غير صالحة.' };
                if (slot === 'souvenir')
                    return { ok: false, code: 'souvenir', error: 'التذكار ما يتجهّز؛ ينحفظ تلقائيًا في «المقتنيات» بملفك.' };
                if (slot === 'special-id') {
                    if (it && !wallet.owned(id).includes(it.id))
                        return { ok: false, error: 'ما تملك هذا العنصر.' };
                    const value = it ? String(it.css ?? '') : null;
                    if (value && specialTaken(id, value))
                        return { ok: false, code: 'taken', error: 'هذا الأيدي محجوز لحساب ثاني.' };
                    try {
                        accounts.setSpecialPlayerId(id, value);
                    }
                    catch {
                        return { ok: false, code: 'taken', error: 'تعذّر تغيير الأيدي الحين.' };
                    }
                }
                return wallet.equip(id, slot, it ? it.id : null) ? shopView(id) : { ok: false, error: 'ما تملك هذا العنصر.' };
            }
            const ms = MILESTONES.find((x) => x.id === m.mid);
            if (!ms)
                return { ok: false, error: 'مكافأة غير موجودة.' };
            if (progress(id)[ms.metric] < ms.goal)
                return { ok: false, error: 'ما حققت الشرط بعد.' };
            return wallet.grant(id, ms.cur, ms.amount, 'مكافأة: ' + ms.label, ms.id) ? { ...shopView(id), got: ms.amount, cur: ms.cur } : { ok: false, error: 'استلمت هذي المكافأة من قبل.' };
        };
        /**
         * الهدايا: كل شيء بالخادم — الهدية والسعر من الكتالوج، الكمية من قائمة ثابتة، المستلم عضو حالي بنفس الغرفة (لو داخل غرفة)،
         * والهدية الغالية تحتاج تأكيد صريح. التقسيم 50% للمستلم و50% لحساب الإدارة بخطوة حفظ وحدة (Wallet.sendGift).
         * العرض على الشاشة ورسالة المحادثة يُرسلان لأعضاء الغرفة بعد نجاح الحفظ فقط.
         */
        const GIFT_QTY = [1, 7, 77, 777];
        const GIFT_CONFIRM_AT = 10_000;
        const roomChat = new Map();
        const pushChat = (code, e) => { const l = roomChat.get(code) ?? []; l.push(e); while (l.length > 40)
            l.shift(); roomChat.set(code, l); };
        // The quote and the settlement use one versioned server policy. No client reward amount is trusted.
        const giftEvent = (rec, social) => {
            const c = giftcat.get(rec.gift), eventId = (id) => social ? community.pub(id) : id;
            return { k: 'gift', tx: rec.id, ts: rec.ts, from: { id: eventId(rec.from), name: rec.fromName }, to: { id: eventId(rec.to), name: rec.toName },
                gift: { id: rec.gift, name: rec.name, cat: c?.cat ?? 'normal', rarity: c?.rarity ?? 0, fx: c?.fx ?? 'pop', motif: c?.motif ?? 'legacy:' + rec.gift, variant: c?.variant ?? 0, icon: rec.icon, price: rec.price, currency: rec.cur ?? 'coins' },
                qty: rec.qty ?? 1, total: rec.total ?? rec.price, recv: rec.recv, house: rec.house, cur: rec.cur ?? 'coins', rewardCur: rec.rewardCur ?? rec.cur ?? 'coins',
                ...(rec.rewardPolicy ? { rewardPolicy: rec.rewardPolicy, senderBonus: rec.senderBonus } : {}), ...(rec.prepaid ? { prepaid: true } : {}) };
        };
        const batchReplayView = (user, m, scope) => {
            const old = wallet.replayGiftBatch(user.id, m.to, m.gift, m.qty, m.key, scope);
            if (!old)
                return null;
            if (!old.ok)
                return { ok: false, error: 'مفتاح طلب الهدية مستخدم لعملية مختلفة.', code: old.code };
            for (const child of old.receipts)
                deliverIntent('gift:' + child.rec.id);
            return { ok: true, dup: true, batchId: old.batchId, coins: wallet.balance(user.id), gems: wallet.gems(user.id), gifts: old.receipts.map(c => giftPub(c.rec)), evs: old.receipts.map(c => giftEvent(c.rec, true)), aggregate: old.quote };
        };
        // R33 external-support canonical integration: only the existing saved Wallet receipt.
        const singleGiftReplayView = (user, m, scope) => {
            const previous = typeof m.key === 'string' ? wallet.giftByKey(user.id, m.key) : null;
            if (!previous)
                return null;
            if (previous.to !== m.to || previous.gift !== m.gift || (previous.qty ?? 1) !== m.qty || (previous.room ?? '') !== scope)
                return { ok: false, error: 'مفتاح الطلب مستخدم لعملية مختلفة.', code: 'bad' };
            deliverIntent('gift:' + previous.id);
            return { ok: true, dup: true, coins: wallet.balance(user.id), gems: wallet.gems(user.id), gift: giftPub(previous), ev: giftEvent(previous, true) };
        };
        const giftBatchCmd = async (user, m, scope) => {
            const previous = batchReplayView(user, m, scope);
            if (previous)
                return previous;
            const g = giftcat.get(m.gift);
            if (!g?.active)
                return { ok: false, error: 'هذي الهدية غير متاحة.' };
            if (m.seen !== g.price || m.seenPolicy !== GIFT_REWARD_POLICY.id)
                return { ok: false, error: 'تغيّر عرض الهدية. راجع السعر والجواهر قبل الإرسال.', code: 'price' };
            const quote = quoteGiftBatch(g.price, m.qty, m.to.length);
            if (!quote)
                return { ok: false, error: 'قيمة الهدايا تتجاوز الحد الآمن.', code: 'bad' };
            if (quote.total >= GIFT_CONFIRM_AT && m.confirm !== true)
                return { ok: false, error: `مجموع ${(quote.total * 20).toLocaleString('en-US')} عملة لجميع المستلمين يحتاج تأكيد.`, code: 'confirm', total: quote.total };
            if (m.to.some((to) => !accounts.has(to) || !wallet.has(to) || platform.isBanned(to)))
                return { ok: false, error: 'أحد المستلمين غير متاح. لم تُرسل أي هدية.', code: 'noto' };
            const fromName = accounts.nameOf(user.id) || user.name, toNames = Object.fromEntries(m.to.map((to) => [to, accounts.nameOf(to) || 'لاعب']));
            const r = wallet.sendGiftBatch(user.id, m.to, g, m.qty, m.key, scope, fromName, toNames);
            if (!r.ok)
                return { ok: false, error: r.code === 'poor' ? 'عملاتك ما تكفي للمجموع. ما انرسلت أي هدية.' : r.code === 'self' ? 'ما تقدر ترسل هدية لنفسك.' : 'طلب الهدايا مب صالح. لم تُرسل أي هدية.', code: r.code };
            if (!r.dup) {
                for (const child of r.receipts)
                    cpGift(user.id, child.to, child.rec);
                sendToUser(user.id, { t: 'wallet', coins: r.coins, gems: r.gems, won: 0 });
                for (const child of r.receipts) {
                    sendToUser(child.to, { t: 'wallet', coins: child.toCoins, gems: child.toGems, won: 0 });
                    const incoming = { ...child.rec, dir: 'in' };
                    sendToUser(child.to, { t: 'gift', gift: giftPub(incoming), ev: giftEvent(child.rec, true) });
                }
            }
            return { ok: true, dup: r.dup, batchId: r.batchId, coins: r.coins, gems: r.gems, gifts: r.receipts.map(c => giftPub(c.rec)), evs: r.receipts.map(c => giftEvent(c.rec, true)), aggregate: r.quote };
        };
        const giftCmd = async (user, t, m, trustedSocial) => {
            const id = user.id;
            if (t === 'gift:list') {
                const pop = wallet.giftPopularity();
                return { ok: true, cur: 'gems', coins: wallet.balance(id), gems: wallet.gems(id), policy: GIFT_REWARD_POLICY,
                    cats: GIFT_CATS.map(({ id: c, name, icon }) => ({ id: c, name, icon })), virtual: VIRTUAL_CATS, rarity: RARITY, confirmAt: GIFT_CONFIRM_AT, qty: GIFT_QTY, socialQuantity: { min: 1, max: Math.max(...GIFT_QTY) },
                    gifts: giftcat.active().map(g => ({ id: g.id, name: g.name, cat: g.cat, price: g.price, cur: 'gems', rarity: g.rarity, motif: g.motif, variant: g.variant, fx: g.fx, added: g.added, icon: g.icon, sent: pop[g.id] ?? 0,
                        rewardQuotes: Object.fromEntries(GIFT_QTY.map(q => { const r = quoteGiftRewards(g.price, q); return [String(q), r && r.total <= 1_000_000 ? r : null]; })) })) };
            }
            if (t === 'gift:log')
                return { ok: true, received: wallet.giftsOf(id, 'in').map(giftPub), sent: wallet.giftsOf(id, 'out').map(giftPub) };
            if (t === 'room:chat') {
                const r = await service.humansFor(user, m.code);
                if (!r)
                    return { ok: false, error: 'مو عضو بالغرفة.' };
                return { ok: true, log: roomChat.get(r.code) ?? [] };
            }
            if (t === 'gift:find') {
                const q = typeof m.q === 'string' ? m.q.trim().slice(0, 20) : '';
                if (q.length < 2)
                    return { ok: false, error: 'اكتب حرفين على الأقل من اسم اللاعب.' };
                return { ok: true, players: accounts.findByName(q, id, 20).filter(p => !platform.isBanned(p.id) && wallet.has(p.id)).slice(0, 8).map(p => ({ ...p, av: wallet.equippedAvatar(p.id) })) };
            }
            if (Array.isArray(m.to)) {
                if (!trustedSocial)
                    return { ok: false, error: 'الهدايا المتعددة تحتاج المجلس الموثق.', code: 'bad' };
                return giftBatchCmd(user, m, trustedSocial.room);
            }
            const qty = m.qty === undefined ? 1 : m.qty, to = typeof m.to === 'string' ? m.to : '', context = trustedSocial?.room ?? (m.code === undefined ? '' : String(m.code).toUpperCase());
            if (!Number.isSafeInteger(qty) || (trustedSocial ? (qty < 1 || qty > Math.max(...GIFT_QTY)) : !GIFT_QTY.includes(qty)))
                return { ok: false, error: 'العدد غير صالح.', code: 'qty' };
            if (!to || to === id)
                return { ok: false, error: to === id ? 'ما تقدر ترسل هدية لنفسك.' : 'اختر لاعبًا مستلمًا.', code: 'self' };
            // A committed historical request replays before reading current catalog/price/policy.
            // The social HTTP bridge still checks current membership first.
            const previous = typeof m.key === 'string' ? wallet.giftByKey(id, m.key) : null;
            if (previous) {
                if (previous.to !== to || previous.gift !== m.gift || (previous.qty ?? 1) !== qty || (previous.room ?? '') !== context)
                    return { ok: false, error: 'مفتاح الطلب مستخدم لعملية مختلفة.', code: 'bad' };
                deliverIntent('gift:' + previous.id);
                return { ok: true, dup: true, coins: wallet.balance(id), gems: wallet.gems(id), gift: giftPub(previous), ev: giftEvent(previous, !!trustedSocial) };
            }
            const g = giftcat.get(m.gift);
            if (!g || !g.active)
                return { ok: false, error: 'هذي الهدية غير متاحة.' };
            if (m.seen !== undefined && m.seen !== g.price)
                return { ok: false, error: 'تغيّر سعر الهدية. راجع السعر الجديد.', code: 'price' };
            // An old unresolved client is never silently charged gems under a quote it did not see.
            if (m.seenPolicy !== GIFT_REWARD_POLICY.id)
                return { ok: false, error: 'تغيّرت حسبة الهدية. حدّث الهدايا وراجع تكلفة الجواهر والعائد قبل الإرسال.', code: 'price' };
            const quote = quoteGiftRewards(g.price, qty);
            if (!quote || quote.total > 1_000_000)
                return { ok: false, error: 'قيمة الهدية تتجاوز الحد الآمن.', code: 'bad' };
            if (quote.total >= GIFT_CONFIRM_AT && m.confirm !== true)
                return { ok: false, error: `هدية بقيمة ${(quote.total * 20).toLocaleString('en-US')} عملة تحتاج تأكيد.`, code: 'confirm', total: quote.total };
            let room = null;
            if (!trustedSocial && m.code !== undefined) {
                room = await service.humansFor(user, m.code);
                if (!room)
                    return { ok: false, error: 'لازم تكون عضوًا بالغرفة عشان ترسل منها.' };
                if (!room.players.some(p => p.id === to))
                    return { ok: false, error: 'المستلم مو موجود بالغرفة الحين.', code: 'noto' };
            }
            if (!accounts.has(to) || !wallet.has(to) || platform.isBanned(to))
                return { ok: false, error: 'هذا اللاعب غير متاح لاستلام الهدايا.', code: 'noto' };
            const fromName = accounts.nameOf(id) || user.name, toName = room?.players.find(p => p.id === to)?.name || accounts.nameOf(to) || 'لاعب';
            const r = wallet.sendGift(id, to, g, String(m.key ?? ''), fromName, toName, { qty, room: trustedSocial?.room ?? room?.code });
            if (!r.ok)
                return { ok: false, error: r.code === 'poor' ? 'عملاتك ما تكفي لهذي الهدية.' : r.code === 'self' ? 'ما تقدر ترسل هدية لنفسك.' : r.code === 'noto' ? 'هذا اللاعب غير متاح لاستلام الهدايا.' : 'طلب غير صالح.', code: r.code };
            const ev = giftEvent(r.rec, !!trustedSocial);
            if (!r.dup) {
                cpGift(id, to, r.rec);
                sendToUser(id, { t: 'wallet', coins: r.coins, gems: r.gems, won: 0 });
                sendToUser(to, { t: 'wallet', coins: r.toCoins, gems: r.toGems, won: 0 });
                if (room) {
                    pushChat(room.code, ev);
                    for (const p of room.players)
                        sendToUser(p.id, { t: 'roomgift', code: room.code, ev });
                }
                else
                    sendToUser(to, { t: 'gift', gift: giftPub(wallet.giftsOf(to, 'in', 1)[0]), ev: { ...ev, from: { id: trustedSocial ? community.pub(id) : '', name: fromName } } });
            }
            return { ok: true, dup: r.dup, coins: r.coins, gems: r.gems, gift: giftPub(r.rec), ev };
        };
        /** Receipt currency belongs to the transaction, not current catalog policy. No private account IDs. */
        const giftPub = (r) => {
            const c = giftcat.get(r.gift);
            return { id: r.id, ts: r.ts, dir: r.dir, from: r.fromName, to: r.toName, gift: r.gift, name: r.name, icon: r.icon, price: r.price, qty: r.qty ?? 1, total: r.total ?? r.price, recv: r.recv ?? 0, house: r.house ?? 0, room: !!r.room,
                motif: c?.motif ?? 'legacy:' + r.gift, variant: c?.variant ?? 0, cat: c?.cat ?? 'normal', currency: r.cur ?? 'coins', rewardCurrency: r.rewardCur ?? r.cur ?? 'coins', prepaid: r.prepaid === true,
                ...(r.rewardPolicy ? { rewardPolicy: r.rewardPolicy, senderBonus: r.senderBonus } : {}) };
        };
        wallet.onTx = (id, kind, delta, balance, ref) => accounts.tx(id, kind, delta, balance, ref);
        wallet.onCampaignTxBatch = (rows) => accounts.txCampaignBatch(rows);
        wallet.onBeforeGift = (from, to, ref, ts) => {
            const socialSupport = socialRooms.reserveGiftSupport(from, to, ts);
            const cannonSupport = socialRooms.reserveCannonGiftContext(from, to, ts);
            return reserveIntent('gift:' + ref, { kind: 'gift', from, to, eventRef: ref, ...(socialSupport ? { socialSupport } : {}), ...(cannonSupport ? { cannonSupport } : {}) }, ts);
        };
        wallet.onGift = (from, to, ref) => deliverIntent('gift:' + ref, activeIntents.has('gift:' + ref));
        // جائزة تأخر حفظها ثم انحفظت: نكمّل سجل اللعبة ونبلّغ اللاعب (قبل كذا ما ظهر له شيء)
        wallet.onSettled = (key, out) => {
            for (const [id, n] of Object.entries(out)) {
                accounts.patchCoins(key, id, n);
                sendToUser(id, { t: 'wallet', coins: wallet.balance(id), won: n });
            }
        };
        wallet.onPayoutError = (code) => log('wallet_payout_retry_failed', { code });
        const pendingWrites = new PendingWrites();
        const retryStorage = () => {
            const retries = [['server-sessions', () => sessions.retry()], ['economy', () => economy.retry()], ['progression', () => progression.retry()], ['community', () => community.retry()], ['gifts', () => giftcat.retry()], ['city', () => city.retry()], ['wallet', () => wallet.retryPending()], ['leaderboard', () => board.retry()], ['accounts', () => accounts.retry()], ['identities', () => identities.retry()], ['platform', () => platform.retry()], ['shop', () => shopcat.retry()], ['approvals', () => admin.resumeApprovals()]];
            retries.push(['account-tools', () => accountTools.retry()], ['social-private', () => social.retry()], ['support-notifications', () => support.retry()], ['outbox', replayIntents], ['bulk-preview', () => admin.retryBulk()]);
            retries.push(['rank-rewards', () => rankRewards.retry()], ['profile-social', () => profileSocial.retry()]);
            vipMembership.retry();
            if (!pendingWrites.has('vip-membership'))
                void pendingWrites.track('vip-membership', () => vipMembership.sweep()).catch(() => log('vip_membership_retry_failed'));
            if (!pendingWrites.has('social-sweep'))
                void pendingWrites.track('social-sweep', () => socialRooms.sweep()).catch(() => log('social_sweep_failed'));
            const socialHealth = socialRooms.health();
            if ((!socialHealth.ready || socialHealth.auditPending > 0) && !pendingWrites.has('social-retry'))
                void pendingWrites.track('social-retry', () => socialRooms.retry()).catch(() => log('social_retry_failed'));
            if (!pendingWrites.has('payments'))
                void pendingWrites.track('payments', () => Promise.resolve(payments.retry())).catch(() => log('payments_retry_failed'));
            if (!pendingWrites.has('missions'))
                void pendingWrites.track('missions', () => missions.retry()).catch(() => log('mission_retry_failed'));
            if (!pendingWrites.has('rank-rewards'))
                void pendingWrites.track('rank-rewards', () => rankRewards.retryPending()).catch(() => log('rank_reward_retry_failed'));
            for (const [store, retry] of retries) {
                try {
                    retry();
                }
                catch {
                    log('storage_retry_failed', { store, code: 'RETRY_EXCEPTION' });
                }
            }
            if (!pendingWrites.has('financial-reconcile'))
                void reconcileFinished();
        };
        const sockets = new Map();
        onlineNow = (id) => (sockets.get(id)?.size ?? 0) > 0;
        /* R62: دقايق المايك للمهام — عينة كل دقيقة، وتنحفظ دفعة كل 5 دقايق */
        const micBatch = new Map();
        let micTicks = 0;
        const micTimer = setInterval(() => {
            try {
                for (const id of socialRooms.seatedNow())
                    if (!isGuest(id))
                        micBatch.set(id, (micBatch.get(id) ?? 0) + 1);
            }
            catch { /* */ }
            if (++micTicks % 5 === 0 && micBatch.size) {
                const b = new Map(micBatch);
                micBatch.clear();
                try {
                    missions.micMinutes(b);
                }
                catch (e) {
                    log('mic_minutes_failed', { error: String(e.message).slice(0, 100) });
                }
            }
        }, 60_000);
        micTimer.unref?.();
        try {
            missions.seedDefaults([
                { id: 'daily-mic-15', title: 'اقعد على المايك 15 دقيقة', scope: 'daily', metric: 'micMinutes', goal: 15, active: true, rewards: { coins: 300 } },
                { id: 'daily-gifts-3', title: 'أرسل 3 هدايا', scope: 'daily', metric: 'giftsSent', goal: 3, active: true, rewards: { coins: 200 } },
                { id: 'daily-games-2', title: 'العب جولتين', scope: 'daily', metric: 'gamesPlayed', goal: 2, active: true, rewards: { coins: 200 } },
                { id: 'weekly-mic-120', title: 'ساعتين على المايك هالأسبوع', scope: 'weekly', metric: 'micMinutes', goal: 120, active: true, rewards: { coins: 600 } },
                { id: 'weekly-games-15', title: 'العب 15 جولة هالأسبوع', scope: 'weekly', metric: 'gamesPlayed', goal: 15, active: true, rewards: { coins: 2000 } },
            ]);
            if (!siteFlags.migrated('weekly-r68z')) {
                missions.addMissing([
                    { id: 'weekly-wins-5', title: 'افز بـ 5 مباريات هالأسبوع', scope: 'weekly', metric: 'gamesWon', goal: 5, active: true, rewards: { coins: 1500 } },
                    { id: 'weekly-gifts-10', title: 'أرسل 10 هدايا هالأسبوع', scope: 'weekly', metric: 'giftsSent', goal: 10, active: true, rewards: { coins: 1500 } },
                    { id: 'weekly-recv-10', title: 'استلم 10 هدايا هالأسبوع', scope: 'weekly', metric: 'giftsReceived', goal: 10, active: true, rewards: { coins: 1000 } },
                ]);
                siteFlags.markMigrated('weekly-r68z');
            }
        }
        catch (e) {
            log('missions_seed_failed', { error: String(e.message).slice(0, 100) });
        }
        /* R62: الأجهزة + تنبيه الدخول من جهاز جديد */
        const devices = new Devices(cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'devices.json') : '', (uid, label, hash) => {
            const body = `انفتح حسابك من جهاز جديد: ${label}. لو مب أنت، افتح الإعدادات ← «الأجهزة اللي سجّلت الدخول منها» واضغط «مب أنا» عشان نطلّعه.`;
            support.announce([uid], '🔐 دخول جديد لحسابك', body, 'الأمان', `newdev-${hash.slice(0, 24)}`);
            if (webPush?.count(uid))
                void webPush.send(uid, { title: '🔐 دخول جديد لحسابك', body, url: '#/devices', tag: 'newdev' }).catch(() => { });
        }, storage);
        const kickRevoked = (uid) => sockets.get(uid)?.forEach((ws) => { const b = socketSessions.get(ws); try {
            if (!b || sessions.cookieUser(b.cookie)?.id !== uid)
                ws.close(4401, 'session ended');
        }
        catch { /* */ } });
        const streak = new DailyStreak(cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'daily-streak.json') : '', Date.now, storage);
        const socketSessions = new WeakMap();
        const closeSessionSockets = (cookie) => {
            const hash = sessionTokenHash(cookie);
            for (const peers of sockets.values())
                for (const ws of peers)
                    if (hash && socketSessions.get(ws)?.hash === hash)
                        ws.close(4401, 'session ended');
        };
        const issueSession = (user) => {
            const cookie = sessionCookie(user, cfg.cookieSecret, cfg.cookieSecure);
            sessions.registerCookie(cookie);
            return cookie;
        };
        const send = (ws, msg) => {
            if (ws.readyState === 1)
                ws.send(JSON.stringify(msg));
        };
        const sendToUser = (id, msg) => sockets.get(id)?.forEach((ws) => {
            const bound = socketSessions.get(ws);
            try {
                if (!bound || sessions.cookieUser(bound.cookie)?.id !== id) {
                    ws.close(4401, 'session ended');
                    return;
                }
            }
            catch {
                ws.close(4503, 'session storage unavailable');
                return;
            }
            send(ws, msg);
        });
        /** R58f: تنبيهات الأصدقاء (دخل الموقع / دخل غرفة). للأصدقاء المقبولين المتصلين بس، وما تطلع إذا الشخص قفّل «إظهار التواجد» بنفسه. */
        const friendNoticeAt = new Map();
        const notifyFriends = (userId, build, key, gap) => {
            try {
                if (privacyOn(userId, 'showPresence'))
                    return;
                const now = Date.now(), last = friendNoticeAt.get(key) ?? 0;
                if (now - last < gap)
                    return;
                friendNoticeAt.set(key, now);
                if (friendNoticeAt.size > 20000)
                    for (const [k, t] of friendNoticeAt)
                        if (now - t > 3600_000)
                            friendNoticeAt.delete(k);
                for (const f of social.friendInternalIds(userId)) {
                    if (!sockets.has(f)) {
                        if (webPush?.count(f)) {
                            const msg = build(f);
                            if (msg?.t === 'friend:room' && msg.room?.id)
                                pushTo([f], { title: `صاحبك ${msg.name || ''} دخل غرفة`, body: `«${msg.room.name || ''}» — تعال سولف وياه`, url: `#/social-room/${msg.room.id}`, tag: 'friend-room-' + userId.slice(0, 8) });
                        }
                        continue;
                    }
                    const msg = build(f);
                    if (msg)
                        sendToUser(f, msg);
                }
            }
            catch { /* التنبيه شكلي، ما يوقف شي */ }
        };
        const service = new RoomService(store, registry, cfg, {
            onBeforeGameFinished(room, players, winners, ref, ts) {
                return reserveGame(ref, players, winners, ts);
            },
            noRewards: (id) => isGuest(id),
            onGameFinished(room, players, winners, ref) {
                deliverIntent('game:' + ref);
                {
                    const gn = registry.historyEngine(room.gameId)?.info.name ?? room.gameId;
                    for (const p of players)
                        activity.note(p.id, 'game', room.code, `${gn}${winners.includes(p.id) ? ' — فاز 🏆' : ''}${room.stake ? ` · رسم ${room.stake}` : ''}`);
                }
            },
            onRoom(room) {
                if (room.status !== 'lobby' && room.gameNo) {
                    try {
                        const ref = `${room.code}:${room.gameNo}`;
                        if (!(room.status === 'finished' && replays.meta(ref))) {
                            const humans = room.players.filter((p) => !p.bot);
                            const viewer = replays.viewerOf(ref) ?? humans[0]?.id;
                            if (viewer) {
                                replays.frame(ref, room.gameId, viewer, humans.map((p) => ({ id: p.id, name: p.name })), service.snapshot(room, viewer));
                                if (room.status === 'finished')
                                    replays.finish(ref);
                            }
                        }
                    }
                    catch (e) {
                        log('replay_frame_failed', { error: String(e).slice(0, 100) });
                    }
                }
                for (const p of room.players) {
                    if (p.bot || p.left)
                        continue;
                    sendToUser(p.id, { t: 'room', room: service.snapshot(room, p.id) });
                }
            },
            onReact(room, fromId, fromName, text) {
                const eventId = randomUUID(), ts = Date.now();
                pushChat(room.code, { k: 'react', eventId, ts, from: { id: fromId, name: fromName }, text });
                for (const p of room.players)
                    if (!p.bot && !p.left)
                        sendToUser(p.id, { t: 'react', code: room.code, eventId, ts, from: fromId, name: fromName, text });
            },
            onGone(code, ids, reason) {
                if (reason !== 'left')
                    roomChat.delete(code);
                for (const id of ids)
                    sendToUser(id, { t: 'gone', code, reason });
            },
            onWallet(id, coins, won) {
                sendToUser(id, { t: 'wallet', coins, won });
            },
            prizeBonus: () => siteFlags.get().prizeBonus,
            log,
        }, Date.now, board, wallet, accounts, (id) => avatars.version(id), (id) => wallet.equippedAvatar(id), (id) => {
            const equipped = Object.fromEntries(Object.entries(equippedView(id)).filter(([slot]) => slot !== 'avatar').map(([slot, item]) => [slot, { ...item, art: typeof item.art === 'string' ? (item.art.startsWith('/') ? item.art : '/assets/' + item.art) : undefined }]));
            return { ...verificationView(id), progression: progression.view(id), equipped };
        });
        let financialReconcilePending = true;
        const reconcileFinished = async () => {
            try {
                const report = await pendingWrites.track('financial-reconcile', () => service.reconcileFinished(100));
                financialReconcilePending = !!(report.pending || report.failed || report.remaining);
                if (financialReconcilePending)
                    log('finished_payout_reconcile_pending', report);
            }
            catch {
                financialReconcilePending = true;
                log('finished_payout_reconcile_failed', { code: 'RECONCILE_EXCEPTION' });
            }
        };
        // مصالحة مالية فقط، مب إعادة تاريخ نتائج الحسابات أو progression. قبل listen وأول readiness.
        await reconcileFinished();
        await service.restorePresence();
        const mm = new Matchmaker(service, registry, sendToUser, wallet, (id) => sendToUser(id, { t: 'wallet', coins: wallet.balance(id), won: 0 }));
        const sessionLimiter = new KeyedLimiter(cfg.sessionBurst, cfg.sessionBurst / 60);
        const ipOf = (req) => {
            if (trustProxy) {
                const xf = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
                if (xf)
                    return xf;
            }
            return req.socket.remoteAddress ?? 'unknown';
        };
        /** بصمة شبكة مجزّأة (HMAC بسر الكوكي)، لا نخزّن IP خام. تُستخدم كإشارة ناعمة فقط */
        const netHash = (req) => createHmac('sha256', cfg.cookieSecret).update('net:' + ipOf(req)).digest('hex').slice(0, 12);
        const noteNet = (id, req) => { try {
            platform.noteNet(id, netHash(req));
        }
        catch (e) {
            if (!(e instanceof StorageError))
                throw e;
            log('net_signal_unsaved', { store: e.store });
        } };
        /** شروط المباريات برسوم (المجانية ما تتأثر). يرجع رسالة منع أو null */
        const stakeGate = (id, rawStake) => {
            if (!(Number(rawStake) > 0))
                return null;
            if (paidGamesDisabled)
                return { error: 'الدفع للباقات والمظاهر فقط؛ الدخول بمقابل أو رهان مقفول في هالوضع. اللعب المجاني متاح.', code: 'paid_games_disabled' };
            if (platform.isSuspect(id))
                return { error: 'حسابك قيد المراجعة من الإدارة ولا يقدر يدخل مباريات برسوم حالياً. اللعب المجاني متاح.', code: 'suspect' };
            if (cfg.requireGoogleForStakes && cfg.googleClientId && !identities.linked(id))
                return { error: 'المباريات برسوم تتطلب ربط حسابك بـ Google (من صفحة ملفي). اللعب المجاني ما يتأثر ورصيدك وتقدمك يبقون.', code: 'google_required' };
            return null;
        };
        const sameOrigin = (req) => {
            const origin = req.headers.origin;
            if (!origin)
                return true;
            if (cfg.allowedOrigins.includes(origin))
                return true;
            try {
                // البروكسي لا يُوثق من رؤوس يرسلها العميل. أصل HTTPS الخلفي يُسمح به صراحةً في ALLOWED_ORIGINS.
                const protocol = req.socket.encrypted ? 'https:' : 'http:';
                return new URL(origin).origin === `${protocol}//${req.headers.host}`;
            }
            catch {
                return false;
            }
        };
        const requestResponses = new WeakMap();
        const bodyErrors = new WeakMap();
        const appReadBody = async (req, limit) => {
            try {
                return await readBody(req, limit);
            }
            catch (error) {
                const res = requestResponses.get(req);
                if (res && error instanceof BodyReadError)
                    bodyErrors.set(res, error);
                throw error;
            }
        };
        const json = (res, code, body, headers = {}) => {
            if (res.destroyed)
                return;
            // الإدارة والمجتمع عندهم catch عام يرجع 400؛ نحافظ على 413 الحقيقي في حد النقل المشترك.
            const transportError = bodyErrors.get(res);
            if (transportError) {
                code = transportError.status;
                body = { error: code === 413 ? 'الطلب كبير.' : 'الطلب غير صالح.' };
            }
            res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...securityHeaders, ...headers });
            res.end(JSON.stringify(body));
        };
        const staticCache = new Map();
        let staticCacheBytes = 0;
        async function serveStatic(req, res, pathname) {
            let rel = decodeURIComponent(pathname);
            if (rel.endsWith('/'))
                rel += 'index.html';
            const file = path.join(PUBLIC_DIR, path.normalize(rel));
            if (!file.startsWith(PUBLIC_DIR + path.sep))
                return json(res, 403, { error: 'ممنوع' });
            try {
                const st = await stat(file);
                if (!st.isFile())
                    throw new Error('nf');
                const ext = path.extname(file);
                // R60b (السرعة): ETag من الحجم ووقت التعديل → المتصفح يرجع 304 بدون ما ينزّل الملف من جديد
                const tag = `W/"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
                const noCache = ext === '.html' || ext === '.webmanifest' || path.basename(file) === 'sw.js';
                // الملف اللي طالب برقم نسخة (?v=) ما يتغير محتواه لنفس الرقم → كاش طويل
                const versioned = !noCache && /[?&]v=[^&]+/.test(req.url ?? '');
                const cacheControl = noCache ? 'no-cache' : versioned ? 'public, max-age=2592000, immutable' : 'public, max-age=3600';
                const wantsGz = st.size > 1024 && /\.(js|css|html|svg|webmanifest|json)$/.test(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
                const etag = wantsGz ? tag.slice(0, -1) + '-gz"' : tag;
                if (String(req.headers['if-none-match'] ?? '').split(/\s*,\s*/).includes(etag)) {
                    res.writeHead(304, { ETag: etag, 'Cache-Control': cacheControl, ...(wantsGz ? { Vary: 'Accept-Encoding' } : {}), ...securityHeaders });
                    res.end();
                    return;
                }
                let body;
                let gz = false;
                const hit = staticCache.get(file);
                if (hit && hit.size === st.size && hit.mtime === st.mtimeMs) {
                    body = wantsGz && hit.gz ? hit.gz : hit.raw;
                    gz = wantsGz && !!hit.gz;
                }
                else {
                    const raw = await readFile(file);
                    const z = /\.(js|css|html|svg|webmanifest|json)$/.test(ext) && raw.length > 1024 ? gzipSync(raw) : null;
                    // نخزن الملفات الصغيرة والمتوسطة بس (حد أعلى للذاكرة)
                    if (raw.length <= 2_000_000) {
                        staticCacheBytes += raw.length + (z?.length ?? 0) - (hit ? hit.raw.length + (hit.gz?.length ?? 0) : 0);
                        staticCache.set(file, { size: st.size, mtime: st.mtimeMs, raw, gz: z });
                        if (staticCacheBytes > 160_000_000) {
                            staticCache.clear();
                            staticCacheBytes = 0;
                        }
                    }
                    body = wantsGz && z ? z : raw;
                    gz = wantsGz && !!z;
                }
                res.writeHead(200, {
                    ...(gz ? { 'Content-Encoding': 'gzip' } : {}), ...(wantsGz ? { Vary: 'Accept-Encoding' } : {}),
                    'Content-Type': MIME[ext] ?? 'application/octet-stream',
                    'Cache-Control': cacheControl, ETag: gz ? etag : tag,
                    ...securityHeaders,
                });
                res.end(req.method === 'HEAD' ? undefined : body);
            }
            catch {
                json(res, 404, { error: 'الصفحة غير موجودة' });
            }
        }
        /* المجتمع: نفس الجلسة والحسابات والحظر القائمة. معرّفات الحسابات ما تطلع للعميل (معرّف عام بالـHMAC) */
        const community = new Community(comFile, comMedia, {
            secret: cfg.cookieSecret, moderate: (t) => profanityOnly(t), official: (id) => verificationView(id).verificationKind === 'administration', hidden: (id) => deletion.hidden(id), nameOf: (id) => accounts.nameOf(id), avOf: (id) => wallet.equippedAvatar(id), stats: (id) => accountTools.settings(id).showActivity ? accounts.publicStats(id) : null,
            hasAccount: (id) => accounts.has(id), allIds: () => accounts.all().map((a) => a.id), isBanned: (id) => platform.isBanned(id),
            push: (id, msg) => sendToUser(id, msg), log, postsHidden: (id) => accountTools.settings(id).hidePosts === true,
            animTier: (id) => profileAnimTier(id),
            phoneOk: (id) => phoneVerify.verified(id),
            adminIdOf: (id) => { const v = accounts.displayPlayerId(id); return v && /^[1-9]\d{2}$/.test(v) ? v : null; },
            pcardOf: (id) => { const iid = wallet.equipped(id).pcard; const it = iid ? shopcat.get(iid) : undefined; if (!it || it.slot !== 'pcard' || !wallet.owned(id).includes(it.id) || typeof it.css !== 'string')
                return null; const pv = progression.view(id); return { css: it.css, level: pv.level.enabled ? pv.level.value : null, vip: pv.vip.enabled && pv.vip.value && /^V(\d+)$/.test(pv.vip.value) ? Number(pv.vip.value.slice(1)) : 0 }; },
            profileBg: (id) => { const iid = wallet.equipped(id).bg; const it = iid ? shopcat.get(iid) : undefined; if (!it || it.slot !== 'bg')
                return null; const pv = progression.view(id); const vip = pv.vip.value && /^V(\d+)$/.test(pv.vip.value) ? Number(pv.vip.value.slice(1)) : 0; const full = accountTools.settings(id).flatProfileBg !== true && (it.rarity === 'legendary' || it.rarity === 'ultra' || vip >= siteFlags.get().profileBgVip); return { id: it.id, ...(it.css ? { css: it.css } : {}), ...(it.art ? { art: it.art } : {}), ...(it.rarity ? { rarity: it.rarity } : {}), full }; },
        }, Date.now, storage, opts.communityLimits);
        const social = new SocialPrivate(socialFile, Date.now, storage, {
            hasAccount: (id) => accounts.has(id), isBanned: (id) => platform.isBanned(id),
            resolvePublicId: pub => community.resolvePublicId(pub),
            adultSelfDeclared: id => { const age = accounts.socialAge(id); return age === null ? null : age >= 18; },
            isDeactivated: id => !accounts.has(id),
            isBlocked: (a, b) => community.pairBlocked(a, b), isMuted: (a, b) => community.isMuted(a, b),
            pub: (id) => community.pub(id), nameOf: (id) => accounts.nameOf(id),
        });
        /* R62: رسالة خاصة جديدة → إشعار جوال للمستلم لو مب فاتح الموقع */
        {
            const orig = social.send.bind(social);
            social.send = (me, other, input) => { const out = orig(me, other, input); try {
                if (out && !out.error && !out.duplicate && typeof input?.body === 'string')
                    pushTo([other], { title: `رسالة من ${accounts.nameOf(me) || 'صديق'}`, body: input.body.slice(0, 90), url: '#/messages', tag: 'dm-' + me.slice(0, 8) });
            }
            catch { /* */ } return out; };
        }
        const cpPoints = new CpPoints(cpFile, Date.now, storage);
        const tribes = new Tribes(process.env.TRIBES_FILE ?? besideSocial('tribes.json'), Date.now, storage);
        const treasure = new TribeTreasure(process.env.TRIBE_TREASURE_FILE ?? besideSocial('tribe-treasure.json'), Date.now, storage);
        // R58w: هدية بين طرفين بينهم ارتباط افتراضي (R47) ترفع نقاط CP
        const cpGift = (from, to, rec) => { try {
            if (rec.cur === 'gems') {
                const tv = rec.total ?? rec.price * (rec.qty ?? 1);
                tribes.addGift(from, tv);
                const tt = tribes.of(from);
                if (tt) {
                    const tr = socialRooms.ownerTopRoom(tt.leader);
                    const inside = !!tr && typeof rec.room === 'string' && rec.room.startsWith(`social:${tr.id}:`);
                    if (treasure.gift(tt.id, from, tv, inside).length)
                        settleTribe(tt.id);
                }
            }
        }
        catch { /* نقاط القبيلة بس */ } try {
            if (rec.cur !== 'gems')
                return;
            const c = social.coupleOf(from);
            if (!c || c.partner !== to || rec.ts < c.at)
                return;
            const v = rec.total ?? rec.price * (rec.qty ?? 1);
            cpPoints.giftToday(cpKey(c.id, from, to), v);
            if (cpPoints.add(cpKey(c.id, from, to), v))
                for (const id of [from, to])
                    sendToUser(id, { t: 'cp:update', kind: 'points' });
        }
        catch { /* الهدية انحفظت؛ نقاط CP بس */ } };
        /* R53: «من الذي رآني» و«ادعُ الأصدقاء» — نفس الحسابات والمعرّف العام والحظر والخصوصية القائمة؛ بدون أي حركة مالية */
        const profileSocial = new ProfileSocial(profileSocialFile, {
            hasAccount: (id) => accounts.has(id), isBanned: (id) => platform.isBanned(id), blocked: (a, b) => community.pairBlocked(a, b),
            hidesActivity: (id) => accountTools.settings(id).showActivity === false, sinceOf: (id) => accounts.sinceOf(id),
            viewerVip: (id) => tierOf(id).vip, needVip: VISITORS_VIP, stealthVisit: (id) => privacyOn(id, 'hideVisits'), inviteRewards: (me) => inviteRewardsView(me),
            resolvePublicId: (pub) => community.resolvePublicId(pub),
            who: (id) => { const photo = avatars.version(id); const lv = accounts.publicStats(id)?.level; return { publicId: community.pub(id), name: accounts.nameOf(id) || 'لاعب', avatar: photo !== null ? `/api/social/avatar?id=${community.pub(id)}&v=${photo}` : wallet.equippedAvatar(id), level: typeof lv === 'number' ? lv : null }; },
            log,
        }, Date.now, storage);
        const socialEligible = (id) => accounts.has(id) && !platform.isBanned(id) && (accounts.socialAge(id) === null || Number(accounts.socialAge(id)) >= 18);
        let socialVoice = null;
        const socialRooms = new SocialRooms({ file: socialRoomsFile, onEnter: (uid, rid, rn) => activity.note(uid, 'room', rid, rn), mon: storage, graceMs: cfg.reconnectGraceMs, gameVoiceSecret: cfg.cookieSecret,
            cannon: { wallet, catalog: shopcat, pendingCount: id => outbox.pending().filter(i => i.payload.kind === 'gift' && validCannonGiftContext(i.payload.cannonSupport) && i.payload.cannonSupport.cannonId === id).length,
                onAward: (id, eventId) => { sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 }); support.announce([id], 'مكافأة مدفع الغرفة', 'تمت إضافة الإطار والخلفية الدائمين إلى ملكيتك. حدّث المتجر لعرضهما.', 'room-cannon-r27', 'cannon:' + eventId); } },
            pendingChallengeGift: id => outbox.pending().some(intent => intent.payload.kind === 'gift' && validGiftSupportContext(intent.payload.socialSupport) && intent.payload.socialSupport.challengeId === id),
            pendingSupportCount: id => outbox.pending().filter(intent => intent.payload.kind === 'gift' && validGiftSupportContext(intent.payload.socialSupport) && (id === null || intent.payload.socialSupport.challengeId === id)).length,
            reconcileGift: (from, to, ref) => { if (wallet.hasGiftSource(from, to, ref))
                deliverIntent('gift:' + ref); },
            // R58: ليفل الغرفة من قيمة الهدايا الملتزمة بالمحفظة (جواهر داخل نفس الغرفة)
            giftValue: (from, to, ref, roomId) => { const rec = wallet.committedGiftReceipt(from, to, ref); if (!rec || rec.cur !== 'gems' || rec.status !== 'done' || typeof rec.room !== 'string' || !rec.room.startsWith(`social:${roomId}:`))
                return null; const v = rec.total ?? rec.price * (rec.qty ?? 1); return Number.isSafeInteger(v) && v > 0 ? v : null; },
            ownsItem: (userId, itemId) => wallet.owned(userId).includes(itemId),
            cinemaOff: () => !siteFlags.get().cinema,
            maskChat: (t) => maskBanned(t),
            roomLevelUp: (roomId, ownerId, name, from, to, members) => {
                for (let lv = from + 1; lv <= to && lv <= from + 50; lv++) {
                    const g = roomOwnerGift(lv);
                    if (g && accounts.has(ownerId)) {
                        try {
                            if (wallet.grant(ownerId, 'coins', g, `هدية ليفل الغرفة ${lv}`, `roomlv:${roomId}:${lv}`))
                                sendToUser(ownerId, { t: 'wallet', coins: wallet.balance(ownerId), gems: wallet.gems(ownerId), won: 0 });
                        }
                        catch { /* */ }
                    }
                }
                try {
                    support.announce([ownerId], `🎉 غرفتك وصلت Lv ${to}`, `مبروك! «${name}» وصلت Lv ${to}. افتح «ليفل الغرفة» تشوف المميزات الجديدة.`, 'الغرف', `roomlv-${roomId}-${to}`);
                }
                catch { /* */ }
                for (const id of new Set([...members, ownerId]))
                    sendToUser(id, { t: 'room:levelup', roomId, name, level: to });
            },
            roomIdItem: (userId, itemId) => { const it = shopcat.get(itemId); return it && it.slot === 'room-id' && wallet.owned(userId).includes(it.id) && typeof it.css === 'string' ? it.css : null; },
            moderate: (text, kind) => { const m = moderateText(text, kind); return m.ok ? { ok: true } : { ok: false, code: m.code }; },
            verifyGiftSupport: (context, rec) => {
                if (wallet.unsaved() || !wallet.hasGiftSource(rec.from, rec.to, rec.id))
                    return false;
                const proof = wallet.committedGiftReceipt(rec.from, rec.to, rec.id), intent = outbox.get('gift:' + rec.id), saved = intent?.payload.socialSupport;
                return !!proof && JSON.stringify(proof) === JSON.stringify(rec) && !!intent && intent.payload.from === rec.from && intent.payload.to === rec.to && intent.payload.eventRef === rec.id && validGiftSupportContext(saved) && ['roomId', 'councilId', 'challengeId', 'sourcePublic'].every(k => saved[k] === context[k]);
            },
            supportPublicActivity: id => { const settings = accountTools.settings(id); return settings.showActivity && settings.showPresence; },
            profile: id => {
                if (!accounts.has(id))
                    return null;
                const p = progression.view(id);
                const vip = p.vip.value && /^V(?:[1-9]|1[0-5])$/.test(p.vip.value) ? Number(p.vip.value.slice(1)) : 0;
                const noble = p.noble.value && /^N[1-9]$/.test(p.noble.value) ? Number(p.noble.value.slice(1)) : 0;
                const photo = avatars.version(id);
                const entrance = entranceView(id);
                const frame = equippedFrameView(wallet, shopcat, id);
                // R57: فقاعة الدردشة ولوحة الاسم المجهّزة (من مقتنيات المحفظة فقط)
                const eq = wallet.equipped(id), cosm = (slot) => { const it = eq[slot] ? shopcat.get(eq[slot]) : undefined; return it && it.slot === slot && typeof it.css === 'string' ? it.css : null; };
                const bubble = cosm('chat-bubble'), board = cosm('board'), micFrame = cosm('mic-frame'), voiceFx = cosm('voice-fx');
                return { id, publicId: community.pub(id), name: accounts.nameOf(id), avatar: photo !== null ? `/api/social/avatar?id=${community.pub(id)}&v=${photo}` : wallet.equippedAvatar(id), ...(frame ? { frame } : {}), ...(bubble ? { bubble } : {}), ...(board ? { board } : {}), ...(micFrame ? { micFrame } : {}), ...(voiceFx ? { voiceFx } : {}), ranks: { ...(accountTools.settings(id).hideNameColor === true ? { nameOff: true } : {}), ...(verificationView(id).verificationKind === 'administration' ? { official: true } : {}), level: p.level.enabled ? p.level.value : null, vip: p.vip.enabled ? vip : null, noble: p.noble.enabled ? noble : null }, ...(entrance && !privacyOn(id, 'hideEntrances') ? { entrance } : {}), ...(privacyOn(id, 'hideEntrances') ? { stealth: true } : {}) };
            },
            blocked: (a, b) => community.pairBlocked(a, b), eligible: socialEligible, trustedAdmin: id => id === 'token',
            emit: (ids, event) => { for (const id of ids)
                sendToUser(id, event); },
            disconnectMedia: id => socialVoice?.disconnectUser(id) ?? Promise.resolve(),
            audit: (actorId, action, targetId, reason) => { platform.audit({ actorId, actor: actorId === 'token' ? 'رمز الإدارة' : accounts.nameOf(actorId) || 'إدارة المنصة', role: actorId === 'token' ? 'owner' : platform.roleOf(actorId) || 'social-host', action: 'social.' + action, target: targetId, detail: reason }); }, });
        /* R62: مكافأة دعوة صديق — تنفحص كل 10 دقايق */
        const inviteRewards = new InviteRewards(cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'invite-rewards.json') : '', {
            invites: () => profileSocial.allInvites(), linked: (id) => identities.linked(id), games: (id) => accounts.rankedPlayed(id), usable: (id) => accounts.has(id) && !platform.isBanned(id),
            grant: (id, cur, amt, why, key) => { const ok = wallet.grant(id, cur, amt, why, key); if (ok)
                sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 }); return ok; },
            notify: (id, t, b, ref) => support.announce([id], t, b, 'دعوة صديق', ref), name: (id) => accounts.nameOf(id),
        }, storage);
        inviteRewardsView = (me) => inviteRewards.view(me);
        const inviteTimer = setInterval(() => { if (!siteFlags.get().invite)
            return; try {
            inviteRewards.run();
        }
        catch (e) {
            log('invite_rewards_failed', { error: String(e.message).slice(0, 100) });
        } }, 10 * 60_000);
        inviteTimer.unref?.();
        setTimeout(() => { if (!siteFlags.get().invite)
            return; try {
            inviteRewards.run();
        }
        catch { /* */ } }, 40_000).unref?.();
        socialVoice = new SocialVoice({ ...cfg.socialVoice, enabled: cfg.socialVoice?.enabled ?? false, upstream: cfg.socialVoice?.upstream ?? '', apiKey: cfg.socialVoice?.apiKey ?? '', apiSecret: cfg.socialVoice?.apiSecret ?? '', cookieSecret: cfg.cookieSecret,
            access: id => { const access = socialEligible(id) ? socialRooms.mediaAccess(id) : null; return access ? { ...access, id: community.pub(id) } : null; },
            authenticate: req => { const user = sessions.cookieUser(req.headers.cookie); return user && !admin.maintenanceBlock(user) && !admin.banBlock(user) && socialEligible(user.id) ? user : null; }, originAllowed: sameOrigin,
        });
        await socialRooms.init();
        const communityHandle = communityHttp(community, { json, readBody: appReadBody, sameOrigin, ipOf, security: securityHeaders, touch: (id, name) => accounts.ensure(id, name), onProfileView: (viewer, pub) => { const subject = community.resolvePublicId(pub); if (subject)
                profileSocial.recordVisit(viewer, subject); }, publicRelations: (pub, viewer) => { const subject = community.resolvePublicId(pub); return subject ? social.familyPublic(subject, viewer ?? undefined) : { couple: null }; } });
        const bulkGrants = new BulkGrants({
            dir: cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'bulk-grants') : '',
            monitor: storage,
            enabled: !!cfg.walletFile && platform.persistent,
            targets: (filter, asOf) => accounts.bulkTargets(filter, asOf).filter((p) => !platform.isBanned(p.id)),
            items: () => shopcat.all().filter((it) => it.active && it.permanent && !achOf(it.id)).map((it) => ({ id: it.id, name: it.name, icon: it.icon, slot: it.slot, active: it.active, permanent: it.permanent })),
            apply: (campaign, fingerprint, ids, rewards, reason) => wallet.grantCampaignBatch(campaign, fingerprint, ids, rewards, reason),
            authorized: (actor) => actor.id === 'token' ? !!process.env.ADMIN_TOKEN : !platform.isBanned(actor.id) && platform.bulkGrantAllowed(actor.id),
            audit: (event) => platform.auditOnce(event.key, { actorId: event.actor.id, actor: event.actor.name, role: event.actor.role, action: event.action, target: event.target, detail: event.detail }),
            onGranted: (ids) => { for (const id of ids)
                sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 }); },
            log,
            autoStart: false,
        });
        /* R61: نسخة احتياطية يومية (داخل مجلد البيانات/backups) — BACKUP_ENABLED=0 يطفيها، BACKUP_KEEP عدد النسخ، BACKUP_MEDIA=1 يضيف الصور */
        const backups = cfg.walletFile && process.env.BACKUP_ENABLED !== '0' ? new Backups({ dir: path.dirname(cfg.walletFile), keep: Number(process.env.BACKUP_KEEP) || 14, media: process.env.BACKUP_MEDIA === '1', log, extraFiles: () => [cfg.walletFile, boardFile, accFile, platFile, economyFile, progressionFile, shopFile, idFile, giftFile, cityFile, comFile, accountToolsFile, socialFile, socialRoomsFile, profileSocialFile, missionsFile, rankRewardsFile, supportFile, outboxFile, sessionsFile, paymentsFile, vipMembershipFile, cpFile].filter((v) => !!v) }) : null;
        backups?.start(Number(process.env.BACKUP_FIRST_DELAY_MS) || 120_000);
        /* R63: عملة وحدة — الجواهر تتحول لعملات (جوهرة = 20 عملة). أول مرة: نسخة احتياطية قبل التحويل. وبعدها كل دقيقة أي جواهر جديدة (جوايز قديمة) تتحول. */
        const SINGLE = process.env.SINGLE_CURRENCY !== '0';
        const sweepAll = (reason) => { if (!SINGLE)
            return 0; let n = 0, g = 0; for (const id of wallet.withGems()) {
            try {
                const x = wallet.sweepGems(id);
                if (x) {
                    n++;
                    g += x;
                    sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 });
                }
            }
            catch (e) {
                log('gems_sweep_failed', { error: String(e.message).slice(0, 80) });
            }
        } if (n)
            log('gems_swept', { reason, players: n, gems: g }); return n; };
        if (SINGLE) {
            const mark = cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'single-currency.json') : '';
            let first = true;
            try {
                if (mark)
                    first = !JSON.parse(readFileSync(mark, 'utf8')).migratedAt;
            }
            catch {
                first = true;
            }
            if (first && wallet.withGems().length) {
                try {
                    backups?.run('before-gems-to-coins');
                }
                catch (e) {
                    log('gems_backup_failed', { error: String(e.message).slice(0, 80) });
                }
            }
            const n = sweepAll('migration');
            if (mark && first) {
                try {
                    writeFileSync(mark, JSON.stringify({ migratedAt: Date.now(), players: n, rate: 20 }));
                }
                catch { /* */ }
            }
        }
        const gemsTimer = setInterval(() => sweepAll('periodic'), 60_000);
        gemsTimer.unref?.();
        /* R61: حالة الموقع للوحة التحكم — كل فحص يرجع ok/warn/bad مع شرح بالعربي */
        const bootAt = Date.now();
        async function healthReport() {
            const checks = [];
            const st = storage.status().stores;
            const vol = Object.entries(st).filter(([, v]) => v === 'volatile').map(([k]) => k), bad = Object.entries(st).filter(([, v]) => v !== 'ok' && v !== 'volatile').map(([k, v]) => `${k}: ${v}`);
            checks.push({ key: 'storage', label: 'حفظ البيانات', state: bad.length ? 'bad' : vol.length ? 'warn' : 'ok', detail: bad.length ? `فشل الحفظ: ${bad.join('، ')}` : vol.length ? `ما تنحفظ بملف (تضيع مع إعادة التشغيل): ${vol.join('، ')}` : `كل البيانات تنحفظ (${Object.keys(st).length} ملف)` });
            const pend = wallet.pendingCount();
            checks.push({ key: 'payouts', label: 'عمليات الرصيد المعلقة', state: pend > 20 ? 'bad' : pend > 0 ? 'warn' : 'ok', detail: pend ? `${pend} عملية تنتظر الحفظ` : 'ما فيه شي معلّق' });
            const b = backups?.status();
            checks.push({ key: 'backup', label: 'النسخة الاحتياطية', state: !b ? 'bad' : b.lastError ? 'bad' : !b.latest ? 'warn' : (b.ageHours ?? 99) > 30 ? 'bad' : 'ok', detail: !b ? 'مطفية (BACKUP_ENABLED=0 أو ما فيه WALLET_FILE)' : b.lastError ? `آخر محاولة فشلت: ${b.lastError}` : !b.latest ? 'ما انسوت أول نسخة للحين (تنسوي بعد دقيقتين من التشغيل)' : `آخر نسخة قبل ${b.ageHours} ساعة · ${b.count} نسخة محفوظة` });
            const v = socialVoice?.health();
            let lk = 'skip';
            if (v?.enabled && cfg.socialVoice?.upstream) {
                try {
                    const r = await fetch(new URL('/', cfg.socialVoice.upstream), { signal: AbortSignal.timeout(2500) });
                    lk = r.ok ? 'ok' : 'down';
                }
                catch {
                    lk = 'down';
                }
            }
            checks.push({ key: 'voice', label: 'الصوت بالغرف (LiveKit)', state: !v?.enabled ? 'warn' : !v.ready || lk === 'down' ? 'bad' : 'ok', detail: !v?.enabled ? 'الصوت مطفي بإعدادات الخادم (SOCIAL_VOICE_ENABLED)' : !v.ready ? `الصوت ما اشتغل: ${v.reason ?? 'سبب غير معروف'}` : lk === 'down' ? 'خادم LiveKit ما يرد على العنوان المضبوط' : `شغال · ${v.transports} اتصال صوتي الحين` });
            checks.push({ key: 'google', label: 'الدخول بـ Google', state: cfg.googleClientId ? 'ok' : 'warn', detail: cfg.googleClientId ? 'مضبوط' : 'مب مضبوط — الضيوف ما يقدرون يربطون حساباتهم' });
            const pm = cfg.payments?.mode ?? 'disabled';
            checks.push({ key: 'payments', label: 'الدفع', state: pm === 'live' ? 'ok' : 'warn', detail: pm === 'live' ? 'شغال (حقيقي)' : pm === 'test' ? 'وضع التجربة — ما فيه دفع حقيقي' : 'مطفي' });
            const wp = webPush?.status();
            checks.push({ key: 'push', label: 'إشعارات الجوال', state: !wp ? 'warn' : wp.lastError && wp.sent === 0 && wp.failed > 0 ? 'bad' : 'ok', detail: !wp ? 'مطفية' : `${wp.devices} جهاز مشترك · انرسل ${wp.sent}${wp.failed ? ` · فشل ${wp.failed} (${wp.lastError ?? ''})` : ''}` });
            const m = process.memoryUsage(), rss = Math.round(m.rss / 1048576);
            checks.push({ key: 'memory', label: 'ذاكرة الخادم', state: rss > 1200 ? 'bad' : rss > 700 ? 'warn' : 'ok', detail: `${rss} MB` });
            const players = sockets.size;
            return { ok: true, at: Date.now(), uptimeSec: Math.floor((Date.now() - bootAt) / 1000), players, rooms: (({ rooms, councils, members }) => ({ rooms, councils, members }))(socialRooms.health()), guests: { readOnly: GUEST_READONLY, lockAt: guestLockAt }, backups: b ?? null, checks, overall: checks.some((c) => c.state === 'bad') ? 'bad' : checks.some((c) => c.state === 'warn') ? 'warn' : 'ok' };
        }
        const admin = createAdmin({ community, giftcat, economy, payments, offers, backups: backups ?? undefined, health: healthReport,
            platform, shopcat, wallet, accounts, board, progression, accountTools, service, bulkGrants, store, storage, cfg, registry, sockets, log, json, readBody: appReadBody, sameOrigin, ipOf,
            kick: (id, why) => sockets.get(id)?.forEach((ws) => ws.close(why === 'banned' ? 4403 : 4503, why)),
            walletChanged: id => sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 }),
            errors: () => errRing, token: () => process.env.ADMIN_TOKEN ?? '',
            onAdminLogin: (e, owners) => { const to = owners.filter((id) => accounts.has(id)); if (!to.length)
                return; try {
                const t = new Date(e.at + 4 * 3_600_000).toISOString().slice(11, 16);
                support.announce(to, '🔐 دخول للوحة التحكم', `${e.actor} دخل لوحة التحكم الساعة ${t} من ${e.device} (شبكة ${e.net}). لو مو أنت أو مو من فريقك، غيّر رمز الإدارة فورًا.`, 'الأمان', `admlogin-${e.at}-${createHash('sha256').update(e.actor + e.net + e.device).digest('hex').slice(0, 16)}`);
            }
            catch { /* */ } },
        });
        bulkGrants.start();
        // موافقات عالقة (approving) من توقف سابق: تُستكمل الآن بتعديل idempotent، فلا تضيع الموافقة ولا يتكرر التعديل
        try {
            admin.resumeApprovals();
        }
        catch (e) {
            log('adj_resume_error', { message: e.message });
        }
        const webhook = paymentWebhookHandler(payments, json);
        let auctionAdminActorR47 = null;
        const auctionR47 = new AuctionR47(wallet, { item: id => shopcat.get(id), isAdmin: id => platform.roleOf(id) === 'owner' || auctionAdminActorR47 === id, canBid: (id, item) => accounts.has(id) && !platform.isBanned(id) && platform.roleOf(id) !== 'owner' && !!shopcat.get(item.id) && eligibleItem(id, shopcat.get(item.id)) });
        const functionalHttp = wireFunctionalRoutes(new FunctionalHttp({ json, sameOrigin, actorOf: admin.actorOf, isBanned: (id) => platform.isBanned(id), log }), {
            accounts, platform, community, accountTools, social, missions, rankRewards, support, online: () => [...sockets.keys()],
        });
        wireProfileSocialRoutes(functionalHttp, profileSocial, (id) => community.pub(id));
        // R58: أيديات الغرف المميزة اللي يملكها اللاعب (لاختيارها من إعدادات غرفته)
        // R58f: شريط الأصدقاء مثل انستغرام: صورة كل صديق، وإذا هو داخل غرفة ظاهرة تطلع عليه «في غرفة» وتدخل عليها مباشرة
        // R58w: CP = «الارتباط الافتراضي» (R47) + نقاط ومستوى من الهدايا بين الطرفين
        const cpPerson = (id) => { const photo = avatars.version(id); return { id: community.pub(id), name: accounts.nameOf(id), avatar: photo !== null ? `/api/social/avatar?id=${community.pub(id)}&v=${photo}` : (wallet.equippedAvatar(id) ?? null) }; };
        const cpStats = (c, me) => { const pts = cpPoints.get(cpKey(c.id, me, c.partner)); const lv = cpLevelOf(pts); return { pts, ...lv, days: Math.floor((Date.now() - c.at) / 86_400_000) + 1, since: c.at }; };
        functionalHttp.add('GET', '/api/cp/me', ({ user }) => { const age = accounts.socialAge(user.id); const c = social.coupleOf(user.id); let hidden = true; try {
            const snap = social.familySnapshot(user.id);
            hidden = !snap?.couple || snap.couple.hidden === true;
        }
        catch { /* حد القراءة: نخفي الشريك */ } return { ok: true, adult: age !== null && age >= 18, me: cpPerson(user.id), cp: c ? { partner: hidden ? null : cpPerson(c.partner), hidden, ...cpStats(c, user.id) } : null }; });
        // R67: مساحة CP — المهام اليومية (المكافأة نقاط CP بس)
        const cpTaskView = (me) => {
            const c = social.coupleOf(me);
            if (!c)
                return null;
            const key = cpKey(c.id, me, c.partner), day = cpPoints.day(key);
            const since = Date.parse(day.d + 'T00:00:00+04:00');
            const mineRoom = socialRooms.mediaAccess(me)?.roomId ?? null, theirRoom = socialRooms.mediaAccess(c.partner)?.roomId ?? null;
            const progress = { game: accounts.playedTogetherSince(me, c.partner, since), msg: social.pairMessagesSince(me, c.partner, since), room: mineRoom && mineRoom === theirRoom ? 1 : 0, gift: day.gift > 0 ? 1 : 0 };
            return { key, list: CP_TASKS.map((t) => ({ id: t.id, name: t.name, need: t.need, reward: t.reward, have: Math.min(t.need, progress[t.id] ?? 0), claimed: day.claimed.includes(t.id) })) };
        };
        // R67: بطاقة البيانات الشخصية + بطاقة المملكة بالملف
        functionalHttp.add('GET', '/api/profile-cards/me', ({ user }) => {
            const c = social.coupleOf(user.id);
            let cpName = null;
            try {
                const snap = social.familySnapshot(user.id);
                if (c && snap?.couple && snap.couple.hidden !== true)
                    cpName = accounts.nameOf(c.partner);
            }
            catch { /* مخفي */ }
            const t = tribes.of(user.id);
            const pv = progression.view(user.id), vip = pv.vip.value && /^V(?:[1-9]|1[0-5])$/.test(pv.vip.value) ? Number(pv.vip.value.slice(1)) : 0, noble = pv.noble.value && /^N[1-9]$/.test(pv.noble.value) ? Number(pv.noble.value.slice(1)) : 0;
            return { ok: true, me: cpPerson(user.id), ranks: { vip, noble }, cp: cpName, tribe: t ? t.name : null, gifts: wallet.giftCounts(user.id), friends: social.friendsCount(user.id), kingdom: socialRooms.kingdomView(user.id, user.id) };
        });
        functionalHttp.add('GET', '/api/cp/tasks', ({ user }) => { const v = cpTaskView(user.id); return { ok: true, tasks: v ? v.list : [] }; });
        functionalHttp.add('POST', '/api/cp/tasks/:id/claim', ({ user, params }) => {
            const v = cpTaskView(user.id);
            if (!v)
                return { ok: false, error: 'ما عندك CP.' };
            const t = v.list.find((x) => x.id === params.id);
            if (!t)
                return { ok: false, error: 'المهمة غير موجودة.' };
            if (t.claimed)
                return { ok: false, error: 'استلمتها اليوم.' };
            if (t.have < t.need)
                return { ok: false, error: 'المهمة ما خلصت للحين.' };
            if (!cpPoints.claim(v.key, t.id, t.reward))
                return { ok: false, error: 'تعذّر الحفظ، جرّب بعد شوي.' };
            const c = social.coupleOf(user.id);
            if (c)
                for (const id of [user.id, c.partner])
                    sendToUser(id, { t: 'cp:update', kind: 'points' });
            return { ok: true, tasks: cpTaskView(user.id)?.list ?? [] };
        });
        functionalHttp.add('GET', '/api/cp/of/:pub', ({ user, params }) => {
            const id = community.resolvePublicId(String(params.pub ?? ''));
            if (!id || !accounts.has(id))
                return { ok: false, error: 'الحساب غير متاح.' };
            const pub = social.familyPublic(id, user.id);
            const c = social.coupleOf(id);
            const shown = !!pub?.couple && !!c && community.pub(c.partner) === pub.couple.partnerPub;
            const myAge = accounts.socialAge(user.id), theirAge = accounts.socialAge(id);
            return { ok: true, cp: shown && c ? { partner: cpPerson(c.partner), ...cpStats(c, id) } : null, canRequest: id !== user.id && !c && !social.coupleOf(user.id) && myAge !== null && myAge >= 18 && theirAge !== null && theirAge >= 18 };
        });
        // R58x: القبائل (نظام عام منفصل عن العائلة الخاصة)
        const tribeRun = (fn) => { try {
            return fn();
        }
        catch (e) {
            if (e instanceof TribeError)
                return { ok: false, code: e.code, error: TRIBE_ERR[e.code] ?? 'تعذّر تنفيذ الطلب.' };
            throw e;
        } };
        const tribeCard = (t) => { const lv = tribeLevelOf(t.pts); return { id: t.id, name: t.name, level: lv.level, levelName: lv.name, cap: lv.cap, floor: lv.floor, next: lv.next, pts: t.pts, monthPts: tribes.monthPts(t), members: t.members.length }; };
        const tribeView = (t, viewer) => ({ ...tribeCard(t), leader: cpPerson(t.leader), isLeader: t.leader === viewer, isMember: t.members.some((m) => m.id === viewer), requested: t.requests.some((r) => r.id === viewer),
            list: [...t.members].sort((a, b) => b.pts - a.pts).filter((m) => !community.pairBlocked(viewer, m.id)).map((m) => ({ ...cpPerson(m.id), pts: m.pts, leader: m.id === t.leader })),
            requests: t.leader === viewer ? t.requests.filter((r) => accounts.has(r.id)).map((r) => ({ ...cpPerson(r.id), at: r.at })) : [] });
        const tribeEligible = (id) => { const lv = socialRooms.ownerMaxRoomLevel(id); return { roomLevel: lv, need: TRIBE_ROOM_LEVEL, canCreate: socialEligible(id) && lv >= TRIBE_ROOM_LEVEL && !tribes.of(id) }; };
        /* R60: صفحة «إعدادات الخصوصية» — القيم + الرتبة + شرط كل خيار (القفل نفسه بالخادم) */
        functionalHttp.add('GET', '/api/privacy', ({ user }) => {
            const t = tierOf(user.id), st = accountTools.settings(user.id);
            return { ok: true, vip: t.vip, noble: t.noble, settings: st, visitorsVip: VISITORS_VIP, visitorsOpen: t.vip >= VISITORS_VIP,
                gates: Object.fromEntries(Object.entries(PRIVACY_GATES).map(([k, g]) => [k, { vip: g.vip, noble: g.noble, allowed: privacyAllowed(user.id, k) }])) };
        });
        const tribePush = (ids) => { for (const id of ids)
            sendToUser(id, { t: 'tribe:update' }); };
        /* R59: كنز القبيلة — صاروخ القبيلة (كل 3 مليون هيبة أسبوعية)، المهام، المكافأة، والمتجر */
        function settleTribe(tribeId) {
            if (wallet.unsaved())
                return;
            for (const { week, l } of treasure.pendingLaunches(tribeId)) {
                try {
                    for (const g of launchGrants(tribeId, week, l)) {
                        const res = wallet.grantCampaignBatch(g.campaignId, g.fp, g.ids, { coins: g.coins, gems: g.gems, itemIds: g.itemIds }, g.reason);
                        if (res.some((x) => x.status === 'failed' && x.code !== 'BALANCE_OVERFLOW'))
                            return;
                    }
                }
                catch {
                    return;
                }
                treasure.markDone(tribeId, l.n);
                // R66: عملة وحدة — جوايز الصاروخ (المحسوبة بالجواهر) تتحول عملات للفايزين على طول بدل ما تنتظر دورة التحويل كل دقيقة
                if (process.env.SINGLE_CURRENCY !== '0')
                    for (const id of l.winners) {
                        try {
                            if (wallet.sweepGems(id))
                                sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 });
                        }
                        catch { /* دورة التحويل الدورية تكمّلها */ }
                    }
                const t = tribes.get(tribeId);
                if (!t)
                    continue;
                const p = planetOfLaunch(l.n);
                const ev = { id: `tribe-${tribeId}-${week}-${l.n}`, n: l.n, planet: p.name, stage: ((l.n - 1) % 7) + 1, winners: l.winners.map((id, k) => ({ rank: k + 1, ...cpPerson(id) })), luck: l.luck ? cpPerson(l.luck) : null };
                for (const m of t.members) {
                    const k = l.winners.indexOf(m.id);
                    sendToUser(m.id, { t: 'tribe:rocket', event: { ...ev, mine: k >= 0 ? { rank: k + 1, gems: p.prizes[k], gifts: p.gifts[k].map((x) => x.name) } : l.luck === m.id ? { rank: 0, gems: 0, gifts: [p.luck.name] } : null } });
                    sendToUser(m.id, { t: 'tribe:update' });
                }
            }
        }
        /* R62: حرب القبائل الأسبوعية — تقسيم وتحديث نتائج كل 5 دقايق، والتسوية أول ما يبدأ أسبوع جديد */
        const war = new TribeWar(besideSocial('tribe-war.json'), storage);
        const warTick = () => {
            try {
                const wk = weekKeyOf(Date.now());
                for (const done of war.settle(wk))
                    for (const r of done.results) {
                        const A = tribes.get(r.a), Bt = tribes.get(r.b);
                        if (!A || !Bt)
                            continue;
                        const award = (t, each, title, body) => { const ids = t.members.map((m) => m.id); treasure.addFuel(ids, each); support.announce(ids, title, body, 'حرب القبائل', `war-${done.week}-${t.id}`); tribePush(ids); };
                        if (r.winner === null) {
                            for (const t of [A, Bt])
                                award(t, WAR_FUEL.draw, 'حرب القبائل: تعادل!', `تعادلتوا مع قبيلة «${(t === A ? Bt : A).name}». كل عضو أخذ ${WAR_FUEL.draw} وقود.`);
                        }
                        else {
                            const w = r.winner === A.id ? A : Bt, l = w === A ? Bt : A;
                            award(w, WAR_FUEL.win, 'فزتوا بحرب القبائل! 🏆', `قبيلتكم غلبت «${l.name}» (${Math.max(r.sa, r.sb).toLocaleString('en-US')} ضد ${Math.min(r.sa, r.sb).toLocaleString('en-US')}). كل عضو أخذ ${WAR_FUEL.win} وقود.`);
                        }
                    }
                war.ensure(wk, tribes.top(500).filter((t) => t.members.length >= WAR_FUEL.minMembers).map((t) => t.id));
                war.update(wk, (id) => treasure.weekPts(id));
            }
            catch (e) {
                log('tribe_war_failed', { error: String(e.message).slice(0, 120) });
            }
        };
        setTimeout(warTick, 20_000).unref?.();
        const warTimer = setInterval(warTick, 5 * 60_000);
        warTimer.unref?.();
        /* R62: موسم الترتيب الشهري */
        const season = new MonthlySeason(cfg.walletFile ? path.join(path.dirname(cfg.walletFile), 'season.json') : '', {
            rows: (start) => board.monthRows(start, 10), grant: (c, fp, ids, r, why) => wallet.grantCampaignBatch(c, fp, ids, r, why),
            itemOk: (id) => !!shopcat.get(id), notify: (id, t, b, ref) => { support.announce([id], t, b, 'موسم الترتيب', ref); sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 }); }, log,
        }, storage);
        const monthKey = (start) => new Date(start + 4 * 3600_000).toISOString().slice(0, 7);
        const seasonTick = () => { try {
            const cur = monthStartOf(Date.now());
            const prev = monthStartOf(cur - 1);
            if (cur > season.since)
                season.settle(monthKey(prev), prev);
        }
        catch (e) {
            log('season_failed', { error: String(e.message).slice(0, 120) });
        } };
        setTimeout(seasonTick, 30_000).unref?.();
        const seasonTimer = setInterval(seasonTick, 30 * 60_000);
        seasonTimer.unref?.();
        const seasonView = () => { const now = Date.now(), start = monthStartOf(now); return { ok: true, label: monthLabel(monthKey(start)), endsAt: nextMonthStartOf(now), prizes: SEASON_PRIZES.map((p) => ({ ...p, item: p.itemId ? (({ id, name }) => ({ id, name }))(shopcat.get(p.itemId) ?? { id: p.itemId, name: '' }) : null })), last: season.last() }; };
        const warView = (t) => {
            const v = war.view(weekKeyOf(Date.now()), t.id);
            const name = (id) => (id !== null ? tribes.get(id)?.name : null) ?? null;
            return { ...v, mine: Math.max(v.mine, treasure.weekPts(t.id)), theirs: v.opponent !== null ? Math.max(v.theirs, treasure.weekPts(v.opponent)) : 0, opponentName: name(v.opponent), last: v.last ? { ...v.last, opponentName: name(v.last.opponent) } : null, prize: WAR_FUEL };
        };
        const treasureRun = (fn) => { try {
            return fn();
        }
        catch (e) {
            if (e instanceof TreasureError)
                return { ok: false, code: e.code, error: TREASURE_ERR[e.code] ?? 'تعذّر تنفيذ الطلب.' };
            throw e;
        } };
        const myTribe = (id) => { const t = tribes.of(id); if (!t)
            throw new TreasureError('no_tribe'); return t; };
        const treasureView = (t, viewer) => {
            const v = treasure.view(t.id, viewer);
            const room = socialRooms.ownerTopRoom(t.leader);
            return { ok: true, tribe: { ...tribeCard(t), createdDays: Math.max(1, Math.ceil((Date.now() - t.at) / 86_400_000)), room, dayPts: v.dayPts, weekPts: v.weekPts, wealth: v.wealth },
                rocket: { count: v.rockets, toNext: v.toNext, per: v.per, nextPlanet: v.nextPlanet, launches: v.launches.map((l) => ({ ...l, winners: l.winners.map((id, k) => ({ rank: k + 1, ...cpPerson(id) })), luck: l.luck ? cpPerson(l.luck) : null })) },
                tasks: TRIBE_TASKS.map((x) => ({ ...x, done: v.me.done.includes(x.id) })), boxes: TRIBE_BOXES.map((b) => ({ ...b, open: v.weekPts >= b.need, claimed: v.me.boxes.includes(b.level) })),
                war: warView(t), shop: TRIBE_SHOP, me: { fuel: v.me.fuel, dayPts: v.me.dayPts, weekPts: v.me.weekPts, bag: v.me.bag, coinsWeek: v.me.coinsWeek, coins: wallet.balance(viewer) } };
        };
        functionalHttp.add('GET', '/api/tribes/treasure', ({ user }) => treasureRun(() => treasureView(myTribe(user.id), user.id)));
        functionalHttp.add('POST', '/api/tribes/treasure/task', ({ user, body }) => treasureRun(() => {
            const t = myTribe(user.id);
            const id = String(body?.id ?? '');
            if (id === 'stay') {
                const room = socialRooms.ownerTopRoom(t.leader);
                const since = room ? socialRooms.presenceSince(user.id, room.id) : null;
                if (since === null || Date.now() - since < 5 * 60_000)
                    throw new TreasureError('stay');
            }
            else if (id !== 'checkin')
                throw new TreasureError('item');
            if (treasure.task(t.id, user.id, id).length)
                settleTribe(t.id);
            return treasureView(t, user.id);
        }));
        functionalHttp.add('POST', '/api/tribes/treasure/box', ({ user, body }) => treasureRun(() => { const t = myTribe(user.id); treasure.claimBox(t.id, user.id, Number(body?.level)); return treasureView(t, user.id); }));
        functionalHttp.add('POST', '/api/tribes/treasure/buy', ({ user, body }) => treasureRun(() => {
            const t = myTribe(user.id);
            const r = treasure.buy(t.id, user.id, String(body?.item ?? ''));
            if (r.grant) {
                const res = wallet.grantCampaignBatch(r.grant.campaignId, r.grant.fp, r.grant.ids, { coins: r.grant.coins, gems: 0, itemIds: [] }, r.grant.reason);
                const w = res[0];
                if (w && w.status !== 'failed')
                    sendToUser(user.id, { t: 'wallet', coins: wallet.balance(user.id), gems: wallet.gems(user.id), won: 0 });
            }
            return treasureView(t, user.id);
        }));
        functionalHttp.add('POST', '/api/tribes/treasure/send-bag', ({ user, body }) => treasureRun(() => { const t = myTribe(user.id); const r = treasure.sendBag(user.id, String(body?.bag ?? ''), t.members.map((m) => m.id)); for (const id of r.ids)
            sendToUser(id, { t: 'tribe:update' }); return { ...treasureView(t, user.id), sent: r.each }; }));
        functionalHttp.add('GET', '/api/tribes/me', ({ user }) => { const t = tribes.of(user.id); return { ok: true, eligible: socialEligible(user.id), create: tribeEligible(user.id), tribe: t ? tribeView(t, user.id) : null, requested: tribes.requestedBy(user.id).map(tribeCard) }; });
        functionalHttp.add('GET', '/api/tribes/top', () => ({ ok: true, list: tribes.top(30).map(tribeCard) }));
        functionalHttp.add('GET', '/api/tribes/:id', ({ user, params }) => { const t = tribes.get(Number(params.id)); return t ? { ok: true, tribe: tribeView(t, user.id) } : { ok: false, error: TRIBE_ERR.not_found }; });
        functionalHttp.add('GET', '/api/tribes/of/:pub', ({ params }) => { const id = community.resolvePublicId(String(params.pub ?? '')); const t = id ? tribes.of(id) : null; return { ok: true, tribe: t ? tribeCard(t) : null }; });
        functionalHttp.add('POST', '/api/tribes/create', ({ user, body }) => tribeRun(() => { if (!socialEligible(user.id))
            throw new TribeError('ineligible'); if (socialRooms.ownerMaxRoomLevel(user.id) < TRIBE_ROOM_LEVEL)
            throw new TribeError('room_level'); const name = String(body?.name ?? ''); const mod = moderateText(name, 'room-name'); if (!mod.ok)
            return { ok: false, code: mod.code, error: mod.message }; const t = tribes.create(user.id, name); return { ok: true, tribe: tribeView(t, user.id) }; }));
        functionalHttp.add('POST', '/api/tribes/:id/join', ({ user, params }) => tribeRun(() => { if (!socialEligible(user.id))
            throw new TribeError('ineligible'); const t = tribes.get(Number(params.id)); if (!t)
            throw new TribeError('not_found'); if (community.pairBlocked(user.id, t.leader))
            throw new TribeError('not_found'); tribes.join(user.id, t.id); tribePush([t.leader]); return { ok: true }; }));
        functionalHttp.add('POST', '/api/tribes/:id/cancel', ({ user, params }) => tribeRun(() => { tribes.cancelJoin(user.id, Number(params.id)); return { ok: true }; }));
        functionalHttp.add('POST', '/api/tribes/:id/respond', ({ user, params, body }) => tribeRun(() => { const b = body; const who = community.resolvePublicId(String(b?.user ?? '')); if (!who)
            throw new TribeError('no_request'); if (b?.accept === true && !socialEligible(who)) {
            tribes.respond(user.id, Number(params.id), who, false);
            throw new TribeError('ineligible');
        } tribes.respond(user.id, Number(params.id), who, b?.accept === true); tribePush([who]); return { ok: true }; }));
        functionalHttp.add('POST', '/api/tribes/:id/kick', ({ user, params, body }) => tribeRun(() => { const who = community.resolvePublicId(String(body?.user ?? '')); if (!who)
            throw new TribeError('not_member'); tribes.kick(user.id, Number(params.id), who); tribePush([who]); return { ok: true }; }));
        functionalHttp.add('POST', '/api/tribes/leave', ({ user }) => tribeRun(() => { tribes.leave(user.id); return { ok: true }; }));
        functionalHttp.add('POST', '/api/tribes/disband', ({ user }) => tribeRun(() => { const t = tribes.disband(user.id); tribePush(t.members.map((m) => m.id).filter((x) => x !== user.id)); return { ok: true }; }));
        // R67ae: لوحة الإدارة — القبائل وCP والصاروخ والمدفع (المالك فقط، وكل تعديل ينسجل بالتدقيق)
        {
            const nm = (id) => accounts.nameOf(id) || id.slice(0, 8);
            const adminNeed = (c, m) => { if (!c)
                throw new FunctionalHttpError(400, m); };
            const tribeAdminRun = (fn) => { try {
                return fn();
            }
            catch (e) {
                if (e instanceof TribeError)
                    throw new FunctionalHttpError(400, TRIBE_ERR[e.code] ?? 'تعذّر التنفيذ.');
                throw e;
            } };
            functionalHttp.add('GET', '/api/admin/tribes-cp', () => {
                const wk = weekKeyOf(Date.now());
                const list = tribes.all().map((t) => ({ id: t.id, name: t.name, leader: nm(t.leader), leaderId: t.leader, at: t.at, members: t.members.map((m) => ({ id: m.id, name: nm(m.id), pts: m.pts, leader: m.id === t.leader })), pts: t.pts, monthPts: tribes.monthPts(t), weekPts: treasure.weekPts(t.id), level: tribeLevelOf(t.pts) }))
                    .sort((a, b) => b.monthPts - a.monthPts || b.pts - a.pts);
                const couples = social.allCouples().map((c) => { const pts = cpPoints.get(cpKey(c.id, c.a, c.b)); return { id: c.id, a: nm(c.a), b: nm(c.b), at: c.at, pts, level: cpLevelOf(pts) }; }).sort((x, y) => y.pts - x.pts);
                return {
                    ok: true, week: wk, tribes: list, couples,
                    config: {
                        tribeLevels: TRIBE_LEVELS, warFuel: WAR_FUEL, rocketPrestige: ROCKET_PRESTIGE,
                        rocket: ROCKET_PLANETS.map((p) => ({ stage: p.stage, name: p.name, goal: p.goal, prizes: p.prizes, gifts: p.gifts.map((g) => g.map((x) => x.name)), luck: p.luck.name })),
                        cannon: CANNON3_LEVELS.map((l) => ({ level: l.level, goal: l.goal, coins: l.coins, top1: l.top1.name, items: l.items.map((x) => x.name) })),
                        cpLevels: CP_LEVELS.map((min, i) => ({ min, name: CP_LEVEL_NAMES[i] })), cpTasks: CP_TASKS,
                    },
                };
            }, 'owner');
            functionalHttp.add('POST', '/api/admin/tribes-cp/tribe', ({ actor, body }) => {
                const id = Number(body.id), op = String(body.op ?? ''), reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(Number.isSafeInteger(id) && id > 0, 'رقم القبيلة غير صالح.');
                adminNeed(reason.length >= 3, 'اكتب سبب التعديل.');
                const before = tribes.get(id);
                adminNeed(!!before, 'القبيلة غير موجودة.');
                const ids = before.members.map((m) => m.id);
                let detail = '';
                if (op === 'rename') {
                    const t = tribeAdminRun(() => tribes.adminRename(id, String(body.name ?? '')));
                    detail = `${before.name} → ${t.name}`;
                }
                else if (op === 'kick') {
                    const u = String(body.user ?? '');
                    tribeAdminRun(() => tribes.adminKick(id, u));
                    detail = `طرد ${nm(u)}`;
                }
                else if (op === 'disband') {
                    tribeAdminRun(() => tribes.adminDisband(id));
                    detail = `حل القبيلة ${before.name}`;
                }
                else
                    throw new FunctionalHttpError(400, 'عملية غير معروفة.');
                tribePush(ids);
                const auditOk = admin.audit(actor, 'tribe.' + op, 'tribe:' + id, `${detail} — ${reason}`);
                return { ok: true, auditOk };
            }, 'owner');
            functionalHttp.add('GET', '/api/admin/site-flags', () => ({ ok: true, flags: siteFlags.get(), meta: siteFlags.meta(), envFirstTopup: Number(process.env.FIRST_TOPUP_BONUS ?? 100), firstTopupNow: firstTopup.percent }), 'owner');
            functionalHttp.add('POST', '/api/admin/site-flags', ({ actor, body }) => {
                const reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(reason.length >= 3, 'اكتب سبب التعديل.');
                const input = { ...body };
                delete input.reason;
                let out;
                try {
                    out = siteFlags.update(input, actor.name);
                }
                catch (e) {
                    throw new FunctionalHttpError(400, e.message || 'تعذّر الحفظ.');
                }
                const auditOk = out.changed.length ? admin.audit(actor, 'site.flags', 'site-flags', out.changed.map((k) => `${k}: ${String(out.before[k])} → ${String(out.after[k])}`).join('، ') + ` — ${reason}`) : true;
                applyGameFlags();
                if (out.changed.includes('cinema') && !out.after.cinema) { /* الفيديوهات الشغالة تكمل لين يطفونها؛ ما نقدر نوقف الكل بأمر واحد بأمان */ }
                return { ok: true, flags: out.after, changed: out.changed, auditOk };
            }, 'owner');
            functionalHttp.add('GET', '/api/admin/live', () => { let online = 0; for (const set of sockets.values())
                if (set.size)
                    online++; const rooms = socialRooms.liveRooms(); return { ok: true, online, inRooms: rooms.reduce((n, r) => n + r.members, 0), rooms: rooms.slice(0, 50) }; }, 'owner');
            functionalHttp.add('GET', '/api/admin/player-360', ({ url }) => {
                const q = String(url.searchParams.get('q') ?? '').trim();
                adminNeed(q.length >= 2, 'اكتب اسم أو رقم لاعب (حرفين على الأقل).');
                const byDisplay = /^\d{3,12}$/.test(q) ? accounts.findByDisplayPlayerId(q) : null;
                const ql = q.toLowerCase();
                const ids = byDisplay ? [byDisplay] : accounts.has(q) ? [q] : accounts.all().filter((a) => (a.name ?? '').toLowerCase().includes(ql)).slice(0, 5).map((a) => a.id);
                const card = (id) => {
                    const pr = progress(id).progression;
                    const t = tribes.of(id);
                    const c = social.coupleOf(id);
                    const gs = wallet.giftsOf(id, 'out', 500), gr = wallet.giftsOf(id, 'in', 500);
                    const gv = (l) => l.reduce((n, g) => n + (g.total ?? g.price * (g.qty ?? 1)) * (g.cur === 'gems' ? 20 : 1), 0);
                    const ban = platform.banOf(id);
                    const acc = accounts.all().find((a) => a.id === id);
                    return { id, name: nm(id), displayId: accounts.displayPlayerId(id) ?? '', since: acc?.since ?? null, level: pr.level.value, vip: pr.vip.enabled ? pr.vip.value : null, noble: pr.noble.enabled ? pr.noble.value : null,
                        coins: wallet.balance(id), gems: wallet.gems(id), online: (sockets.get(id)?.size ?? 0) > 0, played: acc?.played ?? 0, wins: acc?.wins ?? 0,
                        giftsSent: { count: gs.length, value: gv(gs) }, giftsRecv: { count: gr.length, value: gv(gr) },
                        tribe: t ? { name: t.name, leader: t.leader === id } : null, cp: c ? { partner: nm(c.partner), pts: cpPoints.get(cpKey(c.id, id, c.partner)) } : null,
                        rooms: socialRooms.ownedRoomsOf(id), reports: community.reportsAgainst(id), ban: ban ? { reason: ban.reason ?? '', at: ban.at ?? null } : null,
                        owned: wallet.owned(id).length, staff: null };
                };
                return { ok: true, players: ids.map(card) };
            }, 'owner');
            // ---- R68z: لوحة التحكم الرئيسية (تصميم المالك) ----
            functionalHttp.add('GET', '/api/admin/dash68', ({ url }) => {
                const days = url.searchParams.get('days') === '30' ? 30 : 7;
                const DAY = 86_400_000;
                const now = Date.now();
                const dubaiDay = (t) => new Date(t + 4 * 3_600_000).toISOString().slice(0, 10);
                const from = now - days * DAY, prevFrom = now - 2 * days * DAY;
                const scan = accounts.dashScan();
                const pct = (a, b) => Math.max(-100, Math.min(999, b > 0 ? Math.round((a - b) / b * 1000) / 10 : (a > 0 ? 100 : 0)));
                // المستخدمين
                const users = scan.length, newNow = scan.filter((p) => p.since >= from).length, base = users - newNow;
                // النشطين: آخر نشاط + مباريات + مكافأة يومية
                const dayKeys = [];
                for (let i = days - 1; i >= 0; i--)
                    dayKeys.push(dubaiDay(now - i * DAY));
                const actDay = new Map(dayKeys.map((k) => [k, new Set()]));
                const gamesDay = new Map(dayKeys.map((k) => [k, new Set()]));
                const activeNow = new Set(), activePrev = new Set();
                const mark = (id, t) => { if (t >= from) {
                    activeNow.add(id);
                    actDay.get(dubaiDay(t))?.add(id);
                }
                else if (t >= prevFrom)
                    activePrev.add(id); };
                const gameStat = new Map();
                const matches = new Map();
                let coinsTotal = 0, coinsDelta = 0, salesNow = 0, salesPrev = 0;
                const feed = [];
                for (const p of scan) {
                    if (p.lastActiveAt)
                        mark(p.id, p.lastActiveAt);
                    mark(p.id, p.since);
                    for (const h of p.history) {
                        if (h.ts < prevFrom)
                            continue;
                        mark(p.id, h.ts);
                        const g = gameStat.get(h.game) ?? { now: new Set(), prev: new Set(), plays: 0 };
                        gameStat.set(h.game, g);
                        if (h.ts >= from) {
                            g.now.add(p.id);
                            g.plays++;
                            gamesDay.get(dubaiDay(h.ts))?.add(h.key);
                        }
                        else
                            g.prev.add(p.id);
                        const m = matches.get(h.key) ?? { ts: h.ts, game: h.game, ranked: h.ranked, stake: h.stake, players: h.players, winners: [] };
                        if (h.result === 'win')
                            m.winners.push(p.name);
                        matches.set(h.key, m);
                    }
                    for (const e of activity.of(p.id))
                        mark(p.id, e.t);
                    coinsTotal += wallet.balance(p.id);
                    for (const l of wallet.ledgerOf(p.id, 200)) {
                        if (l.ts < prevFrom)
                            continue;
                        if (l.kind === 'daily')
                            mark(p.id, l.ts);
                        if (l.ts >= from && l.cur === 'coins')
                            coinsDelta += l.delta;
                        if (l.kind === 'purchase' && l.delta < 0) {
                            const v = -l.delta * (l.cur === 'gems' ? 20 : 1);
                            if (l.ts >= from)
                                salesNow += v;
                            else
                                salesPrev += v;
                            if (now - l.ts < DAY)
                                feed.push({ t: l.ts, k: 'buy', title: 'شراء من المتجر', sub: `${l.reason.replace(/^شراء:?\s*/, '').slice(0, 40)} · ${p.name}` });
                        }
                        if ((l.kind === 'admin' || l.kind === 'reward') && l.cur === 'gems' && l.delta >= 1000 && now - l.ts < DAY)
                            feed.push({ t: l.ts, k: 'gem', title: `تم شحن ${l.delta.toLocaleString('en-US')} جوهرة`, sub: `إلى: ${p.name}` });
                    }
                    if (now - p.since < DAY)
                        feed.push({ t: p.since, k: 'user', title: 'لاعب جديد سجّل', sub: p.name });
                }
                for (const a of platform.auditList(30))
                    feed.push({ t: a.ts, k: a.action.includes('ban') ? 'ban' : 'admin', title: a.action === 'player.ban' ? 'حظر لاعب' : a.action === 'player.unban' ? 'رفع حظر لاعب' : a.action === 'games.control' ? 'تعديل إعدادات الألعاب' : a.action.startsWith('site.') ? 'تعديل إعدادات الموقع' : a.action.startsWith('shop.') ? 'تعديل بالمتجر' : 'إجراء إداري', sub: `${(a.detail || a.target).split(' — ').pop()} · ${a.actor}`.slice(0, 60) });
                feed.sort((a, b) => b.t - a.t);
                const gname = (id) => registry.historyEngine(id)?.info.name ?? id;
                const games = [...gameStat].map(([id, g]) => ({ id, name: gname(id), players: g.now.size, plays: g.plays, ch: pct(g.now.size, g.prev.size) })).filter((g) => g.players > 0).sort((a, b) => b.players - a.players || b.plays - a.plays).slice(0, 6);
                const recent = [...matches.values()].sort((a, b) => b.ts - a.ts).slice(0, 6).map((m) => ({ ts: m.ts, game: m.game, name: gname(m.game), mode: m.ranked ? 'تصنيف' : m.stake > 0 ? `رسم ${m.stake}` : 'ودّية', win: m.winners.length > 0, winner: m.winners[0] ?? '' }));
                const avatarOf = (id) => { const ph = avatars.version(id); return ph !== null ? `/api/social/avatar?id=${community.pub(id)}&v=${ph}` : wallet.equippedAvatar(id); };
                const top = [...scan].sort((a, b) => b.xp - a.xp || b.points - a.points).slice(0, 5).map((p) => ({ id: p.id, name: p.name, level: p.level, points: p.points, displayId: accounts.displayPlayerId(p.id) ?? '', avatar: avatarOf(p.id) }));
                let online = 0;
                for (const set of sockets.values())
                    if (set.size)
                        online++;
                const live = socialRooms.liveRooms().slice(0, 3).map((r, i) => ({ id: r.id, name: r.name, members: r.members, level: r.level, owner: r.owner, img: `/assets/art58/roombg/r${(i % 5) + 1}.jpg` }));
                return { ok: true, days, now,
                    kpi: { users: { v: users, ch: pct(users, base) }, active: { v: activeNow.size, ch: pct(activeNow.size, activePrev.size) }, coins: { v: coinsTotal, ch: pct(coinsTotal, coinsTotal - coinsDelta) }, sales: { v: salesNow, ch: pct(salesNow, salesPrev) } },
                    rate: users ? Math.round(activeNow.size / users * 100) : 0, online,
                    chart: dayKeys.map((d) => ({ d, active: actDay.get(d).size, games: gamesDay.get(d).size })),
                    live, games, feed: feed.slice(0, 6), matches: recent, top, bell: community.openReports() };
            }, 'owner');
            // ---- R68y: (8) كشف الحسابات المشبوهة ----
            const r68Who = (id) => { const acc = accounts.all().find((a) => a.id === id); return { id, name: nm(id), displayId: accounts.displayPlayerId(id) ?? '', since: acc?.since ?? null, banned: platform.isBanned(id), suspect: platform.isSuspect(id), phone: phoneVerify.verified(id), coins: wallet.balance(id) }; };
            const r68GiftVal = (g) => (g.total ?? g.price * (g.qty ?? 1)) * (g.cur === 'gems' ? 20 : 1);
            functionalHttp.add('GET', '/api/admin/suspicious', () => {
                const now = Date.now(), wk = now - 7 * 86_400_000, day = now - 86_400_000;
                const net = platform.netGroups(3).map((g) => ({ ref: g.ref, count: g.count, last: g.last, bannedHere: g.bannedHere, players: g.ids.map(r68Who) }));
                const evasion = platform.suspects().map((x) => ({ ...r68Who(x.id), of: x.ofName || nm(x.of), at: x.at })).sort((a, b) => b.at - a.at).slice(0, 50);
                const funnel = [];
                const pairs = new Map();
                for (const a of accounts.all()) {
                    const inn = wallet.giftsOf(a.id, 'in', 300).filter((g) => g.ts > wk && g.from !== a.id);
                    if (inn.length) {
                        const by = new Map();
                        let total = 0;
                        for (const g of inn) {
                            const v = r68GiftVal(g);
                            total += v;
                            by.set(g.from, (by.get(g.from) ?? 0) + v);
                            if (g.ts > day) {
                                const k = g.from + '>' + a.id;
                                const p = pairs.get(k) ?? { from: g.from, to: a.id, value: 0, count: 0 };
                                p.value += v;
                                p.count++;
                                pairs.set(k, p);
                            }
                        }
                        const [topId, topV] = [...by].sort((x, y) => y[1] - x[1])[0];
                        const young = !!a.since && now - a.since < 14 * 86_400_000;
                        if (total >= (young ? 50_000 : 300_000) && topV / total >= 0.7)
                            funnel.push({ player: r68Who(a.id), value: total, count: inn.length, top: r68Who(topId), share: Math.round(topV / total * 100), young });
                    }
                }
                const transfers = [...pairs.values()].filter((p) => p.value >= 500_000).sort((x, y) => y.value - x.value).slice(0, 30).map((p) => ({ from: p.from ? r68Who(p.from) : null, to: r68Who(p.to), value: p.value, count: p.count }));
                funnel.sort((x, y) => y.value - x.value);
                return { ok: true, net, evasion, funnel: funnel.slice(0, 30), transfers, at: now };
            }, 'owner');
            // ---- R68y: (9) التحكم بالألعاب ----
            functionalHttp.add('GET', '/api/admin/games-control', () => {
                const f = siteFlags.get();
                return { ok: true, games: [...GAME_STATUS0].map(([id, st]) => { const i = registry.historyEngine(id)?.info; return { id, name: i?.name ?? id, icon: i?.icon ?? '🎮', built: st === 'available', off: f.gamesOff.includes(id), waiting: mm.count(id) }; }), stakes: f.stakes, options: [...STAKE_OPTIONS], prizeBonus: f.prizeBonus, paidDisabled: paidGamesDisabled };
            }, 'owner');
            functionalHttp.add('POST', '/api/admin/games-control', ({ actor, body }) => {
                const reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(reason.length >= 3, 'اكتب سبب التعديل.');
                const input = {};
                if (body.gamesOff !== undefined) {
                    adminNeed(Array.isArray(body.gamesOff) && body.gamesOff.every((g) => GAME_STATUS0.has(String(g))), 'لعبة غير معروفة.');
                    input.gamesOff = body.gamesOff;
                }
                if (body.stakes !== undefined)
                    input.stakes = body.stakes;
                if (body.prizeBonus !== undefined)
                    input.prizeBonus = body.prizeBonus;
                let out;
                try {
                    out = siteFlags.update(input, actor.name);
                }
                catch (e) {
                    throw new FunctionalHttpError(400, e.message || 'تعذّر الحفظ.');
                }
                applyGameFlags();
                const auditOk = out.changed.length ? admin.audit(actor, 'games.control', 'games', out.changed.map((k) => `${k}: ${JSON.stringify(out.before[k])} → ${JSON.stringify(out.after[k])}`).join('، ') + ` — ${reason}`) : true;
                return { ok: true, changed: out.changed, auditOk };
            }, 'owner');
            // R68z: إعادة المباراة (للإدارة)
            functionalHttp.add('GET', '/api/admin/replay', ({ url }) => { const r = replays.load(String(url.searchParams.get('ref') ?? '')); if (!r)
                throw new FunctionalHttpError(404, 'الإعادة مو موجودة (ممكن قديمة أو قبل التحديث).'); return { ok: true, replay: { ...r, gameName: registry.historyEngine(r.game)?.info.name ?? r.game } }; }, 'owner');
            // R68z: الأيديات الثلاثية (100–999) — محجوزة للإدارة، المالك يعطيها ويسحبها من اللوحة
            const IDS3_FEATURED = (() => { const out = new Set(); for (let d = 1; d <= 9; d++) {
                out.add(String(d).repeat(3));
                out.add(d + '00');
                out.add(`${d}0${d}`);
            } for (let a = 1; a <= 7; a++) {
                out.add(`${a}${a + 1}${a + 2}`);
                out.add(`${a + 2}${a + 1}${a}`);
            } out.add('210'); out.add('313'); out.add('786'); return [...out].sort(); })();
            const ids3View = (v) => { const owner = accounts.findByDisplayPlayerId(v); return { value: v, owner: owner ? { id: owner, name: nm(owner) } : null }; };
            functionalHttp.add('GET', '/api/admin/ids3', ({ url }) => {
                const q = String(url.searchParams.get('q') ?? '').replace(/\D/g, '');
                const list = q ? (/^[1-9]\d{2}$/.test(q) ? [q] : IDS3_FEATURED.filter((v) => v.includes(q))) : IDS3_FEATURED;
                return { ok: true, list: list.map(ids3View), taken: IDS3_FEATURED.filter((v) => accounts.findByDisplayPlayerId(v)).length, total: IDS3_FEATURED.length };
            }, 'owner');
            functionalHttp.add('POST', '/api/admin/ids3', ({ actor, body }) => {
                const v = String(body.value ?? '');
                adminNeed(/^[1-9]\d{2}$/.test(v), 'الأيدي لازم يكون 3 أرقام (100–999).');
                const reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(reason.length >= 3, 'اكتب السبب.');
                const owner = accounts.findByDisplayPlayerId(v);
                if (body.op === 'take') {
                    adminNeed(!!owner, 'هذا الأيدي مو مع أحد.');
                    accounts.setSpecialPlayerId(owner, null);
                    admin.audit(actor, 'ids3.take', owner, `${v} — ${reason}`);
                    return { ok: true, item: ids3View(v) };
                }
                const q = String(body.player ?? '').trim();
                const target = /^\d{3,12}$/.test(q) ? accounts.findByDisplayPlayerId(q) : null;
                adminNeed(!!target, 'ما لقيت لاعب بهالرقم.');
                adminNeed(!owner || owner === target, 'هذا الأيدي مع لاعب ثاني، اسحبه أول.');
                try {
                    accounts.setSpecialPlayerId(target, v);
                }
                catch (e) {
                    throw new FunctionalHttpError(409, 'تعذّر إعطاء الأيدي.');
                }
                admin.audit(actor, 'ids3.give', target, `${v} — ${reason}`);
                return { ok: true, item: ids3View(v) };
            }, 'owner');
            // ---- R68y: (10) سجل اللاعب الكامل ----
            functionalHttp.add('GET', '/api/admin/player-log', ({ url }) => {
                const q = String(url.searchParams.get('q') ?? '').trim();
                adminNeed(q.length >= 2, 'اكتب رقم اللاعب أو اسمه.');
                const byDisplay = /^\d{3,12}$/.test(q) ? accounts.findByDisplayPlayerId(q) : null;
                const ql = q.toLowerCase();
                const ids = byDisplay ? [byDisplay] : accounts.has(q) ? [q] : accounts.all().filter((a) => (a.name ?? '').toLowerCase().includes(ql)).slice(0, 6).map((a) => a.id);
                if (ids.length !== 1)
                    return { ok: true, matches: ids.map(r68Who), player: null };
                const id = ids[0];
                const acc = accounts.all().find((a) => a.id === id);
                const pr = progress(id).progression;
                const ban = platform.banOf(id);
                const KIND = { start: 'رصيد البداية', daily: 'مكافأة يومية', entry_fee: 'رسم دخول لعبة', prize: 'جائزة لعبة', refund: 'استرجاع', purchase: 'شراء', reward: 'مكافأة', admin: 'تعديل من الإدارة', gift: 'هدية', transfer: 'تحويل/تبديل عملة' };
                const tl = [];
                for (const e of activity.of(id))
                    tl.push({ t: e.t, k: e.k, text: e.k === 'login' ? 'دخل الموقع' : e.k === 'room' ? `دخل غرفة «${e.label}»` : `لعب ${e.label}` });
                for (const l of wallet.ledgerOf(id, 200))
                    if (l.kind !== 'gift' && l.delta !== 0)
                        tl.push({ t: l.ts, k: l.kind === 'purchase' ? 'buy' : 'coin', text: `${KIND[l.kind] ?? l.kind}${l.reason ? ' — ' + l.reason : ''}`, delta: l.delta, cur: l.cur });
                for (const g of wallet.giftsOf(id, undefined, 150))
                    tl.push({ t: g.ts, k: g.dir === 'out' ? 'gift-out' : 'gift-in', text: g.dir === 'out' ? `أرسل ${g.name}${(g.qty ?? 1) > 1 ? ' ×' + g.qty : ''} إلى ${g.toName || nm(g.to)}` : `استلم ${g.name}${(g.qty ?? 1) > 1 ? ' ×' + g.qty : ''} من ${g.fromName || nm(g.from)}`, delta: g.dir === 'out' ? -r68GiftVal(g) : r68GiftVal(g), cur: 'coins' });
                const reports = community.reportsListAgainst(id, 30);
                for (const r of reports)
                    tl.push({ t: r.at, k: 'report', text: `بلاغ من ${r.by}: ${r.reason}${r.note ? ' — ' + r.note : ''}` });
                if (ban)
                    tl.push({ t: ban.at ?? 0, k: 'ban', text: `انحظر: ${ban.reason ?? ''}` });
                tl.sort((a, b) => b.t - a.t);
                const netRef = platform.netRefOf(id);
                const sameNet = netRef ? (platform.netGroups(2).find((g) => g.ref === netRef)?.ids ?? []).filter((x) => x !== id).map(r68Who) : [];
                return { ok: true, matches: [], player: { ...r68Who(id), level: pr.level.value, vip: pr.vip.enabled ? pr.vip.value : null, gems: wallet.gems(id), online: (sockets.get(id)?.size ?? 0) > 0, lastSeen: activity.lastSeen(id), played: acc?.played ?? 0, wins: acc?.wins ?? 0, ban: ban ? { reason: ban.reason ?? '', at: ban.at ?? null } : null, rooms: socialRooms.ownedRoomsOf(id), reportsCount: community.reportsAgainst(id), sameNet, replays: replays.of(id, 20).map((m) => ({ ...m, gameName: registry.historyEngine(m.game)?.info.name ?? m.game })), timeline: tl.slice(0, 400) } };
            }, 'owner');
            functionalHttp.add('POST', '/api/admin/message', ({ actor, body }) => {
                const id = String(body.id ?? ''), title = String(body.title ?? '').trim(), text = String(body.body ?? '').trim();
                adminNeed(accounts.has(id), 'اللاعب غير موجود.');
                adminNeed(title.length >= 3 && title.length <= 100, 'العنوان من 3 إلى 100 حرف.');
                adminNeed(text.length >= 3 && text.length <= 2000, 'الرسالة من 3 إلى 2000 حرف.');
                const ref = 'admmsg-' + createHash('sha256').update(id + title + text + String(body.key ?? '')).digest('hex').slice(0, 24);
                let out;
                try {
                    out = support.announce([id], title, text, 'الإدارة', ref);
                }
                catch (e) {
                    throw new FunctionalHttpError(400, e.message || 'تعذّر الإرسال.');
                }
                const auditOk = admin.audit(actor, 'message.send', id, `${title}`);
                return { ok: true, duplicate: !!out.duplicate, auditOk };
            }, 'owner');
            functionalHttp.add('GET', '/api/admin/events', () => ({ ok: true, now: Date.now(), events: siteFlags.events().reverse() }), 'owner');
            functionalHttp.add('POST', '/api/admin/events', ({ actor, body }) => {
                const reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(reason.length >= 3, 'اكتب سبب الفعالية.');
                let ev;
                try {
                    ev = body.op === 'end' ? siteFlags.endEvent(String(body.id ?? '')) : siteFlags.addEvent(body, actor.name);
                }
                catch (e) {
                    throw new FunctionalHttpError(400, e.message || 'تعذّر الحفظ.');
                }
                const auditOk = admin.audit(actor, body.op === 'end' ? 'event.end' : 'event.add', ev.id, `${ev.title}${ev.slot ? ' · ' + ev.slot : ''} — ${reason}`);
                return { ok: true, event: ev, auditOk };
            }, 'owner');
            functionalHttp.add('GET', '/api/admin/tuning', () => ({ ok: true, current: currentTuning(), defaults: TUNING_DEFAULT, meta: siteFlags.tuningMeta(), names: { rocket: ROCKET_PLANETS.map((p) => p.name), tribe: TRIBE_LEVELS.map((l) => l.name), cp: CP_LEVEL_NAMES } }), 'owner');
            functionalHttp.add('POST', '/api/admin/tuning', ({ actor, body }) => {
                const reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(reason.length >= 3, 'اكتب سبب التعديل.');
                const before = currentTuning();
                let next;
                try {
                    next = body.reset === true ? structuredClone(TUNING_DEFAULT) : validateTuning(body.patch, before);
                }
                catch (e) {
                    if (isTuningError(e))
                        throw new FunctionalHttpError(400, e.message);
                    throw e;
                }
                siteFlags.setTuning(body.reset === true ? null : next, actor.name);
                applyTuning(next);
                const changed = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(before[k]));
                const auditOk = admin.audit(actor, 'tuning.update', 'tuning', `${body.reset === true ? 'ترجيع الأصلي' : changed.join('، ') || 'بدون تغيير'} — ${reason}`);
                return { ok: true, current: currentTuning(), changed, auditOk };
            }, 'owner');
            const sendAll = (msg) => { const raw = JSON.stringify(msg); for (const peers of sockets.values())
                for (const ws of peers) {
                    try {
                        if (ws.readyState === 1)
                            ws.send(raw);
                    }
                    catch { /* */ }
                } };
            // R68t: الحزم المميزة بالمتجر — سعر الحزمة أقل من مجموع قطعها، وتنشرى مرة وحدة، واللي تملكه منها ينخصم من السعر
            const BUNDLES_R68 = [
                { id: 'starter', name: 'حزمة البداية', sub: 'مجموعة مختارة للمبتدئين', icon: 'gift', price: 12_000, items: ['av2-blob', 'frame2-bronze', 'art-bub-10', 'art-bd-01'] },
                { id: 'heroes', name: 'حزمة الأبطال', sub: 'إطار + فقاعة + إطار مايك + صورة رمزية', icon: 'lion', price: 249_000, items: ['art-f2-08', 'lux-bub-purple', 'art-mf-70', 'ref-p-av-07'] },
                { id: 'vip', name: 'حزمة VIP', sub: 'مظاهر أسطورية حصرية', icon: 'vip', price: 3_500_000, items: ['art-f2-11', 'lux-bub-legend', 'art-bd-28', 'art-pb-04'] },
            ];
            const coinsOf = (it) => it.currency === 'gems' ? it.price * 20 : it.price;
            const bundleView = (uid, b) => {
                const owned = new Set(wallet.owned(uid));
                const items = b.items.map((id) => shopcat.get(id)).filter((x) => !!x);
                const worth = items.reduce((n, i) => n + coinsOf(i), 0), missing = items.filter((i) => !owned.has(i.id)), missWorth = missing.reduce((n, i) => n + coinsOf(i), 0);
                const price = !missing.length ? 0 : missing.length === items.length ? b.price : Math.max(1000, Math.round(b.price * missWorth / Math.max(1, worth) / 1000) * 1000);
                return { id: b.id, name: b.name, sub: b.sub, icon: b.icon, price, fullPrice: b.price, worth, items: items.map((i) => ({ id: i.id, name: i.name, slot: i.slot, owned: owned.has(i.id) })), done: !missing.length };
            };
            functionalHttp.add('GET', '/api/shop/bundles', ({ user }) => ({ ok: true, list: BUNDLES_R68.map((b) => bundleView(user.id, b)) }));
            functionalHttp.add('POST', '/api/shop/bundles/buy', async ({ user, body }) => {
                const b = BUNDLES_R68.find((x) => x.id === body.id);
                if (!b)
                    throw new FunctionalHttpError(404, 'الحزمة غير موجودة.');
                const v = bundleView(user.id, b);
                if (v.done)
                    throw new FunctionalHttpError(409, 'تملك كل قطع هالحزمة.');
                if (body.seen !== v.price)
                    throw new FunctionalHttpError(409, 'تغير سعر الحزمة. حدّث الصفحة.');
                const missing = v.items.filter((i) => !i.owned).map((i) => i.id);
                const ref = `bundle:${b.id}:${missing.join(',')}`.slice(0, 120);
                const pay = wallet.spendService(user.id, v.price, `شراء ${b.name}`, ref);
                if (!pay.ok)
                    throw new FunctionalHttpError(pay.code === 'poor' ? 402 : 400, pay.code === 'poor' ? `رصيدك ما يكفي. الحزمة بـ ${v.price.toLocaleString('en-US')} عملة.` : 'تعذّر الدفع.');
                const op = ('bnd' + createHash('sha256').update(user.id + ref).digest('hex')).slice(0, 40);
                try {
                    const g = await wallet.grantBulk(op, [user.id], missing.map((itemId) => ({ type: 'item', itemId, mode: 'grant' })), `${b.name}`);
                    if (!missing.every((id) => wallet.owned(user.id).includes(id)) && !pay.dup)
                        throw new Error('grant_incomplete:' + JSON.stringify(g).slice(0, 80));
                }
                catch (e) {
                    if (!pay.dup)
                        wallet.grant(user.id, 'coins', v.price, `استرجاع ${b.name}`, 'refund:' + ref);
                    log('bundle_grant_failed', { bundle: b.id, err: String(e).slice(0, 120) });
                    throw new FunctionalHttpError(500, 'تعذّر تسليم الحزمة ورجعنا لك عملاتك.');
                }
                sendToUser(user.id, { t: 'wallet', coins: wallet.balance(user.id), gems: wallet.gems(user.id), won: 0 });
                return { ok: true, coins: wallet.balance(user.id), bundle: bundleView(user.id, b) };
            });
            // R68z: صندوق الأسبوع — يفتح لما تستلم كل مهام الأسبوع
            const WEEK_CHEST = 5000;
            const chestView = (uid) => { const v = missions.view(uid); const w = v.missions.filter((m) => m.scope === 'weekly' && m.active); const done = w.filter((m) => m.claimed).length; const key = `weekchest:${uid}:${v.windows.weekly.key}`; const opened = (wallet.ledgerOf(uid, 200)).some((l) => l.ref === key); return { total: w.length, done, coins: WEEK_CHEST, opened, ready: w.length > 0 && done === w.length && !opened, key, endAt: v.windows.weekly.endAt }; };
            functionalHttp.add('GET', '/api/missions/chest', ({ user }) => { const c = chestView(user.id); return { ok: true, total: c.total, done: c.done, coins: c.coins, opened: c.opened, ready: c.ready, endAt: c.endAt }; });
            functionalHttp.add('POST', '/api/missions/chest', ({ user }) => {
                const c = chestView(user.id);
                adminNeed(!c.opened, 'فتحت صندوق هالأسبوع من قبل.');
                adminNeed(c.ready, 'خلّص كل مهام الأسبوع واستلمها أول.');
                if (!wallet.grant(user.id, 'coins', WEEK_CHEST, 'صندوق مهام الأسبوع 🎁', c.key))
                    throw new FunctionalHttpError(409, 'تعذّر فتح الصندوق.');
                sendToUser(user.id, { t: 'wallet', coins: wallet.balance(user.id), gems: wallet.gems(user.id), won: 0 });
                return { ok: true, coins: WEEK_CHEST, balance: wallet.balance(user.id) };
            });
            const quizzes = new Map();
            const QUIZ_MS = 30_000;
            const QUIZ_PRIZES = [0, 500, 1000, 5000, 10000];
            const quizSettle = (z) => {
                if (z.settled)
                    return;
                z.settled = true;
                z.closed = true;
                if (!z.prize)
                    return;
                try {
                    if (z.winner) {
                        wallet.grant(z.winner, 'coins', z.prize, `فوز بمسابقة غرفة «${z.q.slice(0, 30)}»`, `quiz:${z.id}:win`);
                        sendToUser(z.winner, { t: 'wallet', coins: wallet.balance(z.winner), gems: wallet.gems(z.winner), won: 0 });
                    }
                    else {
                        wallet.grant(z.by, 'coins', z.prize, 'استرجاع جائزة مسابقة ما فاز فيها أحد', `refund:quiz:${z.id}`);
                        sendToUser(z.by, { t: 'wallet', coins: wallet.balance(z.by), gems: wallet.gems(z.by), won: 0 });
                    }
                }
                catch (e) {
                    log('quiz_settle_failed', { error: String(e).slice(0, 100) });
                }
            };
            const quizTick = () => { const t = Date.now(); for (const [k, z] of quizzes) {
                if (!z.closed && t >= z.endsAt)
                    quizSettle(z);
                if (z.closed && t - z.endsAt > 10 * 60_000)
                    quizzes.delete(k);
            } };
            const quizTimer = setInterval(quizTick, 2000);
            quizTimer.unref?.();
            const quizView = (z, uid, mod) => {
                if (!z)
                    return null;
                const done = z.closed;
                return { id: z.id, q: z.q, options: z.options, prize: z.prize, byName: z.byName, endsAt: z.endsAt, closed: done, winner: z.winnerName || null, mine: z.answered.get(uid) ?? null, answers: z.answered.size, ...(done || mod ? { correct: z.correct } : {}) };
            };
            functionalHttp.add('GET', '/api/room-quiz', ({ user, url }) => {
                const roomId = String(url.searchParams.get('room') ?? '');
                const acc = socialRooms.quizAccess(user.id, roomId);
                if (!acc)
                    return { ok: true, member: false, mod: false, quiz: null };
                quizTick();
                return { ok: true, member: true, mod: acc.mod, prizes: QUIZ_PRIZES, quiz: quizView(quizzes.get(roomId), user.id, acc.mod) };
            });
            functionalHttp.add('POST', '/api/room-quiz/start', ({ user, body }) => {
                const roomId = String(body.room ?? '');
                const acc = socialRooms.quizAccess(user.id, roomId);
                adminNeed(!!acc, 'لازم تكون داخل الغرفة.');
                adminNeed(acc.mod, 'المسابقة لصاحب الغرفة والمشرفين بس.');
                const cur = quizzes.get(roomId);
                adminNeed(!cur || cur.closed, 'فيه مسابقة شغالة الحين.');
                const clean = (v, n) => maskBanned(String(v ?? '').normalize('NFKC').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n));
                const q = clean(body.q, 120);
                adminNeed(q.length >= 3, 'اكتب السؤال.');
                const options = (Array.isArray(body.options) ? body.options : []).map((o) => clean(o, 40)).filter(Boolean).slice(0, 4);
                adminNeed(options.length >= 2, 'لازم خيارين على الأقل.');
                adminNeed(new Set(options).size === options.length, 'الخيارات لازم تكون مختلفة.');
                const correct = Number(body.correct);
                adminNeed(Number.isInteger(correct) && correct >= 0 && correct < options.length, 'اختر الجواب الصح.');
                const prize = Number(body.prize) || 0;
                adminNeed(QUIZ_PRIZES.includes(prize), 'الجائزة غير صالحة.');
                const id = randomUUID().slice(0, 12);
                if (prize) {
                    const pay = wallet.spendService(user.id, prize, 'جائزة مسابقة غرفة', `quiz:${id}:pay`);
                    if (!pay.ok)
                        throw new FunctionalHttpError(402, pay.code === 'poor' ? 'رصيدك ما يكفي للجائزة.' : 'تعذّر الدفع.');
                    sendToUser(user.id, { t: 'wallet', coins: wallet.balance(user.id), gems: wallet.gems(user.id), won: 0 });
                }
                const now = Date.now();
                const z = { id, roomId, by: user.id, byName: accounts.nameOf(user.id) || 'المشرف', q, options, correct, prize, at: now, endsAt: now + QUIZ_MS, answered: new Map(), winner: null, winnerName: '', closed: false, settled: false };
                quizzes.set(roomId, z);
                return { ok: true, quiz: quizView(z, user.id, true) };
            });
            functionalHttp.add('POST', '/api/room-quiz/answer', ({ user, body }) => {
                const roomId = String(body.room ?? '');
                const acc = socialRooms.quizAccess(user.id, roomId);
                adminNeed(!!acc, 'لازم تكون داخل الغرفة.');
                const z = quizzes.get(roomId);
                quizTick();
                adminNeed(!!z && !z.closed && z.id === body.id, 'المسابقة خلصت.');
                adminNeed(z.by !== user.id, 'صاحب السؤال ما يجاوب 😄');
                adminNeed(!z.answered.has(user.id), 'جاوبت من قبل.');
                const pick = Number(body.pick);
                adminNeed(Number.isInteger(pick) && pick >= 0 && pick < z.options.length, 'اختيار غير صالح.');
                z.answered.set(user.id, pick);
                if (pick === z.correct && !z.winner) {
                    z.winner = user.id;
                    z.winnerName = accounts.nameOf(user.id) || 'لاعب';
                    z.endsAt = Date.now();
                    quizSettle(z);
                }
                return { ok: true, correct: pick === z.correct, quiz: quizView(z, user.id, acc.mod) };
            });
            functionalHttp.add('POST', '/api/room-quiz/cancel', ({ user, body }) => {
                const roomId = String(body.room ?? '');
                const acc = socialRooms.quizAccess(user.id, roomId);
                adminNeed(!!acc && acc.mod, 'للمشرفين بس.');
                const z = quizzes.get(roomId);
                adminNeed(!!z && !z.closed, 'ما فيه مسابقة شغالة.');
                z.endsAt = Date.now();
                quizSettle(z);
                return { ok: true };
            });
            // R68z: توثيق رقم الجوال
            const phoneErr = (e) => { if (e instanceof PhoneError)
                throw new FunctionalHttpError(e.status, e.message); throw e; };
            functionalHttp.add('GET', '/api/phone', ({ user }) => ({ ok: true, ...phoneVerify.status(user.id) }));
            functionalHttp.add('POST', '/api/phone/send', async ({ user, body }) => { adminNeed(accounts.has(user.id) && !isGuest(user.id), 'سجّل دخولك أول.'); try {
                return { ok: true, ...(await phoneVerify.send(user.id, body.cc, body.phone)) };
            }
            catch (e) {
                return phoneErr(e);
            } });
            functionalHttp.add('POST', '/api/phone/verify', async ({ user, body }) => { try {
                const r = await phoneVerify.verify(user.id, body.code);
                return { ok: true, tail: r.tail };
            }
            catch (e) {
                return phoneErr(e);
            } });
            functionalHttp.add('POST', '/api/admin/phone-reset', ({ actor, body }) => { const id = String(body.id ?? ''); adminNeed(accounts.has(id), 'اللاعب غير موجود.'); adminNeed(phoneVerify.reset(id), 'اللاعب مو موثّق بالجوال.'); admin.audit(actor, 'phone.reset', id, 'فك توثيق الجوال'); return { ok: true }; }, 'owner');
            // R68z: عجلة الحظ
            functionalHttp.add('GET', '/api/wheel', ({ user }) => ({ ok: true, ...wheel.state(user.id), coins: wallet.balance(user.id) }));
            functionalHttp.add('POST', '/api/wheel/spin', ({ user, body }) => {
                adminNeed(accounts.has(user.id) && !platform.isBanned(user.id), 'حسابك ما يقدر يلف العجلة.');
                const paid = body.paid === true;
                let r;
                try {
                    r = wheel.reserve(user.id, paid);
                }
                catch (e) {
                    throw new FunctionalHttpError(409, e.message);
                }
                if (paid) {
                    const pay = wallet.spendService(user.id, WHEEL_PAID_COST, 'لفة عجلة الحظ', r.op);
                    if (!pay.ok) {
                        wheel.release(user.id, true);
                        throw new FunctionalHttpError(pay.code === 'poor' ? 402 : 400, pay.code === 'poor' ? `رصيدك ما يكفي. اللفة بـ ${WHEEL_PAID_COST.toLocaleString('en-US')} عملة.` : 'تعذّر الدفع.');
                    }
                }
                let ok = false;
                try {
                    ok = wallet.grant(user.id, 'coins', r.prize.coins, `عجلة الحظ: ${r.prize.label} عملة`, r.op + ':win');
                }
                catch (e) {
                    log('wheel_grant_failed', { error: String(e).slice(0, 100) });
                }
                if (!ok) {
                    if (paid)
                        wallet.grant(user.id, 'coins', WHEEL_PAID_COST, 'استرجاع لفة العجلة', 'refund:' + r.op);
                    else
                        wheel.release(user.id, false);
                    throw new FunctionalHttpError(500, 'تعذّر تسليم الجائزة، رجعنا لك اللفة.');
                }
                wheel.win(user.id, accounts.nameOf(user.id) || 'لاعب', r.prize.coins);
                sendToUser(user.id, { t: 'wallet', coins: wallet.balance(user.id), gems: wallet.gems(user.id), won: 0 });
                return { ok: true, index: r.index, prize: { id: r.prize.id, label: r.prize.label, coins: r.prize.coins }, ...wheel.state(user.id), coins: wallet.balance(user.id) };
            });
            functionalHttp.add('GET', '/api/broadcast/info', () => ({ ok: true, enabled: siteFlags.get().broadcast, prices: { ...BROADCAST_PRICES }, max: BROADCAST_TEXT_MAX, recent: broadcasts.recent().map(publicBroadcast) }));
            functionalHttp.add('POST', '/api/broadcast', ({ user, body }) => {
                if (!siteFlags.get().broadcast)
                    throw new FunctionalHttpError(403, 'البرقية موقفة حاليًا من الإدارة.');
                adminNeed(accounts.has(user.id) && !platform.isBanned(user.id), 'حسابك ما يقدر يرسل برقية.');
                const key = String(body.key ?? '');
                adminNeed(/^[A-Za-z0-9_-]{8,64}$/.test(key), 'معرّف الطلب غير صالح.');
                let c;
                try {
                    c = broadcasts.check(user.id, String(body.text ?? ''), body.tier);
                }
                catch (e) {
                    if (e instanceof BroadcastError)
                        throw new FunctionalHttpError(400, e.message);
                    throw e;
                }
                const m = moderateText(c.text, 'room-ad');
                if (!m.ok)
                    throw new FunctionalHttpError(422, m.message);
                const id = 'bc-' + createHash('sha256').update(user.id + ':' + key).digest('hex').slice(0, 24);
                const pay = wallet.spendService(user.id, c.price, `برقية عالمية (${c.tier === 'full' ? 'شاشة كاملة' : c.tier === 'gold' ? 'ذهبية' : 'عادية'})`, 'broadcast:' + id);
                if (!pay.ok)
                    throw new FunctionalHttpError(pay.code === 'poor' ? 402 : 400, pay.code === 'poor' ? `رصيدك ما يكفي. البرقية بـ ${c.price.toLocaleString('en-US')} عملة.` : 'تعذّر الدفع.');
                const b = broadcasts.add(user.id, accounts.nameOf(user.id) || 'لاعب', c.text, c.tier, c.price, id);
                if (!pay.dup)
                    sendAll({ t: 'broadcast', b: publicBroadcast(b) });
                sendToUser(user.id, { t: 'wallet', coins: wallet.balance(user.id), gems: wallet.gems(user.id), won: 0 });
                return { ok: true, id: b.id, coins: pay.coins };
            });
            // R68c: بنرات الصفحة الرئيسية
            const hbErr = (fn) => { try {
                return fn();
            }
            catch (e) {
                if (e instanceof HomeBannerError)
                    throw new FunctionalHttpError(400, e.message);
                throw e;
            } };
            functionalHttp.add('GET', '/api/admin/home-banners', () => ({ ok: true, list: homeBanners.all() }), 'owner');
            functionalHttp.add('POST', '/api/admin/home-banners/save', ({ actor, body }) => { const b = hbErr(() => homeBanners.upsert(body, actor.name)); admin.audit(actor, 'home-banner:save', b.id, b.title); return { ok: true, banner: b, list: homeBanners.all() }; }, 'owner');
            functionalHttp.add('POST', '/api/admin/home-banners/remove', ({ actor, body }) => { hbErr(() => homeBanners.remove(String(body.id ?? ''))); admin.audit(actor, 'home-banner:remove', String(body.id ?? ''), ''); return { ok: true, list: homeBanners.all() }; }, 'owner');
            functionalHttp.add('POST', '/api/admin/home-banners/move', ({ body }) => { hbErr(() => homeBanners.move(String(body.id ?? ''), Number(body.dir))); return { ok: true, list: homeBanners.all() }; }, 'owner');
            functionalHttp.add('POST', '/api/admin/home-banners/image', async ({ actor, body }) => { try {
                const url = await homeBanners.putImage(body.data);
                admin.audit(actor, 'home-banner:image', url, '');
                return { ok: true, url };
            }
            catch (e) {
                if (e instanceof HomeBannerError)
                    throw new FunctionalHttpError(400, e.message);
                throw e;
            } }, 'owner', 3_600_000);
            functionalHttp.add('GET', '/api/admin/broadcasts', () => ({ ok: true, list: broadcasts.list(100) }), 'owner');
            functionalHttp.add('POST', '/api/admin/broadcasts/hide', ({ actor, body }) => {
                const reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(reason.length >= 3, 'اكتب السبب.');
                let b;
                try {
                    b = broadcasts.hide(String(body.id ?? ''), actor.name);
                }
                catch (e) {
                    if (e instanceof BroadcastError)
                        throw new FunctionalHttpError(404, e.message);
                    throw e;
                }
                sendAll({ t: 'broadcast:hide', id: b.id });
                const auditOk = admin.audit(actor, 'broadcast.hide', b.by, `${b.text} — ${reason}`);
                return { ok: true, auditOk };
            }, 'owner');
            // R67ae: حذف الحساب (مهلة 30 يوم)
            functionalHttp.add('POST', '/api/account-deletion/request', async ({ user, body }) => {
                adminNeed(accounts.has(user.id), 'الحساب غير موجود.');
                adminNeed(String(body.confirm ?? '').trim() === 'حذف', 'اكتب كلمة «حذف» للتأكيد.');
                adminNeed(!platform.roleOf(user.id), 'حسابات الإدارة ما تنحذف من هنا. شيل الدور الإداري أول من لوحة التحكم.');
                const r = deletion.request(user.id);
                try {
                    const rid = socialRooms.roomIdOf(user.id);
                    if (rid)
                        await socialRooms.command(user.id, 'room:leave', { roomId: rid, key: randomUUID() });
                }
                catch { /* */ }
                try {
                    sessions.revokeHashes(user.id, null);
                }
                catch { /* */ }
                setTimeout(() => { for (const ws of sockets.get(user.id) ?? []) {
                    try {
                        ws.close(4401, 'account deletion');
                    }
                    catch { /* */ }
                } }, 500);
                log('account_deletion_requested', {});
                return { ok: true, executeAt: r.executeAt };
            });
            functionalHttp.add('POST', '/api/account-deletion/cancel', ({ user }) => { const ok = deletion.cancel(user.id); return { ok: true, cancelled: ok }; });
            functionalHttp.add('GET', '/api/admin/account-deletions', () => ({ ok: true, graceDays: DELETION_GRACE_MS / 86_400_000, list: deletion.list().slice(0, 100).map((x) => ({ ...x, name: x.done ? 'حساب محذوف' : nm(x.id) })) }), 'owner');
            const executeDeletion = async (id) => {
                try {
                    const rid = socialRooms.roomIdOf(id);
                    if (rid)
                        await socialRooms.command(id, 'room:leave', { roomId: rid, key: randomUUID() });
                }
                catch { /* */ }
                for (const r of socialRooms.ownedRoomsOf(id)) {
                    try {
                        await socialRooms.admin('token', 'room:close', { roomId: r.id, key: randomUUID(), reason: 'account-deleted' });
                    }
                    catch { /* */ }
                }
                try {
                    const t = tribes.of(id);
                    if (t) {
                        const ids = t.members.map((m) => m.id);
                        if (t.leader === id)
                            tribes.disband(id);
                        else
                            tribes.leave(id);
                        tribePush(ids);
                    }
                }
                catch { /* */ }
                try {
                    const c = social.coupleOf(id);
                    if (c) {
                        social.adminBreakCouple(c.id);
                        cpPoints.reset(cpKey(c.id, id, c.partner));
                    }
                }
                catch { /* */ }
                try {
                    community.purgeUser(id);
                }
                catch { /* */ }
                try {
                    avatars.del(id);
                }
                catch { /* */ }
                try {
                    accounts.anonymize(id);
                }
                catch { /* */ }
                try {
                    identities.unlink(id);
                }
                catch { /* */ }
                try {
                    sessions.revokeHashes(id, null);
                }
                catch { /* */ }
                deletion.markDone(id);
                log('account_deleted', {});
            };
            const deletionSweep = async () => { for (const id of deletion.due()) {
                try {
                    await executeDeletion(id);
                }
                catch (e) {
                    log('account_deletion_failed', { error: String(e.message).slice(0, 100) });
                }
            } };
            const deletionTimer = setInterval(() => { void deletionSweep(); }, 60 * 60_000);
            deletionTimer.unref?.();
            setTimeout(() => { void deletionSweep(); }, 30_000).unref?.();
            functionalHttp.add('GET', '/api/admin/admin-logins', () => ({ ok: true, list: admin.loginLog() }), 'owner');
            functionalHttp.add('GET', '/api/admin/gifts', ({ url }) => { const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days')) || 7)); return { ok: true, days, ...wallet.adminGifts({ q: url.searchParams.get('q') ?? '', since: Date.now() - days * 86_400_000, limit: 200 }) }; }, 'owner');
            functionalHttp.add('GET', '/api/admin/economy-daily', ({ url }) => { const days = Math.max(7, Math.min(60, Number(url.searchParams.get('days')) || 14)); const e = wallet.adminEconomy(days); return { ok: true, ...e, topSpenders: e.topSpenders.map((x) => ({ name: nm(x.id), spent: x.spent })) }; }, 'owner');
            functionalHttp.add('GET', '/api/admin/banned-words', () => ({ ok: true, words: siteFlags.words(), meta: siteFlags.wordsMeta(), max: BANNED_WORDS_MAX }), 'owner');
            functionalHttp.add('POST', '/api/admin/banned-words', ({ actor, body }) => {
                const reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(reason.length >= 3, 'اكتب سبب التعديل.');
                let out;
                try {
                    out = siteFlags.editWords(body.add, body.remove, actor.name);
                }
                catch (e) {
                    throw new FunctionalHttpError(400, e.message || 'تعذّر الحفظ.');
                }
                setExtraBannedWords(out.words);
                const auditOk = admin.audit(actor, 'moderation.words', 'banned-words', `${out.added.length ? 'إضافة ' + out.added.length : ''}${out.removed.length ? ' حذف ' + out.removed.length : ''} — ${reason}`);
                return { ok: true, words: out.words, auditOk };
            }, 'owner');
            functionalHttp.add('GET', '/api/admin/posts', ({ url }) => ({ ok: true, posts: community.adminPosts(url.searchParams.get('q') ?? '', 80), counts: community.counts() }), 'owner');
            functionalHttp.add('POST', '/api/admin/posts/delete', ({ actor, body }) => {
                const id = Number(body.id), reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(Number.isSafeInteger(id) && id > 0, 'رقم المنشور غير صالح.');
                adminNeed(reason.length >= 3, 'اكتب سبب الحذف.');
                let r;
                try {
                    r = community.adminDeletePost(id);
                }
                catch {
                    throw new FunctionalHttpError(404, 'المنشور غير موجود.');
                }
                const auditOk = admin.audit(actor, 'community.remove', r.author, `حذف منشور ${id}: ${reason}`);
                return { ok: true, auditOk };
            }, 'owner');
            functionalHttp.add('POST', '/api/admin/tribes-cp/couple', ({ actor, body }) => {
                const id = Number(body.id), op = String(body.op ?? ''), reason = String(body.reason ?? '').trim().slice(0, 200);
                adminNeed(Number.isSafeInteger(id) && id > 0, 'رقم الارتباط غير صالح.');
                adminNeed(reason.length >= 3, 'اكتب سبب التعديل.');
                const c = social.allCouples().find((x) => x.id === id);
                adminNeed(!!c, 'الارتباط غير موجود.');
                const key = cpKey(c.id, c.a, c.b);
                if (op === 'reset')
                    cpPoints.reset(key);
                else if (op === 'break') {
                    social.adminBreakCouple(id);
                    cpPoints.reset(key);
                }
                else
                    throw new FunctionalHttpError(400, 'عملية غير معروفة.');
                for (const u of [c.a, c.b])
                    sendToUser(u, { t: 'cp:update' });
                const auditOk = admin.audit(actor, 'cp.' + op, 'couple:' + id, `${nm(c.a)} و ${nm(c.b)} — ${reason}`);
                return { ok: true, auditOk };
            }, 'owner');
        }
        functionalHttp.add('GET', '/api/friends/live', ({ user }) => {
            const ids = social.friendInternalIds(user.id).slice(0, 200);
            const list = ids.map((f) => {
                const room = privacyOn(f, 'showPresence') ? null : socialRooms.friendRoom(user.id, f);
                const photo = avatars.version(f);
                return { id: community.pub(f), name: accounts.nameOf(f), avatar: photo !== null ? `/api/social/avatar?id=${community.pub(f)}&v=${photo}` : null, room, online: !privacyOn(f, 'showPresence') && (sockets.get(f)?.size ?? 0) > 0 };
            });
            list.sort((a, b) => Number(!!b.room) - Number(!!a.room) || Number(b.online) - Number(a.online) || String(a.name).localeCompare(String(b.name), 'ar'));
            return { ok: true, list: list.slice(0, 60) };
        });
        functionalHttp.add('GET', '/api/room-ids/mine', ({ user }) => ({ ok: true, items: wallet.owned(user.id).map((iid) => shopcat.get(iid)).filter((it) => !!it && it.slot === 'room-id' && typeof it.css === 'string').map((it) => ({ id: it.id, code: it.css, name: it.name })) }));
        wireFeaturesR47(functionalHttp, { auction: auctionR47, social, items: () => shopcat.all(), hasAccount: id => accounts.has(id), asAdmin: (id, run) => { const previous = auctionAdminActorR47; auctionAdminActorR47 = id; try {
                return run();
            }
            finally {
                auctionAdminActorR47 = previous;
            } }, audit: (actor, action, target, detail) => { try {
                platform.audit({ actorId: actor.id, actor: actor.name, role: actor.role, action, target, detail });
                return true;
            }
            catch {
                return false;
            } } });
        wireSocialRoutes(functionalHttp, { onRoomJoin: (uid, roomId) => notifyFriends(uid, (f) => { const room = socialRooms.friendRoom(f, uid); if (!room || room.id !== roomId)
                return null; const cpc = social.coupleOf(uid); const cpLv = cpc && cpc.partner === f ? cpLevelOf(cpPoints.get(cpKey(cpc.id, uid, f))).level : 0; return { t: 'friend:room', id: community.pub(uid), name: accounts.nameOf(uid), room: { id: room.id, name: room.name, locked: room.locked }, ...(cpLv >= 3 ? { cp: true } : {}) }; }, 'room:' + uid + ':' + roomId, 5 * 60_000), rooms: socialRooms, voice: socialVoice, platform, eligible: socialEligible, publicId: id => community.pub(id), presentFriends: (id, publicIds) => social.friendsPresent(id, new Set(publicIds)), resolveTarget: value => accounts.has(value) ? value : community.resolvePublicId(value) ?? accounts.findByDisplayPlayerId(value) ?? null,
            resolveGiftTarget: value => community.resolvePublicId(value), replayGiftBatch: batchReplayView, replayGift: singleGiftReplayView, quoteGift: (user, body) => { const g = giftcat.get(body.gift); if (!g?.active)
                return { ok: false, error: 'الهدية غير متاحة.' }; if (body.seen !== g.price || body.seenPolicy !== GIFT_REWARD_POLICY.id)
                return { ok: false, error: 'تغير عرض الهدية. حدّث الكتالوج.' }; const qty = body.qty, q = Array.isArray(body.to) ? quoteGiftBatch(g.price, qty, body.to.length) : quoteGiftRewards(g.price, qty); if (!q || q.total > 1_000_000)
                return { ok: false, error: 'القيمة تتجاوز الحد الآمن.' }; return { ok: true, quote: q, giftId: g.id, qty, coins: wallet.balance(user.id), gems: wallet.gems(user.id) }; }, sendGift: (user, body, scope) => giftCmd(user, 'gift:send', body, { room: scope }) });
        wallet.onBenefitsChange = ids => { for (const id of ids)
            sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 }); };
        wireSocialBenefitsRoutes(functionalHttp, { rooms: socialRooms, wallet, shop: shopcat, gifts: giftcat, eligible: socialEligible, publicId: id => community.pub(id), resolvePublic: value => community.resolvePublicId(value), nameOf: id => accounts.nameOf(id),
            ranks: id => { const p = progression.view(id); return { level: p.level.enabled ? p.level.value : 0, vip: p.vip.enabled && p.vip.value ? Number(p.vip.value.slice(1)) : 0, noble: p.noble.enabled && p.noble.value ? Number(p.noble.value.slice(1)) : 0 }; }, changed: roomId => socialRooms.notifyBenefits(roomId) });
        wirePaymentRoutes(functionalHttp, payments, platform, (id) => sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id) }));
        const vipAudit = (actor, action, target) => {
            try {
                platform.audit({ actorId: actor.id, actor: actor.name, role: actor.role, action, target, detail: 'إدارة الرتب وعضوية VIP' });
                return true;
            }
            catch {
                log('vip_audit_failed', { action });
                return false;
            }
        };
        const seasonPublic = (season) => season ? { ...season, startsAt: season.startAt, endsAt: season.endAt, active: season.status === 'active' } : null;
        wireRankVipRoutes(functionalHttp, {
            rankPage: id => { const view = progression.rankPage(id); return { ...view, season: seasonPublic(view.season), rewards: rankRewards.view(id) }; },
            standings: (id, url) => {
                const selected = url.searchParams.get('seasonId') || undefined;
                const active = progression.seasonsView().find(x => x.status === 'active');
                const seasonId = selected ?? active?.id;
                if (seasonId && !progression.seasonsView().some(x => x.id === seasonId))
                    throw new Error('الموسم مب موجود.');
                const rows = accounts.all().filter(x => !platform.isBanned(x.id)).map(x => {
                    const view = seasonId ? progression.seasonView(x.id, seasonId).noble : progression.view(x.id).noble;
                    return { uuid: x.id, id: community.pub(x.id), name: x.name, avatar: wallet.equippedAvatar(x.id), points: view.points, rankName: view.currentTier?.name ?? view.value ?? 'لا رتبة مكتسبة' };
                }).sort((a, b) => b.points - a.points || a.uuid.localeCompare(b.uuid));
                const limit = Number(url.searchParams.get('limit') ?? 50), offset = Number(url.searchParams.get('offset') ?? 0);
                if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0)
                    throw new Error('صفحة الترتيب مب صالحة.');
                const mapped = rows.map(({ uuid, ...x }, i) => ({ ...x, place: i + 1 }));
                return { scope: seasonId ? 'season' : 'lifetime', season: seasonPublic(progression.seasonsView().find(x => x.id === seasonId) ?? null), list: mapped.slice(offset, offset + limit), total: rows.length, offset, limit, me: mapped[rows.findIndex(x => x.uuid === id)] ?? null };
            },
            adminRanks: () => ({ config: progression.configView(), catalog: progression.catalogView(), eventRules: progression.eventRulesView(), seasons: progression.seasonsView(), players: accounts.all().map(x => ({ id: x.id, name: x.name, progression: progression.view(x.id) })), rewardPolicies: rankRewards.configView() }),
            season: (body, actor) => { const { action, key, reason, ...input } = body; return { ok: true, ...progression.createSeasonReceipt(input, { actorId: actor.id, key: String(key), reason: String(reason) }) }; },
            membership: id => vipMembership.view(id), preview: (id, body) => vipMembership.preview(id, body), purchase: (id, body) => vipMembership.buy(id, body),
            adminMembership: (url, actor) => vipMembership.adminView(actor, { ...(url.searchParams.has('userId') ? { userId: url.searchParams.get('userId') } : {}), offset: Number(url.searchParams.get('offset') ?? 0), limit: Number(url.searchParams.get('limit') ?? 50) }),
            configureMembership: (body, actor) => { const revision = vipMembership.snapshot().revision; const config = vipMembership.configure(body, actor); return { ok: true, config, duplicate: revision === vipMembership.snapshot().revision }; },
            member: (id, actor) => { if (!accounts.has(id))
                throw new Error('الحساب مب موجود.'); return { ...vipMembership.adminView(actor, { userId: id }), profile: accounts.adminProfile(id), membership: vipMembership.view(id), progression: progression.view(id), records: progression.eventRecords(id).slice().reverse() }; },
            refund: (id, body, actor) => vipMembership.prepareCorrection(actor, { orderId: id, ...body }),
            audit: vipAudit, refresh: id => sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id) }),
        });
        await vipMembership.sweep();
        const ownerTools = new OwnerPlayerTools({ accounts, accountTools, progression, wallet, shopcat, platform });
        ownerTools.wire(functionalHttp.allowFallback('/api/admin/players'));
        await ownerTools.resumePending();
        replayIntents();
        await Promise.all(supportJobs.values());
        await socialRooms.sweep();
        await missions.retry();
        await rankRewards.retryPending();
        const newUnsaved = () => [['social-rooms', socialRooms.unsaved() || socialRooms.cannonPendingCount() > 0], ['vip-membership', vipMembership.unsaved() || vipMembership.pendingCount() > 0], ['payments', payments.unsaved() || payments.pendingCount() > 0], ['financial-reconcile', financialReconcilePending], ['server-sessions', sessions.unsaved()], ['owner-tools', platform.ownerPending().length > 0], ['account-tools', accountTools.unsaved()], ['social-private', social.unsaved()], ['support-notifications', support.unsaved()], ['functional-outbox', outbox.unsaved() || outbox.pending().length > 0], ['missions', missions.unsaved() || missions.pendingCount() > 0], ['rank-rewards', rankRewards.unsaved() || rankRewards.pendingCount() > 0]];
        const server = http.createServer(async (req, res) => {
            requestResponses.set(req, res);
            const finish = pendingWrites.begin('http-requests');
            try {
                const url = new URL(req.url ?? '/', 'http://x');
                if (await webhook(req, res, url))
                    return;
                if (await socialVoice.handleHttp(req, res))
                    return;
                const session = sessions.cookieUser(req.headers.cookie);
                const user = session ? { ...session, name: accounts.nameOf(session.id) || session.name } : null;
                if (user) {
                    try {
                        const h = sessions.tokenHash(req.headers.cookie);
                        if (h)
                            devices.touch(user.id, h, String(req.headers['user-agent'] ?? '').slice(0, 300), (x) => sessions.activeHashes(user.id).includes(x));
                    }
                    catch { /* الأجهزة ثانوية */ }
                }
                if (url.pathname === '/healthz') {
                    // liveness: الرمز مثل قبل (يتأثر بمخزن الغرف فقط)، ونضيف حقل storage للمراقبة
                    const ok = await store.ping();
                    return json(res, ok ? 200 : 503, { ok, storage: storage.status().ready && !wallet.pendingCount() ? 'ok' : 'degraded' });
                }
                if (url.pathname === '/readyz') {
                    // readiness: 503 إذا التخزين الدائم متعطل أو مخزن الغرف ما يرد. بدون مسارات ولا تفاصيل أخطاء
                    const st = storage.status();
                    const roomsOk = await store.ping();
                    const ready = st.ready && roomsOk && socialRooms.health().ready && wallet.pendingCount() === 0 && newUnsaved().every(([, pending]) => !pending);
                    return json(res, ready ? 200 : 503, { ready, rooms: roomsOk, storage: st.stores, pendingPayouts: wallet.pendingCount() });
                }
                // مسح كوكي المتصفح متاح حتى أثناء الحظر أو الصيانة، مع إبقاء حماية الأصل.
                if (url.pathname === '/api/logout' && req.method === 'POST') {
                    if (!sameOrigin(req))
                        return json(res, 403, { error: 'طلب من مصدر غير مسموح.' });
                    sessions.revokeCookie(req.headers.cookie);
                    closeSessionSockets(req.headers.cookie);
                    if (user)
                        await socialVoice.disconnectUser(user.id);
                    return json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(cfg.cookieSecure) });
                }
                // الصيانة والحظر يُطبَّقان هنا بالخادم قبل أي مسار: الصيانة تمنع كل /api/ ما عدا الحالة والجلسة القديمة والإدارة
                if (url.pathname === '/api/status' && req.method === 'GET')
                    return json(res, 200, admin.publicStatus(user));
                if (user && req.method !== 'GET' && req.method !== 'HEAD' && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/admin') && isGuest(user.id) && !guestHttpAllowed(url.pathname))
                    return json(res, 403, { error: GUEST_MSG, code: 'guest' });
                if (url.pathname.startsWith('/api/') && url.pathname !== '/api/me' && !url.pathname.startsWith('/api/admin/')) {
                    const mb = admin.maintenanceBlock(user);
                    if (mb)
                        return json(res, 503, { error: mb, maintenance: true });
                    const bb = admin.banBlock(user);
                    if (bb)
                        return json(res, 403, { error: bb, banned: true });
                }
                const coverRoute = /^\/api\/social\/rooms\/([^/]+)\/cover$/.exec(url.pathname);
                if (coverRoute) {
                    const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
                    if (!user)
                        return json(res, 401, { error: 'ما فيه جلسة.' }, privateHeaders);
                    const roomId = coverRoute[1];
                    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId))
                        return json(res, 400, { error: 'معرّف الغرفة مب صالح.' }, privateHeaders);
                    if (req.method === 'GET' || req.method === 'HEAD') {
                        if (!roomAvatarLimiter.allow(user.id))
                            return json(res, 429, { error: 'محاولات كثيرة، جرّب بعد شوي.' }, privateHeaders);
                        const a = await socialRooms.withCoverAccess(user.id, roomId, key => avatars.get(key));
                        if (!a)
                            return json(res, 404, { error: 'ما فيه غلاف متاح.' }, privateHeaders);
                        res.writeHead(200, { ...securityHeaders, ...privateHeaders, 'Content-Type': a.type, 'Content-Length': a.buf.length });
                        return res.end(req.method === 'HEAD' ? undefined : a.buf);
                    }
                    if (req.method !== 'POST')
                        return json(res, 405, { error: 'الطريقة غير مسموحة.' }, privateHeaders);
                    if (!sameOrigin(req))
                        return json(res, 403, { error: 'طلب من مصدر غير مسموح.' }, privateHeaders);
                    const coverKey = req.headers['x-idempotency-key'];
                    if (coverKey !== undefined && (typeof coverKey !== 'string' || !coverKey.length || coverKey.length > 96 || /[\s\u0000-\u001f\u007f]/.test(coverKey)))
                        return json(res, 400, { error: 'مفتاح الطلب مب صالح.' }, privateHeaders);
                    const allowed = await socialRooms.coverPermission(user.id, roomId);
                    if (!allowed.ok)
                        return json(res, allowed.status ?? 400, { error: allowed.error }, privateHeaders);
                    if (!avatarLimiter.allow(`room-cover:${user.id}`))
                        return json(res, 429, { error: 'محاولات كثيرة، جرّب بعد شوي.' }, privateHeaders);
                    const ct = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
                    if (!['image/jpeg', 'image/png', 'image/webp'].includes(ct))
                        return json(res, 415, { error: 'المسموح: JPG وPNG وWebP.' }, privateHeaders);
                    if (Number(req.headers['content-length'] ?? 0) > AVATAR_MAX) {
                        req.resume();
                        return json(res, 413, { error: 'الصورة كبيرة. الحد الأقصى 150 كيلوبايت.' }, privateHeaders);
                    }
                    const input = await new Promise((resolve, reject) => {
                        const chunks = [];
                        let size = 0, big = false;
                        req.on('data', (c) => { size += c.length; if (size > AVATAR_MAX) {
                            big = true;
                            chunks.length = 0;
                        }
                        else if (!big)
                            chunks.push(c); });
                        req.once('end', () => resolve(big ? null : Buffer.concat(chunks)));
                        req.once('error', reject);
                        req.once('aborted', () => reject(new BodyReadError(400, 'aborted')));
                    });
                    if (!input)
                        return json(res, 413, { error: 'الصورة كبيرة. الحد الأقصى 150 كيلوبايت.' }, privateHeaders);
                    if (avatarDecodes >= 2)
                        return json(res, 429, { error: 'رفع الصور مشغول الحين.' }, { ...privateHeaders, 'Retry-After': '1' });
                    avatarDecodes++;
                    try {
                        const image = await normalizeAvatar(input, ct), hash = createHash('sha256').update(image.buf).digest('hex');
                        const result = await socialRooms.setCover(user.id, roomId, hash, key => { if (!avatars.get(key))
                            avatars.set(key, image.buf, image.type); }, coverKey);
                        if (!result.ok)
                            return json(res, result.status ?? 400, { error: result.error }, privateHeaders);
                        return json(res, 200, { ...result, photo: `/api/social/rooms/${roomId}/cover?v=${hash}` }, privateHeaders);
                    }
                    catch (e) {
                        if (e instanceof ValidationError)
                            return json(res, 400, { error: e.message, code: e.code }, privateHeaders);
                        throw e;
                    }
                    finally {
                        avatarDecodes--;
                    }
                }
                // Binary social photos use the existing session/origin-independent read gates and avatar reader.
                // Never reuse game room-avatar or allow an arbitrary internal account ID.
                if (url.pathname === '/api/social/avatar') {
                    if (!user)
                        return json(res, 401, { error: 'ما فيه جلسة.' });
                    if (req.method !== 'GET' && req.method !== 'HEAD')
                        return json(res, 405, { error: 'الطريقة غير مسموحة.' });
                    if (!roomAvatarLimiter.allow(user.id))
                        return json(res, 429, { error: 'محاولات كثيرة، جرّب بعد شوي.' });
                    const pub = url.searchParams.get('id') ?? '';
                    const target = /^[A-Za-z0-9_-]{16}$/.test(pub) ? community.resolvePublicId(pub) : null;
                    const a = target ? await socialRooms.withAvatarAccess(user.id, target, () => avatars.get(target)) : null;
                    if (!a)
                        return json(res, 404, { error: 'ما فيه صورة.' }, { 'Cache-Control': 'private, no-store', Vary: 'Cookie' });
                    res.writeHead(200, { ...securityHeaders, 'Content-Type': a.type, 'Content-Length': a.buf.length, 'Cache-Control': 'private, no-store', Vary: 'Cookie' });
                    return res.end(req.method === 'HEAD' ? undefined : a.buf);
                }
                if (await functionalHttp.handle(req, res, url, user))
                    return;
                if (await admin.handle(req, res, url, user))
                    return;
                if (await communityHandle(req, res, url, user))
                    return;
                if (url.pathname === '/api/games' && req.method === 'GET')
                    return json(res, 200, { games: registry.list(), categories: GAME_CATEGORIES });
                if (url.pathname === '/api/account' && req.method === 'GET') {
                    if (!user)
                        return json(res, 401, { error: 'ما فيه جلسة.' });
                    accounts.ensure(user.id, user.name);
                    accounts.noteActivity(user.id);
                    const profile = canonicalProfile(user.id, wallet.balance(user.id));
                    return json(res, 200, { ...profile, ...community.followCounts(user.id), ...verificationView(user.id), settings: accountTools.settings(user.id), friendsCount: social.friendsCount(user.id), internalNotifications: support.inbox(user.id).unread, progression: progression.view(user.id), canClaim: wallet.canClaim(user.id), stakes: availableStakes, avatar: avatars.version(user.id), gems: wallet.gems(user.id), equipped: equippedView(user.id), txs: wallet.ledgerOf(user.id, 100), achievements: achView(achInput(user.id)), allGames: accounts.achStats(user.id).games, giftCounts: wallet.giftCounts(user.id), ownedCount: wallet.owned(user.id).length });
                }
                if (url.pathname === '/api/account' && req.method === 'PATCH') {
                    if (!user)
                        return json(res, 401, { error: 'ما فيه جلسة.' });
                    if (!sameOrigin(req))
                        return json(res, 403, { error: 'طلب من مصدر غير مسموح.' });
                    if (String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase() !== 'application/json')
                        return json(res, 415, { error: 'نوع الطلب غير مدعوم.' });
                    if (!sessionLimiter.allow('account:' + user.id))
                        return json(res, 429, { error: 'طلبات كثيرة، جرّب بعد شوي.' });
                    // أقل من 4KiB بالبايت لا بطول JS؛ لا نغيّر قارئ الأجسام القديم لبقية المسارات.
                    if (Number(req.headers['content-length'] ?? 0) >= 4096) {
                        req.resume();
                        return json(res, 413, { error: 'الطلب كبير.' });
                    }
                    let patch;
                    try {
                        const body = await new Promise((resolve, reject) => {
                            const chunks = [];
                            let size = 0;
                            let big = false;
                            req.on('data', (chunk) => {
                                size += chunk.length;
                                if (size >= 4096) {
                                    big = true;
                                    chunks.length = 0;
                                    resolve(null);
                                }
                                else if (!big)
                                    chunks.push(chunk);
                            });
                            req.on('end', () => resolve(big ? null : Buffer.concat(chunks)));
                            req.on('error', reject);
                            req.on('aborted', () => reject(new Error('aborted')));
                        });
                        if (body === null)
                            return json(res, 413, { error: 'الطلب كبير.' });
                        patch = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
                    }
                    catch {
                        return json(res, 400, { error: 'الطلب غير صالح.' });
                    }
                    accounts.ensure(user.id, user.name);
                    const result = accounts.updatePresentation(user.id, patch, (game) => registry.get(game)?.info.status === 'available');
                    return result ? json(res, 200, result) : json(res, 400, { error: 'النبذة أو الألعاب المفضلة أو البيانات الشخصية غير صالحة.' });
                }
                /* صورة الحساب: الكوكي فقط يحدد صاحبها (ما فيه معرّف في الطلب)، فما أحد يقدر يقرأ أو يغيّر صورة غيره */
                if (url.pathname === '/api/avatar') {
                    if (!user)
                        return json(res, 401, { error: 'ما فيه جلسة.' });
                    if (req.method === 'GET' || req.method === 'HEAD') {
                        const a = avatars.get(user.id);
                        if (!a)
                            return json(res, 404, { error: 'ما فيه صورة.' });
                        const etag = `"${a.v}-${a.buf.length}"`;
                        const h = { 'Content-Type': a.type, 'Cache-Control': 'private, no-cache', ETag: etag, Vary: 'Cookie', ...SECURITY_HEADERS };
                        if (req.headers['if-none-match'] === etag) {
                            res.writeHead(304, h);
                            return res.end();
                        }
                        res.writeHead(200, { ...h, 'Content-Length': a.buf.length });
                        return res.end(req.method === 'HEAD' ? undefined : a.buf);
                    }
                    if (req.method === 'POST' || req.method === 'DELETE') {
                        if (!sameOrigin(req))
                            return json(res, 403, { error: 'طلب من مصدر غير مسموح.' });
                        if (!avatarLimiter.allow(user.id))
                            return json(res, 429, { error: 'محاولات كثيرة، جرّب بعد شوي.' });
                        if (req.method === 'DELETE') {
                            avatars.del(user.id);
                            return json(res, 200, { ok: true, avatar: null });
                        }
                        const ct = String(req.headers['content-type'] ?? '').split(';')[0].trim();
                        if (!['image/jpeg', 'image/png', 'image/webp'].includes(ct))
                            return json(res, 415, { error: 'نوع الصورة غير مدعوم. المسموح: JPG وPNG وWebP.' });
                        const declared = Number(req.headers['content-length'] ?? 0);
                        if (declared > AVATAR_MAX)
                            return json(res, 413, { error: 'الصورة كبيرة. الحد الأقصى 150 كيلوبايت بعد التصغير.' });
                        const chunks = [];
                        let size = 0;
                        let big = false;
                        await new Promise((resolve) => {
                            req.on('data', (c) => { size += c.length; if (size > AVATAR_MAX) {
                                big = true;
                                resolve();
                                req.destroy();
                            }
                            else
                                chunks.push(c); });
                            req.on('end', () => resolve());
                            req.on('error', () => resolve());
                        });
                        if (big)
                            return json(res, 413, { error: 'الصورة كبيرة. الحد الأقصى 150 كيلوبايت بعد التصغير.' });
                        const buf = Buffer.concat(chunks);
                        if (avatarDecodes >= 2)
                            return json(res, 429, { error: 'رفع الصور مشغول الحين. حاول بعد لحظة.' }, { 'Retry-After': '1' });
                        avatarDecodes++;
                        try {
                            const image = await normalizeAvatar(buf, ct);
                            const v = avatars.set(user.id, image.buf, image.type);
                            return json(res, 200, { ok: true, avatar: v });
                        }
                        catch (e) {
                            if (e instanceof ValidationError)
                                return json(res, 400, { error: e.message, code: e.code });
                            throw e;
                        }
                        finally {
                            avatarDecodes--;
                        }
                    }
                    return json(res, 405, { error: 'الطريقة غير مسموحة.' });
                }
                /* صورة لاعب معك بنفس الغرفة: لازم الطالب واللاعب كلاهما أعضاء فعليين (بشر) في الغرفة، وإلا 404 بدون كشف السبب */
                if (url.pathname === '/api/room-avatar' && (req.method === 'GET' || req.method === 'HEAD')) {
                    if (!user)
                        return json(res, 401, { error: 'ما فيه جلسة.' });
                    if (!roomAvatarLimiter.allow(user.id))
                        return json(res, 429, { error: 'محاولات كثيرة، جرّب بعد شوي.' });
                    const target = url.searchParams.get('id') ?? '';
                    const a = (await service.coPlayer(user, url.searchParams.get('code'), target)) ? avatars.get(target) : null;
                    if (!a)
                        return json(res, 404, { error: 'ما فيه صورة.' });
                    const etag = `"${a.v}-${a.buf.length}"`;
                    const h = { 'Content-Type': a.type, 'Cache-Control': 'private, max-age=86400', ETag: etag, Vary: 'Cookie', ...SECURITY_HEADERS };
                    if (req.headers['if-none-match'] === etag) {
                        res.writeHead(304, h);
                        return res.end();
                    }
                    res.writeHead(200, { ...h, 'Content-Length': a.buf.length });
                    return res.end(req.method === 'HEAD' ? undefined : a.buf);
                }
                if (url.pathname === '/api/rankings' && req.method === 'GET')
                    return json(res, 200, accounts.rankings(url.searchParams.get('game') ?? 'all', 20, user?.id, (id) => wallet.equippedAvatar(id)));
                if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
                    const period = url.searchParams.get('period') ?? 'weekly';
                    if (period !== 'weekly' && period !== 'monthly')
                        return json(res, 400, { error: 'فترة الترتيب غير صالحة.' });
                    return json(res, 200, board.top(20, user?.id, (id) => wallet.equippedAvatar(id), period));
                }
                if (url.pathname === '/api/admin/stats' && req.method === 'GET') {
                    const tok = process.env.ADMIN_TOKEN ?? '';
                    if (!tok)
                        return json(res, 404, { error: 'لوحة الإدارة غير مفعّلة على هذا الخادم.' });
                    if (!sessionLimiter.allow('a:' + ipOf(req)))
                        return json(res, 429, { error: 'محاولات كثيرة، جرّب بعد شوي.' });
                    const given = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
                    const a = Buffer.from(given), b = Buffer.from(tok);
                    if (a.length !== b.length || !timingSafeEqual(a, b))
                        return json(res, 401, { error: 'الرمز غلط.' });
                    return json(res, 200, { online: sockets.size, playing: (await store.listPlaying()).length, boardPlayers: board.top(1).total, games: registry.list().length, uptimeSec: Math.floor(process.uptime()) });
                }
                if (url.pathname === '/api/online' && req.method === 'GET') {
                    const g = url.searchParams.get('game') ?? '';
                    return json(res, 200, { online: sockets.size, waiting: mm.count(g) });
                }
                if (url.pathname === '/api/daily' && req.method === 'GET') {
                    if (!QUIZ_DEFS.some((d) => registry.get(d.info.id)))
                        return json(res, 410, { error: RETIRED_GAME_MESSAGE });
                    return json(res, 200, dailyQuestions(Date.now()));
                }
                if (url.pathname === '/api/challenge' && req.method === 'GET') {
                    if (!QUIZ_DEFS.some((d) => registry.get(d.info.id)))
                        return json(res, 410, { error: RETIRED_GAME_MESSAGE });
                    const seed = cleanSeed(url.searchParams.get('seed') ?? '');
                    if (!seed)
                        return json(res, 400, { error: 'رابط التحدي غير صحيح.' });
                    return json(res, 200, challengeQuestions(seed));
                }
                if (url.pathname === '/api/questions' && req.method === 'GET') {
                    // أسئلة للعب على نفس الجهاز: نفس بنوك الأسئلة اللي تستعملها الغرف
                    if (!sessionLimiter.allow('q:' + ipOf(req)))
                        return json(res, 429, { error: 'طلبات كثيرة، جرّب بعد شوي.' });
                    const n = Math.max(1, Math.min(30, Number(url.searchParams.get('n')) || 5));
                    const kinds = (url.searchParams.get('kinds') ?? '').split(',').filter(Boolean);
                    const activeDefs = QUIZ_DEFS.filter((d) => registry.get(d.info.id));
                    if (!activeDefs.length)
                        return json(res, 410, { error: RETIRED_GAME_MESSAGE });
                    const defs = activeDefs.filter((d) => (kinds.length ? kinds.includes(d.info.id) : ['trivia', 'capitals'].includes(d.info.id)));
                    if (!defs.length)
                        return json(res, 400, { error: 'نوع الأسئلة غير معروف.' });
                    const used = [];
                    const questions = [];
                    for (let i = 0; i < n; i++) {
                        const d = defs[Math.floor(Math.random() * defs.length)];
                        const q = d.make(Math.random, used);
                        used.push(q.key);
                        questions.push({ prompt: q.prompt, big: q.big, options: q.options, answer: q.answer, kind: d.info.id });
                    }
                    return json(res, 200, { questions });
                }
                // R62: الأجهزة
                if (url.pathname === '/api/devices' && req.method === 'GET') {
                    if (!user)
                        return json(res, 401, { error: 'سجّل دخولك.' });
                    const cur = sessions.tokenHash(req.headers.cookie);
                    const act = new Set(sessions.activeHashes(user.id));
                    return json(res, 200, { ok: true, list: devices.list(user.id, cur, (h) => act.has(h)) });
                }
                if ((url.pathname === '/api/devices/revoke' || url.pathname === '/api/devices/revoke-others') && req.method === 'POST') {
                    if (!user)
                        return json(res, 401, { error: 'سجّل دخولك.' });
                    if (!sameOrigin(req))
                        return json(res, 403, { error: 'طلب مرفوض.' });
                    let b = {};
                    try {
                        b = JSON.parse((await appReadBody(req)) || '{}');
                    }
                    catch {
                        return json(res, 400, { error: 'بيانات غير صالحة.' });
                    }
                    const cur = sessions.tokenHash(req.headers.cookie);
                    let n = 0;
                    if (url.pathname.endsWith('/revoke-others'))
                        n = sessions.revokeHashes(user.id, cur);
                    else {
                        const h = typeof b?.id === 'string' ? devices.resolve(user.id, b.id) : null;
                        if (!h || h === cur)
                            return json(res, 400, { error: 'هذا الجهاز مب موجود (أو هو جهازك الحالي — استخدم «تسجيل الخروج»).' });
                        n = sessions.revokeHashes(user.id, cur, h);
                    }
                    kickRevoked(user.id);
                    log('devices_revoked', { n });
                    return json(res, 200, { ok: true, revoked: n });
                }
                if (url.pathname === '/api/first-topup' && req.method === 'GET')
                    return json(res, 200, { ok: true, eligible: !!user && firstTopup.eligible(user.id) && (paymentSettings?.mode === 'live' || (paymentSettings?.mode === 'test' && firstTopup.allowTest)), percent: firstTopup.percent });
                if (url.pathname === '/api/season' && req.method === 'GET')
                    return json(res, 200, seasonView());
                // R62: هدية الدخول اليومي المتصاعدة
                if (url.pathname === '/api/home-banners' && req.method === 'GET')
                    return json(res, 200, { ok: true, list: homeBanners.publicList() });
                if (url.pathname.startsWith('/api/home-banners/img/') && (req.method === 'GET' || req.method === 'HEAD')) {
                    const buf = homeBanners.image(url.pathname.slice('/api/home-banners/img/'.length));
                    if (!buf)
                        return json(res, 404, { error: 'الصورة غير موجودة.' });
                    res.writeHead(200, { 'Content-Type': 'image/webp', 'Content-Length': buf.length, 'Cache-Control': 'public, max-age=31536000, immutable', ...SECURITY_HEADERS });
                    return res.end(req.method === 'HEAD' ? undefined : buf);
                }
                if (url.pathname === '/api/site-flags' && req.method === 'GET') {
                    const f = siteFlags.get();
                    return json(res, 200, { ok: true, cinema: f.cinema, bigGiftMin: f.bigGiftMin, profileBgVip: f.profileBgVip, streak: f.streak, roomBgLevel: currentTuning().roomBg });
                }
                if (url.pathname === '/api/daily-streak' && req.method === 'GET') {
                    if (!user)
                        return json(res, 401, { error: 'سجّل دخولك.' });
                    return json(res, 200, { ...streak.view(user.id, wallet.canClaim(user.id)), enabled: siteFlags.get().streak });
                }
                // R62: إشعارات الجوال
                if (url.pathname === '/api/push/key' && req.method === 'GET')
                    return json(res, 200, webPush ? { ok: true, key: webPush.publicKey, devices: user ? webPush.count(user.id) : 0 } : { ok: false });
                if ((url.pathname === '/api/push/subscribe' || url.pathname === '/api/push/unsubscribe') && req.method === 'POST') {
                    if (!user)
                        return json(res, 401, { error: 'سجّل دخولك.' });
                    if (!sameOrigin(req))
                        return json(res, 403, { error: 'طلب مرفوض.' });
                    if (!webPush)
                        return json(res, 503, { error: 'الإشعارات غير متاحة.' });
                    let b;
                    try {
                        b = JSON.parse(await appReadBody(req));
                    }
                    catch {
                        return json(res, 400, { error: 'بيانات غير صالحة.' });
                    }
                    if (url.pathname.endsWith('/unsubscribe')) {
                        if (typeof b?.endpoint === 'string')
                            webPush.unsubscribe(user.id, b.endpoint);
                        return json(res, 200, { ok: true, devices: webPush.count(user.id) });
                    }
                    if (!webPush.subscribe(user.id, b?.subscription, String(req.headers['user-agent'] ?? '')))
                        return json(res, 400, { error: 'هالمتصفح ما يدعم الإشعارات أو الاشتراك غير صالح.' });
                    if (b?.test)
                        void webPush.send(user.id, { title: 'لعبك 🎮', body: 'تمام! الإشعارات شغالة على هالجهاز.', url: '#/', tag: 'push-test' });
                    return json(res, 200, { ok: true, devices: webPush.count(user.id) });
                }
                if (url.pathname === '/api/me' && req.method === 'GET')
                    return json(res, 200, { deletion: user ? deletion.pending(user.id) : null, user, google: !!user && identities.linked(user.id), guestReadOnly: !!user && isGuest(user.id), ...(user && unlinkedGuest(user.id) && inGrace(user.id) ? { guestLockAt } : {}) });
                if (url.pathname === '/api/auth/config' && req.method === 'GET')
                    return json(res, 200, { google: cfg.googleClientId || null });
                if (url.pathname === '/api/auth/google' && req.method === 'POST') {
                    if (!cfg.googleClientId)
                        return json(res, 404, { error: 'الدخول بـ Google غير مفعّل.' });
                    if (!sameOrigin(req))
                        return json(res, 403, { error: 'طلب من مصدر غير مسموح.' });
                    if (!String(req.headers['content-type'] ?? '').startsWith('application/json'))
                        return json(res, 415, { error: 'نوع الطلب غير مدعوم.' });
                    if (!authLimiter.allow(ipOf(req)))
                        return json(res, 429, { error: 'محاولات كثيرة، جرّب بعد شوي.' });
                    let credential;
                    try {
                        credential = JSON.parse(await appReadBody(req, 8192)).credential;
                    }
                    catch {
                        return json(res, 400, { error: 'الطلب غير صالح.' });
                    }
                    let g;
                    try {
                        g = await verifyGoogleToken(credential, cfg.googleClientId, googleKeys);
                    }
                    catch (e) {
                        const code = e.message;
                        log('google_login_failed', { code });
                        if (code === 'certs_unavailable' || e.name === 'TimeoutError' || e.name === 'TypeError')
                            return json(res, 503, { error: 'ما قدرنا نتواصل مع Google للتحقق. جرّب بعد شوي.' });
                        return json(res, 401, { error: code === 'expired' ? 'انتهت صلاحية تسجيل الدخول، جرّب مرة ثانية.' : 'تعذّر التحقق من حساب Google.' });
                    }
                    const fromG = cleanName(g.name);
                    const gName = fromG.length >= 2 && !nameProblem(fromG) ? fromG : '';
                    let name = '';
                    let r;
                    try {
                        r = identities.resolve(g.sub, user?.id, newUserId, (proposed) => {
                            name = accounts.nameOf(proposed.id) || (proposed.adopted ? user.name : '') || gName || 'لاعب';
                            accounts.ensure(proposed.id, name);
                        });
                    }
                    catch (e) {
                        if (e instanceof StorageError) {
                            log('google_link_unsaved', { store: e.store, code: e.code });
                            return json(res, 503, { error: 'تعذّر حفظ ربط الحساب الآن. جرّب بعد شوي.' });
                        }
                        throw e;
                    }
                    if (r.created)
                        noteNet(r.id, req);
                    const next = { id: r.id, name };
                    accounts.noteActivity(next.id);
                    log('google_login', { created: r.created, adopted: r.adopted });
                    const cookie = issueSession(next);
                    if (user && user.id !== next.id) {
                        sessions.revokeCookie(req.headers.cookie);
                        closeSessionSockets(req.headers.cookie);
                    }
                    return json(res, 200, { user: next, google: true, created: r.created }, { 'Set-Cookie': cookie });
                }
                if (url.pathname === '/api/session' && req.method === 'POST') {
                    if (!sameOrigin(req))
                        return json(res, 403, { error: 'طلب من مصدر غير مسموح.' });
                    if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) {
                        return json(res, 415, { error: 'نوع الطلب غير مدعوم.' });
                    }
                    if (!sessionLimiter.allow(ipOf(req)))
                        return json(res, 429, { error: 'طلبات كثيرة، جرّب بعد شوي.' });
                    // لا حد على إنشاء الحسابات بحسب الشبكة: شبكات الجوال والواي فاي المشتركة تجمع لاعبين حقيقيين. النشاط المرتفع يظهر للإدارة كإشارة فقط (platform.netBursts).
                    let name = '';
                    try {
                        name = cleanName(JSON.parse(await appReadBody(req)).name);
                    }
                    catch {
                        return json(res, 400, { error: 'الطلب غير صالح.' });
                    }
                    if (name.length < 2)
                        return json(res, 400, { error: 'اكتب اسم من حرفين على الأقل.' });
                    const problem = nameProblem(name);
                    if (problem)
                        return json(res, 400, { error: problem });
                    const next = { id: user?.id ?? newUserId(), name };
                    accounts.touch(next.id, name);
                    accounts.noteActivity(next.id);
                    if (!user)
                        noteNet(next.id, req);
                    return json(res, 200, { user: next }, { 'Set-Cookie': issueSession(next) });
                }
                if (req.method === 'GET' || req.method === 'HEAD')
                    return serveStatic(req, res, url.pathname);
                json(res, 405, { error: 'الطريقة غير مسموحة.' });
            }
            catch (e) {
                if (e instanceof StorageError) {
                    log('http_storage_failed', { store: e.store, code: e.code });
                    if (!res.headersSent)
                        json(res, 503, { error: 'تعذر حفظ التغيير الآن. العملية ما اكتملت؛ حاول بعد شوي.', storage: true });
                    return;
                }
                log('http_error', { message: e.message });
                if (!res.headersSent)
                    json(res, 500, { error: 'صار خطأ في الخادم.' });
            }
            finally {
                finish();
            }
        });
        // ---------- WebSocket ----------
        const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
        server.on('upgrade', (req, socket, head) => {
            const url = new URL(req.url ?? '/', 'http://x');
            if (socialVoice.handleUpgrade(req, socket, head))
                return;
            const reject = (code) => {
                socket.write(`HTTP/1.1 ${code}\r\nConnection: close\r\n\r\n`);
                socket.destroy();
            };
            let session;
            try {
                session = sessions.cookieUser(req.headers.cookie);
            }
            catch {
                return reject('503 Service Unavailable');
            }
            const user = session ? { ...session, name: accounts.nameOf(session.id) || session.name } : null;
            if (url.pathname !== '/ws')
                return reject('404 Not Found');
            if (!sameOrigin(req))
                return reject('403 Forbidden');
            if (!user)
                return reject('401 Unauthorized');
            if (admin.maintenanceBlock(user))
                return reject('503 Service Unavailable');
            if (admin.banBlock(user))
                return reject('403 Forbidden');
            if ((sockets.get(user.id)?.size ?? 0) >= cfg.maxConnectionsPerUser)
                return reject('429 Too Many Requests');
            wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, user, req.headers.cookie ?? ''));
        });
        const ERR_RATE = 'بطيء شوي، رسائل كثيرة.';
        /** أوضاع اللعب غير المنفّذة (مثل «سهم» و«مداهمات» بلودو) ما تبدأ بها مباراة: الخادم يرفض أي variant غير classic، فالمنع ليس بالواجهة فقط */
        const variantBlock = (m) => (m.variant !== undefined && m.variant !== null && m.variant !== 'classic' ? { ok: false, error: 'هذا الوضع قيد التطوير ولا تبدأ فيه مباراة الحين. العب الكلاسيكي.' } : null);
        const voiceBlocked = (error) => ({ status: 'blocked', roomId: null, councilId: null, error });
        const resolveGameVoice = (user, code) => service.voiceContext(user, code, async (ctx) => {
            const binding = await socialRooms.ensureGameRoom(ctx, user.id);
            return { voice: binding.ok ? { status: 'ready', roomId: binding.roomId, councilId: binding.councilId } : voiceBlocked(binding.error) };
        });
        async function withGameVoice(user, result, enableVoice = true) {
            if (!result.ok)
                return result;
            if (!enableVoice)
                return { ...result, voice: voiceBlocked('game_voice_opted_out') };
            // The game commit is authoritative. A voice failure must never hide it,
            // undo a reservation, debit a stake or encourage a new creation key.
            const binding = await resolveGameVoice(user, result.room.code);
            return { ...result, voice: binding.ok ? binding.voice : voiceBlocked(binding.error) };
        }
        const QUIT_GATED = new Set(['room:create', 'room:join', 'mm:join']);
        async function dispatch(user, t, m) {
            const blocked = admin.maintenanceBlock(user) ?? admin.banBlock(user);
            if (blocked)
                return { ok: false, error: blocked };
            if (isGuest(user.id) && (GUEST_WS_BLOCK.has(t) || (t === 'room:create' && m?.mode !== 'bots')))
                return { ok: false, code: 'guest', error: GUEST_MSG };
            // R68z28: الخروج المتكرر يمنع دخول أي لعبة 5 دقايق
            if (QUIT_GATED.has(t)) {
                const qb = quitBlock(user.id);
                if (qb)
                    return qb;
            }
            switch (t) {
                case 'room:create':
                    if (typeof m.key !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(m.key))
                        return { ok: false, error: 'مفتاح إنشاء الغرفة مطلوب. حدّث الصفحة.' };
                    if (m.voice !== undefined && typeof m.voice !== 'boolean')
                        return { ok: false, error: 'خيار الصوت غير صالح.' };
                    return variantBlock(m) ?? withGameVoice(user, await service.createRoom(user, { gameId: m.gameId, mode: m.mode, seats: m.seats, key: m.key, visibility: m.visibility, password: m.password }), m.voice !== false);
                case 'room:join':
                    if (m.voice !== undefined && typeof m.voice !== 'boolean')
                        return { ok: false, error: 'خيار الصوت غير صالح.' };
                    return withGameVoice(user, await service.joinRoom(user, m.code, m.password), m.voice !== false);
                case 'room:voice':
                    return resolveGameVoice(user, m.code);
                case 'room:mine':
                    return { ok: true, rooms: await service.mine(user) };
                case 'room:leave': {
                    const mode = await service.modeFor(user, m.code);
                    const r = await service.leave(user, m.code);
                    if (r.ok && mode && mode !== 'bots') {
                        const q = recordQuit(user.id);
                        if (q.banned)
                            return { ...r, quitBan: q.until - Date.now() };
                    }
                    return r;
                }
                case 'room:delete':
                    return service.deleteRoom(user, m.code);
                case 'room:setGame':
                    return service.setGame(user, m.code, m.gameId);
                case 'room:ready':
                    return service.setReady(user, m.code, m.ready);
                case 'room:start':
                    return service.start(user, m.code);
                case 'room:rematch':
                    return service.rematch(user, m.code);
                case 'room:react':
                    return service.react(user, m.code, m.text);
                case 'mm:join': {
                    {
                        const vb = variantBlock(m);
                        if (vb)
                            return vb;
                    }
                    const stake = Number(m.stake) || 0; // قيمة واحدة تُفحص بالبوابة وتُمرَّر للمطابقة (لا تفسير مختلف بين الاثنين)
                    const blocked = stakeGate(user.id, stake);
                    return blocked ? { ok: false, ...blocked } : mm.join(user, m.gameId, m.seats, stake);
                }
                case 'wallet:get':
                    return { ok: true, coins: wallet.balance(user.id), gems: wallet.gems(user.id), canClaim: wallet.canClaim(user.id), stakes: availableStakes };
                case 'shop:ledger': {
                    const offset = m.offset === undefined ? 0 : m.offset;
                    if (!Number.isSafeInteger(offset) || offset < 0)
                        return { ok: false, error: 'صفحة سجل غير صالحة.' };
                    return { ok: true, offset, total: wallet.ledgerCount(user.id), ledger: wallet.ledgerOf(user.id, 60, offset) };
                }
                case 'shop:get':
                    return shopView(user.id);
                case 'city:get':
                case 'city:roll':
                case 'city:up':
                case 'city:claim':
                case 'city:tut':
                case 'city:seen':
                    try {
                        const nm = accounts.nameOf(user.id) || user.name;
                        if (m.t === 'city:roll') {
                            const r = city.roll(user.id, nm, Number(m.mult ?? 1), String(m.key ?? ''));
                            return { ok: true, res: r, city: city.view(user.id, nm) };
                        }
                        if (m.t === 'city:up') {
                            const r = city.upgrade(user.id, nm, Number(m.i));
                            return { ok: true, res: r, city: city.view(user.id, nm) };
                        }
                        if (m.t === 'city:claim') {
                            const r = city.claim(user.id, nm, String(m.mid ?? ''));
                            return { ok: true, res: r, city: city.view(user.id, nm) };
                        }
                        if (m.t === 'city:tut')
                            city.tutorialDone(user.id, nm);
                        if (m.t === 'city:seen')
                            city.seenLog(user.id, nm);
                        return { ok: true, city: city.view(user.id, nm) };
                    }
                    catch (e) {
                        if (e instanceof CityError)
                            return { ok: false, error: e.message };
                        if (e instanceof StorageError)
                            return { ok: false, error: STORAGE_MSG, storage: true };
                        throw e;
                    }
                case 'shop:buy':
                case 'shop:equip':
                case 'shop:gems':
                case 'shop:checkout':
                case 'shop:convert':
                case 'shop:claim':
                    try {
                        return shopCmd(user.id, m);
                    }
                    catch (e) {
                        if (e instanceof StorageError)
                            return { ok: false, error: STORAGE_MSG, storage: true };
                        throw e;
                    }
                case 'gift:list':
                case 'gift:log':
                case 'gift:find':
                case 'gift:send':
                case 'room:chat':
                    try {
                        return await giftCmd(user, t, m);
                    }
                    catch (e) {
                        if (e instanceof StorageError)
                            return { ok: false, error: STORAGE_MSG, storage: true };
                        throw e;
                    }
                case 'wallet:daily': {
                    let n;
                    try {
                        n = wallet.claimDaily(user.id);
                    }
                    catch (e) {
                        if (e instanceof StorageError)
                            return { ok: false, error: STORAGE_MSG, storage: true };
                        throw e;
                    }
                    if (!n)
                        return { ok: false, error: 'استلمت مكافأة اليوم. تعال بكرة.' };
                    // R62: هدية السلسلة فوق المكافأة اليومية (مفتاح ثابت لكل يوم — ما تتكرر)
                    let extra = 0, gemsGot = 0, day = 1;
                    if (siteFlags.get().streak)
                        try {
                            const st = streak.claim(user.id);
                            day = st.day;
                            if (st.bonus.coins > 0 && wallet.grant(user.id, 'coins', st.bonus.coins, `هدية الدخول اليومي — اليوم ${st.day}`, `streak:${st.today}:c`))
                                extra = st.bonus.coins;
                            if (st.bonus.gems > 0 && wallet.grant(user.id, 'gems', st.bonus.gems, `هدية اليوم السابع`, `streak:${st.today}:g`))
                                gemsGot = st.bonus.gems;
                        }
                        catch (e) {
                            log('streak_failed', { error: String(e.message).slice(0, 100) });
                        }
                    // R67ae: فعالية «ضعف اليومية» من اللوحة (مفتاح ثابت لليوم — ما تتكرر)
                    {
                        const ev = siteFlags.activeEvents().find((e) => e.kind === 'daily2x');
                        if (ev) {
                            const dk = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
                            try {
                                if (wallet.grant(user.id, 'coins', n, 'فعالية: ضعف المكافأة اليومية 🎉', `daily2x:${ev.id}:${dk}`))
                                    extra += n;
                            }
                            catch { /* المكافأة الأساسية انصرفت */ }
                        }
                    }
                    return { ok: true, got: n + extra, base: n, bonus: extra, gems: gemsGot, streakDay: day, coins: wallet.balance(user.id), gemBalance: wallet.gems(user.id) };
                }
                case 'mm:leave':
                    return { ok: true, left: mm.leave(user.id) };
                case 'mm:fill':
                    return mm.fillWithBots(user.id);
                case 'mm:status':
                    return { ok: true, status: mm.status(user.id) };
                case 'game:action':
                    return service.action(user, m.code, m.ver, m.action);
                default:
                    return { ok: false, error: 'أمر غير معروف.' };
            }
        }
        function onConnection(ws, user, cookie) {
            socketSessions.set(ws, { cookie, hash: sessionTokenHash(cookie) ?? '' });
            let set = sockets.get(user.id);
            if (!set) {
                sockets.set(user.id, (set = new Set()));
                notifyFriends(user.id, (f) => ({ t: 'friend:online', id: community.pub(user.id), name: accounts.nameOf(user.id) }), 'on:' + user.id, 10 * 60_000);
            }
            set.add(ws);
            const bucket = new TokenBucket(Number(process.env.WS_BURST) || 20, Number(process.env.WS_RATE) || 6);
            let alive = true;
            ws.on('pong', () => (alive = true));
            const beat = setInterval(() => {
                try {
                    if (sessions.cookieUser(cookie)?.id !== user.id) {
                        ws.close(4401, 'session ended');
                        return;
                    }
                }
                catch {
                    ws.close(4503, 'session storage unavailable');
                    return;
                }
                if (!alive)
                    return ws.terminate();
                alive = false;
                ws.ping();
            }, 25_000);
            const connectionReady = pendingWrites.track('room-connect', async () => { const rooms = await service.connect(user.id); await socialRooms.connect(user.id); accounts.noteActivity(user.id); return rooms; });
            connectionReady
                .then((rooms) => (activity.note(user.id, 'login'), send(ws, { t: 'hello', user, rooms, coins: wallet.balance(user.id), canClaim: wallet.canClaim(user.id), stakes: availableStakes })))
                .catch((e) => { log('connect_error', { message: e.message }); ws.close(4503, 'room storage unavailable'); });
            ws.on('message', async (raw) => {
                let m;
                try {
                    m = JSON.parse(raw.toString());
                }
                catch {
                    return send(ws, { ok: false, error: 'رسالة غير صالحة.' });
                }
                const id = m?.id;
                if (!bucket.take())
                    return send(ws, { r: id, ok: false, error: ERR_RATE });
                if (typeof m?.t !== 'string')
                    return send(ws, { r: id, ok: false, error: 'رسالة غير صالحة.' });
                const finish = pendingWrites.begin('ws-requests');
                try {
                    await connectionReady;
                    if (ws.readyState !== 1 || sessions.cookieUser(cookie)?.id !== user.id) {
                        ws.close(4401, 'session ended');
                        return;
                    }
                    send(ws, { r: id, ...(await dispatch({ ...user, name: accounts.nameOf(user.id) || user.name }, m.t, m)) });
                }
                catch (e) {
                    log('dispatch_error', { message: e.message });
                    if (e instanceof StorageError)
                        return send(ws, { r: id, ok: false, error: 'تعذّر حفظ العملية الحين.', storage: true });
                    send(ws, { r: id, ok: false, error: 'صار خطأ، جرّب مرة ثانية.' });
                }
                finally {
                    finish();
                }
            });
            ws.on('close', () => {
                clearInterval(beat);
                set.delete(ws);
                if (set.size === 0)
                    sockets.delete(user.id);
                if (set.size === 0)
                    mm.leave(user.id);
                void pendingWrites.track('room-disconnect', () => service.disconnect(user.id)).catch(() => undefined);
                void pendingWrites.track('social-disconnect', async () => { await connectionReady.catch(() => undefined); await socialRooms.disconnect(user.id); }).catch(() => log('social_disconnect_failed'));
            });
            ws.on('error', () => ws.terminate());
        }
        const tickTimer = setInterval(() => {
            if (!pendingWrites.has('room-tick'))
                void pendingWrites.track('room-tick', () => service.tick()).catch(() => undefined);
            if (!pendingWrites.has('social-challenge-tick'))
                void pendingWrites.track('social-challenge-tick', () => socialRooms.sweep()).catch(() => undefined);
        }, cfg.tickMs);
        const storageTimer = setInterval(retryStorage, 15_000);
        storageTimer.unref();
        const cleanTimer = setInterval(() => {
            if (!pendingWrites.has('room-cleanup'))
                void pendingWrites.track('room-cleanup', () => service.cleanup()).catch(() => undefined);
            mm.sweep();
        }, 60_000);
        await new Promise((resolve) => server.listen(cfg.port, cfg.host, resolve));
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : cfg.port;
        log('listening', { port });
        const stopServing = async (force) => {
            clearInterval(tickTimer);
            clearInterval(cleanTimer);
            clearInterval(storageTimer);
            clearInterval(micTimer);
            clearInterval(warTimer);
            clearInterval(seasonTimer);
            clearInterval(gemsTimer);
            clearInterval(inviteTimer);
            devices.stop();
            admin.stop();
            backups?.stop();
            bulkGrants.close();
            await socialVoice.close();
            wss.clients.forEach((c) => c.terminate());
            await new Promise((r) => wss.close(() => r()));
            const closed = new Promise((r) => server.close(() => r()));
            if (force) {
                server.closeIdleConnections();
                setTimeout(() => server.closeAllConnections(), 1000).unref();
            }
            await closed;
        };
        return {
            server,
            service,
            port,
            retryStorage,
            async shutdown(timeoutMs = cfg.shutdownTimeoutMs) {
                log('shutdown_start', { timeoutMs });
                await stopServing(true);
                if (!pendingWrites.has('vip-membership-inflight'))
                    void pendingWrites.track('vip-membership-inflight', () => vipMembership.waitForIdle()).catch(() => undefined);
                if (!pendingWrites.has('payments-inflight'))
                    void pendingWrites.track('payments-inflight', () => payments.waitForIdle()).catch(() => undefined);
                if (!pendingWrites.has('social-inflight'))
                    void pendingWrites.track('social-inflight', () => socialRooms.waitForIdle()).catch(() => undefined);
                const rep = await flushUnsaved(timeoutMs, {
                    retry: retryStorage,
                    unsaved: () => ({
                        pendingPayouts: wallet.pendingCount(),
                        stores: [...new Set([...newUnsaved(), ['community', transportStoreUnsaved(community)], ['gifts', transportStoreUnsaved(giftcat)], ['city', city.unsaved()], ['economy', economy.unsaved()], ['progression', progression.unsaved()], ['wallet', wallet.unsaved()], ['leaderboard', board.unsaved()], ['accounts', accounts.unsaved()], ['identities', identities.unsaved()], ['platform', platform.unsaved()], ['shop', shopcat.unsaved()], ...pendingWrites.stores().map((name) => [name, true])].filter(([, u]) => u).map(([n]) => n))],
                    }),
                    failing: () => !storage.status().ready,
                });
                // عدد وأسماء ملفات فقط، بدون أي بيانات لاعبين
                log(rep.clean ? 'shutdown_clean' : 'shutdown_unsaved', { ...rep });
                await socialRooms.close();
                await store.close().catch(() => undefined);
                writerLock?.release();
                return rep;
            },
            async close() {
                await stopServing(false);
                await payments.waitForIdle();
                await vipMembership.waitForIdle();
                await Promise.all(supportJobs.values());
                await socialRooms.close();
                await store.close();
                writerLock?.release();
            },
        };
    }
    catch (e) {
        await ownedStore?.close().catch(() => undefined);
        writerLock?.release();
        throw e;
    }
}
async function main() {
    const cfg = loadConfig();
    const app = await createApp(cfg);
    let stopping = false;
    const stop = async () => {
        if (stopping)
            return; // إشارة ثانية أثناء الإيقاف: نتجاهلها
        stopping = true;
        // شبكة أمان لو علق شيء غير متزامن (الكتابة المتزامنة المعلّقة ما تنقطع، وهنا يتدخل systemd بـTimeoutStopSec)
        setTimeout(() => process.exit(1), cfg.shutdownTimeoutMs + 5000).unref();
        const rep = await app.shutdown();
        process.exit(rep.clean ? 0 : 1);
    };
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main().catch((e) => {
        if (e.code === 'ROOM_STORAGE_NOT_READY') {
            console.error(e.message);
            process.exit(78);
        }
        if (e instanceof DataFilesCorruptError) {
            console.error(describeDataFailure(e));
            process.exit(78); // EX_CONFIG: خطأ إعداد/بيانات يحتاج تدخل بشري (لا يفيد إعادة التشغيل التلقائي)
        }
        console.error(e);
        process.exit(1);
    });
}
