import test from 'node:test';
import assert from 'node:assert/strict';
import { JawsGames } from '../src/server/jaws-r130.ts';
test('R130: لعبة الفكّ — دور، لغم، بطاقات، فوز', () => {
  let now = 1_000_000; let prized = '';
  const j = new JawsGames({ name: (id) => id.toUpperCase(), notify: () => {}, now: () => now, prize: (w) => { prized = w; return 5000; }, rnd: (n) => 0 });
  const R = 'room1', M = ['a', 'b', 'c'];
  j.create(R, 'a', M, true); j.join(R, 'b'); j.join(R, 'c'); j.settings(R, 'a', { hands: 1 });
  j.start(R, 'a', M);
  let v: any = j.view(R, 'a', true); assert.equal(v.game.phase, 'playing'); assert.equal(v.game.turn, 'a'); assert.equal(v.me.cards.length, 3);
  // rnd=0 → mines include 0; button 5 is safe
  j.press(R, 'a', 5, M); v = j.view(R, 'a', true); assert.equal(v.game.turn, 'b'); assert.ok(v.game.board.pressed.includes(5));
  assert.throws(() => j.press(R, 'a', 6, M), /مو دورك/);
  // b uses double card (cards are all weighted-first = reverse with rnd 0) → reverse direction
  const bv: any = j.view(R, 'b', true); j.card(R, 'b', bv.me.cards[0].id, undefined);
  assert.equal((j.view(R, 'b', true) as any).game.dir, -1);
  // b hits a mine (0) → snap → out (1 hand)
  j.press(R, 'b', 0, M); v = j.view(R, 'a', true); assert.equal(v.game.phase, 'snap'); assert.equal(v.game.players.find((p: any) => p.id === 'b').out, true);
  now += 4000; j.tick(); v = j.view(R, 'a', true); assert.equal(v.game.phase, 'playing'); assert.equal(v.game.board.pressed.length, 0);
  // reversed: next after b going -1 is a
  assert.equal(v.game.turn, 'a');
  j.press(R, 'a', 0, M); now += 4000; j.tick(); v = j.view(R, 'c', true);
  assert.equal(v.game.phase, 'done'); assert.equal(v.game.winner.id, 'c'); assert.equal(prized, 'c');
  // timeout auto-press + bots
  const R2 = 'room2'; j.create(R2, 'a', ['a'], true); j.addBot(R2, 'a'); j.start(R2, 'a', ['a']);
  for (let i = 0; i < 400 && (j.view(R2, 'a', true) as any).game.phase !== 'done'; i++) { now += 2500; j.tick(); }
  assert.equal((j.view(R2, 'a', true) as any).game.phase, 'done');
});
