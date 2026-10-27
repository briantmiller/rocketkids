// RocketKids — the flying part. Each mission is a list of phases.
import { h, btn, icon, onTap, onHold, toast, modal } from '../ui.js';
import { say, hush } from '../voice.js';
import { sfx, setEngine } from '../audio.js';
import { state, save, level, newUnlocks } from '../state.js';
import { MISSIONS, H as ALT, VORB, DV, findPart, G_EARTH } from '../data.js';
import { Craft, stepPhysics, readyToTip, TIP_FAIL } from '../sim.js';
import {
  drawRocket, rocketLayout, drawChutes, drawSatellite, drawTelescope, drawRover, drawAstronaut, drawFlag, drawStation,
  drawEarth, drawMoon, drawMars, drawCloud, drawStar, drawFlame, drawBoosterPiece, INK, rr, hex, lighten, astronautHead,
} from '../draw.js';
import { starfield, skyColor, hills, launchPad, tree } from '../bg.js';
import { drawThumb } from '../draw.js';
import { ICON } from '../icons.js';

const PLANS = {
  clouds: ['ascent', 'descent'],
  sky: ['ascent', 'descent'],
  space: ['ascent', 'descent'],
  orbit: ['ascent', 'insert', 'orbit', 'reentry', 'descent'],
  satellite: ['ascent', 'insert', 'orbit', 'reentry', 'descent'],
  station: ['ascent', 'insert', 'orbit', 'dock', 'reentry', 'descent'],
  moonloop: ['ascent', 'insert', 'orbit', 'cruiseOut', 'flyby', 'cruiseHome', 'reentry', 'descent'],
  moonland: ['ascent', 'insert', 'orbit', 'cruiseOut', 'moonland', 'moonwalk', 'cruiseHome', 'reentry', 'descent'],
  mars: ['ascent', 'insert', 'orbit', 'cruiseOut', 'marsland', 'rover'],
  park: ['ascent', 'insert', 'orbit', 'reentry', 'descent'],
};
const TARGET_ALT = { clouds: ALT.cloud, sky: ALT.sky, space: ALT.space };
const TARGET_NAME = { clouds: 'the clouds', sky: 'past the airplanes', space: 'space' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const prand = i => { const x = Math.sin(i * 91.17 + 3.3) * 43758.5453; return x - Math.floor(x); };

export function flightScreen(app, params) {
  const mi = params.mission ?? -1;
  const M = MISSIONS[mi] || null;
  const plan = M ? M.id : 'park';
  const seq = PLANS[plan];
  const b = JSON.parse(JSON.stringify(state.build));
  const cap = findPart('capsule', b.capsule);
  const orbital = !['clouds', 'sky', 'space'].includes(plan);
  const sea = M ? M.landing === 'sea' : false;

  const craft = new Craft(b);
  craft.stages.forEach(s => { s.ve *= 1.06; }); // a little kid bonus over the hangar meter

  const F = {
    phase: null, ph: {}, t: 0, fx: [], parts: [], debris: [], shake: 0, flash: 0, timeScale: 1,
    collected: 0, oops: 0, boost: false, left: false, right: false, failed: null, ended: false,
    frozen: false, hideCraft: false, craftAt: null, checkpoint: null, cargoGone: false, sepDone: false,
  };
  const steer = () => (F.right ? 1 : 0) - (F.left ? 1 : 0);

  // ---------- HUD ----------
  const ui = document.getElementById('ui');
  const hud = h('div', { class: 'hud' });
  const boostB = h('button', { class: 'btn red boost', 'aria-label': 'Boost' }, icon('boost'));
  onHold(boostB, () => { F.boost = true; }, () => { F.boost = false; });
  const leftB = h('button', { class: 'btn blue lft', 'aria-label': 'Left' }, icon('left'));
  const rightB = h('button', { class: 'btn blue rgt', 'aria-label': 'Right' }, icon('right'));
  onHold(leftB, () => { F.left = true; }, () => { F.left = false; });
  onHold(rightB, () => { F.right = true; }, () => { F.right = false; });
  const actionB = h('button', { class: 'btn green action', 'aria-label': 'Action' });
  onTap(actionB, () => { if (F.onAction && !F.frozen) { const fn = F.onAction; F.onAction = null; actionB.classList.add('hidden'); fn(); } });
  const boomB = btn('red boomb', 'boom', null, () => boom());
  boomB.setAttribute('aria-label', 'Boom');
  let homeArmed = 0;
  const homeB = btn('dark homeb', 'home', null, () => {
    if (performance.now() - homeArmed < 2500) { app.go('map'); return; }
    homeArmed = performance.now(); homeB.classList.add('pulse'); say('Tap again to go back to the map.');
    setTimeout(() => homeB.classList.remove('pulse'), 2500);
  });
  const hintEl = h('div', { class: 'hint' });
  const gauge = h('div', { class: 'gauge' });
  hud.append(hintEl, gauge, leftB, rightB, actionB, boostB, boomB, homeB);
  ui.append(hud);

  function controls({ boost = false, steer: st = false, boom: bm = false, gauge: g = false, pulseBoost = false } = {}) {
    F.ctlSet = true;
    boostB.classList.toggle('hidden', !boost);
    boostB.classList.toggle('pulse', !!pulseBoost);
    leftB.classList.toggle('hidden', !st); rightB.classList.toggle('hidden', !st);
    boomB.classList.toggle('hidden', !bm);
    gauge.classList.toggle('hidden', !g);
    if (!boost) { F.boost = false; boostB.release && boostB.release(); }
    if (!st) { F.left = F.right = false; leftB.release && leftB.release(); rightB.release && rightB.release(); }
  }
  function action(ic, fn) { actionB.innerHTML = ''; actionB.append(icon(ic)); actionB.classList.remove('hidden'); actionB.classList.add('pulse'); F.onAction = fn; }
  function noAction() { actionB.classList.add('hidden'); F.onAction = null; }
  let lastHint = '';
  function hint(ic, text, speak = true) {
    if (text === lastHint) return;
    lastHint = text;
    hintEl.innerHTML = '';
    if (text) { if (ic) hintEl.append(icon(ic)); hintEl.append(h('span', {}, text)); }
    if (speak && text) say(text);
  }
  function renderGauge() {
    gauge.innerHTML = '';
    for (let i = craft.cur; i < craft.stages.length; i++) {
      const s = craft.stages[i];
      const bar = h('b', { class: i === craft.cur ? 'cur' : '', style: { height: (40 + s.fuel0 * 7) + 'px' } }, h('i', { style: { height: (100 * s.fuel / s.fuel0) + '%' } }));
      gauge.prepend(bar);
    }
  }
  noAction(); controls();

  // ---------- particles ----------
  function puff(x, y, o = {}) {
    F.parts.push({ x, y, vx: o.vx ?? rand(-20, 20), vy: o.vy ?? rand(-10, 10), life: 0, max: o.max ?? rand(0.8, 1.6), r: o.r ?? rand(8, 16), grow: o.grow ?? 30, col: o.col ?? 'rgba(255,255,255,0.8)', kind: o.kind || 'smoke', rot: rand(0, 6), vr: rand(-4, 4), g: o.g || 0 });
  }
  function updParts(list, dt) {
    for (const p of list) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.r += (p.grow || 0) * dt; p.rot += (p.vr || 0) * dt; }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].life > list[i].max) list.splice(i, 1);
  }
  function drawParts(c, list) {
    for (const p of list) {
      const a = 1 - p.life / p.max;
      c.globalAlpha = Math.max(0, a);
      if (p.kind === 'confetti') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); c.restore();
      } else if (p.kind === 'spark') {
        drawStar(c, p.x, p.y, p.r, p.col, null);
      } else if (p.kind === 'piece') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); rr(c, -p.r, -p.r * 0.6, p.r * 2, p.r * 1.2, 3); c.fillStyle = p.col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke(); c.restore();
      } else {
        c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
      }
    }
    c.globalAlpha = 1;
  }
  function sparkle(x, y, list = F.parts, n = 10) {
    for (let i = 0; i < n; i++) list.push({ x, y, vx: rand(-160, 160), vy: rand(-160, 160), life: 0, max: rand(0.5, 0.9), r: rand(5, 9), grow: -6, col: ['#FFD60A', '#fff', '#4CC9F0', '#FF66C4'][i % 4], kind: 'spark', rot: 0, vr: 0 });
  }

  // ---------- phase machine ----------
  const P = {};
  let seqIdx = 0;
  function enter(name, opts = {}) {
    F.phase = name; F.ph = { t: 0, opts }; F.parts = []; F.timeScale = 1; F.hideCraft = false;
    noAction(); hint(null, '', false);
    seqIdx = seq.indexOf(name) >= 0 ? seq.indexOf(name) : seqIdx;
    F.ctlSet = false;
    P[name].enter(F.ph, opts);
    if (!F.ctlSet) controls();
  }
  function next(opts) {
    const n = seq[seqIdx + 1];
    if (!n) { finish(); return; }
    enter(n, opts);
  }

  // Shared staging logic during powered flight. Returns true while waiting.
  function staging(ph, rd, screenPos) {
    if (craft.boosters && craft.boostersEmpty()) {
      if (ph.dropDebris) ph.dropDebris('boosters');
      craft.dropBoosters(); sfx.clunk();
      say('Boosters away!', { interrupt: false });
    }
    if (!ph.waitStage && craft.stageEmpty() && craft.hasNextStage()) {
      ph.waitStage = 0.001; F.timeScale = 0.3;
      action('stage', () => doStage(ph));
      hint('stage', 'Tap to drop the empty stage!');
    }
    if (ph.waitStage) { ph.waitStage += rd; if (ph.waitStage > 3.5) { noAction(); doStage(ph); } return true; }
    return false;
  }
  function doStage(ph) {
    if (!ph.waitStage) return;
    if (ph.dropDebris) ph.dropDebris('stage', craft.cur);
    craft.nextStage(); sfx.clunk(); sfx.whoosh();
    ph.waitStage = 0; F.timeScale = 1; noAction();
    hint('boost', 'Stage away! Keep holding the fire button!');
    renderGauge();
  }

  // ---------- world view used by ascent & descent ----------
  const decor = (() => {
    const out = { clouds: [], birds: [], planes: [], balloons: [], sats: [] };
    for (let i = 0; i < 26; i++) out.clouds.push({ x: (prand(i) - 0.5) * 1600, y: 180 + prand(i + 50) * 1300, s: 0.6 + prand(i + 9) * 0.9 });
    for (let i = 0; i < 6; i++) out.birds.push({ x: (prand(i + 3) - 0.5) * 900, y: 90 + prand(i + 7) * 300, v: 30 + prand(i) * 40 });
    out.balloons.push({ x: -220, y: 820 }, { x: 260, y: 1150 });
    out.planes.push({ x: -300, y: 1550, v: 90 }, { x: 400, y: 1900, v: -110 });
    for (let i = 0; i < 4; i++) out.sats.push({ x: (prand(i + 21) - 0.5) * 1000, y: 3300 + prand(i + 40) * 1600 });
    return out;
  })();

  function drawWorldBg(c, W, H, camX, camAlt, t, groundKind) {
    const a = clamp(camAlt / 3600, 0, 1);
    const [r, g, bl] = skyColor(a);
    c.fillStyle = `rgb(${r},${g},${bl})`; c.fillRect(0, 0, W, H);
    starfield(c, W, H, t, clamp((camAlt - 1600) / 1800, 0, 1), -camX * 0.05);
    if (camAlt > 2600) {
      // curve of the Earth far below
      const R = W * 2.2, cy = H * 0.62 + camAlt * 0.12 + R * 0.98 - (camAlt - 2600) * 0.05;
      c.save(); c.globalAlpha = clamp((camAlt - 2600) / 1200, 0, 1);
      drawEarth(c, W / 2, Math.max(H * 0.8 + R * 0.9, cy), R, t);
      c.restore();
    }
    c.save();
    c.translate(W / 2 - camX, H * 0.62 + camAlt);
    // space line
    if (Math.abs(camAlt - ALT.space) < H) {
      c.save(); c.setLineDash([18, 14]); c.lineWidth = 5; c.strokeStyle = 'rgba(255,214,10,0.8)';
      c.beginPath(); c.moveTo(camX - W, -ALT.space); c.lineTo(camX + W, -ALT.space); c.stroke(); c.restore();
      for (let k = -2; k <= 2; k++) drawStar(c, camX + k * 160 - (camX % 160), -ALT.space, 9, '#FFD60A', INK, 2);
    }
    // decorations
    for (const d of decor.clouds) if (Math.abs(-d.y + camAlt) < H) drawCloud(c, d.x + Math.sin(t * 0.2 + d.x) * 10, -d.y, d.s, 0.92);
    for (const d of decor.birds) if (camAlt < 900) drawBird(c, ((d.x + t * d.v + 1200) % 2400) - 1200, -d.y + Math.sin(t * 3 + d.x) * 6, t);
    for (const d of decor.balloons) if (Math.abs(-d.y + camAlt) < H) drawBalloon(c, d.x, -d.y + Math.sin(t) * 8);
    for (const d of decor.planes) if (Math.abs(-d.y + camAlt) < H) drawPlane(c, ((d.x + t * d.v + 1400) % 2800) - 1400, -d.y, d.v < 0);
    for (const d of decor.sats) if (Math.abs(-d.y + camAlt) < H) drawSatellite(c, d.x, -d.y, 0.5, 1, t);
    c.restore();
    // ground
    const gy = H * 0.62 + camAlt;
    if (gy < H + 400) {
      if (groundKind === 'sea') drawSea(c, W, gy, t, camX);
      else {
        hills(c, W, gy, camX);
        c.save(); c.translate(W / 2 - camX, gy);
        tree(c, -260, 0, 1.2); tree(c, -330, 0, 0.9); tree(c, 300, 0, 1.1); tree(c, 380, 0, 1.3); tree(c, 520, 0, 1);
        c.restore();
        launchPad(c, W / 2 - camX, gy, 1, 240);
      }
    }
  }
  function drawSea(c, W, gy, t, camX) {
    const g = c.createLinearGradient(0, gy, 0, gy + 300);
    g.addColorStop(0, '#2E86DE'); g.addColorStop(1, '#0B3D91');
    c.fillStyle = g; c.fillRect(0, gy - 6, W, 2000);
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3;
    for (let row = 0; row < 4; row++) {
      c.beginPath();
      for (let x = -40; x < W + 40; x += 30) {
        const yy = gy + row * 28 + Math.sin(x * 0.03 + t * 2 + row) * 4;
        if (x === -40) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.stroke();
    }
    // recovery boat
    const bx = W / 2 - camX + 260 + Math.sin(t * 0.4) * 10;
    c.save(); c.translate(bx, gy + Math.sin(t * 2) * 3);
    c.lineWidth = 3; c.strokeStyle = INK;
    c.beginPath(); c.moveTo(-60, -10); c.lineTo(60, -10); c.lineTo(45, 12); c.lineTo(-45, 12); c.closePath(); c.fillStyle = '#F94144'; c.fill(); c.stroke();
    rr(c, -25, -32, 40, 22, 4); c.fillStyle = '#fff'; c.fill(); c.stroke();
    c.restore();
  }
  function drawBird(c, x, y, t) {
    const f = Math.sin(t * 10 + x) * 6;
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath();
    c.moveTo(x - 12, y - f); c.quadraticCurveTo(x - 6, y - 6, x, y); c.quadraticCurveTo(x + 6, y - 6, x + 12, y - f); c.stroke();
  }
  function drawBalloon(c, x, y) {
    c.lineWidth = 3; c.strokeStyle = INK;
    c.beginPath(); c.moveTo(x - 14, y + 30); c.lineTo(x - 8, y + 48); c.moveTo(x + 14, y + 30); c.lineTo(x + 8, y + 48); c.stroke();
    c.beginPath(); c.arc(x, y, 34, 0, 7); c.fillStyle = '#FF66C4'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#FFD60A'; c.fillRect(x - 10, y - 40, 20, 80); c.restore();
    c.beginPath(); c.arc(x, y, 34, 0, 7); c.stroke();
    rr(c, x - 10, y + 46, 20, 14, 3); c.fillStyle = '#8B5E34'; c.fill(); c.stroke();
  }
  function drawPlane(c, x, y, flip) {
    c.save(); c.translate(x, y); if (flip) c.scale(-1, 1); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round';
    rr(c, -60, -10, 120, 20, 10); c.fillStyle = '#fff'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-10, 0); c.lineTo(-30, 30); c.lineTo(-14, 30); c.lineTo(14, 0); c.closePath(); c.fillStyle = '#4CC9F0'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-60, -6); c.lineTo(-72, -28); c.lineTo(-58, -28); c.lineTo(-44, -8); c.closePath(); c.fillStyle = '#F94144'; c.fill(); c.stroke();
    for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(-30 + k * 16, -2, 3.5, 0, 7); c.fillStyle = '#9EE6FF'; c.fill(); }
    c.restore();
  }
  function drawLadder(c, W, H, alt, goal) {
    const x = 26, top = H * 0.16, bot = H * 0.8;
    const max = ALT.space * 1.15;
    const ay = a => bot - (bot - top) * clamp(a / max, 0, 1);
    c.save(); c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = 12; c.beginPath(); c.moveTo(x, bot); c.lineTo(x, top); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, bot); c.lineTo(x, top); c.stroke();
    c.strokeStyle = '#3DDC97'; c.beginPath(); c.moveTo(x, bot); c.lineTo(x, ay(alt)); c.stroke();
    const marks = [[ALT.cloud, 'cloud'], [ALT.sky, 'plane'], [ALT.space, 'stars']];
    for (const [a, k] of marks) {
      const y = ay(a);
      c.beginPath(); c.arc(x, y, 15, 0, 7); c.fillStyle = a === goal ? '#FFD23F' : '#1E2D63'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      if (k === 'cloud') drawCloud(c, x, y + 2, 0.28);
      if (k === 'plane') { c.save(); c.translate(x, y); c.scale(0.18, 0.18); drawPlane(c, 0, 0, false); c.restore(); }
      if (k === 'stars') drawStar(c, x, y, 9, '#FFD60A', INK, 1.5);
    }
    const ry = ay(alt);
    c.beginPath(); c.moveTo(x + 10, ry); c.lineTo(x + 26, ry - 9); c.lineTo(x + 26, ry + 9); c.closePath(); c.fillStyle = hex(b.color); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
    c.restore();
  }

  // ===================== ASCENT =====================
  P.ascent = {
    enter(ph) {
      ph.st = { h: 0, vy: 0, vx: 0, t: 0, mode: 'up' };
      ph.x = 0; ph.xv = 0; ph.started = false; ph.camAlt = 0; ph.camX = 0; ph.pad = 0; ph.fallT = 0;
      ph.target = TARGET_ALT[plan] || ALT.space;
      ph.reached = false;
      const L = rocketLayout(b, {});
      ph.rs = clamp(app.H * 0.42 / L.height, 0.3, 1.5);
      ph.stars = [];
      const top = Math.min(ph.target, 3700);
      for (let y = 230, i = 0; y < top; y += Math.max(150, top / 9), i++) ph.stars.push({ x: (prand(i + 77) - 0.5) * 420, y, got: false });
      ph.dropDebris = (kind, idx) => {
        if (kind === 'stage') F.debris.push({ kind, idx, x: ph.x, y: -ph.st.h, vx: rand(-40, 40), vy: -ph.st.vy * 0.6, rot: 0, vr: rand(-1, 1), s: ph.rs });
        else for (const sx of [-1, 1]) F.debris.push({ kind: 'booster', x: ph.x + sx * 40 * ph.rs, y: -ph.st.h - 60 * ph.rs, vx: sx * 90, vy: -ph.st.vy * 0.5, rot: 0, vr: sx * 2, s: ph.rs });
      };
      controls({ boost: true, steer: true, boom: true, gauge: true, pulseBoost: true });
      renderGauge();
      hint('boost', 'Hold the fire button to blast off!');
      F.checkpoint = null;
    },
    update(ph, dt, sdt) {
      const st = ph.st;
      if (!ph.started) {
        if (F.boost) { ph.started = true; boostB.classList.remove('pulse'); say('Three, two, one, blast off!'); hint(null, '', false); sfx.whoosh(); }
        else { setEngine(0); return; }
      }
      const waiting = staging(ph, dt) || ph.tipWait || ph.sepWait;
      const boosting = F.boost && !waiting && !craft.stageEmpty();
      setEngine(boosting ? 1 : 0);
      if (!ph.sepWait) stepPhysics(st, craft, boosting, sdt);
      if (boosting) renderGaugeThrottle(dt);
      if (boosting && Math.random() < 0.7) puff(ph.x + rand(-10, 10), -st.h + 10, { vy: 120 + rand(0, 60), col: st.h < 200 ? 'rgba(240,240,240,0.85)' : 'rgba(255,255,255,0.55)', grow: 40 });
      if (boosting && st.h < 15) for (let k = 0; k < 2; k++) puff(ph.x + rand(-120, 120), -4, { vx: rand(-200, 200), vy: rand(-30, 0), r: rand(14, 26), col: 'rgba(230,230,230,0.9)' });
      // too heavy to lift off?
      if (boosting && st.h < 1) { ph.pad += dt; if (ph.pad > 2.5) { F.failed = { kind: 'heavy' }; endEarly('Your rocket is too heavy to lift off! Try a bigger bottom stage.'); return; } }
      if (craft.outOfFuel() && st.h < 1 && ph.started && !ph.endT) { F.failed = { kind: 'heavy' }; endEarly('Uh oh, the rocket could not get off the ground. Let\'s build it bigger!'); return; }
      // steering
      const tx = st.h > 25 ? steer() * 180 : 0;
      ph.xv += (tx - ph.xv) * Math.min(1, dt * 4);
      ph.x = clamp(ph.x + ph.xv * dt, -420, 420);
      // camera
      ph.camAlt += (st.h - ph.camAlt) * Math.min(1, dt * 7);
      ph.camX += (ph.x - ph.camX) * Math.min(1, dt * 4);
      // stars
      const L = rocketLayout(b, { from: craft.cur });
      for (const s of ph.stars) {
        if (s.got) continue;
        if (Math.abs(s.x - ph.x) < 50 && Math.abs(s.y - (st.h + L.height * ph.rs / 2)) < L.height * ph.rs / 2 + 25) {
          s.got = true; F.collected++; sfx.star(); sparkle(s.x, -s.y);
        }
      }
      // reached the goal (non-orbital missions)
      if (!orbital && !ph.reached && st.h >= ph.target) {
        ph.reached = true; sfx.fanfare();
        toast(plan === 'space' ? 'SPACE!' : plan === 'sky' ? 'SO HIGH!' : 'CLOUDS!');
        say(`You made it to ${TARGET_NAME[plan]}!`);
      }
      // orbital: time to tip over
      if (orbital && st.mode === 'up' && !ph.tipWait && readyToTip(st)) {
        ph.tipWait = 0.001; F.timeScale = 0.25;
        action('tip', () => doTip(ph));
        hint('tip', 'Tap the arrow to tip over and fly sideways!');
      }
      if (ph.tipWait) { ph.tipWait += dt; if (ph.tipWait > 3.5) { noAction(); doTip(ph); } return; }
      // coming back down
      if (st.vy < 0 && st.h > 20 && !ph.sepWait && !ph.waitStage) {
        const out = craft.outOfFuel();
        if (!orbital && ph.reached) startSep(ph, 'Tap to pop off the capsule!');
        else if (out) {
          if (plan !== 'park') F.failed = F.failed || { kind: 'power' };
          startSep(ph, plan === 'park' ? 'Tap to pop off the capsule!' : 'Almost! Not enough rocket power. Tap to pop off the capsule!');
        } else if (!F.boost) {
          ph.fallT += dt;
          hint('boost', 'Hold the fire button to go higher!');
          if (ph.fallT > 3) { F.failed = F.failed || { kind: 'hold' }; startSep(ph, 'Tap to pop off the capsule!'); }
        }
      }
      if (ph.sepWait) { ph.sepWait += dt; if (ph.sepWait > 3.5) { noAction(); doSep(ph); } }
    },
    draw(ph, c, W, H, t) {
      drawWorldBg(c, W, H, ph.camX, ph.camAlt, t, 'land');
      c.save(); c.translate(W / 2 - ph.camX, H * 0.62 + ph.camAlt);
      for (const s of ph.stars) if (!s.got) drawStar(c, s.x, -s.y + Math.sin(t * 3 + s.x) * 5, 18 + Math.sin(t * 5 + s.y) * 2, '#FFD60A', INK, 3);
      drawDebris(c, t);
      drawParts(c, F.parts);
      if (!F.hideCraft) {
        const boosting = F.boost && !craft.stageEmpty() && !ph.waitStage && !ph.tipWait && ph.started;
        drawRocket(c, b, { x: ph.x, y: -ph.st.h, s: ph.rs, from: craft.cur, flame: boosting ? 1 : 0, boosters: !!craft.boosters, t, angle: ph.xv * 0.0012, look: ph.xv / 180, mood: ph.st.vy > 250 ? 'wow' : null });
        const L = rocketLayout(b, { from: craft.cur });
        F.craftAt = { x: W / 2 - ph.camX + ph.x, y: H * 0.62 + ph.camAlt - ph.st.h - L.height * ph.rs / 2 };
      }
      c.restore();
      drawLadder(c, W, H, ph.st.h, orbital ? ALT.space : ph.target);
    },
  };
  function doTip(ph) {
    ph.tipWait = 0; F.timeScale = 1; noAction(); sfx.whoosh();
    ph.st.mode = 'tipped';
    enter('insert', { st: ph.st });
  }
  function startSep(ph, text) {
    ph.sepWait = 0.001; F.timeScale = 0.4;
    action('stage', () => doSep(ph));
    hint('stage', text);
  }
  function doSep(ph) {
    if (!ph.sepWait) return;
    ph.sepWait = 0; F.timeScale = 1; sfx.clunk();
    for (let i = craft.cur; i < craft.stages.length; i++) F.debris.push({ kind: 'stage', idx: i, x: ph.x - 10, y: -ph.st.h - (i - craft.cur) * 60, vx: rand(-60, -20), vy: 40, rot: 0, vr: -0.8, s: ph.rs });
    const L = rocketLayout(b, { from: craft.cur });
    const capL = rocketLayout(b, { capsuleOnly: true, noLander: true });
    enter('descent', { h: ph.st.h + (L.height - capL.height) * ph.rs, vy: Math.max(ph.st.vy, -40), x: ph.x, camAlt: ph.camAlt, camX: ph.camX, ground: 'land', s: ph.rs });
  }
  function drawDebris(c, t) {
    for (const d of F.debris) {
      if (d.screen) continue;
      c.save(); c.translate(d.x, d.y); c.rotate(d.rot);
      if (d.kind === 'stage') drawRocket(c, b, { x: 0, y: 0, s: d.s, only: d.idx, boosters: false, t });
      else if (d.kind === 'booster') drawBoosterPiece(c, b, d.s);
      else if (d.kind === 'fairing') { rr(c, -12 * d.s, -30 * d.s, 24 * d.s, 60 * d.s, 8); c.fillStyle = lighten(hex(b.color), 0.35); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke(); }
      c.restore();
    }
  }
  function updDebris(dt) {
    for (const d of F.debris) { d.vy += (d.space ? 0 : 140) * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; d.life = (d.life || 0) + dt; }
    F.debris = F.debris.filter(d => d.life < 8);
  }

  // ===================== DESCENT (capsule + parachutes) =====================
  P.descent = {
    enter(ph, o) {
      ph.h = o.h ?? 1700; ph.vy = o.vy ?? -380; ph.x = o.x ?? 0;
      ph.camAlt = o.camAlt ?? ph.h; ph.camX = o.camX ?? ph.x;
      ph.ground = o.ground || (sea ? 'sea' : 'land');
      ph.s = clamp(Math.max(o.s ?? 0, app.H * 0.24 / 120), 0.5, 1.5);
      ph.chute = 0; ph.open = false; ph.landed = false; ph.urged = false;
      F.checkpoint = { name: 'descent', opts: { h: 1000, vy: -160, x: ph.x, ground: ph.ground, s: ph.s } };
      action('chute', () => { ph.open = true; sfx.chute(); hint(null, '', false); say('Parachute open! Wheee!'); });
      hint('chute', ph.h > 1400 ? 'Get ready to tap the parachute!' : 'Tap the parachute!');
      if (!o.camAlt && ph.ground === 'sea') say('Get ready to open the parachute!', { interrupt: false });
    },
    update(ph, dt, sdt) {
      setEngine(0);
      if (ph.landed) { ph.lt = (ph.lt || 0) + dt; if (ph.lt > 3.2 && !ph.done) { ph.done = true; finish(); } return; }
      if (ph.open) ph.chute = Math.min(1, ph.chute + dt * 1.6);
      ph.vy -= G_EARTH * sdt;
      const term = ph.open ? -(18 + Math.max(0, ph.h) * 0.2) - 60 * (1 - ph.chute) : (ph.h > 2600 ? -750 : ph.h > 1300 ? -420 : -240);
      if (ph.vy < term) ph.vy += (term - ph.vy) * Math.min(1, sdt * (ph.open ? 3 : 1.5));
      ph.h += ph.vy * sdt;
      ph.x += steer() * 40 * dt;
      if (!ph.open && ph.h < 1300 && !ph.urged1) { ph.urged1 = true; hint('chute', 'Tap the parachute!'); }
      if (!ph.open && ph.h < 420) {
        F.timeScale = 0.35;
        if (!ph.urged) { ph.urged = true; say('Quick! Tap the parachute!'); }
      } else F.timeScale = 1;
      ph.camAlt += (ph.h - ph.camAlt) * Math.min(1, dt * 6);
      ph.camX += (ph.x - ph.camX) * Math.min(1, dt * 4);
      if (ph.h <= 0) {
        ph.h = 0;
        const speed = -ph.vy;
        F.timeScale = 1;
        if (ph.open && speed < 60) {
          ph.landed = true; noAction();
          if (ph.ground === 'sea') { sfx.splash(); for (let i = 0; i < 24; i++) puff(ph.x + rand(-40, 40), -10, { vx: rand(-160, 160), vy: rand(-260, -80), g: 500, r: rand(4, 9), grow: 0, col: 'rgba(200,235,255,0.95)', max: 1.2 }); }
          else { sfx.thud(); for (let i = 0; i < 14; i++) puff(ph.x + rand(-40, 40), -6, { vx: rand(-120, 120), vy: rand(-60, -10), col: 'rgba(170,140,100,0.7)' }); }
          say(M ? 'Touchdown! You landed safely!' : 'Touchdown! What a flight!');
        } else {
          crash(ph.ground === 'sea' ? 'Splash! Oops, we forgot the parachute. Let\'s try that again!' : 'Bonk! Oops, we forgot the parachute. Let\'s try that again!');
        }
      }
    },
    draw(ph, c, W, H, t) {
      drawWorldBg(c, W, H, ph.camX, ph.camAlt, t, ph.ground);
      c.save(); c.translate(W / 2 - ph.camX, H * 0.62 + ph.camAlt);
      drawDebris(c, t);
      drawParts(c, F.parts);
      if (!F.hideCraft) {
        const bob = ph.landed && ph.ground === 'sea' ? Math.sin(t * 2) * 4 + 8 : 0;
        const L = rocketLayout(b, { capsuleOnly: true, noLander: true });
        const top = -ph.h - L.height * ph.s + bob;
        if (!ph.landed || (ph.lt || 0) < 1.2) drawChutes(c, b, ph.x, top + 2, ph.s, ph.landed ? Math.max(0, 1 - (ph.lt || 0)) : ph.chute, t);
        if (!ph.open && ph.h > 2000) { c.save(); c.globalAlpha = clamp((ph.h - 2000) / 800, 0, 0.8); drawGlow(c, ph.x, -ph.h + bob, 50 * ph.s, t); c.restore(); }
        drawRocket(c, b, { x: ph.x, y: -ph.h + bob, s: ph.s, capsuleOnly: true, noLander: true, t });
        if (ph.landed && (ph.lt || 0) > 1) {
          const k = Math.min(1, ((ph.lt || 0) - 1) * 2);
          drawAstronaut(c, ph.x + 30 * ph.s + 40 * k, -ph.h + bob - (ph.ground === 'sea' ? L.height * ph.s * 0.7 : 0), ph.s * 1.1, { t, wave: true, color: hex(b.color) });
        }
        F.craftAt = { x: W / 2 - ph.camX + ph.x, y: H * 0.62 + ph.camAlt - ph.h - L.height * ph.s / 2 };
      }
      c.restore();
      drawLadder(c, W, H, ph.h, null);
    },
  };
  function drawGlow(c, x, y, r, t) {
    const g = c.createRadialGradient(x, y, r * 0.2, x, y, r * 2);
    g.addColorStop(0, 'rgba(255,240,180,0.95)'); g.addColorStop(0.4, 'rgba(255,140,40,0.75)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y + r * 0.3, r * (1.6 + 0.1 * Math.sin(t * 30)), r * 1.2, 0, 0, 7); c.fill();
  }

  // ===================== INSERT (going sideways for orbit) =====================
  P.insert = {
    enter(ph, o) {
      ph.st = o.st; ph.ang = 0; ph.scroll = 0;
      ph.s = clamp(app.H * 0.36 / rocketLayout(b, { from: craft.cur }).height, 0.3, 1.1);
      ph.dropDebris = (kind, idx) => {
        const p = F.craftAt || { x: app.W * 0.4, y: app.H * 0.5 };
        if (kind === 'stage') F.debris.push({ kind, idx, x: p.x - 60, y: p.y, vx: -120, vy: 30, rot: Math.PI / 2, vr: -0.5, s: ph.s, screen: true });
        else for (const sy of [-1, 1]) F.debris.push({ kind: 'booster', x: p.x - 40, y: p.y + sy * 20, vx: -100, vy: sy * 40, rot: Math.PI / 2, vr: sy, s: ph.s, screen: true });
      };
      controls({ boost: true, boom: true, gauge: true });
      renderGauge();
      hint('boost', 'Now hold the fire button to go super fast sideways!');
    },
    update(ph, dt, sdt) {
      ph.ang = Math.min(Math.PI / 2, ph.ang + dt * 2.2);
      const waiting = staging(ph, dt);
      const boosting = F.boost && !waiting && !craft.stageEmpty() && !ph.over;
      setEngine(boosting ? 1 : 0);
      if (!ph.over) stepPhysics(ph.st, craft, boosting, sdt);
      ph.scroll += (40 + ph.st.vx) * dt;
      renderGaugeThrottle(dt);
      if (ph.over) { ph.ot += dt; if (ph.ot > 2.6) { if (ph.win) next(); else enter('reentry'); } return; }
      if (ph.st.vx >= VORB) {
        ph.over = true; ph.win = true; ph.ot = 0; F.timeScale = 1; setEngine(0); controls({ boom: true });
        sfx.fanfare(); toast('ORBIT!');
        say('You did it! You are in orbit, flying around the whole Earth!');
        hint(null, '', false);
      } else if (craft.outOfFuel() || (ph.st.vy < 0 && ph.st.h < TIP_FAIL)) {
        ph.over = true; ph.win = false; ph.ot = 0; setEngine(0); controls({});
        if (plan !== 'park') F.failed = F.failed || { kind: craft.outOfFuel() ? 'power' : 'hold' };
        say(plan === 'park' ? 'Not quite fast enough to stay in space. Let\'s come home!' : 'Almost fast enough! Let\'s come home and add more rocket power.');
        F.sepDone = true;
      }
    },
    draw(ph, c, W, H, t) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#05081F'); g.addColorStop(1, '#12185A');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      starfield(c, W, H, t, 1, -ph.scroll * 0.2);
      const R = Math.max(W, H) * 1.6;
      c.save(); c.translate(-(ph.scroll * 0.4) % 40, 0);
      drawEarth(c, W / 2, H * 0.84 + R, R, t + ph.scroll * 0.01);
      c.restore();
      // speed lines
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        const y = (prand(i) * H * 0.7) + 40, len = 30 + ph.st.vx * 0.5;
        const x = W - ((ph.scroll * (1 + prand(i + 3)) + prand(i + 9) * W) % (W + len));
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
      }
      drawDebrisScreen(c, t);
      const y = H * 0.56 - clamp((ph.st.h - TIP_FAIL) / (ALT.space * 1.6 - TIP_FAIL), -0.2, 1) * H * 0.3;
      const L = rocketLayout(b, { from: craft.cur });
      const boosting = F.boost && !craft.stageEmpty() && !ph.waitStage && !ph.over;
      if (!F.hideCraft) {
        drawRocket(c, b, { x: W * 0.4, y: y + L.height * ph.s / 2, s: ph.s, from: craft.cur, boosters: !!craft.boosters, flame: boosting ? 1 : 0, angle: ph.ang, t, look: 1 });
        F.craftAt = { x: W * 0.4, y };
      }
      drawOrbitMeter(c, 90, Math.max(190, H * 0.24), ph.st.vx / VORB, t);
    },
  };
  let gaugeTimer = 0;
  function renderGaugeThrottle(dt) { gaugeTimer += dt; if (gaugeTimer > 0.15) { gaugeTimer = 0; renderGauge(); } }
  function drawDebrisScreen(c, t) {
    for (const d of F.debris) {
      if (!d.screen) continue;
      c.save(); c.translate(d.x, d.y); c.rotate(d.rot);
      if (d.kind === 'stage') drawRocket(c, b, { x: 0, y: 0, s: d.s, only: d.idx, boosters: false, t });
      else if (d.kind === 'booster') drawBoosterPiece(c, b, d.s);
      else if (d.kind === 'fairing') { rr(c, -10, -26, 20, 52, 8); c.fillStyle = lighten(hex(b.color), 0.35); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke(); }
      c.restore();
    }
  }
  function drawOrbitMeter(c, x, y, f, t) {
    f = clamp(f, 0, 1);
    c.save();
    c.lineCap = 'round';
    c.lineWidth = 18; c.strokeStyle = INK; c.beginPath(); c.arc(x, y, 48, 0, 7); c.stroke();
    c.lineWidth = 12; c.strokeStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(x, y, 48, 0, 7); c.stroke();
    c.strokeStyle = f >= 1 ? '#3DDC97' : '#FFD23F';
    c.beginPath(); c.arc(x, y, 48, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); c.stroke();
    drawEarth(c, x, y, 28, t);
    const a = -Math.PI / 2 + f * Math.PI * 2;
    drawStar(c, x + Math.cos(a) * 48, y + Math.sin(a) * 48, 10, '#fff', INK, 2);
    c.restore();
  }

  // ===================== ORBIT =====================
  const isMoon = plan === 'moonloop' || plan === 'moonland';
  const isMars = plan === 'mars';
  P.orbit = {
    enter(ph) {
      ph.th = Math.PI * 0.75; ph.lap = 0; ph.step = 'cruise';
      ph.dv = 0; ph.burning = false; ph.deorb = 0; ph.capsuleOnly = false;
      ph.need = isMars ? DV.mars : DV.moon;
      ph.dropDebris = (kind, idx) => { const p = F.craftAt; if (p) F.debris.push({ kind, idx, x: p.x, y: p.y, vx: rand(-30, 30), vy: rand(-30, 30), rot: ph.th, vr: rand(-1, 1), s: 0.22, screen: true, space: true }); };
      F.debris = [];
      controls({ boom: true });
      if (F.sepDone) { startDeorbit(ph); return; }
      if (isMoon || isMars) {
        ph.step = 'tli';
        controls({ boost: true, boom: true, gauge: true });
        renderGauge();
        hint('boost', isMars ? 'Mars is far away! When the arrow turns green, hold the fire button!' : 'See the Moon? When the arrow turns green, hold the fire button!');
      } else if (plan === 'satellite') {
        ph.step = 'sat';
        setTimeout(() => { if (F.phase === 'orbit' && ph.step === 'sat') { action('satellite', () => releaseSat(ph)); hint('satellite', 'Tap the satellite button to let it go!'); } }, 1500);
      } else if (plan === 'station') {
        ph.step = 'toStation';
      } else {
        hint(null, 'Wheee! Around the world we go!');
      }
    },
    update(ph, dt) {
      const w = 2 * Math.PI / 7;
      const slow = ph.burning ? 0.3 : 1;
      ph.th += w * dt * slow; ph.lap += w * dt * slow;
      if (ph.sat) { ph.sat.t += dt; ph.sat.r += dt * 14; ph.sat.a += w * dt * 0.8; }
      if (ph.step === 'cruise' && ph.lap > Math.PI * 2) startDeorbit(ph);
      if (ph.step === 'toStation' && ph.lap > Math.PI) { ph.step = 'x'; say('Look! The space station! Let\'s go say hi!'); setTimeout(() => F.phase === 'orbit' && next(), 1800); }
      if (ph.step === 'satDone' && (ph.sat.t > 4)) startDeorbit(ph);
      if (ph.step === 'tli') {
        const win = Math.atan2(Math.sin(ph.th - TLI_ANGLE), Math.cos(ph.th - TLI_ANGLE));
        ph.inWin = Math.abs(win) < 0.55;
        boostB.classList.toggle('pulse', ph.inWin);
        if (ph.inWin && !ph.saidNow && !ph.burning) { ph.saidNow = true; hint('boost', 'Now! Hold the fire button!'); }
        if (!ph.inWin && !ph.burning) { ph.saidNow = false; if (lastHint === 'Now! Hold the fire button!') hint(null, 'Wait for the green arrow...', false); }
        const waiting = staging(ph, dt);
        if (F.boost && !waiting && !craft.stageEmpty() && (ph.inWin || ph.burning)) {
          ph.burning = true; const a = craft.burn(dt); ph.dv += a * dt; setEngine(1);
          renderGaugeThrottle(dt);
        } else { if (!F.boost) ph.burning = false; setEngine(0); }
        if (ph.dv >= ph.need) {
          ph.step = 'go'; setEngine(0); controls({}); sfx.fanfare();
          toast(isMars ? 'TO MARS!' : 'TO THE MOON!');
          say(isMars ? 'Yes! We are on the way to Mars!' : 'Yes! We are on the way to the Moon!');
          setTimeout(() => F.phase === 'orbit' && next(), 1600);
        } else if (craft.outOfFuel() && !ph.waitStage) {
          F.failed = F.failed || { kind: 'power' };
          ph.step = 'x'; setEngine(0);
          say(isMars ? 'Oh no, not enough rocket power to reach Mars. Let\'s go home and build a bigger rocket!' : 'Oh no, not enough rocket power to reach the Moon. Let\'s go home and build a bigger rocket!');
          setTimeout(() => F.phase === 'orbit' && startDeorbit(ph), 3000);
        }
      }
      if (ph.step === 'deorbit') {
        if (F.boost) { ph.deorb += dt; setEngine(0.5); } else setEngine(0);
        if (ph.deorb > 1.8) { ph.step = 'x'; setEngine(0); controls({}); say('Heading home!'); hint(null, '', false); setTimeout(() => F.phase === 'orbit' && enter('reentry'), 1200); }
      }
    },
    draw(ph, c, W, H, t) {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05081F'); g.addColorStop(1, '#141B5E');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      starfield(c, W, H, t, 1, t * 3);
      const land = W >= H;
      const C = { x: land ? W * 0.42 : W * 0.5, y: land ? H * 0.56 : H * 0.6 };
      const R = Math.min(W, H) * 0.2, OR = R * 1.55;
      if (isMoon || plan === 'moonloop') drawMoon(c, land ? W * 0.86 : W * 0.8, land ? H * 0.2 : H * 0.18, Math.min(W, H) * 0.07, true, t);
      if (isMars) drawMars(c, land ? W * 0.88 : W * 0.82, land ? H * 0.16 : H * 0.14, Math.min(W, H) * 0.045);
      drawEarth(c, C.x, C.y, R, t);
      c.save(); c.setLineDash([6, 12]); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(C.x, C.y, OR, 0, 7); c.stroke(); c.restore();
      if (ph.step === 'tli') {
        // green arrow at the launch window
        const a = TLI_ANGLE, px = C.x + Math.cos(a) * OR, py = C.y + Math.sin(a) * OR;
        c.save(); c.translate(px, py); c.rotate(a + Math.PI); c.lineWidth = 4; c.strokeStyle = INK;
        c.beginPath(); c.moveTo(-6, -46); c.lineTo(-6, -70); c.lineTo(-18, -70); c.lineTo(4, -94); c.lineTo(26, -70); c.lineTo(14, -70); c.lineTo(14, -46); c.closePath();
        c.fillStyle = ph.inWin || ph.burning ? '#3DDC97' : 'rgba(255,255,255,0.35)'; c.fill(); c.stroke();
        c.restore();
        // power-to-the-moon meter
        drawPowerBar(c, W / 2, Math.max(110, H * 0.13), ph.dv / ph.need, isMars ? 'mars' : 'moon', t);
      }
      if (ph.sat) {
        const sx = C.x + Math.cos(ph.sat.a) * (OR + ph.sat.r), sy = C.y + Math.sin(ph.sat.a) * (OR + ph.sat.r);
        if (b.cargo === 'telescope') drawTelescope(c, sx, sy, 0.45, t); else drawSatellite(c, sx, sy, 0.45, Math.min(1, ph.sat.t), t);
        if (ph.sat.t < 3 && Math.floor(t * 4) % 2) { c.fillStyle = '#FFD60A'; c.font = '900 22px ui-rounded, system-ui'; c.fillText('beep!', sx + 26, sy - 26); }
      }
      drawDebrisScreen(c, t);
      const px = C.x + Math.cos(ph.th) * OR, py = C.y + Math.sin(ph.th) * OR;
      const s = clamp(Math.min(W, H) / 1700, 0.3, 0.6);
      const opts = ph.capsuleOnly ? { capsuleOnly: true } : { from: craft.cur, boosters: !!craft.boosters, cargo: !F.cargoGone };
      const L = rocketLayout(b, opts);
      if (!F.hideCraft) {
        const flame = (ph.step === 'tli' && ph.burning) ? 1 : 0;
        drawRocket(c, b, { ...opts, x: px, y: py + L.height * s / 2, s, angle: ph.th + Math.PI, flame, thruster: ph.step === 'deorbit' && F.boost ? 1 : 0, t, look: 1 });
        F.craftAt = { x: px, y: py };
      }
      if (ph.step === 'deorbit') drawRing(c, W / 2, Math.max(150, H * 0.18), ph.deorb / 1.8, 'home');
    },
  };
  const TLI_ANGLE = Math.PI * 1.25;
  function releaseSat(ph) {
    F.cargoGone = true; sfx.pop(); sfx.beep();
    ph.sat = { t: 0, r: 0, a: ph.th };
    const p = F.craftAt; if (p) { F.debris.push({ kind: 'fairing', x: p.x, y: p.y, vx: -60, vy: -50, rot: 0, vr: 3, s: 1, screen: true, space: true }, { kind: 'fairing', x: p.x, y: p.y, vx: 60, vy: 50, rot: 0, vr: -3, s: 1, screen: true, space: true }); sparkle(p.x, p.y, F.fx); }
    F.collected++;
    say(b.cargo === 'telescope' ? 'Bye bye telescope! Now it can look at faraway stars!' : 'Bye bye satellite! It will help us see the weather and talk to friends!');
    hint(null, '', false);
    ph.step = 'satDone';
  }
  function startDeorbit(ph) {
    // drop the rocket, keep the capsule
    if (!ph.capsuleOnly) {
      const p = F.craftAt; if (p) for (let i = craft.cur; i < craft.stages.length; i++) F.debris.push({ kind: 'stage', idx: i, x: p.x, y: p.y, vx: rand(-40, 40), vy: rand(20, 50), rot: ph.th, vr: 0.6, s: 0.26, screen: true, space: true });
      ph.capsuleOnly = true; sfx.clunk();
    }
    ph.step = 'deorbit'; ph.deorb = 0;
    controls({ boost: true });
    hint('boost', 'Time to come home! Hold the fire button to slow down.');
  }
  function drawRing(c, x, y, f, kind) {
    f = clamp(f, 0, 1);
    c.save(); c.lineCap = 'round';
    c.lineWidth = 16; c.strokeStyle = INK; c.beginPath(); c.arc(x, y, 38, 0, 7); c.stroke();
    c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(x, y, 38, 0, 7); c.stroke();
    c.strokeStyle = '#3DDC97'; c.beginPath(); c.arc(x, y, 38, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); c.stroke();
    if (kind === 'home') { c.save(); c.translate(x - 20, y - 20); c.scale(40 / 64, 40 / 64); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(8, 32); c.lineTo(32, 10); c.lineTo(56, 32); c.lineTo(48, 32); c.lineTo(48, 54); c.lineTo(16, 54); c.lineTo(16, 32); c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); c.restore(); }
    c.restore();
  }
  function drawPowerBar(c, x, y, f, kind, t) {
    f = clamp(f, 0, 1);
    const w = Math.min(420, app.W * 0.5);
    c.save();
    rr(c, x - w / 2, y, w, 30, 15); c.fillStyle = 'rgba(0,0,0,0.4)'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
    if (f > 0) { rr(c, x - w / 2 + 4, y + 4, (w - 8) * f, 22, 11); c.fillStyle = '#FFD23F'; c.fill(); }
    drawEarth(c, x - w / 2 - 6, y + 15, 18, t);
    if (kind === 'moon') drawMoon(c, x + w / 2 + 6, y + 15, 18); else drawMars(c, x + w / 2 + 6, y + 15, 16);
    c.restore();
  }

  // ===================== DOCKING =====================
  P.dock = {
    enter(ph) {
      ph.d = 560; ph.v = 0; ph.docked = false; ph.dt = 0;
      controls({ boost: true });
      hint('boost', 'Hold the fire button to fly to the station. Go slow and gentle!');
    },
    update(ph, dt) {
      if (!ph.docked) {
        if (F.boost) { ph.v = Math.min(170, ph.v + 70 * dt); setEngine(0.4); }
        else { ph.v *= (1 - (ph.d < 160 ? 1.6 : 0.12) * dt); if (ph.d < 160 && ph.v > 0) ph.v = Math.max(ph.v, 30); setEngine(0); }
        ph.d -= ph.v * dt;
        if (ph.d > 700) { ph.d = 700; ph.v = 0; }
        if (ph.d <= 0) {
          if (ph.v <= 55) {
            ph.d = 0; ph.docked = true; ph.v = 0; setEngine(0); controls({});
            sfx.dock(); sfx.chime(); F.collected++;
            toast('DOCKED!');
            say('Docked! Say hi to your friends on the space station!');
            hint(null, '', false);
          } else {
            ph.d = 4; ph.v = -ph.v * 0.35; sfx.boing(); F.shake = 0.35;
            say('Bonk! Too fast! Let go of the button sooner to go gently.');
          }
        }
      } else {
        ph.dt += dt;
        if (ph.dt > 4 && !ph.asked) { ph.asked = true; action('home', () => { ph.undock = 0.001; sfx.clunk(); say('Bye friends! Heading home!'); }); hint('home', 'Tap to fly home!'); }
        if (ph.undock) { ph.undock += dt; ph.d = -ph.undock * 80; if (ph.undock > 2.2) enter('reentry'); }
      }
    },
    draw(ph, c, W, H, t) {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05081F'); g.addColorStop(1, '#141B5E');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      starfield(c, W, H, t, 1, t * 2);
      const R = Math.max(W, H) * 1.5;
      drawEarth(c, W * 0.5, H * 0.92 + R, R, t);
      const s = Math.min(W, H) / 640;
      const sx = W * 0.72, sy = H * 0.42;
      drawStation(c, sx, sy, s, t);
      const portX = sx - 112 * s;
      const capS = s * 1.6;
      const L = rocketLayout(b, { capsuleOnly: true, noLander: true });
      const cx = portX - Math.max(0, ph.d) * s - L.height * capS / 2 + (ph.d < 0 ? ph.d * s : 0);
      if (!F.hideCraft) {
        drawRocket(c, b, { x: cx, y: sy + L.height * capS / 2, s: capS, capsuleOnly: true, noLander: true, angle: Math.PI / 2, t, thruster: 0 });
        if (F.boost && !ph.docked) drawFlame(c, b, cx - L.height * capS / 2 - 4, sy, 18, 0.35, t);
        F.craftAt = { x: cx, y: sy };
      }
      if (ph.docked && ph.dt > 0.6) drawAstronaut(c, sx - 20 * s + Math.sin(t) * 10, sy - 90 * s + Math.cos(t * 0.8) * 8, s * 1.1, { t, wave: true, color: '#FF66C4' });
      if (!ph.docked) {
        // speedometer: turtle (slow) to rabbit (fast)
        const f = clamp(ph.v / 120, 0, 1), mx = W / 2, my = Math.max(180, H * 0.22);
        c.save(); c.lineCap = 'round';
        for (const [a0, a1, col] of [[Math.PI, Math.PI * 1.45, '#3DDC97'], [Math.PI * 1.45, Math.PI * 1.7, '#FFD23F'], [Math.PI * 1.7, Math.PI * 2, '#FF5A5F']]) {
          c.lineWidth = 22; c.strokeStyle = INK; c.beginPath(); c.arc(mx, my, 60, a0, a1); c.stroke();
          c.lineWidth = 14; c.strokeStyle = col; c.beginPath(); c.arc(mx, my, 60, a0, a1); c.stroke();
        }
        const a = Math.PI + f * Math.PI;
        c.lineWidth = 6; c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + Math.cos(a) * 54, my + Math.sin(a) * 54); c.stroke();
        c.beginPath(); c.arc(mx, my, 8, 0, 7); c.fillStyle = '#fff'; c.fill();
        c.restore();
      }
    },
  };

  // ===================== REENTRY =====================
  P.reentry = {
    enter(ph) {
      F.debris = [];
      controls({});
      hint(null, 'Hot hot hot! The heat shield keeps you safe!');
    },
    update(ph, dt) {
      F.shake = Math.max(F.shake, 0.15);
      if (ph.t > 4.6) enter('descent', { h: 1900, vy: -400, x: 0, ground: isMars ? 'mars' : 'sea' });
    },
    draw(ph, c, W, H, t) {
      const k = clamp(ph.t / 4.6, 0, 1);
      const [r, g, bl] = skyColor(1 - k * 0.65);
      c.fillStyle = `rgb(${r},${g},${bl})`; c.fillRect(0, 0, W, H);
      starfield(c, W, H, t, 1 - k, 0);
      c.strokeStyle = 'rgba(255,200,120,0.5)'; c.lineWidth = 4;
      for (let i = 0; i < 14; i++) {
        const x = prand(i) * W, len = 80 + prand(i + 3) * 120;
        const y = ((t * 900 * (0.6 + prand(i + 5))) + prand(i + 8) * H) % (H + len) - len;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.stroke();
      }
      const s = clamp(app.H * 0.32 / 90, 0.6, 1.4);
      const x = W / 2, y = H * 0.5;
      c.save(); c.translate(x, y); c.rotate(Math.sin(t * 7) * 0.04 + 0.3);
      drawGlow(c, 0, 26 * s, 55 * s, t);
      drawRocket(c, b, { x: 0, y: 26 * s, s, capsuleOnly: true, noLander: true, t });
      c.restore();
      F.craftAt = { x, y };
      if (Math.random() < 0.8) puff(x + rand(-30, 30), y + 40, { vx: rand(-80, 80), vy: rand(-300, -200), col: 'rgba(255,170,60,0.8)', r: rand(5, 10), grow: 10, max: 0.6 });
      drawParts(c, F.parts);
    },
  };

  // ===================== CRUISE =====================
  function cruise(to) {
    return {
      enter(ph) {
        ph.p = 0; ph.dur = to === 'mars' ? 7.5 : 6.5;
        ph.stars = [];
        for (let i = 0; i < 5; i++) ph.stars.push({ u: 0.15 + i * 0.17, off: (i % 2 ? 1 : -1) * (40 + prand(i) * 50), got: false });
        controls({});
        if (!F.saidStars) { F.saidStars = true; hint('star', 'Tap the sparkly stars while we fly!'); }
        else hint('star', to === 'earth' ? 'Going home! Tap the stars!' : 'Tap the stars!');
        ph.tap = (x, y) => {
          for (const s of ph.stars) if (!s.got && s.sx != null && Math.hypot(x - s.sx, y - s.sy) < 60) { s.got = true; F.collected++; sfx.star(); sparkle(s.sx, s.sy, F.fx, 14); return; }
        };
      },
      update(ph, dt) { ph.p += dt / ph.dur; if (ph.p >= 1) next(); },
      draw(ph, c, W, H, t) {
        const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#05081F'); g.addColorStop(1, '#1E1460');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        starfield(c, W, H, t, 1, t * 10 * (to === 'earth' ? 1 : -1));
        const m = Math.min(W, H);
        const E = { x: W * 0.14, y: H * 0.72 }, T = { x: W * 0.84, y: H * 0.3 };
        drawEarth(c, E.x, E.y, m * 0.11, t);
        if (to === 'mars' || isMars) drawMars(c, T.x, T.y, m * 0.08); else drawMoon(c, T.x, T.y, m * 0.08, true, t);
        const A = to === 'earth' ? T : E, B = to === 'earth' ? E : T;
        const Cp = { x: (A.x + B.x) / 2 + (to === 'earth' ? 80 : -80), y: Math.min(A.y, B.y) - H * 0.2 };
        const at = u => ({ x: (1 - u) ** 2 * A.x + 2 * (1 - u) * u * Cp.x + u * u * B.x, y: (1 - u) ** 2 * A.y + 2 * (1 - u) * u * Cp.y + u * u * B.y });
        c.save(); c.setLineDash([4, 14]); c.lineCap = 'round'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,214,10,0.6)';
        c.beginPath(); for (let u = 0; u <= 1.001; u += 0.02) { const p = at(u); u === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y); } c.stroke(); c.restore();
        for (const s of ph.stars) {
          if (s.got) { s.sx = null; continue; }
          const p = at(s.u), q = at(Math.min(1, s.u + 0.01));
          const nx = -(q.y - p.y), ny = q.x - p.x, nl = Math.hypot(nx, ny) || 1;
          s.sx = p.x + nx / nl * s.off; s.sy = p.y + ny / nl * s.off + Math.sin(t * 3 + s.u * 9) * 6;
          drawStar(c, s.sx, s.sy, 24 + Math.sin(t * 5 + s.u * 7) * 3, '#FFD60A', INK, 3);
        }
        const e = ph.p < 0.5 ? 2 * ph.p * ph.p : 1 - (-2 * ph.p + 2) ** 2 / 2;
        const p = at(e), q = at(Math.min(1, e + 0.01));
        const ang = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
        const opts = to === 'earth' ? { capsuleOnly: true, noLander: true } : { capsuleOnly: true };
        const L = rocketLayout(b, opts);
        const s = 0.42;
        if (!F.hideCraft) {
          drawRocket(c, b, { ...opts, x: p.x, y: p.y + L.height * s / 2, s, angle: ang, t });
          F.craftAt = { x: p.x, y: p.y };
        }
      },
    };
  }
  P.cruiseOut = cruise(isMars ? 'mars' : 'moon');
  P.cruiseHome = cruise('earth');

  // ===================== MOON FLYBY =====================
  P.flyby = {
    enter(ph) {
      ph.photo = false; ph.pt = 0;
      controls({});
      hint(null, 'We are flying around the back of the Moon!');
    },
    update(ph, dt) {
      if (ph.t > 3.2 && !ph.photo && !ph.asked) { ph.asked = true; action('camera', () => { ph.photo = true; ph.pt = 0; F.flash = 1; sfx.camera(); F.collected++; say('Click! What a beautiful picture of the Earth rising over the Moon!'); hint(null, '', false); }); hint('camera', 'Look, there is the Earth! Tap the camera to take a picture!'); }
      if (ph.photo) ph.pt += dt;
      if ((ph.photo && ph.pt > 4) || ph.t > 16) next();
    },
    draw(ph, c, W, H, t) {
      c.fillStyle = '#05081F'; c.fillRect(0, 0, W, H);
      starfield(c, W, H, t, 1, t * 4);
      const m = Math.min(W, H);
      const mx = W / 2, my = H * 0.56, R = m * 0.3;
      const er = clamp((ph.t - 1.5) / 3, 0, 1);
      drawEarth(c, mx + R * 0.55, my - R * (0.75 + 0.45 * er), m * 0.07, t);
      const a = -Math.PI * 0.9 + ph.t * 0.42;
      const px = mx + Math.cos(a) * R * 1.4, py = my + Math.sin(a) * R * 0.55;
      const behind = Math.sin(a) < 0 && Math.abs(Math.cos(a)) < 0.7;
      const L = rocketLayout(b, { capsuleOnly: true });
      const drawCraft = () => { if (!F.hideCraft) { drawRocket(c, b, { capsuleOnly: true, x: px, y: py + L.height * 0.55 / 2, s: 0.55, angle: a + Math.PI, t }); F.craftAt = { x: px, y: py }; } };
      if (behind) drawCraft();
      drawMoon(c, mx, my, R, false, t);
      if (!behind) drawCraft();
      if (ph.photo) {
        // little photo card
        const k = Math.min(1, ph.pt * 3);
        c.save(); c.translate(W * 0.8, H * 0.7); c.rotate(-0.12); c.scale(k, k);
        const pw = m * 0.3, phh = m * 0.24;
        rr(c, -pw / 2 - 10, -phh / 2 - 10, pw + 20, phh + 44, 6); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
        c.save(); rr(c, -pw / 2, -phh / 2, pw, phh, 3); c.clip();
        c.fillStyle = '#05081F'; c.fillRect(-pw / 2, -phh / 2, pw, phh);
        drawEarth(c, 0, -phh * 0.1, phh * 0.22, t);
        drawMoon(c, 0, phh * 1.3, phh * 1.0, false, t);
        c.restore();
        c.restore();
      }
    },
  };

  // ===================== LANDERS (Moon & Mars) =====================
  function drawLander(c, x, y, s, t, { legs = 1, ascentDy = 0, flame = 0, ascentOnly = false, cabin = true } = {}) {
    c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round';
    if (!ascentOnly) {
      // legs
      for (const sx of [-1, 1]) {
        c.beginPath(); c.moveTo(sx * 22, -26); c.lineTo(sx * (24 + 18 * legs), 0); c.stroke();
        c.beginPath(); c.moveTo(sx * 18, -14); c.lineTo(sx * (24 + 18 * legs), 0); c.stroke();
        rr(c, sx * (24 + 18 * legs) - 8, -3, 16, 5, 2); c.fillStyle = '#ADB5BD'; c.fill(); c.stroke();
      }
      c.beginPath(); c.moveTo(-26, -44); c.lineTo(26, -44); c.lineTo(30, -16); c.lineTo(-30, -16); c.closePath();
      c.fillStyle = '#E9B949'; c.fill(); c.stroke();
      c.strokeStyle = 'rgba(120,80,0,0.5)'; c.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-28, -40 + k * 7); c.lineTo(28, -38 + k * 7); c.stroke(); }
      c.lineWidth = 3; c.strokeStyle = INK;
      c.beginPath(); c.moveTo(-8, -16); c.lineTo(8, -16); c.lineTo(11, -6); c.lineTo(-11, -6); c.closePath(); c.fillStyle = '#5C677D'; c.fill(); c.stroke();
      if (flame > 0) drawFlame(c, b, 0, -6, 18, flame, t);
    }
    if (!cabin) { c.restore(); return; }
    c.translate(0, ascentDy);
    if (ascentOnly && flame > 0) drawFlame(c, b, 0, -44, 14, flame, t);
    c.beginPath(); c.moveTo(-20, -44); c.lineTo(20, -44); c.lineTo(22, -66); c.lineTo(10, -80); c.lineTo(-10, -80); c.lineTo(-22, -66); c.closePath();
    c.fillStyle = lighten(hex(b.color), 0.6); c.fill(); c.stroke();
    c.fillStyle = hex(b.color2); c.fillRect(-19, -52, 38, 5);
    c.beginPath(); c.arc(0, -64, 8, 0, 7); c.fillStyle = '#9EE6FF'; c.fill(); c.stroke();
    c.save(); c.beginPath(); c.arc(0, -64, 8, 0, 7); c.clip(); astronautHead(c, 0, -62, 0.8, t); c.restore();
    c.restore();
  }
  function drawMarsLander(c, x, y, s, t, { flame = 0, rover = true, legs = 1 } = {}) {
    c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round';
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 30, -18); c.lineTo(sx * (34 + 14 * legs), 0); c.stroke(); rr(c, sx * (34 + 14 * legs) - 8, -3, 16, 5, 2); c.fillStyle = '#ADB5BD'; c.fill(); c.stroke(); }
    rr(c, -44, -26, 88, 12, 4); c.fillStyle = '#ADB5BD'; c.fill(); c.stroke();
    for (const sx of [-30, 30]) { if (flame > 0) drawFlame(c, b, sx, -14, 12, flame, t); c.beginPath(); c.moveTo(sx - 5, -14); c.lineTo(sx + 5, -14); c.lineTo(sx + 7, -8); c.lineTo(sx - 7, -8); c.closePath(); c.fillStyle = '#5C677D'; c.fill(); c.stroke(); }
    c.restore();
    if (rover) drawRover(c, x, y - 26 * s - 10 * s * 0.6, s * 0.6, 0, t);
  }

  function landerUpdate(ph, dt, g, onLand) {
    if (ph.landed) return;
    const holding = F.boost && ph.fuel > 0;
    if (holding) { ph.vy += (-16 - ph.vy) * Math.min(1, dt * 2.6); ph.fuel -= dt / 45; }
    else ph.vy -= g * dt;
    ph.vy = Math.max(ph.vy, -130);
    setEngine(holding ? 0.6 : 0);
    ph.vx += (steer() * 90 - ph.vx) * Math.min(1, dt * 2);
    ph.x = clamp(ph.x + ph.vx * dt, -520, 520);
    ph.y += ph.vy * dt;
    if (holding && ph.y < 60) puff(ph.x + rand(-30, 30), 0, { vx: rand(-160, 160), vy: rand(-20, 0), col: ph.dust, r: rand(8, 14) });
    for (const s of ph.stars) if (!s.got && Math.hypot(s.x - ph.x, s.y - (ph.y + 40)) < 55) { s.got = true; F.collected++; sfx.star(); sparkle(s.x, -s.y); }
    if (!holding && ph.y < 110 && ph.vy < -40 && !ph.warned) { ph.warned = true; hint('boost', 'Hold the fire button to slow down!'); }
    if (holding) ph.warned = false;
    if (ph.y <= 0) {
      ph.y = 0; const sp = -ph.vy;
      setEngine(0);
      if (sp <= 40) {
        ph.landed = true; controls({}); sfx.thud();
        for (let i = 0; i < 16; i++) puff(ph.x + rand(-50, 50), -4, { vx: rand(-140, 140), vy: rand(-50, -5), col: ph.dust, r: rand(8, 16) });
        const onPad = Math.abs(ph.x - ph.padX) < 70;
        if (onPad) { F.collected++; sparkle(ph.padX, -10); }
        onLand(onPad);
      } else {
        crash('Bump! That was too fast. Hold the fire button longer to land gently. Let\'s try again!');
      }
    }
  }
  function moonScene(c, W, H, t, camX) {
    c.fillStyle = '#05081F'; c.fillRect(0, 0, W, H);
    starfield(c, W, H, t, 1, -camX * 0.05);
    drawEarth(c, W * 0.18, H * 0.2, Math.min(W, H) * 0.07, t);
    const gy = H * 0.8;
    c.fillStyle = '#9E9E9E';
    c.beginPath(); c.moveTo(0, gy - 40);
    for (let x = 0; x <= W + 30; x += 30) c.lineTo(x, gy - 50 - 25 * Math.sin((x + camX * 0.4) * 0.008));
    c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    c.fillStyle = '#C8C8C8'; c.fillRect(0, gy, W, H - gy);
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke();
    c.save(); c.translate(W / 2 - camX, 0);
    for (let i = -8; i < 8; i++) { const x = i * 170 + prand(i + 30) * 60; c.beginPath(); c.ellipse(x, gy + 26 + prand(i) * 30, 30 + prand(i + 2) * 20, 7, 0, 0, 7); c.fillStyle = '#A9A9A9'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(27,31,59,0.4)'; c.stroke(); }
    c.restore();
    return gy;
  }
  function marsScene(c, W, H, t, camX) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#E8B07A'); g.addColorStop(1, '#F3D2A2');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalAlpha = 0.9; c.fillStyle = '#fff'; c.beginPath(); c.arc(W * 0.85, H * 0.18, 18, 0, 7); c.fill(); c.globalAlpha = 1;
    const gy = H * 0.8;
    c.fillStyle = '#C1653A';
    c.beginPath(); c.moveTo(0, gy);
    for (let x = 0; x <= W + 30; x += 30) c.lineTo(x, gy - 70 - 40 * Math.sin((x + camX * 0.3) * 0.006) - 20 * Math.sin((x + camX * 0.3) * 0.02));
    c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    c.fillStyle = '#D9774A'; c.fillRect(0, gy, W, H - gy);
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke();
    c.save(); c.translate(W / 2 - camX, 0);
    for (let i = -10; i < 14; i++) { const x = i * 130 + prand(i + 60) * 60; rr(c, x, gy + 10 + prand(i) * 40, 16 + prand(i + 1) * 20, 10 + prand(i + 2) * 10, 5); c.fillStyle = '#A0522D'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(27,31,59,0.5)'; c.stroke(); }
    c.restore();
    return gy;
  }
  function landerStars(n, top) { const out = []; for (let i = 0; i < n; i++) out.push({ x: (prand(i + 11) - 0.5) * 360, y: top * (0.3 + 0.2 * i), got: false }); return out; }

  // ===================== MOON LANDING =====================
  P.moonland = {
    enter(ph) {
      Object.assign(ph, { x: -180, y: 440, vx: 40, vy: -30, fuel: 1, landed: false, padX: 60, dust: 'rgba(200,200,200,0.7)', camX: 0 });
      ph.stars = landerStars(3, 440);
      F.checkpoint = { name: 'moonland', opts: {} };
      controls({ boost: true, steer: true });
      hint('boost', 'Land on the Moon! Hold the fire button to slow down. Try to land on the yellow target!');
    },
    update(ph, dt) {
      landerUpdate(ph, dt, 14, onPad => {
        toast('MOON!'); sfx.fanfare();
        say(onPad ? 'Right on the target! The Eagle has landed!' : 'Touchdown on the Moon! Great landing!');
        setTimeout(() => F.phase === 'moonland' && next({ x: ph.x }), 2200);
      });
      ph.camX += (ph.x - ph.camX) * Math.min(1, dt * 2);
    },
    draw(ph, c, W, H, t) {
      const gy = moonScene(c, W, H, t, ph.camX);
      const k = H * 0.62 / 460;
      c.save(); c.translate(W / 2 - ph.camX * k, gy); c.scale(k, k);
      // target pad
      c.beginPath(); c.ellipse(ph.padX, 2, 70, 12, 0, 0, 7); c.fillStyle = '#FFD23F'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.ellipse(ph.padX, 2, 34, 6, 0, 0, 7); c.fillStyle = '#FF5A5F'; c.fill();
      for (const s of ph.stars) if (!s.got) drawStar(c, s.x, -s.y + Math.sin(t * 3 + s.x) * 6, 20, '#FFD60A', INK, 3);
      drawParts(c, F.parts);
      if (!F.hideCraft) drawLander(c, ph.x, -ph.y, 1.6, t, { flame: F.boost && ph.fuel > 0 && !ph.landed ? 0.7 : 0 });
      c.restore();
      F.craftAt = { x: W / 2 + (ph.x - ph.camX) * k, y: gy - (ph.y + 50) * k };
      // fuel bar
      rr(c, W - 70, H * 0.2, 30, H * 0.4, 14); c.fillStyle = 'rgba(0,0,0,0.4)'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
      const fh = (H * 0.4 - 8) * clamp(ph.fuel, 0, 1);
      rr(c, W - 66, H * 0.2 + 4 + (H * 0.4 - 8 - fh), 22, fh, 10); c.fillStyle = '#FFB703'; c.fill();
    },
  };

  // ===================== MOON WALK =====================
  P.moonwalk = {
    enter(ph, o) {
      ph.lx = o.x ?? 0; ph.ax = ph.lx; ph.flag = 0; ph.jy = 0; ph.jv = 0; ph.step = 'walk'; ph.up = 0; ph.camX = ph.lx;
      controls({});
      say('One small step for you, one giant leap for Rocket Kids!');
      ph.tap = (x, y) => { if (ph.step !== 'up' && ph.jy <= 0 && ph.ax > ph.lx + 20) { ph.jv = 150; sfx.boing(); } };
    },
    update(ph, dt) {
      if (ph.step === 'walk') { ph.ax = Math.min(ph.lx + 110, ph.ax + 40 * dt); if (ph.t > 3) { ph.step = 'flag?'; action('flag', () => { ph.step = 'flag'; ph.ft = 0; sfx.chime(); F.collected++; say('You planted your flag on the Moon! Tap the astronaut to make them jump!'); hint(null, '', false); }); hint('flag', 'Tap the flag button to plant your flag!'); } }
      if (ph.step === 'flag') { ph.flag = Math.min(1, ph.flag + dt); ph.ft += dt; if (ph.ft > 5 && !ph.asked) { ph.asked = true; action('liftoff', () => { ph.step = 'up'; ph.up = 0; sfx.whoosh(); say('Blast off! Back to Earth!'); hint(null, '', false); }); hint('liftoff', 'Tap the rocket button to fly home!'); } }
      if (ph.jy > 0 || ph.jv > 0) { ph.jv -= 70 * dt; ph.jy = Math.max(0, ph.jy + ph.jv * dt); if (ph.jy === 0) ph.jv = 0; }
      if (ph.step === 'up') { ph.up += dt; setEngine(0.8); if (ph.up > 3) { setEngine(0); next(); } }
    },
    draw(ph, c, W, H, t) {
      const gy = moonScene(c, W, H, t, ph.camX);
      const k = H * 0.62 / 460;
      c.save(); c.translate(W / 2 - ph.camX * k, gy); c.scale(k, k);
      drawParts(c, F.parts);
      if (ph.flag > 0) drawFlag(c, ph.lx + 200, 0, 1.5, b, t, ph.flag);
      drawLander(c, ph.lx, 0, 1.6, t, { cabin: ph.step !== 'up' });
      if (ph.step === 'up') drawLander(c, ph.lx, -ph.up * ph.up * 90 * 1.6, 1.6, t, { ascentOnly: true, flame: 0.9 });
      if (ph.step !== 'up') drawAstronaut(c, ph.ax + 50, -ph.jy, 1.4, { t, walk: ph.step === 'walk' ? t * 6 : 0, wave: ph.step === 'flag', color: hex(b.color) });
      c.restore();
      F.craftAt = { x: W / 2, y: gy - 60 };
    },
  };

  // ===================== MARS LANDING =====================
  P.marsland = {
    enter(ph) {
      Object.assign(ph, { x: -80, y: 900, vx: 20, vy: -160, fuel: 1, landed: false, padX: 120, dust: 'rgba(200,110,70,0.7)', step: 'entry', chute: 0, camX: 0 });
      ph.stars = landerStars(3, 380);
      F.checkpoint = { name: 'marsland', opts: {} };
      controls({});
      hint(null, 'Here comes Mars! Hot hot hot!');
    },
    update(ph, dt) {
      if (ph.step === 'entry') {
        ph.y += ph.vy * dt; F.shake = Math.max(F.shake, 0.12);
        if (ph.t > 2.2) { ph.step = 'chute?'; action('chute', () => { ph.step = 'chute'; sfx.chute(); say('Parachute open!'); hint(null, '', false); }); hint('chute', 'Tap the parachute!'); }
      } else if (ph.step === 'chute?') {
        ph.vy = Math.max(-150, ph.vy - 6 * dt); ph.y += ph.vy * dt;
        if (ph.y < 300) F.timeScale = 0.35;
        if (ph.y <= 0) { F.timeScale = 1; crash('Bonk! We forgot the parachute. Let\'s try again!'); }
      } else if (ph.step === 'chute') {
        F.timeScale = 1;
        ph.chute = Math.min(1, ph.chute + dt * 1.5);
        ph.vy += (-45 - ph.vy) * Math.min(1, dt * 2); ph.y += ph.vy * dt;
        if (ph.y < 300 && ph.chute >= 1 && ph.vy > -70) {
          ph.step = 'land'; sfx.whoosh(); ph.cutT = 0;
          controls({ boost: true, steer: true });
          hint('boost', 'Now hold the fire button and land softly on Mars!');
        }
      } else if (ph.step === 'land') {
        ph.cutT += dt;
        landerUpdate(ph, dt, 16, onPad => {
          toast('MARS!'); sfx.fanfare();
          say(onPad ? 'Right on target! We landed on Mars!' : 'We landed on Mars! Amazing!');
          setTimeout(() => F.phase === 'marsland' && next({ x: ph.x }), 2200);
        });
      }
      ph.camX += (ph.x - ph.camX) * Math.min(1, dt * 2);
    },
    draw(ph, c, W, H, t) {
      const gy = marsScene(c, W, H, t, ph.camX);
      const k = H * 0.6 / 580;
      const camY = Math.max(0, ph.y - 480);
      c.save(); c.translate(W / 2 - ph.camX * k, gy + camY * k); c.scale(k, k);
      c.beginPath(); c.ellipse(ph.padX, 2, 70, 12, 0, 0, 7); c.fillStyle = '#FFD23F'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      for (const s of ph.stars) if (!s.got && ph.step === 'land') drawStar(c, s.x, -s.y + Math.sin(t * 3 + s.x) * 6, 20, '#FFD60A', INK, 3);
      drawParts(c, F.parts);
      if (!F.hideCraft) {
        if (ph.step === 'land') {
          // aeroshell & chute fly away
          const a = ph.cutT;
          if (a < 2.5) { drawChutes(c, b, ph.x + a * 120, -ph.y - 80 - a * 160, 1, 1, t); drawRocket(c, b, { x: ph.x - a * 60, y: -ph.y + a * a * 120, s: 1.1, capsuleOnly: true, angle: a * 0.6, t }); }
          drawMarsLander(c, ph.x, -ph.y, 1.7, t, { flame: F.boost && ph.fuel > 0 && !ph.landed ? 0.7 : 0 });
        } else {
          const L = rocketLayout(b, { capsuleOnly: true });
          if (ph.step === 'chute') drawChutes(c, b, ph.x, -ph.y - L.height * 1.2, 1.2, ph.chute, t);
          if (ph.step === 'entry') drawGlow(c, ph.x, -ph.y, 60, t);
          drawRocket(c, b, { x: ph.x, y: -ph.y, s: 1.2, capsuleOnly: true, t });
        }
      }
      c.restore();
      F.craftAt = { x: W / 2 + (ph.x - ph.camX) * k, y: gy - (ph.y - camY + 40) * k };
    },
  };

  // ===================== MARS ROVER =====================
  P.rover = {
    enter(ph, o) {
      ph.lx = o.x ?? 0; ph.rx = ph.lx; ph.v = 0; ph.wheel = 0; ph.found = 0; ph.camX = ph.lx; ph.roll = 0;
      ph.rocks = [ph.lx + 300, ph.lx - 340, ph.lx + 680].map(x => ({ x, got: false }));
      controls({ steer: true });
      hint('right', 'Drive the rover and find 3 shiny rocks!');
    },
    update(ph, dt) {
      if (ph.roll < 1) { ph.roll += dt * 0.7; return; }
      ph.v += (steer() * 130 - ph.v) * Math.min(1, dt * 3);
      ph.rx = clamp(ph.rx + ph.v * dt, ph.lx - 600, ph.lx + 900);
      ph.wheel += ph.v * dt / 10;
      setEngine(Math.abs(ph.v) > 5 ? 0.15 : 0);
      for (const r of ph.rocks) if (!r.got && Math.abs(r.x - ph.rx) < 40) {
        r.got = true; ph.found++; F.collected++; sfx.star(); sparkle(r.x, -20);
        say(['Ooh, a shiny rock!', 'Another one! So sparkly!', 'A Mars treasure! You found them all!'][ph.found - 1]);
        if (ph.found === 3) { ph.doneT = 0.001; controls({}); toast('TREASURE!'); sfx.fanfare(); }
      }
      if (ph.doneT) { ph.doneT += dt; if (ph.doneT > 3 && !ph.done) { ph.done = true; finish(); } }
      ph.camX += (ph.rx - ph.camX) * Math.min(1, dt * 3);
    },
    draw(ph, c, W, H, t) {
      const gy = marsScene(c, W, H, t, ph.camX);
      const k = H * 0.6 / 580;
      c.save(); c.translate(W / 2 - ph.camX * k, gy); c.scale(k, k);
      drawMarsLander(c, ph.lx, 0, 1.7, t, { rover: false });
      for (const r of ph.rocks) {
        if (r.got) continue;
        c.save(); c.translate(r.x, -18); c.scale(1.6, 1.6);
        c.beginPath(); c.moveTo(-18, 10); c.lineTo(-10, -12); c.lineTo(6, -16); c.lineTo(18, 0); c.lineTo(12, 10); c.closePath();
        c.fillStyle = ['#4CC9F0', '#FF66C4', '#80ED99'][ph.rocks.indexOf(r)]; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
        c.restore();
        drawStar(c, r.x + 26, -56 + Math.sin(t * 4 + r.x) * 4, 11 + Math.sin(t * 6 + r.x) * 3, '#fff', null);
      }
      drawParts(c, F.parts);
      const ry = ph.roll < 1 ? -26 * 1.7 * (1 - ph.roll) : 0;
      drawRover(c, ph.roll < 1 ? ph.lx + ph.roll * 90 : ph.rx, ry, 1.6, ph.wheel, t);
      c.restore();
      F.craftAt = { x: W / 2, y: gy - 40 };
    },
  };

  // ---------- crash / boom / finish ----------
  function explode(x, y, big = true) {
    sfx.boom(); F.shake = 0.9; F.flash = 0.8;
    const cols = [hex(b.color), hex(b.color2), '#FFD60A', '#FF66C4', '#4CC9F0', '#80ED99'];
    for (let i = 0; i < (big ? 46 : 26); i++) F.fx.push({ x, y, vx: rand(-420, 420), vy: rand(-480, 220), life: 0, max: rand(1.2, 2.4), r: rand(8, 16), grow: -2, col: cols[i % cols.length], kind: 'confetti', rot: rand(0, 6), vr: rand(-10, 10), g: 380 });
    for (let i = 0; i < 18; i++) F.fx.push({ x: x + rand(-30, 30), y: y + rand(-30, 30), vx: rand(-120, 120), vy: rand(-120, 60), life: 0, max: rand(1.2, 2.2), r: rand(20, 40), grow: 50, col: i % 3 ? 'rgba(240,240,240,0.9)' : 'rgba(255,170,40,0.95)', kind: 'smoke', rot: 0, vr: 0 });
    for (let i = 0; i < 8; i++) F.fx.push({ x, y, vx: rand(-300, 300), vy: rand(-400, -100), life: 0, max: 2.2, r: rand(8, 14), grow: 0, col: cols[i % 2], kind: 'piece', rot: 0, vr: rand(-8, 8), g: 500 });
    F.kaboom = { x, y, t: 0 };
  }
  function boom() {
    if (F.frozen || F.ended) return;
    const p = F.craftAt || { x: app.W / 2, y: app.H / 2 };
    F.frozen = true; F.hideCraft = true; setEngine(0); noAction(); controls({}); hint(null, '', false);
    explode(p.x, p.y, true);
    hush(); setTimeout(() => say('Ka-boom! Hee hee! Don\'t worry, the astronaut is safe!'), 400);
    F.escape = { x: p.x, y: p.y, t: 0, chute: 0 };
    setTimeout(() => {
      if (F.ended) return;
      F.ended = true;
      showCard({
        title: 'KA-BOOM!', text: 'What a silly explosion! The astronaut floated down safely.',
        buttons: [
          ['red', 'retry', 'Fly again', () => app.go('flight', params)],
          ['blue', 'wrench', 'Build', () => app.go('hangar', { mission: mi })],
          ['white', 'home', 'Map', () => app.go('map')],
        ],
      });
    }, 3600);
  }
  function crash(text) {
    const p = F.craftAt || { x: app.W / 2, y: app.H * 0.6 };
    F.frozen = true; setEngine(0); noAction(); controls({}); hint(null, '', false);
    F.oops++;
    if (state.settings.boomCrash) { F.hideCraft = true; explode(p.x, p.y, false); F.escape = { x: p.x, y: p.y, t: 0, chute: 0, ground: true }; }
    else { sfx.oops(); sfx.boing(); F.shake = 0.5; F.dizzy = { x: p.x, y: p.y - 30, t: 0 }; }
    setTimeout(() => say(text), state.settings.boomCrash ? 500 : 200);
    setTimeout(() => {
      showCard({
        title: 'Oops!', text: 'Everyone is okay! Let\'s try that part again.',
        buttons: [
          ['green pulse', 'retry', 'Try again', () => retry()],
          ['blue', 'wrench', 'Build', () => app.go('hangar', { mission: mi })],
          ['white', 'home', 'Map', () => app.go('map')],
        ],
      });
    }, 2600);
  }
  function retry() {
    closeCard();
    F.frozen = false; F.hideCraft = false; F.fx = []; F.escape = null; F.dizzy = null; F.kaboom = null;
    const cp = F.checkpoint;
    if (cp) enter(cp.name, cp.opts); else app.go('flight', params);
  }
  function endEarly(text) {
    if (F.ended) return;
    F.frozen = true; setEngine(0); controls({}); noAction();
    say(text);
    setTimeout(() => finish(), 1800);
  }

  let card = null;
  function closeCard() { if (card) { card.close(); card = null; } }
  function showCard({ title, text, stars = null, buttons, extra }) {
    closeCard();
    const row = h('div', { class: 'row' });
    for (const [cls, ic, label, fn] of buttons) row.append(btn(cls, ic, label, fn));
    const st = stars != null ? h('div', { class: 'big-stars' }, ...[0, 1, 2].map(i => h('i', { html: i < stars ? ICON.star : ICON.starEmpty }))) : null;
    card = modal(h('div', { class: 'card' }, h('h1', {}, title), st, text ? h('p', {}, text) : null, extra || null, row));
  }

  function finish() {
    if (F.finished) return;
    F.finished = true; F.ended = true; setEngine(0); controls({}); noAction(); hint(null, '', false);
    if (F.failed) {
      const k = F.failed.kind;
      const msg = k === 'heavy' ? 'The rocket was too heavy to lift off. Try a bigger bottom stage!' :
        k === 'hold' ? 'Remember to hold the fire button the whole time!' :
          'Add more stages or bigger stages to go farther!';
      sfx.oops();
      say('Almost! ' + msg);
      showCard({
        title: 'Almost!', text: msg,
        buttons: [
          ['green pulse', 'wrench', 'Build', () => app.go('hangar', { mission: mi, tab: 'stage' })],
          ['red', 'retry', 'Fly again', () => app.go('flight', params)],
          ['white', 'home', 'Map', () => app.go('map')],
        ],
      });
      return;
    }
    if (!M) {
      sfx.fanfare(); say('What a flight! You collected ' + F.collected + (F.collected === 1 ? ' star!' : ' stars!'));
      showCard({
        title: 'What a flight!', stars: Math.min(3, 1 + (F.collected >= 3 ? 1 : 0) + (F.collected >= 6 ? 1 : 0)),
        buttons: [
          ['red', 'retry', 'Fly again', () => app.go('flight', params)],
          ['blue', 'wrench', 'Build', () => app.go('hangar', { mission: -1 })],
          ['white', 'home', 'Map', () => app.go('map')],
        ],
      });
      return;
    }
    const stars = 1 + (F.collected >= 3 ? 1 : 0) + (F.oops === 0 ? 1 : 0);
    const before = level();
    state.stars[M.id] = Math.max(state.stars[M.id] || 0, stars);
    if (mi >= state.done) state.done = mi + 1;
    const after = level();
    save();
    const unlocks = newUnlocks(before, after);
    sfx.fanfare();
    for (let i = 0; i < 40; i++) F.fx.push({ x: app.W / 2, y: app.H * 0.3, vx: rand(-500, 500), vy: rand(-600, -100), life: 0, max: rand(1.5, 2.5), r: rand(8, 14), grow: 0, col: ['#FFD60A', '#FF66C4', '#4CC9F0', '#80ED99', '#F94144'][i % 5], kind: 'confetti', rot: 0, vr: rand(-8, 8), g: 500 });
    say(M.win + (stars === 3 ? ' Three stars!' : ''));
    const goNext = () => {
      if (unlocks.length) showUnlocks(unlocks); else app.go('map');
    };
    showCard({
      title: mi === MISSIONS.length - 1 ? 'You did it all!' : 'Mission complete!', stars, text: M.name,
      buttons: [
        ['green pulse', 'next', 'Next', goNext],
        ['red', 'retry', 'Again', () => app.go('flight', params)],
        ['blue', 'wrench', 'Build', () => app.go('hangar', { mission: mi })],
      ],
    });
  }
  function showUnlocks(list) {
    const grid = h('div', { class: 'unlock-grid' });
    list.forEach((u, i) => {
      const t = h('div', { class: 'tile', style: { animationDelay: (i * 0.12) + 's' } });
      if (u.cat === 'slots') { t.innerHTML = ICON.plus.replace('#fff', '#FFD60A'); t.style.padding = '18px'; }
      else {
        const cv = document.createElement('canvas'); cv.width = 104 * app.dpr; cv.height = 104 * app.dpr;
        const c = cv.getContext('2d'); c.scale(app.dpr, app.dpr); drawThumb(c, u.cat, u.item, state.build, 104, 0.2); t.append(cv);
      }
      grid.append(t);
    });
    const names = list.map(u => u.item.name);
    say('New rocket parts! ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1] : names[0]) + '!');
    sfx.chime();
    showCard({
      title: 'New parts!', extra: grid,
      buttons: [
        ['green pulse', 'wrench', 'Try them', () => app.go('hangar', { mission: Math.min(state.done, MISSIONS.length - 1) })],
        ['white', 'home', 'Map', () => app.go('map')],
      ],
    });
  }

  // ---------- canvas taps ----------
  const onCanvasDown = e => {
    if (F.frozen) return;
    const ph = F.ph;
    if (ph && ph.tap) ph.tap(e.clientX, e.clientY);
  };
  app.canvas.addEventListener('pointerdown', onCanvasDown);

  enter(seq[0]);
  if (params.weak) setTimeout(() => say('Hmm, this rocket might need more power. Let\'s try it!', { interrupt: false }), 2500);

  return {
    exit() { app.canvas.removeEventListener('pointerdown', onCanvasDown); setEngine(0); closeCard(); },
    pause() { F.boost = false; F.left = F.right = false; [boostB, leftB, rightB].forEach(x => x.release && x.release()); },
    update(dt) {
      F.t += dt;
      const sdt = dt * F.timeScale;
      if (!F.frozen) {
        F.ph.t += dt;
        P[F.phase].update(F.ph, dt, sdt);
      } else setEngine(0);
      updParts(F.parts, sdt);
      updParts(F.fx, dt);
      updDebris(sdt);
      F.shake = Math.max(0, F.shake - dt);
      F.flash = Math.max(0, F.flash - dt * 2);
      if (F.kaboom) F.kaboom.t += dt;
      if (F.escape) {
        const e = F.escape; e.t += dt;
        if (e.ground) { e.y = e.y; }
        else if (e.t < 0.6) e.y -= 380 * dt;
        else { e.chute = Math.min(1, e.chute + dt * 2); e.y += 60 * dt; e.x += Math.sin(e.t) * 20 * dt; }
      }
      if (F.dizzy) F.dizzy.t += dt;
    },
    draw(c, W, H, t) {
      c.save();
      if (F.shake > 0) c.translate(rand(-1, 1) * 10 * F.shake, rand(-1, 1) * 10 * F.shake);
      P[F.phase].draw(F.ph, c, W, H, t);
      // explosion & effects in screen space
      drawParts(c, F.fx);
      if (F.escape) {
        const e = F.escape;
        if (e.ground) drawAstronaut(c, e.x + Math.min(1, e.t) * 50, e.y + 30, 1, { t, wave: e.t > 0.8, color: hex(b.color) });
        else {
          const L = rocketLayout(b, { capsuleOnly: true, noLander: true });
          const s = 0.7;
          drawChutes(c, b, e.x, e.y - L.height * s, s, e.chute, t);
          drawRocket(c, b, { x: e.x, y: e.y, s, capsuleOnly: true, noLander: true, t, thruster: e.t < 0.8 ? 1 : 0 });
        }
      }
      if (F.dizzy) {
        const d = F.dizzy;
        for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; drawStar(c, d.x + Math.cos(a) * 46, d.y + Math.sin(a) * 14, 11, '#FFD60A', INK, 2); }
      }
      if (F.kaboom && F.kaboom.t < 2.2) {
        const k = F.kaboom, sc = Math.min(1.2, k.t * 6) * (1 + 0.05 * Math.sin(k.t * 30));
        c.save(); c.translate(clamp(k.x, 180, W - 180), clamp(k.y - 60, 100, H - 100)); c.rotate(-0.12); c.scale(sc, sc);
        c.globalAlpha = clamp((2.2 - k.t) / 0.6, 0, 1);
        drawStar(c, 0, 0, 120, '#FFD60A', INK, 6);
        c.font = '900 56px ui-rounded, "Arial Rounded MT Bold", system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 10; c.strokeStyle = INK; c.strokeText('BOOM!', 0, 4); c.fillStyle = '#F94144'; c.fillText('BOOM!', 0, 4);
        c.restore();
      }
      c.restore();
      if (F.flash > 0) { c.fillStyle = `rgba(255,255,255,${F.flash})`; c.fillRect(0, 0, W, H); }
    },
  };
}
