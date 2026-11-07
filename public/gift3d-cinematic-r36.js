/* R36 original procedural choreography for an existing, verified native GLB.
 * Rigid subject transforms + real WebGL accents, not new artwork, a character,
 * a skeletal rig, a receipt trigger, or a CSS imitation of 3D. No I/O here. */
export const GIFT3D_MOTION_KEYS = Object.freeze(['still', 'drive', 'rocket', 'royal', 'magic-lamp', 'celebration', 'fly']);
export const GIFT3D_ACCENT_KEYS = Object.freeze(['auto', 'none', 'trail', 'halo', 'smoke', 'confetti', 'sparks']);
export const GIFT3D_CINEMATIC_LIMITS = Object.freeze({ particles: 96, lowParticles: 40, meshes: 5,
  geometries: 3, uniqueVertices: 2048, estimatedDrawTriangles: 4096, drawCalls: 5 });
const MOTIONS = new Set(GIFT3D_MOTION_KEYS), ACCENTS = new Set(GIFT3D_ACCENT_KEYS);
export const isGift3DMotionKey = value => typeof value === 'string' && MOTIONS.has(value);
export const isGift3DAccentKey = value => typeof value === 'string' && ACCENTS.has(value);
const clamp = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (a, b, p) => a + (b - a) * p;
const TAU = Math.PI * 2;
export const GIFT3D_LAMP_LIMITS = Object.freeze({ meshes: 2, geometries: 2, uniqueVertices: 512, estimatedDrawTriangles: 800 });

/** Input is the original GLB in a centered, normalized (span 2) wrapper.
 * Returns a wrapper retaining that exact root; only magic-lamp gains an original
 * tapered curved spout + open handle. Matching gold PBR is cloned, never altered.
 * Caller disposes the returned whole root once via disposeModel. disposeExtras
 * is ONLY for abandoning added geometry while keeping the original root alive. */
export function prepareGiftCinematicModel(T, normalized, motion = 'still') {
  if (!isGift3DMotionKey(motion)) throw Error('invalid-motion-key');
  if (!normalized?.isObject3D) throw Error('missing-main-model');
  if (motion !== 'magic-lamp') return { root: normalized, modified: false,
    budget: Object.freeze({ meshCount: 0, geometryCount: 0, uniqueVertices: 0, estimatedDrawTriangles: 0 }), disposeExtras() {} };
  const bounds = new T.Box3().setFromObject(normalized), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
  if (![size.x, size.y, size.z].every(Number.isFinite) || Math.max(size.x, size.y, size.z) <= 0) throw Error('invalid-model-bounds');
  const previousParent = normalized.parent, previousIndex = previousParent?.children.indexOf(normalized) ?? -1;
  const root = new T.Group(); root.name = 'gift3d-original-magic-lamp'; root.add(normalized);
  const extras = new T.Group(); extras.name = 'gift3d-lamp-silhouette'; root.add(extras);
  const geometries = [], materials = []; let disposed = false;
  const disposeExtras = () => { if (disposed) return; disposed = true; extras.removeFromParent();
    for (const value of geometries) value.dispose(); for (const value of materials) value.dispose(); };
  try {
    let nativeGold = null;
    normalized.traverse(node => {
      for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : [])
        if (material.isMeshStandardMaterial && (!nativeGold || material.metalness > nativeGold.metalness)) nativeGold = material;
    });
    const gold = nativeGold ? nativeGold.clone() : new T.MeshStandardMaterial({ color: 0xe4b352, metalness: .85, roughness: .24 });
    // No UV artwork is remapped onto new tubes. Original material/maps stay untouched.
    // Current lamp stores gold in baseColorTexture with a white color factor;
    // removing that map must not accidentally create white, rough metal tubes.
    if (nativeGold?.map) { gold.color.setHex(0xe4b352); gold.metalness = .85; gold.roughness = .24; }
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap', 'alphaMap', 'displacementMap']) if (key in gold) gold[key] = null;
    gold.transparent = false; gold.opacity = 1; materials.push(gold);
    const x = center.x, y = center.y - size.y * .12, z = center.z;
    const half = Math.max(.34, size.x * .44), radius = Math.min(.095, Math.max(.045, size.y * .075));
    const spoutCurve = new T.CatmullRomCurve3([
      new T.Vector3(x + half * .68, y, z), new T.Vector3(x + half + .16, y + .08, z),
      new T.Vector3(x + half + .4, y + .36, z), new T.Vector3(x + half + .72, y + .43, z)
    ]);
    const spoutGeometry = new T.TubeGeometry(spoutCurve, 20, radius, 8, false); geometries.push(spoutGeometry);
    const positions = spoutGeometry.attributes.position, point = new T.Vector3();
    for (let i = 0; i <= 20; i++) {
      const t = i / 20, at = spoutCurve.getPointAt(t), taper = 1 - .48 * t;
      for (let j = 0; j <= 8; j++) { const index = i * 9 + j; point.fromBufferAttribute(positions, index).sub(at).multiplyScalar(taper).add(at); positions.setXYZ(index, point.x, point.y, point.z); }
    }
    positions.needsUpdate = true; spoutGeometry.computeVertexNormals();
    const spout = new T.Mesh(spoutGeometry, gold); spout.name = 'gift3d-lamp-curved-spout'; extras.add(spout);
    const handleCurve = new T.CatmullRomCurve3([
      new T.Vector3(x - half * .75, y + .26, z), new T.Vector3(x - half - .34, y + .42, z),
      new T.Vector3(x - half - .5, y + .03, z), new T.Vector3(x - half - .25, y - .3, z),
      new T.Vector3(x - half * .73, y - .2, z)
    ]);
    const handleGeometry = new T.TubeGeometry(handleCurve, 20, radius * .65, 8, false); geometries.push(handleGeometry);
    const handle = new T.Mesh(handleGeometry, gold); handle.name = 'gift3d-lamp-curved-handle'; extras.add(handle);
    const budget = Object.freeze({ meshCount: 2, geometryCount: 2,
      uniqueVertices: geometries.reduce((n, geometry) => n + geometry.attributes.position.count, 0),
      estimatedDrawTriangles: geometries.reduce((n, geometry) => n + geometry.index.count / 3, 0) });
    if (budget.uniqueVertices > GIFT3D_LAMP_LIMITS.uniqueVertices || budget.estimatedDrawTriangles > GIFT3D_LAMP_LIMITS.estimatedDrawTriangles) throw Error('lamp-silhouette-budget');
    const fullBounds = new T.Box3().setFromObject(root), fullSize = fullBounds.getSize(new T.Vector3()), fullCenter = fullBounds.getCenter(new T.Vector3());
    const scale = 2.2 / Math.max(fullSize.x, fullSize.y, fullSize.z);
    const centered = new T.Group(); centered.position.copy(fullCenter).multiplyScalar(-1); centered.add(root);
    const framed = new T.Group(); framed.name = 'gift3d-magic-lamp-framed'; framed.scale.setScalar(scale); framed.add(centered);
    // Emitter is in returned root's LOCAL coordinates; localToWorld later applies
    // this root's scale and any composition reframe exactly once.
    const outlet = spoutCurve.getPointAt(1).sub(fullCenter);
    return { root: framed, extras, modified: true, budget,
      emitter: Object.freeze({ x: outlet.x, y: outlet.y, z: outlet.z }), disposeExtras };
  } catch (error) {
    disposeExtras(); normalized.removeFromParent();
    if (previousParent) {
      previousParent.add(normalized);
      const index = previousParent.children.indexOf(normalized);
      previousParent.children.splice(index, 1);
      previousParent.children.splice(Math.min(previousIndex, previousParent.children.length), 0, normalized);
    }
    throw error;
  }
}

const PROFILES = Object.freeze({
  drive: { accent: 'trail', color: 0x69cfff, second: 0xffffff, rings: 1 },
  rocket: { accent: 'trail', color: 0xffae48, second: 0xfff4c5, rings: 2 },
  royal: { accent: 'halo', color: 0xffd268, second: 0xfff1bc, rings: 3 },
  'magic-lamp': { accent: 'smoke', color: 0x91f7e6, second: 0xcba6ff, rings: 3 },
  celebration: { accent: 'confetti', color: 0xfa78c6, second: 0x80e5ff, rings: 2 },
  fly: { accent: 'trail', color: 0xb3d7ff, second: 0xffd989, rings: 2 },
  still: { accent: 'none', color: 0xffd268, second: 0xffffff, rings: 0 }
});

/** Sample the complete shot, in normalized scene units (GLB span is 2–2.2).
 * Hold occupies 53% of the shot; no uncontrolled full turntable rotation.
 * Non-finite progress is safely clamped. Reduced motion has no moving accents. */
export function sampleGift3DCinematic(motion, progress, reduced = false) {
  if (!isGift3DMotionKey(motion)) throw Error('invalid-motion-key');
  const p = clamp(progress), phase = p < .23 ? 'arrival' : p < .76 ? 'hold' : 'exit';
  const a = smooth(p / .23), h = clamp((p - .23) / .53), e = smooth((p - .76) / .24);
  const t = p * TAU;
  const out = { phase: reduced || motion === 'still' ? 'hold' : phase, progress: p,
    x: 0, y: 0, z: 0, rx: 0, ry: -.18, rz: 0, scale: 1,
    cameraX: .045, cameraY: .035, cameraDolly: 1, targetY: 0, accentStrength: 0 };
  if (reduced || motion === 'still') return out;
  // Accent envelope fades in/out, while the subject visibly enters/exits in 3D.
  out.accentStrength = Math.min(smooth(p / .13), smooth((1 - p) / .17));
  out.cameraX = .045 + Math.sin(p * Math.PI) * .035;
  out.cameraY = .035 + Math.sin(p * Math.PI) * .016;
  out.cameraDolly = 1.08 - .08 * a + .06 * e;
  if (motion === 'drive') {
    out.x = mix(-3.1, -.08, a) + 3.3 * e;
    out.y = -.32 + Math.sin(t * 3) * .018 * (1 - e);
    out.z = mix(-.7, .12, a) + .5 * e;
    out.ry = mix(-.65, -.32, a) + .22 * h + .18 * e;
    out.rz = -.045 * (1 - a) + .035 * e;
    out.scale = mix(.86, 1.08, a);
    out.targetY = -.1;
  } else if (motion === 'rocket') {
    out.x = .42 * (1 - a) + .32 * e;
    out.y = mix(-3.2, -.1, a) + Math.sin(t * 1.5) * .045 * (1 - e) + 4 * e;
    out.z = mix(-1, 0, a) - .9 * e;
    out.ry = -.3 + .12 * h;
    out.rz = -.12 * (1 - a) - .1 * e;
    out.scale = mix(.7, 1.05, a) - .12 * e;
    out.cameraY += .026 * e;
  } else if (motion === 'royal') {
    out.y = mix(-1.55, 0, a) + Math.sin(t) * .038 * a * (1 - e) + .22 * e;
    out.z = mix(-1.15, .08, a) - 2 * e;
    out.ry = mix(-.7, -.25, a) + .26 * h;
    out.rx = .035 * (1 - a);
    out.scale = mix(.45, 1.08, a) * (1 - .92 * e);
  } else if (motion === 'magic-lamp') {
    out.x = -.8 * (1 - a) + Math.sin(t * 1.2) * .09 * a * (1 - e) + .3 * e;
    out.y = mix(-1.7, .04, a) + Math.sin(t * 1.7) * .11 * a * (1 - e) + 2.25 * e;
    out.z = mix(-1.3, .1, a) - 1.4 * e;
    out.ry = mix(-.9, -.28, a) + .24 * h + .65 * e;
    out.rz = .045 * Math.sin(t * 1.2) * a * (1 - e);
    out.scale = mix(.42, 1.06, a) * (1 - .85 * e);
    out.cameraX -= .055 * a * (1 - e);
  } else if (motion === 'celebration') {
    out.y = mix(-.8, .04, a) + .075 * Math.sin(t * 2) * (1 - e);
    out.z = mix(-1.6, .1, a) - 1.6 * e;
    out.rx = mix(.18, 0, a);
    out.ry = mix(-.6, -.18, a) + .18 * h;
    out.scale = (mix(.24, 1.08, a) + .08 * Math.sin(a * Math.PI)) * (1 - .9 * e);
    out.rz = .035 * Math.sin(t * 2) * a * (1 - e);
  } else if (motion === 'fly') {
    out.x = mix(-3, -.06, a) + 3.3 * e;
    out.y = .05 + .7 * (1 - a) + .09 * Math.sin(t * 1.5) * a * (1 - e) + 1.65 * e;
    out.z = mix(-1.3, 0, a) - 1.4 * e;
    out.ry = mix(.3, -.28, a) - .2 * e;
    out.rz = mix(-.32, -.015, a) + .035 * Math.sin(t) * a - .28 * e;
    out.rx = .05 * (1 - a) - .08 * e;
    out.scale = mix(.7, 1.05, a) - .18 * e;
  }
  return out;
}

/** The helper owns ONLY its accent resources. Original GLB is never attached here.
 * Up to three shared-geometry torus meshes + two InstancedMesh particle pools.
 * No textures, postprocessing, lights, allocations growing over time, or I/O.
 * Smoke is translucent low-poly 3D volume, NOT fluid simulation/rigged genie. */
export function createGift3DCinematic(T, { motion = 'still', accent = 'auto', reduced = false, low = false, emitter = null } = {}) {
  if (!isGift3DMotionKey(motion) || !isGift3DAccentKey(accent)) throw Error('invalid-cinematic-enum');
  if (emitter && !['x', 'y', 'z'].every(key => Number.isFinite(emitter[key]) && Math.abs(emitter[key]) <= 3)) throw Error('invalid-cinematic-emitter');
  const profile = PROFILES[motion], selected = reduced || motion === 'still' ? 'none' : accent === 'auto' ? profile.accent : accent;
  const root = new T.Group(); root.name = `gift3d-cinematic-${motion}`;
  const geometries = new Set(), materials = new Set(), pools = [], rings = [];
  const dummy = new T.Object3D(), outlet = new T.Vector3(), rotation = new T.Euler();
  let disposed = false, last = { phase: 'pending', particleCount: 0, ringCount: 0 };
  const ownGeometry = value => { geometries.add(value); return value; };
  const ownMaterial = value => { materials.add(value); return value; };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    // InstancedMesh.dispose releases its instance-color/matrix WebGL bindings.
    for (const pool of pools) pool.node.dispose?.();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    root.removeFromParent(); root.clear();
    last = { phase: 'disposed', particleCount: 0, ringCount: 0 };
  };
  const addPool = (count, smoke) => {
    const geometry = ownGeometry(smoke ? new T.IcosahedronGeometry(1, 0) : new T.OctahedronGeometry(1, 0));
    const material = ownMaterial(new T.MeshBasicMaterial({ color: smoke ? profile.second : profile.color,
      transparent: true, opacity: smoke ? .16 : .9, depthWrite: false,
      blending: smoke || selected === 'confetti' ? T.NormalBlending : T.AdditiveBlending, toneMapped: false }));
    const node = new T.InstancedMesh(geometry, material, count);
    node.name = smoke ? 'gift3d-smoke-volumes' : `gift3d-${selected}-particles`;
    node.frustumCulled = false; node.instanceMatrix.setUsage(T.DynamicDrawUsage);
    if (!smoke) {
      const color = new T.Color();
      for (let i = 0; i < count; i++) node.setColorAt(i, color.setHex(i % 3 ? profile.color : profile.second));
    }
    root.add(node); pools.push({ node, count, smoke });
  };
  try {
    if (selected !== 'none') {
      const smokeCount = selected === 'smoke' ? (low ? 8 : 24) : 0;
      addPool((low ? GIFT3D_CINEMATIC_LIMITS.lowParticles : GIFT3D_CINEMATIC_LIMITS.particles) - smokeCount, false);
      if (smokeCount) addPool(smokeCount, true);
      const ringCount = Math.min(low ? 2 : 3, profile.rings || 1);
      const geometry = ownGeometry(new T.TorusGeometry(1, .014, 6, 48));
      for (let i = 0; i < ringCount; i++) {
        const material = ownMaterial(new T.MeshBasicMaterial({ color: i % 2 ? profile.second : profile.color,
          transparent: true, opacity: .6, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
        const ring = new T.Mesh(geometry, material); ring.name = `gift3d-cinematic-ring-${i}`;
        ring.frustumCulled = false; rings.push(ring); root.add(ring);
      }
    }
    let vertices = 0, triangles = 0;
    for (const geometry of geometries) vertices += geometry.attributes.position.count;
    root.traverse(node => { if (node.isMesh) triangles += ((node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3) * (node.isInstancedMesh ? node.count : 1); });
    const budget = Object.freeze({ particleCapacity: pools.reduce((n, pool) => n + pool.count, 0),
      meshCount: root.children.length, geometryCount: geometries.size, uniqueVertices: vertices,
      estimatedDrawTriangles: triangles, drawCalls: root.children.length });
    const limits = GIFT3D_CINEMATIC_LIMITS;
    if (budget.particleCapacity > limits.particles || budget.meshCount > limits.meshes || budget.geometryCount > limits.geometries
      || vertices > limits.uniqueVertices || triangles > limits.estimatedDrawTriangles || budget.drawCalls > limits.drawCalls) throw Error('cinematic-budget');
    const update = (frame, seconds = 0) => {
      if (disposed) return { ...last };
      const strength = clamp(frame.accentStrength), t = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      root.visible = strength > .001 && selected !== 'none';
      outlet.set(emitter?.x ?? .48, emitter?.y ?? .32, emitter?.z ?? 0);
      rotation.set(frame.rx, frame.ry, frame.rz); outlet.applyEuler(rotation);
      for (const pool of pools) {
        pool.node.material.opacity = strength * (pool.smoke ? .16 : selected === 'confetti' ? .85 : .9);
        for (let i = 0; i < pool.count; i++) {
          // Deterministic staggered lifetime; the same timeline gives the same matrices.
          const seed = (i * .61803398875) % 1, age = (t * (pool.smoke ? .32 : .58) + seed) % 1;
          const angle = i * 2.39996323 + t * (pool.smoke ? .55 : .25);
          let x, y, z, radius;
          if (pool.smoke) {
            radius = .045 + age * .34;
            x = outlet.x + Math.sin(angle + age * 4) * age * .32;
            y = outlet.y + age * 1.5; z = outlet.z + Math.cos(angle) * age * .38;
          } else if (selected === 'trail') {
            const spread = .07 + age * .24;
            x = (motion === 'rocket' ? 0 : -.65 - age * 1.1) + Math.cos(angle) * spread;
            y = (motion === 'rocket' ? -.8 - age * 1.3 : -.3) + Math.sin(angle) * spread;
            z = -.24 + Math.sin(angle * 1.7) * spread;
            radius = .026 * (1 - age) + .008;
          } else if (selected === 'confetti') {
            const spread = .3 + age * 1.35;
            x = Math.cos(angle) * spread; z = Math.sin(angle) * spread * .6;
            y = .85 + Math.sin(age * Math.PI) * .65 - age * 1.9;
            radius = .021 + (i % 4) * .005;
          } else {
            const spread = selected === 'smoke' ? .48 + age * .55 : .9 + .22 * Math.sin(age * Math.PI);
            x = Math.cos(angle) * spread; z = Math.sin(angle) * spread * .72;
            y = selected === 'smoke' ? .25 + age * 1.65 : -.72 + age * 2;
            radius = (.012 + .018 * Math.sin(age * Math.PI)) * (selected === 'halo' ? .8 : 1);
          }
          dummy.position.set(frame.x + x * frame.scale, frame.y + y * frame.scale, frame.z + z * frame.scale);
          dummy.rotation.set(angle, age * TAU, t + angle);
          const size = radius * strength * frame.scale * (pool.smoke ? Math.sin(age * Math.PI) : 1);
          dummy.scale.set(size, size * (selected === 'confetti' && !pool.smoke ? 2.7 : 1), size);
          dummy.updateMatrix(); pool.node.setMatrixAt(i, dummy.matrix);
        }
        pool.node.instanceMatrix.needsUpdate = true;
      }
      rings.forEach((ring, i) => {
        const pulse = (t * .42 + i / Math.max(1, rings.length)) % 1;
        const horizontal = selected === 'halo' || selected === 'smoke';
        ring.position.set(frame.x, frame.y + (horizontal ? -.85 + i * .7 : -.45), frame.z - .4 - i * .15);
        ring.rotation.set(horizontal ? Math.PI / 2 - .12 : -.12, horizontal ? .08 * Math.sin(t) : .18, i * .5 + t * .18);
        const scale = frame.scale * (horizontal ? 1.06 + .08 * Math.sin(t + i) : .5 + pulse * .95);
        ring.scale.setScalar(scale);
        ring.material.opacity = strength * (horizontal ? .28 : (1 - pulse) * .42);
      });
      last = { phase: frame.phase, particleCount: root.visible ? budget.particleCapacity : 0, ringCount: root.visible ? rings.length : 0 };
      return { ...last };
    };
    return { root, motion, accent: selected, budget, update, dispose, metrics: () => ({ ...last, disposed }) };
  } catch (error) { dispose(); throw error; }
}
