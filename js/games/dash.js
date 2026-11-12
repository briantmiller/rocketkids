// Star Dash: steer the rocket through space, catch stars, dodge space rocks.
import { gameShell } from './common.js';
import { Fx, rand, clamp, rng, drawRock } from '../fx.js';
import { say } from '../voice.js';
import { sfx, setEngine } from '../audio.js';
import { state } from '../state.js';
import { toast } from '../ui.js';
import { drawRocket, rocketLayout, drawStar, drawMoon, drawMars, drawPlanet, INK, hex } from '../draw.js';
import { starfield, spaceGradient } from '../bg.js';
import { ICON } from '../icons.js';

// speed (units/s), rows, gap between rows, rocks per row, sway = rocks that slide, comets, dest
const LEVELS = [
  { speed: 230, rows: 14, gap: 300, rocks: [0, 1], dest: 'moon', win: 'You made it to the Moon!', line: 'Slide your finger to steer. Catch the stars!' },
  { speed: 250, rows: 16, gap: 290, rocks: [1, 1], dest: 'mars', win: 'You made it to Mars!', line: 'Dodge the space rocks and catch the stars!' },
  { speed: 275, rows: 18, gap: 275, rocks: [1, 2], dest: 'venus', win: 'You made it to Venus!', line: 'More rocks this time. Zoom around them!' },
  { speed: 295, rows: 20, gap: 265, rocks: [1, 2], sway: 0.3, dest: 'jupiter', win: 'You made it to Jupiter, the biggest planet!', line: 'Careful, some rocks are sliding!' },
  { speed: 315, rows: 22, gap: 255, rocks: [1, 2], sway: 0.4, shield: true, dest: 'saturn', win: 'You made it to Saturn! Look at those rings!', line: 'Grab a heart bubble if you get bumped!' },
  { speed: 335, rows: 24, gap: 245, rocks: [2, 2], sway: 0.4, comets: 0.25, shield: true, dest: 'uranus', win: 'You made it to Uranus!', line: 'Look out for zooming comets!' },
  { speed: 360, rows: 26, gap: 235, rocks: [2, 3], sway: 0.5, comets: 0.3, shield: true, dest: 'neptune', win: 'You made it to Neptune, the blue planet!', line: 'Faster and faster! You are a super pilot!' },
  { speed: 385, rows: 30, gap: 225, rocks: [2, 3], sway: 0.6, comets: 0.4, shield: true, dest: 'pluto', win: 'You flew all the way to Pluto! Amazing!', line: 'The last one! Fly all the way to tiny Pluto!' },
];
const VW = 640, LANES = 5;

export function dashGame(app, { level = 0, tries = 0 }) {
  const L = LEVELS[level];
  const S = gameShell(app, 'dash', level, tries, { steer: true, hearts: 3 });
  const fx = new Fx();
  const b = state.build;
  const R = rng(level * 97 + 13);
  const speed = L.speed * (1 - S.ease * 0.08);
  const laneX = i => (i - (LANES - 1) / 2) * (VW / LANES);
  // Build the whole course up front.
  const objs = []; let totalStars = 0;
  // star lanes stay within one step of each other, so there is always a path
  const lanes = []; for (let r = 0, prev = 2; r <= L.rows; r++) { prev = clamp(prev + Math.floor(R() * 3) - 1, 0, LANES - 1); lanes.push(prev); }
  for (let r = 0; r < L.rows; r++) {
    const y = 700 + r * L.gap;
    let nR = L.rocks[0] + Math.floor(R() * (L.rocks[1] - L.rocks[0] + 1));
    if (r < 2) nR = Math.min(nR, 1);
    if (S.ease >= 2) nR = Math.max(0, nR - 1);
    // rocks never sit in this row's star lane or the next one, so heading for the next star is safe
    const sl = lanes[r];
    const free = [0, 1, 2, 3, 4].filter(i => i !== sl && i !== lanes[r + 1]);
    for (let n = 0; n < nR && free.length; n++) {
      const li = free.splice(Math.floor(R() * free.length), 1)[0];
      const sway = L.sway && R() < L.sway && Math.abs(li - sl) > 1;
      objs.push({ kind: 'rock', x: laneX(li), y: y + (R() - 0.5) * 40, r: 36 + R() * 12, seed: r * 7 + n, sway: sway ? (R() < 0.5 ? -1 : 1) * 40 : 0, ph: R() * 6 });
    }
    objs.push({ kind: 'star', x: laneX(sl), y }); totalStars++;
    if (R() < 0.45) { objs.push({ kind: 'star', x: laneX(sl), y: y + L.gap * 0.5 }); totalStars++; }
    if (L.shield && r > 3 && r % 9 === 5) objs.push({ kind: 'heart', x: laneX(free.length ? free[0] : sl), y: y + L.gap * 0.5 });
    if (L.comets && r > 2 && R() < L.comets) { const dir = R() < 0.5 ? -1 : 1; objs.push({ kind: 'comet', x: -dir * 520, y: y + L.gap * 0.5 + 330, vx: dir * 230, r: 26 }); }
  }
  const endY = 700 + L.rows * L.gap + 500;
  const ship = { x: 0, tx: 0, inv: 0, tilt: 0 };
  let dist = 0, got = 0, shake = 0, started = false, done = false, doneT = 0, pointer = null;
  const Lr = rocketLayout(b, {});
  S.hint('star', L.line);
  app.dbg = { ship, objs, S, L, dist: () => dist, VW };

  let k = 1, W = app.W, H = app.H, baseY = 0;
  const sx = x => W / 2 + x * k, sy = y => baseY - (y - dist) * k;
  const onDown = e => { pointer = e.pointerId; ship.tx = clamp((e.clientX - W / 2) / k, -VW / 2 + 30, VW / 2 - 30); started = true; };
  const onMove = e => { if (e.pointerId === pointer) ship.tx = clamp((e.clientX - W / 2) / k, -VW / 2 + 30, VW / 2 - 30); };
  const onUp = e => { if (e.pointerId === pointer) pointer = null; };
  app.canvas.addEventListener('pointerdown', onDown); app.canvas.addEventListener('pointermove', onMove);
  app.canvas.addEventListener('pointerup', onUp); app.canvas.addEventListener('pointercancel', onUp);

  return {
    exit() {
      S.exit(); app.canvas.removeEventListener('pointerdown', onDown); app.canvas.removeEventListener('pointermove', onMove);
      app.canvas.removeEventListener('pointerup', onUp); app.canvas.removeEventListener('pointercancel', onUp);
    },
    pause() { S.release(); },
    update(dt) {
      fx.update(dt); shake = Math.max(0, shake - dt);
      if (S.over && !done) { setEngine(0); return; }
      const v = done ? speed * Math.max(0, 1 - doneT * 0.6) : speed;
      dist += v * dt;
      setEngine(S.over ? 0 : 0.35);
      if (S.steer()) { ship.tx = clamp(ship.x + S.steer() * 200, -VW / 2 + 30, VW / 2 - 30); started = true; }
      const dx = ship.tx - ship.x, step = 620 * dt;
      const mv = Math.abs(dx) < step ? dx : Math.sign(dx) * step;
      ship.x += mv; ship.tilt += (clamp(dx * 0.004, -0.35, 0.35) - ship.tilt) * Math.min(1, dt * 10);
      ship.inv = Math.max(0, ship.inv - dt);
      if (Math.random() < 0.6) fx.puff(sx(ship.x) + rand(-6, 6), baseY + 20, { vy: 220, vx: rand(-20, 20), r: rand(5, 9), grow: 16, max: 0.5, col: 'rgba(255,255,255,0.5)' });
      if (done) { doneT += dt; return; }
      S.progress(dist / (endY - 300));
      const shipY = dist + 60;
      for (const o of objs) {
        if (o.gone) continue;
        if (o.kind === 'comet') { if (o.y - dist < 1000) o.x += o.vx * dt; }
        const ox = o.x + (o.sway ? Math.sin(dist * 0.006 + o.ph) * o.sway : 0);
        if (o.y < dist - 200) { o.gone = true; continue; }
        const d = Math.hypot(ox - ship.x, o.y - shipY);
        if (o.kind === 'star' && d < 62) { o.gone = true; got++; sfx.star(); fx.sparkle(sx(ox), sy(o.y), 8); }
        else if (o.kind === 'heart' && d < 62) { o.gone = true; S.heal(); sfx.shield(); fx.sparkle(sx(ox), sy(o.y), 12); say('A heart bubble! Yay!', { interrupt: false }); }
        else if ((o.kind === 'rock' || o.kind === 'comet') && ship.inv <= 0 && d < o.r + 26) {
          o.gone = true; ship.inv = 1.6; shake = 0.4; sfx.bonk();
          for (let i = 0; i < 10; i++) fx.puff(sx(ox), sy(o.y), { vx: rand(-200, 200), vy: rand(-200, 200), r: rand(6, 12), col: 'rgba(160,170,190,0.9)', grow: 10 });
          if (S.hurt()) {
            if (state.settings.boomCrash) { fx.boom(sx(ship.x), baseY - 40, [hex(b.color), hex(b.color2), '#FFD60A', '#FF66C4']); sfx.boom(); ship.gone = true; }
            S.lose('Bonk, bonk, bonk! Too many bumps. Let\'s try again!'); return;
          }
          say(S.hearts === 1 ? 'Careful! One heart left!' : 'Bonk! Watch out for the rocks!');
        }
      }
      if (dist > endY - 420) {
        done = true; doneT = 0; fx.confetti(W / 2, H * 0.4); toast('YOU MADE IT!');
        S.win(got, totalStars, L.win);
      }
    },
    draw(c, W_, H_, t) {
      W = W_; H = H_; k = Math.min(W / (VW + 40), H / 760); baseY = H * 0.74;
      c.save();
      if (shake > 0) c.translate(rand(-1, 1) * 10 * shake, rand(-1, 1) * 10 * shake);
      spaceGradient(c, W, H);
      c.save(); c.translate(0, (dist * 0.15) % H); starfield(c, W, H, t, 1, 0); c.translate(0, -H); starfield(c, W, H, t, 1, 0); c.restore();
      // side rails
      c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(0, 0, sx(-VW / 2), H); c.fillRect(sx(VW / 2), 0, W - sx(VW / 2), H);
      // destination planet
      const py = sy(endY), pr = 150 * k;
      if (py > -pr * 2) {
        if (L.dest === 'moon') drawMoon(c, W / 2, py, pr, true, t); else if (L.dest === 'mars') drawMars(c, W / 2, py, pr); else drawPlanet(c, W / 2, py, pr, L.dest, t);
      }
      for (const o of objs) {
        if (o.gone) continue;
        const y = sy(o.y); if (y < -80 || y > H + 80) continue;
        const x = sx(o.x + (o.sway ? Math.sin(dist * 0.006 + o.ph) * o.sway : 0));
        if (o.kind === 'star') drawStar(c, x, y, (22 + Math.sin(t * 5 + o.y) * 2) * k + 4, '#FFD60A', INK, 3);
        else if (o.kind === 'rock') drawRock(c, x, y, o.r * k, o.seed, '#8D99AE', t * 0.3 + o.seed);
        else if (o.kind === 'comet') {
          const dir = Math.sign(o.vx);
          const g = c.createLinearGradient(x, y, x - dir * 120 * k, y); g.addColorStop(0, 'rgba(120,220,255,0.9)'); g.addColorStop(1, 'rgba(120,220,255,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(x, y - o.r * k); c.lineTo(x - dir * 130 * k, y); c.lineTo(x, y + o.r * k); c.closePath(); c.fill();
          c.beginPath(); c.arc(x, y, o.r * k, 0, 7); c.fillStyle = '#E0FBFF'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
        } else if (o.kind === 'heart') {
          c.beginPath(); c.arc(x, y, 34 * k, 0, 7); c.fillStyle = 'rgba(180,230,255,0.45)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke();
          const hs = 40 * k; c.save(); c.translate(x - hs / 2, y - hs / 2); c.scale(hs / 64, hs / 64);
          c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(8, 36, 8, 14, 22, 12); c.bezierCurveTo(28, 11, 31, 15, 32, 19); c.bezierCurveTo(33, 15, 36, 11, 42, 12); c.bezierCurveTo(56, 14, 56, 36, 32, 54); c.closePath();
          c.fillStyle = '#FF5A5F'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); c.restore();
        }
      }
      fx.draw(c);
      if (!ship.gone && !(ship.inv > 0 && Math.floor(t * 12) % 2)) {
        const s = clamp(150 / Lr.height, 0.35, 1) * (k + 0.15);
        const yy = done ? baseY - Math.min(1, doneT) * 60 : baseY;
        drawRocket(c, b, { x: sx(ship.x), y: yy + 30, s, t, flame: 0.7, angle: ship.tilt, look: clamp(ship.tilt * 3, -1, 1) });
      }
      if (!started && !S.over) {
        // finger hint
        const fxp = W / 2 + Math.sin(t * 2) * 120 * k;
        c.beginPath(); c.arc(fxp, H * 0.9, 26, 0, 7); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke();
      }
      c.restore();
    },
  };
}
