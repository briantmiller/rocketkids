// Saved progress (kept on the iPad in localStorage).
import { DEFAULT_BUILD, CATALOG, COLORS, MISSIONS, GAMES, maxStages } from './data.js';

const KEY = 'rocketkids-save-v1';

export const state = {
  done: 0,            // missions finished in order
  stars: {},          // missionId -> best stars (1..3)
  build: { ...DEFAULT_BUILD, stages: [...DEFAULT_BUILD.stages] },
  seen: {},           // unlock ids already celebrated
  settings: { voice: true, sound: true, music: true, boomCrash: false },
  unlockAll: false,
  mg: {},             // mini-game stars: gameId -> [stars per level]
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    Object.assign(state, d);
    state.build = { ...DEFAULT_BUILD, ...d.build };
    state.settings = { ...{ voice: true, sound: true, music: true, boomCrash: false }, ...d.settings };
    state.mg = d.mg || {};
  } catch (e) { /* fresh start */ }
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}
export function reset() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  location.reload();
}

export function level() { return state.unlockAll ? MISSIONS.length : state.done; }

export function mgStars() {
  let n = 0;
  for (const g of GAMES) for (const v of (state.mg[g.id] || [])) n += v || 0;
  return n;
}
export function isUnlocked(cat, item) {
  if (item.mg != null) return state.unlockAll || mgStars() >= item.mg;
  return item.unlock <= level();
}
// Mini-game levels: level n opens when level n-1 has at least one star.
export function gameLevelOpen(id, n) { return state.unlockAll || n === 0 || ((state.mg[id] || [])[n - 1] || 0) > 0; }
export function setGameStars(id, n, stars) {
  const before = mgStars();
  const a = state.mg[id] = state.mg[id] || [];
  a[n] = Math.max(a[n] || 0, stars);
  save();
  const after = mgStars();
  return CATALOG.pilot.filter(p => p.mg != null && p.mg > before && p.mg <= after);
}
export function stageLimit() { return maxStages(level()); }

// Items that become available when `done` goes from a to b.
export function newUnlocks(a, b) {
  const out = [];
  for (const cat of Object.keys(CATALOG)) {
    for (const it of CATALOG[cat]) if (it.unlock > a && it.unlock <= b && it.id !== 'none') out.push({ cat, item: it });
  }
  for (const c of COLORS) if (c.unlock > a && c.unlock <= b) out.push({ cat: 'color', item: c });
  if (maxStages(b) > maxStages(a)) out.push({ cat: 'slots', item: { id: 'slots' + maxStages(b), name: 'Room for ' + maxStages(b) + ' stages', n: maxStages(b) } });
  return out;
}

export function missionUnlocked(i) { return state.unlockAll || i <= state.done; }
