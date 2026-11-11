/* R69zn: تصنيف اللاعبين لكل لعبة (نظام Elo مثل الشطرنج). الفوز على لاعب أقوى يعطي نقاط أكثر.
 * يبدأ كل لاعب من 1000. أول 10 مباريات التغيير أكبر عشان يوصل مستواه الحقيقي بسرعة.
 * مباريات الكمبيوتر ما تنحسب. */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export const START = 1000;
type R = { r: number; n: number; w: number; at: number };
type Data = { v: 1; g: Record<string, Record<string, R>>; done: string[] };
export const TIERS = [
  { min: 1700, name: 'أسطوري', icon: '👑' }, { min: 1500, name: 'ماسي', icon: '💎' }, { min: 1300, name: 'بلاتيني', icon: '🏆' },
  { min: 1150, name: 'ذهبي', icon: '🥇' }, { min: 1000, name: 'فضي', icon: '🥈' }, { min: 0, name: 'برونزي', icon: '🥉' },
];
export const tierOf = (r: number) => TIERS.find((t) => r >= t.min)!;

export class Ratings {
  private d: Data; private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.g);
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = loaded ? (loaded as unknown as Data) : { v: 1, g: {}, done: [] }; if (!Array.isArray(this.d.done)) this.d.done = [];
    this.disk = new Persister('ratings', file, () => this.d, now, mon, valid);
  }
  get(game: string, uid: string) { return this.d.g[game]?.[uid]?.r ?? START; }
  view(game: string, uid: string) {
    const x = this.d.g[game]?.[uid]; const r = x?.r ?? START, t = tierOf(r);
    const all = Object.values(this.d.g[game] ?? {}).filter((y) => y.n >= 3);
    const rank = x && x.n >= 3 ? all.filter((y) => y.r > r).length + 1 : null;
    return { rating: Math.round(r), games: x?.n ?? 0, wins: x?.w ?? 0, tier: t.name, icon: t.icon, rank, of: all.length, provisional: (x?.n ?? 0) < 10 };
  }
  top(game: string, n = 10) { return Object.entries(this.d.g[game] ?? {}).filter(([, y]) => y.n >= 3).sort((a, b) => b[1].r - a[1].r).slice(0, n).map(([id, y]) => ({ id, rating: Math.round(y.r), games: y.n, ...tierOf(y.r) })); }
  /** نتيجة مباراة. teams: كل لاعب ورقم فريقه (في الألعاب الفردية كل لاعب فريق). يرجع التغيير لكل لاعب */
  /** R74: shield(id) = true يعني «حماية من خسارة النقاط» (ميزة VIP) — الخسارة ما تنقّص تصنيفه */
  record(ref: string, game: string, players: { id: string; team: number }[], winners: string[], shield?: (id: string) => boolean): Record<string, number> {
    if (this.d.done.includes(ref) || players.length < 2) return {};
    const G = this.d.g[game] ?? (this.d.g[game] = {}); const t = this.now();
    const cur = (id: string) => G[id] ?? { r: START, n: 0, w: 0, at: t };
    const teams = [...new Set(players.map((p) => p.team))];
    const avg = (tm: number) => { const m = players.filter((p) => p.team === tm); return m.reduce((a, p) => a + cur(p.id).r, 0) / m.length; };
    const score = (tm: number) => (players.some((p) => p.team === tm && winners.includes(p.id)) ? 1 : 0);
    const delta: Record<string, number> = {};
    if (!winners.length) return {};
    for (const p of players) {
      const me = cur(p.id); const k = me.n < 10 ? 48 : me.n < 40 ? 32 : 24; let d = 0;
      for (const tm of teams) { if (tm === p.team) continue; const s = score(p.team) === score(tm) ? 0.5 : score(p.team) > score(tm) ? 1 : 0; const e = 1 / (1 + 10 ** ((avg(tm) - avg(p.team)) / 400)); d += k * (s - e); }
      d /= Math.max(1, teams.length - 1); delta[p.id] = Math.round(d);
      if (delta[p.id] < 0 && shield?.(p.id)) delta[p.id] = 0;
    }
    for (const p of players) { const me = cur(p.id); G[p.id] = { r: Math.max(100, me.r + delta[p.id]), n: me.n + 1, w: me.w + (winners.includes(p.id) ? 1 : 0), at: t }; }
    this.d.done.push(ref); if (this.d.done.length > 5000) this.d.done.splice(0, 1000);
    this.disk.save(); return delta;
  }
}
