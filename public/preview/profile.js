import { SEARCH_ICON } from '../unified/search-icon.js?v=global-search-r17';
/* Isolated preview profile. The host owns authentication, fetching and mutations.
 * Only ctx.me is authoritative for stats. VM.playerId is the public player ID:
 * exactly eight ASCII digits, kept as a string to preserve leading zeros.
 * Internal ctx.user.id is used only for per-account UI state, never the ID row.
 * Trusted app renderers: avatarHTML(size), framed(face, frame, size), bgHTML(bg),
 * googleCard(). All ordinary data and bio are escaped. No localStorage writes.
 */
import { framed as shopFramed, bgLayer } from '../shop.js?v=r91';
import { avatarArt } from '../avatars.js?v=r91';
import { renderProfileIcon } from './assets/profile/ui-icons-inline.js?v=r58p';
import { ensureOwnerToolsCss } from '../owner-player-tools.js?v=r91';
import { referenceOf, referenceImage, ACHIEVEMENT_ART, ACHIEVEMENT_ART_KIDS } from '../reference-assets.js?v=r68z31';
import { nav68HTML } from '../nav-r68.js?v=r79';
import { officialBadge } from '../official-badge-r67.js?v=r67as';
import { rankSummary, renderRankOverview } from './rank-overview.js?v=r66b';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const arr = v => Array.isArray(v) ? v : [];
const finite = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const fmt = v => finite(v) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Number(v)) : '—';
const playerID = ctx => {
  const display=ctx.me?.displayPlayerId || ctx.me?.specialPlayerId;
  if (typeof display==='string' && /^[0-9]{1,8}$/.test(display)) return display;
  const original=ctx.playerId || ctx.me?.playerId;
  return typeof original==='string' && /^[0-9]{8}$/.test(original) ? original : '';
};
const specialID = ctx => typeof ctx.me?.specialPlayerId==='string' && /^[1-9][0-9]{0,7}$/.test(ctx.me.specialPlayerId) && playerID(ctx)===ctx.me.specialPlayerId;
// R58l: قالب الأيدي المميز حسب ندرة الأيدي المشترى (رسومات المالك)
const specialTier = ctx => { const v=ctx.me?.specialPlayerId; const it=Array.isArray(ctx.shopData?.items)?ctx.shopData.items.find(i=>i&&i.slot==='special-id'&&String(i.css)===String(v)):null; return ['common','premium','rare','epic','legendary','ultra'].includes(it?.rarity)?it.rarity:'rare'; };
const specialPlate = ctx => { const v=ctx.me?.specialPlayerId; const it=Array.isArray(ctx.shopData?.items)?ctx.shopData.items.find(i=>i&&i.slot==='special-id'&&String(i.css)===String(v)):null; const p=Number(it?.price)||0; return p>=100e6?6:p>=48e6?5:p>=40e6?4:p>=30e6?3:p>=25e6?2:1; };
const SLOTS = ['avatar', 'frame', 'bg', 'title', 'badge'];
const LABEL = {avatar:'الأفتارات',frame:'الإطارات',bg:'الخلفيات',title:'الألقاب',badge:'الشارات',inventory:'المقتنيات',achievements:'الإنجازات'};
const TABS = [['achievements','trophy'],['inventory','crown'],['title','medal'],['badge','shield'],['frame','frame'],['bg','image'],['avatar','person']];
const ART = {ludo:'ludo',baloot:'baloot',jackaro:'jackaro',domino:'domino',carrom:'carrom',uno:'uno',minaboli:'minaboli-3d-r49'};
const states = new Map();
const mounts = new WeakMap();
let activeState = null;
let requestedTab = null;
const displayArt = html => String(html ?? '').replace(/\/assets\/reference\/(ref-[pk]-frame-\d+)\.webp/g,'/assets/art58/legacy/$1.webp').replace(/\/assets\/reference\/(ref-[pk]-(?:av|frame|badge|title)-\d+)\.webp/g,'/preview/assets/cosmetics/$1.png').replaceAll('/assets/reference/','/preview/assets/cosmetics/');
/** Host shortcut bridge; click handlers also manage their own tab state. */
export function openInventory(slot = 'inventory') {
  const tab = slot === 'ach' ? 'achievements' : slot === 'background' ? 'bg' : slot;
  if (TABS.some(([key]) => key === tab)) {requestedTab=tab;if(activeState)activeState.tab=tab;}
}
function state(ctx) {
  const id = String(ctx.user?.id ?? '__visitor');
  if (!states.has(id)) states.set(id, {tab:'inventory',editor:null,menu:false,pending:false,error:'',message:'',draft:null,ctx,root:null,focusReturn:null,collectionOpen:false,rankOpen:false,rankSystem:'level',rankRewards:null,rankLoading:false,rankError:'',rankPending:false,rankRequest:0,mounted:false,hubOpen:(()=>{try{return sessionStorage.getItem('la3bak:profile-hub')==='1';}catch{return false;}})()});
  return states.get(id);
}
function icon(name) {
  // Reuse the existing original vectors inline: no external SVG <use> dependency.
  return renderProfileIcon(name);
}

function verificationBadge(ctx) {
  if(ctx.me?.verified!==true)return '';
  if(ctx.me.verificationKind!=='administration')return `<em>${icon('check')}</em>`;
  const title=ctx.me.administrativeRole==='owner'?'المالك':'توثيق الإدارة';
  // R67ae: الحساب الإداري الرسمي = ختم ذهبي بنجمة
  return officialBadge(22, title==='المالك'?'حساب إداري رسمي · المالك':'حساب إداري رسمي');
}

function button(action, text, extra = '', cls = 'pvp-button') {
  return `<button type="button" class="${cls}" data-pvp="${action}" ${extra}>${text}</button>`;
}
function achievements(ctx) {
  // me is fetched after every mutation; use its canonical achievement eligibility.
  return arr(ctx.me?.achievements ?? ctx.shopData?.achievements);
}
function ownedItems(ctx, slot) {
  const owned = new Set(arr(ctx.shopData?.owned));
  const paid = arr(ctx.shopData?.items).filter(i => owned.has(i.id) && SLOTS.includes(i.slot));
  const earned = achievements(ctx).filter(a => a.done === true && ['title','badge'].includes(a.kind)).map(a => ({...a,slot:a.kind,rarity:a.tier,earned:true,css:a.kind === 'title' ? a.name : a.icon}));
  const dedup = [...new Map([...paid,...earned].map(i => [i.id,i])).values()];
  return slot && SLOTS.includes(slot) ? dedup.filter(i => i.slot === slot) : dedup;
}
function equipped(ctx, slot) {
  const entry = ctx.me?.equipped?.[slot] ?? ctx.shopData?.equippedView?.[slot];
  if (entry && typeof entry === 'object' && entry.id) return entry;
  const id = typeof entry === 'string' ? entry : ctx.shopData?.equipped?.[slot];
  return ownedItems(ctx,slot).find(i => i.id === id) ?? null;
}
function face(ctx,size) {
  return typeof ctx.avatarHTML === 'function' ? ctx.avatarHTML(size) : `<span class="pvp-fallback" style="--sz:${size}px">${esc((ctx.user?.name ?? ctx.me?.name ?? '؟').slice(0,1))}</span>`;
}

function frame(ctx,inner,item,size) {
  return typeof ctx.framed === 'function' ? ctx.framed(inner,item,size >= 100 ? 'lg' : 'sm') : displayArt(shopFramed(item?.css,inner,''));
}
function bg(ctx,item) {
  return item ? (typeof ctx.bgHTML === 'function' ? ctx.bgHTML(item) : displayArt(bgLayer(item.css))) : '';
}
function achArt(ctx,item) {
  const map = equipped(ctx,'avatar')?.id?.startsWith('ref-k-') ? ACHIEVEMENT_ART_KIDS : ACHIEVEMENT_ART;
  return map[item.id] ? displayArt(referenceImage(map[item.id], item.slot === 'title' || item.kind === 'title' ? 'pvp-title-art' : 'pvp-badge-art')) : '';
}
function itemArt(ctx,item) {
  if (item.slot === 'avatar') return displayArt(avatarArt(item.id,72)) || `<span class="pvp-item-symbol">${esc(item.icon || '👤')}</span>`;
  if (item.slot === 'frame') return `<span class="pvp-mini-frame">${frame(ctx,face(ctx,54),item,54)}</span>`;
  if (item.slot === 'bg') return `<span class="pvp-mini-bg">${bg(ctx,item)}</span>`;
  const art = achArt(ctx,item);
  if (art) return art;
  if (referenceOf(item.id)) return displayArt(referenceImage(item.id,'pvp-collectible-art'));
  return `<span class="pvp-item-symbol">${esc(item.slot === 'title' ? item.name : item.icon || item.css || '✦')}</span>`;
}
function gameArt(ctx,game) {
  return ART[game.id] ? `<img src="/preview/assets/game-${ART[game.id]}.webp" alt="" loading="lazy" width="240" height="160">` : `<span class="pvp-game-symbol" aria-hidden="true">${typeof ctx.gameIco === 'function' ? ctx.gameIco(game.id) : '<img src="/preview/assets/profile/icon-game.svg" alt="" width="34" height="34">'}</span>`;
}








function honors(ctx) {
  const title = equipped(ctx,'title');
  const ownTitle = title && ownedItems(ctx,'title').some(i => i.id === title.id);
  const badge = equipped(ctx,'badge');
  const ownBadge = badge && ownedItems(ctx,'badge').some(i => i.id === badge.id);
  return `<section class="pvp-panel pvp-honors" data-pvp-section="titles-badges" aria-labelledby="pvp-honors-heading"><div class="pvp-section-head"><h2 id="pvp-honors-heading">${icon('medal')}الألقاب والشارات</h2></div><div class="pvp-honors-grid"><div class="pvp-honor"><h3>اللقب المجهّز</h3>${ownTitle ? `<div class="pvp-equipped-title"><span>${achArt(ctx,{...title,slot:'title'}) || esc(title.name)}</span></div><p>${esc(title.name)}</p>` : `<p class="pvp-hint">${ctx.me ? 'ما عندك لقب مجهّز حاليًا.' : 'تظهر ألقابك عقب تحميل بيانات الحساب.'}</p>`}</div><div class="pvp-honor"><h3>الشارة المجهّزة</h3>${ownBadge ? `<span class="pvp-equipped-badge" aria-label="الشارة المجهزة: ${esc(badge.name)}">${achArt(ctx,{...badge,slot:'badge'}) || esc(badge.icon || badge.css)}</span><p>${esc(badge.name)}</p>` : `<p class="pvp-hint">${ctx.me ? 'ما عندك شارة مجهّزة حاليًا.' : 'تظهر شاراتك عقب تحميل بيانات الحساب.'}</p>`}</div></div></section>`;
}
function inventory(ctx,s) {
  const tabs = TABS.map(([key,ic]) => `<button type="button" role="tab" id="pvp-tab-${key}" aria-controls="pvp-inventory-panel" aria-selected="${s.tab === key}" tabindex="${s.tab === key ? 0 : -1}" data-pvp="tab" data-tab="${key}" class="pvp-shortcut${s.tab === key ? ' is-active' : ''}"><span>${key === 'inventory' ? '<img src="/preview/assets/profile/royal-crown.svg" alt="" width="45" height="40">' : key === 'achievements' ? '<img src="/preview/assets/decor-trophy-laurel.webp" alt="" width="45" height="40">' : icon(ic)}</span><b>${LABEL[key]}</b></button>`).join('');
  return `<section class="pvp-panel pvp-inventory-section" data-pvp-section="inventory" aria-labelledby="pvp-inventory-heading"><div class="pvp-section-head"><h2 id="pvp-inventory-heading">${icon('crown')}المقتنيات والمظهر</h2><a class="pvp-text-link" href="#/shop">زيارة المتجر ${icon('back')}</a></div><nav class="pvp-shortcuts" role="tablist" aria-label="مقتنيات اللاعب">${tabs}</nav><div id="pvp-inventory-panel" role="tabpanel" aria-labelledby="pvp-tab-${s.tab}">${inventoryBody(ctx,s)}</div></section>`;
}
function inventoryBody(ctx,s) {
  if (!ctx.me) return '<p class="pvp-empty" role="status">جاري تحميل مقتنياتك من الخادم…</p>';
  if (s.tab === 'achievements') {
    const list = achievements(ctx);
    if (!list.length) return '<p class="pvp-empty">لا توجد إنجازات متاحة لهذا الحساب حاليًا.</p>';
    return `<div class="pvp-achievements">${list.map(a => {
      const goal = finite(a.goal) ? Number(a.goal) : 0;
      const value = finite(a.value) ? Math.max(0,Math.min(Number(a.value),goal)) : 0;
      const on = equipped(ctx,a.kind)?.id === a.id;
      return `<article class="pvp-achievement${a.done === true ? ' is-earned' : ' is-locked'}"><span class="pvp-achievement-icon" aria-hidden="true">${achArt(ctx,a) || esc(a.done === true ? a.icon : '—')}</span><div><b>${esc(a.name)}</b><p>${esc(a.cond)}</p><progress max="${goal || 1}" value="${value}" aria-label="${esc(a.name)}"></progress><small>${fmt(value)} / ${fmt(goal)} · ${a.done === true ? 'مكتسب' : 'لم يُكتسب بعد'}</small></div>${a.done === true && ['title','badge'].includes(a.kind) ? button('equip',on ? 'إزالة' : 'تجهيز',`data-item="${esc(a.id)}" data-slot="${esc(a.kind)}" data-remove="${on ? '1' : '0'}" ${s.pending || typeof ctx.equip !== 'function' ? 'disabled' : ''}`,'pvp-button pvp-button-small') : ''}</article>`;
    }).join('')}</div>`;
  }
  if (!ctx.shopData) return '<p class="pvp-empty" role="status">جاري تحميل مخزون حسابك…</p>';
  const items = ownedItems(ctx,s.tab);
  if (!items.length) return `<div class="pvp-empty">${icon('crown')}<p>${s.tab === 'inventory' ? 'مقتنياتك تبدأ من هنا. لا توجد عناصر مملوكة بعد.' : `لا توجد ${LABEL[s.tab]} مملوكة أو مكتسبة بعد.`}</p><a class="pvp-button pvp-button-small" href="#/shop" data-pvp="shop" data-slot="${SLOTS.includes(s.tab) ? s.tab : 'avatar'}">اكتشف المتجر</a></div>`;
  return `<div class="pvp-items">${items.map(item => {
    const on = equipped(ctx,item.slot)?.id === item.id;
    return `<article class="pvp-item${on ? ' is-equipped' : ''}" data-pvp-item="${esc(item.id)}"><div class="pvp-item-art" aria-hidden="true">${itemArt(ctx,item)}</div><h3>${esc(item.name)}</h3><small>${LABEL[item.slot]} · ${on ? 'مجهّز حاليًا' : item.earned ? 'مكتسب' : 'مملوك'}</small>${button('equip',s.pending ? 'جارٍ الحفظ…' : on ? 'إزالة' : 'تجهيز',`data-item="${esc(item.id)}" data-slot="${esc(item.slot)}" data-remove="${on ? '1' : '0'}" ${s.pending || typeof ctx.equip !== 'function' ? 'disabled' : ''}`,'pvp-button pvp-button-small')}</article>`;
  }).join('')}</div>`;
}


function bio(ctx) {
  return `<section class="pvp-bio pvp-panel" data-pvp-section="bio" aria-labelledby="pvp-bio-heading"><div class="pvp-section-head"><h2 id="pvp-bio-heading">${icon('edit')}نبذة عني</h2>${ctx.user ? button('edit-bio','تعديل النبذة','aria-label="تعديل النبذة الشخصية"','pvp-text-button') : ''}</div><div class="pvp-bio-content"><p>${ctx.me ? ctx.me.bio ? esc(ctx.me.bio) : 'مساحتك لتحكي عن نفسك. أضف نبذة قصيرة من تعديل الملف الشخصي.' : 'جاري تحميل النبذة…'}</p><img src="/preview/assets/profile/royal-crown.svg" alt="" width="135" height="115" loading="lazy"></div></section>`;
}

function guestStart(ctx) {
  if (ctx.user) return '';
  return `<section class="pvp-guest-start pvp-panel" aria-labelledby="pvp-guest-heading"><h2 id="pvp-guest-heading">ابدأ باسمك</h2><p class="pvp-hint">Google اختياري. اختر اسمًا لبدء اللعب بحساب ضيف على هذا المتصفح، ثم اربطه لاحقًا لحمايته.</p><form data-form="name"><label class="pvp-label" for="pvp-guest-name">اسمك في الألعاب</label><input id="pvp-guest-name" name="name" minlength="2" maxlength="20" required autocomplete="nickname" placeholder="اكتب اسمك"><button type="submit" class="pvp-button">ابدأ</button></form></section>`;
}
function beginDraft(ctx) {
  return {country:String(ctx.me?.country ?? ''),gender:String(ctx.me?.gender ?? ''),birthDate:String(ctx.me?.birthDate ?? ''),name:String(ctx.user?.name ?? ctx.me?.name ?? ''),bio:String(ctx.me?.bio ?? ''),favoriteGames:arr(ctx.me?.favoriteGames).filter(id => arr(ctx.games).some(g => g.id === id)),equipment:Object.fromEntries(['avatar','frame','bg'].map(slot => [slot,equipped(ctx,slot)?.id ?? ''])),baseEquipment:Object.fromEntries(['avatar','frame','bg'].map(slot => [slot,equipped(ctx,slot)?.id ?? '']))};
}
function editor(ctx,s) {
  if (!s.editor) return '';
  const d = s.draft;
  const disabled = s.pending ? 'disabled' : '';
  let body = '';
  if (s.editor === 'appearance') {
    body = `<form data-pvp-form="appearance"><p class="pvp-hint">اختر من مقتنيات حسابك فقط. عند الحفظ تُحفظ الخانات المعدّلة واحدة تلو الأخرى، وليست عملية واحدة شاملة.</p><div class="pvp-slot-selectors">${['avatar','frame','bg'].map(slot => {
      const items = ownedItems(ctx,slot);
      return `<fieldset><legend>${LABEL[slot]}</legend><label class="pvp-label" for="pvp-select-${slot}">اختر ${slot === 'avatar' ? 'الأفتار' : slot === 'frame' ? 'الإطار' : 'الخلفية'}</label><select id="pvp-select-${slot}" name="${slot}" data-pvp-equipment="${slot}" ${disabled || !ctx.shopData ? 'disabled' : ''}><option value="" ${!d.equipment[slot] ? 'selected' : ''}>${slot === 'avatar' ? 'الصورة الحالية / الافتراضية' : slot === 'frame' ? 'بدون إطار' : 'التدرج البنفسجي الافتراضي'}</option>${items.map(i => `<option value="${esc(i.id)}" ${d.equipment[slot] === i.id ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select>${items.length ? `<div class="pvp-select-art" aria-hidden="true">${d.equipment[slot] ? itemArt(ctx,items.find(i => i.id === d.equipment[slot]) ?? items[0]) : slot === 'avatar' ? face(ctx,72) : icon(slot === 'bg' ? 'image' : 'frame')}</div>` : '<p class="pvp-hint">لا تملك عناصر في هذه الخانة بعد. <a href="#/shop">افتح المتجر</a></p>'}</fieldset>`;
    }).join('')}</div><p class="pvp-hint">إزالة أفاتار المتجر تُظهر صورتك المحفوظة ولا تحذفها. لا تتغيّر الملكية أو الأرصدة.</p><button class="pvp-button" type="submit" ${s.pending || !ctx.shopData || !ctx.me || typeof ctx.equip !== 'function' ? 'disabled' : ''}>${s.pending ? 'جارٍ الحفظ…' : 'حفظ تغييرات المظهر'}</button></form>`;
  } else if (s.editor === 'favorites') {
    body = `<form data-pvp-form="favorites"><p class="pvp-hint">اختر حتى 8 ألعاب من الألعاب المتاحة بالفعل.</p><p class="pvp-favorite-count" data-pvp-favorite-count>${d.favoriteGames.length} / 8</p><div class="pvp-favorite-picker">${arr(ctx.games).map(g => `<label class="pvp-favorite-option"><input type="checkbox" name="favoriteGames" value="${esc(g.id)}" ${d.favoriteGames.includes(g.id) ? 'checked' : ''} ${disabled}><span>${gameArt(ctx,g)}<b>${esc(g.name)}</b></span></label>`).join('')}</div><button class="pvp-button" type="submit" ${s.pending || !ctx.me || typeof ctx.savePresentation !== 'function' ? 'disabled' : ''}>${s.pending ? 'جارٍ الحفظ…' : 'حفظ الألعاب المفضلة'}</button></form>`;
  } else {
    body = `<form data-pvp-form="account"><label class="pvp-label" for="pvp-name-input">اسم اللاعب</label><input id="pvp-name-input" name="name" autocomplete="nickname" minlength="2" maxlength="20" required value="${esc(d.name)}" ${disabled}><p class="pvp-hint">من حرفين إلى 20 حرفًا. لا يتغيّر معرّف حسابك عند تعديل الاسم.</p><label class="pvp-label" for="pvp-bio-input">النبذة الشخصية</label><textarea id="pvp-bio-input" name="bio" maxlength="240" rows="4" ${disabled}>${esc(d.bio)}</textarea><small class="pvp-hint" data-pvp-bio-count>${d.bio.length} / 240</small>${personalEditorFields(d,disabled)}<p class="pvp-hint">يُحفظ الاسم والنبذة بطلبين منفصلين عند تعديلهما. إذا تعذّر أحدهما سنوضح ما تم حفظه.</p><button class="pvp-button" type="submit" ${s.pending || !ctx.me || typeof ctx.rename !== 'function' || typeof ctx.savePresentation !== 'function' ? 'disabled' : ''}>${s.pending ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}</button></form>`;
  }
  return `<div class="pvp-modal-backdrop" data-pvp="backdrop"><section class="pvp-editor" role="dialog" aria-modal="true" aria-labelledby="pvp-editor-title" tabindex="-1"><div class="pvp-editor-head"><div><small>LA3BAK · حسابك، على ذوقك</small><h2 id="pvp-editor-title">تعديل الملف الشخصي</h2></div>${button('close',icon('close'),`aria-label="إغلاق محرر الملف الشخصي" ${disabled}`,'pvp-icon-button')}</div><nav class="pvp-editor-tabs" aria-label="أقسام تعديل الملف">${[['account','الاسم والنبذة'],['appearance','المظهر'],['favorites','الألعاب المفضلة']].map(([key,text]) => button('editor-tab',text,`data-editor="${key}" aria-pressed="${s.editor === key}" ${disabled}`,'pvp-editor-tab')).join('')}</nav>${s.error ? `<p class="pvp-error" role="alert">${esc(s.error)}</p>` : ''}${s.message ? `<p class="pvp-editor-status" role="status">${esc(s.message)}</p>` : ''}${body}</section></div>`;
}

const countryCodes = ['AE','SA','QA','KW','BH','OM','EG','JO','LB','IQ','SY','PS','YE','MA','DZ','TN','LY','SD','SO','US','GB','FR','DE','IN','PK','TR','CA','AU'];
const countryNames = new Intl.DisplayNames(['ar'], {type:'region'});
function countryName(code) { try {return code === 'AE' ? 'الإمارات' : code ? countryNames.of(code) || code : 'غير محدد';} catch {return 'غير محدد';} }
function personalEditorFields(d,disabled) {
 const codes = [...new Set([...countryCodes,...(d.country ? [d.country] : [])])];
 return `<fieldset class="lpu-personal-editor"><legend>معلومات الحساب الاختيارية</legend><label for="pvp-country">الدولة</label><select id="pvp-country" name="country" ${disabled}><option value="">غير محدد</option>${codes.map(c=>`<option value="${esc(c)}" ${d.country===c?'selected':''}>${esc(countryName(c))}</option>`).join('')}</select><label for="pvp-gender">الجنس</label><select id="pvp-gender" name="gender" ${disabled}><option value="">غير محدد</option><option value="male" ${d.gender==='male'?'selected':''}>ذكر</option><option value="female" ${d.gender==='female'?'selected':''}>أنثى</option></select><label for="pvp-birthDate">تاريخ الميلاد لحساب العمر</label><input id="pvp-birthDate" type="date" name="birthDate" value="${esc(d.birthDate)}" max="${new Date().toISOString().slice(0,10)}" ${disabled}><small>اختيارية، ولا نستنتجها من اسمك أو صورتك.</small></fieldset>`;
}
function rankCards(ctx,s) {
 return `<section class="ranks" data-pvp-section="rank-badges" dir="ltr" aria-label="رتب اللاعب">${['noble','vip','level'].map(key=>{
  const view=rankSummary(ctx,key),label=key.toUpperCase();
  return `<button type="button" class="rank ${key} lpu-live-rank" data-pvp="rank-system" data-system="${key}" data-rank="${key}" data-rank-state="${view.state}" data-rank-theme="${view.theme}" aria-label="${label}: ${esc(view.text)} — عرض التفاصيل" aria-controls="pvp-rank-overview" aria-expanded="${s.rankOpen && s.rankSystem===key}">${view.art?`<img class="lpu-rank-art" src="${view.art}" alt="" width="100" height="96">`:'<span class="lpu-rank-placeholder" aria-hidden="true">—</span>'}<b>${label}</b><strong>${esc(view.rank===null?(view.state==='disabled'?'غير مفعّل':view.state==='unranked'?'لا رتبة':'غير متوفر'):key==='level'?'Lv '+view.rank:view.entry.value)}</strong></button>`;
 }).join('')}</section>`;
}

function referenceStats(ctx) {
 const m=ctx.me;
 // Friends are not inferred from followers: missing data is explicitly unknown.
 const rows=[['users','الأصدقاء',fmt(m?.friendsCount)],['game','المباريات',fmt(m?.played)],['trophy','الانتصارات',fmt(m?.wins)],['chart','الخسائر',fmt(m?.losses)]];
 if(Array.isArray(m?.achievements))rows.push(['medal','الإنجازات',fmt(m.achievements.filter(a=>a.done===true).length)]);
 if(finite(m?.points))rows.push(['chart','النقاط',fmt(m.points)]);
 return `<section class="lpu-stats-section" data-pvp-section="real-stats" aria-labelledby="lpu-stats-heading"><h2 id="lpu-stats-heading">إحصائيات اللاعب</h2><div class="stats" dir="rtl">${rows.map(([ic,label,value])=>`<div>${icon(ic)}<small>${label}</small><b>${esc(value)}</b></div>`).join('')}</div><small class="lpu-data-note">— تعني أن البيانات غير متوفرة من الخادم.</small></section>`;
}
function referenceBio(ctx) {
 return `<section class="bio" dir="rtl"><div><h3>نبذة عني ${ctx.user?button('edit-bio',icon('edit'),'aria-label="تعديل النبذة"','lpu-edit'):''}</h3><p>${esc(ctx.me?.bio || (ctx.user?'اكتب نبذتك من زر التعديل.':'سجّل دخولك لعرض نبذتك.'))}</p></div></section>`;
}
function referencePersonalInfo(ctx) {
 const m=ctx.me, since=m?.since;
 const candidate=finite(since)&&Number(since)>0&&Number(since)<=Date.now()?new Date(Number(since)):null;
 const date=candidate&&!Number.isNaN(candidate.getTime())?candidate:null;
 const days=date?Math.max(0,Math.floor((Date.now()-date.getTime())/86400000)):null;
 const entries=[['flag','الدولة',countryName(m?.country)],['gender','الجنس',m?.gender==='male'?'ذكر':m?.gender==='female'?'أنثى':'غير محدد'],['cake','العمر',finite(m?.age)?`${fmt(m.age)} سنة`:'غير محدد'],['calendar','تاريخ الانضمام',date?date.toISOString().slice(0,10):'غير متوفر'],['calendar','عدد الأيام بالموقع',days!==null?`${fmt(days)} يوم`:'غير متوفر']];
 entries.push(['shield','توثيق الحساب',m?.verified===true?(m.verificationKind==='administration'?'موثق من الإدارة':'موثق'):m?.verified===false?'غير موثق':'غير متوفر']);
 return `<section class="personal" data-pvp-section="account-information" aria-labelledby="lpu-account-heading"><h2 id="lpu-account-heading">معلومات الحساب ${ctx.user?button('edit-personal',icon('edit'),'aria-label="تعديل معلوماتي الشخصية"','lpu-edit'):icon('info')}</h2><div class="info">${entries.map(([ic,label,value])=>`<div>${icon(ic)}<small>${label}</small><b>${esc(value)}${ic==='flag'&&m?.country==='AE'?'<svg class="lpu-country-flag" viewBox="0 0 30 20" aria-label="علم الإمارات"><path fill="#009a49" d="M0 0h30v7H0z"/><path fill="#fff" d="M0 7h30v6H0z"/><path fill="#111" d="M0 13h30v7H0z"/><path fill="#ed1c24" d="M0 0h8v20H0z"/></svg>':''}</b></div>`).join('')}</div></section>`;
}
function referenceFavorites(ctx) {
 const selected=new Set(arr(ctx.me?.favoriteGames));
 const games=arr(ctx.me?.favoriteGames).map(id=>arr(ctx.games).find(g=>g.id===id)).filter(Boolean);
 return `<section class="favorites"><h3>${icon('game')} ألعابي المفضلة</h3>${ctx.user?button('edit-favorites',icon('edit'),'aria-label="تعديل الألعاب المفضلة"','lpu-edit lpu-favorites-edit'):''}${games.length?`<div class="games" dir="ltr">${games.map(g=>`<a href="#/${['ludo','baloot','jackaro'].includes(g.id)?'hub':'game'}/${encodeURIComponent(g.id)}" aria-label="فتح ${esc(g.name)}">${gameArt(ctx,g)}<b>${esc(g.name)}</b></a>`).join('')}</div>`:`<div class="lpu-empty">${ctx.user?'ما اخترت ألعاب مفضلة بعد. اختارها من زر التعديل.':'سجّل دخولك لعرض ألعابك المفضلة.'}</div>`}</section>`;
}
function referenceDrawer(ctx,s) {
 const links=[['settings','settings','الإعدادات'],['wallet','coin','المحفظة'],['shop/packs','coin','العروض والباقات'],['shop','shop','المتجر'],['games','game','الألعاب'],['leaderboard','trophy','ترتيب اللاعبين'],['support','help','الدعم والمساعدة'],['privacy','shield','الخصوصية']];
 return `<div class="lpu-drawer-backdrop" data-pvp="menu-close" ${s.menu?'':'hidden'}></div><aside class="lpu-drawer ${s.menu?'is-open':''}" aria-label="القائمة الجانبية" aria-hidden="${!s.menu}" ${s.menu?'':'inert'}><header><b>LA3BAK | لعبك</b>${button('menu-close',icon('close'),'aria-label="إغلاق القائمة"','lpu-edit')}</header><nav>${links.map(([route,ic,label])=>`<a href="#/${route}">${icon(ic)}${label}</a>`).join('')}${ctx.user?button('logout',`${icon('logout')} تسجيل الخروج`,s.pending?'disabled':'','lpu-drawer-action'):''}</nav></aside>`;
}

function referenceBottomNav(ctx={}) {
 return nav68HTML('profile',{locked:url=>!!ctx.noCommunity&&['#/friends'].includes(url)});
}

function referenceHeader(ctx,s) {
 return `<header class="top" dir="rtl"><a class="logo" href="#/" aria-label="LA3BAK لعبك — الرئيسية"><img src="/preview/assets/profile/icon-game.svg" alt="" width="28" height="24"><b dir="ltr">LA3BAK <span lang="ar">| لعبك</span></b></a><nav class="actions" aria-label="أدوات الملف"><button type="button" class="lpu-head-button" data-lb-global-search aria-label="البحث عن الأشخاص والغرف" aria-haspopup="dialog" aria-expanded="false">${SEARCH_ICON}</button>${!ctx.noCommunity?`<a href="#/notifications" aria-label="الإشعارات">${icon('bell')}${ctx.unread?'<i class="lpu-notification-dot"></i>':''}</a>`:''}${/* R67au: زر ☰ انشال بطلب المالك؛ الإعدادات والدعم والمتجر موجودة بالملف والشريط السفلي */''}</nav></header>`;
}

const headerCount = value => typeof value==='number' && Number.isSafeInteger(value) && value>=0 ? new Intl.NumberFormat('en-US').format(value) : '—';
const headGenderIcon = gender => gender==='male' ? '<svg class="pvp-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="15" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m13 11 8-8m-7 0h7v7" fill="none" stroke="currentColor" stroke-width="2"/></svg>' : gender==='female' ? '<svg class="pvp-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 14v9m-4-5h8" fill="none" stroke="currentColor" stroke-width="2"/></svg>' : '';
const headHeartIcon = '<svg class="pvp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21 3.5 12.6C-2 6.8 5.5-1 12 5.3 18.5-1 26 6.8 20.5 12.6Z" fill="currentColor"/></svg>';
function referenceHeadBadges(ctx) {
 const m=ctx.me,gender=['male','female'].includes(m?.gender)?m.gender:'unknown';
 const age=typeof m?.age==='number'&&Number.isSafeInteger(m.age)&&m.age>=0&&m.age<=120?String(m.age):'—';
 const ageTitle=`العمر: ${age==='—'?'غير محدد':age+' سنة'} · الجنس: ${gender==='male'?'ذكر':gender==='female'?'أنثى':'غير محدد'}`;
 const ageHTML=button('edit-personal',`<span class="pvp-head-age-number">${age}</span>${headGenderIcon(gender)}`,`data-gender="${gender}" aria-label="${ageTitle}؛ تعديل المعلومات الشخصية" title="${ageTitle}"`,'pvp-head-pill is-age');
 const rankHTML=system=>{const rank=rankSummary(ctx,system),earned=rank.state==='earned';
  const text=system==='level'?(earned?String(rank.rank):'—'):(earned?'VIP'+rank.rank:'VIP —');
  const art=system==='level'&&earned?`<span class="pvp-head-level-icon" data-pvp-level-theme="${rank.theme}" aria-hidden="true">${icon('crown')}</span>`:system==='level'?icon('crown'):'';
  const chip=system==='vip'&&earned&&Number.isInteger(rank.rank)&&rank.rank>=1&&rank.rank<=15?`<img class="art58-chip" src="/assets/art58/chips/vip${rank.rank}.webp?v=r58o" alt="" decoding="async">`:'';
  return button('rank-system',`${chip||art}<small dir="ltr" data-pvp-head-rank="${system}"${chip?' class="art58-chip-tx"':''}>${esc(text)}</small>`,`data-system="${system}" data-rank-state="${rank.state}"${system==='vip'&&earned&&rank.rank>=1&&rank.rank<=15?' data-art58="1"':''} aria-label="تفاصيل ${esc(rank.text)}" title="${esc(rank.text)}"`,'pvp-head-rank pvp-head-pill is-'+system);
 };
 const support=headerCount(m?.giftCounts?.recv),supportTitle='عدد مرات الدعم بالهدايا المستلمة من أشخاص آخرين: '+support;
 const supportHTML=ctx.user&&!ctx.noCommunity?button('gift-log',`${headHeartIcon}<span class="pvp-head-support-number">${support}</span>`,`data-direction="incoming" data-pvp-head-support aria-label="${supportTitle}" title="${supportTitle}"`,'pvp-head-pill is-support'):`<span class="pvp-head-pill is-support" data-pvp-head-support title="${ctx.noCommunity?'الهدايا مقفلة بإعدادات ولي الأمر':'سجّل الدخول لعرض الدعم'}">${headHeartIcon}<span class="pvp-head-support-number">—</span></span>`;
 return `<div class="pvp-head-pills pvp-head-badges" aria-label="العمر والجنس والرتب والدعم">${ageHTML}${rankHTML('vip')}${rankHTML('level')}${supportHTML}</div>`;
}
function referenceHeadCounts(ctx) {
 const m=ctx.me,restricted=!ctx.user||ctx.noCommunity;
 const row=(kind,label,value)=>{const content=`<strong data-pvp-head-count="${kind}">${restricted?'—':headerCount(value)}</strong><span>${label}</span>`;
  if(restricted)return `<span class="pvp-head-count" aria-label="${label}: ${ctx.noCommunity?'مقفل':'سجّل الدخول'}">${content}</span>`;
  return kind==='friends'?`<a class="pvp-head-count" href="#/friends" aria-label="أصدقاؤك: ${headerCount(value)}">${content}</a>`:button('self-follows',content,`data-follow-kind="${kind}" aria-label="${label}: ${headerCount(value)}"`,'pvp-head-count');
 };
 return `<nav class="pvp-head-social-statistics" aria-label="الأصدقاء والمتابعة">${row('friends','صديق',m?.friendsCount)}${row('following','يتابع',m?.followingCount)}${row('followers','متابع',m?.followersCount)}</nav>`;
}
function referenceHero(ctx,s) {
 const m=ctx.me,id=playerID(ctx),avatar=equipped(ctx,'avatar'),fr=equipped(ctx,'frame'),background=equipped(ctx,'bg');
 const portrait=frame(ctx,face(ctx,88),fr,88),name=m?.name||ctx.user?.name||'الملف الشخصي';
 return `${referenceHeader(ctx,s)}<section class="hero pvp-compact-head pvp-head-r20 pvp-head-r22${background?' lpu-custom-cover':''}" data-pvp-section="identity" aria-label="هوية اللاعب" title="${ctx.connected?'متصل بالخادم':'غير متصل بالخادم'}">${background?`<div class="lpu-cover" aria-hidden="true" data-pf67-full="1" data-pf67-rar="${esc(background.rarity||'')}" data-pf67-vip="${(()=>{const v=rankSummary(ctx,'vip');return v.state==='earned'&&Number.isSafeInteger(v.rank)?v.rank:0;})()}" data-pf67-flat="${ctx.accountSettings?.flatProfileBg===true||ctx.me?.settings?.flatProfileBg===true?1:0}">${bg(ctx,background)}</div>`:''}<div class="avatar" data-pvp-section="avatar-frame"><div class="lpu-portrait">${portrait}</div>${ctx.user?button('upload-photo','<span>رفع وتغيير صورة اللاعب</span>',`aria-label="رفع وتغيير صورة اللاعب" ${typeof ctx.pickPhoto!=='function'?'disabled':''}`,'pvp-head-upload'):''}</div><div class="pvp-identity-copy"><h1 class="name" title="${esc(name)}"><span class="${(()=>{const v=rankSummary(ctx,'vip');return v.state==='earned'&&Number.isSafeInteger(v.rank)&&v.rank>=1&&ctx.accountSettings?.hideNameColor!==true&&ctx.me?.settings?.hideNameColor!==true?'rp-name-v'+v.rank:'';})()}">${esc(name)}</span>${verificationBadge(ctx)}</h1>${referenceHeadBadges(ctx)}<div class="id${specialID(ctx)?' lpu-special-id':''}"${specialID(ctx)?` data-sid-tier="${specialTier(ctx)}" data-sid-plate="${specialPlate(ctx)}"`:''}><span dir="ltr">ID: <b data-pvp-player-id>${esc(id||'—')}</b></span>${specialID(ctx)?`<small class="lpu-special-id-label${String(playerID(ctx)).length<=3?' is-official':''}" title="رقم عرض مميّز؛ رقم اللاعب الدائم محفوظ">${String(playerID(ctx)).length<=3?'ID رسمي':'ID مميّز'}</small>`:''}${id?button('copy',icon('copy'),'aria-label="نسخ رقم اللاعب"','lpu-copy'):''}</div></div>${ctx.user?button('edit',icon('edit'),`${!m||typeof ctx.rename!=='function'||typeof ctx.savePresentation!=='function'?'disabled':''} aria-label="تعديل الملف الشخصي" title="تعديل الملف الشخصي"`,'pvp-edit-profile'):''}${referenceHeadCounts(ctx)}${avatar?'<p class="pvp-upload-note">أفاتار المتجر مجهّز الآن. لإظهار صورتك المرفوعة، أزله من «المظهر والمقتنيات»؛ صورتك المحفوظة لا تُحذف.</p>':''}</section>`;
}

function collection(ctx,s) {
 if(!s.collectionOpen)return '';
 return `<div class="pvp-modal-backdrop" data-pvp="collection-close"><section class="pvp-editor" role="dialog" aria-modal="true" aria-label="المقتنيات والمظهر" tabindex="-1"><header class="pvp-editor-head"><h2>${esc(LABEL[s.tab])}</h2>${button('collection-close',icon('close'),'aria-label="إغلاق المقتنيات"','pvp-icon-button')}</header>${s.tab==='inventory'?souvenirShelf(ctx):''}${inventory(ctx,s)}${honors(ctx)}</section></div>`; /* R58y: التذكارات داخل «المقتنيات» بدل الصفحة الرئيسية للملف (طلب المالك) */
}

/* R53: بطاقة العائلة تحت هوية اللاعب (مثل بطاقة «المملكة» بالمرجع) — من /api/social-private/family لحسابك فقط، وتظهر بس لو أنت بعائلة */
function souvenirShelf(ctx) {
 // R58j: رف «تذكاراتي» — التذكارات المملوكة من المتجر (رسومات المالك). العرض من بيانات الخادم فقط.
 if(!ctx.user||!ctx.shopData)return '';
 const owned=new Set(arr(ctx.shopData.owned)),list=arr(ctx.shopData.items).filter(i=>i&&i.slot==='souvenir'&&owned.has(i.id)&&/^\/assets\/art58\/souv\/s\d{2}\.webp$/.test(String(i.art||'')));
 const total=arr(ctx.shopData.items).filter(i=>i&&i.slot==='souvenir').length;
 const body=list.length?`<div class="souv-row">${list.map(i=>`<figure class="souv-item r-${esc(i.rarity||'common')}"><img src="${esc(i.art)}?v=r58o" alt="" loading="lazy" decoding="async"><figcaption>${esc(i.name)}</figcaption></figure>`).join('')}</div>`:`<a class="souv-empty" href="#/shop" data-souv-shop>${'<i></i>'.repeat(3)}<span>رفّك فاضي — اقتنِ أول تذكار من المتجر</span></a>`;
 return `<section class="souv-shelf" data-souv-shelf aria-label="تذكاراتي"><header><b>تذكاراتي</b><small dir="ltr">${list.length}/${total}</small></header>${body}</section>`;
}
function savedRoomsCard(ctx,s) {
 const list=s.savedRooms;
 if(!ctx.user||ctx.noCommunity||!Array.isArray(list)||!list.length)return '';
 const tile=r=>{const photo=/^\/api\/social\/room-photo\?|^\/(?!\/)[A-Za-z0-9_./?=&-]+$/.test(r.photo)?r.photo:'';return `<a class="pvp-room-tile" href="#/social-room/${encodeURIComponent(r.id)}" aria-label="${esc(r.name)}">${photo?`<img src="${esc(photo)}" alt="" loading="lazy">`:`<span class="pvp-room-initial" aria-hidden="true">${esc(Array.from(r.name||'غ')[0])}</span>`}<span class="pvp-room-name">${esc(r.name)}</span>${r.saved?'<i class="pvp-room-heart" aria-label="محفوظة بالقلب">❤</i>':''}</a>`;};
 return `<section class="pvp-rooms-card" data-pvp-saved-rooms aria-labelledby="pvp-rooms-title"><header><h2 id="pvp-rooms-title">غرف الدردشة</h2><small>${list.length}</small></header><div class="pvp-rooms-row">${list.map(tile).join('')}</div></section>`;
}
function familyCard(ctx,s) {
 const c=s.family?.circle;
 if(!ctx.user||ctx.noCommunity||!c||typeof c.name!=='string')return '';
 const members=Array.isArray(c.members)?c.members.length:null;
 return `<a class="pvp-family-card" href="#/family" data-pvp-family-card aria-label="عائلتي: ${esc(c.name)}"><span class="pvp-family-emblem" aria-hidden="true">${icon('users')}</span><span class="pvp-family-copy"><b>${esc(c.name)}</b><span class="pvp-family-tags">${members!==null?`<em class="pvp-family-count">العائلة · ${members} ${members===1?'عضو':'أعضاء'}</em>`:''}<em class="pvp-family-role">${c.isOwner?'مؤسس العائلة':'عضو'}</em></span></span>${icon('back')}</a>`;
}
/* R53: قيم خفيفة للقائمة من الخادم بعد فتح الملف (زوار جدد + عائلتك). فشلها ما يوقف الصفحة ولا يعرض أرقام بديلة */
let extrasAt=0,extrasOwner='';
async function loadProfileExtras(s) {
 const ctx=s.ctx,owner=ctx?.user?.id||ctx?.me?.id||'';
 if(!ctx?.user||ctx.noCommunity||!owner)return;
 if(owner===extrasOwner&&Date.now()-extrasAt<30000&&s.extrasLoaded)return;
 extrasOwner=owner;extrasAt=Date.now();
 const get=async url=>{try{const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});return r.ok?await r.json():null;}catch{return null;}};
 const [visitors,family,social]=await Promise.all([get('/api/profile/visitors?limit=1'),get('/api/social-private/family'),get('/api/social/rooms')]);
 if(!s.mounted||activeState!==s)return;
 s.extrasLoaded=true;
 const fresh=Number.isSafeInteger(visitors?.fresh)?visitors.fresh:null,fam=family&&family.ok!==false?family:null;
 /* R55: غرف الدردشة بالملف = الغرف المحفوظة بالقلب + الغرف اللي أنت مالكها (من الخادم فقط) */
 const myPub=String(social?.preferences?.publicId||'');
 const followed=new Set(Array.isArray(social?.directory?.followed)?social.directory.followed:Array.isArray(social?.preferences?.followedRoomIds)?social.preferences.followedRoomIds:[]);
 const rooms=social?.ok&&Array.isArray(social.rooms)?social.rooms.filter(r=>r&&typeof r.id==='string'&&(followed.has(r.id)||r.mine===true)).map(r=>({id:r.id,name:String(r.name||''),photo:typeof r.photo==='string'?r.photo:'',count:Number.isSafeInteger(r.count)?r.count:null,saved:followed.has(r.id)})):null;
 const changed=fresh!==s.visitorsFresh||JSON.stringify(fam?.circle??null)!==JSON.stringify(s.family?.circle??null)||JSON.stringify(rooms)!==JSON.stringify(s.savedRooms??null);
 s.visitorsFresh=fresh;s.family=fam;s.savedRooms=rooms;void myPub;
 if(changed)redraw(s);
}

function profileMenu(ctx,s) {
 const badge=(ic)=>`<span class="pvp-menu-icon" data-profile-icon="${ic}" aria-hidden="true">${icon(ic)}</span>`;
 const routeRow=(route,ic,label,detail='',restricted=false)=>restricted&&ctx.noCommunity?`<div class="pvp-menu-row pvp-menu-unavailable" aria-disabled="true">${badge(ic)}<span class="pvp-menu-label">${label}</span><small class="pvp-menu-value">مقفل</small>${icon('shield')}</div>`:`<a class="pvp-menu-row" href="#/${route}"${detail?` title="${esc(detail)}"`:''}>${badge(ic)}<span class="pvp-menu-label">${label}</span>${icon('back')}</a>`;
 const actionRow=(action,ic,label,extra='',detail='')=>button(action,`${badge(ic)}<span class="pvp-menu-label">${label}</span>${icon('back')}`,`${extra}${detail?` title="${esc(detail)}"`:''}`,'pvp-menu-row');
 const unavailable=(ic,label,detail)=>`<div class="pvp-menu-row pvp-menu-unavailable" aria-disabled="true" title="${esc(detail)}">${badge(ic)}<span class="pvp-menu-label">${label}</span><small class="pvp-menu-value">قيد الربط</small></div>`;
 const ready=name=>ctx.profileBridges?.[name]===true&&typeof ctx.onAction==='function';
 const canEdit=ctx.user&&ctx.me;
 const selfPosts=ctx.noCommunity?'':ctx.user?(ready('selfPosts')?actionRow('self-posts','file','منشوراتي','data-pvp-self-posts'):unavailable('file','منشوراتي','بانتظار ربط صفحة الناشر بهوية حسابك')):'';
 const giftRow=(direction,label)=>ctx.user?(ready('giftLog')?actionRow('gift-log','image',label,`data-pvp-gift-log="${direction}" data-direction="${direction}"`):unavailable('image',label,'سجل الحساب موجود؛ عرض الملف بانتظار الربط')):'';
 /* R53: ترتيب قائمة «الخاص بي» بالتطبيق المرجعي (مجموعات بفواصل + قيمة الحالة يسار الصف)، وبعدها أقسام LA3BAK الإضافية كلها كما هي */
 const rankValue=key=>{const v=rankSummary(ctx,key);return v.state==='earned'&&Number.isSafeInteger(v.rank)?(key==='vip'?`VIP ${v.rank}`:`N${v.rank}`):'';};
 const withValue=(html,value,attr='')=>value?html.replace('<span class="pvp-menu-label">',`<span class="pvp-menu-label">`).replace(/(<\/span>)(<svg|<span class="pvp-icon)/,`$1<small class="pvp-menu-value"${attr}>${esc(value)}</small>$2`):html;
 const fresh=Number.isSafeInteger(s.visitorsFresh)&&s.visitorsFresh>0?`${s.visitorsFresh>99?'99+':s.visitorsFresh} جديد`:'';
 const visitors=(ctx.user&&!ctx.noCommunity?withValue(routeRow('visitors','eye','من الذي رآني','اللاعبون اللي فتحوا ملفك العام'),fresh,' data-pvp-visitors-value'):'')+(ctx.user?`<button type="button" class="pvp-menu-row bc67-row" data-bc67-open title="رسالة تطلع لكل الموقع">${badge('bell')}<span class="pvp-menu-label">📢 أرسل برقية</span>${icon('back')}</button>`:'');
 const invite=ctx.user&&!ctx.noCommunity?routeRow('invite','share','ادعُ الأصدقاء','رابط دعوة برقمك العام بدون مكافآت مالية'):'';
 const group=(rows,label)=>rows.replace(/\s/g,'')?`<div class="pvp-menu-group" role="group" aria-label="${label}">${rows}</div>`:'';
 /* R54: قسم واحد «أصدقائي وتقدّمي» يجمع الأصدقاء والعائلة والهدايا والمظهر والدعوات والمستوى والمكافآت والمهام — صف واحد يفتح ويسكّر */
 const hubRows=`<p class="pvp-hub-sub">الأصدقاء والهدايا</p>${routeRow('friends','users','الأصدقاء','قائمة الأصدقاء وطلبات الصداقة',true)}${routeRow('family','users','العائلة والارتباط الافتراضي','دعوات اختيارية وموافقة وخصوصية',true)}${giftRow('incoming','الهدايا المستلمة')}${giftRow('outgoing','الهدايا المرسلة')}${invite}<p class="pvp-hub-sub">المظهر والتقدّم</p>${canEdit?actionRow('edit-appearance','frame','المظهر والمقتنيات','','الصورة والإطار والخلفية المملوكة'):''}${actionRow('tab','medal','الشارات والألقاب والإنجازات','data-tab="achievements"')}${actionRow('rank-system','chart','المستوى والخبرة','data-system="level"')}${routeRow('rank-rewards','trophy','مكافآت الرتب')}${routeRow('missions','file','المهام')}`;
 const hubSection=`<div class="pvp-menu-group pvp-hub${s.hubOpen?' is-open':''}" role="group" aria-label="أصدقائي وتقدّمي">${button('hub-toggle',`${badge('users')}<span class="pvp-menu-label">أصدقائي وتقدّمي<small class="pvp-hub-note">الأصدقاء، العائلة، الهدايا، المظهر، المستوى، المكافآت والمهام</small></span>${icon('back')}`,`aria-expanded="${s.hubOpen?'true':'false'}" aria-controls="pvp-hub-rows" data-pvp-hub-toggle`,'pvp-menu-row pvp-hub-toggle')}<div class="pvp-hub-rows" id="pvp-hub-rows"${s.hubOpen?'':' hidden'}>${hubRows}</div></div>`;
 return `<nav class="pvp-profile-menu pvp-menu-r53" aria-label="أقسام ملفي"><div class="pvp-profile-list" data-pvp-profile-list>${group(`${visitors}${selfPosts}`,'نشاطي')}${group(`${routeRow('wallet','coin','محفظتي','العملات وشراء الباقات وسجل المعاملات')}${ctx.user?actionRow('tab','crown','حقيبتي','data-tab="inventory" data-pvp-bag','المقتنيات والتذكارات وجوايز الصاروخ'):''}${routeRow('shop/packs','coin','مركز العروض','الباقات المتاحة من الخادم')}${ctx.user?`<div class="pvp-menu-row pvp-menu-unavailable pvp-mine-soon" aria-disabled="true" title="المنجم — قريبًا">${badge('crown')}<span class="pvp-menu-label">المنجم</span><small class="pvp-menu-value">قريبًا</small></div>`:''}${withValue(routeRow('vip','crown','VIP','عضويتك ومزاياها الحالية'),rankValue('vip'),' data-pvp-rank-value="vip" dir="ltr"')}${routeRow('leaderboard','ranking','ترتيب الرتبة')}${withValue(routeRow('ranks','medal','نوبل','رتب NOBLE المعتمدة'),rankValue('noble'),' data-pvp-rank-value="noble" dir="ltr"')}${routeRow('shop','shop','المركز التجاري','المتجر والمقتنيات الحالية')}`,'الحساب والمتجر')}${hubSection}${group(`${routeRow('settings','settings','الإعدادات','توثيق الحساب، المساعدة والدعم، الخصوصية، الشروط، وتسجيل الخروج')}`,'الإعدادات')}</div></nav>`;
}

function profileDetails(ctx) {
 return `<div class="pvp-profile-details"><details class="pvp-detail"><summary>${icon('info')} معلومات الحساب والنبذة ${icon('back')}</summary>${referencePersonalInfo(ctx)}${referenceBio(ctx)}</details><details class="pvp-detail"><summary>${icon('chart')} إحصائياتي الحالية ${icon('back')}</summary>${referenceStats(ctx)}</details><details class="pvp-detail"><summary>${icon('game')} ألعابي المفضلة ${icon('back')}</summary>${referenceFavorites(ctx)}</details></div>`;
}
function profileGiftLog(ctx) {
 if(!ctx.user||!['received','sent'].includes(ctx.giftLogDirection)||typeof ctx.giftLogHTML!=='string')return '';
 // Trusted app renderer GIFT.logHTML(direction), never raw player HTML or a new API.
 return `<section class="pvp-gift-log" data-pvp-section="gift-log" aria-labelledby="pvp-gift-log-heading"><header><h2 id="pvp-gift-log-heading">${ctx.giftLogDirection==='received'?'الهدايا المستلمة':'الهدايا المرسلة'}</h2><a class="pvp-text-link" href="#/profile">العودة إلى ملفي</a></header><div class="pvp-gift-log-content">${ctx.giftLogHTML}</div></section>`;
}

/* R68: الملف الشخصي بتصميم المالك (صورة التصميم المعتمدة) — رأس، إحصائيات، تبويبات، بطاقات */
const PF68_TABS=[['profile','person','الملف الشخصي'],['gifts','gift','الهدايا'],['items','shirt','المقتنيات'],['ach','medal','الإنجازات']];
const PF68_SVG={
 back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 chev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 cam:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13.3" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
 pen:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4 11-11 3 3-11 11zM14 7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
 copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
 users:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.6" fill="currentColor"/><path d="M2 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5z" fill="currentColor"/><circle cx="17" cy="9" r="2.8" fill="currentColor" opacity=".75"/><path d="M15.5 13.6c3.6-.4 6.5 1.8 6.5 6.4h-4.4" fill="currentColor" opacity=".75"/></svg>',
 follow:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="4" fill="currentColor"/><path d="M2 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/><path d="M19 6v6M16 9h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
 pad:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10a5 5 0 0 1 4.9 6l-.7 3.4a2.6 2.6 0 0 1-4.5 1.2L14.6 15H9.4l-2.1 2.6a2.6 2.6 0 0 1-4.5-1.2L2.1 13A5 5 0 0 1 7 7z" fill="currentColor"/><path d="M7 10v3.4M5.3 11.7h3.4" stroke="#1b0d33" stroke-width="1.6" stroke-linecap="round"/><circle cx="16.4" cy="10.6" r="1.1" fill="#1b0d33"/><circle cx="18.2" cy="12.8" r="1.1" fill="#1b0d33"/></svg>',
 trophy:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5a3.5 3.5 0 0 0 3.8 4.2M17 5h3.5a3.5 3.5 0 0 1-3.8 4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 13h3l.6 4h-4.2zM8 18h8v3H8z" fill="currentColor"/></svg>',
 person:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="4.5" fill="currentColor"/><path d="M3.5 21c0-5 3.8-7.5 8.5-7.5s8.5 2.5 8.5 7.5z" fill="currentColor"/></svg>',
 gift:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18v4H3zM4.5 13h15v8h-15z" fill="currentColor"/><path d="M12 9v12" stroke="#1b0d33" stroke-width="2"/><path d="M12 9C9 9 6.5 7.8 7.3 5.6 8.2 3.2 11 5.5 12 9c1-3.5 3.8-5.8 4.7-3.4.8 2.2-1.7 3.4-4.7 3.4z" fill="currentColor"/></svg>',
 shirt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3 3 6.3l2.4 4.4L7.5 9.6V21h9V9.6l2.1 1.1L21 6.3 15.5 3a3.5 3.5 0 0 1-7 0z" fill="currentColor"/></svg>',
 medal:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h4l2 5-2.6 2.2zM18 2h-4l-2 5 2.6 2.2z" fill="currentColor"/><circle cx="12" cy="15.5" r="6" fill="currentColor"/><path d="M9.8 13.3l4.4 4.4M14.2 13.3l-4.4 4.4" stroke="#1b0d33" stroke-width="1.8" stroke-linecap="round"/></svg>',
 crown:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 10H5z" fill="currentColor"/><path d="M5 20h14" stroke="currentColor" stroke-width="2"/></svg>',
 female:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="14" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10.4 12.6 4 19m0-4.5V19h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
 male:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="14" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M13.6 10.4 20 4m-4.5 0H20v4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};
const PF68_FLAGS={AE:'🇦🇪',SA:'🇸🇦',KW:'🇰🇼',QA:'🇶🇦',BH:'🇧🇭',OM:'🇴🇲',EG:'🇪🇬',JO:'🇯🇴',IQ:'🇮🇶',SY:'🇸🇾',LB:'🇱🇧',PS:'🇵🇸',YE:'🇾🇪',MA:'🇲🇦',DZ:'🇩🇿',TN:'🇹🇳',LY:'🇱🇾',SD:'🇸🇩'};
const pf68Flag=code=>typeof code==='string'&&/^[A-Z]{2}$/.test(code)?(PF68_FLAGS[code]||String.fromCodePoint(...[...code].map(c=>0x1f1e6+c.charCodeAt(0)-65))):'🏳️';
function pf68Top(ctx) {
 const coins=ctx.me&&finite(ctx.me.coins)?new Intl.NumberFormat('en-US').format(Number(ctx.me.coins)):'—';
 return `<header class="pf68-top" dir="ltr"><button type="button" class="pf68-round" data-pvp="pf-back" aria-label="رجوع">${PF68_SVG.back}</button><a class="pf68-logo" href="#/" aria-label="لعبك — الرئيسية"><b lang="ar">لعبك</b><small>LA3BAK</small></a>${ctx.user?`<a class="pf68-coins" href="#/wallet" aria-label="رصيدك ${coins} عملة — شحن"><i class="pf68-coin" aria-hidden="true">★</i><b>${coins}</b><span aria-hidden="true">+</span></a>`:'<span></span>'}</header>`;
}
function pf68Hero(ctx,s) {
 const m=ctx.me,id=playerID(ctx),fr=equipped(ctx,'frame'),background=equipped(ctx,'bg'),avatar=equipped(ctx,'avatar');
 const name=m?.name||ctx.user?.name||'الملف الشخصي';
 const vip=rankSummary(ctx,'vip'),vipN=vip.state==='earned'&&Number.isSafeInteger(vip.rank)&&vip.rank>=1?vip.rank:0;
 const nameCls=vipN&&ctx.accountSettings?.hideNameColor!==true&&m?.settings?.hideNameColor!==true?'rp-name-v'+vipN:'';
 const lv=finite(m?.level)?Number(m.level):null,span=m&&finite(m.xpNext)&&finite(m.xpFloor)?Math.max(1,m.xpNext-m.xpFloor):null,cur=span!==null&&finite(m.xp)?Math.max(0,Math.min(span,m.xp-m.xpFloor)):null;
 const pct=span&&cur!==null?Math.round(cur/span*100):0;
 const portrait=fr?frame(ctx,face(ctx,112),fr,112):`<span class="pf68-ring">${face(ctx,112)}</span>`;
 const cover=background?`<div class="lpu-cover pf68-cover" aria-hidden="true" data-pf67-full="1" data-pf67-rar="${esc(background.rarity||'')}" data-pf67-vip="${vipN}" data-pf67-flat="${ctx.accountSettings?.flatProfileBg===true||m?.settings?.flatProfileBg===true?1:0}">${bg(ctx,background)}</div>`:'<div class="pf68-cover is-default" aria-hidden="true"><img src="/assets/art58/pbg/p09.jpg" alt="" decoding="async"></div>';
 const g=m?.gender==='female'?['female','أنثى']:m?.gender==='male'?['male','ذكر']:null;
 const restricted=!ctx.user||ctx.noCommunity;
 const stat=(ic,label,value,attrs='')=>`<${attrs?'button type="button"':'div'} class="pf68-stat" ${attrs}>${PF68_SVG[ic]}<b dir="ltr">${value}</b><small>${label}</small></${attrs?'button':'div'}>`;
 const rate=m&&finite(m.played)&&Number(m.played)>0&&finite(m.wins)?`${new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(m.wins)/Number(m.played)*100)}%`:'—';
 const nob=rankSummary(ctx,'noble'),nobN=nob.state==='earned'&&Number.isSafeInteger(nob.rank)?nob.rank:0,anim=vipN>=10||nobN>=6?2:vipN>=5||nobN>=3?1:0;
 return `${pf68Top(ctx)}<section class="pf68-hero${anim?` pa68 t${anim}`:''}" data-pvp-section="identity" aria-label="هوية اللاعب">${anim?'<span class="pa68-fx" aria-hidden="true"><b></b><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>':''}<div class="pf68-coverbox">${cover}<div class="pf68-cover-fade" aria-hidden="true"></div></div>
 <div class="pf68-av" data-pvp-section="avatar-frame"><div class="pf68-portrait">${anim?'<span class="pa68-ring" aria-hidden="true"></span>':''}${portrait}</div>${ctx.user?`<button type="button" class="pf68-cam" data-pvp="upload-photo" aria-label="رفع وتغيير صورة اللاعب" ${typeof ctx.pickPhoto!=='function'?'disabled':''}>${PF68_SVG.cam}</button>`:''}</div>
 <div class="pf68-mid">
  ${ctx.user?`<button type="button" class="pf68-edit" data-pvp="edit" ${!m||typeof ctx.rename!=='function'||typeof ctx.savePresentation!=='function'?'disabled':''}>${PF68_SVG.pen}<span>تعديل الملف</span></button>`:'<span></span>'}
  <div class="pf68-who"><h1 class="pf68-name">${verificationBadge(ctx)}<span class="${nameCls}" title="${esc(name)}">${esc(name)}</span>${vipN?`<button type="button" class="pf68-vip" data-pvp="rank-system" data-system="vip" aria-label="VIP ${vipN}">VIP<small>${vipN}</small></button>`:''}</h1>
   <div class="pf68-id${specialID(ctx)?' lpu-special-id':''}" dir="ltr">${/^[1-9]\d{2}$/.test(String(id||''))?`<span class="aid68" data-pvp-player-id-wrap><b data-pvp-player-id>${esc(id)}</b><span class="aid68-tag">ADMIN</span><i class="aid68-v" title="موثّق من الإدارة"><svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="aidg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#ffd34d"/><stop offset="1" stop-color="#b8861c"/></linearGradient></defs><circle cx="12" cy="12" r="10.6" fill="#111114" stroke="url(#aidg)" stroke-width="2"/><path d="M7.4 12.2l3 3 6.2-6.4" fill="none" stroke="url(#aidg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></i></span>`:`<span>ID: <b data-pvp-player-id>${esc(id||'—')}</b></span>${specialID(ctx)?`<small class="lpu-special-id-label">ID مميّز</small>`:''}`}${id?`<button type="button" class="pf68-copy" data-pvp="copy" aria-label="نسخ رقم اللاعب">${PF68_SVG.copy}</button>`:''}</div></div>
  <button type="button" class="pf68-lv" data-pvp="rank-system" data-system="level" aria-label="المستوى ${lv??'—'} — التفاصيل"><span class="pf68-lvmedal"><i aria-hidden="true">${PF68_SVG.crown}</i><small>Lv.</small><b>${lv??'—'}</b></span><span class="pf68-lvbar"><span class="pf68-xp"><i style="width:${pct}%"></i></span><small dir="ltr">${cur!==null?`${fmt(cur)} / ${fmt(span)}`:'—'}</small></span></button>
 </div>
 ${ctx.user?`<button type="button" class="pf68-bio" data-pvp="edit-bio" aria-label="تعديل النبذة">${PF68_SVG.pen}<span>${esc(m?.bio||'اكتب نبذة عنك…')} <i aria-hidden="true">💜</i></span></button>`:''}
 <div class="pf68-chips"><span class="pf68-chip is-online"><i aria-hidden="true"></i>متصل الآن</span>${g?`<span class="pf68-chip is-${g[0]}">${PF68_SVG[g[0]]}${g[1]}</span>`:''}${m?.country?`<span class="pf68-chip">${pf68Flag(m.country)} ${esc(countryName(m.country))}</span>`:''}</div>
 <div class="pf68-stats" role="group" aria-label="إحصائيات">${stat('users','المتابعون',restricted?'—':headerCount(m?.followersCount),restricted?'':'data-pvp="self-follows" data-follow-kind="followers"')}${stat('follow','أتابع',restricted?'—':headerCount(m?.followingCount),restricted?'':'data-pvp="self-follows" data-follow-kind="following"')}${stat('pad','المباريات',fmt(m?.played))}${stat('trophy','نسبة الفوز',rate)}</div>
 ${avatar?'<p class="pvp-upload-note">أفاتار المتجر مجهّز الآن. لإظهار صورتك المرفوعة، أزله من «المقتنيات»؛ صورتك المحفوظة لا تُحذف.</p>':''}
 <nav class="pf68-tabs" role="tablist" aria-label="أقسام الملف">${PF68_TABS.map(([k,ic,label])=>`<button type="button" role="tab" aria-selected="${s.pfTab===k}" class="${s.pfTab===k?'is-on':''}" data-pvp="pf-tab" data-pf="${k}">${PF68_SVG[ic]}<span>${label}</span></button>`).join('')}</nav>
 </section>`;
}
function pf68Card(title,ic,body,action='',cls='') {
 return `<section class="pf68-card ${cls}"><header><h2>${ic?`<i aria-hidden="true">${PF68_SVG[ic]}</i>`:''}${title}</h2>${action?`<button type="button" class="pf68-more" ${action} aria-label="عرض ${title}">${PF68_SVG.chev}</button>`:''}</header>${body}</section>`;
}
function pf68Badges(ctx) {
 const out=[];
 for(const sys of ['vip','noble','level']){const r=rankSummary(ctx,sys);if(r.art)out.push(`<img src="${esc(r.art)}" alt="${esc(r.text)}" title="${esc(r.text)}" loading="lazy">`);}
 const eqb=equipped(ctx,'badge');if(eqb){const a=achArt(ctx,eqb);if(a)out.push(a);}
 for(const a of achievements(ctx).filter(a=>a.done===true)){if(out.length>=4)break;const art=achArt(ctx,a);if(art)out.push(art);}
 return out.length?`<div class="pf68-badges">${out.slice(0,4).map(h=>`<span class="pf68-badge">${h}</span>`).join('')}</div>`:'<p class="pf68-empty">لسا ما عندك شارات — العب وكمّل الإنجازات.</p>';
}
function pf68TopGames(ctx) {
 let ids=arr(ctx.me?.favoriteGames);
 if(!ids.length&&ctx.me?.allGames&&typeof ctx.me.allGames==='object')ids=Object.entries(ctx.me.allGames).filter(([,v])=>finite(v?.played)&&v.played>0).sort((a,b)=>b[1].played-a[1].played).map(([k])=>k);
 const games=ids.map(id=>arr(ctx.games).find(g=>g.id===id)).filter(Boolean).slice(0,6);
 if(!games.length)return '<p class="pf68-empty">اختار ألعابك المفضلة من السهم.</p>';
 return `<div class="pf68-games">${games.map((g,i)=>`<a class="pf68-game t${i%6}" href="#/${['ludo','baloot','jackaro'].includes(g.id)?'hub':'game'}/${encodeURIComponent(g.id)}" aria-label="فتح ${esc(g.name)}"><span class="pf68-gart">${gameArt(ctx,g)}</span><b>${esc(g.name)}</b></a>`).join('')}</div>`;
}
function pf68TabBody(ctx,s) {
 if(s.pfTab==='gifts'){
  const gc=ctx.me?.giftCounts||{};
  const row=(dir,label,n)=>ctx.user&&ctx.profileBridges?.giftLog===true?`<button type="button" class="pf68-row" data-pvp="gift-log" data-direction="${dir}">${PF68_SVG.gift}<span>${label}</span><b dir="ltr">${headerCount(n)}</b>${PF68_SVG.chev}</button>`:`<div class="pf68-row">${PF68_SVG.gift}<span>${label}</span><b dir="ltr">${headerCount(n)}</b></div>`;
  return `${profileGiftLog(ctx)}${pf68Card('الهدايا','gift',`<div class="pf68-rows">${row('incoming','الهدايا المستلمة',gc.recv)}${row('outgoing','الهدايا المرسلة',gc.sent)}</div>`)}`;
 }
 if(s.pfTab==='items')return `<div class="pf68-inline">${souvenirShelf(ctx)}${inventory(ctx,s)}</div>`;
 if(s.pfTab==='ach')return `<div class="pf68-inline">${honors(ctx)}${pf68Card('الإنجازات','medal',inventoryBody(ctx,{...s,tab:'achievements'}))}</div>`;
 const av=face(ctx,96),fr=equipped(ctx,'frame');
 return `${pf68Card('شاراتي','crown',pf68Badges(ctx),'data-pvp="pf-tab" data-pf="ach"','is-badges')}
 <div class="pf68-two">${pf68Card('صورتي الرمزية','',`<div class="pf68-avcard">${av}</div>`,ctx.user?'data-pvp="edit-appearance"':'')}${pf68Card('إطاري','',`<div class="pf68-frcard">${fr?frame(ctx,'<span class="pf68-blank"></span>',fr,96):'<span class="pf68-noframe">بدون إطار</span>'}</div>`,'data-pvp="pf-tab" data-pf="items" data-slot="frame"')}</div>
 ${pf68Card('أفضل الألعاب','pad',pf68TopGames(ctx),ctx.user?'data-pvp="edit-favorites"':'')}
 ${profileMenu(ctx,s)}${familyCard(ctx,s)}${ctx.user?'<div data-cp-me></div><div data-bonds-me></div><div data-tribe-me class="tr58-me"></div><div data-kingdom-me></div>':''}${savedRoomsCard(ctx,s)}`;
}

export function profileHTML(ctx={}) {
 if(typeof document!=='undefined' && (specialID(ctx) || ctx.me?.verificationKind==='administration'))ensureOwnerToolsCss();
 const s=state(ctx);s.ctx=ctx;activeState=s;
 if(requestedTab){s.tab=requestedTab;s.collectionOpen=true;requestedTab=null;}
 const journey=s.rankOpen?renderRankOverview({...ctx,rankOverviewOpen:true,profileJourneyDefault:false,rankRewards:s.rankRewards??ctx.rankRewards,rankRewardsLoading:s.rankLoading,rankRewardsError:s.rankError,rankClaimPending:s.rankPending},s.rankSystem):'';
 const error=ctx.error || s.error;
 if(!s.pfTab)s.pfTab='profile';
 return `<article class="pv-profile lpu pvp-page pvp-profile-r15 pvp-profile-r19 pf68" data-profile-build="profile-r68" dir="rtl">${pf68Hero(ctx,s)}<div data-pvp-status class="lpu-status" ${error?'role="alert"':'role="status"'} aria-live="polite">${esc(error || s.message || (ctx.loading?'جاري تحميل بيانات حسابك…':''))}${ctx.error&&typeof ctx.refreshMe==='function'?button('account-retry','إعادة تحميل الحساب','','pvp-text-button'):''}</div><div class="pf68-body" role="tabpanel">${s.rankOpen?`<div class="pvp-rank-details">${rankCards(ctx,s)}${journey}</div>`:''}${pf68TabBody(ctx,s)}</div>${!ctx.user?`<section class="lpu-login">${guestStart(ctx)}${ctx.googleCard?ctx.googleCard():''}</section>`:ctx.google===false&&ctx.googleCard?`<details class="lpu-google-details"><summary>حماية حساب الضيف بربطه بـ Google</summary>${ctx.googleCard()}</details>`:''}${referenceBottomNav(ctx)}${collection(ctx,s)}${editor(ctx,s)}</article>`;
}

function redraw(s) {
  if (typeof s.ctx.render === 'function') s.ctx.render();
  else if (s.root?.isConnected) { const root=s.root; root.innerHTML=profileHTML(s.ctx); mountProfile(root,s.ctx); }
}
function announce(s,message,error=false) { s.error=error ? message : ''; s.message=error ? '' : message; s.ctx.toast?.(message,error); }
function openEditor(s,type,trigger) {
  if (!s.ctx.user || !s.ctx.me || s.pending) return;
  s.draft=beginDraft(s.ctx); s.editor=type; s.error=''; s.message='';
  s.focusReturn=trigger?.dataset.pvp || 'edit'; redraw(s);
  requestAnimationFrame(() => s.root?.querySelector(type === 'account' ? '#pvp-name-input' : '.pvp-editor [data-pvp="close"]')?.focus());
}
function closeEditor(s) {
  if (s.pending) return;
  s.editor=null;s.draft=null;s.error='';s.message='';redraw(s);
  requestAnimationFrame(() => s.root?.querySelector(`[data-pvp="${s.focusReturn || 'edit'}"]`)?.focus());
}
function setDrawer(page, open) {
  const drawer = page.querySelector('[data-pvp-drawer]');
  const backdrop = page.querySelector('.pvp-drawer-backdrop');
  const trigger = page.querySelector('.pvp-menu-trigger');
  if (!drawer || !backdrop) return;
  drawer.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  backdrop.hidden = !open;
  trigger?.setAttribute('aria-expanded', String(open));
}
async function call(fn,...args) {
  if (typeof fn !== 'function') return {ok:false,error:'هذه العملية غير متاحة حاليًا.'};
  try { return await fn(...args) ?? {ok:false,error:'لم يصل تأكيد الحفظ من الخادم.'}; }
  catch (e) { return {ok:false,error:e?.message || 'تعذّر الاتصال بالخادم. لم نؤكد حفظ التغييرات.'}; }
}
const rankActive = (s,id) => activeState === s && s.mounted && s.root?.isConnected
  && (s.root.matches?.('.pv-profile') || s.root.querySelector?.('.pv-profile'))
  && String(s.ctx.user?.id ?? '__visitor') === id;
async function loadRankRewards(s,force=false) {
  const id=String(s.ctx.user?.id ?? '__visitor'),api=s.ctx.api;
  if(!s.ctx.user || typeof api!=='function' || s.rankLoading || (!force && (s.rankRewards || s.rankError)))return;
  const request=++s.rankRequest;
  s.rankLoading=true;s.rankError='';redraw(s);
  try {
    const data=await api('/api/rank-rewards','GET');
    if(!rankActive(s,id) || request!==s.rankRequest)return;
    if(!data || data.ok===false || (!Array.isArray(data.list) && !Array.isArray(data.policies)) || !Array.isArray(data.claims))throw Error('تعذّر قراءة مكافآت الحساب من الخادم.');
    s.rankRewards=data;
  } catch(e) {
    if(!rankActive(s,id) || request!==s.rankRequest)return;
    s.rankError=e?.message || 'تعذّر تحميل مكافآت الحساب. أعد المحاولة.';
  } finally {
    if(request===s.rankRequest){s.rankLoading=false;if(rankActive(s,id))redraw(s);}
  }
}
function selectRank(s,system) {
  if(!['level','vip','noble'].includes(system))return;
  s.rankOpen=true;s.rankSystem=system;redraw(s);
  requestAnimationFrame(()=>{const target=s.root?.querySelector(`#pvp-rank-tab-${system}`);target?.focus({preventScroll:true});target?.scrollIntoView?.({block:'nearest',behavior:'auto'});});
}
async function claimRankReward(s,el) {
  if(s.rankPending || s.pending || !s.ctx.user || typeof s.ctx.api!=='function')return;
  const {system,rank,fingerprint}=el.dataset;
  if(!['level','vip','noble'].includes(system) || !/^[1-9][0-9]{0,2}$/.test(rank || '') || !/^[a-f0-9]{64}$/.test(fingerprint || ''))return;
  // Revalidate the exact action against the safe renderer, not a client rank alone.
  const allowed=renderRankOverview({...s.ctx,rankOverviewOpen:true,rankRewards:s.rankRewards??s.ctx.rankRewards});
  const action=`data-pvp="rank-claim" data-system="${system}" data-rank="${rank}" data-fingerprint="${fingerprint}"`;
  if(s.rankError || s.rankLoading || !allowed.includes(action))return;
  const ctx=s.ctx,id=String(ctx.user.id);
  s.rankPending=true;s.error='';s.message='جارٍ استلام المكافأة…';redraw(s);
  try {
    const result=await ctx.api('/api/rank-rewards/'+encodeURIComponent(`${system}:${rank}`)+'/claim','POST',{fingerprint});
    if(!rankActive(s,id))return;
    if(result?.ok!==true)throw Error(result?.error || 'لم يصل تأكيد استلام المكافأة.');
    announce(s,'تم استلام المكافأة. يتم تحديث بيانات حسابك من الخادم.');
    // Host api already refreshes after claims; refreshMe preserves that contract for other hosts.
    try { await ctx.refreshMe?.(); } catch { if(rankActive(s,id))announce(s,'تم حفظ المكافأة؛ تعذّر تحديث بيانات الحساب. أعد فتح الملف.',true); }
  } catch(e) {
    if(rankActive(s,id))announce(s,e?.message || 'تعذّر الاستلام. سنراجع سجل الخادم قبل إعادة المحاولة.',true);
  } finally {
    s.rankPending=false;
    if(rankActive(s,id)){s.rankRewards=null;await loadRankRewards(s,true);if(rankActive(s,id))redraw(s);}
  }
}
async function copyID(s,el) {
  const id=playerID(s.ctx);
  if (!id) return;
  let copied=false;
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(id);copied=true; } } catch { /* permissions fallback below */ }
  if (!copied) {
    const input=document.createElement('textarea'); input.value=id;input.setAttribute('readonly','');input.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0'; document.body.append(input);input.select();
    try { copied=document.execCommand('copy') === true; } catch { copied=false; }
    input.remove();el.focus();
  }
  announce(s,copied ? 'تم نسخ المعرف' : 'تعذّر النسخ. يمكنك تحديد المعرّف الكامل ونسخه يدويًا.',!copied);
  el.setAttribute('aria-label',copied ? 'تم نسخ المعرف' : 'إعادة محاولة نسخ معرف اللاعب');
  const status=s.root?.querySelector('[data-pvp-status]');if(status)status.textContent=s.error || s.message;
}
async function equipOne(s,el) {
  if (s.pending || !s.ctx.me) return;
  const {item,slot,remove}=el.dataset;
  if (!SLOTS.includes(slot) || !ownedItems(s.ctx,slot).some(i => i.id === item)) { announce(s,'لا يمكنك تجهيز عنصر غير مملوك أو غير مستحق.',true);redraw(s);return; }
  s.pending=true;s.error='';s.message='';redraw(s);
  const r=await call(s.ctx.equip,item,slot,remove === '1');
  s.pending=false;
  announce(s,r.ok === true ? 'تم الحفظ في حسابك' : r.error || 'لم يتم حفظ التغيير.',r.ok !== true);redraw(s);
}
async function saveForm(s,type) {
  if (s.pending || !s.draft || !s.ctx.me) return;
  const d=s.draft; const operations=[];
  if (type === 'appearance') {
    for (const slot of ['avatar','frame','bg']) {
      const id=d.equipment[slot];
      if (id === d.baseEquipment[slot]) continue;
      if (id && !ownedItems(s.ctx,slot).some(i => i.id === id)) {s.error='أحد العناصر غير مملوك لحسابك. أعد فتح المحرر.';redraw(s);return;}
      operations.push({label:LABEL[slot],run:() => call(s.ctx.equip,id || null,slot,!id),done:() => {d.baseEquipment[slot]=id;}});
    }
  } else if (type === 'favorites') {
    if (d.favoriteGames.length > 8 || d.favoriteGames.some(id => !arr(s.ctx.games).some(g => g.id === id))) {s.error='اختر حتى 8 ألعاب متاحة فقط.';redraw(s);return;}
    operations.push({label:'الألعاب المفضلة',run:() => call(s.ctx.savePresentation,{bio:String(s.ctx.me?.bio ?? ''),favoriteGames:[...d.favoriteGames]})});
  } else {
    const name=d.name.trim();
    if (name.length < 2 || name.length > 20 || d.bio.length > 240) {s.error='الاسم من حرفين إلى 20 حرفًا والنبذة لا تزيد عن 240 حرفًا.';redraw(s);return;}
    if (name !== String(s.ctx.user?.name ?? s.ctx.me?.name ?? '')) operations.push({label:'الاسم',run:() => call(s.ctx.rename,name)});
    if (d.bio !== String(s.ctx.me?.bio ?? '')) operations.push({label:'النبذة',run:() => call(s.ctx.savePresentation,{bio:d.bio,favoriteGames:[...arr(s.ctx.me?.favoriteGames)]})});
    const personalPatch={}; for(const k of ['country','gender','birthDate']) if(d[k]!==String(s.ctx.me?.[k]??''))personalPatch[k]=d[k];
    if(Object.keys(personalPatch).length)operations.push({label:'معلومات الحساب',run:()=>call(s.ctx.savePresentation,personalPatch)});
  }
  if (!operations.length) {s.message='لا توجد تغييرات للحفظ.';s.error='';redraw(s);return;}
  s.pending=true;s.error='';s.message='جارٍ حفظ التغييرات في حسابك…';redraw(s);
  const saved=[];
  for (const op of operations) {
    const r=await op.run();
    if (r.ok !== true) {
      s.pending=false;s.message='';s.error=`${saved.length ? `تم حفظ ${saved.join('، ')}. ` : ''}تعذّر حفظ ${op.label}: ${r.error || 'لم يصل تأكيد الخادم.'} لم تُحفظ الخانات التالية. يمكنك المحاولة مجددًا.`;
      s.ctx.toast?.(s.error,true);redraw(s);return;
    }
    op.done?.();saved.push(op.label);s.message=`تم حفظ ${saved.join('، ')}${saved.length < operations.length ? '، جارٍ إكمال البقية…' : ''}`;
  }
  s.pending=false;s.editor=null;s.draft=null;announce(s,'تم الحفظ في حسابك');redraw(s);
}
/** Mount delegated listeners once per host root; returns an idempotent cleanup.
 * The host must refetch me + shop on successful mutations before resolving them.
 * The host must call its existing AUTH.mount for #gBtn after rendering googleCard.
 */
export function mountProfile(root,ctx = {}) {
  mounts.get(root)?.();
  const page=root.matches?.('.pv-profile') ? root : root.querySelector('.pv-profile');
  if (!page) return () => {};
  const s=state(ctx);s.ctx=ctx;s.root=root;s.mounted=true;activeState=s;
  void loadProfileExtras(s);
  const abort=new AbortController(); const opts={signal:abort.signal};
  const click=async event => {
    const el=event.target.closest?.('[data-pvp]');if(!el || !page.contains(el))return;
    const action=el.dataset.pvp;
    if (action === 'backdrop' && event.target !== el) return;
    if (action === 'collection-close' && event.target !== el && el.tagName !== 'BUTTON') return;
    event.preventDefault();event.stopPropagation();
    if (action === 'restricted') {announce(s,'هذا القسم مقفل بإعدادات ولي الأمر.',true);redraw(s);return;}
    if (action === 'self-follows') {if(ctx.user&&!ctx.noCommunity&&['following','followers'].includes(el.dataset.followKind)&&typeof ctx.onAction==='function')return ctx.onAction('self-follows',el.dataset.followKind);return;}
    if (action === 'self-posts') {if(ctx.user&&!ctx.noCommunity&&ctx.profileBridges?.selfPosts===true&&typeof ctx.onAction==='function')return ctx.onAction('self-posts');return;}
    if (action === 'gift-log') {if(ctx.user&&ctx.profileBridges?.giftLog===true&&typeof ctx.onAction==='function'&&['incoming','outgoing'].includes(el.dataset.direction))return ctx.onAction('gift-log',el.dataset.direction);return;}
    if (action === 'account-retry') {
      if(s.pending||typeof ctx.refreshMe!=='function')return;
      s.pending=true;redraw(s);
      try {await ctx.refreshMe();} catch(e) {announce(s,e?.message||'تعذّر تحديث الحساب. أعد المحاولة.',true);}
      finally {s.pending=false;redraw(s);}return;
    }
    if (action === 'pf-back') {if(history.length>1)history.back();else (globalThis.__LA3BAK_NAV__||location).hash='#/';return;}
    if (action === 'pf-tab') {const k=el.dataset.pf;if(PF68_TABS.some(([x])=>x===k)){s.pfTab=k;if(k==='items'&&el.dataset.slot&&TABS.some(([x])=>x===el.dataset.slot))s.tab=el.dataset.slot;else if(k==='items'&&s.tab==='achievements')s.tab='inventory';s.collectionOpen=false;redraw(s);requestAnimationFrame(()=>s.root?.querySelector('.pf68-tabs')?.scrollIntoView({block:'start',behavior:'smooth'}));}return;}
    if (action === 'copy') return copyID(s,el);
    if (action === 'hub-toggle') {s.hubOpen=!s.hubOpen;try{sessionStorage.setItem('la3bak:profile-hub',s.hubOpen?'1':'');}catch{}redraw(s);requestAnimationFrame(()=>s.root?.querySelector('[data-pvp-hub-toggle]')?.focus({preventScroll:true}));return;}
    if (action === 'rank-system') return selectRank(s,el.dataset.system);
    if (action === 'rank-close') {s.rankOpen=false;redraw(s);requestAnimationFrame(()=>s.root?.querySelector('.pvp-profile-menu [data-pvp="rank-system"]')?.focus({preventScroll:true}));return;}
    if (action === 'rank-retry') return loadRankRewards(s,true);
    if (action === 'rank-claim') return claimRankReward(s,el);
    if (action === 'menu') {s.menu=true;redraw(s);requestAnimationFrame(()=>s.root?.querySelector('[data-pvp=menu-close]')?.focus());return;}
    if (action === 'menu-close') {s.menu=false;redraw(s);requestAnimationFrame(()=>s.root?.querySelector('[data-pvp=menu]')?.focus());return;}
    if (action === 'collection-close') {if(event.target===el || el.tagName==='BUTTON'){s.collectionOpen=false;redraw(s);requestAnimationFrame(()=>s.root?.querySelector('.pvp-profile-menu [data-pvp="tab"]')?.focus());}return;}
    if (action === 'upload-photo') {if(!ctx.user){announce(s,'سجّل الدخول قبل حفظ صورة حسابك.',true);redraw(s);return;}ctx.pickPhoto?.();return;}
    if (action === 'drawer-close' || action === 'drawer-link') { setDrawer(page, false); if (action === 'drawer-close') return; }
    if (s.pending) return;
    if (action === 'tab' && s.pfTab==='items' && el.closest('.pf68-inline')) {if(TABS.some(([key])=>key===el.dataset.tab)){s.tab=el.dataset.tab;redraw(s);}return;}
    if (action === 'tab') {if(TABS.some(([key])=>key===el.dataset.tab)){s.tab=el.dataset.tab;s.collectionOpen=true;redraw(s);requestAnimationFrame(()=>s.root?.querySelector(`#pvp-tab-${s.tab}`)?.focus());}return;}
    if (action === 'shop') {if(typeof ctx.onAction === 'function')ctx.onAction('shop',el.dataset.slot);else (globalThis.__LA3BAK_NAV__ || location).hash='#/shop';return;}
    if (action === 'edit' || action === 'edit-bio' || action === 'edit-personal') return openEditor(s,'account',el);
    if (action === 'edit-appearance') {s.collectionOpen=false;return openEditor(s,'appearance',el);}
    if (action === 'edit-favorites') return openEditor(s,'favorites',el);
    if (action === 'close' || action === 'backdrop') return closeEditor(s);
    if (action === 'editor-tab') {s.editor=el.dataset.editor;s.error='';s.message='';redraw(s);requestAnimationFrame(()=>s.root?.querySelector('.pvp-editor [data-pvp="close"]')?.focus());return;}
    if (action === 'equip') return equipOne(s,el);
    if (action === 'logout') {
      if (!ctx.google) {announce(s,'لا تسجّل خروج حساب الضيف قبل ربط Google؛ لا يمكن استعادته بالاسم وحده.',true);redraw(s);s.root?.querySelector('.lpu-google-details')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
      if (!window.confirm('تسجيل الخروج من هذا الجهاز؟ يمكنك العودة إلى حسابك باستخدام Google المرتبط.')) return;
      s.pending=true;redraw(s);const r=await call(ctx.logout);s.pending=false;
      if (r.ok !== true && s.root?.isConnected) {announce(s,r.error || 'تعذّر تسجيل الخروج.',true);redraw(s);}
    }
  };
  page.addEventListener('click',click,opts);
  const typing=el=>!!el&&/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)&&!['checkbox','radio','button','submit','range','file'].includes(el.type);
  page.addEventListener('focusin',event=>page.classList.toggle('pvp-keyboard-open',typing(event.target)),opts);
  page.addEventListener('focusout',()=>queueMicrotask(()=>page.classList.toggle('pvp-keyboard-open',typing(document.activeElement))),opts);
  page.addEventListener('input',event => {
    const el=event.target;if(!s.draft || s.pending)return;
    if(el.id === 'pvp-name-input')s.draft.name=el.value;
    if(el.id === 'pvp-bio-input'){s.draft.bio=el.value;const count=page.querySelector('[data-pvp-bio-count]');if(count)count.textContent=`${el.value.length} / 240`;}
  },opts);
  page.addEventListener('change',event => {
    const el=event.target;if(!s.draft || s.pending)return;
    if(['pvp-country','pvp-gender','pvp-birthDate'].includes(el.id))s.draft[el.name]=el.value;
    if (el.matches('[data-pvp-equipment]')) {s.draft.equipment[el.dataset.pvpEquipment]=el.value;redraw(s);requestAnimationFrame(()=>s.root?.querySelector(`#${el.id}`)?.focus());}
    if (el.matches('input[name="favoriteGames"]')) {
      if(el.checked && s.draft.favoriteGames.length >= 8){el.checked=false;const msg='يمكن اختيار 8 ألعاب كحد أقصى.';ctx.toast?.(msg,true);const count=page.querySelector('[data-pvp-favorite-count]');if(count)count.textContent=msg;return;}
      s.draft.favoriteGames=[...new Set(el.checked ? [...s.draft.favoriteGames,el.value] : s.draft.favoriteGames.filter(id=>id!==el.value))];
      const count=page.querySelector('[data-pvp-favorite-count]');if(count)count.textContent=`${s.draft.favoriteGames.length} / 8`;
    }
  },opts);
  page.addEventListener('submit',event=>{const form=event.target.closest('[data-pvp-form]');if(!form)return;event.preventDefault();event.stopPropagation();saveForm(s,form.dataset.pvpForm);},opts);
  page.addEventListener('keydown',event=>{
    if(s.editor||s.collectionOpen){
      if(event.key==='Escape'){event.preventDefault();if(s.collectionOpen){s.collectionOpen=false;redraw(s);requestAnimationFrame(()=>s.root?.querySelector('.pvp-profile-menu [data-pvp="tab"]')?.focus());}else closeEditor(s);}
      if(event.key==='Tab'){
        const dialog=page.querySelector('.pvp-editor');const focusable=[...dialog.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>!el.hidden);
        const first=focusable[0],last=focusable.at(-1);
        if(!first){event.preventDefault();dialog.focus();}else if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
      }
    } else if(s.menu&&event.key==='Tab') {
      const focusable=[...page.querySelectorAll('.lpu-drawer a[href],.lpu-drawer button:not(:disabled)')];
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    } else if(event.target.matches('[role="tab"][data-pvp="rank-system"]') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault();const systems=['level','vip','noble'],index=systems.indexOf(s.rankSystem);
      const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:-1)+3)%3;selectRank(s,systems[next]);
    } else if(event.key==='Escape' && s.rankOpen && event.target.closest?.('#pvp-rank-overview')){page.querySelector('[data-pvp="rank-close"]')?.click();
    } else if(event.key==='Escape' && s.menu){s.menu=false;redraw(s);requestAnimationFrame(()=>s.root?.querySelector('[data-pvp=menu]')?.focus());
    } else if(event.key==='Escape' && s.collectionOpen){s.collectionOpen=false;redraw(s);
    } else if(event.target.matches('[role="tab"][data-pvp="tab"]') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault();const index=TABS.findIndex(([key])=>key===s.tab);const next=event.key==='Home'?0:event.key==='End'?TABS.length-1:(index+(event.key==='ArrowLeft'?1:-1)+TABS.length)%TABS.length;
      page.querySelector(`#pvp-tab-${TABS[next][0]}`)?.click();
    }
  },opts);
  document.addEventListener('keydown',event=>{if(s.menu && event.key==='Escape'){event.preventDefault();s.menu=false;redraw(s);requestAnimationFrame(()=>s.root?.querySelector('[data-pvp=menu]')?.focus());}},opts);
  // An open modal keeps the rest of the profile out of keyboard/AT navigation.
  for(const el of page.children) {
    if(el.classList.contains('lpu-drawer'))el.inert=!!(s.editor||s.collectionOpen)||!s.menu;
    else if(!el.classList.contains('pvp-modal-backdrop'))el.inert=!!(s.editor||s.collectionOpen)||(s.menu&&!el.classList.contains('lpu-drawer-backdrop'));
  }
  const cleanup=()=>{abort.abort();if(mounts.get(root)===cleanup){mounts.delete(root);s.mounted=false;}};mounts.set(root,cleanup);
  queueMicrotask(()=>{if(rankActive(s,String(ctx.user?.id ?? '__visitor')))void loadRankRewards(s);});
  return cleanup;
}
