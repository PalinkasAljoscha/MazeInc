/** @type {import('tailwindcss').Config} */
import { palette } from './src/theme.js'

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        game: {
          bg:           palette.gameBg,
          header:       palette.gameHeader,
          'slot-strip': palette.slotStrip,
          divider:      palette.divider,
          'slot-red':   palette.slotRed,
          'slot-orange':palette.slotOrange,
          'slot-yellow':palette.slotYellow,
          'slot-green': palette.slotGreen,
          'slot-blue':  palette.slotBlue,
          'slot-purple':palette.slotPurple,
          ball:         palette.ballFill,
          'ball-border':palette.ballBorder,
          score:        palette.scoreYellow,
          timer:        palette.timerLight,
          hint:         palette.hintGray,
          silver:       palette.silverGray,
          correct:      palette.correctGreen,
          wrong:        palette.wrongRed,
          btn:          palette.btnBlue,
          'btn-hover':  palette.btnBlueHover,
        },
      },
    },
  },
  plugins: [],
}
