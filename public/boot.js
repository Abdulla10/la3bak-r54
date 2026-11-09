/* الثيم الملكي قبل أول رسم، لكل المسارات وبلا تغيير التفضيلات المحفوظة. */
document.documentElement.setAttribute('data-theme', 'emerald');
var themeColor = document.querySelector('meta[name="theme-color"]');
if (themeColor) themeColor.setAttribute('content', '#f4eee6');
/* R62: الوضع الداكن — يتطبق قبل أول رسم عشان ما تطلع ومضة فاتحة */
try { if (localStorage.getItem('la3bak.dark') === '1') { document.documentElement.classList.add('lb-dark'); if (themeColor) themeColor.setAttribute('content', '#17111f'); } } catch (e) { /* بدون تخزين: فاتح */ }
