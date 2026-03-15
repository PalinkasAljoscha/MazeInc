# "Maze Inc." is a fun and Training App for games and excercises in mathematics

## App identity
**Name: Maze Inc.**  this is the name of the app. This is a fun game and excercise app with numbers and other concepts from mathematics, it's about training, playing and discovering.

## Target Audience

Primary school children and anyone interested to discover fun games related to math.

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
- **Asset paths** — Always use relative paths for all assets (images, audio, sprites). Never use absolute paths or hardcoded domain names. This ensures the app works correctly when published to any subdirectory or hosting provider.
- **Prototyping folder** — `prototyping/` contains exploratory simulations and rough sketches. Never import from or copy code directly from this folder into the app. It may be read as reference to understand intended logic, but all app code must be written cleanly from scratch.

---

## Branching Strategy

- `main` — always stable and deployable; never commit directly to this branch
- `dev` — ongoing integration branch; merge feature branches here first
- `feature/<short-description>` — one branch per feature or game (e.g. `feature/level-picker`, `feature/game2`)

Always start a new session by creating or checking out the appropriate feature branch. Merge to `dev` when the feature is complete and tested, and to `main` only when `dev` is stable.

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

**Speed system** — games that support variable speed set `hasSpeed: true` in the `GAMES` array in `App.jsx`. The home-page tile shows a range slider (1–5, default 4) labelled "fast" at the right end. The selected value is passed as a `speed` prop to the game component, which pushes it to Phaser via `game.registry.set('speed', speed)`. In `GameScene.js`, read it in `create()` with `this.registry.get('speed') ?? 4` and apply the shared multiplier table `SPEED_DIAL = [0, 0.5, 0.7, 0.85, 1.0, 1.3]` (index = dial value 1–5) to a `*_BASE` constant so that dial 4 always matches the original design speed.

**Game header bar** — the header bar shown during play (in `App.jsx`) is a three-column flex row:
- **Left** — `← Home` button + three-line game info (app name tiny/dimmed, `{emoji} {title}` large/bold, `Level {n} · Speed {n}` small/dimmed)
- **Center** — `Start New` button (indigo); clicking increments `gameKey` which is passed as `key` to the `GameComponent`, forcing React to unmount/remount it and restart the Phaser game from scratch
- **Right** — empty `flex-1` spacer to keep the center column truly centered

When adding a new game, set `hasSpeed: true` in its `GAMES` entry only if the game uses the speed registry value; omit it otherwise and the speed line is suppressed automatically.

**Game-over popup (Time's up)** — all games with a timer must use the same popup layout:
- Full-screen dark overlay (`C.overlayBlack`, alpha 0.75)
- Panel: `320×280`, `C.gameHeader` fill, rounded `24`, centred at `(W/2, H/2)`
- Title: `30px Arial Black`, `palette.scoreYellow`, at `H/2 - 95`
- Score label: `20px Arial`, `palette.silverGray`, at `H/2 - 30`
- Score value: `72px Arial Black`, `palette.correctGreen`, at `H/2 + 30`
- Play Again button: rect `220×56` at `(W/2 - 110, H/2 + 90)`, rounded `16`, `C.btnBlue` / hover `C.btnBlueHover`; text `24px Arial Black` white at `(W/2, H/2 + 118)`; interactive zone same size
- If a game needs an extra line (e.g. FeedTheNumbers "hungry numbers"), extend the panel height proportionally and shift the button down to keep the same internal spacing
- The **Start New** button in the React header bar uses the same blue (`#3498db` / `#2980b9` hover) and `font-black` to stay visually consistent with the in-game Play Again button

**Adding a new game:**
1. Create `src/games/MyGame/index.jsx` (React wrapper + touch controls) and `GameScene.js` (Phaser scene with `LEVELS` config)
2. Export `default` component and `meta` (including `minLevel`/`maxLevel`) from `index.jsx`; accept `speed = 4` prop and push to registry if the game uses it
3. Import meta and add an entry to the `GAMES` array in `App.jsx`; set `hasSpeed: true` if applicable
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