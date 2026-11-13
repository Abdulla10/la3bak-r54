// R130: «الفكّ» — لعبة ثلاثية الأبعاد داخل الغرفة الصوتية.
// آلة بفكّ مليان أسنان بنص طاولة خشب، وفيها لوحة أزرار ملغومة. الخادم يقرر كل شي، وهني بس الرسم والحركة والأصوات.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const CSS = `
.jw-ov{position:fixed;inset:0;z-index:96;background:#050304;color:#f3ece4;direction:rtl;font-family:inherit;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
.jw-ov[hidden]{display:none}
.jw-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.jw-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 45%,transparent 45%,#000a 80%,#000e 100%)}
.jw-flash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 55%,#ff1a1a66,#7a0000cc);opacity:0;transition:opacity .5s}
.jw-flash.on{opacity:1;transition:none}
.jw-hud{position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 8px) 10px calc(env(safe-area-inset-bottom,0px) + 10px)}
.jw-hud>*{pointer-events:auto}
.jw-top{display:flex;align-items:center;gap:8px}
.jw-ic{width:40px;height:40px;border-radius:50%;border:1px solid #ffffff2a;background:#0009;color:#fff;font-size:17px;display:grid;place-items:center;flex:none;backdrop-filter:blur(6px)}
.jw-title{flex:1;text-align:center;font-weight:900;font-size:17px;letter-spacing:.5px;color:#f1e3c8;text-shadow:0 2px 12px #000,0 0 18px #b3000088}
.jw-danger{margin:8px auto 0;display:flex;gap:6px;align-items:center;padding:6px 12px;border-radius:12px;background:#120406cc;border:1px solid #ff3b3b55;font-size:13px;font-weight:800;backdrop-filter:blur(6px);box-shadow:0 6px 18px #0008}
.jw-danger b{color:#ff5b5b;font-size:15px}
.jw-danger .pct{padding:2px 8px;border-radius:8px;background:#ff2b2b;color:#fff;font-size:13px}
.jw-turn{margin:8px auto 0;padding:7px 16px;border-radius:99px;font-weight:900;font-size:15px;background:#000b;border:1.5px solid #e9c46a88;display:flex;gap:8px;align-items:center;backdrop-filter:blur(6px)}
.jw-turn.me{background:linear-gradient(180deg,#b3121bcc,#5c0509cc);border-color:#ffb3b3;animation:jwPulse 1.1s ease-in-out infinite}
.jw-turn .tm{min-width:28px;text-align:center;padding:1px 7px;border-radius:8px;background:#ffffff1f;font-variant-numeric:tabular-nums}
.jw-turn .tm.low{background:#ff2b2b;color:#fff}
@keyframes jwPulse{50%{box-shadow:0 0 0 6px #ff2b2b33}}
.jw-need{margin:6px auto 0;font-size:13px;font-weight:800;color:#ffd98a;text-shadow:0 2px 6px #000}
.jw-log{pointer-events:none!important;margin:8px 0 0;display:flex;flex-direction:column;align-items:flex-start;gap:4px;max-width:78%}
.jw-log p{margin:0;padding:3px 9px;border-radius:9px;background:#000b;font-size:11.5px;line-height:1.5;animation:jwIn .35s ease-out;border-inline-start:3px solid #e9c46a}
.jw-log p.snap{border-color:#ff2b2b;color:#ffd0d0}.jw-log p.card{border-color:#8fd3ff}.jw-log p.safe{border-color:#4ade80}
@keyframes jwIn{from{opacity:0;transform:translateX(12px)}}
.jw-sp{flex:1;pointer-events:none!important}
.jw-peek{margin:0 auto 8px;padding:7px 14px;border-radius:12px;font-weight:900;font-size:14px;background:#000c;border:1px solid #fff3}
.jw-peek.ok{border-color:#4ade80;color:#bbf7d0}.jw-peek.bad{border-color:#ff4d4d;color:#ffd0d0}.jw-peek.pick{border-color:#8fd3ff;color:#d6efff}
.jw-pl{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:8px}
.jw-chip{display:flex;align-items:center;gap:5px;padding:4px 8px 4px 4px;border-radius:99px;background:#000b;border:1px solid #ffffff22;font-size:12px;font-weight:800;max-width:46%}
.jw-chip i{font-style:normal;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#3a2a20;overflow:hidden;flex:none;font-size:12px}
.jw-chip i img{width:100%;height:100%;object-fit:cover}
.jw-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jw-chip em{font-style:normal;font-size:11px;letter-spacing:-2px}
.jw-chip.turn{border-color:#ffcf5a;box-shadow:0 0 0 2px #ffcf5a55}.jw-chip.out{opacity:.4;text-decoration:line-through}
.jw-cards{display:flex;justify-content:center;gap:6px;min-height:0}
.jw-card{position:relative;width:min(23vw,94px);aspect-ratio:3/4.2;border-radius:10px;border:1px solid #d9c9a8;background:linear-gradient(160deg,#3b302a,#1b1412 60%,#2a1d18);box-shadow:0 8px 18px #000a,inset 0 0 0 3px #00000055,inset 0 0 22px #00000088;padding:6px 5px;display:flex;flex-direction:column;align-items:center;gap:3px;color:#f1e3c8;transition:transform .2s;overflow:hidden}
.jw-card::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 70% 20%,#8b000033,transparent 40%),repeating-linear-gradient(115deg,#ffffff06 0 2px,transparent 2px 7px);pointer-events:none}
.jw-card .em{font-size:26px;margin-top:4px;filter:drop-shadow(0 3px 4px #000)}
.jw-card b{font-size:13px;font-weight:900;text-transform:uppercase;color:#fff;background:#8b1010;padding:1px 8px;border-radius:4px;box-shadow:0 2px 4px #0008}
.jw-card small{font-size:10px;line-height:1.35;text-align:center;color:#d8c8b0}
.jw-card:not([disabled]):active{transform:translateY(-6px) scale(1.04)}
.jw-card[disabled]{filter:grayscale(.7) brightness(.7)}
.jw-card.sel{transform:translateY(-12px);box-shadow:0 0 0 2px #ffcf5a,0 12px 24px #000c}
.jw-help{text-align:center;font-size:12px;color:#cdbfa8;margin-top:6px;text-shadow:0 1px 4px #000}
.jw-panel{margin:auto;width:min(420px,100%);max-height:72vh;overflow:auto;background:linear-gradient(180deg,#1d1311ee,#0e0908f2);border:1px solid #e9c46a44;border-radius:20px;padding:14px;box-shadow:0 20px 50px #000c;backdrop-filter:blur(8px)}
.jw-panel h3{margin:0 0 6px;font-size:18px;color:#f1d28b;text-align:center}
.jw-panel p.sub{margin:0 0 10px;font-size:13px;color:#cdbfa8;text-align:center;line-height:1.7}
.jw-rows{display:grid;gap:6px;margin:8px 0}
.jw-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:12px;background:#ffffff0b;font-size:13.5px}
.jw-row>span{font-weight:800}
.jw-chs{display:flex;gap:5px}
.jw-ch{padding:6px 11px;border-radius:99px;border:1px solid #ffffff2a;background:#ffffff0d;color:#eee;font:inherit;font-weight:800;font-size:12.5px}
.jw-ch.on{background:linear-gradient(180deg,#c0262d,#7a0d12);border-color:transparent;color:#fff}
.jw-seats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}
.jw-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;font-weight:800;min-width:0}
.jw-seat i{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#6b4a3a,#2a1a14);border:2px solid #e9c46a;overflow:hidden;font-style:normal;font-size:20px}
.jw-seat i img{width:100%;height:100%;object-fit:cover}
.jw-seat span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jw-seat.empty i{border:2px dashed #ffffff33;background:#ffffff08;color:#ffffff55}
.jw-seat .x{position:absolute;top:-4px;left:6px;width:20px;height:20px;border-radius:50%;border:0;background:#c0262d;color:#fff;font-size:11px;line-height:20px;padding:0}
.jw-btn{width:100%;margin-top:8px;padding:13px;border:0;border-radius:15px;font:inherit;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(180deg,#d4252e,#8a0d14);box-shadow:inset 0 2px 0 #ffffff44,0 5px 0 #4d0509,0 10px 20px #000a}
.jw-btn:active{transform:translateY(3px);box-shadow:inset 0 2px 0 #ffffff44,0 2px 0 #4d0509}
.jw-btn.gold{color:#2a1400;background:linear-gradient(180deg,#ffe08a,#e0a21c);box-shadow:inset 0 2px 0 #fff8,0 5px 0 #8a5a00,0 10px 20px #000a}
.jw-btn.ghost{background:#ffffff12;box-shadow:none;border:1px solid #ffffff2a;font-size:14px;padding:10px}
.jw-btn:disabled{opacity:.5}
.jw-err{margin:8px 0 0;padding:7px 10px;border-radius:10px;background:#ff2b2b22;border:1px solid #ff2b2b66;color:#ffd0d0;font-size:13px;text-align:center}
.jw-steps{margin:6px 0 0;padding:0;list-style:none;display:grid;gap:5px;font-size:12.5px;color:#d8c8b0}
.jw-steps li{display:flex;gap:7px;line-height:1.55}.jw-steps li i{font-style:normal;flex:none}
.jw-win{font-size:46px;text-align:center;margin:4px 0;filter:drop-shadow(0 6px 10px #000)}
.jw-load{position:absolute;inset:0;display:grid;place-items:center;font-weight:800;color:#cdbfa8;background:#050304}
.jw-pill{position:fixed;top:calc(env(safe-area-inset-top,0px) + 118px);left:50%;transform:translateX(-50%);z-index:85;display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:99px;border:1.5px solid #ff6b6b;background:linear-gradient(180deg,#3a0a0e,#1a0406);color:#fff;font:inherit;font-weight:900;font-size:14px;box-shadow:0 8px 24px #000a;animation:jwPulse 1.4s infinite}
.jw-pill[hidden]{display:none}
body:has(.so-room-panel[data-so-open-panel]) .jw-pill{display:none!important}
@media (prefers-reduced-motion:reduce){.jw-ov *,.jw-pill{animation:none!important}}
`;

const ROT_HOME = 0;
export function startRoomJaws() {
  if (globalThis.__jw130) return; globalThis.__jw130 = true;
  if (!document.querySelector('style[data-jw130]')) { const s = document.createElement('style'); s.dataset.jw130 = '1'; s.textContent = CSS; document.head.append(s); }
  const api = (u, body) => fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || 'تعذّر الطلب.'); return j; });
  const ov = document.createElement('div'); ov.className = 'jw-ov'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'لعبة الفكّ');
  ov.innerHTML = '<canvas class="jw-cv"></canvas><div class="jw-vig"></div><div class="jw-flash"></div><div class="jw-hud"></div><div class="jw-load">جاري تجهيز الطاولة…</div>';
  const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'jw-pill'; pill.hidden = true;
  document.body.append(ov, pill);
  const hud = ov.querySelector('.jw-hud'), cv = ov.querySelector('.jw-cv'), flash = ov.querySelector('.jw-flash'), load = ov.querySelector('.jw-load');
  const S = { room: '', d: null, at: 0, open: false, err: '', busy: false, poll: 0, sel: '', peekMode: '', lastSnap: 0, lastSeq: -1, lastTurn: '', lastPressed: 0, lastBoard: 0, scene: null };
  const roomId = () => { const m = /^#\/social-room\/([0-9a-f-]{36})/i.exec((globalThis.__LA3BAK_NAV__ || location).hash); return m ? m[1] : ''; };
  const g = () => S.d?.game ?? null;

  /* ── أصوات (بدون ملفات) ── */
  let ac = null; const audio = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; } };
  const noise = (a, dur) => { const b = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); const s = a.createBufferSource(); s.buffer = b; return s; };
  const sfx = {
    click() { const a = audio(); if (!a) return; const t = a.currentTime; const n = noise(a, 0.05), f = a.createBiquadFilter(), gn = a.createGain(); f.type = 'bandpass'; f.frequency.value = 2400; gn.gain.value = 0.5; n.connect(f).connect(gn).connect(a.destination); n.start(t);
      const o = a.createOscillator(), og = a.createGain(); o.type = 'square'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.08); og.gain.setValueAtTime(0.12, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(og).connect(a.destination); o.start(t); o.stop(t + 0.12); },
    safe() { const a = audio(); if (!a) return; const t = a.currentTime; [523, 784].forEach((fq, i) => { const o = a.createOscillator(), gg = a.createGain(); o.type = 'triangle'; o.frequency.value = fq; gg.gain.setValueAtTime(0.0001, t + i * 0.07); gg.gain.exponentialRampToValueAtTime(0.08, t + i * 0.07 + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.25); o.connect(gg).connect(a.destination); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.3); }); },
    snap() { const a = audio(); if (!a) return; const t = a.currentTime;
      const o = a.createOscillator(), og = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.5); og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.6); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; o.connect(lp).connect(og).connect(a.destination); o.start(t); o.stop(t + 0.65);
      const n = noise(a, 0.45), hp = a.createBiquadFilter(), ng = a.createGain(); hp.type = 'highpass'; hp.frequency.value = 900; ng.gain.value = 0.7; n.connect(hp).connect(ng).connect(a.destination); n.start(t);
      [1800, 2650, 3900].forEach((fq) => { const m = a.createOscillator(), mg = a.createGain(); m.type = 'square'; m.frequency.value = fq; mg.gain.setValueAtTime(0.06, t); mg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); m.connect(mg).connect(a.destination); m.start(t); m.stop(t + 1); });
      const c = noise(a, 0.7), cf = a.createBiquadFilter(), cg = a.createGain(); cf.type = 'bandpass'; cf.frequency.value = 350; cg.gain.setValueAtTime(0.0001, t + 0.08); cg.gain.linearRampToValueAtTime(0.9, t + 0.12); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.75); c.connect(cf).connect(cg).connect(a.destination); c.start(t + 0.08); },
    card() { const a = audio(); if (!a) return; const t = a.currentTime; const n = noise(a, 0.25), f = a.createBiquadFilter(), gn = a.createGain(); f.type = 'bandpass'; f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.2); gn.gain.value = 0.35; n.connect(f).connect(gn).connect(a.destination); n.start(t); },
    tick() { const a = audio(); if (!a) return; const t = a.currentTime; const o = a.createOscillator(), gg = a.createGain(); o.type = 'sine'; o.frequency.value = 1300; gg.gain.setValueAtTime(0.05, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); o.connect(gg).connect(a.destination); o.start(t); o.stop(t + 0.08); },
    hum() { const a = audio(); if (!a) return; const t = a.currentTime; const o = a.createOscillator(), gg = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(55, t); o.frequency.linearRampToValueAtTime(70, t + 0.9); gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.05, t + 0.2); gg.gain.exponentialRampToValueAtTime(0.0001, t + 1); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; o.connect(lp).connect(gg).connect(a.destination); o.start(t); o.stop(t + 1.05); },
  };
  const buzz = (p) => { try { navigator.vibrate?.(p); } catch { /* */ } };

  /* ───────────── المشهد ثلاثي الأبعاد ───────────── */
  async function build3D() {
    const { THREE, RoomEnvironment } = await import('/vendor/gift3d-three.mjs');
    const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070405); scene.fog = new THREE.FogExp2(0x070405, 0.055);
    const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.7;
    const cam = new THREE.PerspectiveCamera(48, 1, 0.05, 80);

    /* خامات مرسومة بالكود */
    const canvasTex = (w, h, draw, repeat) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); } return t; };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const woodTex = canvasTex(1024, 1024, (x, w, h) => {
      x.fillStyle = '#4a2a17'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? '#56311b' : '#3f2313'; x.fillRect(0, i * h / 9, w, h / 9); x.fillStyle = '#1d0f07'; x.fillRect(0, i * h / 9, w, 3); }
      for (let i = 0; i < 1400; i++) { x.strokeStyle = `rgba(${rnd(20, 60) | 0},${rnd(10, 30) | 0},5,${rnd(0.05, 0.25)})`; x.lineWidth = rnd(0.5, 2.2); const y = rnd(0, h); x.beginPath(); x.moveTo(0, y); for (let k = 0; k <= w; k += 64) x.lineTo(k, y + Math.sin(k / rnd(40, 120) + i) * rnd(1, 5)); x.stroke(); }
      for (let i = 0; i < 6; i++) { const cx = rnd(0, w), cy = rnd(0, h); for (let r = 4; r < 30; r += 4) { x.strokeStyle = 'rgba(25,12,4,.35)'; x.beginPath(); x.ellipse(cx, cy, r * 2.2, r, 0, 0, 7); x.stroke(); } }
      for (let i = 0; i < 26; i++) { const cx = rnd(0, w), cy = rnd(0, h), r = rnd(3, 26); const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(120,0,0,.75)'); gr.addColorStop(1, 'rgba(70,0,0,0)'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
      for (let i = 0; i < 200; i++) { x.fillStyle = `rgba(255,230,200,${rnd(0.02, 0.06)})`; x.fillRect(rnd(0, w), rnd(0, h), rnd(20, 120), 1); }
    });
    const floorTex = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#1a0f0a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#22140d' : '#1c100a'; x.fillRect(i * w / 8, 0, w / 8 - 3, h); } for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(0,0,0,${rnd(0.05, 0.2)})`; x.fillRect(rnd(0, w), rnd(0, h), 2, rnd(10, 60)); } }, 6);
    const metalTex = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#5b5c61'; x.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${rnd(0.02, 0.07)})`; x.fillRect(rnd(0, w), rnd(0, h), rnd(1, 40), 1); } for (let i = 0; i < 40; i++) { const cx = rnd(0, w), cy = rnd(0, h), r = rnd(4, 40); const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(90,40,20,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(cx - r, cy - r, r * 2, r * 2); } for (let i = 0; i < 18; i++) { const cx = rnd(0, w), cy = rnd(0, h), r = rnd(2, 12); x.fillStyle = 'rgba(110,0,0,.6)'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } });
    const fleshTex = canvasTex(256, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a0a0f'); gr.addColorStop(1, '#2a0306'); x.fillStyle = gr; x.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { x.strokeStyle = `rgba(${rnd(120, 200) | 0},20,30,${rnd(0.1, 0.35)})`; x.lineWidth = rnd(0.5, 2); x.beginPath(); const sx = rnd(0, w), sy = rnd(0, h); x.moveTo(sx, sy); x.bezierCurveTo(sx + rnd(-30, 30), sy + rnd(-30, 30), sx + rnd(-30, 30), sy + rnd(-30, 30), sx + rnd(-40, 40), sy + rnd(-40, 40)); x.stroke(); } });

    const M = {
      metal: new THREE.MeshStandardMaterial({ color: 0xb4b7be, map: metalTex, metalness: 0.95, roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x2b2c31, map: metalTex, metalness: 0.88, roughness: 0.45 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xd9dbe0, metalness: 1, roughness: 0.18 }),
      wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.62, metalness: 0.02 }),
      chairWood: new THREE.MeshStandardMaterial({ color: 0x3a2214, map: woodTex, roughness: 0.75 }),
      floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }),
      flesh: new THREE.MeshStandardMaterial({ color: 0xa3161f, map: fleshTex, roughness: 0.35, metalness: 0.05, emissive: 0x2a0004, emissiveIntensity: 0.6 }),
      fleshIn: new THREE.MeshStandardMaterial({ color: 0x7a0d14, map: fleshTex, roughness: 0.4, side: THREE.BackSide, emissive: 0x200003, emissiveIntensity: 0.5 }),
      tooth: new THREE.MeshPhysicalMaterial({ color: 0xf1e7cf, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
      blood: new THREE.MeshPhysicalMaterial({ color: 0x7a0008, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
      key: new THREE.MeshPhysicalMaterial({ color: 0x1b1c20, roughness: 0.42, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.35 }),
      skin: new THREE.MeshStandardMaterial({ color: 0xe0ac8a, roughness: 0.55 }),
      glove: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.2 }),
      keyRim: new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.8 }),
    };

    /* الإضاءة: لمبة معلّقة دافية فوق الطاولة + إضاءة حمرا خفيفة */
    scene.add(new THREE.HemisphereLight(0x6b4a3a, 0x050203, 0.35));
    const lamp = new THREE.Group(); lamp.position.set(0, 6.2, 0); scene.add(lamp);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3, 6), M.dark); cord.position.y = 1.5; lamp.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.55, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide })); shade.position.y = 0.1; lamp.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); bulb.position.y = -0.12; lamp.add(bulb);
    const key = new THREE.SpotLight(0xffc787, 120, 16, 0.78, 0.55, 1.6); key.position.set(0, -0.1, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; lamp.add(key); key.target.position.set(0, -6.2, 0); lamp.add(key.target);
    const fill = new THREE.PointLight(0xff8a50, 6, 14, 2); fill.position.set(0, 2.6, 0); scene.add(fill);
    const redRim = new THREE.PointLight(0xff1a1a, 0, 6, 2); redRim.position.set(0, 1.6, 0); scene.add(redRim);
    const back = new THREE.DirectionalLight(0x6a7bff, 0.35); back.position.set(-6, 5, -8); scene.add(back);

    /* الغرفة */
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6; floor.receiveShadow = true; scene.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x140b08, map: woodTex, roughness: 0.95 });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 14, 32, 1, true), wallMat); wall.material.side = THREE.BackSide; wall.position.y = 5; scene.add(wall);

    /* الطاولة */
    const table = new THREE.Group(); scene.add(table);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 0.28, 72), M.wood); top.receiveShadow = true; top.castShadow = true; table.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.32, 0.11, 12, 96), M.dark); rim.rotation.x = Math.PI / 2; rim.position.y = 0.06; table.add(rim);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M.chrome); bolt.position.set(Math.cos(a) * 4.32, 0.15, Math.sin(a) * 4.32); table.add(bolt); }
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 1.5, 20), M.dark); leg.position.y = -0.85; leg.castShadow = true; table.add(leg);
    // بقع دم وكروت مرمية على الطاولة
    for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(rnd(0.05, 0.22), 18), M.blood); d.rotation.x = -Math.PI / 2; const a = rnd(0, 7), r = rnd(1.6, 3.9); d.position.set(Math.cos(a) * r, 0.142, Math.sin(a) * r); d.scale.x = rnd(0.7, 1.6); table.add(d); }

    /* الآلة */
    const mach = new THREE.Group(); mach.position.y = 0.14; scene.add(mach);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.42, 0.32, 40), M.dark); base.position.y = 0.16; base.castShadow = true; base.receiveShadow = true; mach.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.06, 10, 64), M.metal); ring.rotation.x = Math.PI / 2; ring.position.y = 0.32; mach.add(ring);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 10), M.metal); sp.position.set(Math.cos(a) * 1.46, 0.12, Math.sin(a) * 1.46); sp.rotation.z = -Math.cos(a) * 1.35; sp.rotation.x = Math.sin(a) * 1.35; sp.castShadow = true; mach.add(sp); }
    const turret = new THREE.Group(); turret.position.y = 0.32; mach.add(turret);
    // الفك السفلي: صندوق معدني بحواف
    const jawShape = new THREE.Shape(); { const w = 0.82, d = 1.05, r = 0.28; jawShape.moveTo(-w + r, -d); jawShape.lineTo(w - r, -d); jawShape.quadraticCurveTo(w, -d, w, -d + r); jawShape.lineTo(w, d - r); jawShape.quadraticCurveTo(w, d, w - r, d); jawShape.lineTo(-w + r, d); jawShape.quadraticCurveTo(-w, d, -w, d - r); jawShape.lineTo(-w, -d + r); jawShape.quadraticCurveTo(-w, -d, -w + r, -d); }
    const lower = new THREE.Mesh(new THREE.ExtrudeGeometry(jawShape, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 10 }), M.metal); lower.rotation.x = -Math.PI / 2; lower.castShadow = true; lower.receiveShadow = true; turret.add(lower);
    const gum = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.12, 2.02), M.flesh); gum.position.y = 0.47; turret.add(gum);
    // لوحة الأزرار 4×5
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.06, 1.62), M.keyRim); panel.position.set(0, 0.54, 0.02); panel.receiveShadow = true; turret.add(panel);
    const ks = new THREE.Shape(); { const w = 0.1, r = 0.04; ks.moveTo(-w + r, -w); ks.lineTo(w - r, -w); ks.quadraticCurveTo(w, -w, w, -w + r); ks.lineTo(w, w - r); ks.quadraticCurveTo(w, w, w - r, w); ks.lineTo(-w + r, w); ks.quadraticCurveTo(-w, w, -w, w - r); ks.lineTo(-w, -w + r); ks.quadraticCurveTo(-w, -w, -w + r, -w); }
    const keyGeo = new THREE.ExtrudeGeometry(ks, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3, curveSegments: 6 }); keyGeo.rotateX(-Math.PI / 2); keyGeo.translate(0, -0.03, 0); const keys = [];
    for (let i = 0; i < 20; i++) { const col = i % 4, row = Math.floor(i / 4); const k = new THREE.Mesh(keyGeo, M.key.clone()); k.position.set((col - 1.5) * 0.29, 0.6, (row - 2) * 0.3 + 0.02); k.castShadow = true; k.userData = { i, baseY: 0.6, y: 0.6, glow: 0, color: null }; turret.add(k); keys.push(k); }
    // أسنان الفك السفلي (على الحافة)
    const toothGeo = new THREE.ConeGeometry(0.075, 0.3, 10); toothGeo.translate(0, 0.15, 0);
    const lowerTeeth = new THREE.Group(); turret.add(lowerTeeth);
    const edgePts = []; for (let i = 0; i < 9; i++) edgePts.push([(i - 4) * 0.185, 1.0]); for (let i = 1; i < 8; i++) { edgePts.push([0.8, 1.0 - i * 0.26]); edgePts.push([-0.8, 1.0 - i * 0.26]); }
    for (const [x, z] of edgePts) { const t = new THREE.Mesh(toothGeo, M.tooth); t.position.set(x, 0.5, z); t.scale.setScalar(rnd(0.75, 1.15)); t.rotation.z = rnd(-0.12, 0.12); t.castShadow = true; lowerTeeth.add(t); if (Math.random() < 0.35) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), M.blood); b.position.set(x, 0.6 + rnd(0, 0.12), z); lowerTeeth.add(b); } }
    // الفك العلوي: قشرة معدنية تنفتح من ورا
    const hinge = new THREE.Group(); hinge.position.set(0, 0.58, -1.06); turret.add(hinge);
    const shellGeo = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2); shellGeo.scale(0.86, 0.9, 1.12);
    const shell = new THREE.Mesh(shellGeo, M.metal); shell.position.set(0, 0, 1.06); shell.castShadow = true; hinge.add(shell);
    const shellIn = new THREE.Mesh(shellGeo, M.fleshIn); shellIn.scale.setScalar(0.97); shellIn.position.copy(shell.position); hinge.add(shellIn);
    const lipGeo = new THREE.TorusGeometry(1, 0.05, 8, 64); const lip = new THREE.Mesh(lipGeo, M.dark); lip.rotation.x = Math.PI / 2; lip.scale.set(0.86, 1.12, 1); lip.position.copy(shell.position); hinge.add(lip);
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; if (Math.sin(a) < -0.85) continue; const t = new THREE.Mesh(toothGeo, M.tooth); t.position.set(Math.cos(a) * 0.82, -0.02, Math.sin(a) * 1.06 + 1.06); t.rotation.x = Math.PI; t.scale.setScalar(rnd(0.85, 1.3)); t.castShadow = true; hinge.add(t); }
    // دروع وبراغي فوق القشرة + عين حمرا
    for (let i = 0; i < 5; i++) { const dz = (i - 2) * 0.36, f = Math.sqrt(Math.max(0, 1 - (dz / 1.12) ** 2)) * 1.015; const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 40, Math.PI), M.dark); band.scale.set(0.86 * f, 0.9 * f, 1); band.position.set(0, 0, 1.06 + dz); hinge.add(band); }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff2020 })); eye.position.set(0, 0.86, 1.25); hinge.add(eye);
    const eyeLight = new THREE.PointLight(0xff2020, 1.2, 2.5, 2); eyeLight.position.copy(eye.position); hinge.add(eyeLight);
    // مكبس هيدروليك على الجنبين
    for (const sx of [-0.92, 0.92]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 12), M.chrome); p.position.set(sx, 0.75, -0.8); p.rotation.x = 0.5; turret.add(p); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 12), M.dark); c.position.set(sx, 0.45, -0.95); c.rotation.x = 0.5; turret.add(c); }

    /* الكراسي واللاعبين */
    const seatsG = new THREE.Group(); scene.add(seatsG);
    const texCache = new Map();
    const faceTex = (p) => {
      const k = p.id + '|' + (p.avatar || '') + '|' + (p.out ? 1 : 0); if (texCache.has(k)) return texCache.get(k);
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      const paint = (img) => { x.clearRect(0, 0, 256, 256); x.save(); x.beginPath(); x.arc(128, 128, 120, 0, 7); x.clip();
        if (img) x.drawImage(img, 0, 0, 256, 256); else { const gr = x.createRadialGradient(90, 80, 10, 128, 128, 140); gr.addColorStop(0, p.bot ? '#4b6b8a' : '#8a5a3c'); gr.addColorStop(1, '#1a0f0a'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); x.fillStyle = '#f1e3c8'; x.font = '900 120px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(p.bot ? '🤖' : [...String(p.name || '؟')][0], 128, 140); }
        if (p.out) { x.fillStyle = 'rgba(60,0,0,.65)'; x.fillRect(0, 0, 256, 256); x.font = '900 120px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('💀', 128, 132); }
        x.restore(); x.lineWidth = 10; x.strokeStyle = p.out ? '#5a0000' : '#e9c46a'; x.beginPath(); x.arc(128, 128, 122, 0, 7); x.stroke(); t.needsUpdate = true; };
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; paint(null);
      if (p.avatar && !p.out) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => paint(im); im.src = p.avatar; }
      texCache.set(k, t); return t;
    };
    const labelTex = (txt, sub, hot) => { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d'); x.font = '900 54px sans-serif'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = 'rgba(0,0,0,.65)'; const w = Math.min(500, x.measureText(txt).width + 60); x.beginPath(); x.roundRect?.(256 - w / 2, 8, w, 76, 38); x.fill(); x.fillStyle = hot ? '#ffcf5a' : '#f6efe4'; x.fillText(txt, 256, 66); x.font = '700 48px sans-serif'; x.fillText(sub, 256, 140); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    let seatObjs = new Map(); let seatKey = '';
    const seatAngle = (i, n, meIdx) => Math.PI / 2 + ((i - meIdx) / n) * Math.PI * 2; // أنا دايماً قدام الكاميرا (z موجب)
    function layoutSeats(x) {
      const ps = x?.players || []; const meIdx = Math.max(0, ps.findIndex((p) => p.me));
      const k = ps.map((p) => `${p.id}:${p.out ? 1 : 0}:${p.hands}:${x.turn === p.id ? 1 : 0}:${p.avatar || ''}`).join('|') + '#' + meIdx;
      if (k === seatKey) return; seatKey = k;
      for (const o of seatObjs.values()) { seatsG.remove(o.g); o.g.traverse((m) => { m.geometry?.dispose?.(); if (m.material?.map && m.material.map.__lbl) m.material.map.dispose(); }); }
      seatObjs = new Map();
      ps.forEach((p, i) => {
        const a = seatAngle(i, ps.length, meIdx); const G = new THREE.Group(); G.position.set(Math.cos(a) * 5.3, -0.25, Math.sin(a) * 5.3); G.lookAt(0, -0.25, 0); seatsG.add(G);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 1), M.chairWood); seat.position.set(0, 0.05, -0.1); seat.castShadow = true; seat.receiveShadow = true; G.add(seat);
        const backr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.12), M.chairWood); backr.position.set(0, 0.8, -0.58); backr.castShadow = true; G.add(backr);
        for (const sx of [-0.48, 0.48]) for (const sz of [-0.52, 0.32]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), M.chairWood); l.position.set(sx, -0.6, sz); G.add(l); }
        const turn = x.turn === p.id && x.phase !== 'lobby';
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), new THREE.MeshBasicMaterial({ map: faceTex(p), transparent: true, toneMapped: false }));
        face.position.set(0, 1.25, -0.2); if (!p.me) G.add(face);
        const lt = labelTex(p.name, p.out ? 'خرج' : '✋'.repeat(Math.max(0, p.hands)) + (p.cards ? `  🃏${p.cards}` : ''), turn); lt.__lbl = true;
        const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, toneMapped: false })); lab.position.set(0, 2.15, -0.2); if (!p.me) G.add(lab);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 8, 48), new THREE.MeshBasicMaterial({ color: turn ? 0xffcf5a : p.out ? 0x550000 : 0x3a2a20, toneMapped: false })); halo.position.copy(face.position); halo.position.z += 0.01; if (!p.me) G.add(halo);
        if (turn) { const sp = new THREE.PointLight(0xffb347, 5, 3, 2); sp.position.set(0, 1.4, 0.7); G.add(sp); }
        if (p.out) G.rotation.z = 0.12;
        seatObjs.set(p.id, { g: G, a, face, halo, lab });
      });
    }

    /* غبار طاير بالضو */
    const dustN = 220, dustG = new THREE.BufferGeometry(), dp = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) { dp[i * 3] = rnd(-4, 4); dp[i * 3 + 1] = rnd(0, 6); dp[i * 3 + 2] = rnd(-4, 4); }
    dustG.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.025, transparent: true, opacity: 0.55, depthWrite: false })); scene.add(dust);

    /* شظايا دم وقت العضّة */
    const bits = []; const bitGeo = new THREE.SphereGeometry(0.035, 6, 5);
    const splash = (pos) => { for (let i = 0; i < 46; i++) { const b = new THREE.Mesh(bitGeo, M.blood); b.position.copy(pos); b.userData.v = new THREE.Vector3(rnd(-2.2, 2.2), rnd(1.5, 4.2), rnd(-2.2, 2.2)); b.userData.life = 1.2; scene.add(b); bits.push(b); } };
    const sparks = []; const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd38a, toneMapped: false });
    const spark = (pos) => { for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.09), sparkMat); b.position.copy(pos); b.userData.v = new THREE.Vector3(rnd(-3, 3), rnd(1, 3.5), rnd(-3, 3)); b.userData.life = 0.6; scene.add(b); sparks.push(b); } };

    /* يد اللاعب (قفاز) — تدخل وتضغط الزر */
    const hand = new THREE.Group(); hand.visible = false; scene.add(hand);
    { const palm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), M.glove); palm.scale.set(1, 0.45, 1.25); hand.add(palm);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.5, 16), M.skin); cuff.rotation.x = Math.PI / 2; cuff.position.z = -0.42; hand.add(cuff);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.4, 16), new THREE.MeshStandardMaterial({ color: 0x3b4a5a, roughness: 0.85 })); sleeve.rotation.x = Math.PI / 2; sleeve.position.z = -1.3; hand.add(sleeve);
      const finger = (x, len, curl) => { const f = new THREE.Group(); f.position.set(x, 0.02, 0.2); const seg = new THREE.Mesh(THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.038, len, 4, 8) : new THREE.CylinderGeometry(0.038, 0.038, len, 8), M.glove); seg.rotation.x = Math.PI / 2; seg.position.z = len / 2; f.add(seg); f.rotation.x = curl; hand.add(f); return f; };
      finger(0.0, 0.34, 0.05); finger(0.09, 0.16, 1.3); finger(-0.09, 0.16, 1.3); finger(0.16, 0.13, 1.4); const th = finger(-0.17, 0.16, 0.6); th.rotation.y = -0.6; }
    const H = { on: false, t: 0, dur: 0.9, from: new THREE.Vector3(), to: new THREE.Vector3(), snap: false, blood: false };
    const handGo = (btn, snapHit) => { const k = keys[btn]; if (!k) return; const kp = new THREE.Vector3(); k.getWorldPosition(kp);
      const front = new THREE.Vector3(Math.sin(turret.rotation.y), 0, Math.cos(turret.rotation.y)); H.to.copy(kp).add(new THREE.Vector3(0, 0.07, 0)).addScaledVector(front, -0.3);
      H.from.copy(H.to).addScaledVector(front, 3.2).add(new THREE.Vector3(0, 1.1, 0)); H.on = true; H.t = 0; H.snap = !!snapHit; H.dur = snapHit ? 1.6 : 0.95; hand.visible = true; hand.position.copy(H.from); hand.lookAt(H.to.clone().addScaledVector(front, -0.4).add(new THREE.Vector3(0, -0.35, 0))); };
    const handTick = (dt) => { if (!H.on) return; H.t += dt; const u = H.t / H.dur; const ease = (v) => v * v * (3 - 2 * v);
      let p; if (u < 0.35) p = ease(u / 0.35); else if (u < 0.5) p = 1; else p = 1 - ease(Math.min(1, (u - 0.5) / 0.5));
      hand.position.lerpVectors(H.from, H.to, p); if (u > 0.35 && u < 0.5) hand.position.y -= Math.sin(((u - 0.35) / 0.15) * Math.PI) * 0.06;
      if (H.snap && u > 0.5) { hand.position.x += rnd(-1, 1) * 0.03; hand.position.y += rnd(-1, 1) * 0.03; }
      if (u >= 1) { H.on = false; hand.visible = false; } };
    /* حالة الحركة */
    const A = { jaw: 0.95, jawT: 0.95, rot: ROT_HOME, rotT: ROT_HOME, shake: 0, camPos: new THREE.Vector3(0, 4.6, 9), camLook: new THREE.Vector3(0, 0.7, 0), camPosT: new THREE.Vector3(0, 4.6, 9), camLookT: new THREE.Vector3(0, 0.7, 0), red: 0, close: 0, sway: 0 };
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let hover = -1;
    const pickKey = (cx, cy) => { const r = cv.getBoundingClientRect(); ptr.x = ((cx - r.left) / r.width) * 2 - 1; ptr.y = -((cy - r.top) / r.height) * 2 + 1; ray.setFromCamera(ptr, cam); const hit = ray.intersectObjects(keys, false)[0]; return hit ? hit.object.userData.i : -1; };

    function setState(x, me) {
      layoutSeats(x);
      const playing = x && (x.phase === 'playing' || x.phase === 'snap');
      // الآلة تلف على اللي عليه الدور
      const turnSeat = x?.turn ? seatObjs.get(x.turn) : null;
      if (turnSeat && playing) { A.rotT = -turnSeat.a + Math.PI / 2; }
      // نخلي الدوران أقصر طريق
      while (A.rotT - A.rot > Math.PI) A.rotT -= Math.PI * 2; while (A.rotT - A.rot < -Math.PI) A.rotT += Math.PI * 2;
      // الكاميرا: من مكاني، وبدوري تقرّب فوق الأزرار
      const myTurn = !!me?.myTurn && x?.phase === 'playing';
      if (myTurn) { A.camPosT.set(0, 3.25, 2.55); A.camLookT.set(0, 0.55, 0.15); }
      else if (x?.phase === 'snap' && x.snap) { const s = seatObjs.get(x.snap.id); const a = s ? s.a : Math.PI / 2; A.camPosT.set(Math.cos(a) * 3.6 + 0.8, 2.6, Math.sin(a) * 3.6 + 0.8); A.camLookT.set(0, 0.8, 0); }
      else { A.camPosT.set(0, 4.7, 9.2); A.camLookT.set(0, 0.6, 0); }
      // الأزرار
      const pressed = new Set(x?.board?.pressed || []); const reveal = new Set(x?.board?.reveal || []);
      for (const k of keys) { const i = k.userData.i; const isP = pressed.has(i); k.userData.y = isP ? 0.55 : 0.6;
        let col = null; if (reveal.has(i)) col = 0xff1a1a; else if (me?.peek && me.peek.btn === i) col = me.peek.safe ? 0x22ff88 : 0xff3b3b; else if (isP) col = 0x2a7a3a;
        k.userData.color = col; k.material.color.set(isP && !reveal.has(i) ? 0x0d100e : 0x1b1c20); if (isP && col === 0x2a7a3a) col = 0x1a9a4a; k.material.emissive.set(col ?? 0x000000); k.material.emissiveIntensity = col ? (reveal.has(i) ? 1.6 : isP ? 0.35 : 0.9) : 0; }
      if (!playing) A.jawT = 0.95;
    }
    function snapFx(x) {
      const btn = x.snap?.btn ?? 0; handGo(btn, true); sfx.click();
      setTimeout(() => { A.jawT = 0; A.jaw = Math.min(A.jaw, 0.6); A.shake = 1; A.red = 1; sfx.snap(); buzz([60, 40, 160]); flash.classList.add('on'); setTimeout(() => flash.classList.remove('on'), 140);
        const k = keys[btn]; const wp = new THREE.Vector3(); k.getWorldPosition(wp); splash(wp); spark(wp); M.glove.color.set(0x5a0a0a); setTimeout(() => M.glove.color.set(0x2a2a2a), 2500); }, 380);
      setTimeout(() => { A.jawT = 0.95; sfx.hum(); }, 2600);
    }
    function pressFx(btn) { const k = keys[btn]; if (!k) return; handGo(btn, false); setTimeout(() => { k.position.y = 0.5; sfx.click(); const wp = new THREE.Vector3(); k.getWorldPosition(wp); spark(wp); setTimeout(() => sfx.safe(), 160); A.jawT = 0.72; setTimeout(() => (A.jawT = 0.95), 450); }, 330); }

    let w = 0, h = 0; const resize = () => { const r = ov.getBoundingClientRect(); if (r.width === w && r.height === h) return; w = r.width; h = r.height; R.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.fov = cam.aspect < 0.7 ? 58 : 46; cam.updateProjectionMatrix(); };
    let last = performance.now(), raf = 0, running = false;
    const loop = (now) => {
      raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; resize();
      const t = now / 1000;
      A.jaw += (A.jawT - A.jaw) * (A.jawT < A.jaw ? Math.min(1, dt * 28) : Math.min(1, dt * 2.2));
      hinge.rotation.x = -A.jaw * 1.1 + Math.sin(t * 1.7) * 0.015 * (A.jawT > 0.5 ? 1 : 0);
      A.rot += (A.rotT - A.rot) * Math.min(1, dt * 3); turret.rotation.y = A.rot;
      A.camPos.lerp(A.camPosT, Math.min(1, dt * 2.6)); A.camLook.lerp(A.camLookT, Math.min(1, dt * 2.6));
      // الكاميرا تلف مع مكاني (أنا دايماً قدام) — والاهتزاز
      cam.position.copy(A.camPos); if (A.shake > 0) { cam.position.x += rnd(-1, 1) * A.shake * 0.12; cam.position.y += rnd(-1, 1) * A.shake * 0.12; A.shake = Math.max(0, A.shake - dt * 1.6); }
      cam.position.x += Math.sin(t * 0.3) * 0.06; cam.lookAt(A.camLook);
      // اللمبة تتمرجح
      lamp.rotation.z = Math.sin(t * 0.9) * 0.035 + A.shake * Math.sin(t * 40) * 0.05; lamp.rotation.x = Math.cos(t * 0.7) * 0.025;
      key.intensity = 120 * (0.94 + Math.sin(t * 13) * 0.02 + (Math.random() < 0.01 ? -0.35 : 0));
      A.red = Math.max(0, A.red - dt * 0.6); redRim.intensity = A.red * 40 + 0.6 + Math.sin(t * 2) * 0.3; eye.material.color.setRGB(1, 0.1 + Math.sin(t * 4) * 0.08, 0.1); eyeLight.intensity = 1 + Math.sin(t * 4) * 0.5 + A.red * 6;
      handTick(dt);
      for (const k of keys) { k.position.y += (k.userData.y - k.position.y) * Math.min(1, dt * 12); if (k.userData.i === hover && k.userData.color == null) { k.material.emissive.set(0xffb347); k.material.emissiveIntensity = 0.5 + Math.sin(t * 8) * 0.2; } else if (k.userData.color == null) k.material.emissiveIntensity = 0; else if (k.userData.color === 0xff1a1a) k.material.emissiveIntensity = 1.2 + Math.sin(t * 10) * 0.6; }
      const pa = dustG.attributes.position; for (let i = 0; i < dustN; i++) { pa.array[i * 3 + 1] += dt * 0.05; pa.array[i * 3] += Math.sin(t + i) * dt * 0.02; if (pa.array[i * 3 + 1] > 6) pa.array[i * 3 + 1] = 0; } pa.needsUpdate = true;
      for (let i = bits.length - 1; i >= 0; i--) { const b = bits[i]; b.userData.v.y -= 9.8 * dt; b.position.addScaledVector(b.userData.v, dt); if (b.position.y < 0.15) { b.position.y = 0.15; b.userData.v.set(0, 0, 0); } b.userData.life -= dt * 0.25; if (b.userData.life <= 0) { scene.remove(b); bits.splice(i, 1); } }
      for (let i = sparks.length - 1; i >= 0; i--) { const b = sparks[i]; b.userData.v.y -= 9.8 * dt; b.position.addScaledVector(b.userData.v, dt); b.lookAt(b.position.clone().add(b.userData.v)); b.userData.life -= dt; if (b.userData.life <= 0) { scene.remove(b); b.geometry.dispose(); sparks.splice(i, 1); } }
      R.render(scene, cam);
    };
    const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    return { setState, snapFx, pressFx, start, stop, pickKey, setHover: (i) => { hover = i; } };
  }

  /* ───────────── الواجهة ───────────── */
  const handsTxt = (n) => '✋'.repeat(Math.max(0, n));
  const face = (p) => p.avatar ? `<img src="${esc(p.avatar)}" alt="" loading="lazy">` : (p.bot ? '🤖' : esc([...String(p.name || '؟')][0]));
  const cardHTML = (c, can) => `<button type="button" class="jw-card${S.sel === c.id ? ' sel' : ''}" data-jw="card" data-id="${esc(c.id)}"${can ? '' : ' disabled'}><span class="em">${c.icon}</span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small></button>`;
  function lobbyHTML(x, me, can) {
    const seats = x.players.map((p) => `<div class="jw-seat"><i>${face(p)}</i><span>${esc(p.name)}${p.id === x.host ? ' 👑' : ''}</span>${can.settings && p.id !== x.host ? `<button type="button" class="x" data-jw="kick" data-who="${esc(p.id)}" aria-label="إزالة">✕</button>` : ''}</div>`).join('')
      + Array.from({ length: Math.max(0, 6 - x.players.length) }, () => '<div class="jw-seat empty"><i>+</i><span>فاضي</span></div>').join('');
    return `<div class="jw-panel"><h3>🦷 الفكّ</h3><p class="sub">آلة بأسنان حديد ولوحة أزرار ملغومة. بدورك تضغط زر — لو ملغوم الفك يعضّك وتخسر يد. آخر واحد يبقى يفوز.</p>
      <div class="jw-seats">${seats}</div>
      ${can.settings ? `<div class="jw-rows"><div class="jw-row"><span>✋ الأيادي</span><div class="jw-chs">${[1, 2].map((n) => `<button type="button" class="jw-ch${x.startHands === n ? ' on' : ''}" data-jw="hands" data-v="${n}">${n === 1 ? 'يد وحدة' : 'يدين'}</button>`).join('')}</div></div>
        <div class="jw-row"><span>⏱️ وقت الدور</span><div class="jw-chs">${[20000, 30000, 45000].map((n) => `<button type="button" class="jw-ch${x.turnMs === n ? ' on' : ''}" data-jw="ms" data-v="${n}">${n / 1000}ث</button>`).join('')}</div></div></div>` : `<p class="sub">✋ ${x.startHands === 1 ? 'يد وحدة' : 'يدين'} · ⏱️ ${x.turnMs / 1000} ثانية للدور</p>`}
      <ul class="jw-steps"><li><i>🎯</i>كل ما قلّت الأزرار، زاد الخطر.</li><li><i>🃏</i>عندك بطاقات خيانة: عكس، دبل، تمرير، إعادة، كشف…</li><li><i>🏆</i>الفايز ياخذ ${nf(x.prizeAmount)} عملة (لو 3 لاعبين أو أكثر).</li></ul>
      ${S.err ? `<p class="jw-err">${esc(S.err)}</p>` : ''}
      ${can.join ? '<button type="button" class="jw-btn gold" data-jw="join">اقعد على الطاولة</button>' : ''}
      ${can.bot ? '<button type="button" class="jw-btn ghost" data-jw="bot">🤖 أضف بوت</button>' : ''}
      ${can.start ? '<button type="button" class="jw-btn" data-jw="start">ابدأ اللعبة</button>' : me.host ? '<p class="sub">ينتظر لاعب ثاني على الأقل… (أو أضف بوت)</p>' : me.joined ? '<p class="sub">ننتظر المضيف يبدأ…</p>' : ''}
      ${can.leave ? '<button type="button" class="jw-btn ghost" data-jw="leave">قوم من الطاولة</button>' : ''}
      ${can.cancel ? '<button type="button" class="jw-btn ghost" data-jw="cancel">إلغاء اللعبة</button>' : ''}</div>`;
  }
  function paint() {
    pill.hidden = true;
    if (!S.open) { ov.hidden = true; S.scene?.stop(); const x = g(); if (x && S.room && (x.phase === 'lobby' || x.phase === 'playing' || x.phase === 'snap')) { pill.hidden = false; pill.textContent = x.phase === 'lobby' ? '🦷 لعبة الفكّ تنتظر لاعبين — ادخل' : (S.d?.me?.myTurn ? '🦷 دورك بالفكّ!' : '🦷 لعبة الفكّ شغالة'); } return; }
    ov.hidden = false; S.scene?.start();
    const d = S.d || {}; const x = d.game; const me = d.me || {}; const can = d.can || {};
    if (!d.member && S.d) { hud.innerHTML = '<div class="jw-top"><button type="button" class="jw-ic" data-jw="close" aria-label="إغلاق">✕</button><div class="jw-title">الفكّ 🦷</div><span style="width:40px"></span></div><div class="jw-panel"><p class="sub">ادخل الغرفة أول عشان تلعب.</p></div>'; return; }
    const topBar = `<div class="jw-top"><button type="button" class="jw-ic" data-jw="close" aria-label="إغلاق">✕</button><div class="jw-title">الفكّ 🦷</div><button type="button" class="jw-ic" data-jw="snd" aria-label="صوت">🔊</button></div>`;
    if (!x) { hud.innerHTML = topBar + `<div class="jw-panel"><h3>🦷 الفكّ</h3><p class="sub">آلة بأسنان حديد بنص الطاولة، ولوحة أزرار فيها ألغام. كل واحد بدوره يدخل يده ويضغط… واللي يطيح على لغم الفك يعضّه!</p>${S.err ? `<p class="jw-err">${esc(S.err)}</p>` : ''}${can.create ? '<button type="button" class="jw-btn" data-jw="create">افتح طاولة</button>' : '<p class="sub">صاحب الغرفة أو المشرف يفتح الطاولة.</p>'}</div>`; return; }
    if (x.phase === 'lobby') { hud.innerHTML = topBar + lobbyHTML(x, me, can); return; }
    if (x.phase === 'done') {
      const w = x.winner; hud.innerHTML = topBar + `<div class="jw-panel"><div class="jw-win">🏆</div><h3>${w ? esc(w.name) + ' فاز!' : 'خلصت اللعبة'}</h3>${x.prize ? `<p class="sub">ربح ${nf(x.prize)} عملة 🪙</p>` : ''}<div class="jw-rows">${x.players.map((p) => `<div class="jw-row"><span>${esc(p.name)}</span><span>${p.out ? '💀' : '🏆'}</span></div>`).join('')}</div>${can.again ? '<button type="button" class="jw-btn gold" data-jw="again">جولة ثانية</button>' : ''}<button type="button" class="jw-btn ghost" data-jw="close">رجوع للغرفة</button></div>`; return;
    }
    // اللعب
    const left = x.left == null ? null : Math.max(0, Math.ceil((x.left - (Date.now() - S.at)) / 1000));
    const myTurn = me.myTurn && x.phase === 'playing';
    const b = x.board || {};
    const turnTxt = x.phase === 'snap' ? `🦷 ${esc(x.snap?.name || '')}…` : myTurn ? 'دورك! اضغط زر' : `دور ${esc(x.turnName)}`;
    const log = (x.log || []).slice(-2).map((e) => `<p class="${e.kind}">${esc(e.text)}</p>`).join('');
    const peek = S.peekMode ? '<div class="jw-peek pick">👁️ اختر الزر اللي تبي تكشفه</div>' : me.peek ? `<div class="jw-peek ${me.peek.safe ? 'ok' : 'bad'}">👁️ الزر ${me.peek.btn + 1}: ${me.peek.safe ? 'سليم ✅' : 'ملغوم 💀'}</div>` : '';
    hud.innerHTML = topBar
      + `<div class="jw-danger">💀 <b>${b.mines}</b> أزرار خطيرة من ${b.remaining} <span class="pct">${b.danger}%</span></div>`
      + `<div class="jw-turn${myTurn ? ' me' : ''}">${turnTxt}${left != null && x.phase === 'playing' ? `<span class="tm${left <= 5 ? ' low' : ''}" data-jw-tm>${left}</span>` : ''}</div>`
      + (myTurn && x.need > 1 ? `<div class="jw-need">✌️ لازم تضغط ${x.need} أزرار</div>` : x.extraNext ? '<div class="jw-need">✌️ اللي بعده يضغط زرّين</div>' : '')
      + `<div class="jw-log">${log}</div><div class="jw-sp"></div>${peek}`
      + `<div class="jw-pl">${x.players.map((p) => `<span class="jw-chip${x.turn === p.id ? ' turn' : ''}${p.out ? ' out' : ''}"><i>${face(p)}</i><span>${esc(p.name)}</span><em>${handsTxt(p.hands)}</em></span>`).join('')}</div>`
      + (me.joined ? `<div class="jw-cards">${(me.cards || []).map((c) => cardHTML(c, myTurn && can.card)).join('') || '<p class="jw-help">ما عندك بطاقات</p>'}</div><div class="jw-help">${myTurn ? (S.sel ? 'اضغط البطاقة مرة ثانية عشان تستخدمها' : 'المس زر باللوحة عشان تضغطه · أو استخدم بطاقة') : 'انتظر دورك… وجهّز خيانتك 😈'}</div>` : '<div class="jw-help">أنت تتفرج 👀</div>')
      + (S.err ? `<p class="jw-err">${esc(S.err)}</p>` : '');
  }
  function effects(prev, x, me) {
    if (!S.scene || !x) return;
    S.scene.setState(x, me);
    if (x.snap && x.snap.at !== S.lastSnap) { const fresh = S.lastSnap !== 0 || (Date.now() - x.snap.at < 4000); S.lastSnap = x.snap.at; if (fresh && x.phase === 'snap') S.scene.snapFx(x); }
    const pc = x.board?.pressed?.length ?? 0;
    if (prev && prev.board && x.board && prev.board.no === x.board.no && pc > (prev.board.pressed?.length ?? 0) && x.phase !== 'snap') S.scene.pressFx(x.board.pressed[pc - 1]);
    if (prev && x.turn !== prev.turn && me?.myTurn) { sfx.hum(); buzz(80); }
    const le = x.log?.[x.log.length - 1]; if (le && le.kind === 'card' && (!prev || (prev.log?.[prev.log.length - 1]?.at !== le.at))) sfx.card();
  }
  function apply(d) {
    const prev = g(); S.d = d; S.at = Date.now();
    if (S.peekMode && !d.me?.myTurn) S.peekMode = '';
    if (S.sel && !(d.me?.cards || []).some((c) => c.id === S.sel)) S.sel = '';
    paint(); effects(prev, d.game, d.me); schedule();
  }
  async function poll() {
    const r = roomId();
    if (r !== S.room) { S.room = r; S.d = null; S.open = false; S.err = ''; S.lastSnap = 0; }
    if (!r) { paint(); schedule(); return; }
    try { const d = await api('/api/room-jaws?room=' + encodeURIComponent(r)); if (S.room === r) apply(d); } catch { schedule(); }
  }
  function schedule() {
    clearTimeout(S.poll); const x = g();
    const ms = !S.room ? 5000 : x && (x.phase === 'playing' || x.phase === 'snap') ? 900 : x?.phase === 'lobby' ? 2000 : 7000;
    S.poll = setTimeout(poll, document.hidden ? Math.max(ms, 5000) : ms);
  }
  const run = async (path, extra = {}) => { if (S.busy) return; S.busy = true; S.err = ''; audio();
    try { const d = await api('/api/room-jaws/' + path, { room: S.room, ...extra }); S.busy = false; apply(d); } catch (e) { S.busy = false; S.err = e.message || 'تعذّر الطلب.'; paint(); setTimeout(() => { S.err = ''; paint(); }, 3500); poll(); } };
  async function open() {
    S.open = true; S.err = ''; audio(); ov.hidden = false; paint();
    if (!S.scene) { try { S.scene = await build3D(); load.remove(); } catch (e) { load.textContent = 'جهازك ما يدعم الرسم ثلاثي الأبعاد 😕'; } }
    S.scene?.start(); poll();
  }
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-jw]'); if (!b || b.disabled) return; const a = b.dataset.jw;
    if (a === 'close') { S.open = false; S.err = ''; S.sel = ''; S.peekMode = ''; paint(); return; }
    if (a === 'snd') { audio(); sfx.click(); return; }
    if (a === 'hands') return run('settings', { hands: Number(b.dataset.v) });
    if (a === 'ms') return run('settings', { turnMs: Number(b.dataset.v) });
    if (a === 'kick') return run('kick', { who: b.dataset.who });
    if (a === 'cancel') { if (!confirm('توقف لعبة الفكّ؟')) return; return run('cancel'); }
    if (a === 'card') { const id = b.dataset.id; if (S.sel !== id) { S.sel = id; sfx.tick(); paint(); return; } const c = (S.d?.me?.cards || []).find((z) => z.id === id); S.sel = ''; if (c?.k === 'peek') { S.peekMode = id; paint(); return; } return run('card', { card: id }); }
    if (['create', 'join', 'leave', 'start', 'again', 'bot'].includes(a)) return run(a);
  });
  // لمس الأزرار بالمشهد
  let downAt = null;
  cv.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; if (S.scene && S.d?.me?.myTurn) S.scene.setHover(S.scene.pickKey(e.clientX, e.clientY)); });
  cv.addEventListener('pointerup', (e) => {
    if (!downAt || !S.scene) return; const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 12; downAt = null; S.scene.setHover(-1); if (moved) return;
    const x = g(); if (!x || x.phase !== 'playing' || !S.d?.me?.myTurn) return;
    const i = S.scene.pickKey(e.clientX, e.clientY); if (i < 0 || (x.board.pressed || []).includes(i)) return;
    if (S.peekMode) { const id = S.peekMode; S.peekMode = ''; return run('card', { card: id, btn: i }); }
    sfx.click(); buzz(25); run('press', { btn: i });
  });
  pill.addEventListener('click', () => open());
  document.addEventListener('click', (e) => { if (!e.target.closest?.('[data-jw130-open]')) return; e.preventDefault(); e.stopPropagation(); document.querySelector('[data-so-action="panel-close"]')?.click(); open(); }, true);
  addEventListener('la3bak:jaws', (e) => { if (e.detail?.room === S.room) poll(); });
  addEventListener('hashchange', () => setTimeout(poll, 50));
  addEventListener('visibilitychange', () => { if (!document.hidden) poll(); else S.scene?.stop(); });
  let lastSec = -1;
  setInterval(() => { const x = g(); if (!S.open || !x || x.phase !== 'playing' || x.left == null) return; const n = ov.querySelector('[data-jw-tm]'); if (!n) return; const s = Math.max(0, Math.ceil((x.left - (Date.now() - S.at)) / 1000)); if (s !== lastSec) { lastSec = s; n.textContent = String(s); n.classList.toggle('low', s <= 5); if (s <= 5 && s > 0 && S.d?.me?.myTurn) sfx.tick(); } }, 200);
  poll();
  globalThis.__jw130open = open; globalThis.__jw130press = (i) => run('press', { btn: i });
}
