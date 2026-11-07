/* VIP BODY only. No client crediting, balance deduction, fake perks or sample packs.
 * Only server-approved offers can proceed to preview and explicit confirmation. */
import * as R from './rank-vip-shared.js';
import * as V from './vip-noble-r52.js?v=vip-noble-r52';
const { esc, obj, list, nat, fmt, icon, artwork } = R;
const STATUS_NAMES = Object.freeze({ active: 'عضوية نشطة', inactive: 'عضوية غير مفعّلة', expired: 'انتهت صلاحية العضوية', legacy: 'رتبة VIP سابقة · دون عضوية مؤرخة' });
const BENEFIT_SYMBOLS = Object.freeze({ frame: 'frame', title: 'crown', badge: 'medal', bg: 'image', background: 'image', effect: 'star', social: 'users' });
function dataOf(ctx) { return ctx.vipMembership ?? ctx.vipData ?? ctx.vip ?? null; }
/** Accept either the public projection or the canonical server view. No inferred grants. */
export function normalizeMembership(data) {
  if (!obj(data)) return null;
  if (obj(data.progression)) return data;
  if (!obj(data.vip)) return data;
  return { ...data, status: data.status === 'legacy-untimed' ? 'legacy' : data.status,
    progression: data.vip,
    membership: R.timestamp(data.startedAt) !== null && R.timestamp(data.expiresAt) !== null ? { startsAt: data.startedAt, expiresAt: data.expiresAt, remainingMs: data.remainingMs } : null,
    packages: list(data.packages).map(pack => ({ ...pack, available: data.purchasesEnabled === true && pack.enabled === true && pack.approved === true })),
    benefits: list(data.benefits).map(benefit => ({ ...benefit, open: benefit.unlocked === true })) };
}
export function membershipState(data, now = Date.now()) {
  if (!obj(data) || !Object.hasOwn(STATUS_NAMES, data.status)) return 'unknown';
  if (data.status !== 'active') return data.status;
  const starts = R.timestamp(data.membership?.startsAt), expires = R.timestamp(data.membership?.expiresAt);
  if (starts === null || expires === null || expires <= starts || starts > now) return 'unknown';
  return expires <= now ? 'expired' : 'active';
}
export function validPrice(price) { return obj(price) && ['coins', 'gems'].includes(price.cur) && nat(price.amount) && price.amount > 0; }
export function availablePackage(pack, data) {
  return data?.enabled === true && data?.purchasesEnabled !== false && obj(pack) && R.identifier(pack.id) && typeof pack.name === 'string' && Boolean(pack.name.trim()) && pack.approved === true && pack.available === true && validPrice(pack.price) && nat(pack.points) && pack.points > 0 && nat(pack.durationDays) && pack.durationDays > 0;
}
function priceText(price) { return validPrice(price) ? `${fmt(price.amount)} ${price.cur === 'coins' ? 'عملة' : 'جوهرة'}` : 'السعر غير معتمد'; }
function progressionOf(state, ctx) { return obj(state.data?.progression) ? state.data.progression : ctx.me?.progression?.vip; }
function benefitEntries(data) { return list(data?.benefits).filter(row => obj(row) && R.identifier(row.id) && typeof row.name === 'string' && Boolean(row.name.trim()) && nat(row.level) && row.level >= 1 && row.level <= 15); }
/* ---------- R52: واجهة VIP بتصميم المرجع (بطاقة ثابتة، شبكة امتيازات، شريط شحن سفلي) ---------- */
const VIP_TIERS = Object.freeze([[1, 'silver', 'علامة VIP الفضية'], [5, 'blue', 'علامة VIP الزرقاء'], [8, 'purple', 'علامة VIP البنفسجية'], [12, 'gold', 'علامة VIP الذهبية'], [15, 'max', 'علامة VIP الأسطورية']]);
const BENEFIT_GLYPH = Object.freeze({ frame: 'frame', title: 'title', badge: 'badge', bg: 'image', background: 'image', effect: 'star', social: 'bubble', entrance: 'car' });
/** كل امتيازات VIP من البيانات الحقيقية فقط:
 * 1) علامة VIP بألوانها حسب المستوى (نفس صور الرتب المعتمدة وتظهر فعلاً بالملف والغرف)،
 * 2) مزايا العضوية المنشورة من الإدارة (/api/vip-membership)،
 * 3) عناصر المتجر المشروطة بمستوى VIP (minVip)،
 * 4) مكافآت رتب VIP المنشورة (/api/rank-rewards). */
export function vipPerks(state, ctx) {
  const entry = progressionOf(state, ctx);
  const view = R.rankState(entry, 'vip');
  const rank = view.state === 'earned' ? view.rank : 0;
  const items = V.shopItems(state, ctx);
  const out = [];
  if (entry?.enabled === true) for (const [level, theme, name] of VIP_TIERS) out.push({ level, name, sub: `علامة مستوى VIP${level}`, art: `<img class="vn-rank-art" src="/preview/assets/profile/ranks/vip-${theme}.png" alt="" loading="lazy" decoding="async">`, desc: 'تظهر بجانب اسمك في ملفك الشخصي وفي الغرف، ويتغير لونها حسب مستوى VIP.', open: rank >= level });
  for (const b of benefitEntries(state.data)) {
    const item = b.itemId ? items.find((i) => i.id === b.itemId) : null;
    const art = R.safeImageURL(b.artwork) ? `<img class="vn-rank-art" src="${esc(R.safeImageURL(b.artwork))}" alt="" loading="lazy" decoding="async">` : item ? V.itemArt(item) : V.hex(BENEFIT_GLYPH[b.type] || BENEFIT_GLYPH[item?.slot] || 'crown');
    const status = membershipState(state.data);
    out.push({ level: b.level, name: b.name, sub: item ? V.SLOT_LABEL[item.slot] || '' : '', desc: typeof b.description === 'string' ? b.description : '', art, open: b.open === true || b.unlocked === true, active: b.requiresActive === true && status !== 'active' });
  }
  for (const item of items.filter((i) => Number.isSafeInteger(i.minVip) && i.minVip >= 1 && i.minVip <= 15 && i.status !== 'hidden')) {
    out.push({ level: item.minVip, name: item.name, sub: V.SLOT_LABEL[item.slot] || 'عنصر حصري', art: V.itemArt(item), desc: `عنصر من المتجر يتطلب VIP${item.minVip} للشراء والتجهيز.`, open: item.eligibility ? item.eligibility.eligible === true : rank >= item.minVip, link: '#/shop', linkText: 'عرض في المتجر', video: item.slot === 'entrance' });
  }
  for (const p of V.rewardPolicies(state.rewards, 'vip').filter((p) => p.rank >= 1 && p.rank <= 15)) {
    const rows = V.rewardRows(p, items);
    if (!rows.length) continue;
    out.push({ level: p.rank, name: rows.length === 1 ? rows[0].sub === 'مكافأة الرتبة' ? rows[0].name : rows[0].name : `مكافأة VIP${p.rank}`, sub: rows.length === 1 ? rows[0].sub : `${rows.length} عناصر`, art: rows[0].art, desc: `مكافأة تُستلم مرة وحدة عند الوصول إلى VIP${p.rank}: ${rows.map((r) => r.sub === 'مكافأة الرتبة' ? r.name : `${r.name} · ${r.sub}`).join('، ')}.`, open: rank >= p.rank, link: '#/rank-rewards', linkText: p.status === 'claimed' ? 'مستلمة · عرض المكافآت' : rank >= p.rank ? 'استلام من مكافآت الرتب' : 'عرض مكافآت الرتب' });
  }
  return out.sort((x, y) => x.level - y.level).map((p) => ({ ...p, tag: `فتح بعد VIP${p.level}`, stateText: p.open ? (p.active ? 'مفتوح بمستواك · يحتاج عضوية نشطة' : 'مفتوح لك') : `يفتح عند VIP${p.level}` }));
}
function cardHTML(state, ctx) {
  const entry = progressionOf(state, ctx);
  const view = R.rankState(entry, 'vip');
  const model = R.progressModel(entry, 'vip');
  const status = membershipState(state.data);
  const earned = view.state === 'earned';
  const theme = earned ? R.theme('vip', view.rank) : 'silver';
  const until = status === 'active' ? V.dateLine(state.data?.membership?.expiresAt) : '';
  const art = `<img class="vx-badge" src="/preview/assets/profile/ranks/vip-${esc(theme)}.png" alt="${earned ? `شارة VIP ${view.rank}` : ''}" decoding="async">`;
  const points = ['earned', 'unranked'].includes(view.state) ? entry?.points : null;
  const hint = !model.valid ? '' : model.capped ? '(وصلت أعلى مستوى VIP)' : `(لا تزال بحاجة إلى ${V.num(model.remaining)} نقطة خبرة لرفع VIP${model.next})`;
  const pct = model.valid ? model.percentage : 0;
  return `<section class="vx-card" data-rank-theme="${esc(theme)}" data-vip-state="${esc(status)}" aria-label="بطاقة VIP">
    <div class="vx-card-top"><span class="vx-card-art${earned ? '' : ' is-dim'}">${art}</span><div class="vx-card-id"><strong dir="ltr">${earned ? `VIP${view.rank}` : 'VIP'}</strong><small>${until ? `صالح حتى <bdi dir="ltr">${esc(until)}</bdi>` : status === 'expired' ? 'انتهت صلاحية العضوية' : esc(view.state === 'disabled' ? 'نظام VIP غير مفعّل' : earned ? STATUS_NAMES[status] || '' : view.text)}</small></div></div>
    <div class="vx-exp"><span class="vx-exp-num" dir="ltr"><small>Exp</small>${V.num(points)}</span><span class="vx-exp-hint">${esc(hint)}</span></div>
    <div class="vx-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(0)}" aria-label="التقدم إلى مستوى VIP التالي"><i style="width:${pct.toFixed(1)}%"></i><b style="inset-inline-start:${pct.toFixed(1)}%"></b></div>
    <div class="vx-card-foot"><span>${model.valid && earned ? `بداية VIP${view.rank} عند ${V.num(entry.pointsFloor)} نقطة` : 'نقاط خبرة VIP من المباريات والهدايا والباقات'}</span><span dir="ltr">${model.valid && !model.capped ? `VIP${model.next} ${V.num(model.threshold)}` : model.capped ? 'VIP15 MAX' : ''}</span></div>
  </section>`;
}
function bottomHTML(state, ctx) {
  const entry = progressionOf(state, ctx);
  const model = R.progressModel(entry, 'vip');
  const status = membershipState(state.data);
  const end = R.timestamp(state.data?.membership?.expiresAt);
  const strip = state.stripClosed ? '' : status === 'active' && end ? `<div class="vx-strip" role="status">${V.glyph('bell')}<span class="vx-marquee"><span>عضويتك نشطة حتى ${esc(V.dateLine(end))} — جدّدها قبل الانتهاء عشان ما تنقفل المزايا اللي تحتاج عضوية نشطة. خبرة VIP المكتسبة تبقى محفوظة.</span></span><button class="vn-icon-btn" type="button" data-vn-action="strip" aria-label="إخفاء التنبيه">${V.glyph('close')}</button></div>`
    : status === 'expired' ? `<div class="vx-strip" role="status">${V.glyph('bell')}<span class="vx-marquee"><span>انتهت صلاحية عضويتك — المزايا اللي تحتاج عضوية نشطة مقفلة لين التجديد، وخبرتك محفوظة.</span></span><button class="vn-icon-btn" type="button" data-vn-action="strip" aria-label="إخفاء التنبيه">${V.glyph('close')}</button></div>` : '';
  const text = !model.valid ? (entry?.enabled === true ? 'اجمع نقاط خبرة VIP من المباريات والهدايا وباقات العضوية' : 'نظام VIP غير مفعّل حالياً') : model.capped ? 'وصلت أعلى مستوى VIP — استمر للحفاظ على عضويتك' : `استمر في الشحن لتحصل على ${V.num(model.remaining)} من نقاط الخبرة، والتي يمكن ترقيتها إلى VIP${model.next}`;
  return `<div class="vx-dock-space" aria-hidden="true"></div><div class="vx-dock">${strip}<div class="vx-dock-bar"><p>${esc(text)}</p><button class="vn-gold-btn" type="button" data-vn-action="charge">اشحن الآن</button></div></div>`;
}
function packagesSheet(state, ctx) {
  const packages = list(state.data?.packages).filter((pack) => obj(pack) && R.identifier(pack.id));
  const body = packages.length ? `<div class="vx-packs">${packages.map((pack) => {
    const allowed = availablePackage(pack, state.data) && R.canWrite(ctx) && !state.busy && !state.loading;
    return `<article class="vx-pack" data-lbv-package="${esc(pack.id)}"><span class="vx-pack-crown">${V.glyph('crown')}</span><div><b>${esc(typeof pack.name === 'string' ? pack.name : 'باقة')}</b><small>${V.num(pack.points)} نقطة خبرة VIP · ${nat(pack.durationDays) && pack.durationDays > 0 ? `${fmt(pack.durationDays)} يوم` : 'المدة غير معتمدة'}</small></div><button class="vn-gold-btn sm" type="button" data-lbv-action="preview" data-lbv-id="${esc(pack.id)}" ${allowed ? '' : 'disabled aria-disabled="true"'}>${state.busy === pack.id ? '…' : allowed ? esc(priceText(pack.price)) : 'غير متاح'}</button></article>`;
  }).join('')}</div><p class="vn-note">السعر يُدفع من محفظتك (عملات أو جواهر) ويتأكد منه الخادم قبل الحفظ. نقاط خبرة VIP ليست عملات.</p>`
    : `<p class="vn-empty">${state.data?.enabled === false ? 'شراء عضوية VIP غير مفعّل حالياً.' : 'ما فيه باقات VIP معتمدة حالياً.'} تقدر تجمع خبرة VIP من المباريات والهدايا، أو تشحن رصيدك من الباقات.</p><a class="vn-gold-btn" href="#/shop/packs/gems">باقات الشحن</a>`;
  return { title: 'اشحن VIP', body: body + (state.error ? `<p class="vn-error" role="alert">${esc(state.error)}</p>` : '') };
}
function menuSheet(state) {
  return { title: 'VIP الخاص بي', body: `<div class="vn-menu"><button type="button" data-lbv-action="refresh">${V.glyph('history')}<span>تحديث البيانات من الخادم</span></button></div><h3 class="vn-sub">سجل عمليات العضوية</h3>${historyHTML(state.data) || '<p class="vn-empty">ما فيه عمليات عضوية محفوظة.</p>'}<h3 class="vn-sub">الشروط</h3>${termsHTML(null, state.data)}<p class="vn-note">VIP للمظاهر والتخصيصات، لا لتغيير فرص الفوز.</p>` };
}
function termsHTML(pack, data) {
  const policy = obj(data?.policy) ? data.policy : null;
  const terms = typeof pack?.terms === 'string' ? pack.terms : typeof data?.terms === 'string' ? data.terms : policy?.expiry === 'retain-lifetime-xp' ? 'عند انتهاء المدة تُحفظ خبرة VIP المكتسبة. المقتنيات الدائمة لا تُحذف؛ المزايا التي تتطلب عضوية نشطة تُغلق فقط حتى التجديد.' : '';
  const renewal = typeof pack?.renewalPolicy === 'string' ? pack.renewalPolicy : typeof data?.renewalPolicy === 'string' ? data.renewalPolicy : policy?.renewal === 'preserve-active-expiry' ? 'التجديد يضيف مدة الباقة إلى نهاية العضوية النشطة، أو يبدأ من وقت الشراء إن كانت منتهية. المستوى يعود حسب خبرة VIP المحفوظة؛ لا يوجد تجديد تلقائي من هذه الواجهة.' : '';
  return `<div class="lbv-terms"><p>${esc(terms || 'الشروط التفصيلية غير منشورة في هذه البيانات. الخادم يتحقق من السعر والاستحقاق قبل الحفظ.')}</p><p>${esc(renewal || 'سياسة التجديد واستعادة المستوى لم تُعرض في البيانات الحالية؛ لا نفترض تجديدًا تلقائيًا.')}</p></div>`;
}
function historyHTML(data) {
  const orders = list(data?.orders).filter(row => obj(row) && typeof row.id === 'string');
  if (!orders.length) return '';
  const names = { complete: 'مكتملة', completed: 'مكتملة', purchased: 'مكتملة', active: 'مكتملة', debited: 'قيد استكمال الحفظ', refunded: 'مسترجعة', pending: 'قيد المعالجة', failed: 'لم تكتمل' };
  return `<ul class="vn-list">${orders.map(row => `<li><b>${esc(row.packageName ?? row.name ?? 'عملية عضوية محفوظة')}</b><span>${esc(names[row.status] || 'الحالة غير متاحة')}</span><small>${esc(R.dateText(row.createdAt ?? row.ts))}</small></li>`).join('')}</ul>`;
}
function confirmationHTML(state) {
  const confirm = state.confirm;
  if (!confirm) return '';
  const pack = confirm.pack;
  return `<dialog class="lbv-confirm" open aria-labelledby="lbv-confirm-heading" aria-describedby="lbv-confirm-details"><div class="lbv-confirm-head">${icon('crown')}<h2 id="lbv-confirm-heading">تأكيد ترقية VIP</h2></div><div id="lbv-confirm-details"><h3>${esc(pack.name)}</h3><dl><div><dt>السعر المعتمد</dt><dd>${esc(priceText(pack.price))}</dd></div><div><dt>خبرة VIP المضافة</dt><dd>${fmt(pack.points)} نقطة</dd></div><div><dt>مدة العضوية</dt><dd>${fmt(pack.durationDays)} يوم</dd></div></dl>${termsHTML(pack, confirm.preview)}${Array.isArray(confirm.preview.benefits) && confirm.preview.benefits.length ? `<div class="lbv-confirm-benefits"><h3>المزايا وفق معاينة الخادم</h3><ul>${confirm.preview.benefits.filter(b => obj(b) && typeof b.name === 'string').map(b => `<li>${esc(b.name)}${nat(b.level) ? ` · VIP ${b.level}` : ''}</li>`).join('')}</ul></div>` : ''}<p class="lbrv-muted">لا يخصم المتصفح رصيدًا ولا يمنح نقاطًا. ينفّذ الخادم العملية مرة واحدة وفق السعر الذي راجعته.</p></div>${state.error ? `<p class="lbrv-notice is-error" role="alert">${esc(state.error)}</p>` : ''}<div class="lbv-confirm-actions"><button class="lbrv-button is-gold" type="button" data-lbv-action="purchase" ${state.purchasing || !confirm.key ? 'disabled' : ''}>${state.purchasing ? 'جاري الحفظ…' : confirm.attempted ? 'إعادة محاولة الطلب نفسه' : 'تأكيد الشراء'}</button><button class="lbrv-button" type="button" data-lbv-action="cancel" ${state.purchasing ? 'disabled' : ''}>${confirm.attempted ? 'إغلاق · الطلب محفوظ لإعادة المحاولة' : 'تراجع'}</button></div></dialog>`;
}
function initial(ctx) { return { data: normalizeMembership(dataOf(ctx)), loading: false, busy: '', error: '', notice: '', confirm: null, purchasing: false, sheet: null, perk: null, stripClosed: false, shop: null, rewards: obj(ctx.rankRewards) ? ctx.rankRewards : null }; }
function sheetFor(state, ctx) {
  if (state.sheet === 'charge') return packagesSheet(state, ctx);
  if (state.sheet === 'menu') return menuSheet(state);
  if (state.sheet === 'perk') { const p = vipPerks(state, ctx)[state.perk]; return p ? { title: p.name, body: V.perkSheetBody(p) } : null; }
  return null;
}
function bodyHTML(state, ctx) {
  const top = V.topbarHTML(ctx, 'VIP الخاص بي', `<button class="vn-icon-btn" type="button" data-vn-action="menu" aria-label="خيارات VIP">${V.glyph('dots')}</button>`);
  if (!R.accountId(ctx)) return `${top}<div class="vn-login">${R.loginHTML()}</div>`;
  const perks = vipPerks(state, ctx);
  const entry = progressionOf(state, ctx);
  const view = R.rankState(entry, 'vip');
  const rank = view.state === 'earned' ? view.rank : 0;
  const mine = perks.map((p, i) => [p, i]).filter(([p]) => p.level <= rank);
  const next = perks.map((p, i) => [p, i]).filter(([p]) => p.level > rank);
  const grid = (rows) => rows.map(([p, i]) => V.perkCardHTML(p, i, 'vx-perk', false)).join('');
  const notice = state.loading && !state.data ? '<p class="vn-note" role="status">جاري التحديث من الخادم…</p>' : (state.error && !state.sheet ? `<p class="vn-error" role="alert">${esc(state.error)}</p>` : '') + (state.notice ? `<p class="vn-note" role="status">${esc(state.notice)}</p>` : '');
  return `${top}<div class="vx-sticky">${cardHTML(state, ctx)}</div>${notice}
    <section class="vx-section"><h2 class="vn-heading">${V.glyph('laurel', 'flip')}<span>امتيازاتي</span>${V.glyph('laurel')}</h2>${mine.length ? `<div class="vn-grid">${grid(mine)}</div>` : `<p class="vn-empty">${entry?.enabled === true ? 'ما عندك امتيازات مفتوحة بعد — أول امتياز يفتح عند VIP1.' : 'نظام VIP غير مفعّل حالياً.'}</p>`}</section>
    <section class="vx-section"><h2 class="vn-heading">${V.glyph('laurel', 'flip')}<span>الامتيازات القادمة</span>${V.glyph('laurel')}</h2>${next.length ? `<div class="vn-grid">${grid(next)}</div>` : `<p class="vn-empty">${rank === 15 ? 'وصلت أعلى مستوى، كل الامتيازات مفتوحة.' : 'ما فيه امتيازات قادمة منشورة.'}</p>`}</section>
    ${bottomHTML(state, ctx)}${V.sheetHTML(sheetFor(state, ctx))}${confirmationHTML(state)}`;
}
export function render(ctx = {}) { return `<div class="lbrv-page lbv-page vn-page vx-page" data-lb-page="vip" dir="rtl">${bodyHTML(initial(ctx), ctx)}</div>`; }
export function mount(root, ctx = {}) {
  const state = initial(ctx), attempts = new Map();
  const life = R.lifecycle(root, ctx, 'vip', () => bodyHTML(state, ctx));
  let expiryState = membershipState(state.data), expiryTimer;
  let opener = null;
  const ctaObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
    if (!life.current()) return;
    const height = entries[0]?.target?.getBoundingClientRect?.().height;
    if (Number.isFinite(height) && height > 0) life.page?.style?.setProperty?.('--lbv-cta-height', `${Math.ceil(height)}px`);
  }) : null;
  function paint() {
    if (!life.current()) return;
    life.paint();
    ctaObserver?.disconnect();
    const cta = life.page?.querySelector?.('.lbv-sticky-cta');
    if (cta) ctaObserver?.observe(cta);
    const dialog = life.page?.querySelector?.('dialog');
    if (dialog && state.confirm) {
      // Turn the server-renderable open dialog into a native modal/top layer.
      if (typeof dialog.showModal === 'function') { try { dialog.close(); dialog.showModal(); } catch { /* Keyboard containment below supports older webviews. */ } }
      dialog.querySelector?.('[data-lbv-action="cancel"]:not([disabled])')?.focus?.({ preventScroll: true });
    }
  }
  function validData(data) { return obj(data) && Object.hasOwn(STATUS_NAMES, data.status) && typeof data.enabled === 'boolean' && obj(data.progression) && Array.isArray(data.benefits) && Array.isArray(data.packages); }
  async function load() {
    if (!life.current() || !R.accountId(ctx) || !R.canRead(ctx) || state.busy || state.confirm) return;
    const version = life.next(); state.loading = true; state.error = ''; paint();
    try {
      const data = normalizeMembership(await R.call(ctx, '/api/vip-membership'));
      if (!life.current(version)) return;
      if (!validData(data)) throw new Error('Invalid membership payload');
      state.data = data; expiryState = membershipState(data);
    } catch (error) { if (life.current(version)) state.error = R.errorText(error); }
    finally { if (life.current(version)) { state.loading = false; paint(); } }
  }
  async function preview(id, button) {
    if (!life.current() || state.busy || state.loading || state.confirm || !R.canWrite(ctx)) return;
    const pack = list(state.data?.packages).find(p => p.id === id);
    if (!availablePackage(pack, state.data)) return;
    const pending = [...attempts.values()].find(attempt => attempt.attempted && attempt.confirm?.pack.id === id);
    if (pending) { state.confirm = pending.confirm; state.error = ''; opener = button; paint(); return; }
    const version = life.next(); state.busy = id; state.error = ''; state.notice = ''; opener = button; paint();
    try {
      const result = await R.call(ctx, '/api/vip-membership/preview', 'POST', { packageId: id });
      if (!life.current(version)) return;
      const raw = result.package ?? result.offer ?? result;
      const approved = { ...raw, fingerprint: result.fingerprint ?? raw.fingerprint, available: raw.available === true || (raw.available === undefined && raw.enabled === true && state.data.purchasesEnabled === true) };
      if (!availablePackage(approved, state.data) || approved.id !== id || !R.fingerprint(approved.fingerprint)) throw new Error('Invalid preview');
      if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('Secure UUID unavailable');
      const attemptId = `${id}:${approved.fingerprint}`;
      let attempt = attempts.get(attemptId);
      if (!attempt) { attempt = { key: globalThis.crypto.randomUUID(), attempted: false }; attempts.set(attemptId, attempt); }
      state.confirm = { pack: approved, preview: result, key: attempt.key, attempted: attempt.attempted, attemptId };
      attempt.confirm = state.confirm;
    } catch (error) { if (life.current(version)) state.error = R.errorText(error); }
    finally { if (life.current(version)) { state.busy = ''; paint(); } }
  }
  async function purchase() {
    const confirm = state.confirm;
    if (!confirm || !life.current() || !R.canWrite(ctx) || state.purchasing || !availablePackage(confirm.pack, state.data) || !R.fingerprint(confirm.pack.fingerprint) || !confirm.key) return;
    const version = life.next(); state.purchasing = true; state.busy = confirm.pack.id; state.error = ''; confirm.attempted = true;
    attempts.get(confirm.attemptId).attempted = true; paint();
    try {
      const result = await R.call(ctx, '/api/vip-membership/purchase', 'POST', { packageId: confirm.pack.id, fingerprint: confirm.pack.fingerprint, key: confirm.key });
      if (!life.current(version)) return;
      // A fulfilled helper alone is not evidence of a saved purchase.
      if (result.ok !== true || (result.order ? result.order.status !== 'complete' : !['complete', 'completed', 'purchased', 'active'].includes(result.status))) throw new Error('Purchase not confirmed');
      state.confirm = null;
      state.notice = result.dup === true ? 'هذا الطلب محفوظ مسبقًا؛ لم تُنفذ ترقية ثانية.' : 'تم حفظ عملية العضوية على الخادم. نحدّث بياناتك الآن.';
      attempts.delete(confirm.attemptId);
      const data = normalizeMembership(await R.call(ctx, '/api/vip-membership'));
      if (!life.current(version)) return;
      if (!validData(data)) throw new Error('Invalid refreshed membership');
      state.data = data; expiryState = membershipState(data);
      if (typeof ctx.refreshMe === 'function') { await ctx.refreshMe(); if (!life.current(version)) return; }
    } catch (error) { if (life.current(version)) state.error = R.errorText(error); }
    finally { if (life.current(version)) { state.purchasing = false; state.busy = ''; paint(); } }
  }
  function cancel() {
    if (state.purchasing || !state.confirm) return;
    const id = state.confirm.pack.id;
    state.confirm = null; state.error = ''; paint();
    const target = life.page?.querySelector?.(`[data-lbv-id="${id}"]`);
    (target ?? opener)?.focus?.({ preventScroll: true }); opener = null;
  }
  async function loadExtras() {
    // صور العناصر وشروطها من المتجر، ومكافآت رتب VIP المنشورة — قراءة فقط
    const tasks = [V.loadShop(state, ctx)];
    if (!state.rewards && R.canRead(ctx)) tasks.push(R.call(ctx, '/api/rank-rewards').then(r => { if (obj(r)) state.rewards = r; }).catch(() => {}));
    await Promise.all(tasks);
    if (life.current() && !state.purchasing) paint();
  }
  life.on('click', event => {
    const vn = event.target?.closest?.('[data-vn-action]');
    if (vn && life.page?.contains?.(vn) && !vn.disabled && life.current()) {
      const act = vn.dataset.vnAction;
      if (act === 'close') { state.sheet = null; state.error = ''; paint(); return; }
      if (act === 'strip') { state.stripClosed = true; paint(); return; }
      if (act === 'menu' || act === 'charge') { state.sheet = act; paint(); V.focusSheet(life.page); return; }
      if (act === 'perk') { const n = Number(vn.dataset.vnPerk); if (Number.isSafeInteger(n) && n >= 0) { state.sheet = 'perk'; state.perk = n; paint(); V.focusSheet(life.page); } return; }
    }
    const button = event.target?.closest?.('[data-lbv-action]');
    if (!button || !life.page?.contains?.(button) || button.disabled || !life.current()) return;
    const action = button.dataset.lbvAction;
    if (action === 'refresh') void load();
    else if (action === 'preview') void preview(button.dataset.lbvId, button);
    else if (action === 'purchase') void purchase();
    else if (action === 'cancel') cancel();
    else if (action === 'packages') { const section = life.page.querySelector?.('#lbv-packages'); section?.scrollIntoView?.({ behavior: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); section?.focus?.({ preventScroll: true }); }
  });
  // Native dialog cancel does not bubble, so capture on the page is added separately.
  const onCancel = event => { if (state.confirm) { event.preventDefault(); cancel(); } };
  life.page?.addEventListener?.('cancel', onCancel, true);
  life.on('keydown', event => {
    if (!state.confirm && state.sheet && event.key === 'Escape' && life.current()) { state.sheet = null; paint(); return; }
    if (!state.confirm || !life.current()) return;
    if (event.key === 'Escape') { event.preventDefault(); cancel(); return; }
    if (event.key !== 'Tab') return;
    const dialog = life.page?.querySelector?.('dialog');
    const nodes = [...(dialog?.querySelectorAll?.('button:not([disabled]),a[href],[tabindex="0"]') ?? [])];
    if (!nodes.length) { event.preventDefault(); return; }
    const active = life.page.ownerDocument?.activeElement;
    if (event.shiftKey && (active === nodes[0] || !dialog.contains(active))) { event.preventDefault(); nodes.at(-1)?.focus?.(); }
    else if (!event.shiftKey && (active === nodes.at(-1) || !dialog.contains(active))) { event.preventDefault(); nodes[0]?.focus?.(); }
  });
  expiryTimer = R.accountId(ctx) ? setInterval(() => {
    if (!life.current()) { clearInterval(expiryTimer); ctaObserver?.disconnect(); attempts.clear(); state.confirm = null; return; }
    const next = membershipState(state.data);
    if (next !== expiryState) { expiryState = next; paint(); }
  }, 100) : null;
  expiryTimer?.unref?.();
  paint(); if (!state.data) void load(); void loadExtras();
  return { destroy() { if (expiryTimer) clearInterval(expiryTimer); ctaObserver?.disconnect(); life.page?.removeEventListener?.('cancel', onCancel, true); life.destroy(); attempts.clear(); state.data = null; state.confirm = null; state.busy = ''; },
    update(next = {}) { if (!life.current() || state.purchasing || state.busy) return; const data = normalizeMembership(dataOf(next)); if (obj(data)) { state.data = data; life.next(); state.loading = false; state.confirm = null; } if (obj(next.me)) ctx.me = next.me; expiryState = membershipState(state.data); paint(); }, reload: load };
}
