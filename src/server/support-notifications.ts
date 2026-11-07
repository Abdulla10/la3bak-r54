import { randomUUID } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,100}$/;
const int = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const text = (v: unknown, min: number, max: number) => {
  if (typeof v !== 'string') throw new SupportInputError('النص مطلوب.');
  const s = v.trim();
  if (s.length < min || s.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s)) throw new SupportInputError('طول النص أو محتواه غير صالح.');
  return s;
};
export class SupportInputError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
interface Reply { id: string; at: number; actor: string; body: string }
interface Ticket { id: string; by: string; at: number; subject: string; body: string; status: 'open' | 'answered' | 'closed'; replies: Reply[] }
interface Notice { id: string; at: number; title: string; body: string; actor: string; to: string[]; read: string[] }
interface Receipt { fingerprint: string; result: string }
interface Data { v: 1; tickets: Ticket[]; notices: Notice[]; receipts: Record<string, Receipt> }
const validTicket = (t: unknown) => isObj(t) && typeof t.id === 'string' && UUID.test(t.id) && typeof t.by === 'string' && UUID.test(t.by) && int(t.at)
  && typeof t.subject === 'string' && t.subject.length > 0 && t.subject.length <= 100 && typeof t.body === 'string' && t.body.length <= 2000
  && ['open', 'answered', 'closed'].includes(String(t.status)) && Array.isArray(t.replies) && t.replies.every((r) => isObj(r) && typeof r.id === 'string' && UUID.test(r.id) && int(r.at) && typeof r.actor === 'string' && r.actor.length <= 100 && typeof r.body === 'string' && r.body.length <= 2000);
const validNotice = (n: unknown) => isObj(n) && typeof n.id === 'string' && UUID.test(n.id) && int(n.at) && typeof n.title === 'string' && n.title.length > 0 && n.title.length <= 100
  && typeof n.body === 'string' && n.body.length <= 2000 && typeof n.actor === 'string' && n.actor.length <= 100 && Array.isArray(n.to) && n.to.every((id) => typeof id === 'string' && UUID.test(id))
  && new Set(n.to).size === n.to.length && Array.isArray(n.read) && n.read.every((id) => typeof id === 'string' && (n.to as string[]).includes(id)) && new Set(n.read).size === n.read.length;
export const validSupportNotifications = (d: Record<string, unknown>) => d.v === 1 && Array.isArray(d.tickets) && d.tickets.every(validTicket)
  && new Set(d.tickets.map((t) => (t as Ticket).id)).size === d.tickets.length && Array.isArray(d.notices) && d.notices.every(validNotice)
  && new Set(d.notices.map((n) => (n as Notice).id)).size === d.notices.length && isObj(d.receipts)
  && Object.entries(d.receipts).every(([key, r]) => key.length <= 200 && isObj(r) && typeof r.fingerprint === 'string' && typeof r.result === 'string');

/** تذاكر وإشعارات داخلية فقط؛ لا بريد أو دفع أو قناة خارجية. دائمة داخل الكاتب الواحد. */
export class SupportNotifications {
  private data: Data = { v: 1, tickets: [], notices: [], receipts: {} };
  private disk: Persister;
  readonly persistent: boolean;
  constructor(file = '', private now: () => number = Date.now, mon = new StorageMonitor()) {
    this.persistent = !!file;
    const loaded = file ? loadJsonFile(file, validSupportNotifications) : null;
    if (loaded) this.data = loaded as unknown as Data;
    this.disk = new Persister('support-notifications', file, () => this.data, now, mon, validSupportNotifications);
  }
  private user(id: string) { if (!UUID.test(id)) throw new SupportInputError('حساب غير صالح.'); }
  private tx<T>(fn: () => T): T {
    const before = structuredClone(this.data);
    try { const out = fn(); this.disk.mustSave(); return out; }
    catch (e) { this.data = before; throw e; }
  }
  private replay(key: string, fp: string): string | null {
    const old = this.data.receipts[key];
    if (old && old.fingerprint !== fp) throw new SupportInputError('المفتاح مستخدم لطلب مختلف.', 409);
    return old?.result ?? null;
  }
  createTicket(id: string, raw: { subject?: unknown; body?: unknown; key?: unknown }) {
    this.user(id); const subject = text(raw.subject, 3, 100), body = text(raw.body, 3, 2000);
    if (typeof raw.key !== 'string' || !KEY.test(raw.key)) throw new SupportInputError('معرف الطلب مطلوب.');
    const key = 'ticket:' + id + ':' + raw.key, fp = JSON.stringify([subject, body]);
    const old = this.replay(key, fp);
    if (old) return { ticket: this.ticket(id, old), duplicate: true };
    if (this.data.tickets.filter((t) => t.by === id && t.status !== 'closed').length >= 10) throw new SupportInputError('عندك عشرة طلبات مفتوحة. انتظر الرد عليها أول.', 429);
    return this.tx(() => {
      const ticket: Ticket = { id: randomUUID(), by: id, at: this.now(), subject, body, status: 'open', replies: [] };
      this.data.tickets.push(ticket); this.data.receipts[key] = { fingerprint: fp, result: ticket.id };
      return { ticket: this.ticket(id, ticket.id), duplicate: false };
    });
  }
  ticket(id: string, ticketId: string) {
    this.user(id); const t = this.data.tickets.find((x) => x.id === ticketId && x.by === id);
    if (!t) throw new SupportInputError('الطلب غير موجود.', 404);
    const { by: _by, ...safe } = t; return structuredClone(safe);
  }
  tickets(id: string) { this.user(id); return this.data.tickets.filter((t) => t.by === id).slice(-100).reverse().map((t) => this.ticket(id, t.id)); }
  adminTickets(status = '', offset = 0, limit = 50) {
    if (status && !['open', 'answered', 'closed'].includes(status)) throw new SupportInputError('حالة غير صالحة.');
    const rows = this.data.tickets.filter((t) => !status || t.status === status).slice().reverse();
    return { total: rows.length, list: structuredClone(rows.slice(Math.max(0, Math.floor(offset)), Math.max(0, Math.floor(offset)) + Math.max(1, Math.min(100, Math.floor(limit) || 50)))) };
  }
  reply(ticketId: string, bodyInput: unknown, actorInput: unknown, ref: string) {
    const body = text(bodyInput, 3, 2000), actor = text(actorInput, 1, 100);
    if (!KEY.test(ref)) throw new SupportInputError('معرف الرد مطلوب.');
    const t = this.data.tickets.find((x) => x.id === ticketId);
    if (!t) throw new SupportInputError('الطلب غير موجود.', 404);
    const key = 'reply:' + ref, fp = JSON.stringify([ticketId, body, actor]);
    const old = this.replay(key, fp); if (old) return { ok: true, duplicate: true, ticket: this.ticket(t.by, t.id) };
    return this.tx(() => {
      const reply: Reply = { id: randomUUID(), at: this.now(), actor, body }; t.replies.push(reply); t.status = 'answered';
      this.data.receipts[key] = { fingerprint: fp, result: reply.id };
      const notice: Notice = { id: randomUUID(), at: this.now(), title: 'وصل رد على طلب الدعم', body, actor, to: [t.by], read: [] };
      this.data.notices.push(notice);
      return { ok: true, duplicate: false, ticket: this.ticket(t.by, t.id) };
    });
  }
  closeTicket(id: string, ticketId: string) {
    this.user(id); const t = this.data.tickets.find((x) => x.id === ticketId && x.by === id);
    if (!t) throw new SupportInputError('الطلب غير موجود.', 404);
    if (t.status === 'closed') return { ok: true, duplicate: true };
    return this.tx(() => { t.status = 'closed'; return { ok: true, duplicate: false }; });
  }
  /** المستلمون يختارهم الخادم من الحسابات الفعلية فقط؛ الدالة لا تقرأ UUIDs من طلب العميل. */
  announce(recipients: string[], titleInput: unknown, bodyInput: unknown, actorInput: unknown, ref: string) {
    const title = text(titleInput, 3, 100), body = text(bodyInput, 3, 2000), actor = text(actorInput, 1, 100);
    if (!KEY.test(ref)) throw new SupportInputError('معرف الإشعار مطلوب.');
    const to = [...new Set(recipients)].sort(); to.forEach((id) => this.user(id));
    const fp = JSON.stringify([to, title, body, actor]), key = 'announce:' + ref;
    const old = this.replay(key, fp); if (old) return { ok: true, duplicate: true, id: old, beneficiaries: to.length };
    return this.tx(() => {
      const n: Notice = { id: randomUUID(), at: this.now(), title, body, actor, to, read: [] };
      this.data.notices.push(n); this.data.receipts[key] = { fingerprint: fp, result: n.id };
      return { ok: true, duplicate: false, id: n.id, beneficiaries: to.length };
    });
  }
  inbox(id: string) {
    this.user(id); const mine = this.data.notices.filter((n) => n.to.includes(id));
    return { unread: mine.filter((n) => !n.read.includes(id)).length, list: mine.slice(-100).reverse().map(({ to: _to, read, ...n }) => ({ ...structuredClone(n), read: read.includes(id) })) };
  }
  markRead(id: string, noticeId: string) {
    this.user(id); const n = this.data.notices.find((x) => x.id === noticeId && x.to.includes(id));
    if (!n) throw new SupportInputError('الإشعار غير موجود.', 404);
    if (n.read.includes(id)) return { ok: true, duplicate: true };
    return this.tx(() => { n.read.push(id); return { ok: true, duplicate: false }; });
  }
  retry() { this.disk.retry(); }
  unsaved() { return this.disk.unsaved; }
}
