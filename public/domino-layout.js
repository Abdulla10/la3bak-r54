/* تخطيط مسار الدومينو: دوال نقية بدون DOM (تُختبر في test/domino-layout.test.ts). */
/* ---------------- تخطيط المسار (دوال نقية، تُختبر بدون متصفح) ----------------
 * الوحدة = عرض القطعة. القطعة الأفقية 2×1، الدبل بالصف عمودي 1×2.
 * الذراع اليمين يمشي يمين ولما يوصل الحد يلف لتحت (قطعة عمودية بالزاوية) ثم يرجع يسار، وهكذا.
 * الذراع اليسار يمشي يسار ويلف لفوق. فالذراعان ما يتقاطعان أبداً.
 * مواضع القطع تعتمد فقط على ترتيب القطع، فإضافة قطعة ما تحرّك اللي قبلها. */
export const ROW_HALF = 6.5; // نصف عرض الصف بالوحدات (13 وحدة ≈ 6.5 قطعة)

function placeOn(arm, dbl) {
  const { x, y, dx, vs } = arm;
  if (arm.mode === 'after') {
    const x0 = dx > 0 ? x : x - 2;
    return { r: { x: x0, y: y - 0.5, w: 2, h: 1 }, o: 'h', next: { ...arm, mode: 'h', x: x + dx * 2, ext: 0.5 } };
  }
  const w = dbl ? 1 : 2;
  const fits = dx > 0 ? x + w <= ROW_HALF + 1e-9 : x - w >= -ROW_HALF - 1e-9;
  if (fits) {
    const x0 = dx > 0 ? x : x - w;
    return dbl
      ? { r: { x: x0, y: y - 1, w: 1, h: 2 }, o: 'd', next: { ...arm, x: x + dx * w, ext: 1 } }
      : { r: { x: x0, y: y - 0.5, w: 2, h: 1 }, o: 'h', next: { ...arm, x: x + dx * w, ext: 0.5 } };
  }
  // لفّة: قطعة عمودية بالزاوية (حتى لو دبل) ثم صف جديد بالاتجاه المعاكس.
  // ext = نصف ارتفاع آخر قطعة بالطرف (دبل عمودي = 1) فتبدأ اللفّة بعده بدون تداخل
  const ext = arm.ext ?? 0.5;
  const x0 = dx > 0 ? x - 1 : x;
  const y0 = vs > 0 ? y + ext : y - ext - 2;
  return { r: { x: x0, y: y0, w: 1, h: 2 }, o: 'v', next: { ...arm, mode: 'after', y: y + vs * (ext + 2.5), dx: -dx, ext: 0.5 } };
}

/** قيم النصفين حسب الاتجاه: a = يسار/فوق، b = يمين/تحت */
function faces(t, o, arm) {
  const [inner, outer] = t;
  if (o === 'd') return [inner, outer];
  if (o === 'v') return arm.vs > 0 ? [inner, outer] : [outer, inner];
  return arm.dx > 0 ? [inner, outer] : [outer, inner]; // الطرف الداخلي جهة المسار
}

/** يرجّع مستطيلات كل القطع + حالة الذراعين (لحساب خانات اللعب الممكنة) */
export function layout(first, left, right) {
  const tiles = [];
  if (!first) return { tiles, arms: null };
  const [a, b] = first.t;
  const dbl = a === b;
  const fr = dbl ? { x: -0.5, y: -1, w: 1, h: 2 } : { x: -1, y: -0.5, w: 2, h: 1 };
  tiles.push({ ...fr, o: dbl ? 'd' : 'h', a, b, n: first.n, by: first.by });
  const half = dbl ? 0.5 : 1;
  let R = { x: half, y: 0, dx: 1, vs: 1, mode: 'h', ext: dbl ? 1 : 0.5 };
  let L = { x: -half, y: 0, dx: -1, vs: -1, mode: 'h', ext: dbl ? 1 : 0.5 };
  for (const [list, side] of [[right, 'R'], [left, 'L']]) {
    let arm = side === 'R' ? R : L;
    for (const p of list) {
      const d = p.t[0] === p.t[1];
      const pl = placeOn(arm, d);
      const fArm = pl.o === 'h' && arm.mode === 'after' ? { ...arm, mode: 'h' } : arm;
      const [fa, fb] = faces(p.t, pl.o, fArm);
      tiles.push({ ...pl.r, o: pl.o, a: fa, b: fb, n: p.n, by: p.by });
      arm = pl.next;
    }
    if (side === 'R') R = arm; else L = arm;
  }
  return { tiles, arms: { L, R } };
}
/** خانة اللعب المتوقعة لقطعة (دبل أو لا) على طرف معيّن */
export function slotFor(lay, end, dbl) {
  if (!lay.arms) return dbl ? { x: -0.5, y: -1, w: 1, h: 2 } : { x: -1, y: -0.5, w: 2, h: 1 };
  return placeOn(lay.arms[end], dbl).r;
}
/** صندوق يحيط بكل المستطيلات */
export function bbox(rects) {
  if (!rects.length) return { x0: -1, y0: -1, x1: 1, y1: 1 };
  return rects.reduce((b, r) => ({ x0: Math.min(b.x0, r.x), y0: Math.min(b.y0, r.y), x1: Math.max(b.x1, r.x + r.w), y1: Math.max(b.y1, r.y + r.h) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
}
/** نافذة العرض: عرض ثابت، والارتفاع حسب نسبة المنطقة. تتحرك عمودياً أقل حركة ممكنة، وتصغّر بس لو المسار أطول من النافذة */
export function viewport(rects, aspect) {
  const m = 0.35;
  let W = ROW_HALF * 2 + 1.4, Hh = W / aspect;
  const b = bbox(rects);
  const need = b.y1 - b.y0 + 2 * m;
  if (need > Hh) { Hh = need; W = Hh * aspect; }
  const lo = b.y1 + m - Hh / 2, hi = b.y0 - m + Hh / 2;
  // مثل المرجع: أول صف بالثلث العلوي (30% من الأعلى) فيبقى مكان للذراع اللي ينزل؛ وعند الحاجة أقل إزاحة ممكنة
  const c0 = Hh * 0.2;
  const c = lo > hi ? (lo + hi) / 2 : Math.min(Math.max(c0, lo), hi);
  return { x: -W / 2, y: c - Hh / 2, w: W, h: Hh };
}

