// Synthesized sound effects (no audio files needed, works offline).
let ctx = null, master = null, noiseBuf = null, engine = null, voiceBus = null, musicBus = null;
export const sound = { on: true };

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      voiceBus = ctx.createGain(); voiceBus.gain.value = 1.0; voiceBus.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(ctx.destination);
      // Keep playing even if the iPad's mute switch is on (Safari 16.4+).
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state !== 'running') ctx.resume();
    if (music.on && !musicTimer) startMusic();
  } catch (e) { /* audio is optional */ }
}
export function audioCtx() { return ctx; }
export function voiceOut() { return voiceBus; }

// ---------- gentle background music (synthesized) ----------
export const music = { on: true };
let musicTimer = null, nextNote = 0, step = 0, ducked = false;
const CHORDS = [
  [261.6, 329.6, 392.0, 523.3], // C
  [220.0, 261.6, 329.6, 440.0], // Am
  [174.6, 220.0, 261.6, 349.2], // F
  [196.0, 246.9, 293.7, 392.0], // G
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 1];
const TUNE = [523.3, 0, 659.3, 0, 784.0, 0, 659.3, 587.3, 523.3, 0, 440.0, 0, 523.3, 0, 0, 0, 440.0, 0, 523.3, 0, 587.3, 0, 523.3, 440.0, 392.0, 0, 493.9, 0, 587.3, 0, 0, 0];
function mNote(freq, t, dur, vol, type) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(musicBus);
  o.start(t); o.stop(t + dur + 0.05);
}
function musicLevel() { return !music.on ? 0 : ducked ? 0.3 : 1; }
function schedule() {
  if (!ctx || ctx.state !== 'running' || !music.on) return;
  const beat = 60 / 104 / 2; // eighth notes
  if (nextNote < ctx.currentTime) nextNote = ctx.currentTime + 0.05;
  while (nextNote < ctx.currentTime + 0.35) {
    const bar = Math.floor(step / 8) % 8, chord = CHORDS[Math.floor(bar / 2) % 4], i = step % 8;
    mNote(chord[ARP[i]], nextNote, beat * 1.8, 0.035, 'triangle');
    if (i === 0) mNote(chord[0] / 2, nextNote, beat * 7, 0.06, 'sine');
    const mel = TUNE[step % 32];
    if (mel && bar >= 2) mNote(mel * 2, nextNote, beat * 2.5, 0.022, 'sine');
    nextNote += beat; step++;
  }
}
function startMusic() {
  if (!ctx || musicTimer) return;
  musicBus.gain.setTargetAtTime(musicLevel(), ctx.currentTime, 0.5);
  musicTimer = setInterval(schedule, 100);
}
export function setMusic(on) {
  music.on = on;
  if (!ctx) return;
  musicBus.gain.setTargetAtTime(musicLevel(), ctx.currentTime, 0.2);
  if (on && !musicTimer) startMusic();
  if (!on && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}
// Turn the music down while the voice is talking.
export function duckMusic(on) {
  ducked = on;
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(musicLevel(), ctx.currentTime, on ? 0.08 : 0.6);
}
export function pauseAudio(hidden) {
  if (!ctx) return;
  try { if (hidden) ctx.suspend(); else ctx.resume(); } catch (e) {}
}

function ok() { return sound.on && ctx && ctx.state === 'running'; }

function tone(freq, dur, { type = 'sine', vol = 0.25, slide = 0, delay = 0, attack = 0.01 } = {}) {
  if (!ok()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.3, freq = 1000, q = 1, type = 'lowpass', sweep = 0, delay = 0 } = {}) {
  if (!ok()) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t); s.stop(t + dur + 0.05);
}

export const sfx = {
  tap() { tone(660, 0.08, { type: 'triangle', vol: 0.18 }); },
  pick() { tone(520, 0.08, { type: 'triangle', vol: 0.2 }); tone(780, 0.12, { type: 'triangle', vol: 0.2, delay: 0.07 }); },
  locked() { tone(220, 0.15, { type: 'square', vol: 0.08 }); tone(180, 0.2, { type: 'square', vol: 0.08, delay: 0.12 }); },
  pop() { tone(300, 0.12, { type: 'sine', vol: 0.35, slide: 500 }); },
  remove() { tone(500, 0.15, { type: 'sine', vol: 0.3, slide: -350 }); noise(0.15, { vol: 0.15, freq: 2000 }); },
  clunk() { noise(0.18, { vol: 0.5, freq: 700 }); tone(120, 0.2, { type: 'square', vol: 0.12, slide: -60 }); },
  whoosh() { noise(0.6, { vol: 0.35, freq: 400, sweep: 2500, type: 'bandpass', q: 0.8 }); },
  chute() { noise(0.45, { vol: 0.35, freq: 300, sweep: 900, type: 'bandpass', q: 1.5 }); tone(200, 0.3, { vol: 0.15, slide: 120 }); },
  splash() { noise(1.0, { vol: 0.5, freq: 2500, sweep: -2000 }); noise(0.5, { vol: 0.3, freq: 600, delay: 0.1 }); },
  thud() { tone(90, 0.25, { vol: 0.45, slide: -40 }); noise(0.2, { vol: 0.3, freq: 400 }); },
  boing() { tone(180, 0.4, { type: 'sine', vol: 0.35, slide: 420 }); tone(360, 0.3, { type: 'triangle', vol: 0.12, slide: -200, delay: 0.15 }); },
  star() { [880, 1175, 1568].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.16, delay: i * 0.05 })); },
  chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.2, delay: i * 0.12 })); },
  fanfare() { [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'square', vol: 0.08, delay: i * 0.13 })); [262, 330, 392].forEach((f, i) => tone(f, 1.0, { type: 'triangle', vol: 0.12, delay: 0.8 + i * 0.02 })); },
  oops() { tone(440, 0.25, { type: 'triangle', vol: 0.2, slide: -120 }); tone(330, 0.4, { type: 'triangle', vol: 0.2, slide: -120, delay: 0.25 }); },
  boom() {
    noise(1.8, { vol: 0.9, freq: 1200, sweep: -1100 });
    tone(70, 1.2, { type: 'sine', vol: 0.6, slide: -40 });
    noise(0.4, { vol: 0.5, freq: 4000, type: 'highpass', delay: 0.05 });
    [0.35, 0.6, 0.85].forEach(d => tone(400 + Math.random() * 600, 0.15, { type: 'triangle', vol: 0.1, slide: 600, delay: d }));
  },
  giggle() { [700, 900, 760, 980, 820].forEach((f, i) => tone(f, 0.09, { type: 'sine', vol: 0.18, slide: 120, delay: i * 0.08 })); },
  bonk() { tone(160, 0.18, { type: 'square', vol: 0.12, slide: -80 }); noise(0.12, { vol: 0.3, freq: 500 }); },
  jump() { tone(260, 0.22, { type: 'sine', vol: 0.25, slide: 380 }); },
  gem() { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.14, delay: i * 0.04 })); },
  shield() { tone(440, 0.3, { type: 'sine', vol: 0.2, slide: 440 }); tone(660, 0.3, { type: 'sine', vol: 0.15, slide: 440, delay: 0.1 }); },
  click() { tone(1200, 0.05, { type: 'square', vol: 0.08 }); },
  camera() { noise(0.08, { vol: 0.4, freq: 5000, type: 'highpass' }); tone(1500, 0.05, { type: 'square', vol: 0.05, delay: 0.08 }); },
  beep() { tone(990, 0.12, { type: 'square', vol: 0.07 }); tone(1320, 0.12, { type: 'square', vol: 0.07, delay: 0.18 }); },
  count(n) { tone(n === 0 ? 880 : 440, n === 0 ? 0.5 : 0.18, { type: 'square', vol: 0.09 }); },
  dock() { tone(300, 0.1, { type: 'square', vol: 0.12 }); noise(0.1, { vol: 0.3, freq: 1500, delay: 0.02 }); tone(600, 0.3, { type: 'triangle', vol: 0.18, delay: 0.15 }); },
};

// Continuous engine rumble controlled by level 0..1
export function setEngine(level) {
  if (!ctx) return;
  if (!engine) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(master); s.start();
    engine = { s, f, g };
  }
  const v = sound.on ? level : 0;
  const t = ctx.currentTime;
  engine.g.gain.setTargetAtTime(v * 0.55, t, 0.08);
  engine.f.frequency.setTargetAtTime(220 + v * 500, t, 0.1);
}
