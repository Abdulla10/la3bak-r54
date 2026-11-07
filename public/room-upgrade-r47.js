/* Free room capacity controls. No fetch, wallet, storage or alternate command keys.
 * Parent provides its authenticated command(c, name, fields) and authoritative snapshot.
 * Preferred server view: room.capacityUpgrade (projectRoomUpgradeR47), or each
 * council.capacityUpgrade when multiple councils are visible. All writes go through
 * ONE existing room:upgrade command, never room:update + council:update.
 */
export const ROOM_UPGRADE_PRESETS_R47 = Object.freeze([
  Object.freeze({id:'standard',label:'الأساسية',seats:4,maxMembers:24}),
  Object.freeze({id:'expanded',label:'الموسعة',seats:8,maxMembers:36}),
  Object.freeze({id:'grand',label:'الكبرى',seats:12,maxMembers:50}),
]);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isInt = (v,min,max) => Number.isSafeInteger(v)&&v>=min&&v<=max;
const arr = v => Array.isArray(v)?v:[];
const ERRORS = Object.freeze({
  owner_required:'التطبيق لمالك الغرفة فقط، وليس للمشرف أو مضيف المجلس.',
  game_room_upgrade_unavailable:'حزم السعة غير متاحة للغرف المرتبطة بلعبة.',
  pair_room_upgrade_unavailable:'المجلس الثنائي يبقى بمقعدين ولا يقبل هذه الحزم.',
  room_upgrade_platform_cap:'مقاعد الحزمة تتجاوز حد المنصة الحالي.',
  room_upgrade_group_cap:'المجموعة الصغيرة لا تتجاوز 5 مقاعد؛ اختر الأساسية.',
  room_upgrade_members_occupied:'عدد أعضاء الغرفة أكبر من سعة هذه الحزمة.',
  seats_occupied:'يوجد عضو في موضع مقعد خارج سعة الحزمة؛ لا ننقل الأعضاء تلقائيًا.',
  invalid_locked_seats:'يوجد قفل مقعد خارج السعة؛ أزله أولًا من إعدادات المقاعد.',
  room_upgrade_invalid_state:'حدّث حالة الغرفة للتحقق من السعة والصلاحيات.',
  council_not_found:'اختر مجلسًا حاليًا لعرض حزم سعته.',
});
export const roomUpgradeErrorR47 = error => ERRORS[error] || 'تعذر تطبيق الحزمة. حدّث حالة الغرفة ثم أعد المحاولة من الطلب القائم.';
function fixedOptions(model) {
  return ROOM_UPGRADE_PRESETS_R47.map(p=>{
    const option=arr(model?.options).find(o=>o?.id===p.id);
    const valid=option?.seats===p.seats&&option?.maxMembers===p.maxMembers;
    const available=model?.canApply===true&&valid&&option.available===true;
    return {...p,current:valid&&option.current===true,available,error:valid?option.error:'room_upgrade_invalid_state',message:valid&&typeof option.message==='string'?option.message:ERRORS.room_upgrade_invalid_state};
  });
}
/** Accept a direct projection, or the existing SocialRooms detail snapshot.
 * A conservative fallback displays actual fields while the server projection loads;
 * it never enables application based on a guessed cap or a client-side role alone. */
export function roomUpgradeModelR47(snapshot,councilId) {
  const room=snapshot?.room;
  const id=councilId||snapshot?.current?.councilId||room?.capacityUpgrade?.councilId;
  const council=arr(room?.councils).find(c=>c.id===id)||(!id&&arr(room?.councils).length===1?room.councils[0]:null);
  const projection=room?(council?.capacityUpgrade||room.capacityUpgrade):snapshot;
  if(projection&&typeof projection.roomId==='string'&&typeof projection.councilId==='string'&&(!room||room.id===projection.roomId)&&(!id||id===projection.councilId)&&(!council||council.id===projection.councilId)) {
    // An explicit room/council snapshot always wins over an old selected label/view.
    const actualSeats=council?.seats??projection.seats,actualMax=room?.maxMembers??projection.maxMembers;
    const exact=isInt(actualSeats,2,12)&&isInt(actualMax,2,50)&&actualSeats===projection.seats&&actualMax===projection.maxMembers;
    const owner=room?(room.permissions&&typeof room.permissions==='object'?room.permissions.owner===true:room.role==='owner'):true;
    const model={...projection,seats:actualSeats,maxMembers:actualMax,canApply:exact&&owner&&projection.canApply===true};
    return {...model,options:fixedOptions(model)};
  }
  return {roomId:room?.id||'',councilId:council?.id||'',selected:null,activePreset:null,seats:isInt(council?.seats,2,12)?council.seats:null,maxMembers:isInt(room?.maxMembers,2,50)?room.maxMembers:null,memberCount:isInt(room?.count,0,50)?room.count:arr(room?.members).length,councilCount:isInt(council?.count,0,12)?council.count:arr(council?.members).length,maxCouncilSeats:isInt(snapshot?.config?.maxCouncilSeats,2,12)?snapshot.config.maxCouncilSeats:null,canApply:false,options:ROOM_UPGRADE_PRESETS_R47.map(p=>({...p,available:false,current:false,error:'room_upgrade_invalid_state',message:ERRORS.room_upgrade_invalid_state}))};
}

/** Pure HTML, suitable for the parent's existing settings/info panel. */
export function renderUpgradePanel(snapshot,escapeHtml=esc,councilId) {
  const m=roomUpgradeModelR47(snapshot,councilId),e=typeof escapeHtml==='function'?escapeHtml:esc;
  const selected=ROOM_UPGRADE_PRESETS_R47.find(p=>p.id===m.selected);
  const known=isInt(m.seats,2,12)&&isInt(m.maxMembers,2,50);
  const active=known&&ROOM_UPGRADE_PRESETS_R47.find(p=>p.seats===m.seats&&p.maxMembers===m.maxMembers);
  const label=selected?(selected.id===active?.id?`الحزمة المحددة: ${selected.label}`:`آخر اختيار: ${selected.label} — السعة الحالية مخصصة`):active?`السعة توافق الحزمة ${active.label} — لم تُحدد حزمة بعد`:'السعة الحالية مخصصة';
  return `<section class="ru47-panel" data-room-upgrade-r47 dir="rtl" aria-label="حزم سعة الغرفة"><header><h3>حزم سعة الغرفة</h3><span class="ru47-free">مجاني</span></header><p class="ru47-current" role="status">${known?`${e(m.seats)} مقاعد في هذا المجلس · ${e(m.maxMembers)} عضوًا كحد إجمالي للغرفة`:'اختر مجلسًا وحدّث الحالة لعرض السعة الحقيقية.'}</p><p class="ru47-selected">${e(label)}</p><p class="ru47-limits">${isInt(m.maxCouncilSeats,2,12)?`حد المنصة الحالي: ${e(m.maxCouncilSeats)} مقاعد. `:''}الحد الأقصى 12 مقعد مجلس و50 عضو غرفة. المقاعد تختلف عن إجمالي الأعضاء؛ الحزمة تغيّر هذا المجلس وحده وسعة الغرفة، ولا تغيّر بقية المجالس أو مقاعد اللعبة.</p><div class="ru47-grid">${m.options.map(p=>`<article class="ru47-card${p.current?' is-current':''}" data-upgrade-card="${p.id}"><h4>${e(p.label)}</h4><strong>${p.seats} مقاعد</strong><p>حتى ${p.maxMembers} عضوًا في الغرفة</p><span class="ru47-price">مجاني</span><small>${p.current?'الحزمة الحالية':!p.available?e(p.message||roomUpgradeErrorR47(p.error)):'لا خصم ولا شراء ولا اشتراك'}</small><button type="button" class="ru47-apply" data-so-action="room-upgrade" data-room-upgrade-preset="${p.id}" data-preset="${p.id}" data-room-id="${e(m.roomId)}" data-council-id="${e(m.councilId)}"${!p.available||p.current?' disabled aria-disabled="true"':''}>${p.current?'مطبقة الآن':'تطبيق مجاني'}</button></article>`).join('')}</div><p class="ru47-note">يمكن للجميع رؤية السعة الخادمية؛ التطبيق لمالك الغرفة فقط. لا خصم من Coins أو Gems، ولا ارتباط برتب VIP أو NOBLE. المجلس الثنائي ثابت بمقعدين، وغرف الألعاب غير مشمولة. لن تُحذف عضوية أو تُنقل مقاعد مشغولة تلقائيًا.</p><p class="ru47-feedback" data-room-upgrade-feedback role="status" aria-live="polite"></p></section>`;
}
export const renderRoomUpgradeR47=renderUpgradePanel;
export function roomUpgradeConfirmationR47(preset) {
  const p=ROOM_UPGRADE_PRESETS_R47.find(x=>x.id===preset);
  if(!p)throw Error('اختر حزمة صالحة.');
  return `تأكيد تطبيق الحزمة ${p.label}: ${p.seats} مقاعد لهذا المجلس وحتى ${p.maxMembers} عضوًا للغرفة. الإجراء مجاني؛ لن يُخصم أي Coins أو Gems ولا يوجد اشتراك. لا تتغير المجالس الأخرى. هل تؤكد؟`;
}

/** Optional mount/action helper; works with parent delegated actions via apply().
 * Confirmation is mandatory (provide parent's own dialog or native confirm).
 * Receipt creation/retry belongs exclusively to command(). Never optimistic UI.
 */
export function createRoomUpgradeR47({getModel,command,confirm:ask,onChange=()=>{}}={}) {
  if(typeof getModel!=='function'||typeof command!=='function')throw TypeError('room_upgrade_host_required');
  const confirm=typeof ask==='function'?ask:text=>typeof globalThis.confirm==='function'&&globalThis.confirm(text);
  let host=null,busy=false,dead=false,message='';
  const paint=()=>{if(host&&!dead){host.innerHTML=renderUpgradePanel(getModel());const note=host.querySelector('[data-room-upgrade-feedback]');if(note)note.textContent=message;if(busy)host.querySelectorAll('[data-room-upgrade-preset]').forEach(b=>{b.disabled=true;});}};
  const read=()=>roomUpgradeModelR47(getModel());
  async function apply(preset,expected={}) {
    if(dead||busy)return {ok:false,error:'room_upgrade_busy'};
    const before=read(),option=before.options.find(p=>p.id===preset);
    if((expected.roomId&&expected.roomId!==before.roomId)||(expected.councilId&&expected.councilId!==before.councilId))return {ok:false,error:'room_upgrade_invalid_state'};
    if(!before.canApply||!option?.available||option.current)return {ok:false,error:option?.error||'room_upgrade_invalid_state'};
    busy=true;message='';paint();
    try {
      if(await confirm(roomUpgradeConfirmationR47(preset),{...option,roomId:before.roomId,councilId:before.councilId})!==true)return {ok:false,cancelled:true};
      if(dead)return {ok:false,error:'room_upgrade_disposed'};
      const after=read(),current=after.options.find(p=>p.id===preset);
      if(after.roomId!==before.roomId||after.councilId!==before.councilId||!after.canApply||!current?.available||current.current)throw Error(ERRORS.room_upgrade_invalid_state);
      const result=await command('room:upgrade',{roomId:after.roomId,councilId:after.councilId,preset});
      if(!result?.ok)throw Error(roomUpgradeErrorR47(result?.error));
      if(!dead){message='تم حفظ طلب السعة في الخادم دون أي خصم.';await onChange(result);}
      return result;
    } catch(error) {if(!dead)message=error?.message||ERRORS.room_upgrade_invalid_state;throw error;}
    finally {busy=false;paint();}
  }
  const click=event=>{const button=event.target?.closest?.('[data-room-upgrade-preset]');if(!button||!host?.contains(button)||button.disabled)return;event.preventDefault();event.stopPropagation();void apply(button.dataset.roomUpgradePreset,{roomId:button.dataset.roomId,councilId:button.dataset.councilId}).catch(()=>{});};
  return {apply,render:()=>renderUpgradePanel(getModel()),refresh:paint,
    mount(element){if(dead)throw Error('room_upgrade_disposed');host?.removeEventListener('click',click);host=element;host?.addEventListener('click',click);paint();return this;},
    destroy(){dead=true;host?.removeEventListener('click',click);if(host)host.innerHTML='';host=null;},
  };
}
