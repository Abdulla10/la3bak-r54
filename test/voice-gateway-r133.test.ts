/* R133: بوابة الصوت — رجوع سريع بعد انقطاع، وأسباب القطع بالتشخيص. SFU وهمي على 127.0.0.1 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { SocialVoice, type MediaAccess } from '../src/server/social-voice.ts';

const listen = (srv: http.Server) => new Promise<number>((r) => srv.listen(0, '127.0.0.1', () => r((srv.address() as any).port)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('R133: بعد ما ينقطع اتصال الصوت، الرجوع الفوري ينجح (قبل كان 429) والتشخيص يسجّل السبب', async () => {
  // SFU وهمي: WebSocket على /rtc + RemoveParticipant بطيء شوي (مثل الواقع)
  let removed = 0; const sfuSockets: WebSocket[] = [];
  const sfu = http.createServer(async (req, res) => { if (req.url?.includes('RemoveParticipant')) { await sleep(400); removed++; res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); return; } res.writeHead(404); res.end(); });
  const sfuWss = new WebSocketServer({ server: sfu }); sfuWss.on('connection', (ws) => { sfuSockets.push(ws); ws.on('message', () => {}); });
  const sfuPort = await listen(sfu);
  let access: MediaAccess | null = { id: 'pub1', roomId: 'r1', councilId: 'c1', channel: 'ch1', epoch: 'e1', muted: false, name: 'A' };
  const events: { ev: string; data: any }[] = [];
  const v = new SocialVoice({ enabled: true, upstream: `http://127.0.0.1:${sfuPort}/`, apiKey: 'k', apiSecret: 's'.repeat(32), cookieSecret: 'c'.repeat(32), access: () => access, authenticate: () => ({ id: 'u1' }), originAllowed: () => true, onEvent: (ev, data) => events.push({ ev, data }) });
  const gw = http.createServer((q, s) => { s.writeHead(404); s.end(); }); gw.on('upgrade', (req, socket, head) => { if (!v.handleUpgrade(req, socket, head)) socket.destroy(); });
  const gwPort = await listen(gw);
  const open = () => new Promise<{ ws: WebSocket; status: number }>((resolve) => {
    const t = v.ticket('u1'); assert.equal(t.ok, true);
    const ws = new WebSocket(`ws://127.0.0.1:${gwPort}/social-rtc/rtc?access_token=${(t as any).token}`);
    ws.on('open', () => resolve({ ws, status: 101 })); ws.on('unexpected-response', (_q, r) => resolve({ ws, status: r.statusCode ?? 0 })); ws.on('error', () => {});
  });
  const a = await open(); assert.equal(a.status, 101);
  await sleep(200);
  // انقطاع الشبكة: الجوال يسكّر الاتصال ويرجع فوراً
  a.ws.terminate();
  await sleep(30);
  const b = await open();
  assert.equal(b.status, 101, 'الرجوع بعد الانقطاع لازم ينجح (كان 429)');
  assert.ok(removed >= 1, 'الاتصال القديم لازم ينشال من SFU قبل الجديد');
  assert.ok(events.some((e) => e.ev === 'voice-drop' && String(e.data.reason).startsWith('client-close')), 'سبب القطع ينسجل');
  // جهاز ثاني نشط لنفس الحساب → يترفض (ما نسرق اتصال شغّال)
  await sleep(300); b.ws.send(JSON.stringify({ ping: 1 }));
  await sleep(100);
  const c = await open(); assert.equal(c.status, 429, 'اتصال ثاني والأول شغّال = 429');
  // تغيّر الكتم بالسيرفر → ينقطع، والسبب «epoch-changed» أو «mute-changed»
  access = { ...access!, epoch: 'e2', muted: true };
  await sleep(900);
  assert.ok(events.some((e) => e.ev === 'voice-drop' && /revalidate:(epoch|mute)/.test(String(e.data.reason))), JSON.stringify(events.map((e) => e.data.reason)));
  for (const x of [a, b, c]) x.ws.terminate(); for (const s of sfuSockets) s.terminate(); await v.close().catch(() => {}); gw.closeAllConnections?.(); sfu.closeAllConnections?.(); gw.close(); sfu.close(); sfuWss.close();
});
