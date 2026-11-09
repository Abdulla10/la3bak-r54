// R67au: ليفل الغرفة لين 300 — شعار حسب المرحلة (10 شعارات)، ومظاهر المميزات حسب الليفل
export const ROOM_LEVEL_MAX = 300;
/** المرحلة (1–10) اللي تحدد شعار الليفل ولونه */
export function roomTier(lv) {
  const n = Number(lv) || 1;
  return n >= 300 ? 10 : n >= 230 ? 9 : n >= 180 ? 8 : n >= 140 ? 7 : n >= 100 ? 6 : n >= 60 ? 5 : n >= 30 ? 4 : n >= 10 ? 3 : n >= 2 ? 2 : 1;
}
export const roomChipArt = (lv) => `/assets/art67/roomlv/t${roomTier(lv)}.webp?v=r67av`;
/** شعار الليفل كامل: إطار المرحلة + رقم الليفل الحقيقي فوقه */
export function roomChipHTML(lv, extra = '') {
  const n = Math.max(1, Math.min(ROOM_LEVEL_MAX, Number(lv) || 1)), t = roomTier(n);
  return `<span class="rl-chip rl-chip-${t} rl67-chip has-art58 ${extra}" title="ليفل الغرفة ${n}" data-rl-tier="${t}"><img class="art58-chip" src="${roomChipArt(n)}" alt="" decoding="async"><b class="rl67-n${n >= 100 ? ' is-3' : ''}" dir="ltr">${n}</b></span>`;
}
/** كلاسات مظهر الغرفة حسب المميزات المفتوحة */
export function roomLevelClasses(lv) {
  const n = Number(lv) || 1, c = [];
  if (n >= 200) c.push('rl67-name-royal'); else if (n >= 80) c.push('rl67-name-flow'); else if (n >= 40) c.push('rl67-name-gold'); else if (n >= 20) c.push('rl67-name-silver');
  if (n >= 230) c.push('rl67-frame-legend'); else if (n >= 150) c.push('rl67-frame-royal'); else if (n >= 120) c.push('rl67-frame-diamond'); else if (n >= 50) c.push('rl67-frame-gold'); else if (n >= 30) c.push('rl67-frame-silver');
  if (n >= 260) c.push('rl67-halo-legend'); else if (n >= 90) c.push('rl67-halo');
  if (n >= 60) c.push('rl67-shine');
  if (n >= 180) c.push('rl67-diamond');
  if (n >= 100) c.push('rl67-featured');
  if (n >= 300) c.push('rl67-crown');
  return c.join(' ');
}
export const ROOM_MILESTONES = [
  [10, 'فتح القبيلة + خلفية «قاعة المجرة»'], [20, 'خلفية «القصر الكوني» + اسم الغرفة فضي'], [30, 'خلفية «السجادة الزرقاء» + إطار فضي لبطاقة الغرفة'],
  [40, 'خلفية «عرش الياقوت» + اسم الغرفة ذهبي'], [50, 'إطار ذهبي لبطاقة الغرفة'], [60, 'شارة الغرفة تلمع'], [70, 'ترحيب مميز يوم أحد يدخل الغرفة'],
  [80, 'اسم الغرفة بلون متحرك'], [90, 'هالة حول بطاقة الغرفة'], [100, 'الغرفة تطلع أول قائمة الغرف (مميزة)'], [120, 'إطار ماسي لبطاقة الغرفة'],
  [150, 'إطار ملكي لبطاقة الغرفة'], [180, 'شارة الغرفة الماسية'], [200, 'اسم الغرفة بألوان ملكية'], [230, 'إطار الغرفة الأسطوري'],
  [260, 'هالة أسطورية متحركة'], [300, 'لقب «أسطورة الغرف» + تاج دائم على الغرفة'],
];

// إشعار ارتفاع ليفل الغرفة
function esc(t) { return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
export function showRoomLevelUp(m) {
  if (typeof document === 'undefined' || !m || !Number.isSafeInteger(m.level)) return;
  const ms = ROOM_MILESTONES.find(([l]) => l === m.level);
  const el = document.createElement('div');
  el.className = `rl67-toast${ms ? ' is-milestone' : ''}`; el.setAttribute('role', 'status'); el.dir = 'rtl';
  el.innerHTML = `${roomChipHTML(m.level)}<div><b>${esc(m.name || 'الغرفة')} وصلت <span dir="ltr">Lv ${m.level}</span> 🎉</b><small>${ms ? esc(ms[1]) : `سعة الغرفة زادت عضوين${m.level % 5 === 0 ? ' · هدية عملات لصاحب الغرفة' : ''}`}</small></div>`;
  document.body.append(el);
  setTimeout(() => el.classList.add('is-out'), 4200); setTimeout(() => el.remove(), 4800);
}
if (typeof window !== 'undefined' && !window.__rl67) { window.__rl67 = 1; addEventListener('la3bak:roomlevel', (e) => showRoomLevelUp(e.detail)); }

/** Lv70+: ترحيب مميز يوم أحد يدخل الغرفة */
export function roomLevelWelcomeHTML(lv, who, room) {
  return `<div class="rl67-welcome" role="status" dir="rtl">${roomChipHTML(lv)}<div><b>أهلًا ${esc(who)} ✨</b><small>نوّرت «${esc(room)}» · غرفة <span dir="ltr">Lv ${Number(lv) || 1}</span></small></div></div>`;
}
