import { referenceOf, referenceImage } from './reference-assets.js?v=r59d';
/* مظاهر المتجر الجديدة: أفاتارات وإطارات وخلفيات SVG أصلية بالكامل (مرسومة هنا بالكود، بدون صور خارجية).
 * الندرة ما تغيّر اللون بس: كل درجة تضيف طبقات تفاصيل (حافة، بريق، أجنحة، أشعة، تاج، حركة خفيفة).
 * الأسعار والملكية من الخادم؛ هنا الرسم فقط. */
export const RARITY = {
  common: { label: 'عادي', c: '#a9b4d0', n: 0 },
  premium: { label: 'مميز', c: '#3ddc97', n: 1 },
  rare: { label: 'نادر', c: '#4aa8ff', n: 2 },
  epic: { label: 'ملحمي', c: '#b388ff', n: 3 },
  legendary: { label: 'أسطوري', c: '#ff9f43', n: 4 },
  ultra: { label: 'فخم جدًا', c: '#ffd166', n: 5 },
};
export const RARITY_ORDER = Object.keys(RARITY);
export const rarityLv = (r) => RARITY[r]?.n ?? 0;
let uid = 0; const nid = (p) => p + (uid++).toString(36);
const INK = '#1b1730';

/* ---------- طبقات الندرة المشتركة (في إحداثيات 64×64) ---------- */
const star4 = (x, y, r, fill, cls = '') => `<path class="${cls}" d="M${x} ${y - r}l${r * .28} ${r * .72} ${r * .72} ${r * .28}-${r * .72} ${r * .28}-${r * .28} ${r * .72}-${r * .28}-${r * .72}-${r * .72}-${r * .28} ${r * .72}-${r * .28}z" fill="${fill}"/>`;
const wings64 = (c1, c2) => `<g opacity=".95"><path d="M8 40C0 30 2 16 10 10c0 8 4 12 8 14-4 2-6 8-4 14z" fill="${c1}"/><path d="M56 40c8-10 6-24-2-30 0 8-4 12-8 14 4 2 6 8 4 14z" fill="${c1}"/><path d="M9 34c-3-6-2-12 2-16M55 34c3-6 2-12-2-16" stroke="${c2}" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`;
const rays64 = (c) => `<g opacity=".35">${Array.from({ length: 12 }, (_, i) => `<path d="M32 32L${32 + 34 * Math.cos(i * Math.PI / 6 - .1)} ${32 + 34 * Math.sin(i * Math.PI / 6 - .1)}L${32 + 34 * Math.cos(i * Math.PI / 6 + .1)} ${32 + 34 * Math.sin(i * Math.PI / 6 + .1)}z" fill="${c}"/>`).join('')}</g>`;
const crown64 = (c, gem) => `<path d="M20 12l4 6 8-9 8 9 4-6 1 10H19z" fill="${c}" stroke="#8a5a12" stroke-width="1"/><circle cx="32" cy="12" r="2.2" fill="${gem}"/><circle cx="20" cy="12" r="1.6" fill="${gem}"/><circle cx="44" cy="12" r="1.6" fill="${gem}"/>`;
const medal64 = (c, gem) => `<circle cx="32" cy="58" r="5" fill="${c}" stroke="#8a5a12" stroke-width="1"/><path d="M32 54.5l1.4 2.6 2.8.4-2 2 .5 2.8-2.7-1.4-2.7 1.4.5-2.8-2-2 2.8-.4z" fill="${gem}"/>`;

/* ---------- رسوم الأنواع (رؤوس 64×64) — p = لوحة الألوان ---------- */
const eyes = (x1, x2, y, c = INK, r = 2.8) => `<ellipse cx="${x1}" cy="${y}" rx="${r}" ry="${r * 1.15}" fill="${c}"/><ellipse cx="${x2}" cy="${y}" rx="${r}" ry="${r * 1.15}" fill="${c}"/><circle cx="${x1 + r * .35}" cy="${y - r * .4}" r="${r * .35}" fill="#fff"/><circle cx="${x2 + r * .35}" cy="${y - r * .4}" r="${r * .35}" fill="#fff"/>`;
const SPECIES = {
  wolf: (p) => `<path d="M13 11l11 13h16l11-13 1 27c0 10-9 17-20 17S12 48 12 38z" fill="${p.a}"/><path d="M16 16l6 8h-6zM48 16l-6 8h6z" fill="${p.d}"/><path d="M32 21l4 8h-8z" fill="${p.b}" opacity=".75"/><path d="M22 38q10 14 20 0l-2 9q-8 7-16 0z" fill="${p.b}"/><path d="M20 31l8 2-8 2.4zM44 31l-8 2 8 2.4z" fill="${p.e}"/><ellipse cx="32" cy="41" rx="3.4" ry="2.4" fill="${INK}"/><path d="M28 47q4 2 8 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  tiger: (p) => `<circle cx="16" cy="17" r="6.5" fill="${p.a}"/><circle cx="48" cy="17" r="6.5" fill="${p.a}"/><circle cx="16" cy="17" r="3.2" fill="${p.d}"/><circle cx="48" cy="17" r="3.2" fill="${p.d}"/><ellipse cx="32" cy="35" rx="21" ry="19" fill="${p.a}"/><path d="M12 40q9-5 20 2 11-7 20-2-4 13-20 13T12 40z" fill="${p.b}"/><path d="M32 17v8M24 18l2 7M40 18l-2 7M12 30h7M45 30h7M12 36h6M46 36h6" stroke="${p.d}" stroke-width="2.6" stroke-linecap="round"/>${eyes(24.5, 39.5, 31, p.e, 2.9)}<path d="M28.5 40h7L32 44z" fill="#e5798a"/><path d="M32 44v2.4M27.5 47q4.5 3 9 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  fox: (p) => `<path d="M10 12l14 10h16l14-10-3 24c-2 12-10 19-19 19S15 48 13 36z" fill="${p.a}"/><path d="M14 17l7 5-6 4zM50 17l-7 5 6 4z" fill="${p.d}"/><path d="M15 36q8 2 17 14 9-12 17-14-4 16-17 19-13-3-17-19z" fill="${p.b}"/>${eyes(24, 40, 33, p.e, 2.5)}<ellipse cx="32" cy="45" rx="3" ry="2.2" fill="${INK}"/>`,
  panda: (p) => `<circle cx="15" cy="16" r="7.5" fill="${p.d}"/><circle cx="49" cy="16" r="7.5" fill="${p.d}"/><ellipse cx="32" cy="35" rx="22" ry="20" fill="${p.a}"/><ellipse cx="23" cy="33" rx="6.5" ry="8" transform="rotate(-25 23 33)" fill="${p.d}"/><ellipse cx="41" cy="33" rx="6.5" ry="8" transform="rotate(25 41 33)" fill="${p.d}"/><circle cx="23.5" cy="33" r="2.6" fill="#fff"/><circle cx="40.5" cy="33" r="2.6" fill="#fff"/><circle cx="24" cy="33" r="1.4" fill="${INK}"/><circle cx="40" cy="33" r="1.4" fill="${INK}"/><ellipse cx="32" cy="42" rx="3.4" ry="2.4" fill="${INK}"/><path d="M28 46q4 3 8 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>${p.band ? `<path d="M10 22q22-8 44 0v5q-22-7-44 0z" fill="${p.band}"/><path d="M53 24l7 4-6 3z" fill="${p.band}"/>` : ''}<ellipse cx="18" cy="42" rx="3" ry="2" fill="#ff9fb2" opacity=".6"/><ellipse cx="46" cy="42" rx="3" ry="2" fill="#ff9fb2" opacity=".6"/>`,
  dragon: (p) => `<path d="M18 20L10 4l14 12M46 20l8-16-14 12" fill="${p.d}" stroke="${p.d}" stroke-width="2" stroke-linejoin="round"/><path d="M12 30c0-10 9-15 20-15s20 5 20 15v8c0 9-9 16-20 16s-20-7-20-16z" fill="${p.a}"/><path d="M20 18l3 5 3-6 3 5 3-6 3 6 3-5 3 6 3-5" fill="none" stroke="${p.d}" stroke-width="2" stroke-linejoin="round"/><path d="M18 40c0-4 6-6 14-6s14 2 14 6c0 7-6 11-14 11s-14-4-14-11z" fill="${p.b}"/><ellipse cx="27" cy="41" rx="1.6" ry="2.2" fill="${INK}"/><ellipse cx="37" cy="41" rx="1.6" ry="2.2" fill="${INK}"/><path d="M17 29l9 2-9 3zM47 29l-9 2 9 3z" fill="${p.e}"/><path d="M21.5 31h1.4M41 31h1.4" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M24 48q8 4 16 0" stroke="${INK}" stroke-width="1.5" fill="none"/><path d="M8 34l4 2-4 3zM56 34l-4 2 4 3z" fill="${p.d}"/>`,
  unicorn: (p) => `<path d="M32 2l3.4 16h-6.8z" fill="${p.e}" stroke="#c08a1a" stroke-width=".8"/><path d="M30 6l4 2M29.6 10l4.8 2M29.2 14l5.6 2" stroke="#c08a1a" stroke-width=".8"/><path d="M14 20c0-4 6-6 10 0l-2 6zM50 20c0-4-6-6-10 0l2 6z" fill="${p.a}"/><path d="M15 30c0-10 8-14 17-14s17 4 17 14v10c0 10-8 15-17 15s-17-5-17-15z" fill="${p.a}"/><path d="M14 22c-6 8-4 22 2 30 0-10 2-18 8-26zM40 16c8-2 16 6 14 18-2-6-6-10-12-11z" fill="${p.d}"/><path d="M24 44c0-3 4-5 8-5s8 2 8 5-4 8-8 8-8-5-8-8z" fill="${p.b}"/><circle cx="29" cy="45" r="1.2" fill="${INK}"/><circle cx="35" cy="45" r="1.2" fill="${INK}"/>${eyes(24.5, 39.5, 32, INK, 2.6)}<path d="M20 28q4-2 8 0M36 28q4-2 8 0" stroke="${INK}" stroke-width="1.2" fill="none"/>`,
  griffin: (p) => `<path d="M10 22c4-10 12-14 22-14s18 4 22 14l-6 4c-2-6-8-10-16-10s-14 4-16 10z" fill="${p.d}"/><path d="M12 28c0-10 9-16 20-16s20 6 20 16v6c0 10-9 18-20 18s-20-8-20-18z" fill="${p.a}"/><path d="M14 26l6 2-5 3zM50 26l-6 2 5 3zM16 34l5 1-4 3zM48 34l-5 1 4 3z" fill="${p.d}"/><path d="M26 38h12l-2 8-4 6-4-6z" fill="${p.b}" stroke="#8a5a12" stroke-width="1"/><path d="M32 52l-3-6h6z" fill="#c78a1a"/>${eyes(24, 40, 31, p.e, 2.6)}<path d="M19 26l9 3M45 26l-9 3" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  king: (p) => `<path d="M18 26c0-8 6-12 14-12s14 4 14 12v8c0 10-6 16-14 16s-14-6-14-16z" fill="${p.a}"/><path d="M16 36c0 14 8 22 16 22s16-8 16-22c-4 6-8 8-16 8s-12-2-16-8z" fill="${p.d}"/><path d="M26 44q6 3 12 0" stroke="${INK}" stroke-width="1.4" fill="none"/>${eyes(26, 38, 31, INK, 2.2)}<path d="M22 26q4-2 8 0M34 26q4-2 8 0" stroke="${p.d}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M30 38q2 1 4 0" stroke="#9a5b3a" stroke-width="1.4" fill="none"/><path d="M16 22l4 5 6-9 6 7 6-7 6 9 4-5v6H16z" fill="${p.b}" stroke="#8a5a12" stroke-width="1"/><circle cx="32" cy="21" r="2" fill="${p.e}"/><circle cx="23" cy="24" r="1.4" fill="${p.e}"/><circle cx="41" cy="24" r="1.4" fill="${p.e}"/>`,
  queen: (p) => `<path d="M12 30c0-14 9-20 20-20s20 6 20 20v26H40V34H24v22H12z" fill="${p.d}"/><path d="M19 28c0-8 6-12 13-12s13 4 13 12v6c0 10-6 15-13 15s-13-5-13-15z" fill="${p.a}"/>${eyes(26.5, 37.5, 31, INK, 2.2)}<path d="M23 27q3-2 6 0M35 27q3-2 6 0" stroke="${INK}" stroke-width="1.1" fill="none"/><path d="M28 41q4 3 8 0" stroke="#c0405a" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="23" cy="37" rx="2.4" ry="1.5" fill="#ff9fb2" opacity=".6"/><ellipse cx="41" cy="37" rx="2.4" ry="1.5" fill="#ff9fb2" opacity=".6"/><path d="M21 16l4 4 7-8 7 8 4-4-2 6H23z" fill="${p.b}" stroke="#8a5a12" stroke-width=".8"/><path d="M32 9l1.4 3-1.4 2-1.4-2z" fill="${p.e}"/>`,
  sultan: (p) => `<path d="M18 30c0-8 6-12 14-12s14 4 14 12v6c0 10-6 16-14 16s-14-6-14-16z" fill="${p.a}"/><path d="M12 24c0-10 9-16 20-16s20 6 20 16c-4 2-10 2-20 2s-16 0-20-2z" fill="${p.d}"/><path d="M14 20q18-8 36 0M13 24q19-6 38 0" stroke="${p.b}" stroke-width="1.6" fill="none" opacity=".8"/><path d="M32 10c3 0 4 3 4 6s-2 4-4 4-4-1-4-4 1-6 4-6z" fill="${p.e}" stroke="${p.b}" stroke-width="1.4"/><path d="M33 4c4 0 6 3 4 6" stroke="${p.b}" stroke-width="2" fill="none" stroke-linecap="round"/>${eyes(26, 38, 33, INK, 2.2)}<path d="M24 41q8-4 16 0-2 6-8 6s-6-2-8-6z" fill="${INK}" opacity=".85"/><path d="M28 44q4 2 8 0" stroke="#e8c39e" stroke-width="1.2" fill="none"/>`,
  robot: (p) => `<path d="M32 4v8" stroke="${p.d}" stroke-width="2.4"/><circle cx="32" cy="4" r="3" fill="${p.e}"/><rect x="12" y="12" width="40" height="40" rx="10" fill="${p.a}" stroke="${p.d}" stroke-width="2"/><rect x="17" y="21" width="30" height="16" rx="6" fill="${INK}"/><circle cx="25" cy="29" r="4" fill="${p.e}"/><circle cx="39" cy="29" r="4" fill="${p.e}"/><circle cx="26" cy="28" r="1.4" fill="#fff"/><circle cx="40" cy="28" r="1.4" fill="#fff"/><path d="M22 44h20" stroke="${p.d}" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 3"/><rect x="6" y="26" width="6" height="12" rx="2" fill="${p.d}"/><rect x="52" y="26" width="6" height="12" rx="2" fill="${p.d}"/>`,
  blob: (p) => `<path d="M10 44c-2-18 8-32 22-32s24 14 22 32c-1 8-6 10-10 6-3 4-7 4-10 0-3 4-7 4-10 0-4 4-13 2-14-6z" fill="${p.a}"/><path d="M20 14l-4-8M44 14l4-8" stroke="${p.a}" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="6" r="2.6" fill="${p.e}"/><circle cx="48" cy="6" r="2.6" fill="${p.e}"/><circle cx="32" cy="30" r="10" fill="#fff"/><circle cx="34" cy="31" r="5.4" fill="${p.d}"/><circle cx="35.6" cy="29" r="1.8" fill="#fff"/><path d="M24 44q8 6 16 0" stroke="${INK}" stroke-width="2" fill="${p.b}" stroke-linecap="round"/><path d="M28 45v3h3v-2.6M33 45.4v2.6h3V45" fill="#fff"/>`,
  bunny: (p) => `<path d="M20 26C14 16 14 4 20 2s8 12 6 22zM44 26c6-10 6-22 0-24s-8 12-6 22z" fill="${p.a}"/><path d="M21 22c-3-6-3-14 0-16s4 8 3 15zM43 22c3-6 3-14 0-16s-4 8-3 15z" fill="${p.d}"/><ellipse cx="32" cy="40" rx="19" ry="17" fill="${p.a}"/>${eyes(25, 39, 38, INK, 2.8)}<path d="M30 45h4l-2 2z" fill="#ff7aa2"/><path d="M32 47v2M29 50q3 2 6 0" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="45" rx="3.4" ry="2.2" fill="#ff9fb2" opacity=".75"/><ellipse cx="44" cy="45" rx="3.4" ry="2.2" fill="#ff9fb2" opacity=".75"/>${p.bow ? `<path d="M38 22l6 4-6 4zM50 22l-6 4 6 4z" fill="${p.bow}"/><circle cx="44" cy="26" r="2" fill="${p.bow}"/>` : ''}`,
  bear: (p) => `<circle cx="15" cy="18" r="8" fill="${p.a}"/><circle cx="49" cy="18" r="8" fill="${p.a}"/><circle cx="15" cy="18" r="4" fill="${p.d}"/><circle cx="49" cy="18" r="4" fill="${p.d}"/><circle cx="32" cy="36" r="21" fill="${p.a}"/><ellipse cx="32" cy="44" rx="10" ry="8" fill="${p.b}"/>${eyes(24, 40, 33, INK, 2.6)}<ellipse cx="32" cy="41" rx="3.4" ry="2.4" fill="${INK}"/><path d="M28 47q4 3 8 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="18" cy="42" rx="3" ry="2" fill="#ff9fb2" opacity=".6"/><ellipse cx="46" cy="42" rx="3" ry="2" fill="#ff9fb2" opacity=".6"/>`,
  chick: (p) => `<path d="M30 10c-2-4 2-8 4-4 2-4 6 0 2 4" fill="${p.d}"/><circle cx="32" cy="36" r="22" fill="${p.a}"/><path d="M10 40c-4-2-6 2-4 6l8 2zM54 40c4-2 6 2 4 6l-8 2z" fill="${p.d}"/>${eyes(24, 40, 32, INK, 3)}<path d="M26 39h12l-6 7z" fill="${p.b}" stroke="#c76a10" stroke-width="1"/><ellipse cx="18" cy="40" rx="3.4" ry="2.2" fill="#ff8f6a" opacity=".6"/><ellipse cx="46" cy="40" rx="3.4" ry="2.2" fill="#ff8f6a" opacity=".6"/>`,
  dino: (p) => `<path d="M20 14l4-8 4 7 4-8 4 8 4-7 4 8" fill="${p.d}"/><path d="M12 32c0-12 9-20 20-20s20 8 20 20v6c0 10-9 16-20 16s-20-6-20-16z" fill="${p.a}"/><path d="M16 38c4 6 10 8 16 8s12-2 16-8c0 8-7 14-16 14s-16-6-16-14z" fill="${p.b}"/>${eyes(24, 40, 30, INK, 3)}<circle cx="28" cy="38" r="1.2" fill="${INK}"/><circle cx="36" cy="38" r="1.2" fill="${INK}"/><path d="M26 44q6 4 12 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="18" cy="24" r="2" fill="${p.d}" opacity=".7"/><circle cx="46" cy="22" r="2.6" fill="${p.d}" opacity=".7"/>`,
  hero: (p) => `<path d="M10 58c2-10 10-14 22-14s20 4 22 14z" fill="${p.d}"/><path d="M18 28c0-10 6-16 14-16s14 6 14 16v6c0 10-6 15-14 15s-14-5-14-15z" fill="${p.a}"/><path d="M18 22c2-8 8-12 14-12s12 4 14 12c-4-3-8-4-14-4s-10 1-14 4z" fill="${INK}"/><path d="M16 28c4-2 10-2 16 1 6-3 12-3 16-1-1 5-4 7-8 7s-6-2-8-4c-2 2-4 4-8 4s-7-2-8-7z" fill="${p.b}"/><ellipse cx="25" cy="30" rx="3" ry="2" fill="#fff"/><ellipse cx="39" cy="30" rx="3" ry="2" fill="#fff"/><path d="M27 42q5 3 10 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M28 52l4 4 4-4-4-3z" fill="${p.e}"/>`,
  archer: (p) => `<path d="M10 56c0-20 8-46 22-46s22 26 22 46z" fill="${p.d}"/><path d="M20 30c0-8 5-12 12-12s12 4 12 12v6c0 9-5 14-12 14s-12-5-12-14z" fill="${p.a}"/><path d="M18 30c2-10 8-14 14-14s12 4 14 14c-4-6-8-8-14-8s-10 2-14 8z" fill="${p.d}"/>${eyes(26.5, 37.5, 33, INK, 2.2)}<path d="M28 43q4 2 8 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M50 8l-4 50" stroke="${p.b}" stroke-width="1.6"/><path d="M50 8l3 4-5 0z" fill="${p.e}"/>`,
};

/* الأفاتارات الجديدة: النوع + لوحة الألوان + الندرة (لازم تطابق src/server/catalog.ts) */
const AV = {
  'av2-wolf-gray': ['wolf', { a: '#8d97ad', b: '#e6e9f2', d: '#4b5368', e: '#ffd166' }, 'common'],
  'av2-wolf-moon': ['wolf', { a: '#2b3150', b: '#9aa6d6', d: '#12152a', e: '#7ef0ff' }, 'epic'],
  'av2-tiger': ['tiger', { a: '#f08a24', b: '#fff4e2', d: '#3a1e0c', e: '#2e7d32' }, 'premium'],
  'av2-tiger-white': ['tiger', { a: '#f4f2ff', b: '#ffffff', d: '#3b3b55', e: '#3fa9ff' }, 'legendary'],
  'av2-fox-arctic': ['fox', { a: '#e7f3ff', b: '#ffffff', d: '#9cc6ec', e: '#2c6fa8' }, 'rare'],
  'av2-fox-spirit': ['fox', { a: '#ff7b54', b: '#ffe7c2', d: '#7a1d5b', e: '#5b2bd6' }, 'legendary'],
  'av2-panda': ['panda', { a: '#ffffff', d: '#23202e' }, 'common'],
  'av2-panda-kungfu': ['panda', { a: '#ffffff', d: '#23202e', band: '#e5484d' }, 'premium'],
  'av2-dragon-jade': ['dragon', { a: '#2fb67c', b: '#b8f0cf', d: '#11553a', e: '#ffd166' }, 'rare'],
  'av2-dragon-ember': ['dragon', { a: '#d63a2a', b: '#ffb38a', d: '#5a0f12', e: '#ffd166' }, 'epic'],
  'av2-dragon-king': ['dragon', { a: '#3b1f6b', b: '#c9a6ff', d: '#ffd166', e: '#ff5a4a' }, 'ultra'],
  'av2-unicorn': ['unicorn', { a: '#ffffff', b: '#ffd9ec', d: '#b388ff', e: '#ffd166' }, 'rare'],
  'av2-griffin': ['griffin', { a: '#f2e3c4', b: '#ffcf4a', d: '#8a5a2b', e: '#2c6fa8' }, 'epic'],
  'av2-king': ['king', { a: '#e8b98f', b: '#ffd166', d: '#5b3a1e', e: '#e5484d' }, 'legendary'],
  'av2-queen': ['queen', { a: '#f1c7a1', b: '#ffd166', d: '#4a2c6b', e: '#4cc9f0' }, 'legendary'],
  'av2-sultan': ['sultan', { a: '#d9a476', b: '#ffd166', d: '#f4f0ff', e: '#2bb673' }, 'ultra'],
  'av2-robot': ['robot', { a: '#b9c6dd', d: '#5a6a88', e: '#4cc9f0' }, 'common'],
  'av2-blob': ['blob', { a: '#7c5cff', b: '#ff6a8a', d: '#241b55', e: '#ffd166' }, 'premium'],
  'av2-bunny': ['bunny', { a: '#ffffff', d: '#ffc2d6', bow: '#ff5fa2' }, 'common'],
  'av2-bear': ['bear', { a: '#b07a4a', b: '#e9c9a3', d: '#7a4f2a' }, 'common'],
  'av2-chick': ['chick', { a: '#ffd84a', b: '#ff9a3c', d: '#ffb13c' }, 'common'],
  'av2-dino': ['dino', { a: '#5ed17a', b: '#c8f5d0', d: '#2a8a4a' }, 'premium'],
  'av2-hero': ['hero', { a: '#e8b98f', b: '#e5484d', d: '#1e3a8a', e: '#ffd166' }, 'rare'],
  'av2-archer': ['archer', { a: '#e8b98f', b: '#8a5a2b', d: '#2f6b3a', e: '#cfd6e4' }, 'premium'],
};
export const AV2_IDS = Object.keys(AV);
const BGC = { common: ['#4a5bd4', '#241b55'], premium: ['#14a39a', '#17304f'], rare: ['#3a7bd5', '#1a1f4f'], epic: ['#8e4ce6', '#2a1758'], legendary: ['#ff8a3d', '#4a1a3d'], ultra: ['#ffd166', '#3a2208'] };

/** رسم أفاتار جديد داخل SVG ‎64×64‎ (بدون الغلاف) */
function av2Inner(id) {
  const [sp, pal, rar] = AV[id]; const lv = rarityLv(rar); const g = nid('c2'); const [c1, c2] = BGC[rar];
  let back = `<defs><radialGradient id="${g}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs><rect width="64" height="64" fill="url(#${g})"/>`;
  if (lv >= 4) back += rays64(lv >= 5 ? '#fff3c4' : '#ffd8a8');
  if (lv >= 3) back += wings64(lv >= 5 ? '#ffe6a3' : 'rgba(255,255,255,.75)', lv >= 5 ? '#b07a12' : 'rgba(80,60,140,.6)');
  if (lv >= 1) back += `<circle cx="32" cy="32" r="29" fill="none" stroke="${RARITY[rar].c}" stroke-width="${lv >= 3 ? 1.6 : 1}" opacity=".7"/>`;
  let front = '';
  if (lv >= 2) front += star4(9, 12, 3.2, '#fff', 'cx-tw') + star4(55, 50, 2.6, '#fff', 'cx-tw d2');
  if (lv >= 4) front += medal64(lv >= 5 ? '#ffd166' : '#ffb35a', lv >= 5 ? '#e5484d' : '#fff');
  if (lv >= 5 && !['king', 'queen', 'sultan'].includes(sp)) front += crown64('#ffd166', '#e5484d');
  return back + `<g>${SPECIES[sp](pal)}</g>` + front;
}
export function av2Art(id, size = 56) {
  if (!AV[id]) return '';
  const rar = AV[id][2];
  return `<span class="avatar-wrap pa-wrap cx-av r-${rar}" style="--sz:${size}px"><svg class="avatar-svg" viewBox="0 0 64 64" direction="ltr" role="img" aria-label="أفاتار">${av2Inner(id)}</svg></span>`;
}
export const av2Rarity = (id) => AV[id]?.[2] ?? null;

/* ---------- الإطارات: SVG ‎120×120‎ فوق الصورة (الصورة دائرة نصف قطرها ‎~40‎ بالوسط) ---------- */
const FR = {
  'bronze': { ring: ['#f3c493', '#a0612a'], kind: 'plain', r: 'common' },
  'kids-rainbow': { ring: ['#ff5a5a', '#ffd84a', '#5ed17a', '#4aa8ff', '#b388ff'], kind: 'rainbow', r: 'common' },
  'kids-candy': { ring: ['#ff7aa2', '#ffffff'], kind: 'candy', r: 'common' },
  'kids-stars': { ring: ['#ffd84a', '#ff9a3c'], kind: 'stars', r: 'premium' },
  'gold-crest': { ring: ['#fff0b8', '#c98a12'], kind: 'laurel', r: 'premium' },
  'onyx': { ring: ['#3a3a48', '#0c0c12'], kind: 'studs', r: 'premium', accent: '#cfd6e4' },
  'silver-thorn': { ring: ['#f1f4fa', '#7d879c'], kind: 'thorns', r: 'rare', accent: '#2a2f3d' },
  'diamond': { ring: ['#e9fbff', '#5ec8ff'], kind: 'facets', r: 'rare' },
  'ice': { ring: ['#ffffff', '#7cc7f2'], kind: 'icicles', r: 'rare' },
  'crystal': { ring: ['#f5e9ff', '#a77bff'], kind: 'facets', r: 'epic', accent: '#ff9fe1' },
  'galaxy': { ring: ['#7a4cff', '#1a0f3d'], kind: 'orbit', r: 'epic', accent: '#58e1ff' },
  'nebula': { ring: ['#ff68b5', '#3b1f8a'], kind: 'orbit', r: 'legendary', accent: '#ffd166' },
  'angel-wings': { ring: ['#ffffff', '#ffd166'], kind: 'wings', r: 'legendary' },
  'royal-crown': { ring: ['#ffe28a', '#b47a10'], kind: 'crown', r: 'legendary', accent: '#e5484d' },
  'dragon-coil': { ring: ['#ff8a3d', '#5a0f12'], kind: 'dragon', r: 'ultra', accent: '#ffd166' },
  'emperor': { ring: ['#fff0b8', '#a8700e'], kind: 'emperor', r: 'ultra', accent: '#4cc9f0' },
  /* R56: إطارات سلّم VIP ونوبل الحصرية (ما تنباع) — كل ما ارتفع المستوى زادت الزخرفة */
  'vip-f2': { ring: ['#ffffff', '#8d97ab'], kind: 'studs', r: 'premium', accent: '#eef2fa', plate: 'VIP' },
  'vip-f6': { ring: ['#cdeeff', '#1a46b8'], kind: 'facets', r: 'rare', accent: '#9fe0ff', plate: 'VIP' },
  'vip-f9': { ring: ['#f3e1ff', '#5a2399'], kind: 'facets', r: 'epic', accent: '#ff9fe1', plate: 'VIP' },
  'vip-f12': { ring: ['#fff3c4', '#c58b12'], kind: 'wings', r: 'legendary', accent: '#ffd166', plate: 'VIP', crown: true },
  'vip-f15': { ring: ['#ffcf6b', '#7a0f1a'], kind: 'dragon', r: 'ultra', accent: '#ffe28a', plate: 'VIP', crown: true },
  'nb-f1': { ring: ['#f6cf9f', '#8a4b1a'], kind: 'laurel', r: 'premium', plate: 'N1' },
  'nb-f3': { ring: ['#f4f6fb', '#56627a'], kind: 'thorns', r: 'rare', accent: '#1d2333', plate: 'N3' },
  'nb-f6': { ring: ['#ffe9a8', '#a8700e'], kind: 'crown', r: 'legendary', accent: '#e5484d', plate: 'N6' },
  'nb-f8': { ring: ['#fff0b8', '#6e4508'], kind: 'emperor', r: 'ultra', accent: '#b15cff', plate: 'N8' },
  'nb-f9': { ring: ['#fff8dc', '#b8860b'], kind: 'emperor', r: 'ultra', accent: '#3ad1ff', plate: 'N9', halo: true },
  /* R57: إطارات «مجموعة الفخامة» للبيع بالمتجر */
  'lux-rose': { ring: ['#ffe3f0', '#d6437e'], kind: 'facets', r: 'rare', accent: '#ffc1dc' },
  'lux-ocean': { ring: ['#e6fffb', '#0f8fa0'], kind: 'icicles', r: 'rare' },
  'lux-sakura': { ring: ['#ffe6ef', '#c95b85'], kind: 'laurel', r: 'rare' },
  'lux-obsidian': { ring: ['#3b3b46', '#08080c'], kind: 'studs', r: 'epic', accent: '#ffd166' },
  'lux-moon': { ring: ['#f4f7ff', '#5468a8'], kind: 'orbit', r: 'epic', accent: '#e8eefc' },
  'lux-desert': { ring: ['#fff1c9', '#b8741a'], kind: 'thorns', r: 'epic', accent: '#5a3206' },
  'lux-emerald': { ring: ['#eafff2', '#138a52'], kind: 'crown', r: 'legendary', accent: '#2fd17a', halo: true },
  'lux-ruby': { ring: ['#ffe2e2', '#a3121f'], kind: 'crown', r: 'legendary', accent: '#ff3b5c', halo: true },
  'lux-phoenix': { ring: ['#ffd27a', '#c2290f'], kind: 'wings', r: 'legendary', accent: '#ff8a3d', crown: true },
  'lux-sapphire': { ring: ['#e3f1ff', '#1d4fbf'], kind: 'wings', r: 'legendary', accent: '#7cc7ff' },
  'lux-galaxy': { ring: ['#c9b6ff', '#2a0f6b'], kind: 'emperor', r: 'ultra', accent: '#58e1ff', halo: true },
  'lux-inferno': { ring: ['#ffe066', '#5a0a0a'], kind: 'dragon', r: 'ultra', accent: '#ff3d3d', crown: true },
};
export const FR2_IDS = Object.keys(FR);
const polar = (r, a) => [60 + r * Math.cos(a * Math.PI / 180), 60 + r * Math.sin(a * Math.PI / 180)];
function frameInner(css) {
  const f = FR[css]; const lv = rarityLv(f.r); const g = nid('fr'); const acc = f.accent ?? '#ffffff';
  const stops = f.ring.map((c, i) => `<stop offset="${(i / Math.max(1, f.ring.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
  let s = `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>`;
  const ring = (r, w, extra = '') => `<circle cx="60" cy="60" r="${r}" fill="none" stroke="url(#${g})" stroke-width="${w}" ${extra}/>`;
  let behind = '';
  if (f.kind === 'wings' || f.kind === 'emperor') behind += `<g class="cx-flap"><path d="M14 64C-2 50 0 26 12 16c0 12 6 18 12 22-8 2-12 12-10 26z" fill="#fff" stroke="#e6c46a" stroke-width="1.2"/><path d="M106 64c16-14 14-38 2-48 0 12-6 18-12 22 8 2 12 12 10 26z" fill="#fff" stroke="#e6c46a" stroke-width="1.2"/><path d="M8 50c-2-8 0-16 6-22M112 50c2-8 0-16-6-22" stroke="#e6c46a" stroke-width="1.2" fill="none"/></g>`;
  if (lv >= 4) behind += `<circle class="cx-glow" cx="60" cy="60" r="50" fill="none" stroke="${acc}" stroke-width="6" opacity=".35"/>`;
  s += behind;
  if (f.kind === 'rainbow') s += f.ring.map((c, i) => `<circle cx="60" cy="60" r="46" fill="none" stroke="${c}" stroke-width="8" pathLength="100" stroke-dasharray="20 80" stroke-dashoffset="${-i * 20}"/>`).join('');
  else if (f.kind === 'candy') s += `<circle cx="60" cy="60" r="46" fill="none" stroke="${f.ring[1]}" stroke-width="8"/><circle cx="60" cy="60" r="46" fill="none" stroke="${f.ring[0]}" stroke-width="8" pathLength="100" stroke-dasharray="5 5"/>`;
  else s += ring(46, lv >= 2 ? 7 : 6);
  if (lv >= 2) s += ring(53, 1.6, 'opacity=".85"');
  if (lv >= 1) s += `<circle cx="60" cy="60" r="42.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>`;
  // زخارف حسب النوع
  switch (f.kind) {
    case 'stars': for (let a = 0; a < 360; a += 45) { const [x, y] = polar(47, a); s += star4(x, y, 6, a % 90 ? '#fff' : '#ffd84a'); } break;
    case 'laurel': for (const side of [-1, 1]) for (let i = 0; i < 6; i++) { const a = 90 + side * (30 + i * 18); const [x, y] = polar(49, a); s += `<ellipse cx="${x}" cy="${y}" rx="6" ry="2.6" transform="rotate(${a + side * 60} ${x} ${y})" fill="#e6b84a" stroke="#8a5a12" stroke-width=".6"/>`; } break;
    case 'studs': for (let a = 0; a < 360; a += 30) { const [x, y] = polar(46, a); s += `<circle cx="${x}" cy="${y}" r="2.6" fill="${acc}"/>`; } break;
    case 'thorns': for (let a = 0; a < 360; a += 24) { const [x1, y1] = polar(49, a - 5); const [x2, y2] = polar(58, a); const [x3, y3] = polar(49, a + 5); s += `<path d="M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}z" fill="#dfe4ee" stroke="${acc}" stroke-width=".8"/>`; } break;
    case 'facets': for (let a = 0; a < 360; a += 40) { const [x, y] = polar(46, a); s += `<path d="M${x} ${y - 6}l5 6-5 6-5-6z" fill="#fff" stroke="${f.ring[1]}" stroke-width="1"/>`; } if (lv >= 3) for (let a = 20; a < 360; a += 40) { const [x, y] = polar(54, a); s += `<circle cx="${x}" cy="${y}" r="1.8" fill="${acc}"/>`; } break;
    case 'icicles': for (let a = 200; a <= 340; a += 20) { const [x, y] = polar(50, a); s += `<path d="M${x - 3} ${y}l3 -${a === 270 ? 12 : 8} 3 ${a === 270 ? 12 : 8}z" fill="#e9f7ff" stroke="#7cc7f2" stroke-width=".8"/>`; } for (let a = 20; a < 180; a += 32) { const [x, y] = polar(46, a); s += `<path d="M${x} ${y - 4}v8M${x - 4} ${y}h8M${x - 3} ${y - 3}l6 6M${x + 3} ${y - 3}l-6 6" stroke="#fff" stroke-width="1.2"/>`; } break;
    case 'orbit': s += `<g class="cx-spin"><ellipse cx="60" cy="60" rx="58" ry="20" fill="none" stroke="${acc}" stroke-width="1.6" opacity=".8" transform="rotate(-20 60 60)"/><circle cx="114" cy="40" r="5" fill="${acc}"/></g>`; for (let i = 0; i < 10; i++) { const [x, y] = polar(46 + (i % 3) * 3, i * 36 + 10); s += `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.2 : 2}" fill="#fff"/>`; } break;
    case 'wings': break;
    case 'crown': s += `<path d="M38 22l6 -14 8 10 8-14 8 14 8-10 6 14z" fill="url(#${g})" stroke="#7a4f0a" stroke-width="1.2"/><circle cx="60" cy="6" r="3" fill="${acc}"/><circle cx="44" cy="10" r="2.2" fill="${acc}"/><circle cx="76" cy="10" r="2.2" fill="${acc}"/>`; for (let a = 30; a < 160; a += 25) { const [x, y] = polar(46, a); s += `<circle cx="${x}" cy="${y}" r="2.4" fill="${acc}" stroke="#7a4f0a" stroke-width=".6"/>`; } break;
    case 'dragon': s += `<path d="M60 112c-30 0-52-22-52-52S30 8 60 8c22 0 40 12 48 30" fill="none" stroke="${f.ring[1]}" stroke-width="9" stroke-linecap="round"/><path d="M60 112c-30 0-52-22-52-52S30 8 60 8c22 0 40 12 48 30" fill="none" stroke="${f.ring[0]}" stroke-width="5" stroke-linecap="round" stroke-dasharray="4 5"/><path d="M104 34l14-4-4 10 6 4-12 4-6-6z" fill="${f.ring[0]}" stroke="${f.ring[1]}" stroke-width="1.4"/><circle cx="110" cy="36" r="1.6" fill="${acc}"/><path d="M118 30l-2-8M112 30l2-8" stroke="${acc}" stroke-width="1.6" stroke-linecap="round"/><path d="M60 112l-8 6 2-8z" fill="${f.ring[0]}"/>`; break;
    case 'emperor': s += `<path d="M40 20l5 -12 7 8 8-12 8 12 7-8 5 12z" fill="url(#${g})" stroke="#7a4f0a" stroke-width="1.2"/><circle cx="60" cy="5" r="3" fill="#e5484d"/>`; for (let a = 0; a < 360; a += 30) { const [x, y] = polar(46, a); s += `<circle cx="${x}" cy="${y}" r="2.2" fill="${a % 60 ? acc : '#e5484d'}"/>`; } break;
    default: break;
  }
  if (f.halo) s += `<circle class="cx-glow" cx="60" cy="60" r="58" fill="none" stroke="${acc}" stroke-width="2.4" stroke-dasharray="2 5" opacity=".9"/><g class="cx-spin slow">${[0, 60, 120, 180, 240, 300].map((a) => { const [x, y] = polar(58, a); return `<circle cx="${x}" cy="${y}" r="2.4" fill="${acc}"/>`; }).join('')}</g>`;
  if (f.crown && f.kind !== 'crown' && f.kind !== 'emperor') s += `<path d="M42 16l5-11 7 7 6-10 6 10 7-7 5 11z" fill="url(#${g})" stroke="#6b3f06" stroke-width="1.1"/><circle cx="60" cy="3.5" r="2.6" fill="${acc}"/><circle cx="47" cy="7" r="1.8" fill="#fff"/><circle cx="73" cy="7" r="1.8" fill="#fff"/>`;
  if (f.plate) s += `<g><rect x="${60 - (f.plate.length * 4 + 9)}" y="101" width="${f.plate.length * 8 + 18}" height="15" rx="7.5" fill="url(#${g})" stroke="#3a2406" stroke-width="1"/><text x="60" y="112.2" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="900" fill="#2a1704" letter-spacing=".5">${f.plate}</text></g>`;
  if (lv >= 3) for (const a of [210, 330, 90]) { const [x, y] = polar(56, a); s += star4(x, y, 4, '#fff', 'cx-tw'); }
  if (lv >= 5) s += `<g class="cx-spin slow">${[0, 120, 240].map((a) => { const [x, y] = polar(56, a); return star4(x, y, 3.6, '#fff4c4'); }).join('')}</g>`;
  return s;
}

/* R58b: سلّم إطارات VIP والنبلاء — تدرّج صارم: كل مستوى يضيف طبقة فخامة فوق اللي قبله، والأعلى (N9 / VIP15) هو الأفخم بوضوح */
const RANK_FR = {
  'nb-f1': { t: 1, m: ['#ffe2bd', '#c07a35', '#5a2e0c'], a: '#ffcf8a', plate: 'N1', leaf: true },
  'nb-f3': { t: 2, m: ['#ffffff', '#b9c3d4', '#4a5468'], a: '#8fd8ff', plate: 'N3' },
  'nb-f6': { t: 3, m: ['#fff3c0', '#dcaa22', '#7a4f0a'], a: '#e5484d', plate: 'N6' },
  'nb-f8': { t: 4, m: ['#fff3c0', '#d39a1c', '#5a3206'], a: '#b15cff', plate: 'N8' },
  'nb-f9': { t: 5, m: ['#fffbe6', '#f0c24a', '#8a5a08'], a: '#3ad1ff', a2: '#ff4d6d', plate: 'N9' },
  'vip-f2': { t: 1, m: ['#ffffff', '#c3cad8', '#5d6678'], a: '#eef2fa', plate: 'VIP' },
  'vip-f6': { t: 2, m: ['#d8f0ff', '#3a78e8', '#0f2a78'], a: '#9fe0ff', plate: 'VIP' },
  'vip-f9': { t: 3, m: ['#f6e6ff', '#9a4fe0', '#3a1170'], a: '#ff9fe1', plate: 'VIP' },
  'vip-f12': { t: 4, m: ['#fff3c0', '#e0aa2a', '#7a4f0a'], a: '#ffd166', plate: 'VIP' },
  'vip-f15': { t: 5, m: ['#ffe9a0', '#e0262f', '#5a0610'], a: '#ffd166', a2: '#ff7a2b', plate: 'VIP', flame: true },
};
const rkWing = (g, n, scale) => { let w = ''; for (let i = 0; i < n; i++) { const ang = -100 - i * (75 / Math.max(1, n - 1)); const len = (24 - i * 1.6) * scale; w += `<path d="M0 0C${len * .25} -${3.2 * scale} ${len * .7} -${4.2 * scale} ${len} -1C${len * .7} ${3 * scale} ${len * .25} ${2.6 * scale} 0 0Z" transform="rotate(${ang})" fill="url(#${g}w)" stroke="#c99a2e" stroke-width=".6"/>`; } return w; };
const rkCrown = (g, a, a2, big) => big
  ? `<g><path d="M36 22L33 4l11 9 7-14 9 12 9-12 7 14 11-9-3 18z" fill="url(#${g}m)" stroke="#5a3a06" stroke-width="1.1"/><path d="M36 22h48v5H36z" fill="url(#${g}m)" stroke="#5a3a06" stroke-width="1"/><circle cx="60" cy="1.8" r="3.4" fill="${a2 || a}" stroke="#fff" stroke-width=".8"/><circle cx="44" cy="11" r="2.4" fill="${a}"/><circle cx="76" cy="11" r="2.4" fill="${a}"/><circle cx="51" cy="-.5" r="1.8" fill="#fff"/><circle cx="69" cy="-.5" r="1.8" fill="#fff"/>${[42, 51, 60, 69, 78].map((x, i) => `<circle cx="${x}" cy="24.5" r="1.5" fill="${i % 2 ? '#fff' : a}"/>`).join('')}</g>`
  : `<g><path d="M44 20l-2-10 7 5 5-9 6 7 6-7 5 9 7-5-2 10z" fill="url(#${g}m)" stroke="#5a3a06" stroke-width="1"/><circle cx="60" cy="5.5" r="2.2" fill="${a}"/><circle cx="49" cy="13" r="1.5" fill="#fff"/><circle cx="71" cy="13" r="1.5" fill="#fff"/></g>`;
function rankFrameInner(css) {
  const f = RANK_FR[css]; const t = f.t; const g = nid('rk'); const a = f.a;
  const stops = f.m.map((c, i) => `<stop offset="${(i / (f.m.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
  let s = `<defs><linearGradient id="${g}m" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient><linearGradient id="${g}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#fff4d6"/><stop offset="1" stop-color="#f0c24a"/></linearGradient><radialGradient id="${g}h" cx="50%" cy="50%" r="50%"><stop offset=".72" stop-color="${a}" stop-opacity="0"/><stop offset=".86" stop-color="${a}" stop-opacity="${.12 * t}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient></defs>`;
  // خلف الإطار: هالة ثم أشعة ثم أجنحة (تتدرج مع المستوى)
  if (t >= 3) s += `<circle cx="60" cy="60" r="60" fill="url(#${g}h)"/>`;
  if (t >= 5) s += `<g class="cx-spin slow" opacity=".55">${Array.from({ length: 16 }, (_, i) => { const [x1, y1] = polar(50, i * 22.5 - 3), [x2, y2] = polar(62, i * 22.5), [x3, y3] = polar(50, i * 22.5 + 3); return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}L${x3.toFixed(1)} ${y3.toFixed(1)}z" fill="${i % 2 ? a : '#fff4c4'}"/>`; }).join('')}</g>`;
  if (t >= 4) { const n = t >= 5 ? 6 : 4, sc = t >= 5 ? 1.08 : .9; s += `<g class="cx-flap"><g transform="translate(19 48)">${rkWing(g, n, sc)}</g><g transform="translate(101 48) scale(-1 1)">${rkWing(g, n, sc)}</g></g>`; }
  if (f.flame) s += `<g class="cx-glow">${[200, 225, 250, 290, 315, 340].map((ang, i) => { const [x, y] = polar(50, ang); return `<path d="M${x.toFixed(1)} ${(y + 4).toFixed(1)}c-4-6-2-12 0-${14 + i % 2 * 4}c2 ${6 + i % 2 * 2} 6 8 4 ${14 + i % 2 * 2}z" fill="${f.a2}" opacity=".85"/>`; }).join('')}</g>`;
  // الحلقة: تسمك وتتعدد طبقاتها مع المستوى
  s += `<circle cx="60" cy="60" r="${46 + t * .3}" fill="none" stroke="url(#${g}m)" stroke-width="${4.5 + t * 1.1}"/>`;
  s += `<circle cx="60" cy="60" r="${42.6 - t * .2}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width=".9"/>`;
  if (t >= 2) s += `<circle cx="60" cy="60" r="${52 + t * .6}" fill="none" stroke="url(#${g}m)" stroke-width="${1 + t * .35}"/>`;
  if (t >= 4) s += `<circle cx="60" cy="60" r="${55.5 + t * .5}" fill="none" stroke="${a}" stroke-width="1" stroke-dasharray="1.5 3" opacity=".9"/>`;
  // الحليات على الحلقة
  if (f.leaf) for (const side of [-1, 1]) for (let i = 0; i < 5; i++) { const ang = 90 + side * (34 + i * 20); const [x, y] = polar(50, ang); s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5" ry="2.2" transform="rotate(${ang + side * 60} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#e6b84a" stroke="#7a4a12" stroke-width=".5"/>`; }
  const studs = [8, 12, 12, 16, 24][t - 1];
  for (let i = 0; i < studs; i++) { const ang = i * 360 / studs; const [x, y] = polar(46 + t * .3, ang); const big = t >= 3 && i % (studs / 4) === 0;
    s += big ? `<path d="M${x.toFixed(1)} ${(y - 4.6).toFixed(1)}l3.6 4.6-3.6 4.6-3.6-4.6z" fill="#fff" stroke="${f.m[2]}" stroke-width=".8"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.4" fill="${a}"/>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${t >= 2 ? 1.9 : 1.6}" fill="${t >= 2 && i % 2 ? a : '#ffffff'}" stroke="${f.m[2]}" stroke-width=".5"/>`; }
  // التاج يكبر مع المستوى
  if (t === 3) s += rkCrown(g, a, f.a2, false);
  if (t >= 4) s += rkCrown(g, a, f.a2, t >= 5);
  // N9/VIP15: قلادة جوهرة تحت + نجوم لامعة
  if (t >= 5) s += `<path d="M60 100l6 6-6 9-6-9z" fill="${f.a2 || a}" stroke="#fff" stroke-width="1"/>`;
  if (t >= 3) for (const ang of [205, 335, 150, 30].slice(0, t - 1)) { const [x, y] = polar(58, ang); s += star4(x, y, 3 + t * .4, '#fff', 'cx-tw'); }
  // اللوحة
  const pw = f.plate.length * 8 + 16 + t * 2;
  s += `<g><rect x="${60 - pw / 2}" y="${t >= 5 ? 104 : 101}" width="${pw}" height="15" rx="7.5" fill="url(#${g}m)" stroke="#3a2406" stroke-width="1"/>${t >= 4 ? `<rect x="${60 - pw / 2 + 2}" y="${(t >= 5 ? 104 : 101) + 2}" width="${pw - 4}" height="11" rx="5.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>` : ''}<text x="60" y="${t >= 5 ? 115.2 : 112.2}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="900" fill="#2a1704" letter-spacing=".5">${f.plate}</text></g>`;
  if (t >= 5) s += `<rect class="cx-shine" x="-60" y="0" width="30" height="120" fill="rgba(255,255,255,.22)" transform="skewX(-20)"/>`;
  return s;
}
/** إطار جديد كطبقة SVG تنحط فوق الصورة (الحاوية لازم position:relative) */
export function frameArt(css) {
  if (referenceOf(css)?.slot === 'frame') return referenceImage(css, String(referenceOf(css).src).includes('/art58/rank/') ? 'cx-frame ref-frame art58-rank' : 'cx-frame ref-frame');
  if (!FR[css]) return '';
  if (RANK_FR[css]) return `<svg class="cx-frame r-${FR[css].r} rk-frame t${RANK_FR[css].t}" viewBox="-4 -6 128 132" direction="ltr" aria-hidden="true" focusable="false">${rankFrameInner(css)}</svg>`;
  return `<svg class="cx-frame r-${FR[css].r}" viewBox="0 0 120 120" direction="ltr" aria-hidden="true" focusable="false">${frameInner(css)}</svg>`;
}
export const isFrame2 = (css) => referenceOf(css)?.slot === 'frame' || !!FR[css];

/* ---------- الخلفيات: مشاهد SVG ‎400×160‎ ---------- */
const sky = (g, a, b) => `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="160" fill="url(#${g})"/>`;
const starsField = (n, seed, c = '#fff') => { let r = seed * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280; return Array.from({ length: n }, (_, i) => `<circle cx="${(rnd() * 400).toFixed(1)}" cy="${(rnd() * 110).toFixed(1)}" r="${i % 5 ? .9 : 1.7}" fill="${c}" opacity="${i % 3 ? .6 : 1}"/>`).join(''); };
const BG = {
  /* R56: خلفيات سلّم VIP ونوبل الحصرية */
  /* R57: خلفيات «مجموعة الفخامة» */
  'lux-chandelier': { r: 'epic', draw: (g) => `${sky(g, '#3a1020', '#a2582f')}<path d="M0 160V90h400v70z" fill="#2a0c14"/>${[60, 140, 260, 340].map((x) => `<rect x="${x - 10}" y="90" width="20" height="70" fill="#5a1f22" stroke="#e8b44a" stroke-width="1.4"/>`).join('')}${[110, 200, 290].map((x, i) => `<g><path d="M${x} 0v${18 + i % 2 * 6}" stroke="#e8b44a" stroke-width="1.6"/><path d="M${x - 26} ${30 + i % 2 * 6}q26 22 52 0" fill="none" stroke="#ffd166" stroke-width="2.4"/>${[-24, -12, 0, 12, 24].map((dx) => `<path d="M${x + dx} ${34 + i % 2 * 6}l3 9-3 7-3-7z" fill="#fff4cf" opacity=".95"/>`).join('')}<circle cx="${x}" cy="${36 + i % 2 * 6}" r="18" fill="#ffd166" opacity=".18"/></g>`).join('')}<path d="M0 156h400v4H0z" fill="#e8b44a"/>` },
  'lux-yacht': { r: 'epic', draw: (g) => `${sky(g, '#071a33', '#1b3b6b')}${starsField(36, 61, '#e8f1ff')}${[[10, 60], [44, 90], [80, 50], [300, 80], [336, 55], [366, 95]].map(([x, h]) => `<rect x="${x}" y="${120 - h}" width="28" height="${h}" fill="#0f2442"/>${Array.from({ length: 5 }, (_, k) => `<rect x="${x + 5}" y="${126 - h + k * (h / 6)}" width="4" height="3" fill="#ffd27a" opacity=".85"/><rect x="${x + 16}" y="${126 - h + k * (h / 6)}" width="4" height="3" fill="#ffd27a" opacity=".6"/>`).join('')}`).join('')}<rect y="120" width="400" height="40" fill="#0a2547"/><path d="M110 128h190l-26 18H136z" fill="#f4f7ff"/><path d="M150 128l14-16h82l18 16z" fill="#dfe6f5"/><path d="M178 112l10-10h40l8 10z" fill="#c8d2e6"/>${[160, 190, 220, 250].map((x) => `<rect x="${x}" y="116" width="16" height="6" rx="2" fill="#1b3b6b"/>`).join('')}<path d="M100 150q100 8 210 0" stroke="#ffd27a" stroke-width="1.4" opacity=".6" fill="none"/>` },
  'lux-skyline': { r: 'epic', draw: (g) => `${sky(g, '#1a0f3d', '#ff8a5c')}<circle cx="320" cy="96" r="22" fill="#ffd6a0" opacity=".85"/>${[[20, 50], [55, 80], [90, 62], [128, 126], [170, 70], [205, 96], [245, 58], [282, 84], [330, 66], [362, 48]].map(([x, h], i) => `<path d="M${x} 140V${140 - h}${i === 3 ? `l7-24 7 24` : ''}h${i === 3 ? 0 : 26}V140z" fill="#140a2a"/>${Array.from({ length: Math.floor(h / 14) }, (_, k) => `<rect x="${x + 6}" y="${144 - h + k * 14}" width="${i === 3 ? 2 : 14}" height="3" fill="#ffd27a" opacity="${(k + i) % 3 ? .9 : .4}"/>`).join('')}`).join('')}<path d="M135 14v-14" stroke="#ff5a5a" stroke-width="2"/><rect y="140" width="400" height="20" fill="#0b1640"/><path d="M0 146h400" stroke="#ffd27a" stroke-width="1" opacity=".5"/>` },
  'lux-dunes': { r: 'rare', draw: (g) => `${sky(g, '#0d1a3a', '#6b3b5a')}${starsField(40, 13, '#fff1c9')}<circle cx="300" cy="40" r="16" fill="#fff1c9"/><path d="M0 120q90-46 190-10t210-14v64H0z" fill="#c98a3a"/><path d="M0 140q110-30 220-4t180-8v32H0z" fill="#a8641f"/><path d="M60 118q8-6 16 0M80 118v-10M76 108q4-6 8 0" stroke="#3a1e06" stroke-width="2" fill="none"/>` },
  'lux-crystal': { r: 'legendary', draw: (g) => `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06162e"/><stop offset=".6" stop-color="#1d5a8a"/><stop offset="1" stop-color="#bfeaff"/></linearGradient><linearGradient id="${g}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#9fe0ff"/><stop offset="1" stop-color="#2a7ab8"/></linearGradient></defs><rect width="400" height="160" fill="url(#${g})"/>${starsField(30, 77, '#e9fbff')}${[[40, 70], [80, 96], [320, 90], [360, 66]].map(([x, h]) => `<path d="M${x - 16} 160V${160 - h}l16-22 16 22V160z" fill="url(#${g}c)" opacity=".7" stroke="#fff" stroke-width="1"/><path d="M${x} ${138 - h}V160" stroke="#fff" stroke-opacity=".6"/>`).join('')}<path d="M0 138h400v22H0z" fill="#dff6ff" opacity=".55"/>${Array.from({ length: 16 }, (_, i) => `<path d="M${30 + i * 23} ${150 - (i % 3) * 6}l7-${20 + (i % 4) * 6} 7 ${20 + (i % 4) * 6}z" fill="url(#${g}c)" opacity=".85"/>`).join('')}<g transform="translate(200 72)"><circle r="46" fill="#ffffff" opacity=".12"/><path d="M-26-10l12-16h28l12 16-26 44z" fill="url(#${g}c)" stroke="#fff" stroke-width="1.6"/><path d="M-26-10h52M-14-26l-6 16 20 44 20-44-6-16M0-10v44" fill="none" stroke="#ffffff" stroke-opacity=".75" stroke-width="1"/></g>` },
  'lux-royalgalaxy': { r: 'legendary', draw: (g) => `<defs><radialGradient id="${g}" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#7a3cff"/><stop offset=".55" stop-color="#2a0f6b"/><stop offset="1" stop-color="#07031a"/></radialGradient></defs><rect width="400" height="160" fill="url(#${g})"/>${starsField(80, 91, '#f2e6ff')}<ellipse cx="200" cy="84" rx="150" ry="26" fill="none" stroke="#ff9fe1" stroke-width="1.4" opacity=".6" transform="rotate(-10 200 84)"/><path d="M176 92l6-24 10 10 8-16 8 16 10-10 6 24z" fill="#ffd166" stroke="#7a4f0a" stroke-width="1.2"/><circle cx="200" cy="62" r="3.4" fill="#58e1ff"/>` },
  'lux-falls': { r: 'ultra', draw: (g) => `${sky(g, '#0b2a2a', '#1f6a5a')}<path d="M0 160V40q40-12 80 0v120zM320 160V36q40-10 80 4v120z" fill="#0d1f1c"/><path d="M150 0h100v160H150z" fill="url(#${g}w)"/><defs><linearGradient id="${g}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4cf"/><stop offset=".5" stop-color="#ffd166"/><stop offset="1" stop-color="#c98a12"/></linearGradient></defs>${Array.from({ length: 10 }, (_, i) => `<path d="M${155 + i * 10} 0v160" stroke="#fffbe6" stroke-width="1.2" opacity=".55"/>`).join('')}<ellipse cx="200" cy="152" rx="120" ry="12" fill="#fff4cf" opacity=".55"/>${[60, 110, 290, 340].map((x) => `<circle cx="${x}" cy="${60 + (x % 30)}" r="3" fill="#ffd166"/>`).join('')}` },
  'lux-snowcastle': { r: 'ultra', draw: (g) => `${sky(g, '#06142a', '#173c6b')}${starsField(50, 41, '#e9fbff')}<path class="cx-wave" d="M0 50q100-40 200 0t200-10v24q-100 30-200 0T0 74z" fill="#3dffb0" opacity=".35"/><path d="M0 140q100-24 200 0t200 0v20H0z" fill="#e9f7ff"/><path d="M130 140V86h18V70h12v16h20V56l20-22 20 22v30h20V70h12v16h18v54z" fill="#cfe9ff" stroke="#ffffff" stroke-width="1.4"/>${[150, 196, 236].map((x) => `<rect x="${x}" y="104" width="10" height="16" rx="5" fill="#7cc7ff"/>`).join('')}` },
  'vip-b4': { r: 'rare', draw: (g) => `${sky(g, '#0b1630', '#3b4a68')}${starsField(46, 21, '#e8eefc')}<circle cx="318" cy="40" r="18" fill="#eef2fa"/><circle cx="326" cy="35" r="17" fill="#13203c"/><path d="M0 128q70-26 140-4t130-8 130 6v38H0z" fill="#25324c"/><path d="M0 142q90-20 200 0t200-6v24H0z" fill="#1a2438"/><text x="200" y="104" text-anchor="middle" font-family="Georgia,serif" font-size="58" font-weight="700" fill="#dfe6f5" opacity=".1" letter-spacing="10">VIP</text>${[60, 150, 250, 350].map((x, i) => star4(x, 30 + (i % 2) * 22, 5, '#ffffff'))}` },
  'vip-b10': { r: 'epic', draw: (g) => `${sky(g, '#2a0f4f', '#c4508c')}${starsField(30, 33, '#ffe6f6')}<circle cx="200" cy="58" r="40" fill="#ffd166" opacity=".18"/><path d="M0 160V118h40v-30l8-12 8 12v30h40V96c0-26 52-26 52 0v22h28V70c0-40 80-40 80 0v48h28V96c0-26 52-26 52 0v22h40v-30l8-12 8 12v30h8v42z" fill="#2a0b34"/><path d="M0 160V118h40v-30l8-12 8 12v30h40V96c0-26 52-26 52 0v22h28V70c0-40 80-40 80 0v48h28V96c0-26 52-26 52 0v22h40v-30l8-12 8 12v30h8v42z" fill="none" stroke="#e8b44a" stroke-width="1.6" opacity=".9"/>${[48, 122, 200, 278, 352].map((x, i) => `<path d="M${x} ${i === 2 ? 22 : i % 2 ? 60 : 70}l5 10h-10z" fill="#ffd166"/>`).join('')}${[60, 120, 180, 220, 280, 340].map((x) => `<rect x="${x - 4}" y="128" width="8" height="12" rx="4" fill="#ffd166"/>`).join('')}<text x="200" y="150" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-weight="700" fill="#ffd166" letter-spacing="6">VIP PALACE</text>` },
  'vip-b14': { r: 'legendary', draw: (g) => `<defs><radialGradient id="${g}" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#ffe29a"/><stop offset=".35" stop-color="#b8740e"/><stop offset="1" stop-color="#3a0d0d"/></radialGradient></defs><rect width="400" height="160" fill="url(#${g})"/><g opacity=".35">${Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; return `<path d="M200 70L${(200 + 260 * Math.cos(a - .05)).toFixed(1)} ${(70 + 260 * Math.sin(a - .05)).toFixed(1)}L${(200 + 260 * Math.cos(a + .05)).toFixed(1)} ${(70 + 260 * Math.sin(a + .05)).toFixed(1)}z" fill="#fff4cf"/>`; }).join('')}</g><path d="M150 150V84q0-20 14-28l8 10 10-22 18 18 18-18 10 22 8-10q14 8 14 28v66z" fill="#5a1414" stroke="#ffd166" stroke-width="2.4"/><path d="M168 150v-40h64v40" fill="#8a1c1c" stroke="#ffd166" stroke-width="1.6"/><path d="M174 50l7-14 9 9 10-15 10 15 9-9 7 14z" fill="#ffd166" stroke="#7a4f0a"/><circle cx="200" cy="34" r="3.4" fill="#e5484d"/><path d="M0 150h400v10H0z" fill="#2a0909"/><path d="M110 150h180l-10-8H120z" fill="#c8932a"/>` },
  'nb-b2': { r: 'rare', draw: (g) => `${sky(g, '#ff9f5a', '#4b1e5c')}<circle cx="300" cy="96" r="28" fill="#ffd18a" opacity=".85"/><path d="M0 140q100-30 200-6t200-8v34H0z" fill="#3a1e33"/><path d="M120 140V80h18v-14h10v14h16V56h12v-10l6-8 6 8v10h12v24h16V66h10v14h18v60z" fill="#24142a"/>${[132, 172, 206, 246].map((x) => `<rect x="${x}" y="98" width="6" height="10" rx="3" fill="#ffcf70"/>`).join('')}<path d="M188 38v-14l14 5-14 5" fill="#e5484d"/>` },
  'nb-b5': { r: 'epic', draw: (g) => `${sky(g, '#0c1636', '#2c3f7a')}${starsField(40, 51, '#fff7d6')}<circle cx="86" cy="42" r="22" fill="#ffe08a"/><circle cx="86" cy="42" r="30" fill="#ffe08a" opacity=".15"/><path d="M90 160V100h220v60z" fill="#e9e4da"/><path d="M80 100l120-44 120 44z" fill="#f6f1e6" stroke="#cdb67a" stroke-width="2"/>${[110, 150, 190, 230, 270].map((x) => `<rect x="${x}" y="104" width="12" height="56" fill="#d8cfbd"/>`).join('')}<circle cx="200" cy="84" r="8" fill="#cdb67a"/><path d="M0 156h400v4H0z" fill="#cdb67a"/>` },
  'nb-b7': { r: 'legendary', draw: (g) => `${sky(g, '#bfefff', '#2f8f7a')}<path d="M0 130q100-20 200 0t200 0v30H0z" fill="#1f6a4f"/>${[40, 100, 300, 360].map((x, i) => `<path d="M${x} 130c-14-4-16-26 0-40 16 14 14 36 0 40z" fill="#2c8a5c"/><rect x="${x - 2}" y="128" width="4" height="10" fill="#5a3a1c"/>`).join('')}<ellipse cx="200" cy="138" rx="60" ry="10" fill="#7fd8ff" opacity=".8" stroke="#d4a636" stroke-width="2"/><path d="M200 136v-50" stroke="#d4a636" stroke-width="5"/><path d="M200 86c-20 8-30 30-30 46M200 86c20 8 30 30 30 46M200 92c-10 10-14 26-14 40M200 92c10 10 14 26 14 40" stroke="#bff3ff" stroke-width="2" fill="none" opacity=".85"/><circle cx="200" cy="84" r="6" fill="#ffd166"/>` },
  'nb-b9': { r: 'ultra', draw: (g) => `<defs><radialGradient id="${g}" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#3a2a7a"/><stop offset=".6" stop-color="#120a33"/><stop offset="1" stop-color="#05030f"/></radialGradient></defs><rect width="400" height="160" fill="url(#${g})"/>${starsField(70, 77, '#ffe9a8')}<g opacity=".45">${Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return `<path d="M200 74L${(200 + 300 * Math.cos(a - .03)).toFixed(1)} ${(74 + 300 * Math.sin(a - .03)).toFixed(1)}L${(200 + 300 * Math.cos(a + .03)).toFixed(1)} ${(74 + 300 * Math.sin(a + .03)).toFixed(1)}z" fill="#ffd166"/>`; }).join('')}</g><circle cx="200" cy="74" r="34" fill="none" stroke="#ffd166" stroke-width="2"/><path d="M172 88l6-28 12 12 10-20 10 20 12-12 6 28z" fill="#ffd166" stroke="#7a4f0a" stroke-width="1.4"/><circle cx="200" cy="50" r="4" fill="#3ad1ff"/><circle cx="182" cy="62" r="2.6" fill="#e5484d"/><circle cx="218" cy="62" r="2.6" fill="#e5484d"/><text x="200" y="140" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="700" fill="#ffd166" letter-spacing="8">IMPERIUM</text>` },
  'kids-candy': { r: 'common', draw: (g) => `${sky(g, '#ffd1e8', '#ffb3d1')}<path d="M0 130q60-30 120 0t140 0 140 0v30H0z" fill="#ff8fc0"/><path d="M0 145q70-20 140 0t130 0 130 0v15H0z" fill="#ff6aa8"/>${[60, 200, 330].map((x, i) => `<path d="M${x} 130v-46" stroke="#fff" stroke-width="4"/><circle cx="${x}" cy="74" r="${16 + i * 3}" fill="${['#7cdcff', '#ffe066', '#b388ff'][i]}"/><path d="M${x - 10} 74a10 10 0 0 1 20 0 6 6 0 0 1-12 0" fill="none" stroke="#fff" stroke-width="3"/>`).join('')}<circle cx="360" cy="30" r="14" fill="#fff6a8"/>` },
  'kids-jungle': { r: 'common', draw: (g) => `${sky(g, '#9fe8ff', '#d6fff0')}<circle cx="60" cy="38" r="20" fill="#ffd84a"/><circle cx="54" cy="35" r="2" fill="${INK}"/><circle cx="66" cy="35" r="2" fill="${INK}"/><path d="M52 43q8 6 16 0" stroke="${INK}" stroke-width="2" fill="none"/><path d="M0 120q100-30 200 0t200 0v40H0z" fill="#5ed17a"/>${[150, 300].map((x) => `<path d="M${x} 130c2-30 0-50-4-66" stroke="#8a5a2b" stroke-width="7" fill="none"/><path d="M${x - 4} 64c-20-14-40-8-48 2 18-6 32-4 48-2zM${x - 4} 64c14-18 34-18 44-10-16 0-30 4-44 10zM${x - 4} 64c-6-16-22-24-34-22 14 6 24 12 34 22z" fill="#2a8a4a"/>`).join('')}` },
  'kids-sea': { r: 'common', draw: (g) => `${sky(g, '#7fd8ff', '#1e6fd9')}<path d="M0 40q25-10 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0v6H0z" fill="#bff0ff" opacity=".7"/>${[[80, 90, '#ffb13c'], [250, 110, '#ff6a8a'], [330, 70, '#ffd84a']].map(([x, y, c]) => `<path d="M${x} ${y}q14-12 28 0-14 12-28 0zM${x} ${y}l-10-7v14z" fill="${c}"/><circle cx="${x + 20}" cy="${y - 2}" r="2" fill="${INK}"/>`).join('')}${[40, 160, 190, 360].map((x, i) => `<circle cx="${x}" cy="${120 - i * 18}" r="${4 + i}" fill="none" stroke="#e6faff" stroke-width="1.6"/>`).join('')}<path d="M0 150q40-14 80 0t80 0 80 0 80 0 80 0v10H0z" fill="#f2d49b"/>` },
  'desert-night': { r: 'common', draw: (g) => `${sky(g, '#1a1f4f', '#4a2c6b')}${starsField(30, 3)}<circle cx="320" cy="36" r="16" fill="#fff6d6"/><circle cx="314" cy="32" r="16" fill="#1f2457"/><path d="M0 120q80-34 170 0t230-6v46H0z" fill="#c98a4a"/><path d="M0 140q100-24 210 0t190 0v20H0z" fill="#a8703a"/>` },
  'space': { r: 'premium', draw: (g) => `${sky(g, '#05061a', '#1a1450')}${starsField(60, 7)}<circle cx="300" cy="70" r="30" fill="#ff9f6b"/><path d="M300 70m-30 0a30 30 0 0 0 60 0" fill="#d9603a" opacity=".6"/><ellipse cx="300" cy="72" rx="52" ry="10" fill="none" stroke="#ffe0b8" stroke-width="3" transform="rotate(-14 300 72)"/><circle cx="80" cy="120" r="12" fill="#7cc7f2"/>` },
  'magic-garden': { r: 'premium', draw: (g) => `${sky(g, '#1d3557', '#2a6f5a')}<circle cx="70" cy="34" r="16" fill="#f4f0ff" opacity=".9"/><path d="M0 130q100-20 200 0t200 0v30H0z" fill="#1f5a3a"/>${[50, 120, 210, 280, 350].map((x, i) => `<path d="M${x} 132v-${20 + (i % 3) * 8}" stroke="#2fb67c" stroke-width="2"/><circle cx="${x}" cy="${110 - (i % 3) * 8}" r="7" fill="${['#ff8fd0', '#b388ff', '#ffd166', '#7cf0ff', '#ff9f6b'][i]}"/><circle cx="${x}" cy="${110 - (i % 3) * 8}" r="2.6" fill="#fff"/>`).join('')}${Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 61) % 400}" cy="${50 + (i * 23) % 60}" r="1.8" fill="#eaff8a" opacity=".85"/>`).join('')}` },
  'palace': { r: 'rare', draw: (g) => `${sky(g, '#ff9f6b', '#5b2a6b')}<path d="M0 160V118h40v-30l8-12 8 12v30h40V96c0-26 52-26 52 0v22h28V70c0-40 80-40 80 0v48h28V96c0-26 52-26 52 0v22h40v-30l8-12 8 12v30h8v42z" fill="#2a1430"/><path d="M200 22l4 10h-8z" fill="#ffd166"/><circle cx="200" cy="18" r="3" fill="#ffd166"/>${[60, 120, 180, 220, 280, 340].map((x) => `<rect x="${x - 4}" y="128" width="8" height="12" rx="4" fill="#ffd166" opacity=".8"/>`).join('')}` },
  'future-city': { r: 'rare', draw: (g) => `${sky(g, '#0b0d2a', '#3a1458')}${starsField(20, 11)}${[[10, 60], [50, 90], [90, 40], [140, 70], [180, 30], [230, 80], [270, 50], [320, 70], [360, 45]].map(([x, h], i) => `<rect x="${x}" y="${160 - h - 40}" width="34" height="${h + 40}" fill="${i % 2 ? '#1b1f4a' : '#24285c'}"/>${Array.from({ length: Math.floor((h + 30) / 12) }, (_, j) => `<rect x="${x + 6 + (j % 2) * 14}" y="${160 - h - 32 + j * 12}" width="7" height="4" fill="${(i + j) % 3 ? '#58e1ff' : '#ff68b5'}" opacity=".85"/>`).join('')}`).join('')}<path d="M0 150h400" stroke="#ff68b5" stroke-width="2"/><path d="M0 154h400" stroke="#58e1ff" stroke-width="1"/>` },
  'castle': { r: 'rare', draw: (g) => `${sky(g, '#7cc7f2', '#e9f4ff')}<path d="M0 140q100-40 200-10t200-10v40H0z" fill="#5aa86a"/><path d="M140 140V80h20v-14h10v14h20V60h20v20h20V66h10v14h20v60z" fill="#8f9bb3"/>${[150, 200, 250].map((x) => `<path d="M${x} ${x === 200 ? 60 : 66}l10-18 10 18z" fill="#5b3fa8"/><path d="M${x + 10} ${x === 200 ? 42 : 48}v-10l12 4-12 4" fill="#e5484d" stroke="#5b3fa8"/>`).join('')}<path d="M192 140v-24a8 8 0 0 1 16 0v24z" fill="#4a3a2a"/>` },
  'nebula-bg': { r: 'epic', draw: (g) => `<defs><radialGradient id="${g}a" cx="30%" cy="40%" r="50%"><stop offset="0" stop-color="#ff68b5" stop-opacity=".8"/><stop offset="1" stop-color="#ff68b5" stop-opacity="0"/></radialGradient><radialGradient id="${g}b" cx="70%" cy="60%" r="50%"><stop offset="0" stop-color="#58e1ff" stop-opacity=".7"/><stop offset="1" stop-color="#58e1ff" stop-opacity="0"/></radialGradient></defs><rect width="400" height="160" fill="#0a0820"/><rect width="400" height="160" fill="url(#${g}a)"/><rect width="400" height="160" fill="url(#${g}b)"/>${starsField(70, 5)}` },
  'ice-kingdom': { r: 'epic', draw: (g) => `${sky(g, '#bfe8ff', '#3a7bd5')}${Array.from({ length: 16 }, (_, i) => `<path d="M${(i * 53) % 400} ${(i * 29) % 90}v6M${(i * 53) % 400 - 3} ${(i * 29) % 90 + 3}h6" stroke="#fff" stroke-width="1.2"/>`).join('')}<path d="M0 160V130l30-40 20 30 30-60 30 70 40-50 30 50 30-80 30 80 40-50 30 50 30-60 30 60 20-30v80z" fill="#e9f7ff" opacity=".95"/><path d="M80 160l30-90 30 90M230 160l30-110 30 110" fill="#a8dcff"/>` },
  'aurora': { r: 'epic', draw: (g) => `${sky(g, '#06142a', '#0f2e4a')}${starsField(40, 9)}<path class="cx-wave" d="M0 60q100-40 200 0t200-10v30q-100 30-200 0T0 90z" fill="#3dffb0" opacity=".35"/><path class="cx-wave d2" d="M0 40q100-30 200 10t200-10v20q-100 30-200-5T0 60z" fill="#b388ff" opacity=".3"/><path d="M0 160l80-60 50 30 70-50 80 60 60-30 60 40v10z" fill="#0b1f33"/>` },
  'throne': { r: 'legendary', draw: (g) => `${sky(g, '#5a0f12', '#1e0608')}${[40, 110, 290, 360].map((x) => `<rect x="${x - 10}" y="20" width="20" height="140" fill="#3a0a0c"/><rect x="${x - 13}" y="16" width="26" height="8" fill="#ffd166"/>`).join('')}<path d="M170 160V70c0-20 60-20 60 0v90z" fill="#7a1a20" stroke="#ffd166" stroke-width="3"/><path d="M178 70l8-16 6 10 8-14 8 14 6-10 8 16z" fill="#ffd166"/><rect x="176" y="110" width="48" height="14" rx="4" fill="#ffd166"/><path d="M150 160l20-30h60l20 30z" fill="#c0303a"/>` },
  'crystal-cave': { r: 'legendary', draw: (g) => `${sky(g, '#2a1758', '#0e0828')}${[[30, 160, 40, '#b388ff'], [70, 160, 70, '#7cf0ff'], [130, 160, 50, '#ff9fe1'], [270, 160, 80, '#b388ff'], [330, 160, 55, '#7cf0ff'], [370, 160, 40, '#ff9fe1']].map(([x, y, h, c]) => `<path d="M${x - 14} ${y}l6-${h} 8-${h * .2} 8 ${h * .2} 6 ${h}z" fill="${c}" opacity=".85"/><path d="M${x - 2} ${y - h * 1.15}l2 ${h * 1.1}" stroke="#fff" stroke-width="1.4" opacity=".7"/>`).join('')}<path d="M0 0h400v24q-40 14-80 0t-80 6-80-6-80 6-80-6z" fill="#120a2e"/>` },
  'dragon-lair': { r: 'ultra', draw: (g) => `${sky(g, '#2a0606', '#7a1a0a')}<path d="M0 140q60-16 120 0t140-6 140 6v20H0z" fill="#ff6a2b"/><path d="M0 148q70-10 140 0t130 0 130 0v12H0z" fill="#ffd166" opacity=".8"/><path d="M120 110c20-40 70-60 110-40 20 10 40 4 60-10-10 26-30 40-56 40l20 20-36-8c-20 14-60 16-98-2z" fill="#140404"/><path d="M200 70c-10-30 10-50 30-60-8 20-6 34 6 48zM250 64c10-26 34-36 54-36-16 10-24 24-26 40z" fill="#140404"/><circle cx="268" cy="86" r="3" fill="#ffd166"/>` },
  'golden-hall': { r: 'ultra', draw: (g) => `${sky(g, '#3a2208', '#a8700e')}${[40, 120, 200, 280, 360].map((x) => `<path d="M${x - 30} 160V70a30 30 0 0 1 60 0v90z" fill="#5a3a0e" stroke="#ffd166" stroke-width="2"/><circle cx="${x}" cy="40" r="6" fill="#fff3c4"/><path d="M${x} 0v34" stroke="#ffd166" stroke-width="1.4"/>`).join('')}<path d="M0 150h400v10H0z" fill="#ffd166"/>` },
};
export const BG2_IDS = Object.keys(BG);
/* R58b: طبقة الفخامة لخلفيات «مجموعة الفخامة»: إضاءة علوية، بوكيه ضبابي، تظليل أطراف، وإطار ذهبي بزخارف زوايا */
const LUX_TONE = { 'lux-chandelier': '#ffd27a', 'lux-yacht': '#9fd0ff', 'lux-skyline': '#ffb37a', 'lux-dunes': '#ffd9a0', 'lux-crystal': '#c9f3ff', 'lux-royalgalaxy': '#e7b8ff', 'lux-falls': '#ffe08a', 'lux-snowcastle': '#b8f5ff' };
function luxOverlay(g, tone, lv) {
  let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const bokeh = Array.from({ length: 12 }, () => `<circle cx="${(rnd() * 400).toFixed(0)}" cy="${(rnd() * 150).toFixed(0)}" r="${(4 + rnd() * 10).toFixed(1)}" fill="${tone}" opacity="${(.12 + rnd() * .2).toFixed(2)}" filter="url(#${g}bk)"/>`).join('');
  const corner = (x, y, sx, sy) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})"><path d="M0 22V6q0-6 6-6h16" fill="none" stroke="url(#${g}gd)" stroke-width="2.2"/><path d="M5 26q0-14 9-20t20-5" fill="none" stroke="url(#${g}gd)" stroke-width="1.1" opacity=".9"/><path d="M14 14l3-6 3 6-3 6z" fill="#fff4cf"/><circle cx="30" cy="3" r="1.6" fill="#ffe7a3"/><circle cx="3" cy="30" r="1.6" fill="#ffe7a3"/></g>`;
  return `<defs><filter id="${g}bk" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.6"/></filter>`
    + `<radialGradient id="${g}vg" cx="50%" cy="45%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`
    + `<radialGradient id="${g}tl" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="${tone}" stop-opacity=".45"/><stop offset="1" stop-color="${tone}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="${g}gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4cf"/><stop offset=".45" stop-color="#e8b44a"/><stop offset="1" stop-color="#8a5a10"/></linearGradient></defs>`
    + `<rect width="400" height="160" fill="url(#${g}tl)"/>${bokeh}<rect width="400" height="160" fill="url(#${g}vg)"/>`
    + `<rect x="5" y="5" width="390" height="150" rx="9" fill="none" stroke="url(#${g}gd)" stroke-width="${lv >= 5 ? 2.6 : 1.8}"/><rect x="10" y="10" width="380" height="140" rx="6" fill="none" stroke="#ffe7a3" stroke-opacity=".35" stroke-width=".8"/>`
    + corner(8, 8, 1, 1) + corner(392, 8, -1, 1) + corner(8, 152, 1, -1) + corner(392, 152, -1, -1)
    + (lv >= 4 ? `<g transform="translate(200 9)"><path d="M-12 4l-3-8 7 4 8-8 8 8 7-4-3 8z" fill="url(#${g}gd)" stroke="#5a3a08" stroke-width=".6"/></g>` : '')
    + (lv >= 5 ? `<rect class="cx-shine" x="-120" y="0" width="80" height="160" fill="rgba(255,255,255,.16)" transform="skewX(-20)"/>` : '');
}

function bgInner(css) {
  const b = BG[css]; const lv = rarityLv(b.r); const g = nid('bg');
  let s = b.draw(g);
  if (lv >= 2) s += [[30, 20], [370, 30], [200, 14]].map(([x, y]) => star4(x, y, 5, '#fff', 'cx-tw')).join('');
  if (lv >= 3) s += `<g opacity=".1">${[60, 140, 260, 340].map((x) => `<path d="M${x} 0l-30 160h60z" fill="#fff"/>`).join('')}</g>`;
  if (lv >= 4) s += [[100, 60], [300, 50], [240, 100]].map(([x, y], i) => star4(x, y, 3.4, '#fff4c4', 'cx-tw d' + (i + 1))).join('');
  if (LUX_TONE[css]) s += luxOverlay(g, LUX_TONE[css], lv);
  else if (lv >= 5) s += `<rect x="3" y="3" width="394" height="154" rx="10" fill="none" stroke="#ffd166" stroke-width="3"/><rect class="cx-shine" x="-120" y="0" width="80" height="160" fill="rgba(255,255,255,.18)" transform="skewX(-20)"/>`;
  return s;
}
/** مشهد الخلفية كـSVG يغطي الحاوية */
export function bgArt(css, cls = '') {
  if (referenceOf(css)?.slot === 'bg') return referenceImage(css, 'cx-fill ref-background');
  if (!BG[css]) return '';
  return `<svg class="cx-bg r-${BG[css].r} ${cls}" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" direction="ltr" aria-hidden="true" focusable="false">${bgInner(css)}</svg>`;
}
export const isBg2 = (css) => referenceOf(css)?.slot === 'bg' || !!BG[css];
