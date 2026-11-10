import { Room, RoomEvent, Track, createLocalAudioTrack, setLogLevel } from './vendor/livekit-client.2.23.0.mjs';
import * as MIC from './mic-clean-r69.js?v=r69zj';

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
        element.dataset.voiceIdentity = participant.identity;
        if (!this.container) { this.container = document.createElement('div'); this.container.hidden = true; this.container.dataset.socialVoiceAudio = ''; document.body.append(this.container); }
        this.container.append(element); this.audio.set(track.sid, { track, element });
        element.play().catch(() => { if (live()) this.emit(this.state, { needsAudioUnlock: true }); });
        syncMicrophones();
      });
      room.on(RoomEvent.TrackUnsubscribed, track => {this.detach(track.sid);syncMicrophones();});
      room.on(RoomEvent.ActiveSpeakersChanged, speakers => { if (live()) this.onSpeakers(speakers.map(p => p.identity)); });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => { if (live()) this.emit(this.state, { needsAudioUnlock: !room.canPlaybackAudio }); });
      room.on(RoomEvent.LocalTrackUnpublished, publication => { if (this.local === publication.track) { this.stopLocal(); if (live()) this.emit(this.state); } });
      room.on(RoomEvent.LocalTrackSubscribed, () => { if (live()) this.emit(this.state); });
      room.on(RoomEvent.Reconnecting, () => { if (live()) { this.stopLocal(); this.clearAudio(); this.emit('reconnecting'); this.scheduleRefresh(generation); } });
      room.on(RoomEvent.SignalReconnecting, () => { if (live()) { this.stopLocal(); this.clearAudio(); this.emit('reconnecting'); this.scheduleRefresh(generation); } });
      room.on(RoomEvent.Disconnected, () => {
        if (!live()) return;
        this.stopLocal(); this.clearAudio(); this.emit('disconnected'); this.scheduleRefresh(generation);
      });
      const url = new URL(ticket.urlPath, location.origin); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      await room.connect(url.toString(), ticket.token, { autoSubscribe: true, maxRetries: 0 });
      if (!live()) { await room.disconnect(true); return false; }
      // Joining only subscribes. A user must click microphone(true) after every join/rejoin.
      this.emit('connected', { identity: ticket.identity, channel: ticket.channel, needsAudioUnlock: !room.canPlaybackAudio });
      return true;
    } catch (error) {
      if (room && this.room === room) await this.teardown();
      else if (room) await room.disconnect(true).catch(() => {});
      if (generation === this.generation && this.desired) this.emit('error', { error: 'تعذّر اتصال الصوت. تحقّق من الشبكة وأعد المحاولة.' });
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
    this.desired = false; ++this.generation; ++this.micGeneration; clearTimeout(this.retry); this.retry = null;
    this.stopLocal(); this.clearAudio();
    return this.enqueue(async () => { await this.teardown(); this.muted = true; this.emit('disconnected'); });
  }
  async microphone(enabled) {
    const micGeneration = ++this.micGeneration, generation = this.generation, room = this.room;
    if (!enabled) {
      const track = this.local; this.stopLocal();
      if (room && track) await room.localParticipant.unpublishTrack(track, true).catch(() => {});
      this.emit(this.state); return true;
    }
    if (!room || this.state !== 'connected' || this.muted) { this.emit(this.state, { error: this.muted ? 'الميكروفون مكتوم بواسطة المشرف.' : 'اتصل بالمجلس أولاً.' }); return false; }
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
      this.emit('connected'); return true;
    } catch (error) {
      track?.stop(); if (this.local === track) this.local = null;
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
