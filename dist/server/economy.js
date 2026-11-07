import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
/** أحجام الباقات المطلوبة فقط؛ لا تحدد أي سعر نقدي أو معدل تحويل. */
export const COIN_PACK_AMOUNTS = [1000, 5000, 15000, 50000, 100000, 250000, 1000000, 5000000];
export const GEM_PACK_AMOUNTS = [100, 1000, 10000, 50000, 100000, 250000, 500000, 1000000, 2000000, 5000000];
const packIds = new Set([
    ...COIN_PACK_AMOUNTS.map((amount) => `coins-${amount}`),
    ...GEM_PACK_AMOUNTS.map((amount) => `gems-${amount}`),
]);
const positive = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
/** Historical rate, retained only to validate existing v1 policy files. */
export const APPROVED_COINS_PER_GEM = 20;
export const MANUAL_CONVERSION_DISABLED = 'conversion_disabled';
export const MANUAL_CONVERSION_CLOSED_MESSAGE = 'التحويل اليدوي بين العملات والجواهر مقفول بالاتجاهين. ما تم خصم أو إضافة أي رصيد.';
const validRate = (v) => v === null || v === APPROVED_COINS_PER_GEM;
const validPrice = (v) => v === null || (isObj(v) && Object.keys(v).every((k) => k === 'minorUnits' || k === 'currency')
    && positive(v.minorUnits) && typeof v.currency === 'string' && /^[A-Z]{3}$/.test(v.currency));
const validPrices = (v) => isObj(v) && Object.entries(v).every(([id, price]) => packIds.has(id) && validPrice(price));
/** ملف v1 مضبوط صراحةً؛ السعر المفقود أو null لا يُستنتج من أي باقة أخرى. */
export const validEconomy = (d) => isObj(d)
    && Object.keys(d).every((k) => ['v', 'gemsToCoinsRate', 'coinToGemsEnabled', 'packPrices'].includes(k))
    && d.v === 1 && validRate(d.gemsToCoinsRate) && typeof d.coinToGemsEnabled === 'boolean'
    && (d.packPrices === undefined || validPrices(d.packPrices));
export class EconomyInputError extends Error {
    constructor(message = 'سياسة الاقتصاد غير صالحة.') { super(message); this.name = 'EconomyInputError'; }
}
/** سياسة فقط وليست بوابة دفع أو جهة إصدار رصيد. ملف مستقل مثل economy.json داخل جذر بيانات الخدمة. */
export class Economy {
    d = { v: 1, gemsToCoinsRate: null, coinToGemsEnabled: false, packPrices: {} };
    disk;
    persistent;
    constructor(file = '', now = Date.now, mon = new StorageMonitor()) {
        this.persistent = !!file;
        if (file) {
            const loaded = loadJsonFile(file, validEconomy);
            if (loaded)
                this.d = loaded;
        }
        this.disk = new Persister('economy', file, () => this.d, now, mon);
    }
    // Closing conversions is code policy, not a switch in a persisted file or environment.
    get exchangeRate() { return null; }
    get allowLegacyGemPacks() { return false; }
    view() {
        const packs = (cur, amounts) => amounts.map((amount) => {
            const id = `${cur}-${amount}`;
            const price = this.d.packPrices?.[id];
            return { id, amount, cur, priceMinor: price?.minorUnits ?? null, moneyCurrency: price?.currency ?? null, available: false };
        });
        return {
            coinPacks: packs('coins', COIN_PACK_AMOUNTS), gemPacks: packs('gems', GEM_PACK_AMOUNTS),
            conversion: { enabled: false, coinsPerGem: null },
            legacyGemPacksEnabled: false, paymentConfigured: false,
        };
    }
    /** للمالك الموثوق فقط: المستدعي يتحقق من التفويض. packPrices استبدال كامل للخريطة، لا merge خفي. */
    update(patch) {
        if (!isObj(patch) || !Object.keys(patch).every((k) => ['gemsToCoinsRate', 'coinToGemsEnabled', 'packPrices'].includes(k)))
            throw new EconomyInputError();
        if ((Object.hasOwn(patch, 'gemsToCoinsRate') && patch.gemsToCoinsRate !== null)
            || (Object.hasOwn(patch, 'coinToGemsEnabled') && patch.coinToGemsEnabled !== false)) {
            throw new EconomyInputError(MANUAL_CONVERSION_CLOSED_MESSAGE);
        }
        const next = { ...this.d, ...structuredClone(patch) };
        if (!validEconomy(next))
            throw new EconomyInputError();
        const before = this.d;
        this.d = next;
        try {
            this.disk.mustSave();
        }
        catch (e) {
            this.d = before;
            throw e;
        }
        return this.view();
    }
    retry() { this.disk.retry(); }
    unsaved() { return this.disk.unsaved; }
}
