/* R33 deterministic accessories for an already-loaded, matching native GLB.
 * Never creates or substitutes a main motif; never selects assets from receipt labels.
 * All resources belong to the current scene (the renderer caches binaries only). */
export const GIFT3D_VARIANT_KEYS = Object.freeze(['base', 'sparkle', 'trio', 'box', 'crown', 'wings', 'halo', 'royal']);
const KEYS = new Set(GIFT3D_VARIANT_KEYS);
export const GIFT3D_VARIANT_LIMITS = Object.freeze({ uniqueVertices: 250000, estimatedDrawTriangles: 250000, meshes: 128, accessoryMeshes: 48 });
export const isGift3DVariantKey = value => typeof value === 'string' && KEYS.has(value);

// Unique vertices track GPU geometry allocations. Estimated triangles track ALL
// mesh instances/clones, material groups and transparent DoubleSide extra passes.
export function measureGift3DScene(root) {
  const geometries = new Set(); let uniqueVertices = 0, estimatedDrawTriangles = 0, meshCount = 0, skinnedMeshCount = 0;
  root?.traverse?.(node => {
    if (!node.isMesh) return;
    meshCount++; if (node.isSkinnedMesh) skinnedMeshCount++;
    const geometry = node.geometry, count = geometry?.attributes?.position?.count || 0;
    if (!geometry || !Number.isSafeInteger(count) || count <= 0) throw Error('invalid-model-geometry');
    if (!geometries.has(geometry)) { geometries.add(geometry); uniqueVertices += count; }
    const elements = geometry.index?.count ?? count, draw = geometry.drawRange || { start: 0, count: Infinity };
    const start = Math.max(0, draw.start), end = Math.min(elements, start + draw.count);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const ranges = Array.isArray(node.material) ? geometry.groups : [{ start: 0, count: elements, materialIndex: 0 }];
    const instances = node.isInstancedMesh ? node.count : 1;
    if (!Number.isSafeInteger(instances) || instances < 0) throw Error('invalid-model-geometry');
    for (const group of ranges) {
      const material = materials[group.materialIndex || 0]; if (!material || material.visible === false) continue;
      // Three.DoubleSide === 2. Opaque accessories use one pass and no textures.
      const passes = material.transparent && material.side === 2 && !material.forceSinglePass ? 2 : 1;
      const drawn = Math.max(0, Math.min(end, group.start + group.count) - Math.max(start, group.start));
      estimatedDrawTriangles += Math.floor(drawn / 3) * instances * passes;
    }
  });
  return Object.freeze({ uniqueVertices, estimatedDrawTriangles, meshCount, skinnedMeshCount, uniqueGeometryCount: geometries.size });
}
export function validateGift3DSceneBudget(metrics, limits = GIFT3D_VARIANT_LIMITS) {
  if (!metrics.meshCount || metrics.meshCount > limits.meshes || !Number.isFinite(metrics.uniqueVertices)
    || metrics.uniqueVertices > limits.uniqueVertices || !Number.isFinite(metrics.estimatedDrawTriangles)
    || metrics.estimatedDrawTriangles > limits.estimatedDrawTriangles) throw Error('composition-budget');
  return metrics;
}

/**
 * normalized: wrapper containing the original GLTF scene, centered and scaled.
 * Caller owns original, resulting root and cleanup, using one deduplicating disposal.
 * On failure only created accessories are disposed; the original is not disposed.
 * Return root contains original even for base. Added meshes include trio duplicates.
 */
export function composeGift3DVariant(T, normalized, variantKey = 'base') {
  if (!isGift3DVariantKey(variantKey)) throw Error('invalid-variant-key');
  if (!normalized?.isObject3D) throw Error('missing-main-model');
  const original = measureGift3DScene(normalized);
  validateGift3DSceneBudget(original);
  if (variantKey === 'trio' && original.skinnedMeshCount) throw Error('variant-trio-skinned-unsupported');
  const bounds = new T.Box3().setFromObject(normalized), size = bounds.getSize(new T.Vector3());
  const span = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(span) || span <= 0) throw Error('invalid-model-bounds');
  const center = bounds.getCenter(new T.Vector3()), floor = bounds.min.y, top = bounds.max.y;
  // R46: attachment is transactional. A failed composition must not strand the
  // caller's original under an abandoned wrapper (or reorder its siblings).
  const previousParent = normalized.parent, previousIndex = previousParent?.children.indexOf(normalized) ?? -1;
  const root = new T.Group(); root.name = `gift3d-variant-${variantKey}`;
  const subject = new T.Group(); subject.name = 'gift3d-main-subject'; subject.add(normalized); root.add(subject);
  const accessories = new T.Group(); accessories.name = 'gift3d-accessories'; root.add(accessories);
  const ownedGeometries = new Set(), ownedMaterials = new Set(), resources = new Map();
  const geometry = (key, create) => {
    if (!resources.has(key)) { const value = create(); resources.set(key, value); ownedGeometries.add(value); }
    return resources.get(key);
  };
  const material = (key, color, metalness = .8, roughness = .28) => {
    const id = `material-${key}`;
    if (!resources.has(id)) { const value = new T.MeshStandardMaterial({ color, metalness, roughness }); resources.set(id, value); ownedMaterials.add(value); }
    return resources.get(id);
  };
  const gold = () => material('gold', 0xf6c650), silver = () => material('silver', 0xe2ecff, .75, .3);
  const mesh = (geo, mat, name, position = [0, 0, 0], scale = [1, 1, 1], parent = accessories) => {
    const node = new T.Mesh(geo, mat); node.name = name; node.position.set(...position); node.scale.set(...scale); parent.add(node); return node;
  };
  const cube = () => geometry('box', () => new T.BoxGeometry(1, 1, 1));
  const torus = (key, radius, tube, segments = 32) => geometry(key, () => new T.TorusGeometry(radius, tube, 6, segments));
  const extrudedStar = () => geometry('star', () => {
    const shape = new T.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .43 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); }
    shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, { depth: .28, bevelEnabled: false, curveSegments: 1, steps: 1 }); geo.translate(0, 0, -.14); return geo;
  });
  const addCrown = (at = top + .15) => {
    const radius = Math.min(.48, Math.max(.28, size.x * .3));
    const band = mesh(torus('crown-band', radius, .055), gold(), 'crown-solid-band', [center.x, at, center.z]); band.rotation.x = Math.PI / 2;
    const prong = geometry('crown-prong', () => new T.ConeGeometry(.085, .25, 5));
    const gem = geometry('crown-gem', () => new T.OctahedronGeometry(.043, 0));
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, x = center.x + Math.cos(angle) * radius, z = center.z + Math.sin(angle) * radius;
      mesh(prong, gold(), `crown-prong-${i}`, [x, at + .13, z]);
      mesh(gem, material('ruby', 0xb22f63, .35, .26), `crown-jewel-${i}`, [x, at + .26, z]);
    }
  };
  const addHalo = (at = top + .38) => {
    const radius = Math.min(.66, Math.max(.38, size.x * .4));
    const ring = mesh(torus('halo', radius, .045, 40), gold(), 'halo-solid-torus', [center.x, at, center.z]); ring.rotation.set(Math.PI / 2 - .18, 0, -.08);
  };
  try {
    if (variantKey === 'sparkle') {
      const positions = [[-1.12, .52, .18, .13], [1.08, .68, -.12, .16], [-.84, -.65, .36, .1], [.92, -.48, .25, .12], [-.45, 1.18, -.1, .09], [.46, 1.2, .2, .12]];
      positions.forEach(([x, y, z, scale], i) => {
        const star = mesh(extrudedStar(), i % 2 ? silver() : gold(), `sparkle-volume-${i}`, [center.x + x, center.y + y, center.z + z], [scale, scale, scale]);
        star.rotation.set(.18 * (i % 3), .2 * (i - 2), i * .27);
      });
    } else if (variantKey === 'trio') {
      // Clone before changing any wrapper transforms. BufferGeometry and Materials
      // are shared by Three.Object3D.clone; original animation mixer root is retained.
      const second = normalized.clone(true), third = normalized.clone(true);
      subject.scale.setScalar(.61); subject.position.set(-.76, -.3, .18);
      for (const [copy, name, position, yaw] of [[second, 'gift3d-trio-2', [.76, -.3, .18], -.17], [third, 'gift3d-trio-3', [0, .75, -.4], .14]]) {
        const anchor = new T.Group(); anchor.name = name; anchor.scale.setScalar(.61); anchor.position.set(...position); anchor.rotation.y = yaw; anchor.add(copy); root.add(anchor);
      }
    } else if (variantKey === 'box') {
      const w = Math.max(.75, size.x + .22), d = Math.max(.7, size.z + .2), h = .24, y = floor - .1;
      const boxMat = material('packaging', 0x5b326f, .25, .42), ribbonMat = material('ribbon', 0xdca759, .65, .32);
      // Low open tray + four short solid walls never conceal the main subject.
      mesh(cube(), boxMat, 'box-open-tray', [center.x, y - .06, center.z], [w, .12, d]);
      mesh(cube(), boxMat, 'box-wall-left', [center.x - w / 2, y + h / 2, center.z], [.055, h, d]);
      mesh(cube(), boxMat, 'box-wall-right', [center.x + w / 2, y + h / 2, center.z], [.055, h, d]);
      mesh(cube(), boxMat, 'box-wall-back', [center.x, y + h / 2, center.z - d / 2], [w, h, .055]);
      mesh(cube(), boxMat, 'box-wall-front', [center.x, y + h / 2, center.z + d / 2], [w, h, .055]);
      // Detached/open lid is a distinct rigid volume behind the subject, not a cover.
      const lid = new T.Group(); lid.name = 'box-removable-lid'; lid.position.set(center.x, floor + .2, bounds.min.z - .2 - d / 2); lid.rotation.x = -.24; accessories.add(lid);
      mesh(cube(), boxMat, 'box-lid-solid', [0, 0, 0], [w + .09, .1, d + .09], lid);
      mesh(cube(), ribbonMat, 'box-lid-ribbon-x', [0, .066, 0], [w + .12, .035, .12], lid);
      mesh(cube(), ribbonMat, 'box-lid-ribbon-z', [0, .071, 0], [.12, .035, d + .12], lid);
      mesh(cube(), ribbonMat, 'box-tray-ribbon-front', [center.x, y + .1, center.z + d / 2 + .035], [.12, h + .02, .035]);
      const bowGeo = torus('bow', .13, .035, 20);
      for (const side of [-1, 1]) { const loop = mesh(bowGeo, ribbonMat, `box-bow-${side}`, [side * .12, .15, 0], [1, .7, 1], lid); loop.rotation.set(Math.PI / 2, side * .32, 0); }
    } else if (variantKey === 'crown') addCrown();
    else if (variantKey === 'wings') {
      const feather = geometry('feather', () => {
        const shape = new T.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(.22, .16, .18, .54); shape.quadraticCurveTo(.14, .88, 0, 1.07); shape.quadraticCurveTo(-.13, .72, -.15, .42); shape.quadraticCurveTo(-.17, .14, 0, 0); shape.closePath();
        const geo = new T.ExtrudeGeometry(shape, { depth: .07, bevelEnabled: false, curveSegments: 5, steps: 1 }); geo.translate(0, 0, -.035); return geo;
      });
      const bone = geometry('wing-bone', () => new T.CylinderGeometry(.045, .045, .85, 6));
      for (const side of [-1, 1]) {
        const wing = new T.Group(); wing.name = side < 0 ? 'wing-left-volume' : 'wing-right-volume';
        wing.position.set(center.x + side * Math.max(.25, size.x * .27), center.y, bounds.min.z + .08); wing.rotation.y = side * .18; accessories.add(wing);
        const spine = mesh(bone, gold(), `wing-spine-${side}`, [side * .28, .12, 0], [1, 1, 1], wing); spine.rotation.z = -side * .65;
        for (let i = 0; i < 7; i++) {
          const plume = mesh(feather, silver(), `wing-feather-${side}-${i}`, [side * (.08 + i * .085), -.26 + i * .055, .018 * (i % 2)], [1, 1 - i * .055, 1], wing);
          plume.rotation.z = -side * (.25 + i * .155);
        }
      }
    } else if (variantKey === 'halo') addHalo();
    else if (variantKey === 'royal') {
      const podium = geometry('royal-stage', () => new T.CylinderGeometry(1, 1, .18, 32));
      mesh(podium, gold(), 'royal-gold-display-stage', [center.x, floor - .1, center.z], [Math.max(.75, size.x * .57), 1, Math.max(.65, size.z * .57)]);
      const rim = mesh(torus('royal-stage-rim', 1, .028, 32), material('stage-trim', 0xffeec5), 'royal-stage-rim', [center.x, floor, center.z], [Math.max(.75, size.x * .57), Math.max(.65, size.z * .57), 1]); rim.rotation.x = Math.PI / 2;
      addCrown(top + .12); addHalo(top + .65);
    }
    const measured = validateGift3DSceneBudget(measureGift3DScene(root));
    let accessoryMeshCount = 0; accessories.traverse(node => { if (node.isMesh) accessoryMeshCount++; });
    if (accessoryMeshCount > GIFT3D_VARIANT_LIMITS.accessoryMeshes) throw Error('composition-budget');
    // Reframe whole composition without touching the native GLTF root or tracks.
    // base has no extra reframe, preserving the R27 model's existing presentation.
    let framed = root;
    if (variantKey !== 'base') {
      const full = new T.Box3().setFromObject(root), fullSize = full.getSize(new T.Vector3()), fullCenter = full.getCenter(new T.Vector3());
      const fullSpan = Math.max(fullSize.x, fullSize.y, fullSize.z);
      if (!Number.isFinite(fullSpan) || fullSpan <= 0) throw Error('invalid-model-bounds');
      const centered = new T.Group(); centered.position.copy(fullCenter).multiplyScalar(-1); centered.add(root);
      framed = new T.Group(); framed.name = 'gift3d-composition-framed'; framed.scale.setScalar(2.2 / fullSpan); framed.add(centered);
    }
    return Object.freeze({ root: framed, variantKey, variantApplied: variantKey !== 'base',
      compositionMeshCount: measured.meshCount - original.meshCount, accessoryMeshCount,
      baseMeshCount: original.meshCount, ...measured });
  } catch (error) {
    for (const value of ownedGeometries) value.dispose();
    for (const value of ownedMaterials) value.dispose();
    normalized.removeFromParent();
    if (previousParent) {
      previousParent.add(normalized);
      const index = previousParent.children.indexOf(normalized);
      previousParent.children.splice(index, 1);
      previousParent.children.splice(Math.min(previousIndex, previousParent.children.length), 0, normalized);
    }
    throw error;
  }
}
