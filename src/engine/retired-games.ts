/** Removed from playable/public catalogues by the owner; historical records remain intact. */
export const RETIRED_GAMES = Object.freeze([
  'gulf', 'kidsscience', 'islamic', 'sports', 'trivia', 'capitals',
  'picriddle', 'letterpic', 'letters', 'mostlikely', 'outsider',
] as const);
const retired = new Set<string>(RETIRED_GAMES);
export const isRetiredGame = (id: unknown): boolean => typeof id === 'string' && retired.has(id);
export const RETIRED_GAME_MESSAGE = 'هاللعبة انحذفت من المنصة. تقدر تختار لعبة ثانية من قائمة الألعاب.';
