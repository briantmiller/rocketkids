// Mission-control voice. Every line is a pre-recorded clip (voice/<id>.mp3) made with a
// natural neural voice, so it sounds the same on every iPad and works offline.
// If a clip is missing, we fall back to the device's built-in speech.
import { audioCtx, voiceOut, duckMusic } from './audio.js';

export const voice = { on: true };

let index = null;                 // Set of clip ids that exist
const bufs = new Map();           // id -> Promise<AudioBuffer|null>
let queue = [], current = null, token = 0;
let lastText = '', lastTime = 0;

fetch('voice/index.json').then(r => r.json()).then(a => { index = new Set(a); }).catch(() => { index = new Set(); });

// FNV-1a hash of the text -> clip file name (must match tools/build_voice.py).
export function clipId(text) {
  const bytes = new TextEncoder().encode(text.trim().replace(/\s+/g, ' '));
  let hsh = 0x811c9dc5;
  for (const b of bytes) { hsh ^= b; hsh = Math.imul(hsh, 0x01000193) >>> 0; }
  return hsh.toString(16).padStart(8, '0');
}

function loadClip(id) {
  if (!bufs.has(id)) {
    const ctx = audioCtx();
    bufs.set(id, fetch(`voice/${id}.mp3`).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .catch(() => { bufs.delete(id); return null; }));
  }
  return bufs.get(id);
}

function deviceSpeak(text, done) {
  try {
    if (!('speechSynthesis' in window)) return done();
    const u = new SpeechSynthesisUtterance(text);
    const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith('en'));
    const pick = vs.find(v => /Premium|Enhanced/.test(v.name)) || vs.find(v => /Samantha|Ava|Zoe|Karen/.test(v.name)) || vs[0];
    if (pick) u.voice = pick;
    u.lang = 'en-US'; u.rate = 0.95; u.pitch = 1.1;
    u.onend = u.onerror = done;
    speechSynthesis.speak(u);
  } catch (e) { done(); }
}

async function pump() {
  if (current || !queue.length) { if (!current && !queue.length) duckMusic(false); return; }
  const text = queue.shift();
  const my = ++token;
  current = { text, src: null };
  duckMusic(true);
  const finish = () => { if (token === my) { current = null; pump(); } };
  const ctx = audioCtx();
  const id = clipId(text);
  if (ctx && index && index.has(id)) {
    try { if (ctx.state !== 'running') await ctx.resume(); } catch (e) {}
    const buf = await loadClip(id);
    if (token !== my) return;           // interrupted while loading
    if (buf && ctx.state === 'running') {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(voiceOut());
      src.onended = finish;
      current.src = src;
      src.start();
      return;
    }
  }
  if (token !== my) return;
  current.device = true;
  deviceSpeak(text, finish);
}

function stopCurrent() {
  token++;
  if (current) {
    try { if (current.src) { current.src.onended = null; current.src.stop(); } } catch (e) {}
    try { if (current.device) speechSynthesis.cancel(); } catch (e) {}
  }
  current = null;
}

// say('text') or say(['one', 'two']) to speak lines back to back.
// interrupt=true (default) cuts off whatever is being said.
export function say(text, { interrupt = true } = {}) {
  const items = (Array.isArray(text) ? text : [text]).filter(Boolean);
  if (!items.length) return;
  if (index) for (const t of items) if (!index.has(clipId(t))) (window.__voiceMiss = window.__voiceMiss || new Set()).add(t);
  if (!voice.on) return;
  const key = items.join('|'), now = performance.now();
  if (key === lastText && now - lastTime < 1500) return; // avoid stutter on repeated taps
  lastText = key; lastTime = now;
  if (interrupt) { stopCurrent(); queue = []; }
  queue.push(...items);
  pump();
}
export function hush() { queue = []; stopCurrent(); duckMusic(false); }
export function speaking() { return !!current || queue.length > 0; }
