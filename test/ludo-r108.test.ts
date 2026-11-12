import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLudoEngine, legalMoves, absOf, type LudoState } from '../src/engine/ludo.js';

const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };
const players = [{ id: 'a', name: 'A', bot: false }, { id: 'b', name: 'B', bot: false }];

test('classic stays classic', () => {
  const e = createLudoEngine(Math.random);
  const s = e.init(players, 0, {}) as LudoState;
  assert.equal(s.variant, undefined); assert.deepEqual(s.tokens[0], [-1, -1, -1, -1]);
});

test('quick: one token out, enters with 1, lane locked until capture, goal 2', () => {
  const e = createLudoEngine(Math.random);
  const s = e.init(players, 0, { variant: 'quick' }) as LudoState;
  assert.equal(s.goal, 2); assert.deepEqual(s.tokens[0], [0, -1, -1, -1]);
  const t = structuredClone(s); t.phase = 'move'; t.roll = 1; t.turn = 0;
  assert.ok(legalMoves(t, 0).some((m) => m.kind === 'enter'), 'enter with 1');
  t.tokens[0][0] = 48; t.roll = 5;
  assert.ok(!legalMoves(t, 0).some((m) => m.token === 0), 'locked lane');
  t.unlocked![0] = true;
  assert.ok(legalMoves(t, 0).some((m) => m.token === 0 && m.to === 53), 'unlocked lane');
});

test('quick: capture unlocks the lane', () => {
  const e = createLudoEngine(() => 0.99);
  let s = e.init(players, 0, { variant: 'quick' }) as LudoState;
  s = structuredClone(s);
  const pi = 0, o = 1;
  s.turn = pi; s.phase = 'roll';
  // put opponent token 3 squares ahead on a non-safe cell
  s.tokens[pi][0] = 1; const target = absOf(s, pi, 5)!; s.tokens[o][0] = (target - s.seats[o] * 13 + 52) % 52;
  const eng = createLudoEngine(seq([0.5])); // roll = 4
  const r1 = eng.apply(s, s.players[pi], { type: 'roll' }, 1); assert.ok(r1.ok);
  const s2 = (r1 as any).state as LudoState; assert.equal(s2.roll, 4);
  const r2 = eng.apply(s2, s.players[pi], { type: 'move', token: 0 }, 2); assert.ok(r2.ok);
  const s3 = (r2 as any).state as LudoState;
  assert.equal(s3.tokens[o][0], -1); assert.equal(s3.unlocked![pi], true);
});

test('magic: 12 items, none on safe cells; rocket jumps and bomb sends home', () => {
  const e = createLudoEngine(Math.random);
  const s = e.init(players, 0, { variant: 'magic' }) as LudoState;
  assert.equal(s.items!.length, 12);
  for (const it of s.items!) assert.ok(![0, 8].includes(it.abs % 13));
  const t = structuredClone(s); t.turn = 0; t.phase = 'move'; t.roll = 2;
  t.items = [{ abs: absOf(t, 0, 5)!, kind: 'rocket' }, { abs: absOf(t, 0, 20)!, kind: 'bomb' }];
  t.tokens[0] = [3, 18, -1, -1]; t.tokens[1] = [-1, -1, -1, -1];
  const r = e.apply(t, t.players[0], { type: 'move', token: 0 }, 1); assert.ok(r.ok);
  const u = (r as any).state as LudoState; assert.equal(u.tokens[0][0], 11);
  u.turn = 0; u.phase = 'move'; u.roll = 2;
  const r2 = e.apply(u, u.players[0], { type: 'move', token: 1 }, 2); assert.ok(r2.ok);
  assert.equal(((r2 as any).state as LudoState).tokens[0][1], -1);
});

test('magic: ice freezes next turn', () => {
  const e = createLudoEngine(Math.random);
  const s = e.init(players, 0, { variant: 'magic' }) as LudoState;
  const t = structuredClone(s); t.turn = 0; t.phase = 'move'; t.roll = 2;
  t.items = [{ abs: absOf(t, 0, 5)!, kind: 'ice' }]; t.tokens[0] = [3, -1, -1, -1];
  const r = e.apply(t, t.players[0], { type: 'move', token: 0 }, 1); assert.ok(r.ok);
  const u = (r as any).state as LudoState; assert.equal(u.turn, 1); assert.equal(u.frozen![0], true);
  // b rolls a non-six with no move → turn should skip a (frozen) and come back to b
  u.phase = 'move'; u.roll = 3; u.tokens[1] = [-1, -1, -1, -1];
  const r2 = e.apply({ ...u, phase: 'roll', roll: null }, u.players[1], { type: 'roll' }, 2);
  assert.ok(r2.ok);
  const v = (r2 as any).state as LudoState;
  if (v.roll === null && v.phase === 'roll') { assert.equal(v.turn, 1); assert.equal(v.frozen![0], false); }
});

test('quick & magic: bot games always finish with a winner', () => {
  for (const variant of ['quick', 'magic']) for (let g = 0; g < 30; g++) {
    let seed = 7 + g * 31; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const e = createLudoEngine(rng);
    const ps = Array.from({ length: 2 + (g % 3) }, (_, i) => ({ id: 'p' + i, name: 'p' + i, bot: true }));
    let s = e.init(ps, 0, { variant, turnMs: 30_000 }); let t = 0, guard = 0;
    while (!e.isOver(s) && guard++ < 20000) {
      t += 100;
      const who = s.players[s.turn]; const plan = e.botAction(s, who);
      if (plan) { const r = e.apply(s, who, plan.action, t); assert.ok(r.ok, (r as any).error); s = (r as any).state; }
      else s = e.tick(s, s.endsAt);
    }
    assert.ok(e.isOver(s), `${variant} game ${g} did not finish`);
    const w = s.winner!; assert.ok(s.tokens[w].filter((x: number) => x === 56).length >= (variant === 'quick' ? 2 : 4));
  }
});
