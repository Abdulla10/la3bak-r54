/* R69zu: التقاط أخطاء المتصفح عند اللاعبين. نجمع الأخطاء المتشابهة بمجموعة وحدة (نفس الرسالة ونفس الملف والسطر)
 * ونعدّ كم مرة صارت وكم لاعب. أي خطأ يتكرر عند ناس كثير يوصل تنبيه للمالك. ما نحفظ أي بيانات شخصية. */
import { createHash } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

type Group = { id: string; msg: string; src: string; line: number; col: number; stack: string; count: number; users: string[]; first: number; last: number; routes: string[]; ua: string; ver: string; fixed?: number };
type Data = { v: 1; groups: Record<string, Group> };
const clip = (s: unknown, n: number) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
/** نشيل الأرقام المتغيرة والروابط الخاصة عشان نفس الخطأ ينحسب مجموعة وحدة */
const norm = (s: string) => s.replace(/\?v=[\w.-]+/g, '').replace(/https?:\/\/[^/\s]+/g, '').replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '<id>').replace(/\d{4,}/g, '<n>');

export class ClientErrors {
  private d: Data; private disk: Persister;
  constructor(file: string, private deps: { alert: (title: string, text: string, key: string) => void; now?: () => number }, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.groups);
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = loaded ? (loaded as unknown as Data) : { v: 1, groups: {} };
    this.disk = new Persister('client-errors', file, () => this.d, deps.now ?? Date.now, mon, valid);
  }
  private get now() { return (this.deps.now ?? Date.now)(); }
  report(uid: string, raw: unknown) {
    if (!isObj(raw)) return false;
    const msg = norm(clip(raw.msg, 300)).trim(); if (!msg || /ResizeObserver loop|Script error\.?$|cancelled|AbortError|Load failed|NotAllowedError|play\(\) request/i.test(msg)) return false;
    const src = norm(clip(raw.src, 160)), line = Math.max(0, Math.min(1e7, Number(raw.line) || 0)), col = Math.max(0, Math.min(1e7, Number(raw.col) || 0));
    const id = createHash('sha1').update(msg + '|' + src + '|' + line).digest('hex').slice(0, 12);
    const t = this.now; let g = this.d.groups[id];
    if (!g) {
      const keys = Object.keys(this.d.groups); if (keys.length >= 300) { const oldest = keys.sort((a, b) => this.d.groups[a].last - this.d.groups[b].last)[0]; delete this.d.groups[oldest]; }
      g = this.d.groups[id] = { id, msg, src, line, col, stack: norm(clip(raw.stack, 1200)), count: 0, users: [], first: t, last: t, routes: [], ua: clip(raw.ua, 160), ver: clip(raw.ver, 20) };
    }
    if (g.fixed && t - g.fixed > 0) { delete g.fixed; g.count = 0; g.users = []; g.first = t; }
    g.count++; g.last = t; g.ua = clip(raw.ua, 160) || g.ua; g.ver = clip(raw.ver, 20) || g.ver;
    const uh = createHash('sha1').update('u|' + uid).digest('hex').slice(0, 10); if (!g.users.includes(uh)) { g.users.push(uh); if (g.users.length > 200) g.users.shift(); }
    const route = clip(raw.route, 40).replace(/\/[\w-]{5,}$/, '/…'); if (route && !g.routes.includes(route)) { g.routes.push(route); if (g.routes.length > 6) g.routes.shift(); }
    this.disk.save();
    if (g.users.length === 3 || g.users.length === 20 || g.users.length === 100) try { this.deps.alert('🐞 خطأ يتكرر عند اللاعبين', `${g.users.length} لاعب واجهوا: ${g.msg.slice(0, 100)} (${g.src.split('/').pop()}:${g.line})`, 'cerr-' + id + '-' + g.users.length); } catch { /* */ }
    return true;
  }
  list() { return Object.values(this.d.groups).sort((a, b) => b.users.length - a.users.length || b.last - a.last).slice(0, 60).map(({ users, ...g }) => ({ ...g, people: users.length })); }
  fixed(id: string) { const g = this.d.groups[id]; if (!g) return false; g.fixed = this.now; this.disk.save(); return true; }
  clear() { this.d.groups = {}; this.disk.save(); }
  stats() { const gs = Object.values(this.d.groups), day = this.now - 86400_000; return { groups: gs.length, today: gs.filter((g) => g.last > day).reduce((a, g) => a + g.count, 0) }; }
}
