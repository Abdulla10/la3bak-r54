/* R69ze: مراقبة السيرفر — نقيس كل دقيقة: تأخير السيرفر (event loop)، الذاكرة، سرعة الطلبات، الأخطاء، المتصلين،
 * وحالة حفظ الملفات. لو شي صار غلط يوصل تنبيه للمالك على جواله (مرة وحدة لكل مشكلة لين تنحل). */
import { monitorEventLoopDelay } from 'node:perf_hooks';
import os from 'node:os';

type Sample = { at: number; lagP99: number; rssMb: number; heapMb: number; reqs: number; avgMs: number; p95Ms: number; errs: number; online: number; cpu: number };
export type Problem = { key: string; title: string; text: string };

export class ServerMonitor {
  private h = monitorEventLoopDelay({ resolution: 20 });
  private times: number[] = []; private reqs = 0; private errs = 0;
  private hist: Sample[] = [];
  private active = new Map<string, number>();
  private started = Date.now();
  private cpuPrev = process.cpuUsage(); private cpuAt = Date.now();
  constructor(private deps: { online: () => number; storage: () => { ready: boolean; stores: Record<string, string> }; alert: (title: string, text: string) => void; log?: (e: string, d?: Record<string, unknown>) => void;
    limits?: { lagMs?: number; rssMb?: number; errPct?: number; slowMs?: number } }) {
    this.h.enable();
    const t = setInterval(() => { try { this.tick(); } catch (e) { deps.log?.('monitor_failed', { error: String(e).slice(0, 80) }); } }, 60_000); t.unref?.();
  }
  /** تنادى لما يخلص كل طلب */
  request(ms: number, status: number) { this.reqs++; if (status >= 500) this.errs++; if (this.times.length < 5000) this.times.push(ms); }
  private tick() {
    const L = { lagMs: 400, rssMb: Number(process.env.MONITOR_RSS_MB) || 1500, errPct: 5, slowMs: 1500, ...this.deps.limits };
    const sorted = [...this.times].sort((a, b) => a - b), mem = process.memoryUsage();
    const now = Date.now(), cpu = process.cpuUsage(this.cpuPrev), cpuPct = Math.round(((cpu.user + cpu.system) / 1000) / Math.max(1, now - this.cpuAt) * 100 / Math.max(1, os.cpus().length));
    this.cpuPrev = process.cpuUsage(); this.cpuAt = now;
    const s: Sample = { at: now, lagP99: Math.round(this.h.percentile(99) / 1e6), rssMb: Math.round(mem.rss / 1048576), heapMb: Math.round(mem.heapUsed / 1048576),
      reqs: this.reqs, avgMs: sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0, p95Ms: sorted.length ? Math.round(sorted[Math.floor(sorted.length * 0.95)]) : 0,
      errs: this.errs, online: this.deps.online(), cpu: cpuPct };
    this.h.reset(); this.times = []; this.reqs = 0; this.errs = 0;
    this.hist.push(s); if (this.hist.length > 24 * 60) this.hist.shift();
    const st = this.deps.storage(); const failing = Object.entries(st.stores).filter(([, v]) => v === 'failing').map(([k]) => k);
    const probs: Problem[] = [];
    if (s.lagP99 > L.lagMs) probs.push({ key: 'lag', title: '🐢 السيرفر بطيء', text: `السيرفر يتأخر ${s.lagP99}ms بالرد (الطبيعي أقل من 100). يمكن الضغط عالي.` });
    if (s.rssMb > L.rssMb) probs.push({ key: 'mem', title: '🧠 الذاكرة عالية', text: `السيرفر يستخدم ${s.rssMb}MB من الذاكرة (الحد ${L.rssMb}MB).` });
    if (s.reqs >= 20 && s.errs / s.reqs * 100 > L.errPct) probs.push({ key: 'err', title: '⚠️ أخطاء كثيرة', text: `${s.errs} طلب فشل من ${s.reqs} آخر دقيقة.` });
    if (s.p95Ms > L.slowMs && s.reqs >= 20) probs.push({ key: 'slow', title: '⏳ الصفحات بطيئة', text: `أبطأ الطلبات تاخذ ${s.p95Ms}ms.` });
    if (failing.length) probs.push({ key: 'disk', title: '💾 مشكلة بحفظ البيانات', text: `ما قدرنا نحفظ: ${failing.slice(0, 5).join('، ')}. شيك على مساحة القرص.` });
    for (const p of probs) { const since = this.active.get(p.key); if (!since) { this.active.set(p.key, now); this.deps.alert(p.title, p.text); this.deps.log?.('monitor_alert', { key: p.key }); } }
    for (const k of [...this.active.keys()]) if (!probs.some((p) => p.key === k)) { this.active.delete(k); this.deps.alert('✅ رجع طبيعي', ({ lag: 'سرعة السيرفر', mem: 'الذاكرة', err: 'الأخطاء', slow: 'سرعة الصفحات', disk: 'حفظ البيانات' } as Record<string, string>)[k] + ' رجعت طبيعية.'); }
  }
  view() {
    const last = this.hist.at(-1) ?? null, mem = process.memoryUsage();
    return { uptimeMin: Math.round((Date.now() - this.started) / 60000), now: last, live: { rssMb: Math.round(mem.rss / 1048576), heapMb: Math.round(mem.heapUsed / 1048576), lagP99: Math.round(this.h.percentile(99) / 1e6), online: this.deps.online() },
      problems: [...this.active.keys()], storage: this.deps.storage(), node: process.version, cpus: os.cpus().length, load: os.loadavg().map((x) => Math.round(x * 100) / 100),
      hist: this.hist.slice(-120).map((s) => ({ at: s.at, lag: s.lagP99, rss: s.rssMb, reqs: s.reqs, avg: s.avgMs, errs: s.errs, online: s.online, cpu: s.cpu })) };
  }
}
