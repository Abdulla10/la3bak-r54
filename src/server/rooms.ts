import { Banter, personaByName, personaName, personaOf, personasFor } from './personas-r72.js';
import { randomInt, randomUUID, randomBytes, createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);

import type { Registry } from '../engine/registry.js';
import type { Engine, PlayerRef } from '../engine/types.js';
import type { Config } from './config.js';
import { isRetiredGame, RETIRED_GAME_MESSAGE } from '../engine/retired-games.js';
import type { Room, RoomPlayer, RoomStore } from './store.js';
import type { Leaderboard } from './leaderboard.js';
import type { Wallet } from './wallet.js';
import type { Accounts } from './account.js';

export interface User {
  id: string;
  name: string;
}

/** Server-only verified source; never project passwords, creation keys or engine state. */
export interface GameVoiceContext {
  code: string;
  createdAt: number;
  hostId: string;
  gameId: string;
  seats: number;
  players: { id: string; bot: false }[];
}

export type Res<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export type RoomProfileSlot = 'frame' | 'bg' | 'badge' | 'title';
/** مظهر عام فقط؛ لا أسعار أو ملكيات أو إعدادات أو مراجع عمليات. */
export interface RoomProfileItem {
  id: string;
  name: string;
  css?: string;
  art?: string;
  rarity?: string;
  earned?: boolean;
}
export interface RoomProgression {
  level: { value: number; xp: number; xpFloor: number; xpNext: number | null; enabled: boolean; max: number };
  vip: { value: string | null; points: number; enabled: boolean; max: number };
  noble: { value: string | null; points: number; enabled: boolean };
}
/** يُقرأ من الخادم عند كل لقطة؛ callback متزامن ولا يحفظ بياناته في الغرفة. */
export interface RoomProfile {
  verified?: boolean;
  progression?: RoomProgression | null;
  equipped?: Partial<Record<RoomProfileSlot, RoomProfileItem | null>>;
}
export type RoomProfileReader = (id: string) => RoomProfile | null | undefined;

export interface Snapshot {
  stake: number;
  visibility: 'code' | 'private';
  requiresPassword: boolean;
  code: string;
  hostId: string;
  mode: Room['mode'];
  botLevel?: 'easy' | 'normal' | 'pro' | null;
  gameId: string;
  seats: number;
  status: Room['status'];
  revision: number;
  you: string;
  serverNow: number;
  players: { id: string; name: string; bot: boolean; connected: boolean; connectionState: 'online' | 'reconnecting' | 'offline'; reconnectUntil: number | null; ready: boolean; host: boolean; left: boolean; /** رقم نسخة صورته المرفوعة أو null (الصورة نفسها من /api/room-avatar لمن بالغرفة فقط) */ avatar: number | null; /** معرّف الأفاتار المدفوع المجهّز (من الخادم) أو null */ av: string | null; /** مستوى اللاعب من الحسابات (البشر فقط) */ level: number | null; /** عام فقط ولأعضاء الغرفة النشطين؛ لا رتبة للبوت */ profile?: RoomProfile | null }[];
  gameNo: number;
  game: unknown | null;
  /** نتيجة اللعبة بعد انتهائها: مين فاز ونقاط كل واحد */
  outcome: { winners: string[]; scores?: Record<string, number> } | null;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;

export function normalizeCode(input: unknown): string {
  return String(input ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toUpperCase()
    .replace(/[\s\-_]/g, '');
}

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** ردود سريعة جاهزة: إيموجي وعبارات قصيرة فقط، بدون كتابة حرة (آمنة للأطفال) */
export const REACTIONS = ['👍', '😂', '😮', '😡', '🔥', '👏', '🤔', '❤️', '😎', '🙏', 'يلا!', 'حظ سعيد', 'أحسنت', 'استعجل ⏳'];

export interface Hooks {
  /** رد سريع من لاعب: وزّعه على بقية اللاعبين */
  onReact?(room: Room, fromId: string, fromName: string, text: string): void;
  /** بعد كل تغيير محفوظ: وزّع الحالة على اللاعبين */
  onRoom(room: Room): void;
  /** الغرفة اختفت أو اللاعب طلع منها */
  onGone(code: string, userIds: string[], reason: 'deleted' | 'left' | 'expired'): void;
  /** تغيّر رصيد لاعب (جائزة) */
  onWallet?(userId: string, coins: number, won: number): void;
  /** R68y: نسبة مكافأة إضافية للفائز فوق الجائزة */
  prizeBonus?(): number;
  /** نتيجة لعبة محفوظة بنجاح؛ يُستخدم لربط progression دون إعادة احتسابها. */
  onGameFinished?(room: Room, players: { id: string; name: string }[], winners: string[], ref: string): void;
  /** R72: لاعب هزم شخصية الكمبيوتر اللي اختارها */
  onPersonaBeaten?(userId: string, personaId: string, reward: number, room: Room): void;
  /** R69zl: كل حركة لاعب حقيقي قبل التنفيذ (لكشف الغش) */
  onHumanAction?(room: Room, userId: string, action: unknown, stateBefore: unknown, now: number): void;
  /** R69zl: لاعب جوائزه موقوفة (اشتباه غش) — ما تنحسب نتايجه */
  held?(id: string): boolean;
  /** R60: حسابات ما تاخذ نتائج/خبرة/جوايز (الضيف ضد الكمبيوتر) */
  noRewards?(id: string): boolean;
  /** Optional reservation before finished-room/source writes; failure leaves the stored game unchanged. */
  onBeforeGameFinished?(room: Room, players: { id: string; name: string }[], winners: string[], ref: string, ts: number): void | (() => void);
  log?(event: string, data?: Record<string, unknown>): void;
}

interface BotPlanEntry {
  at: number;
  ver: number;
  action: unknown;
}

export class RoomService {
  private locks = new Map<string, Promise<unknown>>();
  private online = new Map<string, number>();
  private botPlans = new Map<string, BotPlanEntry>();
  /** R72: كلام الشخصيات */
  private banter = new Banter(() => this.now());
  /** طلب إغلاق إداري تعلّق حفظ استرجاعه؛ نوقف اللعب لين يثبت الاسترجاع. */
  private closingPaid = new Set<string>();
  private finishedPayoutQueue: string[] = [];

  constructor(
    private store: RoomStore,
    private registry: Registry,
    private cfg: Config,
    private hooks: Hooks,
    private now: () => number = Date.now,
    private board?: Leaderboard,
    private wallet?: Wallet,
    private accounts?: Accounts,
    private avatarVersion?: (id: string) => number | null,
    private equippedAvatar?: (id: string) => string | null,
    private serverProfile?: RoomProfileReader,
  ) {}

  private lastReact = new Map<string, number>();
  /** ردود سريعة: ما تنحفظ ولا تغيّر حالة اللعبة، بس تنوزع على اللي بالغرفة */
  async react(user: User, rawCode: unknown, text: unknown): Promise<Res> {
    if (typeof text !== 'string' || !REACTIONS.includes(text)) return fail('هذا الرد غير مسموح.');
    const code = normalizeCode(rawCode);
    if (!CODE_RE.test(code)) return fail('رمز الغرفة غير صحيح.');
    const room = await this.store.get(code);
    if (!room || !this.member(room, user.id)) return fail('أنت مو في هذي الغرفة.');
    const t = this.now();
    if (t - (this.lastReact.get(user.id) ?? 0) < 1200) return fail('بطيء شوي.');
    this.lastReact.set(user.id, t);
    if (this.lastReact.size > 5000) this.lastReact.clear();
    this.hooks.onReact?.(room, user.id, user.name, text);
    return { ok: true };
  }

  // ---------- أدوات داخلية ----------

  private async lock<T>(code: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(code) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    const tail = run.catch(() => undefined);
    this.locks.set(code, tail);
    try {
      return await run;
    } finally {
      if (this.locks.get(code) === tail) this.locks.delete(code);
    }
  }

  private async persist(room: Room): Promise<void> {
    const engine = this.engineOf(room);
    const ref = `${room.code}:${room.gameNo}`;
    const rewarded = room.players.filter((p) => !p.bot && !(room.mode === 'bots' && this.hooks.noRewards?.(p.id)));
    const release = rewarded.length && this.accounts && room.status === 'finished' && room.state && room.gameNo && engine && !this.accounts.hasRecorded(ref)
      ? this.hooks.onBeforeGameFinished?.(room, rewarded.map((p) => ({ id: p.id, name: p.name })), engine.outcome(room.state).winners, ref, this.now()) : undefined;
    try {
      const expected = room.revision;
      room.revision = expected + 1;
      room.updatedAt = this.now();
      const ok = await this.store.update(room, expected);
      if (!ok) {
        room.revision = expected;
        throw new Error('conflict');
      }
      const won = this.settle(room);
      this.tally(room);
      this.account(room, won);
      this.personaEndTalk(room);
    } finally { if (typeof release === 'function') release(); }
  }

  /** الحساب الموحّد: تاريخ + إحصاءات + نقاط تصنيف + خبرة، مرة وحدة لكل لعبة منتهية */
  private account(room: Room, coins: Record<string, number>) {
    if (!this.accounts || room.status !== 'finished' || !room.state || !room.gameNo) return;
    const engine = this.engineOf(room);
    if (!engine) return;
    // اللي غادر بنص المباراة يظل ضمن نتيجتها (يخسر مثل الصندوق)، وإلا نتيجته ما تنحسب عليه
    const humans = room.players.filter((p) => !p.bot && !(room.mode === 'bots' && this.hooks.noRewards?.(p.id)) && !this.hooks.held?.(p.id));
    if (!humans.length) return;
    const ref = `${room.code}:${room.gameNo}`;
    const players = humans.map((p) => ({ id: p.id, name: p.name }));
    const winners = engine.outcome(room.state).winners;
    if (this.accounts.record(ref, room.gameId, players, winners, room.stake ?? 0, coins)) { this.hooks.onGameFinished?.(room, players, winners, ref); this.personaFinish(room, winners, players); }
  }

  /** نقاط الصدارة: من الخادم، مرة وحدة لكل لعبة منتهية، ولاعبين حقيقيين فأكثر */
  private tally(room: Room) {
    if (!this.board || room.status !== 'finished' || !room.state || !room.gameNo) return;
    const engine = this.engineOf(room);
    if (!engine) return;
    const out = engine.outcome(room.state);
    const humans = room.players.filter((p) => !p.bot && !this.hooks.held?.(p.id)); // نفس منطق الحساب: المغادر بنص المباراة يظل بنتيجتها
    this.board.record(`${room.code}:${room.gameNo}`, humans.map((p) => ({ id: p.id, name: p.name })), out.winners);
  }

  /** جوائز المطابقة (عملات افتراضية): مرة وحدة لكل لعبة منتهية */
  private settle(room: Room): Record<string, number> {
    if (!this.wallet || !room.stake || !room.payers?.length || room.status !== 'finished' || !room.state || !room.gameNo) return {};
    if (room.gameNo !== 1) return {}; // الجولات المدفوعة القديمة الأعلى من الأولى ما عندها عقد خصم مثبت.
    if (this.refundClosing(room)) return {};
    const engine = this.engineOf(room);
    if (!engine) return {};
    const winners = engine.outcome(room.state).winners;
    const got = this.wallet.settle(`${room.code}:${room.gameNo}`, room.payers, room.stake, winners);
    const pct = Object.keys(got).length ? Math.max(0, Math.min(100, Math.floor(this.hooks.prizeBonus?.() ?? 0))) : 0;
    const w = winners.filter((id) => room.payers!.includes(id));
    if (pct > 0 && w.length) {
      const each = Math.floor(room.stake * room.payers.length * pct / 100 / w.length);
      if (each > 0) for (const id of w) try { if (this.wallet.grant(id, 'coins', each, `مكافأة فوز إضافية ${pct}%`, `prizebonus:${room.code}:${room.gameNo}:${id}`)) got[id] = (got[id] ?? 0) + each; } catch { /* الجائزة الأساسية انصرفت */ }
    }
    for (const [id, n] of Object.entries(got)) this.hooks.onWallet?.(id, this.wallet.balance(id), n);
    return got;
  }

  private paid(room: Room): boolean { return (room.stake ?? 0) > 0; }

  private refundKey(room: Room): string { return `refund:adm:${room.code}:${room.gameNo ?? 0}`; }

  /** status=finished ما يثبت حفظ الدفع. نقرأ دليل الحركة من المحفظة الحالية، بدون مخطط يديد. */
  private payoutRecorded(room: Room, ref: string): boolean {
    if (!this.wallet || !this.paid(room) || !room.payers?.length || new Set(room.payers).size !== room.payers.length) return false;
    const pool = room.stake! * room.payers.length;
    if (!Number.isSafeInteger(pool) || pool <= 0) return false;
    let paid = 0;
    for (const id of room.payers) {
      for (const entry of this.wallet.ledgerOf(id, this.wallet.ledgerCount(id))) {
        if (entry.ref === ref && (entry.kind === 'prize' || entry.kind === 'refund') && entry.cur === 'coins' && entry.delta > 0) paid += entry.delta;
      }
    }
    return paid === pool;
  }

  private unresolvedPaid(room: Room): boolean {
    return this.paid(room) && !this.payoutRecorded(room, `${room.code}:${room.gameNo ?? 0}`) && !this.payoutRecorded(room, this.refundKey(room));
  }

  private refundClosing(room: Room): boolean {
    return this.closingPaid.has(this.refundKey(room)) || (this.paid(room) && this.payoutRecorded(room, this.refundKey(room)));
  }

  private async guard<T extends object>(fn: () => Promise<Res<T>>): Promise<Res<T>> {
    try {
      return await fn();
    } catch (e) {
      this.hooks.log?.('service_error', { message: (e as Error).message });
      return fail('صار خطأ، جرّب مرة ثانية.');
    }
  }

  private isOnline(userId: string): boolean {
    return (this.online.get(userId) ?? 0) > 0;
  }

  private humans(room: Room): RoomPlayer[] {
    return room.players.filter((p) => !p.bot && !p.left);
  }

  private engineOf(room: Room): Engine | undefined {
    // Preserve historical results and outstanding payouts, never used to admit new rooms.
    return this.registry.historyEngine?.(room.gameId) ?? this.registry.get(room.gameId);
  }

  /** صورة لاعب: يُسمح فقط لو الطالب ولاعب الصورة (بشري) كلاهما في نفس الغرفة. ما فيه وصول لصور غير اللي معك بالغرفة */
  async coPlayer(user: User, rawCode: unknown, targetId: unknown): Promise<boolean> {
    const code = normalizeCode(rawCode);
    if (!CODE_RE.test(code) || typeof targetId !== 'string' || targetId.length > 64) return false;
    const room = await this.store.get(code);
    return !!room && !!this.member(room, user.id) && !!this.member(room, targetId);
  }

  /** نوع الغرفة لو الطالب عضو فيها (لعقوبة الخروج المتكرر) */
  async modeFor(user: User, rawCode: unknown): Promise<string | null> {
    const code = normalizeCode(rawCode);
    if (!CODE_RE.test(code)) return null;
    const room = await this.store.get(code);
    return room && this.member(room, user.id) ? room.mode : null;
  }

  /** اللاعبون البشر الحاليون بالغرفة (للهدايا والمحادثة) لو الطالب عضو فيها؛ وإلا null */
  async humansFor(user: User, rawCode: unknown): Promise<{ code: string; players: { id: string; name: string }[] } | null> {
    const code = normalizeCode(rawCode);
    if (!CODE_RE.test(code)) return null;
    const room = await this.store.get(code);
    if (!room || !this.member(room, user.id)) return null;
    return { code, players: room.players.filter((p) => !p.bot && !p.left).map((p) => ({ id: p.id, name: p.name })) };
  }

  /** Keep source authorization locked through the server-only consumer's commit.
   * No social invitation can substitute for active game membership. */
  voiceContext<T extends object = { context: GameVoiceContext }>(user: User, rawCode: unknown, consume?: (context: GameVoiceContext) => Promise<T>): Promise<Res<T>> {
    return this.withRoom(user, rawCode, async room => {
      const member = this.member(room, user.id)!;
      if (member.reconnectUntil !== undefined && member.reconnectUntil <= this.now()) return fail('أنت مو في هذي الغرفة.');
      const context: GameVoiceContext = {code:room.code,createdAt:room.createdAt,hostId:room.hostId,gameId:room.gameId,seats:room.seats,
        players:this.humans(room).filter(p=>p.reconnectUntil===undefined||p.reconnectUntil>this.now()).map(p=>({id:p.id,bot:false}))};
      const result = consume ? await consume(context) : {context} as unknown as T;
      return {ok:true as const,...result};
    });
  }

  private member(room: Room, userId: string): RoomPlayer | undefined {
    return room.players.find((p) => p.id === userId && !p.bot && !p.left);
  }

  private botName(n: number) {
    return `🤖 الكمبيوتر ${n}`;
  }

  private syncBots(room: Room) {
    if (room.mode !== 'bots') return;
    const humans = room.players.filter((p) => !p.bot);
    room.players = [...humans, ...this.makeBots(room.seats - humans.length, room)];
  }

  private makeBots(n: number, room?: Room): RoomPlayer[] {
    /* R72: البوتات صاروا شخصيات (أبو سالم، أم فهد…) — الأول هو الخصم اللي اخترته */
    const ps = room ? personasFor(room.code, room.persona, Math.max(0, n)) : [];
    return Array.from({ length: Math.max(0, n) }, (_, i) => ({
      id: `bot-${i + 1}`,
      name: ps[i] ? personaName(ps[i]) : this.botName(i + 1),
      bot: true,
      ready: true,
      left: false,
    }));
  }

  /** whitelist عميق حتى لو أعاد callback ملف حساب كامل بالخطأ. */
  private publicProfile(id: string): RoomProfile | null {
    let source: RoomProfile | null | undefined;
    try { source = this.serverProfile?.(id); }
    catch { this.hooks.log?.('room_profile_error'); return null; }
    if (!source || typeof source !== 'object') return null;
    const out: RoomProfile = { verified: source.verified === true };
    const p = source.progression;
    if (p && typeof p === 'object') {
      const nat = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
      const lv = p.level, vip = p.vip, noble = p.noble;
      if (lv && vip && noble && nat(lv.value) && lv.value >= 1 && nat(lv.xp) && nat(lv.xpFloor)
        && (lv.xpNext === null || nat(lv.xpNext)) && nat(lv.max) && nat(vip.points) && nat(vip.max) && nat(noble.points)) {
        out.progression = {
          level: { value: lv.value, xp: lv.xp, xpFloor: lv.xpFloor, xpNext: lv.xpNext, enabled: lv.enabled === true, max: lv.max },
          vip: { value: vip.enabled === true && typeof vip.value === 'string' && /^V(?:[1-9]|1[0-5])$/.test(vip.value) ? vip.value : null, points: vip.points, enabled: vip.enabled === true, max: vip.max },
          noble: { value: noble.enabled === true && typeof noble.value === 'string' && /^N[1-9]$/.test(noble.value) ? noble.value : null, points: noble.points, enabled: noble.enabled === true },
        };
      } else out.progression = null;
    } else out.progression = null;
    out.equipped = {};
    for (const slot of ['frame', 'bg', 'badge', 'title'] as const) {
      const item = source.equipped?.[slot];
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || typeof item.name !== 'string') {
        out.equipped[slot] = null;
        continue;
      }
      const view: RoomProfileItem = { id: item.id, name: item.name };
      if (typeof item.css === 'string') view.css = item.css;
      // أصول ثابتة محلية فقط؛ ليس رابط صورة خاصة أو data/URL خارجي.
      if (typeof item.art === 'string' && /^\/assets\/[A-Za-z0-9_/-]+\.(?:webp|png|svg|jpg|jpeg)$/.test(item.art)
        && !item.art.split('/').includes('..')) view.art = item.art;
      if (typeof item.rarity === 'string' && /^(?:common|premium|rare|epic|legendary|ultra|exclusive)$/.test(item.rarity)) view.rarity = item.rarity;
      if (typeof item.earned === 'boolean') view.earned = item.earned;
      out.equipped[slot] = view;
    }
    return out;
  }

  snapshot(room: Room, userId: string): Snapshot {
    const engine = this.engineOf(room);
    const now = this.now();
    return {
      code: room.code,
      stake: room.stake ?? 0,
      visibility: room.access ? 'private' : 'code',
      requiresPassword: !!room.access,
      hostId: room.hostId,
      mode: room.mode,
      botLevel: room.mode === 'bots' ? room.botLevel ?? 'normal' : null,
      gameId: room.gameId,
      seats: room.seats,
      status: room.status,
      revision: room.revision,
      you: userId,
      serverNow: now,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        bot: p.bot,
        connected: p.bot ? true : this.isOnline(p.id),
        connectionState: p.bot || this.isOnline(p.id) ? 'online' : !p.left && (p.reconnectUntil ?? 0) > now ? 'reconnecting' : 'offline',
        reconnectUntil: !p.bot && !p.left && !this.isOnline(p.id) ? p.reconnectUntil ?? null : null,
        ready: p.ready,
        host: p.id === room.hostId,
        left: p.left,
        avatar: p.bot || !this.avatarVersion ? null : this.avatarVersion(p.id),
        av: p.bot || !this.equippedAvatar ? null : this.equippedAvatar(p.id),
        level: p.bot || !this.accounts ? null : this.accounts.level(p.id),
        ...(this.serverProfile ? { profile: p.bot || p.left || !this.member(room, userId) ? null : this.publicProfile(p.id) } : {}),
      })),
      gameNo: room.gameNo ?? 0,
      game: room.state && engine && room.status !== 'lobby' ? engine.view(room.state, userId, now) : null,
      outcome: room.state && engine && room.status === 'finished' ? engine.outcome(room.state) : null,
    };
  }

  private async emit(room: Room) {
    this.hooks.onRoom(room);
  }

  private async newCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      let c = '';
      for (let j = 0; j < 5; j++) c += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      if (!(await this.store.get(c))) return c;
    }
    throw new Error('no_code');
  }

  // ---------- الاتصال ----------

  private graceMs(): number { return this.cfg.reconnectGraceMs ?? 120_000; }

  /** بعد بدء الخادم: العضويات الموجودة محفوظة، والاتصال الحي يبدأ من الصفر. */
  async restorePresence(): Promise<void> {
    for (const prior of await this.store.listUpdatedBefore(this.now() + 1)) {
      await this.lock(prior.code, async () => {
        const room = await this.store.get(prior.code);
        if (!room) return;
        let changed = false;
        for (const p of this.humans(room)) {
          if (p.reconnectUntil !== undefined) continue; // لا نجدد مهلة انتهت قبل إعادة التشغيل
          p.disconnectedAt = this.now(); p.reconnectUntil = p.disconnectedAt + this.graceMs(); changed = true;
        }
        /* R71: الوقت اللي كان السيرفر فيه طافي (تحديث) ما ينحسب على اللاعب: نعطي الدور الحالي 20 ثانية على الأقل */
        const st = room.status === 'playing' ? room.state as { endsAt?: unknown; phase?: unknown } | null : null;
        if (st && typeof st === 'object' && typeof st.endsAt === 'number' && st.endsAt > 0 && st.phase !== 'final' && st.endsAt < this.now() + 20_000) {
          room.state = { ...st, endsAt: this.now() + 20_000 }; changed = true;
        }
        if (changed) await this.persist(room);
      });
    }
  }

  async connect(userId: string): Promise<Snapshot[]> {
    this.online.set(userId, (this.online.get(userId) ?? 0) + 1);
    const snapshots: Snapshot[] = [];
    for (const prior of await this.store.listByUser(userId)) {
      await this.lock(prior.code, async () => {
        const room = await this.store.get(prior.code);
        if (!room) return;
        const p = this.member(room, userId);
        if (!p) return;
        // قد يقفل المقبس أثناء انتظار DB؛ لا نمسح مهلة الانقطاع إذا ما بقي اتصال حي.
        if (this.isOnline(userId)) {
          if (p.reconnectUntil !== undefined && p.reconnectUntil <= this.now()) {
            await this.removeMember(room, userId); return;
          }
          if (p.disconnectedAt !== undefined || p.reconnectUntil !== undefined) {
            delete p.disconnectedAt; delete p.reconnectUntil; await this.persist(room);
          }
          await this.emit(room);
        }
        snapshots.push(this.snapshot(room, userId));
      });
    }
    return snapshots;
  }

  async disconnect(userId: string): Promise<void> {
    const count = this.online.get(userId) ?? 0;
    if (!count) return;
    if (count > 1) { this.online.set(userId, count - 1); return; }
    this.online.delete(userId);
    const at = this.now();
    for (const prior of await this.store.listByUser(userId)) {
      await this.lock(prior.code, async () => {
        if (this.isOnline(userId)) return; // رجع قبل اكتمال عملية الانقطاع
        const room = await this.store.get(prior.code);
        const p = room && this.member(room, userId);
        if (!room || !p) return;
        if (p.reconnectUntil === undefined) { p.disconnectedAt = at; p.reconnectUntil = at + this.graceMs(); await this.persist(room); }
        await this.emit(room);
      });
    }
  }

  /** انتهاء المهلة يعامل كخروج عادي: نقل المضيف/حذف الفارغة، دون تغيير قواعد نتائج الألعاب. */
  async expireDisconnected(): Promise<number> {
    let removed = 0;
    for (const prior of await this.store.listUpdatedBefore(this.now() + 1)) {
      if (!prior.players.some(p => !p.bot && !p.left && p.reconnectUntil !== undefined && p.reconnectUntil <= this.now())) continue;
      await this.lock(prior.code, async () => {
        const room = await this.store.get(prior.code);
        if (!room) return;
        for (const p of this.humans(room)) {
          if (this.isOnline(p.id) || p.reconnectUntil === undefined || p.reconnectUntil > this.now()) continue;
          await this.removeMember(room, p.id);
          if (!(await this.store.get(room.code))) { removed++; break; }
        }
      });
    }
    return removed;
  }

  async mine(user: User): Promise<Snapshot[]> {
    return (await this.store.listByUser(user.id)).map((r) => this.snapshot(r, user.id));
  }

  /** ربط داخلي بعد حفظ مظهر/توثيق/تقدم اللاعب: بث جديد دون تعديل revision أو بيانات الغرفة. */
  async refreshProfile(userId: string): Promise<void> {
    if (!this.serverProfile) return;
    for (const room of await this.store.listByUser(userId)) {
      if (this.member(room, userId)) await this.emit(room);
    }
  }

  // ---------- الغرف ----------

  createRoom(user: User, p: { gameId: unknown; mode: unknown; seats: unknown; key?: unknown; visibility?: unknown; password?: unknown; botLevel?: unknown; persona?: unknown }): Promise<Res<{ room: Snapshot }>> {
    return this.guard(() => this.lock('create:' + user.id, async () => {
      const engine = typeof p.gameId === 'string' ? this.registry.get(p.gameId) : undefined;
      if (!engine || engine.info.status !== 'available') return fail('هذي اللعبة مو متاحة الحين.');
      const mode = p.mode === 'bots' ? 'bots' : p.mode === 'friends' ? 'friends' : null;
      if (!mode) return fail('اختر: مع الأصدقاء أو مع الكمبيوتر.');
      if (mode === 'bots' && !engine.info.supportsBots) return fail('هذي اللعبة ما فيها وضع الكمبيوتر.');
      const seats = Number(p.seats);
      const { minPlayers, maxPlayers } = engine.info;
      if (!Number.isInteger(seats) || seats < minPlayers || seats > maxPlayers) return fail(`عدد المقاعد لازم يكون من ${minPlayers} إلى ${maxPlayers}.`);
      // API يتطلب المفتاح؛ الاستدعاءات الداخلية القديمة تحصل على عملية مستقلة متوافقة.
      const key = p.key === undefined ? randomUUID() : p.key;
      if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) return fail('مفتاح إنشاء الغرفة غير صالح. حدّث الصفحة.');
      if (p.visibility !== undefined && p.visibility !== 'code' && p.visibility !== 'private') return fail('نوع حماية الغرفة غير صالح.');
      const privateRoom = p.visibility === 'private';
      if (privateRoom && mode !== 'friends') return fail('كلمة المرور لغرف الأصدقاء فقط.');
      const password = p.password;
      if (privateRoom && (typeof password !== 'string' || password.length < 8 || password.length > 128 || Buffer.byteLength(password) > 512)) return fail('كلمة مرور الغرفة من 8 إلى 128 حرف.');
      if (!privateRoom && password !== undefined && password !== '') return fail('اختر غرفة خاصة لاستخدام كلمة مرور.');
      const fingerprint = createHmac('sha256',this.cfg.cookieSecret).update(JSON.stringify([engine.info.id,mode,seats,privateRoom,privateRoom ? password : ''])).digest('hex');
      const now = this.now();
      const room: Room = { code: await this.newCode(), hostId: user.id, mode, gameId: engine.info.id, seats, status:'lobby',
        players:[{id:user.id,name:user.name,bot:false,ready:true,left:false}],state:null,revision:1,createdAt:now,updatedAt:now,
        creation:{key,fingerprint} };
      if (mode === 'bots' && (p.botLevel === 'easy' || p.botLevel === 'pro')) room.botLevel = p.botLevel;
      /* R72: شخصية الخصم تحدد المستوى */
      const persona = mode === 'bots' ? personaOf(p.persona) : null;
      if (persona) { room.persona = persona.id; if (persona.level === 'normal') delete room.botLevel; else room.botLevel = persona.level; }
      if (privateRoom) {
        const salt = randomBytes(16).toString('hex');
        room.access = { visibility:'private',salt,passwordHash:((await scrypt(password as string,salt,64)) as Buffer).toString('hex') };
      }
      this.syncBots(room);
      if (!this.store.createRoomAtomic) return fail('مخزن الغرف يحتاج تحديث حماية الإنشاء.');
      for (let attempt=0;attempt<5;attempt++) {
        const result=await this.store.createRoomAtomic(room,key,fingerprint,{maxRooms:this.cfg.maxRoomsPerUser,maxBotRooms:this.cfg.maxBotRoomsPerUser});
        if (result.kind==='collision') { room.code=await this.newCode(); continue; }
        if (result.kind==='mismatch') return fail('هذا المفتاح مستخدم لاختيارات غرفة مختلفة. ابدأ طلب إنشاء يديد.');
        if (result.kind==='gone') return fail('الغرفة المنشأة بهالطلب انحذفت. ابدأ طلب إنشاء يديد.');
        if (result.kind==='room_limit') {
          /* R69j: نقفل الغرف القديمة اللي ما بدت (انتظار) بدال ما نطلب من اللاعب يحذفها */
          if (attempt < 2) { const olds = (await this.store.listByUser(user.id)).filter((r) => r.hostId === user.id && r.status === 'lobby' && !this.unresolvedPaid(r)).sort((a, b) => a.updatedAt - b.updatedAt); for (const old of olds) await this.leave(user, old.code).catch(() => null); if (olds.length) continue; }
          return fail(`عندك ${this.cfg.maxRoomsPerUser} غرف مفتوحة، احذف وحدة منها أول.`);
        }
        if (result.kind==='bot_limit') {
          /* R69j: غرفة التدريب القديمة تنقفل بروحها ونبدأ الجديدة على طول */
          if (attempt < 2) { for (const old of await this.store.listByUser(user.id)) if (old.mode === 'bots' && old.hostId === user.id && !this.unresolvedPaid(old)) await this.leave(user, old.code).catch(() => null); continue; }
          return fail('عندك لعبة مع الكمبيوتر مفتوحة، كمّل فيها أو احذفها.');
        }
        if (!('room' in result) || !this.member(result.room,user.id)) return fail('ما عادت لك عضوية في هالغرفة.');
        await this.emit(result.room);
        if (result.kind==='created') this.hooks.log?.('room_created',{mode,game:room.gameId});
        return {ok:true as const,room:this.snapshot(result.room,user.id)};
      }
      return fail('صار تعارض في الرمز، جرّب مرة ثانية بنفس طلب الإنشاء.');
    }));
  }

  /** غرفة جاهزة من المطابقة: تبدأ فوراً. لو fillBots نكمّل المقاعد ببوتات (علامة 🤖). */
  createMatchRoom(users: User[], gameId: string, seats: number, fillBots: boolean, stake = 0): Promise<Res<{ room: Room }>> {
    return this.guard(async () => {
      const engine = this.registry.get(gameId);
      if (!engine || engine.info.status !== 'available') return fail('هذي اللعبة مو متاحة الحين.');
      if (fillBots && !engine.info.supportsBots) return fail('هذي اللعبة ما فيها وضع الكمبيوتر.');
      if (users.length < 1 || users.length > seats || seats < engine.info.minPlayers || seats > engine.info.maxPlayers) return fail('عدد اللاعبين غير صحيح.');
      if (!fillBots && users.length < seats) return fail('العدد ما اكتمل.');
      const now = this.now();
      const room: Room = {
        code: await this.newCode(),
        hostId: users[0].id,
        mode: fillBots && users.length < seats ? 'bots' : 'friends',
        gameId: engine.info.id,
        seats,
        status: 'lobby',
        players: users.map((u) => ({ id: u.id, name: u.name, bot: false, ready: true, left: false })),
        state: null,
        revision: 1,
        createdAt: now,
        updatedAt: now,
        ...(stake > 0 ? { stake, payers: users.map((u) => u.id) } : {}),
      };
      this.syncBots(room);
      const refs: PlayerRef[] = room.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot }));
      room.state = engine.init(refs, now, this.cfg.engine);
      room.status = 'playing';
      room.gameNo = 1;
      if (!(await this.store.create(room))) return fail('صار تعارض في الرمز، جرّب مرة ثانية.');
      await this.emit(room);
      this.hooks.log?.('match_room', { game: room.gameId, humans: users.length, bots: room.players.length - users.length });
      return { ok: true as const, room };
    });
  }

  joinRoom(user: User, rawCode: unknown, password?: unknown): Promise<Res<{ room: Snapshot }>> {
    return this.guard(async () => {
      const code = normalizeCode(rawCode);
      if (!CODE_RE.test(code)) return fail('الرمز غلط. الرمز خمس خانات من حروف إنجليزية وأرقام.');
      return this.lock(code, async () => {
        const room = await this.store.get(code);
        if (!room) return fail('ما لقينا غرفة بهذا الرمز. تأكد منه مع صاحبك.');
        if (this.member(room, user.id)) return { ok: true as const, room: this.snapshot(room, user.id) };
        if (isRetiredGame(room.gameId)) return fail(RETIRED_GAME_MESSAGE);
        if (room.mode === 'bots') return fail('هذي لعبة مع الكمبيوتر، ما تقبل لاعبين.');
        if (room.status !== 'lobby') return fail('اللعبة بدأت، ما تقدر تنضم الحين.');
        if (room.access) {
          if (typeof password !== 'string' || password.length > 128 || Buffer.byteLength(password) > 512) return fail('الغرفة محمية. اكتب كلمة المرور.');
          const hash=(await scrypt(password,room.access.salt,64)) as Buffer;
          const expected=Buffer.from(room.access.passwordHash,'hex');
          if (hash.length !== expected.length || !timingSafeEqual(hash,expected)) return fail('كلمة مرور الغرفة غير صحيحة.');
        }
        if (this.humans(room).length >= room.seats) return fail('الغرفة ممتلئة.');
        // لو كان لاعب سابق خرج، نشيل سجله القديم
        room.players = room.players.filter((p) => p.id !== user.id);
        room.players.push({ id: user.id, name: user.name, bot: false, ready: false, left: false });
        await this.persist(room);
        await this.emit(room);
        return { ok: true as const, room: this.snapshot(room, user.id) };
      });
    });
  }

  private withRoom<T extends object>(
    user: User,
    rawCode: unknown,
    fn: (room: Room) => Promise<Res<T>>,
  ): Promise<Res<T>> {
    return this.guard(async () => {
      const code = normalizeCode(rawCode);
      if (!CODE_RE.test(code)) return fail('رمز الغرفة غير صحيح.');
      return this.lock(code, async () => {
        const room = await this.store.get(code);
        if (!room) return fail('الغرفة ما عادت موجودة.');
        if (!this.member(room, user.id)) return fail('أنت مو في هذي الغرفة.');
        return fn(room);
      });
    });
  }

  setGame(user: User, code: unknown, gameId: unknown) {
    return this.withRoom(user, code, async (room) => {
      if (room.hostId !== user.id) return fail('المضيف فقط يقدر يغيّر اللعبة.');
      if (room.status !== 'lobby') return fail('ما تقدر تغيّر اللعبة بعد ما تبدأ الجولة.');
      const engine = typeof gameId === 'string' ? this.registry.get(gameId) : undefined;
      if (!engine || engine.info.status !== 'available') return fail('هذي اللعبة مو متاحة الحين.');
      if (room.mode === 'bots' && !engine.info.supportsBots) return fail('هذي اللعبة ما فيها وضع الكمبيوتر.');
      const humans = this.humans(room).length;
      if (humans > engine.info.maxPlayers) return fail('عدد اللاعبين أكثر من اللي تقبله اللعبة.');
      room.gameId = engine.info.id;
      room.seats = Math.min(Math.max(room.seats, engine.info.minPlayers), engine.info.maxPlayers);
      this.syncBots(room);
      await this.persist(room);
      await this.emit(room);
      return { ok: true as const, room: this.snapshot(room, user.id) };
    });
  }

  setReady(user: User, code: unknown, ready: unknown) {
    return this.withRoom(user, code, async (room) => {
      if (isRetiredGame(room.gameId)) return fail(RETIRED_GAME_MESSAGE);
      if (room.status !== 'lobby') return fail('الاستعداد قبل بدء الجولة فقط.');
      const me = this.member(room, user.id)!;
      me.ready = ready === true;
      await this.persist(room);
      await this.emit(room);
      return { ok: true as const, room: this.snapshot(room, user.id) };
    });
  }

  start(user: User, code: unknown) {
    return this.withRoom(user, code, async (room) => {
      if (isRetiredGame(room.gameId)) return fail(RETIRED_GAME_MESSAGE);
      if (room.hostId !== user.id) return fail('المضيف فقط يقدر يبدأ الجولة.');
      if (room.status !== 'lobby') return fail('الجولة بدأت أو انتهت. استخدم «جولة جديدة».');
      // المطابقة المدفوعة الأصلية تبدأ داخل createMatchRoom؛ لوبي قديم ما يصير يعيد استعمال رسومها.
      if (this.paid(room)) return fail('إعادة الجولة المدفوعة موقوفة مؤقتاً لحماية الرصيد. ابدأ مطابقة يديدة.');
      const engine = this.engineOf(room);
      if (!engine) return fail('اللعبة غير متاحة.');
      const active = room.players.filter((p) => !p.left);
      if (active.length < engine.info.minPlayers) {
        return fail(`تحتاج ${engine.info.minPlayers} لاعبين على الأقل عشان تبدأ.`);
      }
      const notReady = this.humans(room).filter((p) => p.id !== room.hostId && !p.ready);
      if (notReady.length) return fail('فيه لاعبين ما ضغطوا «جاهز» لسه.');
      const refs: PlayerRef[] = active.map((p) => ({ id: p.id, name: p.name, bot: p.bot }));
      room.state = engine.init(refs, this.now(), this.cfg.engine);
      room.status = 'playing';
      room.gameNo = (room.gameNo ?? 0) + 1;
      this.botPlans.forEach((_, k) => k.startsWith(room.code + ':') && this.botPlans.delete(k));
      await this.persist(room);
      await this.emit(room);
      this.hello(room);
      return { ok: true as const, room: this.snapshot(room, user.id) };
    });
  }

  rematch(user: User, code: unknown) {
    return this.withRoom(user, code, async (room) => {
      if (isRetiredGame(room.gameId)) return fail(RETIRED_GAME_MESSAGE);
      if (room.hostId !== user.id) return fail('المضيف فقط يقدر يبدأ جولة جديدة.');
      if (room.status !== 'finished') return fail('الجولة لسه ما انتهت.');
      if (this.paid(room)) return fail('إعادة الجولة المدفوعة موقوفة مؤقتاً لحماية الرصيد. ابدأ مطابقة يديدة.');
      room.status = 'lobby';
      room.state = null;
      room.players = room.players.filter((p) => !p.left).map((p) => ({ ...p, ready: p.bot || p.id === room.hostId }));
      this.syncBots(room);
      await this.persist(room);
      await this.emit(room);
      return { ok: true as const, room: this.snapshot(room, user.id) };
    });
  }

  action(user: User, code: unknown, ver: unknown, action: unknown) {
    return this.withRoom(user, code, async (room) => {
      if (isRetiredGame(room.gameId)) return fail(RETIRED_GAME_MESSAGE);
      if (room.status !== 'playing' || !room.state) return fail('اللعبة مو شغّالة.');
      if (this.paid(room) && room.gameNo !== 1) return fail('إعادة الجولة المدفوعة موقوفة مؤقتاً لحماية الرصيد. تواصل مع الإدارة.');
      if (this.refundClosing(room)) return fail('الغرفة تحت الإغلاق الإداري، واسترجاع الرسوم قيد التأكيد.');
      const engine = this.engineOf(room);
      if (!engine) return fail('اللعبة غير متاحة.');
      if (ver !== engine.version(room.state)) return fail('الجولة تغيّرت، حدّث الشاشة.');
      const before = room.state, at0 = this.now();
      const res = engine.apply(room.state, user.id, action, at0);
      if (!res.ok) return fail(res.error);
      try { this.hooks.onHumanAction?.(room, user.id, action, before, at0); } catch { /* الكشف ما يوقف اللعب */ }
      room.state = res.state;
      if (engine.isOver(room.state)) room.status = 'finished';
      await this.persist(room);
      await this.emit(room);
      return { ok: true as const, room: this.snapshot(room, user.id) };
    });
  }

  leave(user: User, code: unknown) {
    return this.withRoom(user, code, room => this.removeMember(room, user.id));
  }

  private async removeMember(room: Room, userId: string): Promise<Res> {
      const wasHost = room.hostId === userId;
      const retainCommitment = this.unresolvedPaid(room);
      if (room.status === 'playing' || retainCommitment) {
        const me = this.member(room, userId)!;
        me.left = true;
      } else {
        room.players = room.players.filter((p) => p.id !== userId);
      }
      const remaining = this.humans(room);
      if (remaining.length === 0 && !retainCommitment) {
        await this.store.delete(room.code);
        this.closingPaid.delete(this.refundKey(room));
        this.hooks.onGone(room.code, [userId], 'left');
        return { ok: true as const };
      }
      if (wasHost && remaining.length > 0) {
        if (room.mode === 'bots' && !retainCommitment) {
          await this.store.delete(room.code);
          this.closingPaid.delete(this.refundKey(room));
          this.hooks.onGone(room.code, [userId], 'left');
          return { ok: true as const };
        }
        room.hostId = remaining[0].id;
        remaining[0].ready = true;
      }
      await this.persist(room);
      this.hooks.onGone(room.code, [userId], 'left');
      await this.emit(room);
      return { ok: true as const };
  }

  deleteRoom(user: User, code: unknown) {
    return this.withRoom(user, code, async (room) => {
      if (room.hostId !== user.id) return fail('المضيف فقط يقدر يحذف الغرفة.');
      if (this.unresolvedPaid(room)) return fail('ما نقدر نحذف غرفة عليها رسوم ما تسوّت. كمّل الجولة أو تواصل مع الإدارة.');
      await this.store.delete(room.code);
      this.closingPaid.delete(this.refundKey(room));
      this.hooks.onGone(room.code, this.humans(room).map((p) => p.id), 'deleted');
      return { ok: true as const };
    });
  }

  /** إغلاق إداري بنفس سياسة الاسترجاع الحالية؛ ما نحذف التزاماً لين يثبت حفظ تسويته. */
  async adminClose(rawCode: unknown): Promise<false | { refunded: number; queued: boolean }> {
    const code = normalizeCode(rawCode);
    if (!CODE_RE.test(code)) return false;
    return this.lock(code, async () => {
      const room = await this.store.get(code);
      if (!room) return false;
      // غرفة برسم دخول ما انتهت: الإغلاق الإداري ما يضيّع عملات اللاعبين، نرجّع الرسوم لهم (مرة وحدة بمفتاح ثابت)
      let refunded = 0, queued = false;
      if (this.unresolvedPaid(room)) {
        // finished قد تكون جائزتها معلّقة؛ ما نستبدل نتيجتها باسترجاع ولا نحذف مصدرها.
        if (!this.wallet || !room.payers?.length || room.status === 'finished') return false;
        if (room.gameNo !== 1) return false; // رسم جولة قديمة غير مثبت؛ لا ننشئ استرجاعاً ثانياً.
        this.closingPaid.add(this.refundKey(room));
        const got = this.wallet.settle(this.refundKey(room), room.payers, room.stake!, room.payers);
        for (const [id, n] of Object.entries(got)) { refunded += n; this.hooks.onWallet?.(id, this.wallet.balance(id), n); }
        queued = !this.payoutRecorded(room, this.refundKey(room));
        if (queued) return { refunded, queued }; // المحفظة تعيد المحاولة؛ المصدر يظل محفوظاً.
      }
      await this.store.delete(code);
      this.closingPaid.delete(this.refundKey(room));
      this.hooks.onGone(code, this.humans(room).map((p) => p.id), 'deleted');
      return { refunded, queued };
    });
  }
  /** كل الغرف للإدارة (عرض فقط) */
  adminRooms(): Promise<Room[]> { return this.store.listUpdatedBefore(this.now() + 1); }

  /** تعافٍ مالي فقط من finished المحفوظة. لا يعيد تاريخ الحساب أو الصدارة أو progression. */
  async reconcileFinished(limit = 100): Promise<{ processed: number; recovered: number; pending: number; failed: number; remaining: number }> {
    return this.lock('financial:reconcile', async () => {
      const size = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 100;
      // عقد RoomStore الحالي ما فيه pagination؛ الاستكشاف قراءة وحدة، والتسويات مقسّمة بحد 100.
      if (!this.finishedPayoutQueue.length) this.finishedPayoutQueue = (await this.store.listUpdatedBefore(this.now() + 1))
        .filter(room => room.status === 'finished' && this.paid(room) && !!room.state && !!room.gameNo).map(room => room.code);
      const batch = this.finishedPayoutQueue.splice(0, size);
      let recovered = 0, pending = 0, failed = 0;
      for (const code of batch) {
        try {
          await this.lock(code, async () => {
            const room = await this.store.get(code);
            if (!room || room.status !== 'finished' || !room.state || !room.gameNo || !this.paid(room) || !this.unresolvedPaid(room)) return;
            if (room.gameNo !== 1 || !this.wallet || !room.payers?.length || new Set(room.payers).size !== room.payers.length || !this.engineOf(room) || this.refundClosing(room)) { failed++; return; }
            this.settle(room);
            if (this.unresolvedPaid(room)) pending++;
            else recovered++;
          });
        } catch {
          failed++;
          this.hooks.log?.('finished_payout_reconcile_error');
        }
      }
      return { processed: batch.length, recovered, pending, failed, remaining: this.finishedPayoutQueue.length };
    });
  }

  // ---------- الوقت والبوتات والتنظيف ----------

  /** يُستدعى كل نصف ثانية تقريباً: ينقل الجولات حسب الوقت ويشغّل حركات الكمبيوتر */
  async tick(): Promise<void> {
    await this.expireDisconnected();
    for (const r of await this.store.listPlaying()) {
      try {
        await this.tickRoom(r.code);
      } catch (e) {
        // غرفة معطوبة ما توقف بقية الغرف
        this.hooks.log?.('tick_error', { message: (e as Error).message });
      }
    }
  }

  private async tickRoom(code: string) {
    await this.lock(code, async () => {
      const room = await this.store.get(code);
      if (!room || room.status !== 'playing' || !room.state) return;
      if (this.paid(room) && room.gameNo !== 1) return;
      if (this.refundClosing(room)) return;
      const engine = this.engineOf(room);
      if (!engine) return;
      const now = this.now();
      let state = room.state;
      let changed = false;
      const talk: [string, string, string][] = [];

      const advanced = engine.tick(state, now);
      if (advanced !== state) {
        state = advanced;
        changed = true;
      }

      for (const bot of room.players.filter((p) => p.bot)) {
        try {
          const key = `${room.code}:${bot.id}`;
          const ver = engine.version(state);
          let plan = this.botPlans.get(key);
          if (plan && plan.ver !== ver) plan = undefined;
          if (!plan) {
            const lvl = room.botLevel === 'easy' || room.botLevel === 'pro' ? room.botLevel : null;
            const next = (lvl && engine.botLevelAction ? engine.botLevelAction(state, bot.id, now, lvl) : null) ?? engine.botAction(state, bot.id, now);
            if (!next) {
              this.botPlans.delete(key);
              continue;
            }
            plan = { at: now + next.delayMs * this.cfg.botSpeed * (personaByName(bot.name)?.speed ?? 1), ver, action: next.action };
            this.botPlans.set(key, plan);
          }
          if (plan.at <= now) {
            this.botPlans.delete(key);
            // نفس التحقق القانوني اللي تمر عليه حركة الإنسان
            const res = engine.apply(state, bot.id, plan.action, now);
            if (res.ok) {
              state = res.state;
              changed = true;
              const ps = personaByName(bot.name); const say = ps && this.banter.line(room.code, ps, 'move', 0.16);
              if (say) talk.push([bot.id, bot.name, say]);
            }
          }
        } catch (e) {
          this.hooks.log?.('bot_error', { message: (e as Error).message });
        }
      }

      if (!changed) return;
      room.state = state;
      if (engine.isOver(state)) room.status = 'finished';
      await this.persist(room);
      await this.emit(room);
      for (const [id, name, text] of talk) this.say(room, id, name, text);
    });
  }

  /** R72: جملة من شخصية بفقاعة الشات */
  private say(room: Room, id: string, name: string, text: string) { try { this.hooks.onReact?.(room, id, name, text); } catch { /* الكلام ما يوقف اللعب */ } }
  /** R72: ترحيب أول ما تبدأ الجولة */
  private hello(room: Room) {
    if (room.mode !== 'bots') return;
    const b = room.players.find((p) => p.bot && personaByName(p.name)); const ps = b && personaByName(b.name);
    const t = ps && this.banter.line(room.code, ps, 'hello');
    if (b && t) setTimeout(() => this.say(room, b.id, b.name, t), 1200).unref?.();
  }
  /** R72: نهاية الجولة: كلام الفوز/الخسارة + جائزة أول مرة تهزم الشخصية اللي اخترتها */
  private talkedEnd = new Set<string>();
  private personaEndTalk(room: Room) {
    if (room.mode !== 'bots' || room.status !== 'finished' || !room.state) return;
    const ref = `${room.code}:${room.gameNo}`; if (this.talkedEnd.has(ref)) return; this.talkedEnd.add(ref);
    if (this.talkedEnd.size > 5000) this.talkedEnd.clear();
    const engine = this.engineOf(room); if (!engine) return;
    const winners = engine.outcome(room.state).winners;
    const bots = room.players.filter((p) => p.bot && personaByName(p.name));
    const botWon = bots.find((b) => winners.includes(b.id));
    const speaker = botWon ?? bots[0]; const ps = speaker && personaByName(speaker.name);
    const t = ps && this.banter.line(room.code, ps, botWon ? 'win' : 'lose');
    if (speaker && t) setTimeout(() => this.say(room, speaker.id, speaker.name, t), 900).unref?.();
  }
  private personaFinish(room: Room, winners: string[], humans: { id: string }[]) {
    if (room.mode !== 'bots') return;
    const chosen = personaOf(room.persona);
    if (chosen) for (const h of humans) if (winners.includes(h.id)) { try { this.hooks.onPersonaBeaten?.(h.id, chosen.id, chosen.reward, room); } catch { /* */ } }
  }

  /** يحذف الغرف الخاملة فقط: ما فيها أحد متصل ومرّ عليها وقت أطول من المدة المسموحة */
  async cleanup(): Promise<number> {
    const cutoff = this.now() - this.cfg.roomTtlMs;
    let removed = await this.expireDisconnected();
    for (const r of await this.store.listUpdatedBefore(cutoff)) {
      await this.lock(r.code, async () => {
        const room = await this.store.get(r.code);
        if (!room || room.updatedAt >= cutoff) return;
        const humans = this.humans(room);
        if (humans.some((p) => this.isOnline(p.id) || (p.reconnectUntil ?? 0) > this.now())) return;
        if (this.unresolvedPaid(room)) return;
        await this.store.delete(room.code);
        this.closingPaid.delete(this.refundKey(room));
        this.hooks.onGone(room.code, humans.map((p) => p.id), 'expired');
        removed++;
      });
    }
    return removed;
  }
}
