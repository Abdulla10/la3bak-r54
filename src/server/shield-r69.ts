/* R69zk: درع الحماية — يصد الضغط الوهمي (طلبات كثيرة من نفس الجهاز/الشبكة)، ويحظر المهاجم مؤقت،
 * ويحد اتصالات الـ WebSocket، ويطلب «إثبات عمل» خفيف (حساب صغير يسويه الجوال بثانية) عند فتح حساب جديد
 * عشان برامج البوت ما تقدر تسوي آلاف الحسابات. ما نحفظ أي IP: كله بالذاكرة ويمسح نفسه. */
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { TokenBucket } from './ratelimit.js';

type Strike = { n: number; first: number };
export class Shield {
  private buckets = new Map<string, TokenBucket>();
  private strikes = new Map<string, Strike>();
  private banned = new Map<string, number>();
  private wsOpen = new Map<string, number>();
  private wsRate = new Map<string, TokenBucket>();
  private signups = new Map<string, number[]>();
  private usedPow = new Map<string, number>();
  stats = { blocked: 0, bans: 0, wsBlocked: 0, powFail: 0, signups: 0, since: Date.now() };
  recentBans: { at: number; key: string; why: string }[] = [];
  constructor(private secret: string, private opt: { burst?: number; perSec?: number; banMs?: number; strikes?: number; wsPerIp?: number; onBan?: (key: string, why: string) => void; now?: () => number } = {}) {
    const t = setInterval(() => this.sweep(), 60_000); t.unref?.();
  }
  private get now() { return (this.opt.now ?? Date.now)(); }
  /** مفتاح مختصر (ما نحفظ الـ IP نفسه). IPv6 نجمعه على /64 */
  key(ip: string) { const v = ip.includes(':') && !ip.startsWith('::ffff:') ? ip.split(':').slice(0, 4).join(':') : ip.replace(/^::ffff:/, ''); return createHmac('sha256', this.secret).update('ip|' + v).digest('base64url').slice(0, 16); }
  isBanned(k: string) { const u = this.banned.get(k); if (!u) return false; if (u < this.now) { this.banned.delete(k); return false; } return true; }
  ban(k: string, why: string) {
    if (this.isBanned(k)) return; this.banned.set(k, this.now + (this.opt.banMs ?? 10 * 60_000)); this.stats.bans++;
    this.recentBans.unshift({ at: this.now, key: k.slice(0, 6), why }); if (this.recentBans.length > 30) this.recentBans.pop();
    try { this.opt.onBan?.(k, why); } catch { /* */ }
  }
  /** كل طلب HTTP. يرجع false لو لازم نرفضه */
  allow(k: string, weight = 1): boolean {
    if (this.isBanned(k)) { this.stats.blocked++; return false; }
    let b = this.buckets.get(k); if (!b) { if (this.buckets.size > 50_000) this.buckets.clear(); b = new TokenBucket(this.opt.burst ?? 400, this.opt.perSec ?? 12, () => this.now); this.buckets.set(k, b); }
    let ok = true; for (let i = 0; i < weight; i++) if (!b.take()) { ok = false; break; }
    if (ok) return true;
    this.stats.blocked++;
    const s = this.strikes.get(k); const t = this.now;
    if (!s || t - s.first > 60_000) this.strikes.set(k, { n: 1, first: t });
    else if (++s.n >= (this.opt.strikes ?? 40)) { this.strikes.delete(k); this.ban(k, 'طلبات كثيرة جداً'); }
    return false;
  }
  wsOpenOk(k: string): boolean {
    if (this.isBanned(k)) { this.stats.wsBlocked++; return false; }
    let r = this.wsRate.get(k); if (!r) { if (this.wsRate.size > 50_000) this.wsRate.clear(); r = new TokenBucket(30, 0.5, () => this.now); this.wsRate.set(k, r); }
    if (!r.take() || (this.wsOpen.get(k) ?? 0) >= (this.opt.wsPerIp ?? 60)) { this.stats.wsBlocked++; return false; }
    this.wsOpen.set(k, (this.wsOpen.get(k) ?? 0) + 1); return true;
  }
  wsClosed(k: string) { const n = (this.wsOpen.get(k) ?? 1) - 1; if (n <= 0) this.wsOpen.delete(k); else this.wsOpen.set(k, n); }
  /** صعوبة إثبات العمل: تزيد لو الشبكة فتحت حسابات كثيرة (ما نمنع: البيوت والكافيهات يتشاركون نت) */
  powBits(k: string) { const n = (this.signups.get(k) ?? []).filter((t) => this.now - t < 3600_000).length; return n < 5 ? 14 : n < 20 ? 17 : n < 60 ? 19 : 21; }
  challenge(k: string) { const bits = this.powBits(k); const ts = this.now; const sig = createHmac('sha256', this.secret).update(`pow|${k}|${ts}|${bits}`).digest('base64url').slice(0, 22); return { c: `${ts}.${bits}.${sig}`, bits }; }
  /** يتحقق: sha256(c + ':' + nonce) يبدأ بعدد bits أصفار */
  verify(k: string, c: unknown, nonce: unknown): boolean {
    const bad = () => { this.stats.powFail++; return false; };
    if (typeof c !== 'string' || typeof nonce !== 'string' || nonce.length > 24 || !/^\d+\.\d+\.[A-Za-z0-9_-]{22}$/.test(c)) return bad();
    const [tsS, bitsS, sig] = c.split('.'); const ts = Number(tsS), bits = Number(bitsS);
    if (this.now - ts > 10 * 60_000 || ts > this.now + 60_000) return bad();
    const want = Buffer.from(createHmac('sha256', this.secret).update(`pow|${k}|${ts}|${bits}`).digest('base64url').slice(0, 22));
    if (!timingSafeEqual(want, Buffer.from(sig))) return bad();
    if (this.usedPow.has(c)) return bad();
    const h = createHash('sha256').update(c + ':' + nonce).digest();
    let z = 0; for (const byte of h) { if (byte === 0) { z += 8; continue; } z += Math.clz32(byte) - 24; break; }
    if (z < bits) return bad();
    this.usedPow.set(c, ts); return true;
  }
  noteSignup(k: string) { const l = (this.signups.get(k) ?? []).filter((t) => this.now - t < 3600_000); l.push(this.now); this.signups.set(k, l.slice(-200)); this.stats.signups++; }
  view() { return { ...this.stats, bannedNow: [...this.banned.values()].filter((u) => u > this.now).length, recent: this.recentBans.slice(0, 10) }; }
  private sweep() {
    const t = this.now;
    for (const [k, u] of this.banned) if (u < t) this.banned.delete(k);
    for (const [k, s] of this.strikes) if (t - s.first > 60_000) this.strikes.delete(k);
    for (const [c, ts] of this.usedPow) if (t - ts > 11 * 60_000) this.usedPow.delete(c);
    for (const [k, l] of this.signups) { const f = l.filter((x) => t - x < 3600_000); if (f.length) this.signups.set(k, f); else this.signups.delete(k); }
    if (this.buckets.size > 20_000) this.buckets.clear();
  }
}
