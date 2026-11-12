/* R88: مزايا VIP الجديدة */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Perks, PICK_ID_EVERY, EDIT_WINDOW } from '../src/server/perks-r74.js';
import { SocialPrivate } from '../src/server/social-private.js';
import { Accounts } from '../src/server/account.js';

test('الراتب والخصم والخبرة تكبر مع المستوى، والنوبل يفتحها بعد', () => {
  const tiers: Record<string, { vip: number; noble: number }> = { v1: { vip: 1, noble: 0 }, v15: { vip: 15, noble: 0 }, n9: { vip: 0, noble: 9 }, none: { vip: 0, noble: 0 }, v7: { vip: 7, noble: 0 } };
  const p = new Perks('', (id) => tiers[id] ?? { vip: 0, noble: 0 });
  assert.equal(p.salaryOf('none'), 0); assert.equal(p.salaryOf('v1'), 100); assert.equal(p.salaryOf('v15'), 1500); assert.equal(p.salaryOf('n9'), 2700);
  assert.equal(p.discountPct('v1'), 0, 'الخصم من VIP 2'); assert.equal(p.discountPct('v7'), 14); assert.equal(p.discountPct('v15'), 30); assert.equal(p.discountPct('n9'), 30);
  assert.equal(p.xpPct('v7'), 0, 'الخبرة من VIP 8'); assert.equal(p.xpPct('v15'), 45); assert.equal(p.xpPct('n9'), 50);
  assert.ok(!p.has('v1', 'visitors')); assert.ok(p.has('v7', 'visitors'), 'مين زارني من VIP 6'); assert.ok(!p.has('n9', 'visitors'), 'زوار الملف لـ VIP بس');
});

test('كتم الكلمات والتثبيت والآيدي المختار', () => {
  let now = 1_000_000;
  const tiers: Record<string, { vip: number; noble: number }> = { a: { vip: 12, noble: 0 }, b: { vip: 0, noble: 0 } };
  const p = new Perks('', (id) => tiers[id], () => now);
  assert.throws(() => p.setMuteWords('b', ['سيء']), /VIP/);
  assert.deepEqual(p.setMuteWords('a', ['  كلمة ', 'كلمة', 'x', 'ثانية']).muteWords, ['كلمة', 'ثانية']);
  const pub = 'AAAAAAAAAAAAAAAA'; assert.ok(p.togglePin('a', pub).pinned); assert.ok(!p.togglePin('a', pub).pinned);
  for (let i = 0; i < 10; i++) p.togglePin('a', 'B' + String(i).padStart(15, '0'));
  assert.throws(() => p.togglePin('a', 'C' + '0'.repeat(15)), /10/);
  p.pickIdCheck('a'); p.markPick('a'); assert.throws(() => p.pickIdCheck('a'), /يوم/);
  now += PICK_ID_EVERY + 1; p.pickIdCheck('a');
  assert.throws(() => p.pickIdCheck('b'), /VIP/);
});

test('تعديل وحذف الرسالة خلال 10 دقايق بس', () => {
  let now = 5_000_000;
  const sp = new SocialPrivate('', () => now, undefined, { hasAccount: () => true, isBanned: () => false, resolvePublicId: (x: string) => x, isBlocked: () => false, isMuted: () => false, pub: (x: string) => x, nameOf: (x: string) => x } as any);
  (sp as any).d.links.push({ id: 1, from: 'u1', to: 'u2', state: 'accepted', at: now, decidedAt: now }); (sp as any).d.seq = 1;
  const sent = sp.send('u1', 'u2', { body: 'هلا', ref: 'ref-00000001' }) as any;
  const id = sent.message.id;
  assert.throws(() => sp.editOwn('u2', id, 'لا', EDIT_WINDOW), /غير موجودة/);
  const e = sp.editOwn('u1', id, 'هلا والله', EDIT_WINDOW); assert.equal(e.message.body, 'هلا والله'); assert.ok(e.message.editedAt);
  now += EDIT_WINDOW + 1; assert.throws(() => sp.editOwn('u1', id, 'متأخر', EDIT_WINDOW), /مهلة/);
  const s2 = sp.send('u1', 'u2', { body: 'ثانية', ref: 'ref-00000002' }) as any;
  const d = sp.deleteOwn('u1', s2.message.id, EDIT_WINDOW); assert.ok(d.message.deleted);
  assert.throws(() => sp.editOwn('u1', s2.message.id, 'رجّعها', EDIT_WINDOW), /ما تقدر/);
});

test('مضاعف الخبرة يزيد خبرة المباراة', () => {
  const a = new Accounts('');
  a.xpBoostOf = (id) => id === 'p1' ? 50 : 0;
  a.record('k1', 'baloot', [{ id: 'p1', name: 'أ' }, { id: 'p2', name: 'ب' }], []);
  const x1 = (a as any).d.profiles?.p1?.xp ?? (a as any).p('p1').xp, x2 = (a as any).d.profiles?.p2?.xp ?? (a as any).p('p2').xp;
  assert.ok(x1 > x2, `${x1} > ${x2}`);
});
