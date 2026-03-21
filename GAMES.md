# Maze Inc. — Game Descriptions

Each entry covers context that cannot be inferred from the code alone: the design idea, the math it trains, what the player needs to already know, the emotional tone, and a human-readable description suitable for display to interested users.

---

## Multiples Catcher 🎯

**Idea:** Numbered balls fall from the top of the screen. A row of slots at the bottom each show a divisor. The player steers the falling ball left or right to land it in a slot whose number divides evenly into the ball's number. Wrong slots score nothing; correct ones score a point. A new ball appears immediately. The game lasts 60 seconds.

**Math concepts:** Divisibility, multiples, multiplication tables

**Skill prerequisite:** Recognise on sight whether a number is a multiple of a given divisor — fast enough to react before the ball lands. Knowing multiplication tables by heart makes this much easier at higher levels.

**Mood:** Fast, reactive, arcade. Pulse rises with ball speed. Rewards automaticity over deliberate calculation.

**Description:** A classic arcade reflex game with a multiplication twist. Balls rain down carrying numbers; you slide them into the right slot before they hit the floor. Because the judgment needed is purely "is this a multiple of that?", the game scales naturally: small multipliers and low numbers suit early learners, while high-speed rounds with large primes challenge adults. Great for drilling times-table fluency under time pressure.

---

## Balance ⚖️

**Idea:** Numbered cubes fall one at a time from the top. The player places each cube into one of eight columns arranged in two groups of four (left side and right side). Running totals for each column and each side are shown below the grid. The goal is to keep the left-side total and right-side total as close as possible at the end of the 90-second round. At higher difficulty levels, negative numbers appear.

**Math concepts:** Addition of integers, column sums, the concept of balance/equality, negative numbers (levels 3–5).

**Skill prerequisite:** Confident mental addition of small positive numbers (all levels). Understanding that negative numbers reduce a total (levels 3+).

**Mood:** Strategic and deliberate. The player has time to think before each cube lands. More contemplative than reactive — closer to a board game than an arcade game.

**Description:** Numbers fall and you must distribute them wisely between left and right to keep the scales level. The two-sided grid makes the balancing act visual and concrete, which can help younger players grasp why adding to one side tips the balance. The introduction of negative cubes at higher levels opens a natural discussion about how negative numbers "undo" positive ones.

---

## Feed the Numbers 🍽️

**Idea:** Quickly find numbers which added together result in a number with repeated digits. It requires a familiarity with addition and digits without explicitly solving addition problems.

**Math concepts:** Addition, decimal system

**Skill prerequisite:** familiarity with addition in larger number above 100.

**Mood:** fast reaction, laid back, since you can just try things, there are no errors.

**Description:** Numbers pass by and you need to spot quickly if added to another number this will result in a number with repeating digits. Hence you need some quick familiarity in addition of numbers above 100 without necessarily finding exact solutions quickly. The game is forgiving as you cannot really make errors or lose the game. 

---

## New Ways 🗺️

**Idea:** The player navigates from the bottom-left corner to the top-right corner of a square grid using directional controls. The twist: the game tracks the full sequence of moves (e.g. RRUURULR…) and rejects any move that would make the sequence contain a repeated block — that is, any sub-sequence of the form XX where the same string appears twice in a row. The player must reach the goal via a path whose move-sequence is square-free. Because the grid allows four move directions, such paths are plentiful, and the puzzle becomes: can you find one that leads all the way to the goal?

**Math concepts:** Square-free sequences; combinatorics of grid paths; the distinction between a path that visits no cell twice (a simple path) and a move-sequence that contains no repeated block.

**Skill prerequisite:** Spatial navigation on a grid; willingness to experiment and backtrack. No arithmetic required.

**Mood:** Exploratory and puzzle-like. Quiet concentration. Moments of surprise when an apparently reasonable move is blocked. Can feel meditative.

**Description:** Getting from A to B sounds simple — until you discover that retracing any pattern, even a hidden one, is forbidden. With some patience you probably always reach the goal. The constraint is unintuitive it's annoying but also intriguing to overcome. In 1906 the Norwegian mathematician Axel Thue proved that arbitrarily long square-free sequences exist over an alphabet of just three symbols. New Ways puts this idea into a playable form: your sequence of moves must never contain a repeated block, and you still have to reach the far corner of the board.The game 'Ladder to Infinity' is a much more constrained and hence difficult version. 

---

## Ladder to Infinity 🪜

**Idea:** The player climbs an infinite vertical strip (2 or 3 columns wide) using exactly three moves: Up, Left, Right. The same square-free rule applies as in New Ways: a move is rejected if it would cause the total move-sequence to contain a repeated block XX. The score is the maximum height reached. The strip extends forever — and the key question the game poses is: can you keep climbing indefinitely, or must you eventually repeat yourself? Crucially, Thue's theorem answers this: because the available alphabet has exactly three symbols {U, L, R}, arbitrarily long square-free sequences are guaranteed to exist, so it is always theoretically possible to climb without limit.

**Math concepts:** Square-free sequences over a three-symbol alphabet; infinite combinatorics; Thue's 1906 theorem as the mathematical backbone of the game's possibility space.

**Skill prerequisite:** Same spatial reasoning as New Ways, but with a longer planning horizon. No arithmetic required. Older players may appreciate knowing the mathematical guarantee underneath the game.

**Mood:** Meditative and discovery-oriented. Alternates between flow and the mild frustration of a blocked move. Carries a genuine "I wonder if this is even possible" quality — made richer by knowing that mathematics says it is.

**Description:** Can you climb forever without ever repeating yourself? Theoretically you can, but you will realize that it is not suiting our way of thinking and very difficult to realize. Hence you cannot win the game, you can just try to get as high as posisble with as few undos as you can. In 1906, Axel Thue proved that over an alphabet of three symbols, arbitrarily long square-free sequences exist: sequences in which no block of moves ever appears twice in a row. Ladder to Infinity has exactly three available moves — Up, Left, Right — so Thue's result guarantees that an infinite non-repeating climb is always possible in principle. The challenge is finding it. 

---

## Number Labyrinth 🔢

**Idea:** A grid of numbers is displayed. The player must find a path from the start cell (top-left) to the goal cell (bottom-right) such that each step moves to an adjacent cell with a strictly larger number. The board is generated so that exactly one or very few such paths exist, giving it a maze-like quality. Board sizes range from 4×4 to 8×8; number ranges grow with level (up to 999 at level 5).

**Math concepts:** The greater-than relation on natural numbers; ordering; scanning and comparing.

**Skill prerequisite:** Reliably judge which of two natural numbers is larger, up to the range of the chosen level (100 for small boards, up to 999 for large ones). Recognise this fast enough to scan a grid efficiently.

**Mood:** Concentrated and calm. The pace is entirely self-directed — no timer, no pressure. Close to a logic puzzle or a newspaper number maze.

**Description:** You need to scan a board filled with numbers and trace a path from start to goal where each step climbs to a strictly larger neighbour. Because only the greater-than relation between natural numbers is involved, small boards can be played by young children who are just learning to compare numbers, while large boards with three-digit values offer a real challenge at any age. The maze framing makes comparison feel like exploration rather than drill.

---

*Last updated: 2026-03-21*
