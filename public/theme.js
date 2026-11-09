/* المظهر الزمردي المعتمد لجميع الصفحات؛ التفضيلات القديمة تبقى محفوظة دون تطبيقها. */
const KEY = 'qa_theme_v1';
export const THEMES = [
  { id: 'emerald', name: 'زمردي وعاجي وذهبي', bg: '#f4eee6', a: '#5a2a8c', b: '#c49a3a', meta: '#f4eee6' },
];
export const DEFAULT = 'emerald';

export function current() {
  // سياسة العرض مستقلة عن قيمة التخزين القديمة وعن مسار الصفحة.
  return DEFAULT;
}

export function apply(id) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  const root = document.documentElement;
  root.setAttribute('data-theme', t.id);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t.meta);
  return t.id;
}

export function set(id) {
  const t = apply(id);
  // لا تُرحّل أو تُحذف القيمة الخام إلا عند اختيار المظهر الملكي صراحة.
  if (id === DEFAULT) {
    try { localStorage.setItem(KEY, t); } catch { /* يعمل للجلسة الحالية عند قفل التخزين */ }
  }
  return t;
}

export function pickerHTML() {
  const cur = current();
  return `<div class="theme-grid" role="radiogroup" aria-label="المظهر الزمردي المعتمد">${THEMES.map(
    (t) => `<button type="button" class="theme-card ${t.id === cur ? 'on' : ''}" role="radio" aria-checked="${t.id === cur}" data-act="theme" data-id="${t.id}">
      <span class="tick" aria-hidden="true">✓</span>
      <span class="theme-prev" style="background:${t.bg}"><i class="b1" style="background:${t.a}"></i><i class="b2" style="background:${t.b}"></i></span>
      <span>${t.name}</span></button>`,
  ).join('')}</div>`;
}

apply(current());

/* R62: الوضع الداكن (تفضيل لكل جهاز) */
export function isDark() { return document.documentElement.classList.contains('lb-dark'); }
export function setDark(on) {
  document.documentElement.classList.toggle('lb-dark', !!on);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', on ? '#0D0614' : '#f4eee6');
  try { localStorage.setItem('la3bak.dark', on ? '1' : '0'); } catch { /* للجلسة بس */ }
  return !!on;
}
