/* R58c: رتبة الغرفة الشهرية — صفحة الامتيازات والمكافأة الشهرية، وشعارات الرتب (رسم أصلي SVG). */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const num = (n) => Number(n || 0).toLocaleString('en-US');
export const TIERS = Object.freeze([
  { id: 'silver', name: 'فضية', min: 300, perks: 1, bg: ['#155a40', '#0b2f22', '#061a13'], m: ['#ffffff', '#c3ccd8', '#6b7688'], a: '#7fe0b4' },
  { id: 'gold', name: 'ذهبية', min: 3000, perks: 3, bg: ['#8a5a14', '#3e2508', '#1c1004'], m: ['#fff4c4', '#f0b62e', '#8a5a08'], a: '#ffd166' },
  { id: 'diamond', name: 'ماسية', min: 15000, perks: 6, bg: ['#5b2aa8', '#2a1060', '#140630'], m: ['#ffffff', '#e2c3ff', '#7a3cd0'], a: '#b98cff' },
  { id: 'royal', name: 'ملكية', min: 40000, perks: 9, bg: ['#9a1f14', '#4a0a08', '#200404'], m: ['#fff0b8', '#ffb02e', '#a2140f'], a: '#ff7a45' },
  { id: 'legend', name: 'أسطورية', min: 75000, perks: 10, bg: ['#4a3a18', '#1c160a', '#0a0805'], m: ['#ffffff', '#ffd76a', '#7a5a10'], a: '#ffe7a3' },
]);
export const tierIndex = (id) => TIERS.findIndex((t) => t.id === id);
const P = (d) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PERK_ICONS = {
  badge: P('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 8.5l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z"/>'),
  data: P('<ellipse cx="11" cy="6" rx="7" ry="3"/><path d="M4 6v6c0 1.7 3.1 3 7 3M4 12v6c0 1.7 3.1 3 7 3M18 6v4"/><path d="M15 19l5-5 1.5 1.5-5 5H15z"/>'),
  staff: P('<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/><path d="M8.5 14.5c2 2 5 2 7 0"/>'),
  theme: P('<path d="M8 4l-4 3 2 3 2-1v11h8V9l2 1 2-3-4-3c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z"/><path d="M14 14l1.5 1.5L18 13"/>'),
  promo: P('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 15l3-4 3 3 2-2 3 3"/><path d="M15 7.5h2"/>'),
  bag: P('<rect x="5" y="6" width="14" height="14" rx="4"/><path d="M9 6V4.5h6V6"/><circle cx="12" cy="13" r="3"/>'),
  list: P('<path d="M4 9a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3H7a3 3 0 01-3-3z"/><path d="M9 6l3-3 3 3"/><path d="M12 10v6M9 13h6"/>'),
  welcome: P('<path d="M7 12V6.5a1.5 1.5 0 013 0V11M10 10V5a1.5 1.5 0 013 0v5M13 10V6a1.5 1.5 0 013 0v6c0 4-2.5 7-6 7s-5-2-6.5-5L3 11.5a1.5 1.5 0 012.5-1.5L7 12"/><path d="M19 3l1 2M21.5 6.5l-2 .5"/>'),
  frame: P('<rect x="4" y="4" width="16" height="16" rx="8"/><rect x="8" y="8" width="8" height="8" rx="4"/><path d="M12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2"/>'),
  carry: P('<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2"/><path d="M9 3h6M18.5 6.5l1.5-1.5"/>'),
};
/** الامتيازات العشرة بترتيب انفتاحها: فضية 1، ذهبية 3، ماسية 6، ملكية 9، أسطورية 10 */
export const PERKS = Object.freeze([
  { id: 'badge', name: 'شارة رتبة الغرفة', sub: (t) => `الرتبة ${t.name}` },
  { id: 'data', name: 'أداة بيانات الغرفة', sub: () => 'تساعدك في التشغيل' },
  { id: 'staff', name: 'تواصل مع الدعم', sub: () => 'زر مباشر لفريق الدعم' },
  { id: 'theme', name: 'سمة الغرفة', sub: (t) => `ألوان رتبة ${t.name}` },
  { id: 'promo', name: 'ظهور ترويجي', sub: () => 'الغرفة تطلع أعلى القائمة' },
  { id: 'bag', name: 'حقيبة حظ شهرية', sub: () => 'قريبًا — تحتاج اعتماد الإدارة', soon: true },
  { id: 'list', name: 'مظهر مميز بالقائمة', sub: () => 'إطار متوهّج بقائمة الغرف' },
  { id: 'welcome', name: 'ترحيب حصري', sub: () => 'رسوم ترحيبية عند دخول أي عضو' },
  { id: 'frame', name: 'إطار صورة الغرفة', sub: (t) => `إطار ${t.name} حول صورة الغرفة` },
  { id: 'carry', name: 'ترحيل النقاط', sub: () => 'الفايض عن الأسطورية ينتقل للشهر الجاي' },
]);
export const perkActive = (tierId, perkId) => { const t = tierIndex(tierId); return t >= 0 && PERKS.findIndex((p) => p.id === perkId) < TIERS[t].perks; };

/** شعارات رتب الغرفة: كل رتبة شكل مختلف كليًا (رسم أصلي للموقع)
 * فضية: ميدالية مسنّنة بغار وشرائط · ذهبية: درع ملكي بتاج وسيفين · ماسية: ماسة مقطوعة بأجنحة كريستال
 * ملكية: عنقاء نارية بتاج · أسطورية: شعار تنين بأجنحة وتاج إمبراطوري وأشعة */
const P2 = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)].map((v) => v.toFixed(1)).join(' ');
function emblemDefs(g) {
  return `<filter id="${g}bv" x="-.2" y="-.2" width="1.4" height="1.4"><feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b"/><feSpecularLighting in="b" surfaceScale="2.6" specularConstant=".95" specularExponent="20" lighting-color="#ffffff" result="s"><feDistantLight azimuth="235" elevation="48"/></feSpecularLighting><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".75" k4="0"/></filter><filter id="${g}gl" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="3.2"/></filter>`;
}
const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const EMBLEMS = [
  // فضية: ميدالية
  (g) => { let teeth = ''; for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, b = (k + .5) / 28 * Math.PI * 2; teeth += `L${P2(60, 54, 40, a)}L${P2(60, 54, 35.5, b)}`; }
    let laurel = ''; for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const a = Math.PI / 2 + s * (0.5 + k * .3); const [x, y] = [60 + 26 * Math.cos(a), 54 + 26 * Math.sin(a)]; laurel += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5" ry="2.2" transform="rotate(${(a * 180 / Math.PI + s * 70).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="url(#${g}m)"/>`; }
    return `<defs>${emblemDefs(g)}${grad(g + 'm', ['#ffffff', '#c9d2de', '#7d8899', '#e9eef5'], 1, 1)}${grad(g + 'r', ['#2fbf86', '#0d6b48'])}<radialGradient id="${g}c" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#f6f8fb"/><stop offset="1" stop-color="#9aa6b8"/></radialGradient></defs>
<path d="M40 82L30 116l14-7 8 12 8-34zM80 82l10 34-14-7-8 12-8-34z" fill="url(#${g}r)" stroke="#0a4a32" stroke-width="1"/>
<g filter="url(#${g}bv)"><path d="M${P2(60, 54, 40, 0)}${teeth}Z" fill="url(#${g}m)" stroke="#5d6778" stroke-width=".8"/><circle cx="60" cy="54" r="31" fill="url(#${g}c)" stroke="#6b7688" stroke-width="1.4"/><circle cx="60" cy="54" r="22" fill="none" stroke="#fff" stroke-opacity=".7"/>${laurel}<path d="M60 38l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L60 61.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="url(#${g}m)" stroke="#6b7688" stroke-width="1"/></g>`; },
  // ذهبية: درع ملكي بتاج وسيفين
  (g) => `<defs>${emblemDefs(g)}${grad(g + 'm', ['#fff6cf', '#f2c140', '#a8700e', '#ffe08a'], 1, 1)}${grad(g + 'f', ['#8a1c1c', '#4a0808'])}${grad(g + 's', ['#ffffff', '#b9c2d0', '#6b7688'], 1, 0)}</defs>
<g transform="rotate(-38 60 66)"><rect x="57.5" y="14" width="5" height="78" rx="2" fill="url(#${g}s)"/><rect x="50" y="88" width="20" height="5" rx="2" fill="url(#${g}m)"/><rect x="58" y="93" width="4" height="14" fill="#5a3206"/></g><g transform="rotate(38 60 66)"><rect x="57.5" y="14" width="5" height="78" rx="2" fill="url(#${g}s)"/><rect x="50" y="88" width="20" height="5" rx="2" fill="url(#${g}m)"/><rect x="58" y="93" width="4" height="14" fill="#5a3206"/></g>
<g filter="url(#${g}bv)"><path d="M60 30l30 8v26c0 22-14 36-30 46-16-10-30-24-30-46V38z" fill="url(#${g}m)" stroke="#7a4f0a" stroke-width="1.4"/><path d="M60 37l23 6v21c0 17-11 28-23 36-12-8-23-19-23-36V43z" fill="url(#${g}f)"/><path d="M60 47l3.4 7 7.6 1.1-5.5 5.4 1.3 7.6L60 64.4l-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" fill="url(#${g}m)"/><path d="M48 80h24M52 86h16" stroke="url(#${g}m)" stroke-width="2.4" stroke-linecap="round"/>
<path d="M38 28l-3-16 11 8 7-14 7 11 7-11 7 14 11-8-3 16z" fill="url(#${g}m)" stroke="#7a4f0a" stroke-width="1"/><rect x="38" y="26" width="44" height="6" rx="2" fill="url(#${g}m)" stroke="#7a4f0a" stroke-width=".8"/><circle cx="60" cy="9" r="3" fill="#e5484d" stroke="#fff" stroke-width=".8"/><circle cx="46" cy="18" r="2" fill="#3ad1ff"/><circle cx="74" cy="18" r="2" fill="#3ad1ff"/></g>`,
  // ماسية: ماسة مقطوعة بأجنحة كريستال
  (g) => { let wings = ''; for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const y = 34 + k * 9, len = 34 - k * 4; const x0 = 60 + s * 22; wings += `<path d="M${x0} ${y}L${x0 + s * len} ${y - 8 + k * 1.5}L${x0 + s * (len - 6)} ${y + 3}L${x0} ${y + 7}z" fill="url(#${g}w)" stroke="#e9dcff" stroke-width=".6" opacity="${1 - k * .08}"/>`; }
    return `<defs>${emblemDefs(g)}${grad(g + 'w', ['#ffffff', '#cdb2ff', '#7a3cd0'], 1, 1)}${grad(g + 'a', ['#ffffff', '#e8dcff'])}${grad(g + 'b', ['#cbb0ff', '#8b55e6'])}${grad(g + 'c', ['#a87cf0', '#4a1f8a'])}</defs>
<circle cx="60" cy="60" r="34" fill="#b98cff" opacity=".35" filter="url(#${g}gl)"/>${wings}
<g filter="url(#${g}bv)"><path d="M36 46l12-16h24l12 16-24 50z" fill="url(#${g}c)" stroke="#fff" stroke-width="1.2"/><path d="M36 46h48L60 96z" fill="url(#${g}b)"/><path d="M48 30l-12 16h16zM72 30l12 16H68zM48 30h24l-4 16H52z" fill="url(#${g}a)"/><path d="M52 46L60 96l8-50z" fill="#ffffff" opacity=".55"/><path d="M36 46l24 50M84 46L60 96M52 46l8-16 8 16" stroke="#fff" stroke-opacity=".7" stroke-width=".8" fill="none"/></g>
<path d="M84 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2z M32 70l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#fff"/>`; },
  // ملكية: عنقاء نارية بتاج
  (g) => { let wing = ''; for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const a = -150 + k * 17; const len = 44 - Math.abs(k - 2) * 3; wing += `<path d="M0 0C${len * .35} -7 ${len * .8} -6 ${len} 0C${len * .75} 4 ${len * .35} 6 0 0Z" transform="translate(${60 + s * 8} 56) scale(${s} 1) rotate(${a + 40})" fill="url(#${g}f${k % 2})" stroke="#7a1206" stroke-width=".6"/>`; }
    let tail = ''; for (let k = -2; k <= 2; k++) tail += `<path d="M60 76C${60 + k * 6} 92 ${60 + k * 12} 104 ${60 + k * 15} 116C${60 + k * 7} 108 ${60 + k * 3} 96 60 80z" fill="url(#${g}f${(k + 2) % 2})"/>`;
    return `<defs>${emblemDefs(g)}${grad(g + 'f0', ['#fff0b8', '#ffb02e', '#e0262f'], 1, 0)}${grad(g + 'f1', ['#ffe08a', '#ff6a2b', '#a2140f'], 1, 0)}${grad(g + 'm', ['#fff6cf', '#f2c140', '#a8700e'], 1, 1)}<radialGradient id="${g}r" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#ff9a8a"/><stop offset=".6" stop-color="#c4121b"/><stop offset="1" stop-color="#5a0610"/></radialGradient></defs>
<circle cx="60" cy="58" r="38" fill="#ff7a45" opacity=".35" filter="url(#${g}gl)"/>${tail}${wing}
<g filter="url(#${g}bv)"><circle cx="60" cy="58" r="17" fill="url(#${g}m)" stroke="#7a4f0a"/><circle cx="60" cy="58" r="12" fill="url(#${g}r)" stroke="#fff" stroke-opacity=".6"/><path d="M60 50l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#fff6cf"/>
<path d="M44 38l-2-14 9 7 9-12 9 12 9-7-2 14z" fill="url(#${g}m)" stroke="#7a4f0a"/><circle cx="60" cy="18" r="2.6" fill="#3ad1ff" stroke="#fff" stroke-width=".6"/><circle cx="48" cy="29" r="1.8" fill="#fff"/><circle cx="72" cy="29" r="1.8" fill="#fff"/></g>`; },
  // أسطورية: تنين وتاج إمبراطوري
  (g) => { let rays = ''; for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; rays += `<path d="M60 58L${P2(60, 58, 64, a - .05)}L${P2(60, 58, 64, a + .05)}z" fill="${k % 2 ? '#ffe7a3' : '#ffffff'}" opacity=".5"/>`; }
    const bat = (s) => `<path d="M${60 + s * 18} 52C${60 + s * 30} 30 ${60 + s * 46} 22 ${60 + s * 58} 26C${60 + s * 52} 34 ${60 + s * 54} 40 ${60 + s * 56} 46C${60 + s * 48} 44 ${60 + s * 46} 50 ${60 + s * 48} 58C${60 + s * 40} 54 ${60 + s * 36} 60 ${60 + s * 38} 68C${60 + s * 30} 64 ${60 + s * 24} 66 ${60 + s * 20} 72z" fill="url(#${g}d)" stroke="#ffd76a" stroke-width="1.2"/><path d="M${60 + s * 22} 54L${60 + s * 56} 28M${60 + s * 22} 58L${60 + s * 48} 48M${60 + s * 22} 64L${60 + s * 38} 62" stroke="#ffd76a" stroke-width=".9" opacity=".8"/>`;
    return `<defs>${emblemDefs(g)}${grad(g + 'm', ['#ffffff', '#ffe08a', '#c9952a', '#fff3c4'], 1, 1)}${grad(g + 'd', ['#3a2a10', '#0a0805'], 0, 1)}<radialGradient id="${g}c" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#3a2d14"/><stop offset="1" stop-color="#0a0805"/></radialGradient></defs>
<g class="rr-spin">${rays}</g><circle cx="60" cy="60" r="36" fill="#ffd76a" opacity=".35" filter="url(#${g}gl)"/>${bat(-1)}${bat(1)}
<g filter="url(#${g}bv)"><circle cx="60" cy="62" r="25" fill="url(#${g}m)" stroke="#7a5a10" stroke-width="1.2"/><circle cx="60" cy="62" r="20" fill="url(#${g}c)" stroke="#ffe7a3" stroke-width=".8"/>
<path d="M50 70c4-12 14-18 22-14-6 0-9 4-8 8 3-2 7-1 8 2-5-1-8 2-8 6 2 0 4 2 4 4-6-3-12-4-18-6z" fill="url(#${g}m)"/><circle cx="66" cy="58" r="1.3" fill="#e5484d"/>
<path d="M34 40L30 14l12 11 9-17 9 13 9-13 9 17 12-11-4 26z" fill="url(#${g}m)" stroke="#7a5a10" stroke-width="1.1"/><rect x="34" y="37" width="52" height="7" rx="2.5" fill="url(#${g}m)" stroke="#7a5a10" stroke-width=".8"/>${[40, 50, 60, 70, 80].map((x, i) => `<circle cx="${x}" cy="40.5" r="1.8" fill="${i % 2 ? '#3ad1ff' : '#e5484d'}"/>`).join('')}<circle cx="60" cy="6" r="3.4" fill="#ffffff" stroke="#ffd76a"/><path d="M60 0v-4M56 2l-2-3M64 2l2-3" stroke="#fff" stroke-width="1"/>
<path d="M36 92q24 14 48 0l-4 8q-20 10-40 0z" fill="url(#${g}m)" stroke="#7a5a10" stroke-width=".8"/></g>`; },
];
export function tierEmblem(i, size = 120, uid = 'e') {
  // R58g: شعارات 3D مرندرة (three.js) — ملفات الرسم بمجلد tools/room-rank-badges
  const t = TIERS[i]; return `<img class="rr-emblem rr-emblem-${t.id}" src="/assets/room-rank/${t.id}.webp?v=r58g" width="${size}" height="${size}" alt="" decoding="async" draggable="false">`;
}
export const tierChip = (tierId, uid = 'c') => { const i = tierIndex(tierId); if (i < 0) return ''; return `<span class="rr-chip rr-chip-${esc(tierId)}" title="رتبة الغرفة: ${esc(TIERS[i].name)}">${tierEmblem(i, 18, uid)}<b>${esc(TIERS[i].name)}</b></span>`; };

/** صفحة رتبة الغرفة كاملة الشاشة */
export function roomRankPageHTML(room, ui, stats) {
  const rank = room?.rank || { pts: 0, tier: null, month: '' };
  const cur = tierIndex(rank.tier); const view = Number.isInteger(ui.rankView) ? ui.rankView : Math.max(0, cur);
  const t = TIERS[view]; const tab = ui.rankTab === 'monthly' ? 'monthly' : 'perks';
  const reached = cur >= view; const [yy, mm] = String(rank.month || '').split('-');
  const nextT = TIERS[cur + 1]; const toNext = nextT ? Math.max(0, nextT.min - (rank.pts || 0)) : 0;
  const track = TIERS.slice().reverse().map((x) => { const i = tierIndex(x.id); return `<button type="button" class="rr-stop${i <= cur ? ' is-done' : ''}${i === view ? ' is-view' : ''}" data-so-action="rank-view" data-id="${i}"><i></i><b>${num(x.min)}</b><small>${esc(x.name)}</small></button>`; }).join('');
  const side = (i) => (i >= 0 && i < TIERS.length ? `<button type="button" class="rr-side" data-so-action="rank-view" data-id="${i}" aria-label="رتبة ${esc(TIERS[i].name)}">${tierEmblem(i, 64, 's' + i)}</button>` : '<span class="rr-side"></span>');
  const perks = PERKS.map((p, k) => { const on = k < t.perks; const inner = `<span class="rr-perk-ic">${PERK_ICONS[p.id]}</span><b>${esc(p.name)}</b><small>${esc(p.sub(t))}</small>`; return p.id === 'staff' && on && view <= cur ? `<a class="rr-perk" href="#/support">${inner}</a>` : `<div class="rr-perk${on ? '' : ' is-locked'}${p.soon ? ' is-soon' : ''}">${inner}</div>`; }).join('');
  const statsHTML = stats && cur >= 1 && view === cur ? `<section class="rr-stats"><h3>بيانات الغرفة هذا الشهر</h3><div class="rr-stat-grid"><div><b>${num(stats.pts)}</b><small>نقاط الشهر</small></div><div><b>${num(stats.gifts)}</b><small>هدايا</small></div><div><b>${num(stats.supporters)}</b><small>داعمين</small></div><div><b>${num(stats.members)}</b><small>بالغرفة الحين</small></div></div>${stats.top?.length ? `<ol class="rr-top">${stats.top.map((s) => `<li><span>${esc(s.name || 'لاعب')}</span><b>${num(s.pts)}</b></li>`).join('')}</ol>` : ''}</section>` : '';
  const monthly = `<section class="rr-monthly"><p>الرتبة تنحسب من نقاط الهدايا اللي تنرسل داخل الغرفة خلال الشهر (كل جوهرة = نقطة)، وتبدأ من جديد أول كل شهر. امتيازات الرتبة تشتغل طول ما الغرفة محافظة عليها بالشهر.</p><table><thead><tr><th>الرتبة</th><th>النقاط</th><th>الامتيازات</th></tr></thead><tbody>${TIERS.map((x, i) => `<tr class="${i === cur ? 'is-cur' : ''}"><td>${tierEmblem(i, 28, 'm' + i)} ${esc(x.name)}</td><td>${num(x.min)}</td><td>${x.perks} / 10</td></tr>`).join('')}</tbody></table></section>`;
  return `<div class="rr-page" dir="rtl" role="dialog" aria-modal="true" aria-label="رتبة الغرفة" data-rr-tier="${esc(t.id)}" style="--rr0:${t.bg[0]};--rr1:${t.bg[1]};--rr2:${t.bg[2]};--rra:${t.a}">
<header class="rr-top-bar"><button type="button" class="rr-back" data-so-action="rank-close" aria-label="رجوع"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button><nav class="rr-tabs"><button type="button" class="${tab === 'perks' ? 'is-on' : ''}" data-so-action="rank-tab" data-id="perks">الامتيازات</button><button type="button" class="${tab === 'monthly' ? 'is-on' : ''}" data-so-action="rank-tab" data-id="monthly">المكافأة الشهرية</button></nav></header>
<section class="rr-room"><div class="rr-room-card">${room.photo ? `<img src="${esc(room.photo)}" alt="">` : '<span class="rr-room-ph">🏠</span>'}<div><b>${esc(room.name)}</b><small dir="ltr">${esc(yy || '')}.${esc(mm || '')}</small></div></div>
<div class="rr-points"><span class="rr-pts" dir="ltr">${num(rank.pts)}</span><small>${cur >= 0 ? `رتبة الشهر: ${esc(TIERS[cur].name)}` : 'ما وصلت رتبة بعد'}${nextT ? ` · باقي ${num(toNext)} لـ${esc(nextT.name)}` : ' · أعلى رتبة'}</small></div></section>
<div class="rr-track" dir="ltr">${track}</div>
<section class="rr-hero"><div class="rr-carousel">${side(view + 1)}<div class="rr-main">${tierEmblem(view, 150, 'h')}</div>${side(view - 1)}</div><h2>${esc(t.name)}</h2><p>${reached ? (view === cur ? 'هذي رتبة غرفتك هالشهر' : 'وصلتها غرفتك هالشهر') : `لم تصل الغرفة لهذي الرتبة بعد (${num(t.min)} نقطة)`}</p></section>
${tab === 'perks' ? `<div class="rr-perks-head"><span></span><b>الامتيازات ${t.perks} / 10</b><span></span></div><div class="rr-perks">${perks}</div>${statsHTML}` : monthly}
</div>`;
}
/** ترحيب حصري لما أحد يدخل غرفة ملكية أو أسطورية */
export function welcomeHTML(tierId, name) {
  const i = tierIndex(tierId); if (i < 0) return '';
  return `<div class="rr-welcome rr-welcome-${esc(tierId)}" role="status">${tierEmblem(i, 44, 'w')}<span><small>غرفة ${esc(TIERS[i].name)}</small><b>أهلًا ${esc(name)}</b></span></div>`;
}
