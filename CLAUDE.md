# "Maze Inc." is a fun and Training App for games and excercises in mathematics

## App identity
**Name: Maze Inc.**  this is the name of the app. This is a fun game and excercise app with numbers and other concepts from mathematics, it's about training, playing and discovering.

## Target Audience

Primary school children and anyone interested to discover fun games related to math.

See `GAMES.md` (project root) for per-game descriptions covering design idea, math concepts, target age, mood, and strategic context.

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
    en.json                        # All UI strings — add keys here for every new string
  components/
    TouchButton.jsx                # Shared on-screen touch button (← → ↓ etc.) — import this, never re-implement locally
  games/
    shared/
      pathViz.jsx                  # Shared <PathLayer> SVG component for sequence/path games (NewWays, LadderToInfinity)
    MultiplesCatcher/
      index.jsx                    # React wrapper + on-screen touch buttons
      GameScene.js                 # Phaser scene — all game logic
public/
  favicon.svg                      # App favicon (SVG, also used as apple-touch-icon)
```

---

## Coding Rules

- **Colors** — Never hardcode color values. Import from `src/theme.js`. Add new named colors there when needed; use `C.slotColors[i]` (8 available) for colored game objects.
- **Strings** — Never hardcode visible text. Use `t()` everywhere. Add keys to all locale files for every new string.
- **i18n key convention** — Card strings: `games.<gameId>.title` / `.description`. In-game strings: `<gameId>.*` (e.g. `multiplesCatcher.hud.score`).
- **Asset paths** — Always use relative paths for all assets (images, audio, sprites). Never use absolute paths or hardcoded domain names.
- **Shared components** — Never re-implement `TouchButton` inside a game wrapper. Always import from `src/components/TouchButton.jsx`. For sequence/path games that draw a move history in SVG, use `<PathLayer>` from `src/games/shared/pathViz.jsx` rather than duplicating the rendering logic.
- **Analysis folder** — `analysis/` contains outside-of-app experimentation only. Never import from it; read as reference only.

---

## Branching Strategy

- `main` — always stable and deployable; never commit directly to this branch
- `dev` — ongoing integration branch; merge feature branches here first
- `feature/<short-description>` — one branch per feature or game

Always start a new session by creating or checking out the appropriate feature branch. Merge to `dev` when complete and tested, to `main` only when `dev` is stable.

---

## Phaser + React Integration Pattern

- React wrapper creates `Phaser.Game` on mount (scale mode `FIT`, internal res 480×680), destroys on unmount.
- Scene emits `sceneReady` → React stores scene ref to forward touch-button calls.
- Scene emits `gameComplete` → React calls `onComplete({ correct, score })`.
- Touch buttons call `scene.moveBall(dir)` / `scene.dropBall()` directly.
- Game logic lives entirely inside Phaser scenes — not in React state.

Each game exports:
```jsx
export default function MyGame({ level, speed, onComplete }) { ... }
export const meta = { id, title, topics, minAge, maxAge, minLevel, maxLevel }
```

**Level system** — each game defines a `LEVELS` object in `GameScene.js` keyed by level number. The React wrapper passes the chosen level into Phaser via `game.registry.set('level', level)`; the scene reads it back in `create()` with `this.registry.get('level')`.

**Speed system** — games that support variable speed set `hasSpeed: true` in the `GAMES` array in `App.jsx`. The selected value (1–5, default 4) is passed as a `speed` prop to the game component, which pushes it to Phaser via `game.registry.set('speed', speed)`. In `GameScene.js`, read it in `create()` with `this.registry.get('speed') ?? 4` and apply `SPEED_DIAL = [0, 0.5, 0.7, 0.85, 1.0, 1.3]` (index = dial value) to a `*_BASE` constant so that dial 4 matches the original design speed.

**Home page tiles** — each game card is a compact horizontal strip: emoji top-left, `▶` play button top-right, game title + description (up to 3 lines) spanning full width below. No level/speed controls on the tile. Clicking `▶` opens the Settings popup.

**Settings popup** — used both from the home page (`▶`) and during a game (`Change` button). Shows "Choose Difficulty" title, a `‹ N ›` picker for Level (always), and a second picker for Speed if `hasSpeed`. When both pickers are shown they stack vertically at ~65% size; a single picker is shown at full size. Buttons: **OK** always (starts a fresh game instance); **Cancel** only when opened during an active game (closes popup, game continues unchanged). Level and speed are never changed on a running game — OK always starts a new instance.

**Game header bar** — three-column flex row:
- **Left** — `← Home` button + three-line game info: app name (tiny/dimmed), `{emoji} {title}` (large/bold), `Level {n} · Speed {n}` (small/dimmed) + blue **Change** button inline
- **Center** — `Start New` button (`palette.btnBlue`); restarts the game at the current level/speed without a popup
- **Right** — empty `flex-1` spacer

**Game-over popup (Time's up)** — all games with a timer must use the same popup layout:
- Full-screen dark overlay (`C.overlayBlack`, alpha 0.75)
- Panel: `320×280`, `C.gameHeader` fill, rounded `24`, centred at `(W/2, H/2)`
- Title: `30px Arial Black`, `palette.scoreYellow`, at `H/2 - 95`
- Score label: `20px Arial`, `palette.silverGray`, at `H/2 - 30`
- Score value: `72px Arial Black`, `palette.correctGreen`, at `H/2 + 30`
- Play Again button: rect `220×56` at `(W/2 - 110, H/2 + 90)`, rounded `16`, `C.btnBlue` / hover `C.btnBlueHover`; text `24px Arial Black` white at `(W/2, H/2 + 118)`
- If a game needs an extra line, extend panel height proportionally and shift button down
- The **Start New** and **Change** buttons in the React header use the same blue (`palette.btnBlue` / `palette.btnBlueHover`) and `font-black` to stay visually consistent with the in-game Play Again button

**Adding a new game:**
1. Create `src/games/MyGame/index.jsx` (React wrapper) and `GameScene.js` (Phaser scene with `LEVELS` config)
2. Export `default` component and `meta` (including `minLevel`/`maxLevel`) from `index.jsx`; accept `speed = 4` prop and push to registry if the game uses it
3. If the game needs on-screen touch controls, import `TouchButton` from `../../components/TouchButton.jsx`
4. Import component and meta into `App.jsx`; add a single entry to `GAMES` with `component`, `emoji`, `color`, `shadow`, `minLevel`, `maxLevel`, and `hasSpeed` if applicable
5. Add `games.myGame.title` / `.description` and all in-game strings under `myGame.*` to `en.json` and `fr.json`

---

## Game Design Principles

- **Child-friendly** — large targets, clear fonts, bright but not overwhelming colors
- **Immediate feedback** — clear visual/animated effect on correct/wrong
- **Mobile and tablet ready** — touch controls on every game
- **Stateless** — no results stored; each session starts fresh

---

## Notes / Open Decisions

- Sound effects deferred (needs user gesture on mobile to unlock audio)

*Update this file at the end of each session with decisions made.*
