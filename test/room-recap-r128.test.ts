import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomRecap } from '../src/server/room-recap-r128.ts';
test('R128: ملخص «شو فاتك»', () => {
  let now = 10_000_000; const r = new RoomRecap(() => now); const name = (id: string) => ({ a: 'أحمد', b: 'سارة', c: 'خالد' } as Record<string, string>)[id] ?? 'لاعب';
  r.gift('R', { from: 'أحمد', to: 'سارة', name: 'وردة', icon: '🌹', qty: 1, total: 20 });
  now += 1000; r.gift('R', { from: 'خالد', to: 'سارة', name: 'تنين', icon: '🐉', qty: 2, total: 200000 });
  r.mic('R', 'a'); r.mic('R', 'a'); r.mic('R', 'c');
  for (let i = 0; i < 5; i++) r.chat('R', 'b'); r.chat('R', 'a'); r.chat('R', 'me');
  const s = r.summary('R', 0, name, (id) => id === 'me');
  assert.equal(s.gifts[0]!.name, 'تنين'); assert.equal(s.giftCount, 3); assert.equal(s.giftTotal, 200020);
  assert.deepEqual(s.mics, ['خالد', 'أحمد']); assert.equal(s.chatters[0]!.name, 'سارة'); assert.equal(s.messages, 7);
  assert.equal(r.summary('R', now + 1, name).gifts.length, 0);
  now += 4 * 3600_000; r.sweep(); assert.equal(r.summary('R', 0, name).messages, 0);
});
import { nameProblem } from '../src/server/session.ts';
test('R128b: اسم «الإدارة» للمشرفين بس', () => {
  assert.ok(nameProblem('الاداره'));
  assert.equal(nameProblem('الاداره', { allowStaff: true }), null);
  assert.ok(nameProblem('www.x.com', { allowStaff: true }));
});
import { Perks } from '../src/server/perks-r74.ts';
test('R129: المميزات المشتراة', () => {
  let now = 1_000_000; const p = new Perks('', () => ({ vip: 0, noble: 0 }), () => now);
  assert.equal(p.has('u1', 'visitors'), false);
  const u = p.grantPass('u1', 'visitors', 30); assert.equal(u, now + 30 * 86400_000); assert.equal(p.has('u1', 'visitors'), true);
  assert.equal(p.grantPass('u1', 'visitors', 30), now + 60 * 86400_000);
  p.grantPass('u1', 'xpBoost', 7); assert.equal(p.xpPct('u1'), 100);
  p.promote('room1', 24); assert.ok(p.promotedUntil('room1') > now);
  now += 61 * 86400_000; assert.equal(p.has('u1', 'visitors'), false); assert.equal(p.promotedUntil('room1'), 0);
});
