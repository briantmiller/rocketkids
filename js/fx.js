// Little particle system shared by the mini-games.
import { drawStar, INK, rr } from './draw.js';

export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Seeded random numbers so each level is the same every time.
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export class Fx {
  constructor() { this.p = []; }
  puff(x, y, o = {}) {
    this.p.push({ x, y, vx: o.vx ?? rand(-20, 20), vy: o.vy ?? rand(-10, 10), life: 0, max: o.max ?? rand(0.6, 1.2), r: o.r ?? rand(8, 16), grow: o.grow ?? 30, col: o.col ?? 'rgba(255,255,255,0.8)', kind: o.kind || 'smoke', rot: rand(0, 6), vr: rand(-4, 4), g: o.g || 0 });
  }
  sparkle(x, y, n = 10) {
    for (let i = 0; i < n; i++) this.p.push({ x, y, vx: rand(-160, 160), vy: rand(-160, 160), life: 0, max: rand(0.5, 0.9), r: rand(5, 9), grow: -6, col: ['#FFD60A', '#fff', '#4CC9F0', '#FF66C4'][i % 4], kind: 'spark', rot: 0, vr: 0 });
  }
  confetti(x, y, n = 40) {
    for (let i = 0; i < n; i++) this.p.push({ x, y, vx: rand(-500, 500), vy: rand(-600, -100), life: 0, max: rand(1.5, 2.5), r: rand(8, 14), grow: 0, col: ['#FFD60A', '#FF66C4', '#4CC9F0', '#80ED99', '#F94144'][i % 5], kind: 'confetti', rot: 0, vr: rand(-8, 8), g: 500 });
  }
  boom(x, y, cols = ['#FFD60A', '#FF66C4', '#4CC9F0', '#80ED99']) {
    for (let i = 0; i < 30; i++) this.p.push({ x, y, vx: rand(-420, 420), vy: rand(-480, 220), life: 0, max: rand(1.2, 2.2), r: rand(8, 16), grow: -2, col: cols[i % cols.length], kind: 'confetti', rot: rand(0, 6), vr: rand(-10, 10), g: 380 });
    for (let i = 0; i < 14; i++) this.p.push({ x: x + rand(-30, 30), y: y + rand(-30, 30), vx: rand(-120, 120), vy: rand(-120, 60), life: 0, max: rand(1.0, 1.8), r: rand(20, 36), grow: 50, col: i % 3 ? 'rgba(240,240,240,0.9)' : 'rgba(255,170,40,0.95)', kind: 'smoke', rot: 0, vr: 0 });
  }
  update(dt) {
    for (const p of this.p) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.r = Math.max(0.5, p.r + (p.grow || 0) * dt); p.rot += (p.vr || 0) * dt; }
    for (let i = this.p.length - 1; i >= 0; i--) if (this.p[i].life > this.p[i].max) this.p.splice(i, 1);
  }
  draw(c) {
    for (const p of this.p) {
      c.globalAlpha = Math.max(0, 1 - p.life / p.max);
      if (p.kind === 'confetti') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); c.restore(); }
      else if (p.kind === 'spark') drawStar(c, p.x, p.y, p.r, p.col, null);
      else { c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
  }
}

// Lumpy space rock.
export function drawRock(c, x, y, r, seed = 1, col = '#8D99AE', rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, k = 0.78 + 0.22 * Math.abs(Math.sin(seed * 12.9898 + i * 4.1));
    c.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k);
  }
  c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.beginPath(); c.arc(-r * 0.25, -r * 0.15, r * 0.2, 0, 7); c.fill();
  c.beginPath(); c.arc(r * 0.3, r * 0.25, r * 0.14, 0, 7); c.fill();
  c.restore();
}
export function drawGem(c, x, y, r, col = '#4CC9F0', t = 0) {
  c.save(); c.translate(x, y + Math.sin(t * 3 + x * 0.01) * 4);
  c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.8, -r * 0.2); c.lineTo(0, r); c.lineTo(-r * 0.8, -r * 0.2); c.closePath();
  c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
  c.beginPath(); c.moveTo(-r * 0.8, -r * 0.2); c.lineTo(r * 0.8, -r * 0.2); c.lineWidth = 2; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(-r * 0.3, -r * 0.7); c.lineTo(0, -r * 0.25); c.lineTo(-r * 0.55, -r * 0.25); c.closePath(); c.fill();
  c.restore();
}
