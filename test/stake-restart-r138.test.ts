/* R138: سيرفر يطفى فجأة وسط مباراة برسم دخول: المباراة تكمل بعد الرجوع، والفايز ياخذ المجموع، ومجموع العملات ما ينقص ولا يزيد. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../src/engine/registry.js';
import { RoomService } from '../src/server/rooms.js';
import { MemoryStore } from '../src/server/store.js';
import { Matchmaker } from '../src/server/matchmaker.js';
import { Wallet } from '../src/server/wallet.js';
import { loadConfig } from '../src/server/config.js';

test('رسم الدخول محفوظ بعد إعادة التشغيل وسط المباراة', async () => {
  let now = 1_000_000;
  const store = new MemoryStore();            // يمثّل قاعدة البيانات الدائمة (تبقى بعد إعادة التشغيل)
  const wallet = new Wallet('', () => now);   // يمثّل ملف المحفظة الدائم
  const cfg = loadConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv);
  const hooks = { onRoom() {}, onGone() {} } as any;
  const A = { id: 'u-a', name: 'أ' }, B = { id: 'u-b', name: 'ب' };
  assert.ok(wallet.grant(A.id, 'coins', 1000, 'test', 'g-a')); assert.ok(wallet.grant(B.id, 'coins', 1000, 'test', 'g-b'));
  const sum = () => wallet.balance(A.id) + wallet.balance(B.id);
  const total = sum(); const a0 = wallet.balance(A.id), b0 = wallet.balance(B.id);

  const s1 = new RoomService(store, createRegistry(Math.random), cfg, hooks, () => now, undefined, wallet);
  const mm = new Matchmaker(s1, createRegistry(Math.random), () => {}, wallet, undefined, () => now);
  await mm.join(A, 'ludo', 2, 500); const j: any = await mm.join(B, 'ludo', 2, 500);
  assert.ok(j.ok && j.found, JSON.stringify(j));
  assert.equal(wallet.balance(A.id), a0 - 500); assert.equal(wallet.balance(B.id), b0 - 500);

  // السيرفر طفى: خدمة جديدة بنفس التخزين الدائم
  now += 60_000;
  const s2 = new RoomService(store, createRegistry(Math.random), cfg, hooks, () => now, undefined, wallet);
  await s2.restorePresence();
  assert.equal((await store.get(j.found))!.status, 'playing', 'المباراة لازم تكمل بعد الرجوع');

  // محد رجع يلعب: المؤقتات تمشي لين تنتهي المباراة
  for (let i = 0; i < 400 && (await store.get(j.found))?.status === 'playing'; i++) { now += 31_000; await s2.tick(); }
  const room = (await store.get(j.found))!;
  assert.equal(room.status, 'finished', 'المباراة لازم تنتهي حتى لو محد رجع');
  assert.equal(sum(), total, 'مجموع العملات لازم يرجع كامل (للفايز أو استرجاع)');
});
