import { moderateText } from './moderation-r58.js';
import { Economy, validEconomy, MANUAL_CONVERSION_DISABLED, MANUAL_CONVERSION_CLOSED_MESSAGE } from './economy.js';
import { GIFT_REWARD_POLICY, quoteGiftRewards } from './gift-rewards.js';
import { quoteGiftBatch } from './social-gift-batch-r27.js';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
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
import { CpPoints, cpKey, cpLevelOf } from './cp-r58.js';
import { achOf, achView, earned } from './achievements.js';
import { City, CityError, validCity } from './city.js';
import { ShopCatalog, validShop, shopEligibility } from './shopcatalog.js';
import { Wallet, STAKES, validWallet } from './wallet.js';
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
import { FunctionalHttp } from './functional-http.js';
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
        "font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' blob: ws: wss:; " +
        "media-src 'self' blob:; " +
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
    const cpFile = process.env.CP_POINTS_FILE ?? (cfg.socialPrivateFile ? path.join(path.dirname(cfg.socialPrivateFile), 'cp-points.json') : '');
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
        const writtenPaths = [cfg.walletFile, cfg.leaderboardFile, accFile, platFile, economyFile, progressionFile, shopFile, idFile, giftFile, cityFile, comFile, accountToolsFile, socialFile, socialRoomsFile, profileSocialFile, missionsFile, rankRewardsFile, supportFile, outboxFile, sessionsFile, paymentsFile, vipMembershipFile, cfg.avatarsDir, cfg.communityMediaDir].filter((v) => !!v);
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
            { file: cfg.walletFile ?? '', validate: validWallet }, { file: cfg.leaderboardFile ?? '', validate: validBoard },
            { file: accFile, validate: validAccounts }, { file: idFile, validate: validIdentities }, { file: comFile, validate: validCommunity }, { file: giftFile, validate: validGiftOverrides }, { file: cityFile, validate: validCity },
        ]);
        const storage = new StorageMonitor(log);
        const sessions = new SessionRegistry(sessionsFile, cfg.cookieSecret, Date.now, storage);
        const board = new Leaderboard(cfg.leaderboardFile ?? '', Date.now, storage);
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
        const outbox = new FunctionalOutbox(outboxFile, Date.now, storage);
        const vipMembership = new VipMembership(vipMembershipFile, { wallet, progression, hasAccount: id => accounts.has(id), mon: storage, catalogItem: id => shopcat.get(id), notify: notice => { support.announce([notice.userId], notice.title, notice.body, 'VIP', notice.ref); } });
        const paymentSettings = cfg.payments;
        const provider = opts.paymentProvider ?? (!cfg.complimentaryPurchases && paymentSettings && paymentSettings.mode !== 'disabled' && paymentSettings.provider === 'tap' && paymentSettings.secretKey && paymentSettings.merchantId ? new TapPaymentProvider({ mode: paymentSettings.mode, secretKey: paymentSettings.secretKey, merchantId: paymentSettings.merchantId }) : null);
        const payments = new Payments({ file: paymentsFile, wallet, economy, provider, complimentaryPurchases: cfg.complimentaryPurchases, mode: paymentSettings?.mode ?? 'disabled', liveApproved: paymentSettings?.liveApproved ?? false, licenseApproved: paymentSettings?.licenseApproved ?? false, merchantApproved: paymentSettings?.merchantApproved ?? false, publicBaseUrl: paymentSettings?.publicBaseUrl ?? '', production: cfg.production, mon: storage, notify: (id, orderId, text) => { support.announce([id], 'تأكيد عملية الباقة', text, 'payments-server', 'payment:' + orderId + ':' + (text.includes('استرجاع') ? 'refund' : 'paid')); sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id) }); } });
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
        const googleKeys = opts.googleKeys ?? googleKeyFetcher();
        const authLimiter = new KeyedLimiter(30, 30 / 60);
        // زر Google يحتاج هذي المصادر بالضبط (حسب توثيق Google)؛ ما نفتحها إلا إذا الدخول بـ Google مفعّل
        if (cfg.googleClientId) {
            securityHeaders['Content-Security-Policy'] =
                "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; " +
                    "font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' blob: ws: wss: https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/; " +
                    "media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
        }
        /* ---- المتجر: كل التحقق بالخادم. العميل يرسل معرّف العنصر ومفتاح الطلب فقط ---- */
        const progress = (id) => { const pr = canonicalProfile(id, 0); return { wins: pr.wins, played: pr.played, level: pr.level, progression: progression.view(id) }; };
        const achInput = (id) => { const st = accounts.achStats(id); const gc = wallet.giftCounts(id); return { ...st, giftsSent: gc.sent, giftsRecv: gc.recv, owned: wallet.owned(id).length }; };
        /** R57: هل الرقم مستخدم من حساب ثاني (أيدي عادي أو مميز)؟ */
        const specialTaken = (id, value) => { const owner = accounts.findByDisplayPlayerId(value); return owner !== null && owner !== id; };
        const shopView = (id) => {
            const pr = progress(id);
            const got = new Set(wallet.claimed(id));
            const owned = new Set(wallet.owned(id));
            const ranks = { level: pr.progression.level.value, vip: pr.progression.vip.enabled && pr.progression.vip.value ? Number(pr.progression.vip.value.slice(1)) : 0, noble: pr.progression.noble.enabled && pr.progression.noble.value ? Number(pr.progression.noble.value.slice(1)) : 0 };
            const allItems = shopcat.all().map((i) => ({ id: i.id, slot: i.slot, name: i.name, icon: i.icon, desc: i.desc, price: i.price, currency: i.currency, permanent: i.permanent, css: i.css, art: i.art, active: i.active, retired: !i.active, status: i.status, minLevel: i.minLevel, minVip: i.minVip, minNoble: i.minNoble, eligibility: shopEligibility(i, ranks), rarity: i.rarity ?? 'common', set: i.set ?? null, season: i.season ?? null, kids: !!i.kids, ...(i.backgroundCategory ? { backgroundCategory: i.backgroundCategory, priceApproved: i.priceApproved } : {}), ...(i.slot === 'entrance' ? { proposalOnly: i.proposalOnly, priceApproved: i.priceApproved } : {}) }));
            return {
                ok: true, canDaily: wallet.canClaim(id), coins: wallet.balance(id), gems: wallet.gems(id), owned: wallet.owned(id), equipped: wallet.equipped(id), equippedView: equippedView(id),
                // R57: الأيدي المميز المحجوز لحساب ثاني ما ينعرض
                items: allItems.filter((i) => !(CARS_REMOVED && i.slot === 'entrance') && (i.status !== 'hidden' || owned.has(i.id)) && !(i.slot === 'special-id' && !owned.has(i.id) && specialTaken(id, String(i.css ?? ''))) && !(i.slot === 'room-id' && !owned.has(i.id) && wallet.anyOwner(i.id, id))),
                collectionItems: allItems.filter((i) => !(CARS_REMOVED && i.slot === 'entrance') && i.set && (i.status !== 'hidden' || owned.has(i.id))),
                sets: SETS, rarities: RARITIES, achievements: achView(achInput(id)),
                economy: economy.view(), gemPacks: [],
                milestones: MILESTONES.map((x) => ({ ...x, value: pr[x.metric], done: got.has(x.id), ready: !got.has(x.id) && pr[x.metric] >= x.goal })),
                ledger: wallet.ledgerOf(id, 60), ledgerTotal: wallet.ledgerCount(id), progression: progression.view(id),
            };
        };
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
                // السعر دائماً من الخادم. لو العميل أرسل السعر اللي شافه وتغيّر، نرفض ونرجّع المتجر محدّثاً (ما نخصم سعراً ما شافه).
                if ((m.seen !== undefined && m.seen !== it.price) || (m.seenCur !== undefined && m.seenCur !== it.currency))
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
                const r = wallet.buy(id, it, String(m.key ?? ''));
                if (!r.ok && prevSpecial !== undefined) {
                    try {
                        accounts.setSpecialPlayerId(id, prevSpecial);
                    }
                    catch { /* يبقى كما هو؛ ما فيه خصم */ }
                }
                if (!r.ok)
                    return { ok: false, error: r.code === 'owned' ? 'تملك هذا العنصر من قبل.' : r.code === 'poor' ? (it.currency === 'gems' ? 'جواهرك ما تكفي.' : 'عملاتك ما تكفي.') : 'طلب غير صالح.', code: r.code };
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
                    return { ok: false, code: 'souvenir', error: 'التذكار ما يتجهّز؛ ينعرض تلقائيًا في رف تذكاراتك بالملف.' };
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
                return { ok: false, error: `مجموع ${quote.total.toLocaleString('en-US')} جوهرة لجميع المستلمين يحتاج تأكيد.`, code: 'confirm', total: quote.total };
            if (m.to.some((to) => !accounts.has(to) || !wallet.has(to) || platform.isBanned(to)))
                return { ok: false, error: 'أحد المستلمين غير متاح. لم تُرسل أي هدية.', code: 'noto' };
            const fromName = accounts.nameOf(user.id) || user.name, toNames = Object.fromEntries(m.to.map((to) => [to, accounts.nameOf(to) || 'لاعب']));
            const r = wallet.sendGiftBatch(user.id, m.to, g, m.qty, m.key, scope, fromName, toNames);
            if (!r.ok)
                return { ok: false, error: r.code === 'poor' ? 'جواهرك لا تكفي للمجموع. لم تُرسل أي هدية.' : r.code === 'self' ? 'ما تقدر ترسل هدية لنفسك.' : 'طلب الهدايا مب صالح. لم تُرسل أي هدية.', code: r.code };
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
                return { ok: false, error: `هدية بقيمة ${quote.total.toLocaleString('en-US')} جوهرة تحتاج تأكيد.`, code: 'confirm', total: quote.total };
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
                return { ok: false, error: r.code === 'poor' ? 'جواهرك ما تكفي لهذي الهدية.' : r.code === 'self' ? 'ما تقدر ترسل هدية لنفسك.' : r.code === 'noto' ? 'هذا اللاعب غير متاح لاستلام الهدايا.' : 'طلب غير صالح.', code: r.code };
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
                if (accountTools.explicitSetting(userId, 'showPresence') === false)
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
                    if (!sockets.has(f))
                        continue;
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
            onGameFinished(room, players, winners, ref) {
                deliverIntent('game:' + ref);
            },
            onRoom(room) {
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
                let body = await readFile(file);
                const gz = /\.(js|css|html|svg|webmanifest|json)$/.test(ext) && body.length > 1024 && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
                if (gz)
                    body = gzipSync(body);
                res.writeHead(200, {
                    ...(gz ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {}),
                    'Content-Type': MIME[ext] ?? 'application/octet-stream',
                    'Cache-Control': ext === '.html' || ext === '.webmanifest' || path.basename(file) === 'sw.js' ? 'no-cache' : 'public, max-age=3600',
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
            secret: cfg.cookieSecret, nameOf: (id) => accounts.nameOf(id), avOf: (id) => wallet.equippedAvatar(id), stats: (id) => accountTools.settings(id).showActivity ? accounts.publicStats(id) : null,
            hasAccount: (id) => accounts.has(id), allIds: () => accounts.all().map((a) => a.id), isBanned: (id) => platform.isBanned(id),
            push: (id, msg) => sendToUser(id, msg), log,
        }, Date.now, storage, opts.communityLimits);
        const social = new SocialPrivate(socialFile, Date.now, storage, {
            hasAccount: (id) => accounts.has(id), isBanned: (id) => platform.isBanned(id),
            resolvePublicId: pub => community.resolvePublicId(pub),
            adultSelfDeclared: id => { const age = accounts.socialAge(id); return age === null ? null : age >= 18; },
            isDeactivated: id => !accounts.has(id),
            isBlocked: (a, b) => community.pairBlocked(a, b), isMuted: (a, b) => community.isMuted(a, b),
            pub: (id) => community.pub(id), nameOf: (id) => accounts.nameOf(id),
        });
        const cpPoints = new CpPoints(cpFile, Date.now, storage);
        // R58w: هدية بين طرفين بينهم ارتباط افتراضي (R47) ترفع نقاط CP
        const cpGift = (from, to, rec) => { try {
            if (rec.cur !== 'gems')
                return;
            const c = social.coupleOf(from);
            if (!c || c.partner !== to || rec.ts < c.at)
                return;
            const v = rec.total ?? rec.price * (rec.qty ?? 1);
            if (cpPoints.add(cpKey(c.id, from, to), v))
                for (const id of [from, to])
                    sendToUser(id, { t: 'cp:update', kind: 'points' });
        }
        catch { /* الهدية انحفظت؛ نقاط CP بس */ } };
        /* R53: «من الذي رآني» و«ادعُ الأصدقاء» — نفس الحسابات والمعرّف العام والحظر والخصوصية القائمة؛ بدون أي حركة مالية */
        const profileSocial = new ProfileSocial(profileSocialFile, {
            hasAccount: (id) => accounts.has(id), isBanned: (id) => platform.isBanned(id), blocked: (a, b) => community.pairBlocked(a, b),
            hidesActivity: (id) => accountTools.settings(id).showActivity === false, sinceOf: (id) => accounts.sinceOf(id),
            resolvePublicId: (pub) => community.resolvePublicId(pub),
            who: (id) => { const photo = avatars.version(id); const lv = accounts.publicStats(id)?.level; return { publicId: community.pub(id), name: accounts.nameOf(id) || 'لاعب', avatar: photo !== null ? `/api/social/avatar?id=${community.pub(id)}&v=${photo}` : wallet.equippedAvatar(id), level: typeof lv === 'number' ? lv : null }; },
            log,
        }, Date.now, storage);
        const socialEligible = (id) => accounts.has(id) && !platform.isBanned(id) && (accounts.socialAge(id) === null || Number(accounts.socialAge(id)) >= 18);
        let socialVoice = null;
        const socialRooms = new SocialRooms({ file: socialRoomsFile, mon: storage, graceMs: cfg.reconnectGraceMs, gameVoiceSecret: cfg.cookieSecret,
            cannon: { wallet, catalog: shopcat, pendingCount: id => outbox.pending().filter(i => i.payload.kind === 'gift' && validCannonGiftContext(i.payload.cannonSupport) && i.payload.cannonSupport.cannonId === id).length,
                onAward: (id, eventId) => { sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 }); support.announce([id], 'مكافأة مدفع الغرفة', 'تمت إضافة الإطار والخلفية الدائمين إلى ملكيتك. حدّث المتجر لعرضهما.', 'room-cannon-r27', 'cannon:' + eventId); } },
            pendingChallengeGift: id => outbox.pending().some(intent => intent.payload.kind === 'gift' && validGiftSupportContext(intent.payload.socialSupport) && intent.payload.socialSupport.challengeId === id),
            pendingSupportCount: id => outbox.pending().filter(intent => intent.payload.kind === 'gift' && validGiftSupportContext(intent.payload.socialSupport) && (id === null || intent.payload.socialSupport.challengeId === id)).length,
            reconcileGift: (from, to, ref) => { if (wallet.hasGiftSource(from, to, ref))
                deliverIntent('gift:' + ref); },
            // R58: ليفل الغرفة من قيمة الهدايا الملتزمة بالمحفظة (جواهر داخل نفس الغرفة)
            giftValue: (from, to, ref, roomId) => { const rec = wallet.committedGiftReceipt(from, to, ref); if (!rec || rec.cur !== 'gems' || rec.status !== 'done' || typeof rec.room !== 'string' || !rec.room.startsWith(`social:${roomId}:`))
                return null; const v = rec.total ?? rec.price * (rec.qty ?? 1); return Number.isSafeInteger(v) && v > 0 ? v : null; },
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
                const bubble = cosm('chat-bubble'), board = cosm('board'), micFrame = cosm('mic-frame');
                return { id, publicId: community.pub(id), name: accounts.nameOf(id), avatar: photo !== null ? `/api/social/avatar?id=${community.pub(id)}&v=${photo}` : wallet.equippedAvatar(id), ...(frame ? { frame } : {}), ...(bubble ? { bubble } : {}), ...(board ? { board } : {}), ...(micFrame ? { micFrame } : {}), ranks: { level: p.level.enabled ? p.level.value : null, vip: p.vip.enabled ? vip : null, noble: p.noble.enabled ? noble : null }, ...(entrance ? { entrance } : {}) };
            },
            blocked: (a, b) => community.pairBlocked(a, b), eligible: socialEligible, trustedAdmin: id => id === 'token',
            emit: (ids, event) => { for (const id of ids)
                sendToUser(id, event); },
            disconnectMedia: id => socialVoice?.disconnectUser(id) ?? Promise.resolve(),
            audit: (actorId, action, targetId, reason) => { platform.audit({ actorId, actor: actorId === 'token' ? 'رمز الإدارة' : accounts.nameOf(actorId) || 'إدارة المنصة', role: actorId === 'token' ? 'owner' : platform.roleOf(actorId) || 'social-host', action: 'social.' + action, target: targetId, detail: reason }); }, });
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
        const admin = createAdmin({ community, giftcat, economy, payments,
            platform, shopcat, wallet, accounts, board, progression, accountTools, service, bulkGrants, store, storage, cfg, registry, sockets, log, json, readBody: appReadBody, sameOrigin, ipOf,
            kick: (id, why) => sockets.get(id)?.forEach((ws) => ws.close(why === 'banned' ? 4403 : 4503, why)),
            walletChanged: id => sendToUser(id, { t: 'wallet', coins: wallet.balance(id), gems: wallet.gems(id), won: 0 }),
            errors: () => errRing, token: () => process.env.ADMIN_TOKEN ?? '',
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
        functionalHttp.add('GET', '/api/friends/live', ({ user }) => {
            const ids = social.friendInternalIds(user.id).slice(0, 200);
            const list = ids.map((f) => {
                const room = accountTools.explicitSetting(f, 'showPresence') === false ? null : socialRooms.friendRoom(user.id, f);
                const photo = avatars.version(f);
                return { id: community.pub(f), name: accounts.nameOf(f), avatar: photo !== null ? `/api/social/avatar?id=${community.pub(f)}&v=${photo}` : null, room };
            });
            list.sort((a, b) => Number(!!b.room) - Number(!!a.room) || String(a.name).localeCompare(String(b.name), 'ar'));
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
        wireSocialRoutes(functionalHttp, { onRoomJoin: (uid, roomId) => notifyFriends(uid, (f) => { const room = socialRooms.friendRoom(f, uid); return room && room.id === roomId ? { t: 'friend:room', id: community.pub(uid), name: accounts.nameOf(uid), room: { id: room.id, name: room.name, locked: room.locked } } : null; }, 'room:' + uid + ':' + roomId, 5 * 60_000), rooms: socialRooms, voice: socialVoice, platform, eligible: socialEligible, publicId: id => community.pub(id), presentFriends: (id, publicIds) => social.friendsPresent(id, new Set(publicIds)), resolveTarget: value => accounts.has(value) ? value : community.resolvePublicId(value) ?? accounts.findByDisplayPlayerId(value) ?? null,
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
                if (url.pathname === '/api/me' && req.method === 'GET')
                    return json(res, 200, { user, google: !!user && identities.linked(user.id) });
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
        async function dispatch(user, t, m) {
            const blocked = admin.maintenanceBlock(user) ?? admin.banBlock(user);
            if (blocked)
                return { ok: false, error: blocked };
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
                case 'room:leave':
                    return service.leave(user, m.code);
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
                    return n ? { ok: true, got: n, coins: wallet.balance(user.id) } : { ok: false, error: 'استلمت مكافأة اليوم. تعال بكرة.' };
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
                .then((rooms) => send(ws, { t: 'hello', user, rooms, coins: wallet.balance(user.id), canClaim: wallet.canClaim(user.id) }))
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
            admin.stop();
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
