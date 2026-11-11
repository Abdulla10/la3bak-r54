/* R71: إعادة تشغيل السيرفر (تحديث) ما تضيّع وقت اللاعب: الدور الحالي ياخذ 20 ثانية على الأقل بعد ما يرجع. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../src/engine/registry.js';
import { RoomService } from '../src/server/rooms.js';
import { MemoryStore } from '../src/server/store.js';
import { loadConfig } from '../src/server/config.js';

test('بعد إعادة التشغيل: مباراة شغالة تكمل ووقت الدور ما ينحسب على اللاعب', async () => {
  let now = 1_000_000;
  const store = new MemoryStore();
  const cfg = loadConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv);
  const hooks = { onRoom() {}, onGone() {} } as any;
  const a = new RoomService(store, createRegistry(Math.random), cfg, hooks, () => now);
  const user = { id: 'u1', name: 'لاعب' };
  const c: any = await a.createRoom(user, { gameId: 'ludo', mode: 'bots', seats: 2, key: 'restart-test-key-1' });
  assert.ok(c.ok, c.error);
  const s: any = await a.start(user, c.room.code); assert.ok(s.ok, s.error);
  const before: any = (await store.get(c.room.code))!.state;
  assert.equal(typeof before.endsAt, 'number');
  // السيرفر طفى 2 دقيقة (أطول من وقت الدور)
  now = before.endsAt + 120_000;
  const b = new RoomService(store, createRegistry(Math.random), cfg, hooks, () => now);
  await b.restorePresence();
  const room = (await store.get(c.room.code))!;
  assert.equal(room.status, 'playing');
  assert.ok((room.state as any).endsAt >= now + 20_000, 'الدور لازم ياخذ وقت جديد');
  assert.equal((room.state as any).ver, before.ver, 'رقم النسخة ما يتغير عشان حركة اللاعب تنقبل');
});
