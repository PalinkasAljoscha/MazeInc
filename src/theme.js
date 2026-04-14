// Central color palette for the Math Trainer app.
// CSS hex strings are the source of truth; Phaser hex integers are derived.

const toHex = (str) => parseInt(str.slice(1), 16)

export const palette = {
  // ── Backgrounds ──
  gameBg:       '#1a1a2e',
  gameHeader:   '#16213e',
  slotStrip:    '#0d0d1a',
  divider:      '#2c3e50',

  // ── Object colors — basic palette (order matches SLOT_VALUES = [2, 3, 4, 5, 6, 7]) ──
  objBasicRed:    '#e74c3c',
  objBasicOrange: '#e67e22',
  objBasicYellow: '#f39c12',
  objBasicGreen:  '#27ae60',
  objBasicBlue:   '#2980b9',
  objBasicPurple: '#8e44ad',
  objBasicTeal:   '#1abc9c',
  objBasicPink:   '#e91e63',

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

  // ── Board cells (New Ways / Ladder / NumberLabyrinth games) ──
  boardCellLight: '#f0d9b5',
  boardCellDark:  '#b58863',
  boardBlocked:   '#111120',

  // ── Number Labyrinth board text + flags ──
  boardTextDark:  '#3d2b1f',   // text on light-coloured cells
  boardTextLight: '#f5e6d0',   // text on dark-coloured cells
  flagPoleColor:  '#8b5a2b',   // wooden pole for start/goal flags

  // ── Balance game half-backgrounds ──
  leftHalfBg:     '#1c1c38',   // left side slightly blue-purple
  rightHalfBg:    '#1c2838',   // right side slightly teal-dark

  // ── Coins (At the Restaurant) ──
  coinSilver:     '#b0bfd0',   // silver coin fill
  coinBorder:     '#7890a8',   // coin border ring
  coinText:       '#1c2538',   // number printed on coin
}

// Phaser uses 0xRRGGBB integers — derived from the palette strings above.
export const phaser = {
  gameBg:        toHex(palette.gameBg),
  gameHeader:    toHex(palette.gameHeader),
  slotStrip:     toHex(palette.slotStrip),
  divider:       toHex(palette.divider),
  slotColors:    [palette.objBasicRed, palette.objBasicOrange, palette.objBasicYellow,
                  palette.objBasicGreen, palette.objBasicBlue, palette.objBasicPurple,
                  palette.objBasicTeal, palette.objBasicPink].map(toHex),
  slotColorsCss: [palette.objBasicRed, palette.objBasicOrange, palette.objBasicYellow,
                  palette.objBasicGreen, palette.objBasicBlue, palette.objBasicPurple,
                  palette.objBasicTeal, palette.objBasicPink],
  white:         toHex(palette.white),
  leftHalfBg:    toHex(palette.leftHalfBg),
  rightHalfBg:   toHex(palette.rightHalfBg),
  ballFill:      toHex(palette.ballFill),
  ballBorder:    toHex(palette.ballBorder),
  scoreYellow:   toHex(palette.scoreYellow),
  correctGreen:  toHex(palette.correctGreen),
  wrongRed:      toHex(palette.wrongRed),
  btnBlue:       toHex(palette.btnBlue),
  btnBlueHover:  toHex(palette.btnBlueHover),
  overlayBlack:  toHex(palette.overlayBlack),
  coinSilver:    toHex(palette.coinSilver),
  coinBorder:    toHex(palette.coinBorder),
}
