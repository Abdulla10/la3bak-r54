import * as PACKS from './payments.js?v=r134';
import { renderProfileIcon as icon } from '../preview/assets/profile/ui-icons-inline.js?v=r58p';
import { giftArt } from '../giftart.js?v=r68i-r14';

// Presentation-only adapter: all balances, policy and ledger entries come from
// the canonical wallet. No new account, payment gateway or wallet is created.
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const nat = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const positive = (value) => nat(value) && value > 0;
const number = (value) => typeof value === 'number' && Number.isSafeInteger(value) ? value.toLocaleString('ar-AE-u-nu-latn') : '—';
const currencies = { coins: 'عملة', gems: 'جوهرة' };
const kinds = { start: 'رصيد البداية', daily: 'مكافأة يومية', entry_fee: 'رسوم دخول', prize: 'جائزة', refund: 'استرجاع رسوم', purchase: 'شراء', reward: 'مكافأة', admin: 'تعديل الإدارة', gift: 'هدية', transfer: 'تحويل الرصيد' };
const tabs = [['ledger', 'file', 'سجل المعاملات'], ['packs', 'shop', 'شحن الرصيد'], ['vip', 'crown', 'اشتراك VIP'], ['rewards', 'star', 'المكافآت']];
const art = (cur, size = 30) => cur === 'gems' ? giftArt({motif:'diamond',cat:'luxury',variant:0,name:'الجواهر'},size).replace('class="gift-art','class="lbw-currency-art gift-art') : icon('coin').replace('class="pvp-icon"','class="lbw-currency-art"').replace('<svg','<svg width="'+size+'" height="'+size+'"');
const button = (label, action, disabled = false, extra = '', gold = false) => `<button type="button" class="${gold ? 'gold-btn' : 'btn'}" data-lbw-action="${action}" ${disabled ? 'disabled aria-disabled="true"' : ''} ${extra}>${label}</button>`;
const panel = (title, content) => `<section class="panel"><h2 class="panel-title">${title}</h2>${content}</section>`;
const note = (text, error = false) => `<p class="lbw-note${error ? ' lbw-error' : ''}" role="${error ? 'alert' : 'status'}">${esc(text)}</p>`;

let currentState;
function stateFor(ctx) {
  const owner = ctx.user ? String(ctx.user.id ?? ctx.me?.id ?? 'current-session') : null;
  if (!currentState || currentState.owner !== owner) {
    currentState = { owner, views: new Set(), tab: 'ledger', packCur: 'coins', data: null, ledger: null, offset: 0, total: null, loading: false, busy: false, error: '', notice: '', confirm: null, uncertain: false };
  }
  return currentState;
}
function usable(ctx) { return !!ctx.user && ctx.connected !== false && typeof ctx.req === 'function'; }
function locked(state, ctx) { return !usable(ctx) || state.loading || state.busy; }
function balance(state, ctx, cur) {
  if (!ctx.user) return undefined;
  if (nat(state.data?.[cur])) return state.data[cur];
  if (nat(ctx[cur])) return ctx[cur];
  return nat(ctx.me?.[cur]) ? ctx.me[cur] : undefined;
}
function balanceCards(state, ctx) {
  return `<div class="grid2 lbw-balances" aria-label="رصيد المحفظة">${[['coins', 'العملات']].map(([cur, label]) => `<article class="card lbw-balance"><div class="card-art">${art(cur, 64)}</div><h2>${label}</h2><strong class="lbw-value">${esc(number(balance(state, ctx, cur)))}</strong><small>رصيدك الافتراضي من الخادم</small>${button(`${icon('plus')} عرض الباقات`, 'currency', !ctx.user, `data-lbw-cur="${cur}"`)}</article>`).join('')}</div>`;
}
function dateText(timestamp) {
  if (!nat(timestamp)) return 'التاريخ مب متوفر';
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'التاريخ مب متوفر';
  return date.toLocaleString('ar-AE-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai' });
}
function ledgerView(state, ctx) {
  if (!Array.isArray(state.ledger)) return panel(`${icon('clock')} آخر العمليات`, note(state.error ? 'ما قدرنا نحمّل السجل. جرّب تحدّث المحفظة.' : 'بنحمّل معاملاتك من الخادم…'));
  // R63: عملة وحدة — سطور التحويل الداخلي تنخفى، وعمليات الجواهر القديمة تنعرض بالعملات (×20) بدون رصيد قبل/بعد
  const rows = state.ledger.filter((entry) => entry && currencies[entry.cur] && !(entry.ref === 'single-currency' && (entry.cur === 'gems' || String(entry.reason).startsWith('تحويل تلقائي'))))
    .map((e) => e.cur === 'gems' ? { ...e, cur: 'coins', delta: e.delta * 20, before: null, after: null } : e);
  const list = rows.length ? `<ul class="lbw-transactions">${rows.map((entry) => `<li class="list-row">${art(entry.cur)}<div class="grow"><b>${esc(entry.reason || kinds[entry.kind] || entry.kind || 'عملية بالمحفظة')}</b><small>${esc(dateText(entry.ts))} · بتوقيت الإمارات</small>${entry.before == null ? '' : `<small>الرصيد قبل: ${esc(number(entry.before))} · بعد: ${esc(number(entry.after))}</small>`}${entry.ref ? `<details class="lbw-reference"><summary>مرجع العملية</summary><span dir="ltr">${esc(entry.ref)}</span><small dir="ltr">${esc(entry.id)}</small></details>` : ''}</div><strong class="lbw-delta ${entry.delta < 0 ? 'lbw-negative' : 'lbw-positive'}"><bdi>${entry.delta > 0 ? '+' : ''}${esc(number(entry.delta))}</bdi><small>${currencies[entry.cur]}</small></strong></li>`).join('')}</ul>` : note('ما عندك معاملات مسجّلة للحين.');
  // Pagination arithmetic concerns record offsets only, never account balances.
  const next = state.offset + state.ledger.length;
  const canNext = nat(state.total) && next < state.total && state.ledger.length > 0;
  const count = nat(state.total) ? `عدد العمليات المسجّلة: ${number(state.total)}` : 'عدد العمليات مب متوفر';
  return panel(`${icon('clock')} آخر العمليات`, `<p class="lbw-muted">${esc(count)} · الأحدث أول · حتى 60 عملية بالصفحة.</p>${list}<nav class="pagination" aria-label="صفحات سجل المحفظة">${button('الأحدث', 'ledger', locked(state, ctx) || state.offset === 0, `data-lbw-offset="${Math.max(0, state.offset - 60)}"`)}<span>بداية الصفحة: ${esc(number(state.offset))}</span>${button('الأقدم', 'ledger', locked(state, ctx) || !canNext, `data-lbw-offset="${next}"`)}</nav><p class="lbw-muted">السجل للعرض بس؛ ما فيه حذف أو تصدير مربوط هنا. الرصيد قبل وبعد من نفس سجل الخادم، مب محسوب عندك.</p>`);
}
function packsView(state, ctx) {
  return `<section class="lbw-packs-section" aria-label="شراء العملات داخل المحفظة"><h2>شراء العملات</h2><div data-lbw-packs-host></div></section>`;
}

function conversionView(state, ctx) {
  // Closure is unconditional, even if a stale server/cache advertises an enabled policy.
  const pending = state.uncertain ? state.confirm : null;
  let body = note('الموقع صار بعملة وحدة: الجواهر تحولت لعملات (جوهرة = 20 عملة). سجل معاملاتك السابق محفوظ.');
  if (pending) {
    body += `<section class="card lbw-confirm" aria-label="التحقق من إيصال سابق"><h3>التحقق من طلب سابق انقطع ردّه</h3><p>الطلب السابق: <b>${esc(number(pending.gems))}</b> جوهرة، بنسبة <b>${esc(number(pending.seenRate))}</b> عملة لكل جوهرة.</p><p class="lbw-muted">بنرسل نفس المفتاح والطلب فقط لقراءة إيصال محفوظ. إذا الطلب ما انحفظ سابقاً، الخادم يرفضه بدون خصم أو إضافة. ما بننشئ تحويل جديد.</p>${note('نتيجة الطلب السابق مب مؤكدة. عرض السجل وحده ما يؤكد نتيجته.', true)}<div class="action-row">${button(state.busy ? 'جاري التحقق…' : 'التحقق من نفس الإيصال السابق', 'convert-replay', locked(state, ctx), '', true)}${button('عرض السجل للتحقق', 'check-ledger', state.busy)}</div></section>`;
  }
  return panel(`${icon('back')} التحويل اليدوي مقفول`, `${body}<p class="lbw-muted">إغلاق التحويل ما يغيّر الهدايا أو مكافآتها بالعملات أو باقات الشحن أو المشتريات.</p>`);
}
function vipView(state, ctx) {
  const vip = state.data?.progression?.vip ?? ctx.me?.progression?.vip;
  const status = !vip ? 'حالة VIP مب متوفرة للحين.' : vip.enabled !== true ? 'نظام VIP مب مفعّل حالياً حسب الخادم.' : vip.value ? `رتبتك الحالية: ${vip.value}` : 'ما عندك رتبة VIP حالياً.';
  return panel(`${icon('crown')} عضوية VIP`, `${note(status)}<p>ما فيه مسار اشتراك أو دفع VIP للاعب في الربط الحالي. ما بنعرض سعر أو مزايا مب معتمدة.</p><button type="button" class="btn" disabled aria-disabled="true">الاشتراك مب متاح</button>`);
}
function rewardsView(state, ctx) {
  const daily = state.data?.canDaily;
  const milestones = state.data?.milestones;
  const day = panel(`${icon('calendar')} مكافأتك اليومية`, `<p>نفس مكافأتك اليومية الحالية، مب مكافأة ثانية. الخادم يحدد الاستحقاق والمبلغ، مرة باليوم بتوقيت الإمارات.</p>${button(daily === true ? 'استلم مكافأتك' : daily === false ? 'استلمتها اليوم' : 'الاستحقاق مب متوفر للحين', 'daily', locked(state, ctx) || state.uncertain || daily !== true, '', true)}`);
  const list = !Array.isArray(milestones) ? note('مكافآت الإنجازات مب متوفرة للحين.') : !milestones.length ? note('ما فيه مكافآت إنجازات مسجّلة حالياً.') : `<ul class="lbw-transactions">${milestones.filter((item) => item && currencies[item.cur]).map((item) => `<li class="list-row">${art(item.cur)}<div class="grow"><b>${esc(item.label)}</b><small>${esc(number(item.amount))} ${currencies[item.cur]} · التقدم: ${esc(number(item.value))} / ${esc(number(item.goal))}</small></div>${button(item.done ? 'تم الاستلام' : item.ready ? 'استلام' : 'الشرط مب مكتمل', 'claim', locked(state, ctx) || state.uncertain || item.done === true || item.ready !== true, `data-lbw-id="${esc(item.id)}"`, item.ready === true)}</li>`).join('')}</ul>`;
  return day + panel(`${icon('star')} مكافآت الإنجازات`, list);
}
function html(ctx, state) {
  const hero = `<section class="hero"><div class="hero-symbol lbw-hero-symbol">${art('coins', 62)}</div><h1>المحفظة</h1><div class="subtitle">رصيدك ومشترياتك، كلّها في مكان واحد</div></section>`;
  if (!ctx.user) return `<div data-lb-page="wallet" class="lbw-page" dir="rtl">${hero}${panel('ادخل لحسابك', '<p>سجّل دخولك بحسابك الحالي عشان تشوف رصيدك ومعاملاتك. ما بننشئ لك حساب أو محفظة من هالصفحة.</p><a class="gold-btn" href="#/account">فتح صفحة الحساب</a>')}</div>`;
  const unavailable = ctx.connected === false ? note('الاتصال بالخادم مقطوع. الأرقام الظاهرة آخر رصيد متوفر؛ حدّث المحفظة عقب ما يرجع الاتصال.', true) : typeof ctx.req !== 'function' ? note('مساعد طلبات المحفظة مب متوفر بهالربط. العمليات مقفولة لين يكتمل الربط.', true) : '';
  const tabbar = `<div class="tabs lbw-tabs" aria-label="أقسام المحفظة">${tabs.map(([key, name, label]) => `<button type="button" data-lbw-action="tab" data-lbw-tab="${key}" class="${state.tab === key ? 'active' : ''}" aria-pressed="${state.tab === key}">${icon(name)}${label}</button>`).join('')}</div>`;
  const body = state.tab === 'packs' ? packsView(state, ctx) : state.tab === 'convert' ? conversionView(state, ctx) : state.tab === 'vip' ? vipView(state, ctx) : state.tab === 'rewards' ? rewardsView(state, ctx) : ledgerView(state, ctx);
  return `<div data-lb-page="wallet" class="lbw-page" dir="rtl">${hero}${balanceCards(state, ctx)}<div class="lbw-toolbar"><p class="lbw-muted">العملات افتراضية، مب فلوس قابلة للسحب.</p>${button(`${icon('clock')} تحديث المحفظة`, 'refresh', locked(state, ctx) || state.uncertain)}</div>${unavailable}${state.loading ? note('جاري تحميل المحفظة من الخادم…') : ''}${state.error ? note(state.error, true) : ''}${state.notice ? note(state.notice) : ''}${state.uncertain && state.tab !== 'convert' ? note('عندك تحويل نتيجته مب مؤكدة. افتح تحويل الرصيد عشان تعيد نفس الطلب؛ تحديث السجل ما يعني تأكيد التحويل.', true) : ''}${tabbar}<div class="lbw-tab-content" aria-busy="${state.loading || state.busy}">${body}</div></div>`;
}

export function render(ctx = {}) { return html(ctx, stateFor(ctx)); }

export function mount(root, ctx = {}) {
  const state = stateFor(ctx);
  let live = true;
  let packsController = null, packsRoot = null, packsContext = null;
  const closePacks = () => { packsController?.destroy?.(); packsController = null; packsRoot = null; packsContext = null; };
  const draw = () => {
    if (!live || currentState !== state) return;
    const focus = root.ownerDocument?.activeElement;
    const focused = root.contains(focus) ? { action: focus.dataset?.lbwAction, tab: focus.dataset?.lbwTab, cur: focus.dataset?.lbwCur } : null;
    const keepPacks = state.tab === 'packs' && packsController && packsRoot;
    if (keepPacks) packsRoot.remove();
    else closePacks();
    root.innerHTML = html(ctx, state);
    const target = root.querySelector('[data-lbw-packs-host]');
    if (target && keepPacks) target.replaceWith(packsRoot);
    else if (target) {
      packsRoot = target;
      packsContext = { ...ctx, embeddedWallet: true, paymentCurrency: state.packCur, paymentReturnId: null, routeArgs: [], onPaymentCurrency: cur => { if (live && currentState === state && currencies[cur]) state.packCur = cur; }, refreshMe: async () => {
        await ctx.refreshMe?.();
        if (live && currentState === state) await load(true);
      } };
      packsController = PACKS.mount(packsRoot, packsContext);
    }
    if (focused?.action) {
      // Values below are compared, not interpolated into selectors.
      const target = [...root.querySelectorAll('[data-lbw-action]')].find((el) => el.dataset.lbwAction === focused.action && el.dataset.lbwTab === focused.tab && el.dataset.lbwCur === focused.cur && !el.disabled);
      target?.focus({ preventScroll: true });
    }
  };
  state.views.add(draw);
  const paint = () => { for (const view of state.views) view(); };
  const resultError = (reply) => reply?.error || 'تعذّر تنفيذ طلب المحفظة. جرّب مرة ثانية.';
  const apply = (reply) => {
    if (!reply || !nat(reply.coins) || !nat(reply.gems)) throw Error('رد الأرصدة من الخادم مب مكتمل. ما غيّرنا الرصيد عندك.');
    state.data = reply;
    state.ledger = Array.isArray(reply.ledger) ? reply.ledger : null;
    state.offset = 0;
    state.total = nat(reply.ledgerTotal) ? reply.ledgerTotal : null;
  };
  async function refreshAccount() {
    // A mutation already succeeded. Failure to refresh the shell must not be
    // misreported as a failed conversion or trigger another wallet mutation.
    if (!live || currentState !== state || typeof ctx.refreshMe !== 'function') return;
    try { await ctx.refreshMe(); } catch { state.notice += ' ما قدرنا نحدّث رصيد الشريط؛ حدّث المحفظة بعدين.'; }
  }
  async function load(keepMessages = false) {
    if (!usable(ctx) || state.loading || state.busy || state.uncertain) return;
    state.loading = true; if (!keepMessages) state.error = ''; paint();
    try {
      const reply = await ctx.req('shop:get');
      if (!reply?.ok) throw Error(resultError(reply));
      apply(reply);
    } catch (error) { state.error = error?.message || 'ما قدرنا نحمّل المحفظة. تأكد من اتصالك.'; }
    finally { state.loading = false; paint(); }
  }
  async function loadLedger(offset) {
    if (!usable(ctx) || state.loading || state.busy || !nat(offset)) return;
    state.loading = true; state.error = ''; paint();
    try {
      const reply = await ctx.req('shop:ledger', { offset });
      if (!reply?.ok) throw Error(resultError(reply));
      if (!Array.isArray(reply.ledger) || !nat(reply.offset) || !nat(reply.total)) throw Error('رد سجل المعاملات مب مكتمل.');
      state.ledger = reply.ledger; state.offset = reply.offset; state.total = reply.total;
    } catch (error) { state.error = error?.message || 'ما قدرنا نحمّل هالصفحة من السجل.'; }
    finally { state.loading = false; paint(); }
  }
  async function reward(type, body) {
    if (locked(state, ctx) || state.uncertain) return;
    state.busy = true; state.error = ''; state.notice = ''; paint();
    try {
      const reply = await ctx.req(type, body);
      if (!reply?.ok) throw Error(resultError(reply));
      state.notice = positive(reply.got) ? `انحفظت مكافأتك: ${number(reply.got)} ${currencies[reply.cur] || 'عملة'}.` : 'انحفظ استلام المكافأة.';
      if (type === 'shop:claim') apply(reply);
      else {
        // Daily only returns canonical coins; gems are never recalculated.
        if (nat(reply.coins) && state.data) state.data = { ...state.data, coins: reply.coins, canDaily: false };
        state.ledger = null;
      }
      await refreshAccount();
    } catch (error) { state.error = error?.message || 'انقطع الرد. راجع السجل قبل ما تعيد المحاولة؛ ما نقدر نأكد نتيجة الحفظ.'; }
    finally { state.busy = false; paint(); }
    await load(true);
  }
  async function replayConversion() {
    if (locked(state, ctx) || !state.uncertain || !state.confirm) return;
    const request = state.confirm;
    state.busy = true; state.error = ''; state.notice = ''; paint();
    let reply;
    try { reply = await ctx.req('shop:convert', request); }
    catch {
      state.uncertain = true;
      state.error = 'انقطع رد التحويل. ما نقدر نأكد نتيجة الحفظ؛ أعد نفس الطلب أو راجع السجل.';
    }
    if (reply) {
      if (reply.ok) {
        // Keep the key if even a success response has malformed balances.
        try {
          if (reply.dup !== true || reply.receipt?.kind !== 'conversion'
            || reply.receipt.itemId !== JSON.stringify([request.gems, request.seenRate])) throw Error('رد الإيصال السابق مب مطابق للطلب. احتفظنا بنفس المفتاح للتحقق.');
          apply(reply); state.confirm = null; state.uncertain = false;
          state.notice = 'الخادم أكد إيصال نفس التحويل السابق، بدون خصم أو إضافة جديدة.';
          await refreshAccount();
        } catch (error) { state.uncertain = true; state.error = error.message; }
      } else {
        state.error = resultError(reply);
        // Only a definitive closed/no-receipt answer settles the uncertain retry.
        // Storage/unknown/key-conflict answers never discard its original identity.
        if (reply.code === 'conversion_disabled') { state.uncertain = false; state.confirm = null; }
        if (nat(reply.coins) && nat(reply.gems)) {
          try { apply(reply); } catch { /* preserve the server rejection */ }
        }
      }
    } else if (!state.error) {
      state.uncertain = true; state.error = 'ما وصل رد التحويل. أعد نفس الطلب، بدون إنشاء طلب جديد.';
    }
    state.busy = false; paint();
    if (!state.uncertain) await load(true);
  }
  function onClick(event) {
    const el = event.target.closest?.('[data-lbw-action]');
    if (!el || !root.contains(el) || el.disabled) return;
    const action = el.dataset.lbwAction;
    event.preventDefault();
    if (action === 'tab' && tabs.some(([key]) => key === el.dataset.lbwTab)) { state.tab = el.dataset.lbwTab; paint(); }
    else if (action === 'currency' && currencies[el.dataset.lbwCur]) { state.packCur = el.dataset.lbwCur; state.tab = 'packs'; paint(); if (packsRoot) { const tab = [...packsRoot.querySelectorAll('[data-lbp-action="currency"]')].find(node => node.dataset.lbpCur === state.packCur); if (tab && !tab.disabled) tab.click(); } }
    else if (action === 'refresh') { state.notice = ''; load(); }
    else if (action === 'ledger') loadLedger(Number(el.dataset.lbwOffset));
    else if (action === 'daily' && state.data?.canDaily === true) reward('wallet:daily');
    else if (action === 'claim') {
      const item = state.data?.milestones?.find((entry) => String(entry.id) === el.dataset.lbwId);
      if (item?.ready === true && !item.done) reward('shop:claim', { mid: item.id });
    } else if (action === 'convert-replay') replayConversion();
    else if (action === 'check-ledger') { state.tab = 'ledger'; paint(); loadLedger(0); }
  }
  root.addEventListener('click', onClick);
  paint();
  if (!state.busy && !state.uncertain) load();
  return { destroy() { live = false; closePacks(); state.views.delete(draw); root.removeEventListener('click', onClick); } };
}
