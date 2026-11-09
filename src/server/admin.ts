import { GIFT_REWARD_POLICY, quoteGiftRewards } from './gift-rewards.js';
import { BulkGrantError, type BulkGrants } from './bulk-grants.js';
import { EconomyInputError, type Economy } from './economy.js';
import { createHash, timingSafeEqual } from 'node:crypto';
import type http from 'node:http';
import { MILESTONES } from './catalog.js';
import { PRESETS, ShopInputError, SHOP_PRICE_MAX as PRICE_MAX, type ShopCatalog } from './shopcatalog.js';
import { StorageError, STORAGE_MSG, StorageMonitor, Persister, loadJsonFile, isObj } from './datafile.js';
import type { Accounts } from './account.js';
import type { Leaderboard } from './leaderboard.js';
import { START_COINS, type Wallet, type BulkReward } from './wallet.js';
import type { RoomService } from './rooms.js';
import type { RoomStore } from './store.js';
import { CommunityError, type Community } from './community.js';
import { RARITY, type GiftCatalog } from './giftcatalog.js';
import type { Config } from './config.js';
import { KeyedLimiter } from './ratelimit.js';
import { ADJ_PENDING_PER_ACTOR, can, ROLES, ROLE_LABEL, ROLE_PERMS, type Perm, type Platform, type Role } from './platform.js';
import type { Progression } from './progression.js';
import type { Payments } from './payments.js';
import { adminDashboard, type DashboardPeriod } from './admin-dashboard.js';

/**
 * واجهة الإدارة (HTTP/JSON تحت /api/admin/). الصلاحيات تُفحص هنا بالخادم لكل طلب؛ الواجهة تخفي الأزرار فقط ولا تُعتمد للحماية.
 * الهوية: رمز الإدارة الاستثنائي ADMIN_TOKEN (دور مالك، من البيئة فقط) أو جلسة لاعب مسجّل بالطاقم بدور.
 * كل عملية تغيّر شيئاً تُسجَّل بسجل التدقيق (من فعل، ماذا، على من، لماذا).
 */
export interface Actor { id: string; name: string; role: Role; token: boolean }
export interface AdminAccountTools {
  verificationList(status?: 'pending' | 'accepted' | 'rejected' | 'revoked', offset?: number, limit?: number): unknown;
  decideVerification(requestId: string, decision: 'accepted' | 'rejected', reason: string, actor: Actor, ref: string): unknown;
  revokeVerification(playerId: string, reason: string, actor: Actor, ref: string): unknown;
}
interface BulkPlan {
  operationId: string; actorId: string; inputFingerprint: string; fingerprint: string; walletFingerprint: string;
  filter: string; from: number; to: number; reason: string; rewards: BulkReward[]; recipients: { id: string; name: string }[];
  createdAt: number; state: 'preview' | 'executing' | 'done';
  result?: Record<string, unknown>;
}
const bulkHash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const validAdminBulkStore = (v: Record<string, unknown>) => v.v === 1 && isObj(v.plans) && Object.values(v.plans).every((p) =>
  isObj(p) && typeof p.operationId === 'string' && typeof p.actorId === 'string' && typeof p.inputFingerprint === 'string'
  && typeof p.fingerprint === 'string' && typeof p.walletFingerprint === 'string' && Array.isArray(p.rewards)
  && p.rewards.length >= 1 && p.rewards.length <= 20 && p.rewards.every((r) => isObj(r) && (r.type === 'currency'
    ? (r.cur === 'coins' || r.cur === 'gems') && Number.isSafeInteger(r.amount) && Number(r.amount) > 0
    : r.type === 'item' && r.mode === 'grant' && typeof r.itemId === 'string'))
  && ['all', 'active', 'recent', 'date-range'].includes(String(p.filter)) && Number.isSafeInteger(p.from) && Number.isSafeInteger(p.to)
  && Number.isSafeInteger(p.createdAt) && typeof p.reason === 'string'
  && Array.isArray(p.recipients) && p.recipients.every((r) => isObj(r) && typeof r.id === 'string' && typeof r.name === 'string')
  && ['preview', 'executing', 'done'].includes(String(p.state)) && (p.result === undefined || isObj(p.result)));
/** ملف إضافي مستقل: النية تُحفظ قبل Wallet.grantBulk، ولا تُحذف البصمات لمنع إعادة تشغيل معرف بمحتوى مختلف. */
export class AdminBulkStore {
  private data: { v: 1; plans: Record<string, BulkPlan> } = { v: 1, plans: {} };
  private disk: Persister;
  readonly persistent: boolean;
  constructor(file = '', now: () => number = Date.now, mon = new StorageMonitor()) {
    this.persistent = !!file;
    if (file) { const data = loadJsonFile(file, validAdminBulkStore); if (data) this.data = data as unknown as typeof this.data; }
    this.disk = new Persister('admin-bulk', file, () => this.data, now, mon, validAdminBulkStore);
  }
  get(id: string) { const plan = Object.hasOwn(this.data.plans, id) ? this.data.plans[id] : null; return plan ? structuredClone(plan) : null; }
  put(plan: BulkPlan) {
    if (['__proto__', 'constructor', 'prototype'].includes(plan.operationId)) throw new RangeError('bulk_operation_invalid');
    const before = this.data.plans[plan.operationId]; this.data.plans[plan.operationId] = structuredClone(plan);
    try { this.disk.mustSave(); } catch (e) { if (before) this.data.plans[plan.operationId] = before; else delete this.data.plans[plan.operationId]; throw e; }
  }
  retry() { this.disk.retry(); }
}
export interface AdminDeps {
  community: Community;
  economy?: Economy;
  accountTools?: AdminAccountTools;
  bulkStore?: AdminBulkStore;
  bulkGrants?: BulkGrants;
  payments?: Payments;
  giftcat: GiftCatalog;
  platform: Platform; shopcat: ShopCatalog; wallet: Wallet; accounts: Accounts; board: Leaderboard; progression: Progression; service: RoomService; store: RoomStore; storage: StorageMonitor; cfg: Config;
  registry: { list(): { id: string; name: string }[] };
  sockets: Map<string, Set<unknown>>;
  kick(id: string, why: 'banned' | 'maintenance'): void;
  walletChanged?(id: string): void;
  errors(): { ts: string; event: string; data: Record<string, unknown> }[];
  json(res: http.ServerResponse, code: number, body: unknown): void;
  readBody(req: http.IncomingMessage, limit?: number): Promise<string>;
  sameOrigin(req: http.IncomingMessage): boolean;
  ipOf(req: http.IncomingMessage): string;
  log(event: string, data?: Record<string, unknown>): void;
  token(): string;
  now?: () => number;
  /** R61 */
  backups?: import('./backup-r61.js').Backups;
  offers?: import('./shop-offers-r62.js').ShopOffers;
  health?(): Promise<unknown>;
}

const UUID = /^[0-9a-f-]{36}$/;
const RANK: Record<Role, number> = { support: 1, moderator: 2, admin: 3, owner: 4 };
const clean = (s: unknown, max: number) => String(s ?? '').replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
class HttpErr extends Error { constructor(public code: number, msg: string) { super(msg); } }

export function createAdmin(d: AdminDeps) {
  const now = d.now ?? Date.now;
  const { platform: P } = d;
  const bulkStore = d.bulkStore ?? new AdminBulkStore(d.cfg.walletFile ? d.cfg.walletFile + '.admin-bulk.json' : '', now, d.storage);
  const bulkInFlight = new Map<string, Promise<Record<string, unknown>>>();
  const authLimiter = new KeyedLimiter(20, 20 / 60);
  const apiLimiter = new KeyedLimiter(240, 4);

  // قياس تأخر حلقة الأحداث (للمراقبة فقط)
  let lag = 0, last = now();
  const lagTimer = setInterval(() => { const t = now(); lag = Math.max(0, t - last - 1000); last = t; }, 1000);
  lagTimer.unref?.();

  function actorOf(req: http.IncomingMessage, user: { id: string; name: string } | null): Actor | null {
    const tok = d.token();
    const bearer = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (bearer) return tok && safeEq(bearer, tok) ? { id: 'token', name: 'رمز الإدارة', role: 'owner', token: true } : null;
    const role = user ? P.roleOf(user.id) : null;
    return user && role ? { id: user.id, name: user.name, role, token: false } : null;
  }
  const need = (a: Actor, perm: Perm) => { if (!can(a.role, perm)) throw new HttpErr(403, 'ما عندك صلاحية لهذا الإجراء.'); };
  const needBulk = (a: Actor) => { if (a.role !== 'owner' && !P.bulkGrantAllowed(a.id)) throw new HttpErr(403, 'المنح الجماعي للمالك أو المفوّض صراحة فقط.'); };
  /** التدقيق بعد تغيير محفوظ بملف مختلف: لو فشل تسجيله نبلّغ بدل ما نوهم بفشل العملية */
  const safeAudit = (a: Actor, action: string, target: string, detail: string) => { try { audit(a, action, target, detail); return true; } catch { d.log('admin_audit_failed', { action }); return false; } };
  const audit = (a: Actor, action: string, target: string, detail: string) => P.audit({ actorId: a.id, actor: a.name, role: a.role, action, target, detail: clean(detail, 300) });
  /** سجل تدقيق جاهز يُمرَّر لعملية المنصة ليُحفظ معها بخطوة وحدة */
  const ent = (a: Actor, action: string, target: string, detail: string) => ({ actorId: a.id, actor: a.name, role: a.role, action, target, detail: clean(detail, 300) });
  const nameOf = (id: string) => d.accounts.nameOf(id) || '—';
  const rawXp = (id: string, legacyXp: number) => typeof d.accounts.rawXp === 'function' ? d.accounts.rawXp(id) : legacyXp;
  // A notification failure must not turn a durable adjustment into a retryable
  // financial error. The hook reads canonical balances, never request deltas.
  const notifyWallet = (id: string) => { try { d.walletChanged?.(id); } catch { /* committed balance remains authoritative */ } };

  const ADJ_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
  const fpOf = (...a: (string | number)[]) => createHash('sha256').update(JSON.stringify(a)).digest('hex').slice(0, 16);
  /**
   * إتمام موافقة بدأت (approving): تعديل المحفظة بمفتاح عملية idempotent `req:<id>` ثم تثبيت الحالة والتدقيق بحفظ واحد.
   * قابل للاستئناف: لو انقطع الخادم قبل تعديل المحفظة يُنفَّذ عند الاستئناف، ولو بعده يرجع المفتاح نفس النتيجة (dup) فلا يتكرر التعديل.
   * StorageError يترك الطلب approving للمحاولة التالية. يرجع الطلب النهائي أو null لو لم يكن approving.
   */
  function settleApproval(rid: string, resumed: boolean) {
    const rq = P.adjGet(rid); if (!rq || rq.status !== 'approving') return null;
    const r = d.wallet.adminAdjust(rq.target, rq.cur, rq.delta, `إدارة: ${rq.reason} (طلب ${rq.by.name}، موافقة ${rq.decidedBy})`, 'req:' + rq.id);
    const who = rq.decidedBy ?? '—', base = `${rq.cur} ${rq.delta > 0 ? '+' : ''}${rq.delta} · ${rq.reason} · طلب ${rq.by.name} (${rq.by.role}) · وافق ${who}`;
    const au = (action: string, extra: string) => () => ({ actorId: rq.decidedById ?? 'token', actor: who, role: 'owner' as Role, action, target: rq.target, detail: clean(base + extra, 300) });
    if (!r.ok) return P.finishAdj(rid, { ok: false, note: r.code === 'poor' ? 'الرصيد لا يكفي وقت التنفيذ' : 'تعديل غير صالح' }, au('wallet.approve-failed', ''));
    const finished = P.finishAdj(rid, { ok: true, before: r.before, after: r.after }, au('wallet.adjust', ` · قبل ${r.before} ← بعد ${r.after}${resumed || r.dup ? ' · (استُكمل بعد انقطاع)' : ''}`));
    notifyWallet(rq.target);
    return finished;
  }
  /** يستكمل كل الموافقات العالقة (approving). يُنادى عند الإقلاع ومع إعادة محاولة التخزين. يرجع عدد المستكمل */
  function resumeApprovals(): number {
    let n = 0;
    for (const r of P.approvingList()) {
      try { if (settleApproval(r.id, true)) n++; } catch (e) { if (e instanceof StorageError) { d.log('adj_resume_unsaved', { store: e.store }); break; } throw e; }
    }
    if (n) d.log('adj_resumed', { count: n });
    return n;
  }

  /** حارس الصيانة: يرجع رسالة المنع للمستخدم العادي، وnull لو مسموح (الصيانة مطفأة أو هو من الطاقم) */
  function maintenanceBlock(user: { id: string } | null): string | null {
    const m = P.maintenance();
    if (!m.on) return null;
    if (user && P.roleOf(user.id)) return null;
    return m.message;
  }
  function banBlock(user: { id: string } | null): string | null {
    const b = user ? P.banOf(user.id) : null;
    return b ? 'تم إيقاف حسابك من الإدارة.' + (b.reason ? ` السبب: ${b.reason}` : '') : null;
  }

  // ---- مصادر البيانات ----
  const rooms = async () => (await d.service.adminRooms()).map((r) => ({
    code: r.code, gameId: r.gameId, mode: r.mode, status: r.status, seats: r.seats, stake: r.stake ?? 0, gameNo: r.gameNo ?? 0, createdAt: r.createdAt, updatedAt: r.updatedAt,
    players: r.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, left: p.left, online: p.bot ? true : d.sockets.has(p.id) })),
  }));

  async function overview(period: DashboardPeriod, actor: Actor) {
    const rs = await rooms();
    const byStatus: Record<string, number> = {}, byGame: Record<string, number> = {};
    for (const r of rs) { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; byGame[r.gameId] = (byGame[r.gameId] ?? 0) + 1; }
    const t = d.wallet.totals();
    const players = d.accounts.all();
    const day = now() - 86400_000;
    return {
      online: { users: d.sockets.size, connections: [...d.sockets.values()].reduce((n, s) => n + s.size, 0) },
      rooms: { total: rs.length, byStatus, byGame, playing: rs.filter((r) => r.status === 'playing').length },
      players: { total: players.length, new24h: players.filter((p) => p.since >= day).length, banned: P.bans().length },
      games: { catalog: d.registry.list().length, recorded: d.accounts.recordedCount(), perGame: d.accounts.gameTotals() },
      economy: { accounts: t.accounts, coins: t.coins, gems: t.gems, settledGames: t.settledGames, pendingPayouts: d.wallet.pendingCount() },
      staff: P.staff().length, notices: P.activeNotices().length, maintenance: P.maintenance(), uptimeSec: Math.floor(process.uptime()),
      dashboard: adminDashboard(d, rs, period, now(), actor.role === 'owner'),
    };
  }

  function playerRow(p: ReturnType<Accounts['all']>[number], walletVisible: boolean) {
    const ban = P.banOf(p.id);
    const effectiveXp = d.progression.canonicalXp(p.id, rawXp(p.id, p.xp)), level = Math.min(100, 1 + Math.floor(Math.sqrt(effectiveXp / 40)));
    return { id: p.id, playerId: d.accounts.publicPlayerId(p.id), displayPlayerId: d.accounts.displayPlayerId(p.id), name: p.name, since: p.since, level, effectiveXp, points: p.points, wins: p.wins, played: p.played, ...(walletVisible ? { coins: d.wallet.has(p.id) ? d.wallet.balance(p.id) : null, gems: d.wallet.has(p.id) ? d.wallet.gems(p.id) : null } : {}), online: d.sockets.has(p.id), banned: !!ban, role: P.roleOf(p.id) };
  }
  function players(q: URLSearchParams, actor: Actor) {
    const term = clean(q.get('q'), 40).toLowerCase();
    const sort = q.get('sort') ?? 'since';
    const limit = Math.max(1, Math.min(50, Number(q.get('limit')) || 25)), offset = Math.max(0, Number(q.get('offset')) || 0);
    let list = d.accounts.all();
    if (term) list = list.filter((p) => p.name.toLowerCase().includes(term) || p.id.startsWith(term) || d.accounts.publicPlayerId(p.id) === term || d.accounts.displayPlayerId(p.id) === term);
    const key = sort === 'points' ? (p: (typeof list)[number]) => p.points : sort === 'level' ? (p: (typeof list)[number]) => d.progression.canonicalXp(p.id, rawXp(p.id, p.xp)) : sort === 'played' ? (p: (typeof list)[number]) => p.played : (p: (typeof list)[number]) => p.since;
    list.sort((a, b) => key(b) - key(a));
    return { total: list.length, offset, limit, list: list.slice(offset, offset + limit).map((p) => playerRow(p, can(actor.role, 'wallet.view'))) };
  }
  function playerDetail(id: string) {
    const prof = d.accounts.adminProfile(id);
    if (!prof) throw new HttpErr(404, 'لاعب غير موجود.');
    const baseXp = rawXp(id, prof.xp), xp = d.progression.canonicalXp(id, baseXp);
    return { profile: { ...prof, playerId: d.accounts.publicPlayerId(id), displayPlayerId: d.accounts.displayPlayerId(id), baseXp, xp, level: Math.min(100, 1 + Math.floor(Math.sqrt(xp / 40))) }, wallet: d.wallet.has(id) ? d.wallet.adminView(id) : null, online: d.sockets.has(id), ban: P.banOf(id), role: P.roleOf(id) };
  }
  function bulkRecipients(filter: string, from = 0, to = 0) {
    const all = d.accounts.all();
    if (filter === 'active') return all.filter((p) => d.sockets.has(p.id));
    if (filter === 'recent') return all.filter((p) => p.since >= now() - 30 * 86400_000);
    if (filter === 'date-range') return all.filter((p) => p.since >= from && p.since <= to);
    if (filter === 'all' || !filter) return all;
    throw new HttpErr(400, 'الفلتر: active أو recent أو all أو date-range.');
  }
  function bulkRewardInput(raw: unknown): BulkReward[] {
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20) throw new HttpErr(400, 'أدخل مكافأة واحدة إلى 20 مكافأة.');
    const seen = new Set<string>();
    return raw.map((v: any) => {
      if (!v || typeof v !== 'object') throw new HttpErr(400, 'مكافأة غير صالحة.');
      if (v.type === 'currency') {
        if ((v.cur !== 'coins' && v.cur !== 'gems') || !Number.isSafeInteger(v.amount) || v.amount <= 0 || v.amount > 1_000_000) throw new HttpErr(400, 'قيمة العملة غير صالحة.');
        if (seen.has(v.cur)) throw new HttpErr(400, 'ادمج مقادير العملة نفسها في مكافأة واحدة.'); seen.add(v.cur);
        return { type: 'currency', cur: v.cur, amount: v.amount } as BulkReward;
      }
      if (v.type === 'item' && v.mode === 'grant' && typeof v.itemId === 'string') {
        const it = d.shopcat.get(v.itemId);
        if (!it || !['avatar', 'frame', 'bg', 'title', 'badge'].includes(it.slot)) throw new HttpErr(400, 'العنصر غير موجود أو غير مدعوم.');
        if (seen.has(it.id)) throw new HttpErr(400, 'العنصر مكرر في المكافآت.'); seen.add(it.id);
        return { type: 'item', itemId: it.id, mode: 'grant' } as BulkReward;
      }
      throw new HttpErr(400, 'المنح مجاني فقط؛ الشراء أو الخصم غير مسموح.');
    });
  }
  const bulkWalletState = (plan: BulkPlan) => plan.recipients.map(({ id }) => {
    const wallet = d.wallet.has(id) ? d.wallet.adminView(id) : { coins: START_COINS, gems: 0, owned: [] as string[] };
    return [id, d.accounts.has(id), ...plan.rewards.map((r) => r.type === 'currency' ? [r.cur, wallet[r.cur]] : [r.itemId, wallet.owned.includes(r.itemId)])];
  });
  function bulkPreview(plan: BulkPlan) {
    const failures: { id: string; name: string; code: string }[] = [], successes: { id: string; name: string }[] = [];
    for (const recipient of plan.recipients) {
      const wallet = d.wallet.has(recipient.id) ? d.wallet.adminView(recipient.id) : { coins: START_COINS, gems: 0, owned: [] as string[] };
      let code = '';
      for (const reward of plan.rewards) {
        if (reward.type === 'currency' && !Number.isSafeInteger(wallet[reward.cur] + reward.amount)) { code = 'overflow'; break; }
        if (reward.type === 'item' && wallet.owned.includes(reward.itemId)) { code = 'already_owned'; break; }
      }
      if (code) failures.push({ ...recipient, code }); else successes.push(recipient);
    }
    return { ok: true, preview: true, operationId: plan.operationId, filter: plan.filter, from: plan.from, to: plan.to, reason: plan.reason, rewards: plan.rewards,
      fingerprint: plan.fingerprint, beneficiaries: plan.recipients.length, recipients: plan.recipients, succeeded: successes.length, failed: failures.length, successes, failures, persistent: bulkStore.persistent };
  }

  function shop() {
  const owned = d.wallet.countOwned();
    const items = d.shopcat.all().map(({ css, ...i }) => ({ ...i, ...(i.offer ? { price: i.offer.was, offerPrice: i.price } : {}), css, owners: owned[i.id] ?? 0 })); // R62: الإدارة تشوف السعر الأصلي (مب سعر العرض) عشان التعديل ما يحفظ السعر المخفّض
    return {
      items, purchases: Object.values(owned).reduce((a, b) => a + b, 0), editable: true, persistent: d.shopcat.persistent,
      presets: PRESETS, priceMax: PRICE_MAX,
      note: 'تعديل السعر يسري على الشراء القادم فقط ولا يغيّر ما اشتراه اللاعبون. المنتج ما يُحذف: التعطيل يوقف البيع فقط ويبقى عند من يملكه.',
    };
  }
  const itemInput = (b: Record<string, unknown>) => { const o: Record<string, unknown> = {}; for (const k of ['id', 'slot', 'name', 'icon', 'desc', 'price', 'currency', 'css', 'active', 'status', 'minLevel', 'minVip', 'minNoble']) if (k in b) o[k] = b[k]; return o; };
  const diff = (a: Record<string, unknown>, b: Record<string, unknown>) => ['name', 'icon', 'desc', 'price', 'currency', 'active', 'css', 'status', 'minLevel', 'minVip', 'minNoble'].filter((k) => a[k] !== b[k]).map((k) => `${k}: ${String(a[k])} ← ${String(b[k])}`).join('، ');
  function achievements() {
    const got = d.wallet.countClaimed();
    return {
      milestones: MILESTONES.map((m) => ({ ...m, claimed: got[m.id] ?? 0 })),
      badges: d.shopcat.all().filter((i) => i.slot === 'badge').map((i) => ({ id: i.id, name: i.name, icon: i.icon, owners: d.wallet.countOwned()[i.id] ?? 0 })),
      honor: d.board.top(10),
      note: 'لا يوجد نظام كؤوس مستقل؛ لوحة الشرف = صدارة الأسبوع الحالي.',
    };
  }
  function system() {
    const m = process.memoryUsage();
    return {
      node: process.version, uptimeSec: Math.floor(process.uptime()), memory: { rssMb: Math.round(m.rss / 1048576), heapMb: Math.round(m.heapUsed / 1048576) }, eventLoopLagMs: lag,
      storage: d.storage.status(), pendingPayouts: d.wallet.pendingCount(), connections: [...d.sockets.values()].reduce((n, s) => n + s.size, 0),
      platformPersistent: P.persistent, auditEntries: P.auditCount(), errors: d.errors().slice(-50).reverse(),
    };
  }
  function settings() {
    const c = d.cfg;
    return {
      readOnly: true,
      values: {
        'مخزن الغرف': c.store, 'وضع الإنتاج': c.production, 'مهلة الدور (ثوانٍ)': Math.round((c.engine.turnMs ?? 30000) / 1000), 'أقصى غرف لكل لاعب': c.maxRoomsPerUser, 'أقصى غرف تدريب': c.maxBotRoomsPerUser,
        'أقصى اتصالات للاعب': c.maxConnectionsPerUser, 'عمر الغرفة الخامل (دقائق)': Math.round(c.roomTtlMs / 60000), 'دخول Google': !!c.googleClientId, 'حفظ المحفظة بملف': !!c.walletFile, 'حفظ حالة الإدارة بملف': P.persistent,
        'اشتراط Google للمباريات برسوم': c.requireGoogleForStakes ? (c.googleClientId ? 'مفعّل' : 'مطلوب لكن Google غير مضبوط (غير فعّال)') : 'مطفأ (اللعب برسوم مفتوح للجميع عدا المشتبه بهم)', 'عتبة إشارة نشاط الشبكة (حسابات جديدة/يوم؛ للمراجعة فقط، لا تمنع أحداً)': c.newAccountsSignalPerNetDay || 'مطفأة',
        'حد تعديل الرصيد للعملية الواحدة (غير المالك)': `${c.adminAdjust.opCoins} عملة / ${c.adminAdjust.opGems} جوهرة`, 'الحد اليومي لكل منفّذ (غير المالك)': `${c.adminAdjust.dayCoins} عملة / ${c.adminAdjust.dayGems} جوهرة`,
      },
      note: 'تُضبط من متغيرات البيئة على الخادم (انظر .env.example). اللوحة تعرضها للقراءة فقط ولا تكتب أسراراً.',
    };
  }

  function noticeInput(b: any, partial = false) {
    const out: any = {};
    if (!partial || b.title !== undefined) { out.title = clean(b.title, 80); if (!out.title) throw new HttpErr(400, 'العنوان مطلوب.'); }
    if (!partial || b.body !== undefined) out.body = clean(b.body, 500);
    if (!partial || b.kind !== undefined) { if (b.kind !== 'announcement' && b.kind !== 'event') throw new HttpErr(400, 'النوع: إعلان أو فعالية.'); out.kind = b.kind; }
    for (const k of ['startsAt', 'endsAt'] as const) if (!partial || b[k] !== undefined) { const v = Number(b[k] ?? 0); if (!Number.isFinite(v) || v < 0) throw new HttpErr(400, 'تاريخ غير صالح.'); out[k] = Math.floor(v); }
    if (!partial || b.active !== undefined) out.active = !!b.active;
    if (out.startsAt && out.endsAt && out.endsAt <= out.startsAt) throw new HttpErr(400, 'نهاية الفترة قبل بدايتها.');
    return out;
  }

  /** يعالج مسارات /api/admin/*؛ يرجع false لو المسار مو لنا (والمسار القديم /api/admin/stats يبقى بمعالجه الأصلي) */
  async function handle(req: http.IncomingMessage, res: http.ServerResponse, url: URL, user: { id: string; name: string } | null): Promise<boolean> {
    const p = url.pathname;
    if (!p.startsWith('/api/admin/') || p === '/api/admin/stats') return false;
    try {
      const ip = d.ipOf(req);
      const actor = actorOf(req, user);
      if (!actor) {
        if (!authLimiter.allow('a:' + ip)) throw new HttpErr(429, 'محاولات كثيرة، جرّب بعد شوي.');
        throw new HttpErr(401, req.headers.authorization ? 'الرمز غلط.' : 'ما عندك صلاحية دخول الإدارة.');
      }
      if (!apiLimiter.allow('u:' + actor.id + ip)) throw new HttpErr(429, 'طلبات كثيرة، جرّب بعد شوي.');
      const mut = req.method !== 'GET' && req.method !== 'HEAD';
      if (mut && (!d.sameOrigin(req) || req.headers['x-admin'] !== '1')) throw new HttpErr(403, 'طلب مرفوض.');
      const seg = p.slice('/api/admin/'.length).split('/').filter(Boolean);
      const body = async () => { try { const j = JSON.parse((await d.readBody(req, 8192)) || '{}'); if (!j || typeof j !== 'object' || Array.isArray(j)) throw 0; return j as any; } catch { throw new HttpErr(400, 'بيانات غير صالحة.'); } };
      const out = (b: unknown, code = 200) => d.json(res, code, b);
      const [a, id, act] = seg;

      if (a === 'me' && req.method === 'GET') return out({ id: actor.id === 'token' ? null : actor.id, name: actor.name, role: actor.role, roleLabel: ROLE_LABEL[actor.role], perms: [...ROLE_PERMS[actor.role], ...(actor.role !== 'owner' && P.bulkGrantAllowed(actor.id) ? ['wallet.bulk-grant'] : [])], roles: ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r], perms: ROLE_PERMS[r] })) }), true;
      if (a === 'verifications') {
        if (actor.role !== 'owner' && actor.role !== 'admin') throw new HttpErr(403, 'مراجعة التوثيق للمالك أو المدير فقط.');
        if (!d.accountTools) throw new HttpErr(503, 'أدوات التوثيق غير موصولة بعد.');
        if (!id && req.method === 'GET') {
          const status = url.searchParams.get('status') ?? 'pending';
          if (!['all', 'pending', 'accepted', 'rejected', 'revoked'].includes(status)) throw new HttpErr(400, 'حالة التوثيق غير صالحة.');
          const offset = Math.max(0, Math.floor(Number(url.searchParams.get('offset')) || 0));
          const limit = Math.max(1, Math.min(100, Math.floor(Number(url.searchParams.get('limit')) || 25)));
          const result = await d.accountTools.verificationList(status === 'all' ? undefined : status as 'pending' | 'accepted' | 'rejected' | 'revoked', offset, limit);
          return out(Array.isArray(result) ? { list: result, offset, limit } : result), true;
        }
        if (id && req.method === 'POST' && ['accept', 'reject', 'revoke'].includes(act)) {
          const b = await body(), reason = clean(b.reason, 180), ref = String(b.ref ?? '');
          if (reason.length < 3 || !/^[A-Za-z0-9:_-]{8,100}$/.test(ref)) throw new HttpErr(400, 'سبب القرار ومفتاح منع التكرار مطلوبان.');
          if (act === 'revoke' && (!UUID.test(id) || !d.accounts.has(id))) throw new HttpErr(404, 'لاعب غير موجود.');
          try {
            const result = act === 'revoke' ? await d.accountTools.revokeVerification(id, reason, actor, ref)
              : await d.accountTools.decideVerification(id, act === 'accept' ? 'accepted' : 'rejected', reason, actor, ref);
            const auditOk = isObj(result) && (result.dup === true || result.duplicate === true) || safeAudit(actor, 'verification.' + act, id, `${reason} · ${ref}`);
            return out({ ok: true, ...(isObj(result) ? result : { result }), auditOk }), true;
          } catch (e) {
            if (e instanceof StorageError) throw e;
            const code = Number((e as { status?: number; code?: number }).status ?? (e as { code?: number }).code);
            throw new HttpErr([400, 403, 404, 409].includes(code) ? code : 400, e instanceof Error ? e.message : 'تعذّر قرار التوثيق.');
          }
        }
      }
      if (a === 'bulk-permissions') {
        if (actor.role !== 'owner') throw new HttpErr(403, 'التفويض الجماعي للمالك فقط.');
        if (req.method === 'GET' && !id) {
          return out({ list: P.staff().filter((s) => s.role !== 'owner').map((s) => ({ id: s.id, name: nameOf(s.id), role: s.role, allowed: P.bulkGrantAllowed(s.id) })) }), true;
        }
        if (req.method === 'POST' && id && !act) {
          const b = await body();
          if (!UUID.test(id) || typeof b.allowed !== 'boolean') throw new HttpErr(400, 'معرّف أو صلاحية غير صالحة.');
          if (!P.roleOf(id) || P.roleOf(id) === 'owner' || !d.accounts.has(id)) throw new HttpErr(404, 'اختر عضو طاقم موجوداً.');
          if (b.allowed && P.isBanned(id)) throw new HttpErr(409, 'لا يمكن تفويض حساب محظور.');
          P.setBulkGrantPermission(id, b.allowed, () => ent(actor, b.allowed ? 'bulk.permission-grant' : 'bulk.permission-revoke', id, 'صلاحية منح جميع اللاعبين: ' + nameOf(id)));
          return out({ ok: true, id, allowed: b.allowed }), true;
        }
        throw new HttpErr(405, 'الطريقة غير مسموحة.');
      }
      if (a === 'bulk-grants' && d.bulkGrants) {
        if (actor.role !== 'owner' && (!P.bulkGrantAllowed(actor.id) || P.isBanned(actor.id))) throw new HttpErr(403, 'المنح الجماعي للمالك أو شخص فوّضه المالك صراحة.');
        const bulk = d.bulkGrants;
        const opts = { offset: Math.max(0, Number(url.searchParams.get('offset') || 0)), limit: Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20))) };
        if (!id && req.method === 'GET') return out(bulk.list(opts)), true;
        if (id === 'catalog' && req.method === 'GET' && !act) return out({ ...bulk.catalog(), activityNote: 'المعاينة تعتمد على الحسابات المحفوظة في الخادم.' }), true;
        if (id === 'preview' && req.method === 'POST' && !act) return out(bulk.preview(actor, await body()), 201), true;
        if (id && UUID.test(id) && !act && req.method === 'GET') return out(bulk.get(id, { ...opts, status: (url.searchParams.get('status') || undefined) as 'success' | 'failed' | 'pending' | undefined })), true;
        if (id && UUID.test(id) && (act === 'confirm' || act === 'retry') && req.method === 'POST') {
          const result = act === 'confirm' ? bulk.confirm(actor, id, await body()) : bulk.retry(actor, id, await body());
          return out(result, 202), true;
        }
        throw new HttpErr(404, 'مسار منح غير معروف.');
      }
      if (a === 'pricing') {
        if (actor.role !== 'owner') throw new HttpErr(403,'إعدادات الاقتصاد للمالك فقط.');
        if (!d.economy) throw new HttpErr(503,'سياسة الاقتصاد غير متاحة.');
        if (req.method === 'GET') return out({ ...d.economy.view(), persistent:d.economy.persistent }),true;
        if (req.method === 'POST') {
          const b = await body();
          const result = d.economy.update(b);
          const auditOk = safeAudit(actor,'economy.policy','', 'تعديل أسعار الباقات أو نسبة التحويل؛ لا يمنح رصيداً ولا يفعّل بوابة دفع.');
          return out({ ok:true, ...result, persistent:d.economy.persistent, auditOk }),true;
        }
      }
      if (a === 'progression' && !id) {
        if (actor.role !== 'owner') throw new HttpErr(403, 'إعدادات LEVEL وVIP وNOBLE للمالك فقط.');
        if (req.method === 'GET') return out({ ok: true, config: d.progression.configView(), players: d.progression.all().map((p) => ({ ...p, effectiveXp: d.progression.canonicalXp(p.id, rawXp(p.id, d.accounts.adminProfile(p.id)?.xp ?? 0)) })), persistent: d.progression.persistent }), true;
        if (req.method === 'POST') {
          const b = await body();
          try {
            const {reason,key,...patch}=b;
            let receipt:{config:ReturnType<typeof d.progression.configView>;duplicate:boolean};
            if(reason!==undefined||key!==undefined){
              if(typeof reason!=='string'||reason.trim().length<3||reason.length>180||typeof key!=='string'||!/^[A-Za-z0-9:_-]{8,80}$/.test(key))throw new HttpErr(400,'سبب ومعرّف عملية صحيحان مطلوبان.');
              receipt=d.progression.updateConfigReceipt(patch,{actorId:actor.id,key,reason});
            }else receipt={config:d.progression.updateConfig(patch),duplicate:false};
            const auditOk = receipt.duplicate || safeAudit(actor, 'progression.policy', '', String(reason??'حفظ سياسة VIP/NOBLE والعتبات المعتمدة'));
            return out({ ok: true, ...receipt, auditOk, persistent: d.progression.persistent }), true;
          } catch (e) {
            if (e instanceof StorageError) throw new HttpErr(503, STORAGE_MSG);
            throw new HttpErr(e instanceof HttpErr ? e.code : /conflict/.test(String((e as {code?:unknown}).code ?? (e as Error).message)) ? 409 : 400, e instanceof Error ? e.message : 'إعدادات التقدم غير صالحة.');
          }
        }
      }
      if (a === 'progression' && id && act === 'grant' && req.method === 'POST') {
        if (actor.role !== 'owner') throw new HttpErr(403, 'منح نقاط التقدم للمالك فقط.');
        if (!UUID.test(id) || !d.accounts.has(id)) throw new HttpErr(404, 'لاعب غير موجود.');
        const b = await body();
        const system = b.system === 'level' || b.system === 'vip' || b.system === 'noble' ? b.system : null;
        const points = Number(b.points), ref = String(b.ref ?? ''), reason = clean(b.reason, 180);
        if (!system || !Number.isSafeInteger(points) || points <= 0 || !ref || reason.length < 3) throw new HttpErr(400, 'بيانات منح نقاط التقدم غير صالحة.');
        try {
          const result = d.progression.grant(id, system, points, ref, reason);
          const auditOk = result.dup || safeAudit(actor, 'progression.grant', id, `${system} +${points} · ${reason} · ${ref}`);
          return out({ ...result, auditOk }), true;
        } catch (e) {
          if (e instanceof StorageError) throw new HttpErr(503, STORAGE_MSG);
          throw new HttpErr(e instanceof Error && e.message.includes('conflict') ? 409 : 400, e instanceof Error ? e.message : 'تعذّر منح نقاط التقدم.');
        }
      }
      if (a === 'overview' && req.method === 'GET') {
        need(actor, 'stats.view');
        const periods = url.searchParams.getAll('period'), period = periods[0] ?? '30d';
        if (periods.length > 1 || !['7d', '30d', '90d'].includes(period)) throw new HttpErr(400, 'الفترة: 7d أو 30d أو 90d.');
        return out(await overview(period as DashboardPeriod, actor)), true;
      }
      if (a === 'players' && !id && req.method === 'GET') { need(actor, 'players.view'); return out(players(url.searchParams, actor)), true; }
      if (a === 'players' && id && !act && req.method === 'GET') { need(actor, 'players.view'); if (!UUID.test(id)) throw new HttpErr(400, 'معرّف غير صالح.'); const det = playerDetail(id); if (!can(actor.role, 'wallet.view')) det.wallet = null; return out(det), true; }
      if (a === 'players' && id && act === 'adjust' && req.method === 'POST') {
        need(actor, 'wallet.adjust'); if (!UUID.test(id) || !d.accounts.has(id)) throw new HttpErr(404, 'لاعب غير موجود.');
        const b = await body(); const cur = b.cur === 'gems' ? 'gems' : b.cur === 'coins' ? 'coins' : null; const delta = Number(b.delta); const reason = clean(b.reason, 120);
        if (!cur) throw new HttpErr(400, 'العملة: coins أو gems.');
        if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000) throw new HttpErr(400, 'المقدار لازم عدد صحيح غير صفر وحده الأقصى مليون.');
        if (reason.length < 3) throw new HttpErr(400, 'اكتب سبب التعديل (3 أحرف على الأقل).');
        // مفتاح منع التكرار إلزامي بالخادم (لكل الأدوار بما فيها المالك): مفقود أو بصيغة غير صالحة = رفض قبل أي أثر
        const rawKey = typeof b.key === 'string' ? b.key : '';
        if (!ADJ_KEY_RE.test(rawKey)) throw new HttpErr(400, 'مفتاح منع التكرار (key) مطلوب: 8 إلى 64 حرفاً (حروف إنجليزية وأرقام و - _).');
        // من هنا إلى نهاية الفرع كله متزامن (بدون await): الحصة والمفتاح والتنفيذ لا يتداخلون مع طلب ثاني متوازٍ.
        if (id === actor.id && !actor.token) throw new HttpErr(403, 'ما تقدر تعدّل رصيدك بنفسك.');
        const key = actor.id + ':' + rawKey, fp = fpOf(id, cur, delta, reason), abs = Math.abs(delta);
        const seen = P.adjKeyGet(key);
        if (seen && seen.fp !== fp) throw new HttpErr(409, 'هذا المفتاح استُخدم لعملية مختلفة. استعمل مفتاحاً جديداً لكل عملية.');
        if (seen?.state === 'done' && seen.out) return out({ ...seen.out, duplicate: true }, seen.out.pending ? 202 : 200), true; // نفس الطلب مرتين = نفس النتيجة بلا تنفيذ ثاني
        const resuming = seen?.state === 'reserved'; // حُجزت الحصة سابقاً ولم تكتمل (انقطاع): نكمل بنفس المفتاح بدون حجز ثانٍ
        if (!d.wallet.has(id) && delta < 0) throw new HttpErr(409, 'الرصيد ما يكفي للخصم (ما يصير رصيد سالب).');
        const L = d.cfg.adminAdjust; const opMax = cur === 'coins' ? L.opCoins : L.opGems, dayMax = cur === 'coins' ? L.dayCoins : L.dayGems;
        // المالك بلا حد، لكن المبالغ الكبيرة تحتاج تأكيداً صريحاً بالمبلغ نفسه (حماية من خطأ طباعة؛ ليس حداً مالياً)
        if (actor.role === 'owner' && !resuming && abs >= (cur === 'coins' ? L.confirmCoins : L.confirmGems) && Number(b.confirm) !== delta)
          throw new HttpErr(400, `مبلغ كبير (${abs.toLocaleString('en')}): أعد كتابة المبلغ نفسه (${delta}) في حقل التأكيد لإتمام العملية.`);
        let reserved = resuming, why: 'op_limit' | 'day_limit' | null = null;
        if (actor.role !== 'owner' && !resuming) {
          if (abs > opMax) why = 'op_limit';
          else if (P.reserveAdj(actor.id, cur, abs, dayMax, key, fp)) reserved = true; else why = 'day_limit';
        }
        if (why) { // فوق الحد: ما يُنفَّذ؛ يصير طلباً ينتظر موافقة المالك (الطلب ومفتاحه يُحفظان معاً)
          if (P.adjPendingOf(actor.id) >= ADJ_PENDING_PER_ACTOR) throw new HttpErr(429, 'عندك طلبات كثيرة معلّقة بانتظار المالك.');
          if (delta < 0 && (!d.wallet.has(id) || d.wallet.adminView(id)[cur] < abs)) throw new HttpErr(409, 'الرصيد ما يكفي للخصم (ما يصير رصيد سالب).');
          const w = why;
          const rq = P.addAdj({ target: id, targetName: nameOf(id), cur, delta, reason, why: w, by: { id: actor.id, name: actor.name, role: actor.role } }, (x) => ent(actor, 'wallet.request', id, `${cur} ${delta > 0 ? '+' : ''}${delta} · ${reason} · ${w === 'op_limit' ? 'فوق حد العملية' : 'فوق الحد اليومي'} · طلب ${x.id}`), { k: key, fp });
          return out({ ok: true, pending: true, request: { id: rq.id, why: w } }, 202), true;
        }
        let r;
        try { r = d.wallet.adminAdjust(id, cur, delta, `إدارة: ${reason}`, 'adj:' + key); } catch (e) { throw e; } // فشل الحفظ: تبقى الحصة محجوزة بمفتاحها ويكمل نفس المفتاح عند إعادة الإرسال
        if (!r.ok) { if (reserved) { try { P.releaseAdj(actor.id, cur, abs, key); } catch { /* يُعاد */ } } throw new HttpErr(r.code === 'poor' ? 409 : 400, r.code === 'poor' ? 'الرصيد ما يكفي للخصم (ما يصير رصيد سالب).' : 'تعديل غير صالح.'); }
        const auditOk = safeAudit(actor, 'wallet.adjust', id, `${cur} ${delta > 0 ? '+' : ''}${delta} · قبل ${r.before} ← بعد ${r.after} · ${reason}${r.dup ? ' · (استكمال بعد انقطاع)' : ''}`);
        const res = { ok: true, coins: r.coins, gems: r.gems, before: r.before, after: r.after, auditOk };
        try { P.finishAdjKey(key, fp, res); } catch { /* التنفيذ محمي بمفتاح المحفظة؛ إعادة الإرسال ترجع نفس النتيجة */ }
        notifyWallet(id);
        return out(res), true;
      }
      if (a === 'adjustments' && !id && req.method === 'GET') {
        if (!can(actor.role, 'wallet.adjust') && !can(actor.role, 'wallet.approve')) throw new HttpErr(403, 'ما عندك صلاحية لهذا الإجراء.');
        const L = d.cfg.adminAdjust; const used = P.adjUsed(actor.id);
        return out({ list: P.adjList().slice(0, 100), limits: L, usedToday: used, unlimited: actor.role === 'owner', canApprove: can(actor.role, 'wallet.approve') }), true;
      }
      if (a === 'adjustments' && id && (act === 'approve' || act === 'reject') && req.method === 'POST') {
        need(actor, 'wallet.approve');
        const rq = P.adjGet(id); if (!rq) throw new HttpErr(404, 'طلب غير موجود.');
        const note = clean((await body()).note, 200);
        if (act === 'reject') {
          if (rq.status !== 'pending') throw new HttpErr(409, rq.status === 'approving' ? 'الموافقة بدأت على هذا الطلب؛ لا يُرفض. أعد «موافقة» لاستكمال التنفيذ.' : 'هذا الطلب تم البت فيه من قبل.');
          const sum = `${rq.cur} ${rq.delta > 0 ? '+' : ''}${rq.delta} · ${rq.reason} · طلب ${rq.by.name} (${rq.by.role}) · رفض ${actor.name}`;
          P.rejectAdj(id, actor.name, actor.id, note, () => ent(actor, 'wallet.reject', rq.target, sum)); return out({ ok: true, status: 'rejected' }), true;
        }
        // من هنا متزامن. approving = نية موافقة محفوظة؛ إعادة «موافقة» على طلب approving تستكمله (لا تضيع الموافقة ولا يتكرر التعديل)
        if (rq.status === 'pending') {
          if (rq.expired) throw new HttpErr(409, 'انتهت مهلة الطلب (7 أيام)؛ يُعاد رفعه.');
          if (!P.beginApprove(id, actor.name, actor.id)) throw new HttpErr(409, 'هذا الطلب تم البت فيه من قبل.');
        } else if (rq.status !== 'approving') throw new HttpErr(409, 'هذا الطلب تم البت فيه من قبل.');
        const done = settleApproval(id, false);
        if (!done) throw new HttpErr(409, 'هذا الطلب تم البت فيه من قبل.');
        if (done.status === 'failed') throw new HttpErr(409, 'الرصيد ما يكفي الآن للخصم؛ فشل التنفيذ ولم يتغير شي.');
        return out({ ok: true, status: 'approved', before: done.before, after: done.after, coins: d.wallet.balance(rq.target), gems: d.wallet.gems(rq.target) }), true;
      }
      if (a === 'players' && id && (act === 'ban' || act === 'unban') && req.method === 'POST') {
        need(actor, 'players.ban'); if (!UUID.test(id) || !d.accounts.has(id)) throw new HttpErr(404, 'لاعب غير موجود.');
        const tr = P.roleOf(id);
        if (id === actor.id) throw new HttpErr(400, 'ما تقدر تحظر نفسك.');
        if (tr && RANK[tr] >= RANK[actor.role]) throw new HttpErr(403, 'ما تقدر تحظر من رتبته مثل رتبتك أو أعلى.');
        if (act === 'ban') {
          const reason = clean((await body()).reason, 120); if (reason.length < 3) throw new HttpErr(400, 'اكتب سبب الحظر.');
          P.ban(id, nameOf(id), reason, actor.name, () => ent(actor, 'player.ban', id, reason)); d.kick(id, 'banned');
        } else { if (!P.unban(id, (had) => (had ? ent(actor, 'player.unban', id, '') : null))) throw new HttpErr(404, 'اللاعب غير محظور.'); }
        return out({ ok: true, banned: act === 'ban' }), true;
      }
      if (a === 'bans' && req.method === 'GET') { need(actor, 'players.view'); return out({ list: P.bans().map(({ h: _h, ...b }) => b).sort((x, y) => y.at - x.at) }), true; }
      if (a === 'net-signals' && req.method === 'GET') {
        need(actor, 'players.view');
        const th = d.cfg.newAccountsSignalPerNetDay;
        return out({ threshold: th, note: 'إشارة للمراجعة فقط: شبكات أُنشئ منها حسابات كثيرة آخر 24 ساعة. لا يُمنع أحد بسببها؛ شبكات الجوال والواي فاي المشتركة (مقاهٍ، سكن، مدارس) تظهر هنا بصورة مشروعة. الرمز مُجزّأ ولا يكشف العنوان.', groups: P.netBursts(th).map((g) => ({ ...g, accounts: g.ids.map((id) => ({ id, name: nameOf(id), banned: !!P.banOf(id) })) })) }), true;
      }
      if (a === 'suspects' && req.method === 'GET') { need(actor, 'players.view'); return out({ list: P.suspects().map((s) => ({ ...s, name: nameOf(s.id) })).sort((x, y) => y.at - x.at), note: 'حسابات جديدة من شبكة تطابق شبكة حساب محظور. الشبكات المشتركة (جوال/مقهى/سكن) تعطي تطابقات خاطئة؛ لذلك يُمنعون من المباريات برسوم فقط لحين مراجعتك، واللعب المجاني ما يتأثر.' }), true; }
      if (a === 'players' && id && act === 'clear-suspect' && req.method === 'POST') {
        need(actor, 'players.ban'); if (!UUID.test(id)) throw new HttpErr(400, 'معرّف غير صالح.');
        if (!P.clearSuspect(id, (had) => (had ? ent(actor, 'player.clear-suspect', id, '') : null))) throw new HttpErr(404, 'اللاعب غير موسوم بالاشتباه.');
        return out({ ok: true }), true;
      }
      if (a === 'shop' && !id && req.method === 'GET') { need(actor, 'shop.view'); return out(shop()), true; }
      if ((a === 'bulk-grants' || a === 'grants') && !id && req.method === 'GET') {
        needBulk(actor);
        const filter = url.searchParams.get('filter') ?? 'all';
        const from = Number(url.searchParams.get('from')), to = Number(url.searchParams.get('to'));
        if (filter === 'date-range' && (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from || !url.searchParams.has('from') || !url.searchParams.has('to'))) throw new HttpErr(400, 'فترة التاريخ غير صالحة (مللي ثانية، البداية والنهاية شاملتان).');
        return out({ ok: true, filter, beneficiaries: bulkRecipients(filter, from, to).length, previewRequired: true }), true;
      }
      if ((a === 'bulk-grants' || a === 'grants') && !id && req.method === 'POST') {
        needBulk(actor);
        const b = await body();
        const operationId = typeof b.operationId === 'string' ? b.operationId : '';
        if (!/^[A-Za-z0-9_-]{8,80}$/.test(operationId) || ['__proto__', 'constructor', 'prototype'].includes(operationId)) throw new HttpErr(400, 'معرف العملية مطلوب وبصيغة صالحة.');
        const reason = clean(b.reason, 180); if (reason.length < 3) throw new HttpErr(400, 'السبب مطلوب.');
        const filter = String(b.filter ?? 'all');
        const from = filter === 'date-range' ? b.from : 0, to = filter === 'date-range' ? b.to : 0;
        if (!['all', 'active', 'recent', 'date-range'].includes(filter)) throw new HttpErr(400, 'فلتر غير صالح.');
        if (filter === 'date-range' && (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from || b.from === undefined || b.to === undefined)) throw new HttpErr(400, 'فترة التاريخ غير صالحة (البداية والنهاية شاملتان).');
        const rewards = bulkRewardInput(b.rewards);
        const inputFingerprint = bulkHash({ actorId: actor.id, filter, from, to, reason, rewards });
        let plan = bulkStore.get(operationId);
        if (plan && plan.inputFingerprint !== inputFingerprint) throw new HttpErr(409, 'معرف العملية محفوظ لمحتوى أو منفّذ مختلف. استخدم معرفًا جديدًا.');
        if (b.preview === true) {
          if (!plan) {
            const recipients = bulkRecipients(filter, from, to).map(({ id, name }) => ({ id, name })).sort((a, b) => a.id.localeCompare(b.id));
            if (!recipients.length) throw new HttpErr(400, 'لا يوجد مستفيدون مطابقون.');
            plan = { operationId, actorId: actor.id, inputFingerprint, fingerprint: '', walletFingerprint: '', filter, from, to, reason, rewards, recipients, createdAt: now(), state: 'preview' };
            plan.walletFingerprint = bulkHash(bulkWalletState(plan));
            plan.fingerprint = bulkHash({ inputFingerprint, recipients, walletFingerprint: plan.walletFingerprint });
            bulkStore.put(plan);
          }
          if (plan.state !== 'preview') return out({ ...plan.result, ok: true, duplicate: true, operationId, state: plan.state }), true;
          if (bulkHash(bulkWalletState(plan)) !== plan.walletFingerprint) throw new HttpErr(409, 'تغيّرت بيانات مستفيد بعد المعاينة. استخدم معرفًا جديدًا وأعد المعاينة.');
          return out(bulkPreview(plan)), true;
        }
        if (!plan || b.fingerprint !== plan.fingerprint || !Number.isSafeInteger(b.confirmCount) || b.confirmCount !== plan.recipients.length) throw new HttpErr(409, 'المعاينة الخادمية وبصمتها وتأكيد عدد المستفيدين مطلوبة قبل التنفيذ.');
        if (plan.state === 'done' && plan.result) return out({ ...plan.result, duplicate: true }), true;
        const pending = bulkInFlight.get(operationId);
        if (pending) return out({ ...await pending, duplicate: true }), true;
        if (plan.state === 'preview' && (now() - plan.createdAt > 15 * 60_000 || bulkHash(bulkWalletState(plan)) !== plan.walletFingerprint)) throw new HttpErr(409, 'انتهت المعاينة أو تغيّرت بيانات مستفيد. استخدم معرفًا جديدًا وأعد المعاينة.');
        const frozen = plan;
        if (frozen.state === 'preview') { frozen.state = 'executing'; bulkStore.put(frozen); }
        const job = (async () => {
          const result = await d.wallet.grantBulk(operationId, frozen.recipients.map((p) => p.id), frozen.rewards, frozen.reason);
          const failed = new Set(result.failures.map((f) => f.id));
          const auditOk = result.duplicate || safeAudit(actor, 'wallet.bulk-grant', operationId, `${filter} · ${result.succeeded} نجاح · ${result.failed} فشل · ${reason}`);
          const final: Record<string, unknown> = { ...result, auditOk, fingerprint: frozen.fingerprint, recipients: frozen.recipients,
            successes: frozen.recipients.filter((p) => !failed.has(p.id)), failures: result.failures.map((f) => ({ ...f, name: frozen.recipients.find((p) => p.id === f.id)?.name ?? '—' })) };
          frozen.state = 'done'; frozen.result = final;
          try { bulkStore.put(frozen); } catch (e) {
            if (!(e instanceof StorageError)) throw e;
            d.log('admin_bulk_result_unsaved', { operationId });
            return { ...final, resultSavePending: true };
          }
          return final;
        })();
        bulkInFlight.set(operationId, job);
        try { const result = await job; return out(result, result.duplicate ? 200 : 202), true; }
        catch (e) { if (e instanceof StorageError) throw e; throw new HttpErr(400, 'تعذّر تنفيذ المنح الجماعي. أعد نفس الطلب لاستكماله.'); }
        finally { bulkInFlight.delete(operationId); }
      }
      if (a === 'shop' && id === 'items') {
        if (req.method === 'POST' && !act) {
          need(actor, 'shop.manage');
          const it = d.shopcat.create(itemInput(await body()), actor.name);
          const auditOk = safeAudit(actor, 'shop.create', it.id, `${it.name} · ${it.price} ${it.currency}${it.active ? '' : ' (معطّل)'}`);
          return out({ ok: true, item: it, auditOk }, 201), true;
        }
        if (req.method === 'PUT' && act) {
          need(actor, 'shop.manage');
          const r = d.shopcat.update(act, itemInput(await body()), actor.name);
          if (!r) throw new HttpErr(404, 'منتج غير موجود.');
          const dl = diff(r.before as never, r.item as never);
          const auditOk = safeAudit(actor, r.item.active !== r.before.active ? (r.item.active ? 'shop.enable' : 'shop.disable') : 'shop.update', act, dl);
          return out({ ok: true, item: r.item, auditOk }), true;
        }
      }
      if (a === 'achievements' && req.method === 'GET') { need(actor, 'ach.view'); return out(achievements()), true; }
      if (a === 'rooms' && !id && req.method === 'GET') { need(actor, 'rooms.view'); return out({ list: (await rooms()).sort((x, y) => y.updatedAt - x.updatedAt).slice(0, 200) }), true; }
      if (a === 'rooms' && id && act === 'close' && req.method === 'POST') {
        need(actor, 'rooms.close'); const reason = clean((await body()).reason, 120); if (reason.length < 3) throw new HttpErr(400, 'اكتب سبب الإغلاق.');
        if (!await d.store.get(id)) throw new HttpErr(404, 'الغرفة غير موجودة.');
        const closed = await d.service.adminClose(id);
        if (!closed) throw new HttpErr(409, 'تعذّر إغلاق الغرفة؛ عليها التزام مالي يحتاج تسوية أو مراجعة. ما انحذفت الغرفة.');
        const auditOk = safeAudit(actor, 'room.close', id, reason + (closed.refunded ? ` · استرجاع رسوم ${closed.refunded} 🪙` : closed.queued ? ' · استرجاع الرسوم معلّق بانتظار الحفظ' : ''));
        return out({ ok: true, refunded: closed.refunded, refundQueued: closed.queued, auditOk }), true;
      }
      if (a === 'notices') {
        if (req.method === 'GET' && !id) { need(actor, 'ann.manage'); return out({ list: P.notices() }), true; }
        need(actor, 'ann.manage');
        if (req.method === 'POST' && !id) { const n = P.addNotice({ ...noticeInput(await body()), by: actor.name } as any, (x) => ent(actor, 'notice.create', x.id, x.title)); return out({ ok: true, notice: n }, 201), true; }
        if (req.method === 'PUT' && id) {
          const patch = noticeInput(await body(), true);
          let n;
          try { n = P.updateNotice(id, patch, (x) => (x ? ent(actor, 'notice.update', id, x.title) : null)); }
          catch (e) { if (e instanceof RangeError && e.message === 'notice_period_invalid') throw new HttpErr(400, 'نهاية الفترة لازم تكون عقب بدايتها.'); throw e; }
          if (!n) throw new HttpErr(404, 'غير موجود.'); return out({ ok: true, notice: n }), true;
        }
        if (req.method === 'DELETE' && id) { if (!P.deleteNotice(id, (ok) => (ok ? ent(actor, 'notice.delete', id, '') : null))) throw new HttpErr(404, 'غير موجود.'); return out({ ok: true }), true; }
      }
      if (a === 'staff') {
        if (id && act === 'bulk-permission' && req.method === 'POST') {
          if (actor.role !== 'owner') throw new HttpErr(403, 'تفويض المنح الجماعي للمالك فقط.');
          const b = await body(), reason = clean(b.reason, 180);
          if (typeof b.enabled !== 'boolean' || reason.length < 3) throw new HttpErr(400, 'التفويض الصريح والسبب مطلوبان.');
          if (!P.setBulkGrantPermission(id, b.enabled, (ok) => ok ? ent(actor, 'staff.bulk-permission', id, `${b.enabled ? 'منح' : 'سحب'} · ${reason}`) : null)) throw new HttpErr(404, 'عضو طاقم غير موجود.');
          return out({ ok: true, enabled: b.enabled }), true;
        }
        if (req.method === 'GET') { need(actor, 'staff.manage'); return out({ list: P.staff().map((s) => ({ ...s, roleLabel: ROLE_LABEL[s.role] })) }), true; }
        need(actor, 'staff.manage');
        if (req.method === 'POST') {
          const b = await body(); const sid = String(b.id ?? ''); const role = b.role as Role;
          if (!UUID.test(sid) || !d.accounts.has(sid)) throw new HttpErr(404, 'لاعب غير موجود (انسخ المعرّف من تفاصيل اللاعب).');
          if (!ROLES.includes(role) || role === 'owner') throw new HttpErr(400, 'الدور: مدير أو مشرف أو دعم.');
          if (P.isBanned(sid)) throw new HttpErr(409, 'اللاعب محظور.');
          P.setStaff(sid, nameOf(sid), role, actor.name, () => ent(actor, 'staff.set', sid, role)); return out({ ok: true }), true;
        }
        if (req.method === 'DELETE' && id) { if (!P.removeStaff(id, (ok) => (ok ? ent(actor, 'staff.remove', id, '') : null))) throw new HttpErr(404, 'غير موجود بالطاقم.'); return out({ ok: true }), true; }
      }
      /* الهدايا: الكتالوج (تفعيل/تعطيل/سعر) وحساب الإدارة (سجلات تاريخية بعملتها؛ الهدايا الجديدة تُموّل بالجواهر وتمنح كوينز وفق الحسبة المعتمدة) */
      if (a === 'gifts' && !id && req.method === 'GET') {
        need(actor, 'shop.view');
        const q = clean(url.searchParams.get('q'), 40), cat = clean(url.searchParams.get('cat'), 20), off = Math.max(0, Number(url.searchParams.get('off')) || 0);
        const pop = d.wallet.giftPopularity();
        const all = d.giftcat.all().filter((g) => (!cat || g.cat === cat) && (!q || g.name.includes(q) || g.id.includes(q)));
        return out({ total: d.giftcat.count(), active: d.giftcat.active().length, matched: all.length, off, rarity: RARITY, policy:GIFT_REWARD_POLICY,list: all.slice(off, off + 50).map((g) => ({ ...g, priceCurrency:'gems',rewards:quoteGiftRewards(g.price),sent: pop[g.id] ?? 0 })) }), true;
      }
      if (a === 'gifts' && id && !act && req.method === 'POST') {
        need(actor, 'shop.manage');
        const b = await body(); const ch: { active?: boolean; price?: number } = {};
        if (b.active !== undefined) ch.active = !!b.active;
        if (b.price !== undefined) { const p = Number(b.price); if (!Number.isInteger(p) || p < 2 || p > 500_000 || p % 2) throw new HttpErr(400, 'السعر عدد زوجي من 2 إلى 500,000 جوهرة وفق حدود الكتالوج الحالية.'); ch.price = p; }
        if (ch.active === undefined && ch.price === undefined) throw new HttpErr(400, 'ما فيه تغيير.');
        const r = d.giftcat.set(id, ch); if (!r) throw new HttpErr(404, 'هدية غير موجودة.');
        const auditOk = safeAudit(actor, 'gift.update', id, `${r.before.name}: ${r.before.active ? 'مفعّلة' : 'معطّلة'}→${r.after.active ? 'مفعّلة' : 'معطّلة'}، السعر ${r.before.price}→${r.after.price}`);
        return out({ ok: true, gift: r.after, auditOk }), true;
      }
      if (a === 'gift-house' && req.method === 'GET') { need(actor, 'wallet.view'); return out({ ...d.wallet.houseView(100), policy:GIFT_REWARD_POLICY,note:'تُسجل تكلفة الهدايا الجديدة بالجواهر، والعائد والبونص كوينز في محافظ اللاعبين. السجلات القديمة تحتفظ بعملتها وحصتها السابقة. أرصدة افتراضية لا تُسحب نقدًا.' }), true; }
      /* بلاغات المجتمع: قراءة وقرار (حذف المحتوى أو رفض البلاغ) مع سجل التدقيق */
      if (a === 'reports' && !id && req.method === 'GET') { need(actor, 'community.moderate'); return out(d.community.reports(String(url.searchParams.get('status') ?? 'open'))), true; }
      if (a === 'reports' && id && (act === 'remove' || act === 'dismiss') && req.method === 'POST') {
        need(actor, 'community.moderate');
        const why = clean((await body()).reason, 200); if (why.length < 3) throw new HttpErr(400, 'اكتب سبب القرار.');
        let auditOk;
        try { const r = d.community.decide(id, act, actor.name, why); auditOk = safeAudit(actor, act === 'remove' ? 'community.remove' : 'community.dismiss', r.author, `بلاغ ${id}: ${why}`); }
        catch (e) { if (e instanceof CommunityError) throw new HttpErr(e.status, e.message); throw e; }
        return out({ ok: true, ...d.community.reports('open'), auditOk }), true;
      }
      if (a === 'audit' && req.method === 'GET') { need(actor, 'audit.view'); const lim = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 100)); const before = Number(url.searchParams.get('before')) || Infinity; return out({ list: P.auditList(lim, before), total: P.auditCount() }), true; }
      if (a === 'system' && req.method === 'GET') { need(actor, 'system.view'); return out(system()), true; }
      // R62: عروض المتجر محدودة الوقت (المالك بس)
      if (a === 'offers') {
        if (actor.role !== 'owner') throw new HttpErr(403, 'عروض المتجر للمالك فقط.');
        if (!d.offers) throw new HttpErr(503, 'غير متاح.');
        if (!id && req.method === 'GET') return out({ list: d.offers.list().map((o) => ({ ...o, itemName: d.shopcat.get(o.itemId)?.name ?? o.itemId })) }), true;
        try {
          if (!id && req.method === 'POST') { const b = await body(); const o = d.offers.add(b, actor.name, (iid) => !!d.shopcat.get(iid) && d.shopcat.get(iid)!.status !== 'hidden'); safeAudit(actor, 'offer.add', o.itemId, `${o.discount}% ${new Date(o.startsAt).toISOString()}→${new Date(o.endsAt).toISOString()}${o.exclusive ? ' حصري' : ''}`); return out({ ok: true, offer: o }), true; }
          if (id && act === 'end' && req.method === 'POST') { const o = d.offers.end(id); safeAudit(actor, 'offer.end', o.itemId, o.id); return out({ ok: true, offer: o }), true; }
        } catch (e) { if (e instanceof Error && 'code' in e && typeof (e as any).code === 'number') throw new HttpErr((e as any).code, e.message); throw e; }
      }
      // R61: حالة الموقع + النسخ الاحتياطية
      if (a === 'health' && req.method === 'GET') { need(actor, 'system.view'); if (!d.health) throw new HttpErr(503, 'غير متاح.'); return out(await d.health()), true; }
      if (a === 'backups') {
        if (actor.role !== 'owner') throw new HttpErr(403, 'النسخ الاحتياطية للمالك فقط.');
        if (!d.backups) throw new HttpErr(503, 'النسخ الاحتياطية مطفية على هالخادم.');
        if (!id && req.method === 'GET') return out({ ...d.backups.status(), list: d.backups.list() }), true;
        if (!id && req.method === 'POST') { try { const b = d.backups.run('manual'); safeAudit(actor, 'backup.run', b.name, String(b.size)); return out({ ok: true, backup: b }), true; } catch (e) { throw new HttpErr(String((e as Error).message) === 'backup_running' ? 409 : 500, String((e as Error).message) === 'backup_running' ? 'فيه نسخة تنسوي الحين.' : 'فشلت النسخة الاحتياطية، شوف الأخطاء.'); } }
        if (id && req.method === 'GET') { safeAudit(actor, 'backup.download', id, ''); if (!d.backups.send(res, id, {})) throw new HttpErr(404, 'النسخة مب موجودة.'); return true; }
      }
      if (a === 'settings' && req.method === 'GET') { need(actor, 'settings.view'); return out(settings()), true; }
      if (a === 'maintenance') {
        if (req.method === 'GET') { need(actor, 'maint.manage'); return out({ ...P.maintenance(), persistent: P.persistent }), true; }
        if (req.method === 'POST') {
          need(actor, 'maint.manage'); const b = await body(); const on = !!b.on; const msg = clean(b.message, 300);
          const before = P.maintenance();
          const m = P.setMaintenance(on, msg, actor.name, (x) => ent(actor, on ? (before.on ? 'maintenance.update' : 'maintenance.on') : 'maintenance.off', '', x.message));
          if (on && !before.on) for (const sid of [...d.sockets.keys()]) if (!P.roleOf(sid)) d.kick(sid, 'maintenance');
          return out({ ok: true, ...m, persistent: P.persistent }), true;
        }
      }
      throw new HttpErr(404, 'مسار غير معروف.');
    } catch (e) {
      if (e instanceof BulkGrantError) { d.json(res, e.status, { error: e.message, code: e.code }); return true; }
      if (e instanceof HttpErr) { d.json(res, e.code, { error: e.message }); return true; }
      if (e instanceof EconomyInputError) { d.json(res,400,{ error:e.message }); return true; }
      if (e instanceof ShopInputError) { d.json(res, e.code, { error: e.message }); return true; }
      if (e instanceof StorageError) { d.json(res, 503, { error: STORAGE_MSG, storage: true }); return true; }
      d.log('admin_error', { message: (e as Error).message }); d.json(res, 500, { error: 'خطأ داخلي.' }); return true;
    }
  }

  const publicStatus = (user: { id: string } | null) => { const m = P.maintenance(); const ban = user ? P.banOf(user.id) : null; return { maintenance: { on: m.on, message: m.message, since: m.since }, staff: !!(user && P.roleOf(user.id)), ban: ban ? { reason: ban.reason } : null, notices: P.activeNotices() }; };
  return { handle, actorOf, audit: safeAudit, maintenanceBlock, banBlock, publicStatus, resumeApprovals, retryBulk: () => { bulkStore.retry(); d.bulkGrants?.runBatch(); }, stop: () => clearInterval(lagTimer) };
}
