/* R74: مزايا VIP والنوبل */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Perks, PERK_DEFS } from '../src/server/perks-r74.js';
import { Ratings } from '../src/server/rating-r69.js';
import { liftQuitBan, quitBlock, recordQuit } from '../src/server/quit-guard-r68.js';

test('الضعيفة تحت والقوية فوق، والمالك يغيّر المستوى', () => {
  const tiers: Record<string, { vip: number; noble: number }> = { low: { vip: 3, noble: 1 }, high: { vip: 15, noble: 9 }, none: { vip: 0, noble: 0 } };
  const p = new Perks('', (id) => tiers[id] ?? { vip: 0, noble: 0 });
  assert.ok(p.has('low', 'bigGroups')); assert.ok(!p.has('low', 'rankShield')); assert.ok(p.has('low', 'support')); assert.ok(!p.has('low', 'stealth'));
  assert.ok(PERK_DEFS.every((d) => p.has('high', d.key)), 'أعلى رتبة تفتح كل شي');
  assert.ok(PERK_DEFS.every((d) => !p.has('none', d.key)));
  const vip = PERK_DEFS.filter((d) => d.system === 'vip').map((d) => d.level), nob = PERK_DEFS.filter((d) => d.system === 'noble').map((d) => d.level);
  assert.deepEqual(vip, [...vip].sort((a, b) => a - b)); assert.deepEqual(nob, [...nob].sort((a, b) => a - b));
  p.setLevel('rankShield', 2); assert.ok(p.has('low', 'rankShield'));
  assert.throws(() => p.setLevel('stealth', 12));
  assert.ok(p.useDaily('high', 'quitPass')); assert.ok(!p.useDaily('high', 'quitPass'), 'مرة باليوم');
});

test('حماية التصنيف: الخسارة ما تنقّص النقاط', () => {
  const r = new Ratings('');
  const d = r.record('g1', 'baloot', [{ id: 'a', team: 0 }, { id: 'b', team: 1 }], ['b'], (id) => id === 'a');
  assert.equal(d.a, 0); assert.ok(d.b > 0); assert.equal(r.get('baloot', 'a'), 1000);
});

test('إعفاء الخروج يرفع المنع', () => {
  for (let i = 0; i < 4; i++) recordQuit('q1');
  assert.ok(quitBlock('q1')); liftQuitBan('q1'); assert.equal(quitBlock('q1'), null);
});
