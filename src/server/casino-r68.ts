/** R68z42: لعبتين حظ بالعملات (الخادم يحدد كل النتائج بـcrypto):
 *  1) «جاكبوت لعبك» — سلوت 5×4، 50 خط، وايلد، لفات مجانية، وجاكبوت مشترك يكبر مع الرهانات.
 *  2) «عجلة الأكل» — جولة مشتركة كل 30 ثانية: تراهن على أكلة وإذا طلعت تاخذ رهانك × مضاعفها.
 * العملة وحدة (عملات)، وما فيه دفع حقيقي. */
import { randomInt } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

/* ======================= السلوت ======================= */
export const SYMS = ['ten', 'j', 'q', 'k', 'a', 'gem', 'crown', 'falcon', 'lion', 'wild', 'free', 'jack'] as const;
export type Sym = typeof SYMS[number];
/** الدفع (× رهان الخط) لـ 3 / 4 / 5 متتالية من اليسار */
const PAY: Partial<Record<Sym, [number, number, number]>> = {
  ten: [16, 44, 165], j: [16, 44, 165], q: [22, 66, 264], k: [22, 66, 264], a: [33, 88, 352],
  gem: [55, 176, 704], crown: [66, 264, 1100], falcon: [110, 440, 1760], lion: [176, 704, 3520], wild: [176, 704, 3520],
};
/** شريط كل بكرة (أوزان) — الوايلد ما يطلع ببكرة 1 */
const W: Record<Sym, number> = { ten: 14, j: 14, q: 12, k: 12, a: 10, gem: 8, crown: 6, falcon: 5, lion: 4, wild: 3, free: 1.5, jack: 1.8 };
const PAY_K = 0.95; // R68z47: تعديل الدفع بعد ما صارت الشبكة 5×4 (العائد ~90%)
const reelWeights = (r: number) => SYMS.map((s) => (s === 'wild' && r === 0 ? 0 : W[s]));
export const ROWS = 4;
/** 50 خط (ثابتة): 4 مستقيمة، ثم أشكال V، ثم باقي المسارات اللي كل خطوة فيها صف واحد بالأكثر */
export const LINES: number[][] = (() => {
  const out: number[][] = [[1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [0, 0, 0, 0, 0], [3, 3, 3, 3, 3], [0, 1, 2, 1, 0], [3, 2, 1, 2, 3], [1, 2, 3, 2, 1], [2, 1, 0, 1, 2]];
  const seen = new Set(out.map((l) => l.join('')));
  for (let n = 0; out.length < 50 && n < ROWS ** 5; n++) { const l = [0, 0, 0, 0, 0].map((_, i) => Math.floor(n / ROWS ** i) % ROWS); let ok = true; for (let i = 1; i < 5; i++) if (Math.abs(l[i] - l[i - 1]) > 1) ok = false; const k = l.join(''); if (ok && !seen.has(k)) { seen.add(k); out.push(l); } }
  return out;
})();
export const SLOT_BETS = [2, 10, 100, 500] as const; // رهان الخط
export const SLOT_FREE = 8;
const JACK_TIER = [0.05, 0.15, 0.4, 1] as const; // نصيب الجاكبوت حسب مستوى الرهان
const JACK_SEED = 200_000;
function pick(weights: number[]): number { const tot = weights.reduce((a, b) => a + b, 0); let r = randomInt(Math.round(tot * 100)) / 100; for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; } return weights.length - 1; }
export function spinGrid(): Sym[][] { return [0, 1, 2, 3, 4].map((r) => Array.from({ length: ROWS }, () => SYMS[pick(reelWeights(r))])); }
/** grid[reel][row] */
export function evaluate(grid: Sym[][], lineBet: number) {
  const wins: { line: number; sym: Sym; count: number; pay: number }[] = [];
  LINES.forEach((l, li) => {
    const seq = l.map((row, reel) => grid[reel][row]);
    let base: Sym | null = null; let count = 0;
    for (const s of seq) { if (s === 'free' || s === 'jack') break; if (s === 'wild') { count++; continue; } if (base === null) { base = s; count++; continue; } if (s === base) count++; else break; }
    const sym: Sym = base ?? 'wild';
    if (count >= 3 && PAY[sym]) wins.push({ line: li, sym, count, pay: Math.round(PAY[sym]![count - 3] * PAY_K * lineBet) });
  });
  const flat = grid.flat();
  return { wins, total: wins.reduce((a, w) => a + w.pay, 0), free: flat.filter((s) => s === 'free').length, jack: flat.filter((s) => s === 'jack').length };
}

/* ======================= عجلة الأكل ======================= */
export const FOODS = [
  { id: 'chicken', name: 'دجاجة', mult: 45 }, { id: 'tomato', name: 'طماط', mult: 5 }, { id: 'fish', name: 'سمكة', mult: 15 }, { id: 'apple', name: 'تفاحة', mult: 5 },
  { id: 'shrimp', name: 'روبيان', mult: 25 }, { id: 'carrot', name: 'جزر', mult: 5 }, { id: 'steak', name: 'لحم', mult: 10 }, { id: 'corn', name: 'ذرة', mult: 5 },
] as const;
export const CHIPS = [10, 500, 6000, 30000, 100000] as const;
/** صناديق اليوم: توصل مجموع فوزك اليومي للحد وتفتح الصندوق (المكافأة 1% من الحد). */
export const CHESTS = [1_200_000, 1_800_000, 6_000_000, 18_000_000, 36_000_000] as const;
const CHEST_PCT = 0.01;
const BET_MS = 30_000, SHOW_MS = 7_000;
/** احتمال كل أكلة ∝ 1/مضاعفها (العائد المتوقع ~97%) */
const FOOD_W = FOODS.map((f) => 1000 / f.mult);
type Bet = { u: string; name: string; item: number; amt: number };
type Round = { n: number; start: number; bets: Bet[]; result: number | null; settled: boolean };
type Data = { v: 1; jackpot: number; free: Record<string, { left: number; bet: number }>; slotFeed: { at: number; name: string; win: number; kind: string }[]; round: Round; history: number[]; lastTop: { name: string; win: number }[]; daily: Record<string, { d: string; win: number; got?: number[] }> };
const valid = (x: Record<string, unknown>) => x.v === 1 && Number.isSafeInteger(x.jackpot) && isObj(x.free) && isObj(x.round) && Array.isArray(x.history);
const day = (t: number) => new Date(t + 4 * 3_600_000).toISOString().slice(0, 10);

export interface CasinoWallet {
  spend(id: string, amount: number, label: string, op: string): { ok: boolean; code?: string };
  grant(id: string, amount: number, label: string, op: string): boolean;
  balance(id: string): number;
}
export class Casino {
  private d: Data;
  private disk: Persister;
  private seq = 0;
  constructor(file: string, private w: CasinoWallet, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const fresh: Data = { v: 1, jackpot: JACK_SEED, free: {}, slotFeed: [], round: { n: 1, start: now(), bets: [], result: null, settled: false }, history: [], lastTop: [], daily: {} };
    this.d = (file && (loadJsonFile(file, valid) as unknown as Data)) || fresh;
    this.d.daily ??= {};
    this.disk = new Persister('casino', file, () => this.d, now, mon, valid);
  }
  private save() { this.disk.save(); }
  private addDaily(id: string, win: number) { const t = day(this.now()); const c = this.d.daily[id]; this.d.daily[id] = c?.d === t ? { d: t, win: c.win + win, got: c.got ?? [] } : { d: t, win, got: [] }; }
  private todayOf(id: string) { const c = this.d.daily[id]; return c?.d === day(this.now()) ? c : { d: day(this.now()), win: 0, got: [] as number[] }; }
  claimChest(id: string, i: unknown) {
    const k = Number(i); if (!Number.isInteger(k) || k < 0 || k >= CHESTS.length) throw new Error('صندوق غير معروف.');
    const c = this.todayOf(id); const got = c.got ?? [];
    if (got.includes(k)) throw new Error('فتحت هالصندوق اليوم.');
    if (c.win < CHESTS[k]) throw new Error('لازم يوصل فوزك اليوم ' + CHESTS[k].toLocaleString('en-US') + '.');
    const reward = Math.round(CHESTS[k] * CHEST_PCT);
    if (!this.w.grant(id, reward, 'عجلة الأكل — صندوق اليوم', `fwchest:${c.d}:${id}:${k}`)) throw new Error('تعذّر تسليم المكافأة.');
    this.d.daily[id] = { d: c.d, win: c.win, got: [...got, k] }; this.save();
    return { reward, ...this.wheelState(id) };
  }

  /* ---------- السلوت ---------- */
  slotState(id: string) { return { jackpot: this.d.jackpot, bets: SLOT_BETS, lines: LINES.length, free: this.d.free[id] ?? null, feed: this.d.slotFeed.slice(-8).reverse(), coins: this.w.balance(id), lineMap: LINES }; }
  spin(id: string, name: string, betIdx: unknown) {
    const fs = this.d.free[id];
    const bi = fs ? SLOT_BETS.indexOf(fs.bet as typeof SLOT_BETS[number]) : Number(betIdx);
    if (!Number.isInteger(bi) || bi < 0 || bi >= SLOT_BETS.length) throw new Error('رهان غير صالح.');
    const lineBet = SLOT_BETS[bi], total = lineBet * LINES.length;
    const op = `slot:${id}:${this.now()}:${++this.seq}`;
    if (!fs) { const p = this.w.spend(id, total, 'جاكبوت لعبك — لفة', op); if (!p.ok) throw new Error(p.code === 'poor' ? 'عملاتك ما تكفي.' : 'تعذّر الخصم.'); this.d.jackpot += Math.round(total * 0.01); }
    else { fs.left--; if (fs.left <= 0) delete this.d.free[id]; }
    const grid = spinGrid(); const ev = evaluate(grid, lineBet);
    let win = ev.total, jackWin = 0, freeWon = 0;
    if (ev.jack >= 5) { jackWin = Math.floor(this.d.jackpot * JACK_TIER[bi]); this.d.jackpot = Math.max(JACK_SEED, this.d.jackpot - jackWin); win += jackWin; }
    if (ev.free >= 3) { freeWon = SLOT_FREE + (ev.free - 3) * 4; const cur = this.d.free[id]; this.d.free[id] = { left: (cur?.left ?? 0) + freeWon, bet: lineBet }; }
    if (win > 0) { if (!this.w.grant(id, win, jackWin ? 'جاكبوت لعبك — الجاكبوت!' : 'جاكبوت لعبك — فوز', op + ':win')) throw new Error('تعذّر تسليم الفوز، تواصل مع الدعم.'); this.addDaily(id, win); }
    if (win >= total * 10 || jackWin) { this.d.slotFeed.push({ at: this.now(), name, win, kind: jackWin ? 'jack' : 'big' }); if (this.d.slotFeed.length > 40) this.d.slotFeed.splice(0, 10); }
    this.save();
    return { grid, wins: ev.wins, win, jackWin, freeWon, free: this.d.free[id] ?? null, jackpot: this.d.jackpot, coins: this.w.balance(id), tier: ['MINI', 'MAJOR', 'GRAND', 'MEGA'][bi], total };
  }

  /* ---------- عجلة الأكل ---------- */
  /** يتقدم بالجولة حسب الوقت (يُستدعى قبل أي طلب وكل ثانية) */
  tick() {
    const r = this.d.round, t = this.now();
    if (r.result === null && t >= r.start + BET_MS) { r.result = pick(FOOD_W); this.d.history.push(r.result); if (this.d.history.length > 20) this.d.history.splice(0, this.d.history.length - 20); this.settle(); }
    if (r.result !== null && t >= r.start + BET_MS + SHOW_MS) { this.d.round = { n: r.n + 1, start: t, bets: [], result: null, settled: false }; this.save(); }
  }
  private settle() {
    const r = this.d.round; if (r.settled || r.result === null) return;
    const per = new Map<string, { name: string; win: number }>();
    for (const b of r.bets) if (b.item === r.result) { const x = per.get(b.u) ?? { name: b.name, win: 0 }; x.win += b.amt * FOODS[b.item].mult; per.set(b.u, x); }
    for (const [u, x] of per) { if (this.w.grant(u, x.win, `عجلة الأكل — ${FOODS[r.result].name} ×${FOODS[r.result].mult}`, `fw:${r.n}:${u}`)) this.addDaily(u, x.win); }
    this.d.lastTop = [...per.values()].sort((a, b) => b.win - a.win).slice(0, 3);
    r.settled = true; this.save();
  }
  bet(id: string, name: string, item: unknown, chip: unknown) {
    this.tick();
    const r = this.d.round; const i = Number(item), c = Number(chip);
    if (r.result !== null || this.now() >= r.start + BET_MS) throw new Error('انتهى وقت الرهان، استنى الجولة الجاية.');
    if (!Number.isInteger(i) || i < 0 || i >= FOODS.length || !(CHIPS as readonly number[]).includes(c)) throw new Error('رهان غير صالح.');
    const mine = r.bets.filter((b) => b.u === id).reduce((a, b) => a + b.amt, 0);
    if (mine + c > 5_000_000) throw new Error('وصلت حد الرهان بالجولة (5 مليون).');
    const p = this.w.spend(id, c, `عجلة الأكل — رهان على ${FOODS[i].name}`, `fwb:${r.n}:${id}:${r.bets.length}:${this.now()}`);
    if (!p.ok) throw new Error(p.code === 'poor' ? 'عملاتك ما تكفي.' : 'تعذّر الخصم.');
    r.bets.push({ u: id, name, item: i, amt: c }); this.save();
    return this.wheelState(id);
  }
  wheelState(id: string) {
    this.tick();
    const r = this.d.round, t = this.now();
    const totals = FOODS.map((_, i) => r.bets.filter((b) => b.item === i).reduce((a, b) => a + b.amt, 0));
    const mine = FOODS.map((_, i) => r.bets.filter((b) => b.item === i && b.u === id).reduce((a, b) => a + b.amt, 0));
    const myWin = r.result !== null ? mine[r.result] * FOODS[r.result].mult : 0;
    const dd = this.todayOf(id); const today = dd.win;
    return { round: r.n, phase: r.result === null ? 'bet' : 'show', left: Math.max(0, (r.result === null ? r.start + BET_MS : r.start + BET_MS + SHOW_MS) - t), result: r.result, totals, mine, myWin,
      foods: FOODS, chips: CHIPS, history: this.d.history.slice(-10).reverse(), top: r.result !== null ? this.d.lastTop : [], coins: this.w.balance(id), today, chests: CHESTS.map((need) => ({ need, reward: Math.round(need * CHEST_PCT) })), chestsGot: dd.got ?? [], serverNow: t };
  }
}
