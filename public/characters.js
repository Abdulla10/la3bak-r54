/* شخصيات «لعبك» الأصلية: أربع شخصيات حيوانية مرسومة بالكامل عندنا (مو من أي لعبة ثانية).
   كل مقعد/لون له شخصية: مها (أخضر)، صقر (أصفر)، ثعلب (أحمر)، جمل (أزرق). */
export const CHARS = [
  { id: 'oryx', name: 'أبو سعد', color: '#3fbf6f' },
  { id: 'falcon', name: 'أبو فهد', color: '#f2b632' },
  { id: 'fox', name: 'أم نورة', color: '#e8505b' },
  { id: 'camel', name: 'سلطان', color: '#4a90e2' },
];
/* أربع شخصيات بشرية من رسمنا (مو من أي لعبة): شماغ أبيض، شماغ أحمر، حجاب، قبعة بيضاء. المعرّفات قديمة (oryx…) بس الرسم جديد. */
const EYES = (y = 31) => `<circle cx="27.6" cy="${y}" r="1.9" fill="#231710"/><circle cx="36.4" cy="${y}" r="1.9" fill="#231710"/><circle cx="28.2" cy="${y - 0.7}" r=".6" fill="#fff"/><circle cx="37" cy="${y - 0.7}" r=".6" fill="#fff"/>`;
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="ch-oryx" viewBox="0 0 64 64">
  <path d="M4 64C6 51 19 46 32 46C45 46 58 51 60 64Z" fill="#f4f1e8"/>
  <path d="M26 46L32 54L38 46Z" fill="#d9d3c0"/>
  <rect x="27" y="39" width="10" height="9" rx="3" fill="#d29a6a"/>
  <path d="M10 44C8 20 18 8 32 8C46 8 56 20 54 44C50 40 48 34 47 28L17 28C16 34 14 40 10 44Z" fill="#fbfbf7" stroke="#d6d2c4" stroke-width="1"/>
  <ellipse cx="32" cy="31" rx="11" ry="13" fill="#d9a171"/>
  <path d="M15 20C21 12 43 12 49 20L48 24C42 17 22 17 16 24Z" fill="#1b1b1b"/>
  <path d="M20 19C26 14 38 14 44 19" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1"/>
  ${EYES()}<path d="M25 27.5q2.6-1.6 5 0M34 27.5q2.6-1.6 5 0" stroke="#3a2416" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <path d="M22 36C23 47 41 47 42 36C39 41 25 41 22 36Z" fill="#2a1a12"/><path d="M28.5 40.5q3.5 2 7 0" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/></symbol>
<symbol id="ch-falcon" viewBox="0 0 64 64">
  <path d="M4 64C6 51 19 46 32 46C45 46 58 51 60 64Z" fill="#d8c3a0"/>
  <rect x="27" y="39" width="10" height="9" rx="3" fill="#b9825a"/>
  <path d="M9 46C6 20 17 7 32 7C47 7 58 20 55 46C51 42 49 36 48 29L16 29C15 36 13 42 9 46Z" fill="#d6403f"/>
  <path d="M12 30l4-3M19 22l4-3M26 14l4-3M34 11l4 3M41 15l4 4M46 22l3 4M14 40l4-2M50 40l-4-2" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>
  <ellipse cx="32" cy="31" rx="11" ry="13" fill="#c68a5b"/>
  <path d="M15 19C21 11 43 11 49 19L48 23C42 16 22 16 16 23Z" fill="#161616"/>
  ${EYES()}<path d="M25 27.5q2.6-1.6 5 0M34 27.5q2.6-1.6 5 0" stroke="#2a180e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M26 37q6-3 12 0" stroke="#2a180e" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28.5 40.5q3.5 1.8 7 0" stroke="#5a2a20" stroke-width="1.4" fill="none" stroke-linecap="round"/></symbol>
<symbol id="ch-fox" viewBox="0 0 64 64">
  <path d="M3 64C5 51 18 46 32 46C46 46 59 51 61 64Z" fill="#2c3e57"/>
  <path d="M8 46C4 22 14 6 32 6C50 6 60 22 56 46C52 52 46 56 32 58C18 56 12 52 8 46Z" fill="#1f8f8a"/>
  <path d="M14 40C12 24 20 12 32 12C44 12 52 24 50 40C46 46 40 50 32 50C24 50 18 46 14 40Z" fill="#17716d"/>
  <ellipse cx="32" cy="31" rx="11.5" ry="14" fill="#edbd96"/>
  <path d="M20 22C24 14 40 14 44 22C40 19 24 19 20 22Z" fill="#1f8f8a"/>
  ${EYES(31)}<path d="M25.4 29.4l-1-1M38.6 29.4l1-1M24.6 31l-1.4 0M39.4 31l1.4 0" stroke="#231710" stroke-width="1.1" stroke-linecap="round"/><path d="M25 27q3-2 6 0M33 27q3-2 6 0" stroke="#4a2f1f" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <path d="M32 33l-1.2 4h2.4" stroke="#c98f66" stroke-width="1" fill="none"/><path d="M28 41q4 3 8 0q-4 1.2-8 0Z" fill="#c9364a"/></symbol>
<symbol id="ch-camel" viewBox="0 0 64 64">
  <path d="M4 64C6 51 19 46 32 46C45 46 58 51 60 64Z" fill="#35527a"/>
  <path d="M26 46L32 53L38 46Z" fill="#26405f"/>
  <rect x="27" y="39" width="10" height="9" rx="3" fill="#a9724a"/>
  <path d="M20 22C20 14 25 9 32 9C39 9 44 14 44 22Z" fill="#fff"/>
  <path d="M20 22C26 19 38 19 44 22L44 25C38 22 26 22 20 25Z" fill="#e6e6e6"/><path d="M24 12l2 9M30 10l1 10M36 10l-1 10M41 12l-2 9" stroke="#d0d0d0" stroke-width="1" opacity=".8"/>
  <path d="M19 26C18 18 22 20 21 27Z M45 26C46 18 42 20 43 27Z" fill="#1d1410"/>
  <ellipse cx="32" cy="32" rx="11.5" ry="13" fill="#b9825a"/>
  <path d="M20.5 25C24 21 40 21 43.5 25L43 28C39 24.5 25 24.5 21 28Z" fill="#1d1410"/>
  ${EYES(31.5)}<path d="M25 28.2q2.6-1.5 5 0M34 28.2q2.6-1.5 5 0" stroke="#1d1410" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M21 35C22 46 42 46 43 35C41 38 38 39 32 39C26 39 23 38 21 35Z" fill="#1d1410"/><path d="M28.5 41q3.5 2 7 0" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/></symbol>
</defs></svg>`;
export function mountSprite() {
  if (document.getElementById('chSprite')) return;
  const d = document.createElement('div');
  d.id = 'chSprite'; d.innerHTML = SPRITE;
  document.body.prepend(d);
}
export const charOf = (seat) => CHARS[((seat % 4) + 4) % 4];
/** وجه الشخصية داخل SVG بمركز (x,y) ونصف قطر r */
export const faceSvg = (seat, x, y, r) => `<use href="#ch-${charOf(seat).id}" x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}"/>`;
/** وجه الشخصية كعنصر HTML */
export const faceHtml = (seat, size = 40) => `<svg class="ch-face" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><use href="#ch-${charOf(seat).id}"/></svg>`;
