/* R62: الأجهزة اللي دخلت الحساب + تنبيه الدخول من جهاز جديد.
   نحفظ لكل جلسة: نوع الجهاز والمتصفح (من User-Agent بشكل مختصر) ووقت أول وآخر استخدام. ما نحفظ IP ولا التوكن نفسه (بس بصمته).
   التنبيه يطلع لما جلسة جديدة تظهر لحساب عنده جهاز ثاني معروف من قبل. أول 24 ساعة بعد تشغيل الميزة ما فيه تنبيهات (عشان الأجهزة الحالية ما تعتبر جديدة). */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

type Dev = { u: string; label: string; at: number; seen: number };
type Data = { v: 1; since: number; d: Record<string, Dev> };
const valid = (v: Record<string, unknown>) => v.v === 1 && Number.isSafeInteger(v.since) && isObj(v.d) && Object.entries(v.d as object).every(([h, x]: [string, any]) => /^[0-9a-f]{64}$/.test(h) && isObj(x) && typeof x.u === 'string' && typeof x.label === 'string' && Number.isSafeInteger(x.at) && Number.isSafeInteger(x.seen));

export function deviceLabel(ua: string): string {
  const u = ua || '';
  const os = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? (/Mobile/.test(u) ? 'جوال Android' : 'تابلت Android') : /Windows/.test(u) ? 'Windows' : /Mac OS X|Macintosh/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux' : 'جهاز';
  const br = /Edg\//.test(u) ? 'Edge' : /OPR\/|Opera/.test(u) ? 'Opera' : /SamsungBrowser/.test(u) ? 'Samsung' : /CriOS|Chrome\//.test(u) ? 'Chrome' : /FxiOS|Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'متصفح';
  return `${os} · ${br}`;
}
export class Devices {
  private d: Data;
  private disk: Persister; private dirty = false; private timer: NodeJS.Timeout;
  constructor(file: string, private onNew: (user: string, label: string, hash: string) => void, mon = new StorageMonitor(), private now: () => number = Date.now) {
    this.d = { v: 1, since: now(), d: {} };
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('devices', file, () => this.d, now, mon, valid);
    if (!file || !this.d.since) this.disk.save();
    this.timer = setInterval(() => this.flush(), 5 * 60_000); this.timer.unref?.();
  }
  flush() { if (this.dirty) { this.dirty = false; this.disk.save(); } }
  stop() { clearInterval(this.timer); this.flush(); }
  /** كل طلب فيه جلسة. خفيف: يكتب بالذاكرة ويحفظ كل 5 دقايق (الجلسة الجديدة تنحفظ على طول). */
  touch(user: string, hash: string, ua: string, active: (h: string) => boolean) {
    const t = this.now(), cur = this.d.d[hash];
    if (cur && cur.u === user) { if (t - cur.seen > 10 * 60_000) { cur.seen = t; this.dirty = true; } return; }
    const label = deviceLabel(ua);
    const others = Object.entries(this.d.d).filter(([h, x]) => x.u === user && h !== hash && active(h));
    this.d.d[hash] = { u: user, label, at: t, seen: t };
    // تنظيف: نخلي آخر 15 جهاز لكل لاعب
    const mine = Object.entries(this.d.d).filter(([, x]) => x.u === user).sort((a, b) => b[1].seen - a[1].seen); for (const [h] of mine.slice(15)) delete this.d.d[h];
    this.disk.save();
    if (others.length && t - this.d.since > 24 * 3600_000) { try { this.onNew(user, label, hash); } catch { /* التنبيه بس */ } }
  }
  list(user: string, current: string | null, active: (h: string) => boolean) {
    return Object.entries(this.d.d).filter(([h, x]) => x.u === user && active(h)).sort((a, b) => b[1].seen - a[1].seen).map(([h, x]) => ({ id: h.slice(0, 16), label: x.label, at: x.at, seen: x.seen, current: h === current }));
  }
  resolve(user: string, shortId: string): string | null { const e = Object.entries(this.d.d).find(([h, x]) => x.u === user && h.startsWith(shortId) && shortId.length === 16); return e ? e[0] : null; }
}
