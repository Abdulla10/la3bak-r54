/* R73: القروبات، مستويات الصداقة، أبي شريك، السوالف العشوائية (منطق السيرفر) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Social73 } from '../src/server/social-r73.js';

function make() {
  const friends = new Map<string, string[]>([['a', ['b', 'c']], ['b', ['a', 'd']], ['c', ['a']], ['d', ['b']]]);
  const pushed: [string, any][] = []; let n = 0; let now = 1_000_000;
  const rooms = new Map<string, { seats: number; players: string[] }>();
  const s = new Social73('', {
    friends: (id) => friends.get(id) ?? [], isFriend: (x, y) => (friends.get(x) ?? []).includes(y),
    pub: (id) => 'P' + id, resolve: (p) => (typeof p === 'string' && p.startsWith('P') ? p.slice(1) : null), nameOf: (id) => 'لاعب ' + id,
    banned: () => false, guest: (id) => id === 'g', adult: (id) => (id === 'kid' ? false : true),
    profanity: (t) => t.includes('كلمة_سيئة'), mod: () => {}, push: (id, m) => pushed.push([id, m]), online: () => ['a', 'b', 'c', 'd', 'e', 'kid'],
    ownedRooms: () => [], liveRooms: () => [],
    createRoom: async (uid, _g, seats) => { const code = 'R' + ++n; rooms.set(code, { seats, players: [uid] }); return { ok: true, code }; },
    joinRoom: async (uid, code) => { const r = rooms.get(code); if (!r || r.players.length >= r.seats) return { ok: false, error: 'full' }; r.players.push(uid); return { ok: true }; },
    roomSeats: async (code) => { const r = rooms.get(code); return r ? { free: r.seats - r.players.length, status: 'lobby' } : null; },
    gameName: (g) => (['baloot', 'ludo', 'liars'].includes(g) ? g : null),
  }, () => now);
  return { s, pushed, rooms, tick: (ms: number) => { now += ms; } };
}

test('القروبات: إنشاء (أصدقاء بس)، رسالة، كلام سيئ ينرفض، يلا نلعب', async () => {
  const { s, pushed } = make();
  const g: any = s.createGroup('a', 'ربعنا', ['Pb', 'Pd']);
  assert.deepEqual(g.members.map((m: any) => m.pub).sort(), ['Pa', 'Pb'], 'd مو صديق a فما ينضاف');
  s.post('a', g.id, { text: 'هلا' });
  assert.ok(pushed.some(([id, m]) => id === 'b' && m.t === 'group:msg'));
  assert.throws(() => s.post('a', g.id, { text: 'كلمة_سيئة' }));
  assert.throws(() => s.groupDetail('c', g.id), 'c مو عضو');
  const p = await s.play('b', g.id, 'baloot'); assert.ok(p.code);
  assert.equal((s.groupDetail('a', g.id) as any).msgs.at(-1).game.code, p.code);
  assert.throws(() => s.createGroup('g', 'x', []), 'الضيف ممنوع');
});

test('مستويات الصداقة تكبر مع اللعب وتطلع إشعار', () => {
  const { s, pushed } = make();
  for (let i = 0; i < 4; i++) s.gamePlayed(['a', 'b', 'bot-1']);
  const l: any = s.friendLevels('a').levels;
  assert.equal(l.Pb.level, 'صديق'); assert.equal(l.Pb.games, 4);
  assert.ok(pushed.some(([, m]) => m.t === 'friend:level'));
});

test('أبي شريك: بطاقة، صديقك يوصله إشعار، والثاني يدخل', async () => {
  const { s, pushed, rooms } = make();
  const r = await s.lfgPost('b', 'ludo', 1, 'جاهز الحين');
  assert.ok(pushed.some(([id, m]) => id === 'a' && m.t === 'lfg:new'));
  const list: any = await s.lfgList('c'); assert.equal(list.list.length, 1);
  const j = await s.lfgJoin('c', list.list[0].id); assert.equal(j.code, r.code);
  assert.deepEqual(rooms.get(r.code)!.players, ['b', 'c']);
  assert.equal((await s.lfgList('a') as any).list.length, 0, 'امتلت فتختفي');
});

test('السوالف العشوائية: للكبار بس، وتجمع 2 بعد 20 ثانية', async () => {
  const { s, tick } = make();
  assert.throws(() => s.vibeJoin('kid', 'chill'));
  s.vibeJoin('a', 'chill'); s.vibeJoin('e', 'chill'); await new Promise((r) => setTimeout(r, 10));
  assert.equal(s.vibeStatus('a').matched, false);
  tick(21_000); await s.vibeTick();
  const st: any = s.vibeStatus('a'); assert.equal(st.matched, true); assert.ok(st.code);
  assert.equal((s.vibeStatus('e') as any).code, st.code);
});
