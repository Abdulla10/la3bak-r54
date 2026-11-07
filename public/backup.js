/* نسخة احتياطية لتقدمك بملف، بدون حساب: تحفظه وترجعه على أي جهاز */
const KEEP = /^qa_(profile|tower|kids|missions|daily|theme|sound|quality|font|offline)_v\d+$/;
export function exportData() {
  const data = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (KEEP.test(k)) data[k] = localStorage.getItem(k); } } catch { /* ignore */ }
  const blob = new Blob([JSON.stringify({ app: 'la3bak', v: 1, at: new Date().toISOString(), data })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'la3bak-backup.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return Object.keys(data).length;
}
export async function importFile(file) {
  if (!file || file.size > 1_500_000) return { ok: false, error: 'الملف كبير أو غير صالح.' };
  let j;
  try { j = JSON.parse(await file.text()); } catch { return { ok: false, error: 'هذا مو ملف نسخة احتياطية صحيح.' }; }
  if (!j || (j.app !== 'la3bak' && j.app !== 'qawwi') || typeof j.data !== 'object' || !j.data) return { ok: false, error: 'هذا مو ملف نسخة احتياطية من «لعبك».' };
  let n = 0;
  for (const [k, v] of Object.entries(j.data)) {
    if (!KEEP.test(k) || typeof v !== 'string' || v.length > 400_000) continue;
    try { JSON.parse(v); } catch { if (!/^(0|1|high|lite|[\d.]+|\w+)$/.test(v)) continue; }
    try { localStorage.setItem(k, v); n++; } catch { /* ممتلئ */ }
  }
  return n ? { ok: true, n } : { ok: false, error: 'ما لقينا بيانات نقدر نرجعها في الملف.' };
}
