/* R71: صور أخف — لما جوال اللاعب يدعم AVIF (كل الآيفونات من iOS 16 وأغلب الأندرويد) نرسل له نسخة AVIF أصغر 30–70% بنفس الشكل.
 * النسخ تنصنع بالخلفية أول مرة تنطلب كل صورة (صورة وحدة كل مرة عشان ما نثقّل السيرفر)، وتنحفظ بمجلد كاش خارج الكود.
 * لو النسخة ما وفّرت شي (أقل من 12%) نحفظ علامة وما نعيد المحاولة. AVIF=0 يطفيه. */
import { createHash } from 'node:crypto';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import path from 'node:path';

type Sharp = (input: string) => { avif(o: { quality: number; effort: number }): { toBuffer(): Promise<Buffer> } };

export class AvifCache {
  private queue: { src: string; out: string }[] = [];
  private queued = new Set<string>();
  private busy = false;
  private sharp: Sharp | null | undefined;
  stats = { made: 0, skipped: 0, failed: 0, served: 0 };
  constructor(private dir: string, private log: (e: string, d?: Record<string, unknown>) => void = () => {}) {
    try { mkdirSync(dir, { recursive: true }); } catch { /* */ }
  }
  private key(file: string, size: number, mtime: number) { return createHash('sha1').update(`${file}|${size}|${Math.floor(mtime)}`).digest('hex').slice(0, 24); }
  /** يرجع مسار نسخة AVIF جاهزة، أو null (ويجهزها بالخلفية لو تستاهل) */
  pick(file: string, st: { size: number; mtimeMs: number }): string | null {
    if (st.size < 12_000 || st.size > 6_000_000) return null;
    const k = this.key(file, st.size, st.mtimeMs), out = path.join(this.dir, k + '.avif');
    try { if (statSync(out).size > 0) { this.stats.served++; return out; } } catch { /* مو جاهزة */ }
    try { statSync(out + '.no'); return null; } catch { /* */ }
    if (!this.queued.has(out) && this.queue.length < 5000) { this.queued.add(out); this.queue.push({ src: file, out }); void this.pump(); }
    return null;
  }
  private async load(): Promise<Sharp | null> {
    if (this.sharp !== undefined) return this.sharp;
    try { const m: any = await import('sharp' as string); this.sharp = (m.default ?? m) as Sharp; } catch { this.sharp = null; this.log('avif_off', { reason: 'sharp-missing' }); }
    return this.sharp;
  }
  private async pump() {
    if (this.busy) return; this.busy = true;
    try {
      const sharp = await this.load(); if (!sharp) { this.queue = []; return; }
      while (this.queue.length) {
        const job = this.queue.shift()!;
        try {
          const buf = await sharp(job.src).avif({ quality: 52, effort: 3 }).toBuffer();
          const orig = statSync(job.src).size;
          if (buf.length < orig * 0.88) { const tmp = job.out + '.tmp'; writeFileSync(tmp, buf); await rename(tmp, job.out); this.stats.made++; }
          else { writeFileSync(job.out + '.no', ''); this.stats.skipped++; }
        } catch { this.stats.failed++; try { writeFileSync(job.out + '.no', ''); } catch { /* */ } }
        this.queued.delete(job.out);
        await new Promise((r) => setTimeout(r, 15)); // نخلي السيرفر يتنفس بين الصور
      }
    } finally { this.busy = false; }
  }
}
