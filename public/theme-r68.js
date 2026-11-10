/* R68z39: ألوان الموقع — اللاعب يختار باقة، والموقع كله يتلون (الصور والفيديو تبقى بألوانها الأصلية).
 * الطريقة: تدوير لون الصفحة كلها، ونرجع الصور بالعكس. الاختيار محفوظ بجهاز اللاعب. */
export const THEMES = [
  { id: 'royal', name: 'البنفسجي الملكي', note: 'فاخر واحترافي', icon: '👑', deg: 0, sw: ['#1a0b2e', '#6a1fc9', '#a24cf5', '#e1c4ff'] },
  { id: 'cyber', name: 'الأزرق السيبراني', note: 'عصري ومرتبط بالألعاب', icon: '🎮', deg: -49, sw: ['#0a1430', '#0d4fc0', '#14c8ff', '#bfe8ff'] },
  { id: 'red', name: 'الأحمر الحماسي', note: 'قوي ومناسب للمنافسات', icon: '⚔️', deg: 83, sw: ['#2a0a10', '#8a1020', '#f0202e', '#ffc2cc'] },
  { id: 'gold', name: 'الذهبي الفخم', note: 'مميز لكبار اللاعبين والـVIP', icon: '👑', deg: 147, boost: [1.45, 1.25], sw: ['#2a1a06', '#c88a1e', '#ffd34d', '#fff1c8'] },
  { id: 'teal', name: 'التركوازي العصري', note: 'تجربة مريحة وأنيقة', icon: '💎', deg: -94, sw: ['#062424', '#0d8a86', '#14ead8', '#a8fff4'] },
  { id: 'pink', name: 'الوردي اللطيف', note: 'حيوي وودي', icon: '💗', deg: 54, sw: ['#2a0a20', '#e0368a', '#ff7ac0', '#ffd0e8'] },
  { id: 'galaxy', name: 'المجري', note: 'سحري ومليء بالتفاصيل', icon: '🪐', deg: -9, sw: ['#160a30', '#5a2fd0', '#a78bff', '#d8d0ff'] },
];
const KEY = 'la3bak-theme';
export const currentTheme = () => { try { return localStorage.getItem(KEY) || 'royal'; } catch { return 'royal'; } };
export function applyTheme(id = currentTheme()) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  const root = document.documentElement;
  root.dataset.lbTheme = t.id;
  root.style.setProperty('--lb-hue', t.deg + 'deg');
  root.style.setProperty('--lb-unhue', -t.deg + 'deg');
  let st = document.getElementById('lb-theme-css');
  if (!st) { st = document.createElement('style'); st.id = 'lb-theme-css'; document.head.appendChild(st); }
  st.textContent = t.deg === 0 ? '' : `
html{filter:hue-rotate(var(--lb-hue))${t.boost ? ` brightness(${t.boost[0]}) saturate(${t.boost[1]})` : ''}}
html img,html video,html canvas,html picture,html iframe,html [data-lb-keep],html .lb-keep{filter:${t.boost ? `saturate(${(1 / t.boost[1]).toFixed(3)}) brightness(${(1 / t.boost[0]).toFixed(3)}) ` : ''}hue-rotate(var(--lb-unhue))!important}
html .lb-theme-sw i{filter:hue-rotate(var(--lb-unhue))!important}`;
}
export function setTheme(id) { try { localStorage.setItem(KEY, id); } catch { /* المتصفح يمنع الحفظ */ } applyTheme(id); }
/** صفحة اختيار الألوان (مثل تصميم المالك) */
export function themePickerHTML() {
  const cur = currentTheme();
  return `<section class="th68" dir="rtl"><h1 class="th68-title">ألوان الموقع</h1>
  <p class="th68-hint">اختار اللون اللي يعجبك والموقع كله يتغير على طول. الصور والإطارات تبقى بألوانها.</p>
  <ul class="th68-list">${THEMES.map((t) => `<li><button type="button" class="th68-card${t.id === cur ? ' is-on' : ''}" data-lb-theme="${t.id}" aria-pressed="${t.id === cur}" style="--a:${t.sw[1]};--b:${t.sw[2]};--c:${t.sw[0]}">
    <span class="th68-ic lb-keep" aria-hidden="true">${t.icon}</span><span class="th68-tx"><b>${t.name}</b><small>${t.note}</small></span>
    <span class="th68-sw lb-theme-sw" aria-hidden="true">${t.sw.map((c) => `<i style="background:${c}"></i>`).join('')}</span>${t.id === cur ? '<em class="th68-on">✓ مختار</em>' : ''}</button></li>`).join('')}</ul></section>`;
}
function css() {
  if (document.getElementById('th68-css')) return;
  const st = document.createElement('style'); st.id = 'th68-css';
  st.textContent = `.th68{padding:12px 12px 110px;color:#fff}.th68-title{margin:4px 0 6px;text-align:center;font-size:20px;font-weight:900}.th68-head{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;margin-bottom:6px}.th68-head h1{margin:0;text-align:center;font-size:20px;font-weight:900}
.th68-back{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#ffffff14;color:#fff;text-decoration:none;font-size:24px}
.th68-hint{margin:0 0 12px;text-align:center;font-size:13px;opacity:.75}.th68-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.th68-card{position:relative;width:100%;display:flex;align-items:center;gap:12px;padding:14px;border-radius:20px;cursor:pointer;color:#fff;text-align:right;font:inherit;border:1.5px solid color-mix(in srgb,var(--b) 50%,transparent);background:linear-gradient(120deg,color-mix(in srgb,var(--c) 92%,#000),color-mix(in srgb,var(--a) 40%,var(--c)));box-shadow:0 0 0 0 transparent}
.th68-card.is-on{border-color:var(--b);box-shadow:0 0 18px color-mix(in srgb,var(--b) 55%,transparent)}
.th68-ic{font-size:30px;flex:none}.th68-tx{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}.th68-tx b{font-size:16px}.th68-tx small{opacity:.75;font-size:12px}
.th68-sw{display:flex;gap:4px;flex:none}.th68-sw i{width:20px;height:20px;border-radius:50%;border:1.5px solid #ffffff55}
.th68-on{position:absolute;top:-8px;left:12px;font-style:normal;font-size:11px;font-weight:900;padding:2px 8px;border-radius:99px;background:var(--b);color:#111}`;
  document.head.appendChild(st);
}
if (typeof document !== 'undefined' && !globalThis.__LB_THEME__) {
  globalThis.__LB_THEME__ = true; css(); applyTheme();
  document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-lb-theme]'); if (!b) return; e.preventDefault(); setTheme(b.dataset.lbTheme);
    document.querySelectorAll('[data-lb-theme]').forEach((x) => { const on = x.dataset.lbTheme === b.dataset.lbTheme; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); x.querySelector('.th68-on')?.remove(); if (on) x.insertAdjacentHTML('beforeend', '<em class="th68-on">✓ مختار</em>'); }); });
}
