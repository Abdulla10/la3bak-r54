/* بولينغ (R68z20) — فيزياء مشتركة بين الخادم والمتصفح.
 * الوحدات: سنتيمتر وثانية. x عرض المسار (0 بالنص)، y طول المسار من خط الرمي باتجاه الدبابيس.
 * ما فيه sin/cos ولا Math.random: بس جمع وضرب وقسمة وجذر، عشان كل المتصفحات تطلع نفس النتيجة بالضبط. */
export const LW = 106;            // عرض المسار
export const HALF = LW / 2;
export const HP = 1829;           // مكان الدبوس الأول
export const BR = 10.9;           // نص قطر الكرة
export const PR = 6.1;            // نص قطر الدبوس (من البطن)
export const DT = 1 / 120;
export const BALL_Y0 = 330;     // الكرة تبدأ من هنا (أول المسار اللي يبين بالصورة)
const SP = 30.48, ROW = 26.4;     // المسافة بين الدبابيس
export const PINS = [
  [0, 0],
  [-SP / 2, ROW], [SP / 2, ROW],
  [-SP, 2 * ROW], [0, 2 * ROW], [SP, 2 * ROW],
  [-1.5 * SP, 3 * ROW], [-SP / 2, 3 * ROW], [SP / 2, 3 * ROW], [1.5 * SP, 3 * ROW],
].map(([x, y]) => ({ x, y: HP + y }));
const END_Y = HP + 3 * ROW + 70;  // آخر الأرضية
const MB = 7, MP = 1.6;           // الكتل
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const round4 = (v) => Math.round(v * 1e4) / 1e4;

/** الرمية: x0 مكان البداية، aim ميل الاتجاه (يمين/يسار لكل سم لقدام)، spin الانحناء، power القوة */
export function normShot(s) {
  return {
    x0: round4(clamp(Number(s?.x0) || 0, -HALF + BR, HALF - BR)),
    aim: round4(clamp(Number(s?.aim) || 0, -0.06, 0.06)),
    spin: round4(clamp(Number(s?.spin) || 0, -1, 1)),
    power: round4(clamp(Number(s?.power) || 0.7, 0.35, 1)),
  };
}

/**
 * standing: مصفوفة 10 (true = واقف). ترجع { knocked: [أرقام الدبابيس اللي طاحت], gutter, steps, frames? }
 * record=true ترجع لقطات للرسم كل خطوتين.
 */
export function simulate(standing, shot, record = false) {
  const s = normShot(shot);
  const v0 = 560 + s.power * 380; // سم/ث
  const ball = { x: s.x0, y: BALL_Y0, vx: v0 * s.aim, vy: v0, gutter: false, on: true };
  const pins = PINS.map((p, i) => ({ i, x: p.x, y: p.y, vx: 0, vy: 0, up: !!standing[i], down: false, gone: !standing[i], tilt: 0, dir: 0, z: 0, vz: 0, rot: 0, vr: 0 }));
  const frames = record ? [] : null;
  const hook = s.spin * 95; // تسارع جانبي بعد ما تمسك الكرة
  let steps = 0, quiet = 0;
  const live = () => pins.filter((p) => !p.gone);
  while (steps < 120 * 6) {
    steps++;
    // الكرة
    if (ball.on) {
      if (!ball.gutter && ball.y > 900 && ball.y < HP - 60) ball.vx += hook * DT;
      ball.x += ball.vx * DT; ball.y += ball.vy * DT;
      if (!ball.gutter && (ball.x < -HALF || ball.x > HALF) && ball.y < HP - 20) { ball.gutter = true; ball.x = ball.x < 0 ? -HALF - BR * 0.9 : HALF + BR * 0.9; ball.vx = 0; }
      if (ball.y > END_Y + 40) ball.on = false;
    }
    // الدبابيس تتحرك
    for (const p of pins) {
      if (p.gone || (p.vx === 0 && p.vy === 0 && p.vz === 0 && p.z === 0 && p.vr === 0)) continue;
      p.x += p.vx * DT; p.y += p.vy * DT;
      const f = p.down ? 0.95 : 0.9;
      p.vx *= f; p.vy *= f;
      if (p.vx * p.vx + p.vy * p.vy < 16) { p.vx = 0; p.vy = 0; }
      if (p.down && p.tilt < 1) p.tilt = Math.min(1, p.tilt + 0.06);
      // شكل بس (ما يأثر على النتيجة): الدبوس ينط ويتقلب بالهوا
      if (p.z > 0 || p.vz !== 0) { p.vz -= 980 * DT; p.z += p.vz * DT; if (p.z <= 0) { p.z = 0; p.vz = p.vz < -70 ? -p.vz * 0.3 : 0; p.vr *= 0.6; } }
      if (p.vr !== 0) { p.rot += p.vr * DT; if (p.z === 0) { p.vr *= 0.93; if (p.vr * p.vr < 0.05) p.vr = 0; } }
      if (p.x < -HALF - 4 || p.x > HALF + 4 || p.y > END_Y) { p.gone = true; p.down = true; p.up = false; }
    }
    // تصادم الكرة مع الدبابيس
    if (ball.on && !ball.gutter && ball.y > HP - 40) {
      for (const p of pins) {
        if (p.gone) continue;
        const r = BR + (p.down ? PR * 1.6 : PR);
        hit(ball, MB, p, MP, r, 0.6, p);
      }
    }
    // دبوس مع دبوس
    const L = live();
    for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
      const A = L[a], B = L[b];
      if (A.vx === 0 && A.vy === 0 && B.vx === 0 && B.vy === 0) continue;
      const r = (A.down ? PR * 1.7 : PR) + (B.down ? PR * 1.7 : PR);
      hit(A, MP, B, MP, r, 0.55, null);
    }
    if (frames && steps % 2 === 0) frames.push({ b: [round1(ball.x), round1(ball.y), ball.gutter ? 1 : 0, ball.on ? 1 : 0], p: pins.map((p) => [round1(p.x), round1(p.y), p.gone ? 2 : p.down ? 1 : 0, round2(p.tilt), round2(p.dir), round1(p.z), round2(p.rot)]) });
    const moving = pins.some((p) => !p.gone && (p.vx !== 0 || p.vy !== 0 || p.z > 0));
    if (!ball.on && !moving) { quiet++; if (quiet > 12) break; }
  }
  const knocked = pins.filter((p) => standing[p.i] && (p.down || p.gone)).map((p) => p.i);
  return { knocked, gutter: ball.gutter, steps, ...(frames ? { frames } : {}) };
}
const round1 = (v) => Math.round(v * 10) / 10, round2 = (v) => Math.round(v * 100) / 100;

function hit(A, ma, B, mb, r, e, pinB) {
  const dx = B.x - A.x, dy = B.y - A.y, d2 = dx * dx + dy * dy;
  if (d2 >= r * r || d2 === 0) return;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
  // نفصلهم
  const over = r - d, ta = mb / (ma + mb), tb = ma / (ma + mb);
  A.x -= nx * over * ta; A.y -= ny * over * ta; B.x += nx * over * tb; B.y += ny * over * tb;
  const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
  if (rv > 0) return;
  const j = -(1 + e) * rv / (1 / ma + 1 / mb);
  A.vx -= j * nx / ma; A.vy -= j * ny / ma; B.vx += j * nx / mb; B.vy += j * ny / mb;
  // أي دبوس ينضرب بقوة يطيح
  for (const P of [A, B]) {
    if (P.up === undefined || P.down) continue;
    if (P.vx * P.vx + P.vy * P.vy > 900) { P.down = true; P.up = false; const sp = Math.sqrt(P.vx * P.vx + P.vy * P.vy) || 1; P.dir = round2(P.vx / sp); P.vz = sp > 220 ? Math.min(260, (sp - 180) * 0.55) : 0; P.vr = (P.vx >= 0 ? 1 : -1) * Math.min(14, sp / 40); }
  }
  void pinB;
}

/** النتيجة: rolls = مصفوفة لكل إطار (أرقام الدبابيس الطايحة لكل رمية). F = عدد الإطارات */
export function scoreOf(rolls, F) {
  const flat = []; for (const fr of rolls) for (const n of fr) flat.push(n);
  const out = []; let i = 0, total = 0;
  for (let f = 0; f < F; f++) {
    const fr = rolls[f]; if (!fr || !fr.length) { out.push(null); continue; }
    if (f === F - 1) { const s = fr.reduce((a, b) => a + b, 0); const done = fr.length === 3 || (fr.length === 2 && fr[0] + fr[1] < 10); total += s; out.push(done ? total : null); continue; }
    if (fr[0] === 10) { const b1 = flat[i + 1], b2 = flat[i + 2]; if (b1 === undefined || b2 === undefined) { out.push(null); total += 10; i += 1; continue; } total += 10 + b1 + b2; out.push(total); i += 1; continue; }
    if (fr.length < 2) { out.push(null); total += fr[0]; i += 1; continue; }
    if (fr[0] + fr[1] === 10) { const b1 = flat[i + 2]; if (b1 === undefined) { out.push(null); total += 10; i += 2; continue; } total += 10 + b1; out.push(total); i += 2; continue; }
    total += fr[0] + fr[1]; out.push(total); i += 2;
  }
  // المجموع الحالي (حتى لو فيه بونص ناقص)
  let cur = 0; let k = 0;
  for (let f = 0; f < F; f++) { const fr = rolls[f]; if (!fr) break; for (let t = 0; t < fr.length; t++) { cur += fr[t]; if (f < F - 1) { if (t === 0 && fr[0] === 10) { cur += (flat[k + 1] ?? 0) + (flat[k + 2] ?? 0); } else if (t === 1 && fr[0] + fr[1] === 10) { cur += flat[k + 1] ?? 0; } } k++; } }
  return { frames: out, total: cur };
}
