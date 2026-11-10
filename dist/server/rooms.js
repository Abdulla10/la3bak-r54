import { randomInt, randomUUID, randomBytes, createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
import { isRetiredGame, RETIRED_GAME_MESSAGE } from '../engine/retired-games.js';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
export function normalizeCode(input) {
    return String(input ?? '')
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .toUpperCase()
        .replace(/[\s\-_]/g, '');
}
const fail = (error) => ({ ok: false, error });
/** ردود سريعة جاهزة: إيموجي وعبارات قصيرة فقط، بدون كتابة حرة (آمنة للأطفال) */
export const REACTIONS = ['👍', '😂', '😮', '😡', '🔥', '👏', '🤔', '❤️', '😎', '🙏', 'يلا!', 'حظ سعيد', 'أحسنت', 'استعجل ⏳'];
export class RoomService {
    store;
    registry;
    cfg;
    hooks;
    now;
    board;
    wallet;
    accounts;
    avatarVersion;
    equippedAvatar;
    serverProfile;
    locks = new Map();
    online = new Map();
    botPlans = new Map();
    /** طلب إغلاق إداري تعلّق حفظ استرجاعه؛ نوقف اللعب لين يثبت الاسترجاع. */
    closingPaid = new Set();
    finishedPayoutQueue = [];
    constructor(store, registry, cfg, hooks, now = Date.now, board, wallet, accounts, avatarVersion, equippedAvatar, serverProfile) {
        this.store = store;
        this.registry = registry;
        this.cfg = cfg;
        this.hooks = hooks;
        this.now = now;
        this.board = board;
        this.wallet = wallet;
        this.accounts = accounts;
        this.avatarVersion = avatarVersion;
        this.equippedAvatar = equippedAvatar;
        this.serverProfile = serverProfile;
    }
    lastReact = new Map();
    /** ردود سريعة: ما تنحفظ ولا تغيّر حالة اللعبة، بس تنوزع على اللي بالغرفة */
    async react(user, rawCode, text) {
        if (typeof text !== 'string' || !REACTIONS.includes(text))
            return fail('هذا الرد غير مسموح.');
        const code = normalizeCode(rawCode);
        if (!CODE_RE.test(code))
            return fail('رمز الغرفة غير صحيح.');
        const room = await this.store.get(code);
        if (!room || !this.member(room, user.id))
            return fail('أنت مو في هذي الغرفة.');
        const t = this.now();
        if (t - (this.lastReact.get(user.id) ?? 0) < 1200)
            return fail('بطيء شوي.');
        this.lastReact.set(user.id, t);
        if (this.lastReact.size > 5000)
            this.lastReact.clear();
        this.hooks.onReact?.(room, user.id, user.name, text);
        return { ok: true };
    }
    // ---------- أدوات داخلية ----------
    async lock(code, fn) {
        const prev = this.locks.get(code) ?? Promise.resolve();
        const run = prev.then(fn, fn);
        const tail = run.catch(() => undefined);
        this.locks.set(code, tail);
        try {
            return await run;
        }
        finally {
            if (this.locks.get(code) === tail)
                this.locks.delete(code);
        }
    }
    async persist(room) {
        const engine = this.engineOf(room);
        const ref = `${room.code}:${room.gameNo}`;
        const rewarded = room.players.filter((p) => !p.bot && !(room.mode === 'bots' && this.hooks.noRewards?.(p.id)));
        const release = rewarded.length && this.accounts && room.status === 'finished' && room.state && room.gameNo && engine && !this.accounts.hasRecorded(ref)
            ? this.hooks.onBeforeGameFinished?.(room, rewarded.map((p) => ({ id: p.id, name: p.name })), engine.outcome(room.state).winners, ref, this.now()) : undefined;
        try {
            const expected = room.revision;
            room.revision = expected + 1;
            room.updatedAt = this.now();
            const ok = await this.store.update(room, expected);
            if (!ok) {
                room.revision = expected;
                throw new Error('conflict');
            }
            const won = this.settle(room);
            this.tally(room);
            this.account(room, won);
        }
        finally {
            if (typeof release === 'function')
                release();
        }
    }
    /** الحساب الموحّد: تاريخ + إحصاءات + نقاط تصنيف + خبرة، مرة وحدة لكل لعبة منتهية */
    account(room, coins) {
        if (!this.accounts || room.status !== 'finished' || !room.state || !room.gameNo)
            return;
        const engine = this.engineOf(room);
        if (!engine)
            return;
        // اللي غادر بنص المباراة يظل ضمن نتيجتها (يخسر مثل الصندوق)، وإلا نتيجته ما تنحسب عليه
        const humans = room.players.filter((p) => !p.bot && !(room.mode === 'bots' && this.hooks.noRewards?.(p.id)));
        if (!humans.length)
            return;
        const ref = `${room.code}:${room.gameNo}`;
        const players = humans.map((p) => ({ id: p.id, name: p.name }));
        const winners = engine.outcome(room.state).winners;
        if (this.accounts.record(ref, room.gameId, players, winners, room.stake ?? 0, coins))
            this.hooks.onGameFinished?.(room, players, winners, ref);
    }
    /** نقاط الصدارة: من الخادم، مرة وحدة لكل لعبة منتهية، ولاعبين حقيقيين فأكثر */
    tally(room) {
        if (!this.board || room.status !== 'finished' || !room.state || !room.gameNo)
            return;
        const engine = this.engineOf(room);
        if (!engine)
            return;
        const out = engine.outcome(room.state);
        const humans = room.players.filter((p) => !p.bot); // نفس منطق الحساب: المغادر بنص المباراة يظل بنتيجتها
        this.board.record(`${room.code}:${room.gameNo}`, humans.map((p) => ({ id: p.id, name: p.name })), out.winners);
    }
    /** جوائز المطابقة (عملات افتراضية): مرة وحدة لكل لعبة منتهية */
    settle(room) {
        if (!this.wallet || !room.stake || !room.payers?.length || room.status !== 'finished' || !room.state || !room.gameNo)
            return {};
        if (room.gameNo !== 1)
            return {}; // الجولات المدفوعة القديمة الأعلى من الأولى ما عندها عقد خصم مثبت.
        if (this.refundClosing(room))
            return {};
        const engine = this.engineOf(room);
        if (!engine)
            return {};
        const winners = engine.outcome(room.state).winners;
        const got = this.wallet.settle(`${room.code}:${room.gameNo}`, room.payers, room.stake, winners);
        const pct = Object.keys(got).length ? Math.max(0, Math.min(100, Math.floor(this.hooks.prizeBonus?.() ?? 0))) : 0;
        const w = winners.filter((id) => room.payers.includes(id));
        if (pct > 0 && w.length) {
            const each = Math.floor(room.stake * room.payers.length * pct / 100 / w.length);
            if (each > 0)
                for (const id of w)
                    try {
                        if (this.wallet.grant(id, 'coins', each, `مكافأة فوز إضافية ${pct}%`, `prizebonus:${room.code}:${room.gameNo}:${id}`))
                            got[id] = (got[id] ?? 0) + each;
                    }
                    catch { /* الجائزة الأساسية انصرفت */ }
        }
        for (const [id, n] of Object.entries(got))
            this.hooks.onWallet?.(id, this.wallet.balance(id), n);
        return got;
    }
    paid(room) { return (room.stake ?? 0) > 0; }
    refundKey(room) { return `refund:adm:${room.code}:${room.gameNo ?? 0}`; }
    /** status=finished ما يثبت حفظ الدفع. نقرأ دليل الحركة من المحفظة الحالية، بدون مخطط يديد. */
    payoutRecorded(room, ref) {
        if (!this.wallet || !this.paid(room) || !room.payers?.length || new Set(room.payers).size !== room.payers.length)
            return false;
        const pool = room.stake * room.payers.length;
        if (!Number.isSafeInteger(pool) || pool <= 0)
            return false;
        let paid = 0;
        for (const id of room.payers) {
            for (const entry of this.wallet.ledgerOf(id, this.wallet.ledgerCount(id))) {
                if (entry.ref === ref && (entry.kind === 'prize' || entry.kind === 'refund') && entry.cur === 'coins' && entry.delta > 0)
                    paid += entry.delta;
            }
        }
        return paid === pool;
    }
    unresolvedPaid(room) {
        return this.paid(room) && !this.payoutRecorded(room, `${room.code}:${room.gameNo ?? 0}`) && !this.payoutRecorded(room, this.refundKey(room));
    }
    refundClosing(room) {
        return this.closingPaid.has(this.refundKey(room)) || (this.paid(room) && this.payoutRecorded(room, this.refundKey(room)));
    }
    async guard(fn) {
        try {
            return await fn();
        }
        catch (e) {
            this.hooks.log?.('service_error', { message: e.message });
            return fail('صار خطأ، جرّب مرة ثانية.');
        }
    }
    isOnline(userId) {
        return (this.online.get(userId) ?? 0) > 0;
    }
    humans(room) {
        return room.players.filter((p) => !p.bot && !p.left);
    }
    engineOf(room) {
        // Preserve historical results and outstanding payouts, never used to admit new rooms.
        return this.registry.historyEngine?.(room.gameId) ?? this.registry.get(room.gameId);
    }
    /** صورة لاعب: يُسمح فقط لو الطالب ولاعب الصورة (بشري) كلاهما في نفس الغرفة. ما فيه وصول لصور غير اللي معك بالغرفة */
    async coPlayer(user, rawCode, targetId) {
        const code = normalizeCode(rawCode);
        if (!CODE_RE.test(code) || typeof targetId !== 'string' || targetId.length > 64)
            return false;
        const room = await this.store.get(code);
        return !!room && !!this.member(room, user.id) && !!this.member(room, targetId);
    }
    /** نوع الغرفة لو الطالب عضو فيها (لعقوبة الخروج المتكرر) */
    async modeFor(user, rawCode) {
        const code = normalizeCode(rawCode);
        if (!CODE_RE.test(code))
            return null;
        const room = await this.store.get(code);
        return room && this.member(room, user.id) ? room.mode : null;
    }
    /** اللاعبون البشر الحاليون بالغرفة (للهدايا والمحادثة) لو الطالب عضو فيها؛ وإلا null */
    async humansFor(user, rawCode) {
        const code = normalizeCode(rawCode);
        if (!CODE_RE.test(code))
            return null;
        const room = await this.store.get(code);
        if (!room || !this.member(room, user.id))
            return null;
        return { code, players: room.players.filter((p) => !p.bot && !p.left).map((p) => ({ id: p.id, name: p.name })) };
    }
    /** Keep source authorization locked through the server-only consumer's commit.
     * No social invitation can substitute for active game membership. */
    voiceContext(user, rawCode, consume) {
        return this.withRoom(user, rawCode, async (room) => {
            const member = this.member(room, user.id);
            if (member.reconnectUntil !== undefined && member.reconnectUntil <= this.now())
                return fail('أنت مو في هذي الغرفة.');
            const context = { code: room.code, createdAt: room.createdAt, hostId: room.hostId, gameId: room.gameId, seats: room.seats,
                players: this.humans(room).filter(p => p.reconnectUntil === undefined || p.reconnectUntil > this.now()).map(p => ({ id: p.id, bot: false })) };
            const result = consume ? await consume(context) : { context };
            return { ok: true, ...result };
        });
    }
    member(room, userId) {
        return room.players.find((p) => p.id === userId && !p.bot && !p.left);
    }
    botName(n) {
        return `🤖 الكمبيوتر ${n}`;
    }
    syncBots(room) {
        if (room.mode !== 'bots')
            return;
        const humans = room.players.filter((p) => !p.bot);
        room.players = [...humans, ...this.makeBots(room.seats - humans.length)];
    }
    makeBots(n) {
        return Array.from({ length: Math.max(0, n) }, (_, i) => ({
            id: `bot-${i + 1}`,
            name: this.botName(i + 1),
            bot: true,
            ready: true,
            left: false,
        }));
    }
    /** whitelist عميق حتى لو أعاد callback ملف حساب كامل بالخطأ. */
    publicProfile(id) {
        let source;
        try {
            source = this.serverProfile?.(id);
        }
        catch {
            this.hooks.log?.('room_profile_error');
            return null;
        }
        if (!source || typeof source !== 'object')
            return null;
        const out = { verified: source.verified === true };
        const p = source.progression;
        if (p && typeof p === 'object') {
            const nat = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
            const lv = p.level, vip = p.vip, noble = p.noble;
            if (lv && vip && noble && nat(lv.value) && lv.value >= 1 && nat(lv.xp) && nat(lv.xpFloor)
                && (lv.xpNext === null || nat(lv.xpNext)) && nat(lv.max) && nat(vip.points) && nat(vip.max) && nat(noble.points)) {
                out.progression = {
                    level: { value: lv.value, xp: lv.xp, xpFloor: lv.xpFloor, xpNext: lv.xpNext, enabled: lv.enabled === true, max: lv.max },
                    vip: { value: vip.enabled === true && typeof vip.value === 'string' && /^V(?:[1-9]|1[0-5])$/.test(vip.value) ? vip.value : null, points: vip.points, enabled: vip.enabled === true, max: vip.max },
                    noble: { value: noble.enabled === true && typeof noble.value === 'string' && /^N[1-9]$/.test(noble.value) ? noble.value : null, points: noble.points, enabled: noble.enabled === true },
                };
            }
            else
                out.progression = null;
        }
        else
            out.progression = null;
        out.equipped = {};
        for (const slot of ['frame', 'bg', 'badge', 'title']) {
            const item = source.equipped?.[slot];
            if (!item || typeof item !== 'object' || typeof item.id !== 'string' || typeof item.name !== 'string') {
                out.equipped[slot] = null;
                continue;
            }
            const view = { id: item.id, name: item.name };
            if (typeof item.css === 'string')
                view.css = item.css;
            // أصول ثابتة محلية فقط؛ ليس رابط صورة خاصة أو data/URL خارجي.
            if (typeof item.art === 'string' && /^\/assets\/[A-Za-z0-9_/-]+\.(?:webp|png|svg|jpg|jpeg)$/.test(item.art)
                && !item.art.split('/').includes('..'))
                view.art = item.art;
            if (typeof item.rarity === 'string' && /^(?:common|premium|rare|epic|legendary|ultra|exclusive)$/.test(item.rarity))
                view.rarity = item.rarity;
            if (typeof item.earned === 'boolean')
                view.earned = item.earned;
            out.equipped[slot] = view;
        }
        return out;
    }
    snapshot(room, userId) {
        const engine = this.engineOf(room);
        const now = this.now();
        return {
            code: room.code,
            stake: room.stake ?? 0,
            visibility: room.access ? 'private' : 'code',
            requiresPassword: !!room.access,
            hostId: room.hostId,
            mode: room.mode,
            gameId: room.gameId,
            seats: room.seats,
            status: room.status,
            revision: room.revision,
            you: userId,
            serverNow: now,
            players: room.players.map((p) => ({
                id: p.id,
                name: p.name,
                bot: p.bot,
                connected: p.bot ? true : this.isOnline(p.id),
                connectionState: p.bot || this.isOnline(p.id) ? 'online' : !p.left && (p.reconnectUntil ?? 0) > now ? 'reconnecting' : 'offline',
                reconnectUntil: !p.bot && !p.left && !this.isOnline(p.id) ? p.reconnectUntil ?? null : null,
                ready: p.ready,
                host: p.id === room.hostId,
                left: p.left,
                avatar: p.bot || !this.avatarVersion ? null : this.avatarVersion(p.id),
                av: p.bot || !this.equippedAvatar ? null : this.equippedAvatar(p.id),
                level: p.bot || !this.accounts ? null : this.accounts.level(p.id),
                ...(this.serverProfile ? { profile: p.bot || p.left || !this.member(room, userId) ? null : this.publicProfile(p.id) } : {}),
            })),
            gameNo: room.gameNo ?? 0,
            game: room.state && engine && room.status !== 'lobby' ? engine.view(room.state, userId, now) : null,
            outcome: room.state && engine && room.status === 'finished' ? engine.outcome(room.state) : null,
        };
    }
    async emit(room) {
        this.hooks.onRoom(room);
    }
    async newCode() {
        for (let i = 0; i < 20; i++) {
            let c = '';
            for (let j = 0; j < 5; j++)
                c += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
            if (!(await this.store.get(c)))
                return c;
        }
        throw new Error('no_code');
    }
    // ---------- الاتصال ----------
    graceMs() { return this.cfg.reconnectGraceMs ?? 120_000; }
    /** بعد بدء الخادم: العضويات الموجودة محفوظة، والاتصال الحي يبدأ من الصفر. */
    async restorePresence() {
        for (const prior of await this.store.listUpdatedBefore(this.now() + 1)) {
            await this.lock(prior.code, async () => {
                const room = await this.store.get(prior.code);
                if (!room)
                    return;
                let changed = false;
                for (const p of this.humans(room)) {
                    if (p.reconnectUntil !== undefined)
                        continue; // لا نجدد مهلة انتهت قبل إعادة التشغيل
                    p.disconnectedAt = this.now();
                    p.reconnectUntil = p.disconnectedAt + this.graceMs();
                    changed = true;
                }
                if (changed)
                    await this.persist(room);
            });
        }
    }
    async connect(userId) {
        this.online.set(userId, (this.online.get(userId) ?? 0) + 1);
        const snapshots = [];
        for (const prior of await this.store.listByUser(userId)) {
            await this.lock(prior.code, async () => {
                const room = await this.store.get(prior.code);
                if (!room)
                    return;
                const p = this.member(room, userId);
                if (!p)
                    return;
                // قد يقفل المقبس أثناء انتظار DB؛ لا نمسح مهلة الانقطاع إذا ما بقي اتصال حي.
                if (this.isOnline(userId)) {
                    if (p.reconnectUntil !== undefined && p.reconnectUntil <= this.now()) {
                        await this.removeMember(room, userId);
                        return;
                    }
                    if (p.disconnectedAt !== undefined || p.reconnectUntil !== undefined) {
                        delete p.disconnectedAt;
                        delete p.reconnectUntil;
                        await this.persist(room);
                    }
                    await this.emit(room);
                }
                snapshots.push(this.snapshot(room, userId));
            });
        }
        return snapshots;
    }
    async disconnect(userId) {
        const count = this.online.get(userId) ?? 0;
        if (!count)
            return;
        if (count > 1) {
            this.online.set(userId, count - 1);
            return;
        }
        this.online.delete(userId);
        const at = this.now();
        for (const prior of await this.store.listByUser(userId)) {
            await this.lock(prior.code, async () => {
                if (this.isOnline(userId))
                    return; // رجع قبل اكتمال عملية الانقطاع
                const room = await this.store.get(prior.code);
                const p = room && this.member(room, userId);
                if (!room || !p)
                    return;
                if (p.reconnectUntil === undefined) {
                    p.disconnectedAt = at;
                    p.reconnectUntil = at + this.graceMs();
                    await this.persist(room);
                }
                await this.emit(room);
            });
        }
    }
    /** انتهاء المهلة يعامل كخروج عادي: نقل المضيف/حذف الفارغة، دون تغيير قواعد نتائج الألعاب. */
    async expireDisconnected() {
        let removed = 0;
        for (const prior of await this.store.listUpdatedBefore(this.now() + 1)) {
            if (!prior.players.some(p => !p.bot && !p.left && p.reconnectUntil !== undefined && p.reconnectUntil <= this.now()))
                continue;
            await this.lock(prior.code, async () => {
                const room = await this.store.get(prior.code);
                if (!room)
                    return;
                for (const p of this.humans(room)) {
                    if (this.isOnline(p.id) || p.reconnectUntil === undefined || p.reconnectUntil > this.now())
                        continue;
                    await this.removeMember(room, p.id);
                    if (!(await this.store.get(room.code))) {
                        removed++;
                        break;
                    }
                }
            });
        }
        return removed;
    }
    async mine(user) {
        return (await this.store.listByUser(user.id)).map((r) => this.snapshot(r, user.id));
    }
    /** ربط داخلي بعد حفظ مظهر/توثيق/تقدم اللاعب: بث جديد دون تعديل revision أو بيانات الغرفة. */
    async refreshProfile(userId) {
        if (!this.serverProfile)
            return;
        for (const room of await this.store.listByUser(userId)) {
            if (this.member(room, userId))
                await this.emit(room);
        }
    }
    // ---------- الغرف ----------
    createRoom(user, p) {
        return this.guard(() => this.lock('create:' + user.id, async () => {
            const engine = typeof p.gameId === 'string' ? this.registry.get(p.gameId) : undefined;
            if (!engine || engine.info.status !== 'available')
                return fail('هذي اللعبة مو متاحة الحين.');
            const mode = p.mode === 'bots' ? 'bots' : p.mode === 'friends' ? 'friends' : null;
            if (!mode)
                return fail('اختر: مع الأصدقاء أو مع الكمبيوتر.');
            if (mode === 'bots' && !engine.info.supportsBots)
                return fail('هذي اللعبة ما فيها وضع الكمبيوتر.');
            const seats = Number(p.seats);
            const { minPlayers, maxPlayers } = engine.info;
            if (!Number.isInteger(seats) || seats < minPlayers || seats > maxPlayers)
                return fail(`عدد المقاعد لازم يكون من ${minPlayers} إلى ${maxPlayers}.`);
            // API يتطلب المفتاح؛ الاستدعاءات الداخلية القديمة تحصل على عملية مستقلة متوافقة.
            const key = p.key === undefined ? randomUUID() : p.key;
            if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
                return fail('مفتاح إنشاء الغرفة غير صالح. حدّث الصفحة.');
            if (p.visibility !== undefined && p.visibility !== 'code' && p.visibility !== 'private')
                return fail('نوع حماية الغرفة غير صالح.');
            const privateRoom = p.visibility === 'private';
            if (privateRoom && mode !== 'friends')
                return fail('كلمة المرور لغرف الأصدقاء فقط.');
            const password = p.password;
            if (privateRoom && (typeof password !== 'string' || password.length < 8 || password.length > 128 || Buffer.byteLength(password) > 512))
                return fail('كلمة مرور الغرفة من 8 إلى 128 حرف.');
            if (!privateRoom && password !== undefined && password !== '')
                return fail('اختر غرفة خاصة لاستخدام كلمة مرور.');
            const fingerprint = createHmac('sha256', this.cfg.cookieSecret).update(JSON.stringify([engine.info.id, mode, seats, privateRoom, privateRoom ? password : ''])).digest('hex');
            const now = this.now();
            const room = { code: await this.newCode(), hostId: user.id, mode, gameId: engine.info.id, seats, status: 'lobby',
                players: [{ id: user.id, name: user.name, bot: false, ready: true, left: false }], state: null, revision: 1, createdAt: now, updatedAt: now,
                creation: { key, fingerprint } };
            if (privateRoom) {
                const salt = randomBytes(16).toString('hex');
                room.access = { visibility: 'private', salt, passwordHash: (await scrypt(password, salt, 64)).toString('hex') };
            }
            this.syncBots(room);
            if (!this.store.createRoomAtomic)
                return fail('مخزن الغرف يحتاج تحديث حماية الإنشاء.');
            for (let attempt = 0; attempt < 5; attempt++) {
                const result = await this.store.createRoomAtomic(room, key, fingerprint, { maxRooms: this.cfg.maxRoomsPerUser, maxBotRooms: this.cfg.maxBotRoomsPerUser });
                if (result.kind === 'collision') {
                    room.code = await this.newCode();
                    continue;
                }
                if (result.kind === 'mismatch')
                    return fail('هذا المفتاح مستخدم لاختيارات غرفة مختلفة. ابدأ طلب إنشاء يديد.');
                if (result.kind === 'gone')
                    return fail('الغرفة المنشأة بهالطلب انحذفت. ابدأ طلب إنشاء يديد.');
                if (result.kind === 'room_limit')
                    return fail(`عندك ${this.cfg.maxRoomsPerUser} غرف مفتوحة، احذف وحدة منها أول.`);
                if (result.kind === 'bot_limit')
                    return fail('عندك غرفة تدريب مع الكمبيوتر مفتوحة، احذفها أو كمّل فيها.');
                if (!('room' in result) || !this.member(result.room, user.id))
                    return fail('ما عادت لك عضوية في هالغرفة.');
                await this.emit(result.room);
                if (result.kind === 'created')
                    this.hooks.log?.('room_created', { mode, game: room.gameId });
                return { ok: true, room: this.snapshot(result.room, user.id) };
            }
            return fail('صار تعارض في الرمز، جرّب مرة ثانية بنفس طلب الإنشاء.');
        }));
    }
    /** غرفة جاهزة من المطابقة: تبدأ فوراً. لو fillBots نكمّل المقاعد ببوتات (علامة 🤖). */
    createMatchRoom(users, gameId, seats, fillBots, stake = 0) {
        return this.guard(async () => {
            const engine = this.registry.get(gameId);
            if (!engine || engine.info.status !== 'available')
                return fail('هذي اللعبة مو متاحة الحين.');
            if (fillBots && !engine.info.supportsBots)
                return fail('هذي اللعبة ما فيها وضع الكمبيوتر.');
            if (users.length < 1 || users.length > seats || seats < engine.info.minPlayers || seats > engine.info.maxPlayers)
                return fail('عدد اللاعبين غير صحيح.');
            if (!fillBots && users.length < seats)
                return fail('العدد ما اكتمل.');
            const now = this.now();
            const room = {
                code: await this.newCode(),
                hostId: users[0].id,
                mode: fillBots && users.length < seats ? 'bots' : 'friends',
                gameId: engine.info.id,
                seats,
                status: 'lobby',
                players: users.map((u) => ({ id: u.id, name: u.name, bot: false, ready: true, left: false })),
                state: null,
                revision: 1,
                createdAt: now,
                updatedAt: now,
                ...(stake > 0 ? { stake, payers: users.map((u) => u.id) } : {}),
            };
            this.syncBots(room);
            const refs = room.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot }));
            room.state = engine.init(refs, now, this.cfg.engine);
            room.status = 'playing';
            room.gameNo = 1;
            if (!(await this.store.create(room)))
                return fail('صار تعارض في الرمز، جرّب مرة ثانية.');
            await this.emit(room);
            this.hooks.log?.('match_room', { game: room.gameId, humans: users.length, bots: room.players.length - users.length });
            return { ok: true, room };
        });
    }
    joinRoom(user, rawCode, password) {
        return this.guard(async () => {
            const code = normalizeCode(rawCode);
            if (!CODE_RE.test(code))
                return fail('الرمز غلط. الرمز خمس خانات من حروف إنجليزية وأرقام.');
            return this.lock(code, async () => {
                const room = await this.store.get(code);
                if (!room)
                    return fail('ما لقينا غرفة بهذا الرمز. تأكد منه مع صاحبك.');
                if (this.member(room, user.id))
                    return { ok: true, room: this.snapshot(room, user.id) };
                if (isRetiredGame(room.gameId))
                    return fail(RETIRED_GAME_MESSAGE);
                if (room.mode === 'bots')
                    return fail('هذي غرفة تدريب مع الكمبيوتر، ما تقبل لاعبين.');
                if (room.status !== 'lobby')
                    return fail('اللعبة بدأت، ما تقدر تنضم الحين.');
                if (room.access) {
                    if (typeof password !== 'string' || password.length > 128 || Buffer.byteLength(password) > 512)
                        return fail('الغرفة محمية. اكتب كلمة المرور.');
                    const hash = (await scrypt(password, room.access.salt, 64));
                    const expected = Buffer.from(room.access.passwordHash, 'hex');
                    if (hash.length !== expected.length || !timingSafeEqual(hash, expected))
                        return fail('كلمة مرور الغرفة غير صحيحة.');
                }
                if (this.humans(room).length >= room.seats)
                    return fail('الغرفة ممتلئة.');
                // لو كان لاعب سابق خرج، نشيل سجله القديم
                room.players = room.players.filter((p) => p.id !== user.id);
                room.players.push({ id: user.id, name: user.name, bot: false, ready: false, left: false });
                await this.persist(room);
                await this.emit(room);
                return { ok: true, room: this.snapshot(room, user.id) };
            });
        });
    }
    withRoom(user, rawCode, fn) {
        return this.guard(async () => {
            const code = normalizeCode(rawCode);
            if (!CODE_RE.test(code))
                return fail('رمز الغرفة غير صحيح.');
            return this.lock(code, async () => {
                const room = await this.store.get(code);
                if (!room)
                    return fail('الغرفة ما عادت موجودة.');
                if (!this.member(room, user.id))
                    return fail('أنت مو في هذي الغرفة.');
                return fn(room);
            });
        });
    }
    setGame(user, code, gameId) {
        return this.withRoom(user, code, async (room) => {
            if (room.hostId !== user.id)
                return fail('المضيف فقط يقدر يغيّر اللعبة.');
            if (room.status !== 'lobby')
                return fail('ما تقدر تغيّر اللعبة بعد ما تبدأ الجولة.');
            const engine = typeof gameId === 'string' ? this.registry.get(gameId) : undefined;
            if (!engine || engine.info.status !== 'available')
                return fail('هذي اللعبة مو متاحة الحين.');
            if (room.mode === 'bots' && !engine.info.supportsBots)
                return fail('هذي اللعبة ما فيها وضع الكمبيوتر.');
            const humans = this.humans(room).length;
            if (humans > engine.info.maxPlayers)
                return fail('عدد اللاعبين أكثر من اللي تقبله اللعبة.');
            room.gameId = engine.info.id;
            room.seats = Math.min(Math.max(room.seats, engine.info.minPlayers), engine.info.maxPlayers);
            this.syncBots(room);
            await this.persist(room);
            await this.emit(room);
            return { ok: true, room: this.snapshot(room, user.id) };
        });
    }
    setReady(user, code, ready) {
        return this.withRoom(user, code, async (room) => {
            if (isRetiredGame(room.gameId))
                return fail(RETIRED_GAME_MESSAGE);
            if (room.status !== 'lobby')
                return fail('الاستعداد قبل بدء الجولة فقط.');
            const me = this.member(room, user.id);
            me.ready = ready === true;
            await this.persist(room);
            await this.emit(room);
            return { ok: true, room: this.snapshot(room, user.id) };
        });
    }
    start(user, code) {
        return this.withRoom(user, code, async (room) => {
            if (isRetiredGame(room.gameId))
                return fail(RETIRED_GAME_MESSAGE);
            if (room.hostId !== user.id)
                return fail('المضيف فقط يقدر يبدأ الجولة.');
            if (room.status !== 'lobby')
                return fail('الجولة بدأت أو انتهت. استخدم «جولة جديدة».');
            // المطابقة المدفوعة الأصلية تبدأ داخل createMatchRoom؛ لوبي قديم ما يصير يعيد استعمال رسومها.
            if (this.paid(room))
                return fail('إعادة الجولة المدفوعة موقوفة مؤقتاً لحماية الرصيد. ابدأ مطابقة يديدة.');
            const engine = this.engineOf(room);
            if (!engine)
                return fail('اللعبة غير متاحة.');
            const active = room.players.filter((p) => !p.left);
            if (active.length < engine.info.minPlayers) {
                return fail(`تحتاج ${engine.info.minPlayers} لاعبين على الأقل عشان تبدأ.`);
            }
            const notReady = this.humans(room).filter((p) => p.id !== room.hostId && !p.ready);
            if (notReady.length)
                return fail('فيه لاعبين ما ضغطوا «جاهز» لسه.');
            const refs = active.map((p) => ({ id: p.id, name: p.name, bot: p.bot }));
            room.state = engine.init(refs, this.now(), this.cfg.engine);
            room.status = 'playing';
            room.gameNo = (room.gameNo ?? 0) + 1;
            this.botPlans.forEach((_, k) => k.startsWith(room.code + ':') && this.botPlans.delete(k));
            await this.persist(room);
            await this.emit(room);
            return { ok: true, room: this.snapshot(room, user.id) };
        });
    }
    rematch(user, code) {
        return this.withRoom(user, code, async (room) => {
            if (isRetiredGame(room.gameId))
                return fail(RETIRED_GAME_MESSAGE);
            if (room.hostId !== user.id)
                return fail('المضيف فقط يقدر يبدأ جولة جديدة.');
            if (room.status !== 'finished')
                return fail('الجولة لسه ما انتهت.');
            if (this.paid(room))
                return fail('إعادة الجولة المدفوعة موقوفة مؤقتاً لحماية الرصيد. ابدأ مطابقة يديدة.');
            room.status = 'lobby';
            room.state = null;
            room.players = room.players.filter((p) => !p.left).map((p) => ({ ...p, ready: p.bot || p.id === room.hostId }));
            this.syncBots(room);
            await this.persist(room);
            await this.emit(room);
            return { ok: true, room: this.snapshot(room, user.id) };
        });
    }
    action(user, code, ver, action) {
        return this.withRoom(user, code, async (room) => {
            if (isRetiredGame(room.gameId))
                return fail(RETIRED_GAME_MESSAGE);
            if (room.status !== 'playing' || !room.state)
                return fail('اللعبة مو شغّالة.');
            if (this.paid(room) && room.gameNo !== 1)
                return fail('إعادة الجولة المدفوعة موقوفة مؤقتاً لحماية الرصيد. تواصل مع الإدارة.');
            if (this.refundClosing(room))
                return fail('الغرفة تحت الإغلاق الإداري، واسترجاع الرسوم قيد التأكيد.');
            const engine = this.engineOf(room);
            if (!engine)
                return fail('اللعبة غير متاحة.');
            if (ver !== engine.version(room.state))
                return fail('الجولة تغيّرت، حدّث الشاشة.');
            const res = engine.apply(room.state, user.id, action, this.now());
            if (!res.ok)
                return fail(res.error);
            room.state = res.state;
            if (engine.isOver(room.state))
                room.status = 'finished';
            await this.persist(room);
            await this.emit(room);
            return { ok: true, room: this.snapshot(room, user.id) };
        });
    }
    leave(user, code) {
        return this.withRoom(user, code, room => this.removeMember(room, user.id));
    }
    async removeMember(room, userId) {
        const wasHost = room.hostId === userId;
        const retainCommitment = this.unresolvedPaid(room);
        if (room.status === 'playing' || retainCommitment) {
            const me = this.member(room, userId);
            me.left = true;
        }
        else {
            room.players = room.players.filter((p) => p.id !== userId);
        }
        const remaining = this.humans(room);
        if (remaining.length === 0 && !retainCommitment) {
            await this.store.delete(room.code);
            this.closingPaid.delete(this.refundKey(room));
            this.hooks.onGone(room.code, [userId], 'left');
            return { ok: true };
        }
        if (wasHost && remaining.length > 0) {
            if (room.mode === 'bots' && !retainCommitment) {
                await this.store.delete(room.code);
                this.closingPaid.delete(this.refundKey(room));
                this.hooks.onGone(room.code, [userId], 'left');
                return { ok: true };
            }
            room.hostId = remaining[0].id;
            remaining[0].ready = true;
        }
        await this.persist(room);
        this.hooks.onGone(room.code, [userId], 'left');
        await this.emit(room);
        return { ok: true };
    }
    deleteRoom(user, code) {
        return this.withRoom(user, code, async (room) => {
            if (room.hostId !== user.id)
                return fail('المضيف فقط يقدر يحذف الغرفة.');
            if (this.unresolvedPaid(room))
                return fail('ما نقدر نحذف غرفة عليها رسوم ما تسوّت. كمّل الجولة أو تواصل مع الإدارة.');
            await this.store.delete(room.code);
            this.closingPaid.delete(this.refundKey(room));
            this.hooks.onGone(room.code, this.humans(room).map((p) => p.id), 'deleted');
            return { ok: true };
        });
    }
    /** إغلاق إداري بنفس سياسة الاسترجاع الحالية؛ ما نحذف التزاماً لين يثبت حفظ تسويته. */
    async adminClose(rawCode) {
        const code = normalizeCode(rawCode);
        if (!CODE_RE.test(code))
            return false;
        return this.lock(code, async () => {
            const room = await this.store.get(code);
            if (!room)
                return false;
            // غرفة برسم دخول ما انتهت: الإغلاق الإداري ما يضيّع عملات اللاعبين، نرجّع الرسوم لهم (مرة وحدة بمفتاح ثابت)
            let refunded = 0, queued = false;
            if (this.unresolvedPaid(room)) {
                // finished قد تكون جائزتها معلّقة؛ ما نستبدل نتيجتها باسترجاع ولا نحذف مصدرها.
                if (!this.wallet || !room.payers?.length || room.status === 'finished')
                    return false;
                if (room.gameNo !== 1)
                    return false; // رسم جولة قديمة غير مثبت؛ لا ننشئ استرجاعاً ثانياً.
                this.closingPaid.add(this.refundKey(room));
                const got = this.wallet.settle(this.refundKey(room), room.payers, room.stake, room.payers);
                for (const [id, n] of Object.entries(got)) {
                    refunded += n;
                    this.hooks.onWallet?.(id, this.wallet.balance(id), n);
                }
                queued = !this.payoutRecorded(room, this.refundKey(room));
                if (queued)
                    return { refunded, queued }; // المحفظة تعيد المحاولة؛ المصدر يظل محفوظاً.
            }
            await this.store.delete(code);
            this.closingPaid.delete(this.refundKey(room));
            this.hooks.onGone(code, this.humans(room).map((p) => p.id), 'deleted');
            return { refunded, queued };
        });
    }
    /** كل الغرف للإدارة (عرض فقط) */
    adminRooms() { return this.store.listUpdatedBefore(this.now() + 1); }
    /** تعافٍ مالي فقط من finished المحفوظة. لا يعيد تاريخ الحساب أو الصدارة أو progression. */
    async reconcileFinished(limit = 100) {
        return this.lock('financial:reconcile', async () => {
            const size = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 100;
            // عقد RoomStore الحالي ما فيه pagination؛ الاستكشاف قراءة وحدة، والتسويات مقسّمة بحد 100.
            if (!this.finishedPayoutQueue.length)
                this.finishedPayoutQueue = (await this.store.listUpdatedBefore(this.now() + 1))
                    .filter(room => room.status === 'finished' && this.paid(room) && !!room.state && !!room.gameNo).map(room => room.code);
            const batch = this.finishedPayoutQueue.splice(0, size);
            let recovered = 0, pending = 0, failed = 0;
            for (const code of batch) {
                try {
                    await this.lock(code, async () => {
                        const room = await this.store.get(code);
                        if (!room || room.status !== 'finished' || !room.state || !room.gameNo || !this.paid(room) || !this.unresolvedPaid(room))
                            return;
                        if (room.gameNo !== 1 || !this.wallet || !room.payers?.length || new Set(room.payers).size !== room.payers.length || !this.engineOf(room) || this.refundClosing(room)) {
                            failed++;
                            return;
                        }
                        this.settle(room);
                        if (this.unresolvedPaid(room))
                            pending++;
                        else
                            recovered++;
                    });
                }
                catch {
                    failed++;
                    this.hooks.log?.('finished_payout_reconcile_error');
                }
            }
            return { processed: batch.length, recovered, pending, failed, remaining: this.finishedPayoutQueue.length };
        });
    }
    // ---------- الوقت والبوتات والتنظيف ----------
    /** يُستدعى كل نصف ثانية تقريباً: ينقل الجولات حسب الوقت ويشغّل حركات الكمبيوتر */
    async tick() {
        await this.expireDisconnected();
        for (const r of await this.store.listPlaying()) {
            try {
                await this.tickRoom(r.code);
            }
            catch (e) {
                // غرفة معطوبة ما توقف بقية الغرف
                this.hooks.log?.('tick_error', { message: e.message });
            }
        }
    }
    async tickRoom(code) {
        await this.lock(code, async () => {
            const room = await this.store.get(code);
            if (!room || room.status !== 'playing' || !room.state)
                return;
            if (this.paid(room) && room.gameNo !== 1)
                return;
            if (this.refundClosing(room))
                return;
            const engine = this.engineOf(room);
            if (!engine)
                return;
            const now = this.now();
            let state = room.state;
            let changed = false;
            const advanced = engine.tick(state, now);
            if (advanced !== state) {
                state = advanced;
                changed = true;
            }
            for (const bot of room.players.filter((p) => p.bot)) {
                try {
                    const key = `${room.code}:${bot.id}`;
                    const ver = engine.version(state);
                    let plan = this.botPlans.get(key);
                    if (plan && plan.ver !== ver)
                        plan = undefined;
                    if (!plan) {
                        const next = engine.botAction(state, bot.id, now);
                        if (!next) {
                            this.botPlans.delete(key);
                            continue;
                        }
                        plan = { at: now + next.delayMs * this.cfg.botSpeed, ver, action: next.action };
                        this.botPlans.set(key, plan);
                    }
                    if (plan.at <= now) {
                        this.botPlans.delete(key);
                        // نفس التحقق القانوني اللي تمر عليه حركة الإنسان
                        const res = engine.apply(state, bot.id, plan.action, now);
                        if (res.ok) {
                            state = res.state;
                            changed = true;
                        }
                    }
                }
                catch (e) {
                    this.hooks.log?.('bot_error', { message: e.message });
                }
            }
            if (!changed)
                return;
            room.state = state;
            if (engine.isOver(state))
                room.status = 'finished';
            await this.persist(room);
            await this.emit(room);
        });
    }
    /** يحذف الغرف الخاملة فقط: ما فيها أحد متصل ومرّ عليها وقت أطول من المدة المسموحة */
    async cleanup() {
        const cutoff = this.now() - this.cfg.roomTtlMs;
        let removed = await this.expireDisconnected();
        for (const r of await this.store.listUpdatedBefore(cutoff)) {
            await this.lock(r.code, async () => {
                const room = await this.store.get(r.code);
                if (!room || room.updatedAt >= cutoff)
                    return;
                const humans = this.humans(room);
                if (humans.some((p) => this.isOnline(p.id) || (p.reconnectUntil ?? 0) > this.now()))
                    return;
                if (this.unresolvedPaid(room))
                    return;
                await this.store.delete(room.code);
                this.closingPaid.delete(this.refundKey(room));
                this.hooks.onGone(room.code, humans.map((p) => p.id), 'expired');
                removed++;
            });
        }
        return removed;
    }
}
