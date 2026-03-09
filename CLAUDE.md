# Kids Math Learning App — Project Guide

## Current Focus

Building animated math games as a webapp. No framework or app shell yet —
just standalone games that run in the browser. The goal is to learn what works
visually and technically before designing any broader structure.

## Target Audience

Primary school children, roughly 6–10 years old.

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

## Game Design Principles

- **Child-friendly** — large targets, clear readable fonts, bright but not overwhelming colors
- **Immediate feedback** — clear visual/animated effect on gaining or losing points
- **Mobile and tablet ready** — design for touch input from the start
- **Stateless** — no results stored; each session starts fresh

---

## Planned Games

### 1. Multiples Catcher (Tetris-style)
game optic and flow is tetris like:
on the bottom line there are 4 - 8 small integers as slots. The slots fill the whole bottom line.
From the top some balls with numbers on them fall down, one at a time.
the player can move the ball left or right (arrow keys) and let it drop (space) or just get to the bottom. once the ball arrives at 
bottom it will always end up in one of the slots. 
If the number on the ball is a multiple of the number of the slot in fell into, player gets a point. 
Game ends after 1 minute and final points are shown then. 

### 2. TBD
To be defined after the first game is built and tested.

---

## Phaser + React Integration Pattern

Each game is a React component that initialises a Phaser game instance on mount
and destroys it on unmount. The React component receives a `difficulty` prop and
calls an `onComplete` callback when the game ends — this keeps the door open for
a future framework layer without requiring one now.

```jsx
// src/games/NumberCatcher/index.jsx
export default function NumberCatcher({ difficulty = 1, onComplete }) {
  // mounts Phaser into a <div ref> on load
  // calls onComplete({ correct: bool, timeMs: number }) when game ends
}
```

Game logic lives entirely inside Phaser scenes — not in React state.

---

## Feedback Effects (Phaser)

Both games should include simple effects for outcomes:
- **Correct** — green flash, particle burst, cheerful sound (optional)
- **Wrong** — red shake, brief slow-down or penalty

Keep effects short (under 1 second) so they don't interrupt the game flow.

---

## Notes / Open Decisions

- Exact mechanic for game 1 to be refined during build
- Whether to add sound effects (needs user gesture on mobile to unlock audio)
- Framework / app shell to be designed after games 1–2 are complete

*Update this file at the end of each session with decisions made.*