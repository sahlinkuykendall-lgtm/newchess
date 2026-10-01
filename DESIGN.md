# Gambit Arena — Design Doc

> A chess-like, D&D-flavored, turn-based tactics RPG for iPhone (web app / PWA).
> Inspired by the *style* of the GBA game *Yu Yu Hakusho: Tournament Tactics* —
> all characters, story and world are our own.

## Pitch
Build a squad of five fighters, climb a tournament held on living battle-boards
between worlds, and outthink your opponents one move at a time. Every hit is
predictable (no dice, no misses) — like chess — but every fighter has RPG stats,
gear, levels, elements and flashy special moves.

## Decisions so far

| # | Topic | Decision |
|---|-------|----------|
| 1 | IP | 100% original characters and world. Only the game *style* is borrowed. |
| 2 | Audience | Me + friends first. Long-term goal: multiplayer + public release. |
| 3 | Feel | Chess-like strategy + D&D arena + RPG progression, turn based. |
| 4 | Campaign | 50–75 levels, light story, recruit characters as you progress. |
| 5 | Story shape | **(Claude's pick)** One tournament — *The Grand Gambit* — across 5 worlds ("Boards"), ~12–15 levels each, every Board ends with a big boss map. |
| 6 | Turn order | Phase-based: my whole team moves, then the enemy team. |
| 7 | View | Isometric with height levels. |
| 8 | Squad | 5 units. |
| 9 | Maps | "Small" maps are ~20×20 (≈250–300 tiles), irregular islands with real features — rivers & bridges, forts, forests, cliffs, lava — never a plain square. Boss maps are bigger still. The camera follows the action; 🗺 shows the whole map. |
| 10 | Spirit energy | Yes → **SP** (0–100). Builds by dealing/taking hits + each turn. Skills cost SP; at 100 you can fire your **Ultimate**. |
| 11 | Team combos | Yes → allies standing next to your target join in with an **Assist** hit. |
| 12 | Positioning | Only **backstab**: hitting a unit from behind = ×1.5 (assassins ×2). |
| 13 | Elements | **(Claude's pick)** six *Aspects* — see below. |
| 14 | Terrain | Height, water (blocks; fliers cross), bridges, lava (burns), pillars/trees/rocks (block), shrines (heal), sand & dirt paths. |
| 15 | Missions | Keep all 4 originals + add more. Main campaign + an Extra Battles section. |
| 16 | 1v1 duels | No. |
| 17 | Roster | 20+ characters. |
| 18 | Progression | Simple levels + gear. |
| 19 | Transformations | Yes (mid-battle power-ups). |
| 20 | Unlocks | Story recruits *and* beat-them-to-recruit. |
| 21 | KO | Not permanent — KO'd units come back after the battle. |
| 22 | Modes | Story, local pass-and-play, Endless (earn gold), Tournament. |
| 23 | Extras | Daily challenges + puzzle battles ("win in 1 turn"). |
| 24 | Difficulty | Challenging. Some story fights require grinding side content for levels/gear. Must stay fair. |
| 25 | Art | Clean modern anime style. |
| 26 | Art source | Claude decides (procedural in code for now, upgrade later). |
| 27 | FX | Attack animations for basic hits, full-screen cut-in for Ultimates. |
| 28 | Audio | Chiptune. |
| 29 | Controls | Landscape by default (orientation option in Settings). Tap-to-select, tap-to-act. |
| 30 | Tech | PWA hosted on GitHub Pages, "Add to Home Screen" on iPhone. |
| 31 | Saves | Local on the device. |
| 32 | Code | Plain JavaScript (ES modules) + Canvas. No build step, no dependencies. |
| 33 | Name | **Gambit Arena** (suggested repo name: `gambit-arena`). |
| 36 | Inspiration | Onimusha Tactics, YYH Tournament Tactics. |

## Core rules (v0)

- **Turns:** Player phase → Enemy phase. Each unit may **Move** once and **Act** once (Attack, Skill, Ultimate or Wait). You can **Undo** a move until you act.
- **Movement:** up to `MOV` tiles; can climb/drop up to `JUMP` height; can pass through allies, not enemies.
- **Damage (deterministic):** `(ATK × power − DEF) × aspect × backstab`, minimum 1. The forecast you see is exactly what happens.
- **Backstab:** attacking from behind the target's facing direction. Units face the way they last moved/attacked.
- **Assist (combo):** every other ally adjacent to the target adds a follow-up hit.
- **SP:** +10 at the start of your phase, +10 for dealing damage, +8 for taking damage. Max 100.
- **Win:** KO every enemy. **Lose:** your whole squad is KO'd.

### Aspects (elements)
A four-way wheel plus a light/dark rivalry:

```
Blaze ➜ Gale ➜ Stone ➜ Tide ➜ Blaze        (×1.5 strong / ×0.75 weak)
Lumen ⇄ Umbra                               (each deals ×1.5 to the other)
```

### Terrain
| Tile | Effect |
|------|--------|
| Grass / Stone / Sand / Dirt | Normal |
| Bridge | Normal — usually the only way over a river (chokepoints!) |
| Water | Impassable, except for fliers (Gargoyles) |
| Pillar / Tree / Rock | Impassable; tall ones fade out when something stands behind them |
| Empty space (`..`) | The edge of the floating island |
| Lava | Passable; burns 10 HP at the start of your phase |
| Shrine | Heals 15% max HP at the start of your phase |

### Enemy behaviour
- **Charge** (default): head for the nearest hero and attack the best target.
- **Guard**: hold position (e.g. on fortress walls) until a hero comes within its aggro range or it gets hurt.

## Map format
Maps live in `src/game/levels.js` as one grid of 2-character cells — tile type + height —
e.g. `g1` grass at height 1, `s4` stone wall at height 4, `..` empty space. A unit test checks
every hero can reach every enemy, so a typo can't make a level unwinnable.

## Mission types (planned)
1. **Rout** – KO all enemies *(v0)*
2. **Floodgate** – statues keep spawning enemies; smash the statues
3. **Timed Rout** – KO all enemies within N turns
4. **Pursuit** – catch the runner before it escapes
5. **Breakthrough** – get one unit to the marked tile
6. **Checkmate** *(new)* – KO the enemy King unit only
7. **Escort** *(new)* – keep a VIP alive to the exit
8. **Hold the Line** *(new)* – survive N turns
9. **King of the Hill** *(new)* – control the center tile for N turns

## Story sketch — *The Grand Gambit*
Once a century the realms settle their wars on the **Grand Board**, a tournament
fought on living battlefields. The winning team's captain earns one wish.
A street brawler named **Kai** gets dragged in as a last-minute substitute.

| Board | Theme | Boss |
|-------|-------|------|
| 1. Proving Grounds | Ruins of Ash: river, two bridges, Varg's fortress | Varg the Red (Team Crimson Fang) |
| 2. Ember Wastes | Lava fields | TBD |
| 3. Drowned Court | Sunken palace, water | TBD |
| 4. Sky Spire | Floating islands, wind | TBD |
| 5. Black Throne | The finals | The Grandmaster |

## Characters
Every fighter has hand-drawn (procedural) anime art with idle animations, a chess-piece
sigil, a passive ability and a full story profile — see **Characters** on the title screen,
or tap any unit's info card in battle. Full text lives in `src/game/characters.js`.

### Your squad
| Unit | Piece | Class / Aspect | Passive | Skill · Ultimate | Hook |
|------|-------|----------------|---------|------------------|------|
| **Kai Hinode** (16) | Pawn | Brawler · Blaze | *Burning Spirit* — +5 SP whenever he deals damage | Flare Fist · Phoenix Breaker | Last-minute substitute street fighter; his fire came from somewhere. |
| **Goro Ishiyama** (34) | Rook | Guardian · Stone | *Bedrock* — can’t be backstabbed | Quake Slam · Titan Crash | Temple guardian whose shield is the gate he failed to hold. |
| **Rin Minase** (15) | Bishop | Mystic · Tide | *Tidal Grace* — heals herself + adjacent allies 6 HP each turn | Mending Wave · Tidal Requiem | Shrine maiden whose sacred orb dims every time she heals. |
| **Sora Kazehara** (17) | Queen | Ranger · Gale | *Eagle Eye* — +1 range from height 2+ | Piercing Gale · Skyrend Volley | Banished wind-archer and the team’s real strategist. |
| **Nyx** (?) | Knight | Shade · Umbra | *Shadow Strike* — backstabs ×2 | Night Fang · Eclipse Edge | Shadow from the Umbra who joined uninvited; hunts Crimson Fang. |

### Team Crimson Fang
| Unit | Piece | Passive | Hook |
|------|-------|---------|------|
| **Varg the Red** | King | *Bloodlust* — heals 15 HP on a KO | Three-time finalist; promised a wish to crush the substitutes. |
| **Cinder Imp** | Pawn | *Fireborn* — immune to lava | Giggling fire imps that love shiny things. |
| **Bog Brute** | Rook | *Sludge Body* — −25% damage from ranged attacks | Living swamp that grows a lily per win. |
| **Gargoyle** | Knight | *Stone Wings* — flies over water | 600-year-old fortress statues woken by demon magic. |

## Roadmap
- **v0 (now):** one 5v5 battle, isometric board, moves/attacks/skills/ultimates, AI, cut-ins, chiptune, PWA install.
- **v1:** campaign map, XP/levels, gold, gear shop, saving, 10 levels, more mission types.
- **v2:** recruitable roster to 20+, transformations, Extra Battles, Endless mode.
- **v3:** Tournament mode, daily/puzzle challenges, pass-and-play.
- **v4:** online multiplayer (needs a server), real art pass, public release.
