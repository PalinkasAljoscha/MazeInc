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
          'obj-basic-red':    palette.objBasicRed,
          'obj-basic-orange': palette.objBasicOrange,
          'obj-basic-yellow': palette.objBasicYellow,
          'obj-basic-green':  palette.objBasicGreen,
          'obj-basic-blue':   palette.objBasicBlue,
          'obj-basic-purple': palette.objBasicPurple,
          'obj-basic-teal':   palette.objBasicTeal,
          'obj-basic-pink':   palette.objBasicPink,
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
