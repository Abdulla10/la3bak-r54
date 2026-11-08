/* Generated from ui-icons-r2.svg by build-inline-icons.py. Edit the SVG source, then regenerate.
 * Every icon carries local gradient defs with distinct IDs: no external <use> references.
 * Pure static trusted vectors; player input never becomes SVG markup. */
const GRADIENTS = "<linearGradient id=\"rose\" x1=\"0\" y1=\"0\" x2=\"80%\" y2=\"100%\"><stop stop-color=\"#e6ddf3\"/><stop offset=\".5\" stop-color=\"#459576\"/><stop offset=\"1\" stop-color=\"#5a2a8c\"/></linearGradient><linearGradient id=\"gold\" x2=\"100%\" y2=\"100%\"><stop stop-color=\"#fff4ac\"/><stop offset=\".5\" stop-color=\"#ffca45\"/><stop offset=\"1\" stop-color=\"#ad6617\"/></linearGradient>";
const SHAPES = {
  "bell": "<path d=\"M5 17c2-1 1-5 2-9a5 5 0 0 1 10 0c1 4 0 8 2 9l1 2H4Z\" fill=\"url(#rose)\" stroke=\"#d3c6e6\" stroke-width=\".5\"/><ellipse cx=\"12\" cy=\"20.5\" rx=\"2.2\" ry=\"1.4\" fill=\"#5a2a8c\"/><circle cx=\"12\" cy=\"2.4\" r=\"1.3\" fill=\"#c49a3a\"/>",
  "eye": "<path d=\"M1.5 12C4 7 7.7 4.5 12 4.5S20 7 22.5 12C20 17 16.3 19.5 12 19.5S4 17 1.5 12Z\" fill=\"url(#rose)\"/><circle cx=\"12\" cy=\"12\" r=\"4.2\" fill=\"#fff\"/><circle cx=\"12\" cy=\"12\" r=\"2.4\" fill=\"#2c1a4a\"/><circle cx=\"13.1\" cy=\"10.9\" r=\".8\" fill=\"#fff\"/>",
  "share": "<circle cx=\"12\" cy=\"12\" r=\"10.5\" fill=\"url(#rose)\"/><path d=\"M13 7.5l5 4.5-5 4.5v-2.6c-3.4-.2-5.6.9-7.2 3.1.5-4.3 2.8-7 7.2-7.4Z\" fill=\"#fff\" stroke=\"#2c1a4a\" stroke-width=\".7\" stroke-linejoin=\"round\"/>",
  "mail": "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"1.5\" fill=\"url(#rose)\"/><path d=\"m2 5 10 8 10-8M2 20l7-8m13 8-7-8\" stroke=\"#2c1a4a\" stroke-width=\"1.2\" fill=\"none\"/><path d=\"M3 5h18\" stroke=\"#fff\" stroke-width=\".6\"/>",
  "menu": "<g fill=\"url(#rose)\"><rect x=\"2\" y=\"3\" width=\"20\" height=\"2.8\" rx=\"1.4\"/><rect x=\"2\" y=\"10\" width=\"20\" height=\"2.8\" rx=\"1.4\"/><rect x=\"2\" y=\"17\" width=\"20\" height=\"2.8\" rx=\"1.4\"/></g>",
  "person": "<circle cx=\"12\" cy=\"6.7\" r=\"4.3\" fill=\"currentColor\"/><path d=\"M3 21v-4a9 9 0 0 1 18 0v4Z\" fill=\"currentColor\"/><path d=\"M4 19v-2a8 8 0 0 1 16 0\" fill=\"none\" stroke=\"#ffffff88\" stroke-width=\".6\"/>",
  "users": "<g fill=\"url(#rose)\"><circle cx=\"12\" cy=\"5\" r=\"3.5\"/><circle cx=\"4.5\" cy=\"8\" r=\"2.7\"/><circle cx=\"19.5\" cy=\"8\" r=\"2.7\"/><path d=\"M6.5 21v-6a5.5 5.5 0 0 1 11 0v6Z\"/><path d=\"M.5 20v-5a4 4 0 0 1 6.4-3.1L5 15v5ZM23.5 20v-5a4 4 0 0 0-6.4-3.1L19 15v5Z\"/></g>",
  "trophy": "<g fill=\"url(#gold)\"><path d=\"M7 2h10v7c0 6-10 6-10 0Z\"/><path d=\"M7 4H2v3a6 6 0 0 0 6 6l-1-2a4 4 0 0 1-3-4V6h3ZM17 4h5v3a6 6 0 0 1-6 6l1-2a4 4 0 0 0 3-4V6h-3Z\"/><rect x=\"11\" y=\"13\" width=\"2\" height=\"6\"/><path d=\"M8 19h8l2 3H6Z\"/></g><path d=\"M9 3v6\" stroke=\"#fff2b1\" stroke-width=\"1.2\"/><path d=\"M8 21h8\" stroke=\"#fff\" stroke-width=\".5\"/>",
  "game": "<path d=\"M7 5h10c4 0 5 3 5 6l.5 7c0 3-3 3-5 1l-3-3H9.5l-3 3c-2 2-5 2-5-1L2 11c0-3 1-6 5-6Z\" fill=\"url(#rose)\"/><path d=\"M7 8v6M4 11h6\" stroke=\"#2c1a4a\" stroke-width=\"1.8\"/><circle cx=\"16\" cy=\"10\" r=\"1.4\" fill=\"#2c1a4a\"/><circle cx=\"19\" cy=\"13\" r=\"1.4\" fill=\"#2c1a4a\"/>",
  "shirt": "<path d=\"m7 2 3 2h4l3-2 6 6-4 3-2-2v13H7V9l-2 2-4-3Z\" fill=\"url(#rose)\"/><path d=\"m9 3 3 3 3-3M8 21h8\" fill=\"none\" stroke=\"#e6ddf3\" stroke-width=\".7\"/>",
  "edit": "<path d=\"m3 16 12-12 5 5-12 12-6 1Z\" fill=\"url(#rose)\"/><path d=\"m15 4 2-2c1-1 2-1 3 0l2 2c1 1 1 2 0 3l-2 2Z\" fill=\"#e6ddf3\"/><path d=\"m3 16 5 5-6 1Z\" fill=\"#5a2a8c\"/><path d=\"m7 18 11-11\" stroke=\"#fcf9f4\" stroke-width=\".7\"/>",
  "crown": "<path d=\"m2 5 5 6 5-9 5 9 5-6-3 15H5Z\" fill=\"url(#gold)\"/><path d=\"m5 11 2 3 5-7 5 7 2-3-1 6H6Z\" fill=\"#ad5b32\"/><path d=\"M5 19h14\" stroke=\"#ffe999\" stroke-width=\"1.2\"/><g fill=\"#ffe9a3\"><circle cx=\"2\" cy=\"4\" r=\"1.3\"/><circle cx=\"12\" cy=\"2\" r=\"1.3\"/><circle cx=\"22\" cy=\"4\" r=\"1.3\"/></g>",
  "shield": "<circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"url(#rose)\"/><circle cx=\"12\" cy=\"12\" r=\"7.5\" fill=\"#2c1a4a\"/><path d=\"m12 5 2 4.5 5 .7-3.6 3.5.9 4.8-4.3-2.3-4.3 2.3.9-4.8L5 10.2l5-.7Z\" fill=\"url(#rose)\"/>",
  "frame": "<g stroke=\"url(#rose)\" stroke-width=\"2\" fill=\"none\"><path d=\"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5\"/></g><circle cx=\"12\" cy=\"8\" r=\"3\" fill=\"url(#rose)\"/><path d=\"M6 19v-3a6 6 0 0 1 12 0v3Z\" fill=\"url(#rose)\"/>",
  "image": "<rect x=\"2\" y=\"3\" width=\"20\" height=\"18\" rx=\"1\" fill=\"none\" stroke=\"url(#rose)\" stroke-width=\"2\"/><circle cx=\"8\" cy=\"8\" r=\"2\" fill=\"url(#rose)\"/><path d=\"m3 19 6-7 4 4 4-6 4 9Z\" fill=\"url(#rose)\"/>",
  "chart": "<g fill=\"url(#rose)\"><rect x=\"2\" y=\"12\" width=\"4\" height=\"10\" rx=\".5\"/><rect x=\"8\" y=\"8\" width=\"4\" height=\"14\" rx=\".5\"/><rect x=\"14\" y=\"4\" width=\"4\" height=\"18\" rx=\".5\"/><rect x=\"20\" y=\"1\" width=\"3\" height=\"21\" rx=\".5\"/></g>",
  "home": "<path d=\"m1 11 11-10 11 10-3 2v9H4v-9Z\" fill=\"url(#rose)\"/><path d=\"M9 22v-8h6v8Z\" fill=\"#fcf9f4\"/><path d=\"m3 11 9-8 9 8\" stroke=\"#d3c6e6\" stroke-width=\".5\" fill=\"none\"/>",
  "shop": "<path d=\"M3 9h18l-3-7H6Z\" fill=\"url(#rose)\"/><path d=\"M4 10v12h16V10M3 9q1 4 5 0 4 4 8 0 3 4 5 0\" fill=\"#459576\"/><path d=\"M9 22v-8h6v8Z\" fill=\"#fcf9f4\"/><path d=\"M4 12h16\" stroke=\"#e6ddf3\" stroke-width=\".7\"/>",
  "flag": "<path d=\"M12 23s-8-9-8-15a8 8 0 0 1 16 0c0 6-8 15-8 15Z\" fill=\"url(#rose)\"/><circle cx=\"12\" cy=\"8.5\" r=\"3.7\" fill=\"#2c1a4a\"/>",
  "gender": "<circle cx=\"12\" cy=\"8\" r=\"6\" fill=\"none\" stroke=\"url(#rose)\" stroke-width=\"2.6\"/><path d=\"M12 14v9m-4-5h8\" stroke=\"url(#rose)\" stroke-width=\"2.6\"/>",
  "calendar": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\" fill=\"none\" stroke=\"url(#rose)\" stroke-width=\"2\"/><path d=\"M8 2v5m8-5v5M3 10h18\" stroke=\"url(#rose)\" stroke-width=\"2\"/><g fill=\"url(#rose)\"><rect x=\"7\" y=\"12\" width=\"3\" height=\"3\"/><rect x=\"13\" y=\"12\" width=\"3\" height=\"3\"/><rect x=\"7\" y=\"17\" width=\"3\" height=\"2\"/><rect x=\"13\" y=\"17\" width=\"3\" height=\"2\"/></g>",
  "cake": "<path d=\"M2 12h20v10H2Z\" fill=\"url(#rose)\"/><path d=\"M2 15q3 3 6 0 4 3 7 0 4 3 7 0\" stroke=\"#2c1a4a\" fill=\"none\" stroke-width=\"1.4\"/><path d=\"M6 12V5m6 7V5m6 7V5\" stroke=\"url(#rose)\" stroke-width=\"1.8\"/><g fill=\"#c49a3a\"><path d=\"M4 3q0-3 2-3 2 3 0 4Z\"/><path d=\"M10 3q0-3 2-3 2 3 0 4Z\"/><path d=\"M16 3q0-3 2-3 2 3 0 4Z\"/></g>",
  "info": "<rect x=\"2\" y=\"5\" width=\"20\" height=\"15\" rx=\"2\" fill=\"url(#gold)\"/><path d=\"M6 2h6v5H6Z\" fill=\"#ffe98e\"/><circle cx=\"8\" cy=\"11\" r=\"2\" fill=\"#713b36\"/><path d=\"M4 17v-2a4 4 0 0 1 8 0v2M14 10h5m-5 4h5\" stroke=\"#713b36\" stroke-width=\"1.6\" fill=\"none\"/>",
  "camera": "<path d=\"M4 6h4l2-3h5l2 3h3a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2Z\" fill=\"url(#gold)\"/><circle cx=\"12\" cy=\"12\" r=\"4\" fill=\"#2c1a4a\"/><circle cx=\"12\" cy=\"12\" r=\"2.6\" fill=\"none\" stroke=\"#ffe17b\" stroke-width=\".7\"/><circle cx=\"19\" cy=\"9\" r=\"1\" fill=\"#5a2a8c\"/>",
  "copy": "<rect x=\"8\" y=\"8\" width=\"12\" height=\"13\" rx=\"2\" fill=\"none\" stroke=\"url(#rose)\" stroke-width=\"1.7\"/><path d=\"M16 8V3H3v13h5\" fill=\"none\" stroke=\"url(#rose)\" stroke-width=\"1.7\"/>",
  "plus": "<path d=\"M12 4v16M4 12h16\" fill=\"none\" stroke=\"url(#rose)\" stroke-width=\"2.2\"/>",
  "close": "<path d=\"m5 5 14 14M5 19 19 5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"/>",
  "check": "<path d=\"m5 12 4 4L20 5\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.5\"/>",
  "settings": "<path d=\"m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z\" fill=\"url(#rose)\"/><circle cx=\"12\" cy=\"12\" r=\"3\" fill=\"#fcf9f4\"/>",
  "logout": "<path d=\"M10 3H3v18h7m5-14 5 5-5 5M8 12h12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"/>",
  "help": "<path d=\"M3 14v-2a9 9 0 0 1 18 0v2M3 12H1v7h5v-7Zm18 0h2v7h-5v-7Zm0 7c0 3-4 3-7 3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/>",
  "coin": "<circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"url(#gold)\"/><path d=\"M15 7H9v5h6v5H9m3-12v14\" stroke=\"#986a1f\" stroke-width=\"1.4\" fill=\"none\"/>",
  "medal": "<circle cx=\"12\" cy=\"9\" r=\"6\" fill=\"url(#gold)\"/><path d=\"m8 14-2 8 6-3 6 3-2-8\" fill=\"url(#rose)\"/>",
  "star": "<path d=\"m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z\" fill=\"url(#gold)\"/>",
  "ranking": "<path d=\"M6 20V10h4v10m4 0V4h4v16M2 20h20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/>",
  "back": "<path d=\"m9 5 7 7-7 7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M12 7v5l3 2\" stroke=\"currentColor\" stroke-width=\"1.7\" fill=\"none\"/>",
  "file": "<path d=\"M5 2h9l5 5v15H5Zm9 0v6h5M8 12h8m-8 4h8\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/>"
};
let sequence=0;
export const profileIconNames=Object.freeze(Object.keys(SHAPES));
export function renderProfileIcon(name) {
 const key=Object.hasOwn(SHAPES,name)?name:'help';
 const prefix='lpu-icon-'+(++sequence)+'-';
 const local=markup=>markup.replaceAll('id="rose"','id="'+prefix+'rose"').replaceAll('id="gold"','id="'+prefix+'gold"').replaceAll('url(#rose)','url(#'+prefix+'rose)').replaceAll('url(#gold)','url(#'+prefix+'gold)');
 return '<svg class="pvp-icon" data-profile-icon="'+key+'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="none" stroke-width="0" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><defs>'+local(GRADIENTS)+'</defs>'+local(SHAPES[key])+'</svg>';
}
