// 音效（WebAudio 合成，无需素材）、彩纸、朗读。

let ctx = null;
let enabled = true;

export function setSound(on) { enabled = on; }

// iOS 只允许在用户手势里启动音频，首次点击时调用。
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  ctx?.resume?.();
}

function tone(freq, { at = 0, dur = 0.12, type = 'sine', gain = 0.18 } = {}) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// 五声音阶：连击越高音越高，打得越顺越好听。
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

export const sfx = {
  syllable(combo) { tone(PENTA[Math.min(combo, PENTA.length) - 1] ?? PENTA[0], { dur: 0.1, gain: 0.12 }); },
  word(combo) {
    const base = Math.min(Math.max(combo - 1, 0), PENTA.length - 3);
    tone(PENTA[base], { dur: 0.1 });
    tone(PENTA[base + 2], { at: 0.08, dur: 0.18 });
  },
  wrong() { tone(196, { type: 'triangle', dur: 0.16, gain: 0.2 }); },
  milestone() { [0, 2, 4, 5].forEach((n, i) => tone(PENTA[n + 2], { at: i * 0.07, dur: 0.16, type: 'triangle' })); },
  finish(stars) {
    const notes = stars >= 3 ? [0, 2, 4, 5, 7, 9] : stars > 0 ? [0, 2, 4, 5] : [4, 2, 0];
    notes.forEach((n, i) => tone(PENTA[n], { at: i * 0.11, dur: 0.22, type: 'triangle', gain: 0.16 }));
  },
};

export function vibrate(ms) { navigator.vibrate?.(ms); }

// iOS 自带粤语语音（zh-HK），没有就静默。
export function speak(text) {
  if (!('speechSynthesis' in window)) return false;
  const voices = speechSynthesis.getVoices();
  const voice = voices.find((v) => /zh[-_]HK|yue/i.test(v.lang)) ?? null;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-HK';
  if (voice) u.voice = voice;
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}

export function confetti(amount = 120) {
  const canvas = document.getElementById('confetti');
  if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  const c = canvas.getContext('2d');
  c.scale(dpr, dpr);
  const colors = ['#0a7a4a', '#d33a2c', '#f2b01e', '#2fbf7b', '#ffffff'];
  const parts = Array.from({ length: amount }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 13 - 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    color: colors[(Math.random() * colors.length) | 0],
  }));
  const start = performance.now();
  (function frame(now) {
    c.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.r);
      c.fillStyle = p.color;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    }
    if (now - start < 2600) requestAnimationFrame(frame);
    else c.clearRect(0, 0, innerWidth, innerHeight);
  })(start);
}
