// R69ze: تنقية صوت المايك — تشتغل على جوال اللاعب نفسه (بدون ما تتعب السيرفر):
// فلتر يشيل الطنين والهمهمة (تكييف، سيارات)، وفلتر للصفير الحاد، وضاغط يوزن الصوت، و«بوابة» تسكّت المايك
// لما ما فيه كلام (عشان ضجة الخلفية ما توصل للغرفة). وفوقها تنقية المتصفح الأصلية + عزل الصوت لو الجوال يدعمه.
const KEY = 'la3_clean_mic';
export const cleanMicEnabled = () => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } };
export const setCleanMic = (on) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* */ } };
/** قيود المايك الأقوى اللي يدعمها المتصفح */
export function micConstraints() {
  const c = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
  try { const s = navigator.mediaDevices?.getSupportedConstraints?.() || {}; if (s.voiceIsolation) c.voiceIsolation = true; } catch { /* */ }
  return c;
}
export function createCleanProcessor() {
  let ctx = null, own = false, nodes = [], timer = 0;
  const proc = {
    name: 'la3-clean-mic',
    processedTrack: undefined,
    async init(opts) {
      ctx = opts.audioContext; if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); own = true; }
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      const src = ctx.createMediaStreamSource(new MediaStream([opts.track]));
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90; hp.Q.value = 0.7;        // طنين وهمهمة
      const hum = ctx.createBiquadFilter(); hum.type = 'notch'; hum.frequency.value = 50; hum.Q.value = 8;          // كهربا 50 هرتز
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.7;      // صفير حاد
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -26; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.2;
      const gate = ctx.createGain(); gate.gain.value = 1;
      const an = ctx.createAnalyser(); an.fftSize = 1024;
      const dest = ctx.createMediaStreamDestination();
      src.connect(hp); hp.connect(hum); hum.connect(lp); lp.connect(comp); comp.connect(gate); gate.connect(dest); lp.connect(an);
      nodes = [src, hp, hum, lp, comp, gate, an, dest];
      // البوابة: نقيس قوة الصوت كل 20ms. فوق حد الكلام → مفتوح، تحته لفترة → نخفضه بهدوء
      const buf = new Float32Array(an.fftSize); let floor = 0.004, open = true, quiet = 0;
      timer = setInterval(() => {
        an.getFloatTimeDomainData(buf); let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        if (rms < floor * 2.5) floor = floor * 0.995 + rms * 0.005; // نتعلم مستوى الضجة بالخلفية
        const th = Math.max(0.006, floor * 3.2);
        if (rms > th) { quiet = 0; if (!open) { open = true; gate.gain.setTargetAtTime(1, ctx.currentTime, 0.01); } }
        else if (open && ++quiet > 12) { open = false; gate.gain.setTargetAtTime(0.06, ctx.currentTime, 0.08); }
      }, 20);
      proc.processedTrack = dest.stream.getAudioTracks()[0];
    },
    async restart(opts) { await proc.destroy(); await proc.init(opts); },
    async destroy() { clearInterval(timer); for (const n of nodes) { try { n.disconnect(); } catch { /* */ } } nodes = []; proc.processedTrack?.stop?.(); proc.processedTrack = undefined; if (own && ctx) { await ctx.close().catch(() => {}); } ctx = null; },
  };
  return proc;
}
