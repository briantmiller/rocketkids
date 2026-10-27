// Friendly mission-control voice using the iPad's built-in speech.
export const voice = { on: true };
let chosen = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices();
  if (!vs.length) return null;
  const prefs = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny'];
  for (const p of prefs) {
    const v = vs.find(v => v.name.includes(p) && v.lang.startsWith('en'));
    if (v) return v;
  }
  return vs.find(v => v.lang === 'en-US' && v.localService) || vs.find(v => v.lang.startsWith('en')) || null;
}
if ('speechSynthesis' in window) {
  chosen = pickVoice();
  speechSynthesis.onvoiceschanged = () => { chosen = pickVoice(); };
}

let lastText = '', lastTime = 0;
// say(text, {interrupt}) — interrupt=true cancels anything being spoken.
export function say(text, { interrupt = true, rate = 0.95, pitch = 1.15 } = {}) {
  if (!voice.on || !('speechSynthesis' in window) || !text) return;
  const now = performance.now();
  if (text === lastText && now - lastTime < 1500) return; // avoid stutter on repeated taps
  lastText = text; lastTime = now;
  try {
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (!chosen) chosen = pickVoice();
    if (chosen) u.voice = chosen;
    u.lang = 'en-US'; u.rate = rate; u.pitch = pitch;
    speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}
export function hush() { try { speechSynthesis.cancel(); } catch (e) {} }
export function speaking() { try { return speechSynthesis.speaking; } catch (e) { return false; } }
