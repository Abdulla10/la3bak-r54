/* الصورة الشخصية: اختيار من الجهاز، تصغير وإعادة ترميز في المتصفح، معاينة، ثم رفع للخادم (/api/avatar) المربوط بالحساب */
export const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SRC_MAX = 12 * 1024 * 1024; // حجم الملف الأصلي المقبول للاختيار
export const SIDE = 256; // مقاس الصورة المحفوظة
const AV = { input: null, modal: null, blob: null, onDone: null };

const msg = (t, err) => window.dispatchEvent(new CustomEvent('qa-toast', { detail: t, ...(err ? { cancelable: false } : {}) }));
const ask = (t, isErr) => (AV.toast ? AV.toast(t, isErr) : msg(t, isErr));
export function init({ toast, onDone }) { AV.toast = toast; AV.onDone = onDone; }

export function pick() {
  if (!AV.input) {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = OK_TYPES.join(','); i.hidden = true; i.setAttribute('aria-hidden', 'true');
    i.addEventListener('change', () => { const f = i.files?.[0]; i.value = ''; if (f) fromFile(f); });
    document.body.appendChild(i);
    AV.input = i;
  }
  AV.input.click();
}

/** نتأكد من النوع والحجم قبل أي معالجة */
export function check(file) {
  if (!file) return 'ما اخترت ملف.';
  if (!OK_TYPES.includes(file.type)) return 'نوع الملف غير مدعوم. اختر صورة JPG أو PNG أو WebP.';
  if (file.size > SRC_MAX) return 'الصورة كبيرة جداً (الحد 12 ميغابايت). اختر صورة أصغر.';
  if (file.size < 100) return 'الملف فاضي أو تالف.';
  return '';
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* نجرّب الطريقة الثانية */ }
  }
  const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  return await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
}

const toBlob = (cv, type, q) => new Promise((r) => cv.toBlob(r, type, q));

async function fromFile(file) {
  const bad = check(file);
  if (bad) return ask(bad, true);
  openModal('<p class="av-wait" role="status">جاري تجهيز الصورة…</p>');
  try {
    const img = await decode(file);
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    if (!w || !h) throw new Error('empty');
    const s = Math.min(w, h), cv = document.createElement('canvas');
    cv.width = cv.height = SIDE;
    const g = cv.getContext('2d');
    g.fillStyle = '#1b1240'; g.fillRect(0, 0, SIDE, SIDE);
    g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, SIDE, SIDE); // قص مربع من الوسط
    img.close?.();
    let blob = await toBlob(cv, 'image/webp', 0.85);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(cv, 'image/jpeg', 0.88);
    if (!blob) throw new Error('encode');
    AV.blob = blob;
    openModal(`<h3 id="avT">معاينة صورتك</h3><img class="av-prev" alt="معاينة الصورة الشخصية" src="${cv.toDataURL(blob.type)}" width="160" height="160">
      <p class="note">تُقص الصورة مربعة من الوسط.</p>
      <div class="btn-row"><button class="btn" type="button" data-act="av-confirm">تأكيد وحفظ</button><button class="btn ghost" type="button" data-act="av-cancel">إلغاء</button></div>`);
  } catch {
    closeModal();
    ask('ما قدرنا نقرأ هالصورة. جرّب صورة ثانية.', true);
  }
}

export async function upload() {
  if (!AV.blob || AV.busy) return;
  AV.busy = true;
  const box = AV.modal?.querySelector('.modal');
  const btns = box?.querySelectorAll('button'); btns?.forEach((b) => (b.disabled = true));
  box?.insertAdjacentHTML('beforeend', '<p class="av-wait" role="status"><span class="av-spin" aria-hidden="true"></span> جاري رفع الصورة…</p>');
  try {
    const r = await fetch('/api/avatar', { method: 'POST', headers: { 'Content-Type': AV.blob.type }, body: AV.blob });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'فشل رفع الصورة.');
    closeModal(); ask('تم حفظ صورتك ✅'); AV.onDone?.();
  } catch (e) {
    AV.busy = false; btns?.forEach((b) => (b.disabled = false)); box?.querySelector('.av-wait')?.remove();
    ask(e.message === 'Failed to fetch' ? 'ما قدرنا نوصل للخادم. تأكد من الاتصال وحاول مرة ثانية.' : e.message, true);
    return;
  }
  AV.busy = false;
}

export function askDelete() {
  openModal(`<h3 id="avT">حذف الصورة؟</h3><p class="note">تنحذف صورتك من الخادم وترجع الصورة الافتراضية.</p>
    <div class="btn-row"><button class="btn danger" type="button" data-act="av-del-yes">حذف</button><button class="btn ghost" type="button" data-act="av-cancel">إلغاء</button></div>`);
}
export async function remove() {
  try {
    const r = await fetch('/api/avatar', { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'فشل الحذف.');
    closeModal(); ask('انحذفت الصورة ورجعت الصورة الافتراضية.'); AV.onDone?.();
  } catch (e) { closeModal(); ask(e.message === 'Failed to fetch' ? 'ما قدرنا نوصل للخادم.' : e.message, true); }
}

function openModal(inner) {
  const wasOpen = !!AV.modal;
  if (!wasOpen) {
    AV.modal = document.createElement('div');
    AV.modal.className = 'modal-back';
    AV.modal.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="avT"></div>';
    document.body.appendChild(AV.modal);
  }
  AV.modal.querySelector('.modal').innerHTML = inner;
  AV.modal.querySelector('button')?.focus();
}
export function closeModal() { AV.modal?.remove(); AV.modal = null; AV.blob = null; AV.busy = false; }
