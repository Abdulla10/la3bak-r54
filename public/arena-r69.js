/* R69: «الساحة» — البطولات، الدوري الأسبوعي، المشاهدة المباشرة، والتحقق بخطوتين.
 * الصفحة ترسم مكان محجوز (.ar-host) والوحدة تعبيه وتحدّثه بنفسها. كل الأرقام من الخادم. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const api = (u, body) => fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' })
  .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || 'تعذّر الطلب.'); return j; });
const nav = () => globalThis.__LA3BAK_NAV__ || location;
const left = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d} يوم ${h} ساعة` : h ? `${h} ساعة ${m} دقيقة` : `${m} دقيقة ${s % 60} ث`; };
const TIER_ICON = ['🥉', '🥈', '🥇', '💎'];
const TIER_BG = ['linear-gradient(135deg,#a0612a,#5a2e0c)', 'linear-gradient(135deg,#9aa6b8,#4a5568)', 'linear-gradient(135deg,#ffd34d,#b37400)', 'linear-gradient(135deg,#6be8ff,#4b3cff)'];

export const arenaHTML = (kind, code = '') => `<div class="ar-host" data-arena="${esc(kind)}" data-code="${esc(code)}"></div>`;

const S = { tours: null, league: null, watch: null, room: null, tf: null, err: '', msg: '', busy: false, form: { game: '', size: 8, fee: 100 }, tfSetup: null, open: null };
const tabs = (on) => `<nav class="ar-tabs" aria-label="الساحة">${[['tournaments', '🏆 البطولات'], ['league', '🏅 الدوري'], ['watch', '👀 مباشر']].map(([k, t]) => `<a href="#/${k}" class="${on === k ? 'on' : ''}" ${on === k ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
const note = () => `${S.err ? `<p class="ar-err" role="alert">${esc(S.err)}</p>` : ''}${S.msg ? `<p class="ar-ok" role="status">${esc(S.msg)}</p>` : ''}`;

/* ---------- البطولات ---------- */
function bracket(t) {
  if (!t.rounds.length) return '';
  const names = ['دور الـ16', 'ربع النهائي', 'نصف النهائي', 'النهائي'];
  return `<div class="ar-br">${t.rounds.map((r, i) => `<div class="ar-rd"><small>${names[names.length - t.rounds.length + i] || 'الدور ' + (i + 1)}</small>${r.map((m) => `<div class="ar-m${m.me ? ' me' : ''}${m.live ? ' live' : ''}">
    <span class="${m.w && m.w === m.a ? 'w' : m.w ? 'l' : ''}">${esc(m.a || '…')}</span><span class="${m.w && m.w === m.b ? 'w' : m.w ? 'l' : ''}">${esc(m.b || '…')}</span>
    ${m.code ? `<a class="ar-go" href="#/room/${esc(m.code)}">العب مباراتك ▶</a>` : m.live ? '<i>🔴 تلعب الحين</i>' : ''}</div>`).join('')}</div>`).join('')}</div>`;
}
function toursHTML() {
  const d = S.tours; if (!d) return `${tabs('tournaments')}<p class="ar-load">جاري التحميل…</p>`;
  const f = S.form; if (!f.game && d.games[0]) f.game = d.games[0].id;
  const mineOpen = d.open.some((t) => t.mine && t.status === 'open');
  const card = (t) => `<article class="ar-t ${t.status}"><header><b>${esc(t.gameName)}</b><span class="ar-pill">${t.size} لاعب</span><span class="ar-pill gold">${t.fee ? `🪙 ${nf(t.fee)}` : 'مجانية'}</span></header>
    <p class="ar-pool">${t.pool ? `الجايزة: <b>🪙 ${nf(Math.floor(t.pool * 0.7))}</b> للبطل و<b>🪙 ${nf(t.pool - Math.floor(t.pool * 0.7))}</b> للوصيف` : 'بطولة ودية بدون جوايز'}</p>
    ${t.status === 'open' ? `<div class="ar-bar"><u style="width:${(t.joined / t.size) * 100}%"></u></div><p class="ar-sub">${t.joined} / ${t.size} مشترك · تنلغي إذا ما اكتملت خلال ${left(t.closesAt - Date.now())}</p><p class="ar-names">${t.players.map(esc).join('، ')}</p>
      ${t.mine ? `<button type="button" class="ar-btn ghost" data-ar="leave" data-id="${t.id}">انسحب (ترجع الرسوم)</button>` : `<button type="button" class="ar-btn" data-ar="join" data-id="${t.id}" ${S.busy ? 'disabled' : ''}>اشترك ${t.fee ? `بـ 🪙 ${nf(t.fee)}` : 'مجاناً'}</button>`}`
    : t.status === 'running' ? `<p class="ar-sub">🔴 البطولة شغالة${t.mine ? ' — أنت فيها' : ''}</p>${bracket(t)}`
    : `<p class="ar-champ">🏆 البطل: <b>${esc(t.winner || '')}</b>${t.second ? ` · 🥈 ${esc(t.second)}` : ''}</p>`}</article>`;
  return `${tabs('tournaments')}<section class="ar-card"><h2>بطولة جديدة</h2><p class="ar-sub">خروج المغلوب: كل مباراة لاعبين، والفايز يتأهل لين يطلع البطل. 70% من الرسوم للبطل و30% للوصيف.</p>
    <label class="ar-lbl">اللعبة</label><div class="ar-chips">${d.games.map((g) => `<button type="button" data-ar-game="${esc(g.id)}" class="${f.game === g.id ? 'on' : ''}">${esc(g.name)}</button>`).join('')}</div>
    <label class="ar-lbl">عدد اللاعبين</label><div class="ar-chips">${d.sizes.map((n) => `<button type="button" data-ar-size="${n}" class="${f.size === n ? 'on' : ''}">${n}</button>`).join('')}</div>
    <label class="ar-lbl">رسم الدخول</label><div class="ar-chips">${d.fees.map((n) => `<button type="button" data-ar-fee="${n}" class="${f.fee === n ? 'on' : ''}">${n ? '🪙 ' + nf(n) : 'مجانية'}</button>`).join('')}</div>
    <button type="button" class="ar-btn" data-ar="create" ${S.busy || mineOpen ? 'disabled' : ''}>أنشئ البطولة${f.fee ? ` وادفع 🪙 ${nf(f.fee)}` : ''}</button></section>
    ${note()}<h2 class="ar-h">البطولات الحالية</h2>${d.open.length ? d.open.map(card).join('') : '<p class="ar-empty">ما فيه بطولات مفتوحة. أنشئ أول وحدة!</p>'}
    ${d.done.length ? `<h2 class="ar-h">آخر الأبطال</h2>${d.done.map(card).join('')}` : ''}`;
}

/* ---------- الدوري ---------- */
function leagueHTML() {
  const d = S.league; if (!d) return `${tabs('league')}<p class="ar-load">جاري التحميل…</p>`;
  const t = d.tier;
  return `${tabs('league')}<section class="ar-tier" style="background:${TIER_BG[t]}"><span class="ar-ti">${TIER_ICON[t]}</span><div><small>مستواك هالأسبوع</small><b>دوري ${esc(d.tiers[t])}</b><small>ينتهي بعد ${left(d.endsAt - Date.now())}</small></div></section>
    ${d.last ? `<p class="ar-last">الأسبوع الماضي: ${d.last.rank ? `المركز ${d.last.rank} بدوري ${esc(d.last.tierName)}` : `ما لعبت بدوري ${esc(d.last.tierName)}`}${d.last.move > 0 ? ' — صعدت ⬆️' : d.last.move < 0 ? ' — نزلت ⬇️' : ''}${d.last.prize ? ` · أخذت 🪙 ${nf(d.last.prize)}` : ''}</p>` : ''}
    <section class="ar-card"><div class="ar-me"><span><small>نقاطك</small><b>${nf(d.me.pts)}</b></span><span><small>ألعابك</small><b>${nf(d.me.games)}</b></span><span><small>ترتيبك</small><b>${d.me.rank ?? '—'}</b></span></div>
    <p class="ar-sub">الفوز = 3 نقاط، واللعب = نقطة (أي لعبة أونلاين فيها لاعبين أو أكثر). آخر الأسبوع: ${t < 3 ? `أول ${d.up || '30%'} يصعدون` : 'الأوائل يحافظون على الماس'}${t > 0 ? `، وآخر ${d.down || '30%'} ينزلون (واللي ما لعب ينزل)` : ''}.</p>
    <div class="ar-prz">${d.prizes.map((p, k) => `<span>${['🥇', '🥈', '🥉'][k]} 🪙 ${nf(p)}</span>`).join('')}</div></section>
    <h2 class="ar-h">ترتيب دوري ${esc(d.tiers[t])} (${d.count} لاعب)</h2>
    ${d.top.length ? `<ol class="ar-rank">${d.top.map((r) => `<li class="${r.me ? 'me' : ''}${r.rank <= d.up && t < 3 ? ' up' : ''}${d.count >= 3 && r.rank > d.count - d.down && t > 0 ? ' down' : ''}"><i>${r.rank}</i><b>${esc(r.name)}</b><small>${nf(r.games)} لعبة</small><em>${nf(r.pts)}</em></li>`).join('')}</ol>` : '<p class="ar-empty">محد لعب بهالمستوى هالأسبوع. العب أول لعبة وتصدّر!</p>'}
    <div class="ar-tiers">${d.tiers.map((n, k) => `<span class="${k === t ? 'on' : ''}">${TIER_ICON[k]} ${esc(n)}</span>`).join('<i>›</i>')}</div>`;
}

/* ---------- المشاهدة ---------- */
function watchListHTML() {
  const d = S.watch; if (!d) return `${tabs('watch')}<p class="ar-load">جاري التحميل…</p>`;
  return `${tabs('watch')}<p class="ar-sub">تفرّج على المباريات الشغالة الحين، شجّع اللاعبين وارسل لهم عملات.</p>
    ${d.list.length ? d.list.map((g) => `<a class="ar-live" href="#/watch/${esc(g.code)}"><span class="ar-dot"></span><div><b>${esc(g.gameName)}</b><small>${g.players.map((p) => esc(p.name) + (p.bot ? ' 🤖' : '')).join(' ضد ')}</small></div><em>👀 ${g.watchers}</em></a>`).join('') : '<p class="ar-empty">ما فيه مباريات شغالة الحين. ارجع بعد شوي!</p>'}`;
}
function watchRoomHTML() {
  const d = S.room; if (!d) return '<p class="ar-load">جاري التحميل…</p>';
  if (!d.live) return `${tabs('watch')}<section class="ar-card"><p>المباراة خلصت 🏁</p><a class="ar-btn" href="#/watch">مباريات ثانية</a></section>`;
  if (d.player) return `${tabs('watch')}<section class="ar-card"><p>أنت لاعب بهالمباراة.</p><a class="ar-btn" href="#/room/${esc(nav().hash.split('/')[2] || '')}">ارجع للعبة</a></section>`;
  let board = ''; try { board = typeof globalThis.__LA3BAK_GAMEHTML__ === 'function' ? globalThis.__LA3BAK_GAMEHTML__(d.room) : ''; } catch { board = '<p class="ar-sub">تعذّر رسم اللعبة.</p>'; }
  const humans = d.players.filter((p) => !p.bot);
  return `<header class="ar-wh"><a href="#/watch" class="ar-back" aria-label="رجوع">‹</a><b>👀 ${esc(d.gameName)}</b><span>${d.watchers} يتفرج</span></header>
    <div class="ar-board" inert>${board}</div>
    <section class="ar-card ar-cheer"><div class="ar-reacts">${d.reactions.map((r) => `<button type="button" data-ar-react="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    ${humans.length ? `<p class="ar-lbl">شجّع لاعب بعملات (توصله على طول):</p>${humans.map((p) => `<div class="ar-cp"><b>${esc(p.name)}</b>${[10, 100, 1000].map((a) => `<button type="button" data-ar-cheer="${p.i}" data-amt="${a}">🪙 ${nf(a)}</button>`).join('')}</div>`).join('')}` : ''}${note()}</section>`;
}

/* ---------- التحقق بخطوتين ---------- */
function tfHTML() {
  const d = S.tf; if (!d) return '<p class="ar-load">جاري التحميل…</p>';
  const st = S.tfSetup;
  return `<section class="ar-card ar-tf"><h2>🔐 التحقق بخطوتين</h2>
    <p class="ar-sub">لما تفعّله، أي تسجيل دخول جديد لحسابك يحتاج رمز من 6 أرقام يطلع بتطبيق المصادقة بجوالك (Google Authenticator أو كلمات السر بالآيفون). حتى لو أحد دخل على حساب Google حقك ما يقدر يدخل حسابك بدون جوالك.</p>
    ${d.on ? `<p class="ar-on">✅ مفعّل</p><label class="ar-lbl" for="ar-tf-c">لإيقافه اكتب الرمز الحالي</label><input id="ar-tf-c" class="ar-in" inputmode="numeric" autocomplete="one-time-code" maxlength="6" data-ar-in="code" placeholder="123456"><button type="button" class="ar-btn ghost" data-ar="tf-off">إيقاف التحقق بخطوتين</button>`
    : st ? `<ol class="ar-steps"><li>افتح تطبيق المصادقة واضغط «إضافة». أو اضغط الزر وبيفتح التطبيق على طول:<br><a class="ar-btn sm" href="${esc(st.uri)}">افتح تطبيق المصادقة</a></li>
        <li>أو انسخ هالمفتاح وحطه يدوي:<br><code class="ar-key" dir="ltr">${esc(st.secret.replace(/(.{4})/g, '$1 ').trim())}</code> <button type="button" class="ar-btn sm ghost" data-ar="tf-copy">نسخ</button></li>
        <li>اكتب الرمز اللي يطلع لك:</li></ol><input class="ar-in" inputmode="numeric" autocomplete="one-time-code" maxlength="6" data-ar-in="code" placeholder="123456" aria-label="رمز التحقق"><button type="button" class="ar-btn" data-ar="tf-on">تفعيل</button>`
    : `<button type="button" class="ar-btn" data-ar="tf-setup">فعّل التحقق بخطوتين</button>`}
    ${note()}<p class="ar-sub small">ضيّعت جوالك؟ تواصل مع الدعم من الإعدادات وبنفكه لك بعد ما نتأكد إن الحساب حقك.</p></section>`;
}

/* ---------- التركيب ---------- */
let code = '';
async function load(kind, host) {
  try {
    if (kind === 'tournaments') S.tours = await api('/api/tours');
    if (kind === 'league') S.league = await api('/api/league');
    if (kind === 'watch' && !host.dataset.code) S.watch = await api('/api/watch');
    if (kind === 'watch' && host.dataset.code) S.room = await api('/api/watch/room?code=' + encodeURIComponent(host.dataset.code));
    if (kind === 'twofa') S.tf = await api('/api/2fa');
  } catch (e) { S.err = e.message; }
  paint(host);
}
function paint(host) {
  if (!host?.isConnected) return; const k = host.dataset.arena;
  const html = k === 'tournaments' ? toursHTML() : k === 'league' ? leagueHTML() : k === 'watch' ? (host.dataset.code ? watchRoomHTML() : watchListHTML()) : k === 'twofa' ? tfHTML() : '';
  const keep = host.querySelector('[data-ar-in]')?.value;
  host.innerHTML = `<div class="ar" dir="rtl">${html}</div>`;
  if (keep) { const i = host.querySelector('[data-ar-in]'); if (i) i.value = keep; }
}
async function act(host, fn) { if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; try { await fn(); } catch (e) { S.err = e.message; } S.busy = false; paint(host); }
function wire(host) {
  host.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const a = b.dataset.ar;
    if (b.dataset.arGame) { S.form.game = b.dataset.arGame; return paint(host); }
    if (b.dataset.arSize) { S.form.size = Number(b.dataset.arSize); return paint(host); }
    if (b.dataset.arFee) { S.form.fee = Number(b.dataset.arFee); return paint(host); }
    if (a === 'create') return act(host, async () => { S.tours = await api('/api/tours/create', S.form); S.msg = 'انشأت البطولة! شارك الصفحة مع ربعك عشان تكتمل 🏆'; });
    if (a === 'join') return act(host, async () => { S.tours = await api('/api/tours/join', { id: b.dataset.id }); S.msg = 'اشتركت! بنرسلك للمباراة أول ما تكتمل البطولة.'; });
    if (a === 'leave') return act(host, async () => { S.tours = await api('/api/tours/leave', { id: b.dataset.id }); S.msg = 'انسحبت ورجعنا لك الرسوم.'; });
    if (b.dataset.arReact) return act(host, async () => { await api('/api/watch/react', { code: host.dataset.code, text: b.dataset.arReact }); S.msg = `أرسلت ${b.dataset.arReact} للاعبين`; });
    if (b.dataset.arCheer) return act(host, async () => { await api('/api/watch/cheer', { code: host.dataset.code, to: Number(b.dataset.arCheer), amount: Number(b.dataset.amt) }); S.msg = `شجّعت بـ 🪙 ${nf(b.dataset.amt)} 👏`; });
    if (a === 'tf-setup') return act(host, async () => { S.tfSetup = await api('/api/2fa/setup', {}); });
    if (a === 'tf-copy') { navigator.clipboard?.writeText(S.tfSetup?.secret || '').then(() => { S.msg = 'نسخت المفتاح.'; paint(host); }).catch(() => {}); return; }
    if (a === 'tf-on') return act(host, async () => { S.tf = await api('/api/2fa/enable', { code: host.querySelector('[data-ar-in]')?.value }); S.tfSetup = null; S.msg = 'تم التفعيل ✅ من الحين أي دخول جديد يحتاج الرمز.'; });
    if (a === 'tf-off') return act(host, async () => { S.tf = await api('/api/2fa/disable', { code: host.querySelector('[data-ar-in]')?.value }); S.msg = 'وقفنا التحقق بخطوتين.'; });
  });
}
function css() {
  if (document.getElementById('ar-css')) return;
  const st = document.createElement('style'); st.id = 'ar-css';
  st.textContent = `.ar{color:#fff;font-family:inherit;padding-bottom:20px}.ar *{box-sizing:border-box}
.ar-tabs{display:flex;gap:6px;margin:4px 0 12px;padding:4px;border-radius:99px;background:#ffffff10;border:1px solid #ffffff1a}.ar-tabs a{flex:1;text-align:center;padding:9px 4px;border-radius:99px;color:#e9dcff;text-decoration:none;font-weight:800;font-size:14px}.ar-tabs a.on{background:linear-gradient(135deg,#8b2ff0,#5a1fa8);color:#fff;box-shadow:0 2px 10px #8b2ff066}
.ar-card{background:linear-gradient(160deg,#2a1050e6,#170830e6);border:1px solid #a86bff44;border-radius:18px;padding:14px;margin-bottom:12px}.ar-card h2{margin:0 0 6px;font-size:18px}
.ar-h{font-size:16px;margin:16px 4px 8px}.ar-sub{font-size:13px;opacity:.8;margin:4px 0 8px;line-height:1.6}.ar-sub.small{font-size:12px;opacity:.6}.ar-lbl{display:block;font-size:13px;font-weight:800;margin:10px 0 6px;opacity:.9}
.ar-chips{display:flex;flex-wrap:wrap;gap:6px}.ar-chips button{border:1px solid #ffffff2e;background:#ffffff10;color:#fff;border-radius:99px;padding:7px 13px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.ar-chips button.on{background:#7b3cff;border-color:#c9a2ff}
.ar-btn{display:inline-block;width:100%;margin-top:12px;border:0;border-radius:14px;padding:12px;font:inherit;font-weight:900;font-size:15px;color:#3a1a00;background:linear-gradient(90deg,#ffb020,#ffd76b);cursor:pointer;text-align:center;text-decoration:none}.ar-btn:disabled{opacity:.5;cursor:default}.ar-btn.ghost{background:#ffffff14;color:#fff;border:1px solid #ffffff33}.ar-btn.sm{width:auto;padding:7px 12px;font-size:13px;margin:6px 0}
.ar-err{color:#ffb3c0;font-weight:800;margin:8px 0}.ar-ok{color:#9dffb0;font-weight:800;margin:8px 0}.ar-load,.ar-empty{text-align:center;opacity:.75;padding:20px}
.ar-t{background:#ffffff0c;border:1px solid #ffffff1f;border-radius:16px;padding:12px;margin-bottom:10px}.ar-t.running{border-color:#ff5b7a88}.ar-t.done{opacity:.9}.ar-t header{display:flex;align-items:center;gap:6px}.ar-t header b{flex:1;font-size:16px}
.ar-pill{font-size:12px;padding:3px 9px;border-radius:99px;background:#ffffff1a;font-weight:800}.ar-pill.gold{background:#ffd34d22;color:#ffd34d}.ar-pool{font-size:13px;margin:6px 0}.ar-pool b{color:#ffd34d}
.ar-bar{height:8px;border-radius:99px;background:#ffffff18;overflow:hidden;margin:8px 0 4px}.ar-bar u{display:block;height:100%;background:linear-gradient(90deg,#ffc83d,#ff6bd5)}.ar-names{font-size:12px;opacity:.7;margin:2px 0}
.ar-champ{font-size:14px}.ar-champ b{color:#ffd34d}
.ar-br{display:flex;gap:8px;overflow-x:auto;padding:6px 0;direction:rtl}.ar-rd{display:flex;flex-direction:column;justify-content:space-around;gap:8px;min-width:130px}.ar-rd small{text-align:center;opacity:.7;font-weight:800}
.ar-m{display:flex;flex-direction:column;border-radius:10px;background:#0006;border:1px solid #ffffff1f;overflow:hidden;font-size:12.5px}.ar-m span{padding:5px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ar-m span+span{border-top:1px solid #ffffff14}.ar-m .w{color:#9dffb0;font-weight:900}.ar-m .l{opacity:.45;text-decoration:line-through}.ar-m.me{border-color:#ffd34d}.ar-m.live{border-color:#ff5b7a}.ar-m i{font-style:normal;font-size:11px;padding:3px 8px;color:#ff9db0}
.ar-go{display:block;text-align:center;padding:6px;background:#16a314;color:#fff;font-weight:900;text-decoration:none}
.ar-tier{display:flex;align-items:center;gap:14px;padding:16px;border-radius:20px;margin-bottom:10px;box-shadow:0 6px 20px #0006}.ar-ti{font-size:48px;filter:drop-shadow(0 3px 4px #0006)}.ar-tier div{display:flex;flex-direction:column}.ar-tier b{font-size:24px}.ar-tier small{opacity:.9;font-size:12px}
.ar-last{font-size:13px;background:#ffffff10;border-radius:12px;padding:8px 12px;margin:0 0 10px}
.ar-me{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ar-me span{display:flex;flex-direction:column;align-items:center;background:#0005;border-radius:12px;padding:8px}.ar-me small{font-size:12px;opacity:.75}.ar-me b{font-size:22px;color:#ffd34d}
.ar-prz{display:flex;justify-content:space-around;font-weight:800;font-size:14px}
.ar-rank{list-style:none;margin:0;padding:0;display:grid;gap:5px}.ar-rank li{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;background:#ffffff0c;border-inline-start:3px solid transparent}.ar-rank li.up{border-color:#4be38a}.ar-rank li.down{border-color:#ff6b85}.ar-rank li.me{background:#7b3cff44}
.ar-rank i{font-style:normal;font-weight:900;min-width:24px;opacity:.8}.ar-rank b{flex:1}.ar-rank small{opacity:.6;font-size:12px}.ar-rank em{font-style:normal;font-weight:900;color:#ffd34d;min-width:40px;text-align:left}
.ar-tiers{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px;margin-top:14px;font-size:13px;opacity:.85}.ar-tiers span{padding:4px 10px;border-radius:99px;background:#ffffff10}.ar-tiers span.on{background:#7b3cff}.ar-tiers i{font-style:normal;opacity:.5}
.ar-live{display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:#ffffff0c;border:1px solid #ffffff1f;color:#fff;text-decoration:none;margin-bottom:8px}.ar-live div{flex:1;display:flex;flex-direction:column}.ar-live small{opacity:.75;font-size:12.5px}.ar-live em{font-style:normal;font-weight:800;opacity:.85}
.ar-dot{width:10px;height:10px;border-radius:50%;background:#ff2e4d;box-shadow:0 0 0 0 #ff2e4d;animation:ardot 1.4s infinite}@keyframes ardot{70%{box-shadow:0 0 0 8px #ff2e4d00}}
.ar-wh{display:flex;align-items:center;gap:10px;margin-bottom:8px}.ar-wh b{flex:1;font-size:16px}.ar-wh span{font-size:13px;opacity:.8}.ar-back{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#ffffff14;color:#fff;text-decoration:none;font-size:22px}
.ar-board{position:relative;height:68vh;pointer-events:none;user-select:none;border-radius:16px;overflow:hidden;margin-bottom:10px;transform:translateZ(0);contain:paint;isolation:isolate;border:1px solid #ffffff22}.ar-board>*{zoom:.8}.ar-board [class*="rules"],.ar-board [class*="-help"],.ar-board [role="dialog"]{display:none!important}
.ar-reacts{display:flex;flex-wrap:wrap;gap:6px}.ar-reacts button{border:1px solid #ffffff2e;background:#ffffff10;color:#fff;border-radius:99px;padding:6px 10px;font:inherit;font-size:15px;cursor:pointer}
.ar-cp{display:flex;align-items:center;gap:6px;margin:6px 0}.ar-cp b{flex:1;font-size:14px}.ar-cp button{border:0;border-radius:10px;padding:7px 9px;background:linear-gradient(#ffd76b,#ffb020);color:#3a1a00;font:inherit;font-weight:900;font-size:12.5px;cursor:pointer}
.ar-tf .ar-on{font-size:18px;font-weight:900;color:#9dffb0}.ar-in{width:100%;border-radius:12px;border:1px solid #9b5cff88;background:#0f0520;color:#fff;padding:12px;font:inherit;font-size:22px;letter-spacing:6px;text-align:center;direction:ltr}
.ar-steps{padding-inline-start:20px;font-size:14px;line-height:1.7}.ar-key{display:inline-block;background:#0007;border-radius:8px;padding:6px 10px;font-size:14px;letter-spacing:1px;word-break:break-all}`;
  document.head.append(st);
}
if (typeof document !== 'undefined' && !globalThis.__AR69__) {
  globalThis.__AR69__ = true; let q = 0, poll = 0;
  const scan = () => {
    const host = document.querySelector('.ar-host[data-arena]'); if (!host || host._ar) return;
    css(); host._ar = true; wire(host);
    const kind = host.dataset.arena; if (host.dataset.code !== code) { code = host.dataset.code; S.room = null; }
    S.err = ''; S.msg = ''; paint(host); load(kind, host);
    clearInterval(poll); const every = kind === 'watch' && host.dataset.code ? 1500 : kind === 'twofa' ? 0 : 6000;
    if (every) poll = setInterval(() => { if (!host.isConnected) return clearInterval(poll); if (!document.hidden && !S.busy && !host.contains(document.activeElement?.closest?.('input') || null)) load(kind, host); }, every);
  };
  new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; scan(); }); }).observe(document.documentElement, { childList: true, subtree: true }); scan();
}
