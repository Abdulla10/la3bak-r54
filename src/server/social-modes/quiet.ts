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

// Initial, admin-editable content only. These cards are never inserted into a room
// implicitly: the caller must supply its current enabled content through ctx.
export const quietCards: SocialCard[] = [
  {
    id: 'quiet-small-comfort', mode: 'quiet', category: 'هدوء', enabled: true,
    text: 'إن رغبت بالمشاركة: ما تفصيل بسيط يجعل يومك ألطف؟ ويمكنك الاكتفاء بالاستماع.',
  },
  {
    id: 'quiet-calm-scene', mode: 'quiet', category: 'هدوء', enabled: true,
    text: 'ما منظر طبيعي يمنحك شعورًا بالهدوء؟ الإجابة اختيارية، ولا حاجة لذكر مكانك.',
  },
  {
    id: 'quiet-one-word', mode: 'quiet', category: 'تأمل', enabled: true,
    text: 'اختر كلمة لطيفة تصف الأجواء التي تحبها الآن، أو استمتع بالهدوء دون إجابة.',
  },
];

// Volume is normalized to [0, 1]. No audio playback, assets, microphone control,
// timers, chat, or participation side effects belong to this server module.
const MIN_INTERVAL_MS = 15_000;
const MAX_INTERVAL_MS = 3_600_000;
const DEFAULT_INTERVAL_MS = 120_000;
const MAX_PREFERENCES = 128;
const MAX_ACTOR_ID_LENGTH = 128;

type Preference = { relax: boolean; music: { enabled: boolean; volume: number } };
type QuietState = {
  prompts: boolean;
  intervalMs: number;
  promptClockAt: number | null;
  lastPromptAt: number | null;
  cardId: string | null;
  promptCursor: number;
  preferences: Record<string, Preference>;
};

function defaults(): Preference {
  return { relax: false, music: { enabled: false, volume: 0.25 } };
}

function intervalValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    && value >= MIN_INTERVAL_MS && value <= MAX_INTERVAL_MS;
}

function volumeValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function timeValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function ownPreference(state: QuietState, actorId: string): Preference {
  const stored = state.preferences && Object.hasOwn(state.preferences, actorId)
    ? state.preferences[actorId] : undefined;
  return {
    relax: stored?.relax === true,
    music: {
      enabled: stored?.music?.enabled === true,
      volume: volumeValid(stored?.music?.volume) ? stored.music.volume : 0.25,
    },
  };
}

function allowedKeys(action: SocialModeAction, keys: string[]): boolean {
  return Object.keys(action).every(key => key === 'type' || keys.includes(key));
}

function fail(error: string): SocialModeResult {
  return { ok: false, error };
}

function currentCards(ctx: SocialModeContext): SocialCard[] {
  // Recheck current admin content on each read/action. Never retain copied card
  // text, private content fields, or disabled/deleted cards in durable state.
  return socialCards(ctx, 'quiet').flatMap(card => {
    if (typeof card.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(card.id)) return [];
    const category = socialText(card.category, 64);
    const text = socialText(card.text, 500);
    if (!category || !text) return [];
    let options: string[] | undefined;
    if (card.options !== undefined) {
      if (!Array.isArray(card.options) || card.options.length > 8) return [];
      const clean = card.options.map(option => socialText(option, 120));
      if (clean.some(option => option === null)) return [];
      options = clean as string[];
    }
    return [{ id: card.id, mode: 'quiet' as const, category, text, enabled: true,
      ...(options ? { options } : {}) }];
  });
}

export const quietMode: SocialModeModule = {
  id: 'quiet',

  initial(): QuietState {
    return {
      prompts: false,
      intervalMs: DEFAULT_INTERVAL_MS,
      promptClockAt: null,
      lastPromptAt: null,
      cardId: null,
      promptCursor: 0,
      preferences: {},
    };
  },

  apply(rawState, action, ctx): SocialModeResult {
    const denied = socialAllowed(ctx, 'quiet');
    if (denied) return denied;
    if (typeof ctx.actorId !== 'string' || !ctx.actorId.length
      || ctx.actorId.length > MAX_ACTOR_ID_LENGTH) return fail('معرّف العضو غير صالح.');
    if (!action || typeof action.type !== 'string') return fail('الإجراء غير صالح.');
    const state = rawState as QuietState;

    switch (action.type) {
      case 'configure': {
        if (!ctx.moderator) return fail('تعديل الإعدادات للمشرف فقط.');
        if (!allowedKeys(action, ['prompts', 'intervalMs'])
          || typeof action.prompts !== 'boolean' || !intervalValid(action.intervalMs)) {
          return fail('إعدادات الأسئلة غير صالحة: المدة من 15 ثانية إلى ساعة.');
        }
        if (!timeValid(ctx.now)) return fail('وقت الإجراء غير صالح.');
        // Starting/reconfiguring prompts starts a fresh interval. Disabling
        // clears the visible prompt; it never creates a background timer.
        state.prompts = action.prompts;
        state.intervalMs = action.intervalMs;
        state.promptClockAt = action.prompts ? ctx.now : null;
        if (!action.prompts) {
          state.cardId = null;
          state.lastPromptAt = null;
        }
        return { ok: true, event: 'quiet.configured' };
      }
      case 'prompt': {
        if (!allowedKeys(action, [])) return fail('الإجراء غير صالح.');
        if (!state.prompts) return fail('الأسئلة الاختيارية غير مفعّلة.');
        if (!timeValid(ctx.now) || !timeValid(state.promptClockAt)
          || !intervalValid(state.intervalMs) || ctx.now < state.promptClockAt) {
          return fail('وقت الإجراء غير صالح.');
        }
        if (!ctx.moderator && ctx.now - state.promptClockAt < state.intervalMs) {
          return fail('لم يحن وقت السؤال التالي.');
        }
        const cards = currentCards(ctx);
        if (!cards.length) return fail('لا توجد بطاقات مفعّلة في الفئات المتاحة.');
        const cursor = Number.isSafeInteger(state.promptCursor) && state.promptCursor >= 0
          ? state.promptCursor % cards.length : 0;
        const card = cards[cursor];
        state.cardId = card.id;
        state.lastPromptAt = ctx.now;
        state.promptClockAt = ctx.now;
        state.promptCursor = (cursor + 1) % cards.length;
        return { ok: true, event: 'quiet.prompted' };
      }
      case 'relax':
      case 'music': {
        const music = action.type === 'music';
        if (!allowedKeys(action, music ? ['enabled', 'volume'] : ['enabled'])
          || typeof action.enabled !== 'boolean'
          || (music && !volumeValid(action.volume))) return fail('التفضيل غير صالح.');
        // Prune departed members only after all checks pass, and bound storage
        // even when ctx contains a large member list. Prototype-like IDs are
        // treated as own data keys, including after a JSON persistence roundtrip.
        const members = new Set(ctx.members);
        const entries = Object.keys(state.preferences ?? {})
          .filter(id => members.has(id) && id.length > 0 && id.length <= MAX_ACTOR_ID_LENGTH);
        if (entries.length > MAX_PREFERENCES
          || (entries.length === MAX_PREFERENCES && !entries.includes(ctx.actorId))) {
          return fail('بلغت التفضيلات الحد الأقصى.');
        }
        const next: Record<string, Preference> = Object.fromEntries(
          entries.map(id => [id, ownPreference(state, id)]),
        );
        const preference = ownPreference(state, ctx.actorId);
        if (music) preference.music = { enabled: action.enabled, volume: action.volume as number };
        else preference.relax = action.enabled;
        Object.defineProperty(next, ctx.actorId, {
          value: preference, enumerable: true, writable: true, configurable: true,
        });
        state.preferences = next;
        return { ok: true, event: music ? 'quiet.music' : 'quiet.relax' };
      }
      default:
        return fail('الإجراء غير معروف.');
    }
  },

  view(rawState, ctx): Record<string, unknown> {
    // A projection is an allowlist, never a spread of durable state or context.
    // Nonmembers and disabled modes cannot see room content or preferences.
    if (!ctx.content.settings.quiet?.enabled || !ctx.members.includes(ctx.actorId)) {
      return { id: 'quiet', available: false };
    }
    const state = rawState as QuietState;
    const card = state.prompts ? currentCards(ctx).find(item => item.id === state.cardId) : undefined;
    return {
      id: 'quiet',
      available: true,
      prompts: state.prompts === true,
      intervalMs: intervalValid(state.intervalMs) ? state.intervalMs : DEFAULT_INTERVAL_MS,
      prompt: card ? { card: socialPublicCard(card), at: timeValid(state.lastPromptAt) ? state.lastPromptAt : null } : null,
      preference: typeof ctx.actorId === 'string' && ctx.actorId.length <= MAX_ACTOR_ID_LENGTH
        ? ownPreference(state, ctx.actorId) : defaults(),
    };
  },
};

export default quietMode;
