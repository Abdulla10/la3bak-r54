import { createHash } from 'node:crypto';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';
import { weekKeyOf } from './room-supporters-r58.js';
import { ROCKET_PLANETS } from './room-rocket-r58.js';

/** R59: «كنز القبيلة» — صاروخ القبيلة والهيبة والوقود والمهام والمتجر (طلب المالك، فيديوهات 11-08).
 * - الهيبة: هدايا الأعضاء. داخل غرفة القبيلة = قيمة الهدية كاملة، برّاها = النص. يومية وأسبوعية (الأسبوع يبدأ السبت، توقيت الإمارات).
 * - الصاروخ: كل 3,000,000 هيبة أسبوعية للقبيلة ينطلق صاروخ تلقائي. الصاروخ رقم N يروح الكوكب N (من الكواكب السبعة)،
 *   وأكثر 3 ساهموا بهيبة هالصاروخ ياخذون جواهر وقطع الكوكب، وواحد عشوائي ثابت من باقي المساهمين ياخذ قطعة الحظ.
 * - الوقود: عملة داخل القبيلة بس (مو بالمحفظة). ينكسب من الهدايا والمهام والصناديق، وينصرف بمتجر القبيلة.
 *   تبديل الوقود بالعملات يمر بمنحة المحفظة المعتمدة (grantCampaignBatch) بمعرّف ثابت لكل عملية، فما يتكرر.
 * - الثروة: عدّاد للقبيلة من الهدايا (عرض بس). */
export const ROCKET_PRESTIGE = 3_000_000;
export const TRIBE_GIFT = Object.freeze({ inside: { prestige: 1, fuelPer200: 16, wealthPer100: 1 }, outside: { prestige: 0.5, fuelPer200: 16, wealthPer200: 1 } });
export const TRIBE_TASKS = Object.freeze([
  Object.freeze({ id: 'gift-in', title: 'أرسل الهدايا في غرفة قبيلتك (كل 4,000 عملة)', fuel: 16, prestige: 200, wealth: 2, auto: true }),
  Object.freeze({ id: 'gift-out', title: 'أرسل الهدايا خارج غرفة قبيلتك (كل 4,000 عملة)', fuel: 16, prestige: 100, wealth: 1, auto: true }),
  Object.freeze({ id: 'shop', title: 'كل 2,000 عملة تنصرف على شراء الأغراض', fuel: 8, prestige: 0, wealth: 0, auto: true }),
  Object.freeze({ id: 'checkin', title: 'سجّل حضورك بصفحة القبيلة', fuel: 5, prestige: 5, wealth: 0, auto: false }),
  Object.freeze({ id: 'stay', title: 'ابقَ 5 دقايق في غرفة القبيلة', fuel: 5, prestige: 5, wealth: 0, auto: false }),
]);
export const TRIBE_BOXES = Object.freeze([
  Object.freeze({ level: 1, need: 1_000_000, fuel: 50 }),
  Object.freeze({ level: 2, need: 5_000_000, fuel: 150 }),
  Object.freeze({ level: 3, need: 15_000_000, fuel: 400 }),
  Object.freeze({ level: 4, need: 30_000_000, fuel: 1_000 }),
]);
type ShopItemT = { id: string; kind: 'coins' | 'bag'; name: string; price: number; coins?: number; fuel?: number };
export const TRIBE_SHOP: readonly ShopItemT[] = Object.freeze([
  Object.freeze({ id: 'coins-3000', kind: 'coins', name: 'عملات ذهبية', price: 3_000, coins: 3_000 }),
  Object.freeze({ id: 'coins-30000', kind: 'coins', name: 'عملات ذهبية', price: 30_000, coins: 30_000 }),
  Object.freeze({ id: 'bag-luck', kind: 'bag', name: 'حقيبة حظ الوقود', price: 1_000, fuel: 1_200 }),
  Object.freeze({ id: 'bag-excl', kind: 'bag', name: 'حقيبة وقود حصرية', price: 5_000, fuel: 6_500 }),
]);
export const SHOP_WEEK_COINS_MAX = 300_000;
type Launch = { n: number; at: number; status: 'pending' | 'done'; winners: string[]; luck: string | null };
type TT = { week: { key: string; pts: number; launches: Launch[]; seg: Record<string, number> }; day: { key: string; pts: number }; wealth: number };
type TM = { fuel: number; day: { key: string; pts: number; done: string[] }; week: { key: string; pts: number; boxes: number[]; coins: number }; bag: Record<string, number>; seq: number };
type Data = { v: 1; tribes: Record<string, TT>; members: Record<string, TM> };
const GULF = 4 * 3600_000;
export const dayKeyOf = (ms: number) => { const d = new Date(ms + GULF); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; };
const nat = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const uuid = (x: unknown) => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export function validTreasure(x: unknown): boolean {
  if (!isObj(x) || x.v !== 1 || !isObj(x.tribes) || !isObj(x.members)) return false;
  for (const [k, t] of Object.entries(x.tribes as Record<string, any>)) {
    if (!/^\d{1,9}$/.test(k) || !isObj(t) || !isObj(t.week) || !isObj(t.day) || !nat(t.wealth) || !nat(t.week.pts) || !nat(t.day.pts) || typeof t.week.key !== 'string' || typeof t.day.key !== 'string') return false;
    if (!Array.isArray(t.week.launches) || t.week.launches.length > 400 || !isObj(t.week.seg) || Object.keys(t.week.seg).length > 200) return false;
    if (!t.week.launches.every((l: any) => isObj(l) && Number.isSafeInteger(l.n) && (l.n as number) >= 1 && nat(l.at) && ['pending', 'done'].includes(l.status as string) && Array.isArray(l.winners) && l.winners.length <= 3 && l.winners.every(uuid) && (l.luck === null || uuid(l.luck)))) return false;
    if (!Object.entries(t.week.seg).every(([id, n]) => uuid(id) && nat(n))) return false;
  }
  for (const [k, m] of Object.entries(x.members as Record<string, any>)) {
    if (!uuid(k) || !isObj(m) || !nat(m.fuel) || !nat(m.seq) || !isObj(m.day) || !isObj(m.week) || !isObj(m.bag) || !nat(m.day.pts) || !Array.isArray(m.day.done) || !nat(m.week.pts) || !Array.isArray(m.week.boxes) || !nat(m.week.coins)) return false;
  }
  return true;
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const asUuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
export const planetOfLaunch = (n: number) => ROCKET_PLANETS[(n - 1) % ROCKET_PLANETS.length];
export type TreasureGrant = { campaignId: string; fp: string; ids: string[]; gems: number; coins: number; itemIds: string[]; reason: string };
/** منح صاروخ القبيلة: أوائل الثلاثة جواهر وقطع الكوكب (الجواهر فوق حد المحفظة تنقسم)، والحظ قطعة الحظ */
export function launchGrants(tribeId: number, week: string, l: Launch): TreasureGrant[] {
  const p = planetOfLaunch(l.n); const out: TreasureGrant[] = [];
  const mk = (kind: string, ids: string[], gems: number, itemIds: string[], reason: string) => { const base = { v: 'tribe-rocket-r59', tribeId, week, n: l.n, kind }; out.push({ campaignId: asUuid(hash(base)), fp: hash({ ...base, ids, gems, itemIds }), ids, gems, coins: 0, itemIds, reason }); };
  l.winners.forEach((id, i) => { let left = p.prizes[i]; let part = 0; while (left > 0 || part === 0) { const g = Math.min(left, 100_000); mk(`r${i + 1}${part ? String.fromCharCode(97 + part) : ''}`, [id], g, part ? [] : p.gifts[i].map((x) => x.id), `صاروخ القبيلة ${l.n}: كوكب ${p.name} — المركز ${i + 1}`); left -= g; part += 1; } });
  if (l.luck) mk('luck', [l.luck], 0, [p.luck.id], `صاروخ القبيلة ${l.n}: كوكب ${p.name} — هدية الحظ`);
  return out;
}
export class TreasureError extends Error { constructor(public code: string) { super(code); } }
export const TREASURE_ERR: Record<string, string> = { no_tribe: 'أنت مو عضو بقبيلة.', fuel: 'وقودك ما يكفي.', done: 'خلصت هالمهمة اليوم. ترجع بكرة.', box: 'هذا الصندوق مو مفتوح للحين.', claimed: 'استلمت هذا الصندوق هالأسبوع.', item: 'العنصر غير موجود.', stay: 'لازم تكون بغرفة القبيلة 5 دقايق متواصلة.', limit: 'وصلت حد تبديل العملات هالأسبوع.', bag: 'ما عندك هالحقيبة.', alone: 'ما فيه أعضاء ثانيين بالقبيلة تستلم الوقود.' };
export class TribeTreasure {
  private d: Data = { v: 1, tribes: {}, members: {} };
  private disk: Persister;
  constructor(file: string, private now: () => number = Date.now, mon = new StorageMonitor()) {
    if (file) { const l = loadJsonFile(file, validTreasure); if (l) this.d = l as unknown as Data; }
    this.disk = new Persister('tribe-treasure', file, () => this.d, now, mon, validTreasure);
  }
  private tx<T>(fn: () => T): T { const prev = structuredClone(this.d); try { const o = fn(); this.disk.mustSave(); return o; } catch (e) { this.d = prev; throw e; } }
  private T(id: number): TT { const k = String(id), now = this.now(), wk = weekKeyOf(now), dk = dayKeyOf(now); let t = this.d.tribes[k];
    if (!t) t = this.d.tribes[k] = { week: { key: wk, pts: 0, launches: [], seg: {} }, day: { key: dk, pts: 0 }, wealth: 0 };
    if (t.week.key !== wk && t.week.launches.every((l) => l.status === 'done')) t.week = { key: wk, pts: 0, launches: [], seg: {} };
    if (t.day.key !== dk) t.day = { key: dk, pts: 0 }; return t; }
  private M(id: string): TM { const now = this.now(), wk = weekKeyOf(now), dk = dayKeyOf(now); let m = this.d.members[id];
    if (!m) m = this.d.members[id] = { fuel: 0, day: { key: dk, pts: 0, done: [] }, week: { key: wk, pts: 0, boxes: [], coins: 0 }, bag: {}, seq: 0 };
    if (m.day.key !== dk) m.day = { key: dk, pts: 0, done: [] }; if (m.week.key !== wk) m.week = { key: wk, pts: 0, boxes: [], coins: 0 }; return m; }
  private add(tribeId: number, user: string, prestige: number, fuel: number, wealth: number): Launch[] {
    const t = this.T(tribeId), m = this.M(user); const before = t.week.launches.length;
    m.fuel += fuel; m.day.pts += prestige; m.week.pts += prestige; t.day.pts += prestige; t.wealth += wealth;
    let left = prestige;
    while (left > 0) { const used = t.week.pts - t.week.launches.length * ROCKET_PRESTIGE; const room = ROCKET_PRESTIGE - used; const take = Math.min(left, room);
      t.week.pts += take; left -= take; if (take > 0 && (t.week.seg[user] || Object.keys(t.week.seg).length < 200)) t.week.seg[user] = (t.week.seg[user] ?? 0) + take;
      if (t.week.pts - t.week.launches.length * ROCKET_PRESTIGE >= ROCKET_PRESTIGE) {
        const rank = Object.entries(t.week.seg).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); const winners = rank.slice(0, 3).map(([id]) => id); const rest = rank.slice(3).map(([id]) => id).sort();
        const n = t.week.launches.length + 1; const luck = rest.length ? rest[parseInt(hash(['tribe-luck', tribeId, t.week.key, n]).slice(0, 12), 16) % rest.length] : null;
        t.week.launches.push({ n, at: this.now(), status: 'pending', winners, luck }); t.week.seg = {};
      } }
    return t.week.launches.slice(before);
  }
  /** هدية مؤكدة بالمحفظة من عضو. ترجع إطلاقات جديدة إذا صارت. */
  gift(tribeId: number, user: string, gems: number, insideTribeRoom: boolean): Launch[] {
    if (!nat(gems) || !gems) return [];
    const prestige = insideTribeRoom ? gems : Math.floor(gems / 2); const fuel = Math.floor(gems / 200) * 16; const wealth = insideTribeRoom ? Math.floor(gems / 100) : Math.floor(gems / 200);
    return this.tx(() => this.add(tribeId, user, prestige, fuel, wealth));
  }
  /** صرف جواهر على شراء أغراض المتجر: كل 100 جوهرة = 8 وقود */
  shopSpend(user: string, gems: number): void { const f = Math.floor((nat(gems) ? gems : 0) / 100) * 8; if (f > 0) this.tx(() => { this.M(user).fuel += f; }); }
  task(tribeId: number, user: string, id: 'checkin' | 'stay'): Launch[] {
    const m = this.M(user); if (m.day.done.includes(id)) throw new TreasureError('done');
    const t = TRIBE_TASKS.find((x) => x.id === id)!;
    return this.tx(() => { m.day.done.push(id); return this.add(tribeId, user, t.prestige, t.fuel, t.wealth); });
  }
  claimBox(tribeId: number, user: string, level: number): number {
    const b = TRIBE_BOXES.find((x) => x.level === level); if (!b) throw new TreasureError('box'); const t = this.T(tribeId), m = this.M(user);
    if (t.week.pts < b.need) throw new TreasureError('box'); if (m.week.boxes.includes(level)) throw new TreasureError('claimed');
    this.tx(() => { m.week.boxes.push(level); m.fuel += b.fuel; }); return b.fuel;
  }
  /** شراء من متجر القبيلة. العملات ترجع منحة لازم تنصرف بالمحفظة (بمعرّف ثابت)، والحقائب تنحط بحقيبة العضو. */
  buy(tribeId: number, user: string, itemId: string): { grant?: TreasureGrant; bag?: string } {
    const it = TRIBE_SHOP.find((x) => x.id === itemId); if (!it) throw new TreasureError('item'); this.T(tribeId); const m = this.M(user);
    if (m.fuel < it.price) throw new TreasureError('fuel');
    if (it.kind === 'coins') { if (m.week.coins + it.coins! > SHOP_WEEK_COINS_MAX) throw new TreasureError('limit');
      return this.tx(() => { m.fuel -= it.price; m.week.coins += it.coins!; m.seq += 1; const base = { v: 'tribe-shop-r59', user, seq: m.seq, item: it.id }; return { grant: { campaignId: asUuid(hash(base)), fp: hash({ ...base, coins: it.coins }), ids: [user], gems: 0, coins: it.coins!, itemIds: [], reason: `متجر القبيلة: ${it.name}` } }; }); }
    return this.tx(() => { m.fuel -= it.price; m.bag[it.id] = (m.bag[it.id] ?? 0) + 1; return { bag: it.id }; });
  }
  /** إرسال حقيبة وقود لأعضاء القبيلة (غير المرسل) بالتساوي */
  sendBag(user: string, bagId: string, others: string[]): { each: number; ids: string[] } {
    const it = TRIBE_SHOP.find((x) => x.id === bagId && x.kind === 'bag'); const m = this.M(user); if (!it || !(m.bag[bagId] > 0)) throw new TreasureError('bag');
    const ids = [...new Set(others.filter((x) => x !== user && uuid(x)))]; if (!ids.length) throw new TreasureError('alone');
    const each = Math.floor(it.fuel! / ids.length);
    this.tx(() => { m.bag[bagId] -= 1; if (!m.bag[bagId]) delete m.bag[bagId]; for (const id of ids) this.M(id).fuel += each; }); return { each, ids };
  }
  /** R62: هيبة القبيلة بالأسبوع الحالي (قراءة بس) — لحرب القبائل */
  weekPts(tribeId: number): number { const t = this.d.tribes[String(tribeId)]; return t && t.week.key === weekKeyOf(this.now()) ? t.week.pts : 0; }
  /** R62: وقود لأعضاء (جايزة حرب القبائل) */
  addFuel(ids: string[], each: number): void { const list = [...new Set(ids.filter(uuid))]; if (!list.length || !nat(each) || each <= 0) return; this.tx(() => { for (const id of list) this.M(id).fuel += each; }); }
  pendingLaunches(tribeId: number): { week: string; l: Launch }[] { const t = this.d.tribes[String(tribeId)]; return t ? t.week.launches.filter((l) => l.status === 'pending').map((l) => ({ week: t.week.key, l })) : []; }
  markDone(tribeId: number, n: number): void { const t = this.d.tribes[String(tribeId)]; const l = t?.week.launches.find((x) => x.n === n); if (l && l.status === 'pending') this.tx(() => { l.status = 'done'; }); }
  view(tribeId: number, user: string) {
    const t = this.T(tribeId), m = this.M(user); const used = t.week.pts - t.week.launches.length * ROCKET_PRESTIGE;
    const next = planetOfLaunch(t.week.launches.length + 1);
    return { rockets: t.week.launches.length, toNext: ROCKET_PRESTIGE - used, per: ROCKET_PRESTIGE, weekPts: t.week.pts, dayPts: t.day.pts, wealth: t.wealth, nextPlanet: { n: (t.week.launches.length % 7) + 1, name: next.name },
      launches: t.week.launches.slice(-7).map((l) => ({ n: l.n, at: l.at, planet: planetOfLaunch(l.n).name, winners: l.winners, luck: l.luck })),
      me: { fuel: m.fuel, dayPts: m.day.pts, weekPts: m.week.pts, done: [...m.day.done], boxes: [...m.week.boxes], coinsWeek: m.week.coins, bag: { ...m.bag } } };
  }
}
