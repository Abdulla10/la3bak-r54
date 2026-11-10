/* R69z: «الصناديق الذهبية» — صندوق يطلع فجأة لكل المتصلين بأوقات عشوائية، وأسرع 5 يفتحونه ياخذون جوايز
 * (عملات أو إطار). الخادم يقرر وقت الطيحة والجايزة، وكل فتحة تنحفظ بمفتاح ثابت عشان ما تتكرر. */
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export const CHEST_SLOTS = 5;             // كم واحد يقدر يفتح كل صندوق
export const CHEST_OPEN_MS = 90_000;      // الصندوق يبقى ظاهر 90 ثانية
const GAP_MIN = 40 * 60_000, GAP_MAX = 90 * 60_000; // بين كل صندوق والثاني
const DAY_CAP = 8;                         // حد أقصى فتحات باليوم للاعب
const COINS: [number, number][] = [[500, 34], [1000, 28], [2500, 18], [5000, 9], [10000, 3]]; // [المبلغ، الوزن]
const FRAME_WEIGHT = 8;                    // من 100 (تقريباً 8% إطار)
/** إطارات الصندوق: من الشائع للأسطوري (الأندر أقل حظ) */
export const CHEST_FRAMES: [string, number][] = [
  ['frame2-bronze', 30], ['frame2-gold-crest', 22], ['frame2-onyx', 18], ['frame2-diamond', 12], ['frame2-ice', 8], ['frame2-crystal', 6], ['frame2-galaxy', 3], ['frame2-nebula', 1],
];

type Win = { id: string; name: string; coins: number; item: string | null; itemName: string | null; at: number };
type Chest = { id: string; at: number; endsAt: number; wins: Win[]; by: 'auto' | 'admin' };
type Data = { v: 1; next: number; cur: Chest | null; last: Win[]; daily: Record<string, { day: string; n: number }>; total: number; given: number };

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const asUuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
const pick = <T>(list: [T, number][]) => { const sum = list.reduce((a, [, w]) => a + w, 0); let r = randomInt(sum); for (const [v, w] of list) { if (r < w) return v; r -= w; } return list[0][0]; };
const gulfDay = (t: number) => new Date(t + 4 * 3600_000).toISOString().slice(0, 10);

export class ChestError extends Error { constructor(message: string, public status = 409) { super(message); } }
const need = (c: unknown, msg: string, status = 409): void => { if (!c) throw new ChestError(msg, status); };

export class GoldChests {
  private d: Data;
  private disk: Persister;
  private now: () => number;
  private lock = false;
  constructor(file: string, private deps: {
    coins: (id: string, amount: number, key: string) => boolean;
    item: (id: string, itemId: string, campaignId: string, fp: string) => 'added' | 'owned' | 'failed';
    itemName: (itemId: string) => string | null; name: (id: string) => string;
    broadcast: (msg: Record<string, unknown>) => void; log?: (e: string, d?: Record<string, unknown>) => void; now?: () => number;
  }, mon = new StorageMonitor()) {
    this.now = deps.now ?? Date.now;
    const fresh: Data = { v: 1, next: this.now() + randomInt(GAP_MIN / 4, GAP_MAX / 2), cur: null, last: [], daily: {}, total: 0, given: 0 };
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1;
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = loaded ? { ...fresh, ...(loaded as unknown as Data) } : fresh;
    this.disk = new Persister('gold-chest', file, () => this.d, this.now, mon, valid);
  }
  private save() { this.disk.save(); }
  private open(by: 'auto' | 'admin') {
    const t = this.now(); this.d.cur = { id: randomUUID().slice(0, 12), at: t, endsAt: t + CHEST_OPEN_MS, wins: [], by };
    this.d.next = t + randomInt(GAP_MIN, GAP_MAX); this.d.total++; this.save();
    this.deps.broadcast({ t: 'chest:drop', id: this.d.cur.id, endsAt: this.d.cur.endsAt, slots: CHEST_SLOTS });
  }
  tick() {
    const t = this.now(), c = this.d.cur;
    if (c && t >= c.endsAt) { this.d.cur = null; this.save(); this.deps.broadcast({ t: 'chest:end', id: c.id }); }
    if (!this.d.cur && t >= this.d.next) this.open('auto');
  }
  dropNow() { need(!this.d.cur || this.now() >= this.d.cur.endsAt, 'فيه صندوق ظاهر الحين.'); this.d.cur = null; this.open('admin'); }
  view(uid: string) {
    this.tick(); const c = this.d.cur, mine = c?.wins.find((w) => w.id === uid) ?? null;
    return { chest: c ? { id: c.id, endsAt: c.endsAt, left: Math.max(0, c.endsAt - this.now()), taken: c.wins.length, slots: CHEST_SLOTS, mine, winners: c.wins.map((w) => ({ name: w.name, coins: w.coins, itemName: w.itemName })) } : null,
      last: this.d.last.slice(0, 10).map((w) => ({ name: w.name, coins: w.coins, itemName: w.itemName, at: w.at })) };
  }
  claim(uid: string, chestId: string) {
    need(!this.lock, 'جرّب مرة ثانية.'); this.lock = true;
    try {
      this.tick(); const c = this.d.cur, t = this.now();
      need(c && c.id === chestId, 'راح الصندوق! انتظر الجاي 🎁');
      need(!c!.wins.some((w) => w.id === uid), 'فتحت هالصندوق من قبل.');
      need(c!.wins.length < CHEST_SLOTS, 'سبقوك! الصندوق انفتح 5 مرات.');
      const day = gulfDay(t), dd = this.d.daily[uid]; const n = dd && dd.day === day ? dd.n : 0;
      need(n < DAY_CAP, `وصلت الحد اليومي (${DAY_CAP} صناديق). تعال بكرة!`);
      let coins = 0, item: string | null = null;
      if (randomInt(100) < FRAME_WEIGHT) {
        const it = pick(CHEST_FRAMES); const cid = asUuid(hash(['gold-chest-r69', c!.id, uid]));
        const r = this.deps.item(uid, it, cid, hash(['gold-chest-r69', c!.id, uid, it]));
        if (r === 'added') item = it;
      }
      if (!item) { coins = pick(COINS); need(this.deps.coins(uid, coins, `chest:${c!.id}:${uid}`), 'تعذّر التسليم، جرّب مرة ثانية.'); }
      const w: Win = { id: uid, name: this.deps.name(uid) || 'لاعب', coins, item, itemName: item ? this.deps.itemName(item) : null, at: t };
      c!.wins.push(w); this.d.last.unshift(w); this.d.last = this.d.last.slice(0, 30); this.d.daily[uid] = { day, n: n + 1 }; this.d.given += coins;
      if (Object.keys(this.d.daily).length > 20000) for (const k of Object.keys(this.d.daily)) if (this.d.daily[k].day !== day) delete this.d.daily[k];
      this.save();
      this.deps.broadcast({ t: 'chest:taken', id: c!.id, taken: c!.wins.length, slots: CHEST_SLOTS, name: w.name, coins, itemName: w.itemName });
      if (c!.wins.length >= CHEST_SLOTS) { c!.endsAt = Math.min(c!.endsAt, t + 4000); this.save(); }
      return w;
    } finally { this.lock = false; }
  }
  adminView() { return { next: this.d.next, cur: this.d.cur ? { id: this.d.cur.id, endsAt: this.d.cur.endsAt, taken: this.d.cur.wins.length } : null, total: this.d.total, given: this.d.given, last: this.d.last.slice(0, 15) }; }
}
