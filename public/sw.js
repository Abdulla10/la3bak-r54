/* لعبك — عامل الخدمة: تحديث الشبكة أولاً، واللعب الجماعي يحتاج اتصال. */
const CACHE_PREFIX = 'la3bak-shell-';
const VER = CACHE_PREFIX + 'r68z34c';
const LEGACY_SHELL_CACHES = ['la3bak-rank-vip-1'];
// Deduplicate exact URLs; keep the existing network-first/offline policy.
// The unused legacy codewords image is not precached; the shipped R45 cover stays.
const SHELL = [...new Set(['/root-navigation-r50.js?v=back-nav-r51', '/preview/assets/game-minaboli-3d-r49.webp', '/preview/assets/game-codewords-3d-r45.webp', '/emerald-r44.css?v=r58q', '/unified/emerald-room-r44.css?v=r58p', '/unified/gift-compact-r38.css?v=r58p','/unified/room-owner-start-r33.css?v=r58q','/social-room-tools-r33.css?v=r58p','/community-access-r37.js','/unified/notifications.js?v=r68z34c','/social-room-tools-r33.js?v=r58p','/room-start-r33.js','/social-gift-context-r33.js','/gift3d-variants-r33.js','/unified/pk-reference-r32.css?v=r58p','/social-challenge.js?v=r57','/social-challenge.css?v=r58p','/room-photo-r31.js?v=room-photo-r31','/unified/room-photo-r31.css?v=r58q','/social-directory-r30.js?v=r68z20','/unified/room-directory-r30.css?v=r58q','/unified/room-style-r27.css?v=r58p', '/unified/reference-room-r28.css?v=r58q', '/unified/reference-panels-r28.css?v=r58q', '/unified/reference-gifts-r28.css?v=r58q', '/unified/gift-colors-r29.css?v=r58p', '/unified/room-dock-r29.css?v=r58p', '/cannon3d-r29.css?v=r58p', '/cannon3d-r29.js?v=r68v-cannon-r29','/social-room-controls-r27.js?v=r67al','/gift3d-r27.js?v=emerald-r44','/gift3d-r27.css','/gift-assets-r27.js?v=r68i-r35','/social-gift-runtime-r27.js?v=r68i','/social-cannon-ui-r27.js?v=r68z34c','/social-challenge.js?v=r57','/social-challenge.css?v=r58p','/store-r23.css?v=r58p','/frame-art-r23.css?v=r58i2','/entrancefx-r23.js?v=r58r','/entrancefx-r23.css?v=emerald-r44','/preview/profile-head-r20.css?v=r58p', '/preview/profile-head-r22.css?v=r58p','/preview/profile-list-r19.css?v=r58p','/unified/room-composer-r18.css?v=r58p','/unified/global-search.js?v=r68v-search-r17','/unified/global-search.css?v=r58p','/unified/search-icon.js?v=global-search-r17','/preview/profile-frame-r4.css?v=r58p', '/brand-royal-r16.css?v=r58p', '/preview/profile-host-r15.css?v=emerald-r44','/unified/ranks.js?v=r68z34c', '/unified/ranks.css?v=r58p', '/unified/vip.js?v=r68z34c', '/unified/vip.css?v=r58p', '/unified/vip-noble-r52.js?v=r68z34c', '/unified/vip-noble-r52.css?v=r58q', '/profile-social-r53.js?v=r68z31', '/preview/profile-r53.css?v=r58q', '/preview/rank-overview.js?v=r66b', '/preview/rank-overview.css?v=r58p', '/preview/rank-current.css?v=r58p', '/unified/backgrounds.js?v=r68z34c', '/unified/backgrounds.css?v=r58q', '/background-art.js?v=r58p', '/', '/preview.html?v=release-r14', '/app.css?v=r58q', '/reference-store.css?v=r58p', '/unified/home.css?v=r58p', '/unified/home.js?v=r68z20', '/unified/unified.css?v=r60d', '/unified/shell.js?v=r68z34c', '/preview/profile.css?v=r58p', '/preview/profile-integration.css?v=r58p', '/preview/profile-match.css?v=r58q', '/preview/page-shell.css?v=r58p', '/preview/shop-modern.css?v=r58p', '/preview/app.js?v=r68z34c', '/preview/profile.js?v=r68z34c', '/preview/assets/profile/ui-icons-inline.js?v=r58p', '/preview/assets/profile/rank-display.js', '/pwa.js?v=r68z34c', '/boot.js?v=r64a', '/theme.js?v=r64a', '/theme.js?v=r64a', '/royal-gameplay.css?v=r58p', '/royal-navigation.css?v=r58p', '/auth.js', '/manifest.webmanifest', '/favicon.svg', '/apple-touch-icon.png', '/game-availability.js?v=games-royal-1', '/games.js?v=r68z31',   '/offline.js?v=games-royal-1', '/unified/games.js?v=r68z31', '/unified/social.js?v=r68z34c', '/rank-perks-r56.js?v=r67t', '/rank-perks-r56.css?v=r56', '/unified/social-r55.css?v=r58q', '/unified/social.css?v=r58p', '/social-voice.js?v=release-r14', '/social-assets/majlis-atmosphere.webp', '/admin.js?v=r68z34c', '/admin-bulk-grants.js?v=r66a', '/admin-bulk-grants.css?v=r58p', '/preview/rank-current.css?v=r58p', '/preview/rank-overview.js?v=r66b', '/unified/payments.js?v=r68i', '/account-tools.js?v=ui-correction-r3', '/account-verification.css?v=r58q', '/unified/social-room-r7.css?v=r58p', '/social-gifts.js?v=r68z31', '/social-assets/voice-night-r7.jpg', '/social-assets/friends-room-cover.webp', '/unified/wallet.js?v=r68i', '/shop.js?v=r68z34c', '/unified/store.js?v=r68z34c', '/unified/backgrounds.js?v=r68z34c', '/unified/payments.js?v=r68i', '/unified/payments.css?v=r58p', '/unified/social-settings-r12.css?v=r58p', '/social-benefits.js?v=r68z31', '/unified/social-benefits-r12.css?v=r58q', '/gifts.js?v=r68z31', '/gift-reward-ui.js?v=r68i', '/unified/gift-rewards-r13.css?v=r58p', '/giftart.js?v=r68i-r14', '/unified/game-voice-r9.css?v=r58p'])];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VER).then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  // نحذف إصدارات قشرة التطبيق المعروفة فقط، لا كاشًا آخر أو بيانات المستخدم.
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER && (k.startsWith(CACHE_PREFIX) || LEGACY_SHELL_CACHES.includes(k))).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (/^\/(?:kids|tower)\.js$/.test(url.pathname)) { e.respondWith(Promise.resolve(new Response('Not found', {status:404}))); return; }
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/social-rtc') || url.pathname === '/healthz' || url.pathname === '/readyz' || url.pathname === '/ws') return;
  // R60b (السرعة): قبل كان كل ملف يتحمّل من الشبكة من جديد مع كل فتحة صفحة (176 طلب تقريبًا) — هذا أكبر سبب للبطء على الجوال.
  // الحين: الملف اللي فيه رقم نسخة (?v=) ما يتغير أبدًا → من الكاش على طول. الصور والملفات الثابتة بدون رقم → من الكاش ونحدّثها بالخلفية.
  // الصفحة نفسها (HTML) وملف sw → من الشبكة أول (عشان التحديثات توصل على طول)، والكاش لو ما فيه نت.
  const put = (res) => { if (res && res.ok && res.type === 'basic') { const copy = res.clone(); e.waitUntil(caches.open(VER).then((c) => c.put(req, copy)).catch(() => {})); } return res; };
  const isPage = req.mode === 'navigate' || url.pathname === '/' || /\.(?:html|webmanifest)$/.test(url.pathname) || url.pathname === '/sw.js?v=r68z34c';
  if (isPage) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(put).catch(async () => { const c = await caches.open(VER); const hit = await c.match(req); return hit || (req.mode === 'navigate' ? (await c.match('/')) || Response.error() : Response.error()); }));
    return;
  }
  if (url.searchParams.has('v')) {
    e.respondWith(caches.open(VER).then((c) => c.match(req)).then((hit) => hit || fetch(req).then(put)).catch(() => fetch(req)));
    return;
  }
  // ملف كود بدون رقم نسخة: من الشبكة (المتصفح يتحقق بـETag ويرجع 304 خفيف)، والكاش لو ما فيه نت
  if (/\.(?:m?js|css|json)$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(put).catch(async () => (await caches.open(VER).then((c) => c.match(req))) || Response.error()));
    return;
  }
  e.respondWith(caches.open(VER).then((c) => c.match(req)).then((hit) => {
    const net = fetch(req).then(put);
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }).catch(() => fetch(req)));
});

// R62: إشعارات الجوال (Web Push) — الخادم يرسل { title, body, url, tag }
self.addEventListener('push', (e) => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch { m = { title: 'لعبك', body: e.data ? e.data.text() : '' }; }
  const title = typeof m.title === 'string' && m.title ? m.title.slice(0, 80) : 'لعبك';
  const opts = { body: typeof m.body === 'string' ? m.body.slice(0, 200) : '', icon: '/apple-touch-icon.png', badge: '/apple-touch-icon.png', dir: 'rtl', lang: 'ar', tag: typeof m.tag === 'string' ? m.tag : undefined, renotify: !!m.tag, data: { url: typeof m.url === 'string' && /^(#\/|\/)/.test(m.url) ? m.url : '/' } };
  e.waitUntil(self.registration.showNotification(title, opts));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const raw = e.notification.data?.url || '/'; const target = new URL(raw.startsWith('#') ? '/' + raw : raw, self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (new URL(c.url).origin === self.location.origin) { c.focus(); if ('navigate' in c) return c.navigate(target).catch(() => {}); return; } }
    return self.clients.openWindow(target);
  }));
});
