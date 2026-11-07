/* بطاقة نتيجة كصورة (تُرسم بالمتصفح، بدون أي خادم) */
const W = 1080, H = 1350;
function wrap(ctx, text, maxW) {
  const words = String(text).split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
export async function cardBlob({ title, big, sub, foot }) {
  try { await document.fonts?.ready; } catch { /* ignore */ }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.direction = 'rtl'; x.textAlign = 'center';
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2b1b66'); g.addColorStop(0.6, '#4a2a99'); g.addColorStop(1, '#0f3a5e');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#e7c76b'; x.lineWidth = 6; x.strokeRect(40, 40, W - 80, H - 80);
  x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.arc(W / 2, 560, 330, 0, 7); x.fill();
  const F = '"IBM Plex Sans Arabic", "Lalezar", system-ui, sans-serif';
  x.fillStyle = '#f6e4b8'; x.font = `700 74px ${F}`; x.fillText('لعبك · LA3BAK', W / 2, 190);
  x.font = `600 40px ${F}`; x.fillStyle = '#e7c76b'; x.fillText(title, W / 2, 270);
  x.fillStyle = '#fff'; x.font = `800 260px ${F}`; x.fillText(big, W / 2, 640);
  x.font = `600 56px ${F}`; x.fillStyle = '#fff6d8';
  wrap(x, sub, W - 220).slice(0, 3).forEach((l, i) => x.fillText(l, W / 2, 780 + i * 80));
  x.font = `600 40px ${F}`; x.fillStyle = '#e7c76b'; x.fillText('تقدر تتحداني؟', W / 2, 1130);
  x.fillStyle = '#fff'; x.font = `700 44px ${F}`; x.fillText(foot, W / 2, 1200);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
export async function shareCard(data, text) {
  const blob = await cardBlob(data);
  if (!blob) return 'fail';
  const file = new File([blob], 'la3bak-result.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return 'shared'; }
  } catch (e) { if (e?.name === 'AbortError') return 'cancel'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'la3bak-result.png';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}
