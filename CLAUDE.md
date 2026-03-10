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
  games/
    MultiplesCatcher/
      index.jsx                    # React wrapper + on-screen touch buttons
      GameScene.js                 # Phaser scene — all game logic
```

---

## Coding Rules

- **Use Color theme** — Never hardcode color values in components or Phaser scenes. Always import from src/theme.js. If needed add colors there.
- **t() function for visible text** — Never hardcode visible text strings in components or Phaser scenes. Always use the t() translation function. Add new strings to all locale files when introducing new UI text.

---

## Phaser + React Integration Pattern

- React wrapper creates `Phaser.Game` on mount (scale mode `FIT`, internal res 480×680), destroys on unmount.
- Scene emits `sceneReady` → React stores scene ref to forward touch-button calls.
- Scene emits `gameComplete` → React calls `onComplete({ correct, score })`.
- Touch buttons call `scene.moveBall(dir)` / `scene.dropBall()` directly.
- Game logic lives entirely inside Phaser scenes — not in React state.

Each game exports:
```jsx
export default function MultipleCatcher({ difficulty, onComplete }) {
  const level = difficulty ?? meta.minLevel;
  const params = LEVELS[level];
  ...
}
export const meta = { id, title, topics, minLevel, maxLevel }
```

---

## Game 1 — Multiples Catcher (built ✓)

6 coloured slots at the bottom (`[2, 3, 4, 5, 6, 7]`). Balls fall one at a time; player steers with ← → (keyboard or touch) and drops with Space / ↓ button. A ball scores if its number is a multiple of the slot it lands in.

**Ball generation** (`GameScene.js` constants):
- `MIN_BALL_NUMBER = 9`, `MAX_BALL_NUMBER = 50` — range of values on balls
- `BALLS_PER_SLOT = 2` — bag cycle size; every `NUM_SLOTS × BALLS_PER_SLOT` (12) balls, each slot gets exactly 2 multiples
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
- Difficulty progression not yet designed

*Update this file at the end of each session with decisions made.*
