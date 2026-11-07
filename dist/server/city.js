import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';
/**
 * «مدينتي» — لعبة لوحة اقتصادية أصلية (MVP) لاعب واحد مع غارات غير متزامنة على مدن لاعبين ثانيين.
 * كل شيء بالخادم: النرد (مولّد الخادم)، الحركة، المكافآت، الترقيات، الغارات، المهام، تجدد الرميات. العميل يرسل «ارمِ»/«رقّي»/«استلم» فقط.
 * عملة المدينة 🏙️ (ذهب المدينة) منفصلة تماماً عن عملات لعبك 🪙: ما تنشرى ولا تتحول، فاللعبة ما تأثر على المحفظة ولا الهدايا.
 * التخزين: ملف واحد city.json بجانب المحفظة (CITY_FILE)، كتابة ذرّية؛ الغارة تعدّل المدينتين بنفس الحفظ (كل شيء أو لا شيء).
 * القواعد بالتفصيل في docs/CITY.md.
 */
export const BOARD = [
    'start', 'prop', 'bonus', 'prop', 'event', 'prop', 'raid',
    'prop', 'shield', 'prop', 'tax', 'prop', 'bonus',
    'prop', 'event', 'prop', 'raid', 'prop', 'shield',
    'prop', 'bonus', 'prop', 'event', 'prop',
];
export const START_COINS = 2000, START_ROLLS = 30, MAX_ROLLS = 50, REGEN_MS = 8 * 60_000, MAX_SHIELDS = 3;
export const MULTS = [1, 2, 3];
export const LOG_CAP = 20, KEYS_CAP = 30;
/** أسماء المعالم: 5 لكل مستوى، وتتكرر الثيمات بعد آخر مستوى */
export const THEMES = [
    { name: 'الحي القديم', marks: ['السوق الشعبي', 'البيت التراثي', 'برج الساعة', 'النافورة', 'ميناء الصيد'] },
    { name: 'واحة النخيل', marks: ['بستان النخيل', 'البئر', 'خيمة الضيافة', 'سوق التمور', 'برج المراقبة'] },
    { name: 'مدينة الموانئ', marks: ['المنارة', 'رصيف السفن', 'سوق السمك', 'جسر الميناء', 'حوض السفن'] },
    { name: 'العاصمة الحديثة', marks: ['البرج اللامع', 'المجمّع التجاري', 'محطة القطار', 'الحديقة المركزية', 'الملعب'] },
    { name: 'مدينة المستقبل', marks: ['ناطحة السحاب', 'برج الطاقة', 'محطة الفضاء', 'القبة الزجاجية', 'الجسر المعلّق'] },
];
export const STARS = 4;
export const markCost = (level, i, star) => Math.round((300 * level ** 1.35 * (1 + i * 0.25) * (star + 1)) / 10) * 10;
export const MISSIONS = [
    { id: 'm-roll', label: 'ارمِ النرد 20 مرة', stat: 'rolls', goal: 20, reward: { rolls: 10 } },
    { id: 'm-up', label: 'رقِّ 3 نجوم بمعالم مدينتك', stat: 'upgrades', goal: 3, reward: { coins: 1500 } },
    { id: 'm-raid', label: 'نفّذ غارتين', stat: 'raids', goal: 2, reward: { shields: 1 } },
    { id: 'm-bonus', label: 'قف على الكنز 3 مرات', stat: 'bonus', goal: 3, reward: { rolls: 5 } },
];
export const EVENTS = [
    { id: 'fest', text: 'مهرجان بالمدينة! زوّار كثير', coins: 300 },
    { id: 'storm', text: 'عاصفة رملية أخّرت التجارة', lose: 0.08 },
    { id: 'gift', text: 'بلدية المدينة أهدتك رميات', rolls: 3 },
    { id: 'trade', text: 'صفقة تجارية ناجحة', coins: 500 },
];
const uint = (v) => Number.isSafeInteger(v) && v >= 0;
const index = (v) => uint(v) && v < BOARD.length;
const timestamp = (v) => uint(v) && v <= 8_640_000_000_000_000;
const counters = (v) => isObj(v) && Object.values(v).every(uint);
const validRoll = (v) => {
    if (!isObj(v) || !Array.isArray(v.dice) || v.dice.length !== 2 || !v.dice.every((n) => uint(n) && n >= 1 && n <= 6)
        || !MULTS.includes(v.mult) || !index(v.from) || !index(v.to)
        || !Array.isArray(v.path) || v.path.length !== v.dice[0] + v.dice[1]
        || !v.path.every((p, i) => index(p) && p === (v.from + i + 1) % BOARD.length)
        || v.to !== v.path[v.path.length - 1] || v.tile !== BOARD[v.to]
        || v.passedStart !== (v.from + v.path.length >= BOARD.length)
        || !Number.isSafeInteger(v.coins) || !uint(v.rolls) || !uint(v.shields) || v.shields > MAX_SHIELDS || typeof v.text !== 'string')
        return false;
    if (v.event !== undefined && typeof v.event !== 'string')
        return false;
    if (v.raid !== undefined && (!isObj(v.raid) || typeof v.raid.target !== 'string' || typeof v.raid.bot !== 'boolean'
        || !uint(v.raid.loot) || typeof v.raid.blocked !== 'boolean'))
        return false;
    return true;
};
const validRec = (r) => {
    if (!isObj(r))
        return false;
    const stats = r.stats;
    if (typeof r.name !== 'string' || !uint(r.coins) || !uint(r.rolls) || !timestamp(r.rollsAt)
        || !index(r.pos) || !uint(r.level) || r.level < 1 || !Array.isArray(r.marks) || r.marks.length !== 5
        || !r.marks.every((n) => uint(n) && n <= STARS) || !uint(r.shields) || r.shields > MAX_SHIELDS
        || !counters(stats) || !isObj(stats) || !['rolls', 'upgrades', 'raids', 'bonus', 'raided'].every((k) => uint(stats[k]))
        || typeof r.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.day) || !Number.isFinite(Date.parse(r.day))
        || new Date(r.day).toISOString().slice(0, 10) !== r.day || !counters(r.daily)
        || !Array.isArray(r.claimed) || !r.claimed.every((id) => typeof id === 'string')
        || typeof r.tut !== 'boolean' || !timestamp(r.seen) || !timestamp(r.at)
        || !Array.isArray(r.log) || !Array.isArray(r.keys))
        return false;
    if (!r.log.every((l) => isObj(l) && timestamp(l.ts) && ['raided', 'blocked', 'level', 'raid', 'event'].includes(l.kind)
        && typeof l.text === 'string' && (l.coins === undefined || Number.isSafeInteger(l.coins))))
        return false;
    return r.keys.every((k) => isObj(k) && typeof k.k === 'string' && k.k.length >= 6 && k.k.length <= 80
        && timestamp(k.at) && validRoll(k.res));
};
/** الحقول اللازمة للمحرك إلزامية؛ v القديم الغايب والحقول الإضافية تظل متوافقة، والرميات المكتسبة ما لها سقف جديد. */
export const validCity = (d) => isObj(d) && (d.v === undefined || d.v === 1)
    && isObj(d.players) && Object.values(d.players).every(validRec);
export class CityError extends Error {
    constructor(msg) { super(msg); }
}
const dayOf = (t) => new Date(t + 3 * 3600_000).toISOString().slice(0, 10); // يوم بتوقيت الخليج (+3)
export class City {
    now;
    rng;
    d = { v: 1, players: {} };
    disk;
    constructor(file = '', now = Date.now, rng = Math.random, mon = new StorageMonitor()) {
        this.now = now;
        this.rng = rng;
        if (file) {
            const l = loadJsonFile(file, validCity);
            if (l)
                this.d = { v: 1, players: {}, ...l };
        }
        this.disk = new Persister('city', file, () => this.d, now, mon);
    }
    retry() { this.disk.retry(); }
    unsaved() { return this.disk.unsaved; }
    /** تعديل ذرّي: لو فشل الحفظ ترجع البيانات كما كانت ويرمي StorageError */
    commit(fn) {
        const snap = structuredClone(this.d);
        try {
            const r = fn();
            this.disk.mustSave();
            return r;
        }
        catch (e) {
            this.d = snap;
            throw e;
        }
    }
    fresh(name) {
        const t = this.now();
        return { name, coins: START_COINS, rolls: START_ROLLS, rollsAt: t, pos: 0, level: 1, marks: [0, 0, 0, 0, 0], shields: 0, stats: { rolls: 0, upgrades: 0, raids: 0, bonus: 0, raided: 0 }, day: dayOf(t), daily: {}, claimed: [], log: [], tut: false, seen: 0, keys: [], at: t };
    }
    /** تجدد الرميات حسب وقت الخادم + تصفير المهام اليومية */
    tickRec(r) {
        const t = this.now();
        if (r.rolls < MAX_ROLLS) {
            const n = Math.floor((t - r.rollsAt) / REGEN_MS);
            if (n > 0) {
                r.rolls = Math.min(MAX_ROLLS, r.rolls + n);
                r.rollsAt += n * REGEN_MS;
            }
        }
        if (r.rolls >= MAX_ROLLS)
            r.rollsAt = t;
        const day = dayOf(t);
        if (r.day !== day) {
            r.day = day;
            r.daily = {};
            r.claimed = [];
        }
    }
    rec(id, name) {
        let r = this.d.players[id];
        if (!r)
            r = this.d.players[id] = this.fresh(name || 'لاعب');
        if (name)
            r.name = name;
        this.tickRec(r);
        return r;
    }
    has(id) { return !!this.d.players[id]; }
    /** عرض اللاعب نفسه فقط */
    view(id, name) {
        // أول دخول داخل الالتزام: فشل الحفظ يرجّع حتى إنشاء السجل، والتحميل التالي يعيد المحاولة.
        const r = this.has(id) ? this.rec(id, name) : this.commit(() => this.rec(id, name));
        const th = THEMES[(r.level - 1) % THEMES.length];
        return {
            ok: true, board: BOARD, coins: r.coins, rolls: r.rolls, maxRolls: MAX_ROLLS, nextRollAt: r.rolls >= MAX_ROLLS ? null : r.rollsAt + REGEN_MS, serverNow: this.now(),
            pos: r.pos, level: r.level, theme: th.name, shields: r.shields, maxShields: MAX_SHIELDS, tut: r.tut,
            marks: th.marks.map((n, i) => ({ name: n, stars: r.marks[i], cost: r.marks[i] < STARS ? markCost(r.level, i, r.marks[i]) : null })),
            missions: MISSIONS.map((m) => ({ id: m.id, label: m.label, goal: m.goal, value: Math.min(m.goal, r.daily[m.stat] ?? 0), done: (r.daily[m.stat] ?? 0) >= m.goal, claimed: r.claimed.includes(m.id), reward: m.reward })),
            log: r.log.slice().reverse(), unseen: r.log.filter((l) => l.ts > r.seen && (l.kind === 'raided' || l.kind === 'blocked')).length, stats: r.stats,
        };
    }
    /** ضغطة «ارمِ»: مفتاح الطلب يمنع الرمية المكررة لو انعاد الإرسال */
    roll(id, name, mult, key) {
        if (!MULTS.includes(mult))
            throw new CityError('المضاعف غير صالح.');
        if (typeof key !== 'string' || key.length < 6 || key.length > 80)
            throw new CityError('طلب غير صالح.');
        const r0 = this.rec(id, name);
        const dupe = r0.keys.find((k) => k.k === key);
        if (dupe)
            return { ...dupe.res, dup: true };
        if (r0.rolls < mult)
            throw new CityError(mult > 1 ? `المضاعف ×${mult} يحتاج ${mult} رميات.` : 'خلصت رمياتك. تتجدد رمية كل 8 دقائق.');
        return this.commit(() => {
            const r = this.d.players[id];
            const d1 = 1 + Math.floor(this.rng() * 6), d2 = 1 + Math.floor(this.rng() * 6);
            const steps = d1 + d2;
            const from = r.pos;
            const path = [];
            for (let i = 1; i <= steps; i++)
                path.push((from + i) % BOARD.length);
            const to = path[path.length - 1];
            const passedStart = from + steps >= BOARD.length;
            r.rolls -= mult; // لو كان ممتلئ، rollsAt = الآن (من tickRec) فيبدأ التجدد من لحظة النزول تحت الحد
            r.pos = to;
            r.stats.rolls += 1;
            r.daily.rolls = (r.daily.rolls ?? 0) + 1;
            r.at = this.now();
            const L = r.level;
            let coins = 0, rolls = 0, shields = 0, text = '';
            let raid;
            let event;
            if (passedStart && to !== 0) {
                coins += 200 * L * mult;
                text = `عديت البداية +${200 * L * mult}. `;
            }
            const tile = BOARD[to];
            switch (tile) {
                case 'start':
                    coins += 400 * L * mult;
                    text += `وقفت على البداية +${400 * L * mult}`;
                    break;
                case 'prop': {
                    const big = to % 4 === 1;
                    const v = (big ? 120 : 60) * L * mult;
                    coins += v;
                    text += `دخل من أملاكك +${v}`;
                    break;
                }
                case 'bonus': {
                    const v = (100 + Math.floor(this.rng() * 4) * 100) * L * mult;
                    coins += v;
                    r.stats.bonus++;
                    r.daily.bonus = (r.daily.bonus ?? 0) + 1;
                    text += `كنز! +${v}`;
                    break;
                }
                case 'shield':
                    if (r.shields < MAX_SHIELDS) {
                        shields = 1;
                        text += 'حصلت درع 🛡️';
                    }
                    else {
                        coins += 100 * L * mult;
                        text += `دروعك كاملة، بدالها +${100 * L * mult}`;
                    }
                    break;
                case 'tax': {
                    const v = Math.min(Math.floor(r.coins * 0.05), 1000 * L);
                    coins -= v;
                    text += `ضريبة البلدية −${v}`;
                    break;
                }
                case 'event': {
                    const e = EVENTS[Math.floor(this.rng() * EVENTS.length)];
                    event = e.id;
                    if ('coins' in e) {
                        coins += e.coins * L * mult;
                        text += `${e.text} +${e.coins * L * mult}`;
                    }
                    else if ('lose' in e) {
                        const v = Math.floor(r.coins * e.lose);
                        coins -= v;
                        text += `${e.text} −${v}`;
                    }
                    else {
                        rolls += e.rolls;
                        text += `${e.text} +${e.rolls} رميات`;
                    }
                    break;
                }
                case 'raid':
                    raid = this.raid(id, r, mult);
                    coins += raid.blocked ? 100 * L : raid.loot;
                    r.stats.raids++;
                    r.daily.raids = (r.daily.raids ?? 0) + 1;
                    text += raid.blocked ? `غارة على ${raid.target}: صدّها درع! تعويض +${100 * L}` : `غارة على ${raid.target}${raid.bot ? ' (مدينة تدريب)' : ''}: +${raid.loot}`;
                    break;
            }
            // حد 50 للتجدد فقط؛ الرمية ما تصادر مكافآت المهمة/المستوى اللي انمنحت قبلها.
            r.coins = Math.max(0, r.coins + coins);
            r.rolls += rolls;
            r.shields = Math.min(MAX_SHIELDS, r.shields + shields);
            const res = { dice: [d1, d2], mult, from, to, path, tile, passedStart, coins, rolls, shields, text: text.trim(), ...(raid && { raid }), ...(event && { event }) };
            r.keys.push({ k: key, at: this.now(), res });
            if (r.keys.length > KEYS_CAP)
                r.keys.splice(0, r.keys.length - KEYS_CAP);
            return { ...res, dup: false };
        });
    }
    /**
     * الغارة: الهدف مدينة لاعب حقيقي (نشِط آخر 30 يوم وعنده 1000+) عشوائية من أغنى 5، وإلا «مدينة تدريب» للكمبيوتر.
     * الدرع يصد الغارة ويختفي. الغنيمة = أقل من: 20%×المضاعف من ذهب الهدف، نصف ذهبه، و1500×مستوى المهاجم×المضاعف.
     */
    raid(id, r, mult) {
        const t = this.now();
        const pool = Object.entries(this.d.players).filter(([pid, p]) => pid !== id && p.coins >= 1000 && t - p.at < 30 * 86400_000).sort((a, b) => b[1].coins - a[1].coins).slice(0, 5);
        if (!pool.length) {
            const tc = 3000 * r.level;
            const loot = Math.min(Math.floor(tc * 0.2 * mult), Math.floor(tc / 2), 1500 * r.level * mult);
            return { target: 'مدينة الكمبيوتر', bot: true, loot, blocked: false };
        }
        const tr = pool[Math.floor(this.rng() * pool.length)][1];
        if (tr.shields > 0) {
            tr.shields--;
            tr.log.push({ ts: t, kind: 'blocked', text: `درعك صدّ غارة ${r.name}` });
            if (tr.log.length > LOG_CAP)
                tr.log.splice(0, tr.log.length - LOG_CAP);
            return { target: tr.name, bot: false, loot: 0, blocked: true };
        }
        const loot = Math.min(Math.floor(tr.coins * 0.2 * mult), Math.floor(tr.coins / 2), 1500 * r.level * mult);
        tr.coins -= loot;
        tr.stats.raided++;
        tr.log.push({ ts: t, kind: 'raided', text: `${r.name} أغار على مدينتك`, coins: -loot });
        if (tr.log.length > LOG_CAP)
            tr.log.splice(0, tr.log.length - LOG_CAP);
        r.log.push({ ts: t, kind: 'raid', text: `أغرت على ${tr.name}`, coins: loot });
        if (r.log.length > LOG_CAP)
            r.log.splice(0, r.log.length - LOG_CAP);
        return { target: tr.name, bot: false, loot, blocked: false };
    }
    /** ترقية نجمة بمعلم؛ لو اكتملت المعالم الخمسة كلها (4 نجوم) تنتقل المدينة للمستوى التالي */
    upgrade(id, name, i) {
        if (!Number.isInteger(i) || i < 0 || i > 4)
            throw new CityError('معلم غير صالح.');
        const r0 = this.rec(id, name);
        if (r0.marks[i] >= STARS)
            throw new CityError('هذا المعلم مكتمل.');
        const cost = markCost(r0.level, i, r0.marks[i]);
        if (r0.coins < cost)
            throw new CityError(`تحتاج ${cost.toLocaleString('en-US')} ذهب للترقية.`);
        return this.commit(() => {
            const r = this.d.players[id];
            r.coins -= cost;
            r.marks[i]++;
            r.stats.upgrades++;
            r.daily.upgrades = (r.daily.upgrades ?? 0) + 1;
            let levelUp = false;
            if (r.marks.every((s) => s >= STARS)) {
                levelUp = true;
                r.level++;
                r.marks = [0, 0, 0, 0, 0];
                r.rolls += 20;
                r.coins += 1000 * r.level;
                r.log.push({ ts: this.now(), kind: 'level', text: `مدينتك وصلت المستوى ${r.level}!` });
                if (r.log.length > LOG_CAP)
                    r.log.splice(0, r.log.length - LOG_CAP);
            }
            return { cost, levelUp };
        });
    }
    claim(id, name, mid) {
        const m = MISSIONS.find((x) => x.id === mid);
        if (!m)
            throw new CityError('مهمة غير موجودة.');
        const r0 = this.rec(id, name);
        if (r0.claimed.includes(m.id))
            throw new CityError('استلمت هذي المكافأة اليوم.');
        if ((r0.daily[m.stat] ?? 0) < m.goal)
            throw new CityError('ما خلّصت المهمة بعد.');
        return this.commit(() => {
            const r = this.d.players[id];
            r.claimed.push(m.id);
            r.rolls += m.reward.rolls ?? 0;
            r.coins += (m.reward.coins ?? 0) * r.level;
            r.shields = Math.min(MAX_SHIELDS, r.shields + (m.reward.shields ?? 0));
            return m.reward;
        });
    }
    tutorialDone(id, name) { this.rec(id, name); return this.commit(() => { this.d.players[id].tut = true; return true; }); }
    seenLog(id, name) { this.rec(id, name); return this.commit(() => { this.d.players[id].seen = this.now(); return true; }); }
}
