// Rover Rally: the rover drives by itself. Tap to jump over rocks and holes, grab gems.
import { gameShell } from './common.js';
import { Fx, rand, clamp, rng, drawRock, drawGem } from '../fx.js';
import { say } from '../voice.js';
import { sfx, setEngine } from '../audio.js';
import { state } from '../state.js';
import { toast } from '../ui.js';
import { drawRover, drawFlag, drawAstronaut, pilotFace, INK, rr, hex } from '../draw.js';

// speed, length (number of obstacles), gap, hole = chance of a hole, wide = chance of a wide hole (double jump), tall = chance of tall rock
const LEVELS = [
  { speed: 230, n: 8, gap: 560, hole: 0, line: 'Tap the green button to jump over the rocks!' },
  { speed: 245, n: 10, gap: 530, hole: 0.4, line: 'Jump over the holes too!' },
  { speed: 260, n: 12, gap: 500, hole: 0.5, line: 'Grab the shiny gems in the air!' },
  { speed: 275, n: 13, gap: 480, hole: 0.5, wide: 0.3, dbl: true, line: 'New trick! Tap again in the air to double jump over the wide holes.' },
  { speed: 290, n: 14, gap: 460, hole: 0.5, wide: 0.35, tall: 0.25, dbl: true, line: 'Double jump over the tall rocks!' },
  { speed: 305, n: 16, gap: 440, hole: 0.5, wide: 0.4, tall: 0.3, dbl: true, pairs: 0.2, line: 'Here come two rocks in a row!' },
  { speed: 325, n: 18, gap: 420, hole: 0.55, wide: 0.45, tall: 0.35, dbl: true, pairs: 0.3, line: 'Zoom zoom! The rover is going fast now!' },
  { speed: 345, n: 22, gap: 400, hole: 0.55, wide: 0.5, tall: 0.4, dbl: true, pairs: 0.35, line: 'The last rally! Drive all the way to the Mars base!' },
];
const JUMP = 400, GRAV = 700;   // floaty Mars jumps: easy timing for little fingers

export function roverGame(app, { level = 0, tries = 0 }) {
  const L = LEVELS[level];
  const S = gameShell(app, 'rover', level, tries, { jump: true, hearts: 3 });
  const fx = new Fx();
  const b = state.build;
  const R = rng(level * 131 + 7);
  const speed = L.speed * (1 - S.ease * 0.08);
  const air = 2 * JUMP / GRAV;                 // seconds in the air for one jump
  const one = speed * air;                     // distance covered by one jump
  const obs = [], gems = []; let x = 900;
  for (let i = 0; i < L.n; i++) {
    const hole = R() < L.hole, wide = hole && L.wide && R() < L.wide && i > 1;
    const tall = !hole && L.tall && R() < L.tall && i > 1;
    const big = wide || tall;
    if (big) x += one * 0.45;                  // room to start a double jump
    if (hole) {
      const w = wide ? one * 1.25 : one * (0.42 + R() * 0.12);
      obs.push({ kind: 'hole', x, w });
      gems.push({ x: x + w / 2, y: wide ? 160 : 100 });
      x += w;
    } else {
      obs.push({ kind: 'rock', x, w: tall ? 54 : 50, h: tall ? 170 : 46 + R() * 14, seed: i });
      gems.push({ x: x + 25, y: tall ? 225 : 125 });
      if (!tall && L.pairs && R() < L.pairs) { obs.push({ kind: 'rock', x: x + 62, w: 48, h: 44, seed: i + 50 }); x += 62; }
      x += 50;
    }
    if (R() < 0.5) gems.push({ x: x + L.gap * 0.45, y: 28 });
    x += Math.max(L.gap * (0.85 + R() * 0.3), one * (big ? 1.5 : 1.0)) + (S.ease * 40);
  }
  const endX = x + 300;
  const rv = { x: 0, y: 0, vy: 0, jumps: 0, inv: 0, wheel: 0, squash: 0, fall: 0 };
  let got = 0, shake = 0, done = false, doneT = 0, saidDbl = false;
  const critters = Array.from({ length: Math.ceil(endX / 1400) }, (_, i) => ({ x: 700 + i * 1400 + R() * 400 }));
  S.hint('jump', L.line);
  app.dbg = { rv, obs, gems, one, speed, L, S };

  const tapJump = () => { S.inp.jump = true; };
  app.canvas.addEventListener('pointerdown', tapJump);
  let k = 1, W = app.W, H = app.H, gy = 0;
  const sx = wx => W * 0.24 + (wx - rv.x) * k;

  function hit(line) {
    rv.inv = 1.5; shake = 0.35; sfx.bonk();
    if (S.hurt()) {
      if (state.settings.boomCrash) { fx.boom(W * 0.24, gy - 40, [hex(b.color), hex(b.color2), '#FFD60A', '#FF66C4']); sfx.boom(); rv.gone = true; }
      S.lose('Bumpity bump! Too many bumps. Let\'s try again!'); return;
    }
    say(S.hearts === 1 ? 'Careful! One heart left!' : line);
  }

  return {
    exit() { S.exit(); app.canvas.removeEventListener('pointerdown', tapJump); },
    update(dt) {
      fx.update(dt); shake = Math.max(0, shake - dt);
      if (S.over && !done) { setEngine(0); S.inp.jump = false; return; }
      if (done) {
        doneT += dt; setEngine(0);
        rv.x += speed * Math.max(0, 1 - doneT * 1.2) * dt; rv.wheel += speed * Math.max(0, 1 - doneT * 1.2) * dt / 12;
        rv.vy -= GRAV * dt; rv.y = Math.max(0, rv.y + rv.vy * dt); S.inp.jump = false; return;
      }
      rv.x += speed * dt; rv.wheel += speed * dt / 12;
      setEngine(0.12);
      rv.inv = Math.max(0, rv.inv - dt); rv.squash = Math.max(0, rv.squash - dt * 4);
      // jump
      if (S.inp.jump) {
        S.inp.jump = false;
        const maxJ = L.dbl ? 2 : 1;
        if (rv.fall <= 0 && rv.jumps < maxJ) { rv.vy = rv.jumps === 0 ? JUMP : JUMP * 0.85; rv.jumps++; sfx.jump(); if (rv.jumps === 2) fx.sparkle(W * 0.24, gy - rv.y * k - 20, 6); }
      }
      rv.vy -= GRAV * dt; rv.y += rv.vy * dt;
      const front = rv.x + 20, back = rv.x - 20;
      let overHole = null;
      for (const o of obs) if (o.kind === 'hole' && rv.x > o.x + 12 && rv.x < o.x + o.w - 12) overHole = o;
      if (rv.fall > 0) {
        // fell in a hole: bounce back out
        rv.fall -= dt; if (rv.y < -70) { rv.y = -70; rv.vy = 560; sfx.boing(); }
        if (rv.y >= 0 && rv.vy < 0 && !overHole) { rv.y = 0; rv.vy = 0; rv.fall = 0; rv.jumps = 0; }
      } else if (rv.y <= 0 && rv.vy <= 0) {
        if (overHole && rv.inv <= 0) { rv.fall = 1.2; hit('Whoops, into the hole! Boing!'); }
        else if (overHole) { rv.y = 0; rv.vy = 0; rv.jumps = 0; }
        else { if (rv.y < 0 || rv.jumps > 0) { rv.squash = 1; for (let i = 0; i < 5; i++) fx.puff(W * 0.24 + rand(-30, 30), gy, { vx: rand(-80, 80), vy: rand(-40, 0), col: 'rgba(200,110,70,0.7)', r: rand(5, 10) }); } rv.y = 0; rv.vy = 0; rv.jumps = 0; }
      }
      if (rv.y === 0 && Math.random() < 0.3) fx.puff(W * 0.24 - 40, gy, { vx: -80, vy: rand(-30, 0), col: 'rgba(200,110,70,0.5)', r: rand(4, 8), max: 0.5 });
      // rocks
      if (rv.inv <= 0) for (const o of obs) {
        if (o.kind !== 'rock' || o.broken) continue;
        if (front > o.x && back < o.x + o.w && rv.y < o.h * 0.7) {
          o.broken = true;
          for (let i = 0; i < 10; i++) fx.puff(sx(o.x + o.w / 2), gy - o.h * k / 2, { vx: rand(-200, 200), vy: rand(-260, 0), g: 500, r: rand(5, 10), grow: 0, col: '#A0522D', max: 0.9 });
          hit('Bonk! Jump over the rocks!'); if (S.over) return;
        }
      }
      // gems
      for (const g of gems) if (!g.got && Math.abs(g.x - rv.x) < 48 && Math.abs(g.y - (rv.y + 30)) < 62) { g.got = true; got++; sfx.gem(); fx.sparkle(sx(g.x), gy - g.y * k, 8); }
      // teach the double jump when the first wide hole or tall rock is coming
      if (L.dbl && !saidDbl) for (const o of obs) if (((o.kind === 'hole' && o.w > one) || (o.kind === 'rock' && o.h > 100)) && o.x - rv.x < 420 && o.x > rv.x) { saidDbl = true; say('Double jump! Tap, tap!', { interrupt: false }); }
      S.progress(rv.x / endX);
      if (rv.x >= endX - 120) { done = true; doneT = 0; fx.confetti(W / 2, H * 0.4); toast('YOU MADE IT!'); S.win(got, gems.length, level === LEVELS.length - 1 ? 'You made it to the Mars base! You are the rover champion!' : 'You made it! Great driving!'); }
    },
    draw(c, W_, H_, t) {
      W = W_; H = H_; k = clamp(H / 760, 0.7, 1.4); gy = H * 0.74;
      c.save();
      if (shake > 0) c.translate(rand(-1, 1) * 10 * shake, rand(-1, 1) * 10 * shake);
      const g2 = c.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, '#E8A56B'); g2.addColorStop(1, '#F6D9AE'); c.fillStyle = g2; c.fillRect(-20, -20, W + 40, H + 40);
      c.globalAlpha = 0.9; c.fillStyle = '#fff'; c.beginPath(); c.arc(W * 0.82, H * 0.16, 20, 0, 7); c.fill(); c.globalAlpha = 1;
      // far and near hills (parallax)
      for (const [par, col, amp, base] of [[0.15, '#D08A5B', 70, 150], [0.35, '#C1653A', 45, 80]]) {
        c.fillStyle = col; c.beginPath(); c.moveTo(0, gy);
        for (let px = 0; px <= W + 30; px += 30) { const wx = px + rv.x * par * k; c.lineTo(px, gy - base * k - amp * k * Math.sin(wx * 0.004) - amp * 0.4 * k * Math.sin(wx * 0.013)); }
        c.lineTo(W, gy); c.closePath(); c.fill();
      }
      // ground with holes cut out
      c.fillStyle = '#D9774A'; c.fillRect(-20, gy, W + 40, H);
      c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(-20, gy); c.lineTo(W + 20, gy); c.stroke();
      for (const o of obs) {
        const x0 = sx(o.x); if (x0 > W + 200 || x0 < -600) continue;
        if (o.kind === 'hole') {
          const w = o.w * k;
          c.beginPath(); c.moveTo(x0, gy - 3); c.lineTo(x0 + w, gy - 3); c.lineTo(x0 + w - 14, gy + 120 * k); c.lineTo(x0 + 14, gy + 120 * k); c.closePath();
          const hg = c.createLinearGradient(0, gy, 0, gy + 120 * k); hg.addColorStop(0, '#6B2D12'); hg.addColorStop(1, '#2B1206'); c.fillStyle = hg; c.fill();
          c.lineWidth = 3; c.strokeStyle = INK; c.beginPath(); c.moveTo(x0, gy); c.lineTo(x0 + 14, gy + 120 * k); c.moveTo(x0 + w, gy); c.lineTo(x0 + w - 14, gy + 120 * k); c.stroke();
        } else if (!o.broken) {
          if (o.h > 100) { rr(c, x0, gy - o.h * k, o.w * k, o.h * k + 4, 16); c.fillStyle = '#A0522D'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x0 + 8, gy - o.h * k * 0.7, o.w * k - 16, 6); c.fillRect(x0 + 8, gy - o.h * k * 0.4, o.w * k - 16, 6); }
          else drawRock(c, x0 + o.w * k / 2, gy - o.h * k * 0.45, o.h * k * 0.62, o.seed, '#A0522D');
        }
      }
      // friendly aliens waving
      for (const cr of critters) {
        const x0 = W * 0.24 + (cr.x - rv.x) * k * 0.8; if (x0 < -60 || x0 > W + 60) continue;
        const yy = gy - 150 * k;
        c.beginPath(); c.ellipse(x0, yy + 10, 40, 12, 0, 0, 7); c.fillStyle = '#B8C0CC'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
        c.beginPath(); c.arc(x0, yy, 20, Math.PI, 0); c.closePath(); c.fillStyle = 'rgba(180,230,255,0.8)'; c.fill(); c.stroke();
        pilotFace(c, x0, yy - 6, 1.6, t + cr.x, 'alien');
      }
      // base and flag at the end
      const ex = sx(endX);
      if (ex < W + 300) {
        c.beginPath(); c.arc(ex + 150 * k, gy, 110 * k, Math.PI, 0); c.closePath(); c.fillStyle = '#F4F6FA'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
        rr(c, ex + 120 * k, gy - 60 * k, 60 * k, 60 * k, 8); c.fillStyle = '#4CC9F0'; c.fill(); c.stroke();
        drawFlag(c, ex, gy, 1.6 * k, b, t, 1);
        drawAstronaut(c, ex + 60 * k, gy, 1.2 * k, { t, wave: true, color: hex(b.color), who: 'kid' });
      }
      for (const g of gems) if (!g.got) { const x0 = sx(g.x); if (x0 > -40 && x0 < W + 40) drawGem(c, x0, gy - g.y * k, 17 * k + 3, ['#4CC9F0', '#FF66C4', '#80ED99', '#FFD60A'][Math.floor(g.x) % 4], t); }
      fx.draw(c);
      if (!rv.gone && !(rv.inv > 0 && Math.floor(t * 12) % 2)) {
        const sq = 1 - rv.squash * 0.12;
        c.save(); c.translate(W * 0.24, gy - rv.y * k); c.scale(1 / sq, sq);
        drawRover(c, 0, -10 * k * 1.1, 1.1 * k, rv.wheel, t);
        // pilot riding on top
        c.beginPath(); c.arc(-14 * k, -62 * k, 15 * k, 0, 7); c.fillStyle = 'rgba(180,230,255,0.6)'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
        pilotFace(c, -14 * k, -61 * k, 2 * k, t, b.pilot || 'kid');
        c.restore();
      }
      c.restore();
    },
  };
}
