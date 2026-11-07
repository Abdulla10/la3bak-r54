// R53: فحص مسارات «من الذي رآني» و«ادعُ الأصدقاء» على خادم محلي بحسابات اختبار جديدة (بدون إنتاج).
// الاستخدام: node acceptance-r53/api-r53.mjs http://127.0.0.1:4104
const B = process.argv[2]; if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(B || '')) { console.error('محلي فقط'); process.exit(2); }
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, x ? '— ' + String(x).slice(0, 200) : ''); };
async function user(name) {
  const r = await fetch(B + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: B }, body: JSON.stringify({ name }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = async (path, method = 'GET', body, origin = B) => { const res = await fetch(B + path, { method, headers: { cookie, Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await res.json(); } catch {} return { status: res.status, j }; };
  const pub = (await call('/api/community/me')).j.pub;
  return { call, pub };
}
const t = Date.now().toString(36);
const owner = await user('مالك ' + t), shown = await user('ظاهر ' + t), hidden = await user('مخفي ' + t);
ok('إعداد: «إظهار نشاطي» للزائر الظاهر', (await shown.call('/api/account-tools/settings', 'PATCH', { showActivity: true })).status === 200);
await shown.call('/api/community/user/' + owner.pub); await hidden.call('/api/community/user/' + owner.pub);
await owner.call('/api/community/user/' + owner.pub); // زيارة نفسه ما تنحسب
let v = (await owner.call('/api/profile/visitors')).j;
ok('زيارتان (نفسه ما ينحسب)، والجديد = 2', v.total === 2 && v.fresh === 2, JSON.stringify(v));
ok('الزائر المفعّل «إظهار نشاطي» يظهر باسمه ورقمه العام', v.list.some((x) => x.publicId === shown.pub && x.hidden === false));
ok('الزائر غير المفعّل يظهر «زائر مخفي» بدون رقم عام ولا اسم', v.list.some((x) => x.hidden === true && x.publicId === null && x.name === 'زائر مخفي') && !JSON.stringify(v).includes(hidden.pub));
await shown.call('/api/community/user/' + owner.pub);
ok('تكرار الزيارة خلال 10 دقائق ما يزيد العدد', (await owner.call('/api/profile/visitors')).j.list.find((x) => x.publicId === shown.pub)?.count === 1);
ok('الضيف بدون جلسة يرفض (401)', (await fetch(B + '/api/profile/visitors')).status === 401);
ok('حساب ثاني يشوف زواره هو فقط', (await shown.call('/api/profile/visitors')).j.total === 0);
ok('«تمت المشاهدة» من مصدر خارجي ينرفض (403)', (await owner.call('/api/profile/visitors/seen', 'POST', {}, 'http://evil.example')).status === 403);
ok('«تمت المشاهدة» يصفّر الجديد', (await owner.call('/api/profile/visitors/seen', 'POST', {})).status === 200 && (await owner.call('/api/profile/visitors')).j.fresh === 0);
await owner.call('/api/community/user/' + shown.pub + '/block', 'POST', { on: true });
ok('الحظر يخفي الزائر من القائمة', !(await owner.call('/api/profile/visitors')).j.list.some((x) => x.publicId === shown.pub));
await owner.call('/api/community/user/' + shown.pub + '/block', 'POST', { on: false });
ok('فك الحظر يرجّعه', (await owner.call('/api/profile/visitors')).j.list.some((x) => x.publicId === shown.pub));
ok('قيمة limit غير صالحة تنرفض', (await owner.call('/api/profile/visitors?limit=abc')).status === 400);
// الدعوات
const inv = (await owner.call('/api/profile/invites')).j;
ok('رمز الدعوة = الرقم العام للحساب، وبدون مكافآت', inv.code === owner.pub && inv.rewards === null && inv.joinedCount === 0);
ok('ما تقدر تستخدم دعوتك لنفسك', (await owner.call('/api/profile/invites/claim', 'POST', { code: owner.pub })).status === 400);
ok('صاحب الدعوة لازم يكون أقدم منك', (await owner.call('/api/profile/invites/claim', 'POST', { code: hidden.pub })).status === 409);
ok('رمز غير صالح ينرفض', (await hidden.call('/api/profile/invites/claim', 'POST', { code: 'x' })).status === 400);
ok('حقول زايدة تنرفض', (await hidden.call('/api/profile/invites/claim', 'POST', { code: owner.pub, coins: 100 })).status === 400);
const c1 = await hidden.call('/api/profile/invites/claim', 'POST', { code: owner.pub });
const c2 = await hidden.call('/api/profile/invites/claim', 'POST', { code: shown.pub });
ok('الحساب الجديد يربط دعوة مرة وحدة فقط', c1.j?.already === false && c2.j?.already === true, JSON.stringify([c1.j, c2.j]));
const after = (await owner.call('/api/profile/invites')).j;
ok('صاحب الدعوة يشوف من انضم عن طريقه', after.joinedCount === 1 && after.joined[0].name.startsWith('مخفي'));
ok('المنضم يشوف من دعاه', (await hidden.call('/api/profile/invites')).j.invitedBy?.publicId === owner.pub);
console.log('SUMMARY pass', R.filter(Boolean).length, 'fail', R.filter((x) => !x).length);
