import Phaser from 'phaser'
import { palette, phaser as C } from '../../theme.js'
import i18n from '../../i18n.js'
import { GAME_W, GAME_H } from '../shared/phaserConstants.js'
import { buildGameOverPanel, createCountdownTimer } from '../shared/phaserUI.js'

// ── constants ─────────────────────────────────────────────────────────────────
const GAME_DURATION   = 120
const MAX_PRICE       = { 1: 5, 2: 6, 3: 7, 4: 9, 5: 12 }
const MAX_TABLE_TOTAL = { 1: 10, 2: 13, 3: 16, 4: 19, 5: 22 }

const ALL_FOODS = [
  { id: 'fries',      emoji: '🍟', minPrice: 1, maxPrice: 3  },
  { id: 'coffee',     emoji: '☕', minPrice: 1, maxPrice: 3  },
  { id: 'lemonade',   emoji: '🍹', minPrice: 2, maxPrice: 3  },
  { id: 'icecream',   emoji: '🍦', minPrice: 2, maxPrice: 3  },
  { id: 'fruitsalad', emoji: '🍓', minPrice: 1, maxPrice: 3  },
  { id: 'dimsum',     emoji: '🥟', minPrice: 2, maxPrice: 4  },
  { id: 'taco',       emoji: '🌮', minPrice: 2, maxPrice: 4  },
  { id: 'cake',       emoji: '🍰', minPrice: 3, maxPrice: 5  },
  { id: 'pizza',      emoji: '🍕', minPrice: 3, maxPrice: 5  },
  { id: 'croissant',  emoji: '🥐', minPrice: 1, maxPrice: 3  },
  { id: 'flatbread',  emoji: '🥙', minPrice: 3, maxPrice: 5  },
  { id: 'burger',     emoji: '🍔', minPrice: 4, maxPrice: 6  },
  { id: 'fondue',     emoji: '🫕', minPrice: 5, maxPrice: 7  },
  { id: 'nigiri',     emoji: '🍣', minPrice: 5, maxPrice: 7  },
]

// ── layout zones ──────────────────────────────────────────────────────────────
const HUD_H    = 55
const MENU_TOP = HUD_H           // 55
const MENU_H   = 200
const TABLE_TOP = MENU_TOP + MENU_H  // 255

// ── coin U-shape layout ───────────────────────────────────────────────────────
// 22 coins: 7 down the left, 8 across the bottom, 7 up the right
const N_SIDE       = 7          // coins per side column
const N_BOTTOM     = 8          // coins in bottom row
const COIN_R       = 18         // visual radius (px)
const COIN_LEFT_X  = 24         // x-centre of left column
const COIN_RIGHT_X = GAME_W - 24  // 456 — x-centre of right column
const COIN_TOP_Y   = TABLE_TOP + COIN_R + 6    // 279 — topmost coin y-centre
const COIN_COL_BOT = GAME_H - 100              // 580 — bottommost side coin y-centre
const COIN_BOT_Y   = GAME_H - 30              // 650 — bottom-row coin y-centre

// ── table image dimensions (fills the interior of the U) ─────────────────────
const TABLE_IMG_W  = COIN_RIGHT_X - COIN_LEFT_X - COIN_R * 2 - 8  // ≈384
const TABLE_IMG_H  = COIN_BOT_Y   - COIN_R - TABLE_TOP - 8        // ≈369
const TABLE_IMG_CX = GAME_W / 2
const TABLE_IMG_CY = TABLE_TOP + Math.round(TABLE_IMG_H / 2)       // ≈440

// ── coin position generator ───────────────────────────────────────────────────
function buildCoinPositions() {
  const pts = []
  // Left column: coins 1–7, top → bottom
  for (let i = 0; i < N_SIDE; i++) {
    const t = i / (N_SIDE - 1)
    pts.push({ x: COIN_LEFT_X, y: Math.round(COIN_TOP_Y + t * (COIN_COL_BOT - COIN_TOP_Y)) })
  }
  // Bottom row: coins 8–15, left → right
  for (let i = 0; i < N_BOTTOM; i++) {
    const t = i / (N_BOTTOM - 1)
    pts.push({ x: Math.round(COIN_LEFT_X + t * (COIN_RIGHT_X - COIN_LEFT_X)), y: COIN_BOT_Y })
  }
  // Right column: coins 16–22, bottom → top
  for (let i = N_SIDE - 1; i >= 0; i--) {
    const t = i / (N_SIDE - 1)
    pts.push({ x: COIN_RIGHT_X, y: Math.round(COIN_TOP_Y + t * (COIN_COL_BOT - COIN_TOP_Y)) })
  }
  return pts  // 7 + 8 + 7 = 22
}

// ── scene ─────────────────────────────────────────────────────────────────────
export default class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }) }

  preload() {
    this.load.image('restaurant-table', 'games/at-the-restaurant/restaurant_table.png')
  }

  create() {
    const W = GAME_W, H = GAME_H
    this.W = W; this.H = H

    const level        = this.registry.get('level') ?? 1
    this.level         = level
    this.maxPrice      = MAX_PRICE[level] ?? 5
    this.maxTableTotal = MAX_TABLE_TOTAL[level] ?? 10

    this.score            = 0
    this.isGameOver       = false
    this.isTransitioning  = false
    this.foodEmojiObjects = []
    this.selectedNum      = null
    this.coinObjects      = []

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, C.gameBg)

    // Build menu (fixed for the whole game session)
    this.menuItems = this._buildMenu()

    // Static UI
    this._drawHUD()
    this._drawMenu()
    this._drawDividers()

    // Container for animated table (position is tweened each round)
    this.tableContainer = this.add.container(0, 0)

    // 22 silver coins in a U-shape
    this._drawCoins()

    this._startRound()

    this.timerEvent = createCountdownTimer(this, GAME_DURATION, this.timerText)

    this.game.events.emit('sceneReady', this)
  }

  // ── menu building ─────────────────────────────────────────────────────────

  _buildMenu() {
    const eligible = ALL_FOODS.filter(f => f.minPrice <= this.maxPrice)
    const shuffled = [...eligible].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 6).map(food => ({
      ...food,
      price: Phaser.Math.Between(food.minPrice, Math.min(food.maxPrice, this.maxPrice)),
    }))
  }

  _getOrder() {
    const maxTotal = this.maxTableTotal
    for (let attempt = 0; attempt < 300; attempt++) {
      const count   = Phaser.Math.Between(2, 5)
      const shuffled = [...this.menuItems].sort(() => Math.random() - 0.5)
      const items   = shuffled.slice(0, count)
      const total   = items.reduce((s, f) => s + f.price, 0)
      if (total >= 2 && total <= Math.min(maxTotal, N_SIDE * 2 + N_BOTTOM)) return items
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
      }).setOrigin(0, 0.5).setPadding({ top: 10 })

      this.add.text(cx, cy, String(item.price), {
        fontSize: '22px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow,
      }).setOrigin(0.5, 0.5)
    })
  }

  _drawDividers() {
    this.add.rectangle(this.W / 2, TABLE_TOP, this.W, 1, C.divider)
  }

  // ── coins ─────────────────────────────────────────────────────────────────

  _drawCoins() {
    const positions = buildCoinPositions()
    this.coinObjects = positions.map((pos, idx) => {
      const num  = idx + 1
      const size = num <= 9 ? '16px' : '13px'

      const g = this.add.graphics()

      const txt = this.add.text(pos.x, pos.y, String(num), {
        fontSize: size, fontFamily: 'Arial Black, Arial', color: palette.coinText,
      }).setOrigin(0.5, 0.5).setPadding({ top: 4 }).setDepth(2)

      const hitR  = COIN_R + 5
      const zone  = this.add.zone(pos.x, pos.y, hitR * 2, hitR * 2)
        .setInteractive({ useHandCursor: true }).setDepth(3)
      zone.on('pointerup', () => this._onCoinClick(num))

      return { num, x: pos.x, y: pos.y, g, txt }
    })
    this._renderCoins()
  }

  _renderCoins() {
    if (!this.coinObjects) return
    this.coinObjects.forEach(({ num, x, y, g, txt }) => {
      g.clear()
      const isSel = (num === this.selectedNum)
      const size  = num <= 9 ? '16px' : '13px'

      if (isSel) {
        g.fillStyle(C.btnBlue, 1)
        g.fillCircle(x, y, COIN_R)
        g.lineStyle(2.5, C.btnBlueHover, 1)
        g.strokeCircle(x, y, COIN_R)
        txt.setStyle({ fontSize: size, fontFamily: 'Arial Black, Arial', color: palette.scoreYellow })
      } else {
        g.fillStyle(C.coinSilver, 1)
        g.fillCircle(x, y, COIN_R)
        g.lineStyle(2, C.coinBorder, 1)
        g.strokeCircle(x, y, COIN_R)
        txt.setStyle({ fontSize: size, fontFamily: 'Arial Black, Arial', color: palette.coinText })
      }
    })
  }

  _onCoinClick(num) {
    if (this.isGameOver || this.isTransitioning) return
    if (this.selectedNum === num) {
      this._submitAnswer()
    } else {
      this.selectedNum = num
      this._renderCoins()
    }
  }

  // ── answer submission ──────────────────────────────────────────────────────

  _submitAnswer() {
    if (this.isGameOver || this.isTransitioning) return
    if (this.selectedNum === null) return
    this.isTransitioning = true
    this._showFeedback(this.selectedNum === this.correctTotal)
  }

  // ── answer feedback ───────────────────────────────────────────────────────

  _showFeedback(isCorrect) {
    const W  = this.W
    const cx = W / 2
    const cy = TABLE_IMG_CY

    if (isCorrect) {
      this.score += 10
      this.scoreText.setText(i18n.t('atRestaurant.hud.score', { score: this.score }))
    } else {
      if (this.score > 3) {
        this.score -= 3
        this.scoreText.setText(i18n.t('atRestaurant.hud.score', { score: this.score }))
      }
    }

    // Phase 1 — blue number (0 → 0.5 s)
    const numText = this.add.text(cx, cy, String(this.selectedNum), {
      fontSize: '96px', fontFamily: 'Arial Black, Arial', color: palette.btnBlue,
    }).setOrigin(0.5, 0.5).setDepth(20).setPadding({ top: 20 })

    let crossText = null

    // Phase 2 — reveal correct / wrong at 0.5 s
    this.time.delayedCall(500, () => {
      if (isCorrect) {
        numText.setColor(palette.correctGreen)
        numText.setText(`${this.selectedNum} ✓`)
      } else {
        numText.setColor(palette.wrongRed)
        crossText = this.add.text(cx, cy, '✗', {
          fontSize: '110px', fontFamily: 'Arial Black, Arial', color: palette.wrongRed,
        }).setOrigin(0.5, 0.5).setDepth(21).setPadding({ top: 20 })
        this.cameras.main.shake(220, 0.008)
      }
    })

    // Phase end — clean up at 1.5 s total
    this.time.delayedCall(1500, () => {
      numText.destroy()
      if (crossText) crossText.destroy()

      if (!isCorrect) {
        this.selectedNum = null
        this.isTransitioning = false
        this._renderCoins()
        return
      }

      // Show full price formula for 1.5 s, then switch table
      const formula = this.currentOrder.map(f => f.price).join(' + ') + ' = ' + this.correctTotal
      const formulaText = this.add.text(cx, cy, formula, {
        fontSize: '30px', fontFamily: 'Arial Black, Arial', color: palette.correctGreen,
      }).setOrigin(0.5, 0.5).setDepth(20)

      this.time.delayedCall(1500, () => {
        formulaText.destroy()
        this._nextRound()
      })
    })
  }

  // ── table rendering ───────────────────────────────────────────────────────

  _startRound() {
    this.selectedNum  = null
    this.currentOrder = this._getOrder()
    this.correctTotal = this.currentOrder.reduce((s, f) => s + f.price, 0)
    this._renderTable(this.tableContainer)
    this._renderCoins()
  }

  _renderTable(container) {
    container.removeAll(true)
    this.foodEmojiObjects = []

    const items = this.currentOrder
    const count = items.length

    // Table image fills the interior of the coin U
    const img = this.add.image(TABLE_IMG_CX, TABLE_IMG_CY, 'restaurant-table')
    img.setDisplaySize(TABLE_IMG_W, TABLE_IMG_H)
    container.add(img)

    // Food placement area — inset from the coin column edges
    const areaLeft   = COIN_LEFT_X + COIN_R + 8
    const areaRight  = COIN_RIGHT_X - COIN_R - 8
    const areaW      = areaRight - areaLeft
    const bottomY    = TABLE_TOP + Math.round(TABLE_IMG_H * 0.55)
    const rowSpacing = 66

    const bottomRow = count > 4 ? items.slice(count - 4) : items
    const topRow    = count > 4 ? items.slice(0, count - 4) : []

    const placeRow = (row, cy) => {
      const itemW = areaW / row.length
      row.forEach((item, i) => {
        const cx = areaLeft + itemW * i + itemW / 2
        const em = this.add.text(cx, cy, item.emoji, { fontSize: '56px' })
          .setOrigin(0.5, 0.5).setPadding({ top: 16 })
        container.add(em)
        this.foodEmojiObjects.push(em)
      })
    }

    placeRow(bottomRow, bottomY)
    if (topRow.length) placeRow(topRow, bottomY - rowSpacing)
  }

  _nextRound() {
    if (this.isGameOver) return

    // Detach current food emojis from container so _renderTable won't destroy them mid-flight
    const outgoing = [...this.foodEmojiObjects]
    outgoing.forEach(em => this.tableContainer.remove(em, false))
    this.foodEmojiObjects = []

    // Slide each outgoing emoji off in a random direction
    outgoing.forEach((em, i) => {
      const angle = Math.random() * Math.PI * 2
      const dist  = 300
      this.time.delayedCall(i * 300, () => {
        if (!em.active) return
        this.tweens.add({
          targets: em,
          x: em.x + Math.cos(angle) * dist,
          y: em.y + Math.sin(angle) * dist,
          alpha: 0,
          duration: 250,
          ease: 'Power2',
          onComplete: () => em.destroy(),
        })
      })
    })

    // After all outgoing have departed, load new order and reveal food one by one
    const afterOut = outgoing.length * 300 + 260
    this.time.delayedCall(afterOut, () => {
      if (this.isGameOver) return

      this.selectedNum  = null
      this.currentOrder = this._getOrder()
      this.correctTotal = this.currentOrder.reduce((s, f) => s + f.price, 0)

      this._renderTable(this.tableContainer)
      this.foodEmojiObjects.forEach(em => em.setAlpha(0))
      this._renderCoins()

      // Appear one by one
      const incoming = [...this.foodEmojiObjects]
      incoming.forEach((em, i) => {
        this.time.delayedCall(i * 300, () => {
          if (em.active) em.setAlpha(1)
        })
      })

      this.time.delayedCall(incoming.length * 300, () => {
        this.isTransitioning = false
      })
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
