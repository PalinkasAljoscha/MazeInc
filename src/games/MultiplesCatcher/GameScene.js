import Phaser from 'phaser'
import { palette, phaser as C } from '../../theme.js'

// ── constants ──────────────────────────────────────────────────────────────
const GAME_W = 480
const GAME_H = 680
const SLOT_VALUES = [2, 3, 4, 5, 6, 7]   // divisors shown in bottom slots
const NUM_SLOTS = SLOT_VALUES.length       // 6
const SLOT_H = 90                          // height of the bottom slot row
const HEADER_H = 60                        // top bar for score + timer
const BALL_R = 32                          // ball radius
const FALL_SPEED = 140                    // px/sec normal
const FAST_SPEED = 600                     // px/sec when space / drop held
const MOVE_COOLDOWN = 150                  // ms between successive moves on hold
const GAME_DURATION = 60                   // seconds
const MAX_BALL_NUMBER = 50                 // upper bound for numbers on balls
const MIN_BALL_NUMBER = 9                 // lower bound for numbers on balls
const BALLS_PER_SLOT = 2                   // multiples per slot in each bag cycle (cycle length = NUM_SLOTS × BALLS_PER_SLOT)

// ── helpers ────────────────────────────────────────────────────────────────

// Returns a random multiple m of `divisor` such that MIN_BALL_NUMBER ≤ M ≤ MAX_BALL_NUMBER and ≠ exclude.
function multipleOf(divisor, exclude) {
  const candidates = []
  for (let m = 1; m * divisor <= MAX_BALL_NUMBER; m++) {
    const val = m * divisor
    if (val !== exclude && val >= MIN_BALL_NUMBER) candidates.push(val)
  }
  // Fallback: if divisor itself exceeds the bound, just return it
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

    this.score = 0
    this.timeLeft = GAME_DURATION
    this.isGameOver = false
    this.ball = null
    this.isFast = false
    this.lastBallValue = null  // excluded from next ball to prevent repeats
    this.ballBag = []          // shuffled queue; refilled every NUM_SLOTS×BALLS_PER_SLOT balls

    // ── background ──
    this.add.rectangle(W / 2, H / 2, W, H, C.gameBg)

    // ── header ──
    this.add.rectangle(W / 2, HEADER_H / 2, W, HEADER_H, C.gameHeader)

    this.scoreText = this.add.text(16, HEADER_H / 2, 'Score: 0', {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial',
      color: palette.scoreYellow,
    }).setOrigin(0, 0.5)

    this.timerText = this.add.text(W - 16, HEADER_H / 2, '60', {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial',
      color: palette.timerLight,
    }).setOrigin(1, 0.5)

    this.add.text(W / 2, HEADER_H / 2, '⏱', {
      fontSize: '22px',
    }).setOrigin(0.5).setX(W - 52)

    // ── divider ──
    const div = this.add.graphics()
    div.lineStyle(2, C.divider, 1)
    div.lineBetween(0, HEADER_H, W, HEADER_H)

    // ── slot row ──
    const slotW = W / NUM_SLOTS
    const slotY = H - SLOT_H

    // Slot background strip
    this.add.rectangle(W / 2, H - SLOT_H / 2, W, SLOT_H, C.slotStrip)

    for (let i = 0; i < NUM_SLOTS; i++) {
      const cx = i * slotW + slotW / 2
      const cy = H - SLOT_H / 2

      // Slot coloured tile
      const g = this.add.graphics()
      g.fillStyle(C.slotColors[i], 0.85)
      g.fillRoundedRect(i * slotW + 4, slotY + 4, slotW - 8, SLOT_H - 8, 10)

      // Slot number
      this.add.text(cx, cy, String(SLOT_VALUES[i]), {
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

    // ── "×" label above each slot (hint line) ──
    const hintY = slotY - 14
    this.add.text(W / 2, hintY, '— drop the ball in the right slot —', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: palette.hintGray,
    }).setOrigin(0.5)

    // ── keyboard ──
    this.cursors = this.input.keyboard.createCursorKeys()
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // For smooth hold-to-move
    this.lastMoveTime = 0

    // ── timer event ──
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onTick,
      callbackScope: this,
      repeat: GAME_DURATION - 1,
    })

    // ── expose control methods to React (touch buttons) ──
    this.game.events.emit('sceneReady', this)

    // ── spawn first ball ──
    this.spawnBall()
  }

  // ── ball spawning ─────────────────────────────────────────────────────────
  spawnBall() {
    if (this.isGameOver) return

    const W = GAME_W
    const slotW = W / NUM_SLOTS

    // Start in a random column
    this.ballColumn = Math.floor(Math.random() * NUM_SLOTS)
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
  }

  // ── update loop ───────────────────────────────────────────────────────────
  update(time, delta) {
    if (this.isGameOver || !this.ball) return

    const W = GAME_W
    const slotW = W / NUM_SLOTS
    const slotTop = GAME_H - SLOT_H

    // ── horizontal movement (keyboard) ──
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

    // ── fast drop (space) ──
    if (this.spaceKey.isDown) {
      this.isFast = true
    }

    // ── fall ──
    const speed = this.isFast ? FAST_SPEED : FALL_SPEED
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
    for (let i = 0; i < NUM_SLOTS; i++) {
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
    const value = multipleOf(SLOT_VALUES[slotIndex], this.lastBallValue)
    this.lastBallValue = value
    return value
  }

  // ── called from React touch buttons ──────────────────────────────────────
  moveBall(dir) {
    if (!this.ball || this.isGameOver) return
    this.ballColumn = Phaser.Math.Clamp(this.ballColumn + dir, 0, NUM_SLOTS - 1)
  }

  dropBall() {
    if (!this.ball || this.isGameOver) return
    this.isFast = true
  }

  // ── landing ───────────────────────────────────────────────────────────────
  landBall() {
    const slotValue = SLOT_VALUES[this.ballColumn]
    const ballValue = this.ball.value
    const correct = ballValue % slotValue === 0

    const W = GAME_W
    const slotW = W / NUM_SLOTS
    const landX = this.ballColumn * slotW + slotW / 2
    const landY = GAME_H - SLOT_H / 2

    // Destroy falling ball
    this.ball.bg.destroy()
    this.ball.numText.destroy()
    this.ball = null

    if (correct) {
      this.score++
      this.scoreText.setText('Score: ' + this.score)
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

    // ✓ tick + equation label
    const label = this.add.text(x, y - 65, `${ballVal} ÷ ${slotVal} = ${ballVal / slotVal} ✓`, {
      fontSize: '18px',
      fontFamily: 'Arial Black, Arial',
      color: palette.correctGreen,
    }).setOrigin(0.5)
    this.tweens.add({
      targets: label,
      y: label.y - 40,
      alpha: 0,
      duration: 800,
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

    // ✗ label
    const label = this.add.text(x, y - 65, `${ballVal} ÷ ${slotVal}  ✗`, {
      fontSize: '18px',
      fontFamily: 'Arial Black, Arial',
      color: palette.wrongRed,
    }).setOrigin(0.5)
    this.tweens.add({
      targets: label,
      y: label.y - 40,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    })

    // Camera shake
    this.cameras.main.shake(220, 0.008)
  }

  // ── timer tick ────────────────────────────────────────────────────────────
  onTick() {
    this.timeLeft--
    this.timerText.setText(String(this.timeLeft))

    // Turn timer red when time is short
    if (this.timeLeft <= 10) {
      this.timerText.setStyle({ color: palette.wrongRed })
    }

    if (this.timeLeft <= 0) {
      this.endGame()
    }
  }

  // ── game over ─────────────────────────────────────────────────────────────
  endGame() {
    if (this.isGameOver) return
    this.isGameOver = true

    // Stop timer
    if (this.timerEvent) this.timerEvent.remove()

    // Remove the falling ball if present
    if (this.ball) {
      this.ball.bg.destroy()
      this.ball.numText.destroy()
      this.ball = null
    }

    const W = GAME_W
    const H = GAME_H

    // Dark overlay
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, C.overlayBlack, 0.75)

    // Panel
    const panel = this.add.graphics()
    panel.fillStyle(C.gameHeader, 1)
    panel.fillRoundedRect(W / 2 - 160, H / 2 - 140, 320, 280, 24)

    this.add.text(W / 2, H / 2 - 95, 'Time\'s up! 🎉', {
      fontSize: '30px',
      fontFamily: 'Arial Black, Arial',
      color: palette.scoreYellow,
    }).setOrigin(0.5)

    this.add.text(W / 2, H / 2 - 30, 'Your score:', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: palette.silverGray,
    }).setOrigin(0.5)

    this.add.text(W / 2, H / 2 + 30, String(this.score), {
      fontSize: '72px',
      fontFamily: 'Arial Black, Arial',
      color: palette.correctGreen,
    }).setOrigin(0.5)

    // Play Again button
    const btnBg = this.add.graphics()
    btnBg.fillStyle(C.btnBlue, 1)
    btnBg.fillRoundedRect(W / 2 - 110, H / 2 + 90, 220, 56, 16)

    const btnText = this.add.text(W / 2, H / 2 + 118, 'Play Again', {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial',
      color: palette.white,
    }).setOrigin(0.5)

    // Make the button interactive
    const btnZone = this.add.zone(W / 2, H / 2 + 118, 220, 56).setInteractive()
    btnZone.on('pointerdown', () => {
      this.scene.restart()
    })
    btnZone.on('pointerover', () => {
      btnBg.clear()
      btnBg.fillStyle(C.btnBlueHover, 1)
      btnBg.fillRoundedRect(W / 2 - 110, H / 2 + 90, 220, 56, 16)
    })
    btnZone.on('pointerout', () => {
      btnBg.clear()
      btnBg.fillStyle(C.btnBlue, 1)
      btnBg.fillRoundedRect(W / 2 - 110, H / 2 + 90, 220, 56, 16)
    })

    // Notify React
    this.game.events.emit('gameComplete', { score: this.score })
  }
}
