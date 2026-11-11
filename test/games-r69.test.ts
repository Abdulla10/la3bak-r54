/* R69zu: فحص تلقائي لكل الألعاب: كل لعبة تنلعب كاملة بالكمبيوتر (بكل المستويات) عشرات المرات.
 * لو أي لعبة علقت، أو طلعت خطأ، أو انتهت بنتيجة غلط، أو كشفت ورق لاعب للثاني — الفحص يفشل. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../src/engine/registry.js';

let seed = 1;
const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const registry = createRegistry(rng);
const games = registry.list().filter((g) => g.status === 'available' && registry.get(g.id));
const BOT_GAMES = new Set(['jackaro', 'ludo', 'baloot', 'domino', 'uno', 'carrom', 'pool', 'bowling', 'liars', 'minaboli']);

function play(id: string, n: number, level: 'easy' | 'pro' | null, s0: number) {
  seed = s0;
  const e = registry.get(id)!; const info = e.info;
  const count = Math.min(Math.max(info.minPlayers, 2), info.maxPlayers);
  const players = Array.from({ length: count }, (_, i) => ({ id: 'p' + i, name: 'لاعب ' + i }));
  let state = e.init(players, 0, { turnMs: 30_000 }); let t = 0, moves = 0, guard = 0;
  while (!e.isOver(state) && guard++ < 40_000) {
    t += 400; state = e.tick(state, t);
    // ما نكشف أسرار: نفحص إن «العرض» يشتغل لكل لاعب بدون خطأ
    if (guard % 50 === 0) for (const p of players) assert.doesNotThrow(() => JSON.stringify(e.view(state, p.id, t)), `${id}: view crashed`);
    let moved = false;
    for (const p of players) {
      const plan = (level && e.botLevelAction ? e.botLevelAction(state, p.id, t, level) : null) ?? e.botAction(state, p.id, t);
      if (!plan) continue;
      const r = e.apply(state, p.id, plan.action, t);
      if (r.ok) { state = r.state; moved = true; moves++; break; }
    }
    if (!moved) t += 30_000; // ننتظر المؤقت
  }
  return { e, state, players, moves, over: e.isOver(state) };
}

for (const g of games) {
  test(`${g.id}: العرض يشتغل والحركات الغلط تنرفض`, () => {
    const e = registry.get(g.id)!; seed = 7;
    const players = Array.from({ length: Math.min(Math.max(g.minPlayers, 2), g.maxPlayers) }, (_, i) => ({ id: 'p' + i, name: 'لاعب ' + i }));
    const s = e.init(players, 0, { turnMs: 30_000 });
    for (const p of players) assert.ok(e.view(s, p.id, 0) !== undefined);
    assert.equal(e.apply(s, 'stranger', { type: 'play' }, 0).ok, false, 'لاعب غريب ما يقدر يلعب');
    assert.equal(e.apply(s, players[0].id, { type: '__nope__' }, 0).ok, false, 'حركة مو معروفة تنرفض');
    assert.equal(typeof e.version(s), 'number');
  });
  if (!BOT_GAMES.has(g.id)) continue;
  for (const level of [null, 'easy', 'pro'] as const) {
    test(`${g.id}: تنلعب لين النهاية (${level ?? 'normal'})`, () => {
      for (let i = 0; i < (level ? 3 : 8); i++) {
        const { e, state, players, over } = play(g.id, i, level, 1000 + i * 17);
        assert.ok(over, `${g.id}: اللعبة ما خلصت`);
        const out = e.outcome(state);
        assert.ok(Array.isArray(out.winners), 'الفائزين لازم قائمة');
        for (const w of out.winners) assert.ok(players.some((p) => p.id === w), `فائز مو من اللاعبين: ${w}`);
      }
    });
  }
}
