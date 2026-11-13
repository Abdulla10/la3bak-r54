/** R128: «شو فاتك» — ملخص صغير لآخر اللي صار بالغرفة (بالذاكرة بس، آخر 3 ساعات). */
export const RECAP_WINDOW = 3 * 3600_000;
type Gift = { at: number; from: string; to: string; name: string; icon: string; qty: number; total: number };
type Mic = { at: number; id: string };
type Chat = { at: number; id: string };
type Box = { gifts: Gift[]; mics: Mic[]; chats: Chat[] };

export class RoomRecap {
  private rooms = new Map<string, Box>();
  constructor(private now: () => number = Date.now) {}
  private box(room: string) { let b = this.rooms.get(room); if (!b) { if (this.rooms.size > 5000) this.sweep(); b = { gifts: [], mics: [], chats: [] }; this.rooms.set(room, b); } return b; }
  private trim<T extends { at: number }>(list: T[], max: number) { const cut = this.now() - RECAP_WINDOW; while (list.length && (list.length > max || list[0]!.at < cut)) list.shift(); }
  sweep() { const cut = this.now() - RECAP_WINDOW; for (const [k, b] of this.rooms) { this.trim(b.gifts, 300); this.trim(b.mics, 200); this.trim(b.chats, 2000); if (!b.gifts.length && !b.mics.length && !b.chats.length) this.rooms.delete(k); else if ((b.chats.at(-1)?.at ?? 0) < cut && (b.gifts.at(-1)?.at ?? 0) < cut) this.rooms.delete(k); } }
  gift(room: string, g: Omit<Gift, 'at'>) { if (!room) return; const b = this.box(room); b.gifts.push({ ...g, at: this.now() }); this.trim(b.gifts, 300); }
  mic(room: string, id: string) { if (!room || !id) return; const b = this.box(room); const last = b.mics.at(-1); if (last?.id === id && this.now() - last.at < 60_000) return; b.mics.push({ id, at: this.now() }); this.trim(b.mics, 200); }
  chat(room: string, id: string) { if (!room || !id) return; const b = this.box(room); b.chats.push({ id, at: this.now() }); this.trim(b.chats, 2000); }
  /** ملخص من وقت معيّن. name يحوّل الآيدي الداخلي لاسم (ما نرجع آيديات). */
  summary(room: string, since: number, name: (id: string) => string, skip: (id: string) => boolean = () => false) {
    const now = this.now(), from = Math.max(now - RECAP_WINDOW, Number.isFinite(since) ? since : 0);
    const b = this.rooms.get(room); if (!b) return { from, gifts: [], giftTotal: 0, giftCount: 0, mics: [], chatters: [], messages: 0 };
    const gifts = b.gifts.filter((g) => g.at >= from);
    const top = [...gifts].sort((a, c) => c.total - a.total || c.at - a.at).slice(0, 3).map((g) => ({ from: g.from, to: g.to, name: g.name, icon: g.icon, qty: g.qty, total: g.total }));
    const seen = new Set<string>(); const mics: string[] = [];
    for (let i = b.mics.length - 1; i >= 0 && mics.length < 6; i--) { const m = b.mics[i]!; if (m.at < from) break; if (seen.has(m.id) || skip(m.id)) continue; seen.add(m.id); mics.push(name(m.id)); }
    const count = new Map<string, number>(); let messages = 0;
    for (const c of b.chats) if (c.at >= from) { messages++; if (!skip(c.id)) count.set(c.id, (count.get(c.id) ?? 0) + 1); }
    const chatters = [...count].sort((a, c) => c[1] - a[1]).slice(0, 3).map(([id, n]) => ({ name: name(id), n }));
    return { from, gifts: top, giftTotal: gifts.reduce((s, g) => s + g.total, 0), giftCount: gifts.reduce((s, g) => s + g.qty, 0), mics, chatters, messages };
  }
}
