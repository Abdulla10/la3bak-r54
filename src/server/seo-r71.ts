/* R71: صفحات تعريف للألعاب عشان قوقل يلقى الموقع: /games و /games/<لعبة> + sitemap.xml و robots.txt
 * صفحات خفيفة (HTML بدون سكربت) فيها اسم اللعبة، شرحها، طريقة اللعب، عدد اللاعبين، وزر «العب الحين». */
import { existsSync } from 'node:fs';
import path from 'node:path';

export type SeoGame = { id: string; name: string; icon?: string; tagline?: string; description?: string; idea?: string; howToStart?: string; minPlayers: number; maxPlayers: number; supportsBots?: boolean; status: string };

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const players = (g: SeoGame) => (g.minPlayers === g.maxPlayers ? `${g.minPlayers} لاعبين` : `من ${g.minPlayers} إلى ${g.maxPlayers} لاعبين`);

const CSS = `*{box-sizing:border-box}body{margin:0;background:#0d0614;color:#f5e9ff;font:16px/1.8 Cairo,system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif}
a{color:#ffd66b}main{max-width:760px;margin:0 auto;padding:20px 16px 48px}header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0 18px}
.brand{font:900 26px Lalezar,Cairo,sans-serif;color:#fff;text-decoration:none}.brand small{display:block;font:700 11px Cairo,sans-serif;letter-spacing:3px;color:#cdb8e6}
.hero{border-radius:22px;overflow:hidden;background:linear-gradient(160deg,#2a1342,#1a0b2c);border:1px solid #e0a52640}
.hero img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;background:#1c0a30}.hero div{padding:18px}
h1{margin:0 0 6px;font-size:28px;line-height:1.4}h2{font-size:20px;margin:26px 0 8px;color:#ffd66b}p{margin:0 0 10px;color:#e6d6fa}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}.tags span{padding:3px 12px;border-radius:99px;background:#2a0e45;color:#ffd66b;font-size:13px;font-weight:700}
.play{display:inline-block;margin:16px 0 0;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#ffd66b,#e0a526);color:#2a1500;font-weight:900;text-decoration:none;font-size:17px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:12px}.grid a{display:block;padding:12px;border-radius:16px;background:#1c0a30;border:1px solid #ffffff1a;text-decoration:none;color:#f5e9ff}
.grid b{display:block;font-size:16px}.grid small{color:#cdb8e6;font-size:12.5px;line-height:1.6}footer{margin-top:36px;color:#8e78a8;font-size:13px;text-align:center}`;

function page(o: { origin: string; path: string; title: string; desc: string; image: string; body: string; ld?: unknown }) {
  const url = o.origin + o.path;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title><meta name="description" content="${esc(o.desc)}"><link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="LA3BAK | لعبك"><meta property="og:type" content="website"><meta property="og:url" content="${esc(url)}"><meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.desc)}"><meta property="og:image" content="${esc(o.origin + o.image)}"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0d0614"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/fonts/la3bak.css"><style>${CSS}</style>
${o.ld ? `<script type="application/ld+json">${JSON.stringify(o.ld).replace(/</g, '\\u003c')}</script>` : ''}</head>
<body><main><header><a class="brand" href="/">لعبك<small>LA3BAK</small></a><a href="/games">كل الألعاب</a></header>${o.body}
<footer>لعبك — منصة ألعاب عربية اجتماعية. العملات افتراضية للعب فقط.</footer></main></body></html>`;
}

export function createSeo(publicDir: string, list: () => SeoGame[]) {
  const games = () => list().filter((g) => g.status === 'available');
  const art = (id: string) => (existsSync(path.join(publicDir, 'assets/art69', `g-${id}.webp`)) ? `/assets/art69/g-${id}.webp` : '');
  const og = (id: string) => (existsSync(path.join(publicDir, 'assets/og', `g-${id}.jpg`)) ? `/assets/og/g-${id}.jpg` : '/assets/og/la3bak.jpg');
  const card = (g: SeoGame) => `<a href="/games/${esc(g.id)}"><b>${esc(g.icon ?? '')} ${esc(g.name)}</b><small>${esc(g.tagline ?? '')}</small></a>`;

  function gamePage(origin: string, g: SeoGame) {
    const img = art(g.id);
    const title = `${g.name} أونلاين مع أصحابك — العب مجاناً | لعبك`;
    const desc = (g.description || g.tagline || `العب ${g.name} أونلاين مع أصحابك على لعبك.`).slice(0, 160);
    const others = games().filter((x) => x.id !== g.id);
    const body = `<article class="hero">${img ? `<img src="${img}" alt="${esc(g.name)}" width="1280" height="720">` : ''}<div>
<h1>${esc(g.icon ?? '')} ${esc(g.name)} أونلاين</h1><p>${esc(g.tagline ?? '')}</p>
<div class="tags"><span>👥 ${esc(players(g))}</span>${g.supportsBots ? '<span>🤖 ضد الكمبيوتر</span>' : ''}<span>🎙️ صوت مع أصحابك</span><span>🆓 مجاناً</span></div>
<a class="play" href="/#/hub/${esc(g.id)}">العب ${esc(g.name)} الحين</a></div></article>
${g.description ? `<h2>عن اللعبة</h2><p>${esc(g.description)}</p>` : ''}
${g.idea ? `<h2>طريقة اللعب</h2><p>${esc(g.idea)}</p>` : ''}
${g.howToStart ? `<h2>كيف تبدأ</h2><p>${esc(g.howToStart)}</p>` : ''}
<h2>ألعاب ثانية على لعبك</h2><nav class="grid">${others.map(card).join('')}</nav>`;
    const ld = { '@context': 'https://schema.org', '@type': 'VideoGame', name: g.name, description: desc, url: origin + '/games/' + g.id, inLanguage: 'ar', genre: 'Board game', playMode: g.supportsBots ? ['MultiPlayer', 'SinglePlayer'] : 'MultiPlayer', numberOfPlayers: { '@type': 'QuantitativeValue', minValue: g.minPlayers, maxValue: g.maxPlayers }, gamePlatform: 'Web browser', applicationCategory: 'Game', operatingSystem: 'iOS, Android, Web', offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' }, image: origin + og(g.id), publisher: { '@type': 'Organization', name: 'لعبك LA3BAK', url: origin } };
    return page({ origin, path: '/games/' + g.id, title, desc, image: og(g.id), body, ld });
  }
  function indexPage(origin: string) {
    const gs = games();
    const body = `<article class="hero"><div><h1>ألعاب عربية أونلاين مع أصحابك</h1><p>بلوت، جاكارو، لودو، دومينو، أونو وغيرها — غرف صوتية، ضد الكمبيوتر أو مع أصحابك، ومجاناً.</p><a class="play" href="/">ادخل لعبك</a></div></article>
<h2>كل الألعاب (${gs.length})</h2><nav class="grid">${gs.map(card).join('')}</nav>`;
    const ld = { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: gs.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: origin + '/games/' + g.id, name: g.name })) };
    return page({ origin, path: '/games', title: 'ألعاب عربية أونلاين: بلوت وجاكارو ولودو مع أصحابك | لعبك', desc: 'العب بلوت وجاكارو ولودو ودومينو وأونو أونلاين مع أصحابك أو ضد الكمبيوتر، مع غرف صوتية — مجاناً على لعبك.', image: '/assets/og/la3bak.jpg', body, ld });
  }
  return {
    /** يرجع {type, body} لو المسار من صفحات قوقل، وإلا null */
    handle(pathname: string, origin: string): { type: string; body: string } | null {
      if (pathname === '/robots.txt') return { type: 'text/plain; charset=utf-8', body: `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nSitemap: ${origin}/sitemap.xml\n` };
      if (pathname === '/sitemap.xml') {
        const urls = ['/', '/games', ...games().map((g) => '/games/' + g.id)];
        return { type: 'application/xml; charset=utf-8', body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${esc(origin + u)}</loc><changefreq>weekly</changefreq><priority>${u === '/' ? '1.0' : '0.8'}</priority></url>`).join('')}</urlset>\n` };
      }
      if (pathname === '/games' || pathname === '/games/') return { type: 'text/html; charset=utf-8', body: indexPage(origin) };
      const m = /^\/games\/([a-z0-9-]{2,30})\/?$/.exec(pathname);
      if (m) { const g = games().find((x) => x.id === m[1]); if (g) return { type: 'text/html; charset=utf-8', body: gamePage(origin, g) }; }
      return null;
    },
  };
}
