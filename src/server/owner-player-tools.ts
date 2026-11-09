import { createHash } from 'node:crypto';
import type { Accounts } from './account.js';
import type { AccountTools } from './account-tools.js';
import type { Progression, ProgressSystem } from './progression.js';
import type { Wallet } from './wallet.js';
import type { ShopCatalog } from './shopcatalog.js';
import { ROLES, type Platform, type OwnerOperation, type Role } from './platform.js';
import { FunctionalHttp, FunctionalHttpError, type FunctionalContext } from './functional-http.js';

interface Deps { accounts: Accounts; accountTools: AccountTools; progression: Progression; wallet: Wallet; shopcat: ShopCatalog; platform: Platform }
const digest = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
function need(v: unknown, text: string, status = 400): asserts v { if (!v) throw new FunctionalHttpError(status, text); }
const ownKey = (actor: string, key: string) => 'owner_' + digest([actor, key]);
const ACTIONS = ['special-id', 'verification', 'rank', 'item', 'role'] as const;

/** One bridge to the existing stores. Prepared, immutable plans survive retry/restart. */
export class OwnerPlayerTools {
  private tails = new Map<string, Promise<unknown>>();
  constructor(private d: Deps) {}
  private target(id: string) { need(/^[0-9a-f-]{36}$/.test(id) && this.d.accounts.has(id), 'حساب اللاعب غير موجود.', 404); }
  view(id: string) {
    this.target(id); const d = this.d, raw = d.progression.view(id), kind = d.accountTools.verificationKind(id);
    const role = d.platform.roleOf(id), effectiveKind = kind === 'administration' && !role ? null : kind;
    return { ok: true, profile: { ...d.accounts.profile(id, d.wallet.has(id) ? d.wallet.adminView(id).coins : 0), id }, role,
      verification: { verified: !!effectiveKind, kind: effectiveKind }, config: d.progression.configView(),
      progression: { level: { ...raw.level, level: raw.level.value }, vip: { ...raw.vip, rank: raw.vip.value }, noble: { ...raw.noble, rank: raw.noble.value } },
      items: d.shopcat.all(), owned: d.wallet.has(id) ? d.wallet.owned(id) : [], equipped: d.wallet.has(id) ? d.wallet.adminView(id).equipped : {},
      pendingOperations: d.platform.ownerPending().filter(o => o.target === id).map(o => ({ key: o.key, action: o.action, body: o.body })) };
  }
  async execute(ctx: FunctionalContext, action: string) {
    const id = ctx.params.id; this.target(id); need(ctx.actor?.role === 'owner', 'المنح والتمييز للمالك فقط.', 403);
    const old = this.tails.get(id) ?? Promise.resolve();
    const run = old.catch(() => undefined).then(() => this.perform(ctx, action)); this.tails.set(id, run);
    try { return await run; } finally { if (this.tails.get(id) === run) this.tails.delete(id); }
  }
  private payload(b: Record<string, unknown>, action: string) {
    const keys: Record<string, string[]> = { 'special-id': ['value'], verification: ['kind'], rank: ['system', 'targetRank'], item: ['itemId', 'equip'], role: ['role', 'confirm'] };
    need(keys[action] && Object.keys(b).every(k => ['key', 'reason', ...keys[action]].includes(k)), 'الطلب يحتوي حقول غير مسموحة.');
    need(typeof b.key === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(b.key), 'معرّف عملية المنح مطلوب.');
    need(typeof b.reason === 'string' && b.reason.trim().length >= 3 && b.reason.length <= 180 && !/[\u0000-\u001f\u007f]|[@＠]|https?:\/\//i.test(b.reason), 'اكتب سببًا نصيًا من 3 إلى 180 حرفًا، دون روابط أو بيانات حساسة.');
    const body: Record<string, unknown> = { key: b.key, reason: b.reason.trim() };
    for (const k of keys[action]) body[k] = b[k];
    return body;
  }
  private plan(id: string, action: string, b: Record<string, unknown>) {
    const d = this.d;
    if (action === 'special-id') {
      need(b.value === null || (typeof b.value === 'string' && /^[1-9][0-9]{0,7}$/.test(b.value)), 'الـ ID المميز من رقم إلى 8 أرقام، ولا يبدأ بصفر.');
      if (typeof b.value === 'string') { const holder = d.accounts.findByDisplayPlayerId(b.value); need(!holder || holder === id, 'هالـ ID مستخدم لحساب ثاني.', 409); }
      // R67ae: الأرقام من خانة لين ثلاث خانات للإدارة بس
      if (typeof b.value === 'string' && b.value.length <= 3) need(d.platform.roleOf(id), 'الأيدي من خانة لين ثلاث خانات للحسابات الإدارية بس. عيّن دور الإدارة للحساب أول.', 409);
      return { value: b.value };
    }
    if (action === 'verification') {
      need(b.kind === null || b.kind === 'standard' || b.kind === 'administration', 'نوع التوثيق غير صالح.');
      if (b.kind === 'administration') need(d.platform.roleOf(id), 'عيّن دور الإدارة للحساب أولًا، ثم امنحه التوثيق الإداري.', 409);
      return { kind: b.kind };
    }
    if (action === 'rank') {
      need(['level', 'vip', 'noble'].includes(String(b.system)), 'نظام الترقية غير صالح.');
      const system = b.system as ProgressSystem, max = system === 'level' ? 100 : system === 'vip' ? 15 : 5;
      need(Number.isSafeInteger(b.targetRank) && Number(b.targetRank) >= 1 && Number(b.targetRank) <= max, 'الرتبة المطلوبة خارج المجال.');
      const cfg = d.progression.configView(), view = d.progression.view(id), rank = Number(b.targetRank);
      let minimum: number, current: number;
      if (system === 'level') { minimum = 40 * (rank - 1) ** 2; current = view.level.xp; }
      else { need(cfg[system].enabled && cfg[system].thresholds, 'النظام مقفل: لا يمكن منح رتبة قبل اعتماد سياسة الترقيات.', 409); minimum = cfg[system].thresholds![rank - 1]; current = view[system].points; }
      need(minimum >= current, 'هذي الأداة للترقية فقط؛ لا تخصم نقاطًا أو تخفّض رتبة اللاعب.', 409);
      return { system, targetRank: rank, points: Math.max(0, minimum - current), minimum };
    }
    if (action === 'item') {
      need(typeof b.itemId === 'string' && typeof b.equip === 'boolean', 'اختر المقتنى وحدد إن كنت تريد تجهيزه.');
      const item = d.shopcat.get(b.itemId); need(item && ['avatar', 'badge', 'frame', 'bg', 'title'].includes(item.slot), 'المقتنى غير موجود أو غير مدعوم.', 404);
      need(d.wallet.has(id), 'افتح حساب اللاعب مرة لتفعيل محفظته قبل منحه مقتنى.', 409);
      return { itemId: item.id, slot: item.slot, equip: b.equip };
    }
    need(b.role === null || ROLES.includes(b.role as Role), 'الدور الإداري غير صالح.');
    need(b.confirm === true, 'أكد تغيير صلاحيات الحساب أولًا.');
    return { role: b.role };
  }
  private async perform(ctx: FunctionalContext, action: string) {
    const d = this.d, id = ctx.params.id, a = ctx.actor!; need(ACTIONS.includes(action as typeof ACTIONS[number]), 'الإجراء غير موجود.', 404);
    const body = this.payload(ctx.body, action), key = String(body.key), opid = ownKey(a.id, key), fp = digest([id, action, body]);
    let op = d.platform.ownerOperation(opid);
    if (op) {
      need(op.fingerprint === fp, 'مفتاح العملية مستخدم لمنح مختلف؛ لا يمكن إعادة استخدامه.', 409);
      if (op.state === 'done') return { ...op.result, dup: true, view: this.view(id) };
    } else {
      need(!d.platform.ownerPending().some(o => o.target === id), 'في عملية محفوظة لهذا اللاعب. استكملها أولًا.', 409);
      const plan = this.plan(id, action, body);
      op = d.platform.beginOwnerOperation({ id: opid, target: id, actorId: a.id, actor: a.name, action, fingerprint: fp, reason: String(body.reason), key, body, plan, at: Date.now(), state: 'pending' });
    }
    return this.apply(op);
  }
  private async apply(op: OwnerOperation) {
    const d = this.d, id = op.target, p = op.plan, by = { id: op.actorId, name: op.actor, role: 'owner' as const }; this.target(id);
    let grantedPoints = 0;
    if (op.action === 'special-id') d.accounts.setSpecialPlayerId(id, p.value as string | null);
    else if (op.action === 'verification') {
      if (p.kind === 'administration') need(d.platform.roleOf(id), 'الدور الإداري أزيل؛ أعد تعيينه لاستكمال التوثيق.', 409);
      d.accountTools.grantVerification(id, p.kind as 'standard' | 'administration' | null, op.reason, by, op.id);
    } else if (op.action === 'rank') {
      grantedPoints = Number(p.points);
      if (grantedPoints > 0) d.progression.grant(id, p.system as ProgressSystem, grantedPoints, op.id, op.reason, 'admin');
    } else if (op.action === 'item') {
      const item = d.shopcat.get(String(p.itemId)); need(item && item.slot === p.slot, 'المقتنى المحفوظ غير متاح.', 409);
      if (!d.wallet.owned(id).includes(item.id)) {
        const result = await d.wallet.grantBulk(op.id, [id], [{ type: 'item', itemId: item.id, mode: 'grant' }], op.reason);
        need(result.succeeded === 1 || d.wallet.owned(id).includes(item.id), 'تعذّر حفظ منح المقتنى.', 409);
      }
      if (p.equip === true) need(d.wallet.equip(id, item.slot, item.id), 'المقتنى مملوك لكن تعذّر تجهيزه.', 409);
    } else {
      if (p.role === null) d.platform.removeStaff(id);
      else d.platform.setStaff(id, d.accounts.nameOf(id), p.role as Role, op.actor);
    }
    const result = { ok: true, dup: false, operationId: op.key, action: op.action, grantedPoints };
    d.platform.finishOwnerOperation(op.id, result);
    return { ...result, view: this.view(id) };
  }
  async resumePending() {
    let resumed = 0;
    for (const op of this.d.platform.ownerPending()) { try { await this.apply(op); resumed++; } catch { /* Pending remains durable, visible and resumable by owner. */ } }
    return resumed;
  }
  wire(http: FunctionalHttp) {
    http.add('GET', '/api/admin/players/:id/owner-tools', ctx => this.view(ctx.params.id), 'owner');
    for (const action of ACTIONS) http.add('POST', '/api/admin/players/:id/owner-tools/' + action, ctx => this.execute(ctx, action), 'owner');
    return http;
  }
}
