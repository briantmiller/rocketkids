// Space games: pick a game and a level.
import { h, btn, icon, onTap } from '../ui.js';
import { say } from '../voice.js';
import { sfx } from '../audio.js';
import { state, gameLevelOpen, mgStars } from '../state.js';
import { GAMES } from '../data.js';
import { ICON } from '../icons.js';
import { starfield, spaceGradient } from '../bg.js';
import { drawMoon, drawMars } from '../draw.js';

export function arcadeScreen(app) {
  const ui = document.getElementById('ui');
  const root = h('div', { class: 'arcade' });
  for (const G of GAMES) {
    const got = state.mg[G.id] || [];
    const gi = h('button', { class: 'btn white gicon', 'aria-label': G.name, html: ICON[G.icon] });
    onTap(gi, () => { sfx.tap(); say(G.intro); });
    const levels = h('div', { class: 'levels' });
    let nextMarked = false;
    for (let n = 0; n < G.levels; n++) {
      const open = gameLevelOpen(G.id, n), stars = got[n] || 0;
      const isNext = open && !stars && !nextMarked; if (isNext) nextMarked = true;
      const b = h('button', { class: 'btn lvl ' + (open ? (stars ? 'blue' : 'white') : 'locked') + (isNext ? ' next' : ''), 'aria-label': `${G.name} level ${n + 1}` },
        h('span', { class: 'n' }, open ? String(n + 1) : ''));
      if (open) { const st = h('span', { class: 'st' }); for (let k = 0; k < 3; k++) st.append(h('i', { html: stars > k ? ICON.star : ICON.starEmpty.replace(/rgba\(255,255,255,0\.5\)/, 'rgba(27,31,59,0.35)').replace(/rgba\(255,255,255,0\.15\)/, 'rgba(27,31,59,0.08)') })); b.append(st); }
      else b.append(h('span', { class: 'lk', html: ICON.lock }));
      onTap(b, () => {
        if (!open) { sfx.locked(); say('Finish the level before this one first!'); b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); return; }
        sfx.pick(); app.go('game', { game: G.id, level: n });
      });
      levels.append(b);
    }
    root.append(h('div', { class: 'game-row' }, h('div', { class: 'ghead' }, gi, h('div', { class: 'gname' }, G.name)), levels));
  }
  ui.append(root,
    h('div', { class: 'arcade-head' }, 'Space Games'),
    h('div', { class: 'arcade-total' }, h('i', { html: ICON.star }), String(mgStars())),
    btn('dark round corner tl', 'home', null, () => app.go('map')));
  setTimeout(() => say('Space games! Pick a game and a level. Win stars to meet new pilot friends!'), 250);
  return {
    draw(c, W, H, t) {
      spaceGradient(c, W, H);
      starfield(c, W, H, t, 1, t * 5);
      drawMoon(c, W * 0.9, H * 0.9, Math.min(W, H) * 0.12, true, t);
      drawMars(c, W * 0.06, H * 0.5, Math.min(W, H) * 0.05);
    },
  };
}
