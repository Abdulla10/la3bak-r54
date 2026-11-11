/* R27 voice-room effects. Rendering only: no sends, wallet changes, or fabricated receipts.
 * Uses the locally bundled MIT Three.js/GLTFLoader. Asset selection is parent-injectable. */
import { composeGift3DVariant, isGift3DVariantKey, measureGift3DScene, GIFT3D_VARIANT_LIMITS } from './gift3d-variants-r33.js?v=complete-r46';
import { createGift3DCinematic, prepareGiftCinematicModel, sampleGift3DCinematic, isGift3DMotionKey,
  isGift3DAccentKey, GIFT3D_CINEMATIC_LIMITS } from './gift3d-cinematic-r36.js?v=complete-r46';
const LIMITS = Object.freeze({ queue: 4, seen: 256, modelBytes: 12 * 1024 * 1024, cacheBytes: 16 * 1024 * 1024, cacheCount: 2, loadMs: 9000 });
const LEASE = Symbol.for('la3bak.socialGift3D.r27.lease');
export const INITIAL_GIFT3D_ASSETS = Object.freeze({
  'royal-crown': Object.freeze({ model: '/assets/gifts-r27/royal-crown.glb', poster: '/assets/gifts-r27/royal-crown.webp', motion: 'royal', durationMs: 3400 })
});
export function resolveAsset({ gift } = {}) {
  return gift?.id === 'royal-crown' ? INITIAL_GIFT3D_ASSETS['royal-crown'] : null;
}

// No origin-relative escapes, encoded traversal, query strings, external URLs or redirects.
export function validLocalAssetURL(value, kind = 'model') {
  const extension = kind === 'model' ? 'glb' : '(?:webp|png|jpe?g)';
  if (typeof value !== 'string' || value.length > 240) return false;
  const expression = new RegExp(`^/assets/gifts-r27/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+\\.${extension}$`);
  return expression.test(value);
}
export function validateAsset(descriptor) {
  if (!descriptor || !validLocalAssetURL(descriptor.model)) return null;
  if (descriptor.poster != null && !validLocalAssetURL(descriptor.poster, 'poster')) return null;
  // Only parent registry-derived enum values; never infer a variant from gift labels.
  const variantKey = descriptor.variantKey === undefined ? 'base' : descriptor.variantKey;
  if (!isGift3DVariantKey(variantKey)) return null;
  if (descriptor.motion != null && !isGift3DMotionKey(descriptor.motion)) return null;
  const accent = descriptor.accent === undefined ? 'auto' : descriptor.accent;
  if (!isGift3DAccentKey(accent)) return null;
  if (descriptor.bytes != null && (!Number.isSafeInteger(descriptor.bytes) || descriptor.bytes <= 0 || descriptor.bytes > LIMITS.modelBytes)) return null;
  if (descriptor.sha256 != null && !/^[a-f0-9]{64}$/i.test(descriptor.sha256)) return null;
  const rotation = descriptor.rotation || [0, 0, 0];
  if (!Array.isArray(rotation) || rotation.length !== 3 || !rotation.every(n => Number.isFinite(n) && Math.abs(n) <= Math.PI * 4)) return null;
  return Object.freeze({ model: descriptor.model, poster: descriptor.poster || null, motion: descriptor.motion || 'still',
    durationMs: Math.min(6000, Math.max(2000, Number(descriptor.durationMs) || 3400)),
    bytes: descriptor.bytes || null, sha256: descriptor.sha256?.toLowerCase() || null, rotation: [...rotation], variantKey, accent });
}

// Scope is a stable primitive or a plain JSON object (e.g. { accountId, roomId, councilId }).
export function scopeKey(scope) {
  const canonical = (value, depth = 0) => {
    if (depth > 4) throw Error('scope-depth');
    if (typeof value === 'string') { if (!value || value.length > 256) throw Error('scope-value'); return value; }
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'boolean' || value === null) return value;
    if (value && Object.getPrototypeOf(value) === Object.prototype) {
      const keys = Object.keys(value).sort();
      if (!keys.length || keys.length > 16) throw Error('scope-keys');
      return Object.fromEntries(keys.map(key => [key, canonical(value[key], depth + 1)]));
    }
    throw Error('scope-type');
  };
  if (scope == null || scope === '') return null;
  try { const key = JSON.stringify(canonical(scope)); return key.length <= 2048 ? key : null; } catch { return null; }
}
const personId = value => value && typeof value === 'object' ? value.id : value;
const stableId = value => (typeof value === 'string' && value.length > 0 && value.length <= 256) || (Number.isSafeInteger(value) && value >= 0);
export function validConfirmedEvent(event, scope) {
  return !!(event && stableId(event.tx) && event.gift && stableId(event.gift.id)
    && stableId(personId(event.from)) && stableId(personId(event.to))
    && Number.isSafeInteger(event.qty) && event.qty > 0 && event.qty <= 10000
    && Number.isFinite(event.ts) && event.ts > 0 && scope && scopeKey(event.scope) === scope);
}

export class BufferLRU {
  constructor(byteLimit = LIMITS.cacheBytes, countLimit = LIMITS.cacheCount) {
    this.byteLimit = byteLimit; this.countLimit = countLimit; this.bytes = 0; this.items = new Map();
  }
  get(key) {
    const buffer = this.items.get(key);
    if (buffer) { this.items.delete(key); this.items.set(key, buffer); }
    return buffer;
  }
  put(key, buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > this.byteLimit) return false;
    const previous = this.items.get(key); if (previous) this.bytes -= previous.byteLength;
    this.items.delete(key); this.items.set(key, buffer); this.bytes += buffer.byteLength;
    while (this.items.size > this.countLimit || this.bytes > this.byteLimit) {
      const first = this.items.keys().next().value; this.bytes -= this.items.get(first).byteLength; this.items.delete(first);
    }
    return true;
  }
  clear() { this.items.clear(); this.bytes = 0; }
}

export function disposeModel(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set(), images = new Set();
  root?.traverse?.(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.skeleton) skeletons.add(node.skeleton);
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      for (const uniform of Object.values(material.uniforms || {})) if (uniform?.value?.isTexture) textures.add(uniform.value);
    }
  });
  for (const texture of textures) { texture.dispose?.(); const image = texture.source?.data || texture.image; if (image) images.add(image); }
  for (const image of images) image.close?.();
  for (const geometry of geometries) geometry.dispose?.();
  for (const material of materials) material.dispose?.();
  for (const skeleton of skeletons) skeleton.dispose?.();
}

// Validate the binary container before GLTFLoader can request any nested resources.
export function inspectGLB(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20 || buffer.byteLength > LIMITS.modelBytes) throw Error('invalid-glb');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) throw Error('invalid-glb');
  let offset = 12, json = null;
  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) throw Error('invalid-glb');
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true); offset += 8;
    if (length % 4 || offset + length > buffer.byteLength) throw Error('invalid-glb');
    if (!json && type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset, length)).trim());
    offset += length;
  }
  if (!json || json.asset?.version !== '2.0') throw Error('invalid-glb');
  for (const entry of [...(json.buffers || []), ...(json.images || [])]) {
    if (entry.uri && !/^data:(?:image\/(?:png|jpeg|webp)|application\/octet-stream);base64,[a-z0-9+/=]+$/i.test(entry.uri)) throw Error('external-glb-resource');
  }
  if ((json.meshes?.length || 0) > 96 || (json.images?.length || 0) > 16) throw Error('model-budget');
  return json;
}

async function boundedBuffer(response, signal) {
  const declared = Number(response.headers?.get('content-length'));
  if (!response.ok || (declared > LIMITS.modelBytes)) throw Error('missing-asset');
  if (!response.body?.getReader) {
    const buffer = await response.arrayBuffer();
    if (signal.aborted) throw Error('aborted');
    if (buffer.byteLength > LIMITS.modelBytes) throw Error('model-budget');
    return buffer;
  }
  const reader = response.body.getReader(); let total = 0; const chunks = [];
  try {
    while (true) {
      if (signal.aborted) throw Error('aborted');
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > LIMITS.modelBytes) throw Error('model-budget');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const result = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result.buffer;
}

// Compatibility sampler for consumers of the old hook; now uses the same shot
// as the real WebGL renderer. Never claims a skeletal rig where one does not exist.
export function rigidMotion(motion, progress, reduced = false) {
  const frame = sampleGift3DCinematic(motion, progress, reduced);
  return { x: frame.x, y: frame.y, rx: frame.rx, ry: frame.ry, rz: frame.rz, scale: frame.scale };
}

export class SocialGift3DRenderer {
  constructor({ host, ownerId, scope, onState, resolveAsset: assetResolver = resolveAsset, renderFallback,
    queueLimit = LIMITS.queue, platform = {} } = {}) {
    this.doc = platform.document || globalThis.document;
    if (!host?.appendChild || !host.dataset || host === this.doc?.body || host === this.doc?.documentElement) throw TypeError('Gift3D requires an element inside the current voice room, not body/document.');
    if (!stableId(ownerId)) throw TypeError('Gift3D requires a stable ownerId.');
    this.host = host; this.ownerId = ownerId; this.scope = scopeKey(scope);
    this.onState = onState; this.assetResolver = assetResolver; this.renderFallback = renderFallback;
    this.queueLimit = Math.min(6, Math.max(1, Number.isSafeInteger(queueLimit) ? queueLimit : LIMITS.queue));
    this.now = platform.now || (() => globalThis.performance.now());
    this.schedule = platform.setTimeout || globalThis.setTimeout.bind(globalThis);
    this.unschedule = platform.clearTimeout || globalThis.clearTimeout.bind(globalThis);
    this.raf = platform.requestAnimationFrame || (callback => globalThis.requestAnimationFrame(callback));
    this.caf = platform.cancelAnimationFrame || (id => globalThis.cancelAnimationFrame(id));
    this.loadVendor = platform.loadVendor || (() => import('/vendor/gift3d-three.mjs'));
    this.fetchModel = platform.fetch || ((...args) => globalThis.fetch(...args));
    this.ResizeObserver = platform.ResizeObserver || globalThis.ResizeObserver;
    this.window = platform.window || globalThis;
    this.lease = platform.lease || globalThis;
    this.cache = new BufferLRU(); this.seen = new Map(); this.queue = []; this.active = null;
    this.positionedHost = false;
    this.destroyed = false; this.modulePromise = null; this.last = null; this.dropped = 0;
    this.visibility = () => { if (this.doc.hidden) this.clear('hidden'); };
    this.doc?.addEventListener('visibilitychange', this.visibility);
    this.motionQuery = this.window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    this.motionChange = () => { if (!this.destroyed) this.clear('motion-preference-change'); };
    if (this.motionQuery?.addEventListener) this.motionQuery.addEventListener('change', this.motionChange);
    else this.motionQuery?.addListener?.(this.motionChange);
    this.publish('idle');
  }
  metrics() {
    const a = this.active, info = a?.renderer?.info;
    return { state: a?.state || (this.destroyed ? 'destroyed' : 'idle'), scope: this.scope, ownerId: this.ownerId,
      tx: a?.event.tx ?? null, active: !!a, contexts: a?.renderer ? 1 : 0, queue: this.queue.length, dedup: this.seen.size,
      dropped: this.dropped, cacheEntries: this.cache.items.size, cacheBytes: this.cache.bytes,
      frames: a?.frames || 0, meshes: a?.meshes || 0, clips: a?.clips || 0, drawCalls: info?.render.calls || 0,
      triangles: info?.render.triangles || 0, memory: { geometries: info?.memory.geometries || 0, textures: info?.memory.textures || 0 },
      variantKey: a?.descriptor?.variantKey || null, variantApplied: !!a?.variantApplied && a?.state === 'ready',
      compositionMeshCount: a?.compositionMeshCount || 0, accessoryMeshCount: a?.accessoryMeshCount || 0,
      uniqueVertices: a?.uniqueVertices || 0, estimatedDrawTriangles: a?.estimatedDrawTriangles || 0,
      textureBytesEstimate: a?.textureBytesEstimate || 0, textureMaxEdge: a?.textureMaxEdge || 0,
      scenePhase: a?.state === 'ready' ? a?.scenePhase || 'pending' : a?.state === 'fallback' ? 'fallback-2d' : a?.state === 'loading' ? 'loading' : 'idle',
      motion: a?.descriptor?.motion || null, accent: a?.cinematic?.accent || null,
      sceneProgress: a?.sceneProgress || 0, particleCount: a?.renderer && a?.state === 'ready' ? a?.particleCount || 0 : 0,
      ringCount: a?.renderer && a?.state === 'ready' ? a?.ringCount || 0 : 0,
      cinematicMeshCount: a?.cinematic?.budget.meshCount || 0, cinematicVertices: a?.cinematic?.budget.uniqueVertices || 0,
      cinematicDrawTriangles: a?.cinematic?.budget.estimatedDrawTriangles || 0, lampSilhouetteApplied: !!a?.lampSilhouetteApplied && a?.state === 'ready',
      subjectTransform: a?.subjectTransform ? { ...a.subjectTransform } : null,
      reducedMotion: !!a?.reduced, fallback: a?.state === 'fallback', reason: a?.reason || null,
      last: this.last ? { ...this.last } : null };
  }
  publish(state, extra = {}) {
    const snapshot = { ...this.metrics(), state, ...extra };
    for (const node of [this.host, this.active?.root, this.active?.renderer?.domElement].filter(Boolean)) {
      Object.assign(node.dataset, { gift3dState: state, gift3dFallback: String(snapshot.fallback),
        gift3dDrawCalls: String(snapshot.drawCalls), gift3dTriangles: String(snapshot.triangles),
        gift3dFrames: String(snapshot.frames), gift3dContexts: String(snapshot.contexts),
        gift3dGeometries: String(snapshot.memory.geometries), gift3dTextures: String(snapshot.memory.textures),
        gift3dVariantKey: snapshot.variantKey || '', gift3dVariantApplied: String(snapshot.variantApplied),
        gift3dCompositionMeshCount: String(snapshot.compositionMeshCount), gift3dAccessoryMeshCount: String(snapshot.accessoryMeshCount),
        gift3dUniqueVertices: String(snapshot.uniqueVertices), gift3dEstimatedDrawTriangles: String(snapshot.estimatedDrawTriangles),
        gift3dScenePhase: snapshot.scenePhase, gift3dMotion: snapshot.motion || '', gift3dAccent: snapshot.accent || '',
        gift3dSceneProgress: String(snapshot.sceneProgress), gift3dParticleCount: String(snapshot.particleCount), gift3dRingCount: String(snapshot.ringCount),
        gift3dCinematicMeshCount: String(snapshot.cinematicMeshCount), gift3dCinematicVertices: String(snapshot.cinematicVertices),
        gift3dCinematicDrawTriangles: String(snapshot.cinematicDrawTriangles), gift3dLampSilhouetteApplied: String(snapshot.lampSilhouetteApplied),
        gift3dQueue: String(snapshot.queue), gift3dReason: String(snapshot.reason || '') });
    }
    try { this.onState?.(snapshot); } catch { /* Host observer cannot interrupt receipts or cleanup. */ }
    return snapshot;
  }
  remember(event) {
    const key = JSON.stringify([this.scope, String(event.tx)]);
    if (this.seen.has(key)) return false;
    this.seen.set(key, true);
    while (this.seen.size > LIMITS.seen) this.seen.delete(this.seen.keys().next().value);
    return true;
  }
  acceptConfirmed(event, options = {}) {
    if (this.destroyed) return false;
    if (!validConfirmedEvent(event, this.scope)) { this.publish(this.metrics().state, { decision: 'ignored', reason: 'invalid-or-out-of-scope' }); return false; }
    if (!this.remember(event)) { this.publish(this.metrics().state, { decision: 'ignored', reason: 'duplicate', receiptTx: event.tx }); return false; }
    if (options.initial || options.historical) { this.publish(this.metrics().state, { decision: 'ignored', reason: 'historical', receiptTx: event.tx }); return false; }
    if (!this.host.isConnected || this.doc?.hidden) { this.publish(this.metrics().state, { decision: 'ignored', reason: 'inactive-host', receiptTx: event.tx }); return false; }
    if (this.active && this.queue.length >= this.queueLimit) {
      this.dropped++; this.publish(this.metrics().state, { decision: 'dropped', reason: 'queue-full', receiptTx: event.tx }); return false;
    }
    // Snapshot parent-owned receipt fields so a later room repaint cannot mutate scope/gift mid-load.
    this.queue.push({ ...event, scope: JSON.parse(this.scope), gift: { ...event.gift }, from: typeof event.from === 'object' ? { ...event.from } : event.from,
      to: typeof event.to === 'object' ? { ...event.to } : event.to });
    this.publish(this.metrics().state, { decision: 'accepted', receiptTx: event.tx }); this.next(); return true;
  }
  hydrateHistorical(events) {
    if (this.destroyed || !Array.isArray(events)) return 0;
    let count = 0;
    // Bound iteration too; older entries beyond the recent dedup window cannot add protection.
    for (const event of events.slice(-LIMITS.seen)) if (validConfirmedEvent(event, this.scope) && this.remember(event)) count++;
    this.publish(this.metrics().state, { decision: 'hydrated', historicalCount: count }); return count;
  }
  setScope(scope) {
    if (this.destroyed) return false;
    const next = scopeKey(scope); if (next === this.scope) return true;
    this.clear('scope-change'); this.scope = next; this.publish('idle'); return !!next;
  }
  alive(a) { return !this.destroyed && this.active === a && !a.abort.signal.aborted && this.host.isConnected; }
  style() {
    if (!this.doc || this.doc.querySelector('link[data-gift3d-r27-styles]')) return;
    const link = this.doc.createElement('link'); link.rel = 'stylesheet'; link.href = '/gift3d-r27.css?v=emerald-r44';
    link.dataset.gift3dR27Styles = ''; this.doc.head?.appendChild(link);
  }
  next() {
    if (this.destroyed || this.active || this.doc?.hidden || !this.host.isConnected) return;
    const event = this.queue.shift(); if (!event) { this.publish('idle'); return; }
    // A global lease also covers different import querystrings: at most one active renderer.
    const previous = this.lease[LEASE]; if (previous && previous !== this) previous.clear('superseded');
    this.lease[LEASE] = this; this.style(); this.host.classList.add('gift3d-r27-host');
    if (!this.window.getComputedStyle || this.window.getComputedStyle(this.host).position === 'static') {
      this.host.classList.add('gift3d-r27-host--positioned'); this.positionedHost = true;
    }
    const root = this.doc.createElement('section'); root.className = 'gift3d-r27'; root.setAttribute('aria-hidden', 'true');
    root.dataset.gift3dKind = 'pending'; root.dataset.gift3dTx = String(event.tx);
    const stage = this.doc.createElement('div'); stage.className = 'gift3d-r27-stage';
    const status = this.doc.createElement('p'); status.className = 'gift3d-r27-status';
    root.appendChild(stage); root.appendChild(status); this.host.appendChild(root);
    const a = { event, root, stage, status, state: 'loading', abort: new AbortController(), frames: 0,
      frame: 0, timer: 0, observer: null, renderer: null, model: null, mixer: null, environment: null, descriptor: null,
      composition: null, variantApplied: false, compositionMeshCount: 0, accessoryMeshCount: 0, uniqueVertices: 0, estimatedDrawTriangles: 0,
      prepared: null, cinematic: null, scenePhase: 'loading', sceneProgress: 0, particleCount: 0, ringCount: 0, lampSilhouetteApplied: false,
      reduced: !!this.window.matchMedia?.('(prefers-reduced-motion: reduce)').matches };
    this.active = a;
    a.timer = this.schedule(() => { if (this.alive(a)) { a.abort.abort(); this.fallback(a, 'load-timeout'); } else this.finish(a); }, LIMITS.loadMs);
    this.publish('loading'); void this.render(a);
  }
  async buffer(asset, a) {
    const key = `${asset.model}:${asset.sha256 || ''}:${asset.bytes || ''}`, cached = this.cache.get(key);
    if (cached) return cached;
    const response = await this.fetchModel(asset.model, { method: 'GET', signal: a.abort.signal, credentials: 'same-origin', redirect: 'error' });
    const bytes = await boundedBuffer(response, a.abort.signal);
    if (!this.alive(a)) throw Error('aborted');
    if (asset.bytes && bytes.byteLength !== asset.bytes) throw Error('asset-length-mismatch');
    if (asset.sha256) {
      if (!this.window.crypto?.subtle) throw Error('integrity-unavailable');
      const digest = await this.window.crypto.subtle.digest('SHA-256', bytes);
      const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== asset.sha256) throw Error('asset-integrity');
    }
    inspectGLB(bytes); if (!this.alive(a)) throw Error('aborted');
    this.cache.put(key, bytes); return bytes;
  }
  async render(a) {
    let parsed = null;
    try {
      if (!this.alive(a)) return;
      /* R71: نت ضعيف أو توفير بيانات: نعرض صورة الهدية بدل تنزيل المجسم (ميغات) */
      if (this.doc.documentElement?.classList.contains('la69-lite')) { this.fallback(a, 'lite-network'); return; }
      const selected = this.assetResolver?.({ gift: a.event.gift });
      a.descriptor = validateAsset(selected);
      if (!a.descriptor) { this.fallback(a, selected ? 'invalid-asset-url-or-descriptor' : 'missing-asset'); return; }
      if (!this.alive(a)) return;
      if (!this.modulePromise) this.modulePromise = this.loadVendor().catch(error => { this.modulePromise = null; throw error; });
      const { THREE: T, GLTFLoader, RoomEnvironment } = await this.modulePromise;
      if (!this.alive(a)) return;
      if (!T?.WebGLRenderer || !GLTFLoader) throw Error('webgl-unavailable');
      const bytes = await this.buffer(a.descriptor, a); if (!this.alive(a)) return;
      const manager = new T.LoadingManager();
      manager.setURLModifier(url => { if (/^(blob:|data:)/.test(url)) return url; throw Error('external-glb-resource'); });
      parsed = await new Promise((resolve, reject) => new GLTFLoader(manager).parse(bytes, '', resolve, reject));
      if (!this.alive(a)) { disposeModel(parsed.scene); return; }
      a.model = parsed.scene; a.clips = parsed.animations?.length || 0;
      const baseMetrics = measureGift3DScene(a.model);
      let estimatedTextureBytes = 0; const textures = new Set();
      a.meshes = baseMetrics.meshCount;
      a.model.traverse(node => {
        for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : [])
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      });
      if (inspectGLB(bytes).images?.length && !textures.size) throw Error('missing-model-textures');
      // Preserve real PBR maps. Resize their decoded pixels, not the model files or gift artwork.
      const resizedSources = new Map(), replacedImages = new Set();
      for (const texture of textures) {
        let image = texture.source?.data || texture.image, width = image?.width || 0, height = image?.height || 0;
        if (width > 4096 || height > 4096) throw Error('texture-budget');
        if (Math.max(width, height) > 1024) {
          let resized = resizedSources.get(image);
          if (!resized) {
            resized = this.doc.createElement('canvas'); const ratio = 1024 / Math.max(width, height);
            resized.width = Math.max(1, Math.round(width * ratio)); resized.height = Math.max(1, Math.round(height * ratio));
            const context = resized.getContext('2d'); if (!context) throw Error('texture-resize-unavailable');
            context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
            context.drawImage(image, 0, 0, resized.width, resized.height);
            resizedSources.set(image, resized); replacedImages.add(image);
          }
          texture.image = resized; texture.needsUpdate = true; image = resized; width = image.width; height = image.height;
        }
        texture.anisotropy = 1;
        estimatedTextureBytes += width * height * 4 * 1.34;
        a.textureMaxEdge = Math.max(a.textureMaxEdge || 0, width, height);
      }
      for (const image of replacedImages) image.close?.();
      a.textureBytesEstimate = Math.round(estimatedTextureBytes);
      if (!a.meshes || a.meshes > 96 || baseMetrics.uniqueVertices > GIFT3D_VARIANT_LIMITS.uniqueVertices
        || baseMetrics.estimatedDrawTriangles > GIFT3D_VARIANT_LIMITS.estimatedDrawTriangles
        || estimatedTextureBytes > 24 * 1024 * 1024) throw Error('model-budget');
      const box = new T.Box3().setFromObject(a.model), size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
      const span = Math.max(size.x, size.y, size.z); if (!Number.isFinite(span) || span <= 0) throw Error('invalid-model-bounds');
      // Wrapper normalization preserves the GLTF root transform and animation track targets.
      const centered = new T.Group(); centered.position.copy(center).multiplyScalar(-1); centered.add(a.model);
      const normalized = new T.Group(); normalized.scale.setScalar(2 / span); normalized.add(centered);
      normalized.rotation.set(...a.descriptor.rotation);
      a.prepared = prepareGiftCinematicModel(T, normalized, a.descriptor.motion);
      a.lampSilhouetteApplied = a.prepared.modified;
      a.composition = composeGift3DVariant(T, a.prepared.root, a.descriptor.variantKey);
      a.variantApplied = a.composition.variantApplied; a.compositionMeshCount = a.composition.compositionMeshCount;
      a.accessoryMeshCount = a.composition.accessoryMeshCount; a.uniqueVertices = a.composition.uniqueVertices;
      a.estimatedDrawTriangles = a.composition.estimatedDrawTriangles; a.meshes = a.composition.meshCount;
      const pivot = new T.Group(); pivot.add(a.composition.root); const scene = new T.Scene(); scene.add(pivot);
      scene.add(new T.HemisphereLight(0xfff4ed, 0x423653, 1.8));
      for (const [color, intensity, position] of [[0xfff4df, 3, [3, 4, 5]], [0xe8c78d, 2, [-3, 2, -2]], [0xbccfff, 1.3, [2, 1, -3]]]) {
        const light = new T.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
      }
      const low = (this.window.navigator?.deviceMemory || 8) <= 4 || (this.window.navigator?.hardwareConcurrency || 8) <= 4;
      let emitter = null;
      if (a.prepared.emitter) {
        scene.updateMatrixWorld(true);
        const outlet = new T.Vector3(a.prepared.emitter.x, a.prepared.emitter.y, a.prepared.emitter.z);
        a.prepared.root.localToWorld(outlet); emitter = { x: outlet.x, y: outlet.y, z: outlet.z };
      }
      a.cinematic = createGift3DCinematic(T, { motion: a.descriptor.motion, accent: a.descriptor.accent, reduced: a.reduced, low, emitter });
      scene.add(a.cinematic.root);
      // Composition keeps its original R33 ceiling; accents get ONLY this small
      // separately checked allowance. Main subject can never use that allowance.
      a.uniqueVertices += a.cinematic.budget.uniqueVertices;
      a.estimatedDrawTriangles += a.cinematic.budget.estimatedDrawTriangles;
      try { a.renderer = new T.WebGLRenderer({ alpha: true, antialias: !low, powerPreference: 'low-power', preserveDrawingBuffer: false, stencil: false }); }
      catch { throw Error('webgl-unavailable'); }
      const renderer = a.renderer;
      renderer.setClearColor(0x000000, 0); renderer.setPixelRatio(Math.min(this.window.devicePixelRatio || 1, low ? 1 : 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
      if (RoomEnvironment && T.PMREMGenerator) {
        const environment = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer);
        try { a.environment = pmrem.fromScene(environment, .04, .1, 100, { size: 64 }); scene.environment = a.environment.texture; }
        finally { environment.dispose(); pmrem.dispose(); }
      }
      a.stage.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');
      a.contextLost = event => {
        event.preventDefault();
        if (this.active !== a || this.destroyed) return;
        a.abort.abort(); this.queue.length = 0; this.cache.clear(); this.fallback(a, 'context-lost');
      };
      renderer.domElement.addEventListener('webglcontextlost', a.contextLost);
      const camera = new T.PerspectiveCamera(35, 1, .05, 100);
      let cameraDistance = 5;
      const fit = () => {
        if (this.active !== a || !a.renderer || !this.host.isConnected) return;
        const width = Math.min(1280, Math.max(1, a.stage.clientWidth || this.host.clientWidth));
        const height = Math.min(1280, Math.max(1, a.stage.clientHeight || this.host.clientHeight));
        renderer.setSize(width, height, false); camera.aspect = width / height;
        cameraDistance = 1.42 / Math.tan(camera.fov * Math.PI / 360) / Math.min(1, camera.aspect);
        camera.updateProjectionMatrix();
        if (a.state === 'ready' && a.reduced) draw();
      };
      a.mixer = a.clips ? new T.AnimationMixer(a.model) : null;
      for (const clip of parsed.animations || []) a.mixer.clipAction(clip).play();
      a.duration = a.reduced ? 1500 : a.descriptor.durationMs;
      const draw = () => {
        if (!this.alive(a) || !a.renderer) { if (this.active === a) this.finish(a); return; }
        const elapsed = Math.max(0, this.now() - a.start);
        if (elapsed >= a.duration) { this.finish(a); return; }
        const motion = sampleGift3DCinematic(a.descriptor.motion, elapsed / a.duration, a.reduced);
        const previousPhase = a.scenePhase;
        pivot.position.set(motion.x, motion.y, motion.z); pivot.rotation.set(motion.rx, motion.ry, motion.rz); pivot.scale.setScalar(motion.scale);
        camera.position.set(cameraDistance * motion.cameraX, cameraDistance * motion.cameraY, cameraDistance * motion.cameraDolly);
        camera.lookAt(0, motion.targetY, 0);
        const accents = a.cinematic.update(motion, elapsed / 1000);
        a.scenePhase = motion.phase; a.sceneProgress = motion.progress; a.particleCount = accents.particleCount; a.ringCount = accents.ringCount;
        a.subjectTransform = { x: motion.x, y: motion.y, z: motion.z, rx: motion.rx, ry: motion.ry, rz: motion.rz, scale: motion.scale };
        a.mixer?.setTime(a.reduced ? 0 : elapsed / 1000);
        try {
          renderer.render(scene, camera); a.frames++;
          // Initial arrival can legitimately be off camera. Require actual mesh
          // draws during the hold, not a cosmetic canvas claimed as a GLB render.
          if (motion.phase === 'hold' && (!renderer.info.render.calls || !renderer.info.render.triangles)) throw Error('no-mesh-draw');
          if (renderer.info.render.triangles > GIFT3D_VARIANT_LIMITS.estimatedDrawTriangles + GIFT3D_CINEMATIC_LIMITS.estimatedDrawTriangles) throw Error('composition-budget');
          if (a.frames === 1 || a.frames % 8 === 0 || previousPhase !== motion.phase || a.reduced) this.publish('ready');
          if (!a.reduced && this.alive(a)) a.frame = this.raf(draw);
        } catch (error) { this.fallback(a, error.message || 'render-error'); }
      };
      fit();
      // Shader compilation is loading work, not part of the visible shot.
      camera.position.set(cameraDistance * .045, cameraDistance * .035, cameraDistance);
      camera.lookAt(0, 0, 0);
      if (typeof renderer.compile === 'function') renderer.compile(scene, camera);
      if (!this.alive(a)) return;
      a.start = this.now();
      if (this.ResizeObserver) { a.observer = new this.ResizeObserver(fit); a.observer.observe(a.stage); }
      this.unschedule(a.timer); a.timer = this.schedule(() => this.finish(a), a.duration);
      a.state = 'ready'; a.root.dataset.gift3dKind = 'canvas-glb'; a.root.dataset.gift3dMotion = a.descriptor.motion;
      draw();
    } catch (error) {
      if (this.alive(a)) this.fallback(a, error?.message || 'model-load-error');
      else if (parsed?.scene && parsed.scene !== a.model) disposeModel(parsed.scene);
    }
  }
  fallback(a, reason) {
    // Timeout/context loss abort the loader but must still show an honest fallback.
    if (this.destroyed || this.active !== a) return;
    a.abort.abort(); this.unschedule(a.timer); this.disposeGPU(a);
    a.state = 'fallback'; a.reason = reason; a.root.dataset.gift3dKind = 'fallback-2d';
    a.status.textContent = 'العرض ثلاثي الأبعاد غير متاح — صورة ثنائية الأبعاد (2D) فقط';
    try {
      const result = this.renderFallback?.({ gift: a.event.gift, event: a.event, reason, container: a.stage });
      if (result?.nodeType && !a.stage.contains(result)) a.stage.appendChild(result);
    } catch { /* Keep the honest text if the parent's artwork helper is unavailable. */ }
    // Parent may add a receipt caption, but must not remove the explicit 2D truth.
    if (!/\(2D\)/.test(a.status.textContent)) a.status.textContent = `${a.status.textContent || ''} — صورة ثنائية الأبعاد (2D) فقط`;
    if (!a.stage.childNodes.length && a.descriptor?.poster) {
      const image = this.doc.createElement('img'); image.src = a.descriptor.poster; image.alt = '';
      image.decoding = 'async'; image.className = 'gift3d-r27-artwork';
      image.addEventListener('error', () => image.remove(), { once: true }); a.stage.appendChild(image);
    }
    this.publish('fallback');
    if (this.active === a && !this.destroyed) a.timer = this.schedule(() => this.finish(a), a.reduced ? 1200 : 1800);
  }
  disposeGPU(a) {
    if (a.frame) this.caf(a.frame); a.frame = 0;
    a.observer?.disconnect(); a.observer = null;
    a.mixer?.stopAllAction(); if (a.model) a.mixer?.uncacheRoot(a.model); a.mixer = null;
    // One traversal deduplicates original/clones/accessories. Do not dispose the
    // original a second time: trio deliberately shares its geometries/materials.
    a.cinematic?.dispose(); a.cinematic = null; a.particleCount = 0; a.ringCount = 0;
    disposeModel(a.composition?.root || a.prepared?.root || a.model);
    a.composition = null; a.prepared = null; a.model = null; a.variantApplied = false; a.lampSilhouetteApplied = false;
    a.environment?.dispose(); a.environment = null;
    if (a.renderer) {
      const renderer = a.renderer; a.renderer = null;
      renderer.domElement.removeEventListener('webglcontextlost', a.contextLost);
      renderer.renderLists?.dispose(); renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove();
    }
  }
  stopActive(reason) {
    const a = this.active; if (!a) return;
    this.last = { tx: a.event.tx, state: a.state, reason: reason || a.reason || 'complete', frames: a.frames,
      drawCalls: a.renderer?.info?.render.calls || 0, triangles: a.renderer?.info?.render.triangles || 0,
      variantKey: a.descriptor?.variantKey || null, variantApplied: !!a.variantApplied && a.state === 'ready',
      compositionMeshCount: a.compositionMeshCount || 0, accessoryMeshCount: a.accessoryMeshCount || 0,
      uniqueVertices: a.uniqueVertices || 0, estimatedDrawTriangles: a.estimatedDrawTriangles || 0,
      scenePhase: a.scenePhase || null, motion: a.descriptor?.motion || null, sceneProgress: a.sceneProgress || 0,
      particleCount: a.particleCount || 0, ringCount: a.ringCount || 0, lampSilhouetteApplied: !!a.lampSilhouetteApplied,
      cinematicMeshCount: a.cinematic?.budget.meshCount || 0 };
    this.active = null; a.abort.abort(); this.unschedule(a.timer); this.disposeGPU(a); a.root.remove();
    if (this.lease[LEASE] === this) delete this.lease[LEASE];
  }
  finish(a) {
    if (this.active !== a) return;
    this.stopActive('complete'); this.publish('idle'); this.next();
  }
  clear(reason = 'clear') {
    this.queue.length = 0; this.stopActive(reason); this.cache.clear(); this.publish(this.destroyed ? 'destroyed' : 'idle', { reason });
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.clear('destroy'); this.seen.clear(); this.modulePromise = null;
    this.doc?.removeEventListener('visibilitychange', this.visibility);
    if (this.motionQuery?.removeEventListener) this.motionQuery.removeEventListener('change', this.motionChange);
    else this.motionQuery?.removeListener?.(this.motionChange);
    this.motionQuery = null;
    this.host.classList.remove('gift3d-r27-host'); this.publish('destroyed');
    if (this.positionedHost) this.host.classList.remove('gift3d-r27-host--positioned');
  }
}
export function createSocialGift3D(options) { return new SocialGift3DRenderer(options); }
export { LIMITS as GIFT3D_R27_LIMITS };
