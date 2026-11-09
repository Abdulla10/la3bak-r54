/* R62: حرب القبائل الأسبوعية — كل أسبوع (يبدأ السبت بتوقيت الخليج) القبائل تنقسم أزواج حسب ترتيبها (الأولى ضد الثانية، الثالثة ضد الرابعة…).
   النتيجة = هيبة القبيلة بالأسبوع (نفس هيبة صاروخ القبيلة — من هدايا الأعضاء). بنهاية الأسبوع كل عضو بالقبيلة الفايزة ياخذ وقود، وبالتعادل الكل ياخذ أقل.
   الأزواج والنتائج تنحفظ، والتسوية تصير مرة وحدة لكل أسبوع. */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export const WAR_FUEL = Object.freeze({ win: 1000, draw: 300, minMembers: 2 });
type Pair = { a: number; b: number };
type Week = { pairs: Pair[]; scores: Record<string, number>; settled: boolean; results?: { a: number; b: number; sa: number; sb: number; winner: number | null }[] };
type Data = { v: 1; weeks: Record<string, Week> };
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const valid = (v: Record<string, unknown>) => v.v === 1 && isObj(v.weeks) && Object.entries(v.weeks as object).every(([k, w]: [string, any]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && isObj(w) && Array.isArray(w.pairs) && w.pairs.length <= 500 && w.pairs.every((p: any) => isObj(p) && nat(p.a) && nat(p.b)) && isObj(w.scores) && Object.values(w.scores).every(nat) && typeof w.settled === 'boolean');

export class TribeWar {
  private d: Data = { v: 1, weeks: {} };
  private disk: Persister;
  constructor(file: string, mon = new StorageMonitor(), now: () => number = Date.now) {
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('tribe-war', file, () => this.d, now, mon, valid);
  }
  /** يقسّم القبائل أزواج لأسبوع جديد (مرة وحدة بالأسبوع). tribes مرتبة من الأقوى. */
  ensure(week: string, tribes: number[]): boolean {
    const cur = this.d.weeks[week];
    if (cur) { // قبائل جديدة (أو اللي ما لقت خصم) تنقسم أزواج بينها بنص الأسبوع
      if (cur.settled) return false; const used = new Set(cur.pairs.flatMap((p) => [p.a, p.b])); const free = tribes.filter((id) => !used.has(id));
      if (free.length < 2) return false; for (let i = 0; i + 1 < free.length; i += 2) cur.pairs.push({ a: free[i], b: free[i + 1] }); this.disk.save(); return true;
    }
    const pairs: Pair[] = []; for (let i = 0; i + 1 < tribes.length; i += 2) pairs.push({ a: tribes[i], b: tribes[i + 1] });
    this.d.weeks[week] = { pairs, scores: {}, settled: false };
    const keys = Object.keys(this.d.weeks).sort(); for (const k of keys.slice(0, Math.max(0, keys.length - 8))) delete this.d.weeks[k];
    this.disk.save(); return true;
  }
  /** يحدّث نتائج الأسبوع الحالي (هيبة كل قبيلة بالحرب) */
  update(week: string, scoreOf: (tribeId: number) => number) {
    const w = this.d.weeks[week]; if (!w || w.settled) return; let changed = false;
    for (const p of w.pairs) for (const id of [p.a, p.b]) { const v = Math.max(0, Math.floor(scoreOf(id) || 0)); if (w.scores[id] !== v) { w.scores[id] = v; changed = true; } }
    if (changed) this.disk.save();
  }
  /** يسوّي كل الأسابيع اللي خلصت وما تسوّت. يرجع الجوايز المطلوبة (المنح نفسها برا). */
  settle(current: string): { week: string; results: NonNullable<Week['results']> }[] {
    const out: { week: string; results: NonNullable<Week['results']> }[] = [];
    for (const [k, w] of Object.entries(this.d.weeks)) {
      if (k >= current || w.settled) continue;
      const results = w.pairs.map((p) => { const sa = w.scores[p.a] ?? 0, sb = w.scores[p.b] ?? 0; return { a: p.a, b: p.b, sa, sb, winner: sa === sb ? null : sa > sb ? p.a : p.b }; });
      w.settled = true; w.results = results; out.push({ week: k, results });
    }
    if (out.length) this.disk.mustSave();
    return out;
  }
  view(week: string, tribeId: number) {
    const w = this.d.weeks[week]; const p = w?.pairs.find((x) => x.a === tribeId || x.b === tribeId);
    const prevKey = Object.keys(this.d.weeks).filter((k) => k < week).sort().pop(); const pw = prevKey ? this.d.weeks[prevKey] : null;
    const last = pw?.results?.find((r) => r.a === tribeId || r.b === tribeId) ?? null;
    return { week, opponent: p ? (p.a === tribeId ? p.b : p.a) : null, mine: w?.scores[tribeId] ?? 0, theirs: p ? w!.scores[p.a === tribeId ? p.b : p.a] ?? 0 : 0, last: last ? { won: last.winner === tribeId, draw: last.winner === null, mine: last.a === tribeId ? last.sa : last.sb, theirs: last.a === tribeId ? last.sb : last.sa, opponent: last.a === tribeId ? last.b : last.a } : null };
  }
}
