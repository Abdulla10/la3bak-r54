/** R68c: بنرات الصفحة الرئيسية (مثل «بطولة لعبك الكبرى») — يتحكم فيها المالك من لوحة التحكم.
 * كل بنر: عنوان (مع كلمة ذهبية)، وصف، زر ورابط، وصورة اختيارية (ترفع من اللوحة وتنحفظ webp). */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { loadJsonFile, Persister, StorageMonitor, isObj } from './datafile.js';

export type HomeBanner = { id: string; title: string; gold: string; text: string; cta: string; href: string; img: string; full: boolean; active: boolean; at: number; by: string };
type Data = { v: 1; list: HomeBanner[] };
export const HOME_BANNERS_MAX = 8;
export const DEFAULT_BANNER_IMG = '/assets/art68/banner-trophy.webp';
const DEFAULT: HomeBanner = { id: 'default-cup', title: 'بطولة لعبك الكبرى', gold: 'بطولة', text: 'نافس اللاعبين واربح جوائز حصرية!', cta: 'شارك الآن', href: '#/tournaments', img: DEFAULT_BANNER_IMG, full: false, active: true, at: 0, by: '' };
const valid = (x: Record<string, unknown>) => x.v === 1 && Array.isArray(x.list) && x.list.length <= HOME_BANNERS_MAX && x.list.every((b) => isObj(b) && typeof b.id === 'string' && typeof b.title === 'string');
const clean = (v: unknown, max: number) => String(v ?? '').normalize('NFKC').replace(/[\u0000-\u001f‎‏‪-‮]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
/** روابط داخلية بس (#/...) أو https */
export function safeBannerHref(v: unknown): string {
  const s = String(v ?? '').trim();
  if (/^#\/[A-Za-z0-9_\-/]{0,80}$/.test(s)) return s;
  if (/^https:\/\/[A-Za-z0-9.-]+(\/[A-Za-z0-9_\-./?=&%]*)?$/.test(s) && s.length <= 200) return s;
  return '';
}
export class HomeBannerError extends Error {}
export class HomeBanners {
  private d: Data = { v: 1, list: [structuredClone(DEFAULT)] };
  private disk: Persister;
  private imgDir: string;
  private mem = new Map<string, Buffer>();
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('home-banners', file, () => this.d, now, mon, valid);
    this.imgDir = file ? path.join(path.dirname(file), 'home-banners') : '';
  }
  private save(prev: Data) { try { this.disk.mustSave(); } catch (e) { this.d = prev; throw e; } }
  all(): HomeBanner[] { return structuredClone(this.d.list); }
  publicList() { return this.d.list.filter((b) => b.active).map(({ id, title, gold, text, cta, href, img, full }) => ({ id, title, gold, text, cta, href, img, full })); }
  upsert(input: Record<string, unknown>, by: string): HomeBanner {
    const id = typeof input.id === 'string' && input.id ? input.id : '';
    const old = id ? this.d.list.find((b) => b.id === id) : undefined;
    if (id && !old) throw new HomeBannerError('البنر غير موجود.');
    if (!old && this.d.list.length >= HOME_BANNERS_MAX) throw new HomeBannerError(`الحد ${HOME_BANNERS_MAX} بنرات.`);
    const title = clean(input.title, 40); if ([...title].length < 2) throw new HomeBannerError('اكتب عنوان البنر.');
    const gold = clean(input.gold, 20); if (gold && !title.includes(gold)) throw new HomeBannerError('الكلمة الذهبية لازم تكون من العنوان.');
    const href = safeBannerHref(input.href); if (!href) throw new HomeBannerError('الرابط لازم يبدأ بـ #/ (صفحة بالموقع) أو https://');
    const img = typeof input.img === 'string' && (input.img === '' || input.img === DEFAULT_BANNER_IMG || /^\/api\/home-banners\/img\/[a-z0-9-]+\.webp$/.test(input.img)) ? input.img : old?.img ?? DEFAULT_BANNER_IMG;
    const b: HomeBanner = { id: old?.id ?? 'hb-' + randomUUID().slice(0, 8), title, gold, text: clean(input.text, 80), cta: clean(input.cta, 18) || 'افتح', href, img, full: input.full === true, active: input.active !== false, at: this.now(), by };
    const prev = structuredClone(this.d);
    this.d = { v: 1, list: old ? this.d.list.map((x) => (x.id === b.id ? b : x)) : [...this.d.list, b] };
    this.save(prev); return structuredClone(b);
  }
  remove(id: string) { const prev = structuredClone(this.d); const n = this.d.list.length; this.d = { v: 1, list: this.d.list.filter((b) => b.id !== id) }; if (this.d.list.length === n) throw new HomeBannerError('البنر غير موجود.'); this.save(prev); }
  move(id: string, dir: number) {
    const i = this.d.list.findIndex((b) => b.id === id); if (i < 0) throw new HomeBannerError('البنر غير موجود.');
    const j = i + (dir < 0 ? -1 : 1); if (j < 0 || j >= this.d.list.length) return;
    const prev = structuredClone(this.d); const list = [...this.d.list]; [list[i], list[j]] = [list[j], list[i]]; this.d = { v: 1, list }; this.save(prev);
  }
  /** يستقبل صورة base64 (jpg/png/webp)، ينظفها ويحولها webp بعرض 1200 كحد أقصى، ويرجع رابطها */
  async putImage(dataUrl: unknown): Promise<string> {
    const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ''));
    if (!m) throw new HomeBannerError('الصورة لازم تكون JPG أو PNG أو WebP.');
    const raw = Buffer.from(m[2], 'base64'); if (raw.length > 2_500_000) throw new HomeBannerError('الصورة كبيرة (الحد 2.5 ميغا).');
    let out: Buffer;
    try { out = await sharp(raw, { failOn: 'error', limitInputPixels: 24_000_000, pages: 1 }).rotate().resize({ width: 1200, height: 700, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer(); }
    catch { throw new HomeBannerError('الملف مب صورة صالحة.'); }
    const name = randomUUID().slice(0, 13).toLowerCase() + '.webp';
    if (this.imgDir) { fs.mkdirSync(this.imgDir, { recursive: true }); fs.writeFileSync(path.join(this.imgDir, name), out); }
    else this.mem.set(name, out);
    return '/api/home-banners/img/' + name;
  }
  image(name: string): Buffer | null {
    if (!/^[a-z0-9-]+\.webp$/.test(name)) return null;
    if (!this.imgDir) return this.mem.get(name) ?? null;
    try { return fs.readFileSync(path.join(this.imgDir, name)); } catch { return null; }
  }
}
