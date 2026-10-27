// Flight physics shared by the hangar power meter and the real flight.
import { CATALOG, G_EARTH, H, VORB, DV, findPart } from './data.js';

export class Craft {
  constructor(build) {
    this.build = build;
    const cap = findPart('capsule', build.capsule);
    const cargo = findPart('cargo', build.cargo);
    const fins = findPart('fins', build.fins);
    this.topMass = cap.m + cargo.m + 0.15; // + parachutes
    this.stages = build.stages.map((id, i) => {
      const s = findPart('stage', id);
      return { id, dry: s.dry + (i === 0 ? fins.m : 0), fuel: s.fuel, fuel0: s.fuel, F: s.F, ve: s.ve };
    });
    const b = findPart('booster', build.booster);
    this.boosters = b.id === 'none' ? null : { dry: b.dry, fuel: b.fuel, fuel0: b.fuel, F: b.F, ve: b.ve };
    this.cur = 0; // index of active stage
  }
  get stage() { return this.stages[this.cur]; }
  mass() {
    let m = this.topMass;
    for (let i = this.cur; i < this.stages.length; i++) m += this.stages[i].dry + this.stages[i].fuel;
    if (this.boosters) m += this.boosters.dry + this.boosters.fuel;
    return m;
  }
  stageEmpty() { return !this.stage || this.stage.fuel <= 1e-6; }
  hasNextStage() { return this.cur < this.stages.length - 1; }
  outOfFuel() { return this.stageEmpty() && !this.hasNextStage(); }
  boostersEmpty() { return this.boosters && this.boosters.fuel <= 1e-6; }
  dropBoosters() { this.boosters = null; }
  nextStage() { if (this.hasNextStage()) { this.cur++; return true; } return false; }
  // Burn for dt seconds; returns acceleration (units/s^2).
  burn(dt) {
    let F = 0;
    const m = this.mass();
    const s = this.stage;
    if (s && s.fuel > 0) {
      const used = Math.min(s.fuel, (s.F / s.ve) * dt);
      F += s.F * (used / ((s.F / s.ve) * dt));
      s.fuel -= used;
      if (this.boosters && this.boosters.fuel > 0) {
        const b = this.boosters;
        const ub = Math.min(b.fuel, (b.F / b.ve) * dt);
        F += b.F * (ub / ((b.F / b.ve) * dt));
        b.fuel -= ub;
      }
    }
    return F / m;
  }
  // Ideal remaining speed change (rocket equation), boosters ignored.
  remainingDv() {
    let dv = 0;
    for (let i = this.cur; i < this.stages.length; i++) {
      let above = this.topMass;
      for (let j = i + 1; j < this.stages.length; j++) above += this.stages[j].dry + this.stages[j].fuel;
      const s = this.stages[i];
      const m0 = above + s.dry + s.fuel, m1 = above + s.dry;
      dv += s.ve * Math.log(m0 / m1);
    }
    return dv;
  }
  fuelFraction() { const s = this.stage; return s ? s.fuel / s.fuel0 : 0; }
}

// Vertical physics step. mode 'up' or 'tipped'. Returns nothing; mutates st.
export function stepPhysics(st, craft, boosting, dt) {
  let a = 0;
  if (boosting && !craft.stageEmpty()) a = craft.burn(dt);
  if (st.mode === 'up') {
    st.vy += (a - G_EARTH) * dt;
    if (st.h <= 0 && st.vy < 0) { st.vy = 0; st.h = 0; }
  } else {
    st.vx += a * dt;
    const k = Math.min(1, (st.vx / VORB) ** 2);
    st.vy += -G_EARTH * (1 - k) * dt;
  }
  st.h += st.vy * dt;
  st.t += dt;
  return a;
}

export const TIP_HEIGHT = H.space;
export const TIP_FAIL = H.space * 0.6;
// Time to tip over: the rocket will coast up into space on its own.
export function readyToTip(st) {
  return st.h > H.cloud && st.h + Math.max(0, st.vy) ** 2 / (2 * G_EARTH) >= H.space * 1.05;
}

// "Perfect pilot" run used for the hangar power meter.
export function evaluate(build) {
  const c = new Craft(build);
  const st = { h: 0, vy: 0, vx: 0, t: 0, mode: 'up' };
  let apex = 0, orbit = false, vxMax = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 400; i++) {
    if (c.boosters && c.boostersEmpty()) c.dropBoosters();
    if (c.stageEmpty() && c.hasNextStage()) c.nextStage();
    stepPhysics(st, c, true, dt);
    apex = Math.max(apex, st.h);
    if (st.mode === 'up' && readyToTip(st)) st.mode = 'tipped';
    if (st.mode === 'tipped') {
      vxMax = Math.max(vxMax, st.vx);
      if (st.vx >= VORB) { orbit = true; break; }
      if (st.vy < 0 && st.h < TIP_FAIL) break;
      if (c.outOfFuel()) break;
    } else if (c.outOfFuel() && st.vy < 0) break;
    if (st.h < 0) break;
  }
  const rem = orbit ? c.remainingDv() : 0;
  let score;
  if (orbit) {
    score = rem < DV.moon ? 4 + rem / DV.moon : 5 + Math.min(1.5, (rem - DV.moon) / (DV.mars - DV.moon));
  } else if (apex >= TIP_HEIGHT || vxMax > 0) {
    score = 3 + 0.99 * vxMax / VORB;
  } else {
    const pts = [0, H.cloud, H.sky, H.space];
    score = 0;
    for (let i = 0; i < 3; i++) if (apex >= pts[i]) score = i + Math.min(1, (apex - pts[i]) / (pts[i + 1] - pts[i]));
  }
  return { score, apex, orbit, rem, vxMax, liftoff: c.stages.length > 0 && apexOk(apex) };
}
function apexOk(a) { return a > 5; }
