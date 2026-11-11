// R68z: فيزياء البلياردو (٨ بول) — نفس الكود يشتغل بالخادم (المرجع) والمتصفح (للحركة).
// وحدات الطاولة: العرض 500 والطول 1000 (الطاولة واقفة)، والزمن «خطوة» = 1/60 ثانية.
// ما فيه أي دالة مثلثية داخل المحاكاة عشان النتيجة تطلع نفسها بالمكانين.
// R69zs: كرات أكبر وفتحات أصغر (نسبة قريبة من الطاولة الحقيقية: الفتحة تقريباً ضعف الكرة)
export const W = 500, H = 1000, R = 16, MAXV = 30;
export const POCKETS = [
  { x: 5, y: 5, r: 25 }, { x: W - 5, y: 5, r: 25 },
  { x: -6, y: H / 2, r: 24 }, { x: W + 6, y: H / 2, r: 24 },
  { x: 5, y: H - 5, r: 25 }, { x: W - 5, y: H - 5, r: 25 },
];
/** شكل الفتحات بالرسم (مركز ونص قطر) */
export const POCKET_ART = [
  { x: 8, y: 8, r: 28 }, { x: W - 8, y: 8, r: 28 },
  { x: -4, y: H / 2, r: 26 }, { x: W + 4, y: H / 2, r: 26 },
  { x: 8, y: H - 8, r: 28 }, { x: W - 8, y: H - 8, r: 28 },
];
export const HEAD_Y = 750; // خط الكسر: الكرة البيضا ورا هالخط بالكسر
const SUB = 5, FRIC = 0.012, ROLL = 0.9935, REST_BALL = 0.95, REST_RAIL = 0.78, STOP = 0.01;
const near = (b, p, extra = 0) => { const dx = b.x - p.x, dy = b.y - p.y; return dx * dx + dy * dy < (p.r + extra) * (p.r + extra); };
/** هل الكرة قريبة من فتحة جيب (ما ترتد من الحافة هني) */
function mouth(b) {
  if (b.y < 33 || b.y > H - 33) { if (b.x < 33 || b.x > W - 33) return true; }
  if (Math.abs(b.y - H / 2) < 22 && (b.x < 20 || b.x > W - 20)) return true;
  return false;
}
/**
 * يحاكي ضربة كاملة. balls: [{n,x,y,in}] (n=0 البيضا). v: {x,y} سرعة البيضا. spin: -1..1 (فوق/تحت).
 * يرجع: الكرات الجديدة + الأحداث (أول كرة لمستها البيضا، الكرات اللي دخلت، عدد الخطوات) + اختيارياً مسار مختصر.
 */
export function simulate(ballsIn, v, spin = 0, onStep) {
  const balls = ballsIn.map((b) => ({ n: b.n, x: b.x, y: b.y, in: !!b.in, vx: 0, vy: 0 }));
  const cue = balls.find((b) => b.n === 0);
  cue.vx = v.x; cue.vy = v.y;
  let first = null, firstDone = false, rails = 0; const pocketed = []; let steps = 0;
  const live = () => balls.filter((b) => !b.in);
  for (; steps < 4000; steps++) {
    let moving = false;
    for (let s = 0; s < SUB; s++) {
      const bs = live();
      for (const b of bs) { b.x += b.vx / SUB; b.y += b.vy / SUB; }
      // تصادم الكرات
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], c = bs[j]; const dx = c.x - a.x, dy = c.y - a.y; const d2 = dx * dx + dy * dy;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = 2 * R - d;
        a.x -= nx * over / 2; a.y -= ny * over / 2; c.x += nx * over / 2; c.y += ny * over / 2;
        const rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny; if (rel <= 0) continue;
        const imp = rel * (1 + REST_BALL) / 2;
        a.vx -= imp * nx; a.vy -= imp * ny; c.vx += imp * nx; c.vy += imp * ny;
        if (!firstDone && (a.n === 0 || c.n === 0)) {
          firstDone = true; first = a.n === 0 ? c.n : a.n;
          // دوران فوق/تحت: البيضا تكمل لقدام أو ترجع لورا بعد أول لمسة
          const cb = a.n === 0 ? a : c; const sp = Math.sqrt(v.x * v.x + v.y * v.y) || 1; const k = spin * Math.min(1, rel / 6) * 0.55;
          cb.vx += (v.x / sp) * rel * k; cb.vy += (v.y / sp) * rel * k;
        }
      }
      // الحواف والجيوب
      for (const b of bs) {
        if (b.in) continue;
        let hit = false;
        for (const p of POCKETS) if (near(b, p)) { b.in = true; b.vx = b.vy = 0; pocketed.push(b.n); hit = true; break; }
        if (hit || mouth(b)) { if (!hit && (b.x < -R * 2 || b.x > W + R * 2 || b.y < -R * 2 || b.y > H + R * 2)) { b.in = true; pocketed.push(b.n); } continue; }
        if (b.x < R) { b.x = R; b.vx = -b.vx * REST_RAIL; rails++; } else if (b.x > W - R) { b.x = W - R; b.vx = -b.vx * REST_RAIL; rails++; }
        if (b.y < R) { b.y = R; b.vy = -b.vy * REST_RAIL; rails++; } else if (b.y > H - R) { b.y = H - R; b.vy = -b.vy * REST_RAIL; rails++; }
      }
    }
    for (const b of live()) {
      const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp < STOP) { b.vx = b.vy = 0; continue; }
      const ns = Math.max(0, sp * ROLL - FRIC); b.vx = b.vx / sp * ns; b.vy = b.vy / sp * ns; if (ns > 0) moving = true;
    }
    if (onStep) onStep(balls, steps);
    if (!moving) break;
  }
  return { balls: balls.map((b) => ({ n: b.n, x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, in: b.in })), first, pocketed, rails, steps };
}
/** ترتيب المثلث: الرأس لتحت (جهة البيضا)، والـ8 بالنص */
export function rack(rng) {
  const solids = [1, 2, 3, 4, 5, 6, 7], stripes = [9, 10, 11, 12, 13, 14, 15];
  const sh = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  sh(solids); sh(stripes);
  // 15 خانة: الصف 1 (الرأس) لين الصف 5. الـ8 بالخانة 4 (نص الصف الثالث). زوايا الصف الأخير: وحدة سادة ووحدة مخططة
  const slots = []; const apexY = 270, gap = R * 2 + 0.6, rowH = gap * Math.sqrt(3) / 2;
  for (let row = 0; row < 5; row++) for (let k = 0; k <= row; k++) slots.push({ x: W / 2 + (k - row / 2) * gap, y: apexY - row * rowH });
  const order = new Array(15).fill(0); order[4] = 8; order[10] = solids.pop(); order[14] = stripes.pop();
  const rest = sh([...solids, ...stripes]); for (let i = 0; i < 15; i++) if (!order[i]) order[i] = rest.pop();
  const balls = [{ n: 0, x: W / 2, y: 820, in: false }];
  slots.forEach((s, i) => balls.push({ n: order[i], x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100, in: false }));
  return balls;
}
/** هل المكان صالح لحط البيضا */
export function canPlace(balls, x, y, kitchen) {
  if (!(x >= R && x <= W - R && y >= R && y <= H - R)) return false;
  if (kitchen && y < HEAD_Y) return false;
  return balls.every((b) => b.in || b.n === 0 || (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) >= 4 * R * R + 1);
}
export const groupOf = (n) => (n >= 1 && n <= 7 ? 'solid' : n >= 9 && n <= 15 ? 'stripe' : null);
