/* Owner creation only. No passive joins, microphone capture, game bridges or storage of raw passwords. */
const list = value => Array.isArray(value) ? value : [];
const failure = message => { throw Error(message); };
const id = value => typeof value === 'string' && value ? value : '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const photoFingerprint = async photo => photo ? Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', await photo.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('') : '';

export function confirmedOwnerSeat(snapshot, state) {
  const room = snapshot?.room, current = snapshot?.current;
  const council = list(room?.councils).find(item => item.id === state?.councilId);
  const ownerId = id(room?.owner?.id);
  const member = list(council?.members).find(item => item.id === ownerId && item.role === 'owner');
  return Boolean(snapshot?.ok && room?.role === 'owner' && room.id === state?.roomId && ownerId &&
    council?.kind === 'public' && council?.privacy === 'public' &&
    current?.roomId === room.id && current?.councilId === council.id &&
    Number.isInteger(current.seatIndex) && current.seatIndex >= 0 && current.seatIndex < council.seats &&
    member?.seatIndex === current.seatIndex && list(council.occupiedSeats).includes(current.seatIndex));
}

export function createOwnerRoomStart({api, send, uuid, config = {}, restored = null, save = () => {}}) {
  if (![api, send, uuid, save].every(value => typeof value === 'function')) throw TypeError('owner_start_dependencies_required');
  let state = restored ? structuredClone(restored) : null, photoBlob = null, inFlight = null;
  // A restored record is a recovery token, NEVER renewed microphone consent.
  const persist = () => { const safe = structuredClone(state); if (safe?.fields?.password) { safe.requiresPassword = true; delete safe.fields.password; } save(safe); };
  const read = async () => {
    const snapshot = await api(`/api/social/rooms/${encodeURIComponent(state.roomId)}`, 'GET');
    if (!snapshot?.ok || snapshot.room?.id !== state.roomId || snapshot.room?.role !== 'owner') failure('تعذر تأكيد غرفتك الأصلية وملكية حسابك. أعد نفس المحاولة؛ لن ننشئ غرفة بديلة.');
    return snapshot;
  };
  async function commit(fields, photo) {
    const fingerprint = await photoFingerprint(photo);
    if (!state) {
      const seats = config.defaultCouncilSeats, max = config.maxCouncilSeats;
      if (!Number.isInteger(seats) || !Number.isInteger(max) || seats < 2 || seats > max) failure('عدد مقاعد المجلس المعتمد غير متاح. حدّث الإعدادات قبل الإنشاء.');
      state = {version:33, fields:{...fields}, seats, atomic:config.capabilities?.ownerStart === true,
        keys:{room:uuid(), council:uuid(), seat:uuid(), cover:uuid()}, roomId:'', councilId:'', seatIndex:null,
        roomReceipt:false, councilReceipt:false, seatReceipt:false, photoRequired:!!photo, photoFingerprint:fingerprint, photoSaved:false, complete:false};
      photoBlob = photo || null; persist();
    }
    // Once submitted the room metadata is immutable. Only an exact password re-entry can replay a lost receipt.
    if (state.requiresPassword && !state.fields.password && !state.roomReceipt) {
      if (!fields?.password) failure('أعد إدخال كلمة مرور الغرفة لإعادة الطلب الأصلي؛ الكلمة لا تُحفظ في المتصفح.');
      state.fields.password = fields.password;
    }
    if (photo && photo !== photoBlob) {
      if (state.photoFingerprint && state.photoFingerprint !== fingerprint) state.keys.cover = uuid();
      const unchanged = state.photoFingerprint === fingerprint;
      photoBlob = photo; state.photoRequired = true; state.photoFingerprint = fingerprint;
      if (!unchanged) state.photoSaved = false; persist();
    }
    if (!state.roomReceipt) {
      const result = await send('room:create', {...state.fields, memory:false, ...(state.atomic ? {startOwner:true} : {})}, state.keys.room);
      state.roomId = id(result?.roomId) || id(result?.room?.id) || state.roomId;
      if (state.roomId) persist();
      if (!state.roomId) failure('لم يتأكد معرّف الغرفة. أعد الطلب بالمفتاح الأصلي فقط.');
      if (state.atomic) {
        state.councilId = id(result?.councilId) || state.councilId;
        if (!state.councilId || !Number.isInteger(result?.seatIndex)) failure('لم يتأكد مجلس المالك الذري. أعد نفس الطلب؛ لا إنشاء بديل.');
        state.councilReceipt = true; state.seatIndex = result.seatIndex;
      }
      state.roomReceipt = true; delete state.fields.password; state.requiresPassword = false; persist();
    }
    let snapshot = await read();
    if (!state.councilReceipt) {
      const result = await send('council:create', {roomId:state.roomId, name:state.fields.name, kind:'public', privacy:'public', seats:state.seats}, state.keys.council);
      state.councilId = id(result?.councilId) || state.councilId;
      if (state.councilId) persist();
      if (!state.councilId) failure('لم يتأكد معرّف مجلس غرفتك. أعد نفس المحاولة؛ لا ننضم إلى مجلس آخر.');
      state.councilReceipt = true; persist(); snapshot = await read();
    }
    if (!confirmedOwnerSeat(snapshot, state) && !state.atomic) {
      if (!list(snapshot.room.councils).some(item => item.id === state.councilId)) failure('مجلس غرفتك الأصلي غير متاح. حدّث الحالة؛ لن ننشئ مجلساً بديلاً.');
      await send('council:join', {roomId:state.roomId, councilId:state.councilId}, state.keys.seat);
      snapshot = await read();
    }
    if (!confirmedOwnerSeat(snapshot, state)) failure('لم يتأكد مقعد المالك الفعلي في المجلس الرئيسي. الغرفة محفوظة؛ أعد نفس المحاولة قبل الصوت.');
    state.seatReceipt = true; state.seatIndex = snapshot.current.seatIndex; persist();
    if (state.photoRequired && !state.photoSaved) {
      if (!photoBlob) failure('الغرفة ومقعدك محفوظان. أعد اختيار الصورة لإكمال حفظها، أو ألغِ الصورة صراحة؛ لن ننشئ غرفة ثانية.');
      try {
        const result = await api(`/api/social/rooms/${encodeURIComponent(state.roomId)}/cover`, {method:'POST', body:photoBlob, headers:{'X-Idempotency-Key':state.keys.cover}});
        if (result?.ok === false) failure(result.error || 'لم يتأكد حفظ الصورة.');
      } catch (error) { failure('الغرفة ومقعدك محفوظان، بس الصورة ما تأكد حفظها. اضغط حفظ الصورة والدخول لإعادة نفس الصورة والمفتاح بدون إنشاء غرفة ثانية. ' + (error.message || '')); }
      state.photoSaved = true; persist(); snapshot = await read();
    }
    state.complete = true; persist(); return {state, snapshot};
  }
  return {
    get state() { return state; },
    ownsKey(key) { return !!key && Object.values(state?.keys || {}).includes(key); },
    clearPhoto() { photoBlob = null; if (state) { state.photoRequired = false; state.photoSaved = false; persist(); } },
    start(fields, {photo = null} = {}) { if (inFlight) return inFlight; inFlight = commit(fields, photo).finally(() => {inFlight = null;}); return inFlight; }
  };
}

/** Called by an explicit owner creation submission only. Listening is independent of capture consent. */
export async function startOwnerVoice({snapshot, state, connect, voice, consent = false, active = () => true}) {
  if (!confirmedOwnerSeat(snapshot, state)) failure('owner_seat_confirmation_required');
  const result = {roomId:state.roomId, councilId:state.councilId, seatIndex:state.seatIndex, connected:false, microphone:false, micConsented:consent === true, message:''};
  try {
    await connect();
    if (!active()) return result;
    const client = voice(); result.connected = client?.state === 'connected';
    if (!result.connected) { result.message = 'غرفتك ومقعدك محفوظان. تعذر اتصال الصوت؛ اضغط اتصال بالصوت لإعادة المحاولة.'; return result; }
    if (consent === true) {
      result.microphone = await client.microphone(true) === true;
      if (!result.microphone) result.message = 'غرفتك ومقعدك محفوظان والمايك مغلق. إذا رفض المتصفح الإذن أو احتاج نقرة جديدة، اضغط تشغيل المايك للمحاولة بإذن المتصفح.';
    }
  } catch { result.message = 'غرفتك ومقعدك محفوظان. تعذر بدء الصوت؛ أعد الاتصال، ثم شغّل المايك باختيارك.'; }
  return result;
}

export function ownerStartFeedback(start, voiceState = {}) {
  if (!start) return '';
  const connected = voiceState.status === 'connected', microphone = connected && voiceState.microphone === true;
  if (connected && (microphone || !start.micConsented) && !start.message) return '';
  const message = !connected ? 'غرفتك ومقعدك محفوظان. الصوت غير متصل؛ يمكنك إعادة الاتصال دون إنشاء غرفة ثانية.' : microphone ? 'غرفتك ومقعدك محفوظان والمايك يعمل الآن.' : 'غرفتك ومقعدك محفوظان والمايك مغلق. تشغيله يحتاج إذنك وإذن المتصفح؛ اضغط تشغيل المايك للمحاولة.';
  return `<section class="so-owner-start-r33" role="status" aria-live="polite"><p>${esc(message)}</p>${microphone ? '' : `<button type="button" class="so-button" data-so-action="${connected ? 'owner-start-mic-retry' : 'owner-start-voice-retry'}">${connected ? 'تشغيل المايك' : 'اتصال بالصوت'}</button>`}</section>`;
}
