/* Pure profile section: the host owns fetching, open/close, tab changes and claims.
 * ctx.me.progression is the only rank authority. Config is either the plain
 * {level,vip,noble} object or a {config} envelope, only if provided by the host.
 * VIP/NOBLE pointsFloor, pointsNext and nextRank from /api/account take priority.
 * ctx.rankOverviewOpen === true opens this otherwise-hidden embedded section.
 * ctx.rankRewards accepts {policies,claims}; the existing {list,claims} API is
 * also supported without inventing reward contents from its description.
 * Mapping helpers return artwork/colour, NOT ownership or eligibility.
 */
const SYSTEMS = ['level', 'vip', 'noble'];
const CAPS = { level: 100, vip: 15, noble: 9 };
const LABELS = { level: 'LEVEL', vip: 'VIP', noble: 'NOBLE' };
const GROUPS = {
  level: [[1,20,'silver'],[21,40,'blue'],[41,60,'purple'],[61,80,'gold'],[81,99,'red'],[100,100,'max']],
  vip: [[1,4,'silver'],[5,7,'blue'],[8,11,'purple'],[12,14,'gold'],[15,15,'max']],
  noble: [[1,1,'silver'],[2,2,'blue'],[3,3,'purple'],[4,4,'gold'],[5,5,'max'],[6,6,'purple'],[7,7,'gold'],[8,8,'red'],[9,9,'max']],
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const obj = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const list = value => Array.isArray(value) ? value : [];
const nat = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const fmt = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
function rankNumber(system, value) {
  if (!SYSTEMS.includes(system)) return null;
  let n = value;
  if (typeof value === 'string' && system !== 'level') {
    const pattern = system === 'vip' ? /^V([1-9]|1[0-5])$/ : /^N([1-9])$/;
    const match = value.match(pattern);
    if (!match) return null;
    n = Number(match[1]);
  }
  return nat(n) && n >= 1 && n <= CAPS[system] ? n : null;
}
const rankLabel = (system, rank) => system === 'noble' ? `N${rank}` : system === 'vip' ? `V${rank}` : String(rank);

/** Exact approved badge crop path; presentation masks its retained background. */
export function rankBadgeArt(system, rawValue) {
  const rank = rankNumber(system, rawValue);
  if (rank === null) return '';
  // R65: شارات المالك — 9 للنوبل و15 للـVIP، شارة خاصة لكل رتبة
  if (system === 'noble') return `/preview/assets/profile/ranks/r65/noble-n${rank}.webp?v=r65a`;
  if (system === 'vip') return `/preview/assets/profile/ranks/r65/vip-v${rank}.webp?v=r65a`;
  return `/preview/assets/profile/ranks/${system}-${rankTheme(system, rawValue)}.png?v=r101`;
}

/** Stable CSS accent token; invalid values are neutral, never a rank. */
export function rankTheme(system, rawValue) {
  const rank = rankNumber(system, rawValue);
  if (rank === null) return 'neutral';
  return GROUPS[system].find(([min,max]) => rank >= min && rank <= max)[2];
}

function rankState(ctx, system) {
  const entry = ctx.me?.progression?.[system];
  if (!obj(entry)) return { state: 'unavailable', rank: null, text: 'الرتبة مب متوفّرة الحين', entry: null };
  if (entry.enabled === false) return { state: 'disabled', rank: null, text: 'نظام الرتبة مب مفعّل', entry };
  if (entry.enabled !== true) return { state: 'unavailable', rank: null, text: 'حالة الرتبة مب متوفّرة الحين', entry };
  if (entry.value === null) return { state: 'unranked', rank: null, text: 'ما عندك رتبة مكتسبة بعد', entry };
  const rank = rankNumber(system, entry.value);
  if (rank === null) return { state: 'invalid', rank: null, text: 'بيانات الرتبة مب صالحة، حدّث الملف', entry };
  return { state: 'earned', rank, text: `${LABELS[system]} ${rankLabel(system, rank)}`, entry };
}

/** Shared authoritative badge view, never ownership or threshold inference. */
export function rankSummary(ctx, system) {
  const view = rankState(obj(ctx) ? ctx : {}, system);
  const art = view.state === 'earned' ? rankBadgeArt(system, view.entry.value) : '';
  return { ...view, art, theme: art ? rankTheme(system, view.entry.value) : 'neutral' };
}

function configOf(ctx) {
  const raw = ctx.progressionConfig;
  return obj(raw?.config) ? raw.config : obj(raw) ? raw : null;
}
function thresholdsFor(ctx, system) {
  const cfg = configOf(ctx)?.[system];
  const thresholds = cfg?.thresholds;
  if (cfg?.enabled !== true || !Array.isArray(thresholds) || (system === 'noble' ? ![5,9].includes(thresholds.length) : thresholds.length !== CAPS[system])
    || !thresholds.every((value, i) => nat(value) && (i === 0 || value > thresholds[i - 1]))) return null;
  return thresholds;
}
function meter(value, max, label) {
  const percentage = max === 0 ? 100 : value / max * 100;
  return `<div class="pvp-rank-meter"><progress max="${max || 1}" value="${max === 0 ? 1 : value}" aria-label="${esc(label)}" aria-valuetext="${esc(fmt(percentage))}%"></progress><span>${fmt(percentage)}%</span></div>`;
}
function progressionHTML(ctx, system, view) {
  if (!view.entry || ['disabled','unavailable','invalid'].includes(view.state)) return `<p class="pvp-rank-note">${esc(view.text)}. الكتالوج تحت للعرض بس، مب رتب مكتسبة.</p>`;
  if (system === 'level') {
    if (view.rank === null) return '<p class="pvp-rank-note">ما عندك مستوى معتمد لعرض تقدّم XP.</p>';
    const { xp, xpFloor, xpNext } = view.entry;
    const capped = view.rank === CAPS.level;
    const valid = nat(xp) && nat(xpFloor) && xp >= xpFloor
      && (capped || (nat(xpNext) && xpNext > xpFloor && xp < xpNext));
    const capNote = capped ? '<p class="pvp-rank-cap">وصلت LEVEL 100 — هذا الحد الأعلى، ما فيه مستوى أعلى.</p>' : '';
    if (!valid) return `${capNote}<p class="pvp-rank-note">بيانات تقدّم XP مب مكتملة أو مب صالحة، ما نقدر نحسب التقدّم.</p>`;
    if (capped) return `${capNote}<p class="pvp-rank-values"><b dir="ltr">${fmt(xp)} XP</b><span>بداية المستوى: <b dir="ltr">${fmt(xpFloor)} XP</b></span></p>${meter(1,1,'وصلت الحد الأعلى LEVEL 100')}`;
    return `<p class="pvp-rank-values"><b dir="ltr">${fmt(xp)} XP</b><span>بداية المستوى: <b dir="ltr">${fmt(xpFloor)} XP</b></span></p>${meter(xp - xpFloor,xpNext - xpFloor,'تقدّم XP للمستوى التالي')}<p class="pvp-rank-next">المستوى الياي <b dir="ltr">LEVEL ${view.rank + 1}</b> عند <b dir="ltr">${fmt(xpNext)} XP</b> · باقي <b dir="ltr">${fmt(xpNext - xp)} XP</b></p>`;
  }
  const points = view.entry.points;
  const thresholds = thresholdsFor(ctx, system);
  const pointsLine = nat(points) ? `<p class="pvp-rank-values">نقاطك المعتمدة: <b dir="ltr">${fmt(points)}</b></p>` : '<p class="pvp-rank-note">نقاطك مب متوفّرة أو مب صالحة.</p>';
  const declaredCap = view.entry.activeMax ?? view.entry.max;
  const configuredCap = system === 'noble' ? Math.min(5,thresholds?.length ?? (Number.isSafeInteger(declaredCap) && declaredCap > 0 && declaredCap <= CAPS.noble ? declaredCap : 5)) : CAPS[system];
  if (view.rank === configuredCap) return `${pointsLine}<p class="pvp-rank-cap">وصلت ${LABELS[system]} ${rankLabel(system,view.rank)} — هذا الحد الأعلى، ما فيه رتبة أعلى.</p>`;
  const current = view.rank ?? 0;
  const next = current + 1;
  const hasServerFields = ['pointsFloor','pointsNext','nextRank'].some(key => Object.hasOwn(view.entry,key));
  let floor, threshold;
  if (hasServerFields) {
    floor = view.entry.pointsFloor;
    threshold = view.entry.pointsNext;
    if (!nat(floor) || !nat(threshold) || threshold < floor || view.entry.nextRank !== rankLabel(system,next)) {
      return `${pointsLine}<p class="pvp-rank-note">بيانات حدود الترقية من الخادم مب مكتملة أو مب صالحة. ما نقدر نحسب التقدّم.</p>`;
    }
  } else if (thresholds) {
    floor = current === 0 ? 0 : thresholds[current - 1];
    threshold = thresholds[current];
  } else {
    return `${pointsLine}<p class="pvp-rank-note">حدود ترقيات ${LABELS[system]} مب متوفّرة أو مب معتمدة. ما نقدر نحدد شرط الرتبة الياية.</p>`;
  }
  const nextLine = `<p class="pvp-rank-next">الرتبة الياية <b dir="ltr">${LABELS[system]} ${rankLabel(system,next)}</b> عند <b dir="ltr">${fmt(threshold)}</b> نقطة.</p>`;
  if (!nat(points)) return `${pointsLine}${nextLine}`;
  if (points < floor || points >= threshold) return `${pointsLine}<p class="pvp-rank-note">النقاط وحدود الرتب ما تتطابق مع رتبتك المعتمدة، حدّث الملف.</p>`;
  return `${pointsLine}${meter(points - floor,threshold - floor,'تقدّم النقاط للرتبة التالية')}${nextLine}<p class="pvp-rank-note">باقي ${fmt(threshold - points)} نقطة. هذي الحدود من إعدادات الإدارة.</p>`;
}

function milestoneHTML(system, view) {
  return `<div class="pvp-rank-milestones" aria-label="شارات ${LABELS[system]}">${GROUPS[system].map(([min,max]) => {
    const earned = view.state === 'earned' && view.rank >= min;
    const current = earned && view.rank <= max;
    const representative = system === 'noble' ? `N${min}` : min;
    const label = system === 'noble' ? `N${min}` : min === max ? String(min) : `${min}–${max}`;
    const art = rankBadgeArt(system,representative);
    const visual = art ? `<img src="${art}" alt="شارة ${LABELS[system]} ${label}${earned ? '' : ' — عرض رمزي، مب مكتسبة'}" width="160" height="120" loading="lazy">` : '<span class="pvp-rank-art-unavailable">بانتظار اعتماد التصميم</span>';
    return `<article class="pvp-rank-milestone${earned ? ' is-earned' : ' is-symbolic'}${current ? ' is-current' : ''}" data-rank-theme="${rankTheme(system,representative)}" data-rank-earned="${earned}">${visual}<b dir="ltr">${LABELS[system]} ${label}</b><small>${current ? 'شارتك الحالية' : earned ? 'وصلتها' : 'عرض رمزي — مب مكتسبة'}</small></article>`;
  }).join('')}</div>`;
}
function catalogueHTML(ctx, system, view) {
  const thresholds = system === 'level' ? null : thresholdsFor(ctx, system);
  return `<section class="pvp-rank-catalogue" aria-labelledby="pvp-rank-catalogue-${system}"><h4 id="pvp-rank-catalogue-${system}">كل رتب ${LABELS[system]}</h4><p class="pvp-rank-note">${system === 'level' ? 'المستويات من 1 إلى 100، حسب نظام XP المعتمد.' : `الرتب من ${rankLabel(system,1)} إلى ${rankLabel(system,CAPS[system])}.` } الملوّن يوضح الرتب اللي وصلتها؛ الباقي للعرض، مب مكتسب.</p><ol class="pvp-rank-steps" aria-label="${CAPS[system]} رتبة في ${LABELS[system]}">${Array.from({length:CAPS[system]},(_,i) => {
    const rank = i + 1;
    const earned = view.state === 'earned' && rank <= view.rank;
    const current = earned && rank === view.rank;
    const configured = nat(thresholds?.[i]);
    const threshold = configured ? ` · شرط الرتبة: ${fmt(thresholds[i])} نقطة` : '';
    const status = current ? 'رتبتك الحالية' : earned ? 'وصلتها' : 'مب مكتسبة';
    return `<li class="pvp-rank-step${earned ? ' is-earned' : ''}${current ? ' is-current' : ''}" data-rank-number="${rank}" data-rank-theme="${rankTheme(system,rank)}" ${current ? 'aria-current="step"' : ''} aria-label="${LABELS[system]} ${rankLabel(system,rank)} · ${status}${threshold}" title="${LABELS[system]} ${rankLabel(system,rank)} · ${status}${threshold}"><span dir="ltr">${rankLabel(system,rank)}</span>${configured ? `<small>${fmt(thresholds[i])}</small>` : ''}</li>`;
  }).join('')}</ol>${system !== 'level' && !thresholds ? '<p class="pvp-rank-note">الكتالوج رمزي؛ شروط النقاط ما تحددت هنا بدون إعدادات صحيحة من الإدارة.</p>' : ''}</section>`;
}

function rewardEntries(ctx, system) {
  const raw = ctx.rankRewards;
  const source = Array.isArray(raw?.policies) ? raw.policies : list(raw?.list);
  const policies = source.filter(p => obj(p) && p.system === system && nat(p.rank) && p.rank >= 1 && p.rank <= CAPS[system]);
  const claims = list(raw?.claims).filter(c => obj(c) && c.system === system && nat(c.rank) && c.rank >= 1 && c.rank <= CAPS[system]);
  const ranks = [...new Set([...policies,...claims].map(p => p.rank))].sort((a,b) => a-b);
  return ranks.map(rank => {
    const matches = policies.filter(p => p.rank === rank);
    const receipts = claims.filter(c => c.rank === rank);
    const policy = matches[0];
    const claim = receipts[0];
    return { policy, claim, rank, ambiguous: matches.length > 1 || receipts.length > 1 };
  });
}
function rewardContent(ctx, entry) {
  const snapshot = Array.isArray(entry.claim?.rewards) ? entry.claim : entry.policy;
  if (!Array.isArray(snapshot?.rewards)) {
    const description = entry.policy?.description;
    return { html: typeof description === 'string' && description ? `<p>${esc(description)}</p><p class="pvp-rank-note">هالوصف من الخادم؛ تفاصيل العناصر مب متوفّرة.</p>` : '<p class="pvp-rank-note">تفاصيل المكافأة مب متوفّرة الحين.</p>', valid: typeof description === 'string' && !!description };
  }
  let valid = true;
  const rewards = snapshot.rewards;
  const seen = new Set();
  const html = rewards.map(reward => {
    if (!obj(reward)) { valid = false; return '<li>بيانات مكافأة مب صالحة.</li>'; }
    if (reward.type === 'currency' && ['coins','gems'].includes(reward.cur) && nat(reward.amount) && reward.amount > 0) {
      const key = `currency:${reward.cur}`;
      if (seen.has(key)) valid = false;
      seen.add(key);
      return `<li><b dir="ltr">${fmt(reward.cur === 'gems' ? reward.amount * 20 : reward.amount)}</b> عملة</li>`;
    }
    if (reward.type === 'item' && typeof reward.itemId === 'string' && reward.itemId && reward.mode === 'grant') {
      const key = `item:${reward.itemId}`;
      if (seen.has(key)) valid = false;
      seen.add(key);
      if (!/^[a-z][a-z0-9-]{2,63}$/.test(reward.itemId)) valid = false;
      const item = list(ctx.shopData?.items).find(item => obj(item) && item.id === reward.itemId);
      const slotNames = { frame: 'الإطارات', bg: 'الخلفيات', title: 'الألقاب' };
      const target = item && Object.hasOwn(slotNames,item.slot) ? item.slot : null;
      return `<li><span>${item ? esc(item.name || item.id) : 'مقتنى — تفاصيله مب متوفّرة'}</span><code dir="ltr">${esc(reward.itemId)}</code>${target ? `<button type="button" class="pvp-rank-inventory" data-pvp="tab" data-tab="${target}">فتح ${slotNames[target]} في مقتنياتك</button>` : ''}</li>`;
    }
    valid = false;
    return '<li>بيانات مكافأة مب صالحة، حدّث الملف.</li>';
  }).join('');
  if (!rewards.length) return { html: '<p class="pvp-rank-note">ما فيه عناصر إضافية في سجل هالاستلام.</p>', valid: !!entry.claim };
  return { html: `<ul class="pvp-rank-reward-content">${html}</ul>`, valid };
}
function rewardsHTML(ctx, system, view) {
  if (ctx.rankRewardsLoading === true) return '<section class="pvp-rank-rewards"><h4>مكافآت الرتب</h4><p class="pvp-rank-note" role="status">جاري تحميل مكافآت حسابك…</p></section>';
  if (ctx.rankRewardsError) return `<section class="pvp-rank-rewards"><h4>مكافآت الرتب</h4><p class="pvp-rank-note" role="alert">${esc(ctx.rankRewardsError)}</p><button type="button" data-pvp="rank-retry">إعادة تحميل المكافآت</button></section>`;
  if (!obj(ctx.rankRewards)) return '<section class="pvp-rank-rewards"><h4>مكافآت الرتب</h4><p class="pvp-rank-note">مكافآت الحساب غير متوفرة حاليًا.</p></section>';
  const entries = rewardEntries(ctx,system);
  const currentConfigured = view.rank !== null && entries.some(entry => entry.rank === view.rank);
  const missing = !entries.length || (view.rank !== null && !currentConfigured);
  return `<section class="pvp-rank-rewards" aria-labelledby="pvp-rank-rewards-${system}"><h4 id="pvp-rank-rewards-${system}">مكافآت الرتب</h4>${missing ? `<p class="pvp-rank-note">${view.rank !== null ? `<b dir="ltr">${LABELS[system]} ${rankLabel(system,view.rank)}</b> · ` : ''}مكافآت هالرتبة ما تحددت من الإدارة</p>` : ''}${entries.map(entry => {
    const { policy, claim, rank, ambiguous } = entry;
    const content = rewardContent(ctx,entry);
    const rawStatus = claim ? claim.status : (policy?.claimed === true ? 'claimed' : policy?.pending === true ? 'pending' : policy?.status ?? 'available');
    const statuses = { available:'متاحة حسب الأهلية', claimed:'تم استلامها', pending:'الاستلام قيد المعالجة', failed:'تعذّر الاستلام' };
    const status = Object.hasOwn(statuses,rawStatus) ? rawStatus : 'unknown';
    const eligible = policy?.eligible === true && view.state === 'earned' && view.rank >= rank;
    const fingerprint = policy?.fingerprint;
    const claimable = !claim && !ambiguous && content.valid && eligible && policy?.claimable === true && status === 'available'
      && ctx.rankClaimPending !== true && typeof fingerprint === 'string' && /^[a-f0-9]{64}$/.test(fingerprint);
    const eligibility = policy ? eligible ? 'مؤهّل حسب الخادم ورتبتك الحالية' : policy.eligible === false ? 'غير مؤهّل حسب الخادم' : 'الأهلية مب مؤكّدة' : 'سجل استلام سابق';
    const label = typeof policy?.label === 'string' && policy.label ? `<p class="pvp-rank-reward-label">${esc(policy.label)}</p>` : '';
    const disabledLabel = status === 'claimed' ? 'تم الاستلام' : status === 'pending' ? 'قيد المعالجة' : status === 'failed' ? 'تعذّر الاستلام' : 'الاستلام مب متاح الحين';
    return `<article class="pvp-rank-reward" data-reward-system="${system}" data-reward-rank="${rank}" data-reward-status="${status}" data-reward-eligible="${eligible}"><div class="pvp-rank-reward-head"><h5 dir="ltr">${LABELS[system]} ${rankLabel(system,rank)}</h5><span>${statuses[status] || 'حالة الاستلام مب متوفّرة'}</span></div>${label}${content.html}<p class="pvp-rank-note">${eligibility}${ambiguous ? ' · بيانات متكررة، حدّث الملف' : ''}</p>${claimable ? `<button type="button" class="pvp-rank-claim" data-pvp="rank-claim" data-system="${system}" data-rank="${rank}" data-fingerprint="${esc(fingerprint)}">استلم مكافأتك</button>` : `<button type="button" class="pvp-rank-claim-state" disabled>${disabledLabel}</button>`}</article>`;
  }).join('')}</section>`;
}

/** HTML only: no globals, backend calls, mutations, timers or event handlers. */
export function renderRankOverview(ctx = {}, selected = 'level') {
  ctx = obj(ctx) ? ctx : {};
  const active = SYSTEMS.includes(selected) ? selected : 'level';
  const open = ctx.rankOverviewOpen === true;
  const basic = ctx.profileJourneyDefault === true;
  const systems = basic ? ['level'] : SYSTEMS;
  const close = basic ? '<button type="button" class="pvp-rank-close" data-pvp="rank-system" data-system="level" aria-label="عرض تفاصيل LEVEL">التفاصيل</button>' : '<button type="button" class="pvp-rank-close" data-pvp="rank-close" aria-label="إغلاق تفاصيل الرتب">إغلاق <span aria-hidden="true">×</span></button>';
  return `<section id="pvp-rank-overview" class="pvp-rank-overview" data-pvp-section="rank-overview" data-rank-mode="${basic?'journey':'expanded'}" aria-labelledby="pvp-rank-overview-heading" dir="rtl" ${open ? '' : 'hidden'}><header class="pvp-rank-overview-head"><div><small>رتبك من بيانات حسابك</small><h2 id="pvp-rank-overview-heading">${basic?'رحلة اللاعب · LEVEL':'تفاصيل '+LABELS[active]}</h2></div>${close}</header>${basic?'':`<nav class="pvp-rank-tabs" role="tablist" aria-label="أنظمة الرتب">${SYSTEMS.map(system => `<button type="button" role="tab" id="pvp-rank-tab-${system}" class="pvp-rank-system${active === system ? ' is-active' : ''}" data-pvp="rank-system" data-system="${system}" aria-controls="pvp-rank-panel-${system}" aria-selected="${active === system}" tabindex="${active === system ? 0 : -1}">${LABELS[system]}<small>${system === 'noble' ? 'N1–N5' : `1–${CAPS[system]}`}</small></button>`).join('')}</nav>`}${systems.map(system => {
    const view = rankState(ctx,system);
    const art = view.state === 'earned' ? rankBadgeArt(system,view.entry.value) : '';
    return `<div id="pvp-rank-panel-${system}" class="pvp-rank-panel" role="${basic?'region':'tabpanel'}" aria-labelledby="${basic?'pvp-rank-overview-heading':'pvp-rank-tab-'+system}" tabindex="0" ${basic || active === system ? '' : 'hidden'}><section class="pvp-rank-current" data-rank-state="${view.state}" data-rank-theme="${art ? rankTheme(system,view.entry.value) : 'neutral'}" aria-label="رتبتك الحالية في ${LABELS[system]}">${art ? `<img class="pvp-rank-current-art" src="${art}" alt="شارتك المكتسبة ${esc(view.text)}" width="180" height="140">` : '<span class="pvp-rank-no-art" aria-hidden="true">—</span>'}<div><small>رتبتك الحالية · الحد الأعلى ${system === 'noble' ? 'N5' : CAPS[system]}</small><h3>${esc(view.text)}</h3>${progressionHTML(ctx,system,view)}</div></section>${rewardsHTML(ctx,system,view)}<details class="pvp-rank-catalogue-disclosure"><summary>استعراض شارات وكتالوج ${LABELS[system]}</summary>${milestoneHTML(system,view)}${catalogueHTML(ctx,system,view)}</details></div>`;
  }).join('')}</section>`;
}
