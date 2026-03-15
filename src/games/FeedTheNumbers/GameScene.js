import Phaser from 'phaser'
import { palette, phaser as C } from '../../theme.js'
import i18n from '../../i18n.js'

// ── layout constants ──────────────────────────────────────────────────────────
const GAME_W = 480
const GAME_H = 680
const HEADER_H = 55
const BALL_R = 28
const PIPE_CX = 50
const PIPE_HALF_W = BALL_R + 8        // 36 — inner half-width of pipe tube

const STACK_SIZE = 2                  // number of balls visible in the pipe (1–4)
const HUNGRY_START_MIN = 50            // min starting value for each hungry number
const HUNGRY_START_MAX = 90           // max starting value for each hungry number

const STACK_TOP_Y = 205               // y center of topmost stack ball
const STACK_SPACING = 62              // vertical gap between stack ball centers
// stack y positions: 205, 267, 329, 391
const EXIT_Y = STACK_TOP_Y + (STACK_SIZE - 1) * STACK_SPACING  // 391

// ball appears just past the pipe exit opening
const EXIT_X_START = PIPE_CX + PIPE_HALF_W + BALL_R + 4  // 118

const HUNGRY_LEFT_X = 252
const HUNGRY_RIGHT_X = 404
const HUNGRY_Y = 112
const HUNGRY_RX = 76                  // ellipse half-width
const HUNGRY_RY = 46                  // ellipse half-height

const BALL_SPEED_RIGHT_BASE = 130     // px/sec at speed dial 4
const SPEED_DIAL = [0, 0.5, 0.7, 0.85, 1.0, 1.3]  // index = dial value 1–5
const BALL_SEND_SPEED = 500           // px/sec — upward when sent
const GAME_DURATION = 90
const SEND_BTN_Y = 515                // y-center of in-canvas Send button
const SEND_BTN_W = 390
const SEND_BTN_H = 56

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the next ball number.
 * v1: random 2–20, avoids last 4 values. Difficulty is reserved for future use.
 */
function get_next_ball_number(hungryNums, prevFourBalls, difficultyLevel) {  // eslint-disable-line no-unused-vars
  const used = new Set(prevFourBalls.filter((v) => v != null))
  let n
  do {
    n = Math.floor(Math.random() * 19) + 2  // 2–20
  } while (used.has(n))
  return n
}

/** Returns the max occurrence count of any single digit in n. */
function maxSameDigit(n) {
  const s = String(Math.abs(Math.floor(n)))
  if (s.length < 2) return 1
  const counts = {}
  for (const c of s) counts[c] = (counts[c] || 0) + 1
  return Math.max(...Object.values(counts))
}

/** Choose font size so the number fits inside the ball. */
function ballFontSize(val) {
  const len = String(val).length
  return len >= 3 ? '18px' : len === 2 ? '22px' : '26px'
}

/** Choose font size so the number fits inside the hungry ellipse. */
function hungryFontSize(val) {
  const len = String(val).length
  return len <= 3 ? '40px' : len === 4 ? '32px' : '26px'
}

// ── scene ─────────────────────────────────────────────────────────────────────
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  // ── create ──────────────────────────────────────────────────────────────────
  create() {
    const level = this.registry.get('level') ?? 2
    const speed = this.registry.get('speed') ?? 4
    this.level = level
    this.ballSpeedRight = BALL_SPEED_RIGHT_BASE * SPEED_DIAL[speed]
    this.score = 0
    this.timeLeft = GAME_DURATION
    this.isGameOver = false
    this.prevBallNumbers = []   // last ≤4 ball values, fed to get_next_ball_number
    this.stackBalls = []        // [{value, bg, txt}, …]  index 0 = top, last = exit
    this.movingBall = null      // {value, bg, txt, x, y, state:'right'|'up'}

    // Starting hungry numbers — small and distinct
    const h1 = Phaser.Math.Between(HUNGRY_START_MIN, HUNGRY_START_MAX)
    let h2
    do { h2 = Phaser.Math.Between(HUNGRY_START_MIN, HUNGRY_START_MAX) } while (h2 === h1)
    this.hungryLeft = h1
    this.hungryRight = h2

    this._buildScene()
    this._buildStack()

    // Space key to send
    this.input.keyboard.on('keydown-SPACE', () => this.sendBall())

    // Countdown timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onTick,
      callbackScope: this,
      repeat: GAME_DURATION - 1,
    })

    this.game.events.emit('sceneReady', this)
    this.time.delayedCall(600, this.spawnMovingBall, [], this)
  }

  // ── scene construction ───────────────────────────────────────────────────────
  _buildScene() {
    const W = GAME_W
    const H = GAME_H

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, C.gameBg)

    // Header bar
    this.add.rectangle(W / 2, HEADER_H / 2, W, HEADER_H, C.gameHeader)

    // Score
    this.scoreText = this.add.text(
      16, HEADER_H / 2,
      i18n.t('feedTheNumbers.hud.score', { score: 0 }),
      { fontSize: '24px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow }
    ).setOrigin(0, 0.5)

    // Timer
    this.timerText = this.add.text(
      W - 16, HEADER_H / 2, String(GAME_DURATION),
      { fontSize: '24px', fontFamily: 'Arial Black, Arial', color: palette.timerLight }
    ).setOrigin(1, 0.5)

    this.add.text(W - 78, HEADER_H / 2, '⏱', { fontSize: '20px' }).setOrigin(0.5)

    // Header divider
    const dg = this.add.graphics()
    dg.lineStyle(2, C.divider, 1)
    dg.lineBetween(0, HEADER_H, W, HEADER_H)

    // Pipe tube
    this._drawPipe()

    // Hungry ellipses (purple, matching sketch)
    const ELLIPSE_COLOR = C.slotColors[5]    // purple from palette
    const eg = this.add.graphics()
    eg.fillStyle(ELLIPSE_COLOR, 1)
    eg.fillEllipse(HUNGRY_LEFT_X, HUNGRY_Y, HUNGRY_RX * 2, HUNGRY_RY * 2)
    eg.fillEllipse(HUNGRY_RIGHT_X, HUNGRY_Y, HUNGRY_RX * 2, HUNGRY_RY * 2)
    eg.lineStyle(3, C.hungryBorder, 1)
    eg.strokeEllipse(HUNGRY_LEFT_X, HUNGRY_Y, HUNGRY_RX * 2, HUNGRY_RY * 2)
    eg.strokeEllipse(HUNGRY_RIGHT_X, HUNGRY_Y, HUNGRY_RX * 2, HUNGRY_RY * 2)

    // Hungry number texts (on top of ellipses)
    this.hungryLeftText = this.add.text(
      HUNGRY_LEFT_X, HUNGRY_Y, String(this.hungryLeft),
      { fontSize: '40px', fontFamily: 'Arial Black, Arial', color: palette.white }
    ).setOrigin(0.5)

    this.hungryRightText = this.add.text(
      HUNGRY_RIGHT_X, HUNGRY_Y, String(this.hungryRight),
      { fontSize: '40px', fontFamily: 'Arial Black, Arial', color: palette.white }
    ).setOrigin(0.5)

    // Hint below ellipses
    this.add.text(
      W / 2, HUNGRY_Y + HUNGRY_RY + 16,
      i18n.t('feedTheNumbers.hud.hint'),
      { fontSize: '12px', fontFamily: 'Arial, sans-serif', color: palette.hintGray }
    ).setOrigin(0.5)

    // In-canvas Send button (amber, centered below play area)
    const bx = W / 2
    const by = SEND_BTN_Y
    this.sendBtnBg = this.add.graphics()
    this.sendBtnBg.fillStyle(C.btnAmber, 1)
    this.sendBtnBg.fillRoundedRect(bx - SEND_BTN_W / 2, by - SEND_BTN_H / 2, SEND_BTN_W, SEND_BTN_H, 20)

    this.add.text(bx, by, i18n.t('feedTheNumbers.controls.send'), {
      fontSize: '26px', fontFamily: 'Arial Black, Arial', color: palette.white,
    }).setOrigin(0.5)

    this.sendBtnZone = this.add.zone(bx, by, SEND_BTN_W, SEND_BTN_H).setInteractive()
    this.sendBtnZone.on('pointerdown', () => this.sendBall())
    this.sendBtnZone.on('pointerover', () => {
      this.sendBtnBg.clear()
      this.sendBtnBg.fillStyle(C.btnAmberHover, 1)
      this.sendBtnBg.fillRoundedRect(bx - SEND_BTN_W / 2, by - SEND_BTN_H / 2, SEND_BTN_W, SEND_BTN_H, 20)
    })
    this.sendBtnZone.on('pointerout', () => {
      this.sendBtnBg.clear()
      this.sendBtnBg.fillStyle(C.btnAmber, 1)
      this.sendBtnBg.fillRoundedRect(bx - SEND_BTN_W / 2, by - SEND_BTN_H / 2, SEND_BTN_W, SEND_BTN_H, 20)
    })
  }

  /** Draws a J-shaped pipe on the left border. */
  _drawPipe() {
    const g = this.add.graphics()
    g.lineStyle(6, C.pipeBlue, 1)

    const L = PIPE_CX - PIPE_HALF_W   // left wall  x = 14
    const R = PIPE_CX + PIPE_HALF_W   // right wall x = 86
    const top = HEADER_H + 8          // 63
    const exitTop = EXIT_Y - PIPE_HALF_W  // top of exit opening = 355
    const exitBot = EXIT_Y + PIPE_HALF_W  // bottom of exit opening = 427
    const exitEnd = R + 22             // short exit nub end = 108

    // Outer left wall + floor of exit tunnel
    g.beginPath()
    g.moveTo(L, top)
    g.lineTo(L, exitBot)
    g.lineTo(exitEnd, exitBot)
    g.strokePath()

    // Inner right wall + ceiling of exit tunnel
    g.beginPath()
    g.moveTo(R, top)
    g.lineTo(R, exitTop)
    g.lineTo(exitEnd, exitTop)
    g.strokePath()

    // Top cap
    g.beginPath()
    g.moveTo(L, top)
    g.lineTo(R, top)
    g.strokePath()
  }

  // ── ball stack ───────────────────────────────────────────────────────────────
  _buildStack() {
    for (let i = 0; i < STACK_SIZE; i++) {
      const val = get_next_ball_number(
        [this.hungryLeft, this.hungryRight],
        this.prevBallNumbers,
        this.level
      )
      this._trackPrevBall(val)
      const ballObj = this._createBall(PIPE_CX, STACK_TOP_Y + i * STACK_SPACING, val)
      this.stackBalls.push(ballObj)
    }
  }

  _trackPrevBall(val) {
    this.prevBallNumbers.push(val)
    if (this.prevBallNumbers.length > 4) this.prevBallNumbers.shift()
  }

  /** Creates a ball graphic (circle + number). Returns {value, bg, txt}. */
  _createBall(x, y, val) {
    const bg = this.add.graphics()
    bg.fillStyle(C.ballFill, 1)
    bg.lineStyle(3, C.ballBorder, 1)
    bg.fillCircle(0, 0, BALL_R)
    bg.strokeCircle(0, 0, BALL_R)
    bg.setPosition(x, y)

    const txt = this.add.text(x, y, String(val), {
      fontSize: ballFontSize(val),
      fontFamily: 'Arial Black, Arial',
      color: palette.white,
    }).setOrigin(0.5)

    return { value: val, bg, txt }
  }

  // ── spawn moving ball ────────────────────────────────────────────────────────
  spawnMovingBall() {
    if (this.isGameOver || this.movingBall) return

    // Take exit ball (bottom of stack index STACK_SIZE-1)
    const exitBall = this.stackBalls[STACK_SIZE - 1]
    const value = exitBall.value
    exitBall.bg.destroy()
    exitBall.txt.destroy()
    this.stackBalls.pop()

    // Create the moving ball at the pipe exit
    const mb = this._createBall(EXIT_X_START, EXIT_Y, value)
    this.movingBall = { ...mb, x: EXIT_X_START, y: EXIT_Y, state: 'right' }

    // Animate remaining stack balls one position down (toward exit)
    for (let i = 0; i < this.stackBalls.length; i++) {
      const targetY = STACK_TOP_Y + (i + 1) * STACK_SPACING
      this.tweens.add({
        targets: [this.stackBalls[i].bg, this.stackBalls[i].txt],
        y: targetY,
        duration: 220,
        ease: 'Quad.easeOut',
      })
    }

    // Generate new ball and slide it in from above into position 0
    const newVal = get_next_ball_number(
      [this.hungryLeft, this.hungryRight],
      this.prevBallNumbers,
      this.level
    )
    this._trackPrevBall(newVal)

    const newBall = this._createBall(PIPE_CX, STACK_TOP_Y - STACK_SPACING, newVal)
    this.tweens.add({
      targets: [newBall.bg, newBall.txt],
      y: STACK_TOP_Y,
      duration: 220,
      ease: 'Quad.easeOut',
    })
    this.stackBalls.unshift(newBall)
  }

  // ── send control (Space key or on-canvas button) ────────────────────────────
  sendBall() {
    if (!this.movingBall || this.movingBall.state !== 'right' || this.isGameOver) return
    this.movingBall.state = 'up'
  }

  // ── update loop ──────────────────────────────────────────────────────────────
  update(_time, delta) {
    if (this.isGameOver || !this.movingBall) return

    const ball = this.movingBall
    const dt = delta / 1000

    if (ball.state === 'right') {
      ball.x += this.ballSpeedRight * dt
      ball.bg.setPosition(ball.x, ball.y)
      ball.txt.setPosition(ball.x, ball.y)

      // Ball rolled off right edge → pass
      if (ball.x - BALL_R > GAME_W) {
        this._endMovingBall(false, null)
      }
    } else if (ball.state === 'up') {
      ball.y -= BALL_SEND_SPEED * dt
      ball.bg.setPosition(ball.x, ball.y)
      ball.txt.setPosition(ball.x, ball.y)

      // Hit left ellipse?
      if (
        Math.abs(ball.x - HUNGRY_LEFT_X) < HUNGRY_RX * 0.9 &&
        ball.y <= HUNGRY_Y + HUNGRY_RY &&
        ball.y >= HUNGRY_Y - HUNGRY_RY - BALL_R
      ) {
        this._feedHungry('left', ball.value)
        this._endMovingBall(true, { x: HUNGRY_LEFT_X, y: HUNGRY_Y })
        return
      }

      // Hit right ellipse?
      if (
        Math.abs(ball.x - HUNGRY_RIGHT_X) < HUNGRY_RX * 0.9 &&
        ball.y <= HUNGRY_Y + HUNGRY_RY &&
        ball.y >= HUNGRY_Y - HUNGRY_RY - BALL_R
      ) {
        this._feedHungry('right', ball.value)
        this._endMovingBall(true, { x: HUNGRY_RIGHT_X, y: HUNGRY_Y })
        return
      }

      // Ball left the canvas without hitting anything → miss
      if (ball.y + BALL_R < 0) {
        this._endMovingBall(false, null)
      }
    }
  }

  // ── feeding logic ────────────────────────────────────────────────────────────
  _feedHungry(side, ballValue) {
    let newVal, textObj, ellipseX

    if (side === 'left') {
      this.hungryLeft += ballValue
      newVal = this.hungryLeft
      textObj = this.hungryLeftText
      ellipseX = HUNGRY_LEFT_X
    } else {
      this.hungryRight += ballValue
      newVal = this.hungryRight
      textObj = this.hungryRightText
      ellipseX = HUNGRY_RIGHT_X
    }

    // Update display
    textObj.setText(String(newVal))
    textObj.setStyle({
      fontSize: hungryFontSize(newVal),
      fontFamily: 'Arial Black, Arial',
      color: palette.white,
    })

    // Award points for repeated digits in the new hungry number
    const maxSame = maxSameDigit(newVal)
    if (maxSame >= 3) {
      this.score += 6
      this._showBonus(ellipseX, HUNGRY_Y - HUNGRY_RY - 5, i18n.t('feedTheNumbers.feedback.tripleDigit'))
    } else if (maxSame === 2) {
      this.score += 2
      this._showBonus(ellipseX, HUNGRY_Y - HUNGRY_RY - 5, i18n.t('feedTheNumbers.feedback.doubleDigit'))
    }

    this.scoreText.setText(i18n.t('feedTheNumbers.hud.score', { score: this.score }))

    // White flash on the ellipse
    const flash = this.add.graphics()
    flash.fillStyle(0xffffff, 0.45)
    flash.fillEllipse(ellipseX, HUNGRY_Y, HUNGRY_RX * 2, HUNGRY_RY * 2)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    })
  }

  _showBonus(x, y, text) {
    const lbl = this.add.text(x, y, text, {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial',
      color: palette.scoreYellow,
    }).setOrigin(0.5)
    this.tweens.add({
      targets: lbl,
      y: y - 42,
      alpha: 0,
      duration: 750,
      ease: 'Quad.easeOut',
      onComplete: () => lbl.destroy(),
    })
  }

  // ── end of a moving ball (passed through or absorbed) ───────────────────────
  _endMovingBall(absorbed, targetPos) {
    if (!this.movingBall) return

    const ball = this.movingBall
    this.movingBall = null

    if (absorbed && targetPos) {
      // Fly into the ellipse and vanish
      this.tweens.add({
        targets: [ball.bg, ball.txt],
        x: targetPos.x,
        y: targetPos.y,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 180,
        ease: 'Quad.easeIn',
        onComplete: () => { ball.bg.destroy(); ball.txt.destroy() },
      })
    } else {
      ball.bg.destroy()
      ball.txt.destroy()
    }

    this.time.delayedCall(380, this.spawnMovingBall, [], this)
  }

  // ── timer ────────────────────────────────────────────────────────────────────
  onTick() {
    this.timeLeft--
    this.timerText.setText(String(this.timeLeft))
    if (this.timeLeft <= 10) {
      this.timerText.setColor(palette.wrongRed)
    }
    if (this.timeLeft <= 0) this.endGame()
  }

  // ── game over ────────────────────────────────────────────────────────────────
  endGame() {
    if (this.isGameOver) return
    this.isGameOver = true
    if (this.timerEvent) this.timerEvent.remove()

    if (this.movingBall) {
      this.movingBall.bg.destroy()
      this.movingBall.txt.destroy()
      this.movingBall = null
    }

    if (this.sendBtnZone) this.sendBtnZone.disableInteractive()

    const W = GAME_W
    const H = GAME_H

    this.add.rectangle(W / 2, H / 2, W, H, C.overlayBlack, 0.75)

    const panel = this.add.graphics()
    panel.fillStyle(C.gameHeader, 1)
    panel.fillRoundedRect(W / 2 - 160, H / 2 - 155, 320, 310, 24)

    this.add.text(W / 2, H / 2 - 110, i18n.t('feedTheNumbers.gameOver.title'), {
      fontSize: '30px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow,
    }).setOrigin(0.5)

    this.add.text(W / 2, H / 2 - 48, i18n.t('feedTheNumbers.gameOver.scoreLabel'), {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: palette.silverGray,
    }).setOrigin(0.5)

    this.add.text(W / 2, H / 2 + 14, String(this.score), {
      fontSize: '72px', fontFamily: 'Arial Black, Arial', color: palette.correctGreen,
    }).setOrigin(0.5)

    // Final hungry numbers display
    this.add.text(W / 2, H / 2 + 82, `${this.hungryLeft}  |  ${this.hungryRight}`, {
      fontSize: '22px', fontFamily: 'Arial Black, Arial', color: palette.silverGray,
    }).setOrigin(0.5)

    const btnBg = this.add.graphics()
    btnBg.fillStyle(C.btnBlue, 1)
    btnBg.fillRoundedRect(W / 2 - 110, H / 2 + 107, 220, 56, 16)

    this.add.text(W / 2, H / 2 + 135, i18n.t('feedTheNumbers.gameOver.playAgain'), {
      fontSize: '24px', fontFamily: 'Arial Black, Arial', color: palette.white,
    }).setOrigin(0.5)

    const btnZone = this.add.zone(W / 2, H / 2 + 135, 220, 56).setInteractive()
    btnZone.on('pointerdown', () => this.scene.restart())
    btnZone.on('pointerover', () => {
      btnBg.clear()
      btnBg.fillStyle(C.btnBlueHover, 1)
      btnBg.fillRoundedRect(W / 2 - 110, H / 2 + 107, 220, 56, 16)
    })
    btnZone.on('pointerout', () => {
      btnBg.clear()
      btnBg.fillStyle(C.btnBlue, 1)
      btnBg.fillRoundedRect(W / 2 - 110, H / 2 + 107, 220, 56, 16)
    })

    this.game.events.emit('gameComplete', { score: this.score })
  }
}
