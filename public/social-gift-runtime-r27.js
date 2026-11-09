import {createSocialGift3D} from './gift3d-r27.js?v=complete-r46';
import {resolveGiftAsset,giftArtwork} from './gift-assets-r27.js?v=unique-r36';
import {safeGiftArt} from './gift-reward-ui.js?v=r63a';
const scoped=(c,meta)=>!!c&&!c.ctx?.gameRoom&&c.snapshot?.current?.roomId===c.routeRoom&&c.snapshot?.current?.councilId&&meta?.roomId===c.routeRoom&&meta?.councilId===c.snapshot.current.councilId;
const scopeOf=c=>({accountId:String(c.uid),roomId:c.routeRoom,councilId:c.snapshot.current.councilId});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function attachGiftRuntime(c,workspace){
 const current=c?.snapshot?.current;
 if(!workspace||c.ctx?.gameRoom||!current?.councilId||current.roomId!==c.routeRoom){clearGiftRuntime(c);return;}
 if(!c.giftSettingsReady&&!c.giftSettingsLoading){
  if(typeof c.ctx.refreshAccountSettings!=='function')c.giftSettingsReady=true;
  else{c.giftSettingsLoading=true;const uid=c.uid;Promise.resolve(c.ctx.refreshAccountSettings()).then(settings=>{if(c.uid!==uid||typeof settings?.hideChatEffects!=='boolean')return;c.ctx.accountSettings=settings;c.giftSettingsReady=true;c.notify();}).catch(()=>{}).finally(()=>{c.giftSettingsLoading=false;});}
 }
 if(!c.giftFxHost){c.giftFxHost=document.createElement('div');c.giftFxHost.dataset.soGiftFxHost='';c.giftFxHost.className='so-gift-fx-layer';}
 workspace.append(c.giftFxHost);
 if(!c.giftFx){c.giftFx=createSocialGift3D({host:c.giftFxHost,ownerId:String(c.snapshot.selfId||c.uid),scope:scopeOf(c),resolveAsset:resolveGiftAsset,
  renderFallback:({gift,event,container,reason})=>{const node=document.createElement('div');node.className='so-gift-2d-art';const art=giftArtwork(gift)||safeGiftArt(gift)||'';node.innerHTML=art;if(!art)node.textContent=gift.name||'هدية';container.append(node);if(reason==='missing-asset'&&c.giftFx?.active)c.giftFx.active.status.textContent=`${event.from?.name||'عضو'} أرسل ${gift.name||'هدية'} ×${event.qty} إلى ${event.to?.name||'عضو'}`;},
  onState:state=>{if(state.state==='ready'&&c.giftFx?.active){const a=c.giftFx.active,e=a.event;a.status.textContent=`${e.from?.name||'عضو'} أرسل ${e.gift?.name||'هدية'} ×${e.qty} إلى ${e.to?.name||'عضو'}`;}}
 });}
 else c.giftFx.setScope(scopeOf(c));
}
export function receiveGiftRuntime(c,ev,meta){
 if(meta?.dup||!scoped(c,meta)||!ev?.tx||!ev.gift||ev.from?.id===ev.to?.id)return false;
 if(c.giftSettingsLoading||!c.giftSettingsReady)return false;
 if(c.ctx?.hideChatEffects||c.ctx?.accountSettings?.hideChatEffects){c.giftFx?.clear('effects-disabled');return false;}
 if(!c.giftFx||!c.giftFxHost?.isConnected)return false;
 return c.giftFx.acceptConfirmed({...ev,scope:scopeOf(c)},{historical:meta.historical===true});
}
export function clearGiftRuntime(c){if(!c)return;c.giftFx?.destroy();c.giftFx=null;c.giftFxHost?.remove();c.giftFxHost=null;}
export function giftRuntimeMetrics(c){return c?.giftFx?.metrics()||{state:'idle',contexts:0,queue:0};}
export {giftArtwork};
