/* R62: مكافأة دعوة صديق — تنصرف بس لما الصديق (المدعو) يربط حسابه بـGoogle ويلعب 3 مباريات مع لاعبين حقيقيين (مب ضد الكمبيوتر).
   صاحب الدعوة: 2,400 عملة، والمدعو: 1,000 عملة. حد أعلى 20 مكافأة دعوة بالشهر لكل شخص (حماية من الحسابات الوهمية).
   كل منحة بمفتاح ثابت (invite:<المدعو>:…) فما تتكرر أبدًا. */
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export const INVITE_REWARD = ({ inviter: { coins: 2400, gems: 0 }, invitee: { coins: 1000 }, games: 3, monthlyCap: 20 });
type Data = { v: 1; done: Record<string, number>; months: Record<string, { key: string; n: number }> };
const valid = (v: Record<string, unknown>) => v.v === 1 && isObj(v.done) && Object.values(v.done as object).every((x) => Number.isSafeInteger(x)) && isObj(v.months);
const monthOf = (t: number) => new Date(t + 4 * 3600_000).toISOString().slice(0, 7);

export type InviteDeps = {
  invites: () => { id: string; by: string; at: number }[];
  linked: (id: string) => boolean; games: (id: string) => number; usable: (id: string) => boolean;
  grant: (id: string, cur: 'coins' | 'gems', amount: number, reason: string, key: string) => boolean;
  notify: (id: string, title: string, body: string, ref: string) => void; name: (id: string) => string;
};
export class InviteRewards {
  private d: Data = { v: 1, done: {}, months: {} };
  private disk: Persister;
  constructor(file: string, private deps: InviteDeps, mon = new StorageMonitor(), private now: () => number = Date.now) {
    if (file) { const l = loadJsonFile(file, valid); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('invite-rewards', file, () => this.d, now, mon, valid);
  }
  private count(by: string) { const m = this.d.months[by], k = monthOf(this.now()); return m && m.key === k ? m.n : 0; }
  /** يفحص كل الدعوات اللي ما انصرفت مكافأتها. يرجع عدد المكافآت اللي انصرفت. */
  run(): number {
    let n = 0;
    for (const x of this.deps.invites()) {
      if (this.d.done[x.id] || !this.deps.usable(x.id) || !this.deps.usable(x.by)) continue;
      if (!this.deps.linked(x.id) || this.deps.games(x.id) < INVITE_REWARD.games) continue;
      if (this.count(x.by) >= INVITE_REWARD.monthlyCap) continue;
      const k = monthOf(this.now()); this.d.months[x.by] = { key: k, n: this.count(x.by) + 1 }; this.d.done[x.id] = this.now(); this.disk.mustSave();
      const friend = this.deps.name(x.id) || 'صديقك', inviter = this.deps.name(x.by) || 'صديقك';
      this.deps.grant(x.by, 'coins', INVITE_REWARD.inviter.coins, `مكافأة دعوة ${friend}`, `invite:${x.id}:by-c`);
      this.deps.grant(x.id, 'coins', INVITE_REWARD.invitee.coins, `هدية الانضمام عن طريق ${inviter}`, `invite:${x.id}:me-c`);
      this.deps.notify(x.by, '🎉 مكافأة دعوة صديق', `${friend} ربط حسابه ولعب ${INVITE_REWARD.games} مباريات. أخذت ${INVITE_REWARD.inviter.coins.toLocaleString('en-US')} عملة.`, `invite-by-${x.id.slice(0, 30)}`);
      this.deps.notify(x.id, '🎁 هدية الانضمام', `لأنك انضميت عن طريق ${inviter}، أخذت ${INVITE_REWARD.invitee.coins.toLocaleString('en-US')} عملة.`, `invite-me-${x.id.slice(0, 30)}`);
      n++;
    }
    return n;
  }
  /** حالة دعوات شخص (للصفحة) */
  view(me: string) {
    const mine = this.deps.invites().filter((x) => x.by === me);
    const asInvitee = this.deps.invites().find((x) => x.id === me);
    return { ...INVITE_REWARD, earned: mine.filter((x) => this.d.done[x.id]).length, thisMonth: this.count(me),
      pending: mine.filter((x) => !this.d.done[x.id]).map((x) => ({ who: this.deps.name(x.id), linked: this.deps.linked(x.id), games: Math.min(INVITE_REWARD.games, this.deps.games(x.id)) })).slice(0, 50),
      mine: asInvitee ? { done: !!this.d.done[me], linked: this.deps.linked(me), games: Math.min(INVITE_REWARD.games, this.deps.games(me)) } : null };
  }
}
