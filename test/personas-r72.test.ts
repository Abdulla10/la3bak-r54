/* R72: شخصيات الكمبيوتر: الأسماء، المستوى، الكلام، وجائزة أول فوز */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../src/engine/registry.js';
import { RoomService } from '../src/server/rooms.js';
import { MemoryStore } from '../src/server/store.js';
import { loadConfig } from '../src/server/config.js';
import { PERSONAS, personasFor } from '../src/server/personas-r72.js';

test('كل غرفة: الخصم المختار أول واحد، والباقين شخصيات مختلفة', () => {
  for (const p of PERSONAS) { const ps = personasFor('ABCDE', p.id, 3); assert.equal(ps[0].id, p.id); assert.equal(new Set(ps.map((x) => x.id)).size, 3); }
  assert.equal(personasFor('XYZ12', undefined, 5).length, 5);
});

test('الغرفة: أسماء الشخصيات، المستوى، ترحيب، وجائزة الفوز مرة', async () => {
  const said: string[] = []; const beaten: string[] = [];
  const hooks = { onRoom() {}, onGone() {}, onReact: (_r: unknown, _id: string, name: string, text: string) => said.push(name + ': ' + text), onPersonaBeaten: (u: string, p: string) => beaten.push(u + ':' + p) } as any;
  const svc: any = new RoomService(new MemoryStore(), createRegistry(Math.random), loadConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv), hooks);
  const user = { id: 'u1', name: 'لاعب' };
  const c = await svc.createRoom(user, { gameId: 'baloot', mode: 'bots', seats: 4, key: 'persona-test-key-1', persona: 'abusalem' });
  assert.ok(c.ok, c.error);
  const bots = c.room.players.filter((p: any) => p.bot);
  assert.equal(bots[0].name, '😤 أبو سالم');
  assert.ok(bots.every((b: any) => !/الكمبيوتر/.test(b.name)));
  const room = await svc.store.get(c.room.code); assert.equal(room.persona, 'abusalem'); assert.equal(room.botLevel, 'pro');
  await svc.start(user, c.room.code);
  await new Promise((r) => setTimeout(r, 1400));
  assert.ok(said.some((s) => s.startsWith('😤 أبو سالم: ')), 'لازم يرحّب');
  svc.personaFinish(room, ['u1'], [{ id: 'u1' }]);
  assert.deepEqual(beaten, ['u1:abusalem']);
  const bad = await svc.createRoom(user, { gameId: 'ludo', mode: 'bots', seats: 2, key: 'persona-test-key-2', persona: '<script>' });
  assert.ok(bad.ok); assert.equal((await svc.store.get(bad.room.code)).persona, undefined);
});
