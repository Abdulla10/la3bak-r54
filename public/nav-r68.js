// R68b: الشريط السفلي بتصميم المالك — الرئيسية، المتجر، الألعاب (بالنص ومرفوعة)، الأصدقاء، الملف الشخصي
const G = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const DEFS = `<defs>${G('n68v', '#f1dcff', '#b98af0')}${G('n68g', '#fff1b0', '#f0a622')}</defs>`;
const ICON = {
  home: (f) => `<svg viewBox="0 0 32 32" aria-hidden="true">${DEFS}<path d="M16 4 3 15.2h3.6V28h7.6v-7.4h3.6V28h7.6V15.2H29z" fill="url(#${f})"/></svg>`,
  shop: (f) => `<svg viewBox="0 0 32 32" aria-hidden="true">${DEFS}<path d="M5 5h22l2.6 8.2a4.2 4.2 0 0 1-7.2 3.2 4.3 4.3 0 0 1-6.4 0 4.3 4.3 0 0 1-6.4 0 4.2 4.2 0 0 1-7.2-3.2z" fill="url(#${f})"/><path d="M6 18.4V28h20v-9.6a6 6 0 0 1-3.6.5V25H9.6v-6.1a6 6 0 0 1-3.6-.5z" fill="url(#${f})"/><path d="M13 20h6v5h-6z" fill="url(#${f})" opacity=".85"/></svg>`,
  games: (f) => `<svg viewBox="0 0 48 34" aria-hidden="true">${DEFS}<path d="M13 4h22a11 11 0 0 1 10.7 13.4l-1.6 8.3a5.4 5.4 0 0 1-9.4 2.5L30.4 23H17.6l-4.3 5.2a5.4 5.4 0 0 1-9.4-2.5l-1.6-8.3A11 11 0 0 1 13 4z" fill="url(#${f})"/><path d="M13 11v8M9 15h8" stroke="#5a2a96" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="12.5" r="2.4" fill="#5a2a96"/><circle cx="37.5" cy="17" r="2.4" fill="#5a2a96"/><circle cx="28.5" cy="17" r="2.4" fill="#5a2a96"/><circle cx="33" cy="21.5" r="2.4" fill="#5a2a96"/></svg>`,
  friends: (f) => `<svg viewBox="0 0 34 30" aria-hidden="true">${DEFS}<circle cx="21.5" cy="8" r="5.6" fill="url(#${f})"/><path d="M11.5 28c0-7 4.3-11 10-11s10 4 10 11z" fill="url(#${f})"/><circle cx="10.5" cy="10" r="4.6" fill="url(#${f})" opacity=".85"/><path d="M2 27c0-6 3.4-9.4 8.5-9.4 1.6 0 3 .3 4.2 1A13 13 0 0 0 10.5 27z" fill="url(#${f})" opacity=".85"/></svg>`,
  posts: (f) => `<svg viewBox="0 0 32 32" aria-hidden="true">${DEFS}<rect x="5" y="4" width="22" height="24" rx="4" fill="url(#${f})"/><path d="M10 11h12M10 16h12M10 21h7" stroke="#3d1670" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  profile: (f) => `<svg viewBox="0 0 32 32" aria-hidden="true">${DEFS}<circle cx="16" cy="9.6" r="6.4" fill="url(#${f})"/><path d="M4 29c0-7.6 5.4-12 12-12s12 4.4 12 12z" fill="url(#${f})"/></svg>`,
};
// eslint-disable-next-line no-unused-vars
const CROWN = `<svg class="n68-crown" viewBox="0 0 40 26" aria-hidden="true">${DEFS}<path d="M3 8l9 7 8-13 8 13 9-7-3.6 15H6.6z" fill="url(#n68g)" stroke="#9a5a00" stroke-width="1"/><circle cx="20" cy="15" r="2.3" fill="#c0263a"/><circle cx="12" cy="17" r="1.6" fill="#7b3fe4"/><circle cx="28" cy="17" r="1.6" fill="#7b3fe4"/></svg>`;
export const NAV68 = [['home', 'الرئيسية', '#/'], ['shop', 'المتجر', '#/shop'], ['games', 'الألعاب', '#/games'], ['posts', 'المنشورات', '#/community'], ['friends', 'الأصدقاء', '#/friends'], ['profile', 'ملفي', '#/profile']];
const SELECT = { home: 'home', '': 'home', shop: 'shop', games: 'games', lobby: 'games', hub: 'games', game: 'games', play: 'games', offline: 'games', challenge: 'games', room: 'games', join: 'games', city: 'games', friends: 'friends', messages: 'friends', community: 'posts', post: 'posts', u: 'posts', family: 'friends', profile: 'profile', account: 'profile', settings: 'profile', wallet: 'profile', vip: 'profile', ranks: 'profile', missions: 'profile', verification: 'profile', 'rank-rewards': 'profile' };
export const nav68Selected = (page) => SELECT[page] || '';
/** locked(url) => true لو القسم مقفل بإعدادات ولي الأمر */
export function nav68HTML(page, { locked = () => false, cls = '' } = {}) {
  const sel = nav68Selected(page);
  // ترتيب فعلي من اليسار لليمين = عكس القائمة (الرئيسية يمين)
  return `<nav class="lb-bottom nav68 ${cls}" aria-label="التنقل الرئيسي" dir="ltr">${[...NAV68].reverse().map(([key, label, url]) => {
    const on = sel === key, f = on ? 'n68g' : 'n68v';
    const inner = `<span class="n68-ic">${ICON[key](f)}</span><small>${label}</small>`; // R68z27: الألعاب زر عادي بدون دائرة ولا تاج
    if (locked(url)) return `<button type="button" class="n68-item is-${key}" data-lb-nav="${key}" data-lb-locked aria-disabled="true" aria-label="${label}؛ مقفل من إعدادات ولي الأمر">${inner}</button>`;
    return `<a href="${url}" class="n68-item is-${key}${on ? ' is-on lb-selected' : ''}" data-lb-nav="${key}"${on ? ' aria-current="page"' : ''}>${inner}</a>`;
  }).join('')}</nav>`;
}
