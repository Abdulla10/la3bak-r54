import { loadJsonFile, Persister, StorageMonitor, optObj, isObj } from './datafile.js';
import { CATALOG, SLOTS, type ShopItem, type Slot } from './catalog.js';
import { PRICE_MAX, SHOP_PRICE_MAX, type Cur } from './wallet.js';
import { achOf } from './achievements.js';
import { frameGemsOnly } from './luxury-pricing-r23.js';
export { PRICE_MAX, SHOP_PRICE_MAX };

/** حالات البيع فقط؛ لا تحذف الملكية ولا تمنع تجهيز المالك بسبب حالة البيع. */
export const SHOP_STATUSES = ['available', 'unavailable', 'coming-soon', 'hidden'] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];
export interface ShopRequirements { minLevel?: number; minVip?: number; minNoble?: number }
/** رتب فعلية من الخادم، لا نقاط XP/VIP/NOBLE ولا قيم مرسلة من المتصفح. صفر = بلا رتبة. */
export interface ShopRanks { level: number; vip: number; noble: number }
export interface ShopEligibility { eligible: boolean; missing: ('level' | 'vip' | 'noble')[] }
const safeRank = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const validStatus = (v: unknown): v is ShopStatus => typeof v === 'string' && SHOP_STATUSES.includes(v as ShopStatus);
/** legacy active=false يبقى غير متاح؛ status الصريح هو المصدر وactive مرآته للتوافق. */
export const shopStatus = (item: { status?: ShopStatus; active?: boolean }): ShopStatus => item.status ?? (item.active === false ? 'unavailable' : 'available');
export const shopVisible = (item: { status?: ShopStatus; active?: boolean; id: string }, owned: ReadonlySet<string>): boolean => shopStatus(item) !== 'hidden' || owned.has(item.id);
/** استحقاق شراء/تجهيز، مستقل عن حالة البيع والملكية؛ المنادي يتحقق من كل منهما. */
export function shopEligibility(item: ShopRequirements, ranks: ShopRanks): ShopEligibility {
  const missing: ShopEligibility['missing'] = [];
  for (const [requirement, rank] of [['minLevel', 'level'], ['minVip', 'vip'], ['minNoble', 'noble']] as const) {
    const min = item[requirement];
    if (min !== undefined && (!safeRank(min) || (min > 0 && (!safeRank(ranks?.[rank]) || ranks[rank] < min)))) missing.push(rank);
  }
  return { eligible: missing.length === 0, missing };
}

/**
 * طبقة المتجر القابلة للإدارة فوق البذرة الثابتة، دون تغيير أسعار أو أصول قائمة.
 * الحالة توقف البيع فقط؛ مخفي لا يعرض إلا للمالك. السعر الجديد يخص الطلب الجديد فقط.
 * كل تغيير يحفظ عبر Persister أو يتراجع كاملاً؛ المعرّف والخانة لا يتغيران.
 */
export interface Override extends ShopRequirements { name?: string; icon?: string; desc?: string; price?: number; currency?: Cur; active?: boolean; status?: ShopStatus; at: number; by: string }
export interface CustomItem extends ShopItem, ShopRequirements { active: boolean; status?: ShopStatus; at: number; by: string }
export interface EffItem extends ShopItem, ShopRequirements { active: boolean; status: ShopStatus; custom: boolean; baseId: boolean; defaults?: { price: number; currency: Cur } }
interface SData { v: 1; overrides: Record<string, Override>; custom: Record<string, CustomItem> }

/** Read-only enforcement: never rewrite historical admin files or wallet receipts on load.
 * Legacy oversized/invalid frames fail closed instead of clamping their numeric price. */
function effectiveFrameItem(item: EffItem): EffItem {
  const result = frameGemsOnly(item);
  if (item.slot === 'frame' && item.status === 'available' && (
    !['coins', 'gems'].includes(item.currency) || !Number.isSafeInteger(item.price)
    || item.price < 0 || item.price > SHOP_PRICE_MAX.gems
  )) return { ...result, status: 'unavailable', active: false };
  return result;
}

/** الحقول الجديدة اختيارية للملفات القديمة، والموجود منها يجب أن يكون صالحاً بلا تطبيع صامت. */
const validState = (v: unknown) => isObj(v)
  && (v.active === undefined || typeof v.active === 'boolean')
  && (v.status === undefined || validStatus(v.status))
  && (v.status === undefined || v.active === undefined || v.active === (v.status === 'available'))
  && ['minLevel', 'minVip', 'minNoble'].every((k) => v[k] === undefined || safeRank(v[k]));
export const validShop = (d: Record<string, unknown>) => optObj(d.overrides) && optObj(d.custom)
  && [d.overrides, d.custom].every((entries) => entries === undefined || Object.values(entries as Record<string, unknown>).every(validState));
export const CUSTOM_CAP = 300;
const ID_RE = /^[a-z][a-z0-9-]{2,31}$/;
const CTRL = /[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩<>]/g;
const txt = (s: unknown, max: number) => String(s ?? '').replace(CTRL, '').replace(/\s+/g, ' ').trim().slice(0, max);
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
/** No extra persisted approval field: explicit price + currency + available status are the proof. */
const approvedProposal = (o: Override | undefined): boolean => !!o
  && own(o, 'price') && own(o, 'currency') && own(o, 'status')
  && o.status === 'available' && o.active !== false && typeof o.by === 'string' && !!o.by.trim()
  && (o.currency === 'coins' || o.currency === 'gems')
  && typeof o.price === 'number' && Number.isSafeInteger(o.price) && o.price >= 0 && o.price <= SHOP_PRICE_MAX[o.currency];

export class ShopInputError extends Error { constructor(msg: string, public code = 400) { super(msg); } }

/** أنماط الإطار/الخلفية المتاحة = اللي في الكتالوج الأساسي (لها CSS فعلي بالواجهة) */
export const PRESETS: Record<'frame' | 'bg', string[]> = {
  frame: [...new Set(CATALOG.filter((i) => i.slot === 'frame').map((i) => i.css ?? ''))],
  bg: [...new Set(CATALOG.filter((i) => i.slot === 'bg' && !i.proposalOnly).map((i) => i.css ?? ''))],
};

export class ShopCatalog {
  private d: SData = { v: 1, overrides: {}, custom: {} };
  private disk: Persister;
  readonly persistent: boolean;
  constructor(file = '', private now: () => number = Date.now, mon = new StorageMonitor()) {
    this.persistent = !!file;
    if (file) {
      const loaded = loadJsonFile(file, validShop);
      if (loaded) this.d = { v: 1, overrides: {}, custom: {}, ...(loaded as unknown as Partial<SData>) };
    }
    // Never let a persisted custom entry shadow one of the new gated stable IDs.
    for (const base of CATALOG) if ((base.proposalOnly || base.slot === 'entrance') && own(this.d.custom, base.id)) throw new ShopInputError(`Shop catalog ID collision: ${base.id}`, 409);
    this.disk = new Persister('shop', file, () => this.d, now, mon);
  }
  private commit<T>(fn: () => T): T {
    const snap = structuredClone(this.d);
    try { const r = fn(); this.disk.mustSave(); return r; } catch (e) { this.d = snap; throw e; }
  }
  retry() { this.disk.retry(); }
  unsaved() { return this.disk.unsaved; }

  private eff(base: ShopItem | undefined, c: CustomItem | undefined): EffItem | undefined {
    if (c) { const status = shopStatus(c); return effectiveFrameItem({ ...c, custom: true, baseId: false, status, active: status === 'available' }); }
    if (!base) return undefined;
    const o = this.d.overrides[base.id];
    const approved = base.proposalOnly ? approvedProposal(o) : undefined;
    // R56: مقتنيات سلّم الرتب مخفية عن البيع افتراضيًا (تظهر وتنجهّز لمالكها فقط)، إلا إذا الإدارة حددت حالة غيرها
    // R57: «جليدي» صورته الأصلية مقصوصة نصها (تطلع مثل حرف C)، فتنخفي من البيع افتراضيًا. اللي يملكها تبقى له، والإدارة تقدر ترجّعها
    // R58h: إطارات lux-f المرسومة بالكود انستبدلت بإطارات المالك؛ تنخفي من البيع (اللي يملكها تبقى له)
    // R58o: إطارات art-f الأولى انستبدلت بمجموعة المالك الجديدة art-f2؛ القديمة تنخفي من البيع وتبقى لمن يملكها
    const brokenArt = base.id === 'ref-p-frame-11' || base.id.startsWith('lux-f-') || /^art-f-\d\d$/.test(base.id);
    const requestedStatus = o?.status === undefined && o?.active === undefined && (base.rankPerk || brokenArt) ? 'hidden' : shopStatus(o ?? {});
    // Missing/partial/invalid approval can never activate a proposal, including price zero.
    const status = approved === false && (!o?.status || requestedStatus === 'available') ? 'coming-soon' : requestedStatus;
    return effectiveFrameItem({
      ...base, ...(o?.name !== undefined && { name: o.name }), ...(o?.icon !== undefined && { icon: o.icon }), ...(o?.desc !== undefined && { desc: o.desc }),
      ...(o?.price !== undefined && { price: o.price }), ...(o?.currency !== undefined && { currency: o.currency }),
      ...(o?.minLevel !== undefined && { minLevel: o.minLevel }), ...(o?.minVip !== undefined && { minVip: o.minVip }), ...(o?.minNoble !== undefined && { minNoble: o.minNoble }),
      ...(approved !== undefined && { priceApproved: approved, proposalOnly: !approved }),
      status, active: status === 'available', custom: false, baseId: true, defaults: { price: base.price, currency: base.currency },
    });
  }
  /** جميع الحالات للإدارة/الخادم. على shopView تطبيق shopVisible على items وcollectionItems. */
  all(): EffItem[] {
    const base = CATALOG.map((b) => this.eff(b, undefined)!);
    const cust = Object.values(this.d.custom).map((c) => this.eff(undefined, c)!);
    return [...base, ...cust];
  }
  get(id: unknown): EffItem | undefined {
    if (typeof id !== 'string') return undefined;
    const c = Object.prototype.hasOwnProperty.call(this.d.custom, id) ? this.d.custom[id] : undefined;
    return this.eff(CATALOG.find((b) => b.id === id), c);
  }
  overrideOf(id: string) { return this.d.overrides[id] ? { ...this.d.overrides[id] } : null; }

  // ---- التحقق (بالخادم دائماً) ----
  private fields(input: Record<string, unknown>, cur: { slot: Slot; currency: Cur }, partial: boolean) {
    const out: Partial<Omit<Override, 'at' | 'by'>> = {};
    if (!partial || 'name' in input) { const n = txt(input.name, 40); if (n.length < 2) throw new ShopInputError('الاسم من حرفين إلى 40 حرف.'); out.name = n; }
    if (!partial || 'icon' in input) { const i = txt(input.icon, 8); if (!i) throw new ShopInputError('الأيقونة مطلوبة (إيموجي واحد).'); out.icon = i; }
    if (!partial || 'desc' in input) { out.desc = txt(input.desc, 120); }
    const currency: Cur = ('currency' in input ? input.currency : cur.currency) as Cur;
    if (cur.slot === 'frame' && currency !== 'gems') throw new ShopInputError('كل الإطارات بالجواهر فقط؛ أدخل السعر بالجواهر.');
    if (!partial || 'currency' in input) { if (currency !== 'coins' && currency !== 'gems') throw new ShopInputError('العملة: coins أو gems.'); out.currency = currency; }
    if (!partial || 'price' in input) {
      const p = input.price;
      if (typeof p !== 'number' || !Number.isSafeInteger(p) || p < 0 || p > SHOP_PRICE_MAX[currency]) throw new ShopInputError(`السعر عدد صحيح من 0 إلى ${SHOP_PRICE_MAX[currency].toLocaleString('en')}.`);
      out.price = p;
    }
    if ('active' in input && typeof input.active !== 'boolean') throw new ShopInputError('التفعيل true أو false.');
    if ('status' in input && !validStatus(input.status)) throw new ShopInputError('حالة العنصر غير صالحة.');
    if ('status' in input && 'active' in input && input.active !== (input.status === 'available')) throw new ShopInputError('الحالة والتفعيل متعارضان.');
    if ('status' in input || 'active' in input) {
      out.status = 'status' in input ? input.status as ShopStatus : input.active ? 'available' : 'unavailable';
      out.active = out.status === 'available';
    }
    for (const key of ['minLevel', 'minVip', 'minNoble'] as const) {
      if (!(key in input)) continue;
      if (!safeRank(input[key])) throw new ShopInputError('حد الرتبة عدد صحيح آمن غير سالب، وصفر يعني بلا شرط.');
      out[key] = input[key];
    }
    return out;
  }
  private cssFor(slot: Slot, raw: unknown): string {
    // Entrance effects are the two fixed canonical seeds, not arbitrary custom CSS or URLs.
    if (slot === 'entrance') throw new ShopInputError('دخول السيارات متاح من العناصر الأساسية المعتمدة فقط.');
    if (slot === 'souvenir') throw new ShopInputError('التذكارات متاحة من رسومات الكتالوج المعتمدة فقط.');
    if (slot === 'frame' || slot === 'bg') {
      const c = String(raw ?? '');
      if (!PRESETS[slot].includes(c)) throw new ShopInputError('المظهر لازم يكون من القائمة المتاحة.');
      return c;
    }
    const c = txt(raw, slot === 'title' ? 24 : 8);
    if (!c) throw new ShopInputError(slot === 'title' ? 'نص اللقب مطلوب.' : 'رمز الشارة مطلوب.');
    return c;
  }

  create(input: Record<string, unknown>, by: string): EffItem {
    const id = String(input.id ?? '');
    if (!ID_RE.test(id)) throw new ShopInputError('المعرّف: حروف إنجليزية صغيرة وأرقام وشرطة (3–32)، يبدأ بحرف.');
    if (achOf(id)) throw new ShopInputError('المعرّف مخصص لإنجاز مكتسب، ولا يُستخدم لمنتج تجاري.', 409);
    if (this.get(id) || id === '__proto__') throw new ShopInputError('المعرّف مستخدم من قبل.', 409);
    const slot = input.slot as Slot;
    if (!SLOTS.includes(slot)) throw new ShopInputError('الخانة: إطار أو خلفية أو لقب أو شارة.');
    if (Object.keys(this.d.custom).length >= CUSTOM_CAP) throw new ShopInputError('وصلت الحد الأقصى للمنتجات المضافة.', 409);
    const f = this.fields(input, { slot, currency: slot === 'frame' ? 'gems' : 'coins' }, false);
    const css = this.cssFor(slot, input.css);
    return this.commit(() => {
      const item: CustomItem = { id, slot, ...f, name: f.name!, icon: f.icon!, desc: f.desc ?? '', price: f.price!, currency: f.currency!, css, permanent: true, status: f.status ?? 'available', active: f.active ?? true, at: this.now(), by };
      this.d.custom[id] = item;
      return this.get(id)!;
    });
  }

  /** تعديل: يرجع { item, before } للتدقيق، أو null لو العنصر غير موجود */
  update(id: string, input: Record<string, unknown>, by: string): { item: EffItem; before: EffItem } | null {
    const before = this.get(id); if (!before) return null;
    if ('slot' in input || 'id' in input) { if ((input.slot !== undefined && input.slot !== before.slot) || (input.id !== undefined && input.id !== id)) throw new ShopInputError('المعرّف والخانة ما يتغيران بعد الإنشاء.'); }
    const f = this.fields(input, before, true);
    if (('currency' in input) && !('price' in input) && f.currency !== before.currency) throw new ShopInputError('غيّرت العملة؛ أدخل السعر معها.');
    const proposal = !before.custom && CATALOG.find((b) => b.id === id)?.proposalOnly;
    if (proposal && (f.status === 'available' || (before.active && f.status === undefined && ('price' in input || 'currency' in input)))) {
      if (!own(input, 'price') || !own(input, 'currency') || !own(input, 'status') || input.status !== 'available' || !by.trim()) {
        throw new ShopInputError('اعتماد الخلفية يتطلب السعر والعملة وstatus=available صراحةً في طلب إدارة واحد.');
      }
    }
    const css = before.custom && 'css' in input ? this.cssFor(before.slot, input.css) : undefined;
    if (!before.custom && 'css' in input && input.css !== before.css) throw new ShopInputError('مظهر العناصر الأساسية ثابت.');
    if (!Object.keys(f).length && css === undefined) throw new ShopInputError('ما فيه تغيير.');
    return this.commit(() => {
      if (before.custom) {
        const c = this.d.custom[id]; Object.assign(c, f, css !== undefined ? { css } : {}, { at: this.now(), by });
      } else {
        const base = CATALOG.find((b) => b.id === id)!;
        const o: Override = { ...(this.d.overrides[id] ?? { at: 0, by: '' }), at: this.now(), by };
        // A metadata/staging edit must not complete an incomplete tuple loaded from an old file.
        if (base.proposalOnly && !before.active && f.status !== 'available' && o.status === 'available') {
          o.status = 'coming-soon'; o.active = false;
        }
        for (const [k, v] of Object.entries(f)) {
          const baseVal = (base as unknown as Record<string, unknown>)[k];
          if (k === 'active' || k === 'status' || (base.proposalOnly && (k === 'price' || k === 'currency'))) (o as unknown as Record<string, unknown>)[k] = v;
          else if (v === baseVal) delete (o as unknown as Record<string, unknown>)[k];
          else (o as unknown as Record<string, unknown>)[k] = v;
        }
        this.d.overrides[id] = o;
      }
      return { item: this.get(id)!, before };
    });
  }
}
