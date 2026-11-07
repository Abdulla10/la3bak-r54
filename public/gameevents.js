/* مزامنة أحداث اللعب + بناء خطة الحركة. بدون DOM: تشتغل في المتصفح وفي اختبارات Node.
 * الخادم هو مصدر الأحداث (game.events / game.evSeq). الواجهة ما تخمّن شي من فروقات اللقطات،
 * وما تتخذ أي قرار لعب: الحالة المعروضة دايماً من اللقطة، والأحداث للحركة فقط. */

export const MAX_PLAY = 10; // أكثر من هذا نعتبرها فجوة كبيرة: مزامنة كاملة بدون حركة
export const MAX_TOTAL_MS = 2800; // سقف زمن الحركة لدفعة وحدة (نضغطها لو زادت)

/**
 * mode:
 *  none     اللقطة بدون أحداث (لعبة ثانية أو لوبي)
 *  baseline أول لقطة نشوفها لهذي اللعبة: نثبّت الرقم بدون حركة (فتح الصفحة / إعادة تحميل)
 *  same     نفس الرقم (تغيير ما يخص الحركة: اتصال، جاهزية…)
 *  play     أحداث جديدة متصلة بدون فجوة: نشغّلها بالترتيب
 *  resync   فجوة أو دفعة كبيرة: نعرض الحالة كاملة بدون حركة مضلّلة
 *  stale    لقطة أقدم من اللي عرضناه: نتجاهلها كلياً
 *
 * استثناء مهم: لو وصلت STALE_LIMIT لقطات متتالية كلها «أقدم» فالخادم هو اللي رجع للوراء (إعادة تشغيل/استرجاع حالة)،
 * فنعتمد لقطته كمزامنة كاملة (resync) بدون حركة، وإلا تتجمّد اللوحة عند حالة لن تتقدم.
 */
export const STALE_LIMIT = 3;
export function createEventSync(maxPlay = MAX_PLAY) {
  const seen = new Map(); // رمز الغرفة -> { no, seq, ver }
  return {
    feed(code, gameNo, game) {
      if (!game || typeof game.evSeq !== 'number') return { mode: 'none', events: [] };
      const ver = typeof game.ver === 'number' ? game.ver : 0;
      const cur = seen.get(code);
      if (!cur || gameNo > cur.no) {
        seen.set(code, { no: gameNo, seq: game.evSeq, ver, stale: 0 });
        return { mode: 'baseline', events: [] };
      }
      if (gameNo < cur.no || ver < cur.ver || game.evSeq < cur.seq) {
        if (gameNo === cur.no && ++cur.stale >= STALE_LIMIT) { seen.set(code, { no: gameNo, seq: game.evSeq, ver, stale: 0 }); return { mode: 'resync', events: [] }; }
        return { mode: 'stale', events: [] };
      }
      cur.stale = 0;
      if (game.evSeq === cur.seq) { cur.ver = ver; return { mode: 'same', events: [] }; }
      const fresh = (game.events || []).filter((e) => e.seq > cur.seq).sort((a, b) => a.seq - b.seq);
      const joined = fresh.length === game.evSeq - cur.seq && fresh.every((e, i) => e.seq === cur.seq + 1 + i);
      cur.seq = game.evSeq;
      cur.ver = ver;
      return joined && fresh.length <= maxPlay ? { mode: 'play', events: fresh } : { mode: 'resync', events: [] };
    },
    drop(code) { seen.delete(code); },
  };
}

const range = (a, b) => { const o = []; const st = a <= b ? 1 : -1; for (let i = a; i !== b + st; i += st) o.push(i); return o; };
/** خانات المسار بين تقدّمين. الطلوع من البيت (-1) = خطوة وحدة للبداية */
export const stepsBetween = (from, to) => (from === to ? [from] : from < 0 ? [-1, to] : range(from, to));

/**
 * يبني خطة حركة من أحداث الخادم. geom: { pos(game, owner, prog, idx) -> [x,y], key(owner, idx), unit }.
 * كل المواضع مطلقة (إحداثيات اللوحة)؛ المنفّذ يطرح موضع العنصر النهائي من الواجهة. الخطة لا تغيّر أي حالة.
 */
export function buildPlan(game, events, geom, maxTotal = MAX_TOTAL_MS) {
  const plan = { tracks: [], bursts: [], die: null, shake: null, card: null, confetti: null, total: 0 };
  const P = (o, prog, i) => geom.pos(game, o, prog, i);
  let t = 0;
  for (const ev of events) {
    if (ev.type === 'roll') { plan.die = { delay: t, dur: 650, value: ev.roll }; t += 650; }
    else if (ev.type === 'triple') { plan.shake = { delay: t, dur: 450 }; t += 450; }
    else if (ev.type === 'nomove') t += 350;
    else if (ev.type === 'move') {
      const owner = ev.owner ?? ev.by, idx = ev.token ?? ev.marble;
      const steps = stepsBetween(ev.from, ev.to);
      const dur = Math.min(900, Math.max(260, (steps.length - 1) * 95));
      if (ev.rank) plan.card = { delay: t, by: ev.by };
      plan.tracks.push({ key: geom.key(owner, idx), kind: 'walk', pts: steps.map((p) => P(owner, p, idx)), delay: t, dur });
      t += dur;
    } else if (ev.type === 'capture') {
      const idx = ev.token ?? ev.marble;
      const at = P(ev.owner, ev.from, idx);
      plan.bursts.push({ x: at[0], y: at[1], delay: t, dur: 480, kind: 'capture' });
      plan.tracks.push({ key: geom.key(ev.owner, idx), kind: 'arc', spin: 360, pts: [at, P(ev.owner, -1, idx)], delay: t, dur: 560 });
      t += 560;
    } else if (ev.type === 'swap') {
      plan.card = { delay: t, by: ev.by };
      for (const side of [ev.a, ev.b]) {
        const a = P(side.owner, side.from, side.marble), b = P(side.owner, side.to, side.marble);
        plan.tracks.push({ key: geom.key(side.owner, side.marble), kind: 'arc', spin: 360, pts: [a, b], delay: t, dur: 650 });
        plan.bursts.push({ x: a[0], y: a[1], delay: t + 300, dur: 480, kind: 'swap' }, { x: b[0], y: b[1], delay: t + 300, dur: 480, kind: 'swap' });
      }
      t += 650;
    } else if (ev.type === 'discard') { plan.card = { delay: t, by: ev.by }; t += 450; }
    else if (ev.type === 'win') { plan.confetti = { delay: t, dur: 2200 }; t += 300; }
  }
  const k = t > maxTotal ? maxTotal / t : 1;
  if (k < 1) {
    const sc = (o) => o && ((o.delay *= k), o.dur !== undefined && (o.dur *= k));
    plan.tracks.forEach(sc); plan.bursts.forEach(sc); [plan.die, plan.shake, plan.card, plan.confetti].forEach(sc);
    t = maxTotal;
  }
  plan.total = t;
  return plan;
}
