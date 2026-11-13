// R127: الرسائل الصوتية — تسجيل قصير (لين 60 ثانية) بالخاص ودردشة الغرف. نحفظ الملف كما هو بعد ما نتأكد إنه صوت (من أول بايتات الملف).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const VN_MAX = 1_500_000;
export const VN_TOKEN = /^\[vn:([a-f0-9]{24}):(\d{1,2})\]$/;
const NAME = /^[a-f0-9]{24}$/;
/** نوع الملف من بايتاته (ما نصدّق المتصفح) */
export function sniffAudio(b: Buffer): { ext: string; type: string } | null {
  if (b.length < 16) return null;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { ext: 'webm', type: 'audio/webm' };
  if (b.toString('latin1', 4, 8) === 'ftyp') return { ext: 'm4a', type: 'audio/mp4' };
  if (b.toString('latin1', 0, 4) === 'OggS') return { ext: 'ogg', type: 'audio/ogg' };
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WAVE') return { ext: 'wav', type: 'audio/wav' };
  return null;
}
export class VoiceNotes {
  private mem = new Map<string, { b: Buffer; type: string; owner: string }>();
  private owners = new Map<string, string>();
  constructor(private dir: string) { if (dir) { try { fs.mkdirSync(dir, { recursive: true }); } catch { /* */ } } }
  save(owner: string, b: Buffer): string {
    const k = sniffAudio(b); if (!k) throw new Error('bad_audio');
    const id = createHash('sha256').update(owner).update(b).digest('hex').slice(0, 24);
    if (this.dir) { fs.writeFileSync(path.join(this.dir, `${id}.${k.ext}`), b); fs.writeFileSync(path.join(this.dir, `${id}.own`), owner); }
    else { this.mem.set(id, { b, type: k.type, owner }); if (this.mem.size > 200) this.mem.delete(this.mem.keys().next().value!); }
    return id;
  }
  get(id: string): { b: Buffer; type: string } | null {
    if (!NAME.test(id)) return null;
    if (!this.dir) { const m = this.mem.get(id); return m ? { b: m.b, type: m.type } : null; }
    for (const [ext, type] of [['m4a', 'audio/mp4'], ['webm', 'audio/webm'], ['ogg', 'audio/ogg'], ['wav', 'audio/wav']] as const) { try { return { b: fs.readFileSync(path.join(this.dir, `${id}.${ext}`)), type }; } catch { /* */ } }
    return null;
  }
  ownerOf(id: string): string | null { if (!NAME.test(id)) return null; if (!this.dir) return this.mem.get(id)?.owner ?? null; try { return fs.readFileSync(path.join(this.dir, `${id}.own`), 'utf8'); } catch { return null; } }
}
