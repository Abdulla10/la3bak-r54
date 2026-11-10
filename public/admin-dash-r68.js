// R68z: لوحة التحكم بتصميم المالك — القائمة الجانبية، الشريط العلوي، والصفحة الرئيسية.
// كل الأرقام من /api/admin/dash68 (بيانات حقيقية)، ما فيه أرقام وهمية.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const TZ = 'Asia/Dubai';
const tm = (t) => new Date(t).toLocaleTimeString('ar-AE-u-nu-latn', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const ago = (t) => { const s = Math.max(0, (Date.now() - t) / 1000); if (s < 60) return 'الحين'; if (s < 3600) return `قبل ${Math.floor(s / 60)} دقائق`.replace(/^قبل 1 دقائق$/, 'قبل دقيقة'); if (s < 86400) return `قبل ${Math.floor(s / 3600)} ساعة`; return `قبل ${Math.floor(s / 86400)} يوم`; };
const up = (ch) => `<em class="d68-ch ${ch < 0 ? 'dn' : ''}">${ch < 0 ? '↓' : '↑'} ${ch > 0 ? '+' : ''}${ch}%</em>`;

/* ---------- القائمة الجانبية: نفس ترتيب التصميم، وكل بند يفتح أقسامه ---------- */
export const GROUPS68 = [
  ['overview', 'لوحة التحكم', '🏠', ['overview']],
  ['stats', 'إحصائيات المنصة', '📊', ['watch', 'health']],
  ['players', 'إدارة اللاعبين', '👥', ['players', 'player-log', 'ids3', 'owner-tools', 'verification', 'bulk']],
  ['economy', 'المحفظة والعملات', '🪙', ['economy', 'pricing', 'payments', 'tuning']],
  ['shop', 'المتجر والمنتجات', '🛒', ['shop', 'gifts', 'auction', 'home-banners']],
  ['games', 'إدارة الألعاب', '🎮', ['games-control', 'luck', 'achievements']],
  ['rooms', 'الغرف والمباريات', '🗂️', ['rooms', 'social', 'site-ops']],
  ['cups', 'البطولات', '🏆', ['rank-vip', 'progression', 'tribes-cp']],
  ['events', 'الفعاليات', '📅', ['live', 'functional']],
  ['ann', 'الإعلانات والإشعارات', '📢', ['notices', 'reports']],
  ['staff', 'المشرفون والصلاحيات', '🛡️', ['staff']],
  ['audit', 'سجل العمليات', '📋', ['audit']],
  ['security', 'الأمان والحماية', '🔒', ['suspicious', 'maintenance']],
  ['settings', 'إعدادات النظام', '⚙️', ['settings', 'system']],
];
const DOWN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9 12 15 18 9"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 8 12 15 19"/></svg>';
export function side68({ tabs, tab, open, esc: _e }) {
  const allowed = new Map(tabs.map((t) => [t[0], t[1]]));
  const seen = new Set(GROUPS68.flatMap((g) => g[3]));
  const groups = GROUPS68.map((g) => [...g.slice(0, 3), g[3].filter((t) => allowed.has(t))]);
  const rest = [...allowed.keys()].filter((t) => !seen.has(t)); if (rest.length) groups[groups.length - 1][3].push(...rest);
  return groups.filter((g) => g[3].length).map(([id, label, ic, list]) => {
    const here = list.includes(tab), isOpen = list.length > 1 && (open[id] ?? here);
    const sub = list.length > 1 && isOpen ? `<div class="d68-sub">${list.map((t) => `<button type="button" class="${t === tab ? 'on' : ''}" data-ad-entry data-ad-label="${esc(allowed.get(t))}" data-ad="tab" data-t="${t}" data-navid="${t}">${esc(allowed.get(t))}</button>`).join('')}</div>` : '';
    return `<div class="d68-grp${here ? ' here' : ''}${isOpen ? ' open' : ''}"><button type="button" class="d68-item${here ? ' on' : ''}" data-ad-entry data-ad-label="${esc(label)}" data-ad="tab" data-t="${list[0]}" data-navid="${list[0]}" ${here ? 'aria-current="page"' : ''}><i aria-hidden="true">${ic}</i><span>${esc(label)}</span>${list.length > 1 ? `<b class="d68-chev" data-ad68-grp="${id}" role="button" aria-label="أقسام ${esc(label)}" aria-expanded="${isOpen}">${CHEV}</b>` : '<b class="d68-chev d68-chev-x">' + CHEV + '</b>'}</button>${sub}</div>`;
  }).join('');
}
export const brand68 = () => `<span class="d68-logo"><i aria-hidden="true">👑</i><b lang="ar">لعبك</b><small dir="ltr">LA3BAK</small></span>`;
export function head68({ me, search, bell, sidebarOpen, menuIcon, searchIcon }) {
  const d = new Date();
  const date = d.toLocaleDateString('ar-AE-u-nu-latn', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `<header class="ad-head d68-head"><button class="ad-menu-toggle d68-ib d68-menu" type="button" data-ad="menu" aria-controls="ad-royal-sidebar" aria-expanded="${sidebarOpen}">${menuIcon}<span class="sr-only">القائمة</span></button>
    <div class="d68-date"><span class="d68-cal" aria-hidden="true">📅</span><span><b>${esc(date)}</b><small>${esc(tm(d))}</small></span></div>
    <form class="ad-global-search d68-search" data-adf="navsearch"><input class="ad-in" name="q" value="${esc(search)}" autocomplete="off" placeholder="بحث عن لاعب، غرفة، مباراة، ..." aria-label="بحث"><button type="submit" aria-label="بحث">${searchIcon}</button></form>
    <div class="d68-tools"><button type="button" class="d68-ib d68-bell" data-ad="tab" data-t="reports" data-navid="reports" aria-label="البلاغات المفتوحة ${nf(bell)}"><span aria-hidden="true">🔔</span>${bell ? `<em>${bell > 99 ? '99+' : bell}</em>` : ''}</button>
    <button type="button" class="d68-ib" data-ad="tab" data-t="settings" data-navid="settings" aria-label="الإعدادات"><span aria-hidden="true">⚙️</span></button>
    <details class="ad-account-menu d68-acc"><summary><span class="d68-acc-av" aria-hidden="true">👑</span><span><b>${esc(me.role === 'owner' ? 'المدير العام' : me.name)}</b><small>${me.role === 'owner' ? 'Admin' : esc(me.roleLabel)}</small></span>${DOWN}</summary><div><p>${esc(me.name)} · ${esc(me.roleLabel)}</p><button type="button" class="ad-btn ghost" data-ad="tab" data-t="settings">صلاحيات وإعدادات الحساب</button><button type="button" class="ad-btn danger" data-ad="logout">تسجيل الخروج</button></div></details></div></header>`;
}

/* ---------- الصفحة الرئيسية ---------- */
const GAME_ART = { jackaro: '/preview/assets/game-jackaro.webp', ludo: '/preview/assets/game-ludo.webp', baloot: '/preview/assets/game-baloot.webp', domino: '/preview/assets/game-domino.webp', uno: '/preview/assets/game-uno.webp', carrom: '/preview/assets/game-carrom.webp', codewords: '/preview/assets/game-codewords-3d-r45.webp', minaboli: '/preview/assets/game-minaboli-3d-r49.webp' };
const gameImg = (id, cls = '') => GAME_ART[id] ? `<img class="${cls}" src="${GAME_ART[id]}" alt="" loading="lazy">` : `<span class="${cls} d68-gem" aria-hidden="true">🎮</span>`;
const FEED_IC = { buy: '🛒', gem: '💎', user: '🧑', ban: '🚫', admin: '🛡️', cup: '🏆' };

function chartSVG(rows) {
  const W = (typeof innerWidth === 'number' && innerWidth < 640) ? 360 : 700, H = 170, L = 40, B = 22, T = 10;
  const vals = rows.map((r) => r.active); const max0 = Math.max(4, ...vals);
  const step = Math.pow(10, Math.floor(Math.log10(max0))); const max = Math.ceil(max0 / step) * step || 4;
  const x = (i) => L + 22 + (rows.length === 1 ? (W - L - 64) / 2 : i * (W - L - 64) / (rows.length - 1));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const pts = rows.map((r, i) => [x(i), y(r.active)]);
  let path = `M${pts[0][0]},${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; path += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; }
  const grid = [0, 1, 2, 3, 4, 5].map((k) => { const v = max * k / 5; return `<text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'K' : Math.round(v * 10) / 10}</text><line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`; }).join('');
  const lbl = (d) => { const dt = new Date(d + 'T12:00:00Z'); return `${dt.getUTCDate()} ${dt.toLocaleDateString('ar', { month: 'long', timeZone: 'UTC' })}`; };
  const every = rows.length > 10 ? Math.ceil(rows.length / (W < 500 ? 4 : 7)) : (W < 500 ? 2 : 1);
  const xl = rows.map((r, i) => (i % every === 0 || i === rows.length - 1) ? `<text x="${x(i)}" y="${H + 2}" text-anchor="middle">${lbl(r.d)}</text>` : '').join('');
  const last = pts[pts.length - 1];
  return `<svg class="d68-chart" viewBox="0 0 ${W} ${H + 8}" role="img" aria-label="اللاعبين النشطين يومياً"><defs><linearGradient id="d68g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b44dff" stop-opacity=".75"/><stop offset="1" stop-color="#5a1a9a" stop-opacity=".05"/></linearGradient><linearGradient id="d68l" x1="0" x2="1"><stop offset="0" stop-color="#9b4dff"/><stop offset="1" stop-color="#e070ff"/></linearGradient></defs>
    <g class="d68-grid">${grid}</g><path d="${path} L${last[0]},${H - B} L${pts[0][0]},${H - B}Z" fill="url(#d68g)"/><path d="${path}" fill="none" stroke="url(#d68l)" stroke-width="3"/>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 6 : 4}" class="${i === pts.length - 1 ? 'last' : ''}"><title>${rows[i].d}: ${rows[i].active} لاعب نشط · ${rows[i].games} مباراة</title></circle>`).join('')}<g class="d68-xl">${xl}</g></svg>`;
}
function ring(p) {
  const r = 62, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, p));
  return `<svg class="d68-ring" viewBox="0 0 160 160" aria-hidden="true"><defs><linearGradient id="d68r" x1="0" x2="1" y1="1" y2="0"><stop offset="0" stop-color="#a64dff"/><stop offset=".6" stop-color="#ff9f2e"/><stop offset="1" stop-color="#ffd34d"/></linearGradient></defs><circle cx="80" cy="80" r="${r}" class="bg"/><circle cx="80" cy="80" r="${r}" stroke="url(#d68r)" class="fg" stroke-dasharray="${c * v / 100} ${c}" transform="rotate(-90 80 80)"/></svg>`;
}
export function dash68HTML(d, { days = 7 } = {}) {
  if (!d) return '<p class="ad-muted">جاري التحميل…</p>';
  const k = d.kpi;
  const kpi = (title, val, ch, icon, cls = '') => `<article class="d68-kpi ${cls}"><div><h3>${title}</h3><b>${val}</b>${up(ch)}</div><span class="d68-kic" aria-hidden="true">${icon}</span></article>`;
  const live = d.live.length ? d.live.map((r) => `<a class="d68-live-row" href="#/social-room/${esc(r.id)}" target="_blank" rel="noopener"><span class="d68-live-ic" aria-hidden="true">🎙️</span><div><b>${esc(r.name)}</b><small>👥 ${nf(r.members)}</small></div><span class="d68-thumb"><img src="${esc(r.img)}" alt="" loading="lazy"><i aria-hidden="true">🎤</i></span><span class="d68-go">${CHEV}</span></a>`).join('') : '<p class="d68-empty">ما فيه غرف مباشرة الحين.</p>';
  const games = d.games.length ? d.games.map((g) => `<article class="d68-game">${gameImg(g.id, 'd68-gimg')}<b>${esc(g.name)}</b><small>${nf(g.players)} لاعب</small>${up(g.ch)}</article>`).join('') : '<p class="d68-empty">ما فيه مباريات بهالفترة.</p>';
  const feed = d.feed.length ? d.feed.slice(0, 4).map((f) => `<li><span class="d68-fic" aria-hidden="true">${FEED_IC[f.k] || '•'}</span><div><b>${esc(f.title)}</b><small>${esc(f.sub)}</small></div><time>${esc(ago(f.t))}</time></li>`).join('') : '<li class="d68-empty">ما فيه نشاط جديد.</li>';
  const matches = d.matches.length ? d.matches.slice(0, 4).map((m) => `<tr><td><span class="d68-tg">${gameImg(m.game, 'd68-mi')}${esc(m.name)}</span></td><td>${esc(m.mode)}</td><td><span class="d68-res ${m.win ? 'w' : 'l'}" title="${esc(m.winner)}">${m.win ? 'فوز' : 'خسارة'}</span></td><td>${esc(tm(m.ts))}</td></tr>`).join('') : '<tr><td colspan="4" class="d68-empty">ما فيه مباريات بعد.</td></tr>';
  const medal = ['🥇', '🥈', '🥉'];
  const top = d.top.length ? d.top.slice(0, 4).map((p, i) => `<tr><td>${medal[i] ? `<span class="d68-medal">${medal[i]}</span>` : i + 1}</td><td><span class="d68-pl">${p.avatar ? `<img src="${esc(p.avatar)}" alt="" loading="lazy">` : '<i>👤</i>'}${esc(p.name)}</span></td><td><span class="d68-lv">Lv.${nf(p.level)}</span></td><td>${nf(p.points)}</td></tr>`).join('') : '<tr><td colspan="4" class="d68-empty">ما فيه لاعبين بعد.</td></tr>';
  return `<div class="d68">
    <section class="d68-kpis">
      ${kpi('إجمالي المستخدمين', nf(k.users.v), k.users.ch, '👤')}
      ${kpi('اللاعبون النشطون', nf(k.active.v), k.active.ch, '👥')}
      ${kpi('إجمالي العملات', nf(k.coins.v), k.coins.ch, '🪙', 'coin')}
      ${kpi('إجمالي المبيعات', `${nf(k.sales.v)} <small>عملة</small>`, k.sales.ch, '🛒')}
    </section>
    <section class="d68-row1">
      <article class="d68-card d68-rate">${ring(d.rate)}<div class="d68-rate-in"><span aria-hidden="true">👥</span><small>معدل النشاط</small><b>${d.rate}%</b></div></article>
      <article class="d68-card d68-stats"><header><h2><span aria-hidden="true">📊</span> إحصائيات المنصة</h2><label class="d68-sel"><select data-ad68-days aria-label="الفترة"><option value="7" ${days === 7 ? 'selected' : ''}>آخر 7 أيام</option><option value="30" ${days === 30 ? 'selected' : ''}>آخر 30 يوم</option></select></label></header>${chartSVG(d.chart)}</article>
      <article class="d68-card d68-live"><header><h2><span class="d68-air" aria-hidden="true">((•))</span> البث المباشر الآن</h2></header>${live}</article>
    </section>
    <section class="d68-row2">
      <article class="d68-card d68-games"><header><h2><span aria-hidden="true">🎮</span> الألعاب الأكثر نشاطاً</h2></header><div class="d68-glist">${games}</div></article>
      <article class="d68-card d68-feed"><header><h2><span aria-hidden="true">📊</span> آخر الأنشطة</h2><button type="button" class="d68-all" data-ad="tab" data-t="audit" data-navid="audit">عرض الكل</button></header><ul>${feed}</ul></article>
      <article class="d68-card d68-top"><header><h2><span aria-hidden="true">👑</span> أبرز اللاعبين</h2><button type="button" class="d68-all" data-ad="tab" data-t="players" data-navid="players">عرض الكل</button></header><table><thead><tr><th>#</th><th>اللاعب</th><th>المستوى</th><th>النقاط</th></tr></thead><tbody>${top}</tbody></table></article>
      <article class="d68-card d68-matches"><header><h2><span aria-hidden="true">🏆</span> المباريات الأخيرة</h2><button type="button" class="d68-all" data-ad="tab" data-t="rooms" data-navid="rooms">عرض الكل</button></header><table><thead><tr><th>اللعبة</th><th>النوع</th><th>النتيجة</th><th>الوقت</th></tr></thead><tbody>${matches}</tbody></table></article>
    </section></div>`;
}
