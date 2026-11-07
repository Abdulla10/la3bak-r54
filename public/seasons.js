/* مناسبات: تظهر حسب التاريخ (الهجري بتقويم أم القرى + أيام وطنية ثابتة). قد يختلف يوم عن الرؤية الفعلية. */
const NAT = { '2-25': ['🇰🇼', 'اليوم الوطني الكويتي'], '9-23': ['🇸🇦', 'اليوم الوطني السعودي'], '11-18': ['🇴🇲', 'اليوم الوطني العماني'], '12-2': ['🇦🇪', 'اليوم الوطني الإماراتي'], '12-16': ['🇧🇭', 'اليوم الوطني البحريني'], '12-18': ['🇶🇦', 'اليوم الوطني القطري'] };
export function hijri(now = Date.now()) {
  try {
    const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Dubai' }).formatToParts(now);
    return { m: Number(p.find((x) => x.type === 'month').value), d: Number(p.find((x) => x.type === 'day').value) };
  } catch { return null; }
}
export function season(now = Date.now()) {
  const h = hijri(now);
  if (h) {
    if (h.m === 9) return { emoji: '🌙', title: 'رمضان كريم', text: 'أسئلة إسلامية وثقافية تناسب الأجواء.', kind: 'islamic' };
    if ((h.m === 10 && h.d <= 3) || (h.m === 12 && h.d >= 10 && h.d <= 13)) return { emoji: '🎉', title: 'عيدكم مبارك', text: 'لمّة العيد؟ العبوا مع بعض أسئلة منوّعة.', kind: 'mix' };
  }
  const t = new Date(now + 4 * 3600_000); const k = `${t.getUTCMonth() + 1}-${t.getUTCDate()}`;
  if (NAT[k]) return { emoji: NAT[k][0], title: NAT[k][1], text: 'تحدي أسئلة عن الخليج بهذي المناسبة.', kind: 'gulf' };
  return null;
}
