/* R73: تواصل وتعارف أقوى
 *  1) القروبات (لين 50، شات + رسائل صوتية + «يلا نلعب»)
 *  2) الرسائل الصوتية (بالخاص وبالقروبات) — 60 ثانية كحد، تنحذف بعد 30 يوم، والمشرف يفحص نصها
 *  3) النبذة الصوتية بالملف (10–20 ثانية)
 *  4) اقتراحات أصدقاء (لعبتوا مع بعض، أصحاب مشتركين)
 *  5) «أبي شريك» — بطاقة تطلب لاعبين وتدخلهم طاولتك على طول
 *  6) مجالس الاهتمامات — صاحب المجلس يحدد اهتمامه، والناس تدوّر حسب اهتمامها
 *  7) مستويات الصداقة — تكبر مع اللعب والسوالف والهدايا
 *  8) سوالف عشوائية (18+) — مجلس صوتي صغير مع ناس بنفس اهتمامك
 * كل البيانات بملف واحد social73.json، والصوت بمجلد voice-notes. */
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isObj, loadJsonFile, Persister, StorageMonitor } from './datafile.js';

export const INTERESTS = [
  { id: 'games', name: 'قيمز', icon: '🎮' }, { id: 'football', name: 'كورة', icon: '⚽' }, { id: 'cars', name: 'سيارات', icon: '🏎️' },
  { id: 'poetry', name: 'شعر', icon: '📜' }, { id: 'cooking', name: 'طبخ', icon: '🍳' }, { id: 'tech', name: 'تقنية', icon: '💻' },
  { id: 'travel', name: 'سفر', icon: '✈️' }, { id: 'chill', name: 'سوالف', icon: '☕' }, { id: 'music', name: 'طرب', icon: '🎵' },
] as const;
const INTEREST_IDS = new Set(INTERESTS.map((i) => i.id as string));
export const FRIEND_LEVELS = [
  { min: 120, id: 'brother', name: 'أخو', icon: '🫂', perk: 'إطار «أخوي» على ملفاتكم' },
  { min: 40, id: 'khawi', name: 'خوي', icon: '🤝', perk: 'زر «طاولتنا» يفتح لكم طاولة خاصة بضغطة' },
  { min: 10, id: 'friend', name: 'صديق', icon: '😊', perk: 'شارة الصداقة تطلع على اسمه عندك' },
  { min: 0, id: 'mate', name: 'زميل', icon: '👋', perk: '' },
] as const;
export const levelOf = (s: number) => FRIEND_LEVELS.find((l) => s >= l.min)!;

type VN = { id: string; by: string; kind: 'dm' | 'group' | 'bio'; to?: string; g?: string; at: number; dur: number; mime: string; text?: string; hidden?: boolean };
type GMsg = { id: string; from: string; at: number; text?: string; vn?: string; game?: { code: string; gameId: string; name: string }; hidden?: boolean };
type Group = { id: string; name: string; owner: string; members: string[]; at: number; msgs: GMsg[]; seen: Record<string, number> };
type Pair = { s: number; g: number; at: number };
type Data = { v: 1; groups: Group[]; vns: VN[]; bios: Record<string, string>; pairs: Record<string, Pair>; interests: Record<string, string>; myInterests: Record<string, string> };

export type Social73Deps = {
  friends: (id: string) => string[];
  isFriend: (a: string, b: string) => boolean;
  pub: (id: string) => string; resolve: (pub: unknown) => string | null; nameOf: (id: string) => string;
  banned: (id: string) => boolean; guest: (id: string) => boolean; adult: (id: string) => boolean | null;
  profanity: (text: string) => boolean; mod: (kind: 'group' | 'vn', id: string, by: string, text: string) => void;
  push: (id: string, msg: unknown) => void; online: () => string[];
  ownedRooms: (id: string) => { id: string; name: string }[]; liveRooms: () => { id: string; name: string; members?: number; level?: number }[];
  createRoom: (uid: string, gameId: string, seats: number) => Promise<{ ok: boolean; code?: string; error?: string }>;
  joinRoom: (uid: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  roomSeats: (code: string) => Promise<{ free: number; status: string } | null>;
  gameName: (gameId: string) => string | null;
};

const ERR = (status: number, error: string) => Object.assign(new Error(error), { status });
const rid = (n = 12) => randomBytes(n).toString('base64url');
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const DAY = 86_400_000;

export class Social73 {
  private d: Data; private disk: Persister; private vnDir: string;
  private lfg: { id: string; by: string; gameId: string; game: string; code: string; need: number; note: string; at: number }[] = [];
  private vibeQ = new Map<string, { at: number; interest: string }>();
  private vibeMatch = new Map<string, { code: string; at: number }>();
  private rate = new Map<string, number[]>();
  constructor(file: string, private deps: Social73Deps, private now: () => number = Date.now, mon = new StorageMonitor()) {
    const valid = (x: Record<string, unknown>) => isObj(x) && x.v === 1 && Array.isArray(x.groups) && Array.isArray(x.vns) && isObj(x.bios) && isObj(x.pairs);
    const loaded = file ? loadJsonFile(file, valid) : null;
    this.d = (loaded as unknown as Data) ?? { v: 1, groups: [], vns: [], bios: {}, pairs: {}, interests: {}, myInterests: {} };
    this.d.interests ??= {}; this.d.myInterests ??= {};
    this.disk = new Persister('social73', file, () => this.d, now, mon, valid);
    this.vnDir = file ? path.join(path.dirname(file), 'voice-notes') : '';
    if (this.vnDir) try { mkdirSync(this.vnDir, { recursive: true }); } catch { /* */ }
  }
  private save() { this.disk.save(); }
  private limit(key: string, max: number, perMs: number) {
    const t = this.now(), l = (this.rate.get(key) ?? []).filter((x) => t - x < perMs);
    if (l.length >= max) throw ERR(429, 'شوي شوي… جرّب بعد لحظات.');
    l.push(t); this.rate.set(key, l); if (this.rate.size > 50_000) this.rate.clear();
  }
  private who(id: string) { return { pub: this.deps.pub(id), name: this.deps.nameOf(id) || 'لاعب' }; }
  private cleanText(raw: unknown, max: number) {
    if (typeof raw !== 'string') throw ERR(400, 'اكتب رسالة.');
    const t = raw.replace(/[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (!t) throw ERR(400, 'اكتب رسالة.'); if (t.length > max) throw ERR(400, `الرسالة أطول من ${max} حرف.`);
    if (this.deps.profanity(t)) throw ERR(400, 'الرسالة فيها كلام غير لائق.');
    return t;
  }
  private notGuest(uid: string) { if (this.deps.guest(uid)) throw ERR(403, 'احفظ حسابك بـGoogle عشان تستخدم هالميزة.'); }

  /* ---------- 2) الرسائل الصوتية ---------- */
  saveVoice(uid: string, kind: unknown, target: unknown, buf: Buffer, mime: string, dur: number, transcript: string) {
    this.notGuest(uid); if (!this.vnDir) throw ERR(503, 'الرسائل الصوتية مب متاحة هني.');
    if (kind !== 'dm' && kind !== 'group' && kind !== 'bio') throw ERR(400, 'نوع غير صالح.');
    if (!/^audio\/(webm|mp4|ogg|mpeg|aac|x-m4a)/.test(mime)) throw ERR(415, 'صيغة الصوت غير مدعومة.');
    const max = kind === 'bio' ? 21 : 61; if (!(dur > 0.4 && dur <= max)) throw ERR(400, kind === 'bio' ? 'النبذة من ثانية لين 20 ثانية.' : 'الرسالة الصوتية لين 60 ثانية.');
    if (buf.length < 600 || buf.length > 1_200_000) throw ERR(413, 'الصوت كبير أو فاضي.');
    this.limit('vn:' + uid, 20, 10 * 60_000);
    const text = String(transcript || '').slice(0, 600);
    if (text && this.deps.profanity(text)) throw ERR(400, 'الرسالة الصوتية فيها كلام غير لائق، ما انرسلت.');
    const vn: VN = { id: rid(), by: uid, kind, at: this.now(), dur: Math.round(dur * 10) / 10, mime: mime.split(';')[0], ...(text ? { text } : {}) };
    if (kind === 'dm') { const to = this.deps.resolve(target); if (!to || !this.deps.isFriend(uid, to)) throw ERR(403, 'الرسائل الصوتية للأصدقاء بس.'); vn.to = to; }
    if (kind === 'group') { const g = this.group(String(target), uid); vn.g = g.id; }
    writeFileSync(path.join(this.vnDir, vn.id), buf);
    if (kind === 'bio') { const old = this.d.bios[uid]; if (old) this.dropVoice(old); this.d.bios[uid] = vn.id; }
    this.d.vns.push(vn); this.save();
    if (text) this.deps.mod('vn', vn.id, uid, text);
    return { id: vn.id, dur: vn.dur };
  }
  private dropVoice(id: string) { this.d.vns = this.d.vns.filter((v) => v.id !== id); try { unlinkSync(path.join(this.vnDir, id)); } catch { /* */ } }
  readVoice(uid: string, id: string): { buf: Buffer; mime: string } {
    const v = this.d.vns.find((x) => x.id === id); if (!v || v.hidden) throw ERR(404, 'الرسالة الصوتية مب موجودة.');
    const ok = v.by === uid || v.kind === 'bio' || (v.kind === 'dm' && v.to === uid) || (v.kind === 'group' && this.d.groups.some((g) => g.id === v.g && g.members.includes(uid)));
    if (!ok) throw ERR(403, 'ما تقدر تسمع هالرسالة.');
    return { buf: readFileSync(path.join(this.vnDir, id)), mime: v.mime };
  }
  /** المشرف حكم إنها مخالفة */
  moderate(kind: 'group' | 'vn', id: string) {
    if (kind === 'vn') { const v = this.d.vns.find((x) => x.id === id); if (!v) return null; v.hidden = true; if (v.kind === 'bio' && this.d.bios[v.by] === id) delete this.d.bios[v.by]; try { unlinkSync(path.join(this.vnDir, id)); } catch { /* */ } this.save(); return v.by; }
    for (const g of this.d.groups) { const m = g.msgs.find((x) => x.id === id); if (m) { m.hidden = true; m.text = undefined; this.save(); return m.from; } }
    return null;
  }

  /* ---------- 3) النبذة الصوتية ---------- */
  bioOf(viewerPub: unknown, me?: string) { const id = viewerPub === 'me' ? me ?? null : this.deps.resolve(viewerPub); const v = id ? this.d.bios[id] : null; const vn = v ? this.d.vns.find((x) => x.id === v && !x.hidden) : null; return vn ? { id: vn.id, dur: vn.dur } : null; }
  dropBio(uid: string) { const v = this.d.bios[uid]; if (v) { this.dropVoice(v); delete this.d.bios[uid]; this.save(); } return { ok: true }; }

  /* ---------- 1) القروبات ---------- */
  private group(id: string, uid: string) { const g = this.d.groups.find((x) => x.id === id); if (!g || !g.members.includes(uid)) throw ERR(404, 'القروب مب موجود أو طلعت منه.'); return g; }
  private gView(g: Group, uid: string, full = false) {
    const last = [...g.msgs].reverse().find((m) => !m.hidden);
    const unread = g.msgs.filter((m) => m.at > (g.seen[uid] ?? 0) && m.from !== uid && !m.hidden).length;
    const base = { id: g.id, name: g.name, owner: g.owner === uid, count: g.members.length, unread, last: last ? { from: this.who(last.from).name, text: last.vn ? '🎤 رسالة صوتية' : last.game ? `🎮 ${last.game.name}` : (last.text ?? '').slice(0, 60), at: last.at } : null };
    if (!full) return base;
    return { ...base, members: g.members.map((m) => ({ ...this.who(m), owner: m === g.owner, me: m === uid })),
      msgs: g.msgs.slice(-80).map((m) => ({ id: m.id, from: this.who(m.from), mine: m.from === uid, at: m.at, ...(m.hidden ? { hidden: true } : { text: m.text, vn: m.vn ? { id: m.vn, dur: this.d.vns.find((v) => v.id === m.vn)?.dur ?? 0 } : undefined, game: m.game }) })) };
  }
  groups(uid: string) { return { list: this.d.groups.filter((g) => g.members.includes(uid)).sort((a, b) => (b.msgs.at(-1)?.at ?? b.at) - (a.msgs.at(-1)?.at ?? a.at)).map((g) => this.gView(g, uid)) }; }
  groupDetail(uid: string, id: string) { const g = this.group(id, uid); g.seen[uid] = this.now(); this.save(); return this.gView(g, uid, true); }
  createGroup(uid: string, rawName: unknown, rawMembers: unknown) {
    this.notGuest(uid); this.limit('gnew:' + uid, 5, DAY);
    const name = this.cleanText(rawName, 30);
    if (this.d.groups.filter((g) => g.members.includes(uid)).length >= 20) throw ERR(409, 'وصلت حد 20 قروب.');
    const add = (Array.isArray(rawMembers) ? rawMembers : []).slice(0, 49).map((p) => this.deps.resolve(p)).filter((x): x is string => !!x && x !== uid && this.deps.isFriend(uid, x));
    const g: Group = { id: rid(9), name, owner: uid, members: [uid, ...new Set(add)], at: this.now(), msgs: [], seen: {} };
    g.msgs.push({ id: rid(), from: uid, at: this.now(), text: `أنشأ القروب «${name}» 🎉` });
    this.d.groups.push(g); this.save(); this.ping(g, uid);
    return this.gView(g, uid, true);
  }
  addMember(uid: string, id: string, rawPub: unknown) {
    const g = this.group(id, uid); const other = this.deps.resolve(rawPub);
    if (!other || !this.deps.isFriend(uid, other)) throw ERR(403, 'تقدر تضيف أصدقاءك بس.');
    if (g.members.includes(other)) return this.gView(g, uid, true);
    if (g.members.length >= 50) throw ERR(409, 'القروب وصل 50 عضو.');
    g.members.push(other); g.msgs.push({ id: rid(), from: uid, at: this.now(), text: `أضاف ${this.who(other).name} 👋` }); this.save(); this.ping(g, uid);
    return this.gView(g, uid, true);
  }
  leave(uid: string, id: string) {
    const g = this.group(id, uid); g.members = g.members.filter((m) => m !== uid);
    if (!g.members.length) this.d.groups = this.d.groups.filter((x) => x !== g);
    else { if (g.owner === uid) g.owner = g.members[0]; g.msgs.push({ id: rid(), from: uid, at: this.now(), text: 'طلع من القروب' }); this.ping(g, uid); }
    this.save(); return { ok: true };
  }
  kick(uid: string, id: string, rawPub: unknown) {
    const g = this.group(id, uid); if (g.owner !== uid) throw ERR(403, 'صاحب القروب بس يقدر يطلّع أحد.');
    const other = this.deps.resolve(rawPub); if (!other || other === uid || !g.members.includes(other)) throw ERR(404, 'العضو مب موجود.');
    g.members = g.members.filter((m) => m !== other); this.save(); this.deps.push(other, { t: 'group:update', g: g.id }); this.ping(g, uid);
    return this.gView(g, uid, true);
  }
  post(uid: string, id: string, body: Record<string, unknown>) {
    this.notGuest(uid); const g = this.group(id, uid); this.limit('gmsg:' + uid, 30, 60_000);
    let m: GMsg;
    if (typeof body.vn === 'string') { const v = this.d.vns.find((x) => x.id === body.vn && x.by === uid && x.kind === 'group' && x.g === g.id); if (!v) throw ERR(400, 'الرسالة الصوتية غير صالحة.'); m = { id: rid(), from: uid, at: this.now(), vn: v.id }; }
    else m = { id: rid(), from: uid, at: this.now(), text: this.cleanText(body.text, 500) };
    g.msgs.push(m); if (g.msgs.length > 300) g.msgs.splice(0, g.msgs.length - 300);
    g.seen[uid] = m.at; this.save(); this.ping(g, uid);
    if (m.text) this.deps.mod('group', m.id, uid, m.text);
    return { ok: true, id: m.id };
  }
  async play(uid: string, id: string, gameId: unknown) {
    this.notGuest(uid); const g = this.group(id, uid); this.limit('gplay:' + uid, 6, 10 * 60_000);
    const gid = typeof gameId === 'string' ? gameId : ''; const name = this.deps.gameName(gid); if (!name) throw ERR(400, 'اختر لعبة.');
    const r = await this.deps.createRoom(uid, gid, 4); if (!r.ok || !r.code) throw ERR(409, r.error || 'ما قدرنا نفتح الطاولة.');
    g.msgs.push({ id: rid(), from: uid, at: this.now(), game: { code: r.code, gameId: gid, name } }); this.save(); this.ping(g, uid);
    return { ok: true, code: r.code };
  }
  private ping(g: Group, from: string) { for (const m of g.members) if (m !== from) this.deps.push(m, { t: 'group:msg', g: g.id, name: g.name }); }

  /* ---------- 7) مستويات الصداقة ---------- */
  bump(a: string, b: string, n: number, game = false) {
    if (!a || !b || a === b || a.startsWith('bot-') || b.startsWith('bot-')) return;
    const k = pairKey(a, b); const p = this.d.pairs[k] ?? { s: 0, g: 0, at: 0 };
    const before = levelOf(p.s); p.s = Math.min(100_000, p.s + n); if (game) p.g++; p.at = this.now(); this.d.pairs[k] = p;
    const after = levelOf(p.s);
    if (after.id !== before.id && this.deps.isFriend(a, b)) for (const [x, y] of [[a, b], [b, a]]) this.deps.push(x, { t: 'friend:level', name: this.who(y).name, level: after.name, icon: after.icon, perk: after.perk });
    this.saveSoon();
  }
  private saveT: NodeJS.Timeout | null = null;
  private saveSoon() { if (this.saveT) return; this.saveT = setTimeout(() => { this.saveT = null; this.save(); }, 5_000); this.saveT.unref?.(); }
  gamePlayed(ids: string[]) { const h = ids.filter((x) => !x.startsWith('bot-')); for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) this.bump(h[i], h[j], 3, true); }
  friendLevels(uid: string) {
    const out: Record<string, unknown> = {};
    for (const f of this.deps.friends(uid)) { const p = this.d.pairs[pairKey(uid, f)] ?? { s: 0, g: 0, at: 0 }; const l = levelOf(p.s); const nx = [...FRIEND_LEVELS].reverse().find((x) => x.min > p.s);
      out[this.deps.pub(f)] = { score: p.s, games: p.g, level: l.name, id: l.id, icon: l.icon, next: nx ? { name: nx.name, need: nx.min - p.s } : null }; }
    return { levels: out, tiers: FRIEND_LEVELS };
  }
  async ourTable(uid: string, rawPub: unknown, gameId: unknown) {
    const other = this.deps.resolve(rawPub); if (!other || !this.deps.isFriend(uid, other)) throw ERR(403, 'هالزر لأصدقائك بس.');
    if (levelOf(this.d.pairs[pairKey(uid, other)]?.s ?? 0).min < 40) throw ERR(403, 'زر «طاولتنا» ينفتح لما توصلون «خوي».');
    const gid = typeof gameId === 'string' && this.deps.gameName(gameId) ? gameId : 'baloot';
    const r = await this.deps.createRoom(uid, gid, gid === 'baloot' ? 4 : 2); if (!r.ok || !r.code) throw ERR(409, r.error || 'ما قدرنا نفتح الطاولة.');
    this.deps.push(other, { t: 'friend:table', from: this.who(uid).name, code: r.code, game: this.deps.gameName(gid) });
    return { ok: true, code: r.code };
  }

  /* ---------- 4) اقتراحات الأصدقاء ---------- */
  suggestions(uid: string) {
    const mine = new Set(this.deps.friends(uid)); mine.add(uid);
    const score = new Map<string, { s: number; why: string[] }>();
    const add = (id: string, s: number, why: string) => { if (mine.has(id) || this.deps.banned(id) || this.deps.guest(id) || id.startsWith('bot-')) return; const x = score.get(id) ?? { s: 0, why: [] }; x.s += s; if (!x.why.includes(why)) x.why.push(why); score.set(id, x); };
    const t = this.now();
    for (const [k, p] of Object.entries(this.d.pairs)) { if (t - p.at > 30 * DAY || !p.g) continue; const [a, b] = k.split('|'); const other = a === uid ? b : b === uid ? a : null; if (other) add(other, 5 + p.g * 2, p.g > 1 ? `لعبتوا مع بعض ${p.g} مرات` : 'لعبتوا مع بعض'); }
    const mutual = new Map<string, number>();
    for (const f of [...mine].filter((x) => x !== uid).slice(0, 200)) for (const ff of this.deps.friends(f).slice(0, 300)) mutual.set(ff, (mutual.get(ff) ?? 0) + 1);
    for (const [id, n] of mutual) add(id, n * 4, n > 1 ? `${n} أصدقاء مشتركين` : 'صديق مشترك');
    const myI = this.d.myInterests[uid]; if (myI) for (const [id, i] of Object.entries(this.d.myInterests)) if (i === myI && score.has(id)) add(id, 2, 'نفس اهتمامك');
    const on = new Set(this.deps.online());
    return { list: [...score.entries()].sort((a, b) => b[1].s - a[1].s).slice(0, 15).map(([id, x]) => ({ ...this.who(id), why: x.why.slice(0, 2), online: on.has(id) })) };
  }

  /* ---------- 5) أبي شريك ---------- */
  private lfgPrune() { const t = this.now(); this.lfg = this.lfg.filter((c) => t - c.at < 15 * 60_000); }
  async lfgPost(uid: string, gameId: unknown, need: unknown, note: unknown) {
    this.notGuest(uid); this.limit('lfg:' + uid, 4, 10 * 60_000); this.lfgPrune();
    const gid = typeof gameId === 'string' ? gameId : ''; const name = this.deps.gameName(gid); if (!name) throw ERR(400, 'اختر لعبة.');
    const n = Math.max(1, Math.min(3, Number(need) || 1));
    const NOTES = ['أبي شريك محترف', 'لعب خفيف وسوالف', 'ناقصنا واحد بس', 'مبتدئ وأبي أتعلم', 'جاهز الحين'];
    const nt = NOTES.includes(String(note)) ? String(note) : NOTES[4];
    this.lfg = this.lfg.filter((c) => c.by !== uid);
    const r = await this.deps.createRoom(uid, gid, Math.min(4, n + 1)); if (!r.ok || !r.code) throw ERR(409, r.error || 'ما قدرنا نفتح الطاولة.');
    const card = { id: rid(8), by: uid, gameId: gid, game: name, code: r.code, need: n, note: nt, at: this.now() };
    this.lfg.unshift(card); if (this.lfg.length > 200) this.lfg.length = 200;
    for (const f of this.deps.friends(uid)) this.deps.push(f, { t: 'lfg:new', from: this.who(uid).name, game: name, note: nt });
    return { ok: true, code: r.code, id: card.id };
  }
  async lfgList(uid: string) {
    this.lfgPrune(); const out = [];
    for (const c of this.lfg.slice(0, 40)) { const s = await this.deps.roomSeats(c.code); if (!s || s.status !== 'lobby' || s.free <= 0) continue;
      out.push({ id: c.id, ...this.who(c.by), mine: c.by === uid, friend: this.deps.isFriend(uid, c.by), gameId: c.gameId, game: c.game, need: s.free, note: c.note, at: c.at }); }
    return { list: out.sort((a, b) => Number(b.friend) - Number(a.friend)), notes: ['أبي شريك محترف', 'لعب خفيف وسوالف', 'ناقصنا واحد بس', 'مبتدئ وأبي أتعلم', 'جاهز الحين'] };
  }
  async lfgJoin(uid: string, id: string) {
    this.lfgPrune(); const c = this.lfg.find((x) => x.id === id); if (!c) throw ERR(404, 'البطاقة انتهت. جرّب غيرها.');
    if (c.by === uid) return { ok: true, code: c.code };
    const r = await this.deps.joinRoom(uid, c.code); if (!r.ok) throw ERR(409, r.error || 'الطاولة امتلت.');
    this.deps.push(c.by, { t: 'lfg:joined', name: this.who(uid).name, code: c.code });
    return { ok: true, code: c.code };
  }
  lfgCancel(uid: string) { this.lfg = this.lfg.filter((c) => c.by !== uid); return { ok: true }; }

  /* ---------- 6) مجالس الاهتمامات ---------- */
  setRoomInterest(uid: string, roomId: unknown, interest: unknown) {
    const r = this.deps.ownedRooms(uid).find((x) => x.id === roomId); if (!r) throw ERR(403, 'تقدر تحدد اهتمام مجلسك أنت بس.');
    if (interest === null || interest === '') delete this.d.interests[r.id]; else { if (!INTEREST_IDS.has(String(interest))) throw ERR(400, 'اهتمام غير معروف.'); this.d.interests[r.id] = String(interest); }
    this.save(); return { ok: true };
  }
  setMyInterest(uid: string, interest: unknown) { if (interest === null || interest === '') delete this.d.myInterests[uid]; else { if (!INTEREST_IDS.has(String(interest))) throw ERR(400, 'اهتمام غير معروف.'); this.d.myInterests[uid] = String(interest); } this.save(); return { ok: true }; }
  majalis(uid: string, interest: unknown) {
    const want = INTEREST_IDS.has(String(interest)) ? String(interest) : '';
    const live = this.deps.liveRooms().map((r) => ({ ...r, interest: this.d.interests[r.id] ?? null })).filter((r) => !want || r.interest === want);
    return { interests: INTERESTS, mine: this.d.myInterests[uid] ?? null, owned: this.deps.ownedRooms(uid).map((r) => ({ ...r, interest: this.d.interests[r.id] ?? null })), live: live.sort((a, b) => (b.members ?? 0) - (a.members ?? 0)).slice(0, 60) };
  }

  /* ---------- 8) سوالف عشوائية ---------- */
  vibeJoin(uid: string, interest: unknown) {
    this.notGuest(uid);
    const age = this.deps.adult(uid); if (age !== true) throw ERR(403, age === null ? 'حدد تاريخ ميلادك من الإعدادات أول — السوالف العشوائية للكبار (18+) بس.' : 'السوالف العشوائية للكبار (18+) بس.');
    this.limit('vibe:' + uid, 10, 30 * 60_000);
    const i = INTEREST_IDS.has(String(interest)) ? String(interest) : 'chill';
    this.vibeMatch.delete(uid); this.vibeQ.set(uid, { at: this.now(), interest: i }); void this.vibeTick();
    return { ok: true, waiting: [...this.vibeQ.values()].filter((x) => x.interest === i).length };
  }
  vibeStatus(uid: string) { const m = this.vibeMatch.get(uid); if (m) { this.vibeMatch.delete(uid); return { matched: true, code: m.code }; } const q = this.vibeQ.get(uid); return { matched: false, waiting: q ? [...this.vibeQ.values()].filter((x) => x.interest === q.interest).length : 0, since: q?.at ?? null }; }
  vibeLeave(uid: string) { this.vibeQ.delete(uid); return { ok: true }; }
  private vibeBusy = false;
  async vibeTick() {
    if (this.vibeBusy) return; this.vibeBusy = true;
    try {
      const t = this.now(); const on = new Set(this.deps.online());
      for (const [id, q] of this.vibeQ) if (t - q.at > 5 * 60_000 || !on.has(id)) this.vibeQ.delete(id);
      const by = new Map<string, string[]>(); for (const [id, q] of this.vibeQ) by.set(q.interest, [...(by.get(q.interest) ?? []), id]);
      for (const [, ids] of by) {
        ids.sort((a, b) => this.vibeQ.get(a)!.at - this.vibeQ.get(b)!.at);
        const oldest = ids.length ? t - this.vibeQ.get(ids[0])!.at : 0;
        if (ids.length >= 4 || (ids.length >= 2 && oldest > 20_000)) {
          const team = ids.slice(0, 4); team.forEach((x) => this.vibeQ.delete(x));
          const r = await this.deps.createRoom(team[0], 'liars', Math.max(2, team.length)); if (!r.ok || !r.code) continue;
          const joined = [team[0]]; for (const x of team.slice(1)) { const j = await this.deps.joinRoom(x, r.code); if (j.ok) joined.push(x); }
          for (const x of joined) { this.vibeMatch.set(x, { code: r.code, at: t }); this.deps.push(x, { t: 'vibe:match', code: r.code }); }
        }
      }
    } finally { this.vibeBusy = false; }
  }

  /** تنظيف: الرسائل الصوتية أقدم من 30 يوم (النبذات تبقى) */
  sweep() {
    const t = this.now(); const old = this.d.vns.filter((v) => v.kind !== 'bio' && t - v.at > 30 * DAY);
    if (old.length) { for (const v of old) this.dropVoice(v.id); this.save(); }
    if (this.vnDir) { try { const keep = new Set(this.d.vns.map((v) => v.id)); for (const f of readdirSync(this.vnDir)) if (!keep.has(f)) { try { if (t - statSync(path.join(this.vnDir, f)).mtimeMs > DAY) unlinkSync(path.join(this.vnDir, f)); } catch { /* */ } } } catch { /* */ } }
    void this.vibeTick();
  }
}
