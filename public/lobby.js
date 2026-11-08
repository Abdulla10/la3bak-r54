/* الصالة الموحدة: جكارو وبلوت ولودو بحساب واحد. كل رقم هنا جاي من الخادم (/api/account و/api/rankings)، ولا يوجد رقم ثابت أو تقريبي. */
import { HUBS } from './hub.js?v=shell-r6';
import { mini } from './avatars.js?v=r58r';
import { frameArt, isFrame2 } from './cosmetics.js?v=r58r';
import { referenceImage, ACHIEVEMENT_ART, ACHIEVEMENT_ART_KIDS } from './reference-assets.js?v=r58r';

export const L = { me: null, rk: {}, tab: 'all', err: '', loading: false, loaded: false };
export const GAME_IDS = ['jackaro', 'baloot', 'ludo'];
const NAMES = { all: 'الكل', jackaro: 'جكارو', baloot: 'بلوت', ludo: 'لودو' };
const THEME = {
  jackaro: { g1: '#ff8a3d', g2: '#c2410c', desc: 'ورق وكرات: وصّل كراتك للنهاية قبل خصومك.', modes: ['2 إلى 4 لاعبين', 'فريقين في 4 لاعبين'] },
  baloot: { g1: '#2fbf8f', g2: '#0b6b4f', desc: 'بلوت خليجي: فريقين، صن وحكم، وأول فريق يوصل 152.', modes: ['4 لاعبين (فريقين)'] },
  ludo: { g1: '#a855f7', g2: '#5b21b6', desc: 'ارمِ الزهر ووصّل قطعك الأربع للنهاية.', modes: ['2 إلى 4 لاعبين', 'كلاسيكي (بقواعد كاملة)'] },
};
const KINDS = { start: 'رصيد البداية', daily: 'مكافأة يومية', entry_fee: 'رسم دخول', prize: 'جائزة', refund: 'استرجاع رسم', gift: 'هدية' };

/** ملف اللاعب فقط (للصفحات الثانية مثل «ملفي»). يرجّع {me, err} */
export async function loadMe() {
  try {
    const r = await fetch('/api/account', { cache: 'no-store' });
    if (!r.ok) throw new Error('bad');
    L.me = await r.json();
    return { me: L.me, err: '' };
  } catch { return { me: null, err: 'ما قدرنا نحمّل بياناتك من الخادم. تأكد من الاتصال.' }; }
}

export async function load() {
  L.loading = true; L.err = '';
  try {
    const [me, ...rks] = await Promise.all([
      fetch('/api/account', { cache: 'no-store' }),
      ...['all', ...GAME_IDS].map((g) => fetch('/api/rankings?game=' + g, { cache: 'no-store' })),
    ]);
    if (!me.ok) throw new Error('me');
    L.me = await me.json();
    for (const [i, g] of ['all', ...GAME_IDS].entries()) if (rks[i].ok) L.rk[g] = await rks[i].json();
    L.loaded = true;
  } catch { L.err = 'ما قدرنا نحمّل بياناتك من الخادم. تأكد من الاتصال وحاول مرة ثانية.'; }
  L.loading = false;
}

// روابط للمظهر المجهّز من الخادم؛ لا قراءة localStorage أو استنتاج رتب.
function equippedArt(o, item, cls) {
  if (!item) return '';
  const mapped = ACHIEVEMENT_ART[item.id] || ACHIEVEMENT_ART_KIDS[item.id];
  const existing = referenceImage(item.id, cls) || (mapped ? referenceImage(mapped, cls) : '');
  if (existing) return existing;
  if (typeof item.art === 'string' && /^\/assets\/[A-Za-z0-9_/-]+\.(?:webp|png|svg|jpg|jpeg)$/.test(item.art)) {
    return `<img src="${o.esc(item.art)}" alt="${o.esc(item.name)}" class="${cls}" loading="lazy" decoding="async">`;
  }
  return '';
}

function statusBar(o, me) {
  const span = Math.max(1, me.xpNext - me.xpFloor), pct = Math.min(100, Math.round(((me.xp - me.xpFloor) / span) * 100));
  const eq = me.equipped ?? {}, frame = eq.frame, bg = eq.bg;
  const css = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]+$/.test(v) ? v : '';
  const fr = css(frame?.css), bgc = css(bg?.css), fr2 = fr && isFrame2(fr);
  const photo = mini(eq.avatar?.id, 56) || o.avatar;
  const avatar = frame && fr ? `<span class="pf-ring${fr2 ? ' cx-pring' : ' fr-' + fr}">${photo}${fr2 ? frameArt(fr) : ''}</span>` : photo;
  const badge = eq.badge ? `<span aria-label="${o.esc(eq.badge.name)}">${equippedArt(o, eq.badge, 'ref-equipped-badge') || o.esc(eq.badge.css || eq.badge.name)}</span> ` : '';
  const title = eq.title ? `<small class="cx-title">${equippedArt(o, eq.title, 'ref-equipped-title') || o.esc(eq.title.css || eq.title.name)}</small>` : '';
  const pg = me.progression;
  const ranks = [pg?.vip?.enabled && /^V(?:[1-9]|1[0-5])$/.test(pg.vip.value || '') ? pg.vip.value : '', pg?.noble?.enabled && /^N[1-9]$/.test(pg.noble.value || '') ? pg.noble.value : '']
    .filter(Boolean).map((v) => `<span class="lb-lvb">${o.esc(v)}</span>`).join('');
  return `<section class="lb-bar${bgc ? ' bg-' + bgc : ''}"${bg ? ' data-equipped-bg="' + o.esc(bg.id) + '"' : ''} aria-label="حسابك">
    <div class="lb-who"><span class="lb-av">${avatar}</span>
      <div><b class="lb-name">${badge}${o.esc(me.name)}${me.verified === true ? ' <span class="badge gold" aria-label="حساب موثّق">✓</span>' : ''}</b>${title}${ranks ? '<div class="lb-lv">' + ranks + '</div>' : ''}
        <div class="lb-lv" title="الخبرة تحدد المستوى فقط"><span class="lb-lvb">م${o.nf(me.level)}</span><span class="lb-xp"><i style="width:${pct}%"></i></span><small>${o.nf(me.xp - me.xpFloor)}/${o.nf(span)} خبرة</small></div></div></div>
    <div class="lb-chips">
      <div class="lb-chip" title="عملات للعب فقط: تُصرف على رسوم الدخول"><span aria-hidden="true">🪙</span><b>${o.nf(me.coins)}</b><small>عملات</small>${me.canClaim ? '<button class="lb-plus" type="button" data-act="wallet-daily" aria-label="استلم مكافأة اليوم">+</button>' : ''}</div>
      <div class="lb-chip" title="نقاط التصنيف: للترتيب فقط"><span aria-hidden="true">🏆</span><b>${o.nf(me.points)}</b><small>نقاط</small></div>
      <div class="lb-chip" title="ترتيبك العام"><span aria-hidden="true">🎖️</span><b>${me.rank ? '#' + o.nf(me.rank) : '—'}</b><small>الترتيب</small></div>
    </div></section>`;
}

function rankings(o, me) {
  const d = L.rk[L.tab];
  const tabs = Object.keys(NAMES).map((k) => `<button type="button" class="${L.tab === k ? 'on' : ''}" data-act="lobby-tab" data-v="${k}" aria-pressed="${L.tab === k}">${NAMES[k]}</button>`).join('');
  let body;
  if (!d) body = '<p class="muted">جاري التحميل…</p>';
  else if (!d.total) body = `<div class="lb-empty"><span aria-hidden="true">🏁</span><p>ما فيه ترتيب للحين.</p><small>يدخل الترتيب من يلعب لعبة منتهية مع لاعب حقيقي واحد على الأقل. اللعب ضد الكمبيوتر ما يحسب نقاط.</small></div>`;
  else {
    const row = (r) => `<li class="${r.me ? 'me' : ''}"><span class="lb-rk">${o.nf(r.rank)}</span>${mini(r.av, 26)}<b>${o.esc(r.name)}</b><small>${o.nf(r.wins)} فوز / ${o.nf(r.losses)} خسارة</small><em>${o.nf(r.points)}</em></li>`;
    const inTop = d.list.some((r) => r.me);
    body = `<ol class="lb-list">${d.list.slice(0, 5).map(row).join('')}${d.mine && !d.list.slice(0, 5).some((r) => r.me) ? `<li class="gap">…</li>${row(d.mine)}` : ''}</ol>${!d.mine && !inTop ? '<small class="muted">العب لعبة تصنيف عشان تدخل الترتيب.</small>' : ''}`;
  }
  return `<section class="lb-panel"><h2>🏆 الترتيب</h2><div class="lb-tabs" role="tablist">${tabs}</div>${body}
    <small class="lb-note">الترتيب بالنقاط ثم عدد الفوز. النقاط: ${o.nf(10)} لكل لعبة منتهية و${o.nf(20)} إضافية للفوز، من ألعاب فيها لاعبان حقيقيان فأكثر. بدون جوائز مربوطة بالترتيب حالياً.</small></section>`;
}

function card(o, me, id) {
  const h = HUBS[id], t = THEME[id], s = me.stats[id];
  const fee = (me.stakes || [0, 100, 500]).map((v) => (v ? `🪙 ${o.nf(v)}` : 'مجانية')).join(' · ');
  const stat = s.played
    ? `<span>لعبت ${o.nf(s.played)}</span><span>فوز ${o.nf(s.won)}</span><span>خسارة ${o.nf(s.losses)}</span><span>${s.rank ? 'ترتيبك #' + o.nf(s.rank) : 'بدون ترتيب'}</span>`
    : '<span>ما لعبت هذي اللعبة للحين</span>';
  return `<article class="lb-game" style="--g1:${t.g1};--g2:${t.g2}">
    <div class="lb-gtop"><span class="lb-gic" aria-hidden="true">${h.icon}</span><div><h3>${NAMES[id]}</h3><p>${t.desc}</p></div></div>
    <ul class="lb-facts">
      <li><small>رسم الدخول</small><b>${fee}</b></li>
      <li><small>الحد الأدنى للنقاط</small><b>لا يوجد</b></li>
      <li><small>الغرف</small><b>${t.modes.join(' · ')}</b></li>
    </ul>
    <div class="lb-stat">${stat}</div>
    <div class="lb-btns"><a class="lb-play" href="#/hub/${id}">ادخل وابدأ</a><a class="lb-make" href="#/game/${id}">أنشئ غرفة</a></div>
  </article>`;
}

function records(o, me) {
  const hist = me.history.length ? `<ul class="lb-rows">${me.history.slice(0, 5).map((h) => `<li><b class="${h.result === 'win' ? 'w' : 'l'}">${h.result === 'win' ? 'فوز' : 'خسارة'}</b><span>${o.esc(NAMES[h.game] ?? h.game)}${h.ranked ? '' : ' · ضد الكمبيوتر'}</span><small>+${o.nf(h.points)} نقطة · +${o.nf(h.xp)} خبرة${h.stake ? ' · رسم ' + o.nf(h.stake) : ''}${h.coins ? ' · جائزة ' + o.nf(h.coins) : ''}</small></li>`).join('')}</ul>` : '<p class="muted">ما فيه ألعاب منتهية للحين.</p>';
  const led = me.ledger.length ? `<ul class="lb-rows">${me.ledger.slice(0, 5).map((t) => `<li><b class="${t.delta >= 0 ? 'w' : 'l'}">${t.delta >= 0 ? '+' : ''}${o.nf(t.delta)}</b><span>${KINDS[t.kind] ?? t.kind}</span><small>الرصيد بعدها ${o.nf(t.balance)}</small></li>`).join('')}</ul>` : '<p class="muted">ما فيه حركات عملات للحين.</p>';
  return `<section class="lb-panel two"><div><h2>🕘 آخر ألعابي</h2>${hist}</div><div><h2>🪙 حركات العملات</h2>${led}</div></section>`;
}

export function lobbyHTML(o) {
  if (L.err) return `<div class="card empty-state"><p>${o.esc(L.err)}</p><button class="btn" type="button" data-act="lobby-reload">إعادة المحاولة</button></div>`;
  if (!L.me) return `<div class="card empty-state"><p>جاري تحميل حسابك…</p></div>`;
  const me = L.me;
  return `<div class="lobby">${statusBar(o, me)}${rankings(o, me)}<h2 class="lb-h">اختر لعبتك</h2><div class="lb-games">${GAME_IDS.map((id) => card(o, me, id)).join('')}</div>${records(o, me)}
    <p class="lb-foot">عملات اللعب افتراضية بدون قيمة مالية. الأرصدة والنقاط والخبرة محفوظة في الخادم ومربوطة بجلسة هذا الجهاز؛ مسح بيانات المتصفح يعني حساب جديد.</p></div>`;
}
