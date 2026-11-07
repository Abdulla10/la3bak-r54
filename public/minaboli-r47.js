/* R47 original property-board renderer. No RNG, wallet, rules simulation or local balance. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('ar-EG') : '—';
const nameOf = (room, id) => room.players?.find((p) => p.id === id)?.name ?? 'لاعب غادر';
const context = (r) => JSON.stringify([r.code, r.gameNo ?? 0, r.you]);
const contexts = new Map();
const validRoom = (r) => r?.game?.game === 'minaboli' && Array.isArray(r.game.board) && Array.isArray(r.game.players);
const phaseName = { roll: 'رمي الحركة', buy: 'قرار الشراء', manage: 'إدارة الأملاك', debt: 'تسوية مستحقات', jail: 'التوقيف', final: 'نهاية المباراة' };
const sameAction = (a, b) => a?.type === b?.type && (!Object.hasOwn(b, 'tile') || a.tile === b.tile);
function button(room, move, pending) {
  const a = { ...move.action, ver: room.game.ver };
  return `<button type="button" class="mn-move btn${a.type === 'end' ? ' ghost' : ''}" data-act="play" data-a="${esc(JSON.stringify(a))}" data-mn-context="${esc(context(room))}" data-mn-ver="${room.game.ver}" ${pending ? 'disabled' : ''}>${esc(move.label)}${move.cost !== undefined ? `<small>−${num(move.cost)}</small>` : move.gain !== undefined ? `<small>+${num(move.gain)}</small>` : ''}</button>`;
}
function coordinates(i) {
  if (i <= 6) return [1, i + 1];
  if (i <= 12) return [i - 5, 7];
  if (i <= 18) return [7, 19 - i];
  return [25 - i, 1];
}
const mark = (n) => `<svg class="mn-marker mn-seat-${n}" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V10L12 3l9 7v11H3Z" fill="currentColor"/><path d="M9 21v-8h6v8" fill="none" stroke="var(--mn-ivory)" stroke-width="2"/></svg>`;
export const tileIcon = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="4" width="56" height="56" rx="12" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 44V26l17-12 17 12v18H15Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M26 44V31h12v13M4 16h10M4 48h10M50 16h10M50 48h10" fill="none" stroke="currentColor" stroke-width="3"/></svg>`;
function tileHtml(room, t) {
  const g = room.game, [row, col] = coordinates(t.id);
  const tokens = g.players.map((id, i) => !g.out[i] && g.positions[i] === t.id
    ? `<span class="mn-token mn-seat-${i}" title="${esc(nameOf(room, id))}" aria-label="${esc(nameOf(room, id))}، المقعد ${num(i + 1)}">${num(i + 1)}</span>` : '').join('');
  const owner = t.owner === null ? 'للبنك' : `م${num(t.owner + 1)}`;
  return `<li class="mn-tile ${t.kind === 'property' ? `mn-district-${t.group % 2}` : 'mn-special'} ${t.mortgaged ? 'mn-mortgaged' : ''}" style="grid-row:${row};grid-column:${col}" data-mn-tile="${t.id}" aria-label="${esc(t.name)}${t.kind === 'property' ? `، ${esc(owner)}، السعر ${num(t.price)}، الإيجار ${num(t.rentDue)}${t.mortgaged ? '، مرهون' : ''}` : ''}">
    <span class="mn-tile-no">${num(t.id + 1)}</span><b>${esc(t.name)}</b>
    ${t.kind === 'property' ? `<small>${num(t.price)} · ${esc(owner)}</small><span class="mn-deed">${t.mortgaged ? 'مرهون' : t.buildings ? `▰ ×${num(t.buildings)}` : `إيجار ${num(t.rentDue)}`}</span>` : `<small>${t.kind === 'tax' ? num(t.amount) : t.kind === 'goJail' ? 'إلى التوقيف' : t.kind === 'chance' ? 'قرار خادمي' : ''}</small>`}
    <span class="mn-tokens">${tokens}</span></li>`;
}
function rules(g) {
  return `<details class="mn-rules"><summary>قواعد مينابولي الأصلية والمهلة</summary><p>لوحة أصلية من ٢٤ خانة، ٢–٤ مقاعد وبوتات. تبدأ بـ${num(g.rules?.startCash)} من نقود المباراة فقط، ولا شراء أو تحويل بينها وبين Coins/Gems. عبور البداية يمنح ${num(g.rules?.startBonus)}. لا مزاد أملاك أو تجارة أو تحويل يدوي.</p>
    <p>النرد للحركة داخل المباراة فقط ولا دور إضافي للزوج المتساوي. خانتا الرسائل: +٦٠، أو دفع ٥٠، أو العودة للبداية مع مكافأتها، أو التوقيف؛ يختار الخادم. الشراء اختياري، والرفض يعيد الملك للبنك. امتلاك زوج الحي غير المرهون يضاعف إيجاره دون بناء؛ البناء يرفع الإيجار إلى ٣/٦/١٠ أضعاف الإيجار الأساسي.</p>
    <p>البناء بالتساوي بعد امتلاك الحي كاملًا، حتى ${num(g.rules?.maxBuildings)} مبانٍ لكل ملك. البيع بالتساوي بنصف تكلفة البناء. الرهن بنصف سعر الملك بعد بيع مباني الحي؛ لا إيجار للملك المرهون. فك الرهن بـ١١٠٪ من قيمة الرهن. لا بناء على حي فيه رهن.</p>
    <p>التوقيف: ادفع ${num(g.rules?.jailFine)} أو حاول زوجًا متساويًا؛ المحاولة الثالثة الفاشلة تلزم بالكفالة ثم الحركة. يستمر إيجار أملاكك أثناء التوقيف. عند الدين بع مبانيك أو ارهن حتى يسدده الخادم تلقائيًا. إذا لم تكفِ قيمة التصفية تُفلس: المتاح للدائن والأملاك تعود للبنك.</p>
    <p>الدور كاملًا ${num(g.turnMs / 1000)} ثانية ولا تتجدد المهلة بالأزرار. المهلة: حركة آلية ثم رفض الشراء وتصفية الدين وإنهاء الدور؛ ثلاث مهلات متتالية انسحاب. إنهاء دور يدوي يصفّر عداد المهلات. آخر لاعب يفوز، أو بعد ${num(g.maxTurns)} دورًا مكتملًا يُحسم الأعلى بصافي الأصول: النقد + سعر الأرض (نصفه للمرهون) + تكلفة البناء؛ التعادل مشترك. الانسحاب يصفر أصول اللاعب ويعيد أملاكه للبنك.</p></details>`;
}
export function html(room, options = {}) {
  if (!validRoom(room)) return '<section class="mn-game" dir="rtl" role="status">بانتظار حالة مينابولي من الخادم.</section>';
  const g = room.game, ctx = context(room), local = contexts.get(ctx), pending = options.pending ?? !!(local?.ver === g.ver && local?.pending);
  const final = g.phase === 'final', mine = g.turnId === room.you;
  const status = final ? (g.winners.length ? `الفائز${g.winners.length > 1 ? 'ون' : ''}: ${g.winners.map((id) => nameOf(room, id)).join('، ')}` : 'انتهت المباراة دون فائز')
    : `${mine ? 'دورك' : `دور ${nameOf(room, g.turnId)}`} · ${phaseName[g.phase] ?? ''}`;
  const seats = g.players.map((id, i) => `<li class="mn-player mn-seat-${i}${!final && g.turnId === id ? ' mn-turn' : ''}${g.out[i] ? ' mn-out' : ''}">${mark(i)}<span><b>${esc(id === room.you ? 'أنت' : nameOf(room, id))}</b><small>مقعد ${num(i + 1)}${g.bots?.[i] ? ' · بوت' : ''}${g.out[i] ? ' · خارج المباراة' : g.jailed[i] ? ` · موقوف (${num(g.jailTurns[i])}/٣)` : ''}</small></span><dl><div><dt>النقد</dt><dd>${num(g.cash[i])}</dd></div><div><dt>الأصول</dt><dd>${num(g.assets[i])}</dd></div></dl></li>`).join('');
  const debt = g.pending?.kind === 'debt' ? `<p class="mn-debt" role="status">مستحقات ${num(g.pending.amount)} · ${esc(g.pending.reason)} · ${g.pending.creditor === null ? 'للبنك' : esc(nameOf(room, g.players[g.pending.creditor]))}. بع مباني أو ارهن؛ السداد تلقائي. لا يمكنك إنهاء الدور قبل التسوية.</p>` : '';
  const decision = g.pending?.kind === 'buy' ? `<p>معروض للشراء: ${esc(g.board[g.pending.tile]?.name)} · ${num(g.board[g.pending.tile]?.price)}</p>` : '';
  const moves = (g.moves ?? []).map((m) => button(room, m, pending)).join('');
  return `<section class="mn-game" dir="rtl" data-mn-context="${esc(ctx)}" data-mn-version="${g.ver}" aria-busy="${pending}">
    <header class="mn-header"><span class="mn-logo">${tileIcon}</span><div><h2>مينابولي</h2><p>أملاك أصلية · نقود المباراة ليست المحفظة</p></div><span class="mn-turn-count">الدور ${num(Math.min(g.completedTurns + 1, g.maxTurns))} / ${num(g.maxTurns)}</span></header>
    <p class="mn-status" role="status" aria-live="polite">${esc(status)}${pending ? ' · جارٍ إرسال الحركة…' : ''}</p>
    <ul class="mn-players" aria-label="معلومات اللاعبين">${seats}</ul>
    <div class="mn-board-wrap"><ol class="mn-board" aria-label="لوحة مينابولي الأصلية: ٢٤ خانة">${g.board.map((t) => tileHtml(room, t)).join('')}<li class="mn-center"><span class="mn-logo">${tileIcon}</span><b>مينابولي</b><small>${esc(phaseName[g.phase])}</small><span>الحركة ${g.lastRoll ? g.lastRoll.map(num).join(' + ') : '—'}</span>${final ? `<strong>${g.endReason === 'turnLimit' ? 'حسم صافي الأصول' : 'آخر لاعب'}</strong>` : `<span class="mn-deadline jx-clock" role="timer" data-ends="${g.endsAt}" data-total="${g.turnMs}">باقي <b class="jx-sec">${num(Math.max(0, Math.ceil((g.endsAt - g.serverNow) / 1000)))}</b> ث</span>`}</li></ol></div>
    <section class="mn-controls" aria-label="الحركات القانونية من الخادم">${debt}${decision}<div class="mn-moves">${moves}</div>${!final && !moves ? `<p>${mine ? 'بانتظار تحديث الخادم أو انتهاء المهلة.' : 'بانتظار اللاعب صاحب الدور.'}</p>` : ''}<p class="mn-error" role="alert"></p></section>
    ${rules(g)}<footer class="mn-footer">${g.canSurrender ? button(room, { action: { type: 'surrender' }, label: 'انسحاب من المباراة' }, pending) : ''}${final && room.hostId === room.you ? '<button class="btn" type="button" data-act="rematch">مباراة جديدة</button>' : ''}<button type="button" class="btn ghost" data-act="leave">خروج من الغرفة</button></footer>
  </section>`;
}
export const minaboli = html;
/** Parent calls after its normal render. No listener/timer/services are created. Returns a scoped disposer. */
export function mount(root, room) {
  if (!root || !validRoom(room)) return () => {};
  const ctx = context(room), previous = contexts.get(ctx);
  const current = { root, ver: room.game.ver, pending: previous?.ver === room.game.ver ? previous.pending : null };
  contexts.set(ctx, current);
  // Bound stale renderer contexts without leaking room history.
  if (contexts.size > 8) contexts.delete(contexts.keys().next().value);
  root.querySelectorAll?.('.mn-game button[data-act="play"]').forEach((b) => { b.disabled = !!current.pending; });
  return () => { if (contexts.get(ctx) === current) contexts.delete(ctx); };
}
/** Validate the stamped DOM command against the CURRENT server view. No guessed/optimistic moves. */
export function action(element, room) {
  if (!validRoom(room) || element?.disabled || element?.dataset?.mnContext !== context(room) || Number(element.dataset.mnVer) !== room.game.ver) return null;
  const local = contexts.get(context(room));
  if (local?.pending) return null;
  let a;
  try { a = JSON.parse(element.dataset.a); } catch { return null; }
  if (!a || a.ver !== room.game.ver || (a.type === 'surrender' ? !room.game.canSurrender : !(room.game.moves ?? []).some((m) => sameAction(a, m.action)))) return null;
  const allowed = 'tile' in a ? ['type', 'ver', 'tile'] : ['type', 'ver'];
  if (Object.keys(a).some((k) => !allowed.includes(k))) return null;
  return { code: room.code, ver: room.game.ver, action: a };
}
/** Existing parent's play handler may use these to disable all commands until its request resolves. */
export function beginAction(room) {
  if (!validRoom(room)) return null;
  const ctx = context(room), local = contexts.get(ctx);
  if (!local || local.pending || local.ver !== room.game.ver) return null;
  const token = { context: ctx, ver: room.game.ver };
  local.pending = token;
  local.root.querySelectorAll?.('.mn-game button[data-act="play"]').forEach((b) => { b.disabled = true; });
  const status = local.root.querySelector?.('.mn-status');
  if (status) status.textContent += ' · جارٍ إرسال الحركة…';
  return token;
}
export function finishAction(token, room, error = '') {
  if (!token || !validRoom(room) || token.context !== context(room)) return false;
  const local = contexts.get(token.context);
  if (!local || local.pending !== token) return false;
  local.pending = null;
  if (local.ver === room.game.ver) local.root.querySelectorAll?.('.mn-game button[data-act="play"]').forEach((b) => { b.disabled = false; });
  const status = local.root.querySelector?.('.mn-status');
  if (status) status.textContent = status.textContent.replace(' · جارٍ إرسال الحركة…', '');
  const alert = local.root.querySelector?.('.mn-error');
  if (alert) alert.textContent = error;
  return true;
}
