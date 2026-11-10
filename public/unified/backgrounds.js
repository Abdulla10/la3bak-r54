/* Supplied backgrounds UI integrated into the existing shop singleton and RPC protocol.
 * All balances, ownership, prices and equipped items are authoritative server data.
 */
import * as SHOP from '../shop.js?v=r68z29';
import {backgroundVisual,isSuppliedBackground} from '../background-art.js?v=r58p';
import {renderProfileIcon as icon} from '../preview/assets/profile/ui-icons-inline.js?v=r58p';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isSafeInteger(v)?v.toLocaleString('ar-AE-u-nu-latn'):'—';
const categories=[['all','الكل'],['royal','القصور الملكية'],['beasts','الحيوانات والتنانين'],['space','الفضاء'],['nature','الطبيعة'],['fantasy','الفانتازيا'],['neon','النيون'],['legacy','الخلفيات السابقة']];
const rarities=[['common','عادي'],['rare','نادر'],['epic','ملحمي'],['legendary','أسطوري']];
let owner=null;
let state={category:'all',rarity:'all',ownedOnly:false,preview:null,confirm:null,busy:false,error:'',notice:'',keys:{}};
function scoped(ctx){const id=ctx.user?.id??null;if(id!==owner){owner=id;state={category:'all',rarity:'all',ownedOnly:false,preview:null,confirm:null,busy:false,error:'',notice:'',keys:{}};}return state;}
const data=()=>SHOP.SH.data;
const itemOf=id=>data()?.items?.find(x=>x.id===id&&x.slot==='bg');
const owned=id=>data()?.owned?.includes(id)===true;
const equipped=id=>data()?.equipped?.bg===id;
const currency=()=>'عملة';
const enabled=item=>item.active===true&&item.eligibility?.eligible!==false&&(!isSuppliedBackground(item.id)||item.priceApproved===true);
function price(item){return `${number(item.price)} ${currency(item)}${isSuppliedBackground(item.id)&&!item.priceApproved?' — مقترح، مب معتمد':''}`;}
function visual(ctx,item){if(isSuppliedBackground(item.id))return backgroundVisual(item,'lb-bg-preview-art');return typeof ctx.bgHTML==='function'?ctx.bgHTML(item):'<span class="lb-bg-old-art">'+icon('image')+'</span>';}
function playerPreview(ctx){
 const face=typeof ctx.avatarHTML==='function'?ctx.avatarHTML(74):icon('person');
 const frame=ctx.me?.equipped?.frame??data()?.equippedView?.frame;
 const title=ctx.me?.equipped?.title??data()?.equippedView?.title;
 const portrait=frame&&typeof frame==='object'&&typeof ctx.framed==='function'?ctx.framed(face,frame,'lg'):face;
 return portrait+`<strong>${esc(ctx.user?.name??'')}</strong>${title&&typeof title==='object'?`<span>${esc(title.name)}</span>`:''}`;
}
function action(item){return equipped(item.id)?'مطبّقة':owned(item.id)?'تطبيق':!enabled(item)?'بانتظار اعتماد السعر':item.price===0?'الحصول':'شراء';}
function card(ctx,item){return `<article class="lb-bg-card" data-bg-card="${esc(item.id)}"><div class="lb-bg-preview">${visual(ctx,item)}${isSuppliedBackground(item.id)&&!item.art?'<small class="lb-bg-temp">معاينة مؤقتة</small>':''}</div><div class="lb-bg-card-body"><h3>${esc(item.name)}</h3><div class="lb-bg-meta"><span class="lb-bg-rarity r-${esc(item.rarity)}">${esc(rarities.find(([id])=>id===item.rarity)?.[1]??item.rarity)}</span><span>${esc(price(item))}</span></div>${owned(item.id)?`<span class="lb-bg-owned">${equipped(item.id)?'مملوكة ومطبّقة':'مملوكة'}</span>`:''}<div class="lb-bg-actions"><button type="button" class="lb-bg-btn lb-bg-secondary" data-bg-preview="${esc(item.id)}">معاينة</button><button type="button" class="lb-bg-btn" data-bg-item="${esc(item.id)}" ${equipped(item.id)||(!owned(item.id)&&!enabled(item))||state.busy?'disabled':''}>${action(item)}</button></div></div></article>`;}
function modal(ctx){const item=itemOf(state.confirm??state.preview);if(!item)return '';return `<div class="lb-bg-modal" role="dialog" aria-modal="true" aria-labelledby="lb-bg-modal-title" tabindex="-1"><div class="lb-bg-modalbox"><button class="lb-bg-close" type="button" data-bg-close aria-label="إغلاق المعاينة" ${state.busy?'disabled':''}>${icon('back')}</button><h2 id="lb-bg-modal-title">${state.confirm?'تأكيد الشراء':'معاينة على ملفك'} — ${esc(item.name)}</h2><div class="lb-bg-stage">${visual(ctx,item)}<div class="lb-bg-stage-player">${playerPreview(ctx)}</div></div><p>${isSuppliedBackground(item.id)&&!item.art?'هذي تدرجات CSS مؤقتة، مب الصورة الفنية النهائية. ':''}${state.confirm?`السعر المعتمد من الخادم: ${esc(price(item))}. الخادم يتحقق من الرصيد والملكية ويحفظ الخصم مرة وحدة.`:'المعاينة محلية بس؛ ما تغيّر ملكيتك ولا خلفيتك المطبّقة ولا رصيدك.'}</p>${state.confirm?`<button type="button" class="lb-bg-btn" data-bg-confirm ${state.busy?'disabled':''}>${state.busy?'جاري تأكيد الحفظ…':'تأكيد الشراء'}</button>`:`<button type="button" class="lb-bg-btn" data-bg-item="${esc(item.id)}" ${equipped(item.id)||(!owned(item.id)&&!enabled(item))||state.busy?'disabled':''}>${action(item)}</button>`}<button class="lb-bg-btn lb-bg-secondary" type="button" data-bg-close ${state.busy?'disabled':''}>رجوع</button></div></div>`;}
function body(ctx){
 const d=data();if(!d)return `<section class="panel" role="status">${SHOP.SH.err?esc(SHOP.SH.err):'جاري تحميل الخلفيات والملكية من الخادم…'}<button type="button" data-bg-reload class="lb-bg-btn">تحديث</button></section>`;
 const all=d.items.filter(x=>x.slot==='bg');const list=all.filter(x=>(state.category==='all'||(state.category==='legacy'?!isSuppliedBackground(x.id):x.backgroundCategory===state.category))&&(state.rarity==='all'||x.rarity===state.rarity)&&(!state.ownedOnly||owned(x.id)));
 const bg=itemOf(d.equipped?.bg);
 return `<div class="lb-bg-heading"><div><h1>خلفيات الملف الشخصي</h1><p>اختار الخلفية اللي تمثّلك — ${number(all.filter(x=>isSuppliedBackground(x.id)).length)} خلفية يديدة في ست مجموعات</p></div><a href="#/profile" class="lb-bg-btn lb-bg-secondary">ملفك الشخصي</a></div><p class="lb-bg-status">${bg?'المطبّقة: '+esc(bg.name):'الخلفية الافتراضية مطبّقة'} · <button type="button" data-bg-owned aria-pressed="${state.ownedOnly}">${state.ownedOnly?'عرض الكل':'خلفياتي المملوكة'}</button>${bg?' · <button type="button" data-bg-remove '+(state.busy?'disabled':'')+'>إرجاع الافتراضية</button>':''}</p>${state.error?`<p role="alert" class="lb-bg-error">${esc(state.error)}</p>`:''}${state.notice?`<p role="status" class="lb-bg-notice">${esc(state.notice)}</p>`:''}<section class="panel lb-bg-panel"><div class="lb-bg-filters" role="group" aria-label="تصنيف الخلفيات">${categories.map(([id,label])=>`<button type="button" data-bg-cat="${id}" aria-pressed="${state.category===id}" class="${state.category===id?'active':''}">${label}</button>`).join('')}</div><div class="lb-bg-filters" role="group" aria-label="مستوى الندرة"><button type="button" data-bg-rarity="all" aria-pressed="${state.rarity==='all'}" class="${state.rarity==='all'?'active':''}">كل الندرات</button>${rarities.map(([id,label])=>`<button type="button" data-bg-rarity="${id}" aria-pressed="${state.rarity===id}" class="${state.rarity===id?'active':''}">${label}</button>`).join('')}</div><div class="lb-bg-grid">${list.map(x=>card(ctx,x)).join('')||'<p class="lb-bg-empty">ما فيه خلفيات تطابق الفلتر الحالي.</p>'}</div></section><p class="lb-bg-note">الأسعار المقترحة مب تفعيل للبيع. الخلفيات اليديدة مقفلة من الخادم لين يعتمد المالك السعر والعملة والتفعيل من إعدادات المتجر. المملوكة تقدر تطبّقها، والمعاينة ما تخصم. كل هالعناصر تجميلية بس.</p>${modal(ctx)}`;
}
export function render(ctx){scoped(ctx);return `<section class="lb-backgrounds" data-lb-backgrounds dir="rtl">${body(ctx)}</section>`;}
export function mount(root,ctx){
 scoped(ctx);const page=root.querySelector('[data-lb-backgrounds]');if(!page)return {destroy(){}};let destroyed=false;const currentOwner=owner;
 const valid=()=>!destroyed&&currentOwner===owner&&page.isConnected;
 const paint=()=>{if(valid()){page.innerHTML=body(ctx);if(state.preview||state.confirm)page.querySelector('.lb-bg-modal')?.focus({preventScroll:true});}};
 const refresh=async()=>{try{const r=await ctx.req('shop:get');if(currentOwner!==owner)return;if(!r?.ok)throw Error(r?.error??'تعذر تحميل المتجر.');SHOP.apply(r);state.error='';paint();}catch(e){if(currentOwner===owner){state.error=e.message;paint();}}};
 const mutate=async(message,payload)=>{
  if(state.busy)return;state.busy=true;state.error='';state.notice='';paint();
  try{const r=await ctx.req(message,payload);if(currentOwner!==owner)return;if(r?.items)SHOP.apply(r);if(!r?.ok)throw Error(r?.error??'الخادم ما أكد العملية.');state.confirm=null;state.preview=null;state.notice=message==='shop:buy'?'تم حفظ الشراء من الخادم، تقدر تطبّق الخلفية الحين.':'تم حفظ خلفيتك المطبّقة.';state.busy=false;paint();void ctx.refreshMe?.();}
  catch(e){if(currentOwner!==owner)return;state.error=e.message+' إذا انقطع الرد، حدّث الحالة أو أعد نفس الطلب؛ مفتاحه محفوظ وما ينخصم مرتين.';}
  finally{if(currentOwner===owner){state.busy=false;paint();}}
 };
 const click=e=>{const b=e.target.closest('button');if(!b||!page.contains(b)||b.disabled)return;
  if(b.dataset.bgCat){state.category=b.dataset.bgCat;paint();}
  else if(b.dataset.bgRarity){state.rarity=b.dataset.bgRarity;paint();}
  else if(b.hasAttribute('data-bg-owned')){state.ownedOnly=!state.ownedOnly;paint();}
  else if(b.dataset.bgPreview){state.preview=b.dataset.bgPreview;state.confirm=null;paint();}
  else if(b.hasAttribute('data-bg-close')){if(!state.busy){state.preview=null;state.confirm=null;paint();}}
  else if(b.hasAttribute('data-bg-reload'))void refresh();
  else if(b.hasAttribute('data-bg-remove'))void mutate('shop:equip',{item:null,slot:'bg'});
  else if(b.dataset.bgItem){const item=itemOf(b.dataset.bgItem);if(!item)return;if(owned(item.id))void mutate('shop:equip',{item:item.id});else if(enabled(item)){state.confirm=item.id;state.preview=null;state.keys[item.id]??=SHOP.newKey();paint();}}
  else if(b.hasAttribute('data-bg-confirm')){const item=itemOf(state.confirm);if(item&&enabled(item))void mutate('shop:buy',{item:item.id,key:state.keys[item.id],seen:item.price,seenCur:item.currency});}
 };
 const key=e=>{const dialog=page.querySelector('.lb-bg-modal');if(!dialog)return;if(e.key==='Escape'&&!state.busy){state.preview=null;state.confirm=null;paint();}if(e.key==='Tab'){const nodes=[...dialog.querySelectorAll('button:not(:disabled),a[href]')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
 page.addEventListener('click',click);page.addEventListener('keydown',key);
 if(!data()&&ctx.connected!==false)void refresh();
 return {destroy(){destroyed=true;page.removeEventListener('click',click);page.removeEventListener('keydown',key);}};
}
