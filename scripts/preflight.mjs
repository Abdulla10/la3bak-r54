// يتأكد إن أدوات البناء موجودة قبل npm run build/dev/test، ويطلع رسالة واضحة بدل خطأ غامض.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const [major] = process.versions.node.split('.').map(Number);
if (major < 20) { console.error(`يحتاج Node 20 أو أحدث (الموجود ${process.versions.node}).`); process.exit(1); }
const missing = process.argv.slice(2).filter((bin) => !existsSync(join(process.cwd(), 'node_modules', '.bin', bin)));
if (missing.length) { console.error(`أدوات ناقصة: ${missing.join(', ')} — شغّل npm install أول.`); process.exit(1); }
