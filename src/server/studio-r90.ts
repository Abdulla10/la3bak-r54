/* R90: استوديو التصميم (نوبل 5 وفوق) — اللاعب يصمم إطار أو خلفية من خيارات ثابتة (ألوان + نقشة + كلمة)،
 * يلبسه، أو يعرضه للبيع بالعملات. ما فيه CSS أو صور من اللاعب: التصميم «مواصفات» يرسمها الموقع بنفسه.
 * يندمج مع المتجر الحالي: كل تصميم يصير عنصر بمعرّف st-<رقم> (ما ينباع من المتجر العادي، بس من الاستوديو). */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export const STUDIO_PATTERNS = ['plain', 'stars', 'dots', 'waves', 'diamonds', 'hearts', 'crowns', 'sparkle'] as const;
export type StudioPattern = typeof STUDIO_PATTERNS[number];
export type StudioKind = 'frame' | 'bg';
export interface StudioSpec { k: StudioKind; c1: string; c2: string; c3: string; p: StudioPattern; t: string; g: boolean }
export interface Design { id: number; by: string; name: string; spec: StudioSpec; price: number; sales: number; at: number; hidden?: boolean }
type Data = { v: 1; seq: number; designs: Design[] };
export const STUDIO_MAX_PER_USER = 20, STUDIO_PRICE_MIN = 100, STUDIO_PRICE_MAX = 1_000_000, STUDIO_SELLER_SHARE = 0.8;

const HEX = /^#[0-9a-f]{6}$/;
const err = (status: number, message: string): never => { throw Object.assign(new Error(message), { status }); };
const cleanText = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩<>"'`&\\{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

export function validSpec(x: unknown): StudioSpec {
  if (!isObj(x)) return err(400, 'تصميم غير صالح.');
  const k = x.k === 'bg' ? 'bg' : x.k === 'frame' ? 'frame' : err(400, 'اختر إطار أو خلفية.');
  const col = (v: unknown) => { const c = String(v ?? '').toLowerCase(); return HEX.test(c) ? c : err(400, 'لون غير صالح.'); };
  const p = STUDIO_PATTERNS.includes(x.p as StudioPattern) ? x.p as StudioPattern : err(400, 'نقشة غير معروفة.');
  return { k, c1: col(x.c1), c2: col(x.c2), c3: col(x.c3), p, t: cleanText(x.t, 12), g: x.g === true };
}
/** المفتاح اللي يرسم منه الموقع التصميم (حروف آمنة بس) */
export const specCss = (s: StudioSpec) => 'st~' + b64(JSON.stringify([s.k, s.c1, s.c2, s.c3, s.p, s.t, s.g ? 1 : 0]));

export class Studio {
  private d: Data; private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor(), private moderate: (t: string) => string | null = () => null) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && Array.isArray(x.designs);
    this.d = (file ? loadJsonFile(file, valid) as unknown as Data : null) ?? { v: 1, seq: 0, designs: [] };
    this.disk = new Persister('studio90', file, () => this.d, now, mon, valid);
  }
  private find(id: number) { return this.d.designs.find((x) => x.id === id); }
  idOf(itemId: unknown) { const m = /^st-(\d{1,9})$/.exec(String(itemId ?? '')); return m ? Number(m[1]) : 0; }
  /** شكل عنصر المتجر (للبس والعرض بكل مكان) */
  asItem(itemId: unknown) {
    const d = this.find(this.idOf(itemId)); if (!d) return undefined;
    return { id: `st-${d.id}`, slot: d.spec.k, name: d.name, icon: '🎨', desc: 'تصميم من استوديو لعبك', price: d.price, currency: 'coins' as const, permanent: true,
      css: specCss(d.spec), rarity: 'epic' as const, active: false, status: 'hidden' as const, custom: true, baseId: false };
  }
  view(d: Design, viewer: string) { return { id: d.id, itemId: `st-${d.id}`, name: d.name, kind: d.spec.k, css: specCss(d.spec), spec: d.spec, price: d.price, sales: d.sales, mine: d.by === viewer, at: d.at }; }
  mine(me: string) { return this.d.designs.filter((x) => x.by === me && !x.hidden).sort((a, b) => b.at - a.at); }
  market(kind?: unknown) { return this.d.designs.filter((x) => !x.hidden && x.price > 0 && (kind !== 'frame' && kind !== 'bg' ? true : x.spec.k === kind)).sort((a, b) => b.sales - a.sales || b.at - a.at).slice(0, 60); }
  get(id: unknown) { const n = Number(id); const d = Number.isSafeInteger(n) ? this.find(n) : undefined; return d && !d.hidden ? d : undefined; }
  create(me: string, name: unknown, spec: unknown) {
    const s = validSpec(spec); const nm = cleanText(name, 24) || (s.k === 'frame' ? 'إطاري' : 'خلفيتي');
    for (const t of [nm, s.t]) if (t && this.moderate(t)) err(400, 'فيه كلمة غير مناسبة بالاسم أو الكتابة.');
    if (this.mine(me).length >= STUDIO_MAX_PER_USER) err(409, `لك لين ${STUDIO_MAX_PER_USER} تصميم. احذف واحد قبل.`);
    const d: Design = { id: ++this.d.seq, by: me, name: nm, spec: s, price: 0, sales: 0, at: this.now() };
    this.d.designs.push(d); this.disk.save(); return d;
  }
  setPrice(me: string, id: unknown, price: unknown) {
    const d = this.get(id); if (!d || d.by !== me) return err(404, 'التصميم غير موجود.');
    const p = Number(price); if (!(p === 0 || (Number.isInteger(p) && p >= STUDIO_PRICE_MIN && p <= STUDIO_PRICE_MAX))) err(400, `السعر من ${STUDIO_PRICE_MIN} لين ${STUDIO_PRICE_MAX.toLocaleString('en')} (أو 0 لإيقاف البيع).`);
    d.price = p; this.disk.save(); return d;
  }
  /** حذف من قائمتي (اللي اشتروه يبقى معهم) */
  remove(me: string, id: unknown) { const d = this.get(id); if (!d || d.by !== me) return err(404, 'التصميم غير موجود.'); d.hidden = true; d.price = 0; this.disk.save(); return { ok: true }; }
  /** للإدارة: إخفاء تصميم مخالف من السوق */
  adminHide(id: unknown) { const d = this.find(Number(id)); if (!d) return err(404, 'التصميم غير موجود.'); d.hidden = true; d.price = 0; this.disk.save(); return { ok: true }; }
  sold(id: number) { const d = this.find(id); if (d) { d.sales++; this.disk.save(); } }
}
