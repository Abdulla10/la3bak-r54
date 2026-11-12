/* R70: تشغيل لوحة التحكم كموقع منفصل (بدون ملفات الموقع). */
import { mountAdmin } from './admin.js?v=r114';

/** رابط الموقع: لو اللوحة على admin.la3bak.com يصير la3bak.com، ولو على la3bak.com/admin يصير نفس الموقع */
const SITE = location.hostname.startsWith('admin.') ? `${location.protocol}//${location.hostname.slice(6)}${location.port ? ':' + location.port : ''}` : location.origin;

// روابط داخل اللوحة تودي لصفحات الموقع (غرفة، الترتيب…) → نفتحها على الموقع بتبويب جديد
document.addEventListener('click', (e) => {
  const a = e.target instanceof Element ? e.target.closest('a[href^="#/"]') : null;
  if (!a) return;
  e.preventDefault();
  window.open(SITE + '/' + a.getAttribute('href'), '_blank', 'noopener');
}, true);

const root = document.getElementById('adminRoot');
try { root.textContent = ''; mountAdmin(root); }
catch { root.innerHTML = '<p class="adp-boot">تعذّر تحميل لوحة التحكم؛ حدّث الصفحة.</p>'; }
