/* R62: موسم الترتيب الشهري — بنهاية كل شهر (توقيت الخليج) أوائل ترتيب الشهر ياخذون إطار حصري (ما ينباع) وجواهر.
   الأول: «إطار بطل الموسم» + 10,000 عملة، الثاني: «إطار وصيف الموسم» + 6,000، الثالث: «إطار ثالث الموسم» + 4,000، من الرابع للعاشر: 2,000 عملة.
   المنح تمر بـ grantCampaignBatch بمعرّف ثابت لكل شهر ومركز (ما تتكرر حتى لو انعاد التشغيل). */
import { createHash } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export const SEASON_PRIZES = Object.freeze([
  { rank: 1, coins: 10000, itemId: 'art-f3-42' }, { rank: 2, coins: 6000, itemId: 'art-f3-39' }, { rank: 3, coins: 4000, itemId: 'art-f3-40' },
  ...[4, 5, 6, 7, 8, 9, 10].map((rank) => ({ rank, coins: 2000, itemId: '' })),
]);
type Rec = { at: number; winners: { id: string; name: string; rank: number; points: number }[] };
type Data = { v: 1; months: Record<string, Rec>; since?: number };
const valid = (v: Record<string, unknown>) => v.v === 1 && isObj(v.months) && Object.entries(v.months as object).every(([k, r]: [string, any]) => /^\d{4}-\d{2}$/.test(k) && isObj(r) && Number.isSafeInteger(r.at) && Array.isArray(r.winners) && r.winners.length <= 10);
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const asUuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
export const monthLabel = (k: string) => { const [y, m] = k.split('-').map(Number); return `${['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][m - 1]} ${y}`; };

export type SeasonDeps = {
  rows: (monthStart: number) => { id: string; name: string; points: number }[];
  grant: (campaignId: string, fp: string, ids: string[], rewards: { coins: number; gems: number; itemIds: string[] }, reason: string) => { id: string; status: string }[];
  itemOk: (id: string) => boolean;
  notify: (id: string, title: string, body: string, ref: string) => void;
  log?: (e: string, d?: Record<string, unknown>) => void;
};
export class MonthlySeason {
  private d: Data = { v: 1, months: {} };
  private disk: Persister;
  constructor(file: string, private deps: SeasonDeps, mon = new StorageMonitor(), private now: () => number = Date.now) {
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('season', file, () => this.d, now, mon, valid);
    if (!this.d.since) { this.d.since = now(); this.disk.save(); }
  }
  /** أول تشغيل للميزة — الشهور اللي خلصت قبله ما تتوزع لها جوايز بأثر رجعي */
  get since() { return this.d.since ?? 0; }
  /** monthStart: بداية الشهر اللي خلص (ms). key: YYYY-MM. يسوّيه مرة وحدة. */
  settle(key: string, monthStart: number): Rec | null {
    if (this.d.months[key]) return null;
    const rows = this.deps.rows(monthStart).slice(0, 10);
    const rec: Rec = { at: this.now(), winners: rows.map((r, i) => ({ id: r.id, name: r.name, rank: i + 1, points: r.points })) };
    // نسجّل أول (عشان لو صار خطأ بنص المنح ما نعيد التوزيع بطريقة ثانية) — والمنح نفسها ما تتكرر بسبب المعرف الثابت
    this.d.months[key] = rec; this.disk.mustSave();
    for (const w of rec.winners) {
      const p = SEASON_PRIZES[w.rank - 1]; if (!p) continue;
      const itemIds = p.itemId && this.deps.itemOk(p.itemId) ? [p.itemId] : [];
      const campaignId = asUuid(hash(['season-r62', key, w.rank, w.id])), reward = { coins: p.coins, gems: 0, itemIds };
      const reason = `جايزة موسم ${monthLabel(key)} — المركز ${w.rank}`;
      try {
        const res = this.deps.grant(campaignId, hash(['season-r62', key, w.rank, w.id, reward, reason]), [w.id], reward, reason);
        if (res[0]?.status === 'failed') this.deps.log?.('season_grant_failed', { key, rank: w.rank });
        this.deps.notify(w.id, `🏆 مبروك! المركز ${w.rank} بموسم ${monthLabel(key)}`, `أخذت ${p.coins.toLocaleString('en-US')} عملة${itemIds.length ? ` و«${w.rank === 1 ? 'إطار بطل الموسم' : w.rank === 2 ? 'إطار وصيف الموسم' : 'إطار ثالث الموسم'}» الحصري` : ''}. تلقاها بمحفظتك وأغراضك.`, `season-${key}-${w.rank}`);
      } catch (e) { this.deps.log?.('season_grant_error', { key, rank: w.rank, error: String((e as Error).message).slice(0, 100) }); }
    }
    return rec;
  }
  last(): { key: string; label: string; winners: Rec['winners'] } | null { const k = Object.keys(this.d.months).sort().pop(); return k ? { key: k, label: monthLabel(k), winners: this.d.months[k].winners } : null; }
}
