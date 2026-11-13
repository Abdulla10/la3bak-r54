import { Room, RoomEvent, Track, createLocalAudioTrack, setLogLevel } from './vendor/livekit-client.2.23.0.mjs';
import * as MIC from './mic-clean-r69.js?v=r69zj';
import * as VM from './voice-mod-r69.js?v=r133';

// Never log SDK connection URLs or tokens. No camera, screen capture, recording or data publishing.
setLogLevel('silent');
export class SocialVoiceClient {
  constructor({ api, onState = () => {}, onSpeakers = () => {} }) {
    if (typeof api !== 'function') throw new TypeError('Voice requires the application API client.');
    this.api = api; this.onState = onState; this.onSpeakers = onSpeakers;
    this.room = null; this.generation = 0; this.output = 1; this.muted = true;
    this.container = null; this.audio = new Map(); this.local = null;
    this.queue = Promise.resolve(); this.retry = null; this.desired = false; this.micGeneration = 0;
    this.highQuality = false;
    this.state = 'disconnected';
  }
  emit(state, extra = {}) {
    this.state = state;
    const microphones={};
    for(const participant of this.room?.remoteParticipants?.values?.()||[]) {
      microphones[participant.identity]=[...participant.audioTrackPublications.values()].some(p=>p.source===Track.Source.Microphone&&!p.isMuted);
    }
    this.onState({ state, muted: this.muted, microphone: !!this.local, microphones, ...extra });
    this.bg127(state);
  }
  // R133: سجل تشخيص الصوت — يوصل للسيرفر عشان نعرف وقت وسبب أي انقطاع أو كتم (بدون صوت ولا محتوى)
  diag(ev, extra = {}) {
    try {
      const row = { ev, at: Date.now(), st: this.state, mic: !!this.local, muted: !!this.muted, vis: typeof document !== 'undefined' ? document.visibilityState : '', online: typeof navigator !== 'undefined' ? navigator.onLine : null, ...extra };
      (this.diagBuf ??= []).push(row); if (this.diagBuf.length > 40) this.diagBuf.shift();
      clearTimeout(this.diagT); this.diagT = setTimeout(() => { const rows = this.diagBuf.splice(0); if (!rows.length) return; try { fetch('/api/voice-diag', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows, dev: /iPhone|iPad/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop' }) }).catch(() => {}); } catch { /* */ } }, 1500);
    } catch { /* التشخيص ما يوقف الصوت */ }
  }
  // R127: الاستماع والشاشة مقفلة + أزرار التحكم في شاشة القفل
  setMeta(title, artwork) { this.meta127 = { title: String(title || 'غرفة صوتية'), artwork: artwork || '/icon-512.png' }; this.bg127(this.state); }
  bg127(state) {
    try {
      const on = state === 'connected' || state === 'reconnecting' || state === 'connecting';
      const as = typeof navigator !== 'undefined' ? navigator.audioSession : null;
      // R133: لا نغيّر نوع جلسة الصوت بنفسنا — تغييره وقت فتح المايك كان يقطع الصوت ويطفّي المايك بالآيفون. نخليه «auto» والمتصفح يدبّر
      if (as && as.type !== 'auto') { try { as.type = 'auto'; } catch { /* */ } }
      if (!this.vis127 && typeof document !== 'undefined') {
        this.vis127 = () => { if (document.visibilityState !== 'visible' || !this.desired) return; for (const { element } of this.audio.values()) if (element.paused && !this.paused127) element.play().catch(() => {}); if (this.state === 'disconnected' || this.state === 'error') void this.refresh(); else if (this.state === 'connected' && this.micBack133 && !this.local && !this.muted && Date.now() - this.micBack133 < 120_000) void this.microphone(true); };
        document.addEventListener('visibilitychange', this.vis127); addEventListener('pageshow', this.vis127); addEventListener('online', this.vis127);
      }
      const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null; if (!ms) return;
      if (!on) { this.msSig127 = ''; ms.metadata = null; ms.playbackState = 'none'; for (const a of ['play', 'pause', 'stop']) { try { ms.setActionHandler(a, null); } catch { /* */ } } return; }
      const m = this.meta127 || { title: 'غرفة صوتية', artwork: '/icon-512.png' };
      const sig = `${m.title}|${!!this.local}|${!!this.paused127}`; if (this.msSig127 === sig && ms.metadata) return; this.msSig127 = sig;
      if (typeof MediaMetadata === 'function') ms.metadata = new MediaMetadata({ title: m.title, artist: this.local ? 'لعبك · المايك شغّال' : 'لعبك · بث مباشر', album: 'لعبك', artwork: [{ src: m.artwork, sizes: '512x512', type: 'image/png' }] });
      ms.playbackState = this.paused127 ? 'paused' : 'playing';
      const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch { /* */ } };
      set('play', () => { this.paused127 = false; for (const { element } of this.audio.values()) { element.muted = false; element.play().catch(() => {}); } ms.playbackState = 'playing'; });
      set('pause', () => { this.paused127 = true; for (const { element } of this.audio.values()) element.muted = true; ms.playbackState = 'paused'; });
      set('stop', () => { this.paused127 = false; void this.disconnect(); });
    } catch { /* المتصفح ما يدعم */ }
  }
  enqueue(fn) {
    const task = this.queue.catch(() => {}).then(fn);
    this.queue = task.catch(() => {});
    return task;
  }
  connect() {
    this.desired = true; clearTimeout(this.retry);
    const generation = ++this.generation;
    ++this.micGeneration;
    // Stop capturing and rendering immediately, even if an older permission prompt is outstanding.
    this.stopLocal(); this.clearAudio();
    return this.enqueue(() => this.join(generation));
  }
  refresh() { return this.connect(); }
  async join(generation) {
    await this.teardown();
    if (!this.desired || generation !== this.generation) return false;
    this.emit('connecting');
    let room;
    try {
      const ticket = await this.api('/api/social/voice', 'GET');
      if (!this.desired || generation !== this.generation) return false;
      if (!ticket?.ok) { this.emit(ticket?.status === 503 ? 'disabled' : 'unavailable', { error: ticket?.error || 'الصوت غير متاح الآن.' }); return false; }
      if (ticket.urlPath !== '/social-rtc' || typeof ticket.token !== 'string' || !ticket.token || typeof ticket.identity !== 'string') throw new Error('تذكرة صوت غير صالحة.');
      this.muted = !!ticket.muted;
      this.highQuality = ticket.highQuality === true;
      // Dual peer connection protocol deliberately uses /rtc, not packed /rtc/v1 join requests.
      room = new Room({ singlePeerConnection: false, adaptiveStream: false, dynacast: false, stopLocalTrackOnUnpublish: true, reconnectPolicy: { nextRetryDelayInMs: () => null } });
      this.room = room;
      const live = () => generation === this.generation && this.room === room && this.desired;
      const syncMicrophones=()=>{if(live())this.emit(this.state);};
      for(const event of [RoomEvent.TrackPublished,RoomEvent.TrackUnpublished,RoomEvent.TrackMuted,RoomEvent.TrackUnmuted,RoomEvent.ParticipantConnected,RoomEvent.ParticipantDisconnected])room.on(event,syncMicrophones);
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (!live() || track.kind !== Track.Kind.Audio || publication.source !== Track.Source.Microphone) return;
        const element = track.attach(); element.autoplay = true; element.controls = false; element.volume = this.output;
        element.dataset.voiceIdentity = participant.identity; element.muted = !!this.paused127; element.setAttribute('playsinline', '');
        if (!this.container) { this.container = document.createElement('div'); this.container.hidden = true; this.container.dataset.socialVoiceAudio = ''; document.body.append(this.container); }
        this.container.append(element); this.audio.set(track.sid, { track, element });
        element.play().catch(() => { if (live()) this.emit(this.state, { needsAudioUnlock: true }); });
        syncMicrophones();
      });
      room.on(RoomEvent.TrackUnsubscribed, track => {this.detach(track.sid);syncMicrophones();});
      room.on(RoomEvent.ActiveSpeakersChanged, speakers => { if (live()) this.onSpeakers(speakers.map(p => p.identity)); });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => { if (live()) this.emit(this.state, { needsAudioUnlock: !room.canPlaybackAudio }); });
      room.on(RoomEvent.LocalTrackUnpublished, publication => { if (this.local === publication.track) { this.diag('local-unpublished'); this.micBack133 = Date.now(); this.stopLocal(); if (live()) this.emit(this.state); } });
      room.on(RoomEvent.LocalTrackSubscribed, () => { if (live()) this.emit(this.state); });
      room.on(RoomEvent.Reconnecting, () => { if (live()) { this.diag('reconnecting'); if (this.local) this.micBack133 = Date.now(); this.stopLocal(); this.clearAudio(); this.emit('reconnecting'); this.scheduleRefresh(generation); } });
      room.on(RoomEvent.SignalReconnecting, () => { if (live()) { this.diag('signal-reconnecting'); if (this.local) this.micBack133 = Date.now(); this.stopLocal(); this.clearAudio(); this.emit('reconnecting'); this.scheduleRefresh(generation); } });
      room.on(RoomEvent.Disconnected, (reason) => {
        if (!live()) return; this.diag('disconnected', { reason: reason ?? null });
        if (this.local) this.micBack133 = Date.now(); this.stopLocal(); this.clearAudio(); this.emit('disconnected'); this.scheduleRefresh(generation);
      });
      const url = new URL(ticket.urlPath, location.origin); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      await room.connect(url.toString(), ticket.token, { autoSubscribe: true, maxRetries: 0 });
      if (!live()) { await room.disconnect(true); return false; }
      // Joining only subscribes. A user must click microphone(true) after every join/rejoin.
      this.emit('connected', { identity: ticket.identity, channel: ticket.channel, needsAudioUnlock: !room.canPlaybackAudio });
      this.failN133 = 0; this.diag('connected', { restoreMic: !!this.micBack133 });
      // R133: لو المايك كان شغّال وانقطع الاتصال لحظة، نرجّعه بروحه (بدل ما يبان إنه «انكتم من نفسه»)
      if (this.micBack133 && Date.now() - this.micBack133 < 120_000 && !this.muted) { this.micBack133 = 0; setTimeout(() => { if (live() && !this.local) void this.microphone(true); }, 300); }
      else this.micBack133 = 0;
      return true;
    } catch (error) {
      if (room && this.room === room) await this.teardown();
      else if (room) await room.disconnect(true).catch(() => {});
      if (generation === this.generation && this.desired) {
        // R133: كان يوقف هني للأبد (والمايك يرفض يفتح). الحين نعيد المحاولة بتدرّج لين يرجع الاتصال
        this.failN133 = (this.failN133 || 0) + 1; const wait = Math.min(15000, 800 * 2 ** Math.min(5, this.failN133 - 1));
        this.diag('join-failed', { n: this.failN133, wait, err: String(error?.message || error).slice(0, 120) });
        this.emit('reconnecting', { error: 'الصوت يعيد الاتصال…' });
        clearTimeout(this.retry); this.retry = setTimeout(() => { this.retry = null; if (this.desired && generation === this.generation) void this.refresh(); }, wait);
      }
      return false;
    }
  }
  scheduleRefresh(generation) {
    if (this.retry || !this.desired) return;
    this.retry = setTimeout(() => {
      this.retry = null;
      if (this.desired && generation === this.generation) void this.refresh();
    }, 500);
  }
  stopLocal() {
    try { VM.stop(); } catch { /* */ }
    if (this.local) { this.local.stop(); this.local = null; }
  }
  detach(sid) {
    const item = this.audio.get(sid); if (!item) return;
    item.element.pause(); item.element.srcObject = null; item.track.detach(item.element); item.element.remove(); this.audio.delete(sid);
  }
  clearAudio() {
    for (const sid of [...this.audio.keys()]) this.detach(sid);
    this.container?.remove(); this.container = null; this.onSpeakers([]);
  }
  async teardown() {
    const room = this.room; this.room = null;
    this.stopLocal(); this.clearAudio();
    if (room) { room.removeAllListeners(); await room.disconnect(true); }
  }
  disconnect() {
    this.micBack133 = 0; this.desired = false; ++this.generation; ++this.micGeneration; clearTimeout(this.retry); this.retry = null;
    this.stopLocal(); this.clearAudio();
    return this.enqueue(async () => { await this.teardown(); this.muted = true; this.emit('disconnected'); });
  }
  async microphone(enabled) {
    const micGeneration = ++this.micGeneration, generation = this.generation, room = this.room;
    if (!enabled) {
      this.micBack133 = 0; const track = this.local; this.stopLocal();
      if (room && track) await room.localParticipant.unpublishTrack(track, true).catch(() => {});
      this.emit(this.state); return true;
    }
    if (!room || this.state !== 'connected') {
      // R133: الصوت مو متصل (مو كتم) — نخزّن طلبك ونفتح المايك أول ما يرجع الاتصال
      this.micBack133 = Date.now(); this.diag('mic-wait-connection');
      if (this.desired && !this.retry && this.state !== 'connecting') void this.refresh();
      this.emit(this.state, { error: 'الصوت يعيد الاتصال… المايك بيفتح أول ما يرجع.' }); return false;
    }
    if (this.muted) { this.diag('mic-refused-muted'); this.emit(this.state, { error: 'الميكروفون مكتوم بواسطة المشرف.' }); return false; }
    // Explicit microphone(true) is the only capture entry point. Permission prompts are generation guarded.
    let track;
    try {
      track = await createLocalAudioTrack(MIC.micConstraints());
      // R69ze: تنقية الصوت (إزالة الضجة) — لو فشلت، نكمل بالصوت العادي
      if (MIC.cleanMicEnabled()) { try { await track.setProcessor(MIC.createCleanProcessor()); } catch { /* المتصفح ما يدعم */ } }
      if (generation !== this.generation || micGeneration !== this.micGeneration || this.room !== room || !this.desired || this.state !== 'connected') { track.stop(); return false; }
      this.stopLocal(); this.local = track;
      await room.localParticipant.publishTrack(track, { source: Track.Source.Microphone, audioPreset: { maxBitrate: this.highQuality ? 64000 : 48000 }, forceStereo: false });
      if (generation !== this.generation || micGeneration !== this.micGeneration || this.room !== room) { track.stop(); await room.localParticipant.unpublishTrack(track, true).catch(() => {}); return false; }
      // R133: الآيفون يطفّي المايك لو جات مكالمة أو رحت لتطبيق ثاني — نرجّعه بروحه لما ترجع
      try { track.mediaStreamTrack?.addEventListener('ended', () => { if (this.local !== track) return; this.diag('track-ended'); this.micBack133 = Date.now(); const r2 = this.room; this.stopLocal(); if (r2) void r2.localParticipant.unpublishTrack(track, true).catch(() => {}); this.emit(this.state); if (document.visibilityState === 'visible') setTimeout(() => { if (this.micBack133 && !this.local && this.state === 'connected' && !this.muted) void this.microphone(true); }, 600); }); } catch { /* */ }
      this.diag('mic-on');
      try { void VM.start(); } catch { /* المشرف الصوتي اختياري */ }
      this.emit('connected'); return true;
    } catch (error) {
      track?.stop(); if (this.local === track) this.local = null; this.diag('mic-error', { name: error?.name || '', err: String(error?.message || '').slice(0, 100) });
      if (generation === this.generation && micGeneration === this.micGeneration) this.emit(this.state, { error: error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError' ? 'لم تسمح باستخدام الميكروفون. يمكنك الاستماع فقط.' : 'تعذّر تشغيل الميكروفون. يمكنك الاستماع فقط.' });
      return false;
    }
  }
  setOutput(volume) {
    const value = Number(volume); if (!Number.isFinite(value)) return;
    this.output = Math.max(0, Math.min(1, value));
    for (const { element } of this.audio.values()) element.volume = this.output;
  }
  // Call only from an explicit user click/tap to unlock mobile/browser autoplay.
  async unlockAudio() {
    const room = this.room; if (!room) return false;
    try { await room.startAudio(); if (this.room === room) this.emit(this.state, { needsAudioUnlock: !room.canPlaybackAudio }); return room.canPlaybackAudio; }
    catch { if (this.room === room) this.emit(this.state, { needsAudioUnlock: true }); return false; }
  }
}
