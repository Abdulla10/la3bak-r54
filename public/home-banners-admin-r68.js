// R68c: لوحة التحكم — بنرات الصفحة الرئيسية (المالك فقط)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LINKS = [['#/tournaments', 'البطولات'], ['#/events', 'الفعاليات'], ['#/wheel', 'عجلة الحظ'], ['#/shop', 'المتجر'], ['#/shop/packs', 'باقات الشحن'], ['#/games', 'الألعاب'], ['#/social-rooms', 'الغرف'], ['#/missions', 'المهام اليومية'], ['#/leaderboard', 'التصنيف'], ['#/auction', 'المزادات'], ['#/vip', 'VIP'], ['#/community', 'المنشورات']];
/** يصغّر الصورة بالجهاز قبل الرفع (عرض 1200 كحد أقصى) */
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, 1200 / img.naturalWidth, 700 / img.naturalHeight);
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.86).startsWith('data:image/webp') ? c.toDataURL('image/webp', 0.86) : c.toDataURL('image/jpeg', 0.86);
  } finally { URL.revokeObjectURL(url); }
}
export function mountHomeBannersAdmin(root, { call }) {
  if (!document.querySelector('style[data-hb68]')) { const st = document.createElement('style'); st.dataset.hb68 = '1'; st.textContent = '.hb68-item{display:grid;grid-template-columns:96px 1fr;gap:10px;align-items:center;padding:10px;border-radius:12px;border:1px solid #ffffff22;margin-top:10px}.hb68-item img{width:96px;height:60px;object-fit:cover;border-radius:8px;background:#2a1350}.hb68-item b{display:block}.hb68-item small{opacity:.75;display:block}.hb68-acts{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px}.hb68-off{opacity:.55}.hb68-prev{max-width:100%;max-height:140px;border-radius:10px;margin:6px 0;display:block}.hb68-grid{display:grid;gap:8px}.hb68-tog{display:flex;align-items:center;gap:8px}'; document.head.append(st); }
  const S = { list: null, edit: null, img: '', err: '', msg: '', busy: false };
  const load = async () => { try { S.list = (await call('home-banners')).list; } catch (e) { S.err = e.message; } paint(); };
  const form = () => {
    const b = S.edit || {}; const img = S.img || b.img || '';
    return `<section class="ad-card"><h2>${b.id ? '✏️ تعديل بنر' : '➕ بنر جديد'}</h2><form data-hb="save" class="ad-form col hb68-grid">
      <label>العنوان (مثل: بطولة لعبك الكبرى)<input class="ad-in" name="title" maxlength="40" required value="${esc(b.title || '')}"></label>
      <label>الكلمة اللي تطلع ذهبي (لازم تكون من العنوان، مثل: بطولة)<input class="ad-in" name="gold" maxlength="20" value="${esc(b.gold || '')}"></label>
      <label>الوصف تحت العنوان<input class="ad-in" name="text" maxlength="80" value="${esc(b.text || '')}"></label>
      <label>كلام الزر (مثل: شارك الآن)<input class="ad-in" name="cta" maxlength="18" value="${esc(b.cta || 'شارك الآن')}"></label>
      <label>الزر يفتح<select class="ad-in" name="hrefSel">${LINKS.map(([v, l]) => `<option value="${v}" ${b.href === v ? 'selected' : ''}>${l}</option>`).join('')}<option value="custom" ${b.href && !LINKS.some(([v]) => v === b.href) ? 'selected' : ''}>رابط ثاني…</option></select></label>
      <input class="ad-in" name="href" placeholder="#/صفحة أو https://…" value="${esc(b.href && !LINKS.some(([v]) => v === b.href) ? b.href : '')}">
      <label>الصورة${img ? `<img class="hb68-prev" src="${esc(img)}" alt="">` : ''}<input class="ad-in" type="file" name="file" accept="image/png,image/jpeg,image/webp"></label>
      <label class="hb68-tog"><input type="checkbox" name="full" ${b.full ? 'checked' : ''}> الصورة تغطي البنر كامل (بدال ما تكون على اليسار)</label>
      <label class="hb68-tog"><input type="checkbox" name="active" ${b.active !== false ? 'checked' : ''}> يطلع بالرئيسية</label>
      <div class="hb68-acts"><button class="ad-btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'جاري الحفظ…' : 'حفظ البنر'}</button>${b.id || S.img ? '<button class="ad-btn ghost" type="button" data-hb="new">إلغاء</button>' : ''}</div></form></section>`;
  };
  function paint() {
    if (!root.isConnected) return;
    if (!S.list) { root.innerHTML = S.err ? `<div class="ad-note bad">${esc(S.err)}</div>` : '<p class="ad-muted">جاري التحميل…</p>'; return; }
    root.innerHTML = `${S.err ? `<div class="ad-note bad" role="alert">${esc(S.err)}</div>` : ''}${S.msg ? `<div class="ad-note ok">${esc(S.msg)}</div>` : ''}
      <section class="ad-card"><h2>🖼️ بنرات الصفحة الرئيسية (${S.list.length}/8)</h2><p class="ad-muted">البنرات تتبدل لحالها كل 5 ثواني بالرئيسية. الترتيب هنا = ترتيبها هناك.</p>
      ${S.list.length ? S.list.map((b, i) => `<div class="hb68-item${b.active ? '' : ' hb68-off'}">${b.img ? `<img src="${esc(b.img)}" alt="">` : '<img alt="">'}<div><b>${esc(b.title)}</b><small>${esc(b.text)}</small><small>${b.active ? '✅ ظاهر' : '⏸️ مخفي'} · الزر: ${esc(b.cta)} ← ${esc(b.href)}</small></div><div class="hb68-acts"><button class="ad-btn" type="button" data-hb="edit" data-id="${esc(b.id)}">تعديل</button><button class="ad-btn ghost" type="button" data-hb="toggle" data-id="${esc(b.id)}">${b.active ? 'إخفاء' : 'إظهار'}</button>${i ? `<button class="ad-btn ghost" type="button" data-hb="up" data-id="${esc(b.id)}">⬆️</button>` : ''}${i < S.list.length - 1 ? `<button class="ad-btn ghost" type="button" data-hb="down" data-id="${esc(b.id)}">⬇️</button>` : ''}<button class="ad-btn danger" type="button" data-hb="del" data-id="${esc(b.id)}">حذف</button></div></div>`).join('') : '<p class="ad-muted">ما في بنرات. الرئيسية بتعرض بنر البطولة الافتراضي.</p>'}</section>${form()}`;
  }
  const run = async (fn, ok) => { if (S.busy) return; S.busy = true; S.err = ''; S.msg = ''; paint(); try { await fn(); S.msg = ok; } catch (e) { S.err = e.message; } finally { S.busy = false; paint(); } };
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-hb]'); if (!t || t.tagName === 'FORM') return; const a = t.dataset.hb, id = t.dataset.id;
    const b = S.list?.find((x) => x.id === id);
    if (a === 'edit') { S.edit = b; S.img = ''; S.msg = ''; paint(); root.querySelector('[data-hb="save"]')?.scrollIntoView({ behavior: 'smooth' }); }
    if (a === 'new') { S.edit = null; S.img = ''; paint(); }
    if (a === 'toggle' && b) run(async () => { S.list = (await call('home-banners/save', { method: 'POST', body: { ...b, active: !b.active } })).list; }, b.active ? 'انخفى البنر.' : 'صار البنر ظاهر.');
    if ((a === 'up' || a === 'down') && b) run(async () => { S.list = (await call('home-banners/move', { method: 'POST', body: { id, dir: a === 'up' ? -1 : 1 } })).list; }, 'انحفظ الترتيب.');
    if (a === 'del' && b && confirm(`حذف «${b.title}»؟`)) run(async () => { S.list = (await call('home-banners/remove', { method: 'POST', body: { id } })).list; if (S.edit?.id === id) S.edit = null; }, 'انحذف البنر.');
  });
  root.addEventListener('change', async (e) => {
    if (e.target.name === 'file' && e.target.files?.[0]) {
      const f = e.target.files[0];
      await run(async () => { const data = await shrink(f); const r = await call('home-banners/image', { method: 'POST', body: { data } }); S.img = r.url; }, 'ارتفعت الصورة. اضغط «حفظ البنر».');
    }
  });
  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-hb="save"]'); if (!f) return; e.preventDefault();
    const v = (n) => f.elements[n]?.value ?? '';
    const sel = v('hrefSel'), href = sel === 'custom' ? v('href').trim() : sel;
    run(async () => { const r = await call('home-banners/save', { method: 'POST', body: { id: S.edit?.id || '', title: v('title'), gold: v('gold'), text: v('text'), cta: v('cta'), href, img: S.img || S.edit?.img || '/assets/art68/banner-trophy.webp', full: f.elements.full.checked, active: f.elements.active.checked } }); S.list = r.list; S.edit = null; S.img = ''; }, 'انحفظ البنر وصار بالرئيسية.');
  });
  load();
}
