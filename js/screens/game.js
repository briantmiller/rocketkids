// Router for the mini-games.
import { landerGame } from '../games/lander.js';
import { dashGame } from '../games/dash.js';
import { roverGame } from '../games/rover.js';

const MAKE = { lander: landerGame, dash: dashGame, rover: roverGame };
export function gameScreen(app, params) { return MAKE[params.game || 'lander'](app, params); }
