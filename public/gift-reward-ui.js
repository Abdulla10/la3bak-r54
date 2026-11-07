import { giftArt } from './giftart.js?v=release-r14';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount = value => Number.isSafeInteger(value) && value >= 0;
const currency = value => value === 'coins' || value === 'gems';
const number = value => amount(value) ? value.toLocaleString('ar-EG') : 'غير متاح';
export const giftCurrencyName = cur => cur === 'gems' ? 'جوهرة' : 'عملة ذهبية';
export function giftCurrencyIcon(cur = 'coins') {
  const path = cur === 'gems' ? 'M3 8l4-5h10l4 5-9 13ZM3 8h18M7 3l5 18 5-18' : 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 6v12M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9';
  return `<svg class="gr13-currency gr13-${cur === 'gems' ? 'gem' : 'coin'}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="${path}"/></svg>`;
}
export function safeGiftArt(gift, size = 88) {
  if (!gift || typeof gift.motif !== 'string' || !gift.motif) return '<span class="gr13-art-unavailable">رسم الهدية غير متاح</span>';
  try { return giftArt({...gift,name:esc(gift.name),cat:typeof gift.cat === 'string' ? gift.cat : 'normal',variant:Number.isInteger(gift.variant) && gift.variant >= 0 && gift.variant <= 7 ? gift.variant : 0,rarity:Number.isInteger(gift.rarity) && gift.rarity >= 0 && gift.rarity <= 5 ? gift.rarity : 0},size); } catch { return '<span class="gr13-art-unavailable">رسم الهدية غير متاح</span>'; }
}
/** Select a precomputed row, never calculate or infer reward amounts in the client. */
export function giftRewardQuote(gift, qty) {
  if (!Number.isSafeInteger(qty) || qty <= 0 || !Object.prototype.hasOwnProperty.call(gift?.rewardQuotes || {},String(qty))) return null;
  const q = gift.rewardQuotes[String(qty)];
  return q && typeof q.policy === 'string' && q.policy && currency(q.cur) && currency(q.rewardCur) && ['total','recv','senderBonus','house'].every(key => amount(q[key])) && q.total > 0 ? q : null;
}
/** Confirmed historical events retain their original units and omit an absent bonus. */
export function giftRewardEventQuote(ev) {
  if (!ev || !amount(ev.total) || !amount(ev.recv)) return null;
  const cur = currency(ev.cur) ? ev.cur : currency(ev.currency) ? ev.currency : 'coins';
  const rewardCur = currency(ev.rewardCur) ? ev.rewardCur : currency(ev.rewardCurrency) ? ev.rewardCurrency : cur;
  return {policy:typeof ev.rewardPolicy === 'string' ? ev.rewardPolicy : '',cur,rewardCur,total:ev.total,recv:ev.recv,...(amount(ev.senderBonus) ? {senderBonus:ev.senderBonus} : {}),...(amount(ev.house) ? {house:ev.house} : {})};
}
export function giftRewardCard({gift,recipient,qty = 1,quote = null,confirmed = false,prepaid = false,pending = false,cost = null,costCur = 'coins',compact = false,sender = null} = {}) {
  const q = quote && currency(quote.cur) && currency(quote.rewardCur) && amount(quote.total) && amount(quote.recv) ? quote : null;
  const total = q ? q.total : amount(cost) ? cost : null, cur = q?.cur || costCur;
  const name = typeof recipient === 'object' ? recipient?.name || recipient?.id : recipient;
  const totalLabel = prepaid ? 'قيمة الهدية الممولة مسبقًا' : confirmed ? 'خُصم من رصيد المرسل' : 'إجمالي تكلفة الإرسال';
  // Room receipts are compact presentation only: no new calculation or settlement.
  if (compact && confirmed) {
    const from = typeof sender === 'object' ? sender?.name || sender?.id : sender;
    const caption = prepaid ? 'تم استخدام وحدة مسبقة الدفع؛ لا خصم جديد. الأرصدة والمكافآت بتأكيد الخادم.' : 'القيم المضافة والأرصدة الفعلية مؤكدة من الخادم.';
    return `<section class="gr13-card is-confirmed is-room-compact" dir="rtl" data-gift-reward-policy="${esc(q?.policy || '')}" aria-label="نتيجة الهدية المؤكدة"><div class="gr13-selection"><span class="gr13-art">${safeGiftArt(gift,48)}<b class="gr13-quantity" dir="ltr">×${number(qty)}</b></span><div class="gr13-selection-text"><span class="gr13-eyebrow">هدية مؤكدة</span><h3>${esc(gift?.name || 'الهدية')}</h3><p>${from ? `من <b>${esc(from)}</b> · ` : ''}إلى <b>${esc(name || 'المستلم')}</b></p></div></div><div class="gr13-rewards"><p><span>استلم المستلم</span><strong data-gift-reward-recipient="${q ? q.recv : ''}">${q ? giftCurrencyIcon(q.rewardCur) + number(q.recv) + ' ' + giftCurrencyName(q.rewardCur) : 'غير متاح'}</strong></p>${q && amount(q.senderBonus) ? `<p class="gr13-bonus"><span>بونص المرسل</span><strong data-gift-reward-bonus="${q.senderBonus}">${giftCurrencyIcon(q.rewardCur)}${number(q.senderBonus)} ${giftCurrencyName(q.rewardCur)}</strong></p>` : ''}</div><div class="gr13-settlement"><p class="gr13-total"><span aria-label="${totalLabel}">${prepaid ? 'مسبق الدفع · لا خصم جديد' : 'خُصم من المرسل'}</span><strong data-gift-reward-total="${total === null ? '' : total}">${total === null ? 'غير متاح' : giftCurrencyIcon(cur) + number(total) + ' ' + giftCurrencyName(cur)}</strong></p><details class="gr13-details"><summary>التفاصيل</summary><p class="gr13-caption">${caption}</p></details></div></section>`;
  }
  return `<section class="gr13-card${confirmed ? ' is-confirmed' : ''}${pending ? ' is-pending' : ''}" dir="rtl" data-gift-reward-policy="${esc(q?.policy || '')}" aria-label="${confirmed ? 'نتيجة الهدية المؤكدة' : 'مراجعة الهدية ومكافآتها'}"><div class="gr13-selection"><span class="gr13-art">${safeGiftArt(gift)}<b class="gr13-quantity" dir="ltr">×${number(qty)}</b></span><div class="gr13-selection-text"><span class="gr13-eyebrow">${confirmed ? 'هدية مؤكدة من الخادم' : pending ? 'طلب محفوظ غير محسوم' : 'الهدية المختارة'}</span><h3>${esc(gift?.name || 'اختر هدية')}</h3><p>إلى <b>${esc(name || 'اختر المستلم')}</b></p></div></div><div class="gr13-rewards"><p><span>${confirmed ? 'استلم المستلم' : 'يحصل المستلم على'}</span><strong data-gift-reward-recipient="${q ? q.recv : ''}">${q ? giftCurrencyIcon(q.rewardCur) + number(q.recv) + ' ' + giftCurrencyName(q.rewardCur) : 'غير متاح'}</strong></p>${q && amount(q.senderBonus) ? `<p class="gr13-bonus"><span>${confirmed ? 'أُضيف للمرسل بونص' : 'يحصل المرسل على بونص'}</span><strong data-gift-reward-bonus="${q.senderBonus}">${giftCurrencyIcon(q.rewardCur)}${number(q.senderBonus)} ${giftCurrencyName(q.rewardCur)}</strong></p>` : !q ? '<p><span>بونص المرسل</span><strong data-gift-reward-bonus="">غير مؤكد</strong></p>' : ''}</div><p class="gr13-total"><span>${totalLabel}</span><strong data-gift-reward-total="${total === null ? '' : total}">${total === null ? 'غير متاح' : giftCurrencyIcon(cur) + number(total) + ' ' + giftCurrencyName(cur)}</strong></p><p class="gr13-caption">${confirmed ? prepaid ? 'تم استخدام وحدة مسبقة الدفع؛ لا خصم جديد. الأرصدة والمكافآت بتأكيد الخادم.' : 'القيم المضافة والأرصدة الفعلية مؤكدة من الخادم.' : pending ? 'لم تُحسم النتيجة بعد. لا نعد بمكافأة جديدة؛ أعد نفس الطلب المحفوظ بأمان.' : !q ? 'عرض مكافآت الخادم غير متاح لهذه الكمية؛ حدّث البيانات قبل الإرسال.' : prepaid ? 'وحدة واحدة ممولة مسبقًا؛ لا خصم جديد. يضيف الخادم العملات عند تأكيد الإرسال.' : 'عرض خادمي لهذه الكمية. لا تُضاف العملات أو البونص إلا بعد تأكيد الإرسال.'}</p></section>`;
}
