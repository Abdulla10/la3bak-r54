import { createHash, randomInt } from 'node:crypto';
import { POINTS } from './leaderboard.js';
import { loadJsonFile, Persister, StorageMonitor, isObj, DataFilesCorruptError } from './datafile.js';
/**
 * الحساب الموحّد: لكل لاعب (معرّف الجلسة) سجل واحد لكل الألعاب.
 * ثلاث عملات منفصلة ما تتبدّل ببعض:
 *  - العملات (coins): تُصرف رسم دخول، مصدرها المحفظة (wallet.ts) وسجلها هنا (ledger).
 *  - نقاط التصنيف (points): للترتيب فقط، من ألعاب منتهية فيها لاعبان حقيقيان فأكثر. نفس قيم الصدارة الأسبوعية (POINTS).
 *  - الخبرة (xp): للمستوى فقط، من كل لعبة منتهية (حتى ضد الكمبيوتر).
 * كل تغيير يصير في الخادم بعد نتيجة يؤكدها محرك اللعبة، ومرة وحدة لكل لعبة (مفتاح room:gameNo).
 */
export const GAMES = ['jackaro', 'baloot', 'ludo'];
export const XP = { played: 10, won: 15 };
/** المستوى = 1 + floor(sqrt(xp / 40)) */
export const levelOf = (xp) => Math.min(100, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 40)));
export const xpForLevel = (lv) => 40 * (lv - 1) ** 2;
const nat = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const signed = (v) => typeof v === 'number' && Number.isSafeInteger(v);
const str = (v) => typeof v === 'string';
const optional = (v, check) => v === undefined || check(v);
const array = (v, check) => Array.isArray(v) && v.every(check);
const record = (v, check) => isObj(v) && Object.values(v).every(check);
const statFields = ['played', 'won', 'ranked', 'points'];
const validStat = (v) => isObj(v) && statFields.every((k) => optional(v[k], nat));
const txKinds = ['start', 'daily', 'entry_fee', 'prize', 'refund', 'purchase', 'reward', 'admin', 'gift'];
const validTx = (v) => isObj(v) && nat(v.id) && nat(v.ts) && str(v.kind) && txKinds.includes(v.kind)
    && signed(v.delta) && nat(v.balance) && optional(v.ref, str);
const validHist = (v) => isObj(v) && str(v.key) && nat(v.ts) && str(v.game) && (v.result === 'win' || v.result === 'loss')
    && typeof v.ranked === 'boolean' && nat(v.points) && nat(v.xp) && ['stake', 'coins', 'players'].every((k) => optional(v[k], nat));
// نص فقط: لا نفسّره كـ HTML؛ واجهة العرض ملزمة بعرضه كنص escaped. LF وTAB مسموحان.
const validBio = (v) => str(v) && [...v].length <= 240
    && [...v.normalize('NFC')].length <= 240
    && !/[\u0000-\u0008\u000b-\u001f\u007f\ud800-\udfff]/u.test(v);
const validFavorites = (v) => Array.isArray(v) && v.length <= 8
    && v.every((id) => str(id) && id.length > 0) && new Set(v).size === v.length;
// ISO 3166-1 assigned alpha-2 codes only: Intl also names non-ISO regions (EU, XK, etc.).
const COUNTRIES = new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ '
    + 'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR '
    + 'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP '
    + 'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ '
    + 'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW '
    + 'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ '
    + 'UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' '));
const validCountry = (v) => str(v) && (v === '' || (v.length === 2 && /^[A-Z]{2}$/.test(v) && COUNTRIES.has(v)));
const validGender = (v) => v === '' || v === 'male' || v === 'female';
function birthDateUTC(v) {
    if (!str(v) || v.length !== 10 || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v))
        return null;
    const date = new Date(v + 'T00:00:00.000Z');
    // Date parsing can roll February 30 into March: require a real, exact UTC calendar date.
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v ? date : null;
}
function validBirthDate(v, now) {
    if (v === '')
        return true;
    const date = birthDateUTC(v), today = new Date(now);
    if (!date || !Number.isFinite(today.getTime()))
        return false;
    today.setUTCHours(0, 0, 0, 0);
    const oldest = new Date(today);
    oldest.setUTCFullYear(oldest.getUTCFullYear() - 120);
    return date.getTime() >= oldest.getTime() && date.getTime() <= today.getTime();
}
function ageOf(birthDate, now) {
    const date = birthDateUTC(birthDate), today = new Date(now);
    if (!date || !Number.isFinite(today.getTime()))
        return null;
    // A February 29 birthday advances on March 1 in non-leap years, never February 28.
    const beforeBirthday = today.getUTCMonth() < date.getUTCMonth()
        || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate());
    return today.getUTCFullYear() - date.getUTCFullYear() - Number(beforeBirthday);
}
const validProf = (v, now) => isObj(v) && optional(v.id, str) && optional(v.name, str)
    && ['since', 'xp', 'points', 'wins', 'played', 'seq'].every((k) => optional(v[k], nat))
    && optional(v.lastActiveAt, nat) && optional(v.sinceInferred, (x) => typeof x === 'boolean')
    && optional(v.bio, validBio) && optional(v.favoriteGames, validFavorites)
    && optional(v.specialPlayerId, validSpecialPlayerId)
    && optional(v.country, validCountry) && optional(v.gender, validGender) && optional(v.birthDate, (x) => validBirthDate(x, now))
    && optional(v.games, (x) => record(x, validStat)) && optional(v.ledger, (x) => array(x, validTx)) && optional(v.history, (x) => array(x, validHist));
export const validPlayerId = (v) => str(v) && v.length === 8 && /^[0-9]{8}$/.test(v);
/** Presentation alias only: no padding, coercion, leading zero, or non-ASCII digits. */
export const validSpecialPlayerId = (v) => str(v) && v.length >= 1 && v.length <= 8 && /^[1-9][0-9]{0,7}$/.test(v);
/** Static diagnostics only: never include canonical IDs, names, or malformed values. */
export function playerIdSchemaIssue(d) {
    if (!isObj(d.profiles))
        return;
    const explicit = new Map(), aliases = new Map();
    const legacy = new Map();
    for (const [key, p] of Object.entries(d.profiles)) {
        if (!isObj(p))
            continue;
        if (p.playerId !== undefined) {
            if (!validPlayerId(p.playerId))
                return 'playerId must be a string of exactly eight ASCII digits';
            if (explicit.has(p.playerId))
                return 'duplicate explicit playerId; manual conflict review required';
            explicit.set(p.playerId, key);
        }
        if (p.specialPlayerId !== undefined) {
            if (!validSpecialPlayerId(p.specialPlayerId))
                return 'specialPlayerId must be a string of one to eight ASCII digits starting with 1-9';
            if (aliases.has(p.specialPlayerId))
                return 'duplicate specialPlayerId; manual conflict review required';
            aliases.set(p.specialPlayerId, key);
        }
        const value = legacyPlayerId(str(p.id) ? p.id : key);
        if (value) {
            let owners = legacy.get(value);
            if (!owners)
                legacy.set(value, owners = new Set());
            owners.add(key);
        }
    }
    // Separate passes make alias-vs-normal conflicts independent of file ordering.
    for (const [value, owner] of aliases) {
        if (explicit.has(value) && explicit.get(value) !== owner)
            return 'specialPlayerId conflicts with explicit playerId; manual conflict review required';
        if ([...(legacy.get(value) ?? [])].some((key) => key !== owner))
            return 'specialPlayerId conflicts with legacy playerId; manual conflict review required';
    }
}
const validAccountShape = (d, now = Date.now()) => isObj(d) && optional(d.v, nat)
    && optional(d.profiles, (x) => record(x, (p) => validProf(p, now))) && optional(d.recorded, (x) => array(x, str));
/** الناقص القديم له defaults في constructor؛ null أو نوع/رقم غير صالح يوقف التحميل قبل ربط المحفظة. */
export const validAccounts = (d, now = Date.now()) => validAccountShape(d, now) && !playerIdSchemaIssue(d);
const PLAYER_MIN = 10_000_000, PLAYER_END = 100_000_000, RANDOM_ATTEMPTS = 32;
const legacyPlayerId = (id) => { const v = id.slice(0, 8); return validPlayerId(v) ? v : undefined; };
/** Finite deterministic fallback: first free number, or an explicit exhaustion error. */
function firstFreePlayerId(used) {
    let next = PLAYER_MIN;
    const reserved = [...used].filter(validPlayerId).map(Number).filter((n) => n >= PLAYER_MIN).sort((a, b) => a - b);
    for (const n of reserved) {
        if (n > next)
            break;
        if (n === next)
            next++;
    }
    if (next >= PLAYER_END)
        throw new Error('player_id_space_exhausted');
    return String(next);
}
function allocatePlayerId(used, random) {
    for (let i = 0; i < RANDOM_ATTEMPTS; i++) {
        const n = random(PLAYER_MIN, PLAYER_END);
        if (!Number.isSafeInteger(n) || n < PLAYER_MIN || n >= PLAYER_END)
            throw new Error('player_id_random_invalid');
        const id = String(n);
        if (!used.has(id))
            return id;
    }
    return firstFreePlayerId(used);
}
/** Pure, validated dry-run only. No writes/defaulting/RNG. Conflicts block the entire plan.
 * Run against a quiescent, privately copied snapshot; applying requires separate approval.
 */
export function planPlayerIds(input) {
    if (!isObj(input) || !validAccountShape(input))
        throw new Error('accounts_schema_invalid');
    const rows = Object.entries((input.profiles ?? {}))
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    const plan = { version: 1, dryRun: true, singleWriterOnly: true, ok: false, assignments: [], conflicts: [], summary: { accounts: rows.length, stored: 0, legacy: 0, generated: 0, conflicts: 0 } };
    const claims = new Map();
    const claim = (value, key, explicit) => {
        let owners = claims.get(value);
        if (!owners)
            claims.set(value, owners = new Map());
        owners.set(key, !!owners.get(key) || explicit);
    };
    for (const [key, p] of rows) {
        if (p.playerId !== undefined) {
            if (!validPlayerId(p.playerId))
                plan.conflicts.push({ code: 'invalid_explicit', accountKeys: [key] });
            else
                claim(p.playerId, key, true);
        }
        const legacy = legacyPlayerId(str(p.id) ? p.id : key);
        if (legacy)
            claim(legacy, key, false);
        // The dry-run allocator must reserve aliases too; permanent IDs never replace them.
        if (validSpecialPlayerId(p.specialPlayerId))
            claim(p.specialPlayerId, key, false);
    }
    for (const [value, owners] of [...claims].sort(([a], [b]) => a.localeCompare(b))) {
        if (owners.size > 1)
            plan.conflicts.push({ code: [...owners.values()].filter(Boolean).length > 1 ? 'duplicate_explicit' : 'display_collision', accountKeys: [...owners.keys()].sort(), playerId: value });
    }
    plan.summary.conflicts = plan.conflicts.length;
    if (plan.conflicts.length)
        return plan;
    const used = new Set(claims.keys());
    for (const [key, p] of rows) {
        const legacy = legacyPlayerId(str(p.id) ? p.id : key);
        const source = p.playerId !== undefined ? 'stored' : legacy ? 'legacy' : 'generated';
        let playerId = (p.playerId ?? legacy);
        if (!playerId) {
            // Stable across repeated runs and object ordering, without exposing a canonical prefix.
            const n = PLAYER_MIN + createHash('sha256').update('la3bak-player-id-plan-v1\0').update(key).digest().readUInt32BE(0) % (PLAYER_END - PLAYER_MIN);
            playerId = used.has(String(n)) ? firstFreePlayerId(used) : String(n);
        }
        used.add(playerId);
        plan.assignments.push({ accountKey: key, playerId, source });
        plan.summary[source]++;
    }
    plan.ok = true;
    return plan;
}
let warnedSingleWriter = false;
const LEDGER_MAX = 100, HIST_MAX = 50;
const blank = () => ({ played: 0, won: 0, ranked: 0, points: 0 });
/** Single process / single Accounts writer per file only. No cross-process uniqueness guarantee. */
export class Accounts {
    now;
    playerIdRandom;
    d = { v: 1, profiles: {}, recorded: [] };
    disk;
    xpOverlay;
    /** Server composition: reserve before XP/history mutation; a thrown error applies back-pressure. */
    onBeforeRecord;
    onRecorded;
    constructor(file = '', now = Date.now, mon = new StorageMonitor(), playerIdRandom = randomInt) {
        this.now = now;
        this.playerIdRandom = playerIdRandom;
        if (file) {
            if (!warnedSingleWriter) {
                warnedSingleWriter = true;
                process.emitWarning('Accounts file storage requires one writer only. Concurrent process writers or multiple writable instances for one file are unsupported.', { code: 'ACCOUNTS_SINGLE_WRITER' });
            }
            // ملف تالف: يرمي DataFilesCorruptError بعد حفظ نسخة منه (ما نبدأ بفاضي وما نكتب فوقه)
            let issue;
            let loaded;
            try {
                loaded = loadJsonFile(file, (data) => { issue ??= playerIdSchemaIssue(data); return validAccounts(data, this.now()); });
            }
            catch (e) {
                if (e instanceof DataFilesCorruptError && issue)
                    e.message += `; accounts schema: ${issue}`;
                throw e;
            }
            if (loaded)
                this.d = loaded;
            this.d.profiles ??= {};
            this.d.recorded ??= [];
            // نكمّل الحقول الغائبة فقط؛ validator رفض null والأنواع الخاطئة. التحميل نفسه لا يكتب الملف.
            this.d.v ??= 1;
            for (const [id, p] of Object.entries(this.d.profiles)) {
                p.id ??= id;
                p.name ??= 'لاعب';
                if (p.since === undefined)
                    p.sinceInferred = true;
                p.since ??= this.now();
                p.xp ??= 0;
                p.points ??= 0;
                p.wins ??= 0;
                p.played ??= 0;
                p.games ??= {};
                p.ledger ??= [];
                p.history ??= [];
                p.bio = (p.bio ?? '').normalize('NFC');
                p.favoriteGames ??= [];
                p.seq ??= p.ledger.reduce((max, tx) => Math.max(max, tx.id), 0);
                for (const s of Object.values(p.games)) {
                    s.played ??= 0;
                    s.won ??= 0;
                    s.ranked ??= 0;
                    s.points ??= 0;
                }
                for (const tx of p.ledger)
                    tx.ref ??= '';
                for (const h of p.history) {
                    h.stake ??= 0;
                    h.coins ??= 0;
                    h.players ??= 0;
                }
            }
        }
        this.disk = new Persister('accounts', file, () => this.d, now, mon);
    }
    /** Read-only raw canonical game XP for Progression's constructor arg4; never returns display bonuses. */
    rawXp(id) { return this.d.profiles[id]?.xp ?? 0; }
    /** Server composition only. No data rewrite: record() still updates canonical game XP exclusively. */
    setXpOverlay(overlay) { this.xpOverlay = overlay; }
    displayXp(p) {
        const xp = this.xpOverlay ? this.xpOverlay(p.id, p.xp) : p.xp;
        if (!nat(xp))
            throw new RangeError('accounts_xp_invalid');
        return xp;
    }
    p(id, name = '') {
        let p = this.d.profiles[id];
        if (!p) {
            // Derive reservations from actual state: failed mustSave rollback leaves no ghost IDs.
            const reserved = new Set();
            const ownLegacy = legacyPlayerId(id);
            for (const existing of Object.values(this.d.profiles)) {
                if (existing.playerId)
                    reserved.add(existing.playerId);
                if (existing.specialPlayerId)
                    reserved.add(existing.specialPlayerId);
                // Canonical keys cannot be rewritten to resolve a legacy-prefix/alias collision.
                if (ownLegacy && existing.specialPlayerId === ownLegacy)
                    throw new Error('special_player_id_taken');
                const legacy = legacyPlayerId(existing.id);
                if (legacy)
                    reserved.add(legacy);
            }
            if (ownLegacy)
                reserved.add(ownLegacy);
            const playerId = allocatePlayerId(reserved, this.playerIdRandom);
            p = this.d.profiles[id] = { id, playerId, name: name || 'لاعب', since: this.now(), xp: 0, points: 0, wins: 0, played: 0, games: {}, ledger: [], history: [], seq: 0, bio: '', favoriteGames: [] };
        }
        return p;
    }
    /** تغيير اسم صريح أو إنشاء حساب؛ لا ينجح قبل الحفظ، والفشل يرجع الحالة السابقة. */
    touch(id, name) {
        const before = this.d.profiles[id];
        const oldName = before?.name;
        const p = this.p(id, name);
        if (name)
            p.name = name;
        if (!before || oldName !== p.name) {
            try {
                this.disk.mustSave();
            }
            catch (e) {
                if (before)
                    before.name = oldName;
                else
                    delete this.d.profiles[id];
                throw e;
            }
        }
    }
    /** إنشاء المفقود وحفظه فقط؛ اسم جلسة/غرفة قديم لا يبدّل الاسم المحفوظ. */
    ensure(id, name) {
        if (this.d.profiles[id])
            return;
        this.p(id, name);
        try {
            this.disk.mustSave();
        }
        catch (e) {
            delete this.d.profiles[id];
            throw e;
        }
    }
    /** تعديل العرض الخاص فقط. لا ينشئ حساباً؛ المسار الموثّق يستدعي ensure أولاً. */
    updatePresentation(id, patch, available) {
        if (!isObj(patch))
            return null;
        const prototype = Object.getPrototypeOf(patch);
        if (prototype !== Object.prototype && prototype !== null)
            return null;
        const keys = Reflect.ownKeys(patch);
        if (!keys.length || keys.some((k) => typeof k !== 'string' || !['bio', 'favoriteGames', 'country', 'gender', 'birthDate'].includes(k)))
            return null;
        const hasBio = Object.hasOwn(patch, 'bio'), hasFavorites = Object.hasOwn(patch, 'favoriteGames');
        const hasCountry = Object.hasOwn(patch, 'country'), hasGender = Object.hasOwn(patch, 'gender'), hasBirthDate = Object.hasOwn(patch, 'birthDate');
        if (hasBio && !str(patch.bio))
            return null;
        const bio = hasBio ? patch.bio.normalize('NFC') : undefined;
        // New writes are text only, with no HTML delimiters. Legacy stored bios retain escaped-text compatibility.
        if (hasBio && (!validBio(bio) || /[<>]/.test(bio)))
            return null;
        if (hasFavorites && (!Array.isArray(patch.favoriteGames) || patch.favoriteGames.length > 8
            || !patch.favoriteGames.every((game) => str(game) && game.length > 0 && !/[<>]/.test(game) && available(game))))
            return null;
        if (hasCountry && !validCountry(patch.country))
            return null;
        if (hasGender && !validGender(patch.gender))
            return null;
        if (hasBirthDate && !validBirthDate(patch.birthDate, this.now()))
            return null;
        const p = this.d.profiles[id];
        if (!p)
            return null;
        const before = { bio: p.bio, favoriteGames: p.favoriteGames, country: p.country, gender: p.gender, birthDate: p.birthDate };
        const absent = ['bio', 'favoriteGames', 'country', 'gender', 'birthDate'].filter((key) => !Object.hasOwn(p, key));
        if (hasBio)
            p.bio = bio;
        if (hasFavorites)
            p.favoriteGames = [...new Set(patch.favoriteGames)];
        if (hasCountry)
            p.country = patch.country;
        if (hasGender)
            p.gender = patch.gender;
        if (hasBirthDate)
            p.birthDate = patch.birthDate;
        try {
            this.disk.mustSave();
        }
        catch (e) {
            Object.assign(p, before);
            for (const key of absent)
                delete p[key];
            throw e;
        }
        const result = { ok: true, bio: p.bio ?? '', favoriteGames: [...(p.favoriteGames ?? [])] };
        // Preserve the original response contract for clients updating only bio/favorites.
        return hasCountry || hasGender || hasBirthDate ? { ...result, ...this.personal(p) } : result;
    }
    personal(p) {
        // Self-reported only: never infer from names, sessions, photos, or game activity.
        return { country: p.country ?? '', gender: p.gender ?? '', birthDate: p.birthDate ?? '', age: ageOf(p.birthDate, this.now()) };
    }
    /** أهلية اجتماعية خادمية فقط؛ null يعني العمر غير محدد، وليس إثباتاً للعمر. */
    socialAge(id) { const p = this.d.profiles[id]; return p ? ageOf(p.birthDate, this.now()) : null; }
    /** اسم الحساب المحفوظ، أو '' لو الحساب غير موجود */
    /** بحث بالاسم لاختيار مستلم هدية: أسماء ومستويات فقط (لا بيانات خاصة)، بدون صاحب الطلب */
    findByName(q, exclude, n = 8) {
        const t = q.trim().toLowerCase();
        if (t.length < 2)
            return [];
        return Object.values(this.d.profiles).filter((p) => p.id !== exclude && p.name !== 'لاعب' && p.name.toLowerCase().includes(t))
            .sort((x, y) => Number(y.name.toLowerCase() === t) - Number(x.name.toLowerCase() === t) || x.name.localeCompare(y.name)).slice(0, n)
            .map((p) => ({ id: p.id, name: p.name, level: levelOf(this.displayXp(p)) }));
    }
    nameOf(id) { const n = this.d.profiles[id]?.name ?? ''; return n === 'لاعب' ? '' : n; }
    /** Read only: legacy records stay unassigned until a separately approved migration. */
    publicPlayerId(id) { return this.d.profiles[id]?.playerId; }
    /** Distinguished presentation ID, falling back only to the existing publicPlayerId contract. */
    /** R57: الأيدي المميز الحالي (أو null) — للقراءة فقط */
    specialPlayerIdOf(id) { return this.d.profiles[id]?.specialPlayerId ?? null; }
    displayPlayerId(id) { return this.d.profiles[id]?.specialPlayerId ?? this.publicPlayerId(id); }
    /** Numeric lookup only; returns the canonical storage key, never creates or rewrites accounts.
     * Original explicit/legacy numeric IDs remain searchable after an alias is assigned.
     * Historical ambiguous normal IDs fail closed instead of choosing an arbitrary account.
     */
    findByDisplayPlayerId(value) {
        if (!validSpecialPlayerId(value) && !validPlayerId(value))
            return null;
        let found = null;
        for (const [key, p] of Object.entries(this.d.profiles)) {
            if (p.specialPlayerId !== value && p.playerId !== value && legacyPlayerId(p.id) !== value)
                continue;
            if (found !== null && found !== key)
                return null;
            found = key;
        }
        return found;
    }
    /** Authorized server composition only: caller enforces owner permission and operation audit.
     * Existing account only; same value/repeated revoke is a no-write success. Storage failure
     * restores a cloned profile, including the absence of an alias; retry cannot apply it later.
     */
    setSpecialPlayerId(id, value) {
        if (value !== null && !validSpecialPlayerId(value))
            throw new Error('special_player_id_invalid');
        const p = Object.hasOwn(this.d.profiles, id) ? this.d.profiles[id] : undefined;
        if (!p)
            throw new Error('account_not_found');
        if (value !== null) {
            for (const [key, other] of Object.entries(this.d.profiles)) {
                if (key !== id && (other.specialPlayerId === value || other.playerId === value || legacyPlayerId(other.id) === value))
                    throw new Error('special_player_id_taken');
            }
        }
        const dup = (p.specialPlayerId ?? null) === value;
        if (!dup) {
            const before = structuredClone(p);
            if (value === null)
                delete p.specialPlayerId;
            else
                p.specialPlayerId = value;
            try {
                this.disk.mustSave();
            }
            catch (e) {
                this.d.profiles[id] = before;
                throw e;
            }
        }
        return { ok: true, dup, specialPlayerId: p.specialPlayerId ?? null, playerId: p.playerId ?? null, displayPlayerId: p.specialPlayerId ?? p.playerId ?? null };
    }
    /** Observed authenticated activity only; never called by balance/grant mirrors. At most one write per five minutes. */
    noteActivity(id) {
        const p = this.d.profiles[id];
        if (!p)
            return;
        const t = this.now();
        if (p.lastActiveAt !== undefined && t >= p.lastActiveAt && t - p.lastActiveAt < 300_000)
            return;
        p.lastActiveAt = t;
        this.save();
    }
    /** Canonical storage keys, not presentation IDs. Unknown legacy registration dates stay unknown. */
    bulkTargets(filter, asOf) {
        if (!nat(asOf) || !isObj(filter) || !['all', 'active', 'registered'].includes(filter.kind)
            || (filter.kind === 'active' && (!nat(filter.days) || filter.days < 1 || filter.days > 3650))
            || (filter.kind === 'registered' && (!nat(filter.from) || !nat(filter.to) || filter.from >= filter.to)))
            throw new RangeError('accounts_bulk_filter_invalid');
        return Object.entries(this.d.profiles).filter(([, row]) => {
            const p = row;
            if (filter.kind === 'active')
                return p.lastActiveAt !== undefined && p.lastActiveAt >= asOf - filter.days * 86_400_000 && p.lastActiveAt <= asOf;
            if (filter.kind === 'registered')
                return !p.sinceInferred && p.since >= filter.from && p.since < filter.to;
            return true;
        }).map(([id, p]) => ({ id, name: p.name }));
    }
    /** سجل حركة عملات؛ يستدعيه المحفظة بعد كل تغيير في الرصيد */
    tx(id, kind, delta, balance, ref = '') {
        const p = this.p(id);
        p.ledger.push({ id: ++p.seq, ts: this.now(), kind, delta, balance, ref });
        if (p.ledger.length > LEDGER_MAX)
            p.ledger.splice(0, p.ledger.length - LEDGER_MAX);
        this.save();
    }
    /** Optional coin mirror: wallet receipts/ledger are canonical; one save per batch, no activity or XP/points. */
    txCampaignBatch(rows) {
        let changed = false;
        for (const row of rows) {
            const p = this.p(row.id);
            if (p.ledger.some((tx) => tx.ref === row.ref && tx.kind === 'admin'))
                continue;
            p.ledger.push({ id: ++p.seq, ts: this.now(), kind: 'admin', delta: row.delta, balance: row.balance, ref: row.ref });
            if (p.ledger.length > LEDGER_MAX)
                p.ledger.splice(0, p.ledger.length - LEDGER_MAX);
            changed = true;
        }
        if (changed)
            this.save();
    }
    /**
     * نتيجة لعبة منتهية. مرة وحدة لكل مفتاح.
     * players: كل البشر المشاركين. نقاط التصنيف فقط إذا فيه بشران فأكثر.
     */
    record(key, game, players, winners, stake = 0, coinsWon = {}) {
        if (!players.length || this.d.recorded.includes(key))
            return false;
        const ts = this.now();
        const release = this.onBeforeRecord?.(key, players, winners, ts);
        try {
            const ranked = players.length >= 2;
            for (const pl of players) {
                const p = this.p(pl.id, pl.name);
                const win = winners.includes(pl.id);
                const g = (p.games[game] ??= blank());
                const pts = ranked ? POINTS.played + (win ? POINTS.won : 0) : 0;
                const xp = XP.played + (win ? XP.won : 0);
                g.played++;
                p.played++;
                if (win) {
                    g.won++;
                    p.wins++;
                }
                if (ranked) {
                    g.ranked++;
                    g.points += pts;
                    p.points += pts;
                }
                p.xp += xp;
                p.history.push({ key, ts, game, result: win ? 'win' : 'loss', ranked, points: pts, xp, stake, coins: coinsWon[pl.id] ?? 0, players: players.length });
                if (p.history.length > HIST_MAX)
                    p.history.splice(0, p.history.length - HIST_MAX);
            }
            // مفتاح النتيجة لا ينتهي بعد 5000 مباراة؛ إعادة نتيجة قديمة لا تكرر النقاط أو الخبرة.
            this.d.recorded.push(key);
            this.save();
            this.onRecorded?.(key);
            return true;
        }
        finally {
            release?.();
        }
    }
    /** الترتيب: النقاط ثم الفوز ثم أقل ألعاب ثم الاسم. فقط من لعب لعبة تصنيف وحدة على الأقل. */
    ranking(game) {
        const rows = Object.values(this.d.profiles).map((p) => {
            const g = game === 'all' ? { ranked: Object.values(p.games).reduce((a, x) => a + x.ranked, 0), points: p.points, won: p.wins, played: p.played } : (p.games[game] ?? blank());
            return { id: p.id, name: p.name, points: g.points, wins: g.won, games: g.played, ranked: g.ranked };
        }).filter((r) => r.ranked > 0);
        rows.sort((a, b) => b.points - a.points || b.wins - a.wins || a.games - b.games || a.name.localeCompare(b.name));
        return rows;
    }
    rankings(game, limit = 20, me, avOf) {
        const g = game === 'all' || GAMES.includes(game) ? game : 'all';
        const rows = this.ranking(g);
        const shape = (r, i) => ({ rank: i + 1, name: r.name, points: r.points, wins: r.wins, losses: r.games - r.wins, games: r.games, me: r.id === me, av: avOf ? avOf(r.id) : null });
        const idx = me ? rows.findIndex((r) => r.id === me) : -1;
        return { game: g, total: rows.length, list: rows.slice(0, limit).map(shape), mine: idx >= 0 ? shape(rows[idx], idx) : null };
    }
    /** قراءة للإدارة: كل الحسابات بملخص (بدون سجلات) */
    /** مستوى اللاعب (من الخبرة) للعرض في الغرف؛ قراءة فقط ولا ينشئ ملفاً */
    level(id) { const p = this.d.profiles[id]; return p ? levelOf(this.displayXp(p)) : null; }
    all() { return Object.values(this.d.profiles).map((p) => ({ id: p.id, name: p.name, since: p.since, xp: this.displayXp(p), level: levelOf(this.displayXp(p)), points: p.points, wins: p.wins, played: p.played })); }
    has(id) { return !!this.d.profiles[id]; }
    /** R53: وقت إنشاء الحساب (null لو غير معروف بدقة) — لربط دعوة الأصدقاء بالحسابات الجديدة فقط */
    sinceOf(id) { const p = this.d.profiles[id]; return p && !p.sinceInferred && Number.isSafeInteger(p.since) ? p.since : null; }
    /** ملخص عام لصفحة اللاعب بالمجتمع (قراءة فقط ولا ينشئ حساباً): المستوى والألعاب والفوز وأكثر لعبة لعبها. بدون عملات ولا سجلات */
    publicStats(id) {
        const p = this.d.profiles[id];
        if (!p)
            return null;
        const fav = Object.entries(p.games).sort((a, b) => b[1].played - a[1].played)[0];
        return { level: levelOf(this.displayXp(p)), played: p.played, wins: p.wins, fav: fav && fav[1].played > 0 ? fav[0] : null };
    }
    /** أرقام خام للإنجازات (قراءة فقط ولا ينشئ حساباً) */
    achStats(id) {
        const p = this.d.profiles[id];
        if (!p)
            return { played: 0, wins: 0, level: 1, points: 0, games: {} };
        return { played: p.played, wins: p.wins, level: levelOf(this.displayXp(p)), points: p.points, games: Object.fromEntries(Object.entries(p.games).map(([g, s]) => [g, { played: s.played, won: s.won }])) };
    }
    recordedCount() { return this.d.recorded.length; }
    /** Read-only primary proof; callers must also check unsaved() before replaying consumers. */
    hasRecorded(key) { return this.d.recorded.includes(key); }
    /** مشاركات اللاعبين لكل لعبة (مجموع played من الحسابات: لاعبين × مباريات) */
    gameTotals() { const o = {}; for (const p of Object.values(this.d.profiles))
        for (const [g, s] of Object.entries(p.games)) {
            const t = (o[g] ??= { played: 0, won: 0 });
            t.played += s.played;
            t.won += s.won;
        } return o; }
    /** ملف كامل لمراجعة الإدارة (معرّف كامل) */
    adminProfile(id) { const p = this.d.profiles[id]; return p ? { id: p.id, name: p.name, since: p.since, xp: this.displayXp(p), level: levelOf(this.displayXp(p)), points: p.points, wins: p.wins, played: p.played, games: p.games, history: p.history.slice(-20).reverse() } : null; }
    /** ملف اللاعب نفسه فقط (يُطلب بمعرّف جلسته، ما فيه مسار لحساب غيره) */
    profile(id, coins) {
        this.ensure(id, '');
        const p = this.p(id);
        const xp = this.displayXp(p), lv = levelOf(xp);
        const stats = {};
        for (const g of GAMES) {
            const s = p.games[g] ?? blank();
            const r = this.rankings(g, 0, id).mine;
            stats[g] = { ...s, losses: s.played - s.won, rank: r?.rank ?? null };
        }
        return {
            id: p.id.slice(0, 8), playerId: p.playerId, name: p.name, since: p.since, coins,
            specialPlayerId: p.specialPlayerId ?? null, displayPlayerId: p.specialPlayerId ?? p.playerId ?? null,
            bio: p.bio ?? '', favoriteGames: [...(p.favoriteGames ?? [])],
            ...this.personal(p),
            points: p.points, xp, level: lv, xpFloor: xpForLevel(lv), xpNext: lv >= 100 ? null : xpForLevel(lv + 1),
            played: p.played, wins: p.wins, losses: p.played - p.wins, rank: this.rankings('all', 0, id).mine?.rank ?? null,
            stats, ledger: p.ledger.slice(-20).reverse(), history: p.history.slice(-20).reverse(),
        };
    }
    /**
     * جائزة كانت معلّقة (فشل الحفظ) وانحفظت أخيراً: نكمّل خانة العملات في سجل تلك اللعبة.
     * لو ما لقينا السجل (مثل استرجاع رسوم) ما يصير شيء.
     */
    patchCoins(key, id, coins) {
        const h = this.d.profiles[id]?.history.find((x) => x.key === key);
        if (!h)
            return;
        h.coins = coins;
        this.save();
    }
    /** الحفظ: لو فشل يظل الحساب بالذاكرة وتنعاد الكتابة (retry) وتظهر الحالة في /readyz. */
    save() { this.disk.save(); }
    retry() { this.disk.retry(); }
    /** نتائج بالذاكرة ما انكتبت بعد */
    unsaved() { return this.disk.unsaved; }
}
