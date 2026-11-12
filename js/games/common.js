// Shared shell for the mini-games: HUD, hearts, result cards.
import { h, btn, icon, onTap, onHold, modal, toast } from '../ui.js';
import { say, hush } from '../voice.js';
import { sfx, setEngine } from '../audio.js';
import { state, setGameStars } from '../state.js';
import { GAMES } from '../data.js';
import { ICON } from '../icons.js';
import { drawThumb, setPilot } from '../draw.js';

export function gameShell(app, gameId, lvl, tries, { boost = false, steer = false, jump = false, hearts = 0 } = {}) {
  const G = GAMES.find(g => g.id === gameId);
  const inp = { boost: false, left: false, right: false, jump: false };
  const ui = document.getElementById('ui');
  const hud = h('div', { class: 'hud' });
  setPilot(state.build.pilot);

  let homeArmed = 0;
  const homeB = btn('dark homeb', 'home', null, () => {
    if (performance.now() - homeArmed < 2500) { app.go('arcade'); return; }
    homeArmed = performance.now(); homeB.classList.add('pulse'); say('Tap again to go back to the games.');
    setTimeout(() => homeB.classList.remove('pulse'), 2500);
  });
  const hintEl = h('div', { class: 'hint' });
  const chip = h('div', { class: 'lvlchip' }, h('i', { html: ICON[G.icon] }), String(lvl + 1));
  const heartsEl = h('div', { class: 'hearts' });
  const prog = h('div', { class: 'progress' }, h('b'));
  hud.append(hintEl, chip, heartsEl, homeB);
  const held = [];
  if (boost) {
    const b = h('button', { class: 'btn red boost', 'aria-label': 'Boost' }, icon('boost'));
    onHold(b, () => { inp.boost = true; }, () => { inp.boost = false; }); hud.append(b); held.push(b);
  }
  if (steer) {
    const l = h('button', { class: 'btn blue lft', 'aria-label': 'Left' }, icon('left'));
    const r = h('button', { class: 'btn blue rgt', 'aria-label': 'Right' }, icon('right'));
    onHold(l, () => { inp.left = true; }, () => { inp.left = false; });
    onHold(r, () => { inp.right = true; }, () => { inp.right = false; });
    hud.append(l, r); held.push(l, r);
  }
  if (jump) {
    const j = h('button', { class: 'btn green jumpb', 'aria-label': 'Jump' }, icon('jump'));
    j.addEventListener('pointerdown', e => { e.preventDefault(); inp.jump = true; j.classList.add('down'); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => j.addEventListener(ev, () => j.classList.remove('down')));
    hud.append(j);
  }
  ui.append(hud);

  const S = {
    G, inp, over: false, hearts, maxHearts: hearts, lost: 0, ease: Math.min(3, tries || 0),
    steer: () => (inp.right ? 1 : 0) - (inp.left ? 1 : 0),
    hint(ic, text, speak = true) {
      if (text === S._hint) return;
      S._hint = text; hintEl.innerHTML = '';
      if (text) { if (ic) hintEl.append(icon(ic)); hintEl.append(h('span', {}, text)); }
      if (speak && text) say(text);
    },
    showHearts() {
      heartsEl.innerHTML = '';
      for (let i = 0; i < S.maxHearts; i++) heartsEl.append(h('i', { html: i < S.hearts ? ICON.heart : ICON.heartEmpty }));
    },
    // Lose a heart. Returns true if that was the last one.
    hurt() { S.hearts--; S.lost++; S.showHearts(); heartsEl.classList.remove('wiggle'); void heartsEl.offsetWidth; heartsEl.classList.add('wiggle'); return S.hearts <= 0; },
    heal() { if (S.hearts < S.maxHearts) { S.hearts++; S.showHearts(); } },
    progress(f) { if (!prog.parentNode) hud.append(prog); prog.firstChild.style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + '%'; },
    release() { inp.boost = inp.left = inp.right = false; held.forEach(b => b.release && b.release()); },
    hideControls() { S.release(); hud.querySelectorAll('.boost,.lft,.rgt,.jumpb').forEach(e => e.classList.add('hidden')); },
    // got/total = collectibles. Stars: finish, most collectibles, no hearts lost.
    win(got, total, line) {
      if (S.over) return; S.over = true; S.hideControls(); setEngine(0); S.hint(null, '', false);
      const stars = 1 + (total === 0 || got >= Math.ceil(total * 2 / 3) ? 1 : 0) + (S.lost === 0 ? 1 : 0);
      const friends = setGameStars(gameId, lvl, stars);
      sfx.fanfare();
      say([line, stars === 3 ? 'Three stars!' : null]);
      const hasNext = lvl + 1 < G.levels;
      const after = () => hasNext ? app.go('game', { game: gameId, level: lvl + 1 }) : app.go('arcade');
      setTimeout(() => card({
        title: hasNext ? 'Level complete!' : 'You beat them all!', stars,
        buttons: [
          ['green pulse', 'next', hasNext ? 'Next' : 'Games', () => friends.length ? newFriends(friends, after) : after()],
          ['red', 'retry', 'Again', () => app.go('game', { game: gameId, level: lvl })],
          ['white', 'games', 'Games', () => friends.length ? newFriends(friends, () => app.go('arcade')) : app.go('arcade')],
        ],
      }), 1400);
    },
    lose(line) {
      if (S.over) return; S.over = true; S.hideControls(); setEngine(0); S.hint(null, '', false);
      sfx.oops();
      setTimeout(() => say(line), 300);
      setTimeout(() => card({
        title: 'Oops!', text: 'Everyone is okay! Try again?',
        buttons: [
          ['green pulse', 'retry', 'Try again', () => app.go('game', { game: gameId, level: lvl, tries: (tries || 0) + 1 })],
          ['white', 'games', 'Games', () => app.go('arcade')],
        ],
      }), 1800);
    },
    exit() { setEngine(0); if (S._card) S._card.close(); },
  };
  function card({ title, text, stars = null, buttons, extra }) {
    if (S._card) S._card.close();
    const row = h('div', { class: 'row' });
    for (const [cls, ic, label, fn] of buttons) row.append(btn(cls, ic, label, fn));
    const st = stars != null ? h('div', { class: 'big-stars' }, ...[0, 1, 2].map(i => h('i', { html: i < stars ? ICON.star : ICON.starEmpty }))) : null;
    S._card = modal(h('div', { class: 'card' }, h('h1', {}, title), st, text ? h('p', {}, text) : null, extra || null, row));
  }
  function newFriends(list, then) {
    const grid = h('div', { class: 'unlock-grid' });
    for (const p of list) {
      const t = h('div', { class: 'tile' });
      const cv = document.createElement('canvas'); cv.width = 104 * app.dpr; cv.height = 104 * app.dpr;
      const c = cv.getContext('2d'); c.scale(app.dpr, app.dpr); drawThumb(c, 'pilot', p, state.build, 104, 0.2); t.append(cv);
      grid.append(t);
    }
    sfx.chime();
    say(['A new pilot friend!', ...list.map(p => p.name + '!'), 'Find them in the rocket hangar.']);
    card({ title: 'New friend!', extra: grid, buttons: [['green pulse', 'next', 'OK', then]] });
  }
  S.showHearts();
  return S;
}
