/* الثيم الملكي قبل أول رسم، لكل المسارات وبلا تغيير التفضيلات المحفوظة. */
document.documentElement.setAttribute('data-theme', 'emerald');
var themeColor = document.querySelector('meta[name="theme-color"]');
if (themeColor) themeColor.setAttribute('content', '#f4eee6');
/* R62: الوضع الداكن — يتطبق قبل أول رسم عشان ما تطلع ومضة فاتحة */
/* R64: الوضع الداكن (ستايل الشارات) هو الافتراضي؛ الفاتح بس لو المستخدم اختاره من الإعدادات */
var lbDark = true;
try { lbDark = localStorage.getItem('la3bak.dark') !== '0'; } catch (e) { /* بدون تخزين: داكن */ }
if (lbDark) { document.documentElement.classList.add('lb-dark'); if (themeColor) themeColor.setAttribute('content', '#0D0614'); }
