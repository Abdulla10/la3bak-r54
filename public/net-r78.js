/* R78: لو أكثر من جزء بالموقع طلب نفس البيانات بنفس اللحظة (مثل الحساب أو الغرف)، نرسل طلب واحد بس ونوزّع الرد على الكل.
   ما فيه كاش قديم: أول ما يرجع الرد ينتهي الدمج، وأي طلب بعده يروح للسيرفر عادي. */
(() => {
  if (globalThis.__la3Net || typeof fetch !== 'function') return; globalThis.__la3Net = true;
  const orig = fetch.bind(globalThis); const flight = new Map();
  const SKIP = /^\/api\/(?:client-|vn\/|e2e|events|stream|ws|healthz)/;
  globalThis.fetch = function (input, init) {
    try {
      const isReq = typeof Request !== 'undefined' && input instanceof Request;
      const url = isReq ? input.url : String(input instanceof URL ? input.href : input);
      const method = String((init && init.method) || (isReq ? input.method : 'GET')).toUpperCase();
      if (method !== 'GET' || isReq || (init && (init.body || init.signal || init.cache === 'no-store' || init.cache === 'reload'))) return orig(input, init);
      const u = new URL(url, location.href);
      if (u.origin !== location.origin || !u.pathname.startsWith('/api/') || SKIP.test(u.pathname)) return orig(input, init);
      const key = u.pathname + u.search + '|' + (init && init.headers ? JSON.stringify(init.headers) : '') + '|' + ((init && init.credentials) || '');
      let p = flight.get(key);
      if (!p) { p = orig(input, init).finally(() => { if (flight.get(key) === p) flight.delete(key); }); flight.set(key, p); }
      return p.then((res) => res.clone());
    } catch (_) { return orig(input, init); }
  };
})();
