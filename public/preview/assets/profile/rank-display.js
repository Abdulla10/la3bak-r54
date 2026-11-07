/* Presentation only. Never change points, thresholds or account membership here. */
export function profileRankDisplay(progression,key) {
 const rank=progression?.[key];
 if (!rank) return {state:'pending',text:'تحميل',description:'جاري تحميل الرتبة'};
 if (rank.enabled===false) return {state:'disabled',text:'مقفل',description:'نظام الرتبة غير مفعّل'};
 if (rank.enabled!==true) return {state:'pending',text:'تحميل',description:'حالة الرتبة لم تُحمّل بعد'};
 if (rank.value!==null && rank.value!==undefined && rank.value!=='') {
  const text=key==='level'?'Lv '+String(rank.value):String(rank.value);
  return {state:'earned',text,description:text};
 }
 return {state:'unranked',text:'لا رتبة',description:'لا رتبة مكتسبة بعد'+(Number.isFinite(rank.points)?' · '+rank.points+' نقطة':'')};
}
