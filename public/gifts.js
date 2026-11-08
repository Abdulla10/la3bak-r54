import { mini } from './avatars.js?v=r58c';
import { safeGiftArt as giftArt, giftRewardQuote, giftRewardEventQuote, giftRewardCard, giftCurrencyName, giftCurrencyIcon } from './gift-reward-ui.js?v=r57';
/* الهدايا: نافذة اختيار بأقسام وبحث وفرز وعدد، داخل الغرفة (طبقة ثابتة فوق اللعب، ما تقفل الغرفة) أو من المتجر.
   الأسعار وعروض مكافآت العملات والتحقق والخصم من الخادم؛ لا يحسب العميل المكافآت ولا يضيف أرصدة،
   وما يعرض الحركة أو رسالة المحادثة إلا بعد ما يوصل حدث مؤكد من الخادم. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = (n) => Number(n).toLocaleString('ar-EG-u-nu-latn');
const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
const PAGE = 48;

export const G = {
  list: null, cats: [], virtual: [], rarity: [], qtyOpts: [1], confirmAt: 10000, coins: null, gems: null, cur: 'coins', policy: null, err: '', loading: false,
  mode: 'shop', room: '', recipients: [], open: false,
  to: null, cat: 'all', q: '', sort: 'price', limit: PAGE, sel: null, qty: 1,
  key: null, keySig: '', busy: false, confirm: null, done: null, fail: null,
  view: 'send', results: null, searching: false, log: null, logErr: '',
};
// Separate from public draft fields: callers may clear G.key or change recipient after a timeout.
let pendingSend = null, listGeneration = 0;
const fixedDraft = () => G.busy || !!pendingSend || !!G.key;
export function giftAffordability(giftId = G.sel) {
  if (pendingSend) return {allowed:true,pending:true,quote:pendingSend.quote};
  const gift = G.list?.find(g => g.id === giftId), quote = giftRewardQuote(gift,G.qty);
  const balance = quote ? G[quote.cur] : null;
  return {allowed:!!quote && Number.isFinite(balance) && balance >= quote.total,quote,balance};
}
export const TRIAL = 'تحت التجربة';
export const trialTag = () => '';

export async function loadList(req) {
  if (G.loading) return; G.loading = true; const generation = ++listGeneration;
  const r = await req('gift:list').catch(() => ({ ok: false, error: 'تعذّر الاتصال.' }));
  if (generation !== listGeneration) return;
  G.loading = false;
  if (r.ok) Object.assign(G, { list: r.gifts, cats: r.cats, virtual: r.virtual, rarity: r.rarity, qtyOpts: r.qty, confirmAt: r.confirmAt, coins: Number.isFinite(r.coins) ? r.coins : null, gems: Number.isFinite(r.gems) ? r.gems : null, cur: r.cur || 'coins', policy: r.policy || null, err: '' });
  else G.err = r.error || 'تعذّر تحميل الهدايا.';
}
export async function loadLog(req) {
  G.loading = true;
  const r = await req('gift:log').catch(() => ({ ok: false }));
  G.loading = false;
  if (r.ok) { G.log = { received: r.received, sent: r.sent }; G.logErr = ''; } else G.logErr = r.error || 'تعذّر تحميل سجل الهدايا.';
}
export async function find(req, q) {
  G.q2 = q; G.searching = true;
  const r = await req('gift:find', { q });
  G.searching = false;
  if (G.q2 !== q) return false;
  G.results = r.ok ? r.players : [];
  G.err = r.ok ? '' : r.error;
  return true;
}
export const reset = () => Object.assign(G, { ...(fixedDraft() ? {} : { to: null, sel: null, key: null, keySig: '', fail: null, qty: 1 }), done: null, confirm: null, results: null });

/* ---------- الفلترة والفرز ---------- */
export function filtered() {
  if (!G.list) return [];
  const q = G.q.trim();
  let l = G.list;
  if (G.cat === 'popular') l = l.filter((g) => g.sent > 0);
  else if (G.cat === 'newest') { const mx = Math.max(...l.map((g) => g.added)); l = l.filter((g) => g.added === mx); }
  else if (G.cat === 'rare') l = l.filter((g) => g.rarity >= 4);
  else if (G.cat !== 'all') l = l.filter((g) => g.cat === G.cat);
  if (q) l = l.filter((g) => g.name.includes(q));
  const by = { price: (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, popular: (a, b) => b.sent - a.sent || a.price - b.price, rarity: (a, b) => b.rarity - a.rarity || b.price - a.price };
  return [...l].sort(G.cat === 'popular' ? by.popular : by[G.sort] || by.price);
}

/* ---------- الإرسال ---------- */
export async function send(req, giftId, confirmed = false) {
  if (G.busy || (!pendingSend && !G.to)) return null;
  const g = G.list?.find((x) => x.id === giftId);
  if (!g && !pendingSend) return null;
  const quote = pendingSend ? pendingSend.quote : G.key ? null : giftRewardQuote(g,G.qty);
  if (!pendingSend && !G.key && !quote) return {ok:false,error:'عرض مكافآت الخادم غير صالح لهذه الكمية؛ حدّث الهدايا.'};
  if (!pendingSend && !G.key && !giftAffordability(giftId).allowed) return {ok:false,error:'رصيد الجواهر غير متاح أو لا يكفي لهذه الهدية.'};
  const total = pendingSend ? pendingSend.body.seen * pendingSend.body.qty : quote?.total ?? g.price * G.qty;
  if (!pendingSend && !G.key && total >= G.confirmAt && !confirmed) { G.confirm = { id: g.id, total }; return { ok: false, pending: true }; }
  // نفس المفتاح لنفس (المستلم، الهدية، العدد، الغرفة) لين النجاح أو الرفض القاطع: إعادة المحاولة بعد انقطاع ما تخصم مرتين
  if (!pendingSend) {
    const oldKey = !!G.key, sig = [G.to.id, g.id, G.qty, G.mode === 'room' ? G.room : ''].join('|');
    if (oldKey && G.keySig && G.keySig !== sig) return {ok:false,error:'يوجد مفتاح سابق غير محسوم؛ عد إلى تفاصيل الطلب السابق.'};
    if (!G.key) { G.key = newKey(); G.keySig = sig; }
    const body = { gift: g.id, to: G.to.id, key: G.key, seen: g.price, qty: G.qty, ...(!oldKey ? {seenPolicy:quote.policy} : {}), ...(G.mode === 'room' ? { code: G.room } : {}), ...(total >= G.confirmAt ? { confirm: true } : {}) };
    pendingSend = {body,gift:{...g},to:{...G.to},quote:oldKey ? null : {...quote}};
  }
  const p = pendingSend;
  G.busy = true; G.sel = p.gift.id; G.done = null; G.fail = null; G.confirm = null;
  const r = await req('gift:send', {...p.body}).catch(error => ({ ok: false, status:error?.status || error?.response?.status, error: 'انقطع الاتصال. لو انخصم شي ما راح يتكرر لما تعيد المحاولة.' }));
  G.busy = false;
  if (r.ok) { listGeneration++; G.loading = false; G.coins = Number.isFinite(r.coins) ? r.coins : G.coins; G.gems = Number.isFinite(r.gems) ? r.gems : G.gems; G.done = { ev: r.ev, dup: r.dup }; pendingSend = null; G.key = null; G.keySig = ''; G.log = null; }
  else {
    const status = Number(r.status), unsure = r.uncertain === true || status >= 500 || [408,429].includes(status) || /مهلة|انقطع|اتصال/.test(r.error || '');
    G.fail = { error: r.error || 'تعذّر إرسال الهدية.', gift: p.gift, to: p.to.name, unsure };
    if (!unsure) { pendingSend = null; G.key = null; G.keySig = ''; }
  }
  return r;
}

/* ---------- العرض ---------- */
const RCLS = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5'];
function cardHTML(g) {
  const on = G.sel === g.id, allowed = giftAffordability(g.id).allowed, cur = g.cur || G.cur;
  return `<li><button type="button" class="gs-card ${RCLS[g.rarity]}${on ? ' on' : ''}${!allowed ? ' poor' : ''}" data-act="gs-pick" data-id="${esc(g.id)}" aria-pressed="${on}" aria-label="${esc(g.name)} ${nf(g.price)} ${giftCurrencyName(cur)}، ${esc(G.rarity[g.rarity] || '')}" ${fixedDraft() ? 'disabled' : ''}>
    <span class="gs-rare">${esc(G.rarity[g.rarity] || '')}</span>${giftArt(g, 58)}<b>${esc(g.name)}</b><span class="gs-price">${giftCurrencyIcon(cur)} ${nf(g.price)}</span>
    ${on && !fixedDraft() ? `<span class="gs-send" ${allowed ? `data-act="gs-send" data-id="${esc(g.id)}" role="button" tabindex="0"` : ''} aria-disabled="${!allowed}">${allowed ? 'إرسال' : 'رصيد أو عرض غير متاح'}</span>` : ''}</button></li>`;
}
function recipientsHTML() {
  if (G.mode === 'room') {
    if (!G.recipients.length) return '<p class="gs-note">ما فيه لاعب حقيقي ثاني بالغرفة الحين.</p>';
    return `<div class="gs-to" role="group" aria-label="أرسل إلى"><span>أرسل إلى</span>${G.recipients.map((p) => `<button type="button" class="gs-who${G.to?.id === p.id ? ' on' : ''}" data-act="gs-to" data-id="${esc(p.id)}" data-name="${esc(p.name)}" aria-pressed="${G.to?.id === p.id}" ${fixedDraft() ? 'disabled' : ''}><i aria-hidden="true">${esc([...p.name][0] || '؟')}</i>${esc(p.name)}</button>`).join('')}</div>`;
  }
  if (G.to) return `<div class="gs-to"><span>أرسل إلى</span><b class="gs-who on">${esc(G.to.name)}</b><button class="pill-btn" type="button" data-act="gift-change" ${fixedDraft() ? 'disabled' : ''}>تغيير</button></div>`;
  return `<section class="gs-find"><label for="gq2">ابحث عن المستلم باسمه</label><input class="input" id="gq2" type="search" maxlength="20" autocomplete="off" placeholder="اكتب حرفين أو أكثر"><div id="gres">${resultsHTML()}</div></section>`;
}
export function resultsHTML() {
  if (G.searching) return '<p class="muted">جاري البحث…</p>';
  if (G.results === null) return '';
  if (!G.results.length) return `<p class="muted" style="text-align:start">${esc(G.err || 'ما لقينا لاعب بهالاسم.')}</p>`;
  return `<ul class="gl-list">${G.results.map((p) => `<li class="gl-row"><span class="gl-av" aria-hidden="true">${mini(p.av, 44) || '👤'}</span><div><b>${esc(p.name)}</b><small>المستوى ${nf(p.level)}</small></div><button class="btn" type="button" data-act="gift-to" data-id="${esc(p.id)}" data-name="${esc(p.name)}">اختيار</button></li>`).join('')}</ul>`;
}
/** محتوى النافذة (مشترك بين الغرفة والمتجر) */
export function sheetBody() {
  if (!G.list) return `<div class="gs-empty"><p role="alert">${esc(G.err || 'جاري تحميل الهدايا…')}</p>${G.err ? '<button class="btn" type="button" data-act="gift-reload">إعادة المحاولة</button>' : ''}</div>`;
  const cats = [...G.virtual.filter((v) => v.id === 'all'), ...G.virtual.filter((v) => v.id !== 'all'), ...G.cats];
  const list = filtered(); const shown = list.slice(0, G.limit);
  const sel = pendingSend?.gift || G.list.find((x) => x.id === G.sel), selectedQty = pendingSend?.body.qty ?? G.qty;
  const selectedQuote = pendingSend ? pendingSend.body.seenPolicy ? pendingSend.quote : null : G.key ? null : giftRewardQuote(sel,G.qty);
  const preview = sel ? giftRewardCard({gift:sel,recipient:pendingSend?.to || G.to,qty:selectedQty,quote:selectedQuote,pending:!!pendingSend || !!G.key,cost:pendingSend ? pendingSend.body.seen * pendingSend.body.qty : null,costCur:pendingSend?.body.seenPolicy ? pendingSend.quote?.cur : 'coins'}) : '<p class="gs-info">اختر الهدية والمستلم لمراجعة العملات والبونص الفعلي من عرض الخادم.</p>';
  const sortSel = `<label class="sr" for="gsSort">فرز</label><select id="gsSort" class="gs-sort" data-change="gs-sort"${G.cat === 'popular' ? ' disabled' : ''}>${[['price', 'الأرخص'], ['price-desc', 'الأغلى'], ['popular', 'الأكثر إرسالاً'], ['rarity', 'الأندر']].map(([k, l]) => `<option value="${k}"${G.sort === k ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const empty = G.cat === 'popular' ? 'ما انرسلت هدايا بعد، فما فيه «أكثر شعبية» حقيقي للحين.' : 'ما فيه هدايا بهالبحث.';
  const done = G.done?.ev ? `<div class="gs-done" role="status">${giftRewardCard({gift:G.done.ev.gift,recipient:G.done.ev.to,qty:G.done.ev.qty,quote:giftRewardEventQuote(G.done.ev),confirmed:true,prepaid:G.done.ev.prepaid===true})}${G.done.dup ? '<p>نفس الطلب السابق؛ ما تكرر الخصم أو البونص.</p>' : ''}</div>` : '';
  const fail = G.fail ? `<div class="gs-fail" role="alert">${esc(G.fail.error)}${G.fail.unsure ? ' أعد نفس الطلب المحفوظ وما راح ينخصم مرتين.' : ''}</div>` : '';
  const confirm = G.confirm ? (() => { const g = G.list.find((x) => x.id === G.confirm.id), q = giftRewardQuote(g,G.qty); return `<div class="gs-confirm" role="dialog" aria-label="تأكيد إرسال الهدية"><h3>تأكيد إرسال الهدية</h3>${giftRewardCard({gift:g,recipient:G.to,qty:G.qty,quote:q})}<div class="btn-row"><button class="btn gold" type="button" data-act="gs-confirm-yes" ${!q || !G.to || !giftAffordability(g?.id).allowed ? 'disabled' : ''}>تأكيد الإرسال</button><button class="btn ghost" type="button" data-act="gs-confirm-no">إلغاء</button></div></div>`; })() : '';
  return `<div class="gs-sticky">${recipientsHTML()}
    <div class="gs-cats" role="tablist" aria-label="أقسام الهدايا">${cats.map((c) => `<button type="button" role="tab" class="gs-cat${G.cat === c.id ? ' on' : ''}" aria-selected="${G.cat === c.id}" data-act="gs-cat" data-c="${esc(c.id)}"><span aria-hidden="true">${c.icon}</span>${esc(c.name)}</button>`).join('')}</div>
    <div class="gs-tools"><label class="sr" for="gsq">ابحث عن هدية</label><input class="input gs-q" id="gsq" type="search" placeholder="🔎 ابحث عن هدية" value="${esc(G.q)}" autocomplete="off">${sortSel}</div></div>
    ${preview}${pendingSend ? `<div class="gr13-retry"><p>تفاصيل الطلب ومفتاحه ثابتان حتى يتأكد الخادم من النتيجة.</p><button type="button" class="btn gold" data-act="gs-send" data-id="${esc(pendingSend.gift.id)}" ${G.busy ? 'disabled' : ''}>${G.busy ? 'جارٍ التأكيد…' : 'إعادة نفس الطلب بأمان'}</button></div>` : ''}
    ${done}${fail}
    <ul class="gs-grid" id="gsGrid">${shown.length ? shown.map(cardHTML).join('') : `<li class="gs-none">${empty}</li>`}</ul>
    ${list.length > shown.length ? `<button class="btn ghost block" type="button" data-act="gs-more">عرض المزيد (${nf(list.length - shown.length)})</button>` : ''}
    <div class="gs-foot"><div class="gs-qty" role="group" aria-label="العدد">${G.qtyOpts.map((q) => `<button type="button" class="${selectedQty === q ? 'on' : ''}" data-act="gs-qty" data-q="${q}" aria-pressed="${selectedQty === q}" ${fixedDraft() ? 'disabled' : ''}>${nf(q)}</button>`).join('')}</div><a class="gs-bal" href="#/shop" data-act="gs-close-go"><span>${giftCurrencyIcon(G.cur)} ${Number.isFinite(G[G.cur]) ? nf(G[G.cur]) : 'غير متاح'} ${giftCurrencyName(G.cur)}</span><small>رصيدك الفعلي · شحن ‹</small></a></div>
    ${confirm}`;
}

/* ---------- نافذة الغرفة (طبقة مستقلة فوق اللعب) ---------- */
let layer = null;
export function openRoom(room, me) {
  G.mode = 'room'; G.room = room.code; G.open = true;
  G.recipients = room.players.filter((p) => !p.bot && !p.left && p.id !== me).map((p) => ({ id: p.id, name: p.name }));
  if (!fixedDraft() && !G.recipients.some((p) => p.id === G.to?.id)) G.to = G.recipients.length === 1 ? G.recipients[0] : null;
  if (pendingSend) { G.to = {...pendingSend.to}; G.sel = pendingSend.gift.id; G.qty = pendingSend.body.qty; }
  G.done = null; if (!fixedDraft()) { G.fail = null; G.sel = null; } G.confirm = null; G.limit = PAGE; G.q = '';
  paintRoom();
}
export function closeRoom() {
  // لو فيه طلب معلّق أو نتيجته غير مؤكدة نحتفظ بالمفتاح، فإعادة الإرسال لنفس الهدية ما تخصم مرتين
  const keep = fixedDraft() || G.fail?.unsure;
  Object.assign(G, { open: false, mode: 'shop', confirm: null, done: null, ...(keep ? {} : { to: null, sel: null, key: null, keySig: '', fail: null }) });
  paintRoom();
}
export function syncRoom(room, me) { if (!G.open || !room || room.code !== G.room) return; const before = G.recipients.map((p) => p.id).join(); G.recipients = room.players.filter((p) => !p.bot && !p.left && p.id !== me).map((p) => ({ id: p.id, name: p.name })); if (before !== G.recipients.map((p) => p.id).join()) { if (!fixedDraft() && !G.recipients.some((p) => p.id === G.to?.id)) G.to = null; paintRoom(); } }
export function paintRoom() {
  if (!layer) { layer = document.createElement('div'); layer.id = 'giftLayer'; document.body.appendChild(layer); }
  if (!G.open) { layer.innerHTML = ''; layer.hidden = true; return; }
  layer.hidden = false;
  const keepScroll = layer.querySelector('.gs-body')?.scrollTop ?? 0;
  const keepCats = layer.querySelector('.gs-cats')?.scrollLeft ?? null;
  layer.innerHTML = `<div class="gs-back" data-act="gs-close"></div><section class="gs-sheet" role="dialog" aria-modal="true" aria-label="إرسال هدية"><header class="gs-head"><h2>🎁 الهدايا</h2><button type="button" class="dm-x" data-act="gs-close" aria-label="إغلاق">✕</button></header><div class="gs-body">${sheetBody()}</div></section>`;
  const b = layer.querySelector('.gs-body'); if (b) b.scrollTop = keepScroll;
  const c = layer.querySelector('.gs-cats'); if (c && keepCats !== null) c.scrollLeft = keepCats;
}
/** يعيد رسم المكان المعروض (طبقة الغرفة أو صفحة المتجر) */
export function repaint(render) { if (G.open) paintRoom(); else render(); }

/* ---------- المتجر: تبويب الهدايا + السجل ---------- */
export function giftTabHTML() {
  const sub = `<div class="sh-tabs" role="tablist"><button type="button" role="tab" class="${G.view === 'send' ? 'on' : ''}" aria-selected="${G.view === 'send'}" data-act="gift-view" data-v="send">إرسال هدية</button><button type="button" role="tab" class="${G.view === 'log' ? 'on' : ''}" aria-selected="${G.view === 'log'}" data-act="gift-view" data-v="log">هداياي</button></div>`;
  if (G.view === 'log') return sub + logHTML();
  return sub + `<section class="card gs-inline">${G.open ? '<p class="muted">نافذة الهدايا مفتوحة بالغرفة.</p>' : sheetBody()}</section>`;
}
const when = (ts) => new Date(ts).toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' });
function rowHTML(r) {
  const mine = r.dir === 'out';
  const costCur = r.currency || 'coins', rewardCur = r.rewardCurrency || r.currency || 'coins';
  const unit = giftCurrencyName(costCur), rewardUnit = giftCurrencyName(rewardCur);
  const amt = mine ? `${r.prepaid?'استخدمت هدية ممولة بقيمة':'−'} ${nf(r.total)} ${unit}` : Number.isSafeInteger(r.recv) ? `+${nf(r.recv)} ${rewardUnit}` : 'هدية';
  const bonus = mine && Number.isSafeInteger(r.senderBonus) && r.senderBonus >= 0 ? ` · بونص المرسل +${nf(r.senderBonus)} ${rewardUnit}` : '';
  return `<li class="gl-row gr13-history">${giftArt({ motif: r.motif, variant: r.variant, cat: r.cat, name: r.name }, 44)}<div><b>${esc(r.name)}${r.qty > 1 ? ' ×' + nf(r.qty) : ''}</b><small>${mine ? 'إلى ' + esc(r.to) : 'من ' + esc(r.from)} · ${when(r.ts)}${r.room ? ' · داخل غرفة' : ''}${mine && Number.isSafeInteger(r.recv) ? ` · وصل له ${nf(r.recv)} ${rewardUnit}` : ''}${bonus}</small></div><strong class="${mine ? 'neg' : 'pos'}">${amt}</strong></li>`;
}
export function logHTML(which = 'both', state = G) {
  if (state.logErr) return `<div class="card empty-state"><p role="alert">${esc(state.logErr)}</p></div>`;
  if (!state.log) return '<div class="card empty-state"><p>جاري تحميل الهدايا…</p></div>';
  const rec = `<section class="card"><h2>هدايا وصلتك</h2>${state.log.received.length ? `<ul class="gl-list">${state.log.received.map(rowHTML).join('')}</ul>` : '<p class="muted" style="text-align:start">ما وصلتك هدايا بعد.</p>'}</section>`;
  const sent = `<section class="card"><h2>هدايا أرسلتها</h2>${state.log.sent.length ? `<ul class="gl-list">${state.log.sent.map(rowHTML).join('')}</ul>` : '<p class="muted" style="text-align:start">ما أرسلت هدايا بعد.</p>'}</section>`;
  return which === 'received' ? rec : which === 'sent' ? sent : rec + sent;
}
/** نص رسالة الهدية بالمحادثة (من حدث مؤكد من الخادم) */
export function chatCardHTML(ev, meId) {
  const from = ev.from.id === meId ? 'أنت' : ev.from.name, to = ev.to.id === meId ? 'أنت' : ev.to.name;
  return `<div class="gr13-chat"><p>أرسل <b>${esc(from)}</b> الهدية إلى <b>${esc(to)}</b></p>${giftRewardCard({gift:ev.gift,recipient:to,qty:ev.qty,quote:giftRewardEventQuote(ev),confirmed:true,prepaid:ev.prepaid===true})}${!ev.rewardPolicy && Number.isSafeInteger(ev.house) ? `<p>حصة الإدارة وفق السجل القديم: ${nf(ev.house)} ${giftCurrencyName(ev.cur || 'coins')}</p>` : ''}</div>`;
}
