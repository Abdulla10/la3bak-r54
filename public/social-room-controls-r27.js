export const ROOM_THEMES=Object.freeze({
 royal:Object.freeze({name:'زمردي وعاجي',gradient:'linear-gradient(155deg,#e6ddf3 0%,#f4eee6 58%,#d3c6e6 100%)'}),
 amethyst:Object.freeze({name:'عاجي وذهبي',gradient:'radial-gradient(ellipse at 80% 15%,#e8c98755,transparent 65%),linear-gradient(145deg,#fcf9f4,#f4eee6 60%,#e6ddf3)'}),
 gold:Object.freeze({name:'زمردي وعاجي',gradient:'linear-gradient(155deg,#e6ddf3 0%,#f4eee6 58%,#d3c6e6 100%)',legacy:true}),
 img1:Object.freeze({name:'قاعة العرش',gradient:'url("/assets/art58/roombg/r1.jpg?v=r58s")',art:true}),
 img2:Object.freeze({name:'شرفة القمر',gradient:'url("/assets/art58/roombg/r2.jpg?v=r58s")',art:true}),
 img3:Object.freeze({name:'صالة الجيمر',gradient:'url("/assets/art58/roombg/r3.jpg?v=r58s")',art:true}),
 img4:Object.freeze({name:'خيمة الصحراء',gradient:'url("/assets/art58/roombg/r4.jpg?v=r58s")',art:true}),
 img5:Object.freeze({name:'قاعة الفلك',gradient:'url("/assets/art58/roombg/r5.jpg?v=r58s")',art:true}),
 img6:Object.freeze({name:'الأزرق الملكي',gradient:'url("/assets/art67/roombg/royal-blue.jpg?v=r67v")',art:true}),
 img7:Object.freeze({name:'القاعة الزمردية',gradient:'url("/assets/art67/roombg/emerald.jpg?v=r67v")',art:true}),
 img8:Object.freeze({name:'قصر الجليد',gradient:'url("/assets/art67/roombg/ice.jpg?v=r67v")',art:true}),
 img9:Object.freeze({name:'حديقة الورود',gradient:'url("/assets/art67/roombg/roses.jpg?v=r67v")',art:true}),
 img10:Object.freeze({name:'قاعة المجرة',gradient:'url("/assets/art67/roombg/galaxy-hall.jpg?v=r67v")',art:true}),
 img11:Object.freeze({name:'القصر الكوني',gradient:'url("/assets/art67/roombg/cosmic-palace.jpg?v=r67v")',art:true}),
 img12:Object.freeze({name:'الممر الأزرق',gradient:'url("/assets/art67/roombg/blue-carpet.jpg?v=r67v")',art:true}),
 img13:Object.freeze({name:'عرش الياقوت',gradient:'url("/assets/art67/roombg/ruby-throne.jpg?v=r67v")',art:true}),
 img14:Object.freeze({name:'قاعة التنانين',gradient:'url("/assets/art67/roombg/dragon-hall.jpg?v=r67v")',art:true}),
 img15:Object.freeze({name:'عرين الحمم',gradient:'url("/assets/art67/roombg/lava-dragon.jpg?v=r67v")',art:true}),
 img16:Object.freeze({name:'كنز التنين الذهبي',gradient:'url("/assets/art67/roombg/gold-dragon.jpg?v=r67v")',art:true}),
 img17:Object.freeze({name:'عرش الأسود',gradient:'url("/assets/art67/roombg/lion-throne.jpg?v=r67v")',art:true}),
 dusk:Object.freeze({name:'عاجي وذهبي',gradient:'radial-gradient(ellipse at 80% 15%,#e8c98755,transparent 65%),linear-gradient(145deg,#fcf9f4,#f4eee6 60%,#e6ddf3)',legacy:true})
});
const valid=v=>Object.prototype.hasOwnProperty.call(ROOM_THEMES,v);
export const themeName=id=>valid(id)?ROOM_THEMES[id].name:ROOM_THEMES.royal.name;
const BG_LEVEL={img10:3,img11:5,img12:6,img13:8},BG_STORE={img14:1,img15:1,img16:1,img17:1};
export function themeCards(selected,level=1){const current=selected==='gold'?'royal':selected==='dusk'?'amethyst':selected;return `<div class="so-room-theme-grid" role="radiogroup" aria-label="خلفية البث">${Object.entries(ROOM_THEMES).filter(([,p])=>!p.legacy).map(([id,p])=>`<button type="button" class="so-room-theme-card" data-so-action="room-theme" data-theme="${id}" role="radio" aria-checked="${current===id}" style="background-image:${p.gradient.replace(/"/g,'\'')};background-size:cover;background-position:center"><span>${p.name}</span>${BG_LEVEL[id]&&level<BG_LEVEL[id]?`<em class="so-theme-lock">🔒 Lv${BG_LEVEL[id]}</em>`:BG_STORE[id]&&current!==id?'<em class="so-theme-lock is-store">🛒 المتجر</em>':''}</button>`).join('')}</div><p class="so-note">ألوان لعبك المعتمدة: الزمردي والعاجي والذهبي. محفوظة للغرفة ولا تغيّر صور المستخدم أو مقتنيات الحساب.</p>`;}
export function applyRoomTheme(stage,id,gameBound){if(!stage||gameBound)return;const key=valid(id)?id:'royal';stage.dataset.soRoomTheme=key;stage.style.setProperty('--so-room-theme',ROOM_THEMES[key].gradient);}
export function seatLockCards(council){
 const members=Array.isArray(council?.members)?council.members:[],occupied=new Set(members.map(m=>m.seatIndex).filter(Number.isInteger)),locks=new Set(council?.lockedSeats||[]);
 return `<p class="so-note">المقاعد المشغولة لا تُقفل. التغيير على هذا المجلس فقط بعد تحقق الخادم.</p><div class="so-seat-lock-grid" role="group" aria-label="قفل المقاعد الفارغة">${Array.from({length:council?.seats||0},(_,i)=>`<button type="button" data-so-action="seat-lock" data-seat-index="${i}" aria-pressed="${locks.has(i)}" ${occupied.has(i)?'disabled':''}><b>${i+1}</b><span>${occupied.has(i)?'مشغول':locks.has(i)?'مقفل':'مفتوح'}</span></button>`).join('')}</div>`;
}
