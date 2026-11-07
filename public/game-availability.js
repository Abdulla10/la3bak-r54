// Presentation counterpart of the server retirement policy; never creates game state.
export const RETIRED_GAMES = Object.freeze([
  'gulf', 'kidsscience', 'islamic', 'sports', 'trivia', 'capitals',
  'picriddle', 'letterpic', 'letters', 'mostlikely', 'outsider',
]);
const retired = new Set(RETIRED_GAMES);
export const isRetiredGame = id => typeof id === 'string' && retired.has(id);
export const visibleGameCatalogue = games => Array.isArray(games) ? games.filter(game => game && !isRetiredGame(game.id) && !['tower','city'].includes(game.id)) : [];
export const retiredGameHTML = () => '<section class="card empty-state" data-retired-game role="status"><h1>هاللعبة انحذفت</h1><p>الألعاب المذكورة انشالت من المنصة. اختار لعبة ثانية من القائمة؛ سجل حسابك وتقدمك السابق ما انمسح.</p><a class="btn" href="#/games">الرجوع للألعاب</a></section>';
