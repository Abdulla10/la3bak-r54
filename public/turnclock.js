/* عدّاد الدور: الوقت الحقيقي من الخادم، لا من ساعة المتصفح وحدها.
 * المصدر: كل لقطة غرفة فيها serverNow (وقت الخادم لحظة الإرسال) والدور ينتهي عند endsAt (وقت الخادم).
 * نحسب فرق الساعتين بساعة المتصفح «الرتيبة» (performance.now) فتغيير ساعة الجهاز أثناء اللعب ما يأثر،
 * ونأخذ أقل تأخير شبكة شفناه من آخر عينات (أكبر فرق) فنقترب من الوقت الحقيقي.
 * العدّاد للعرض فقط: انتهاء الدور وتنفيذ المهلة يقرّرهما الخادم (engine.tick) مرة واحدة، والواجهة ما ترسل شي عند الصفر. */
export const WARN_MS = 10_000; // تحذير
export const URGENT_MS = 5_000; // اقتراب النهاية: أحمر + نبض (إلا مع تقليل الحركة)
const KEEP = 8;

/** ساعة الخادم المقدّرة. mono = ساعة رتيبة بالميلي ثانية (تُحقن للاختبار) */
export function createServerClock(mono = () => performance.now()) {
  const samples = [];
  return {
    /** نسجّل عيّنة عند استلام لقطة */
    observe(serverNow) {
      if (!Number.isFinite(serverNow)) return;
      samples.push(serverNow - mono());
      if (samples.length > KEEP) samples.shift();
    },
    /** فرق الخادم عن الساعة الرتيبة (أكبر عيّنة = أقل تأخير شبكة) */
    offset() { return samples.length ? Math.max(...samples) : 0; },
    now() { return mono() + this.offset(); },
    ready() { return samples.length > 0; },
  };
}

/** المتبقي بالميلي ثانية (≥ 0). endsAt ≤ 0 = ما فيه مؤقت (انتهت اللعبة/موقوف) فنرجع null */
export const leftMs = (endsAt, serverNow) => (!Number.isFinite(endsAt) || endsAt <= 0 ? null : Math.max(0, endsAt - serverNow));
export const phaseOf = (ms) => (ms === null ? 'off' : ms <= 0 ? 'done' : ms <= URGENT_MS ? 'urgent' : ms <= WARN_MS ? 'warn' : 'ok');
export const fraction = (ms, total) => (ms === null || !(total > 0) ? 0 : Math.min(1, Math.max(0, ms / total)));
export const secondsLabel = (ms) => (ms === null ? '' : String(Math.ceil(ms / 1000)));

export const CLOCK = createServerClock();

/** تحديث كل عناصر .jx-clock في الصفحة من data-ends / data-total. تُستدعى كل ~200ms وعند كل رسم. */
export function updateClocks(root = document, clock = CLOCK) {
  const els = root.querySelectorAll('.jx-clock');
  if (!els.length || !clock.ready()) return 0;
  const now = clock.now();
  els.forEach((el) => {
    const ms = leftMs(Number(el.dataset.ends), now), total = Number(el.dataset.total);
    const ph = phaseOf(ms);
    const ring = el.querySelector('.jx-ring-fg');
    if (ring) ring.style.strokeDashoffset = String(100 - 100 * fraction(ms, total)); // pathLength=100
    const num = el.querySelector('.jx-sec');
    const label = secondsLabel(ms);
    if (num && num.textContent !== label) num.textContent = label;
    if (el.dataset.phase !== ph) el.dataset.phase = ph;
    el.dataset.leftMs = ms === null ? '' : String(Math.round(ms));
    el.setAttribute('aria-label', ms === null ? '' : `الوقت المتبقي ${label} ثانية`);
  });
  return els.length;
}

let timer = null;
/** يشغّل التحديث الدوري (مرة وحدة). يتوقف تلقائياً والصفحة مخفية ويحدّث فور الرجوع. */
export function startClocks() {
  if (timer || typeof document === 'undefined') return;
  const tick = () => { if (!document.hidden) updateClocks(); };
  timer = setInterval(tick, 200);
  document.addEventListener('visibilitychange', tick);
}
