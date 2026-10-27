// Shared backgrounds: starfields, hills, launch pad.
import { INK, rr } from './draw.js';

const STARS = Array.from({ length: 220 }, (_, i) => ({
  x: (Math.sin(i * 12.9898) * 43758.5453) % 1, y: (Math.sin(i * 78.233) * 12345.678) % 1,
  r: 0.6 + ((i * 7) % 5) * 0.35, tw: (i * 0.37) % 6.28,
})).map(s => ({ ...s, x: Math.abs(s.x), y: Math.abs(s.y) }));

export function starfield(c, W, H, t, alpha = 1, drift = 0) {
  if (alpha <= 0) return;
  c.save();
  for (const s of STARS) {
    const a = alpha * (0.55 + 0.45 * Math.sin(t * 2 + s.tw));
    c.globalAlpha = a;
    c.fillStyle = '#fff';
    const x = ((s.x * W + drift * s.r * 0.3) % W + W) % W;
    c.beginPath(); c.arc(x, s.y * H, s.r, 0, 7); c.fill();
  }
  c.restore();
}

export function spaceGradient(c, W, H) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0B1033'); g.addColorStop(0.6, '#1A1F5C'); g.addColorStop(1, '#3B2A7A');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

export function skyColor(alt) {
  // alt 0..1 (0 = ground, 1 = space)
  const stops = [[0, [110, 200, 255]], [0.35, [70, 140, 235]], [0.7, [30, 50, 140]], [1, [8, 10, 40]]];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a0, c0] = stops[i], [a1, c1] = stops[i + 1];
    if (alt <= a1) {
      const k = Math.max(0, (alt - a0) / (a1 - a0));
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
    }
  }
  return stops[stops.length - 1][1];
}

export function hills(c, W, groundY, x0 = 0, colorA = '#57CC99', colorB = '#38A3A5') {
  c.fillStyle = colorB;
  c.beginPath(); c.moveTo(0, groundY);
  for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, groundY - 40 - 30 * Math.sin((x + x0 * 0.3) * 0.006) - 18 * Math.sin((x + x0 * 0.3) * 0.017));
  c.lineTo(W, groundY + 400); c.lineTo(0, groundY + 400); c.closePath(); c.fill();
  c.fillStyle = colorA;
  c.fillRect(0, groundY, W, 2000);
  c.strokeStyle = INK; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, groundY); c.lineTo(W, groundY); c.stroke();
}

export function launchPad(c, x, groundY, s = 1, height = 260) {
  c.save(); c.translate(x, groundY); c.scale(s, s);
  c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round';
  // tower
  const tx = -70;
  c.strokeStyle = '#E63946'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(tx - 12, 0); c.lineTo(tx - 12, -height); c.moveTo(tx + 12, 0); c.lineTo(tx + 12, -height); c.stroke();
  c.lineWidth = 3;
  for (let y = 0; y > -height; y -= 24) { c.beginPath(); c.moveTo(tx - 12, y); c.lineTo(tx + 12, y - 24); c.moveTo(tx + 12, y); c.lineTo(tx - 12, y - 24); c.stroke(); }
  c.strokeStyle = INK;
  rr(c, tx - 18, -height - 10, 36, 12, 3); c.fillStyle = '#E63946'; c.fill(); c.stroke();
  // pad
  rr(c, -90, -14, 180, 18, 5); c.fillStyle = '#8D99AE'; c.fill(); c.stroke();
  c.fillStyle = '#FFD60A';
  for (let k = -80; k < 80; k += 24) { c.beginPath(); c.moveTo(k, -14); c.lineTo(k + 12, -14); c.lineTo(k + 6, 4); c.lineTo(k - 6, 4); c.closePath(); c.fill(); }
  rr(c, -90, -14, 180, 18, 5); c.stroke();
  c.restore();
}

export function tree(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = INK;
  c.fillStyle = '#8B5E34'; rr(c, -5, -22, 10, 22, 2); c.fill(); c.stroke();
  c.fillStyle = '#2D6A4F'; c.beginPath(); c.arc(0, -36, 20, 0, 7); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(-6, -42, 7, 0, 7); c.fill();
  c.restore();
}
