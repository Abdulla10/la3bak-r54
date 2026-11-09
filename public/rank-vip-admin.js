/* Owner-only additive module for the existing dashboard. API paths are relative to /api/admin/. */
/** @typedef {{rank:number,name:string,artwork:string|null,color:string,rarity:'common'|'rare'|'epic'|'legendary'}} RankLevel */
/** @typedef {{call:(path:string, options?:{method?:string,body?:unknown})=>Promise<any>,actor:{id?:string,role?:string}}} AdminOptions */
/** @typedef {{system:'level'|'vip'|'noble',rank:number,rewards:Array<{type:'currency',cur:'coins'|'gems',amount:number}|{type:'item',itemId:string,mode:'grant'}>}} RewardPolicy */
const mounts = new WeakMap();
const obj = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = value => structuredClone(value);
const list = value => Array.isArray(value) ? value : obj(value) ? Object.entries(value).map(([id,row]) => obj(row) ? {id,...row} : {id,value:row}) : [];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('ar-EG-u-nu-latn') : '—';
const dt = value => { if (value === null || value === undefined || value === '') return '—'; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString('ar-EG-u-nu-latn') : '—'; };
const fail = text => { throw new Error(text); };
const text = (value,label,max=180) => { if (typeof value !== 'string' || !value.trim() || value.trim().length>max || /[<>\u0000-\u001f\u007f]/.test(value)) fail(`${label}: أدخل نصًا صالحًا حتى ${max} حرفًا.`); return value.trim(); };
const nat = (value,label,min=0,max=Number.MAX_SAFE_INTEGER) => { if (value === '' || value === null || value === undefined || (typeof value!=='number' && typeof value!=='string')) fail(`${label}: أدخل عددًا صحيحًا.`); if(typeof value==='string' && !/^\d+$/.test(value.trim())) fail(`${label}: أدخل عددًا صحيحًا.`); const n=Number(value); if(!Number.isSafeInteger(n)||n<min||n>max) fail(`${label}: عدد صحيح بين ${min} و${max}.`); return n; };
const bool = value => value === true || value === 'on';
const identifier = (value,label='المعرّف') => { const id=text(value,label,64); if(!/^[a-z][a-z0-9-]{2,63}$/.test(id)) fail(`${label}: معرّف لاتيني صغير مع شرطات، 3–64 حرفًا.`); return id; };
const eligibleItems = items => list(items).filter(item=>obj(item)&&['avatar','frame','bg','title','badge'].includes(item.slot)&&item.gameplay!==true);
export const rankVipAdminVisible = actor => actor?.role === 'owner';
/** Empty artwork is allowed; external/protocol-relative/traversal/data/encoded URLs are not. */
export function safeRankVipArtwork(value) {
  if(value === '' || value === null || value === undefined) return '';
  if(typeof value!=='string' || value.length>300 || !/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:png|webp|jpg|jpeg|svg|avif)$/.test(value)) fail('الشعار: استخدم ملف صورة محليًا يبدأ بشرطة واحدة / دون مسارات صعود أو معاملات.');
  return value;
}
export function parseRankVipThresholds(values,count,{allowNull=false}={}) {
  if(values===null && allowNull) return null;
  if(!Array.isArray(values)||values.length!==count) fail(`يلزم ${count} حدًا بالضبط.`);
  if(allowNull && values.every(v=>v===''||v===null||v===undefined)) return null;
  const out=values.map((v,i)=>nat(v,`حد المستوى ${i+1}`));
  if(out.some((v,i)=>i>0&&v<=out[i-1])) fail('الحدود يجب أن تكون أعدادًا صحيحة غير سالبة ومتزايدة دون تكرار.');
  return out;
}
/** Generate once per immutable intent; never fall back to timestamps or Math.random. */
export function createRankVipKey(cryptoSource=globalThis.crypto) {
  if(typeof cryptoSource?.randomUUID === 'function') return `rv_${cryptoSource.randomUUID()}`;
  if(typeof cryptoSource?.getRandomValues !== 'function') fail('المتصفح لا يوفر مفتاح عملية آمنًا؛ لا يمكن تنفيذ التعديل.');
  return 'rv_'+Array.from(cryptoSource.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');
}
function envelope(reason,key) {
  const why=text(reason,'سبب التعديل'); if(why.length<3) fail('سبب التعديل لا يقل عن 3 أحرف.');
  if(typeof key!=='string'||!/^[A-Za-z0-9:_-]{8,80}$/.test(key)) fail('مفتاح العملية غير صالح.');
  return {reason:why,key};
}
/** @param {any} current @param {{noble?:{count:5|9,enabled:boolean,thresholds:any[],levels:RankLevel[]},vip?:{enabled:boolean,thresholds:any[]},rewards?:Record<string,unknown>}} edits */
export function buildRankVipProgressionBody(current,edits,reason,key) {
  if(!obj(current)||!obj(edits)) fail('سياسة الخادم غير متاحة.');
  const result={...envelope(reason,key)};
  if(edits.vip) {
    const thresholds=parseRankVipThresholds(edits.vip.thresholds,15,{allowNull:!edits.vip.enabled});
    result.vip={enabled:bool(edits.vip.enabled),...(thresholds===null?{}:{thresholds})};
    if(result.vip.enabled && thresholds===null) fail('VIP يتطلب 15 حدًا معتمدًا.');
  }
  if(edits.noble) {
    const n=edits.noble.count;
    if(n!==5&&n!==9) fail('عدد الرتب يجب أن يكون 5 أو 9.');
    const currentCount=Array.isArray(current.noble?.ranks)?current.noble.ranks.length:5;
    if(currentCount===9&&n===5) fail('لا يمكن اختزال تسع رتب إلى خمس من هذه الواجهة.');
    const enabled=bool(edits.noble.enabled);
    const thresholds=parseRankVipThresholds(edits.noble.thresholds,n,{allowNull:!enabled&&n===5});
    if(!Array.isArray(edits.noble.levels)||edits.noble.levels.length!==n) fail(`يلزم تعريف ${n} رتب.`);
    const levels=edits.noble.levels.map((level,i)=>{
      if(!obj(level)||level.rank!==i+1) fail('معرّفات الرتب يجب أن تبقى مرتبة 1 إلى 9.');
      const name=text(level.name,'اسم الرتبة',80),artwork=safeRankVipArtwork(level.artwork)||null;
      if(typeof level.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(level.color)) fail('لون الرتبة يجب أن يكون HEX مثل #aabbcc.');
      if(!['common','rare','epic','legendary'].includes(level.rarity)) fail('اختر ندرة صالحة.');
      return {rank:level.rank,name,artwork,color:level.color,rarity:level.rarity};
    });
    result.noble={enabled,ranks:levels.map(level=>`N${level.rank}`),levels,...(thresholds===null?{}:{thresholds})};
  }
  if(edits.rewards!==undefined) { if(!obj(edits.rewards)) fail('سياسة النقاط غير صالحة.'); result.rewards=copy(edits.rewards); }
  if(!result.vip&&!result.noble&&!result.rewards) fail('لا توجد سياسة لتعديلها.');
  return result;
}
/** Explicit VIP/NOBLE eventRules only; never reinterpret opaque legacy rewards as new economics.
 * @param {Record<string,any>} current @param {Record<string,{vip?:number|string,noble?:number|string}>} events
 * @returns {{eventRules:Record<string,{vip?:number,noble?:number}>,reason:string,key:string}} */
export function buildRankVipEventBody(current,events,reason,key) {
  if(!obj(current)||!obj(events)) fail('سياسة نقاط الخادم غير متاحة.');
  const eventRules={};
  for(const [event,amounts] of Object.entries(events)) {
    if(!['gamePlayed','gameWon','giftSent','giftReceived'].includes(event)||!obj(amounts)) fail('حدث غير معتمد.');
    eventRules[event]={};
    for(const [system,amount] of Object.entries(amounts)) {
      if(!['vip','noble'].includes(system)) fail('قواعد الحدث تدعم VIP وNOBLE فقط؛ LEVEL يبقى وفق النظام الأصلي.');
      eventRules[event][system]=nat(amount,'نقاط الحدث',0,1_000_000_000);
    }
  }
  if(!Object.values(eventRules).some(row=>Object.keys(row).length)) fail('أدخل قواعد نقاط معتمدة قبل الحفظ.');
  return {eventRules,...envelope(reason,key)};
}
/** @param {RewardPolicy[]} policies @returns {{policies:RewardPolicy[],reason:string,key:string}} */
export function buildRankVipRewardsBody(policies,catalog,reason,key,{nobleMax=5}={}) {
  if(!Array.isArray(policies)||policies.length>120||![5,9].includes(nobleMax)) fail('سياسة المكافآت غير صالحة.');
  const ids=new Set(list(catalog).filter(item=>obj(item)&&typeof item.id==='string').map(item=>item.id));
  const seen=new Set();
  const rows=policies.map(policy=>{
    if(!obj(policy)||!['level','vip','noble'].includes(policy.system)) fail('نظام مكافأة غير صالح.');
    const rank=nat(policy.rank,'مستوى المكافأة',1,policy.system==='level'?100:policy.system==='vip'?15:nobleMax);
    const tag=`${policy.system}:${rank}`; if(seen.has(tag)) fail('لا تكرر سياسة المستوى؛ أضف المكافأة داخل السياسة نفسها.'); seen.add(tag);
    if(!Array.isArray(policy.rewards)||!policy.rewards.length||policy.rewards.length>100) fail('كل سياسة تحتاج مكافأة واحدة على الأقل، حتى 100.');
    const rewardSeen=new Set();
    const rewards=policy.rewards.map(reward=>{
      let out,tag;
      if(reward.type==='currency') {
        if(!['coins','gems'].includes(reward.cur)) fail('عملة غير صالحة.');
        out={type:'currency',cur:reward.cur,amount:nat(reward.amount,'مقدار المكافأة',1)}; tag=`currency:${reward.cur}`;
      } else {
        if(reward.type!=='item'||reward.mode!=='grant') fail('المقتنيات تمنح بنمط grant فقط.');
        const itemId=identifier(reward.itemId,'معرّف المقتنى'); if(!ids.has(itemId)) fail('المقتنى غير موجود في كتالوج الخادم.');
        out={type:'item',itemId,mode:'grant'}; tag=`item:${itemId}`;
      }
      if(rewardSeen.has(tag)) fail('لا تكرر عملة أو مقتنى داخل المستوى.'); rewardSeen.add(tag); return out;
    });
    return {system:policy.system,rank,rewards};
  });
  return {policies:rows,...envelope(reason,key)};
}
/** POST season envelope: explicit dates and frozen carry source; lifecycle is server-clock based. */
export function buildRankVipSeasonBody(input,reason,key) {
  if(!obj(input)||input.action!=='create') fail('بدء / إنهاء الموسم يدويًا غير مدعوم في عقد الخادم.');
  const common=envelope(reason,key);
  if(input.confirm!==true) fail('أكد صراحة إجراء الموسم وسياسة نقل النقاط.');
  const id=text(input.id,'معرّف الموسم',64);if(!/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(id)||['constructor','prototype','__proto__'].includes(id)) fail('معرّف الموسم غير صالح.');
  const name=text(input.name,'اسم الموسم',80);
  const stamp=(value,label)=>{ if(value===null||value===undefined||value==='') fail(`${label} مطلوب.`); const n=typeof value==='number'?value:Date.parse(value); if(!Number.isSafeInteger(n)||n<0) fail(`${label} غير صالح.`); return n; };
  const startAt=stamp(input.startAt,'بداية الموسم'),endAt=stamp(input.endAt,'نهاية الموسم');
  if(endAt<=startAt) fail('نهاية الموسم يجب أن تلي بدايته.');
  if(!obj(input.carry)||!['none','previous'].includes(input.carry.mode)) fail('حدد صراحة تصفير نقاط الموسم أو نقلها.');
  const carry=input.carry.mode==='none'?{mode:'none'}:{mode:'previous',fromSeasonId:text(input.carry.fromSeasonId,'الموسم السابق',64),percent:nat(input.carry.percent,'نسبة النقل',0,100)};
  return {action:'create',id,name,startAt,endAt,carry,...common};
}
/** Schema-friendly copy-on-write membership helper; final server field mappings are centralized here.
 * @param {{enabled:boolean,packages:any[],benefits:any[],policy:object|null}} current
 * @param {{policy?:object,packages?:any[],benefits?:any[]}} edits
 * @returns {{config:{enabled:boolean,packages:any[],benefits:any[],policy:object|null},reason:string,key:string}} */
export function buildRankVipMembershipBody(current,edits,catalog,reason,key) {
  if(!obj(current)||!obj(edits)) fail('سياسة العضوية غير متاحة.');
  const config=copy(current);
  if(edits.policy) {
    const p=edits.policy;
    config.enabled=bool(p.enabled);
    if(p.mode==='legacy-untimed') {if(config.enabled) fail('التقدم القديم بلا انتهاء لا يتطلب تفعيل شراء عضوية مؤقتة.');config.policy=null;}
    else {
      if(p.mode!=='timed'||p.approved!==true) fail('اعتمد صراحة سياسة التجديد والاحتفاظ بخبرة VIP عند الانتهاء.');
      if(!Array.isArray(p.warningsDays)||p.warningsDays.length>20) fail('تنبيهات الانتهاء يجب أن تكون قائمة حتى 20 حدًا.');
      const warningsDays=p.warningsDays.map(day=>nat(day,'أيام التنبيه',0,3650));
      if(new Set(warningsDays).size!==warningsDays.length)fail('لا تكرر أيام التنبيه.');
      config.policy={renewal:'preserve-active-expiry',expiry:'retain-lifetime-xp',warningsDays};
    }
  }
  if(edits.packages!==undefined) {
    if(!Array.isArray(edits.packages)||edits.packages.length>100) fail('الباقات غير صالحة (الحد 100).');
    const seen=new Set();
    config.packages=edits.packages.map(p=>{
      const id=identifier(p.id,'معرّف الباقة'); if(seen.has(id)) fail('معرّف باقة مكرر.'); seen.add(id);
      const approved=bool(p.approved),enabled=bool(p.enabled);
      if(enabled&&!approved) fail('لا تفعل باقة قبل اعتماد سعرها ومدتها.');
      if(!obj(p.price)||!['coins','gems'].includes(p.price.cur)) fail('حدد عملة تسعير مستقلة عن خبرة VIP.');
      return {id,name:text(p.name,'اسم الباقة',100),points:nat(p.points,'خبرة VIP',1,1_000_000_000),durationDays:nat(p.durationDays,'مدة العضوية بالأيام',1,3650),price:{cur:p.price.cur,amount:nat(p.price.amount,'السعر',1,p.price.cur==='coins'?1_000_000:100_000)},approved,enabled};
    });
  }
  if(edits.benefits!==undefined) {
    if(!Array.isArray(edits.benefits)||edits.benefits.length>200) fail('المزايا غير صالحة (الحد 200).');
    const items=new Map(eligibleItems(catalog).map(item=>[item.id,item]));
    const seen=new Set();
    config.benefits=edits.benefits.map(b=>{
      const id=identifier(b.id,'معرّف الميزة'); if(seen.has(id)) fail('معرّف ميزة مكرر.'); seen.add(id);
      const itemId=b.itemId?identifier(b.itemId,'معرّف المقتنى'):undefined;
      if(itemId&&!items.has(itemId)) fail('الميزة يجب أن ترتبط بمقتنى موجود في الكتالوج.');
      if(itemId&&items.get(itemId).gameplay===true) fail('المزايا التنافسية ليست مؤهلة.');
      return {id,name:text(b.name,'اسم الميزة',100),description:text(b.description,'وصف الميزة',500),level:nat(b.level,'VIP المطلوب',1,15),artwork:safeRankVipArtwork(b.artwork),...(itemId?{itemId}:{}),requiresActive:bool(b.requiresActive)};
    });
  }
  if(config.enabled&&(!obj(config.policy)||!config.packages?.some(p=>p.enabled&&p.approved))) fail('تفعيل العضوية يتطلب سياسة مؤقتة وباقة معتمدة ومفعلة. احفظ الباقة أولًا والنظام مغلق.');
  return {config,...envelope(reason,key)};
}
/** Frozen bodies and keys survive a lost response. Successful operations require a new intent. */
export function createRankVipMutationStore(keyFactory=createRankVipKey) {
  const intents=new Map();
  return {
    prepare(scope,path,body) {
      if(typeof scope!=='string'||!scope||!['progression','rank-rewards','rank-vip/season','vip-membership/config'].includes(path)||!obj(body))fail('طلب تعديل غير صالح.');
      const clean=copy(body); delete clean.key;
      const signature=JSON.stringify([path,clean]); const old=intents.get(scope);
      if(old?.signature===signature) return copy(old.intent);
      if(old?.uncertain) fail('نتيجة العملية السابقة غير مؤكدة. أعد نفس الطلب أولًا قبل تغيير البيانات.');
      const intent={path,body:{...clean,key:keyFactory()}};
      intents.set(scope,{signature,intent:copy(intent),uncertain:true}); return copy(intent);
    },
    success(scope) {intents.delete(scope);},
    rejected(scope) {intents.delete(scope);},
    peek(scope) {return intents.has(scope)?copy(intents.get(scope).intent):null;},
    entries() {return [...intents.entries()].map(([scope,row])=>({scope,...copy(row.intent)}));},
    clear() {intents.clear();}
  };
}
/** Only actual response rows enter this adapter. No fixtures, seeds, deadlines, or placeholder members. */
export function adaptRankVipAdminData({rank,progression,rewards,shop,membership}={}) {
  let config=obj(rank?.config)?copy(rank.config):obj(progression?.config)?copy(progression.config):null;
  if(config?.noble&&!Array.isArray(config.noble.levels)&&Array.isArray(config.noble.catalog)) config.noble.levels=config.noble.catalog.map((tier,i)=>({rank:i+1,name:tier.name,artwork:tier.artworkUrl,color:tier.accent,rarity:tier.rarity}));
  const catalog=list(shop?.items ?? rank?.catalog?.items ?? rank?.catalog).filter(item=>obj(item)&&typeof item.id==='string');
  const players=new Map();
  for(const row of [...list(progression?.players),...list(rank?.players),...list(membership?.players)]) if(obj(row)&&typeof row.id==='string') players.set(row.id,{...(players.get(row.id)||{}),...row});
  const orders=list(membership?.orders).map(row=>({...row,user:row.userId??row.user,points:row.points??row.snapshot?.package?.points,price:row.price??row.snapshot?.package?.price,packageId:row.packageId??row.snapshot?.package?.id}));
  return {config,catalog,seasons:list(rank?.seasons),rewardPolicies:list(rewards?.policies ?? rank?.rewardPolicies),membershipConfig:obj(membership?.config)?membership.config:null,players:[...players.values()],orders,audit:list(membership?.audit),persistent:progression?.persistent,rankAvailable:!!rank,rewardsAvailable:Array.isArray(rewards?.policies)||Array.isArray(rank?.rewardPolicies),rank,progression,membership};
}

const option=(value,label,selected)=>`<option value="${esc(value)}"${selected?' selected':''}>${esc(label)}</option>`;
const field=(label,name,value='',extra='')=>`<label>${esc(label)}<input name="${esc(name)}" value="${esc(value)}" ${extra}></label>`;
const numberField=(label,name,value='',min=0,max=Number.MAX_SAFE_INTEGER)=>field(label,name,value,`type="number" min="${min}" max="${max}" step="1" inputmode="numeric" dir="ltr"`);
const check=(label,name,checked=false,extra='')=>`<label class="rv-check"><input type="checkbox" name="${esc(name)}" ${checked?'checked':''} ${extra}>${esc(label)}</label>`;
const select=(label,name,choices,value,extra='')=>`<label>${esc(label)}<select name="${esc(name)}" ${extra}>${choices.map(([v,l])=>option(v,l,v===value)).join('')}</select></label>`;
const empty=label=>`<p class="rv-empty">${esc(label)}</p>`;
const reasonFields=()=>field('سبب التعديل (3–180 حرفًا)','reason','','required minlength="3" maxlength="180" autocomplete="off"');
const form=(id,content,button='حفظ السياسة',attributes='')=>`<form data-rv-form="${id}" ${attributes}><fieldset>${content}<div class="rv-form-footer">${reasonFields()}<button type="submit">${esc(button)}</button></div></fieldset></form>`;
const panel=(title,description,content)=>`<section class="rv-panel"><h3>${esc(title)}</h3>${description?`<p class="rv-muted">${esc(description)}</p>`:''}${content}</section>`;
const imagePreview=(artwork,name)=>{let src='';try{src=safeRankVipArtwork(artwork);}catch{}return src?`<img class="rv-art" src="${esc(src)}" alt="${esc(name)}" loading="lazy">`:'<span class="rv-no-art">بدون شعار</span>';};
const itemPicker=(name,value,items,required=false)=>select('المقتنى من الكتالوج',name,[['','اختر مقتنى'],...eligibleItems(items).map(item=>[item.id,`${item.name||item.id} · ${item.slot} · ${item.id}`])],value,required?'required':'');
const previewItem=(item)=>item?`<div class="rv-item-preview">${imagePreview(item.artwork??item.previewUrl??item.image,item.name)}<span>${esc(item.name||item.id)}<small>${esc(item.slot??item.type??'')} · ${esc(item.status??(item.active===false?'غير متاح':'من الكتالوج'))}</small></span></div>`:empty('اختر مقتنى لمعاينته. لا تمنح المعاينة أي عنصر.');
const tabs=[['ranks','الرتب وحدودها'],['events','قواعد النقاط'],['rewards','مكافآت الرتب'],['seasons','المواسم'],['vip','سياسة VIP'],['packages','باقات VIP'],['benefits','المزايا'],['review','الأعضاء والسجلات']];
export function ensureRankVipAdminCss(doc=globalThis.document) {
  if(!doc||doc.querySelector('link[data-rank-vip-admin-css]')) return;
  const link=doc.createElement('link');link.rel='stylesheet';link.href='/rank-vip-admin.css?v=r58p';link.dataset.rankVipAdminCss='1';doc.head.appendChild(link);
}
function rankEditor(model) {
  if(!model.config?.noble) return empty('سياسة الرتب غير متاحة من الخادم.');
  const noble=model.config.noble,currentCount=noble.ranks?.length===9?9:5,levels=list(noble.levels);
  /* R67: مسودات N6–N9 جاهزة (الاسم، الشارة، اللون، الندرة، وحد مقترح = ضعف اللي قبله). ما تنحفظ إلا لما المالك يختار «تسع رتب» ويضغط حفظ. */
  const SUG=[,,,,,{name:'الدوق',color:'#c58bff',rarity:'epic'},{name:'الأمير',color:'#ff7ac8',rarity:'epic'},{name:'الملك',color:'#ffd66b',rarity:'legendary'},{name:'الإمبراطور',color:'#ff9d2e',rarity:'legendary'}];
  const thr=Array.isArray(noble.thresholds)?[...noble.thresholds]:[];for(let i=5;i<9;i++)if(!Number.isSafeInteger(thr[i])&&Number.isSafeInteger(thr[i-1]))thr[i]=thr[i-1]*2;
  const cards=Array.from({length:9},(_,i)=>{
    const rank=`N${i+1}`,own=levels.find(row=>row.rank===i+1)||{},sug=SUG[i],level=sug?{...own,name:own.name||sug.name,color:own.color||sug.color,rarity:own.rarity||sug.rarity,artwork:own.artwork||`/preview/assets/profile/ranks/r65/noble-n${i+1}.webp`}:own,active=i<currentCount;
    return `<fieldset class="rv-editor-card" data-rv-tier="${i+1}" ${active?'':'disabled'}><legend>${rank} ${active?'':'· مسودة غير منشورة'}</legend><div class="rv-art-row">${imagePreview(level.artwork,level.name)}<span>${esc(level.name||'الاسم لم يحدده المالك')}</span></div><div class="rv-fields">${field('الاسم الظاهر',`name-${i}`,level.name??'','maxlength="60" required')}${field('رابط الشعار المحلي',`artwork-${i}`,level.artwork??'','dir="ltr" placeholder="/assets/..."')}${field('اللون HEX',`color-${i}`,level.color??'','dir="ltr" pattern="#[0-9a-fA-F]{6}" placeholder="#aabbcc" required')}${select('الندرة',`rarity-${i}`,[['','اختر الندرة'],['common','عادية'],['rare','نادرة'],['epic','ملحمية'],['legendary','أسطورية']],level.rarity??'','required')}${numberField('حد نقاط الترقية',`threshold-${i}`,(i>=5?thr[i]:noble.thresholds?.[i])??'')}</div></fieldset>`;
  }).join('');
  return panel('مستويات الرتب','المعرّفات داخلية فقط. لا تُستبدل الأسماء الفعلية بقيم تجريبية. حفظ 9 رتب قرار صريح يتطلب كل الأسماء والتصميمات والحدود التسعة المتزايدة.',form('ranks',`${select('عدد الرتب المعتمد','rankCount',currentCount===9?[[9,'تسع رتب معتمدة']]:[[5,'حفظ النظام الحالي (5)'],[9,'اعتماد تسع رتب صراحة']],currentCount)}${check('تفعيل التقدم في الرتب','enabled',noble.enabled)}<p class="rv-warning">N6–N9 تبقى مسودات بلا حدود أو مكافآت إلى أن يحدد المالك القيم. لا نعيد حساب أرصدة اللاعبين من المتصفح.</p><div class="rv-grid">${cards}</div>`));
}
function vipEditor(model) {
  const vip=model.config?.vip,member=model.membershipConfig;
  let content=vip?panel('حدود VIP1–VIP15','هذه خبرة التقدم الحالية، مستقلة عن العملات وعن صلاحية العضوية.',form('vip-thresholds',`${check('تفعيل تقدم VIP','enabled',vip.enabled)}<div class="rv-fields">${Array.from({length:15},(_,i)=>numberField(`VIP${i+1}`,`threshold-${i}`,vip.thresholds?.[i]??'')).join('')}</div>`)):empty('سياسة تقدم VIP غير متاحة.');
  if(!member) return content+empty('إعدادات العضوية غير متاحة؛ لا تُعرض باقات أو صلاحيات وهمية.');
  const policy=member.policy||{};
  content+=panel('سياسة صلاحية العضوية','الخبرة مدى الحياة تبقى محفوظة. انتهاء الصلاحية لا يحذف المقتنيات، والمزايا المؤقتة يجب التصريح بها. الدفع النقدي غير مفعل.',form('membership-policy',`${check('تفعيل شراء العضوية (مغلق افتراضيًا)','enabled',member.enabled)}${select('سياسة العضوية','mode',[['legacy-untimed','التقدم القديم مدى الحياة / بلا شراء مؤقت'],['timed','تمكين سياسة عضوية مؤقتة مرتبطة بالباقة']],member.policy?'timed':'legacy-untimed')}<p>التجديد: إضافة المدة إلى الانتهاء النشط، أو بدء مدة جديدة بعد الانتهاء. عند الانتهاء: الاحتفاظ بخبرة VIP والمقتنيات.</p>${field('أيام التنبيه قبل الانتهاء (فواصل؛ فارغ = دون تنبيهات)','warningsDays',list(policy.warningsDays).join(', '),'dir="ltr" placeholder="يحددها المالك"')}${check('أعتمد سياسة التجديد والاحتفاظ بالخبرة وأيام التنبيه','approved',false)}<p class="rv-muted">حالة الخادم: ${member.enabled?'مفعّل':'مغلق'} · التجديد: ${esc(policy.renewal??'لم يعتمد بعد')} · الانتهاء: ${esc(policy.expiry??'لم يعتمد بعد')}.</p>`));
  return content;
}
function eventEditor(model) {
  if(!model.config) return empty('سياسة الخادم غير متاحة.');
  const rules=model.config.eventRules??model.rank?.eventRules??{},supported=obj(model.config.eventRules)||obj(model.rank?.eventRules)||model.rank?.capabilities?.eventPoints===true;
  const names={gamePlayed:'مشاركة مباراة مكتملة',gameWon:'الفوز بمباراة',giftSent:'إرسال هدية مؤكد',giftReceived:'استقبال هدية مؤكد'};
  const rows=Object.entries(names).map(([id,name])=>`<fieldset class="rv-editor-card"><legend>${name}</legend><div class="rv-fields">${['vip','noble'].map(system=>numberField(system==='vip'?'VIP XP':'نقاط الرتبة',`${id}-${system}`,rules[id]?.[system]??'',0,1_000_000_000)).join('')}</div></fieldset>`).join('');
  return panel('قواعد المنح للأحداث الحقيقية','لا نقاط عند فتح الصفحة. صفر يعني لا منحة لذلك الحدث. LEVEL للألعاب يأتي من خبرة الحساب الأصلية ولا يكرر.',`${supported?'':'<p class="rv-warning">تحرير القواعد مقفل حتى يؤكد الخادم دعم سياسة eventPoints؛ القواعد الثابتة القديمة لا تتحول إلى إعدادات شكلية.</p>'}${form('events',`<div class="rv-grid">${rows}</div>`,'حفظ قواعد النقاط',supported?'':'data-policy-disabled="1"')}`);
}
function rewardRow(reward={},p,r,items) {
  const kind=reward.type==='currency'?reward.cur:reward.type==='item'?'item':'';
  return `<div class="rv-reward-row" data-rv-reward="${r}"><div class="rv-fields">${select('نوع المكافأة',`kind-${p}-${r}`,[['','اختر النوع'],['item','مقتنى تجميلي مجاني'],['coins','عملات'],...(kind==='gems'?[['gems','جواهر (قديم)']]:[])],kind,'required')}${numberField('مقدار العملة فقط',`amount-${p}-${r}`,reward.amount??'',1)}${itemPicker(`item-${p}-${r}`,reward.itemId??'',items)}</div><div data-rv-item-preview>${previewItem(items.find(item=>item.id===reward.itemId))}</div><button type="button" class="rv-secondary" data-rv="remove-reward" data-policy="${p}" data-index="${r}">إزالة المكافأة من المسودة</button></div>`;
}
function rewardsEditor(model) {
  if(!model.config||!model.rewardsAvailable) return empty('سياسة المكافآت غير متاحة من الخادم؛ لا يمكن استبدالها بقائمة فارغة.');
  const policies=model.rewardPolicies;
  return panel('مكافآت الرتب وربط المخزون','المكافأة تُستلم مرة واحدة عبر الخادم. حذف سياسة لا يمحو مكافأة مستلمة. عناصر الكتالوج تمنح بنمط grant ولا تُباع هنا.',form('rewards',`<div class="rv-grid" data-rv-policies>${policies.map((policy,p)=>`<fieldset class="rv-editor-card" data-rv-policy="${p}"><legend>سياسة ${p+1}</legend><div class="rv-fields">${select('نظام التقدم',`system-${p}`,[['level','LEVEL'],['vip','VIP'],['noble','الرتبة']],policy.system)}${numberField('المستوى المطلوب',`rank-${p}`,policy.rank??'',1,100)}</div><div data-rv-reward-rows>${list(policy.rewards).map((reward,r)=>rewardRow(reward,p,r,model.catalog)).join('')}</div><div class="rv-actions"><button type="button" class="rv-secondary" data-rv="add-reward" data-policy="${p}">إضافة مكافأة للمستوى</button><button type="button" class="rv-danger" data-rv="remove-policy" data-index="${p}">إزالة سياسة المستوى من المسودة</button></div></fieldset>`).join('')||empty('لا مكافآت منشورة. أضف فقط محتوى اعتمده المالك.')}</div><button type="button" class="rv-secondary" data-rv="add-policy">إضافة سياسة مستوى</button>`));
}
function seasonsEditor(model) {
  if(!model.rankAvailable) return empty('خدمة المواسم غير متاحة من الخادم.');
  const carrySources=model.seasons.filter(season=>season.status==='ended');
  return panel('إنشاء موسم','البداية والنهاية ومدى نقل النقاط قرارات المالك. الإدخال بالتوقيت المحلي للمتصفح ويُرسل زمنًا مطلقًا؛ لا مواعيد تلقائية.',form('season-create',`<div class="rv-fields">${field('معرّف الموسم','id','','required dir="ltr" pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,63}"')}${field('اسم الموسم','name','','required maxlength="80"')}${field('بداية الموسم','startAt','','type="datetime-local" required')}${field('نهاية الموسم','endAt','','type="datetime-local" required')}${select('نقاط الموسم الجديد','carryMode',[['','اختر السياسة صراحة'],['none','بداية من صفر؛ دون حذف نقاط مدى الحياة'],['previous','نقل نسبة من موسم سابق منتهٍ']],'','required')}${select('مصدر النقل (عند النقل فقط)','fromSeasonId',[['','اختر موسمًا منتهيًا'],...carrySources.map(season=>[season.id,season.name||season.id])],'')}${numberField('نسبة النقل 0–100 (عند النقل فقط)','percent','',0,100)}</div>${check('أؤكد إنشاء الموسم وحدود الزمن وسياسة النقاط','confirm',false,'required')}`,'إنشاء الموسم'))+panel('المواسم المسجلة','بداية ونهاية الموسم تطبّقان حسب ساعة الخادم في الموعدين اللذين اعتمدهما المالك؛ العرض لا يغيّر أي نقاط.',`<div class="rv-grid">${model.seasons.map(season=>`<article class="rv-editor-card"><h4>${esc(season.name||season.id)}</h4><dl><dt>الحالة</dt><dd>${esc(season.status??'غير محددة')}</dd><dt>البداية</dt><dd>${dt(season.startAt)}</dd><dt>النهاية</dt><dd>${dt(season.endAt)}</dd><dt>النقل</dt><dd>${season.carry?.mode==='previous'?`${nf(season.carry.percent)}% من ${esc(season.carry.fromSeasonId)}`:season.carry?.mode==='none'?'دون نقل':'غير محدد'}</dd></dl><div class="rv-actions"><button type="button" disabled>بدء يدوي غير متاح</button><button type="button" disabled>إنهاء يدوي غير متاح</button></div><p class="rv-muted">عقد الخادم الحالي يعتمد مواعيد صريحة عند الإنشاء ولا يدعم تغيير الحالة يدويًا.</p></article>`).join('')||empty('لا مواسم محفوظة.')}</div>`);
}
function packageCard(p={},i) {
  return `<fieldset class="rv-editor-card" data-rv-package="${i}"><legend>${esc(p.name||'باقة جديدة غير محفوظة')}</legend><div class="rv-fields">${field('معرّف الباقة',`id-${i}`,p.id??'','dir="ltr" required pattern="[a-z][a-z0-9-]{2,63}"')}${field('الاسم',`name-${i}`,p.name??'','required maxlength="60"')}${numberField('خبرة VIP (ليست رصيد عملات)',`points-${i}`,p.points??'',1,1_000_000_000)}${numberField('المدة بالأيام',`duration-${i}`,p.durationDays??'',1,3650)}${select('عملة السعر',`currency-${i}`,[['','اختر عملة'],['coins','عملات'],...(p.price?.cur==='gems'?[['gems','جواهر (قديم)']]:[])],p.price?.cur??'','required')}${numberField('السعر بعملة الباقة',`price-${i}`,p.price?.amount??'',1)}</div>${check('أعتمد صراحة نقاط الباقة وسعرها ومدتها','approved-'+i,p.approved)}${check('تفعيل عرض الباقة','enabled-'+i,p.enabled)}<button type="button" class="rv-danger" data-rv="remove-package" data-index="${i}">إزالة الباقة من المسودة</button></fieldset>`;
}
function packagesEditor(model) {
  if(!model.membershipConfig) return empty('إعدادات الباقات غير متاحة من الخادم.');
  return panel('باقات خبرة VIP','لا باقات افتراضية ولا تسعير نقدي. الشراء يستخدم المحفظة الحالية ويثبّت الخادم السعر والنقاط والمدة ويمنع تكرار الخصم.',form('packages',`<div class="rv-grid" data-rv-packages>${list(model.membershipConfig.packages).map(packageCard).join('')||empty('لا باقات معتمدة.')}</div><button type="button" class="rv-secondary" data-rv="add-package">إضافة باقة غير منشورة</button>`));
}
function benefitCard(b={},i,items) {
  return `<fieldset class="rv-editor-card" data-rv-benefit="${i}"><legend>${esc(b.name||'ميزة جديدة غير محفوظة')}</legend><div class="rv-fields">${field('معرّف الميزة',`id-${i}`,b.id??'','dir="ltr" required pattern="[a-z][a-z0-9-]{2,63}"')}${field('اسم الميزة',`name-${i}`,b.name??'','required maxlength="60"')}${field('وصف الميزة',`description-${i}`,b.description??'','required maxlength="180"')}${numberField('VIP المطلوب',`level-${i}`,b.level??'',1,15)}${field('رابط المعاينة المحلي',`artwork-${i}`,b.artwork??'','dir="ltr"')}${itemPicker(`item-${i}`,b.itemId??'',items)}</div><div data-rv-item-preview>${previewItem(items.find(item=>item.id===b.itemId))}</div>${check('ميزة مؤقتة: تتطلب عضوية نشطة (لا حذف للمقتنى)','active-'+i,b.requiresActive)}<p class="rv-muted">الربط يحدد الأهلية فقط؛ لا يمنح أو يحذف عناصر ولا يغيّر فرص الفوز.</p><button type="button" class="rv-danger" data-rv="remove-benefit" data-index="${i}">إزالة الميزة من المسودة</button></fieldset>`;
}
function benefitsEditor(model) {
  if(!model.membershipConfig) return empty('إعدادات المزايا غير متاحة من الخادم.');
  return panel('المزايا والتصريح بالمؤقت','المستوى المطلوب حتى VIP15. المعاينة من الكتالوج الحقيقي، ومدة الميزة تظهر قبل الشراء.',form('benefits',`<div class="rv-grid" data-rv-benefits>${list(model.membershipConfig.benefits).map((b,i)=>benefitCard(b,i,model.catalog)).join('')||empty('لا مزايا منشورة.')}</div><button type="button" class="rv-secondary" data-rv="add-benefit">إضافة ميزة غير منشورة</button>`));
}
const recordCard=record=>`<article class="rv-history-row"><strong>${esc(record.system??record.kind??record.action??'سجل')}</strong><span dir="ltr">${nf(record.points??record.delta)}</span><small>${dt(record.ts??record.at)} · ${esc(record.reason??record.ref??'')}</small><code dir="ltr">${esc(record.ref??record.id??record.key??'')}</code></article>`;
function pager(kind,page,count,size=12) { return `<div class="rv-pager"><button class="rv-secondary" type="button" data-rv="page" data-kind="${kind}" data-delta="-1" ${page===0?'disabled':''}>السابق</button><span>${count?nf(page*size+1):'0'}–${nf(Math.min(count,(page+1)*size))} من ${nf(count)} · نتائج محملة فقط</span><button class="rv-secondary" type="button" data-rv="page" data-kind="${kind}" data-delta="1" ${(page+1)*size>=count?'disabled':''}>التالي</button></div>`; }
function reviewEditor(model,state) {
  const term=state.search.trim().toLocaleLowerCase(),matches=row=>!term||[row.id,row.name,row.playerId,row.userId,row.user,row.packageId,row.key,row.status,row.orderId].some(v=>typeof v==='string'&&v.toLocaleLowerCase().includes(term));
  const players=model.players.filter(matches),orders=model.orders.filter(matches),page=(rows,n)=>rows.slice(n*12,n*12+12);
  const search=`<form data-rv-form="search"><div class="rv-search">${field('ابحث باسم اللاعب أو ID أو الطلب','q',state.search,'type="search"')}<button type="submit">بحث في النتائج المحملة</button></div></form><p class="rv-muted">البحث يعرض فقط صفوف الخادم المحملة. أدخل UUID كاملًا لفتح سجل لاعب خارج القائمة.</p><form data-rv-form="player-search"><div class="rv-search">${field('UUID اللاعب','id','','required dir="ltr" pattern="[0-9a-fA-F-]{36}"')}<button type="submit">فتح العضوية وسجل النقاط</button></div></form>`;
  const member=state.player?.membership??list(state.player?.players).find(row=>row.id===state.playerId)??state.player;
  const progression=state.player?.progression??member?.progression??state.player?.progress??state.player?.rank;
  const records=list(state.player?.records??state.player?.ledger??progression?.records??member?.records);
  const detail=state.player?panel('اللاعب المحدد',state.player.profile?.name??member?.name??state.player.id??state.playerId,`<dl><dt>حالة العضوية</dt><dd>${esc(member?.status??member?.membership?.status??'غير معروضة')}</dd><dt>بداية العضوية</dt><dd>${dt(member?.startedAt??member?.membership?.startedAt)}</dd><dt>انتهاء العضوية</dt><dd>${dt(member?.expiresAt??member?.membership?.expiresAt)}</dd><dt>VIP XP</dt><dd>${nf(progression?.vip?.points??member?.vip?.points??member?.vipPoints)}</dd><dt>نقاط الرتبة</dt><dd>${nf(progression?.noble?.points??member?.noblePoints)}</dd></dl><h4>سجل تغييرات النقاط</h4>${records.length?`<div class="rv-list">${page(records,state.pages.ledger).map(recordCard).join('')}</div>${pager('ledger',state.pages.ledger,records.length)}`:empty('الخادم لم يعرض سجلات نقاط لهذا اللاعب. لا يُستنتج تاريخ من الرصيد الحالي.')}`):'';
  return search+detail+panel('اللاعبون','الأرقام من بيانات التقدم والعضوية الحالية، دون تعديل رصيد مباشر.',`<div class="rv-grid">${page(players,state.pages.players).map(player=>`<article class="rv-editor-card"><h4>${esc(player.name||player.id)}</h4><code dir="ltr">${esc(player.id)}</code><dl><dt>رتبة</dt><dd>${esc(obj(player.noble)?player.noble.value:player.noble??player.rank??'غير معروضة')}</dd><dt>نقاط الرتبة</dt><dd>${nf(player.noblePoints??player.noble?.points)}</dd><dt>VIP</dt><dd>${esc(obj(player.vip)?player.vip.value:player.vip??'غير معروض')}</dd><dt>VIP XP</dt><dd>${nf(player.vipPoints??player.vip?.points)}</dd></dl><button class="rv-secondary" type="button" data-rv="player" data-id="${esc(player.id)}">فتح السجل</button></article>`).join('')||empty('لا لاعبين مطابقين في النتائج المحملة.')}</div>${pager('players',state.pages.players,players.length)}`)+panel('طلبات الشراء والترقية','سجل العضوية يوضح شراء VIP؛ سجل المحفظة القديم قد يصنف الخصم admin. لا تنفذ هذه الشاشة شراء أو استرجاعًا.',`<div class="rv-list">${page(orders,state.pages.orders).map(order=>`<article class="rv-history-row"><strong>${esc(order.id??order.orderId)}</strong><span>${esc(order.status??'غير معروض')}</span><small>${esc(order.user??order.playerId??'')} · ${esc(order.packageId??order.package?.name??'')} · ${dt(order.ts??order.createdAt??order.at)}</small><small>VIP XP ${nf(order.points??order.snapshot?.points)} · ${nf(order.price?.amount??order.snapshot?.price?.amount)} ${esc(order.price?.cur??order.snapshot?.price?.cur??'')}</small></article>`).join('')||empty('لا طلبات مطابقة في النتائج المحملة.')}</div>${pager('orders',state.pages.orders,orders.length)}`)+panel('التصحيحات والاسترجاعات','مقفلة: لا يوجد عقد خادمي آمن يضمن عكس خصم المحفظة وخبرة VIP والمدة عبر السجلات الحالية. راجع التدقيق، ولا تنفذ تعديل نقاط من المتصفح.','<button type="button" disabled aria-describedby="rv-correction-reason">تصحيح / استرجاع غير متاح</button><p id="rv-correction-reason" class="rv-warning">تحتاج سياسة وصلاحيات وخطة تسوية خادمية معتمدة قبل التنفيذ.</p>');
}
/** Pure view export for lightweight tests and host integration; it never initiates API calls. */
export function rankVipAdminHTML(model,state={}) {
  if(!rankVipAdminVisible(state.actor)) return '<section data-rank-vip-admin dir="rtl"><p role="alert">إدارة الرتب والعضوية للمالك فقط.</p></section>';
  const tab=tabs.some(([id])=>id===state.tab)?state.tab:'ranks';
  const s={search:'',pages:{players:0,orders:0,ledger:0},...state};
  const editors={ranks:()=>rankEditor(model),events:()=>eventEditor(model),rewards:()=>rewardsEditor(model),seasons:()=>seasonsEditor(model),vip:()=>vipEditor(model),packages:()=>packagesEditor(model),benefits:()=>benefitsEditor(model),review:()=>reviewEditor(model,s)+panel('تدقيق العضوية','أحدث السجلات التي أعادها الخادم؛ لا يفترض المحرر أن هذه قائمة كاملة.',`<div class="rv-list">${model.audit.slice((s.pages.audit||0)*12,((s.pages.audit||0)+1)*12).map(recordCard).join('')||empty('لا سجلات تدقيق محملة.')}</div>${pager('audit',s.pages.audit||0,model.audit.length)}`)};
  return `<section data-rank-vip-admin dir="rtl" aria-label="إدارة الرتب وعضوية VIP"><header class="rv-heading"><div><h2>الرتب والمكافآت وعضوية VIP</h2><p>قسم واحد داخل لوحة الإدارة الحالية · المالك فقط</p></div><button type="button" class="rv-secondary" data-rv="refresh">تحديث بيانات الخادم</button></header><p class="rv-boundary">نقاط الرتبة وVIP XP ليست عملات. لا تغيير رصيد أو شراء عند فتح أي محرر.</p><nav class="rv-tabs" aria-label="محررات الرتب وVIP">${tabs.map(([id,label])=>`<button type="button" class="${id===tab?'rv-active':'rv-secondary'}" data-rv="tab" data-tab="${id}" ${id===tab?'aria-current="page"':''}>${label}</button>`).join('')}</nav><div data-rv-notice class="rv-notice ${s.error?'rv-error':''}" role="${s.error?'alert':'status'}" aria-live="polite">${esc(s.error||s.message||'')}</div>${s.loading?empty('جاري تحميل البيانات الحقيقية من الخادم…'):editors[tab]()}${model.persistent===false?'<p class="rv-warning">تنبيه الخادم: سياسة التقدم بالذاكرة فقط ولا تبقى بعد إعادة التشغيل.</p>':''}</section>`;
}

/** @param {HTMLElement} root @param {AdminOptions} options @returns {{dispose:()=>void,refresh:()=>Promise<void>,setActor:(actor:any)=>void}} */
export function mountRankVipAdmin(root,{call,actor}) {
  if(!root||typeof call!=='function') throw new TypeError('root وcall مطلوبان.');
  mounts.get(root)?.dispose();
  ensureRankVipAdminCss(root.ownerDocument);
  const state={actor,tab:'ranks',loading:true,busy:false,error:'',message:'',search:'',pages:{players:0,orders:0,ledger:0},player:null,playerId:''};
  let model=adaptRankVipAdminData(),epoch=0,disposed=false,request=0,playerRequest=0;
  const operations=createRankVipMutationStore();
  const active=(token=epoch)=>!disposed&&epoch===token&&root.isConnected&&rankVipAdminVisible(state.actor);
  function notice(error='',message='') {state.error=error;state.message=message; const target=root.querySelector('[data-rv-notice]'); if(target){target.textContent=error||message;target.setAttribute('role',error?'alert':'status');target.classList.toggle('rv-error',!!error);} }
  function render() {if(disposed)return;root.innerHTML=rankVipAdminHTML(model,state);root.querySelectorAll('[data-policy-disabled] fieldset').forEach(node=>node.disabled=true);const section=root.querySelector('[data-rank-vip-admin]');if(section)for(const intent of operations.entries())section.insertAdjacentHTML('beforeend',`<section class="rv-warning"><h3>طلب سابق غير مؤكد</h3><p>${esc(intent.scope)} · ${esc(intent.body.reason)}</p><code dir="ltr">${esc(intent.body.key)}</code><p>إعادة الطلب تستخدم نفس البيانات المجمدة والمفتاح؛ لا تعدلها كعملية جديدة قبل معرفة النتيجة.</p><button type="button" data-rv="retry" data-scope="${esc(intent.scope)}">إعادة إرسال الطلب المجمد</button></section>`);}
  function dispose() {
    if(disposed)return;disposed=true;epoch++;request++;playerRequest++;operations.clear();
    root.removeEventListener('click',onClick);root.removeEventListener('submit',onSubmit);root.removeEventListener('change',onChange);
    root.ownerDocument.removeEventListener('rank-vip-admin:logout',onLogout);
    observer?.disconnect(); model=adaptRankVipAdminData();state.player=null;state.actor=null;
    if(mounts.get(root)===api) mounts.delete(root);
    root.replaceChildren();
  }
  function onLogout(){dispose();}
  const fatal=error=>[401,403,499].includes(Number(error?.code??error?.status));
  const rejected=error=>[400,404,405,422].includes(Number(error?.code??error?.status));
  async function refresh() {
    if(!active())return; const token=epoch,seq=++request; state.loading=true;state.error='';render();
    const paths=['rank-vip','progression','rank-rewards','shop','vip-membership'];
    const responses=await Promise.allSettled(paths.map(path=>call(path)));
    if(!active(token)||seq!==request)return;
    if(responses.some(result=>result.status==='rejected'&&fatal(result.reason))){dispose();return;}
    const data={},errors=[]; responses.forEach((result,i)=>{if(result.status==='fulfilled'&&obj(result.value)&&result.value.ok!==false)data[paths[i]]=result.value;else errors.push(`${paths[i]}: ${result.status==='rejected'?result.reason?.message||'فشل التحميل':'رد خادمي غير صالح'}`);});
    model=adaptRankVipAdminData({rank:data['rank-vip'],progression:data.progression,rewards:data['rank-rewards'],shop:data.shop,membership:data['vip-membership']});
    model.rankAvailable=!!data['rank-vip'];model.rewardsAvailable=!!data['rank-rewards']||Array.isArray(data['rank-vip']?.rewardPolicies);
    state.loading=false;state.error=errors.join(' · ');render();
  }
  async function openPlayer(id) {
    if(!/^[0-9a-fA-F-]{36}$/.test(id)) {notice('أدخل UUID لاعب صالحًا.');return;}
    const token=epoch,seq=++playerRequest;state.playerId=id;state.player=null;notice('','جاري تحميل سجل اللاعب…');
    try { const response=await call(`vip-membership/player/${encodeURIComponent(id)}`); if(!active(token)||seq!==playerRequest)return; if(!obj(response)||response.ok===false) fail(response?.error||'فشل عرض اللاعب.');state.player=response;state.pages.ledger=0;state.tab='review';state.message='';state.error='';render(); }
    catch(error){if(!active(token)||seq!==playerRequest)return;if(fatal(error)){dispose();return;}notice(error.message||'فشل تحميل سجل اللاعب.');}
  }
  function collect(formNode) {
    const F=new FormData(formNode),get=name=>F.get(name),checked=name=>F.has(name),id=formNode.dataset.rvForm;
    const reason=get('reason'),key='rv_validation_only';
    if(id==='ranks') {
      const count=nat(get('rankCount'),'عدد الرتب',5,9);
      return {path:'progression',body:buildRankVipProgressionBody(model.config,{noble:{count,enabled:checked('enabled'),thresholds:Array.from({length:count},(_,i)=>get(`threshold-${i}`)??''),levels:Array.from({length:count},(_,i)=>({rank:i+1,name:get(`name-${i}`),artwork:get(`artwork-${i}`),color:get(`color-${i}`),rarity:get(`rarity-${i}`)}))}},reason,key)};
    }
    if(id==='vip-thresholds') return {path:'progression',body:buildRankVipProgressionBody(model.config,{vip:{enabled:checked('enabled'),thresholds:Array.from({length:15},(_,i)=>get(`threshold-${i}`)??'')}},reason,key)};
    if(id==='events') {
      if(!obj(model.config.eventRules)&&!obj(model.rank?.eventRules)&&model.rank?.capabilities?.eventPoints!==true) fail('الخادم لا يؤكد دعم تحرير قواعد النقاط.');
      const events={};for(const event of ['gamePlayed','gameWon','giftSent','giftReceived']) {events[event]={};for(const system of ['vip','noble']){const value=get(`${event}-${system}`);if(value!==null&&value!=='')events[event][system]=value;}}
      return {path:'progression',body:buildRankVipEventBody(model.config,events,reason,key)};
    }
    if(id==='rewards') {
      const policies=[...formNode.querySelectorAll('[data-rv-policy]')].map(node=>{const p=node.dataset.rvPolicy;return {system:get(`system-${p}`),rank:get(`rank-${p}`),rewards:[...node.querySelectorAll('[data-rv-reward]')].map(row=>{const r=row.dataset.rvReward,kind=get(`kind-${p}-${r}`);return kind==='item'?{type:'item',itemId:get(`item-${p}-${r}`),mode:'grant'}:{type:'currency',cur:kind,amount:get(`amount-${p}-${r}`)};})};});
      return {path:'rank-rewards',body:buildRankVipRewardsBody(policies,model.catalog,reason,key,{nobleMax:model.config.noble.ranks?.length===9?9:5})};
    }
    if(id==='season-create') return {path:'rank-vip/season',body:buildRankVipSeasonBody({action:'create',id:get('id'),name:get('name'),startAt:get('startAt'),endAt:get('endAt'),carry:get('carryMode')==='none'?{mode:'none'}:{mode:get('carryMode'),fromSeasonId:get('fromSeasonId'),percent:get('percent')},confirm:checked('confirm')},reason,key)};
    let edits;
    if(id==='membership-policy') edits={policy:{enabled:checked('enabled'),mode:get('mode'),approved:checked('approved'),warningsDays:String(get('warningsDays')??'').trim()?String(get('warningsDays')).split(/[,،]/).map(value=>value.trim()):[]}};
    if(id==='packages') edits={packages:[...formNode.querySelectorAll('[data-rv-package]')].map(node=>{const i=node.dataset.rvPackage;return {id:get(`id-${i}`),name:get(`name-${i}`),points:get(`points-${i}`),durationDays:get(`duration-${i}`),price:{cur:get(`currency-${i}`),amount:get(`price-${i}`)},approved:checked(`approved-${i}`),enabled:checked(`enabled-${i}`)};})};
    if(id==='benefits') edits={benefits:[...formNode.querySelectorAll('[data-rv-benefit]')].map(node=>{const i=node.dataset.rvBenefit;return {id:get(`id-${i}`),name:get(`name-${i}`),description:get(`description-${i}`),level:get(`level-${i}`),artwork:get(`artwork-${i}`),itemId:get(`item-${i}`),requiresActive:checked(`active-${i}`)};})};
    if(!edits) fail('محرر غير معروف.');
    return {path:'vip-membership/config',body:buildRankVipMembershipBody(model.membershipConfig,edits,model.catalog,reason,key)};
  }
  async function onSubmit(event) {
    const formNode=event.target.closest?.('[data-rv-form]');if(!formNode||!root.contains(formNode)||!active())return;
    event.preventDefault();event.stopPropagation(); const id=formNode.dataset.rvForm;
    if(id==='search'){state.search=new FormData(formNode).get('q')||'';state.pages.players=0;state.pages.orders=0;render();return;}
    if(id==='player-search'){await openPlayer(String(new FormData(formNode).get('id')||''));return;}
    if(state.busy||formNode.dataset.policyDisabled==='1')return;
    const token=epoch,scope=id+(formNode.dataset.id||'');let intent;
    try { const built=collect(formNode);intent=operations.prepare(scope,built.path,built.body); }
    catch(error){notice(error.message);return;}
    state.busy=true;const fieldset=formNode.querySelector('fieldset');if(fieldset)fieldset.disabled=true;root.querySelectorAll('[data-rv="tab"],[data-rv="refresh"]').forEach(button=>button.disabled=true);notice('','جاري إرسال التعديل؛ لم يُؤكد حفظه بعد.');
    try { const result=await call(intent.path,{method:'POST',body:intent.body});if(!active(token))return;if(!obj(result)||result.ok===false)fail(result?.error||'الخادم لم يؤكد نجاح التعديل.');operations.success(scope);state.message=result.auditOk===false?'نجح التعديل، لكن الخادم لم يؤكد التدقيق. لا تعِد العملية؛ راجع سجل التدقيق.':'أكد الخادم نجاح التعديل.';state.busy=false;await refresh(); }
    catch(error){if(!active(token))return;if(fatal(error)){dispose();return;}state.busy=false;if(fieldset)fieldset.disabled=false;root.querySelectorAll('[data-rv="tab"],[data-rv="refresh"]').forEach(button=>button.disabled=false);if(rejected(error)){operations.rejected(scope);notice(`${error.message||'رفض الخادم الطلب'} صحح المدخلات قبل إنشاء طلب جديد.`);}else notice(`${error.message||'فشل الطلب'} أعد نفس الطلب بنفس البيانات؛ يحتفظ المحرر بمفتاح العملية لمنع التكرار.`);}
  }
  async function retry(scope) {
    const intent=operations.peek(scope);if(!intent||state.busy||!active())return;
    const token=epoch;state.busy=true;notice('','جاري إعادة الطلب المجمد بنفس المفتاح…');
    try {const result=await call(intent.path,{method:'POST',body:intent.body});if(!active(token))return;if(!obj(result)||result.ok===false)fail(result?.error||'الخادم لم يؤكد نجاح التعديل.');operations.success(scope);state.busy=false;state.message=result.auditOk===false?'نجح التعديل؛ تعذر تأكيد التدقيق. لا تعِد العملية.':'أكد الخادم نجاح الطلب المجمد.';await refresh();}
    catch(error){if(!active(token))return;if(fatal(error)){dispose();return;}state.busy=false;if(rejected(error))operations.rejected(scope);notice(error.message||'نتيجة الطلب لا تزال غير مؤكدة.');}
  }
  function onClick(event) {
    const button=event.target.closest?.('[data-rv]');if(!button||!root.contains(button)||!active()||state.busy)return;
    event.stopPropagation();
    const action=button.dataset.rv;
    if(action==='retry'){void retry(button.dataset.scope);return;}
    if(action==='tab'){state.tab=button.dataset.tab;state.error='';state.message='';render();return;}
    if(action==='refresh'){void refresh();return;}
    if(action==='player'){void openPlayer(button.dataset.id);return;}
    if(action==='page'){const kind=button.dataset.kind;state.pages[kind]=Math.max(0,(state.pages[kind]||0)+Number(button.dataset.delta));render();return;}
    const formNode=button.closest('[data-rv-form]');if(!formNode)return;
    event.preventDefault();
    const scope=formNode.dataset.rvForm+(formNode.dataset.id||'');
    if(operations.peek(scope)){notice('أعد الطلب السابق قبل تعديل مسودته؛ نتيجته غير مؤكدة.');return;}
    const nextIndex=selector=>Math.max(-1,...[...formNode.querySelectorAll(selector)].map(node=>Number(Object.values(node.dataset)[0])))+1;
    if(action==='add-policy') {const p=nextIndex('[data-rv-policy]');formNode.querySelector('[data-rv-policies]').insertAdjacentHTML('beforeend',`<fieldset class="rv-editor-card" data-rv-policy="${p}"><legend>سياسة جديدة غير محفوظة</legend><div class="rv-fields">${select('نظام التقدم',`system-${p}`,[['','اختر النظام'],['level','LEVEL'],['vip','VIP'],['noble','الرتبة']],'','required')}${numberField('المستوى',`rank-${p}`,'',1,100)}</div><div data-rv-reward-rows>${rewardRow({},p,0,model.catalog)}</div><button type="button" data-rv="add-reward" data-policy="${p}" class="rv-secondary">إضافة مكافأة للمستوى</button><button type="button" data-rv="remove-policy" data-index="${p}" class="rv-danger">إزالة السياسة من المسودة</button></fieldset>`);}
    if(action==='add-reward') {const p=button.dataset.policy,node=formNode.querySelector(`[data-rv-policy="${p}"]`),r=Math.max(-1,...[...node.querySelectorAll('[data-rv-reward]')].map(row=>Number(row.dataset.rvReward)))+1;node.querySelector('[data-rv-reward-rows]').insertAdjacentHTML('beforeend',rewardRow({},p,r,model.catalog));}
    if(action==='remove-policy')formNode.querySelector(`[data-rv-policy="${button.dataset.index}"]`)?.remove();
    if(action==='remove-reward')button.closest('[data-rv-reward]')?.remove();
    if(action==='add-package'){const i=nextIndex('[data-rv-package]');formNode.querySelector('[data-rv-packages]').insertAdjacentHTML('beforeend',packageCard({},i));}
    if(action==='remove-package')formNode.querySelector(`[data-rv-package="${button.dataset.index}"]`)?.remove();
    if(action==='add-benefit'){const i=nextIndex('[data-rv-benefit]');formNode.querySelector('[data-rv-benefits]').insertAdjacentHTML('beforeend',benefitCard({},i,model.catalog));}
    if(action==='remove-benefit')formNode.querySelector(`[data-rv-benefit="${button.dataset.index}"]`)?.remove();
  }
  function onChange(event) {
    const target=event.target;if(!active())return;
    if(target.name==='rankCount')root.querySelectorAll('[data-rv-tier]').forEach(node=>node.disabled=Number(node.dataset.rvTier)>Number(target.value));
    if(target.name?.startsWith('item-')){const row=target.closest('[data-rv-reward],[data-rv-benefit]');if(row)row.querySelector('[data-rv-item-preview]').innerHTML=previewItem(model.catalog.find(item=>item.id===target.value));}
  }
  root.addEventListener('click',onClick);root.addEventListener('submit',onSubmit);root.addEventListener('change',onChange);root.ownerDocument.addEventListener('rank-vip-admin:logout',onLogout);
  const Observer=root.ownerDocument.defaultView?.MutationObserver;
  const observer=Observer?new Observer(()=>{if(!root.isConnected)dispose();}):null;observer?.observe(root.ownerDocument.documentElement,{childList:true,subtree:true});
  const api={dispose,refresh,setActor(next){if(!rankVipAdminVisible(next)||next?.id!==state.actor?.id){dispose();return;}state.actor=next;}};
  mounts.set(root,api);render();if(rankVipAdminVisible(actor))void refresh();else state.loading=false;
  return api;
}
