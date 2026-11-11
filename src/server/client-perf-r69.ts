/* R69zz: سرعة الموقع عند اللاعبين: نجمع آخر 400 قياس لكل نوع جهاز، ونطلع الوسيط (نص اللاعبين أسرع منه) والـ 75% */
import { isObj } from './datafile.js';
type K = 'ttfb' | 'dcl' | 'load' | 'lcp';
const KEYS: K[] = ['ttfb', 'dcl', 'load', 'lcp'];
export class ClientPerf {
  private s: Record<string, Record<K, number[]> & { n: number; app: number }> = {};
  add(raw: unknown) {
    if (!isObj(raw)) return; const dev = ['iphone', 'android', 'desktop'].includes(String(raw.dev)) ? String(raw.dev) : 'desktop';
    const b = this.s[dev] ??= { ttfb: [], dcl: [], load: [], lcp: [], n: 0, app: 0 } as any;
    for (const k of KEYS) { const v = Number(raw[k]); if (Number.isFinite(v) && v > 0 && v < 120_000) { b[k].push(v); if (b[k].length > 400) b[k].shift(); } }
    b.n++; if (raw.standalone === true) b.app++;
  }
  view() {
    const q = (a: number[], p: number) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))]); };
    return Object.fromEntries(Object.entries(this.s).map(([d, b]) => [d, { samples: b.n, app: b.app, ...Object.fromEntries(KEYS.map((k) => [k, { p50: q(b[k], 0.5), p75: q(b[k], 0.75) }])) }]));
  }
}
