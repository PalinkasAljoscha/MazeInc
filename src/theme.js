// Central color palette for the Math Trainer app.
// CSS hex strings are the source of truth; Phaser hex integers are derived.

const toHex = (str) => parseInt(str.slice(1), 16)

export const palette = {
  // ── Backgrounds ──
  gameBg:       '#1a1a2e',
  gameHeader:   '#16213e',
  slotStrip:    '#0d0d1a',
  divider:      '#2c3e50',

  // ── Slot fill colors (order matches SLOT_VALUES = [2, 3, 4, 5, 6, 7]) ──
  slotRed:      '#e74c3c',
  slotOrange:   '#e67e22',
  slotYellow:   '#f39c12',
  slotGreen:    '#27ae60',
  slotBlue:     '#2980b9',
  slotPurple:   '#8e44ad',

  // ── Ball ──
  ballFill:     '#ff6b35',
  ballBorder:   '#ffeaa7',

  // ── Text / UI ──
  scoreYellow:  '#f1c40f',
  timerLight:   '#ecf0f1',
  hintGray:     '#7f8c8d',
  silverGray:   '#bdc3c7',
  white:        '#ffffff',

  // ── Feedback ──
  correctGreen: '#2ecc71',
  wrongRed:     '#e74c3c',

  // ── Game-over button ──
  btnBlue:      '#3498db',
  btnBlueHover: '#2980b9',

  // ── Misc ──
  overlayBlack: '#000000',
}

// Phaser uses 0xRRGGBB integers — derived from the palette strings above.
export const phaser = {
  gameBg:        toHex(palette.gameBg),
  gameHeader:    toHex(palette.gameHeader),
  slotStrip:     toHex(palette.slotStrip),
  divider:       toHex(palette.divider),
  slotColors:    [palette.slotRed, palette.slotOrange, palette.slotYellow,
                  palette.slotGreen, palette.slotBlue, palette.slotPurple].map(toHex),
  slotColorsCss: [palette.slotRed, palette.slotOrange, palette.slotYellow,
                  palette.slotGreen, palette.slotBlue, palette.slotPurple],
  ballFill:      toHex(palette.ballFill),
  ballBorder:    toHex(palette.ballBorder),
  scoreYellow:   toHex(palette.scoreYellow),
  correctGreen:  toHex(palette.correctGreen),
  wrongRed:      toHex(palette.wrongRed),
  btnBlue:       toHex(palette.btnBlue),
  btnBlueHover:  toHex(palette.btnBlueHover),
  overlayBlack:  toHex(palette.overlayBlack),
}
