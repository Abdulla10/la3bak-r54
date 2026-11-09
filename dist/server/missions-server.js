import { createHash } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import { itemOf } from './catalog.js';
export const MISSION_METRICS = ['gamesPlayed', 'gamesWon', 'giftsSent', 'giftsReceived', 'micMinutes'];
export class MissionInputError extends Error {
    code;
    constructor(message, code = 400) {
        super(message);
        this.code = code;
        this.name = 'MissionInputError';
    }
}
const DAY = 86_400_000;
const ID = /^[a-z][a-z0-9-]{2,63}$/;
const HASH = /^[a-f0-9]{64}$/;
const OP = /^missions_[a-f0-9]{64}$/;
const nat = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const pos = (v) => nat(v) && v > 0;
const text = (v, max) => typeof v === 'string' && !!v.trim() && v.length <= max && !/[\u0000-\u001f\u007f<>\u200b-\u200f\u202a-\u202e\u2066-\u2069]/.test(v);
const userId = (v) => text(v, 160);
const scope = (v) => v === 'daily' || v === 'weekly';
const hash = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const own = (r, k) => Object.hasOwn(r, k) ? r[k] : undefined;
const zero = () => ({ gamesPlayed: 0, gamesWon: 0, giftsSent: 0, giftsReceived: 0, micMinutes: 0 });
const keysOnly = (v, keys) => Object.keys(v).every((k) => keys.includes(k));
function validRewards(v) {
    return isObj(v) && keysOnly(v, ['coins', 'gems', 'items'])
        && (v.coins === undefined || nat(v.coins)) && (v.gems === undefined || nat(v.gems))
        && (v.items === undefined || (Array.isArray(v.items) && v.items.length <= 100
            && v.items.every((s) => text(s, 100)) && new Set(v.items).size === v.items.length));
}
const hasRewards = (r) => !!(r.coins || r.gems || r.items?.length);
function validDefinition(v) {
    return isObj(v) && keysOnly(v, ['id', 'title', 'scope', 'metric', 'goal', 'active', 'rewards'])
        && typeof v.id === 'string' && ID.test(v.id) && text(v.title, 120) && scope(v.scope)
        && MISSION_METRICS.includes(v.metric) && pos(v.goal) && typeof v.active === 'boolean'
        && validRewards(v.rewards) && (!v.active || hasRewards(v.rewards));
}
const validBucket = (v) => isObj(v) && typeof v.key === 'string' && isObj(v.counts)
    && MISSION_METRICS.every((m) => m === 'micMinutes' ? v.counts[m] === undefined || nat(v.counts[m]) : nat(v.counts[m]));
const validBulkReward = (v) => isObj(v) && (v.type === 'currency'
    ? (v.cur === 'coins' || v.cur === 'gems') && pos(v.amount)
    : v.type === 'item' && text(v.itemId, 100) && v.mode === 'grant' && v.price === undefined && v.currency === undefined);
const validResult = (v) => isObj(v) && v.ok === true && typeof v.duplicate === 'boolean'
    && typeof v.operationId === 'string' && OP.test(v.operationId) && v.total === 1
    && nat(v.succeeded) && nat(v.failed) && v.succeeded + v.failed === 1
    && Array.isArray(v.failures) && v.failures.every((f) => isObj(f) && userId(f.id) && text(f.code, 100));
const validClaim = (v) => isObj(v) && userId(v.id) && typeof v.missionId === 'string' && ID.test(v.missionId)
    && scope(v.scope) && typeof v.period === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.period)
    && typeof v.operationId === 'string' && OP.test(v.operationId) && nat(v.at)
    && ['pending', 'claimed', 'failed'].includes(String(v.state)) && text(v.reason, 200)
    && Array.isArray(v.rewards) && v.rewards.every(validBulkReward)
    && (v.result === undefined || validResult(v.result));
const optional = (v, check) => v === undefined || check(v);
const record = (v, check) => isObj(v) && Object.values(v).every(check);
/** الحقول الجديدة اختيارية؛ البيانات الموجودة تُفحص ولا تُمسح عند فسادها. */
export const validMissionsServer = (d) => optional(d.v, (v) => v === 1)
    && optional(d.definitions, (v) => Array.isArray(v) && v.length <= 100 && v.every(validDefinition)
        && new Set(v.map((x) => x.id)).size === v.length)
    && optional(d.users, (v) => record(v, (x) => isObj(x) && validBucket(x.daily) && validBucket(x.weekly)))
    && optional(d.events, (v) => record(v, (x) => isObj(x) && typeof x.fingerprint === 'string' && HASH.test(x.fingerprint) && nat(x.at)))
    && optional(d.claims, (v) => isObj(v) && Object.entries(v).every(([k, x]) => validClaim(x) && isObj(x) && x.operationId === k
        && k === claimOperationId(String(x.id), String(x.missionId), x.scope, String(x.period))))
    && optional(d.configured, (v) => isObj(v) && userId(v.by) && nat(v.at));
/** يوم UTC؛ الأسبوع ISO يبدأ الاثنين 00:00 UTC، وليس أسبوع الصدارة/المدينة. */
export function missionWindows(at) {
    if (!nat(at))
        throw new MissionInputError('وقت الخادم غير صالح.');
    const date = new Date(at);
    if (!Number.isFinite(date.getTime()))
        throw new MissionInputError('وقت الخادم غير صالح.');
    const daily = Math.floor(at / DAY) * DAY;
    const weekly = daily - ((date.getUTCDay() + 6) % 7) * DAY;
    const window = (startAt, days) => ({ key: new Date(startAt).toISOString().slice(0, 10), startAt, endAt: startAt + days * DAY });
    return { daily: window(daily, 1), weekly: window(weekly, 7) };
}
export function claimOperationId(id, missionId, s, period) {
    return 'missions_' + hash(['missions', id, missionId, s, period]);
}
/** لا تُعرَّض game/gift/configure للعميل. الخادم يمرّر أحداثه المحفوظة وهوية الجلسة فقط. */
export class MissionsServer {
    wallet;
    now;
    catalog;
    d = { v: 1, definitions: [], users: {}, events: {}, claims: {} };
    disk;
    claimTail = Promise.resolve();
    persistent;
    constructor(file, wallet, now = Date.now, mon = new StorageMonitor(), catalog = { get: itemOf }) {
        this.wallet = wallet;
        this.now = now;
        this.catalog = catalog;
        this.persistent = !!file;
        if (file) {
            const loaded = loadJsonFile(file, validMissionsServer);
            if (loaded)
                this.d = { ...this.d, ...loaded };
        }
        this.disk = new Persister('missions', file, () => this.d, now, mon, validMissionsServer);
    }
    commit(change) {
        const snapshot = structuredClone(this.d);
        try {
            const out = change();
            this.disk.mustSave();
            return out;
        }
        catch (e) {
            this.d = snapshot;
            throw e;
        }
    }
    serial(fn) {
        const run = this.claimTail.then(fn);
        this.claimTail = run.then(() => undefined, () => undefined);
        return run;
    }
    definitions() { return structuredClone(this.d.definitions); }
    /** استبدال إعدادات المالك. المحذوف يُعطَّل ولا يُنسى، ونطاق المعرف ثابت لمنع مطالبة ثانية. */
    configure(input, actor) {
        if (!actor || actor.role !== 'owner' || !userId(actor.id))
            throw new MissionInputError('إعداد المهام للمالك فقط.', 403);
        if (!Array.isArray(input) || input.length > 100 || !input.every(validDefinition)
            || new Set(input.map((x) => x.id)).size !== input.length)
            throw new MissionInputError('تعريف المهام أو المكافآت غير صالح.');
        for (const def of input) {
            const old = this.d.definitions.find((x) => x.id === def.id);
            if (old && old.scope !== def.scope)
                throw new MissionInputError('نطاق معرف المهمة ثابت؛ استخدم معرفاً جديداً.', 409);
            for (const id of def.rewards.items ?? []) {
                const item = this.catalog.get(id);
                if (!item || item.id !== id || !item.permanent)
                    throw new MissionInputError('المكافأة يجب أن تكون معرف عنصر ملكية فعلي بالكتالوج.');
            }
        }
        const before = this.definitions();
        const submitted = new Set(input.map((x) => x.id));
        const definitions = [...structuredClone(input), ...before.filter((x) => !submitted.has(x.id)).map((x) => ({ ...x, active: false }))];
        if (definitions.length > 100)
            throw new MissionInputError('وصلت حد تعريفات المهام المحفوظة.');
        return this.commit(() => { this.d.definitions = definitions; this.d.configured = { by: actor.id, at: this.now() }; return { before, definitions: this.definitions() }; });
    }
    progress(id, windows) {
        const k = JSON.stringify(id);
        const progress = own(this.d.users, k) ?? { daily: { key: '', counts: zero() }, weekly: { key: '', counts: zero() } };
        for (const s of ['daily', 'weekly'])
            if (progress[s].key < windows[s].key)
                progress[s] = { key: windows[s].key, counts: zero() };
        this.d.users[k] = progress;
        return progress;
    }
    event(kind, ref, payload, changes, occurredAt) {
        if (!text(ref, 240))
            throw new MissionInputError('مرجع الحدث الخادمي مطلوب.');
        const key = kind + ':' + hash(ref), fingerprint = hash(payload);
        const previous = own(this.d.events, key);
        if (previous) {
            if (previous.fingerprint !== fingerprint)
                throw new MissionInputError('مرجع الحدث مستخدم بمحتوى مختلف.', 409);
            return { applied: 0, duplicate: true };
        }
        const now = this.now(), at = occurredAt ?? now, windows = missionWindows(at), current = missionWindows(now);
        if (at > now)
            throw new MissionInputError('توقيت الحدث الخادمي لا يكون مستقبلياً.');
        return this.commit(() => {
            let applied = 0;
            for (const change of changes) {
                const progress = this.progress(change.id, windows);
                let counted = false;
                for (const s of ['daily', 'weekly']) {
                    // إعادة تسليم قديمة لا تعيد تصفير نافذة أحدث ولا تزيد تقدمها.
                    // نافذة يوم منتهية تُهمل، لكن نفس أسبوع الحدث يمكن استكماله.
                    if (windows[s].key !== current[s].key || progress[s].key !== windows[s].key)
                        continue;
                    const count = (progress[s].counts[change.metric] ?? 0) + 1;
                    if (!nat(count))
                        throw new MissionInputError('تجاوز عداد المهمة المجال الآمن.');
                    progress[s].counts[change.metric] = count;
                    counted = true;
                }
                if (counted)
                    applied++;
            }
            this.d.events[key] = { fingerprint, at };
            return { applied, duplicate: false };
        });
    }
    /** بعد Accounts.record لنتيجة فعلية فقط. bot=true لا يُحتسب؛ الفائز خارج البشر لا يُحتسب. */
    game(players, winners, ref, occurredAt) {
        if (!Array.isArray(players) || !players.every((p) => isObj(p) && userId(p.id) && (p.bot === undefined || typeof p.bot === 'boolean'))
            || !Array.isArray(winners) || !winners.every(userId))
            throw new MissionInputError('نتيجة المباراة غير صالحة.');
        const ids = [...new Set(players.filter((p) => !p.bot).map((p) => p.id))].sort();
        const won = [...new Set(winners.filter((id) => ids.includes(id)))].sort();
        return this.event('game', ref, { ids, won }, ids.flatMap((id) => [
            { id, metric: 'gamesPlayed' }, ...(won.includes(id) ? [{ id, metric: 'gamesWon' }] : []),
        ]), occurredAt);
    }
    /** بعد حفظ Wallet.sendGift: عملية إرسال واحدة لا كمية الهدية، والطرفان يحفظان معاً. */
    gift(from, to, ref, occurredAt) {
        if (!userId(from) || !userId(to) || from === to)
            throw new MissionInputError('أطراف الهدية غير صالحة.');
        return this.event('gift', ref, { from, to }, [{ id: from, metric: 'giftsSent' }, { id: to, metric: 'giftsReceived' }], occurredAt);
    }
    /** R62: دقايق المايك — الخادم يعدّها بنفسه (عينة كل دقيقة للي قاعدين على مقعد بالغرفة ومتصلين بالصوت) ويحفظها دفعة كل كم دقيقة. ما فيه سجل حدث لكل دقيقة. */
    micMinutes(batch) {
        if (!batch.size)
            return 0;
        const now = this.now(), windows = missionWindows(now);
        return this.commit(() => {
            let n = 0;
            for (const [id, mins] of batch) {
                if (!userId(id) || !pos(mins) || mins > 24 * 60)
                    continue;
                const progress = this.progress(id, windows);
                for (const s of ['daily', 'weekly']) {
                    if (progress[s].key !== windows[s].key)
                        continue;
                    const v = (progress[s].counts.micMinutes ?? 0) + mins;
                    if (nat(v))
                        progress[s].counts.micMinutes = v;
                }
                n++;
            }
            return n;
        });
    }
    /** R62: مهام افتراضية لو المالك ما ضبط أي مهام للحين (يقدر يعدّلها أو يطفيها من لوحة التحكم). */
    /** R68z: يضيف مهام جديدة (بمعرّفات جديدة فقط) بدون ما يلمس اللي عدّلها المالك */
    addMissing(defs) {
        const fresh = defs.filter((x) => validDefinition(x) && !this.d.definitions.some((d) => d.id === x.id));
        if (!fresh.length)
            return 0;
        return this.commit(() => { this.d.definitions = [...this.d.definitions, ...structuredClone(fresh)]; return fresh.length; });
    }
    seedDefaults(defs) {
        if (this.d.definitions.length || this.d.configured || !defs.every(validDefinition))
            return false;
        return this.commit(() => { this.d.definitions = structuredClone(defs); this.d.configured = { by: 'system:r62-defaults', at: this.now() }; return true; });
    }
    /** قراءة فقط للاعب الموثّق؛ لا تستقبل أرقام تقدم من العميل ولا تنشئ حساب محفظة. */
    view(id) {
        if (!userId(id))
            throw new MissionInputError('هوية اللاعب غير صالحة.');
        const serverNow = this.now(), windows = missionWindows(serverNow);
        const progress = own(this.d.users, JSON.stringify(id));
        const missions = this.d.definitions.flatMap((def) => {
            const claim = own(this.d.claims, claimOperationId(id, def.id, def.scope, windows[def.scope].key));
            if (!def.active && claim?.state !== 'pending')
                return [];
            const bucket = progress?.[def.scope];
            const value = bucket?.key === windows[def.scope].key ? (bucket.counts[def.metric] ?? 0) : 0;
            const done = value >= def.goal, claimed = claim?.state === 'claimed', pending = claim?.state === 'pending';
            return [{ ...structuredClone(def), progress: value, value: Math.min(value, def.goal), done, claimed, pending,
                    claimable: pending || (def.active && done && !claimed && claim?.state !== 'failed') }];
        });
        return { serverNow, windows, missions };
    }
    claim(id, missionId) {
        return this.serial(async () => {
            if (!userId(id) || typeof missionId !== 'string' || !ID.test(missionId))
                return { ok: false, code: 'bad' };
            const def = this.d.definitions.find((x) => x.id === missionId);
            if (!def)
                return { ok: false, code: 'not_found' };
            const period = missionWindows(this.now())[def.scope].key;
            const operationId = claimOperationId(id, missionId, def.scope, period);
            const previous = own(this.d.claims, operationId);
            if (previous)
                return this.finish(previous, true);
            if (!def.active)
                return { ok: false, code: 'inactive' };
            const bucket = own(this.d.users, JSON.stringify(id))?.[def.scope];
            if (!bucket || bucket.key !== period || (bucket.counts[def.metric] ?? 0) < def.goal)
                return { ok: false, code: 'ineligible' };
            // العناصر المملوكة بالفعل متحققة، لا شراء ولا خصم ولا تكرار ملكية.
            const owned = new Set(this.wallet.owned(id));
            const rewards = [];
            if (def.rewards.coins)
                rewards.push({ type: 'currency', cur: 'coins', amount: def.rewards.coins });
            if (def.rewards.gems)
                rewards.push({ type: 'currency', cur: 'gems', amount: def.rewards.gems });
            for (const itemId of def.rewards.items ?? []) {
                const item = this.catalog.get(itemId);
                if (!item || item.id !== itemId || !item.permanent)
                    return { ok: false, code: 'reward_failed' };
                if (!owned.has(itemId))
                    rewards.push({ type: 'item', itemId, mode: 'grant' });
            }
            const intent = { id, missionId, scope: def.scope, period, operationId, at: this.now(), state: 'pending', rewards,
                reason: 'مكافأة مهمة: ' + def.title };
            this.commit(() => { this.d.claims[operationId] = intent; }); // لا منح قبل حفظ النية
            return this.finish(intent, false);
        });
    }
    async finish(claim, duplicate) {
        if (claim.state === 'failed')
            return { ok: false, code: 'reward_failed' };
        if (claim.state === 'pending') {
            const result = claim.rewards.length ? await this.wallet.grantBulk(claim.operationId, [claim.id], structuredClone(claim.rewards), claim.reason) : undefined;
            const state = result && (result.succeeded !== 1 || result.failed !== 0) ? 'failed' : 'claimed';
            this.commit(() => { this.d.claims[claim.operationId] = { ...claim, state, ...(result ? { result: structuredClone(result) } : {}) }; });
            if (state === 'failed')
                return { ok: false, code: 'reward_failed' };
        }
        return { ok: true, duplicate, operationId: claim.operationId, missionId: claim.missionId, scope: claim.scope, period: claim.period };
    }
    /** يُنتظر عند الإقلاع ومؤقت التخزين؛ يستكمل نوايا مستحقة حتى بعد انتهاء نافذتها. */
    retry() {
        return this.serial(async () => {
            this.disk.retry();
            for (const claim of Object.values(this.d.claims))
                if (claim.state === 'pending')
                    await this.finish(claim, true);
        });
    }
    pendingCount() { return Object.values(this.d.claims).filter((x) => x.state === 'pending').length; }
    unsaved() { return this.disk.unsaved; }
}
