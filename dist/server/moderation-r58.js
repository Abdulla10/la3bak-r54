const MESSAGES = {
    moderation_profanity: 'النص فيه كلام غير لائق؛ عدّله وحاول مرة ثانية.',
    moderation_link: 'الروابط والمواقع الخارجية ممنوعة هنا.',
    moderation_contact: 'أرقام الجوال والبريد وحسابات التواصل ممنوعة هنا.',
    moderation_impersonation: 'ما يصير الاسم يوحي إنك من الإدارة أو الدعم.',
    moderation_spam: 'النص فيه تكرار مزعج؛ اختصره.',
};
/** توحيد الحروف العربية والأرقام عشان التحايل البسيط ما ينفع (تشكيل، تطويل، ألف/ياء/تاء مربوطة، أرقام هندية) */
export function normalizeForModeration(input) {
    return input.normalize('NFKC').toLowerCase()
        .replace(/[ً-ٰٟـ]/g, '')
        .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[​-‏‪-‮⁦-⁩]/g, '');
}
// قائمة مختصرة لأشهر الشتائم (عربي/إنجليزي) بعد التوحيد؛ الإدارة تقدر تحذف أي محتوى فات من سجل المراجعة
const PROFANITY = ['كس', 'زب', 'طيز', 'شرموط', 'قحبه', 'منيوك', 'منيك', 'نيك', 'متناك', 'خول', 'عرص', 'لوطي', 'ديوث', 'كلب ابن كلب', 'ابن الكلب', 'يلعن', 'زق', 'حقير', 'fuck', 'shit', 'bitch', 'pussy', 'dick', 'whore', 'slut', 'nigger', 'porn', 'سكس', 'sex'];
const PROFANITY_RE = new RegExp(`(?:^|[^\\p{L}])(?:${PROFANITY.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?:$|[^\\p{L}])`, 'u');
const IMPERSONATION = ['الاداره', 'اداره الموقع', 'الدعم الفني', 'خدمه العملاء', 'مشرف عام', 'مالك الموقع', 'الحساب الرسمي', 'admin', 'administrator', 'support', 'official', 'moderator', 'la3bak team', 'فريق لعبك'];
const LINK_RE = /(?:https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(?:com|net|org|me|io|co|app|gg|xyz|link|ly|sa|ae|kw|qa|bh|om)\b|t\.me\/|wa\.me\/|discord\.gg)/i;
const CONTACT_RE = /(?:\+?\d[\d\s-]{7,}\d|@[a-z0-9_.]{3,}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:snap|سناب|انستا|insta|تلي|telegram|واتس|whats)\s*[:：]?\s*[a-z0-9_.]{3,})/i;
export function moderateText(raw, kind) {
    const text = String(raw ?? '').trim();
    const n = normalizeForModeration(text);
    const spaced = ` ${n.replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
    if (PROFANITY_RE.test(spaced) || PROFANITY.some((w) => w.length >= 4 && n.replace(/[^\p{L}]/gu, '').includes(w)))
        return fail('moderation_profanity');
    if (LINK_RE.test(n))
        return fail('moderation_link');
    if (kind !== 'room-name' && CONTACT_RE.test(n))
        return fail('moderation_contact');
    if (kind === 'room-name' && /(?:\+?\d[\d\s-]{7,}\d|@[a-z0-9_.]{3,})/i.test(n))
        return fail('moderation_contact');
    if ((kind === 'profile-name' || kind === 'room-name') && IMPERSONATION.some((w) => n.includes(w)))
        return fail('moderation_impersonation');
    if (/(.)\1{9,}/u.test(n))
        return fail('moderation_spam');
    return { ok: true, text };
}
const fail = (code) => ({ ok: false, code, message: MESSAGES[code] });
