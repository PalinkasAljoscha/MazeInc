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

// Board (col, row) → SVG (x, y). viewOffset = bottom row currently visible.
function toSvg(col, row, viewOffset) {
  return [col + 0.5, VISIBLE_ROWS - 1 - (row - viewOffset) + 0.5]
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LadderToInfinity({ level = 4, onComplete }) {
  const { t } = useTranslation()
  const BOARD_WIDTH = BOARD_WIDTH_BY_LEVEL[level] ?? 2

  const [pos, setPos] = useState([0, 0])
  const [seq, setSeq] = useState('')
  const [history, setHistory] = useState([[0, 0]])
  const [maxRow, setMaxRow] = useState(0)            // score = height achieved
  const [undoCount, setUndoCount] = useState(0)
  const [flash, setFlash] = useState(null)           // { start, unitLen, proposedPos }
  const [playerViewOffset, setPlayerViewOffset] = useState(0)    // auto-follows player
  const [userScrollOffset, setUserScrollOffset] = useState(null) // null = follow player

  const flashTimerRef = useRef(null)
  const scrollbarRef = useRef(null)

  useEffect(() => () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current) }, [])

  // Derived scroll values
  const totalRows = Math.max(VISIBLE_ROWS, maxRow + 3)
  const maxScrollOffset = totalRows - VISIBLE_ROWS
  const viewOffset = userScrollOffset !== null ? userScrollOffset : playerViewOffset

  // ── Move logic ───────────────────────────────────────────────────────────
  const tryMove = useCallback((dir) => {
    const [dc, dr] = MOVE_DELTA[dir]
    const [col, row] = pos
    const nc = col + dc
    const nr = row + dr

    if (nc < 0 || nc >= BOARD_WIDTH || nr < 0) return

    const newSeq = seq + dir
    const repeat = findRepeatSeq(newSeq)

    if (repeat) {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      setFlash({ start: repeat.start, unitLen: repeat.unit.length, proposedPos: [nc, nr] })
      flashTimerRef.current = setTimeout(() => setFlash(null), 1600)
      return
    }

    setFlash(null)
    const newPos = [nc, nr]
    const newHistory = [...history, newPos]
    const newMaxRow = Math.max(maxRow, nr)
    const newTotalRows = Math.max(VISIBLE_ROWS, newMaxRow + 3)
    const newMaxScrollOffset = newTotalRows - VISIBLE_ROWS

    // Auto-scroll: when player reaches the top visible row, scroll up
    const newPlayerOffset = nr >= playerViewOffset + VISIBLE_ROWS - 1
      ? Math.min(newMaxScrollOffset, nr - VISIBLE_ROWS + 2)
      : Math.min(playerViewOffset, newMaxScrollOffset)

    setPos(newPos)
    setSeq(newSeq)
    setHistory(newHistory)
    setMaxRow(newMaxRow)
    setPlayerViewOffset(newPlayerOffset)
    setUserScrollOffset(null)  // re-lock to player on every move
  }, [pos, seq, history, maxRow, playerViewOffset])

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

  // Thumb at top = seeing highest rows (viewOffset = maxScrollOffset)
  const thumbHeightFrac = maxScrollOffset > 0 ? Math.min(1, VISIBLE_ROWS / totalRows) : 1
  const thumbTopFrac = maxScrollOffset > 0
    ? (1 - viewOffset / maxScrollOffset) * (1 - thumbHeightFrac)
    : 0

  // ── Render data ───────────────────────────────────────────────────────────
  const displayHistory = flash ? [...history, flash.proposedPos] : history

  const pad = 0.4
  const vbW = BOARD_WIDTH + 2 * pad
  const vbH = VISIBLE_ROWS + 2 * pad

  return (
    <div
      className="w-full h-full flex flex-col relative"
      style={{ background: palette.gameBg }}
    >
      {/* ── HUD ── */}
      <div
        className="flex items-center justify-around px-4 py-2 shrink-0"
        style={{ background: palette.gameHeader, borderBottom: `1px solid ${palette.divider}` }}
      >
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

            {/* ── Start marker at (0, 0) ── */}
            {(() => {
              const [sx, sy] = toSvg(0, 0, viewOffset)
              if (sy < -1 || sy > VISIBLE_ROWS + 1) return null
              return (
                <circle
                  cx={sx} cy={sy}
                  r={0.22}
                  fill={palette.correctGreen}
                  opacity={0.85}
                  style={{ pointerEvents: 'none' }}
                />
              )
            })()}

            {/* ── Player (current position) ── */}
            {(() => {
              const [cx, cy] = toSvg(pos[0], pos[1], viewOffset)
              return (
                <text
                  x={cx + 0.30} y={cy - 0.10}
                  textAnchor="middle" dominantBaseline="auto"
                  fontSize={0.54}
                  transform={`rotate(-45, ${cx}, ${cy})`}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >🚀</text>
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
}
