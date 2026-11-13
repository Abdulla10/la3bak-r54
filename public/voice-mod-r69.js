/* R69zq: المشرف الصوتي. وهو مايكك مفتوح بغرفة صوتية، جهازك يحوّل كلامك لنص (خدمة التعرف على الكلام بالمتصفح)
 * ويرسله للمشرف الذكي. لو فيه شتم واضح، ينكتم المايك دقايق تلقائي. الصوت نفسه ما ينحفظ ولا ينرسل لنا. */
const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const isIOS = /iPhone|iPad|iPod/.test(globalThis.navigator?.userAgent || '');
let rec = null, want = false, cfg = null, cfgAt = 0, restarts = 0, buf = '', flushT = 0;
async function config() {
  if (cfg && Date.now() - cfgAt < 300_000) return cfg;
  try { const r = await fetch('/api/voice-mod/config', { credentials: 'same-origin', cache: 'no-store' }); cfg = r.ok ? await r.json() : { on: false }; } catch { cfg = { on: false }; }
  cfgAt = Date.now(); return cfg;
}
function send(text) { const t = text.trim(); if (t.length < 3) return; void fetch('/api/voice-mod', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t.slice(0, 400) }) }).catch(() => {}); }
function flushSoon() { clearTimeout(flushT); flushT = setTimeout(() => { const t = buf; buf = ''; send(t); }, 2500); }
export async function start() {
  want = true; if (!SR || rec) return;
  // R133: بالجوال (آيفون وأندرويد) التعرّف على الكلام يتسابق مع المايك على نفس الميكروفون — يقطع الصوت ويعلّق. نشغله بالجوال بس لو الإدارة فعّلته
  const c = await config(); if (!c.on || ((isIOS || /Android/i.test(globalThis.navigator?.userAgent || '')) && !c.ios) || !want) return;
  try {
    rec = new SR(); rec.lang = 'ar-AE'; rec.continuous = true; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) { buf += ' ' + e.results[i][0].transcript; if (buf.length > 300) { const t = buf; buf = ''; send(t); } else flushSoon(); } };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { want = false; } };
    rec.onend = () => { rec = null; if (want && restarts++ < 500) setTimeout(() => { if (want) void start(); }, 400); };
    rec.start();
  } catch { rec = null; }
}
export function stop() { want = false; restarts = 0; clearTimeout(flushT); if (buf) { send(buf); buf = ''; } try { rec?.stop(); } catch { /* */ } rec = null; }
