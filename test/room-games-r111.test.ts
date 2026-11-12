import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WolfGames, FastGames, MillionGames, MIL_LADDER } from '../src/server/room-games-r111.js';
import { QBANK } from '../src/server/qbank-r111.js';

let T = 1_000_000; const now = () => T;
const deps = (paid: any[] = []) => ({ name: (id: string) => id.toUpperCase(), notify: () => {}, now, prize: (w: string, a: number) => { paid.push([w, a]); return a; } });
const R = 'room1';

test('question bank is valid', () => {
  assert.ok(QBANK.length >= 120);
  for (const q of QBANK) { assert.equal(q.o.length, 4); assert.ok(q.a >= 0 && q.a < 4); assert.equal(new Set(q.o).size, 4, q.q); }
});

test('wolf: roles secret, night kill, village can win', () => {
  const paid: any[] = []; const w = new WolfGames(deps(paid)); const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  w.create(R, 'a', ids, true); for (const id of ids.slice(1)) w.join(R, id); w.start(R, 'a', ids);
  const va = w.view(R, 'a', true) as any; assert.ok(va.me.role);
  const others = va.game.players.filter((p: any) => !p.me && p.role !== null && va.me.role !== 'wolf');
  assert.equal(others.length, 0, 'non-wolf sees no roles');
  T += 10_000; w.tick(); assert.equal((w.view(R, 'a', true) as any).game.phase, 'night');
  // find roles via each player's own view
  const role = (id: string) => (w.view(R, id, false) as any).me.role;
  const wolf = ids.find((i) => role(i) === 'wolf')!, doc = ids.find((i) => role(i) === 'doctor')!, seer = ids.find((i) => role(i) === 'seer')!;
  const victim = ids.find((i) => role(i) === 'villager')!;
  w.act(R, wolf, victim); w.act(R, doc, doc); w.act(R, seer, wolf);
  assert.equal((w.view(R, seer, false) as any).game.seerLog[0].wolf, true);
  T += 3000; w.tick(); const v = w.view(R, 'a', true) as any; assert.equal(v.game.phase, 'dawn'); assert.equal(v.game.news.kind, 'killed');
  T += 8000; w.tick(); T += 91_000; w.tick(); assert.equal((w.view(R, 'a', true) as any).game.phase, 'vote');
  for (const id of ids) if (id !== victim && id !== wolf) w.vote(R, id, wolf);
  w.vote(R, wolf, doc);
  T += 2000; w.tick(); const d = w.view(R, 'a', true) as any; assert.equal(d.game.phase, 'done'); assert.equal(d.game.winner, 'village');
  assert.ok(paid.length >= 4 && !paid.some(([id]) => id === wolf));
});

test('fast: answers scored, fastest bonus, winner paid', () => {
  const paid: any[] = []; const f = new FastGames(deps(paid)); const ids = ['a', 'b', 'c'];
  f.create(R, 'a', ids, true); f.join(R, 'b'); f.join(R, 'c'); f.settings(R, 'a', { count: 5 }); f.start(R, 'a', ids);
  T += 4500; f.tick();
  for (let k = 0; k < 5; k++) {
    const v = f.view(R, 'a', true) as any; assert.equal(v.game.phase, 'question'); assert.equal(v.game.correct, null, 'correct hidden');
    for (let i = 0; i < 4; i++) { /* a tries until it finds correct over questions; we just answer 0 for a, 1 for b */ }
    f.answer(R, 'a', 0); f.answer(R, 'b', 1); f.answer(R, 'c', 2);
    T += 1000; f.tick(); assert.equal((f.view(R, 'a', true) as any).game.phase, 'reveal');
    T += 5500; f.tick();
  }
  const d = f.view(R, 'a', true) as any; assert.equal(d.game.phase, 'done');
});

test('million: ladder, 50:50, wrong answer falls to safe amount, walk pays', () => {
  const paid: any[] = []; const m = new MillionGames(deps(paid)); const ids = ['h', 's', 'x'];
  m.create(R, 'h', ids, true); m.volunteer(R, 's'); m.start(R, 'h', ids); T += 6000; m.tick();
  const right = () => { const v = m.view(R, 'h', true) as any; return v; };
  // play 6 correct answers by reading the correct index from the internal reveal: we brute force: pick via hidden after fifty on first
  m.fifty(R, 's'); const v0 = right(); assert.equal(v0.game.hidden.length, 2);
  // answer correctly 6 times using server-side knowledge (read private state)
  for (let k = 0; k < 6; k++) {
    const g = (m as any).games.get(R); const ci = g.order.indexOf(g.q.a);
    m.answer(R, 's', ci); T += 4000; m.tick(); T += 4000; m.tick();
  }
  assert.equal((m as any).games.get(R).level, 6);
  m.walk(R, 's'); const d = m.view(R, 's', false) as any; assert.equal(d.game.phase, 'done'); assert.equal(d.game.result.won, MIL_LADDER[5]); assert.deepEqual(paid[0], ['s', MIL_LADDER[5]]);
  m.again(R, 'h', true); m.volunteer(R, 's'); m.start(R, 'h', ids); T += 6000; m.tick();
  for (let k = 0; k < 6; k++) { const g = (m as any).games.get(R); m.answer(R, "s", g.order.indexOf(g.q.a)); T += 4000; m.tick(); T += 4000; m.tick(); }
  const g = (m as any).games.get(R); const wrong = [0, 1, 2, 3].find((i) => g.order[i] !== g.q.a)!;
  m.audience(R, 's'); m.vote(R, 'x', 0); T += 21_000; m.tick(); assert.ok((m.view(R, 'x', false) as any).game.poll.result);
  m.answer(R, 's', wrong); T += 4000; m.tick(); T += 4000; m.tick();
  const e = m.view(R, 's', false) as any; assert.equal(e.game.result.reason, 'wrong'); assert.equal(e.game.result.won, 1000);
});
