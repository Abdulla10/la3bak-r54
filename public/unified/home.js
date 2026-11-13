/* Reference milestone home — existing application data and event contracts.
 * Shared header, wallet, navigation, drawer and footer placement belong to the shell.
 * The optional avatarHTML callback is trusted application-owned markup.
 */
import { renderProfileIcon } from '../preview/assets/profile/ui-icons-inline.js?v=r58p';
import { render68, mount68 } from './home-r68.js?v=r126';
import { visibleGameCatalogue } from '../game-availability.js?v=games-royal-1';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const list = (value) => Array.isArray(value) ? value : [];
const number = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-US').format(Number(value)) : '—';
const ROYAL_SCENERY = '/preview/assets/profile/royal-landscape.webp';
const ROYAL_CROWN = '/preview/assets/profile/royal-crown.svg';
const FEATURED = ['ludo', 'baloot', 'jackaro', 'domino', 'carrom', 'uno', 'codewords', 'minaboli'];
const GAME_ART = Object.freeze({ ludo: '/preview/assets/game-ludo.webp', baloot: '/preview/assets/game-baloot.webp', jackaro: '/preview/assets/game-jackaro.webp', domino: '/preview/assets/game-domino.webp', carrom: '/preview/assets/game-carrom.webp', uno: '/preview/assets/game-uno.webp', codewords: '/preview/assets/game-codewords-3d-r45.webp', minaboli: '/preview/assets/game-minaboli-3d-r49.webp' });
const protectedLink = (href) => /^#\/(community|post|u|social-rooms|social-room|notifications|friends|messages)(?:\/|$)/.test(href || '');
const HUBS = new Set(['ludo', 'baloot', 'jackaro']);
const CATS = [
  { id: 'party', label: 'ألعاب جماعية', icon: 'users' },
  { id: 'quick', label: 'تحدي سريع', icon: 'clock' },
  { id: 'brain', label: 'ذكاء وتفكير', icon: 'star' },
  { id: 'quiz', label: 'مسابقات وأسئلة', icon: 'medal' },
  { id: 'solo', label: 'ألعاب فردية', icon: 'person' },
];
// Matches UI_OF/uiCat in the application: home-cat opens the actual game filter.
const UI_OF = {
  jackaro: 'party', ludo: 'party', baloot: 'party', domino: 'party', uno: 'party', carrom: 'party', codewords: 'party',
};
function categoryOf(game) {
  if (UI_OF[game.id]) return UI_OF[game.id];
  if (game.maxPlayers === 1) return 'solo';
  if (list(game.categories).includes('trivia')) return 'quiz';
  if (list(game.categories).includes('duel')) return 'quick';
  if (list(game.categories).includes('kids')) return 'brain';
  return 'party';
}
function safeURL(value, { hash = false, image = false } = {}) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f\\]/.test(value)) return '';
  if (hash && /^#\/[a-zA-Z0-9_/%?=&.-]*$/.test(value)) return value;
  if (/^\/(?!\/)/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    if (image && /\.svg(?:[?#]|$)/i.test(url.pathname)) return '';
    return url.href;
  } catch { return ''; }
}
function officialStoreURL(value, kind) {
  const safe = safeURL(value);
  if (!safe || !safe.startsWith('https://')) return '';
  try {
    const url = new URL(safe);
    if (kind === 'apple') return url.hostname === 'apps.apple.com' && /\/app\//.test(url.pathname) ? safe : '';
    return url.hostname === 'play.google.com' && url.pathname === '/store/apps/details' && url.searchParams.get('id') ? safe : '';
  } catch { return ''; }
}
function icon(name, extra = '') {
  // The existing profile icon catalog supplies every visual; no emoji substitutes.
  const mapped = ({ arrow: 'back', rank: 'ranking' })[name] || name;
  const markup = renderProfileIcon(mapped);
  return markup.replace('class="pvp-icon"', `class="pvp-icon pv-icon${name === 'arrow' ? ' pv-icon--arrow' : ''}${extra ? ` ${esc(extra)}` : ''}"`);
}
function face(ctx, subject, size = 42) {
  const ownPlayer = subject === ctx.me || subject === ctx.user;
  if (typeof ctx.avatarHTML === 'function' && (ownPlayer || ctx.avatarHTML.length >= 2)) {
    try {
      const html = ctx.avatarHTML.length >= 2 ? ctx.avatarHTML(subject, size) : ctx.avatarHTML(size);
      if (typeof html === 'string' && html) return html;
    } catch { /* Optional presentation must not break the page. */ }
  }
  const initial = Array.from(String(subject?.name || 'لاعب'))[0];
  return `<span class="pv-avatar-fallback" aria-hidden="true">${esc(initial)}</span>`;
}
function accountHTML(ctx) {
  if (ctx.user) return !ctx.me ? `<p class="pv-account-status" role="status">${esc(ctx.error || 'جاري تحميل بيانات حسابك وأرصدتك…')}</p>` : '';
  return '<div class="pv-home-welcome" data-home-section="home-account"><span>أهلًا بك في لعبك</span><a class="pv-text-link" href="#/profile">سجّل دخولك والعب</a></div>';
}
function bannerList(ctx) {
  const base = { image: '', title: 'لعبتك وجمعتك في مكان واحد', text: 'اكتشف الألعاب المتاحة، واختر التحدي المناسب لك.', href: '#/games', cta: 'كل الألعاب', primary: true };
  const configured = list(ctx.siteConfig?.banners).slice(0, 8).filter((b) => b && safeURL(b.image, { image: true })).map((b, i) => ({
    // Replace only the known shipped anime default; legitimate configured art stays intact.
    image: b.image === '/preview/assets/home-hero.webp' ? ROYAL_SCENERY : safeURL(b.image, { image: true }),
    title: String(b.title || ''), text: String(b.text || b.subtitle || base.text),
    href: ctx.noCommunity && protectedLink(b.href) ? '#/games' : safeURL(b.href, { hash: true }) || '#/games', cta: ctx.noCommunity && protectedLink(b.href) ? 'الألعاب المحمية' : String(b.cta || base.cta), primary: i === 0,
  }));
  return configured.length ? configured : [base];
}
function heroHTML(ctx) {
  const banners = bannerList(ctx);
  return `<section class="pv-hero" data-home-section="hero" aria-label="لافتات لعبك" aria-roledescription="عارض لافتات">
    <div class="pv-hero-slides">${banners.map((b, i) => `<article class="pv-hero-slide" data-pv-slide="${i}"${i ? ' hidden' : ''} aria-label="${esc(`لافتة ${i + 1} من ${banners.length}`)}">
      ${b.image ? `<img class="pv-hero-art" src="${esc(b.image)}" alt=""${i ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async">` : ''}
      <div class="pv-hero-shade"></div><div class="pv-hero-copy">
        ${b.primary ? `<h1>${esc(b.title || 'اكتشف لعبك')}</h1>` : `<h2>${esc(b.title || 'اكتشف المزيد في لعبك')}</h2>`}
        <p>${esc(b.text)}</p><a class="pv-button pv-hero-cta" href="${esc(b.href)}">${esc(b.cta)} ${icon('arrow')}</a>
      </div></article>`).join('')}</div>
    ${banners.length > 1 ? `<div class="pv-banner-dots" role="group" aria-label="اختيار اللافتة">${banners.map((_, i) => `<button type="button" data-pv-banner="${i}" aria-label="اللافتة ${i + 1}" aria-pressed="${i === 0}"></button>`).join('')}</div>` : ''}
  </section>`;
}
function shortcutsHTML() {
  const shortcuts = [
    ['coins', 'العملات', 'coin'], ['bg', 'الخلفيات', 'image'], ['avatar', 'الأفتارات', 'person'],
    ['frame', 'الإطارات', 'frame'], ['badge', 'الشارات', 'shield'], ['ach', 'الإنجازات', 'medal'], ['events', 'الفعاليات', 'calendar'],
  ];
  return `<nav class="pv-shortcuts" data-home-section="service-shortcuts" aria-label="اختصارات المتجر والمقتنيات">${shortcuts.map(([id, title, glyph]) => {
    const attr = id === 'ach' ? 'data-preview-profile="ach"' : id === 'events' ? 'data-preview-page="events"' : `data-preview-shop="${esc(id)}"`;
    return `<button class="pv-shortcut pv-shortcut--${esc(id)}" type="button" ${attr}>${icon(glyph)}<b>${esc(title)}</b></button>`;
  }).join('')}</nav>`;
}
function gameURL(game) { return `#/${HUBS.has(game.id) ? 'hub' : 'game'}/${encodeURIComponent(String(game.id))}`; }
function capacity(game) {
  const min = Number(game.minPlayers), max = Number(game.maxPlayers);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max < 1) return 'متاحة الآن';
  return min === max ? `${number(max)} لاعبين` : `${number(min)}–${number(max)} لاعبين`;
}
function gamesHTML(ctx) {
  const available = visibleGameCatalogue(ctx.games).filter((g) => g.status === 'available' && typeof g.id === 'string' && /^[a-z0-9_-]+$/i.test(g.id));
  const games = [...FEATURED.map((id) => available.find((g) => g.id === id)).filter(Boolean), ...available.filter((g) => !FEATURED.includes(g.id))];
  return `<section class="pv-section pv-featured" data-home-section="featured-games" aria-labelledby="pvFeaturedTitle">
    <div class="pv-section-heading"><h2 id="pvFeaturedTitle">${icon('game')} الألعاب</h2><a class="pv-all-link" href="#/games">عرض الكل ${icon('arrow')}</a></div>
    <label class="pv-game-search">${icon('game')}<span class="pv-visually-hidden">البحث في الألعاب المتاحة</span><input type="search" data-pv-game-search maxlength="100" placeholder="ابحث عن لعبة…" autocomplete="off"></label>
    ${games.length ? `<div class="pv-games-wrap"><div class="pv-game-grid" aria-label="الألعاب المتاحة">${games.map((game) => `<a class="pv-game-card pv-game-card--${esc(game.id)}" data-pv-game-name="${esc(game.name || game.id)}" href="${esc(gameURL(game))}" aria-label="العب ${esc(game.name || game.id)}">
      <div class="pv-game-art">${GAME_ART[game.id] ? `<img src="${GAME_ART[game.id]}" alt="" loading="lazy" decoding="async">` : icon(game.id === 'codewords' ? 'file' : 'game')}</div>
      <div class="pv-game-details"><h3>${esc(game.name || game.id)}</h3><small>${esc(capacity(game))}</small></div>
    </a>`).join('')}</div><p class="pv-empty-inline" data-pv-game-empty hidden role="status">لا توجد لعبة مطابقة. جرّب اسمًا آخر أو <a class="pv-text-link" href="#/games">افتح كل الألعاب</a>.</p></div>` : `<div class="pv-empty" role="status">${icon('game')}<p>${list(ctx.games).length ? 'لا توجد ألعاب متاحة حاليًا.' : 'جاري تحميل الألعاب المتاحة…'}</p><a href="#/games" class="pv-text-link">استعرض الألعاب</a></div>`}
  </section>`;
}
function categoriesHTML(ctx) {
  const games = visibleGameCatalogue(ctx.games).filter((g) => g.status === 'available');
  const supplied = list(ctx.categories);
  const cats = CATS.map((c) => ({ ...c, label: supplied.find((s) => s?.id === c.id)?.label || c.label, count: games.filter((g) => categoryOf(g) === c.id).length })).filter((c) => c.count > 0);
  return `<section class="pv-section" data-home-section="game-categories" aria-labelledby="pvCategoriesTitle"><div class="pv-section-heading"><h2 id="pvCategoriesTitle">${icon('game')} تصفّح حسب الفئة</h2></div>
    ${cats.length ? `<div class="pv-categories">${cats.map((c) => `<button class="pv-category" type="button" data-act="home-cat" data-c="${esc(c.id)}"><span class="pv-category-icon">${icon(c.icon)}</span><b>${esc(c.label)}</b><small>${esc(number(c.count))} ألعاب</small></button>`).join('')}<a class="pv-category pv-category--all" href="#/games"><span class="pv-category-icon">${icon('game')}</span><b>كل الألعاب</b><small>اكتشف لعبتك</small></a></div>` : '<p class="pv-empty-inline">تظهر التصنيفات عند تحميل الألعاب المتاحة.</p>'}
  </section>`;
}
function rankTabs(ctx) {
  return [['all', 'العام'], ...[['ludo', 'لودو'], ['baloot', 'بلوت'], ['jackaro', 'جاكارو']].filter(([id]) => list(ctx.games).some((g) => g?.id === id && g.status === 'available'))];
}
function rankingData(ctx, key) {
  if (ctx.rankings?.list) return ctx.rankings.game === key || (key === 'all' && !ctx.rankings.game) ? ctx.rankings : null;
  return ctx.rankings?.[key] || null;
}
function rankBody(ctx, key) {
  if (ctx.rankingsLoading) return '<div class="pv-rank-empty" role="status"><span class="pv-loading-orbit" aria-hidden="true"></span><p>جاري تحميل المتصدرين…</p></div>';
  if (ctx.rankingsError) return `<div class="pv-rank-empty" role="status"><p>${esc(ctx.rankingsError)}</p><button type="button" class="pv-text-button" data-pv-rank="${esc(key)}">إعادة المحاولة</button></div>`;
  const data = rankingData(ctx, key);
  if (!data) return `<div class="pv-rank-empty" role="status">${icon('trophy')}<p>الترتيب غير متاح بعد.</p><small>ستظهر النتائج عند تحميل بيانات اللاعبين.</small></div>`;
  const rows = list(data.list).slice(0, 5);
  if (!rows.length) return `<div class="pv-rank-empty">${icon('crown')}<p>الصدارة تنتظر أبطالها!</p><small>ما فيه لاعبين في الترتيب للحين. العب مباراة مع لاعب حقيقي لتبدأ المنافسة.</small></div>`;
  return `<ol class="pv-rank-list">${rows.map((r) => `<li${r.me ? ' class="is-me"' : ''}><span class="pv-rank-number${r.rank <= 3 ? ` pv-rank-number--${esc(r.rank)}` : ''}">${esc(number(r.rank))}</span><span class="pv-rank-avatar">${face(ctx, r, 32)}</span><span class="pv-rank-name">${esc(r.name)}${r.me ? '<small>أنت</small>' : ''}</span><b class="pv-rank-points">${esc(number(r.points))}<small>نقطة</small></b></li>`).join('')}</ol>`;
}
function socialHTML(ctx) {
  const key = ctx.rankGame || ctx.rankings?.game || ctx.rankings?.tab || 'all';
  return `<section class="pv-section pv-competition" data-home-section="tournaments-leaderboards" aria-labelledby="pvCompetitionTitle"><div class="pv-section-heading"><h2 id="pvCompetitionTitle">${icon('trophy')} البطولات والمتصدرون</h2></div><div class="pv-social-grid">
    <section class="pv-panel pv-tournament-panel" aria-labelledby="pvTournamentTitle"><h3 id="pvTournamentTitle">${icon('trophy')} البطولات</h3>
      <p>كل منافسة تبدأ بتحدٍّ!</p><div class="pv-trophy-art" aria-hidden="true">${icon('trophy')}</div>
      <p class="pv-honest-note">ما فيه بطولة متاحة حاليًا.<br>نظام بطولات مستقل غير متوفر في النسخة الحالية.</p>
      <a class="pv-button pv-button--gold" href="#/tournaments" data-preview-page="tournaments">حالة البطولات ${icon('arrow')}</a>
    </section>
    <section class="pv-panel pv-rank-panel" aria-labelledby="pvRankingTitle"><h3 id="pvRankingTitle">${icon('crown')} قائمة المتصدرين</h3>
      <div class="pv-rank-tabs" role="group" aria-label="ترتيب حسب اللعبة">${rankTabs(ctx).map(([id, label]) => `<button type="button" data-pv-rank="${esc(id)}" aria-pressed="${key === id}">${esc(label)}</button>`).join('')}</div>
      <div class="pv-rank-body" data-pv-rank-body aria-live="polite">${rankBody(ctx, key)}</div>
      <a class="pv-panel-foot" href="#/lobby">الترتيب من نتائج المباريات ${icon('arrow')}</a>
    </section>
  </div></section>`;
}
function postCard(post, ctx) {
  const author = post.author || {};
  const media = safeURL(post.media, { image: true });
  const date = post.at && !Number.isNaN(new Date(post.at).getTime()) ? new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short' }).format(new Date(post.at)) : '';
  return `<a class="pv-news-card pv-news-card--post" href="#/post/${esc(encodeURIComponent(String(post.id)))}"><span class="pv-news-visual">${media ? `<img src="${esc(media)}" alt="" loading="lazy" decoding="async">` : face(ctx, author, 62)}</span><div><span class="pv-eyebrow">من المجتمع</span><h3>${esc(author.name || 'منشور من المجتمع')}</h3><p>${esc(post.text || 'شارك لحظات اللعب مع المجتمع.')}</p>${date ? `<small>${esc(date)}</small>` : ''}</div></a>`;
}
function newsHTML(ctx) {
  const cards = [];
  const notices = list(ctx.notices).filter((n) => n && (n.title || n.body));
  if (notices.length) cards.push(`<a class="pv-news-card pv-news-card--season" href="#/events" data-preview-page="events"><span class="pv-news-visual pv-news-symbol">${icon(notices[0].kind === 'event' ? 'calendar' : 'bell')}</span><div><span class="pv-eyebrow">${notices[0].kind === 'event' ? 'فعالية من الإدارة' : 'إعلان من الإدارة'}</span><h3>${esc(notices[0].title)}</h3><p>${esc(notices[0].body)}</p><small>اقرأ آخر الإعلانات</small></div></a>`);
  else if (ctx.season) cards.push(`<article class="pv-news-card pv-news-card--season"><span class="pv-news-visual pv-news-symbol">${icon('calendar')}</span><div><span class="pv-eyebrow">فعالية موسمية</span><h3>${esc(ctx.season.title)}</h3><p>${esc(ctx.season.text)}</p><button class="pv-text-button" type="button" data-act="season-play" data-kind="${esc(ctx.season.kind)}">ابدأ التحدي ${icon('arrow')}</button></div></article>`);
  else cards.push(`<article class="pv-news-card pv-news-card--season"><span class="pv-news-visual pv-news-symbol">${icon('crown')}</span><div><span class="pv-eyebrow">فعاليات لعبك</span><h3>للمتعة موعد جديد</h3><p>لا توجد فعالية موسمية نشطة حاليًا.</p><a class="pv-text-link" href="#/events" data-preview-page="events">استعرض الفعاليات</a></div></article>`);
  if (!ctx.noCommunity) {
    if (ctx.postsLoading) cards.push(`<article class="pv-news-card"><span class="pv-news-visual pv-news-symbol">${icon('users')}</span><div role="status"><h3>من المجتمع</h3><p>جاري تحميل آخر المشاركات…</p></div></article>`);
    else if (ctx.postsError) cards.push(`<article class="pv-news-card"><span class="pv-news-visual pv-news-symbol">${icon('users')}</span><div><h3>من المجتمع</h3><p role="status">${esc(ctx.postsError)}</p><button class="pv-text-button" type="button" data-act="home-posts">إعادة المحاولة</button></div></article>`);
    else if (list(ctx.posts).length) cards.push(postCard(ctx.posts[0], ctx));
    else cards.push(`<a class="pv-news-card" href="#/community"><span class="pv-news-visual pv-news-symbol">${icon('users')}</span><div><span class="pv-eyebrow">من المجتمع</span><h3>خلّ جمعتنا تبدأ معك</h3><p>ما فيه منشورات بعد. شارك أول لحظة من لعبك!</p><small>انضم للمجتمع</small></div></a>`);
  }
  const items = list(ctx.shopData?.items).filter((item) => !item.retired);
  cards.push(`<a class="pv-news-card pv-news-card--shop" href="#/shop"><span class="pv-news-visual pv-news-symbol">${icon('frame')}</span><div><span class="pv-eyebrow">متجر لعبك</span><h3>خلّ لملفك طابعه الخاص</h3><p>${items.length ? `${esc(number(items.length))} من المقتنيات المتاحة: أفتارات وإطارات وأكثر.` : 'اكتشف المقتنيات المتاحة في المتجر وزيّن ملفك.'}</p><small>استعرض المتجر ${icon('arrow')}</small></div></a>`);
  return `<section class="pv-section" data-home-section="news-events" aria-labelledby="pvNewsTitle"><div class="pv-section-heading"><h2 id="pvNewsTitle">${icon('bell')} أحدث الأخبار والفعاليات</h2><a class="pv-all-link" href="#/events" data-preview-page="events">عرض الكل ${icon('arrow')}</a></div><div class="pv-news-grid">${cards.join('')}</div>${!ctx.noCommunity && list(ctx.posts).length > 1 ? `<div class="pv-community-feed" aria-label="آخر منشورات المجتمع">${ctx.posts.slice(1, 3).map((post) => postCard(post, ctx)).join('')}</div>` : ''}</section>`;
}
function storeBadge(ctx, kind) {
  const apple = kind === 'apple';
  const href = officialStoreURL(apple ? ctx.siteConfig?.appStoreUrl : ctx.siteConfig?.googlePlayUrl, kind);
  const title = apple ? 'App Store' : 'Google Play';
  const img = apple ? '/preview/assets/app-store.svg' : '/preview/assets/google-play.png';
  const inner = `<img src="${img}" alt="${title}" loading="lazy" decoding="async">`;
  return href ? `<a class="pv-store-badge" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="تنزيل من ${title}">${inner}</a>` : `<span class="pv-store-badge-wrap"><button type="button" class="pv-store-badge" disabled aria-label="قريبًا على ${title}؛ رابط التنزيل غير متاح">${inner}</button><span class="pv-coming-soon">قريبًا</span></span>`;
}
function appsHTML(ctx) {
  const hasStore = officialStoreURL(ctx.siteConfig?.appStoreUrl, 'apple') || officialStoreURL(ctx.siteConfig?.googlePlayUrl, 'google');
  return `<section class="pv-app-section" data-home-section="app-download" aria-labelledby="pvAppsTitle"><div class="pv-app-art" aria-hidden="true"><img src="${ROYAL_CROWN}" alt="">${icon('game')}</div><div class="pv-app-copy"><h2 id="pvAppsTitle">العب في أي وقت ومن أي مكان!</h2><p>${hasStore ? 'حمّل تطبيق لعبك من روابط المتاجر المتاحة أدناه.' : 'تطبيق لعبك قريبًا على App Store وGoogle Play'}</p></div><div class="pv-store-badges">${storeBadge(ctx, 'apple')}${storeBadge(ctx, 'google')}</div></section>`;
}
function socialLinksHTML(ctx) {
  return `<nav class="pv-home-actions" data-home-section="social-rooms" aria-label="الغرف والمجتمع">${ctx.noCommunity ? `<span class="pv-parent-note">الغرف والمنشورات مقفلة من إعدادات الأمان السابقة.</span>` : `<a href="#/social-rooms">${icon('users')} اكتشف الغرف ${icon('arrow')}</a><a href="#/community">${icon('file')} منشورات المجتمع ${icon('arrow')}</a>`}<a href="#/rooms">${icon('game')} غرف الألعاب ${icon('arrow')}</a></nav>`;
}
function disclosure(title, glyph, content, id) {
  return `<details class="pv-home-details" data-home-section="${id}"><summary>${icon(glyph)}<span>${title}</span>${icon('arrow')}</summary><div class="pv-details-body">${content}</div></details>`;
}
/* R60: المزادات والبطولات والأخبار (كانت بقائمة ☰) — صف مرتب تحت البنر */
function quickHTML() {
  const card = (href, ic, t, d) => `<a class="hq60-card" href="${href}"><span class="hq60-ic" aria-hidden="true">${ic}</span><b>${t}</b><small>${d}</small></a>`;
  return `<nav class="hq60" aria-label="المزادات والبطولات والأخبار">${card('#/auction', '🔨', 'المزادات', 'مقتنيات نادرة')}${card('#/tournaments', '🏆', 'البطولات', 'تحديات وجوايز')}${card('#/events', '📰', 'الأخبار', 'الفعاليات والجديد')}</nav>`;
}
export function render(ctx = {}) {
  // R68c: الرئيسية الجديدة بتصميم المالك
  return render68(ctx);
}
export const homeHTML = render;

export function footerHTML(ctx = {}) {
  const config = ctx.siteConfig || {};
  const support = safeURL(config.supportUrl, { hash: true }) || '#/support';
  const contact = safeURL(config.contactUrl, { hash: true }) || '#/contact';
  const socials = (Array.isArray(config.socialLinks) ? config.socialLinks : Object.entries(config.socialLinks || {}).map(([label, href]) => ({ label, href }))).filter((s) => s && typeof s.label === 'string' && /^https:\/\//.test(safeURL(s.href || s.url)));
  return `<footer class="lbh-footer" data-home-section="footer" dir="rtl"><div class="lbh-footer-main"><a class="lbh-footer-brand" href="#/" aria-label="LA3BAK | لعبك — الرئيسية"><img src="${ROYAL_CROWN}" alt=""><b dir="ltr">LA3BAK <span lang="ar">| لعبك</span></b></a><nav class="lbh-footer-links" aria-label="روابط الموقع"><a href="#/about">من نحن</a><a href="${esc(contact)}">اتصل بنا</a><a href="${esc(support)}">المساعدة والدعم</a><a href="#/terms">الشروط والأحكام</a><a href="#/privacy">سياسة الخصوصية</a></nav><div class="lbh-footer-meta">${socials.length ? `<nav class="lbh-social-links" aria-label="حساباتنا على التواصل الاجتماعي">${socials.map((s) => `<a href="${esc(safeURL(s.href || s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('')}</nav>` : ''}<small>جميع الحقوق محفوظة © LA3BAK 2026</small><span class="lbh-footer-safe">${icon('shield')} ألعاب تجمعنا</span></div></div></footer>`;
}

/** Only local banner/ranking interactions. Application-owned data-act and
 * data-preview-* hooks bubble untouched to the existing application bridges.
 * Cleanup stays compatible with the former mountHome contract.
 */
const mounts = new WeakMap();
export function mountHome(root, ctx = {}) {
  if (!root || typeof root.addEventListener !== 'function') return () => {};
  mounts.get(root)?.();
  let destroyed = false;
  let activeRank = ctx.rankGame || ctx.rankings?.game || ctx.rankings?.tab || 'all';
  const onClick = (event) => {
    const target = event.target?.closest?.('[data-pv-banner], [data-pv-rank]');
    if (!target || !root.contains(target)) return;
    if (target.hasAttribute('data-pv-banner')) {
      const selected = Number(target.dataset.pvBanner);
      root.querySelectorAll('[data-pv-slide]').forEach((slide) => { slide.hidden = Number(slide.dataset.pvSlide) !== selected; });
      root.querySelectorAll('[data-pv-banner]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.pvBanner) === selected)));
    }
    if (target.hasAttribute('data-pv-rank')) {
      const key = target.dataset.pvRank;
      if (!['all', 'ludo', 'baloot', 'jackaro'].includes(key)) return;
      activeRank = key;
      root.querySelectorAll('.pv-rank-tabs [data-pv-rank]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.pvRank === key)));
      const body = root.querySelector('[data-pv-rank-body]');
      if (body) body.innerHTML = rankBody(ctx, key);
      if (typeof ctx.onAction === 'function') {
        try {
          Promise.resolve(ctx.onAction('rank', key)).then((data) => {
            if (destroyed || activeRank !== key || !data || !body || !root.contains(body)) return;
            if (Array.isArray(data.list)) body.innerHTML = rankBody({ ...ctx, rankings: { ...data, game: key }, rankingsLoading: false, rankingsError: '' }, key);
          }).catch(() => { if (!destroyed && activeRank === key && body && root.contains(body)) body.innerHTML = rankBody({ ...ctx, rankingsLoading: false, rankingsError: 'تعذّر تحميل الترتيب. حاول مرة ثانية.' }, key); });
        } catch { ctx.toast?.('تعذّر تحميل الترتيب. حاول مرة ثانية.', true); }
      }
    }
  };
  const onInput = (event) => {
    if (!event.target.matches?.('[data-pv-game-search]')) return;
    const q = event.target.value.trim().toLocaleLowerCase('ar');
    let shown = 0;
    root.querySelectorAll('[data-pv-game-name]').forEach((card) => { card.hidden = !card.dataset.pvGameName.toLocaleLowerCase('ar').includes(q); if (!card.hidden) shown++; });
    const empty = root.querySelector('[data-pv-game-empty]'); if (empty) empty.hidden = shown > 0;
  };
  const onImageError = (event) => {
    const image = event.target;
    if (image?.tagName !== 'IMG' || !root.contains(image)) return;
    if (image.closest('.pv-game-art')) { image.parentElement.innerHTML = icon('game'); return; }
    if (image.matches('.pv-hero-art')) { image.remove(); return; }
    const fallback = root.ownerDocument.createElement('span'); fallback.className = 'pv-image-fallback'; fallback.innerHTML = icon('image'); image.replaceWith(fallback);
  };
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('error', onImageError, true);
  root.querySelectorAll('img').forEach((image) => { if (image.complete && !image.naturalWidth) onImageError({ target: image }); });
  const cleanup = () => { destroyed = true; root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('error', onImageError, true); mounts.delete(root); };
  const off68 = mount68(root, ctx);
  const cleanup2 = () => { off68(); cleanup(); };
  mounts.set(root, cleanup2);
  return cleanup2;
}
export function mount(root, ctx = {}) {
  const cleanup = mountHome(root, ctx);
  return { destroy: cleanup };
}
