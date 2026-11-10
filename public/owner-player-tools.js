/* Owner-only presentation. The existing admin call owns authentication and HTTP.
 * All mutations target an explicitly selected canonical UUID; never infer an owner account.
 * The server remains authoritative for policy, ownership, permissions and idempotency.
 */
import { framed, bgLayer } from './shop.js?v=r68z37d';
import { avatarArt } from './avatars.js?v=r68z31';
import { referenceOf, referenceImage } from './reference-assets.js?v=r68z31';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const list = value => Array.isArray(value) ? value : [];
const number = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US') : '—';
const slots = {avatar:'الأفتار',frame:'الإطار',bg:'الخلفية',badge:'الشارة',title:'اللقب'};
const systems = {level:{label:'LEVEL',count:100},vip:{label:'VIP',count:15},noble:{label:'NOBLE',count:9}};
const mounts = new WeakMap();
const operations = new Map(); // Per UUID/form, survives an admin repaint or a lost response.
const actions = ['special-id','verification','rank','item','role'];
const FACE = '<span class="opt-face" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="24" r="12" fill="#d8bbef"/><path d="M8 62c0-28 48-28 48 0" fill="#d8bbef"/></svg></span>';
const reasonField = '<label>سبب العملية (مطلوب، 3–180 حرفًا)<input class="ad-in" name="reason" required minlength="3" maxlength="180" autocomplete="off"></label>';
const option = (value,label,selected=false) => `<option value="${esc(value)}"${selected?' selected':''}>${esc(label)}</option>`;
const safeToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) && value!=='prototype' && !Object.hasOwn(Object.prototype,value) ? value : '';
const isOwner = actor => actor?.role === 'owner';

export const ownerToolsVisible = isOwner;
export function ensureOwnerToolsCss() {
  if (document.querySelector('link[data-owner-tools-css]')) return;
  const link=document.createElement('link'); link.rel='stylesheet'; link.href='/owner-player-tools.css?v=r58q'; link.dataset.ownerToolsCss='1'; document.head.appendChild(link);
}
export function ownerToolsEntryHTML(actor, uuid) {
  if (!isOwner(actor)) return '';
  return `<section class="ad-card opt-owner-tools" data-owner-player-tools data-player-uuid="${esc(uuid)}" aria-label="تمييز الحساب — المالك فقط"><h2>تمييز الحساب — المالك فقط</h2><p role="status">${uuid?'جاري تحميل أدوات المالك…':'اختر لاعبًا من البحث أولًا. لا يرتبط رمز الإدارة تلقائيًا بحساب لاعب.'}</p></section>`;
}
/** Same previewArt URL resolution used by preview/app.js; only local trusted renderers enter it. */
const previewArt = html => String(html || '').replace(/\/assets\/reference\/(ref-[pk]-(?:av|frame|badge|title)-\d+)\.webp/g,'/preview/assets/cosmetics/$1.png').replaceAll('/assets/reference/','/preview/assets/cosmetics/');
export function ownerItemPreview(item) {
  if (!item || !Object.hasOwn(slots,item.slot)) return '<p class="ad-muted">اختر عنصرًا لمعاينة أصله.</p>';
  const id=safeToken(item.id), css=safeToken(item.css);
  let art='';
  if (item.slot==='avatar') art=avatarArt(id,84);
  else if (item.slot==='frame') art=framed(css || (referenceOf(id)?.slot==='frame'?id:''),FACE,'');
  else if (item.slot==='bg') art=bgLayer(css || (referenceOf(id)?.slot==='bg'?id:''));
  else if (referenceOf(id)) art=referenceImage(id,'opt-collectible');
  else art=`<span class="opt-text-art">${esc(item.slot==='title'?item.name:item.icon || item.css || item.name)}</span>`;
  return `<div class="opt-art opt-art-${item.slot}" aria-label="معاينة ${esc(item.name)}">${previewArt(art) || `<span class="opt-text-art">${esc(item.name)}</span>`}</div>`;
}
export function ownerRankChoices(data,system) {
  const spec=systems[system], config=data?.config?.[system];
  if (!spec || !config || config.enabled!==true || config.locked===true || config.isLocked===true) return [];
  if (system==='level') {
    if (config.max!==100 || config.formula!=='existing-xp-sqrt-v1') return [];
    return Array.from({length:spec.count},(_,i)=>({rank:i+1,min:40 * i ** 2}));
  }
  const thresholds=config.thresholds;
  if (!Array.isArray(thresholds) || (system==='noble' ? ![5,9].includes(thresholds.length) : thresholds.length!==spec.count) || thresholds.some((value,i)=>!Number.isSafeInteger(value) || value<0 || (i>0 && value<=thresholds[i-1]))) return [];
  return thresholds.map((min,i)=>({rank:i+1,min}));
}
const itemList = (data,slot) => list(data?.items).filter(item => item && Object.hasOwn(slots,item.slot) && item.slot===slot && typeof item.id==='string');
const currentRank = (data,system) => {
  const progress=data?.progression?.[system];
  if (!progress) return 'غير متوفر';
  if (progress.enabled===false) return 'مقفل';
  const rank=system==='level'?progress.level:progress.rank;
  return rank===null || rank===undefined ? 'لا رتبة' : esc(rank);
};
function itemControls(data,slot,itemId) {
  const items=itemList(data,slot), owned=new Set(list(data.owned)), equipped=data.equipped || {};
  const selected=items.find(item=>item.id===itemId);
  return `<label>العنصر من الكتالوج الحقيقي<select class="ad-in" name="itemId" data-opt-change="item" required>${option('','اختر عنصرًا')}${items.map(item=>option(item.id,`${item.name} · ${owned.has(item.id)?'مملوك':'غير مملوك'}${equipped[slot]===item.id?' · مجهّز':''} · ${item.status ?? (item.active===false?'غير متاح':'متاح')}`,item.id===itemId)).join('')}</select></label><div data-opt-preview>${ownerItemPreview(selected)}</div><p class="ad-muted" data-opt-item-state>${selected?`${owned.has(selected.id)?'مملوك بالفعل':'غير مملوك'} · ${equipped[slot]===selected.id?'مجهّز حاليًا':'غير مجهّز'}`:items.length?'اختر العنصر قبل المنح.':'لا عناصر في هذه الخانة بالكتالوج.'}</p>`;
}
export function ownerPlayerToolsHTML(data,{actor,slot='avatar',itemId='',busy=false,message='',error=''}={}) {
  if (!isOwner(actor)) return '';
  if (!data?.profile?.id) return '<h2>تمييز الحساب — المالك فقط</h2><p>اختر لاعبًا من البحث أولًا. لا نختار حساب المالك تلقائيًا.</p>';
  if (!Object.hasOwn(slots,slot)) slot='avatar';
  const profile=data.profile;
  const disabled=busy?' disabled':'';
  const form=(action,title,body,buttonLabel,extra='')=>`<section class="opt-panel"><h3>${title}</h3><form data-opt-form="${action}" ${extra}><fieldset${disabled}>${body}${reasonField}<button class="ad-btn" type="submit">${buttonLabel}</button></fieldset></form></section>`;
  const ranks=Object.entries(systems).map(([system,spec])=>{
    const choices=ownerRankChoices(data,system), p=data.progression?.[system];
    return form('rank',`ترقية ${spec.label}`,`<p>الحالي: ${currentRank(data,system)} · ${number(system==='level'?p?.xp:p?.points)} ${system==='level'?'XP':'نقطة'}</p>${choices.length?'':'<p class="opt-warning">مقفل: السياسة غير مفعّلة أو لا تحتوي عتبات معتمدة.</p>'}<label>الرتبة المستهدفة<select class="ad-in" name="targetRank" required${choices.length?'':' disabled'}>${option('','اختر رتبة')}${choices.map(choice=>option(choice.rank,`${spec.label} ${choice.rank} · الحد الأدنى ${number(choice.min)} ${system==='level'?'XP':'نقطة'}`)).join('')}</select></label><p class="ad-muted">يضيف الخادم فقط الخبرة/النقاط اللازمة للحد الأدنى المعتمد. لا تُخفّض الرتبة ولا تتغير السياسة.</p>`,`تطبيق رتبة ${spec.label}`,`data-system="${system}"${choices.length?'':' data-policy-locked="1"'}`);
  }).join('');
  const owned=new Set(list(data.owned));
  const roleLabels={owner:'المالك',admin:'مدير',moderator:'مشرف',support:'دعم'};
  const verificationLabel=data.verification?.verified===true?(data.verification.kind==='administration'?'توثيق الإدارة':'التوثيق العادي'):'غير موثّق';
  const pending=list(data.pendingOperations).map((operation,index)=>actions.includes(operation?.action) && operation?.body?.key===operation.key?`<section class="opt-pending"><p><strong>عملية محفوظة غير مكتملة</strong> · ${esc(operation.action)}<br>${esc(operation.body.reason)}<br><code dir="ltr">${esc(operation.key)}</code></p><button class="ad-btn" type="button" data-opt="resume" data-pending-index="${index}"${disabled}>استكمال العملية</button></section>`:'').join('');
  return `<header class="opt-heading"><div><h2>تمييز الحساب — المالك فقط</h2><p>${esc(profile.name)} · <code dir="ltr">${esc(profile.id)}</code></p></div><button type="button" class="ad-btn ghost" data-opt="refresh"${disabled}>تحديث</button></header><p class="opt-boundary">كل عملية مستقلة على اللاعب المحدد؛ لا منح تلقائي ولا مكافأة شاملة.</p><div data-opt-notice role="${error?'alert':'status'}" aria-live="polite" class="opt-notice${error?' is-error':''}">${esc(error || message || (busy?'جاري التنفيذ…':''))}</div><div class="opt-grid">
  ${pending}
  ${form('special-id','رقم ID مميّز',`<p>رقم اللاعب الدائم: <code dir="ltr">${esc(profile.playerId || '—')}</code><br>رقم العرض الحالي: <code dir="ltr">${esc(profile.displayPlayerId || profile.specialPlayerId || profile.playerId || '—')}</code></p><p class="ad-muted">الـ ID المميّز للعرض والبحث فقط؛ يبقى رقم اللاعب الدائم محفوظًا ولا يتغير UUID.</p><label>الإجراء<select class="ad-in" name="mode" required>${option('','اختر إجراء')}${option('set','منح / تعديل رقم مميّز')}${option('remove','إزالة الرقم المميّز والعودة للدائم')}</select></label><label>ID مميّز (1–8 أرقام، دون صفر في البداية)<input class="ad-in" name="value" dir="ltr" inputmode="numeric" maxlength="8" pattern="[1-9][0-9]{0,7}" autocomplete="off"></label>`,'حفظ الرقم المميّز')}
  ${form('verification','التوثيق العادي وتوثيق الإدارة',`<p>الحالي: ${verificationLabel}</p><label>نوع التوثيق<select class="ad-in" name="kind" required>${option('','اختر نوع التوثيق')}${option('standard','التوثيق العادي')}<option value="administration"${['owner','admin','moderator','support'].includes(data.role)?'':' disabled'}>توثيق الإدارة — بنفسجي وذهبي</option>${option('remove','إزالة التوثيق')}</select></label><p class="ad-muted">توثيق الإدارة علامة بنفسجية وذهبية، وليس منحًا لصلاحيات الإدارة. عيّن دور الإدارة أولًا ثم امنح التوثيق الإداري.</p>`,'حفظ التوثيق')}
  ${ranks}
  ${form('item','منح المقتنيات والمظهر',`<p class="ad-muted">منح مجاني بلا خصم عملات. لا يطبّق المظهر إلا عند اختيار التجهيز.</p><label>خانة المظهر<select class="ad-in" name="slot" data-opt-change="slot">${Object.entries(slots).map(([key,label])=>option(key,label,key===slot)).join('')}</select></label><div data-opt-catalog>${itemControls(data,slot,itemId)}</div><label class="opt-check"><input type="checkbox" name="equip">تجهيز العنصر على الحساب بعد المنح</label>`,'منح العنصر مجانًا')}
  ${form('role','الصلاحيات الإدارية الفعلية',`<p>الدور الحالي: ${esc(roleLabels[data.role] || data.role || 'لاعب عادي')}</p><p class="opt-warning">تحذير: هذا الإجراء يغيّر الصلاحيات الحقيقية للحساب، وليس لقبًا أو شارة تجميلية.</p><label>الدور الجديد<select class="ad-in" name="role" required>${option('','اختر دورًا')}${Object.entries(roleLabels).map(([key,label])=>option(key,label)).join('')}${option('remove','إزالة الدور — لاعب عادي')}</select></label><label class="opt-check"><input type="checkbox" name="confirm" required>أؤكد صراحة تغيير الصلاحيات الحقيقية لهذا اللاعب</label>`,'تأكيد تغيير الصلاحيات')}
  </div><details class="opt-inventory"><summary>المملوك والمجهّز (${owned.size})</summary><dl>${Object.entries(slots).map(([key,label])=>`<dt>${label} المجهّز</dt><dd>${esc(list(data.items).find(item=>item.id===data.equipped?.[key])?.name || data.equipped?.[key] || 'لا يوجد')}</dd>`).join('')}</dl><ul>${[...owned].map(id=>`<li>${esc(list(data.items).find(item=>item.id===id)?.name || id)} <code dir="ltr">${esc(id)}</code></li>`).join('') || '<li>لا مقتنيات مملوكة بعد.</li>'}</ul></details>`;
}
/** Exact POST bodies. No raw CSS, HTML, permissions or point totals are sent. */
export function ownerMutationPayload(action,values,data,system) {
  const reason=String(values.reason ?? '').trim();
  if ([...reason].length<3 || [...reason].length>180) throw new Error('سبب العملية مطلوب، من 3 إلى 180 حرفًا.');
  let payload;
  if (action==='special-id') {
    if (!['set','remove'].includes(values.mode)) throw new Error('اختر إجراء الرقم المميّز.');
    const value=String(values.value ?? '').trim();
    if (values.mode==='set' && !/^[1-9][0-9]{0,7}$/.test(value)) throw new Error('ID المميّز يجب أن يكون 1–8 أرقام، دون صفر في البداية.');
    payload={value:values.mode==='remove'?null:value};
  } else if (action==='verification') {
    if (!['standard','administration','remove'].includes(values.kind)) throw new Error('اختر نوع التوثيق.');
    if (values.kind==='administration' && !['owner','admin','moderator','support'].includes(data?.role)) throw new Error('عيّن دور الإدارة أولًا ثم امنح التوثيق الإداري.');
    payload={kind:values.kind==='remove'?null:values.kind};
  } else if (action==='rank') {
    const targetRank=Number(values.targetRank), choices=ownerRankChoices(data,system);
    if (!choices.some(choice=>choice.rank===targetRank)) throw new Error('هذه الرتبة مقفلة أو غير معتمدة في السياسة.');
    payload={system,targetRank};
  } else if (action==='item') {
    if (!itemList(data,values.slot).some(item=>item.id===values.itemId)) throw new Error('اختر عنصرًا حقيقيًا من الخانة المحددة.');
    payload={itemId:values.itemId,equip:values.equip===true};
  } else if (action==='role') {
    if (!['owner','admin','moderator','support','remove'].includes(values.role)) throw new Error('اختر دورًا صالحًا.');
    if (values.confirm!==true) throw new Error('يلزم تأكيد صريح لتغيير الصلاحيات الحقيقية.');
    payload={role:values.role==='remove'?null:values.role,confirm:true};
  } else throw new Error('عملية غير معروفة.');
  return {...payload,reason};
}
export function mountOwnerPlayerTools(root,{actor,uuid,call}={}) {
  if (!isOwner(actor) || !root || typeof call!=='function') return null;
  if (mounts.has(root)) return mounts.get(root);
  ensureOwnerToolsCss();
  const state={data:null,busy:false,slot:'avatar',itemId:'',message:'',error:'',stale:false};
  if(!operations.has(uuid))operations.set(uuid,new Map());
  const pendingForms=operations.get(uuid);
  const valid=()=>root.isConnected && !state.stale;
  const draw=()=>{
    if (!valid()) return;
    root.setAttribute('aria-busy',String(state.busy));
    root.innerHTML=ownerPlayerToolsHTML(state.data,{actor,...state});
    root.querySelectorAll('[data-policy-locked] fieldset').forEach(fieldset=>{fieldset.disabled=true;});
  };
  const notice=()=>{
    if (!valid()) return;
    root.setAttribute('aria-busy',String(state.busy));
    const node=root.querySelector('[data-opt-notice]');
    if (node) {node.textContent=state.error || state.message || (state.busy?'جاري التنفيذ…':'');node.setAttribute('role',state.error?'alert':'status');node.classList.toggle('is-error',!!state.error);}
    root.querySelectorAll('fieldset').forEach(fieldset=>{fieldset.disabled=state.busy || fieldset.closest('[data-policy-locked]')!==null;});
    const refresh=root.querySelector('[data-opt="refresh"]'); if(refresh)refresh.disabled=state.busy;
    root.querySelectorAll('[data-opt="resume"], [data-opt="new-operation"]').forEach(button=>{button.disabled=state.busy;});
  };
  const fetchData=async()=>{
    const data=await call(`players/${encodeURIComponent(uuid)}/owner-tools`);
    if (data?.ok!==true || data.profile?.id!==uuid) throw new Error('تعذّر تأكيد بيانات اللاعب المحدد.');
    if(valid())state.data=data;
  };
  async function refresh() {
    if (state.busy || !uuid || !valid()) return;
    state.busy=true;state.error='';notice();
    try {await fetchData();state.message='تم تحديث بيانات اللاعب.';draw();}
    catch(error) {state.error=error.message;if(state.data)notice();else root.innerHTML=`<h2>تمييز الحساب — المالك فقط</h2><p role="alert">${esc(state.error)}</p><button class="ad-btn ghost" type="button" data-opt="refresh">إعادة المحاولة</button>`;}
    finally {state.busy=false;notice();}
  }
  async function execute(action,payload,formKey) {
    if(state.busy || !valid())return;
    if([...pendingForms.values()].some(entry=>entry.inFlight)) {state.error='هناك عملية قيد التنفيذ لهذا اللاعب؛ انتظر نتيجتها ثم حدّث العرض.';notice();return;}
    let entry=pendingForms.get(formKey);
    if(!entry || entry.body.key!==payload.key) {entry={signature:JSON.stringify({action,...payload}),body:payload};pendingForms.set(formKey,entry);}
    entry.inFlight=true;
    state.busy=true;state.error='';state.message='';notice();
    let saved=false;
    try {
      const result=await call(`players/${encodeURIComponent(uuid)}/owner-tools/${action}`,{method:'POST',body:payload});
      saved=true;
      state.message=result?.duplicate?'هذه العملية محفوظة سابقًا؛ بلا تكرار.':'تم حفظ العملية على اللاعب المحدد.';
      if(result?.auditOk===false)state.message+=' تنبيه: تعذّر تسجيل التدقيق.';
      await fetchData();
      for(const [key,entry] of pendingForms)if(entry.body.key===payload.key)pendingForms.delete(key);
      draw();
    } catch(error) {
      state.error=saved?`تم الحفظ، لكن تعذّر تحديث العرض: ${error.message} استخدم تحديث للتحقق.`:error.message;
      if(error.code===409)state.error+=' تعارض في محتوى العملية: أعد إرسال المحتوى الأصلي بنفس المفتاح، أو ابدأ عملية جديدة صراحة.';
      const form=[...root.querySelectorAll('[data-opt-form]')].find(node=>`${node.dataset.optForm}:${node.dataset.system || ''}`===formKey);
      if(error.code===409 && form && !form.querySelector('[data-opt="new-operation"]')) {
        const button=document.createElement('button');button.type='button';button.className='ad-btn ghost opt-restart';button.dataset.opt='new-operation';button.dataset.formKey=formKey;button.textContent='بدء عملية جديدة (مفتاح جديد)';form.appendChild(button);
      }
    } finally {entry.inFlight=false;state.busy=false;notice();}
  }
  const onClick=event=>{
    const button=event.target.closest('[data-opt]');if(!button || state.busy)return;
    if(button.dataset.opt==='refresh') {event.preventDefault();void refresh();}
    if(button.dataset.opt==='resume') {
      event.preventDefault();const operation=list(state.data?.pendingOperations)[Number(button.dataset.pendingIndex)];
      if(!operation || !actions.includes(operation.action) || operation.body?.key!==operation.key)return;
      void execute(operation.action,operation.body,`${operation.action}:${operation.body.system || ''}`);
    }
    if(button.dataset.opt==='new-operation') {
      event.preventDefault();pendingForms.delete(button.dataset.formKey);button.remove();state.error='';state.message='بدأت عملية جديدة صراحة؛ راجع المدخلات ثم أرسلها. لا تُلغى العملية السابقة المحفوظة.';notice();
    }
  };
  const onChange=event=>{
    if(state.busy || !state.data || !valid())return;
    const field=event.target;
    if(field.dataset.optChange==='slot' && Object.hasOwn(slots,field.value)) {
      state.slot=field.value;state.itemId='';
      root.querySelector('[data-opt-catalog]').innerHTML=itemControls(state.data,state.slot,'');
    } else if(field.dataset.optChange==='item') {
      state.itemId=field.value;
      const item=itemList(state.data,state.slot).find(item=>item.id===state.itemId);
      root.querySelector('[data-opt-preview]').innerHTML=ownerItemPreview(item);
      root.querySelector('[data-opt-item-state]').textContent=item?`${list(state.data.owned).includes(item.id)?'مملوك بالفعل':'غير مملوك'} · ${state.data.equipped?.[state.slot]===item.id?'مجهّز حاليًا':'غير مجهّز'}`:'اختر العنصر قبل المنح.';
    }
  };
  const onSubmit=async event=>{
    const form=event.target.closest('[data-opt-form]');
    if(!form || !root.contains(form))return;
    event.preventDefault();event.stopPropagation();
    if(state.busy || !valid() || !state.data || !uuid)return;
    const action=form.dataset.optForm, fd=new FormData(form), values=Object.fromEntries(fd);
    values.equip=fd.has('equip');values.confirm=fd.has('confirm');
    let payload;
    try {payload=ownerMutationPayload(action,values,state.data,form.dataset.system);}
    catch(error) {state.error=error.message;state.message='';notice();return;}
    const signature=JSON.stringify({action,...payload});
    const formKey=`${action}:${form.dataset.system || ''}`, prior=pendingForms.get(formKey);
    if(prior && prior.signature!==signature) {
      state.error='للعملية السابقة مفتاح محفوظ: لا تغيّر محتواها عند إعادة المحاولة. استكمل العملية السابقة أو ابدأ عملية جديدة صراحة.';
      if(!form.querySelector('[data-opt="new-operation"]')) {const button=document.createElement('button');button.type='button';button.className='ad-btn ghost opt-restart';button.dataset.opt='new-operation';button.dataset.formKey=formKey;button.textContent='بدء عملية جديدة (مفتاح جديد)';form.appendChild(button);}
      notice();return;
    }
    if(!prior)pendingForms.set(formKey,{signature,body:{...payload,key:crypto.randomUUID()}});
    await execute(action,pendingForms.get(formKey).body,formKey);
  };
  root.addEventListener('click',onClick);
  root.addEventListener('change',onChange);
  root.addEventListener('submit',onSubmit);
  const controller={refresh,dispose:()=>{state.stale=true;root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);root.removeEventListener('submit',onSubmit);mounts.delete(root);}};
  mounts.set(root,controller);
  if(uuid)void refresh();else draw();
  return controller;
}
