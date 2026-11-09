/* R29: one real GLB/WebGL view per room controller. Presentation only.
 * No API writes, gift receipts, wallet math, generated assets or static cannon fallback. */
import {inspectGLB, disposeModel} from './gift3d-r27.js?v=complete-r46';

const MODEL = '/assets/gifts-r27/royal-cannon.glb';
const MAX_BYTES = 6 * 1024 * 1024;
const MOUNT = '[data-cannon3d-mount]';
const LABEL = 'مدفع ثلاثي الأبعاد حقيقي';
const UNAVAILABLE = 'العرض ثلاثي الأبعاد غير متاح';
const identity = m => typeof m?.id === 'string' && m.id.length > 0 && m.id.length <= 256 && Array.isArray(m.stages) && m.stages.length === 3
  ? JSON.stringify([m.id, m.version ?? null, m.enabledAt ?? null, m.owner?.id ?? null]) : null;
const receipt = value => value && Array.isArray(value.addedItems) && Array.isArray(value.alreadyOwned)
  && [...value.addedItems, ...value.alreadyOwned].every(v => typeof v === 'string' && v.length <= 256);
const sameReceipt = (a, b) => receipt(a) && receipt(b)
  && ['addedItems', 'alreadyOwned'].every(k => JSON.stringify([...a[k]].sort()) === JSON.stringify([...b[k]].sort()));

async function readBuffer(response, signal) {
  if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) throw Error('missing-model');
  if (!response.body?.getReader) {
    const buffer = await response.arrayBuffer();
    if (signal.aborted || buffer.byteLength > MAX_BYTES) throw Error('model-budget-or-aborted');
    return buffer;
  }
  const reader = response.body.getReader(), chunks = []; let length = 0;
  try {
    while (true) {
      if (signal.aborted) throw Error('aborted');
      const result = await reader.read(); if (result.done) break;
      length += result.value.byteLength; if (length > MAX_BYTES) throw Error('model-budget');
      chunks.push(result.value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes.buffer;
}

export function createCannon3D(getHost) {
  if (typeof getHost !== 'function') throw TypeError('Cannon3D requires a room-root getter.');
  const doc = globalThis.document, win = globalThis.window || globalThis;
  const now = () => globalThis.performance.now();
  let destroyed = false, scope = null, snapshot = null, snapshotAt = 0, host = null;
  let view = null, status = null, mount = null, active = null, generation = 0;
  let mode = 'hidden', state = 'idle', reason = '', frames = 0, triangles = 0, modelReady = false, contextsCreated = 0;
  let burst = null, burstTimer = 0, frameTimer = 0, frameRAF = 0, refreshRAF = 0;
  let mutation = null, resize = null, intersection = null, drag = null;
  let yaw = -.55, pitch = -.08, lastDraw = 0, viewWidth = 0, viewHeight = 0, viewDPR = 0;
  const seen = new Set();
  const reducedQuery = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const isReduced = () => !!reducedQuery?.matches;
  const hostNow = () => { try { const h = getHost(); return h?.matches?.('.so-room-detail') && h !== doc?.body && h.isConnected ? h : null; } catch { return null; } };
  const visible = el => {
    if (!el?.isConnected || doc.hidden || el.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const css = win.getComputedStyle(node);
      if (css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse' || Number(css.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.top >= win.innerHeight || r.right <= 0 || r.left >= win.innerWidth) return false;
    // Respect scroll clipping: a hero scrolled outside its panel is not an active scene.
    for (let node = el.parentElement; node; node = node.parentElement) {
      const css = win.getComputedStyle(node);
      if (/(auto|scroll|hidden|clip)/.test(css.overflow + css.overflowX + css.overflowY)) {
        const clip = node.getBoundingClientRect();
        if (r.bottom <= clip.top || r.top >= clip.bottom || r.right <= clip.left || r.left >= clip.right) return false;
      }
      if (node === host) break;
    }
    return true;
  };
  function metrics() {
    return {modelReady, triangles, frames, disposed: destroyed, contexts: active?.renderer ? 1 : 0,
      mode, state, reason: reason || null, cannonId: snapshot?.id || null, contextsCreated,
      modelURL: MODEL, dedup: seen.size, reducedMotion: isReduced(), yaw, pitch,
      drawCalls: active?.renderer?.info?.render.calls || 0,
      memory: {geometries: active?.renderer?.info?.memory.geometries || 0, textures: active?.renderer?.info?.memory.textures || 0}};
  }
  function publish() {
    const data = {cannon3dState: state, cannon3dMode: mode, cannon3dModelReady: String(modelReady),
      cannon3dFrames: String(frames), cannon3dTriangles: String(triangles), cannon3dDisposed: String(destroyed),
      cannon3dContexts: String(active?.renderer ? 1 : 0), cannon3dReason: reason, cannon3dId: snapshot?.id || '',
      cannon3dYaw: yaw.toFixed(4), cannon3dPitch: pitch.toFixed(4)};
    for (const node of [view, active?.canvas, ...(host?.querySelectorAll(MOUNT) || [])].filter(Boolean)) {
      for (const [key, value] of Object.entries(data)) {
        if (key === 'cannon3dId' && node.matches?.(MOUNT)) continue;
        if (node.dataset[key] !== value) node.dataset[key] = value;
      }
      if (node.matches?.(MOUNT)) node.dataset.cannon3dActive = String(node === mount && mode !== 'hidden');
    }
    if (view) view.dataset.cannon3dKind = 'canvas-glb';
    if (status) {
      const text = state === 'unavailable' ? (reason === 'context-lost' ? `${UNAVAILABLE} — فُقد اتصال الرسوم` : UNAVAILABLE) : modelReady ? '' : state === 'loading' ? 'جارٍ تحميل المدفع ثلاثي الأبعاد…' : 'مدفع ثلاثي الأبعاد';
      if (status.textContent !== text) status.textContent = text;
      if (status.hidden !== modelReady) status.hidden = modelReady;
    }
    for (const node of host?.querySelectorAll(MOUNT) || []) {
      const note = node.querySelector(':scope > [data-cannon3d-placeholder]');
      if (!note) continue;
      if (note.hidden !== (node === mount)) note.hidden = node === mount;
      const text = state === 'unavailable' ? UNAVAILABLE : modelReady ? 'المدفع في العرض الموسّع' : 'جارٍ تحميل المدفع ثلاثي الأبعاد…';
      if (note.textContent !== text) note.textContent = text;
    }
  }
  function stopFrames() {
    clearTimeout(frameTimer); frameTimer = 0;
    if (frameRAF) win.cancelAnimationFrame(frameRAF); frameRAF = 0; lastDraw = 0; drag = null;
  }
  function disposeGPU() {
    stopFrames(); modelReady = false;
    const a = active; active = null; if (!a) return;
    a.abort.abort(); clearTimeout(a.deadline);
    for (const url of a.urls) URL.revokeObjectURL(url); a.urls.clear();
    if (a.canvas) {
      for (const [type, listener] of a.listeners) a.canvas.removeEventListener(type, listener);
      a.canvas.dataset.cannon3dDisposed = 'true'; a.canvas.dataset.cannon3dContexts = '0';
    }
    disposeModel(a.model); disposeModel(a.particles); a.environment?.dispose();
    for (const bitmap of a.bitmaps) bitmap.close?.(); a.bitmaps.clear();
    if (a.renderer) { a.renderer.renderLists?.dispose(); a.renderer.dispose(); a.renderer.forceContextLoss?.(); }
    a.canvas?.remove(); a.model = a.scene = a.renderer = a.camera = a.pivot = null;
  }
  function unavailable(a, why) {
    if (destroyed || active !== a) return;
    reason = why; state = 'unavailable'; disposeGPU(); publish();
  }
  function clearBurst(refresh = true) {
    clearTimeout(burstTimer); burstTimer = 0;
    burst?.node.remove(); burst = null;
    if (active?.particles) active.particles.visible = false;
    if (refresh && !destroyed) refreshView();
  }
  function makeView() {
    if (view) return;
    view = doc.createElement('span'); view.className = 'cannon3d-r29-view'; view.dataset.cannon3dView = '';
    status = doc.createElement('span'); status.className = 'cannon3d-r29-status'; status.dataset.cannon3dStatus = '';
    status.setAttribute('role', 'status'); view.append(status);
  }
  function cancelRefresh() { if (refreshRAF) win.cancelAnimationFrame(refreshRAF); refreshRAF = 0; }
  function scheduleRefresh() {
    if (destroyed || refreshRAF) return;
    refreshRAF = win.requestAnimationFrame(() => { refreshRAF = 0; refreshView(); });
  }
  function observeHost(next) {
    mutation?.disconnect(); resize?.disconnect(); intersection?.disconnect();
    mutation = resize = intersection = null; host = next;
    if (!host) return;
    if (win.MutationObserver) { mutation = new win.MutationObserver(scheduleRefresh); mutation.observe(host, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden','inert','aria-hidden','class','style']}); }
    if (win.ResizeObserver) resize = new win.ResizeObserver(scheduleRefresh);
    if (win.IntersectionObserver) intersection = new win.IntersectionObserver(scheduleRefresh, {threshold: [0, .05]});
  }
  function observeMounts() {
    resize?.disconnect(); intersection?.disconnect();
    for (const node of host?.querySelectorAll(MOUNT) || []) { resize?.observe(node); intersection?.observe(node); }
  }
  function refreshView() {
    if (destroyed) return;
    const nextHost = hostNow();
    if (nextHost !== host) { observeHost(nextHost); observeMounts(); }
    if (!scope || !host) {
      mode = 'hidden'; mount = null; stopFrames();
      if (!host && active && state === 'loading') { generation++; disposeGPU(); state = 'idle'; }
      publish(); return;
    }
    if (burst) {
      if (now() >= burst.until || doc.hidden || host.dataset.soSettingsOpen === 'true') clearBurst(false);
      else if (burst.node.parentNode !== host) host.append(burst.node);
    }
    const nodes = [...host.querySelectorAll(MOUNT)].filter(node => node.dataset.cannon3dId === snapshot.id);
    const next = ['explosion', 'hero', 'miniature'].map(value => nodes.find(node => node.dataset.cannon3dMount === value && visible(node))).find(Boolean) || null;
    const nextMode = next?.dataset.cannon3dMount || 'hidden';
    const changed = mount !== next || mode !== nextMode;
    if (changed) { stopFrames(); mount = next; mode = nextMode; viewWidth = viewHeight = viewDPR = 0; }
    if (!mount) { publish(); return; }
    makeView();
    if (view.parentNode !== mount) mount.append(view);
    if (active?.canvas) {
      active.canvas.tabIndex = mode === 'hero' ? 0 : -1;
      active.canvas.setAttribute('aria-label', mode === 'hero' ? `${LABEL} — اسحب للتدوير أو استخدم مفاتيح الأسهم` : LABEL);
    }
    publish();
    if (!active && state !== 'unavailable') void load();
    else if (active?.renderer && (modelReady || state === 'loaded')) {
      if (changed || isReduced() || !frameTimer && !frameRAF) draw(now());
    }
  }
  function fit(a) {
    const width = Math.min(900, Math.max(1, mount.clientWidth)), height = Math.min(650, Math.max(1, mount.clientHeight));
    const dpr = mode === 'miniature' ? 1 : Math.min(1.5, win.devicePixelRatio || 1);
    if (viewWidth === width && viewHeight === height && viewDPR === dpr) return;
    viewWidth = width; viewHeight = height; viewDPR = dpr;
    a.renderer.setPixelRatio(dpr); a.renderer.setSize(width, height, false);
    a.camera.aspect = width / height;
    const distance = a.radius / Math.sin(a.camera.fov * Math.PI / 360) / Math.min(1, a.camera.aspect) * 1.12;
    a.camera.position.set(0, distance * .1, distance); a.camera.lookAt(0, 0, 0); a.camera.updateProjectionMatrix();
  }
  function queueFrame() {
    if (destroyed || mode === 'hidden' || isReduced() || frameTimer || frameRAF) return;
    frameTimer = setTimeout(() => { frameTimer = 0; frameRAF = win.requestAnimationFrame(time => { frameRAF = 0; draw(time); }); }, mode === 'miniature' ? 1000 / 12 : 1000 / 30);
  }
  function draw(time) {
    const a = active;
    if (destroyed || !a?.renderer || !mount || hostNow() !== host || !visible(mount)) { stopFrames(); scheduleRefresh(); return; }
    try {
      fit(a);
      const dt = lastDraw ? Math.min(.1, (time - lastDraw) / 1000) : 0; lastDraw = time;
      if (!isReduced() && mode === 'miniature') yaw += dt * .18;
      const progress = burst ? Math.min(1, Math.max(0, (now() - burst.start) / (burst.until - burst.start))) : 1;
      a.pivot.rotation.set(pitch, yaw, 0);
      const recoil = mode === 'explosion' && !isReduced() ? Math.sin(Math.min(1, progress * 6) * Math.PI) * .12 : 0;
      a.pivot.position.set(0, 0, -recoil);
      a.particles.visible = mode === 'explosion' && !!burst && !isReduced() && progress < .7;
      if (a.particles.visible) {
        const positions = a.particles.geometry.attributes.position;
        for (let i = 0; i < 36; i++) {
          const angle = i * 2.399963, radius = .3 + progress * (1 + i % 5 * .12);
          positions.setXYZ(i, Math.cos(angle) * radius, Math.sin(angle) * radius - progress * progress * .8, .35 + Math.sin(i * 1.7) * progress);
        }
        positions.needsUpdate = true; a.particles.material.opacity = Math.max(0, 1 - progress / .7);
      }
      a.renderer.render(a.scene, a.camera);
      if (!a.renderer.info.render.triangles || !a.renderer.info.render.calls) throw Error('no-mesh-draw');
      const firstReady = !modelReady;
      frames++; triangles = a.renderer.info.render.triangles; modelReady = true; state = 'ready'; reason = '';
      if (firstReady || frames % 6 === 0 || isReduced() || drag) publish();
      queueFrame();
    } catch (error) { unavailable(a, error?.message || 'render-error'); }
  }
  function addInteractions(a) {
    const listen = (type, fn) => { a.canvas.addEventListener(type, fn); a.listeners.push([type, fn]); };
    listen('webglcontextlost', event => { event.preventDefault(); unavailable(a, 'context-lost'); });
    listen('pointerdown', event => {
      if (mode !== 'hero' || !modelReady || event.button !== 0 || !visible(mount)) return;
      event.preventDefault(); event.stopPropagation(); drag = {id: event.pointerId, x: event.clientX, y: event.clientY};
      a.canvas.setPointerCapture?.(event.pointerId);
    });
    listen('pointermove', event => {
      if (!drag || drag.id !== event.pointerId || mode !== 'hero') return;
      yaw += (event.clientX - drag.x) * .012; pitch = Math.max(-.6, Math.min(.4, pitch + (event.clientY - drag.y) * .008));
      drag.x = event.clientX; drag.y = event.clientY; event.preventDefault();
      if (isReduced()) draw(now()); else publish();
    });
    const release = event => { if (drag?.id === event.pointerId) { drag = null; if (a.canvas.hasPointerCapture?.(event.pointerId)) a.canvas.releasePointerCapture(event.pointerId); publish(); } };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(type, release);
    listen('keydown', event => {
      if (mode !== 'hero' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (event.key === 'Home') { yaw = -.55; pitch = -.08; }
      else if (event.key === 'ArrowLeft') yaw -= .18;
      else if (event.key === 'ArrowRight') yaw += .18;
      else pitch = Math.max(-.6, Math.min(.4, pitch + (event.key === 'ArrowUp' ? -.1 : .1)));
      publish(); if (isReduced()) draw(now());
    });
  }
  async function load() {
    if (destroyed || active || !mount || !host) return;
    const a = {generation: ++generation, abort: new AbortController(), renderer: null, canvas: null, model: null,
      listeners: [], bitmaps: new Set(), urls: new Set(), deadline: 0};
    active = a; state = 'loading'; reason = ''; publish();
    const alive = () => !destroyed && active === a && a.generation === generation && !a.abort.signal.aborted;
    a.deadline = setTimeout(() => unavailable(a, 'load-timeout'), 9000);
    let parsed = null;
    try {
      const {THREE: T, GLTFLoader, RoomEnvironment} = await import('/vendor/gift3d-three.mjs');
      if (!alive()) return;
      if (!T?.WebGLRenderer || !GLTFLoader || typeof win.createImageBitmap !== 'function') throw Error('webgl-or-texture-decoder-unavailable');
      const buffer = await readBuffer(await fetch(MODEL, {signal: a.abort.signal, credentials: 'same-origin', redirect: 'error'}), a.abort.signal);
      if (!alive()) return;
      const json = inspectGLB(buffer), manager = new T.LoadingManager();
      manager.setURLModifier(url => { if (/^(blob:|data:image\/(?:png|jpeg|webp);base64,)/.test(url)) return url; throw Error('external-glb-resource'); });
      const loader = new GLTFLoader(manager);
      // Force fetch(blob) + ImageBitmap even on browsers whose default GLTF loader
      // selects HTMLImageElement. No img-src relaxation, eval, remote decoder or unsafe fallback.
      loader.register(parser => {
        parser.textureLoader = {isImageBitmapLoader: true, load(url, onLoad, _progress, onError) {
          void (async () => {
            let bitmap;
            try {
              url = manager.resolveURL(url); if (url.startsWith('blob:')) a.urls.add(url);
              const response = await fetch(url, {signal: a.abort.signal}); if (!response.ok) throw Error('texture-load-error');
              const blob = await response.blob();
              if (url.startsWith('blob:')) { URL.revokeObjectURL(url); a.urls.delete(url); }
              if (!alive()) throw Error('aborted');
              bitmap = await win.createImageBitmap(blob, {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
              if (!alive()) { bitmap.close(); throw Error('aborted'); }
              a.bitmaps.add(bitmap); onLoad(bitmap);
            } catch (error) {
              if (url.startsWith('blob:')) { URL.revokeObjectURL(url); a.urls.delete(url); }
              onError?.(error);
            }
          })();
        }};
        return {name: 'CANNON_R29_INLINE_TEXTURES'};
      });
      parsed = await new Promise((resolve, reject) => loader.parse(buffer, '', resolve, reject));
      if (!alive()) { disposeModel(parsed.scene); return; }
      a.model = parsed.scene;
      let vertices = 0, meshes = 0; const textures = new Set(), sources = new Map();
      a.model.traverse(node => {
        if (node.isMesh) { meshes++; vertices += node.geometry?.attributes?.position?.count || 0; }
        for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : [])
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      });
      if (!meshes || meshes > 96 || vertices > 250000 || json.images?.length && (a.bitmaps.size < json.images.length || textures.size < json.images.length)) throw Error('model-or-texture-budget');
      for (const texture of textures) {
        const source = texture.source?.data || texture.image;
        if (!source?.width || !source.height || Math.max(source.width, source.height) > 4096) throw Error('texture-budget');
        if (!sources.has(source)) {
          if (Math.max(source.width, source.height) > 1024) {
            const resized = doc.createElement('canvas'), ratio = 1024 / Math.max(source.width, source.height);
            resized.width = Math.round(source.width * ratio); resized.height = Math.round(source.height * ratio);
            const ctx = resized.getContext('2d'); if (!ctx) throw Error('texture-resize-unavailable');
            ctx.drawImage(source, 0, 0, resized.width, resized.height); sources.set(source, resized);
          } else sources.set(source, source);
        }
        texture.image = sources.get(source); texture.anisotropy = 1; texture.needsUpdate = true;
      }
      for (const [source, resized] of sources) if (source !== resized) { source.close?.(); a.bitmaps.delete(source); }
      if ([...sources.values()].reduce((sum, source) => sum + source.width * source.height * 4 * 1.34, 0) > 24 * 1024 * 1024) throw Error('texture-budget');
      const box = new T.Box3().setFromObject(a.model), size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
      const span = Math.max(size.x, size.y, size.z); if (!Number.isFinite(span) || span <= 0) throw Error('invalid-model-bounds');
      const centered = new T.Group(); centered.position.copy(center).multiplyScalar(-1); centered.add(a.model);
      const normalized = new T.Group(); normalized.scale.setScalar(2 / span); normalized.add(centered);
      a.pivot = new T.Group(); a.pivot.add(normalized); a.radius = size.length() / span;
      a.scene = new T.Scene(); a.scene.add(a.pivot);
      a.scene.add(new T.HemisphereLight(0xfff3d8, 0x39334f, 2));
      for (const [color, intensity, position] of [[0xffedd0, 3.2, [3,4,5]], [0xe5bd79, 2.2, [-3,2,-2]], [0xcbdcff, 1.8, [1,2,-4]]]) {
        const light = new T.DirectionalLight(color, intensity); light.position.set(...position); a.scene.add(light);
      }
      const particleGeometry = new T.BufferGeometry(); particleGeometry.setAttribute('position', new T.BufferAttribute(new Float32Array(36 * 3), 3));
      a.particles = new T.Points(particleGeometry, new T.PointsMaterial({color: 0xffd17b, size: .065, transparent: true, opacity: 0, depthWrite: false}));
      a.particles.visible = false; a.particles.frustumCulled = false; a.scene.add(a.particles);
      if (!alive() || !hostNow()) throw Error('aborted');
      try { a.renderer = new T.WebGLRenderer({alpha: true, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: false, stencil: false}); }
      catch { throw Error('webgl-unavailable'); }
      contextsCreated++; a.canvas = a.renderer.domElement; a.canvas.className = 'cannon3d-r29-canvas'; a.canvas.dataset.cannon3dCanvas = '';
      a.canvas.setAttribute('role', 'img'); a.canvas.setAttribute('aria-label', LABEL);
      a.renderer.setClearColor(0, 0); a.renderer.outputColorSpace = T.SRGBColorSpace;
      a.renderer.toneMapping = T.ACESFilmicToneMapping; a.renderer.toneMappingExposure = 1.1;
      addInteractions(a);
      if (RoomEnvironment && T.PMREMGenerator) {
        const environment = new RoomEnvironment(), pmrem = new T.PMREMGenerator(a.renderer);
        try { a.environment = pmrem.fromScene(environment, .04, .1, 100, {size: 64}); a.scene.environment = a.environment.texture; }
        finally { environment.dispose(); pmrem.dispose(); }
      }
      a.camera = new T.PerspectiveCamera(35, 1, .05, 100);
      makeView(); view.prepend(a.canvas); clearTimeout(a.deadline); a.deadline = 0;
      // First actual triangle draw, not parse completion, establishes modelReady.
      modelReady = false; state = 'loaded'; refreshView();
    } catch (error) {
      if (alive()) unavailable(a, error?.message || 'model-load-error');
      else if (parsed?.scene && parsed.scene !== a.model) disposeModel(parsed.scene);
    }
  }
  function restore(model) {
    if (destroyed) return false;
    const nextScope = identity(model);
    if (nextScope !== scope) {
      generation++; clearBurst(false); disposeGPU(); seen.clear(); view?.remove(); view = status = mount = null;
      scope = nextScope; state = 'idle'; reason = ''; triangles = 0; yaw = -.55; pitch = -.08;
    }
    if (nextScope) {
      // Snapshot only confirmation fields; no mutable financial state is rendered here.
      if (!snapshot || snapshot.id !== model.id || snapshot.serverNow !== model.serverNow) snapshotAt = now();
      snapshot = {id: model.id, owner: {...model.owner}, serverNow: model.serverNow, stages: model.stages.map(stage => ({...stage,
        reward: receipt(stage.reward) ? {addedItems: [...stage.reward.addedItems], alreadyOwned: [...stage.reward.alreadyOwned]} : null}))};
    } else snapshot = null;
    const nextHost = hostNow(); if (nextHost !== host) observeHost(nextHost);
    observeMounts(); refreshView(); return !!nextScope;
  }
  function receive(event, model) {
    if (destroyed || !identity(model) || scope && identity(model) !== scope) return false;
    if (!event || event.kind !== 'cannon-explosion' || event.cannonId !== model.id || typeof event.id !== 'string'
      || !event.id || event.id.length > 256 || seen.has(event.id) || !Number.isInteger(event.stage) || event.stage < 1 || event.stage > 3
      || !Number.isFinite(event.occurredAt) || event.occurredAt <= 0 || !Number.isFinite(model.serverNow)) return false;
    const stage = model.stages.find(item => item.stage === event.stage);
    const clock = scope && snapshot?.serverNow === model.serverNow ? model.serverNow + Math.max(0, now() - snapshotAt) : model.serverNow;
    if (Math.abs(clock - event.occurredAt) > 20000 || stage?.id !== event.id || stage.status !== 'awarded'
      || stage.completedAt !== event.occurredAt || !sameReceipt(stage.reward, event.reward)
      || !model.owner?.id || event.owner?.id !== model.owner.id) return false;
    const h = hostNow();
    if (!h || doc.hidden || h.dataset.soSettingsOpen === 'true' || !visible(h)) return false;
    restore(model); clearBurst(false);
    seen.add(event.id); while (seen.size > 64) seen.delete(seen.values().next().value);
    const node = doc.createElement('section'); node.className = 'so-cannon-explosion cannon3d-r29-explosion';
    node.dataset.soCannonExplosion = event.id; node.setAttribute('role', 'status');
    const target = doc.createElement('span'); target.className = 'cannon3d-r29-mount';
    target.dataset.cannon3dMount = 'explosion'; target.dataset.cannon3dId = model.id;
    const placeholder = doc.createElement('span'); placeholder.dataset.cannon3dPlaceholder = ''; placeholder.textContent = 'جارٍ تحميل المدفع ثلاثي الأبعاد…'; target.append(placeholder);
    const title = doc.createElement('b'); title.textContent = `اكتمل مدفع المستوى ${event.stage}`;
    const detail = doc.createElement('span'); detail.textContent = `تم تأكيد جوائز ${String(model.owner.name || 'صاحب البث').slice(0, 160)}`;
    node.append(target, title, detail); h.append(node);
    const start = now(), duration = isReduced() ? 1500 : 3600;
    burst = {node, start, until: start + duration}; burstTimer = setTimeout(() => clearBurst(), duration);
    observeMounts(); refreshView(); return true;
  }
  function visibilityChanged() { if (doc.hidden) { clearBurst(false); stopFrames(); cancelRefresh(); mode = 'hidden'; publish(); } else refreshView(); }
  function motionChanged() { stopFrames(); refreshView(); }
  doc?.addEventListener('visibilitychange', visibilityChanged);
  doc?.addEventListener('scroll', scheduleRefresh, {capture: true, passive: true});
  win.addEventListener('resize', scheduleRefresh, {passive: true});
  reducedQuery?.addEventListener?.('change', motionChanged);
  function destroy() {
    if (destroyed) return;
    destroyed = true; generation++; clearBurst(false); cancelRefresh(); disposeGPU();
    mutation?.disconnect(); resize?.disconnect(); intersection?.disconnect(); mutation = resize = intersection = null;
    doc?.removeEventListener('visibilitychange', visibilityChanged); doc?.removeEventListener('scroll', scheduleRefresh, true);
    win.removeEventListener('resize', scheduleRefresh); reducedQuery?.removeEventListener?.('change', motionChanged);
    mode = 'hidden'; state = 'destroyed'; reason = 'destroy'; publish(); view?.remove();
    view = status = mount = null; host = null; snapshot = null; scope = null; seen.clear();
  }
  return {restore, receive, destroy, metrics};
}
