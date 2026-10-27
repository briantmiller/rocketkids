// Chunky SVG icons for buttons (64x64 viewBox).
const S = (body) => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke="#1B1F3B" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

export const ICON = {
  play: S('<path d="M22 14 L50 32 L22 50 Z" fill="#fff"/>'),
  boost: S('<path d="M32 6 C40 18 48 26 46 40 C44 52 36 58 32 58 C28 58 20 52 18 40 C16 26 24 18 32 6 Z" fill="#FB5607"/><path d="M32 26 C36 32 40 36 39 44 C38 50 35 52 32 52 C29 52 26 50 25 44 C24 36 28 32 32 26 Z" fill="#FFD60A" stroke="none"/>'),
  left: S('<path d="M40 12 L18 32 L40 52 Z" fill="#fff"/>'),
  right: S('<path d="M24 12 L46 32 L24 52 Z" fill="#fff"/>'),
  stage: S('<rect x="22" y="6" width="20" height="22" rx="4" fill="#fff"/><path d="M22 6 L32 0 L42 6" fill="#fff"/><rect x="22" y="36" width="20" height="20" rx="4" fill="#ADB5BD"/><path d="M14 30 L22 33 M50 30 L42 33" stroke-width="3"/><path d="M28 60 L32 64 L36 60" stroke-width="3"/>'),
  chute: S('<path d="M8 30 C8 12 56 12 56 30 Z" fill="#FF8500"/><path d="M24 30 C24 16 40 16 40 30" fill="#fff"/><path d="M8 30 L32 50 L56 30 M24 30 L32 50 L40 30" fill="none" stroke-width="3"/><path d="M26 48 L38 48 L36 58 L28 58 Z" fill="#fff"/>'),
  tip: S('<path d="M14 50 C14 26 30 14 50 14" fill="none" stroke-width="7"/><path d="M42 4 L56 14 L44 26 Z" fill="#fff"/>'),
  satellite: S('<rect x="24" y="22" width="16" height="20" rx="3" fill="#E9B949"/><rect x="2" y="26" width="18" height="12" fill="#3A86FF"/><rect x="44" y="26" width="18" height="12" fill="#3A86FF"/><path d="M32 22 L32 12"/><circle cx="32" cy="9" r="4" fill="#F94144"/>'),
  camera: S('<rect x="6" y="18" width="52" height="36" rx="8" fill="#fff"/><path d="M22 18 L26 10 L38 10 L42 18" fill="#fff"/><circle cx="32" cy="36" r="11" fill="#4CC9F0"/>'),
  flag: S('<path d="M16 58 L16 6" stroke-width="5"/><path d="M16 8 L52 8 L46 20 L52 32 L16 32 Z" fill="#F94144"/>'),
  liftoff: S('<path d="M32 4 C42 14 44 28 42 40 L22 40 C20 28 22 14 32 4 Z" fill="#fff"/><circle cx="32" cy="22" r="5" fill="#4CC9F0"/><path d="M22 40 L14 48 L22 48 M42 40 L50 48 L42 48" fill="#F94144"/><path d="M26 48 L32 60 L38 48" fill="#FFD60A"/>'),
  home: S('<path d="M8 32 L32 10 L56 32" fill="none" stroke-width="5"/><path d="M16 28 L16 54 L48 54 L48 28" fill="#fff"/><rect x="27" y="38" width="10" height="16" fill="#FFD60A"/>'),
  boom: S('<path d="M32 2 L38 20 L56 12 L46 28 L62 36 L44 40 L50 58 L34 46 L24 62 L22 44 L4 48 L16 34 L2 22 L20 22 L18 6 Z" fill="#FFD60A"/><path d="M32 18 L36 28 L46 26 L40 34 L48 40 L37 40 L36 50 L30 42 L22 48 L24 38 L14 34 L24 30 L22 22 Z" fill="#F94144" stroke="none"/>'),
  gear: S('<path d="M32 4 L37 12 L46 9 L47 18 L56 21 L51 29 L58 35 L50 40 L52 49 L43 49 L39 57 L32 52 L25 57 L21 49 L12 49 L14 40 L6 35 L13 29 L8 21 L17 18 L18 9 L27 12 Z" fill="#ADB5BD"/><circle cx="32" cy="32" r="9" fill="#fff"/>'),
  wrench: S('<path d="M44 6 C36 6 30 14 33 22 L10 45 C7 48 7 53 10 56 C13 59 18 58 20 55 L43 32 C51 35 59 28 58 20 L50 26 L42 22 L40 14 Z" fill="#ADB5BD"/>'),
  speaker: S('<path d="M10 24 L22 24 L36 12 L36 52 L22 40 L10 40 Z" fill="#fff"/><path d="M44 22 C50 28 50 36 44 42 M50 14 C60 24 60 40 50 50" fill="none"/>'),
  check: S('<path d="M10 34 L26 50 L54 14" fill="none" stroke="#38B000" stroke-width="9"/>'),
  lock: S('<rect x="12" y="28" width="40" height="30" rx="6" fill="#FFD60A"/><path d="M20 28 L20 20 C20 6 44 6 44 20 L44 28" fill="none" stroke-width="6"/><circle cx="32" cy="42" r="4" fill="#1B1F3B"/>'),
  plus: S('<path d="M32 10 L32 54 M10 32 L54 32" stroke-width="10" stroke="#fff"/>'),
  minus: S('<path d="M12 32 L52 32" stroke-width="10" stroke="#fff"/>'),
  trash: S('<path d="M14 18 L50 18 L46 58 L18 58 Z" fill="#fff"/><path d="M8 18 L56 18 M24 18 L24 10 L40 10 L40 18 M26 28 L26 48 M38 28 L38 48"/>'),
  star: S('<path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z" fill="#FFD60A"/>'),
  starEmpty: S('<path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)"/>'),
  retry: S('<path d="M50 32 C50 44 42 52 32 52 C20 52 12 43 12 32 C12 21 21 12 32 12 C38 12 43 15 46 19" fill="none" stroke-width="7"/><path d="M50 6 L50 22 L34 22 Z" fill="#fff"/>'),
  next: S('<path d="M12 14 L36 32 L12 50 Z M32 14 L56 32 L32 50 Z" fill="#fff"/>'),
  rocket: S('<path d="M32 4 C44 14 46 30 44 44 L20 44 C18 30 20 14 32 4 Z" fill="#F94144"/><circle cx="32" cy="22" r="6" fill="#9EE6FF"/><path d="M20 36 L10 50 L20 48 M44 36 L54 50 L44 48" fill="#FFD60A"/><path d="M26 48 L32 60 L38 48" fill="#FB5607"/>'),
  park: S('<path d="M6 56 C14 40 26 38 32 44 C38 38 50 40 58 56 Z" fill="#38B000"/><path d="M32 4 C38 10 39 20 38 30 L26 30 C25 20 26 10 32 4 Z" fill="#fff"/><path d="M26 30 L32 40 L38 30" fill="#FFD60A"/>'),
  close: S('<path d="M16 16 L48 48 M48 16 L16 48" stroke-width="9" stroke="#fff"/>'),
};

// Mission node art (bigger, colorful).
export const MISSION_ICON = {
  cloud: S('<circle cx="32" cy="28" r="12" fill="#fff"/><circle cx="20" cy="36" r="10" fill="#fff"/><circle cx="44" cy="36" r="10" fill="#fff"/><rect x="18" y="34" width="28" height="12" fill="#fff" stroke="none"/><path d="M10 46 L54 46" />'),
  plane: S('<path d="M6 34 L58 26 L58 32 L6 40 Z" fill="#fff"/><path d="M26 32 L18 50 L26 50 L36 31 Z M28 30 L22 16 L28 16 L38 29 Z" fill="#4CC9F0"/><path d="M8 34 L4 24 L10 24 L14 33" fill="#F94144"/>'),
  stars: S('<path d="M22 6 L26 18 L38 18 L28 25 L32 37 L22 30 L12 37 L16 25 L6 18 L18 18 Z" fill="#FFD60A"/><path d="M46 30 L49 38 L57 38 L51 43 L53 51 L46 46 L39 51 L41 43 L35 38 L43 38 Z" fill="#FFD60A"/><circle cx="50" cy="12" r="3" fill="#fff"/><circle cx="14" cy="50" r="3" fill="#fff"/>'),
  earth: S('<ellipse cx="32" cy="32" rx="28" ry="10" fill="none" stroke="#FFD60A" stroke-dasharray="4 5"/><circle cx="32" cy="32" r="16" fill="#2F80ED"/><path d="M22 26 C26 22 30 26 28 30 C26 34 22 32 22 26 Z M36 34 C40 32 44 36 40 40 C36 42 34 38 36 34 Z" fill="#4CAF50" stroke="none"/><circle cx="56" cy="30" r="4" fill="#F94144"/>'),
  satellite: S('<rect x="24" y="22" width="16" height="20" rx="3" fill="#E9B949"/><rect x="2" y="26" width="18" height="12" fill="#3A86FF"/><rect x="44" y="26" width="18" height="12" fill="#3A86FF"/><path d="M32 22 L32 12"/><circle cx="32" cy="9" r="4" fill="#F94144"/>'),
  station: S('<rect x="4" y="29" width="56" height="6" fill="#ADB5BD"/><rect x="6" y="12" width="12" height="16" fill="#3A86FF"/><rect x="6" y="36" width="12" height="16" fill="#3A86FF"/><rect x="46" y="12" width="12" height="16" fill="#3A86FF"/><rect x="46" y="36" width="12" height="16" fill="#3A86FF"/><rect x="22" y="22" width="20" height="20" rx="8" fill="#fff"/>'),
  moonloop: S('<circle cx="36" cy="30" r="14" fill="#D9D9D9"/><circle cx="31" cy="26" r="3" fill="#BDBDBD" stroke="none"/><circle cx="40" cy="35" r="4" fill="#BDBDBD" stroke="none"/><path d="M8 50 C2 30 20 8 44 10 C58 12 60 30 50 42" fill="none" stroke="#FFD60A" stroke-dasharray="4 5"/><circle cx="12" cy="52" r="6" fill="#2F80ED"/>'),
  moonflag: S('<path d="M2 56 C14 46 50 46 62 56 L62 62 L2 62 Z" fill="#D9D9D9"/><path d="M30 50 L30 10" stroke-width="4"/><path d="M30 12 L54 12 L54 28 L30 28 Z" fill="#F94144"/><circle cx="42" cy="20" r="4" fill="#FFD60A" stroke-width="2"/>'),
  mars: S('<circle cx="32" cy="32" r="24" fill="#E2725B"/><ellipse cx="24" cy="26" rx="8" ry="5" fill="#C1440E" stroke="none"/><ellipse cx="40" cy="40" rx="6" ry="4" fill="#C1440E" stroke="none"/><ellipse cx="32" cy="10" rx="8" ry="3" fill="#fff" stroke="none"/>'),
};
