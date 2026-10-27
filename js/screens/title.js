import { h, btn, icon, onLongPress } from '../ui.js';
import { say } from '../voice.js';
import { sfx, unlockAudio } from '../audio.js';
import { state } from '../state.js';
import { drawRocket } from '../draw.js';
import { starfield, hills, launchPad, tree } from '../bg.js';

export function titleScreen(app) {
  const ui = document.getElementById('ui');
  const play = btn('green round play pulse', 'play', null, () => {
    unlockAudio();
    say(state.done === 0 ? 'Welcome to Rocket Kids! Let\'s build a rocket and fly to space!' : 'Welcome back, astronaut! Pick a mission!');
    app.go('map');
  });
  play.setAttribute('aria-label', 'Play');
  const gear = h('button', { class: 'btn dark round corner tr', 'aria-label': 'Grown-up settings (press and hold)' }, icon('gear'));
  onLongPress(gear, 1200, () => app.openSettings());
  ui.append(h('div', { class: 'title' },
    h('div', { class: 'logo' }, 'Rocket', h('span', {}, 'Kids')),
    play, gear,
  ));

  return {
    draw(c, W, H, t) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0B1033'); g.addColorStop(0.55, '#2B2F7A'); g.addColorStop(1, '#7B5CC9');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      starfield(c, W, H * 0.7, t, 1, t * 8);
      // moon
      c.save(); c.globalAlpha = 0.95; c.fillStyle = '#FFF6D5';
      c.beginPath(); c.arc(W * 0.82, H * 0.22, Math.min(W, H) * 0.08, 0, 7); c.fill(); c.restore();
      const gy = H * 0.86;
      hills(c, W, gy, 0, '#2D6A4F', '#1B4332');
      tree(c, W * 0.12, gy, 1.2); tree(c, W * 0.2, gy, 0.9); tree(c, W * 0.86, gy, 1.1);
      const s = Math.min(1.6, H / 520);
      const x = W * 0.27;
      launchPad(c, x, gy, s * 0.9, 220);
      drawRocket(c, state.build, { x, y: gy - 14 * s * 0.9, s, t, flame: 0.12 + 0.05 * Math.sin(t * 9), look: Math.sin(t * 0.7) });
    },
  };
}
