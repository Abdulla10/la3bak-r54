// R69s: «لعبة القنبلة» داخل الغرفة الصوتية — قنبلة تنتقل بين اللاعبين، واللي تنفجر عنده يطلع، لين يبقى فائز واحد.
// الخادم يقرر الدور والانفجار. هنا بس الرسم والحركة والأصوات.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const first = (s) => esc([...String(s || '؟')][0]);
const CSS = `
.bm69-ov{position:fixed;inset:0;z-index:96;display:flex;justify-content:center;align-items:stretch;background:radial-gradient(120% 80% at 50% 35%,#4a1680 0,#240a45 45%,#12041f 100%);color:#fff;direction:rtl;font-family:inherit;overflow:hidden}
.bm69-ov[hidden]{display:none}
.bm69-ov::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 15%,#ff7a1a22,transparent 35%),radial-gradient(circle at 85% 80%,#c04bff22,transparent 40%);pointer-events:none}
.bm69-in{position:relative;width:100%;max-width:470px;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-bottom,0px) + 14px);gap:10px;overflow-y:auto}
.bm69-top{display:flex;align-items:center;gap:8px}
.bm69-top h2{flex:1;margin:0;text-align:center;font-size:18px;font-weight:900;color:#ffd76a;text-shadow:0 2px 10px #ff8a1a66}
.bm69-ic{width:40px;height:40px;border-radius:50%;border:1px solid #c79bff66;background:#ffffff14;color:#fff;font-size:18px;display:grid;place-items:center;cursor:pointer;flex:none}
.bm69-round{padding:6px 16px;border-radius:99px;background:#1a0733cc;border:1.5px solid #ffc83d88;font-weight:900;font-size:16px;color:#fff}
.bm69-card{background:linear-gradient(180deg,#2c0f55e6,#1a0736e6);border:1.5px solid #ffc83d55;border-radius:20px;padding:12px;box-shadow:0 10px 30px #0007}
.bm69-card h3{margin:0 0 8px;font-size:15px;color:#ffd76a;display:flex;align-items:center;gap:6px}
.bm69-idea{margin:0;font-size:13.5px;line-height:1.7;color:#eadcff}
.bm69-hero{display:grid;place-items:center;margin:2px 0 -6px}
.bm69-players{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 6px}
.bm69-slot{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;min-width:0}
.bm69-slot b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.bm69-av{position:relative;width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:20px;background:radial-gradient(circle at 35% 30%,#9b6bff,#4a1fa6);border:2.5px solid #ffc83d;box-shadow:0 4px 12px #0008;overflow:hidden;flex:none}
.bm69-av img{width:100%;height:100%;object-fit:cover}
.bm69-slot.is-empty .bm69-av{background:#ffffff0d;border:2px dashed #c79bff66;box-shadow:none;color:#c79bff;font-size:22px}
.bm69-crown{position:absolute;top:-12px;left:50%;transform:translateX(-50%);z-index:3;font-size:16px;filter:drop-shadow(0 2px 2px #0008)}
.bm69-set{display:grid;gap:8px}
.bm69-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:14px;background:#ffffff0d;font-size:13.5px}
.bm69-row>span{display:flex;align-items:center;gap:6px;font-weight:800}
.bm69-chips{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
.bm69-chip{min-width:44px;padding:6px 9px;border-radius:99px;border:1px solid #c79bff55;background:#1a0733;color:#e9dcff;font-weight:800;font-size:12.5px;cursor:pointer}
.bm69-chip.on{background:linear-gradient(180deg,#b06bff,#6d2fd6);border-color:transparent;color:#fff}
.bm69-chip:disabled{opacity:.75;cursor:default}
.bm69-note{margin:2px 2px 0;font-size:12px;color:#cdb8f2;line-height:1.6}
.bm69-btn{width:100%;padding:14px;border:0;border-radius:18px;font-size:19px;font-weight:900;cursor:pointer;color:#3a1600;background:linear-gradient(180deg,#ffe07a,#ffb21f 60%,#e88a00);box-shadow:inset 0 2px 0 #fff8,0 6px 0 #a35a00,0 12px 24px #0008}
.bm69-btn:active{transform:translateY(3px);box-shadow:inset 0 2px 0 #fff8,0 3px 0 #a35a00,0 8px 18px #0008}
.bm69-btn:disabled{filter:grayscale(.6);opacity:.6}
.bm69-btn.ghost{background:#ffffff14;color:#fff;box-shadow:none;border:1px solid #c79bff55;font-size:15px;padding:11px}
.bm69-steps{margin:0;padding:0;list-style:none;display:grid;gap:6px;font-size:13px;color:#eadcff}
.bm69-steps li{display:flex;gap:8px;align-items:flex-start;line-height:1.55}
.bm69-steps i{flex:none;width:22px;height:22px;border-radius:50%;background:linear-gradient(#ffd76a,#e8a000);color:#3a1600;font-style:normal;font-weight:900;display:grid;place-items:center;font-size:12px}
.bm69-err{margin:0;padding:8px 10px;border-radius:12px;background:#ff3b5c22;border:1px solid #ff3b5c66;color:#ffd0d8;font-size:13px;text-align:center}
/* الملعب */
.bm69-arena{position:relative;width:100%;aspect-ratio:1/1.02;max-height:58vh;margin:0 auto;border-radius:28px;background:radial-gradient(circle at 50% 50%,#ff3b1a1f 0,transparent 42%),radial-gradient(circle at 50% 50%,#3a1270 0,#1c0838 70%);border:1.5px solid #ffc83d44;box-shadow:inset 0 0 40px #0008}
.bm69-arena::after{content:"";position:absolute;left:50%;top:50%;width:76%;height:76%;transform:translate(-50%,-50%);border-radius:50%;border:2px solid #ff3b5c55;box-shadow:0 0 18px #ff3b5c44}
.bm69-p{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;width:78px;transition:filter .3s,opacity .3s;z-index:2}
.bm69-p b{max-width:76px;padding:1px 8px;border-radius:99px;background:#12041fcc;border:1px solid #c79bff55;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bm69-p.is-hold .bm69-av{border-color:#ff4d2e;box-shadow:0 0 0 4px #ff4d2e55,0 0 24px #ff4d2e;animation:bm69hold .6s ease-in-out infinite alternate}
.bm69-p.is-hold b{background:#ff3b1a;border-color:#ffb4a0}
.bm69-p.is-out{filter:grayscale(1) brightness(.55);opacity:.75}
.bm69-p.is-out .bm69-av::after{content:"💥";position:absolute;inset:0;display:grid;place-items:center;font-size:24px;background:#0006}
.bm69-p.is-me b{border-color:#ffd76a;color:#ffd76a}
.bm69-mini{position:absolute;top:-6px;right:-4px;font-size:20px;z-index:3;animation:bm69shake .25s linear infinite}
@keyframes bm69hold{from{transform:scale(1)}to{transform:scale(1.08)}}
.bm69-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:46%;display:grid;place-items:center;z-index:1}
.bm69-core svg{width:100%;height:auto;overflow:visible;filter:drop-shadow(0 10px 18px #000a)}
.bm69-core.is-danger svg{animation:bm69shake .12s linear infinite}
.bm69-core.is-pass svg{animation:bm69pop .35s ease}
@keyframes bm69shake{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(1.5px,-1px) rotate(1.5deg)}50%{transform:translate(-1.5px,1px) rotate(-1.5deg)}75%{transform:translate(1px,1px) rotate(1deg)}100%{transform:translate(0,0) rotate(0)}}
@keyframes bm69pop{0%{transform:scale(1)}40%{transform:scale(1.15) rotate(-6deg)}100%{transform:scale(1)}}
.bm69-spark{transform-origin:center;animation:bm69spark .18s linear infinite alternate}
@keyframes bm69spark{from{transform:scale(.85);opacity:.8}to{transform:scale(1.2);opacity:1}}
.bm69-wave{position:absolute;left:50%;top:50%;width:62%;height:62%;transform:translate(-50%,-50%);border-radius:50%;border:3px solid #ff3b2e;opacity:0;animation:bm69wave 1.4s ease-out infinite;z-index:0}
.bm69-wave.w2{animation-delay:.7s}
.bm69-core.is-danger~.bm69-wave{animation-duration:.7s}
@keyframes bm69wave{0%{opacity:.7;transform:translate(-50%,-50%) scale(.75)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.35)}}
.bm69-pass{position:relative;width:100%;padding:15px 10px;border:0;border-radius:99px;font-size:21px;font-weight:900;color:#fff;cursor:pointer;background:linear-gradient(180deg,#ff5a4e,#d01530 60%,#9b0b22);box-shadow:inset 0 2px 0 #ffffff66,0 6px 0 #6a0614,0 0 26px #ff3b2e88;letter-spacing:.3px}
.bm69-pass::before,.bm69-pass::after{content:"»";position:absolute;top:50%;transform:translateY(-50%);font-size:28px;color:#ffb21f;animation:bm69arr .7s ease-in-out infinite alternate}
.bm69-pass::before{right:22px}.bm69-pass::after{left:22px;content:"«"}
@keyframes bm69arr{from{opacity:.5}to{opacity:1}}
.bm69-pass:active{transform:translateY(3px);box-shadow:inset 0 2px 0 #ffffff66,0 3px 0 #6a0614,0 0 26px #ff3b2e88}
.bm69-pass:disabled{background:linear-gradient(180deg,#6b4a8a,#3e2a5a);box-shadow:0 4px 0 #24163a;color:#e2d4ff;cursor:default}
.bm69-pass:disabled::before,.bm69-pass:disabled::after{display:none}
.bm69-wait{text-align:center;font-size:15px;font-weight:800;color:#eadcff;padding:12px;border-radius:99px;background:#ffffff0f;border:1px dashed #c79bff55}
.bm69-ch{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:18px;background:linear-gradient(180deg,#2c0f55,#1c0838);border:1.5px solid #b06bff88;box-shadow:0 0 18px #b06bff33}
.bm69-ch .dice{font-size:30px;flex:none;animation:bm69pop 1.6s ease-in-out infinite}
.bm69-ch small{display:block;color:#ffd76a;font-weight:900;font-size:13px;margin-bottom:2px}
.bm69-ch p{margin:0;font-size:16.5px;font-weight:800;line-height:1.5}
/* الانفجار */
.bm69-boom{position:fixed;inset:0;z-index:97;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle,#ffdd8a 0,#ff7a1acc 18%,#c0101f99 40%,#12041fee 70%);animation:bm69flash .6s ease-out both}
.bm69-boom .bm69-bt{text-align:center;animation:bm69zoom .5s cubic-bezier(.2,1.6,.4,1) .15s both}
.bm69-boom .big{font-size:110px;line-height:1;filter:drop-shadow(0 8px 20px #000)}
.bm69-boom h3{margin:6px 0 4px;font-size:26px;font-weight:900;text-shadow:0 3px 10px #000}
.bm69-boom p{margin:0;font-size:15px;color:#ffe2c8}
.bm69-ov.is-shake .bm69-in{animation:bm69quake .5s linear}
@keyframes bm69flash{0%{opacity:0}10%{opacity:1;background-color:#fff}100%{opacity:1}}
@keyframes bm69zoom{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes bm69quake{0%,100%{transform:none}20%{transform:translate(-8px,4px)}40%{transform:translate(7px,-5px)}60%{transform:translate(-5px,-3px)}80%{transform:translate(4px,5px)}}
/* الفايز */
.bm69-win{text-align:center;padding:18px 12px}
.bm69-win .bm69-av{width:96px;height:96px;margin:14px auto 8px;font-size:36px;border-width:3.5px;box-shadow:0 0 0 6px #ffc83d44,0 0 40px #ffc83d}
.bm69-win h3{justify-content:center;font-size:24px;margin:4px 0}
.bm69-win p{margin:0 0 10px;color:#eadcff}
.bm69-confetti{position:fixed;inset:0;pointer-events:none;z-index:97;overflow:hidden}
.bm69-confetti i{position:absolute;top:-20px;width:9px;height:14px;border-radius:2px;animation:bm69fall linear forwards}
@keyframes bm69fall{to{transform:translateY(110vh) rotate(720deg)}}
/* الشريط العايم لما فيه لعبة والنافذة مقفلة */
.bm69-pill{position:fixed;top:calc(env(safe-area-inset-top,0px) + 72px);left:50%;transform:translateX(-50%);z-index:85;display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:99px;border:1.5px solid #ffc83d;background:linear-gradient(180deg,#ff5a4e,#b0102a);color:#fff;font-weight:900;font-size:14px;box-shadow:0 8px 20px #000a,0 0 18px #ff3b2e88;cursor:pointer;white-space:nowrap;animation:bm69pill 1.2s ease-in-out infinite alternate}
.bm69-pill[hidden]{display:none}
@keyframes bm69pill{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.05)}}
body:has(.so-room-panel[data-so-open-panel]) .bm69-pill{display:none!important}

/* R69t: شكل واقعي — قنبلة مرسومة، شاشة LED، إطارات ذهبية، وخلفية القصر */
.bm69-ov{background:linear-gradient(180deg,#12041fcc,#12041fee),url(/assets/art67/roombg/cosmic-palace.jpg) center/cover no-repeat,#12041f}
.bm69-bomb{position:relative;width:100%;aspect-ratio:300/333}
.bm69-bomb img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 14px 22px #000c)}
.bm69-led{position:absolute;left:21.8%;top:47.1%;width:53.5%;height:18.6%;display:grid;place-items:center;font-family:'DS-Digital','Segment7','Courier New',ui-monospace,monospace;font-weight:900;letter-spacing:.06em;direction:ltr;overflow:hidden}
.bm69-led>*{grid-area:1/1;font-size:clamp(18px,7.2vw,34px);line-height:1}
.bm69-led s{text-decoration:none;color:#ff2a1a14}
.bm69-led .bm69-digits{color:#ff3b26;text-shadow:0 0 6px #ff2a1a,0 0 14px #ff2a1acc,0 0 26px #ff2a1a77}
.bm69-hero .bm69-led>*{font-size:16px}
.bm69-fusefx{position:absolute;left:72.5%;top:11.5%;width:16%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fffbe0 0,#ffe27a 22%,#ff9a1a 45%,#ff3b1a00 70%);mix-blend-mode:screen;animation:bm69spark .16s linear infinite alternate}
.bm69-core{width:52%}
.bm69-core.is-danger .bm69-bomb{animation:bm69shake .12s linear infinite}
.bm69-core.is-pass .bm69-bomb{animation:bm69pop .35s ease}
.bm69-core.is-danger .bm69-led .bm69-digits{animation:bm69blink .5s steps(1) infinite}
@keyframes bm69blink{50%{opacity:.35}}
.bm69-arena{background:radial-gradient(circle at 50% 50%,#ff2a1a26 0,transparent 45%),linear-gradient(180deg,#2a0c52e6,#160630f0);border:2px solid transparent;background-clip:padding-box;box-shadow:0 0 0 2px #e9b44c,0 0 0 4px #7a4a0a,0 0 30px #b06bff55,inset 0 0 50px #000a}
.bm69-arena::after{border:2.5px solid #ff3b2e88;box-shadow:0 0 22px #ff3b2e66,inset 0 0 22px #ff3b2e33}
.bm69-av{background:radial-gradient(circle at 35% 30%,#a07aff,#4a1fa6);border:3px solid transparent;background-clip:padding-box;box-shadow:0 0 0 2.5px #f2c14e,0 0 0 4px #8a5a12,0 6px 14px #000a}
.bm69-p b,.bm69-slot b{padding:2px 10px;border-radius:99px;background:linear-gradient(180deg,#2a0c52,#14052a);border:1.5px solid #e9b44c;color:#fff;font-weight:800;box-shadow:0 2px 6px #0008}
.bm69-p.is-hold .bm69-av{box-shadow:0 0 0 3px #ff5a2e,0 0 0 5px #ffd24a,0 0 26px #ff3b1a}
.bm69-round{background:linear-gradient(180deg,#2a0c52,#14052a);border:2px solid #e9b44c;box-shadow:0 0 14px #e9b44c55;padding:6px 20px}
.bm69-card{background:linear-gradient(180deg,#2c0f55f2,#170632f2);border:2px solid transparent;background-clip:padding-box;box-shadow:0 0 0 1.5px #e9b44c,0 0 0 3px #6a3d08,0 10px 26px #000a}
.bm69-card h3{font-size:16px;color:#ffd76a;text-shadow:0 2px 6px #0008}
.bm69-pass{border:2.5px solid #ffd24a;background:linear-gradient(180deg,#ff5d4a,#d4142e 55%,#8f0820);box-shadow:inset 0 2px 0 #ffffff66,0 6px 0 #5a0410,0 0 26px #ff3b2e99}
.bm69-pass::before,.bm69-pass::after{color:#ffb21f;text-shadow:0 0 8px #ff8a1a;font-weight:900}
.bm69-ch{border:2px solid #b06bff;box-shadow:0 0 0 1px #5a2a9a,0 0 22px #b06bff55}
.bm69-ch .dice{width:44px;height:44px;font-size:0;background:url(/assets/art69/bomb-dice.webp?v=r69z3) center/contain no-repeat}
.bm69-ch .dice.zap{background:none;font-size:30px;width:auto;height:auto}
.bm69-p .bm69-av{width:62px;height:62px;font-size:23px}
.bm69-p{width:86px}.bm69-p b{max-width:86px;font-size:12.5px}
.bm69-core{width:56%}
.bm69-in{justify-content:flex-start}
.bm69-wait{background:linear-gradient(180deg,#2a0c52,#14052a);border:2px solid #e9b44c;color:#fff;font-size:16px;box-shadow:0 0 16px #e9b44c33}
.bm69-ch p{font-size:18px}
.bm69-ic{border:1.5px solid #e9b44c99;background:linear-gradient(180deg,#3a1470,#1c0838)}
.bm69-btn{border:2px solid #fff3b0}

@media (prefers-reduced-motion:reduce){.bm69-ov *,.bm69-boom,.bm69-pill{animation-duration:0s!important;animation-iteration-count:1!important}}
`;

const ART = '/assets/art69/';
const BOMB_SVG = `<div class="bm69-bomb"><img src="${ART}bomb-core.webp?v=r69z3" alt="" decoding="async"><i class="bm69-fusefx" aria-hidden="true"></i><div class="bm69-led"><s aria-hidden="true">88:88</s><span class="bm69-digits">00:30</span></div></div>`;

export function startRoomBomb() {
  if (globalThis.__bm69) return; globalThis.__bm69 = true;
  if (!document.querySelector('style[data-bm69]')) { const s = document.createElement('style'); s.dataset.bm69 = '1'; s.textContent = CSS; document.head.append(s); }
  const api = (u, body) => fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || 'تعذّر الطلب.'); return j; });
  const ov = document.createElement('div'); ov.className = 'bm69-ov'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'لعبة القنبلة');
  const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'bm69-pill'; pill.hidden = true;
  document.body.append(ov, pill);
  const S = { room: '', d: null, at: 0, open: false, err: '', busy: false, key: '', lastBoom: 0, lastHolder: '', lastPhase: '', timer: 0, poll: 0 };
  const roomId = () => { const m = /^#\/social-room\/([0-9a-f-]{36})/i.exec((globalThis.__LA3BAK_NAV__ || location).hash); return m ? m[1] : ''; };
  // أصوات بسيطة بدون ملفات
  let ac = null; const audio = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; } };
  const beep = (f = 880, d = 0.06, v = 0.05) => { const a = audio(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.value = v; o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + d); };
  const boomSound = () => { const a = audio(); if (!a) return; const n = a.sampleRate * 0.9, b = a.createBuffer(1, n, a.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0.55; s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(); };
  const whoosh = () => { const a = audio(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(260, a.currentTime); o.frequency.exponentialRampToValueAtTime(900, a.currentTime + 0.18); g.gain.setValueAtTime(0.05, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.22); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.24); };

  const g = () => S.d?.game || null;
  const leftNow = () => { const x = g(); if (!x || x.left === null || x.left === undefined) return null; return Math.max(0, x.left - (performance.now() - S.at)); };
  const fmt = (ms) => { const s = Math.ceil(ms / 1000); return `00:${String(Math.min(99, s)).padStart(2, '0')}`; };
  const avatar = (p, big) => `<span class="bm69-av">${p.avatar && /^(\/|https:)/.test(p.avatar) ? `<img src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async">` : first(p.name)}${big || ''}</span>`;

  function lobbyHTML(x) {
    const can = S.d.can, me = S.d.me, host = x.host;
    const slots = Array.from({ length: 8 }, (_, i) => { const p = x.players[i]; return p ? `<div class="bm69-slot">${avatar(p, p.id === host ? '' : '')}${p.id === host ? '<i class="bm69-crown" aria-hidden="true">👑</i>' : ''}<b>${esc(p.name)}</b></div>` : '<div class="bm69-slot is-empty"><span class="bm69-av">+</span><b>فاضي</b></div>'; });
    const ed = can.settings ? '' : 'disabled';
    const idea = '<section class="bm69-card"><h3>💣 فكرة اللعبة</h3><p class="bm69-idea">قنبلة تتنقل بين اللاعبين، واللي معاه القنبلة ينفّذ التحدي بسرعة ويمرّرها قبل لا تنفجر عنده!</p></section>';
    const how = `<section class="bm69-card"><h3>🎮 كيف ألعب؟</h3><ol class="bm69-steps"><li><i>1</i>تبدأ القنبلة مع لاعب عشوائي.</li><li><i>2</i>${x.mode === 'questions' ? 'يقرأ التحدي ويجاوبه بصوته.' : 'يمرّرها بأسرع وقت.'}</li><li><i>3</i>يضغط «مرّر القنبلة» عشان تنتقل للي بعده.</li><li><i>4</i>إذا خلص الوقت وانفجرت عنده، يطلع من اللعبة. وآخر واحد يبقى هو الفايز 🏆</li></ol></section>`;
    return `<div class="bm69-hero"><div style="width:118px">${BOMB_SVG}</div></div>
    <section class="bm69-card"><h3>👥 اللاعبين <small style="color:#cdb8f2;font-weight:700">(${x.players.length} من 8)</small></h3><div class="bm69-players">${slots.join('')}</div></section>
    <section class="bm69-card"><h3>⚙️ إعدادات الغرفة</h3><div class="bm69-set">
      <div class="bm69-row"><span>🎮 وضع اللعبة</span><div class="bm69-chips"><button type="button" class="bm69-chip ${x.mode === 'questions' ? 'on' : ''}" data-bm="mode" data-v="questions" ${ed}>الأسئلة</button><button type="button" class="bm69-chip ${x.mode === 'speed' ? 'on' : ''}" data-bm="mode" data-v="speed" ${ed}>السرعة</button></div></div>
      <p class="bm69-note">${x.mode === 'questions' ? '❓ الأسئلة: اللي معاه القنبلة يجاوب التحدي بصوته، وبعدين يمرّرها.' : '⚡ السرعة: مرّر على طول بدون أسئلة. الوقت مخفي والقنبلة تنفجر فجأة!'}</p>
      <div class="bm69-row"><span>⏱️ مدة الجولة</span><div class="bm69-chips">${[15000, 20000, 30000, 45000].map((v) => `<button type="button" class="bm69-chip ${x.roundMs === v ? 'on' : ''}" data-bm="ms" data-v="${v}" ${ed}>${v / 1000} ث</button>`).join('')}</div></div>
      <div class="bm69-row"><span>📋 نوع التحديات</span><div class="bm69-chips"><button type="button" class="bm69-chip on" disabled>مقترحة</button></div></div>
    </div></section>
    ${S.err ? `<p class="bm69-err" role="alert">${esc(S.err)}</p>` : ''}
    ${can.start ? `<button type="button" class="bm69-btn" data-bm="start" ${S.busy ? 'disabled' : ''}>ابدأ اللعب</button>` : me.host ? '<button type="button" class="bm69-btn" disabled>ينتظر لاعب ثاني على الأقل…</button>' : ''}
    ${can.join ? `<button type="button" class="bm69-btn" data-bm="join" ${S.busy ? 'disabled' : ''}>أشارك 🙋</button>` : ''}
    ${!me.host && me.joined ? `<p class="bm69-wait">أنت داخل ✓ ننتظر ${esc(x.hostName)} يبدأ…</p>` : ''}
    ${can.leave ? '<button type="button" class="bm69-btn ghost" data-bm="leave">انسحب</button>' : ''}
    ${can.cancel ? '<button type="button" class="bm69-btn ghost" data-bm="cancel">إلغاء اللعبة</button>' : ''}
    ${idea}${how}`;
  }
  function arenaHTML(x) {
    const n = x.players.length, can = S.d.can, me = S.d.me;
    const ps = x.players.map((p, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2, r = 41; const left = 50 + r * Math.cos(a), top = 50 + r * Math.sin(a) * 0.97; const hold = x.holder === p.id;
      return `<div class="bm69-p${hold ? ' is-hold' : ''}${p.out ? ' is-out' : ''}${p.me ? ' is-me' : ''}" style="left:${left}%;top:${top}%">${avatar(p, hold ? '' : '')}${hold ? '<i class="bm69-mini" aria-hidden="true">💣</i>' : ''}${p.id === x.host && !p.out ? '<i class="bm69-crown" aria-hidden="true">👑</i>' : ''}<b>${p.me ? 'أنت' : esc(p.name)}</b></div>`; }).join('');
    const passBtn = me.holding ? `<button type="button" class="bm69-pass" data-bm="pass" ${can.pass && !S.busy ? '' : 'disabled'}>${can.pass ? 'مرّر القنبلة' : '<span data-bm69-passin>جاوب أول…</span>'}</button>` : `<div class="bm69-wait">${x.phase === 'boom' ? '💥 بووم!' : `💣 القنبلة عند <b>${esc(x.holderName)}</b>`}</div>`;
    const ch = x.mode === 'questions' && x.challenge ? `<div class="bm69-ch"><span class="dice" aria-hidden="true"></span><div><small>${me.holding ? 'تحدّيك السريع:' : `تحدّي ${esc(x.holderName)}:`}</small><p>${esc(x.challenge)}</p></div></div>` : x.mode === 'speed' && x.phase === 'playing' ? '<div class="bm69-ch"><span class="dice zap" aria-hidden="true">⚡</span><div><small>وضع السرعة</small><p>الوقت مخفي… مرّرها بسرعة!</p></div></div>' : '';
    return `<div class="bm69-arena">${ps}<div class="bm69-core${x.danger ? ' is-danger' : ''}" data-bm69-core>${BOMB_SVG}</div><i class="bm69-wave" aria-hidden="true"></i><i class="bm69-wave w2" aria-hidden="true"></i></div>
    ${S.err ? `<p class="bm69-err" role="alert">${esc(S.err)}</p>` : ''}${passBtn}${ch}
    ${can.cancel ? '<button type="button" class="bm69-btn ghost" data-bm="cancel" style="margin-top:2px">إيقاف اللعبة</button>' : ''}`;
  }
  function winHTML(x) {
    const w = x.players.find((p) => p.id === x.winner?.id) || { name: x.winner?.name || '—' };
    return `<section class="bm69-card bm69-win"><h3>🏆 الفايز</h3>${avatar(w, '<i class="bm69-crown" aria-hidden="true" style="top:-4px;font-size:26px">👑</i>')}<h3 style="color:#fff">${esc(w.me ? 'أنت! مبروك 🎉' : w.name)}</h3><p>آخر واحد ما انفجرت عنده القنبلة</p>
      <ol class="bm69-steps" style="text-align:right;margin:10px 0">${[...x.players].filter((p) => p.out).sort((a, b) => b.outRound - a.outRound).map((p, i) => `<li><i>${i + 2}</i>${esc(p.name)} <span style="color:#cdb8f2">· انفجرت عنده بالجولة ${p.outRound}</span></li>`).join('')}</ol>
      ${S.d.can.again ? '<button type="button" class="bm69-btn" data-bm="again">جولة جديدة</button>' : ''}<button type="button" class="bm69-btn ghost" data-bm="close" style="margin-top:8px">رجوع للغرفة</button></section>`;
  }
  function paint() {
    const x = g(), r = S.room;
    pill.hidden = !(r && x && !S.open && (x.phase !== 'done'));
    if (!pill.hidden) pill.innerHTML = x.phase === 'lobby' ? `💣 لعبة القنبلة تنتظر لاعبين · ${S.d.me.joined ? 'افتح' : 'انضم'}` : `💣 لعبة القنبلة شغالة · ${S.d.me.joined ? 'ارجع' : 'تفرّج'}`;
    if (!S.open || !r) { ov.hidden = true; return; }
    ov.hidden = false;
    const title = !x ? 'لعبة القنبلة' : x.phase === 'lobby' ? 'لعبة القنبلة' : x.phase === 'done' ? 'خلصت اللعبة' : '';
    const top = `<header class="bm69-top"><button type="button" class="bm69-ic" data-bm="close" aria-label="رجوع للغرفة">✕</button>${x && (x.phase === 'playing' || x.phase === 'boom') ? `<h2><span class="bm69-round">الجولة ${x.round} / ${x.rounds}</span></h2>` : `<h2>${title}</h2>`}<span class="bm69-ic" aria-hidden="true">💣</span></header>`;
    let body;
    if (!x) body = `<div class="bm69-hero"><div style="width:150px">${BOMB_SVG}</div></div><section class="bm69-card"><h3>💣 لعبة القنبلة</h3><p class="bm69-idea">قنبلة تتنقل بين اللاعبين وعليكم تنفيذ التحدي بسرعة قبل لا تنفجر! آخر واحد يبقى هو الفايز. من 2 إلى 8 لاعبين.</p></section>${S.err ? `<p class="bm69-err" role="alert">${esc(S.err)}</p>` : ''}<button type="button" class="bm69-btn" data-bm="create" ${S.busy ? 'disabled' : ''}>سوّ لعبة جديدة</button>`;
    else if (x.phase === 'lobby') body = lobbyHTML(x);
    else if (x.phase === 'done') body = winHTML(x);
    else body = arenaHTML(x);
    ov.innerHTML = `<div class="bm69-in">${top}${body}</div>`;
    tickUI();
  }
  // يحدّث العداد بدون ما يعيد رسم كل شي
  function tickUI() {
    const x = g(); const d = ov.querySelector('.bm69-digits');
    if (d) { const l = leftNow(); d.textContent = !x || x.phase === 'lobby' ? fmt(x?.roundMs ?? 30000) : x.mode === 'speed' && x.phase === 'playing' ? '??:??' : x.phase === 'boom' ? '00:00' : l === null ? '' : fmt(l); }
    const core = ov.querySelector('[data-bm69-core]'); if (core && x?.mode === 'questions') { const l = leftNow(); core.classList.toggle('is-danger', l !== null && l <= 5000); }
    const pi = ov.querySelector('[data-bm69-passin]'); if (pi && x?.passIn !== null && x?.passIn !== undefined) { const w = Math.max(0, x.passIn - (performance.now() - S.at)); if (w <= 0) { const b = pi.closest('button'); b.disabled = false; b.textContent = 'مرّر القنبلة'; } else pi.textContent = `جاوب التحدي… ${Math.ceil(w / 1000)}`; }
    // صوت تكتكة بآخر 5 ثواني لما القنبلة عندي
    if (x?.phase === 'playing' && x.mode === 'questions' && S.d?.me?.holding) { const l = leftNow(); const sec = l === null ? null : Math.ceil(l / 1000); if (sec !== null && sec <= 5 && sec !== S.lastTick) { S.lastTick = sec; beep(sec <= 2 ? 1250 : 980, 0.05, 0.04); } }
  }
  function effects(prev, x) {
    if (!x) return;
    if (prev && x.holder && prev.holder !== x.holder && x.phase === 'playing') { const c = ov.querySelector('[data-bm69-core]'); c?.classList.add('is-pass'); if (S.open) whoosh(); if (S.d.me.holding) try { navigator.vibrate?.(60); } catch { /* */ } }
    if (x.lastBoom && x.lastBoom.at !== S.lastBoom && (x.phase === 'boom' || x.phase === 'done')) {
      const fresh = S.lastBoom !== 0 || Date.now() - x.lastBoom.at < 5000; S.lastBoom = x.lastBoom.at;
      if (fresh && S.open) { boomSound(); try { if (x.lastBoom.id && x.players.find((p) => p.me)?.id === x.lastBoom.id) navigator.vibrate?.([200, 80, 300]); } catch { /* */ }
        const me = x.players.find((p) => p.me)?.id === x.lastBoom.id;
        const n = document.createElement('div'); n.className = 'bm69-boom'; n.setAttribute('role', 'status'); n.innerHTML = `<div class="bm69-bt"><div class="big">💥</div><h3>${me ? 'انفجرت عندك!' : `انفجرت عند ${esc(x.lastBoom.name)}!`}</h3><p>${x.phase === 'done' ? 'خلصت اللعبة' : 'طلع من اللعبة · الجولة الجاية بعد ثواني'}</p></div>`;
        document.body.append(n); ov.classList.add('is-shake'); setTimeout(() => { n.remove(); ov.classList.remove('is-shake'); }, 2600);
      }
    }
    if (x.phase === 'done' && S.lastPhase !== 'done' && S.lastPhase && S.open) setTimeout(() => {
      const c = document.createElement('div'); c.className = 'bm69-confetti'; const cols = ['#ffd76a', '#ff5a4e', '#b06bff', '#4ee6ff', '#5dff8a'];
      c.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${cols[Math.floor(Math.random() * cols.length)]};animation-duration:${2 + Math.random() * 2}s;animation-delay:${Math.random() * 0.8}s"></i>`).join('');
      document.body.append(c); setTimeout(() => c.remove(), 5000);
    }, 2600);
    S.lastPhase = x.phase;
  }
  function apply(d) {
    const prev = g(); S.d = d; S.at = performance.now();
    const x = g(); const k = JSON.stringify([x?.phase, x?.holder, x?.round, x?.players?.map((p) => p.id + p.out), x?.mode, x?.roundMs, x?.challenge, d.can, d.me, S.err, S.busy]);
    const changed = k !== S.key; S.key = k;
    if (changed) paint(); else tickUI();
    effects(prev, x);
    schedule();
  }
  async function poll() {
    const r = roomId();
    if (r !== S.room) { S.room = r; S.d = null; S.open = false; S.err = ''; S.key = ''; S.lastBoom = 0; S.lastPhase = ''; }
    if (!r) { paint(); schedule(); return; }
    try { const d = await api('/api/room-bomb?room=' + encodeURIComponent(r)); if (S.room === r) apply(d); } catch { schedule(); }
  }
  function schedule() {
    clearTimeout(S.poll); const x = g();
    const ms = !S.room ? 5000 : x && (x.phase === 'playing' || x.phase === 'boom') ? 900 : x?.phase === 'lobby' ? 2000 : 6000;
    S.poll = setTimeout(poll, document.hidden ? Math.max(ms, 5000) : ms);
  }
  const run = async (path, extra = {}) => { if (S.busy) return; S.busy = true; S.err = ''; paint(); audio();
    try { const d = await api('/api/room-bomb/' + path, { room: S.room, ...extra }); S.busy = false; apply(d); } catch (e) { S.busy = false; S.err = e.message || 'تعذّر الطلب.'; S.key = ''; paint(); poll(); } };
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bm]'); if (!b || b.disabled) return; const a = b.dataset.bm;
    if (a === 'close') { S.open = false; S.err = ''; paint(); return; }
    if (a === 'mode') return run('settings', { mode: b.dataset.v });
    if (a === 'ms') return run('settings', { roundMs: Number(b.dataset.v) });
    if (a === 'cancel') { if (!confirm('توقف لعبة القنبلة؟')) return; return run('cancel'); }
    if (['create', 'join', 'leave', 'start', 'pass', 'again'].includes(a)) return run(a);
  });
  pill.addEventListener('click', () => { S.open = true; S.err = ''; S.key = ''; audio(); paint(); poll(); });
  document.addEventListener('click', (e) => { if (!e.target.closest?.('[data-bm69-open]')) return; e.preventDefault(); e.stopPropagation(); document.querySelector('[data-so-action="panel-close"]')?.click(); S.open = true; S.err = ''; S.key = ''; audio(); paint(); poll(); }, true);
  addEventListener('la3bak:bomb', (e) => { if (e.detail?.room === S.room) poll(); });
  addEventListener('hashchange', () => setTimeout(poll, 50));
  addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  setInterval(() => { if (S.open && g() && (g().phase === 'playing' || g().phase === 'boom')) tickUI(); }, 100);
  poll();
}
