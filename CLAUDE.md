# Kids Math Learning App — Project Guide

## Current Focus

Game 1 (Multiples Catcher) is built and working. Next: play-test, refine, then build game 2.

## Target Audience

Primary school children.

---

## Tech Stack

| Concern | Choice |
|---|---|
| App shell | React (with Vite) |
| Animated games | Phaser 3 (mounted inside React components) |
| Styling | Tailwind CSS |
| Storage | None — fully stateless for now |
| Backend | None |

Phaser handles the game loop, animation, input, and effects inside a game module.
React wraps it as a component and handles everything outside the game canvas.

---

## Project Structure

```
src/
  App.jsx                          # Home page + game routing (add new games to GAMES array here)
  theme.js                         # All colors — palette (CSS strings) + phaser (hex integers)
  i18n.js                          # i18next setup; imports locale files
  main.jsx                         # Entry point
  locales/
    en.json                        # All UI strings — add keys here for every new game
  games/
    MultiplesCatcher/
      index.jsx                    # React wrapper + on-screen touch buttons
      GameScene.js                 # Phaser scene — all game logic
```

---

## Coding Rules

- **Colors** — Never hardcode color values. Import from `src/theme.js`. Add new named colors there when needed; use `C.slotColors[i]` (8 available) for colored game objects.
- **Strings** — Never hardcode visible text. Use `t()` everywhere. Add keys to all locale files for every new string.
- **i18n key convention** — Card strings: `games.<gameId>.title` / `.description`. In-game strings: `<gameId>.*` (e.g. `multiplesCatcher.hud.score`).

---

## Phaser + React Integration Pattern

- React wrapper creates `Phaser.Game` on mount (scale mode `FIT`, internal res 480×680), destroys on unmount.
- Scene emits `sceneReady` → React stores scene ref to forward touch-button calls.
- Scene emits `gameComplete` → React calls `onComplete({ correct, score })`.
- Touch buttons call `scene.moveBall(dir)` / `scene.dropBall()` directly.
- Game logic lives entirely inside Phaser scenes — not in React state.

Each game exports:
```jsx
export default function MyGame({ level, onComplete }) { ... }
export const meta = { id, title, topics, minAge, maxAge, minLevel, maxLevel }
```

**Level system** — each game defines a `LEVELS` object in `GameScene.js` keyed by level number. The React wrapper passes the chosen level into Phaser via `game.registry.set('level', level)`; the scene reads it back in `create()` with `this.registry.get('level')`.

**Adding a new game:**
1. Create `src/games/MyGame/index.jsx` (React wrapper + touch controls) and `GameScene.js` (Phaser scene with `LEVELS` config)
2. Export `default` component and `meta` (including `minLevel`/`maxLevel`) from `index.jsx`
3. Import meta and add an entry to the `GAMES` array in `App.jsx`
4. Add `games.myGame.title` / `.description` and all in-game strings under `myGame.*` to `en.json`

---

## Game 1 — Multiples Catcher (built ✓)

6 coloured slots at the bottom (`[2, 3, 4, 5, 6, 7]`). Balls fall one at a time; player steers with ← → (keyboard or touch) and drops with Space / ↓ button. A ball scores if its number is a multiple of the slot it lands in.

**Ball generation** (`GameScene.js`):
- Level config (`LEVELS`) defines `slotValues`, `minBall`, `maxBall` per level (2–4)
- `BALLS_PER_SLOT = 2` — bag ensures each slot gets exactly 2 multiples per cycle
- No consecutive repeat: previous ball's value is excluded from the next draw

**Feedback:**
- Correct → green burst, floating equation, particle dots
- Wrong → red flash, camera shake

**Timer:** 60 seconds; game-over overlay shows score with Play Again button.

---

## Game Design Principles

- **Child-friendly** — large targets, clear fonts, bright but not overwhelming colors
- **Immediate feedback** — clear visual/animated effect on correct/wrong
- **Mobile and tablet ready** — touch controls on every game
- **Stateless** — no results stored; each session starts fresh

---

## Notes / Open Decisions

- Sound effects deferred (needs user gesture on mobile to unlock audio)
- Game 2 to be defined after play-testing game 1

*Update this file at the end of each session with decisions made.*
