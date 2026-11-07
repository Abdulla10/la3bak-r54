import { randomUUID } from 'node:crypto';
import type { Registry } from '../engine/registry.js';
import type { RoomService, User } from './rooms.js';
import { STAKES, type Wallet } from './wallet.js';
import { StorageError, STORAGE_MSG } from './datafile.js';

interface Entry { user: User; since: number; order: number; cancelled?: boolean }
const EXPIRED_MSG = 'انتهت مهلة البحث. تقدر تبدأ البحث من يديد.';
export interface MMStatus { game: string; seats: number; stake: number; waiting: number; since: number }

/**
 * مطابقة اللاعبين: طابور لكل (لعبة، عدد لاعبين). لما يكتمل العدد تنبني غرفة وتبدأ فوراً.
 * ما فيه أرقام وهمية: «waiting» هو عدد المنتظرين الفعلي في هذا الطابور.
 */
export class Matchmaker {
  private q = new Map<string, Entry[]>();
  // يبقى الحجز لين تخلص محاولة إنشاء الغرفة؛ الإلغاء يمنع الرجوع، مو التزام غرفة تم إنشاؤها.
  private pending = new Map<string, Entry>();
  private order = 0;
  constructor(
    private service: RoomService,
    private registry: Registry,
    private notify: (userId: string, msg: unknown) => void,
    private wallet?: Wallet,
    private onCharged?: (userId: string) => void,
    private now: () => number = Date.now,
    private maxWaitMs = 10 * 60_000,
  ) {}

  private key(game: string, seats: number, stake: number) { return `${game}:${seats}:${stake}`; }
  private find(userId: string) {
    for (const [k, list] of this.q) if (list.some((e) => e.user.id === userId)) return k;
    return null;
  }
  private push(k: string) {
    const list = this.q.get(k) ?? [];
    const [game, seats, stake] = k.split(':');
    for (const e of list) this.notify(e.user.id, { t: 'mm', game, seats: Number(seats), stake: Number(stake), waiting: list.length, since: e.since });
  }

  private track(take: Entry[]) {
    for (const e of take) this.pending.set(e.user.id, e);
  }
  private release(take: Entry[]) {
    for (const e of take) if (this.pending.get(e.user.id) === e) this.pending.delete(e.user.id);
  }
  private requeue(k: string, take: Entry[]) {
    const t = this.now();
    const back = take.filter((e) => {
      if (this.pending.get(e.user.id) !== e || e.cancelled || this.find(e.user.id)) return false;
      if (t - e.since >= this.maxWaitMs) {
        this.notify(e.user.id, { t: 'mm:drop', reason: EXPIRED_MSG });
        return false;
      }
      return true;
    });
    // القراءة بعد await مهمة: ما نستبدل طابور محاولة ثانية بقائمة قديمة.
    const list = [...back, ...(this.q.get(k) ?? [])].sort((a, b) => a.order - b.order);
    if (list.length) this.q.set(k, list); else this.q.delete(k);
    this.push(k);
  }

  status(userId: string): MMStatus | null {
    const k = this.find(userId);
    if (!k) return null;
    const list = this.q.get(k)!;
    const [game, seats, stake] = k.split(':');
    return { game, seats: Number(seats), stake: Number(stake), waiting: list.length, since: list.find((e) => e.user.id === userId)!.since };
  }
  /** عدد المنتظرين الحقيقي لعرضه في صفحة اللعبة */
  count(game = ''): number {
    let n = 0;
    for (const [k, list] of this.q) if (!game || k.startsWith(game + ':')) n += list.length;
    return n;
  }

  async join(user: User, gameId: unknown, rawSeats: unknown, rawStake: unknown = 0) {
    if (this.pending.has(user.id)) return { ok: false as const, error: 'جاري إنشاء غرفة المطابقة. انتظر لين تخلص المحاولة قبل بحث يديد.' };
    const engine = typeof gameId === 'string' ? this.registry.get(gameId) : undefined;
    if (!engine || engine.info.status !== 'available') return { ok: false as const, error: 'هذي اللعبة مو متاحة الحين.' };
    const seats = Number(rawSeats);
    if (!Number.isInteger(seats) || seats < engine.info.minPlayers || seats > engine.info.maxPlayers || seats < 2) return { ok: false as const, error: 'عدد اللاعبين غير صحيح.' };
    const stake = Number(rawStake) || 0;
    if (!STAKES.includes(stake)) return { ok: false as const, error: 'رسم الدخول غير صحيح.' };
    if (stake > 0 && (!this.wallet || this.wallet.balance(user.id) < stake)) return { ok: false as const, error: `رصيدك ما يكفي لرسم ${stake} عملة. العب غرفة مجانية أو استلم مكافأة اليوم.` };
    this.leave(user.id);
    const k = this.key(engine.info.id, seats, stake);
    const list = this.q.get(k) ?? [];
    list.push({ user, since: this.now(), order: this.order++ });
    this.q.set(k, list);
    if (list.length >= seats) {
      const take = list.splice(0, seats);
      if (!list.length) this.q.delete(k);
      this.track(take);
      try {
        // هوية واحدة للخصم والاسترداد في هذه المحاولة؛ المحاولة التالية لها هوية مستقلة ولو بنفس الوقت واللاعبين.
        const chargeRef = stake > 0 ? `match:${randomUUID()}` : '';
        const payers = take.map((e) => e.user.id);
        if (stake > 0) {
          // نخصم الرسم من الكل قبل ما تنبني الغرفة؛ لو أحد رصيده ما يكفي نشيله من الطابور ونرجّع الباقي
          let poor: string[];
          try { poor = this.wallet!.charge(payers, stake, chargeRef); } catch (e) {
            if (!(e instanceof StorageError)) throw e;
            // الحفظ فشل: ما انخصم شيء. نرجّع الكل للطابور ونبلّغ اللي ضغط
            this.requeue(k, take);
            return { ok: false as const, error: STORAGE_MSG };
          }
          if (poor.length) {
            for (const e of take) if (poor.includes(e.user.id)) this.notify(e.user.id, { t: 'mm:drop', reason: 'رصيدك ما عاد يكفي لرسم الدخول.' });
            const back = take.filter((e) => !poor.includes(e.user.id));
            this.requeue(k, back);
            return poor.includes(user.id) ? { ok: false as const, error: 'رصيدك ما يكفي لرسم الدخول.' } : { ok: true as const, status: this.status(user.id) };
          }
        }
        // حتى فشل الوعد غير المتوقع لا يترك رسماً بلا استرداد.
        const res = await this.service.createMatchRoom(take.map((e) => e.user), engine.info.id, seats, false, stake)
          .catch(() => ({ ok: false as const, error: 'صار خطأ، جرّب مرة ثانية.' }));
        if (!res.ok) {
          // Wallet يمنع تكرار نفس الاسترداد ويعيد حفظه بنفس المفتاح عند فشل التخزين.
          if (stake > 0) this.wallet!.settle(`refund:${chargeRef}`, payers, stake, payers);
          this.requeue(k, take); return res;
        }
        if (stake > 0) for (const e of take) this.onCharged?.(e.user.id);
        for (const e of take) this.notify(e.user.id, { t: 'mm:found', code: res.room.code });
        this.push(k);
        return { ok: true as const, found: res.room.code };
      } finally {
        this.release(take);
      }
    }
    this.push(k);
    return { ok: true as const, status: this.status(user.id) };
  }

  leave(userId: string) {
    const k = this.find(userId);
    if (!k) {
      const entry = this.pending.get(userId);
      if (!entry || entry.cancelled) return false;
      entry.cancelled = true;
      return true;
    }
    const list = this.q.get(k)!.filter((e) => e.user.id !== userId);
    if (list.length) this.q.set(k, list); else this.q.delete(k);
    this.push(k);
    return true;
  }

  /** «كمّل ببوتات»: نبني الغرفة من المنتظرين الحاليين ونكمّل الباقي بكمبيوتر */
  async fillWithBots(userId: string) {
    const k = this.find(userId);
    if (!k) return { ok: false as const, error: 'ما أنت في طابور مطابقة.' };
    const [game, seats] = k.split(':'); // مع البوتات: غرفة مجانية دائماً، ما ينخصم شي
    const take = this.q.get(k)!;
    this.q.delete(k);
    this.track(take);
    try {
      const res = await this.service.createMatchRoom(take.map((e) => e.user), game, Number(seats), true, 0)
        .catch(() => ({ ok: false as const, error: 'صار خطأ، جرّب مرة ثانية.' }));
      if (!res.ok) { this.requeue(k, take); return res; }
      for (const e of take) this.notify(e.user.id, { t: 'mm:found', code: res.room.code, bots: true });
      this.push(k);
      return { ok: true as const, found: res.room.code };
    } finally {
      this.release(take);
    }
  }

  /** تنظيف: من انتظر أكثر من الحد */
  sweep() {
    const t = this.now();
    for (const [k, list] of [...this.q]) {
      const keep = list.filter((e) => t - e.since < this.maxWaitMs);
      if (keep.length !== list.length) {
        keep.length ? this.q.set(k, keep) : this.q.delete(k);
        for (const e of list) if (t - e.since >= this.maxWaitMs) this.notify(e.user.id, { t: 'mm:drop', reason: EXPIRED_MSG });
        this.push(k);
      }
    }
  }
}
