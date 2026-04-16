import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../../theme.js'
import { PathLayer } from '../shared/pathViz.jsx'
import TouchButton from '../../components/TouchButton.jsx'
import { findRepeatSeq } from '../shared/repeatSeq.js'

// ── Constants ────────────────────────────────────────────────────────────────
const BOARD_WIDTH_BY_LEVEL = { 4: 3, 5: 2 }
const VISIBLE_ROWS = 12
const MOVE_DELTA = { U: [0, 1], L: [-1, 0], R: [1, 0] }
const FLASH_DURATION = 1600
const REVERT_INITIAL_DELAY = 350   // ms pause before first step-back
const REVERT_STEP_MS = 100         // ms per step-back in revert animation

// Board (col, row) → SVG (x, y). viewOffset = bottom row currently visible.
function toSvg(col, row, viewOffset) {
  return [col + 0.5, VISIBLE_ROWS - 1 - (row - viewOffset) + 0.5]
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LadderToInfinity({ level = 4, onComplete }) {
  const { t } = useTranslation()
  const BOARD_WIDTH = BOARD_WIDTH_BY_LEVEL[level] ?? 2

  const [variantMode, setVariantMode] = useState('classic')  // 'classic' | 'revert'
  const [pos, setPos] = useState([0, 0])
  const [seq, setSeq] = useState('')
  const [history, setHistory] = useState([[0, 0]])
  const [maxRow, setMaxRow] = useState(0)            // score = height achieved
  const [undoCount, setUndoCount] = useState(0)
  const [flash, setFlash] = useState(null)           // { start, unitLen, proposedPos }
  const [playerViewOffset, setPlayerViewOffset] = useState(0)    // auto-follows player
  const [userScrollOffset, setUserScrollOffset] = useState(null) // null = follow player

  const flashTimerRef = useRef(null)
  const revertAnimRef = useRef([])
  const scrollbarRef = useRef(null)

  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    revertAnimRef.current.forEach(t => clearTimeout(t))
  }, [])

  // Derived scroll values
  const totalRows = Math.max(VISIBLE_ROWS, maxRow + 3)
  const maxScrollOffset = totalRows - VISIBLE_ROWS
  const viewOffset = userScrollOffset !== null ? userScrollOffset : playerViewOffset

  // ── Variant toggle ───────────────────────────────────────────────────────
  const switchVariant = useCallback((mode) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    revertAnimRef.current.forEach(t => clearTimeout(t))
    revertAnimRef.current = []
    setFlash(null)
    setVariantMode(mode)
  }, [])

  // ── Move logic ───────────────────────────────────────────────────────────
  const tryMove = useCallback((dir) => {
    // In revert mode, block input while the flash/revert animation is running
    if (flash && variantMode === 'revert') return

    const [dc, dr] = MOVE_DELTA[dir]
    const [col, row] = pos
    const nc = col + dc
    const nr = row + dr

    if (nc < 0 || nc >= BOARD_WIDTH || nr < 0) return

    const newSeq = seq + dir
    const repeat = findRepeatSeq(newSeq)

    if (repeat) {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      revertAnimRef.current.forEach(t => clearTimeout(t))
      revertAnimRef.current = []

      if (variantMode === 'revert') {
        // Apply the move immediately so the figure steps to the new position first.
        const newFullHistory = [...history, [nc, nr]]
        const newMaxRowVal = Math.max(maxRow, nr)
        const newTotalRows = Math.max(VISIBLE_ROWS, newMaxRowVal + 3)
        const newMaxScrollOff = newTotalRows - VISIBLE_ROWS
        const newPlayerOffset = nr >= playerViewOffset + VISIBLE_ROWS - 1
          ? Math.min(newMaxScrollOff, nr - VISIBLE_ROWS + 2)
          : playerViewOffset

        setPos([nc, nr])
        setSeq(newSeq)
        setHistory(newFullHistory)
        setMaxRow(newMaxRowVal)
        setPlayerViewOffset(newPlayerOffset)
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
            const newMR = newH.reduce((m, [, r]) => Math.max(m, r), 0)
            setHistory(newH)
            setPos(newP)
            setSeq(newS)
            setMaxRow(newMR)
            setUserScrollOffset(null)
            setPlayerViewOffset(prev => newP[1] < prev
              ? Math.max(0, newP[1] - Math.floor(VISIBLE_ROWS / 2))
              : prev
            )
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
    const newMaxRow = Math.max(maxRow, nr)
    const newTotalRows = Math.max(VISIBLE_ROWS, newMaxRow + 3)
    const newMaxScrollOffset = newTotalRows - VISIBLE_ROWS

    // Auto-scroll: when player reaches the top visible row, scroll up.
    // Never scroll down automatically — playerViewOffset only ever increases here.
    const newPlayerOffset = nr >= playerViewOffset + VISIBLE_ROWS - 1
      ? Math.min(newMaxScrollOffset, nr - VISIBLE_ROWS + 2)
      : playerViewOffset

    setPos(newPos)
    setSeq(newSeq)
    setHistory(newHistory)
    setMaxRow(newMaxRow)
    setPlayerViewOffset(newPlayerOffset)
  }, [pos, seq, history, maxRow, playerViewOffset, variantMode, flash, BOARD_WIDTH])

  // ── Undo ──────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (history.length <= 1) return
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    const newHistory = history.slice(0, -1)
    const newPos     = newHistory[newHistory.length - 1]
    const newSeq     = seq.slice(0, -1)
    const newMaxRow  = Math.max(...newHistory.map(([, r]) => r))
    const [, newRow] = newPos
    setFlash(null)
    setPos(newPos)
    setSeq(newSeq)
    setHistory(newHistory)
    setMaxRow(newMaxRow)
    setUndoCount(c => c + 1)
    setUserScrollOffset(null)
    setPlayerViewOffset(prev => (newRow < prev ? Math.max(0, newRow) : prev))
  }, [history, seq])

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const keyMap = { ArrowUp: 'U', ArrowLeft: 'L', ArrowRight: 'R' }
    const onKey = (e) => {
      if (e.key === 'Backspace') { e.preventDefault(); undo(); return }
      const dir = keyMap[e.key]
      if (dir) { e.preventDefault(); tryMove(dir) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tryMove, undo])

  // ── Cell click → move to adjacent cell ───────────────────────────────────
  const handleCellClick = useCallback((clickCol, clickRow) => {
    const [col, row] = pos
    const dc = clickCol - col
    const dr = clickRow - row
    if (Math.abs(dc) + Math.abs(dr) !== 1) return
    if (dr < 0) return  // no downward moves
    const dir = dc === 1 ? 'R' : dc === -1 ? 'L' : 'U'
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
    setMaxRow(0)
    setUndoCount(0)
    setFlash(null)
    setPlayerViewOffset(0)
    setUserScrollOffset(null)
  }, [])

  // ── Scrollbar helpers ─────────────────────────────────────────────────────
  const getOffsetFromY = useCallback((clientY) => {
    if (!scrollbarRef.current) return 0
    const rect = scrollbarRef.current.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    // fraction 0 = top = high rows; fraction 1 = bottom = row 0
    return Math.round(maxScrollOffset * (1 - fraction))
  }, [maxScrollOffset])

  const handleScrollTo = useCallback((offset) => {
    setUserScrollOffset(Math.max(0, Math.min(maxScrollOffset, offset)))
  }, [maxScrollOffset])

  // Thumb at top = seeing highest rows (viewOffset = maxScrollOffset).
  // Clamp for thumb calc: playerViewOffset can exceed maxScrollOffset temporarily after
  // an auto-undo (intentional — avoids snapping the view down on the next move).
  const thumbHeightFrac = maxScrollOffset > 0 ? Math.min(1, VISIBLE_ROWS / totalRows) : 1
  const thumbViewOffset = Math.min(viewOffset, maxScrollOffset)
  const thumbTopFrac = maxScrollOffset > 0
    ? (1 - thumbViewOffset / maxScrollOffset) * (1 - thumbHeightFrac)
    : 0

  // ── Render data ───────────────────────────────────────────────────────────
  const displayHistory = (flash && flash.proposedPos) ? [...history, flash.proposedPos] : history

  const pad = 0.5
  const vbW = BOARD_WIDTH + 2 * pad
  const vbH = VISIBLE_ROWS + 2 * pad

  return (
    <div
      className="w-full h-full flex flex-col relative"
      style={{ background: palette.gameBg }}
    >
      {/* ── HUD ── */}
      <div
        className="flex flex-col shrink-0"
        style={{ background: palette.gameHeader, borderBottom: `1px solid ${palette.divider}` }}
      >
        {/* Stats row */}
        <div className="flex items-center justify-around px-4 pt-2 pb-1">
          <div className="text-center">
            <div className="text-xs font-bold" style={{ color: palette.silverGray }}>
              {t('ladder.hud.height')}
            </div>
            <div className="text-3xl font-black" style={{ color: palette.scoreYellow }}>
              {maxRow}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold" style={{ color: palette.silverGray }}>
              {t('ladder.hud.moves')}
            </div>
            <div className="text-3xl font-black" style={{ color: palette.white }}>
              {seq.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold" style={{ color: palette.silverGray }}>
              {t('ladder.hud.undos')}
            </div>
            <div className="text-3xl font-black" style={{ color: palette.objBasicTeal }}>
              {undoCount}
            </div>
          </div>
        </div>

        {/* Variant toggle row */}
        <div className="flex justify-center items-center pb-2 gap-1">
          <button
            onClick={() => switchVariant('classic')}
            className="text-xs font-bold px-3 py-0.5 rounded-l-full border-r-0"
            style={{
              background: variantMode === 'classic' ? palette.btnBlue : 'transparent',
              color: variantMode === 'classic' ? palette.white : palette.silverGray,
              border: `1px solid ${palette.divider}`,
              borderRight: 'none',
            }}
          >
            {t('ladder.variant.classic')}
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
            {t('ladder.variant.revert')}
          </button>
        </div>
      </div>

      {/* ── Board + scrollbar ── */}
      <div className="flex-1 min-h-0 flex">
        {/* SVG board */}
        <div
          className="flex-1 flex items-center justify-center"
          onWheel={(e) => {
            e.preventDefault()
            handleScrollTo(viewOffset + (e.deltaY < 0 ? 1 : -1))
          }}
        >
          <svg
            viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`}
            style={{ height: '100%', width: 'auto', maxWidth: '100%', display: 'block' }}
            preserveAspectRatio="xMidYMid meet"
            overflow="hidden"
          >
            <defs>
              <clipPath id="ladder-board-clip">
                <rect x={0} y={0} width={BOARD_WIDTH} height={VISIBLE_ROWS} />
              </clipPath>
            </defs>

            {/* ── Board cells ── */}
            {Array.from({ length: VISIBLE_ROWS }, (_, svgRowIdx) => {
              const boardRow = viewOffset + VISIBLE_ROWS - 1 - svgRowIdx
              return Array.from({ length: BOARD_WIDTH }, (_, col) => {
                const light = (col + svgRowIdx) % 2 === 0
                return (
                  <rect
                    key={`cell-${col}-${svgRowIdx}`}
                    x={col} y={svgRowIdx}
                    width={1} height={1}
                    fill={light ? palette.boardCellLight : palette.boardCellDark}
                    stroke={palette.gameBg}
                    strokeWidth={0.03}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCellClick(col, boardRow)}
                  />
                )
              })
            })}

            {/* ── Path lines, arrowheads, dots — clipped to board area ── */}
            <g clipPath="url(#ladder-board-clip)">
              <PathLayer
                displayHistory={displayHistory}
                flash={flash}
                toSvgCoord={(col, row) => toSvg(col, row, viewOffset)}
              />
            </g>{/* end clip */}

            {/* ── Start marker: green flag at (0, 0) ── */}
            {(() => {
              const [sx, sy] = toSvg(0, 0, viewOffset)
              if (sy < -1 || sy > VISIBLE_ROWS + 1) return null
              const sq = 0.095
              const fCols = 4, fRows = 3
              const flagW = fCols * sq, flagH = fRows * sq
              const poleX     = sx - 0.30   // 0.20 from left edge of cell
              const poleBaseY = sy + 0.42   // 0.92 from top edge of cell
              const flagTop   = sy - 0.45   // 0.05 from top edge of cell
              return (
                <g style={{ pointerEvents: 'none' }}
                  transform={`rotate(-20, ${poleX}, ${poleBaseY})`}>
                  <line x1={poleX} y1={flagTop} x2={poleX} y2={poleBaseY}
                    stroke={palette.flagPoleColor} strokeWidth={0.05} strokeLinecap="round" />
                  <rect x={poleX - flagW} y={flagTop} width={flagW} height={flagH}
                    fill={palette.correctGreen} opacity={0.92} />
                </g>
              )
            })()}

            {/* ── Player (current position) ── */}
            {(() => {
              const [cx, cy] = toSvg(pos[0], pos[1], viewOffset)
              return (
                <text
                  x={cx} y={cy}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={0.38}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >🪰</text>
              )
            })()}
          </svg>
        </div>

        {/* ── Scrollbar ── */}
        <div
          className="w-5 flex flex-col py-2 px-1 shrink-0"
          style={{ background: palette.gameHeader, borderLeft: `1px solid ${palette.divider}` }}
        >
          <div
            ref={scrollbarRef}
            className="flex-1 relative rounded"
            style={{
              background: palette.divider,
              cursor: maxScrollOffset > 0 ? 'pointer' : 'default',
            }}
            onPointerDown={(e) => {
              if (maxScrollOffset === 0) return
              e.currentTarget.setPointerCapture(e.pointerId)
              handleScrollTo(getOffsetFromY(e.clientY))
            }}
            onPointerMove={(e) => {
              if (!e.buttons || maxScrollOffset === 0) return
              handleScrollTo(getOffsetFromY(e.clientY))
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: `${thumbTopFrac * 100}%`,
                height: `${thumbHeightFrac * 100}%`,
                width: '100%',
                background: userScrollOffset !== null ? palette.scoreYellow : palette.objBasicBlue,
                borderRadius: '3px',
                opacity: 0.8,
                transition: 'top 0.12s ease, background 0.2s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Touch buttons ── */}
      <div
        className="flex justify-center items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: palette.gameHeader, borderTop: `1px solid ${palette.divider}` }}
      >
        <div className="flex-1 max-w-[100px]">
          <TouchButton onPress={() => tryMove('L')} label="←" color="w-full" style={{ background: palette.btnBlue }} />
        </div>
        <div className="flex-1 max-w-[100px]">
          <TouchButton onPress={() => tryMove('U')} label="↑" color="w-full" style={{ background: palette.btnBlue }} />
        </div>
        <div className="flex-1 max-w-[100px]">
          <TouchButton onPress={() => tryMove('R')} label="→" color="w-full" style={{ background: palette.btnBlue }} />
        </div>
        <div className="flex-1 max-w-[100px]">
          <TouchButton onPress={undo} label="↩" color="w-full" style={{ background: palette.divider }} disabled={history.length <= 1} />
        </div>
      </div>

    </div>
  )
}

export const meta = {
  id: 'ladder',
  title: 'Ladder to Infinity',
  topics: ['sequences', 'logic', 'navigation'],
  minAge: 8,
  maxAge: 99,
  minLevel: 4,
  maxLevel: 5,
  minScreenWidth: 320,
  minScreenHeight: 480,
  defaultLevel: 4,
  defaultSpeed: 4,
}
