/* R69ze: الصور — ضغط تلقائي (WebP، أقصى 1280 بكسل) وحذف بيانات الصورة (مثل موقع التصوير GPS ونوع الجوال)،
 * وفحص بالذكاء الاصطناعي (Claude) قبل ما تنحفظ: الصور غير اللائقة تنرفض. */
import sharp from 'sharp';

export type ImageVerdict = { verdict: 'ok' | 'review' | 'block'; reason: string };
const MAX_SIDE = 1280;

/** نعيد ترميز الصورة: نلفّها حسب اتجاهها، نصغرها، ونحذف كل البيانات المخفية */
export async function compressImage(buf: Buffer): Promise<{ buf: Buffer; type: 'image/webp'; before: number; after: number }> {
  const out = await sharp(buf, { failOn: 'error', limitInputPixels: 24_000_000, animated: false })
    .rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 }).toBuffer(); // sharp ما ينسخ EXIF/GPS إلا لو طلبنا withMetadata
  return { buf: out, type: 'image/webp', before: buf.length, after: out.length };
}

const SYSTEM = `أنت مشرف صور لمنصة ألعاب عربية عائلية. احكم على الصورة وارجع JSON بس: {"verdict":"ok|review|block","reason":"سبب قصير بالعربي"}
block: عري أو محتوى جنسي أو إيحاء واضح، عنف ودم، أسلحة بشكل مخيف، مخدرات، رموز كراهية، صور فيها أرقام تواصل أو حسابات أو روابط للتواصل برا الموقع.
review: لبس فاضح شوي، أو شي تشك فيه، أو صورة لطفل لوحده (عشان خصوصيته).
ok: كل شي ثاني (صور شخصية عادية، ألعاب، أكل، طبيعة، ميمز عادية، رسومات).`;

export class ImageGuard {
  constructor(private opts: { key: () => string; model: string; mock: boolean; budget: () => boolean; on: () => boolean; log?: (e: string, d?: Record<string, unknown>) => void }) {}
  ready() { return this.opts.on() && (this.opts.mock || !!this.opts.key()); }
  /** يرجع null لو ما قدرنا نفحص (نسمح بالصورة عشان ما نوقف الموقع) */
  async check(buf: Buffer): Promise<ImageVerdict | null> {
    if (!this.ready() || !this.opts.budget()) return null;
    const small = await sharp(buf).resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
    if (this.opts.mock || !this.opts.key()) {
      // تجربة محلية: الصورة اللي أغلبها أحمر صافي تنرفض
      const s = await sharp(small).stats(); const [r, g, b] = s.channels.map((c) => c.mean);
      return r > 180 && g < 60 && b < 60 ? { verdict: 'block', reason: 'صورة مخالفة (تجربة محلية)' } : { verdict: 'ok', reason: '' };
    }
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: AbortSignal.timeout(20_000),
        headers: { 'x-api-key': this.opts.key(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.opts.model, max_tokens: 150, system: SYSTEM, messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: small.toString('base64') } },
          { type: 'text', text: 'احكم على هالصورة.' } ] }] }),
      });
      if (!r.ok) { this.opts.log?.('image_guard_http', { status: r.status }); return null; }
      const j = await r.json() as { content?: { type: string; text?: string }[] };
      const raw = (j.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
      const m = /\{[\s\S]*\}/.exec(raw); let o: Record<string, unknown> = {}; try { o = m ? JSON.parse(m[0]) : {}; } catch { o = {}; }
      const verdict = o.verdict === 'block' || o.verdict === 'review' ? o.verdict : 'ok';
      return { verdict, reason: String(o.reason ?? '').slice(0, 120) };
    } catch (e) { this.opts.log?.('image_guard_failed', { error: String(e).slice(0, 80) }); return null; }
  }
}
