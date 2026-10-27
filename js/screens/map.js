import { h, btn, icon, onTap, onLongPress } from '../ui.js';
import { say } from '../voice.js';
import { sfx } from '../audio.js';
import { state, missionUnlocked } from '../state.js';
import { MISSIONS } from '../data.js';
import { MISSION_ICON, ICON } from '../icons.js';
import { starfield, spaceGradient } from '../bg.js';
import { drawEarth, drawMoon, drawMars, drawRocket } from '../draw.js';

const LAND = [[0.10, 0.80], [0.27, 0.66], [0.44, 0.78], [0.61, 0.64], [0.79, 0.76], [0.88, 0.44], [0.68, 0.34], [0.46, 0.26], [0.22, 0.30]];
const PORT = [[0.25, 0.86], [0.70, 0.80], [0.30, 0.70], [0.72, 0.62], [0.30, 0.53], [0.72, 0.45], [0.30, 0.36], [0.70, 0.27], [0.36, 0.17]];

export function mapScreen(app) {
  const ui = document.getElementById('ui');
  const root = h('div', { class: 'map' });
  root.append(h('div', { class: 'map-head' }, 'Pick a mission!'));
  const nodes = [];
  MISSIONS.forEach((m, i) => {
    const open = missionUnlocked(i);
    const isNext = i === state.done && !state.stars[m.id];
    const b = h('button', { class: 'btn ' + (state.stars[m.id] ? 'blue' : 'white'), 'aria-label': m.name, html: MISSION_ICON[m.icon] });
    const stars = h('div', { class: 'stars' });
    for (let k = 0; k < 3; k++) stars.append(h('i', { html: (state.stars[m.id] || 0) > k ? ICON.star : ICON.starEmpty }));
    const node = h('div', { class: 'node' + (open ? '' : ' locked') + (isNext ? ' next' : '') }, b,
      h('div', { class: 'num' }, String(i + 1)),
      open ? stars : h('div', { class: 'lock', html: ICON.lock }),
    );
    onTap(b, () => {
      if (!open) { sfx.locked(); say(`Finish mission ${i} first!`); node.classList.remove('wiggle'); void node.offsetWidth; node.classList.add('wiggle'); return; }
      sfx.pick();
      app.go('hangar', { mission: i });
    });
    nodes.push(node);
    root.append(node);
  });
  const park = btn('purple park-btn', 'park', 'Rocket Park', () => { say('Rocket Park! Build any rocket and fly for fun.'); app.go('hangar', { mission: -1 }); });
  root.append(park);
  const home = btn('dark round corner tl', 'home', null, () => app.go('title'));
  const gear = h('button', { class: 'btn dark round corner tr', 'aria-label': 'Grown-up settings (press and hold)' }, icon('gear'));
  onLongPress(gear, 1200, () => app.openSettings());
  root.append(home, gear);
  ui.append(root);

  let pos = [];
  function layout() {
    const P = app.W >= app.H ? LAND : PORT;
    pos = P.map(([x, y]) => [x * app.W, y * app.H]);
    nodes.forEach((n, i) => { n.style.left = pos[i][0] + 'px'; n.style.top = pos[i][1] + 'px'; });
  }
  layout();

  return {
    resize: layout,
    draw(c, W, H, t) {
      spaceGradient(c, W, H);
      starfield(c, W, H, t, 1, t * 4);
      const R = Math.max(W, H) * 0.9;
      drawEarth(c, W * 0.5, H + R * 0.82, R, t);
      const land = W >= H;
      drawMoon(c, land ? W * 0.6 : W * 0.88, land ? H * 0.13 : H * 0.33, Math.min(W, H) * 0.06, false, t);
      drawMars(c, land ? W * 0.08 : W * 0.12, land ? H * 0.16 : H * 0.12, Math.min(W, H) * 0.05);
      // path
      c.save(); c.setLineDash([2, 16]); c.lineCap = 'round'; c.lineWidth = 8;
      for (let i = 0; i < pos.length - 1; i++) {
        c.strokeStyle = i < state.done ? 'rgba(255,214,10,0.95)' : 'rgba(255,255,255,0.35)';
        c.beginPath(); c.moveTo(...pos[i]);
        const mx = (pos[i][0] + pos[i + 1][0]) / 2, my = Math.min(pos[i][1], pos[i + 1][1]) - 30;
        c.quadraticCurveTo(mx, my, ...pos[i + 1]); c.stroke();
      }
      c.restore();
      // little rocket hovering at the next mission
      const k = Math.min(state.done, pos.length - 1);
      if (pos[k]) {
        const [x, y] = pos[k];
        drawRocket(c, state.build, { x: x + 78, y: y + 10 + Math.sin(t * 2) * 6, s: 0.38, t, flame: 0.3, angle: 0.2 });
      }
    },
  };
}
