import {
  socialAllowed,
  socialCards,
  socialPublicCard,
  socialText,
  type SocialCard,
  type SocialModeAction,
  type SocialModeContext,
  type SocialModeModule,
  type SocialModeResult,
} from '../social-mode-contract.js';

// Initial, admin-editable content only. Runtime selection always uses ctx.content.
export const hotseatCards: SocialCard[] = [
  { id: 'hotseat-introduction-1', mode: 'hotseat', category: 'تعارف', text: 'أي هواية تحب أن تجربها لو توفرت لك فرصة؟', enabled: true },
  { id: 'hotseat-funny-1', mode: 'hotseat', category: 'مضحكة', text: 'لو صار عندك روبوت يساعدك في مهمة يومية، أي مهمة تختار؟', enabled: true },
  { id: 'hotseat-light-1', mode: 'hotseat', category: 'خفيفة', text: 'تفضل قضاء وقت الفراغ مع كتاب أم فيلم؟ ولماذا؟', enabled: true },
  { id: 'hotseat-reflection-1', mode: 'hotseat', category: 'عميقة', text: 'ما الصفة التي تقدّرها في التعاون بين الناس؟', enabled: true },
];

const MAX_QUEUE = 100;
const MAX_QUESTIONS = 20;
const MAX_MEMBER_ID = 256;
type QuestionRef = { cardId: string; category: string };
type HotseatState = {
  queue: string[];
  seatedId: string | null;
  question: QuestionRef | null;
  questionsAsked: number;
};

const fail = (error: string): SocialModeResult => ({ ok: false, error });
const memberId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= MAX_MEMBER_ID;

// Defence in depth, not a replacement for admin content review. No free-text
// question submissions or answers are accepted or persisted by this module.
const unsafePrompt = /(?:\b(?:phone|mobile|email|e-mail|address|password|passwd|credential|ssn|salary|income|medical|sexual|embarrass\w*|humiliat\w*)\b|\b(?:full|legal|real)\s+name\b|\b(?:private|personal|bank)\s+(?:information|details|account|secret)\b|\b(?:your\s+secret|where\s+do\s+you\s+live)\b|(?:رقم|ارقام).{0,25}(?:هاتف|جوال|هويه|بطاقه|حساب)|(?:هاتفك|جوالك|بريدك|ايميلك|عنوانك|هويتك|راتبك|دخلك|مرضك)|عنوان.{0,25}(?:منزل|بيت|سكن)|(?:مكان\s*عملك|اين\s*تسكن|وين\s*(?:تسكن|ساكن))|اسمك.{0,15}(?:الكامل|الحقيقي)|كلمه.{0,15}(?:مرور|سر)|معلومات.{0,15}(?:شخصيه|خاصه)|(?:اسرارك|سرك|محرج|فاضح|جنسي|عاري|تحرش|اهانه))/i;
function safeText(value: unknown, max: number): string | null {
  const text = socialText(value, max);
  if (!text || /[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(text)) return null;
  const searchable = text.replace(/[\u064b-\u065f\u0670\u0640]/gu, '').replace(/[أإآ]/gu, 'ا').replace(/ة/gu, 'ه');
  return unsafePrompt.test(searchable) ? null : text;
}
function safeCard(card: SocialCard): SocialCard | null {
  if (card.mode !== 'hotseat' || card.enabled !== true) return null;
  const id = safeText(card.id, 128);
  const category = safeText(card.category, 80);
  const text = safeText(card.text, 500);
  if (!id || id !== card.id || !category || category !== card.category || !text) return null;
  let options: string[] | undefined;
  if (card.options !== undefined) {
    if (!Array.isArray(card.options) || card.options.length < 1 || card.options.length > 8) return null;
    options = [];
    for (const option of card.options) {
      const safe = safeText(option, 160);
      if (!safe) return null;
      options.push(safe);
    }
  }
  return { id, mode: 'hotseat', category, text, enabled: true, ...(options ? { options } : {}) };
}
function cards(ctx: SocialModeContext, category: string): SocialCard[] {
  const result: SocialCard[] = [];
  const ids = new Set<string>();
  for (const card of socialCards(ctx, 'hotseat', category)) {
    const safe = safeCard(card);
    if (safe && !ids.has(safe.id)) {
      result.push(safe);
      ids.add(safe.id);
    }
  }
  return result;
}

// Read/copy first; stale membership is pruned only when an action succeeds.
// Departed members lose their queued consent; reconnecting requires a new opt-in.
function snapshot(state: Record<string, any>, ctx: SocialModeContext): HotseatState | null {
  if (!Array.isArray(state.queue) || state.queue.length > MAX_QUEUE || !state.queue.every(memberId)) return null;
  if (state.seatedId !== null && !memberId(state.seatedId)) return null;
  if (!Number.isInteger(state.questionsAsked) || state.questionsAsked < 0 || state.questionsAsked > MAX_QUESTIONS) return null;
  if (state.question !== null) {
    if (!state.question || typeof state.question !== 'object' || Array.isArray(state.question)
      || !safeText(state.question.cardId, 128) || !safeText(state.question.category, 80)
      || state.seatedId === null) return null;
  }
  const members = new Set(ctx.members);
  const seatedId = state.seatedId !== null && members.has(state.seatedId) ? state.seatedId as string : null;
  const queue = [...new Set<string>(state.queue)].filter(id => members.has(id) && id !== seatedId);
  return {
    queue,
    seatedId,
    question: seatedId && state.question ? { cardId: state.question.cardId, category: state.question.category } : null,
    questionsAsked: seatedId ? state.questionsAsked : 0,
  };
}
function clearSeat(state: HotseatState): void {
  state.seatedId = null;
  state.question = null;
  state.questionsAsked = 0;
}
function validAction(action: SocialModeAction): boolean {
  if (!action || typeof action !== 'object' || Array.isArray(action)) return false;
  const keys = action.type === 'participate' ? ['type', 'enabled']
    : action.type === 'question' ? ['type', 'category']
    : ['sit', 'skip', 'end'].includes(action.type) ? ['type'] : [];
  return keys.length > 0 && Object.keys(action).every(key => keys.includes(key))
    && keys.every(key => Object.hasOwn(action, key));
}

export const hotseatMode: SocialModeModule = {
  id: 'hotseat',
  initial() {
    return { queue: [], seatedId: null, question: null, questionsAsked: 0 };
  },
  apply(state, action, ctx) {
    const denied = socialAllowed(ctx, 'hotseat');
    if (denied) return denied;
    if (!memberId(ctx.actorId) || !validAction(action)) return fail('الإجراء غير صالح.');
    const next = snapshot(state, ctx);
    if (!next) return fail('حالة المقعد غير صالحة.');
    let event: string;
    switch (action.type) {
      case 'participate': {
        if (typeof action.enabled !== 'boolean') return fail('اختر المشاركة أو الانسحاب.');
        if (action.enabled) {
          if (next.seatedId !== ctx.actorId && !next.queue.includes(ctx.actorId)) {
            if (next.queue.length >= MAX_QUEUE) return fail('قائمة الانتظار ممتلئة.');
            next.queue.push(ctx.actorId);
          }
          event = 'hotseat.participated';
        } else {
          next.queue = next.queue.filter(id => id !== ctx.actorId);
          if (next.seatedId === ctx.actorId) clearSeat(next);
          event = 'hotseat.withdrawn';
        }
        break;
      }
      case 'sit': {
        if (next.seatedId !== null) return fail('المقعد مشغول الآن.');
        if (next.queue[0] !== ctx.actorId) return fail('الجلوس اختياري حسب ترتيب قائمة الانتظار.');
        next.queue.shift();
        next.seatedId = ctx.actorId;
        next.question = null;
        next.questionsAsked = 0;
        event = 'hotseat.sat';
        break;
      }
      case 'question': {
        if (next.seatedId === null) return fail('لا يوجد عضو على المقعد.');
        const category = safeText(action.category, 80);
        if (!category || category !== action.category || !ctx.content.settings.hotseat.categories.includes(category)) {
          return fail('فئة السؤال غير متاحة.');
        }
        if (next.questionsAsked >= MAX_QUESTIONS) return fail('وصل هذا الدور إلى الحد الأقصى للأسئلة.');
        const available = cards(ctx, category);
        if (!available.length) return fail('لا توجد أسئلة آمنة ومفعّلة في هذه الفئة.');
        const card = available[next.questionsAsked % available.length];
        next.question = { cardId: card.id, category: card.category };
        next.questionsAsked += 1;
        event = 'hotseat.question';
        break;
      }
      case 'skip': {
        if (next.seatedId !== ctx.actorId) return fail('تخطي السؤال متاح لصاحب المقعد فقط.');
        if (next.question === null) return fail('لا يوجد سؤال لتخطيه.');
        next.question = null;
        event = 'hotseat.skipped';
        break;
      }
      case 'end': {
        if (next.seatedId === null) return fail('لا يوجد دور نشط.');
        if (next.seatedId !== ctx.actorId && !ctx.moderator) return fail('إنهاء الدور متاح لصاحب المقعد أو المشرف فقط.');
        clearSeat(next);
        event = 'hotseat.ended';
        break;
      }
      default: return fail('الإجراء غير صالح.');
    }
    // No writes occur before validation, including stale-member cleanup.
    Object.assign(state, next);
    return { ok: true, event };
  },
  view(state, ctx) {
    // canWrite/allowParticipation control writes, not a current member's reading.
    if (!ctx.members.includes(ctx.actorId) || !ctx.content.settings.hotseat?.enabled) return {};
    const current = snapshot(state, ctx);
    if (!current) return {};
    const card = current.question
      ? cards(ctx, current.question.category).find(candidate => candidate.id === current.question!.cardId)
      : undefined;
    return {
      queue: [...current.queue],
      seatedId: current.seatedId,
      question: socialPublicCard(card),
      questionsAsked: current.questionsAsked,
      remainingQuestions: MAX_QUESTIONS - current.questionsAsked,
      nextParticipantId: current.queue[0] ?? null,
    };
  },
};

export default hotseatMode;
