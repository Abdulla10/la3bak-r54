/* Store body only. The existing host owns authentication, mutations and routing.
 * The versioned import deliberately shares the host's canonical SHOP singleton.
 * No catalogue, balances, cash prices, exchange rate or account is invented here.
 */
import * as SHOP from '../shop.js?v=r58l';
import { renderProfileIcon } from '../preview/assets/profile/ui-icons-inline.js?v=r58p';
import * as BACKGROUNDS from './backgrounds.js?v=r58l';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const categories = Object.freeze([
  ['avatar', 'الأفاتارات', 'person', 'اختار المظهر اللي يناسبك'],
  ['frame', 'الإطارات', 'frame', 'خل مظهرك يتميّز بإطاره'],
  ['bg', 'الخلفيات', 'image', 'غيّر خلفية ملفك'],
  ['title', 'الألقاب', 'crown', 'شوف الألقاب وشروط استحقاقها'],
  ['badge', 'الشارات', 'medal', 'شوف شاراتك وشروط فتحها'],
  ['sets', 'المجموعات', 'shirt', 'عاين عناصر المجموعة مع بعض']
]);
let svgSequence = 0;

function icon(name) {
  // The existing inline icon generator uses IDs: namespace each instance so the
  // shared shell and this page can never repeat SVG gradient IDs.
  const prefix = `lb-store-art-${++svgSequence}-`;
  return renderProfileIcon(name)
    .replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}${esc(id)}"`)
    .replace(/url\(#([^\)]+)\)/g, (_, id) => `url(#${prefix}${esc(id)})`);
}

function hero() {
  return `<section class="hero lb-store-hero"><div class="hero-symbol" aria-hidden="true">${icon('shop')}${icon('crown')}</div><h1>المتجر</h1><p class="subtitle">اختار مظهرك وإطارك وخل ملفك على ذوقك</p><a class="btn ghost" href="#/auction">مزادات المقتنيات</a></section>`;
}

function stateHTML(kind, message) {
  const alert = kind === 'error' ? 'alert' : 'status';
  const retry = kind === 'error' ? '<button class="btn gold-btn" type="button" data-act="shop-reload">جرّب مرة ثانية</button>' : '';
  const login = kind === 'login' ? '<a class="gold-btn" href="#/account">دخول الحساب</a>' : '';
  return `<section class="panel lb-store-state" data-store-state="${esc(kind)}"><div class="card-art" aria-hidden="true">${icon(kind === 'login' ? 'person' : 'shop')}</div><h2 class="panel-title">${kind === 'login' ? 'حيّاك في المتجر' : kind === 'loading' ? 'نجهّز لك المتجر' : kind === 'unsupported' ? 'المتجر يحتاج ربط الصفحة الحالية' : 'المتجر مب متاح الحين'}</h2><p role="${alert}">${esc(message)}</p>${retry}${login}</section>`;
}

function overview(selected) {
  return `<section class="panel lb-store-categories" aria-label="تصفّح أقسام المتجر"><h2 class="panel-title">على ذوقك</h2><div class="grid3">${categories.map(([slot, name, symbol, description]) => `<button type="button" class="card lb-store-category${selected === slot ? ' active' : ''}" data-act="shop-tab" data-v="${esc(slot)}" aria-pressed="${selected === slot}"><span class="card-art" aria-hidden="true">${icon(symbol)}</span><span class="lb-store-category-title">${esc(name)}</span><small>${esc(description)}</small></button>`).join('')}</div></section>`;
}

function limitations() {
  return `<aside class="panel lb-store-limitations" aria-label="الخدمات غير المتاحة"><h2 class="panel-title">قبل لا تختار</h2><div class="list-row">${icon('shield')}<div class="grow"><b>المظاهر ما تعطي أفضلية في اللعب</b><small>الأسعار والملكية وشروط الاستحقاق من الخادم، والمعاينة ما تخصم من رصيدك.</small></div></div><div class="list-row">${icon('coin')}<div class="grow"><b>الشحن بفلوس حقيقية مب مفعّل</b><small>كميات الباقات من السياسة الحالية. ما فيه دفع أو تعبئة رصيد من هالواجهة، والتحويل يشتغل بس إذا الخادم مفعّله.</small></div></div><div class="list-row">${icon('crown')}<div class="grow"><b>VIP ومظاهر القطع</b><small>ما فيه اشتراك VIP أو شراء مظاهر قطع مدعوم بهالمتجر. وما بنعرض خصومات أو «الأكثر مبيعًا» من دون بيانات فعلية.</small></div></div></aside>`;
}

function safeURL(value, image = false) {
  const text = String(value ?? '').trim();
  if (!text || /[\u0000-\u0020\u007f\\]/.test(text) || text.startsWith('//')) return false;
  if (!image && /^#(?:\/|[A-Za-z_])/.test(text)) return true;
  if (/^\/(?!\/)/.test(text)) return true;
  try {
    const url = new URL(text, 'https://la3bak.invalid');
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    // All current cosmetic artwork is same-origin. Do not permit a dynamic
    // catalogue entry to insert an external tracking image or navigation URL.
    return typeof location !== 'undefined' && url.origin === location.origin;
  } catch { return false; }
}

function clean(fragment) {
  fragment.querySelectorAll('script,style,iframe,object,embed,base,link,meta').forEach(node => node.remove());
  for (const node of fragment.querySelectorAll('*')) {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (name.startsWith('on') || ['srcdoc', 'srcset', 'formaction', 'action', 'target'].includes(name)) node.removeAttribute(attribute.name);
      else if (['src', 'href', 'xlink:href'].includes(name) && !safeURL(value, name === 'src')) node.removeAttribute(attribute.name);
      else if (name === 'style' && /url\s*\(|expression|javascript:|@import|behavior|-moz-binding/i.test(value)) node.removeAttribute(attribute.name);
      else if (name === 'autofocus') node.removeAttribute(attribute.name);
    }
  }
  // Remap SVG artwork IDs only; preserve all existing form/control/player IDs.
  for (const svg of fragment.querySelectorAll('svg')) {
    const ids = new Map();
    const prefix = `lb-store-svg-${++svgSequence}-`;
    for (const node of svg.querySelectorAll('[id]')) {
      const old = node.id;
      const next = `${prefix}${ids.size}`;
      ids.set(old, next);
      node.id = next;
    }
    for (const node of [svg, ...svg.querySelectorAll('*')]) {
      for (const attribute of [...node.attributes]) {
        let value = attribute.value.replace(/url\(#([^\)]+)\)/g, (whole, id) => ids.has(id) ? `url(#${ids.get(id)})` : whole);
        if (['href', 'xlink:href'].includes(attribute.name) && value.startsWith('#') && ids.has(value.slice(1))) value = `#${ids.get(value.slice(1))}`;
        if (value !== attribute.value) node.setAttribute(attribute.name, value);
      }
    }
  }
}

function replaceParagraph(dialog, text) {
  if (!dialog) return;
  const p = dialog.querySelector('p');
  if (p) p.textContent = text;
  // Old confirmation HTML projected balances in the browser. Keep only the
  // server-provided price/rate, and show the saved balance after host refresh.
}

function withoutBalanceProjections(content) {
  const d = SHOP.SH.data;
  const nf = number => Number.isSafeInteger(number) && number >= 0 ? new Intl.NumberFormat('ar-AE-u-nu-latn').format(number) : '—';
  const purchase = content.querySelector('[data-act="shop-buy"]')?.closest('[role="dialog"]');
  if (purchase) {
    const item = d?.items?.find(entry => entry.id === SHOP.SH.confirm);
    replaceParagraph(purchase, item ? `${item.name} · ${nf(item.price)} ${item.currency === 'gems' ? 'جوهرة' : 'عملة'}. السعر من الخادم؛ الرصيد المحدّث يظهر عقب تأكيد الحفظ.` : 'راجع سعر العنصر اللي اخترته. الخادم يتحقق من السعر والرصيد قبل حفظ الشراء.');
  }
  const gemDialog = content.querySelector('[data-act="shop-gem-buy"]')?.closest('[role="dialog"]');
  if (gemDialog) {
    const pack = d?.gemPacks?.find(entry => entry.id === SHOP.SH.gemConfirm);
    replaceParagraph(gemDialog, pack ? `${nf(pack.gems)} جوهرة مقابل ${nf(pack.coins)} عملة، حسب باقة الخادم. الرصيد المحدّث يظهر عقب الحفظ.` : 'هذي باقة تحويل افتراضية فقط؛ الخادم يتحقق من تفعيلها وسعرها.');
  }
  const conversion = content.querySelector('[data-act="shop-convert-go"]')?.closest('[role="dialog"]');
  if (conversion) {
    const confirmation = SHOP.SH.convertConfirm;
    replaceParagraph(conversion, confirmation ? `تحويل ${nf(confirmation.gems)} جوهرة. نسبة الخادم اللي راجعتها: ${nf(confirmation.rate)} عملة لكل جوهرة. الخادم ينفّذ الخصم والإضافة مع بعض.` : 'الخادم ينفّذ الخصم والإضافة مع بعض حسب النسبة اللي راجعتها.');
  }
}

function transformHTML(source) {
  const template = document.createElement('template');
  template.innerHTML = source.replace(/\/assets\/reference\/(ref-[pk]-(?:av|frame|badge|title)-\d+)\.webp/g,'/preview/assets/cosmetics/$1.png').replaceAll('/assets/reference/','/preview/assets/cosmetics/');
  // R23 is already a body-only storefront. Preserve its compact header
  // and keep the existing content sanitation without re-adding the retired overview.
  if(template.content.querySelector('.r23-store')){
    clean(template.content);
    const selected=template.content.querySelector('.r23-store')?.dataset.storeTab||'';
    const holder=document.createElement('div');holder.append(template.content);
    return {html:holder.innerHTML,selected,hasCatalogue:true,modern:true};
  }
  const shellBody = template.content.querySelector('[data-shell-content]');
  if (shellBody) {
    const body = document.createDocumentFragment();
    while (shellBody.firstChild) body.append(shellBody.firstChild);
    template.content.replaceChildren(body);
  }
  // Never carry the old page shell, drawer, header or canonical wallet strip.
  template.content.querySelectorAll('header,footer,.lpu-background,.lpu-shell-heading,.lpu-wallets,.wallet-strip,.topbar,.bottom-nav,.drawer,.drawer-backdrop,.lpu-drawer,.lpu-drawer-backdrop,.lpu-bottom-nav,.ref-hero').forEach(node => node.remove());
  for (const head of template.content.querySelectorAll('.sh-head')) {
    // The same canonical balances are already shown by the common shell.
    const hint = head.querySelector('.hint');
    if (hint) {
      hint.textContent = 'المظاهر شكلية بس. الأسعار وشروط الاستحقاق من الخادم، والعملات والجواهر افتراضية وما تتحول لفلوس. باقات الشحن لها صفحة مستقلة داخل المتجر؛ التوفر والأسعار ووضع الاختبار يتأكدون من الخادم.';
      head.replaceChildren(hint);
      head.className = 'panel lb-store-policy';
    } else head.remove();
  }
  for (const node of template.content.querySelectorAll('.ref-worlds,.sh-tabs')) node.classList.add('tabs');
  for (const node of template.content.querySelectorAll('.card:not(.sh-card)')) node.classList.add('panel');
  for (const node of template.content.querySelectorAll('.sh-grid')) node.classList.add('grid3');
  for (const node of template.content.querySelectorAll('.sh-tabs button.on,.ref-worlds button.on')) node.classList.add('active');
  for (const node of template.content.querySelectorAll('.tx-list > li,.cx-ach,.ach > li,.gl-row')) node.classList.add('list-row');
  for (const node of template.content.querySelectorAll('.btn.gold')) node.classList.add('gold-btn');
  for (const set of template.content.querySelectorAll('.cx-setcard > .hint')) set.textContent = 'كل عنصر من المجموعة ينشرى لحاله من تبويبه؛ السعر والتوفر وشروط الاستحقاق من الخادم.';
  for (const daily of template.content.querySelectorAll('.ref-daily > p')) daily.textContent = 'هذي نفس مكافأة حسابك اليومية، مب مكافأة ثانية. الاستحقاق والقيمة يتأكدون من الخادم وقت الاستلام.';
  // Remove dead legacy controls when the current backend policy does not allow
  // them; the regular cash packs remain honestly disabled in economy-view.js.
  if (!SHOP.SH.data?.economy?.legacyGemPacksEnabled) {
    template.content.querySelectorAll('[data-act="shop-gem-ask"],[data-act="shop-gem-buy"]').forEach(button => { button.disabled = true; button.removeAttribute('data-act'); button.textContent = 'التحويل القديم مب مفعّل'; });
  }
  withoutBalanceProjections(template.content);
  clean(template.content);
  const selected = template.content.querySelector('.sh-tabs > button[data-act="shop-tab"][aria-selected="true"]')?.dataset.v || '';
  const hasCatalogue = !!template.content.querySelector('.ref-store');
  if (hasCatalogue && selected === 'sets' && !template.content.querySelector('.cx-setcard')) {
    const empty = document.createElement('section');
    empty.className = 'panel empty-state';
    empty.setAttribute('role', 'status');
    empty.textContent = 'ما فيه مجموعات بهالقسم الحين. تقدر تشوف العناصر من تبويباتها.';
    template.content.querySelector('.ref-store').append(empty);
  }
  const holder = document.createElement('div');
  holder.append(template.content);
  return { html: holder.innerHTML, selected, hasCatalogue };
}

export function render(ctx = {}) {
  if (!ctx.user) return `<div data-lb-page="store" class="lb-store" dir="rtl">${hero()}${stateHTML('login', 'سجّل دخولك بحسابك الحالي عشان تشوف مقتنياتك والأسعار المتاحة لك.')}</div>`;
  const modernSource=typeof ctx.content==='string'&&ctx.content.includes('r23-store')?ctx.content:SHOP.SH.data?SHOP.shopHTML():'';
  if(modernSource.includes('r23-store')&&typeof document!=='undefined'){
    const transformed=transformHTML(modernSource);
    const connection=ctx.connected===false?'<p class="lb-store-connection" role="status">الاتصال مقطوع؛ انتظر الاتصال قبل الشراء.</p>':'';
    return `<div data-lb-page="store" class="lb-store lb-store-r23" dir="rtl">${connection}${transformed.html}</div>`;
  }
  if (SHOP.SH.tab === 'bg') return `<div data-lb-page="store" class="lb-store" dir="rtl"><nav class="tabs" aria-label="أقسام المتجر">${categories.map(([slot,name])=>`<button type="button" data-act="shop-tab" data-v="${slot}" class="${slot==='bg'?'active':''}" aria-pressed="${slot==='bg'}">${name}</button>`).join('')}</nav>${BACKGROUNDS.render(ctx)}</div>`;
  let source = typeof ctx.content === 'string' ? ctx.content.trim() : '';
  if (!source && SHOP.SH.data) source = SHOP.shopHTML();
  let body;
  if (source && typeof document !== 'undefined') {
    const transformed = transformHTML(source);
    body = `${transformed.hasCatalogue ? overview(transformed.selected) : ''}<div class="lb-store-live">${transformed.html}</div>${transformed.hasCatalogue ? limitations() : ''}`;
  } else if (SHOP.SH.err) body = stateHTML('error', SHOP.SH.err);
  else if (typeof ctx.req === 'function') body = stateHTML('loading', 'يالس نحمّل المظاهر والأسعار والمقتنيات من حسابك.');
  else body = stateHTML('unsupported', 'محتوى المتجر الحالي أو اتصال الطلبات مب متوفر. ما بنعرض منتجات أو رصيد تجريبي.');
  const connection = ctx.connected === false ? '<p class="lb-store-connection" role="status">الاتصال بالخادم مقطوع الحين. المعروض قد يكون آخر بيانات محفوظة؛ انتظر الاتصال قبل أي عملية.</p>' : '';
  return `<div data-lb-page="store" class="lb-store" dir="rtl">${hero()}<a class="btn gold-btn lb-pack-entry" href="#/shop/packs">باقات العملات والجواهر · AED</a>${connection}${body}</div>`;
}

export function mount(root, ctx = {}) {
  let destroyed = false;
  const scope = root?.matches?.('[data-lb-page="store"]') ? root : root?.querySelector?.('[data-lb-page="store"]');
  if (!scope || typeof document === 'undefined') return { destroy() { destroyed = true; } };
  if (SHOP.SH.tab === 'bg' && !scope.querySelector('.r23-store')) return BACKGROUNDS.mount(scope,ctx);
  const dialog = scope.querySelector('[role="dialog"]');
  const returnFocus = document.activeElement;
  let focusTimer;
  const onKey = event => {
    const open = scope.querySelector('[role="dialog"]');
    if (!open) return;
    if (event.key === 'Escape') {
      const cancel = open.querySelector('[data-act="shop-cancel"],[data-act="shop-convert-cancel"]');
      if (cancel && !cancel.disabled) { event.preventDefault(); cancel.click(); }
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...open.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(node => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !open.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !open.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  };
  scope.addEventListener('keydown', onKey);
  if (dialog) focusTimer = setTimeout(() => {
    if (!destroyed) dialog.querySelector('button:not([disabled]),[tabindex="0"]')?.focus({ preventScroll: true });
  }, 0);
  // The normal integration always supplies ctx.content. This fallback reuses
  // SHOP.load and the exact existing RPC helper, never another backend source.
  if (ctx.user && !ctx.content && !SHOP.SH.data && typeof ctx.req === 'function' && ctx.connected !== false) {
    SHOP.load(ctx.req).then(() => {
      if (destroyed || !scope.isConnected) return;
      const template = document.createElement('template');
      template.innerHTML = render({ ...ctx, content: SHOP.shopHTML() });
      const next = template.content.querySelector('[data-lb-page="store"]');
      if (next) scope.replaceChildren(...next.childNodes);
    });
  }
  return {
    destroy() {
      destroyed = true;
      clearTimeout(focusTimer);
      scope.removeEventListener('keydown', onKey);
      if (dialog && dialog.contains(document.activeElement) && returnFocus?.isConnected && !scope.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
    }
  };
}
