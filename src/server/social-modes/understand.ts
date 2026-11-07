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

/** Initial, admin-editable content; never inserted into room/member/message data. */
export const understandCards: SocialCard[] = [
  {
    id: 'understand-free-time', mode: 'understand', category: 'تعارف', enabled: true,
    text: 'لو عندك ساعة فراغ، أي نشاط تختار؟',
    options: ['قراءة شيء ممتع', 'المشي بهدوء', 'جلسة سوالف', 'تجربة هواية'],
  },
  {
    id: 'understand-outing', mode: 'understand', category: 'خفيفة', enabled: true,
    text: 'أي طلعة خفيفة تفضّل؟',
    options: ['نزهة في حديقة', 'زيارة مقهى', 'جولة في متحف', 'جلسة في البيت'],
  },
  {
    id: 'understand-plan', mode: 'understand', category: 'تعارف', enabled: true,
    text: 'كيف تحب تختار نشاط نهاية الأسبوع؟',
    options: ['أخطط من بدري', 'أختار في نفس اليوم', 'آخذ اقتراحات الأصدقاء'],
  },
];

const MAX_PARTICIPANTS = 200;
const MAX_OPTIONS = 8;
const MAX_DURATION_MS = 86_400_000;

type Guess = { memberId: string; option: number };
type ResultGuess = Guess & { matched: boolean };
type Round = {
  id: string;
  memberId: string;
  card: SocialCard & { options: string[] };
  status: 'open' | 'revealed' | 'skipped';
  startedAt: number;
  endsAt: number;
  revealedAt?: number;
  results?: { answer: number; guesses: ResultGuess[]; matchedCount: number };
};
type ModeState = {
  participants: string[];
  cardCursor: number;
  round: Round | null;
  // Persist on the server only. Never serialize raw mode state to clients.
  _private: { answer: number | null; guesses: Guess[] };
  // Temporary matching count for this round only; no member score or wallet value.
  funCount: number;
};

const fail = (error: string): SocialModeResult => ({ ok: false, error });
const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128 &&
  !/[\s\u0000-\u001f\u007f-\u009f]/u.test(value);
const validOption = (value: unknown, length: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < length;
const validTime = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

function validCard(card: SocialCard): card is SocialCard & { options: string[] } {
  return validId(card.id) && typeof card.category === 'string' &&
    socialText(card.category, 80) === card.category && socialText(card.text, 500) === card.text &&
    Array.isArray(card.options) && card.options.length >= 2 && card.options.length <= MAX_OPTIONS &&
    card.options.every(option => typeof option === 'string' && socialText(option, 160) === option) &&
    new Set(card.options).size === card.options.length;
}

function cards(ctx: SocialModeContext): (SocialCard & { options: string[] })[] {
  return socialCards(ctx, 'understand').filter(validCard);
}

function approvedRound(round: Round, ctx: SocialModeContext): boolean {
  return cards(ctx).some(card => card.id === round.card.id &&
    card.category === round.card.category && card.text === round.card.text &&
    card.options.length === round.card.options.length &&
    card.options.every((option, index) => option === round.card.options[index]));
}

function shape(action: SocialModeAction, keys: string[]): boolean {
  return Object.keys(action).every(key => key === 'type' || keys.includes(key));
}

/** Build a detached draft, so all rejected operations leave even nested state untouched. */
function draftOf(state: Record<string, any>): ModeState {
  const current = state as ModeState;
  return {
    participants: [...current.participants],
    cardCursor: current.cardCursor,
    round: current.round ? {
      id: current.round.id,
      memberId: current.round.memberId,
      card: { ...current.round.card, options: [...current.round.card.options] },
      status: current.round.status,
      startedAt: current.round.startedAt,
      endsAt: current.round.endsAt,
      ...(current.round.revealedAt !== undefined ? { revealedAt: current.round.revealedAt } : {}),
      ...(current.round.results ? { results: {
        answer: current.round.results.answer,
        guesses: current.round.results.guesses.map(guess => ({ ...guess })),
        matchedCount: current.round.results.matchedCount,
      } } : {}),
    } : null,
    _private: {
      answer: current._private.answer,
      guesses: current._private.guesses.map(guess => ({ ...guess })),
    },
    funCount: current.funCount,
  };
}

function closeWithoutReveal(state: ModeState): void {
  if (state.round) {
    state.round.status = 'skipped';
    delete state.round.results;
    delete state.round.revealedAt;
  }
  state._private = { answer: null, guesses: [] };
  state.funCount = 0;
}

export const understandMode: SocialModeModule = {
  id: 'understand',
  initial(): ModeState {
    return {
      participants: [], cardCursor: 0, round: null,
      _private: { answer: null, guesses: [] }, funCount: 0,
    };
  },
  apply(state, action, ctx) {
    const denied = socialAllowed(ctx, 'understand');
    if (denied) return denied;
    if (!validId(ctx.actorId) || !validTime(ctx.now)) return fail('بيانات المشاركة غير صالحة.');
    if (!action || typeof action.type !== 'string') return fail('الإجراء غير صالح.');
    const acceptedKeys: Record<string, string[]> = {
      participate: ['enabled'], start: ['memberId'], answer: ['option'],
      guess: ['option'], reveal: [], skip: [],
    };
    if (!Object.hasOwn(acceptedKeys, action.type) || !shape(action, acceptedKeys[action.type])) {
      return fail('الإجراء غير مدعوم أو يحتوي بيانات غير مسموحة.');
    }
    const draft = draftOf(state);
    const round = draft.round;
    let event: string;

    switch (action.type) {
      case 'participate': {
        if (typeof action.enabled !== 'boolean') return fail('حدد المشاركة بنعم أو لا.');
        if (action.enabled) {
          if (!draft.participants.includes(ctx.actorId)) {
            if (draft.participants.length >= MAX_PARTICIPANTS) return fail('طابور المشاركة ممتلئ.');
            draft.participants.push(ctx.actorId);
          }
        } else {
          draft.participants = draft.participants.filter(id => id !== ctx.actorId);
          draft._private.guesses = draft._private.guesses.filter(guess => guess.memberId !== ctx.actorId);
          if (round?.status === 'open' && round.memberId === ctx.actorId) closeWithoutReveal(draft);
        }
        event = 'understand.participation';
        break;
      }
      case 'start': {
        if (!ctx.moderator) return fail('بدء الدور للمضيف أو المشرف فقط.');
        if (round?.status === 'open') return fail('اكشف الدور الحالي أو تخطّه أولًا.');
        // Remove departed members only on success; rejoining requires a fresh opt-in.
        const queue = draft.participants.filter(id => ctx.members.includes(id));
        if (!queue.length) return fail('لا يوجد عضو اختار المشاركة.');
        const next = queue[0];
        if (action.memberId !== undefined && (!validId(action.memberId) || action.memberId !== next)) {
          return fail('يمكن اختيار العضو التالي في الطابور فقط، دون فرض المشاركة.');
        }
        const available = cards(ctx);
        if (!available.length) return fail('لا توجد أسئلة مفعلة بخيارات صالحة في الفئات المسموحة.');
        const duration = ctx.content.settings.understand.durationMs;
        if (!Number.isSafeInteger(duration) || duration < 1_000 || duration > MAX_DURATION_MS ||
            !Number.isSafeInteger(ctx.now + duration)) return fail('مدة الدور غير صالحة.');
        const card = available[draft.cardCursor % available.length];
        let id: string;
        try { id = ctx.newId(); } catch { return fail('تعذر إنشاء معرف الدور.'); }
        if (!validId(id)) return fail('معرف الدور غير صالح.');
        draft.participants = [...queue.slice(1), next];
        draft.cardCursor = (draft.cardCursor % available.length) + 1;
        draft.round = {
          id, memberId: next, card: { ...card, options: [...card.options] }, status: 'open',
          startedAt: ctx.now, endsAt: ctx.now + duration,
        };
        draft._private = { answer: null, guesses: [] };
        draft.funCount = 0;
        event = 'understand.started';
        break;
      }
      case 'answer':
      case 'guess': {
        if (!round || round.status !== 'open') return fail('لا يوجد دور مفتوح.');
        if (!ctx.members.includes(round.memberId) || !draft.participants.includes(round.memberId)) {
          return fail('العضو المختار غير مشارك حاليًا؛ يمكن تخطي الدور.');
        }
        if (!approvedRound(round, ctx)) return fail('السؤال لم يعد متاحًا من الإدارة؛ يمكن تخطيه.');
        if (ctx.now >= round.endsAt) return fail('انتهى وقت الإجابات والتوقعات؛ الكشف يبقى اختياريًا.');
        if (!validOption(action.option, round.card.options.length)) return fail('اختر رقم خيار صالح.');
        if (action.type === 'answer') {
          if (round.memberId !== ctx.actorId) return fail('الإجابة الخاصة للعضو المختار فقط.');
          if (draft._private.answer !== null) return fail('تم حفظ إجابتك لهذا الدور.');
          draft._private.answer = action.option;
          event = 'understand.answered';
        } else {
          if (round.memberId === ctx.actorId) return fail('العضو المختار يجيب ولا يتوقع.');
          if (draft._private.guesses.some(guess => guess.memberId === ctx.actorId)) {
            return fail('تم حفظ توقعك لهذا الدور.');
          }
          if (draft._private.guesses.length >= MAX_PARTICIPANTS) return fail('اكتمل عدد التوقعات.');
          draft._private.guesses.push({ memberId: ctx.actorId, option: action.option });
          event = 'understand.guessed';
        }
        break;
      }
      case 'reveal': {
        if (!round || round.status !== 'open') return fail('لا يوجد دور مفتوح.');
        if (round.memberId !== ctx.actorId) return fail('كشف الإجابة بموافقة العضو المختار فقط.');
        if (!approvedRound(round, ctx)) return fail('السؤال لم يعد متاحًا من الإدارة؛ يمكن تخطيه.');
        if (draft._private.answer === null) return fail('اختر إجابتك أولًا أو تخطّ الدور.');
        const answer = draft._private.answer;
        const guesses = draft._private.guesses.filter(guess => ctx.members.includes(guess.memberId))
          .map(guess => ({ ...guess, matched: guess.option === answer }));
        const matchedCount = guesses.filter(guess => guess.matched).length;
        round.status = 'revealed';
        round.revealedAt = ctx.now;
        round.results = { answer, guesses, matchedCount };
        draft.funCount = matchedCount;
        draft._private = { answer: null, guesses: [] };
        event = 'understand.revealed';
        break;
      }
      case 'skip': {
        if (!round || round.status !== 'open') return fail('لا يوجد دور مفتوح.');
        if (round.memberId !== ctx.actorId && !ctx.moderator) return fail('التخطي للعضو المختار أو المشرف فقط.');
        closeWithoutReveal(draft);
        event = 'understand.skipped';
        break;
      }
      default: return fail('الإجراء غير مدعوم.');
    }
    Object.assign(state, draft);
    return { ok: true, event };
  },
  view(state, ctx) {
    const enabled = ctx.content.settings.understand?.enabled === true;
    if (!enabled || !ctx.members.includes(ctx.actorId)) {
      return { id: 'understand', enabled, participants: [], participating: false, round: null, ownGuess: null, funCount: 0 };
    }
    const current = state as ModeState;
    const participants = current.participants.filter(id => ctx.members.includes(id));
    const round = current.round && approvedRound(current.round, ctx) ? current.round : null;
    const active = round?.status === 'open';
    const selected = round?.memberId === ctx.actorId;
    const ownGuess = active ? current._private.guesses.find(guess => guess.memberId === ctx.actorId)?.option ?? null : null;
    const canAct = !socialAllowed(ctx, 'understand') && validTime(ctx.now);
    const inTime = !!round && ctx.now < round.endsAt;
    const selectedReady = !!round && ctx.members.includes(round.memberId) && participants.includes(round.memberId);
    // Explicit projection: never spread stored state, private data, or arbitrary admin fields.
    const publicRound = round ? {
      id: round.id, memberId: round.memberId, card: socialPublicCard(round.card),
      status: round.status, startedAt: round.startedAt, endsAt: round.endsAt,
      ...(round.status === 'revealed' && round.results ? {
        revealedAt: round.revealedAt,
        results: {
          answer: round.results.answer,
          guesses: round.results.guesses.map(guess => ({ memberId: guess.memberId, option: guess.option, matched: guess.matched })),
          matchedCount: round.results.matchedCount,
        },
      } : {}),
    } : null;
    return {
      id: 'understand', enabled, participants, participating: participants.includes(ctx.actorId),
      round: publicRound, ownGuess,
      hasAnswered: !!active && !!selected && current._private.answer !== null,
      funCount: round?.status === 'revealed' ? current.funCount : 0,
      permissions: {
        participate: !!canAct,
        start: !!canAct && ctx.moderator && current.round?.status !== 'open' && participants.length > 0 && cards(ctx).length > 0,
        answer: !!canAct && !!active && !!selected && selectedReady && inTime && current._private.answer === null,
        guess: !!canAct && !!active && !selected && selectedReady && inTime && ownGuess === null,
        reveal: !!canAct && !!active && !!selected && current._private.answer !== null,
        skip: !!canAct && current.round?.status === 'open' && (current.round.memberId === ctx.actorId || ctx.moderator),
      },
    };
  },
};

export default understandMode;
