import {bgLayer} from './shop.js?v=r91';
import {createCannon3D} from './cannon3d-r29.js?v=r71-cannon-r29';
import {referenceOf} from './reference-assets.js?v=r68z31';
/* R58t: مدفع المراحل الخمس برسومات المالك (2D). مدفع v1 (3 مراحل) يبقى ثلاثي الأبعاد مثل ما هو. */
const isV2=m=>Array.isArray(m?.stages)&&m.stages.length===5;
const stageArt=(n,cls)=>`<img class="cn58-art ${cls}" src="/assets/art58/cannon/c${Math.max(1,Math.min(5,n|0))}.webp?v=r58t" alt="" decoding="async">`;
/* Room-wide cannon presentation. All progress/awards are server snapshots; no wallet writes. */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Number.isSafeInteger(n)&&n>=0?n.toLocaleString('en-US'):'—';
const asset=v=>typeof v==='string'&&/^\/(?:assets|backgrounds|social-assets)\/[A-Za-z0-9_.\/-]+$/.test(v)&&!v.includes('..')?v:'';
const mount=(mode,id)=>`<span class="cannon3d-r29-mount" data-cannon3d-mount="${mode}" data-cannon3d-id="${esc(id)}" data-cannon3d-state="idle" data-cannon3d-model-ready="false"><span data-cannon3d-placeholder>جارٍ تحميل المدفع ثلاثي الأبعاد…</span></span>`;
export function cannonShortcut(model){
 if(!model||!Array.isArray(model.stages))return '';
 const percent=Number.isSafeInteger(model.progress)&&Number.isSafeInteger(model.goal)&&model.goal>0?Math.min(100,Math.max(0,model.progress/model.goal*100)):0;
 return `<button type="button" class="so-cannon-shortcut" data-so-action="open-panel" data-panel="cannon" aria-label="مدفع الغرفة · المستوى ${esc(model.currentStage)} · المتبقي ${nf(model.remaining)}">${isV2(model)?stageArt(model.currentStage,'is-mini'):mount('miniature',model.id)}<span data-so-cannon-percent>${Math.floor(percent)}%</span><span class="so-cannon-mini-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent.toFixed(2)}"><i style="transform:scaleX(${percent/100})"></i></span></button>`;
}
function rewardCard(item,label,state,reward){
 const ref=referenceOf(item?.css||item?.id),preview=label==='خلفية'&&item?.css?bgLayer(item):'',art=asset(item?.art)||(label==='إطار'&&ref?.slot==='frame'?asset(String(ref.src).split('?')[0]):''),owned=reward?.alreadyOwned?.includes(item?.id),added=reward?.addedItems?.includes(item?.id);
 return `<article class="so-cannon-reward" data-so-cannon-reward="${esc(item?.id||'')}"><div class="so-cannon-reward-art ${label==='إطار'?'is-frame':''}">${art?`<img src="${esc(art)}" width="90" height="90" alt="" loading="eager" decoding="async">`:preview||`<span class="so-cannon-empty-art" aria-hidden="true">${label==='إطار'?'<svg viewBox="0 0 60 60" fill="none"><circle cx="30" cy="30" r="25" stroke="currentColor" stroke-width="4"/><path d="m17 13 13-7 13 7M17 47l13 7 13-7" stroke="currentColor" stroke-width="3"/></svg>':'<svg viewBox="0 0 60 60" fill="none"><path d="M5 9h50v42H5zM8 45l16-19 12 10 8-9 10 18" stroke="currentColor" stroke-width="3"/></svg>'}</span>`}</div><small><img class="cn58-rw" src="/assets/art58/cannon/rw-${label==='إطار'?'frame':'bg'}.webp?v=r58t" alt="" decoding="async">${label}</small><b>${esc(item?.name||item?.id||'غير متاحة')}</b><span>ملكية دائمة لصاحب البث</span>${state==='awarded'?`<em>${added?'تمت الإضافة':owned?'مملوكة من قبل':'تم تأكيد الملكية'}</em>`:''}</article>`;
}
export function cannonPanel(model,selected){
 if(!model||!Array.isArray(model.stages)||(model.stages.length!==3&&model.stages.length!==5))return '<p class="so-note">مدفع الغرفة غير متاح حاليًا.</p>';
 const index=Math.max(1,Math.min(model.stages.length,Number.isInteger(selected)?selected:model.currentStage)),stage=model.stages.find(s=>s.stage===index)||model.stages[0];
 const before=model.stages.filter(s=>s.stage<index).reduce((a,s)=>a+s.goal,0),progress=Math.min(stage.goal,Math.max(0,model.totalEnergy-before)),remaining=Math.max(0,stage.goal-progress),pct=stage.goal>0?progress/stage.goal*100:0;
 const status=stage.status==='awarded'?'اكتمل وتم منح الجوائز':stage.status==='pending'?'اكتمل الدعم · جارٍ تأكيد الملكية':'الدعم يعبّي المدفع';
 return `<section class="so-cannon-panel" data-so-cannon-id="${esc(model.id)}"><div class="so-cannon-levels" role="group" aria-label="مستويات المدفع">${model.stages.map(s=>`<button type="button" data-so-action="cannon-stage" data-stage="${s.stage}" aria-pressed="${s.stage===index}">LV${s.stage}${s.status==='awarded'?'<span>مكتمل</span>':''}</button>`).join('')}</div><div class="so-cannon-hero${isV2(model)?' is-cn58':''}" data-stage="${index}">${isV2(model)?stageArt(index,'is-hero'):mount('hero',model.id)}<span class="cannon3d-r29-level">المستوى ${index}</span>${isV2(model)?'':'<small class="cannon3d-r29-hint">اسحب المدفع لتدويره · الأسهم للتدوير · Home لإعادة العرض</small>'}</div><p class="so-cannon-needed"><strong data-so-cannon-remaining>${nf(remaining)}</strong><span>المتبقي</span></p><div class="so-cannon-track" role="progressbar" aria-label="طاقة مدفع المستوى ${index}" aria-valuemin="0" aria-valuemax="${stage.goal}" aria-valuenow="${progress}"><i style="transform:scaleX(${pct/100})"></i></div><div class="so-cannon-values"><span>طاقة المستوى <b dir="ltr" data-so-cannon-progress>${nf(progress)} / ${nf(stage.goal)}</b></span><span>مساهمتك <b dir="ltr" data-so-cannon-contribution>${nf(model.yourContribution)}</b></span></div><p class="so-cannon-unit">كل 20 عملة مدفوعة في هدايا البث = طاقة واحدة · بدون خصم إضافي</p><p class="so-cannon-status" role="status">${status}</p><button type="button" class="so-button so-primary so-cannon-support" data-so-action="open-panel" data-panel="gifts">إرسال هدية ودعم المدفع</button><h3>جوائز صاحب البث <small>${esc(model.owner?.name||'مالك الغرفة')}</small></h3><div class="so-cannon-rewards">${rewardCard(stage.rewards?.frame,'إطار',stage.status,stage.reward)}${rewardCard(stage.rewards?.background,'خلفية',stage.status,stage.reward)}</div><p class="so-cannon-policy">تُضاف الجوائز بعد تأكيد الخادم. الفائض ينتقل للمستوى التالي. التجهيز باختيار صاحب الحساب من أغراضه.</p></section>`;
}
// Terminal destroy; the parent recreates this room/account-scoped controller on a later mount.
export function createCannonEffects(getHost){
 const fx=createCannon3D(getHost),seen=new Set();
 // R58t: انفجار المدفع v2 (2D): المدفع يرتد ويطلق شرار، ويطلع اسم الجوائز. من بيانات الخادم فقط.
 const receive2D=(event,model)=>{
  if(!event||event.kind!=='cannon-explosion'||event.cannonId!==model?.id||typeof event.id!=='string'||seen.has(event.id))return false;
  const stage=model.stages.find(s=>s.stage===event.stage);if(!stage||stage.id!==event.id||stage.status!=='awarded')return false;
  const host=document.body;if(!getHost()&&!document.querySelector('[data-so-room-detail]')||document.hidden)return false;seen.add(event.id);
  const node=document.createElement('section');node.className='so-cannon-explosion cn58-blast';node.setAttribute('role','status');
  node.innerHTML=`<div class="cn58-blast-stage">${stageArt(event.stage,'is-blast')}<i class="cn58-flash" aria-hidden="true"></i>${Array.from({length:14},(_,k)=>`<i class="cn58-spark" style="--a:${k*26}deg;--d:${(k%4)*60}ms" aria-hidden="true"></i>`).join('')}</div><b>اكتمل مدفع المستوى ${esc(event.stage)} 🎉</b><span>جوائز ${esc(String(model.owner?.name||'صاحب البث').slice(0,60))}: ${esc(stage.rewards?.frame?.name||'إطار')} + ${esc(stage.rewards?.background?.name||'خلفية')}</span>`;
  host.append(node);setTimeout(()=>{node.classList.add('is-out');setTimeout(()=>node.remove(),500);},matchMedia?.('(prefers-reduced-motion: reduce)').matches?1800:5200);return true;
 };
 return {restore:m=>isV2(m)?true:fx.restore(m),receive:(e,m)=>isV2(m)?receive2D(e,m):fx.receive(e,m),destroy:()=>fx.destroy(),metrics:(...a)=>fx.metrics?.(...a)};
}
