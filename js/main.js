// RocketKids — app shell, render loop and screen router.
import { state, load, save, reset } from './state.js';
import { sound, sfx, unlockAudio, setEngine } from './audio.js';
import { voice, say, hush } from './voice.js';
import { h, btn, modal, onTap } from './ui.js';
import { titleScreen } from './screens/title.js';
import { mapScreen } from './screens/map.js';
import { hangarScreen } from './screens/hangar.js';
import { flightScreen } from './screens/flight.js';

load();
sound.on = state.settings.sound;
voice.on = state.settings.voice;

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
export const app = { canvas, ctx, W: 0, H: 0, dpr: 1, t: 0, scene: null, screens: {} };

function resize() {
  app.dpr = Math.min(2, window.devicePixelRatio || 1);
  app.W = window.innerWidth; app.H = window.innerHeight;
  canvas.width = Math.round(app.W * app.dpr); canvas.height = Math.round(app.H * app.dpr);
  if (app.scene && app.scene.resize) app.scene.resize();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

const SCREENS = { title: titleScreen, map: mapScreen, hangar: hangarScreen, flight: flightScreen };
export function go(name, params = {}) {
  if (app.scene && app.scene.exit) app.scene.exit();
  setEngine(0);
  document.getElementById('ui').innerHTML = '';
  document.getElementById('overlay').innerHTML = '';
  app.scene = SCREENS[name](app, params);
  app.sceneName = name;
}
app.go = go;

// ?speed=N runs the game faster (used for testing).
const SPEED = Math.max(1, Math.min(8, +new URLSearchParams(location.search).get('speed') || 1));
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  app.t += dt;
  const s = app.scene;
  if (s) {
    if (s.update) for (let i = 0; i < SPEED; i++) s.update(dt);
    ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);
    if (s.draw) s.draw(ctx, app.W, app.H, app.t);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Stop stuck sounds when the app is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { setEngine(0); hush(); if (app.scene && app.scene.pause) app.scene.pause(); }
});

// iOS only lets sound start from a touch: unlock on the first touch/click.
['touchend', 'click'].forEach(ev => document.addEventListener(ev, unlockAudio, { passive: true }));

// Block pinch-zoom / double-tap zoom gestures on iPad.
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

// ---------- Grown-up settings ----------
export function openSettings() {
  const toggle = (key, apply) => {
    const t = h('button', { class: 'toggle' + (state.settings[key] ? ' on' : ''), 'aria-label': key });
    onTap(t, () => {
      state.settings[key] = !state.settings[key];
      t.classList.toggle('on', state.settings[key]);
      if (apply) apply(state.settings[key]);
      save(); sfx.click();
    });
    return t;
  };
  let m;
  const unlockBtn = btn('blue', null, state.unlockAll ? 'Use normal progress' : 'Unlock everything', () => {
    state.unlockAll = !state.unlockAll; save(); m.close(); go(app.sceneName === 'hangar' ? 'map' : app.sceneName === 'flight' ? 'map' : app.sceneName);
  });
  let confirmReset = false;
  const resetBtn = btn('red', null, 'Reset progress', () => {
    if (!confirmReset) { confirmReset = true; resetBtn.querySelector('.lb').textContent = 'Tap again to erase'; return; }
    reset();
  });
  const card = h('div', { class: 'card settings' },
    h('h1', {}, 'Grown-ups'),
    h('div', { class: 'setrow' }, h('span', {}, 'Talking voice'), toggle('voice', v => { voice.on = v; if (!v) hush(); })),
    h('div', { class: 'setrow' }, h('span', {}, 'Sounds'), toggle('sound', v => { sound.on = v; if (!v) setEngine(0); })),
    h('div', { class: 'setrow' }, h('div', {}, h('div', {}, 'Crashes go BOOM'), h('div', { class: 'small' }, 'Off: a gentle bump. On: a silly cartoon explosion.')), toggle('boomCrash')),
    h('div', { class: 'setrow' }, h('div', { class: 'small' }, `Missions finished: ${state.done} of 9. The red BOOM button in flight always makes a silly explosion, and the astronaut always floats home safely.`)),
    h('div', { class: 'acts' }, unlockBtn, resetBtn, btn('green', null, 'Done', () => m.close())),
  );
  m = modal(card);
}
app.openSettings = openSettings;

// ---------- Service worker (offline play) ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

go('title');
