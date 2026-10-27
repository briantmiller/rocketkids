# RocketKids

A rocket-building space game for young astronauts (about age 5), built as a Progressive Web App for iPad. Everything is drawn in code and the sounds are synthesized, so there are no downloads after the first visit and it plays fully offline.

## Put it on the iPad

A PWA has to be served over **HTTPS** to install. Any static host works. Two easy options:

**Netlify Drop (no account setup, about 1 minute)**
1. Go to https://app.netlify.com/drop on a computer.
2. Drag the whole `rocketkids` folder onto the page.
3. Open the link it gives you on the iPad in **Safari**.

**GitHub Pages**
1. Create a repository and upload the contents of this folder (so `index.html` is at the top level).
2. Settings → Pages → deploy from the `main` branch, root folder.
3. Open `https://<you>.github.io/<repo>/` on the iPad in **Safari**.

Then, on the iPad in Safari: tap **Share** → **Add to Home Screen** → **Add**. Launch RocketKids from the home-screen icon: it opens full screen with no browser bars, and works without Wi-Fi after the first launch.

Tip: turn on **Guided Access** (Settings → Accessibility → Guided Access) to keep a little one inside the game.

## How to play

- **Map**: pick a mission. Locked missions open one at a time. **Rocket Park** (bottom right) is free play with any rocket.
- **Hangar**: tap the picture tabs to pick capsules, stages, boosters, fins, parachutes, cargo, colors, patterns, styles and flame colors. Tap a stage to add it, tap a stage in "Your stages" to remove it (stages sort themselves, biggest at the bottom). The **power meter** on the left fills up as the rocket gets stronger; the yellow mark is the mission goal. Every tap is spoken out loud.
- **Flying**: hold the big **fire** button to boost, use the **arrows** to steer toward stars, and tap the big **green button** when it pops up (drop a stage, tip over, parachute, release the satellite, take a picture, plant the flag, fly home). If the child doesn't tap in time, the game slows down and helps.
- **BOOM**: the red starburst button makes a silly cartoon explosion on purpose. The astronaut always floats home safely.

## Missions

1. Up to the Clouds: first flight, parachute landing
2. Higher than Planes: bigger stage
3. Hello, Space!: stack two stages
4. Around the World: tip over and reach orbit, heat shield, splashdown
5. Satellite Helper: carry and release a satellite
6. Space Station Visit: dock gently
7. Loop the Moon: fly around the Moon and take a picture of Earth
8. Moon Landing: land the lander, plant a flag, fly home
9. Rover to Mars: parachute plus rocket landing, then drive the rover to find shiny rocks

Each mission unlocks new parts (more stages, boosters, capsules, cargo, colors, patterns, styles, flames). Stars: 1 for finishing, +1 for collecting 3 or more stars, +1 for no oopsies.

## Grown-ups menu

**Press and hold the gear** (top right of the title or map) for about a second:
- Talking voice on/off, sounds on/off
- **Crashes go BOOM**: off = gentle bump and retry; on = silly explosion and retry
- Unlock everything / back to normal progress
- Reset progress

Progress is saved on the iPad (Safari storage for this site).

## Updating

After changing any file, bump `VERSION` in `sw.js` (e.g. `rocketkids-v2`) so installed copies pick up the new version on next launch.

## Files

- `index.html`, `manifest.webmanifest`, `sw.js`: PWA shell
- `css/style.css`: layout and chunky buttons
- `js/data.js`: parts, missions, unlock levels (tweak here)
- `js/sim.js`: flight physics and the power meter
- `js/draw.js`, `js/bg.js`, `js/icons.js`: all the artwork
- `js/screens/*.js`: title, map, hangar, flight
- `js/audio.js`, `js/voice.js`: sound effects and the spoken voice

Developer tip: add `?speed=3` to the URL to run the game three times faster for testing.
