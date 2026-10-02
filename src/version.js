// The app's version. When you ship an update, bump VERSION here AND in
// version.json — the app compares the two to know a newer build is online.
export const VERSION = '0.7.0';
export const VERSION_NOTE = 'Board 2: Ember Wastes';

// Every file the app needs (also listed in sw.js — a test keeps them in sync).
export const ASSETS = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'version.json',
  'src/main.js', 'src/version.js', 'src/audio.js',
  'src/game/data.js', 'src/game/rules.js', 'src/game/ai.js', 'src/game/levels.js',
  'src/game/characters.js', 'src/game/progress.js', 'src/game/items.js',
  'src/render/board.js', 'src/render/sprites.js',
  'src/ui/battle.js', 'src/ui/profile.js', 'src/ui/campaign.js', 'src/ui/armory.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
