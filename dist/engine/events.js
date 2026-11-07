/**
 * سجل أحداث اللعب (لودو وجاكارو). المصدر الوحيد هو المحرك على الخادم:
 * كل حدث له رقم تسلسلي `seq` يزيد بواحد ومعرّف فريد `id` داخل اللعبة (الواجهة تضيف رقم اللعبة من الغرفة).
 * السجل للعرض فقط: المحرك ما يقرأ منه أبداً ولا يستهلك رقم عشوائي، فما يتغيّر أي قرار أو نتيجة.
 * نحتفظ بآخر EV_CAP حدث؛ من فاته أكثر من هذا ينزّل الحالة كاملة بدون حركة (الواجهة تكتشف الفجوة من seq).
 */
export const EV_CAP = 24;
export const newLog = () => ({ seq: 0, list: [] });
/** يضيف حدثاً للسجل (ينشئ السجل لو الحالة قديمة محفوظة بدونه) */
export function emit(s, e) {
    const log = (s.ev ??= newLog());
    log.seq++;
    log.list.push({ ...e, seq: log.seq, id: `e${log.seq}` });
    if (log.list.length > EV_CAP)
        log.list.splice(0, log.list.length - EV_CAP);
}
/** الجزء الذي يضاف لـ view */
export const eventsView = (s) => ({ evSeq: s.ev?.seq ?? 0, events: s.ev?.list ?? [] });
