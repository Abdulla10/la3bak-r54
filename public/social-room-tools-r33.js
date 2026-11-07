/* Social council tools only. Authenticated send and durable retry belong to the existing SocialRooms controller. */
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = ['#202124', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];
const LABELS = { drawing: 'لوحة الرسم', timer: 'العدّ التنازلي' };
const ERROR = { council_tool_disabled: 'الأداة غير مفعّلة.', drawing_board_changed: 'تغيّرت اللوحة؛ ارسم من جديد.', drawing_capacity: 'بلغت اللوحة حدّها. يمكن للمشرف مسحها.', drawing_own_stroke_required: 'يمكنك التراجع عن رسمك فقط.', moderator_required: 'هذا الإجراء للمشرف فقط.', member_muted: 'مشاركتك مكتومة إداريًا.', chat_policy_denied: 'سياسة المجلس لا تسمح بالمشاركة الآن.', timer_in_progress: 'أوقف العدّ الحالي أو أعد ضبطه أولًا.' };
const rows = x => Array.isArray(x) ? x : [];
export function countdownSecondsR33(timer, serverNow) {
  if (!timer) return 0;
  const remaining = timer.status === 'running' ? Math.max(0, timer.endsAt - serverNow) : timer.remainingMs;
  return Number.isFinite(remaining) ? Math.max(0, Math.ceil(remaining / 1000)) : 0;
}
export function normalizedPointR33(event, rect) {
  if (!(rect.width > 0 && rect.height > 0)) return null;
  const clamp = x => Math.round(Math.max(0, Math.min(1, x)) * 10000) / 10000;
  return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
}
export function paintVectorsR33(canvas, strokes, draft = null) {
  const ctx = canvas?.getContext?.('2d'); if (!ctx) return;
  const width = canvas.width, height = canvas.height;
  ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
  for (const stroke of [...rows(strokes), ...(draft ? [draft] : [])]) {
    if (!COLORS.includes(stroke.color) || !rows(stroke.points).length) continue;
    const ps = stroke.points; ctx.strokeStyle = stroke.color; ctx.fillStyle = stroke.color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    if (ps.length === 1) { ctx.arc(ps[0].x * width, ps[0].y * height, 2, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.moveTo(ps[0].x * width, ps[0].y * height); for (const p of ps.slice(1)) ctx.lineTo(p.x * width, p.y * height); ctx.stroke(); }
  }
}
export function createRoomToolsR33({ getSnapshot, getCouncil, send, onError = () => {} }) {
  let tab = 'drawing', pencil = COLORS[0], panel = null, host = null, dispose = () => {}, interval = null, draft = null, pointerId = null, scope = '', disposed = false, clockToken = '', clockOffset = 0, inFlight = false;
  const model = () => {
    const snapshot = getSnapshot(), council = getCouncil(), current = snapshot?.current;
    return current?.roomId === snapshot?.room?.id && current?.councilId === council?.id && council?.tools ? { scope: `${current.roomId}/${current.councilId}`, roomId: current.roomId, councilId: current.councilId, tools: council.tools } : null;
  };
  const button = (action, label, disabled = false, fields = '') => `<button type="button" data-rt-action="${action}" ${disabled ? 'disabled' : ''} ${fields}>${label}</button>`;
  function clock(m) {
    const token = `${m.scope}/${m.tools.serverNow}`;
    if (token !== clockToken) { clockToken = token; clockOffset = Number.isSafeInteger(m.tools.serverNow) ? m.tools.serverNow - Date.now() : 0; }
    return Date.now() + clockOffset;
  }
  function body(m) {
    const t = m.tools, enabled = t.enabled?.[tab] === true, write = t.canWrite === true, manage = t.canManage === true;
    const toggle = manage ? button('toggle', enabled ? 'إيقاف الأداة' : 'تفعيل الأداة', false, `data-enabled="${!enabled}"`) : '';
    if (!enabled) return `<p class="rt-note">هذه الأداة غير مفعّلة في مجلسك.</p>${toggle}`;
    let content = '';
    if (tab === 'timer') {
      const timer = t.timer, seconds = countdownSecondsR33(timer, clock(m));
      content = `<p class="rt-note">عدّ مستقل عن أي لعبة أو تحدّي. يُحسب من توقيت الخادم.</p><output class="rt-countdown" data-rt-clock dir="ltr" role="timer" aria-label="الوقت المتبقي">${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}</output><p data-rt-timer-state>${timer?.status === 'paused' ? 'متوقف مؤقتًا' : timer?.status === 'running' && seconds > 0 ? 'العدّ يعمل' : timer?.status === 'finished' || timer?.status === 'running' ? 'انتهى الوقت' : 'لم يبدأ العدّ'}</p>${manage ? `<label>المدة بالثواني<input data-rt-duration type="number" min="1" max="3600" step="1" value="60" inputmode="numeric"></label><div class="rt-actions">${button('timer-start', 'بدء', timer?.status === 'running' && seconds > 0)}${timer?.status === 'paused' ? button('timer-resume', 'استئناف') : button('timer-pause', 'إيقاف مؤقت', timer?.status !== 'running' || seconds === 0)}${button('timer-reset', 'إعادة ضبط')}</div>` : '<p class="rt-note">المشرف يتحكم بالعدّ؛ يمكنك متابعة الوقت.</p>'}`;
    } else {
      const strokes = rows(t.drawing?.strokes), own = strokes.filter(s => s.mine).at(-1);
      content = `<p class="rt-note">قلم بألوان معتمدة. تُشارك الخطوط بعد حفظها؛ الخط أثناء الرسم معاينة غير محفوظة.</p><div class="rt-pencils" role="group" aria-label="لون القلم">${COLORS.map((color, i) => button('color', `<span class="rt-swatch rt-color-${i}" aria-hidden="true"></span><span class="rt-sr">لون القلم ${i + 1}</span>`, !write, `data-color="${color}" aria-pressed="${pencil === color}"`)).join('')}</div><canvas class="rt-canvas" width="960" height="600" data-rt-canvas aria-label="لوحة رسم مشتركة. الرسم باللمس أو المؤشر." ${write ? '' : 'data-readonly'}></canvas><p data-rt-draft role="status"></p><div class="rt-actions">${button('undo', 'التراجع عن آخر خط لي', !write || !own, `data-stroke-id="${esc(own?.id || '')}"`)}${manage ? button('clear', 'مسح اللوحة للجميع') : ''}</div><small>${strokes.length} خط ظاهر · الحدّ 100 خط و6400 نقطة.</small>`;
    }
    return `${content}<div class="rt-admin">${toggle}</div>`;
  }
  function markup() {
    const m = model();
    if (!m) return '<div class="rt-r33" data-room-tools-r33><p class="rt-note">خذ مقعدًا في مجلس حالي لعرض أدواته. إذا لم تصل حالة الأدوات من الخادم، لن نعرض نتائج افتراضية.</p></div>';
    clock(m);
    return `<section class="rt-r33" data-room-tools-r33 dir="rtl" aria-label="أدوات المجلس"><nav class="rt-tabs" role="tablist" aria-label="اختيار أداة">${Object.entries(LABELS).map(([id, name]) => `<button type="button" role="tab" id="rt-tab-${id}" aria-controls="rt-tool-body" aria-selected="${id === tab}" data-rt-action="tab" data-tool="${id}">${name}</button>`).join('')}</nav><div id="rt-tool-body" role="tabpanel" aria-labelledby="rt-tab-${tab}">${body(m)}</div></section>`;
  }
  function updateClock() {
    const m = model(), output = panel?.querySelector('[data-rt-clock]'); if (!m || !output || m.scope !== scope || globalThis.document?.visibilityState === 'hidden') return;
    const s = countdownSecondsR33(m.tools.timer, clock(m)); output.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (m.tools.timer?.status === 'running' && s === 0) { const label = panel.querySelector('[data-rt-timer-state]'); if (label) label.textContent = 'انتهى الوقت'; panel.querySelector('[data-rt-action="timer-start"]')?.removeAttribute('disabled'); }
  }
  async function issue(name, fields, expectedScope) {
    const m = model(); if (disposed || !m || m.scope !== expectedScope) throw Error('تغيّر المجلس؛ حدّث الحالة.');
    if (!m.tools.canWrite) throw Error('المشاركة غير متاحة الآن.');
    if (inFlight) throw Error('انتظر حفظ الإجراء الحالي.');
    inFlight = true;
    try {
      const result = await send(name, { roomId: m.roomId, councilId: m.councilId, tool: tab, ...fields });
      if (!result || result.ok !== true) throw Error(ERROR[result?.error] || result?.error || 'لم يؤكد الخادم حفظ الإجراء. راجع الطلب الحالي.');
      // Action results are consumed only after the server confirms the save.
      return result;
    } finally { inFlight = false; }
  }
  function stopDraft() { draft = null; pointerId = null; }
  function restore(nextHost) {
    if (disposed) return;
    dispose(); clearInterval(interval); interval = null; stopDraft(); host = nextHost;
    panel = host?.querySelector?.('[data-room-tools-r33]'); const m = model(); scope = m?.scope || '';
    if (!panel || !m) return;
    const controller = new AbortController(), options = { signal: controller.signal };
    dispose = () => controller.abort();
    const canvas = panel.querySelector('[data-rt-canvas]'); if (canvas) paintVectorsR33(canvas, m.tools.drawing?.strokes);
    const repaint = () => { if (!panel?.isConnected) return; panel.outerHTML = markup(); restore(host); };
    panel.addEventListener('click', event => {
      const b = event.target.closest?.('[data-rt-action]'); if (!b || !panel.contains(b) || b.disabled) return;
      event.preventDefault(); event.stopPropagation();
      const action = b.dataset.rtAction;
      if (action === 'tab') { tab = Object.hasOwn(LABELS, b.dataset.tool) ? b.dataset.tool : 'drawing'; repaint(); return; }
      if (action === 'color') { if (COLORS.includes(b.dataset.color)) pencil = b.dataset.color; repaint(); return; }
      let fields;
      if (action === 'toggle') fields = { enabled: b.dataset.enabled === 'true' };
      else if (action === 'undo') fields = { action: { type: 'undo', strokeId: b.dataset.strokeId } };
      else if (action === 'clear') { if (!globalThis.confirm('مسح لوحة المجلس للجميع؟')) return; fields = { action: { type: 'clear' } }; }
      else if (action === 'timer-start') { const durationSeconds = Number(panel.querySelector('[data-rt-duration]')?.value); if (!Number.isSafeInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 3600) { onError('اختر مدة بين 1 و3600 ثانية.'); return; } fields = { action: { type: 'start', durationSeconds } }; }
      else if (action.startsWith('timer-')) fields = { action: { type: action.slice(6) } };
      if (fields) { b.disabled = true; issue(action === 'toggle' ? 'tool:set' : 'tool:action', fields, scope).catch(e => onError(ERROR[e.message] || e.message)).finally(() => { if (b.isConnected) b.disabled = false; }); }
    }, options);
    panel.addEventListener('keydown', event => {
      if (!event.target.matches?.('[role="tab"]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); const ids = Object.keys(LABELS), i = ids.indexOf(tab); tab = event.key === 'Home' ? ids[0] : event.key === 'End' ? ids.at(-1) : ids[(i + (event.key === 'ArrowLeft' ? 1 : -1) + ids.length) % ids.length]; repaint(); panel?.querySelector('[aria-selected="true"]')?.focus();
    }, options);
    if (canvas) {
      const display = () => { paintVectorsR33(canvas, model()?.tools.drawing?.strokes, draft); const status = panel?.querySelector('[data-rt-draft]'); if (status) status.textContent = draft ? 'معاينة غير محفوظة؛ ارفع القلم لإرسال الخط.' : ''; };
      canvas.addEventListener('pointerdown', event => {
        const fresh = model(); if (event.button !== 0 || draft || inFlight || !fresh?.tools.canWrite || fresh.scope !== scope || !fresh.tools.enabled.drawing) return;
        const p = normalizedPointR33(event, canvas.getBoundingClientRect()); if (!p) return;
        event.preventDefault(); pointerId = event.pointerId; draft = { color: pencil, points: [p], boardVersion: fresh.tools.drawing.boardVersion }; canvas.setPointerCapture?.(pointerId); display();
      }, options);
      canvas.addEventListener('pointermove', event => {
        if (!draft || event.pointerId !== pointerId) return; event.preventDefault();
        const p = normalizedPointR33(event, canvas.getBoundingClientRect()), last = draft.points.at(-1);
        if (p && draft.points.length < 128 && (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > .002)) draft.points.push(p);
        display();
      }, options);
      canvas.addEventListener('pointerup', event => {
        if (!draft || event.pointerId !== pointerId) return; event.preventDefault();
        const stroke = draft, capturedScope = scope; stopDraft(); display();
        issue('tool:action', { tool: 'drawing', action: { type: 'stroke', boardVersion: stroke.boardVersion, color: stroke.color, points: stroke.points } }, capturedScope).catch(e => onError(ERROR[e.message] || e.message));
      }, options);
      for (const kind of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(kind, () => { stopDraft(); display(); }, options);
    }
    if (tab === 'timer') { updateClock(); interval = setInterval(updateClock, 250); }
  }
  if (globalThis.document && !document.querySelector('link[data-room-tools-r33]')) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/social-room-tools-r33.css?v=complete-r46'; link.dataset.roomToolsR33 = ''; document.head.append(link); }
  return { render: markup, restore, destroy() { disposed = true; dispose(); clearInterval(interval); interval = null; stopDraft(); panel = null; host = null; }, metrics: () => ({ disposed, timerIntervals: interval ? 1 : 0, draftPoints: draft?.points.length || 0, scope }) };
}
