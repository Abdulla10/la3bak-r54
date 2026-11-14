/* R139: انتحال اسم الإدارة بحروف مخفية أو مسافات أو حروف روسية، والأسماء الفاضية بحروف شفافة */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameProblem, cleanName } from '../src/server/session.js';
const check = (raw: string) => { const c = cleanName(raw); return !c ? 'empty' : nameProblem(c); };
test('أسماء تنتحل الإدارة أو فاضية تنرفض', () => {
  for (const raw of ['الإد⁠ارة', 'الإد­ارة', 'ا ل إ د ا ر ة', 'Аdmin', 'adm1n', 'مشرف', 'المالك', 'حساب رسمي', 'ㅤㅤ', '⠀⠀', '؜​'])
    assert.ok(check(raw), `لازم ينرفض: ${JSON.stringify(raw)}`);
});
test('الأسماء العادية تنقبل', () => {
  for (const raw of ['محمد', 'مالك', 'رسمي', 'عبد الرحمن', 'Malik', 'Moderna', 'Rasmi', 'ملاك', 'مشاري', 'سلطان الملوك', 'ليلى ✨', 'Ali1'])
    assert.equal(check(raw), null, raw);
});
test('علامات زالغو تنمسح والتشكيل العربي يبقى', () => {
  assert.equal(cleanName('ل̷̡̧ا'), 'لا');
  assert.equal(cleanName('مُحَمَّد'), 'مُحَمَّد');
});
