import { palette, phaser as C } from '../../theme.js'
import i18n from '../../i18n.js'

/**
 * Renders the standard game-over overlay + score panel + Play Again button
 * directly onto the given Phaser scene.
 *
 * Default layout (all y values relative to H/2):
 *   title       titleOff   = –95
 *   scoreLabel  labelOff   = –30
 *   scoreValue  scoreOff   = +30
 *   [extraLines as provided]
 *   button bg   btnOff     = +90   (220×56 rect, radius 16)
 *   button text btnTextOff = +118
 *
 * For games with an extra line (e.g. FeedTheNumbers "hungry numbers"),
 * pass the extended layout overrides and add the line via `extraLines`:
 *   { panelH:310, panelTopOff:155, titleOff:-110, labelOff:-48,
 *     scoreOff:14, btnOff:107, btnTextOff:135,
 *     extraLines:[{ yOff:82, text:'…' }] }
 *
 * @param {Phaser.Scene} scene
 * @param {object}       opts
 * @param {number}       opts.W               canvas width
 * @param {number}       opts.H               canvas height
 * @param {string}       opts.titleKey        i18n key for the panel title
 * @param {string}       opts.scoreLabelKey   i18n key for the "Your score:" label
 * @param {number}       opts.score           numeric score to display
 * @param {string}       opts.playAgainKey    i18n key for the button label
 * @param {Function}     opts.onRestart       called on button pointerdown
 * @param {number}      [opts.panelH=280]     total panel height
 * @param {number}      [opts.panelTopOff=140] distance above H/2 where panel top sits
 * @param {number}      [opts.titleOff=-95]
 * @param {number}      [opts.labelOff=-30]
 * @param {number}      [opts.scoreOff=30]
 * @param {number}      [opts.btnOff=90]
 * @param {number}      [opts.btnTextOff=118]
 * @param {Array}       [opts.extraLines=[]]  [{yOff, text, fontSize?, color?}]
 */
export function buildGameOverPanel(scene, opts) {
  const {
    W, H,
    titleKey,
    scoreLabelKey,
    score,
    playAgainKey,
    onRestart,
    panelH      = 280,
    panelTopOff = 140,
    titleOff    = -95,
    labelOff    = -30,
    scoreOff    = 30,
    btnOff      = 90,
    btnTextOff  = 118,
    extraLines  = [],
  } = opts

  const cx = W / 2
  const cy = H / 2

  // Full-screen dark overlay
  scene.add.rectangle(cx, cy, W, H, C.overlayBlack, 0.75)

  // Panel background
  const panel = scene.add.graphics()
  panel.fillStyle(C.gameHeader, 1)
  panel.fillRoundedRect(cx - 160, cy - panelTopOff, 320, panelH, 24)

  // Title
  scene.add.text(cx, cy + titleOff, i18n.t(titleKey), {
    fontSize: '30px', fontFamily: 'Arial Black, Arial', color: palette.scoreYellow,
  }).setOrigin(0.5)

  // Score label
  scene.add.text(cx, cy + labelOff, i18n.t(scoreLabelKey), {
    fontSize: '20px', fontFamily: 'Arial, sans-serif', color: palette.silverGray,
  }).setOrigin(0.5)

  // Score value
  scene.add.text(cx, cy + scoreOff, String(score), {
    fontSize: '72px', fontFamily: 'Arial Black, Arial', color: palette.correctGreen,
  }).setOrigin(0.5)

  // Optional extra lines (e.g. FeedTheNumbers final hungry-number display)
  for (const { yOff, text, fontSize = '22px', color = palette.silverGray } of extraLines) {
    scene.add.text(cx, cy + yOff, text, {
      fontSize, fontFamily: 'Arial Black, Arial', color,
    }).setOrigin(0.5)
  }

  // Play Again button — background graphic (redrawn on hover)
  const btnBg = scene.add.graphics()
  const drawBtn = (hover) => {
    btnBg.clear()
    btnBg.fillStyle(hover ? C.btnBlueHover : C.btnBlue, 1)
    btnBg.fillRoundedRect(cx - 110, cy + btnOff, 220, 56, 16)
  }
  drawBtn(false)

  scene.add.text(cx, cy + btnTextOff, i18n.t(playAgainKey), {
    fontSize: '24px', fontFamily: 'Arial Black, Arial', color: palette.white,
  }).setOrigin(0.5)

  const btnZone = scene.add.zone(cx, cy + btnTextOff, 220, 56).setInteractive()
  btnZone.on('pointerdown', onRestart)
  btnZone.on('pointerover',  () => drawBtn(true))
  btnZone.on('pointerout',   () => drawBtn(false))
}

/**
 * Creates and starts a Phaser countdown timer for a game scene.
 *
 * Handles every tick: decrements the counter, updates the text display,
 * turns the timer red at ≤10 seconds, and calls scene.endGame() at zero.
 * The scene is responsible for storing the returned event as `this.timerEvent`
 * so it can be cancelled in endGame() with `this.timerEvent.remove()`.
 *
 * @param {Phaser.Scene}             scene
 * @param {number}                   durationSeconds
 * @param {Phaser.GameObjects.Text}  timerText   the HUD text object to update
 * @returns {Phaser.Time.TimerEvent}
 */
export function createCountdownTimer(scene, durationSeconds, timerText) {
  let timeLeft = durationSeconds
  return scene.time.addEvent({
    delay: 1000,
    repeat: durationSeconds - 1,
    callback: () => {
      timeLeft--
      timerText.setText(String(timeLeft))
      if (timeLeft <= 10) timerText.setStyle({ color: palette.wrongRed })
      if (timeLeft <= 0)  scene.endGame()
    },
  })
}
