/* R69ze: بحث ذكي بالعربي — يوحّد الحروف (أ إ آ ا، ة ه، ى ي، ؤ و، ئ ي)، ويشيل التشكيل والمكرر،
 * ويتحمل غلطة أو غلطتين بالكتابة. ترتيب النتائج: مطابق > يبدأ بـ > يحتوي > قريب. */
export function foldAr(v) {
  return String(v ?? '').normalize('NFKC').toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')            // تشكيل وتطويل
    .replace(/[إأآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/(.)\1{2,}/gu, '$1$1').trim();
}
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (cur[j] < best) best = cur[j]; }
    if (best > max) return max + 1; prev = cur;
  }
  return prev[b.length];
}
/** درجة التطابق (0 = ما يطابق). كل ما كبرت أحسن */
export function fuzzyScore(query, text) {
  const q = foldAr(query), t = foldAr(text); if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(' ').some((w) => w.startsWith(q))) return 70;
  if (t.includes(q)) return 60;
  if (q.length < 3) return 0;
  const allowed = q.length <= 4 ? 1 : 2;
  let best = 99;
  for (const w of [t, ...t.split(' ')]) { const piece = w.slice(0, Math.max(q.length, Math.min(w.length, q.length + 1))); best = Math.min(best, lev(q, piece, allowed), lev(q, w, allowed)); }
  return best <= allowed ? 40 - best * 10 : 0;
}
