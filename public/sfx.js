/* مؤثرات صوتية بسيطة عبر WebAudio (بدون ملفات). تُحفظ حالة الكتم على الجهاز. */
const KEY = 'qa_sound_v1';
let ctx = null;
let on = true;
try { on = localStorage.getItem(KEY) !== 'off'; } catch { /* ignore */ }

export const isOn = () => on;
export function setOn(v) {
  on = !!v;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  if (on) play('tap');
}

function tone(freq, start, dur, type = 'sine', vol = 0.06) {
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  tap: () => tone(620, 0, 0.06, 'triangle', 0.035),
  ok: () => { tone(660, 0, 0.12); tone(880, 0.1, 0.18); },
  bad: () => { tone(220, 0, 0.18, 'sawtooth', 0.04); tone(165, 0.14, 0.24, 'sawtooth', 0.04); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle', 0.07)),
  lose: () => [392, 349, 311].forEach((f, i) => tone(f, i * 0.16, 0.26, 'sine', 0.05)),
};

export function play(name) {
  if (!on) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    SOUNDS[name]?.();
  } catch { /* الصوت غير مدعوم */ }
}

/* قراءة السؤال بصوت (للصغار اللي ما يقرون). تعتمد على صوت عربي موجود بجهازك. */
export const canSpeak = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined' && speechSynthesis.getVoices().some((v) => v.lang?.toLowerCase().startsWith('ar'));
export function speak(text) {
  if (!canSpeak()) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    u.rate = 0.9;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices();
