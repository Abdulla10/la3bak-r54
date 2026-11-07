export const ROOM_THEMES=Object.freeze({
 royal:Object.freeze({name:'زمردي وعاجي',gradient:'linear-gradient(155deg,#d4e4d8 0%,#f6f1e5 58%,#bdd4c5 100%)'}),
 amethyst:Object.freeze({name:'عاجي وذهبي',gradient:'radial-gradient(ellipse at 80% 15%,#e8c98755,transparent 65%),linear-gradient(145deg,#fffaf0,#f6f1e5 60%,#d4e4d8)'}),
 gold:Object.freeze({name:'زمردي وعاجي',gradient:'linear-gradient(155deg,#d4e4d8 0%,#f6f1e5 58%,#bdd4c5 100%)',legacy:true}),
 dusk:Object.freeze({name:'عاجي وذهبي',gradient:'radial-gradient(ellipse at 80% 15%,#e8c98755,transparent 65%),linear-gradient(145deg,#fffaf0,#f6f1e5 60%,#d4e4d8)',legacy:true})
});
const valid=v=>Object.prototype.hasOwnProperty.call(ROOM_THEMES,v);
export const themeName=id=>valid(id)?ROOM_THEMES[id].name:ROOM_THEMES.royal.name;
export function themeCards(selected){const current=selected==='gold'?'royal':selected==='dusk'?'amethyst':selected;return `<div class="so-room-theme-grid" role="radiogroup" aria-label="خلفية البث">${Object.entries(ROOM_THEMES).filter(([,p])=>!p.legacy).map(([id,p])=>`<button type="button" class="so-room-theme-card" data-so-action="room-theme" data-theme="${id}" role="radio" aria-checked="${current===id}" style="background-image:${p.gradient}"><span>${p.name}</span></button>`).join('')}</div><p class="so-note">ألوان لعبك المعتمدة: الزمردي والعاجي والذهبي. محفوظة للغرفة ولا تغيّر صور المستخدم أو مقتنيات الحساب.</p>`;}
export function applyRoomTheme(stage,id,gameBound){if(!stage||gameBound)return;const key=valid(id)?id:'royal';stage.dataset.soRoomTheme=key;stage.style.setProperty('--so-room-theme',ROOM_THEMES[key].gradient);}
export function seatLockCards(council){
 const members=Array.isArray(council?.members)?council.members:[],occupied=new Set(members.map(m=>m.seatIndex).filter(Number.isInteger)),locks=new Set(council?.lockedSeats||[]);
 return `<p class="so-note">المقاعد المشغولة لا تُقفل. التغيير على هذا المجلس فقط بعد تحقق الخادم.</p><div class="so-seat-lock-grid" role="group" aria-label="قفل المقاعد الفارغة">${Array.from({length:council?.seats||0},(_,i)=>`<button type="button" data-so-action="seat-lock" data-seat-index="${i}" aria-pressed="${locks.has(i)}" ${occupied.has(i)?'disabled':''}><b>${i+1}</b><span>${occupied.has(i)?'مشغول':locks.has(i)?'مقفل':'مفتوح'}</span></button>`).join('')}</div>`;
}
