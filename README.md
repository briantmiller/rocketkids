# RocketKids

A rocket-building space game for young astronauts (about ages 5–6), built as a Progressive Web App for iPad. The artwork is drawn in code, the sound effects and music are synthesized, and the talking voice is a set of pre-recorded clips, so it plays fully offline after the first visit.

## Put it on the iPad

A PWA has to be served over **HTTPS** to install. Any static host works:

- **Netlify Drop:** go to https://app.netlify.com/drop on a computer and drag the whole `rocketkids` folder onto the page.
- **GitHub Pages:** upload the contents of this folder to a repository (so `index.html` is at the top level) and turn on Pages.

Then, on the iPad in **Safari**: open the link, tap **Share** → **Add to Home Screen** → **Add**. Launch from the home-screen icon: it opens full screen and works without Wi-Fi after the first launch (give it a minute online the first time so the voice clips can download).

**Updating an installed copy:** upload the new folder to the same place, then close and reopen RocketKids once or twice. Progress is kept.

Tip: turn on **Guided Access** (Settings → Accessibility → Guided Access) to keep a little one inside the game.

## What's in the game

**Missions (the map):** nine missions from "Up to the Clouds" through orbit, the space station, a Moon landing and a Mars rover. Each one unlocks new rocket parts. **Rocket Park** is free play with any rocket.

**Hangar:** tap the picture tabs to choose a pilot, capsule, stages, boosters, fins, parachutes, cargo, colors, patterns, styles and flame colors. Tap a stage to add it; when the rocket is full, tapping a stage swaps it in. The **dice button** gives the rocket a surprise new look. The power meter on the left shows whether the rocket is strong enough (the yellow mark is the goal).

**Flying:** hold the big **fire** button to boost, steer with the **arrows**, and tap the **green button** when it pops up. If the child doesn't tap in time the game slows down and helps. Tap **balloons** to pop them and **flying saucers** to say hello. The red **BOOM** button makes a silly explosion on purpose; the pilot always floats home safely.

**Space Games (green button on the map):** three mini-games with 8 levels each. Levels open one at a time and get a little harder each time.
- **Moon Lander:** hold fire to slow down and land on the yellow target. Later levels add rocks, a moving target, a mountain, floating space rocks and windy Mars.
- **Star Dash:** slide a finger (or use the arrows) to steer, catch stars and dodge space rocks on the way to each planet, from the Moon out to Pluto.
- **Rover Rally:** the rover drives itself; tap the jump button (or anywhere) to hop rocks and holes and grab gems. Level 4 adds a double jump.

Each game gives three hearts. Stars: 1 for finishing, +1 for most of the stars or gems, +1 for keeping every heart. After a level is lost, the retry is made a little easier. Game stars unlock new **pilot friends** (puppy, robot, alien, teddy bear, unicorn).

## Grown-ups menu

**Press and hold the gear** (top right of the title or map) for about a second:
- Talking voice, sounds and music on/off
- **Crashes go BOOM:** off = gentle bump and retry; on = silly explosion and retry
- Unlock everything / back to normal progress
- Reset progress

## The voice

Every spoken line is an MP3 in `voice/`, generated with the open-source Kokoro neural voice (`af_heart`). If a clip is ever missing, the game falls back to the iPad's built-in speech.

To change a line or try a different voice:
1. Edit the text in the code (any quoted sentence passed to `say(...)` or `hint(...)`).
2. `node tools/lines.mjs` collects every line into `voice/lines.json`.
3. `python3 tools/build_voice.py <model folder> [voice] [speed]` makes the clips (setup notes are at the top of that file; add `--force` to redo all clips with a new voice).
4. `python3 tools/build_sw.py rocketkids-v4` refreshes the offline file list and bumps the version so iPads pick up the change.

## Files

- `index.html`, `manifest.webmanifest`, `sw.js`: PWA shell
- `css/style.css`: layout and chunky buttons
- `js/data.js`: parts, pilots, missions, unlock levels (tweak here)
- `js/sim.js`: flight physics and the power meter
- `js/draw.js`, `js/bg.js`, `js/icons.js`, `js/fx.js`: artwork and effects
- `js/screens/*.js`: title, map, hangar, flight, game picker
- `js/games/*.js`: the three mini-games (each has a `LEVELS` table at the top for tuning difficulty)
- `js/audio.js`, `js/voice.js`: sound effects, music and the voice player
- `voice/`: the recorded voice clips
- `tools/`: scripts for regenerating the voice and the offline file list

Developer tip: add `?speed=3` to the URL to run the game three times faster for testing.
