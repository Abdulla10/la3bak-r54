/* R25 social VOICE-room presentation only. No API, gift economics or match engine.
 * Input is an explicit display model mapped by unified/social.js from the verified
 * backend contract. All identities, totals and results remain server-owned. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr = value => Array.isArray(value) ? value : [];
const integer = value => Number.isSafeInteger(value) && value >= 0;
const valueHTML = value => integer(value) ? value.toLocaleString('ar') : '—';
const glyph = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${name==='cannon'?'M4 14h10l5-5-3-3-5 5H4zM6 14l-2 6M13 14l2 6M19 3l2-2M21 7h2':'M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3ZM12 8h4a3 3 0 1 0-3-3l-1 3Z'}"/></svg>`;

/** Only canonical team totals affect the shared bar; no local gift prediction. */
export function scoreShares(blue, red) {
  if (!integer(blue) || !integer(red)) return { valid:false, blue:.5, red:.5 };
  const max=Math.max(blue,red);
  if (max===0) return { valid:true, blue:.5, red:.5 };
  const b=blue/max,r=red/max,share=b/(b+r);
  return { valid:true, blue:share, red:1-share };
}

/** Reuse only the animated meter, while new labels/clock remain canonical. */
export function preserveScorebar(previous, next, scopeMatches=true) {
  if (!scopeMatches || !previous || !next) return false;
  const oldMeter=previous.querySelector('[data-so-score-meter]'),newMeter=next.querySelector('[data-so-score-meter]');
  const oldFill=oldMeter?.querySelector('[data-so-score-fill="blue"]'),newFill=newMeter?.querySelector('[data-so-score-fill="blue"]');
  if (!oldFill || !newFill || oldMeter.dataset.soScoreMeter!==newMeter.dataset.soScoreMeter) return false;
  const target=newFill.style.transform;
  for (const attribute of [...newMeter.attributes]) if (oldMeter.getAttribute(attribute.name)!==attribute.value) oldMeter.setAttribute(attribute.name,attribute.value);
  newMeter.replaceWith(oldMeter);
  if (oldFill.style.transform!==target) {
    oldFill.getBoundingClientRect(); // Commit the current rendered position, then retarget.
    oldFill.style.transform=target;
  }
  return true;
}

export function countdown(endsAt, now) {
  if (!Number.isFinite(endsAt) || !Number.isFinite(now)) return { text:'—', waiting:false };
  const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return {text:`${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`, waiting:seconds === 0};
}

/** Enforce actual current membership again immediately before a setup submit. */
export function validateTeams(teams, members) {
  const allowed = new Set(arr(members).filter(m => m?.id != null).map(m => String(m.id)));
  const seen = new Set();
  const result = {};
  for (const key of ['blue','red']) {
    const values = arr(teams?.[key]);
    if (values.length < 1 || values.length > 5) throw Error('اختر من عضو واحد إلى خمسة أعضاء لكل فريق.');
    result[key] = values.map(value => {
      const id = String(value ?? '');
      if (!allowed.has(id)) throw Error('تغير أعضاء المجلس؛ اختر أعضاء موجودين في مجلسك الحالي.');
      if (seen.has(id)) throw Error('لا يمكن اختيار العضو في أكثر من فريق أو تكراره.');
      seen.add(id);return id;
    });
  }
  return result;
}

function participantHTML(person, { renderMember, leader=false, active=false }={}) {
  if (!person?.member?.id || typeof person.member.name !== 'string' || !person.member.name.trim()) return '';
  const id = String(person.member.id);
  const rawPortrait = typeof renderMember === 'function' ? renderMember(person.member) : `<span class="so-challenge-name" dir="auto">${esc(person.member.name)}</span>`;
  // At most ten canonical challenge portraits: eager loading avoids WebKit
  // deferring avatars inside the clipped/scrollable board until it is scrolled.
  const portrait = typeof rawPortrait === 'string' ? rawPortrait.replace(/\bloading=["']lazy["']/g, 'loading="eager"') : '';
  return `<article class="so-challenge-person${leader?' is-leader':''}" data-so-challenge-person="${esc(id)}"${leader?' aria-label="قائد الفريق"':''}><div class="so-challenge-person-head">${portrait}<span class="so-challenge-value" data-so-challenge-value="${esc(id)}" title="مجموع قيمة الهدايا المستلمة خلال هذا التحدي" aria-label="مجموع قيمة الهدايا المستلمة خلال هذا التحدي: ${esc(valueHTML(person.value))}">${glyph('gift')}<b>${valueHTML(person.value)}</b></span></div><button type="button" class="so-challenge-support" data-so-action="challenge-support" data-id="${esc(id)}" aria-label="دعم ${esc(person.member.name)} بهدية" ${active&&person.canSupport===true?'':'disabled'}>${glyph('gift')}<span>دعم</span></button></article>`;
}

// Formation slots are not room seats, never participants, and never actionable.
function formationSlotHTML(leader=false) {
  return `<div class="so-challenge-unassigned${leader?' is-leader':''}" data-so-challenge-formation="unassigned" role="img" aria-disabled="true" aria-label="غير مشارك في التحدي؛ التشكيلة ثابتة"><span class="so-challenge-formation-circle" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="10" width="12" height="10" rx="2"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></svg></span></div>`;
}

function teamHTML(team, renderMember, active) {
  const members = arr(team?.people).filter(p=>p?.member?.id&&typeof p.member.name==='string'&&p.member.name.trim()).slice(0,5);
  const leader = members.find(p => String(p.member.id) === String(team?.leaderId)) || members[0];
  const rest = members.filter(p => p !== leader);
  return `<section class="so-challenge-team so-challenge-team-${team.key}" aria-label="${team.key==='blue'?'الفريق الأزرق':'الفريق الأحمر'}">${leader?participantHTML(leader,{renderMember,leader:true,active}):formationSlotHTML(true)}<div class="so-challenge-participants">${Array.from({length:4},(_,i)=>rest[i]?participantHTML(rest[i],{renderMember,active}):formationSlotHTML()).join('')}</div></section>`;
}

export function renderChallenge(model, {renderMember, now=Date.now()}={}) {
  if (!model || model.available !== true || !model.challenge?.id) return '';
  const challenge = model.challenge, teams = arr(challenge.teams);
  const blue = teams.find(t=>t.key==='blue'), red = teams.find(t=>t.key==='red');
  if (!blue || !red || !['active','settling','ended','cancelled'].includes(challenge.status)) return '';
  const running = challenge.status==='active', timer=countdown(challenge.endsAt,now);
  const waiting = challenge.status==='settling'||running && timer.waiting;
  const status = challenge.status==='cancelled'?'تم إلغاء التحدي':challenge.status==='ended'?'انتهى التحدي':waiting?'بانتظار نتيجة الخادم':'تحدي الغرفة';
  const shares=scoreShares(blue.total,red.total);
  const meter=`<div class="so-challenge-meter" data-so-score-meter="${esc(challenge.id)}" data-blue-share="${shares.blue}" data-red-share="${shares.red}" data-so-score-valid="${shares.valid}" role="img" aria-label="مجموع دعم الأزرق ${esc(valueHTML(blue.total))}، والأحمر ${esc(valueHTML(red.total))}"><span class="so-challenge-blue-fill" data-so-score-fill="blue" style="transform:scaleX(${shares.blue})"></span></div>`;
  return `<section class="so-challenge" data-so-challenge="${esc(challenge.id)}" data-so-challenge-status="${esc(challenge.status)}" aria-label="تحدي دعم الفريقين بالهدايا"><header class="so-challenge-heading"><span class="so-challenge-sr" role="status">${status}</span>${running&&model.canCancel===true?'<button type="button" class="so-challenge-cancel" data-so-action="challenge-cancel" aria-label="إلغاء التحدي">إلغاء</button>':''}</header><div class="so-challenge-scorebar" data-so-scorebar dir="ltr">${meter}<div class="so-challenge-total so-challenge-total-blue" dir="rtl"><span class="so-challenge-sr">الفريق الأزرق</span><b data-so-challenge-total="blue">${valueHTML(blue.total)}</b></div><div class="so-challenge-total so-challenge-total-red" dir="rtl"><span class="so-challenge-sr">الفريق الأحمر</span><b data-so-challenge-total="red">${valueHTML(red.total)}</b></div></div><div class="so-challenge-clock" dir="ltr"><time data-so-challenge-countdown="${esc(challenge.endsAt ?? '')}">${running?timer.text:'—'}</time><span class="so-challenge-pk" aria-hidden="true">PK</span><small class="so-challenge-sr" data-so-challenge-timer-status dir="rtl">${waiting?'بانتظار النتيجة':running?'الوقت المتبقي':'حالة مؤكدة'}</small></div><div class="so-challenge-teams" dir="ltr">${teamHTML(blue,renderMember,running&&!waiting)}${teamHTML(red,renderMember,running&&!waiting)}</div>${challenge.status==='ended'&&typeof challenge.resultText==='string'&&challenge.resultText.trim()?`<p class="so-challenge-result" role="status">${esc(challenge.resultText)}</p>`:''}</section>`;
}

export function renderSetup(members) {
  const seen = new Set();
  const actual = arr(members).filter(m=>m?.id!=null&&typeof m.name==='string'&&m.name.trim()&&!seen.has(String(m.id))&&seen.add(String(m.id)));
  return `<p class="so-note">اختر أعضاء مجلسك الحالي: من ١ إلى ٥ لكل فريق، دون تكرار. أول عضو مختار في كل فريق هو القائد. مدة التحدي ٣ دقائق؛ التشكيلة ثابتة بعد البدء.</p><div class="so-challenge-setup">${actual.map(m=>`<label class="so-challenge-pick"><span dir="auto">${esc(m.name)}</span><select data-so-challenge-pick="${esc(m.id)}" aria-label="فريق ${esc(m.name)}"><option value="">دون فريق</option><option value="blue">الفريق الأزرق</option><option value="red">الفريق الوردي</option></select></label>`).join('')||'<p class="so-note">لا يوجد أعضاء حاليون ظاهرون للاختيار.</p>'}</div><p class="so-note">زر الدعم يفتح الهدايا للمشارك المحدد. لا يرسل هدية ولا يحجز مقعدًا تلقائيًا.</p>`;
}

function safeFeed(event) {
  if (!event || !['gift','cannon'].includes(event.kind) || typeof event.id!=='string' || !event.id || !Number.isFinite(event.ts) || typeof event.text!=='string' || !event.text.trim()) return null;
  return {id:event.id,ts:event.ts,kind:event.kind,text:event.text};
}
export function renderMarquee(event) {
  const actual=safeFeed(event);
  return `<div class="so-challenge-marquee" data-so-challenge-marquee ${actual?'tabindex="0"':'hidden'} role="status" aria-live="polite">${actual?`<span class="so-challenge-marquee-icon">${glyph(actual.kind)}</span><span class="so-challenge-marquee-window"><span class="so-challenge-marquee-track" data-so-feed-id="${esc(actual.id)}" data-so-feed-kind="${actual.kind}" dir="rtl">${esc(actual.text)}</span></span>`:''}</div>`;
}

/** Live real-event queue, primed from history without replaying it on room entry. */
export function createFeedQueue({clock=()=>Date.now(),lifetime=20000,max=120}={}) {
  const seen=new Map();let initialized=false,scope='',since=0,current=null,until=0,queue=[];
  const remember=e=>{seen.set(e.id,e.ts);while(seen.size>max)seen.delete(seen.keys().next().value);};
  function ingest(event) {
    const e=safeFeed(event);if(!initialized||!e||seen.has(e.id))return false;
    remember(e);
    // Do not replay stale history after a reconnect or a long missed poll.
    if(e.ts<=since || e.ts<clock()-lifetime || e.ts>clock()+30000)return false;
    queue.push(e);if(queue.length>8)queue.shift();return true;
  }
  function reset(){initialized=false;scope='';since=0;current=null;until=0;queue=[];seen.clear();}
  return {sync(events,nextScope){if(scope!==nextScope)reset();const actual=arr(events).map(safeFeed).filter(Boolean);if(!initialized){scope=nextScope;since=clock();initialized=true;}else{const authorized=new Set(actual.map(e=>e.id));if(current&&!authorized.has(current.id))current=null;queue=queue.filter(e=>authorized.has(e.id));}for(const e of actual)remember(e);return false;},receive:ingest,
    current(){const now=clock();if(current&&now>=until)current=null;while(!current&&queue.length){const next=queue.shift();if(next.ts+lifetime<=now)continue;current=next;until=next.ts+lifetime;}return current;},reset, get size(){return seen.size;}};
}

/** Parent repaints canonical data; this controller only updates a local clock and
 * actual event marquee without replacing focused chat/composer/gift elements. */
export function createSocialChallenge({getHost,getModel,renderMember,clock=()=>Date.now(),setInterval:interval=globalThis.setInterval,clearInterval:clear=globalThis.clearInterval}={}) {
  const feed=createFeedQueue({clock});let timer=null,disposed=false;
  const now=()=>{const m=getModel?.();return clock()+(Number.isFinite(m?.clockOffset)?m.clockOffset:0);};
  function restore(){
    if(disposed)return;
    const host=getHost?.(),model=getModel?.(),challenge=model?.challenge;
    const board=host?.querySelector?.('[data-so-challenge]');
    const marquee=host?.querySelector?.('[data-so-challenge-marquee]');
    if(!board&&!marquee){if(timer!==null){clear(timer);timer=null;}return;}
    if(timer===null)timer=interval(restore,1000);
    if(board&&challenge?.status==='active'){
      const t=countdown(challenge.endsAt,now());
      const time=board.querySelector('[data-so-challenge-countdown]'),status=board.querySelector('[data-so-challenge-timer-status]');
      if(time)time.textContent=t.text;if(status)status.textContent=t.waiting?'بانتظار نتيجة الخادم':'الوقت المتبقي';
      if(t.waiting)board.querySelectorAll('[data-so-action="challenge-support"]').forEach(button=>button.disabled=true);
    }
    const current=feed.current(),key=current?.id||'';
    // A parent paint uses the current feed markup, so unchanged IDs keep animating.
    if(marquee&&key!==(marquee.querySelector('[data-so-feed-id]')?.dataset.soFeedId||'')){
      marquee.outerHTML=renderMarquee(current);
    }
  }
  return {render(model){return renderChallenge(model,{renderMember,now:now()});},renderFeed(){return renderMarquee(feed.current());},sync(model,scope){if(disposed)return;if(model?.available!==true){feed.reset();return;}feed.sync(model?.feed,scope);},receive(event){if(disposed)return false;const accepted=feed.receive(event);if(accepted)restore();return accepted;},restore,
    reset(){feed.reset();if(timer!==null){clear(timer);timer=null;}},destroy(){disposed=true;feed.reset();if(timer!==null){clear(timer);timer=null;}}};
}
