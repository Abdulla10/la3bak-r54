/* Room photo UI only. Existing /cover handler owns authorization, validation and storage. */
export const PHOTO_SOURCE_MAX = 12 * 1024 * 1024;
export const PHOTO_UPLOAD_MAX = 150 * 1024;
const TYPES = ['image/jpeg','image/png','image/webp'];
export function roomPhotoFields(photo = '') {
  const safe = typeof photo === 'string' && /^\/api\/social\/rooms\/[0-9a-f-]{36}\/cover\?v=[0-9a-f]{64}$/i.test(photo) ? photo : '';
  return `<div class="so-room-photo-r31" data-so-room-photo><div class="so-room-photo-preview"><img data-so-photo-preview ${safe ? `src="${safe}"` : 'hidden'} alt="معاينة صورة الغرفة"><span data-so-photo-placeholder${safe ? ' hidden' : ''} aria-hidden="true">صورة الغرفة</span></div><div class="so-room-photo-copy"><label class="so-room-photo-label">اختيار صورة الغرفة<input type="file" name="roomPhoto" data-so-room-photo-input accept="image/jpeg,image/png,image/webp"></label><p>اختياري · JPG أو PNG أو WebP حتى 12 ميغابايت. نجهّز نسخة صغيرة للحفظ.</p><button type="button" class="so-button" data-so-action="room-photo-clear" hidden>إلغاء الصورة المختارة</button><p data-so-photo-status role="status" aria-live="polite"></p></div></div>`;
}
function blobOf(canvas,type,quality) { return new Promise(resolve => canvas.toBlob(resolve,type,quality)); }
export async function prepareRoomPhoto(file) {
  if (!file || !TYPES.includes(file.type)) throw Error('اختر صورة JPG أو PNG أو WebP.');
  if (file.size < 100 || file.size > PHOTO_SOURCE_MAX) throw Error('حجم الصورة مب مناسب. الحد الأقصى 12 ميغابايت.');
  const url=URL.createObjectURL(file);let image;
  try {
    image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('تعذّر قراءة الصورة. اختر صورة ثانية.'));img.src=url;});
    const w=image.naturalWidth,h=image.naturalHeight;
    if (!w||!h||w>8192||h>8192||w*h>32_000_000) throw Error('دقة الصورة كبيرة. اختر نسخة أصغر من الصورة.');
    const scale=Math.min(1,256/Math.max(w,h)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('تجهيز الصورة غير متاح في المتصفح.');ctx.drawImage(image,0,0,canvas.width,canvas.height);
    for(const type of ['image/webp','image/jpeg'])for(const quality of [0.86,0.72,0.55]){const blob=await blobOf(canvas,type,quality);if(blob&&TYPES.includes(blob.type)&&blob.size>=100&&blob.size<=PHOTO_UPLOAD_MAX)return blob;}
    throw Error('ما قدرنا نجهّز الصورة للحجم المسموح. اختر صورة ثانية.');
  } finally {URL.revokeObjectURL(url);}
}
export function createRoomPhotoPicker(form) {
  const root=form.querySelector('[data-so-room-photo]');if(!root)throw Error('منتقي صورة الغرفة غير متاح.');
  const input=root.querySelector('[data-so-room-photo-input]'),preview=root.querySelector('[data-so-photo-preview]'),placeholder=root.querySelector('[data-so-photo-placeholder]'),status=root.querySelector('[data-so-photo-status]'),clear=root.querySelector('[data-so-action="room-photo-clear"]');
  const original=preview.getAttribute('src')||'';let blob=null,url='',generation=0,busy=false,error='',dead=false;
  const resetPreview=()=>{if(url)URL.revokeObjectURL(url);url='';if(original)preview.src=original;else preview.removeAttribute('src');preview.hidden=!original;placeholder.hidden=!!original;};
  return {
    async select(file){const ticket=++generation;busy=true;error='';status.textContent='جارٍ تجهيز الصورة…';root.setAttribute('aria-busy','true');
      try{const prepared=await prepareRoomPhoto(file);if(dead||ticket!==generation)return;if(url)URL.revokeObjectURL(url);blob=prepared;url=URL.createObjectURL(blob);preview.src=url;preview.hidden=false;placeholder.hidden=true;clear.hidden=false;status.textContent='الصورة جاهزة للحفظ. تنحفظ في الخادم يوم تضغط حفظ أو إنشاء.';}
      catch(e){if(dead||ticket!==generation)return;error=e.message||'تعذّر تجهيز الصورة.';status.textContent=error;}
      finally{if(!dead&&ticket===generation){busy=false;root.removeAttribute('aria-busy');}}
    },
    clear(){generation++;busy=false;error='';blob=null;input.value='';resetPreview();clear.hidden=true;root.removeAttribute('aria-busy');status.textContent=original?'بقيت الصورة المحفوظة مثل ما هي.':'إنشاء الغرفة بدون صورة.';},
    ready(){if(busy)throw Error('انتظر شوي لين تجهز الصورة.');if(error)throw Error(error);return blob;},
    destroy(){dead=true;generation++;blob=null;if(url)URL.revokeObjectURL(url);url='';}
  };
}
