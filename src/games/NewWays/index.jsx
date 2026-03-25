import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../../theme.js'
import { PathLayer } from '../shared/pathViz.jsx'
import { findRepeatSeq } from '../shared/repeatSeq.js'

// ── Level config ──────────────────────────────────────────────────────────────
const LEVELS = {
  2: { size: 5, blocked: new Set() },
  3: { size: 7, blocked: new Set() },
  4: { size: 8, blocked: new Set() },
  5: { size: 8, blocked: new Set(['1,3', '2,3', '6,5', '5,5']) },
}

const MOVE_DELTA = { U: [0, 1], D: [0, -1], L: [-1, 0], R: [1, 0] }
const FLASH_DURATION = 1600
const REVERT_INITIAL_DELAY = 350   // ms pause before first step-back
const REVERT_STEP_MS = 100         // ms per step-back in revert animation

// Board (col, row) → SVG center (x, y).
// Board: (0,0) = bottom-left; SVG: (0,0) = top-left → flip row axis.
function toSvg(col, row, size) {
  return [col + 0.5, size - 1 - row + 0.5]
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewWays({ level = 2, onComplete }) {
  const { t } = useTranslation()
  const { size, blocked } = LEVELS[level] ?? LEVELS[2]
  const target = [size - 1, size - 1]

  const [variantMode, setVariantMode] = useState('classic')  // 'classic' | 'revert'
  const [pos, setPos] = useState([0, 0])
  const [seq, setSeq] = useState('')
  const [history, setHistory] = useState([[0, 0]])
  const [won, setWon] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [flash, setFlash] = useState(null)   // { start, unitLen, proposedPos }
  const [undoCount, setUndoCount] = useState(0)

  const startRef = useRef(Date.now())
  const flashTimerRef = useRef(null)
  const revertAnimRef = useRef([])

  // ── Elapsed timer (runs until won) ───────────────────────────────────────
  useEffect(() => {
    if (won) return
    const id = setInterval(() => setElapsedMs(Date.now() - startRef.current), 200)
    return () => clearInterval(id)
  }, [won])

  // Cleanup flash timer on unmount
  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    revertAnimRef.current.forEach(t => clearTimeout(t))
  }, [])

  // ── Variant toggle ───────────────────────────────────────────────────────
  const switchVariant = useCallback((mode) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    revertAnimRef.current.forEach(t => clearTimeout(t))
    revertAnimRef.current = []
    setFlash(null)
    setVariantMode(mode)
  }, [])

  // ── Attempt a move in direction dir ──────────────────────────────────────
  const tryMove = useCallback((dir) => {
    if (won) return
    // In revert mode, block input while the flash/revert animation is running
    if (flash && variantMode === 'revert') return

    const [dc, dr] = MOVE_DELTA[dir]
    const [col, row] = pos
    const nc = col + dc
    const nr = row + dr

    if (nc < 0 || nc >= size || nr < 0 || nr >= size) return
    if (blocked.has(`${nc},${nr}`)) return

    const newSeq = seq + dir
    const repeat = findRepeatSeq(newSeq)

    if (repeat) {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      revertAnimRef.current.forEach(t => clearTimeout(t))
      revertAnimRef.current = []

      if (variantMode === 'revert') {
        // Apply the move immediately so the figure steps to the new position first.
        const newFullHistory = [...history, [nc, nr]]
        setPos([nc, nr])
        setSeq(newSeq)
        setHistory(newFullHistory)
        setFlash({ start: repeat.start, unitLen: repeat.unit.length, proposedPos: null })

        // Animate backwards: remove one step every REVERT_STEP_MS after initial pause.
        const targetIdx = repeat.start
        const stepsToRemove = newFullHistory.length - 1 - targetIdx
        const timeouts = []
        for (let i = 0; i < stepsToRemove; i++) {
          const t = setTimeout(() => {
            const newH = newFullHistory.slice(0, newFullHistory.length - (i + 1))
            const newP = newH[newH.length - 1]
            const newS = newSeq.slice(0, newH.length - 1)
            setHistory(newH)
            setPos(newP)
            setSeq(newS)
            if (i === stepsToRemove - 1) {
              setFlash(null)
              setUndoCount(c => c + stepsToRemove)
            }
          }, REVERT_INITIAL_DELAY + i * REVERT_STEP_MS)
          timeouts.push(t)
        }
        revertAnimRef.current = timeouts
      } else {
        setFlash({ start: repeat.start, unitLen: repeat.unit.length, proposedPos: [nc, nr] })
        flashTimerRef.current = setTimeout(() => setFlash(null), FLASH_DURATION)
      }
      return
    }

    setFlash(null)
    const newPos = [nc, nr]
    const newHistory = [...history, newPos]
    setPos(newPos)
    setSeq(newSeq)
    setHistory(newHistory)

    if (nc === target[0] && nr === target[1]) {
      const elapsed = Date.now() - startRef.current
      setWon(true)
      setElapsedMs(elapsed)
      onComplete?.({ correct: true, score: newSeq.length })
    }
  }, [pos, seq, history, won, size, blocked, target, onComplete, variantMode, flash])

  // ── Keyboard control ─────────────────────────────────────────────────────
  useEffect(() => {
    const keyMap = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' }
    const onKey = (e) => {
      const dir = keyMap[e.key]
      if (dir) { e.preventDefault(); tryMove(dir) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tryMove])

  // ── Click on a cell → move to adjacent cell ───────────────────────────────
  const handleCellClick = useCallback((clickCol, clickRow) => {
    const [col, row] = pos
    const dc = clickCol - col
    const dr = clickRow - row
    if (Math.abs(dc) + Math.abs(dr) !== 1) return
    const dir = dc === 1 ? 'R' : dc === -1 ? 'L' : dr === 1 ? 'U' : 'D'
    tryMove(dir)
  }, [pos, tryMove])

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    revertAnimRef.current.forEach(t => clearTimeout(t))
    revertAnimRef.current = []
    setPos([0, 0])
    setSeq('')
    setHistory([[0, 0]])
    setWon(false)
    setFlash(null)
    setElapsedMs(0)
    setUndoCount(0)
    startRef.current = Date.now()
  }, [])

  // ── Derived rendering data ────────────────────────────────────────────────
  // During a flash: extend the path by the proposed (rejected) position so
  // the full repeat can be visualised in context.
  const displayHistory = (flash && flash.proposedPos) ? [...history, flash.proposedPos] : history

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`
  }

  // SVG viewBox: board cells [0, size] with a small padding on all sides
  const pad = 0.55
  const vb = size + 2 * pad

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: palette.gameBg }}
    >
      {/* ── HUD bar ── */}
      <div
        className="shrink-0 flex justify-center items-center gap-3 px-4 py-2"
        style={{ background: palette.gameHeader, borderBottom: `1px solid ${palette.divider}` }}
      >
        {/* Variant toggle */}
        <div className="flex">
          <button
            onClick={() => switchVariant('classic')}
            className="text-xs font-bold px-3 py-0.5 rounded-l-full"
            style={{
              background: variantMode === 'classic' ? palette.btnBlue : 'transparent',
              color: variantMode === 'classic' ? palette.white : palette.silverGray,
              border: `1px solid ${palette.divider}`,
              borderRight: 'none',
            }}
          >
            {t('newWays.variant.classic')}
          </button>
          <button
            onClick={() => switchVariant('revert')}
            className="text-xs font-bold px-3 py-0.5 rounded-r-full"
            style={{
              background: variantMode === 'revert' ? palette.objBasicPink : 'transparent',
              color: variantMode === 'revert' ? palette.white : palette.silverGray,
              border: `1px solid ${palette.divider}`,
              borderLeft: 'none',
            }}
          >
            {t('newWays.variant.revert')}
          </button>
        </div>
      </div>

      {/* ── Board area ── */}
      <div className="flex-1 min-h-0 flex items-center justify-center relative">
      <svg
        viewBox={`${-pad} ${-pad} ${vb} ${vb}`}
        style={{ width: '100%', height: '100%', maxWidth: '100vmin', maxHeight: '100vmin' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ── Board cells ── */}
        {Array.from({ length: size }, (_, svgRow) =>
          Array.from({ length: size }, (_, col) => {
            const row = size - 1 - svgRow   // board row (0 = bottom)
            const isBlocked = blocked.has(`${col},${row}`)
            const light = (col + svgRow) % 2 === 0
            const fill = isBlocked
              ? palette.boardBlocked
              : light ? palette.boardCellLight : palette.boardCellDark
            return (
              <rect
                key={`cell-${col}-${svgRow}`}
                x={col} y={svgRow}
                width={1} height={1}
                fill={fill}
                stroke={palette.gameBg}
                strokeWidth={0.03}
                style={{ cursor: 'pointer' }}
                onClick={() => handleCellClick(col, row)}
              />
            )
          })
        )}

        {/* ── Blocked cell X marks ── */}
        {[...blocked].map(key => {
          const [c, r] = key.split(',').map(Number)
          const sy = size - 1 - r
          return (
            <g key={`bx-${key}`} style={{ pointerEvents: 'none' }}>
              <line
                x1={c + 0.18} y1={sy + 0.18} x2={c + 0.82} y2={sy + 0.82}
                stroke={palette.divider} strokeWidth={0.12} strokeLinecap="round"
              />
              <line
                x1={c + 0.82} y1={sy + 0.18} x2={c + 0.18} y2={sy + 0.82}
                stroke={palette.divider} strokeWidth={0.12} strokeLinecap="round"
              />
            </g>
          )
        })}

        {/* ── Start marker (green dot, always visible) ── */}
        <circle
          cx={toSvg(0, 0, size)[0]}
          cy={toSvg(0, 0, size)[1]}
          r={0.22}
          fill={palette.correctGreen}
          opacity={0.85}
          style={{ pointerEvents: 'none' }}
        />

        {/* ── Target star ── */}
        <text
          x={toSvg(target[0], target[1], size)[0]}
          y={toSvg(target[0], target[1], size)[1]}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={0.65}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >★</text>

        {/* ── Path lines, arrowheads, dots ── */}
        <PathLayer
          displayHistory={displayHistory}
          flash={flash}
          toSvgCoord={(col, row) => toSvg(col, row, size)}
          hidePlayerDot
        />

        {/* ── Player (current position) ── */}
        {!won && (() => {
          const [cx, cy] = toSvg(pos[0], pos[1], size)
          return (
            <g style={{ pointerEvents: 'none' }}>
              <circle cx={cx} cy={cy} r={0.36} fill={palette.objBasicBlue} stroke={palette.white} strokeWidth={0.05} />
              <text
                x={cx} y={cy}
                textAnchor="middle" dominantBaseline="central"
                fontSize={0.38}
                style={{ userSelect: 'none' }}
              >♟</text>
            </g>
          )
        })()}

        {/* ── Win: player circle turns green at target ── */}
        {won && (() => {
          const [cx, cy] = toSvg(pos[0], pos[1], size)
          return (
            <circle
              cx={cx} cy={cy} r={0.38}
              fill={palette.correctGreen}
              stroke={palette.white}
              strokeWidth={0.05}
              style={{ pointerEvents: 'none' }}
            />
          )
        })()}
      </svg>

      {/* ── Win overlay ── */}
      {won && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.72)' }}
        >
          <div
            className="rounded-2xl text-center shadow-2xl"
            style={{ background: palette.gameHeader, padding: '36px 52px', minWidth: 260 }}
          >
            <div
              className="text-4xl font-black mb-5"
              style={{ color: palette.scoreYellow }}
            >
              {t('newWays.won')}
            </div>
            <div className="text-lg mb-2" style={{ color: palette.silverGray }}>
              {t('newWays.movesLabel')}:{' '}
              <span className="font-black" style={{ color: palette.white }}>{seq.length}</span>
            </div>
            <div className="text-lg mb-7" style={{ color: palette.silverGray }}>
              {t('newWays.timeLabel')}:{' '}
              <span className="font-black" style={{ color: palette.white }}>{formatTime(elapsedMs)}</span>
            </div>
            <button
              onClick={reset}
              className="rounded-xl px-8 py-3 text-xl font-black text-white transition-opacity hover:opacity-80 active:scale-95"
              style={{ background: palette.btnBlue }}
            >
              {t('newWays.playAgain')}
            </button>
          </div>
        </div>
      )}
      </div>{/* end board area */}
    </div>
  )
}

export const meta = {
  id: 'new-ways',
  title: 'New Ways',
  topics: ['sequences', 'logic', 'navigation'],
  minAge: 8,
  maxAge: 99,
  minLevel: 2,
  maxLevel: 5,
}
