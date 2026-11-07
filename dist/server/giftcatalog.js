import { loadJsonFile, Persister, StorageMonitor, optObj } from './datafile.js';
import { GIFTS as LEGACY } from './gifts.js';
/** الأقسام (الأربعة الأخيرة بالواجهة «افتراضية»: الكل، الأكثر شعبية من الإرسال الفعلي، الأحدث، النادرة) */
export const GIFT_CATS = [
    { id: 'normal', name: 'الهدايا العادية', icon: '🎁', base: 0, fx: 'pop' },
    { id: 'flowers', name: 'الورود والزهور', icon: '🌹', base: 1, fx: 'petals' },
    { id: 'love', name: 'الحب والقلوب', icon: '💖', base: 1, fx: 'hearts' },
    { id: 'kids', name: 'عالم الأطفال', icon: '🧸', base: 0, fx: 'bounce' },
    { id: 'animals', name: 'الحيوانات اللطيفة', icon: '🐼', base: 1, fx: 'bounce' },
    { id: 'party', name: 'أعياد الميلاد والمناسبات', icon: '🎂', base: 2, fx: 'balloons' },
    { id: 'seasonal', name: 'الموسمية', icon: '🌙', base: 2, fx: 'lanterns' },
    { id: 'fireworks', name: 'الاحتفالات والألعاب النارية', icon: '🎆', base: 3, fx: 'fireworks' },
    { id: 'magic', name: 'السحر والطاقة', icon: '✨', base: 4, fx: 'swirl' },
    { id: 'space', name: 'الفضاء والمجرات', icon: '🪐', base: 5, fx: 'galaxy' },
    { id: 'cars', name: 'السيارات والمركبات', icon: '🏎️', base: 5, fx: 'drive' },
    { id: 'sky', name: 'الطائرات واليخوت', icon: '✈️', base: 6, fx: 'fly' },
    { id: 'luxury', name: 'الهدايا الفاخرة', icon: '💎', base: 6, fx: 'shine' },
    { id: 'palaces', name: 'القصور والعروش', icon: '🏰', base: 7, fx: 'royal' },
    { id: 'dragons', name: 'التنانين والأساطير', icon: '🐉', base: 7, fx: 'dragon' },
    { id: 'legendary', name: 'الهدايا الأسطورية', icon: '🔱', base: 8, fx: 'legend' },
];
export const VIRTUAL_CATS = [{ id: 'all', name: 'جميع الهدايا', icon: '🎁' }, { id: 'popular', name: 'الأكثر شعبية', icon: '🔥' }, { id: 'newest', name: 'أحدث الهدايا', icon: '🆕' }, { id: 'rare', name: 'الهدايا النادرة', icon: '🌟' }];
export const RARITY = ['عادي', 'مميز', 'نادر', 'ملحمي', 'أسطوري', 'فخم جداً'];
const MOTIFS = {
    normal: [['star', 'نجمة', 'f', 'نجوم'], ['candy', 'حلوى', 'f', 'حلويات'], ['cupcake', 'كب كيك', 'm', 'كب كيك'], ['donut', 'دونات', 'f', 'دونات'], ['icecream', 'آيس كريم', 'm', 'آيس كريمات'], ['lollipop', 'مصاصة', 'f', 'مصاصات'], ['cookie', 'كعكة', 'f', 'كعكات'], ['juice', 'عصير', 'm', 'عصائر']],
    flowers: [['rose', 'وردة', 'f', 'ورود'], ['tulip', 'توليب', 'm', 'توليب'], ['sunflower', 'دوّار شمس', 'm', 'دوّار شمس'], ['lily', 'زنبقة', 'f', 'زنابق'], ['daisy', 'أقحوانة', 'f', 'أقحوان'], ['lotus', 'لوتس', 'f', 'لوتس'], ['blossom', 'زهرة كرز', 'f', 'أزهار كرز'], ['jasmine', 'ياسمينة', 'f', 'ياسمين']],
    love: [['heart', 'قلب', 'm', 'قلوب'], ['loveletter', 'رسالة حب', 'f', 'رسائل حب'], ['ring', 'خاتم', 'm', 'خواتم'], ['cupid', 'سهم الحب', 'm', 'سهام الحب'], ['lovebox', 'صندوق الحب', 'm', 'صناديق الحب'], ['lock', 'قفل الحب', 'm', 'أقفال الحب'], ['kiss', 'شفايف', 'f', 'شفايف'], ['doves', 'حمامة', 'f', 'حمام']],
    kids: [['teddy', 'دبدوب', 'm', 'دباديب'], ['kite', 'طيارة ورق', 'f', 'طيارات ورق'], ['blocks', 'مكعبات', 'f', 'مكعبات'], ['duck', 'بطة', 'f', 'بط'], ['ball', 'كورة', 'f', 'كور'], ['train', 'قطار ألعاب', 'm', 'قطارات ألعاب'], ['robot', 'روبوت', 'm', 'روبوتات'], ['rainbow', 'قوس قزح', 'm', 'أقواس قزح']],
    animals: [['panda', 'باندا', 'f', 'باندات'], ['cat', 'قطوة', 'f', 'قطاوة'], ['bunny', 'أرنب', 'm', 'أرانب'], ['fox', 'ثعلب', 'm', 'ثعالب'], ['owl', 'بومة', 'f', 'بوم'], ['penguin', 'بطريق', 'm', 'بطاريق'], ['falcon', 'صقر', 'm', 'صقور'], ['camel', 'جمل', 'm', 'جمال']],
    party: [['cake', 'كيكة', 'f', 'كيكات'], ['balloon', 'بالون', 'm', 'بالونات'], ['present', 'هدية مغلفة', 'f', 'هدايا مغلفة'], ['partyhat', 'قبعة حفلة', 'f', 'قبعات حفلة'], ['confetti', 'قصاصات', 'f', 'قصاصات'], ['candle', 'شمعة', 'f', 'شموع'], ['trophy', 'كأس', 'm', 'كؤوس'], ['medal', 'ميدالية', 'f', 'ميداليات']],
    seasonal: [['lantern', 'فانوس', 'm', 'فوانيس'], ['crescent', 'هلال', 'm', 'أهلّة'], ['dates', 'تمر', 'm', 'تمور'], ['snowman', 'رجل ثلج', 'm', 'رجال ثلج'], ['pumpkin', 'يقطينة', 'f', 'يقاطين'], ['flag', 'راية وطنية', 'f', 'رايات'], ['palm', 'نخلة', 'f', 'نخيل'], ['coffeepot', 'دلة', 'f', 'دلال']],
    fireworks: [['rocketfw', 'صاروخ ألعاب', 'm', 'صواريخ ألعاب'], ['burst', 'انفجار ناري', 'm', 'انفجارات نارية'], ['sparkler', 'شعلة نارية', 'f', 'شعلات نارية'], ['fountain', 'نافورة نارية', 'f', 'نوافير نارية'], ['popper', 'مفرقعة', 'f', 'مفرقعات'], ['wheel', 'دولاب ناري', 'm', 'دواليب نارية'], ['comet', 'مذنّب', 'm', 'مذنّبات'], ['starshell', 'نجمة نارية', 'f', 'نجوم نارية']],
    magic: [['wand', 'عصا سحرية', 'f', 'عصي سحرية'], ['potion', 'جرعة سحرية', 'f', 'جرعات سحرية'], ['crystalball', 'كرة بلورية', 'f', 'كرات بلورية'], ['spellbook', 'كتاب تعاويذ', 'm', 'كتب تعاويذ'], ['lightning', 'صاعقة', 'f', 'صواعق'], ['rune', 'رمز سحري', 'm', 'رموز سحرية'], ['orb', 'كرة طاقة', 'f', 'كرات طاقة'], ['phoenixfeather', 'ريشة العنقاء', 'f', 'ريش العنقاء']],
    space: [['planet', 'كوكب', 'm', 'كواكب'], ['rocket', 'صاروخ فضائي', 'm', 'صواريخ فضائية'], ['ufo', 'مركبة فضائية', 'f', 'مركبات فضائية'], ['astronaut', 'رائد فضاء', 'm', 'رواد فضاء'], ['moon', 'قمر', 'm', 'أقمار'], ['galaxy', 'مجرة', 'f', 'مجرات'], ['satellite', 'قمر صناعي', 'm', 'أقمار صناعية'], ['blackhole', 'ثقب أسود', 'm', 'ثقوب سوداء']],
    cars: [['sportscar', 'سيارة رياضية', 'f', 'سيارات رياضية'], ['suv', 'جيب', 'm', 'جيبات'], ['classic', 'سيارة كلاسيكية', 'f', 'سيارات كلاسيكية'], ['motorbike', 'دراجة نارية', 'f', 'دراجات نارية'], ['limo', 'ليموزين', 'f', 'ليموزينات'], ['racecar', 'سيارة سباق', 'f', 'سيارات سباق'], ['truck', 'شاحنة', 'f', 'شاحنات'], ['bus', 'باص', 'm', 'باصات']],
    sky: [['jet', 'طائرة خاصة', 'f', 'طائرات خاصة'], ['helicopter', 'هليكوبتر', 'f', 'هليكوبترات'], ['yacht', 'يخت', 'm', 'يخوت'], ['airballoon', 'منطاد', 'm', 'مناطيد'], ['seaplane', 'طائرة مائية', 'f', 'طائرات مائية'], ['sailboat', 'قارب شراعي', 'm', 'قوارب شراعية'], ['airship', 'سفينة هوائية', 'f', 'سفن هوائية'], ['speedboat', 'قارب سريع', 'm', 'قوارب سريعة']],
    luxury: [['diamond', 'ماسة', 'f', 'ماسات'], ['goldbar', 'سبيكة ذهب', 'f', 'سبائك ذهب'], ['watch', 'ساعة فاخرة', 'f', 'ساعات فاخرة'], ['perfume', 'عطر فاخر', 'm', 'عطور فاخرة'], ['handbag', 'حقيبة فاخرة', 'f', 'حقائب فاخرة'], ['necklace', 'عقد لؤلؤ', 'm', 'عقود لؤلؤ'], ['chest', 'صندوق كنز', 'm', 'صناديق كنز'], ['scepter', 'صولجان', 'm', 'صولجانات']],
    palaces: [['castle', 'قلعة', 'f', 'قلاع'], ['throne', 'عرش', 'm', 'عروش'], ['crown', 'تاج', 'm', 'تيجان'], ['palace', 'قصر', 'm', 'قصور'], ['tower', 'برج ملكي', 'm', 'أبراج ملكية'], ['gate', 'بوابة ملكية', 'f', 'بوابات ملكية'], ['dome', 'قبة ذهبية', 'f', 'قباب ذهبية'], ['fountainroyal', 'نافورة القصر', 'f', 'نوافير القصر']],
    dragons: [['dragon', 'تنين', 'm', 'تنانين'], ['phoenix', 'عنقاء', 'f', 'عنقاوات'], ['griffin', 'غريفين', 'm', 'غريفينات'], ['unicorn', 'حصان وحيد القرن', 'm', 'أحصنة وحيدة القرن'], ['serpent', 'أفعى البحر', 'f', 'أفاعي البحر'], ['dragonegg', 'بيضة التنين', 'f', 'بيض التنين'], ['pegasus', 'حصان مجنّح', 'm', 'أحصنة مجنّحة'], ['kraken', 'وحش البحر', 'm', 'وحوش البحر']],
    legendary: [['sword', 'سيف الأساطير', 'm', 'سيوف الأساطير'], ['shield', 'درع الأساطير', 'm', 'دروع الأساطير'], ['grail', 'كأس الأساطير', 'm', 'كؤوس الأساطير'], ['lamp', 'المصباح السحري', 'm', 'مصابيح سحرية'], ['eye', 'عين الحكمة', 'f', 'عيون الحكمة'], ['star7', 'النجمة السباعية', 'f', 'نجوم سباعية'], ['horn', 'قرن الأسطورة', 'm', 'قرون الأسطورة'], ['sun', 'شمس الخلود', 'f', 'شموس الخلود']],
};
/** التركيبات التاريخية الثمانية: تبقى بياناتها ومعرفاتها، لكن غير الأساسية ليست منتجات نشطة. */
const VARIANTS = [
    { key: 'base', m: (n) => n, f: (n) => n, step: 0 },
    { key: 'sparkle', m: (n) => n + ' لامع', f: (n) => n + ' لامعة', step: 1 },
    { key: 'trio', m: (n) => n, f: (n) => n, step: 2 }, // الاسم: «مجموعة + الجمع»
    { key: 'box', m: (n) => n + ' في صندوق', f: (n) => n + ' في صندوق', step: 3 },
    { key: 'crown', m: (n) => n + ' متوّج', f: (n) => n + ' متوّجة', step: 4 },
    { key: 'wings', m: (n) => n + ' مجنّح', f: (n) => n + ' مجنّحة', step: 5 },
    { key: 'halo', m: (n) => n + ' بهالة ذهبية', f: (n) => n + ' بهالة ذهبية', step: 7 },
    { key: 'royal', m: (n) => n + ' إمبراطوري', f: (n) => n + ' إمبراطورية', step: 9 },
];
/** سلّم الأسعار (كلها زوجية) */
export const PRICE_LADDER = [10, 20, 50, 100, 200, 300, 500, 800, 1_000, 1_500, 2_000, 3_000, 5_000, 8_000, 10_000, 15_000, 20_000, 30_000, 50_000, 80_000, 100_000, 150_000, 200_000, 300_000, 500_000];
export const rarityOf = (price) => (price < 100 ? 0 : price < 1_000 ? 1 : price < 5_000 ? 2 : price < 20_000 ? 3 : price < 100_000 ? 4 : 5);
/** أقسام الهدايا القديمة المعتمدة (14) — تبقى بأسعارها ومعرّفاتها */
const LEGACY_CAT = { rose: 'flowers', heart: 'love', coffee: 'normal', chocolate: 'normal', teddy: 'kids', balloons: 'party', bouquet: 'flowers', crown: 'palaces', diamond: 'luxury', butterfly: 'animals', car: 'cars', palace: 'palaces', dragon: 'dragons', rocket: 'space' };
/** مواضيع جديدة تشارك GLB مع هدية قديمة: المعرف القديم وحده معتمد، حتى لو تعطّله الإدارة. */
const LEGACY_SUBJECT_ID = Object.freeze({
    rose: 'rose', heart: 'heart', teddy: 'teddy', diamond: 'diamond', crown: 'crown',
    palace: 'palace', dragon: 'dragon', rocket: 'rocket', sportscar: 'car',
});
const shopEligible = (g) => g.motif.startsWith('legacy:') || (g.variant === 0 && !Object.hasOwn(LEGACY_SUBJECT_ID, g.motif));
/** أسماء بديلة للرسمات الجديدة اللي تشارك اسم هدية قديمة معتمدة */
const ALT_NAME = { 'وردة': 'وردة جورية', 'قلب': 'قلب نابض', 'دبدوب': 'دبدوب محشي', 'صاروخ فضائي': 'صاروخ المجرة', 'ماسة': 'ماسة زرقاء', 'تاج': 'تاج الملوك' };
function build() {
    const out = LEGACY.map((g) => ({ id: g.id, name: g.name, cat: LEGACY_CAT[g.id], price: g.price, rarity: rarityOf(g.price), motif: 'legacy:' + g.id, variant: 0, fx: GIFT_CATS.find((c) => c.id === LEGACY_CAT[g.id]).fx, added: 1, icon: g.icon }));
    const names = new Set(out.map((g) => g.name));
    for (const c of GIFT_CATS) {
        MOTIFS[c.id].forEach(([mid, name, gender, plural], mi) => {
            VARIANTS.forEach((v, vi) => {
                const idx = Math.min(PRICE_LADDER.length - 1, c.base * 2 + Math.floor(mi / 2) + v.step);
                const price = PRICE_LADDER[idx];
                let nm = v.key === 'trio' ? 'مجموعة ' + plural : (gender === 'm' ? v.m : v.f)(name);
                if (names.has(nm))
                    nm = ALT_NAME[nm] ?? nm + ' الجديدة'; // ما نكرر اسم هدية قديمة
                names.add(nm);
                out.push({ id: `${c.id}-${mid}-${v.key}`, name: nm, cat: c.id, price, rarity: rarityOf(price), motif: mid, variant: vi, fx: c.fx, added: 2, icon: c.icon });
            });
        });
    }
    return out;
}
export const validGiftOverrides = (d) => optObj(d.disabled) && optObj(d.price);
export class GiftCatalog {
    base = build();
    byId = new Map(this.base.map((g) => [g.id, g]));
    o = { v: 1, disabled: {}, price: {} };
    disk;
    constructor(file = '', now = Date.now, mon = new StorageMonitor()) {
        if (file) {
            const l = loadJsonFile(file, validGiftOverrides);
            if (l) {
                const x = l;
                this.o = { v: 1, disabled: x.disabled ?? {}, price: x.price ?? {} };
            }
        }
        this.disk = new Persister('gifts', file, () => this.o, now, mon);
    }
    view(g) {
        const price = this.o.price[g.id] ?? g.price;
        return { ...g, price, rarity: rarityOf(price), active: shopEligible(g) && !this.o.disabled[g.id] };
    }
    get(id) { const g = typeof id === 'string' ? this.byId.get(id) : undefined; return g ? this.view(g) : undefined; }
    all() { return this.base.map((g) => this.view(g)); }
    active() { return this.all().filter((g) => g.active); }
    count() { return this.base.length; }
    /** نفس الحفظ والتراجع؛ تفعيل نسخة متقاعدة يُتجاهل وafter.active تبقى false، وتعديل سعرها يظل محفوظاً. */
    set(id, ch) {
        const g = this.byId.get(id);
        if (!g)
            return null;
        const before = this.view(g);
        const prev = structuredClone(this.o);
        if (ch.active !== undefined && (!ch.active || shopEligible(g))) {
            if (ch.active)
                delete this.o.disabled[id];
            else
                this.o.disabled[id] = true;
        }
        if (ch.price !== undefined)
            this.o.price[id] = ch.price;
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.o = prev;
            throw e;
        }
        return { before, after: this.view(g) };
    }
    retry() { this.disk.retry(); }
}
