# Gambit Arena

A chess-like, isometric, turn-based tactics RPG built for iPhone as a web app.
Inspired by the style of *Yu Yu Hakusho: Tournament Tactics* (GBA) — with our
own characters, world and story. See **[DESIGN.md](DESIGN.md)** for the full plan.

## Play it on your iPhone
1. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   pick the branch (e.g. `main`) and folder `/ (root)`, then **Save**.
2. After a minute your game is live at `https://<your-username>.github.io/<repo-name>/`.
3. Open that link in **Safari** → tap **Share** → **Add to Home Screen**.
4. Launch it from the home screen for full-screen play (works offline after the first load).

> Sound on iPhone: flip the silent switch off — Safari mutes web audio in silent mode.

### Updating
The app checks for a new version every time you open it and shows an **Update** banner.
You can also go to **Settings → Force update** (or tap the version number on the title
screen). Force update re-downloads the whole game and keeps your progress.
Note: a Home Screen app has its own storage — clearing Safari's data does not affect it.

**Shipping an update (for developers):** bump `VERSION` in `src/version.js` *and* `version.json`
(a test checks they match), then push to `main`.

## How to play
- **Play** opens the campaign. Clear stages in order — each one unlocks the next.
- Before each fight, pick up to 5 heroes. Heroes earn **XP** and **level up** when you win;
  new heroes join as the story goes on. Replay cleared stages to grind (60% XP).
- Too hard? Switch **Difficulty** to Easy in Settings. Want pain? Hard.
- **Tap** one of your fighters → blue tiles show where they can move. Tap a tile to move.
- Pick **Attack**, a **Skill** (costs SP) or your **★ Ultimate** (at 100 SP), then tap a red target.
- A forecast shows the exact damage. Tap the target again (or **Confirm**) to strike.
- **Undo** a move before you act. **Wait** to end that unit's turn. **End Turn** when you're done.
- Highlights: **blue** = where you can move, **red dashed** = where you could attack, **⌖** = targets in reach now.
- Every Attack/Skill/Ultimate button shows its **Reach** in tiles and its **Area**.
- Tap an enemy to see its stats and the purple zone it can reach next turn.
- Tap the unit card (ⓘ) for a full profile: story, passive ability and every move.
- **Characters** on the title screen shows the whole roster.
- The camera follows the action. Drag to pan, pinch to zoom, tap 🗺 to see the whole map.
- Tips: hit enemies **from behind** (backstab), stand **next to the target** to add combo hits,
  use the **aspect wheel** (`?` button), heal on the **shrine**, and stay off the **lava**.

## Run locally
```bash
npm start        # serves the game at http://localhost:8080
npm test         # runs the rules/AI unit tests (Node 20+)
```
No build step and no dependencies — it's plain JavaScript modules + Canvas.

## Project layout
```
index.html, styles.css      app shell, HUD and menus
manifest.webmanifest, sw.js PWA install + offline support
src/main.js                 boot, settings, touch input
src/audio.js                chiptune synth (music + SFX, no audio files)
src/game/                   pure rules: data, rules, AI, levels (unit-tested)
src/render/                 isometric board + procedural character art
src/ui/battle.js            battle flow, animations, HUD
tests/                      node:test unit tests
tools/                      icon generator
```
