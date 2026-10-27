import { h, btn, icon, onTap } from '../ui.js';
import { say } from '../voice.js';
import { sfx } from '../audio.js';
import { state, save, isUnlocked, stageLimit, level } from '../state.js';
import { CATALOG, COLORS, TABS, MISSIONS, DEFAULT_BUILD, findPart, LEVEL_NAMES } from '../data.js';
import { MISSION_ICON, ICON } from '../icons.js';
import { drawThumb, drawRocket, rocketLayout, INK, rr } from '../draw.js';
import { evaluate } from '../sim.js';

const LEVEL_ICON = [null, 'cloud', 'plane', 'stars', 'earth', 'moonloop', 'mars'];
const STAGE_ORDER = ['super', 'big', 'medium', 'small'];

// Keep the saved build valid for the current progress.
export function sanitizeBuild(b) {
  for (const cat of ['capsule', 'booster', 'fins', 'chute', 'cargo', 'pattern', 'style', 'flame']) {
    const it = CATALOG[cat].find(p => p.id === b[cat]);
    if (!it || !isUnlocked(cat, it)) b[cat] = DEFAULT_BUILD[cat];
  }
  for (const k of ['color', 'color2']) { const c = COLORS.find(c => c.id === b[k]); if (!c || !isUnlocked('color', c)) b[k] = DEFAULT_BUILD[k]; }
  b.stages = (b.stages || []).filter(id => { const s = CATALOG.stage.find(p => p.id === id); return s && isUnlocked('stage', s); });
  b.stages = b.stages.slice(0, stageLimit());
  if (!b.stages.length) b.stages = ['small'];
  sortStages(b);
  return b;
}
function sortStages(b) { b.stages.sort((a, c) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(c)); }

export function missingNeeds(b, m) {
  const out = [];
  if (!m || !m.needs) return out;
  const cap = findPart('capsule', b.capsule);
  if (m.needs.mars && !cap.mars) out.push({ tab: 'capsule', item: 'marsship', say: 'You need the Mars Ship for this trip. Tap the capsules!' });
  else if (m.needs.lander && !cap.lander) out.push({ tab: 'capsule', item: 'moonship', say: 'You need the Moon Ship with the lander. Tap the capsules!' });
  else if (m.needs.shield && !cap.shield) out.push({ tab: 'capsule', item: 'explorer', say: 'You need a capsule with a heat shield to come home from space. Tap the capsules!' });
  if (m.needs.cargo && b.cargo !== m.needs.cargo) out.push({ tab: 'cargo', item: m.needs.cargo, say: `Don't forget the ${findPart('cargo', m.needs.cargo).name}! Tap the cargo box.` });
  return out;
}

export function hangarScreen(app, params) {
  const mi = params.mission ?? 0;
  const M = MISSIONS[mi] || null;
  const b = sanitizeBuild(state.build);
  save();
  let tab = params.tab || 'stage';
  let bounce = 0, lastScore = null;
  const dpr = () => app.dpr;

  const ui = document.getElementById('ui');
  const root = h('div', { class: 'hangar' });

  // ----- top bar -----
  const back = btn('dark back', 'home', null, () => app.go('map'));
  const sayBtn = btn('blue say', 'speaker', null, () => say(M ? M.intro : 'Rocket Park! Build any rocket you like and fly for fun. Try the big red boom button!'));
  const chip = h('div', { class: 'mission-chip' },
    h('div', { class: 'mi', html: M ? MISSION_ICON[M.icon] : ICON.park }),
    h('div', { class: 'mt' }, M ? `${mi + 1}. ${M.name}` : 'Rocket Park'),
    sayBtn);
  const needsEl = h('div', { class: 'needs' });
  root.append(h('div', { class: 'h-top' }, back, chip, needsEl));

  // ----- preview + meter -----
  const preview = h('div', { class: 'h-preview' });
  const meter = h('div', { class: 'meter' }, h('div', { class: 'track' }, h('div', { class: 'fill' })));
  const marks = [];
  for (let L = 1; L <= 6; L++) {
    const mk = h('div', { class: 'mark' + (M && M.target === L ? ' goal' : '') }, h('i', { html: MISSION_ICON[LEVEL_ICON[L]] }));
    onTap(mk, () => say(`This rocket line shows ${['', 'the clouds', 'the airplanes', 'space', 'orbit around the Earth', 'the Moon', 'Mars'][L]}.`));
    marks.push(mk); meter.append(mk);
  }
  preview.append(meter);
  onTap(preview, e => {
    if (e.target.closest('.meter')) return;
    bounce = 1; sfx.boing();
    say(['Hi there!', 'Ready to fly!', 'Let\'s go to space!', 'Hee hee, that tickles!'][Math.floor(Math.random() * 4)]);
  });

  // ----- parts panel -----
  const tabsEl = h('div', { class: 'tabs' });
  const tiles = h('div', { class: 'tiles' });
  const panel = h('div', { class: 'h-panel' }, tabsEl, tiles);
  root.append(preview, panel);

  const launch = btn('red launch', 'liftoff', 'LAUNCH', doLaunch);
  root.append(launch);
  ui.append(root);

  function thumbCanvas(cat, item, cls = '') {
    const cv = h('canvas', { class: cls });
    const size = 104;
    cv.width = size * dpr(); cv.height = size * dpr();
    const c = cv.getContext('2d'); c.scale(dpr(), dpr());
    drawThumb(c, cat, item, b, size, 0.3);
    return cv;
  }

  function currentItem(cat) {
    if (cat === 'color') return COLORS.find(c => c.id === b.color);
    if (cat === 'stage') return findPart('stage', b.stages[b.stages.length - 1]);
    const it = findPart(cat, b[cat]);
    if (it.id === 'none') return CATALOG[cat][1];
    return it;
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    const miss = missingNeeds(b, M).map(n => n.tab);
    for (const T of TABS) {
      const tb = h('button', { class: 'tab' + (tab === T.id ? ' on' : ''), 'aria-label': T.name }, thumbCanvas(T.id, currentItem(T.id)));
      if (miss.includes(T.id)) tb.append(h('span', { class: 'dot' }));
      if (hasNew(T.id)) tb.append(h('span', { class: 'new' }, 'NEW'));
      onTap(tb, () => { tab = T.id; sfx.tap(); say(T.name, { interrupt: true }); markSeen(T.id); renderAll(); });
      tabsEl.append(tb);
    }
  }
  function items(cat) { return cat === 'color' ? COLORS : CATALOG[cat]; }
  function hasNew(cat) { return items(cat).some(it => it.unlock > 0 && isUnlocked(cat, it) && !state.seen[cat + ':' + it.id]); }
  function markSeen(cat) { items(cat).forEach(it => { if (isUnlocked(cat, it)) state.seen[cat + ':' + it.id] = 1; }); save(); }

  function tile(cat, item, on, onPick, extra) {
    const open = isUnlocked(cat, item);
    const t = h('button', { class: 'tile' + (on ? ' on' : '') + (open ? '' : ' locked'), 'aria-label': item.name }, thumbCanvas(cat, item));
    if (!open) t.append(h('span', { class: 'lk', html: ICON.lock }));
    if (extra) t.append(extra);
    onTap(t, () => {
      if (!open) { sfx.locked(); say('That one is locked. Fly more missions to unlock it!'); return; }
      onPick();
    });
    return t;
  }

  function renderTiles() {
    tiles.innerHTML = '';
    if (tab === 'stage') {
      const lim = stageLimit();
      const slots = h('span', { class: 'slots' });
      for (let i = 0; i < lim; i++) slots.append(h('b', { class: i < b.stages.length ? 'full' : '' }));
      tiles.append(h('div', { class: 'subhead' }, 'Your stages', slots));
      const stack = h('div', { class: 'stack' });
      b.stages.forEach((id, i) => {
        const ch = h('button', { class: 'chip', 'aria-label': 'Remove ' + id }, thumbCanvas('stage', findPart('stage', id)));
        if (b.stages.length > 1) ch.append(h('span', { class: 'x', html: ICON.close }));
        onTap(ch, () => {
          if (b.stages.length <= 1) { sfx.locked(); say('Your rocket needs at least one stage!'); return; }
          b.stages.splice(i, 1); sfx.remove(); say('Stage off!'); changed();
        });
        stack.append(ch);
      });
      tiles.append(stack);
      tiles.append(h('div', { class: 'subhead' }, 'Tap to add a stage'));
      for (const it of CATALOG.stage) {
        const n = b.stages.filter(s => s === it.id).length;
        tiles.append(tile('stage', it, false, () => {
          if (b.stages.length >= lim) { sfx.locked(); say(lim < 4 ? 'Your rocket is as tall as it can be for now! Fly more missions to stack more stages.' : 'Your rocket is as tall as it can be!'); return; }
          b.stages.push(it.id); sortStages(b); sfx.pop(); say(it.name + '!'); bounce = 1; changed();
        }, n ? h('span', { class: 'count' }, String(n)) : null));
      }
      return;
    }
    if (tab === 'color') {
      tiles.append(h('div', { class: 'subhead' }, 'Rocket color'));
      for (const c of COLORS) tiles.append(tile('color', c, b.color === c.id, () => { b.color = c.id; sfx.pick(); say(c.name + '!'); bounce = 1; changed(); }));
      tiles.append(h('div', { class: 'subhead' }, 'Pattern and fin color'));
      for (const c of COLORS) tiles.append(tile('color', c, b.color2 === c.id, () => { b.color2 = c.id; sfx.pick(); say(c.name + '!'); bounce = 1; changed(); }));
      return;
    }
    for (const it of CATALOG[tab]) {
      tiles.append(tile(tab, it, b[tab] === it.id, () => {
        b[tab] = it.id; sfx.pick(); say(it.name + '!'); bounce = 1; changed();
      }));
    }
  }

  function renderNeeds() {
    needsEl.innerHTML = '';
    if (!M) return;
    const mk = (cat, item, ok, onclick) => {
      const n = h('button', { class: 'need' + (ok ? '' : ' bad'), 'aria-label': item.name }, thumbCanvas(cat, item), h('span', { class: 'badge', html: ok ? ICON.check : ICON.close.replace('#fff', '#F94144') }));
      onTap(n, onclick);
      return n;
    };
    const miss = missingNeeds(b, M);
    if (M.needs && (M.needs.shield || M.needs.lander || M.needs.mars)) {
      const want = M.needs.mars ? 'marsship' : M.needs.lander ? 'moonship' : 'explorer';
      const ok = !miss.some(x => x.tab === 'capsule');
      needsEl.append(mk('capsule', findPart('capsule', want), ok, () => { tab = 'capsule'; renderAll(); say(ok ? 'You have the right capsule!' : miss.find(x => x.tab === 'capsule').say); }));
    }
    if (M.needs && M.needs.cargo) {
      const ok = b.cargo === M.needs.cargo;
      needsEl.append(mk('cargo', findPart('cargo', M.needs.cargo), ok, () => { tab = 'cargo'; renderAll(); say(ok ? 'Cargo is packed!' : miss.find(x => x.tab === 'cargo').say); }));
    }
  }

  function renderMeter() {
    const r = evaluate(b);
    const score = r.score;
    meter.querySelector('.fill').style.height = Math.min(100, score / 6.5 * 100) + '%';
    marks.forEach((mk, i) => {
      mk.style.bottom = ((i + 1) / 6.5 * 100) + '%';
      mk.classList.toggle('reached', score >= i + 1);
    });
    if (M && lastScore != null) {
      if (lastScore < M.target && score >= M.target) setTimeout(() => { sfx.chime(); say('Yes! Your rocket has enough power for this mission!', { interrupt: false }); }, 450);
    }
    lastScore = score;
    return score;
  }

  function renderAll() { renderTabs(); renderTiles(); renderNeeds(); renderMeter(); }
  function changed() { save(); renderAll(); }

  function doLaunch() {
    const miss = missingNeeds(b, M);
    if (miss.length) {
      sfx.locked(); say(miss[0].say); tab = miss[0].tab; renderAll();
      const tb = tabsEl.children[TABS.findIndex(T => T.id === tab)];
      if (tb) { tb.classList.add('wiggle'); tb.scrollIntoView({ inline: 'center', behavior: 'smooth' }); }
      return;
    }
    const score = evaluate(b).score;
    const weak = M && score < M.target;
    save();
    app.go('flight', { mission: mi, weak });
  }

  markSeen(tab);
  renderAll();
  setTimeout(() => say(M ? M.intro : 'Rocket Park! Build any rocket you like and fly for fun. Try the big red boom button!'), 250);

  return {
    resize() { renderAll(); },
    update(dt) { bounce = Math.max(0, bounce - dt * 2.2); },
    draw(c, W, H, t) {
      // garage background
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2B3A7A'); g.addColorStop(1, '#14204A');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 2;
      for (let x = 0; x < W; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      const r = preview.getBoundingClientRect();
      if (r.width < 10) return;
      // preview window: sky
      c.save(); rr(c, r.left + 4, r.top + 4, r.width - 8, r.height - 8, 22); c.clip();
      const sg = c.createLinearGradient(0, r.top, 0, r.bottom);
      sg.addColorStop(0, '#5BC0EB'); sg.addColorStop(1, '#BDE8FF');
      c.fillStyle = sg; c.fillRect(r.left, r.top, r.width, r.height);
      // floor
      const fy = r.bottom - 34;
      c.fillStyle = '#8D99AE'; c.fillRect(r.left, fy, r.width, 40);
      c.fillStyle = '#FFD60A';
      for (let x = r.left; x < r.right; x += 40) { c.beginPath(); c.moveTo(x, fy); c.lineTo(x + 20, fy); c.lineTo(x + 10, fy + 34); c.lineTo(x - 10, fy + 34); c.closePath(); c.fill(); }
      c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(r.left, fy); c.lineTo(r.right, fy); c.stroke();
      const L = rocketLayout(b, {});
      const avail = r.height - 70;
      let s = Math.min(2.2, avail / (L.height + 40), (r.width - 140) / 170);
      const squash = 1 + Math.sin(bounce * Math.PI * 3) * 0.06 * bounce;
      const cx = r.left + 70 + (r.width - 70) / 2;
      c.save(); c.translate(cx, fy); c.scale(1 / squash, squash);
      drawRocket(c, b, { x: 0, y: 0, s, t, flame: 0, look: Math.sin(t * 0.8) * 0.8 });
      c.restore();
      c.restore();
    },
  };
}
