/* المجتمع: منشورات وإعجابات وتعليقات ومتابعة وإشعارات وبلاغات. كل التحقق والعدّ والصلاحيات من الخادم (src/server/community.ts).
 * النصوص تُعرض بعد تهريبها دائماً (ما نستعمل HTML من المستخدم)، والروابط داخلية فقط. */
import { avatarArt } from './avatars.js?v=r107';
import { officialBadge } from './official-badge-r67.js?v=r67as';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = (n) => Number(n).toLocaleString('ar-EG-u-nu-latn');
const PUB_RE = /^[A-Za-z0-9_-]{16}$/;
export const LIMITS = { post: 1000, comment: 400, image: 700 * 1024 };

export const CM = {
  feed: { list: [], more: false, loading: false, err: '', scope: 'all', loaded: false },
  post: { id: 0, data: null, loading: false, err: '', reply: null },
  user: { pub: '', data: null, loading: false, err: '' },
  notifs: { data: null, loading: false, err: '' },
  me: null, unread: 0,
  draft: { text: '', blob: null, url: '', busy: false },
  edit: null, menu: null, report: null, busy: new Set(),
};

/** طلب للخادم: JSON أو صورة. يرجع { ok, status, ...body } ولا يرمي */
export async function api(path, { method = 'GET', body, raw, type } = {}) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch('/api/community/' + path, { method, signal: ctl.signal, credentials: 'same-origin', headers: raw ? { 'Content-Type': type } : body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, ...j, error: j.error || (r.ok ? '' : 'صار خطأ، جرّب مرة ثانية.') };
  } catch { return { ok: false, status: 0, error: 'تعذّر الاتصال. تأكد من الإنترنت وجرّب مرة ثانية.' }; }
  finally { clearTimeout(tm); }
}

/* ---------- تحميل ---------- */
let feedGeneration = 0, postGeneration = 0, userGeneration = 0, listGeneration = 0, notifGeneration = 0;
// الرابط جزء من المفتاح إذا كنا بالمتصفح؛ الاختبارات المعزولة ما تحتاج نافذة.
const routeKey = () => typeof location === 'undefined' ? '' : (globalThis.__LA3BAK_NAV__ || location).hash;
export async function loadFeed(more = false) {
  const F = CM.feed, scope = F.scope, route = routeKey();
  if (more && F.loading) return;
  const generation = ++feedGeneration; F.loading = true; F.err = '';
  const before = more && F.list.length ? F.list.at(-1).id : '';
  const r = await api(`feed?scope=${scope}${before ? '&before=' + before : ''}`);
  if (generation !== feedGeneration || scope !== F.scope) return;
  if (route !== routeKey()) { F.loading = false; return; }
  F.loading = false; F.loaded = true;
  if (!r.ok) { F.err = r.error; return; }
  F.list = more ? [...F.list, ...r.posts.filter((p) => !F.list.some((x) => x.id === p.id))] : r.posts; F.more = r.more;
}
export async function loadPost(id) {
  const routeId = routeKey().match(/^#\/post\/([^/?]+)/)?.[1];
  if (routeId !== undefined && Number(routeId) !== Number(id)) return;
  const generation = ++postGeneration, route = routeKey();
  const P = CM.post; P.id = Number(id); P.loading = true; P.err = '';
  if (P.data?.post.id !== P.id) { P.data = null; P.reply = null; }
  const selected = P.id;
  const r = await api('post/' + P.id);
  if (generation !== postGeneration || P.id !== selected) return;
  if (route !== routeKey()) { P.loading = false; return; }
  P.loading = false; if (!r.ok) { P.err = r.error; P.data = null; return; }
  P.data = r;
}
export async function loadUser(pub, more = false) {
  const routePub = routeKey().match(/^#\/u\/([^/?]+)/)?.[1];
  if (routePub !== undefined && routePub !== pub) return;
  const generation = ++userGeneration, route = routeKey();
  const U = CM.user; if (!PUB_RE.test(pub)) { ++listGeneration; U.pub = ''; U.loading = false; U.list = null; U.err = 'الرابط غير صالح.'; U.data = null; return; }
  if (U.pub !== pub) { ++listGeneration; U.data = null; U.list = null; }
  U.pub = pub; U.loading = true; U.err = '';
  const previous = more && U.data?.user.pub === pub ? U.data : null;
  const before = previous?.posts.length ? previous.posts.at(-1).id : '';
  const r = await api('user/' + pub + (before ? '?before=' + before : ''));
  if (generation !== userGeneration || U.pub !== pub) return;
  if (route !== routeKey()) { U.loading = false; return; }
  U.loading = false; if (!r.ok) { U.err = r.error; if (!more) U.data = null; return; }
  U.data = previous ? { ...r, posts: [...previous.posts, ...r.posts.filter((p) => !previous.posts.some((x) => x.id === p.id))] } : r;
}
export async function loadNotifs() {
  const generation = ++notifGeneration;
  const N = CM.notifs; N.loading = true; N.err = '';
  const r = await api('notifs'); if (generation !== notifGeneration) return; N.loading = false;
  if (!r.ok) { N.err = r.error; return; }
  N.data = r; CM.unread = r.unread;
}
export async function loadMe() { const r = await api('me'); if (r.ok) { CM.me = r.pub; CM.unread = r.unread; } return r.ok; }

/* ---------- أدوات العرض ---------- */
const RTF = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('ar-u-nu-latn', { numeric: 'auto' }) : null;
export function ago(ts) {
  const s = Math.round((ts - Date.now()) / 1000), a = Math.abs(s);
  if (!RTF || a > 30 * 86400) return new Date(ts).toLocaleDateString('ar-EG-u-nu-latn', { dateStyle: 'medium' });
  if (a < 60) return 'الحين';
  if (a < 3600) return RTF.format(Math.round(s / 60), 'minute');
  if (a < 86400) return RTF.format(Math.round(s / 3600), 'hour');
  return RTF.format(Math.round(s / 86400), 'day');
}
export function faceOf(u, size = 44) {
  if (u.av) return `<span class="cm-av" style="--s:${size}px">${avatarArt(u.av, size)}</span>`;
  const ch = [...String(u.name || 'ل').trim()][0] || 'ل';
  const hue = [...String(u.pub || u.name)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  return `<span class="cm-av ini" style="--s:${size}px;--h:${hue}" aria-hidden="true">${esc(ch)}</span>`;
}
const userLink = (u, cls = '') => `<a class="cm-name ${cls}" href="#/u/${esc(u.pub)}">${esc(u.name)}</a>`;

export function postCard(p, { full = false, signed = false } = {}) {
  const editing = CM.edit === p.id;
  const body = editing
    ? `<form class="cm-editf" data-form="cm-edit" data-id="${p.id}"><label class="sr" for="ed${p.id}">تعديل المنشور</label><textarea id="ed${p.id}" name="text" maxlength="${LIMITS.post}" rows="4">${esc(p.text)}</textarea><div class="cm-row"><button class="btn sm" type="submit">حفظ</button><button class="btn ghost sm" type="button" data-act="cm-edit-x">إلغاء</button></div></form>`
    : p.text ? `<p class="cm-text">${esc(p.text)}</p>` : '';
  const img = p.media ? `<a class="cm-img" href="#/post/${p.id}" aria-label="فتح المنشور"><img src="${esc(p.media)}" alt="صورة من ${esc(p.author.name)}" loading="lazy" decoding="async"></a>` : '';
  const menuOpen = CM.menu === 'p' + p.id;
  const menu = signed ? `<div class="cm-more"><button type="button" class="cm-dots" data-act="cm-menu" data-k="p${p.id}" aria-label="خيارات المنشور" aria-expanded="${menuOpen}">⋯</button>${menuOpen ? `<div class="cm-pop" role="menu">${p.mine
    ? `<button type="button" role="menuitem" data-act="cm-edit" data-id="${p.id}">✏️ تعديل</button><button type="button" role="menuitem" class="danger" data-act="cm-del" data-id="${p.id}">🗑️ حذف</button>`
    : `<button type="button" role="menuitem" data-act="cm-report" data-kind="post" data-id="${p.id}">🚩 إبلاغ</button>`}</div>` : ''}</div>` : '';
  const busy = CM.busy.has('l' + p.id);
  return `<article class="card cm-post" data-pid="${p.id}">
    <header class="cm-head">${faceOf(p.author)}<div class="cm-who">${userLink(p.author)}<a class="cm-time" href="#/post/${p.id}"><time datetime="${new Date(p.at).toISOString()}">${esc(ago(p.at))}</time>${p.edited ? ' · معدّل' : ''}</a></div>${menu}</header>
    ${body}${img}
    <footer class="cm-acts">
      <button type="button" class="cm-like ${p.liked ? 'on' : ''}" data-act="cm-like" data-id="${p.id}" aria-pressed="${p.liked}" aria-label="${p.liked ? 'إلغاء الإعجاب' : 'إعجاب'} (${nf(p.likes)})" ${busy ? 'aria-disabled="true"' : ''}><svg aria-hidden="true"><use href="#i-heart"/></svg><b>${nf(p.likes)}</b></button>
      ${full ? `<span class="cm-cc"><svg aria-hidden="true"><use href="#i-chat"/></svg><b>${nf(p.comments)}</b> تعليق</span>` : `<a class="cm-cc" href="#/post/${p.id}" aria-label="التعليقات (${nf(p.comments)})"><svg aria-hidden="true"><use href="#i-chat"/></svg><b>${nf(p.comments)}</b></a>`}
    </footer>
  </article>`;
}

function composerHTML(signed) {
  if (!signed) return `<section class="card cm-compose guest"><p>تبي تنشر وتعلّق وتتابع؟ اكتب اسمك أول.</p><a class="btn" href="#/account">تسجيل الدخول</a></section>`;
  const D = CM.draft;
  return `<form class="card cm-compose" data-form="cm-post">
    <label class="sr" for="cmText">اكتب منشور</label>
    <textarea id="cmText" name="text" maxlength="${LIMITS.post}" rows="3" placeholder="وش في بالك؟ شارك جمعتك…" ${D.busy ? 'disabled' : ''}>${esc(D.text)}</textarea>
    ${D.url ? `<div class="cm-prev"><img src="${esc(D.url)}" alt="الصورة المختارة"><button type="button" class="cm-x" data-act="cm-img-x" aria-label="إزالة الصورة">✕</button></div>` : ''}
    <div class="cm-row"><label class="btn ghost sm cm-pick">🖼️ صورة<input type="file" accept="image/jpeg,image/png,image/webp" data-cm-file hidden ${D.busy ? 'disabled' : ''}></label><small class="cm-count" id="cmCount">${nf(D.text.length)}/${nf(LIMITS.post)}</small><button class="btn sm" type="submit" ${D.busy ? 'disabled aria-busy="true"' : ''}>${D.busy ? 'جاري النشر…' : 'انشر'}</button></div>
  </form>`;
}

function listHTML(list, more, loading, err, act, signed, emptyMsg) {
  if (err && !list.length) return `<div class="card empty-state"><p>${esc(err)}</p><button class="btn" type="button" data-act="${act}" data-retry="1">إعادة المحاولة</button></div>`;
  if (!list.length) return loading ? skeleton(2) : `<div class="card empty-state cm-empty"><p>${emptyMsg}</p></div>`;
  return list.map((p) => postCard(p, { signed })).join('') + (more ? `<button class="btn ghost block cm-more-btn" type="button" data-act="${act}" ${loading ? 'disabled aria-busy="true"' : ''}>${loading ? 'جاري التحميل…' : 'عرض المزيد'}</button>` : '') + (err ? `<p class="cm-err" role="alert">${esc(err)}</p>` : '');
}
export const skeleton = (n) => Array.from({ length: n }, () => '<div class="card cm-skel" aria-hidden="true"><i></i><i></i><i></i></div>').join('') + '<p class="sr" role="status">جاري التحميل…</p>';

export function communityHTML(signed) {
  const F = CM.feed;
  const tab = (id, label) => `<button type="button" class="chip-btn ${F.scope === id ? 'on' : ''}" data-act="cm-scope" data-s="${id}" aria-pressed="${F.scope === id}">${label}</button>`;
  return `<div class="stack cm-page">
    <header class="cm-top"><h1 class="section-title">المجتمع</h1>${signed ? `<a class="btn ghost sm" href="#/u/${esc(CM.me ?? '')}" ${CM.me ? '' : 'hidden'}>صفحتي</a>` : ''}</header>
    <p class="cm-note">شارك لحظات اللعب مع الكل. احترم غيرك؛ أي محتوى مسيء تقدر تبلّغ عنه وتراجعه الإدارة.</p>
    ${composerHTML(signed)}
    ${signed ? `<div class="chips" role="group" aria-label="عرض">${tab('all', 'الكل')}${tab('following', 'اللي أتابعهم')}</div>` : ''}
    <div class="cm-list" id="cmList">${listHTML(F.list, F.more, F.loading, F.err, 'cm-more', signed, F.scope === 'following' ? 'ما فيه منشورات من اللي تتابعهم بعد. تابع لاعبين من صفحاتهم.' : 'ما فيه منشورات بعد. كن أول من ينشر! ✨')}</div>
  </div>${reportSheet()}`;
}

function commentHTML(c, signed, replies) {
  const menuOpen = CM.menu === 'c' + c.id;
  const menu = signed && (c.canDelete || !c.mine) ? `<div class="cm-more"><button type="button" class="cm-dots" data-act="cm-menu" data-k="c${c.id}" aria-label="خيارات التعليق" aria-expanded="${menuOpen}">⋯</button>${menuOpen ? `<div class="cm-pop" role="menu">${c.canDelete ? `<button type="button" role="menuitem" class="danger" data-act="cm-cdel" data-id="${c.id}">🗑️ حذف</button>` : ''}${!c.mine ? `<button type="button" role="menuitem" data-act="cm-report" data-kind="comment" data-id="${c.id}">🚩 إبلاغ</button>` : ''}</div>` : ''}</div>` : '';
  return `<li class="cm-c" id="c${c.id}">${faceOf(c.author, 34)}<div class="cm-cb"><div class="cm-ch">${userLink(c.author)}<small>${esc(ago(c.at))}</small>${menu}</div><p class="cm-text">${esc(c.text)}</p>${signed && c.parent === null ? `<button type="button" class="cm-reply" data-act="cm-reply" data-id="${c.id}" data-name="${esc(c.author.name)}">رد</button>` : ''}${replies}</div></li>`;
}

export function postPageHTML(signed) {
  const P = CM.post;
  if (P.loading && !P.data) return `<div class="stack cm-page">${skeleton(1)}</div>`;
  if (!P.data) return `<div class="card empty-state"><p>${esc(P.err || 'المنشور غير موجود.')}</p><a class="btn" href="#/community">المجتمع</a></div>`;
  const { post, comments } = P.data;
  const tops = comments.filter((c) => c.parent === null);
  const tree = tops.map((c) => { const reps = comments.filter((r) => r.parent === c.id); return commentHTML(c, signed, reps.length ? `<ul class="cm-reps">${reps.map((r) => commentHTML(r, signed, '')).join('')}</ul>` : ''); }).join('');
  const replyTo = P.reply ? comments.find((c) => c.id === P.reply) : null;
  const form = signed
    ? `<form class="card cm-cform" data-form="cm-comment" data-id="${post.id}">${replyTo ? `<p class="cm-replying">رد على ${esc(replyTo.author.name)} <button type="button" class="cm-x sm" data-act="cm-reply-x" aria-label="إلغاء الرد">✕</button></p>` : ''}<label class="sr" for="cmC">اكتب تعليق</label><textarea id="cmC" name="text" maxlength="${LIMITS.comment}" rows="2" placeholder="${replyTo ? 'اكتب ردك…' : 'اكتب تعليق…'}"></textarea><div class="cm-row"><button class="btn sm" type="submit">${replyTo ? 'رد' : 'علّق'}</button></div></form>`
    : `<section class="card cm-compose guest"><p>سجّل دخولك عشان تعلّق وتعجب.</p><a class="btn sm" href="#/account">تسجيل الدخول</a></section>`;
  return `<div class="stack cm-page">${postCard(post, { full: true, signed })}
    <section class="card cm-comments" aria-label="التعليقات"><h2>التعليقات <small>${nf(comments.length)}</small></h2>${tree ? `<ul class="cm-cl">${tree}</ul>` : '<p class="muted">ما فيه تعليقات بعد.</p>'}</section>
    ${form}</div>${reportSheet()}`;
}

export function userPageHTML(signed, gameName) {
  const U = CM.user;
  if (U.loading && !U.data) return `<div class="stack cm-page">${skeleton(1)}</div>`;
  if (!U.data) return `<div class="card empty-state"><p>${esc(U.err || 'الحساب غير موجود.')}</p><a class="btn" href="#/community">المجتمع</a></div>`;
  const { user: u, posts, more } = U.data;
  const st = u.stats;
  const facts = [...(u.adminId ? [`<span class="aid68 sm"><b>${esc(u.adminId)}</b><span class="aid68-tag">ADMIN</span><i class="aid68-v" title="موثّق من الإدارة"><svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="aidg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#ffd34d"/><stop offset="1" stop-color="#b8861c"/></linearGradient></defs><circle cx="12" cy="12" r="10.6" fill="#111114" stroke="url(#aidg)" stroke-width="2"/><path d="M7.4 12.2l3 3 6.2-6.4" fill="none" stroke="url(#aidg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></i></span>`] : []), ...(u.phone ? ['📱 موثّق'] : []), ...(u.gender === 'male' ? ['♂️ ذكر'] : u.gender === 'female' ? ['♀️ أنثى'] : []), ...(u.gifts ? [`🎁 ${nf(u.gifts.recv)} هدية وصلته`] : []), ...(st ? [st.level != null ? `المستوى ${nf(st.level)}` : '', `${nf(st.played)} مباراة`, `${nf(st.wins)} فوز`, st.fav ? `لعبته المفضلة: ${esc(gameName(st.fav))}` : ''] : [])].filter(Boolean);
  const followBtn = signed && !u.me && u.noFollow && !u.followed ? '<span class="pill-btn" aria-disabled="true">🔒 المتابعة مقفلة</span>' : signed && !u.me ? `<button type="button" class="btn ${u.followed ? 'ghost' : ''}" data-act="cm-follow" data-pub="${esc(u.pub)}" data-on="${u.followed ? 0 : 1}" ${CM.busy.has('f' + u.pub) ? 'disabled aria-busy="true"' : ''}>${u.followed ? 'تتابعه ✓' : 'متابعة'}</button>` : '';
  // الكتم والحظر (التطبيق كله بالخادم)
  const relBtns = signed && !u.me ? `<div class="cm-rel">${u.blocked ? '' : `<button type="button" class="pill-btn" data-act="cm-rel" data-k="mute" data-pub="${esc(u.pub)}" data-on="${u.muted ? 0 : 1}">${u.muted ? '👁 إظهار منشوراته' : '🙈 إخفاء منشوراته'}</button>`}<button type="button" class="pill-btn ${u.blocked ? '' : 'danger'}" data-act="cm-rel" data-k="block" data-pub="${esc(u.pub)}" data-on="${u.blocked ? 0 : 1}">${u.blocked ? '✅ فك الحظر' : '⛔ حظر'}</button></div>` : '';
  return `<div class="stack cm-page">
    <section class="card cm-prof${u.anim ? ` pa68 t${u.anim}` : ''}">${u.anim ? '<span class="pa68-fx" aria-hidden="true"><b></b><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>' : ''}${u.bg && typeof u.bg.id === 'string' ? `<div class="cm67-bg" aria-hidden="true" data-id="${esc(u.bg.id)}" data-css="${esc(u.bg.css || '')}" data-art="${esc(u.bg.art || '')}" data-full="${u.bg.full ? 1 : 0}"></div>` : ''}${faceOf(u, 84)}<div class="cm-pi"><h1>${esc(u.name)}${u.official ? officialBadge(22) : ''}${u.me ? ' <small>(أنت)</small>' : ''}</h1>
      <p class="cm-facts">${facts.map((f) => `<span>${f}</span>`).join('')}</p>
      ${U.data.relations?.couple && PUB_RE.test(U.data.relations.couple.partnerPub) && !u.blocked ? `<p class="cm-facts" data-public-couple-r47><a href="#/u/${esc(U.data.relations.couple.partnerPub)}">ارتباط افتراضي · ملف الشريك</a></p>` : ''}
      <p class="cm-fol"><a href="#/u/${esc(u.pub)}/followers"><b>${nf(u.followers)}</b> متابِع</a><a href="#/u/${esc(u.pub)}/following"><b>${nf(u.following)}</b> يتابع</a><span><b>${nf(u.posts)}</b> منشور</span></p></div>${u.blocked ? '' : followBtn}${relBtns}</section>
    ${u.blocked ? '<section class="card empty-state"><p>حظرت هذا الحساب: ما تشوف منشوراته وما يقدر يتفاعل معك ولا يفتح ملفك.</p></section>' : U.list ? followListHTML(U.list) : `<h2 class="section-title sm">المنشورات</h2>${u.postsHidden ? '<section class="card empty-state"><p>🙈 صاحب الحساب مخفي منشوراته.</p></section>' : listHTML(posts, more, U.loading, U.err, 'cm-umore', signed, u.me ? 'ما نشرت شي بعد.' : 'ما نشر شي بعد.')}`}
  </div>${reportSheet()}`;
}
function followListHTML(L) {
  if (L.loading) return skeleton(1);
  if (L.err) return `<p class="cm-err">${esc(L.err)}</p>`;
  return `<section class="card"><h2>${L.which === 'followers' ? 'المتابِعون' : 'يتابع'}</h2>${L.list.length ? `<ul class="cm-ul">${L.list.map((u) => `<li>${faceOf(u, 36)}${userLink(u)}</li>`).join('')}</ul>` : '<p class="muted">القائمة فاضية.</p>'}</section>`;
}
export async function loadFollowList(pub, which) {
  const U = CM.user, generation = ++listGeneration, route = routeKey();
  if (!PUB_RE.test(pub) || !['followers', 'following'].includes(which)) { U.list = { which, loading: false, err: 'الرابط غير صالح.', list: [] }; return; }
  if (U.pub !== pub) { ++userGeneration; U.pub = pub; U.data = null; U.loading = false; }
  const selected = U.list = { which, loading: true, err: '', list: [] };
  const r = await api(`user/${pub}/${which}`);
  if (generation !== listGeneration || U.pub !== pub || U.list !== selected) return;
  if (route !== routeKey()) { selected.loading = false; return; }
  U.list = r.ok ? { which, loading: false, err: r.hidden ? 'صاحب الحساب مخفي قوائمه.' : '', list: r.list } : { which, loading: false, err: r.error, list: [] };
}

const NTXT = { like: 'أعجبه منشورك', comment: 'علّق على منشورك', reply: 'رد على تعليقك', follow: 'صار يتابعك' };
export function notifsHTML() {
  const N = CM.notifs;
  if (N.loading && !N.data) return `<div class="stack">${skeleton(2)}</div>`;
  if (!N.data) return `<div class="card empty-state"><p>${esc(N.err || 'تعذّر تحميل الإشعارات.')}</p><button class="btn" type="button" data-act="cm-notifs">إعادة المحاولة</button></div>`;
  const list = N.data.list;
  return `<div class="stack cm-page"><header class="cm-top"><h1 class="section-title">الإشعارات</h1>${N.data.unread ? '<button type="button" class="btn ghost sm" data-act="cm-readall">تعليم الكل كمقروء</button>' : ''}</header>
    ${N.err ? `<div class="card cm-err" role="alert"><p>${esc(N.err)} المعروض آخر نسخة وصلتنا، ويمكن يكون قديم.</p><button class="btn ghost sm" type="button" data-act="cm-notifs">إعادة المحاولة</button></div>` : ''}
    ${list.length ? `<ul class="card cm-nl">${list.map((n) => `<li class="${n.read ? '' : 'new'}"><a href="${n.kind === 'follow' ? '#/u/' + esc(n.from.pub) : '#/post/' + n.post}" data-act="cm-nread" data-id="${n.id}">${faceOf(n.from, 38)}<span><b>${esc(n.from.name)}</b> ${NTXT[n.kind] ?? ''}<small>${esc(ago(n.at))}</small></span>${n.read ? '' : '<i class="dot" aria-label="جديد"></i>'}</a></li>`).join('')}</ul>` : '<div class="card empty-state"><p>ما فيه إشعارات بعد. لما أحد يعجبه منشورك أو يعلّق أو يتابعك بيظهر هنا.</p></div>'}
  </div>`;
}

const REASONS = [['spam', 'إزعاج أو إعلانات'], ['abuse', 'إساءة أو تنمّر'], ['inappropriate', 'محتوى غير لائق'], ['privacy', 'نشر معلومات خاصة'], ['other', 'سبب ثاني']];
function reportSheet() {
  const R = CM.report; if (!R) return '';
  return `<div class="modal-back cm-sheet-back" data-act="cm-report-x"></div><form class="cm-sheet" role="dialog" aria-label="إبلاغ" data-form="cm-report"><h2>🚩 إبلاغ عن ${R.kind === 'post' ? 'منشور' : 'تعليق'}</h2>
    <fieldset><legend>السبب</legend>${REASONS.map(([k, t], i) => `<label class="cm-rr"><input type="radio" name="reason" value="${k}" ${i === 0 ? 'checked' : ''}> ${t}</label>`).join('')}</fieldset>
    <label for="cmRn">تفاصيل (اختياري)</label><textarea id="cmRn" name="note" maxlength="300" rows="2"></textarea>
    <p class="muted">البلاغ يوصل للإدارة وتراجعه. ما يعرف صاحب المحتوى مين بلّغ.</p>
    <div class="cm-row"><button class="btn" type="submit" ${R.busy ? 'disabled aria-busy="true"' : ''}>${R.busy ? 'جاري الإرسال…' : 'إرسال البلاغ'}</button><button class="btn ghost" type="button" data-act="cm-report-x">إلغاء</button></div></form>`;
}

/* ---------- الصور: تصغير بالمتصفح قبل الرفع (الخادم يتحقق مرة ثانية) ---------- */
export async function prepareImage(file) {
  if (!file) return { error: 'ما اخترت صورة.' };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { error: 'المسموح صور JPG وPNG وWebP فقط.' };
  if (file.size > 15 * 1024 * 1024) return { error: 'الصورة كبيرة جداً (أكثر من 15 ميجا).' };
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { return { error: 'تعذّر قراءة الصورة.' }; }
  const max = 1280, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * k)); cv.height = Math.max(1, Math.round(bmp.height * k));
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); bmp.close?.();
  for (const q of [0.85, 0.72, 0.6, 0.48]) {
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size <= LIMITS.image) return { blob };
  }
  return { error: 'ما قدرنا نصغّر الصورة للحجم المسموح.' };
}

/* قائمة المحظورين والمكتومين (صفحة الإعدادات) */
export const REL = { data: null, loading: false, err: '' };
let relationsGeneration = 0;
export async function loadRelations() { const generation = ++relationsGeneration; REL.loading = true; REL.err = ''; const r = await api('relations'); if (generation !== relationsGeneration) return; REL.loading = false; if (r.ok) { REL.data = r; REL.err = ''; } else REL.err = r.error; }
export function relationsHTML() {
  if (!REL.data) return `<p class="muted" style="text-align:start">${REL.loading ? 'جاري التحميل…' : esc(REL.err || '')}</p>`;
  const row = (u, k) => `<li>${faceOf(u, 32)}${userLink(u)}<button type="button" class="pill-btn" data-act="cm-rel" data-k="${k}" data-pub="${esc(u.pub)}" data-on="0" data-from="settings">${k === 'block' ? 'فك الحظر' : 'فك الكتم'}</button></li>`;
  const { blocked, muted } = REL.data;
  return `${REL.err ? `<p class="cm-err" role="alert">${esc(REL.err)} المعروض آخر نسخة وصلتنا، ويمكن يكون قديم. جرّب تفتح الإعدادات مرة ثانية للتحديث.</p>` : ''}<h3 class="cm-relh">⛔ المحظورين (${nf(blocked.length)})</h3>${blocked.length ? `<ul class="cm-ul">${blocked.map((u) => row(u, 'block')).join('')}</ul>` : '<p class="muted" style="text-align:start">ما حظرت أحد.</p>'}
    <h3 class="cm-relh">🔇 المكتومين (${nf(muted.length)})</h3>${muted.length ? `<ul class="cm-ul">${muted.map((u) => row(u, 'mute')).join('')}</ul>` : '<p class="muted" style="text-align:start">ما كتمت أحد.</p>'}`;
}
