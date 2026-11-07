/* Vehicle entrances are 2D cosmetic assets, not a 3D runtime.
 * Only server-verified public member snapshots can trigger them. */
export const ENTRANCE_ART = Object.freeze({
  'entrance-sport':'/assets/store-r23/entrance-sport.webp',
  'entrance-royal':'/assets/store-r23/entrance-royal.webp',
});
export function createEntranceFX({getHost,getScope,now=()=>Date.now()}={}) {
  let scope='',seen=new Map(),initialized=false,active=null,timer=null,disposed=false;
  const clear=()=>{clearTimeout(timer);timer=null;active?.remove();active=null;};
  const cancel=()=>{clear();scope='';seen=new Map();initialized=false;};
  function show(member) {
    if(disposed||document.hidden)return false;
    const item=member?.entrance,src=ENTRANCE_ART[item?.id],target=getHost?.();
    if(!src||item?.art!==src||!target?.isConnected)return false;
    clear();
    const node=document.createElement('div');node.className='r23-entrancefx';node.dataset.entranceId=item.id;node.dataset.entranceMember=String(member.id);node.setAttribute('role','status');node.setAttribute('aria-live','polite');
    const image=document.createElement('img');image.src=src;image.alt='';image.decoding='async';
    const label=document.createElement('span');label.textContent='وصل '+String(member.name||'عضو الغرفة');
    node.append(image,label);target.append(node);active=node;
    image.addEventListener('error',clear,{once:true});
    timer=setTimeout(clear,4300);return true;
  }
  return {
    sync(snapshot) {
      if(disposed)return;
      const nextScope=String(getScope?.()||''),current=snapshot?.current;
      if(!nextScope||current?.roomId!==nextScope||snapshot?.room?.id!==nextScope){cancel();return;}
      if(nextScope!==scope){cancel();scope=nextScope;}
      const members=Array.isArray(snapshot?.room?.members)?snapshot.room.members:[],fresh=new Map();
      for(const m of members) {
        if(!m?.id)continue;
        const join=Number.isSafeInteger(m.joinedAt)?m.joinedAt:0;
        fresh.set(String(m.id),join);
        const previous=seen.get(String(m.id));
        // A reload sees existing members but never replays their entrances.
        // A reconnect preserves joinedAt and therefore cannot trigger again.
        if(initialized&&join>0&&(previous===undefined||previous!==join)&&now()-join>=0&&now()-join<15000)show(m);
      }
      seen=fresh;initialized=true;
    },
    restore() {if(active&&!disposed){const host=getHost?.();if(host?.isConnected&&!active.isConnected)host.append(active);}},
    cancel,
    destroy(){disposed=true;cancel();},
  };
}
