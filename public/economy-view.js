/* كميات حقيقية من سياسة الخادم. لا تعبئة رصيد أو أسعار نقدية من المتصفح. */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Number(n).toLocaleString('ar-EG-u-nu-latn');
export function packHTML(policy,cur){
 const packs=(cur==='gems'?policy?.gemPacks:policy?.coinPacks)||[];
 if(!packs.length)return '<section class="card"><p>تعذّر جلب كميات الباقات من الخادم. أعد تحميل المتجر.</p></section>';
 return `<section class="card"><h2>باقات ${cur==='gems'?'الجواهر':'العملات'}</h2><p class="hint">هذي كميات الباقات المسجّلة بالخادم. بوابة الدفع مب مربوطة، فما بنحصّل منك مبلغ ولا بنضيف رصيد بدون دفع متحقق. الأسعار النقدية يضبطها المالك بعد اعتمادها.</p></section><ul class="sh-grid ref-packs">${packs.map(p=>`<li class="card sh-card" data-pack="${esc(p.id)}"><span class="sh-prev" aria-hidden="true">${cur==='gems'?'💎':'🪙'}</span><b>${nf(p.amount)} ${cur==='gems'?'جوهرة':'عملة'}</b><small>${p.priceMinor==null?'السعر النقدي مب محدّد':`${nf(p.priceMinor)} وحدة نقدية صغرى · ${esc(p.moneyCurrency)}`}</small><button class="btn ghost" disabled aria-disabled="true">الدفع غير مهيأ</button></li>`).join('')}</ul>`;
}
export function conversionHTML(){
 return '<section class="card ref-convert"><h2>التحويل اليدوي مقفول</h2><p>ما تقدر تحوّل العملات إلى جواهر ولا الجواهر إلى عملات. عائد الهدايا والبونص بالكوينز من الخادم، وهو مب تحويل يدوي.</p><p class="hint">أرصدتك والسجلات السابقة محفوظة. باقات العملات والجواهر من صفحة الباقات الحالية.</p><a class="btn" href="#/wallet">عرض المحفظة والسجل</a></section>';
}
