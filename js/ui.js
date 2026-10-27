// Small DOM helpers.
import { ICON } from './icons.js';
import { sfx, unlockAudio } from './audio.js';

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}
export function icon(name, cls = 'ic') { return h('span', { class: cls, html: ICON[name] || '' }); }

// Tap handler that fires on pointerup inside the element (fast, no 300ms delay).
export function onTap(el, fn) {
  let id = null;
  el.addEventListener('pointerdown', e => { id = e.pointerId; unlockAudio(); el.classList.add('down'); });
  el.addEventListener('pointerup', e => {
    el.classList.remove('down');
    if (e.pointerId !== id) return;
    id = null;
    const r = el.getBoundingClientRect();
    if (e.clientX >= r.left - 10 && e.clientX <= r.right + 10 && e.clientY >= r.top - 10 && e.clientY <= r.bottom + 10) fn(e);
  });
  el.addEventListener('pointercancel', () => { id = null; el.classList.remove('down'); });
  el.addEventListener('pointerleave', () => el.classList.remove('down'));
  return el;
}

// Hold handler (multi-touch safe) for BOOST and steering.
export function onHold(el, down, up) {
  const ids = new Set();
  const start = e => { e.preventDefault(); unlockAudio(); ids.add(e.pointerId); try { el.setPointerCapture(e.pointerId); } catch (_) {} el.classList.add('down'); if (ids.size === 1) down(); };
  const end = e => { if (!ids.has(e.pointerId)) return; ids.delete(e.pointerId); if (ids.size === 0) { el.classList.remove('down'); up(); } };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
  el.release = () => { if (ids.size) { ids.clear(); el.classList.remove('down'); up(); } };
  return el;
}

// Long press (for grown-up settings). Shows a progress ring.
export function onLongPress(el, ms, fn) {
  let timer = null, startT = 0, raf = 0;
  const ring = h('span', { class: 'hold-ring' });
  el.append(ring);
  const tick = () => { const p = Math.min(1, (performance.now() - startT) / ms); ring.style.setProperty('--p', p); if (p < 1) raf = requestAnimationFrame(tick); };
  const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); ring.style.setProperty('--p', 0); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); startT = performance.now(); tick(); timer = setTimeout(() => { stop(); fn(); }, ms); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, stop));
  return el;
}

export function btn(cls, iconName, label, fn) {
  const b = h('button', { class: 'btn ' + cls, 'aria-label': label || iconName });
  if (iconName) b.append(icon(iconName));
  if (label) b.append(h('span', { class: 'lb' }, label));
  if (fn) onTap(b, e => { sfx.tap(); fn(e); });
  return b;
}

export function toast(text) {
  const t = h('div', { class: 'toast' }, text);
  document.getElementById('overlay').append(t);
  setTimeout(() => t.remove(), 1700);
}

export function modal(content) {
  const ov = document.getElementById('overlay');
  const bg = h('div', { class: 'modal-bg' }, content);
  ov.append(bg);
  return { el: bg, close: () => bg.remove() };
}
export function clearOverlay() { document.getElementById('overlay').innerHTML = ''; }
