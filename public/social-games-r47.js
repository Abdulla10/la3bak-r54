/* Council-only games. No account, transport, timer service or wallet is created here. */
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export const SOCIAL_GAME_LABELS_R47={
 'draw-story':['حكاية بخط واحد','ارسموا حكاية جماعية بالأدوار ثم اختاروا عنوانًا. لا تحليل أو جوائز.'],
 'word-guess':['خمن الكلمة','متحدث يختار سرًا وتلميحًا معتمدًا، والآخرون يخمنون. نقاط لهذه الجلسة فقط.'],
 'memory-challenge':['تحدي الذاكرة','شاهد ترتيب الرموز ثم استرجعه في ثلاث جولات. مجموع جلسة لا رصيد.'],
};
const PHASES={lobby:'بانتظار مشاركة اختيارية',drawing:'الرسم بالأدوار',titles:'عناوين خاصة حتى إغلاق النافذة',voting:'تصويت نهائي دون تصويت ذاتي',choosing:'المتحدث يختار سرًا',hinting:'المتحدث يختار تلميحًا',guessing:'التخمين مفتوح',revealed:'نتيجة الدور',showing:'احفظ الترتيب من اليمين إلى اليسار',recalling:'الرموز مخفية: أدخل الترتيب',result:'نتيجة الجولة',finished:'انتهت الجلسة',cancelled:'أُلغيت الجلسة — لا نتيجة جديدة'};
/** Existing social controller handles data-so-action=mode-action and data-so-form=mode. */
export function renderSocialGame(mode,view,{esc=escapeHTML,nameOf=id=>String(id??'عضو')}={}){
 if(!SOCIAL_GAME_LABELS_R47[mode])return '';
 if(!view||view.unavailable)return '<p class="sg47-note">اللعبة غير متاحة في مجلسك الحالي.</p>';
 const p=view.permissions||{},v=Number(view.version),phase=view.phase;
 const action=(type,label,fields={})=>`<button type="button" class="so-button" data-so-action="mode-action" data-mode="${mode}" data-payload="${esc(JSON.stringify({type,version:v,...fields}))}">${esc(label)}</button>`;
 const form=(type,body,label)=>`<form class="so-form sg47-form" data-so-form="mode" data-mode="${mode}" data-type="${type}"><input type="number" name="version" value="${v}" hidden>${body}<button class="so-button so-primary" type="submit">${esc(label)}</button></form>`;
 let body=`<p class="sg47-note">المشاركة اختيارية · 2–6 أعضاء · بلا Coins أو Gems أو XP أو جوائز.</p><div class="sg47-actions">${p.participate?action('participate','أرغب بالمشاركة',{enabled:true}):''}${p.withdraw?action('participate','الانسحاب',{enabled:false}):''}${p.start?action('start','بدء جلسة جديدة'):''}${p.cancel?action('cancel','إلغاء الجلسة'):''}</div><p role="status">${esc(PHASES[phase]||phase)} · ${Number(view.participants?.length)||0} مشاركين</p>`;
 if(view.deadline)body+=`<p class="sg47-note">نهاية المرحلة وفق الخادم: <time datetime="${new Date(view.deadline).toISOString()}">${esc(new Date(view.deadline).toLocaleTimeString('ar'))}</time> · مدة متبقية عند التحديث ${Math.max(0,Math.ceil((view.deadline-view.serverNow)/1000))} ثانية</p>`;
 if(view.memberId)body+=`<p>دور ${esc(nameOf(view.memberId))}</p>`;
 if(mode==='draw-story'){
  body+=`<p>${esc(view.prompt||'كل مشارك يرسم خطًا واحدًا متصلًا أو يمرر دوره خلال 20 ثانية.')}</p>${drawStorySvgR47(view.strokes||[])}<p class="sg47-note">عنوان اختياري خلال 15 ثانية ثم تصويت 10 ثوانٍ. التعادل يبقى مشتركًا.</p>`;
  if(p.stroke)body+=`<div class="sg47-draw" data-sg47-draw data-version="${v}" data-turn="${Number(view.round)}" data-session="${esc(view.sessionId)}"><label>لون الخط<select data-sg47-color><option value="#065f46">زمردي</option><option value="#c9a84c">ذهبي</option><option value="#fff9e8">عاجي</option></select></label><canvas data-sg47-canvas width="640" height="360" aria-label="ارسم خطًا واحدًا متصلًا" tabindex="0"></canvas><p class="sg47-note">رفع القلم يرسل خطك وينهي دورك. بديل دون رسم:</p>${action('pass','تمرير الدور',{turn:Number(view.round)})}</div>`;
  if(p.title)body+=form('title','<label>عنوانك الخاص<input name="text" maxlength="40" required autocomplete="off"></label>','إرسال عنوان واحد');
  if(view.hasTitle&&phase==='titles')body+='<p>حُفظ عنوانك؛ لا تظهر العناوين قبل إغلاق النافذة.</p>';
  if(phase==='voting')body+=`<div class="sg47-options">${(view.titles||[]).map(t=>t.canVote?action('vote',t.text,{titleId:t.id}):`<span>${esc(t.text)}</span>`).join('')}</div>${view.hasVoted?'<p>حُفظ صوتك النهائي.</p>':''}`;
  if(view.result)body+=`<div class="sg47-result"><h4>الحكاية الجماعية</h4>${view.result.winners?.length?`<p>العنوان${view.result.winners.length>1?'ات المتعادلة':' المختار'}: ${view.result.titles.filter(t=>view.result.winners.includes(t.id)).map(t=>esc(t.text)).join(' · ')}</p>`:'<p>حكاية بلا عنوان مختار</p>'}${view.result.titles.map(t=>`<p>${esc(t.text)} · ${t.votes} أصوات</p>`).join('')}</div>`;
 }
 if(mode==='word-guess'){
  body+='<p class="sg47-note">اختيار وتلميح: 15 ثانية لكل مرحلة؛ تخمين: 30 ثانية، مرة في الثانية وحتى 20 محاولة. نتيجة الدور 5 ثوانٍ ثم ينتقل الدور.</p>';
  if(p.choose)body+=`<div class="sg47-options">${(view.choices||[]).map(c=>action('choose',c.text,{choiceId:c.id})).join('')}</div>`;
  if(view.ownSecret)body+=`<p class="sg47-private">كلمتك الخاصة: ${esc(view.ownSecret)} — لا يراها غيرك الآن.</p>`;
  if(p.hint)body+=`<div class="sg47-options">${(view.hintChoices||[]).map(h=>action('hint',h.text,{hintIndex:h.index})).join('')}</div>`;
  if(view.hint)body+=`<blockquote>${esc(view.hint)}</blockquote>`;
  if(p.guess)body+=form('guess','<label>تخمينك<input name="text" maxlength="60" required autocomplete="off"></label>','تخمين');
  if(view.ownGuess)body+=`<p>آخر تخمين لك: ${esc(view.ownGuess.text)} · ${view.ownGuess.attempts}/20</p>`;
  if(p.pass)body+=action('pass','تمرير دون إجبار');
  if(view.result)body+=`<div class="sg47-result">${view.result.answer?`الكلمة: ${esc(view.result.answer)}`:'لم تُختر كلمة.'} · ${view.result.matchedBy?'تخمين صحيح':'انتهى الدور دون تخمين صحيح'}</div>`;
 }
 if(mode==='memory-challenge'){
  body+='<p class="sg47-note">3 جولات من 3 ثم 4 ثم 5 رموز. عرض 5 ثوانٍ، استرجاع 15 ثانية، نتيجة 5 ثوانٍ. نقطة جلسة لكل موضع صحيح.</p>';
  if(phase==='showing')body+=`<ol class="sg47-sequence">${(view.symbols||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`;
  if(phase==='recalling')body+=`<p>أدخل ${Number(view.symbolCount)} رموز بالترتيب دون تكرار. لن تظهر الإجابات قبل نهاية المهلة.</p>`;
  if(p.submit)body+=`<form class="so-form sg47-form" data-so-form="mode" data-mode="memory-challenge" data-type="submit"><input name="version" type="number" value="${v}" hidden><input name="round" type="number" value="${Number(view.round)}" hidden>${Array.from({length:Number(view.symbolCount)},(_,i)=>`<label>الموضع ${i+1}<select name="symbol${i}" required><option value="">اختر الرمز</option>${(view.palette||[]).map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select></label>`).join('')}<button class="so-button so-primary" type="submit">حفظ الترتيب النهائي</button></form>`;
  if(view.hasSubmitted)body+='<p>حُفظ ترتيبك. انتظر نهاية المهلة؛ لا تعديل بعد الإرسال.</p>';
  if(view.result)body+=`<div class="sg47-result"><p>الترتيب الصحيح: ${view.result.sequence.map(esc).join(' ← ')}</p>${view.result.players.map(t=>`<p>${esc(nameOf(t.actorId))}: ${t.correct} مواضع صحيحة${t.perfect?' · ترتيب كامل':''}</p>`).join('')}</div>`;
 }
 if(view.scores?.length)body+=`<section class="sg47-scores" aria-label="نقاط الجلسة فقط"><h4>مجموع هذه الجلسة فقط</h4>${view.scores.map(t=>`<p>${esc(nameOf(t.actorId))} · ${Number(t.score)}</p>`).join('')}${phase==='finished'?(view.winners?.length?`<p>المتصدر${view.winners.length>1?'ون بالتعادل':''}: ${view.winners.map(t=>esc(nameOf(t.actorId))).join(' · ')}</p>`:'<p>لا متصدر دون نقاط.</p>'):''}</section>`;
 if(p.tick)body+=action('tick','تحديث المرحلة من ساعة الخادم');
 return `<div class="sg47-game" data-sg47-game="${mode}">${body}</div>`;
}
/** Existing form handler calls this AFTER collecting its own numeric/checkbox/text fields. */
export function normalizeSocialGameActionR47(mode,action){
 if(!SOCIAL_GAME_LABELS_R47[mode])return action;
 const out={...action};
 if(mode==='memory-challenge'&&action.type==='submit'){
  out.sequence=Object.keys(out).filter(k=>/^symbol\d+$/.test(k)).sort((a,b)=>Number(a.slice(6))-Number(b.slice(6))).map(k=>out[k]);
  for(const key of Object.keys(out))if(/^symbol\d+$/.test(key))delete out[key];
 }
 return out;
}
export function drawStorySvgR47(strokes){
 const colors=['#065f46','#fff9e8','#c9a84c'];
 const lines=(Array.isArray(strokes)?strokes:[]).slice(0,6).filter(s=>colors.includes(s.color)&&Array.isArray(s.points)&&s.points.length<=128).map(s=>{
  const ps=s.points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);
  if(ps.length===1)return `<circle cx="${ps[0].x*640}" cy="${ps[0].y*360}" r="2.5" fill="${s.color}"/>`;
  return `<polyline points="${ps.map(p=>`${p.x*640},${p.y*360}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
 }).join('');
 return `<svg class="sg47-board" viewBox="0 0 640 360" role="img" aria-label="الحكاية المرسومة بخط لكل مشارك">${lines}</svg>`;
}
/** One mount per existing council controller; parent calls refresh() after paint and destroy() on teardown. */
export function createSocialGamesR47({getSnapshot,getCouncil,send,onError=()=>{}}){
 let host=null,detach=()=>{},destroyed=false,pending=false;
 function refresh(nextHost){
  detach();host=nextHost;if(destroyed||!host)return;
  const root=host.querySelector('[data-sg47-draw]'),canvas=root?.querySelector('[data-sg47-canvas]');if(!canvas)return;
  let pointer=null,points=[],version=null,turn=null,scope=null,color=null;
  const context=()=>{
   const s=getSnapshot(),c=getCouncil(),cur=s?.current;
   return cur?.roomId===s?.room?.id&&cur?.councilId===c?.id?{roomId:cur.roomId,councilId:cur.councilId,view:c.modes?.['draw-story']}:null;
  };
  const draw=()=>{const g=canvas.getContext('2d');if(!g)return;g.clearRect(0,0,canvas.width,canvas.height);g.strokeStyle=color;g.lineWidth=4;g.lineCap='round';g.lineJoin='round';g.beginPath();points.forEach((p,i)=>i?g.lineTo(p.x*640,p.y*360):g.moveTo(p.x*640,p.y*360));g.stroke();};
  const point=e=>{const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;return {x:Math.round(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*10000)/10000,y:Math.round(Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))*10000)/10000};};
  const down=e=>{
   const ctx=context();if(pending||pointer!==null||!ctx?.view?.permissions?.stroke||ctx.view.version!==Number(root.dataset.version))return;
   if(e.button!==undefined&&e.button!==0)return;
   const p=point(e);if(!p)return;e.preventDefault();pointer=e.pointerId;version=ctx.view.version;turn=ctx.view.round;scope={roomId:ctx.roomId,councilId:ctx.councilId};points=[p];color=root.querySelector('[data-sg47-color]').value;canvas.setPointerCapture?.(pointer);draw();
  };
  const move=e=>{if(pointer!==e.pointerId||points.length>=128)return;e.preventDefault();const p=point(e);if(p){points.push(p);draw();}};
  const up=async e=>{
   if(pointer!==e.pointerId)return;pointer=null;
   const ctx=context();if(!ctx||ctx.roomId!==scope.roomId||ctx.councilId!==scope.councilId){points=[];return;}
   pending=true;
   try{const result=await send('mode:action',{...scope,mode:'draw-story',action:{type:'stroke',version,turn,color,points:points.map(p=>({...p}))}});if(result?.ok===false)throw Error(result.error||'تعذر حفظ الخط.');}
   catch(error){onError(error.message||'تعذر حفظ الخط.');}finally{pending=false;points=[];}
  };
  const cancel=()=>{pointer=null;points=[];draw();};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
  detach=()=>{pointer=null;canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);};
 }
 return {refresh,destroy(){destroyed=true;detach();host=null;}};
}
