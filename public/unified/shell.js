import { SEARCH_ICON } from './search-icon.js?v=global-search-r17';
import { nav68HTML } from '../nav-r68.js?v=r68q';
import { headerHTML as head68 } from './home-r68.js?v=r68z5';
import * as home from './home.js?v=r68z5';
import {renderProfileIcon as icon} from '../preview/assets/profile/ui-icons-inline.js?v=r58p';
import {giftArt} from '../giftart.js?v=r68i-r14';
import * as rooms from './rooms.js?v=r58p';
import * as wallet from './wallet.js?v=r68i';
import * as notifications from './notifications.js?v=r68z15';
import * as messages from './messages.js?v=r68h';
import * as friends from './friends.js?v=r58p';
import * as drawer from './drawer.js?v=r68l';
import * as ranking from './ranking.js?v=r68m';
import * as games from './games.js?v=r68z16';
import * as settings from './settings.js?v=r58p';
import * as store from './store.js?v=r68z16';
import * as payments from './payments.js?v=r68i';
import * as ranks from './ranks.js?v=r68z16';
import * as vip from './vip.js?v=r68z16';
import * as social from './social.js?v=r68z16';
const modules={home,rooms,wallet,notifications,messages,friends,ranking,games,settings,store,payments,ranks,vip,social};
export const routes=Object.freeze(['home','rooms','social-rooms','social-room','wallet','notifications','notifications-internal','messages','friends','leaderboard','games','settings','shop','payments','ranks','vip','game','hub','room','join','city','lobby','play','offline','daily','challenge','events','tournaments','support','contact','auction','family','missions','wheel','phone','ids','visitors','invite','verification','rank-rewards','about','privacy','terms','agreement','privacy-settings','account-info','devices','hidden-posts','community','post','u','not-found']);
export const hasRoute=name=>routes.includes(name);
const pageKey=name=>({leaderboard:'ranking',shop:'store','social-rooms':'social','social-room':'social'}[name]||name);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('en-US'):'—';
const plus='<svg class="lb-plus-mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const protectedRoute=href=>/^#\/(community|post|u|social-rooms|social-room|notifications|friends|messages|family)(?:\/|$)/.test(href||'');
const lockedText='التواصل الاجتماعي مقفل من إعدادات ولي الأمر. يمكنك استخدام الألعاب المحمية دون تفعيل المجتمع.';
let openDrawerScope=null;
export function resetDrawerState(){openDrawerScope=null;}
function identityHTML(ctx){
  const me=ctx.walletOwnerId===ctx.user?.id?ctx.me:null;
  const name=me?.name||ctx.user?.name||'اللاعب';
  let avatar=icon('person');
  if(me&&typeof ctx.avatarHTML==='function'){
    try{const html=ctx.avatarHTML.length>=2?ctx.avatarHTML(me,36):ctx.avatarHTML(36);if(typeof html==='string'&&html)avatar=html;}catch{/* Optional art must not interrupt navigation. */}
  }
  const level=typeof me?.level==='number'&&Number.isFinite(me.level)?`<small class="lb-head-level">المستوى <bdi>${fmt(me.level)}</bdi></small>`:'';
  return `<a class="lb-head-identity" href="#/profile" dir="rtl" aria-label="الملف الشخصي: ${esc(name)}"><span class="lb-head-avatar">${avatar}</span><span class="lb-head-account-copy"><small dir="ltr">LA3BAK <span lang="ar">| لعبك</span></small><b>${esc(name)}</b>${level}</span><span class="conn lb-head-connection${ctx.connected?'':' off'}" id="conn" aria-label="${ctx.connected?'متصل بالخادم':'جاري الاتصال بالخادم'}"><i aria-hidden="true"></i><b class="lb-visually-hidden">${ctx.connected?'متصل':'جاري الاتصال…'}</b></span></a>`;
}
/* R68l: رأس الصفحات الداخلية بتصميم لعبك: رجوع · الشعار · البحث والإشعارات */
function header68(ctx){
  const bell=ctx.noCommunity?'':`<a class="lb68-ico" href="#/notifications" aria-label="الإشعارات"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4.2L4.4 16a1 1 0 0 0 .9 1.5h13.4a1 1 0 0 0 .9-1.5L18 13.2V9a6 6 0 0 0-6-6zM9.5 19a2.5 2.5 0 0 0 5 0" fill="#e7d2ff"/></svg>${ctx.unread?'<i class="lb68-dot"></i>':''}</a>`;
  return `<header class="lb-topbar lb68-head" dir="ltr"><a class="lb68-ico lb68-back" href="${esc(ctx.backHref||'#/')}" aria-label="رجوع"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a><a class="lb68-logo" href="#/" aria-label="لعبك — الرئيسية"><i aria-hidden="true">👑</i><b>لعبك</b><small>LA3BAK</small></a><span class="lb68-tools"><button type="button" class="lb68-ico" data-lb-global-search aria-label="البحث عن الأشخاص والغرف" aria-haspopup="dialog" aria-expanded="false">${SEARCH_ICON}</button>${bell}</span></header>`;
}
export function headerHTML(ctx={}){
  if(ctx.page!=='home')return header68(ctx);
  const homeAccount=ctx.page==='home'&&!!ctx.user;
  const notificationsLink=ctx.noCommunity?`<button type="button" data-lb-locked aria-disabled="true" aria-label="الإشعارات الاجتماعية مقفلة">${icon('bell')}</button>`:`<a href="#/notifications" aria-label="الإشعارات">${icon('bell')}${ctx.unread?'<i class="lb-unread-dot"></i>':''}</a>`;
  return `<header class="lb-topbar lb-compact-topbar${homeAccount?' lb-home-wallet-header':''}" dir="ltr"><div class="lb-head-row"><nav class="lb-head-tools" aria-label="البحث والإشعارات والترتيب"><button type="button" data-lb-global-search aria-label="البحث عن الأشخاص والغرف" aria-haspopup="dialog" aria-expanded="false">${SEARCH_ICON}</button>${notificationsLink}<a href="#/leaderboard" aria-label="الترتيب">${icon('trophy')}</a></nav>${homeAccount?identityHTML(ctx):`<a class="lb-brand" href="#/" aria-label="LA3BAK | لعبك — الرئيسية"><img src="/preview/assets/profile/icon-game.svg" alt=""><b dir="ltr">LA3BAK <span lang="ar">| لعبك</span></b></a>`}${/* R60: زر ☰ انشال بطلب المالك؛ روابطه موجودة بالشريط وملفي، والمزادات والبطولات والأخبار انتقلت للرئيسية */''}</div>${homeAccount?walletStripHTML(ctx):''}</header>`;
}
// Both currency artworks are existing transparent vectors. No financial writes.
export function walletStripHTML(ctx={}){
  if(ctx.page!=='home'||!ctx.user||!ctx.me||ctx.walletOwnerId!==ctx.user.id)return '';
  return `<section class="lb-wallet-strip" aria-label="رصيد حسابك" dir="ltr">${[['coins','العملات']].map(([key,label])=>`<div class="lb-wallet-capsule"><span class="lb-wallet-art" role="img" aria-label="${label}">${key==='coins'?icon('coin'):giftArt({motif:'diamond',cat:'luxury',variant:0,name:label},32)}</span><span class="lb-wallet-value"><small>${label}</small><b data-lb-balance="${key}" dir="ltr">${fmt(ctx[key]??ctx.me?.[key])}</b></span><a href="#/shop/packs/${key}" class="lb-wallet-plus" aria-label="فتح باقات ${label}">${plus}</a></div>`).join('')}</section>`;
}
export function bottomHTML(page,ctx={}){
  // R68b: الشريط السفلي الجديد بتصميم المالك
  return nav68HTML(page,{locked:url=>!!ctx.noCommunity&&protectedRoute(url)});
}
function drawerHTML(ctx){
  const html=drawer.render(ctx);
  if(!ctx.noCommunity)return html;
  // Change only existing trusted drawer links, leaving its module/handlers intact.
  return html.replace(/<a\b([^>]*\bdata-lb-drawer-route="([^"]+)"[^>]*)>/g,(match,attrs,route)=>protectedRoute('#/'+route)?`<a${attrs.replace(/\s+href="[^"]*"/,'').replace(/\s+aria-current="[^"]*"/,'')} role="button" tabindex="0" data-lb-locked aria-disabled="true" title="${esc(lockedText)}">`:match);
}
export function pageHTML(ctx){
  const key=pageKey(ctx.page);const locked=ctx.noCommunity&&protectedRoute('#/'+ctx.page);const mod=ctx.contentOnly||locked?null:modules[key];
  const meta=true?'':`<div class="lb-route-meta"><a class="lb-route-back" href="${esc(ctx.backHref||'#/')}" aria-label="رجوع">رجوع</a>${ctx.user?`<span class="lb-route-connection${ctx.connected?'':' lb-offline'}"><i aria-hidden="true"></i>${ctx.connected?'متصل':'جاري الاتصال…'}</span>`:''}</div>`;
  const body=locked?`<section class="panel empty-state" role="status"><p>${esc(lockedText)}</p><a class="btn" href="#/">الرئيسية</a></section>`:mod?.render(ctx)??ctx.content??'';
  return `<article class="lb-unified" data-lb-release="reference-milestone-1" data-lb-route="${esc(key)}" dir="rtl">${ctx.page==='shop'?`<div class="h68 h68-shophead">${head68(ctx)}</div>`:headerHTML(ctx)}${meta}<main class="lb-content" data-lb-page="${key}">${body}</main>${bottomHTML(ctx.page,ctx)}${ctx.page==='home'?home.footerHTML(ctx):''}<div class="lb-backdrop" data-lb-shell="close" hidden></div><aside class="lb-drawer" aria-label="القائمة الجانبية" aria-hidden="true" inert>${drawerHTML(ctx)}</aside><p class="lb-visually-hidden" data-lb-lock-status role="status" aria-live="polite"></p></article>`;
}
export function mount(root,ctx){
  const key=pageKey(ctx.page);const pageRoot=root.querySelector('[data-lb-page]');const shell=root.querySelector('.lb-unified');const aside=shell?.querySelector('.lb-drawer');const backdrop=shell?.querySelector('.lb-backdrop');let oldFocus;
  const scope=JSON.stringify([ctx.page,ctx.user?.id??null]);
  if(openDrawerScope!==scope)openDrawerScope=null;
  const close=()=>{openDrawerScope=null;if(!aside)return;aside.classList.remove('lb-open');aside.setAttribute('aria-hidden','true');aside.inert=true;if(backdrop)backdrop.hidden=true;shell.querySelector('[data-lb-shell="menu"]')?.setAttribute('aria-expanded','false');oldFocus?.focus?.();};
  const open=t=>{if(!aside||!backdrop)return;openDrawerScope=scope;oldFocus=t;aside.inert=false;aside.setAttribute('aria-hidden','false');aside.classList.add('lb-open');backdrop.hidden=false;t?.setAttribute('aria-expanded','true');aside.querySelector('button,a')?.focus();};
  const explain=()=>{const status=shell?.querySelector('[data-lb-lock-status]');if(status)status.textContent=lockedText;ctx.toast?.(lockedText);};
  const click=e=>{const locked=e.target.closest?.('[data-lb-locked]');const link=e.target.closest?.('a[href]');if(locked||(ctx.noCommunity&&protectedRoute(link?.getAttribute('href')))){e.preventDefault();e.stopPropagation();explain();return;}const t=e.target.closest?.('[data-lb-shell]');if(t){if(t.dataset.lbShell==='menu')open(t);else close();}else if(e.target.closest?.('.lb-drawer a'))close();};
  const keydown=e=>{if(e.target.closest?.('[data-lb-locked]')&&['Enter',' '].includes(e.key)){e.preventDefault();explain();return;}if(e.key==='Escape')close();if(e.key==='Tab'&&aside?.classList.contains('lb-open')){const list=[...aside.querySelectorAll('a[href],a[tabindex="0"],button:not(:disabled),input')];if(!list.length)return;const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  root.addEventListener('click',click);root.addEventListener('keydown',keydown);
  const mounted=ctx.contentOnly||(ctx.noCommunity&&protectedRoute('#/'+ctx.page))?null:modules[key]?.mount?.(pageRoot,ctx);const drawerMounted=drawer.mount?.(aside,ctx);
  if(openDrawerScope===scope)open(shell.querySelector('[data-lb-shell="menu"]'));
  // The flat five-item navigation has no central protrusion; reserve measured safe-area height.
  const footer=shell?.querySelector('.lb-bottom');const size=()=>{if(footer)shell.style.setProperty('--lb-bottom-space',`${Math.ceil(footer.getBoundingClientRect().height)+16}px`);};size();let observer;if(typeof ResizeObserver!=='undefined'&&footer){observer=new ResizeObserver(size);observer.observe(footer);}
  return {destroy(){observer?.disconnect();mounted?.destroy?.();drawerMounted?.destroy?.();root.removeEventListener('click',click);root.removeEventListener('keydown',keydown);}};
}
