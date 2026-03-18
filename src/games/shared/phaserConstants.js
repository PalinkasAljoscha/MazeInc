/**
 * Shared layout and physics constants for all Phaser-based games.
 *
 * Import only what each game needs — unused constants are tree-shaken.
 */

/** Internal canvas width (px) — all Phaser games use the same resolution. */
export const GAME_W = 480

/** Internal canvas height (px). */
export const GAME_H = 680

/**
 * Speed multiplier table indexed by the speed dial value (1–5).
 * Index 0 is unused; dial 4 reproduces the original design speed.
 *
 * Usage:  this.fallSpeed = SPEED_BASE * SPEED_DIAL[speed]
 */
export const SPEED_DIAL = [0, 0.5, 0.7, 0.85, 1.0, 1.3]

/**
 * Fast-drop speed (px/sec) applied when the player holds the drop key
 * or taps the Drop/Space control. Shared by all falling-piece games.
 */
export const FAST_SPEED = 600

/**
 * Minimum milliseconds between successive moves when a direction key is held.
 * Prevents too-rapid auto-repeat on keyboard hold.
 */
export const MOVE_COOLDOWN = 150
