/* Rooms-only integration. No accounts, wallet logic, demo data or new data source. */
import {renderProfileIcon} from '../preview/assets/profile/ui-icons-inline.js?v=emerald-r44';
const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
const STATUS = { lobby: 'تنتظر اللاعبين', playing: 'اللعب شغّال', finished: 'انتهت الجولة' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const codeOf = (value) => String(value ?? '').replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).toUpperCase().replace(/[\s\-_]/g, '');
const values = (data) => data instanceof Map ? [...data.values()] : Array.isArray(data) ? data : null;
const icon = (name) => renderProfileIcon(name);
const knownGames = (ctx) => (values(ctx.games) || []).filter((g) => g && typeof g.id === 'string' && g.status === 'available' && Number.isInteger(g.minPlayers) && Number.isInteger(g.maxPlayers) && g.minPlayers >= 1 && g.maxPlayers >= g.minPlayers);
const canRequest = (ctx) => !!ctx.user && ctx.connected === true && typeof ctx.req === 'function';
const disabled = (ctx) => canRequest(ctx) ? '' : ' disabled aria-disabled="true"';
const roomURL = (code) => `#/room/${encodeURIComponent(String(code ?? ''))}`;

function gameArt(game, ctx) {
  // This callback is supplied by the existing application, not by server data.
  if (game && typeof ctx.gameIco === 'function') {
    try {
      const art = ctx.gameIco(game);
      if (typeof art === 'string' && art.trim().startsWith('<svg') && !/\bid\s*=/.test(art)) return art;
    } catch { /* A generic existing SVG asset remains available. */ }
  }
  return '<img src="/preview/assets/profile/icon-game.svg" width="42" height="42" alt="">';
}

function roomRows(rooms, ctx) {
  const games = values(ctx.games) || [];
  return rooms.filter((r) => r && typeof r.code === 'string' && CODE_RE.test(r.code)).map((room) => {
    const game = games.find((g) => g?.id === room.gameId);
    const players = Array.isArray(room.players) ? room.players.filter((p) => p && !p.left) : null;
    const host = players?.find((p) => p.id === room.hostId || p.host);
    const seats = Number.isInteger(room.seats) ? room.seats : null;
    const mode = room.mode === 'bots' ? 'مع الكمبيوتر' : room.requiresPassword ? 'خاصة بكلمة مرور' : room.mode === 'friends' ? 'مع الأصدقاء' : 'وضع غير معروف';
    return `<article class="list-row lb-room-row" data-lb-room-status="${esc(room.status)}">
      <div class="lb-room-art" aria-hidden="true">${gameArt(game, ctx)}</div>
      <div class="grow"><h3>${esc(game?.name || 'غرفة لعب')}</h3>
        <small>${host ? `المضيف: ${esc(host.name)} · ` : ''}${esc(mode)}</small>
        <small>رمز الغرفة: <bdi class="room-code" dir="ltr">${esc(room.code)}</bdi></small>
        <span class="lb-room-state">${esc(STATUS[room.status] || 'حالة غير معروفة')}</span>
      </div>
      <span class="tag">${players && seats !== null ? `${esc(players.length)}/${esc(seats)} لاعبين` : 'المقاعد مب متوفرة'}</span>
      <a class="gold-btn" href="${esc(roomURL(room.code))}">افتح الغرفة</a>
    </article>`;
  }).join('');
}

function listBody(ctx) {
  const rows = values(ctx.rooms);
  if (ctx.roomsLoading) return '<p class="lb-room-notice" role="status">جاري تحديث غرفك من الخادم…</p>';
  if (ctx.roomsError) return `<p class="lb-room-notice lb-room-error" role="alert">${esc(ctx.roomsError)}</p><p class="hint">اضغط «تحديث» عشان تحاول مرة ثانية.</p>`;
  if (!rows) return `<p class="lb-room-notice" role="status">${ctx.connected ? 'جاري تحميل غرفك…' : 'ننتظر اتصالك بالخادم عشان نعرض غرفك.'}</p>`;
  if (!rows.length) return '<div class="lb-room-empty"><p>ما عندك غرف مفتوحة الحين.</p><small>سوّ غرفة يديدة أو ادخل برمز ربيعك.</small></div>';
  const html = roomRows(rows, ctx);
  return html || '<p class="lb-room-notice" role="alert">بيانات الغرف مب قابلة للعرض. جرّب تحديثها.</p>';
}

function creationForm(game, ctx) {
  if (!game) return '<p class="lb-room-notice">ما فيه لعبة متاحة لإنشاء غرفة الحين. الألعاب والمقاعد تظهر من كتالوج الخادم فقط.</p><a class="btn" href="#/games">شوف الألعاب</a>';
  let seats = '';
  for (let n = game.minPlayers; n <= game.maxPlayers; n += 1) seats += `<option value="${esc(n)}"${n === game.defaultSeats ? ' selected' : ''}>${n === 1 ? 'لاعب واحد (تدريب)' : `${esc(n)} مقاعد`}</option>`;
  return `<form class="form lb-room-create-form" data-form="create" data-game="${esc(game.id)}">
    <div class="grid2"><div class="field"><span class="lab">مع منو بتلعب؟</span>
      <div class="lb-room-modes">
        <input type="radio" name="mode" id="m-friends" value="friends" checked><label for="m-friends">مع الأصدقاء<small>الدخول برمز الغرفة</small></label>
        <input type="radio" name="mode" id="m-bots" value="bots"${game.supportsBots ? '' : ' disabled'}><label for="m-bots">مع الكمبيوتر<small>${game.supportsBots ? 'تدريب بدون انتظار' : 'مب متاح لهاللعبة'}</small></label>
      </div></div>
      <div class="field"><label for="seats">عدد المقاعد</label><select class="select" id="seats" name="seats">${seats}</select></div>
    </div>
    <div class="grid2"><div class="field"><label for="roomPrivacy">حماية الغرفة</label><select class="select" id="roomPrivacy" name="visibility"><option value="code">الدخول برمز فقط</option><option value="private">خاصة بكلمة مرور</option></select></div>
      <div class="field"><label for="roomPassword">كلمة المرور للغرفة الخاصة</label><input class="input" type="password" id="roomPassword" name="password" minlength="8" maxlength="128" autocomplete="new-password" placeholder="8 أحرف على الأقل"></div></div>
    <p class="hint">المقاعد وكلمة المرور يتحقق منها الخادم. طلب الإنشاء محفوظ بمفتاح يمنع تكراره عند إعادة المحاولة.</p>
    <button class="gold-btn" type="submit"${disabled(ctx)}>${icon('plus')} إنشاء الغرفة</button>
  </form>`;
}

/** Page BODY only. The parent owns all navigation, auth and wallet shell. */
export function render(ctx = {}) {
  const games = knownGames(ctx);
  const game = games.find((g) => g.id === ctx.pickGame) || games[0];
  const hero = `<section class="hero"><div class="hero-symbol">${icon('users')}</div><h1>الغرف</h1><div class="subtitle">العب ويا ربعك، سوّ غرفة أو ادخل بالرمز</div></section>`;
  if (!ctx.user) return `<div data-lb-page="rooms" dir="rtl">${hero}<section class="panel"><h2 class="panel-title">خلّنا نتعرّف عليك</h2><p>سجّل دخولك بحسابك الحالي عشان تشوف غرفك وتلعب ويا ربعك.</p><a class="gold-btn" href="#/account">تسجيل الدخول</a></section></div>`;
  return `<div data-lb-page="rooms" dir="rtl">${hero}
    <nav class="tabs lb-room-tabs" aria-label="أقسام الغرف">
      <button type="button" class="active" data-lb-room-tab="mine" aria-pressed="true">غرفي</button>
      <button type="button" data-lb-room-tab="create" aria-pressed="false">إنشاء غرفة</button>
      <button type="button" data-lb-room-tab="invite" aria-pressed="false">دعوة الأصدقاء</button>
      <button type="button" data-lb-room-tab="join" aria-pressed="false">دخول برمز</button>
    </nav>
    ${ctx.connected === true ? '' : '<p class="lb-room-notice" role="status">الاتصال بالخادم مب جاهز. الغرف المحفوظة قد تكون أقدم؛ الإنشاء والدخول يتفعّلون عقب الاتصال.</p>'}
    ${typeof ctx.req === 'function' ? '' : '<p class="lb-room-notice" role="status">عمليات الغرف تحتاج ربط مساعد الاتصال الحالي من التطبيق؛ مب متاحة في هالعرض.</p>'}
    <p class="lb-room-feedback" data-lb-room-feedback role="status" aria-live="polite"></p>
    <section class="panel" data-lb-room-panel="mine" tabindex="-1">
      <div class="panel-title"><h2>غرفي الحالية ${icon('game')}</h2><button class="btn" type="button" data-lb-room-refresh${disabled(ctx)}>تحديث</button></div>
      <div class="tabs lb-room-filters" aria-label="تصفية غرفي">
        <button type="button" class="active" data-lb-room-filter="all" aria-pressed="true">كل غرفي</button>
        <button type="button" data-lb-room-filter="lobby" aria-pressed="false">تنتظر اللاعبين</button>
        <button type="button" data-lb-room-filter="playing" aria-pressed="false">اللعب شغّال</button>
        <button type="button" data-lb-room-filter="finished" aria-pressed="false">انتهت الجولة</button>
      </div>
      <p class="hint">هذي غرفك فقط، مب دليل غرف عامة. العدد يشمل الكمبيوتر إذا كان موجود.</p>
      <div data-lb-room-list>${listBody(ctx)}</div>
      <p class="lb-room-notice" data-lb-room-filter-empty hidden>ما عندك غرف بهالحالة الحين.</p>
    </section>
    <section class="panel" data-lb-room-panel="create" tabindex="-1"><h2 class="panel-title">إنشاء غرفة يديدة ${icon('plus')}</h2>
      ${games.length ? `<div class="field"><label for="pickGame">اختر اللعبة</label><select class="select" id="pickGame" data-change="pickgame">${games.map((g) => `<option value="${esc(g.id)}"${g.id === game.id ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>` : ''}
      <div id="createBox">${ctx.gamesLoading ? '<p role="status">جاري تحميل الألعاب المتاحة…</p>' : ctx.gamesError ? `<p class="lb-room-notice lb-room-error" role="alert">${esc(ctx.gamesError)}</p>` : creationForm(game, ctx)}</div>
    </section>
    <div class="grid2 lb-room-bottom-panels">
      <section class="panel" data-lb-room-panel="join" tabindex="-1"><h2 class="panel-title">دخول برمز</h2>
        <form class="form" data-form="join"><div class="field"><label for="joinCode">رمز الغرفة</label><div class="join-row">
          <input class="input code" id="joinCode" name="code" inputmode="text" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="رمز من ٥ خانات" required aria-describedby="joinHelp">
          <button class="gold-btn" type="submit"${disabled(ctx)}>دخول</button></div>
          <label for="joinPassword">كلمة مرور الغرفة الخاصة (إن وجدت)</label><input class="input" type="password" id="joinPassword" name="password" maxlength="128" autocomplete="off">
          <p class="hint" id="joinHelp">اكتب الرمز كامل: خمس خانات من الحروف الإنجليزية والأرقام. الغرفة لازم تنتظر لاعبين وعندها مكان؛ غرف الكمبيوتر ما تقبل دخول ربعك.</p></div>
        </form>
      </section>
      <section class="panel" data-lb-room-panel="invite" tabindex="-1"><h2 class="panel-title">دعوة الأصدقاء ${icon('users')}</h2>
        <p>افتح غرفتك من القائمة فوق، واستخدم مشاركة الرمز الموجودة داخل الغرفة عشان تعزم ربعك.</p>
        <p class="hint">ما فيه إرسال دعوات مباشر من هالصفحة. الغرفة الخاصة تحتاج الرمز وكلمة المرور. دليل الغرف العامة وأنواع «احترافية» و«سريعة» مب متوفرة الحين.</p>
      </section>
    </div>
  </div>`;
}

/** Handle own events before the unchanged app's delegated form/change handlers. */
export function mount(root, ctx = {}) {
  const page = root?.matches?.('[data-lb-page="rooms"]') ? root : root?.querySelector?.('[data-lb-page="rooms"]');
  if (!page || !ctx.user) return { destroy() {} };
  const state = { ...ctx };
  let alive = true;
  let busy = false;
  let filter = 'all';
  const feedback = (message, error = false) => {
    if (!alive) return;
    const out = page.querySelector('[data-lb-room-feedback]');
    if (out) { out.textContent = String(message || ''); out.classList.toggle('lb-room-error', error); }
    if (error && typeof ctx.toast === 'function') ctx.toast(String(message), true);
  };
  const applyFilter = () => {
    const rows = [...page.querySelectorAll('[data-lb-room-status]')];
    rows.forEach((row) => { row.hidden = filter !== 'all' && row.dataset.lbRoomStatus !== filter; });
    page.querySelectorAll('[data-lb-room-filter]').forEach((button) => {
      const active = button.dataset.lbRoomFilter === filter;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    });
    const empty = page.querySelector('[data-lb-room-filter-empty]');
    if (empty) empty.hidden = !rows.length || rows.some((row) => !row.hidden);
  };
  const paintList = () => {
    if (!alive) return;
    const list = page.querySelector('[data-lb-room-list]');
    if (list) list.innerHTML = listBody(state);
    applyFilter();
  };
  const saveRoom = (room) => {
    // Store only the actual server snapshot; the room route still has its own join fallback.
    if (ctx.rooms instanceof Map) ctx.rooms.set(room.code, room);
    else if (Array.isArray(ctx.rooms)) {
      const index = ctx.rooms.findIndex((r) => r?.code === room.code);
      if (index < 0) ctx.rooms.push(room); else ctx.rooms[index] = room;
    }
  };
  const loadRooms = async () => {
    if (!alive || !canRequest(state) || state.roomsLoading) return;
    state.roomsLoading = true; state.roomsError = ''; paintList();
    const button = page.querySelector('[data-lb-room-refresh]');
    if (button) button.disabled = true;
    try {
      const result = await ctx.req('room:mine', {});
      if (!result?.ok || !Array.isArray(result.rooms)) throw Error(result?.error || 'ما قدرنا نحمّل غرفك. جرّب مرة ثانية.');
      if (!alive) return;
      state.rooms = result.rooms;
    } catch (error) {
      if (alive) state.roomsError = error?.message || 'ما قدرنا نتصل بالخادم.';
    } finally {
      if (alive) { state.roomsLoading = false; if (button) button.disabled = !canRequest(state); paintList(); }
    }
  };
  const onClick = (event) => {
    const button = event.target?.closest?.('button');
    if (!button || !page.contains(button)) return;
    if (button.hasAttribute('data-lb-room-refresh')) { event.preventDefault(); void loadRooms(); return; }
    if (button.dataset.lbRoomFilter) { filter = button.dataset.lbRoomFilter; applyFilter(); return; }
    if (button.dataset.lbRoomTab) {
      page.querySelectorAll('[data-lb-room-tab]').forEach((tab) => {
        const active = tab === button; tab.classList.toggle('active', active); tab.setAttribute('aria-pressed', String(active));
      });
      const target = [...page.querySelectorAll('[data-lb-room-panel]')].find((panel) => panel.dataset.lbRoomPanel === button.dataset.lbRoomTab);
      target?.scrollIntoView?.({ block: 'start', behavior: 'auto' }); target?.focus?.({ preventScroll: true });
    }
  };
  const onChange = (event) => {
    const select = event.target;
    if (!select?.matches?.('[data-change="pickgame"]')) return;
    event.stopPropagation();
    const game = knownGames(state).find((g) => g.id === select.value);
    const box = page.querySelector('#createBox');
    if (box) box.innerHTML = creationForm(game, state);
    state.pickGame = game?.id;
  };
  const onSubmit = async (event) => {
    const form = event.target;
    if (!form?.matches?.('form[data-form="create"],form[data-form="join"]')) return;
    event.preventDefault(); event.stopPropagation();
    if (busy) return;
    if (!canRequest(state)) { feedback('الاتصال مب جاهز. انتظر شوي وجرّب مرة ثانية.', true); return; }
    const joining = form.dataset.form === 'join';
    let body;
    if (joining) {
      const code = codeOf(form.elements.namedItem('code')?.value);
      if (!CODE_RE.test(code)) { feedback('الرمز مب صحيح. تأكّد من خمس خانات من الحروف الإنجليزية والأرقام.', true); return; }
      body = { code, password:form.elements.namedItem('password')?.value||undefined };
    } else {
      const game = knownGames(state).find((g) => g.id === form.dataset.game);
      const mode = form.querySelector('input[name="mode"]:checked')?.value;
      const seats = Number(form.elements.namedItem('seats')?.value);
      if (!game || !['friends', 'bots'].includes(mode) || (mode === 'bots' && !game.supportsBots) || !Number.isInteger(seats) || seats < game.minPlayers || seats > game.maxPlayers) {
        feedback('اختيارات الغرفة مب متاحة. تأكّد من اللعبة، الوضع وعدد المقاعد.', true); return;
      }
      const visibility=form.elements.namedItem('visibility')?.value||'code';
      const password=visibility==='private'?form.elements.namedItem('password')?.value||'':undefined;
      if (visibility==='private' && (mode==='bots' || password.length<8)) {feedback('الغرفة الخاصة للأصدقاء، وكلمة المرور 8 أحرف على الأقل.',true);return;}
      body = { gameId: game.id, mode, seats, visibility,password, ...(game.id === 'ludo' ? { variant: 'classic' } : {}) };
    }
    busy = true;
    const buttons = [...page.querySelectorAll('form[data-form] button[type="submit"]')];
    buttons.forEach((button) => { button.disabled = true; });
    feedback(joining ? 'جاري الدخول للغرفة…' : 'جاري إنشاء الغرفة…');
    try {
      const result = await ctx.req(joining ? 'room:join' : 'room:create', body);
      if (!result?.ok) throw Error(result?.error || 'ما تمت العملية. جرّب مرة ثانية.');
      if (!result.room || typeof result.room.code !== 'string' || !CODE_RE.test(result.room.code)) throw Error('رد الغرفة مب صحيح. حدّث غرفك قبل المحاولة مرة ثانية.');
      // join emits a room push before its RPC reply, so the parent may remount
      // this same route first. Never hijack navigation if the player left it.
      if (!alive && (typeof window === 'undefined' || !/^#\/rooms\/?$/.test((globalThis.__LA3BAK_NAV__ || location).hash))) return;
      saveRoom(result.room);
      feedback(joining ? 'تم الدخول للغرفة.' : 'غرفتك جاهزة.');
      if (typeof window !== 'undefined') (globalThis.__LA3BAK_NAV__ || location).hash = roomURL(result.room.code);
    } catch (error) { feedback(error?.message || 'ما قدرنا نتصل بالخادم.', true); }
    finally { busy = false; if (alive) buttons.forEach((button) => { button.disabled = !canRequest(state); }); }
  };
  page.addEventListener('click', onClick);
  page.addEventListener('change', onChange);
  page.addEventListener('submit', onSubmit);
  applyFilter();
  if (values(state.rooms) === null) void loadRooms();
  return { destroy() { alive = false; page.removeEventListener('click', onClick); page.removeEventListener('change', onChange); page.removeEventListener('submit', onSubmit); } };
}
