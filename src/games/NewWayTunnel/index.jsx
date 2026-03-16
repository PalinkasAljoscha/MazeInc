import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../../theme.js'

// ── Constants ────────────────────────────────────────────────────────────────
const BOARD_WIDTH = 2
const VISIBLE_ROWS = 12
const MOVE_DELTA = { U: [0, 1], L: [-1, 0], R: [1, 0] }

// ── Core constraint (same as New Ways) ───────────────────────────────────────
function findRepeatSeq(s) {
  const n = s.length
  for (let unitLen = 1; unitLen <= Math.floor(n / 2); unitLen++) {
    for (let start = 0; start <= n - 2 * unitLen; start++) {
      const unit = s.slice(start, start + unitLen)
      if (s.slice(start + unitLen, start + 2 * unitLen) === unit) {
        return { unit, start }
      }
    }
  }
  return null
}

// Board (col, row) → SVG (x, y). viewOffset = bottom row currently visible.
function toSvg(col, row, viewOffset) {
  return [col + 0.5, VISIBLE_ROWS - 1 - (row - viewOffset) + 0.5]
}

// ── Path color helpers (identical to New Ways) ────────────────────────────────
function segColor(i, flash) {
  if (!flash) return palette.objBasicBlue
  const { start, unitLen } = flash
  if (i >= start && i < start + unitLen) return palette.correctGreen
  if (i >= start + unitLen && i < start + 2 * unitLen) return palette.objBasicPink
  return palette.objBasicBlue
}

function dotColor(i, flash) {
  if (!flash) return palette.objBasicBlue
  const { start, unitLen } = flash
  if (i >= start && i < start + unitLen) return palette.correctGreen
  if (i >= start + unitLen && i <= start + 2 * unitLen) return palette.objBasicPink
  return palette.objBasicBlue
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewWayTunnel({ level = 3, onComplete }) {
  const { t } = useTranslation()

  const [pos, setPos] = useState([0, 0])
  const [seq, setSeq] = useState('')
  const [history, setHistory] = useState([[0, 0]])
  const [maxRow, setMaxRow] = useState(0)            // score = height achieved
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

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const keyMap = { ArrowUp: 'U', ArrowLeft: 'L', ArrowRight: 'R' }
    const onKey = (e) => {
      const dir = keyMap[e.key]
      if (dir) { e.preventDefault(); tryMove(dir) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tryMove])

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
            {t('tunnel.hud.height')}
          </div>
          <div className="text-3xl font-black" style={{ color: palette.scoreYellow }}>
            {maxRow}
          </div>
        </div>
        <div className="text-3xl select-none">🚇</div>
        <div className="text-center">
          <div className="text-xs font-bold" style={{ color: palette.silverGray }}>
            {t('tunnel.hud.moves')}
          </div>
          <div className="text-lg font-black" style={{ color: palette.white }}>
            {seq.length}
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

            {/* ── Path lines ── */}
            {displayHistory.length > 1 && displayHistory.slice(0, -1).map((from, i) => {
              const to = displayHistory[i + 1]
              const [x1, y1] = toSvg(from[0], from[1], viewOffset)
              const [x2, y2] = toSvg(to[0], to[1], viewOffset)
              const inRepeat = flash && i >= flash.start && i < flash.start + 2 * flash.unitLen
              return (
                <line
                  key={`seg-${i}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={segColor(i, flash)}
                  strokeWidth={flash ? 0.16 : 0.11}
                  strokeLinecap="round"
                  opacity={flash ? (inRepeat ? 1 : 0.28) : 0.85}
                  style={{ pointerEvents: 'none' }}
                />
              )
            })}

            {/* ── Path dots at visited nodes (skip index 0 = start) ── */}
            {displayHistory.slice(1).map(([c, r], idx) => {
              const i = idx + 1
              const isCurrentPlayer = !flash && i === displayHistory.length - 1
              if (isCurrentPlayer) return null
              const isProposed = flash && i === displayHistory.length - 1
              const [cx, cy] = toSvg(c, r, viewOffset)
              const inRepeat = flash && i >= flash.start && i <= flash.start + 2 * flash.unitLen
              return (
                <circle
                  key={`dot-${i}`}
                  cx={cx} cy={cy}
                  r={isProposed ? 0.2 : 0.1}
                  fill={dotColor(i, flash)}
                  opacity={flash ? (inRepeat ? (isProposed ? 0.65 : 1) : 0.25) : 1}
                  style={{ pointerEvents: 'none' }}
                />
              )
            })}

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
        <button
          onPointerDown={() => tryMove('L')}
          className="flex-1 max-w-[100px] rounded-2xl py-3 text-2xl font-black text-white active:scale-95 transition-transform duration-100"
          style={{ background: palette.btnBlue }}
        >←</button>
        <button
          onPointerDown={() => tryMove('U')}
          className="flex-1 max-w-[100px] rounded-2xl py-3 text-2xl font-black text-white active:scale-95 transition-transform duration-100"
          style={{ background: palette.btnBlue }}
        >↑</button>
        <button
          onPointerDown={() => tryMove('R')}
          className="flex-1 max-w-[100px] rounded-2xl py-3 text-2xl font-black text-white active:scale-95 transition-transform duration-100"
          style={{ background: palette.btnBlue }}
        >→</button>
      </div>

    </div>
  )
}

export const meta = {
  id: 'tunnel',
  title: 'New Way — The Tunnel',
  topics: ['sequences', 'logic', 'navigation'],
  minAge: 8,
  maxAge: 99,
  minLevel: 3,
  maxLevel: 3,
}
