-- R69zx: نسخة ثانية من كل ملفات بيانات لعبك داخل قاعدة البيانات (MariaDB).
-- الملفات تبقى الأساس، وقاعدة البيانات تاخذ نسخة من كل تغيير خلال ثواني.
-- لو انمسح ملف أو خرب على السيرفر، يرجع تلقائياً من قاعدة البيانات أول ما يقوم السيرفر.
-- يطبّقه ماينوس مرة وحدة، وبعدها يحط DATA_MIRROR=1 في إعدادات السيرفر.
CREATE TABLE IF NOT EXISTS la3bak_docs (
  name VARCHAR(190) NOT NULL PRIMARY KEY,
  body LONGTEXT NOT NULL,
  bytes INT UNSIGNED NOT NULL,
  sha CHAR(40) NOT NULL,
  updated BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
