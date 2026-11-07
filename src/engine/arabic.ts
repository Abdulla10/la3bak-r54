const TASHKEEL = /[ً-ٰٟۖ-ۭـ]/g;

/** يشيل التشكيل والتطويل ويوحّد أشكال الألف والياء */
export function normalizeArabic(input: string): string {
  return input
    .normalize('NFKC')
    .replace(TASHKEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/** مفتاح مقارنة: يوحّد الكلمات المتشابهة (الجمل = جمل، مدرسة = مدرسه) */
export function compareKey(input: string): string {
  let w = normalizeArabic(input).replace(/ة/g, 'ه');
  if (w.startsWith('ال') && w.length > 3) w = w.slice(2);
  return w;
}

export function isArabicWord(input: string): boolean {
  return /^[ء-ي]+( [ء-ي]+)*$/.test(input);
}

/** أول حرف في الكلمة بعد تجاهل «ال» التعريف */
export function firstLetter(input: string): string {
  const w = normalizeArabic(input);
  const core = w.startsWith('ال') && w.length > 3 ? w.slice(2) : w;
  return core.charAt(0);
}
