/* R90: استوديو التصميم */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Studio, validSpec, specCss, STUDIO_SELLER_SHARE } from '../src/server/studio-r90.js';
import { Wallet } from '../src/server/wallet.js';

const spec = { k: 'frame', c1: '#ffd66b', c2: '#b8740e', c3: '#ffffff', p: 'stars', t: 'عبدالله', g: true };

test('المواصفات: ألوان ونقشة ثابتة بس، وما يدخل كود', () => {
  assert.throws(() => validSpec({ ...spec, c1: 'red' }), /لون/);
  assert.throws(() => validSpec({ ...spec, p: 'url(x)' }), /نقشة/);
  const s = validSpec({ ...spec, t: '<script>"x"</script>طويل جدا جدا' }); assert.ok(!/[<>"]/.test(s.t)); assert.ok(s.t.length <= 12);
  const css = specCss(validSpec(spec)); assert.match(css, /^st~[A-Za-z0-9_-]+$/);
  const back = JSON.parse(Buffer.from(css.slice(3), 'base64url').toString('utf8')); assert.equal(back[5], 'عبدالله');
});

test('إنشاء، عرض للبيع، بيع، ونسبة البائع', () => {
  const st = new Studio('', () => 1000, undefined, (t) => t.includes('سب') ? 'ممنوع' : null);
  assert.throws(() => st.create('u1', 'سب', spec), /غير مناسبة/);
  const d = st.create('u1', 'ذهب', spec); const it = st.asItem(`st-${d.id}`)!; assert.equal(it.slot, 'frame'); assert.equal(it.active, false, 'ما ينباع من المتجر العادي');
  assert.throws(() => st.setPrice('u2', d.id, 500), /غير موجود/);
  assert.throws(() => st.setPrice('u1', d.id, 50), /السعر/);
  st.setPrice('u1', d.id, 1000); assert.equal(st.market().length, 1);
  const w = new Wallet('');
  assert.ok(w.buy('u1', { id: it.id, slot: 'frame', price: 0, currency: 'coins', permanent: true }, 'own-0000001').ok, 'المصمم يملكه ببلاش');
  assert.ok(w.equip('u1', 'frame', it.id));
  w.grant('u2', 'coins', 5000, 'test', 'seed-1'); const b2 = w.balance('u2'), b1 = w.balance('u1');
  const r = w.buy('u2', { id: it.id, slot: 'frame', price: 1000, currency: 'coins', permanent: true }, 'buy-0000001'); assert.ok(r.ok);
  st.sold(d.id); w.grant('u1', 'coins', Math.floor(1000 * STUDIO_SELLER_SHARE), 'sale', `studio-sale:${d.id}:u2`);
  assert.equal(w.balance('u2'), b2 - 1000); assert.equal(w.balance('u1'), b1 + 800); assert.equal(st.get(d.id)!.sales, 1);
  st.remove('u1', d.id); assert.equal(st.market().length, 0); assert.ok(st.asItem(it.id), 'اللي اشتراه يبقى يشوفه');
});

test('حد التصاميم لكل لاعب', () => {
  const st = new Studio('');
  for (let i = 0; i < 20; i++) st.create('u', 'x' + i, spec);
  assert.throws(() => st.create('u', 'زيادة', spec), /20/);
});

test('R91: صورة من الجهاز بمقاس ثابت', async () => {
  const { jpegSize, Studio: S2 } = await import('../src/server/studio-r90.js');
  const fake = (w: number, h: number) => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xd9]);
  assert.deepEqual(jpegSize(fake(512, 512)), [512, 512]); assert.deepEqual(jpegSize(fake(1000, 400)), [1000, 400]);
  assert.equal(jpegSize(Buffer.from('not an image')), null);
  const st = new S2('');
  assert.equal(st.checkImage('frame', fake(512, 512)), 'frame');
  assert.throws(() => st.checkImage('bg', fake(512, 512)), /1000×400/);
  const id = st.saveImage('u1', fake(1000, 400)); assert.match(id, /^[0-9a-f]{24}$/);
  assert.throws(() => st.create('u2', 'x', { ...spec, k: 'bg', i: id }), /ارفع الصورة/, 'صورة لاعب ثاني');
  const d = st.create('u1', 'منظر', { ...spec, k: 'bg', i: id }); assert.equal(d.spec.i, id);
});
