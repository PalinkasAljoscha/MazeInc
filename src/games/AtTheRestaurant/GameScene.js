import Phaser from 'phaser'
import { palette, phaser as C } from '../../theme.js'
import i18n from '../../i18n.js'
import { GAME_W, GAME_H } from '../shared/phaserConstants.js'
import { buildGameOverPanel, createCountdownTimer } from '../shared/phaserUI.js'

// ── constants ─────────────────────────────────────────────────────────────────
const GAME_DURATION = 120
const MAX_PRICE     = { 1: 5, 2: 6, 3: 7, 4: 9, 5: 12 }
const WHEEL_NUMS    = 30    // numbers on the wheel: 1–30
const WHEEL_VISIBLE = 7     // how many slots are shown at once

const ALL_FOODS = [
  { id: 'burger',     emoji: '🍔' },
  { id: 'fries',      emoji: '🍟' },
  { id: 'pizza',      emoji: '🍕' },
  { id: 'maki',       emoji: '🍙' },
  { id: 'nigiri',     emoji: '🍣' },
  { id: 'dimsum',     emoji: '🥟' },
  { id: 'fruitsalad', emoji: '🍓' },
  { id: 'coffee',     emoji: '☕' },
  { id: 'cake',       emoji: '🎂' },
  { id: 'icecream',   emoji: '🍦' },
  { id: 'lemonade',   emoji: '🍹' },
]

// ── layout zones (y px, top of each zone) ────────────────────────────────────
const HUD_H     = 55
const MENU_TOP  = HUD_H                      // 55
const MENU_H    = 200
const TABLE_TOP = MENU_TOP + MENU_H          // 255
const TABLE_H   = Math.round(GAME_W * 908 / 1290) // 338 — image aspect 1290×908
const WHEEL_TOP = TABLE_TOP + TABLE_H        // 593
const WHEEL_H   = GAME_H - WHEEL_TOP         // 87

// ── scene ─────────────────────────────────────────────────────────────────────
export default class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }) }

  preload() {
    this.load.image('restaurant-table', 'games/at-the-restaurant/restaurant_table.png')
  }

  create() {
    const W = GAME_W, H = GAME_H
    this.W = W; this.H = H

    const level    = this.registry.get('level') ?? 1
    this.level     = level
    this.maxPrice  = MAX_PRICE[level] ?? 5

    this.score          = 0
    this.isGameOver     = false
    this.isTransitioning = false

    // Wheel state
    this.wheelCenter = 1   // which number is in the centre slot
    this.selectedNum = null
    this.wrongOnRound = 0

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, C.gameBg)

    // Build menu (fixed for the whole game session)
    this.menuItems = this._buildMenu()

    // Static UI
    this._drawHUD()
    this._drawMenu()
    this._drawDividers()
    this._drawWheel()

    // Container for animated table (position is tweened each round)
    this.tableContainer = this.add.container(0, 0)

    this._startRound()

    this.timerEvent = createCountdownTimer(this, GAME_DURATION, this.timerText)

    this.game.events.emit('sceneReady', this)
  }

  // ── menu building ─────────────────────────────────────────────────────────

  _buildMenu() {
    const shuffled = [...ALL_FOODS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 6).map(food => ({
      ...food,
      price: Phaser.Math.Between(1, this.maxPrice),
    }))
  }

  _getOrder() {
    const maxTotal = 5 + 5 * this.level
    for (let attempt = 0; attempt < 300; attempt++) {
      const count   = Phaser.Math.Between(2, 5)
      const shuffled = [...this.menuItems].sort(() => Math.random() - 0.5)
      const items   = shuffled.slice(0, count)
      const total   = items.reduce((s, f) => s + f.price, 0)
      if (total >= 2 && total <= Math.min(maxTotal, WHEEL_NUMS)) return items
    }
    // Fallback: two cheapest
    return [...this.menuItems].sort((a, b) => a.price - b.price).slice(0, 2)
  }

  // ── static UI drawing ─────────────────────────────────────────────────────

  _drawHUD() {
    const W = this.W
    this.add.rectangle(W / 2, HUD_H / 2, W, HUD_H, C.gameHeader)

    this.scoreText = this.add.text(16, HUD_H / 2,
      i18n.t('atRestaurant.hud.score', { score: 0 }), {
      fontSize: '22px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow,
    }).setOrigin(0, 0.5)

    this.timerText = this.add.text(W - 16, HUD_H / 2, String(GAME_DURATION), {
      fontSize: '22px', fontFamily: 'Arial Black, Arial', color: palette.timerLight,
    }).setOrigin(1, 0.5)
  }

  _drawMenu() {
    const W = this.W
    const COLS = 3, ROWS = 2
    const colW = W / COLS
    const rowH = (MENU_H - 28) / ROWS   // ~86 px per row

    this.add.text(W / 2, MENU_TOP + 6, i18n.t('atRestaurant.menu.title'), {
      fontSize: '14px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow,
    }).setOrigin(0.5, 0)

    this.menuItems.forEach((item, idx) => {
      const col = idx % COLS
      const row = Math.floor(idx / COLS)
      const cx  = col * colW + colW / 2
      const cy  = MENU_TOP + 28 + row * rowH + rowH / 2

      // Card background
      const g = this.add.graphics()
      g.fillStyle(C.gameHeader, 1)
      g.fillRoundedRect(cx - colW / 2 + 6, cy - rowH / 2 + 2, colW - 12, rowH - 4, 8)

      // Emoji + price left-aligned side by side
      const tileLeft = cx - colW / 2 + 14
      this.add.text(tileLeft, cy, item.emoji, {
        fontSize: '28px',
      }).setOrigin(0, 0.5)

      this.add.text(cx, cy, String(item.price), {
        fontSize: '22px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow,
      }).setOrigin(0.5, 0.5)
    })
  }

  _drawDividers() {
    this.add.rectangle(this.W / 2, TABLE_TOP, this.W, 1, C.divider)
  }

  // ── wheel ─────────────────────────────────────────────────────────────────

  _drawWheel() {
    const W = this.W
    const numRowY  = WHEEL_TOP + Math.round(WHEEL_H / 2)  // vertical centre of number slots
    const SLOT_W   = (W - 80) / WHEEL_VISIBLE

    // Wheel area background
    this.add.rectangle(W / 2, WHEEL_TOP + WHEEL_H / 2, W, WHEEL_H, 0x0d0d1a)


    // Arrow buttons
    this.leftBtn = this.add.text(22, numRowY, '‹', {
      fontSize: '46px', fontFamily: 'Arial Black, Arial', color: palette.white,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true })
    this.leftBtn.on('pointerdown', () => this._spinWheel(-1))

    this.rightBtn = this.add.text(W - 22, numRowY, '›', {
      fontSize: '46px', fontFamily: 'Arial Black, Arial', color: palette.white,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true })
    this.rightBtn.on('pointerdown', () => this._spinWheel(1))

    // Number slots
    const slotStartX = 40 + SLOT_W / 2
    this.wheelSlots = Array.from({ length: WHEEL_VISIBLE }, (_, s) => {
      const cx = slotStartX + s * SLOT_W
      const bg  = this.add.graphics()
      const txt = this.add.text(cx, numRowY, '', {
        fontSize: '26px', fontFamily: 'Arial Black, Arial', color: palette.white,
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true })
      txt.on('pointerup', (_p, _lx, _ly, ev) => {
        if (!this._dragMoved) { ev.stopPropagation(); this._onSlotClick(s) }
      })
      return { cx, cy: numRowY, slotW: SLOT_W, bg, txt }
    })

    this._setupWheelDrag()
    this._renderWheel()
  }

  _setupWheelDrag() {
    const SLOT_W = (this.W - 80) / WHEEL_VISIBLE
    this._dragLastX = null
    this._dragAccum = 0
    this._dragMoved = false

    this.input.on('pointerdown', (ptr) => {
      if (ptr.y < WHEEL_TOP || ptr.y > WHEEL_TOP + WHEEL_H) return
      this._dragLastX = ptr.x
      this._dragAccum = 0
      this._dragMoved = false
    })

    this.input.on('pointermove', (ptr) => {
      if (this._dragLastX === null || !ptr.isDown) return
      if (this.isGameOver || this.isTransitioning) return
      const dx = ptr.x - this._dragLastX
      this._dragAccum -= dx   // swipe right → negative accum → spin(-1)
      while (this._dragAccum >=  SLOT_W) { this._spinWheel(+1); this._dragAccum -= SLOT_W; this._dragMoved = true }
      while (this._dragAccum <= -SLOT_W) { this._spinWheel(-1); this._dragAccum += SLOT_W; this._dragMoved = true }
      this._dragLastX = ptr.x
    })

    this.input.on('pointerup', () => {
      this._dragLastX = null
      this._dragAccum = 0
      this._dragMoved = false
    })
  }

  _spinWheel(dir) {
    if (this.isGameOver || this.isTransitioning) return
    this.wheelCenter = ((this.wheelCenter - 1 + dir + WHEEL_NUMS) % WHEEL_NUMS) + 1
    // Drop selection if it scrolled out of view
    if (this.selectedNum !== null) {
      const mid = Math.floor(WHEEL_VISIBLE / 2)
      const visible = Array.from({ length: WHEEL_VISIBLE }, (_, s) =>
        ((this.wheelCenter - 1 + (s - mid) + WHEEL_NUMS) % WHEEL_NUMS) + 1
      )
      if (!visible.includes(this.selectedNum)) this.selectedNum = null
    }
    this._renderWheel()
  }

  _onSlotClick(slotIdx) {
    if (this.isGameOver || this.isTransitioning) return
    const mid = Math.floor(WHEEL_VISIBLE / 2)
    const num = ((this.wheelCenter - 1 + (slotIdx - mid) + WHEEL_NUMS) % WHEEL_NUMS) + 1

    if (this.selectedNum === num) {
      this._submitAnswer()
    } else {
      // Spin so clicked number is centred, then select it
      this.wheelCenter = num
      this.selectedNum = num
      this._renderWheel()
    }
  }

  _renderWheel() {
    const W   = this.W
    const mid = Math.floor(WHEEL_VISIBLE / 2)
    const btnY = WHEEL_TOP + WHEEL_H - 34

    this.wheelSlots.forEach((slot, s) => {
      const off = s - mid
      const num = ((this.wheelCenter - 1 + off + WHEEL_NUMS) % WHEEL_NUMS) + 1
      const { cx, cy, slotW, bg, txt } = slot
      const dist = Math.abs(off)
      const isSel = (num === this.selectedNum)

      bg.clear()

      if (isSel) {
        bg.lineStyle(3, C.btnBlue, 1)
        bg.strokeRoundedRect(cx - slotW / 2 + 3, cy - 28, slotW - 6, 56, 10)
        bg.fillStyle(C.btnBlue, 0.25)
        bg.fillRoundedRect(cx - slotW / 2 + 3, cy - 28, slotW - 6, 56, 10)
        txt.setStyle({ fontSize: '34px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow })
        txt.setAlpha(1)
      } else if (dist === 0) {
        bg.fillStyle(C.gameHeader, 1)
        bg.fillRoundedRect(cx - slotW / 2 + 3, cy - 23, slotW - 6, 46, 8)
        txt.setStyle({ fontSize: '28px', fontFamily: 'Arial Black, Arial', color: palette.white })
        txt.setAlpha(1)
      } else {
        txt.setStyle({ fontSize: dist === 1 ? '22px' : '18px', fontFamily: 'Arial, Arial', color: palette.silverGray })
        txt.setAlpha(dist === 1 ? 0.65 : 0.35)
      }
      txt.setText(String(num))
    })

  }

  _submitAnswer() {
    if (this.isGameOver || this.isTransitioning) return
    if (this.selectedNum === null) return
    if (this.selectedNum === this.correctTotal) {
      this._handleCorrect()
    } else {
      this._handleWrong()
    }
  }

  // ── answer handling ───────────────────────────────────────────────────────

  _handleCorrect() {
    this.isTransitioning = true
    this.score += 10
    this.scoreText.setText(i18n.t('atRestaurant.hud.score', { score: this.score }))
    this._celebrateEffect()
    this.time.delayedCall(1200, () => this._nextRound())
  }

  _handleWrong() {
    // Deduct 3 pts for each wrong answer if score > 3
    if (this.score > 3) {
      this.score -= 3
      this.scoreText.setText(i18n.t('atRestaurant.hud.score', { score: this.score }))
    }
    this.wrongOnRound++

    if (this.wrongOnRound < 2) {
      // First wrong: flash red, player gets one more try
      this._flashWrong()
    } else {
      // Second wrong: show answer, then next round
      this.isTransitioning = true
      this._showAnswerHint()
      this.time.delayedCall(1400, () => this._nextRound())
    }
  }

  _flashWrong() {
    // Mark the selected slot red for 600ms, then reset
    this.isTransitioning = true
    const mid = Math.floor(WHEEL_VISIBLE / 2)
    this.wheelSlots.forEach((slot, s) => {
      const off = s - mid
      const num = ((this.wheelCenter - 1 + off + WHEEL_NUMS) % WHEEL_NUMS) + 1
      if (num !== this.selectedNum) return
      const { cx, cy, slotW, bg, txt } = slot
      bg.clear()
      bg.lineStyle(3, C.wrongRed, 1)
      bg.strokeRoundedRect(cx - slotW / 2 + 3, cy - 28, slotW - 6, 56, 10)
      bg.fillStyle(C.wrongRed, 0.3)
      bg.fillRoundedRect(cx - slotW / 2 + 3, cy - 28, slotW - 6, 56, 10)
      txt.setStyle({ fontSize: '34px', fontFamily: 'Arial Black, Arial', color: palette.wrongRed })
    })
    this.time.delayedCall(600, () => {
      this.selectedNum = null
      this.isTransitioning = false
      this._renderWheel()
    })
  }

  _showAnswerHint() {
    const W = this.W
    const t = this.add.text(W / 2, TABLE_TOP + TABLE_H / 2,
      `= ${this.correctTotal} 💡`, {
      fontSize: '40px', fontFamily: 'Arial Black, Arial', color: palette.correctGreen,
    }).setOrigin(0.5, 0.5).setDepth(10)
    this.tweens.add({
      targets: t, alpha: 0, duration: 800, delay: 600,
      onComplete: () => t.destroy(),
    })
  }

  _celebrateEffect() {
    const W = this.W
    const emojis = ['🎉', '⭐', '✨', '🎊', '🌟', '😄', '👍']
    for (let i = 0; i < 7; i++) {
      const x  = 50 + Math.random() * (W - 100)
      const y  = TABLE_TOP + 10 + Math.random() * (TABLE_H - 20)
      const em = this.add.text(x, y, emojis[i % emojis.length], {
        fontSize: '28px',
      }).setOrigin(0.5).setDepth(10)
      this.tweens.add({
        targets: em, y: y - 75, alpha: 0, duration: 950, delay: i * 80,
        ease: 'Quad.easeOut',
        onComplete: () => em.destroy(),
      })
    }
  }

  // ── table rendering ───────────────────────────────────────────────────────

  _startRound() {
    this.wrongOnRound = 0
    this.selectedNum  = null
    this.wheelCenter  = 1
    this.currentOrder = this._getOrder()
    this.correctTotal = this.currentOrder.reduce((s, f) => s + f.price, 0)
    this._renderTable(this.tableContainer)
    this._renderWheel()
  }

  _renderTable(container) {
    container.removeAll(true)

    const W     = this.W
    const items = this.currentOrder
    const count = items.length

    // Table image — fills full width, aspect ratio preserved
    const img = this.add.image(W / 2, TABLE_TOP + TABLE_H / 2, 'restaurant-table')
    img.setDisplaySize(W, TABLE_H)
    container.add(img)

    // Food emojis spread across the tablecloth surface
    // Horizontal: full usable width with small margins
    // Vertical: ~58% down the image (below salt/pepper/flowers, on the open cloth)
    const areaX    = 36
    const areaW    = W - 72
    const bottomY  = TABLE_TOP + Math.round(TABLE_H * 0.58)
    const rowSpacing = 66

    const bottomRow = count > 4 ? items.slice(count - 4) : items
    const topRow    = count > 4 ? items.slice(0, count - 4) : []

    const placeRow = (row, cy) => {
      const itemW = areaW / row.length
      row.forEach((item, i) => {
        const cx = areaX + itemW * i + itemW / 2
        const em = this.add.text(cx, cy, item.emoji, { fontSize: '56px' }).setOrigin(0.5, 0.5)
        container.add(em)
      })
    }

    placeRow(bottomRow, bottomY)
    if (topRow.length) placeRow(topRow, bottomY - rowSpacing)
  }

  _nextRound() {
    if (this.isGameOver) return
    const W = this.W

    this.tweens.add({
      targets: this.tableContainer,
      x: -W,
      duration: 280,
      ease: 'Power2',
      onComplete: () => {
        if (this.isGameOver) return
        this.wrongOnRound  = 0
        this.selectedNum   = null
        this.wheelCenter   = 1
        this.currentOrder  = this._getOrder()
        this.correctTotal  = this.currentOrder.reduce((s, f) => s + f.price, 0)
        this._renderTable(this.tableContainer)
        this._renderWheel()

        this.tableContainer.x = W
        this.tweens.add({
          targets: this.tableContainer,
          x: 0,
          duration: 280,
          ease: 'Power2',
          onComplete: () => { this.isTransitioning = false },
        })
      },
    })
  }

  // ── end game ─────────────────────────────────────────────────────────────

  endGame() {
    if (this.isGameOver) return
    this.isGameOver = true
    if (this.timerEvent) this.timerEvent.remove()

    buildGameOverPanel(this, {
      W: this.W, H: this.H,
      titleKey:      'atRestaurant.gameOver.title',
      scoreLabelKey: 'atRestaurant.gameOver.scoreLabel',
      score:         this.score,
      playAgainKey:  'atRestaurant.gameOver.playAgain',
      onRestart:     () => this.scene.restart(),
    })

    this.game.events.emit('gameComplete', { score: this.score })
  }
}
