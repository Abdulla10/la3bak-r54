/** R68z: إعادة المباراة — نسجل لقطات المباراة (من عين أول لاعب) ونحفظها مضغوطة لما تخلص.
 * الملفات: replays/<ref>.json.gz — ونحتفظ بآخر 400 مباراة بس. */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

export type ReplayMeta = { ref: string; game: string; at: number; players: { id: string; name: string }[]; viewer: string; frames: number };
type Buf = { ref: string; game: string; viewer: string; players: { id: string; name: string }[]; frames: { t: number; s: unknown }[]; last: string; at: number };
const MAX_FRAMES = 240, MAX_KEEP = 400, MAX_BUFFERS = 300;
const safeRef = (ref: string) => /^[A-Za-z0-9_-]{2,40}:\d{1,6}$/.test(ref);
const fileOf = (dir: string, ref: string) => path.join(dir, ref.replace(':', '_') + '.json.gz');

export class Replays {
  private live = new Map<string, Buf>();
  private index: ReplayMeta[] = [];
  private mem = new Map<string, Buffer>();
  constructor(private dir: string, private now: () => number = Date.now) {
    if (dir) { try { fs.mkdirSync(dir, { recursive: true }); const raw = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')); if (Array.isArray(raw)) this.index = raw.slice(-MAX_KEEP); } catch { /* أول مرة */ } }
  }
  /** لقطة جديدة (نتجاهل المكررة) */
  frame(ref: string, game: string, viewer: string, players: { id: string; name: string }[], snap: unknown) {
    if (!safeRef(ref)) return;
    let b = this.live.get(ref);
    if (!b) { if (this.live.size >= MAX_BUFFERS) { const old = [...this.live.values()].sort((x, y) => x.at - y.at)[0]; if (old) this.live.delete(old.ref); } b = { ref, game, viewer, players, frames: [], last: '', at: this.now() }; this.live.set(ref, b); }
    const s = JSON.stringify(snap, (k, v) => (k === 'serverNow' || k === 'chat' ? undefined : v));
    if (s === b.last) return; b.last = s; b.at = this.now();
    b.frames.push({ t: this.now(), s: JSON.parse(s) });
    if (b.frames.length > MAX_FRAMES) b.frames.splice(1, b.frames.length - MAX_FRAMES); // نخلي أول لقطة
  }
  viewerOf(ref: string): string | null { return this.live.get(ref)?.viewer ?? null; }
  /** المباراة خلصت: نحفظها */
  finish(ref: string, players?: { id: string; name: string }[]) {
    const b = this.live.get(ref); if (!b || b.frames.length < 2) { this.live.delete(ref); return; }
    this.live.delete(ref);
    const meta: ReplayMeta = { ref, game: b.game, at: this.now(), players: players?.length ? players : b.players, viewer: b.viewer, frames: b.frames.length };
    const buf = gzipSync(Buffer.from(JSON.stringify({ ...meta, list: b.frames })));
    if (this.dir) { try { fs.writeFileSync(fileOf(this.dir, ref), buf); } catch { return; } } else this.mem.set(ref, buf);
    this.index = [...this.index.filter((m) => m.ref !== ref), meta];
    while (this.index.length > MAX_KEEP) { const old = this.index.shift()!; if (this.dir) fs.rm(fileOf(this.dir, old.ref), { force: true }, () => {}); else this.mem.delete(old.ref); }
    if (this.dir) { try { fs.writeFileSync(path.join(this.dir, 'index.json'), JSON.stringify(this.index)); } catch { /* الفهرس يتصلح بالحفظ الجاي */ } }
  }
  meta(ref: string): ReplayMeta | null { return this.index.find((m) => m.ref === ref) ?? null; }
  of(userId: string, n = 20): ReplayMeta[] { return this.index.filter((m) => m.players.some((p) => p.id === userId)).slice(-n).reverse(); }
  load(ref: string): (ReplayMeta & { list: { t: number; s: unknown }[] }) | null {
    if (!safeRef(ref) || !this.meta(ref)) return null;
    try { const buf = this.dir ? fs.readFileSync(fileOf(this.dir, ref)) : this.mem.get(ref); return buf ? JSON.parse(gunzipSync(buf).toString('utf8')) : null; } catch { return null; }
  }
}
