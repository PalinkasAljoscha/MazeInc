import Phaser from 'phaser'
import { palette, phaser as C } from '../../theme.js'
import i18n from '../../i18n.js'
import { GAME_W, GAME_H, SPEED_DIAL, FAST_SPEED, MOVE_COOLDOWN } from '../shared/phaserConstants.js'
import { buildGameOverPanel, createCountdownTimer } from '../shared/phaserUI.js'

// ── constants (level-independent) ─────────────────────────────────────────
const SLOT_H = 90                          // height of the bottom slot row
const HEADER_H = 60                        // top bar for score + timer
const BALL_R = 32                          // ball radius
const FALL_SPEED_BASE = 90               // px/sec at speed dial 4
const GAME_DURATION = 60                   // seconds
const BALLS_PER_SLOT = 2                   // multiples per slot in each bag cycle

// ── feedback display config ────────────────────────────────────────────────
// Base values are used during real play; DEMO_FEEDBACK_OVERRIDES are merged on
// top when isDemo is true (see create()).  All mode-specific UI tweaks live here
// rather than being scattered as ternaries through the rendering methods.
// This mirrors the LEVELS pattern: one config object read once in create().
const FEEDBACK_UI = {
  fontSize:        '18px',
  correctDuration: 800,   // ms the correct-equation label takes to fade out
  wrongDuration:   700,   // ms the wrong-equation label takes to fade out
}

const DEMO_FEEDBACK_OVERRIDES = {
  fontSize:        '32px',  // ≈180 % of base — easier to read as an illustration
  correctDuration: 4000,    // ≈500 % of base — stays on screen long enough to study
  wrongDuration:   3500,    // ≈500 % of base
}

// ── level config ───────────────────────────────────────────────────────────
const LEVELS = {
  2: { slotValues: [2, 3, 5, 6, 7, 9],          maxBall: 30,  minBall: 5  },
  3: { slotValues: [3, 4, 5, 7, 11, 12],         maxBall: 60,  minBall: 9  },
  4: { slotValues: [2, 3, 4, 5, 7, 8, 9, 13],    maxBall: 100, minBall: 15 },
}

// ── helpers ────────────────────────────────────────────────────────────────

// Returns a random multiple of `divisor` in [minBall, maxBall] that ≠ exclude.
function multipleOf(divisor, exclude, minBall, maxBall) {
  const candidates = []
  for (let m = 1; m * divisor <= maxBall; m++) {
    const val = m * divisor
    if (val !== exclude && val >= minBall) candidates.push(val)
  }
  // Fallback: if no candidates exist, just return the divisor itself
  if (candidates.length === 0) return divisor
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// ── scene ──────────────────────────────────────────────────────────────────
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  // ── create ───────────────────────────────────────────────────────────────
  create() {
    const W = GAME_W
    const H = GAME_H

    // ── read registry values (level, speed, demo) ──
    const level = this.registry.get('level') ?? 2
    const speed = this.registry.get('speed') ?? 4
    this.isDemo     = this.registry.get('demo')  ?? false
    this.feedbackUI = this.isDemo
      ? { ...FEEDBACK_UI, ...DEMO_FEEDBACK_OVERRIDES }
      : FEEDBACK_UI
    this.fallSpeed  = FALL_SPEED_BASE * SPEED_DIAL[speed]
    const levelCfg = LEVELS[level] ?? LEVELS[2]
    this.slotValues = levelCfg.slotValues
    this.numSlots   = this.slotValues.length
    this.maxBall    = levelCfg.maxBall
    this.minBall    = Math.max(levelCfg.minBall, Math.max(...this.slotValues) + 1)

    this.score = 0
    this.isGameOver = false
    this.ball = null
    this.isFast = false
    this.lastBallValue = null  // excluded from next ball to prevent repeats
    this.ballBag = []          // shuffled queue; refilled every numSlots×BALLS_PER_SLOT balls

    // ── background ──
    this.add.rectangle(W / 2, H / 2, W, H, C.gameBg)

    // ── demo mode: owl mascot ─────────────────────────────────────────────────
    // Added right after the background (low z-order) so it stays behind all
    // game elements (header bar, slots, falling ball).
    // The owl sits in the centre of the upper half of the canvas and drifts
    // slowly left/right in a random-walk style using chained tweens.
    if (this.isDemo) {
      this._demoOwl = this.add.text(W / 2, H / 4, '🦉', {
        fontSize: '52px',
      }).setOrigin(0.5).setDepth(10)  // above balls (depth 0) and all other elements

      // Each tween picks a new random x within ±W/6 of centre, moves there at
      // a leisurely pace (~40 px/s), then immediately chains the next step.
      const driftOwl = () => {
        const targetX = W / 2 + (Math.random() - 0.5) * (W / 3)
        const dist    = Math.abs(targetX - this._demoOwl.x)
        const duration = Math.max(800, (dist / 40) * 1000)  // min 0.8 s per step

        this.tweens.add({
          targets: this._demoOwl,
          x: targetX,
          duration,
          ease: 'Sine.easeInOut',
          onComplete: driftOwl,
        })
      }
      driftOwl()
    }

    // ── header ──
    this.add.rectangle(W / 2, HEADER_H / 2, W, HEADER_H, C.gameHeader)

    this.scoreText = this.add.text(16, HEADER_H / 2, i18n.t('multiplesCatcher.hud.score', { score: 0 }), {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial',
      color: palette.scoreYellow,
    }).setOrigin(0, 0.5)

    this.timerText = this.add.text(W - 16, HEADER_H / 2, '60', {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial',
      color: palette.timerLight,
    }).setOrigin(1, 0.5)

    this.clockIcon = this.add.text(W - 78, HEADER_H / 2, '⏱', {
      fontSize: '22px',
    }).setOrigin(0.5)

    // ── divider ──
    const div = this.add.graphics()
    div.lineStyle(2, C.divider, 1)
    div.lineBetween(0, HEADER_H, W, HEADER_H)

    // ── slot row ──
    const slotW = W / this.numSlots
    const slotY = H - SLOT_H

    // Slot background strip
    this.add.rectangle(W / 2, H - SLOT_H / 2, W, SLOT_H, C.slotStrip)

    for (let i = 0; i < this.numSlots; i++) {
      const cx = i * slotW + slotW / 2
      const cy = H - SLOT_H / 2

      // Slot coloured tile
      const g = this.add.graphics()
      g.fillStyle(C.slotColors[i], 0.85)
      g.fillRoundedRect(i * slotW + 4, slotY + 4, slotW - 8, SLOT_H - 8, 10)

      // Slot number
      this.add.text(cx, cy, String(this.slotValues[i]), {
        fontSize: '38px',
        fontFamily: 'Arial Black, Arial',
        color: palette.white,
      }).setOrigin(0.5)

      // Divider between slots
      if (i > 0) {
        const dg = this.add.graphics()
        dg.lineStyle(2, C.gameBg, 1)
        dg.lineBetween(i * slotW, slotY, i * slotW, H)
      }
    }

    // ── hint line above slot row ──
    const hintY = slotY - 14
    this.add.text(W / 2, hintY, i18n.t('multiplesCatcher.hud.hint'), {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: palette.hintGray,
    }).setOrigin(0.5)

    // ── keyboard ──
    this.cursors = this.input.keyboard.createCursorKeys()
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // For smooth hold-to-move
    this.lastMoveTime = 0

    // ── expose control methods to React (touch buttons) ──
    this.game.events.emit('sceneReady', this)

    if (this.isDemo) {
      // Demo mode: hide the timer / clock icon (the canvas DEMO label serves
      // as the only indicator), then hand off to the demo script.
      this.timerText.setText('')
      this.clockIcon.setVisible(false)
      this._startDemo()
    } else {
      // Real game: start the countdown and spawn the first ball.
      this.timerEvent = createCountdownTimer(this, GAME_DURATION, this.timerText)
      this.spawnBall()
    }
  }

  // ── ball spawning ─────────────────────────────────────────────────────────
  spawnBall() {
    if (this.isGameOver) return

    const W = GAME_W
    const slotW = W / this.numSlots

    // Start in a random column
    this.ballColumn = Math.floor(Math.random() * this.numSlots)
    const value = this._nextBallValue()
    this.isFast = false

    // Ball container: circle + number
    const cx = this.ballColumn * slotW + slotW / 2
    const startY = HEADER_H + BALL_R + 10

    // Circle graphic
    const bg = this.add.graphics()
    bg.fillStyle(C.ballFill, 1)
    bg.lineStyle(4, C.ballBorder, 1)
    bg.fillCircle(0, 0, BALL_R)
    bg.strokeCircle(0, 0, BALL_R)
    bg.setPosition(cx, startY)

    // Number text
    const numText = this.add.text(cx, startY, String(value), {
      fontSize: value >= 10 ? '26px' : '32px',
      fontFamily: 'Arial Black, Arial',
      color: palette.white,
    }).setOrigin(0.5)

    this.ball = { bg, numText, value, y: startY }
    this.ballY = startY

    // In demo mode, schedule the AI steering after the ball has been on screen
    // long enough for the player to read its number (≈1.4 s).
    if (this.isDemo) {
      this.time.delayedCall(1400, this._demoMove, [], this)
    }
  }

  // ── update loop ───────────────────────────────────────────────────────────
  update(time, delta) {
    if (this.isGameOver || !this.ball) return

    const W = GAME_W
    const slotW = W / this.numSlots
    const slotTop = GAME_H - SLOT_H

    // ── player input (keyboard) — suppressed in demo mode ──
    if (!this.isDemo) {
      const canMove = time - this.lastMoveTime > MOVE_COOLDOWN
      if (canMove) {
        if (this.cursors.left.isDown) {
          this.moveBall(-1)
          this.lastMoveTime = time
        } else if (this.cursors.right.isDown) {
          this.moveBall(1)
          this.lastMoveTime = time
        }
      }
      if (this.spaceKey.isDown) {
        this.isFast = true
      }
    }

    // ── fall ──
    const speed = this.isFast ? FAST_SPEED : this.fallSpeed
    this.ballY += (speed * delta) / 1000

    // Sync graphics position
    const cx = this.ballColumn * slotW + slotW / 2
    this.ball.bg.setPosition(cx, this.ballY)
    this.ball.numText.setPosition(cx, this.ballY)

    // ── land ──
    if (this.ballY + BALL_R >= slotTop) {
      this.landBall()
    }
  }

  // ── ball number generation ────────────────────────────────────────────────

  // Refills the bag with BALLS_PER_SLOT copies of each slot index, then shuffles.
  // This guarantees every slot receives exactly BALLS_PER_SLOT multiples per cycle.
  _refillBag() {
    const bag = []
    for (let i = 0; i < this.numSlots; i++) {
      for (let j = 0; j < BALLS_PER_SLOT; j++) bag.push(i)
    }
    Phaser.Utils.Array.Shuffle(bag)
    this.ballBag = bag
  }

  // Draws the next slot index from the bag (refilling if empty), then returns a
  // random multiple of that slot's divisor that is ≠ the previous ball's value.
  _nextBallValue() {
    if (this.ballBag.length === 0) this._refillBag()
    const slotIndex = this.ballBag.pop()
    const value = multipleOf(this.slotValues[slotIndex], this.lastBallValue, this.minBall, this.maxBall)
    this.lastBallValue = value
    return value
  }

  // ── called from React touch buttons ──────────────────────────────────────
  moveBall(dir) {
    if (!this.ball || this.isGameOver) return
    this.ballColumn = Phaser.Math.Clamp(this.ballColumn + dir, 0, this.numSlots - 1)
  }

  dropBall() {
    if (!this.ball || this.isGameOver) return
    this.isFast = true
  }

  // ── landing ───────────────────────────────────────────────────────────────
  landBall() {
    const slotValue = this.slotValues[this.ballColumn]
    const ballValue = this.ball.value
    const correct = ballValue % slotValue === 0

    const W = GAME_W
    const slotW = W / this.numSlots
    const landX = this.ballColumn * slotW + slotW / 2
    const landY = GAME_H - SLOT_H / 2

    // Destroy falling ball
    this.ball.bg.destroy()
    this.ball.numText.destroy()
    this.ball = null

    if (correct) {
      this.score += slotValue
      this.scoreText.setText(i18n.t('multiplesCatcher.hud.score', { score: this.score }))
      this.showCorrect(landX, landY, ballValue, slotValue)
    } else {
      this.showWrong(landX, landY, ballValue, slotValue)
    }

    // Next ball after short pause
    this.time.delayedCall(600, this.spawnBall, [], this)
  }

  // ── feedback effects ──────────────────────────────────────────────────────
  showCorrect(x, y, ballVal, slotVal) {
    // Green burst
    const g = this.add.graphics()
    g.fillStyle(C.correctGreen, 0.8)
    g.fillCircle(x, y, 55)
    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 450,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    })

    // ✓ tick + equation label — clamp x so the text stays within the canvas
    // even when the ball landed in the leftmost or rightmost slot.
    const labelX = Phaser.Math.Clamp(x, 100, GAME_W - 100)
    const label = this.add.text(labelX, y - 65, i18n.t('multiplesCatcher.feedback.correct', { ballVal, slotVal, result: ballVal / slotVal }), {
      fontSize: this.feedbackUI.fontSize,
      fontFamily: 'Arial Black, Arial',
      color: palette.correctGreen,
    }).setOrigin(0.5)
    this.tweens.add({
      targets: label,
      y: label.y - 40,
      alpha: 0,
      duration: this.feedbackUI.correctDuration,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    })

    // Particle-like dots
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const dot = this.add.graphics()
      dot.fillStyle(C.scoreYellow, 1)
      dot.fillCircle(0, 0, 6)
      dot.setPosition(x, y)
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * 70,
        y: y + Math.sin(angle) * 70,
        alpha: 0,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      })
    }
  }

  showWrong(x, y, ballVal, slotVal) {
    // Red flash
    const g = this.add.graphics()
    g.fillStyle(C.wrongRed, 0.75)
    g.fillCircle(x, y, 55)
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 400,
      onComplete: () => g.destroy(),
    })

    // ✗ label — same clamping as showCorrect to prevent overflow on border slots
    const labelX = Phaser.Math.Clamp(x, 100, GAME_W - 100)
    const label = this.add.text(labelX, y - 65, i18n.t('multiplesCatcher.feedback.wrong', { ballVal, slotVal }), {
      fontSize: this.feedbackUI.fontSize,
      fontFamily: 'Arial Black, Arial',
      color: palette.wrongRed,
    }).setOrigin(0.5)
    this.tweens.add({
      targets: label,
      y: label.y - 40,
      alpha: 0,
      duration: this.feedbackUI.wrongDuration,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    })

    // Camera shake
    this.cameras.main.shake(220, 0.008)
  }

  // ── game over ─────────────────────────────────────────────────────────────
  endGame() {
    // Demo mode never creates a timer event, so endGame() should never be
    // called — but guard here as a safety net.
    if (this.isGameOver || this.isDemo) return
    this.isGameOver = true

    // Stop timer
    if (this.timerEvent) this.timerEvent.remove()

    // Remove the falling ball if present
    if (this.ball) {
      this.ball.bg.destroy()
      this.ball.numText.destroy()
      this.ball = null
    }

    buildGameOverPanel(this, {
      W: GAME_W, H: GAME_H,
      titleKey:      'multiplesCatcher.gameOver.title',
      scoreLabelKey: 'multiplesCatcher.gameOver.scoreLabel',
      score:         this.score,
      playAgainKey:  'multiplesCatcher.gameOver.playAgain',
      onRestart:     () => this.scene.restart(),
    })

    // Notify React
    this.game.events.emit('gameComplete', { score: this.score })
  }

  // ── Demo mode ──────────────────────────────────────────────────────────────
  //
  // Entry point: called once from create() when isDemo === true.
  // Spawns the first ball and lets spawnBall() drive the loop from that point
  // forward (spawnBall hooks back into _demoMove() after every ball appears).
  _startDemo() {
    this.spawnBall()
  }

  // Called automatically after each ball spawns in demo mode.
  // Steers the ball to the correct slot and drops it; the natural ball-landing
  // cycle then calls spawnBall() again, keeping the loop going indefinitely.
  _demoMove() {
    if (!this.ball) return

    // Find the slot with the highest divisor value that divides the ball's value
    // evenly. Using the highest divisor makes the demo more varied (the ball
    // travels across the canvas) and shows off the more impressive equations.
    // The bag system guarantees at least one correct slot always exists.
    const targetSlot = this.slotValues.reduce((best, v, i) => {
      if (this.ball.value % v !== 0) return best          // not a valid slot
      if (best === -1 || v > this.slotValues[best]) return i  // higher divisor wins
      return best
    }, -1)

    if (targetSlot === -1) {
      // Fallback (should not happen): drop wherever the ball currently is.
      this.isFast = true
      return
    }

    // ── Annotation hook ───────────────────────────────────────────────────────
    // Add game-specific demo visualisations here once the infrastructure is
    // ready.  Suggested additions (all local to this file — no shared helpers):
    //
    //   • Arrow from ball to correct slot:
    //       const W = GAME_W
    //       const slotW = W / this.numSlots
    //       const slotCx = targetSlot * slotW + slotW / 2
    //       const slotCy = GAME_H - SLOT_H / 2
    //       // draw a Phaser Graphics arrow, tween it in, store on this._demoArrow
    //       // destroy this._demoArrow at the top of the next _demoMove() call
    //
    //   • Floating equation label above the ball:
    //       const eq = `${this.ball.value} = ${this.slotValues[targetSlot]} × ${this.ball.value / this.slotValues[targetSlot]}`
    //       // add text at (ballCx, this.ballY - 50), tween alpha 0→1→0
    //
    //   • Pulsing highlight ring on the correct slot:
    //       // draw a circle at (slotCx, slotCy), scale/alpha tween loop
    //
    // Store every annotation object on `this` (e.g. this._demoArrow) so the
    // next call to _demoMove() can destroy old annotations before drawing new ones.
    // ─────────────────────────────────────────────────────────────────────────

    // Steer the ball one column at a time toward the target slot.
    const stepsNeeded  = targetSlot - this.ballColumn
    const dir          = stepsNeeded > 0 ? 1 : -1
    const totalMoves   = Math.abs(stepsNeeded)
    const MOVE_INTERVAL = 220  // ms between each column shift

    for (let i = 0; i < totalMoves; i++) {
      this.time.delayedCall(i * MOVE_INTERVAL, () => this.moveBall(dir), [], this)
    }

    // Drop after all lateral moves complete, plus a brief pause so the ball
    // is visibly positioned over the correct slot before falling.
    const dropDelay = totalMoves * MOVE_INTERVAL + 500
    this.time.delayedCall(dropDelay, () => { this.isFast = true }, [], this)
    // No need to schedule the next cycle here: spawnBall() is called by
    // landBall() (after a 600 ms pause) and spawnBall() schedules _demoMove().
  }
}
