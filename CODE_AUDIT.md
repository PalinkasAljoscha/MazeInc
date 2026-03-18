# Maze Inc. — Code Quality Audit
*Generated 2026-03-18 · 6 games audited: MultiplesCatcher, NewWays, FeedTheNumbers, Balance, LadderToInfinity, NumberLabyrinth*

---

## Summary

The codebase is in good overall shape — theme imports are consistently used, i18n is nearly fully adopted, and the Phaser+React integration pattern is solid and documented. The main issues fall into three buckets:

1. **Rule violations** — a handful of hardcoded colors and two shared-component bypasses
2. **Significant redundancies** — duplicated constants, logic and boilerplate across files that will grow more painful with every new game added
3. **Minor concerns** — orphaned i18n keys, one missing cleanup, one heavy synchronous computation

---

## 1 · Theme / Color Compliance

### ✅ Correct
All three `GameScene.js` files import `{ palette, phaser as C }` from `theme.js` and use those tokens throughout. All React index.jsx files use `palette` from theme.js.

### ❌ Violations

| File | Line(s) | Hardcoded value | Should be |
|---|---|---|---|
| `Balance/GameScene.js` | 258–261 | `0x1c1c38`, `0x1c2838` | Add `leftHalfBg` / `rightHalfBg` to theme.js |
| `Balance/GameScene.js` | 266–267 | `0xffffff, 0.25` | `C.white` or named token |
| `Balance/GameScene.js` | 271–272 | `0xffffff, 0.45` | `C.white` or named token |
| `NumberLabyrinth/index.jsx` | 377 | `'#3d2b1f'`, `'#f5e6d0'` | Add `boardTextDark` / `boardTextLight` to theme.js |
| `NumberLabyrinth/index.jsx` | 391, 408 | `'#8B5A2B'` | Add `flagPoleColor` to theme.js |
| `FeedTheNumbers/GameScene.js` | 414 | `0xffffff, 0.45` | `C.white` or named token |
| `App.jsx` | 238–240 | `'#3498db'` / `'#2980b9'` inline style | Use Tailwind `bg-[...]` with palette values or a CSS variable; at minimum import palette and reference `palette.btnBlue` |

**The App.jsx case is particularly worth fixing** — CLAUDE.md explicitly says the Start New button should use the same blue as the in-game Play Again button, but the button currently uses hardcoded strings instead of the palette constants, making future color changes fragile.

---

## 2 · i18n / Hardcoded String Compliance

### ✅ Correct
All visible in-game text goes through `i18n.t()`. No hardcoded strings found in game UI elements.

### ⚠️ Orphaned keys in `en.json`

The following keys exist in `en.json` but are **never called** in any source file:

- `home.title` ("Math Trainer") — the app name displayed on screen comes from `app.name`
- `balance.hud.left` ("LEFT")
- `balance.hud.right` ("RIGHT")
- `balance.hud.leftSum` ("left Σ")
- `balance.hud.rightSum` ("right Σ")

The four `balance.hud.*` keys look like planned UI labels that were never wired up in `Balance/GameScene.js`. If the feature is dropped, remove them; if it's still planned, they can stay but should be documented.

---

## 3 · Shared Component Usage

### ❌ LadderToInfinity: TouchButton bypassed

`LadderToInfinity/index.jsx` (lines 335–355) defines **four inline `<button>` elements** with handwritten styling instead of using `TouchButton`. This violates the rule in CLAUDE.md: *"Never re-implement TouchButton inside a game wrapper."*

The buttons are functionally equivalent to what TouchButton provides. The only reason they appear custom-made is the `disabled` prop on the undo button — but this can be handled by passing a `disabled` prop through to TouchButton (a one-line addition to that component).

### ❌ NumberLabyrinth: PathLayer bypassed

`NumberLabyrinth/index.jsx` (lines 253–302) defines its own `renderPathSegments()` and `renderPathDots()` functions that reproduce the core rendering logic from `PathLayer` in `pathViz.jsx`. The reason given is custom coloring (green/red based on validation state), but this could be solved by adding a `colorFn` prop to `PathLayer`. As it stands, any bugfix or improvement to PathLayer will need to be manually duplicated here.

Note: NumberLabyrinth correctly imports `computeSegmentOffsets` and `arrowHead` from pathViz — it's halfway there. The `PathLayer` component itself just needs a `segColorFn` override prop.

### ✅ Correct usage
- NewWays: uses `PathLayer` correctly
- LadderToInfinity: uses `PathLayer` correctly (despite not using TouchButton)
- NumberLabyrinth: imports `TouchButton` correctly for its D-pad

---

## 4 · Redundancies — Highest Priority

These are the most impactful items as the codebase scales with more games.

### 4a · `findRepeatSeq` is copy-pasted verbatim

This function is **byte-for-byte identical** in:
- `NewWays/index.jsx` (lines 18–29)
- `LadderToInfinity/index.jsx` (lines 12–23)

It should be extracted to `src/games/shared/repeatSeq.js` (or added to `pathViz.jsx`) and imported by both. With a third sequence game in future this will be copy-pasted again.

### 4b · `SPEED_DIAL` duplicated in every Phaser game

```js
const SPEED_DIAL = [0, 0.5, 0.7, 0.85, 1.0, 1.3]
```

This constant is copy-pasted into all three `GameScene.js` files (MultiplesCatcher, Balance, FeedTheNumbers). A change to the speed curve would require three edits. It should live in a shared file, e.g. `src/games/shared/constants.js`.

### 4c · `GAME_W` / `GAME_H` duplicated in every Phaser game

```js
const GAME_W = 480
const GAME_H = 680
```

Same copy-paste issue — belongs in `src/games/shared/constants.js`.

### 4d · `MOVE_COOLDOWN` / `FAST_SPEED` duplicated

```js
const FAST_SPEED = 600    // MultiplesCatcher line 13, Balance line 19
const MOVE_COOLDOWN = 150 // MultiplesCatcher line 14, Balance line 20
```

Same values in both Phaser games that have keyboard hold-to-move. Belongs in shared constants.

### 4e · Phaser React wrapper boilerplate is copy-pasted across 3 wrappers

The `useEffect` in `MultiplesCatcher/index.jsx`, `Balance/index.jsx`, and `FeedTheNumbers/index.jsx` is **structurally identical** — same Phaser config object (480×680, FIT, AUTO), same registry sets, same `sceneReady`/`gameComplete` event wiring, same `game.destroy(true)` on unmount.

A custom hook `usePhaserGame(GameScene, { level, speed, onComplete })` would reduce each wrapper to ~5 lines. This becomes more valuable as games 7, 8, 9 are added.

**Sketch of what the hook would look like:**
```js
// src/hooks/usePhaserGame.js
export function usePhaserGame(containerRef, SceneClass, { level, speed, onComplete }) {
  const sceneRef = useRef(null)
  useEffect(() => {
    const game = new Phaser.Game({ ... })
    game.registry.set('level', level)
    game.registry.set('speed', speed)
    game.events.on('sceneReady', (s) => { sceneRef.current = s })
    game.events.on('gameComplete', ({ score }) => onComplete?.({ correct: true, score }))
    return () => { game.destroy(true); sceneRef.current = null }
  }, [])
  return sceneRef
}
```

### 4f · Game-over popup duplicated in all 3 Phaser GameScene files

The `endGame()` method in each GameScene builds the same popup: overlay → panel → title → score label → score value → Play Again button with hover states. The structure is near-identical in MultiplesCatcher, Balance, and FeedTheNumbers (FeedTheNumbers adds one extra line for the hungry numbers display).

A shared Phaser utility function `buildGameOverPanel(scene, { title, scoreLabel, score, onRestart, extras })` would eliminate ~40 lines per scene (120 lines total), and ensure visual consistency as the spec evolves.

### 4g · Timer `onTick` pattern duplicated

All three Phaser games implement the same `onTick()` method: decrement `timeLeft`, update timer text, turn red at ≤ 10 seconds, call `endGame()` at 0. This could also be encapsulated in the shared utility or base class.

---

## 5 · Phaser+React Integration

### ✅ Correct
- All three Phaser wrappers correctly destroy the game on unmount
- `sceneReady` event is properly used to capture the scene ref before touch button calls
- Registry pattern for `level` and `speed` is consistent

### ⚠️ `onComplete` result is silently discarded in `App.jsx`

```js
onComplete={(result) => console.log('Game complete', result)}
```

This `console.log` placeholder on line 256 means game completion data (score, correct flag) is never surfaced to the user. If a score summary, high score, or post-game screen is ever added, this needs to be wired up. It's a development stub that should be tracked.

### ⚠️ FeedTheNumbers missing `sceneRef` cleanup

`FeedTheNumbers/index.jsx` never declares a `sceneRef` — which is fine since the game has no external touch controls. However, it also doesn't set `sceneRef.current = null` on cleanup (because there is none). This is consistent with its design, but if touch controls are ever added, the missing ref pattern will need attention. The other wrappers' cleanup is a useful template.

### ℹ️ Two architectures coexist (Phaser vs. pure React SVG)

MultiplesCatcher, Balance, and FeedTheNumbers use Phaser. NewWays, LadderToInfinity, and NumberLabyrinth are pure React + SVG. This is architecturally intentional and both patterns work well. Worth keeping documented (CLAUDE.md could note which games fall into each category) to help when onboarding the next game.

---

## 6 · Performance

### ⚠️ `getFieldNumbers` is a heavy synchronous computation (NumberLabyrinth)

`getFieldNumbers()` in `NumberLabyrinth/index.jsx` runs a path-generation loop with up to 500 × multiple-path-length attempts, followed by a board-filling algorithm, all synchronously on mount via `useState(() => ...)`. For level 5 (8×8 board), this reliably runs in < 50ms on desktop, but on low-end mobile/tablet devices (the primary audience) it may cause a 100–200ms frame drop on game start.

**Mitigation**: Defer to `useEffect` with a loading state, or move to a Web Worker if it becomes noticeable on target devices.

### ✅ Phaser memory management is correct
All Phaser games properly destroy graphics and tween objects in their `onComplete` callbacks. The `game.destroy(true)` call in the React cleanup removes the canvas element. No leaks observed.

### ⚠️ App.jsx: inline `onMouseEnter`/`onMouseLeave` for hover color

The "Start New" button in `App.jsx` (lines 238–240) uses inline event handlers to swap `backgroundColor` inline styles for hover. This is an anti-pattern in React — it bypasses the virtual DOM, triggers direct DOM mutations, and can cause subtle issues. It should use Tailwind hover utilities or a CSS variable instead.

---

## 7 · Quick Reference: Priority List

| Priority | Issue | File(s) | Effort |
|---|---|---|---|
| 🔴 High | `findRepeatSeq` duplicated | NewWays, LadderToInfinity | ~15 min |
| 🔴 High | `SPEED_DIAL`, `GAME_W/H`, `MOVE_COOLDOWN`, `FAST_SPEED` duplicated | 3 GameScene files | ~20 min |
| 🔴 High | LadderToInfinity re-implements TouchButton inline | LadderToInfinity/index.jsx | ~30 min |
| 🟡 Medium | NumberLabyrinth bypasses PathLayer | NumberLabyrinth/index.jsx | ~1 h |
| 🟡 Medium | `usePhaserGame` hook to remove wrapper boilerplate | 3 index.jsx files | ~1 h |
| 🟡 Medium | Shared `buildGameOverPanel` Phaser utility | 3 GameScene files | ~1.5 h |
| 🟡 Medium | Hardcoded colors in Balance and NumberLabyrinth | Balance/GameScene.js, NumberLabyrinth/index.jsx | ~30 min |
| 🟡 Medium | App.jsx hardcoded `#3498db`/`#2980b9` + inline hover | App.jsx | ~15 min |
| 🟢 Low | Orphaned en.json keys | en.json | ~5 min |
| 🟢 Low | `onComplete` placeholder `console.log` | App.jsx | Track for future |
| 🟢 Low | NumberLabyrinth heavy computation at mount | NumberLabyrinth/index.jsx | ~1 h |
