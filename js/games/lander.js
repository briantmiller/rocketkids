// Moon Lander: hold the fire button to slow down and land softly on the target.
import { gameShell } from './common.js';
import { Fx, rand, clamp, drawRock } from '../fx.js';
import { say } from '../voice.js';
import { sfx, setEngine } from '../audio.js';
import { state } from '../state.js';
import { toast } from '../ui.js';
import { drawLanderShip, drawStar, drawEarth, INK, rr, hex } from '../draw.js';
import { starfield } from '../bg.js';

// pad: x, w, move{amp,speed}; start x; rocks [x...]; hills [{x,w,h}]; drift = floating space rocks; wind; mars
const LEVELS = [
  { pad: { x: 0, w: 220 }, start: 0, fuel: 1.0, line: 'Hold the fire button to slow down, and land softly on the yellow target!' },
  { pad: { x: 230, w: 200 }, start: -220, fuel: 1.0, line: 'The target is over to the side. Use the arrows to fly over it!' },
  { pad: { x: -250, w: 170 }, start: 240, fuel: 1.0, rocks: [-30, 110], line: 'Watch out for the big rocks on the ground!' },
  { pad: { x: 0, w: 170, move: { amp: 200, speed: 0.3 } }, start: -100, fuel: 1.0, line: 'Whoa, the target is moving! Follow it and land.' },
  { pad: { x: 270, w: 150 }, start: -280, fuel: 0.95, hills: [{ x: -40, w: 130, h: 150 }, { x: -330, w: 90, h: 70 }], line: 'Fly over the mountain to reach the target!' },
  { pad: { x: -220, w: 150 }, start: 260, fuel: 0.95, drift: 2, line: 'Floating space rocks! Fly around them.' },
  { pad: { x: 60, w: 130, move: { amp: 240, speed: 0.35 } }, start: -300, fuel: 0.9, rocks: [-330], drift: 2, mars: true, line: 'Now we are on Mars! Land on the moving target.' },
  { pad: { x: -40, w: 120, move: { amp: 240, speed: 0.36 } }, start: 300, fuel: 0.85, hills: [{ x: 390, w: 80, h: 90 }], drift: 3, wind: true, mars: true, line: 'The big one! Windy Mars, space rocks, and a tiny target. You can do it!' },
];
const VW = 1000, VH = 720;

export function landerGame(app, { level = 0, tries = 0 }) {
  const L = LEVELS[level];
  const S = gameShell(app, 'lander', level, tries, { boost: true, steer: true, hearts: 3 });
  const fx = new Fx();
  const b = state.build;
  const ease = S.ease;
  const padW = L.pad.w + ease * 30;
  const safe = 62 + ease * 8;
  const g = L.mars ? 16 : 13;
  const sh = { x: L.start, y: 620, vx: 0, vy: -20, fuel: 1, landed: false, inv: 0, onPadT: 0 };
  const burnTime = 17 * L.fuel + ease * 3;   // seconds of fire button
  const stars = [0, 1, 2].map(i => ({ x: L.start + (L.pad.x - L.start) * (0.25 + i * 0.3) + (i % 2 ? 50 : -50), y: 500 - i * 150, got: false }));
  const rocks = (L.rocks || []).map((x, i) => ({ x, r: 42 + (i % 2) * 8 }));
  const drift = Array.from({ length: Math.max(0, (L.drift || 0) - (ease > 1 ? 1 : 0)) }, (_, i) => ({ x: -400 + i * 260, y: 250 + (i % 3) * 110, vx: (i % 2 ? -1 : 1) * (45 + i * 12), r: 30 + (i % 2) * 8, rot: i }));
  let padX = L.pad.x, shake = 0, wind = 0, got = 0, time = 0, groundHint = 0, started = false;

  const hgt = x => { let y = 0; for (const m of (L.hills || [])) { const d = (x - m.x) / m.w; y += m.h * Math.exp(-d * d * 2.2); } return y; };
  S.hint('boost', L.line);
  app.dbg = { sh, L, S, pad: () => padX, hgt, drift, rocks, stars };

  function bonk(line, upv = 150) {
    sh.vy = upv; sh.inv = 1.4; shake = 0.4; sfx.bonk(); sfx.boing();
    if (S.hurt()) { finishLose('Bonk! Let\'s try that landing again.'); return; }
    say(line);
  }
  function finishLose(line) {
    setEngine(0);
    if (state.settings.boomCrash) { fx.boom(sx(sh.x), sy(sh.y + 40), [hex(b.color), hex(b.color2), '#FFD60A', '#FF66C4']); sfx.boom(); sh.gone = true; }
    S.lose(line);
  }
  let k = 1, gy = 0, W = app.W, H = app.H;
  const sx = x => W / 2 + x * k, sy = y => gy - y * k;

  return {
    exit() { S.exit(); },
    pause() { S.release(); },
    update(dt) {
      fx.update(dt);
      shake = Math.max(0, shake - dt);
      time += dt;
      if (L.pad.move) padX = L.pad.x + Math.sin(time * L.pad.move.speed * (1 - ease * 0.15)) * L.pad.move.amp;
      for (const d of drift) { d.x += d.vx * dt; d.rot += dt * 0.6; if (d.x > 520) d.x = -520; if (d.x < -520) d.x = 520; }
      if (S.over) { setEngine(0); return; }
      wind = L.wind ? Math.sin(time * 0.8) * 26 : 0;
      const holding = S.inp.boost && sh.fuel > 0;
      if (holding) started = true;
      setEngine(holding ? 0.6 : 0);
      if (holding) sh.fuel = Math.max(0, sh.fuel - dt / burnTime);
      if (!sh.landed) {
        sh.vy += ((holding ? 62 : 0) - g) * dt;
        sh.vy = clamp(sh.vy, -170, 48);
        sh.vx += (S.steer() * 135 + wind - sh.vx) * Math.min(1, dt * 1.8);
        sh.x = clamp(sh.x + sh.vx * dt, -VW / 2 + 40, VW / 2 - 40);
        sh.y = Math.min(VH - 40, sh.y + sh.vy * dt);
        sh.inv = Math.max(0, sh.inv - dt);
      } else {
        // sitting on the ground (or riding the pad)
        if (sh.onPad) sh.x = padX + sh.padOff;
        if (holding) { sh.landed = false; sh.vy = 30; sh.y += 2; }
        else if (!sh.onPad) {
          groundHint += dt;
          if (sh.fuel <= 0) { finishLose('Out of rocket fuel! Let\'s try again.'); return; }
        }
      }
      if (holding && sh.y - hgt(sh.x) < 90) fx.puff(sx(sh.x) + rand(-30, 30), sy(hgt(sh.x)), { vx: rand(-160, 160), vy: rand(-20, 0), col: L.mars ? 'rgba(200,110,70,0.7)' : 'rgba(200,200,200,0.7)', r: rand(6, 12) });
      // stars
      for (const s of stars) if (!s.got && Math.hypot(s.x - sh.x, s.y - (sh.y + 45)) < 62) { s.got = true; got++; sfx.star(); fx.sparkle(sx(s.x), sy(s.y)); }
      // rocks on the ground and drifting rocks
      if (sh.inv <= 0 && !sh.landed) {
        for (const r of rocks) if (Math.hypot(r.x - sh.x, (hgt(r.x) + r.r * 0.6) - (sh.y + 10)) < r.r + 34) { sh.vx = Math.sign(sh.x - r.x || 1) * 90; bonk('Bonk! That is a rock. Land on the yellow target!'); return; }
        for (const d of drift) if (Math.hypot(d.x - sh.x, d.y - (sh.y + 45)) < d.r + 40) { sh.vx = Math.sign(sh.x - d.x || 1) * 110; bonk('Bonk! A space rock!', 40); return; }
      }
      if (!sh.landed && sh.fuel < 0.25 && !S.lowFuel) { S.lowFuel = true; say('Fuel is getting low. Land soon!', { interrupt: false }); }
      if (!sh.landed && !holding && sh.vy < -safe && sh.y - hgt(sh.x) < 170 && !S.warned) { S.warned = true; S.hint('boost', 'Too fast! Hold the fire button!'); }
      // touching the ground
      const ground = hgt(sh.x);
      if (!sh.landed && sh.y <= ground) {
        sh.y = ground;
        const speed = -sh.vy;
        const off = sh.x - padX;
        const onPad = Math.abs(off) < padW / 2 - 6 && ground < 12;
        if (speed > safe) { S.warned = false; bonk('Bonk! Too fast. Hold the fire button longer to land softly.', 120); return; }
        sh.landed = true; sh.vy = 0; sh.vx = 0; sh.onPad = onPad; sh.padOff = off; sfx.thud();
        for (let i = 0; i < 12; i++) fx.puff(sx(sh.x) + rand(-40, 40), sy(ground), { vx: rand(-120, 120), vy: rand(-40, -5), col: L.mars ? 'rgba(200,110,70,0.7)' : 'rgba(200,200,200,0.7)' });
        if (onPad) {
          const bull = Math.abs(off) < padW * 0.2;
          fx.confetti(sx(sh.x), sy(120)); toast(bull ? 'BULLSEYE!' : 'LANDED!');
          S.win(got, 3, bull ? 'Bullseye! A perfect landing!' : 'Touchdown! You landed on the target!');
        } else if (sh.fuel <= 0) {
          finishLose('Out of rocket fuel! Let\'s try again.');
        } else {
          S.hint('boost', 'Soft landing! Now hop over to the yellow target.');
        }
      }
    },
    draw(c, W_, H_, t) {
      W = W_; H = H_;
      k = Math.min(W / VW, (H * 0.8) / VH); gy = H * 0.84;
      c.save();
      if (shake > 0) c.translate(rand(-1, 1) * 10 * shake, rand(-1, 1) * 10 * shake);
      // sky
      if (L.mars) { const g2 = c.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, '#E8B07A'); g2.addColorStop(1, '#F3D2A2'); c.fillStyle = g2; c.fillRect(-20, -20, W + 40, H + 40); }
      else { c.fillStyle = '#05081F'; c.fillRect(-20, -20, W + 40, H + 40); starfield(c, W, H, t, 1, 0); drawEarth(c, W * 0.14, H * 0.2, Math.min(W, H) * 0.07, t); }
      if (L.wind) { c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 8; i++) { const yy = H * 0.15 + i * H * 0.08, xx = ((t * 60 * Math.sign(wind || 1) * (1 + i % 3) + i * 211) % (W + 200) + W + 200) % (W + 200) - 100; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + 50 * Math.abs(wind) / 26 + 10, yy); c.stroke(); } }
      // ground with hills
      c.beginPath(); c.moveTo(-20, H + 20);
      for (let x = -W / 2 / k - 20; x <= W / 2 / k + 30; x += 15) c.lineTo(sx(x), sy(hgt(x)));
      c.lineTo(W + 20, H + 20); c.closePath();
      c.fillStyle = L.mars ? '#D9774A' : '#C8C8C8'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      for (let i = -8; i < 9; i++) { c.beginPath(); c.ellipse(sx(i * 100 + 30), gy + 30 + (i * i % 3) * 16, 26 * k + 6, 6, 0, 0, 7); c.fillStyle = L.mars ? 'rgba(160,82,45,0.6)' : 'rgba(150,150,150,0.7)'; c.fill(); }
      // target pad
      c.beginPath(); c.ellipse(sx(padX), gy + 2, padW / 2 * k, 11, 0, 0, 7); c.fillStyle = '#FFD23F'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.ellipse(sx(padX), gy + 2, padW * 0.2 * k, 5, 0, 0, 7); c.fillStyle = '#FF5A5F'; c.fill();
      for (const r of rocks) drawRock(c, sx(r.x), sy(hgt(r.x) + r.r * 0.55), r.r * k, r.x, L.mars ? '#A0522D' : '#8D99AE');
      for (const d of drift) drawRock(c, sx(d.x), sy(d.y), d.r * k, d.rot | 0, '#9AA5B8', d.rot);
      for (const s of stars) if (!s.got) drawStar(c, sx(s.x), sy(s.y) + Math.sin(t * 3 + s.x) * 5, 20 * k + 4, '#FFD60A', INK, 3);
      fx.draw(c);
      if (!sh.gone && !(sh.inv > 0 && Math.floor(t * 12) % 2)) {
        drawLanderShip(c, sx(sh.x), sy(sh.y), 1.15 * k + 0.25, b, t, { flame: S.inp.boost && sh.fuel > 0 && !S.over ? 0.7 : 0, tilt: sh.landed ? 0 : sh.vx * 0.0016 });
      }
      c.restore();
      // fuel bar
      const bx = W - 64, by = H * 0.24, bh = H * 0.36;
      rr(c, bx, by, 30, bh, 14); c.fillStyle = 'rgba(0,0,0,0.4)'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
      const fh = (bh - 8) * clamp(sh.fuel, 0, 1);
      if (fh > 2) { rr(c, bx + 4, by + 4 + (bh - 8 - fh), 22, fh, 10); c.fillStyle = sh.fuel < 0.25 ? '#FF5A5F' : '#FFB703'; c.fill(); }
    },
  };
}
