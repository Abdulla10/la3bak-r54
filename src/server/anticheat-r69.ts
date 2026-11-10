/* R69zl: كشف الغش في الألعاب.
 * 1) إجابات أسرع من قدرة الإنسان (يجاوب صح قبل لا يمديه يقرا السؤال) — برامج الغش.
 * 2) لعب آلي: كل حركاته بنفس السرعة الخارقة (أقل من ربع ثانية) — سكربت.
 * 3) حسابين من نفس الجهاز بنفس المباراة — واحد يفوّز الثاني.
 * المشبوه «تنوقف جوائزه» (ما تنحسب انتصاراته بالتصنيف ولا ياخذ جوائز مجانية) لين المالك يراجع ويسمح. */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export type CheatKind = 'fast' | 'script' | 'same-device' | 'collusion';
export const CHEAT_NAMES: Record<CheatKind, string> = { fast: 'إجابات أسرع من الإنسان', script: 'لعب آلي (برنامج)', 'same-device': 'حسابين من نفس الجهاز بنفس المباراة', collusion: 'تلاعب بالمباريات مع لاعب ثاني' };
type Flag = { at: number; held: boolean; reasons: { kind: CheatKind; at: number; detail: string }[]; clearedAt?: number; clearedBy?: string };
type Data = { v: 1; flags: Record<string, Flag> };

export class AntiCheat {
  private d: Data; private disk: Persister;
  private quiz = new Map<string, number[]>();   // آخر 20 إجابة: زمن الإجابة لو صح، وإلا -1
  private turns = new Map<string, number[]>();  // آخر 40 حركة بالألعاب بالدور
  constructor(file: string, private deps: { alert: (uid: string, kind: CheatKind, detail: string) => void; now?: () => number }, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.flags);
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = loaded ? (loaded as unknown as Data) : { v: 1, flags: {} };
    this.disk = new Persister('anticheat', file, () => this.d, deps.now ?? Date.now, mon, valid);
  }
  private get now() { return (this.deps.now ?? Date.now)(); }
  /** ممنوع من الجوائز لين المراجعة */
  held(uid: string) { return !!this.d.flags[uid]?.held; }
  flag(uid: string, kind: CheatKind, detail: string) {
    const t = this.now; const f = this.d.flags[uid] ?? (this.d.flags[uid] = { at: t, held: false, reasons: [] });
    // لو المالك سمح له قبل أقل من 3 أيام بنفس السبب، ما نوقفه مرة ثانية بنفس الشي
    if (f.clearedAt && t - f.clearedAt < 3 * 86400_000 && f.reasons.some((r) => r.kind === kind && r.at < f.clearedAt!)) return;
    if (f.held && f.reasons.some((r) => r.kind === kind && t - r.at < 86400_000)) return;
    const wasHeld = f.held; f.held = true; f.at = t;
    f.reasons.unshift({ kind, at: t, detail: detail.slice(0, 200) }); if (f.reasons.length > 12) f.reasons.length = 12;
    this.disk.save();
    if (!wasHeld || !f.reasons.slice(1).some((r) => r.kind === kind)) try { this.deps.alert(uid, kind, detail); } catch { /* */ }
  }
  clear(uid: string, by: string) { const f = this.d.flags[uid]; if (!f) return false; f.held = false; f.clearedAt = this.now; f.clearedBy = by.slice(0, 60); this.disk.save(); return true; }
  /** إجابة بلعبة أسئلة: ms = من ظهور السؤال لين الإجابة */
  answer(uid: string, ms: number, correct: boolean) {
    const l = this.quiz.get(uid) ?? []; l.push(correct ? ms : -1); if (l.length > 20) l.shift(); this.quiz.set(uid, l);
    const inhuman = l.filter((x) => x >= 0 && x < 700).length;
    if (inhuman >= 6) { this.flag(uid, 'fast', `${inhuman} إجابات صحيحة بأقل من 0.7 ثانية (آخر ${l.length} سؤال)`); this.quiz.set(uid, []); }
  }
  /** حركة بلعبة بالدور: ms = من آخر تغيير بالطاولة لين حركته */
  move(uid: string, ms: number) {
    if (ms < 0 || ms > 120_000) return;
    const l = this.turns.get(uid) ?? []; l.push(ms); if (l.length > 40) l.shift(); this.turns.set(uid, l);
    if (l.length >= 40) { const s = [...l].sort((a, b) => a - b), med = s[20]; const fast = l.filter((x) => x < 300).length;
      if (med < 260 && fast >= 34) { this.flag(uid, 'script', `آخر 40 حركة: النص منها أسرع من ${med}ms`); this.turns.set(uid, []); } }
  }
  list() {
    return Object.entries(this.d.flags).filter(([, f]) => f.held || (f.clearedAt && this.now - f.clearedAt < 7 * 86400_000)).sort((a, b) => b[1].at - a[1].at).slice(0, 60)
      .map(([id, f]) => ({ id, held: f.held, at: f.at, clearedAt: f.clearedAt ?? null, reasons: f.reasons.slice(0, 4).map((r) => ({ ...r, name: CHEAT_NAMES[r.kind] })) }));
  }
  heldCount() { return Object.values(this.d.flags).filter((f) => f.held).length; }
}
