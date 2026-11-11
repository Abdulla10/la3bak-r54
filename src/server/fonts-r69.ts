/* R69zz: الخط العربي (Cairo + Lalezar) من سيرفرنا بدل Google: أول مرة السيرفر ينزّله ويحفظه، وبعدها كل اللاعبين ياخذونه من عندنا
 * (أسرع، بدون وميض بالنص، ويشتغل حتى لو Google بطيء). لو التنزيل فشل نحوّل لـ Google مثل قبل. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const GOOGLE_FONTS = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Lalezar&display=swap';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
export class FontCache {
  private css: string | null = null; private pending: Promise<string | null> | null = null; private failedAt = 0;
  constructor(private dir: string) { try { const f = path.join(dir, 'la3bak.css'); if (existsSync(f)) this.css = readFileSync(f, 'utf8'); } catch { /* */ } }
  async getCss(): Promise<string | null> {
    if (this.css) return this.css;
    if (Date.now() - this.failedAt < 10 * 60_000) return null;
    this.pending ??= (async () => {
      try {
        const r = await fetch(GOOGLE_FONTS, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error('css ' + r.status);
        let css = await r.text(); mkdirSync(this.dir, { recursive: true });
        const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
        for (const u of urls) {
          const name = createHash('sha1').update(u).digest('hex').slice(0, 16) + '.woff2'; const f = path.join(this.dir, name);
          if (!existsSync(f)) { const fr = await fetch(u, { signal: AbortSignal.timeout(15000) }); if (!fr.ok) throw new Error('font ' + fr.status); writeFileSync(f, Buffer.from(await fr.arrayBuffer())); }
          css = css.split(u).join('/fonts/' + name);
        }
        css = css.replace(/font-display:\s*\w+/g, 'font-display: swap');
        writeFileSync(path.join(this.dir, 'la3bak.css'), css); this.css = css; return css;
      } catch { this.failedAt = Date.now(); return null; } finally { this.pending = null; }
    })();
    return this.pending;
  }
  file(name: string) { if (!/^[0-9a-f]{16}\.woff2$/.test(name)) return null; const f = path.join(this.dir, name); return existsSync(f) ? readFileSync(f) : null; }
}
