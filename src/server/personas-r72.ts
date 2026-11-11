/* R72: شخصيات الكمبيوتر — بدل «الكمبيوتر 1» تلعب ضد شخصيات لها اسم وأسلوب وكلام.
 * الأسلوب: مستوى اللعب (للعبات اللي فيها مستويات: بلوت وجاكارو) + سرعة التفكير (لكل الألعاب).
 * الكلام: جمل قصيرة بالخليجي تطلع بفقاعة الشات (ترحيب، أثناء اللعب، فوز، خسارة) — بحدود، ما تزعج.
 * أول مرة تهزم شخصية: جائزة عملات مرة وحدة لكل شخصية. */

export type PersonaId = 'abusalem' | 'umfahad' | 'bukhalifa' | 'nouf' | 'theeb' | 'fahood';
export type Persona = {
  id: PersonaId; name: string; emoji: string; level: 'easy' | 'normal' | 'pro';
  /** مضاعف وقت التفكير (أقل = أسرع) */
  speed: number; style: string; reward: number;
  lines: { hello: string[]; move: string[]; win: string[]; lose: string[] };
};

export const PERSONAS: Persona[] = [
  { id: 'nouf', name: 'نوف', emoji: '💅', level: 'easy', speed: 1.25, style: 'مستجدة وتضحك على كل شي — بداية حلوة', reward: 150,
    lines: { hello: ['هلا والله! أول مرة ألعب معك 🙈', 'ترى أنا مبتدئة لا تقسى علي 😅', 'يلا نلعب بس بشويش علي'],
      move: ['هههه وش سويت أنا؟ 😂', 'أحس هذي صح… أتوقع؟', 'اووه ما انتبهت 🙈', 'حلوة هذي صح؟ 😍'],
      win: ['ما صدقت!! فزت 😭💃', 'حظ المبتدئين 😂✨'], lose: ['مبروك عليك تستاهل 👏', 'المرة الياية بفوز إن شاء الله 😤💅'] } },
  { id: 'fahood', name: 'فهود', emoji: '😂', level: 'normal', speed: 0.9, style: 'مهرّج الطاولة — يمزح ويلعب على البركة', reward: 250,
    lines: { hello: ['يا هلا بالبطل 😂 جاهز تخسر؟', 'السلام عليكم ورحمة الله… والهزيمة 😂', 'وصلت؟ يلا نبدأ قبل لا أنام 😴'],
      move: ['خذ هذي وادعي لي 😂', 'لعبة ولا أروع، صفقوا لي 👏', 'هذي من كتاب «فهود يعرف» 📚', 'شفت؟ شفت؟ 😎'],
      win: ['قلت لك من البداية 😂🏆', 'روح نام وارجع بكره 😂'], lose: ['لا لا هذي ما تنحسب، النت عندي ضعيف 😂', 'أمزح معك… خليتك تفوز 😅'] } },
  { id: 'bukhalifa', name: 'بو خليفة', emoji: '👴', level: 'normal', speed: 1.4, style: 'شايب حكيم، يتأنى ويرمي أمثال شعبية', reward: 350,
    lines: { hello: ['حيّ الله من جانا', 'يا ولدي الصبر مفتاح الفرج… والفوز 👴', 'تفضل يا ولدي، الطاولة طاولتك'],
      move: ['اللي ما يعرف الصقر يشويه', 'على هونك يا ولدي', 'العجلة من الشيطان', 'كل شي بوقته حلو'],
      win: ['ما يطيح إلا الشاطر يا ولدي 👴', 'الخبرة ما تنشرى بفلوس'], lose: ['ما شاء الله عليك، أبوك ربّاك زين 👏', 'الدنيا يوم لك ويوم عليك'] } },
  { id: 'umfahad', name: 'أم فهد', emoji: '🧕', level: 'pro', speed: 1.0, style: 'هادية وذكية، تحسب كل حركة', reward: 500,
    lines: { hello: ['هلا فيك، بالتوفيق 🌸', 'خلنا نشوف وش عندك', 'يا مرحبا، العب على راحتك'],
      move: ['محسوبة 😌', 'خلني أفكر… تمام', 'حلوة لعبتك بس عندي أحلى', 'ركّز زين 🌸'],
      win: ['الحمد لله، لعبت زين بس انتبه للأخير 🌸', 'تعلّم من هالجولة 😌'], lose: ['ما شاء الله، أبهرتني 👏🌸', 'تستاهل، لعب نظيف'] } },
  { id: 'abusalem', name: 'أبو سالم', emoji: '😤', level: 'pro', speed: 0.7, style: 'حامي وهجومي، سريع ويطقطق', reward: 600,
    lines: { hello: ['وصلت أخيراً؟ يلا لا تضيّع وقتي 😤', 'اليوم بعلمك اللعب', 'جاهز للطقطقة؟ 😏'],
      move: ['هذي لك 😏', 'يلا يلا استعجل ⏳', 'وش هالحركة؟ 😂', 'ما عندك غيرها؟', 'خذ وخلّ 😤'],
      win: ['قلت لك اليوم بعلمك 😤🏆', 'ارجع تدرّب وتعال 😏'], lose: ['حظ… بس حظ 😤', 'طيب طيب، ردّها لك الحين! 😤'] } },
  { id: 'theeb', name: 'ذيب', emoji: '🐺', level: 'pro', speed: 0.55, style: 'صامت وقاتل، أسرع واحد بالطاولة', reward: 800,
    lines: { hello: ['…', '🐺'], move: ['…', '🐺'], win: ['🐺', 'الذيب ما يرحم'], lose: ['…احترامي 🐺', 'تستاهل'] } },
];
export const PERSONA_IDS = new Set(PERSONAS.map((p) => p.id));
export const personaOf = (id: unknown): Persona | null => PERSONAS.find((p) => p.id === id) ?? null;

/** شخصيات البوتات في الغرفة: الأول اللي اختاره اللاعب، والباقي يتوزعون بثبات حسب رمز الغرفة */
export function personasFor(code: string, chosen: string | undefined, n: number): Persona[] {
  const first = personaOf(chosen);
  let h = 0; for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = PERSONAS.filter((p) => p !== first);
  const out: Persona[] = first ? [first] : [];
  while (out.length < n) { const p = pool.splice(h % pool.length, 1)[0] ?? PERSONAS[out.length % PERSONAS.length]; out.push(p); h = (h * 1103515245 + 12345) >>> 0; if (!pool.length) pool.push(...PERSONAS.filter((x) => !out.includes(x))); }
  return out;
}
export const personaName = (p: Persona) => `${p.emoji} ${p.name}`;
export const personaByName = (name: string): Persona | null => PERSONAS.find((p) => personaName(p) === name) ?? null;

/** الكلام: حد أدنى بين الجمل بالغرفة عشان ما يزعج */
export class Banter {
  private last = new Map<string, number>();
  constructor(private now: () => number = Date.now, private rng: () => number = Math.random) {}
  pick(arr: string[]) { return arr[Math.floor(this.rng() * arr.length)] ?? arr[0]; }
  /** يرجع جملة لو يسمح الوقت والاحتمال */
  line(code: string, p: Persona, kind: keyof Persona['lines'], chance = 1, gapMs = 12_000): string | null {
    const t = this.now(), l = this.last.get(code) ?? 0;
    if (kind === 'move' && (t - l < gapMs || this.rng() > chance)) return null;
    if (kind === 'hello' && t - l < 3_000) return null;
    this.last.set(code, t);
    if (this.last.size > 20_000) { for (const [k, v] of this.last) if (t - v > 3_600_000) this.last.delete(k); }
    return this.pick(p.lines[kind]);
  }
  forget(code: string) { this.last.delete(code); }
}
