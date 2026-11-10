import { fuzzyScore } from './fuzzy-ar.js';
import { randomUUID } from 'node:crypto';
import { RANK_PERK_ITEMS } from './rank-perks-r56.js';
const perkName = (id: string) => RANK_PERK_ITEMS.find((i) => i.id === id)?.name ?? 'مقتنى خاص';
import type { Accounts } from './account.js';
import type { AccountTools } from './account-tools.js';
import type { Community } from './community.js';
import type { SocialPrivate } from './social-private.js';
import type { MissionsServer } from './missions-server.js';
import type { RankRewards } from './rank-rewards.js';
import type { ProgressSystem } from './progression.js';
import type { Platform } from './platform.js';
import type { SupportNotifications } from './support-notifications.js';
import { FunctionalHttp, FunctionalHttpError, type FunctionalContext } from './functional-http.js';

interface FunctionalServices {
  accountTools: AccountTools; social: SocialPrivate; missions: MissionsServer;
  rankRewards: RankRewards; support: SupportNotifications; accounts: Accounts;
  platform: Platform; community: Community; online: () => string[];
  unsearchable?: (id: string) => boolean;
}
function need(condition: unknown, text: string, status = 400): asserts condition { if (!condition) throw new FunctionalHttpError(status, text); }
const key = (v: unknown): string => { need(typeof v === 'string' && /^[A-Za-z0-9:_-]{8,100}$/.test(v), 'معرّف العملية مطلوب.'); return v as string; };
const actor = (ctx: FunctionalContext) => { need(ctx.actor, 'تسجيل الإدارة مطلوب.', 401); return ctx.actor!; };
const only = (body: Record<string, unknown>, keys: string[]) => need(Object.keys(body).every((k) => keys.includes(k)), 'الطلب يحتوي حقول غير مسموحة.');
const page = (url: URL) => ({ before: url.searchParams.get('before') ?? undefined, limit: url.searchParams.get('limit') ?? undefined });

export function wireFunctionalRoutes(http: FunctionalHttp, d: FunctionalServices) {
  const peer = (raw: unknown) => { const id = d.community.resolvePublicId(raw); need(id && !d.platform.isBanned(id), 'الحساب غير متاح.', 404); return id!; };
  const audit = (ctx: FunctionalContext, action: string, detail: string, target = '') => {
    const a = actor(ctx);
    d.platform.audit({ actorId: a.id, actor: a.name, role: a.role, action, target, detail });
  };
  http.add('GET', '/api/account-tools/settings', ({ user }) => d.accountTools.settings(user.id));
  http.add('PATCH', '/api/account-tools/settings', ({ user, body }) => d.accountTools.updateSettings(user.id, body));
  http.add('GET', '/api/account-tools/verification', ({ user }) => d.accountTools.verification(user.id));
  http.add('POST', '/api/account-tools/verification', ({ user, body }) => { only(body, ['reason']); return d.accountTools.requestVerification(user.id, body.reason); });

  http.add('GET', '/api/social-private/friends', ({ user, url }) => ({ ...d.social.friends(user.id, page(url)), requests: d.social.requests(user.id).list, outgoing: d.social.requests(user.id, { direction: 'outgoing' }).list }));
  http.add('GET', '/api/social-private/friend-requests', ({ user, url }) => d.social.requests(user.id, { ...page(url), direction: url.searchParams.get('direction') ?? undefined }));
  http.add('POST', '/api/social-private/friend-requests', ({ user, body }) => { only(body, ['to', 'key']); return d.social.request(user.id, peer(body.to)); });
  http.add('POST', '/api/social-private/friend-requests/:id/accept', ({ user, params, body }) => { only(body, ['key']); return d.social.accept(user.id, params.id); });
  http.add('POST', '/api/social-private/friend-requests/:id/reject', ({ user, params, body }) => { only(body, ['key']); return d.social.reject(user.id, params.id); });
  http.add('DELETE', '/api/social-private/friends/:id', ({ user, params }) => d.social.remove(user.id, peer(params.id)));
  http.add('GET', '/api/social-private/search', ({ user, url }) => {
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 30); need(q.length >= 2 || /^[1-9][0-9]*$/.test(q), 'اكتب حرفين أو ID مميز.');
    // R69ze: بحث ذكي يتحمل الأخطاء ويوحّد الحروف
    const list = d.accounts.all().filter((p) => p.id !== user.id && !d.platform.isBanned(p.id) && !d.community.pairBlocked(user.id, p.id) && !(d.unsearchable?.(p.id)))
      .map((p) => ({ p, s: d.accounts.publicPlayerId(p.id) === q || d.accounts.displayPlayerId(p.id) === q ? 200 : fuzzyScore(q, p.name) })).filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s).slice(0, 20).map((x) => x.p)
      .map((p) => ({ pub: d.community.pub(p.id), name: p.name, playerId: d.accounts.displayPlayerId(p.id), originalPlayerId: d.accounts.publicPlayerId(p.id) }));
    return { list };
  });
  http.add('GET', '/api/social-private/messages', ({ user, url }) => d.social.conversation(user.id, peer(url.searchParams.get('peer')), page(url)));
  http.add('POST', '/api/social-private/messages', ({ user, body }) => { only(body, ['to', 'text', 'key']); return d.social.send(user.id, peer(body.to), { body: body.text, ref: key(body.key) }); });
  http.add('POST', '/api/social-private/messages/:id/read', ({ user, params, body }) => { only(body, []); return d.social.markRead(user.id, [Number(params.id)]); });
  http.add('GET', '/api/social-private/inbox', ({ user, url }) => d.social.inbox(user.id, page(url)));
  http.add('GET', '/api/social-private/settings', ({ user }) => d.social.settings(user.id));
  http.add('PATCH', '/api/social-private/settings', ({ user, body }) => { only(body, ['dmEnabled']); return d.social.setDMEnabled(user.id, body.dmEnabled); });

  http.add('GET', '/api/missions', ({ user }) => d.missions.view(user.id));
  http.add('POST', '/api/missions/:id/claim', async ({ user, params, body }) => { only(body, []); const result = await d.missions.claim(user.id, params.id); need(result.ok, 'المهمة غير مستحقة أو تعذّر استلامها.', 409); return result; });
  http.add('GET', '/api/admin/missions', () => ({ definitions: d.missions.definitions() }), 'owner');
  http.add('POST', '/api/admin/missions', (ctx) => { only(ctx.body, ['definitions', 'reason', 'key']); key(ctx.body.key); const result = d.missions.configure(ctx.body.definitions, actor(ctx)); audit(ctx, 'missions.configure', 'تعديل تعريفات المهام الخادمية'); return { ok: true, definitions: result.definitions }; }, 'owner');
  http.add('GET', '/api/admin/rank-rewards', () => ({ policies: d.rankRewards.configView() }), 'owner');
  http.add('POST', '/api/admin/rank-rewards', (ctx) => { only(ctx.body, ['policies', 'reason', 'key']); key(ctx.body.key); const who=actor(ctx);need(typeof ctx.body.reason==='string'&&ctx.body.reason.trim().length>=3&&ctx.body.reason.length<=180,'سبب التعديل مطلوب.');const receipt=d.rankRewards.configureReceipt(ctx.body.policies,{actorId:who.id,key:String(ctx.body.key),reason:ctx.body.reason});if(!receipt.duplicate)audit(ctx, 'rank-rewards.configure',ctx.body.reason);return {ok:true,...receipt}; }, 'owner');
  http.add('GET', '/api/rank-rewards', ({ user }) => {
    const view = d.rankRewards.view(user.id);
    return { list: view.policies.map((p) => ({ id: p.system + ':' + p.rank, label: `${p.system.toUpperCase()} ${p.rank}`, system: p.system, rank: p.rank,
      description: p.rewards.map((r) => r.type === 'currency' ? `${r.cur === 'gems' ? r.amount * 20 : r.amount} عملة` : perkName(r.itemId)).join(' + '),
      fingerprint: p.fingerprint, eligible: p.eligible, claimed: p.status === 'claimed', pending: p.status === 'pending', claimable: p.claimable || p.status === 'pending' })), claims: view.claims };
  });
  http.add('POST', '/api/rank-rewards/:id/claim', async ({ user, params, body }) => {
    only(body, ['fingerprint']); const [system, rank] = params.id.split(':'); need(['level', 'vip', 'noble'].includes(system) && /^[1-9]\d*$/.test(rank), 'رتبة غير صالحة.');
    const result = await d.rankRewards.claim(user.id, system as ProgressSystem, Number(rank), typeof body.fingerprint === 'string' ? body.fingerprint : undefined);
    need(result.ok, 'المكافأة غير مستحقة أو تعذّر استلامها.', 409); return result;
  });

  http.add('GET', '/api/support/tickets', ({ user }) => ({ list: d.support.tickets(user.id) }));
  http.add('POST', '/api/support/tickets', ({ user, body }) => { only(body, ['subject', 'body', 'key']); return d.support.createTicket(user.id, body); });
  http.add('GET', '/api/support/tickets/:id', ({ user, params }) => d.support.ticket(user.id, params.id));
  http.add('POST', '/api/support/tickets/:id/close', ({ user, params, body }) => { only(body, []); return d.support.closeTicket(user.id, params.id); });
  http.add('GET', '/api/notifications-internal', ({ user }) => d.support.inbox(user.id));
  http.add('POST', '/api/notifications-internal/:id/read', ({ user, params, body }) => { only(body, []); return d.support.markRead(user.id, params.id); });
  http.add('GET', '/api/admin/support-notifications/tickets', ({ url }) => d.support.adminTickets(url.searchParams.get('status') ?? '', Number(url.searchParams.get('offset') ?? 0)), 'support');
  http.add('POST', '/api/admin/support-notifications/tickets/:id/reply', (ctx) => {
    only(ctx.body, ['body', 'key']); const a = actor(ctx); const result = d.support.reply(ctx.params.id, ctx.body.body, a.name, key(ctx.body.key));
    if (!result.duplicate) audit(ctx, 'support.reply', 'رد على طلب دعم', ctx.params.id); return result;
  }, 'support');
  const previews = new Map<string, { owner: string; expires: number; recipients: string[]; title: string; body: string; key: string }>();
  http.add('POST', '/api/admin/support-notifications/announcements/preview', (ctx) => {
    only(ctx.body, ['title', 'body', 'filter', 'key']); const a = actor(ctx), at = Date.now();
    for (const [id, p] of previews) if (p.expires < at) previews.delete(id);
    need(previews.size < 50, 'معاينات كثيرة، أكمل الحالية أول.', 429);
    need(typeof ctx.body.title === 'string' && ctx.body.title.trim().length >= 3 && ctx.body.title.length <= 100, 'عنوان غير صالح.');
    need(typeof ctx.body.body === 'string' && ctx.body.body.trim().length >= 3 && ctx.body.body.length <= 2000, 'محتوى غير صالح.');
    need(ctx.body.filter === 'all' || ctx.body.filter === 'active', 'فئة غير صالحة.');
    const online = new Set(d.online());
    const recipients = d.accounts.all().filter((p) => ctx.body.filter === 'all' || online.has(p.id)).map((p) => p.id);
    const token = randomUUID(); previews.set(token, { owner: a.id, expires: at + 600000, recipients, title: ctx.body.title.trim(), body: ctx.body.body.trim(), key: key(ctx.body.key) });
    return { token, beneficiaries: recipients.length, expiresAt: at + 600000 };
  }, 'owner');
  http.add('POST', '/api/admin/support-notifications/announcements', (ctx) => {
    only(ctx.body, ['token']); const a = actor(ctx); const p = previews.get(String(ctx.body.token));
    need(p && p.owner === a.id && p.expires >= Date.now(), 'المعاينة انتهت أو غير صالحة. أنشئ معاينة جديدة.', 409);
    const result = d.support.announce(p.recipients, p.title, p.body, a.name, p.key);
    if (!result.duplicate) audit(ctx, 'notification.broadcast', `إشعار داخلي إلى ${result.beneficiaries} حساب: ${p.title}`); return result;
  }, 'owner');
  return http;
}
