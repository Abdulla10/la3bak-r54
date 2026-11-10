/* R69ze: تشفير الرسائل الخاصة من طرف لطرف. السيرفر يحفظ «المفاتيح العامة» بس (لكل جهاز مفتاح)،
 * والمفتاح السري ما يطلع من جهاز اللاعب أبد. الرسالة تتشفر على الجهاز قبل لا توصل السيرفر، فلا السيرفر
 * ولا المشرف ولا الإدارة يقدرون يقرونها. */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export const E2E_MAX_DEVICES = 6;
const DEV = /^[A-Za-z0-9_-]{16,40}$/, COORD = /^[A-Za-z0-9_-]{43}$/;
export type E2EKey = { dev: string; x: string; y: string; at: number };
type Data = { v: 1; keys: Record<string, E2EKey[]> };

export class E2EKeys {
  private d: Data; private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && isObj(x.keys);
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = loaded ? (loaded as unknown as Data) : { v: 1, keys: {} };
    this.disk = new Persister('e2e-keys', file, () => this.d, now, mon, valid);
  }
  /** يسجل مفتاح الجهاز العام (P-256). لو الحساب عنده أكثر من 6 أجهزة، أقدم جهاز يطلع. */
  put(uid: string, input: { dev?: unknown; x?: unknown; y?: unknown }) {
    if (!isObj(input) || typeof input.dev !== 'string' || !DEV.test(input.dev) || typeof input.x !== 'string' || !COORD.test(input.x) || typeof input.y !== 'string' || !COORD.test(input.y)) return { ok: false as const, error: 'مفتاح غير صالح.' };
    const list = this.d.keys[uid] ?? (this.d.keys[uid] = []), t = this.now();
    const old = list.find((k) => k.dev === input.dev);
    if (old && old.x === input.x && old.y === input.y) { if (t - old.at > 86400_000 * 7) { old.at = t; this.disk.save(); } return { ok: true as const, devices: list.length }; }
    if (old) { old.x = input.x; old.y = input.y; old.at = t; } else { list.push({ dev: input.dev, x: input.x, y: input.y, at: t }); }
    list.sort((a, b) => b.at - a.at); if (list.length > E2E_MAX_DEVICES) list.length = E2E_MAX_DEVICES;
    this.disk.save(); return { ok: true as const, devices: list.length };
  }
  get(uid: string) { return (this.d.keys[uid] ?? []).map(({ dev, x, y }) => ({ dev, x, y })); }
  count() { return Object.keys(this.d.keys).length; }
}
