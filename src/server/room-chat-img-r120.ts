// R120: صور داخل دردشة الغرفة — لأصحاب VIP القوي والنوبل فقط. الصورة تنضغط (WebP) وتنحفظ بملف، والرسالة تحمل رمز [img:id].
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const CHAT_IMG_MAX = 6 * 1024 * 1024;
export const CHAT_IMG_TOKEN = /^\[img:([a-f0-9]{24})\]$/;
const NAME = /^[a-f0-9]{24}$/;
export class RoomChatImages {
  private mem = new Map<string, Buffer>();
  constructor(private dir: string) { if (dir) { try { fs.mkdirSync(dir, { recursive: true }); } catch { /* */ } } }
  async save(input: Buffer): Promise<string> {
    const img = sharp(input, { failOn: 'error', limitInputPixels: 40_000_000, pages: 1 });
    const meta = await img.metadata(); if (!meta.width || !meta.height) throw new Error('bad_image');
    const out = await img.autoOrient().resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toBuffer();
    const id = createHash('sha256').update(out).digest('hex').slice(0, 24);
    if (this.dir) fs.writeFileSync(path.join(this.dir, id + '.webp'), out); else { this.mem.set(id, out); if (this.mem.size > 300) this.mem.delete(this.mem.keys().next().value!); }
    return id;
  }
  get(id: string): Buffer | null { if (!NAME.test(id)) return null; if (!this.dir) return this.mem.get(id) ?? null; try { return fs.readFileSync(path.join(this.dir, id + '.webp')); } catch { return null; } }
}
