// Canvas drawing for rockets, cargo, astronauts and space things.
import { findPart, COLORS, CATALOG } from './data.js';

export const INK = '#1B1F3B';
const RAINBOW = ['#F94144', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#577590', '#9B5DE5'];

export function hex(id) { return (COLORS.find(c => c.id === id) || COLORS[0]).hex; }

export function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function starPath(c, x, y, r, pts = 5, inner = 0.45) {
  c.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / pts;
    const rad = i % 2 ? r * inner : r;
    c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  c.closePath();
}
export function drawStar(c, x, y, r, fill = '#FFD60A', stroke = INK, lw = 2) {
  starPath(c, x, y, r);
  c.fillStyle = fill; c.fill();
  if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.stroke(); }
}
function heartPath(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y + r * 0.9);
  c.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.2, x, y - r * 0.35);
  c.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  c.closePath();
}

// ---------- Patterns ----------
// Draws pattern inside current clip. (x,y,w,h) is the area; coordinates are rocket-local.
function drawPattern(c, pat, col, x, y, w, h, base) {
  c.fillStyle = col; c.strokeStyle = col;
  switch (pat) {
    case 'stripes': {
      for (let yy = Math.floor((y - base) / 26) * 26 + base; yy < y + h; yy += 26) c.fillRect(x, yy + 8, w, 9);
      break;
    }
    case 'dots': {
      let row = 0;
      for (let yy = Math.floor(y / 16) * 16; yy < y + h + 16; yy += 16, row++)
        for (let xx = x - 16 + (row % 2) * 8; xx < x + w + 16; xx += 16) { c.beginPath(); c.arc(xx, yy, 4, 0, 7); c.fill(); }
      break;
    }
    case 'stars': {
      let row = 0;
      for (let yy = Math.floor(y / 24) * 24; yy < y + h + 24; yy += 24, row++)
        for (let xx = x - 24 + (row % 2) * 12; xx < x + w + 24; xx += 24) { starPath(c, xx, yy, 7); c.fill(); }
      break;
    }
    case 'checker': {
      const s = 12;
      for (let yy = Math.floor(y / s) * s; yy < y + h; yy += s)
        for (let xx = Math.floor(x / s) * s; xx < x + w; xx += s)
          if (((Math.round(xx / s) + Math.round(yy / s)) & 1) === 0) c.fillRect(xx, yy, s, s);
      break;
    }
    case 'zigzag': {
      c.lineWidth = 6; c.lineJoin = 'miter';
      for (let yy = Math.floor(y / 28) * 28; yy < y + h + 28; yy += 28) {
        c.beginPath();
        for (let xx = x - 10, k = 0; xx < x + w + 10; xx += 10, k++) c.lineTo(xx, yy + (k % 2 ? 7 : -7));
        c.stroke();
      }
      break;
    }
    case 'hearts': {
      let row = 0;
      for (let yy = Math.floor(y / 26) * 26; yy < y + h + 26; yy += 26, row++)
        for (let xx = x - 26 + (row % 2) * 13; xx < x + w + 26; xx += 26) { heartPath(c, xx, yy, 6); c.fill(); }
      break;
    }
    case 'flames': {
      // flames licking up from the bottom of the area
      const by = y + h;
      c.beginPath();
      c.moveTo(x - 2, by);
      const n = Math.max(3, Math.round(w / 12));
      for (let i = 0; i <= n; i++) {
        const fx = x + (i / n) * w;
        const tall = h * (0.45 + 0.25 * ((i * 37) % 3) / 2);
        c.quadraticCurveTo(fx - w / n * 0.5, by - tall * 0.4, fx, by - Math.min(tall, h - 4));
        c.quadraticCurveTo(fx + w / n * 0.1, by - tall * 0.3, fx + w / n * 0.5, by - tall * 0.25);
      }
      c.lineTo(x + w + 2, by); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,214,10,0.85)';
      c.beginPath(); c.moveTo(x, by);
      for (let i = 0; i <= n; i++) { const fx = x + (i / n) * w; c.quadraticCurveTo(fx - 3, by - h * 0.2, fx, by - h * 0.3); c.lineTo(fx + w / n * 0.5, by - h * 0.12); }
      c.lineTo(x + w, by); c.closePath(); c.fill();
      break;
    }
    case 'rainbow': {
      const bh = 8;
      for (let yy = Math.floor(y / bh) * bh, i = Math.floor(y / bh); yy < y + h; yy += bh, i++) {
        c.fillStyle = RAINBOW[((i % 7) + 7) % 7]; c.fillRect(x, yy, w, bh + 0.5);
      }
      break;
    }
  }
}

function shade(c, x, y, w, h, style) {
  const g = c.createLinearGradient(x, 0, x + w, 0);
  const strong = style === 'shiny';
  g.addColorStop(0, 'rgba(0,0,0,0.28)');
  g.addColorStop(0.25, 'rgba(0,0,0,0)');
  g.addColorStop(0.38, strong ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(0.82, 'rgba(0,0,0,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  if (strong) { c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(x + w * 0.3, y + 4, Math.max(2, w * 0.05), h - 8); }
}

// ---------- Layout ----------
const CAP = {
  pod: { w: 40, h: 54 }, bubble: { w: 44, h: 50 }, explorer: { w: 48, h: 48 },
  moonship: { w: 48, h: 90 }, marsship: { w: 62, h: 46 },
};
export function rocketLayout(b, o = {}) {
  const from = o.from || 0;
  const segs = [];
  let y = 0, prevW = null;
  const capOnly = !!o.capsuleOnly;
  if (o.only != null) {
    const p = findPart('stage', b.stages[o.only]);
    segs.push({ type: 'stage', id: p.id, idx: o.only, y: 12, h: p.h, w: p.w });
    return { segs, height: 12 + p.h, bottomW: p.w };
  }
  if (!capOnly) {
    y = 12;
    b.stages.slice(from).forEach((id, i) => {
      const p = findPart('stage', id);
      if (prevW != null && prevW !== p.w) { segs.push({ type: 'adapter', y, h: 10, w0: prevW, w1: p.w }); y += 10; }
      segs.push({ type: 'stage', id, idx: from + i, y, h: p.h, w: p.w });
      y += p.h; prevW = p.w;
    });
    if (b.cargo !== 'none' && o.cargo !== false) {
      const w = Math.max(44, prevW || 44);
      if (prevW && prevW !== w) { segs.push({ type: 'adapter', y, h: 8, w0: prevW, w1: w }); y += 8; }
      segs.push({ type: 'cargo', y, h: 52, w }); y += 52; prevW = w;
    }
  }
  const cap = CAP[b.capsule] || CAP.pod;
  let ch = cap.h;
  if (b.capsule === 'moonship' && o.noLander) ch = 48;
  if (prevW && prevW !== cap.w && !capOnly) { segs.push({ type: 'adapter', y, h: 8, w0: prevW, w1: cap.w }); y += 8; }
  segs.push({ type: 'capsule', y, h: ch, w: cap.w });
  y += ch;
  return { segs, height: y, bottomW: segs.length ? (segs[0].w || segs[0].w0) : 40 };
}

// ---------- Rocket ----------
// o: x,y (ground point under nozzle), s scale, angle, from, flame 0..1, t time, capsuleOnly, noLander, cargo(false=hide),
//    boosters(bool), look (-1..1 eye direction), chute (0..1)
export function drawRocket(c, b, o) {
  const s = o.s || 1, t = o.t || 0;
  const L = rocketLayout(b, o);
  const main = hex(b.color), acc = hex(b.color2);
  const style = b.style;
  c.save();
  c.translate(o.x, o.y);
  if (o.angle) { c.translate(0, -L.height * s / 2); c.rotate(o.angle); c.translate(0, L.height * s / 2); }
  c.scale(s, s);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const lw = style === 'retro' ? 3.2 : 2.6;
  const stagesShown = L.segs.filter(g => g.type === 'stage');
  const bottom = stagesShown[0];
  const first = o.only != null ? o.only : (o.from || 0);
  const hasBoosters = o.boosters !== false && !o.capsuleOnly && first === 0 && b.booster !== 'none' && bottom;

  // flames
  if (o.flame > 0 && bottom) drawFlame(c, b, 0, 0, bottom.w * 0.55, o.flame, t);
  if (o.capsuleOnly && o.thruster > 0) { drawFlame(c, b, 0, 0, 22, o.thruster * 0.6, t); }

  // boosters (behind)
  if (hasBoosters) drawBoosters(c, b, bottom, o.flame || 0, t, lw);

  // fins behind? (back fin hidden) – fins are drawn after body for overlap at sides
  // engine bell
  if (bottom) {
    const bw = bottom.w;
    c.beginPath();
    c.moveTo(-bw * 0.24, -12); c.lineTo(bw * 0.24, -12); c.lineTo(bw * 0.34, 0); c.lineTo(-bw * 0.34, 0); c.closePath();
    c.fillStyle = '#5C677D'; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
  }

  for (const g of L.segs) {
    const top = -(g.y + g.h);
    if (g.type === 'adapter') {
      c.beginPath();
      c.moveTo(-g.w0 / 2, -g.y); c.lineTo(g.w0 / 2, -g.y); c.lineTo(g.w1 / 2, top); c.lineTo(-g.w1 / 2, top); c.closePath();
      c.fillStyle = '#8D99AE'; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
    } else if (g.type === 'stage' || g.type === 'cargo') {
      const x = -g.w / 2, rad = style === 'retro' ? 10 : 4;
      rr(c, x, top, g.w, g.h, rad);
      c.fillStyle = g.type === 'cargo' ? lighten(main, 0.35) : main; c.fill();
      c.save(); rr(c, x, top, g.w, g.h, rad); c.clip();
      if (g.type === 'stage') drawPattern(c, b.pattern, acc, x, top, g.w, g.h, 0);
      if (style === 'robot') {
        c.strokeStyle = 'rgba(27,31,59,0.45)'; c.lineWidth = 1.5;
        for (let k = 1; k < 3; k++) { c.beginPath(); c.moveTo(x, top + g.h * k / 3); c.lineTo(x + g.w, top + g.h * k / 3); c.stroke(); }
      }
      shade(c, x, top, g.w, g.h, style);
      c.restore();
      rr(c, x, top, g.w, g.h, rad); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
      if (style === 'retro' || style === 'robot') {
        c.fillStyle = style === 'robot' ? '#ADB5BD' : 'rgba(27,31,59,0.55)';
        for (let k = 0; k < 5; k++) {
          const rx = x + 6 + k * (g.w - 12) / 4;
          c.beginPath(); c.arc(rx, top + 5, 1.8, 0, 7); c.fill();
          c.beginPath(); c.arc(rx, top + g.h - 5, 1.8, 0, 7); c.fill();
        }
      }
      if (g.type === 'cargo') {
        // window with cargo peeking
        c.save();
        c.beginPath(); c.arc(0, top + g.h / 2, 15, 0, 7); c.fillStyle = '#CDEBFF'; c.fill();
        c.clip();
        if (b.cargo === 'satellite') drawSatellite(c, 0, top + g.h / 2, 0.42, 0, t);
        if (b.cargo === 'telescope') drawTelescope(c, 0, top + g.h / 2, 0.36, t);
        if (b.cargo === 'rover') drawRover(c, 0, top + g.h / 2 + 8, 0.36, 0);
        c.restore();
        c.beginPath(); c.arc(0, top + g.h / 2, 15, 0, 7); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
      }
      if (style === 'robot' && g === stagesShown[stagesShown.length - 1]) {
        // blinking lights
        for (let k = 0; k < 3; k++) {
          const on = Math.floor(t * 3 + k) % 3 === 0;
          c.beginPath(); c.arc(-8 + k * 8, top + g.h - 12, 2.5, 0, 7);
          c.fillStyle = on ? '#80ED99' : '#2D6A4F'; c.fill();
        }
      }
    } else if (g.type === 'capsule') {
      drawCapsule(c, b, g, lw, t, o);
    }
  }

  // fins on bottom stage
  if (bottom && b.fins !== 'none' && first === 0 && !o.capsuleOnly) drawFins(c, b.fins, bottom, acc, lw);

  // silly face on the top stage
  if (style === 'silly' && stagesShown.length && o.only == null) {
    const g = stagesShown[stagesShown.length - 1];
    drawFace(c, 0, -(g.y + g.h * 0.55), Math.min(1, g.w / 48), o.look || 0, t, o.mood);
  }
  c.restore();
  return L;
}

function drawFace(c, x, y, k, look, t, mood) {
  const blink = (t % 3.3) < 0.12;
  for (const sx of [-1, 1]) {
    const ex = x + sx * 9 * k;
    c.beginPath(); c.ellipse(ex, y - 6 * k, 7 * k, blink ? 1.2 : 8 * k, 0, 0, 7);
    c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    if (!blink) { c.beginPath(); c.arc(ex + look * 3 * k, y - 5 * k - (mood === 'wow' ? 2 : 0), 3.6 * k, 0, 7); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(ex + look * 3 * k + 1.2, y - 6.5 * k, 1.2 * k, 0, 7); c.fillStyle = '#fff'; c.fill(); }
  }
  c.fillStyle = 'rgba(255,102,196,0.55)';
  c.beginPath(); c.ellipse(x - 15 * k, y + 5 * k, 4 * k, 2.5 * k, 0, 0, 7); c.fill();
  c.beginPath(); c.ellipse(x + 15 * k, y + 5 * k, 4 * k, 2.5 * k, 0, 0, 7); c.fill();
  c.beginPath();
  if (mood === 'wow') { c.ellipse(x, y + 8 * k, 4 * k, 5 * k, 0, 0, 7); c.fillStyle = INK; c.fill(); }
  else { c.arc(x, y + 3 * k, 7 * k, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke(); }
}

function drawCapsule(c, b, g, lw, t, o) {
  const main = hex(b.color), acc = hex(b.color2);
  const y0 = -g.y, w = g.w;
  const capBody = b.color === 'white' ? '#F4F6FA' : lighten(main, 0.55);
  c.lineWidth = lw; c.strokeStyle = INK;
  const kind = b.capsule;
  if (kind === 'pod') {
    c.beginPath();
    c.moveTo(-w / 2, y0); c.lineTo(w / 2, y0); c.lineTo(7, y0 - g.h + 6);
    c.quadraticCurveTo(0, y0 - g.h - 4, -7, y0 - g.h + 6); c.closePath();
    c.fillStyle = capBody; c.fill();
    c.save(); c.clip(); c.fillStyle = acc; c.fillRect(-w, y0 - 10, w * 2, 10); shade(c, -w / 2, y0 - g.h - 5, w, g.h + 5, b.style); c.restore();
    c.stroke();
    window_(c, 0, y0 - g.h * 0.45, 9, t);
  } else if (kind === 'bubble') {
    rr(c, -w / 2, y0 - 18, w, 18, 5); c.fillStyle = capBody; c.fill(); c.stroke();
    c.fillStyle = acc; c.fillRect(-w / 2 + 2, y0 - 8, w - 4, 5);
    c.beginPath(); c.arc(0, y0 - 18, w / 2 - 3, Math.PI, 0); c.closePath();
    c.fillStyle = 'rgba(180,230,255,0.85)'; c.fill(); c.stroke();
    astronautHead(c, 0, y0 - 28, 0.9, t);
    c.beginPath(); c.arc(-6, y0 - 34, 6, Math.PI * 1.1, Math.PI * 1.5); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3; c.stroke();
  } else if (kind === 'explorer' || kind === 'moonship') {
    let base = y0;
    if (kind === 'moonship' && !o.noLander) {
      // lander module (gold foil) under the capsule
      const lh = 40;
      c.beginPath(); c.moveTo(-w / 2 + 2, base); c.lineTo(w / 2 - 2, base); c.lineTo(w / 2 + 2, base - lh); c.lineTo(-w / 2 - 2, base - lh); c.closePath();
      c.fillStyle = '#E9B949'; c.fill(); c.stroke();
      c.strokeStyle = 'rgba(120,80,0,0.5)'; c.lineWidth = 1.2;
      for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(-w / 2, base - lh * k / 4); c.lineTo(w / 2, base - lh * k / 4 + 3); c.stroke(); }
      c.lineWidth = lw; c.strokeStyle = INK;
      // folded legs
      c.beginPath(); c.moveTo(-w / 2, base - 6); c.lineTo(-w / 2 - 6, base + 2); c.moveTo(w / 2, base - 6); c.lineTo(w / 2 + 6, base + 2); c.stroke();
      base -= lh;
    }
    const h = 48;
    c.beginPath();
    c.moveTo(-w / 2, base); c.lineTo(w / 2, base); c.lineTo(9, base - h + 6); c.lineTo(-9, base - h + 6); c.closePath();
    c.fillStyle = capBody; c.fill();
    c.save(); c.clip(); shade(c, -w / 2, base - h, w, h, b.style); c.fillStyle = acc; c.fillRect(-w, base - h * 0.62, w * 2, 5); c.restore();
    c.stroke();
    // heat shield band
    rr(c, -w / 2 - 2, base - 6, w + 4, 7, 3); c.fillStyle = '#6D4C41'; c.fill(); c.stroke();
    rr(c, -6, base - h + 1, 12, 6, 2); c.fillStyle = '#ADB5BD'; c.fill(); c.stroke();
    window_(c, -8, base - h * 0.4, 6, t, true);
    window_(c, 8, base - h * 0.4, 6, t);
  } else if (kind === 'marsship') {
    // aeroshell
    const h = g.h;
    c.beginPath();
    c.moveTo(-w / 2, y0); c.lineTo(w / 2, y0); c.lineTo(w / 2 - 6, y0 - 8);
    c.lineTo(10, y0 - h + 4); c.quadraticCurveTo(0, y0 - h - 4, -10, y0 - h + 4); c.lineTo(-w / 2 + 6, y0 - 8); c.closePath();
    c.fillStyle = capBody; c.fill();
    c.save(); c.clip(); shade(c, -w / 2, y0 - h, w, h, b.style); c.fillStyle = acc; c.fillRect(-w, y0 - h * 0.55, w * 2, 6); c.restore();
    c.stroke();
    rr(c, -w / 2 - 2, y0 - 6, w + 4, 7, 3); c.fillStyle = '#B5651D'; c.fill(); c.stroke();
    starPath(c, 0, y0 - h * 0.35, 6); c.fillStyle = '#FFD60A'; c.fill(); c.lineWidth = 1.5; c.stroke();
  }
  if (b.style === 'robot') {
    const topY = y0 - g.h;
    c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, topY + 2); c.lineTo(0, topY - 12); c.stroke();
    c.beginPath(); c.arc(0, topY - 14, 3.5, 0, 7); c.fillStyle = Math.floor(t * 2) % 2 ? '#F94144' : '#FFD60A'; c.fill(); c.stroke();
  }
}

function window_(c, x, y, r, t, face) {
  c.beginPath(); c.arc(x, y, r + 2.5, 0, 7); c.fillStyle = '#8D99AE'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#9EE6FF'; c.fill();
  c.save(); c.clip();
  astronautHead(c, x, y + r * 0.25, r / 9, t);
  c.restore();
  c.beginPath(); c.arc(x - r * 0.3, y - r * 0.35, r * 0.25, 0, 7); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
}

export function astronautHead(c, x, y, k, t = 0) {
  c.beginPath(); c.arc(x, y, 8 * k, 0, 7); c.fillStyle = '#FFFFFF'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.ellipse(x, y + 0.5 * k, 5.5 * k, 4.5 * k, 0, 0, 7); c.fillStyle = '#FFD7B5'; c.fill();
  const blink = (t % 4) < 0.12;
  c.fillStyle = INK;
  if (!blink) { c.beginPath(); c.arc(x - 2 * k, y - 0.5 * k, 0.9 * k, 0, 7); c.arc(x + 2 * k, y - 0.5 * k, 0.9 * k, 0, 7); c.fill(); }
  c.beginPath(); c.arc(x, y + 1.5 * k, 2 * k, 0.1 * Math.PI, 0.9 * Math.PI); c.lineWidth = 0.9 * k; c.strokeStyle = INK; c.stroke();
}

function drawFins(c, fins, g, col, lw) {
  const w = g.w, yb = -g.y, h = g.h;
  c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = lw;
  for (const sx of [-1, 1]) {
    c.beginPath();
    const x0 = sx * w / 2;
    if (fins === 'small') {
      c.moveTo(x0, yb - h * 0.45); c.lineTo(x0 + sx * 16, yb + 2); c.lineTo(x0, yb + 2);
    } else if (fins === 'swept') {
      c.moveTo(x0, yb - h * 0.6); c.quadraticCurveTo(x0 + sx * 18, yb - h * 0.2, x0 + sx * 24, yb + 12); c.lineTo(x0 + sx * 6, yb + 2); c.lineTo(x0, yb + 2);
    } else if (fins === 'round') {
      c.moveTo(x0, yb - h * 0.5); c.quadraticCurveTo(x0 + sx * 30, yb - h * 0.35, x0 + sx * 16, yb + 6); c.lineTo(x0, yb);
    } else if (fins === 'star') {
      c.moveTo(x0, yb - h * 0.4); c.lineTo(x0 + sx * 18, yb - 4); c.lineTo(x0, yb + 2);
    }
    c.closePath(); c.fill(); c.stroke();
    if (fins === 'star') drawStar(c, x0 + sx * 20, yb - 8, 8, '#FFD60A', INK, 2);
  }
  // front fin
  c.beginPath(); rr(c, -3, yb - h * 0.35, 6, h * 0.35 + 4, 3); c.fillStyle = darken(col, 0.15); c.fill(); c.stroke();
}

export function drawBoosterPiece(c, b, s) {
  const B = findPart('booster', b.booster);
  const bw = 16 * B.size, bh = 80 * B.size;
  c.save(); c.scale(s, s); c.translate(0, bh / 2);
  oneBooster(c, b, 0, 0, bw, bh, 0, 0, 2.6);
  c.restore();
}
function oneBooster(c, b, bx, by, bw, bh, flame, t, lw) {
  const main = hex(b.color), acc = hex(b.color2);
  if (flame > 0) drawFlame(c, b, bx, by, bw * 0.8, flame, t);
  c.beginPath(); c.moveTo(bx - bw * 0.3, by - 8); c.lineTo(bx + bw * 0.3, by - 8); c.lineTo(bx + bw * 0.4, by); c.lineTo(bx - bw * 0.4, by); c.closePath();
  c.fillStyle = '#5C677D'; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
  const top = by - 8 - bh;
  c.beginPath();
  c.moveTo(bx - bw / 2, by - 8); c.lineTo(bx + bw / 2, by - 8); c.lineTo(bx + bw / 2, top + 14);
  c.quadraticCurveTo(bx, top - 10, bx - bw / 2, top + 14); c.closePath();
  c.fillStyle = acc === '#F4F6FA' ? '#E9ECEF' : acc; c.fill();
  c.save(); c.clip(); c.fillStyle = main; c.fillRect(bx - bw, top - 12, bw * 2, 22); shade(c, bx - bw / 2, top - 10, bw, bh + 10, b.style); c.restore();
  c.stroke();
}
function drawBoosters(c, b, g, flame, t, lw) {
  const B = findPart('booster', b.booster);
  const bw = 16 * B.size, bh = Math.max(70, g.h * 0.8) * B.size;
  const main = hex(b.color), acc = hex(b.color2);
  const positions = [];
  if (B.count === 4) { positions.push(-(g.w / 2 + bw * 1.35), g.w / 2 + bw * 1.35); }
  positions.push(-(g.w / 2 + bw / 2 - 2), g.w / 2 + bw / 2 - 2);
  positions.forEach((bx, i) => {
    const outer = B.count === 4 && i < 2;
    oneBooster(c, b, bx, outer ? -6 : 0, bw, bh, flame * 0.75, t + i, lw);
  });
}

export function drawFlame(c, b, x, y, w, f, t) {
  const F = findPart('flame', b.flame);
  const flick = 1 + 0.15 * Math.sin(t * 40 + x) + 0.08 * Math.sin(t * 23 + x * 2);
  const L = (26 + 70 * f) * flick;
  const cols = F.rainbow ? [ '#FFFFFF', RAINBOW[Math.floor(t * 10) % 7], RAINBOW[(Math.floor(t * 10) + 3) % 7] ] : F.c;
  const layers = [[1, cols[2]], [0.72, cols[1]], [0.42, cols[0]]];
  for (const [k, col] of layers) {
    c.beginPath();
    c.moveTo(x - w / 2 * k, y);
    c.quadraticCurveTo(x - w * 0.6 * k, y + L * k * 0.5, x, y + L * k);
    c.quadraticCurveTo(x + w * 0.6 * k, y + L * k * 0.5, x + w / 2 * k, y);
    c.closePath(); c.fillStyle = col; c.fill();
  }
}

export function drawChutes(c, b, x, y, s, open, t) {
  if (open <= 0) return;
  const C = findPart('chute', b.chute);
  const n = C.n;
  const spread = n === 1 ? [0] : [-1, 0, 1];
  c.save(); c.translate(x, y); c.scale(s, s);
  const sway = Math.sin(t * 1.6) * 3;
  spread.forEach((k, i) => {
    const R = (n === 1 ? 40 : 30) * (0.3 + 0.7 * open);
    const cx = k * 46 * open + sway, cy = -(70 + (k === 0 ? 14 : 0)) * (0.4 + 0.6 * open);
    // lines
    c.strokeStyle = 'rgba(27,31,59,0.7)'; c.lineWidth = 1.2;
    for (const e of [-1, -0.4, 0.4, 1]) { c.beginPath(); c.moveTo(cx + e * R, cy); c.lineTo(0, 0); c.stroke(); }
    // canopy with gores
    const gores = 6;
    for (let gI = 0; gI < gores; gI++) {
      const a0 = Math.PI + gI * Math.PI / gores, a1 = a0 + Math.PI / gores;
      c.beginPath(); c.moveTo(cx, cy);
      c.ellipse(cx, cy, R, R * 0.7, 0, a0, a1);
      c.closePath();
      let col;
      if (C.look === 'rainbow') col = RAINBOW[(gI + i * 2) % 7];
      else if (C.look === 'dots') col = hex(b.color2) === '#F4F6FA' ? hex(b.color) : hex(b.color2);
      else col = gI % 2 ? '#FFFFFF' : '#FF8500';
      c.fillStyle = col; c.fill();
    }
    if (C.look === 'dots') {
      c.save(); c.beginPath(); c.ellipse(cx, cy, R, R * 0.7, 0, Math.PI, 0); c.clip();
      c.fillStyle = '#fff';
      for (let dx = -R; dx < R; dx += 12) for (let dy = -R; dy < 0; dy += 11) { c.beginPath(); c.arc(cx + dx + ((dy / 11) % 2 ? 6 : 0), cy + dy + 4, 3, 0, 7); c.fill(); }
      c.restore();
    }
    c.beginPath(); c.ellipse(cx, cy, R, R * 0.7, 0, Math.PI, 0);
    c.quadraticCurveTo(cx + R * 0.5, cy + 6, cx, cy + 2); c.quadraticCurveTo(cx - R * 0.5, cy + 6, cx - R, cy);
    c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  });
  c.restore();
}

// ---------- Cargo & friends ----------
export function drawSatellite(c, x, y, s, open = 1, t = 0) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round';
  const pw = 20 + 40 * open;
  for (const sx of [-1, 1]) {
    c.beginPath(); c.moveTo(sx * 16, 0); c.lineTo(sx * 22, 0); c.stroke();
    rr(c, sx > 0 ? 22 : -22 - pw, -12, pw, 24, 2); c.fillStyle = '#3A86FF'; c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5;
    for (let k = 1; k < 4; k++) { const lx = (sx > 0 ? 22 : -22 - pw) + pw * k / 4; c.beginPath(); c.moveTo(lx, -11); c.lineTo(lx, 11); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 3;
  }
  rr(c, -16, -18, 32, 36, 5); c.fillStyle = '#E9B949'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(0, -18); c.lineTo(0, -30); c.stroke();
  c.beginPath(); c.arc(0, -34, 6, 0, 7); c.fillStyle = Math.floor(t * 2) % 2 ? '#F94144' : '#FFD60A'; c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 0, 7, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
  c.restore();
}
export function drawTelescope(c, x, y, s, t = 0) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = INK;
  rr(c, -18, -40, 36, 70, 6); c.fillStyle = '#CED4DA'; c.fill(); c.stroke();
  c.beginPath(); c.ellipse(0, -40, 18, 6, 0, 0, 7); c.fillStyle = '#343A40'; c.fill(); c.stroke();
  for (const sx of [-1, 1]) { rr(c, sx > 0 ? 20 : -48, -20, 28, 40, 2); c.fillStyle = '#3A86FF'; c.fill(); c.stroke(); }
  c.fillStyle = '#E9B949'; c.fillRect(-17, 10, 34, 18);
  c.restore();
}
export function drawRover(c, x, y, s, wheel = 0, t = 0) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round';
  // mast + camera head
  c.beginPath(); c.moveTo(14, -24); c.lineTo(14, -52); c.stroke();
  rr(c, 4, -64, 22, 12, 4); c.fillStyle = '#F4F6FA'; c.fill(); c.stroke();
  c.beginPath(); c.arc(20, -58, 3.5, 0, 7); c.fillStyle = '#4CC9F0'; c.fill();
  // body
  rr(c, -34, -32, 68, 18, 4); c.fillStyle = '#F4F6FA'; c.fill(); c.stroke();
  rr(c, -28, -40, 34, 8, 2); c.fillStyle = '#3A86FF'; c.fill(); c.stroke();
  // wheels
  for (const wx of [-26, 0, 26]) {
    c.beginPath(); c.moveTo(wx, -14); c.lineTo(wx, -6); c.stroke();
    c.beginPath(); c.arc(wx, 0, 10, 0, 7); c.fillStyle = '#495057'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(wx + Math.cos(wheel) * 8, Math.sin(wheel) * 8); c.lineTo(wx - Math.cos(wheel) * 8, -Math.sin(wheel) * 8); c.strokeStyle = '#ADB5BD'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = INK; c.lineWidth = 3;
  }
  c.restore();
}

export function drawAstronaut(c, x, y, s, { t = 0, wave = false, walk = 0, color = '#3A86FF', flip = false } = {}) {
  c.save(); c.translate(x, y); c.scale(flip ? -s : s, s); c.lineWidth = 2.5; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round';
  const leg = Math.sin(walk) * 6;
  // backpack
  rr(c, -15, -38, 8, 22, 3); c.fillStyle = '#ADB5BD'; c.fill(); c.stroke();
  // legs
  c.fillStyle = '#F4F6FA';
  rr(c, -9 + leg * 0.4, -14, 8, 14, 3); c.fill(); c.stroke();
  rr(c, 1 - leg * 0.4, -14, 8, 14, 3); c.fill(); c.stroke();
  // body
  rr(c, -11, -38, 22, 26, 7); c.fill(); c.stroke();
  c.fillStyle = color; c.fillRect(-6, -30, 12, 5);
  // arms
  c.lineWidth = 6; c.strokeStyle = INK;
  const armA = wave ? -2.2 + Math.sin(t * 8) * 0.4 : 0.5;
  c.beginPath(); c.moveTo(9, -33); c.lineTo(9 + Math.cos(armA) * 14, -33 + Math.sin(armA) * 14); c.stroke();
  c.lineWidth = 4; c.strokeStyle = '#F4F6FA';
  c.beginPath(); c.moveTo(9, -33); c.lineTo(9 + Math.cos(armA) * 14, -33 + Math.sin(armA) * 14); c.stroke();
  c.lineWidth = 6; c.strokeStyle = INK;
  c.beginPath(); c.moveTo(-9, -33); c.lineTo(-14, -20); c.stroke();
  c.lineWidth = 4; c.strokeStyle = '#F4F6FA';
  c.beginPath(); c.moveTo(-9, -33); c.lineTo(-14, -20); c.stroke();
  // helmet
  c.lineWidth = 2.5; c.strokeStyle = INK;
  c.beginPath(); c.arc(0, -50, 13, 0, 7); c.fillStyle = '#F4F6FA'; c.fill(); c.stroke();
  c.beginPath(); c.ellipse(2, -50, 9, 7.5, 0, 0, 7); c.fillStyle = '#FFD7B5'; c.fill(); c.stroke();
  c.fillStyle = INK; c.beginPath(); c.arc(-1, -51, 1.3, 0, 7); c.arc(5, -51, 1.3, 0, 7); c.fill();
  c.beginPath(); c.arc(2, -48, 3, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = 1.5; c.stroke();
  c.beginPath(); c.arc(-3, -55, 3, Math.PI, 1.5 * Math.PI); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.stroke();
  c.restore();
}

export function drawFlag(c, x, y, s, b, t = 0, raise = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = INK;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -70); c.stroke();
  const fy = -70 + (1 - raise) * 50;
  c.beginPath(); c.moveTo(0, fy);
  for (let k = 0; k <= 10; k++) c.lineTo(k * 5, fy + Math.sin(t * 4 + k * 0.6) * 2 * (k / 10));
  for (let k = 10; k >= 0; k--) c.lineTo(k * 5, fy + 30 + Math.sin(t * 4 + k * 0.6) * 2 * (k / 10));
  c.closePath(); c.fillStyle = hex(b.color); c.fill(); c.stroke();
  c.fillStyle = hex(b.color2); c.fillRect(2, fy + 11, 46, 8);
  drawStar(c, 25, fy + 15, 7, '#FFD60A', INK, 1.5);
  c.restore();
}

export function drawStation(c, x, y, s, t = 0) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round';
  // truss
  c.fillStyle = '#ADB5BD'; rr(c, -150, -6, 300, 12, 3); c.fill(); c.stroke();
  for (const px of [-150, -95, 95, 150]) {
    for (const py of [-1, 1]) { rr(c, px - 22, py > 0 ? 10 : -70, 44, 60, 3); c.fillStyle = '#3A86FF'; c.fill(); c.stroke(); }
  }
  // modules
  rr(c, -50, -22, 100, 44, 18); c.fillStyle = '#F4F6FA'; c.fill(); c.stroke();
  rr(c, -90, -16, 44, 32, 12); c.fillStyle = '#E9ECEF'; c.fill(); c.stroke();
  // docking port on the left
  rr(c, -112, -10, 24, 20, 5); c.fillStyle = '#CED4DA'; c.fill(); c.stroke();
  c.beginPath(); c.arc(-112, 0, 5, 0, 7); c.fillStyle = Math.floor(t * 2) % 2 ? '#80ED99' : '#2D6A4F'; c.fill(); c.stroke();
  // windows with friends
  for (const wx of [-20, 18]) { c.beginPath(); c.arc(wx, 0, 9, 0, 7); c.fillStyle = '#9EE6FF'; c.fill(); c.stroke(); c.save(); c.beginPath(); c.arc(wx, 0, 9, 0, 7); c.clip(); astronautHead(c, wx, 2, 0.9, t + wx); c.restore(); }
  c.restore();
}

// Earth seen from space
export function drawEarth(c, x, y, r, t = 0) {
  c.save();
  const glow = c.createRadialGradient(x, y, r * 0.95, x, y, r * 1.15);
  glow.addColorStop(0, 'rgba(120,200,255,0.6)'); glow.addColorStop(1, 'rgba(120,200,255,0)');
  c.fillStyle = glow; c.beginPath(); c.arc(x, y, r * 1.15, 0, 7); c.fill();
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#2F80ED'; c.fill();
  c.clip();
  c.fillStyle = '#4CAF50';
  const blobs = [[-0.3, -0.4, 0.35], [0.35, -0.1, 0.3], [-0.1, 0.4, 0.28], [0.5, 0.5, 0.18], [-0.6, 0.1, 0.2]];
  const rot = (t * 0.03) % 2;
  for (const [bx, by, br] of blobs) {
    for (const off of [0, -2, 2]) {
      const px = x + (bx + rot + off) * r, py = y + by * r;
      c.beginPath(); c.ellipse(px, py, br * r, br * r * 0.7, 0.4, 0, 7); c.fill();
      c.beginPath(); c.ellipse(px + br * r * 0.5, py + br * r * 0.3, br * r * 0.6, br * r * 0.5, 0, 0, 7); c.fill();
    }
  }
  c.fillStyle = 'rgba(255,255,255,0.75)';
  for (let k = 0; k < 7; k++) {
    const px = x + (((k * 0.37 + t * 0.05) % 2) - 1) * r * 1.1, py = y + (k / 7 - 0.5) * r * 1.6;
    c.beginPath(); c.ellipse(px, py, r * 0.25, r * 0.05, 0.1, 0, 7); c.fill();
  }
  if (r < 200) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(x, y - r, r * 0.5, r * 0.12, 0, 0, 7); c.fill(); }
  const sh = c.createLinearGradient(x - r, y - r, x + r, y + r);
  sh.addColorStop(0, 'rgba(255,255,255,0.15)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,30,0.45)');
  c.fillStyle = sh; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
  c.beginPath(); c.arc(x, y, r, 0, 7); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
}
export function drawMoon(c, x, y, r, face = false, t = 0) {
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#D9D9D9'; c.fill(); c.clip();
  c.fillStyle = '#BDBDBD';
  for (const [cx, cy, cr] of [[-0.4, -0.3, 0.2], [0.3, 0.2, 0.25], [-0.1, 0.5, 0.12], [0.45, -0.45, 0.12], [-0.55, 0.3, 0.1]]) {
    c.beginPath(); c.arc(x + cx * r, y + cy * r, cr * r, 0, 7); c.fill();
  }
  const sh = c.createLinearGradient(x - r, y, x + r, y);
  sh.addColorStop(0, 'rgba(255,255,255,0.2)'); sh.addColorStop(1, 'rgba(0,0,30,0.35)');
  c.fillStyle = sh; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
  c.beginPath(); c.arc(x, y, r, 0, 7); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  if (face) drawFace(c, x, y, r / 40, 0, t, null);
}
export function drawMars(c, x, y, r) {
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#E2725B'; c.fill(); c.clip();
  c.fillStyle = '#C1440E';
  for (const [cx, cy, cr] of [[-0.3, -0.2, 0.3], [0.35, 0.3, 0.22], [0.1, -0.5, 0.15]]) { c.beginPath(); c.ellipse(x + cx * r, y + cy * r, cr * r, cr * r * 0.6, 0.3, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(x, y - r * 0.95, r * 0.35, r * 0.12, 0, 0, 7); c.fill();
  const sh = c.createLinearGradient(x - r, y, x + r, y);
  sh.addColorStop(0, 'rgba(255,255,255,0.15)'); sh.addColorStop(1, 'rgba(40,0,0,0.4)');
  c.fillStyle = sh; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
  c.beginPath(); c.arc(x, y, r, 0, 7); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
}

export function drawCloud(c, x, y, s, alpha = 1) {
  c.save(); c.globalAlpha = alpha; c.fillStyle = '#FFFFFF';
  for (const [dx, dy, r] of [[-30, 0, 22], [0, -12, 30], [32, 0, 22], [12, 6, 22], [-12, 8, 20]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); c.fill(); }
  c.restore();
}

// ---------- Color helpers ----------
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function lighten(h, k) { const [r, g, b] = hexToRgb(h); return `rgb(${r + (255 - r) * k | 0},${g + (255 - g) * k | 0},${b + (255 - b) * k | 0})`; }
export function darken(h, k) { const [r, g, b] = hexToRgb(h); return `rgb(${r * (1 - k) | 0},${g * (1 - k) | 0},${b * (1 - k) | 0})`; }

// ---------- Thumbnails for the hangar ----------
export function drawThumb(c, cat, item, build, size, t = 0) {
  c.clearRect(0, 0, size, size);
  const cx = size / 2;
  const b = { ...build };
  if (cat === 'color') {
    c.beginPath(); c.arc(cx, cx, size * 0.34, 0, 7); c.fillStyle = item.hex; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.arc(cx - size * 0.1, cx - size * 0.1, size * 0.08, 0, 7); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
    return;
  }
  if (cat === 'pattern') {
    c.save(); rr(c, size * 0.2, size * 0.12, size * 0.6, size * 0.76, 10); c.fillStyle = hex(b.color); c.fill(); c.clip();
    drawPattern(c, item.id, hex(b.color2), size * 0.2, size * 0.12, size * 0.6, size * 0.76, size * 0.12);
    shade(c, size * 0.2, size * 0.12, size * 0.6, size * 0.76, b.style);
    c.restore(); rr(c, size * 0.2, size * 0.12, size * 0.6, size * 0.76, 10); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    return;
  }
  if (cat === 'flame') {
    b.flame = item.id; drawFlame(c, b, cx, size * 0.18, size * 0.36, 0.9, t);
    return;
  }
  if (cat === 'chute') {
    b.chute = item.id; b.capsule = 'pod';
    drawChutes(c, b, cx, size * 0.78, size / 150, 1, 0);
    drawRocket(c, b, { x: cx, y: size * 0.92, s: size / 180, capsuleOnly: true, t });
    return;
  }
  if (cat === 'cargo') {
    if (item.id === 'satellite') drawSatellite(c, cx, cx + 6, size / 180, 1, t);
    else if (item.id === 'telescope') drawTelescope(c, cx, cx + 4, size / 150, t);
    else if (item.id === 'rover') drawRover(c, cx, cx + size * 0.18, size / 120, 0, t);
    else noneMark(c, size);
    return;
  }
  if (cat === 'capsule') {
    b.capsule = item.id;
    const L = rocketLayout(b, { capsuleOnly: true });
    const s = Math.min(size * 0.7 / L.height, size * 0.75 / 62);
    drawRocket(c, b, { x: cx, y: cx + L.height * s / 2, s, capsuleOnly: true, t });
    return;
  }
  if (cat === 'stage') {
    const p = item;
    const s = Math.min(size * 0.78 / (p.h * 0.5 + 85), size * 0.7 / p.w);
    c.save(); c.translate(cx, size * 0.5 + p.h * s / 2); c.scale(s, s);
    c.beginPath(); c.moveTo(-p.w * 0.24, 0); c.lineTo(p.w * 0.24, 0); c.lineTo(p.w * 0.34, 12); c.lineTo(-p.w * 0.34, 12); c.closePath();
    c.fillStyle = '#5C677D'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    rr(c, -p.w / 2, -p.h, p.w, p.h, 4); c.fillStyle = hex(b.color); c.fill();
    c.save(); rr(c, -p.w / 2, -p.h, p.w, p.h, 4); c.clip(); drawPattern(c, b.pattern, hex(b.color2), -p.w / 2, -p.h, p.w, p.h, 0); shade(c, -p.w / 2, -p.h, p.w, p.h, b.style); c.restore();
    rr(c, -p.w / 2, -p.h, p.w, p.h, 4); c.stroke();
    c.restore();
    return;
  }
  if (cat === 'booster' && item.id === 'none') { noneMark(c, size); return; }
  if (cat === 'fins' && item.id === 'none') { noneMark(c, size); return; }
  // full rocket previews for booster / fins / style
  if (cat === 'booster') { b.booster = item.id; b.stages = ['medium']; b.cargo = 'none'; }
  if (cat === 'fins') { b.fins = item.id; b.stages = ['medium']; b.cargo = 'none'; b.booster = 'none'; }
  if (cat === 'style') { b.style = item.id; b.stages = ['medium']; b.cargo = 'none'; b.booster = 'none'; }
  const L = rocketLayout(b, {});
  const s = Math.min(size * 0.8 / (L.height + 14), size * 0.62 / 110);
  drawRocket(c, b, { x: cx, y: size * 0.5 + (L.height * s) / 2, s, t });
}
function noneMark(c, size) {
  c.beginPath(); c.arc(size / 2, size / 2, size * 0.26, 0, 7); c.lineWidth = 6; c.strokeStyle = '#ADB5BD'; c.stroke();
  c.beginPath(); c.moveTo(size * 0.32, size * 0.68); c.lineTo(size * 0.68, size * 0.32); c.stroke();
}
