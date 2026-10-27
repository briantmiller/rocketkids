// RocketKids — parts, missions and world constants.
// "unlock" = how many missions must be finished before the item is available.

export const G_EARTH = 20;            // gravity (game units)
export const H = { cloud: 450, sky: 1600, space: 4000 }; // altitudes
export const VORB = 210;              // sideways speed needed for orbit
export const DV = { moon: 150, mars: 210 }; // extra push needed after orbit
export const LEVEL_NAMES = ['Ground', 'Clouds', 'Sky', 'Space', 'Orbit', 'Moon', 'Mars'];

export const COLORS = [
  { id: 'red', hex: '#F94144', name: 'Red', unlock: 0 },
  { id: 'blue', hex: '#3A86FF', name: 'Blue', unlock: 0 },
  { id: 'white', hex: '#F4F6FA', name: 'White', unlock: 0 },
  { id: 'yellow', hex: '#FFD60A', name: 'Yellow', unlock: 0 },
  { id: 'green', hex: '#38B000', name: 'Green', unlock: 1 },
  { id: 'orange', hex: '#FF8500', name: 'Orange', unlock: 1 },
  { id: 'purple', hex: '#8338EC', name: 'Purple', unlock: 1 },
  { id: 'pink', hex: '#FF66C4', name: 'Pink', unlock: 2 },
  { id: 'teal', hex: '#00BBF9', name: 'Sky blue', unlock: 2 },
  { id: 'black', hex: '#2B2D42', name: 'Black', unlock: 2 },
  { id: 'gold', hex: '#E9B949', name: 'Gold', unlock: 5 },
  { id: 'silver', hex: '#B8C0CC', name: 'Silver', unlock: 5 },
];

export const CATALOG = {
  capsule: [
    { id: 'pod', name: 'Little Pod', unlock: 0, m: 1.0 },
    { id: 'bubble', name: 'Bubble Pod', unlock: 1, m: 1.0 },
    { id: 'explorer', name: 'Explorer Capsule with a heat shield', unlock: 3, m: 1.5, shield: true },
    { id: 'moonship', name: 'Moon Ship with a lander', unlock: 6, m: 2.4, shield: true, lander: true },
    { id: 'marsship', name: 'Mars Ship', unlock: 8, m: 2.0, shield: true, mars: true },
  ],
  stage: [
    { id: 'small', name: 'Small stage', unlock: 0, dry: 0.4, fuel: 1.6, F: 125, ve: 420, w: 40, h: 64 },
    { id: 'medium', name: 'Medium stage', unlock: 1, dry: 0.6, fuel: 3.2, F: 240, ve: 450, w: 48, h: 92 },
    { id: 'big', name: 'Big stage', unlock: 3, dry: 1.0, fuel: 6.0, F: 480, ve: 460, w: 56, h: 120 },
    { id: 'super', name: 'Super stage', unlock: 6, dry: 1.6, fuel: 11, F: 950, ve: 480, w: 66, h: 150 },
  ],
  booster: [
    { id: 'none', name: 'No boosters', unlock: 0 },
    { id: 'pair', name: 'Two side boosters', unlock: 4, dry: 0.4, fuel: 1.8, F: 260, ve: 380, count: 2, size: 0.8 },
    { id: 'quad', name: 'Four side boosters', unlock: 5, dry: 0.8, fuel: 3.6, F: 520, ve: 380, count: 4, size: 0.8 },
    { id: 'mega', name: 'Mega boosters', unlock: 6, dry: 1.2, fuel: 6.0, F: 800, ve: 400, count: 2, size: 1.15 },
  ],
  fins: [
    { id: 'none', name: 'No fins', unlock: 0, m: 0 },
    { id: 'small', name: 'Little fins', unlock: 0, m: 0.1 },
    { id: 'swept', name: 'Zoom fins', unlock: 1, m: 0.1 },
    { id: 'round', name: 'Round fins', unlock: 3, m: 0.1 },
    { id: 'star', name: 'Star fins', unlock: 7, m: 0.1 },
  ],
  chute: [
    { id: 'one', name: 'One parachute', unlock: 0, n: 1, look: 'stripe' },
    { id: 'three', name: 'Three parachutes', unlock: 3, n: 3, look: 'stripe' },
    { id: 'rainbow', name: 'Rainbow parachutes', unlock: 5, n: 3, look: 'rainbow' },
    { id: 'dots', name: 'Polka dot parachute', unlock: 2, n: 1, look: 'dots' },
  ],
  cargo: [
    { id: 'none', name: 'No cargo', unlock: 0, m: 0 },
    { id: 'satellite', name: 'Satellite', unlock: 4, m: 0.5 },
    { id: 'telescope', name: 'Space telescope', unlock: 5, m: 0.6 },
    { id: 'rover', name: 'Mars rover', unlock: 8, m: 0.5 },
  ],
  pattern: [
    { id: 'plain', name: 'Plain', unlock: 0 },
    { id: 'stripes', name: 'Stripes', unlock: 0 },
    { id: 'dots', name: 'Dots', unlock: 1 },
    { id: 'stars', name: 'Stars', unlock: 2 },
    { id: 'checker', name: 'Checkers', unlock: 3 },
    { id: 'zigzag', name: 'Zig zag', unlock: 4 },
    { id: 'hearts', name: 'Hearts', unlock: 5 },
    { id: 'flames', name: 'Flames', unlock: 6 },
    { id: 'rainbow', name: 'Rainbow', unlock: 7 },
  ],
  style: [
    { id: 'classic', name: 'Classic rocket', unlock: 0 },
    { id: 'silly', name: 'Silly face rocket', unlock: 0 },
    { id: 'retro', name: 'Old timey rocket', unlock: 3 },
    { id: 'shiny', name: 'Shiny rocket', unlock: 4 },
    { id: 'robot', name: 'Robot rocket', unlock: 6 },
  ],
  flame: [
    { id: 'orange', name: 'Fire flame', unlock: 0, c: ['#FFF3B0', '#FFB703', '#FB5607'] },
    { id: 'blue', name: 'Blue flame', unlock: 2, c: ['#E0FBFF', '#4CC9F0', '#3A0CA3'] },
    { id: 'green', name: 'Green flame', unlock: 4, c: ['#F1FFE0', '#80ED99', '#2D6A4F'] },
    { id: 'pink', name: 'Pink flame', unlock: 5, c: ['#FFE5F4', '#FF66C4', '#7209B7'] },
    { id: 'rainbow', name: 'Rainbow flame', unlock: 7, c: ['#FFFFFF', '#FFD60A', '#F94144'], rainbow: true },
  ],
};

export const TABS = [
  { id: 'capsule', name: 'Capsules' },
  { id: 'stage', name: 'Rocket stages' },
  { id: 'booster', name: 'Boosters' },
  { id: 'fins', name: 'Fins' },
  { id: 'chute', name: 'Parachutes' },
  { id: 'cargo', name: 'Cargo' },
  { id: 'color', name: 'Colors' },
  { id: 'pattern', name: 'Patterns' },
  { id: 'style', name: 'Styles' },
  { id: 'flame', name: 'Flames' },
];

export function maxStages(done) {
  return done >= 6 ? 4 : done >= 3 ? 3 : done >= 2 ? 2 : 1;
}

export const DEFAULT_BUILD = {
  capsule: 'pod', stages: ['small'], booster: 'none', fins: 'small', chute: 'one',
  cargo: 'none', color: 'red', color2: 'white', pattern: 'stripes', style: 'classic', flame: 'orange',
};

// target = power level needed (index into LEVEL_NAMES)
export const MISSIONS = [
  {
    id: 'clouds', name: 'Up to the Clouds', icon: 'cloud', target: 1, landing: 'land',
    intro: 'Mission one! Build a rocket and fly up to the clouds. Then tap the parachute to land softly.',
    win: 'You flew to the clouds and landed softly. Great job, astronaut!',
  },
  {
    id: 'sky', name: 'Higher than Planes', icon: 'plane', target: 2, landing: 'land',
    intro: 'Mission two! Fly higher than the airplanes. You will need a bigger rocket stage.',
    win: 'Wow! You zoomed past the airplanes!',
  },
  {
    id: 'space', name: 'Hello, Space!', icon: 'stars', target: 3, landing: 'land',
    intro: 'Mission three! Fly all the way to space, where the sky turns black and the stars come out. Stack two stages to go higher!',
    win: 'You made it to space! Hello, stars!',
  },
  {
    id: 'orbit', name: 'Around the World', icon: 'earth', target: 4, landing: 'sea', needs: { shield: true },
    intro: 'Mission four! Fly so fast that you go all the way around the Earth. That is called orbit! Use the Explorer capsule. Its heat shield keeps you safe coming home.',
    win: 'You went around the whole world! Splash down!',
  },
  {
    id: 'satellite', name: 'Satellite Helper', icon: 'satellite', target: 4, landing: 'sea', needs: { shield: true, cargo: 'satellite' },
    intro: 'Mission five! Take a satellite into orbit and let it go. Add the satellite in the cargo box.',
    win: 'Your satellite is beeping happily in space!',
  },
  {
    id: 'station', name: 'Space Station Visit', icon: 'station', target: 4, landing: 'sea', needs: { shield: true },
    intro: 'Mission six! Fly to the space station and dock gently with your friends.',
    win: 'You docked with the space station! High five!',
  },
  {
    id: 'moonloop', name: 'Loop the Moon', icon: 'moonloop', target: 5, landing: 'sea', needs: { shield: true },
    intro: 'Mission seven! Fly all the way around the Moon and take a picture of the Earth. You will need lots of rocket power!',
    win: 'You looped around the Moon! What a picture!',
  },
  {
    id: 'moonland', name: 'Moon Landing', icon: 'moonflag', target: 5, landing: 'sea', needs: { shield: true, lander: true },
    intro: 'Mission eight! Land on the Moon, plant a flag, and come home. Use the Moon Ship. It has a lander!',
    win: 'You landed on the Moon and came home. You are a real moonwalker!',
  },
  {
    id: 'mars', name: 'Rover to Mars', icon: 'mars', target: 6, landing: 'mars', needs: { mars: true, cargo: 'rover' },
    intro: 'The biggest mission! Fly to Mars and drive the rover to find shiny rocks. Use the Mars Ship and the rover cargo. Build the biggest rocket you can!',
    win: 'Your rover found treasure on Mars! You are a super space explorer!',
  },
];

export function findPart(cat, id) {
  if (cat === 'color') return COLORS.find(c => c.id === id) || COLORS[0];
  return CATALOG[cat].find(p => p.id === id) || CATALOG[cat][0];
}
