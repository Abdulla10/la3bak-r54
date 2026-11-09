/* رسومات الهدايا: SVG أصلية بالكامل (بدون أي أصول منسوخة). كل هدية = رسمة أساسية (motif) + تركيبة (variant 0..7)
   تضيف عناصر بنيوية: لمعان، مجموعة ثلاثية، صندوق، تاج، أجنحة، هالة ومنصة، أو كلها (إمبراطوري). المواصفات من الخادم (giftcatalog.ts). */
const C = (x, y, r, f, ex = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${ex}/>`;
const E = (x, y, rx, ry, f, ex = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${ex}/>`;
const R = (x, y, w, h, f, rx = 0, ex = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${ex}/>`;
const P = (d, f, s = 'none', w = 0, ex = '') => `<path d="${d}" fill="${f}"${s !== 'none' ? ` stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"` : ''} ${ex}/>`;
const L = (d, s, w = 2) => P(d, 'none', s, w);
const star = (x, y, r, f) => P(`M${x} ${y - r}L${x + r * .3} ${y - r * .3}L${x + r} ${y}L${x + r * .3} ${y + r * .3}L${x} ${y + r}L${x - r * .3} ${y + r * .3}L${x - r} ${y}L${x - r * .3} ${y - r * .3}Z`, f);
const star5 = (x, y, r, f) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ' ' + (y + rr * Math.sin(a)).toFixed(1); } return P(d + 'Z', f); };

/* ألوان كل قسم: [رئيسي، ثانوي، لمسة، داكن] (4 لوحات، التركيبة تختار وحدة) */
const PAL = {
  normal: [['#ffd166', '#ff8fb1', '#fff3c4', '#7a3b12'], ['#8ce99a', '#ffd166', '#f1fff3', '#1d6b3a'], ['#74c0fc', '#ffa8a8', '#e7f5ff', '#1c4a7a'], ['#d0bfff', '#ffd8a8', '#f8f0fc', '#4b2a7a']],
  flowers: [['#ff4d7e', '#3fd08a', '#ffd1df', '#8a1c3e'], ['#ffd43b', '#51cf66', '#fff9db', '#7a5a00'], ['#cc5de8', '#40c057', '#f3d9fa', '#5a1a6e'], ['#ff8787', '#69db7c', '#fff0f0', '#8a2020']],
  love: [['#ff4d7e', '#ffb3c7', '#fff0f5', '#8a1c3e'], ['#e64980', '#ffd166', '#ffe3ec', '#6e1240'], ['#f06595', '#cc5de8', '#fde2f0', '#6a1450'], ['#ff6b6b', '#ffa94d', '#fff0e6', '#7a1f1f']],
  kids: [['#ffd43b', '#74c0fc', '#fff9db', '#6b5300'], ['#ff8787', '#63e6be', '#fff0f0', '#7a2a2a'], ['#b197fc', '#ffd8a8', '#f3f0ff', '#3f2a7a'], ['#69db7c', '#ffa8a8', '#ebfbee', '#1f5a2a']],
  animals: [['#f1f3f5', '#343a40', '#ffc9c9', '#212529'], ['#ffa94d', '#fff4e6', '#ff8787', '#7a3c00'], ['#ced4da', '#f8f9fa', '#ffd8a8', '#495057'], ['#d9a066', '#f6e4b8', '#ff8fa3', '#5a3510']],
  party: [['#ff6b6b', '#ffd43b', '#fff9db', '#7a1f1f'], ['#4dabf7', '#ff8cc6', '#e7f5ff', '#16457a'], ['#9775fa', '#63e6be', '#f3f0ff', '#3b2480'], ['#ffa94d', '#74c0fc', '#fff4e6', '#7a4100']],
  seasonal: [['#ffd166', '#2b8a3e', '#fff3c4', '#5c3b00'], ['#e7a93a', '#1971c2', '#fff4d6', '#5a3a00'], ['#ffffff', '#ff6b6b', '#e7f5ff', '#364fc7'], ['#ff922b', '#5c940d', '#fff4e6', '#5c2a00']],
  fireworks: [['#ff6b6b', '#ffd43b', '#ffffff', '#5a0f0f'], ['#4dabf7', '#e599f7', '#ffffff', '#102a4a'], ['#69db7c', '#ffd43b', '#ffffff', '#103a1a'], ['#f783ac', '#74c0fc', '#ffffff', '#4a1030']],
  magic: [['#9775fa', '#63e6be', '#e5dbff', '#2b1670'], ['#cc5de8', '#ffd43b', '#f8f0fc', '#4a1060'], ['#3bc9db', '#b197fc', '#e3fafc', '#0b4a55'], ['#ff8787', '#9775fa', '#fff0f0', '#4a1020']],
  space: [['#748ffc', '#ffd43b', '#e5edff', '#1a2050'], ['#e599f7', '#66d9e8', '#f8f0fc', '#3a1050'], ['#ff922b', '#91a7ff', '#fff4e6', '#4a2000'], ['#63e6be', '#da77f2', '#e6fcf5', '#0a3a30']],
  cars: [['#fa5252', '#343a40', '#ffe3e3', '#1a1a1a'], ['#ffd43b', '#212529', '#fff9db', '#1a1a1a'], ['#4dabf7', '#343a40', '#e7f5ff', '#101820'], ['#212529', '#adb5bd', '#f1f3f5', '#000']],
  sky: [['#f8f9fa', '#4dabf7', '#ffffff', '#1c3a5a'], ['#ffd43b', '#1c7ed6', '#fff9db', '#103050'], ['#ff6b6b', '#ced4da', '#fff0f0', '#3a1010'], ['#20c997', '#f8f9fa', '#e6fcf5', '#0a3a2a']],
  luxury: [['#ffd166', '#58e1ff', '#fff3c4', '#7a5300'], ['#e9ecef', '#c084fc', '#ffffff', '#495057'], ['#ffd166', '#ff4d7e', '#fff3c4', '#6b3a00'], ['#212529', '#ffd166', '#f8f9fa', '#000']],
  palaces: [['#ffd166', '#ff4d7e', '#fff3c4', '#7a4a00'], ['#ffe066', '#748ffc', '#fff9db', '#6a5000'], ['#f1f3f5', '#ffd166', '#ffffff', '#5a5a5a'], ['#e7a93a', '#9775fa', '#fff4d6', '#5a3500']],
  dragons: [['#2f9e44', '#ffd43b', '#d3f9d8', '#0b3a1a'], ['#e03131', '#ffa94d', '#ffe3e3', '#4a0a0a'], ['#7048e8', '#63e6be', '#e5dbff', '#20104a'], ['#1c7ed6', '#e7f5ff', '#d0ebff', '#0a2a4a']],
  legendary: [['#ffd166', '#ff6b6b', '#fff3c4', '#5a3500'], ['#c084fc', '#ffd166', '#f3e8ff', '#3a1060'], ['#58e1ff', '#ffd166', '#e3fafc', '#0a3a4a'], ['#ff922b', '#ffe066', '#fff4e6', '#5a2000']],
};

/* الرسمات الأساسية: دالة (a,b,c,d) → SVG داخل مربع 64 (المركز 32،32، المساحة تقريباً 12..52) */
const M = {
  // عادية
  star: (a, b, c, d) => star5(32, 33, 19, a) + star5(32, 33, 9, c) + L('M24 27l3 1', d, 1.5),
  candy: (a, b, c) => P('M10 26l8 6-8 6zM54 26l-8 6 8 6z', b) + E(32, 32, 15, 11, a) + L('M22 26c6 4 14 8 20 12M24 38c6-4 12-8 18-10', c, 2.5),
  cupcake: (a, b, c, d) => P('M18 34h28l-4 18H22z', b) + L('M24 34l2 18M32 34v18M40 34l-2 18', d, 1.2) + P('M16 34c0-12 32-12 32 0z', a) + C(32, 20, 4, '#ff4d6d') + C(24, 30, 1.6, c) + C(38, 29, 1.6, c),
  donut: (a, b, c, d) => C(32, 32, 19, '#d9a066') + C(32, 30, 17, a) + C(32, 31, 6, '#1a1036') + [[22, 24], [40, 22], [43, 36], [24, 40], [33, 43]].map(([x, y], i) => R(x, y, 4, 1.6, i % 2 ? b : c, .8, `transform="rotate(${i * 40} ${x} ${y})"`)).join(''),
  icecream: (a, b, c, d) => P('M22 32l10 24 10-24z', '#e7a93a') + L('M25 36l12 8M27 42l8-6', '#c8861f', 1.2) + C(26, 28, 8, a) + C(38, 28, 8, b) + C(32, 20, 8, c) + C(32, 12, 3, '#ff4d6d'),
  lollipop: (a, b, c) => R(30.5, 34, 3, 22, '#f1f3f5', 1.5) + C(32, 24, 15, a) + P('M32 24m-10 0a10 10 0 1 0 20 0a6 6 0 1 0-12 0a2 2 0 1 0 4 0', 'none', c, 3) + C(32, 24, 15, 'none', `stroke="${b}" stroke-width="2"`),
  cookie: (a, b, c, d) => C(32, 32, 19, '#c98a4b') + C(32, 32, 16, '#e0a96d') + [[25, 25], [38, 27], [30, 38], [41, 38], [22, 34]].map(([x, y]) => C(x, y, 2.6, d)) .join('') + P('M44 20a10 10 0 0 1 5 8', 'none', c, 2),
  juice: (a, b, c, d) => P('M20 18h24l-3 36H23z', '#e7f5ff', d, 1.5) + P('M21.5 28h21l-2.3 25H23.8z', a) + L('M36 18l6-10', b, 3) + C(26, 22, 6, b) + E(32, 28, 10.5, 2, c),
  // ورود
  rose: (a, b, c) => L('M32 56V34', b, 3) + P('M32 46c-8-2-10-8-8-10 4 1 7 4 8 10z', b) + C(32, 25, 12, a) + L('M25 26a7 7 0 0 1 14 0M28 21a4 4 0 0 1 8 0M27 30c3 2 7 2 10 0', c, 2),
  tulip: (a, b, c) => L('M32 56V32', b, 3) + P('M32 50c6-8 12-10 14-8-2 6-8 10-14 8z', b) + P('M20 16l6 8 6-10 6 10 6-8v12a12 12 0 0 1-24 0z', a) + L('M32 14v20', c, 1.5),
  sunflower: (a, b, c, d) => L('M32 56V38', b, 3) + Array.from({ length: 12 }, (_, i) => E(32, 13, 4, 8, a, `transform="rotate(${i * 30} 32 26)"`)).join('') + C(32, 26, 8, d) + C(30, 24, 1.3, c) + C(34, 28, 1.3, c),
  lily: (a, b, c, d) => L('M32 56V34', b, 3) + [0, 72, 144, 216, 288].map((r) => P('M32 30c-4-6-4-14 0-18 4 4 4 12 0 18z', a, d, .8, `transform="rotate(${r} 32 30)"`)).join('') + C(32, 30, 3, c),
  daisy: (a, b, c) => L('M32 56V36', b, 3) + Array.from({ length: 14 }, (_, i) => E(32, 15, 3, 9, '#ffffff', `transform="rotate(${i * 25.7} 32 26)"`)).join('') + C(32, 26, 7, a) + C(30, 24, 2, c),
  lotus: (a, b, c, d) => E(32, 50, 20, 4, b) + P('M32 18c6 8 6 22 0 30-6-8-6-22 0-30z', a) + P('M20 26c8 2 12 12 12 22-8-2-14-10-12-22zM44 26c-8 2-12 12-12 22 8-2 14-10 12-22z', a, d, .8) + P('M12 36c8 0 16 6 20 12-10 0-18-4-20-12zM52 36c-8 0-16 6-20 12 10 0 18-4 20-12z', c),
  blossom: (a, b, c, d) => L('M10 50C20 40 30 30 54 14', '#7a4a2a', 3) + [[22, 38], [36, 26], [46, 18]].map(([x, y]) => [0, 72, 144, 216, 288].map((r) => C(x, y - 5, 4.2, a, `transform="rotate(${r} ${x} ${y})"`)).join('') + C(x, y, 2.4, c)).join(''),
  jasmine: (a, b, c, d) => L('M14 50c10-6 20-6 36-2', b, 2.5) + [[20, 30], [32, 22], [44, 30], [30, 40]].map(([x, y]) => [0, 72, 144, 216, 288].map((r) => E(x, y - 5, 3, 5, '#ffffff', `stroke="${d}" stroke-width=".5" transform="rotate(${r} ${x} ${y})"`)).join('') + C(x, y, 2, a)).join(''),
  // حب
  heart: (a, b, c) => P('M32 54C12 40 10 26 19 19c6-4 11-2 13 3 2-5 7-7 13-3 9 7 7 21-13 35z', a) + P('M21 25c1-4 5-5 8-4', 'none', c, 3),
  loveletter: (a, b, c, d) => R(12, 20, 40, 28, '#fff5f8', 3, `stroke="${d}" stroke-width="1.5"`) + L('M12 22l20 15 20-15', d, 1.5) + P('M32 42c-7-5-8-10-5-12 2-1 4 0 5 2 1-2 3-3 5-2 3 2 2 7-5 12z', a),
  ring: (a, b, c, d) => C(32, 40, 13, 'none', `stroke="#ffd166" stroke-width="5"`) + P('M24 22l8-10 8 10-8 8z', b, '#ffffff', 1.5) + L('M24 22h16M32 12v18', c, 1),
  cupid: (a, b, c, d) => L('M10 54L54 10', '#c8861f', 3) + P('M54 10l-10 2 8 8z', '#e7a93a') + P('M10 54l4-10 6 6zM14 58l-2-6 6 2z', b) + P('M32 44C20 36 19 28 24 24c4-3 7-1 8 2 1-3 4-5 8-2 5 4 4 12-8 20z', a),
  lovebox: (a, b, c, d) => P('M14 28h36v24H14z', a) + P('M12 22h40v8H12z', b) + R(29, 22, 6, 30, c) + P('M32 22c-8-10-16-4-10 0zM32 22c8-10 16-4 10 0z', c, d, 1),
  lock: (a, b, c, d) => P('M24 28v-6a8 8 0 0 1 16 0v6', 'none', '#adb5bd', 4) + P('M32 56C14 44 12 32 20 26c5-3 9-1 12 3 3-4 7-6 12-3 8 6 6 18-12 30z', a) + C(32, 38, 3, d) + R(31, 38, 2, 6, d),
  kiss: (a, b, c, d) => P('M12 32c6-8 14-8 20-4 6-4 14-4 20 4-6 10-34 10-40 0z', a) + P('M12 32c10 2 30 2 40 0', 'none', d, 2) + P('M20 28c3-1 6-1 8 1', 'none', c, 2),
  doves: (a, b, c, d) => [[22, 34, 1], [42, 30, -1]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s} 1)">${P('M-12 0c4-8 14-10 20-4l6-2-4 6c0 8-10 12-18 8l-8 2z', '#ffffff', d, 1)}${P('M-4-4c2-8 10-12 12-6', '#e9ecef', d, .8)}${C(8, -4, 1.2, d)}</g>`).join('') + P('M32 40C26 36 26 32 28 31c2-1 3 0 4 1 1-1 2-2 4-1 2 1 2 5-4 9z', a),
  // أطفال
  teddy: (a, b, c, d) => C(20, 17, 6, '#c98a4b') + C(44, 17, 6, '#c98a4b') + E(32, 48, 14, 10, '#d9a066') + C(32, 28, 14, '#d9a066') + E(32, 33, 6.5, 4.8, '#f6e4b8') + C(27, 25, 1.8, d) + C(37, 25, 1.8, d) + C(32, 31, 1.8, d) + P('M24 40l8 4 8-4-8 6z', a),
  kite: (a, b, c, d) => P('M32 8l14 18-14 22-14-22z', a) + P('M32 8v40M18 26h28', 'none', c, 1.5) + P('M32 48c-4 4 4 6 0 10', 'none', d, 1.5) + P('M30 52l-4 2 4 1zM32 57l4 1-4 2z', b),
  blocks: (a, b, c, d) => R(12, 34, 18, 18, a, 2) + R(34, 34, 18, 18, b, 2) + R(23, 15, 18, 18, c, 2, `stroke="${d}" stroke-width="1"`) + `<g fill="${d}" font-family="Arial" font-weight="900" font-size="11" text-anchor="middle"><text x="21" y="47">ا</text><text x="43" y="47">ب</text><text x="32" y="28">ت</text></g>`,
  duck: (a, b, c, d) => E(30, 42, 18, 11, a) + C(40, 26, 9, a) + P('M48 26l8 2-8 3z', '#ff922b') + C(42, 24, 1.6, d) + P('M18 40c6 2 10 0 12-4', 'none', c, 2.5),
  ball: (a, b, c, d) => C(32, 32, 19, '#ffffff', `stroke="${d}" stroke-width="1"`) + P('M32 13a19 19 0 0 1 0 38', a) + P('M13 32h38', 'none', b, 4) + C(32, 32, 5, c, `stroke="${d}" stroke-width="1"`),
  train: (a, b, c, d) => R(12, 26, 24, 18, a, 3) + R(36, 32, 16, 12, b, 2) + R(16, 18, 10, 8, c, 1) + R(40, 22, 5, 10, d) + [18, 30, 44].map((x) => C(x, 47, 5, d) + C(x, 47, 2, c)).join(''),
  robot: (a, b, c, d) => R(18, 16, 28, 22, a, 5) + C(26, 27, 4, c) + C(38, 27, 4, c) + C(26, 27, 1.8, d) + C(38, 27, 1.8, d) + R(26, 33, 12, 2, d, 1) + L('M32 16V9', d, 2) + C(32, 8, 3, b) + R(22, 40, 20, 14, b, 3) + R(12, 42, 8, 4, a, 2) + R(44, 42, 8, 4, a, 2),
  rainbow: (a, b, c, d) => ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].map((col, i) => P(`M${8 + i * 3} 44a${24 - i * 3} ${24 - i * 3} 0 0 1 ${48 - i * 6} 0`, 'none', col, 3.2)).join('') + E(12, 46, 8, 5, '#ffffff') + E(52, 46, 8, 5, '#ffffff'),
  // حيوانات
  panda: (a, b, c, d) => C(19, 18, 7, b) + C(45, 18, 7, b) + C(32, 34, 18, a) + E(25, 31, 5, 6, b, 'transform="rotate(-20 25 31)"') + E(39, 31, 5, 6, b, 'transform="rotate(20 39 31)"') + C(25, 31, 1.8, '#fff') + C(39, 31, 1.8, '#fff') + E(32, 39, 3.5, 2.5, b) + P('M29 43c2 2 4 2 6 0', 'none', d, 1.2) + C(22, 40, 2.5, c, 'opacity=".7"') + C(42, 40, 2.5, c, 'opacity=".7"'),
  cat: (a, b, c, d) => P('M14 16l8 12h20l8-12-4 20H18z', a) + C(32, 36, 16, a) + C(26, 34, 2.5, d) + C(38, 34, 2.5, d) + P('M30 39h4l-2 2z', c) + L('M14 38l9 1M14 42l9-1M50 38l-9 1M50 42l-9-1', d, 1) + P('M18 18l3 6M46 18l-3 6', 'none', c, 2),
  bunny: (a, b, c, d) => E(24, 16, 5, 13, a) + E(40, 16, 5, 13, a) + E(24, 16, 2.5, 9, c) + E(40, 16, 2.5, 9, c) + C(32, 38, 15, a) + C(26, 35, 2, d) + C(38, 35, 2, d) + E(32, 41, 2.5, 2, c) + L('M32 43v3', d, 1),
  fox: (a, b, c, d) => P('M12 14l10 12M52 14L42 26', 'none', a, 6) + P('M12 22c2 16 10 28 20 30 10-2 18-14 20-30-6 4-14 4-20 4s-14 0-20-4z', a) + P('M20 38c4 6 8 12 12 14 4-2 8-8 12-14-4 2-8 2-12 2s-8 0-12-2z', b) + C(25, 32, 2, d) + C(39, 32, 2, d) + C(32, 46, 2.2, d),
  owl: (a, b, c, d) => E(32, 36, 17, 20, a) + P('M16 20l6 6M48 20l-6 6', 'none', a, 4) + C(25, 30, 7, '#ffffff') + C(39, 30, 7, '#ffffff') + C(25, 30, 3.5, d) + C(39, 30, 3.5, d) + P('M30 36l2 4 2-4z', '#ff922b') + E(32, 46, 9, 8, b),
  penguin: (a, b, c, d) => E(32, 36, 16, 20, d) + E(32, 40, 11, 15, '#ffffff') + C(27, 26, 2, '#fff') + C(37, 26, 2, '#fff') + C(27, 26, 1, d) + C(37, 26, 1, d) + P('M29 31h6l-3 4z', '#ff922b') + E(24, 56, 5, 2, '#ff922b') + E(40, 56, 5, 2, '#ff922b') + R(18, 34, 28, 4, a, 2),
  falcon: (a, b, c, d) => P('M8 30c8-6 16-6 22-2l2-8 6 6c8-2 16 2 20 8-8 0-14 2-18 6v14l-6-6-6 6V40c-6-4-12-6-20-10z', a, d, 1) + C(36, 24, 1.6, d) + P('M40 24l6 2-6 2z', '#ffd166') + P('M26 34l6 4 6-4', 'none', b, 1.5),
  camel: (a, b, c, d) => P('M10 44c0-8 6-14 12-14 2-8 8-10 10-4 2-6 8-6 10 2 4 0 6 4 6 8l6-2c2-6 6-8 8-4l-4 4-2 10H10z', a) + [16, 22, 40, 46].map((x) => R(x, 44, 3, 10, a)).join('') + C(54, 34, 1.2, d) + P('M24 36h18', 'none', b, 3) + R(26, 32, 14, 4, c, 1),
  // مناسبات
  cake: (a, b, c, d) => R(14, 34, 36, 18, a, 3) + R(18, 24, 28, 12, b, 3) + P('M14 38c4 3 8 3 12 0s8-3 12 0 8 3 12 0', 'none', c, 2.5) + [26, 32, 38].map((x) => R(x - 1, 16, 2, 8, '#f1f3f5') + E(x, 14, 1.6, 2.6, '#ffd43b')).join(''),
  balloon: (a, b, c, d) => L('M32 42c-2 6 2 10 0 16', d, 1.2) + E(32, 26, 13, 16, a) + P('M30 42h4l-2 3z', a) + P('M26 18c2-4 6-5 8-4', 'none', c, 2.5),
  present: (a, b, c, d) => R(14, 28, 36, 26, a, 2) + R(12, 22, 40, 8, a, 2, `stroke="${d}" stroke-width=".8"`) + R(29, 22, 6, 32, b) + P('M32 22c-10-10-18-2-8 0zM32 22c10-10 18-2 8 0z', b, d, 1),
  partyhat: (a, b, c, d) => P('M32 8L18 52h28z', a) + P('M24 34l14-4M21 44l20-6M28 20l8-2', 'none', b, 3) + C(32, 8, 4, c) + E(32, 52, 15, 3, b),
  confetti: (a, b, c, d) => P('M14 54l10-30 16 16z', '#ffd166', d, 1) + [[34, 14, a], [44, 22, b], [50, 12, c], [40, 30, a], [52, 34, b], [28, 10, b]].map(([x, y, col], i) => R(x, y, 5, 2.5, col, 1, `transform="rotate(${i * 37} ${x} ${y})"`)).join('') + C(46, 42, 2, a) + C(36, 8, 2, c),
  candle: (a, b, c, d) => R(24, 26, 16, 28, a, 2) + L('M24 34h16M24 42h16', b, 1.5) + L('M32 26v-4', d, 1.5) + P('M32 8c5 6 5 10 0 14-5-4-5-8 0-14z', '#ffa94d') + P('M32 13c2 3 2 5 0 7-2-2-2-4 0-7z', '#fff3bf'),
  trophy: (a, b, c, d) => P('M20 12h24v12a12 12 0 0 1-24 0z', a) + P('M20 16h-6a6 6 0 0 0 6 10M44 16h6a6 6 0 0 1-6 10', 'none', a, 3) + R(29, 36, 6, 8, a) + R(22, 44, 20, 8, d, 2) + star5(32, 22, 5, c),
  medal: (a, b, c, d) => P('M22 8h8l4 16h-8zM42 8h-8l-4 16h8z', b) + C(32, 38, 15, a) + C(32, 38, 10, 'none', `stroke="${c}" stroke-width="2"`) + star5(32, 38, 6, c),
  // موسمية
  lantern: (a, b, c, d) => L('M32 6v6', d, 2) + P('M24 12h16l4 8H20z', a) + P('M20 20h24l-4 28H24z', b, a, 2) + L('M28 20l-2 28M36 20l2 28', a, 1.5) + E(32, 34, 4, 7, '#ffe066') + P('M24 48h16l-3 6H27z', a),
  crescent: (a, b, c, d) => P('M40 10a22 22 0 1 0 0 44 18 18 0 1 1 0-44z', a) + star5(46, 22, 5, c),
  dates: (a, b, c, d) => E(32, 48, 20, 6, b) + [[22, 40], [32, 38], [42, 40], [27, 32], [37, 32]].map(([x, y]) => E(x, y, 5, 7, '#7a3b12', `stroke="${d}" stroke-width=".6"`)).join('') + P('M26 34c1-2 3-3 4-2', 'none', c, 1),
  snowman: (a, b, c, d) => C(32, 44, 13, '#ffffff', `stroke="${d}" stroke-width=".8"`) + C(32, 24, 9, '#ffffff', `stroke="${d}" stroke-width=".8"`) + R(24, 8, 16, 8, d, 1) + R(22, 15, 20, 3, d) + C(29, 22, 1.3, d) + C(35, 22, 1.3, d) + P('M32 25l7 2-7 1z', '#ff922b') + L('M24 33h16', b, 3),
  pumpkin: (a, b, c, d) => E(32, 36, 20, 16, a) + P('M32 20v32M22 22c-6 8-6 22 0 28M42 22c6 8 6 22 0 28', 'none', d, 1, 'opacity=".4"') + P('M30 20c0-6 2-8 6-10', 'none', '#2b8a3e', 3),
  flag: (a, b, c, d) => R(14, 8, 3, 48, '#adb5bd', 1) + P('M17 10c10-4 18 4 30 0v22c-12 4-20-4-30 0z', a) + P('M17 17c10-4 18 4 30 0v8c-12 4-20-4-30 0z', '#ffffff') + P('M17 10h8v22h-8z', b),
  palm: (a, b, c, d) => P('M30 56l2-30 4 30z', '#8a5a2b') + [-60, -25, 10, 45, 80, 120].map((r) => P('M32 24c6-2 14 0 18 6-6-2-12-2-18-6z', b, '', 0, `transform="rotate(${r} 32 24)"`)).join('') + C(30, 28, 2.5, '#7a3b12') + C(34, 29, 2.5, '#7a3b12'),
  coffeepot: (a, b, c, d) => P('M24 52h20l-2-24c0-6-4-10-8-12-4 2-8 6-8 12z', a, d, 1) + P('M26 22c-8-4-14 0-16 6l6 2c2-4 6-6 10-4', a, d, 1) + P('M42 28c6 0 8 8 4 14', 'none', a, 3) + C(34, 12, 3, b) + L('M26 40h16', b, 2),
  // ألعاب نارية
  rocketfw: (a, b, c, d) => R(28, 16, 8, 30, a, 2) + P('M28 16l4-8 4 8z', b) + P('M28 40l-6 8h6zM36 40l6 8h-6z', b) + L('M32 46v12', '#adb5bd', 1.5) + star(32, 6, 4, c),
  burst: (a, b, c) => Array.from({ length: 12 }, (_, i) => L(`M32 32L${32 + 22 * Math.cos(i * Math.PI / 6)} ${32 + 22 * Math.sin(i * Math.PI / 6)}`, i % 2 ? a : b, 2.5)).join('') + Array.from({ length: 12 }, (_, i) => C(32 + 24 * Math.cos(i * Math.PI / 6), 32 + 24 * Math.sin(i * Math.PI / 6), 2.2, c)).join('') + C(32, 32, 4, c),
  sparkler: (a, b, c, d) => L('M16 54L34 30', '#868e96', 3) + Array.from({ length: 10 }, (_, i) => L(`M38 24l${12 * Math.cos(i * 0.63)} ${12 * Math.sin(i * 0.63)}`, i % 2 ? a : b, 1.5)).join('') + C(38, 24, 4, c),
  fountain: (a, b, c, d) => P('M22 54l4-14h12l4 14z', b) + Array.from({ length: 7 }, (_, i) => P(`M32 40c${-14 + i * 4.6} -24 ${-18 + i * 6} -26 ${-20 + i * 6.6} -2`, 'none', i % 2 ? a : c, 1.8)).join(''),
  popper: (a, b, c, d) => P('M14 50l14-26 12 12z', a) + L('M18 44l8 4M22 36l10 6', b, 2) + [[40, 18, b], [48, 26, c], [36, 10, a], [52, 14, b]].map(([x, y, col]) => star(x, y, 4, col)).join('') + C(44, 34, 2, c),
  wheel: (a, b, c, d) => C(32, 32, 6, d) + Array.from({ length: 8 }, (_, i) => P('M32 26c4-8 12-12 18-10-6 2-10 6-12 12z', i % 2 ? a : b, '', 0, `transform="rotate(${i * 45} 32 32)"`)).join('') + C(32, 32, 3, c),
  comet: (a, b, c, d) => P('M10 54L40 20l6 6z', b, '', 0, 'opacity=".6"') + P('M16 56L42 26', 'none', a, 4) + C(46, 20, 8, c) + C(46, 20, 5, a),
  starshell: (a, b, c) => star5(32, 32, 22, a) + star5(32, 32, 13, b) + star5(32, 32, 6, c),
  // سحر
  wand: (a, b, c, d) => L('M14 52L42 24', d, 4) + L('M14 52L20 46', c, 4) + star5(46, 18, 10, a) + star(24, 18, 4, b) + star(52, 38, 3, b),
  potion: (a, b, c, d) => R(28, 10, 8, 8, '#c8861f', 1) + P('M27 18h10v8c8 4 12 10 12 16a17 17 0 0 1-34 0c0-6 4-12 12-16z', '#e7f5ff', d, 1) + P('M17 40a15 12 0 0 0 30 0z', a) + C(26, 44, 2, c) + C(36, 46, 1.4, c) + C(31, 38, 1, c),
  crystalball: (a, b, c, d) => P('M18 52h28l-4-6H22z', '#c8861f') + C(32, 30, 17, a, 'opacity=".9"') + C(32, 30, 17, 'none', `stroke="${c}" stroke-width="1.5"`) + P('M24 22c2-4 6-6 10-6', 'none', '#ffffff', 2.5) + star(36, 32, 5, c),
  spellbook: (a, b, c, d) => R(12, 14, 40, 38, a, 3) + R(16, 14, 3, 38, d) + C(34, 32, 9, 'none', `stroke="${c}" stroke-width="2"`) + star5(34, 32, 6, c) + R(48, 20, 4, 8, b),
  lightning: (a, b, c) => P('M36 6L16 36h12l-6 22 22-32H32z', a, c, 1.5),
  rune: (a, b, c, d) => C(32, 32, 20, b, `stroke="${c}" stroke-width="2"`) + P('M32 16v32M22 22l20 20M42 22L22 42', 'none', a, 3) + C(32, 32, 5, c),
  orb: (a, b, c) => C(32, 32, 16, a) + C(32, 32, 22, 'none', `stroke="${b}" stroke-width="1.5" stroke-dasharray="3 4"`) + C(27, 27, 5, c, 'opacity=".8"') + E(32, 32, 24, 7, 'none', `stroke="${c}" stroke-width="1.5" transform="rotate(-25 32 32)"`),
  phoenixfeather: (a, b, c, d) => P('M20 56C24 36 34 18 48 8c-4 14-10 30-24 44z', a) + P('M22 50c6-10 14-22 24-36', 'none', c, 1.5) + Array.from({ length: 6 }, (_, i) => L(`M${26 + i * 3.4} ${44 - i * 5.6}l${6 - i * .4} -2`, b, 1.4)).join(''),
  // فضاء
  planet: (a, b, c) => C(32, 32, 15, a) + E(32, 32, 26, 7, 'none', `stroke="${b}" stroke-width="3" transform="rotate(-18 32 32)"`) + P('M20 26c4 2 10 2 14-2', 'none', c, 2),
  rocket: (a, b, c, d) => P('M32 6c10 8 12 22 8 34H24C20 28 22 14 32 6z', '#f1f3f5') + C(32, 24, 5, b, `stroke="${d}" stroke-width="2"`) + P('M24 34l-8 10 8-2zM40 34l8 10-8-2z', a) + P('M28 42h8l-4 14z', '#ffd166'),
  ufo: (a, b, c, d) => E(32, 26, 10, 9, b, 'opacity=".85"') + E(32, 34, 24, 7, a) + E(32, 31, 24, 4, c, 'opacity=".5"') + [18, 32, 46].map((x) => C(x, 35, 2, '#ffe066')).join('') + P('M22 40l-6 14h32l-6-14z', '#ffe066', '', 0, 'opacity=".25"'),
  astronaut: (a, b, c, d) => R(20, 32, 24, 20, '#f1f3f5', 6) + C(32, 24, 13, '#f1f3f5') + E(32, 25, 9, 7, b) + P('M26 22c2-2 6-3 8-2', 'none', c, 2) + R(26, 38, 12, 6, a, 2) + R(14, 34, 8, 12, '#dee2e6', 3) + R(42, 34, 8, 12, '#dee2e6', 3),
  moon: (a, b, c, d) => C(32, 32, 19, a) + C(25, 26, 4, b, 'opacity=".6"') + C(38, 38, 5, b, 'opacity=".6"') + C(37, 22, 2.5, b, 'opacity=".6"') + C(24, 40, 2, b, 'opacity=".6"'),
  galaxy: (a, b, c) => Array.from({ length: 3 }, (_, i) => P('M32 32c0-10 10-16 20-12-8-2-16 4-16 12', 'none', i % 2 ? a : b, 3, `transform="rotate(${i * 120} 32 32)"`)).join('') + C(32, 32, 5, c) + [[14, 16], [50, 50], [48, 14], [14, 48]].map(([x, y]) => star(x, y, 2.5, c)).join(''),
  satellite: (a, b, c, d) => R(26, 26, 12, 12, '#adb5bd', 2) + R(6, 28, 18, 8, a, 1) + R(40, 28, 18, 8, a, 1) + L('M12 28v8M18 28v8M46 28v8M52 28v8', b, 1) + P('M32 26l6-10', 'none', d, 1.5) + C(38, 15, 3, c),
  blackhole: (a, b, c) => C(32, 32, 20, a, 'opacity=".5"') + Array.from({ length: 4 }, (_, i) => E(32, 32, 22 - i * 4, 8 - i * 1.5, 'none', `stroke="${i % 2 ? b : c}" stroke-width="2" transform="rotate(${-20 + i * 8} 32 32)"`)).join('') + C(32, 32, 7, '#000'),
  // سيارات
  sportscar: (a, b, c, d) => P('M6 42l6-8c2-3 6-4 10-4h12c4 0 8 2 12 6l8 2c3 1 4 3 4 6v2H6z', a) + P('M20 30h12l8 6H16z', c, '', 0, 'opacity=".9"') + [18, 46].map((x) => C(x, 46, 6, d) + C(x, 46, 2.5, '#adb5bd')).join('') + R(52, 40, 4, 2, '#ffe066'),
  suv: (a, b, c, d) => P('M8 46V34l6-10h28l8 10h6v12z', a) + P('M16 26h10v8H12zM30 26h10l6 8H30z', c) + [18, 46].map((x) => C(x, 47, 6, d) + C(x, 47, 2.5, '#adb5bd')).join('') + R(10, 20, 30, 3, b, 1),
  classic: (a, b, c, d) => P('M6 44c0-6 4-8 10-8l6-10h18l8 10c6 0 10 2 10 8z', a) + P('M24 28h7v8h-11zM34 28h5l6 8H34z', c) + [16, 48].map((x) => C(x, 46, 6, d) + C(x, 46, 3, '#f1f3f5')).join('') + L('M6 40h52', b, 1.5),
  motorbike: (a, b, c, d) => [16, 48].map((x) => C(x, 44, 9, 'none', `stroke="${d}" stroke-width="4"`)).join('') + P('M16 44l12-14h12l8 14M28 30l-4-8h-6', 'none', a, 4) + P('M30 28h12l4 6H32z', a) + L('M44 24l4-4h4', b, 3),
  limo: (a, b, c, d) => P('M4 44v-8l6-6h44l6 8v6z', a) + [12, 24, 36, 46].map((x) => R(x, 32, 8, 5, c, 1)).join('') + [12, 52].map((x) => C(x, 46, 5, d) + C(x, 46, 2, '#adb5bd')).join(''),
  racecar: (a, b, c, d) => P('M4 42l4-6h16l6-6h10l4 6h14l6 6v4H4z', a) + R(4, 30, 8, 4, b) + C(32, 33, 4, c) + `<text x="22" y="42" font-family="Arial" font-weight="900" font-size="8" fill="${c}">7</text>` + [14, 48].map((x) => C(x, 46, 6, d)).join(''),
  truck: (a, b, c, d) => R(6, 22, 32, 22, b, 2) + P('M38 30h10l8 8v6H38z', a) + R(42, 32, 6, 5, c) + [14, 30, 48].map((x) => C(x, 46, 5, d) + C(x, 46, 2, '#adb5bd')).join(''),
  bus: (a, b, c, d) => R(6, 18, 52, 26, a, 5) + [10, 21, 32, 43].map((x) => R(x, 22, 9, 9, c, 1)).join('') + R(6, 34, 52, 3, b) + [16, 48].map((x) => C(x, 46, 5, d)).join(''),
  // طائرات ويخوت
  jet: (a, b, c, d) => P('M6 34l40-6c6-1 12 1 12 6s-6 7-12 6z', a, d, .8) + P('M24 30l8-16h6l-4 16zM24 38l8 14h6l-4-14zM8 32l-2-8h4l6 8z', b) + [36, 42, 48].map((x) => C(x, 33, 1.6, c)).join(''),
  helicopter: (a, b, c, d) => E(30, 36, 14, 10, a) + C(24, 34, 6, c) + P('M44 36h14l2-6', 'none', a, 3) + L('M8 22h44M30 22v4', d, 2.5) + L('M20 48h22M24 46v2M38 46v2', d, 2),
  yacht: (a, b, c, d) => P('M4 40h56l-8 12H12z', a, d, 1) + P('M14 40l4-10h26l8 10z', '#f1f3f5') + R(20, 32, 6, 4, c) + R(30, 32, 6, 4, c) + R(26, 22, 14, 8, '#f1f3f5', 2) + P('M2 56c6-3 10-3 16 0s10 3 16 0 10-3 16 0 8 3 12 0', 'none', b, 2),
  airballoon: (a, b, c, d) => E(32, 24, 18, 20, a) + P('M32 4c-8 8-8 32 0 40M32 4c8 8 8 32 0 40', 'none', b, 3) + L('M20 38l6 12M44 38l-6 12', d, 1) + R(26, 50, 12, 8, '#8a5a2b', 2),
  seaplane: (a, b, c, d) => P('M8 30l38-4c6 0 10 2 10 6s-4 4-10 4H8z', a) + P('M22 22h20l-2 8H24z', b) + L('M18 36v8M42 36v8', d, 1.5) + R(12, 44, 40, 4, b, 2) + P('M4 54c8-3 14-3 20 0s12 3 18 0 12-3 18 0', 'none', '#4dabf7', 2),
  sailboat: (a, b, c, d) => P('M32 8v34L12 40z', a) + P('M34 14v28h18z', c) + P('M8 44h48l-6 8H14z', b) + P('M2 56c8-3 14-3 20 0s12 3 18 0 12-3 22 0', 'none', '#4dabf7', 2),
  airship: (a, b, c, d) => E(30, 24, 24, 11, a) + P('M50 24l10-8v16z', b) + L('M14 24h32', c, 1.5) + R(22, 38, 16, 7, b, 2) + L('M24 34v4M36 34v4', d, 1.5),
  speedboat: (a, b, c, d) => P('M4 40h44l12-6-6 14H10z', a, d, .8) + P('M24 40l6-8h12l4 8z', c) + L('M48 34l6-4', d, 2) + P('M2 52c4-2 8-4 14-2', 'none', '#ffffff', 2) + P('M2 56c8-3 14-3 20 0s12 3 18 0', 'none', '#4dabf7', 2),
  // فاخرة
  diamond: (a, b, c) => P('M18 20h28l10 12-24 24L8 32z', b) + L('M8 32h48M24 20l-6 12 14 24 14-24-6-12M32 20l-8 12M32 20l8 12', c, 1.6),
  goldbar: (a, b, c, d) => P('M8 46l6-12h36l6 12z', a, d, 1) + P('M18 34l4-10h20l4 10z', a, d, 1) + P('M14 34h36', 'none', c, 1.5) + `<text x="32" y="43" text-anchor="middle" font-family="Arial" font-size="6" font-weight="900" fill="${d}">999.9</text>`,
  watch: (a, b, c, d) => R(24, 4, 16, 14, d, 3) + R(24, 46, 16, 14, d, 3) + C(32, 32, 16, a) + C(32, 32, 12, c) + L('M32 32V24M32 32l6 4', d, 2) + Array.from({ length: 12 }, (_, i) => C(32 + 10 * Math.cos(i * Math.PI / 6), 32 + 10 * Math.sin(i * Math.PI / 6), .8, d)).join(''),
  perfume: (a, b, c, d) => R(26, 8, 12, 8, a, 2) + R(29, 16, 6, 4, a) + P('M18 22h28v28a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z', b, a, 2) + P('M22 30h20v18H22z', c, '', 0, 'opacity=".5"') + star5(32, 38, 5, a),
  handbag: (a, b, c, d) => P('M24 24v-6a8 8 0 0 1 16 0v6', 'none', d, 3) + P('M12 24h40l-4 30H16z', a) + P('M12 24h40v6H12z', b) + R(29, 30, 6, 6, c, 1),
  necklace: (a, b, c, d) => P('M12 12c0 22 10 34 20 34s20-12 20-34', 'none', '#ffd166', 1.5) + Array.from({ length: 13 }, (_, i) => { const t = i / 12, x = 12 + 40 * t, y = 12 + 34 * Math.sin(Math.PI * t); return C(x, y, 3, c, `stroke="${d}" stroke-width=".4"`); }).join('') + P('M26 48l6 10 6-10z', b),
  chest: (a, b, c, d) => R(10, 30, 44, 24, '#8a5a2b', 3) + P('M10 30c0-14 44-14 44 0z', '#a8622c') + L('M10 30h44M10 42h44', a, 3) + R(28, 32, 8, 10, a, 2) + C(20, 20, 3, c) + C(32, 16, 3, b) + C(44, 20, 3, c),
  scepter: (a, b, c, d) => L('M22 58L40 20', a, 4) + C(42, 16, 8, b) + star(42, 16, 5, c) + P('M36 24l12 0', 'none', a, 3) + C(21, 58, 3, a),
  // قصور
  castle: (a, b, c, d) => R(12, 26, 40, 28, a) + R(8, 18, 12, 36, a) + R(44, 18, 12, 36, a) + [8, 12, 16, 44, 48, 52].map((x) => R(x, 14, 3, 4, a)).join('') + P('M26 54V42a6 6 0 0 1 12 0v12z', d) + P('M14 18L14 8l-6 4zM50 18V8l6 4z', b) + R(30, 30, 4, 6, c),
  throne: (a, b, c, d) => P('M18 58V30h28v28z', a) + P('M20 30V10l6 6 6-10 6 10 6-6v20z', a) + R(22, 18, 20, 12, b) + R(14, 34, 36, 8, b, 2) + C(32, 13, 2.5, c),
  crown: (a, b, c) => P('M10 48l-2-26 14 12 10-20 10 20 14-12-2 26z', a, '#c8861f', 1.5) + R(10, 46, 44, 7, '#e7a93a', 2) + C(32, 38, 3.5, b) + C(20, 40, 2.4, c) + C(44, 40, 2.4, c),
  palace: (a, b, c, d) => R(8, 30, 48, 24, a) + P('M20 30c0-14 24-14 24 0z', b) + P('M8 30c0-8 8-8 8 0zM48 30c0-8 8-8 8 0z', b) + L('M32 10v6', a, 2) + C(32, 9, 2, c) + [14, 26, 38, 50].map((x) => R(x - 2, 38, 4, 8, d, 2)).join(''),
  tower: (a, b, c, d) => P('M24 58V20h16v38z', a) + P('M20 20h24l-12-14z', b) + R(29, 30, 6, 8, d, 3) + R(29, 44, 6, 8, d, 3) + [24, 30, 36].map((x) => R(x, 16, 4, 4, a)).join(''),
  gate: (a, b, c, d) => R(8, 14, 10, 42, a) + R(46, 14, 10, 42, a) + P('M18 22c0-12 28-12 28 0v34H18z', b) + P('M22 56V26c0-8 20-8 20 0v30', 'none', d, 2) + L('M32 16v40M22 36h20', d, 1.5) + C(13, 12, 4, c) + C(51, 12, 4, c),
  dome: (a, b, c, d) => R(12, 38, 40, 18, b) + P('M14 38c0-24 36-24 36 0z', a) + L('M32 8v6', a, 2) + P('M28 8a4 4 0 1 0 8 0', 'none', a, 2) + [18, 28, 36, 46].map((x) => R(x - 1.5, 42, 3, 10, d, 1.5)).join(''),
  fountainroyal: (a, b, c, d) => E(32, 50, 24, 6, b) + R(28, 26, 8, 22, a) + E(32, 26, 14, 4, b) + P('M32 24c-8-10-16-6-18 2M32 24c8-10 16-6 18 2M32 24V8', 'none', c, 2) + C(32, 8, 2.5, c),
  // تنانين
  dragon: (a, b, c, d) => P('M8 46c0-16 12-26 26-24 9 1 16 7 20 16-7-2-10 0-13 4-5-4-12-3-16 2-5-2-9-2-17 2z', a) + P('M30 26c-2-10 4-16 12-18-4 4-4 8-2 12z', b) + C(44, 32, 2.5, d) + P('M50 36l8 2-8 2z', '#ff922b') + P('M14 46c6-8 14-8 20-2', 'none', c, 2.5) + P('M20 26l-6-8 10 4zM28 22l-2-10 6 8z', b),
  phoenix: (a, b, c, d) => P('M32 26C20 10 6 12 4 18c8 0 14 4 18 10-8-2-14 0-16 6 8-2 14 0 18 4l8 2', a) + P('M32 26c12-16 26-14 28-8-8 0-14 4-18 10 8-2 14 0 16 6-8-2-14 0-18 4l-8 2', a) + E(32, 34, 6, 10, b) + C(32, 22, 5, b) + P('M32 44c-6 6-6 12 0 16 6-4 6-10 0-16z', c),
  griffin: (a, b, c, d) => E(34, 40, 16, 10, a) + C(20, 28, 9, '#f1f3f5') + P('M12 30l-6 2 6 2z', '#ffd166') + C(18, 26, 1.6, d) + P('M30 32c4-16 18-22 26-18-6 4-10 10-12 18z', b) + [26, 34, 40, 46].map((x) => R(x, 48, 3, 8, a)).join(''),
  unicorn: (a, b, c, d) => P('M14 52V36c0-12 8-20 18-20h6l8 10-4 4-6-2v24z', '#ffffff', d, 1) + P('M40 16l8-12-2 14z', '#ffd166') + P('M26 18c-6 4-10 12-8 22 2-8 6-14 12-18zM30 16c-2 6 0 12 4 14', a) + C(38, 24, 1.6, d),
  serpent: (a, b, c, d) => P('M6 44c8-10 14 10 22 0s14 10 22 0c4-6 6-14 4-20', 'none', a, 7) + P('M6 44c8-10 14 10 22 0s14 10 22 0c4-6 6-14 4-20', 'none', b, 2, 'stroke-dasharray="2 4"') + E(54, 20, 6, 5, a) + C(55, 18, 1.4, d) + P('M58 22l4 2-4 1z', '#ff6b6b'),
  dragonegg: (a, b, c, d) => P('M32 6c12 0 18 22 18 32a18 18 0 0 1-36 0c0-10 6-32 18-32z', a) + P('M18 30l6-4 6 4 6-4 6 4 6-4', 'none', b, 2) + P('M16 42l8-4 8 4 8-4 8 4', 'none', b, 2) + C(26, 20, 3, c, 'opacity=".7"'),
  pegasus: (a, b, c, d) => P('M12 50V38c0-10 8-18 18-18h6l8 8-4 4-6-2v20z', '#ffffff', d, 1) + P('M26 30C18 18 8 18 4 22c6 0 10 4 12 8-4 0-8 2-8 6 6-2 12 0 16 2z', b) + C(36, 26, 1.6, d) + P('M24 22c-4 2-6 8-4 14', 'none', a, 3),
  kraken: (a, b, c, d) => E(32, 22, 14, 14, a) + C(26, 22, 3, '#ffffff') + C(38, 22, 3, '#ffffff') + C(26, 22, 1.5, d) + C(38, 22, 1.5, d) + [-18, -10, -3, 4, 11, 18].map((dx, i) => P(`M${32 + dx * .6} 32c${dx * .4} 8 ${dx * 1.2} 14 ${dx * .8} 22`, 'none', a, 4)).join('') + [-18, 18].map((dx) => C(32 + dx * 1.4, 54, 2, b)).join(''),
  // أسطورية
  sword: (a, b, c, d) => P('M30 6h4l2 36h-8z', '#e9ecef', d, .8) + L('M32 8v32', c, 1) + R(20, 42, 24, 4, a, 2) + R(30, 46, 4, 10, b, 1) + C(32, 58, 3, a),
  shield: (a, b, c, d) => P('M32 6l20 8v14c0 14-10 24-20 30C22 52 12 42 12 28V14z', a, d, 1.5) + P('M32 12l14 6v10c0 10-7 18-14 22-7-4-14-12-14-22V18z', b) + star5(32, 30, 8, c),
  grail: (a, b, c, d) => P('M16 10h32c0 14-6 24-16 24S16 24 16 10z', a, d, 1) + R(29, 34, 6, 12, a) + P('M20 54h24l-4-8H24z', a) + C(32, 20, 4, b) + P('M18 14h28', 'none', c, 1.5),
  lamp: (a, b, c, d) => P('M10 44c0-6 8-10 18-10h12c6 0 10 2 12 6l8-6-2 10c-2 4-6 6-12 6H16c-4 0-6-2-6-6z', a, d, 1) + P('M26 34c0-6 3-10 6-10s6 4 6 10', b) + P('M4 40c4 0 6 2 6 4', 'none', a, 3) + P('M50 30c2-8 8-12 12-16-2 6-4 10-6 14', 'none', c, 2, 'opacity=".8"'),
  eye: (a, b, c, d) => P('M4 32c10-14 46-14 56 0-10 14-46 14-56 0z', '#ffffff', a, 2) + C(32, 32, 10, b) + C(32, 32, 5, d) + C(29, 29, 2, c) + P('M32 4l4 8h-8zM32 60l4-8h-8z', a),
  star7: (a, b, c) => { let d = ''; for (let i = 0; i < 14; i++) { const t = -Math.PI / 2 + i * Math.PI / 7, r = i % 2 ? 9 : 22; d += (i ? 'L' : 'M') + (32 + r * Math.cos(t)).toFixed(1) + ' ' + (32 + r * Math.sin(t)).toFixed(1); } return P(d + 'Z', a) + C(32, 32, 7, b) + C(32, 32, 3, c); },
  horn: (a, b, c, d) => P('M8 40c10 4 24 2 34-8 6-6 10-14 14-24 2 12 0 22-6 30-8 10-24 14-42 10z', a, d, 1) + L('M20 42c2-4 2-8 0-10M30 38c2-4 2-8 0-12M40 32c2-4 2-8 0-12', b, 2) + C(10, 41, 4, c),
  sun: (a, b, c) => Array.from({ length: 16 }, (_, i) => P('M32 6l3 10h-6z', i % 2 ? a : b, '', 0, `transform="rotate(${i * 22.5} 32 32)"`)).join('') + C(32, 32, 14, a) + C(32, 32, 9, c),
};

/* الهدايا القديمة المعتمدة (14): رسماتها الأصلية كما كانت (أسلوب مختلف: داخل دائرة بإطار ذهبي) */
const LEGACY_ART = {
  rose: '<path d="M32 56V34" stroke="#3fd08a" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="25" r="11" fill="#ff4d7e"/><path d="M26 26a6 6 0 0 1 12 0M29 21a3 3 0 0 1 6 0" stroke="#ffd1df" fill="none" stroke-width="2" stroke-linecap="round"/><path d="M32 46c-6 0-9-3-10-6 5 0 8 2 10 6zM32 48c6 0 9-3 10-6-5 0-8 2-10 6z" fill="#3fd08a"/>',
  heart: '<path d="M32 52C14 40 12 28 20 21c5-4 10-2 12 3 2-5 7-7 12-3 8 7 6 19-12 31z" fill="#ff4d7e"/><path d="M21 26c1-3 4-4 6-3" stroke="#ffd1df" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
  coffee: '<path d="M16 27h28v13a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12z" fill="#f6e4b8"/><path d="M44 31h3a5 5 0 0 1 0 10h-3" stroke="#f6e4b8" stroke-width="3" fill="none"/><ellipse cx="30" cy="27" rx="14" ry="3.2" fill="#8a5a2b"/><path d="M24 21c-2-3 2-4 0-8M32 21c-2-3 2-4 0-8" stroke="#58e1ff" stroke-width="2" fill="none" stroke-linecap="round"/>',
  chocolate: '<rect x="14" y="16" width="36" height="32" rx="4" fill="#6b3a1e"/><path d="M26 16v32M38 16v32M14 27h36M14 37h36" stroke="#4a2410" stroke-width="2"/><rect x="14" y="42" width="36" height="8" rx="3" fill="#ffd166"/><path d="M20 46h24" stroke="#c8861f" stroke-width="2" stroke-linecap="round"/>',
  teddy: '<circle cx="20" cy="17" r="6" fill="#c98a4b"/><circle cx="44" cy="17" r="6" fill="#c98a4b"/><ellipse cx="32" cy="50" rx="13" ry="9" fill="#d9a066"/><circle cx="32" cy="28" r="14" fill="#d9a066"/><ellipse cx="32" cy="33" rx="6.5" ry="4.8" fill="#f6e4b8"/><circle cx="26.5" cy="25" r="2" fill="#2a1a5e"/><circle cx="37.5" cy="25" r="2" fill="#2a1a5e"/><ellipse cx="32" cy="31" rx="2.2" ry="1.6" fill="#2a1a5e"/>',
  balloons: '<path d="M22 33l10 24M42 33L32 57M32 27v30" stroke="#f6e4b8" stroke-width="1.6" fill="none"/><circle cx="22" cy="24" r="9" fill="#ff4d7e"/><circle cx="42" cy="24" r="9" fill="#58e1ff"/><circle cx="32" cy="18" r="9" fill="#ffd166"/><path d="M18 21a5 5 0 0 1 4-4M38 21a5 5 0 0 1 4-4M28 15a5 5 0 0 1 4-4" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>',
  bouquet: '<circle cx="22" cy="26" r="7" fill="#ff4d7e"/><circle cx="42" cy="26" r="7" fill="#ffd166"/><circle cx="32" cy="19" r="8" fill="#ff68b5"/><circle cx="32" cy="32" r="6" fill="#58e1ff"/><path d="M32 58L19 34h26z" fill="#8d6bff"/><path d="M26 44h12" stroke="#e7c76b" stroke-width="2" stroke-linecap="round"/>',
  crown: '<path d="M12 46l-2-24 14 12 8-18 8 18 14-12-2 24z" fill="#ffd166" stroke="#c8861f" stroke-width="2" stroke-linejoin="round"/><rect x="12" y="46" width="40" height="7" rx="2" fill="#e7a93a"/><circle cx="32" cy="38" r="3" fill="#ff4d7e"/><circle cx="20" cy="39" r="2" fill="#58e1ff"/><circle cx="44" cy="39" r="2" fill="#58e1ff"/>',
  diamond: '<path d="M18 22h28l8 10-22 22L10 32z" fill="#58e1ff"/><path d="M10 32h44M24 22l-4 10 12 22 12-22-4-10M32 22l-8 10M32 22l8 10" stroke="#e8fbff" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
  butterfly: '<path d="M32 30c-4-14-20-16-20-6 0 8 8 12 20 6zM32 30c4-14 20-16 20-6 0 8-8 12-20 6z" fill="#ffd166"/><path d="M32 34c-8 2-16 8-12 16 4 4 10-2 12-10zM32 34c8 2 16 8 12 16-4 4-10-2-12-10z" fill="#e7a93a"/><rect x="30" y="22" width="4" height="26" rx="2" fill="#f6e4b8"/><path d="M31 22c-2-5-5-6-6-6M33 22c2-5 5-6 6-6" stroke="#f6e4b8" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  car: '<path d="M8 41l4-10c1-3 3-4 6-4h18c3 0 5 1 7 4l7 6c3 1 4 3 4 6v3H8z" fill="#8d6bff"/><path d="M18 31h15l6 7H14z" fill="#58e1ff" opacity=".85"/><circle cx="20" cy="46" r="6" fill="#1a1036" stroke="#f6e4b8" stroke-width="2"/><circle cx="46" cy="46" r="6" fill="#1a1036" stroke="#f6e4b8" stroke-width="2"/><rect x="52" y="38" width="4" height="4" rx="1" fill="#ffd166"/>',
  palace: '<path d="M10 54V31l8-6 8 6v23zM38 54V31l8-6 8 6v23z" fill="#e7a93a"/><rect x="22" y="24" width="20" height="30" fill="#ffd166"/><path d="M22 24l10-13 10 13z" fill="#ff4d7e"/><path d="M27 54V44a5 5 0 0 1 10 0v10z" fill="#2a1a5e"/><circle cx="32" cy="10" r="2.5" fill="#ffd166"/>',
  dragon: '<path d="M10 46c0-14 10-23 22-21 8 1 14 6 18 14-6-2-9 0-12 4-4-4-10-3-14 2-4-2-8-2-14 1z" fill="#3fd08a"/><path d="M14 47c6-8 14-8 20-2" stroke="#1d8f5c" stroke-width="2.5" fill="none"/><circle cx="43" cy="31" r="2.3" fill="#2a1a5e"/><path d="M34 25l4-11 4 9M47 30l8-8" stroke="#ffd166" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M50 40c4 0 6 3 5 6" stroke="#ff4d7e" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
  rocket: '<path d="M32 8c10 8 12 22 8 34H24C20 30 22 16 32 8z" fill="#f6e4b8"/><circle cx="32" cy="26" r="5" fill="#58e1ff" stroke="#2a1a5e" stroke-width="2"/><path d="M24 36l-8 10 8-2zM40 36l8 10-8-2z" fill="#ff4d7e"/><path d="M28 44h8l-4 12z" fill="#ffd166"/>',
};

/* زخارف التركيبات */
const deco = {
  sparkle: (p) => [[10, 12, 4], [54, 16, 3], [52, 50, 3.5], [12, 48, 2.6], [32, 6, 2.4]].map(([x, y, r]) => star(x, y, r, p[2] === '#ffffff' ? '#ffe066' : '#fff3bf')).join(''),
  box: (p) => R(16, 42, 32, 18, p[1], 2) + R(14, 38, 36, 6, p[1], 2, `stroke="${p[3]}" stroke-width=".6"`) + R(29.5, 38, 5, 22, '#ffd166') + P('M32 38c-6-6-12-2-6 0zM32 38c6-6 12-2 6 0z', '#ffd166'),
  crown: () => P('M22 12l-1-9 6 4 5-6 5 6 6-4-1 9z', '#ffd166', '#c8861f', 1) + C(32, 8, 1.5, '#ff4d7e'),
  wings: (p) => P('M18 30C8 22 2 24 2 30c4 0 6 2 8 6-4 0-6 2-6 6 4-2 10-2 14-2zM46 30c10-8 16-6 16 0-4 0-6 2-8 6 4 0 6 2 6 6-4-2-10-2-14-2z', '#ffffff', p[3], .8, 'opacity=".95"') + L('M8 32l8 2M56 32l-8 2', '#dee2e6', 1),
  halo: () => E(32, 28, 26, 26, 'none', 'stroke="#ffd166" stroke-width="2" stroke-dasharray="1 3" opacity=".9"') + E(32, 30, 22, 22, 'url(#gGlow)'),
  pedestal: (p) => P('M14 58l4-6h28l4 6z', p[3]) + R(18, 50, 28, 3, '#ffd166', 1),
  gems: () => C(20, 55, 2, '#58e1ff') + C(32, 55, 2.2, '#ff4d7e') + C(44, 55, 2, '#69db7c'),
};
const scaleAt = (svg, s, x, y) => `<g transform="translate(${x} ${y}) scale(${s}) translate(-32 -32)">${svg}</g>`;

/** يرسم هدية من مواصفاتها: {motif, variant, cat, rarity} */
export function giftArt(g, size = 64, extra = '') {
  let motif = g.motif || '', cat = g.cat || 'normal', v = g.variant || 0;
  // R68i: هدايا المالك ثلاثية الأبعاد (صور)
  if (motif.startsWith('img:')) { const id = motif.slice(4); if (/^[a-c][0-9]{2}$/.test(id)) return `<span class="gift-art g3d r${g.rarity || 0}" style="--g3m:url(/assets/art68/gifts/${id}.webp);width:${size}px;height:${size}px" role="img" aria-label="${String(g.name || '').replace(/[<>"&]/g, '')}" ${extra}><img src="/assets/art68/gifts/${id}.webp" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" draggable="false"></span>`; }
  if (motif.startsWith('legacy:')) {
    const id = motif.slice(7);
    return `<svg class="gift-art legacy r${g.rarity || 0}" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${(g.name || '').replace(/"/g, '')}" focusable="false" style="direction:ltr" ${extra}><circle cx="32" cy="32" r="30" fill="#2a1a5e"/><circle cx="32" cy="32" r="29" fill="none" stroke="#e7c76b" stroke-width="2"/>${LEGACY_ART[id] || M.star('#ffd166', '#fff', '#fff3c4', '#7a3b12')}</svg>`;
  }
  const pals = PAL[cat] || PAL.normal; const p = pals[v % 4];
  const draw = M[motif] || M.star;
  const one = draw(p[0], p[1], p[2], p[3]);
  let body;
  switch (v) {
    case 1: body = deco.sparkle(p) + one; break;
    case 2: body = scaleAt(draw(...pals[(v + 1) % 4]), .5, 18, 40) + scaleAt(draw(...pals[(v + 2) % 4]), .5, 46, 40) + scaleAt(one, .58, 32, 22); break;
    case 3: body = scaleAt(one, .62, 32, 22) + deco.box(p); break;
    case 4: body = scaleAt(one, .8, 32, 36) + deco.crown(); break;
    case 5: body = deco.wings(p) + scaleAt(one, .72, 32, 32); break;
    case 6: body = deco.halo() + scaleAt(one, .72, 32, 28) + deco.pedestal(p); break;
    case 7: body = deco.halo() + deco.wings(p) + scaleAt(one, .6, 32, 30) + deco.crown() + deco.pedestal(p) + deco.gems() + deco.sparkle(p); break;
    default: body = one;
  }
  const r = g.rarity || 0;
  return `<svg class="gift-art r${r}" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${(g.name || '').replace(/"/g, '')}" focusable="false" style="direction:ltr" ${extra}><defs><radialGradient id="gGlow"><stop offset="0" stop-color="#ffe066" stop-opacity=".45"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient></defs>${body}</svg>`;
}
/** لعرض السجل بمعرّف فقط (هدايا قديمة) */
export const giftArtById = (id, size = 48) => giftArt({ motif: 'legacy:' + id, variant: 0 }, size);
export const MOTIF_COUNT = Object.keys(M).length;
