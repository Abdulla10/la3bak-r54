/* بولينغ ثلاثي الأبعاد (R68z23) — رسم فقط. النتيجة يحسبها الخادم، والحركة من bowling-physics.js.
 * الإحداثيات: x يمين/يسار، y لفوق، z لقدام = -(طول المسار). بالمتر. */
import { PINS, HALF, HP, BR, BALL_Y0 } from './bowling-physics.js?v=r68z23';

const M = 0.01; // سم → متر
const END = HP + 3 * 26.4 + 60;
const LW = HALF * 2 * M;
const COLORS = [['#1d4fd8', '#0a1f6e', '#5fa0ff'], ['#d4202a', '#5e0a10', '#ff7a6a'], ['#13963f', '#063d1a', '#6ae69a'], ['#7b2fd6', '#2a0a5e', '#c48bff']];

let T = null;
export async function load() { if (!T) T = (await import('/vendor/gift3d-three.mjs')).THREE; return T; }
export function supported() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

/* ---------- القوام (رسم بالكانفس) ---------- */
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function woodTexture() {
  const W = 512, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const r = rnd(7);
  const boards = 39, bw = W / boards;
  for (let b = 0; b < boards; b++) {
    const l = 56 + r() * 12, h = 27 + r() * 7, sat = 68 + r() * 14;
    const grd = g.createLinearGradient(b * bw, 0, (b + 1) * bw, 0); grd.addColorStop(0, `hsl(${h},${sat}%,${l - 3}%)`); grd.addColorStop(.5, `hsl(${h},${sat}%,${l + 2}%)`); grd.addColorStop(1, `hsl(${h},${sat}%,${l - 4}%)`);
    g.fillStyle = grd; g.fillRect(b * bw, 0, bw, H);
    // العروق
    for (let k = 0; k < 9; k++) { g.strokeStyle = `hsla(${h - 4},${sat}%,${l - 18}%,${0.12 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 1.2; g.beginPath(); const x0 = b * bw + r() * bw; g.moveTo(x0, 0); for (let y = 0; y <= H; y += 64) g.lineTo(x0 + Math.sin(y / (90 + r() * 80) + k) * bw * 0.25, y); g.stroke(); }
    // فواصل قطع الخشب
    for (let y = r() * 600; y < H; y += 500 + r() * 900) { g.fillStyle = '#5a3412aa'; g.fillRect(b * bw, y, bw, 1.5); }
    g.fillStyle = '#4a2a0e88'; g.fillRect(b * bw, 0, 1, H);
  }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.ClampToEdgeWrapping; t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t;
}
function pinTexture() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 8, 512);
  // خطين أحمر عند الرقبة (v = الارتفاع/الطول)
  g.fillStyle = '#d0141f'; const band = (a, b) => g.fillRect(0, 512 * (1 - b), 8, 512 * (b - a)); band(0.63, 0.665); band(0.69, 0.725);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function ballTexture(ci) {
  const [base, dark, light] = COLORS[ci % 4]; const W = 1024, H = 512; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const r = rnd(31 + ci);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // رخام: خطوط ملتوية فاتحة وغامقة
  for (let k = 0; k < 70; k++) {
    g.strokeStyle = (k % 2 ? light : dark) + (k % 3 ? '55' : '33'); g.lineWidth = 3 + r() * 16; g.beginPath();
    let x = r() * W, y = r() * H; g.moveTo(x, y);
    for (let s = 0; s < 8; s++) { const nx = x + (r() - 0.5) * 260, ny = y + (r() - 0.5) * 140; g.quadraticCurveTo(x + (r() - 0.5) * 200, y + (r() - 0.5) * 200, nx, ny); x = nx; y = ny; }
    g.stroke();
  }
  // الفتحات الثلاث (قرب القطب الفوق)
  const hole = (u, v, rr) => { const x = u * W, y = v * H; const sx = 1 / Math.max(0.25, Math.sin(Math.PI * v)); const gr = g.createRadialGradient(x, y, 0, x, y, rr * sx);
    gr.addColorStop(0, '#000'); gr.addColorStop(.75, '#0a0a10'); gr.addColorStop(.9, light); gr.addColorStop(1, base + '00');
    g.save(); g.translate(x, y); g.scale(sx, 1); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); g.restore(); };
  hole(0.5, 0.2, 20); hole(0.455, 0.29, 17); hole(0.545, 0.29, 17);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
function wallTexture(img) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 495; const g = c.getContext('2d');
  if (img) g.drawImage(img, 0, 0, 1024, 495); else { g.fillStyle = '#0b1236'; g.fillRect(0, 0, 1024, 495); }
  const cx = 512, cy = 200; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 96px Tahoma, sans-serif';
  const tg = g.createLinearGradient(0, cy - 50, 0, cy + 50); tg.addColorStop(0, '#f3d4ff'); tg.addColorStop(.5, '#c46bff'); tg.addColorStop(1, '#7a22e0');
  g.fillStyle = '#3d0b78'; g.fillText('لعبك', cx, cy + 5); g.fillStyle = tg; g.fillText('لعبك', cx, cy);
  g.font = '46px serif'; g.fillText('👑', cx, cy - 72);
  g.font = '900 30px Arial, sans-serif'; g.fillStyle = '#4a3200'; g.fillText('LA3BAK', cx, cy + 66);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const loadImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

/* ---------- شكل الدبوس (مقاسات حقيقية بالسم) ---------- */
const PROF = [[0, 2.6], [1, 3.3], [3, 4.4], [6, 5.5], [9, 5.95], [11.4, 6.05], [14, 5.9], [17, 5.3], [20, 4.2], [23, 3.05], [25, 2.6], [27, 2.55], [29, 2.8], [31, 3.1], [33, 3.15], [35, 2.9], [36.5, 2.2], [37.6, 1.3], [38.1, 0]];
function pinGeometry() {
  const pts = []; const N = 64;
  for (let i = 0; i <= N; i++) { const h = 38.1 * i / N; let k = 0; while (k < PROF.length - 2 && PROF[k + 1][0] < h) k++; const [h0, r0] = PROF[k], [h1, r1] = PROF[k + 1]; const t = (h - h0) / (h1 - h0 || 1); pts.push(new T.Vector2(Math.max(0.0001, (r0 + (r1 - r0) * t) * M), h * M)); }
  pts.unshift(new T.Vector2(0.0001, 0));
  const geo = new T.LatheGeometry(pts, 40);
  // v = الارتفاع (للخطوط الحمرا)
  const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setY(i, pos.getY(i) / (38.1 * M)); uv.needsUpdate = true;
  geo.computeVertexNormals(); return geo;
}

/* ---------- المشهد ---------- */
export async function create(canvas) {
  await load();
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x0a0c22, 26, 48);
  const [bgImg, wallImg] = await Promise.all([loadImg('/assets/games68/bowl-bg.webp'), loadImg('/assets/games68/bowl-wall.webp')]);
  if (bgImg) { const t = new T.Texture(bgImg); t.colorSpace = T.SRGBColorSpace; t.needsUpdate = true; scene.background = t; } else scene.background = new T.Color(0x0a0c22);
  try { const { RoomEnvironment } = await import('/vendor/gift3d-three.mjs'); const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.4; } catch { /* بدون انعكاسات */ }

  const camera = new T.PerspectiveCamera(48, 720 / 1220, 0.05, 60);
  // الإضاءة
  scene.add(new T.HemisphereLight(0x9fb4ff, 0x2a1606, 0.55));
  const spot = new T.SpotLight(0xfff1dc, 60, 9, 0.55, 0.6, 1.2); spot.position.set(0, 3.2, -(HP - 120) * M); spot.target.position.set(0, 0, -(HP + 30) * M);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; scene.add(spot, spot.target);
  const key = new T.DirectionalLight(0xffffff, 1.1); key.position.set(1.5, 6, 2); key.target.position.set(0, 0, -8); scene.add(key, key.target);
  for (let k = 0; k < 5; k++) { const L = new T.PointLight(0xc8dcff, 9, 7, 2); L.position.set(0, 2.4, -(300 + k * 380) * M); scene.add(L); }

  // المسار + المسارات اللي جنبه
  const wood = woodTexture(); const len = (END + 420) * M; wood.repeat.set(1, len / 5);
  const laneMat = new T.MeshPhysicalMaterial({ map: wood, color: 0xffb36b, roughness: 0.35, clearcoat: 0.55, clearcoatRoughness: 0.08, envMapIntensity: 0.5, transparent: true, opacity: 0.92 });
  const laneGeo = new T.PlaneGeometry(LW, len); laneGeo.rotateX(-Math.PI / 2);
  const gutterGeo = new T.CylinderGeometry(0.12, 0.12, len, 20, 1, true, -Math.PI / 2, Math.PI); gutterGeo.rotateX(Math.PI / 2);
  const gutterMat = new T.MeshStandardMaterial({ color: 0x5d6472, metalness: 0.85, roughness: 0.3, side: T.DoubleSide });
  const capMat = new T.MeshStandardMaterial({ color: 0x0d1748, metalness: 0.4, roughness: 0.35 });
  const neonMat = new T.MeshStandardMaterial({ color: 0x3f9bff, emissive: 0x3f9bff, emissiveIntensity: 2.6 });
  const pinGeo = pinGeometry(); const pinMat = new T.MeshPhysicalMaterial({ map: pinTexture(), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const lanes = new T.Group(); scene.add(lanes);
  const midZ = -(len / 2 - 4.2);
  const spacing = LW + 0.24 * 2 + 0.36;
  for (const off of [-2, -1, 0, 1, 2]) {
    const g = new T.Group(); g.position.x = off * spacing; lanes.add(g);
    const lane = new T.Mesh(laneGeo, laneMat); lane.position.set(0, 0, midZ); lane.receiveShadow = true; lane.renderOrder = 2; g.add(lane);
    for (const sgn of [-1, 1]) {
      const gu = new T.Mesh(gutterGeo, gutterMat); gu.position.set(sgn * (LW / 2 + 0.12), 0, midZ); gu.receiveShadow = true; g.add(gu);
      const cap = new T.Mesh(new T.BoxGeometry(0.18, 0.06, len), capMat); cap.position.set(sgn * (LW / 2 + 0.24 + 0.09), 0.03, midZ); g.add(cap);
      const neon = new T.Mesh(new T.BoxGeometry(0.012, 0.012, len), neonMat); neon.position.set(sgn * (LW / 2 + 0.245), 0.062, midZ); g.add(neon);
    }
    // الأسهم والنقاط
    const arrowMat = new T.MeshBasicMaterial({ color: 0xb01218 });
    const tri = new T.Shape(); tri.moveTo(0, 0.07); tri.lineTo(-0.018, 0); tri.lineTo(0.018, 0); tri.closePath();
    const triGeo = new T.ShapeGeometry(tri); triGeo.rotateX(-Math.PI / 2);
    for (let k = 1; k <= 7; k++) { const x = (-HALF + (106 / 39) * (k * 5 - 0.5)) * M; const a = new T.Mesh(triGeo, arrowMat); a.position.set(x, 0.002, -(457 + Math.abs(4 - k) * 30) * M); a.renderOrder = 3; g.add(a); }
    // دبابيس المسارات اللي جنب (واقفة)
    if (off !== 0) for (const p of PINS) { const m = new T.Mesh(pinGeo, pinMat); m.position.set(p.x * M, 0, -p.y * M); m.castShadow = true; g.add(m); }
  }
  // أرضية تحت المسار (غامقة) + الحفرة
  const floor = new T.Mesh(new T.PlaneGeometry(14, len + 10), new T.MeshStandardMaterial({ color: 0x05060c, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.14, midZ); scene.add(floor);
  // الجدار اللي فوق الدبابيس (صورة المالك + شعار لعبك) والجدران الجانبية
  const wallMat = new T.MeshStandardMaterial({ map: wallTexture(wallImg), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0, roughness: 0.6 });
  wallMat.emissiveMap = wallMat.map; wallMat.emissiveIntensity = 0.55;
  const wallW = spacing * 5;
  const masking = new T.Mesh(new T.PlaneGeometry(spacing * 1.05, spacing * 1.05 * 495 / 1024), wallMat); masking.position.set(0, 0.55 + spacing * 0.25, -(END + 10) * M); scene.add(masking);
  const backMat = new T.MeshStandardMaterial({ color: 0x0b1236, roughness: 0.7, metalness: 0.2 });
  for (const off of [-2, -1, 1, 2]) { const m = new T.Mesh(new T.PlaneGeometry(spacing * 1.05, spacing * 1.05 * 495 / 1024), wallMat); m.position.set(off * spacing, masking.position.y, masking.position.z); scene.add(m); }
  const pit = new T.Mesh(new T.PlaneGeometry(wallW, 0.6), new T.MeshBasicMaterial({ color: 0x020205 })); pit.position.set(0, 0.25, -(END + 30) * M); scene.add(pit);
  for (const sgn of [-1, 1]) { const kb = new T.Mesh(new T.BoxGeometry(0.05, 0.62, (END - HP + 140) * M), backMat); kb.position.set(sgn * (LW / 2 + 0.3), 0.31, -((HP + END) / 2 - 20) * M); scene.add(kb);
    const nb = new T.Mesh(new T.BoxGeometry(0.01, 0.012, (END - HP + 140) * M), neonMat); nb.position.set(sgn * (LW / 2 + 0.27), 0.62, kb.position.z); scene.add(nb); }

  // الدبابيس العشرة + انعكاسها
  const pins = PINS.map(() => { const m = new T.Mesh(pinGeo, pinMat); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; });
  const mirror = new T.Group(); mirror.scale.y = -1; scene.add(mirror);
  const pinsM = PINS.map(() => { const m = new T.Mesh(pinGeo, pinMat); mirror.add(m); return m; });
  // الكرة
  const ballGeo = new T.SphereGeometry(BR * M, 48, 32);
  const ballMats = [0, 1, 2, 3].map((i) => new T.MeshPhysicalMaterial({ map: ballTexture(i), roughness: 0.18, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 }));
  const ball = new T.Mesh(ballGeo, ballMats[0]); ball.castShadow = true; scene.add(ball);
  const ballM = new T.Mesh(ballGeo, ballMats[0]); mirror.add(ballM);
  const blobC = document.createElement('canvas'); blobC.width = blobC.height = 64; { const g = blobC.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const blob = new T.Mesh(new T.PlaneGeometry(0.34, 0.34), new T.MeshBasicMaterial({ map: new T.CanvasTexture(blobC), transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.renderOrder = 3; scene.add(blob);
  // سهم التصويب
  const guideMat = new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9, depthWrite: false, side: T.DoubleSide });
  const guide = new T.Mesh(new T.BufferGeometry(), guideMat); guide.renderOrder = 4; guide.visible = false; scene.add(guide);

  const st = { renderer, scene, camera, pins, pinsM, ball, ballM, ballMats, guide, blob, canvas, q: new T.Quaternion(), lastB: null, cam: { p: new T.Vector3(0, 0.95, -1.15), l: new T.Vector3(0, 0.1, -14) } };
  resetBallSpin(st);
  return st;
}
function resetBallSpin(st) { st.q.setFromAxisAngle(new T.Vector3(1, 0, 0), 0.55).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -Math.PI / 2)); st.lastB = null; }

let ax = null, qd = null;
/** حالة وحدة للرسم. pins: [{x,y,st,tilt,fx,fy,z,rot}] (سم)، ball: {x,y,gutter,on} */
export function draw(st, { pins, ball, ci, follow, guide }) {
  if (!ax) { ax = new T.Vector3(); qd = new T.Quaternion(); }
  const { camera } = st;
  // الدبابيس
  pins.forEach((p, i) => {
    const m = st.pins[i], mm = st.pinsM[i];
    const vis = p.st !== 2 || (p.y < END - 10 && Math.abs(p.x) < HALF + 30);
    m.visible = mm.visible = vis; if (!vis) return;
    const tilt = Math.min(1, p.tilt || 0), ang = tilt * Math.PI / 2 + (p.rot || 0);
    const fx = p.fx ?? 0, fy = p.fy ?? 1;
    const bx = p.x - fx * 19 * tilt, by = p.y - fy * 19 * tilt; // القاعدة
    let h = (p.z || 0) * M + Math.sin(Math.min(Math.PI / 2, tilt * Math.PI / 2)) * 0.055;
    if (Math.abs(p.x) > HALF && p.st) h -= 0.07; // بالمجرى
    m.position.set(bx * M, h, -by * M);
    if (ang) { ax.set(-fy, 0, -fx).normalize(); m.quaternion.setFromAxisAngle(ax, ang); } else m.quaternion.identity();
    mm.position.copy(m.position); mm.quaternion.copy(m.quaternion); mm.visible = Math.abs(p.x) < HALF && h < 0.3;
  });
  // الكرة: تتدحرج فعلياً (الفتحات تلف)
  const b = st.ball;
  b.material = st.ballMats[ci % 4]; st.ballM.material = b.material;
  b.visible = !!ball?.on; st.ballM.visible = b.visible && !ball.gutter;
  if (ball?.on) {
    const yc = ball.gutter ? BR * M - 0.07 : BR * M;
    if (st.lastB) { const dx = (ball.x - st.lastB.x) * M, dz = -(ball.y - st.lastB.y) * M; const d = Math.hypot(dx, dz); if (d > 1e-5 && d < 1) { ax.set(dz, 0, -dx).normalize(); qd.setFromAxisAngle(ax, d / (BR * M)); st.q.premultiply(qd); } }
    st.lastB = { x: ball.x, y: ball.y };
    b.position.set(ball.x * M, yc, -ball.y * M); b.quaternion.copy(st.q);
    st.ballM.position.copy(b.position); st.ballM.quaternion.copy(st.q);
    st.blob.position.set(b.position.x, ball.gutter ? -0.065 : 0.003, b.position.z);
  }
  st.blob.visible = !!ball?.on;
  // الكاميرا: ورا الكرة، تمشي معها لين قبل الدبابيس
  const by = ball?.on ? ball.y : (follow ? HP : BALL_Y0);
  let cz, cy, lz, ly, lx = 0;
  if (follow) { const yy = Math.min(by, HP - 300); cz = -(yy - 190) * M; const t = Math.min(1, Math.max(0, (yy - BALL_Y0) / 1150)); cy = 1.3 - 0.75 * t; lz = -(Math.min(by + 600, HP + 40)) * M; ly = -2.8 + 2.9 * t; lx = ball?.on ? ball.x * M * 0.4 : 0; }
  else { cz = -(BALL_Y0 - 230) * M; cy = 1.3; lz = -(HP + 20) * M; ly = -2.8; }
  const tp = new T.Vector3(0, cy, cz), tl = new T.Vector3(lx, ly, lz);
  const k = follow ? 0.12 : 0.2; st.cam.p.lerp(tp, k); st.cam.l.lerp(tl, k);
  camera.position.copy(st.cam.p); camera.lookAt(st.cam.l);
  // سهم التصويب
  setGuide(st, guide);
  st.renderer.render(st.scene, camera);
}
export function snapCamera(st) { st.cam.p.set(0, 1.3, -(BALL_Y0 - 230) * M); st.cam.l.set(0, -2.8, -(HP + 20) * M); }
export function newThrow(st) { resetBallSpin(st); }
function setGuide(st, pts) {
  const g = st.guide;
  if (!pts || pts.length < 2) { g.visible = false; return; }
  const pos = []; const w0 = 0.022;
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]; const [x2, y2] = pts[Math.min(pts.length - 1, i + 1)]; const [x1, y1] = pts[Math.max(0, i - 1)];
    let tx = x2 - x1, ty = y2 - y1; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = w0 * (1 - i / pts.length * 0.6);
    pos.push((x * M) + ty * w, 0.004, -(y * M) + tx * w, (x * M) - ty * w, 0.004, -(y * M) - tx * w);
  }
  const idx = []; for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  g.geometry.dispose(); g.geometry = geo; g.visible = true;
}
export function resize(st, w, h) { st.renderer.setSize(w, h, false); st.camera.aspect = w / h; st.camera.updateProjectionMatrix(); }
/** من مكان اللمس على الشاشة إلى x على المسار (عند خط الكرة) */
export function screenToLaneX(st, nx) {
  const v = new T.Vector3(nx, 0, 0.5).unproject(st.camera); const dir = v.sub(st.camera.position).normalize();
  const zPlane = -BALL_Y0 * M; const t = (zPlane - st.camera.position.z) / (dir.z || -1e-6); return (st.camera.position.x + dir.x * t) / M;
}
export function laneXPerPx(st, widthPx) { return (screenToLaneX(st, 0.1) - screenToLaneX(st, -0.1)) / (widthPx * 0.1); }
