/* Rank page BODY only. The unified shell owns header, wallet, auth and navigation.
 * GETs never grant points. Every entitlement and claim remains server-authoritative. */
import { EFFECTS as PERK_EFFECTS, effectArt, effectKindLabel } from '../rank-perks-r56.js?v=r67t';
import { mini } from '../avatars.js?v=r68z31';
import * as R from './rank-vip-shared.js?v=r66b';
import * as V from './vip-noble-r52.js?v=r68z40d';
const { esc, obj, list, nat, fmt, icon, artwork } = R;

export function catalogueOf(data) {
  const source = list(data?.catalog);
  return Array.from({ length: 9 }, (_, i) => {
    const rank = i + 1;
    const matches = source.filter(row => obj(row) && (row.rank === rank || row.id === `N${rank}`));
    const row = matches.length === 1 ? matches[0] : null;
    const configured = row?.configured === true && nat(row.threshold) && typeof row.name === 'string' && Boolean(row.name.trim());
    return { rank, configured, name: configured ? row.name : `المستوى ${fmt(rank)}`, threshold: configured ? row.threshold : null,
      artwork: R.safeImageURL(row?.artwork), color: R.safeColor(row?.color), rarity: typeof row?.rarity === 'string' ? row.rarity : '', id: `N${rank}` };
  });
}
function progressionOf(state, ctx) { return obj(state.data?.progression) ? state.data.progression : ctx.me?.progression; }
export function rewardEntries(raw) {
  const policies = list(Array.isArray(raw?.policies) ? raw.policies : raw?.list);
  const claims = list(raw?.claims);
  const valid = row => obj(row) && ['level', 'vip', 'noble'].includes(row.system) && nat(row.rank) && row.rank >= 1 && row.rank <= R.CAPS[row.system];
  const keys = [...new Set([...policies, ...claims].filter(valid).map(row => `${row.system}:${row.rank}`))];
  return keys.map(id => {
    const p = policies.filter(row => valid(row) && `${row.system}:${row.rank}` === id);
    const c = claims.filter(row => valid(row) && `${row.system}:${row.rank}` === id);
    return { id, policy: p[0] ?? null, claim: c[0] ?? null, duplicate: p.length > 1 || c.length > 1 };
  });
}
export function rewardClaimable(row, progression) {
  const p = row.policy;
  const snapshot = row.claim ?? p;
  const view = R.rankState(progression?.[snapshot?.system], snapshot?.system);
  const claimed = row.claim?.status === 'claimed' || p?.claimed === true;
  const pending = row.claim?.status === 'pending' || p?.pending === true;
  const fp = pending ? row.claim?.fingerprint ?? p?.fingerprint : p?.fingerprint;
  return !row.duplicate && !claimed && view.state === 'earned' && view.rank >= snapshot.rank && R.fingerprint(fp)
    && (pending || (p?.eligible === true && p?.claimable === true));
}
export function validStandings(data) {
  if (!obj(data) || !Array.isArray(data.list)) return false;
  const ids = new Set(), places = new Set();
  return data.list.every((row, i) => {
    if (!obj(row) || typeof row.id !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(row.id) || typeof row.name !== 'string' || !row.name.trim() || !nat(row.points) || !nat(row.place) || row.place < 1 || (i > 0 && row.place <= data.list[i - 1].place) || ids.has(row.id) || places.has(row.place)) return false;
    ids.add(row.id); places.add(row.place); return true;
  });
}
/* ---------- R52: «مركز نوبل» بتصميم المرجع ---------- */
const noblePic = (rank, row) => {
  const art = R.rankArt('noble', rank, row?.configured ? row : null);
  return art ? `<img class="vn-rank-art" src="${esc(art)}" alt="" loading="lazy" decoding="async">` : V.hex('badge');
};
/** المصدر: نقاط الموسم النشط لو فيه موسم، وإلا النقاط التراكمية (نفس منطق الخادم) */
function nobleEntry(state, ctx) {
  const season = state.data?.season;
  if (obj(season) && season.active === true && obj(season.noble)) return { entry: season.noble, season };
  return { entry: progressionOf(state, ctx)?.noble, season: obj(season) ? season : null };
}
/** امتيازات مستوى نوبل من البيانات الحقيقية فقط: شعار الرتبة، مكافآت الرتبة المنشورة، وعناصر المتجر المشروطة بالرتبة */
export function noblePerks(state, ctx, level) {
  const catalogue = catalogueOf(state.data);
  const row = catalogue[level - 1];
  const { entry } = nobleEntry(state, ctx);
  const view = R.rankState(entry, 'noble');
  const rank = view.state === 'earned' ? view.rank : 0;
  const items = V.shopItems(state, ctx);
  const open = rank >= level;
  const out = [{ name: 'شارة', sub: row?.configured ? `شارة ${row.name}` : `شارة نوبل N${level}`, art: noblePic(level, row), desc: 'تظهر بجانب اسمك في ملفك الشخصي وفي الغرف عند وصولك لهذه الرتبة.', open }];
  for (const p of V.rewardPolicies(state.data?.rewards ?? ctx.rankRewards, 'noble').filter((p) => p.rank === level)) {
    const entryRow = rewardEntries(state.data?.rewards ?? ctx.rankRewards).find((r) => r.id === `noble:${level}`);
    const claimable = entryRow ? rewardClaimable(entryRow, progressionOf(state, ctx)) : false;
    const claimed = entryRow?.claim?.status === 'claimed' || p.status === 'claimed';
    for (const r of V.rewardRows(p, items)) out.push({ ...r, desc: `مكافأة رتبة N${level} — تُستلم مرة وحدة.`, open, claimId: claimable ? `noble:${level}` : null, claimed });
  }
  // R56: مؤثرات نوبل التلقائية بالغرف (لون الاسم، فقاعة الدردشة، هالة المقعد)
  for (const e of PERK_EFFECTS.noble.filter((e) => e.rank === level)) out.push({ name: e.name, sub: effectKindLabel(e.kind), art: effectArt(e), desc: `${e.desc} يشتغل تلقائيًا بدون استلام.`, open });
  for (const item of items.filter((i) => i.minNoble === level && i.status !== 'hidden')) out.push({ name: V.SLOT_LABEL[item.slot] || 'عنصر حصري', sub: item.name, art: V.itemArt(item), video: item.slot === 'entrance', desc: `عنصر من المتجر يتطلب رتبة N${level} للشراء والتجهيز.`, open: item.eligibility ? item.eligibility.eligible === true : open, link: '#/shop', linkText: 'عرض في المتجر' });
  return out.map((p) => ({ ...p, stateText: p.claimed ? 'تم استلامها' : p.open ? 'مفتوح لك' : `يفتح عند N${level}` }));
}
function cardHTML(state, ctx) {
  const { entry, season } = nobleEntry(state, ctx);
  let view = R.rankState(entry, 'noble');
  const catalogue = catalogueOf(state.data);
  const meta = catalogue.find((row) => row.rank === view.rank);
  if (view.state === 'earned' && view.rank > 5 && !meta?.configured) view = { state: 'invalid', rank: null, text: 'هذه الرتبة لم تعتمد في الكتالوج بعد' };
  const model = view.state === 'invalid' ? { valid: false } : R.progressModel(entry, 'noble');
  const earned = view.state === 'earned';
  const label = earned ? `N${view.rank}` : '';
  const face = typeof ctx.avatarHTML === 'function' ? (() => { try { const h = ctx.avatarHTML.length >= 2 ? ctx.avatarHTML(ctx.me, 72) : ctx.avatarHTML(72); return typeof h === 'string' ? h : ''; } catch { return ''; } })() : '';
  const end = season?.active === true ? R.timestamp(season.endsAt) : null;
  const points = ['earned', 'unranked'].includes(view.state) ? entry?.points : null;
  const status = !model.valid ? esc(view.text) : model.capped ? `الحالي ${label}، وصلت أعلى رتبة معتمدة.` : earned ? `الحالي ${label}، لا يزال بحاجة إلى ${V.short(model.remaining)} للوصول إلى N${model.next}.` : `لا رتبة بعد، تحتاج ${V.short(model.remaining)} للوصول إلى N1.`;
  const active = catalogue.filter((r) => r.configured);
  const rail = catalogue.map((r) => `<span class="${earned && r.rank === view.rank ? 'is-current' : ''}${r.configured ? '' : ' is-off'}" dir="ltr">N${r.rank}</span>`).join('');
  const vals = ['<span dir="ltr">0</span>', ...catalogue.map((r) => `<span dir="ltr">${r.configured ? V.short(r.threshold) : '—'}</span>`)].join('');
  // الامتلاء: من بداية الشريط (0) حتى موضع النقاط بين الحدود المعتمدة
  let fill = 0;
  if (nat(points) && active.length) {
    const stops = [0, ...catalogue.map((r) => r.threshold)];
    let k = 0; while (k < 9 && nat(stops[k + 1]) && points >= stops[k + 1]) k++;
    const lo = stops[k], hi = nat(stops[k + 1]) ? stops[k + 1] : null;
    fill = ((k + (hi && hi > lo ? (points - lo) / (hi - lo) : 0)) / 9) * 100 + 100 / 18;
    fill = Math.max(0, Math.min(100, fill));
  }
  return `<section class="nx-card" aria-label="بطاقة نوبل"><span class="nx-corner a" aria-hidden="true"></span><span class="nx-corner b" aria-hidden="true"></span>
    <div class="nx-card-top"><span class="nx-face">${face || V.hex('person')}${earned ? `<em dir="ltr">${label}</em>` : ''}</span>
      <div class="nx-card-id">${earned ? `${view.rank >= 1 && view.rank <= 9 ? `<span class="nx-chip has-art58" dir="ltr"><img class="art58-chip" src="/assets/art58/chips/n${view.rank}.webp?v=r58o" alt="" decoding="async"><b class="art58-chip-tx">${label}</b></span>` : `<span class="nx-chip" dir="ltr">${V.glyph('crown')}${label}</span>`}` : ''}${meta?.configured && earned ? `<b>${esc(meta.name)}</b>` : ''}${end ? `<small>صالحة حتى : <bdi dir="ltr">${esc(V.dateLine(end).split(' ')[1].replaceAll('/', '.'))}</bdi></small>` : ''}<strong><bdi dir="ltr">${V.num(points)}</bdi> نقطة ${season?.active === true && typeof season.name === 'string' ? `في ${esc(season.name)}` : 'نوبل'}</strong></div>
      <span class="nx-card-badge${earned ? '' : ' is-dim'}">${noblePic(earned ? view.rank : 1, earned ? meta : catalogue[0])}</span></div>
    <p class="nx-status">${status}</p>
    <div class="nx-rail" aria-hidden="true"><div class="nx-rail-names">${rail}</div><div class="nx-rail-track"><i style="width:${fill.toFixed(1)}%"></i>${catalogue.map(() => '<b></b>').join('')}</div><div class="nx-rail-vals">${vals}</div></div>
    <p class="nx-foot">${end ? `ينتهي ${esc(typeof season.name === 'string' ? season.name : 'الموسم')} بعد ${R.clockHTML(end, 'الوقت المتبقي للموسم')}` : 'التقدم تراكمي — ما فيه موسم نشط حالياً.'}</p>
  </section>
  <aside class="nx-rules">تكسب نقاط نوبل من المباريات اللي تكملها وتفوز فيها، ويحسبها الخادم بعد تأكيد النتيجة. ترتقي رتبتك تلقائياً لما توصل حد الرتبة التالية${active.length ? ` (${active.length} رتب مفعّلة)` : ''}. ${season ? `${esc(typeof season.name === 'string' ? season.name : 'الموسم')}: النقاط تنحسب ضمن مدة الموسم.` : ''} المظاهر ما تعطي أفضلية بنتائج الألعاب.</aside>`;
}
function privilegesHTML(state, ctx) {
  const catalogue = catalogueOf(state.data);
  const { entry } = nobleEntry(state, ctx);
  const view = R.rankState(entry, 'noble');
  const level = state.selected ?? (view.state === 'earned' ? view.rank : 1);
  const row = catalogue[level - 1];
  const perks = noblePerks(state, ctx, level);
  const tabs = catalogue.map((r) => `<button type="button" role="tab" class="${r.rank === level ? 'is-on' : ''}${r.configured ? '' : ' is-off'}" data-lbr-action="tier" data-lbr-tier="${r.rank}" aria-selected="${r.rank === level}" dir="ltr">N${r.rank}</button>`).join('');
  return `<section class="nx-privs"><h2 class="nx-heading"><i aria-hidden="true"></i><span>امتيازات نوبل</span><i aria-hidden="true"></i></h2>
    <div class="nx-tabs" role="tablist" aria-label="مستويات نوبل">${tabs}</div>
    <p class="nx-level-note">${row?.configured ? `${esc(row.name)} · يفتح عند ${V.num(row.threshold)} نقطة${row.rarity ? ` · ${esc(row.rarity)}` : ''}` : `رتبة N${level} غير مفعّلة بعد — حدها واسمها بانتظار اعتماد الإدارة.`}</p>
    <div class="vn-grid nx-grid">${perks.map((p, i) => V.perkCardHTML(p, i, 'nx-perk')).join('')}</div></section>`;
}
function sheetFor(state, ctx) {
  if (state.sheet === 'perk') {
    const level = state.selected ?? (R.rankState(nobleEntry(state, ctx).entry, 'noble').rank || 1);
    const p = noblePerks(state, ctx, level)[state.perk];
    if (!p) return null;
    const claim = p.claimId && R.canWrite(ctx) ? `<button class="vn-gold-btn" type="button" data-lbr-action="claim" data-lbr-id="${esc(p.claimId)}" ${state.busy ? 'disabled' : ''}>${state.busy === p.claimId ? 'جاري الحفظ…' : 'استلام المكافأة'}</button>` : '';
    return { title: p.name, body: V.perkSheetBody(p, claim + (state.error ? `<p class="vn-error" role="alert">${esc(state.error)}</p>` : '') + (state.notice ? `<p class="vn-note">${esc(state.notice)}</p>` : '')) };
  }
  if (state.sheet === 'help') {
    const rows = catalogueOf(state.data).map((r) => `<li><span dir="ltr">N${r.rank}</span><b>${r.configured ? esc(r.name) : 'غير مفعّلة'}</b><small>${r.configured ? `${V.num(r.threshold)} نقطة` : '—'}</small></li>`).join('');
    return { title: 'عن مركز نوبل', body: `<p class="vn-note">رتب نوبل تسع مستويات (N1 إلى N9). الحدود والأسماء من إعدادات الخادم المعتمدة، والنقاط تنحسب من المباريات المؤكدة فقط.</p><ul class="vn-list nx-tiers">${rows}</ul><p class="vn-note">الشحن ما يغيّر فرص الفوز، والمظاهر شكلية فقط.</p>` };
  }
  if (state.sheet === 'history') {
    const recs = list(progressionOf(state, ctx)?.records).filter((r) => obj(r) && r.system === 'noble');
    return { title: 'سجل نقاط نوبل', body: recs.length ? `<ul class="vn-list">${recs.map((r) => `<li><b dir="ltr">+${V.num(r.points)}</b><span>${esc(typeof r.reason === 'string' && r.reason ? r.reason : r.kind === 'game' ? 'مباراة' : 'نقاط نوبل')}</span><small>${esc(R.dateText(r.ts))}</small></li>`).join('')}</ul>` : '<p class="vn-empty">ما فيه نقاط نوبل مسجلة بعد. العب مباريات وكملها عشان تبدأ تجمع.</p>' };
  }
  return null;
}
function standingsDark(state, ctx) {
  if (!state.standings) return `<p class="vn-empty">${state.boardLoading ? 'جاري تحميل ترتيب اللاعبين…' : esc(state.boardError || 'الترتيب يأتي من النتائج الفعلية على الخادم.')}</p>`;
  const rows = state.standings.list;
  return rows.length ? `<ol class="nx-board">${rows.map((row) => {
    const local = R.safeImageURL(row.avatar);
    const avatar = local ? `<img src="${esc(local)}" alt="" width="44" height="44" loading="lazy">` : typeof row.avatar === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(row.avatar) ? mini(row.avatar, 44) || V.hex('person') : V.hex('person');
    const tier = typeof row.rankName === 'string' && row.rankName ? row.rankName : (typeof row.noble === 'string' ? row.noble : '');
    return `<li><a href="#/u/${esc(encodeURIComponent(row.id))}" aria-label="عرض ملف ${esc(row.name)}"><span class="nx-place" dir="ltr">${V.num(row.place)}</span><span class="nx-av">${avatar}</span><span class="nx-name"><b>${esc(row.name)}</b>${tier ? `<small dir="ltr">${esc(tier)}</small>` : ''}</span><span class="nx-pts" dir="ltr">${V.short(row.points)}</span></a></li>`;
  }).join('')}</ol>` : '<p class="vn-empty">لا توجد نتائج لهذا الترتيب بعد.</p>';
}
function initial(ctx) { return { data: obj(ctx.rankVip) ? ctx.rankVip : null, tab: 'mine', selected: null, standings: validStandings(ctx.rankStandings) ? ctx.rankStandings : null, boardLoading: false, boardError: '', loading: false, busy: '', error: '', notice: '', sheet: null, perk: null, shop: null }; }
function bodyHTML(state, ctx) {
  const top = V.topbarHTML(ctx, 'مركز نوبل', `<button class="vn-icon-btn" type="button" data-vn-action="history" aria-label="سجل نقاط نوبل">${V.glyph('history')}</button><button class="vn-icon-btn" type="button" data-vn-action="help" aria-label="عن مركز نوبل">${V.glyph('help')}</button>`);
  if (!R.accountId(ctx)) return `${top}<div class="vn-login">${R.loginHTML()}</div>`;
  const tabs = `<div class="nx-switch-wrap"><div class="nx-switch" role="tablist" aria-label="عرض نوبل"><button type="button" role="tab" data-lbr-action="tab" data-lbr-tab="mine" aria-selected="${state.tab === 'mine'}" class="${state.tab === 'mine' ? 'is-on' : ''}">الخاص بي</button><button type="button" role="tab" data-lbr-action="tab" data-lbr-tab="ranking" aria-selected="${state.tab === 'ranking'}" class="${state.tab === 'ranking' ? 'is-on' : ''}">الترتيب</button></div></div>`;
  const msg = state.loading && !state.data ? '<p class="vn-note" role="status">جاري التحديث من الخادم…</p>' : state.error && !state.sheet ? `<p class="vn-error" role="alert">${esc(state.error)}</p>` : '';
  const body = state.tab === 'mine' ? `${cardHTML(state, ctx)}${privilegesHTML(state, ctx)}` : `<section class="nx-ranking"><div class="nx-ranking-head"><h2>ترتيب اللاعبين</h2><button class="vn-icon-btn" type="button" data-lbr-action="standings" aria-label="تحديث الترتيب" ${state.boardLoading || !R.canRead(ctx) ? 'disabled' : ''}>${V.glyph('history')}</button></div>${standingsDark(state, ctx)}</section>`;
  return `${top}${tabs}${msg}${body}<div class="nx-dock-space" aria-hidden="true"></div><div class="nx-dock"><a class="vn-gold-btn nx-cta" href="#/games"><span class="nx-spark a" aria-hidden="true"></span>العب واحصل على نقاط نوبل<span class="nx-spark b" aria-hidden="true"></span></a></div>${V.sheetHTML(sheetFor(state, ctx))}`;
}
export function render(ctx = {}) { return `<div class="lbrv-page lbr-page vn-page nx-page" data-lb-page="ranks" dir="rtl">${bodyHTML(initial(ctx), ctx)}</div>`; }
export function mount(root, ctx = {}) {
  const state = initial(ctx);
  const life = R.lifecycle(root, ctx, 'ranks', () => bodyHTML(state, ctx));
  async function load() {
    if (!life.current() || !R.canRead(ctx) || !R.accountId(ctx) || state.busy) return;
    const version = life.next();
    state.loading = true; state.error = ''; life.paint();
    try {
      const data = await R.call(ctx, '/api/rank-vip');
      if (!life.current(version)) return;
      if (!obj(data.progression) || !Array.isArray(data.catalog)) throw new Error('Invalid rank payload');
      state.data = data;
      if (!obj(data.rewards)) {
        const rewards = await R.call(ctx, '/api/rank-rewards');
        if (!life.current(version)) return;
        state.data = { ...data, rewards };
      }
    } catch (error) { if (life.current(version)) state.error = R.errorText(error); }
    finally { if (life.current(version)) { state.loading = false; life.paint(); } }
  }
  let boardGeneration = 0;
  async function loadStandings() {
    if (!life.current() || !R.canRead(ctx) || state.boardLoading) return;
    const version = ++boardGeneration;
    state.boardLoading = true; state.boardError = ''; life.paint();
    try {
      const data = await R.call(ctx, '/api/rank-vip/standings');
      if (!life.current() || version !== boardGeneration) return;
      if (!validStandings(data)) throw new Error('Invalid standings');
      state.standings = data;
    } catch (error) { if (life.current() && version === boardGeneration) { state.standings = null; state.boardError = R.errorText(error); } }
    finally { if (life.current() && version === boardGeneration) { state.boardLoading = false; life.paint(); } }
  }
  async function claim(id) {
    if (!life.current() || state.loading || state.busy || !R.canWrite(ctx)) return;
    const row = rewardEntries(state.data?.rewards ?? ctx.rankRewards).find(row => row.id === id);
    if (!row || !rewardClaimable(row, progressionOf(state, ctx))) return;
    const version = life.next();
    const fp = row.claim?.status === 'pending' ? row.claim.fingerprint : row.policy?.fingerprint;
    state.busy = id; state.error = ''; state.notice = ''; life.paint();
    try {
      const result = await R.call(ctx, `/api/rank-rewards/${encodeURIComponent(id)}/claim`, 'POST', { fingerprint: fp });
      if (!life.current(version)) return;
      if (result.status !== 'claimed') throw new Error('Claim not saved');
      state.notice = result.dup === true ? 'هذه المكافأة مستلمة مسبقًا؛ لم تُمنح مرة ثانية.' : 'تم حفظ استلام مكافأتك في سجل حسابك.';
      // Invalidate the button before reading the saved data. Never project a grant or balance.
      const receipt = { ...row.policy, ...result, status: 'claimed' };
      const rewards = state.data?.rewards ?? ctx.rankRewards ?? {};
      state.data = { ...(state.data ?? {}), rewards: { ...rewards, claims: [...list(rewards.claims).filter(c => `${c.system}:${c.rank}` !== id), receipt] } };
      const updated = await R.call(ctx, '/api/rank-vip');
      if (!life.current(version)) return;
      if (obj(updated.progression) && Array.isArray(updated.catalog)) state.data = updated;
      if (typeof ctx.refreshMe === 'function') { await ctx.refreshMe(); if (!life.current(version)) return; }
    } catch (error) { if (life.current(version)) state.error = R.errorText(error); }
    finally { if (life.current(version)) { state.busy = ''; life.paint(); } }
  }
  async function loadExtras() {
    await V.loadShop(state, ctx);
    if (life.current() && !state.busy) life.paint();
  }
  life.on('click', event => {
    const vn = event.target?.closest?.('[data-vn-action]');
    if (vn && life.page?.contains?.(vn) && !vn.disabled && life.current()) {
      const act = vn.dataset.vnAction;
      if (act === 'close') { state.sheet = null; state.error = ''; state.notice = ''; life.paint(); return; }
      if (act === 'help' || act === 'history') { state.sheet = act; life.paint(); V.focusSheet(life.page); return; }
      if (act === 'perk') { const n = Number(vn.dataset.vnPerk); if (Number.isSafeInteger(n) && n >= 0) { state.sheet = 'perk'; state.perk = n; life.paint(); V.focusSheet(life.page); } return; }
    }
    const button = event.target?.closest?.('[data-lbr-action]');
    if (!button || !life.page?.contains?.(button) || button.disabled || !life.current()) return;
    const action = button.dataset.lbrAction;
    if (action === 'refresh') void load();
    else if (action === 'standings') void loadStandings();
    else if (action === 'claim') void claim(button.dataset.lbrId);
    else if (action === 'tier') { const rank = Number(button.dataset.lbrTier); if (nat(rank) && rank >= 1 && rank <= 9) { state.selected = rank; life.paint(); life.page.querySelector?.(`[data-lbr-tier="${rank}"]`)?.focus?.({ preventScroll: true }); } }
    else if (action === 'tab' && ['mine', 'ranking'].includes(button.dataset.lbrTab)) {
      state.tab = button.dataset.lbrTab; life.paint();
      life.page.querySelector?.(`[data-lbr-tab="${state.tab}"]`)?.focus?.({ preventScroll: true });
      if (state.tab === 'ranking' && !state.standings) void loadStandings();
    }
  });
  life.on('keydown', event => { if (event.key === 'Escape' && state.sheet && life.current()) { state.sheet = null; life.paint(); } });
  life.paint(); if (!state.data) void load(); void loadExtras();
  return { destroy() { boardGeneration++; life.destroy(); state.data = null; state.standings = null; state.busy = ''; },
    update(next = {}) { if (!life.current() || state.busy) return; if (obj(next.rankVip)) { state.data = next.rankVip; life.next(); state.loading = false; } if (obj(next.me)) ctx.me = next.me; if (validStandings(next.rankStandings)) state.standings = next.rankStandings; life.paint(); }, reload: load };
}
