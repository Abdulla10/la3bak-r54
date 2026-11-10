/* R69ze: تشفير الرسائل الخاصة من طرف لطرف (ECDH P-256 + AES-GCM 256).
 * كل جهاز عنده مفتاح سري ما يطلع منه (محفوظ في IndexedDB وغير قابل للتصدير)، والسيرفر ياخذ المفتاح العام بس.
 * كل رسالة: مفتاح عشوائي يشفر النص، وهالمفتاح يتغلّف لكل جهاز من أجهزتك وأجهزة صديقك بمفتاح مؤقت. */
const C = globalThis.crypto?.subtle;
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (buf) => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = (s) => { const t = atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); const a = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) a[i] = t.charCodeAt(i); return a; };
const EC = { name: 'ECDH', namedCurve: 'P-256' };
export const supported = () => !!(C && globalThis.indexedDB);

const idb = () => new Promise((ok, no) => { const r = indexedDB.open('la3e2e', 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const idbGet = async (k) => { const db = await idb(); return new Promise((ok, no) => { const r = db.transaction('k').objectStore('k').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); };
const idbPut = async (k, v) => { const db = await idb(); return new Promise((ok, no) => { const t = db.transaction('k', 'readwrite'); t.objectStore('k').put(v, k); t.oncomplete = () => ok(); t.onerror = () => no(t.error); }); };

let mine = null;
/** مفتاح هالجهاز: {dev, priv(CryptoKey غير قابل للتصدير), x, y} */
export async function deviceKey() {
  if (mine) return mine;
  let rec = await idbGet('me').catch(() => null);
  if (!rec?.priv || !rec.dev) {
    const kp = await C.generateKey(EC, false, ['deriveKey']);
    const jwk = await C.exportKey('jwk', kp.publicKey);
    const dev = b64(crypto.getRandomValues(new Uint8Array(16)));
    rec = { dev, priv: kp.privateKey, x: jwk.x, y: jwk.y };
    await idbPut('me', rec);
  }
  return (mine = rec);
}
/** يسجل المفتاح العام على السيرفر (مرة باليوم) */
export async function register(api) {
  if (!supported()) return false;
  const k = await deviceKey(); const flag = 'la3_e2e_reg_' + k.dev;
  try { if (Number(localStorage.getItem(flag)) > Date.now() - 86400000) return true; } catch { /* */ }
  const r = await api('/api/e2e/key', 'PUT', { dev: k.dev, x: k.x, y: k.y });
  if (r && r.ok !== false) { try { localStorage.setItem(flag, String(Date.now())); } catch { /* */ } return true; }
  return false;
}
const pub = (x, y) => C.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, ext: true }, EC, true, []);
const wrapKey = (priv, pubKey) => C.deriveKey({ name: 'ECDH', public: pubKey }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

/** يشفر النص لكل الأجهزة. devices: [{dev,x,y}] */
export async function seal(text, devices) {
  const list = devices.filter((d) => d && d.dev && d.x && d.y).slice(0, 14);
  if (!list.length) throw new Error('no-keys');
  const raw = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ck = await C.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const c = await C.encrypt({ name: 'AES-GCM', iv }, ck, enc.encode(text));
  const eph = await C.generateKey(EC, true, ['deriveKey']); const ej = await C.exportKey('jwk', eph.publicKey);
  const k = {};
  for (const d of list) { const wk = await wrapKey(eph.privateKey, await pub(d.x, d.y)); const wi = crypto.getRandomValues(new Uint8Array(12)); k[d.dev] = [b64(wi), b64(await C.encrypt({ name: 'AES-GCM', iv: wi }, wk, raw))]; }
  return 'e2e1.' + b64(enc.encode(JSON.stringify({ e: [ej.x, ej.y], i: b64(iv), c: b64(c), k })));
}
export const isSealed = (body) => typeof body === 'string' && body.startsWith('e2e1.');
const cache = new Map();
/** يفك الرسالة. يرجع {text, locked:true} لو ما تنقرا على هالجهاز */
export async function open(body) {
  if (!isSealed(body)) return { text: body, plain: true };
  if (cache.has(body)) return cache.get(body);
  let out;
  try {
    const me = await deviceKey(); const env = JSON.parse(dec.decode(unb64(body.slice(5))));
    const slot = env.k?.[me.dev];
    if (!slot) out = { text: '🔒 رسالة مشفّرة انرسلت لجهاز ثاني', locked: true };
    else {
      const wk = await wrapKey(me.priv, await pub(env.e[0], env.e[1]));
      const raw = await C.decrypt({ name: 'AES-GCM', iv: unb64(slot[0]) }, wk, unb64(slot[1]));
      const ck = await C.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      out = { text: dec.decode(await C.decrypt({ name: 'AES-GCM', iv: unb64(env.i) }, ck, unb64(env.c))), sealed: true };
    }
  } catch { out = { text: '🔒 ما قدرنا نفك هالرسالة', locked: true }; }
  if (cache.size > 2000) cache.clear(); cache.set(body, out); return out;
}
