import Phaser from 'phaser'
import { palette, phaser as C } from '../../theme.js'
import i18n from '../../i18n.js'

// ── layout constants ──────────────────────────────────────────────────────────
const GAME_W = 480
const GAME_H = 680
const HEADER_H = 55
const CELL_SIZE = 52
const GRID_COLS = 8
const GRID_ROWS = 6
const COLS_PER_SIDE = GRID_COLS / 2                                  // 4
const GRID_OFFSET_X = (GAME_W - GRID_COLS * CELL_SIZE) / 2          // 32
const GRID_TOP_Y = 145
const GRID_BOTTOM_Y = GRID_TOP_Y + GRID_ROWS * CELL_SIZE             // 457
const FALL_START_Y = HEADER_H + CELL_SIZE / 2 + 5                   // 86
const FALL_SPEED = 100        // px/sec normal drop
const FAST_SPEED = 600        // px/sec when space/drop held
const MOVE_COOLDOWN = 150     // ms between key-repeat steps
const MIN_CUBE_NUM = -5       // inclusive lower bound for cube values
const MAX_CUBE_NUM = 15       // inclusive upper bound for cube values

// Y positions for the sum displays below the grid
const COL_SUM_Y = GRID_BOTTOM_Y + 32                                 // 489
const BRACE_Y = COL_SUM_Y + 22                                       // 511
const SIDE_SUM_Y = BRACE_Y + 32                                      // 543
const COLORS_BOTTOM_Y = SIDE_SUM_Y + 28                              // 571
const HINT_Y = COLORS_BOTTOM_Y + 22                                  // 593

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the number for the next falling cube.
 *
 * Generator A (probability P by level: 1→0.6, 2→0.4, 3→0.3, 4→0.2, 5→0.1):
 *   Produces a value that would balance left vs right totals if placed on the
 *   matching side.  Both the positive and negative candidate are tried; if both
 *   are in range, one is picked at random.  Falls back to B when neither fits.
 *
 * Generator B (always used when total field sum < 40, after a field clear, or
 *   with probability 1–P otherwise):
 *   - Negative numbers are sampled with a fixed probability by level:
 *     1→0, 2→0, 3→0.05, 4→0.10, 5→0.12.
 *   - Positive numbers use a power-law bias toward zero: weight = 1/v^α,
 *     α = (5 − level) / 2  (heavy bias at level 1, uniform at level 5).
 *   - Negative numbers (when selected) are drawn uniformly from
 *     [MIN_CUBE_NUM, −1].
 *   Zero is always excluded.
 *
 * @param {number}   difficultyLevel  1–5
 * @param {number[]} columnSums       current sum of each column (length 8)
 * @param {boolean}  [fieldCleared]   true for the first cube after a field clear
 */
function get_next_cube_number(difficultyLevel, columnSums, fieldCleared = false) {
  const P_A    = [0, 0.6, 0.4, 0.3, 0.2, 0.1][difficultyLevel] ?? 0.3
  const P_NEG  = [0, 0,   0,   0.05, 0.1, 0.12][difficultyLevel] ?? 0

  // ── Generator B ──────────────────────────────────────────────────────────
  const generatorB = () => {
    if (Math.random() < P_NEG) {
      // Negative branch — uniform over [MIN_CUBE_NUM, -1]
      return Math.floor(Math.random() * (-MIN_CUBE_NUM)) + MIN_CUBE_NUM
    }
    // Positive branch — power-law bias toward small values
    const alpha = (5 - difficultyLevel) / 2   // 2 at level 1 → 0 at level 5
    const values  = []
    const weights = []
    for (let v = 1; v <= MAX_CUBE_NUM; v++) {
      values.push(v)
      weights.push(alpha === 0 ? 1 : 1 / Math.pow(v, alpha))
    }
    const total = weights.reduce((a, b) => a + b, 0)
    let r = Math.random() * total
    for (let i = 0; i < values.length; i++) {
      r -= weights[i]
      if (r <= 0) return values[i]
    }
    return values[values.length - 1]
  }

  const totalFieldSum = columnSums.reduce((a, b) => a + b, 0)
  if (fieldCleared || totalFieldSum < 40 || Math.random() >= P_A) return generatorB()

  // ── Generator A ──────────────────────────────────────────────────────────
  const leftTotal  = columnSums.slice(0, COLS_PER_SIDE).reduce((a, b) => a + b, 0)
  const rightTotal = columnSums.slice(COLS_PER_SIDE).reduce((a, b) => a + b, 0)
  const diff = leftTotal - rightTotal   // adding diff to right side balances;
                                        // adding -diff to left side balances
  const inRange = v => v !== 0 && v >= MIN_CUBE_NUM && v <= MAX_CUBE_NUM
  const posOk = inRange(diff)
  const negOk = inRange(-diff)

  if (posOk && negOk) return Math.random() < 0.5 ? diff : -diff
  if (posOk)          return diff
  if (negOk)          return -diff
  return generatorB()
}

/**
 * Decides the display colour for each column sum.
 * @param {number[]} sums  Ordered array of 8 column sums (index 0 = leftmost).
 * @returns {{ grey: number[], green: number[], red: number[] }}
 *   Each array contains the column indices that should receive that colour.
 *
 * Logic:
 *   1. Build a position list [{pos, val}, …] from the sums.
 *   2. Find the longest consecutive strictly-ascending run; on ties pick the
 *      one whose first value is smallest. → green (primary).
 *   3. Remove that run plus its immediate left/right neighbours from the list.
 *      If the remainder contains a consecutive strictly-ascending run of ≥ 3
 *      positions, add that run to green as well (secondary).
 *   4. Every position not in green → grey.  No red is used.
 */
function set_column_sum_coloring(sums) {
  // Build ordered position list
  const items = sums.map((val, pos) => ({ pos, val }))

  // Returns the longest consecutive strictly-ascending run in `list`
  // (items must already be sorted by pos).
  // Tiebreak: prefer the run whose first val is smallest.
  function longestAscRun(list) {
    if (list.length === 0) return []
    let best = [list[0]]
    let cur  = [list[0]]
    for (let i = 1; i < list.length; i++) {
      if (list[i].pos === list[i - 1].pos + 1 && list[i].val > list[i - 1].val) {
        cur.push(list[i])
      } else {
        cur = [list[i]]
      }
      if (cur.length > best.length ||
          (cur.length === best.length && cur[0].val < best[0].val)) {
        best = cur.slice()
      }
    }
    return best
  }

  // Step 2 — primary green run (requires length >= 3)
  const primary  = longestAscRun(items)
  const greenSet = new Set()

  if (primary.length >= 3) {
    for (const i of primary) greenSet.add(i.pos)

    // Step 3 — exclude primary run + immediate neighbours, then find secondary
    const firstPos = primary[0].pos
    const lastPos  = primary[primary.length - 1].pos
    const excluded = new Set(greenSet)
    if (firstPos > 0)               excluded.add(firstPos - 1)
    if (lastPos  < sums.length - 1) excluded.add(lastPos  + 1)

    const remaining = items.filter(i => !excluded.has(i.pos))
    const secondary = longestAscRun(remaining)
    const minDist   = Math.min(...secondary.map(s => Math.min(...primary.map(p => Math.abs(s.val - p.val)))))
    if (secondary.length >= 3 && minDist >= 2) {
      for (const i of secondary) greenSet.add(i.pos)
    }
  }

  // Step 4 — everything else is grey
  const result = { grey: [], green: [], red: [] }
  for (let c = 0; c < sums.length; c++) {
    if (greenSet.has(c)) result.green.push(c)
    else                 result.grey.push(c)
  }
  return result
}

/** Screen x-center of a grid column. */
function colCenterX(col) {
  return GRID_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2
}

/** Screen y-center of a cube at rowFromBottom (0 = bottom row). */
function cubeCenterY(rowFromBottom) {
  return GRID_BOTTOM_Y - rowFromBottom * CELL_SIZE - CELL_SIZE / 2
}

// ── scene ─────────────────────────────────────────────────────────────────────
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  // ── create ──────────────────────────────────────────────────────────────────
  create() {
    const level = this.registry.get('level') ?? 2
    this.level = level
    this.score = 0
    this.isGameOver = false
    this.lastMoveTime = 0

    // stacks[col] = array of {value, bg, txt} from bottom (index 0) to top
    this.stacks = Array.from({ length: GRID_COLS }, () => [])

    this.fallingCube = null         // {value, bg, txt, col, y, isFast}
    this.fieldJustCleared = false

    this._buildScene()
    this._buildSumDisplays()

    this.cursors = this.input.keyboard.createCursorKeys()
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.game.events.emit('sceneReady', this)
    this.time.delayedCall(400, this.spawnCube, [], this)
  }

  // ── static scene elements ────────────────────────────────────────────────────
  _buildScene() {
    const W = GAME_W
    const H = GAME_H

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, C.gameBg)

    // Header
    this.add.rectangle(W / 2, HEADER_H / 2, W, HEADER_H, C.gameHeader)

    this.scoreText = this.add.text(
      16, HEADER_H / 2,
      i18n.t('balance.hud.score', { score: 0 }),
      { fontSize: '24px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow }
    ).setOrigin(0, 0.5)

    this.add.text(W / 2, HEADER_H / 2, i18n.t('balance.hud.title'), {
      fontSize: '18px', fontFamily: 'Arial Black, Arial', color: palette.timerLight,
    }).setOrigin(0.5)

    // Header divider
    const dg = this.add.graphics()
    dg.lineStyle(2, C.divider, 1)
    dg.lineBetween(0, HEADER_H, W, HEADER_H)

    // Half-backgrounds — slight colour difference left vs right, stop before hint area
    const gBg = this.add.graphics()
    gBg.fillStyle(0x1c1c38, 1)
    gBg.fillRect(0, HEADER_H, W / 2, COLORS_BOTTOM_Y - HEADER_H)
    gBg.fillStyle(0x1c2838, 1)
    gBg.fillRect(W / 2, HEADER_H, W / 2, COLORS_BOTTOM_Y - HEADER_H)

    // Centre divider (stronger line between halves)
    const midX = GRID_OFFSET_X + COLS_PER_SIDE * CELL_SIZE
    const cdg = this.add.graphics()
    cdg.lineStyle(3, 0xffffff, 0.25)
    cdg.lineBetween(midX, HEADER_H, midX, COLORS_BOTTOM_Y)

    // Thick border at the bottom of the play field
    const fieldBase = this.add.graphics()
    fieldBase.lineStyle(4, 0xffffff, 0.45)
    fieldBase.lineBetween(GRID_OFFSET_X, GRID_BOTTOM_Y, GRID_OFFSET_X + GRID_COLS * CELL_SIZE, GRID_BOTTOM_Y)
  }

  // ── sum display row and side totals ──────────────────────────────────────────
  _buildSumDisplays() {
    const W = GAME_W

    // Per-column sums
    this.colSumTexts = []
    for (let c = 0; c < GRID_COLS; c++) {
      const txt = this.add.text(colCenterX(c), COL_SUM_Y, '0', {
        fontSize: '17px', fontFamily: 'Arial Black, Arial', color: palette.hintGray,
      }).setOrigin(0.5)
      this.colSumTexts.push(txt)
    }

    const midX = GRID_OFFSET_X + COLS_PER_SIDE * CELL_SIZE
    const leftMidX = GRID_OFFSET_X + COLS_PER_SIDE * CELL_SIZE / 2
    const rightMidX = midX + COLS_PER_SIDE * CELL_SIZE / 2

    // Thin separator between column sums and side totals
    const sepGfx = this.add.graphics()
    sepGfx.lineStyle(1, C.divider, 0.6)
    sepGfx.lineBetween(GRID_OFFSET_X, BRACE_Y, GRID_OFFSET_X + GRID_COLS * CELL_SIZE, BRACE_Y)

    // Left total: "Total:" label + dynamic number
    this.add.text(leftMidX - 4, SIDE_SUM_Y, i18n.t('balance.hud.total'), {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: palette.hintGray,
    }).setOrigin(1, 0.5)
    this.leftSumText = this.add.text(leftMidX + 4, SIDE_SUM_Y, '0', {
      fontSize: '26px', fontFamily: 'Arial Black, Arial', color: palette.timerLight,
    }).setOrigin(0, 0.5)

    // "=" / "≠" balance symbol between side totals
    this.balanceSymbol = this.add.text(midX, SIDE_SUM_Y, '≠', {
      fontSize: '22px', fontFamily: 'Arial Black, Arial', color: palette.hintGray,
    }).setOrigin(0.5)

    // Right total: "Total:" label + dynamic number
    this.add.text(rightMidX - 4, SIDE_SUM_Y, i18n.t('balance.hud.total'), {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: palette.hintGray,
    }).setOrigin(1, 0.5)
    this.rightSumText = this.add.text(rightMidX + 4, SIDE_SUM_Y, '0', {
      fontSize: '26px', fontFamily: 'Arial Black, Arial', color: palette.timerLight,
    }).setOrigin(0, 0.5)

    // Hint
    this.add.text(W / 2, HINT_Y, i18n.t('balance.hud.hint'), {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: palette.hintGray,
    }).setOrigin(0.5)
  }

  // ── spawn ────────────────────────────────────────────────────────────────────
  spawnCube() {
    if (this.isGameOver) return

    // Pick a random column; game over immediately if it is full
    const col = Math.floor(Math.random() * GRID_COLS)
    if (this.stacks[col].length >= GRID_ROWS) {
      this.endGame()
      return
    }

    const colSums = this.stacks.map((_, c) => this._columnSum(c))
    const fieldCleared = this.fieldJustCleared
    this.fieldJustCleared = false
    const value = get_next_cube_number(this.level, colSums, fieldCleared)
    const { bg, txt } = this._createCubeGfx(colCenterX(col), FALL_START_Y, value)
    this.fallingCube = { value, bg, txt, col, y: FALL_START_Y, isFast: false }
  }

  // ── graphics factory ─────────────────────────────────────────────────────────
  _createCubeGfx(x, y, value) {
    const half = CELL_SIZE / 2 - 3   // 23 — inner half leaving a 3px gap
    const fill = value > 0 ? C.ballFill : value < 0 ? C.wrongRed : C.divider

    const bg = this.add.graphics()
    bg.fillStyle(fill, 1)
    bg.lineStyle(3, C.ballBorder, 1)
    bg.fillRoundedRect(-half, -half, half * 2, half * 2, 7)
    bg.strokeRoundedRect(-half, -half, half * 2, half * 2, 7)
    bg.setPosition(x, y)

    const txt = this.add.text(x, y, String(value), {
      fontSize: Math.abs(value) >= 10 ? '18px' : '22px',
      fontFamily: 'Arial Black, Arial',
      color: palette.white,
    }).setOrigin(0.5)

    return { bg, txt }
  }

  // ── update loop ──────────────────────────────────────────────────────────────
  update(time, delta) {
    if (this.isGameOver || !this.fallingCube) return

    const cube = this.fallingCube
    const dt = delta / 1000

    // Key-held horizontal movement
    const canMove = time - this.lastMoveTime > MOVE_COOLDOWN
    if (canMove) {
      if (this.cursors.left.isDown) { this.moveCube(-1); this.lastMoveTime = time }
      else if (this.cursors.right.isDown) { this.moveCube(1); this.lastMoveTime = time }
    }

    if (this.spaceKey.isDown) cube.isFast = true

    cube.y += (cube.isFast ? FAST_SPEED : FALL_SPEED) * dt

    const landY = this._landY(cube.col)
    if (cube.y >= landY) {
      cube.y = landY
      cube.bg.setPosition(colCenterX(cube.col), landY)
      cube.txt.setPosition(colCenterX(cube.col), landY)
      this._landCube()
    } else {
      cube.bg.setPosition(colCenterX(cube.col), cube.y)
      cube.txt.setPosition(colCenterX(cube.col), cube.y)
    }
  }

  /** Y-center where the cube will land in the given column. */
  _landY(col) {
    return cubeCenterY(this.stacks[col].length)
  }

  // ── public controls (touch buttons + keyboard) ───────────────────────────────
  moveCube(dir) {
    if (!this.fallingCube || this.isGameOver) return
    const next = Phaser.Math.Clamp(this.fallingCube.col + dir, 0, GRID_COLS - 1)
    if (this.stacks[next].length >= GRID_ROWS) return   // skip full columns
    this.fallingCube.col = next
  }

  dropCube() {
    if (this.fallingCube && !this.isGameOver) this.fallingCube.isFast = true
  }

  // ── landing ──────────────────────────────────────────────────────────────────
  _landCube() {
    const cube = this.fallingCube
    this.fallingCube = null
    const col = cube.col

    // Game over: column already full
    if (this.stacks[col].length >= GRID_ROWS) {
      cube.bg.destroy()
      cube.txt.destroy()
      this.endGame()
      return
    }

    // Snap to grid position
    const rowFromBottom = this.stacks[col].length
    const fx = colCenterX(col)
    const fy = cubeCenterY(rowFromBottom)
    cube.bg.setPosition(fx, fy)
    cube.txt.setPosition(fx, fy)

    this.stacks[col].push({ value: cube.value, bg: cube.bg, txt: cube.txt })

    this._updateSumDisplays()
    this._checkClearConditions()

    if (!this.isGameOver) {
      this.time.delayedCall(280, this.spawnCube, [], this)
    }
  }

  // ── sums ─────────────────────────────────────────────────────────────────────
  _columnSum(col) {
    return this.stacks[col].reduce((s, c) => s + c.value, 0)
  }

  _leftTotal() {
    let s = 0
    for (let c = 0; c < COLS_PER_SIDE; c++) s += this._columnSum(c)
    return s
  }

  _rightTotal() {
    let s = 0
    for (let c = COLS_PER_SIDE; c < GRID_COLS; c++) s += this._columnSum(c)
    return s
  }

  _updateSumDisplays() {
    const sums = Array.from({ length: GRID_COLS }, (_, c) => this._columnSum(c))

    const coloring = set_column_sum_coloring(sums)
    for (let c = 0; c < GRID_COLS; c++) {
      this.colSumTexts[c].setText(String(sums[c]))
    }
    for (const c of coloring.grey)  this.colSumTexts[c].setColor(palette.hintGray)
    for (const c of coloring.green) this.colSumTexts[c].setColor(palette.correctGreen)
    for (const c of coloring.red)   this.colSumTexts[c].setColor(palette.wrongRed)

    const lt = this._leftTotal()
    const rt = this._rightTotal()
    this.leftSumText.setText(String(lt))
    this.rightSumText.setText(String(rt))

    const balanced = lt === rt
    const sumColor = balanced ? palette.correctGreen : palette.timerLight
    this.leftSumText.setColor(sumColor)
    this.rightSumText.setColor(sumColor)
    this.balanceSymbol.setText(balanced ? '=' : '≠')
    this.balanceSymbol.setColor(balanced ? palette.correctGreen : palette.hintGray)
  }

  // ── win conditions ────────────────────────────────────────────────────────────
  _checkClearConditions() {
    const totalCubes = this.stacks.reduce((n, s) => n + s.length, 0)
    if (totalCubes === 0) return

    const sums = Array.from({ length: GRID_COLS }, (_, c) => this._columnSum(c))
    const lt = sums.slice(0, COLS_PER_SIDE).reduce((a, b) => a + b, 0)
    const rt = sums.slice(COLS_PER_SIDE).reduce((a, b) => a + b, 0)

    // Condition 1: left total == right total
    if (lt === rt) {
      this._clearField(Math.abs(lt), i18n.t('balance.feedback.balanced'))
      return
    }

    // Condition 2: all column sums strictly ascending left → right
    let ascending = true
    for (let c = 1; c < GRID_COLS; c++) {
      if (sums[c] <= sums[c - 1]) { ascending = false; break }
    }
    if (ascending) {
      const total = sums.reduce((a, b) => a + b, 0)
      this._clearField(total, i18n.t('balance.feedback.ascending'))
    }
  }

  // ── field clear ───────────────────────────────────────────────────────────────
  _clearField(points, message) {
    this.score += points
    this.scoreText.setText(i18n.t('balance.hud.score', { score: this.score }))

    // Destroy all cube graphics
    for (const col of this.stacks) {
      for (const cube of col) { cube.bg.destroy(); cube.txt.destroy() }
    }
    this.stacks = Array.from({ length: GRID_COLS }, () => [])
    this.fieldJustCleared = true
    this._updateSumDisplays()

    // Green flash across the grid
    const flash = this.add.graphics()
    flash.fillStyle(C.correctGreen, 0.18)
    flash.fillRect(GRID_OFFSET_X, GRID_TOP_Y, GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE)
    this.tweens.add({ targets: flash, alpha: 0, duration: 650, onComplete: () => flash.destroy() })

    // Floating message + points
    const cy = GRID_TOP_Y + (GRID_ROWS * CELL_SIZE) / 2
    const lbl = this.add.text(GAME_W / 2, cy - 18, message, {
      fontSize: '28px', fontFamily: 'Arial Black, Arial', color: palette.correctGreen,
    }).setOrigin(0.5)
    const pts = this.add.text(GAME_W / 2, cy + 20, `+${points}`, {
      fontSize: '22px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow,
    }).setOrigin(0.5)
    this.tweens.add({
      targets: [lbl, pts], y: '-=35', alpha: 0, duration: 900, delay: 350,
      ease: 'Quad.easeOut', onComplete: () => { lbl.destroy(); pts.destroy() },
    })
  }

  // ── game over ────────────────────────────────────────────────────────────────
  endGame() {
    if (this.isGameOver) return
    this.isGameOver = true

    if (this.fallingCube) {
      this.fallingCube.bg.destroy()
      this.fallingCube.txt.destroy()
      this.fallingCube = null
    }

    const W = GAME_W
    const H = GAME_H

    this.add.rectangle(W / 2, H / 2, W, H, C.overlayBlack, 0.75)

    const panel = this.add.graphics()
    panel.fillStyle(C.gameHeader, 1)
    panel.fillRoundedRect(W / 2 - 160, H / 2 - 120, 320, 240, 24)

    this.add.text(W / 2, H / 2 - 78, i18n.t('balance.gameOver.title'), {
      fontSize: '30px', fontFamily: 'Arial Black, Arial', color: palette.wrongRed,
    }).setOrigin(0.5)

    this.add.text(W / 2, H / 2 - 22, i18n.t('balance.gameOver.scoreLabel'), {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: palette.silverGray,
    }).setOrigin(0.5)

    this.add.text(W / 2, H / 2 + 32, String(this.score), {
      fontSize: '64px', fontFamily: 'Arial Black, Arial', color: palette.correctGreen,
    }).setOrigin(0.5)

    const btnBg = this.add.graphics()
    btnBg.fillStyle(C.btnBlue, 1)
    btnBg.fillRoundedRect(W / 2 - 110, H / 2 + 84, 220, 52, 16)

    this.add.text(W / 2, H / 2 + 110, i18n.t('balance.gameOver.playAgain'), {
      fontSize: '22px', fontFamily: 'Arial Black, Arial', color: palette.white,
    }).setOrigin(0.5)

    const btnZone = this.add.zone(W / 2, H / 2 + 110, 220, 52).setInteractive()
    btnZone.on('pointerdown', () => this.scene.restart())
    btnZone.on('pointerover', () => {
      btnBg.clear(); btnBg.fillStyle(C.btnBlueHover, 1)
      btnBg.fillRoundedRect(W / 2 - 110, H / 2 + 84, 220, 52, 16)
    })
    btnZone.on('pointerout', () => {
      btnBg.clear(); btnBg.fillStyle(C.btnBlue, 1)
      btnBg.fillRoundedRect(W / 2 - 110, H / 2 + 84, 220, 52, 16)
    })

    this.game.events.emit('gameComplete', { score: this.score })
  }
}
