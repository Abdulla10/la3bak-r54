import sharp from 'sharp';
import { AVATAR_MAX, sniff } from './avatars.js';
const INPUT_PIXELS = 16_000_000;
const INPUT_SIDE = 4096;
const OUTPUT_SIDE = 256;
const FORMATS = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp' };
/** Public, deliberately generic: never expose decoder errors, paths, or uploaded data. */
export class ValidationError extends Error {
    code = 'invalid_avatar';
    constructor() {
        super('الملف مو صورة صالحة. استخدم صورة JPG أو PNG أو WebP ثابتة ضمن الحدود المسموحة.');
        this.name = 'ValidationError';
    }
}
/**
 * Check container completeness as well as the decoder. Some decoders accept missing
 * end markers or ignore APNG animation chunks even with failOn:'error'. This is not
 * a replacement for decoding; all accepted inputs are fully decoded below.
 */
function completeContainer(buf, type) {
    if (type === 'image/jpeg')
        return buf.length >= 4 && buf.readUInt16BE(buf.length - 2) === 0xffd9;
    if (type === 'image/png') {
        let offset = 8;
        let first = true;
        while (offset + 12 <= buf.length) {
            const length = buf.readUInt32BE(offset);
            const end = offset + 12 + length;
            if (end > buf.length)
                return false;
            const chunk = buf.toString('ascii', offset + 4, offset + 8);
            if (first && (chunk !== 'IHDR' || length !== 13))
                return false;
            first = false;
            if (['acTL', 'fcTL', 'fdAT'].includes(chunk))
                return false;
            if (chunk === 'IEND')
                return length === 0 && end === buf.length;
            offset = end;
        }
        return false;
    }
    if (buf.length < 20 || buf.readUInt32LE(4) + 8 !== buf.length)
        return false;
    let offset = 12;
    while (offset + 8 <= buf.length) {
        const chunk = buf.toString('ascii', offset, offset + 4);
        const length = buf.readUInt32LE(offset + 4);
        const end = offset + 8 + length + (length % 2);
        if (end > buf.length)
            return false;
        if (chunk === 'ANIM' || chunk === 'ANMF')
            return false;
        // VP8X bit 1 advertises animation even if animation chunks are malformed.
        if (chunk === 'VP8X' && (length < 10 || (buf[offset + 8] & 2) !== 0))
            return false;
        offset = end;
    }
    return offset === buf.length;
}
/**
 * The HTTP avatar handler must await this BEFORE calling synchronous Avatars.set.
 * Original input <=150 KiB, one static frame, <=4096 per side and <=16M pixels.
 * Output is always a freshly encoded, metadata-free WebP, <=256 per side/150 KiB.
 * Does not read paths or write any files; community uploads are intentionally separate.
 */
export async function normalizeAvatar(buf, type) {
    try {
        if (!Buffer.isBuffer(buf) || !buf.length || buf.length > AVATAR_MAX ||
            !Object.hasOwn(FORMATS, type) || sniff(buf) !== type || !completeContainer(buf, type))
            throw new ValidationError();
        const image = sharp(buf, { failOn: 'error', limitInputPixels: INPUT_PIXELS, pages: 1, sequentialRead: true });
        let warned = false;
        image.on('warning', () => { warned = true; });
        const meta = await image.metadata();
        if (warned || meta.format !== FORMATS[type] || !meta.width || !meta.height ||
            meta.width > INPUT_SIDE || meta.height > INPUT_SIDE || meta.width * meta.height > INPUT_PIXELS ||
            (meta.pages ?? 1) !== 1 || (meta.pageHeight !== undefined && meta.pageHeight !== meta.height) ||
            meta.delay !== undefined || meta.loop !== undefined)
            throw new ValidationError();
        // Force a FULL strict pixel decode before resizing: thumbnail/shrink-on-load must
        // not bypass corrupt pixel data. Raw pixels also break the metadata chain.
        const pixels = await image.autoOrient().raw().toBuffer({ resolveWithObject: true });
        if (warned)
            throw new ValidationError();
        const out = await sharp(pixels.data, {
            raw: { width: pixels.info.width, height: pixels.info.height, channels: pixels.info.channels },
            limitInputPixels: INPUT_PIXELS,
        }).resize({ width: OUTPUT_SIDE, height: OUTPUT_SIDE, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
        if (out.info.format !== 'webp' || out.info.width > OUTPUT_SIDE || out.info.height > OUTPUT_SIDE ||
            !out.data.length || out.data.length > AVATAR_MAX || sniff(out.data) !== 'image/webp')
            throw new ValidationError();
        return { buf: out.data, type: 'image/webp' };
    }
    catch {
        // Do not attach a cause: native decoder errors may contain sensitive details.
        throw new ValidationError();
    }
}
