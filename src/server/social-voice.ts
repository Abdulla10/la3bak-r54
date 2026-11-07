import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import WebSocket, { WebSocketServer, type RawData } from 'ws';

export type MediaAccess = { id: string; roomId: string; councilId: string; channel: string; epoch: string | number; muted: boolean; highQuality?: boolean; name: string };
export type SocialVoiceOptions = {
  enabled: boolean; upstream: string; apiKey: string; apiSecret: string; cookieSecret: string;
  access: (uid: string) => MediaAccess | null;
  authenticate: (req: IncomingMessage) => { id: string } | null;
  originAllowed: (req: IncomingMessage) => boolean;
};
export type VoiceTicket = { ok: true; urlPath: '/social-rtc'; token: string; channel: string; identity: string; muted: boolean; highQuality: boolean } | { ok: false; error: string; status: number };
export const VOICE_LIMITS = Object.freeze({ transports: 256, perUser: 1, payload: 128 * 1024, buffered: 512 * 1024, revalidateMs: 500, handshakeMs: 5000, ticketSeconds: 120 });
const opaque = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const domain = 'la3bak/social-voice/gateway/v1';
type Claim = { uid: string; roomId: string; councilId: string; epoch: string | number; iat: number; exp: number; iss: string; aud: string };
type Transport = { uid: string; access: MediaAccess; req: IncomingMessage; client?: WebSocket; upstream?: WebSocket; closed: boolean; removing?: Promise<void>; timer?: NodeJS.Timeout };
const raw = (data: RawData) => Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer);

/** Numeric private addresses only: no public upstream, DNS rebinding, redirects, credentials or path injection. */
export function privateVoiceUpstream(value: string): URL | null {
  try {
    const u = new URL(value), h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash || u.pathname !== '/') return null;
    const kind = isIP(h);
    const a = kind === 4 ? h.split('.').map(Number) : [];
    const privateIP = kind === 4 ? a[0] === 127 || a[0] === 10 || (a[0] === 172 && a[1] >= 16 && a[1] <= 31) || (a[0] === 192 && a[1] === 168) : kind === 6 && (h === '::1' || /^f[cd][0-9a-f]{2}:/.test(h));
    return privateIP ? u : null;
  } catch { return null; }
}
function jwt(payload: object, secret: string) {
  const body = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
// Narrow protobuf wire reader: strip SFU credentials without shipping a protocol runtime dependency.
// SignalResponse.refresh_token=16, room_moved=24; JoinResponse.alternative_url=7.
function fields(b: Buffer): { id: number; bytes: Buffer; value?: Buffer; scalar?: number }[] {
  let p = 0; const out: { id: number; bytes: Buffer; value?: Buffer; scalar?: number }[] = [];
  const number = () => { let n = 0, m = 1; for (let i = 0; i < 8; i++) { if (p >= b.length) throw new Error('bad_signal'); const v = b[p++]; n += (v & 127) * m; if (!(v & 128)) return n; m *= 128; } throw new Error('bad_signal'); };
  while (p < b.length) {
    const start = p, tag = number(), id = Math.floor(tag / 8), wire = tag & 7;
    if (!id) throw new Error('bad_signal');
    let value: Buffer | undefined, scalar: number | undefined;
    if (wire === 0) scalar = number();
    else if (wire === 1) p += 8;
    else if (wire === 5) p += 4;
    else if (wire === 2) { const n = number(); value = b.subarray(p, p + n); p += n; }
    else throw new Error('bad_signal');
    if (p > b.length) throw new Error('bad_signal');
    out.push({ id, bytes: b.subarray(start, p), value, scalar });
  }
  return out;
}
const varint = (value: number) => { const b: number[] = []; do { const n = value % 128; value = Math.floor(value / 128); b.push(n | (value ? 128 : 0)); } while (value); return Buffer.from(b); };
export function sanitizeVoiceSignal(data: Buffer, binary: boolean): Buffer | string | null {
  if (!binary) {
    const obj = JSON.parse(data.toString());
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('bad_signal');
    delete obj.refreshToken; delete obj.refresh_token; delete obj.roomMoved; delete obj.room_moved;
    if (obj.join) { delete obj.join.alternativeUrl; delete obj.join.alternative_url; }
    return Object.keys(obj).length ? JSON.stringify(obj) : null;
  }
  const chunks: Buffer[] = [];
  for (const f of fields(data)) {
    if (f.id === 16 || f.id === 24) continue;
    if (f.id === 1 && f.value) {
      const join = Buffer.concat(fields(f.value).filter(v => v.id !== 7).map(v => v.bytes));
      chunks.push(varint(10), varint(join.length), join);
    } else chunks.push(f.bytes);
  }
  return chunks.length ? Buffer.concat(chunks) : null;
}

/** LiveKit checks source grants, but video falsely labelled microphone needs an additional kind check. */
export function validVoiceRequest(data: Buffer, binary: boolean, muted: boolean): boolean {
  try {
    if (!binary) {
      const o = JSON.parse(data.toString()), keys = Object.keys(o);
      if (keys.length !== 1 || !['offer', 'answer', 'trickle', 'addTrack', 'mute', 'subscription', 'trackSetting', 'leave', 'subscriptionPermission', 'ping', 'pingReq', 'updateAudioTrack'].includes(keys[0])) return false;
      if (o.offer && /(?:^|\r?\n)m=video\s/i.test(o.offer.sdp || '')) return false;
      if (o.addTrack) return !muted && (o.addTrack.type === undefined || o.addTrack.type === 0 || o.addTrack.type === 'AUDIO') && (o.addTrack.source === 2 || o.addTrack.source === 'MICROPHONE');
      return true;
    }
    const top = fields(data);
    if (top.length !== 1 || ![1, 2, 3, 4, 5, 6, 7, 8, 11, 14, 16, 17].includes(top[0].id)) return false;
    const f = top[0];
    if (f.id === 1 && f.value && fields(f.value).some(v => v.id === 2 && v.value && /(?:^|\r?\n)m=video\s/i.test(v.value.toString()))) return false;
    if (f.id === 4) {
      if (muted || !f.value) return false;
      const add = fields(f.value), types = add.filter(v => v.id === 3), sources = add.filter(v => v.id === 8);
      return types.length <= 1 && (!types.length || types[0].scalar === 0) && sources.length === 1 && sources[0].scalar === 2;
    }
    return true;
  } catch { return false; }
}

export class SocialVoice {
  private base: URL | null;
  private reason: string;
  private stopped = false;
  private wss = new WebSocketServer({ noServer: true, maxPayload: VOICE_LIMITS.payload, perMessageDeflate: false });
  private records = new Map<string, Transport>();
  // An admitted epoch is revoked before removal starts. Memory bounded by current core membership:
  // old entries are discarded when access is absent or advances. No ticket/session tokens are stored.
  private revoked = new Map<string, string>();
  private sweeper: NodeJS.Timeout;
  constructor(private opts: SocialVoiceOptions) {
    this.base = privateVoiceUpstream(opts.upstream || '');
    this.reason = !opts.enabled ? 'Voice is disabled. Configure a private LiveKit SFU to enable it.' : !this.base ? 'Voice requires a numeric private HTTP(S) upstream origin.' : typeof opts.apiKey !== 'string' || !opts.apiKey || typeof opts.apiSecret !== 'string' || opts.apiSecret.length < 32 || typeof opts.cookieSecret !== 'string' || opts.cookieSecret.length < 32 ? 'Voice requires private SFU credentials and the application cookie secret (minimum 32 characters).' : ![opts.access, opts.authenticate, opts.originAllowed].every(fn => typeof fn === 'function') ? 'Voice requires application authentication, origin and membership callbacks.' : '';
    this.sweeper = setInterval(() => this.revalidate(), VOICE_LIMITS.revalidateMs); this.sweeper.unref();
    this.wss.on('error', () => undefined);
  }
  health() { return { enabled: !!this.opts.enabled, ready: !this.reason && !this.stopped, reason: this.stopped ? 'Voice service closed.' : this.reason || null, transports: this.records.size, maxTransports: VOICE_LIMITS.transports, maxPerUser: VOICE_LIMITS.perUser, revalidateMs: VOICE_LIMITS.revalidateMs, recording: false }; }
  private access(uid: string): MediaAccess | null {
    try {
      const a = this.opts.access(uid);
      if (!a || !opaque(uid) || ![a.id, a.roomId, a.councilId, a.channel].every(opaque) || !(typeof a.epoch === 'string' ? opaque(a.epoch) : Number.isSafeInteger(a.epoch) && a.epoch >= 0) || typeof a.muted !== 'boolean' || a.highQuality !== undefined && typeof a.highQuality !== 'boolean') return null;
      return { ...a, highQuality: a.highQuality ?? false };
    } catch { return null; }
  }
  private isRevoked(uid: string, a: MediaAccess) { return this.revoked.get(uid) === String(a.epoch); }
  ticket(userId: string): VoiceTicket {
    if (this.reason || this.stopped) return { ok: false, status: 503, error: this.stopped ? 'Voice service closed.' : this.reason };
    const a = this.access(userId);
    if (!a || this.isRevoked(userId, a)) return { ok: false, status: 403, error: 'Voice membership is unavailable or has changed. Join an authorized council again.' };
    const now = Math.floor(Date.now() / 1000);
    const token = jwt({ uid: userId, roomId: a.roomId, councilId: a.councilId, epoch: a.epoch, iat: now, exp: now + VOICE_LIMITS.ticketSeconds, iss: domain, aud: domain }, this.gatewayKey());
    return { ok: true, urlPath: '/social-rtc', token, channel: a.channel, identity: a.id, muted: a.muted, highQuality: a.highQuality ?? false };
  }
  private gatewayKey() { return createHmac('sha256', this.opts.cookieSecret).update(domain).digest('base64url'); }
  private authorize(req: IncomingMessage, url: URL): { uid: string; access: MediaAccess } | null {
    try {
      if (this.reason || this.stopped || !this.opts.originAllowed(req)) return null;
      const user = this.opts.authenticate(req), token = url.searchParams.get('access_token') || '';
      if (!user || token.length > 2048 || url.searchParams.getAll('access_token').length !== 1) return null;
      const parts = token.split('.'); if (parts.length !== 3) return null;
      const signature = createHmac('sha256', this.gatewayKey()).update(`${parts[0]}.${parts[1]}`).digest();
      const got = Buffer.from(parts[2], 'base64url');
      if (signature.length !== got.length || !timingSafeEqual(signature, got)) return null;
      const h = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const c = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as Claim;
      const now = Math.floor(Date.now() / 1000);
      if (h.alg !== 'HS256' || h.typ !== 'JWT' || c.iss !== domain || c.aud !== domain || c.uid !== user.id || !Number.isInteger(c.exp) || c.exp <= now || !Number.isInteger(c.iat) || c.iat > now + 5 || c.exp - c.iat > VOICE_LIMITS.ticketSeconds) return null;
      const a = this.access(user.id);
      return a && !this.isRevoked(user.id, a) && a.roomId === c.roomId && a.councilId === c.councilId && String(a.epoch) === String(c.epoch) ? { uid: user.id, access: a } : null;
    } catch { return null; }
  }
  private current(t: Transport) {
    try {
      const u = this.opts.authenticate(t.req), a = this.access(t.uid);
      return !this.stopped && u?.id === t.uid && a && !this.isRevoked(t.uid, a) && a.roomId === t.access.roomId && a.councilId === t.access.councilId && a.id === t.access.id && a.channel === t.access.channel && String(a.epoch) === String(t.access.epoch) && a.muted === t.access.muted && a.highQuality === t.access.highQuality;
    } catch { return false; }
  }
  private revalidate() {
    for (const [uid, epoch] of this.revoked) { const a = this.access(uid); if (!a || String(a.epoch) !== epoch) this.revoked.delete(uid); }
    for (const t of this.records.values()) if (t.closed || !this.current(t)) void this.remove(t).catch(() => undefined);
  }
  private serverToken(a: MediaAccess, admin = false) {
    const now = Math.floor(Date.now() / 1000);
    return jwt({ iss: this.opts.apiKey, sub: a.id, nbf: now - 5, exp: now + 60, video: admin ? { room: a.channel, roomAdmin: true, roomRecord: false } : { room: a.channel, roomJoin: true, canPublish: !a.muted, canPublishSources: ['microphone'], canPublishData: false, canSubscribe: true, canUpdateOwnMetadata: false, roomAdmin: false, roomRecord: false } }, this.opts.apiSecret);
  }
  private route(req: IncomingMessage) { try { return new URL(req.url || '/', 'http://gateway.invalid'); } catch { return null; } }
  async handleHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const u = this.route(req); if (!u || !(u.pathname === '/social-rtc' || u.pathname.startsWith('/social-rtc/'))) return false;
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
    if (!['/social-rtc/validate', '/social-rtc/rtc/validate'].includes(u.pathname) || req.method !== 'GET') { res.writeHead(404); res.end('{"ok":false,"error":"Unsupported voice route."}'); return true; }
    const a = this.authorize(req, u);
    res.writeHead(a ? 200 : this.reason ? 503 : 401); res.end(JSON.stringify({ ok: !!a, ...(a ? {} : { error: 'Voice authorization failed.' }) })); return true;
  }
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean {
    const u = this.route(req); if (!u || !(u.pathname === '/social-rtc' || u.pathname.startsWith('/social-rtc/'))) return false;
    const deny = (status: number) => { socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nCache-Control: no-store\r\nContent-Length: 0\r\n\r\n`); };
    // The pinned client explicitly uses dual-PC /rtc. No client-provided packed join request or sid is forwarded.
    if (!['/social-rtc', '/social-rtc/rtc'].includes(u.pathname) || (req.url?.length || 0) > 8192) { deny(400); return true; }
    const admission = this.authorize(req, u);
    if (!admission) { deny(this.reason ? 503 : 401); return true; }
    const { uid, access: a } = admission;
    if (this.records.has(uid) || this.records.size >= VOICE_LIMITS.transports) { deny(429); return true; }
    const t: Transport = { uid, access: a, req, closed: false }; this.records.set(t.uid, t);
    try {
      this.wss.handleUpgrade(req, socket, head, client => {
        t.client = client;
        client.on('error', () => { void this.remove(t).catch(() => undefined); });
        client.on('close', () => { void this.remove(t).catch(() => undefined); });
        if (t.closed || !this.current(t)) { void this.remove(t).catch(() => undefined); return; }
        const target = new URL('/rtc', this.base!); target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
        // All authorization and room selection are generated here, never taken from URL parameters.
        target.searchParams.set('access_token', this.serverToken(a));
        for (const key of ['protocol', 'client_protocol', 'sdk', 'version', 'auto_subscribe', 'adaptive_stream', 'disable_ice_lite', 'subscriber_allow_pause']) {
          const v = u.searchParams.get(key); if (v && /^[A-Za-z0-9_.-]{1,40}$/.test(v)) target.searchParams.set(key, v);
        }
        const upstream = new WebSocket(target, { maxPayload: VOICE_LIMITS.payload, perMessageDeflate: false, handshakeTimeout: VOICE_LIMITS.handshakeMs, followRedirects: false }); t.upstream = upstream;
        upstream.on('error', () => { void this.remove(t).catch(() => undefined); });
        upstream.on('close', () => { void this.remove(t).catch(() => undefined); });
        t.timer = setTimeout(() => { void this.remove(t).catch(() => undefined); }, VOICE_LIMITS.handshakeMs); t.timer.unref();
        upstream.on('open', () => { clearTimeout(t.timer); if (!this.current(t) || t.closed) void this.remove(t).catch(() => undefined); });
        client.on('message', (data, binary) => {
          if (!this.current(t) || t.closed) { void this.remove(t).catch(() => undefined); return; }
          if (upstream.readyState !== WebSocket.OPEN || upstream.bufferedAmount > VOICE_LIMITS.buffered) { void this.remove(t).catch(() => undefined); return; }
          if (!validVoiceRequest(raw(data), binary, a.muted)) { void this.remove(t).catch(() => undefined); return; }
          upstream.send(data, { binary }, e => { if (e) void this.remove(t).catch(() => undefined); });
        });
        upstream.on('message', (data, binary) => {
          if (!this.current(t) || t.closed || client.readyState !== WebSocket.OPEN || client.bufferedAmount > VOICE_LIMITS.buffered) { void this.remove(t).catch(() => undefined); return; }
          try { const clean = sanitizeVoiceSignal(raw(data), binary); if (clean !== null) client.send(clean, { binary }, e => { if (e) void this.remove(t).catch(() => undefined); }); }
          catch { void this.remove(t).catch(() => undefined); }
        });
      });
    } catch { socket.destroy(); void this.remove(t).catch(() => undefined); }
    return true;
  }
  private async remove(t: Transport): Promise<void> {
    if (t.removing) return t.removing;
    t.closed = true; clearTimeout(t.timer);
    // Close signaling first, preventing admission/reconnect races. Removing SFU media is awaited.
    const upstreamClosed = new Promise<void>(resolve => {
      if (!t.upstream || t.upstream.readyState === WebSocket.CLOSED) { resolve(); return; }
      t.upstream.once('close', () => resolve()); t.upstream.terminate();
    });
    t.client?.terminate();
    const task = (async () => {
      await upstreamClosed;
      const response = await fetch(new URL('/twirp/livekit.RoomService/RemoveParticipant', this.base!), {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(3000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.serverToken(t.access, true)}` }, body: JSON.stringify({ room: t.access.channel, identity: t.access.id })
      });
      if (!response.ok) {
        const body = await response.text();
        // Only explicit participant/room not_found is a successful absence, never generic HTTP 404.
        let code = ''; try { code = JSON.parse(body).code; } catch { /* fail closed */ }
        if (code !== 'not_found') throw new Error('Voice media removal failed. Transition must remain blocked.');
      } else await response.arrayBuffer();
      if (this.records.get(t.uid) === t) this.records.delete(t.uid);
    })();
    t.removing = task;
    try { await task; } catch { throw new Error('Voice media removal failed. Transition must remain blocked.'); }
    finally { if (t.removing === task) t.removing = undefined; }
  }
  async disconnectUser(uid: string): Promise<void> {
    const t = this.records.get(uid), a = this.access(uid);
    if (t || a) this.revoked.set(uid, String(a?.epoch ?? t!.access.epoch));
    if (t) await this.remove(t);
  }
  async close(): Promise<void> {
    this.stopped = true; clearInterval(this.sweeper);
    const outcomes = await Promise.allSettled([...this.records.values()].map(t => this.remove(t)));
    await new Promise<void>(resolve => this.wss.close(() => resolve()));
    if (outcomes.some(r => r.status === 'rejected')) throw new Error('Voice shutdown could not confirm SFU media removal.');
  }
}
