import {mountAuctionAdminR47} from './auction-admin-r47.js?v=r57';
import {mountRankVipAdmin} from './rank-vip-admin.js?v=r68z40d';
import { side68, head68, brand68, dash68HTML } from './admin-dash-r68.js?v=r68z10';
import {adminRoyalIcon,adminRoyalBrand,adminRoyalLogin,adminRoyalOverview} from './admin-royal-view.js?v=r68l-royal-1';
import {mountPaymentAdmin} from './payment-admin.js?v=r68z40d';
import {mountBulkGrants,unmountBulkGrants,resetBulkGrants} from './admin-bulk-grants.js?v=r66a';
import {mountSocialAdmin} from './social-admin.js?v=r68z40d';
import { pricingHTML, progressionHTML } from './economy-admin.js?v=r68z40d';
import { ownerToolsVisible, ownerToolsEntryHTML, mountOwnerPlayerTools } from './owner-player-tools.js?v=r68z40d';
/* لوحة الإدارة (عربي RTL). كل البيانات من /api/admin/* بالخادم؛ الواجهة تخفي ما لا تملك صلاحيته لكن الحماية الفعلية بالخادم.
   الدخول: رمز الإدارة (يُحفظ بـ sessionStorage فقط، يزول بإغلاق التبويب) أو حساب مسجّل بالطاقم. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('ar-EG-u-nu-latn') : '—');
const dt = (t) => (t ? new Date(t).toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const dur = (s) => { s = Math.floor(s); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return [d && d + ' يوم', h && h + ' ساعة', m + ' دقيقة'].filter(Boolean).join(' و'); };
const TOK = 'qa_adm_tok';
const getTok = () => { try { return sessionStorage.getItem(TOK) || ''; } catch { return ''; } };
const setTok = (v) => { try { v ? sessionStorage.setItem(TOK, v) : sessionStorage.removeItem(TOK); } catch { /* بدون تخزين: يُطلب الرمز كل مرة */ } };

const TABS = [
  ['owner-tools', 'تمييز الحسابات', 'players.view'],
  ['auction','مزادات المقتنيات','staff.manage'],
  ['tribes-cp','القبائل وCP','staff.manage'],
  ['tuning','أرقام الجوائز والمستويات','staff.manage'],
  ['home-banners','بنرات الرئيسية','staff.manage'],
  ['suspicious','الحسابات المشبوهة','staff.manage'],
  ['games-control','التحكم بالألعاب','staff.manage'],
  ['player-log','سجل اللاعب','staff.manage'],
  ['ids3','الأيديات الثلاثية','staff.manage'],
  ['site-ops','التشغيل والغرف والمنشورات','staff.manage'],
  ['watch','الرقابة والاقتصاد','staff.manage'],
  ['live','المباشر واللاعبين والفعاليات','staff.manage'],
  ['pricing', 'الباقات والتحويل', 'staff.manage'], ['payments','المدفوعات والمبيعات','staff.manage'], ['progression', 'LEVEL / VIP / NOBLE', 'staff.manage'], ['rank-vip', 'الرتب والمواسم وعضوية VIP', 'staff.manage'], ['functional', 'المهام والمكافآت والدعم', 'staff.manage'], ['verification', 'التوثيق', 'players.view'], ['overview', 'الإحصائيات', 'stats.view'], ['players', 'اللاعبون', 'players.view'], ['economy', 'الاقتصاد', 'stats.view'], ['bulk', 'منح جميع اللاعبين', 'wallet.bulk-grant'], ['shop', 'المتجر', 'shop.view'], ['gifts', 'الهدايا', 'shop.view'],
  ['rooms', 'الغرف والألعاب', 'rooms.view'], ['social', 'الغرف الاجتماعية والمجالس', 'social.view'], ['reports', 'بلاغات المجتمع', 'community.moderate'], ['achievements', 'الإنجازات', 'ach.view'], ['notices', 'الإعلانات والفعاليات', 'ann.manage'],
  ['staff', 'المشرفون والصلاحيات', 'staff.manage'], ['audit', 'التدقيق والأمان', 'audit.view'], ['settings', 'الإعدادات', 'settings.view'], ['maintenance', 'الصيانة', 'maint.manage'], ['system', 'الخدمات والمراقبة', 'system.view'], ['health', 'حالة الموقع', 'system.view'],
];
const GAME_NAME = { jackaro: 'جاكارو', ludo: 'لودو', baloot: 'بلوت' };
const KIND = { start: 'رصيد البداية', daily: 'يومية', entry_fee: 'رسم دخول', prize: 'جائزة', refund: 'استرجاع', purchase: 'شراء', gift: 'هدية', reward: 'مكافأة', admin: 'تعديل إدارة' };
const STATUS = { lobby: 'انتظار', playing: 'يلعبون', finished: 'منتهية' };
const ACTIONS = { 'gift.update': 'تعديل هدية (تفعيل/سعر)', 'community.remove': 'حذف محتوى مُبلّغ عنه', 'community.dismiss': 'رفض بلاغ مجتمع', 'wallet.request': 'طلب تعديل رصيد (فوق الحد)', 'wallet.reject': 'رفض طلب تعديل رصيد', 'wallet.approve-failed': 'فشل تنفيذ طلب موافَق', 'player.clear-suspect': 'رفع اشتباه عن حساب', 'shop.create': 'إضافة منتج', 'shop.update': 'تعديل منتج', 'shop.enable': 'تفعيل بيع منتج', 'shop.disable': 'إيقاف بيع منتج', 'wallet.adjust': 'تعديل رصيد', 'player.ban': 'حظر لاعب', 'player.unban': 'رفع حظر', 'room.close': 'إغلاق غرفة', 'notice.create': 'إنشاء إعلان', 'notice.update': 'تعديل إعلان', 'notice.delete': 'حذف إعلان', 'staff.set': 'تعيين طاقم', 'staff.remove': 'إزالة طاقم', 'maintenance.on': 'تفعيل الصيانة', 'maintenance.off': 'إلغاء الصيانة', 'maintenance.update': 'تعديل رسالة الصيانة' };

function ensureCss() {
    if(!document.querySelector('link[data-rank-vip-admin-css]')) {const l=document.createElement('link');l.rel='stylesheet';l.href='/rank-vip-admin.css?v=r58p';l.dataset.rankVipAdminCss='1';document.head.appendChild(l);}
    if (!document.querySelector('link[data-ad-css]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/admin.css?v=r61a'; l.dataset.adCss = '1'; document.head.appendChild(l); }
    if(!document.querySelector('link[data-payment-admin-css]')) {const l=document.createElement('link');l.rel='stylesheet';l.href='/payment-admin.css?v=r58p';l.dataset.paymentAdminCss='1';document.head.appendChild(l);}
    if (!document.querySelector('link[data-ad-dashboard-css]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/admin-dashboard.css?v=r58p'; l.dataset.adDashboardCss = '1'; document.head.appendChild(l); }
    if (!document.querySelector('link[data-ad68-css]')) { const l=document.createElement('link');l.rel='stylesheet';l.href='/admin-dash-r68.css?v=r68z';l.dataset.ad68Css='1';document.head.appendChild(l); }
    if (!document.querySelector('link[data-ad-royal-css]')) { const l=document.createElement('link');l.rel='stylesheet';l.href='/admin-royal.css?v=r58p';l.dataset.adRoyalCss='1';document.head.appendChild(l); }
  }

export function mountAdmin(root) {
  // render() بالتطبيق قد يُستدعى مرتين متقاربتين قبل ما ينتهي import؛ كل then ينادي هنا على نفس العنصر.
  // التركيب الثاني يضاعف المستمعات (وكل نسخة لها حالتها ومفتاح تكرارها) فنقرة وحدة تُرسل طلبين. نركّب مرة وحدة لكل عنصر.
  if (root.dataset.adminMounted === '1') return;
  root.dataset.adminMounted = '1';
  ensureCss();
  const S = { dirty: {}, me: null, tab: 'overview', err: '', warn: '', busy: false, data: {}, player: null, q: '', sort: 'since', off: 0, msg: '', period:'7d', checking:false, search:'', sidebarOpen:false, navId:'overview' };
  let authEpoch=0;
  const live = () => root.isConnected;

  async function call(path, { method = 'GET', body } = {}) {
    const requestEpoch=authEpoch;
    const h = {}; const tok = getTok();
    if (tok) h.Authorization = 'Bearer ' + tok;
    if (method !== 'GET') { h['x-admin'] = '1'; h['Content-Type'] = 'application/json'; }
    let r;
    try { r = await fetch('/api/admin/' + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' }); } catch { throw Object.assign(new Error('ما فيه اتصال بالخادم.'), { code: 0 }); }
    let j = {}; try { j = await r.json(); } catch { /* رد بلا جسم */ }
    if(requestEpoch!==authEpoch||!live())throw Object.assign(new Error('انتهت جلسة هالطلب. أعد فتح القسم.'),{code:499});
    if (!r.ok) throw Object.assign(new Error(j.error || 'فشل الطلب.'), { code: r.status, errorCode:j.code });
    if (method !== 'GET' && j.auditOk === false) S.warn = 'العملية انحفظت، بس تعذّر تسجيلها بالتدقيق. لا تعيد تنفيذها بسبب هالتنبيه؛ راجع سجل التدقيق والمراقبة.';
    return j;
  }
  const can = (p) => S.me?.perms?.includes(p);

  function shell(inner) {
    const tabs = TABS.filter((t) => can(t[2]) && (t[0] !== 'owner-tools' || ownerToolsVisible(S.me)) && (!['pricing', 'progression','payments','rank-vip','auction','tribes-cp','tuning','home-banners','suspicious','games-control','player-log','ids3','site-ops','watch','live'].includes(t[0]) || S.me?.role === 'owner') && (t[0] !== 'verification' || ['owner', 'admin'].includes(S.me?.role)));
    const primary = [
      ['overview','لوحة التحكم','overview','home'],['health','حالة الموقع','health','shield'],['players','إدارة اللاعبين','players','users'],
      ['economy','المحفظة والعملات','economy','wallet'],['shop','المتجر والمنتجات','shop','store'],
      ['rooms','الألعاب والمباريات','rooms','game'],
      ['social','الغرف الاجتماعية والمجالس','social','users'],
      ['rewards','الترتيب والجوائز','achievements','chart'],
      ['announcements','الإعلانات والفعاليات','notices','megaphone'],
      ['staff','إدارة المشرفين والصلاحيات','staff','shield'],['audit','سجل العمليات','audit','list'],['settings','الإعدادات','settings','settings']
    ];
    const btn=([id,label,tab,icon])=>{ const allowed=tab&&tabs.some(t=>t[0]===tab); return `<button type="button" class="${S.navId===id?'on ':''}${allowed?'':'ad-nav-unavailable'}" data-ad-entry data-ad-label="${esc(label)}" data-ad="${allowed?'tab':'unavailable'}" ${allowed?`data-t="${tab}" data-navid="${id}"`:''} ${S.navId===id?'aria-current="page"':''} ${allowed?'':`aria-disabled="true" data-why="${tab?'هالقسم مب ضمن صلاحيات حسابك.':'إدارة البطولات مب منفّذة في النظام الحالي؛ ما بنعرضها كأنها شغّالة.'}"`}><span aria-hidden="true">${adminRoyalIcon(icon)}</span><span>${label}</span>${allowed?'':'<small>غير متاح</small>'}</button>`; };
    const covered=new Set(primary.map(x=>x[2]).filter(Boolean));
    const extra=tabs.filter(t=>!covered.has(t[0]));
    const extraIcons={'home-banners':'image',suspicious:'shield','games-control':'settings','player-log':'users',tuning:'trophy',live:'users',watch:'chart','tribes-cp':'crown','site-ops':'settings',pricing:'wallet',payments:'wallet',progression:'crown',functional:'gift',verification:'shield',bulk:'gift',gifts:'gift',reports:'megaphone',maintenance:'settings',system:'chart',health:'shield','owner-tools':'crown'};
    const label = primary.find(x=>x[0]===S.navId)?.[1] || tabs.find(t=>t[0]===S.tab)?.[1] || 'لوحة التحكم';
    return `<div class="ad ad-modern ad-royal ad68${S.sidebarOpen?' ad-sidebar-open':''}"><button type="button" class="ad-mobile-shade" data-ad="close-menu" aria-label="إغلاق القائمة"></button><aside class="ad-side d68-side" id="ad-royal-sidebar"><a class="ad-brand d68-brand" href="#/" aria-label="العودة لموقع لعبك">${brand68()}</a><nav class="ad-nav d68-nav" aria-label="أقسام لوحة الإدارة">${side68({tabs,tab:S.tab,open:S.grpOpen||(S.grpOpen={})})}<p data-ad-search-empty class="ad-empty" hidden>ما لقينا قسم. اضغط بحث للبحث عن لاعب.</p></nav></aside><section class="ad-main-wrap">${head68({me:S.me,search:S.search,bell:S.data?.dash68?.bell||0,sidebarOpen:S.sidebarOpen,menuIcon:adminRoyalIcon('menu'),searchIcon:adminRoyalIcon('search')})}${S.tab!=='overview'?`<h1 class="ad-page-title">${esc(label)}</h1>`:''}${S.msg?`<div class="ad-note ok" role="status">${esc(S.msg)}</div>`:''}${S.err?`<div class="ad-note bad" role="alert">${esc(S.err)}</div>`:''}<main class="ad-main">${S.navId==='matches'?'<div class="ad-note">المباريات الحالية والمنتهية المتاحة موجودة ضمن الغرف. سجل تاريخي مستقل لكل مباراة مب متوفر؛ ما نعرض أرقام تاريخية غير موثقة.</div>':''}${S.navId==='rewards'?'<div class="ad-note"><a class="ad-btn ghost" href="#/leaderboard">فتح الترتيب الحقيقي للاعبين</a> · إدارة الإنجازات والمكافآت الحالية تحت.</div>':''}${S.navId==='events'?'<div class="ad-note">الفعاليات الحالية إعلانات مجدولة من نوع فعالية، مب نظام بطولة مستقل.</div>':''}${inner}</main></section></div>`;
  }
  const loginView = () => adminRoyalLogin({error:S.err,busy:S.checking,checking:S.checking});

  const kv = (rows) => `<dl class="ad-kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const stat = (label, val, sub = '') => `<div class="ad-stat"><b>${val}</b><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const empty = (t) => `<p class="ad-empty">${esc(t)}</p>`;
  const gname = (id) => GAME_NAME[id] || id;

  const bulkRow = (i) => `<div class="ad-card" data-bulk-row="${i}"><h3>مكافأة ${i + 1}</h3><select class="ad-in" name="kind-${i}" aria-label="نوع المكافأة"><option value="coins">عملات</option><option value="item">عنصر مجاني</option></select><input class="ad-in" name="amount-${i}" type="number" min="1" max="1000000" step="1" placeholder="مقدار العملة (للعملات فقط)" dir="ltr"><input class="ad-in" name="itemId-${i}" placeholder="معرّف العنصر (للعناصر فقط)" dir="ltr"></div>`;
  const bulkResult = (r) => !r ? '' : `<section class="ad-card"><h2>${r.preview ? 'المعاينة الخادمية المجمدة' : 'نتيجة المنح'} ${r.duplicate ? '(نفس العملية؛ لا تكرار)' : ''}</h2><p>عدد المستفيدين: ${nf(r.beneficiaries ?? r.total)} · نجاح ${nf(r.succeeded)} · فشل ${nf(r.failed)}</p>${r.preview ? `<p class="ad-muted">التأكيد مرتبط ببصمة المعاينة، ولن يشمل الحسابات التي تُنشأ أو تتصل بعدها.</p><code dir="ltr">${esc(r.fingerprint)}</code><p>${(r.rewards??[]).map(x=>x.type==='currency'?`${nf(x.amount)} ${x.cur==='coins'?'عملة':'جوهرة'}`:`عنصر مجاني: ${esc(x.itemId)}`).join(' · ')}</p>` : ''}<details><summary>المستفيدون الناجحون (${nf(r.succeeded)})</summary><div class="ad-list">${(r.successes??[]).map(x=>`<div class="ad-line"><span>${esc(x.name)} <code dir="ltr">${esc(x.id)}</code></span></div>`).join('')}</div></details><details><summary>الفشل (${nf(r.failed)})</summary><div class="ad-list">${(r.failures??[]).map(x=>`<div class="ad-line"><span>${esc(x.name)} <code dir="ltr">${esc(x.id)}</code><small>${esc(x.code)}</small></span></div>`).join('')}</div></details></section>`;
  const shopFields = (i={}) => `<label>حالة العرض<select class="ad-in" name="status">${[['available','متاح'],['unavailable','غير متاح'],['coming-soon','قريبًا'],['hidden','مخفي']].map(([v,t])=>`<option value="${v}" ${(i.status||(i.active===false?'unavailable':'available'))===v?'selected':''}>${t}</option>`).join('')}</select></label><label>أقل LEVEL<input class="ad-in" name="minLevel" type="number" min="0" max="100" step="1" value="${i.minLevel??0}"></label><label>أقل VIP<input class="ad-in" name="minVip" type="number" min="0" max="15" step="1" value="${i.minVip??0}"></label><label>أقل NOBLE (0–9)<input class="ad-in" name="minNoble" type="number" min="0" max="9" step="1" value="${i.minNoble??0}"></label>`;

  // ---------------- الأقسام ----------------
  const V = {
    pricing: pricingHTML,
    progression: progressionHTML,
    'rank-vip': () => '<section data-rank-vip-admin></section>',
    auction: () => '<section data-auction-admin></section>',
    'tribes-cp': () => '<section data-tribes-cp-admin></section>',
    'home-banners': () => '<section data-home-banners-admin></section>',
    suspicious: () => '<section data-at68="suspicious"></section>',
    'games-control': () => '<section data-at68="games"></section>',
    'player-log': () => '<section data-at68="log"></section>',
    ids3: () => '<section data-at68="ids3"></section>',
    'site-ops': () => '<section data-site-admin></section>',
    watch: () => '<section data-watch-admin></section>',
    live: () => '<section data-live-admin></section>',
    tuning: () => '<section data-tuning-admin></section>',
    social: () => '<section data-social-admin></section>',
    payments: () => '<div data-payment-admin></div>',
    functional: () => '<div data-functional-admin></div>',
    'owner-tools': (d) => ownerToolsVisible(S.me) ? `${S.player ? '' : '<section class="ad-card"><h2>تمييز الحسابات</h2><p class="ad-muted">ابحث عن اللاعب ثم اختره لفتح أدوات المالك في تفاصيل الحساب. رمز الإدارة لا يختار حسابًا تلقائيًا.</p></section>'}${V.players(d)}` : '',
    verification(d) {
      const r=d.verification, labels={pending:'بانتظار المراجعة',accepted:'مقبول',rejected:'مرفوض',revoked:'مسحوب'};
      return `<section class="ad-card"><h2>مراجعة التوثيق</h2><p class="ad-muted">علامة التوثيق لا تُمنح عبر Google أو تلقائيًا؛ تظهر فقط بقرار قبول إداري محفوظ.</p><form data-adf="vfilter" class="ad-form"><select class="ad-in" name="status">${Object.entries({...labels,all:'الكل'}).map(([id,label])=>`<option value="${id}" ${(S.vstatus||'pending')===id?'selected':''}>${label}</option>`).join('')}</select><button class="ad-btn" type="submit">عرض</button></form>${!r?empty('جاري التحميل…'):`<div class="ad-list">${(r.list??r.requests??[]).map(x=>`<article class="ad-card"><h3>${esc(x.name||x.playerId)} <em class="ad-tag">${esc(labels[x.status]||x.status)}</em></h3><code dir="ltr">${esc(x.id)}</code><p>${esc(x.reason||x.note||'')}</p><p class="ad-muted">${dt(x.createdAt||x.at)} · ${esc(x.decisionReason||'')}</p>${x.status==='pending'?`<form data-adf="vdecide" data-id="${esc(x.id)}" class="ad-form"><input class="ad-in" name="reason" required minlength="3" maxlength="180" placeholder="سبب القرار"><input class="ad-in" name="ref" required minlength="8" maxlength="100" pattern="[A-Za-z0-9:_-]+" placeholder="مرجع قرار فريد" dir="ltr"><button class="ad-btn" type="submit" name="op" value="accept" data-arm="1">قبول</button><button class="ad-btn danger" type="submit" name="op" value="reject" data-arm="1">رفض</button></form>`:''}</article>`).join('')||empty('لا طلبات مطابقة.')}</div><div class="ad-pager"><button class="ad-btn ghost" data-ad="vpage" data-d="-1" ${(S.voff||0)===0?'disabled':''}>السابق</button><span>إزاحة ${nf(S.voff||0)}</span><button class="ad-btn ghost" data-ad="vpage" data-d="1" ${(r.list??r.requests??[]).length<25?'disabled':''}>التالي</button></div>`}</section><section class="ad-card"><h2>سحب علامة التوثيق</h2><form data-adf="vrevoke" class="ad-form col"><input class="ad-in" name="playerId" required dir="ltr" placeholder="معرّف الحساب UUID"><input class="ad-in" name="reason" required minlength="3" maxlength="180" placeholder="سبب السحب"><input class="ad-in" name="ref" required minlength="8" maxlength="100" pattern="[A-Za-z0-9:_-]+" dir="ltr" placeholder="مرجع قرار فريد"><button class="ad-btn danger" type="submit" data-arm="1">سحب التوثيق</button></form></section>`;
    },
    overview: (d) => S.me?.role==='owner' ? dash68HTML(d.dash68,{days:S.dashDays||7}) : adminRoyalOverview({...d,actor:S.me}),
    players(d) {
      const p = S.player; if (p) return V.player(p);
      const l = d.players; const su = d.suspects;
      const susp = su && su.list.length ? `<section class="ad-card"><h2>حسابات مشتبه بها (${nf(su.list.length)})</h2><p class="ad-muted">${esc(su.note)}</p><div class="ad-list">${su.list.map((x) => `<div class="ad-line"><span><a href="#" data-ad="player" data-id="${esc(x.id)}">${esc(x.name)}</a><small>شبكة تطابق المحظور «${esc(x.ofName)}» · ${dt(x.at)}</small></span>${can('players.ban') ? `<button class="ad-btn ghost" data-ad="clrs" data-id="${esc(x.id)}" data-arm="1">رفع الاشتباه</button>` : ''}</div>`).join('')}</div></section>` : '';
      const ns = d.netsig; // إشارة مراجعة فقط: لا تمنع أحداً
      const nsig = ns && ns.groups.length ? `<section class="ad-card"><h2>نشاط شبكات مرتفع (${nf(ns.groups.length)})</h2><p class="ad-muted">${esc(ns.note)}</p><div class="ad-list">${ns.groups.map((g) => `<div class="ad-line"><span>شبكة <b dir="ltr">${esc(g.ref)}</b> · ${nf(g.count)} حساب جديد/24س<small>${g.accounts.slice(0, 6).map((x) => `<a href="#" data-ad="player" data-id="${esc(x.id)}">${esc(x.name)}</a>${x.banned ? ' (محظور)' : ''}`).join('، ')}${g.accounts.length > 6 ? '…' : ''} · آخر ${dt(g.last)}</small></span></div>`).join('')}</div></section>` : '';
      return susp + nsig + `<form class="ad-search" data-adf="psearch"><input class="ad-in" name="q" value="${esc(S.q)}" placeholder="ابحث بالاسم أو بداية المعرّف" aria-label="بحث"><select class="ad-in" name="sort" aria-label="ترتيب">${[['since', 'الأحدث'], ['points', 'النقاط'], ['level', 'المستوى'], ['played', 'الأكثر لعباً']].map(([v, t]) => `<option value="${v}" ${S.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="ad-btn" type="submit">بحث</button></form>
        ${!l ? empty('جاري التحميل…') : !l.list.length ? empty(S.q ? 'ما فيه نتائج للبحث.' : 'ما فيه لاعبين مسجّلين بعد.') : `<div class="ad-list">${l.list.map((x) => `<button class="ad-row" data-ad="player" data-id="${esc(x.id)}"><span class="ad-nm">${esc(x.name)} ${x.online ? '<i class="ad-dot on" title="متصل"></i>' : ''}${x.banned ? '<em class="ad-tag bad">محظور</em>' : ''}${x.role ? `<em class="ad-tag">${esc(x.role)}</em>` : ''}</span><span class="ad-sub">مستوى ${nf(x.level)} · ${nf(x.points)} نقطة · ${nf(x.played)} مباراة${x.coins == null ? '' : ` · 🪙 ${nf(x.coins)} · 💎 ${nf(x.gems)}`}</span></button>`).join('')}</div>
        <div class="ad-pager"><button class="ad-btn ghost" data-ad="ppage" data-d="-1" ${l.offset <= 0 ? 'disabled' : ''}>السابق</button><span>${nf(l.offset + 1)}–${nf(Math.min(l.offset + l.limit, l.total))} من ${nf(l.total)}</span><button class="ad-btn ghost" data-ad="ppage" data-d="1" ${l.offset + l.limit >= l.total ? 'disabled' : ''}>التالي</button></div>`}`;
    },
    player(x) {
      const pr = x.profile, w = x.wallet;
      const acts = [];
      if (can('wallet.adjust') && w && S.adjOperation?.target === pr.id && S.adjOperation.result) acts.push('<section class="ad-card"><p class="ad-muted">الطلب السابق نتيجته محفوظة. تطبيق نفس البيانات يعرض نتيجته بدون تعديل ثاني. إذا تبا تكرر التعديل عن قصد، ابدأ تعديل جديد.</p><button class="ad-btn ghost" type="button" data-ad="adjnew" data-arm="1">بدء تعديل جديد</button></section>');
      if (can('wallet.adjust') && w) acts.push(`<section class="ad-card"><h2>تعديل الرصيد</h2><p class="ad-muted">يُسجَّل بالسجل المالي وسجل التدقيق. الخصم لا ينزل الرصيد تحت صفر. ${S.me.role === 'owner' ? 'المالك بلا حد (يبقى سقف مليون للعملية).' : 'التعديل فوق حد العملية أو الحد اليومي يُرفع للمالك للموافقة ولا يُنفَّذ قبلها (الحدود في قسم «الاقتصاد»).'}</p><form data-adf="adjust" class="ad-form"><select class="ad-in" name="cur"><option value="coins">🪙 عملات</option></select><input class="ad-in" name="delta" type="number" step="1" placeholder="المقدار (سالب للخصم)" required dir="ltr"><input class="ad-in" name="reason" placeholder="السبب (مطلوب)" required maxlength="120">${S.me.role === 'owner' ? '<input class="ad-in" name="confirm" type="number" step="1" placeholder="تأكيد المبلغ (للمبالغ الكبيرة فقط: أعد كتابته)" dir="ltr">' : ''}<button class="ad-btn" type="submit">تطبيق</button></form></section>`);
      if (can('players.ban')) acts.push(x.ban ? `<section class="ad-card"><h2>الحظر</h2><p>محظور منذ ${dt(x.ban.at)} بواسطة ${esc(x.ban.by)}<br>السبب: ${esc(x.ban.reason)}</p><button class="ad-btn" data-ad="unban">رفع الحظر</button></section>` : `<section class="ad-card"><h2>حظر اللاعب</h2><p class="ad-muted">يُقطع اتصاله ويُمنع من الدخول. الحساب نفسه (الرصيد والتقدم) ما يُحذف.</p><form data-adf="ban" class="ad-form"><input class="ad-in" name="reason" placeholder="سبب الحظر (مطلوب)" required maxlength="120"><button class="ad-btn danger" type="submit">حظر</button></form></section>`);
      if (can('staff.manage')) acts.push(`<section class="ad-card"><h2>الدور الإداري</h2><p class="ad-muted">الحالي: ${x.role ? esc(x.role) : 'لاعب عادي'}</p><form data-adf="staff" class="ad-form"><select class="ad-in" name="role"><option value="support">دعم</option><option value="moderator">مشرف</option><option value="admin">مدير</option></select><button class="ad-btn" type="submit">تعيين</button>${x.role ? '<button class="ad-btn ghost" type="button" data-ad="unstaff" data-arm="1">إزالة من الطاقم</button>' : ''}</form></section>`);
      return `<button class="ad-btn ghost" data-ad="pback">← رجوع للقائمة</button>
        <section class="ad-card"><h2>${esc(pr.name)} ${x.online ? '<i class="ad-dot on"></i>' : ''}</h2>${kv([['المعرّف', `<code dir="ltr">${esc(pr.id)}</code>`], ['انضم', dt(pr.since)], ['المستوى', `${nf(pr.level)} (${nf(pr.xp)} خبرة)`], ['نقاط التصنيف', nf(pr.points)], ['المباريات / الفوز', `${nf(pr.played)} / ${nf(pr.wins)}`], ...(w ? [['العملات', '🪙 ' + nf(w.coins)], ...(w.gems ? [['جواهر قديمة (تتحول تلقائيًا)', '💎 ' + nf(w.gems)]] : []), ['مقتنيات المتجر', nf(w.owned.length)]] : [])])}</section>
        ${ownerToolsEntryHTML(S.me, pr.id)}
        ${acts.join('')}
        ${w ? `<section class="ad-card"><h2>آخر المعاملات</h2>${w.ledger.length ? `<div class="ad-list">${w.ledger.slice(0, 30).map((t) => `<div class="ad-line"><span>${KIND[t.kind] || esc(t.kind)} ${t.cur === 'gems' ? '💎' : '🪙'}<small>${esc(t.reason)}</small></span><b class="${t.delta < 0 ? 'neg' : 'pos'}" dir="ltr">${t.delta > 0 ? '+' : ''}${nf(t.delta)}</b><small>${dt(t.ts)} · رصيد ${nf(t.after)}</small></div>`).join('')}</div>` : empty('ما فيه معاملات.')}</section>` : ''}
        <section class="ad-card"><h2>آخر المباريات</h2>${pr.history.length ? `<div class="ad-list">${pr.history.map((h) => `<div class="ad-line"><span>${esc(gname(h.game))} · ${h.result === 'win' ? 'فوز' : 'خسارة'}</span><small>${dt(h.ts)}</small></div>`).join('')}</div>` : empty('ما لعب مباريات مكتملة.')}</section>`;
    },
    adjCard(a) {
      if (!a) return '';
      const L = a.limits, st = { pending: 'بانتظار المالك', approving: 'قيد التنفيذ (أعد الموافقة للاستكمال)', approved: 'نُفِّذ بموافقة', rejected: 'مرفوض', failed: 'فشل التنفيذ' };
      const cu = (c) => (c === 'gems' ? '💎' : '🪙'); const isPend = (x) => (x.status === 'pending' && !x.expired) || x.status === 'approving'; const pend = a.list.filter(isPend);
      const row = (x) => `<div class="ad-line"><span>${esc(x.targetName)} · ${cu(x.cur)} ${x.delta > 0 ? '+' : ''}${nf(x.delta)} <em class="ad-tag${x.status === 'rejected' || x.status === 'failed' ? ' bad' : x.status === 'approved' ? ' ok' : ''}">${x.expired ? 'انتهت المهلة' : st[x.status]}</em><small>${esc(x.reason)} · طلب ${esc(x.by.name)} (${esc(x.by.role)}) · ${x.why === 'op_limit' ? 'فوق حد العملية' : 'فوق الحد اليومي'} · ${dt(x.at)}${x.decidedBy ? ' · البتّ: ' + esc(x.decidedBy) : ''}${x.before !== undefined ? ' · الرصيد ' + nf(x.before) + ' ← ' + nf(x.after) : ''}${x.note ? ' · ' + esc(x.note) : ''}</small></span>${isPend(x) && a.canApprove ? `<span class="ad-acts"><button class="ad-btn" data-ad="adjok" data-id="${esc(x.id)}" data-arm="1">${x.status === 'approving' ? 'استكمال التنفيذ' : 'موافقة وتنفيذ'}</button>${x.status === 'pending' ? `<button class="ad-btn danger" data-ad="adjno" data-id="${esc(x.id)}" data-arm="1">رفض</button>` : ''}</span>` : ''}</div>`;
      return `<section class="ad-card"><h2>حدود التعديل الإداري وموافقات المالك</h2><p class="ad-muted">لغير المالك: حد العملية ${nf(L.opCoins)} 🪙 / ${nf(L.opGems)} 💎، والحد اليومي لكل منفّذ ${nf(L.dayCoins)} 🪙 / ${nf(L.dayGems)} 💎 (بتوقيت الخليج). ما فوقها يصير طلباً ينتظر موافقة المالك. ${a.unlimited ? 'أنت المالك: بلا حد.' : `المستخدم اليوم: ${nf(a.usedToday.coins)} 🪙 / ${nf(a.usedToday.gems)} 💎.`}</p>
        ${pend.length ? `<h3>بانتظار الموافقة (${nf(pend.length)})</h3><div class="ad-list">${pend.map(row).join('')}</div>` : '<p class="ad-muted">لا طلبات معلّقة.</p>'}
        ${a.list.filter((x) => !isPend(x)).length ? `<h3>آخر القرارات</h3><div class="ad-list">${a.list.filter((x) => !isPend(x)).slice(0, 15).map(row).join('')}</div>` : ''}</section>`;
    },
    economy(d) {
      const o = d.overview; const au = d.auditEco;
      if (!o) return empty('جاري التحميل…');
      return V.adjCard(d.adj) + `<div class="ad-grid">${stat('حسابات بمحفظة', nf(o.economy.accounts))}${stat('إجمالي العملات 🪙', nf(o.economy.coins))}${o.economy.gems ? stat('جواهر قديمة متبقية 💎', nf(o.economy.gems)) : ''}${stat('مباريات مُسوّاة ماليّاً', nf(o.economy.settledGames))}${stat('جوائز معلّقة بالحفظ', nf(o.economy.pendingPayouts))}</div>
        <p class="ad-muted">العملات افتراضية بلا قيمة مالية. للمعاملات التفصيلية افتح اللاعب من قسم «اللاعبون».</p>
        <section class="ad-card"><h2>آخر تعديلات الإدارة على الأرصدة</h2>${au ? (au.length ? `<div class="ad-list">${au.map((a) => `<div class="ad-line"><span>${esc(a.actor)}<small>${esc(a.detail)}</small></span><small>${dt(a.ts)}</small></div>`).join('')}</div>` : empty('ما صار أي تعديل إداري على الأرصدة.')) : empty(can('audit.view') ? 'جاري التحميل…' : 'يحتاج صلاحية سجل التدقيق.')}</section>`;
    },
    bulk(d) {
      return `<section class="ad-card"><h2>منح مجاني متعدد — المالك أو مفوّض صراحة</h2><p class="ad-muted">من 1 إلى 20 مكافأة مجانية، بلا شراء أو خصم. المعاينة لا تغيّر الحسابات وتجمّد المستفيدين؛ أي تغيير للعملية يتطلب معرفًا جديدًا.</p><form data-adf="bulk" class="ad-form col"><input class="ad-in" name="operationId" minlength="8" maxlength="80" pattern="[A-Za-z0-9_-]+" placeholder="معرف العملية (فريد)" required dir="ltr"><select class="ad-in" name="filter"><option value="active">المتصلون الآن</option><option value="recent">حسابات آخر 30 يوماً</option><option value="all">كل الحسابات</option><option value="date-range">تاريخ إنشاء الحساب (فترة)</option></select><label>بداية الفترة، شاملة<input class="ad-in" name="from" type="datetime-local"></label><label>نهاية الفترة، شاملة<input class="ad-in" name="to" type="datetime-local"></label><div data-bulk-rows>${Array.from({length:S.bulkCount||1},(_,i)=>bulkRow(i)).join('')}</div><div class="ad-acts"><button class="ad-btn ghost" type="button" data-ad="bulkadd">إضافة مكافأة</button><button class="ad-btn ghost" type="button" data-ad="bulkremove">حذف آخر مكافأة</button></div><input class="ad-in" name="reason" minlength="3" maxlength="180" placeholder="سبب المنح (مطلوب)" required><label>تأكيد العدد: أعد كتابة عدد المستفيدين الظاهر في المعاينة<input class="ad-in" name="confirmCount" type="number" min="1" step="1" dir="ltr"></label><div class="ad-acts"><button class="ad-btn ghost" type="submit" name="op" value="preview">معاينة المستفيدين والنتائج</button><button class="ad-btn danger" type="submit" name="op" value="execute" data-arm="1" ${S.bulkPreview?'':'disabled'}>تأكيد وتنفيذ المنح</button></div></form></section>${bulkResult(S.bulkPreview||S.bulkResult)}`;
    },
    shop(d) {
      const s = d.shop; if (!s) return empty('جاري التحميل…');
      // R62: عروض محدودة الوقت (المالك)
      const OFST = { live: '🟢 شغال', upcoming: '🕒 قادم', ended: '⚪ انتهى' };
      const offersCard = S.me?.role !== 'owner' || !d.offers ? '' : `<section class="ad-card"><h2>🔥 عروض لفترة محدودة</h2><p class="ad-muted">اختر قطعة من المتجر، وحط خصم (0 = بدون خصم) ومدة العرض. خلال العرض السعر يطلع مخفّض مع عداد تنازلي، والشراء يمشي بالسعر المخفّض. «حصري» = القطعة ما تنباع إلا خلال العرض.</p>
        <form data-adf="offeradd" class="ad-form col"><label>معرّف القطعة<input class="ad-in" name="itemId" list="of62-items" required placeholder="مثال: art-f3-12" dir="ltr"></label><datalist id="of62-items">${(s.items || s.list || []).slice(0, 600).map((i) => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</datalist>
        <div class="ad-form"><label>الخصم %<input class="ad-in" name="discount" type="number" min="0" max="90" value="30"></label><label>المدة (ساعات)<input class="ad-in" name="hours" type="number" min="1" max="720" value="48"></label><label>يبدأ<input class="ad-in" name="startsAt" type="datetime-local"></label><label class="ad-check"><input type="checkbox" name="exclusive"> حصري</label></div>
        <button class="ad-btn" type="submit">إضافة العرض</button></form>
        ${d.offers.list.length ? `<div class="ad-list">${d.offers.list.slice(0, 40).map((o) => `<div class="ad-line"><span><b>${esc(o.itemName)}</b><small>${OFST[o.state] || ''} · خصم ${nf(o.discount)}%${o.exclusive ? ' · حصري' : ''} · ${dt(o.startsAt)} ← ${dt(o.endsAt)}</small></span>${o.state !== 'ended' ? `<button class="ad-btn ghost" data-ad="offer-end" data-id="${esc(o.id)}" data-arm="1">إنهاء</button>` : ''}</div>`).join('')}</div>` : empty('ما فيه عروض للحين.')}</section>`;
      const mg = can('shop.manage'); const SL = { frame: 'إطار', bg: 'خلفية', title: 'لقب', badge: 'شارة', 'chat-bubble': 'فقاعة دردشة', board: 'لوحة اسم', 'special-id': 'أيدي مميز', 'room-id': 'أيدي غرفة', 'mic-frame': 'إطار مايك', 'room-bg': 'خلفية غرفة', souvenir: 'تذكار', avatar: 'أفاتار', entrance: 'دخول' }; const NEW_SL = ['frame', 'bg', 'chat-bubble', 'board', 'title', 'badge', 'special-id', 'room-id']; const cur = () => '🪙'; const shown = (p, c) => c === 'gems' ? p * 20 : p;
      const optsOf = (arr) => arr.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
      const addForm = mg ? `<section class="ad-card"><h2>إضافة منتج</h2><p class="ad-muted">المنتج الجديد تجميلي فقط. الإطار والخلفية والفقاعة واللوحة تختار شكلها من الرسومات الموجودة؛ اللقب والشارة نص قصير؛ الأيدي المميز رقم. المعرّف ما يتغيّر بعد الإنشاء والمنتج ما يُحذف (فقط يُعطَّل).</p>
        <form data-adf="shopnew" class="ad-form col"><input class="ad-in" name="id" placeholder="المعرّف (إنجليزي، مثل frame-ruby)" required maxlength="32" dir="ltr" pattern="[a-z][a-z0-9-]{2,31}">
        <select class="ad-in" name="slot">${NEW_SL.map((k) => `<option value="${k}">${SL[k]}</option>`).join('')}</select>
        <input class="ad-in" name="name" placeholder="الاسم" required maxlength="40"><input class="ad-in" name="icon" placeholder="الأيقونة (إيموجي)" required maxlength="8"><input class="ad-in" name="desc" placeholder="الوصف (اختياري)" maxlength="120">
        <div class="ad-row2"><input class="ad-in" name="price" type="number" min="1" step="1" placeholder="السعر" required inputmode="numeric"><select class="ad-in" name="currency"><option value="coins">🪙 عملات</option></select></div>
        <label>مظهر الإطار (إن كانت الخانة إطار)<select class="ad-in" name="cssFrame">${optsOf(s.presets.frame)}</select></label>
        <label>مظهر الخلفية (إن كانت الخانة خلفية)<select class="ad-in" name="cssBg">${optsOf(s.presets.bg)}</select></label>
        <label>شكل الفقاعة (إن كانت فقاعة دردشة)<select class="ad-in" name="cssBubble">${optsOf(s.presets['chat-bubble'] || [])}</select></label>
        <label>شكل اللوحة (إن كانت لوحة اسم)<select class="ad-in" name="cssBoard">${optsOf(s.presets.board || [])}</select></label>
        <label>رقم الأيدي (أيدي مميز من 4 أرقام وفوق — الأقصر للإدارة من «تمييز الحسابات»؛ أيدي غرفة من 3)<input class="ad-in" name="cssId" inputmode="numeric" dir="ltr" maxlength="10" pattern="[1-9][0-9]{2,9}"></label>
        <p class="ad-muted">إطار المايك وخلفية الغرفة والتذكار يحتاجون رسومات جديدة، فتنضاف من الكتالوج مو من هنا.</p>
        <label>نص اللقب أو رمز الشارة (إن كانت الخانة لقب/شارة)<input class="ad-in" name="cssText" maxlength="24"></label>
        ${shopFields()}<button class="ad-btn" type="submit">إضافة المنتج</button></form></section>` : '';
      const card = (i) => `<article class="ad-card"><h3>${esc(i.icon)} ${esc(i.name)} <em class="ad-tag">${SL[i.slot] || esc(i.slot)}</em> ${i.active ? '<em class="ad-tag ok">معروض للبيع</em>' : '<em class="ad-tag">موقوف</em>'}${i.custom ? '<em class="ad-tag">مضاف</em>' : ''}</h3>
        <p class="ad-sub"><code dir="ltr">${esc(i.id)}</code> · ${nf(shown(i.price, i.currency))} 🪙${i.defaults && shown(i.defaults.price, i.defaults.currency) !== shown(i.price, i.currency) ? ` <small>(الأصلي ${nf(shown(i.defaults.price, i.defaults.currency))} 🪙)</small>` : ''} · ${nf(i.owners)} مالك</p>
        ${mg ? `<form data-adf="shopedit" data-id="${esc(i.id)}" class="ad-form col"><input class="ad-in" name="name" value="${esc(i.name)}" required maxlength="40"><input class="ad-in" name="icon" value="${esc(i.icon)}" required maxlength="8"><input class="ad-in" name="desc" value="${esc(i.desc)}" maxlength="120" placeholder="الوصف">
        <div class="ad-row2"><input class="ad-in" name="price" type="number" min="${i.currency === 'gems' ? 20 : 1}" step="${i.currency === 'gems' ? 20 : 1}" value="${shown(i.price, i.currency)}" required inputmode="numeric"><input type="hidden" name="currency" value="${esc(i.currency)}"><span class="ad-muted">🪙 عملات</span></div>
        ${shopFields(i)}<div class="ad-acts"><button class="ad-btn" type="submit" name="op" value="save">حفظ التعديل</button><button class="ad-btn ghost" type="submit" name="op" value="${i.active ? 'off' : 'on'}">${i.active ? 'إيقاف البيع' : 'تفعيل البيع'}</button></div></form>` : ''}</article>`;
      return offersCard + `<div class="ad-note">${esc(s.note)}</div>${s.persistent ? '' : '<div class="ad-note warn">تنبيه: لا يوجد WALLET_FILE فالتعديلات بالذاكرة وتضيع عند إعادة التشغيل.</div>'}<div class="ad-grid">${stat('إجمالي المقتنيات المشتراة', nf(s.purchases))}${stat('عدد المنتجات', nf(s.items.length))}${stat('معروضة للبيع', nf(s.items.filter((x) => x.active).length))}</div>${addForm}
        <section class="ad-card"><h2>المنتجات والأسعار</h2></section><div class="ad-list">${s.items.map(card).join('')}</div>`;
    },
    gifts(d) {
      const g = d.gifts; if (!g) return empty('جاري التحميل…');
      const h = d.house;
      const houseHTML = h ? `<section class="ad-card"><h2>حصة الإدارة من الهدايا</h2><div class="ad-grid">${stat('حصة العملات التاريخية',nf(h.coins)+' كوينز')}${stat('تكلفة الهدايا بالجواهر',nf(h.gems??0)+' جوهرة')}${stat('عدد عمليات الهدايا', nf(h.count))}</div><p class="ad-muted">${esc(h.note)}</p>
        ${h.ledger.length ? `<div class="ad-list">${h.ledger.slice(0, 30).map((x) => `<div class="ad-line"><span>${dt(x.ts)} · ${esc(x.gift)}${x.qty > 1 ? ' ×' + nf(x.qty) : ''}<small>القيمة ${nf(x.total)} ${x.cur==='gems'?'جوهرة':'كوينز'} · حصة الإدارة ${nf(x.delta)} ${x.cur==='gems'?'جوهرة':'كوينز'} · ${x.room ? 'داخل غرفة' : 'من المتجر'} · معاملة <code dir="ltr">${esc(x.tx.slice(0, 8))}</code></small></span></div>`).join('')}</div>` : empty('ما فيه هدايا مرسلة بعد.')}</section>` : '';
      const RN = g.rarity || [];
      const rows = g.list.map((x) => `<div class="ad-line"><span><b>${esc(x.name)}</b> <em class="ad-tag">${esc(RN[x.rarity] || '')}</em>${x.active ? '' : ' <em class="ad-tag">معطّلة</em>'}<small dir="ltr">${esc(x.id)}</small><small>السعر ${nf(x.price * 20)} عملة · ${x.rewards?`المستلم ${nf(x.rewards.recv)} كوينز، بونص المرسل ${nf(x.rewards.senderBonus)} كوينز · `:''}انرسلت ${nf(x.sent)} مرة</small></span>${can('shop.manage') ? `<form data-adf="gprice" data-id="${esc(x.id)}" class="ad-form"><input class="ad-in" name="price" type="number" min="2" max="500000" step="2" value="${x.price}" aria-label="السعر"><button class="ad-btn ghost" type="submit">حفظ السعر</button><button class="ad-btn ${x.active ? 'danger' : ''}" type="button" data-ad="gtoggle" data-id="${esc(x.id)}" data-on="${x.active ? 0 : 1}">${x.active ? 'تعطيل' : 'تفعيل'}</button></form>` : ''}</div>`).join('');
      return `${houseHTML}<section class="ad-card"><h2>كتالوج الهدايا</h2><p class="ad-muted">${nf(g.total)} هدية، المفعّل ${nf(g.active)}. المطابق للبحث: ${nf(g.matched)}.</p>
        <form data-adf="gsearch" class="ad-form"><input class="ad-in" name="q" placeholder="بحث بالاسم أو المعرّف" value="${esc(S.gq || '')}"><input class="ad-in" name="cat" placeholder="القسم (مثل flowers)" value="${esc(S.gcat || '')}" dir="ltr"><button class="ad-btn" type="submit">بحث</button></form>
        <div class="ad-list">${rows || empty('ما فيه نتائج.')}</div><div class="ad-bar">${g.off > 0 ? '<button class="ad-btn ghost" data-ad="gpage" data-d="-1">السابق</button>' : ''}${g.off + 50 < g.matched ? '<button class="ad-btn ghost" data-ad="gpage" data-d="1">التالي</button>' : ''}</div></section>`;
    },
    reports(d) {
      const r = d.reports; if (!r) return empty('جاري التحميل…');
      const RS = { spam: 'إزعاج/إعلانات', abuse: 'إساءة/تنمّر', inappropriate: 'غير لائق', privacy: 'معلومات خاصة', other: 'سبب آخر' };
      const ST = { open: 'مفتوح', removed: 'حُذف المحتوى', dismissed: 'مرفوض' };
      const f = (k, t) => `<button class="ad-btn ${(S.rstatus || 'open') === k ? '' : 'ghost'}" data-ad="rstatus" data-s="${k}">${t}</button>`;
      return `<div class="ad-bar">${f('open', 'المفتوحة')}${f('all', 'الكل')}<button class="ad-btn ghost" data-ad="refresh">تحديث</button><span class="ad-muted">${nf(r.open)} بلاغ مفتوح</span></div>
        ${!r.list.length ? empty('ما فيه بلاغات.') : `<div class="ad-list">${r.list.map((x) => `<article class="ad-card"><h3>${x.kind === 'post' ? 'منشور' : 'تعليق'} <em class="ad-tag">${esc(RS[x.reason] || x.reason)}</em> <em class="ad-tag">${ST[x.status] || x.status}</em>${x.exists ? '' : ' <em class="ad-tag">المحتوى غير موجود</em>'}</h3>
          <p class="ad-sub">الكاتب: ${can('players.view') ? `<button class="ad-link" data-ad="rplayer" data-id="${esc(x.authorId)}">${esc(x.author)}</button>` : esc(x.author)} · المبلّغ: ${esc(x.by)} · ${dt(x.at)}</p>
          <blockquote class="ad-quote">${esc(x.text) || '<i>بدون نص</i>'}${x.media ? '<br><small>(فيه صورة)</small>' : ''}</blockquote>${x.note ? `<p class="ad-sub">ملاحظة المبلّغ: ${esc(x.note)}</p>` : ''}
          ${x.status === 'open' ? `<form data-adf="rdecide" data-id="${x.id}" class="ad-form"><input class="ad-in" name="reason" placeholder="سبب القرار" required maxlength="200"><button class="ad-btn danger" type="submit" name="op" value="remove">حذف المحتوى</button><button class="ad-btn ghost" type="submit" name="op" value="dismiss">رفض البلاغ</button></form>` : `<p class="ad-sub">القرار: ${esc(x.decision || '')} · ${esc(x.decidedBy || '')} · ${dt(x.decidedAt)}</p>`}</article>`).join('')}</div>`}`;
    },
    rooms(d) {
      const r = d.rooms; if (!r) return empty('جاري التحميل…');
      return `<div class="ad-bar"><button class="ad-btn ghost" data-ad="refresh">تحديث</button><span class="ad-muted">${nf(r.list.length)} غرفة</span></div>${!r.list.length ? empty('ما فيه غرف حالياً.') : `<div class="ad-list">${r.list.map((x) => `<article class="ad-card"><h3>${esc(gname(x.gameId))} <code dir="ltr">${esc(x.code)}</code> <em class="ad-tag">${STATUS[x.status] || x.status}</em>${x.mode === 'bots' ? '<em class="ad-tag">تدريب</em>' : ''}</h3><p class="ad-sub">${x.players.map((p) => `${esc(p.name)}${p.bot ? ' 🤖' : p.left ? ' (غادر)' : p.online ? '' : ' (غير متصل)'}`).join('، ')}</p><p class="ad-sub">آخر نشاط ${dt(x.updatedAt)}${x.stake ? ` · رسم ${nf(x.stake)} 🪙` : ''}</p>${can('rooms.close') ? `<form data-adf="close" data-code="${esc(x.code)}" class="ad-form"><input class="ad-in" name="reason" placeholder="سبب الإغلاق" required maxlength="120"><button class="ad-btn danger" type="submit">إغلاق الغرفة</button></form>` : ''}</article>`).join('')}</div>`}`;
    },
    achievements(d) {
      const a = d.achievements; if (!a) return empty('جاري التحميل…');
      return `<div class="ad-note">${esc(a.note)}</div><section class="ad-card"><h2>المكافآت (الإنجازات)</h2><div class="ad-list">${a.milestones.map((m) => `<div class="ad-line"><span>${esc(m.label)}<small>الشرط: ${nf(m.goal)} (${m.metric === 'wins' ? 'فوز' : m.metric === 'played' ? 'مباراة' : 'مستوى'})</small></span><b>${nf(m.amount)} ${m.cur === 'gems' ? '💎' : '🪙'}</b><small>${nf(m.claimed)} استلموها</small></div>`).join('')}</div></section>
        <section class="ad-card"><h2>الشارات المتجرية</h2><div class="ad-list">${a.badges.map((b) => `<div class="ad-line"><span>${esc(b.icon)} ${esc(b.name)}</span><small>${nf(b.owners)} مالك</small></div>`).join('')}</div></section>
        <section class="ad-card"><h2>لوحة الشرف (صدارة الأسبوع)</h2>${a.honor.list.length ? `<div class="ad-list">${a.honor.list.map((h) => `<div class="ad-line"><span>${nf(h.rank)}. ${esc(h.name)}</span><b>${nf(h.points)} نقطة</b><small>${nf(h.wins)} فوز</small></div>`).join('')}</div><p class="ad-muted">ينتهي الأسبوع ${dt(a.honor.resetsAt)}</p>` : empty('لا توجد نتائج هذا الأسبوع بعد.')}</section>`;
    },
    notices(d) {
      const n = d.notices; if (!n) return empty('جاري التحميل…');
      const t = Date.now();
      return `<section class="ad-card"><h2>إضافة إعلان أو فعالية</h2><p class="ad-muted">تظهر لجميع اللاعبين كشريط أعلى الموقع ضمن الفترة المحددة (الفعالية هنا إعلان مجدول، لا تغيّر قواعد اللعب).</p><form data-adf="notice" class="ad-form col"><select class="ad-in" name="kind"><option value="announcement">إعلان</option><option value="event">فعالية</option></select><input class="ad-in" name="title" placeholder="العنوان" required maxlength="80"><textarea class="ad-in" name="body" placeholder="النص (اختياري)" maxlength="500" rows="3"></textarea><label>يبدأ (اختياري)<input class="ad-in" name="startsAt" type="datetime-local"></label><label>ينتهي (اختياري)<input class="ad-in" name="endsAt" type="datetime-local"></label><button class="ad-btn" type="submit">نشر</button></form></section>
        <section class="ad-card"><h2>الإعلانات (${nf(n.list.length)})</h2>${n.list.length ? `<div class="ad-list">${n.list.map((x) => { const on = x.active && x.startsAt <= t && (!x.endsAt || x.endsAt > t); return `<div class="ad-line"><span><em class="ad-tag">${x.kind === 'event' ? 'فعالية' : 'إعلان'}</em> ${esc(x.title)}<small>${esc(x.body)}</small><small>${x.startsAt ? 'من ' + dt(x.startsAt) : ''} ${x.endsAt ? 'إلى ' + dt(x.endsAt) : ''} · ${on ? 'ظاهر الآن' : x.active ? 'مجدول/منتهٍ' : 'معطّل'} · ${esc(x.by)}</small></span><span class="ad-acts"><button class="ad-btn ghost" data-ad="ntoggle" data-id="${esc(x.id)}" data-on="${x.active ? 0 : 1}">${x.active ? 'تعطيل' : 'تفعيل'}</button><button class="ad-btn danger" data-ad="ndel" data-id="${esc(x.id)}" data-arm="1">حذف</button></span></div>`; }).join('')}</div>` : empty('ما فيه إعلانات.')}</section>`;
    },
    staff(d) {
      const s = d.staff; if (!s) return empty('جاري التحميل…');
      return `<section class="ad-card"><h2>الأدوار والصلاحيات</h2><div class="ad-list">${S.me.roles.map((r) => `<div class="ad-line"><span><b>${esc(r.label)}</b><small>${r.perms.map((p) => PERM_LABEL[p] || p).join('، ')}</small></span></div>`).join('')}</div></section>
        <section class="ad-card"><h2>طاقم الإدارة (${nf(s.list.length)})</h2><p class="ad-muted">لتعيين عضو: افتح اللاعب من قسم «اللاعبون» واختر دوره. لا يملك أي دور غير المالك المنح الجماعي ضمنيًا؛ التفويض أدناه منفصل ويمكن سحبه.</p>${s.list.length ? `<div class="ad-list">${s.list.map((x) => `<div class="ad-line"><span>${esc(x.name)} <em class="ad-tag">${esc(x.roleLabel)}</em><small>عُيّن ${dt(x.at)} بواسطة ${esc(x.by)} · المنح الجماعي: ${x.bulkGrant?'مفوّض صراحة':'غير مفوّض'}</small></span><button class="ad-btn danger" data-ad="srm" data-id="${esc(x.id)}" data-arm="1">إزالة</button><form data-adf="bulkpermission" data-id="${esc(x.id)}" class="ad-form"><input class="ad-in" name="reason" required minlength="3" maxlength="180" placeholder="سبب منح/سحب التفويض"><button class="ad-btn ghost" type="submit" name="enabled" value="${x.bulkGrant?'0':'1'}" data-arm="1">${x.bulkGrant?'سحب تفويض المنح':'تفويض المنح المجاني'}</button></form></div>`).join('')}</div>` : empty('ما فيه طاقم مسجّل بعد.')}</section>`;
    },
    audit(d) {
      const a = d.audit, b = d.bans; if (!a) return empty('جاري التحميل…');
      return `<section class="ad-card"><h2>المحظورون (${b ? nf(b.list.length) : '…'})</h2>${b && b.list.length ? `<div class="ad-list">${b.list.map((x) => `<div class="ad-line"><span>${esc(x.name)}<small>${esc(x.reason)} · ${dt(x.at)} · ${esc(x.by)}</small></span></div>`).join('')}</div>` : empty('لا يوجد محظورون.')}</section>
        <section class="ad-card"><h2>سجل التدقيق (${nf(a.total)})</h2><p class="ad-muted">سجل إضافة فقط لكل عملية إدارية: من، ماذا، على من، ولماذا.</p>${a.list.length ? `<div class="ad-list">${a.list.map((x) => `<div class="ad-line"><span>${esc(ACTIONS[x.action] || x.action)}<small>${esc(x.actor)} (${esc(x.role)}) ${x.target ? '· <code dir="ltr">' + esc(String(x.target).slice(0, 13)) + '</code>' : ''} ${esc(x.detail)}</small></span><small>${dt(x.ts)}</small></div>`).join('')}</div>` : empty('ما فيه عمليات مسجّلة بعد.')}</section>`;
    },
    settings(d) {
      const s = d.settings; if (!s) return empty('جاري التحميل…');
      return `<div class="ad-note">${esc(s.note)}</div><section class="ad-card"><h2>إعدادات المنصة (للقراءة)</h2>${kv(Object.entries(s.values).map(([k, v]) => [k, typeof v === 'boolean' ? (v ? 'نعم' : 'لا') : esc(v)]))}</section>`;
    },
    maintenance(d) {
      const m = d.maintenance; if (!m) return empty('جاري التحميل…');
      return `<section class="ad-card"><h2>وضع الصيانة: <span class="${m.on ? 'neg' : 'pos'}">${m.on ? 'مفعّل' : 'مطفأ'}</span></h2>${m.on ? `<p class="ad-muted">منذ ${dt(m.since)} بواسطة ${esc(m.by)}</p>` : ''}
        ${m.persistent ? '' : '<div class="ad-note bad">تنبيه: الخادم يعمل بدون ملف بيانات (WALLET_FILE)، فحالة الصيانة تضيع عند إعادة التشغيل.</div>'}
        <p class="ad-muted">عند التفعيل: يُمنع اللاعبون العاديون من كل واجهات الخادم والاتصال الحي ويظهر لهم الشاشة أدناه؛ الطاقم والإدارة والمراقبة تبقى شغّالة. المباريات الجارية تتوقف عن استقبال حركات اللاعبين (يستمر الخادم بمهلها).</p>
        <form data-adf="maint" class="ad-form col"><label>رسالة الصيانة (تظهر للاعبين)<textarea class="ad-in" name="message" rows="3" maxlength="300">${esc(m.message)}</textarea></label>
        <div class="ad-form"><button class="ad-btn ${m.on ? '' : 'danger'}" type="submit" name="on" value="1" ${m.on ? '' : 'data-arm="1"'}>${m.on ? 'حفظ الرسالة' : 'تفعيل الصيانة'}</button>${m.on ? '<button class="ad-btn" type="submit" name="on" value="0">إلغاء الصيانة</button>' : ''}</div></form></section>
        <section class="ad-card"><h2>معاينة الرسالة</h2><div class="ad-preview"><b>🛠️ صيانة</b><p>${esc(m.message)}</p></div></section>`;
    },
    health(d) {
      const h = d.health; if (!h) return empty('جاري الفحص…');
      const ICON = { ok: '🟢', warn: '🟡', bad: '🔴' }, WORD = { ok: 'كل شي سليم', warn: 'فيه أشياء تحتاج انتباه', bad: 'فيه مشكلة لازم تنحل' };
      const rows = h.checks.map((c) => `<div class="ad-line hl-row hl-${c.state}"><span><b>${ICON[c.state]} ${esc(c.label)}</b><small>${esc(c.detail)}</small></span></div>`).join('');
      const b = d.backups;
      const bk = S.me?.role !== 'owner' ? '' : !b ? `<section class="ad-card"><h2>النسخ الاحتياطية</h2>${empty('النسخ الاحتياطية مطفية على هالخادم.')}</section>` : `<section class="ad-card"><h2>النسخ الاحتياطية</h2>
        <p class="ad-muted">تنسوي نسخة تلقائية كل يوم من كل ملفات البيانات (الأرصدة، الحسابات، المشتريات، الغرف، القبائل…) وتنحفظ آخر ${nf(b.keep)} نسخة على السيرفر. نزّل نسخة كل فترة واحفظها عندك برا السيرفر. الملف فيه بيانات حساسة — لا ترسله لأحد.</p>
        <div class="ad-bar"><button class="ad-btn" data-ad="backup-now" ${b.running ? 'disabled' : ''}>سوّ نسخة الحين</button></div>
        ${b.list.length ? `<div class="ad-list">${b.list.map((x) => `<div class="ad-line"><span><b dir="ltr">${esc(x.name)}</b><small>${dt(x.at)} · ${nf(Math.round(x.size / 1024))} KB${x.files ? ` · ${nf(x.files)} ملف` : ''}</small></span><button class="ad-btn ghost" data-ad="backup-dl" data-name="${esc(x.name)}">تنزيل</button></div>`).join('')}</div>` : empty('ما فيه نسخ للحين.')}</section>`;
      return `<div class="ad-bar"><button class="ad-btn ghost" data-ad="refresh">فحص من جديد</button><span class="ad-muted">آخر فحص: ${dt(h.at)}</span></div>
        <section class="ad-card hl-head hl-${h.overall}"><h2>${ICON[h.overall]} ${WORD[h.overall]}</h2><div class="ad-grid">${stat('مدة التشغيل', dur(h.uptimeSec))}${stat('لاعبين متصلين الحين', nf(h.players))}${stat('قفل الضيوف', h.guests.readOnly ? (h.guests.lockAt > h.at ? 'مهلة لين ' + dt(h.guests.lockAt) : 'مفعّل') : 'مطفي')}</div></section>
        <section class="ad-card"><h2>الخدمات</h2><div class="ad-list">${rows}</div></section>${bk}`;
    },
    system(d) {
      const s = d.system; if (!s) return empty('جاري التحميل…');
      const stores = Object.entries(s.storage.stores);
      return `<div class="ad-bar"><button class="ad-btn ghost" data-ad="refresh">تحديث</button></div><div class="ad-grid">${stat('حالة الجاهزية', s.storage.ready ? 'سليمة' : 'متدهورة')}${stat('مدة التشغيل', dur(s.uptimeSec))}${stat('ذاكرة الخادم', nf(s.memory.rssMb) + ' م.ب', `Heap ${nf(s.memory.heapMb)} م.ب`)}${stat('تأخر حلقة الأحداث', nf(s.eventLoopLagMs) + ' م.ث')}${stat('اتصالات حيّة', nf(s.connections))}${stat('جوائز معلّقة', nf(s.pendingPayouts))}</div>
        <section class="ad-card"><h2>مخازن البيانات</h2>${kv(stores.map(([k, v]) => [k, v === 'ok' ? 'سليم' : v === 'volatile' ? 'بالذاكرة فقط (غير دائم)' : 'فاشل ⚠️']))}</section>
        <section class="ad-card"><h2>معلومات التشغيل</h2>${kv([['Node', esc(s.node)], ['حالة الإدارة دائمة بملف', s.platformPersistent ? 'نعم' : 'لا'], ['سجلات التدقيق', nf(s.auditEntries)]])}</section>
        <section class="ad-card"><h2>آخر الأخطاء (من سجل الخادم)</h2>${s.errors.length ? `<div class="ad-list">${s.errors.map((e) => `<div class="ad-line"><span><code dir="ltr">${esc(e.event)}</code><small dir="ltr">${esc(JSON.stringify(e.data)).slice(0, 160)}</small></span><small>${dt(Date.parse(e.ts))}</small></div>`).join('')}</div>` : empty('لا أخطاء مسجّلة منذ آخر تشغيل.')}</section>`;
    },
  };
  const PERM_LABEL = { 'wallet.bulk-grant':'المنح المجاني الجماعي (تفويض صريح)', 'stats.view': 'الإحصائيات', 'players.view': 'عرض اللاعبين', 'players.ban': 'حظر', 'wallet.view': 'عرض المحافظ', 'wallet.adjust': 'تعديل الأرصدة (ضمن الحدود)', 'wallet.approve': 'الموافقة على تعديلات فوق الحد', 'shop.view': 'عرض المتجر', 'shop.manage': 'إدارة المتجر', 'rooms.view': 'الغرف', 'rooms.close': 'إغلاق الغرف', 'ach.view': 'الإنجازات', 'ann.manage': 'الإعلانات', 'community.moderate': 'بلاغات المجتمع', 'audit.view': 'التدقيق', 'system.view': 'المراقبة', 'maint.manage': 'الصيانة', 'settings.view': 'الإعدادات', 'staff.manage': 'إدارة الطاقم' };

  const fk = (f) => f.dataset.adf + '#' + (f.dataset.id || f.dataset.code || '');
  // ---------------- تحميل البيانات ----------------
  const LOAD = {
    pricing: () => [['pricing','pricing']],
    progression: () => [['progression','progression']],
    verification: () => [['verification','verifications?'+new URLSearchParams({status:S.vstatus||'pending',offset:S.voff||0,limit:25})]],
    overview: () => S.me?.role==='owner' ? [['dash68','dash68?days='+(S.dashDays||7)]] : [['overview', 'overview?period='+S.period], ...(can('community.moderate') ? [['homeReports','reports?status=open']] : []), ...(can('audit.view') ? [['homeAudit','audit?limit=5']] : [])], players: () => [['players', 'players?' + new URLSearchParams({ q: S.q, sort: S.sort, offset: S.off, limit: 25 })], ['suspects', 'suspects'], ['netsig', 'net-signals']],
    economy: () => [['overview', 'overview'], ...(can('wallet.adjust') || can('wallet.approve') ? [['adj', 'adjustments']] : []), ...(can('audit.view') ? [['auditEco', 'audit?limit=200', (j) => j.list.filter((a) => a.action === 'wallet.adjust').slice(0, 20)]] : [])],
    shop: () => [['shop', 'shop'], ...(S.me?.role === 'owner' ? [['offers', 'offers']] : [])], rooms: () => [['rooms', 'rooms']], reports: () => [['reports', 'reports?status=' + (S.rstatus || 'open')]], gifts: () => [['gifts', 'gifts?' + new URLSearchParams({ q: S.gq || '', cat: S.gcat || '', off: S.goff || 0 })], ...(can('wallet.view') ? [['house', 'gift-house']] : [])], achievements: () => [['achievements', 'achievements']], notices: () => [['notices', 'notices']],
    staff: () => [['staff', 'staff']], audit: () => [['audit', 'audit?limit=100'], ['bans', 'bans']], settings: () => [['settings', 'settings']], maintenance: () => [['maintenance', 'maintenance']], system: () => [['system', 'system']], health: () => [['health', 'health'], ...(S.me?.role === 'owner' ? [['backups', 'backups']] : [])],
  };
  let seq = 0; // رد قديم يتأخر ما يكتب فوق رد أحدث (مثلاً بحث تبعه بحث)
  LOAD['owner-tools'] = () => ownerToolsVisible(S.me) ? LOAD.players() : [];
  V.bulk = () => '<section data-bulk-grants-host></section>';
  LOAD.bulk = () => [];
  let ownerToolsMount = null;
  let paymentAdminMount = null;
  let rankVipAdminMount = null;
  let socialAdminMount = null;
  let auctionAdminMount = null;
  async function load() {
    const my = ++seq; const jobs = LOAD[S.tab]?.() ?? [];
    await Promise.all(jobs.map(async ([k, path, map]) => { try { const j = await call(path); if (my === seq && S.me) S.data[k] = map ? map(j) : j; } catch (e) { if (my === seq) { S.err = e.message; if (e.code === 401) { S.me=null; S.data={}; setTok(''); } } } }));
  }
  // إعادة الرسم (بعد وصول بيانات) ما تمسح اللي كتبه المستخدم بالحقول
  function paint() {
    if (!live()) return;
    ownerToolsMount?.dispose(); ownerToolsMount = null;
    paymentAdminMount?.dispose(); paymentAdminMount = null;
    rankVipAdminMount?.dispose(); rankVipAdminMount = null;
    socialAdminMount?.dispose(); socialAdminMount = null;
    auctionAdminMount?.dispose(); auctionAdminMount = null;
    unmountBulkGrants();
    root.innerHTML = S.me ? shell((S.warn ? `<div class="ad-note warn" role="alert">${esc(S.warn)}</div>` : '') + (V[S.tab] || (() => ''))(S.data)) : loginView();
    root.querySelectorAll('[data-adf] [name]').forEach((el) => { const k = fk(el.closest('[data-adf]')) + ':' + el.name; if (k in S.dirty && el.type !== 'submit') { if (el.type === 'checkbox') el.checked = S.dirty[k] === true; else el.value = S.dirty[k]; } });
    filterNavigation();
    const ownerTools = root.querySelector('[data-owner-player-tools]');
    if (ownerTools && ownerToolsVisible(S.me)) ownerToolsMount = mountOwnerPlayerTools(ownerTools, {actor:S.me,uuid:S.player?.profile?.id,call});
    const paymentRoot=root.querySelector('[data-payment-admin]');
    if(paymentRoot && S.me?.role==='owner') paymentAdminMount=mountPaymentAdmin(paymentRoot,{call,actor:S.me});
    const rankVipRoot=root.querySelector('[data-rank-vip-admin]');
    if(rankVipRoot && S.me?.role==='owner') rankVipAdminMount=mountRankVipAdmin(rankVipRoot,{call,actor:S.me});
    const auctionRoot=root.querySelector('[data-auction-admin]');
    if(auctionRoot && S.me?.role==='owner')auctionAdminMount=mountAuctionAdminR47(auctionRoot,{call,actor:S.me});
    const tcRoot=root.querySelector('[data-tribes-cp-admin]');
    if(tcRoot && S.me?.role==='owner') import('./tribes-cp-admin-r67.js?v=r67al').then(({mountTribesCpAdmin})=>{if(tcRoot.isConnected)mountTribesCpAdmin(tcRoot,{call});}).catch(()=>{if(tcRoot.isConnected)tcRoot.textContent='تعذّر تحميل القسم. أعد فتحه.';});
    const tnRoot=root.querySelector('[data-tuning-admin]');
    if(tnRoot && S.me?.role==='owner') import('./tuning-admin-r67.js?v=r67av').then(({mountTuningAdmin})=>{if(tnRoot.isConnected)mountTuningAdmin(tnRoot,{call});}).catch(()=>{if(tnRoot.isConnected)tnRoot.textContent='تعذّر تحميل القسم. أعد فتحه.';});
    const laRoot=root.querySelector('[data-live-admin]');
    if(laRoot && S.me?.role==='owner') import('./live-admin-r67.js?v=r67ak').then(({mountLiveAdmin})=>{if(laRoot.isConnected)mountLiveAdmin(laRoot,{call});}).catch(()=>{if(laRoot.isConnected)laRoot.textContent='تعذّر تحميل القسم. أعد فتحه.';});
    const waRoot=root.querySelector('[data-watch-admin]');
    if(waRoot && S.me?.role==='owner') import('./watch-admin-r67.js?v=r67ai').then(({mountWatchAdmin})=>{if(waRoot.isConnected)mountWatchAdmin(waRoot,{call});}).catch(()=>{if(waRoot.isConnected)waRoot.textContent='تعذّر تحميل القسم. أعد فتحه.';});
    const atRoot=root.querySelector('[data-at68]');
    if(atRoot && S.me?.role==='owner') import('./admin-tools-r68.js?v=r68z10').then((M)=>{if(!atRoot.isConnected)return;const k=atRoot.dataset.at68;if(k==='suspicious')M.mountSuspicious(atRoot,{call,openLog:(q)=>{S.logQ=q;go('player-log');}});else if(k==='games')M.mountGamesControl(atRoot,{call});else if(k==='ids3')M.mountIds3(atRoot,{call});else{M.mountPlayerLog(atRoot,{call,q:S.logQ||''});}}).catch(()=>{if(atRoot.isConnected)atRoot.textContent='تعذّر تحميل القسم. أعد فتحه.';});
    const hbRoot=root.querySelector('[data-home-banners-admin]');
    if(hbRoot && S.me?.role==='owner') import('./home-banners-admin-r68.js?v=r68z').then(({mountHomeBannersAdmin})=>{if(hbRoot.isConnected)mountHomeBannersAdmin(hbRoot,{call});}).catch(()=>{if(hbRoot.isConnected)hbRoot.textContent='تعذّر تحميل القسم. أعد فتحه.';});
    const saRoot=root.querySelector('[data-site-admin]');
    if(saRoot && S.me?.role==='owner') import('./site-admin-r67.js?v=r67at').then(({mountSiteAdmin})=>{if(saRoot.isConnected)mountSiteAdmin(saRoot,{call});}).catch(()=>{if(saRoot.isConnected)saRoot.textContent='تعذّر تحميل القسم. أعد فتحه.';});
    const socialRoot=root.querySelector('[data-social-admin]');
    if(socialRoot && can('social.view')) socialAdminMount=mountSocialAdmin(socialRoot,{call,actor:S.me});
    const bulkRoot=root.querySelector('[data-bulk-grants-host]');
    if(bulkRoot && can('wallet.bulk-grant')) mountBulkGrants(bulkRoot,{call,me:{...S.me,perms:[...S.me.perms,'rewards.grant']}});
    const functional=root.querySelector('[data-functional-admin]');
    if(functional) import('./functional-admin.js?v=r68z40d').then(({mountFunctionalAdmin})=>{if(functional.isConnected)mountFunctionalAdmin(functional,{api:(path,method='GET',body)=>call(path,{method,body})});}).catch(()=>{if(functional.isConnected)functional.textContent='تعذّر تحميل أدوات الوظائف. أعد فتح التبويب.';});
  }
  async function go(tab, keep = false) { if (tab === 'owner-tools' && !ownerToolsVisible(S.me)) return; if (tab) { if (tab !== 'player-log') S.logQ = ''; S.tab = tab; S.player = null; } S.sidebarOpen=false; if (!keep) { S.err = ''; S.msg = ''; S.warn = ''; } paint(); await load(); paint(); }
  async function run(fn, ok) {
    if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; S.warn = '';
    try {
      const r = await fn(); if (ok) S.msg = ok;
      if (r?.auditOk === false && !S.warn.includes('التدقيق')) S.warn += (S.warn ? ' ' : '') + 'العملية انحفظت، بس تعذّر تسجيلها بالتدقيق. لا تعيد تنفيذها بسبب هالتنبيه؛ راجع سجل التدقيق والمراقبة.';
      return r;
    } catch (e) { S.err = e.message; if (e.code === 401) S.me = null; } finally { S.busy = false; }
  }
  async function openPlayer(id) { S.player = null; await run(async () => { S.player = await call('players/' + id); S.player.id = id; }); paint(); }
  const reopen = async () => { const id = S.player?.id; if (id) { S.player = await call('players/' + id); S.player.id = id; } };

  // ---------------- الأحداث ----------------
  const ds = (el) => el.dataset;
  root.addEventListener('click', async (e) => {
    if (!live()) return;
    // أزرار حساسة: أول ضغطة تُسلّح الزر وثاني ضغطة تنفّذ (بدون نوافذ confirm)
    const arm = e.target.closest('[data-arm="1"]');
    if (arm && arm.dataset.armed !== '1') { e.preventDefault(); arm.dataset.armed = '1'; const t = arm.textContent; arm.textContent = 'اضغط للتأكيد'; setTimeout(() => { if (arm.isConnected) { arm.dataset.armed = ''; arm.textContent = t; } }, 4000); return; }
    const g68 = e.target.closest('[data-ad68-grp]'); if (g68) { e.preventDefault(); e.stopPropagation(); const k = g68.dataset.ad68Grp; S.grpOpen ??= {}; const cur = g68.getAttribute('aria-expanded') === 'true'; S.grpOpen[k] = !cur; paint(); return; }
    const el = e.target.closest('[data-ad]'); if (!el) return;
    const a = ds(el).ad;
    if (a === 'tab') {S.navId=ds(el).navid||ds(el).t;return go(ds(el).t);}
    if (a === 'refresh') return go();
    if (a === 'offer-end') { await run(() => call('offers/' + encodeURIComponent(ds(el).id) + '/end', { method: 'POST', body: {} }), 'انتهى العرض.'); return go(); }
    if (a === 'backup-now') { await run(() => call('backups', { method: 'POST' }), 'انسوت نسخة احتياطية جديدة.'); return go(); }
    if (a === 'backup-dl') {
      const name = ds(el).name; const h = {}; const tok = getTok(); if (tok) h.Authorization = 'Bearer ' + tok;
      el.disabled = true; const t0 = el.textContent; el.textContent = 'جاري التنزيل…';
      try { const r = await fetch('/api/admin/backups/' + encodeURIComponent(name), { headers: h, cache: 'no-store' }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'ما قدرنا ننزّل النسخة.'); const url = URL.createObjectURL(await r.blob()); const a2 = document.createElement('a'); a2.href = url; a2.download = name; document.body.appendChild(a2); a2.click(); a2.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
      catch (err) { S.err = err.message; paint(); } finally { if (el.isConnected) { el.disabled = false; el.textContent = t0; } }
      return;
    }
    if (a === 'logout') {
      if(S.checking)return;
      resetBulkGrants();
      ++authEpoch;++seq;setTok('');S.checking=true;S.data={};S.player=null;S.dirty={};S.adjOperation=null;S.me=null;S.err='';S.warn='';S.search='';paint();
      try{const response=await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:'{}'});if(!response.ok)throw new Error('تعذّر إنهاء جلسة الحساب بالخادم. وصول الرمز انمسح من هالتبويب؛ أعد المحاولة.');S.err='';}
      catch(err){S.err=err.message||'تعذّر الاتصال لإنهاء جلسة الحساب؛ أعد المحاولة.';}
      finally{S.checking=false;paint();}return;
    }
    if(a==='toggle-secret'){const input=root.querySelector('input[name=token]');if(input){input.type=input.type==='password'?'text':'password';el.setAttribute('aria-pressed',String(input.type==='text'));el.setAttribute('aria-label',input.type==='text'?'إخفاء رمز الإدارة':'إظهار رمز الإدارة');}return;}
    if(a==='menu'||a==='close-menu'){S.sidebarOpen=a==='menu'?!S.sidebarOpen:false;root.querySelector('.ad-royal')?.classList.toggle('ad-sidebar-open',S.sidebarOpen);root.querySelector('[data-ad=menu]')?.setAttribute('aria-expanded',String(S.sidebarOpen));return;}
    if(a==='unavailable'){S.msg=ds(el).why;paint();return;}
    if(a==='period'){if(['7d','30d','90d'].includes(ds(el).period)){S.period=ds(el).period;return go();}return;}
    if (a === 'adjnew') {
      if (S.busy || !S.adjOperation?.result) return;
      S.adjOperation = null; S.adjKey = ''; S.err = ''; S.msg = ''; S.warn = '';
      for (const key of Object.keys(S.dirty)) if (key.startsWith('adjust#:')) delete S.dirty[key];
      return paint();
    }
    if (a === 'retry') return init();
    if (a === 'player') return openPlayer(ds(el).id);
    if (a === 'vpage') { S.voff=Math.max(0,(S.voff||0)+Number(ds(el).d)*25); return go(); }
    if (a === 'bulkadd' || a === 'bulkremove') {
      S.bulkCount=Math.max(1,Math.min(20,(S.bulkCount||1)+(a==='bulkadd'?1:-1))); S.bulkPreview=null; return paint();
    }
    if (a === 'gpage') { S.goff = Math.max(0, (S.goff || 0) + Number(ds(el).d) * 50); return go(); }
    if (a === 'gtoggle') { await run(() => call('gifts/' + ds(el).id, { method: 'POST', body: { active: ds(el).on === '1' } }), ds(el).on === '1' ? 'تفعّلت الهدية.' : 'تعطّلت الهدية.'); return go(undefined, true); }
    if (a === 'rplayer') { S.tab = 'players'; await go('players'); return openPlayer(ds(el).id); }
    if (a === 'rstatus') { S.rstatus = ds(el).s; return go(); }
    if (a === 'pback') { S.player = null; return go(); }
    if (a === 'ppage') { S.off = Math.max(0, S.off + Number(ds(el).d) * 25); return go(); }
    const pid = S.player?.id;
    if (a === 'unban' && pid) { await run(async () => { await call(`players/${pid}/unban`, { method: 'POST' }); await reopen(); }, 'تم رفع الحظر.'); return paint(); }
    if (a === 'unstaff' && pid) { await run(async () => { await call('staff/' + pid, { method: 'DELETE' }); await reopen(); }, 'أُزيل من الطاقم.'); return paint(); }
    if (a === 'clrs') { e.preventDefault(); await run(() => call(`players/${ds(el).id}/clear-suspect`, { method: 'POST' }), 'رُفع الاشتباه.'); return go(undefined, true); }
    if (a === 'adjok' || a === 'adjno') { e.preventDefault(); await run(() => call(`adjustments/${ds(el).id}/${a === 'adjok' ? 'approve' : 'reject'}`, { method: 'POST', body: {} }), a === 'adjok' ? 'نُفِّذ التعديل بموافقتك.' : 'رُفض الطلب.'); return go(undefined, true); }
    if (a === 'srm') { await run(() => call('staff/' + ds(el).id, { method: 'DELETE' }), 'أُزيل من الطاقم.'); return go(undefined, true); }
    if (a === 'ntoggle') { await run(() => call('notices/' + ds(el).id, { method: 'PUT', body: { active: ds(el).on === '1' } }), 'تم التحديث.'); return go(undefined, true); }
    if (a === 'ndel') { await run(() => call('notices/' + ds(el).id, { method: 'DELETE' }), 'تم الحذف.'); return go(undefined, true); }
  });
  const remember = (e) => {
    const f=e.target.closest('[data-adf]'); if (!f||!e.target.name) return;
    S.dirty[fk(f)+':'+e.target.name]=e.target.type==='checkbox'?e.target.checked:e.target.value;
    // مفتاح التعديل مرتبط ببصمة المحتوى عند الإرسال؛ حدث input بروحه ما يلغي حماية إعادة المحاولة.
    if(f.dataset.adf==='bulk'&&e.target.name!=='confirmCount') { S.bulkPreview=null; const b=f.querySelector('[value="execute"]'); if(b)b.disabled=true; }
  };
  root.addEventListener('input',e=>{if(e.target.closest('[data-adf=navsearch]')){S.search=e.target.value;filterNavigation();return;}remember(e);}); root.addEventListener('change',(e)=>{const d68=e.target.closest('[data-ad68-days]');if(d68){S.dashDays=Number(d68.value)===30?30:7;load().then(paint);return;}remember(e);});
  /* حالة «جاري التنفيذ»: الزر يتعطل وتتغير كتابته طول الطلب (ضغطة ثانية ما ترسل شي)، ويرجع بعد النجاح أو الفشل.
     ما نغيّر مهلة الطلبات؛ الرسالة النهائية (نجاح/خطأ) تطلع فوق كالعادة. */
  root.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-adf]'); if (!f || !live()) return; e.preventDefault();
    if (f.dataset.busy === '1') return;
    const btn = e.submitter || f.querySelector('[type=submit]');
    const label = btn?.textContent;
    if (!['psearch', 'navsearch', 'gsearch'].includes(f.dataset.adf)) {
      f.dataset.busy = '1'; f.setAttribute('aria-busy', 'true');
      for (const b of f.querySelectorAll('button')) b.disabled = true;
      if (btn) btn.textContent = 'جاري التنفيذ…';
    }
    // لو فشل الطلب نرجّع اللي كتبه المستخدم بالحقول (ما يضطر يعيد الكتابة عشان يعيد المحاولة)
    const pre = fk(f) + ':'; for (const el of f.querySelectorAll('[name]')) if (el.name && el.type !== 'submit' && el.type !== 'password') S.dirty[pre + el.name] = el.type==='checkbox'?el.checked:el.value;
    const saved = Object.fromEntries(Object.entries(S.dirty).filter(([key]) => key.startsWith(pre)));
    try { await onSubmit(e, f); if (S.err && f.dataset.adf !== 'login') { Object.assign(S.dirty, saved); paint(); } } finally {
      if (f.isConnected) { delete f.dataset.busy; f.removeAttribute('aria-busy'); for (const b of f.querySelectorAll('button')) b.disabled = false; if (btn && label !== undefined) btn.textContent = label; }
    }
  });
  async function onSubmit(e, f) {
    const k = f.dataset.adf; const fd = new FormData(f);
    if (!['psearch','bulk'].includes(k)) for (const key of Object.keys(S.dirty)) if (key.startsWith(fk(f) + ':')) delete S.dirty[key]; // المنح يبقي المحتوى لمرحلة التأكيد
    const v = (n) => String(fd.get(n) ?? '').trim();
    const num = (n) => (v(n) === '' ? NaN : Number(v(n)));
    const sub = e.submitter;
    const ts = (n) => { const x = v(n); return x ? new Date(x).getTime() : 0; };
    if (k === 'offeradd') { await run(() => call('offers', { method: 'POST', body: { itemId: v('itemId'), discount: num('discount'), hours: num('hours'), ...(ts('startsAt') ? { startsAt: ts('startsAt') } : {}), exclusive: fd.get('exclusive') === 'on' } }), 'انضاف العرض.'); return go(); }
    if (k === 'pricing') {
      await run(async () => {
        if (!fd.has('ack')) throw new Error('لازم تعتمد القيم قبل الحفظ.');
        const packPrices = {};
        for (const x of [...(S.data.pricing?.coinPacks||[]),...(S.data.pricing?.gemPacks||[])]) {
          const price=v('price-'+x.id), cur=v('currency-'+x.id);
          if (!price && !cur) packPrices[x.id]=null;
          else { if(!price || !cur) throw new Error('كل سعر يحتاج مقدار ورمز عملة.'); packPrices[x.id]={minorUnits:Number(price),currency:cur}; }
        }
        const r=await call('pricing',{method:'POST',body:{gemsToCoinsRate:v('rate')?Number(v('rate')):null,coinToGemsEnabled:false,packPrices}});
        S.data.pricing=r; S.msg='انحفظت السياسة، بدون منح رصيد أو تفعيل دفع.'+(r.auditOk===false?' تنبيه: تعذر سجل التدقيق.':'');
      }); return paint();
    }
    if (k === 'progression') {
      await run(async()=>{
        const thresholds=(key,count)=>{ const a=v(key).split(/[,،\s]+/).filter(Boolean).map(Number); if(!(Array.isArray(count)?count:[count]).includes(a.length)||a.some((x,i)=>!Number.isSafeInteger(x)||x<0||(i>0&&x<=a[i-1])))throw new Error('العتبات يجب أن تكون أعدادًا صحيحة مرتبة تصاعديًا.'); return a; };
        let rewards; try{rewards=JSON.parse(v('rewards')||'{}');}catch{throw new Error('سياسة المكافآت ليست JSON صالحًا.');}
        const r=await call('progression',{method:'POST',body:{vip:{enabled:fd.has('vipEnabled'),thresholds:thresholds('vipThresholds',15)},noble:{enabled:fd.has('nobleEnabled'),thresholds:thresholds('nobleThresholds',[5,9])},rewards}});
        S.data.progression={...S.data.progression,...r}; S.msg='حُفظت سياسة التقدم.'+(r.auditOk===false?' تنبيه: تعذر سجل التدقيق.':'');
      }); return paint();
    }
    if (k === 'progressgrant') { await run(async()=>{const r=await call(`progression/${encodeURIComponent(v('playerId'))}/grant`,{method:'POST',body:{system:v('system'),points:num('points'),ref:v('ref'),reason:v('reason')}}); S.msg=r.dup?'نفس المنح السابق، بلا تكرار.':'مُنحت نقاط التقدم.';},null); return go(undefined,true); }
    if (k === 'vfilter') { S.vstatus=v('status'); S.voff=0; return go(); }
    if (k === 'vdecide' || k === 'vrevoke') { await run(()=>call(`verifications/${encodeURIComponent(k==='vrevoke'?v('playerId'):f.dataset.id)}/${k==='vrevoke'?'revoke':sub?.value==='accept'?'accept':'reject'}`,{method:'POST',body:{reason:v('reason'),ref:v('ref')}}),'حُفظ قرار التوثيق.'); return go(undefined,true); }
    if (k === 'bulkpermission') { await run(()=>call(`staff/${f.dataset.id}/bulk-permission`,{method:'POST',body:{enabled:sub?.value==='1',reason:v('reason')}}),'حُفظ تفويض المنح الجماعي.'); return go(undefined,true); }
    if (k === 'login') { if(S.checking)return; if(!v('token')) {S.err='أدخل رمز الإدارة الحالي أو استخدم حساب الطاقم.';return paint();} setTok(v('token')); return init(false); }
    if(k==='navsearch'){const q=v('q');S.search=q;const match=TABS.find(t=>can(t[2])&&t[1].includes(q));if(q&&match){S.navId=match[0];return go(match[0]);}if(q&&can('players.view')){S.q=q;S.off=0;S.navId='players';return go('players');}filterNavigation();return;}
    if (k === 'psearch') { S.q = v('q'); S.sort = v('sort'); S.off = 0; return go(); }
    const pid = S.player?.id;
    if (k === 'bulk') {
      const preview=sub?.value==='preview';
      await run(async()=>{
        const rewards=Array.from({length:S.bulkCount||1},(_,i)=>{const kind=v('kind-'+i);return kind==='item'?{type:'item',itemId:v('itemId-'+i),mode:'grant'}:{type:'currency',cur:kind,amount:num('amount-'+i)};});
        if(!preview&&!S.bulkPreview)throw new Error('أعد المعاينة قبل التنفيذ.');
        const r=await call('bulk-grants',{method:'POST',body:{operationId:v('operationId'),filter:v('filter'),...(v('filter')==='date-range'?{from:ts('from'),to:ts('to')}:{}),rewards,reason:v('reason'),preview,...(!preview?{fingerprint:S.bulkPreview.fingerprint,confirmCount:num('confirmCount')}: {})}});
        if(r.preview) { S.bulkPreview=r; S.bulkResult=null; S.msg=`تمت المعاينة: ${nf(r.beneficiaries)} مستفيد، نجاح متوقع ${nf(r.succeeded)} وفشل ${nf(r.failed)}.`; }
        else { S.bulkResult=r; S.bulkPreview=null; S.msg=`اكتمل الطلب: نجح ${nf(r.succeeded)} وفشل ${nf(r.failed)}.${r.duplicate?' نفس العملية بلا تكرار.':''}${r.auditOk===false?' تنبيه: تعذر سجل التدقيق.':''}`; }
      }); return paint();
    }
    if (k === 'adjust' && pid) {
      await run(async () => {
        const body = { cur: v('cur'), delta: Number(v('delta')), reason: v('reason'), ...(v('confirm') ? { confirm: Number(v('confirm')) } : {}) };
        const fingerprint = JSON.stringify([S.me?.id, S.me?.role, pid, body.cur, body.delta, body.reason]);
        if (S.adjOperation?.fingerprint !== fingerprint) {
          S.adjOperation = { fingerprint, target: pid, key: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2), result: null };
        }
        const operation = S.adjOperation;
        const r = operation.result || await call(`players/${pid}/adjust`, { method: 'POST', body: { ...body, key: operation.key } });
        operation.result = r; // نجاح معروف: إعادة نفس النموذج تعرض النتيجة، مب عملية ثانية.
        S.msg = r.pending ? 'تجاوز الحد: رُفع طلب للمالك ولم يُنفَّذ التعديل بعد (رقم ' + r.request.id + ').' : 'تم التعديل' + (r.before !== undefined ? ' (الرصيد ' + nf(r.before) + ' ← ' + nf(r.after) + ')' : '') + (r.duplicate ? ' (الطلب مكرر: لم يُنفَّذ مرتين)' : '') + '.';
        try { await reopen(); }
        catch { S.warn += (S.warn ? ' ' : '') + 'تعذّر تحديث تفاصيل اللاعب؛ نتيجة الطلب محفوظة فوق. حدّث العرض، ولا تعيد التعديل بسبب تعثر التحديث.'; }
        return r;
      });
      if (S.err) for (const n of ['cur', 'delta', 'reason', 'confirm']) { const x = v(n); if (x) S.dirty[fk(f) + ':' + n] = x; }
      return paint();
    }
    if (k === 'ban' && pid) { await run(async () => { await call(`players/${pid}/ban`, { method: 'POST', body: { reason: v('reason') } }); await reopen(); }, 'تم الحظر.'); return paint(); }
    if (k === 'staff' && pid) { await run(async () => { await call('staff', { method: 'POST', body: { id: pid, role: v('role') } }); await reopen(); }, 'تم التعيين.'); return paint(); }
    if (k === 'shopnew') {
      const slot = v('slot'); const css = slot === 'frame' ? v('cssFrame') : slot === 'bg' ? v('cssBg') : slot === 'chat-bubble' ? v('cssBubble') : slot === 'board' ? v('cssBoard') : slot === 'special-id' || slot === 'room-id' ? v('cssId') : v('cssText');
      const item = { id: v('id'), slot, name: v('name'), icon: v('icon'), desc: v('desc'), price: num('price'), currency: v('currency'), css, status:v('status'), minLevel:num('minLevel'), minVip:num('minVip'), minNoble:num('minNoble') };
      await run(async () => {
        try { await call('shop/items', { method: 'POST', body: item }); }
        catch (err) {
          // إعادة محاولة بعد طلب انقطع ردّه: الخادم يرفض المعرّف المكرر (409) فما يتكرر المنتج. لو الموجود هو نفس منتجك نوضح إن الطلب الأول نجح
          if (err.code !== 409) throw err;
          const cur = (await call('shop')).items?.find((x) => x.id === item.id);
          if (!cur || cur.name !== item.name || cur.price !== item.price || cur.slot !== item.slot) throw err;
          return 'dup';
        }
      }, 'أُضيف المنتج.').then((r) => { if (r === 'dup') S.msg = 'المنتج «' + item.name + '» موجود بنفس البيانات: طلبك السابق نجح، وما انضاف مرة ثانية.'; });
      return go(undefined, true);
    }
    if (k === 'shopedit') { const op = sub?.value; const id = f.dataset.id; await run(() => call('shop/items/' + id, { method: 'PUT', body: op === 'save' ? { name: v('name'), icon: v('icon'), desc: v('desc'), price: v('currency') === 'gems' ? Math.max(1, Math.round(num('price') / 20)) : num('price'), currency: v('currency'),status:v('status'),minLevel:num('minLevel'),minVip:num('minVip'),minNoble:num('minNoble') } : { active: op === 'on' } }), op === 'save' ? 'حُفظ التعديل.' : op === 'on' ? 'فُعّل البيع.' : 'أُوقف البيع.'); return go(undefined, true); }
    if (k === 'gsearch') { S.gq = v('q'); S.gcat = v('cat'); S.goff = 0; return go(); }
    if (k === 'gprice') { await run(() => call('gifts/' + f.dataset.id, { method: 'POST', body: { price: Number(v('price')) } }), 'تم حفظ السعر.'); return go(undefined, true); }
    if (k === 'rdecide') { const op = sub?.value === 'remove' ? 'remove' : 'dismiss'; await run(() => call(`reports/${f.dataset.id}/${op}`, { method: 'POST', body: { reason: v('reason') } }), op === 'remove' ? 'انحذف المحتوى وانقفل البلاغ.' : 'انرفض البلاغ.'); return go(undefined, true); }
    if (k === 'close') { await run(() => call(`rooms/${f.dataset.code}/close`, { method: 'POST', body: { reason: v('reason') } }), 'أُغلقت الغرفة.'); return go(undefined, true); }
    if (k === 'notice') { await run(() => call('notices', { method: 'POST', body: { kind: v('kind'), title: v('title'), body: v('body'), startsAt: ts('startsAt'), endsAt: ts('endsAt'), active: true } }), 'تم النشر.'); return go(undefined, true); }
    if (k === 'maint') { const on = sub?.value === '1'; await run(() => call('maintenance', { method: 'POST', body: { on: !!on, message: v('message') } }), on ? 'تم حفظ حالة الصيانة (مفعّلة).' : 'الصيانة مطفأة.'); return go(undefined, true); }
  }

  function filterNavigation(){
    const term=(S.search||'').trim().toLowerCase();const entries=[...root.querySelectorAll('[data-ad-entry]')];
    for(const entry of entries)entry.hidden=!!term&&!entry.dataset.adLabel.toLowerCase().includes(term);
    const empty=root.querySelector('[data-ad-search-empty]');if(empty)empty.hidden=!term||entries.some(x=>!x.hidden);
    if(term)root.querySelector('.ad-more')?.setAttribute('open','');
  }
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.sidebarOpen){S.sidebarOpen=false;root.querySelector('.ad-royal')?.classList.remove('ad-sidebar-open');root.querySelector('[data-ad=menu]')?.setAttribute('aria-expanded','false');root.querySelector('[data-ad=menu]')?.focus();}});
  async function init(quiet=false) {
    if(S.checking)return;
    const epoch=++authEpoch;S.checking=true;S.err='';S.msg='';paint();
    try{const actor=await call('me');if(epoch!==authEpoch||!live())return;S.me=actor;S.msg=actor?.role==='owner'?'':'تم التحقق من صلاحيات حسابك من الخادم.';}
    catch(e){if(epoch!==authEpoch||!live())return;S.me=null;const hadToken=!!getTok();setTok('');S.data={};S.err=(quiet&&!hadToken&&[401,403].includes(e.code))?'':e.code===429?'محاولات كثيرة؛ انتظر شوي قبل المحاولة.':e.code===0?'تعذّر الاتصال بالخادم.':e.code===401||e.code===403?'بيانات الدخول غير صحيحة أو الحساب ما عنده صلاحية إدارة.':'تعذّر التحقق من الإدارة؛ حاول مرة ثانية.';}
    finally{if(epoch===authEpoch)S.checking=false;}
    if(epoch!==authEpoch||!live())return;
    if(S.me){S.tab=can('stats.view')?'overview':TABS.find(t=>t[0]!=='owner-tools'&&can(t[2]))?.[0]||'overview';S.navId=S.tab;return go(S.tab,true);}
    paint();
  }

  init(true);
}
