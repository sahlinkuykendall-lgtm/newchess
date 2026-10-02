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

## Campaign & progression (v0.4)
Board 1 — **Proving Grounds** — is five stages with a steady difficulty ramp:

| Stage | Map | Enemies (level) | Suggested Lv | Teaches | Joins after |
|-------|-----|-----------------|--------------|---------|-------------|
| 1-1 | Training Yard (16×16) | 2 imps, 1 brute (1) | 1 | Backstab + combo tips | Nyx |
| 1-2 | Windmill Hills (18×18) | 2 gargoyles, 3 imps, 1 brute (2–3) | 2 | High ground, fliers | Aiko, Pip |
| 1-3 | Ember Pits (18×18) | 3 imps, 2 gargoyles, 1 brute (4–5) | 3 | Lava, Fireborn | Hana |
| 1-4 | Mirewood (18×20) | 2 brutes, 2 gargoyles, 2 imps (5) | 4 | Bridges, Sludge Body | Mako |
| 1-5 👑 | Ruins of Ash (20×20) | Varg (7) + 6 elites (5–6) | 5 | Boss fortress — expect to grind | — |

### Enemy AI
Enemies score every move/attack they could make and pick the best. They favour knockouts,
finishing wounded heroes and hitting fragile backliners (healers, archers), and avoid attacks
that would get them killed by Mako's Riposte. Behaviours per enemy:
- **charge** — head straight for the nearest hero (gargoyles).
- **hold** — wait as a pack; once any member spots a hero or is hit, the whole pack attacks together.
- **guard** — stay at a post (walls, gates) until a hero comes close or it gets hurt.

### Measured difficulty
Each stage is simulated 48× with random squads, with the enemy AI also playing your side
(a decent-but-not-clever "average player"). Win rates at the suggested level:

| | 1-1 | 1-2 | 1-3 | 1-4 | 1-5 | 1-5 at +1 / +2 Lv |
|---|---|---|---|---|---|---|
| Easy | 100% | 100% | 100% | 100% | 77% | 98% / 96% |
| **Normal** | 100% | 75% | 77% | 73% | 10% | 35% / 60% |
| Hard | 100% | 13% | 15% | 15% | 0% | 0% / 17% |

So on Normal the middle stages are close fights (usually 1–2 heroes left standing) and the boss
needs grinding a level or two — or sharp tactics. A thoughtful human beats the simulated player.

### Progression rules
- You start with **Kai, Goro, Rin, Sora**; the squad grows to 9 heroes. Pick up to 5 per battle.
- **XP:** every hero who fought gets the stage's XP on a win; each level needs 20 XP more than the last (100, 120, …). Replays give 60%.
- New recruits join at the next stage's suggested level.
- **Growth per level:** +6 HP, +1.2 ATK, +0.8 DEF (enemies use the same table, so enemy "Lv" is comparable).
- **Difficulty:** Easy ×0.85 / Normal ×1 / Hard ×1.15 enemy HP & ATK.
- Progress saves on the device (Settings → Reset Progress to start over).

## Board 2 — Ember Wastes (v0.7)
Unlocks after beating Varg. Ignis, the Ember Tyrant, rules here.

| Stage | Map | Mission | Enemies (level) | Suggested Lv |
|-------|-----|---------|-----------------|--------------|
| 2-1 | Ash Road (18×18) — lava canal, causeways | Rout | 3 hellhounds, witch, golem, imp (6) | 6 |
| 2-2 | Hound Kennels (18×18) — walled pens | **Checkmate**: KO the Pack Alpha | Alpha (10, ×1.5), 4 hounds, witch (7) | 7 |
| 2-3 | Witch's Caldera (18×18) — crater ringed by a ridge | Rout | 2 witches, 2 golems, hound, gargoyle (6–7) | 8 |
| 2-4 | Obsidian Pass (20×16) — narrow canyon | **Survive** 5 turns | 8-strong army (7–8) | 9 |
| 2-5 👑 | Tyrant's Throne (20×20) — dais in a lava moat | Rout | Ignis (8) + golems, witches, hounds (7) | 10 |

New terrain: **ash** ground and tall **basalt** columns (block movement, fade when something is behind them).

New enemies:
- **Hellhound** — fast pack hunter. *Pack Hunter*: +25% damage if another enemy is already next to its target.
- **Ash Witch** — ranged hexer and healer (Hex Bolt ignores DEF, Dark Mend heals an area). *Cinder Veil*: −25% from area attacks.
- **Magma Golem** — slow juggernaut. *Molten Core*: anyone who hits it up close takes 6 burn damage.
- **Ignis, the Ember Tyrant** — boss. *Tyrant*: −30% damage taken while any minion stands. Ultimate *Cataclysm* (area 2).

Missions: **Rout** (KO everyone), **Checkmate** (KO the 👑 leader), **Survive** (last N turns). The objective
shows in the top bar during battle.

XP now rises per level (100, 120, 140, … per level) and stage XP is set so a first clear ≈ one level —
you reach each stage at its suggested level and grinding gives you the edge.

Measured on Normal at the suggested level (48 runs): 2-1 67% · 2-2 79% · 2-3 50% · 2-4 69% · **Ignis 17%** (25% at +1, 40% at +2).

## Gold & gear (v0.6)
- Every win pays **gold** (1-1: 120 → 1-5: 300; replays 60%). You start with 100.
- The **Armory** (campaign screen or squad select) sells gear; each hero has **Weapon / Armor / Charm** slots.
  A bought copy can be worn by one hero at a time; buy more copies for more heroes.
- Better items unlock as the campaign goes on: tier 0 at start, tier 1 after 1-1, tier 2 after 1-3, tier 3 after 1-5.

| Slot | Tier 0 | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|--------|
| Weapon | Training Wraps +2 ATK (60) | Iron Edge +4 ATK (160) | Ember Fang +6 ATK (340) | Starsteel +9 ATK (650) |
| Armor | Padded Vest +2 DEF (60) | Chain Mail +3 DEF +8 HP (170) | Stoneplate +5 DEF +12 HP (360) | Dragonscale +7 DEF +20 HP (680) |
| Charm | Feather Charm +2 Jump (90) · Spirit Bead +25 start SP (120) | Swift Boots +1 MOV (220) | Healing Leaf +6 HP/turn (280) | Focus Band +6 SP/turn (420) |

Gear is the reward for grinding: the difficulty numbers below are measured *without* gear.

## Characters
Every fighter has hand-drawn (procedural) anime art with idle animations, a chess-piece
sigil, a passive ability and a full story profile — see **Characters** on the title screen,
or tap any unit's info card in battle. Full text lives in `src/game/characters.js`.

### Your squad
| Unit | Piece | Class / Aspect | Passive | Skill · Ultimate | Hook |
|------|-------|----------------|---------|------------------|------|
| **Aiko Amane** (18) | King | Lancer · Lumen | *Dawnbreaker* — +25% damage to full-HP enemies | Starpierce · Heaven’s Lance | The human team’s real captain, back from injury. |
| **Pip Gearwhistle** (11) | Bishop | Tinker · Gale | *Light Feet* — walks through enemies | Gust Bomb · Thunderhead Barrage | Kid inventor who followed Sora in a homemade glider. |
| **Hana Hinode** (13) | Pawn | Fan Dancer · Blaze | *Sibling Bond* — she and Kai +20% damage when adjacent | Ember Fan · Inferno Waltz | Kai’s little sister; snuck in with their mother’s fan. |
| **Mako Shiomi** (22) | Knight | Duelist · Tide | *Riposte* — strikes back when hit up close | Riptide Slash · Maelstrom Waltz | Sailor swordsman looking for a new crew. |
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
- **v1:** ✅ campaign map, XP/levels, saving, squad select, gold & gear shop, Board 2 with Checkmate/Survive missions.
- **v2:** recruitable roster to 20+, transformations, Extra Battles, Endless mode.
- **v3:** Tournament mode, daily/puzzle challenges, pass-and-play.
- **v4:** online multiplayer (needs a server), real art pass, public release.
